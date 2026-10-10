import * as THREE from 'three';
import {getLanguage,translate} from './language.js?v=20261010-names';
import {STUDIO_MATTRESS_COLORS} from './mattress-state.js?v=2';
import {PIN_ANCHORS} from './base-configuration.js';
export function createPinStudio(api){
 const {scene,camera,controls,renderer,getState,apply,getGroup,keys,palettes,choices,modules,moduleNames}=api;
 const $=s=>document.querySelector(s),root=document.documentElement,stage=$('.stage');
 const t=s=>getLanguage()==='en'?translate(s):s;
 const names={floor:'床',ceiling:'天井',wall:'壁',front:'フロントモジュール',bed:'ベッドモジュール',left:'サイドモジュール'};
 const layer=document.createElement('div');layer.className='pin-layer';layer.dataset.moduleI18n='';stage.append(layer);
 const backdrop=document.createElement('div');backdrop.className='pin-backdrop';backdrop.hidden=true;
 const popup=document.createElement('section');popup.className='pin-popup';popup.hidden=true;popup.dataset.moduleI18n='';popup.setAttribute('role','dialog');popup.setAttribute('aria-modal','true');popup.setAttribute('aria-labelledby','pin-title');
 popup.innerHTML='<header><h2 id="pin-title"></h2><button type="button">×</button></header><div class="pin-options"></div>';
 document.body.append(backdrop,popup);const list=popup.querySelector('.pin-options');
 const card=document.createElement('div');card.className='pin-card-controls';card.dataset.moduleI18n='';$('#pane-interior').append(card);
 $('#pane-interior').append($('#studio-vehicle-compatibility'));
 const panel=$('.configuration'),cardToggle=document.createElement('button');cardToggle.className='pin-card-toggle';cardToggle.type='button';cardToggle.dataset.moduleI18n='';cardToggle.setAttribute('aria-expanded','false');panel.after(cardToggle);
 cardToggle.onclick=()=>{const on=panel.classList.toggle('card-expanded');cardToggle.setAttribute('aria-expanded',String(on));};
 const rotate=document.createElement('aside');rotate.className='landscape-prompt';rotate.dataset.moduleI18n='';
 rotate.innerHTML='<span class="rotate-icon" aria-hidden="true">↻<i></i></span><p></p><button type="button">×</button>';stage.append(rotate);
 const rotateText=rotate.querySelector('p'),rotateClose=rotate.querySelector('button');rotateClose.onclick=()=>{rotate.hidden=true;};
 const orientation=matchMedia('(orientation:portrait)');orientation.addEventListener('change',()=>{rotate.hidden=false;});
 const hint=document.createElement('p');hint.className='pin-hint';hint.dataset.moduleI18n='';stage.append(hint);
 const hintText=()=>t(matchMedia('(pointer:coarse)').matches?'マークをタップすると仕様を変更できます':'マークをクリックすると仕様を変更できます');
 const summary=document.createElement('ul');summary.className='pin-summary';summary.dataset.moduleI18n='';$('#studio-vehicle-compatibility').before(summary);
 let active=null,lastFocus=null,movingUntil=0,dragging=false,dirty=true,lastTick=0,hoverAfter=0;
 const anchors=new Map(),pins=new Map();
 for(const key of Object.keys(names)){const b=document.createElement('button');b.className='studio-pin';b.type='button';b.dataset.pin=key;b.setAttribute('aria-expanded','false');b.setAttribute('aria-haspopup','dialog');let hoverTimer;b.onclick=()=>{clearTimeout(hoverTimer);open(key);};b.onpointerenter=e=>{if(e.pointerType==='mouse'&&matchMedia('(hover:hover)').matches&&!active&&performance.now()>=hoverAfter)hoverTimer=setTimeout(()=>open(key),180);};b.onpointerleave=()=>clearTimeout(hoverTimer);layer.append(b);pins.set(key,b);}
 function occupied(key,s){return ({floor:s.floor!=='none',ceiling:s.vehicle==='super-gl'?s.twiCeiling!=='none':s.ceiling!=='none',wall:s.vehicle==='super-gl'?s.quarterPanels!=='none':s.wall!=='none'||s.panel!=='none',front:s.front!=='none',bed:s.bed!=='none',left:s.cab!=='none'||choices.FULL.includes(s.bed),right:s.bed!=='none',lights:s.ceilingLights||s.tailgateLights||s.twiCeiling!=='none',mattress:api.bedMattressEnabled(s)||api.frontMattressEnabled(s)})[key];}
 function model(key,s){return ({floor:keys.floor,ceiling:s.vehicle==='super-gl'?'twi-ceiling':keys.ceiling,wall:keys.wall,front:s.front,bed:s.bed,left:s.cab!=='none'?s.cab:choices.FULL.includes(s.bed)?s.bed:null,right:s.bed,mattress:s.bed})[key];}
 function refresh(){
  const s=getState();summary.replaceChildren();renderCard(s);hint.textContent=hintText();rotateText.textContent=t('横画面にしてください');rotateClose.setAttribute('aria-label',t('閉じる'));cardToggle.textContent=t('選択肢');
  for(const [key,b] of pins){
   b.textContent='';b.dataset.label=t(names[key]);b.setAttribute('aria-label',t(names[key])+': '+t(occupied(key,s)?'色を変える':'ここに置く'));
   const g=getGroup(model(key,s));let point=new THREE.Vector3(...(PIN_ANCHORS[key]||PIN_ANCHORS.seat));
   if(g?.visible&&g.userData.data?.bounds){const [lo,hi]=g.userData.data.bounds;point.set((lo[0]+hi[0])/2,lo[1]+(hi[1]-lo[1])*.82,(lo[2]+hi[2])/2);if(key==='mattress'){point.y=hi[1]+90;point.z=lo[2]+(hi[2]-lo[2])*.36;}if(key==='right'){point.x=lo[0]+(hi[0]-lo[0])*.15;point.z=lo[2]+(hi[2]-lo[2])*.25;}if(key==='left'&&choices.FULL.includes(s.bed))point.x=hi[0]-(hi[0]-lo[0])*.15;g.updateWorldMatrix(true,false);g.localToWorld(point);}
   anchors.set(key,point);
  }
  const label=k=>k==='none'?t('なし'):getLanguage()==='en'?(moduleNames[k]?.en||modules[k]?.en||t(k)):(moduleNames[k]?.ja||modules[k]?.name||t(k));
  for(const [title,value] of [['前側',label(s.front)],['ベッド',label(s.bed)],['サイドキャビネット',label(s.cab)],['床',paletteName('floor',s.floor)],['天井',s.vehicle==='super-gl'?t(s.twiCeiling==='none'?'なし':s.twiCeiling==='clear'?'クリア':'ウォールナット'):paletteName('ceiling',s.ceiling)],['壁',s.vehicle==='super-gl'?t(s.quarterPanels==='none'?'なし':'クォーターパネル'):paletteName('wall',s.wall==='none'?s.panel:s.wall)],['仕上げ',t(s.finish==='black'?'ヘキサ合板':'バーチ合板')],['ライト',t((s.ceilingLights||s.tailgateLights||s.twiCeiling!=='none')?'あり':'なし')],['マットレス',t((api.bedMattressEnabled(s)||api.frontMattressEnabled(s))?'あり':'なし')]]){const li=document.createElement('li'),a=document.createElement('strong'),v=document.createElement('span');a.textContent=t(title);v.textContent=value;li.append(a,v);summary.append(li);}
  dirty=true;
 }
 function renderCard(s){
  const focused=card.contains(document.activeElement)?document.activeElement.dataset.cardChoice:null;
  card.replaceChildren();
  function group(key,title,options){
   const field=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=t(title);field.append(legend);
   for(const [id,label,selected,patch,color,disabled] of options){const b=document.createElement('button');b.type='button';b.dataset.cardChoice=key+'-'+id;b.setAttribute('aria-pressed',String(selected));b.disabled=!!disabled;
    if(color){const dot=document.createElement('span');dot.className='pin-swatch';dot.style.background=color;b.append(dot);}
    const text=document.createElement('span');text.textContent=t(label);b.append(text);b.onclick=()=>apply(patch).catch(console.error);field.append(b);
   }card.append(field);
  }
  group('finish','仕上げ',[['birch','バーチ合板',s.finish==='birch',{finish:'birch'},'#d8c3a0'],['black','Hexa合板',s.finish==='black',{finish:'black'},'#34312f']]);
  const mattress=api.bedMattressEnabled(s)||api.frontMattressEnabled(s),available=api.bedMattressEnabled({...s,bedMattress:true})||s.front==='front-module';
  const toggle=(key,title,on,patch,disabled=false)=>group(key,title,[['on','あり',on,patch(true),null,disabled],['off','なし',!on,patch(false),null,disabled]]);
  toggle('mattress','マットレス',mattress,on=>({bedMattress:on,frontMattress:on,flat:on&&s.bed==='two-side-bed'}),!available);
  if(mattress){
   const colors=document.createElement('div');colors.className='pin-mattress-color';colors.setAttribute('role','group');colors.setAttribute('aria-label',t('マットレスの色'));
   const current=s.bedMattress?s.bedMattressColor:s.frontMattressColor;
   for(const c of STUDIO_MATTRESS_COLORS){
    const button=document.createElement('button'),dot=document.createElement('span');button.type='button';button.dataset.cardChoice='mattress-color-'+c.id;button.setAttribute('aria-label',getLanguage()==='en'?c.en:c.ja);button.setAttribute('aria-pressed',String(c.id===current));dot.className='pin-swatch';dot.style.background=c.hex;dot.setAttribute('aria-hidden','true');button.append(dot);
    button.onclick=()=>apply({bedMattressColor:c.id,frontMattressColor:c.id}).catch(console.error);colors.append(button);
   }card.append(colors);
  }
  if(s.vehicle!=='super-gl')toggle('ceilingLights','天井ダウンライト',s.ceilingLights,on=>({ceilingLights:on,...(on&&s.ceiling==='none'?{ceiling:'white-ash'}:{})}));
  else if(s.twiCeiling!=='none')for(const [key,title] of [['twiBarLights','天井バーライト'],['twiIndirectLights','間接照明']])toggle(key,title,s[key],on=>({[key]:on}));
  toggle('tailgateLights','バックドアライト',s.tailgateLights,on=>({tailgateLights:on,...(on&&s.vehicle!=='super-gl'&&s.panel==='none'?{panel:'white'}:{})}));
  if(focused)card.querySelector(`[data-card-choice="${focused}"]`)?.focus({preventScroll:true});
 }
 function paletteName(type,id){const c=palettes[type].find(c=>c.value===id);return t((type==='wall'?({white:'ホワイト',teffy:'テッフィ','volcanic-gray':'ボルカニックグレー'})[id]:c?.label||c?.name)||'なし');}
 function close(){if(!active)return;hoverAfter=performance.now()+500;pins.get(active).setAttribute('aria-expanded','false');active=null;popup.hidden=true;backdrop.hidden=true;lastFocus?.focus({preventScroll:true});}
 function row(label,note,selected,patch,color){const b=document.createElement('button');b.type='button';b.className='pin-option';b.setAttribute('aria-pressed',String(selected));if(color){const sw=document.createElement('span');sw.className='pin-swatch';sw.style.background=color;b.append(sw);}const text=document.createElement('span'),strong=document.createElement('strong');strong.textContent=t(label);text.append(strong);if(note){const small=document.createElement('small');small.textContent=t(note);text.append(small);}const check=document.createElement('span');check.className='pin-check';check.textContent=selected?'✓':'';b.append(text,check);b.onclick=()=>{close();apply(patch).catch(console.error);};list.append(b);return b;}
 const swatches={clear:'#d8c7a3',teak:'#a9774b',oak:'#c6a273',walnut:'#654b3e','light-canvas':'#c8c5b9','dark-canvas':'#73736b','white-ash':'#d8c7a3','black-cherry':'#a77952',white:'#fefefe',teffy:'#c5bbb5','volcanic-gray':'#74747a'};
 function renderOptions(key){
  list.replaceChildren();popup.querySelector('h2').textContent=t(names[key]);popup.querySelector('header button').setAttribute('aria-label',t('閉じる'));const s=getState();
  if(['floor','ceiling','wall'].includes(key)){
   if(s.vehicle==='super-gl'&&key!=='floor'){
    if(key==='ceiling')for(const id of ['clear','walnut','none'])row(id==='none'?'なし':id==='clear'?'クリア':'ウォールナット','',s.twiCeiling===id,{twiCeiling:id},swatches[id]);
    else for(const [id,n] of [['left','助手席側（左）'],['right','運転席側（右）'],['both','両側'],['none','なし']])row(n,'',s.quarterPanels===id,{quarterPanels:id});
   }else{
    for(const c of [...palettes[key]].sort((a,b)=>{const order=key==='floor'?['teak','oak','walnut','light-canvas','dark-canvas']:key==='wall'?['white','teffy','volcanic-gray']:['white-ash','walnut','black-cherry'];return order.indexOf(a.value)-order.indexOf(b.value);}))row(key==='wall'?({white:'ホワイト',teffy:'テッフィ','volcanic-gray':'ボルカニックグレー'})[c.value]:c.label||c.name,'',(key==='wall'&&s.wall==='none'?s.panel:s[key])===c.value,key==='wall'?(s.wall==='none'&&s.panel!=='none'?{panel:c.value}:{wall:c.value,panel:'auto'}):{[key]:c.value},swatches[c.value]);
    if(key==='wall')row('パネルのみ','',s.wall==='none'&&s.panel!=='none',{wall:'none',panel:s.wall!=='none'?s.wall:s.panel!=='none'?s.panel:'white'});
    if(key!=='floor')row('なし','',s[key]==='none'&&(key!=='wall'||s.panel==='none'),key==='wall'?{wall:'none',panel:'none'}:{[key]:'none'});
   }
  }else{
   const slot=key==='front'?'front':key==='left'?'cab':'bed';
   const ids=key==='front'?['seat','i-seat','front-module','aluminum-front-kitchen']:key==='left'?choices.CAB:[...choices.SINGLE,...choices.FULL];
   for(const id of key==='front'?ids:[...ids,'none']){let patch={[slot]:id};if(choices.FULL.includes(id))patch={bed:id,cab:'none'};else if(slot==='cab'&&choices.FULL.includes(s.bed))patch={bed:'none',cab:id};if(patch.bed!==undefined)Object.assign(patch,{bedMattress:patch.bed!=='none',flat:patch.bed==='two-side-bed'});if(patch.front!==undefined)patch.frontMattress=patch.front==='front-module';const n=moduleNames[id];row(id==='none'?'なし':getLanguage()==='en'?(n?.en||modules[id]?.en||id):(n?.ja||modules[id]?.name||id),getLanguage()==='en'?n?.noteEn:n?.noteJa,s[slot]===id,{...patch,expanded:false,frontExpanded:false,rearExpanded:false,storage:false});}

  }
 }
 function position(){if(!active)return;const r=pins.get(active).getBoundingClientRect();const w=popup.offsetWidth,h=popup.offsetHeight;let x=r.right+12;if(x+w>innerWidth-12)x=r.left-w-12;popup.style.left=Math.max(12,x)+'px';popup.style.top=Math.max(12,Math.min(innerHeight-h-12,r.bottom+h+12<=innerHeight?r.bottom+12:r.top-h-12))+'px';}
 function open(key){if(root.dataset.studioStep!=='interior')$('#tab-interior').click();close();active=key;lastFocus=pins.get(key);pins.get(key).setAttribute('aria-expanded','true');renderOptions(key);popup.hidden=false;backdrop.hidden=false;position();popup.querySelector('header button').focus({preventScroll:true});}
 backdrop.onclick=close;popup.querySelector('header button').onclick=close;
 document.addEventListener('keydown',e=>{if(!active)return;if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const buttons=[...popup.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 controls.addEventListener('start',()=>{dragging=true;close();});controls.addEventListener('end',()=>{dragging=false;movingUntil=performance.now()+220;dirty=true;});controls.addEventListener('change',()=>{movingUntil=performance.now()+180;dirty=true;});
 const ray=new THREE.Raycaster(),direction=new THREE.Vector3();
 function frame(now){requestAnimationFrame(frame);const hide=dragging||now<movingUntil||root.dataset.studioStep!=='interior'||root.classList.contains('intro-active')||root.classList.contains('outro-active');layer.hidden=hide;if(hide||document.hidden)return;if(!dirty)return;lastTick=now;dirty=false;camera.updateMatrixWorld();scene.updateMatrixWorld();const rect=stage.getBoundingClientRect();const blockers=scene.children.filter(g=>g.visible&&g.userData.data);const placed=[];
  for(const [key,b] of pins){const point=anchors.get(key),v=point.clone().project(camera);b.hidden=v.z< -1||v.z>1||Math.abs(v.x)>1||Math.abs(v.y)>1;if(b.hidden)continue;const ax=(v.x+1)*rect.width/2,ay=(1-v.y)*rect.height/2;let x=Math.max(24,Math.min(rect.width-24,ax)),y=Math.max(28,Math.min(rect.height-70,ay));const candidates=[];for(let dx=-5;dx<=5;dx++)for(let dy=-5;dy<=5;dy++)candidates.push({x:x+dx*44,y:y+dy*44,d:dx*dx+dy*dy});candidates.sort((a,b)=>a.d-b.d);const free=candidates.find(q=>q.x>=24&&q.x<=rect.width-24&&q.y>=28&&q.y<=rect.height-70&&!placed.some(p=>Math.hypot(q.x-p.x,q.y-p.y)<43));if(free){x=free.x;y=free.y;}placed.push({x,y});b.style.left=x+'px';b.style.top=y+'px';direction.copy(point).sub(camera.position);const distance=direction.length();ray.set(camera.position,direction.normalize());ray.far=distance-45;const occluded=ray.intersectObjects(blockers,true).some(hit=>{for(let n=hit.object;n;n=n.parent)if(!n.visible)return false;return true;});b.style.opacity=occluded?'.38':'1';}
  position();
 }
 window.addEventListener('studio-step-change',()=>{close();dirty=true;stage.querySelector('.pin-tip')?.remove();});window.addEventListener('studio-locale-change',()=>{refresh();if(active)renderOptions(active);});new ResizeObserver(()=>{dirty=true;position();hint.textContent=hintText();}).observe(stage);
 refresh();requestAnimationFrame(frame);
 return {refresh,open,openForModel(id){const s=getState();const key=id===keys.floor?'floor':id===keys.ceiling?'ceiling':id===keys.wall?'wall':id===s.front?'front':id===s.bed?'bed':'left';open(key);}};
}
