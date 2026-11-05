"""English presentation views. Preserve historical numerical/source fields.

These are labelled views, not a final-eight filter or a new demand calculation.
"""
import argparse
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read_csv(path):
    with path.open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def write_csv(path, rows):
    with path.open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)


def make_views(root=ROOT):
    root = Path(root)
    labels = {r['atc5']: r for r in read_csv(root / 'data/curated/english_labels.csv')}
    scope = json.loads((root / 'data/curated/final_scope.json').read_text())
    selected = scope['final_selected_atc5']
    excluded = set(scope['confirmed_excluded_atc5'])
    if selected is not None:
        if len(set(selected)) != len(selected) or len(selected) != scope['final_substance_count_reported_by_team']:
            raise ValueError('Final selected ATCs must be unique and match the reported count')
        if not set(selected) <= set(labels) or set(selected) & excluded:
            raise ValueError('Final selection contains unknown or excluded ATCs')

    def status(code):
        if code in excluded:
            return 'NOT_USED'
        if selected is None:
            return 'PENDING_FINAL_ATC_LIST'
        return 'USED' if code in selected else 'NOT_USED'

    candidates = []
    for r in read_csv(root / 'data/curated/candidates.csv'):
        code = r['atc5']; t = labels[code]
        candidates.append(dict(atc5=code, name_en=t['name_en'],
            historical_priority_en=t['historical_priority_en'],
            plant_source=r['plant_source'], route_en=t['route_en'], final_project_status=status(code)))

    views = {'candidates_en.csv': candidates}
    specs = {
        'conversion_factors_en.csv': 'outputs/conversion_factors_all_candidates.csv',
        'plant_reference_inputs_en.csv': 'data/curated/plant_reference_inputs.csv',
        'pack_mapping_en.csv': 'outputs/pack_mapping_34_CIP.csv',
        'forecast_reference_en.csv': 'outputs/forecast_converted_reference.csv',
    }
    for target, source in specs.items():
        rows = []
        for r in read_csv(root / source):
            row = {k: v for k, v in r.items() if k != 'name_el'}
            row['name_en'] = labels[r['atc5']]['name_en']
            row['final_project_status'] = status(r['atc5'])
            rows.append(row)
        views[target] = rows
    return views, scope


def export(root=ROOT, out=None):
    root = Path(root)
    dest = Path(out) if out else root / 'outputs/english'
    dest.mkdir(parents=True, exist_ok=True)
    views, scope = make_views(root)
    for name, rows in views.items():
        write_csv(dest / name, rows)
    build = root / 'build'
    build.mkdir(exist_ok=True)
    payload = dict(scope=scope, views=views)
    (build / 'english_workbook_data.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    return {name: len(rows) for name, rows in views.items()}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root', type=Path, default=ROOT)
    p.add_argument('--out', type=Path)
    args = p.parse_args()
    print(export(args.root, args.out))
