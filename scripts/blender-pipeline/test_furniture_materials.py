"""Classification collisions, standing panels, finish CLI, and material budget. No bpy."""
import json
import subprocess
import sys
import unittest
from pathlib import Path
from furniture_materials import load_rules, classify, board_axes, project, audit_mesh, linear_color
from extract_tile import defaults
from hexa_texture import studio_hexa_tile

HERE=Path(__file__).parent
ASSETS,TILES=defaults()

class FurnitureTests(unittest.TestCase):
 def test_hexa_studio_scale_and_color(self):
  rules=load_rules()
  for thin in range(3):
   spans=[650,900,1200];spans[thin]=15
   axes=board_axes([[0,0,0],spans]);normal=[0,0,0];normal[thin]=1
   point=[0,0,0];point[axes[1]]=.45;point[axes[2]]=.9
   self.assertEqual(project(point,normal,axes,rules['mapping'],'hexa'),(0,(5,10)))
  image=studio_hexa_tile()
  self.assertEqual(image.size,(288,256))
  # Studio brown-black palette has no green tint (R >= G >= B).
  self.assertTrue(all(r>=g>=b for r,g,b in image.getdata()))
  self.assertIn((41,35,33),set(image.getdata()))
  self.assertEqual(rules['hexa_face'],dict(color='#ffffff',metalness=0,roughness=.7))

 def test_collisions_and_source_materials(self):
  cases=[('rail outer','aluminum','hardware'),('slide','アルミニウム - サテン','hardware'),
         ('rail','クロム','aluminum'),('天板1','SKY Birch plywood - aluminum reference grain','plywood'),
         ('ボディ105','SKY Birch plywood - aluminum reference grain','plywood'),
         ('ボディ82','アルミニウム - サテン','aluminum'),('corner','プラスチック - 光沢(黒)','plastic'),
         ('mattress top','birch','mattress'),('eurobox side','birch','container')]
  for body,material,kind in cases:self.assertEqual(classify(body,material)['kind'],kind)
  self.assertEqual(classify('unknown','Opaque(165,158,150)'),dict(kind='plywood',matched_by='fallback',fallback=True))
  self.assertEqual(classify('unknown','m1',{'m1':{'name':'アルミニウム'}})['kind'],'aluminum')

 def test_appliance_seat_and_container_collisions(self):
  cases=[('Silver cabinet with cut ventilation slots','Silver coating','05 ENGEL MT35F:1','appliance'),
   ('Silver lid - formed recesses','Silver coating','05 ENGEL MT35F:1+03 Lid - hinge:1','appliance'),
   ('ボディ1','鋼 - サテン','05 PFS BOX23L:1','container'),
   ('Box bay post','aluminum','','aluminum'),('box rail','aluminum','','aluminum'),
   ('Seat hinge','steel','','hardware'),('ヘッドレスト支柱','ISeat steel','','hardware'),
   ('背面ステッチ','ISeat seam','','seat_fabric'),('左・下部成形面','ISeat frame','','hardware'),
   ('seat cushion','birch','','seat_fabric'),('Oak top sink cutout','オーク材','','plywood'),
   ('Fridge support394x450','SKY Hexa plywood','','plywood'),
   ('Sink clearance - frame (26)','aluminum','','aluminum'),
   ('Sink cabinet tank support floor','SKY Hexa plywood','','plywood'),
   ('Stainless basin','SNG brushed stainless','11 Dometic SNG4237 sink:1','stainless'),
   ('Chrome mixer base','AC539 polished chrome','11 Dometic SNG4237 sink:1','stainless'),
   ('Rounded tank260','HDPE','','tank'),('aircon cube','','','appliance')]
  for body,mat,path,kind in cases:
   with self.subTest(body=body): self.assertEqual(classify(body,mat,path=path)['kind'],kind)

 def test_four_real_furniture_material_budgets(self):
  for name in ('active-side-cabinet','aluminum-front-kitchen','i-seat','aluminum-bed'):
   data=json.loads((ASSETS/(name+'.mesh.json')).read_text());audit=audit_mesh(data)
   kinds={r['kind'] for r in audit}
   self.assertLessEqual(len(kinds)+('plywood' in kinds),10,name)
   if name=='i-seat':
    for row in audit:
     role=data['bodies'][row['body_index']]['role']
     self.assertEqual(row['kind'],{'fabric':'seat_fabric','seam':'seat_fabric','frame':'hardware','steel':'hardware','cover-detail':'plastic'}[role])
   if name=='aluminum-front-kitchen':
    boxes=[r for r in audit if 'PFS' in r['path'] and r['body'].startswith('ボディ')]
    self.assertEqual(len(boxes),2);self.assertTrue(all(r['kind']=='container' for r in boxes))

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
  self.assertLessEqual(len(kinds)+('plywood' in kinds),10)
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
