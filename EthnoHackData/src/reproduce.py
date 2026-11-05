"""Reconstruct numerical outputs from MedicAM and explicitly curated evidence.

Written 2026-11-03 for auditability. Does not recreate the original Excel styling.
No network requests, forecast training, or inference of missing scientific inputs.
"""
import argparse
import csv
import math
from pathlib import Path
import re

import openpyxl
from convert_forecast import process, write_csv

ROOT = Path(__file__).resolve().parents[1]
RAW_NAME = '2026-01-a-06_medic-am-par-classe-atc_serie-mensuelle.xlsx'
MONTHS = [f'2026-{m:02d}' for m in range(1, 7)]


def read_csv(path):
    with Path(path).open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def unique(rows, key):
    result = {}
    for row in rows:
        value = row[key]
        if not value or value in result:
            raise ValueError(f'Missing/duplicate {key}: {value!r}')
        result[value] = row
    return result


def finite(value, label, positive=False):
    try:
        result = float(value)
    except (ValueError, TypeError) as exc:
        raise ValueError(f'{label}: missing/non-numeric') from exc
    if not math.isfinite(result) or result < 0 or (positive and result == 0):
        raise ValueError(f'{label}: invalid {value!r}')
    return result


def measurements(workbook, sheet, codes):
    """Identify columns from header text; retain Excel row numbers for provenance."""
    ws = workbook[sheet]
    header = [str(x or '').strip() for x in next(ws.iter_rows(min_row=6, max_row=6, values_only=True))]
    atc_col = header.index('Code ATC5')
    cip_col = header.index('CIP13') if 'CIP13' in header else None
    rate_col = header.index('Taux de remboursement') if 'Taux de remboursement' in header else None
    columns = {}
    for i, text in enumerate(header):
        match = re.search(r'2026-\d{2}$', text)
        if not match:
            continue
        month = match.group()
        metric = ('boxes' if text.startswith('Nombre de boites remboursées') else
                  'base_eur' if text.startswith('Base de remboursement') else
                  'reimbursed_eur' if text.startswith('Montant remboursé') else None)
        if metric:
            if (month, metric) in columns:
                raise ValueError(f'Duplicate measurement header in {sheet}')
            columns[month, metric] = i
    expected = {(m, k) for m in MONTHS for k in ('boxes', 'base_eur', 'reimbursed_eur')}
    if set(columns) != expected:
        raise ValueError(f'Unexpected period/measurement columns in {sheet}')
    result = []
    for excel_row, values in enumerate(ws.iter_rows(min_row=7, values_only=True), 7):
        code = values[atc_col]
        if code not in codes:
            continue
        row = dict(atc5=code, atc_name=values[header.index('Libellé ATC5')], source_row=excel_row)
        if cip_col is not None:
            cip = str(values[cip_col])
            if not re.fullmatch(r'\d{13}', cip):
                raise ValueError(f'Invalid CIP13 at {sheet}:{excel_row}')
            row.update(cip13=cip, product=values[header.index('NOM COURT')])
        if rate_col is not None:
            row['rate'] = values[rate_col]
        row['values'] = {}
        for key, col in columns.items():
            value = finite(values[col], f'{sheet}:{excel_row}:{header[col]}')
            if key[1] == 'boxes':
                if not value.is_integer():
                    raise ValueError(f'Non-integer observed box count at {sheet}:{excel_row}')
                value = int(value)
            row['values'][key] = value
        result.append(row)
    return result


def run(root=ROOT, out=None):
    root = Path(root)
    out = Path(out) if out else root / 'build'
    # Reference snapshots must remain unchanged.
    if out.resolve() == (root / 'outputs').resolve():
        raise ValueError('Use a separate build directory; do not overwrite delivered snapshots.')
    out.mkdir(parents=True, exist_ok=True)
    candidates = read_csv(root / 'data/curated/candidates.csv')
    candidate_map = unique(candidates, 'atc5')
    refs = unique(read_csv(root / 'data/curated/plant_reference_inputs.csv'), 'atc5')
    compositions = unique(read_csv(root / 'data/curated/pack_composition.csv'), 'cip13')
    if set(refs) != set(candidate_map):
        raise ValueError('Candidate and plant-reference ATCs differ')
    wb = openpyxl.load_workbook(root / 'data/raw' / RAW_NAME, read_only=True, data_only=True)
    try:
        atcs = unique(measurements(wb, '2026_atc5_total', candidate_map), 'atc5')
        packs = measurements(wb, '2026_cip_total', candidate_map)
    finally:
        wb.close()
    if set(atcs) != set(candidate_map):
        raise ValueError('Selected ATC missing from MedicAM')
    if set(unique(packs, 'cip13')) != set(compositions):
        raise ValueError('CIP composition coverage does not match selected MedicAM records')
    mapped = []
    for pack in packs:
        c = compositions[pack['cip13']]
        if c['atc5'] != pack['atc5']:
            raise ValueError(f'ATC mismatch for CIP {pack["cip13"]}')
        if c['label_basis'] != refs[pack['atc5']]['label_basis']:
            raise ValueError('Mixed ingredient bases cannot be pooled')
        units = finite(c['units_per_box'], 'units_per_box', positive=True)
        mg_unit = finite(c['mg_per_unit'], 'mg_per_unit', positive=True)
        monthly = {f'{m}_boxes': pack['values'][m, 'boxes'] for m in MONTHS}
        mapped.append(dict(cip13=pack['cip13'], atc5=pack['atc5'], product=pack['product'],
            boxes_6m=sum(monthly.values()), units_per_box=units, mg_per_unit=mg_unit,
            unit=c['unit'], label_basis=c['label_basis'], mg_label_per_box=units * mg_unit,
            source_url=c['source_url'], verification_note=c['verification_note'],
            source_row=pack['source_row'], **monthly))
    write_csv(out / 'pack_mapping_34_CIP.csv', mapped)
    factors, calibration, shortlist, summary = [], [], [], []
    for candidate in candidates:
        code = candidate['atc5']
        p = refs[code]
        group = [pack for pack in mapped if pack['atc5'] == code]
        total = sum(pack['boxes_6m'] for pack in group)
        if total <= 0:
            raise ValueError(f'No observed box volume for {code}')
        mg = sum(pack['boxes_6m'] * pack['mg_label_per_box'] for pack in group) / total
        base = finite(p['base_factor_reference'], 'base factor', positive=True)
        content = finite(p['reference_content'], 'content', positive=True) if p['reference_content'] else None
        mult = finite(p['reference_multiplier'], 'multiplier', positive=True) if p['reference_multiplier'] else None
        potential = content * mult if content is not None and mult is not None else None
        factors.append(dict(atc5=code, name_el=p['name_el'], plant=p['plant'], species=p['species'],
            material_basis=p['material_basis'], mg_label_per_box=mg, label_basis=p['label_basis'],
            base_factor_reference=base, base_factor_status=p['base_factor_status'],
            potential_api_kg_per_kg_material_reference=potential,
            kg_material_per_box_ideal_reference=None if potential is None else mg * base / 1_000_000 / potential,
            net_recovery=p['net_recovery'], plant_supply_share=p['plant_supply_share'],
            approved_for_planning=p['approved_for_planning'], planning_parameter_note=p['planning_parameter_note'],
            reference_evidence=p['reference_evidence'], missing=p['missing'], source_url=p['source_url']))
        observed = atcs[code]
        for month in MONTHS:
            boxes = observed['values'][month, 'boxes']
            cip_boxes = sum(pack[f'{month}_boxes'] for pack in group)
            if cip_boxes != boxes:
                raise ValueError(f'CIP/ATC mismatch: {code}, {month}')
            monthly_mg = (sum(pack[f'{month}_boxes'] * pack['mg_label_per_box'] for pack in group) / boxes
                          if boxes else None)
            calibration.append(dict(atc5=code, month=month, mg_label_per_box=monthly_mg, label_basis=p['label_basis']))
            shortlist.append(dict(month=month, atc5=code, atc_name=observed['atc_name'], boxes=boxes,
                reimbursement_base_eur=observed['values'][month, 'base_eur'],
                reimbursed_eur=observed['values'][month, 'reimbursed_eur'],
                source_sheet='2026_atc5_total', source_row=observed['source_row']))
        summary.append(dict(**candidate, boxes_6m=total, months_positive=sum(observed['values'][m, 'boxes'] > 0 for m in MONTHS), cip_count=len(group)))
    write_csv(out / 'conversion_factors_all_candidates.csv', factors)
    write_csv(out / 'monthly_calibration_mg_per_box.csv', calibration)
    write_csv(out / 'shortlist_monthly.csv', shortlist)
    write_csv(out / 'shortlist_summary.csv', summary)
    forecast_path = root / 'data/raw/forecast_in_boxes_12_months.csv'
    raw_forecast = read_csv(forecast_path)
    forecast_codes = [k for k in raw_forecast[0] if k not in ('', 'source_index', 'month', 'date', 'Unnamed: 0')]
    # Start date comes from Paterakis's message, NOT from the numeric index.
    start = 2026 * 12 + 7
    dated = []
    for i, row in enumerate(raw_forecast):
        value = start + i
        dated.append(dict(month=f'{value // 12:04d}-{value % 12 + 1:02d}',
            source_index=row.get('', row.get('source_index', '')), **{c: row[c] for c in forecast_codes}))
    write_csv(out / 'forecast_boxes_dated.csv', dated)
    converted = process(forecast_path, out / 'conversion_factors_all_candidates.csv', '2026-08', 'reference')
    write_csv(out / 'forecast_converted_reference.csv', converted)
    return dict(candidates=len(candidates), cip_records=len(mapped), historical_atc_months=len(shortlist), forecast_atc_months=len(converted))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--out', type=Path)
    args = parser.parse_args()
    print(run(args.root, args.out))
