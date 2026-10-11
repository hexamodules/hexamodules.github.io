// All 13 furniture modules, two linked accessories and four complete front/rear variants. Original CAD metadata controls placement and motion.
// Replace <key>-birch.glb / <key>-hexa.glb in assets/blender; no size/hash manifest.
// 2026-10-10: both finishes approved by the owner; validate each loaded asset.
const unavailable=new Set();
export async function loadBlenderFurniture(transport,key,finish){
 const [{GLTFLoader},{MeshoptDecoder},THREE]=await Promise.all([
  import('./vendor/GLTFLoader.js'),import('./vendor/meshopt_decoder.module.js'),import('./vendor/three.module.js')]);
 const response=await fetch(`assets/${key}.mesh.json`);
 if(!response.ok)return null;
 const data=await response.json();
 for(const variant of finish==='black'?['hexa']:['birch']){
  const url=`assets/blender/${key}-${variant}.glb`;
  if(unavailable.has(url))continue;
  let job,gltf;const geometries=new Set(),materials=new Set(),textures=new Set();
  const dispose=()=>{for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures){t.dispose();t.source?.data?.close?.()}};
  try{
   job=transport.begin(key+'-'+variant);job.total=700000;
   const buffer=await transport.read(url,job);
   gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer,new URL('assets/blender/',location.href).href);
   gltf.scene.updateMatrixWorld(true);
   const meshes=[];gltf.scene.traverse(n=>{if(!n.isMesh)return;meshes.push(n);geometries.add(n.geometry);for(const m of [].concat(n.material)){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v)}});
   if(!meshes.length)throw Error('Empty furniture');
   const box=new THREE.Box3();
   for(const mesh of meshes){
    const geometry=mesh.geometry.clone();geometries.add(geometry);
    // Dequantize before applying the full glTF world transform and m -> mm.
    for(const name of ['position','normal']){
     const a=geometry.getAttribute(name);if(!a)throw Error('Missing '+name);
     const values=new Float32Array(a.count*3);
     for(let i=0;i<a.count;i++)values.set([a.getX(i),a.getY(i),a.getZ(i)],i*3);
     geometry.setAttribute(name,new THREE.BufferAttribute(values,3));
    }
    geometry.applyMatrix4(new THREE.Matrix4().makeScale(1000,1000,1000).multiply(mesh.matrixWorld));
    geometry.computeBoundingBox();box.union(geometry.boundingBox);mesh.userData.mmGeometry=geometry;
    if(!geometry.attributes.uv||!geometry.attributes.uv1)throw Error('Missing UV0/UV1');
    for(const mat of [].concat(mesh.material)){
     // Occlusion is optional: bright plywood faces intentionally omit it.
     if(mat.aoMap){mat.aoMap.channel=1;mat.aoMapIntensity=.35}
     mat.side=THREE.DoubleSide;
     // Lift plywood indirect light without changing the metal, fabric or global exposure.
     if(/^plywood-(?:face|edge)(?::|$)/.test(mat.name)){
      mat.envMapIntensity=1.3;
      // r180 substitutes scene.environmentIntensity when no explicit envMap is set.
      // Multiply that shared day/night intensity only in the plywood IBL shader.
      mat.onBeforeCompile=shader=>{
       shader.uniforms.plywoodEnvironmentBoost={value:mat.envMapIntensity};
       shader.fragmentShader='uniform float plywoodEnvironmentBoost;\n'+shader.fragmentShader;
       shader.fragmentShader=shader.fragmentShader.replace('#include <envmap_physical_pars_fragment>',THREE.ShaderChunk.envmap_physical_pars_fragment.replace(/\benvMapIntensity\b/g,'(envMapIntensity * plywoodEnvironmentBoost)'));
      };
      mat.customProgramCacheKey=()=>'plywood-environment-boost-v1';
     }
    }
   }
   const bounds=[box.min.toArray(),box.max.toArray()];
   const delta=Math.max(...bounds.flatMap((p,e)=>p.map((v,a)=>Math.abs(v-data.bounds[e][a]))));
   if(!Number.isFinite(delta)||delta>2)throw Error(`Outline differs by ${delta.toFixed(4)} mm (limit 2 mm)`);
   // Rear variants contain the complete front module plus its extension. Load and
   // validate them as one asset, so a fallback also replaces both together.
   const moduleId=data.base_module||key;
   const group=new THREE.Group();group.name=moduleId;group.visible=false;
   group.userData={data,moduleId:key==='centre-mattresses'?'two-side-bed':key==='lounge-fillers'?'lounge-bed':moduleId,blenderFurniture:true,blenderVariant:variant,blenderBounds:bounds,blenderBoundsDelta:delta};
   // CAD body metadata drives the same node transforms and cushion visibility in both formats.
   const identified=new Map();let complete=true;
   for(const mesh of meshes){
    let n=mesh,tag;while(n&&!tag){if(n.userData.source_body_index!==undefined)tag=n.userData;n=n.parent}
    const index=Number(tag?.source_body_index);
    if(!Number.isInteger(index)||!data.bodies[index]||tag.source_body_name!==data.bodies[index].name){complete=false;break}
    if(!identified.has(index))identified.set(index,[]);identified.get(index).push(mesh);
   }
   complete=complete&&identified.size===data.bodies.length;
   if(!complete)throw Error('Furniture requires source_body_index for all cushions, poses and sliding parts');
   group.userData.blenderMerged=!complete;
   const add=(body,sources)=>{const node=new THREE.Group();node.name=body.name;node.userData={...body,initialBounds:body.bounds};
    for(const source of sources){const geometry=source.userData.mmGeometry;const mesh=new THREE.Mesh(geometry,source.material);mesh.castShadow=true;mesh.receiveShadow=true;
     mesh.userData={originalPosition:geometry.attributes.position.array.slice(),originalNormal:geometry.attributes.normal.array.slice(),blenderFurniture:true};node.add(mesh)}group.add(node)};
   for(const [index,sources] of identified)add(data.bodies[index],sources);
   // Source geometries are no longer needed; transformed copies belong to group.
   for(const source of meshes){source.geometry.dispose();geometries.delete(source.geometry)}
   return {group,materials,textures,finish(){job.done=job.total;job.finished=true},fail(){dispose();job.finished=true}};
  }catch(error){dispose();unavailable.add(url);console.warn(`Blender furniture ${key}/${variant}: using fallback.`,error.message)}
  finally{if(job)job.finished=true}
 }
 return {data};
}
