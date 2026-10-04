import {selectedDealer,readSetupDraft,readDealerPreview,dealerLogoUrl} from '../layouts/dealer-preview.js?v=9';
import {isCustomDealer,customDealerCopy,createCustomDealerBadge} from '../layouts/dealer-custom.js?v=3';
(() => {
 const frame=document.querySelector('#dealer-studio'),code=document.querySelector('#embed-code');
 const query=new URLSearchParams(location.search);
 const profile=selectedDealer()||(!query.has('dealer')?readDealerPreview(readSetupDraft()?.id):null);
 if(!profile){
  if(!query.has('dealer')){location.replace('setup.html');return}
  const main=document.querySelector('main');main.className='missing-preview';
  main.innerHTML='<p class="eyebrow">Hexa / PREVIEW</p><h1>表示見本が見つかりません</h1><p>この見本を作成したブラウザーで開くか、セットアップから作成してください。</p><a href="setup.html">セットアップを開く →</a>';return;
 }
 let example=false;
 const undecided=profile.preview&&profile.installation===null;
 const installs=profile.installation!==false,role=undecided?'取扱店':installs?'取扱・施工':profile.outsourceInstallation?'取扱・施工手配':'取扱・ご相談';
 document.title=profile.name+' | Hexa 表示見本';
 const logo=document.querySelector('#site-logo'),name=document.querySelector('#site-name');
 if(profile.logo){logo.src=dealerLogoUrl(profile.logo);logo.alt=profile.name;logo.hidden=false;name.hidden=true}
 else{name.textContent=profile.name;logo.hidden=true}
 document.querySelector('#site-role').textContent=role;
 if(isCustomDealer(profile)){
  document.querySelector('.dealer-identity').append(createCustomDealerBadge());
  const info=document.createElement('div');info.id='custom-dealer-consultation';info.className='custom-dealer-info';
  const copy=document.createElement('p');copy.textContent=customDealerCopy.ja.description;
  info.append(createCustomDealerBadge(),copy);document.querySelector('#consultation-dealer').after(info);
 }
 document.querySelector('#preview-name').textContent=profile.name+' の表示見本';
 document.querySelector('#consultation-dealer').textContent=profile.name+'が、'+(undecided?'ご相談の窓口として表示されます。':installs?'レイアウトのご相談から組み立て・設置までご案内します。':profile.outsourceInstallation?'レイアウトのご相談・販売と、提携先への施工手配を行います。':'レイアウトのご相談・販売の窓口になります。');
 document.querySelector('#manufacturer-setup').href='setup.html';
 document.querySelector('#dealer-management').hidden=!profile.preview;
 document.querySelector('.embed-code').hidden=Boolean(profile.preview);
 document.querySelector('#preview-publish-note').hidden=!profile.preview;
 if(profile.preview)document.querySelector('#preview-notice').textContent='入力内容を反映した、このブラウザー用の表示見本です。メールは送信されません。';
 if(profile.companyName){
  document.querySelector('#dealer-company').hidden=false;
  document.querySelector('#preview-company-name').textContent=profile.companyName;
  const address=document.querySelector('#preview-company-address');address.textContent=[profile.postalCode,profile.address].filter(Boolean).join(' ');address.hidden=!address.textContent;
  const phone=document.querySelector('#preview-company-phone');phone.textContent=profile.companyPhone?'TEL '+profile.companyPhone:'';phone.hidden=!phone.textContent;
 }
 function params(embed=true){const p=new URLSearchParams({dealer:profile.id,location:profile.defaultLocation,lang:['ja','en'].includes(query.get('lang'))?query.get('lang'):profile.defaultLocation==='au'?'en':'ja'});if(embed)p.set('embed','1');if(profile.preview)p.set('dealer_preview','1');return p}
 function update(){
  const url=new URL('../layouts/',location.href);url.search=params();
  if(example)for(const [key,value] of Object.entries({vehicle:'dx',front:'aluminum-front-kitchen',bed:'aluminum-bed',cab:'simple-side-cabinet',finish:'birch',wall:'white',panel:'auto',ceiling:'white-ash',floor:'dark-canvas',bed_mattress:'1',bed_mattress_color:'light-green',ceiling_lights:'1',tailgate_lights:'1'}))url.searchParams.set(key,value);
  frame.src=url.href;frame.title=profile.name+'のHexaレイアウトスタジオ';
  const current=new URL(location.href);current.searchParams.set('dealer',profile.id);if(profile.preview)current.searchParams.set('dealer_preview','1');history.replaceState(null,'',current);
  const standalone=new URL(url);standalone.searchParams.delete('embed');document.querySelector('#open-studio').href=standalone.href;
  const embed=new URL('../layouts/',location.href);embed.search=params();
  code.textContent=profile.preview?'':'<iframe\n  src="'+embed.href.replaceAll('&','&amp;')+'"\n  title="Hexa Layout Studio"\n  style="width:100%;height:950px;border:0"\n  allow="fullscreen"\n  referrerpolicy="strict-origin-when-cross-origin">\n</iframe>';
  document.querySelector('#show-example').textContent=example?'スタート画面を見る':'配置例を見る';document.querySelector('#copy-status').textContent='';
 }
 document.querySelector('#show-example').addEventListener('click',()=>{example=!example;update()});
 document.querySelector('#copy-code').addEventListener('click',async()=>{if(profile.preview)return;try{await navigator.clipboard.writeText(code.textContent);document.querySelector('#copy-status').textContent='コピーしました。'}catch{document.querySelector('#copy-status').textContent='上のコードを選択してコピーしてください。'}});
 update();
})();
