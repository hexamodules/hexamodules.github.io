// Japan Post address data is served locally in small shards. No third-party lookup.
const cache=new Map();
const postcodeKey=value=>{
 const value7=value.normalize('NFKC').trim().replace(/[ー−‐‑‒–—―]/g,'-');
 return /^\d{3}-?\d{4}$/.test(value7)?value7.replace('-',''):'';
};
async function loadPrefix(prefix){
 if(!cache.has(prefix)){
  const pending=(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
   try{
    const response=await fetch(new URL(`./assets/jp-postcodes-20260831/${prefix}.json`,import.meta.url),{signal:controller.signal});
    if(!response.ok)throw Error('Postcode data unavailable');
    const data=await response.json();
    if(!data||Array.isArray(data)||typeof data!=='object')throw Error('Invalid postcode data');
    return data;
   }finally{clearTimeout(timer)}
  })();
  cache.set(prefix,pending);
  pending.catch(()=>{if(cache.get(prefix)===pending)cache.delete(prefix)});
 }
 return cache.get(prefix);
}

export function createJapanPostcodeLookup({input,isEnabled,getLanguage}){
 const $=s=>document.querySelector(s),root=$('#contact-postcode-lookup');
 const address=$('#contact-postcode-address'),statusText=$('#contact-postcode-status');
 const choiceWrap=$('#contact-postcode-choices'),choice=$('#contact-postcode-locality'),retry=$('#contact-postcode-retry');
 let code='',rows=[],selected=-1,status='empty',generation=0,pending=Promise.resolve();
 const en=()=>getLanguage()==='en';
 function sharedAddress(){
  if(!rows.length)return '';
  const samePrefecture=rows.every(row=>row[0]===rows[0][0]);
  const sameCity=samePrefecture&&rows.every(row=>row[1]===rows[0][1]);
  return sameCity?rows[0][0]+rows[0][1]:samePrefecture?rows[0][0]:'';
 }
 function details(){
  if(!isEnabled()||postcodeKey(input.value)!==code)return {address:'',status:'empty'};
  const row=selected>=0?rows[selected]:null;
  return {address:row?row.join(''):sharedAddress(),status:status==='matched'?(row?'matched':'multiple'):status};
 }
 function render(){
  root.hidden=!isEnabled()||!code;root.dataset.status=status;root.setAttribute('aria-busy',String(status==='loading'));
  const result=details();address.textContent=result.address;address.hidden=!result.address;
  choiceWrap.hidden=status!=='matched'||rows.length<2;choice.disabled=choiceWrap.hidden;
  retry.hidden=status!=='unavailable';
  let message='';
  if(status==='loading')message='郵便番号から住所を確認しています…';
  else if(status==='unavailable')message='住所を読み込めませんでした。再読み込みするか、郵便番号のみで下書きを保存できます。';
  else if(status==='not_found')message='該当する住所が見つかりません。郵便番号をご確認ください。郵便番号のみでも下書きを保存できます。';
  else if(status==='matched'){
   if(rows.length>1&&selected<0)message='複数の町域があります。該当する町域を選べます。';
   else if(selected>=0&&!rows[selected][2])message='この郵便番号では市区町村まで表示します。';
   else message='番地・建物名の入力は不要です。';
  }
  statusText.textContent=message;
  choice.replaceChildren();
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=en()?'Select your area (optional)':'町域を選択（任意）';choice.append(placeholder);
  rows.forEach((row,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=row.join('');choice.append(option)});
  choice.value=selected>=0?String(selected):'';
 }
 function refresh(force=false){
  const next=isEnabled()?postcodeKey(input.value):'';
  if(next===code&&!force){render();return pending}
  const ticket=++generation;code=next;rows=[];selected=-1;status=code?'loading':'empty';render();
  if(!code){pending=Promise.resolve();return pending}
  const requested=code;
  pending=loadPrefix(code.slice(0,3)).then(data=>{
   if(ticket!==generation)return;
   const found=data[requested]||[];
   if(!Array.isArray(found)||!found.every(row=>Array.isArray(row)&&row.length===3&&row.every(part=>typeof part==='string')))throw Error('Invalid postcode record');
   rows=found;selected=rows.length===1?0:-1;status=rows.length?'matched':'not_found';
  }).catch(()=>{if(ticket===generation){status='unavailable';rows=[];selected=-1}}).finally(()=>{if(ticket===generation)render()});
  return pending;
 }
 input.addEventListener('input',()=>refresh());input.addEventListener('blur',()=>refresh());
 choice.addEventListener('change',()=>{selected=choice.value===''?-1:Number(choice.value);render()});
 retry.addEventListener('click',()=>refresh(true));
 return {refresh,details,async ready(){await refresh();while(isEnabled()&&status==='loading')await pending}};
}
