import pytest

import inputs
import optimizer
from conftest import greedy_covered

CBC_OUTPUT = """Welcome to the CBC MILP Solver
Version: 2.10
Result - Optimal solution found
Objective value:                158200.00000000
Status:  Optimal
Area_chamomile = -0.0
Area_milk_thistle = 30.0
Covered_chamomile = 0.0
Covered_milk_thistle = 2100.0
Total =  2100.0
"""


def test_parser_reads_status_and_variables_through_solver_noise():
    parsed = optimizer.parse_output(CBC_OUTPUT)
    assert parsed["status"] == "Optimal"
    assert parsed["area"] == {"chamomile": 0.0, "milk_thistle": 30.0}
    assert parsed["covered"]["milk_thistle"] == 2100.0


@pytest.mark.parametrize(
    "output, message",
    [
        ("Area_a = 1.0\nCovered_a = 1.0\n", "Status"),
        ("Status:  Infeasible\nArea_a = None\nCovered_a = None\n", "Infeasible"),
        ("Status:  Optimal\n", "no Area_"),
        ("Status:  Optimal\nArea_a = None\nCovered_a = 1.0\n", "not a number"),
    ],
)
def test_parser_rejects_unusable_output(output, message):
    with pytest.raises(optimizer.OptimizerError, match=message):
        optimizer.parse_output(output)


def test_csv_round_trip_keeps_columns(plants):
    text = optimizer._plants_csv(plants)
    assert text.splitlines()[0] == "plant,yield_kg,cycle,cost,weight"
    assert len(text.splitlines()) == len(plants) + 1


def solve(plants, demand, land):
    demand_csv = (inputs.CROP_OPT_DIR / "demand.csv").read_text(encoding="utf-8")
    return optimizer.solve(plants, demand_csv, demand, {"land": land})


class TestCropScript:
    """Runs the real crop.py. Skipped where PuLP is not installed."""

    @pytest.fixture(autouse=True)
    def needs_pulp(self):
        pytest.importorskip("pulp")

    @pytest.mark.parametrize("land", [0, 100, 300, 540, 1000, 1150, 1300])
    def test_matches_the_known_optimum(self, plants, demand, land):
        lp = solve(plants, demand, land)
        expected = greedy_covered(plants, demand, land)
        assert lp["status"] == "Optimal"
        for name, result in lp["plants"].items():
            assert result["covered"] == pytest.approx(expected[name], abs=1e-3)

    def test_default_run(self, plants, demand):
        lp = solve(plants, demand, 1000)
        assert lp["covered"] == pytest.approx(158200)
        assert lp["plants"]["valerian"]["area"] == pytest.approx(300)
        assert lp["plants"]["chamomile"]["area"] == pytest.approx(0)
        assert lp["land_free"] == pytest.approx(0, abs=1e-6)

    def test_weights_reach_the_script(self, plants, demand):
        plants["chamomile"]["weight"] = 3.0
        lp = solve(plants, demand, 1000)
        assert lp["plants"]["chamomile"]["area"] == pytest.approx(150)

    def test_surplus_land_stays_unallocated(self, plants, demand):
        lp = solve(plants, demand, 2000)
        assert lp["coverage"] == pytest.approx(1.0)
        assert lp["land_used"] == pytest.approx(1300)
        assert lp["land_free"] == pytest.approx(700)
