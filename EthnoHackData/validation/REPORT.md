# Reproducibility checks | By Panoramix

UTC: `2026-11-05T15:56:24.419378+00:00`

Historical numerical/structural result: **PASS**. This does not validate agricultural or manufacturing parameters.

Final project scope: **8 substances reported; psyllium not used**. Membership status: `PENDING_FINAL_ATC_LIST`. Historical candidate counts below are not the final selection.

Python 3.12.14 · openpyxl 3.1.5 · relative tolerance 1e-10, absolute tolerance 1e-09.

| Check | Result | Finding |
|---|---|---|
| Snapshot SHA-256 | PASS | 36 files match the recorded SHA-256 snapshot; identity check only. |
| Rebuild from raw + curated inputs | PASS | {'candidates': 10, 'cip_records': 34, 'historical_atc_months': 60, 'forecast_atc_months': 60} |
| Independent source-sheet reconciliation | PASS | 60 ATC-months reconcile to CIP sums and rate components; 204 CIP-months reconcile to rate components. Observed counts are finite, non-negative integers. |
| Reproduced CSV: pack_mapping_34_CIP.csv | PASS | 34 rows, 612 cells agree with delivered snapshot (numeric tolerance or exact text). |
| Reproduced CSV: conversion_factors_all_candidates.csv | PASS | 10 rows, 180 cells agree with delivered snapshot (numeric tolerance or exact text). |
| Reproduced CSV: monthly_calibration_mg_per_box.csv | PASS | 60 rows, 240 cells agree with delivered snapshot (numeric tolerance or exact text). |
| Reproduced CSV: forecast_boxes_dated.csv | PASS | 12 rows, 84 cells agree with delivered snapshot (numeric tolerance or exact text). |
| Reproduced CSV: forecast_converted_reference.csv | PASS | 60 rows, 780 cells agree with delivered snapshot (numeric tolerance or exact text). |
| Original shortlist workbook | PASS | 10 selection totals, 60 historical rows (including financial amounts), and 34 CIP rows match the original Excel cached values. |
| Original boxes-to-plants workbook | PASS | 10 factor rows and 60 forecast rows match the original Excel cached values. Formatting and every narrative cell are outside this numeric check. |
| Scope and explicit missing values | PASS | 10 candidates retained; 5 forecast ATCs; 3 plant factors remain missing; all 10 planning approvals remain 0. |
| English views and scope disclosure | PASS | Five English CSV views (124 rows) and the four-sheet review workbook agree with their historical sources. Psyllium is marked not used. Final eight-ATC membership remains a separate scope issue. |
| Converter unit tests | PASS | 14 test methods passed, including invalid-input subcases, dimensional arithmetic, planning guards, and all-10-candidate synthetic coverage. |

## Outstanding evidence and scope

- The team reports using eight substances and excludes psyllium. The exact final eight ATCs have not been supplied; one additional excluded candidate is unidentified. Numerical checks cover historical research, not a finalized eight-substance selection.
- Curated pack compositions and botanical references were exported from the delivered artifacts. Numerical agreement is not independent verification of their scientific evidence.
- No validated net extraction/manufacturing recovery is supplied; no final demand.csv or crop plan is certified.
- Atropine sulfate hydration/base-equivalent assumption remains unresolved for the French products.
- Podophyllotoxin, vinorelbine and etoposide lack usable complete plant-to-API factors.
- Historical Jan–Jun 2026 pack mix is held fixed; future mix and actual plant-derived supply shares are unknown.
- Forecast dates come from Paterakis’s message. Training data, backtesting and forecast accuracy are outside this package.
- Cultivation region, yield per area, cycles, costs, storage decay and competing uses of shared precursors are not validated.
