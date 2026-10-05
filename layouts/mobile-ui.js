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
  function move(e,parent){if(!e?.parentNode||!parent||e===parent||e.contains(parent)||moved.has(e))return;const m=document.createComment('mobile original position');e.before(m);moved.set(e,m);parent.append(e);}
  const hud=make('div','mobile-hud');
  const chips=make('div','mobile-chips');chips.setAttribute('aria-label','選択中');
  const launch=button('mobile-launch','＋ 選ぶ',()=>open(current));launch.setAttribute('aria-controls','mobile-sheet');
  hud.append(chips,launch);
  const blocker=button('mobile-backdrop','',()=>close());blocker.setAttribute('aria-label','閉じる');blocker.tabIndex=-1;
  const head=make('div','mobile-sheet-head'),title=make('strong','mobile-title');title.id='mobile-title';
  const dismiss=button('mobile-close','×',()=>close());dismiss.setAttribute('aria-label','閉じる');head.append(title);
  const nav=make('nav','mobile-tabs');
  const utilities=button('mobile-utilities','',()=>open('other'));head.append(utilities,dismiss);
  const tabs=new Map(keys.map(k=>{const b=button('mobile-tab','',()=>choose(k,false));nav.append(b);return[k,b];}));
  const subnav=make('nav','mobile-subcategories');subnav.setAttribute('aria-label','小分類');
  const selectedSteps=new Map(), completed=new Set(), typeOpen=new Map();
  const other=make('section','mobile-other'), review=make('section','mobile-review'), vehicleCards=make('div','mobile-vehicle-cards');
  const number=make('p','mobile-number'), specs=make('div','mobile-specs'), status=make('p','mobile-status');status.setAttribute('role','status');
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
    pendingModule=null;selectedSteps.set(k,id);refresh();scroll.scrollTop=0;
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
      g.e.querySelectorAll('.options,.wall-color-options,.finish-options,.light-options,.aircon-options,.twi-finish-grid,.electrical-options,.new-vehicle-grade-options,.new-vehicle-powertrain > div,.twi-quantity,.twi-side-grid,#rear-types,.mattress-color-list,.iseat-poses').forEach(r=>r.classList.add('mobile-card-rail'));
      if(g.e.matches('.vehicle-purchase-options'))g.e.classList.add('mobile-card-rail');
    }
    refreshChoices();
    const ep=$('#pane-electrical');if(ep)ep.classList.toggle('mobile-package-selected',id==='standard-package-card');
  }
  let pendingModule=null;
  function refreshChoices(){
    // Small category -> type -> specification (all catalogue data comes from PC).
    // DX ceiling: #ceiling-options -> ceiling-finishes.json (3 species).
    // DX wall: #wall-options (none/panel/wall) -> wall-finishes.json (3 colours).
    // Floor: #floor-step heading -> floor-finishes.json (5 patterns; PC has no none control).
    // Super GL ceiling: base-vehicle.js TWI none/wood -> clear/walnut.
    // Super GL wall: base-vehicle.js none/single/both -> left/right for single.
    // Material: index.html #finish-step -> black/birch (no further specification).
    // Front/cabinet: app.js FRONT/CAB, original order -> mattresses.js / i-seat.js inline specs.
    // Bed: index.html #rear-types + #clear-rear -> app.js FULL/SINGLE -> mattress specs.
    // Equipment: index.html / twi-lighting-controls.js existing off/on or independent toggles.
    // Electrical / vehicle: original PC package, capacities, purchase, grade and powertrain.
    const rearTypes=$('#rear-types');if(rearTypes)move($('#clear-rear'),rearTypes);
    // PC DOM is the catalogue: keep its nodes, order, visibility and event listeners.
    // Only colour/specification rows with more than four choices scroll sideways.
    panel.querySelectorAll('.mobile-card-rail').forEach(r=>{
      const specs=r.matches('.wall-color-options,.twi-finish-grid,.twi-side-grid,.mattress-color-list,.iseat-poses');
      r.classList.toggle('mobile-spec-rail',specs);
      r.classList.toggle('mobile-many-specs',specs&&[...r.children].filter(e=>!e.hidden).length>4);
    });
    // Floor has samples only in PC; do not invent a "none" product/selection.
    typeGate('floor',$('#floor-color-section'),null,
      $('#floor-step summary > span')?.textContent.trim()||label('floor'));
    const twi=$('#twi-ceiling-options');
    typeGate('twi',twi?.querySelector('.twi-finish-grid'),twi?.querySelector('[data-twi-ceiling="none"]'),
      en()?'Hinoki wood ceiling':'檜のウッドシーリング');
    for(const id of ['front-step','bed-step','cabinet-step','lighting-step']){
      const step=$('#'+id);if(!step)continue;
      const specs=step.querySelector('.mattress-options,.iseat-options');
      let next=step.querySelector('.mobile-choice-done');
      if(!next){next=button('mobile-choice-done','',()=>advance(current,id));step.append(next);}
      set(next,en()?'Next':'次へ');
      const hide=id!=='lighting-step'&&!specs;
      if(next.hidden!==hide)next.hidden=hide;
    }
    if(pendingModule){
      const {k,id,key}=pendingModule,step=$('#'+id);
      const selected=step?.querySelector('.option[aria-pressed="true"]');
      // Wait for the asynchronous PC apply() to actually select this module.
      if(selected?.dataset.key===key){
        pendingModule=null;
        if(!step.querySelector('.mattress-options,.iseat-options'))requestAnimationFrame(()=>advance(k,id));
      }
    }
  }
  function typeGate(key,choices,none,name){
    if(!choices?.parentElement)return;
    let row=choices.parentElement.querySelector(':scope > .mobile-type-gate');
    if(!row){
      row=make('div','mobile-type-gate');
      if(none){
        const off=button('mobile-type-card','',()=>{typeOpen.set(key,false);none.click();refresh();});
        off.dataset.mobileNone='';row.append(off);none.classList.add('mobile-type-source');
      }
      const on=button('mobile-type-card','',()=>{typeOpen.set(key,true);refresh();});
      on.dataset.mobileType=key;row.append(on);choices.before(row);
    }
    const selected=!!choices.querySelector('[aria-pressed="true"]');
    const show=typeOpen.has(key)?typeOpen.get(key):selected;
    const on=row.querySelector('[data-mobile-type]');set(on,name);
    if(on.getAttribute('aria-pressed')!==String(show))on.setAttribute('aria-pressed',String(show));
    const off=row.querySelector('[data-mobile-none]');
    if(off){set(off,none.textContent.trim());const v=String(!show);if(off.getAttribute('aria-pressed')!==v)off.setAttribute('aria-pressed',v);}
    choices.classList.toggle('mobile-spec-collapsed',!show);
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
    // Original handlers own selection and rendering. Only terminal choices advance.
    if(control.dataset.quarterChoice==='single'||
       (control.dataset.ceilingChoice&&control.dataset.ceilingChoice!=='none')||
       (control.dataset.wallChoice&&control.dataset.wallChoice!=='none'))return;
    // Upholstery, pose and independent lighting switches need time to finish editing.
    if(control.matches('[data-key]')&&control.dataset.key!=='none'){
      pendingModule={k,id,key:control.dataset.key};return;
    }
    if(id==='lighting-step')return;
    requestAnimationFrame(()=>advance(k,id));
  },true);
  panel.addEventListener('change',e=>{
    if(active&&e.target.matches('#studio-base-vehicle')){completed.clear();selectedSteps.clear();typeOpen.clear();pendingModule=null;}
    if(!active||!opened||!e.target.matches('#electrical-standard,[name=vehiclePurchase],[name=newVehicleGrade],[name=newVehiclePowertrain]'))return;
    const step=e.target.closest('.mobile-substep');if(step){const k=current,id=step.id;requestAnimationFrame(()=>advance(k,id));}
  },true);
  function close(restore=true){opened=false;root.classList.remove('mobile-popup-open');launch.setAttribute('aria-expanded','false');stage.inert=false;if(restore&&opener?.isConnected)opener.focus();}
  function choose(k,focus=true){const source=$('#tab-'+k);if(!source||source.hidden||source.disabled)return;source.click();open(k,focus);}
  function open(k,focus=true){if(!active)return;if(!opened)opener=document.activeElement;if(current!==k)pendingModule=null;current=k;opened=true;root.dataset.mobilePane=k;root.classList.add('mobile-popup-open');stage.inert=true;launch.setAttribute('aria-expanded','true');scroll.scrollTop=0;refresh();if(focus)dismiss.focus();}
  function refresh(){
    if(!active)return;
    const selected=originals.find(b=>b.getAttribute('aria-selected')==='true');
    if(current!=='other'&&selected)current=selected.dataset.studioTab;
    root.dataset.mobilePane=current;
    refreshSteps();
    set(utilities,en()?'More':'その他');
    set(shareUrl,en()?'Share URL':'URLを共有');
    set(launch,en()?'+ Choose':'＋ 選ぶ');set(title,current==='other'?label('other'):tabLabel(current));
    tabs.forEach((b,k)=>{const source=$('#tab-'+k);set(b,tabLabel(k));if(b.hidden!==source.hidden)b.hidden=source.hidden;if(b.disabled!==source.disabled)b.disabled=source.disabled;const v=String(k===current);if(b.getAttribute('aria-current')!==v)b.setAttribute('aria-current',v);});
    const choices={cabinet:'cab'};
    chipButtons.forEach((b,k)=>{
      let value=k==='vehicle'?$('#studio-base-vehicle')?.selectedOptions[0]?.textContent:$(`[data-choice="${choices[k]||k}"]`)?.textContent;
      if(k==='equipment')value=[...$('#pane-equipment').querySelectorAll('button[aria-pressed=true] strong')].map(e=>e.textContent).join('・');
      if(['front','bed','cabinet'].includes(k)){
        const step=$('#'+k+'-step');
        const finish=panel.querySelector('[data-finish][aria-pressed="true"]');
        const finishName=finish?.querySelector('span')?.textContent.trim()||finish?.textContent.trim();
        const color=step?.querySelector('[data-mattress-color]:checked,[data-iseat-color]:checked')?.closest('label')?.textContent.trim();
        if(step?.querySelector('.option[aria-pressed="true"]:not([data-key="none"])'))value=[value,finishName,color].filter(Boolean).join(' · ');
      }
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
    if(active){for(const a of ['id','role','aria-modal','aria-labelledby'])attrs.set(a,panel.getAttribute(a));panel.id='mobile-sheet';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','mobile-title');document.body.append(hud,blocker);move(panel,document.body);panel.prepend(head,nav,subnav);scroll.append(other);$('#pane-review')?.append(review);root.dataset.mobilePane=current;close(false);refresh();}
    else {close(false);pendingModule=null;panel.querySelectorAll('.mobile-type-gate,.mobile-choice-done').forEach(e=>e.remove());panel.querySelectorAll('.mobile-spec-rail,.mobile-many-specs,.mobile-spec-collapsed,.mobile-type-source').forEach(e=>e.classList.remove('mobile-spec-rail','mobile-many-specs','mobile-spec-collapsed','mobile-type-source'));for(const[e,m]of [...moved].reverse())m.replaceWith(e);moved.clear();for(const[d,v]of details)d.open=v;details.clear();for(const[a,v]of attrs)v===null?panel.removeAttribute(a):panel.setAttribute(a,v);[hud,blocker,head,nav,subnav,other,review,vehicleCards].forEach(e=>e.remove());panel.querySelectorAll('.mobile-substep,.mobile-card-rail,.mobile-combined-rail').forEach(e=>{e.classList.remove('mobile-substep','mobile-substep-active','mobile-card-rail','mobile-combined-rail');if(e.id.startsWith('mobile-step-'))e.removeAttribute('id');});$('#pane-electrical')?.classList.remove('mobile-package-selected');delete root.dataset.mobilePane;delete root.dataset.mobileElectrical;}
  }
  width.addEventListener('change',sync);touch.addEventListener('change',sync);sync();
})();
