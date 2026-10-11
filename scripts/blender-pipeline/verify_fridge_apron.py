"""Independently verify the 38-file apron repair, exact face scope and UV area."""
import collections
import hashlib
import json
from pathlib import Path
import struct
from external_textures import read_glb
from rebuild_bounds import ROOT

review=ROOT/'exports/hexa-studio-blender-20261011/fridge-apron-review'
out=review.parent/'shared-textures-hexafix-20261011-3/assets/blender'
before=review/'before'
decoded=json.loads((review/'region-before.json').read_text())
expected={'front-module-hexa.glb','front-module-rear-20-hexa.glb','front-module-rear-114-hexa.glb','front-module-rear-130-hexa.glb','front-module-rear-140-hexa.glb'}
records=[]

def plain(doc,blob,index,fmt,size):
    a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']]
    assert not v.get('extensions')
    return struct.unpack_from('<'+fmt*(a['count']*size),blob,v.get('byteOffset',0)+a.get('byteOffset',0))

for p in sorted(before.glob('*.glb')):
    if not p.name.endswith(('-birch.glb','-hexa.glb')):continue
    old=p.read_bytes();new=(out/p.name).read_bytes()
    a,ab=read_glb(old);b,bb=read_glb(new)
    assert (old!=new)==(p.name in expected),p.name
    if old==new:
        records.append(dict(file=p.name,byte_identical=True));continue
    assert bb[:len(ab)]==ab
    for key in ['nodes','images','textures','samplers','scenes','extensionsUsed','extensionsRequired']:
        assert a.get(key)==b.get(key),(p.name,key)
    assert b['materials'][:len(a['materials'])]==a['materials']
    assert b['accessors'][:len(a['accessors'])]==a['accessors']
    assert b['bufferViews'][:len(a['bufferViews'])]==a['bufferViews']
    changed=0
    for n in a['nodes']:
        if 'mesh' not in n:continue
        ap=a['meshes'][n['mesh']]['primitives'];bp=b['meshes'][n['mesh']]['primitives']
        if ap==bp:continue
        assert n['extras']['source_body_name']=='ボディ51' and n['extras']['source_part_index']==1
        assert len(ap)==1 and len(bp)==2
        edge,face=bp;original=ap[0]
        assert {k:v for k,v in edge.items() if k!='indices'}=={k:v for k,v in original.items() if k!='indices'}
        assert {k:v for k,v in face['attributes'].items() if k!='TEXCOORD_0'}=={k:v for k,v in original['attributes'].items() if k!='TEXCOORD_0'}
        assert 'hexa-studio.png' in b['materials'][face['material']]['name']
        assert a['materials'][original['material']]['occlusionTexture']==b['materials'][face['material']]['occlusionTexture']
        d=next(r for r in decoded if r['file']==p.name and r['node']==n['name'] and r['primitive']==0)
        retained=plain(b,bb,edge['indices'],'I',1);fixed=plain(b,bb,face['indices'],'I',1)
        triples=lambda x:collections.Counter(tuple(x[i:i+3]) for i in range(0,len(x),3))
        assert triples(retained)+triples(fixed)==triples(d['indices'])
        assert len(fixed)==12
        area=0;uv_area=0;uv=plain(b,bb,face['attributes']['TEXCOORD_0'],'f',2)
        for i in range(0,len(fixed),3):
            ids=fixed[i:i+3];q=[d['points'][j] for j in ids]
            assert any(all(abs(v[0]-plane)<.02 for v in q) for plane in [-205,-220])
            assert all(-.02<=v[1]<=30.02 for v in q)
            area+=abs((q[1][1]-q[0][1])*(q[2][2]-q[0][2])-(q[2][1]-q[0][1])*(q[1][2]-q[0][2]))/2
            t=[uv[j*2:j*2+2] for j in ids]
            ua=abs((t[1][0]-t[0][0])*(t[2][1]-t[0][1])-(t[2][0]-t[0][0])*(t[1][1]-t[0][1]))/2
            assert ua>0;uv_area+=ua
        assert abs(area/uv_area-8100)<.05,'Hexa tile must cover 90 x 90 mm without collapsed UV'
        changed+=1
    assert changed==1
    records.append(dict(file=p.name,byte_identical=False,changed_body='ボディ51',changed_triangles=4,face_area_mm2=area,uv_area=uv_area,mm2_per_uv_area=area/uv_area,shape_normals_ao_unchanged=True,other_primitives_unchanged=True))
assert len(records)==38
textures=[]
for p in (out/'tex').glob('*'):
    assert p.read_bytes()==(before/'tex'/p.name).read_bytes()
    textures.append(p.name)
original_rules=json.loads((review/'materials.json.before').read_text())
rules=json.loads((ROOT/'scripts/blender-pipeline/materials.json').read_text())
assert {k:v for k,v in rules.items() if k!='hexa_apron_faces'}==original_rules
result=dict(passed=True,files=records,changed_files=5,byte_identical_files=33,unchanged_textures=textures,other_material_rules_unchanged=True)
(review/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('PASS: 38 GLBs; only 5 apron bodies / 20 triangles changed; 33 GLBs and all textures byte-identical.')
