import {moduleSpecificationName} from './module-names.js?v=20261011-front-shower';
import {twiCeilingLabel,quarterLabel} from './base-vehicle.js?v=20261011-twi-credit';
import {featuredViews} from './module-details-content.js?v=20261011-rear-slide';
import * as THREE from 'three';
import {getLanguage,translate} from './language.js?v=20261011-front-shower';
// Use the longstanding export as well as a versioned URL: older cached state files remain compatible.
import {MATTRESS_COLORS as STUDIO_MATTRESS_COLORS} from './mattress-state.js?v=20261010-five-colors';
import {I_SEAT_POSES,iSeatDefaultSlide} from './i-seat-state.js?v=6';
import {PIN_ANCHORS} from './base-configuration.js?v=20261011-super-gl-base';
export function createPinStudio(api){
 const {scene,camera,controls,renderer,getState,apply,getGroup,keys,palettes,choices,modules,moduleNames}=api;
 const $=s=>document.querySelector(s),root=document.documentElement,stage=$('.stage');
 const t=s=>getLanguage()==='en'?translate(s):s;
 const desktop=matchMedia('(min-width:851px)');
 const placeTitle=key=>key==='finish'?(getLanguage()==='en'?'Furniture finish':'家具の仕上げ'):key==='mattress'?t('マットレス'):t(names[key]);
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
 const hintLabel=document.createElement('span'),motionButton=document.createElement('button');motionButton.type='button';motionButton.className='pin-motion-toggle';motionButton.setAttribute('aria-haspopup','dialog');motionButton.setAttribute('aria-expanded','false');hint.append(hintLabel,motionButton);motionButton.onclick=()=>open('motion',motionButton);
 const completedMotion=document.createElement('button');completedMotion.id='outro-motion-toggle';completedMotion.type='button';completedMotion.dataset.moduleI18n='';completedMotion.setAttribute('aria-haspopup','dialog');completedMotion.setAttribute('aria-expanded','false');
 const completedHome=document.createElement('div');completedHome.className='outro-motion-home';$('#outro-night-toggle').after(completedHome);completedHome.append(completedMotion,$('#outro-night-toggle'));
 completedMotion.onclick=()=>open('motion',completedMotion);
 function placeCompletedMotion(){
  (desktop.matches?completedHome:$('.outro-buttons')).append(completedMotion);
  completedMotion.textContent=getLanguage()==='en'?'Try moving ▾':'動かしてみる ▾';
 }
 desktop.addEventListener('change',placeCompletedMotion);
 const hintText=()=>t(matchMedia('(pointer:coarse)').matches?'マークをタップするか、下のボタンから変更できます':'マークを押すか、下のボタンから変更できます');
 const summary=document.createElement('ul');summary.className='pin-summary';summary.dataset.moduleI18n='';$('#studio-vehicle-compatibility').before(summary);
 const summaryTitle=document.createElement('h2');summaryTitle.className='pc-summary-title';summaryTitle.dataset.moduleI18n='';summary.before(summaryTitle);
 let active=null,lastFocus=null,movingUntil=0,dragging=false,dirty=true,lastTick=0,hoverAfter=0;
 const portrait=matchMedia('(max-width:850px) and (orientation:portrait)');
 const accordion=document.createElement('div');accordion.className='portrait-controls';accordion.dataset.moduleI18n='';
 const groups=new Map(),mobileRows=new Map();
 const summaryHome=document.createComment('summary home');summary.before(summaryHome);
 const reset=$('#reset-view'),resetHome=document.createComment('reset home');reset.before(resetHome);
 const sectionLabels={modules:['モジュールの変更','Change modules'],interior:['内装の変更','Change interior'],spec:['選択された仕様を表示','Show selected specification']};
 for(const id of ['modules','interior','spec']){
  const section=document.createElement('section'),head=document.createElement('div'),button=document.createElement('button'),body=document.createElement('div');
  section.className='portrait-section';head.className='portrait-heading';button.type='button';button.dataset.portraitSection=id;button.setAttribute('aria-expanded','false');body.id='portrait-'+id;button.setAttribute('aria-controls',body.id);body.hidden=true;head.append(button);section.append(head,body);accordion.append(section);groups.set(id,{head,button,body});
  button.onclick=()=>{const opening=body.hidden;close();for(const g of groups.values()){g.body.hidden=true;g.button.setAttribute('aria-expanded','false');}body.hidden=!opening;button.setAttribute('aria-expanded',String(opening));};
 }
 for(const [key,group] of [['front','modules'],['left','modules'],['bed','modules'],['finish','modules'],['mattress','modules'],['wall','interior'],['ceiling','interior'],['floor','interior']]){
  const button=document.createElement('button'),title=document.createElement('span'),value=document.createElement('small'),body=document.createElement('div');button.type='button';button.className='portrait-row';button.dataset.portraitRow=key;button.setAttribute('aria-expanded','false');body.className='portrait-options';body.id='portrait-options-'+key;body.hidden=true;button.setAttribute('aria-controls',body.id);button.append(title,value);groups.get(group).body.append(button,body);mobileRows.set(key,{button,title,value,body,group});
  button.onclick=()=>{if(active===key){close();return;}open(key,button);};
 }
 $('#pane-interior').prepend(accordion);
 function refreshPortrait(){
  if(!portrait.matches)return;
  const en=getLanguage()==='en';
  for(const [id,g] of groups)g.button.textContent=sectionLabels[id][en?1:0];
  groups.get('spec').body.append(summary);groups.get('modules').head.append(reset);
  const values=[...summary.querySelectorAll('li span')].map(x=>x.textContent);
  for(const [key,r] of mobileRows){r.title.textContent=key==='finish'?(en?'Furniture finish':'家具の仕上げ'):key==='mattress'?t('マットレス'):t(names[key]);r.value.textContent=values[({front:0,bed:1,left:2,floor:3,ceiling:4,wall:5,finish:6,mattress:7})[key]];}
  const fields=[...card.children];
  mobileRows.get('finish').body.replaceChildren(...fields.slice(0,1));mobileRows.get('mattress').body.replaceChildren(...fields.slice(1));
 }
 portrait.addEventListener('change',()=>{close();if(!portrait.matches){summaryHome.after(summary);resetHome.after(reset);}refresh();});
 const anchors=new Map(),pins=new Map(),placeButtons=new Map([...stage.querySelectorAll('[data-place]')].map(b=>[b.dataset.place,b]));
 for(const [key,b] of placeButtons)b.onclick=()=>open(key,b);
 for(const key of Object.keys(names)){const b=document.createElement('button');b.className='studio-pin';b.type='button';b.dataset.pin=key;b.setAttribute('aria-expanded','false');b.setAttribute('aria-haspopup','dialog');let hoverTimer;b.onclick=()=>{clearTimeout(hoverTimer);open(key);};b.onpointerenter=e=>{if(e.pointerType==='mouse'&&matchMedia('(hover:hover)').matches&&!active&&performance.now()>=hoverAfter)hoverTimer=setTimeout(()=>open(key),180);};b.onpointerleave=()=>clearTimeout(hoverTimer);layer.append(b);pins.set(key,b);}
 function occupied(key,s){return ({floor:s.floor!=='none',ceiling:s.vehicle==='super-gl'?s.twiCeiling!=='none':s.ceiling!=='none',wall:s.vehicle==='super-gl'?s.quarterPanels!=='none':s.wall!=='none'||s.panel!=='none',front:s.front!=='none',bed:s.bed!=='none',left:s.cab!=='none'||choices.FULL.includes(s.bed),right:s.bed!=='none',lights:s.ceilingLights||s.tailgateLights||s.twiCeiling!=='none',mattress:api.bedMattressEnabled(s)||api.frontMattressEnabled(s)})[key];}
 function model(key,s){return ({floor:keys.floor,ceiling:s.vehicle==='super-gl'?'twi-ceiling':keys.ceiling,wall:keys.wall,front:s.front,bed:s.bed,left:s.cab!=='none'?s.cab:choices.FULL.includes(s.bed)?s.bed:null,right:s.bed,mattress:s.bed})[key];}
 function refresh(){
  placeCompletedMotion();const s=getState();summary.replaceChildren();renderCard(s);hintLabel.textContent=hintText();motionButton.textContent=getLanguage()==='en'?'Move ▾':'動かす ▾';rotateText.textContent=t('横画面にしてください');rotateClose.setAttribute('aria-label',t('閉じる'));cardToggle.textContent=t('選択肢');
  for(const [key,b] of pins){
   b.textContent='';b.dataset.label=t(names[key]);b.setAttribute('aria-label',t(names[key])+': '+t(occupied(key,s)?'色を変える':'ここに置く'));
   const g=getGroup(model(key,s));let point=new THREE.Vector3(...(PIN_ANCHORS[key]||PIN_ANCHORS.seat));
   if(g?.visible&&g.userData.data?.bounds){const [lo,hi]=g.userData.data.bounds;point.set((lo[0]+hi[0])/2,lo[1]+(hi[1]-lo[1])*.82,(lo[2]+hi[2])/2);if(key==='mattress'){point.y=hi[1]+90;point.z=lo[2]+(hi[2]-lo[2])*.36;}if(key==='right'){point.x=lo[0]+(hi[0]-lo[0])*.15;point.z=lo[2]+(hi[2]-lo[2])*.25;}if(key==='left'&&choices.FULL.includes(s.bed))point.x=hi[0]-(hi[0]-lo[0])*.15;g.updateWorldMatrix(true,false);g.localToWorld(point);}
   anchors.set(key,point);
  }
  const label=k=>k==='none'?t('なし'):getLanguage()==='en'?(moduleSpecificationName(k,'en')||modules[k]?.en||t(k)):(moduleSpecificationName(k)||modules[k]?.name||t(k));
  for(const [title,value] of [['前側',label(s.front)],['ベッド',label(s.bed)],['サイドキャビネット',label(s.cab)],['床',paletteName('floor',s.floor)],['天井',s.vehicle==='super-gl'?t(twiCeilingLabel(s)):paletteName('ceiling',s.ceiling)],['壁',s.vehicle==='super-gl'?t(quarterLabel(s)):s.wall!=='none'?t('壁面板張り仕上げ')+' · '+paletteName('wall',s.wall):s.panel!=='none'?t('パネルのみ')+' · '+paletteName('wall',s.panel):t('なし')],['仕上げ',t(s.finish==='black'?'ヘキサ合板':'バーチ合板')],['マットレス',t((api.bedMattressEnabled(s)||api.frontMattressEnabled(s))?'あり':'なし')]]){const li=document.createElement('li'),a=document.createElement('strong'),v=document.createElement('span');a.textContent=t(title);v.textContent=value;li.append(a,v);summary.append(li);}
  summaryTitle.textContent=getLanguage()==='en'?'Selected specification':'選択された仕様';
  if(s.vehicle==='super-gl'){const label=getLanguage()==='en'?'Reset to base configuration':'ベース構成に戻す';reset.title=label;reset.setAttribute('aria-label',label);}
  for(const key of ['finish','mattress'])placeButtons.get(key).textContent=placeTitle(key);
  if(desktop.matches){
   const color=STUDIO_MATTRESS_COLORS.find(c=>c.id===(s.bedMattress?s.bedMattressColor:s.frontMattressColor));
   if(color&&(api.bedMattressEnabled(s)||api.frontMattressEnabled(s)))summary.lastElementChild.querySelector('span').textContent+=' · '+(getLanguage()==='en'?color.en:color.ja);
   renderDesktopControls();
  }
  if(s.bed==='two-side-bed'){const li=document.createElement('li'),label=document.createElement('strong'),value=document.createElement('span');label.textContent=t('後部スライド');value.textContent=t('付属');li.append(label,value);summary.append(li);}
  refreshPortrait();
  if(active){renderMotion(active);position();}
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
    button.onclick=()=>apply({bedMattressColor:c.id,frontMattressColor:c.id,iSeatColor:c.id,iSeatMatchMattress:false}).catch(console.error);colors.append(button);
   }card.append(colors);
  }
  if(focused)card.querySelector(`[data-card-choice="${focused}"]`)?.focus({preventScroll:true});
 }
 function renderDesktopControls(){
  if(!desktop.matches||!['finish','mattress'].includes(active))return;
  const focused=list.contains(document.activeElement)?document.activeElement.dataset.cardChoice:null;
  const fields=[...card.children],body=document.createElement('div');body.className='pin-card-controls';
  body.append(...(active==='finish'?fields.slice(0,1):fields.slice(1)));list.replaceChildren(body);
  if(focused)list.querySelector(`[data-card-choice="${focused}"]`)?.focus({preventScroll:true});
 }
 desktop.addEventListener('change',()=>{close();refresh();});
 function paletteName(type,id){const c=palettes[type].find(c=>c.value===id);return t((type==='wall'?({white:'ホワイト',teffy:'テッフィ','volcanic-gray':'ボルカニックグレー'})[id]:c?.label||c?.name)||'なし');}
 function close(){if(!active)return;for(const r of mobileRows.values()){r.body.hidden=true;r.button.setAttribute('aria-expanded','false');}document.body.append(popup);popup.classList.remove('portrait-inline');popup.setAttribute('role','dialog');popup.setAttribute('aria-modal','true');hoverAfter=performance.now()+500;pins.get(active)?.setAttribute('aria-expanded','false');motionButton.setAttribute('aria-expanded','false');completedMotion.setAttribute('aria-expanded','false');popup.classList.remove('completed-motion');placeButtons.get(active)?.setAttribute('aria-expanded','false');active=null;popup.hidden=true;backdrop.hidden=true;lastFocus?.focus({preventScroll:true});}
 function row(label,note,selected,patch,color){const b=document.createElement('button');b.type='button';b.className='pin-option';b.setAttribute('aria-pressed',String(selected));if(color){const sw=document.createElement('span');sw.className='pin-swatch';sw.style.background=color;b.append(sw);}const text=document.createElement('span'),strong=document.createElement('strong');strong.textContent=t(label);text.append(strong);if(note){const small=document.createElement('small');small.textContent=t(note);text.append(small);}const check=document.createElement('span');check.className='pin-check';check.textContent=selected?'✓':'';b.append(text,check);b.onclick=()=>{close();apply(patch).catch(console.error);};list.append(b);return b;}
 // Images use the same scene order and finish as the existing module gallery.
 const photoHover=matchMedia('(min-width:851px) and (hover:hover)');
 function hideOptionPhotos(){list.querySelectorAll('.pin-option-photos').forEach(strip=>strip.hidden=true);}
 photoHover.addEventListener('change',hideOptionPhotos);
 popup.addEventListener('keydown',hideOptionPhotos);
 function optionPhotos(button,id){
  if(!photoHover.matches)return;
  if(id==='i-seat'){
   attachOptionPhotos(button,()=>['forward','flat-front','rearward'].map(view=>`assets/iseat/${view}.webp`));return;
  }
  if(id==='seat'){
   attachOptionPhotos(button,()=>[1,2].map(view=>`assets/module-photos/seat-${view}.png`),true);return;
  }
  if(!featuredViews[id]||!modules[id]?.prefix)return;
  const scenes=Object.keys(featuredViews[id]).map(key=>modules[id].scenes.find(scene=>scene.key===key)).filter(Boolean).slice(0,2);
  if(!scenes.length)return;
  attachOptionPhotos(button,()=>scenes.map(scene=>`../assets/${modules[id].prefix.replace('{finish}',getState().finish)}-${scene.key}.webp`));
 }
 function attachOptionPhotos(button,sources,illustration=false){
  if(!photoHover.matches)return;
  const strip=document.createElement('div');strip.className='pin-option-photos';strip.hidden=true;strip.setAttribute('aria-hidden','true');button.after(strip);
  button.addEventListener('pointerenter',event=>{
   if(event.pointerType!=='mouse'||!photoHover.matches)return;
   hideOptionPhotos();
   if(!strip.childElementCount)for(const source of sources()){
    const image=document.createElement('img');image.alt='';image.draggable=false;image.decoding='async';
    image.src=source;
    if(illustration){
     const frame=document.createElement('span'),label=document.createElement('small');
     frame.className='pin-option-photo';label.textContent=getLanguage()==='en'?'Image':'イメージ';
     frame.append(image,label);strip.append(frame);
    }else strip.append(image);
   }
   strip.hidden=false;
   // Reveal the strip within the scroller without moving the hovered row past the pointer.
   const overflow=strip.getBoundingClientRect().bottom-list.getBoundingClientRect().bottom;
   if(overflow>0)list.scrollTop+=Math.min(overflow,Math.max(0,button.getBoundingClientRect().bottom-event.clientY-2));
  });
  button.addEventListener('pointerleave',()=>{strip.hidden=true;});
 }
 const swatches={clear:'#d8c7a3',teak:'#a9774b',oak:'#c6a273',walnut:'#654b3e','light-canvas':'#c8c5b9','dark-canvas':'#73736b','white-ash':'#d8c7a3','black-cherry':'#a77952',white:'#fefefe',teffy:'#c5bbb5','volcanic-gray':'#74747a'};
 function renderOptions(key){
  list.replaceChildren();popup.querySelector('.pin-motion-controls')?.remove();popup.querySelector('h2').textContent=key==='motion'?(getLanguage()==='en'?'Try moving':'動かしてみる'):placeTitle(key);popup.querySelector('header button').setAttribute('aria-label',t('閉じる'));const s=getState();
  if(key==='motion'){list.hidden=true;renderMotion(key);return;}list.hidden=false;
  if(desktop.matches&&['finish','mattress'].includes(key)){renderCard(s);renderDesktopControls();return;}
  if(['floor','ceiling','wall'].includes(key)){
   if(s.vehicle==='super-gl'&&key!=='floor'){
    const credit=document.createElement('p');credit.className='pin-maker-credit';credit.textContent=t(key==='ceiling'?'TWI製 天井ウッド':'TWI製 クォーターパネル');list.append(credit);
    if(key==='ceiling')for(const id of ['clear','walnut','none']){
     const button=row(id==='none'?'なし':id==='clear'?'クリア':'ウォールナット','',s.twiCeiling===id,{twiCeiling:id},swatches[id]);
     attachOptionPhotos(button,()=>[id==='walnut'?'walnut':'clear',id==='walnut'?'clear':'walnut'].map(finish=>`assets/twi/ceiling-${finish}.jpg`));
    }else for(const [id,n] of [['left','助手席側（左）'],['right','運転席側（右）'],['both','両側'],['none','なし']]){
     const button=row(n,'',s.quarterPanels===id,{quarterPanels:id});attachOptionPhotos(button,()=>['assets/twi/quarter-panel.jpg']);
    }
   }else{
    if(key==='wall'){
     const color=s.wall!=='none'?s.wall:s.panel!=='none'?s.panel:'white';
     row('色を変える（壁面パネル）','',s.wall!=='none',{wall:color,panel:'auto'});
     row('パネルのみ','',s.wall==='none'&&s.panel!=='none',{wall:'none',panel:color});
     row('なし','',s.wall==='none'&&s.panel==='none',{wall:'none',panel:'none'});
    }
    for(const c of [...palettes[key]].sort((a,b)=>{const order=key==='floor'?['teak','oak','walnut','light-canvas','dark-canvas']:key==='wall'?['white','teffy','volcanic-gray']:['white-ash','walnut','black-cherry'];return order.indexOf(a.value)-order.indexOf(b.value);}))row(key==='wall'?({white:'ホワイト',teffy:'テッフィ','volcanic-gray':'ボルカニックグレー'})[c.value]:c.label||c.name,'',(key==='wall'&&s.wall==='none'?s.panel:s[key])===c.value,key==='wall'?(s.wall==='none'&&s.panel!=='none'?{panel:c.value}:{wall:c.value,panel:'auto'}):{[key]:c.value},swatches[c.value]);
    if(key!=='floor'&&key!=='wall')row('なし','',s[key]==='none'&&(key!=='wall'||s.panel==='none'),key==='wall'?{wall:'none',panel:'none'}:{[key]:'none'});
   }
  }else{
   const slot=key==='front'?'front':key==='left'?'cab':'bed';
   const ids=key==='front'?['seat','i-seat','front-module','aluminum-front-kitchen']:key==='left'?choices.CAB:[...choices.SINGLE,...choices.FULL];
   for(const id of key==='front'?ids:[...ids,'none']){let patch={[slot]:id};if(choices.FULL.includes(id))patch={bed:id,cab:'none'};else if(slot==='cab'&&choices.FULL.includes(s.bed))patch={bed:'none',cab:id};if(patch.bed!==undefined)Object.assign(patch,{bedMattress:patch.bed!=='none',flat:patch.bed==='two-side-bed'});if(patch.front!==undefined)patch.frontMattress=patch.front==='front-module';const n=moduleNames[id];const button=row(id==='none'?'なし':getLanguage()==='en'?(n?.en||modules[id]?.en||id):(n?.ja||modules[id]?.name||id),getLanguage()==='en'?n?.noteEn:n?.noteJa,s[slot]===id,{...patch,expanded:false,frontExpanded:false,rearExpanded:false,storage:false});optionPhotos(button,id);}

  }
  renderMotion(key);
 }

 function renderMotion(key){
  const old=popup.querySelector('.pin-motion-controls'),focus=old?.contains(document.activeElement)?document.activeElement.dataset.previewMotion:null;
  old?.remove();if(!['front','bed','left','motion'].includes(key))return;
  const s=getState(),en=getLanguage()==='en',region=document.createElement('section');region.className='pin-motion-controls';
  const heading=document.createElement('h3');heading.textContent=en?'Try moving':'動かしてみる';if(key!=='motion')region.append(heading);
  const text=(ja,eng)=>en?eng:ja;
  const group=(id,title,options)=>{
   const field=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=title;field.append(legend);field.dataset.motionGroup=id;
   for(const [name,label,on,patch] of options){const b=document.createElement('button');b.type='button';b.dataset.previewMotion=id+'-'+name;b.textContent=label;b.setAttribute('aria-pressed',String(on));b.onclick=async()=>{region.querySelectorAll('button').forEach(x=>x.disabled=true);try{await api.previewMotion(patch);}catch(error){console.error(error);renderMotion(key);}popup.querySelector(`[data-preview-motion="${id+'-'+name}"]`)?.focus({preventScroll:true});};field.append(b);}region.append(field);
  };
  const toggle=(id,title,field,open,eng)=>group(id,title,[['open',text(open,eng),!!s[field],{[field]:true}],['reset',text('戻す','Reset'),!s[field],{[field]:false}]]);
  if((key==='front'||key==='motion')&&s.front==='i-seat')group('seat',t(names.front),[
   ...I_SEAT_POSES.filter(p=>p.id!=='forward').map(p=>[p.id,text(p.id==='rearward'?'反転':'フラット',p.id==='rearward'?'Turn around':'Flat'),s.iSeatPose===p.id,{iSeatPose:p.id,iSeatSlide:iSeatDefaultSlide(p.id)}]),
   ['reset',text('戻す','Reset'),s.iSeatPose==='forward',{iSeatPose:'forward',iSeatSlide:iSeatDefaultSlide('forward')}]
  ]);
  if((key==='front'||key==='motion')&&s.front==='aluminum-front-kitchen')toggle('front-storage',t(names.front),'frontStorage','引き出しを出す','Pull out tray');
  if((key==='left'||key==='motion')&&['active-side-cabinet','aluminum-side-cabinet'].includes(s.cab))toggle('cab-storage',t(names.left),'cabStorage','引き出しを出す','Pull out tray');
  if((key==='left'||key==='motion')&&s.cab==='side-cabinet')toggle('cab-table',t(names.left),'cabTableOpen','テーブルを上げる','Raise table');
  if(key==='bed'||key==='motion'||key==='left'&&choices.FULL.includes(s.bed)){
   if(s.bed==='two-side-bed'&&api.bedMattressEnabled(s))toggle('bed-centre',t('中央マットレスを敷く'),'flat','敷く','Lay out');
   if(s.bed==='aluminum-bed'){
    toggle('bed-front',t('前側のベッド'),'frontExpanded','広げる','Extend');
    toggle('bed-rear',t('後側のベッド'),'rearExpanded','広げる','Extend');
   }else if(['slide-bed','lounge-slide-bed'].includes(s.bed))toggle('bed',t(names.bed),'expanded','広げる','Extend');
   if(['lounge-bed','lounge-slide-bed','aluminum-bed','two-side-bed'].includes(s.bed))toggle('bed-storage',t('後部収納を引き出す'),'storage','引き出しを出す','Pull out storage');
  }
  if(region.querySelector('button')){popup.append(region);if(focus)region.querySelector(`[data-preview-motion="${focus}"]`)?.focus({preventScroll:true});}
  else if(key==='motion'){const empty=document.createElement('p');empty.textContent=text('動かせる家具を選ぶと、ここに操作が出ます。','Select movable furniture to see its controls here.');region.append(empty);popup.append(region);}
 }
 function position(){if(!active)return;
  if(lastFocus===completedMotion){const r=completedMotion.getBoundingClientRect();popup.style.maxHeight=Math.max(120,innerHeight-140)+'px';const w=popup.offsetWidth,h=popup.offsetHeight;popup.style.left=Math.max(12,Math.min(innerWidth-w-12,r.left+r.width/2-w/2))+'px';popup.style.top=Math.max(12,Math.min(innerHeight-h-12,desktop.matches?r.bottom+8:r.top-h-8))+'px';return;}
  if(portrait.matches)return;
  if(innerWidth>850&&root.dataset.studioStep==='interior'){
   const rect=stage.getBoundingClientRect(),bar=stage.querySelector('.place-toolbar').getBoundingClientRect();
   const top=Math.max(rect.top+12,$('.studio-header').getBoundingClientRect().bottom+24);
   popup.style.left=(rect.left+12)+'px';popup.style.top=top+'px';
   popup.style.maxHeight=Math.max(0,bar.top-top-32)+'px';return;
  }
  if(lastFocus===motionButton||lastFocus?.matches('[data-place]')){
   const r=lastFocus.getBoundingClientRect(),bar=stage.querySelector('.place-toolbar').getBoundingClientRect();
   popup.style.maxHeight=Math.max(0,bar.top-24)+'px';
   const w=popup.offsetWidth,h=popup.offsetHeight;
   popup.style.left=Math.max(12,Math.min(innerWidth-w-12,r.left+r.width/2-w/2))+'px';
   popup.style.top=Math.max(12,bar.top-h-12)+'px';return;
  }
  const r=pins.get(active).getBoundingClientRect();const w=popup.offsetWidth,h=popup.offsetHeight;let x=r.right+12;if(x+w>innerWidth-12)x=r.left-w-12;popup.style.left=Math.max(12,x)+'px';popup.style.top=Math.max(12,Math.min(innerHeight-h-12,r.bottom+h+12<=innerHeight?r.bottom+12:r.top-h-12))+'px';}
 function open(key,trigger=pins.get(key)){
  if(trigger===completedMotion){close();active='motion';lastFocus=trigger;popup.classList.add('completed-motion','from-place');trigger.setAttribute('aria-expanded','true');renderOptions('motion');popup.hidden=false;backdrop.hidden=false;position();popup.querySelector('header button').focus({preventScroll:true});return;}

  if(portrait.matches){
   const r=mobileRows.get(key);if(!r)return;
   if(root.dataset.studioStep!=='interior')$('#tab-interior').click();close();
   for(const [id,g] of groups){g.body.hidden=id!==r.group;g.button.setAttribute('aria-expanded',String(id===r.group));}
   active=key;lastFocus=r.button;r.button.setAttribute('aria-expanded','true');r.body.hidden=false;
   if(key!=='finish'&&key!=='mattress'){renderOptions(key);popup.classList.add('portrait-inline');popup.setAttribute('role','region');popup.removeAttribute('aria-modal');r.body.append(popup);popup.hidden=false;}
   backdrop.hidden=true;
   requestAnimationFrame(()=>{const scroller=$('.panel-scroll');scroller.scrollTop+=r.button.getBoundingClientRect().top-scroller.getBoundingClientRect().top;});
   return;
  }
 if(root.dataset.studioStep!=='interior')$('#tab-interior').click();close();active=key;lastFocus=trigger;popup.classList.toggle('from-place',trigger===motionButton||trigger.matches('[data-place]'));popup.style.maxHeight='';pins.get(key)?.setAttribute('aria-expanded','true');motionButton.setAttribute('aria-expanded',String(key==='motion'));placeButtons.get(key)?.setAttribute('aria-expanded','true');renderOptions(key);popup.hidden=false;backdrop.hidden=false;position();popup.querySelector('header button').focus({preventScroll:true});}
 backdrop.onclick=close;popup.querySelector('header button').onclick=close;
 document.addEventListener('keydown',e=>{if(!active)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}if(e.key==='Tab'&&(!portrait.matches||lastFocus===completedMotion)){const buttons=[...popup.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}},true);
 controls.addEventListener('start',()=>{dragging=true;if(!portrait.matches)close();});controls.addEventListener('end',()=>{dragging=false;movingUntil=performance.now()+220;dirty=true;});controls.addEventListener('change',()=>{movingUntil=performance.now()+180;dirty=true;});
 const ray=new THREE.Raycaster(),direction=new THREE.Vector3();
 function frame(now){requestAnimationFrame(frame);const hide=portrait.matches||dragging||now<movingUntil||root.dataset.studioStep!=='interior'||root.classList.contains('intro-active')||root.classList.contains('outro-active');layer.hidden=hide;if(hide||document.hidden)return;if(!dirty)return;lastTick=now;dirty=false;camera.updateMatrixWorld();scene.updateMatrixWorld();const rect=layer.getBoundingClientRect();const blockers=scene.children.filter(g=>g.visible&&g.userData.data);const placed=[];
  for(const [key,b] of pins){const point=anchors.get(key),v=point.clone().project(camera);b.hidden=v.z< -1||v.z>1||Math.abs(v.x)>1||Math.abs(v.y)>1;if(b.hidden)continue;const ax=(v.x+1)*rect.width/2,ay=(1-v.y)*rect.height/2;let x=Math.max(24,Math.min(rect.width-24,ax)),y=Math.max(28,Math.min(rect.height-70,ay));const candidates=[];for(let dx=-5;dx<=5;dx++)for(let dy=-5;dy<=5;dy++)candidates.push({x:x+dx*44,y:y+dy*44,d:dx*dx+dy*dy});candidates.sort((a,b)=>a.d-b.d);const free=candidates.find(q=>q.x>=24&&q.x<=rect.width-24&&q.y>=28&&q.y<=rect.height-70&&!placed.some(p=>Math.hypot(q.x-p.x,q.y-p.y)<43));if(free){x=free.x;y=free.y;}placed.push({x,y});b.style.left=x+'px';b.style.top=y+'px';direction.copy(point).sub(camera.position);const distance=direction.length();ray.set(camera.position,direction.normalize());ray.far=distance-45;const occluded=ray.intersectObjects(blockers,true).some(hit=>{for(let n=hit.object;n;n=n.parent)if(!n.visible)return false;return true;});b.style.opacity=occluded?'.38':'1';}
  position();
 }
 window.addEventListener('studio-step-change',()=>{close();dirty=true;stage.querySelector('.pin-tip')?.remove();});window.addEventListener('studio-locale-change',()=>{refresh();if(active&&(desktop.matches||!['finish','mattress'].includes(active))){renderOptions(active);position();}});new ResizeObserver(()=>{dirty=true;position();hintLabel.textContent=hintText();motionButton.textContent=getLanguage()==='en'?'Move ▾':'動かす ▾';}).observe(stage);
 new ResizeObserver(([entry])=>{stage.style.setProperty('--place-bar-height',entry.target.offsetHeight+'px');stage.style.setProperty('--pc-bar-width',entry.target.offsetWidth+'px');position();}).observe(stage.querySelector('.place-toolbar'));
 refresh();requestAnimationFrame(frame);
 return {refresh,open,openForModel(id){const s=getState();const key=id===keys.floor?'floor':id===keys.ceiling?'ceiling':id===keys.wall?'wall':id===s.front?'front':id===s.bed?'bed':'left';open(key);}};
}
