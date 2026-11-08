"""Seasonal field simulation.

Takes the land the optimizer gave each plant and plays it out week by week over
three years, starting from an empty field in January of year 1. It answers what
the yearly LP cannot see: when each plant is sown, how the seasons stretch its
cycle, when the harvest lands, and which months the stock runs out.

Plain Python with no web or solver imports, so it can be used from a notebook.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

STEPS_PER_MONTH = 4  # one step is about a week
MONTHS_PER_YEAR = 12
STEPS_PER_YEAR = STEPS_PER_MONTH * MONTHS_PER_YEAR
YEARS = 3
TOTAL_STEPS = STEPS_PER_YEAR * YEARS
TOTAL_MONTHS = MONTHS_PER_YEAR * YEARS

SQUARE_AREA = 10.0  # στρέμματα drawn by one square on the map
BARE = -1  # cell value: nothing planted
STUBBLE = -2  # cell value: just harvested
STUBBLE_STEPS = 3  # weeks a square stays as stubble after harvest
DORMANT_BELOW = 0.15  # growth rate under which a plant counts as dormant
SHORTAGE_SHARE = 0.01  # a month is short when over 1% of its demand goes unmet


@dataclass(frozen=True)
class Season:
    """When a plant is sown and how it responds to temperature."""

    sow_from: int  # first sowing month, 1 to 12
    sow_to: int  # last sowing month, may wrap past December
    t_base: float  # °C, no growth at or below this
    t_opt_low: float  # °C, full speed from here...
    t_opt_high: float  # °C, ...up to here
    t_max: float  # °C, no growth at or above this


DEFAULT_SEASON = Season(sow_from=3, sow_to=4, t_base=5, t_opt_low=15, t_opt_high=25, t_max=32)


# Temperature switch. Off: every crop grows at full speed all year, so each cycle lasts
# exactly the `cycle` months in data.csv, as in the optimizer. On: growth follows the
# climate's monthly temperatures and cold months stretch the cycle.
USE_TEMPERATURE = False

# Growth is added in small floating-point steps (e.g. 1/24 per week for a 6-month crop), and
# 24 of them can sum to 0.99999... instead of 1. This tolerance makes the harvest happen in the
# planned week instead of one week late.
DONE = 1 - 1e-9


def growth_rate(temp: float, season: Season) -> float:
    """Share of full growth speed at a temperature: the EcoCrop trapezoid."""
    if not USE_TEMPERATURE:
        return 1.0
    if temp <= season.t_base or temp >= season.t_max:
        return 0.0
    if temp < season.t_opt_low:
        return (temp - season.t_base) / (season.t_opt_low - season.t_base)
    if temp > season.t_opt_high:
        return (season.t_max - temp) / (season.t_max - season.t_opt_high)
    return 1.0


def weekly_temperature(monthly: list[float]) -> list[float]:
    """Interpolate 12 monthly normals (mid-month values) to one value per step."""
    weekly = []
    for step in range(STEPS_PER_YEAR):
        position = (step + 0.5) / STEPS_PER_MONTH - 0.5
        left = math.floor(position)
        share = position - left
        here = monthly[left % MONTHS_PER_YEAR]
        following = monthly[(left + 1) % MONTHS_PER_YEAR]
        weekly.append(here + (following - here) * share)
    return weekly


def square_count(area: float) -> int:
    """How many squares draw this area. Any planted land gets at least one."""
    if area <= 0:
        return 0
    return max(1, round(area / SQUARE_AREA))


def sow_weeks(season: Season, squares: int, strategy: str = "equal") -> list[int]:
    """Week of the year each square is sown.

    Every square is sown in the first week of the sowing window, as in crop_opt, where a plot
    sown in month t is in the ground from the start of month t and its harvest is available from
    the start of month t + cycle. `strategy` is kept for the callers; all strategies now sow the
    same way and differ only in how much land each plant gets.
    """
    start = (season.sow_from - 1) * STEPS_PER_MONTH
    return [start] * squares


def crop_calendar(cycle: float, season: Season, temperature: list[float]) -> dict:
    """Sowing date, harvest date and real length for a square sown first in the window."""
    start = (season.sow_from - 1) * STEPS_PER_MONTH
    progress = 0.0
    for elapsed in range(1, STEPS_PER_YEAR * 2 + 1):
        week = (start + elapsed - 1) % STEPS_PER_YEAR
        progress += growth_rate(temperature[week], season) / (cycle * STEPS_PER_MONTH)
        if progress >= DONE:
            return {
                "sow_week": start,
                "harvest_week": (start + elapsed - 1) % STEPS_PER_YEAR,
                "months": round(elapsed / STEPS_PER_MONTH, 1),
            }
    return {"sow_week": start, "harvest_week": None, "months": None}


def simulate_plant(
    area: float, yield_kg: float, cycle: float, monthly_demand: list[float],
    season: Season, temperature: list[float], strategy: str = "equal"
) -> dict:
    """Play one parcel week by week and track its stock against demand.

    `cycle` is read as months of growth at full speed, so a cold spell stretches
    the calendar time to harvest. Each square gives one harvest per sowing, the
    same one harvest per year the static LP counts in `yield_kg * area`.
    """
    squares = square_count(area)
    rates = [growth_rate(t, season) for t in temperature]
    growth_per_step = 1 / (cycle * STEPS_PER_MONTH)
    square_kg = yield_kg * area / squares if squares else 0.0
    sow_at = sow_weeks(season, squares, strategy) if squares else []

    progress: list[float | None] = [None] * squares  # None means no crop in the ground
    stubble = [0] * squares
    cells: list[list[int]] = []
    stock_by_step: list[float] = []
    sown = [0] * TOTAL_MONTHS
    harvest = [0.0] * TOTAL_MONTHS
    demand = [0.0] * TOTAL_MONTHS
    served = [0.0] * TOTAL_MONTHS
    unmet = [0.0] * TOTAL_MONTHS
    stock = 0.0

    for step in range(TOTAL_STEPS):
        week = step % STEPS_PER_YEAR
        month = step // STEPS_PER_MONTH
        row = []
        for i in range(squares):
            if progress[i] is not None:
                progress[i] += rates[week] * growth_per_step
                if progress[i] >= DONE:
                    progress[i] = None
                    stubble[i] = STUBBLE_STEPS
                    stock += square_kg
                    harvest[month] += square_kg
            elif stubble[i] > 0:
                stubble[i] -= 1
            if progress[i] is None and week == sow_at[i]:
                progress[i] = 0.0
                stubble[i] = 0
                sown[month] += 1
            if progress[i] is not None:
                row.append(min(99, int(progress[i] * 100)))
            else:
                row.append(STUBBLE if stubble[i] > 0 else BARE)
        if squares:
            cells.append(row)

        need = monthly_demand[month % MONTHS_PER_YEAR] / STEPS_PER_MONTH
        delivered = min(stock, need)
        stock -= delivered
        demand[month] += need
        served[month] += delivered
        unmet[month] += need - delivered
        stock_by_step.append(stock)

    return {
        "area": area,
        "squares": squares,
        "square_area": area / squares if squares else 0.0,
        "rate": rates,
        "cells": cells,
        "stock": stock_by_step,
        "sown": sown,
        "harvest": harvest,
        "demand": demand,
        "served": served,
        "unmet": unmet,
    }


def year_slice(series: list[float], year: int) -> list[float]:
    return series[year * MONTHS_PER_YEAR : (year + 1) * MONTHS_PER_YEAR]


def summarise(parcels: dict[str, dict]) -> list[dict]:
    """Coverage for each simulated year, in total and per plant."""
    years = []
    for year in range(YEARS):
        plants = {}
        for name, parcel in parcels.items():
            demand = sum(year_slice(parcel["demand"], year))
            served = sum(year_slice(parcel["served"], year))
            short_months = sum(
                1
                for need, missing in zip(year_slice(parcel["demand"], year), year_slice(parcel["unmet"], year))
                if missing > need * SHORTAGE_SHARE
            )
            plants[name] = {
                "demand": demand,
                "served": served,
                "coverage": served / demand if demand else 1.0,
                "short_months": short_months,
                "harvest": sum(year_slice(parcel["harvest"], year)),
            }
        demand_total = sum(p["demand"] for p in plants.values())
        served_total = sum(p["served"] for p in plants.values())
        years.append(
            {
                "demand": demand_total,
                "served": served_total,
                "coverage": served_total / demand_total if demand_total else 1.0,
                "plants": plants,
            }
        )
    return years


def simulate(
    areas: dict[str, float], plants: dict[str, dict], demand: dict[str, list[float]],
    seasons: dict[str, Season], monthly_temperature: list[float], strategy: str = "equal"
) -> dict:
    """Run every plant's parcel. Plants share land only through the optimizer's areas."""
    temperature = weekly_temperature(monthly_temperature)
    parcels = {}
    calendars = {}
    for name, plant in plants.items():
        season = seasons.get(name, DEFAULT_SEASON)
        parcels[name] = simulate_plant(
            area=areas.get(name, 0.0), yield_kg=plant["yield_kg"], cycle=plant["cycle"],
            monthly_demand=demand[name], season=season, temperature=temperature, 
            strategy=strategy
        )
        calendars[name] = crop_calendar(plant["cycle"], season, temperature)
    return {
        "steps_per_month": STEPS_PER_MONTH,
        "steps_per_year": STEPS_PER_YEAR,
        "years": YEARS,
        "square_area": SQUARE_AREA,
        "dormant_below": DORMANT_BELOW,
        "temperature": temperature,
        "parcels": parcels,
        "calendars": calendars,
        "by_year": summarise(parcels),
    }
