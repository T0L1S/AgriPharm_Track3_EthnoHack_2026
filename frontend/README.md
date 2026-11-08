# AgriPharm web client

React + Vite + TypeScript dashboard for the AgriPharm planner. It needs Node 20.19+ and two terminals:

```bash
# terminal 1: API on http://localhost:8000
cd backend
uv run python server.py

# terminal 2: dashboard on http://localhost:5173
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite forwards every `/api` call to the Flask server. `npm run build` writes the site to `frontend/dist`, which Flask also serves, so after a build `uv run python server.py` alone runs everything.

On Netlify, `public/_redirects` forwards `/api/*` to the backend on Render. While the backend is waking up or unreachable, the result sections show a loading or "couldn't load" message instead of numbers.

## API

| Call | Body | Returns |
|---|---|---|
| `GET /api/config` | | plants, default land, climate, slider range |
| `POST /api/run` | `{ land, weights, region }` | `lp` (optimized plan), `sim` (field simulation), `comparison`, `drought_test`, `stochastic_optimization`, `back_testing` |
| `POST /api/sweep` | `{ weights }` | `points`: coverage over a range of land values |

All fields are optional: `land` defaults to `crop_opt/constraints.csv`, `weights` to the weights in `crop_opt/data.csv`.

Square values in `sim.parcels[plant].cells[step][square]`: `0` to `99` is growth in percent, `-1` bare soil, `-2` just harvested. One step is about a week: 4 per month, 144 over the three simulated years.
