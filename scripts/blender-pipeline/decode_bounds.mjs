// Decode actual POSITION values, including Meshopt, and apply all parent transforms.
import {NodeIO} from './dependencies/node_modules/@gltf-transform/core/dist/index.js';
import {ALL_EXTENSIONS} from './dependencies/node_modules/@gltf-transform/extensions/dist/index.js';
import {MeshoptDecoder} from './dependencies/node_modules/meshoptimizer/meshopt_decoder.mjs';
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const doc=await io.read(process.argv[2]), nodes=[];
for(const node of doc.getRoot().listNodes()) {
 if(!node.getMesh())continue;
 const bounds=[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]],m=node.getWorldMatrix();let count=0;
 for(const p of node.getMesh().listPrimitives()) {
  const pos=p.getAttribute('POSITION'),v=[];
  for(let i=0;i<pos.getCount();i++) {pos.getElement(i,v);count++;
   for(let k=0;k<3;k++) {const x=1000*(m[k]*v[0]+m[4+k]*v[1]+m[8+k]*v[2]+m[12+k]);
    if(!Number.isFinite(x))throw new Error('Non-finite POSITION');
    bounds[0][k]=Math.min(bounds[0][k],x);bounds[1][k]=Math.max(bounds[1][k],x);
   }
  }
 }
 nodes.push({name:node.getName(),extras:node.getExtras(),bounds:count?bounds:null});
}
console.log(JSON.stringify(nodes));
