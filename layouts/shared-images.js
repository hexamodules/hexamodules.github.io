// Share decoded images and in-flight requests between swatches and 3D textures.
import * as THREE from 'three';
const jobs=new Map();
export function imageSource(url){
 const key=new URL(url,document.baseURI).href;
 if(!jobs.has(key)){
  const job=fetch(key).then(r=>{if(!r.ok)throw Error(`${r.status}: ${key}`);return r.blob()}).then(blob=>URL.createObjectURL(blob));
  jobs.set(key,job);job.catch(()=>jobs.delete(key));
 }
 return jobs.get(key);
}
export async function sharedTexture(url){return new THREE.TextureLoader().loadAsync(await imageSource(url))}
const pending=new WeakSet();
const observer=new IntersectionObserver(entries=>{for(const {target,isIntersecting} of entries){if(!isIntersecting||pending.has(target))continue;pending.add(target);imageSource(target.dataset.sharedImage).then(src=>{target.src=src;observer.unobserve(target)}).catch(()=>{pending.delete(target);observer.unobserve(target);target.src=target.dataset.sharedImage})}},{rootMargin:'100px'});
function observe(){for(const img of document.querySelectorAll('img[data-shared-image]'))observer.observe(img)}
new MutationObserver(observe).observe(document.documentElement,{childList:true,subtree:true});observe();
