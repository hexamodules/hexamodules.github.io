// Validate in-memory candidate GLBs; never writes a GLB or opens a browser.
import fs from 'node:fs';
import path from 'node:path';
import {NodeIO} from './dependencies/node_modules/@gltf-transform/core/dist/index.js';
import {ALL_EXTENSIONS} from './dependencies/node_modules/@gltf-transform/extensions/dist/index.js';
import {MeshoptDecoder} from './dependencies/node_modules/meshoptimizer/meshopt_decoder.mjs';
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const input=JSON.parse(fs.readFileSync(0,'utf8'));let primitives=0,uvs=0;
for(const entry of input.entries){
 const before=await io.read(path.join(input.directory,entry.name));
 const bytes=Buffer.from(entry.base64,'base64'),length=bytes.readUInt32LE(12);
 const json={json:JSON.parse(bytes.subarray(20,20+length).toString()),resources:{}};
 json.json.buffers[0].uri='candidate.bin';json.resources['candidate.bin']=bytes.subarray(28+length);
 for(const image of json.json.images || []) if(image.uri) json.resources[image.uri]=fs.readFileSync(path.join(input.directory,image.uri));
 const after=await io.readJSON(json);
 const bn=before.getRoot().listNodes().filter(n=>n.getMesh()),an=after.getRoot().listNodes().filter(n=>n.getMesh());
 if(bn.length!==an.length)throw Error('Node count');
 for(let n=0;n<bn.length;n++){
  const bp=bn[n].getMesh().listPrimitives(),ap=an[n].getMesh().listPrimitives();
  if(bp.length!==ap.length)throw Error('Primitive count');
  for(let i=0;i<bp.length;i++){
   primitives++;
   for(const attr of ['POSITION','NORMAL','TEXCOORD_1']){
    const a=bp[i].getAttribute(attr)?.getArray(),b=ap[i].getAttribute(attr)?.getArray();
    if(a?.length!==b?.length || a?.some((v,k)=>v!==b[k]))throw Error(entry.name+' changed '+attr);
   }
   const uv=ap[i].getAttribute('TEXCOORD_0');
   if(uv){uvs+=uv.getCount();if(uv.getCount()!==ap[i].getAttribute('POSITION').getCount() || uv.getArray().some(x=>!Number.isFinite(x)))throw Error('Invalid UV');}
  }
 }
}
console.log(JSON.stringify({models:input.entries.length,primitives,uv_vertices:uvs,geometry_unchanged:true,decoded:true}));
