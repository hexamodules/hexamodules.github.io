"""Compress GLB without overwriting. Furniture: shared AO, WebP 80, 2MB check.
Floor defaults remain WebP 82 and Meshopt 16/12/14-bit quantization.
"""
import argparse
import json
import struct
import subprocess
from pathlib import Path


def atlas_info(path):
    raw=Path(path).read_bytes()
    magic,version,length=struct.unpack_from('<4sII',raw)
    if magic!=b'glTF' or version!=2 or length!=len(raw):
        raise ValueError('Invalid GLB header')
    size,kind=struct.unpack_from('<I4s',raw,12)
    if kind!=b'JSON':raise ValueError('Missing GLB JSON')
    doc=json.loads(raw[20:20+size])
    used={p['material'] for mesh in doc.get('meshes',[]) for p in mesh['primitives']}
    if len(doc.get('materials',[]))>10:raise ValueError('Furniture exceeds 10 materials')
    images=set()
    for index in used:
        occlusion=doc['materials'][index].get('occlusionTexture')
        if not occlusion:raise ValueError('Furniture material has no AO')
        uv=occlusion.get('extensions',{}).get('KHR_texture_transform',{}).get('texCoord',occlusion.get('texCoord',0))
        if uv!=1:raise ValueError('Furniture AO must use UV1')
        texture=doc['textures'][occlusion['index']]
        image=texture.get('extensions',{}).get('EXT_texture_webp',{}).get('source',texture.get('source'))
        if image is None:raise ValueError('Missing AO image')
        images.add(image)
    if len(images)!=1:raise ValueError('Furniture must reference exactly one AO atlas')
    for mesh in doc.get('meshes',[]):
        for primitive in mesh['primitives']:
            if 'TEXCOORD_1' not in primitive['attributes']:raise ValueError('Missing UV1 accessor')
    image=doc['images'][next(iter(images))]
    return {'ao_images':len(images),'ao_mime_type':image.get('mimeType'),'materials':len(used),'bytes':len(raw)}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('input');p.add_argument('output')
    p.add_argument('--mode',choices=['floor','furniture-draft'],default='floor')
    a=p.parse_args()
    base=Path(__file__).resolve().parent
    node=Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node'
    cli=base/'dependencies/node_modules/@gltf-transform/cli/bin/cli.js'
    src=Path(a.input).resolve();out=Path(a.output).resolve()
    temp=out.with_name(out.stem+'-webp.glb')
    report=out.with_suffix('.compression.json')
    furniture=a.mode=='furniture-draft'
    if out.exists() or temp.exists() or (furniture and report.exists()):
        raise SystemExit('Choose a new output name')
    if furniture:atlas_info(src)
    quality=80 if furniture else 82
    subprocess.run([str(node),str(cli),'webp',str(src),str(temp),'--quality',str(quality)],check=True)
    subprocess.run([str(node),str(cli),'meshopt',str(temp),str(out),'--quantize-position','16','--quantize-normal','12','--quantize-texcoord','14'],check=True)
    if furniture:
        result=atlas_info(out)
        if result['ao_mime_type']!='image/webp':raise ValueError('Atlas was not converted to WebP')
        result.update(quality=quality,target_bytes=2_000_000,target_met=result['bytes']<=2_000_000)
        report.write_text(json.dumps(result,indent=2)+'\n')
        print(json.dumps(result))
        if not result['target_met']:raise SystemExit('Furniture exceeds 2MB; see compression report')


if __name__=='__main__':main()
