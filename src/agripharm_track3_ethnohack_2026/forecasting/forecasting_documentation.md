# Role B: Demand Forecasting for ATC5 Codes

## 1. Overview
This module represents the forecasting pipeline (Role B) for the plant cultivation optimization project. Its primary objective is to predict the future 12-month demand (in reimbursed boxes) for 8 specific ATC5 codes (active pharmaceutical ingredients). These forecasts act as the foundational input for Role C (Optimization), bridging the gap between historical pharmaceutical consumption and future agricultural planning.

## 2. Data Source & Preprocessing
The historical data is sourced from the French *Assurance Maladie* open datasets, providing monthly records from January 2012 to July 2026 (175 months). (https://www.assurance-maladie.ameli.fr/etudes-et-donnees/medicaments-classe-atc-medicam)

**Processing Steps (`data_preprocessing.ipynb`):**
- **Parsing & Cleaning:** Extracted relevant numeric data ("Nombre de boîtes remboursées") and dropped incomplete rows/metadata.
- **Formatting:** Transformed the dataset from a wide to a long format suitable for time-series analysis.
- **Time Indexing:** Applied a strict `Monthly Start (MS)` frequency using `pandas`.
- **Expansion:** Handled the initial batch of 5 ATC5 codes and later expanded to incorporate 3 additional codes.

## 3. Modeling Methodology
The core forecasting engine utilizes the **SARIMA** (Seasonal AutoRegressive Integrated Moving Average) algorithm via the `pmdarima` library (`auto_arima`). 

**Algorithm Configuration:**
- **Univariate Approach:** Models rely strictly on the historical patterns of each individual time series.
- **Seasonality:** Enforced a 12-month seasonal cycle ($m=12$).
- **Stationarity:** Applied primary and seasonal differencing ($d=1, D=1$) to account for non-stationarity and extract stable trends.

**Data-Centric Interventions (Cleaning):**
To ensure mathematical stability and prevent technical bias, specific time-series were treated before final training:
- **Trimming (Concept Drift / Market Entry):** For `P01BF01`, the first 30 months of inactive market data (zeros/NaNs) were dropped. The model was trained only on the active period (month 31 onwards).
- **Despiking (Outlier Treatment):** For `L01CB01`, an extreme, unnatural spike and subsequent drop (months 95-102) was neutralized using linear interpolation to prevent variance distortion.

## 4. Performance & Results
Models were evaluated using a Train/Test split (last 12 months as the test set) and assessed primarily via **MAPE** (Mean Absolute Percentage Error) and **RMSE**.

- **High Accuracy (MAPE < 10%):** `C01AA05`, `S01EB01`, `S01FA01`, `L01CA04`. These codes display strong, predictable structural patterns (either linear decline or stable seasonality).
- **Moderate Accuracy (MAPE 10% - 20%):** `M04AC01`, `L01CB01`. Effectively captured the general trend, heavily aided by the despiking preprocessing.
- **Shock-Affected (MAPE > 20%):** `A04AD01` (~25.6%), `P01BF01`.

## 5. Architectural Scalability & Human-in-the-Loop Concept
While the system is currently demonstrated using French data as a **Proof of Concept (PoC)**, the core architecture (Data Cleaning -> SARIMA Forecasting -> Optimization Solver) is entirely **geography-agnostic and scalable**. If provided with historical demand data from another country or pharmaceutical company, the pipeline can generate optimized cultivation plans without code modifications.

However, the forecasting process deliberately avoids a fully automated "black box" approach (AutoML). Real-world pharmaceutical data is inherently noisy and subject to abrupt structural breaks. To prevent the optimization engine from planning agricultural production based on mathematically flawed predictions (e.g., caused by an unhandled historical outlier), this module implements a **Human-in-the-Loop Architecture**. 

In this workflow, the demand modeling functions as an internal Data Science module where a human analyst validates the data, performs necessary interventions (like despiking or trimming), and approves the final predictions before they are fed into the live optimization UI.

## 6. Known Limitations (Future Work)
A key limitation of the univariate SARIMA approach is its inability to predict sudden structural breaks caused by exogenous market factors. Extreme MAPE deviations (like in `A04AD01`) are attributed to unpredictable market shocks such as:
1. Supply chain disruptions (e.g., stockouts).
2. Regulatory changes in reimbursement rates.
3. The sudden market entry of generic competitors.

For future iterations, integrating supply chain alerts, multivariate models (e.g., XGBoost, SARIMAX), or setting up an MLOps pipeline for automated data ingestion and validation (e.g., using Pydantic/Great Expectations) could mitigate these unpredictable shocks and further automate the workflow.

## 7. Deliverables & Integration
To maintain a decoupled and highly performant architecture, trained `.joblib` models are **not** pushed to the shared repository. Instead, the final output is a static `.csv` file. 

- **Final Output:** `expanded_forecast_in_boxes_12_months.csv`
- **Content:** 12 months of future predictions (August 2026 - July 2027) for all 8 ATC5 codes.
- **Usage:** This file serves as the strict API/contract for **Role C**. The optimization algorithms should read this CSV to calculate required plant quantities without needing to execute any ML code.