// Only fixed choices enter analytics; never read forms, prices, receipts or shared URLs.
const steps={interior:'レイアウト',furniture:'レイアウト',equipment:'装備',electrical:'電装',vehicle:'車体',shipping:'配送',review:'確認'};
const colors=['beige','light-green','light-brown','dark-brown','black'];
const modules=['seat','i-seat','front-module','aluminum-front-kitchen','slide-bed','lounge-slide-bed','aluminum-bed','lounge-bed','two-side-bed','side-cabinet','simple-side-cabinet','active-side-cabinet','aluminum-side-cabinet'];
// [state field, step, item, permitted values]. No arbitrary state is copied or serialized.
const choices=[
 ['finish','furniture','furniture-finish',['birch','black']],
 ['floor','interior','interior-floor',['none','walnut','teak','oak','dark-canvas','light-canvas']],
 ['ceiling','interior','interior-ceiling',['none','white-ash','walnut','black-cherry']],
 ['wall','interior','interior-wall',['none','teffy','white','volcanic-gray']],
 ['panel','interior','interior-color-panels',['none','auto','teffy','white','volcanic-gray']],
 ['twiCeiling','interior','twi-ceiling',['none','clear','walnut']],
 ['quarterPanels','interior','quarter-panels',['none','left','right','both']],
 ['ac','equipment','aircon',['none','cube-air460b']],['heater','equipment','heater',['none','webasto']],
 ['insulation','equipment','insulation',['none','installed']],
 ['electrical','electrical','electrical',['none','standard']],
 ['batteryAh','electrical','battery',[100,200,300]],['inverterW','electrical','inverter',[0,1000,2000]],
 ['ceilingLights','equipment','ceiling-lights',[false,true]],['tailgateLights','equipment','tailgate-lights',[false,true]],
 ['twiBarLights','equipment','twi-bar-lights',[false,true]],['twiIndirectLights','equipment','twi-indirect-lights',[false,true]],
 ['floorSlide','furniture','floor-slide',[false,true]],
 ['bedMattress','furniture','bed-mattress',[false,true]],['frontMattress','furniture','front-mattress',[false,true]],
 ['bedMattressColor','furniture','bed-mattress-color',colors],['frontMattressColor','furniture','front-mattress-color',colors],
 ['iSeatColor','furniture','i-seat-color',colors],['iSeatPose','furniture','i-seat-pose',['forward','rearward','flat-front']],
 ['iSeatSlide','furniture','i-seat-slide',[-120,-100,-80,-60,-40,-20,0,20,40,60,80,100,120]],
 ['vehicle','vehicle','base-vehicle',['dx','super-gl']],['vehiclePurchase','vehicle','vehicle-purchase',['owned','new']],
 ['newVehicleGrade','vehicle','vehicle-grade',['dx','super-gl','dark-prime-ii']],
 ['newVehiclePowertrain','vehicle','vehicle-powertrain',['petrol-2wd','diesel-2wd','diesel-4wd']],
 ['vehicleSourcing','shipping','vehicle-sourcing',[false,true]],['shippingAgent','shipping','shipping-agent',[false,true]],
 ['sourcingFuel','shipping','sourcing-fuel',['petrol','diesel']],['sourcingDrive','shipping','sourcing-drive',['2wd','4wd']]
];
const optionKey=value=>value===true?'on':value===false?'off':String(value);
const allowed=new Map(choices.map(([,step,item,values])=>[item,{step,options:values.map(optionKey)}]));
for(const item of modules)allowed.set(item,{step:'furniture',options:['birch','black']});
const legacy=['studio_start','studio_complete_view','enquiry_open','enquiry_sent','spec_pdf_download','photo_save','share_url'];
export function studioEvent(name,choice){
 try {
  const local=['127.0.0.1','localhost','[::1]'].includes(location.hostname);
  const debug=local&&window.__hexaAnalyticsDebug===true;
  if((location.hostname!=='hexamodules.com'&&!debug)||/(^|\/)private(\/|$)/i.test(decodeURIComponent(location.pathname)))return;
  if(!document.querySelector('#studio-opening'))return;
  const vehicle=document.querySelector('[data-base-vehicle][aria-pressed="true"]')?.dataset.baseVehicle;
  const lang=document.documentElement.lang==='en'?'en':'ja';
  let params={vehicle:vehicle==='super-gl'?'hiace-super-gl':vehicle==='dx'?'hiace-dx':'hiace'};
  if(legacy.includes(name))params.language=lang;
  else if(name==='studio_step'){
   if(!['interior','equipment','electrical','vehicle','review'].includes(choice?.step))return;
   params.step=steps[choice.step];
  }else if(['studio_select','studio_deselect'].includes(name)){
   const rule=allowed.get(choice?.item);
   if(!rule||rule.step!==choice.step||!rule.options.includes(choice.option))return;
   Object.assign(params,{step:steps[choice.step],item:choice.item,option:choice.option,lang});
  }else return;
  // Explicit test opt-in on loopback only. Never forwards a local event to gtag.
  if(debug){console.info('[studio analytics]',name,params);return;}
  if(typeof window.gtag==='function')window.gtag('event',name,params);
 } catch { /* Analytics must never interrupt the studio. */ }
}
let previous=null;
export function trackStudioSelection(state,{silent=false}={}){
 try{
  const next=new Map();
  for(const [field,step,item,values] of choices){
   if(!values.includes(state[field]))continue;
   if(['batteryAh','inverterW'].includes(field)&&state.electrical!=='standard')continue;
   if(field.startsWith('iSeat')&&state.front!=='i-seat')continue;
   if(field==='bedMattressColor'&&!state.bedMattress&&state.bed!=='two-side-bed')continue;
   if(field==='frontMattressColor'&&!state.frontMattress)continue;
   if(field.startsWith('twi')&&field!=='twiCeiling'&&(!state.twiCeiling||state.twiCeiling==='none'))continue;
   next.set(field,{step,item,option:optionKey(state[field])});
  }
  for(const slot of ['front','bed','cab'])if(modules.includes(state[slot])&&['birch','black'].includes(state.finish))next.set(slot,{step:'furniture',item:state[slot],option:state.finish});
  const old=previous;previous=next;
  if(!old||silent||document.documentElement.classList.contains('intro-active'))return;
  const absent=c=>!c||['none','off'].includes(c.option);
  for(const key of new Set([...old.keys(),...next.keys()])){
   const before=old.get(key),after=next.get(key);
   if(before?.item===after?.item&&before?.option===after?.option)continue;
   if(!absent(before)&& (absent(after)||before.item!==after.item))studioEvent('studio_deselect',before);
   if(!absent(after))studioEvent('studio_select',after);
  }
 }catch{/* Recording must not affect configuration. */}
}
let previousStep;
export function trackStudioStep(step){
 try{
  if(!Object.hasOwn(steps,step)||document.documentElement.classList.contains('intro-active'))return;
  if(step===previousStep)return;
  previousStep=step;studioEvent('studio_step',{step});
 }catch{/* Recording must not affect navigation. */}
}
