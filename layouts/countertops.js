import * as THREE from 'three';

const MODULES=new Set(['front-module','aluminum-front-kitchen','side-cabinet','aluminum-side-cabinet','simple-side-cabinet','active-side-cabinet']);

export async function createCountertopVisuals({renderer}){
 const texture=await new THREE.TextureLoader().loadAsync('assets/countertop-albero-surface.jpg?v=1');
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=texture.wrapT=THREE.MirroredRepeatWrapping;
 texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const material=new THREE.MeshStandardMaterial({name:'ALBERO melamine oak-grain surface',map:texture,color:0xffffff,roughness:.86,metalness:0,side:THREE.DoubleSide});
 material.userData.countertop='albero';

 return {apply(node,moduleId){
  if(!MODULES.has(moduleId))return;
  const [lo,hi]=node.userData.bounds,longAxis=hi[0]-lo[0]>hi[2]-lo[2]?0:2,crossAxis=longAxis===0?2:0;
  for(const original of [...node.children]){
   // Existing CAD material tags identify worktops, excluding bed decks, stool
   // lids, the flip-up side table and the cabinet's selectable plywood faces.
   if(!original.isMesh||!/oak|オーク材/i.test(original.material.name)||/koguchi/i.test(original.material.name))continue;
   const geometry=original.geometry,index=geometry.index.array,normal=geometry.attributes.normal,top=[],other=[];
   for(let i=0;i<index.length;i+=3){
    const face=[index[i],index[i+1],index[i+2]];
    (face.every(v=>normal.getY(v)>.8)?top:other).push(...face);
   }
   if(!top.length)continue;
   // Split the existing triangles without changing the board outline, sink
   // opening, thickness, underside or wood-coloured cut edge.
   const surfaceGeometry=geometry.clone();surfaceGeometry.setIndex(top);
   const position=surfaceGeometry.attributes.position,uv=surfaceGeometry.attributes.uv;
   for(let i=0;i<position.count;i++){
    const p=[position.getX(i),position.getY(i),position.getZ(i)];
    uv.setXY(i,(p[crossAxis]-lo[crossAxis])/440,(p[longAxis]-lo[longAxis])/1200);
   }
   uv.needsUpdate=true;geometry.setIndex(other);
   const surface=new THREE.Mesh(surfaceGeometry,material);surface.name='ALBERO worktop surface';
   surface.castShadow=original.castShadow;surface.receiveShadow=original.receiveShadow;
   surface.userData={countertopSurface:true,originalPosition:position.array.slice(),originalNormal:normal.array.slice()};
   node.add(surface);
  }
 }};
}
