import pytest

import simulation as sim
from simulation import Season

SEASON = Season(sow_from=3, sow_to=4, t_base=5, t_opt_low=15, t_opt_high=25, t_max=30)
EVEN_DEMAND = [100.0] * 12


def run_plant(area=100.0, yield_kg=120.0, cycle=4.0, demand=EVEN_DEMAND, season=SEASON, temperature=None):
    return sim.simulate_plant(area, yield_kg, cycle, demand, season, temperature or [20.0] * sim.STEPS_PER_YEAR)


@pytest.mark.parametrize(
    "temp, expected",
    [(0, 0), (5, 0), (10, 0.5), (15, 1), (20, 1), (25, 1), (27.5, 0.5), (30, 0), (40, 0)],
)
def test_growth_rate_is_the_trapezoid(temp, expected):
    assert sim.growth_rate(temp, SEASON) == pytest.approx(expected)


def test_weekly_temperature_stays_within_the_monthly_normals(climates):
    monthly = climates["angers"]["monthly"]
    weekly = sim.weekly_temperature(monthly)
    assert len(weekly) == sim.STEPS_PER_YEAR
    assert min(monthly) <= min(weekly) and max(weekly) <= max(monthly)


def test_sowing_is_spread_across_the_window():
    weeks = sim.sow_weeks(SEASON, 8)
    assert len(weeks) == 8
    assert weeks == sorted(weeks)
    assert weeks[0] == 8  # start of March
    assert weeks[-1] < 16  # still in April


def test_sowing_window_can_wrap_past_december():
    weeks = sim.sow_weeks(Season(11, 1, 0, 10, 20, 30), 12)
    assert all(week >= 40 or week < 4 for week in weeks)


@pytest.mark.parametrize("area, squares", [(0, 0), (3, 1), (10, 1), (24, 2), (1000, 100)])
def test_square_count(area, squares):
    assert sim.square_count(area) == squares


def test_mass_balance_holds_every_month():
    parcel = run_plant()
    for need, delivered, missing in zip(parcel["demand"], parcel["served"], parcel["unmet"]):
        assert delivered + missing == pytest.approx(need)
    assert min(parcel["stock"]) >= 0
    assert sum(parcel["harvest"]) - sum(parcel["served"]) == pytest.approx(parcel["stock"][-1])


def test_each_square_yields_one_harvest_per_year():
    parcel = run_plant(area=100.0, yield_kg=120.0)
    assert sum(parcel["harvest"]) == pytest.approx(100 * 120 * sim.YEARS)
    assert sum(parcel["sown"]) == parcel["squares"] * sim.YEARS


def test_cycle_is_the_calendar_length_at_full_speed():
    calendar = sim.crop_calendar(4, SEASON, [20.0] * sim.STEPS_PER_YEAR)
    assert calendar["months"] == 4


def test_cold_stretches_the_cycle():
    calendar = sim.crop_calendar(4, SEASON, [10.0] * sim.STEPS_PER_YEAR)  # half speed
    assert calendar["months"] == 8


def test_crop_that_never_grows_is_never_harvested():
    frozen = [0.0] * sim.STEPS_PER_YEAR
    assert run_plant(temperature=frozen)["harvest"] == [0.0] * sim.TOTAL_MONTHS
    assert sim.crop_calendar(4, SEASON, frozen)["harvest_week"] is None


def test_plant_without_land_leaves_all_demand_unmet():
    parcel = run_plant(area=0.0)
    assert parcel["squares"] == 0
    assert parcel["cells"] == []
    assert sum(parcel["unmet"]) == pytest.approx(sum(parcel["demand"]))


def test_cells_use_the_documented_values():
    parcel = run_plant()
    assert len(parcel["cells"]) == sim.TOTAL_STEPS
    values = {value for row in parcel["cells"] for value in row}
    assert sim.BARE in values and sim.STUBBLE in values
    assert all(value in (sim.BARE, sim.STUBBLE) or 0 <= value <= 99 for value in values)


def test_year_three_matches_the_yearly_arithmetic(plants, demand, seasons, climates):
    """Once stock has built up, the simulation lands on what yield x area promises."""
    areas = {"valerian": 300, "echinacea": 240, "hypericum": 250, "thyme": 180, "milk_thistle": 30, "chamomile": 0}
    result = sim.simulate(areas, plants, demand, seasons, climates["angers"]["monthly"])
    supplied = sum(min(areas[name] * plants[name]["yield_kg"], sum(demand[name])) for name in plants)
    total = sum(sum(months) for months in demand.values())
    assert result["by_year"][2]["coverage"] == pytest.approx(supplied / total)


def test_first_year_trails_the_steady_state(plants, demand, seasons, climates):
    areas = {name: sum(demand[name]) / plants[name]["yield_kg"] for name in plants}
    by_year = sim.simulate(areas, plants, demand, seasons, climates["angers"]["monthly"])["by_year"]
    assert by_year[0]["coverage"] < by_year[1]["coverage"] < by_year[2]["coverage"]
    assert by_year[2]["coverage"] == pytest.approx(1.0)


def test_plant_missing_from_season_file_falls_back(plants, demand, climates):
    result = sim.simulate({"thyme": 100}, plants, demand, {}, climates["angers"]["monthly"])
    assert result["parcels"]["thyme"]["squares"] == 10
