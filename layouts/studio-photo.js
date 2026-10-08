// Only the WebGL canvas is copied; page text, prices and controls never enter the photo.
export function composePhoto(source,logo){
 const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
 if(!canvas.width||!canvas.height)throw Error('Empty canvas');
 const ctx=canvas.getContext('2d');ctx.drawImage(source,0,0);
 const h=Math.min(canvas.width,canvas.height)*.05,pad=h*.45,gap=h*.5;
 // Crop the whitespace of the supplied 960 × 360 logo, preserving the complete mark.
 const logoWidth=h*670/228;
 ctx.font=`500 ${h*.46}px Arial, sans-serif`;
 const label='LAYOUT STUDIO',width=pad*2+logoWidth+gap+ctx.measureText(label).width,height=h+pad*2;
 const x=canvas.width-h-width,y=canvas.height-h-height,r=h*.25;
 ctx.fillStyle='#fff';ctx.shadowColor='#00000020';ctx.shadowBlur=h*.25;
 ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+width,y,x+width,y+height,r);ctx.arcTo(x+width,y+height,x,y+height,r);ctx.arcTo(x,y+height,x,y,r);ctx.arcTo(x,y,x+width,y,r);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
 ctx.drawImage(logo,130,77,670,228,x+pad,y+pad,logoWidth,h);
 ctx.fillStyle='#344238';ctx.textBaseline='middle';ctx.fillText(label,x+pad+logoWidth+gap,y+height/2);
 return canvas;
}

export function initStudioPhoto(){
 const root=document.documentElement,button=document.querySelector('#outro-photo');
 if(!button)return;
 const status=document.querySelector('#outro-photo-status'),hint=document.querySelector('.outro-gesture');
 const logo=new Image();let logoReady=false,busy=false,sequence=0,statusTimer,hintTimer,wasReady=false,drag;
 const touch=()=>navigator.maxTouchPoints>0||matchMedia('(any-pointer: coarse)').matches;
 const en=()=>root.lang==='en';
 const ready=()=>root.classList.contains('outro-ready');
 function locale(){
  button.querySelector('span').textContent=en()?'Save a photo of this view':'この角度で写真を保存';
  document.querySelector('.photo-caption').textContent=en()?'Save as many angles as you like.':'気に入った角度で、何枚でも。';
  hint.textContent=en()?(touch()?'Swipe to rotate. Look from any angle.':'Drag to rotate. Look from any angle.'):(touch()?'指でなぞって回転。いろんな角度から見られます。':'ドラッグで回転。いろんな角度から見られます。');
 }
 function notice(text){clearTimeout(statusTimer);status.textContent=text;statusTimer=setTimeout(()=>{status.textContent=''},2000)}
 function sync(){
  const visible=ready();button.disabled=!visible||!logoReady||busy;
  if(visible&&!wasReady){hint.classList.add('photo-rotate-large');clearTimeout(hintTimer);hintTimer=setTimeout(()=>hint.classList.remove('photo-rotate-large'),6000)}
  if(!visible){hint.classList.remove('photo-rotate-large');clearTimeout(hintTimer);drag=null;status.textContent=''}
  wasReady=visible;
 }
 logo.onload=()=>{logoReady=true;sync()};
 logo.onerror=()=>notice(en()?'Could not load the logo. Please reload.':'ロゴを読み込めませんでした。再読み込みしてください。');
 logo.src=new URL('./assets/hexa-logo.jpg',import.meta.url).href;
 function download(file){
  const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 button.addEventListener('click',async()=>{
  const studio=window.__hexaStudio;if(!ready()||!logoReady||busy||!studio)return;
  busy=true;sync();status.textContent='';clearTimeout(statusTimer);
  try{
   // No await before navigator.share: preserve the tap's transient activation on Safari.
   const canvas=composePhoto(studio.capturePhoto(),logo);
   const encoded=canvas.toDataURL('image/jpeg',.92).split(',')[1];
   const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
   const number=String(studio.layoutNumber||'layout').replace(/[^a-zA-Z0-9_-]/g,'-');
   const count=++sequence,file=new File([bytes],`Hexa-${number}-${count}.jpg`,{type:'image/jpeg'});
   let shareable=false;try{shareable=touch()&&!!navigator.share&&!!navigator.canShare?.({files:[file]})}catch{/* Download when file sharing is unavailable. */}
   if(shareable){
    try{await navigator.share({files:[file]})}
    catch(error){
     if(error.name==='AbortError'){notice(en()?'Cancelled.':'キャンセルしました。');return}
     // Keep an explicit tap available if embedding or browser policy rejects sharing.
     status.textContent=en()?'Sharing unavailable. ':'共有できませんでした。';
     const retry=document.createElement('button');retry.type='button';retry.textContent=en()?'Download photo':'写真をダウンロード';
     retry.onclick=()=>{download(file);notice(en()?`Saved (photo ${count}).`:`保存しました（${count}枚目）`)};status.append(retry);return;
    }
    // A share result does not tell us whether Photos, Files, or another destination was chosen.
    notice(en()?`Shared (photo ${count}).`:`共有しました（${count}枚目）`);
   }else{download(file);notice(en()?`Saved (photo ${count}).`:`保存しました（${count}枚目）`)}
  }catch(error){console.error('Photo capture failed',error);notice(en()?'Could not save. Please try again.':'保存できませんでした。もう一度お試しください。')}
  finally{busy=false;sync()}
 });
 const viewport=document.querySelector('#viewport');
 viewport.addEventListener('pointerdown',e=>{if(ready()&&e.isPrimary&&(e.pointerType!=='mouse'||e.button===0))drag={id:e.pointerId,x:e.clientX,y:e.clientY}});
 viewport.addEventListener('pointermove',e=>{if(drag&&drag.id===e.pointerId&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8){hint.classList.remove('photo-rotate-large');clearTimeout(hintTimer);drag=null}});
 for(const event of ['pointerup','pointercancel'])window.addEventListener(event,()=>{drag=null});
 new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['class']});
 window.addEventListener('studio-locale-change',locale);locale();sync();
}
initStudioPhoto();
