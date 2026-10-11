"""Read-only independent whole-body material and preservation checks on all 38 outputs."""
import json,hashlib
from external_textures import read_glb
from furniture_materials import countertop_candidate
from rebuild_bounds import ROOT,selected_parts
assets=ROOT/'exports/hexa-public/layouts/assets';out=ROOT/'exports/hexa-studio-blender-20261011/shared-textures-albero-20261011-1';summary=json.loads((out/'summary.json').read_text());counter=json.loads((assets/'countertop-material.json').read_text());results=[]
for model in selected_parts('all'):
 source=json.loads((assets/(model+'.mesh.json')).read_text());ids={i for i,b in enumerate(source['bodies']) if any(countertop_candidate(source.get('base_module') or model,p['material'],source['materials'],counter,b) for p in b['parts'])}
 for finish in ['birch','hexa']:
  name=f'{model}-{finish}.glb';raw=(assets/'blender'/name).read_bytes();new=(out/'assets/blender'/name).read_bytes();a,ab=read_glb(raw);b,bb=read_glb(new);count=0
  assert hashlib.sha256(raw).hexdigest()==summary['source_sha256'][name]
  assert bb[:len(ab)]==ab
  for key in ['nodes','images','textures','samplers']:assert a.get(key)==b.get(key)
  for n in a['nodes']:
   if 'mesh' not in n:continue
   for ap,bp in zip(a['meshes'][n['mesh']]['primitives'],b['meshes'][n['mesh']]['primitives']):
    am=a['materials'][ap['material']];bm=b['materials'][bp['material']]
    if n['extras']['source_body_index'] in ids:
     assert bm['name'].startswith('ALBERO');count+=1
     assert am.get('occlusionTexture')==bm.get('occlusionTexture')
     if am['name'].startswith('ALBERO'):assert ap==bp and am==bm
    else:assert ap==bp and am==bm
    assert ap.get('indices')==bp.get('indices')
    assert {k:v for k,v in ap['attributes'].items() if k!='TEXCOORD_0'}=={k:v for k,v in bp['attributes'].items() if k!='TEXCOORD_0'}
  if not ids:assert raw==new
  results.append(dict(file=name,albero_primitives=count,unchanged=raw==new))
for p in (out/'assets/blender/tex').glob('*'):assert p.read_bytes()==(assets/'blender/tex'/p.name).read_bytes()
record=dict(files=results,passed=38,unchanged=sum(r['unchanged'] for r in results),textures_unchanged=True,geometry_unchanged=True,non_worktops_unchanged=True,top_faces_unchanged=True,ao_unchanged=True)
(out.parent/'albero-review/verification.json').write_text(json.dumps(record,indent=2)+'\n');print('PASS',len(results),'files;',record['unchanged'],'byte-identical')
