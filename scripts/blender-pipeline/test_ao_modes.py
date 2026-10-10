"""AO control-flow checks using doubles only; never imports or starts Blender."""
import argparse
import ast
from contextlib import contextmanager, redirect_stdout
import io
import json
import math
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace as NS
import unittest

HERE=Path(__file__).parent
names={'args','stage','ao_settings','plain_material','plain_bake_materials','bake_ao'}
fns=[n for n in ast.parse((HERE/'pipeline.py').read_text()).body if isinstance(n,ast.FunctionDef) and n.name in names]
ns=dict(contextmanager=contextmanager,json=json,argparse=argparse,sys=sys,math=math)
exec(compile(ast.Module(body=fns,type_ignores=[]),'<AO functions>','exec'),ns)

class Nodes(list):
 def new(self,kind):
  n=NS(kind=kind,inputs={'Color':NS(default_value=None),'Surface':None},outputs={'BSDF':None},select=True)
  self.append(n);return n
class Materials(list):
 def new(self,name):
  m=NS(name=name,node_tree=NS(nodes=Nodes(),links=NS(new=lambda *args:None)))
  self.append(m);return m

class AOModes(unittest.TestCase):
 def setUp(self):
  self.original=[object(),object(),object()]
  self.target=NS(name='floor',material_slots=[NS(material=x) for x in self.original[:2]])
  self.other=NS(name='other',material_slots=[NS(material=self.original[2])])
  self.calls=[];self.images=[NS(name='wood',pack=lambda:self.calls.append('wood pack')),NS(name='AO',pack=lambda:self.calls.append('AO pack'))]
  self.scene=NS(objects=[self.target,self.other],render=NS(engine=None,bake=NS(margin=8)),cycles=NS())
  self.prefs=NS(compute_device_type='METAL')
  ns['bpy']=NS(data=NS(materials=Materials(),images=self.images),context=NS(scene=self.scene,view_layer=NS(update=lambda:None),preferences=NS(addons={'cycles':NS(preferences=self.prefs)})),ops=NS(object=NS(bake=lambda **kw:self.calls.append(kw))))
 def settings(self,mode,skip=False):return ns['ao_settings'](NS(ao_mode=mode,skip_ao=skip,samples=16))
 def run_bake(self,mode):
  with redirect_stdout(io.StringIO()) as log:ns['bake_ao'](self.target,self.images[1],self.settings(mode))
  return log.getvalue()
 def test_modes_and_skip_precedence(self):
  for mode in ['plain','packed','lowres','gpu-off','none']:
   self.assertEqual(self.settings(mode,True)['mode'],'none')
  self.assertEqual(self.settings('lowres'),dict(mode='lowres',size=512,samples=4,margin=2))
  self.assertEqual(self.settings('plain')['size'],1024)
 def test_plain_restores_all_slots_on_success_and_exception(self):
  def bake(**kw):
   nodes=self.target.material_slots[0].material.node_tree.nodes
   self.assertIs(self.target.material_slots[0].material,self.target.material_slots[1].material)
   self.assertEqual([n.kind for n in nodes],['ShaderNodeBsdfDiffuse','ShaderNodeOutputMaterial','ShaderNodeTexImage'])
   self.assertEqual(nodes[0].inputs['Color'].default_value,(1,1,1,1))
   self.assertIs(nodes.active.image,self.images[1])
   self.assertTrue(nodes.active.select)
   self.assertEqual([n.kind for n in self.other.material_slots[0].material.node_tree.nodes],['ShaderNodeBsdfDiffuse','ShaderNodeOutputMaterial'])
  ns['bpy'].ops.object.bake=bake
  self.assertIn('materials restore floor END',self.run_bake('plain'))
  def fail(**kw):bake(**kw);raise RuntimeError('bake failed')
  ns['bpy'].ops.object.bake=fail
  with self.assertRaisesRegex(RuntimeError,'bake failed'):self.run_bake('plain')
  self.assertEqual([s.material for o in self.scene.objects for s in o.material_slots],self.original)
  self.assertEqual(ns['bpy'].data.materials,[])
 def test_packed_packs_every_image_before_bake(self):
  self.run_bake('packed');self.assertEqual(self.calls[:2],['wood pack','AO pack'])
  self.assertEqual(self.calls[2],dict(type='AO',margin=8,use_clear=True))
 def test_lowres_and_gpu_configuration(self):
  self.run_bake('lowres');self.assertEqual(self.scene.cycles.samples,4);self.assertEqual(self.scene.render.bake.margin,2)
  self.run_bake('gpu-off');self.assertEqual(self.prefs.compute_device_type,'NONE')
  self.assertEqual(self.scene.cycles.device,'CPU');self.assertFalse(self.scene.cycles.use_denoising)
  self.assertEqual(self.scene.cycles.tile_size,64)
 def test_worker_parser_default_all_modes_skip_and_invalid(self):
  old=sys.argv
  try:
   for mode in ['plain','packed','lowres','gpu-off','none']:
    sys.argv=['pipeline.py','--','--input','in','--output','out','--texture','wood','--ao-mode',mode]
    self.assertEqual(ns['args']().ao_mode,mode)
   sys.argv=['pipeline.py','--','--input','in','--output','out','--texture','wood']
   self.assertEqual(ns['args']().ao_mode,'plain')
   sys.argv+=['--skip-ao'];self.assertEqual(ns['ao_settings'](ns['args']())['mode'],'none')
  finally:sys.argv=old
 def test_runner_dry_run_filled_all_modes(self):
  root=HERE.resolve().parents[1]
  if root.name=='hexa-public':root=root.parent.parent
  source=root/'exports/hexa-public/layouts/assets/interior-floor-oak-filled.mesh.json'
  for mode in ['plain','packed','lowres','gpu-off','none']:
   cmd=[sys.executable,'-B',str(HERE/'run.py'),str(source),str(root/f'exports/hexa-studio-blender-20261010/out-ao-{mode}-20261010'),'--finish','oak','--ao-mode',mode,'--dry-run','--blender','DO_NOT_START_BLENDER']
   result=subprocess.run(cmd,capture_output=True,text=True)
   self.assertEqual(result.returncode,0,result.stderr)
   record=json.loads(result.stdout);self.assertFalse(record['blender_started'])
   self.assertEqual(record['command'][record['command'].index('--ao-mode')+1],mode)
   self.assertEqual(record['tile_mm'],[300,900])

if __name__=='__main__':unittest.main(verbosity=2)
