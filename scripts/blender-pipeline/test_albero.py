"""Blender-free worktop selection, dimensions, brightness and command checks."""
import json
import subprocess
import sys
import unittest
from pathlib import Path
import numpy as np
from PIL import Image
from extract_tile import defaults
from furniture_materials import countertop_candidate, countertop_uv, load_rules, bed_top_board
from match_textures import brighten_face

ASSETS,TILES=defaults()
HERE=Path(__file__).parent
DEFINITION=json.loads((ASSETS/'countertop-material.json').read_text())

class AlberoTests(unittest.TestCase):
 def test_real_worktops_and_bed_exclusion(self):
  for model in ['aluminum-front-kitchen','aluminum-side-cabinet','active-side-cabinet','aluminum-bed','i-seat']:
   data=json.loads((ASSETS/(model+'.mesh.json')).read_text())
   matched=[b['name'] for b in data['bodies'] for p in b['parts'] if countertop_candidate(model,p['material'],data['materials'],DEFINITION)]
   if model in DEFINITION['module_ids']:self.assertTrue(matched,model)
   else:self.assertEqual(matched,[])
  self.assertFalse(countertop_candidate('active-side-cabinet','oak koguchi',{},DEFINITION))
  self.assertFalse(countertop_candidate('active-side-cabinet','aluminum top',{},DEFINITION))
  self.assertTrue(bed_top_board('aluminum-bed',{'name':'天板1'},'plywood'))

 def test_uv_both_orientations_and_offset(self):
  tile=DEFINITION['web_surface']['tile_mm'];self.assertEqual(tile,[440,1200])
  for bounds,point in [([[10,20,30],[1210,38,470]],[1210,38,470]),([[10,20,30],[450,38,1230]],[450,38,1230])]:
   self.assertEqual(countertop_uv(bounds[0],bounds,tile),(0,0))
   self.assertEqual(countertop_uv(point,bounds,tile),(1,1))

 def test_brightness_six_percent_cap_and_material(self):
  src=Image.new('RGB',(10,10),(100,100,100));ref=Image.new('RGB',(10,10),(180,180,180))
  out,record=brighten_face(src,ref)
  self.assertEqual(record['gain'],1.06);self.assertEqual(out.getpixel((0,0)),(106,106,106))
  out,record=brighten_face(ref,src);self.assertEqual(record['gain'],1)
  rules=load_rules()
  for spec in [rules['materials']['plywood'],rules['hexa_face']]:
   self.assertEqual(spec['roughness'],.6);self.assertEqual(spec['metalness'],0)

 def test_eight_dry_jobs_tetsuya_and_samples(self):
  r=subprocess.run([sys.executable,'-B',str(HERE/'rebuild_bounds.py'),'--tag','albero-20261010-1','--face-source','tetsuya'],text=True,capture_output=True)
  self.assertEqual(r.returncode,0,r.stderr)
  lines=r.stdout.splitlines();self.assertEqual(len(lines),24)
  self.assertEqual(sum('--samples 128' in l for l in lines),8)
  self.assertEqual(sum('--face-source tetsuya' in l for l in lines),8)

if __name__=='__main__':unittest.main()
