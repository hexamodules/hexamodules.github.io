"""Actual 19 Hexa assets, 38-output in-memory repair; never starts Blender."""
import hashlib
import json
import unittest
from pathlib import Path
from repair_hexa import plan, ROOT, decision
from external_textures import read_glb, image_bytes, ao_images
from furniture_materials import face_policy, bed_top_board, countertop_candidate

class HexaRemainingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.outputs,cls.rows,cls.hashes=plan()
        cls.assets=ROOT/'exports/hexa-public/layouts/assets'

    def test_all_38_and_birch_unchanged(self):
        self.assertEqual(len(self.outputs),38)
        for name,(raw,_) in self.outputs.items():
            if name.endswith('-birch.glb'):
                self.assertEqual(raw,(self.assets/'blender'/name).read_bytes(),name)

    def test_geometry_and_images_byte_identical(self):
        for name,(raw,tex) in self.outputs.items():
            path=self.assets/'blender'/name
            before,b=read_glb(path.read_bytes());after,a=read_glb(raw)
            self.assertEqual(a[:len(b)],b,name)
            self.assertEqual(after['nodes'],before['nodes'],name)
            self.assertEqual(after['accessors'][:len(before['accessors'])],before['accessors'],name)
            self.assertEqual(after['bufferViews'][:len(before['bufferViews'])],before['bufferViews'],name)
            for i in range(len(before['images'])):
                old=image_bytes(before,b,i,path.parent)
                new=image_bytes(after,a,i,path.parent) if i in ao_images(after) else tex[after['images'][i]['uri']]
                self.assertEqual(new,old,name)
            for m,n in zip(before['meshes'],after['meshes']):
                for p,q in zip(m['primitives'],n['primitives']):
                    self.assertEqual(p.get('indices'),q.get('indices'))
                    for attr in ['POSITION','NORMAL','TEXCOORD_1']:
                        self.assertEqual(p['attributes'].get(attr),q['attributes'].get(attr))

    def test_exact_reviewed_changes_and_exceptions(self):
        changed=[r for r in self.rows if r['changed']]
        self.assertEqual(len(changed),48)
        self.assertEqual(len({(r['model'],r['body_index']) for r in changed}),37)
        self.assertEqual(len({(r['model'],r['body_index']) for r in changed if r['kind']=='plywood'}),26)
        for r in self.rows:
            if r['exception']:self.assertFalse(r['changed'],r)
            if r['kind']=='plywood' and not r['exception'] and r['before'].startswith('plywood-face:'):
                self.assertIn('hexa-studio.png',r['after'],r)
        tops={r['body'] for r in self.rows if r['model']=='two-side-bed' and r['exception']=='ベッド天板'}
        self.assertEqual(tops,set())
        for r in self.rows:
            if r['model']=='two-side-bed' and r['kind']=='plywood' and r['before'].startswith('plywood-face:'):
                self.assertIn('hexa-studio.png',r['after'],r)
        # SHO's other reported parts: every plywood face already black locally.
        for r in self.rows:
            if (r['model']=='side-cabinet' and not r['exception'] or r['model']=='front-module' and r['body'] in ['ボディ51','ボディ53']) and r['before'].startswith('plywood-face:'):
                self.assertIn('hexa-studio.png',r['before'])

    def test_applicance_and_bezel_are_not_plywood(self):
        changed=[r for r in self.rows if r['changed'] and r['kind']!='plywood']
        self.assertEqual({r['kind'] for r in changed},{'appliance','plastic'})
        self.assertTrue(all('plywood' not in r['after'] for r in changed))

if __name__=='__main__':unittest.main()
