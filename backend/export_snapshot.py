"""Saves real results so the site can run with no Python behind it.

Handy for a public demo link, such as GitHub Pages. It runs crop.py and the
simulation for a grid of land values in every climate region, then writes
frontend/dist/snapshot.json. Build the site first:

    cd frontend && npm run build
    cd ../backend && uv run python export_snapshot.py

Deploy frontend/dist as it is. With no /api to talk to, the page reads the
snapshot. The land slider moves in LAND_STEP steps and priorities are locked,
because only saved results exist.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import inputs
import server

LAND_STEP = 100


def build_snapshot() -> dict:
    config = server.describe_config()
    config.update(land_step=LAND_STEP, is_static=True)
    config["land"] = round(config["land"] / LAND_STEP) * LAND_STEP

    runs: dict[str, dict[int, dict]] = {}
    lands = range(0, config["land_max"] + 1, LAND_STEP)
    for region in inputs.read_climates():
        runs[region] = {land: server.run_plan(land, {}, region) for land in lands}
    return {"config": config, "runs": runs, "sweep": server.sweep_land({})}


def main() -> None:
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else server.DIST_DIR / "snapshot.json"
    text = json.dumps(build_snapshot(), ensure_ascii=False, separators=(",", ":"))
    target.write_text(text, encoding="utf-8")
    print(f"Wrote {target} ({len(text) / 1_000_000:.1f} MB)")


if __name__ == "__main__":
    main()
