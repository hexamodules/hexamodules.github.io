import {lightingCutoutSummary} from './lighting-cutouts.js?v=1';
import {bedMattressEnabled,frontMattressEnabled,mattressIncluded} from './mattress-state.js?v=2';
import {selectedNewVehicle,newVehicleSpecification,newVehiclePriceNote,vehicleSelectionComplete} from './new-vehicle.js?v=1';
import {retailerPriceLines,RETAILER_PRICE_REVISION} from './retailer-prices.js?v=2';
// Domestic reference prices use integer JPY. Display poses and material colours
// must never change the price of a configuration.
export function convertToAud(amountJpy, catalogue) {
 const fx=catalogue?.exchange_rate;
 if(!fx || !Number.isFinite(fx.jpy_per_aud) || fx.jpy_per_aud<=0)throw Error('AUD exchange rate unavailable');
 return Math.round(amountJpy / fx.jpy_per_aud / 100) * 100;
}
export function calculateReferencePrice(catalogue, state, region = 'jp') {
 if (!catalogue) return null;
 const australia=region==='au',currency=australia?'AUD':'JPY';
 const prices = new Map(catalogue.items.map(item => [item.key, item]));
 const items = [];
 const add = (key,quantity=1) => {
  const item = prices.get(key);
  if (!item || !Number.isSafeInteger(item.price_jpy) || item.price_jpy < 0) throw Error(`Price unavailable: ${key}`);
  const prefix = ['床（必須）','天井','カラーパネル','壁面パネル（カラーパネル込み）'].includes(item.category) ? item.category.replace('（必須）','') + ' · ' : '';
  const structure = item.construction ? ' · ' + (item.construction === 'plywood' ? 'プライウッド' : 'アルミ') : '';
  items.push({key, quantity, name:prefix + item.name + structure + (quantity>1?' × '+quantity:''), name_en:item.name_en + (quantity>1?' × '+quantity:''), amount:(australia?convertToAud(item.price_jpy,catalogue):item.price_jpy)*quantity, amount_jpy:item.price_jpy*quantity, ...(item.includes ? {includes:item.includes} : {})});
 };
 const selected = value => value && value !== 'none';
 if (selected(state.floor)) add('floor:' + state.floor);
 if (state.vehicle==='super-gl') {
  if(['clear','walnut'].includes(state.twiCeiling))add('twi-ceiling:'+state.twiCeiling);
  const count=state.quarterPanels==='both'?2:['left','right'].includes(state.quarterPanels)?1:0;if(count)add('twi-quarter',count);
 } else if (selected(state.ceiling)) add('ceiling:' + state.ceiling);
 // A wall package already includes matching colour panels.
 if (state.vehicle!=='super-gl' && selected(state.wall)) add('wall:' + state.wall);
 else if (state.vehicle!=='super-gl' && selected(state.panel) && state.panel !== 'auto') add('panel:' + state.panel);
 for (const key of [state.front, state.bed, state.cab]) if (selected(key) && !['seat','i-seat'].includes(key)) add('module:' + key);
 if(bedMattressEnabled(state)&&!mattressIncluded(state))add('mattress:bed');
 if(frontMattressEnabled(state))add('mattress:front');
 if (state.bed === 'two-side-bed' && state.floorSlide === true) add('two-side-bed:floor-slide');
 // Standalone lighting, insulation work and dealer equipment are requests only.
 // Keep standard-included components (e.g. TWI lighting) in their parent item.
 return {currency, tax_inclusive:australia?null:true, source_tax_inclusive:true, region, type:'manufacturer_reference_retail', catalogue_revision:catalogue.revision,
  ...(australia?{exchange_rate:catalogue.exchange_rate,tax_basis:'conversion_of_japan_tax_inclusive_reference_prices'}:{}),
  complete:selected(state.floor) === true, items, total:items.reduce((sum,item)=>sum+item.amount,0), total_jpy:items.reduce((sum,item) => sum + item.amount_jpy, 0),
  formal_quote_issuer:'dealer', included_scope:'assembled_furniture_modules_and_interior_parts',module_delivery:'assembled',furniture_assembly_included:true,direct_consumer_supply_only_sales:false,wholesale_prices_included:false,installation_included:false,vehicle_installation_included:false,dealer_options_priced_separately:true,excludes:[...(state.front==='i-seat'?['workvox_i_seat_and_fitting']:[]),'vehicle_installation_and_labour','base_vehicle','external_agent_fees','shipping_and_registration','electrical_system','air_conditioning','ff_heater','standalone_ceiling_lights','tailgate_lights','insulation_installation']};
}

export function calculateLayoutReference(catalogue,state,region='jp',dealer=null){
 const parts=calculateReferencePrice(catalogue,state,region);if(!parts)return null;
 const vehicle=selectedNewVehicle(state),requested=state.vehiclePurchase==='new',ready=vehicleSelectionComplete(state);
 const vehicleJpy=vehicle?.price_jpy||0,vehicleAmount=region==='au'?convertToAud(vehicleJpy,catalogue):vehicleJpy;
 const services=retailerPriceLines(state,parts.items,dealer).map(item=>({...item,amount:item.unit_price_jpy===null?null:(region==='au'?convertToAud(item.unit_price_jpy,catalogue):item.unit_price_jpy)*item.quantity}));
 const unpriced=services.filter(i=>i.amount===null).map(i=>({key:i.key,name:i.name,name_en:i.name_en,kind:i.kind}));
 if(state.front==='i-seat'&&!services.some(i=>i.key==='i-seat'))unpriced.push({key:'i-seat',name:'i seat 本体・取付',name_en:'i seat and fitting',kind:'external_seat'});
 const sum=(kind,field)=>services.filter(i=>i.kind===kind&&i[field]!==null).reduce((n,i)=>n+i[field],0);
 const labour=sum('installation','amount'),labourJpy=sum('installation','amount_jpy'),equipment=sum('equipment','amount'),equipmentJpy=sum('equipment','amount_jpy');
 const fitout=parts.total+labour+equipment,fitoutJpy=parts.total_jpy+labourJpy+equipmentJpy;
 return {...parts,type:'layout_reference_price',complete:parts.complete&&ready,parts_complete:parts.complete,
  vehicle_selection_complete:ready,vehicle_included:requested,
  pricing_complete:unpriced.length===0,unpriced_items:unpriced,service_items:services,service_price_revision:RETAILER_PRICE_REVISION,
  retailer_price_profile:dealer?.id||null,
  fitout_parts_total:parts.total,fitout_parts_total_jpy:parts.total_jpy,
  installation_total:labour,installation_total_jpy:labourJpy,dealer_options_total:equipment,dealer_options_total_jpy:equipmentJpy,
  fitout_total:fitout,fitout_total_jpy:fitoutJpy,
  new_vehicle_total:ready?vehicleAmount:null,new_vehicle_total_jpy:ready?vehicleJpy:null,
  total:ready?fitout+vehicleAmount:null,total_jpy:ready?fitoutJpy+vehicleJpy:null,
  total_basis:unpriced.length?'known_prices_subtotal':'complete_reference_total',
  new_vehicle:newVehicleSpecification(state),
  included_scope:'assembled_furniture_interior_parts_and_priced_selected_services'+(requested?'_and_new_vehicle':''),
  installation_included:!unpriced.some(i=>i.kind==='installation'),vehicle_installation_included:!unpriced.some(i=>i.kind==='installation'),dealer_options_priced_separately:false,
  excludes:[...(!requested?['base_vehicle']:[]),'external_agent_fees','shipping',...unpriced.map(i=>i.key),...(requested?['manufacturer_options','registration_and_other_fees','insurance','taxes_other_than_consumption_tax','recycling_fee']:[])]};
}

export function createReferencePricing({catalogue, getState, getLocation, getLanguage, onFloorSlide, getDealer=()=>null}) {
 const $ = selector => document.querySelector(selector);
 const addElement = (tag, id, parent, before = null) => {
  const element = document.createElement(tag);element.id = id;element.setAttribute('data-module-i18n','');parent.insertBefore(element,before);return element;
 };
 // Prices are shown only once the visitor reviews their completed specification.
 const review = addElement('section','reference-price-review',$('#pane-review'),$('#selection-summary'));
 review.className = 'reference-price-review';
 review.innerHTML = '<div class="price-review-total"><strong></strong><output id="reference-price-total" aria-live="polite"></output></div><dl class="price-review-breakdown"><div><dt class="price-fitout-label"></dt><dd id="reference-fitout-price"></dd></div><div><dt class="price-vehicle-label"></dt><dd id="reference-vehicle-price"></dd></div></dl><p class="price-scope"></p><p class="price-vehicle-note" hidden></p><p class="price-exchange helper"></p>';
 const missing=addElement('p','reference-unpriced-items',review,review.querySelector('.price-scope'));missing.className='helper reference-unpriced-items';missing.setAttribute('role','status');
 const detail=addElement('details','reference-fitout-detail',review,review.querySelector('.price-scope'));detail.innerHTML='<summary></summary><dl class="price-review-breakdown"><div><dt></dt><dd></dd></div><div><dt></dt><dd></dd></div><div><dt></dt><dd></dd></div></dl>';
 const floorOption = addElement('label','floor-slide-option',$('#bed-options').parentElement,$('#clear-rear'));
 floorOption.className='floor-slide-option';floorOption.hidden=true;
 floorOption.innerHTML = '<input id="floor-slide-selected" type="checkbox"><span><strong></strong><small></small></span>';
 $('#floor-slide-selected').addEventListener('change',e=>onFloorSlide(e.target.checked));
 const wallNote=addElement('p','wall-price-inclusions',$('#wall-options').parentElement,$('#wall-color-section'));
 wallNote.className='helper wall-price-inclusions';
 const lightingNote=addElement('p','lighting-price-scope',$('#lighting-step .step-content'));
 const cutoutReview=addElement('p','lighting-cutout-review',$('#pane-review'),$('#dimensions'));
 cutoutReview.className='helper lighting-cutout-review';
 const insulationNote=addElement('p','insulation-price-scope',$('#insulation-step .step-content'));
 lightingNote.className=insulationNote.className='helper';
 let outcome,outcomeNote;
 // Keep the itemised calculation internal; saved layouts carry the reference total.
 function quote(s=getState()) {
  const estimate=calculateLayoutReference(catalogue,s,getLocation(),getDealer());
  if(!estimate)return null;
  const {items,...total}=estimate;
  return total;
 }
 const formatAmount = (amount,currency) => currency==='AUD'?'A$'+amount.toLocaleString('en-AU'):getLanguage()==='en'?'JPY '+amount.toLocaleString('en-US'):amount.toLocaleString('ja-JP')+'円';
 const totalMoney = estimate => formatAmount(estimate.total,estimate.currency);
 const taxLabel = estimate => !estimate?.pricing_complete?(getLanguage()==='en'?'Reference subtotal (unpriced items excluded)':'参考価格小計（未設定分を除く）'):getLocation()==='au'?(getLanguage()==='en'?'Reference total (AUD)':'参考価格合計（豪ドル換算）'):(getLanguage()==='en' ? 'Reference total (tax incl.)' : '参考価格合計（税込）');
 const fitoutLabel=()=>getLanguage()==='en'?'Fit-out reference price':'架装参考価格';
 const vehicleLabel=()=>getLanguage()==='en'?'New-vehicle reference price':'新車参考価格';
 const dealerNote = () => getLanguage()==='en' ? 'Your dealer sets the final selling price and provides a formal quote, including installation, after reviewing the vehicle and required work.' : '実際の販売価格は各取扱店が決定します。車両・施工内容の確認後、施工費を含む正式なお見積もりをご案内します。';
 const scopeNote = (s=getState()) => (getLanguage()==='en'
  ? 'The fit-out reference price includes assembled furniture modules, interior parts and the priced installation, lights, insulation and dealer options you select. Dealer options include equipment and fitting. This studio uses the fixed Hexa reference amounts. Unpriced items are listed separately; they are not free. Equipment procurement, installation and warranty are arranged by your dealer.'
  : '架装参考価格には、家具モジュール・内装パーツと、選択した取付施工・ライト・断熱・ディーラーオプションの設定済み価格を含みます。装備は本体・取付工賃込みの参考額です。このスタジオではHexaの参考額を使用します。未設定分は無料ではなく別途確認となります。機器の調達・施工・保証窓口は取扱店がご案内します。')
  +(s.front==='i-seat'?(getLanguage()==='en'?' i seat and fitting are included in the selected equipment reference amount.':' i seat 選択時は本体・取付費の参考額も含みます。'):'')
  +(getLanguage()==='en'?' Shipping and agent fees are excluded.':' 輸送・エージェント費も含みません。');
 const roundingNote = () => getLanguage()==='en'?'Calculated using each item rounded to the nearest A$100.':'各項目を100豪ドル単位で四捨五入した合計です。';
 function update() {
  const state=getState(),en=getLanguage()==='en',domestic=getLocation()==='jp';
  let estimate=null;try{estimate=quote()}catch(error){console.error(error)}
  review.querySelector('.price-review-total strong').textContent=taxLabel(estimate);
  const total=$('#reference-price-total');
  total.textContent=estimate?.complete?totalMoney(estimate):'—';
  total.dataset.totalJpy=estimate?.complete?String(estimate.total_jpy):'';
  total.dataset.fitoutJpy=estimate?.parts_complete?String(estimate.fitout_total_jpy):'';total.dataset.vehicleJpy=estimate?.vehicle_selection_complete?String(estimate.new_vehicle_total_jpy):'';
  total.dataset.total=estimate?.complete?String(estimate.total):'';
  total.dataset.currency=estimate?.currency||'';
  review.querySelector('.price-fitout-label').textContent=fitoutLabel();
  review.querySelector('.price-vehicle-label').textContent=vehicleLabel();
  $('#reference-fitout-price').textContent=estimate?.parts_complete?formatAmount(estimate.fitout_total,estimate.currency):'—';
  $('#reference-vehicle-price').textContent=state.vehiclePurchase!=='new'?(en?'Vehicle excluded':'車体なし'):!estimate?.vehicle_selection_complete?(en?'Select specification':'仕様を選択してください'):formatAmount(estimate.new_vehicle_total,estimate.currency);
  missing.hidden=!estimate?.unpriced_items?.length;
  missing.textContent=(en?'Not yet priced: ':'未設定：')+(estimate?.unpriced_items||[]).map(i=>(i.kind==='installation'?(en?'Installation — ':'施工費・'):'')+(en?i.name_en:i.name)).join(' / ')+(en?'. These amounts are not included in the subtotal.':'。この金額は小計に含まれていません。');
  detail.hidden=!estimate?.parts_complete;
  detail.querySelector('summary').textContent=en?'Fit-out price breakdown':'架装参考価格の内訳';
  const rows=[['fitout_parts_total',en?'Furniture / interior parts':'家具・内装パーツ'],['installation_total',en?'Installation (priced items)':'取付施工費（設定済み分）'],['dealer_options_total',en?'Lights / insulation / dealer options (priced items)':'ライト・断熱・装備（設定済み分）']];
  for(const [i,[key,label]]of rows.entries()){const row=detail.querySelectorAll('dl>div')[i];row.querySelector('dt').textContent=label;const kind=key==='installation_total'?'installation':key==='dealer_options_total'?'equipment':null;row.querySelector('dd').textContent=estimate?formatAmount(estimate[key],estimate.currency)+(kind&&estimate.unpriced_items.some(x=>x.kind===kind)?(en?' + unpriced items':' ＋ 未設定分'):''):'—';}
  review.querySelector('.price-scope').textContent=!estimate?(en?'Reference prices are temporarily unavailable.':'参考価格を読み込めませんでした。'):!estimate.parts_complete?(en?'Choose the required flooring to see the reference price.':'必須の床を選ぶと参考価格を表示します。'):!estimate.vehicle_selection_complete?(en?'Choose fuel and drivetrain in the Vehicle step to see the total.':'「車体」で燃料・駆動方式を選ぶと合計を表示します。'):scopeNote();
  const vehicleNote=review.querySelector('.price-vehicle-note');vehicleNote.hidden=state.vehiclePurchase!=='new';vehicleNote.textContent=newVehiclePriceNote(getLanguage());
  const exchange=review.querySelector('.price-exchange');exchange.hidden=domestic||!catalogue?.exchange_rate;exchange.replaceChildren();
  if(!exchange.hidden){const fx=catalogue.exchange_rate;exchange.append(`${fx.date} · A$1 = JPY ${fx.jpy_per_aud.toFixed(2)} · `);const source=document.createElement('a');source.href=fx.source_url;source.target='_blank';source.rel='noopener noreferrer';source.textContent='RBA';exchange.append(source,document.createElement('br'),roundingNote());}
  floorOption.hidden=state.bed!=='two-side-bed';
  $('#floor-slide-selected').checked=state.floorSlide===true;
  floorOption.querySelector('strong').textContent=en?'Add removable centre floor slide':'脱着式の床スライドを追加';
  floorOption.querySelector('small').textContent=en?'Optional rear pull-out in the centre aisle':'中央通路から後方へ引き出すオプション';
  wallNote.hidden=!state.wall||state.wall==='none';
  wallNote.textContent=en?'Wall panel materials include matching colour panels, window insulation and exterior insulation/privacy wrapping. The configured package fitting fee is added once.':'壁面パネルの部材には、同色カラーパネル・窓まわりの断熱／目隠し用ラッピング材を含みます。設定済みの施工費は壁面＋カラーパネル一式分として加算します。';
  cutoutReview.textContent=lightingCutoutSummary(state,getLanguage());
  lightingNote.textContent=state.vehicle==='super-gl'?(en?'TWI ceiling lighting is included with the ceiling. Selected tailgate lights add their configured equipment-and-fitting reference amount. Your dealer confirms the fitting method.':'TWI天井の付属照明は天井価格に含みます。バックドアライトを選ぶと、本体・取付工賃込みの設定済み参考額を加算します。取付方法は取扱店が確認します。'):(en?'Light selections also record panel cutout requests. Your dealer confirms the cutouts and sends them to Hexa. Selected lights add their configured equipment-and-fitting reference amount.':'ライトの選択はパネル開口の希望としても記録します。取扱店が開口仕様を確認しHexaへ伝えます。選択したライトは、本体・取付工賃込みの設定済み参考額を加算します。');
  insulationNote.textContent=en?'Insulation is arranged by your dealer. Its configured material-and-installation reference amount is added when selected.':'断熱施工は取扱店が手配します。選択時に、材料・施工込みの設定済み参考額を加算します。';
  if(!outcome&&$('.outro-copy')){outcome=addElement('p','outro-reference-price',$('.outro-copy'));outcome.className='outro-reference-price'}
  if(outcome){
   outcome.hidden=!estimate?.complete;outcome.replaceChildren();if(estimate?.complete){const label=document.createElement('span'),amount=document.createElement('strong');label.textContent=taxLabel(estimate);amount.textContent=totalMoney(estimate);outcome.append(label,amount);}
   if(!outcomeNote){outcomeNote=addElement('p','outro-dealer-price-note',$('.outro-copy'));outcomeNote.className='outro-dealer-price-note';outcome.after(outcomeNote)}
   outcomeNote.hidden=!estimate?.complete;
   outcomeNote.textContent=(state.vehiclePurchase==='new'?newVehiclePriceNote(getLanguage())+' ':'')+scopeNote()+(estimate?.unpriced_items?.length?' '+missing.textContent:'');
  }
 }
 function summary(s=getState()) {
  const estimate=quote(s);if(!estimate?.complete)return '';
  const en=getLanguage()==='en';
  const unpriced=estimate.unpriced_items.length?'\n'+(en?'Not yet priced: ':'未設定：')+estimate.unpriced_items.map(i=>(i.kind==='installation'?(en?'Installation — ':'施工費・'):'')+(en?i.name_en:i.name)).join(' / '):'';
  const serviceSummary=estimate.service_items.map(i=>'\n'+(en?i.name_en:i.name)+(i.quantity>1?' × '+i.quantity:'')+': '+(i.amount===null?(en?'Not yet priced':'未設定'):formatAmount(i.amount,estimate.currency))+' ('+(i.price_source==='retailer'?(en?'Dealer rate':'取扱店設定'):(en?'Hexa reference':'Hexa参考'))+')').join('');
  return '\n'+taxLabel(estimate)+': '+totalMoney(estimate)+'\n'+fitoutLabel()+': '+formatAmount(estimate.fitout_total,estimate.currency)+'\n'+vehicleLabel()+': '+(s.vehiclePurchase==='new'?formatAmount(estimate.new_vehicle_total,estimate.currency):(en?'Vehicle excluded':'車体なし'))+unpriced+serviceSummary+'\n'+scopeNote(s)+(s.vehiclePurchase==='new'?'\n'+newVehiclePriceNote(getLanguage()):'')+'\n'+dealerNote()+(estimate.exchange_rate?`\n${estimate.exchange_rate.date} · A$1 = JPY ${estimate.exchange_rate.jpy_per_aud.toFixed(2)} · ${estimate.exchange_rate.source_url}\n`+roundingNote():'');
 }
 return {update,quote,summary};
}
