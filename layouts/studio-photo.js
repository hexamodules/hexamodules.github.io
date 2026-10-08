// Only the WebGL canvas is copied; page text, prices and controls never enter the photo.
export function selectedFurniture(){
 // Only module links belong to the three furniture rows; omit badges and link arrows.
 return [...document.querySelectorAll('#selection-summary > .selection-row > .selection-module > a')]
  .map(link=>link.textContent.replace(/\s*↗\s*$/, '').trim()).filter(Boolean);
}

export function photoBadgeLayout(ctx,width,height){
 const side=Math.min(width,height),h=side*.05;
 const tagline='Your Life, Your Style, Your Space';
 const family='-apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';
 const labelSize=h*.55;
 ctx.font=`300 ${labelSize}px ${family}`;
 const labelLetters=Array.from('LAYOUT STUDIO');
 const labelWidth=labelLetters.reduce((sum,letter)=>sum+ctx.measureText(letter).width,0)+labelSize*.18*(labelLetters.length-1);
 const lockupWidth=h*670/228+h*.5+Math.max(1,side*.001)+labelWidth;
 const taglineLetters=Array.from(tagline);
 let taglineSize=labelSize;
 // Keep the generous 0.18em tracking; fit by increasing the font size.
 for(let i=0;i<3;i++){
  ctx.font=`300 ${taglineSize}px ${family}`;
  const measured=taglineLetters.reduce((sum,letter)=>sum+ctx.measureText(letter).width,0)+taglineSize*.18*(taglineLetters.length-1);
  taglineSize*=lockupWidth*1.12/measured;
 }
 const taglineTracking=taglineSize*.18;
 const taglineFont=`300 ${taglineSize}px ${family}`;
 ctx.font=taglineFont;
 const metrics=ctx.measureText(tagline);
 const taglineHeight=metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent;
 const bottom=height-side*.11;
 return {y:bottom-h-taglineHeight*.8-taglineHeight,tagline,taglineFont,taglineTracking,taglineBaseline:bottom-metrics.actualBoundingBoxDescent};
}

export function composePhoto(source,logo,selections=[]){
 const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
 if(!canvas.width||!canvas.height)throw Error('Empty canvas');
 const ctx=canvas.getContext('2d');ctx.drawImage(source,0,0);
 const layout=photoBadgeLayout(ctx,canvas.width,canvas.height,selections);
 const h=Math.min(canvas.width,canvas.height)*.05,gap=h*.5;
 const logoWidth=h*670/228;
 // Same family stack as the studio heading (inherited from body).
 const fontSize=h*.55,tracking=fontSize*.18;
 ctx.font=`300 ${fontSize}px -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif`;
 const label='LAYOUT STUDIO',letters=Array.from(label);
 // Explicit tracking also works on canvases without letterSpacing support.
 const advances=letters.map(letter=>ctx.measureText(letter).width);
 const textWidth=advances.reduce((sum,value)=>sum+value,0)+tracking*(letters.length-1);
 const side=Math.min(canvas.width,canvas.height);
 const dividerWidth=Math.max(1,side*.001),dividerHeight=h*.7;
 const width=logoWidth+gap+dividerWidth+textWidth;
 const x=(canvas.width-width)/2;
 const y=layout.y;
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
 // Split the existing gap equally around the divider; centre the entire group.
 ctx.save();ctx.globalAlpha=.7;
 ctx.fillRect(x+logoWidth+gap/2,y+(h-dividerHeight)/2,dividerWidth,dividerHeight);
 ctx.restore();
 let textX=x+logoWidth+gap+dividerWidth;
 for(let i=0;i<letters.length;i++){
  ctx.fillText(letters[i],textX,baseline);textX+=advances[i]+tracking;
 }
 // One centred tagline; furniture chips remain only in the page preview.
 ctx.font=layout.taglineFont;
 const taglineLetters=Array.from(layout.tagline);
 const taglineAdvances=taglineLetters.map(letter=>ctx.measureText(letter).width);
 const taglineWidth=taglineAdvances.reduce((sum,value)=>sum+value,0)+layout.taglineTracking*(taglineLetters.length-1);
 let taglineX=(canvas.width-taglineWidth)/2;
 for(let i=0;i<taglineLetters.length;i++){
  ctx.fillText(taglineLetters[i],taglineX,layout.taglineBaseline);
  taglineX+=taglineAdvances[i]+layout.taglineTracking;
 }
 return canvas;
}

export function initStudioPhoto(){
 const root=document.documentElement,button=document.querySelector('#outro-photo');
 if(!button)return;
 const status=document.querySelector('#outro-photo-status'),hint=document.querySelector('.outro-gesture');
 const logo=new Image();let logoReady=false,busy=false,sequence=0,statusTimer,hintTimer,wasReady=false,drag;
 // Feedback stays outside the WebGL canvas and never enters the saved JPEG.
 let audioContext,preview,previewURL,previewTimer,flash;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function shutter(){
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
   if(!audioContext||audioContext.state==='closed')audioContext=new Audio();
   const ctx=audioContext;
   if(ctx.state==='suspended')ctx.resume().catch(()=>{});
   const start=ctx.currentTime;
   for(const [offset,duration,volume] of [[0,.04,.12],[.06,.06,.09]]){
    const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate);
    const data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    source.buffer=buffer;filter.type='highpass';filter.frequency.value=1400;
    gain.gain.setValueAtTime(0,start+offset);
    gain.gain.linearRampToValueAtTime(volume,start+offset+.002);
    gain.gain.exponentialRampToValueAtTime(.001,start+offset+duration);
    source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect()};
    source.start(start+offset);source.stop(start+offset+duration);
   }
  }catch{/* Sound is optional; saving must still work. */}
 }
 function pressFeedback(){
  if(reduced())return;
  try{
   button.animate([{transform:'scale(1)'},{transform:'scale(.95)'},{transform:'scale(1)'}],{duration:100});
   if(!flash){flash=document.createElement('div');flash.className='photo-flash';flash.setAttribute('aria-hidden','true');document.querySelector('#viewport').append(flash)}
   flash.getAnimations().forEach(animation=>animation.cancel());
   flash.animate([{opacity:.8},{opacity:0}],{duration:120});
  }catch{/* Feedback must not block saving on older browsers. */}
 }
 function clearPreview(){
  clearTimeout(previewTimer);preview?.remove();preview=null;
  if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;
 }
 function showPreview(file,count,selections){
  try{
   clearPreview();
   preview=document.createElement('figure');preview.className='photo-preview';
   const image=document.createElement('img'),caption=document.createElement('figcaption');
   image.alt='';previewURL=URL.createObjectURL(file);image.src=previewURL;
   caption.textContent=en()?`Saved (photo ${count}).`:`保存しました（${count}枚目）`;
   preview.append(image,caption);
   if(selections.length){
    const chips=document.createElement('div');chips.className='photo-preview-chips';
    selections.forEach((text,index)=>{
     const chip=document.createElement('span');chip.className='photo-preview-chip';chip.textContent=text;
     chip.style.setProperty('--chip-delay',`${index*60}ms`);chips.append(chip);
    });
    preview.append(chips);
   }
   // Position above the central photo button on phones, including landscape.
   preview.style.setProperty('--photo-preview-bottom',`${Math.max(12,window.innerHeight-button.getBoundingClientRect().top+12)}px`);
   document.body.append(preview);
   previewTimer=setTimeout(clearPreview,2450);
  }catch{clearPreview()}
 }
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
  if(!visible){hint.classList.remove('photo-rotate-large');clearTimeout(hintTimer);drag=null;status.textContent='';clearPreview()}
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
   shutter();pressFeedback();
   // Let the immediate feedback paint before synchronous rendering/JPEG encoding.
   // Keep this to one frame/task; share rejection retains the explicit download fallback.
   await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
   const selections=selectedFurniture();
   const measure=document.createElement('canvas').getContext('2d');
   const {y:badgeTop}=photoBadgeLayout(measure,2000,2000,selections);
   const canvas=composePhoto(studio.capturePhoto({badgeTop,lowerBy:.03,edgeMargin:.015,badgeGap:.02}),logo,selections);
   const encoded=canvas.toDataURL('image/jpeg',.92).split(',')[1];
   const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
   const number=String(studio.layoutNumber||'layout').replace(/[^a-zA-Z0-9_-]/g,'-');
   const count=++sequence,file=new File([bytes],`Hexa-${number}-${count}.jpg`,{type:'image/jpeg'});
   showPreview(file,count,selections);
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
