export const isSuperGL = s => s.vehicle === 'super-gl';
export const twiCeilingEnabled = s => isSuperGL(s) && ['clear','walnut'].includes(s.twiCeiling);
export const quarterCount = s => isSuperGL(s) ? (s.quarterPanels === 'both' ? 2 : ['left','right'].includes(s.quarterPanels) ? 1 : 0) : 0;
export const vehicleName = s => isSuperGL(s) ? 'トヨタ ハイエース バン スーパーGL' : 'トヨタ ハイエース バン DX';
export const vehicleNameEnglish = s => 'Toyota HiAce 200 Series ' + (isSuperGL(s) ? 'Super GL' : 'DX') + ' · LWB · Narrow body · Standard roof · 5-door';
export const twiCeilingLabel = s => twiCeilingEnabled(s) ? 'TWI 檜天井 · ' + (s.twiCeiling === 'walnut' ? 'ウォールナット' : 'クリア') + '（照明付き）' : 'なし';
export const quarterLabel = s => ({left:'TWI クォーターパネル · 助手席側',right:'TWI クォーターパネル · 運転席側',both:'TWI クォーターパネル · 両側'})[s.quarterPanels] || 'なし';
export function normalizeBaseVehicle(s) {
 const next={...s,vehicle:isSuperGL(s)?'super-gl':'dx'};
 if(isSuperGL(next)) {
  next.ceiling='none';next.wall='none';next.panel='none';next.ceilingLights=false;
  next.twiCeiling=['clear','walnut'].includes(s.twiCeiling)?s.twiCeiling:'none';
  next.quarterPanels=['left','right','both'].includes(s.quarterPanels)?s.quarterPanels:'none';
  next.twiBarLights=s.twiBarLights!==false;next.twiIndirectLights=s.twiIndirectLights!==false;
 } else { next.twiCeiling='none';next.quarterPanels='none';next.twiBarLights=true;next.twiIndirectLights=true; }
 return next;
}
export function installBaseVehicleControls({getState,getLanguage,onVehicle,onChange}) {
 const $=selector=>document.querySelector(selector);
 const opening=document.createElement('fieldset');opening.className='opening-vehicles';opening.id='base-vehicle-options';
 opening.innerHTML='<legend>Choose your vehicle</legend><div class="vehicle-choice-grid"><button type="button" data-base-vehicle="dx" aria-pressed="true"><small>TOYOTA HIACE VAN</small><strong>DX</strong><span class="base-vehicle-check" aria-hidden="true">✓</span></button><button type="button" data-base-vehicle="super-gl" aria-pressed="false"><small>TOYOTA HIACE VAN</small><strong>Super GL</strong><span class="base-vehicle-check" aria-hidden="true">✓</span></button></div><p>標準ボディ（ナロー）・標準ルーフ・5ドア共通</p>';
 const twiAttribution=document.createElement('p');
 twiAttribution.id='opening-twi-attribution';twiAttribution.className='twi-attribution';
 twiAttribution.setAttribute('data-module-i18n','');twiAttribution.hidden=true;
 opening.querySelector('[data-base-vehicle="super-gl"]').setAttribute('aria-describedby',twiAttribution.id);
 $('.opening-start-row').before(opening,twiAttribution);
 // The common specification now belongs to the vehicle selector itself.
 $('#opening-vehicle-compatibility').hidden=true;
 const ceiling=document.createElement('div');ceiling.id='twi-ceiling-options';ceiling.className='twi-options';
 ceiling.innerHTML='<p class="twi-maker">TWI craft</p><p class="helper">檜のウッドシーリング。照明が付属しています。</p><div class="twi-finish-grid"><button type="button" data-twi-ceiling="clear" aria-pressed="false"><img src="assets/twi/ceiling-clear.jpg" alt="TWI製 檜天井 クリア" width="1100" height="733"><span class="twi-caption"><strong>クリア</strong><small>照明付き</small></span><span class="check" aria-hidden="true">✓</span></button><button type="button" data-twi-ceiling="walnut" aria-pressed="false"><img src="assets/twi/ceiling-walnut.jpg" alt="TWI製 檜天井 ウォールナット" width="1100" height="735"><span class="twi-caption"><strong>ウォールナット</strong><small>照明付き</small></span><span class="check" aria-hidden="true">✓</span></button></div><button type="button" class="twi-none" data-twi-ceiling="none" aria-pressed="true">天井を追加しない</button><p class="helper">3Dは写真を参考にした仕上がりイメージです。</p>';
 $('#ceiling-options').before(ceiling);
 const wallContent=$('#wall-step .step-content');
 const dxWall=document.createElement('div');dxWall.id='dx-wall-content';while(wallContent.firstChild)dxWall.append(wallContent.firstChild);wallContent.append(dxWall);
 const quarters=document.createElement('div');quarters.id='twi-quarter-options';quarters.className='twi-options';
 quarters.innerHTML='<p class="twi-maker">TWI craft</p><img class="twi-quarter-photo" src="assets/twi/quarter-panel.jpg" alt="TWI製 クォーターパネルの取付例" width="1100" height="733"><p class="helper">片側1枚、両側2枚。写真は使用イメージです。</p><div class="twi-quantity" role="group" aria-label="クォーターパネルの枚数"><button type="button" data-quarter-choice="none">なし</button><button type="button" data-quarter-choice="single"><span>片側</span></button><button type="button" data-quarter-choice="both"><span>両側</span></button></div><div id="quarter-side-options" role="group" aria-label="取付側"><p class="helper">取付側</p><div class="twi-side-grid"><button type="button" data-quarter-side="left">助手席側（左）</button><button type="button" data-quarter-side="right">運転席側（右）</button></div></div><button type="button" class="wall-view" id="quarter-view">クォーターパネルを見る</button></div>';
 wallContent.append(quarters);
 const home=document.createElement('a');home.id='studio-home-link';home.className='studio-home-link';home.href='../';home.textContent='← トップページに戻る';$('.studio-heading').append(home);
 const vehicleSelect=document.createElement('select');vehicleSelect.id='studio-base-vehicle';vehicleSelect.setAttribute('aria-label','ベース車両');vehicleSelect.innerHTML='<option value="dx">トヨタ ハイエース バン DX</option><option value="super-gl">トヨタ ハイエース バン スーパーGL</option>';
 $('#studio-vehicle-compatibility strong').replaceWith(vehicleSelect);
 opening.addEventListener('click',e=>{const b=e.target.closest('[data-base-vehicle]');if(b)onVehicle(b.dataset.baseVehicle)});
 vehicleSelect.addEventListener('change',e=>onVehicle(e.target.value));
 ceiling.addEventListener('click',e=>{const b=e.target.closest('[data-twi-ceiling]');if(b)onChange({twiCeiling:b.dataset.twiCeiling})});
 let lastSide='left';
 quarters.addEventListener('click',e=>{
  const b=e.target.closest('[data-quarter-choice],[data-quarter-side]');if(!b)return;
  if(b.dataset.quarterSide)lastSide=b.dataset.quarterSide;
  onChange({quarterPanels:b.dataset.quarterSide||(b.dataset.quarterChoice==='single'?lastSide:b.dataset.quarterChoice)});
 });
 function update() {
  const s=getState(),sgl=isSuperGL(s),en=getLanguage()==='en';
  document.documentElement.dataset.baseVehicle=s.vehicle;
  twiAttribution.hidden=!sgl;
  twiAttribution.textContent=en?'Super GL uses TWI interior parts (ceiling and window panels).':'スーパーGLでは、TWI製の内装パーツ（天井・ウィンドウパネル）を使用しています。';
  for(const b of opening.querySelectorAll('[data-base-vehicle]'))b.setAttribute('aria-pressed',String(b.dataset.baseVehicle===s.vehicle));
  vehicleSelect.value=s.vehicle;
  ceiling.hidden=!sgl;quarters.hidden=!sgl;dxWall.hidden=sgl;
  $('#ceiling-options').hidden=sgl;$('#ceiling-color-section').hidden=sgl||s.ceiling==='none';
  $('#ceiling-view').hidden=sgl?!twiCeilingEnabled(s):s.ceiling==='none';
  $('#ceiling-view-help').hidden=sgl||s.ceiling==='none';
  $('#wall-step summary > span:first-child').textContent=sgl?'クォーターパネル':'壁';
  for(const b of ceiling.querySelectorAll('[data-twi-ceiling]'))b.setAttribute('aria-pressed',String(b.dataset.twiCeiling===s.twiCeiling));
  const choice=s.quarterPanels==='both'?'both':quarterCount(s)?'single':'none';
  for(const b of quarters.querySelectorAll('[data-quarter-choice]'))b.setAttribute('aria-pressed',String(b.dataset.quarterChoice===choice));
  $('#quarter-side-options').hidden=choice!=='single';
  for(const b of quarters.querySelectorAll('[data-quarter-side]'))b.setAttribute('aria-pressed',String(b.dataset.quarterSide===s.quarterPanels));
  if(['left','right'].includes(s.quarterPanels))lastSide=s.quarterPanels;
  $('#quarter-view').hidden=!quarterCount(s);
  const q=new URLSearchParams(location.search);home.href='../?'+new URLSearchParams({location:q.get('location')||'jp',lang:en?'en':'ja'});
 }
 return {update};
}
