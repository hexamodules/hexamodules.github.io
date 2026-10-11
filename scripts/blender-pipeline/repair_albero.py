"""Extend approved ALBERO to whole worktop bodies, without Blender or image encoding."""
import argparse,copy,hashlib,json,struct,subprocess
from pathlib import Path
from external_textures import read_glb,write_glb,externalize
from furniture_materials import countertop_candidate,countertop_uv
from rebuild_bounds import ROOT,HERE,selected_parts
from repair_hexa import NODE

def repair(raw,model,source,counter,decoded):
    doc,binary=read_glb(raw);old=copy.deepcopy(doc);old_binary=binary;rows=[]
    candidates={i for i,b in enumerate(source['bodies']) if any(countertop_candidate(source.get('base_module') or model,p['material'],source['materials'],counter,b) for p in b['parts'])}
    albero=[i for i,m in enumerate(doc['materials']) if m['name'].startswith('ALBERO')]
    if candidates and not albero:raise ValueError('Missing approved ALBERO '+model)
    decoded={(r['node'],r['primitive']):r for r in decoded}
    assert len([n['mesh'] for n in doc['nodes'] if 'mesh' in n])==len({n['mesh'] for n in doc['nodes'] if 'mesh' in n})
    for n in doc['nodes']:
        if 'mesh' not in n:continue
        e=n['extras'];i=e['source_body_index']
        if i not in candidates:continue
        body=source['bodies'][i];assert body['name']==e['source_body_name'];assert body['bounds']==json.loads(e['source_bounds_mm'])
        for pi,p in enumerate(doc['meshes'][n['mesh']]['primitives']):
            mat=doc['materials'][p['material']]
            if mat['name'].startswith('ALBERO'):continue
            data=decoded[n['name'],pi];tile=counter['web_surface']['tile_mm'];uv=[];lo,hi=body['bounds']
            for q,normal in zip(data['points'],data['normals']):
                axis=max(range(3),key=lambda k:abs(normal[k]))
                if axis==1:u,v=countertop_uv(q,body['bounds'],tile)
                else:u,v=(q[2 if axis==0 else 0]-lo[2 if axis==0 else 0])/tile[1],(q[1]-lo[1])/tile[0]
                uv.extend((u,1-v))
            payload=struct.pack('<'+'f'*len(uv),*uv);offset=len(binary);binary+=payload
            view=len(doc['bufferViews']);doc['bufferViews'].append(dict(buffer=0,byteOffset=offset,byteLength=len(payload),target=34962))
            accessor=len(doc['accessors']);doc['accessors'].append(dict(bufferView=view,componentType=5126,count=len(data['points']),type='VEC2'))
            p['attributes']['TEXCOORD_0']=accessor
            replacement=copy.deepcopy(doc['materials'][albero[0]])
            if 'occlusionTexture' in mat:replacement['occlusionTexture']=copy.deepcopy(mat['occlusionTexture'])
            else:replacement.pop('occlusionTexture',None)
            p['material']=len(doc['materials']);doc['materials'].append(replacement)
            rows.append(dict(model=model,body_index=i,body=body['name'],node=n['name'],primitive=pi,bounds_mm=body['bounds'],before=mat['name'],after=replacement['name']))
    if not rows:return raw,rows
    doc['buffers'][0]['byteLength']=len(binary)
    assert binary[:len(old_binary)]==old_binary
    for key in ['nodes','images','textures','samplers','scenes','extensionsUsed','extensionsRequired']:assert old.get(key)==doc.get(key),key
    assert old['accessors']==doc['accessors'][:len(old['accessors'])]
    assert old['bufferViews']==doc['bufferViews'][:len(old['bufferViews'])]
    changed={(r['node'],r['primitive']) for r in rows}
    for n in old['nodes']:
        if 'mesh' not in n:continue
        for pi,(a,b) in enumerate(zip(old['meshes'][n['mesh']]['primitives'],doc['meshes'][n['mesh']]['primitives'])):
            if (n['name'],pi) not in changed:assert a==b
            else:
                assert a.get('indices')==b.get('indices')
                assert {k:v for k,v in a['attributes'].items() if k!='TEXCOORD_0'}=={k:v for k,v in b['attributes'].items() if k!='TEXCOORD_0'}
                assert old['materials'][a['material']].get('occlusionTexture')==doc['materials'][b['material']].get('occlusionTexture')
    return write_glb(doc,binary),rows

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--execute',action='store_true');parser.add_argument('--external-textures',action='store_true',required=True);parser.add_argument('--tag',default='albero-20261011-1');a=parser.parse_args()
    if any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_' for c in a.tag):parser.error('Invalid tag')
    assets=ROOT/'exports/hexa-public/layouts/assets';folder=assets/'blender';dest=ROOT/'exports/hexa-studio-blender-20261011'/('shared-textures-'+a.tag)
    if dest.exists():parser.error('Output already exists')
    hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.glob('*.glb')}
    decoded=json.loads(subprocess.check_output([str(NODE),str(HERE/'decode_albero.mjs'),str(folder)]));counter=json.loads((assets/'countertop-material.json').read_text());outputs={};rows=[];changed=[]
    for model in selected_parts('all'):
        source=json.loads((assets/(model+'.mesh.json')).read_text())
        for finish in ['birch','hexa']:
            name=f'{model}-{finish}.glb';original=(folder/name).read_bytes();raw,items=repair(original,model,source,counter,[r for r in decoded if r['file']==name])
            for r in items:r['finish']=finish
            rows.extend(items);packed,textures=externalize(raw,folder);outputs[name]=(packed,textures)
            if packed!=original:changed.append(name)
    assert len(outputs)==38
    assert all(hashlib.sha256((folder/n).read_bytes()).hexdigest()==h for n,h in hashes.items())
    summary=dict(models=38,changed_files=changed,changed_primitives=len(rows),changed_bodies=len({(r['model'],r['body_index'],r['finish']) for r in rows}),source_sha256=hashes,geometry_unchanged=True,ao_unchanged=True,existing_top_unchanged=True,blender_started=False,image_reencoded=False)
    if a.execute:
        target=dest/'assets/blender';target.mkdir(parents=True,exist_ok=False)
        for name,(raw,textures) in outputs.items():
            (target/name).write_bytes(raw)
            for uri,data in textures.items():
                p=target/uri;p.parent.mkdir(exist_ok=True)
                if p.exists():assert p.read_bytes()==data
                else:p.write_bytes(data)
        (dest/'material-changes.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n');(dest/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(summary,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
