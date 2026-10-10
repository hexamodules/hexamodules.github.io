import {NodeIO} from './dependencies/node_modules/@gltf-transform/core/dist/index.js';
import {ALL_EXTENSIONS} from './dependencies/node_modules/@gltf-transform/extensions/dist/index.js';
import {MeshoptDecoder} from './dependencies/node_modules/meshoptimizer/meshopt_decoder.mjs';
import fs from 'node:fs';
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const result=[];
for(const file of process.argv.slice(2)){
 const doc=await io.read(file),bounds=[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]];let triangles=0;
 for(const node of doc.getRoot().listNodes()){
  const mesh=node.getMesh();if(!mesh)continue;const m=node.getWorldMatrix();
  for(const p of mesh.listPrimitives()){
   triangles+=(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3;
   const pos=p.getAttribute('POSITION'),v=[];
   for(let i=0;i<pos.getCount();i++){pos.getElement(i,v);for(let k=0;k<3;k++){const x=m[k]*v[0]+m[4+k]*v[1]+m[8+k]*v[2]+m[12+k];bounds[0][k]=Math.min(bounds[0][k],x);bounds[1][k]=Math.max(bounds[1][k],x)}}
  }
 }
 result.push({file,bytes:fs.statSync(file).size,triangles,boundsMetres:bounds});
}
console.log(JSON.stringify(result,null,2));
