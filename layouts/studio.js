const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const allTabs=['interior','furniture','equipment','electrical','vehicle','shipping','review'];
const labels={interior:'内装',furniture:'家具',equipment:'装備',electrical:'電装',vehicle:'車体',shipping:'Shipping',review:'確認'};
let tabs=allTabs.filter(key=>key!=='shipping');
let active=0;
let refreshRequiredFloor=()=>{};
export function updateFloorRequirement(){refreshRequiredFloor()}
export function initStudio({getLocation=()=> 'jp',hasRequiredFloor=()=>true,hasElectrical=()=>true,hasVehicleSelection=()=>true}={}){
 const syncRequirements=()=>{
  const missing=!hasRequiredFloor();
  $$('[data-studio-tab]').forEach(button=>{
   const disabled=button.hidden||(missing&&button.dataset.studioTab!=='interior');
   button.disabled=disabled;button.setAttribute('aria-disabled',String(disabled));
  });
  $('#studio-next').disabled=missing||(tabs[active]==='vehicle'&&!hasVehicleSelection());
  $('#floor-required-notice').hidden=!missing;
  $('#floor-step').classList.toggle('floor-missing',missing);
  for(const id of ['review-enquiry','save-layout','save-image'])$('#'+id).disabled=missing||!hasVehicleSelection();
  if(missing&&tabs[active]!=='interior')select(tabs.indexOf('interior'));
 };
 const select=(index,focus=false)=>{
  active=Math.max(0,Math.min(index,tabs.length-1));
  if(!hasRequiredFloor()&&tabs[active]!=='interior')active=tabs.indexOf('interior');
  $$('[data-studio-tab]').forEach(b=>{const on=b.dataset.studioTab===tabs[active];b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;if(on&&focus)b.focus()});
  allTabs.forEach(key=>$('#pane-'+key).hidden=key!==tabs[active]);
  $('.panel-scroll').scrollTop=0;$('#studio-back').hidden=active===0;$('#studio-next').hidden=active===tabs.length-1;
  $('#studio-next').textContent=(labels[tabs[active+1]]||'確認')+'へ →';$('#step-position').textContent=`${String(active+1).padStart(2,'0')} / ${String(tabs.length).padStart(2,'0')}`;
  syncRequirements();
 };
 refreshRequiredFloor=syncRequirements;
 $('#choose-required-floor').onclick=()=>{
  select(tabs.indexOf('interior'));
  const floor=$('#floor-step');floor.open=true;floor.querySelector('summary').focus({preventScroll:true});
  requestAnimationFrame(()=>{const panel=$('.panel-scroll');panel.scrollTop+=floor.getBoundingClientRect().top-panel.getBoundingClientRect().top});
 };
 $('.studio-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-studio-tab]');if(b&&!b.hidden&&!b.disabled)select(tabs.indexOf(b.dataset.studioTab))});
 $('.studio-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();select(e.key==='Home'?0:e.key==='End'?tabs.length-1:(active+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length,true)});
 $('#studio-next').onclick=()=>select(active+1,true);$('#studio-back').onclick=()=>select(active-1,true);
 for(const pane of $$('.studio-pane'))for(const item of pane.querySelectorAll('details.step'))item.addEventListener('toggle',()=>{
  if(!item.open)return;
  for(const other of pane.querySelectorAll('details.step'))if(other!==item)other.open=false;
  if(pane.id==='pane-interior'&&!pane.hidden)requestAnimationFrame(()=>{
   if(!item.open||pane.hidden)return;
   const panel=$('.panel-scroll');panel.scrollTop+=item.getBoundingClientRect().top-panel.getBoundingClientRect().top;
  });
 });
 const help=$('#studio-help');$('#open-help').onclick=()=>help.showModal();$('#close-help').onclick=()=>help.close();$('#start-studio').onclick=()=>help.close();
 help.addEventListener('click',e=>{if(e.target===help){const r=help.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)help.close()}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#motion-section').open=false});
 const syncLocation=(initial=false)=>{
  const next=allTabs.filter(key=>(key!=='shipping'||getLocation()==='au')&&(key!=='electrical'||hasElectrical()));
  if(!initial&&next.join(',')===tabs.join(','))return;
  const current=tabs[active];tabs=next;
  $$('[data-studio-tab]').forEach(button=>{
   const index=tabs.indexOf(button.dataset.studioTab);button.hidden=index<0;button.disabled=index<0;
   if(index>=0)button.querySelector('.tab-number').textContent=String(index+1).padStart(2,'0');
  });
  $('.studio-tabs').classList.toggle('has-shipping',tabs.includes('shipping'));
  select(Math.max(0,tabs.indexOf(tabs.includes(current)?current:'review')));
 };
 window.addEventListener('studio-locale-change',()=>syncLocation());
 syncLocation(true);
}

export function updateStudio(values){
 for(const [key,text] of Object.entries(values)){const output=$(`[data-choice="${key}"]`);if(output)output.textContent=text}
 $('#stage-spec').textContent=values.bed==='なし'?'自由に組み合わせる':'BED / 1,800 mm';
}
export function updateReviewIndicator(needed){$('#review-indicator').hidden=!needed;$('#fit-summary').textContent=needed?'配置の確認事項があります':'配置について';}
