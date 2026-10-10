import json
import struct
import tempfile
import unittest
from pathlib import Path
from bounds_policy import bounds_changed,transform_rows
from compare_bounds import compare,decode

class BoundsTests(unittest.TestCase):
 def test_missing_duplicates_and_shifted(self):
  box=[[0,0,0],[10,10,10]]
  source={'bounds':box,'bodies':[{'name':'same','bounds':box} for _ in range(2)]}
  node={'name':'same','bounds':box,'extras':{}}
  self.assertFalse(compare(source,[node])['passed'])
  nodes=[dict(node,extras={'source_body_index':i}) for i in range(2)]
  self.assertTrue(compare(source,nodes)['passed'])
  self.assertEqual(compare(source,nodes[:1])['bodies'][1]['status'],'MISSING')
  nodes[0]['bounds']=[[3,0,0],[10,10,10]]
  self.assertEqual(compare(source,nodes)['bodies'][0]['status'],'SHIFTED')
 def test_policy(self):
  self.assertTrue(bounds_changed([[0]*3,[1]*3],None))
  self.assertTrue(bounds_changed([[0]*3,[1]*3],[[0]*3,[2]*3]))
  self.assertFalse(bounds_changed([[0]*3,[1]*3],[[0]*3,[1.01]*3]))
  self.assertEqual(transform_rows({'matrix':[[1,0,0],[0,1,0],[0,0,1]],'translation':[10,20,30]})[1],[0,1,0,20])
  with self.assertRaises(ValueError):transform_rows([1]*16)
 def test_decode_parent_matrix_and_child_trs(self):
  # Actual decoded vertices, not accessor min/max; parent rotation + child translation/scale.
  raw=struct.pack('<9f',0,0,0,1,0,0,0,1,0)
  doc={'asset':{'version':'2.0'},'scene':0,'scenes':[{'nodes':[0]}],
       'nodes':[{'matrix':[0,1,0,0,-1,0,0,0,0,0,1,0,1,2,3,1],'children':[1]},
                {'name':'part','translation':[1,0,0],'scale':[2,2,2],'mesh':0,'extras':{'source_body_index':0}}],
       'meshes':[{'primitives':[{'attributes':{'POSITION':0}}]}],
       'buffers':[{'byteLength':len(raw)}],'bufferViews':[{'buffer':0,'byteLength':len(raw)}],
       'accessors':[{'bufferView':0,'componentType':5126,'count':3,'type':'VEC3'}]}
  payload=json.dumps(doc).encode();payload+=b' '*((-len(payload))%4)
  glb=struct.pack('<III',0x46546c67,2,28+len(payload)+len(raw))+struct.pack('<II',len(payload),0x4e4f534a)+payload+struct.pack('<II',len(raw),0x004e4942)+raw
  with tempfile.TemporaryDirectory() as temp:
   p=Path(temp)/'test.glb';p.write_bytes(glb);nodes=decode(p)
  for actual,expected in zip(sum(nodes[0]['bounds'],[]),[-1000,3000,3000,1000,5000,3000]):
   self.assertAlmostEqual(actual,expected,places=8)
  self.assertEqual(nodes[0]['extras']['source_body_index'],0)

if __name__=='__main__':unittest.main()
