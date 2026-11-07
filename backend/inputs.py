"""Reads the team's CSV files and the seasonal assumptions.

The optimizer's folder stays the single source of truth for plants, demand and
land. Files are read on every request, so a CSV edit shows up on the next run.
"""

from __future__ import annotations

import csv
import os
from pathlib import Path

from simulation import Season

BACKEND_DIR = Path(__file__).resolve().parent
CROP_OPT_DIR = Path(os.environ.get("CROP_OPT_DIR", BACKEND_DIR.parent / "crop_opt")).resolve()
ASSUMPTIONS_DIR = BACKEND_DIR / "assumptions"

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _rows(path: Path) -> list[dict]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def read_plants() -> dict[str, dict]:
    """data.csv as {plant: {column: number}}, keeping the file's column order."""
    plants = {}
    for row in _rows(CROP_OPT_DIR / "data.csv"):
        name = row.pop("plant")
        plants[name] = {key: float(value) for key, value in row.items()}
    return plants


def read_demand() -> dict[str, list[float]]:
    """demand.csv as {plant: [12 monthly kg]}."""
    demand = {}
    for row in _rows(CROP_OPT_DIR / "demand.csv"):
        name = row.pop("plant")
        months = [float(value) for value in row.values()]
        if len(months) != 12:
            raise ValueError(f"demand.csv: {name} has {len(months)} month columns, expected 12")
        demand[name] = months
    return demand


def read_constraints() -> dict[str, float]:
    """constraints.csv as {column: number}. Only `land` is used today."""
    row = _rows(CROP_OPT_DIR / "constraints.csv")[0]
    return {key: float(value) for key, value in row.items()}


def read_seasons() -> dict[str, Season]:
    seasons = {}
    for row in _rows(ASSUMPTIONS_DIR / "season.csv"):
        seasons[row["plant"]] = Season(
            sow_from=int(row["sow_from"]),
            sow_to=int(row["sow_to"]),
            t_base=float(row["t_base"]),
            t_opt_low=float(row["t_opt_low"]),
            t_opt_high=float(row["t_opt_high"]),
            t_max=float(row["t_max"]),
        )
    return seasons


def read_season_sources() -> dict[str, dict]:
    keys = ("temperature_source", "temperature_url", "calendar_source", "calendar_url")
    return {row["plant"]: {key: row[key] for key in keys} for row in _rows(ASSUMPTIONS_DIR / "season.csv")}


def read_climates() -> dict[str, dict]:
    climates = {}
    for row in _rows(ASSUMPTIONS_DIR / "climate.csv"):
        climates[row["region"]] = {
            "label_el": row["label_el"],
            "label_en": row["label_en"],
            "monthly": [float(row[month]) for month in MONTHS],
            "source": row["source"],
            "url": row["url"],
        }
    return climates


def read_plant_info() -> dict[str, dict]:
    return {row["plant"]: row for row in _rows(ASSUMPTIONS_DIR / "plant_info.csv")}
