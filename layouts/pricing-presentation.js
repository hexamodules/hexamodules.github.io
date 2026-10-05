import {calculateLayoutReference} from './reference-pricing.js?v=20261005';
import {bedMattressEnabled,mattressIncluded,mattressColor} from './mattress-state.js?v=2';
import {lightingCutoutSummary} from './lighting-cutouts.js?v=1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const layoutNumber=s=>{let h=2166136261;for(const b of new TextEncoder().encode(JSON.stringify(s)))h=Math.imul(h^b,16777619);return 'HX-L-'+(h>>>0).toString(16).toUpperCase().padStart(8,'0')};
export function createReferencePricing({catalogue,getState,getLocation,getLanguage,onFloorSlide,getDealer=()=>null}){
 const $=s=>document.querySelector(s),en=()=>getLanguage()==='en',isDealer=()=>!!new URLSearchParams(location.search).get('dealer')||location.pathname.includes('/dealer-demo/');
 const note=()=>en()?'Your dealer will provide a quote. Send them this summary.':'お見積もりは取扱店から。このまとめをそのまま送れます';
 const section=document.createElement('section');section.id='reference-price-review';section.setAttribute('data-module-i18n','');$('#selection-summary')?.before(section);
 const content=document.createElement('div');section.append(content);
 const floor=document.createElement('label');floor.id='floor-slide-option';floor.className='floor-slide-option';floor.setAttribute('data-module-i18n','');floor.innerHTML='<input type="checkbox"><span>脱着式の床スライドを追加</span>';
 // Mobile moves #clear-rear into #rear-types before async app startup finishes.
 // Anchor this option to the bed choices so its position is stable in both layouts.
 const bedOptions=$('#bed-options');
 if(bedOptions?.parentNode)bedOptions.after(floor);
 else $('#bed-step .step-content')?.append(floor);
 floor.querySelector('input').onchange=e=>onFloorSlide(e.target.checked);

 function customerSummary(s=getState()){
  const q=calculateLayoutReference(catalogue,s,getLocation(),getDealer());
  return {number:layoutNumber(s),date:new Date().toLocaleDateString('ja-JP'),vehicle:s.vehicle==='super-gl'?'ハイエース スーパーGL':'ハイエース DX',finish:s.finish==='black'?'ヘキサ合板':'バーチ合板',items:[...(q?.items||[]),...(q?.service_items||[])].map(i=>en()?i.name_en:i.name).concat(bedMattressEnabled(s)&&mattressIncluded(s)?[en()?'Included bed mattress':'ベッド専用マットレス（付属）']:[]).concat(bedMattressEnabled(s)?[(en()?'Mattress colour: ':'マットレス色：')+mattressColor(s,'bed')[en()?'en':'ja']]:[]),lighting:lightingCutoutSummary(s,getLanguage())};
 }
 function update(){
  const s=getState();
  content.innerHTML=`<p>${esc(note())}</p><p>${layoutNumber(s)} · ${new Date().toLocaleDateString('ja-JP')}</p>`+(isDealer()?`<p>${en()?'Dealer pricing is being prepared. Price information will be provided after registration.':'取扱店向けの価格画面は準備中です。価格情報は、登録後にご案内します。'}</p>`:'');
  floor.hidden=s.bed!=='two-side-bed';floor.querySelector('input').checked=s.floorSlide===true;
  floor.querySelector('span').textContent=en()?'Add removable centre floor slide':'脱着式の床スライドを追加';
  for(const p of document.querySelectorAll('.dealer-guidance p:not(.manufacturer-note)')){p.setAttribute('data-module-i18n','');p.textContent=note();}
 }
 function quote(s=getState()){return {type:'layout_summary',...customerSummary(s),service_items:[],formal_quote_issuer:'dealer'};}
 function summary(){return '\n'+note();}
 return {update,quote,summary};
}
