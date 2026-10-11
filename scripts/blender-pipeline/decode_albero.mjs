import fs from 'node:fs';
import path from 'node:path';
import {NodeIO} from './dependencies/node_modules/@gltf-transform/core/dist/index.js';
import {ALL_EXTENSIONS} from './dependencies/node_modules/@gltf-transform/extensions/dist/index.js';
import {MeshoptDecoder} from './dependencies/node_modules/meshoptimizer/meshopt_decoder.mjs';
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const out=[];
for(const file of fs.readdirSync(process.argv[2]).filter(x=>x.endsWith('.glb')).sort()){
 const doc=await io.read(path.join(process.argv[2],file));
 const bodies=new Set(doc.getRoot().listNodes().filter(n=>n.getMesh()?.listPrimitives().some(p=>p.getMaterial()?.getName().startsWith('ALBERO'))).map(n=>n.getExtras().source_body_index));
 for(const n of doc.getRoot().listNodes()){
  if(!n.getMesh()||!bodies.has(n.getExtras().source_body_index))continue;
  const m=n.getWorldMatrix();
  for(const [primitive,p] of n.getMesh().listPrimitives().entries()){
   const a=p.getAttribute('POSITION'),normal=p.getAttribute('NORMAL'),v=[],nv=[],points=[],normals=[];
   for(let i=0;i<a.getCount();i++){
    a.getElement(i,v);normal.getElement(i,nv);
    points.push([0,1,2].map(k=>1000*(m[k]*v[0]+m[k+4]*v[1]+m[k+8]*v[2]+m[k+12])));
    normals.push([0,1,2].map(k=>m[k]*nv[0]+m[k+4]*nv[1]+m[k+8]*nv[2]));
   }
   out.push({file,node:n.getName(),primitive,points,normals});
  }
 }
}
console.log(JSON.stringify(out));
