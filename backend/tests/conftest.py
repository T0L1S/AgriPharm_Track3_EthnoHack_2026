import pytest

import inputs


@pytest.fixture
def plants():
    return inputs.read_plants()


@pytest.fixture
def demand():
    return inputs.read_demand()


@pytest.fixture
def seasons():
    return inputs.read_seasons()


@pytest.fixture
def climates():
    return inputs.read_climates()


def greedy_covered(plants, demand, land):
    """The LP's known answer: fill plants by weight x yield until land runs out.

    Tests compare crop.py against this. The site itself never uses it.
    """
    covered = {name: 0.0 for name in plants}
    left = land
    ranked = sorted(plants, key=lambda name: plants[name]["weight"] * plants[name]["yield_kg"], reverse=True)
    for name in ranked:
        if plants[name]["weight"] <= 0:
            continue
        area = min(sum(demand[name]) / plants[name]["yield_kg"], left)
        covered[name] = area * plants[name]["yield_kg"]
        left -= area
    return covered
