import {isTestDealerEnquiry} from './dealer-enquiry.js?v=20261005';
import {calculateLayoutReference} from './reference-pricing.js?v=20261005';
import {bedMattressEnabled,mattressIncluded,mattressColor} from './mattress-state.js?v=2';
import {lightingCutoutSummary} from './lighting-cutouts.js?v=1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const layoutNumber=s=>{let h=2166136261;for(const b of new TextEncoder().encode(JSON.stringify(s)))h=Math.imul(h^b,16777619);return 'HX-L-'+(h>>>0).toString(16).toUpperCase().padStart(8,'0')};
export function createReferencePricing({catalogue,getState,getLocation,getLanguage,onFloorSlide,getDealer=()=>null}){
 const $=s=>document.querySelector(s),en=()=>getLanguage()==='en',isDealer=()=>!!new URLSearchParams(location.search).get('dealer')||location.pathname.includes('/dealer-demo/');
 const note=()=>en()?'Your dealer will provide a quote. Send them this summary.':'お見積もりは取扱店から。このまとめをそのまま送れます';
 const section=document.createElement('section');section.id='reference-price-review';section.setAttribute('data-module-i18n','');$('#selection-summary').before(section);
 const content=document.createElement('div');section.append(content);
 const floor=document.createElement('label');floor.id='floor-slide-option';floor.className='floor-slide-option';floor.setAttribute('data-module-i18n','');floor.innerHTML='<input type="checkbox"><span>脱着式の床スライドを追加</span>';$('#bed-options').parentElement.insertBefore(floor,$('#clear-rear'));floor.querySelector('input').onchange=e=>onFloorSlide(e.target.checked);
 const save=document.createElement('button');save.type='button';save.className='primary-button';save.setAttribute('data-module-i18n','');$('#pane-review').append(save);
 function customerSummary(s=getState()){
  const q=calculateLayoutReference(catalogue,s,getLocation(),getDealer());
  return {number:layoutNumber(s),date:new Date().toLocaleDateString('ja-JP'),vehicle:s.vehicle==='super-gl'?'ハイエース スーパーGL':'ハイエース DX',finish:s.finish==='black'?'ヘキサ合板':'バーチ合板',items:[...(q?.items||[]),...(q?.service_items||[])].map(i=>en()?i.name_en:i.name).concat(bedMattressEnabled(s)&&mattressIncluded(s)?[en()?'Included bed mattress':'ベッド専用マットレス（付属）']:[]).concat(bedMattressEnabled(s)?[(en()?'Mattress colour: ':'マットレス色：')+mattressColor(s,'bed')[en()?'en':'ja']]:[]),lighting:lightingCutoutSummary(s,getLanguage())};
 }
 function update(){
  const s=getState();
  content.innerHTML=`<p>${esc(note())}</p><p>${layoutNumber(s)} · ${new Date().toLocaleDateString('ja-JP')}</p>`+(isDealer()?`<p>${en()?'Dealer pricing is being prepared. Price information will be provided after registration.':'取扱店向けの価格画面は準備中です。価格情報は、登録後にご案内します。'}</p>`:'');
  floor.hidden=s.bed!=='two-side-bed';floor.querySelector('input').checked=s.floorSlide===true;
  floor.querySelector('span').textContent=en()?'Add removable centre floor slide':'脱着式の床スライドを追加';
  save.textContent=en()?'Layout summary / Save as PDF':'まとめ / PDF保存';
  for(const p of document.querySelectorAll('.dealer-guidance p:not(.manufacturer-note)')){p.setAttribute('data-module-i18n','');p.textContent=note();}
 }
 async function printSummary(){
  const popup=window.open('','_blank');if(!popup)return;
  const s=getState(),summary=customerSummary(s),bytes=new TextEncoder().encode(JSON.stringify(s));
  // Stable local reference. The complete configuration remains in the share URL.
  let hash=2166136261;for(const b of bytes)hash=Math.imul(hash^b,16777619);const number='HX-L-'+(hash>>>0).toString(16).toUpperCase().padStart(8,'0');
  update();
  const date=new Date().toLocaleDateString('ja-JP');
  popup.document.write(`<!doctype html><html lang="${en()?'en':'ja'}"><meta charset="utf-8"><title>Hexa ${number}</title><style>body{font:14px sans-serif;margin:30px;color:#222}table{border-collapse:collapse;width:100%;font-size:10px}td,th{padding:8px;border:1px solid #ccc}h1{font-size:22px}@media print{button{display:none}tr{break-inside:avoid}}</style><h1>${en()?'Hexa layout summary':'Hexa レイアウトのまとめ'}</h1><p>${number} · ${date}</p><p>${esc(summary.vehicle)} / ${esc(summary.finish)}</p><ul>${summary.items.map(n=>`<li>${esc(n)}</li>`).join('')}</ul><p>${esc(summary.lighting)}</p><p>${esc(note())}</p><p><a href="${esc(location.href)}">${en()?'Open this layout':'このレイアウトを開く'}</a></p><button onclick="window.print()">印刷 / PDF保存</button></html>`);popup.document.close();
 }
 save.onclick=printSummary;
 document.addEventListener('click',e=>{if(!isTestDealerEnquiry()&&e.target.closest('#outro-contact')){e.preventDefault();e.stopImmediatePropagation();printSummary();}},true);
 function quote(s=getState()){return {type:'layout_summary',...customerSummary(s),service_items:[],formal_quote_issuer:'dealer'};}
 function summary(){return '\n'+note();}
 return {update,quote,summary};
}
