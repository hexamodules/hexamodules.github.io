import * as THREE from 'three';

// Fit the complete open hatch and body between the copy and the Start button.
// Use each part's baked bounds, independently of its animated position.
export function openingCamera(camera,controls,models,options={}){
 const points=[];
 for(const model of models)for(const body of model.userData.data.bodies){
  const [min,max]=body.bounds;
  for(const x of [min[0],max[0]])for(const y of [min[1],max[1]])for(const z of [min[2],max[2]])points.push(new THREE.Vector3(x,y,z));
 }
 const center=new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3());
 const direction=new THREE.Vector3(...(options.direction||[3465,2563,-6138])).normalize();
 const cameraUp=new THREE.Vector3(...(options.up||[0,1,0]));
 const right=new THREE.Vector3().crossVectors(cameraUp,direction).normalize();
 const up=new THREE.Vector3().crossVectors(direction,right).normalize();
 const coordinates=points.map(point=>{const p=point.clone().sub(center);return [p.dot(right),p.dot(up),p.dot(direction)]});
 const centerCoordinates=[];
 for(const model of options.centerModels||[])for(const body of model.userData.data.bodies){
  const [a,b]=body.bounds;
  for(const x of [a[0],b[0]])for(const y of [a[1],b[1]])for(const z of [a[2],b[2]]){
   const p=new THREE.Vector3(x,y,z).sub(center);centerCoordinates.push([p.dot(right),p.dot(direction)]);
  }
 }
 return ()=>{
  const stage=document.querySelector('#viewport').getBoundingClientRect();
  const copy=document.querySelector(options.copySelector||'.opening-copy'),action=document.querySelector(options.actionSelector||'.opening-action');
  const landscape=!options.copySelector&&innerWidth<=850&&innerHeight<=600&&innerWidth>innerHeight;
  const area=options.fitArea?options.fitArea(stage):landscape?{left:305,right:stage.width-16,top:copy.offsetTop+copy.offsetHeight+12,bottom:stage.height-16}:
   {left:stage.width*.055,right:stage.width*.945,top:copy.offsetTop+copy.offsetHeight+22,bottom:action.offsetTop-24};
  const left=area.left/stage.width*2-1,rightEdge=area.right/stage.width*2-1;
  const top=1-area.top/stage.height*2,bottom=1-area.bottom/stage.height*2;
  camera.up.copy(cameraUp);
  const tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  // Centre the visible body silhouette under the logo. Open doors contribute
  // to the fit envelope, but must not pull the body away from the logo centre.
  const targetX=(options.fitArea?((area.left+area.right)/stage.width-1):((copy.getBoundingClientRect().left+copy.offsetWidth/2-stage.left)/stage.width*2-1))*tangent*camera.aspect;
  function centeredX(distance){
   let low=-30000,high=30000;
   for(let pass=0;pass<26;pass++){
    const mid=(low+high)/2;let min=Infinity,max=-Infinity;
    for(const [u,w] of centerCoordinates){const x=(u-mid)/(distance-w);min=Math.min(min,x);max=Math.max(max,x)}
    if((min+max)/2>targetX)low=mid;else high=mid;
   }
   return (low+high)/2;
  }
  // Solve the perspective-frustum inequalities. This also fits a van in the
  // off-centre region beside the text on short landscape screens.
  function limits(distance){
   let lowX=-Infinity,highX=Infinity,lowY=-Infinity,highY=Infinity;
   for(const [u,v,w] of coordinates){const y=(distance-w)*tangent,x=y*camera.aspect;
    lowX=Math.max(lowX,u-rightEdge*x);highX=Math.min(highX,u-left*x);
    lowY=Math.max(lowY,v-top*y);highY=Math.min(highY,v-bottom*y);
   }
   const centerX=centerCoordinates.length?centeredX(distance):(lowX+highX)/2;
   return {lowX,highX,lowY,highY,centerX,fits:lowX<=centerX&&centerX<=highX&&lowY<=highY};
  }
  let low=Math.max(...coordinates.map(p=>p[2]))+100,high=28000;
  for(let pass=0;pass<26;pass++){const mid=(low+high)/2;if(limits(mid).fits)high=mid;else low=mid}
  const distance=high*1.025,bounds=limits(distance);
  controls.target.copy(center).addScaledVector(right,bounds.centerX).addScaledVector(up,(bounds.lowY+bounds.highY)/2);
  camera.position.copy(controls.target).addScaledVector(direction,distance);camera.lookAt(controls.target);camera.updateMatrixWorld();controls.update();
 };
}
