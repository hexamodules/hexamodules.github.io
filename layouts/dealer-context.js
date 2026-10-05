import {selectedDealer,isDealerPreviewRequest} from './dealer-preview.js?v=20261005-procurement';
import {dealerOptionAvailability} from './dealer-option-policy.js?v=20261005';
import {isCustomDealer,customDealerCopy,createCustomDealerBadge,updateCustomDealerBadge} from './dealer-custom.js?v=3';

const entry=new URLSearchParams(location.search);
const dealer=selectedDealer();
const custom=isCustomDealer(dealer);
const embedded=entry.get('embed')==='1';
const installs=dealer?.installation!==false;
const arranges=dealer?.outsourceInstallation===true;
const undecided=dealer?.preview&&dealer.installation===null;
const roleLabel=(en=false)=>en?(undecided?'Enquiry contact: ':installs?'Sales / installation contact: ':arranges?'Sales / installation coordination: ':'Sales contact: '):(undecided?'ご相談先: ':installs?'取扱・施工のご相談先: ':arranges?'取扱・施工手配のご相談先: ':'取扱・ご相談先: ');

// Dealer markets come from the registered profile, never from a customer override.
export function dealerLocations(){
 if(!dealer)return null;
 const allowed=(dealer.locations||['jp']).filter(id=>['jp','au'].includes(id));
 return allowed.length?[...new Set(allowed)]:['jp'];
}
export function resolveDealerLocation(requested){
 const allowed=dealerLocations();
 if(!allowed)return requested;
 return allowed.includes(requested)?requested:allowed.includes(dealer.defaultLocation)?dealer.defaultLocation:allowed[0];
}
export function dealerContext(){
 return dealer?{id:dealer.id,name:dealer.name,demo:dealer.demo,installation:undecided?null:installs,outsource_installation:arranges,custom_support:custom,dealer_options:dealerOptionAvailability(dealer),locations:dealerLocations(),source:embedded?'embedded-studio':'dealer-studio',enquiry_delivery:'unsent-draft'}:null;
}
export function dealerParams(params){
 if(dealer)params.set('dealer',dealer.id);
 if(dealer?.preview)params.set('dealer_preview','1');
 if(embedded)params.set('embed','1');
 if(dealer?.id==='sample-a'&&/^[a-f0-9-]{36}$/.test(entry.get('retailer_sim')||''))params.set('retailer_sim',entry.get('retailer_sim'));
 // Retain only a demo marker in shared layouts, never the local session key.
 if(dealer?.id==='sample-a'&&['127.0.0.1','localhost'].includes(location.hostname)&&entry.has('quote_demo'))params.set('quote_demo','1');
 return params;
}
export function dealerSummary(language='ja'){
 if(!dealer)return '';
 return roleLabel(language==='en')+dealer.name+
  (dealer.demo?(language==='en'?' (display sample)':'（表示見本）'):'')+'\n'+
  (language==='en'?'Dealer reference: ':'取扱店識別: ')+dealer.id+'\n'+
  (custom?customDealerCopy[language==='en'?'en':'ja'].badge+': '+customDealerCopy[language==='en'?'en':'ja'].description+'\n':'');
}

export function initDealerBranding({getLanguage,getLocation}){
 if(isDealerPreviewRequest()&&!dealer){
  document.documentElement.classList.remove('intro-active');
  const message=document.createElement('main');message.className='dealer-preview-missing';
  message.innerHTML='<p>Hexa / Layout Studio</p><h1>表示見本が見つかりません</h1><p>この見本を作成したブラウザーで開くか、セットアップから作成してください。</p><a href="../dealer-demo/setup.html">セットアップを開く →</a>';
  document.body.replaceChildren(message);return false;
 }
 if(!dealer&&!embedded)return;
 const root=document.documentElement;
 root.classList.toggle('dealer-embedded',embedded);
 root.classList.toggle('dealer-branded',Boolean(dealer));
 if(dealer)root.dataset.dealer=dealer.id;
 const $=selector=>document.querySelector(selector);
 // Mark our text as managed here, keeping the existing translation observer out.
 function text(selector,value){const el=$(selector);if(el){el.setAttribute('data-module-i18n','');el.textContent=value}}
 const brand=$('.studio-header .brand');
 if(dealer){
  brand.classList.add('dealer-brand');brand.setAttribute('data-module-i18n','');
  brand.replaceChildren();
  if(dealer.logo){const image=document.createElement('img');image.src=dealer.logo;image.alt=dealer.name;image.width=180;image.height=60;brand.append(image)}
  else{const name=document.createElement('strong');name.className='dealer-wordmark';name.textContent=dealer.name;brand.append(name)}
  const role=document.createElement('small');role.className='dealer-role';brand.append(role);
  if(custom){
   brand.append(createCustomDealerBadge(getLanguage()));
   const info=document.createElement('aside');info.id='custom-dealer-contact';info.className='custom-dealer-info';info.setAttribute('data-module-i18n','');
   info.append(createCustomDealerBadge(getLanguage()),document.createElement('p'));$('#contact-form').before(info);
  }
  const context=document.createElement('aside');context.id='dealer-enquiry-context';context.className='dealer-enquiry-context';context.setAttribute('data-module-i18n','');
  $('#contact-title').before(context);
 }
 function refresh(){
  const en=getLanguage()==='en';
  const official=new URL('../',location.href);official.searchParams.set('location',getLocation().id);official.searchParams.set('lang',getLanguage());
  const home=$('#studio-home-link');if(home){home.href=official.href;home.target='_blank';home.rel='noopener';text('#studio-home-link',en?'Hexa official site ↗':'Hexa公式サイト ↗')}
  if(!dealer)return;
  const markets=dealerLocations(),single=markets.length===1;
  root.classList.toggle('dealer-single-location',single);
  for(const button of document.querySelectorAll('[data-location]')){
   const available=markets.includes(button.dataset.location);
   button.hidden=!available;button.disabled=!available||single;
  }
  const connection=$('.location-connection');if(connection)connection.hidden=single;
  text('#location-heading',single?(en?'Location':'ロケーション'):(en?'Choose your location':'ロケーションを選択'));
  $('#location-heading')?.setAttribute('lang',en?'en':'ja');
  const studio=new URL(location.href);studio.searchParams.delete('intro');brand.href=studio.href;brand.setAttribute('aria-label',en?dealer.name+' · Hexa Layout Studio':dealer.name+'のHexaレイアウトスタジオ');
  text('.dealer-role',(en?(undecided?'DEALER':installs?'SALES & INSTALLATION':arranges?'SALES / COORDINATION':'SALES'):(undecided?'取扱店':installs?'取扱・施工':arranges?'取扱・施工手配':'取扱・ご相談'))+(dealer.demo?(en?' / DEMO':' / 表示見本'):''));
  if(custom){
   for(const badge of document.querySelectorAll('.custom-dealer-badge'))updateCustomDealerBadge(badge,getLanguage());
   text('#custom-dealer-contact p',customDealerCopy[en?'en':'ja'].description);
  }
  text('.studio-heading h1 span','by Hexa');
  text('.concept-message',en?'Modular interiors by Hexa':'Hexaのモジュールで、あなたの一台に。');
  text('#outro-contact span:first-child',en?'Discuss this layout with '+dealer.name:dealer.name+'にこの仕様を相談する');
  text('#contact-title',en?'Enquire with '+dealer.name:dealer.name+'へのご相談');
  text('#contact-title + p',en?'Prepare your enquiry together with the selected specification.':'選んだ仕様を添えて、ご相談内容を準備します。');
  text('#dealer-enquiry-context',roleLabel(en)+dealer.name+(dealer.demo?(en?' — Display sample. Delivery is not connected.':' — 表示見本・送信機能は接続前です。'):''));
  for(const el of document.querySelectorAll('.manufacturer-note')){el.setAttribute('data-module-i18n','');el.textContent=en?'Hexa is a manufacturer of modular furniture and interior parts for vehicles.':'Hexaは、車載家具と内装のモジュールおよびパーツのメーカーです。'}
  document.title=dealer.name+' | Hexa Layout Studio';
 }
 // Module and external references open independently, leaving the dealer's page in place.
 for(const a of document.querySelectorAll('a.module-link,a[target="_blank"]')){a.target='_blank';a.rel='noopener'}
 window.addEventListener('studio-locale-change',refresh);
 refresh();
}
