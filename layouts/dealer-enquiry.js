import {ENQUIRY_ENDPOINT} from './enquiry-config.js?v=20261007-1850';
import {dealerContext} from './dealer-context.js?v=20261007-1850';
import {calculateReferencePrice} from './reference-pricing.js?v=20261007-1850';

export function isTestDealerEnquiry(){
 return new URLSearchParams(location.search).get('dealer')==='test-hexa'&&dealerContext()?.id==='test-hexa';
}
export function enquiryDealerId(){
 if(!new URLSearchParams(location.search).has('dealer'))return 'hexa-direct';
 return isTestDealerEnquiry()?'test-hexa':null;
}
export function enquirySelections(catalogue,state,lang){
 if(!catalogue?.items?.length)throw Error('Selection catalogue unavailable');
 const entries=new Map(catalogue.items.map(item=>[item.key,item]));
 const en=lang==='en';
 const finish=en?(state.finish==='black'?'Hexa plywood':'Birch plywood'):(state.finish==='black'?'ヘキサ合板':'バーチ合板');
 return calculateReferencePrice(catalogue,state).items.flatMap(item=>{
  const source=entries.get(item.key);
  if(source?.number==null)throw Error('Selection number unavailable');
  // One row per item, including two quarter panels. No quantity or price fields.
  const label=(en?(source.name_en||source.name):item.name.replace(/ × \d+$/,''))+(source.module_id?' / '+finish:'');
  return Array.from({length:item.quantity||1},()=>({key:source.key,number:source.number,label}));
 });
}
// The endpoint returns only receipt/status. A bounded JSONP check avoids opaque POST responses.
export function checkReceipt(endpoint,receipt){
 return new Promise((resolve,reject)=>{
  const callback='hexaReceipt_'+crypto.randomUUID().replace(/-/g,'').toLowerCase();
  const script=document.createElement('script');
  const url=new URL(endpoint);url.searchParams.set('receipt',receipt);url.searchParams.set('callback',callback);url.searchParams.set('_',Date.now());
  let timer;
  const cleanup=()=>{clearTimeout(timer);script.remove();delete window[callback];};
  window[callback]=value=>{cleanup();if(value?.receipt!==receipt||!['SENT','PROCESSING','REVIEW_REQUIRED','NOT_FOUND','UNAVAILABLE'].includes(value.status))reject(Error('INVALID_CONFIRMATION'));else resolve(value.status);};
  script.onerror=()=>{cleanup();reject(Error('CONFIRMATION_UNAVAILABLE'));};
  timer=setTimeout(()=>{cleanup();reject(Error('CONFIRMATION_TIMEOUT'));},10000);
  script.src=url.href;document.head.append(script);
 });
}
export async function confirmReceipt(endpoint,receipt){
 let status='UNAVAILABLE';
 for(let attempt=0;attempt<4;attempt++){
  try{status=await checkReceipt(endpoint,receipt);}catch{status='UNAVAILABLE';}
  if(status==='SENT'||status==='REVIEW_REQUIRED')return status;
  if(attempt<3)await new Promise(resolve=>setTimeout(resolve,2000));
 }
 return status;
}
export function initDealerEnquiry({describe,catalogue,captureImages=()=>[],select=enquirySelections,dealerId=enquiryDealerId,buttonSelector='#outro-contact',preserveButtonLabel=false,requireImage=false,gridVehicle=false,prefill={}}){
 if(!dealerId())return null;
 const root=document.documentElement,en=()=>root.lang==='en',lang=()=>en()?'en':'ja';
 const button=document.querySelector(buttonSelector);
 const dialog=document.createElement('dialog');dialog.id='dealer-enquiry-dialog';dialog.setAttribute('aria-labelledby','dealer-enquiry-title');dialog.setAttribute('data-module-i18n','');
 dialog.innerHTML=`<button type="button" class="enquiry-close">×</button><h2 id="dealer-enquiry-title"></h2><p class="enquiry-intro"></p><details><summary></summary><ul class="enquiry-selections"></ul></details><form><fieldset>
 <label><span data-label="name"></span><input name="name" autocomplete="name" required maxlength="100"></label>
 <label><span data-label="email"></span><input name="email" type="email" autocomplete="email" required maxlength="254"></label>
 <label><span data-label="phone"></span><input name="phone" type="tel" autocomplete="tel" maxlength="30"></label>
 <label><span data-label="region"></span><input name="region" autocomplete="address-level1" maxlength="100"></label>
 <label><span data-label="timing"></span><input name="timing" maxlength="100"></label>
 <label><span data-label="message"></span><textarea name="message" rows="3" maxlength="3000"></textarea></label>
 <label class="enquiry-consent"><input name="consent" type="checkbox" required><span data-label="consent"></span></label>
 <button type="submit" class="primary-button" hidden></button></fieldset></form><p class="enquiry-result" role="status" aria-live="polite"></p>`;
 document.body.append(dialog);
 if(gridVehicle){
  const vehicle=document.createElement('section');vehicle.className='enquiry-vehicle';
  vehicle.innerHTML=`<p data-label="compatible"></p>${['supply','grade','drive','fuel'].map(key=>`<label><span data-label="${key}"></span><select name="${key}" required></select></label>`).join('')}<div class="enquiry-owned" hidden><label><span data-label="year"></span><input name="year" maxlength="40" disabled></label><label><span data-label="model"></span><input name="model" maxlength="100" disabled></label></div>`;
  dialog.querySelector('fieldset').prepend(vehicle);
  const review=document.createElement('section');review.className='enquiry-review';review.hidden=true;
  review.innerHTML='<h3 tabindex="-1" data-label="reviewTitle"></h3><p class="enquiry-vehicle-summary"></p><dl></dl><button type="button" class="enquiry-edit" data-label="edit"></button>';
  dialog.querySelector('[type=submit]').before(review);
 }
 const form=dialog.querySelector('form'),fields=form.elements,fieldset=dialog.querySelector('fieldset'),submit=dialog.querySelector('[type=submit]'),result=dialog.querySelector('.enquiry-result');
 let reviewing=false;
 let snapshot=null,pending=false,sent=false,receipt='',createdAt='',fingerprint='',status='',pendingImages=[];
 const copy={ja:{title:'取扱店に相談する',intro:'選んだ仕様を取扱店とHexaへ送ります。メールアドレスには金額のない仕様書をお届けします。お見積もりは取扱店からご連絡します。',summary:'選んだ仕様',name:'お名前（必須）',email:'メールアドレス（必須）',phone:'電話番号',region:'地域（都道府県・州）',timing:'希望時期',message:'一言・ご希望（任意）',consent:'入力した連絡先と選んだ仕様を、相談対応のため取扱店とHexaへ送ることに同意します（必須）。',send:'送信する',sending:'送信中…',sent:'送信しました（受付番号：',failed:'受付を確認できませんでした。同じ内容は同じ受付番号で再試行できます。繰り返し確認できない場合は、受付番号を取扱店へお伝えください。',review:'受付記録がありますが、メール送信の完了を確認できません。受付番号を取扱店へお伝えください。',unavailable:'送信の準備中です。取扱店へこのレイアウトのURLをお伝えください。',selectionError:'選んだ仕様を読み込めませんでした。画面を閉じて、もう一度お試しください。',close:'閉じる'},en:{title:'Enquire with your dealer',intro:'Send your selected specification to your dealer and Hexa. A specification without prices will be sent to your email address. Your dealer will contact you with a quote.',summary:'Your selected specification',name:'Name (required)',email:'Email (required)',phone:'Phone',region:'Region / state',timing:'Preferred timing',message:'Message / requests (optional)',consent:'I agree to share my contact details and selected specification with the dealer and Hexa to handle this enquiry (required).',send:'Send enquiry',sending:'Sending…',sent:'Sent (receipt: ',failed:'We could not confirm receipt. You can retry the same content with the same receipt number. If confirmation keeps failing, share the receipt number with your dealer.',review:'Your enquiry was recorded, but email completion could not be confirmed. Please share the receipt number with your dealer.',unavailable:'Enquiry submission is being prepared. Please share this layout URL with your dealer.',selectionError:'Your selected specification could not be loaded. Close this window and try again.',close:'Close'}};
 if(dealerId()==='hexa-direct'){
  Object.assign(copy.ja,{
   title:'取扱店に相談する',
   intro:'選んだ仕様をHexaで受け付け、担当の取扱店からご連絡します。メールアドレスには金額のない仕様書をお届けします。',
   consent:'入力した連絡先と選んだ仕様を、相談対応のためHexaと担当の取扱店へ共有することに同意します（必須）。',
   sent:'内容を受け付けました。担当の取扱店からご連絡します。（受付番号：',
   failed:'受付を確認できませんでした。同じ内容は同じ受付番号で再試行できます。繰り返し確認できない場合は、受付番号を添えてinfo@hexamodules.comへお問い合わせください。',
   review:'受付記録がありますが、メール送信の完了を確認できません。受付番号を添えてinfo@hexamodules.comへお問い合わせください。',
   unavailable:'送信の準備中です。このレイアウトのURLを添えてinfo@hexamodules.comへお問い合わせください。'
  });
  Object.assign(copy.en,{
   title:'Talk to a dealer',
   intro:'Hexa will receive your selected specification. A Hexa dealer will be in touch with you shortly. A specification without prices will be sent to your email address.',
   consent:'I agree to share my contact details and selected specification with Hexa and the assigned dealer to handle this enquiry (required).',
   sent:'Thank you. A Hexa dealer will be in touch with you shortly. (receipt: ',
   failed:'We could not confirm receipt. You can retry the same content with the same receipt number. If confirmation keeps failing, contact info@hexamodules.com with your receipt number.',
   review:'Your enquiry was recorded, but email completion could not be confirmed. Please contact info@hexamodules.com with your receipt number.',
   unavailable:'Enquiry submission is being prepared. Please email your layout URL to info@hexamodules.com.'
  });
 }
 if(gridVehicle){
  copy.ja.intro='担当の取扱店におつなぎして、ご連絡いたします。メールアドレスに仕様書をお届けいたします。';
  copy.en.intro='We will pass your enquiry to your Hexa dealer, who will contact you. A specification sheet will be sent to your email address.';
 }
 Object.assign(copy.ja,{completeTitle:'送信完了しました',completeMessage:'内容を受け付けました。担当の取扱店からご連絡します。',reference:'受付番号: '});
 Object.assign(copy.en,{completeTitle:'Sent',completeMessage:'We have received your enquiry. Your Hexa dealer will contact you.',reference:'Reference: '});
 const vehicleOptions={supply:[['new','新車で手配を依頼する','Request a new vehicle'],['own','車体を持ち込む','Supply my own vehicle']],grade:[['super-gl','スーパーGL','Super GL'],['dark-prime-2','スーパーGL DARK PRIME Ⅱ','Super GL DARK PRIME Ⅱ']],drive:[['2wd','2WD','2WD'],['4wd','4WD','4WD']],fuel:[['gasoline','ガソリン','Gasoline'],['diesel','ディーゼル','Diesel']]};
 Object.assign(copy.ja,{compatible:'対応車体: ハイエース スーパーGL(標準ボディ・標準ルーフ)',supply:'車体の手配（必須）',grade:'グレード（必須）',drive:'駆動（必須）',fuel:'燃料（必須）',year:'年式（必須）',model:'型式（車検証の記載）（必須）',reviewTitle:'送信内容をご確認ください',edit:'入力内容を直す',check:'内容を確認する',choose:'選択してください'});
 Object.assign(copy.en,{compatible:'Compatible vehicle: HiAce Super GL (standard body, standard roof)',supply:'Vehicle supply (required)',grade:'Grade (required)',drive:'Drive (required)',fuel:'Fuel (required)',year:'Model year (required)',model:'Model code (as on vehicle registration) (required)',reviewTitle:'Review your enquiry',edit:'Edit details',check:'Review enquiry',choose:'Select one'});
 function vehicleData(){return Object.fromEntries(['supply','grade','drive','fuel','year','model'].map(key=>[key,['year','model'].includes(key)&&fields.supply.value==='new'?'':fields[key].value.trim()]));}
 const fuelOptionLabels={gasoline:['ガソリン(2.0L・2WDのみ)','Petrol (2.0L, 2WD only)'],diesel:['ディーゼル(2.8L)','Diesel (2.8L)']};
 function updateFuel(){
  const fourWheel=fields.drive.value==='4wd';
  fields.fuel.querySelector('option[value="gasoline"]').disabled=fourWheel;
  if(fourWheel&&fields.fuel.value==='gasoline')fields.fuel.value='diesel';
 }
 function updateOwned(){
  const own=fields.supply.value==='own';dialog.querySelector('.enquiry-owned').hidden=!own;
  for(const key of ['year','model']){fields[key].disabled=!own;fields[key].required=own;fields[key].setCustomValidity('');}
 }
 function updateReview(){
  if(!gridVehicle)return;
  dialog.querySelector('.enquiry-review').hidden=!reviewing;
  for(const el of fieldset.children)if(el.matches('label,.enquiry-vehicle'))el.hidden=reviewing;
  if(!reviewing)return;
  const v=vehicleData(),t=copy[lang()];
  dialog.querySelector('.enquiry-vehicle-summary').textContent=(en()?'Vehicle: ':'車体: ')+['supply','grade','drive','fuel'].map(key=>vehicleOptions[key].find(o=>o[0]===v[key])?.[en()?2:1]||'').concat(v.supply==='own'?[(en()?'Model year: ':'年式: ')+v.year,(en()?'Model code: ':'型式: ')+v.model]:[]).join(' / ');
  const list=dialog.querySelector('.enquiry-review dl');list.replaceChildren();
  for(const key of ['name','email','phone','region','timing','message','consent']){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=t[key];dd.textContent=key==='consent'?(en()?'Agreed':'同意済み'):fields[key].value.trim()||'—';list.append(dt,dd);}
 }
 if(gridVehicle){
  for(const key of ['name','email'])if(typeof prefill[key]==='string')fields[key].value=prefill[key].slice(0,fields[key].maxLength);
  fields.supply.addEventListener('change',updateOwned);
  fields.drive.addEventListener('change',updateFuel);
  dialog.querySelector('.enquiry-edit').onclick=()=>{reviewing=false;refresh();fields.supply.focus();};
 }
 function refresh(){
  const t=copy[lang()],complete=status==='sent'||status==='review';
  form.hidden=complete;dialog.querySelector('details').hidden=complete;
  if(gridVehicle){
   for(const [key,options] of Object.entries(vehicleOptions)){const value=fields[key].value;fields[key].replaceChildren();for(const item of [['',t.choose,t.choose],...options]){const option=document.createElement('option');option.value=item[0];option.textContent=key==='fuel'&&item[0]?fuelOptionLabels[item[0]][en()?1:0]:item[en()?2:1];fields[key].append(option);}fields[key].value=value;}
   updateFuel();updateOwned();updateReview();
  }
  button.setAttribute('data-module-i18n','');if(!preserveButtonLabel)button.querySelector('span').textContent=en()?'Talk to a dealer':copy.ja.title;
  dialog.querySelector('h2').textContent=complete?t.completeTitle:t.title;dialog.querySelector('.enquiry-intro').textContent=complete?(status==='review'?t.review:t.completeMessage):t.intro;
  dialog.querySelector('summary').textContent=t.summary;dialog.querySelector('.enquiry-close').setAttribute('aria-label',t.close);
  for(const el of dialog.querySelectorAll('[data-label]'))el.textContent=t[el.dataset.label];
  submit.hidden=!ENQUIRY_ENDPOINT.trim()||!snapshot;submit.disabled=pending||sent;submit.textContent=pending?t.sending:gridVehicle&&!reviewing?t.check:t.send;
  result.textContent=complete?t.reference+receipt:status==='failed'?t.failed+' ('+receipt+')':status==='review'?t.review+' ('+receipt+')':status==='selectionError'?t.selectionError:pending?t.sending:!ENQUIRY_ENDPOINT.trim()?t.unavailable:'';
  const list=dialog.querySelector('.enquiry-selections');list.replaceChildren();
  if(snapshot)for(const item of select(catalogue,snapshot.configuration,lang())){const li=document.createElement('li');li.textContent=(item.number==null?'':item.number+' · ')+item.label;list.append(li)}
 }
 function open(){
  if(pending){refresh();dialog.showModal();return;}
  try{const next=describe({includeImage:false});if(snapshot&&snapshot.url!==next.url&&!pending){sent=false;status='';fieldset.disabled=false;}snapshot=next;select(catalogue,snapshot.configuration,lang());if(status==='selectionError')status='';}
  catch{snapshot=null;status='selectionError';}
  refresh();dialog.showModal();
 }
 document.addEventListener('click',e=>{
  if(!dealerId())return;
  const contact=e.target.closest(buttonSelector);
  if(!contact||contact.disabled)return;
  e.preventDefault();e.stopImmediatePropagation();open();
 },true);
 dialog.querySelector('.enquiry-close').onclick=()=>dialog.close();
 form.addEventListener('input',()=>{if(gridVehicle){reviewing=false;for(const key of ['year','model'])fields[key].setCustomValidity('');updateReview();}fields.name.setCustomValidity(fields.name.value.trim()?'':(en()?'Please enter your name.':'お名前をご入力ください。'));});
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(gridVehicle){for(const key of ['year','model'])fields[key].setCustomValidity(fields.supply.value==='own'&&!fields[key].value.trim()?(en()?'Please complete this field.':'入力してください。'):'');}
  if(pending||sent||!ENQUIRY_ENDPOINT.trim()||!snapshot||!dealerId()||!form.reportValidity())return;
  if(gridVehicle&&!reviewing){reviewing=true;refresh();dialog.querySelector('.enquiry-review h3').focus();return;}
  let controller,timer;
  try{
   const customer=Object.fromEntries(['name','email','phone','region','timing','message'].map(key=>[key,fields[key].value.trim()]));
   if(!customer.name)return;
   customer.consent=fields.consent.checked;if(!customer.consent)return;
   const body={...(gridVehicle?{vehicle:vehicleData()}:{}),dealer:dealerId(),lang:lang(),customer,selections:select(catalogue,snapshot.configuration,lang()),layoutUrl:snapshot.url,...(snapshot.layoutNumber?{layoutNumber:snapshot.layoutNumber}:{}),...(snapshot.customerSummary?{customerSummary:snapshot.customerSummary}:{})};
   pending=true;status='';fieldset.disabled=true;refresh();
   const current=JSON.stringify(body);
   if(current!==fingerprint){receipt='HX-'+crypto.randomUUID().toUpperCase();createdAt=new Date().toISOString();fingerprint=current;try{const captured=captureImages();pendingImages=(captured&&typeof captured.then==='function'?await captured:captured)||[];}catch{pendingImages=[];}}
   if(requireImage&&!pendingImages.length){fingerprint='';throw Error('IMAGE_UNAVAILABLE');}
   pending=true;status='';fieldset.disabled=true;refresh();
   controller=new AbortController();timer=setTimeout(()=>controller.abort(),30000);
   const payload={receipt,...body,createdAt,images:pendingImages.slice(0,gridVehicle?3:1)};
   while(payload.images.length&&JSON.stringify(payload).length>600000)payload.images.pop();
   const serialized=JSON.stringify(payload);if(serialized.length>600000)throw Error('PAYLOAD_TOO_LARGE');
   try{await fetch(ENQUIRY_ENDPOINT,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:serialized,signal:controller.signal});}
   catch{/* Even a timed-out POST may have reached the receiver. Check before offering a retry. */}
   clearTimeout(timer);
   const confirmed=await confirmReceipt(ENQUIRY_ENDPOINT,receipt);
   sent=confirmed==='SENT'||confirmed==='REVIEW_REQUIRED'||confirmed==='PROCESSING';
   status=confirmed==='SENT'?'sent':sent?'review':'failed';
  }catch{status='failed';}
  finally{clearTimeout(timer);pending=false;fieldset.disabled=sent;refresh();if(sent){dialog.scrollTop=0;dialog.querySelector('.enquiry-close').focus({preventScroll:true});}}
 });
 window.addEventListener('studio-locale-change',()=>queueMicrotask(refresh));refresh();
 return {open};
}
