"""Numerical/structural audit. Passing does not validate agricultural parameters."""
import argparse
from collections import defaultdict
import datetime as dt
import hashlib
import io
import json
import math
from pathlib import Path
import platform
import unittest

import openpyxl
from reproduce import ROOT, RAW_NAME, MONTHS, measurements, read_csv, run, unique
from export_english import make_views

REL_TOL = 1e-10
ABS_TOL = 1e-9


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def equal_number(a, b, label):
    missing = (None, '', 'n.a.')
    if a in missing or b in missing:
        require(a in missing and b in missing, f'{label}: missing/value mismatch {a!r}, {b!r}')
        return
    a, b = float(a), float(b)
    require(math.isfinite(a) and math.isfinite(b) and math.isclose(a, b, rel_tol=REL_TOL, abs_tol=ABS_TOL),
            f'{label}: {a!r} != {b!r}')


def compare_csv(original, regenerated, key, numeric):
    left, right = read_csv(original), read_csv(regenerated)
    require(bool(left) and bool(right), f'Empty CSV: {original.name}')
    require(set(left[0]) == set(right[0]), f'Header mismatch: {original.name}')
    def index(rows):
        result = {}
        for r in rows:
            k = tuple(r[x] for x in key)
            require(k not in result, f'Duplicate key {k}')
            result[k] = r
        return result
    a, b = index(left), index(right)
    require(a.keys() == b.keys(), f'Row key mismatch: {original.name}')
    cells = 0
    for k in a:
        for field in a[k]:
            if field in numeric:
                equal_number(a[k][field], b[k][field], f'{original.name}:{k}:{field}')
            else:
                require(a[k][field] == b[k][field], f'Text mismatch: {original.name}:{k}:{field}')
            cells += 1
    return len(left), cells


def validate(root=ROOT):
    root = Path(root)
    checks = []
    def check(name, fn):
        try:
            details = fn()
            checks.append(dict(name=name, status='PASS', details=details))
        except Exception as exc:
            checks.append(dict(name=name, status='FAIL', details=f'{type(exc).__name__}: {exc}'))

    def checksum_check():
        entries = (root / 'validation/checksums.sha256').read_text().splitlines()
        require(bool(entries), 'Empty checksum manifest')
        for entry in entries:
            digest, relative = entry.split('  ', 1)
            actual = hashlib.sha256((root / relative).read_bytes()).hexdigest()
            require(actual == digest, f'Changed file: {relative}')
        return f'{len(entries)} files match the recorded SHA-256 snapshot; identity check only.'
    check('Snapshot SHA-256', checksum_check)
    check('Rebuild from raw + curated inputs', lambda: run(root))

    codes = {r['atc5'] for r in read_csv(root / 'data/curated/candidates.csv')}
    def source_reconciliation():
        wb = openpyxl.load_workbook(root / 'data/raw' / RAW_NAME, read_only=True, data_only=True)
        try:
            a = measurements(wb, '2026_atc5_total', codes)
            c = measurements(wb, '2026_cip_total', codes)
            sa = measurements(wb, '2026_atc5_100% et non à 100%', codes)
            sc = measurements(wb, '2026_cip13_100% et non à 100%', codes)
        finally:
            wb.close()
        unique(a, 'atc5'); unique(c, 'cip13')
        require(len(a) == 10 and len(c) == 34, 'Unexpected source selection size')
        def sums(rows, field):
            out = defaultdict(float)
            seen = set()
            for r in rows:
                k = (r[field], r.get('rate', 'total'))
                require(k not in seen, f'Duplicate source key {k}')
                seen.add(k)
                for m in MONTHS:
                    out[r[field], m] += r['values'][m, 'boxes']
            return dict(out)
        atc, cip, atc_split, cip_split = sums(a, 'atc5'), sums(c, 'cip13'), sums(sa, 'atc5'), sums(sc, 'cip13')
        require(atc == atc_split, 'ATC total != reimbursement-rate component sum')
        require(cip == cip_split, 'CIP total != reimbursement-rate component sum')
        grouped = defaultdict(float)
        for r in c:
            for m in MONTHS:
                grouped[r['atc5'], m] += r['values'][m, 'boxes']
        require(atc == dict(grouped), 'ATC total != CIP sum')
        return '60 ATC-months reconcile to CIP sums and rate components; 204 CIP-months reconcile to rate components. Observed counts are finite, non-negative integers.'
    check('Independent source-sheet reconciliation', source_reconciliation)

    specifications = {
        'pack_mapping_34_CIP.csv': (['cip13'], {'boxes_6m', 'units_per_box', 'mg_per_unit', 'mg_label_per_box', 'source_row'} | {f'{m}_boxes' for m in MONTHS}),
        'conversion_factors_all_candidates.csv': (['atc5'], {'mg_label_per_box', 'base_factor_reference', 'potential_api_kg_per_kg_material_reference', 'kg_material_per_box_ideal_reference', 'net_recovery', 'plant_supply_share', 'approved_for_planning'}),
        'monthly_calibration_mg_per_box.csv': (['atc5', 'month'], {'mg_label_per_box'}),
        'forecast_boxes_dated.csv': (['month'], codes),
        'forecast_converted_reference.csv': (['month', 'atc5'], {'forecast_boxes', 'label_ingredient_kg', 'api_base_kg_reference', 'material_kg_ideal_reference', 'planning_plant_kg'}),
    }
    for name, (key, numeric) in specifications.items():
        def compare(name=name, key=key, numeric=numeric):
            rows, cells = compare_csv(root / 'outputs' / name, root / 'build' / name, key, numeric)
            return f'{rows} rows, {cells} cells agree with delivered snapshot (numeric tolerance or exact text).'
        check(f'Reproduced CSV: {name}', compare)

    def shortlist_workbook():
        wb = openpyxl.load_workbook(root / 'outputs/EthnoHack_Drug_Plant_Shortlist.xlsx', data_only=True)
        try:
            monthly = {(r['month'], r['atc5']): r for r in read_csv(root / 'build/shortlist_monthly.csv')}
            observed = list(wb['Μηνιαία_ATC'].iter_rows(min_row=2, values_only=True))
            require(len(observed) == len(monthly) == 60, 'Shortlist month count mismatch')
            for row in observed:
                key = (row[0].strftime('%Y-%m'), row[1])
                r = monthly[key]
                require(row[2] == r['atc_name'] and row[6] == r['source_sheet'], 'Shortlist label mismatch')
                for idx, field in [(3, 'boxes'), (4, 'reimbursement_base_eur'), (5, 'reimbursed_eur'), (7, 'source_row')]:
                    equal_number(row[idx], r[field], f'Shortlist:{key}:{field}')
            summary = unique(read_csv(root / 'build/shortlist_summary.csv'), 'atc5')
            selected = [r for r in wb['Επιλογή'].iter_rows(values_only=True) if r[0] in codes]
            require(len(selected) == 10, 'Selection size mismatch')
            for row in selected:
                for idx, field in [(3, 'boxes_6m'), (4, 'months_positive'), (5, 'cip_count')]:
                    equal_number(row[idx], summary[row[0]][field], f'Selection:{row[0]}:{field}')
            packs = unique(read_csv(root / 'build/pack_mapping_34_CIP.csv'), 'cip13')
            original = list(wb['Συσκευασίες_CIP'].iter_rows(min_row=2, values_only=True))
            require(len(original) == 34, 'Shortlist CIP count mismatch')
            for row in original:
                r = packs[row[0]]
                require(row[1] == r['atc5'] and row[2] == r['product'], 'Shortlist CIP identity mismatch')
                for i, m in enumerate(MONTHS, 3):
                    equal_number(row[i], r[f'{m}_boxes'], f'Shortlist:CIP:{row[0]}:{m}')
                equal_number(row[9], r['boxes_6m'], 'Shortlist CIP total')
                equal_number(row[10], r['source_row'], 'Shortlist CIP row')
        finally:
            wb.close()
        return '10 selection totals, 60 historical rows (including financial amounts), and 34 CIP rows match the original Excel cached values.'
    check('Original shortlist workbook', shortlist_workbook)

    def conversion_workbook():
        wb = openpyxl.load_workbook(root / 'outputs/EthnoHack_Boxes_to_Plants.xlsx', data_only=True)
        try:
            factors = unique(read_csv(root / 'build/conversion_factors_all_candidates.csv'), 'atc5')
            packs = read_csv(root / 'build/pack_mapping_34_CIP.csv')
            monthly = {(r['atc5'], r['month']): r for r in read_csv(root / 'build/monthly_calibration_mg_per_box.csv')}
            rows = list(wb['Συντελεστές'].iter_rows(min_row=2, values_only=True))
            require(len(rows) == 10, 'Workbook factor row count')
            for row in rows:
                r = factors[row[0]]
                group = [x for x in packs if x['atc5'] == row[0]]
                equal_number(row[2], sum(float(x['boxes_6m']) for x in group), 'Workbook boxes')
                equal_number(row[3], sum(float(x['boxes_6m']) * float(x['mg_label_per_box']) for x in group), 'Workbook ingredient total')
                for idx, key in [(4, 'mg_label_per_box'), (6, 'base_factor_reference'), (9, 'potential_api_kg_per_kg_material_reference'), (10, 'kg_material_per_box_ideal_reference')]:
                    equal_number(row[idx], r[key], f'Workbook factor:{row[0]}:{key}')
                equal_number(row[8], float(r['mg_label_per_box']) * float(r['base_factor_reference']), 'Workbook base mg')
                require(row[11] in (None, 'n.a.'), 'Workbook contains planning factor')
                for i, m in enumerate(MONTHS, 12):
                    equal_number(row[i], monthly[row[0], m]['mg_label_per_box'], 'Workbook monthly calibration')
            converted = {(r['month'], r['atc5']): r for r in read_csv(root / 'build/forecast_converted_reference.csv')}
            rows = list(wb['Πρόβλεψη'].iter_rows(min_row=2, values_only=True))
            require(len(rows) == len(converted) == 60, 'Workbook forecast count')
            for row in rows:
                r = converted[row[0].strftime('%Y-%m'), row[2]]
                require(row[6] == r['label_basis'] and row[8] == r['plant'], 'Forecast label mismatch')
                for idx, key in [(1, 'source_index'), (3, 'forecast_boxes'), (5, 'label_ingredient_kg'), (7, 'api_base_kg_reference'), (9, 'material_kg_ideal_reference')]:
                    equal_number(row[idx], r[key], f'Workbook forecast:{key}')
                equal_number(row[4], factors[row[2]]['mg_label_per_box'], 'Forecast mg per box')
                require(row[10] in (None, 'n.a.'), 'Workbook contains planning demand')
        finally:
            wb.close()
        return '10 factor rows and 60 forecast rows match the original Excel cached values. Formatting and every narrative cell are outside this numeric check.'
    check('Original boxes-to-plants workbook', conversion_workbook)

    def scope_and_gaps():
        factors = read_csv(root / 'build/conversion_factors_all_candidates.csv')
        require(all(r['approved_for_planning'] == '0' and r['net_recovery'] == '' for r in factors), 'Planning status unexpectedly changed')
        absent = {r['atc5'] for r in factors if r['potential_api_kg_per_kg_material_reference'] == ''}
        require(absent == {'D06BB04', 'L01CA04', 'L01CB01'}, 'Missing route factors filled unexpectedly')
        forecasts = read_csv(root / 'build/forecast_converted_reference.csv')
        require({r['atc5'] for r in forecasts} == {'M04AC01', 'C01AA05', 'S01EB01', 'A04AD01', 'S01FA01'}, 'Unexpected forecast scope')
        require(len({r['month'] for r in forecasts}) == 12, 'Forecast horizon mismatch')
        require(min(r['month'] for r in forecasts) == '2026-08' and max(r['month'] for r in forecasts) == '2027-07', 'Forecast date mismatch')
        require(all(r['planning_plant_kg'] == '' for r in forecasts), 'Reference output contains final planning demand')
        return '10 candidates retained; 5 forecast ATCs; 3 plant factors remain missing; all 10 planning approvals remain 0.'
    check('Scope and explicit missing values', scope_and_gaps)

    def english_views():
        expected, scope = make_views(root)
        total = 0
        for name, rows in expected.items():
            actual = read_csv(root / 'outputs/english' / name)
            require(actual == rows, f'English CSV differs from the documented view: {name}')
            total += len(rows)
        require(scope['final_substance_count_reported_by_team'] == 8, 'Team-reported final count changed')
        require('A06AC01' in scope['confirmed_excluded_atc5'], 'Psyllium exclusion missing')
        workbook = openpyxl.load_workbook(root / 'outputs/english/EthnoHack_Data_Reviewed_EN.xlsx', data_only=True)
        try:
            candidates = expected['candidates_en.csv']
            rows = list(workbook['Scope'].iter_rows(min_row=6, max_row=15, values_only=True))
            for row, source in zip(rows, candidates):
                require(row[0] == source['atc5'] and row[1] == source['name_en'], 'English workbook candidate mismatch')
                wanted = {'NOT_USED': 'Not used', 'USED': 'Used', 'PENDING_FINAL_ATC_LIST': 'Final ATC list pending'}[source['final_project_status']]
                require(row[2] == wanted, 'English workbook scope status mismatch')
            rows = list(workbook['Factors'].iter_rows(min_row=6, max_row=15, values_only=True))
            for row, source in zip(rows, expected['conversion_factors_en.csv']):
                require(row[0] == source['atc5'], 'English workbook factor key mismatch')
                for i, key in [(2, 'mg_label_per_box'), (3, 'base_factor_reference'), (4, 'potential_api_kg_per_kg_material_reference'), (5, 'kg_material_per_box_ideal_reference')]:
                    equal_number(row[i], source[key], f'English workbook factor: {key}')
            rows = list(workbook['Forecast'].iter_rows(min_row=6, max_row=65, values_only=True))
            for row, source in zip(rows, expected['forecast_reference_en.csv']):
                require(row[0].strftime('%Y-%m') == source['month'] and row[1] == source['atc5'], 'English workbook forecast key mismatch')
                for i, key in [(3, 'forecast_boxes'), (4, 'label_ingredient_kg'), (5, 'api_base_kg_reference'), (6, 'material_kg_ideal_reference'), (9, 'planning_plant_kg')]:
                    equal_number(row[i], source[key], f'English workbook forecast: {key}')
            rows = list(workbook['Packs'].iter_rows(min_row=6, max_row=39, values_only=True))
            for row, source in zip(rows, expected['pack_mapping_en.csv']):
                require(row[0] == source['cip13'] and row[1] == source['atc5'], 'English workbook CIP mismatch')
                for i, key in [(3, 'units_per_box'), (4, 'mg_per_unit'), (5, 'mg_label_per_box'), (6, 'boxes_6m'), (11, 'source_row')]:
                    equal_number(row[i], source[key], f'English workbook pack: {key}')
                for i, month in enumerate(MONTHS, 12):
                    equal_number(row[i], source[f'{month}_boxes'], 'English workbook monthly pack volume')
        finally:
            workbook.close()
        return f'Five English CSV views ({total} rows) and the four-sheet review workbook agree with their historical sources. Psyllium is marked not used. Final eight-ATC membership remains a separate scope issue.'
    check('English views and scope disclosure', english_views)

    def unit_tests():
        stream = io.StringIO()
        suite = unittest.defaultTestLoader.discover(str(root / 'tests'))
        result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
        (root / 'validation/unit_tests.txt').write_text(stream.getvalue(), encoding='utf-8')
        require(result.wasSuccessful(), stream.getvalue())
        return f'{result.testsRun} test methods passed, including invalid-input subcases, dimensional arithmetic, planning guards, and all-10-candidate synthetic coverage.'
    check('Converter unit tests', unit_tests)

    limitations = [
        'The team reports using eight substances and excludes psyllium. The exact final eight ATCs have not been supplied; one additional excluded candidate is unidentified. Numerical checks cover historical research, not a finalized eight-substance selection.',
        'Curated pack compositions and botanical references were exported from the delivered artifacts. Numerical agreement is not independent verification of their scientific evidence.',
        'No validated net extraction/manufacturing recovery is supplied; no final demand.csv or crop plan is certified.',
        'Atropine sulfate hydration/base-equivalent assumption remains unresolved for the French products.',
        'Podophyllotoxin, vinorelbine and etoposide lack usable complete plant-to-API factors.',
        'Historical Jan–Jun 2026 pack mix is held fixed; future mix and actual plant-derived supply shares are unknown.',
        'Forecast dates come from Paterakis’s message. Training data, backtesting and forecast accuracy are outside this package.',
        'Cultivation region, yield per area, cycles, costs, storage decay and competing uses of shared precursors are not validated.',
    ]
    final_scope = json.loads((root / 'data/curated/final_scope.json').read_text())
    report = dict(generated_at_utc=dt.datetime.now(dt.timezone.utc).isoformat(),
        python=platform.python_version(), openpyxl=openpyxl.__version__,
        scope='Numerical reproducibility and structural consistency only',
        reported_final_substance_count=final_scope['final_substance_count_reported_by_team'],
        final_scope_status=final_scope['selection_status'],
        status='PASS' if all(c['status'] == 'PASS' for c in checks) else 'FAIL',
        relative_tolerance=REL_TOL, absolute_tolerance=ABS_TOL,
        checks=checks, unresolved_limitations=limitations)
    dest = root / 'validation'
    dest.mkdir(exist_ok=True)
    (dest / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    lines = ['# Reproducibility checks — Role A', '', f"UTC: `{report['generated_at_utc']}`", '',
        f"Historical numerical/structural result: **{report['status']}**. This does not validate agricultural or manufacturing parameters.", '',
        f"Final project scope: **{report['reported_final_substance_count']} substances reported; psyllium not used**. Membership status: `{report['final_scope_status']}`. Historical candidate counts below are not the final selection.", '',
        f"Python {report['python']} · openpyxl {report['openpyxl']} · relative tolerance {REL_TOL:g}, absolute tolerance {ABS_TOL:g}.", '',
        '| Check | Result | Finding |', '|---|---|---|']
    for c in checks:
        detail = str(c['details']).replace('|', '/').replace('\n', ' ')
        lines.append(f"| {c['name']} | {c['status']} | {detail} |")
    lines += ['', '## Outstanding evidence and scope', ''] + [f'- {s}' for s in limitations]
    (dest / 'REPORT.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    result = validate(parser.parse_args().root)
    for entry in result['checks']:
        print(f"{entry['status']}: {entry['name']}: {entry['details']}")
    raise SystemExit(0 if result['status'] == 'PASS' else 1)
