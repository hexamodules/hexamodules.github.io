import {postcodeKey} from './setup-fields.js?v=20261005';
const cache=new Map();
async function addressRows(code,market){
 const path=market==='au'?'au-postcodes.json':`jp-postcodes-20260831/${code.slice(0,3)}.json`;
 if(!cache.has(path)){
  const promise=(async()=>{const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);try{
   const response=await fetch(new URL('../layouts/assets/'+path,import.meta.url),{signal:controller.signal});
   if(!response.ok)throw Error('Address unavailable');return await response.json();
  }finally{clearTimeout(timeout)}})();
  cache.set(path,promise);promise.catch(()=>{if(cache.get(path)===promise)cache.delete(path)});
 }
 const data=await cache.get(path),rows=(market==='au'?data.postcodes?.[code]:data[code])||[];
 if(!Array.isArray(rows)||!rows.every(row=>Array.isArray(row)&&row.every(p=>typeof p==='string')&&row.length===(market==='au'?2:3)))throw Error('Invalid address');
 return [...new Set(rows.map(row=>market==='au'?row[1]+', '+row[0]:row.join('')))];
}
export function setupAddressLookup({form,onSave}){
 const input=form.elements.postalCode,address=form.elements.address;
 const box=document.querySelector('#company-address-lookup'),status=document.querySelector('#company-address-status'),result=document.querySelector('#company-address-result'),choice=document.querySelector('#company-address-choice'),apply=document.querySelector('#apply-company-address'),retry=document.querySelector('#retry-company-address');
 let key='',generation=0,automaticAddress='',candidate='';
 const setMessage=text=>status.textContent=text;
 function applyCandidate(explicit=false){
  if(!candidate)return;
  if(explicit||!address.value.trim()||address.value===automaticAddress){
   address.value=candidate;address.setCustomValidity('');automaticAddress=candidate;apply.hidden=true;onSave();
   setMessage('所在地に反映しました。番地・建物名を追記してください。');
  }else if(address.value.startsWith(candidate)){
   apply.hidden=true;setMessage('郵便番号の住所と一致しています。番地・建物名もご確認ください。');
  }else{apply.hidden=false;setMessage('候補が見つかりました。入力済みの所在地はそのまま残しています。必要に応じて反映してください。')}
 }
 async function refresh(force=false){
  const market=form.elements.market.value||'jp',code=postcodeKey(input.value,market),next=market+':'+code;
  if(next===key&&!force)return;
  if(key&&next!==key&&automaticAddress&&address.value===automaticAddress){address.value='';automaticAddress='';onSave()}
  key=next;candidate='';const ticket=++generation;
  choice.hidden=true;choice.disabled=true;choice.replaceChildren();apply.hidden=true;retry.hidden=true;result.hidden=true;result.textContent='';box.hidden=!code;
  if(!code){box.removeAttribute('aria-busy');return}
  box.setAttribute('aria-busy','true');setMessage('郵便番号から住所を確認しています…');
  try{
   const rows=await addressRows(code,market);if(ticket!==generation)return;
   if(!rows.length){setMessage('該当する住所が見つかりません。郵便番号を確認するか、所在地を直接入力してください。');return}
   if(rows.length===1){candidate=rows[0];result.textContent=candidate;result.hidden=false;applyCandidate()}
   else{
    choice.append(new Option('該当するエリアを選択してください',''));
    rows.forEach(row=>choice.append(new Option(row,row)));choice.hidden=false;choice.disabled=false;
    setMessage('複数の候補があります。該当するエリアを選択してください。');
   }
  }catch{if(ticket===generation){setMessage('住所を読み込めませんでした。再読み込みするか、所在地を直接入力してください。');retry.hidden=false}}
  finally{if(ticket===generation)box.setAttribute('aria-busy','false')}
 }
 input.addEventListener('input',()=>refresh());input.addEventListener('blur',()=>refresh());
 for(const radio of form.querySelectorAll('[name=market]'))radio.addEventListener('change',()=>refresh());
 choice.addEventListener('change',()=>{candidate=choice.value;apply.hidden=true;if(candidate)applyCandidate()});
 apply.addEventListener('click',()=>applyCandidate(true));retry.addEventListener('click',()=>refresh(true));
 refresh();return {refresh};
}
