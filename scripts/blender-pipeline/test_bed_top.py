"""Bed top overrides and cross-furniture regressions; no Blender needed."""
import json
import unittest
from pathlib import Path
from furniture_materials import face_policy, classify, bed_top_board

ROOT=Path(__file__).resolve().parents[2]
if ROOT.name=='hexa-public': ROOT=ROOT.parent.parent
ASSETS=ROOT/'exports/hexa-public/layouts/assets'

class BedTopTests(unittest.TestCase):
    def test_real_sources_and_relabelled_tops(self):
        counts={}
        for model in ['aluminum-bed','active-side-cabinet','aluminum-front-kitchen','i-seat']:
            data=json.loads((ASSETS/(model+'.mesh.json')).read_text())
            tops=[]
            for body in data['bodies']:
                for part in body['parts']:
                    key=part['material']
                    kind=classify(body['name'],key,data['materials'],path=body.get('path',''),role=body.get('role',''))['kind']
                    for finish in ['birch','hexa']:
                        old=face_policy(key,data['materials'],finish)
                        new=face_policy(key,data['materials'],finish,model,body,kind)
                        self.assertEqual(old,new) # Existing sources are already Birch on tops.
                    if bed_top_board(model,body,kind):
                        tops.append(body['name'])
                        changed={key:{'name':'SKY Hexa plywood - charcoal satin'}}
                        self.assertEqual(face_policy(key,changed,'hexa',model,body,kind)['finish'],'birch')
                    elif kind=='plywood':
                        changed={key:{'name':'SKY Hexa plywood - charcoal satin'}}
                        self.assertEqual(face_policy(key,changed,'hexa',model,body,kind)['finish'],'hexa')
            counts[model]=tops
        self.assertEqual(len(counts['aluminum-bed']),5)
        self.assertIn('ボディ105',counts['aluminum-bed'])
        self.assertTrue(all(not v for k,v in counts.items() if k!='aluminum-bed'))

    def test_aliases_geometry_and_metal_guard(self):
        for name in ['天板1','すのこ','top','Top panel','slat','bed_slat_2']:
            self.assertTrue(bed_top_board('aluminum-bed',{'name':name},'plywood'))
            self.assertFalse(bed_top_board('aluminum-bed',{'name':name},'aluminum'))
        self.assertTrue(bed_top_board('aluminum-bed',{'bounds':[[0,0,0],[600,15,900]]},'plywood'))
        self.assertFalse(bed_top_board('aluminum-bed',{'bounds':[[0,0,0],[15,300,900]]},'plywood'))
        self.assertFalse(bed_top_board('aluminum-bed',{'bounds':[[0,0,0],[600,300,15]]},'plywood'))

if __name__=='__main__':unittest.main()
