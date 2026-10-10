// Shared geometry for all five finishes. Original CAD metadata remains authoritative.
// The manifest must identify the filled source; an unfilled trial is never adopted.
export async function loadBlenderFloor(transport,key){
 let gltf,job;const geometries=new Map();
 const dispose=()=>{if(!gltf)return;const textures=new Set(),materials=new Set(),geometries=new Set();gltf.scene.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of [].concat(n.material||[])){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v)}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose()};
 try{
  const response=await fetch('assets/blender/floor.json');if(!response.ok)return null;
  const manifest=await response.json();
  if(manifest.sourceKey!==key||manifest.geometry!=='floor-oak.glb'||manifest.tile_mm?.[0]!==300||manifest.tile_mm?.[1]!==900)return null;
  const [{GLTFLoader},{MeshoptDecoder},THREE,data]=await Promise.all([
   import('./vendor/GLTFLoader.js'),import('./vendor/meshopt_decoder.module.js'),import('./vendor/three.module.js'),
   fetch(`assets/${key}.mesh.json`).then(r=>{if(!r.ok)throw Error('Floor metadata missing');return r.json()})
  ]);
  job=transport.begin('blender-floor');job.total=manifest.bytes||1000000;
  const buffer=await transport.read('assets/blender/'+manifest.geometry,job);
  gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer,new URL('assets/blender/',location.href).href);
  gltf.scene.updateMatrixWorld(true);
  for(const body of data.bodies){
   let source;gltf.scene.traverse(n=>{if(n.isMesh&&n.name===THREE.PropertyBinding.sanitizeNodeName(body.name+'_0'))source=n});
   if(!source||body.parts.length!==1||!source.geometry.attributes.uv||!source.geometry.attributes.uv1)throw Error('Floor body/UV metadata mismatch');
   const geometry=source.geometry.clone();
   // Meshopt quantization stores normalized integer attributes. Expand before mm transforms.
   for(const name of ['position','normal']){const a=geometry.getAttribute(name),values=new Float32Array(a.count*3);for(let i=0;i<a.count;i++){values[i*3]=a.getX(i);values[i*3+1]=a.getY(i);values[i*3+2]=a.getZ(i)}geometry.setAttribute(name,new THREE.BufferAttribute(values,3))}
   geometry.applyMatrix4(new THREE.Matrix4().makeScale(1000,1000,1000).multiply(source.matrixWorld));geometry.computeBoundingBox();
   const actual=[geometry.boundingBox.min.toArray(),geometry.boundingBox.max.toArray()];
   if(actual.some((p,e)=>p.some((v,a)=>!Number.isFinite(v)||Math.abs(v-body.bounds[e][a])>2))) {geometry.dispose();throw Error('Floor outline differs from filled source: '+body.name+' '+JSON.stringify({actual,expected:body.bounds}))}
   geometries.set(body.name,geometry);
  }
  dispose();gltf=null;
  return {data,geometries,finish(){for(const g of geometries.values())g.dispose();job.done=job.total;job.finished=true},fail(){for(const g of geometries.values())g.dispose();job.finished=true}};
 }catch(error){for(const g of geometries.values())g.dispose();dispose();if(job)job.finished=true;console.warn('Blender floor unavailable; using original filled floor.',error);return null}
}
