import {dealerOptionCopy,dealerOptionRequests} from './dealer-option-policy.js?v=20261005';

export function createDealerOptionsUI({available,getState,getLanguage}) {
 const $=selector=>document.querySelector(selector);
 const managed=(tag,className)=>{const el=document.createElement(tag);el.className=className;el.setAttribute('data-module-i18n','');return el};
 const badge=parent=>{if(!parent||parent.querySelector('.dealer-option-badge'))return;const el=managed('span','dealer-option-badge');el.textContent='DEALER OPTION';parent.append(el)};
 const text=(selector,value)=>{const el=$(selector);if(el){el.setAttribute('data-module-i18n','');el.textContent=value}};
 for(const [key,id] of [['ac','aircon-step'],['heater','heater-step'],['insulation','insulation-step']]){
  const step=$('#'+id);step.hidden=!available[key];
  step.querySelectorAll('button').forEach(button=>button.disabled=!available[key]);
  badge(step.querySelector('summary > span:first-child'));
  badge(step.querySelector('.aircon-card-caption'));
 }
 badge($('#electrical-title'));
 badge($('#electrical-preview'));
 badge($('#heater-indicator'));
 badge($('#insulation-indicator')); 
 const notes=[];
 for(const selector of ['#aircon-step .step-content','#heater-step .step-content','#insulation-step .step-content','#pane-electrical .electrical-panel']){
  const parent=$(selector),note=managed('p','dealer-option-note');parent.append(note);notes.push(note);
 }
 const review=managed('aside','dealer-options-review');review.id='dealer-options-review';
 const heading=managed('strong',''),requested=managed('p','dealer-option-requested'),price=managed('p',''),scope=managed('p','');review.append(heading,requested,price,scope);$('#selection-summary').after(review);
 const contact=managed('p','dealer-option-contact');contact.id='dealer-option-contact';$('#contact-form').before(contact);
 const disclosures=[];
 for(const [selector,enabled] of [['#pane-equipment',available.ac||available.heater||available.insulation],['#pane-electrical .electrical-panel',available.electrical]]){
  const details=managed('details','dealer-option-disclosure'),summary=managed('summary',''),body=managed('p','');details.hidden=!enabled;details.append(summary,body);$(selector).append(details);disclosures.push({summary,body});
 }
 function update(){
  const state=getState(),en=getLanguage()==='en',copy=dealerOptionCopy[en?'en':'ja'],selected=dealerOptionRequests(state);
  notes.forEach(note=>note.textContent=copy.short+' '+copy.example);
  disclosures.forEach(({summary,body})=>{summary.textContent=en?'About dealer options':'ディーラーオプションについて';body.textContent=copy.scope;});
  for(const key of ['ac','heater','electrical','insulation'])badge($(`[data-dealer-option-row="${key}"] > span`));
  text('#insulation-indicator > span:not(.dealer-option-badge)',en?'Insulation requested':'断熱施工希望');
  text('#standard-package-card strong',en?'Request an electrical system':'電装・サブバッテリーを希望する');
  text('#standard-package-card small',en?'Reference configuration: chargers and lithium-ion battery':'参考構成：充電器・リチウムイオンバッテリー');
  text('.electrical-preview-title strong',en?'Power · requested':'電装・希望構成');
  text('#heater-indicator > span:not(.dealer-option-badge)',en?'FF heater requested':'FFヒーター希望');
  text('#aircon-options .aircon-card-caption small',en?'Example model · indoor unit + pipe cover':'参考機種 · 室内機＋配管カバー');
  text('#heater-options .aircon-card-caption small',en?'Example model · Webasto FF heater':'参考機種 · ベバスト FFヒーター');
  text('#battery-ac-recommendation',en?'300Ah is a starting point for discussion when considering air conditioning. Your dealer will confirm the required capacity for your equipment and usage.':'エアコン使用時は300Ahを相談の目安に。必要な容量は、機器と使い方に合わせて取扱店が確認します。');
  $('#electrical-standard').disabled=!available.electrical;
  review.hidden=selected.length===0;contact.hidden=selected.length===0;
  heading.textContent=copy.title;
  requested.textContent=copy.example;price.textContent=copy.price;scope.textContent=copy.scope;
  contact.textContent=copy.price+' '+copy.scope;
 }
 return {update};
}
