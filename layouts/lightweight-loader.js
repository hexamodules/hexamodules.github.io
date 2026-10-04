// Asset transport only. CAD metadata, materials and placement stay in app.js.
import {MeshoptDecoder} from './vendor/meshopt_decoder.module.js';
export function createAssetLoader(){
 const mobile=matchMedia('(max-width: 700px)').matches||(navigator.maxTouchPoints>0&&matchMedia('(pointer: coarse)').matches);
 const tier=mobile?'mobile':'pc',gzip=typeof DecompressionStream==='function';
 const vehicleKeys=new Set(['vehicle','vehicle-tailgate','vehicle-body-completion','vehicle-sliding-door','vehicle-front-passenger-door']);
 const jobs=new Map();let manifestPromise;
 function progress(){
  const node=document.querySelector('#loading p');if(!node||!jobs.size)return;
  const list=[...jobs.values()],total=list.reduce((s,j)=>s+j.total,0),done=list.reduce((s,j)=>s+j.done,0);
  const value=list.every(j=>j.finished)?100:Math.min(99,Math.floor(done/Math.max(1,total)*100));
  node.textContent=node.textContent.replace(/\s+\d+%$/,'')+` ${value}%`;
 }
 async function read(url,job){
  const response=await fetch(url);if(!response.ok)throw Error(`${response.status}: ${url}`);
  if(!response.body?.getReader){const buffer=await response.arrayBuffer();job.done+=buffer.byteLength;progress();return buffer}
  const reader=response.body.getReader(),chunks=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;chunks.push(value);size+=value.length;job.done+=value.length;progress()}}finally{reader.releaseLock()}
  const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length}return bytes.buffer;
 }
 function begin(key){
  if([...jobs.values()].every(j=>j.finished))jobs.clear();
  const job={done:0,total:1,finished:false};jobs.set(key,job);progress();return job;
 }
 async function load(key,revision=''){
  const compressed=vehicleKeys.has(key),id=compressed?`${key}.${tier}`:key,job=begin(key);
  try{
   manifestPromise??=fetch('assets/lightweight/manifest.json').then(r=>{if(!r.ok)throw Error('Asset manifest unavailable');return r.json()}).catch(e=>{manifestPromise=null;throw e});
   const manifest=await manifestPromise,info=manifest[id];
   if(!info)throw Error(`Missing asset manifest: ${id}`);
   job.total=info.json+(compressed&&gzip?info.gzip:info.binary);
   const base=compressed?'assets/lightweight/':'assets/';
   const data=JSON.parse(new TextDecoder().decode(await read(`${base}${id}.mesh.json${revision}`,job)));
   let buffer=await read(base+data.binary+(compressed&&gzip?'.gz':''),job);
   if(compressed){
    if(gzip){const bytes=new Uint8Array(buffer);if(bytes[0]===31&&bytes[1]===139)buffer=await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()}
    if(data.codec!=='meshopt-int32-v1')throw Error(`Unsupported mesh codec: ${data.codec}`);
    await MeshoptDecoder.ready;
   }
   return {data,buffer,finish(){job.done=job.total;job.finished=true;progress()},fail(){jobs.delete(key)}};
  }catch(error){jobs.delete(key);throw error}
 }
 function attribute(part,name,buffer){
  if(!part.meshopt){const T=name==='index'?Uint32Array:Float32Array;return new T(buffer,part[name][0],part[name][1]).slice()}
  const s=part.meshopt[name],raw=new Uint8Array(s.count*s.stride);
  MeshoptDecoder.decodeGltfBuffer(raw,s.count,s.stride,new Uint8Array(buffer,s.offset,s.length),s.mode);
  if(name==='index')return new Uint32Array(raw.buffer);
  return Float32Array.from(new Int32Array(raw.buffer),v=>v*s.scale);
 }
 return {load,attribute,tier,isVehicle:key=>vehicleKeys.has(key),textureURL:url=>mobile?url.replace(/^assets\/(?!mobile\/)/,'assets/mobile/'):url};
}
