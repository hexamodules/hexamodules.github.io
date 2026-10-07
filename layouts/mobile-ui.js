/* Phone-only presentation. Original controls and their listeners remain authoritative. */
(() => {
  'use strict';
  const root=document.documentElement, $=s=>document.querySelector(s);
  const width=matchMedia('(max-width: 700px)'), touch=matchMedia('(any-pointer: coarse)');
  const panel=$('.configuration'), scroll=$('.panel-scroll'), stage=$('.stage');
  if(!panel||!scroll||!stage)return;
  const chipKeys=['vehicle','front','bed','mattress','cabinet','floor','ceiling','wall','equipment','other','review'];
  const originals=[...panel.querySelectorAll('[data-studio-tab]')];
  const keys=originals.map(b=>b.dataset.studioTab);
  const flow=['interior','furniture','equipment','review'];
  const flowLabel=k=>flow.includes(k)?String(flow.indexOf(k)+1).padStart(2,'0')+' '+({interior:en()?'Interior':'内装',furniture:en()?'Furniture':'家具',equipment:en()?'Equipment':'装備',review:en()?'Summary':'まとめ'}[k]):tabLabel(k);
  const tabLabel=k=>$('#tab-'+k)?.textContent.trim()||'';
  const names={ja:['車種','フロント','ベッド','マットレス','キャビネット','床','天井','壁','装備','その他','まとめ'],en:['Vehicle','Front','Bed','Mattress','Cabinet','Floor','Ceiling','Walls','Equipment','More','Summary']};
  const en=()=>root.lang.startsWith('en'), label=k=>names[en()?'en':'ja'][chipKeys.indexOf(k)];
  const make=(tag,cls,text='')=>{const e=document.createElement(tag);e.className=cls;e.textContent=text;e.dataset.moduleI18n='';return e;};
  const button=(cls,text,fn)=>{const e=make('button',cls,text);e.type='button';e.addEventListener('click',fn);return e;};
  const set=(e,t)=>{if(e.textContent!==t)e.textContent=t;};
  const flag=(e,key,value)=>{if(e[key]!==value)e[key]=value;};
  let active=false, opened=false, current='interior', opener=null, scheduled=false;
  const moved=new Map(), details=new Map(), attrs=new Map();
  function move(e,parent){if(!e?.parentNode||!parent||e===parent||e.contains(parent)||moved.has(e))return;const m=document.createComment('mobile original position');e.before(m);moved.set(e,m);parent.append(e);}
  const hud=make('div','mobile-hud');
  const chips=make('div','mobile-chips');chips.setAttribute('aria-label','選択中');
  const launch=button('mobile-launch','＋ 選ぶ',()=>open(current));launch.setAttribute('aria-controls','mobile-sheet');
  const fixed=make('div','mobile-fixed-chips'), finishes=make('div','mobile-finish-toggle');
  const finishButtons=['black','birch'].map(key=>{const b=button('mobile-finish','',()=>panel.querySelector('[data-finish="'+key+'"]')?.click());b.dataset.mobileFinish=key;finishes.append(b);return b;});
  hud.append(fixed,chips,launch);
  const blocker=button('mobile-backdrop','',()=>close());blocker.setAttribute('aria-label','閉じる');blocker.tabIndex=-1;
  const head=make('div','mobile-sheet-head'),title=make('strong','mobile-title');title.id='mobile-title';
  const dismiss=button('mobile-close','×',()=>close());dismiss.setAttribute('aria-label','閉じる');head.append(title);
  const nav=make('nav','mobile-tabs');
  const utilities=button('mobile-utilities','',()=>open('other'));head.append(utilities,dismiss);
  const tabs=new Map(flow.map(k=>{const b=button('mobile-tab','',()=>choose(k,false));nav.append(b);return[k,b];}));
  const subnav=make('nav','mobile-subcategories');subnav.setAttribute('aria-label','小分類');
  const selectedSteps=new Map(), completed=new Set();
  const other=make('section','mobile-other'), review=make('section','mobile-review'), vehicleCards=make('div','mobile-vehicle-cards');
  const number=make('p','mobile-number'), specs=make('div','mobile-specs'), status=make('p','mobile-status');status.setAttribute('role','status');
  const shareUrl=button('mobile-share-url','URLを共有',async()=>{
    try {if(navigator.share)await navigator.share({title:'Hexa',url:location.href});else {await navigator.clipboard.writeText(location.href);set(shareUrl,en()?'URL copied':'URLをコピーしました');}}
    catch(e){if(e.name!=='AbortError')set(shareUrl,en()?'Copy the address bar URL':'アドレス欄のURLをコピーしてください');}
  });other.append(shareUrl);
  const extraButtons=keys.filter(k=>!flow.includes(k)).map(k=>{const b=button('mobile-extra','',()=>choose(k));other.append(b);return [k,b];});
  const chipButtons=new Map(chipKeys.filter(k=>!['other','review'].includes(k)).map(k=>{const b=button('mobile-chip','',()=>{if(k==='vehicle'){if(window.confirm(en()?'Changing vehicle starts over. Return to the start?':'車種を変えると最初からになります。戻りますか')){const url=new URL(location.href);const keep=new URLSearchParams();for(const key of ['dealer','lang','location'])if(url.searchParams.has(key))keep.set(key,url.searchParams.get(key));url.search=keep.toString();url.hash='';location.assign(url.href);}return;}const pane={front:'furniture',bed:'furniture',mattress:'furniture',cabinet:'furniture',floor:'interior',ceiling:'interior',wall:'interior'}[k]||k;choose(pane);const id={cabinet:'cabinet'}[k]||k;selectStep(pane,id+'-step');} );chips.append(b);return[k,b];}));
  fixed.append(chipButtons.get('vehicle'),finishes);
  const mattressStep=make('section','step');mattressStep.id='mattress-step';
  const mattressHomes=new Map();
  function placeMattresses(show){
    if(active&&!mattressStep.isConnected)$('#pane-furniture')?.append(mattressStep);
    for(const [key,home] of mattressHomes){
      const card=mattressStep.querySelector(`[data-mattress-module="${key}"]`);
      if(!home.isConnected){card?.remove();mattressHomes.delete(key);}
      else if(!show){if(card)home.querySelector('.option').after(card);mattressHomes.delete(key);}
    }
    if(show)panel.querySelectorAll('.module-option-set > [data-mattress-module]').forEach(card=>{mattressHomes.set(card.dataset.mattressModule,card.parentElement);mattressStep.append(card);});
  }
  window.addEventListener('studio-mattress-open',()=>{if(active){choose('furniture',false);selectStep('furniture','mattress-step');}});
  const footer=make('div','mobile-flow-footer');
  const back=button('mobile-flow-back','',()=>navigate(-1)), next=button('mobile-flow-next','',()=>navigate(1));footer.append(back,next);
  // Keep original controls in place so delegated PC handlers keep working.
  function groups(k){
    const pane=$('#pane-'+k);if(!pane)return [];
    let nodes=[...pane.querySelectorAll(':scope > .step, :scope > #finish-step')];
    if(k==='electrical')nodes=[pane.querySelector('#standard-package-card'),...pane.querySelectorAll('.electrical-option-section')];
    if(k==='vehicle')nodes=[...pane.querySelectorAll('.vehicle-purchase-options,.new-vehicle-grade,.new-vehicle-powertrain')];
    if(k==='interior')nodes=['floor-step','ceiling-step','wall-step'].map(id=>$('#'+id));
    if(k==='furniture')nodes=['front-step','bed-step',...(panel.querySelector('[data-mattress-module]')?['mattress-step']:[]),'cabinet-step'].map(id=>$('#'+id));
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
    const signature=JSON.stringify([current,id,en(),list.map(g=>[g.id,g.name,g.required,completed.has(g.id)])]);
    if(subnav.dataset.signature!==signature){
      subnav.dataset.signature=signature;subnav.replaceChildren(...list.map((g,i)=>{
        const b=button('mobile-subcategory',(label(g.id.replace('-step',''))||g.name)+(g.required?(en()?' · Required':' · 必須'):'')+(completed.has(g.id)?' ✓':''),()=>selectStep(current,g.id,true));
        b.dataset.step=g.id;b.setAttribute('aria-pressed',String(g.id===id));b.setAttribute('aria-controls',g.id);return b;
      }));
    }
    flag(subnav,'hidden',!list.length);
    for(const k of keys)for(const g of groups(k)){
      g.e.classList.add('mobile-substep');g.e.classList.toggle('mobile-substep-active',k===current&&g.id===id);
      g.e.querySelectorAll('.options,.wall-color-options,.finish-options,.light-options,.aircon-options,.twi-finish-grid,.electrical-options,.new-vehicle-grade-options,.new-vehicle-powertrain > div,.twi-quantity,.twi-side-grid,#rear-types,.mattress-color-list,.iseat-poses').forEach(r=>r.classList.add('mobile-card-rail'));
      if(g.e.matches('.vehicle-purchase-options'))g.e.classList.add('mobile-card-rail');
    }
    refreshChoices();
    const ep=$('#pane-electrical');if(ep)ep.classList.toggle('mobile-package-selected',id==='standard-package-card');
  }
  function refreshChoices(){
    // Original controls continue to own catalogue choices and 3D updates.
    // DX ceiling: #ceiling-options -> ceiling-finishes.json (3 species).
    // DX wall: #wall-options (none/panel/wall) -> wall-finishes.json (3 colours).
    // Floor: #floor-step heading -> floor-finishes.json (5 patterns; PC has no none control).
    // Super GL ceiling: base-vehicle.js TWI none/wood -> clear/walnut.
    // Super GL wall: base-vehicle.js none/single/both -> left/right for single.
    // Material: the persistent toggle forwards clicks to #finish-step.
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
  }
  function route(){return flow.filter(k=>!$('#tab-'+k)?.hidden).flatMap(k=>{const list=groups(k);return list.length?list.map(g=>({k,id:g.id})):[{k,id:null}];});}
  function position(){return route().findIndex(p=>p.k===current&&p.id===(selectedSteps.get(current)||null));}
  function navigate(delta){
    const path=route(), target=path[position()+delta];if(!target)return;
    if(delta>0&&$('#floor-step')?.classList.contains('floor-missing')){choose('interior',false);selectStep('interior','floor-step');return;}
    if(delta>0)completed.add(selectedSteps.get(current));
    if(target.k!==current)choose(target.k,false);
    if(current===target.k)selectStep(target.k,target.id);
  }
  panel.addEventListener('change',e=>{if(active&&e.target.matches('#studio-base-vehicle')){completed.clear();selectedSteps.clear();}},true);
  function close(restore=true){opened=false;root.classList.remove('mobile-popup-open');launch.setAttribute('aria-expanded','false');stage.inert=false;if(restore&&opener?.isConnected)opener.focus();}
  function choose(k,focus=true){const source=$('#tab-'+k);if(!source||source.hidden||source.disabled)return;source.click();open(k,focus);}
  function open(k,focus=true){if(!active)return;if(!opened)opener=document.activeElement;current=k;opened=true;root.dataset.mobilePane=k;root.classList.add('mobile-popup-open');stage.inert=true;launch.setAttribute('aria-expanded','true');scroll.scrollTop=0;refresh();if(focus)dismiss.focus();}
  function refresh(){
    if(!active)return;
    const selected=originals.find(b=>b.getAttribute('aria-selected')==='true');
    if(current!=='other'&&selected)current=selected.dataset.studioTab;
    root.dataset.mobilePane=current;
    placeMattresses(current==='furniture'&&selectedSteps.get(current)==='mattress-step');
    refreshSteps();
    set(utilities,en()?'More':'その他');
    set(shareUrl,en()?'Share URL':'URLを共有');
    set(launch,en()?'+ Choose':'＋ 選ぶ');set(title,current==='other'?label('other'):flowLabel(current)+(groups(current).find(g=>g.id===selectedSteps.get(current))?' › '+(label(selectedSteps.get(current).replace('-step',''))||groups(current).find(g=>g.id===selectedSteps.get(current)).name):''));
    set(back,en()?'Back':'戻る');set(next,en()?'Next':'次へ');
    flag(footer,'hidden',!flow.includes(current));flag(back,'disabled',position()<=0);flag(next,'hidden',current==='review');
    flag(next,'disabled',!!$('#floor-step')?.classList.contains('floor-missing'));
    extraButtons.forEach(([k,b])=>{set(b,tabLabel(k));flag(b,'hidden',$('#tab-'+k).hidden);flag(b,'disabled',$('#tab-'+k).disabled);});
    finishButtons.forEach(b=>{const source=panel.querySelector('[data-finish="'+b.dataset.mobileFinish+'"]');set(b,source?.querySelector('span')?.textContent.trim()||'');b.setAttribute('aria-pressed',source?.getAttribute('aria-pressed')||'false');});
    tabs.forEach((b,k)=>{const source=$('#tab-'+k);set(b,flowLabel(k));if(b.hidden!==source.hidden)b.hidden=source.hidden;if(b.disabled!==source.disabled)b.disabled=source.disabled;const v=String(k===current);if(b.getAttribute('aria-current')!==v)b.setAttribute('aria-current',v);});
    const choices={cabinet:'cab'};
    chipButtons.forEach((b,k)=>{
      let value=k==='vehicle'?$('#studio-base-vehicle')?.selectedOptions[0]?.textContent:$(`[data-choice="${choices[k]||k}"]`)?.textContent;
      if(k==='mattress'){
        const cards=[...panel.querySelectorAll('[data-mattress-module]')];flag(b,'hidden',!cards.length);
        value=cards.map(c=>(cards.length>1?label(c.dataset.mattressSlot)+': ':'')+c.dataset.mattressLabel).join(' / ');
        set(b,label(k)+': '+value);return;
      }
      if(k==='equipment')value=[...$('#pane-equipment').querySelectorAll('button[aria-pressed=true] strong')].map(e=>e.textContent).join('・');
      if(['front','bed','cabinet'].includes(k)){
        const step=$('#'+k+'-step');
        const finish=panel.querySelector('[data-finish][aria-pressed="true"]');
        const finishName=finish?.querySelector('span')?.textContent.trim()||finish?.textContent.trim();
        const color=step?.querySelector('[data-mattress-color]:checked,[data-iseat-color]:checked')?.closest('label')?.textContent.trim();
        if(step?.querySelector('.option[aria-pressed="true"]:not([data-key="none"])'))value=[value,finishName,color].filter(Boolean).join(' · ');
      }
      set(b,k==='vehicle'?($('#studio-base-vehicle')?.value==='super-gl'?(en()?'Super GL':'スーパーGL'):'DX'):label(k)+(value?.trim()?' · '+value.trim():''));
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
    if(active){for(const a of ['id','role','aria-modal','aria-labelledby'])attrs.set(a,panel.getAttribute(a));panel.id='mobile-sheet';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','mobile-title');document.body.append(hud,blocker);move(panel,document.body);panel.prepend(head,nav,subnav);panel.append(footer);scroll.append(other);$('#pane-review')?.append(review);root.dataset.mobilePane=current;close(false);refresh();}
    else {placeMattresses(false);mattressStep.remove();close(false);panel.querySelectorAll('.mobile-type-gate,.mobile-choice-done').forEach(e=>e.remove());panel.querySelectorAll('.mobile-spec-rail,.mobile-many-specs,.mobile-spec-collapsed,.mobile-type-source').forEach(e=>e.classList.remove('mobile-spec-rail','mobile-many-specs','mobile-spec-collapsed','mobile-type-source'));for(const[e,m]of [...moved].reverse())m.replaceWith(e);moved.clear();for(const[d,v]of details)d.open=v;details.clear();for(const[a,v]of attrs)v===null?panel.removeAttribute(a):panel.setAttribute(a,v);[hud,blocker,head,nav,subnav,footer,other,review,vehicleCards].forEach(e=>e.remove());panel.querySelectorAll('.mobile-substep,.mobile-card-rail,.mobile-combined-rail').forEach(e=>{e.classList.remove('mobile-substep','mobile-substep-active','mobile-card-rail','mobile-combined-rail');if(e.id.startsWith('mobile-step-'))e.removeAttribute('id');});$('#pane-electrical')?.classList.remove('mobile-package-selected');delete root.dataset.mobilePane;delete root.dataset.mobileElectrical;}
  }
  width.addEventListener('change',sync);touch.addEventListener('change',sync);sync();
})();
