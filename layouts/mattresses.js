import * as THREE from 'three';

import {MATTRESS_BEDS,MATTRESS_COLORS,mattressColor,mattressIncluded,bedMattressEnabled,frontMattressEnabled} from './mattress-state.js?v=2';

export function createMattressControls({getState,getLanguage,onChange}){
 const text=(ja,en)=>getLanguage()==='en'?en:ja;
 function inline(key){
  const s=getState(),slot=key==='front-module'?'front':MATTRESS_BEDS.includes(key)?'bed':null;
  if(!slot||s[slot]!==key)return '';
  const included=slot==='bed'&&mattressIncluded(s),on=slot==='bed'?bedMattressEnabled(s):frontMattressEnabled(s);
  const color=mattressColor(s,slot);
  const title=slot==='bed'?text('専用マットレス','Fitted mattress'):text('収納上クッション','Storage cushion');
  const photo=`<img class="mattress-photo" src="assets/mattress-fabric.jpg" width="1000" height="667" alt="${text('ファブリックマットレスの使用例','Fabric mattress in a completed van')}" loading="lazy">`;
  return `<section class="mattress-options" data-mattress-module="${key}" data-module-i18n>
   ${included?`<div class="mattress-included"><span aria-hidden="true">✓</span><strong>${text('専用マットレス付き','Fitted mattress included')}</strong><small>${text('標準付属','Included')}</small></div>`:`<fieldset class="mattress-order-options"><legend>${title}</legend><label class="mattress-order"><input type="radio" name="${slot}-mattress-order" data-mattress-order="${slot}" value="none" ${!on?'checked':''}><span><strong>${text('なし','Without')}</strong></span></label><label class="mattress-order mattress-with"><input type="radio" name="${slot}-mattress-order" data-mattress-order="${slot}" value="with" ${on?'checked':''}><span><strong>${text('あり','With')}</strong></span></label></fieldset>`}
   ${on?`${photo}<p class="mattress-spec">${text('ウレタン80mm · ファブリック','80 mm foam · Fabric')}</p>`:''}
   ${on?`<fieldset class="mattress-colors"><legend>${text('カラー','Colour')} · ${text(color.ja,color.en)}</legend><div class="mattress-color-list">${MATTRESS_COLORS.map(c=>`<label class="mattress-color"><input type="radio" name="${slot}-mattress-color" data-mattress-color="${slot}" value="${c.id}" ${c.id===color.id?'checked':''}><img src="${c.image}" width="56" height="56" alt=""><span>${text(c.ja.replace(/^(ライト|ダーク)/,'$1<wbr>'),c.en)}</span></label>`).join('')}</div></fieldset>`:''}
   ${on?`<small class="mattress-view-note">${text('構造が見えるよう、3Dでは半透明で表示します。','Shown translucent in 3D so you can see the structure.')}</small>`:''}
  </section>`;
 }
 function summary(){
  const s=getState(),items=mattressLabels(s);
  return items.length?`<div id="mattress-summary" class="selection-row" data-module-i18n><span>${text('マットレス','Mattresses')}</span><b>${items.join('<br>')}</b></div>`:'';
 }
 function mattressLabels(s){
  const items=[];
  const color=slot=>{const c=mattressColor(s,slot);return text(c.ja,c.en)};
  if(bedMattressEnabled(s))items.push(text('ベッド専用 · 80mm','Fitted bed mattress · 80 mm')+' · '+color('bed')+' · '+(mattressIncluded(s)?text('標準付属','Included'):text('追加あり','Added')));
  if(frontMattressEnabled(s))items.push(text('フロント収納上 · 80mm','Front storage cushion · 80 mm')+' · '+color('front')+' · '+text('追加あり','Added'));
  return items;
 }
 document.addEventListener('change',async e=>{
  const colorSlot=e.target.dataset?.mattressColor;
  if(['bed','front'].includes(colorSlot)&&MATTRESS_COLORS.some(c=>c.id===e.target.value)){
   const value=e.target.value;await onChange({[colorSlot+'MattressColor']:value});
   document.querySelector(`[data-mattress-color="${colorSlot}"][value="${value}"]`)?.focus({preventScroll:true});return;
  }
  const slot=e.target.dataset?.mattressOrder;if(!['bed','front'].includes(slot))return;
  const value=e.target.value;if(!['none','with'].includes(value)||!e.target.checked)return;
  await onChange({[slot+'Mattress']:value==='with'});
  document.querySelector(`[data-mattress-order="${slot}"][value="${value}"]`)?.focus({preventScroll:true});
 });
 return {inline,summary,refresh(){
  for(const element of document.querySelectorAll('[data-mattress-module]'))element.outerHTML=inline(element.dataset.mattressModule);
  const old=document.querySelector('#mattress-summary');if(old)old.outerHTML=summary();
 }};
}

// Read the CAD top-face boundary rather than using a box around the entire module.
// Hardware holes and the comb deck's finger joints are bridged by the cushion.
const profiles=new WeakMap();
function topOutline(node){
 if(profiles.has(node))return profiles.get(node);
 const top=node.userData.bounds[1][1],edges=new Map(),points=new Map();
 for(const mesh of node.children){
  if(!mesh.isMesh)continue;
  const a=mesh.userData.originalPosition||mesh.geometry.attributes.position.array,indices=mesh.geometry.index.array;
  for(let i=0;i<indices.length;i+=3){
   const ids=[indices[i],indices[i+1],indices[i+2]];
   if(!ids.every(k=>Math.abs(a[k*3+1]-top)<.03))continue;
   const keys=ids.map(k=>{const p=[Math.round(a[k*3]*100)/100,Math.round(a[k*3+2]*100)/100],key=p.join(',');points.set(key,p);return key});
   for(let j=0;j<3;j++){const pair=[keys[j],keys[(j+1)%3]].sort(),key=pair.join('|');const entry=edges.get(key);if(entry)entry.count++;else edges.set(key,{pair,count:1})}
  }
 }
 const adjacent=new Map();
 for(const {pair:[a,b],count} of edges.values())if(count===1){if(!adjacent.has(a))adjacent.set(a,[]);if(!adjacent.has(b))adjacent.set(b,[]);adjacent.get(a).push(b);adjacent.get(b).push(a)}
 const seen=new Set(),loops=[];
 for(const start of adjacent.keys()){
  if(seen.has(start))continue;
  const loop=[];let current=start,previous=null;
  while(current&&!seen.has(current)){seen.add(current);loop.push(points.get(current));const next=adjacent.get(current)?.find(k=>k!==previous);previous=current;current=next}
  if(current===start&&loop.length>=3)loops.push(loop);
 }
 const area=p=>Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1]},0));
 loops.sort((a,b)=>area(b)-area(a));
 if(!loops.length)throw Error('Cushion top profile unavailable: '+node.name);
 profiles.set(node,loops[0]);return loops[0];
}
const rectangle=(x0,x1,z0,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
// Join adjoining deck sections into one cushion, retaining any width changes.
function continuousProfile(sections){
 const ordered=[...sections].sort((a,b)=>a.z0-b.z0);
 return [...ordered.flatMap(p=>[[p.x0,p.z0],[p.x0,p.z1]]),...ordered.reverse().flatMap(p=>[[p.x1,p.z1],[p.x1,p.z0]])];
}
const stretchedZ=(z,key,length)=>z+(length-(key==='lounge-bed'?1920:key==='lounge-slide-bed'?1816:1800))*Math.min(1,Math.max(0,(z-1250)/500));
function leftWallProfile(node,right,key,length){
 const points=topOutline(node).filter(p=>p[0]<-600).map(([x,z])=>[x,stretchedZ(z,key,length)]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
 const wall=[];for(const p of points)if(!wall.length||p[1]!==wall.at(-1)[1])wall.push(p);
 return [...wall,[right,wall.at(-1)[1]],[right,wall[0][1]]];
}
function roundedShape(profile){
 const points=profile.filter((p,i)=>i===0||Math.hypot(p[0]-profile[i-1][0],p[1]-profile[i-1][1])>.05).map(([x,z])=>new THREE.Vector2(x,-z));
 const shape=new THREE.Shape();
 for(let i=0;i<points.length;i++){
  const a=points[(i+points.length-1)%points.length],b=points[i],c=points[(i+1)%points.length];
  const r=Math.min(9,a.distanceTo(b)/3,b.distanceTo(c)/3),before=b.clone().lerp(a,r/b.distanceTo(a)),after=b.clone().lerp(c,r/b.distanceTo(c));
  if(i===0)shape.moveTo(before.x,before.y);else shape.lineTo(before.x,before.y);
  shape.quadraticCurveTo(b.x,b.y,after.x,after.y);
 }
 shape.closePath();return shape;
}
function fabricTexture(){
 const size=128,data=new Uint8Array(size*size*4);let seed=2317;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const warp=Math.cos(x*Math.PI/2),weft=Math.cos(y*Math.PI/2),over=(Math.floor(x/4)+Math.floor(y/4))%2;
  const v=Math.round(211+16*(over?warp:weft)+6*(over?weft:warp)+(seed>>>28)-8),i=(y*size+x)*4;
  data.set([v,v,v,255],i);
 }
 const t=new THREE.DataTexture(data,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
}
export function createMattressVisuals({renderer,onTextureReady=()=>{}}){
 const weave=fabricTexture();weave.colorSpace=THREE.SRGBColorSpace;weave.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const bump=weave.clone();bump.colorSpace=THREE.NoColorSpace;bump.needsUpdate=true;
 const materials=new Map(),loader=new THREE.TextureLoader();
 function materialsFor(id){
  if(materials.has(id))return materials.get(id);
  const color=MATTRESS_COLORS.find(c=>c.id===id)||MATTRESS_COLORS[1];
  const surface=new THREE.MeshStandardMaterial({name:'80mm '+color.id+' woven upholstery',color:color.hex,map:weave,bumpMap:bump,bumpScale:.28,roughness:.96,metalness:0,transparent:true,opacity:.68,depthWrite:false});
  surface.userData.mattressColor=color.id;
  const seam=new THREE.LineBasicMaterial({color:new THREE.Color(color.hex).multiplyScalar(.65),transparent:true,opacity:.38});
  const pair={surface,seam};materials.set(id,pair);
  loader.load(color.image,texture=>{
   texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=weave.anisotropy;
   surface.map=texture;surface.color.set('#ffffff');surface.needsUpdate=true;onTextureReady();
  });
  return pair;
 }
 const roots=new WeakMap();
 function cushion(root,profile,y,label){
  if(profile.length<3)return;
  const {surface:material,seam:seamMaterial}=materialsFor(root.userData.color);
  const shape=roundedShape(profile),geometry=new THREE.ExtrudeGeometry(shape,{depth:64,bevelEnabled:true,bevelThickness:8,bevelSize:3,bevelSegments:3,steps:1,curveSegments:4});
  geometry.rotateX(-Math.PI/2);geometry.translate(0,y+8,0);
  const pos=geometry.attributes.position,normal=geometry.attributes.normal,uv=geometry.attributes.uv;
  for(let i=0;i<pos.count;i++){
   if(Math.abs(normal.getY(i))>.5)uv.setXY(i,pos.getX(i)/64,pos.getZ(i)/64);
   else uv.setXY(i,(Math.abs(normal.getX(i))>.5?pos.getZ(i):pos.getX(i))/64,pos.getY(i)/64);
  }
  geometry.computeBoundingBox();
  const mesh=new THREE.Mesh(geometry,material);mesh.name=label;mesh.castShadow=false;mesh.receiveShadow=true;mesh.userData.mattress=true;mesh.userData.thickness_mm=80;root.add(mesh);
  const seam=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(shape.getPoints(4).map(p=>new THREE.Vector3(p.x,y+69,-p.y))),seamMaterial);seam.name=label+' seam';root.add(seam);
 }
 function ensure(group){
  let root=roots.get(group);if(root)return root;
  root=new THREE.Group();root.name='Fitted mattresses';root.userData={cushions:true,path:'Fitted mattresses',moduleId:group.userData.moduleId};group.add(root);roots.set(group,root);return root;
 }
 function rebuild(group,s,fit,length,allModels){
  const root=ensure(group),key=group.name,signature=JSON.stringify([key,length,s.expanded,s.frontExpanded,s.rearExpanded,s.flat,fit?.travel,fit?.front_travel,fit?.rear_travel]);
  if(root.userData.signature===signature)return root;
  for(const mesh of root.children)mesh.geometry.dispose();root.clear();root.userData.signature=signature;
  const nodes=group.children.filter(n=>!n.userData.cushions),add=(profile,y,label)=>cushion(root,profile,y,label);
  if(key==='front-module'){
   const top=nodes.find(n=>n.userData.source_root_index===21);
   if(!top)throw Error('Front storage top unavailable');
   const [lo,hi]=top.userData.bounds;add(rectangle(lo[0],hi[0],lo[2],hi[2]),hi[1],'Front storage cushion');
  }else if(key==='slide-bed'||key==='lounge-slide-bed'){
   const fixed=nodes.find(n=>key==='slide-bed'?n.name==='ボディ67':n.name.startsWith('Fixed comb top'));
   const moving=nodes.find(n=>key==='slide-bed'?n.name==='ボディ6 (1)':n.name.startsWith('Sliding comb top'));
   const right=moving.userData.bounds[1][0],profile=leftWallProfile(fixed,right,key,length),y=fixed.userData.bounds[1][1];
   add(profile,y,'Fixed bed cushion');
   if(s.expanded&&fit.travel>6){const z0=profile[0][1],z1=profile.at(-2)[1];add(rectangle(right+3,right+fit.travel,z0,z1),y,'Expanded bed cushion');}
  }else if(key==='aluminum-bed'){
   const fixedSections=[],expandedSections=[];let y;
   for(const [part,motion,path] of [['Rear',s.rearExpanded,'02 '],['Front',s.frontExpanded,'03 ']]){
    const moving=nodes.find(n=>n.userData.path.startsWith(path)&&n.name.startsWith('天板2'));
    const [lo,hi]=moving.userData.bounds,z0=lo[2],z1=hi[2],right=hi[0],travel=part==='Front'?fit.front_travel:fit.rear_travel;
    const fixed=nodes.find(n=>n.name.startsWith('天板1')&&Math.abs(n.userData.bounds[0][2]-lo[2])<1);
    y=hi[1];fixedSections.push({x0:fixed.userData.bounds[0][0],x1:right,z0,z1});
    if(motion&&travel>6)expandedSections.push({x0:right+3,x1:right+travel,z0,z1});
   }
   let fixedProfile=continuousProfile(fixedSections);
   // The wall-side infill is a separate CAD body (not named "天板"). Join its
   // outer contour to the cushion so the full fixed deck is covered, including
   // its tapered rear corner, without introducing a lengthwise mattress seam.
   const left=Math.min(...fixedSections.map(p=>p.x0)),z0=Math.min(...fixedSections.map(p=>p.z0)),z1=Math.max(...fixedSections.map(p=>p.z1));
   const infill=nodes.find(n=>{const [lo,hi]=n.userData.bounds;return Math.abs(hi[0]-left)<.05&&Math.abs(hi[1]-y)<.05&&hi[0]-lo[0]>1&&hi[2]-lo[2]>(z1-z0)/2});
   if(infill){
    const wall=topOutline(infill).filter(p=>p[0]<=left+.05&&p[1]>=z0&&p[1]<=z1).sort((a,b)=>a[1]-b[1]||a[0]-b[0]).filter((p,i,a)=>!i||Math.abs(p[1]-a[i-1][1])>.01);
    fixedProfile=[[left,z0],...wall.filter(p=>p[1]>z0),...(wall.at(-1)[1]<z1?[[left,z1]]:[]),...fixedProfile.filter(p=>p[0]>left+.05)];
   }
   add(fixedProfile,y,'Fixed bed cushion');
   if(expandedSections.length)add(continuousProfile(expandedSections),y,'Expanded bed cushion');
  }else if(key==='lounge-bed'){
   const top=nodes.find(n=>n.userData.source_root_index===13),y=top.userData.bounds[1][1];
   const fillers=allModels.find(g=>g.name==='lounge-fillers');
   for(const side of [-1,1]){
    const filler=fillers?.children.find(n=>n.userData.bounds&&(side<0?n.userData.bounds[0][0]<0:n.userData.bounds[0][0]>0));
    // Follow the outer filler contour; small joinery slots stay below the cover.
    const contour=filler?topOutline(filler).filter(p=>side*p[0]>650):[];
    const wall=contour.sort((a,b)=>a[1]-b[1]).filter((p,i,a)=>!i||p[1]!==a[i-1][1]);
    const profile=wall.length?[[side*645,0],...wall,[side*645,length],[side*200,length],[side*200,0]]:rectangle(side<0?-645:200,side<0?-200:645,0,length);
    add(profile,y,(side<0?'Driver':'Passenger')+' lounge cushion');
   }
   add(rectangle(-197,197,0,470),y,'Rear lounge cushion');
  }else if(key==='two-side-bed'){
   for(const node of nodes.filter(n=>n.userData.path.startsWith('Mattress - fixed')))add(topOutline(node),node.userData.bounds[0][1],node.name);
   if(s.flat){
    const centre=allModels.find(g=>g.name==='centre-mattresses'),sections=[];let y;
    for(const node of centre?.children||[]){const [lo,hi]=node.userData.bounds;y=lo[1];sections.push({x0:lo[0]+1.5,x1:hi[0]-1.5,z0:lo[2],z1:hi[2]});}
    if(sections.length)add(continuousProfile(sections),y,'Centre lounge cushion');
   }
  }
  return root;
 }
 return {update(models,s,fit,length){
  for(const group of models){
   // Replace the old grey 60 mm/visual stored mattresses, avoiding duplicates.
   if(group.name==='two-side-bed'||group.name==='centre-mattresses')for(const node of group.children)if(node.userData.path?.startsWith('Mattress -'))node.visible=false;
   const slot=group.name===s.bed&&MATTRESS_BEDS.includes(s.bed)?'bed':group.name==='front-module'&&s.front==='front-module'?'front':null;
   if(!slot)continue;
   const enabled=slot==='bed'?bedMattressEnabled(s):frontMattressEnabled(s);
   const existing=roots.get(group);if(existing)existing.visible=false;
   if(enabled){
    ensure(group).userData.color=mattressColor(s,slot).id;
    const root=rebuild(group,s,fit,length,models),pair=materialsFor(root.userData.color);
    for(const child of root.children)child.material=child.isMesh?pair.surface:pair.seam;
    root.visible=true;
   }
  }
 }};
}
