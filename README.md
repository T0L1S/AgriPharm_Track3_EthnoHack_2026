# AgriPharm 🌿

> **Mathematical Optimization & AI for Sustainable Agriculture**  
> *Bridging the gap between pharmaceutical demand and medicinal plant cultivation through forecasting, optimization and simulation.*

[![Live Demo](https://img.shields.io/badge/Live_Demo-agripharm2026.netlify.app-success?style=for-the-badge)](https://agripharm2026.netlify.app/)
[![EthnoHack 2026](https://img.shields.io/badge/EthnoHack_2026-Track_03_Biodiversity-blue?style=for-the-badge)](https://ethnohack2026.devpost.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

## 📌 Quick Links & Resources
* **Live Web Platform:** [agripharm2026.netlify.app](https://agripharm2026.netlify.app/)
* **Devpost Submission:** [EthnoHack 2026 Project Page](https://devpost.com/software/agripharm)
* **GitHub Repository:** [T0L1S/AgriPharm_Track3_EthnoHack_2026](https://github.com/T0L1S/AgriPharm_Track3_EthnoHack_2026)
* **Module docs:** [Forecasting](src/agripharm_track3_ethnohack_2026/forecasting/forecasting_documentation.md) · [Drug-to-plant data](EthnoHackData/README.md) · [Optimizer](crop_opt/README.md) · [Web client & API](frontend/README.md)

---

## 🌍 The Problem: The Gap in the Chain
The current supply chain for medicinal plants suffers from a critical disconnect. Farmers often cultivate "blindly," without precise visibility into future pharmaceutical patient demand. This leads to two major issues:
1. **Unsustainable Cultivation:** Unplanned farming triggers soil depletion, wastes water resources, and threatens local biodiversity.
2. **Market Shortages:** A lack of coordinated agricultural planning creates sudden deficits in the supply chain for essential active pharmaceutical ingredients (APIs).

## 💡 Our Solution
**AgriPharm** is an end-to-end Decision Support System. It combines **time-series forecasting (SARIMA)** of future pharmaceutical demand with **Linear Programming (LP)** to generate an optimal cultivation plan. It tells the grower exactly *what* to sow, *when*, and on *how many stremmata* (1 stremma = 1,000 m²), so that as much of the forecast demand as possible is covered with the land available.

### Track 3: Biodiversity & Sustainability Alignment
* **Biodiversity Guard:** The plan only takes the land whose harvest will actually be used, and the optimizer reports the idle land left free every month, so land that is not needed can be left to recover instead of being over-cultivated.
* **Low Waste:** A small penalty on stored stock makes the optimizer prefer plans that serve demand earlier and keep less plant material sitting in storage. Unmet demand is treated as lost, not deferred, so the model never grows material for a "catch-up" that patients will not need.
* **Measured Coverage:** Every run reports the share of each year's demand covered, and the web platform compares the optimized plan with naive, equal-split and demand-proportional allocations of the same land.

---

## ⚙️ Architecture & Methodology (The 4 Pillars)

Our interdisciplinary team divided the work into four roles, each a self-contained module that hands documented files to the next:

```
Médic'AM history ──► Forecast (boxes) ──► Drug-to-plant conversion (kg plant material) ──► LP optimizer ──► Web platform
   Role B                Role B                       Role A                                 Role C            Role D
```

### 1. Demand Forecasting (Role B - AI/ML)
* **The Input:** 175 months (January 2012 – July 2026) of open reimbursement data for ATC5 codes from France (*Assurance Maladie*, Médic'AM).
* **The Model:** Univariate SARIMA per ATC5 code via `pmdarima` (`auto_arima`, 12-month seasonality), evaluated on a 12-month hold-out with MAPE and RMSE.
* **Noise handling:** **Trimming** of inactive pre-market months (P01BF01) and **Despiking** of an extreme anomaly by linear interpolation (L01CB01).
* **The Output:** A 12-month forecast (August 2026 – July 2027) of demand in medicine boxes for 8 ATC5 codes.

### 2. Drug-to-Plant Data Engineering (Role A)
* **Medicine-to-plant conversion:** Converting forecast medicine boxes into kg of plant material using pack composition, chemical-form corrections and documented reference concentrations.
* **Agronomic inputs:** Compiling yield, growth-cycle and sowing-window inputs for the source plants of the selected substances.
* **Traceability and validation:** Documented CSV inputs, a reproducible conversion workflow and numerical checks (see [`EthnoHackData/validation`](EthnoHackData/validation/REPORT.md)). Estimates are reference values on ideal conversion assumptions, not validated manufacturing yields.

### 3. Mathematical Optimization (Role C - Operations Research)
* **The Engine:** A monthly LP written with `pulp` and solved with CBC ([`crop_opt`](crop_opt/README.md)). Over a 48-month horizon it decides the stremmata sown per plant per month, the kg of demand served and the stock carried, maximizing weighted demand covered. Year 4 is a buffer against end-of-horizon effects; years 1–3 are reported.
* **Constraints:** Available land (counting every crop still growing), sowing windows, growth cycles (one harvest per sowing, `cycle` months after sowing) and monthly stock balance.
* **Stress Testing:** A drought scenario keeps the baseline sowing plan fixed and cuts every harvest that grew during the drought months (by default June–September, 25% loss), showing how much coverage the committed plan keeps.
* **Stochastic Defense:** The web backend also solves a two-stage stochastic LP over six demand/yield scenarios and compares the expected coverage of the deterministic plan, the stochastic plan and a perfect-information plan (the basis for VSS and EVPI).

### 4. Platform Architecture (Role D - Web UI)
* **Decoupled Backend:** A **Flask** API ([`backend`](backend/)), served with gunicorn on **Render**, runs `crop_opt` together with a weekly field simulation, the baseline comparisons, the drought test and the stochastic analysis.
* **Actionable UI:** A **React + Vite + TypeScript** dashboard ([`frontend`](frontend/)) deployed on Netlify, which proxies `/api/*` to the backend and turns the results into interactive charts for policymakers and growers.

---

## 🗂️ Repository Layout

```
AgriPharm_Track3_EthnoHack_2026/
├── pyproject.toml / uv.lock          # root environment: forecasting + data validation
├── src/agripharm_track3_ethnohack_2026/forecasting/
│   ├── data_preprocessing.ipynb      # Role B: cleaning, trimming, despiking
│   ├── model.ipynb                   # Role B: SARIMA training and forecast
│   └── forecasting_documentation.md
├── data/                             # Role B: processed history and box forecasts
├── EthnoHackData/                    # Role A: drug-to-plant conversion, docs, validation
├── crop_opt/                         # Role C: LP optimizer (own uv project, `crop-opt` command)
├── backend/                          # Role D: Flask API, simulation, stochastic analysis
└── frontend/                         # Role D: React dashboard
```

---

## 🚀 How to Run Locally

### Prerequisites
* [uv](https://docs.astral.sh/uv/) for all Python parts. uv installs the right Python for each project: **3.13** for the root environment, **3.12+** for `crop_opt` and `backend`. The CBC solver comes with `pulp[cbc]`, so nothing else needs installing.
* **Node.js 20.19+** for the web client.

```bash
git clone https://github.com/T0L1S/AgriPharm_Track3_EthnoHack_2026.git
cd AgriPharm_Track3_EthnoHack_2026
```

### Running the Optimization Solver
`crop_opt` reads `data.csv`, `demand.csv`, `constraints.csv` and the optional `init_stock.csv` from its folder.

```bash
cd crop_opt
uv sync
uv run crop-opt               # uses the CSVs in this folder
uv run crop-opt path/to/csvs  # or in another folder
```

The run prints the baseline plan (sowing, served demand, stock, occupied and idle land per month, yearly % coverage) and then the drought scenario, and writes the exact models to `solution.lp` and `solution_drought.lp`. See the [optimizer README](crop_opt/README.md) for the formulation and the input format.

### Running the Web Platform
Two terminals, from the repository root:

```bash
# terminal 1: API on http://localhost:8000
cd backend
uv run python server.py

# terminal 2: dashboard on http://localhost:5173
cd frontend
npm install
npm run dev
```

Vite forwards every `/api` call to the Flask server. After `npm run build`, Flask also serves the built site from `frontend/dist`, so `uv run python server.py` alone runs everything.

### Running the Forecasting Notebooks
Jupyter is not part of the project's dependencies, so add it for the session:

```bash
uv sync
uv run --with jupyter jupyter notebook src/agripharm_track3_ethnohack_2026/forecasting/
# open data_preprocessing.ipynb, then model.ipynb
```

### Validating the Drug-to-Plant Data
```bash
uv run python EthnoHackData/src/validate.py
```

---

## 🔭 Future Develpment (Roadmap)
Our MVP is functional and geography-agnostic. To scale this into a global platform, our next steps include:
1. **Local Pilot Studies:** Combine climate, soil, and water data with expert validation to assess cultivation scenarios in broader regions.
2. **Updated Forecasts:** Automate data updates and monitor forecast accuracy as medicine demand changes.
3. **More Plants & Longer Horizons:** Extend plant and compound coverage, model establishment periods, and support multi-year harvests for perennial plants.
4. **More Resources:** Add cost, water and labour to the optimizer alongside land.

---

## 📜 License
This project is released under the **MIT License**. See the [LICENSE](LICENSE) file for details.
