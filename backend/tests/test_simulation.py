import pytest

import simulation as sim
from simulation import Drought, Season

SEASON = Season(sow_from=3, sow_to=3, t_base=5, t_opt_low=15, t_opt_high=25, t_max=30)  # sown in March
EVEN_DEMAND = [100.0] * 12
MILD = [20.0] * sim.STEPS_PER_YEAR


def run_plant(area=100.0, yield_kg=120.0, cycle=4.0, demand=EVEN_DEMAND, season=SEASON, temperature=None, drought=None):
    return sim.simulate_plant(area, yield_kg, cycle, demand, season, temperature or MILD, drought=drought)


@pytest.fixture
def with_temperature(monkeypatch):
    """Turn the temperature model on for one test (it is off on the site)."""
    monkeypatch.setattr(sim, "USE_TEMPERATURE", True)


def test_growth_is_full_speed_when_temperature_is_off():
    assert sim.growth_rate(-10, SEASON) == 1.0
    assert sim.growth_rate(40, SEASON) == 1.0


@pytest.mark.parametrize(
    "temp, expected",
    [(0, 0), (5, 0), (10, 0.5), (15, 1), (20, 1), (25, 1), (27.5, 0.5), (30, 0), (40, 0)],
)
def test_growth_rate_is_the_trapezoid(with_temperature, temp, expected):
    assert sim.growth_rate(temp, SEASON) == pytest.approx(expected)


def test_weekly_temperature_stays_within_the_monthly_normals(climates):
    monthly = climates["angers"]["monthly"]
    weekly = sim.weekly_temperature(monthly)
    assert len(weekly) == sim.STEPS_PER_YEAR
    assert min(monthly) <= min(weekly) and max(weekly) <= max(monthly)


def test_every_square_is_sown_in_the_first_week_of_the_window():
    assert sim.sow_weeks(SEASON, 8) == [8] * 8  # week 8 is the start of March


@pytest.mark.parametrize("area, squares", [(0, 0), (3, 1), (10, 1), (24, 2), (1000, 100)])
def test_square_count(area, squares):
    assert sim.square_count(area) == squares


def test_harvest_lands_cycle_months_after_sowing():
    """As in crop_opt: sown in March (month 2) with a 4-month cycle, harvested in July (month 6)."""
    parcel = run_plant(area=100.0, yield_kg=120.0, cycle=4.0)
    first_year = parcel["harvest"][:12]
    assert first_year[6] == pytest.approx(100 * 120)
    assert sum(first_year) == pytest.approx(100 * 120)
    assert parcel["sown"][2] == parcel["squares"]


def test_each_square_yields_one_harvest_per_year():
    parcel = run_plant(area=100.0, yield_kg=120.0)
    assert sum(parcel["harvest"]) == pytest.approx(100 * 120 * sim.YEARS)
    assert sum(parcel["sown"]) == parcel["squares"] * sim.YEARS


def test_mass_balance_holds_every_month():
    parcel = run_plant()
    for need, delivered, missing in zip(parcel["demand"], parcel["served"], parcel["unmet"]):
        assert delivered + missing == pytest.approx(need)
    assert min(parcel["stock"]) >= 0
    assert sum(parcel["harvest"]) - sum(parcel["served"]) == pytest.approx(parcel["stock"][-1])


def test_cycle_is_the_calendar_length_at_full_speed():
    assert sim.crop_calendar(4, SEASON, MILD)["months"] == 4


def test_cold_stretches_the_cycle(with_temperature):
    assert sim.crop_calendar(4, SEASON, [10.0] * sim.STEPS_PER_YEAR)["months"] == 8  # half speed


def test_crop_that_never_grows_is_never_harvested(with_temperature):
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


SUMMER_DROUGHT = Drought(factor=0.75, start=5, end=8)  # June to September, as in constraints.csv


def test_drought_cuts_a_crop_that_grows_through_the_summer():
    parcel = run_plant(cycle=4.0, drought=SUMMER_DROUGHT)  # March to June
    assert sum(parcel["harvest"]) == pytest.approx(100 * 120 * 0.75 * sim.YEARS)


def test_drought_spares_a_crop_that_misses_the_summer():
    winter = Season(sow_from=11, sow_to=11, t_base=5, t_opt_low=15, t_opt_high=25, t_max=30)
    plain = run_plant(cycle=4.0, season=winter)  # November to February
    dry = run_plant(cycle=4.0, season=winter, drought=SUMMER_DROUGHT)
    assert dry["harvest"] == plain["harvest"]


@pytest.mark.parametrize(
    "sown, harvested, hit",
    [(2, 6, True), (2, 5, False), (8, 12, True), (9, 13, False), (10, 22, True)],
)
def test_drought_checks_every_month_the_crop_was_growing(sown, harvested, hit):
    assert SUMMER_DROUGHT.hits(sown, harvested) is hit


def test_full_land_covers_all_demand_by_year_three(plants, demand, seasons, climates):
    """Land for every plant's yearly demand covers it all once every crop has had a harvest."""
    areas = {name: sum(demand[name]) / plants[name]["yield_kg"] for name in plants}
    by_year = sim.simulate(areas, plants, demand, seasons, climates["angers"]["monthly"])["by_year"]
    assert by_year[0]["coverage"] < by_year[1]["coverage"] < by_year[2]["coverage"]
    assert by_year[2]["coverage"] == pytest.approx(1.0)


def test_plant_missing_from_season_file_falls_back(plants, demand, climates):
    name = next(iter(plants))
    result = sim.simulate({name: 100}, plants, demand, {}, climates["angers"]["monthly"])
    assert result["parcels"][name]["squares"] == 10
