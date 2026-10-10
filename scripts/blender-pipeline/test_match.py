"""Colour/texture regressions against real studio sources. Never launches Blender."""
import ast
import json
import subprocess
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace as NS
import numpy as np
from PIL import Image
from extract_tile import defaults
from furniture_materials import face_policy, studio_spec, load_rules, project, board_axes
from match_textures import histogram_match, studio_face, srgb_to_linear

HERE=Path(__file__).parent
ASSETS,TILES=defaults()

class MatchTests(unittest.TestCase):
 def test_bed_top_and_hexa_sides_follow_source_material(self):
  data=json.loads((ASSETS/'aluminum-bed.mesh.json').read_text())
  tops=[];black=[]
  for body in data['bodies']:
   for part in body['parts']:
    key=part['material'];policy=face_policy(key,data['materials'],'hexa')
    expected=bool(__import__('re').search('SKY Hexa plywood|Hexa lightweight - charcoal',data['materials'][key]['name']))
    self.assertEqual(policy['finish']=='hexa',expected)
    if body['name'].startswith('天板'):tops.append(policy['finish'])
    if expected:black.append(body['name'])
  self.assertTrue(tops);self.assertEqual(set(tops),{'birch'});self.assertTrue(black)

 def test_graphite_matches_display_not_unadjusted_metal_f0(self):
  data=json.loads((ASSETS/'aluminum-front-kitchen.mesh.json').read_text())
  body=next(b for b in data['bodies'] if b['name']=='Dark gray frameless face')
  key=body['parts'][0]['material']
  self.assertEqual(data['materials'][key]['colors']['metal_f0'],[110,115,122])
  spec,source=studio_spec('appliance',key,data['materials'],load_rules())
  self.assertEqual(spec['color'],'#383c40');self.assertEqual(spec['metalness'],.9)
  self.assertIn('studio graphite',source)

 def test_histogram_recovers_contrast_and_studio_tone_once(self):
  values=np.arange(256,dtype=np.uint8).reshape(16,16)
  ref=Image.fromarray(np.stack([values]*3,axis=2))
  src=Image.fromarray(np.stack([100+values//4]*3,axis=2))
  matched=np.asarray(histogram_match(src,ref)).astype(float)
  self.assertLess(abs(matched.mean()-127.5),1)
  self.assertLess(abs(matched.std()-np.asarray(ref).std()),1)
  np.testing.assert_array_equal(np.asarray(studio_face(ref,False)),np.asarray(ref))
  white=Image.new('RGB',(1,1),'white')
  rgb=np.array([1,1,1])*.81+np.array([.77,.69,.53])*.19
  grain=rgb**1.08;expected=(grain*.92+np.dot(grain,[.2126,.7152,.0722])*.08)*[.4,.4,.46]
  got=srgb_to_linear(np.asarray(studio_face(white))[0,0]/255)
  np.testing.assert_allclose(got,expected,atol=.003)

 def test_cloth_source_and_uv_survive(self):
  im=np.asarray(Image.open(ASSETS/'mattress-colors/light-green.jpg')).astype(float)
  self.assertGreater(im.std(),5)
  data=json.loads((ASSETS/'i-seat.mesh.json').read_text())
  for body in data['bodies']:
   if body['role']=='fabric':
    spec,_=studio_spec('seat_fabric',body['parts'][0]['material'],data['materials'],load_rules(),'fabric')
    self.assertEqual(spec['color'],'#ffffff')
  tree=ast.parse((HERE/'pipeline.py').read_text());ns={'project':project}
  exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='furniture_uv'],type_ignores=[]),'<uv>','exec'),ns)
  class Data:
   def __init__(self):self.uv=[.25,.75,.5,.75,.5,1]
   def foreach_get(self,key,out):out[:]=self.uv
   def foreach_set(self,key,x):self.uv=list(x)
  class Faces(list):
   def foreach_set(self,*args):pass
  uv=Data();mesh=NS(update=lambda:None,loops=[NS(vertex_index=i) for i in range(3)],vertices=[NS(co=(i*.1,0,.1)) for i in range(3)],polygons=Faces([NS(normal=(0,1,0),loop_indices=[0,1,2])]),uv_layers={'UVMap0':NS(data=uv)})
  original=uv.uv[:]
  ns['furniture_uv'](NS(data=mesh),(1,0,2),load_rules(),'birch',False)
  self.assertEqual(uv.uv,original)
  ns['furniture_uv'](NS(data=mesh),(1,0,2),load_rules(),'birch',True,preserve_face=True)
  self.assertEqual(uv.uv,original)

 def test_both_sources_dry_run(self):
  for source in ['studio','tetsuya']:
   for finish in ['birch','hexa']:
    r=subprocess.run([sys.executable,'-B',str(HERE/'run.py'),str(ASSETS/'aluminum-bed.mesh.json'),str(TILES.parent/f'never-match-{source}-{finish}'),'--mode','furniture-draft','--finish',finish,'--face-source',source,'--dry-run','--blender','DO_NOT_START_BLENDER'],capture_output=True,text=True)
    self.assertEqual(r.returncode,0,r.stderr)
    d=json.loads(r.stdout);self.assertFalse(d['blender_started']);cmd=d['command']
    self.assertEqual(cmd[cmd.index('--face-source')+1],source)
    self.assertIn('--fabric-texture',cmd)
    self.assertFalse((TILES.parent/f'never-match-{source}-{finish}').exists())

if __name__=='__main__':unittest.main()
