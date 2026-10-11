"""Verify exact lounge-top face scope and preservation of the preceding apron fix."""
import hashlib,json,copy
from rebuild_bounds import ROOT
from external_textures import read_glb
base=ROOT/'exports/hexa-studio-blender-20261011'
before=base/'shared-textures-hexafix-20261011-3/assets/blender'
after=base/'shared-textures-hexafix-20261011-4/assets/blender'
review=base/'lounge-top-review'
rows=[];changes=[]
for p in sorted(before.glob('*.glb')):
 old=p.read_bytes();new=(after/p.name).read_bytes()
 rows.append(dict(file=p.name,byte_identical=old==new,before_sha256=hashlib.sha256(old).hexdigest(),after_sha256=hashlib.sha256(new).hexdigest(),bytes=len(new)))
 if p.name!='lounge-bed-hexa.glb':assert old==new;continue
 a,ab=read_glb(old);b,bb=read_glb(new)
 assert bb[:len(ab)]==ab
 for key in ['nodes','materials','images','textures','samplers','scenes','extensionsUsed','extensionsRequired']:
  assert a.get(key)==b.get(key),key
 for key in ['accessors','bufferViews']:assert b[key][:len(a[key])]==a[key]
 for n in a['nodes']:
  if 'mesh' not in n:continue
  for i,(x,y) in enumerate(zip(a['meshes'][n['mesh']]['primitives'],b['meshes'][n['mesh']]['primitives'])):
   if x==y:continue
   assert n['extras']['source_body_name'] in {'天板',*(f'ボディ{i} (1)' for i in range(44,50))}
   before_mat=a['materials'][x['material']];after_mat=b['materials'][y['material']]
   assert before_mat['name'].startswith('plywood-face:') and 'hexa-studio.png' in after_mat['name']
   assert before_mat.get('occlusionTexture')==after_mat.get('occlusionTexture'),'AO changed'
   z=copy.deepcopy(y);z['material']=x['material'];z['attributes']['TEXCOORD_0']=x['attributes']['TEXCOORD_0'];assert z==x
   changes.append(dict(node=n['name'],body=n['extras']['source_body_name'],primitive=i,bounds_mm=json.loads(n['extras']['source_bounds_mm']),before=before_mat['name'],after=after_mat['name']))
 for m in b['meshes']:
  for p in m['primitives']:
   name=b['materials'][p['material']]['name']
   if name.startswith('plywood-face:'):assert 'hexa-studio.png' in name,name
assert len(rows)==38 and sum(not r['byte_identical'] for r in rows)==1
assert len(changes)==7
textures=[]
for p in (before/'tex').glob('*'):
 assert p.read_bytes()==(after/'tex'/p.name).read_bytes();textures.append(p.name)
result=dict(passed=True,files=rows,changes=changes,unchanged_textures=textures,geometry_normals_ao_edges_unchanged=True,apron_fix_preserved=True)
(review/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(review/'全38本の差分一覧.md').write_text('# 直前版との照合\n\n|ファイル|結果|\n|---|---|\n'+''.join(f"|{r['file']}|{'全バイト一致' if r['byte_identical'] else '天板7部材の材質と木目座標のみ変更'}|\n" for r in rows))
print('PASS: 37 byte-identical GLBs, 7 lounge top faces changed; geometry, AO, edges and 5 textures preserved.')
