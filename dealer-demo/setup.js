import {readSetupDraft,saveSetupDraft,saveDealerPreview,SAMPLE_DEALER_LOGO,dealerLogoUrl} from '../layouts/dealer-preview.js?v=20261005';
import {createPricingSetup} from './setup-pricing.js?v=20261005';
import {setupErrors,normaliseInput} from './setup-fields.js?v=20261005';
import {setupAddressLookup} from './setup-address.js?v=20261005';
import {DEALER_OPTION_FIELDS,setupDealerOptions,dealerOptionNames,setupCanArrange} from '../layouts/dealer-option-policy.js?v=20261005';
import {createCustomDealerBadge} from '../layouts/dealer-custom.js?v=3';
import {installerNetworkDetails} from '../layouts/dealer-network.js?v=2';
const editing=new URLSearchParams(location.search).get('mode')==='manage';
const form=document.querySelector('#dealer-setup'),status=document.querySelector('#setup-status');
document.querySelector('#custom-support-preview').append(createCustomDealerBadge());
let draft=readSetupDraft(),timer;
const pricingSetup=createPricingSetup(form,draft?.values.pricing);
let logo=draft?.values.logo||SAMPLE_DEALER_LOGO,logoName=draft?.values.logoName||'',logoTask=0,logoLoading=false;
const logoInput=document.querySelector('#dealer-logo'),logoStatus=document.querySelector('#dealer-logo-status'),submitButton=form.querySelector('[type=submit]');
if(draft)for(const [key,value] of Object.entries(draft.values)){
 const field=form.elements.namedItem(key);if(field){if(field.type==='checkbox')field.checked=value==='yes';else field.value=value;}
}
if(!form.elements.market.value)form.elements.market.value='jp';
function values(){
 const latest=readSetupDraft(),availability=latest?.id===draft?.id?latest?.values.networkAvailability:draft?.values.networkAvailability;
 return {...Object.fromEntries(new FormData(form)),networkAvailability:availability||'accepting',logo,logoName,pricing:pricingSetup.read()};
}
function renderLogo(){
 const sample=logo===SAMPLE_DEALER_LOGO,img=document.querySelector('#dealer-logo-preview');
 img.src=dealerLogoUrl(logo);img.alt=sample?'ディーラーAのサンプルロゴ':'アップロードしたロゴ';
 document.querySelector('#dealer-logo-name').textContent=sample?'ディーラーAのサンプルロゴ':logoName||'アップロードしたロゴ';
 document.querySelector('#reset-dealer-logo').disabled=sample&&!logoLoading;
 submitButton.disabled=logoLoading;
 for(const button of form.querySelectorAll('[data-open-preview]'))button.disabled=logoLoading;
}
function render(){
 const installer=form.elements.installation.value==='yes',chosen=['yes','no'].includes(form.elements.installation.value);
 const outsourcing=form.elements.outsourceInstallation;outsourcing.disabled=!chosen;if(!chosen)outsourcing.checked=false;
 document.querySelector('#outsourcing-setup').hidden=!chosen;
 const canArrange=setupCanArrange(values());
 document.querySelector('#installer-network-setup').hidden=!installer;
 const network=form.elements.installerNetwork;network.disabled=!installer;if(!installer)network.checked=false;
 document.querySelector('#setup-network-label').textContent='施工店ネットワーク：'+(network.checked?'登録を希望する':'登録を希望しない');
 document.querySelector('#network-details').hidden=!network.checked;
 for(const field of document.querySelectorAll('#network-details input')){field.disabled=!network.checked;if(!network.checked)field.setCustomValidity('')}
 const separateWorkshop=network.checked&&form.elements.workshopLocation.value==='other';
 document.querySelector('#workshop-address-field').hidden=!separateWorkshop;
 form.elements.workshopAddress.disabled=!separateWorkshop;form.elements.workshopAddress.required=separateWorkshop;
 document.querySelector('#workshop-company-address').hidden=form.elements.workshopLocation.value==='other';
 document.querySelector('#workshop-company-address').textContent=form.elements.address.value.trim()||'③の会社所在地を施工場所として使用します。';
 form.elements.networkRegions.required=network.checked;
 const separateContact=network.checked&&form.elements.networkContact.value==='other';
 document.querySelector('#network-contact-fields').hidden=!separateContact;
 for(const key of ['networkContactName','networkPhone','networkEmail']){form.elements[key].disabled=!separateContact;form.elements[key].required=separateContact}
 document.querySelector('#network-contact-summary').hidden=separateContact;
 document.querySelector('#network-contact-summary').textContent=[form.elements.contactName.value,form.elements.companyPhone.value,form.elements.enquiryEmail.value].filter(Boolean).join(' / ')||'③の会社電話番号、④の担当者、⑥の受信先メールアドレスを使用します。';
 document.querySelector('#custom-support-setup').hidden=!canArrange;
 const custom=form.elements.customSupport;custom.disabled=!canArrange;if(!canArrange)custom.checked=false;
 document.querySelector('#custom-support-preview').hidden=!custom.checked;
 document.querySelector('#setup-custom-label').textContent='カスタム相談：'+(custom.checked?'対応する':'対応しない');
 document.querySelector('#dealer-options-setup').hidden=!canArrange;
 document.querySelector('#dealer-options-unavailable').hidden=canArrange;
 for(const field of Object.keys(DEALER_OPTION_FIELDS)){const input=form.elements[field];input.disabled=!canArrange;if(!canArrange)input.checked=false;}
 const v=values();pricingSetup.update(v);const offered=Object.entries(setupDealerOptions(v)).filter(([,on])=>on).map(([key])=>dealerOptionNames.ja[key]);
 document.querySelector('#setup-option-label').textContent='ディーラーオプション：'+(offered.join(' / ')||'表示しない');
 document.querySelector('#setup-display-name').textContent=v.dealerName?.trim()||'取扱店名を入力してください';
 document.querySelector('#setup-role-label').textContent=chosen?(installer?'取扱・自社施工':'販売・相談')+(outsourcing.checked?' ／ 提携先への施工手配にも対応':''):'施工対応を選択してください';
 document.querySelector('#setup-market-label').textContent=(v.market==='au'?'オーストラリア':'日本')+'向け · 日本語／EN対応';
 document.querySelector('#company-postcode').placeholder=v.market==='au'?'例：4000':'例：123-4567';
 document.querySelector('#postcode-credit-jp').hidden=v.market==='au';
 document.querySelector('#postcode-credit-au').hidden=v.market!=='au';
 document.querySelector('#company-address').placeholder=v.market==='au'?'番地・通り名・Suburb / Town・州':'都道府県・市区町村・番地・建物名';
 form.elements.workshopAddress.placeholder=v.market==='au'?'番地・通り名・Suburb / Town・州・工場名':'都道府県・市区町村・番地・工場名';
 form.elements.networkRegions.placeholder=v.market==='au'?'例：QLD州 ／ 他州からの車両搬送も相談可能':'例：神奈川県・東京都 ／ 全国からの持ち込みに対応';
 const details=installerNetworkDetails(v);
 if(details?.availability==='paused')document.querySelector('#setup-network-label').textContent+=' ／ 新規相談の受付は一時停止中（管理画面の設定）';
}

function persist(){
 try{draft=saveSetupDraft(values(),draft?.id);status.textContent='このブラウザーに下書きを保存しました。';status.classList.remove('is-error');return true}
 catch{status.textContent='このブラウザーに下書きを保存できません。ブラウザーの保存設定をご確認ください。';status.classList.add('is-error');return false}
}
function clearValidity(){for(const field of form.querySelectorAll('input'))field.setCustomValidity('')}
form.addEventListener('input',event=>{if(event.target===logoInput)return;clearValidity(event);render();clearTimeout(timer);timer=setTimeout(persist,400)});
form.addEventListener('change',event=>{if(event.target===logoInput)return;clearValidity(event);render();clearTimeout(timer);persist()});
async function readLogo(file){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('PNG・JPG・WebPの画像を選んでください。');
 if(file.size>5*1024*1024)throw new Error('5MB以下の画像を選んでください。');
 const url=URL.createObjectURL(file),img=new Image();
 try{
  img.src=url;
  try{await img.decode()}catch{throw new Error('画像を読み込めませんでした。別の画像を選んでください。')}
  if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>40000000)throw new Error('画像サイズが大きすぎます。小さくした画像を選んでください。');
  const scale=Math.min(1,960/img.naturalWidth,360/img.naturalHeight),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  const data=canvas.toDataURL('image/webp',.92);
  if(data.length>500000)throw new Error('画像を保存できるサイズに収められませんでした。小さな画像を選んでください。');
  return data;
 }finally{URL.revokeObjectURL(url)}
}
logoInput.addEventListener('change',async()=>{
 const file=logoInput.files?.[0];if(!file)return;
 const task=++logoTask;logoLoading=true;logoStatus.textContent='ロゴを読み込んでいます…';logoStatus.classList.remove('is-error');renderLogo();clearTimeout(timer);
 try{
  const data=await readLogo(file);if(task!==logoTask)return;
  logo=data;logoName=file.name;
  const saved=persist();logoStatus.textContent=saved?'ロゴを設定しました。':'ロゴを表示しましたが、下書きを保存できませんでした。';logoStatus.classList.toggle('is-error',!saved);
 }catch(error){if(task===logoTask){logoStatus.textContent=error.message;logoStatus.classList.add('is-error')}}
 finally{if(task===logoTask){logoLoading=false;logoInput.value='';renderLogo()}}
});
document.querySelector('#reset-dealer-logo').addEventListener('click',()=>{
 ++logoTask;logoLoading=false;logo=SAMPLE_DEALER_LOGO;logoName='';logoInput.value='';clearTimeout(timer);renderLogo();
 const saved=persist();logoStatus.textContent=saved?'サンプルロゴに戻しました。':'サンプルに戻しましたが、下書きを保存できませんでした。';logoStatus.classList.toggle('is-error',!saved);
});
const website=form.elements.website;
website.addEventListener('input',()=>website.setCustomValidity(''));
for(const button of form.querySelectorAll('[data-open-preview]'))button.addEventListener('click',()=>{
 clearTimeout(timer);
 if(logoLoading)return;
 const name=form.elements.dealerName;name.value=name.value.trim();name.setCustomValidity(name.value?'':'取扱店・ブランド名を入力してください。');
 if(!name.reportValidity())return;
 try{
  const profile=saveDealerPreview(values(),draft?.id);
  location.assign('./?'+new URLSearchParams({dealer:profile.id,dealer_preview:'1'}));
 }catch{const message='見本を保存できませんでした。ブラウザーの保存設定をご確認ください。';document.querySelector('#preview-status').textContent=message;status.textContent=message;status.classList.add('is-error')}
});
form.addEventListener('submit',event=>{
 event.preventDefault();clearTimeout(timer);if(logoLoading)return;
 for(const field of form.querySelectorAll('input:not([type=file])')){field.setCustomValidity('');if(field.type!=='radio')field.value=field.value.trim()}
 for(const key of ['postalCode','companyPhone','networkPhone'])form.elements[key].value=normaliseInput(form.elements[key].value);
 for(const [key,message]of Object.entries(setupErrors(values())))form.querySelector(`[name="${key}"]`)?.setCustomValidity(message);
 if(!form.reportValidity())return;
 if(editing){
  try{saveDealerPreview(values(),draft?.id);location.assign('manage.html?saved=1')}catch{status.textContent='変更を保存できませんでした。ブラウザーの保存設定をご確認ください。';status.classList.add('is-error')}
 }else if(persist())location.assign('terms.html');
});
if(editing){
 document.title='取扱店情報の変更 | Hexa';
 document.querySelector('.setup-intro h1').textContent='取扱店情報を変更。';
 document.querySelector('.setup-intro>p:last-child').textContent='会社情報、施工対応、参考価格、施工ネットワークの窓口などを変更できます。保存すると、このブラウザーの見本に反映します。';
 document.querySelector('.setup-progress').hidden=true;
 submitButton.textContent='変更を保存して管理画面へ →';
 document.querySelector('.setup-next-help').textContent='見本用の変更です。実際の登録内容の更新・公開は行いません。';
}
for(const link of document.querySelectorAll('[data-open-management]'))link.addEventListener('click',event=>{clearTimeout(timer);if(!persist())event.preventDefault()});
render();renderLogo();
setupAddressLookup({form,onSave:()=>{render();persist()}});
