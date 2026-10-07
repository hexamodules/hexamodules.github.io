import {initDealerEnquiry} from './layouts/dealer-enquiry.js?v=20261007-2000';
let imagePromise;
function captureImage(){
 if(!imagePromise)imagePromise=Promise.all(['hinoki-interior.jpg','kitchen.jpg','seat.jpg'].map(file=>new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>{try{
   const canvas=document.createElement('canvas');canvas.width=800;canvas.height=Math.round(image.naturalHeight*800/image.naturalWidth);
   canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);resolve(canvas);
  }catch(e){reject(e)}};
  image.onerror=()=>reject(Error('Grid. image unavailable'));image.src='assets/grid/'+file;
 }))).then(canvases=>{
  // Include data URL prefixes in the budget; use decimal KB to stay below either interpretation.
  for(let quality=0.72;quality>=0;quality=Math.max(0,Math.round((quality-0.06)*100)/100)){
   const images=canvases.map(canvas=>canvas.toDataURL('image/jpeg',quality));
   if(images.reduce((total,image)=>total+image.length,0)<=450000)return images;
   if(quality===0)break;
  }
  throw Error('Grid. images exceed size limit');
 }).catch(error=>{imagePromise=null;throw error;});
 return imagePromise;
}

let prefill={};
if(new URLSearchParams(location.search).get('enquiry')==='1'){
 try{prefill=JSON.parse(sessionStorage.getItem('hexa-grid-contact')||'{}')||{};sessionStorage.removeItem('hexa-grid-contact');}catch{}
}
const api=initDealerEnquiry({gridVehicle:true,prefill,
 dealerId:()=> 'hexa-direct',buttonSelector:'#grid-enquiry-open',preserveButtonLabel:true,requireImage:true,
 select:(_catalogue,_state,lang)=>[{key:'grid:complete',number:null,label:lang==='en'?'Grid. (Base vehicle: HiAce Super GL)':'Grid.(ベース車: ハイエース スーパーGL)'}],
 describe:()=>({configuration:{},url:'https://hexamodules.com/grid.html'}),captureImages:captureImage
});
document.addEventListener('hexa:language',()=>window.dispatchEvent(new Event('studio-locale-change')));
if(location.hash==='#grid-enquiry'||new URLSearchParams(location.search).get('enquiry')==='1')api.open();
