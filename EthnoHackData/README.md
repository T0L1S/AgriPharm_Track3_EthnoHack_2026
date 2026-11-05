<div align="center">

<img src="AgriPharm.png" width="850" alt="EthnoHackData — From medicine demand to plant-material requirements">


**Ethno Hack 2026 · Data & drug-to-plant mapping · Panoramix**

[Methodology](docs/METHODOLOGY.md) · [Explore the data](outputs/english/EthnoHack_Data_Reviewed_EN.xlsx) · [Validation](validation/REPORT.md) · [Sources](docs/SOURCES.md)

</div>

---

## Why this work matters

A forecast in **medicine boxes** is not yet a forecast in **kilograms of plant material**. Pack sizes, ingredient strengths, chemical forms and plant concentrations all affect the conversion.

This contribution builds that connection: it combines the team's French **MédicAM reimbursement data**, presentation-level drug information and recorded botanical references to produce **traceable, conditional estimates of plant-material demand**. These estimates provide a starting point for the team's production-planning simulation.

**The core contribution:** a documented drug-to-plant mapping, a reproducible conversion workflow and explicit checks on the resulting numbers.

## Start here — a quick guide for reviewers

| To understand… | Open… |
|---|---|
| **How the conversion works** — decisions, formulas and assumptions | [Methodology](docs/METHODOLOGY.md) |
| **What was produced** — candidates, factors, forecasts and pack mappings | [English review workbook](outputs/english/EthnoHack_Data_Reviewed_EN.xlsx) |
| **What was checked** — numerical consistency and reproducibility | [Validation report](validation/REPORT.md) |
| **Where the inputs came from** — product and plant references | [Sources](docs/SOURCES.md) |
| **What each field means** — units, identifiers and missing values | [Data dictionary](docs/DATA_DICTIONARY.md) |

## How the workflow works

| Step | Transformation | Why it is needed |
|---|---|---|
| **1 · Identify** | MédicAM records → ATC5 candidates and CIP13 presentations | One drug classification can contain several pack sizes and strengths. |
| **2 · Quantify** | Pack contents + reimbursed box volumes → weighted ingredient mg per box | The conversion reflects the observed mix of presentations. |
| **3 · Convert** | Forecast boxes → ingredient mass → compatible chemical basis | Salts, combinations and precursors require explicit treatment. |
| **4 · Map** | Ingredient mass + plant reference parameters → ideal reference material kg | Each estimate names the plant material and records its assumptions. |
| **5 · Check** | Source reconciliation + output comparisons + converter tests | Reviewers can follow and reproduce the calculations. |

The two original deliverables document this progression:

- [**Drug–Plant Shortlist**](outputs/EthnoHack_Drug_Plant_Shortlist.xlsx): candidate ingredients, plant routes and observed reimbursed boxes.
- [**Boxes-to-Plants**](outputs/EthnoHack_Boxes_to_Plants.xlsx): pack compositions, conversion factors and reference material estimates.

The box forecast was supplied by **Christos Paterakis**. Forecast-model training and production optimization are separate team contributions.

## Coverage and interpretation

| Item | Coverage documented here |
|---|---|
| Source data | French MédicAM reimbursed community-pharmacy boxes, January–June 2026 |
| Historical research | 10 ATC5 entries and 34 commercial presentations |
| Available forecast | 5 ATC5 codes over 12 months, August 2026–July 2027 |
| Final team selection | 8 substances reported; **psyllium was not used** |

The exact final eight-code list remains pending in the supplied [scope record](data/curated/final_scope.json). Historical files preserve the broader research and should not be read as the final selection.

> **Reference estimate ≠ cultivation requirement.** Plant-material kg use stated concentrations and ideal conversion assumptions. Validated manufacturing recovery and regional agricultural inputs are still needed for operational planning. Missing parameters remain explicit; they are not replaced with invented values or zero demand.

In the retained inputs, all `net_recovery` values are blank and all `approved_for_planning` values are 0. This package therefore does not provide a final optimization-ready `demand.csv`. Reimbursed boxes also do not represent all pharmaceutical sales or the population's complete clinical needs.

## Validation and reproducibility

The [recorded validation report](validation/REPORT.md) distinguishes numerical consistency from scientific validation. Checks cover:

- Source totals reconciled across ATC, CIP and reimbursement-rate sheets.
- Recalculated conversion factors and forecasts compared with delivered outputs.
- Invalid inputs, missing factors, dimensional arithmetic and planning safeguards.
- File identity through SHA-256 checksums.

**A numerical PASS confirms agreement with the recorded inputs and assumptions.** It does not independently establish botanical concentrations, manufacturing yields or forecast accuracy.

From the repository root, install and run the shared project environment with:

```bash
uv sync
uv run python EthnoHackData/src/validate.py
```

The validator rebuilds numerical CSVs under `build/`, runs tests and writes reports under `validation/`. The documented environment is Python 3.12.14 with openpyxl 3.1.5.

<details>
<summary><strong>Additional commands and implementation notes</strong></summary>

Rebuild numerical outputs or export English CSV views:

```bash
uv run python EthnoHackData/src/reproduce.py
uv run python EthnoHackData/src/export_english.py
```

Run the original converter in reference mode:

```bash
uv run python EthnoHackData/src/convert_forecast.py \
  --forecast EthnoHackData/data/raw/forecast_in_boxes_12_months.csv \
  --factors EthnoHackData/outputs/conversion_factors_all_candidates.csv \
  --start-month 2026-08 \
  --mode reference \
  --output-dir EthnoHackData/build/converter_only
```

The converter uses Python's standard library. The optional English workbook builder uses Node.js and `@oai/artifact-tool`; it is not required for Python validation. Original temporary Excel-formatting scripts were not retained; reconstructed scripts reproduce numerical transformations rather than the original workbooks' styling or binary identity.

If tracked files have changed since the recorded run—including this README—the previous checksum result applies to the earlier snapshot. Review the changes, refresh the release manifest and rerun validation before reporting results for a new release.

</details>

## Inside this folder

| Folder / file | Purpose |
|---|---|
| [`data/`](data/) | Supplied source data and curated conversion inputs |
| [`docs/`](docs/) | Methodology, sources and field definitions |
| [`outputs/`](outputs/) | Original deliverables, CSV results and English review views |
| [`src/`](src/) | Conversion, reconstruction, export and validation code |
| [`tests/`](tests/) | Converter test cases |
| [`validation/`](validation/) | Reports, test log and checksum manifest |
| [`provenance/`](provenance/) | Historical metadata and delivery notes |
| [`requirements.txt`](requirements.txt) | Legacy Python dependency reference |

`build/` is generated locally and excluded from Git. `.gitignore` and `.gitattributes` control generated files and byte-preserving text handling. Upload instructions are in the [GitHub guide](docs/GITHUB_GUIDE.md).

## Attribution and transparency

Prepared by **Panoramix**, with ChatGPT assistance for research, processing, code and documentation. Original French source data and earlier Greek artifacts are retained for provenance; English documentation and review views support evaluation. The [methodology](docs/METHODOLOGY.md) distinguishes original deliverables, later reconstruction and unresolved assumptions. Third-party sources remain attributable to their respective providers.
