"""API tests. The optimizer is replaced by a quick stand-in, so these run without PuLP."""

import pytest

import inputs
import optimizer
import server


def fake_solve(plants, demand_csv, demand, constraints, drought_fctr=None):
    """Shares the land in proportion to each plant's need, capped at the need."""
    needed = {p: sum(demand[p]) / plants[p]["yield_kg"] if plants[p]["yield_kg"] > 0 else 0.0 for p in plants}
    total = sum(needed.values())
    share = min(1.0, constraints["land"] / total) if total else 0.0
    plan = {p: {"area": needed[p] * share, "coverage": share} for p in plants}
    used = sum(r["area"] for r in plan.values())
    return {"status": "Optimal", "coverage": share, "land": constraints["land"],
            "land_used": used, "land_free": max(constraints["land"] - used, 0.0), "plants": plan}


def fake_solve_stochastic(plants, demand, constraints, scenarios):
    return {p: r["area"] for p, r in fake_solve(plants, "", demand, constraints)["plants"].items()}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(optimizer, "solve", fake_solve)
    monkeypatch.setattr(optimizer, "solve_stochastic", fake_solve_stochastic)
    return server.app.test_client()


def test_config_describes_every_plant(client, plants, constraints):
    config = client.get("/api/config").get_json()
    assert set(config["plants"]) == set(plants)
    assert config["land"] == constraints["land"]
    assert config["default_region"] in config["climates"]
    for name, plant in config["plants"].items():
        assert len(plant["demand"]) == 12
        assert plant["season"]["sow_from"] == plants[name]["sown_from"] + 1  # data.csv counts from 0


def test_run_returns_every_section_of_the_page(client):
    body = client.post("/api/run", json={"land": 400}).get_json()
    assert {"lp", "sim", "comparison", "drought_test", "stochastic_optimization", "back_testing"} <= set(body)
    assert set(body["comparison"]) == {"naive", "equal", "proportional", "optimized"}
    assert {"unexpected", "anticipated"} == set(body["drought_test"])
    strategies = {row["strategy"] for row in body["back_testing"]}
    assert strategies == {"Hindsight", "Optimization", "Stochastic", "Naïve", "Equal Allocation", "Proportional Allocation"}
    for parcel in body["sim"]["parcels"].values():
        assert len(parcel["cells"]) in (0, server.simulation.TOTAL_STEPS)


def test_naive_plan_cuts_every_plant_by_the_same_share(client, plants, demand):
    land = 300
    needed = sum(sum(demand[p]) / plants[p]["yield_kg"] for p in plants)
    body = client.post("/api/run", json={"land": land}).get_json()
    assert body["comparison"]["naive"]["coverage"] == pytest.approx(land / needed, abs=2e-3)


def test_unknown_region_is_rejected(client):
    response = client.post("/api/run", json={"region": "mars"})
    assert response.status_code == 400
    assert "mars" in response.get_json()["error"]


@pytest.mark.parametrize(
    "payload, message",
    [
        ({"land": -5}, "land"),
        ({"land": "much"}, "land"),
        ({"land": True}, "land"),
        ({"weights": {"oak": 1}}, "oak"),
        ({"weights": ["thyme"]}, "weights"),
    ],
)
def test_bad_input_gets_a_clear_400(client, payload, message):
    response = client.post("/api/run", json=payload)
    assert response.status_code == 400
    assert message in response.get_json()["error"]


def test_negative_weight_is_rejected(client, plants):
    name = next(iter(plants))
    response = client.post("/api/run", json={"weights": {name: -1}})
    assert response.status_code == 400
    assert name in response.get_json()["error"]


def test_optimizer_failure_reaches_the_page(client, monkeypatch):
    def broken(*args, **kwargs):
        raise optimizer.OptimizerError("The solver reports: boom")

    monkeypatch.setattr(optimizer, "solve", broken)
    response = client.post("/api/run", json={"land": 400})
    assert response.status_code == 502
    assert "boom" in response.get_json()["error"]


def test_sweep_rises_with_land(client):
    points = client.post("/api/sweep", json={}).get_json()["points"]
    assert points[0]["land"] == 0 and points[0]["coverage_steady_state"] == 0
    coverages = [point["coverage_steady_state"] for point in points]
    assert coverages == sorted(coverages)
    assert coverages[-1] == pytest.approx(1.0)


def test_unknown_api_path_is_404_not_the_site(client):
    assert client.get("/api/nothing").status_code == 404


def test_history_keeps_only_complete_calendar_years():
    history = server._read_historical_demand()
    assert history
    for years in history.values():
        assert all(len(year) == 12 for year in years)
    assert inputs.ASSUMPTIONS_DIR.joinpath("demand_last_12_years.csv").exists()
