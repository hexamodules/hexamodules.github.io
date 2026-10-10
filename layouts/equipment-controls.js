// Equipment and electrical controls are installed after Start.
export function createEquipmentUI({getState,getLastWallColor,apply,AIRCON,HEATER,INSULATION,WALL_COLORS,dealerOptions,airconEnabled,heaterEnabled,insulationEnabled,electricalEnabled,wallEnabled,isSuperGL,electricalLabel}){
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
function airconUI(){
 const state=getState();
 $('#aircon-status + .helper').hidden=isSuperGL(state);
 const on=airconEnabled();
 $$('[data-aircon]').forEach(b=>{const selected=b.dataset.aircon===(on?AIRCON.value:'none');b.classList.toggle('active',selected);b.setAttribute('aria-pressed',selected)});
 $('#aircon-view').hidden=!on;
 $('#aircon-status').textContent=isSuperGL(state)?(on?'スーパーGLへのエアコン取付イメージです。':'スーパーGLでは、DX用の壁面板張り仕上げは追加されません。'):on?`${WALL_COLORS[state.wall].label}の壁に設置しています。`:wallEnabled()?'選択中の壁仕上げにエアコンを追加できます。':'エアコンを選ぶと、壁仕上げも自動で追加されます。';
 if(dealerOptions.ac)$('#selection-summary').insertAdjacentHTML('beforeend',`<div class="selection-row" data-dealer-option-row="ac"><span>エアコン</span><b>${on?AIRCON.label+'（配管カバー付き）':'なし'}</b></div>`);
}
function heaterUI(){
 const state=getState();
 const on=heaterEnabled();
 $$('[data-heater]').forEach(b=>{const selected=b.dataset.heater===(on?HEATER.value:'none');b.classList.toggle('active',selected);b.setAttribute('aria-pressed',selected)});
 $('#heater-indicator').hidden=!on;
 if(dealerOptions.heater)$('#selection-summary').insertAdjacentHTML('beforeend',`<div class="selection-row" data-dealer-option-row="heater"><span>FFヒーター</span><b>${on?HEATER.label:'なし'}</b></div>`);
}
function insulationUI(){
 const state=getState();
 const on=insulationEnabled();
 $$('[data-insulation]').forEach(b=>{const selected=b.dataset.insulation===(on?INSULATION.value:'none');b.classList.toggle('active',selected);b.setAttribute('aria-pressed',selected)});
 $('#insulation-indicator').hidden=!on;
 if(dealerOptions.insulation)$('#selection-summary').insertAdjacentHTML('beforeend',`<div class="selection-row" data-dealer-option-row="insulation"><span>断熱施工</span><b>${on?'選択中':'なし'}</b></div>`);
}
function electricalUI(){
 const state=getState();
 const on=electricalEnabled();
 $('#electrical-standard').checked=on;
 $('#standard-package-card').classList.toggle('is-selected',on);
 $('#standard-battery-value').textContent=`${on?state.batteryAh:100}Ah`;
 $('#electrical-upgrades').hidden=!on;
 $$('[data-battery]').forEach(b=>{const selected=Number(b.dataset.battery)===state.batteryAh;b.setAttribute('aria-pressed',selected);b.disabled=!on});
 $$('[data-inverter]').forEach(b=>{const selected=Number(b.dataset.inverter)===state.inverterW;b.setAttribute('aria-pressed',selected);b.disabled=!on});
 $('#battery-ac-recommendation').classList.toggle('is-recommended',airconEnabled()&&state.batteryAh<300);
 $('#electrical-preview').hidden=!on;
 $('.stage').classList.toggle('has-electrical',on);
 $('#electrical-preview-battery').textContent=`バッテリー${state.batteryAh}Ah`;
 $('#electrical-preview-inverter').hidden=!state.inverterW;
 $('#electrical-preview-inverter').textContent=`インバーター${state.inverterW}W`;
 if(dealerOptions.electrical)$('#selection-summary').insertAdjacentHTML('beforeend',`<div class="selection-row" data-dealer-option-row="electrical"><span>電装</span><b>${electricalLabel()}</b></div>`);
}
$('#aircon-options').addEventListener('click',e=>{const b=e.target.closest('[data-aircon]');if(!b||!['none',AIRCON.value].includes(b.dataset.aircon))return;const next={...getState(),ac:b.dataset.aircon};if(airconEnabled(next)&&!wallEnabled(next)&&!isSuperGL(next)){next.wall=getLastWallColor();next.panel='auto'}apply(next).catch(console.error)});
$('#heater-options').addEventListener('click',e=>{const b=e.target.closest('[data-heater]');if(!b||!['none',HEATER.value].includes(b.dataset.heater))return;apply({...getState(),heater:b.dataset.heater}).catch(console.error)});
$('#insulation-options').addEventListener('click',e=>{const b=e.target.closest('[data-insulation]');if(!b||!['none',INSULATION.value].includes(b.dataset.insulation))return;apply({...getState(),insulation:b.dataset.insulation}).catch(console.error)});
$('#electrical-standard').addEventListener('change',e=>apply({...getState(),electrical:e.target.checked?'standard':'none',batteryAh:100,inverterW:0}).catch(console.error));
$('#battery-options').addEventListener('click',e=>{const b=e.target.closest('[data-battery]');if(!b||!electricalEnabled())return;const value=Number(b.dataset.battery);if([100,200,300].includes(value))apply({...getState(),batteryAh:value}).catch(console.error)});
$('#inverter-options').addEventListener('click',e=>{const b=e.target.closest('[data-inverter]');if(!b||!electricalEnabled())return;const value=Number(b.dataset.inverter);if([0,1000,2000].includes(value))apply({...getState(),inverterW:value}).catch(console.error)});
return {airconUI,heaterUI,insulationUI,electricalUI};
}
