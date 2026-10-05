import {bedMattressEnabled,frontMattressEnabled,mattressIncluded} from './mattress-state.js?v=2';
import {vehicleSelectionComplete,newVehicleSpecification} from './new-vehicle.js?v=1';
import {retailerPriceLines} from './retailer-prices.js?v=20261005';
export function calculateReferencePrice(catalogue,state,region='jp') {
 const choices=new Map((catalogue?.items||[]).map(item=>[item.key,item])),items=[];
 const add=(key,quantity=1)=>{
  const item=choices.get(key);if(!item)return;
  const prefix=['床（必須）','天井','カラーパネル','壁面パネル（カラーパネル込み）'].includes(item.category)?item.category.replace('（必須）','')+' · ':'';
  const structure=item.construction?' · '+(item.construction==='plywood'?'プライウッド':'アルミ'):'';
  items.push({key,quantity,name:prefix+item.name+structure+(quantity>1?' × '+quantity:''),name_en:(item.name_en||item.name)+(quantity>1?' × '+quantity:''),...(item.includes?{includes:item.includes}:{})});
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
 return {type:'layout_summary',complete:selected(state.floor)===true,items};
}
export function calculateLayoutReference(catalogue,state,region='jp',dealer=null){
 const parts=calculateReferencePrice(catalogue,state,region);
 return {...parts,complete:parts.complete&&vehicleSelectionComplete(state),service_items:retailerPriceLines(state,parts.items,dealer),new_vehicle:newVehicleSpecification(state)};
}
export {createReferencePricing} from './pricing-presentation.js?v=20261005';
