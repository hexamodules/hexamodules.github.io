import {RETAILER_PRICES,normalizeRetailerPrices,resolveRetailerPrice} from '../layouts/retailer-prices.js?v=2';
import {setupDealerOptions,setupCanArrange} from '../layouts/dealer-option-policy.js?v=4';
const money=n=>n===null?'未設定':n.toLocaleString('ja-JP')+'円';
export function createPricingSetup(form){
 const host=form.querySelector('#retailer-price-settings'),controls=[];
 const planning=document.createElement('div');planning.className='retailer-labor-settings';
 planning.innerHTML='<label>1人あたりの日額人件費（円）<input name="laborDailyCost" type="number" min="0" max="1000000" step="1" inputmode="numeric" value="15000"></label><div><small>日額 ÷ 8時間</small><output id="retailer-hourly-cost"></output></div><label>家具モジュールの仕入れ方<select name="procurementMode"><option value="flat">フラットパック</option><option value="assembled">組立済みモジュール</option></select></label><p class="section-help">人件費は採算確認だけに使います。Hexaの参考価格・参考時間・参考工賃単価は変更されません。この設定はお客様向けプロフィールやレイアウト共有には含めません。</p><button type="button" id="save-profit-settings">採算設定をファイルに保存</button>';
 host.append(planning);
 planning.querySelector('button').addEventListener('click',()=>{
  const input=form.elements.laborDailyCost;if(!input.value||!input.reportValidity())return;
  const data={schema:'hexa-retailer-labor-settings-v1',daily_cost_jpy:Number(input.value),purchase_mode:form.elements.procurementMode.value};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='Hexa-retailer-labor-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 for(const kind of ['installation','equipment']){
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=kind==='installation'?'家具・内装の参考取付工賃（固定）':'装備の一式参考価格（固定）';details.append(summary);
  for(const row of RETAILER_PRICES.filter(r=>r.kind===kind)){
   const box=document.createElement('div');box.className='retailer-price-row';box.dataset.priceId=row.id;
   const name=document.createElement('strong');name.textContent=row.ja;
   const reference=document.createElement('span');reference.className='retailer-price-reference';reference.textContent=money(row.price_jpy)+'（税込）';box.append(name,reference);details.append(box);controls.push({row,box});
  }
  host.append(details);
 }
 function read(){return normalizeRetailerPrices({});}
 function update(values){
  const available=setupDealerOptions(values);let pending=0;
  for(const c of controls){const visible=!c.row.availability||available[c.row.availability];c.box.hidden=!visible;if(visible&&resolveRetailerPrice(c.row,read()).price_jpy===null)pending++;}
  const input=form.elements.laborDailyCost,raw=input.value,n=raw!==''&&input.checkValidity()?Number(raw):null;
  form.querySelector('#retailer-hourly-cost').textContent=n===null?'未入力':(n/8).toLocaleString('ja-JP',{maximumFractionDigits:3})+'円 / 人時';
  form.querySelector('#retailer-pricing-status').textContent=pending?`参考額が未設定の項目：${pending}件。未設定分は個別見積もりとなります。`:'Hexaの参考価格を固定して表示します。';
  form.querySelector('#pricing-arrangement-note').hidden=setupCanArrange(values);
 }
 return {read,update};
}
export function pricingSetupErrors(values){
 const errors={},value=values.laborDailyCost;
 if(value!==undefined&&value!==''&&(!/^\d+$/.test(String(value))||Number(value)>1000000))errors.laborDailyCost='日額人件費を0以上100万円以下の整数で入力してください。';
 return errors;
}
