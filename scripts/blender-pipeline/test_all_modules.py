"""Real source and generated-report regression checks, without starting Blender."""
import json
import shlex
import subprocess
import sys
import unittest
from pathlib import Path
from extract_tile import defaults
from furniture_materials import audit_mesh, classify, source_color, studio_spec, load_rules, countertop_candidate
from rebuild_bounds import PARTS, selected_parts
from check_material_report import validate

ASSETS, _ = defaults()
HERE = Path(__file__).parent

class AllModulesTests(unittest.TestCase):
    def test_explicit_names_before_materials(self):
        for name in ['h235', 'h235 (1)', 'lid 300x400', 'PFS', 'eurobox', 'box 23', 'euro']:
            for material in ['鋼 - サテン', 'aluminum', 'plastic', 'birch']:
                self.assertEqual(classify(name, material)['kind'], 'container')
        for name, material, kind in [('Eurobox floor400x330','SKY Hexa plywood','plywood'), ('Eurobox left rail backing','アルミニウム','aluminum')]:
            self.assertEqual(classify(name,material)['kind'],kind)
        self.assertEqual(classify('support floor', 'birch', path='PFS BOX23L')['kind'], 'plywood')

    def test_three_real_container_reports_reject_wrong_and_missing(self):
        for model in ['aluminum-bed', 'active-side-cabinet', 'aluminum-front-kitchen']:
            data = json.loads((ASSETS / (model + '.mesh.json')).read_text())
            containers = [r for r in audit_mesh(data) if r['kind'] == 'container']
            self.assertTrue(containers, model)
            report = {'decisions': [dict(source_body_index=r['body_index'], source_part_index=r['part'], kind=r['kind'], spec={'color':'#969594'}) for r in containers]}
            self.assertEqual(validate(data, report), len(containers))
            report['decisions'][0]['kind'] = 'hardware'
            with self.assertRaises(ValueError): validate(data, report)
            report['decisions'][0]['kind'] = 'container'
            report['decisions'][0]['spec']['color'] = '#555555'
            with self.assertRaises(ValueError): validate(data, report)
            report['decisions'].pop(0)
            with self.assertRaises(ValueError): validate(data, report)

    def test_all_sources_and_stock_seat_colors(self):
        definition = json.loads((ASSETS / 'countertop-material.json').read_text())
        self.assertEqual(len(PARTS), 13)
        self.assertEqual(len(selected_parts('all')), 15)
        for model in selected_parts('all'):
            data = json.loads((ASSETS / (model + '.mesh.json')).read_text())
            albero = 0
            for row in audit_mesh(data):
                spec, _ = studio_spec(row['kind'], row['material'], data['materials'], load_rules(), model_key=model)
                if model == 'seat':
                    self.assertEqual(spec['color'], source_color(data['materials'][row['material']])[0])
                albero += countertop_candidate(model, row['material'], data['materials'], definition)
            self.assertEqual(bool(albero), model in definition['module_ids'], model)

    def test_all_commands_and_accessories(self):
        r = subprocess.run([sys.executable, '-B', str(HERE / 'rebuild_bounds.py'), '--parts', 'all', '--face-source', 'tetsuya', '--max-bytes', '4000000', '--tag', 'all-test-dry'], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        commands = [shlex.split(line) for line in r.stdout.splitlines()]
        self.assertEqual(len(commands), 120) # 15 models x 2 finishes x 4 stages
        for offset in range(0, len(commands), 4):
            run, report, compress, bounds = commands[offset:offset+4]
            self.assertTrue(run[2].endswith('run.py'))
            self.assertEqual(run[run.index('--face-source')+1], 'tetsuya')
            self.assertTrue(report[2].endswith('check_material_report.py'))
            self.assertEqual(compress[compress.index('--max-bytes')+1], '4000000')
            self.assertIn('--require-pass', bounds)
        self.assertEqual(selected_parts('two-side-bed'), ['two-side-bed','centre-mattresses'])
        self.assertEqual(selected_parts('lounge-bed,lounge-fillers'), ['lounge-bed','lounge-fillers'])
        with self.assertRaises(ValueError): selected_parts('vehicle')

if __name__ == '__main__': unittest.main()
