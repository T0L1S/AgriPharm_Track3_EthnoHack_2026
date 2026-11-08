"""Runs the real crop_opt model. Skipped where PuLP is not installed."""

import pytest

pytest.importorskip("pulp")

import optimizer  # noqa: E402  (needs PuLP)
import simulation  # noqa: E402


def solve(plants, demand, constraints, land, **kwargs):
    return optimizer.solve(plants, "", demand, {**constraints, "land": land}, **kwargs)


def test_default_run_uses_the_land_and_covers_most_demand(plants, demand, constraints):
    lp = solve(plants, demand, constraints, 400)
    assert lp["status"] == "Optimal"
    assert lp["land_used"] == pytest.approx(400, abs=0.1)
    assert 0.9 < lp["coverage"] < 1.0
    assert set(lp["plants"]) == set(plants)


def test_no_land_covers_nothing(plants, demand, constraints):
    lp = solve(plants, demand, constraints, 0)
    assert lp["coverage"] == pytest.approx(0, abs=1e-6)
    assert lp["land_used"] == pytest.approx(0, abs=1e-6)


def test_surplus_land_stays_free(plants, demand, constraints):
    needed = sum(sum(demand[name]) / plants[name]["yield_kg"] for name in plants)
    lp = solve(plants, demand, constraints, 2 * needed)
    assert lp["coverage"] == pytest.approx(1.0, abs=1e-3)
    assert lp["land_free"] > 0.4 * needed


def test_weights_reach_the_optimizer(plants, demand, constraints):
    """A plant the plan leaves short gets more land when its priority goes up."""
    base = solve(plants, demand, constraints, 400)["plants"]
    name = min(base, key=lambda p: base[p]["coverage"])
    assert base[name]["coverage"] < 1.0
    plants[name]["weight"] = 10.0
    after = solve(plants, demand, constraints, 400)["plants"][name]["area"]
    assert after > base[name]["area"]


def test_planning_for_drought_costs_coverage(plants, demand, constraints):
    normal = solve(plants, demand, constraints, 400)
    dry = solve(plants, demand, constraints, 400, drought_fctr=constraints["drought"])
    assert dry["coverage"] < normal["coverage"]


def test_simulation_reaches_the_optimizer_coverage(plants, demand, constraints, seasons, climates):
    """The field simulation plays out the optimizer's plan and lands on the same year-3 coverage."""
    lp = solve(plants, demand, constraints, 400)
    areas = {name: result["area"] for name, result in lp["plants"].items()}
    sim = simulation.simulate(areas, plants, demand, seasons, climates["angers"]["monthly"])
    assert sim["by_year"][2]["coverage"] == pytest.approx(lp["coverage"], abs=0.01)


def test_stochastic_plan_uses_the_land(plants, demand, constraints):
    scenarios = [
        {"d_m": 1.0, "y_m": 0.75, "prob": 0.5},
        {"d_m": 1.0, "y_m": 1.0, "prob": 0.5},
    ]
    areas = optimizer.solve_stochastic(plants, demand, {**constraints, "land": 400}, scenarios)
    assert set(areas) == set(plants)
    assert all(area >= 0 for area in areas.values())
    assert sum(areas.values()) == pytest.approx(400, abs=1.0)
