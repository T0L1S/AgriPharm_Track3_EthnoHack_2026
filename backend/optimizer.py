from __future__ import annotations
import time
from pathlib import Path
import sys
import pulp

# Εισαγωγή του νέου μοντέλου από το package του συνεργάτη σου
from crop_opt.model import optimize

class OptimizerError(RuntimeError):
    """Το API απέτυχε να βρει λύση."""

def solve(plants: dict[str, dict], demand_csv: str, demand: dict[str, list[float]], constraints: dict[str, float]) -> dict:
    started = time.perf_counter()
    
    # 1. Προετοιμασία των δομών που απαιτεί το νέο crop_opt
    # Το crop_opt περιμένει το `cycle` ως ξεχωριστό λεξικό και απαιτεί αρχικό απόθεμα (init_stock)
    cycle = {name: int(plant["cycle"]) for name, plant in plants.items()}
    init_stock = {name: 0.0 for name in plants}

    # 2. Κλήση της νέας Python συνάρτησης (χωρίς subprocess)
    try:
        x, u, s, problem = optimize(
            demand=demand, 
            plants=plants, 
            cycle=cycle, 
            constraints=constraints, 
            init_stock=init_stock, 
            lp_file=None  # Αποφυγή δημιουργίας τοπικών αρχείων στο server
        )
    except RuntimeError as err:
        raise OptimizerError(f"The solver reports: {err}")

    # 3. Μετάφραση των αποτελεσμάτων του PuLP στη μορφή που περιμένει το simulation.py και το frontend
    results = {}
    total_covered_3yr = 0.0
    total_demand_3yr = 0.0
    total_covered_yr3 = 0.0
    total_demand_yr3 = 0.0

    for name, plant in plants.items():
        # Υπολογισμοί αποκλειστικά για την πρώτη 3ετία (Μήνες 0 έως 35)
        covered_3yr = sum(u[name, t].varValue for t in range(36))
        demand_3yr = sum(demand[name]) * 3

        # Υπολογισμοί αποκλειστικά για το Έτος 3 (Μήνες 24 έως 35 - Steady State)
        covered_yr3 = sum(u[name, t].varValue for t in range(24, 36))
        demand_yr3 = sum(demand[name])
        
        # Υπολογισμός area βάσει της απόδοσης στο Έτος 3 (κανονική λειτουργία)
        lp_area = sum(x[name, t].varValue for t in range(24, 36))
        area = covered_yr3 / plant["yield_kg"] if plant["yield_kg"] > 0 else 0.0

        results[name] = {
            "area": area,
            "lp_area": lp_area,
            "covered": covered_yr3,
            "demand": demand_yr3,
            "coverage": min(covered_yr3 / demand_yr3, 1.0) if demand_yr3 else 1.0,
        }
        
        total_covered_3yr += covered_3yr
        total_demand_3yr += demand_3yr
        total_covered_yr3 += covered_yr3
        total_demand_yr3 += demand_yr3

    land = constraints["land"]
    land_used = sum(plant["area"] for plant in results.values())

    return {
        "status": "Optimal",
        "seconds": time.perf_counter() - started,
        "land": land,
        "land_used": land_used,
        "land_free": max(land - land_used, 0.0),
        
        # Προεπιλεγμένες τιμές (βασισμένες στο Έτος 3 για σωστή απεικόνιση στο UI)
        "covered": total_covered_yr3,
        "demand": total_demand_yr3,
        "coverage": total_covered_yr3 / total_demand_yr3 if total_demand_yr3 else 1.0,
        
        # Νέα πεδία που μπορείς να αξιοποιήσεις στο sweep
        "coverage_3yr_avg": total_covered_3yr / total_demand_3yr if total_demand_3yr else 1.0,
        "coverage_year_3": total_covered_yr3 / total_demand_yr3 if total_demand_yr3 else 1.0,
        "demand_year_3": total_demand_yr3,
        
        "plants": results,
    }
    
def solve_stochastic(plants: dict, demand: dict, constraints: dict, scenarios: list) -> dict:
    """
    Επιλύει το Two-Stage Stochastic Program.
    Μεγιστοποιεί την αναμενόμενη κάλυψη λαμβάνοντας υπόψη όλα τα σενάρια ταυτόχρονα.
    """
    T = range(48)
    EPS = 0.001
    
    init_stock = {p: 0.0 for p in plants}
    prob = pulp.LpProblem("Stochastic_Crop_Optimization", pulp.LpMaximize)

    keys_x = [(p, t) for p in plants for t in T]
    
    x = prob.add_variable_dicts("Area", keys_x, lowBound=0, cat=pulp.LpContinuous)
    keys_us = [(p, t, i) for p in plants for t in T for i in range(len(scenarios))]
    
    u = prob.add_variable_dicts("Covered", keys_us, lowBound=0, cat=pulp.LpContinuous)
    s_stock = prob.add_variable_dicts("Stock", keys_us, lowBound=0, cat=pulp.LpContinuous)

    # Αντικειμενική Συνάρτηση: Μεγιστοποίηση της Αναμενόμενης Αξίας (Expected Value)
    expected_obj = []
    for i, sc in enumerate(scenarios):
        prob_s = sc["prob"]
        for p in plants:
            for t in T:
                # Σταθμισμένο όφελος μείον την ποινή αποθέματος
                expected_obj.append(prob_s * (plants[p]["weight"] * u[p, t, i] - EPS * s_stock[p, t, i]))
    prob += pulp.lpSum(expected_obj)

    # Περιορισμοί
    for t in T:
        # Περιορισμός 1ου Σταδίου: Η συνολική γη δεν μπορεί να υπερβαίνει τη διαθέσιμη
        prob += pulp.lpSum(x[p, t - k] for p in plants for k in range(int(plants[p]["cycle"])) if t - k >= 0) <= constraints["land"]

        # Περιορισμοί 2ου Σταδίου ανά Σενάριο
        for i, sc in enumerate(scenarios):
            d_m, y_m = sc["d_m"], sc["y_m"]
            
            for p in plants:
                # 1. Κάλυψη Ζήτησης (προσαρμοσμένη στο σενάριο)
                prob += u[p, t, i] <= demand[p][t % 12] * d_m
                
                # 2. Ισοζύγιο Αποθέματος (προσαρμοσμένο στο σενάριο)
                prev_stock = s_stock[p, t - 1, i] if t > 0 else init_stock[p]
                cycle = int(plants[p]["cycle"])
                
                # Η σοδειά (harvest) επηρεάζεται από το yield multiplier (y_m)
                harv = (plants[p]["yield_kg"] * y_m) * x[p, t - cycle] if t >= cycle else 0
                prob += s_stock[p, t, i] == prev_stock + harv - u[p, t, i]

    # Περιορισμοί παραθύρων σποράς (1ο Στάδιο)
    for p in plants:
        for t in T:
            s_from, s_to = plants[p]["sown_from"], plants[p]["sown_to"]
            if s_from <= s_to:
                if (s_from > t % 12) or (s_to < t % 12):
                    prob += x[p, t] == 0
            else:
                if (s_from > t % 12) and (s_to < t % 12):
                    prob += x[p, t] == 0

    # Επίλυση του μοντέλου
    stats = prob.solve()
    
    if stats.status_str != "Optimal":
        raise OptimizerError(f"Stochastic solver failed with status: {stats.status_str}")

    # Εξαγωγή του Robust Plan (αθροίζοντας τα στρέμματα για το steady-state Year 3)
    areas_robust = {}
    for p in plants:
        areas_robust[p] = sum(x[p, t].varValue for t in range(36)) / 3.0

    return areas_robust