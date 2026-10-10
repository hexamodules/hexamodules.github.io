// Optional furniture assets. Original CAD metadata controls placement and motion.
// Replace <key>-birch.glb / <key>-hexa.glb in assets/blender; no size/hash manifest.
const unavailable=new Set();
export async function loadBlenderFurniture(transport,key,finish){
 const [{GLTFLoader},{MeshoptDecoder},THREE]=await Promise.all([
  import('./vendor/GLTFLoader.js'),import('./vendor/meshopt_decoder.module.js'),import('./vendor/three.module.js')]);
 const response=await fetch(`assets/${key}.mesh.json`);
 if(!response.ok)return null;
 const data=await response.json();
 for(const variant of finish==='black'?['hexa','birch']:['birch']){
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
     if(!mat.aoMap)throw Error('Missing occlusion map');
     mat.aoMap.channel=1;mat.aoMapIntensity=.55;mat.side=THREE.DoubleSide;
    }
   }
   const bounds=[box.min.toArray(),box.max.toArray()];
   const delta=Math.max(...bounds.flatMap((p,e)=>p.map((v,a)=>Math.abs(v-data.bounds[e][a]))));
   if(!Number.isFinite(delta)||delta>2)throw Error(`Outline differs by ${delta.toFixed(4)} mm (limit 2 mm)`);
   const group=new THREE.Group();group.name=key;group.visible=false;
   group.userData={data,moduleId:key,blenderFurniture:true,blenderVariant:variant,blenderBounds:bounds,blenderBoundsDelta:delta};
   // Preserve body identity if present. A merged I-Seat cannot select poses or
   // separate fixed rails from sliding upholstery; keep the original in that case.
   const identified=new Map();let complete=true;
   for(const mesh of meshes){
    let n=mesh,tag;while(n&&!tag){if(n.userData.source_body_index!==undefined)tag=n.userData;n=n.parent}
    const index=Number(tag?.source_body_index);
    if(!Number.isInteger(index)||!data.bodies[index]){complete=false;break}
    if(!identified.has(index))identified.set(index,[]);identified.get(index).push(mesh);
   }
   complete=complete&&identified.size===data.bodies.length;
   if(key==='i-seat'&&!complete)throw Error('I-Seat requires source_body_index for all poses/sliding parts');
   group.userData.blenderMerged=!complete;
   const add=(body,sources)=>{const node=new THREE.Group();node.name=body.name;node.userData={...body,initialBounds:body.bounds};
    for(const source of sources){const geometry=source.userData.mmGeometry;const mesh=new THREE.Mesh(geometry,source.material);mesh.castShadow=true;mesh.receiveShadow=true;
     mesh.userData={originalPosition:geometry.attributes.position.array.slice(),originalNormal:geometry.attributes.normal.array.slice(),blenderFurniture:true};node.add(mesh)}group.add(node)};
   if(complete){for(const [index,sources] of identified)add(data.bodies[index],sources)}
   else {
    add({name:key+' GLB',path:'',bounds:data.bounds},meshes);
    if(key==='aluminum-bed'){
     // Empty original body nodes preserve mattress dimensions. Only the small
     // CAD wall-infill contour is needed to build the same fitted cushion.
     for(const body of data.bodies)add(body,[]);
     const response=await fetch('assets/blender/aluminum-bed-mattress.json');
     if(!response.ok)throw Error('Missing mattress contour');
     for(const item of await response.json())for(const part of item.parts){
      const geometry=new THREE.BufferGeometry();geometries.add(geometry);
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(part.position,3));geometry.setIndex(part.index);
      const mesh=new THREE.Mesh(geometry,meshes[0].material);mesh.visible=false;
      group.children[item.body+1].add(mesh);
     }
    }
   }
   if(finish==='black'&&variant==='birch'){
    // patterns/*-black* are whole-van renders, not surface textures. Reuse the
    // established Hexa swatch crop, matching the furniture export pipeline.
    const surface=[...materials].filter(m=>m.name==='plywood-face');
    if(surface.length){
     const image=await new THREE.ImageLoader().loadAsync('assets/furniture-finish-hexa.webp');
     const canvas=document.createElement('canvas');canvas.width=360;canvas.height=280;
     canvas.getContext('2d').drawImage(image,120,20,360,280,0,0,360,280);
     const texture=new THREE.CanvasTexture(canvas);textures.add(texture);texture.colorSpace=THREE.SRGBColorSpace;
     texture.flipY=false;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(5,10);
     for(const mat of surface){mat.map=texture;mat.color.set('#ffffff');mat.roughness=.76;mat.needsUpdate=true}
    }
   }
   // Source geometries are no longer needed; transformed copies belong to group.
   for(const source of meshes){source.geometry.dispose();geometries.delete(source.geometry)}
   return {group,materials,textures,finish(){job.done=job.total;job.finished=true},fail(){dispose();job.finished=true}};
  }catch(error){dispose();unavailable.add(url);console.warn(`Blender furniture ${key}/${variant}: using fallback.`,error.message)}
  finally{if(job)job.finished=true}
 }
 return {data};
}
