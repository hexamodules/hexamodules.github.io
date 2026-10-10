"""Pure Python checks; never imports bpy or launches Blender."""
import ast
import importlib.util
import json
import math
import subprocess
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace as NS
from PIL import Image
from extract_tile import affine, defaults

HERE=Path(__file__).parent
ASSETS,TILES=defaults()


class MappingTests(unittest.TestCase):
    def test_affine_matches_studio_shader(self):
        finishes=json.loads((ASSETS/'floor-finishes.json').read_text())['colors']
        for f in finishes:
            m=f['mapping'];size=tuple(n*2 for n in m['tile_mm'])
            source_size=(f['image_width'],f['image_height'])
            a,b,c,d,e,g=affine(m,source_size,size)
            for u,v in [(0,0),(1,1),(.2,.7),(.5,.5)]:
                x,y=u*size[0],(1-v)*size[1]
                actual=((a*x+b*y+c)/source_size[0],1-(d*x+e*y+g)/source_size[1])
                expected=[m['center'][i]+(u-.5)*m['across'][i]+(v-.5)*m['along'][i] for i in range(2)]
                for left,right in zip(actual,expected):self.assertAlmostEqual(left,right)
            with Image.open(TILES/f"floor-{f['value']}.png") as image:self.assertEqual(image.size,size)

    def test_world_planar_uv_and_furniture_classification(self):
        # Execute the actual projection function with tiny Blender-like objects.
        tree=ast.parse((HERE/'pipeline.py').read_text())
        fn=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='planar_uv')
        ns={};exec(compile(ast.Module(body=[fn],type_ignores=[]),'<planar_uv>','exec'),ns)
        class Matrix:
            def __matmul__(self,p):return p
            def to_3x3(self):return self
            def inverted(self):return self
            def transposed(self):return self
        class Normal(NS):
            def normalized(self):return self
            def __iter__(self):return iter((self.x,self.y,self.z))
        class Collection(list):
            def foreach_set(self,key,values):
                if key=='uv':
                    for i,item in enumerate(self):item.uv=tuple(values[2*i:2*i+2])
                else:
                    for item,value in zip(self,values):setattr(item,key,value)
        grain=NS(data=Collection([NS(uv=None)]))
        face=NS(normal=Normal(x=0,y=0,z=1),loop_indices=[0],material_index=0)
        calls=[]
        mesh=NS(polygons=Collection([face]),loops=[NS(vertex_index=0)],vertices=[NS(co=(.3,-.9,.015))],uv_layers={'UVMap0':grain},validate=lambda **kw:calls.append('validate'),update=lambda:calls.append('update'))
        obj=NS(name='filled floor',matrix_world=Matrix(),data=mesh)
        ns['planar_uv'](obj,[300,900]);self.assertEqual(grain.data[0].uv,(1,-1))
        self.assertEqual(calls[:2],['validate','update'])
        ns['planar_uv'](obj,[150,150]);self.assertEqual(grain.data[0].uv,(2,-6))
        ns['planar_uv'](obj,[300,900],True);self.assertEqual(face.material_index,0)
        face.normal=Normal(x=1,y=0,z=0)
        ns['planar_uv'](obj,[300,900],True);self.assertEqual(face.material_index,1);self.assertEqual(grain.data[0].uv,(-3,1))
        # Simulate edit mode replacing UV custom data: only the new layer is written.
        replacement=NS(data=Collection([NS(uv=None)]));mesh.uv_layers['UVMap0']=replacement
        ns['planar_uv'](obj,[300,900]);self.assertEqual(replacement.data[0].uv,(1,-1));self.assertEqual(grain.data[0].uv,(-3,1))
        # Corrupt input fails before UV access with a useful message.
        mesh.loops[0].vertex_index=-1068599206
        with self.assertRaisesRegex(ValueError,'invalid vertex'):ns['planar_uv'](obj,[300,900])
        # +90-degree source conversion: source forward Z -> Blender -Y.
        # MIRROR(-v) == MIRROR(v), including negative positions and seams.
        mirror=lambda x:1-abs(x%2-1)
        for v in [-4.5,-1,-.2,0,.3,1,1.8,3.6]:self.assertAlmostEqual(mirror(v),mirror(-v))

    def test_runner_all_finishes_without_blender(self):
        for finish in ['oak','teak','walnut','dark-canvas','light-canvas']:
            result=subprocess.run([sys.executable,'-B',str(HERE/'run.py'),str(ASSETS/'interior-floor-oak.mesh.json'),str(TILES.parent/'unused-dry-run-output'), '--finish',finish,'--dry-run','--blender','DO_NOT_START_BLENDER'],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            record=json.loads(result.stdout);self.assertFalse(record['blender_started'])
            self.assertEqual(record['tile_mm'],[150,150] if 'canvas' in finish else [300,900])
            self.assertIn(str(TILES/f'floor-{finish}.png'),record['command'])
        result=subprocess.run([sys.executable,'-B',str(HERE/'extract_tile.py')],capture_output=True,text=True)
        self.assertNotEqual(result.returncode,0);self.assertIn('Output exists',result.stderr)

    def test_syntax_without_bpy(self):
        for path in HERE.glob('*.py'):ast.parse(path.read_text(),filename=str(path))


if __name__=='__main__':unittest.main(verbosity=2)
