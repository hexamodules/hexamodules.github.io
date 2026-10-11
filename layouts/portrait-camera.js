import * as THREE from 'three';

const bodyFrames=new WeakMap();
// Reuse body vertices during orbit; only the horizontal projection changes.
// Distance, zoom, vertical framing and the fixed orbit target stay untouched.
export function centerPortraitBody(camera,active){
 const frame=bodyFrames.get(camera);if(!frame)return;
 if(!(typeof active==='function'?active():active)){if(frame.shifted){camera.updateProjectionMatrix();frame.shifted=false}return}
 camera.updateMatrixWorld();camera.projectionMatrix.elements[8]=0;
 const matrix=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),p=new THREE.Vector3();
 let left=Infinity,right=-Infinity;
 for(const point of frame.points){p.fromArray(point).applyMatrix4(matrix);left=Math.min(left,p.x);right=Math.max(right,p.x)}
 if(!Number.isFinite(left+right))return;
 camera.projectionMatrix.elements[8]=(left+right)/2;
 camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();frame.shifted=true;
}


// Keep the existing full-vehicle fit, then centre the body rather than open doors.
// Called for presets/resizes only: orbit and pinch remain entirely user-controlled.
export function framePortrait(camera,controls,models,area){
 const inverse=camera.quaternion.clone().invert(),origin=controls.target.clone(),points=[],body=[];
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
    const point=[p.x,p.y,p.z];points.push(point);
    if(group.name==='vehicle'||group.name==='vehicle-body-completion')body.push(point);
   }
  });
 }
 if(!points.length)return;
 const tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
 const x0=(area.left+area.right-1)*tangent*camera.aspect,y0=(1-area.top-area.bottom)*tangent;
 const halfX=(area.right-area.left)*tangent*camera.aspect,halfY=(area.bottom-area.top)*tangent;
 function centered(axis,distance,screen,vertices=points){
  let offset=0;
  for(let pass=0;pass<12;pass++){
   let low=Infinity,high=-Infinity,a,b;
   for(const p of vertices){const v=(p[axis]-offset)/(distance-p[2]);if(v<low){low=v;a=p}if(v>high){high=v;b=p}}
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
 // Preserve the fitted camera distance and vertical framing; doors must not
 // pull the body left or cause a second fit that shrinks the vehicle.
 if(body.length)result.x=centered(0,distance,x0,body);
 // Put the orbit pivot at body depth, not on the old framing plane.
 let depth=0;
 if(body.length){let near=Infinity,far=-Infinity;for(const p of body){near=Math.min(near,p[2]);far=Math.max(far,p[2])}depth=(near+far)/2}
 const rotation=camera.quaternion.clone();
 controls.target.copy(new THREE.Vector3(result.x,result.y,depth).applyQuaternion(rotation).add(origin));
 camera.position.copy(new THREE.Vector3(result.x,result.y,distance).applyQuaternion(rotation).add(origin));
 bodyFrames.set(camera,{points:body.map(point=>new THREE.Vector3(...point).applyQuaternion(rotation).add(origin).toArray()),shifted:false});
 camera.updateMatrixWorld();controls.update();centerPortraitBody(camera,true);
}
