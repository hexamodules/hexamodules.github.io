import * as THREE from 'three';
import {getLanguage,translate} from './language.js?v=20261010-names';
import {PIN_ANCHORS} from './base-configuration.js';
export function createPinStudio(api){
 const {scene,camera,controls,renderer,getState,apply,getGroup,keys,palettes,choices,modules,moduleNames}=api;
 const $=s=>document.querySelector(s),root=document.documentElement,stage=$('.stage');
 const t=s=>getLanguage()==='en'?translate(s):s;
 const names={floor:'床',ceiling:'天井',wall:'壁',seat:'前・シート',kitchen:'前・キッチン',bed:'ベッド',left:'後ろ左',right:'後ろ右',lights:'ライト',mattress:'マットレス'};
 const layer=document.createElement('div');layer.className='pin-layer';layer.dataset.moduleI18n='';stage.append(layer);
 const backdrop=document.createElement('div');backdrop.className='pin-backdrop';backdrop.hidden=true;
 const popup=document.createElement('section');popup.className='pin-popup';popup.hidden=true;popup.dataset.moduleI18n='';popup.setAttribute('role','dialog');popup.setAttribute('aria-modal','true');popup.setAttribute('aria-labelledby','pin-title');
 popup.innerHTML='<header><h2 id="pin-title"></h2><button type="button">×</button></header><div class="pin-options"></div>';
 document.body.append(backdrop,popup);const list=popup.querySelector('.pin-options');
 const summary=document.createElement('ul');summary.className='pin-summary';summary.dataset.moduleI18n='';$('#pane-interior').append(summary);
 let active=null,lastFocus=null,movingUntil=0,dragging=false,dirty=true,lastTick=0;
 const anchors=new Map(),pins=new Map();
 for(const key of Object.keys(names)){const b=document.createElement('button');b.className='studio-pin';b.type='button';b.dataset.pin=key;b.setAttribute('aria-expanded','false');b.setAttribute('aria-haspopup','dialog');b.onclick=()=>open(key);layer.append(b);pins.set(key,b);}
 function occupied(key,s){return ({floor:s.floor!=='none',ceiling:s.vehicle==='super-gl'?s.twiCeiling!=='none':s.ceiling!=='none',wall:s.vehicle==='super-gl'?s.quarterPanels!=='none':s.wall!=='none'||s.panel!=='none',seat:['seat','i-seat'].includes(s.front),kitchen:['front-module','aluminum-front-kitchen'].includes(s.front),bed:s.bed!=='none',left:s.cab!=='none'||choices.FULL.includes(s.bed),right:s.bed!=='none',lights:s.ceilingLights||s.tailgateLights||s.twiCeiling!=='none',mattress:api.bedMattressEnabled(s)||api.frontMattressEnabled(s)})[key];}
 function model(key,s){return ({floor:keys.floor,ceiling:s.vehicle==='super-gl'?'twi-ceiling':keys.ceiling,wall:keys.wall,seat:['seat','i-seat'].includes(s.front)?s.front:null,kitchen:['front-module','aluminum-front-kitchen'].includes(s.front)?s.front:null,bed:s.bed,left:s.cab!=='none'?s.cab:choices.FULL.includes(s.bed)?s.bed:null,right:s.bed,mattress:s.bed})[key];}
 function refresh(){
  const s=getState();summary.replaceChildren();
  for(const [key,b] of pins){
   b.textContent=occupied(key,s)?'⇄':'+';b.dataset.label=t(names[key]);b.setAttribute('aria-label',t(names[key])+': '+t(occupied(key,s)?'色を変える':'ここに置く'));
   const g=getGroup(model(key,s));let point=new THREE.Vector3(...PIN_ANCHORS[key]);
   if(g?.visible&&g.userData.data?.bounds){const [lo,hi]=g.userData.data.bounds;point.set((lo[0]+hi[0])/2,lo[1]+(hi[1]-lo[1])*.82,(lo[2]+hi[2])/2);if(key==='mattress'){point.y=hi[1]+90;point.z=lo[2]+(hi[2]-lo[2])*.36;}if(key==='right'){point.x=lo[0]+(hi[0]-lo[0])*.15;point.z=lo[2]+(hi[2]-lo[2])*.25;}if(key==='left'&&choices.FULL.includes(s.bed))point.x=hi[0]-(hi[0]-lo[0])*.15;g.updateWorldMatrix(true,false);g.localToWorld(point);}
   anchors.set(key,point);
  }
  const label=k=>k==='none'?t('なし'):getLanguage()==='en'?(moduleNames[k]?.en||modules[k]?.en||t(k)):(moduleNames[k]?.ja||modules[k]?.name||t(k));
  for(const [title,value] of [['前側',label(s.front)],['ベッド',label(s.bed)],['サイドキャビネット',label(s.cab)],['床',paletteName('floor',s.floor)],['天井',s.vehicle==='super-gl'?t(s.twiCeiling==='none'?'なし':s.twiCeiling==='clear'?'クリア':'ウォールナット'):paletteName('ceiling',s.ceiling)],['壁',s.vehicle==='super-gl'?t(s.quarterPanels==='none'?'なし':'クォーターパネル'):paletteName('wall',s.wall==='none'?s.panel:s.wall)]]){const li=document.createElement('li'),a=document.createElement('strong'),v=document.createElement('span');a.textContent=t(title);v.textContent=value;li.append(a,v);summary.append(li);}
  dirty=true;
 }
 function paletteName(type,id){const c=palettes[type].find(c=>c.value===id);return t((type==='wall'?({white:'ホワイト',teffy:'テッフィ','volcanic-gray':'ボルカニックグレー'})[id]:c?.label||c?.name)||'なし');}
 function close(){if(!active)return;pins.get(active).setAttribute('aria-expanded','false');active=null;popup.hidden=true;backdrop.hidden=true;lastFocus?.focus({preventScroll:true});}
 function row(label,note,selected,patch,color){const b=document.createElement('button');b.type='button';b.className='pin-option';b.setAttribute('aria-pressed',String(selected));if(color){const sw=document.createElement('span');sw.className='pin-swatch';sw.style.background=color;b.append(sw);}const text=document.createElement('span'),strong=document.createElement('strong');strong.textContent=t(label);text.append(strong);if(note){const small=document.createElement('small');small.textContent=t(note);text.append(small);}const check=document.createElement('span');check.className='pin-check';check.textContent=selected?'✓':'';b.append(text,check);b.onclick=()=>{close();apply(patch).catch(console.error);};list.append(b);return b;}
 const swatches={teak:'#a9774b',oak:'#c6a273',walnut:'#654b3e','light-canvas':'#c8c5b9','dark-canvas':'#73736b','white-ash':'#d8c7a3','black-cherry':'#a77952',white:'#fefefe',teffy:'#c5bbb5','volcanic-gray':'#74747a'};
 function renderOptions(key){
  list.replaceChildren();popup.querySelector('h2').textContent=t(names[key]);popup.querySelector('header button').setAttribute('aria-label',t('閉じる'));const s=getState();
  if(['floor','ceiling','wall'].includes(key)){
   if(s.vehicle==='super-gl'&&key!=='floor'){
    if(key==='ceiling')for(const id of ['clear','walnut','none'])row(id==='none'?'なし':id==='clear'?'クリア':'ウォールナット',id==='none'?'':'照明付き',s.twiCeiling===id,{twiCeiling:id},swatches[id]);
    else for(const [id,n] of [['left','助手席側（左）'],['right','運転席側（右）'],['both','両側'],['none','なし']])row(n,id==='none'?'':'クォーターパネル',s.quarterPanels===id,{quarterPanels:id});
   }else{
    for(const c of palettes[key])row(key==='wall'?({white:'ホワイト',teffy:'テッフィ','volcanic-gray':'ボルカニックグレー'})[c.value]:c.label||c.name,'',s[key]===c.value,key==='wall'?{wall:c.value,panel:'auto'}:{[key]:c.value},swatches[c.value]);
    if(key==='wall')row('パネルのみ','窓下3枚・溝なし',s.wall==='none'&&s.panel!=='none',{wall:'none',panel:s.wall!=='none'?s.wall:s.panel!=='none'?s.panel:'white'});
    row('なし','',s[key]==='none'&&(key!=='wall'||s.panel==='none'),key==='wall'?{wall:'none',panel:'none'}:{[key]:'none'});
   }
  }else if(key==='lights'){
   if(s.vehicle==='super-gl'&&s.twiCeiling!=='none')for(const [flag,n] of [['twiBarLights','天井バーライト'],['twiIndirectLights','間接照明']])row(n,s[flag]?'あり':'なし',s[flag],{[flag]:!s[flag]});
   if(s.vehicle!=='super-gl')row('天井ダウンライト',s.ceilingLights?'あり':'なし',s.ceilingLights,{ceilingLights:!s.ceilingLights,...(!s.ceilingLights&&s.ceiling==='none'?{ceiling:'white-ash'}:{})});
   row('バックドアライト',s.tailgateLights?'あり':'なし',s.tailgateLights,{tailgateLights:!s.tailgateLights,...(!s.tailgateLights&&s.vehicle!=='super-gl'&&s.panel==='none'?{panel:'white'}:{})});
   row('なし','',!s.ceilingLights&&!s.tailgateLights,{ceilingLights:false,tailgateLights:false,twiBarLights:false,twiIndirectLights:false});
  }else if(key==='mattress'){
   row('なし','',!api.bedMattressEnabled(s)&&!api.frontMattressEnabled(s),{bedMattress:false,frontMattress:false,flat:false});
  }else{
   const slot=['seat','kitchen'].includes(key)?'front':key==='left'?'cab':'bed';
   const ids=key==='seat'?['seat','i-seat']:key==='kitchen'?['front-module','aluminum-front-kitchen']:key==='left'?choices.CAB:[...choices.SINGLE,...choices.FULL];
   // Shared material selection keeps the original single-finish rule.
   for(const [id,n,color] of [['birch','バーチ合板','#d8c3a0'],['black','ヘキサ合板','#34312f']])row(n,'',s.finish===id,{finish:id},color);
   for(const id of [...ids,'none']){let patch={[slot]:id};if(choices.FULL.includes(id))patch={bed:id,cab:'none'};else if(slot==='cab'&&choices.FULL.includes(s.bed))patch={bed:'none',cab:id};if(patch.bed!==undefined)Object.assign(patch,{bedMattress:patch.bed!=='none',flat:patch.bed==='two-side-bed'});if(patch.front!==undefined)patch.frontMattress=patch.front==='front-module';const n=moduleNames[id];row(id==='none'?'なし':getLanguage()==='en'?(n?.en||modules[id]?.en||id):(n?.ja||modules[id]?.name||id),getLanguage()==='en'?n?.noteEn:n?.noteJa,s[slot]===id,{...patch,expanded:false,frontExpanded:false,rearExpanded:false,storage:false});}

  }
 }
 function position(){if(!active)return;const r=pins.get(active).getBoundingClientRect();const w=popup.offsetWidth,h=popup.offsetHeight;let x=r.right+12;if(x+w>innerWidth-12)x=r.left-w-12;popup.style.left=Math.max(12,x)+'px';popup.style.top=Math.max(12,Math.min(innerHeight-h-12,r.top-24))+'px';}
 function open(key){if(root.dataset.studioStep!=='interior')$('#tab-interior').click();close();active=key;lastFocus=pins.get(key);pins.get(key).setAttribute('aria-expanded','true');renderOptions(key);popup.hidden=false;backdrop.hidden=false;position();popup.querySelector('header button').focus({preventScroll:true});}
 backdrop.onclick=close;popup.querySelector('header button').onclick=close;
 document.addEventListener('keydown',e=>{if(!active)return;if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const buttons=[...popup.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 controls.addEventListener('start',()=>{dragging=true;close();});controls.addEventListener('end',()=>{dragging=false;movingUntil=performance.now()+220;dirty=true;});controls.addEventListener('change',()=>{movingUntil=performance.now()+180;dirty=true;});
 const ray=new THREE.Raycaster(),direction=new THREE.Vector3();
 function frame(now){requestAnimationFrame(frame);const hide=dragging||now<movingUntil||root.dataset.studioStep!=='interior'||root.classList.contains('intro-active')||root.classList.contains('outro-active');layer.hidden=hide;if(hide||document.hidden)return;if(!dirty&&now-lastTick<500)return;lastTick=now;dirty=false;camera.updateMatrixWorld();scene.updateMatrixWorld();const rect=stage.getBoundingClientRect();const blockers=scene.children.filter(g=>g.visible&&g.userData.data);const placed=[];
  for(const [key,b] of pins){const point=anchors.get(key),v=point.clone().project(camera);b.hidden=v.z< -1||v.z>1||Math.abs(v.x)>1||Math.abs(v.y)>1;if(b.hidden)continue;let x=(v.x+1)*rect.width/2,y=(1-v.y)*rect.height/2;for(let i=0;i<12&&placed.some(p=>Math.hypot(x-p.x,y-p.y)<42);i++){y+=i%2?-38:46;x+=i%2?18:-12;}x=Math.max(24,Math.min(rect.width-24,x));y=Math.max(28,Math.min(rect.height-70,y));placed.push({x,y});b.style.left=x+'px';b.style.top=y+'px';direction.copy(point).sub(camera.position);const distance=direction.length();ray.set(camera.position,direction.normalize());ray.far=distance-45;const occluded=ray.intersectObjects(blockers,true).some(hit=>{for(let n=hit.object;n;n=n.parent)if(!n.visible)return false;return true;});b.style.opacity=occluded?'.38':'1';}
  position();
 }
 window.addEventListener('studio-step-change',()=>{close();dirty=true;});window.addEventListener('studio-locale-change',()=>{refresh();if(active)renderOptions(active);});new ResizeObserver(()=>{dirty=true;position();}).observe(stage);
 refresh();requestAnimationFrame(frame);
 if(matchMedia('(max-width:850px) and (orientation:portrait)').matches){let shown=false;try{shown=sessionStorage.getItem('hexa-pin-hint')==='1';sessionStorage.setItem('hexa-pin-hint','1');}catch{}if(!shown){const tip=document.createElement('p');tip.className='pin-tip';tip.textContent=t('ピンに触れて選べます');stage.append(tip);setTimeout(()=>tip.remove(),6500);}}
 return {refresh,open,openForModel(id){const s=getState();const key=id===keys.floor?'floor':id===keys.ceiling?'ceiling':id===keys.wall?'wall':id===s.front?(['seat','i-seat'].includes(id)?'seat':'kitchen'):id===s.bed?'bed':'left';open(key);}};
}
