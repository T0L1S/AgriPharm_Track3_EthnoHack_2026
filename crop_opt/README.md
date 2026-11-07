# crop_opt — cultivation planning optimizer (T0L1S)

`crop_opt` decides **which medicinal plants to sow, how much land to give each one and in which month**, so that as much of the forecast demand for plant material as possible is covered. It is a linear program (LP) written with [PuLP](https://coin-or.github.io/pulp/) and solved with CBC.

It answers three questions:

1. **The plan** — stremmata sown per plant per month, over a 4-year horizon.
2. **The coverage** — kg of demand served per plant and % of yearly demand covered.
3. **The resilience** — how much of that coverage survives a drought if the farm keeps the same plan.

> **Units.** Land is in **stremmata** (1 stremma = 1,000 m²). Demand, yield and stock are in **kg of plant material** (e.g. dry leaf), not kg of active ingredient — the conversion from medicine boxes to plant kg happens upstream in [`EthnoHackData`](../EthnoHackData/README.md).

---

## Quick start

Requirements: [uv](https://docs.astral.sh/uv/) and the Python version in `pyproject.toml`. CBC comes with `pulp[cbc]`, so no separate solver install is needed.

```bash
cd crop_opt
uv sync
uv run crop-opt              # reads the CSVs in the current folder
uv run crop-opt path/to/csvs # or in another folder
```

A run prints the baseline plan, then (if `constraints.csv` has drought columns) the drought scenario, and writes `solution.lp` and `solution_drought.lp` to the **current** folder.

---

## How the model works

Think of the farm month by month for 48 months (month 0 = January of year 1):

- **Sowing.** Each month the model may sow some stremmata of each plant, but only inside that plant's sowing window.
- **Growing.** A sowing occupies its land for `cycle` months. Land in use in any month — counting crops sown that month and crops still growing from earlier — can never exceed the available land.
- **Harvest.** Exactly `cycle` months after sowing, the plot gives `yield_kg` per stremma, once. The land is then free again.
- **Stock.** Harvested kg go into stock. Each month, stock can serve up to that month's demand. Whatever is not served stays in stock for later months; demand that is not served is lost (it does not carry over).
- **Goal.** Serve as many (weighted) kg of demand as possible over the 48 months.

### Formulation

**Sets.** Plants $`p \in P`$; months $`t \in \{0, \dots, 47\}`$, with calendar month $`t \bmod 12`$ (0 = Jan).

**Parameters** (from the CSVs): demand $`D_{p,m}`$ for calendar month $`m`$; yield $`y_p`$ (kg per stremma per cycle); growth cycle $`c_p`$ (months); weight $`w_p`$; sowing window $`W_p \subseteq \{0, \dots, 11\}`$; initial stock $`S^0_p`$; land $`L`$; drought share kept $`\delta`$ and drought months $`[a, b]`$.

**Variables** (all continuous, $`\ge 0`$):

| Variable | In the LP file | Meaning |
|---|---|---|
| $`x_{p,t}`$ | `Area_('thyme',_5)` | stremmata of plant $`p`$ sown in month $`t`$ |
| $`u_{p,t}`$ | `Covered_('thyme',_5)` | kg of the demand for $`p`$ served in month $`t`$ |
| $`s_{p,t}`$ | `Stock_('thyme',_5)` | kg of $`p`$ in stock at the end of month $`t`$ |

**Objective**

```math
\max \sum_{p}\sum_{t} \left( w_p\,u_{p,t} - \varepsilon\, s_{p,t} \right), \qquad \varepsilon = 0.001
```

The small stock penalty $`\varepsilon`$ only breaks ties: among plans that serve the same demand it prefers the one that serves it earlier and keeps less idle stock. It is what makes the monthly served/stock values unique once the sowing plan is fixed.

**Constraints**, for every plant $`p`$ and month $`t`$:

```math
u_{p,t} \le D_{p,\ t \bmod 12} \qquad \text{(serve at most the demand)}
```

```math
s_{p,t} = s_{p,t-1} + h_{p,t} - u_{p,t}, \qquad s_{p,-1} = S^0_p \qquad \text{(stock balance)}
```

```math
h_{p,t} = \begin{cases} y_p\, x_{p,\,t-c_p} & t \ge c_p \\ 0 & t < c_p \end{cases} \qquad \text{(harvest arrives } c_p \text{ months after sowing)}
```

```math
\sum_{p} \sum_{k=0}^{c_p-1} x_{p,\,t-k} \le L \qquad \text{(land in use, for every month)}
```

```math
x_{p,t} = 0 \quad \text{if } t \bmod 12 \notin W_p \qquad \text{(sowing window)}
```

A harvest that arrives in month $`t`$ can be served in month $`t`$. A crop sown in month $`t`$ occupies months $`t, \dots, t+c_p-1`$; e.g. a 3-month crop sown in December holds its land in December, January and February.

### Why 48 months when the report shows 36

The model plans four years but reports years 1–3. Year 4 is a buffer against the end-of-horizon effect: near the end of any finite horizon the LP stops sowing, because harvests that would arrive after the last month earn nothing. With the extra year, that fade-out happens in year 4, which is not reported.

### Why year 1 coverage is low

With a cold start (no initial stock) nothing can be served until the first harvest, i.e. for the first `cycle` months of every plant. Year 1 therefore reflects the start-up of the farm; year 2 shows the steady state and the prediction model is actually being applied; year 3 is what happens if we apply the same plan next year. Since the prediction is only for one year, year 3 is shown for reasons of completeness. 

---

## Inputs

All inputs are CSV files in one folder. Files are UTF-8 (an Excel BOM is fine), comma-separated, with a header row. Month numbers are **0-based** (Jan = 0 … Dec = 11). A cell that cannot be read (empty, not a number) stops loading with its file, line and column; once everything is read, every out-of-range value is reported together in one message.

### `data.csv` — one row per plant (required)

| Column | Type | Meaning |
|---|---|---|
| `plant` | text | Plant id; must match the names in `demand.csv` and `init_stock.csv` |
| `yield_kg` | number ≥ 0 | kg of plant material per stremma per cycle (one harvest per sowing) |
| `cycle` | whole number ≥ 1 | Months from sowing to harvest |
| `weight` | number ≥ 0 | Priority of one kg of this plant's demand in the objective |
| `sown_from` | month 0–11 | First month sowing is allowed |
| `sown_to` | month 0–11 | Last month sowing is allowed. If `sown_from > sown_to`, the window wraps past December (e.g. 10 → 1 is Nov–Feb) |

Extra columns (e.g. a Latin name or a cost) are read and kept, but the model does not use them.

### `demand.csv` — one row per plant (required)

| Column | Type | Meaning |
|---|---|---|
| `plant` | text | Plant id from `data.csv` |
| `Jan` … `Dec` | number ≥ 0 | kg of plant material needed in that calendar month |

Columns are read by name, so their order does not matter. The same 12-month profile repeats every year of the horizon.

### `constraints.csv` — exactly one row (required)

| Column | Type | Meaning |
|---|---|---|
| `land` | number ≥ 0 | stremmata available |
| `drought` | 0–1 | *Optional.* Share of a harvest that survives a drought (0.75 = lose 25%) |
| `drought_start` | month 0–11 | *Optional.* First drought month |
| `drought_end` | month 0–11 | *Optional.* Last drought month; must not be before `drought_start` (droughts across the new year are not supported) |

The three drought columns go together: include all three to run the drought scenario, or remove all three to skip it. Leaving them blank is an error.

### `init_stock.csv` — optional

| Column | Type | Meaning |
|---|---|---|
| `plant` | text | Plant id from `data.csv` |
| `stock` | number ≥ 0 | kg in stock at the start of month 0 |

If the file is missing, or a plant is not listed, its starting stock is 0.

---

## Outputs

### Printed report

Each scenario prints `Status: Optimal` followed by the report for years 1–3. Months are numbered **1–36 continuously**, so month 13 is January of year 2.

| Line | Meaning |
|---|---|
| `Sown_<plant>_<month> = …` | stremmata sown that month |
| `Served_<plant>_<month> = …` | kg served that month |
| `Stock_<plant>_<month> = …` | kg left in stock at the end of that month |
| `Occupied_<plant>_<month> = …` | stremmata the plant holds that month: sown then, or sown earlier and still growing |
| `Idle_Land_<month> = …` | stremmata not in use that month |
| `Year_<year>: …` | % of that year's total demand covered, all plants pooled by kg |

Each month's `Occupied_` lines plus `Idle_Land_` add up to exactly the land. Values are rounded to 3 decimals with `iteround.saferound`, which keeps a group's rounded values summing to its rounded total — that is why the month's occupied and idle land are rounded together. Tiny negative solver noise is printed without a minus sign.

### LP files

`solution.lp` (baseline) and `solution_drought.lp` (drought) are the exact models sent to the solver, in CPLEX LP format. Open them to inspect any constraint, or solve them with another solver to cross-check.

---

## Drought scenario

The drought run answers: *if we commit to the baseline plan and a drought then hits, how much do we still cover?*

1. The baseline LP is solved and its sowing plan $`x`$ is kept.
2. The LP is solved again with that plan **fixed** (to within $`10^{-6}`$ stremma), so only serving and stock can change.
3. Every harvest whose growing months $`t - c_p, \dots, t - 1`$ touch the drought window is multiplied by `drought`. A harvest is hit even if only one of its growing months is in the window.

The window uses calendar months, so the drought repeats **every year** of the horizon. This is a stress test of the plan, not a forecast of one bad year. Because the plan is fixed, the drought run can never cover more than the baseline.

---

## Using it from Python

```python
from crop_opt import load_inputs, optimize, show

plants, cycle, constraints, demand, init_stock = load_inputs("path/to/csvs")
x, u, s, problem = optimize(demand, plants, cycle, constraints, init_stock, lp_file=None)

# x, u, s are dicts keyed by (plant, month 0..47) holding PuLP variables
total_served = sum(var.varValue for var in u.values())
show(x, u, s, plants, cycle, demand, constraints["land"])
```

| Function | What it does |
|---|---|
| `load_inputs(folder)` | Reads and validates the CSVs; returns `plants, cycle, constraints, demand, init_stock`; raises `InputError` listing every problem |
| `validate_inputs(...)` | The checks alone, on dicts you built in code |
| `optimize(demand, plants, cycle, constraints, init_stock, fixed=None, drought_fctr=None, lp_file="solution.lp", solver=None)` | Builds and solves the LP; `fixed` = sowing plan to hold, `drought_fctr` = share kept in drought months, `lp_file=None` writes no file, `solver` = any PuLP solver. Raises `RuntimeError` unless the status is Optimal |
| `has_drought(t, plant, cycle, constraints)` | Whether the harvest arriving in month `t` grew during the drought window |
| `show(x, u, s, plants, cycle, demand, land_cnstr)` | Prints the report above; `land_cnstr` is the available land, used for the idle-land lines |
| `main(folder=None)` | The `crop-opt` command: both scenarios, end to end |

---

## Design decisions

| Decision | Why |
|---|---|
| LP, not MILP | Area can be fractional and there are no on/off choices yet, so the LP solves in seconds and is easy to explain |
| Unmet demand is lost | A patient who did not get a medicine this month does not need double next month |
| One harvest per sowing | True for the plants modelled |
| No storage limit, no minimum coverage per plant, no stock decay |
| Land is the only resource | Cost, water and labour are trickier to handle and can be added later |

## Known limitations

- **Plan start month is fixed to January.** Calendar logic uses `t mod 12`, so month 0 must be January. The forecast starts in August 2026; build `demand.csv` by calendar month (see [`docs/DATA_CONTRACTS.md`](../docs/DATA_CONTRACTS.md)).
- **Weights are per kg.** With equal weights the LP maximises total kg, so a plant that gives few kg per stremma-month can get no land at all (milk thistle in the current data). When demands differ by orders of magnitude, choose weights deliberately — for example `1 / annual demand`, which makes the LP maximise average % coverage across plants.
- **`EPS` is absolute.** If weights are really small (e.g. 0.01), the 0.001 stock penalty is no longer negligible and changes the plan. `EPS` is a micro-adjustment for the model to run properly and does not affect the end result otherwise.
- **Cycles of 12 months or longer are not supported**.
- **All-zero demand** passes validation, then the `Year_` percentage divides by zero.

## Layout

```
crop_opt/
├── pyproject.toml          # package, dependencies, `crop-opt` command
├── data.csv                # plants
├── demand.csv              # monthly demand per plant
├── constraints.csv         # land (+ drought scenario)
├── init_stock.csv          # optional starting stock
└── src/crop_opt/
    ├── __init__.py         # main(): both scenarios end to end
    ├── inputs.py           # CSV reading and validation
    ├── model.py            # the LP and the drought rule
    └── report.py           # printed report
```