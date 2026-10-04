import {lightingCutoutSummary} from './lighting-cutouts.js?v=1';
import {bedMattressEnabled,frontMattressEnabled,mattressIncluded} from './mattress-state.js?v=2';
import {selectedNewVehicle,newVehicleSpecification,newVehiclePriceNote,vehicleSelectionComplete} from './new-vehicle.js?v=1';
import {retailerPriceLines,RETAILER_PRICE_REVISION} from './retailer-prices.js?v=2';
// Domestic reference prices use integer JPY. Display poses and material colours
// must never change the price of a configuration.
export function convertToAud(amountJpy, catalogue) {
 const fx=catalogue?.exchange_rate;
 if(!fx || !Number.isFinite(fx.jpy_per_aud) || fx.jpy_per_aud<=0)throw Error('AUD exchange rate unavailable');
 return Math.round(amountJpy / fx.jpy_per_aud / 100) * 100;
}
export function calculateReferencePrice(catalogue, state, region = 'jp') {
 if (!catalogue) return null;
 const australia=region==='au',currency=australia?'AUD':'JPY';
 const prices = new Map(catalogue.items.map(item => [item.key, item]));
 const items = [];
 const add = (key,quantity=1) => {
  let item = prices.get(key);
  if(state.vehicle==='super-gl'){const gl=catalogue.super_gl_catalogue?.find(r=>key===r.key||(r.key.endsWith(':')&&key.startsWith(r.key)));if(gl)item={...item,price_jpy:gl.price_jpy/(key==='twi-quarter'?2:1)};}
  if (!item || !Number.isSafeInteger(item.price_jpy) || item.price_jpy < 0) throw Error(`Price unavailable: ${key}`);
  const prefix = ['床（必須）','天井','カラーパネル','壁面パネル（カラーパネル込み）'].includes(item.category) ? item.category.replace('（必須）','') + ' · ' : '';
  const structure = item.construction ? ' · ' + (item.construction === 'plywood' ? 'プライウッド' : 'アルミ') : '';
  items.push({key, quantity, name:prefix + item.name + structure + (quantity>1?' × '+quantity:''), name_en:item.name_en + (quantity>1?' × '+quantity:''), amount:(australia?convertToAud(item.price_jpy,catalogue):item.price_jpy)*quantity, amount_jpy:item.price_jpy*quantity, ...(item.includes ? {includes:item.includes} : {})});
 };
 const selected = value => value && value !== 'none';
 if (selected(state.floor)) add('floor:' + state.floor);
 if (state.vehicle==='super-gl') {
  if(['clear','walnut'].includes(state.twiCeiling))add('twi-ceiling:'+state.twiCeiling);
  const count=state.quarterPanels==='both'?2:['left','right'].includes(state.quarterPanels)?1:0;if(count)add('twi-quarter',count);
 } else if (selected(state.ceiling)) add('ceiling:' + state.ceiling);
 // A wall package already includes matching colour panels.
 if (state.vehicle!=='super-gl' && selected(state.wall)) add('wall:' + state.wall);
 else if (state.vehicle!=='super-gl' && selected(state.panel) && state.panel !== 'auto') add('panel:' + state.panel);
 for (const key of [state.front, state.bed, state.cab]) if (selected(key) && !['seat','i-seat'].includes(key)) add('module:' + key);
 if(bedMattressEnabled(state)&&!mattressIncluded(state))add('mattress:bed');
 if(frontMattressEnabled(state))add('mattress:front');
 if (state.bed === 'two-side-bed' && state.floorSlide === true) add('two-side-bed:floor-slide');
 // Standalone lighting, insulation work and dealer equipment are requests only.
 // Keep standard-included components (e.g. TWI lighting) in their parent item.
 return {currency, tax_inclusive:australia?null:true, source_tax_inclusive:true, region, type:'manufacturer_reference_retail', catalogue_revision:catalogue.revision,
  ...(australia?{exchange_rate:catalogue.exchange_rate,tax_basis:'conversion_of_japan_tax_inclusive_reference_prices'}:{}),
  complete:selected(state.floor) === true, items, total:items.reduce((sum,item)=>sum+item.amount,0), total_jpy:items.reduce((sum,item) => sum + item.amount_jpy, 0),
  formal_quote_issuer:'dealer', included_scope:'assembled_furniture_modules_and_interior_parts',module_delivery:'assembled',furniture_assembly_included:true,direct_consumer_supply_only_sales:false,wholesale_prices_included:false,installation_included:true,vehicle_installation_included:true,dealer_options_priced_separately:true,excludes:[...(state.front==='i-seat'?['workvox_i_seat_and_fitting']:[]),'vehicle_installation_and_labour','base_vehicle','external_agent_fees','shipping_and_registration','electrical_system','air_conditioning','ff_heater','standalone_ceiling_lights','tailgate_lights','insulation_installation']};
}

export function calculateLayoutReference(catalogue,state,region='jp',dealer=null){
 const parts=calculateReferencePrice(catalogue,state,region);if(!parts)return null;
 const vehicle=selectedNewVehicle(state),requested=state.vehiclePurchase==='new',ready=vehicleSelectionComplete(state);
 const vehicleJpy=vehicle?.price_jpy||0,vehicleAmount=region==='au'?convertToAud(vehicleJpy,catalogue):vehicleJpy;
 const services=retailerPriceLines(state,parts.items,dealer).map(item=>({...item,amount:item.unit_price_jpy===null?null:(region==='au'?convertToAud(item.unit_price_jpy,catalogue):item.unit_price_jpy)*item.quantity}));
 const unpriced=services.filter(i=>i.amount===null).map(i=>({key:i.key,name:i.name,name_en:i.name_en,kind:i.kind}));
 if(state.front==='i-seat'&&!services.some(i=>i.key==='i-seat'))unpriced.push({key:'i-seat',name:'i seat 本体・取付',name_en:'i seat and fitting',kind:'external_seat'});
 const sum=(kind,field)=>services.filter(i=>i.kind===kind&&i[field]!==null).reduce((n,i)=>n+i[field],0);
 const labour=sum('installation','amount'),labourJpy=sum('installation','amount_jpy'),equipment=sum('equipment','amount'),equipmentJpy=sum('equipment','amount_jpy');
 const fitout=parts.total+labour+equipment,fitoutJpy=parts.total_jpy+labourJpy+equipmentJpy;
 return {...parts,type:'layout_reference_price',complete:parts.complete&&ready,parts_complete:parts.complete,
  vehicle_selection_complete:ready,vehicle_included:requested,
  pricing_complete:unpriced.length===0,unpriced_items:unpriced,service_items:services,service_price_revision:RETAILER_PRICE_REVISION,
  retailer_price_profile:dealer?.id||null,
  fitout_parts_total:parts.total,fitout_parts_total_jpy:parts.total_jpy,
  installation_total:labour,installation_total_jpy:labourJpy,dealer_options_total:equipment,dealer_options_total_jpy:equipmentJpy,
  fitout_total:fitout,fitout_total_jpy:fitoutJpy,
  new_vehicle_total:ready?vehicleAmount:null,new_vehicle_total_jpy:ready?vehicleJpy:null,
  total:ready?fitout+vehicleAmount:null,total_jpy:ready?fitoutJpy+vehicleJpy:null,
  total_basis:unpriced.length?'known_prices_subtotal':'complete_reference_total',
  new_vehicle:newVehicleSpecification(state),
  included_scope:'assembled_furniture_interior_parts_and_priced_selected_services'+(requested?'_and_new_vehicle':''),
  installation_included:!unpriced.some(i=>i.kind==='installation'),vehicle_installation_included:!unpriced.some(i=>i.kind==='installation'),dealer_options_priced_separately:false,
  excludes:[...(!requested?['base_vehicle']:[]),'external_agent_fees','shipping',...unpriced.map(i=>i.key),...(requested?['manufacturer_options','registration_and_other_fees','insurance','taxes_other_than_consumption_tax','recycling_fee']:[])]};
}

export {createReferencePricing} from './pricing-presentation.js?v=20261004';
