import pytest

import inputs
import optimizer
import server
from conftest import greedy_covered


@pytest.fixture
def client(monkeypatch):
    """A test client whose optimizer answers without PuLP, so the API can be tested anywhere."""

    def fake_run(data_csv, demand_csv, constraints_csv, script_mtime):
        import csv
        import io

        plants = {}
        for row in csv.DictReader(io.StringIO(data_csv)):
            name = row.pop("plant")
            plants[name] = {key: float(value) for key, value in row.items()}
        land = float(next(csv.DictReader(io.StringIO(constraints_csv)))["land"])
        covered = greedy_covered(plants, inputs.read_demand(), land)
        return {
            "status": "Optimal",
            "seconds": 0.01,
            "covered": covered,
            "area": {name: covered[name] / plants[name]["yield_kg"] for name in plants},
        }

    monkeypatch.setattr(optimizer, "_run_script", fake_run)
    return server.app.test_client()


def test_config_describes_every_plant(client):
    config = client.get("/api/config").get_json()
    assert set(config["plants"]) == set(inputs.read_plants())
    assert config["land"] == 1000
    assert config["land_needed"] == pytest.approx(1300)
    assert config["default_region"] in config["climates"]
    thyme = config["plants"]["thyme"]
    assert thyme["name_el"] == "Θυμάρι"
    assert len(thyme["demand"]) == 12
    assert thyme["season"]["sow_from"] == 3


def test_run_returns_plan_and_simulation(client):
    body = client.post("/api/run", json={"land": 1000}).get_json()
    assert body["lp"]["covered"] == pytest.approx(158200)
    assert body["lp"]["plants"]["chamomile"]["area"] == 0
    parcels = body["sim"]["parcels"]
    assert parcels["valerian"]["squares"] == 30
    assert len(parcels["valerian"]["cells"]) == 144
    assert parcels["chamomile"]["cells"] == []
    assert body["sim"]["by_year"][2]["coverage"] == pytest.approx(body["lp"]["coverage"], abs=1e-3)


def test_weights_change_the_plan(client):
    body = client.post("/api/run", json={"land": 1000, "weights": {"chamomile": 3}}).get_json()
    assert body["lp"]["plants"]["chamomile"]["area"] == pytest.approx(150)


def test_region_changes_the_simulation_only(client):
    france = client.post("/api/run", json={"land": 1000, "region": "angers"}).get_json()
    greece = client.post("/api/run", json={"land": 1000, "region": "larissa"}).get_json()
    assert france["lp"]["plants"] == greece["lp"]["plants"]
    assert france["sim"]["temperature"] != greece["sim"]["temperature"]


@pytest.mark.parametrize(
    "payload, message",
    [
        ({"land": -5}, "land"),
        ({"land": "much"}, "land"),
        ({"land": True}, "land"),
        ({"weights": {"oak": 1}}, "oak"),
        ({"weights": {"thyme": -1}}, "thyme"),
        ({"weights": ["thyme"]}, "weights"),
        ({"region": "mars"}, "mars"),
    ],
)
def test_bad_input_gets_a_clear_400(client, payload, message):
    response = client.post("/api/run", json=payload)
    assert response.status_code == 400
    assert message in response.get_json()["error"]


def test_optimizer_failure_reaches_the_page(client, monkeypatch):
    def broken(*args):
        raise optimizer.OptimizerError("crop.py stopped with an error: boom")

    monkeypatch.setattr(optimizer, "_run_script", broken)
    response = client.post("/api/run", json={"land": 1000})
    assert response.status_code == 502
    assert "boom" in response.get_json()["error"]


def test_sweep_rises_with_land(client):
    points = client.post("/api/sweep", json={}).get_json()["points"]
    assert len(points) == server.SWEEP_POINTS
    coverages = [point["coverage"] for point in points]
    assert coverages == sorted(coverages)
    assert coverages[0] == 0 and coverages[-1] == pytest.approx(1.0)


def test_snapshot_holds_a_run_for_every_land_step(client):
    import export_snapshot

    snapshot = export_snapshot.build_snapshot()
    config = snapshot["config"]
    assert config["is_static"] is True
    for region in config["climates"]:
        lands = snapshot["runs"][region]
        assert set(lands) == set(range(0, config["land_max"] + 1, config["land_step"]))
    assert config["land"] in snapshot["runs"][config["default_region"]]
    assert snapshot["runs"]["angers"][1000]["lp"]["covered"] == pytest.approx(158200)


def test_unknown_api_path_is_404_not_the_site(client):
    assert client.get("/api/nothing").status_code == 404
