"""Classification collisions, standing panels, finish CLI, and material budget. No bpy."""
import json
import subprocess
import sys
import unittest
from pathlib import Path
from furniture_materials import load_rules, classify, board_axes, project, audit_mesh, linear_color
from extract_tile import defaults

HERE=Path(__file__).parent
ASSETS,TILES=defaults()

class FurnitureTests(unittest.TestCase):
 def test_collisions_and_source_materials(self):
  cases=[('rail outer','aluminum','hardware'),('slide','アルミニウム - サテン','hardware'),
         ('rail','クロム','aluminum'),('天板1','SKY Birch plywood - aluminum reference grain','plywood'),
         ('ボディ105','SKY Birch plywood - aluminum reference grain','plywood'),
         ('ボディ82','アルミニウム - サテン','aluminum'),('corner','プラスチック - 光沢(黒)','plastic'),
         ('mattress top','birch','mattress'),('eurobox side','birch','container')]
  for body,material,kind in cases:self.assertEqual(classify(body,material)['kind'],kind)
  self.assertEqual(classify('unknown','Opaque(165,158,150)'),dict(kind='plywood',matched_by='fallback',fallback=True))
  self.assertEqual(classify('unknown','m1',{'m1':{'name':'アルミニウム'}})['kind'],'aluminum')

 def test_normal_projection_all_board_orientations(self):
  rules=load_rules()
  for thin in range(3):
   spans=[650,900,1200];spans[thin]=15
   axes=board_axes([[0,0,0],spans]);self.assertEqual(axes[0],thin)
   normal=[0,0,0];normal[thin]=1
   point=[0,0,0];point[axes[1]]=2.44;point[axes[2]]=1.22
   index,uv=project(point,normal,axes,rules['mapping'])
   self.assertEqual((index,uv),(0,(1,1)))
   normal[thin]=-1;self.assertEqual(project(point,normal,axes,rules['mapping'])[0],0)
   normal=[0,0,0];normal[axes[2]]=1;point[axes[1]]=.3;point[thin]=.015
   self.assertEqual(project(point,normal,axes,rules['mapping']),(1,(1,1)))
   self.assertEqual(project(point,normal,axes,rules['mapping'],'hexa'),(1,(1,1)))

 def test_real_bed_and_shared_material_budget(self):
  data=json.loads((ASSETS/'aluminum-bed.mesh.json').read_text());audit=audit_mesh(data)
  self.assertEqual(len(audit),sum(len(b['parts']) for b in data['bodies']))
  kinds={r['kind'] for r in audit};self.assertIn('aluminum',kinds);self.assertIn('hardware',kinds)
  self.assertTrue(any(r['fallback'] for r in audit))
  self.assertLessEqual(len(load_rules()['materials'])+1,10)
  for r in audit:
   if 'Birch plywood' in r['material']:self.assertEqual(r['kind'],'plywood')

 def test_finishes_forwarded_and_no_blender(self):
  for finish in ('birch','hexa'):
   r=subprocess.run([sys.executable,'-B',str(HERE/'run.py'),str(ASSETS/'aluminum-bed.mesh.json'),str(TILES.parent/f'never-started-{finish}'),'--mode','furniture-draft','--finish',finish,'--dry-run','--blender','DO_NOT_START_BLENDER'],capture_output=True,text=True)
   self.assertEqual(r.returncode,0,r.stderr);d=json.loads(r.stdout);self.assertFalse(d['blender_started'])
   cmd=d['command'];self.assertEqual(cmd[cmd.index('--finish')+1],finish)
   self.assertEqual('--hexa-source' in cmd,finish=='hexa')
  color=linear_color('#d9d9d9');self.assertAlmostEqual(color[0],.693871761,places=7)

if __name__=='__main__':unittest.main()
