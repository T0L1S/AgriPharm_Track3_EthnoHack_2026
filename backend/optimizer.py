from __future__ import annotations
import time
from pathlib import Path
import sys
import pulp

# The crop_opt model, called directly in Python
from crop_opt.model import optimize

class OptimizerError(RuntimeError):
    """The optimizer could not find a solution."""

def solve(plants: dict[str, dict], demand_csv: str, demand: dict[str, list[float]], constraints: dict[str, float],
          drought_fctr: float | None = None) -> dict:
    """Run crop_opt. With `drought_fctr`, crop_opt plans for its drought scenario: harvests of crops
    growing between constraints["drought_start"] and ["drought_end"] are multiplied by it."""
    started = time.perf_counter()
    
    # 1. Build the inputs crop_opt expects
    # crop_opt takes `cycle` as a separate dictionary and needs a starting stock (init_stock)
    cycle = {name: int(plant["cycle"]) for name, plant in plants.items()}
    init_stock = {name: 0.0 for name in plants}

    # 2. Run the model (a Python call, no subprocess)
    try:
        x, u, s, problem = optimize(
            demand=demand, 
            plants=plants, 
            cycle=cycle, 
            constraints=constraints, 
            init_stock=init_stock, 
            drought_fctr=drought_fctr,
            lp_file=None  # don't write .lp files on the server
        )
    except RuntimeError as err:
        raise OptimizerError(f"The solver reports: {err}")

    # 3. Turn the PuLP results into the shape simulation.py and the frontend expect
    results = {}
    total_covered_3yr = 0.0
    total_demand_3yr = 0.0
    total_covered_yr3 = 0.0
    total_demand_yr3 = 0.0

    for name, plant in plants.items():
        # Totals over the first three years only (months 0 to 35)
        covered_3yr = sum(u[name, t].varValue for t in range(36))
        demand_3yr = sum(demand[name]) * 3

        # Totals for year 3 only (months 24 to 35, the steady state)
        covered_yr3 = sum(u[name, t].varValue for t in range(24, 36))
        demand_yr3 = sum(demand[name])
        
        # Land the optimizer actually sows for this plant in year 2 (months 12-23), its steady
        # state: past the empty start, and far enough from the end of the 48-month horizon that
        # every crop sown is harvested and fully used. (Year-3 sowing is distorted by the horizon:
        # a 12-month crop sown then only has to cover the last months of year 4.) This is the plan
        # the simulation and the field grid repeat every year.
        lp_area = sum(x[name, t].varValue for t in range(12, 24))
        area = lp_area

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
        
        # Main figures, from year 3, as shown on the page
        "covered": total_covered_yr3,
        "demand": total_demand_yr3,
        "coverage": total_covered_yr3 / total_demand_yr3 if total_demand_yr3 else 1.0,
        
        # Extra figures, available to the land sweep
        "coverage_3yr_avg": total_covered_3yr / total_demand_3yr if total_demand_3yr else 1.0,
        "coverage_year_3": total_covered_yr3 / total_demand_yr3 if total_demand_yr3 else 1.0,
        "demand_year_3": total_demand_yr3,
        
        "plants": results,
    }
    
def solve_stochastic(plants: dict, demand: dict, constraints: dict, scenarios: list) -> dict:
    """
    Solves the two-stage stochastic program.
    Maximises the expected demand coverage over all scenarios at once.
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

    # Objective: maximise the expected value
    expected_obj = []
    for i, sc in enumerate(scenarios):
        prob_s = sc["prob"]
        for p in plants:
            for t in T:
                # Weighted demand covered, minus the stock penalty
                expected_obj.append(prob_s * (plants[p]["weight"] * u[p, t, i] - EPS * s_stock[p, t, i]))
    prob += pulp.lpSum(expected_obj)

    # Constraints
    for t in T:
        # First stage: land in use can't exceed the land available
        prob += pulp.lpSum(x[p, t - k] for p in plants for k in range(int(plants[p]["cycle"])) if t - k >= 0) <= constraints["land"]

        # Second stage, for each scenario
        for i, sc in enumerate(scenarios):
            d_m, y_m = sc["d_m"], sc["y_m"]
            
            for p in plants:
                # 1. Demand covered (scaled to the scenario)
                prob += u[p, t, i] <= demand[p][t % 12] * d_m
                
                # 2. Stock balance (for the scenario)
                prev_stock = s_stock[p, t - 1, i] if t > 0 else init_stock[p]
                cycle = int(plants[p]["cycle"])
                
                # The harvest is scaled by the scenario's yield multiplier (y_m)
                harv = (plants[p]["yield_kg"] * y_m) * x[p, t - cycle] if t >= cycle else 0
                prob += s_stock[p, t, i] == prev_stock + harv - u[p, t, i]

    # Sowing windows (first stage)
    for p in plants:
        for t in T:
            s_from, s_to = plants[p]["sown_from"], plants[p]["sown_to"]
            if s_from <= s_to:
                if (s_from > t % 12) or (s_to < t % 12):
                    prob += x[p, t] == 0
            else:
                if (s_from > t % 12) and (s_to < t % 12):
                    prob += x[p, t] == 0

    # Solve the model
    stats = prob.solve()
    
    if stats.status_str != "Optimal":
        raise OptimizerError(f"Stochastic solver failed with status: {stats.status_str}")

    # The robust plan: average stremmata sown per year over years 1 to 3
    areas_robust = {}
    for p in plants:
        areas_robust[p] = sum(x[p, t].varValue for t in range(36)) / 3.0

    return areas_robust