// Decide before the first paint. Shared configurations open directly in the studio.
(() => {
 const q = new URLSearchParams(location.search);
 const selected = ['layout_number','vehicle_purchase','new_vehicle_grade','new_vehicle_powertrain','front','bed','cab','finish','wall','panel','ceiling','floor','ac','heater','insulation','electrical','battery','inverter','sourcing','shipping','ceiling_lights','tailgate_lights','night','twi_ceiling','quarter'].some(k => q.has(k));
 const opening = !q.has('review') && (q.get('intro') === '1' || !selected);
 if (opening) {
  document.documentElement.classList.add('intro-active');
  document.documentElement.dataset.introState = 'loading';
 }
})();
