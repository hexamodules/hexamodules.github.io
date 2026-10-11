import * as THREE from 'three';
// Starts only after the entrance has rendered. Existing lighting is the fallback.
export function scheduleStudioEnvironment(renderer,scene,onReady){
 let pending,hdr,target;
 const build=()=>{
  if(!hdr||renderer.getContext().isContextLost())return;
  const pmrem=new THREE.PMREMGenerator(renderer);
  try{const next=pmrem.fromEquirectangular(hdr);target?.dispose();target=next;scene.environment=target.texture;}
  finally{pmrem.dispose()}
  document.documentElement.dataset.environment='ready';onReady();
 };
 const load=()=>pending??=(async()=>{
  try{const {RGBELoader}=await import('./vendor/RGBELoader.js');
   // Keep the small CPU source for GPU context recovery, never reload on toggles.
   hdr=await new RGBELoader().loadAsync('assets/studio-small-09-1k.hdr');build();
  }catch(error){document.documentElement.dataset.environment='fallback';console.warn('Studio environment unavailable',error);}
 })();
 const restore=async()=>{await load();build()};
 const observer=new MutationObserver(()=>{if(['ready','complete'].includes(document.documentElement.dataset.introState)){observer.disconnect();setTimeout(load,0);}});
 observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-intro-state']});
 if(['ready','complete'].includes(document.documentElement.dataset.introState)){observer.disconnect();setTimeout(load,0);}
 return {load,restore};
}
export function contactShadow(scene){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');
 const gradient=ctx.createRadialGradient(64,64,12,64,64,64);gradient.addColorStop(0,'rgba(45,45,45,.24)');gradient.addColorStop(.65,'rgba(45,45,45,.12)');gradient.addColorStop(1,'rgba(45,45,45,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 const texture=new THREE.CanvasTexture(canvas);const plane=new THREE.Mesh(new THREE.PlaneGeometry(2400,5100),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));plane.rotation.x=-Math.PI/2;plane.position.set(0,-586,2000);plane.renderOrder=1;scene.add(plane);return plane;
}
