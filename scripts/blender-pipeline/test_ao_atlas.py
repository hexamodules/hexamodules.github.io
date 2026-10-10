"""No Blender startup: atlas orchestration, GLB contract and CLI checks."""
import ast
import argparse
from contextlib import contextmanager, redirect_stdout
import io
import json
import math
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
from types import SimpleNamespace as NS
import unittest
from unittest.mock import patch
import compress
from extract_tile import defaults

HERE=Path(__file__).parent
ASSETS,TILES=defaults()
tree=ast.parse((HERE/'pipeline.py').read_text())
ns=dict(contextmanager=contextmanager,json=json,math=math,Path=Path)
names={'stage','ao_settings','furniture_atlas'}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names],type_ignores=[]),'<atlas>','exec'),ns)

class AtlasTests(unittest.TestCase):
 def test_settings_and_runner_forwarding(self):
  with tempfile.TemporaryDirectory(dir=TILES.parent) as temp:
   for size in (2048,4096):
    for mode in ('plain','packed','lowres','gpu-off','none'):
     a=NS(mode='furniture-draft',ao_mode=mode,skip_ao=False,samples=16,ao_atlas_size=size)
     self.assertEqual(ns['ao_settings'](a)['size'],size)
     a.mode='floor'
     self.assertEqual(ns['ao_settings'](a)['size'],512 if mode=='lowres' else 1024)
    cmd=[sys.executable,'-B',str(HERE/'run.py'),str(ASSETS/'aluminum-bed.mesh.json'),str(Path(temp)/'out'),'--mode','furniture-draft','--ao-atlas-size',str(size),'--dry-run','--blender','DO_NOT_START_BLENDER']
    result=subprocess.run(cmd,capture_output=True,text=True)
    self.assertEqual(result.returncode,0,result.stderr)
    record=json.loads(result.stdout);self.assertFalse(record['blender_started'])
    self.assertEqual(record['command'][record['command'].index('--ao-atlas-size')+1],str(size))

 def test_129_bodies_join_once_unwrap_once_bake_once_and_restore_uv0(self):
  calls=[]
  class Layers(dict):
   def new(self,name):self[name]=NS(name=name,active_render=False);return self[name]
  layers=Layers(UVMap0=NS(name='UVMap0',active_render=True,data=[(.12,.34)]))
  objects=[NS(name=f'body{i}',data=NS(uv_layers=layers),select_set=lambda v:None) for i in range(129)]
  active=NS(active=None)
  def join():calls.append('join')
  bpy=NS(context=NS(view_layer=NS(objects=active)),ops=NS(object=NS(select_all=lambda **k:None,join=join,mode_set=lambda **k:calls.append(k['mode'])),mesh=NS(select_all=lambda **k:None),uv=NS(smart_project=lambda **k:calls.append(('uv',k)))))
  ns.update(tag_atlas_parts=lambda objs:objs,restore_atlas_parts=lambda obj,ids:ids,bpy=bpy,geometry_stage=lambda *a:None,bake_ao=lambda *a:calls.append('bake'),finish_ao_pixels=lambda ao:calls.append('finish AO'))
  with tempfile.TemporaryDirectory(dir=TILES.parent) as temp:
   def save():Path(ao.filepath_raw).write_bytes(b'\x89PNG\r\n\x1a\n'+struct.pack('>I4sIIBB',13,b'IHDR',2048,2048,8,2)+b'\0'*3)
   ao=NS(save=save,pack=lambda:calls.append('pack'))
   with redirect_stdout(io.StringIO()):result=ns['furniture_atlas'](objects,ao,dict(size=2048,margin=8,mode='plain'),Path(temp))
   self.assertEqual(len(result),129);self.assertEqual(calls.count('join'),1);self.assertEqual(calls.count('bake'),1)
   uv=[c for c in calls if isinstance(c,tuple)];self.assertEqual(len(uv),1)
   self.assertEqual(uv[0][1]['margin_method'],'FRACTION')
   self.assertIs(layers.active,layers['UVMap0']);self.assertEqual(layers['UVMap0'].data,[(.12,.34)])
   calls.clear()
   with redirect_stdout(io.StringIO()):ns['furniture_atlas'](objects,None,dict(size=2048,margin=8,mode='none'),Path(temp))
   self.assertNotIn('bake',calls);self.assertNotIn('pack',calls)

 def test_glb_rejects_per_body_images_wrong_uv_and_missing_ao(self):
  doc={'meshes':[{'primitives':[{'material':i,'attributes':{'TEXCOORD_1':0}} for i in range(2)]}],
       'materials':[{'occlusionTexture':{'index':i,'texCoord':1}} for i in range(2)],
       'textures':[{'source':0},{'source':0}],'images':[{'mimeType':'image/png'},{'mimeType':'image/png'}]}
  with tempfile.TemporaryDirectory(dir=TILES.parent) as temp:
   p=Path(temp)/'fixture.glb'
   def write():
    payload=json.dumps(doc).encode();payload+=b' '*((-len(payload))%4)
    p.write_bytes(struct.pack('<4sIII4s',b'glTF',2,20+len(payload),len(payload),b'JSON')+payload)
   write();self.assertEqual(compress.atlas_info(p)['ao_images'],1)
   doc['textures'][1]['source']=1;write()
   with self.assertRaisesRegex(ValueError,'exactly one'):compress.atlas_info(p)
   doc['textures'][1]['source']=0;doc['materials'][1]['occlusionTexture']['texCoord']=0;write()
   with self.assertRaisesRegex(ValueError,'UV1'):compress.atlas_info(p)
   doc['materials'][1]={};write()
   with self.assertRaisesRegex(ValueError,'no AO'):compress.atlas_info(p)

 def test_compression_quality_floor_unchanged_furniture_80_and_default_target(self):
  with tempfile.TemporaryDirectory(dir=TILES.parent) as temp:
   for mode,quality in [('floor','82'),('furniture-draft','80')]:
    argv=['compress.py','input.glb',str(Path(temp)/f'{mode}.glb'),'--mode',mode]
    with patch.object(sys,'argv',argv),patch.object(compress.subprocess,'run') as run,patch.object(compress,'atlas_info',return_value=dict(ao_images=1,ao_mime_type='image/webp',bytes=2_500_001)):
     if mode=='floor':compress.main()
     else:
      with redirect_stdout(io.StringIO()):compress.main()
      report=json.loads(Path(argv[2]).with_suffix('.compression.json').read_text())
      self.assertEqual(report['target_bytes'],4_000_000)
      self.assertTrue(report['target_met'])
     self.assertEqual(run.call_args_list[0].args[0][-1],quality)
     self.assertEqual(run.call_args_list[1].args[0][-6:],['--quantize-position','16','--quantize-normal','12','--quantize-texcoord','14'])

if __name__=='__main__':unittest.main()
