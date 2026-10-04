const data=JSON.parse(document.querySelector('#module-data').textContent);
let current=0,finish=data.variants?.includes(new URLSearchParams(location.search).get('finish'))?new URLSearchParams(location.search).get('finish'):data.default_finish,timer=null;
const $=s=>document.querySelector(s),labels={black:'ヘキサ合板',birch:'バーチ合板'};
function file(key,f=finish){return 'assets/'+data.prefix.replace('{finish}',f)+'-'+key+'.webp'}
function path(i,f=finish){return file(data.scenes[i].key,f)}
function show(i){
 current=(i+data.scenes.length)%data.scenes.length;
 const s=data.scenes[current],alt=finish==='black'?'birch':'black';
 $('#main-image').src=path(current);$('#main-image').alt=data.name+'：'+s.title+'・'+labels[finish];
 $('#alternate-image').src=path(current,alt);$('#alternate-image').alt='同じ場面の'+labels[alt];
 $('#alternate-label').textContent=labels[alt]+' ↗';$('#alternate-finish').setAttribute('aria-label',labels[alt]+'に切り替える');
 $('#current-finish').textContent=labels[finish];
 $('#scene-title').textContent=s.title;$('#scene-body').textContent=s.body;$('#scene-note').textContent=s.note||'';
 $('#scene-label').textContent='FEATURE '+String(current+1).padStart(2,'0');
 $('#count').textContent=String(current+1).padStart(2,'0')+' / '+String(data.scenes.length).padStart(2,'0');
 document.querySelectorAll('.thumb').forEach((b,n)=>{b.setAttribute('aria-current',n===current);b.querySelector('img').src=path(n)});
 document.querySelectorAll('[data-compare]').forEach(im=>im.src=file(im.dataset.compare));
 document.querySelectorAll('[data-finish]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.finish===finish));
}
data.scenes.forEach((s,i)=>{const b=document.createElement('button');b.className='thumb';b.setAttribute('aria-label',s.title);const im=document.createElement('img');im.alt='';im.src=path(i);b.append(im);b.onclick=()=>{stop();show(i)};$('#thumbs').append(b)});
function stop(){clearInterval(timer);timer=null;$('#play').textContent='▶ 自動再生';$('#play').setAttribute('aria-pressed','false')}
function selectFinish(f){
 stop();finish=f;show(current);
 const url=new URL(location.href);url.searchParams.set('finish',finish);history.replaceState(null,'',url);
 document.dispatchEvent(new Event('hexa:module-finish'));
}
$('#prev').onclick=()=>{stop();show(current-1)};$('#next').onclick=()=>{stop();show(current+1)};
$('#play').onclick=()=>{if(timer){stop();return}timer=setInterval(()=>show(current+1),4500);$('#play').textContent='Ⅱ 一時停止';$('#play').setAttribute('aria-pressed','true')};
document.querySelectorAll('[data-finish]').forEach(b=>b.onclick=()=>selectFinish(b.dataset.finish));
$('#alternate-finish').onclick=()=>selectFinish(finish==='black'?'birch':'black');
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select')||!e.target.closest('.gallery'))return;if(e.key==='ArrowRight'){e.preventDefault();stop();show(current+1)}if(e.key==='ArrowLeft'){e.preventDefault();stop();show(current-1)}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});show(0);
