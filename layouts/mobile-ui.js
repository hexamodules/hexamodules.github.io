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
  const chips=make('div','mobile-chips');chips.setAttribute('aria-label','選択中');
  const launch=button('mobile-launch','＋ 選ぶ',()=>open(current));launch.setAttribute('aria-controls','mobile-sheet');
  hud.append(chips,launch);
  const blocker=button('mobile-backdrop','',()=>close());blocker.setAttribute('aria-label','閉じる');blocker.tabIndex=-1;
  const head=make('div','mobile-sheet-head'),title=make('strong','mobile-title');title.id='mobile-title';
  const dismiss=button('mobile-close','×',()=>close());dismiss.setAttribute('aria-label','閉じる');head.append(title,dismiss);
  const nav=make('nav','mobile-tabs');
  const utilities=button('mobile-utilities','',()=>open('other'));head.insertBefore(utilities,dismiss);
  const tabs=new Map(keys.map(k=>{const b=button('mobile-tab','',()=>choose(k,false));nav.append(b);return[k,b];}));
  const subnav=make('nav','mobile-subcategories');subnav.setAttribute('aria-label','小分類');
  const selectedSteps=new Map(), completed=new Set();
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
  const chipButtons=new Map(chipKeys.filter(k=>!['other','review'].includes(k)).map(k=>{const b=button('mobile-chip','',()=>{const pane={front:'furniture',bed:'furniture',cabinet:'furniture',floor:'interior',ceiling:'interior',wall:'interior'}[k]||k;choose(pane);const id={cabinet:'cabinet'}[k]||k;selectStep(pane,id+'-step');} );chips.append(b);return[k,b];}));
  // Keep original controls in place so delegated PC handlers keep working.
  function groups(k){
    const pane=$('#pane-'+k);if(!pane)return [];
    let nodes=[...pane.querySelectorAll(':scope > .step, :scope > #finish-step')];
    if(k==='electrical')nodes=[pane.querySelector('#standard-package-card'),...pane.querySelectorAll('.electrical-option-section')];
    if(k==='vehicle')nodes=[...pane.querySelectorAll('.vehicle-purchase-options,.new-vehicle-grade,.new-vehicle-powertrain')];
    return nodes.filter(e=>e&&!e.closest('[hidden]:not(.studio-pane)')).map((e,i)=>{
      if(!e.id)e.id='mobile-step-'+k+'-'+i;
      const heading=e.querySelector(':scope > summary > span, h2, h3, legend, strong');
      const name=heading?.textContent.trim().replace(/必須|Required/g,'').trim()||'';
      return {e,id:e.id,name,required:!!e.querySelector('.required-badge')};
    });
  }
  function selectStep(k,id,focus=false){
    selectedSteps.set(k,id);refresh();scroll.scrollTop=0;
    const b=[...subnav.children].find(b=>b.dataset.step===id);
    if(b){subnav.scrollLeft=Math.max(0,b.offsetLeft-subnav.offsetLeft-8);if(focus)b.focus({preventScroll:true});}
    const g=groups(k).find(g=>g.id===id);g?.e.querySelectorAll('.mobile-card-rail').forEach(r=>r.scrollLeft=0);
  }
  function refreshSteps(){
    const list=groups(current),id=list.some(g=>g.id===selectedSteps.get(current))?selectedSteps.get(current):list[0]?.id;
    selectedSteps.set(current,id);
    const category=String(originals.filter(b=>!b.hidden).findIndex(b=>b.dataset.studioTab===current)+1).padStart(2,'0');
    const signature=JSON.stringify([current,id,en(),list.map(g=>[g.id,g.name,g.required,completed.has(g.id)])]);
    if(subnav.dataset.signature!==signature){
      subnav.dataset.signature=signature;subnav.replaceChildren(...list.map((g,i)=>{
        const b=button('mobile-subcategory',category+'-'+(i+1)+' '+g.name+(g.required?(en()?' · Required':' · 必須'):'')+(completed.has(g.id)?' ✓':''),()=>selectStep(current,g.id,true));
        b.dataset.step=g.id;b.setAttribute('aria-pressed',String(g.id===id));b.setAttribute('aria-controls',g.id);return b;
      }));
    }
    subnav.hidden=!list.length;
    for(const k of keys)for(const g of groups(k)){
      g.e.classList.add('mobile-substep');g.e.classList.toggle('mobile-substep-active',k===current&&g.id===id);
      g.e.querySelectorAll('.options,.wall-color-options,.finish-options,.light-options,.aircon-options,.twi-finish-grid,.electrical-options,.new-vehicle-grade-options,.new-vehicle-powertrain > div').forEach(r=>r.classList.add('mobile-card-rail'));
      if(g.e.matches('.vehicle-purchase-options'))g.e.classList.add('mobile-card-rail');
    }
    // Type and finish choices share one horizontal strip, retaining hidden states.
    for(const step of ['ceiling','wall','floor'])$('#'+step+'-step .step-content')?.classList.add('mobile-combined-rail');
    const ep=$('#pane-electrical');if(ep)ep.classList.toggle('mobile-package-selected',id==='standard-package-card');
  }
  function advance(k,id){
    if(!active||!opened||current!==k||selectedSteps.get(k)!==id)return;
    completed.add(id);
    const list=groups(k),i=list.findIndex(g=>g.id===id),nextStep=list.slice(i+1).find(g=>g.e.querySelector('button:not([disabled]),input:not([disabled])'));
    if(nextStep)selectStep(k,nextStep.id,true);
    else{
      const next=originals.slice(keys.indexOf(k)+1).find(b=>!b.hidden&&!b.disabled);
      if(next){const key=next.dataset.studioTab;selectedSteps.delete(key);choose(key,false);selectStep(key,groups(key)[0]?.id,true);}else refresh();
    }
  }
  panel.addEventListener('click',e=>{
    if(!active||!opened)return;
    const control=e.target.closest('.option[data-key],button[data-finish],button[data-ceiling-choice],button[data-wall-choice],button[data-ceiling-color],button[data-wall-color],button[data-floor-color],button[data-twi-ceiling],button[data-quarter-choice],button[data-quarter-side],button[data-light],button[data-aircon],button[data-heater],button[data-insulation],button[data-battery],button[data-inverter],#clear-rear'),step=control?.closest('.mobile-substep');
    if(!step||control.disabled||control.matches('[data-type],[data-night-toggle],[data-view]'))return;
    const k=current,id=step.id;
    // A type opens the finishes; completing a finish advances the subcategory.
    if(control.dataset.quarterChoice==='single'){requestAnimationFrame(()=>{const rail=step.querySelector('.mobile-combined-rail'),sides=step.querySelector('#quarter-side-options');if(rail&&sides)rail.scrollLeft=sides.getBoundingClientRect().left-rail.getBoundingClientRect().left+rail.scrollLeft;});return;}
    if((control.dataset.ceilingChoice&&control.dataset.ceilingChoice!=='none')||(control.dataset.wallChoice&&control.dataset.wallChoice!=='none')){
      requestAnimationFrame(()=>{const colors=step.querySelector('.wall-color-options');const rail=step.querySelector('.mobile-combined-rail');if(colors&&rail)rail.scrollLeft=colors.getBoundingClientRect().left-rail.getBoundingClientRect().left+rail.scrollLeft;});return;
    }
    requestAnimationFrame(()=>advance(k,id));
  },true);
  panel.addEventListener('change',e=>{
    if(active&&e.target.matches('#studio-base-vehicle')){completed.clear();selectedSteps.clear();}
    if(!active||!opened||!e.target.matches('#electrical-standard,[name=vehiclePurchase],[name=newVehicleGrade],[name=newVehiclePowertrain]'))return;
    const step=e.target.closest('.mobile-substep');if(step){const k=current,id=step.id;requestAnimationFrame(()=>advance(k,id));}
  },true);
  function close(restore=true){opened=false;root.classList.remove('mobile-popup-open');launch.setAttribute('aria-expanded','false');stage.inert=false;if(restore&&opener?.isConnected)opener.focus();}
  function choose(k,focus=true){const source=$('#tab-'+k);if(!source||source.hidden||source.disabled)return;source.click();open(k,focus);}
  function open(k,focus=true){if(!active)return;if(!opened)opener=document.activeElement;current=k;opened=true;root.dataset.mobilePane=k;root.classList.add('mobile-popup-open');stage.inert=true;launch.setAttribute('aria-expanded','true');scroll.scrollTop=0;refresh();if(focus)dismiss.focus();}
  function refresh(){
    if(!active)return;
    const selected=originals.find(b=>b.getAttribute('aria-selected')==='true');
    if(current!=='other'&&selected)current=selected.dataset.studioTab;
    root.dataset.mobilePane=current;
    refreshSteps();
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
    if(active){for(const a of ['id','role','aria-modal','aria-labelledby'])attrs.set(a,panel.getAttribute(a));panel.id='mobile-sheet';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','mobile-title');document.body.append(hud,blocker);move(panel,document.body);panel.prepend(head,nav,subnav);scroll.append(other);$('#pane-review').append(review);root.dataset.mobilePane=current;close(false);refresh();}
    else {close(false);for(const[e,m]of [...moved].reverse())m.replaceWith(e);moved.clear();for(const[d,v]of details)d.open=v;details.clear();for(const[a,v]of attrs)v===null?panel.removeAttribute(a):panel.setAttribute(a,v);[hud,blocker,head,nav,subnav,other,review,vehicleCards].forEach(e=>e.remove());panel.querySelectorAll('.mobile-substep,.mobile-card-rail,.mobile-combined-rail').forEach(e=>{e.classList.remove('mobile-substep','mobile-substep-active','mobile-card-rail','mobile-combined-rail');if(e.id.startsWith('mobile-step-'))e.removeAttribute('id');});$('#pane-electrical')?.classList.remove('mobile-package-selected');delete root.dataset.mobilePane;delete root.dataset.mobileElectrical;}
  }
  width.addEventListener('change',sync);touch.addEventListener('change',sync);sync();
})();
