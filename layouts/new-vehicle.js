// Supplied Toyota Mobility Tokyo price list, February 2026, pages 1, 3 and 4.
// Only standard/narrow body, standard roof, standard floor, five-door vans.
// DX: 3/6 seats only. Prices include consumption tax, not options or fees.
export const NEW_VEHICLE_SOURCE={title:'ハイエースバン新車価格表',issuer:'トヨタモビリティ東京株式会社',date:'2026-02',revision:'2026-02-narrow-5door-v1'};
export const VEHICLE_GRADES={dx:{ja:'DX',en:'DX',seats:'3/6'},'super-gl':{ja:'スーパーGL',en:'Super GL',seats:'2/5'},'dark-prime-ii':{ja:'スーパーGL DARK PRIME II',en:'Super GL DARK PRIME II',seats:'2/5'}};
export const VEHICLE_POWERTRAINS={
 'petrol-2wd':{ja:'ガソリン 2WD',en:'Petrol 2WD',fuel:'petrol',drivetrain:'2wd',engine_cc:2000},
 'diesel-2wd':{ja:'ディーゼル 2WD',en:'Diesel 2WD',fuel:'diesel',drivetrain:'2wd',engine_cc:2800},
 'diesel-4wd':{ja:'ディーゼル 4WD',en:'Diesel 4WD',fuel:'diesel',drivetrain:'4wd',engine_cc:2800}
};
export const NEW_VEHICLES=[
 ['dx','petrol-2wd','3BF-TRH200V-SRTDK',2970000,1],
 ['dx','diesel-2wd','3DF-GDH201V-SRTDY',3569500,3],
 ['dx','diesel-4wd','3DF-GDH206V-SRTDY',3873100,4],
 ['super-gl','petrol-2wd','3BF-TRH200V-SRTEK',3578300,1],
 ['super-gl','diesel-2wd','3DF-GDH201V-SRTEY',4187700,3],
 ['super-gl','diesel-4wd','3DF-GDH206V-SRTEY',4489100,4],
 ['dark-prime-ii','petrol-2wd','3BF-TRH200V-SRTEK-P',3774100,1],
 ['dark-prime-ii','diesel-2wd','3DF-GDH201V-SRTEY-P',4382400,3],
 ['dark-prime-ii','diesel-4wd','3DF-GDH206V-SRTEY-P',4683800,4]
].map(([grade,powertrain,model_code,price_jpy,source_page])=>({grade,powertrain,model_code,price_jpy,source_page}));
export function normalizeNewVehicle(s){
 const purchase=s.vehiclePurchase==='new'?'new':'owned';
 const grades=s.vehicle==='super-gl'?['super-gl','dark-prime-ii']:['dx'];
 return {...s,vehiclePurchase:purchase,
  newVehicleGrade:purchase==='new'?(grades.includes(s.newVehicleGrade)?s.newVehicleGrade:grades[0]):null,
  newVehiclePowertrain:purchase==='new'&&Object.hasOwn(VEHICLE_POWERTRAINS,s.newVehiclePowertrain)?s.newVehiclePowertrain:null};
}
export function selectedNewVehicle(s){
 const value=normalizeNewVehicle(s);
 return value.vehiclePurchase==='new'?NEW_VEHICLES.find(v=>v.grade===value.newVehicleGrade&&v.powertrain===value.newVehiclePowertrain)||null:null;
}
export const vehicleSelectionComplete=s=>s.vehiclePurchase!=='new'||Boolean(selectedNewVehicle(s));
export function addNewVehicleParams(q,s){
 const v=normalizeNewVehicle(s);
 for(const key of ['vehicle_purchase','new_vehicle_grade','new_vehicle_powertrain'])q.delete(key);
 if(v.vehiclePurchase==='new'){
  q.set('vehicle_purchase','new');q.set('new_vehicle_grade',v.newVehicleGrade);
  if(v.newVehiclePowertrain)q.set('new_vehicle_powertrain',v.newVehiclePowertrain);
 }
}
export function newVehicleSpecification(s){
 const v=selectedNewVehicle(s);
 if(s.vehiclePurchase!=='new')return {source:'owned',included_in_reference:false};
 return {source:'new',included_in_reference:Boolean(v),selection_complete:Boolean(v),
  ...(v?{...v,...VEHICLE_POWERTRAINS[v.powertrain],body:'narrow',roof:'standard',floor:'standard',doors:5,seats:VEHICLE_GRADES[v.grade].seats,transmission:'6AT',tax_inclusive:true,price_source:NEW_VEHICLE_SOURCE}:{}),
  excludes:['manufacturer_options','registration_and_other_fees','insurance','taxes_other_than_consumption_tax','recycling_fee']};
}
export function newVehicleSummary(s,language='ja'){
 const en=language==='en',lang=en?'en':'ja';
 if(s.vehiclePurchase!=='new')return en?'Vehicle excluded · Owner-supplied vehicle':'車体なし（持ち込み）';
 const state=normalizeNewVehicle(s),v=selectedNewVehicle(state);
 return (en?'New vehicle · ':'新車込み · ')+VEHICLE_GRADES[state.newVehicleGrade][lang]+' · '+(v?VEHICLE_POWERTRAINS[v.powertrain][lang]:(en?'Select fuel / drivetrain':'燃料・駆動方式を選択してください'));
}
export const newVehiclePriceNote=(language='ja')=>language==='en'
 ? 'New-vehicle prices are based on the February 2026 Japanese price list, including consumption tax. Manufacturer options, registration and other fees, insurance, other taxes and recycling fees are excluded. Your dealer will confirm the final price.'
 : '新車は2026年2月の価格表に基づく税込参考価格です。メーカーオプション・登録諸費用・保険料・税金（消費税を除く）・リサイクル料金は含みません。正式な価格は取扱店よりご案内します。';
