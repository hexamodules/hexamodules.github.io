import {VEHICLE_GRADES,VEHICLE_POWERTRAINS,normalizeNewVehicle,newVehicleSummary} from './new-vehicle.js?v=1';
export function createNewVehicleControls({getState,getLanguage,onChange}){
 const pane=document.querySelector('#pane-vehicle');
 pane.setAttribute('data-module-i18n','');
 pane.innerHTML=`<div class="vehicle-pane-heading"><span class="eyebrow">BASE VEHICLE</span><h2></h2><p class="helper"></p></div>
  <fieldset class="vehicle-purchase-options"><legend></legend>${['owned','new'].map(value=>`<label class="vehicle-purchase-choice"><input type="radio" name="vehiclePurchase" value="${value}"><span><strong></strong><small></small></span></label>`).join('')}</fieldset>
  <section id="new-vehicle-options" hidden><p class="vehicle-body-spec"></p>
   <fieldset class="new-vehicle-grade"><legend></legend><div class="new-vehicle-grade-options"></div></fieldset>
   <fieldset class="new-vehicle-powertrain"><legend></legend><div>${Object.keys(VEHICLE_POWERTRAINS).map(value=>`<label class="vehicle-purchase-choice"><input type="radio" name="newVehiclePowertrain" value="${value}"><span><strong></strong></span></label>`).join('')}</div></fieldset>
   <p id="vehicle-selection-help" class="helper" role="status"></p><p class="vehicle-pricing-help helper"></p>
  </section>`;
 pane.addEventListener('change',event=>{
  const input=event.target;
  if(['vehiclePurchase','newVehicleGrade','newVehiclePowertrain'].includes(input.name))onChange({[input.name]:input.value});
 });
 function update(){
  const state=normalizeNewVehicle(getState()),en=getLanguage()==='en',lang=en?'en':'ja';
  pane.querySelector('h2').textContent=en?'Choose your base vehicle':'車体を選ぶ';
  pane.querySelector('.vehicle-pane-heading .helper').textContent=en?'Include a new vehicle, or bring your own.':'新車を含めるか、お持ち込みかを選べます。';
  pane.querySelector('.vehicle-purchase-options legend').textContent=en?'Vehicle supply':'車体のご用意';
  for(const [value,title,help] of [
   ['owned',en?'Vehicle excluded':'車体なし（持ち込み）',en?'Use your own vehicle':'お持ちの車両への架装を相談する'],
   ['new',en?'Include a new vehicle':'新車を含める',en?'Request a quote including a new vehicle':'新車の手配から取扱店に相談する']
  ]){
   const input=pane.querySelector(`[name=vehiclePurchase][value=${value}]`),label=input.closest('label');
   input.checked=state.vehiclePurchase===value;label.querySelector('strong').textContent=title;label.querySelector('small').textContent=help;
  }
  const options=pane.querySelector('#new-vehicle-options');options.hidden=state.vehiclePurchase!=='new';
  options.querySelector('.vehicle-body-spec').textContent=en?'HiAce Van · Narrow body · Standard roof · Standard floor · 5 doors · 6AT':'ハイエース バン · 標準ボディ（ナロー）・標準ルーフ・標準フロア・5ドア・6AT';
  options.querySelector('.new-vehicle-grade legend').textContent=en?'Grade':'グレード';
  const grades=state.vehicle==='super-gl'?['super-gl','dark-prime-ii']:['dx'],gradeOptions=pane.querySelector('.new-vehicle-grade-options');
  if(gradeOptions.dataset.family!==state.vehicle){
   gradeOptions.dataset.family=state.vehicle;
   gradeOptions.innerHTML=grades.map(value=>`<label class="vehicle-purchase-choice"><input type="radio" name="newVehicleGrade" value="${value}"><span><strong></strong><small></small></span></label>`).join('');
  }
  for(const grade of grades){
   const input=gradeOptions.querySelector(`[value="${grade}"]`),label=input.closest('label');
   input.checked=state.newVehicleGrade===grade;label.querySelector('strong').textContent=VEHICLE_GRADES[grade][lang];
   label.querySelector('small').textContent=VEHICLE_GRADES[grade].seats+(en?' seats (base vehicle)':'人乗り（ベース車両）');
  }
  options.querySelector('.new-vehicle-powertrain legend').textContent=en?'Fuel / drivetrain':'燃料・駆動方式';
  for(const [value,powertrain] of Object.entries(VEHICLE_POWERTRAINS)){
   const input=options.querySelector(`[name=newVehiclePowertrain][value="${value}"]`);input.checked=state.newVehiclePowertrain===value;
   input.closest('label').querySelector('strong').textContent=powertrain[lang];
  }
  for(const input of options.querySelectorAll('input'))input.disabled=options.hidden;
  pane.querySelector('#vehicle-selection-help').textContent=state.newVehiclePowertrain?(en?'Specification selected.':'仕様を選択しました。'):(en?'Select fuel and drivetrain to include a vehicle reference price.':'燃料・駆動方式を選択してください。');
  pane.querySelector('.vehicle-pricing-help').textContent=en?'The vehicle reference price appears on the Review page. Manufacturer options and registration fees are not included. Your dealer will confirm availability and final specification.':'新車参考価格は最後の確認画面で表示します。メーカーオプション・登録諸費用は含みません。納期や最終仕様は取扱店にご確認ください。';
  let row=document.querySelector('#vehicle-purchase-summary');
  if(!row){row=document.createElement('div');row.id='vehicle-purchase-summary';row.className='selection-row';row.setAttribute('data-module-i18n','');row.innerHTML='<span></span><b></b>';document.querySelector('#selection-summary').append(row)}
  row.querySelector('span').textContent=en?'Vehicle':'車体';row.querySelector('b').textContent=newVehicleSummary(state,lang);
 }
 return {update};
}
