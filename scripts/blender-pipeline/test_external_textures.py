"""Lossless extraction tests; no Blender, browser, server or production writes."""
import copy
from contextlib import redirect_stdout
import io
import json
from pathlib import Path
import struct
import sys
import tempfile
import unittest
from unittest.mock import patch

import compress
from external_textures import (ao_images, externalize, image_bytes, read_glb,
                               save_external, write_glb)
import rebuild_bounds
from shared_texture_batch import inspect_batch

ROOT = rebuild_bounds.ROOT


def fixture():
    # WebP-like bytes suffice: extraction must not decode images.
    ao = b'RIFF'+struct.pack('<I', 8)+b'WEBP'+b'AO!!'
    wood = b'RIFF'+struct.pack('<I', 9)+b'WEBP'+b'WOOD!'
    doc = {'asset': {'version': '2.0'}, 'buffers': [{'byteLength': 40}],
           'bufferViews': [{'buffer': 0, 'byteOffset': 0, 'byteLength': 16},
                           {'buffer': 0, 'byteOffset': 16, 'byteLength': 17},
                           {'buffer': 0, 'byteOffset': 36, 'byteLength': 4}],
           'images': [{'name': 'furniture-ao', 'mimeType': 'image/webp', 'bufferView': 0},
                      {'name': 'face-toned', 'mimeType': 'image/webp', 'bufferView': 1}],
           'textures': [{'extensions': {'EXT_texture_webp': {'source': 0}}}],
           'materials': [{'occlusionTexture': {'index': 0}}],
           'accessors': [{'bufferView': 2}],
           'extensionsUsed': ['EXT_meshopt_compression']}
    return write_glb(doc, ao+wood+b'\0'*3+b'MESH')


class ExternalTextureTests(unittest.TestCase):
    def test_preserves_images_ao_and_geometry(self):
        raw = fixture()
        before, binary = read_glb(raw)
        packed, shared = externalize(raw)
        after, result = read_glb(packed)
        self.assertEqual(image_bytes(before,binary,0),image_bytes(after,result,0))
        self.assertEqual(image_bytes(before,binary,1),shared[after['images'][1]['uri']])
        view = after['bufferViews'][after['accessors'][0]['bufferView']]
        self.assertEqual(result[view['byteOffset']:view['byteOffset']+view['byteLength']],b'MESH')
        self.assertEqual(ao_images(after), {0})

    def test_same_bytes_deduplicate_and_existing_uri_preserved(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            src = root/'source.glb'; src.write_bytes(fixture())
            out = root/'assets/blender/a.glb'
            result = save_external(src, out)
            saved = out.read_bytes()
            save_external(src, out.with_name('b.glb'))
            self.assertEqual(len(list((out.parent/'tex').glob('*.webp'))),1)
            repacked, images = externalize(saved,out.parent)
            self.assertEqual(saved,repacked)
            self.assertEqual(result['cold_bytes'],len(saved)+sum(map(len,images.values())))
            with self.assertRaises(ValueError): save_external(src,out)

    def test_rejects_non_webp_and_ao_externalization_and_overlap(self):
        doc, binary = read_glb(fixture())
        doc['images'][1]['mimeType']='image/png'
        with self.assertRaisesRegex(ValueError,'WebP'): externalize(write_glb(doc,binary))
        doc, binary = read_glb(fixture())
        doc['images'][0].pop('bufferView');doc['images'][0]['uri']='ao.webp'
        with self.assertRaisesRegex(ValueError,'AO'): externalize(write_glb(doc,binary))
        doc, binary = read_glb(fixture())
        doc['accessors'][0]['bufferView']=1
        with self.assertRaisesRegex(ValueError,'other data'): externalize(write_glb(doc,binary))

    def test_image_hash_collision_does_not_overwrite(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);src=root/'input.glb';src.write_bytes(fixture())
            _, textures=externalize(src.read_bytes())
            uri=next(iter(textures));dest=root/'out'/uri
            dest.parent.mkdir(parents=True);dest.write_bytes(b'keep')
            with self.assertRaises(ValueError):save_external(src,root/'out/result.glb')
            self.assertEqual(dest.read_bytes(),b'keep')
            self.assertFalse((root/'out/result.glb').exists())

    def test_compress_external_mode_never_recompresses_approved_asset(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);src=root/'input.glb';src.write_bytes(fixture())
            out=root/'output.glb'
            with patch.object(sys,'argv',['compress.py',str(src),str(out),'--external-textures']), \
                 patch.object(compress.subprocess,'run') as run, redirect_stdout(io.StringIO()):
                compress.main()
            run.assert_not_called()
            result=json.loads(out.with_suffix('.compression.json').read_text())
            self.assertTrue(result['meshopt_reused'])
            self.assertFalse(result['image_reencoded'])

    def test_compress_unpacked_external_mode_only_calls_meshopt(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);src=root/'input.glb'
            doc,binary=read_glb(fixture());doc['extensionsUsed']=[]
            src.write_bytes(write_glb(doc,binary))
            out=root/'output.glb'
            def meshopt(command,**kwargs):
                self.assertEqual(command[2],'meshopt')
                Path(command[4]).write_bytes(fixture())
            with patch.object(sys,'argv',['compress.py',str(src),str(out),'--external-textures']), \
                 patch.object(compress.subprocess,'run',side_effect=meshopt) as run, redirect_stdout(io.StringIO()):
                compress.main()
            self.assertEqual(run.call_count,1)
            after,_=read_glb(out.read_bytes())
            self.assertTrue((out.parent/after['images'][1]['uri']).is_file())

    def test_full_batch_dry_run_no_subprocess_or_output(self):
        output=io.StringIO()
        with patch.object(sys,'argv',['rebuild_bounds.py','--parts','all','--tag','test-shared-dry',
                                     '--external-textures']), \
             patch.object(rebuild_bounds.subprocess,'run') as run, redirect_stdout(output):
            rebuild_bounds.main()
        run.assert_not_called()
        lines=output.getvalue().splitlines()
        self.assertEqual(len(lines),39)
        self.assertTrue(all('compress.py' in line and '--external-textures' in line for line in lines[:-1]))
        self.assertEqual(json.loads(lines[-1])['models'],38)
        self.assertFalse((ROOT/'exports/hexa-studio-blender-20261010/shared-textures-test-shared-dry').exists())

    def test_all_38_approved_assets_semantically_identical(self):
        paths=[ROOT/'exports/hexa-public/layouts/assets/blender'/f'{p}-{f}.glb'
               for p in rebuild_bounds.selected_parts('all') for f in ['birch','hexa']]
        for path in paths:
            with self.subTest(name=path.name):
                original,binary=read_glb(path.read_bytes())
                raw,shared=externalize(path.read_bytes(),path.parent)
                doc,result=read_glb(raw)
                removed={im['bufferView'] for i,im in enumerate(original['images']) if i not in ao_images(original)}
                indices=[i for i in range(len(original['bufferViews'])) if i not in removed]
                for new_index,old_index in enumerate(indices):
                    old=original['bufferViews'][old_index];new=doc['bufferViews'][new_index]
                    for left,right in [(old,new),(old.get('extensions',{}).get('EXT_meshopt_compression'),new.get('extensions',{}).get('EXT_meshopt_compression'))]:
                        if left and left['buffer']==0:
                            self.assertEqual(binary[left.get('byteOffset',0):left.get('byteOffset',0)+left['byteLength']],
                                             result[right.get('byteOffset',0):right.get('byteOffset',0)+right['byteLength']])
                for i,im in enumerate(doc['images']):
                    expected=image_bytes(original,binary,i)
                    if i in ao_images(original):self.assertEqual(expected,image_bytes(doc,result,i))
                    else:self.assertEqual(expected,shared[im['uri']])
                # Restore only storage bookkeeping; every other JSON value must match.
                def restore(value):
                    if isinstance(value,list):
                        for child in value:restore(child)
                    elif isinstance(value,dict):
                        for key,child in value.items():
                            if key=='bufferView':value[key]=indices[child]
                            else:restore(child)
                restore(doc)
                for key in ['images','bufferViews','buffers']:doc[key]=copy.deepcopy(original[key])
                self.assertEqual(doc,original)
        summary=inspect_batch(paths)
        self.assertEqual(summary['models'],38)
        self.assertEqual(summary['before_bytes'],93_302_584)
        self.assertLess(summary['after_total_bytes'],30_000_000)


if __name__=='__main__':unittest.main()
