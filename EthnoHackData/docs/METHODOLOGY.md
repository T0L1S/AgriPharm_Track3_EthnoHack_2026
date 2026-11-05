# Methodology and data provenance

**Project:** Ethno Hack 2026  
**Contributor:** Panoramix, data and drug-to-plant mapping  
**Documentation revision:** 2026-11-05

## 1. Overview

This contribution connects pharmaceutical demand forecasts to potential plant-material requirements. Reimbursed medicine boxes cannot be converted directly into crop quantities: packs differ in size and strength, labelled ingredients may be salts or combinations, and plant routes may involve precursors and manufacturing losses. The method maps individual presentations to ingredient mass, calculates a volume-weighted conversion for each ATC5 code, and applies documented chemical and botanical reference parameters. Deliverables include a traceable shortlist, a Python converter and reproducibility checks. The resulting plant quantities are conditional reference estimates; operational crop planning requires additional production and agricultural parameters.

**Recorded validation result:** all 13 check groups passed, including 14 converter test methods, in the package validation run on 5 November 2026. See [Validation results](#5-validation-results) for the scope of these checks.

## 2. Scope and data sources

### Project scope and documented coverage

**The team reports using eight substances in the final project; ispaghula / psyllium (A06AC01) was not used.** The exact eight-code selection has not yet been supplied for this documentation. The historical research includes nine pharmaceutical candidates plus psyllium, so one further exclusion remains to be identified.

| Coverage | What this contribution documents |
|---|---|
| Historical research | 10 ATC5 entries and 34 commercial presentations |
| Calibration data | Reimbursed boxes from January–June 2026 |
| Available forecast | 5 ATC5 codes over 12 months, August 2026–July 2027 |
| Final project selection | 8 substances reported; exact ATC membership pending |

Historical records are retained for traceability. They do not establish the final selection or provide an eight-substance forecast.

| Input | Provenance | Use |
|---|---|---|
| `2026-01-a-06_medic-am-par-classe-atc_serie-mensuelle.xlsx` | Supplied by the team; produced by CNAM / Assurance Maladie | Reimbursed boxes and ATC5–CIP13 relationships |
| `forecast_in_boxes_12_months.csv` | Supplied by **Christos Paterakis**, forecasting contributor | Twelve rows of forecasts for five ATC5 codes |
| Product characteristics, presentation data and ANSM correspondence | External references recorded per CIP | Pack contents and ingredient basis |
| Recorded publications and supporting references | External references recorded per plant route | Species, plant part, concentration and conversion assumptions |

Both supplied files are preserved in `data/raw/`. Pack and plant references are indexed in [Sources](SOURCES.md); field definitions are in the [Data dictionary](DATA_DICTIONARY.md). ATC5 identifies a drug classification entry; CIP13 identifies a specific commercial presentation. API denotes active pharmaceutical ingredient.

The MédicAM workbook's `lisez-moi` sheet states an edition date of **30 September 2026**. The measurements used cover **January–June 2026**, with France-wide coverage as defined by the source and reimbursement-based dates. These are reimbursed community-pharmacy packs within that coverage, not all pharmaceutical sales or clinical needs. See [Assurance Maladie — MédicAM](https://www.assurance-maladie.ameli.fr/etudes-et-donnees/medicaments-classe-atc-medicam).

No individual medical histories, examinations, demographic dataset or ageing model were used. The demand-source geography does not automatically define the cultivation region.

## 3. Drug-to-plant mapping

### Source reading

Python/openpyxl were used to read `2026_atc5_total` for monthly ATC totals and `2026_cip_total` for specific presentations. The `100% et non à 100%` sheets provide reimbursement-rate components for reconciliation. They are not added to the already-totalled observations. Different ATC hierarchy levels are not summed together.

`Nombre de boites remboursées` is the box count. `Base de remboursement` and `Montant remboursé` are financial amounts. Those amounts were retained for traceability, but were not treated as boxes, doses or kg.

### Candidate selection

Targeted research identified ingredients with potentially relevant plant routes and checked their presence in the supplied workbook. This was a curated shortlist, not an exhaustive classification of all medicines or an automated discovery model.

Considerations included observed box data, identifiable presentations, available plant evidence and route complexity. Presence in six months helped establish data availability, but did not establish sufficient forecasting history or accuracy.

| ATC5 | Historical candidate | Investigated plant route | Current scope record |
|---|---|---|---|
| M04AC01 | Colchicine | *Gloriosa superba* seeds | Pending final ATC list |
| C01AA05 | Digoxin | *Digitalis lanata* leaves; digoxin/precursor distinction | Pending final ATC list |
| S01EB01 | Pilocarpine | *Pilocarpus microphyllus* leaves | Pending final ATC list |
| A04AD01 | Scopolamine | *Duboisia* hybrid leaves | Pending final ATC list |
| S01FA01 | Atropine | Plant hyoscyamine followed by racemization | Pending final ATC list |
| D06BB04 | Podophyllotoxin | *Podophyllum peltatum* | Pending final ATC list |
| P01BF01 | Artemether component of a combination | *Artemisia annua* artemisinin and semisynthesis | Pending final ATC list |
| L01CA04 | Vinorelbine | *Catharanthus roseus* precursors and semisynthesis | Pending final ATC list |
| L01CB01 | Etoposide | Podophyllotoxin and semisynthesis | Pending final ATC list |
| A06AC01 | Ispaghula / psyllium | *Plantago ovata* seed husk | **Not used in the final project** |

The original five were colchicine, digoxin, pilocarpine, scopolamine and atropine. This historical priority is distinct from the later eight-substance decision.

ATC5 does not identify one unique commercial pack, strength or necessarily one ingredient. CIP13-level data are needed. A documented plant route also does not establish the current manufacturing route of every product.

### First deliverable

The shortlist workbook contains selection, monthly ATC observations, CIP presentations and evidence notes, including source row numbers. It did not yet establish complete ingredient content for every presentation; its original notes disclose that. The following stage expanded the pack mapping. The original workbook is preserved as historical evidence.

## 4. Conversion methodology

### 4.1 Ingredient mg per specific pack

For each of 34 historical presentations, the mapping records units per box, mg per unit and chemical basis. Units may be tablets, capsules, ampoules, sachets or mL. URLs and exceptions appear in `pack_composition.csv` and `pack_mapping_34_CIP.csv`.

Content was not inferred solely from abbreviated product names. Recorded decisions include:

- **COLCHICINE MYS, CIP 3400930311165:** the short name ends in `CPR 1`, but the ANSM letter identifies 30 tablets of 1 mg. The mapping uses 30 mg per box.
- **COLCHIMAX:** only colchicine contributes to this route, not the other ingredients.
- **RIAMET:** 24 × 20 mg artemether are counted; lumefantrine is outside this plant route.
- **TRANSILANE, CIP 3400933239794:** the historical final mapping uses 2,816 mg husk per sachet × 20. The short-name `3G` was not accepted as proof of husk content. This remains an audit example for excluded psyllium, not an ingredient used in the final project.

Some older presentations rely on combined evidence from MédicAM, archived characteristics and official lists. The `verification_note` field preserves these distinctions, particularly for MARTINET packs. Evidence quality is not uniform across all rows.

### 4.2 Weighted ingredient content per ATC box

Different packs under one ATC can contain different amounts. January–June 2026 CIP box volumes were used as weights. For presentation `p` and month `m`:

```text
q[p] = units_per_box[p] × mg_per_unit[p]
w[ATC] = sum(B[p,m] × q[p]) / sum(B[p,m])
```

`B` is observed reimbursed boxes and `q` is mg of the selected labelled ingredient per pack. Each sum includes only presentations in that ATC and the six calibration months. This is not an unweighted mean of strengths or of monthly means.

Monthly weighted factors were also recorded. The forecast uses the **pooled six-month pack mix held constant**. Future CIP shares were not forecast.

### 4.3 Chemical bases and precursors

Ingredient mass must use a basis compatible with the plant reference. Outputs retain both `label_ingredient_kg` and `api_base_kg_reference`.

| Route | Treatment / limitation |
|---|---|
| Pilocarpine | Hydrochloride-to-base ratio 208.26 / 244.72 |
| Scopolamine | Product equivalent: 0.500 mg salt = 0.350 mg base; factor 0.7 |
| Atropine | Assumed sulfate monohydrate: (2 × 289.37) / 694.83. **French-product hydration basis remains unconfirmed.** |
| Digoxin | Reference 6,120 nmol/g combines digoxin and lanatoside C; calculated molar equivalent is not measured free digoxin alone |
| Artemether | Plant measurement is artemisinin; ideal 1:1 molar conversion uses 298.4 / 282.33 before process recovery |
| Vinorelbine | One precursor assay cannot establish final vinorelbine yield; full factor remains missing |
| Psyllium, excluded | Identity refers to finished husk, not 100% conversion from whole seed |

Chemical reference links: [pilocarpine/salt](https://gsrs.ncats.nih.gov/ginas/app/beta/substances/0WW6D218XJ), [scopolamine product equivalence](https://base-donnees-publique.medicaments.gouv.fr/medicament/64665646/extrait), [digoxin molecular mass](https://dailymed.awsprod.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=eda7193a-e139-41d5-a11b-dc6241645995&type=display), [artemether](https://digicollections.net/phint/en/d/Jb/6.1.25.html), [artemisinin](https://pubchem.ncbi.nlm.nih.gov/compound/artemisinin), [atropine](https://www.ams.usda.gov/sites/default/files/media/AtropineTechnicalReport01092019.pdf) and [atropine sulfate monohydrate](https://www.accessdata.fda.gov/drugsatfda_docs/label/2022/208151s003lbl.pdf). The latter supports the assumed salt form, not confirmation of French-product hydration.

The MédicAM scopolamine join key `A04AD01` was preserved despite another ATC appearing in product information. Classification differences were recorded, not silently overwritten.

### 4.4 Plant reference parameters

Each value is paired with species, plant part, unit, source and limitations. These are particular samples, populations or clones, not universal crop yields.

| ATC5 | Historical parameter | Main limitation | Recorded source |
|---|---|---|---|
| M04AC01 | 0.007 kg colchicine/kg seed powder | Sample-specific content; recovery and moisture/cultivar unresolved | [Reference](https://pmc.ncbi.nlm.nih.gov/articles/PMC6696218/) |
| C01AA05 | 6,120 × 780.94 × 10^-9 = 0.0047793528 kg digoxin equivalent/kg dry leaf | Combined digoxin/precursor pool | [Reference](https://www.scielo.br/j/qn/a/d34VygV5wVCssVKtDVXms5m/abstract/?format=html&lang=en) |
| S01EB01 | 0.00683 kg/kg source-dried leaf | Population/season specific; not moisture-free biomass | [Reference](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0170281) |
| A04AD01 | 0.02004 kg/kg dry leaf | One studied hybrid | [Reference](https://pubmed.ncbi.nlm.nih.gov/27567452/) |
| S01FA01 | 0.00092 kg hyoscyamine/kg dry leaf | Wild-type controls; ideal mass preservation in racemization | [Reference](https://pmc.ncbi.nlm.nih.gov/articles/PMC7915368/) |
| D06BB04 | Missing | No representative positive concentration selected | [Reference](https://www.ars.usda.gov/research/publications/publication/?seqNo115=127812) |
| P01BF01 | 0.014 × (298.4 / 282.33) kg ideal artemether equivalent/kg dry leaf | Extraction/semisynthesis yield missing | [Reference](https://pmc.ncbi.nlm.nih.gov/articles/PMC4341905/) |
| L01CA04 | Missing | Multi-precursor balance and full route yield missing | [Reference](https://www.mdpi.com/1660-3397/20/3/188) |
| L01CB01 | Missing | Full podophyllotoxin-to-etoposide factor missing | [Reference](https://www.cancer.gov/publications/dictionaries/cancer-drug/def/etoposide) |
| A06AC01, excluded | 1 kg finished husk/kg finished husk | Does not determine whole-seed or area requirements | [Reference](https://base-donnees-publique.medicaments.gouv.fr/medicament/67437758/extrait) |

These links reproduce the recorded evidence trail; they do not indicate a new independent source review. For missing factors, a route reference does not supply the missing numerical yield. Inputs are in [plant_reference_inputs.csv](../data/curated/plant_reference_inputs.csv). Where both exist, `reference_content × reference_multiplier` gives potential API-equivalent kg per kg material. The multiplier can include unit conversion or stoichiometry; it is not necessarily a measured process yield.

### 4.5 Converting the forecast into material requirements

The forecast supplied by **Christos Paterakis** has indices 175–186, five ATC columns and no dates. Its first row was assigned to **August 2026** from Paterakis's message, followed by consecutive months to July 2027. This was not inferred from index 175. The original index remains available.

Decimal boxes were retained as expected quantities. Missing candidate forecasts were neither fabricated nor replaced with zero.

```text
label_ingredient_kg = forecast_boxes × mg_label_per_box / 1,000,000
api_base_kg_reference = label_ingredient_kg × base_factor_reference
material_kg_ideal_reference = api_base_kg_reference / potential_api_kg_per_kg_material_reference
```

A missing last factor gives unavailable plant mass. Otherwise the mass refers specifically to `material_basis`, not generic whole-plant biomass.

The first historical colchicine row gives:

```text
107,895.96 forecast boxes × 29.88394 mg/box / 1,000,000
≈ 3.22436 kg colchicine

3.22436 kg / 0.007 kg per kg of reference material
≈ 460.62 kg of reference material at ideal recovery
```

Values above are rounded for readability. The converter uses unrounded CSV values; displayed decimals do not imply equivalent biological precision.

### 4.6 “Reference” versus a planning input

Reference means a conditional mass balance using stated inputs. A planning scenario additionally needs:

```text
planning_plant_kg = material_kg_ideal_reference × plant_supply_share / net_recovery
```

`net_recovery` must cover relevant route losses and transformations. Supply share is a scenario fraction, not an observed manufacturer market share. All recovery values are blank, all planning approvals are 0 and share 1 is only an initial assumption in the retained version. Planning mode refuses those inputs and requires a documented `planning_parameter_note`. These are software completeness checks, not external certification of subsequently entered values.

## 5. Validation results

The recorded run on **5 November 2026 at 15:56 UTC**, using Python 3.12.14 and openpyxl 3.1.5, passed **13 check groups**, including a group containing **14 converter test methods**. These are results for the previously validated data/code package, not a new scientific review or a new execution triggered by this editorial revision.

| Validation area | Recorded result | Evidence |
|---|---|---|
| Source-sheet reconciliation | PASS: 60 ATC-months agree with CIP totals and reimbursement-rate components; 204 CIP-months agree with rate components | [Validation report](../validation/REPORT.md) |
| Numerical reproduction | PASS: five historical CSVs agree with regenerated outputs | [Machine-readable report](../validation/report.json) |
| Original workbook comparisons | PASS: specified numerical tables agree with cached Excel values | [Validation report](../validation/REPORT.md) |
| English presentation | PASS: five CSV views (124 rows) and the four-sheet review workbook agree with historical inputs | [Validation report](../validation/REPORT.md) |
| Converter behaviour | PASS: 14 test methods cover dimensional arithmetic, invalid inputs, missing factors and planning guards | [Test log](../validation/unit_tests.txt) |
| Snapshot integrity | PASS: 36 files matched the manifest at that run | [SHA-256 manifest](../validation/checksums.sha256) |

The validator also checks expected columns, unique keys, finite non-negative quantities, integer observed box counts, presentation coverage and explicit missing values. Test inputs are synthetic and are not additional project forecasts.

Numeric comparisons use relative tolerance `1e-10` and absolute tolerance `1e-9`; CSV text and identifiers are compared exactly. SHA-256 checks detect byte changes, not incorrect source claims. Scientific uncertainty is not represented by these computational tolerances.

**Interpretation:** PASS establishes numerical agreement with recorded inputs and assumptions. It does not independently validate botanical concentrations, manufacturing recovery, forecasting accuracy or the final eight-ATC selection. Three plant-route factors remain missing and all historical planning approvals remain 0.

**Revision boundary:** this document was edited after that validation run. Replacing the package's methodology changes its recorded checksum. Refresh the release manifest and rerun validation before publishing an updated package; the existing PASS must not be presented as a checksum result for the edited file.

## 6. Limitations and next steps

| Open item | Why it matters / next action |
|---|---|
| Exact final eight ATCs | Confirm membership and update selection metadata and tables consistently; psyllium is already excluded. |
| Forecast for the final selection | Obtain the corresponding forecast file if produced; the available file covers five ATCs. |
| Chemical forms | Confirm product-specific bases, especially atropine hydration. |
| Plant assays and material basis | Use representative species, cultivar, plant part and moisture conditions; reference samples are not universal crop yields. |
| Manufacturing recovery | Supply net extraction and transformation yields without double-counting losses. Complete the podophyllotoxin, vinorelbine and etoposide factors where relevant. |
| Agricultural and economic inputs | Define cultivation region, yield per area, cycles, sowing windows, costs and storage losses. |
| Forecast and supply assumptions | Document forecast training/backtesting, future pack mix and plant-derived supply share with the relevant team contributors. |

No final optimization-ready `demand.csv` is established by this contribution. Converting reference material into a cultivation plan also requires compatible yields per area and resource constraints. Routes sharing a precursor must use a common material balance to prevent double allocation.

## 7. Reproducibility and AI assistance

My contribution was the pharmaceutical-data-to-plant mapping and conversion workflow. The team supplied the MédicAM workbook, which consisted of data regarding medicines dispensed by French community pharmacies and reimbursed by the national health insurance system. ChatGPT assisted with source research, candidate selection, processing, code and the production of `EthnoHack_Drug_Plant_Shortlist.xlsx`, followed by `EthnoHack_Boxes_to_Plants.xlsx`, accompanying CSVs and the Python converter.

The **first** workbook organized ATC codes, candidate ingredients, plant routes and observed reimbursed boxes, while the **second** added pack compositions and converted predicted boxes into ingredient mass and conditional ideal plant-material mass, with explicit assumptions and missing parameters.

AI assistance is explicitly disclosed. The work is not represented as independent pharmacist/agronomist verification or as personal manual verification of every external source by the contributor.

### Code provenance

| Stage | Tools / work | What is retained |
|---|---|---|
| Source reading and numerical processing | Python/openpyxl, tables and JSON | Source files and reconstructed numerical code |
| Evidence curation | Targeted research assisted by ChatGPT | Values, URLs and notes; no automatic scientific-validation claim |
| Original Excel formatting/export | JavaScript with `@oai/artifact-tool`, with visual previews | Delivered XLSX files; temporary formatting scripts were not retained |
| Forecast conversion | Python standard library | Original `src/convert_forecast.py`, unchanged |
| Reconstruction/validation added 2026-11-03 | Python/openpyxl/unittest | `reproduce.py`, `validate.py`, tests |
| English revision | Explicit display-label mapping and English documents/views | `final_scope.json`, `english_labels.csv`, `export_english.py`, `build_english_workbook.mjs` |

The reconstructed scripts are not the lost original Excel builders. They reproduce the numerical transformations and compare them with preserved outputs. Original styling and binary XLSX identity are not recreated.

Historical curated tables were exported during documentation from the shortlist and conversion metadata; they were not files that already existed before the first delivery. Reconstruction uses their pack compositions and references, but reads observed volumes again from the **original MédicAM**.

`provenance/conversion_metadata_2026-10-31.json` and the original README provide historical context, not independent scientific evidence. A full search log and copies of every webpage were not retained.

Current documents and review views are in English. French/Greek originals remain intact. English CSVs replace display names with `name_en` and add scope status without changing numerical values. Product names/codes remain as supplied. The English review workbook presents historical snapshots; it is not a new eight-substance forecast model.


### Reproduce the numerical checks

From the `role_a_data/` directory:

```bash
python -m pip install -r requirements.txt
python src/validate.py
```

The validator rebuilds numerical outputs and writes reports under `validation/`. See the [repository README](../README.md) for individual script commands. The additional English workbook builder requires Node.js and `@oai/artifact-tool`; it is not required for the Python validation command above.
