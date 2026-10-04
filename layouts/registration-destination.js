// Local postcode lookup: no customer input is sent to a third-party service.
export const REGISTRATION_STATES={ACT:'Australian Capital Territory',NSW:'New South Wales',NT:'Northern Territory',QLD:'Queensland',SA:'South Australia',TAS:'Tasmania',VIC:'Victoria',WA:'Western Australia'};
export const EMPTY_REGISTRATION={registrationState:null,registrationPostcode:'',registrationLocality:null};
let postcodeIndex=null,loadPromise=null,loadError=false;
export function normalizeRegistration(s,enabled){
 if(!enabled)return {...EMPTY_REGISTRATION};
 const registrationState=Object.hasOwn(REGISTRATION_STATES,s.registrationState)?s.registrationState:null;
 const registrationPostcode=typeof s.registrationPostcode==='string'&&/^\d{0,4}$/.test(s.registrationPostcode)?s.registrationPostcode:'';
 let registrationLocality=typeof s.registrationLocality==='string'?s.registrationLocality.replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,180)||null:null;
 if(postcodeIndex&&registrationLocality&&!rowsFor(registrationPostcode,registrationState).some(r=>r[1]===registrationLocality))registrationLocality=null;
 return {registrationState,registrationPostcode,registrationLocality};
}
function rowsFor(code,state){return (postcodeIndex?.[code]||[]).filter(row=>!state||row[0]===state)}
function lookup(s){
 const code=s.registrationPostcode||'';
 if(!code)return {status:'not_entered',rows:[],states:[]};
 if(!/^\d{4}$/.test(code))return {status:'incomplete',rows:[],states:[]};
 if(!postcodeIndex)return {status:loadError?'unavailable':'loading',rows:[],states:[]};
 const all=rowsFor(code),states=[...new Set(all.map(r=>r[0]))];
 if(!all.length)return {status:'not_found',rows:[],states};
 if(!s.registrationState)return {status:'state_required',rows:all,states};
 const rows=rowsFor(code,s.registrationState);
 if(!rows.length)return {status:'state_mismatch',rows,states};
 const matched=rows.some(r=>r[1]===s.registrationLocality);
 return {status:matched?'matched':'locality_required',rows,states};
}
export function registrationDetails(s,enabled){
 if(!enabled)return null;
 const result=lookup(s);
 return {country:'AU',registration_state:s.registrationState||null,postcode:s.registrationPostcode||null,locality:result.status==='matched'?s.registrationLocality:null,postcode_lookup:result.status};
}
export function registrationRows(s,enabled){
 if(!enabled)return [];
 const details=registrationDetails(s,true);
 return [['登録する州・準州',details.registration_state?`${details.registration_state} — ${REGISTRATION_STATES[details.registration_state]}`:'未選択'],['郵便番号',details.postcode||'未入力'],['配送先のエリア',details.locality||(['not_found','state_mismatch','unavailable'].includes(details.postcode_lookup)?'要確認':'未選択')]];
}
// The market's business base is not the customer's destination.
export function registrationLocationLabel(s,enabled){
 const details=registrationDetails(s,enabled);
 if(!details)return '未選択';
 if(details.locality)return `${details.locality} · ${details.registration_state} ${details.postcode}`;
 if(details.registration_state)return `${details.registration_state} — ${REGISTRATION_STATES[details.registration_state]}`;
 return '未選択';
}
export function createRegistrationDestination({getState,isEnabled,onChange,onRefresh}){
 const $=s=>document.querySelector(s);
 const root=$('#registration-destination'),stateSelect=$('#registration-state'),postcode=$('#registration-postcode'),locality=$('#registration-locality'),localityWrap=$('#registration-locality-wrap'),status=$('#registration-lookup-status'),retry=$('#registration-lookup-retry');
 let optionKey='';
 function load(){
  if(loadPromise)return;
  loadPromise=fetch(new URL('./assets/au-postcodes.json?v=20260915',import.meta.url)).then(response=>{if(!response.ok)throw new Error('Postcode data unavailable');return response.json()}).then(data=>{
   if(!data.postcodes||!Object.keys(data.postcodes).length)throw new Error('Invalid postcode data');
   postcodeIndex=data.postcodes;loadError=false;
  }).catch(()=>{loadError=true}).finally(()=>onRefresh());
 }
 function refresh(){
  const enabled=isEnabled();root.hidden=!enabled;
  $('#shipping-agent').setAttribute('aria-expanded',enabled);
  for(const input of [stateSelect,postcode,locality])input.disabled=!enabled;
  if(!enabled)return;
  if(!postcodeIndex&&!loadError)load();
  const s=getState(),normalized=normalizeRegistration(s,true),patch={};
  for(const key of Object.keys(normalized))if(normalized[key]!==s[key])patch[key]=normalized[key];
  const next={...s,...patch};
  // Codes can span a state border (for example 2611). Only infer a unique state.
  if(postcodeIndex&&/^\d{4}$/.test(next.registrationPostcode)){
   const all=rowsFor(next.registrationPostcode),states=[...new Set(all.map(r=>r[0]))];
   if(!next.registrationState&&states.length===1){patch.registrationState=states[0];next.registrationState=states[0]}
   const rows=rowsFor(next.registrationPostcode,next.registrationState);
   if(next.registrationState&&rows.length===1&&next.registrationLocality!==rows[0][1])patch.registrationLocality=rows[0][1];
  }
  if(Object.keys(patch).length){onChange(patch);return}
  if(stateSelect.value!==(s.registrationState||''))stateSelect.value=s.registrationState||'';
  if(postcode.value!==(s.registrationPostcode||''))postcode.value=s.registrationPostcode||'';
  const result=lookup(s),hasOptions=s.registrationState&&result.rows.length>0;
  localityWrap.hidden=!hasOptions;locality.disabled=!hasOptions;
  const key=JSON.stringify(result.rows);
  if(key!==optionKey){
   optionKey=key;locality.replaceChildren();
   const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='エリアを選択';locality.append(placeholder);
   for(const row of result.rows){const option=document.createElement('option');option.value=row[1];option.textContent=row[1];locality.append(option)}
  }
  locality.value=s.registrationLocality||'';
  const messages={not_entered:'4桁の郵便番号を入力すると、エリアの候補が表示されます。',incomplete:'郵便番号を4桁で入力してください。',loading:'エリアを確認しています…',unavailable:'エリア情報を読み込めませんでした。再試行できます。',not_found:'該当するエリアが見つかりません。郵便番号を確認してください。',state_required:'この郵便番号には複数の州・準州のエリアがあります。登録する州を選択してください。',state_mismatch:'郵便番号のエリアと登録する州が一致していません。州または郵便番号を確認してください。',locality_required:'該当するエリアを選択してください。'};
  status.textContent=result.status==='matched'?`${s.registrationLocality} · ${s.registrationState} ${s.registrationPostcode}`:(messages[result.status]||'');
  status.dataset.status=result.status;status.classList.toggle('is-warning',['not_found','state_mismatch','unavailable'].includes(result.status));
  postcode.setAttribute('aria-invalid',['not_found','state_mismatch'].includes(result.status));retry.hidden=!loadError;
 }
 stateSelect.addEventListener('change',()=>onChange({registrationState:stateSelect.value||null,registrationLocality:null}));
 postcode.addEventListener('input',()=>{
  const code=postcode.value.replace(/\D/g,'').slice(0,4);postcode.value=code;
  onChange({registrationPostcode:code,registrationLocality:null});
 });
 locality.addEventListener('change',()=>onChange({registrationLocality:locality.value||null}));
 retry.addEventListener('click',()=>{loadError=false;loadPromise=null;onRefresh()});
 return {refresh};
}
