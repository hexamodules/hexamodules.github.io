"""Source fidelity regression checks, with no Blender import or launch."""
import ast
import json
from pathlib import Path
from types import SimpleNamespace as NS
import unittest
from bounds_policy import keep_geometry
from furniture_materials import audit_mesh, load_rules, resolved_spec, source_color, board_axes, project
from extract_tile import defaults

HERE=Path(__file__).parent
ASSETS,_=defaults()

class RealityTests(unittest.TestCase):
 def test_small_and_thin_boundaries(self):
  self.assertTrue(keep_geometry(2999,[[0,0,0],[20,20,20]]))
  self.assertFalse(keep_geometry(3000,[[0,0,0],[20,20,20]]))
  for axis in range(3):
   spans=[500,500,500];spans[axis]=19.999
   self.assertTrue(keep_geometry(50000,[[0,0,0],spans]))

 def test_all_real_source_colors_and_overrides(self):
  rules=load_rules();container_count=0;blue_count=0
  for part in ['aluminum-bed','active-side-cabinet','aluminum-front-kitchen','i-seat']:
   data=json.loads((ASSETS/(part+'.mesh.json')).read_text())
   for row in audit_mesh(data):
    spec,source=resolved_spec(row['kind'],row['material'],data['materials'],rules)
    if row['kind']=='aluminum':self.assertEqual(spec,dict(color='#d9d9d9',metalness=.9,roughness=.35))
    elif row['kind']=='container':
     container_count+=1
     self.assertEqual(spec,dict(color='#858585',metalness=0,roughness=.6))
     if part=='aluminum-bed':self.assertRegex(row['body'],r'h235|lid 300x400')
     else:self.assertIn('PFS',row['path']);self.assertTrue(row['body'].startswith('ボディ1'))
    elif row['kind']!='plywood':
     self.assertEqual(spec['color'],source_color(data['materials'][row['material']])[0])
    if 'マット(青)' in row['material']:
     blue_count+=1;self.assertEqual(spec['color'],'#038ffa');self.assertEqual(spec['metalness'],0)
    if 'アルミニウム' in row['material']:self.assertEqual(row['kind'],'aluminum')
    if 'plywood' in row['material']:self.assertEqual(row['kind'],'plywood')
  self.assertEqual(container_count,8);self.assertGreater(blue_count,0)
  with self.assertRaises(ValueError):resolved_spec('plastic','missing',{},rules)

 def test_ao_range_and_white_padding(self):
  import numpy as np
  tree=ast.parse((HERE/'pipeline.py').read_text())
  ns={}
  exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='finish_ao_pixels'],type_ignores=[]),'<AO>', 'exec'),ns)
  class Pixels:
   def __init__(self):self.values=np.array([0,.5,1,0, 1,1,1,1],dtype=np.float32)
   def __len__(self):return len(self.values)
   def foreach_get(self,out):out[:]=self.values
   def foreach_set(self,value):self.values[:]=value
  pixels=Pixels();ns['finish_ao_pixels'](NS(pixels=pixels,update=lambda:None))
  np.testing.assert_allclose(pixels.values,[.92,.96,1,1,1,1,1,1])

 def test_body_origin_shared_by_split_materials(self):
  tree=ast.parse((HERE/'pipeline.py').read_text());ns={'board_axes':board_axes}
  exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='body_projection_frames'],type_ignores=[]),'<projection>', 'exec'),ns)
  class Obj(dict):
   def __init__(self,points):
    super().__init__(source_body_index=7);self.name='panel'
    self.matrix_world=NS(to_scale=lambda:(.001,.001,.001))
    self.data=NS(vertices=[NS(co=p) for p in points])
  parts=[Obj([(100,200,300),(750,215,1200)]),Obj([(100,200,1200),(750,215,300)])]
  axes,origin,bounds=ns['body_projection_frames'](parts)[7]
  self.assertEqual(origin,(.1,.2,.3));self.assertEqual(axes,(1,0,2))
  self.assertEqual(project((0,0,0),(0,1,0),axes,load_rules()['mapping']),(0,(0,0)))

if __name__=='__main__':unittest.main()
