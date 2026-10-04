import {constructionBadge} from './construction-badge.js?v=1';
import {featuredViews} from './module-details-content.js?v=2';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// One gallery implementation for the choice cards and the non-modal 3D popup.
export function createModuleDetails({modules,getState,getLanguage}){
 const indices=new Map(),collapsed=new Set();
 let popupKey=null,returnFocus=null,lastLanguage=getLanguage();
 const text=(ja,en)=>getLanguage()==='en'?en:ja;
 const gallery=k=>Object.keys(featuredViews[k]||{}).map(key=>modules[k].scenes.find(s=>s.key===key)).filter(Boolean);
 const title=k=>getLanguage()==='en'?(/[a-z]/.test(modules[k].en)?modules[k].en:modules[k].en.toLowerCase().replace(/(^|[ -])\w/g,c=>c.toUpperCase())):modules[k].name;
 const src=(k,s)=>`../assets/${modules[k].prefix.replace('{finish}',getState().finish)}-${s.key}.webp`;
 const caption=(k,s)=>getLanguage()==='en'?featuredViews[k][s.key]:[s.title,s.body,s.note];
 const popup=document.createElement('aside');
 popup.id='module-popup';popup.className='module-popup';popup.hidden=true;
 popup.setAttribute('role','dialog');popup.setAttribute('aria-modal','false');
 popup.setAttribute('aria-labelledby','module-popup-title');popup.dataset.moduleI18n='';
 document.body.append(popup);

 function content(k,floating=false){
  const scenes=gallery(k),index=(indices.get(k)||0)%scenes.length,s=scenes[index],c=caption(k,s);
  const finish=getState().finish==='black'?text('ヘキサ合板','Hexa plywood'):text('バーチ合板','Birch plywood');
  return `<div class="module-preview-heading"><div>${floating?`<span class="module-preview-eyebrow">${text('車内のモジュール','IN YOUR VAN')}</span><h2 id="module-popup-title">${escape(title(k))}</h2>${constructionBadge(modules[k])}`:`<strong>${text('写真と特徴','Photos & features')}</strong>`}<span class="module-preview-finish">${finish}</span></div><button type="button" class="module-preview-close" data-detail-action="close" aria-label="${text('紹介を閉じる','Close module details')}">×</button></div>
  <div class="module-preview-image" data-detail-swipe><img src="${src(k,s)}" alt="${escape(c[0])}" width="960" height="600" draggable="false"><button type="button" data-detail-action="previous" class="module-preview-arrow previous" aria-label="${text('前の写真','Previous photo')}">‹</button><button type="button" data-detail-action="next" class="module-preview-arrow next" aria-label="${text('次の写真','Next photo')}">›</button><span class="module-preview-count" aria-hidden="true">${index+1} / ${scenes.length}</span></div>
  <div class="module-preview-thumbs" aria-label="${text('特徴の写真を選ぶ','Choose a feature photo')}">${scenes.map((scene,i)=>`<button type="button" data-detail-action="photo" data-photo-index="${i}" aria-label="${escape(caption(k,scene)[0])}" aria-pressed="${i===index}"><img src="${src(k,scene)}" alt="" width="90" height="60" loading="lazy" draggable="false"></button>`).join('')}</div>
  <div class="module-preview-caption" aria-live="polite" aria-atomic="true"><h3>${escape(c[0])}</h3><p>${escape(c[1])}</p>${c[2]?`<small>${escape(c[2])}</small>`:''}</div>
  <div class="module-preview-footer"><span>${text('モジュール単体の写真','Standalone module views')}</span><a href="../${k}.html?finish=${getState().finish}" target="_blank" rel="noopener">${text('詳しく見る ↗','Full details (Japanese) ↗')}</a></div>`;
 }
 function inline(k){
  if(!featuredViews[k])return '';
  const closed=collapsed.has(k);
  return `<section class="module-preview ${closed?'is-collapsed':''}" data-module-detail="${k}" data-module-i18n aria-label="${escape(title(k))}">${closed?`<button type="button" class="module-preview-reopen" data-detail-action="open">${text('写真と特徴を見る','View photos & features')} <span>＋</span></button>`:content(k)}</section>`;
 }
 function repaint(k){
  const focused=document.activeElement,root=focused?.closest('[data-module-detail]');
  const focusInfo=root?.dataset.moduleDetail===k?{floating:root===popup,action:focused.dataset.detailAction,index:focused.dataset.photoIndex}:null;
  for(const region of document.querySelectorAll(`.module-preview[data-module-detail="${k}"]`))region.outerHTML=inline(k);
  if(popupKey===k){popup.innerHTML=content(k,true);popup.dataset.moduleDetail=k;}
  if(focusInfo?.action){const region=focusInfo.floating?popup:document.querySelector(`.module-preview[data-module-detail="${k}"]`);region?.querySelector(`[data-detail-action="${focusInfo.action}"]${focusInfo.index!==undefined?`[data-photo-index="${focusInfo.index}"]`:''}`)?.focus({preventScroll:true});}
 }
 function close(restore=false){popup.hidden=true;popupKey=null;delete popup.dataset.moduleDetail;if(restore&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});}
 function open(k){
  if(!featuredViews[k])return;
  if(popup.hidden)returnFocus=document.activeElement;
  popupKey=k;popup.dataset.moduleDetail=k;popup.innerHTML=content(k,true);popup.hidden=false;
  popup.querySelector('[data-detail-action="close"]').focus({preventScroll:true});
 }
 function change(k,index){indices.set(k,(index+gallery(k).length)%gallery(k).length);repaint(k);}
 document.addEventListener('click',e=>{
  const action=e.target.closest('[data-detail-action]'),region=action?.closest('[data-module-detail]');
  if(!region)return;
  const k=region.dataset.moduleDetail;
  if(action.dataset.detailAction==='close'){
   if(region===popup)close(true);else {collapsed.add(k);repaint(k);document.querySelector(`.module-preview[data-module-detail="${k}"] button`)?.focus({preventScroll:true});}
  }else if(action.dataset.detailAction==='open'){collapsed.delete(k);repaint(k);document.querySelector(`.module-preview[data-module-detail="${k}"] button`)?.focus({preventScroll:true});}
  else change(k,action.dataset.detailAction==='photo'?Number(action.dataset.photoIndex):(indices.get(k)||0)+(action.dataset.detailAction==='next'?1:-1));
 });
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!popup.hidden){close(true);return;}
  const region=e.target.closest('[data-module-detail]');
  if(region&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();change(region.dataset.moduleDetail,(indices.get(region.dataset.moduleDetail)||0)+(e.key==='ArrowRight'?1:-1));}
 });
 // Only a horizontal gesture over a photo changes it; vertical scrolling stays native.
 let swipe;
 document.addEventListener('pointerdown',e=>{const photo=e.target.closest('[data-detail-swipe]');swipe=photo&&!e.target.closest('button')?{id:e.pointerId,x:e.clientX,y:e.clientY,k:photo.closest('[data-module-detail]').dataset.moduleDetail}:null;});
 document.addEventListener('pointerup',e=>{if(swipe?.id!==e.pointerId)return;const {x,y,k}=swipe;swipe=null;const dx=e.clientX-x;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(e.clientY-y)*1.5)change(k,(indices.get(k)||0)+(dx<0?1:-1));});
 document.addEventListener('pointercancel',()=>{swipe=null});
 // Changing another setting or opening an intro/outro dismisses the floating card.
 document.addEventListener('pointerdown',e=>{if(!popup.hidden&&!popup.contains(e.target)&&!e.target.closest('#viewport'))close();});
 new MutationObserver(()=>{
  const language=getLanguage();
  if(language!==lastLanguage){lastLanguage=language;for(const k of Object.keys(featuredViews))repaint(k);}
  if(document.documentElement.classList.contains('intro-active')||document.documentElement.classList.contains('outro-active'))close();
 }).observe(document.documentElement,{attributes:true,attributeFilter:['lang','data-intro-state','data-outro-state']});
 return {inline,open,close,
  selected(k){collapsed.delete(k);close();requestAnimationFrame(()=>{
   const button=document.querySelector(`.option.active[data-key="${k}"]`),panel=button?.closest('.panel-scroll');
   if(panel)panel.scrollTo({top:panel.scrollTop+button.getBoundingClientRect().top-panel.getBoundingClientRect().top-8,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });},
  refresh(){if(popupKey){if(![getState().front,getState().bed,getState().cab].includes(popupKey))close();else repaint(popupKey);}}
 };
}
