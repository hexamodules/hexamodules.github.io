// Read only: decode all primitive bounds and triangle areas by world axis.
import fs from 'node:fs';
import path from 'node:path';
import {NodeIO} from './dependencies/node_modules/@gltf-transform/core/dist/index.js';
import {ALL_EXTENSIONS} from './dependencies/node_modules/@gltf-transform/extensions/dist/index.js';
import {MeshoptDecoder} from './dependencies/node_modules/meshoptimizer/meshopt_decoder.mjs';
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const rows=[];
for(const file of fs.readdirSync(process.argv[2]).filter(x=>x.endsWith('-hexa.glb')).sort()) {
 const doc=await io.read(path.join(process.argv[2],file));
 for(const node of doc.getRoot().listNodes()) {
  if(!node.getMesh())continue;
  const m=node.getWorldMatrix();
  for(const [pi,p] of node.getMesh().listPrimitives().entries()) {
   const a=p.getAttribute('POSITION'),v=[],points=[],lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
   for(let i=0;i<a.getCount();i++) {a.getElement(i,v);const q=[0,1,2].map(k=>1000*(m[k]*v[0]+m[k+4]*v[1]+m[k+8]*v[2]+m[k+12]));points.push(q);q.forEach((x,k)=>{lo[k]=Math.min(lo[k],x);hi[k]=Math.max(hi[k],x)});}
   const indices=p.getIndices()?.getArray() || points.map((_,i)=>i),area=[0,0,0];
   for(let i=0;i<indices.length;i+=3){const [a,b,c]=[points[indices[i]],points[indices[i+1]],points[indices[i+2]]];const u=b.map((x,k)=>x-a[k]),v=c.map((x,k)=>x-a[k]);const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];n.forEach((x,k)=>area[k]+=Math.abs(x)/2);}
   const mat=p.getMaterial();rows.push({file,node:node.getName(),primitive:pi,extras:node.getExtras(),material:mat?.getName(),texture:mat?.getBaseColorTexture()?.getURI(),bounds:[lo,hi],axis_projected_area_mm2:area,...(process.argv.includes("--points") && mat?.getName().includes(":face-") ? {points_mm:points} : {})});
  }
 }
}
console.log(JSON.stringify(rows));
