"""Compress GLB without overwriting. Furniture: shared AO, WebP 80, size warning.
Floor defaults remain WebP 82 and Meshopt 16/12/14-bit quantization.
"""
import argparse
import json
import struct
import subprocess
import sys
import tempfile
from external_textures import read_glb, save_external, image_bytes, ao_images
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
    images=set()
    for index in used:
        material=doc['materials'][index]
        occlusion=material.get('occlusionTexture')
        face=material.get('name','').startswith('plywood-face:') or material.get('name','')=='ALBERO melamine surface'
        if face:
            if occlusion:raise ValueError('Plywood face must have constant AO 1 (no occlusion texture)')
            continue
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
            if doc['materials'][primitive['material']].get('occlusionTexture') and 'TEXCOORD_1' not in primitive['attributes']:raise ValueError('Missing UV1 accessor')
    image=doc['images'][next(iter(images))]
    return {'ao_images':len(images),'ao_mime_type':image.get('mimeType'),'materials':len(used),'bytes':len(raw)}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('input');p.add_argument('output')
    p.add_argument('--external-textures', action='store_true', help='Keep WebP bytes; extract shared images, retain embedded AO')
    p.add_argument('--mode',choices=['floor','furniture-draft'],default='floor')
    p.add_argument('--max-bytes',type=int,default=4_000_000,help='Furniture size target in bytes (default: 4000000); excess only warns')
    a=p.parse_args()
    if a.max_bytes<=0:p.error('--max-bytes must be positive')
    base=Path(__file__).resolve().parent
    node=Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node'
    cli=base/'dependencies/node_modules/@gltf-transform/cli/bin/cli.js'
    src=Path(a.input).resolve();out=Path(a.output).resolve()
    temp=out.with_name(out.stem+'-webp.glb')
    report=out.with_suffix('.compression.json')
    furniture=a.mode=='furniture-draft'
    if out.exists() or temp.exists() or ((furniture or a.external_textures) and report.exists()):
        raise SystemExit('Choose a new output name')
    if a.external_textures:
        if furniture: atlas_info(src)
        doc, binary = read_glb(src.read_bytes())
        # Validate before any mesh transform: this mode must never encode images.
        from external_textures import externalize
        externalize(src.read_bytes(), src.parent)
        if 'EXT_meshopt_compression' in doc.get('extensionsUsed', []):
            # Approved assets are already compressed; a second quantization could
            # change the appearance, so only relocate their existing payloads.
            result = save_external(src, out)
        else:
            out.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.TemporaryDirectory(prefix='meshopt-', dir=out.parent) as work:
                packed = Path(work)/'meshopt.glb'
                subprocess.run([str(node),str(cli),'meshopt',str(src),str(packed),
                                '--quantize-position','16','--quantize-normal','12',
                                '--quantize-texcoord','14'],check=True)
                after, data = read_glb(packed.read_bytes())
                for indices, other in [(range(len(doc.get('images', []))), range(len(after.get('images', [])))),
                                       (ao_images(doc), ao_images(after))]:
                    if {image_bytes(doc,binary,i,src.parent) for i in indices} != {image_bytes(after,data,i,packed.parent) for i in other}:
                        raise ValueError('Meshopt changed image bytes')
                result = save_external(packed, out)
        if furniture: result.update(atlas_info(out))
        result.update(target_bytes=a.max_bytes, target_met=result['cold_bytes']<=a.max_bytes,
                      meshopt_reused='EXT_meshopt_compression' in doc.get('extensionsUsed', []))
        with report.open('x') as stream:
            stream.write(json.dumps(result,indent=2)+'\n')
        print(json.dumps(result))
        return
    if furniture:atlas_info(src)
    quality=80 if furniture else 82
    subprocess.run([str(node),str(cli),'webp',str(src),str(temp),'--quality',str(quality)],check=True)
    subprocess.run([str(node),str(cli),'meshopt',str(temp),str(out),'--quantize-position','16','--quantize-normal','12','--quantize-texcoord','14'],check=True)
    if furniture:
        result=atlas_info(out)
        if result['ao_mime_type']!='image/webp':raise ValueError('Atlas was not converted to WebP')
        result.update(quality=quality,target_bytes=a.max_bytes,target_met=result['bytes']<=a.max_bytes)
        report.write_text(json.dumps(result,indent=2)+'\n')
        print(json.dumps(result))
        if not result['target_met']:
            print(f"WARNING: Furniture exceeds {a.max_bytes} bytes ({result['bytes']} bytes); see {report}",file=sys.stderr)


if __name__=='__main__':main()
