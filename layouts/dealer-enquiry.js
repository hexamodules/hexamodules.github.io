import {ENQUIRY_ENDPOINT} from './enquiry-config.js?v=20261005';
import {dealerContext} from './dealer-context.js?v=20261005';
import {calculateReferencePrice} from './reference-pricing.js?v=20261005';

export function isTestDealerEnquiry(){
 return new URLSearchParams(location.search).get('dealer')==='test-hexa'&&dealerContext()?.id==='test-hexa';
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
export function initDealerEnquiry({describe,catalogue}){
 if(!isTestDealerEnquiry())return null;
 const root=document.documentElement,en=()=>root.lang==='en',lang=()=>en()?'en':'ja';
 const button=document.querySelector('#outro-contact');
 const dialog=document.createElement('dialog');dialog.id='dealer-enquiry-dialog';dialog.setAttribute('aria-labelledby','dealer-enquiry-title');dialog.setAttribute('data-module-i18n','');
 dialog.innerHTML=`<button type="button" class="enquiry-close">×</button><h2 id="dealer-enquiry-title"></h2><p class="enquiry-intro"></p><details><summary></summary><ul class="enquiry-selections"></ul></details><form><fieldset>
 <label><span data-label="name"></span><input name="name" autocomplete="name" required maxlength="100"></label>
 <label><span data-label="email"></span><input name="email" type="email" autocomplete="email" required maxlength="254"></label>
 <label><span data-label="phone"></span><input name="phone" type="tel" autocomplete="tel" maxlength="30"></label>
 <label><span data-label="region"></span><input name="region" autocomplete="address-level1" maxlength="100"></label>
 <label><span data-label="timing"></span><input name="timing" maxlength="100"></label>
 <label><span data-label="message"></span><textarea name="message" rows="3" maxlength="4000"></textarea></label>
 <label class="enquiry-consent"><input name="consent" type="checkbox" required><span data-label="consent"></span></label>
 <button type="submit" class="primary-button" hidden></button></fieldset></form><p class="enquiry-result" role="status" aria-live="polite"></p>`;
 document.body.append(dialog);
 const form=dialog.querySelector('form'),fields=form.elements,fieldset=dialog.querySelector('fieldset'),submit=dialog.querySelector('[type=submit]'),result=dialog.querySelector('.enquiry-result');
 let snapshot=null,pending=false,sent=false,receipt='',createdAt='',fingerprint='',status='';
 const copy={ja:{title:'取扱店に相談する',intro:'選んだ仕様を取扱店とHexaへ送ります。メールアドレスには金額のない仕様書をお届けします。お見積もりは取扱店からご連絡します。',summary:'選んだ仕様',name:'お名前（必須）',email:'メールアドレス（必須）',phone:'電話番号',region:'地域（都道府県・州）',timing:'希望時期',message:'一言・ご希望（任意）',consent:'入力した連絡先と選んだ仕様を、相談対応のため取扱店とHexaへ送ることに同意します（必須）。',send:'送信する',sending:'送信中…',sent:'送信しました（受付番号：',failed:'送信を確認できませんでした。通信環境を確認し、もう一度「送信する」を押してください。同じ内容は同じ受付番号で再試行します。',unavailable:'送信の準備中です。取扱店へこのレイアウトのURLをお伝えください。',selectionError:'選んだ仕様を読み込めませんでした。画面を閉じて、もう一度お試しください。',close:'閉じる'},en:{title:'Enquire with your dealer',intro:'Send your selected specification to your dealer and Hexa. A specification without prices will be sent to your email address. Your dealer will contact you with a quote.',summary:'Your selected specification',name:'Name (required)',email:'Email (required)',phone:'Phone',region:'Region / state',timing:'Preferred timing',message:'Message / requests (optional)',consent:'I agree to share my contact details and selected specification with the dealer and Hexa to handle this enquiry (required).',send:'Send enquiry',sending:'Sending…',sent:'Sent (receipt: ',failed:'We could not confirm submission. Check your connection and select “Send enquiry” again. Retrying the same content uses the same receipt number.',unavailable:'Enquiry submission is being prepared. Please share this layout URL with your dealer.',selectionError:'Your selected specification could not be loaded. Close this window and try again.',close:'Close'}};
 function refresh(){
  const t=copy[lang()];
  button.setAttribute('data-module-i18n','');button.querySelector('span').textContent=t.title;
  dialog.querySelector('h2').textContent=t.title;dialog.querySelector('.enquiry-intro').textContent=t.intro;
  dialog.querySelector('summary').textContent=t.summary;dialog.querySelector('.enquiry-close').setAttribute('aria-label',t.close);
  for(const el of dialog.querySelectorAll('[data-label]'))el.textContent=t[el.dataset.label];
  submit.hidden=!ENQUIRY_ENDPOINT.trim()||!snapshot;submit.disabled=pending||sent;submit.textContent=pending?t.sending:t.send;
  result.textContent=status==='sent'?t.sent+receipt+(en()?')':'）'):status==='failed'?t.failed:status==='selectionError'?t.selectionError:pending?t.sending:!ENQUIRY_ENDPOINT.trim()?t.unavailable:'';
  const list=dialog.querySelector('.enquiry-selections');list.replaceChildren();
  if(snapshot)for(const item of enquirySelections(catalogue,snapshot.configuration,lang())){const li=document.createElement('li');li.textContent=item.number+' · '+item.label;list.append(li)}
 }
 function open(){
  if(pending){refresh();dialog.showModal();return;}
  try{const next=describe();if(snapshot&&snapshot.url!==next.url&&!pending){sent=false;status='';fieldset.disabled=false;}snapshot=next;enquirySelections(catalogue,snapshot.configuration,lang());if(status==='selectionError')status='';}
  catch{snapshot=null;status='selectionError';}
  refresh();dialog.showModal();
 }
 document.addEventListener('click',e=>{
  if(!isTestDealerEnquiry())return;
  const contact=e.target.closest('#outro-contact');
  if(!contact||contact.disabled)return;
  e.preventDefault();e.stopImmediatePropagation();open();
 },true);
 dialog.querySelector('.enquiry-close').onclick=()=>dialog.close();
 form.addEventListener('input',()=>{fields.name.setCustomValidity(fields.name.value.trim()?'':(en()?'Please enter your name.':'お名前をご入力ください。'));});
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(pending||sent||!ENQUIRY_ENDPOINT.trim()||!snapshot||!isTestDealerEnquiry()||!form.reportValidity())return;
  let controller,timer;
  try{
   const customer=Object.fromEntries(['name','email','phone','region','timing','message'].map(key=>[key,fields[key].value.trim()]));
   if(!customer.name)return;
   customer.consent=fields.consent.checked;if(!customer.consent)return;
   const body={dealer:'test-hexa',lang:lang(),customer,selections:enquirySelections(catalogue,snapshot.configuration,lang()),layoutUrl:snapshot.url};
   const current=JSON.stringify(body);
   if(current!==fingerprint){receipt='HX-'+crypto.randomUUID().toUpperCase();createdAt=new Date().toISOString();fingerprint=current;}
   pending=true;status='';fieldset.disabled=true;refresh();
   controller=new AbortController();timer=setTimeout(()=>controller.abort(),30000);
   await fetch(ENQUIRY_ENDPOINT,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify({receipt,...body,createdAt}),signal:controller.signal});
   // An opaque response confirms only that fetch completed, not server processing.
   sent=true;status='sent';
  }catch{status='failed';}
  finally{clearTimeout(timer);pending=false;fieldset.disabled=sent;refresh();}
 });
 window.addEventListener('studio-locale-change',()=>queueMicrotask(refresh));refresh();
 return {open};
}
