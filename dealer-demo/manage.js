import {readSetupDraft,saveSetupDraft,saveDealerPreview} from '../layouts/dealer-preview.js?v=20261005';
import {installerNetworkDetails,networkReviewRows} from '../layouts/dealer-network.js?v=2';
import {setupErrors} from './setup-fields.js?v=20261005';

const $=selector=>document.querySelector(selector),form=$('#management-network-form');
let draft=readSetupDraft();
const message=(selector,text,error=false)=>{const el=$(selector);el.textContent=text;el.classList.toggle('is-error',error)};
function render(){
 const v=draft?.values,exists=Boolean(v?.dealerName);
 $('#management-empty').hidden=exists;$('#management-content').hidden=!exists;if(!exists)return;
 $('#management-name').textContent=v.dealerName;
 $('#management-role').textContent=(v.installation==='yes'?'取扱・自社施工':v.installation==='no'?'販売・相談':'施工対応は未選択')+(v.outsourceInstallation==='yes'?' ／ 提携先への施工手配にも対応':'');
 const details=installerNetworkDetails(v);
 $('#management-network-on').hidden=!details;$('#management-network-off').hidden=Boolean(details);
 if(!details)return;
 const incomplete=Object.keys(setupErrors(v)).length>0;
 $('#management-network-incomplete').hidden=!incomplete;
 for(const input of form.elements)input.disabled=incomplete;
 form.elements.networkAvailability.value=details.availability;
 const status=$('#network-current-status');status.textContent=details.availability==='paused'?'新規相談の受付を一時停止':'新規相談を受け付ける';status.classList.toggle('is-paused',details.availability==='paused');
 const list=$('#management-network-details');list.replaceChildren();
 for(const [label,value] of networkReviewRows(v).slice(1,-1)){
  const group=document.createElement('div'),term=document.createElement('dt'),description=document.createElement('dd');term.textContent=label;description.textContent=value;group.append(term,description);list.append(group);
 }
}
form.addEventListener('change',()=>message('#network-save-status','まだ保存されていません。「受付設定を見本に保存」を押してください。'));
form.addEventListener('submit',event=>{
 event.preventDefault();
 const latest=readSetupDraft(),state=form.elements.networkAvailability.value;
 if(!latest||latest.id!==draft?.id||!installerNetworkDetails(latest.values)||Object.keys(setupErrors(latest.values)).length||!['accepting','paused'].includes(state)){
  message('#network-save-status','取扱店情報が変更されたか、入力が未完了です。ページを開き直して設定を確認してください。',true);return;
 }
 try{
  draft=saveSetupDraft({...latest.values,networkAvailability:state},latest.id);render();
  message('#network-save-status',state==='paused'?'見本の新規施工相談を一時停止にしました。お客様向けのページは継続します。':'見本の新規施工相談を受け付ける設定にしました。');
 }catch{message('#network-save-status','保存できませんでした。ブラウザーの保存設定をご確認ください。',true)}
});
$('#management-preview').addEventListener('click',()=>{
 try{
  const latest=readSetupDraft();if(!latest?.values.dealerName)throw Error();
  const profile=saveDealerPreview(latest.values,latest.id);
  location.assign('./?'+new URLSearchParams({dealer:profile.id,dealer_preview:'1'}));
 }catch{message('#management-save-notice','見本を保存できませんでした。入力内容とブラウザーの保存設定をご確認ください。',true)}
});
render();
if(new URLSearchParams(location.search).get('saved')==='1')message('#management-save-notice','このブラウザーの取扱店情報と見本を更新しました。');
window.addEventListener('storage',event=>{
 if(event.key!=='hexa-dealer-setup-draft-v1')return;
 draft=readSetupDraft();render();message('#management-save-notice','別の画面で変更された最新の情報を読み込みました。');
});
