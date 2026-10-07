import {initDealerEnquiry} from './layouts/dealer-enquiry.js?v=20261007-grid';
let imagePromise;
function captureImage(){
 if(!imagePromise)imagePromise=new Promise((resolve,reject)=>{
  const image=new Image();image.onload=()=>{try{const canvas=document.createElement('canvas');canvas.width=900;canvas.height=Math.round(image.naturalHeight*900/image.naturalWidth);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);resolve([canvas.toDataURL('image/jpeg',0.8)]);}catch(e){imagePromise=null;reject(e)}};image.onerror=()=>{imagePromise=null;reject(Error('Grid. image unavailable'))};image.src='assets/grid/hinoki-interior.jpg';
 });return imagePromise;
}
const api=initDealerEnquiry({
 dealerId:()=> 'hexa-direct',buttonSelector:'#grid-enquiry-open',preserveButtonLabel:true,requireImage:true,
 select:(_catalogue,_state,lang)=>[{key:'grid:complete',number:null,label:lang==='en'?'Grid. (Base vehicle: HiAce Super GL)':'Grid.(ベース車: ハイエース スーパーGL)'}],
 describe:()=>({configuration:{},url:'https://hexamodules.com/grid.html'}),captureImages:captureImage
});
document.addEventListener('hexa:language',()=>window.dispatchEvent(new Event('studio-locale-change')));
if(location.hash==='#grid-enquiry')api.open();
