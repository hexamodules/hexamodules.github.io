"""Lossless container conversion: custom mm/Y-up mesh to standard metre/Y-up GLB.
No decimation or baking. This is an INPUT reference, not the Blender result.
"""
import argparse,json,struct
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('input');p.add_argument('output');a=p.parse_args();source=Path(a.input);d=json.loads(source.read_text());binary=(source.parent/d['binary']).read_bytes()
g={'asset':{'version':'2.0','generator':'Hexa custom mesh input converter'},'scene':0,'scenes':[{'nodes':[]}],'nodes':[],'meshes':[],'materials':[],'buffers':[{'byteLength':len(binary)}],'bufferViews':[],'accessors':[]}
materials={}
for name,m in d['materials'].items():
 materials[name]=len(g['materials']);rgb=m.get('colors',{}).get('opaque_albedo',[255,255,255]);g['materials'].append({'name':name,'doubleSided':True,'pbrMetallicRoughness':{'baseColorFactor':[*(v/255 for v in rgb),1],'roughnessFactor':.94,'metallicFactor':0}})
def acc(part,name):
 offset,count=part[name];width={'position':3,'normal':3,'uv':2,'index':1}[name];vi=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':count*4,'target':34963 if name=='index' else 34962})
 value={'bufferView':vi,'componentType':5125 if name=='index' else 5126,'count':count//width,'type':{1:'SCALAR',2:'VEC2',3:'VEC3'}[width]}
 if name=='position':
  v=struct.unpack_from('<'+'f'*count,binary,offset);value['min']=[min(v[i::3]) for i in range(3)];value['max']=[max(v[i::3]) for i in range(3)]
 idx=len(g['accessors']);g['accessors'].append(value);return idx
for b in d['bodies']:
 primitives=[{'attributes':{'POSITION':acc(part,'position'),'NORMAL':acc(part,'normal'),'TEXCOORD_0':acc(part,'uv')},'indices':acc(part,'index'),'material':materials[part['material']]} for part in b['parts']]
 idx=len(g['meshes']);g['meshes'].append({'name':b['name'],'primitives':primitives});g['scenes'][0]['nodes'].append(idx);g['nodes'].append({'name':b['name'],'mesh':idx,'scale':[.001]*3,'extras':{'source_role':b.get('role'),'bounds_mm':b['bounds']}})
js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4);binary+=b'\0'*((-len(binary))%4)
target=Path(a.output)
if target.exists():raise SystemExit('Output exists; choose a new name')
target.write_bytes(struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary)
print(target,len(binary),d['triangles'])
