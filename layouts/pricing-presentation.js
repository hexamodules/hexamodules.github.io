import {calculateLayoutReference} from './reference-pricing.js?v=20';
import {bedMattressEnabled,mattressIncluded,mattressColor} from './mattress-state.js?v=2';
import {lightingCutoutSummary} from './lighting-cutouts.js?v=1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const layoutNumber=s=>{let h=2166136261;for(const b of new TextEncoder().encode(JSON.stringify(s)))h=Math.imul(h^b,16777619);return 'HX-L-'+(h>>>0).toString(16).toUpperCase().padStart(8,'0')};
const money=n=>n==null?'未設定':Math.round(n).toLocaleString('ja-JP')+'円';
export function dealerRows(catalogue,state,estimate){
 return [...estimate.items,...estimate.service_items].map(item=>{
  const gl=state.vehicle==='super-gl'&&catalogue.super_gl_catalogue.find(r=>r.key===item.key||(r.key.endsWith(':')&&item.key.startsWith(r.key)));
  const base=gl||catalogue.dealer_catalogue.find(r=>r.key===item.key||(['floor','ceiling','wall','panel'].includes(r.key.split(':')[0])&&r.key.split(':')[0]===item.key.split(':')[0]));
  const factor=item.quantity*(item.key==='twi-quarter'?.5:1);
  return {key:item.key,name:item.name,reference:item.amount_jpy,fp:base?base.fp_wholesale_ex_tax*factor:null,assembled:base?.assembled_wholesale_ex_tax==null?null:base.assembled_wholesale_ex_tax*factor,assembly:base?base.assembly_hours*factor:null,install:base?base.install_hours*factor:null};
 });
}
export function margin(row,{mode='flat',rate=10000,sale=row.reference}={}){
 const wholesale=mode==='assembled'?row.assembled:row.fp;
 const hours=(mode==='assembled'?0:row.assembly)+row.install;
 return wholesale==null||row.install==null||row.assembly==null||sale==null?null:Math.round(sale/1.1-wholesale-hours*rate);
}
export function createReferencePricing({catalogue,getState,getLocation,getLanguage,onFloorSlide,getDealer=()=>null}){
 const $=s=>document.querySelector(s),en=()=>getLanguage()==='en',isDealer=()=>!!new URLSearchParams(location.search).get('dealer')||location.pathname.includes('/dealer-demo/');
 const note=()=>en()?'Your dealer will provide a quote. Send them this summary.':'お見積もりは取扱店から。このまとめをそのまま送れます';
 const section=document.createElement('section');section.id='reference-price-review';section.setAttribute('data-module-i18n','');$('#selection-summary').before(section);
 const controls=document.createElement('div');controls.id='dealer-pricing-controls';controls.innerHTML='<label>仕入れ方 <select><option value="flat">フラットパック</option><option value="assembled">組立済み</option></select></label> <label>工賃単価（税抜・円/h）<input type="number" min="0" step="1" value="10000"></label>';
 const content=document.createElement('div');section.append(controls,content);
 const floor=document.createElement('label');floor.id='floor-slide-option';floor.className='floor-slide-option';floor.setAttribute('data-module-i18n','');floor.innerHTML='<input type="checkbox"><span>脱着式の床スライドを追加</span>';$('#bed-options').parentElement.insertBefore(floor,$('#clear-rear'));floor.querySelector('input').onchange=e=>onFloorSlide(e.target.checked);
 const save=document.createElement('button');save.type='button';save.className='primary-button';save.setAttribute('data-module-i18n','');$('#pane-review').append(save);
 const style=document.createElement('style');style.textContent='#reference-price-review{margin:16px 0;overflow:auto}#reference-price-review table{font-size:12px;border-collapse:collapse;min-width:650px}#reference-price-review th,#reference-price-review td{padding:8px;border-bottom:1px solid #ddd;text-align:right}#reference-price-review th:first-child{text-align:left}#reference-price-review input{width:110px}#dealer-pricing-controls{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px}';document.head.append(style);
 let estimate=null,rows=[],sales=new Map();
 const mode=()=>controls.querySelector('select').value,rate=()=>Math.max(0,Number(controls.querySelector('input').value)||0);
 function customerSummary(s=getState()){
  const q=calculateLayoutReference(catalogue,s,getLocation(),getDealer());
  return {number:layoutNumber(s),date:new Date().toLocaleDateString('ja-JP'),vehicle:s.vehicle==='super-gl'?'ハイエース スーパーGL':'ハイエース DX',finish:s.finish==='black'?'ヘキサ合板':'バーチ合板',items:[...(q?.items||[]),...(q?.service_items||[])].map(i=>en()?i.name_en:i.name).concat(bedMattressEnabled(s)&&mattressIncluded(s)?[en()?'Included bed mattress':'ベッド専用マットレス（付属）']:[]).concat(bedMattressEnabled(s)?[(en()?'Mattress colour: ':'マットレス色：')+mattressColor(s,'bed')[en()?'en':'ja']]:[]),lighting:lightingCutoutSummary(s,getLanguage())};
 }
 function table(){
  const sums={wholesale:0,reference:0,margin:0,assembly:0,install:0,sale:0};let incomplete=false;
  const body=rows.map((r,i)=>{const w=mode()==='flat'?r.fp:r.assembled,sale=sales.has(r.key)?sales.get(r.key):r.reference,m=margin(r,{mode:mode(),rate:rate(),sale});if(w==null||m==null)incomplete=true;
   for(const [k,v]of Object.entries({wholesale:w,reference:r.reference,margin:m,assembly:r.assembly,install:r.install,sale}))sums[k]+=v||0;
   return `<tr><th>${esc(r.name)}</th><td>${money(w==null?null:w*1.1)}</td><td>${money(r.reference)}</td><td>${money(m==null?null:m*1.1)}</td><td>${r.assembly??'未設定'} / ${r.install??'未設定'}</td><td><input aria-label="${esc(r.name)} 売値(税込)" data-sale="${i}" type="number" min="0" step="1" value="${sale??''}"></td></tr>`;
  }).join('');
  return `<p>参考価格合計（税込） <output id="reference-price-total">${money(estimate?.total_jpy)}</output></p><p>卸・取り分は税込換算。取り分＝売値−卸−工賃（税込）。売値の初期値は参考価格。送料別途。未設定の卸・工数は取扱店で確認してください。</p><table><thead><tr><th>品名</th><th>仕入(卸・税込)</th><th>参考価格(税込)</th><th>取扱店の取り分(税込)</th><th>組立h / 取付h(参考)</th><th>売値(税込)</th></tr></thead><tbody>${body}</tbody><tfoot><tr><th>合計${incomplete?'（未設定あり）':''}</th><td>${incomplete?'未確定':money(sums.wholesale*1.1)}</td><td>${money(sums.reference)}</td><td>${incomplete?'未確定':money(sums.margin*1.1)}</td><td>${sums.assembly} / ${sums.install}</td><td>${money(sums.sale)}</td></tr></tfoot></table><p>工賃単価：税抜 ${money(rate())}/h。組立済み仕入では組立工賃を重ねて引きません。FP卸＝（原価−機器）×1.25＋機器。組立済み卸＝FP卸＋組立h×1万円。参考価格＝［（組立済み卸−機器）×1.15＋機器＋取付h×1万円］×1.1。機器には率をかけません。金額は確定表を優先します。スーパーGLは割振り表の価格です。</p>`;
 }
 function update(){
  const s=getState();estimate=calculateLayoutReference(catalogue,s,getLocation(),getDealer());rows=estimate?dealerRows(catalogue,s,estimate):[];
  if(estimate?.vehicle_included)rows.push({key:'new-vehicle',name:'新車',reference:estimate.new_vehicle_total_jpy,fp:null,assembled:null,assembly:null,install:null});
  controls.hidden=!isDealer();content.innerHTML=isDealer()?table():`<p>${esc(note())}</p><p>${layoutNumber(s)} · ${new Date().toLocaleDateString('ja-JP')}</p>`;
  floor.hidden=s.bed!=='two-side-bed';floor.querySelector('input').checked=s.floorSlide===true;
  floor.querySelector('span').textContent=en()?'Add removable centre floor slide':'脱着式の床スライドを追加';
  save.textContent=isDealer()?'見積の下書き / PDF保存':en()?'Layout summary / Save as PDF':'まとめ / PDF保存';
  for(const p of document.querySelectorAll('.dealer-guidance p:not(.manufacturer-note)')){p.setAttribute('data-module-i18n','');p.textContent=note();}
 }
 controls.onchange=update;
 content.addEventListener('change',e=>{if(e.target.matches('[data-sale]')){if(!e.target.checkValidity())return;sales.set(rows[Number(e.target.dataset.sale)].key,e.target.value===''?null:Number(e.target.value));update();}});
 async function printSummary(){
  const popup=window.open('','_blank');if(!popup)return;
  const s=getState(),summary=customerSummary(s),bytes=new TextEncoder().encode(JSON.stringify(s));
  // Stable local reference. The complete configuration remains in the share URL.
  let hash=2166136261;for(const b of bytes)hash=Math.imul(hash^b,16777619);const number='HX-L-'+(hash>>>0).toString(16).toUpperCase().padStart(8,'0');
  update();const snapshot=document.createElement('div');if(isDealer()){snapshot.innerHTML=table();snapshot.querySelectorAll('input').forEach(i=>i.replaceWith(document.createTextNode(money(i.value===''?null:Number(i.value)))));}
  const date=new Date().toLocaleDateString('ja-JP');
  popup.document.write(`<!doctype html><html lang="${en()?'en':'ja'}"><meta charset="utf-8"><title>Hexa ${number}</title><style>body{font:14px sans-serif;margin:30px;color:#222}table{border-collapse:collapse;width:100%;font-size:10px}td,th{padding:8px;border:1px solid #ccc}h1{font-size:22px}@media print{button{display:none}tr{break-inside:avoid}}</style><h1>${isDealer()?'取扱店向け 見積の下書き':'Hexa レイアウトのまとめ'}</h1><p>${number} · ${date}</p><p>${esc(summary.vehicle)} / ${esc(summary.finish)}</p><ul>${summary.items.map(n=>`<li>${esc(n)}</li>`).join('')}</ul><p>${esc(summary.lighting)}</p>${snapshot.innerHTML}<p>${esc(note())}</p><p><a href="${esc(location.href)}">${en()?'Open this layout':'このレイアウトを開く'}</a></p><button onclick="window.print()">印刷 / PDF保存</button></html>`);popup.document.close();
 }
 save.onclick=printSummary;
 document.addEventListener('click',e=>{if(e.target.closest('#outro-contact')){e.preventDefault();e.stopImmediatePropagation();printSummary();}},true);
 function quote(s=getState()){
  if(isDealer()){const q=calculateLayoutReference(catalogue,s,getLocation(),getDealer());if(!q)return null;return q;}
  return {type:'layout_summary',...customerSummary(s),service_items:[],formal_quote_issuer:'dealer'};
 }
 function summary(s=getState()){if(!isDealer())return '\n'+note();return '\n'+rows.map(r=>`${r.name}: 参考価格(税込) ${money(r.reference)} / FP卸(税抜) ${money(r.fp)} / 組立 ${r.assembly??'未設定'}h / 取付 ${r.install??'未設定'}h`).join('\n');}
 return {update,quote,summary};
}
