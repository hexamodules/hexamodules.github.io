(()=>{
 const videos=[...document.querySelectorAll('[data-display-video]')];if(!videos.length)return;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const language=()=>document.documentElement.lang==='en'?'en':'ja';
 const source=(video,lang)=>`assets/display/display-assembly-${lang}${video.dataset.displayVideo==='preview'?'-web':''}.mp4`;
 for(const video of videos){
  const preview=video.dataset.displayVideo==='preview',toggle=preview?video.closest('.series-visual').querySelector('.display-preview-toggle'):null;
  let visible=!preview,manuallyPaused=false,explicitPlay=false,loaded=false,selectedLanguage=language(),pending=null,generation=0,objectUrl=null;
  function status(){if(!toggle)return;toggle.classList.toggle('is-playing',!video.paused);toggle.setAttribute('aria-label',language()==='ja'?(video.paused?'紹介動画を再生':'紹介動画を一時停止'):(video.paused?'Play introduction':'Pause introduction'))}
  function failure(){status();const fallback=document.querySelector('[data-display-fallback]');if(fallback&&!preview){fallback.hidden=false;fallback.querySelector('a').href=source(video,selectedLanguage)}}
  function load(position=0){
   if(pending)return pending;loaded=true;const token=++generation,lang=selectedLanguage;
   pending=(async()=>{
    let address=source(video,lang);
    // Fully seekable media supports both seamless preview looping and chapter jumps,
    // including on the local server, which does not support HTTP Range requests.
    const response=await fetch(address);if(!response.ok)throw new Error('Video unavailable');address=URL.createObjectURL(await response.blob());if(token!==generation){URL.revokeObjectURL(address);return false}if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=address;
    if(token!==generation)return false;
    const ready=new Promise((resolve,reject)=>{video.addEventListener('loadedmetadata',resolve,{once:true});video.addEventListener('error',reject,{once:true})});
    video.src=address;video.dataset.activeLanguage=lang;video.load();await ready;if(token!==generation)return false;
    if(position>0)video.currentTime=Math.min(position,video.duration||45);return true;
   })().catch(()=>{failure();pending=null;return false});return pending;
  }
  async function play(){if(!await load())return;if(preview&&(!visible||document.hidden||manuallyPaused||(reduced.matches&&!explicitPlay)))return;video.play().catch(status)}
  function auto(){if(!preview)return;const allowed=visible&&!document.hidden&&(!reduced.matches||explicitPlay)&&!manuallyPaused;video.autoplay=allowed;if(allowed)play();else video.pause()}
  async function setLanguage(){const next=language();video.poster=`assets/display/display-assembly-${next}.jpg`;if(next!==selectedLanguage){const playing=!video.paused,position=video.currentTime||0;selectedLanguage=next;generation++;pending=null;if(loaded&&await load(position)&&playing)play()}status()}
  if(preview){
   video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;toggle.hidden=false;toggle.addEventListener('click',()=>{if(video.paused){explicitPlay=true;manuallyPaused=false}else{manuallyPaused=true}auto();status()});
   new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;auto()},{threshold:.1}).observe(video);
   document.addEventListener('visibilitychange',auto);reduced.addEventListener('change',auto);video.addEventListener('loadeddata',auto);
  }else{
   load();const chapters=[...document.querySelectorAll('[data-display-chapter]')];
   function highlight(){const now=video.currentTime;let active=-1;chapters.forEach((b,i)=>{if(now>=Number(b.dataset.displayChapter))active=i});chapters.forEach((b,i)=>b.setAttribute('aria-current',String(i===active)))}
   for(const button of chapters)button.addEventListener('click',async()=>{if(!await load())return;video.currentTime=Number(button.dataset.displayChapter);play();highlight();video.scrollIntoView({block:'center',behavior:reduced.matches?'instant':'smooth'})});
   video.addEventListener('timeupdate',highlight);highlight();
  }
  video.addEventListener('play',status);video.addEventListener('pause',status);video.addEventListener('error',failure);
  document.addEventListener('hexa:language',setLanguage);setLanguage();
 }
})();
