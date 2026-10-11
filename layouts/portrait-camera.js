import * as THREE from 'three';

// Centre the visible vehicle, including open doors, inside the portrait frame.
// Called for presets/resizes only: orbit and pinch remain entirely user-controlled.
export function framePortrait(camera,controls,models,area){
 const inverse=camera.quaternion.clone().invert(),origin=controls.target.clone(),points=[];
 for(const group of models){
  if(!group.visible)continue;
  group.updateWorldMatrix(true,true);
  group.traverseVisible(node=>{
   if(!node.isMesh||!node.geometry?.attributes.position)return;
   const materials=Array.isArray(node.material)?node.material:[node.material];
   if(materials.every(m=>!m.visible||m.opacity===0))return;
   const positions=node.geometry.attributes.position;
   for(let i=0;i<positions.count;i++){
    const p=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(node.matrixWorld).sub(origin).applyQuaternion(inverse);
    points.push([p.x,p.y,p.z]);
   }
  });
 }
 if(!points.length)return;
 const tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
 const x0=(area.left+area.right-1)*tangent*camera.aspect,y0=(1-area.top-area.bottom)*tangent;
 const halfX=(area.right-area.left)*tangent*camera.aspect,halfY=(area.bottom-area.top)*tangent;
 function centered(axis,distance,screen){
  let offset=0;
  for(let pass=0;pass<12;pass++){
   let low=Infinity,high=-Infinity,a,b;
   for(const p of points){const v=(p[axis]-offset)/(distance-p[2]);if(v<low){low=v;a=p}if(v>high){high=v;b=p}}
   const da=distance-a[2],db=distance-b[2],next=(a[axis]/da+b[axis]/db-2*screen)/(1/da+1/db);
   if(Math.abs(next-offset)<1e-6)return next;offset=next;
  }
  return offset;
 }
 function fit(distance){
  const x=centered(0,distance,x0),y=centered(1,distance,y0);
  return {x,y,fits:points.every(p=>{const d=distance-p[2];return d>camera.near&&Math.abs((p[0]-x)/d-x0)<=halfX&&Math.abs((p[1]-y)/d-y0)<=halfY})};
 }
 let distance=camera.position.distanceTo(controls.target),result=fit(distance);
 if(!result.fits){
  let low=distance,high=distance*2;
  while(!fit(high).fits&&high<100000)high*=2;
  for(let pass=0;pass<22;pass++){const mid=(low+high)/2;if(fit(mid).fits)high=mid;else low=mid}
  distance=high;result=fit(distance);
 }
 const rotation=camera.quaternion.clone();
 controls.target.copy(new THREE.Vector3(result.x,result.y,0).applyQuaternion(rotation).add(origin));
 camera.position.copy(new THREE.Vector3(result.x,result.y,distance).applyQuaternion(rotation).add(origin));
 camera.updateMatrixWorld();controls.update();
}
