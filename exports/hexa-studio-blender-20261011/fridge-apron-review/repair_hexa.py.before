"""Review/repair approved GLBs in memory; opt-in export, no Blender/image encoding.
Only Hexa is repaired. Birch, image bytes, compressed geometry and AO stay intact.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import sys
from external_textures import read_glb, write_glb, externalize
from furniture_materials import (classify, face_policy, countertop_candidate,
    bed_top_board, load_rules, studio_spec, linear_color, board_axes)
from rebuild_bounds import ROOT, HERE, selected_parts

NODE=Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node'


def decision(model, extras, source, countertop):
    body=source['bodies'][extras['source_body_index']]
    if body['name'] != extras['source_body_name'] or body.get('path','') != extras['source_path']:
        raise ValueError('Source identity changed: '+model+' '+str(extras))
    if body['bounds'] != json.loads(extras['source_bounds_mm']):
        raise ValueError('Source bounds changed: '+model+' '+body['name'])
    key=extras['source_material']
    if body['parts'][extras['source_part_index']]['material'] != key:
        raise ValueError('Source part material changed')
    kind=classify(body['name'],key,source['materials'],path=body.get('path',''),
                  model_key=model,bounds=body.get('bounds'),role=body.get('role',''))['kind']
    worktop=countertop_candidate(source.get('base_module') or model,key,source['materials'],countertop,body)
    bed=bed_top_board(model,body,kind)
    return body,kind,worktop,bed,face_policy(key,source['materials'],'hexa',model,body,kind,countertop=worktop)


def repair(raw, model, source, countertop, decoded):
    doc,binary=read_glb(raw); original=copy.deepcopy(doc); old_binary=binary
    rows=[]; changed=0
    meshes=[n['mesh'] for n in doc['nodes'] if 'mesh' in n]
    if len(meshes)!=len(set(meshes)):raise ValueError('Shared mesh needs explicit isolation')
    decoded={(r['node'],r['primitive']):r for r in decoded}
    rules=load_rules()
    for n in doc['nodes']:
        if 'mesh' not in n:continue
        e=n['extras'];body,kind,worktop,bed,policy=decision(model,e,source,countertop)
        for pi,p in enumerate(doc['meshes'][n['mesh']]['primitives']):
            mat=doc['materials'][p['material']]; name=mat['name']; target=None
            if name.startswith('plywood-') and not worktop:
                if kind!='plywood':target=kind
                elif name.startswith('plywood-face:') and ':face-' in name and policy['finish']=='hexa':target='hexa'
            row=dict(model=model,node=n['name'],primitive=pi,body=body['name'],body_index=e['source_body_index'],part=e['source_part_index'],path=body.get('path',''),source_material=e['source_material'],kind=kind,bounds_mm=body['bounds'],before=name,after=target or name,exception='ALBERO天板' if worktop else 'ベッド天板' if bed else '',changed=target is not None)
            rows.append(row)
            if target is None:continue
            changed+=1
            if target=='hexa':
                targets=[i for i,m in enumerate(doc['materials']) if m['name'].startswith('plywood-face:') and 'hexa-studio.png' in m['name']]
                if not targets:raise ValueError('No approved Hexa material: '+model)
                p['material']=targets[0]
                # Project only new face UVs. World coordinates are millimetres,
                # glTF Y-up; use the existing 90 mm Hexa tile without re-encoding.
                points=decoded[n['name'],pi]['points_mm']
                t,g,a=board_axes(body['bounds']); lo,hi=body['bounds']; tile=rules['mapping']['hexa_mm']
                def axis(q,k):return hi[k]-q[k] if k==2 else q[k]-lo[k]
                uv=[v for q in points for v in (axis(q,g)/tile[0],1-axis(q,a)/tile[1])]
                payload=struct.pack('<'+'f'*len(uv),*uv);offset=len(binary);binary+=payload
                view=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(payload),'target':34962})
                accessor=len(doc['accessors']);doc['accessors'].append({'bufferView':view,'componentType':5126,'count':len(points),'type':'VEC2'})
                p['attributes']['TEXCOORD_0']=accessor
            else:
                spec,_=studio_spec(kind,e['source_material'],source['materials'],rules,role=e.get('source_role',''),model_key=model)
                replacement=copy.deepcopy(mat)
                replacement['name']=kind+':hexafix-source-solid'
                replacement['pbrMetallicRoughness']={'baseColorFactor':list(linear_color(spec['color'])), 'metallicFactor':spec['metalness'],'roughnessFactor':spec['roughness']}
                ao=next((m['occlusionTexture'] for m in doc['materials'] if m.get('occlusionTexture')),None)
                if ao is None or 'TEXCOORD_1' not in p['attributes']:raise ValueError('Missing original AO mapping')
                replacement['occlusionTexture']=copy.deepcopy(ao)
                p['material']=len(doc['materials']);doc['materials'].append(replacement)
            row['after']=doc['materials'][p['material']]['name']
    if not changed:return raw,rows
    doc['buffers'][0]['byteLength']=len(binary)
    # Strong invariants: no changes to existing buffers, geometry, images or transforms.
    assert binary[:len(old_binary)]==old_binary
    for key in ['nodes','images','textures','samplers','scenes','extensionsUsed','extensionsRequired']:
        assert doc.get(key)==original.get(key),key
    assert doc['accessors'][:len(original['accessors'])]==original['accessors']
    assert doc['bufferViews'][:len(original['bufferViews'])]==original['bufferViews']
    for before,after in zip(original['meshes'],doc['meshes']):
        for a,b in zip(before['primitives'],after['primitives']):
            assert a.get('indices')==b.get('indices')
            assert {k:v for k,v in a['attributes'].items() if k!='TEXCOORD_0'}=={k:v for k,v in b['attributes'].items() if k!='TEXCOORD_0'}
    return write_glb(doc,binary),rows


def plan(root=ROOT):
    assets=root/'exports/hexa-public/layouts/assets'; folder=assets/'blender'
    decoded=json.loads(subprocess.check_output([str(NODE),str(HERE/'audit_hexa_glb.mjs'),str(folder),'--points']))
    counter=json.loads((assets/'countertop-material.json').read_text());outputs={};rows=[];hashes={}
    for model in selected_parts('all'):
        source=json.loads((assets/(model+'.mesh.json')).read_text())
        for finish in ['birch','hexa']:
            path=folder/f'{model}-{finish}.glb';raw=path.read_bytes();hashes[path.name]=hashlib.sha256(raw).hexdigest()
            if finish=='hexa':raw,items=repair(raw,model,source,counter,[r for r in decoded if r['file']==path.name]);rows.extend(items)
            packed,textures=externalize(raw,folder)
            outputs[path.name]=(packed,textures)
    return outputs,rows,hashes


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--tag',required=True);p.add_argument('--external-textures',action='store_true',required=True)
    p.add_argument('--execute',action='store_true')
    a=p.parse_args()
    if not a.tag or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_' for c in a.tag):p.error('Invalid tag')
    destination=ROOT/'exports/hexa-studio-blender-20261011'/('shared-textures-'+a.tag)
    if destination.exists():p.error('Output already exists')
    outputs,rows,hashes=plan()
    summary=dict(models=len(outputs),changed_primitives=sum(r['changed'] for r in rows),changed_bodies=len({(r['model'],r['body_index']) for r in rows if r['changed']}),source_sha256=hashes,blender_started=False,image_reencoded=False,output=str(destination),executed=a.execute)
    if a.execute:
        source=ROOT/'exports/hexa-public/layouts/assets/blender'
        if any(hashlib.sha256((source/n).read_bytes()).hexdigest()!=h for n,h in hashes.items()):raise ValueError('Source changed during preflight')
        destination.mkdir(parents=True,exist_ok=False)
        target=destination/'assets/blender';target.mkdir(parents=True)
        for name,(raw,textures) in outputs.items():
            with (target/name).open('xb') as f:f.write(raw)
            for uri,data in textures.items():
                out=target/uri;out.parent.mkdir(parents=True,exist_ok=True)
                if out.exists():assert out.read_bytes()==data
                else:
                    with out.open('xb') as f:f.write(data)
        (destination/'material-changes.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
        (destination/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(summary,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
