# Data dictionary

## Source files

The MédicAM workbook in `data/raw/` is unchanged. Measurement headers are in Excel row 6; observations start at row 7. The reader identifies columns by their headers.

The original forecast has an unnamed index column and five ATC columns. Values are predicted boxes; indices 175–186 do not encode dates by themselves.

## Curated and scope files

| File | Key | Meaning |
|---|---|---|
| `candidates.csv` | `atc5` | Historical ten-candidate selection, original names, priority and route |
| `pack_composition.csv` | `cip13` | Units per pack, mg per unit, chemical basis and references |
| `plant_reference_inputs.csv` | `atc5` | Plant material, content, units, chemistry factors and limitations |
| `english_labels.csv` | `atc5` | English display names and translations of historical priority/route |
| `final_scope.json` | Whole document | Team reports eight final substances; psyllium not used; exact eight ATCs pending |

Historical curated tables were exported from recorded earlier decisions. Observed volumes are reread from the raw Excel during reconstruction. Scope metadata does not silently filter or change the historical reproduction pipeline.

## Important fields

| Field | Definition / unit |
|---|---|
| `atc5` | Text join key from MédicAM; not a presentation identifier |
| `cip13` | Thirteen-digit text identifying a presentation |
| `month` | `YYYY-MM` |
| `source_row` | Original Excel row number, starting at 1 |
| `source_index` | Index retained from Role B's forecast |
| `boxes_6m`, `2026-MM_boxes` | Observed reimbursed boxes, not money |
| `forecast_boxes` | Non-negative predicted boxes; decimals allowed |
| `units_per_box` | Tablets/capsules/ampoules/sachets or mL, as specified by `unit` |
| `mg_per_unit` | Selected labelled ingredient mg per stated unit |
| `mg_label_per_box` | Per-pack ingredient mg in a CIP table; volume-weighted mg/box in an ATC table |
| `label_basis` | Ingredient form, e.g. hydrochloride, base, or husk |
| `base_factor_reference` | kg base equivalent / kg labelled ingredient |
| `base_factor_status` | Evidence or assumption status of the base factor |
| `plant` | Material ID used between modules, usually including the plant part |
| `species` | Botanical species or hybrid |
| `material_basis` | Specific material, such as dry leaf, seed powder or finished husk |
| `reference_content`, `content_unit` | Recorded literature value and its unit |
| `reference_multiplier` | Unit/stoichiometric multiplier, explained in `potential_derivation` |
| `potential_api_kg_per_kg_material_reference` | Ideal API-equivalent kg/kg specified material before net recovery |
| `kg_material_per_box_ideal_reference` | Ideal material kg per weighted ATC box |
| `label_ingredient_kg` | Ingredient mass on the label basis |
| `api_base_kg_reference` | Base-equivalent mass; for excluded psyllium this is botanical-material mass |
| `material_kg_ideal_reference` | Ideal kg of the specified material; not validated crop demand |
| `net_recovery` | Overall process fraction in (0,1]; blank in the retained inputs |
| `plant_supply_share` | Scenario fraction of requirement assigned to this route, in [0,1] |
| `approved_for_planning` | Software input flag, 0 or 1; all 0 in the retained version |
| `planning_parameter_note` | Evidence/assumption explanation needed for planning mode |
| `planning_plant_kg` | Scenario planning mass; blank in reference outputs |
| `name_el`, `name_en` | Original Greek display name and English-view name, respectively |
| `final_project_status` | `NOT_USED` for psyllium; `PENDING_FINAL_ATC_LIST` for unresolved membership |
| `source_url`, `reference_evidence`, `verification_note`, `missing` | Evidence, qualifications and gaps; part of the interpretation of numerical values |

## Historical output sizes

| File | Coverage |
|---|---|
| `EthnoHack_Drug_Plant_Shortlist.xlsx` | Original selection, 60 ATC-months, 34 CIP records and evidence |
| `EthnoHack_Boxes_to_Plants.xlsx` | Original pack, factor and forecast conversion workbook |
| `pack_mapping_34_CIP.csv` | 34 presentations |
| `conversion_factors_all_candidates.csv` | 10 historical ATC entries |
| `monthly_calibration_mg_per_box.csv` | 10 ATCs × 6 historical months |
| `forecast_boxes_dated.csv` | 12 rows with 5 ATC columns |
| `forecast_converted_reference.csv` | 5 ATCs × 12 forecast months |

These are historical counts, not the final eight-substance scope. The excluded psyllium records remain for traceability.

`outputs/english/` provides `candidates_en.csv`, `conversion_factors_en.csv`, `plant_reference_inputs_en.csv`, `pack_mapping_en.csv`, `forecast_reference_en.csv` and the English review workbook. All are historical views with explicit scope status. `src/export_english.py` reproduces the CSVs. The workbook presents the same snapshots; rerun its separate builder after changing those inputs.

`build/` recreates the five numerical CSVs and adds `shortlist_monthly.csv` and `shortlist_summary.csv` for inspection. It is not uploaded to Git.

## Missing, zero and status

A blank CSV cell, JSON `null` or Excel `n.a.` means unavailable/not applicable according to its field, not zero. The three missing complete plant-to-API factors stay missing. True zero observed boxes stay zero.

`REFERENCE_ONLY_NOT_VALIDATED_DEMAND` identifies a conditional reference calculation. A number in the material column does not change that status. `PLANNING_SCENARIO`, if used later, means the required code inputs were supplied, not that an outside authority certified them.

CSVs use UTF-8 with BOM, comma separators and decimal points. Import CIP identifiers as text when working manually in a spreadsheet.
