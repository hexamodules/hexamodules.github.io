import {studioEvent} from './analytics.js?v=20261008-ga';
// The opening uses the same vehicle and tailgate geometry as the configurator.
// It never persists the temporary empty scene over a shared configuration.
export function createOpening({prepare,pose,restore}) {
 const root=document.documentElement, overlay=document.querySelector('#studio-opening');
 const start=document.querySelector('#opening-start'), action=document.querySelector('.opening-action');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const locked=[...document.querySelectorAll('.configuration,.stage-context,.lighting-preview,.motion-popover,.view-toolbar,.gesture-hint,.shell-label,#open-help,.brand')];
 let active=false, leaving=false, readyPromise, frame=0, elapsed=0, lastTime=0;
 const clamp=x=>Math.max(0,Math.min(1,x));
 const smooth=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10)};
 function mark(value){if(root.dataset.introState!==value)root.dataset.introState=value}
 function paint(ms){
  pose({arrival:smooth(ms/2100),door:smooth((ms-2200)/1550)});
  root.style.setProperty('--intro-copy',smooth((ms-2800)/900));
  root.style.setProperty('--intro-action',smooth((ms-3500)/650));
  mark(ms<2200?'arriving':ms<4200?'opening':'ready');
  if(ms>=4200){action.inert=false;start.disabled=false;document.querySelector('#opening-status').textContent='準備ができました。スタートからお選びください。'}
 }
 function tick(now){
  if(!active||leaving)return;
  // Do not jump through the entrance after switching back from another tab.
  if(!document.hidden)elapsed+=Math.min(64,Math.max(0,now-lastTime));
  lastTime=now;paint(elapsed);
  if(elapsed<4200)frame=requestAnimationFrame(tick);
 }
 function unlock(){
  active=false;leaving=false;overlay.hidden=true;root.classList.remove('intro-active','intro-leaving');
  root.style.removeProperty('--intro-copy');root.style.removeProperty('--intro-action');
  locked.forEach(el=>el.inert=false);mark('complete');
 }
 async function finish(){
  if(!active||leaving||start.disabled)return;
  leaving=true;cancelAnimationFrame(frame);action.inert=true;start.disabled=true;
  try{
   await readyPromise;paint(4200);action.inert=true;start.disabled=true;mark('leaving');root.classList.add('intro-leaving');
   await restore();
   unlock();
   document.querySelector('#tab-interior').click();
   document.querySelector('#tab-interior').focus({preventScroll:true});
  }catch(error){fail(error)}
 }
 function fail(error){
  cancelAnimationFrame(frame);unlock();
  const loading=document.querySelector('#loading');loading.style.display='flex';
  loading.querySelector('p').textContent='3Dを読み込めませんでした。ページを再読み込みしてください。';
  console.error(error);
 }
 async function play(){
  if(active)return;
  active=true;leaving=false;elapsed=0;overlay.hidden=false;action.inert=true;start.disabled=true;
  root.classList.add('intro-active');root.classList.remove('intro-leaving');mark('loading');
  root.style.setProperty('--intro-copy',0);root.style.setProperty('--intro-action',0);
  locked.forEach(el=>el.inert=true);overlay.tabIndex=-1;overlay.focus({preventScroll:true});
  document.querySelector('#opening-status').textContent='車体を読み込んでいます';
  readyPromise=prepare();
  try{
   await readyPromise;
   if(leaving)return;
   if(reduced.matches){paint(4200);return}
   paint(0);lastTime=performance.now();frame=requestAnimationFrame(tick);
  }catch(error){fail(error)}
 }
 start.addEventListener('click',()=>{if(active&&!leaving&&!start.disabled)studioEvent('studio_start');finish();});
 reduced.addEventListener('change',()=>{if(active&&!leaving&&reduced.matches&&root.dataset.introState!=='loading'){cancelAnimationFrame(frame);paint(4200)}});
 document.querySelector('#replay-opening').addEventListener('click',()=>{document.querySelector('#studio-help').close();play()});
 return {play,start:finish,get active(){return active}};
}
