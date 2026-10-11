"""Bed top overrides and cross-furniture regressions; no Blender needed."""
import json
import shlex
import subprocess
import sys
import unittest
from pathlib import Path
from furniture_materials import face_policy, classify, bed_top_board, audit_mesh
from rebuild_bounds import selected_parts

ROOT=Path(__file__).resolve().parents[2]
if ROOT.name=='hexa-public': ROOT=ROOT.parent.parent
ASSETS=ROOT/'exports/hexa-public/layouts/assets'

class BedTopTests(unittest.TestCase):
    def test_wood_tops_and_every_other_source_part(self):
        # Names are verified below by count and physical elevation; all other
        # parts and all Birch finishes must preserve their previous policy.
        counts = {'slide-bed': 2, 'lounge-slide-bed': 6, 'lounge-bed': 0,
                  'two-side-bed': 0, 'lounge-fillers': 2}
        for model in selected_parts('all'):
            data = json.loads((ASSETS/(model+'.mesh.json')).read_text())
            tops = set()
            for row in audit_mesh(data):
                body = data['bodies'][row['body_index']]
                args = (row['material'], data['materials'])
                kind = row['kind']
                top = bed_top_board(model, body, kind)
                if model in counts and top:
                    tops.add(row['body_index'])
                    self.assertGreaterEqual(body['bounds'][0][1], 250)
                    self.assertEqual(face_policy(*args, 'hexa', model, body, kind)['finish'], 'birch')
                elif kind == 'plywood' and not top:
                    self.assertEqual(face_policy(*args, 'hexa', model, body, kind)['finish'], 'hexa')
                elif model != 'aluminum-bed':
                    self.assertEqual(face_policy(*args, 'hexa', model, body, kind), face_policy(*args, 'hexa'))
                self.assertEqual(face_policy(*args, 'birch', model, body, kind), face_policy(*args, 'birch'))
            if model in counts:
                self.assertEqual(len(tops), counts[model], model)

    def test_wood_vertical_panels_floors_and_fabric_excluded(self):
        data = json.loads((ASSETS/'lounge-slide-bed.mesh.json').read_text())
        for name in ['Wall side with top tongues', 'Rear opening top header',
                     'Front storage floor', 'Rear drawer fascia with finger pull']:
            body = next(b for b in data['bodies'] if b['name'] == name)
            self.assertFalse(bed_top_board('lounge-slide-bed', body, 'plywood'))
        body = {'name':'ボディ69', 'bounds':[[0,370,0],[83,385,445]]}
        self.assertFalse(bed_top_board('two-side-bed', body, 'plywood'))
        for kind in ['mattress', 'hardware', 'aluminum']:
            self.assertFalse(bed_top_board('two-side-bed', body, kind))
        body['bounds'] = [[0,0,0],[15,385,445]]
        self.assertFalse(bed_top_board('two-side-bed', body, 'plywood'))

    def test_exact_five_hexa_rebuild_jobs_without_blender(self):
        parts = 'slide-bed,lounge-slide-bed,lounge-bed,two-side-bed,lounge-fillers'
        result = subprocess.run([sys.executable, '-B', str(Path(__file__).with_name('rebuild_bounds.py')),
            '--parts', parts, '--no-accessories', '--finishes', 'hexa',
            '--face-source', 'tetsuya', '--tag', 'bedtop-test-dry'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        commands = [shlex.split(line) for line in result.stdout.splitlines()]
        self.assertEqual(len(commands), 20)
        for part, offset in zip(parts.split(','), range(0,20,4)):
            run, report, compress, bounds = commands[offset:offset+4]
            self.assertEqual(Path(run[3]).name, part+'.mesh.json')
            self.assertEqual(run[run.index('--finish')+1], 'hexa')
            self.assertEqual(run[run.index('--face-source')+1], 'tetsuya')
            self.assertIn('--require-pass', bounds)
        self.assertNotIn('centre-mattresses', result.stdout)
        self.assertEqual(selected_parts('two-side-bed'), ['two-side-bed','centre-mattresses'])

    def test_real_sources_and_relabelled_tops(self):
        counts={}
        for model in ['aluminum-bed','active-side-cabinet','aluminum-front-kitchen','i-seat']:
            data=json.loads((ASSETS/(model+'.mesh.json')).read_text())
            tops=[]
            for body in data['bodies']:
                for part in body['parts']:
                    key=part['material']
                    kind=classify(body['name'],key,data['materials'],path=body.get('path',''),role=body.get('role',''))['kind']
                    for finish in ['birch','hexa']:
                        old=face_policy(key,data['materials'],finish)
                        new=face_policy(key,data['materials'],finish,model,body,kind)
                        if finish == 'hexa' and kind == 'plywood' and not bed_top_board(model,body,kind):
                            self.assertEqual(new['finish'],'hexa')
                        else:
                            self.assertEqual(old,new)
                    if bed_top_board(model,body,kind):
                        tops.append(body['name'])
                        changed={key:{'name':'SKY Hexa plywood - charcoal satin'}}
                        self.assertEqual(face_policy(key,changed,'hexa',model,body,kind)['finish'],'birch')
                    elif kind=='plywood':
                        changed={key:{'name':'SKY Hexa plywood - charcoal satin'}}
                        self.assertEqual(face_policy(key,changed,'hexa',model,body,kind)['finish'],'hexa')
            counts[model]=tops
        self.assertEqual(len(counts['aluminum-bed']),5)
        self.assertIn('ボディ105',counts['aluminum-bed'])
        self.assertTrue(all(not v for k,v in counts.items() if k!='aluminum-bed'))

    def test_aliases_geometry_and_metal_guard(self):
        for name in ['天板1','すのこ','top','Top panel','slat','bed_slat_2']:
            self.assertTrue(bed_top_board('aluminum-bed',{'name':name},'plywood'))
            self.assertFalse(bed_top_board('aluminum-bed',{'name':name},'aluminum'))
        self.assertTrue(bed_top_board('aluminum-bed',{'bounds':[[0,0,0],[600,15,900]]},'plywood'))
        self.assertFalse(bed_top_board('aluminum-bed',{'bounds':[[0,0,0],[15,300,900]]},'plywood'))
        self.assertFalse(bed_top_board('aluminum-bed',{'bounds':[[0,0,0],[600,300,15]]},'plywood'))

if __name__=='__main__':unittest.main()
