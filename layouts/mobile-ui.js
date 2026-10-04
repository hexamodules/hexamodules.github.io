/* Phone-only presentation. Original controls and their listeners remain authoritative. */
(() => {
  'use strict';
  const root=document.documentElement, $=s=>document.querySelector(s);
  const width=matchMedia('(max-width: 700px)'), touch=matchMedia('(any-pointer: coarse)');
  const panel=$('.configuration'), scroll=$('.panel-scroll'), stage=$('.stage');
  if(!panel||!scroll||!stage)return;
  const chipKeys=['vehicle','front','bed','cabinet','floor','ceiling','wall','equipment','other','review'];
  const originals=[...panel.querySelectorAll('[data-studio-tab]')];
  const keys=originals.map(b=>b.dataset.studioTab);
  const tabLabel=k=>$('#tab-'+k)?.textContent.trim()||'';
  const names={ja:['車種','フロント','ベッド','キャビネット','床','天井','壁','装備','その他','まとめ'],en:['Vehicle','Front','Bed','Cabinet','Floor','Ceiling','Walls','Equipment','More','Summary']};
  const en=()=>root.lang.startsWith('en'), label=k=>names[en()?'en':'ja'][chipKeys.indexOf(k)];
  const make=(tag,cls,text='')=>{const e=document.createElement(tag);e.className=cls;e.textContent=text;e.dataset.moduleI18n='';return e;};
  const button=(cls,text,fn)=>{const e=make('button',cls,text);e.type='button';e.addEventListener('click',fn);return e;};
  const set=(e,t)=>{if(e.textContent!==t)e.textContent=t;};
  let active=false, opened=false, current='interior', opener=null, scheduled=false;
  const moved=new Map(), details=new Map(), attrs=new Map();
  function move(e,parent){if(!e||moved.has(e))return;const m=document.createComment('mobile original position');e.before(m);moved.set(e,m);parent.append(e);}
  const hud=make('div','mobile-hud');
  const back=make('a','mobile-home','← Hexa');back.href=location.pathname.includes('/hexa-layouts/')?'../hexa-module-pages/auto.html':'../auto.html';
  const chips=make('div','mobile-chips');chips.setAttribute('aria-label','選択中');
  const launch=button('mobile-launch','＋ 選ぶ',()=>open(current));launch.setAttribute('aria-controls','mobile-sheet');
  hud.append(back,chips,launch);
  const blocker=button('mobile-backdrop','',()=>close());blocker.setAttribute('aria-label','閉じる');blocker.tabIndex=-1;
  const head=make('div','mobile-sheet-head'),title=make('strong','mobile-title');title.id='mobile-title';
  const dismiss=button('mobile-close','×',()=>close());dismiss.setAttribute('aria-label','閉じる');head.append(title,dismiss);
  const nav=make('nav','mobile-tabs');
  const utilities=button('mobile-utilities','',()=>open('other'));head.insertBefore(utilities,dismiss);
  const tabs=new Map(keys.map(k=>{const b=button('mobile-tab','',()=>choose(k,false));nav.append(b);return[k,b];}));
  const other=make('section','mobile-other'), review=make('section','mobile-review'), vehicleCards=make('div','mobile-vehicle-cards');
  const number=make('p','mobile-number'), specs=make('div','mobile-specs'), status=make('p','mobile-status');status.setAttribute('role','status');
  const send=button('mobile-send','取扱店に送る',async()=>{
    const text=number.textContent+'\n'+specs.textContent;
    try {if(navigator.share)await navigator.share({title:'Hexa',text,url:location.href});else {await navigator.clipboard.writeText(text+'\n'+location.href);set(status,en()?'Copied. Paste into your message to your dealer.':'コピーしました。取扱店へのメッセージに貼り付けてください。');}}
    catch(e){if(e.name!=='AbortError')set(status,en()?'Copy the URL from the address bar.':'アドレス欄のURLをコピーしてください。');}
  });review.append(send,status);
  const shareUrl=button('mobile-share-url','URLを共有',async()=>{
    try {if(navigator.share)await navigator.share({title:'Hexa',url:location.href});else {await navigator.clipboard.writeText(location.href);set(shareUrl,en()?'URL copied':'URLをコピーしました');}}
    catch(e){if(e.name!=='AbortError')set(shareUrl,en()?'Copy the address bar URL':'アドレス欄のURLをコピーしてください');}
  });other.append(shareUrl);
  const chipButtons=new Map(chipKeys.filter(k=>!['other','review'].includes(k)).map(k=>{const b=button('mobile-chip','',()=>{const pane={front:'furniture',bed:'furniture',cabinet:'furniture',floor:'interior',ceiling:'interior',wall:'interior'}[k]||k;choose(pane);const id={cabinet:'cabinet'}[k]||k;$('#'+id+'-step')?.scrollIntoView({block:'start'});} );chips.append(b);return[k,b];}));
  function close(restore=true){opened=false;root.classList.remove('mobile-popup-open');launch.setAttribute('aria-expanded','false');stage.inert=false;if(restore&&opener?.isConnected)opener.focus();}
  function choose(k,focus=true){const source=$('#tab-'+k);if(!source||source.hidden||source.disabled)return;source.click();open(k,focus);}
  function open(k,focus=true){if(!active)return;if(!opened)opener=document.activeElement;current=k;opened=true;root.dataset.mobilePane=k;root.classList.add('mobile-popup-open');stage.inert=true;launch.setAttribute('aria-expanded','true');scroll.scrollTop=0;refresh();if(focus)dismiss.focus();}
  function refresh(){
    if(!active)return;
    const selected=originals.find(b=>b.getAttribute('aria-selected')==='true');
    if(current!=='other'&&selected)current=selected.dataset.studioTab;
    root.dataset.mobilePane=current;
    set(utilities,en()?'More':'その他');
    set(shareUrl,en()?'Share URL':'URLを共有');
    set(launch,en()?'+ Choose':'＋ 選ぶ');set(title,current==='other'?label('other'):tabLabel(current));set(send,en()?'Send to dealer':'取扱店に送る');
    tabs.forEach((b,k)=>{const source=$('#tab-'+k);set(b,tabLabel(k));if(b.hidden!==source.hidden)b.hidden=source.hidden;if(b.disabled!==source.disabled)b.disabled=source.disabled;const v=String(k===current);if(b.getAttribute('aria-current')!==v)b.setAttribute('aria-current',v);});
    const choices={cabinet:'cab'};
    chipButtons.forEach((b,k)=>{
      let value=k==='vehicle'?$('#studio-base-vehicle')?.selectedOptions[0]?.textContent:$(`[data-choice="${choices[k]||k}"]`)?.textContent;
      if(k==='equipment')value=[...$('#pane-equipment').querySelectorAll('button[aria-pressed=true] strong')].map(e=>e.textContent).join('・');
      set(b,label(k)+(value?.trim()?' · '+value.trim():''));
    });
    for(const s of ['.studio-header','.studio-maker-info','.view-toolbar','#motion-section','.lighting-preview','.equipment-indicators','#electrical-preview','.stage-context','.gesture-hint','.shell-label','.selection-actions'])move($(s),other);
    // Original details remain open only during phone mode; restore their state on desktop.
    panel.querySelectorAll('.studio-pane details').forEach(d=>{if(!details.has(d))details.set(d,d.open);d.open=true;});
    const source=$('#selection-summary');
    const rows=source?[...source.querySelectorAll('.selection-row')].map(r=>r.textContent.trim()):[];
    const text=rows.join('\n');if(specs.dataset.value!==text){specs.dataset.value=text;specs.replaceChildren(...rows.map(t=>make('p','',t)));}
    const id=$('#reference-price-review')?.textContent.match(/HX-L-[A-F0-9]+/)?.[0];
    // Dealer markup omits the customer number. Use an explicitly separate URL reference there.
    let h=2166136261;for(const b of new TextEncoder().encode(new URL(location.href).search))h=Math.imul(h^b,16777619);
    set(number,id||'HX-M-'+(h>>>0).toString(16).toUpperCase().padStart(8,'0'));
  }
  // Keep the PC controls expanded, without its accordion closing sibling steps.
  panel.addEventListener('toggle',e=>{if(active&&e.target.matches('.studio-pane details')){e.stopImmediatePropagation();e.target.open=true;}},true);
  panel.addEventListener('click',e=>{if(active&&e.target.closest('.studio-pane details > summary'))e.preventDefault();},true);
  panel.addEventListener('click',e=>{if(active&&e.target.closest('#review-enquiry,#replay-opening,#open-help'))close(false);});
  panel.addEventListener('keydown',e=>{if(!active||!opened)return;if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const all=[...panel.querySelectorAll('button,a,input,select,textarea,summary')].filter(e=>!e.disabled&&e.tabIndex>=0&&e.getClientRects().length);const first=all[0],last=all.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  const observer=new MutationObserver(()=>{if(active&&!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh();});}});
  observer.observe(panel,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-pressed','aria-selected','hidden','disabled']});
  window.addEventListener('studio-locale-change',()=>requestAnimationFrame(refresh));
  function sync(){const next=width.matches&&(touch.matches||navigator.maxTouchPoints>0);if(next===active)return;active=next;root.classList.toggle('mobile-ui',active);
    if(active){for(const a of ['id','role','aria-modal','aria-labelledby'])attrs.set(a,panel.getAttribute(a));panel.id='mobile-sheet';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','mobile-title');document.body.append(hud,blocker);move(panel,document.body);panel.prepend(head,nav);scroll.append(other);$('#pane-review').append(review);root.dataset.mobilePane=current;close(false);refresh();}
    else {close(false);for(const[e,m]of [...moved].reverse())m.replaceWith(e);moved.clear();for(const[d,v]of details)d.open=v;details.clear();for(const[a,v]of attrs)v===null?panel.removeAttribute(a):panel.setAttribute(a,v);[hud,blocker,head,nav,other,review,vehicleCards].forEach(e=>e.remove());delete root.dataset.mobilePane;delete root.dataset.mobileElectrical;}
  }
  width.addEventListener('change',sync);touch.addEventListener('change',sync);sync();
})();
