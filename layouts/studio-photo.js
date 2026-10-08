// Only the WebGL canvas is copied; page text, prices and controls never enter the photo.
export function composePhoto(source,logo){
 const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
 if(!canvas.width||!canvas.height)throw Error('Empty canvas');
 const ctx=canvas.getContext('2d');ctx.drawImage(source,0,0);
 const h=Math.min(canvas.width,canvas.height)*.05,gap=h*.5;
 const logoWidth=h*670/228;
 // Same family stack as the studio heading (inherited from body).
 const fontSize=h*.55,tracking=fontSize*.18;
 ctx.font=`300 ${fontSize}px -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif`;
 const label='LAYOUT STUDIO',letters=Array.from(label);
 // Explicit tracking also works on canvases without letterSpacing support.
 const advances=letters.map(letter=>ctx.measureText(letter).width);
 const textWidth=advances.reduce((sum,value)=>sum+value,0)+tracking*(letters.length-1);
 const width=logoWidth+gap+textWidth;
 const x=canvas.width-h-width,y=canvas.height-h-h;
 // Measure only the destination region, before drawing any branding.
 const left=Math.max(0,Math.floor(x)),top=Math.max(0,Math.floor(y));
 const region=ctx.getImageData(left,top,Math.min(canvas.width-left,Math.ceil(x+width)-left),Math.min(canvas.height-top,Math.ceil(y+h)-top));
 let luminance=0;
 for(let i=0;i<region.data.length;i+=4){
  const linear=c=>{c/=255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4)};
  luminance+=.2126*linear(region.data[i])+.7152*linear(region.data[i+1])+.0722*linear(region.data[i+2]);
 }
 // Preserve the existing local-background brightness switch.
 const dark=luminance/(region.data.length/4)>=.22;
 // JPEG line-core RGB mode: (114,112,113), 20,161 pixels with max(R,G,B)<160.
 // Use its representative colour, excluding pale antialiasing and JPEG outliers.
 const ink=dark?[114,112,113]:[255,255,255];
 // Crop the supplied JPEG. Remove near-white compression noise, and turn
 // edge coverage into alpha before recolouring, so no white fringe remains.
 const mark=document.createElement('canvas');mark.width=670;mark.height=228;
 const markCtx=mark.getContext('2d');markCtx.drawImage(logo,130,77,670,228,0,0,670,228);
 const pixels=markCtx.getImageData(0,0,670,228);
 for(let i=0;i<pixels.data.length;i+=4){
  const value=.2126*pixels.data[i]+.7152*pixels.data[i+1]+.0722*pixels.data[i+2];
  pixels.data[i+3]=Math.round(255*Math.max(0,Math.min(1,(245-value)/(245-120))));
  pixels.data[i]=ink[0];pixels.data[i+1]=ink[1];pixels.data[i+2]=ink[2];
 }
 markCtx.putImageData(pixels,0,0);
 ctx.drawImage(mark,x,y,logoWidth,h);
 ctx.fillStyle=`rgb(${ink.join(',')})`;ctx.textBaseline='alphabetic';
 const metrics=ctx.measureText(label);
 const baseline=y+h/2+(metrics.actualBoundingBoxAscent-metrics.actualBoundingBoxDescent)/2;
 let textX=x+logoWidth+gap;
 for(let i=0;i<letters.length;i++){
  ctx.fillText(letters[i],textX,baseline);textX+=advances[i]+tracking;
 }
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
