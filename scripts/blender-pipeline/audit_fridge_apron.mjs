// Read-only inspection of the refrigerator region, including signed face areas.
import fs from 'node:fs';
import path from 'node:path';
import {NodeIO} from './dependencies/node_modules/@gltf-transform/core/dist/index.js';
import {ALL_EXTENSIONS} from './dependencies/node_modules/@gltf-transform/extensions/dist/index.js';
import {MeshoptDecoder} from './dependencies/node_modules/meshoptimizer/meshopt_decoder.mjs';
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const rows=[];
for(const file of fs.readdirSync(process.argv[2]).filter(x=>/^front-module.*-hexa.glb$/.test(x)).sort()) {
 const doc=await io.read(path.join(process.argv[2],file));
 for(const n of doc.getRoot().listNodes()) {
  if(!n.getMesh())continue;
  const e=n.getExtras(),bounds=JSON.parse(e.source_bounds_mm);
  if(bounds[0][1]>58.02||bounds[1][1]<-.02||bounds[0][2]>2320.02||bounds[1][2]<1939.98)continue;
  for(const [primitive,p] of n.getMesh().listPrimitives().entries()) {
   const m=n.getWorldMatrix(),v=[],points=[],normals=[],uv=[];
   for(let i=0;i<p.getAttribute('POSITION').getCount();i++) {
    p.getAttribute('POSITION').getElement(i,v);
    points.push([0,1,2].map(k=>1000*(m[k]*v[0]+m[k+4]*v[1]+m[k+8]*v[2]+m[k+12])));
    p.getAttribute('NORMAL').getElement(i,v);
    normals.push([0,1,2].map(k=>m[k]*v[0]+m[k+4]*v[1]+m[k+8]*v[2]));
    uv.push(p.getAttribute('TEXCOORD_0')?.getElement(i,[])||[]);
   }
   const indices=Array.from(p.getIndices()?.getArray()||points.map((_,i)=>i));
   const signedAreas={};let regionTriangles=0;
   for(let i=0;i<indices.length;i+=3) {
    const t=indices.slice(i,i+3).map(j=>points[j]);
    if([1,2].some(k=>Math.min(...t.map(q=>q[k]))>(k===1?58.02:2320.02)||Math.max(...t.map(q=>q[k]))<(k===1?-.02:1939.98)))continue;
    regionTriangles++;
    const u=t[1].map((x,k)=>x-t[0][k]),v=t[2].map((x,k)=>x-t[0][k]);
    const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const k=cross.map(Math.abs).indexOf(Math.max(...cross.map(Math.abs))),key='XYZ'[k]+(cross[k]>=0?'+':'-');
    signedAreas[key]=(signedAreas[key]||0)+Math.hypot(...cross)/2;
   }
   if(!regionTriangles)continue;
   const mat=p.getMaterial();
   rows.push({file,node:n.getName(),primitive,extras:e,bounds,material:mat.getName(),texture:mat.getBaseColorTexture()?.getURI()||null,color:mat.getBaseColorFactor(),regionTriangles,signedAreas,points,normals,uv,indices});
  }
 }
}
fs.writeFileSync(process.argv[3],JSON.stringify(rows));
console.log(JSON.stringify(rows.map(({points,normals,indices,uv,...r})=>({...r,vertices:points.length})),null,2));
