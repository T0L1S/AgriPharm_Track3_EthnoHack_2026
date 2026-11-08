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


@pytest.fixture
def constraints():
    return inputs.read_constraints()
