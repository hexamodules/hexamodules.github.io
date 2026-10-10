"""Rear variants and original seat fidelity; never import or launch Blender."""
import ast
import copy
import json
from pathlib import Path
from types import SimpleNamespace as NS
import unittest
from extract_tile import defaults
from furniture_materials import (audit_mesh, face_policy, studio_spec, load_rules,
                                linear_color, countertop_candidate)
from rebuild_bounds import selected_parts, FRONT_REARS
from check_material_report import validate

HERE = Path(__file__).parent
ASSETS, _ = defaults()

class RearSeatTests(unittest.TestCase):
    def test_rear_selection_and_existing_placement(self):
        self.assertEqual(selected_parts('front-module'), ['front-module', *FRONT_REARS])
        self.assertEqual(selected_parts(','.join(FRONT_REARS)+',seat'), [*FRONT_REARS,'seat'])
        rows = json.loads((ASSETS.parent/'configurations.json').read_text())
        for row in rows:
            if row['selection']['front'] != 'front-module': continue
            key = row['placements']['front-module']['asset_key']
            self.assertIn(key, FRONT_REARS)
            bed = row['selection']['bed']
            self.assertEqual(key, 'front-module-rear-130' if bed in ('slide-bed','lounge-slide-bed') else 'front-module-rear-140')

    def test_rear_face_and_countertop_match_parent(self):
        definition = json.loads((ASSETS/'countertop-material.json').read_text())
        for key in FRONT_REARS:
            data = json.loads((ASSETS/(key+'.mesh.json')).read_text())
            self.assertEqual(data['base_module'], 'front-module')
            wood = 0
            for row in audit_mesh(data):
                if row['kind'] != 'plywood': continue
                wood += 1
                for finish in ('birch','hexa'):
                    kwargs = dict(body=data['bodies'][row['body_index']],kind='plywood')
                    actual = face_policy(row['material'],data['materials'],finish,model_key=key,**kwargs)
                    expected = face_policy(row['material'],data['materials'],finish,model_key='front-module',**kwargs)
                    self.assertEqual(actual, expected)
                self.assertEqual(countertop_candidate(data['base_module'],row['material'],data['materials'],definition),
                                 countertop_candidate('front-module',row['material'],data['materials'],definition))
            self.assertGreater(wood, 0)

    def test_stock_seat_all_parts_and_report_rejects_matte(self):
        data = json.loads((ASSETS/'seat.mesh.json').read_text())
        rows = audit_mesh(data)
        self.assertTrue(rows)
        report = {'decisions': []}
        for row in rows:
            self.assertEqual(row['kind'],'source_original')
            spec, _ = studio_spec(row['kind'],row['material'],data['materials'],load_rules(),model_key='seat')
            self.assertEqual(spec['color'],'#a0a0a0')
            self.assertEqual(spec['roughness'],.35)
            self.assertEqual(spec['metalness'],.9)
            self.assertEqual(spec['color_linear'], [v*.85 for v in linear_color('#a0a0a0')[:3]]+[1])
            report['decisions'].append(dict(source_body_index=row['body_index'],source_part_index=row['part'],kind=row['kind'],spec=spec))
        self.assertEqual(validate(data,report),len(rows))
        for field, value in [('roughness',.9),('metalness',0),('color','#000000')]:
            broken = copy.deepcopy(report)
            broken['decisions'][0]['spec'][field] = value
            with self.assertRaises(ValueError): validate(data,broken)
        report['decisions'].pop()
        with self.assertRaises(ValueError): validate(data,report)

    def test_shader_receives_exact_source_linear_color(self):
        tree = ast.parse((HERE/'pipeline.py').read_text())
        inputs = {key:NS(default_value=None) for key in ('Roughness','Metallic','Base Color')}
        mat = NS(use_nodes=False,node_tree=NS(nodes=NS(get=lambda _:NS(inputs=inputs)),links=None))
        namespace = {'bpy':NS(data=NS(materials=NS(new=lambda _:mat))), 'linear_color':linear_color}
        function = next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='material')
        exec(compile(ast.Module(body=[function],type_ignores=[]),'<material-test>','exec'),namespace)
        data = json.loads((ASSETS/'seat.mesh.json').read_text())
        spec,_ = studio_spec('source_original',next(iter(data['materials'])),data['materials'],load_rules(),model_key='seat')
        namespace['material'](NS(name='seat'),None,None,spec=spec)
        self.assertEqual(inputs['Base Color'].default_value,spec['color_linear'])
        self.assertEqual(inputs['Metallic'].default_value,.9)
        self.assertEqual(inputs['Roughness'].default_value,.35)

    def test_i_seat_still_fabric(self):
        data = json.loads((ASSETS/'i-seat.mesh.json').read_text())
        rows = [r for r in audit_mesh(data) if r['kind']=='seat_fabric']
        self.assertTrue(rows)
        for row in rows:
            role = data['bodies'][row['body_index']].get('role','')
            spec,_ = studio_spec(row['kind'],row['material'],data['materials'],load_rules(),role=role,model_key='i-seat')
            self.assertEqual(spec['metalness'],0)
            self.assertEqual(spec['roughness'],1 if role=='seam' else .96)

if __name__ == '__main__': unittest.main()
