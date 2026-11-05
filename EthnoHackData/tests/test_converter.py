"""Executable edge cases and dimensional examples, added 2026-11-03."""
import csv
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src'))
from convert_forecast import process, load_factors
from reproduce import read_csv


class ConverterTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        self.factor = dict(atc5='T00AA01', mg_label_per_box='20', base_factor_reference='0.5',
            potential_api_kg_per_kg_material_reference='0.01', label_basis='test_salt',
            base_factor_status='TEST_ONLY', plant='test_leaf', material_basis='dry leaf',
            approved_for_planning='0', net_recovery='', plant_supply_share='1',
            planning_parameter_note='')

    def write(self, name, rows):
        path = self.folder / name
        with path.open('w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)
        return path

    def convert(self, boxes='100', factor=None, mode='reference', rows=None, start=None):
        forecast = self.write('forecast.csv', rows or [dict(month='2026-08', T00AA01=boxes)])
        factors = self.write('factors.csv', [factor or self.factor])
        return process(forecast, factors, start, mode)

    def test_dimensional_reference_example(self):
        r = self.convert()[0]
        # 100 boxes * 20 mg = 0.002 kg salt; half is base, 1% content -> 0.1 kg leaf.
        self.assertAlmostEqual(r['label_ingredient_kg'], 0.002)
        self.assertAlmostEqual(r['api_base_kg_reference'], 0.001)
        self.assertAlmostEqual(r['material_kg_ideal_reference'], 0.1)
        self.assertIsNone(r['planning_plant_kg'])

    def test_zero_forecast_is_valid(self):
        self.assertEqual(self.convert('0')[0]['material_kg_ideal_reference'], 0)

    def test_missing_material_factor_stays_missing(self):
        p = dict(self.factor, potential_api_kg_per_kg_material_reference='')
        self.assertIsNone(self.convert(factor=p)[0]['material_kg_ideal_reference'])

    def test_invalid_demands_rejected(self):
        for value in ['-1', 'nan', 'inf', '', 'text']:
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.convert(value)

    def test_unknown_atc_rejected(self):
        with self.assertRaises(ValueError):
            self.convert(rows=[dict(month='2026-08', UNKNOWN='1')])

    def test_index_needs_explicit_start_date(self):
        with self.assertRaises(ValueError):
            self.convert(rows=[{'': '175', 'T00AA01': '100'}])
        r = self.convert(rows=[{'': '175', 'T00AA01': '100'}], start='2026-08')[0]
        self.assertEqual((r['month'], r['source_index']), ('2026-08', '175'))

    def test_duplicate_month_rejected(self):
        with self.assertRaises(ValueError):
            self.convert(rows=[dict(month='2026-08', T00AA01='1')] * 2)

    def test_duplicate_atc_factors_rejected(self):
        path = self.write('dup.csv', [self.factor, self.factor])
        with self.assertRaises(ValueError):
            load_factors(path)

    def test_duplicate_csv_columns_rejected(self):
        path = self.folder / 'duplicate.csv'
        path.write_text('month,T00AA01,T00AA01\n2026-08,1,2\n')
        factors = self.write('factors.csv', [self.factor])
        with self.assertRaises(ValueError):
            process(path, factors)

    def test_unapproved_planning_rejected(self):
        with self.assertRaises(ValueError):
            self.convert(mode='planning')

    def test_planning_requires_recovery_and_evidence(self):
        p = dict(self.factor, approved_for_planning='1')
        with self.assertRaises(ValueError):
            self.convert(factor=p, mode='planning')
        p['net_recovery'] = '0.5'
        with self.assertRaises(ValueError):
            self.convert(factor=p, mode='planning')

    def test_planning_recovery_and_share_dimensions(self):
        # Purely artificial parameters exercise code; not an agricultural estimate.
        p = dict(self.factor, approved_for_planning='1', net_recovery='0.5',
                 plant_supply_share='0.25', planning_parameter_note='Synthetic unit test')
        self.assertAlmostEqual(self.convert(factor=p, mode='planning')[0]['planning_plant_kg'], 0.05)

    def test_invalid_recovery_and_share_rejected(self):
        for key, values in [('net_recovery', ['0', '-0.1', '1.1', 'nan']),
                            ('plant_supply_share', ['-0.1', '1.1', 'nan'])]:
            for value in values:
                p = dict(self.factor, approved_for_planning='1', net_recovery='0.5',
                         plant_supply_share='1', planning_parameter_note='Synthetic unit test')
                p[key] = value
                with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                    self.convert(factor=p, mode='planning')

    def test_all_ten_candidates_and_missing_extensions(self):
        factors = ROOT / 'outputs/conversion_factors_all_candidates.csv'
        codes = [r['atc5'] for r in read_csv(factors)]
        # Unit inputs of one box are synthetic; this is not an additional forecast.
        path = self.write('all.csv', [dict(month='2026-08', **{c: '1' for c in codes})])
        result = process(path, factors)
        self.assertEqual(len(result), 10)
        missing = {r['atc5'] for r in result if r['material_kg_ideal_reference'] is None}
        self.assertEqual(missing, {'D06BB04', 'L01CA04', 'L01CB01'})
        with self.assertRaises(ValueError):
            process(path, factors, mode='planning')


if __name__ == '__main__':
    unittest.main()
