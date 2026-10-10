"""Pure Python checks; does not import bpy or launch Blender."""
import ast
import contextlib
import io
import math
import json
from pathlib import Path
from types import SimpleNamespace as NS
import unittest

source=Path(__file__).with_name('pipeline.py').read_text()
names={'geometry_stage','fragile_face','protected_vertices','boundary_group','verify_fixed'}
functions=[n for n in ast.parse(source).body if isinstance(n,ast.FunctionDef) and n.name in names]
ns={'math':math,'json':json,'STAGE_METRICS':[],'LAST_METRICS':{}}
exec(compile(ast.Module(body=functions,type_ignores=[]),'<guards>','exec'),ns)

class Vec(tuple):
 def __sub__(self,other):return Vec(a-b for a,b in zip(self,other))
 @property
 def length(self):return math.sqrt(sum(x*x for x in self))
class Matrix:
 def __matmul__(self,v):return v

def mesh(points):
 return NS(name='floor',matrix_world=Matrix(),data=NS(vertices=[NS(co=Vec(p)) for p in points],
           edges=[NS(vertices=(0,1))],polygons=[None]))

class Guards(unittest.TestCase):
 def test_stage_measures_world_mm_and_detects_growth(self):
  ns['LAST_METRICS'].clear();ns['STAGE_METRICS'].clear()
  o=mesh([(0,0,0),(1,0,0)])
  with contextlib.redirect_stdout(io.StringIO()):
   ns['geometry_stage']('input',[o]);o.data.vertices[1].co=Vec((2,0,0));ns['geometry_stage']('after',[o])
  a,b=ns['STAGE_METRICS'];self.assertEqual(a['width_x_mm'],1000)
  self.assertEqual(b['max_edge_mm'],2000)
  self.assertEqual(b['flags'],['WIDTH_GROWTH','EDGE_GROWTH'])
 def test_nonfinite_and_empty_fail(self):
  for points in [[],[(float('nan'),0,0),(0,0,0)]]:
   with self.assertRaises(ValueError):ns['geometry_stage']('bad',[mesh(points)])
 def test_sliver_is_protected_but_ordinary_face_is_not(self):
  def face(area,length):return NS(calc_area=lambda:area,edges=[NS(calc_length=lambda:length)])
  self.assertTrue(ns['fragile_face'](face(1e-5,1)))
  self.assertTrue(ns['fragile_face'](face(1e-9,.0001)))
  self.assertFalse(ns['fragile_face'](face(.5,1.414)))
 def test_fixed_coordinates_detect_motion_or_deletion(self):
  o=mesh([(0,0,0),(1,0,0)])
  ns['verify_fixed'](o,{(0,0,0),(1,0,0)})
  o.data.vertices[1].co=Vec((1.00001,0,0))
  with self.assertRaises(RuntimeError):ns['verify_fixed'](o,{(1,0,0)})
 def test_group_has_zero_boundary_and_one_interior(self):
  class Vertex:
   def __init__(self,i):self.index=i
  class Vertices(list):
   def ensure_lookup_table(self):pass
   def index_update(self):pass
  vertices=Vertices(Vertex(i) for i in range(3))
  bm=NS(verts=vertices,edges=[NS(is_manifold=False,verts=vertices[:2])],faces=[],from_mesh=lambda m:None,free=lambda:None)
  ns['bmesh']=NS(new=lambda:bm)
  weights={}
  group=NS(add=lambda ids,w,mode:weights.update({i:w for i in ids}))
  o=mesh([(0,0,0),(1,0,0),(.5,.5,0)]);o.vertex_groups=NS(new=lambda **kw:group)
  with contextlib.redirect_stdout(io.StringIO()):g,frozen=ns['boundary_group'](o)
  self.assertEqual(weights,{0:0,1:0,2:1});self.assertEqual(frozen,{(0,0,0),(1,0,0)})

if __name__=='__main__':unittest.main(verbosity=2)
