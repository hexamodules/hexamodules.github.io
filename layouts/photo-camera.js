import * as THREE from 'three';

// Fit actual visible vertices, including open doors and furniture, in camera space.
// The cloned camera keeps the exact viewing direction and never updates OrbitControls.
export function photoCamera(source,models,bodyModels,width,height){
 const camera=source.clone(),inverse=source.quaternion.clone().invert();
 const collect=groups=>{
  const points=[];
  for(const group of groups){
   group.updateWorldMatrix(true,true);
   group.traverseVisible(node=>{
    if(!node.isMesh||!node.geometry.attributes.position)return;
    const materials=Array.isArray(node.material)?node.material:[node.material];
    if(materials.every(m=>!m.visible||m.opacity===0))return;
    const positions=node.geometry.attributes.position;
    const indices=node.geometry.index?new Set(node.geometry.index.array):Array.from({length:positions.count},(_,i)=>i);
    for(const i of indices){
     const p=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(node.matrixWorld).applyQuaternion(inverse);
     points.push([p.x,p.y,p.z]);
    }
   });
  }
  return points;
 };
 const points=collect(models),body=collect(bodyModels);
 if(!points.length||!body.length)throw Error('No vehicle to frame');
 camera.aspect=width/height;camera.zoom=1;camera.clearViewOffset();
 const tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
 // Reserve the central square for the entire vehicle and its badge.
 const side=Math.min(width,height),padding=side*.04,branding=side*(.03+.05+.016+.032*2+.016);
 const lift=branding/2;
 const limitX=((side-2*padding)/width)*tangent*camera.aspect,limitY=((side-2*padding-branding)/height)*tangent;
 let front=-Infinity;for(const p of points)front=Math.max(front,p[2]);
 function center(axis,distance){
  let offset=0;
  for(let pass=0;pass<16;pass++){
   let low=Infinity,high=-Infinity,a,b;
   for(const p of body){const value=(p[axis]-offset)/(distance-p[2]);if(value<low){low=value;a=p}if(value>high){high=value;b=p}}
   const da=distance-a[2],db=distance-b[2];
   const next=(a[axis]/da+b[axis]/db)/(1/da+1/db);
   if(Math.abs(next-offset)<1e-7)return next;offset=next;
  }
  return offset;
 }
 function fit(distance){
  const x=center(0,distance),y=center(1,distance);
  const fits=points.every(p=>Math.abs(p[0]-x)<=(distance-p[2])*limitX&&Math.abs(p[1]-y)<=(distance-p[2])*limitY);
  return {x,y,fits};
 }
 let low=front+Math.max(camera.near,1),high=low+10000;
 while(!fit(high).fits){high=front+(high-front)*2;if(high-front>1e8)throw Error('Photo fit failed')}
 for(let pass=0;pass<32;pass++){const mid=(low+high)/2;if(fit(mid).fits)high=mid;else low=mid}
 const {x,y}=fit(high);
 camera.position.set(x,y,high).applyQuaternion(source.quaternion);
 camera.far=Math.max(source.far,high-front+100000);
 camera.updateProjectionMatrix();
 // Lift the vehicle by half the reserved badge space; angle and shape stay intact.
 camera.projectionMatrix.elements[9]-=2*lift/height;
 camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
 camera.updateMatrixWorld();
 let bottom=-Infinity;
 for(const p of points){const projected=new THREE.Vector3(...p).applyQuaternion(source.quaternion).project(camera);bottom=Math.max(bottom,(1-projected.y)*height/2)}
 camera.userData.photoVehicleBottom=bottom;
 return camera;
}

export function capturePhoto({renderer,scene,camera,models,bodyModels,portrait=false,createCanvas=()=>document.createElement('canvas')}){
 const width=2000,height=2000;
 const photo=photoCamera(camera,models,bodyModels,width,height);
 const size=renderer.getSize(new THREE.Vector2()),ratio=renderer.getPixelRatio();
 const viewport=renderer.getViewport(new THREE.Vector4()),scissor=renderer.getScissor(new THREE.Vector4()),scissorTest=renderer.getScissorTest();
 try{
  renderer.setPixelRatio(1);renderer.setSize(width,height,false);renderer.setViewport(0,0,width,height);renderer.setScissorTest(false);
  renderer.render(scene,photo);
  const result=createCanvas();result.width=width;result.height=height;
  result.getContext('2d').drawImage(renderer.domElement,0,0);
  result.photoVehicleBottom=photo.userData.photoVehicleBottom;return result;
 }finally{
  renderer.setPixelRatio(ratio);renderer.setSize(size.x,size.y,false);
  renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);
  renderer.render(scene,camera);
 }
}
