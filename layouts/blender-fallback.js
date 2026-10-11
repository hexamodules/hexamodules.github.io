import * as THREE from 'three';
let manifest;
// Emergency source-mesh path only. These body/part assignments and PBR values
// come from the accepted GLBs; assets and the CAD geometry remain untouched.
export async function matchBlenderFallback(group,key,finish){
 manifest??=fetch(new URL('./blender-fallback-materials.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Fallback material table unavailable');return r.json()}).catch(e=>{manifest=null;throw e});
 const data=await manifest,table=data.models[key+'-'+(finish==='black'?'hexa':'birch')];
 const textures=new Set(),materials=new Map();
 if(!table)return textures;
 try{
 for(const id of new Set(Object.values(table).flatMap(x=>Object.values(x)))){
  const spec=data.specs[id],map=await new THREE.TextureLoader().loadAsync('assets/blender/'+spec.uri);textures.add(map);
  map.colorSpace=THREE.SRGBColorSpace;map.flipY=false;map.wrapS=map.wrapT=THREE.RepeatWrapping;
  const m=new THREE.MeshStandardMaterial({map,roughness:spec.roughness,metalness:0,side:THREE.DoubleSide,envMapIntensity:1.3});m.color.fromArray(spec.color);
  m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <envmap_physical_pars_fragment>',THREE.ShaderChunk.envmap_physical_pars_fragment.replace(/\benvMapIntensity\b/g,'(envMapIntensity * 1.3)'))};m.customProgramCacheKey=()=>'blender-fallback-plywood-v1';materials.set(id,m);
 }
 for(let bi=0;bi<group.userData.data.bodies.length;bi++){
  const node=group.children[bi],body=group.userData.data.bodies[bi];
  for(let pi=0;pi<body.parts.length;pi++){
   const spec=table[bi+':'+pi];if(!spec)continue;const mesh=node.children[pi],face=materials.get(spec.face??spec.edge),edge=materials.get(spec.edge??spec.face);
   mesh.material=face;
   // Retain original face UVs, as the studio-texture GLB export does. Split
   // triangles at the board edge so exposed ply uses the shared edge image.
   {
    const old=mesh.geometry,g=old.toNonIndexed(),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
    const spans=body.bounds[1].map((v,a)=>v-body.bounds[0][a]),thin=spans.indexOf(Math.min(...spans)),axes=[0,1,2].filter(a=>a!==thin).sort((a,b)=>spans[a]-spans[b]||a-b);
    const indices=[[],[]];g.clearGroups();for(let i=0;i<p.count;i+=3){const normal=[n.getX(i),n.getY(i),n.getZ(i)],isEdge=spec.face===undefined||(spec.edge!==undefined&&Math.abs(normal[thin])<.7);indices[isEdge?1:0].push(i,i+1,i+2);
     if(!isEdge&&finish==='black'&&data.specs[spec.face]?.hexa){for(let v=i;v<i+3;v++){const pos=[p.getX(v),p.getY(v),p.getZ(v)];uv.setXY(v,pos[axes[0]]/90,pos[axes[1]]/90)}}
     if(isEdge){const run=Math.abs(normal[axes[0]])>Math.abs(normal[axes[1]])?axes[1]:axes[0];for(let v=i;v<i+3;v++){const pos=[p.getX(v),p.getY(v),p.getZ(v)];uv.setXY(v,pos[run]/300,pos[thin]/15)}}}
    mesh.geometry=g;mesh.userData.originalPosition=p.array.slice();mesh.userData.originalNormal=n.array.slice();if(face!==edge&&indices[0].length&&indices[1].length){const edgeGeometry=g.clone();g.setIndex(indices[0]);edgeGeometry.setIndex(indices[1]);const edgeMesh=new THREE.Mesh(edgeGeometry,edge);edgeMesh.castShadow=mesh.castShadow;edgeMesh.receiveShadow=mesh.receiveShadow;edgeMesh.userData={...mesh.userData,blenderFallback:true};node.add(edgeMesh)}else{g.setIndex(indices[0].length?indices[0]:indices[1]);mesh.material=indices[0].length?face:edge}old.dispose();
   }
   mesh.userData.blenderFallback=true;
  }
 }
 group.userData.blenderFallback=true;return textures;
 }catch(error){for(const t of textures)t.dispose();for(const m of materials.values())m.dispose();throw error}
}
