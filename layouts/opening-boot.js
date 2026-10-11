// Decide before the first paint. Shared configurations open directly in the studio.
(() => {
 const q = new URLSearchParams(location.search);
 const root=document.documentElement;
 root.dataset.studioStep='interior';
 root.dataset.studioUi='loading';
 root.lang=q.get('lang')==='en'?'en':'ja';
 function refreshShell(){
  const en=root.lang==='en',sgl=(root.dataset.baseVehicle||q.get('vehicle'))==='super-gl';
  for(const el of document.querySelectorAll('[data-loading-ja]')){const text=el.dataset[en?'loadingEn':'loadingJa'];if(el.textContent!==text)el.textContent=text;}
  const vehicle=document.querySelector('[data-loading-vehicle]');
  const name=en?'Toyota HiAce '+(sgl?'Super GL':'DX'):'トヨタ ハイエース バン '+(sgl?'スーパーGL':'DX');
  if(vehicle&&vehicle.textContent!==name)vehicle.textContent=name;
 }
 document.addEventListener('DOMContentLoaded',refreshShell,{once:true});
 new MutationObserver(refreshShell).observe(root,{attributes:true,attributeFilter:['lang','data-base-vehicle']});
 const selected = ['layout_number','vehicle_purchase','new_vehicle_grade','new_vehicle_powertrain','front','bed','cab','finish','wall','panel','ceiling','floor','ac','heater','insulation','electrical','battery','inverter','sourcing','shipping','ceiling_lights','tailgate_lights','night','twi_ceiling','quarter'].some(k => q.has(k));
 if(q.get('complete')==='1'){document.documentElement.classList.add('complete-loading');return;}
 const opening = !q.has('review') && (q.get('intro') === '1' || !selected);
 if (opening) {
  document.documentElement.classList.add('intro-active');
  document.documentElement.dataset.introState = 'loading';
 }
})();
