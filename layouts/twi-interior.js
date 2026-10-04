import * as THREE from 'three';
// Photo-based presentation geometry. The common vehicle coordinates are mm;
// these dimensions are illustrative, not a TWI fabrication drawing.
export const TWI_KEYS={ceiling:'twi-hinoki-ceiling',left:'twi-quarter-left',right:'twi-quarter-right'};
// Rear edge and width are retained; the front edge is 150 mm shorter.
export const TWI_CEILING={left:-620,width:1190,rear:200,front:2620,thickness:9};
export const TWI_INDIRECT={intensity:850000,range_mm:1800,halo_opacity:.72,halo_spread_mm:52};
export function createTwiVisuals({ceilingTextures,ceilingFinishes,windowSurface,scene}) {
 const groups=new Map(),surfaces=[],timbers=[],emitters=[],diffusers=[],lightFrames=[],indirectLights=[],halos=[],panelMaterials=[];
 function rounded(x,y,w,h,r,Path=THREE.Shape){const s=new Path();s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s}
 const matte=(color)=>new THREE.MeshStandardMaterial({color,roughness:.94,metalness:0,side:THREE.DoubleSide});
 function add(group,geometry,material,position=[0,0,0],rotation=[0,0,0],name='part') {
  const transform=new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(1,1,1));
  geometry.applyMatrix4(transform);geometry.computeBoundingBox();const bounds=[geometry.boundingBox.min.toArray(),geometry.boundingBox.max.toArray()];
  const node=new THREE.Group();node.name=name;node.userData.bounds=bounds;
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=false;mesh.receiveShadow=true;node.add(mesh);group.add(node);group.userData.data.bodies.push({name,bounds});return node;
 }
 function surface(group,materials,normal,center,outsideOpacity=.075){surfaces.push({group,materials:[...new Set(materials)],normal:new THREE.Vector3(...normal),center:new THREE.Vector3(...center),outsideOpacity})}
 function ceiling(group){
  const materials=[];
  for(let board=0;board<10;board++){
   const left=-620+board*119;
   const shape=rounded(left,-TWI_CEILING.front,117,TWI_CEILING.front-TWI_CEILING.rear,board===0||board===9?24:2);
   const mat=matte('#ffffff');materials.push(mat);
   const edgeDrop=Math.pow(Math.abs(left+58)/620,2)*12;
   const node=add(group,new THREE.ExtrudeGeometry(shape,{depth:9,bevelEnabled:false,curveSegments:4}),mat,[0,1321-edgeDrop,0],[-Math.PI/2,0,0],`Hinoki board ${board+1}`);
   timbers.push({mat,geometry:node.children[0].geometry,board,left});
  }
  // Each side is one uninterrupted bar with an opal-white lens.
  const barStart=295,barEnd=TWI_CEILING.front-120,barCentre=(barStart+barEnd)/2;
  for(const x of [-325,275]){
   const surround=matte('#242727');materials.push(surround);lightFrames.push(surround);
   add(group,new THREE.BoxGeometry(27,6,barEnd-barStart),surround,[x,1313,barCentre],[0,0,0],'TWI continuous LED frame');
   const diffuser=matte('#f4f3ee');diffuser.emissive.set('#ffdbad');diffusers.push(diffuser);materials.push(diffuser);
   add(group,new THREE.BoxGeometry(17,2,barEnd-barStart-20),diffuser,[x,1309,barCentre],[0,0,0],'TWI opal LED lens');
   for(const z of [barStart+400,barEnd-400]){
    const lightNode=new THREE.Group();lightNode.name='TWI downward bar illumination';
    const light=new THREE.SpotLight('#ffdbad',3700000,3300,Math.PI/2.8,.85,2);light.position.set(x,1305,z);light.target.position.set(x,20,z);light.castShadow=false;lightNode.add(light,light.target);group.add(lightNode);emitters.push(light);
   }
  }
  const fastener=matte('#363735');materials.push(fastener);
  for(const x of [-546,496])for(const z of [330,1355,TWI_CEILING.front-130])add(group,new THREE.CylinderGeometry(5,5,2,10),fastener,[x,1308,z]);
  // A feathered reflected-light halo lies above the timber, not on its face.
  // This is a visual lighting preview, not a photometric calculation.
  const length=TWI_CEILING.front-TWI_CEILING.rear,haloWidth=1380,haloLength=length+170;
  const haloMaterial=new THREE.ShaderMaterial({uniforms:{halfBoard:{value:new THREE.Vector2(595,length/2)},planeSize:{value:new THREE.Vector2(haloWidth,haloLength)},strength:{value:TWI_INDIRECT.halo_opacity},spread:{value:TWI_INDIRECT.halo_spread_mm}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;uniform vec2 halfBoard;uniform vec2 planeSize;uniform float strength;uniform float spread;void main(){vec2 p=abs((vUv-.5)*planeSize);vec2 q=p-halfBoard;float d=length(max(q,0.0))+min(max(q.x,q.y),0.0);float a=exp(-pow((d-6.0)/spread,2.0))*strength;gl_FragColor=vec4(1.0,.72,.39,a);}',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false});
  const halo=add(group,new THREE.PlaneGeometry(haloWidth,haloLength),haloMaterial,[-25,1342,(TWI_CEILING.rear+TWI_CEILING.front)/2],[-Math.PI/2,0,0],'TWI indirect ceiling glow');halos.push(halo);
  for(const x of [-603,553])for(const z of [600,TWI_CEILING.front-400]){
   const node=new THREE.Group();node.name='TWI indirect illumination';
   const light=new THREE.PointLight('#ffd7a2',TWI_INDIRECT.intensity,TWI_INDIRECT.range_mm,2);light.position.set(x,1333,z);node.add(light);group.add(node);indirectLights.push(light);
  }
  surface(group,materials,[0,-1,0],[-25,1320,1450]);
  group.userData.ceilingSpec={...TWI_CEILING,length_mm:length,front_shortened_mm:150,light_bars:2,openings:0};
 }
 function windowX(y,z){const n=windowSurface.normalisation,Y=(y-n.y_origin)/n.y_scale,Z=(z-n.z_origin)/n.z_scale;return windowSurface.terms.reduce((sum,[i,j],k)=>sum+windowSurface.coefficients[k]*Y**i*Z**j,0)}
 function windowNormal(side,y,z){return new THREE.Vector3(-side,(windowX(y+.5,z)-windowX(y-.5,z)),(windowX(y,z+.5)-windowX(y,z-.5))).normalize()}
 function insetOutline(points,distance){
  // Clip against each inset half-plane. This remains convex even where the
  // original glass has tiny corner facets shorter than the inset distance.
  let polygon=points.map(p=>[...p]);
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
   const signed=p=>(-dy*(p[0]-a[0])+dx*(p[1]-a[1]))/len-distance,clipped=[];
   for(let j=0;j<polygon.length;j++){
    const p=polygon[j],q=polygon[(j+1)%polygon.length],dp=signed(p),dq=signed(q);
    if(dp>=0)clipped.push(p);
    if((dp>=0)!==(dq>=0)){const t=dp/(dp-dq);clipped.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])])}
   }
   polygon=clipped;
  }
  return polygon.filter((p,i)=>{const q=polygon[(i+1)%polygon.length];return Math.hypot(p[0]-q[0],p[1]-q[1])>.01});
 }
 function quarter(group,side){
  const outline=insetOutline(windowSurface.outline_zy,windowSurface.panel.perimeter_inset_mm);
  const contains=(u,v)=>outline.every((p,i)=>{const q=outline[(i+1)%outline.length];return (q[0]-p[0])*(v-p[1])-(q[1]-p[1])*(u-p[0])>=0});
  const shape=new THREE.Shape(outline.map(p=>new THREE.Vector2(...p)));shape.closePath();
  for(let row=0;row<11;row++)for(let col=0;col<34;col++){
   const u=200+col*38+(row%2?9:0),v=715+row*46;
   if(![[u-12,v-12],[u+17,v-12],[u+17,v+33],[u-12,v+33]].every(p=>contains(...p)))continue;
   shape.holes.push(rounded(u,v,5,21,2.5,THREE.Path));
  }
  const material=matte('#343a39');material.metalness=.24;material.roughness=.8;material.emissive.copy(material.color);panelMaterials.push(material);
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:windowSurface.panel.thickness_mm,bevelEnabled:false,curveSegments:3}),positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
   const z=positions.getX(i),y=positions.getY(i),depth=positions.getZ(i),x=windowX(y,z)-windowSurface.panel.glass_clearance_mm-depth;
   positions.setXYZ(i,side===1?x:-50-x,y,z);
  }
  geometry.computeVertexNormals();
  add(group,geometry,material,[0,0,0],[0,0,0],'TWI window-following slotted quarter panel');
  const bolt=matte('#777d79');bolt.metalness=.55;bolt.roughness=.4;
  for(const [z,y] of [[235,720],[1460,720],[1460,1228],[300,1228]]){
   const x=windowX(y,z)-8,rotation=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),windowNormal(side,y,z)));
   add(group,new THREE.CylinderGeometry(5,5,3,10),bolt,[side===1?x:-50-x,y,z],rotation.toArray().slice(0,3));
  }
  const centerX=windowX(970,825)-4.5;
  surface(group,[material,bolt],windowNormal(side,970,825).toArray(),[side===1?centerX:-50-centerX,970,825],0);
  group.userData.windowFit={...windowSurface.panel,source:windowSurface.source,fit_error_mm:windowSurface.fit_error_mm,slot_count:shape.holes.length};
 }
 function airconMount(bounds){
  // Align the unit's upper rear edge with the driver-side panel's upper edge.
  // Keep the unit plumb: it is translated, never tilted to follow the glass.
  const outline=insetOutline(windowSurface.outline_zy,windowSurface.panel.perimeter_inset_mm);
  const [min,max]=bounds,stations=Array.from({length:13},(_,i)=>min[2]+(max[2]-min[2])*i/12);
  function topAt(z){const heights=[];for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];if(z>=Math.min(a[0],b[0])&&z<=Math.max(a[0],b[0])&&Math.abs(b[0]-a[0])>1e-8)heights.push(a[1]+(b[1]-a[1])*(z-a[0])/(b[0]-a[0]))}return Math.max(...heights)}
  const top=Math.min(...stations.map(topAt));
  const panelFace=z=>-50-windowX(top,z)+windowSurface.panel.glass_clearance_mm+windowSurface.panel.thickness_mm;
  // The flat mounting edge is tangent to the innermost point of the curved
  // panel over the unit's width, with less than 1 mm of residual curvature.
  const back=Math.max(...stations.map(panelFace));
  if(!Number.isFinite(top)||!Number.isFinite(back))throw Error('Air conditioner lies outside the quarter panel span');
  return {revision:'supergl-quarter-upper-edge-v1',reference:'driver-side-quarter-panel-upper-edge',translation_mm:[back-min[0],top-max[1],0],rotation_deg:[0,0,0],top_mm:top,mounting_back_x_mm:back,upper_edge_gap_mm:stations.map(z=>back-panelFace(z)),bounds_mm:[min.map((v,i)=>v+([back-min[0],top-max[1],0][i])),max.map((v,i)=>v+([back-min[0],top-max[1],0][i]))]};
 }
 function get(key){
  if(groups.has(key))return groups.get(key);
  const group=new THREE.Group();group.name=key;group.visible=false;group.userData.data={bodies:[],source:{basis:'provided photographs',dimension_status:'illustrative'}};
  if(key===TWI_KEYS.ceiling)ceiling(group);else quarter(group,key===TWI_KEYS.left?1:-1);
  groups.set(key,group);scene.add(group);return group;
 }
 function updateState(s){
  const walnut=s.twiCeiling==='walnut';
  const finishKey=walnut?'walnut':'white-ash',finish=ceilingFinishes[finishKey],texture=ceilingTextures[finishKey];
  for(const {mat,geometry,board,left} of timbers){
   if(mat.map!==texture){
    const strip=finish.grain_strips_px[board%finish.grain_strips_px.length],start=strip[0]/finish.image_width,span=(strip[1]-strip[0])/finish.image_width,pos=geometry.attributes.position,uv=geometry.attributes.uv;
    for(let i=0;i<pos.count;i++)uv.setXY(i,start+Math.min(1,Math.max(0,(pos.getX(i)-left)/117))*span,(pos.getZ(i)-100)*span/87.1+board*.193);
    uv.needsUpdate=true;mat.map=texture;mat.emissiveMap=texture;
   }
   mat.color.set(0xffffff);mat.emissive.set(0xffffff);mat.emissiveIntensity=s.night?.018:.78;mat.toneMapped=!!s.night;mat.needsUpdate=true;
  }
  const enabled=s.night&&s.vehicle==='super-gl'&&s.twiCeiling!=='none',bars=enabled&&s.twiBarLights!==false,indirect=enabled&&s.twiIndirectLights!==false;
  for(const mat of lightFrames){mat.color.set('#242727');mat.metalness=.15;mat.roughness=.8;mat.emissive.copy(mat.color);mat.emissiveIntensity=.03}
  for(const light of emitters)light.visible=bars;
  for(const light of indirectLights)light.visible=indirect;
  for(const halo of halos)halo.visible=indirect;
  for(const mat of diffusers){mat.emissive.set(bars?'#ffdbad':'#f4f3ee');mat.emissiveIntensity=bars?3:s.night?0:.75;mat.toneMapped=!!s.night;mat.needsUpdate=true}
  for(const mat of panelMaterials)mat.emissiveIntensity=s.night?.01:.24;
 }
 function updatePresentation(camera){
  for(const entry of surfaces){
   entry.group.updateWorldMatrix(true,false);
   const center=entry.center.clone().applyMatrix4(entry.group.matrixWorld),normal=entry.normal.clone().transformDirection(entry.group.matrixWorld);
   const outside=normal.dot(camera.position.clone().sub(center))<0;
   for(const mat of entry.materials){const opacity=outside?entry.outsideOpacity:1;if(mat.transparent!==outside){mat.transparent=outside;mat.depthWrite=!outside;mat.needsUpdate=true}mat.opacity=opacity}
  }
 }
 return {get,updateState,updatePresentation,airconMount};
}
