// Only fixed choices enter analytics; never read forms, prices, receipts or shared URLs.
export function studioEvent(name){
 try {
  if(location.hostname!=='hexamodules.com'||/(^|\/)private(\/|$)/i.test(decodeURIComponent(location.pathname)))return;
  if(!['studio_start','studio_complete_view','enquiry_open','enquiry_sent','spec_pdf_download','photo_save','share_url'].includes(name))return;
  if(!document.querySelector('#studio-opening'))return;
  const vehicle=document.querySelector('[data-base-vehicle][aria-pressed="true"]')?.dataset.baseVehicle;
  const params={vehicle:vehicle==='super-gl'?'hiace-super-gl':vehicle==='dx'?'hiace-dx':'hiace',language:document.documentElement.lang==='en'?'en':'ja'};
  window.gtag&&gtag('event',name,params);
 } catch { /* Analytics must never interrupt the studio. */ }
}
