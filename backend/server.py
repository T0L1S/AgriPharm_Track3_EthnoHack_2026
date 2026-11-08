from __future__ import annotations

import csv
import random
import copy
import math
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from flask import Flask, abort, jsonify, request, send_from_directory
from flask_cors import CORS

import inputs
import optimizer
import simulation

DIST_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"
LAND_STEP = 10  # the land slider moves in these steps
WEIGHT_MAX = 10.0

app = Flask(__name__, static_folder=None)
CORS(app)
app.json.ensure_ascii = False
app.json.sort_keys = False


class BadRequest(ValueError):
    """The page sent a value the model cannot take."""


def _number(value, name: str, low: float, high: float) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise BadRequest(f"{name} must be a number")
    if not low <= value <= high:
        raise BadRequest(f"{name} must be between {low:g} and {high:g}")
    return float(value)


def _plants_with_weights(body: dict) -> dict[str, dict]:
    """Updates the python dictionary with the page's priority weights."""
    plants = inputs.read_plants()
    weights = body.get("weights") or {}
    if not isinstance(weights, dict):
        raise BadRequest("weights must be an object of plant: number")
    for name, weight in weights.items():
        if name not in plants:
            raise BadRequest(f"unknown plant: {name}")
        plants[name]["weight"] = _number(weight, f"weight of {name}", 0, WEIGHT_MAX)
    return plants


def _land_needed(plants: dict[str, dict], demand: dict[str, list[float]]) -> float:
    """Land that covers all demand, the top of the land slider's useful range."""
    return sum(sum(demand[name]) / plant["yield_kg"] for name, plant in plants.items() if plant["yield_kg"] > 0)


def land_slider_top(plants: dict[str, dict], demand: dict[str, list[float]]) -> int:
    """Far enough past full coverage to show land going unused, on a round hundred."""
    return math.ceil(_land_needed(plants, demand) * 1.6 / 100) * 100


def _demand_csv_text() -> str:
    return (inputs.CROP_OPT_DIR / "demand.csv").read_text(encoding="utf-8")


def _updated_demand_csv(plants: dict[str, dict]) -> str:
    """Dynamically splices updated weights and yields into the CSV string for the solver."""
    text = _demand_csv_text()
    lines = text.splitlines()
    if not lines:
        return text
    
    header = lines[0].split(",")
    id_idx = header.index("id") if "id" in header else 0
    w_idx = header.index("weight") if "weight" in header else -1
    y_idx = header.index("yield_kg") if "yield_kg" in header else -1
    
    for i in range(1, len(lines)):
        parts = lines[i].split(",")
        if len(parts) > id_idx:
            p_id = parts[id_idx]
            if p_id in plants:
                if w_idx != -1 and len(parts) > w_idx:
                    parts[w_idx] = str(plants[p_id]["weight"])
                if y_idx != -1 and len(parts) > y_idx:
                    parts[y_idx] = str(plants[p_id]["yield_kg"])
        lines[i] = ",".join(parts)
        
    return "\n".join(lines) + "\n"

def _read_historical_demand(filepath: Path = inputs.ASSUMPTIONS_DIR / "demand_last_12_years.csv") -> dict:
    """Historical monthly demand per plant, as one list of 12 values (Jan..Dec) per calendar year.

    The file's columns are dated "YYYY-MM" and do not start in January, so each value is placed
    by its own month. Only calendar years with all 12 months present are kept, so no year is
    padded with zeros and January demand always sits in the January slot, as in demand.csv.
    """
    hist_demands = {}
    try:
        with open(filepath, mode="r", encoding="utf-8") as f:
            reader = csv.reader(f)
            header = next(reader)
            dates = [(int(col[:4]), int(col[5:7])) for col in header[1:]]
            for row in reader:
                plant = row[0]
                by_year: dict[int, dict[int, float]] = {}
                for (year, month), value in zip(dates, row[1:]):
                    # An empty value (e.g. catharanthus) counts as 0.0
                    by_year.setdefault(year, {})[month] = float(value) if value.strip() else 0.0
                hist_demands[plant] = [
                    [months[m] for m in range(1, 13)]
                    for year, months in sorted(by_year.items())
                    if len(months) == 12
                ]
    except Exception as e:
        print(f"Warning: could not read {filepath} ({e}).")
    return hist_demands


def rounded(value):
    """Round floats on the way out. Weekly series add up to a lot of digits."""
    if isinstance(value, float):
        return round(value, 3)
    if isinstance(value, list):
        return [rounded(item) for item in value]
    if isinstance(value, dict):
        return {key: rounded(item) for key, item in value.items()}
    return value


@app.errorhandler(BadRequest)
def bad_request(error):
    return jsonify(error=str(error)), 400


@app.errorhandler(optimizer.OptimizerError)
def optimizer_failed(error):
    return jsonify(error=str(error)), 502


def describe_config() -> dict:
    """Everything the page needs before the first run."""
    plants = inputs.read_plants()
    demand = inputs.read_demand()
    constraints = inputs.read_constraints()
    climates = inputs.read_climates()
    seasons = inputs.read_seasons()
    sources = inputs.read_season_sources()
    info = inputs.read_plant_info()

    described = {}
    for name, plant in plants.items():
        season = seasons.get(name, simulation.DEFAULT_SEASON)
        described[name] = {
            **info.get(name, {}),
            "id": name,
            "yield_kg": plant["yield_kg"],
            "cycle": plant["cycle"],
            "weight": plant["weight"],
            "demand": demand[name],
            "season": season.__dict__,
            "season_assumed": name not in seasons,
            "sources": sources.get(name, {}),
        }
    return {
        "plants": described,
        "land": constraints["land"],
        "land_needed": _land_needed(plants, demand),
        "land_max": land_slider_top(plants, demand),
        "land_step": LAND_STEP,
        "climates": climates,
        "default_region": next(iter(climates)),
        "is_static": False,
    }


def _calculate_unused_inventory_pct(sim_result: dict) -> float:
    unused_kg = sum(parcel["stock"][-1] for parcel in sim_result["parcels"].values())
    total_harvest = sum(sum(parcel["harvest"]) for parcel in sim_result["parcels"].values())
    return unused_kg / total_harvest if total_harvest > 0 else 0.0


def run_plan(land: float, weights: dict, region: str | None) -> dict:
    constraints = inputs.read_constraints()
    constraints["land"] = _number(land if land is not None else constraints["land"], "land", 0, 1_000_000)
    plants = _plants_with_weights({"weights": weights})
    demand = inputs.read_demand()
    demand_csv = _updated_demand_csv(plants)
    climates = inputs.read_climates()
    region = region or next(iter(climates))
    if region not in climates:
        raise BadRequest(f"unknown region: {region}")
    
    monthly_temp = climates[region]["monthly"]
    seasons = inputs.read_seasons()

    # 1. OPTIMIZED PLAN
    lp_opt = optimizer.solve(plants, demand_csv, demand, constraints)
    areas_opt = {p: res["area"] for p, res in lp_opt["plants"].items()}
    sim_opt = simulation.simulate(areas_opt, plants, demand, seasons, monthly_temp, strategy="equal")

    # 2. NAIVE PLAN
    # Naive plan: what a planner without an optimizer would do. Each plant gets the land its
    # annual demand needs (demand / yield); if the land is short, every plant is cut by the same
    # share. (Ranking plants by weight x yield and filling the land in that order is not naive:
    # with land as the only limit it is exactly the optimizer's solution.)
    needed = {
        p: sum(demand[p]) / plants[p]["yield_kg"] if plants[p]["yield_kg"] > 0 else 0.0
        for p in plants
    }
    total_needed = sum(needed.values())
    share = min(1.0, constraints["land"] / total_needed) if total_needed > 0 else 0.0
    areas_naive = {p: needed[p] * share for p in plants}
    sim_naive = simulation.simulate(areas_naive, plants, demand, seasons, monthly_temp, strategy="naive")

    # 3. EQUAL ALLOCATION
    active_plants = [p for p in plants if sum(demand[p]) > 0]
    eq_area = constraints["land"] / len(active_plants) if active_plants else 0.0
    areas_eq = {p: eq_area if p in active_plants else 0.0 for p in plants}
    sim_eq = simulation.simulate(areas_eq, plants, demand, seasons, monthly_temp, strategy="equal")

    # 4. PROPORTIONAL ALLOCATION
    total_demand_all = sum(sum(d) for d in demand.values())
    if total_demand_all > 0:
        areas_prop = {p: constraints["land"] * (sum(demand[p]) / total_demand_all) for p in plants}
    else:
        areas_prop = {p: 0.0 for p in plants}
    sim_prop = simulation.simulate(areas_prop, plants, demand, seasons, monthly_temp, strategy="equal")
    
    # 5. DROUGHT, the same rule as crop_opt: every year, harvests of crops that were growing in any
    # month from drought_start to drought_end (constraints.csv, 0 = January) keep only `drought`
    # of their yield. Other harvests are not affected.
    drought = simulation.Drought(
        factor=constraints.get("drought", 0.75),
        start=int(constraints.get("drought_start", 5)),
        end=int(constraints.get("drought_end", 8)),
    )
    # Unexpected: the normal optimized plan, hit by the drought.
    sim_unexpected = simulation.simulate(areas_opt, plants, demand, seasons, monthly_temp, strategy="equal", drought=drought)
    # Anticipated: crop_opt plans knowing the drought will come.
    lp_anticipated = optimizer.solve(plants, demand_csv, demand, constraints, drought_fctr=drought.factor)
    areas_anticipated = {p: res["area"] for p, res in lp_anticipated["plants"].items()}
    sim_anticipated = simulation.simulate(areas_anticipated, plants, demand, seasons, monthly_temp, strategy="equal", drought=drought)
    
    # 6. STOCHASTIC
    scenarios = [
        {"d_m": 0.85, "y_m": 0.75, "prob": 0.10},
        {"d_m": 0.85, "y_m": 1.00, "prob": 0.20},
        {"d_m": 1.00, "y_m": 0.75, "prob": 0.20},
        {"d_m": 1.00, "y_m": 1.00, "prob": 0.30},
        {"d_m": 1.20, "y_m": 0.75, "prob": 0.10},
        {"d_m": 1.20, "y_m": 1.00, "prob": 0.10},
    ]

    areas_robust = optimizer.solve_stochastic(plants, demand, constraints, scenarios)

    stochastic_eval = {}
    
    for sc in scenarios:
        d_m = sc["d_m"]
        y_m = sc["y_m"]
        prob = sc["prob"]
        label = f"D: x{d_m}, Y: x{y_m}"
        
        sc_plants = copy.deepcopy(plants)
        for p in sc_plants:
            sc_plants[p]["yield_kg"] *= y_m
        sc_demand = {p: [val * d_m for val in vals] for p, vals in demand.items()}
        
        sc_sim_det = simulation.simulate(areas_opt, sc_plants, sc_demand, seasons, monthly_temp, strategy="equal")
        det_cov = sc_sim_det["by_year"][2]["coverage"]

        sc_sim_rob = simulation.simulate(areas_robust, sc_plants, sc_demand, seasons, monthly_temp, strategy="equal")
        rob_cov = sc_sim_rob["by_year"][2]["coverage"]
        
        lp_perf = optimizer.solve(sc_plants, _updated_demand_csv(sc_plants), sc_demand, constraints)
        areas_perf = {p: res["area"] for p, res in lp_perf["plants"].items()}
        sc_sim_perf = simulation.simulate(areas_perf, sc_plants, sc_demand, seasons, monthly_temp, strategy="equal")
        perf_cov = sc_sim_perf["by_year"][2]["coverage"]

        stochastic_eval[label] = {
            "prob": prob,
            "deterministic_plan_coverage": det_cov,
            "stochastic_plan_coverage": rob_cov,
            "perfect_info_coverage": perf_cov
        }

    expected_cov_deterministic = sum(v["deterministic_plan_coverage"] * v["prob"] for v in stochastic_eval.values())
    expected_cov_stochastic = sum(v["stochastic_plan_coverage"] * v["prob"] for v in stochastic_eval.values())
    expected_cov_perfect = sum(v["perfect_info_coverage"] * v["prob"] for v in stochastic_eval.values())
    
    # 7. Back-testing
    random.seed(42) # fixed seed, so the yield multipliers are the same on every run
    
    historical_demands = _read_historical_demand()
    
    backtest_raw = {
        "Hindsight": [],
        "Optimization": [],
        "Stochastic": [],
        "Naïve": [],
        "Equal Allocation": [],
        "Proportional Allocation": []
    }

    # One replay per complete calendar year in the history file. A plant with no full
    # year (catharanthus has no history) gets zero demand below.
    n_years = max((len(years) for years in historical_demands.values()), default=0)
    for year_idx in range(n_years):
        y_m = random.uniform(0.7, 1.1)
        hist_plants = copy.deepcopy(plants)
        for p in hist_plants:
            hist_plants[p]["yield_kg"] *= y_m

        hist_demand = {}
        for p in plants:
            if p in historical_demands and year_idx < len(historical_demands[p]):
                year_data = historical_demands[p][year_idx]
                
                if len(year_data) < 12:
                    year_data = year_data + [0.0] * (12 - len(year_data))
                elif len(year_data) > 12:
                    year_data = year_data[:12]
                    
                hist_demand[p] = year_data
            else:
                hist_demand[p] = [0.0] * 12

        lp_hind = optimizer.solve(hist_plants, demand_csv, hist_demand, constraints)
        areas_hind = {p: res["area"] for p, res in lp_hind["plants"].items()}
        sim_hind = simulation.simulate(areas_hind, hist_plants, hist_demand, seasons, monthly_temp, strategy="equal")
        backtest_raw["Hindsight"].append(sim_hind["by_year"][2]["coverage"])

        sim_opt_hist = simulation.simulate(areas_opt, hist_plants, hist_demand, seasons, monthly_temp, strategy="equal")
        backtest_raw["Optimization"].append(sim_opt_hist["by_year"][2]["coverage"])

        sim_rob_hist = simulation.simulate(areas_robust, hist_plants, hist_demand, seasons, monthly_temp, strategy="equal")
        backtest_raw["Stochastic"].append(sim_rob_hist["by_year"][2]["coverage"])

        sim_naive_hist = simulation.simulate(areas_naive, hist_plants, hist_demand, seasons, monthly_temp, strategy="naive")
        backtest_raw["Naïve"].append(sim_naive_hist["by_year"][2]["coverage"])

        sim_eq_hist = simulation.simulate(areas_eq, hist_plants, hist_demand, seasons, monthly_temp, strategy="equal")
        backtest_raw["Equal Allocation"].append(sim_eq_hist["by_year"][2]["coverage"])

        sim_prop_hist = simulation.simulate(areas_prop, hist_plants, hist_demand, seasons, monthly_temp, strategy="equal")
        backtest_raw["Proportional Allocation"].append(sim_prop_hist["by_year"][2]["coverage"])

    # Mean and minimum coverage for each strategy
    backtest_results = []
    for strategy, coverages in backtest_raw.items():
        backtest_results.append({
            "strategy": strategy,
            "mean_coverage": sum(coverages) / len(coverages) if coverages else 0.0,
            "min_coverage": min(coverages) if coverages else 0.0
        })
    
    return rounded({
        "lp": lp_opt, 
        "sim": sim_opt, 
        "region": region,
        "comparison": {
            "naive": {
                "coverage": sim_naive["by_year"][2]["coverage"],
                "unused_inventory": _calculate_unused_inventory_pct(sim_naive)
            },
            "equal": {
                "coverage": sim_eq["by_year"][2]["coverage"],
                "unused_inventory": _calculate_unused_inventory_pct(sim_eq)
            },
            "proportional": {
                "coverage": sim_prop["by_year"][2]["coverage"],
                "unused_inventory": _calculate_unused_inventory_pct(sim_prop)
            },
            "optimized": {
                "coverage": sim_opt["by_year"][2]["coverage"],
                "unused_inventory": _calculate_unused_inventory_pct(sim_opt)
            }
        },
        "drought_test": {
            "unexpected": sim_unexpected["by_year"][2]["coverage"],
            "anticipated": sim_anticipated["by_year"][2]["coverage"]
        },
        "stochastic_optimization": {
            "scenarios_breakdown": stochastic_eval,
            "expected_coverage": {
                "deterministic": expected_cov_deterministic,
                "stochastic": expected_cov_stochastic,
                "perfect_information": expected_cov_perfect
            }
        },
        "back_testing": backtest_results
    })


def sweep_land(weights: dict) -> list[dict]:
    """Coverage across a range of land values, running both LP and simulation."""
    plants = _plants_with_weights({"weights": weights})
    demand = inputs.read_demand()
    demand_csv = _updated_demand_csv(plants)
    constraints = inputs.read_constraints()
    
    climates = inputs.read_climates()
    default_region = next(iter(climates))
    monthly_temp = climates[default_region]["monthly"]
    seasons = inputs.read_seasons()

    top = _land_needed(plants, demand) * 1.2
    max_land = int(top)
    lands = list(range(0, max_land + 50, 50))

    def coverage_at(land: float) -> dict:
        lp = optimizer.solve(plants, demand_csv, demand, {**constraints, "land": land})
        areas = {name: result["area"] for name, result in lp["plants"].items()}
        
        sim = simulation.simulate(areas, plants, demand, seasons, monthly_temp)
        
        sim_years = sim["by_year"]
        
        sim_demand_3yr = sum(y["demand"] for y in sim_years)
        sim_served_3yr = sum(y["served"] for y in sim_years)
        sim_avg_3yr = sim_served_3yr / sim_demand_3yr if sim_demand_3yr else 1.0
        
        sim_yr3 = sim_years[2]["coverage"]

        return {
            "land": land,
            "coverage": sim_avg_3yr, 
            "coverage_steady_state": sim_yr3,
        }

    with ThreadPoolExecutor(max_workers=min(8, os.cpu_count() or 2)) as pool:
        return rounded(list(pool.map(coverage_at, lands)))


@app.get("/api/config")
def config():
    return jsonify(describe_config())


@app.post("/api/run")
def run():
    body = request.get_json(silent=True) or {}
    return jsonify(run_plan(body.get("land"), body.get("weights"), body.get("region")))


@app.post("/api/sweep")
def sweep():
    body = request.get_json(silent=True) or {}
    return jsonify(points=sweep_land(body.get("weights")))


@app.get("/", defaults={"path": "index.html"})
@app.get("/<path:path>")
def site(path: str):
    """Serve the built React app, so one command runs the whole site."""
    if path.startswith("api/"):
        abort(404)
    if not (DIST_DIR / "index.html").exists():
        return ("The site is not built yet. In frontend/, run: npm install && npm run build", 503)
    if not (DIST_DIR / path).is_file():
        path = "index.html"
    return send_from_directory(DIST_DIR, path)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Site: http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, threaded=True)