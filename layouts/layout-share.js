import {studioEvent} from './analytics.js?v=20261010-events';
export function createLayoutShare({urlFor}){
const $=s=>document.querySelector(s);
const shareLayout=document.createElement('button');shareLayout.id='share-layout';shareLayout.type='button';shareLayout.className='text-button';shareLayout.textContent='URLを共有';$('#pane-review').append(shareLayout);
const shareStatus=document.createElement('p');shareStatus.setAttribute('role','status');$('#pane-review').append(shareStatus);
shareLayout.onclick=async()=>{const url=new URL(urlFor(),location.href);url.searchParams.set('complete','1');try{await navigator.clipboard.writeText(url.href);shareStatus.textContent='URLをコピーしました';studioEvent('share_url');}catch{shareStatus.textContent=url.href;}};
}
