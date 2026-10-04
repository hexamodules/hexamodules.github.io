import * as THREE from 'three';
// Presentation materials only. No dimensions, transforms or product selections change.
export function createVisualMaterials(renderer,scene){
 // Furniture birch only: linear RGB gain, approximately 13% darker in sRGB.
 const birchTone={value:new THREE.Vector3(.72,.72,.78)},birchFinish={value:1};
 function applyBirchTone(mat){
  const previous=mat.onBeforeCompile;
  mat.onBeforeCompile=shader=>{previous(shader);shader.uniforms.birchTone=birchTone;shader.uniforms.birchFinish=birchFinish;
   shader.fragmentShader='uniform vec3 birchTone; uniform float birchFinish;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','diffuseColor.rgb *= mix(vec3(1.0),birchTone,birchFinish);\n#include <roughnessmap_fragment>');
  };
 }
 const anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const texture=(canvas)=>{const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=anisotropy;return t};
 // Hexagonal anti-slip face, based on furniture-finish-hexa.webp. Pattern pitch
 // is illustrative: the source photograph is not a calibrated scale reference.
 const c=document.createElement('canvas');c.width=288;c.height=256;const x=c.getContext('2d');x.fillStyle='#292321';x.fillRect(0,0,288,256);
 for(let row=-1;row<9;row++)for(let col=-1;col<8;col++){const cx=col*48+(row%2)*24,cy=row*32;x.beginPath();for(let k=0;k<6;k++){const a=Math.PI/3*k;const px=cx+22*Math.cos(a),py=cy+17*Math.sin(a);k?x.lineTo(px,py):x.moveTo(px,py)}x.closePath();x.fillStyle='#3a302b';x.fill();x.save();x.clip();x.strokeStyle='#493d35';x.lineWidth=1;for(let n=-20;n<20;n++){x.beginPath();x.moveTo(cx-26,cy+n*4);x.lineTo(cx+26,cy+n*4+13);x.stroke()}x.restore()}
 const hexa=texture(c);hexa.colorSpace=THREE.SRGBColorSpace;hexa.repeat.set(5,10);const hexaBump=hexa.clone();hexaBump.colorSpace=THREE.NoColorSpace;hexaBump.needsUpdate=true;
 const e=document.createElement('canvas');e.width=128;e.height=128;const ex=e.getContext('2d');ex.fillStyle='#d7bf96';ex.fillRect(0,0,128,128);for(let i=0;i<10;i++){ex.fillStyle=i%2?'#cdb58d':'#e2cda8';ex.fillRect(0,i*12.8,128,11.6);ex.fillStyle='#aa916d';ex.fillRect(0,i*12.8+11.6,128,1.2)}const edge=texture(e);edge.colorSpace=THREE.SRGBColorSpace;
 // A small neutral studio environment supplies soft reflections for metal.
 // Generated once, shared by all materials; no HDR download or extra scene draw calls.
 const envScene=new THREE.Scene();envScene.background=new THREE.Color('#a3aaa6');
 for(const [position,scale,color] of [[[0,6,0],[8,.1,8],'#ffffff'],[[-5,2,1],[.1,5,6],'#dbe6ec'],[[4,2,-2],[.1,4,4],'#eee8da']]){const m=new THREE.Mesh(new THREE.BoxGeometry(...scale),new THREE.MeshBasicMaterial({color}));m.position.set(...position);envScene.add(m)}
 const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromScene(envScene,.12,.1,30);scene.environment=target.texture;pmrem.dispose();envScene.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});
 function material(mat,{woodKind,edge:cutEdge,metal,isVehicle,switchable,key}){
  if(isVehicle||/^interior-|lights/.test(key))return;
  mat.envMapIntensity=metal?.85:.18;
  if(metal){mat.metalness=.82;mat.roughness=/クロム|chrome/i.test(mat.name)?.20:.27;mat.color.multiplyScalar(.85)}
  mat.userData.visualWood=woodKind;mat.userData.visualBirch={value:woodKind?1:0};
  if(woodKind){mat.roughness=.68;if(cutEdge){mat.map=edge;mat.color.set('#ffffff');mat.userData.plyEdge=true}}
  if(switchable)mat.userData.visualHexa=true;
  mat.userData.birchTone=switchable||/birch/i.test(mat.name);
  if(mat.userData.birchTone)applyBirchTone(mat);
 }
 function finish(mat,isBirch,wood){birchFinish.value=isBirch?1:0;if(mat.userData.visualBirch)mat.userData.visualBirch.value=isBirch?1:0;mat.map=isBirch?wood:hexa;mat.bumpMap=isBirch?null:hexaBump;mat.bumpScale=isBirch?0:.12;mat.color.set('#ffffff');mat.roughness=isBirch?.68:.76;mat.envMapIntensity=.18;mat.needsUpdate=true}
 function mesh(mesh,bounds){
  const mat=mesh.material;if(!bounds||(!mat.userData.visualWood&&!mat.userData.visualHexa))return;
  // Separate face grain from the exposed laminate optically, with no new meshes.
  const ext=bounds[1].map((v,i)=>v-bounds[0][i]);const thin=ext.indexOf(Math.min(...ext)),long=ext.indexOf(Math.max(...ext));
  if(thin===long||ext[thin]>32||ext[thin]<3)return;
  const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
  const data=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){const pos=[p.getX(i),p.getY(i),p.getZ(i)],normal=[n.getX(i),n.getY(i),n.getZ(i)];data[i*3]=(pos[long]-bounds[0][long])/400;data[i*3+1]=(pos[thin]-bounds[0][thin])/20;data[i*3+2]=Math.abs(normal[thin])<.45?1:0}
  mesh.geometry.setAttribute('plySurface',new THREE.BufferAttribute(data,3));
  if(mat.userData.visualShader)return;mat.userData.visualShader=true;
  mat.onBeforeCompile=shader=>{shader.uniforms.plyEdgeMap={value:edge};shader.uniforms.visualBirch=mat.userData.visualBirch;
   shader.vertexShader='attribute vec3 plySurface; varying vec3 vPlySurface;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPlySurface=plySurface;');
   shader.fragmentShader='uniform sampler2D plyEdgeMap; uniform float visualBirch; varying vec3 vPlySurface;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.77,0.69,0.53),0.19*visualBirch);
    diffuseColor.rgb=mix(diffuseColor.rgb,texture2D(plyEdgeMap,vPlySurface.xy).rgb,smoothstep(0.4,0.8,vPlySurface.z));`);
  };if(mat.userData.birchTone)applyBirchTone(mat);mat.customProgramCacheKey=()=>(mat.userData.visualHexa?'hexa-ply-edge-v2':'birch-ply-edge-v2')+(mat.userData.birchTone?'-tone-v1':'');mat.needsUpdate=true;
 }

 function lighting(night){scene.environmentIntensity=night?.035:.6}
 return {material,finish,mesh,lighting};
}
