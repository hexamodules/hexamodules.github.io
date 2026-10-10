"""Coated board and ALBERO regressions; never starts Blender."""
import itertools
import json
import unittest
from pathlib import Path
from furniture_materials import classify, face_policy, countertop_candidate, audit_mesh

ASSETS = Path(__file__).resolve().parents[2] / 'exports/hexa-public/layouts/assets'
if not ASSETS.is_dir():
    ASSETS = Path(__file__).resolve().parents[2] / 'layouts/assets'
DEFINITION = json.loads((ASSETS / 'countertop-material.json').read_text())

class FrontModuleTests(unittest.TestCase):
    def test_coated_board_both_finishes_all_axes(self):
        for material, spans in itertools.product(['パウダー コート(黒)', 'powder coat black', 'Powder-Coated Black', 'charcoal satin'], itertools.permutations([15, 300, 600])):
            body = dict(name='ボディ1', bounds=[[10,20,30], [10+spans[0],20+spans[1],30+spans[2]]])
            decision = classify(body['name'], material, bounds=body['bounds'])
            self.assertEqual(decision['kind'], 'plywood')
            self.assertFalse(decision['fallback'])
            for finish in ['birch','hexa']:
                self.assertEqual(face_policy(material, {}, finish, body=body, kind=decision['kind'])['finish'],finish)

    def test_thickness_area_and_rod_exclusions(self):
        for spans in ([3,19,60],[4.99,300,600],[30.01,300,600],[15,20,1000],[15,60,100],[15,15,1200]):
            self.assertNotEqual(classify('ボディ1','powder coat',bounds=[[0,0,0],spans])['kind'],'plywood')
        for thickness in [5,30]:
            self.assertEqual(classify('ボディ1','powder coat',bounds=[[0,0,0],[thickness,300,600]])['kind'],'plywood')
        self.assertNotEqual(classify('ボディ1','powder coat')['kind'],'plywood')

    def test_explicit_materials_hardware_and_seat_protected(self):
        bounds=[[0,0,0],[15,300,600]]
        for name in ['bracket','ブラケット','rail','frame','bolt','台形脚','tank','fridge']:
            self.assertNotEqual(classify(name,'powder coat',bounds=bounds)['kind'],'plywood')
        for material in ['powder coat aluminum','powder coat plastic','powder coat steel']:
            self.assertNotEqual(classify('ボディ1',material,bounds=bounds)['kind'],'plywood')
        self.assertEqual(classify('top','powder coat',bounds=bounds,model_key='seat')['kind'],'source_original')
        self.assertEqual(classify('panel','powder coat',bounds=bounds,path='PFS BOX23L')['kind'],'container')

    def test_worktop_names_and_non_worktops(self):
        for title in ['Countertop - warm red oak','天板15','counter','top','Top panel','Cabinet top']:
            body=dict(name=title,bounds=[[0,0,0],[600,18,300]])
            self.assertTrue(countertop_candidate('front-module','powder coat',{},DEFINITION,body))
            self.assertFalse(countertop_candidate('aluminum-bed','powder coat',{},DEFINITION,body))
        for title in ['Forward end panel -15mm with top tenons','stop','top bracket','top rail']:
            self.assertFalse(countertop_candidate('front-module','powder coat',{},DEFINITION,dict(name=title,bounds=[[0,0,0],[600,18,300]])))
        self.assertTrue(countertop_candidate('front-module','Countertop - warm red oak',{},DEFINITION))
        self.assertFalse(countertop_candidate('front-module','oak koguchi',{},DEFINITION))

    def test_real_front_has_small_metal_and_existing_boards(self):
        data=json.loads((ASSETS/'front-module.mesh.json').read_text())
        rows=audit_mesh(data)
        self.assertEqual(sum(r['kind']=='plywood' for r in rows),31)
        coated=[r for r in rows if r['material']=='パウダー コート(黒)']
        self.assertEqual(len(coated),4)
        self.assertTrue(all(r['kind']!='plywood' for r in coated))
        top=[r for r in rows if countertop_candidate('front-module',r['material'],data['materials'],DEFINITION,data['bodies'][r['body_index']])]
        self.assertEqual(len(top),1)

    def test_audit_passes_geometry(self):
        data=dict(key='front-module',materials={},bodies=[dict(name='ボディ1',bounds=[[0,0,0],[600,18,300]],parts=[dict(material='powder coat')])])
        self.assertEqual(audit_mesh(data)[0]['matched_by'],'coated_board_geometry')

if __name__=='__main__': unittest.main()
