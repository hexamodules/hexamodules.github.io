import {twiCeilingEnabled} from './base-vehicle.js?v=2';

export function createTwiLightingControls({getState,onChange}) {
 const controls=[];
 for(const [id,parent] of [['twi-equipment-lights',document.querySelector('#twi-lighting-included').parentElement],['twi-preview-lights',document.querySelector('.stage')],['twi-outro-lights',document.querySelector('#studio-outro')]]){
  const panel=document.createElement('div');panel.id=id;panel.className='twi-light-switches';panel.setAttribute('role','group');panel.setAttribute('aria-label','TWI天井の点灯切り替え');
  panel.innerHTML='<button type="button" data-twi-light="twiBarLights" aria-pressed="true"><span>バーライト</span><b aria-hidden="true">ON</b></button><button type="button" data-twi-light="twiIndirectLights" aria-pressed="true"><span>間接照明</span><b aria-hidden="true">ON</b></button>';
  if(id==='twi-equipment-lights')document.querySelector('#twi-lighting-included').after(panel);else parent.append(panel);
  panel.addEventListener('click',e=>{const b=e.target.closest('[data-twi-light]');if(b)onChange(b.dataset.twiLight,getState()[b.dataset.twiLight]===false)});
  controls.push(panel);
 }
 function update(){
  const s=getState(),enabled=twiCeilingEnabled(s);
  for(const panel of controls){
   panel.hidden=!enabled||(panel.id!=='twi-equipment-lights'&&!s.night);
   for(const b of panel.querySelectorAll('[data-twi-light]')){const on=s[b.dataset.twiLight]!==false;b.setAttribute('aria-pressed',String(on));b.querySelector('b').textContent=on?'ON':'OFF'}
  }
 }
 return {update};
}
