import * as THREE from 'three';
import {MATTRESS_COLORS} from './mattress-state.js?v=2';
import {I_SEAT_POSES,iSeatColor,iSeatSlide,iSeatDefaultSlide,iSeatSlideRange,iSeatInstallationNote} from './i-seat-state.js?v=6';
export function createISeatControls({getState,getLanguage,onChange,onSlidePreview}){
 const text=(ja,en)=>getLanguage()==='en'?en:ja;
 const slideText=v=>v===0?text('取付センター · 0mm','Mounting centre · 0 mm'):text(`${v>0?'前':'後ろ'}へ ${Math.abs(v)}mm`,`${v>0?'Forward':'Rearward'} ${Math.abs(v)} mm`);
 function inline(key){
  const s=getState();if(key!=='i-seat'||s.front!==key)return '';
  const color=iSeatColor(s),[slideMin,slideMax]=iSeatSlideRange(s);
  return `<section class="iseat-options" data-iseat-options data-module-i18n>
   <p class="iseat-spec">i seat · ${text('幅1,400mm','1,400 mm wide')}</p>
   <fieldset><legend>${text('シートの形態','Seat position')}</legend><div class="iseat-poses">${I_SEAT_POSES.map(p=>`<button type="button" data-iseat-pose="${p.id}" aria-pressed="${s.iSeatPose===p.id}"><img src="assets/iseat/${p.id}.webp" alt="" width="280" height="190"><span>${text(p.ja,p.en)}</span></button>`).join('')}</div></fieldset>
   <p class="iseat-dimensions">${text('フラット時：長さ950mm／床から上面390mm','Flat: 950 mm long / top 390 mm above floor')}</p>
   <fieldset class="iseat-slide"><legend>${text('前後スライド','Fore–aft slide')} <output data-iseat-slide-output>${slideText(iSeatSlide(s))}</output></legend>
    <label class="iseat-slide-label"><span class="sr-only">${text('取付センターからの移動量','Offset from the mounting centre')}</span><input type="range" data-iseat-slide min="${slideMin}" max="${slideMax}" step="20" value="${iSeatSlide(s)}" aria-valuetext="${slideText(iSeatSlide(s))}"></label>
    <div class="iseat-slide-scale"><span>${slideMin===0?text('センター 0mm','Centre 0 mm'):text('後ろ −120mm','Rear −120 mm')}</span>${slideMin<0?'<span>0</span>':''}<span>${text('前 ＋120mm','Front +120 mm')}</span></div>
    <div class="iseat-slide-foot"><small>${slideMin===0?text('表示範囲120mm · 7段階','Preview travel 120 mm · 7 positions'):text('可動範囲240mm · 13段階','240 mm travel · 13 positions')}</small><button type="button" data-iseat-centre>${text('センターへ戻す','Reset to centre')}</button></div>
    ${slideMin===0?`<small class="iseat-clearance-note">${text('ベッドのマットレスに触れない範囲で調整できます。','Adjustment is limited to positions clear of the bed mattress.')}</small>`:''}
   </fieldset>
   <fieldset class="mattress-colors"><legend>${text('生地色','Upholstery')} · ${text(color.ja,color.en)}</legend><div class="mattress-color-list">${MATTRESS_COLORS.map(c=>`<label class="mattress-color"><input type="radio" name="iseat-color" data-iseat-color value="${c.id}" ${c.id===color.id?'checked':''}><img src="${c.image}" width="56" height="56" alt=""><span>${text(c.ja,c.en)}</span></label>`).join('')}</div></fieldset>
   <p class="iseat-note">${iSeatInstallationNote(getLanguage())}</p>
  </section>`;
 }
 function stage(){
  const s=getState();if(s.front!=='i-seat')return '';
  return `<section class="iseat-stage-controls" data-iseat-stage data-module-i18n><div class="iseat-stage-heading"><b>i seat</b><small>${slideText(iSeatSlide(s))}</small></div><div class="iseat-stage-poses">${I_SEAT_POSES.map(p=>`<button type="button" data-iseat-stage-pose="${p.id}" aria-pressed="${s.iSeatPose===p.id}">${text(p.ja,p.en)}</button>`).join('')}</div></section>`;
 }
 function stageHeading(){
  const summary=document.querySelector('#motion-section > summary');
  if(!summary)return;
  summary.setAttribute('data-module-i18n','');
  summary.innerHTML=(getState().front==='i-seat'?text('i seat・展開操作','i seat & motion'):text('展開・収納','Open / stow'))+' <span aria-hidden="true">＋</span>';
 }
 function summary(){
  const s=getState();if(s.front!=='i-seat')return '';
  const color=iSeatColor(s),pose=I_SEAT_POSES.find(p=>p.id===s.iSeatPose)||I_SEAT_POSES[0];
  return `<div id="iseat-summary" class="selection-row" data-module-i18n><span>${text('i seat 仕様','i seat specification')}</span><b>${text('幅1,400mm','1,400 mm wide')}<br>${text(pose.ja,pose.en)} · ${text(color.ja,color.en)}<br>${slideText(iSeatSlide(s))}<br><small>${text('シート・取付費：別途お見積もり','Seat and fitting: quoted separately')}</small></b></div>`;
 }
 document.addEventListener('click',async e=>{
  const pose=e.target.closest('[data-iseat-pose],[data-iseat-stage-pose]');
  if(pose){const id=pose.dataset.iseatPose||pose.dataset.iseatStagePose,attr=pose.hasAttribute('data-iseat-stage-pose')?'data-iseat-stage-pose':'data-iseat-pose';await onChange({iSeatPose:id,iSeatSlide:iSeatDefaultSlide(id)});document.querySelector(`[${attr}="${id}"]`)?.focus({preventScroll:true});}
  if(e.target.closest('[data-iseat-centre]')){await onChange({iSeatSlide:0});document.querySelector('[data-iseat-centre]')?.focus({preventScroll:true});}
 });
 document.addEventListener('input',e=>{if(e.target.matches('[data-iseat-slide]')){const value=Number(e.target.value);e.target.setAttribute('aria-valuetext',slideText(value));document.querySelector('[data-iseat-slide-output]').textContent=slideText(value);onSlidePreview?.(value);}});
 document.addEventListener('change',async e=>{
  if(e.target.matches('[data-iseat-slide]')){await onChange({iSeatSlide:Number(e.target.value)});document.querySelector('[data-iseat-slide]')?.focus({preventScroll:true});}
  if(e.target.matches('[data-iseat-color]')){const id=e.target.value;await onChange({iSeatColor:id,iSeatMatchMattress:false});document.querySelector(`[data-iseat-color][value="${id}"]`)?.focus({preventScroll:true});}
 });
 return {inline,summary,stage,stageHeading,refresh(){stageHeading();const stageEl=document.querySelector('[data-iseat-stage]');if(stageEl)stageEl.outerHTML=stage();const el=document.querySelector('[data-iseat-options]');if(el)el.outerHTML=inline('i-seat');const row=document.querySelector('#iseat-summary');if(row)row.outerHTML=summary()}};
}
export function createISeatVisuals({renderer,onTextureReady}){
 const loader=new THREE.TextureLoader(),materials=new Map();
 function fabric(id){
  if(materials.has(id))return materials.get(id);
  const color=MATTRESS_COLORS.find(c=>c.id===id)||MATTRESS_COLORS[1];
  const material=new THREE.MeshStandardMaterial({name:'I Seat fabric '+id,color:color.hex,roughness:.96,metalness:0,side:THREE.DoubleSide});
  const seam=new THREE.MeshStandardMaterial({name:'I Seat stitching '+id,color:new THREE.Color(color.hex).multiplyScalar(.64),roughness:1});
  materials.set(id,{material,seam});
  loader.load(color.image,t=>{t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());material.map=t;material.color.set('#ffffff');material.needsUpdate=true;onTextureReady();});
  return {material,seam};
 }
 return {update(group,state){
  if(!group)return;
  const color=iSeatColor(state),m=fabric(color.id);
  group.userData.iSeatPose=state.iSeatPose;group.userData.iSeatColor=color.id;group.userData.iSeatSlide=iSeatSlide(state);
  for(const node of group.children){node.position.z=node.userData.sliding?iSeatSlide(state):0;node.visible=node.userData.pose===state.iSeatPose;for(const mesh of node.children){if(node.userData.role==='fabric')mesh.material=m.material;else if(node.userData.role==='seam')mesh.material=m.seam;}}
 }};
}
