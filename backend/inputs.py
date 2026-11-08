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
    return {}

def read_season_sources() -> dict[str, dict]:
    return {}

def read_plant_info() -> dict[str, dict]:
    return {}

def read_climates() -> dict[str, dict]:
    return {
        "angers": {
            "label_el": " ",
            "label_en": "France, Angers",
            "monthly": [6.0, 6.4, 9.0, 11.3, 14.7, 18.1, 20.0, 20.1, 16.9, 13.4, 9.1, 6.3],
            "source": "M o-France 1991-2020 normals for Beaucouz , via Wikipedia",
            "url": "https://en.wikipedia.org/wiki/Beaucouz%C3%A9"
        }
    }

