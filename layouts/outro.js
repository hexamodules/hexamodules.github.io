import {initDealerEnquiry,enquiryDealerId} from './dealer-enquiry.js?v=20261007-direct';
import {downloadSpecification} from './specification-pdf.js?v=20261007-direct';
import {createJapanPostcodeLookup} from './japan-postcode.js?v=1';
import {dealerContext} from './dealer-context.js?v=20261005';
import {newVehicleSummary,vehicleSelectionComplete} from './new-vehicle.js?v=1';
import {initQuoteDemo} from './quote-demo.js?v=20261005';
// Save first, then present the selected van. Contact is a local, unsent draft.
export function createOutro({catalogue,captureEnquiry,captureSpecification,prepare,pose,showcase,restore,describe,getLocation=()=> 'jp',getVehicleState=()=>({})}){
 const $=s=>document.querySelector(s),root=document.documentElement,layer=$('#studio-outro');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const locked=[...document.querySelectorAll('.configuration,.stage-context,.lighting-preview,.motion-popover,.view-toolbar,.gesture-hint,.shell-label,#open-help,.brand')];
 let active=false,ready=false,finishing=false,preparation,frame=0,elapsed=0,last=0;
 const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10)};
 function mark(phase,message){if(root.dataset.outroState===phase)return;root.dataset.outroState=phase;if(message)$('#outro-status').textContent=message}
 function paint(t){
  const closing=ease((t-650)/2700);
  const tail=t<9600?1-closing:ease((t-9600)/1250);
  const slide=tail;
  const frontDoor=t<4050?closing:1-ease((t-4050)/2700);
  const departure=Math.pow(Math.max(0,Math.min(1,(t-7450)/1850)),2.5);
  const arrival=ease((t-9600)/1150);
  pose({tail,slide,frontDoor,departure,arrival,returned:t>=9600,visible:t<9350||t>=9600});
  root.style.setProperty('--outro-copy',ease((t-10350)/950));
  root.style.setProperty('--outro-action',ease((t-11000)/600));
  if(t<650)mark('doors-open','バックドアとスライドドアが開いています');
  else if(t<3350)mark('boarding','後ろのドアを閉じながら、助手席ドアを開いています');
  else if(t<4050)mark('front-door-open','助手席ドアが開いています');
  else if(t<7450)mark('front-door-closing','助手席ドアを閉じています');
  else if(t<9600)mark('departing','あなたの一台が、走り出します');
  else mark('returning','あなたの旅を、この一台から。');
 }
 function tick(now){
  if(!active||finishing)return;
  if(!document.hidden)elapsed+=Math.min(80,Math.max(0,now-last));last=now;
  paint(elapsed);if(elapsed<11600)frame=requestAnimationFrame(tick);else finish();
 }
 async function finish(){
  if(!active||finishing||ready)return;
  finishing=true;cancelAnimationFrame(frame);$('#outro-skip').disabled=true;
  try{await preparation;paint(11600);await showcase();ready=true;root.classList.add('outro-ready');
   $('#outro-contact').disabled=false;$('#outro-specification').disabled=false;$('#outro-edit').disabled=false;
   mark('ready','完成したレイアウトです。ドラッグで回してご覧ください。');
  }catch(e){await fail(e)}finally{finishing=false}
 }
 async function edit(){
  if(!active||finishing)return;
  finishing=true;cancelAnimationFrame(frame);$('#contact-dialog').close();
  try{await preparation;await restore()}catch(e){console.error(e)}
  unlock();$('#tab-review').click();$('#tab-review').focus({preventScroll:true});
 }
 function unlock(){
  active=false;ready=false;finishing=false;layer.hidden=true;locked.forEach(e=>e.inert=false);
  root.classList.remove('outro-active','outro-ready','outro-night');mark('complete');
 }
 async function fail(error){
  console.error(error);try{await restore()}catch(e){console.error(e)}unlock();
  $('#notice').textContent='保存後の表示を読み込めませんでした。組み合わせは保持しています。';
 }
 async function play(){
  if(active)return;
  active=true;ready=false;finishing=false;elapsed=0;layer.hidden=false;root.classList.add('outro-active');
  root.style.setProperty('--outro-copy',0);root.style.setProperty('--outro-action',0);
  $('#outro-skip').disabled=false;$('#outro-contact').disabled=true;$('#outro-specification').disabled=true;$('#outro-edit').disabled=true;
  locked.forEach(e=>e.inert=true);layer.tabIndex=-1;layer.focus({preventScroll:true});mark('loading','完成車を準備しています');
  preparation=prepare();
  try{await preparation;if(finishing)return;if(reduced.matches){await finish();return}paint(0);last=performance.now();frame=requestAnimationFrame(tick)}catch(e){await fail(e)}
 }
 $('#outro-skip').onclick=finish;$('#outro-edit').onclick=edit;
 document.addEventListener('keydown',e=>{if(!active||e.key!=='Escape'||$('#contact-dialog').open||$('#dealer-enquiry-dialog')?.open)return;e.preventDefault();if(ready)edit();else finish()});
 reduced.addEventListener('change',()=>{if(active&&!ready&&reduced.matches)finish()});
 const dialog=$('#contact-dialog'),contactForm=$('#contact-form');
 const japanContact=()=>getLocation()==='jp';
 const normaliseContact=value=>value.normalize('NFKC').trim().replace(/[ー−‐‑‒–—―]/g,'-');
 const postcodeLookup=createJapanPostcodeLookup({input:contactForm.elements.customerPostcode,isEnabled:japanContact,getLanguage:()=>root.lang});
 function syncVehiclePreferences(){
  const en=root.lang==='en';
  $('#contact-selected-vehicle p').textContent=newVehicleSummary(getVehicleState(),root.lang);
  $('#contact-edit-vehicle').textContent=en?'Change vehicle selection':'車体の選択を変更する';
 }
 $('#contact-edit-vehicle').onclick=async()=>{await edit();$('#tab-vehicle').click();$('#tab-vehicle').focus()};
 function validateContact(){
  const en=root.lang==='en',name=contactForm.elements.customerName;
  name.setCustomValidity(name.value&&!name.value.trim()?(en?'Please enter your name.':'お名前をご入力ください。'):'');
  const phone=contactForm.elements.customerPhone,postcode=contactForm.elements.customerPostcode;
  const tel=normaliseContact(phone.value),digits=tel.replace(/\D/g,'');
  const phoneValid=/^\+?[0-9()\s-]+$/.test(tel)&&digits.length>=7&&digits.length<=15;
  phone.setCustomValidity(japanContact()&&phone.value&&!phoneValid?(en?'Please enter a valid phone number.':'電話番号を数字でご入力ください。'):'');
  postcode.setCustomValidity(japanContact()&&postcode.value&&!/^\d{3}-?\d{4}$/.test(normaliseContact(postcode.value))?(en?'Please enter a seven-digit Japanese postcode.':'郵便番号を7桁でご入力ください。'):'');
 }
 function syncContact(){
  const jp=japanContact();
  $('#contact-japan-fields').hidden=!jp;$('#contact-region-fields').hidden=jp;
  for(const input of [contactForm.elements.customerPhone,contactForm.elements.customerPostcode]){input.disabled=!jp;input.required=jp}
  contactForm.elements.customerRegion.disabled=jp;
  $('#contact-required-help').textContent=jp?'お名前・メールアドレス・電話番号・郵便番号は必須です。':'お名前・メールアドレスは必須です。';
  syncVehiclePreferences();
  validateContact();
  postcodeLookup.refresh();
 }
 contactForm.addEventListener('input',validateContact);
 for(const input of [contactForm.elements.customerPhone,contactForm.elements.customerPostcode])input.addEventListener('blur',()=>{
  input.value=normaliseContact(input.value);
  if(input===contactForm.elements.customerPostcode&&/^\d{7}$/.test(input.value))input.value=input.value.slice(0,3)+'-'+input.value.slice(3);
  validateContact();
 });
 window.addEventListener('studio-locale-change',syncContact);
 syncContact();
 // Official enquiries are received by Hexa until dealers are available.
 const enquiry=initDealerEnquiry({describe,catalogue,captureImages:captureEnquiry});
 const official=!enquiry;
 function updateEnquiryRoute(){
  const en=root.lang==='en';
  $('#outro-contact span:first-child').textContent=en?'Talk to a dealer':enquiryDealerId()==='hexa-direct'?'販売店に相談する':'取扱店に相談する';
  $('#review-enquiry').setAttribute('data-module-i18n','');
  $('#review-enquiry').textContent=en?'View your completed van':'完成車を確認する';
  $('#outro-specification').textContent=en?'Download specification':'仕様書をダウンロード';
 }
 window.addEventListener('studio-locale-change',updateEnquiryRoute);updateEnquiryRoute();
 $('#outro-specification').onclick=async()=>{
  if(!ready)return;
  const button=$('#outro-specification'),status=$('#outro-pdf-status'),en=root.lang==='en';
  button.disabled=true;status.textContent=en?'Preparing PDF…':'PDFを作成しています…';
  try{await downloadSpecification({data:describe({includeImage:false}),catalogue,images:captureSpecification(),lang:root.lang});status.textContent=en?'Specification downloaded.':'仕様書をダウンロードしました。';}
  catch(error){console.error(error);status.textContent=en?'Could not create the PDF. Please try again.':'PDFを作成できませんでした。もう一度お試しください。';}
  finally{button.disabled=false;}
 };
 const quoteDemo=initQuoteDemo({form:contactForm,describe,getLanguage:()=>root.lang});
 $('#outro-contact').onclick=()=>{
  if(enquiry){enquiry.open();return;}
  if(official){
   const url=new URL('../dealers.html',location.href);url.search=new URLSearchParams({location:getLocation(),lang:root.lang==='en'?'en':'ja'});
   location.assign(url.href);return;
  }
  syncContact();
  quoteDemo?.update();
  const data=describe();$('#contact-config').textContent=data.summary;
  $('#contact-preview').src=data.image;$('#contact-result').textContent='';dialog.showModal();
 };
 $('#contact-close').onclick=()=>dialog.close();
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
 async function draft(){
  if(!vehicleSelectionComplete(getVehicleState())){$('#contact-edit-vehicle').click();return null}
  const form=contactForm;syncContact();if(!form.reportValidity())return null;
  await postcodeLookup.ready();if(!form.reportValidity())return null;
  const data=describe(),en=root.lang==='en';
  const found=postcodeLookup.details();
  const postalAddress=found.address?(found.address+(found.status==='multiple'?(en?' (area not selected)':'（町域未選択）'):'')):(en?'Not confirmed (postcode only)':'未確認（郵便番号のみ）');
  return [(en?'Hexa dealer quote request — unsent draft':'Hexa 取扱店への見積もり依頼 — 未送信の下書き'),' ',
   (en?'Name: ':'お名前: ')+form.elements.customerName.value.trim(),
   (en?'Email: ':'メールアドレス: ')+form.elements.customerEmail.value.trim(),
   ...(japanContact()?[
    (en?'Vehicle: ':'車体: ')+newVehicleSummary(getVehicleState(),root.lang),
    (en?'Phone number: ':'電話番号: ')+normaliseContact(form.elements.customerPhone.value),
    (en?'Postcode: ':'郵便番号: ')+normaliseContact(form.elements.customerPostcode.value),
    (en?'Address from postcode: ':'郵便番号から分かる住所: ')+postalAddress,
   ]:[(en?'Region / state: ':'お住まいの地域: ')+form.elements.customerRegion.value.trim()]),' ',
   en?'Hexa manufactures furniture modules and interior parts. Your dealer arranges installation and equipment, sets its prices and confirms the formal quote.':'Hexaは家具・内装モジュールおよびパーツのメーカーです。施工・装備の手配、実際の販売価格と正式なお見積もりは取扱店がご案内します。',' ',
   en?'Requests or questions':'ご希望・ご質問',form.elements.message.value.trim(),' ',en?'Your layout':'選んだレイアウト',data.summary,' ',data.url].join('\n');
 }
 $('#contact-form').onsubmit=async e=>{e.preventDefault();const content=await draft();if(!content)return;
  if(quoteDemo){await quoteDemo.submit();return;}
  const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');
  a.href=url;a.download='Hexa-dealer-quote-draft.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  $('#contact-result').textContent='見積もり依頼の下書きを保存しました。取扱店へはまだ送信されていません。';
 };
 $('#contact-copy').onclick=async()=>{const content=await draft();if(!content)return;
  try{await navigator.clipboard.writeText(content);$('#contact-result').textContent='見積もり依頼をコピーしました。取扱店へはまだ送信されていません。'}
  catch{$('#contact-result').textContent='コピーできませんでした。「見積もり依頼の下書きを保存」をお使いください。'}
 };


 return {play,edit,get active(){return active},get ready(){return ready}};
}
