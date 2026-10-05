import {createVisualMaterials} from './visual-materials.js?v=2';
import {initLayoutRecall} from './saved-layouts.js?v=1';
import {initRetailerSimulation} from './retailer-simulation.js?v=1';
import {normalizeNewVehicle,addNewVehicleParams,newVehicleSpecification,vehicleSelectionComplete} from './new-vehicle.js?v=1';
import {createNewVehicleControls} from './new-vehicle-controls.js?v=1';
import {normalizeISeat,iSeatSpecification,I_SEAT_MOUNT,iSeatInstallationNote} from './i-seat-state.js?v=6';
import {createISeatControls,createISeatVisuals} from './i-seat.js?v=6';
import {lightingCutoutSpecification,lightingCutoutSummary} from './lighting-cutouts.js?v=1';
import {dealerContext,dealerParams,dealerSummary,initDealerBranding} from './dealer-context.js?v=20261005';
import {selectedDealer} from './dealer-preview.js?v=20261005-procurement';
import {dealerOptionAvailability,normalizeDealerOptionState,dealerOptionSummary,dealerOptionExport} from './dealer-option-policy.js?v=20261005';
import {createDealerOptionsUI} from './dealer-options-ui.js?v=4';
import {createCountertopVisuals} from './countertops.js?v=1';
import {createTwiLightingControls} from './twi-lighting-controls.js?v=1';
import {isSuperGL,twiCeilingEnabled,quarterCount,vehicleName,vehicleNameEnglish,twiCeilingLabel,quarterLabel,normalizeBaseVehicle,installBaseVehicleControls} from './base-vehicle.js?v=7';
import {TWI_KEYS,createTwiVisuals} from './twi-interior.js?v=6';
import {createReferencePricing} from './reference-pricing.js?v=20261005-mobile-fix';
import {normalizeMattresses,mattressSpecification,bedMattressEnabled,frontMattressEnabled} from './mattress-state.js?v=2';
import {createMattressControls,createMattressVisuals} from './mattresses.js?v=7';
import {normalizeRegistration,registrationDetails,registrationRows,registrationLocationLabel,createRegistrationDestination} from './registration-destination.js?v=2';
import {initStudio,updateStudio,updateReviewIndicator,updateFloorRequirement} from './studio.js?v=flow-26';
import {initLanguage,getLanguage,getStudioLocation} from './language.js?v=20261005';
import {createModuleDetails} from './module-details.js?v=5';
import {constructionBadge} from './construction-badge.js?v=1';
import {createOutro} from './outro.js?v=20261005-controls';
import {createOpening} from './opening.js?v=recall-27a';
import {openingCamera} from './opening-camera.js?v=closeup-24a';
import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
(async()=>{
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const reviewMode=false; // Production capture tools are unavailable on this static site.
if(initDealerBranding({getLanguage,getLocation:getStudioLocation})===false)return;
const dealerOptions=dealerOptionAvailability(selectedDealer());
const priceCatalogue=await fetch('assets/reference-prices.json?v=20261005-enquiry').then(r=>{if(!r.ok)throw Error('Reference price catalogue unavailable');return r.json()}).catch(error=>{console.error(error);return null});
const M=await fetch('../modules.json?v=cabinet-names-1').then(r=>r.json());
const modules=Object.fromEntries(M.map(m=>[m.id,m]));
modules['i-seat']={id:'i-seat',name:'i seat',en:'i seat',selection_description:'1,400mm'};
const verification=await fetch('fit-report.json?v=front-fit-6').then(r=>r.json());
const wallVerification=await fetch('interior-wall-fit.json?v=wall-1').then(r=>r.json());
const WALL={key:'interior-wall-white',value:'white',name:'ホワイト壁面',pitch_mm:100,thickness_mm:6.5,side:'リア運転席側',revision:'driver-wall-floor-pitch100-v1'};
const wallPalette=await fetch('assets/wall-finishes.json?v=soft-white-2').then(r=>r.json());
const WALL_COLORS=Object.fromEntries(wallPalette.colors.map(c=>[c.value,c]));
const wallEnabled=(s=state)=>Object.hasOwn(WALL_COLORS,s.wall);
const PANEL={key:'interior-color-panels',name:'カラーパネル',count:3,thickness_mm:6.5,grooves:false,revision:'window-color-panels-v3',tailgate_curved:true,light_openings:{count:2,diameter_mm:60,pitch_mm:680,below_center_mm:50}};
const TAILGATE='vehicle-tailgate';
const SLIDING_DOOR='vehicle-sliding-door';
const FRONT_DOOR='vehicle-front-passenger-door',BODY_COMPLETION='vehicle-body-completion';
const AIRCON={key:'aircon-cube-air460b',value:'cube-air460b',label:'CUBE AIR460B',with_cover_size_mm:[600,160,320],revision:'air460b-illustrative-position-v1'};
const airconEnabled=(s=state)=>s.ac===AIRCON.value;
const HEATER={value:'webasto',label:'ベバスト FFヒーター',brand:'Webasto',display:'selection-indicator'};
const heaterEnabled=(s=state)=>s.heater===HEATER.value;
const INSULATION={value:'installed',label:'断熱施工',display:'selection-indicator'};
const insulationEnabled=(s=state)=>s.insulation===INSULATION.value;
const electricalEnabled=(s=state)=>s.electrical==='standard';
const parseElectrical=q=>{
 const enabled=q.get('electrical')==='standard';
 return {electrical:enabled?'standard':'none',batteryAh:enabled&&[100,200,300].includes(Number(q.get('battery')))?Number(q.get('battery')):100,inverterW:enabled&&[1000,2000].includes(Number(q.get('inverter')))?Number(q.get('inverter')):0};
};
const electricalSystem=(s=state)=>electricalEnabled(s)?{type:'dealer_option_enquiry',illustration_only:true,package:'standard',drive_charger_a:40,external_charger_a:40,battery:{type:'lithium-ion',capacity_ah:s.batteryAh},inverter_w:s.inverterW||null}:null;
const electricalLabel=(s=state)=>electricalEnabled(s)?`参考構成 · 走行充電40A · 外部充電40A · リチウムイオン${s.batteryAh}Ah${s.inverterW?' · インバーター'+s.inverterW+'W':''}`:'なし';

const LIGHTS={ceilingLights:{key:'ceiling-lights',label:'天井ダウンライト',count:6},tailgateLights:{key:'tailgate-lights',label:'バックドアライト',count:2}};
const lightingLabel=(s=state)=>[twiCeilingEnabled(s)?'TWI天井付属照明':null,...Object.entries(LIGHTS).filter(([flag])=>s[flag]).map(([,v])=>`${v.label} ${v.count}灯`)].filter(Boolean).join('＋')||'なし';
const lightsAvailable=(s=state)=>twiCeilingEnabled(s)||s.ceilingLights||s.tailgateLights;
const panelEnabled=(s=state)=>wallEnabled(s)||Object.hasOwn(WALL_COLORS,s.panel);
const panelColor=(s=state)=>wallEnabled(s)?s.wall:Object.hasOwn(WALL_COLORS,s.panel)?s.panel:lastPanelColor;
const CEILING={key:'interior-ceiling-oak',name:'天然木突板天井',material:'天然木突板',length_mm:2731.422,width_mm:1259,thickness_mm:6.5,rows:15,light_openings:6,revision:'curved-veneer-ceiling-v2'};
const ceilingPalette=await fetch('assets/ceiling-finishes.json?v=veneer-1').then(r=>r.json());
const CEILING_COLORS=Object.fromEntries(ceilingPalette.colors.map(c=>[c.value,c]));
const ceilingEnabled=(s=state)=>Object.hasOwn(CEILING_COLORS,s.ceiling);
const normalizeCeiling=value=>Object.hasOwn(CEILING_COLORS,value)?value:(Object.hasOwn(ceilingPalette.legacy_values,value)?ceilingPalette.legacy_values[value]:'none');
const FLOOR={key:'interior-floor-oak-filled',name:'床仕上げ',revision:'five-finishes-passenger-infill-v3',step:'黒い樹脂ステップ',new_board:false,passenger_wheelhouse_cutout:'covered',passenger_edge_x_mm:760};
const floorPalette=await fetch('assets/floor-finishes.json?v=floor-five-3').then(r=>r.json());
const FLOOR_COLORS=Object.fromEntries(floorPalette.colors.map(c=>[c.value,c]));
const floorEnabled=(s=state)=>Object.hasOwn(FLOOR_COLORS,s.floor);
const hasInterior=(s=state)=>twiCeilingEnabled(s)||quarterCount(s)>0||wallEnabled(s)||panelEnabled(s)||ceilingEnabled(s)||floorEnabled(s)||airconEnabled(s);
const wallChoice=(s=state)=>wallEnabled(s)?'wall':panelEnabled(s)?'panel':'none';
const interiorLabel=(s=state)=>[twiCeilingEnabled(s)?twiCeilingLabel(s):null,quarterCount(s)?quarterLabel(s):null,wallEnabled(s)?WALL_COLORS[s.wall].name:null,panelEnabled(s)?WALL_COLORS[panelColor(s)].label+' カラーパネル':null,ceilingEnabled(s)?CEILING_COLORS[s.ceiling].name:null,floorEnabled(s)?FLOOR_COLORS[s.floor].name:null].filter(Boolean).join('＋')||'なし';
const offsets={...verification.offsets_mm,'i-seat':[...I_SEAT_MOUNT.position_mm]};
const reportFor=(s=state)=>verification.patterns.find(p=>p.front===s.front&&p.bed===s.bed&&p.cab===s.cab);
// Rear placements are independent of an absent front module. Reuse the seat-base
// rear geometry; do not claim that the empty-front configuration has a fit report.
const placementReportFor=(s=state)=>reportFor(s)||(['none','i-seat'].includes(s.front)?reportFor({...s,front:'seat'}):undefined);
let showChecks=false;
const FRONT=['seat','i-seat','front-module','aluminum-front-kitchen'];
const FULL=['lounge-bed','two-side-bed'];
const SINGLE=['slide-bed','lounge-slide-bed','aluminum-bed'];
const CAB=['side-cabinet','aluminum-side-cabinet','simple-side-cabinet','active-side-cabinet'];
const shortNames={'seat':'セカンドシート'};
const name=k=>k==='i-seat'?'i seat':shortNames[k]||modules[k]?.name||'なし';
const rearVariants=[...FULL.map(b=>({bed:b,cab:'none'})),...SINGLE.flatMap(b=>['none',...CAB].map(c=>({bed:b,cab:c})))];
const patterns=FRONT.flatMap((front,f)=>rearVariants.map((p,i)=>({...p,front,id:`${f+1}-${String(i+1).padStart(2,'0')}`})));
const shippingForAustralia=()=>getStudioLocation().id==='au';
const SOURCING_FUELS={petrol:'ガソリン',diesel:'ディーゼル'};
const SOURCING_DRIVES={'2wd':'2WD','4wd':'4WD'};
const VEHICLE_BUDGETS=[15000,20000,25000,30000,35000,40000];
const normalizeShipping=s=>{
 const on=shippingForAustralia()&&s.vehicleSourcing===true;
 return {...s,...normalizeRegistration(s,shippingForAustralia()&&s.shippingAgent===true),vehicleSourcing:on,shippingAgent:shippingForAustralia()&&s.shippingAgent===true,
  sourcingFuel:on&&Object.hasOwn(SOURCING_FUELS,s.sourcingFuel)?s.sourcingFuel:null,
  sourcingDrive:on&&Object.hasOwn(SOURCING_DRIVES,s.sourcingDrive)?s.sourcingDrive:null,
  sourcingBudget:on&&VEHICLE_BUDGETS.includes(s.sourcingBudget)?s.sourcingBudget:null};
};
const vehiclePreferences=(s=state)=>shippingForAustralia()&&s.vehicleSourcing?{fuel:s.sourcingFuel,drivetrain:s.sourcingDrive,vehicle_budget:{amount:s.sourcingBudget,currency:'AUD',scope:'vehicle_only'}}:null;
const shippingSupport=(s=state)=>shippingForAustralia()?{type:'external_agent_referral',vehicle_sourcing_referral_requested:s.vehicleSourcing===true,shipping_registration_referral_requested:s.shippingAgent===true,vehicle_preferences:vehiclePreferences(s),registration_destination:registrationDetails(s,s.shippingAgent===true)}:null;
const parseState=()=>{const q=new URLSearchParams(location.search);let bed=[...FULL,...SINGLE].includes(q.get('bed'))?q.get('bed'):'none';const value=normalizeDealerOptionState({vehiclePurchase:q.get('vehicle_purchase'),newVehicleGrade:q.get('new_vehicle_grade'),newVehiclePowertrain:q.get('new_vehicle_powertrain'),iSeatSlide:q.get('i_seat_slide'),iSeatPose:q.get('i_seat_pose'),iSeatColor:q.get('i_seat_color'),iSeatMatchMattress:q.get('i_seat_match')==='1',bedMattressColor:q.get('bed_mattress_color'),frontMattressColor:q.get('front_mattress_color'),bedMattress:q.get('bed_mattress')==='1',frontMattress:q.get('front_mattress')==='1',vehicle:q.get('vehicle')==='super-gl'?'super-gl':'dx',twiCeiling:q.get('twi_ceiling')||'none',twiBarLights:q.get('twi_bar')!=='0',twiIndirectLights:q.get('twi_indirect')!=='0',quarterPanels:q.get('quarter')||'none',floorSlide:bed==='two-side-bed'&&q.get('floor_slide')==='1',...parseElectrical(q),registrationState:q.get('registration_state'),registrationPostcode:q.get('postcode')||'',registrationLocality:q.get('locality'),sourcingFuel:q.get('sourcing_fuel'),sourcingDrive:q.get('sourcing_drive'),sourcingBudget:Number(q.get('vehicle_budget')),vehicleSourcing:shippingForAustralia()&&q.get('sourcing')==='1',shippingAgent:shippingForAustralia()&&q.get('shipping')==='1',insulation:q.get('insulation')===INSULATION.value?INSULATION.value:'none',heater:q.get('heater')===HEATER.value?HEATER.value:'none',ac:q.get('ac')===AIRCON.value?AIRCON.value:'none',ceilingLights:q.get('ceiling_lights')==='1',tailgateLights:q.get('tailgate_lights')==='1',night:q.get('night')==='1',front:FRONT.includes(q.get('front'))?q.get('front'):'none',bed,cab:SINGLE.includes(bed)&&CAB.includes(q.get('cab'))?q.get('cab'):'none',finish:q.get('finish')==='black'?'black':'birch',wall:Object.hasOwn(WALL_COLORS,q.get('wall'))?q.get('wall'):'none',panel:Object.hasOwn(WALL_COLORS,q.get('wall'))?'auto':Object.hasOwn(WALL_COLORS,q.get('panel'))?q.get('panel'):'none',ceiling:normalizeCeiling(q.get('ceiling')),floor:Object.hasOwn(FLOOR_COLORS,q.get('floor'))?q.get('floor'):'none',expanded:q.get('expanded')==='1',frontExpanded:q.get('front_expanded')==='1',rearExpanded:q.get('rear_expanded')==='1',storage:q.get('storage')==='1',flat:q.get('flat')==='1'},dealerOptions);if(value.ceilingLights&&value.ceiling==='none')value.ceiling=ceilingPalette.default;if(value.tailgateLights&&!isSuperGL(value)&&value.panel==='none')value.panel='teffy';if(airconEnabled(value)&&!isSuperGL(value)){if(!wallEnabled(value))value.wall='white';value.panel='auto'}return normalizeNewVehicle(normalizeISeat(normalizeMattresses(normalizeBaseVehicle(normalizeShipping(value)))))};
let needsFrame=true;
// Home matches the owner's elevated side view; keep the named side preset available.
const DEFAULT_VIEW='home';
const HOME_VIEW=[[5623.4738,3949.366,-1146.7141],[0,350,2100]];
let state=parseState(),rearType=FULL.includes(state.bed)?'full':'single',activeView=DEFAULT_VIEW,renderVersion=0,batchRunning=false;
const dealerOptionsUI=createDealerOptionsUI({available:dealerOptions,getState:()=>state,getLanguage});
let lastWallColor=wallEnabled()?state.wall:'white';
let lastPanelColor=Object.hasOwn(WALL_COLORS,state.panel)?state.panel:wallEnabled()?state.wall:'teffy';
let lastCeilingColor=ceilingEnabled()?state.ceiling:ceilingPalette.default;
let lastFloorColor=floorEnabled()?state.floor:floorPalette.default;
const registrationDestination=createRegistrationDestination({getState:()=>state,isEnabled:()=>shippingForAustralia()&&state.shippingAgent,onChange:changeRegistration,onRefresh:()=>shippingUI()});
const scene=new THREE.Scene();scene.background=new THREE.Color('#f1f0e9');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setClearColor('#f1f0e9');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('#viewport').append(renderer.domElement);
const visualMaterials=createVisualMaterials(renderer,scene);
const camera=new THREE.PerspectiveCamera(39,1,10,30000);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.12;controls.minDistance=450;controls.maxDistance=12000;controls.maxPolarAngle=THREE.MathUtils.degToRad(110);controls.addEventListener('change',()=>{
 needsFrame=true;
 // Publish only the currently visible camera so a chosen view can be reused accurately.
 $('#viewport').dataset.cameraView=JSON.stringify({eye:camera.position.toArray(),target:controls.target.toArray(),up:camera.up.toArray(),fov:camera.fov,viewport:[renderer.domElement.clientWidth,renderer.domElement.clientHeight]});
});
const ambient=new THREE.HemisphereLight(0xffffff,0x9a9687,.9);scene.add(ambient);const sun=new THREE.DirectionalLight(0xfff7e6,2.1);sun.position.set(-3200,7000,-3000);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-3300,right:3300,top:3300,bottom:-3300,near:100,far:14000});sun.shadow.bias=-.0003;sun.shadow.normalBias=1;scene.add(sun);const fill=new THREE.DirectionalLight(0xd7e2ec,.6);fill.position.set(3000,2500,5000);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(20000,20000),new THREE.ShadowMaterial({color:0x4a4941,opacity:.18}));floor.rotation.x=-Math.PI/2;floor.position.y=-588;floor.receiveShadow=true;scene.add(floor);
const dayGround=floor.material,nightGround=new THREE.MeshStandardMaterial({color:0x77716a,roughness:1,metalness:0});
const grid=new THREE.GridHelper(7200,36,0xd1d1c5,0xe0e0d5);grid.position.set(0,-587,2000);grid.material.transparent=true;grid.material.opacity=.15;scene.add(grid);
const {createAssetLoader}=await import('./lightweight-loader.js?v=20261004');
const assetLoader=createAssetLoader();
const wood=await new THREE.TextureLoader().loadAsync(assetLoader.textureURL('assets/wood-grain.jpg'));wood.colorSpace=THREE.SRGBColorSpace;wood.wrapS=wood.wrapT=THREE.RepeatWrapping;wood.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
// Fine moulded-resin grain for the original step; units in the asset are mm.
const resinNoise=new Uint8Array(128*128*4);let noiseSeed=173;for(let i=0;i<resinNoise.length;i+=4){noiseSeed=(Math.imul(noiseSeed,1664525)+1013904223)>>>0;const v=110+(noiseSeed>>>25);resinNoise.set([v,v,v,255],i)}
const resinBump=new THREE.DataTexture(resinNoise,128,128);resinBump.wrapS=resinBump.wrapT=THREE.RepeatWrapping;resinBump.magFilter=THREE.LinearFilter;resinBump.minFilter=THREE.LinearMipmapLinearFilter;resinBump.generateMipmaps=true;resinBump.needsUpdate=true;
const ceilingTextures=Object.fromEntries(await Promise.all(ceilingPalette.colors.map(async c=>{
 c.image=assetLoader.textureURL(c.image);
 const texture=await new THREE.TextureLoader().loadAsync(c.image);
 texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.ClampToEdgeWrapping;
 texture.wrapT=THREE.MirroredRepeatWrapping;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 return [c.value,texture];
})));
const floorTextures=Object.fromEntries(await Promise.all(floorPalette.colors.map(async c=>{
 c.image=assetLoader.textureURL(c.image);
 const texture=await new THREE.TextureLoader().loadAsync(c.image);
 texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
 texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return [c.value,texture];
})));
const floorSurfaces=[],floorMaterials=[];
const lightRigs=new Map(),lightDiffusers=[],lightTrims=[],daySurfaceMaterials=[];
const isLight=key=>Object.values(LIGHTS).some(v=>v.key===key);
const ceilingPanels=[],colorPanels=[],panelSurfaces=[];
const cache=new Map();const swappable=[];const ceilingMaterials=[];const wallPanels=[];const wallSurfaces=[];
const twiWindow=await fetch('assets/twi-quarter-window.json?v=1').then(r=>r.json());
const twiVisuals=createTwiVisuals({ceilingTextures,ceilingFinishes:CEILING_COLORS,windowSurface:twiWindow,scene});
const mattressVisuals=createMattressVisuals({renderer,onTextureReady:()=>{needsFrame=true}});
const iSeatVisuals=createISeatVisuals({renderer,onTextureReady:()=>{needsFrame=true}});
const countertopVisuals=await createCountertopVisuals({renderer});
let activeAirconMount=null;
function materialFor(info,key){const n=info.name,l=n.toLowerCase(),col=info.colors||{};let rgb=col.opaque_albedo||col.metal_f0||col.transparent_color||[148,151,146];let woodKind=/birch|oak|オーク材|wood grain|birch edge/.test(l),switchable=/SKY HEXA plywood|HEXA lightweight - charcoal/.test(n);let edge=/cut edge|birch edge/.test(l);let metal=Boolean(col.metal_f0),isVehicle=key==='vehicle'||key===TAILGATE||key===SLIDING_DOOR||key===FRONT_DOOR||key===BODY_COMPLETION;if(/graphite satin metallic/.test(l))rgb=[61,65,69];
 const color=new THREE.Color(`rgb(${rgb.join(',')})`);
 // Keep the chosen melamine face colour identical to its swatch. The wood
 // grooves/edges remain lit, while the broad face is independent of room shadows.
 const wallFace=(key===WALL.key&&/White melamine/.test(n))||(key===PANEL.key&&/^Color panel/.test(n));
 const mat=new THREE.MeshStandardMaterial({color,roughness:wallFace?.97:woodKind?.83:metal?.4:.75,metalness:metal?.25:0,side:THREE.DoubleSide});mat.userData.dayUnlit=wallFace;if(wallFace)mat.toneMapped=false;
 mat.name=n;
 if(key===AIRCON.key){mat.roughness=metal?.4:/glass/i.test(n)?.22:.62;mat.metalness=metal?.35:0;}
 if(isLight(key)){
  mat.roughness=metal?.45:.8;mat.metalness=metal?.55:0;mat.side=THREE.FrontSide;
  if(n==='Downlight matte silver aluminium'){
   // The underside has no environment reflection in this viewer. A neutral
   // presentation fill keeps the silver bezel readable without lighting the room.
   mat.roughness=.5;mat.metalness=.28;mat.emissive.copy(mat.color);
   mat.emissiveIntensity=state.night?.16:.45;lightTrims.push(mat);
  }
  if(/frosted PC diffuser/.test(n)){mat.emissive.set('#ffd5ad');mat.emissiveIntensity=0;lightDiffusers.push({mat,key})}
 }
 if(key===CEILING.key){ceilingMaterials.push(mat);mat.userData.ceiling=true;mat.roughness=.95;mat.metalness=0;mat.toneMapped=false;mat.emissive.set(0xffffff);mat.emissiveIntensity=.28}
 if(woodKind){mat.map=wood;mat.color.set(edge?0xd5c9ae:0xffffff)}
 if(key===FLOOR.key&&/black textured resin/.test(l)){mat.color.set(0x25272a);mat.metalness=0;mat.roughness=.92;mat.bumpMap=resinBump;mat.bumpScale=.12}
 if(key===FLOOR.key&&/^floor - /i.test(n))registerFloorMaterial(mat);
 if(switchable){mat.userData.switchable=true;swappable.push(mat)}
 if(/backlight|led green/.test(l)){mat.emissive.set(0x56843e);mat.emissiveIntensity=.3}
 if(isVehicle){
  mat.userData.vehicle=true;
  mat.transparent=true;mat.opacity=.12;mat.depthWrite=false;
  if(/Material_3|Material_5/.test(n))mat.color.set(0x667c80);
 }
 visualMaterials.material(mat,{woodKind,edge,metal,isVehicle,switchable,key});
 return mat;}
// Loader-owned resources are released after a completed placement only.
const loadedModels=new Map();
const assetReleaseObserver=new MutationObserver(()=>{
 if(batchRunning||opening.active||outro.active||$('#loading').style.display!=='none')return;
 const keep=new Set(($('#viewport').dataset.assets||'').split(','));
 for(const [key,{group,materials}] of loadedModels){
  if(keep.has(key)||assetLoader.isVehicle(key)||(!group.userData.moduleId&&key!=='seat'))continue;
  // Shared worktop/upholstery/wood textures and materials belong to their factories.
  group.traverse(node=>node.geometry?.dispose());scene.remove(group);
  for(let i=swappable.length-1;i>=0;i--)if(materials.has(swappable[i]))swappable.splice(i,1);
  for(const mat of materials)mat.dispose();
  loadedModels.delete(key);cache.delete(key);
 }
});
assetReleaseObserver.observe($('#viewport'),{attributes:true,attributeFilter:['data-assets']});
async function loadModel(key){if(cache.has(key))return cache.get(key);if(Object.values(TWI_KEYS).includes(key)){const pending=Promise.resolve(twiVisuals.get(key));cache.set(key,pending);return pending}let promise=(async()=>{const loaded=await assetLoader.load(key,key===PANEL.key?"?v="+PANEL.revision:"");const {data,buffer:buf}=loaded;try{let mats=Object.fromEntries(Object.entries(data.materials).map(([k,v])=>[k,materialFor(v,key)]));let group=new THREE.Group();group.name=data.base_module||key;group.userData.data=data;group.userData.moduleId=modules[data.base_module||key]?(data.base_module||key):key==='centre-mattresses'?'two-side-bed':key==='lounge-fillers'?'lounge-bed':null;group.visible=false;
 for(const b of data.bodies){const node=new THREE.Group();node.name=b.name;node.userData=b;node.userData.initialBounds=b.bounds;for(const p of b.parts){let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(assetLoader.attribute(p,'position',buf),3));g.setAttribute('normal',new THREE.BufferAttribute(assetLoader.attribute(p,'normal',buf),3));g.setAttribute('uv',new THREE.BufferAttribute(assetLoader.attribute(p,'uv',buf),2));g.setIndex(new THREE.BufferAttribute(assetLoader.attribute(p,'index',buf),1));g.computeBoundingSphere();let mesh=new THREE.Mesh(g,mats[p.material]);mesh.castShadow=key!=='vehicle'&&key!==TAILGATE&&key!==SLIDING_DOOR&&key!==FRONT_DOOR&&key!==BODY_COMPLETION&&key!==CEILING.key&&!isLight(key);mesh.receiveShadow=true;if(!assetLoader.isVehicle(key)){mesh.userData.originalPosition=g.attributes.position.array.slice();mesh.userData.originalNormal=g.attributes.normal.array.slice();}visualMaterials.mesh(mesh,b.bounds);node.add(mesh)}countertopVisuals.apply(node,data.base_module||key);if(key===WALL.key)registerWallPanel(node);if(key===PANEL.key)registerColorPanel(node);if(key===CEILING.key)ceilingPanels.push(node);if(key===FLOOR.key)for(const mesh of node.children)if(mesh.material.userData.floorFinish)floorSurfaces.push(mesh);group.add(node)}scene.add(group);if(isLight(key))registerLightRig(key,data);loaded.finish();loadedModels.set(key,{group,materials:new Set(Object.values(mats))});return group}catch(error){loaded.fail();throw error}})();cache.set(key,promise);promise.catch(()=>{if(cache.get(key)===promise)cache.delete(key)});return promise;}

// Broad melamine faces keep their established daytime swatch colour. At night
// the same surface receives the actual lamp lighting, including cast shadows.
function registerDaySurface(mat){
 if(!mat.userData.dayUnlit)return;
 const uniform={value:state.night?0:1};
 mat.onBeforeCompile=shader=>{shader.uniforms.skyDayUnlit=uniform;shader.fragmentShader='uniform float skyDayUnlit;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','if(skyDayUnlit>0.5) outgoingLight=mix(diffuseColor.rgb,clamp(outgoingLight,vec3(0.0),diffuseColor.rgb*1.35),0.32);\n#include <opaque_fragment>')};
 mat.customProgramCacheKey=()=> 'melamine-day-night-v2';daySurfaceMaterials.push({mat,uniform});
}
function registerLightRig(key,data){
 const rig=new THREE.Group();rig.name=key+' illumination';const sources=[];
 for(const source of data.emitters){
  // Model coordinates are millimetres. Intensity is adjusted for a readable
  // product illustration; this is not a measured lux or IES calculation.
  const spot=new THREE.SpotLight('#ffd5ad',key==='tailgate-lights'?6500000:2600000,4600,THREE.MathUtils.degToRad(62),.72,2);
  spot.position.set(...source.position);spot.target.position.copy(spot.position).addScaledVector(new THREE.Vector3(...source.direction),1000);
  spot.castShadow=true;spot.shadow.mapSize.set(512,512);spot.shadow.camera.near=10;spot.shadow.camera.far=4100;spot.shadow.bias=-.0004;spot.shadow.normalBias=1.2;
  rig.add(spot,spot.target);sources.push(spot);
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(130,130),new THREE.ShaderMaterial({uniforms:{glowColor:{value:new THREE.Color('#ffc991')}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;uniform vec3 glowColor;void main(){float r=length(vUv-.5)*2.0;float a=pow(max(0.0,1.0-r),2.0)*.16;gl_FragColor=vec4(glowColor,a);}',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.FrontSide,toneMapped:false}));
  glow.position.copy(spot.position).addScaledVector(new THREE.Vector3(...source.direction),.12);glow.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...source.direction));rig.add(glow);
 }
 rig.visible=false;scene.add(rig);lightRigs.set(key,{rig,sources});
}
function setLighting(){
 twiVisuals.updateState(state);
 const night=Boolean(state.night);visualMaterials.lighting(night);$('.stage').classList.toggle('night-mode',night);
 scene.background.set(night?'#111923':'#f1f0e9');scene.fog=night?new THREE.Fog('#111923',6500,14500):null;renderer.toneMappingExposure=1.05;
 ambient.intensity=night?.13:.9;ambient.color.set(night?'#b6c4d9':'#ffffff');ambient.groundColor.set(night?'#6a5441':'#9a9687');
 sun.intensity=night?.025:2.1;sun.castShadow=!night;fill.intensity=night?.045:.6;
 floor.material=night?nightGround:dayGround;grid.visible=!night;
 for(const [flag,info] of Object.entries(LIGHTS)){const rig=lightRigs.get(info.key);if(rig)rig.rig.visible=night&&state[flag]}
 for(const {mat,key} of lightDiffusers){const flag=Object.keys(LIGHTS).find(k=>LIGHTS[k].key===key);mat.emissiveIntensity=night&&state[flag]?3.2:0}
 for(const mat of lightTrims)mat.emissiveIntensity=night?.16:.45;
 for(const {mat,uniform} of daySurfaceMaterials){uniform.value=night?0:1;if(mat.toneMapped!==night){mat.toneMapped=night;mat.needsUpdate=true}}
 for(const mat of ceilingMaterials){mat.emissiveIntensity=night?.018:.28;if(mat.toneMapped!==night){mat.toneMapped=night;mat.needsUpdate=true}}
 for(const mat of floorMaterials){mat.emissiveIntensity=night?.004:.12;if(mat.toneMapped!==night){mat.toneMapped=night;mat.needsUpdate=true}}
 scene.traverse(o=>{if(o.isMesh&&o.material?.userData.vehicle)o.material.opacity=night?.065:.12});
 renderer.shadowMap.needsUpdate=true;needsFrame=true;
}
function setTwiLamp(key,enabled){
 if(!twiCeilingEnabled(state)||!['twiBarLights','twiIndirectLights'].includes(key))return;
 state={...state,[key]:enabled};if(outro.active)outroState={...outroState,[key]:enabled};
 setLighting();if(outro.active){scene.fog=null;grid.visible=false}lightingUI();window.history.replaceState(null,'',urlFor());updateInteriorPresentation();renderer.render(scene,camera);needsFrame=true;
}
function lightingUI(){
 $('[data-light=ceilingLights] strong').textContent='天井ライト用開口';
 $('[data-light=tailgateLights] strong').textContent=isSuperGL(state)?'バックドアライト（取付希望）':'バックドアライト用開口';
 twiLightControls.update();
 for(const [flag] of Object.entries(LIGHTS)){$(`[data-light="${flag}"]`).setAttribute('aria-pressed',Boolean(state[flag]));$(`[data-light="${flag}"] .light-state`).textContent=state[flag]?'選択中':'追加する'}
 $$('[data-night-toggle]').forEach(b=>{b.setAttribute('aria-pressed',Boolean(state.night));b.textContent=state.night?'☀ 昼の表示に戻す':'☾ ナイトモード'});
 const count=(state.ceilingLights?6:0)+(state.tailgateLights?2:0);
 const included=twiCeilingEnabled(state);
 for(const b of $$('#light-options [data-light]'))b.hidden=isSuperGL(state)&&b.dataset.light==='ceilingLights';
 $('#twi-lighting-included').hidden=!isSuperGL(state);
 $('#twi-lighting-included').textContent=included?'TWIの天井に照明が付属しています。ナイトモードで点灯イメージを確認できます。':'TWIの天井を選ぶと、照明も付属します。';
 $('#dx-lighting-help').hidden=isSuperGL(state);
 $('#lighting-status').textContent=state.night?(count?`${count}灯を点灯しています · 電球色3200K`:'照明を追加すると、照らされ方を確認できます。'):'昼の表示 · ライトを選んでナイトモードへ';
 $('#night-caption').hidden=!state.night;$('#night-caption').textContent=count?`NIGHT / ${count}灯 · 点灯イメージ`:'NIGHT / 消灯';
 $('#lighting-step [data-view="tailgate-light"]').hidden=!panelEnabled()&&!state.tailgateLights;$('#lighting-status').dataset.ceilingLights=state.ceilingLights?'6':'0';$('#lighting-status').dataset.tailgateLights=state.tailgateLights?'2':'0';
 if(included){
  const bars=state.twiBarLights!==false,indirect=state.twiIndirectLights!==false;
  const active=[bars?'バーライト':null,indirect?'間接照明':null,state.tailgateLights?'バックドアライト 2灯':null].filter(Boolean);
  $('#lighting-status').textContent=state.night?(active.length?active.join('＋'):'TWI天井付属照明 · 消灯'):'TWI天井付属照明 · ナイトモードで確認できます';
  $('#night-caption').textContent=active.length?'NIGHT / '+[bars||indirect?'TWI LED':null,state.tailgateLights?'2灯 · 点灯イメージ':null].filter(Boolean).join(' + '):'NIGHT / 消灯';
  $('#lighting-status').dataset.ceilingLights='included';
  $('#twi-lighting-included').textContent='天井の裏から漏れる間接照明と、下向きのバーライトを個別に切り替えられます。';
 }
 $('#viewport').setAttribute('aria-label',`ハイエース3D · ${state.night?'夜':'昼'} · ${lightingLabel()}${heaterEnabled()?' · ヒーター選択中':''}${insulationEnabled()?' · 断熱施工選択中':''}${electricalEnabled()?' · '+electricalLabel():''}`);
}
function setFinish(){for(const m of swappable)visualMaterials.finish(m,state.finish==='birch',wood)}
function registerWallPanel(node){
 // Average the actual cabin-facing white surface of each curved strip.
 // Its inward normal points toward +X in the vehicle coordinates.
 const center=new THREE.Vector3(),normal=new THREE.Vector3();let area=0;
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3(),cross=new THREE.Vector3();
 const materials=[];
 for(const mesh of node.children){
  mesh.material=mesh.material.clone();registerDaySurface(mesh.material);materials.push(mesh.material);
  if(!/White melamine/.test(mesh.material.name))continue;
  wallSurfaces.push(mesh.material);
  const geometry=mesh.geometry,p=geometry.attributes.position,index=geometry.index;
  for(let i=0;i<index.count;i+=3){
   a.fromBufferAttribute(p,index.getX(i));b.fromBufferAttribute(p,index.getX(i+1));c.fromBufferAttribute(p,index.getX(i+2));
   cross.crossVectors(ab.subVectors(b,a),ac.subVectors(c,a));const weight=cross.length();
   if(!weight||cross.x/weight<.7)continue;
   center.addScaledVector(a,weight/3).addScaledVector(b,weight/3).addScaledVector(c,weight/3);normal.add(cross);area+=weight;
  }
 }
 if(!area)throw Error('壁面の表裏方向を確認できません: '+node.name);
 center.divideScalar(area);normal.normalize();wallPanels.push({node,materials,center,normal,behind:false});
}
function registerColorPanel(node){
 const materials=[];
 for(const mesh of node.children){mesh.material=mesh.material.clone();registerDaySurface(mesh.material);materials.push(mesh.material);if(/^Color panel/.test(mesh.material.name))panelSurfaces.push(mesh.material)}
 const bounds=node.userData.bounds;
 colorPanels.push({node,materials,center:new THREE.Vector3(...bounds[0]).add(new THREE.Vector3(...bounds[1])).multiplyScalar(.5),normal:new THREE.Vector3(...node.userData.inward_normal),behind:false});
}
function setPanelFinish(){const c=WALL_COLORS[panelColor()];for(const m of panelSurfaces)m.color.set(`rgb(${(c.web_rgb||c.rgb).join(',')})`)}
function setWallFinish(){const finish=WALL_COLORS[wallEnabled()?state.wall:lastWallColor];const rgb=finish.web_rgb||finish.rgb;for(const m of wallSurfaces){m.color.set(`rgb(${rgb.join(',')})`)}}
function setCeilingFinish(){
 const selected=ceilingEnabled()?state.ceiling:lastCeilingColor;
 const finish=CEILING_COLORS[selected],texture=ceilingTextures[selected];
 for(let board=0;board<ceilingPanels.length;board++){
  const node=ceilingPanels[board];
  // Sample within photographed boards, excluding their seams. Match the 85 mm
  // ceiling pitch and carry the grain longitudinally with mirrored end repeats.
  const strip=finish.grain_strips_px[board%finish.grain_strips_px.length];
  const start=strip[0]/finish.image_width,span=(strip[1]-strip[0])/finish.image_width;
  for(const mesh of node.children){
   if(mesh.userData.ceilingFinish===selected)continue;
   const pos=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;
   for(let i=0;i<pos.count;i++){
    uv.setXY(i,start+Math.min(1,Math.max(0,(pos.getX(i)-node.userData.bounds[0][0])/87.1))*span,
     (pos.getZ(i)-100)*span/87.1+board*.193);
   }
   uv.needsUpdate=true;
   const mat=mesh.material;mat.map=texture;mat.emissiveMap=texture;
   mat.color.set(0xffffff);mat.needsUpdate=true;mesh.userData.ceilingFinish=selected;
  }
 }
}
function registerFloorMaterial(mat){
 const uniforms={floorPhotoCenter:{value:new THREE.Vector2()},floorPhotoAcross:{value:new THREE.Vector2()},floorPhotoAlong:{value:new THREE.Vector2()}};
 mat.userData.floorFinish=true;mat.userData.floorUniforms=uniforms;floorMaterials.push(mat);
 mat.roughness=.94;mat.metalness=0;mat.toneMapped=false;
 mat.emissive.set(0xffffff);mat.emissiveIntensity=.12;
 mat.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=`uniform vec2 floorPhotoCenter;
   uniform vec2 floorPhotoAcross;
   uniform vec2 floorPhotoAlong;
   vec2 skyFloorPhotoUv(vec2 uv){
    vec2 tile=1.0-abs(mod(uv,2.0)-1.0);
    return floorPhotoCenter+(tile.x-.5)*floorPhotoAcross+(tile.y-.5)*floorPhotoAlong;
   }
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader
   .replace('#include <map_fragment>',THREE.ShaderChunk.map_fragment.replace('vMapUv','skyFloorPhotoUv(vMapUv)'))
   .replace('#include <emissivemap_fragment>',THREE.ShaderChunk.emissivemap_fragment.replace('vEmissiveMapUv','skyFloorPhotoUv(vEmissiveMapUv)'));
 };
 mat.customProgramCacheKey=()=> 'floor-photo-region-v1';
}
function setFloorFinish(){
 const selected=floorEnabled()?state.floor:lastFloorColor;
 const finish=FLOOR_COLORS[selected],mapping=finish.mapping,texture=floorTextures[selected];
 for(const mat of floorMaterials){
  mat.map=texture;mat.emissiveMap=texture;mat.color.set(0xffffff);
  const u=mat.userData.floorUniforms;
  u.floorPhotoCenter.value.set(...mapping.center);u.floorPhotoAcross.value.set(...mapping.across);u.floorPhotoAlong.value.set(...mapping.along);
  mat.needsUpdate=true;
 }
 for(const mesh of floorSurfaces){
  if(mesh.userData.floorFinish===selected)continue;
  const pos=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;
  for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getX(i)/mapping.tile_mm[0],pos.getZ(i)/mapping.tile_mm[1]);
  uv.needsUpdate=true;mesh.userData.floorFinish=selected;
 }
}
const vehicleControls=installBaseVehicleControls({getState:()=>state,getLanguage,onVehicle:changeBaseVehicle,onChange:change=>apply({...state,...change}).catch(console.error)});
$('#light-options + .helper').id='dx-lighting-help';
const includedNotice=document.createElement('p');includedNotice.id='twi-lighting-included';includedNotice.className='helper';$('#light-options').after(includedNotice);
const twiLightControls=createTwiLightingControls({getState:()=>state,onChange:setTwiLamp});
$('#quarter-view').onclick=()=>setView(state.quarterPanels==='left'?'quarter-left':'quarter-right');
const pricing=createReferencePricing({getDealer:selectedDealer,catalogue:priceCatalogue,getState:()=>state,getLocation:()=>getStudioLocation().id,getLanguage,onFloorSlide:enabled=>apply({...state,floorSlide:enabled,storage:false}).catch(console.error)});
const newVehicleControls=createNewVehicleControls({getState:()=>state,getLanguage,onChange:change=>{
 state=normalizeNewVehicle({...state,...change});newVehicleControls.update();pricing.update();updateFloorRequirement();
 window.history.replaceState(null,'',urlFor());
}});
function readyForReview(){
 if(!floorEnabled()){updateFloorRequirement();return false}
 if(!vehicleSelectionComplete(state)){$('#tab-vehicle').click();$('#vehicle-selection-help').scrollIntoView({block:'nearest'});return false}
 return true;
}
const moduleDetails=createModuleDetails({modules,getState:()=>state,getLanguage});
const mattressControls=createMattressControls({getState:()=>state,getLanguage,onChange:patch=>apply({...state,...patch}).catch(console.error)});
const iSeatControls=createISeatControls({getState:()=>state,getLanguage,onChange:patch=>apply({...state,...patch}).catch(console.error),onSlidePreview:slide=>{state=normalizeISeat({...state,iSeatSlide:slide});iSeatVisuals.update(scene.getObjectByName('i-seat'),state);needsFrame=true}});
function imageFor(k,finish=state.finish){if(k==='i-seat')return 'assets/iseat/forward.webp';if(k==='seat')return 'patterns/seat-base.webp?v=front-fit-6';let m=modules[k];return `../assets/${k}-${finish}-${m.scenes[0].key}.webp`}
function option(k,chosen,note=''){
 const img=k==='none'?'<span class="seat-icon">—</span>':`<img src="${imageFor(k)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`;
 const button=`<button class="option ${chosen===k?'active':''}" data-key="${k}" aria-pressed="${chosen===k}">${img}<span><span class="name">${name(k)}</span>${constructionBadge(modules[k])}${note?`<small>${note}</small>`:''}</span><span class="check">✓</span></button>`;
 if(chosen!==k)return button;
 const mattress=iSeatControls.inline(k)||mattressControls.inline(k),details=moduleDetails.inline(k);
 return mattress?`<div class="module-option-set" data-module-set="${k}">${button}${mattress}${details}</div>`:button+details;
}
function configureUI(){
 moduleDetails.refresh();
 $('#front-options').innerHTML=option('none',state.front,'家具のない車体から選ぶ')+FRONT.map(k=>option(k,state.front,k==='seat'?'後部の家具を自由に組み合わせる':modules[k].selection_description)).join('');
 $('#bed-options').innerHTML=(rearType==='full'?FULL:SINGLE).map(k=>option(k,state.bed,modules[k].selection_description)).join('');
 $$('#rear-types button').forEach(b=>b.classList.toggle('active',b.dataset.type===rearType));
 $('#bed-side-help').hidden=rearType!=='single';
 const full=FULL.includes(state.bed);$('#cabinet-help').textContent=full?'両サイドの収納を含むため、キャビネットは追加しません。':'助手席側（左）に、お好みの収納を。';
 $('#cabinet-options').innerHTML=full||state.bed==='none'?'': ['none',...CAB].map(k=>option(k,state.cab,k==='side-cabinet'?'フリップアップテーブル':k==='aluminum-side-cabinet'?'シンク・給排水・シャワー':k==='simple-side-cabinet'?'収納・100V／12V出力':k==='active-side-cabinet'?'ENGEL冷蔵庫・シャワー':'ベッド単体のレイアウト')).join('');
 $$('[data-finish]').forEach(b=>{b.classList.toggle('active',b.dataset.finish===state.finish);b.setAttribute('aria-pressed',b.dataset.finish===state.finish)});
 $$('[data-ceiling-choice]').forEach(b=>{const on=b.dataset.ceilingChoice===(ceilingEnabled()?'finish':'none');b.classList.toggle('active',on);b.setAttribute('aria-pressed',on)});
 const ceilingColor=CEILING_COLORS[lastCeilingColor];
 $('#ceiling-options').style.setProperty('--ceiling-finish-image',`url("${ceilingColor.image}")`);
 $('#ceiling-view').hidden=!ceilingEnabled();
 $('#ceiling-view-help').hidden=!ceilingEnabled();
 $('#ceiling-color-section').hidden=!ceilingEnabled();
 $('#ceiling-color-options').innerHTML=ceilingPalette.colors.map(c=>`<button type="button" class="wall-color-option ${state.ceiling===c.value?'active':''}" data-ceiling-color="${c.value}" aria-pressed="${state.ceiling===c.value}"><img src="${c.image}" alt="" width="1000" height="1000"><span>${c.label}</span></button>`).join('');
 const panelOn=panelEnabled(),panelFinish=panelColor(),wallColor=WALL_COLORS[panelFinish];
 $$('[data-wall-choice]').forEach(b=>{const on=b.dataset.wallChoice===wallChoice();b.classList.toggle('active',on);b.setAttribute('aria-pressed',on)});
 $('#wall-options').style.setProperty('--wall-finish-color',`rgb(${(wallColor.web_rgb||wallColor.rgb).join(',')})`);
 $('#wall-options').style.setProperty('--panel-finish-color',`rgb(${(wallColor.web_rgb||wallColor.rgb).join(',')})`);
 $('#wall-color-section').hidden=!panelOn;
 $('#wall-color-options').innerHTML=wallPalette.colors.map(c=>`<button type="button" class="wall-color-option ${panelOn&&panelFinish===c.value?'active':''}" data-wall-color="${c.value}" aria-pressed="${panelOn&&panelFinish===c.value}"><img src="${c.image}" alt="${c.label}の合板見本" width="220" height="220"><span>${c.label}</span></button>`).join('');
 $('#panel-inclusion-help').hidden=!panelOn;
 $('#panel-inclusion-help').textContent=wallEnabled()?'壁面パネルには、同色のカラーパネルも付きます。':'窓下3枚のパネルだけを取り付けます。';
 $('#wall-view').hidden=!wallEnabled();$('#wall-view-help').hidden=!wallEnabled();
 $('#panel-view').hidden=!panelOn;$('#tailgate-view').hidden=!panelOn;
 $('#panel-view').textContent=wallEnabled()?'カラーパネルを見る':'カラーパネル3枚を見る';
 // Flooring is selected directly from the five samples, without an enable card.
 $('#floor-color-options').innerHTML=floorPalette.colors.map(c=>`<button type="button" class="wall-color-option ${state.floor===c.value?'active':''}" data-floor-color="${c.value}" aria-pressed="${state.floor===c.value}"><img src="${c.image}" alt="" width="${c.image_width}" height="${c.image_height}"><span>${c.label}</span></button>`).join('');
 $('#floor-view').hidden=!floorEnabled();updateFloorRequirement();
 const rows=[['前側',state.front],['ベッド',state.bed],['サイド',state.cab]];$('#selection-summary').innerHTML=`<div class="selection-row" id="vehicle-compatibility-summary"><span>対応車種</span><b><span>${vehicleName(state)}</span><br> <span>標準ボディ（ナロー）・標準ルーフ・5ドア専用</span></b></div>${getStudioLocation().id==='au'?`<div class="selection-row"><span>ロケーション</span><b id="selection-location">未選択</b></div>`: ''}`+rows.map(([label,k])=>`<div class="selection-row"><span>${label}</span>${modules[k]?`<div class="selection-module"><a href="${modules[k].external_url||`../${k}.html`}" ${modules[k].external_url?'target="_blank" rel="noopener noreferrer"':''}>${name(k)} ↗</a> ${constructionBadge(modules[k])}</div>`:`<b>${name(k)}</b>`}</div>`).join('')+`<div class="selection-row"><span>仕上げ</span><b>${state.finish==='black'?'ヘキサ合板':'バーチ合板'}</b></div>`;
 $('#selection-summary').insertAdjacentHTML('beforeend',mattressControls.summary()+iSeatControls.summary());
 $('#selection-summary').insertAdjacentHTML('beforeend',`<div class="selection-row"><span>内装</span><b>${interiorLabel()}</b></div><div class="selection-row"><span>照明</span><b>${lightingLabel()}</b></div>`);lightingUI();airconUI();heaterUI();insulationUI();electricalUI();shippingUI();pricing.update();dealerOptionsUI.update();
 if(state.bed==='two-side-bed')$('#selection-summary').insertAdjacentHTML('beforeend',`<div class="selection-row"><span>床スライド</span><b>${state.floorSlide?'脱着式・追加あり':'追加なし'}</b></div>`);
 $('#layout-name').textContent='あなたの過ごし方を、この一台に。';
 updateStudio({front:name(state.front),bed:name(state.bed),cab:name(state.cab),finish:state.finish==='black'?'ヘキサ合板':'バーチ合板',ceiling:twiCeilingEnabled(state)?twiCeilingLabel(state):ceilingEnabled()?CEILING_COLORS[state.ceiling].label:'なし',wall:isSuperGL(state)?quarterLabel(state):panelEnabled()?(wallEnabled()?'壁面パネル':'カラーパネル')+' · '+WALL_COLORS[panelColor()].label:'なし',floor:floorEnabled()?FLOOR_COLORS[state.floor].label:'未選択',lights:lightingLabel(),ac:airconEnabled()?'CUBE AIR460B':'なし',heater:heaterEnabled()?'Webasto':'なし',insulation:insulationEnabled()?'選択中':'なし'});
 vehicleControls.update();newVehicleControls.update();
 for(const [slot,key] of [['front',state.front],['bed',state.bed],['cab',state.cab]]){const el=$(`[data-choice="${slot}"]`);el.classList.toggle('has-construction',!!modules[key]);if(modules[key])el.innerHTML=`<span class="choice-name">${name(key)}</span> ${constructionBadge(modules[key])}`;}
}
function changeBaseVehicle(vehicle){
 if(!['dx','super-gl'].includes(vehicle)||vehicle===(opening.active?openingState?.vehicle:state.vehicle))return;
 if(opening.active){openingState=normalizeNewVehicle(normalizeBaseVehicle({...openingState,vehicle}));state=normalizeNewVehicle(normalizeBaseVehicle({...state,vehicle}));vehicleControls.update();newVehicleControls.update();const url=new URL(location.href);url.searchParams.set('vehicle',vehicle);addNewVehicleParams(url.searchParams,state);for(const k of ['wall','panel','ceiling','twi_ceiling','quarter','twi_bar','twi_indirect','ceiling_lights','tailgate_lights'])url.searchParams.delete(k);history.replaceState(null,'',url);requestAnimationFrame(()=>frameOpening?.());return}
 apply(normalizeBaseVehicle({...state,vehicle})).catch(console.error);
}
function airconUI(){
 $('#aircon-status + .helper').hidden=isSuperGL(state);
 const on=airconEnabled();
 $$('[data-aircon]').forEach(b=>{const selected=b.dataset.aircon===(on?AIRCON.value:'none');b.classList.toggle('active',selected);b.setAttribute('aria-pressed',selected)});
 $('#aircon-view').hidden=!on;
 $('#aircon-status').textContent=isSuperGL(state)?(on?'スーパーGLへのエアコン取付イメージです。':'スーパーGLでは、DX用の壁面パネルは追加されません。'):on?`${WALL_COLORS[state.wall].label}の壁に設置しています。`:wallEnabled()?'選択中の壁仕上げにエアコンを追加できます。':'エアコンを選ぶと、壁仕上げも自動で追加されます。';
 if(dealerOptions.ac)$('#selection-summary').insertAdjacentHTML('beforeend',`<div class="selection-row" data-dealer-option-row="ac"><span>エアコン</span><b>${on?AIRCON.label+'（配管カバー付き）':'なし'}</b></div>`);
}
function heaterUI(){
 const on=heaterEnabled();
 $$('[data-heater]').forEach(b=>{const selected=b.dataset.heater===(on?HEATER.value:'none');b.classList.toggle('active',selected);b.setAttribute('aria-pressed',selected)});
 $('#heater-indicator').hidden=!on;
 if(dealerOptions.heater)$('#selection-summary').insertAdjacentHTML('beforeend',`<div class="selection-row" data-dealer-option-row="heater"><span>FFヒーター</span><b>${on?HEATER.label:'なし'}</b></div>`);
}
function insulationUI(){
 const on=insulationEnabled();
 $$('[data-insulation]').forEach(b=>{const selected=b.dataset.insulation===(on?INSULATION.value:'none');b.classList.toggle('active',selected);b.setAttribute('aria-pressed',selected)});
 $('#insulation-indicator').hidden=!on;
 if(dealerOptions.insulation)$('#selection-summary').insertAdjacentHTML('beforeend',`<div class="selection-row" data-dealer-option-row="insulation"><span>断熱施工</span><b>${on?'選択中':'なし'}</b></div>`);
}
function electricalUI(){
 const on=electricalEnabled();
 $('#electrical-standard').checked=on;
 $('#standard-package-card').classList.toggle('is-selected',on);
 $('#standard-battery-value').textContent=`${on?state.batteryAh:100}Ah`;
 $('#electrical-upgrades').hidden=!on;
 $$('[data-battery]').forEach(b=>{const selected=Number(b.dataset.battery)===state.batteryAh;b.setAttribute('aria-pressed',selected);b.disabled=!on});
 $$('[data-inverter]').forEach(b=>{const selected=Number(b.dataset.inverter)===state.inverterW;b.setAttribute('aria-pressed',selected);b.disabled=!on});
 $('#battery-ac-recommendation').classList.toggle('is-recommended',airconEnabled()&&state.batteryAh<300);
 $('#electrical-preview').hidden=!on;
 $('.stage').classList.toggle('has-electrical',on);
 $('#electrical-preview-battery').textContent=`バッテリー${state.batteryAh}Ah`;
 $('#electrical-preview-inverter').hidden=!state.inverterW;
 $('#electrical-preview-inverter').textContent=`インバーター${state.inverterW}W`;
 if(dealerOptions.electrical)$('#selection-summary').insertAdjacentHTML('beforeend',`<div class="selection-row" data-dealer-option-row="electrical"><span>電装</span><b>${electricalLabel()}</b></div>`);
}
const shippingText=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function shippingUI(){
 registrationDestination.refresh();
 const enabled=shippingForAustralia();
 const locationRow=$('#selection-location')?.closest('.selection-row');
 if(enabled){
  if(!locationRow)$('#vehicle-compatibility-summary')?.insertAdjacentHTML('afterend','<div class="selection-row"><span>ロケーション</span><b id="selection-location"></b></div>');
  const label=$('#selection-location');if(label)label.textContent=registrationLocationLabel(state,state.shippingAgent);
 }else locationRow?.remove();
 for(const [id,key] of [['shipping-sourcing','vehicleSourcing'],['shipping-agent','shippingAgent']]){
  const input=$('#'+id);input.checked=enabled&&state[key]===true;input.disabled=!enabled;
  input.closest('.shipping-choice').classList.toggle('is-selected',input.checked);
 }
 const sourcing=enabled&&state.vehicleSourcing;
 $('#vehicle-preferences').hidden=!sourcing;$('#shipping-sourcing').setAttribute('aria-expanded',sourcing);
 for(const [attribute,key] of [['data-sourcing-fuel','sourcingFuel'],['data-sourcing-drive','sourcingDrive'],['data-vehicle-budget','sourcingBudget']]){
  for(const button of $$('['+attribute+']')){button.disabled=!sourcing;button.setAttribute('aria-pressed',sourcing&&String(state[key])===button.getAttribute(attribute))}
 }
 $('#shipping-summary')?.remove();
 if(!enabled)return;
 const rows=[['車両調達',state.vehicleSourcing],['輸送・登録',state.shippingAgent]];
 const preferenceRows=sourcing?[['希望の燃料',SOURCING_FUELS[state.sourcingFuel]||'未選択'],['希望の駆動方式',SOURCING_DRIVES[state.sourcingDrive]||'未選択'],['車両本体の予算',state.sourcingBudget?`A$${state.sourcingBudget.toLocaleString('en-AU')}`:'未選択']]:[];
 const preferenceSummary=preferenceRows.length?`<div id="shipping-preferences-summary">${preferenceRows.map(([title,value])=>`<div class="selection-row"><span>${title}</span><b>${value}</b></div>`).join('')}</div>`:'';
 const destinationRows=registrationRows(state,state.shippingAgent);
 const destinationSummary=destinationRows.length?`<div id="registration-destination-summary">${destinationRows.map(([title,value])=>`<div class="selection-row"><span>${shippingText(title)}</span><b>${shippingText(value)}</b></div>`).join('')}</div>`:'';
 const requested=state.vehicleSourcing||state.shippingAgent;
 $('#selection-summary').insertAdjacentHTML('beforeend',`<div id="shipping-summary">${rows.map(([title,on])=>`<div class="selection-row"><span>${title}</span><b>${on?'外部エージェントの紹介を希望':'希望しない'}</b></div>`).join('')}${preferenceSummary}${destinationSummary}${requested?'<div class="selection-row shipping-referral-summary"><span>Shipping</span><b>外部エージェントへの紹介希望です。各手配は紹介先のエージェントが行います。</b></div>':''}</div>`);
}
function urlFor(s=state){const q=new URLSearchParams({vehicle:s.vehicle||'dx',front:s.front,bed:s.bed,cab:s.cab,finish:s.finish||state.finish});addNewVehicleParams(q,s);if(s.front==='i-seat'){q.set('i_seat_slide',String(s.iSeatSlide||0));q.set('i_seat_pose',s.iSeatPose||'forward');q.set('i_seat_color',s.iSeatColor||'light-green');}if(twiCeilingEnabled(s)){q.set('twi_ceiling',s.twiCeiling);if(s.twiBarLights===false)q.set('twi_bar','0');if(s.twiIndirectLights===false)q.set('twi_indirect','0')}if(quarterCount(s))q.set('quarter',s.quarterPanels);if(s.bed==='two-side-bed'&&s.floorSlide)q.set('floor_slide','1');if(s.bedMattress)q.set('bed_mattress','1');if(s.frontMattress)q.set('front_mattress','1');if(bedMattressEnabled(s))q.set('bed_mattress_color',s.bedMattressColor||'light-green');if(frontMattressEnabled(s))q.set('front_mattress_color',s.frontMattressColor||'light-green');if(wallEnabled(s))q.set('wall',s.wall);if(panelEnabled(s))q.set('panel',Object.hasOwn(WALL_COLORS,s.panel)?s.panel:'auto');if(ceilingEnabled(s))q.set('ceiling',s.ceiling);if(floorEnabled(s))q.set('floor',s.floor);if(airconEnabled(s))q.set('ac',AIRCON.value);if(heaterEnabled(s))q.set('heater',HEATER.value);if(insulationEnabled(s))q.set('insulation',INSULATION.value);if(electricalEnabled(s)){q.set('electrical','standard');q.set('battery',String(s.batteryAh));if(s.inverterW)q.set('inverter',String(s.inverterW))}if(shippingForAustralia()){if(s.vehicleSourcing){q.set('sourcing','1');if(s.sourcingFuel)q.set('sourcing_fuel',s.sourcingFuel);if(s.sourcingDrive)q.set('sourcing_drive',s.sourcingDrive);if(s.sourcingBudget)q.set('vehicle_budget',String(s.sourcingBudget))}if(s.shippingAgent){q.set('shipping','1');addRegistrationParams(q,s)}}if(s.ceilingLights)q.set('ceiling_lights','1');if(s.tailgateLights)q.set('tailgate_lights','1');if(s.night)q.set('night','1');for(const [key,param] of [['expanded','expanded'],['frontExpanded','front_expanded'],['rearExpanded','rear_expanded'],['storage','storage'],['flat','flat']])if(s[key])q.set(param,'1');q.set('location',getStudioLocation().id);q.set('lang',getLanguage());if(reviewMode)q.set("review","1");dealerParams(q);return `${location.pathname}?${q}`}
function moveBody(node,delta){node.position.add(new THREE.Vector3(...delta))}
function rotateBody(node,pivot,axis,degrees){let q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...axis),THREE.MathUtils.degToRad(degrees));node.quaternion.copy(q);let v=new THREE.Vector3(...pivot);node.position.copy(v).sub(v.clone().applyQuaternion(q))}
function bedLength(s=state){return s.bed==='none'?0:1800}
function stretch(group,length){let original=group.name==='lounge-bed'?1920:group.name==='lounge-slide-bed'?1816:1800;let delta=length-original;for(const node of group.children.filter(n=>!n.userData.cushions))for(const mesh of node.children){let a=mesh.geometry.attributes.position.array,src=mesh.userData.originalPosition;for(let i=0;i<a.length;i+=3){a[i]=src[i];a[i+1]=src[i+1];const z=src[i+2];a[i+2]=z+delta*Math.min(1,Math.max(0,(z-1250)/500));let n=mesh.geometry.attributes.normal.array,o=mesh.userData.originalNormal,f=z>1250&&z<1750?1+delta/500:1;let x=o[i],y=o[i+1],nz=o[i+2]/f,len=Math.hypot(x,y,nz)||1;n[i]=x/len;n[i+1]=y/len;n[i+2]=nz/len}mesh.geometry.attributes.normal.needsUpdate=true;mesh.geometry.attributes.position.needsUpdate=true;mesh.geometry.computeBoundingSphere()}}
function actualBounds(node,group){return node.userData.bounds.map(a=>a.map((v,i)=>v+group.position.getComponent(i)))}
function overlapYZ(a,b){return Math.min(a[1][1],b[1][1])-Math.max(a[0][1],b[0][1])>1 && Math.min(a[1][2],b[1][2])-Math.max(a[0][2],b[0][2])>1}
function slideNodes(group){return group.children.filter(n=>group.name==='slide-bed'?/^ボディ[56](?: |$)/.test(n.name):group.name==='lounge-slide-bed'?n.userData.path.startsWith('04 Sliding'):group.name==='aluminum-bed'?/^0[23] /.test(n.userData.path):false)}
function travelFor(bed,cab){const nominal=bed.name==='slide-bed'?430:500;let max=nominal;let limiting='';if(cab){for(const b of slideNodes(bed)){for(const c of cab.children){const bb=actualBounds(b,bed),cb=actualBounds(c,cab);if(overlapYZ(bb,cb)&&cb[0][0]>=bb[1][0]-1){const gap=cb[0][0]-bb[1][0]-10;if(gap<max){max=Math.max(0,gap);limiting=c.name}}}}}return {travel:Math.floor(max),nominal,limiting}}
function motionUI(fit){const b=state.bed;let items=[];if(SINGLE.includes(b)){if(b==='aluminum-bed'){items.push(['frontExpanded',`前側のベッド（${fit.front_travel}mm）`,state.frontExpanded],['rearExpanded',`後側のベッド（${fit.rear_travel}mm）`,state.rearExpanded])}else items.push(['expanded','ベッドを横へ広げる',state.expanded])}if(b==='two-side-bed'){items.push(['flat','中央マットレスを敷く',state.flat]);if(state.floorSlide)items.push(['storage','中央の板を後ろへ（オプション）',state.storage]);}if(['lounge-bed','lounge-slide-bed','aluminum-bed'].includes(b))items.push(['storage','後部収納を引き出す',state.storage]);
 $('#motion-section').style.display=(items.length||state.front==='i-seat')?'block':'none';$('#motion-section').classList.toggle('has-iseat',state.front==='i-seat');iSeatControls.stageHeading();$('#motion-controls').innerHTML=iSeatControls.stage()+items.map(([id,label,on])=>`<div class="motion-item"><span>${label}</span><button data-motion="${id}" aria-pressed="${on}">${on?'閉じる':'開く'}</button></div>`).join('');
 $('#fit-note').textContent=fit&&fit.travel<fit.nominal?`車体と家具の位置に合わせて、横への展開を${fit.travel}mmに抑えた表示です。単体の表示上の最大量は${fit.nominal}mmです。`:fit?`横へのスライド量 ${fit.travel}mm。` :b==='lounge-bed'&&state.front==='seat'?'シートを残すため、ベッドの前側セルを1800mm仕様に調整した配置です。':'';
}
function resetNodes(g){g.visible=false;g.position.set(...(offsets[g.name]||[0,0,0]));const pr=placementReportFor()?.placements?.[g.name];g.rotation.set(0,(pr?.rotation_y_deg||0)*Math.PI/180,0);if(pr?.rotation_y_deg){const pivot=new THREE.Vector3(...pr.rotation_pivot_mm);g.position.add(pivot.clone().sub(pivot.clone().applyEuler(g.rotation)))}g.scale.set(pr?.mirror_x?-1:1,1,1);if(pr?.extra_x_mm)g.position.x+=pr.extra_x_mm;for(const n of g.children){n.visible=true;n.position.set(0,0,0);n.quaternion.identity()}}
function positionMotion(g,fit){let key=g.name;for(const n of g.children){if(n.userData.cushions)continue;let id=n.userData.source_root_index,path=n.userData.path;
 if(key==='lounge-bed'&&state.storage){if(n.userData.motion){let p=[...n.userData.motion.pivot];p[2]+=(bedLength()-1920)*Math.min(1,Math.max(0,(p[2]-1250)/500));rotateBody(n,p,n.userData.motion.axis,100)}const first=[5,6,7,8,61,62,81,82,83,84,85,86,87,88,89,90,91,92,93,96];const second=[5,6,61,62,86,87,88,89,90,91,92,93];if(first.includes(id))moveBody(n,[0,0,-360-(second.includes(id)?280:0)])}
 if(key==='slide-bed'&&state.expanded&&/^ボディ[56](?: |$)/.test(n.name))moveBody(n,[fit.travel,0,0]);
 if(key==='lounge-slide-bed'){if(state.expanded&&path.startsWith('04 Sliding'))moveBody(n,[fit.travel,0,0]);if(state.storage&&path.startsWith('05 Rear')){if(n.name.startsWith('HEXA hinged'))rotateBody(n,[-480,269,0],[0,0,1],110);moveBody(n,[0,0,-1200])}}
 if(key==='aluminum-bed'){if((state.frontExpanded&&path.startsWith('03 '))||(state.rearExpanded&&path.startsWith('02 ')))moveBody(n,[path.startsWith('03 ')?fit.front_travel:fit.rear_travel,0,0]);if(state.storage&&path.startsWith('04 '))moveBody(n,[0,0,-750])}
 if(key==='two-side-bed'&&path.startsWith('Plywood two-side')){
  const sliding=/^ボディ(13[1-5]|142|14[5-8])$/.test(n.name);
  if(sliding||/^レール(?: \(1\))?$/.test(n.name))n.visible=state.floorSlide===true;
  if(sliding&&state.floorSlide&&state.storage)moveBody(n,[0,0,-900]);
 }
 if(key==='two-side-bed'&&state.flat&&path.includes('STORED'))n.visible=false;
 }}
async function apply(s=state,{history=true,ui=true}={}){const ticket=++renderVersion;state=normalizeNewVehicle(normalizeISeat(normalizeDealerOptionState(normalizeMattresses(normalizeBaseVehicle(normalizeShipping(s))),dealerOptions)));if(state.bed!=='two-side-bed')state.floorSlide=false;if(state.bed==='two-side-bed'&&!state.floorSlide)state.storage=false;if(!wallEnabled()&&!isSuperGL(state))state.ac='none';if(!ceilingEnabled())state.ceilingLights=false;if(!panelEnabled()&&!isSuperGL(state))state.tailgateLights=false;if(wallEnabled())state.panel='auto';if(panelEnabled())lastPanelColor=panelColor();if(wallEnabled())lastWallColor=state.wall;if(ceilingEnabled())lastCeilingColor=state.ceiling;if(floorEnabled())lastFloorColor=state.floor;if(ui)configureUI();let keys=['vehicle',TAILGATE,...[placementReportFor()?.placements?.[state.front]?.asset_key||state.front,state.bed,state.cab].filter(k=>k!=='none')];if(twiCeilingEnabled(state))keys.push(TWI_KEYS.ceiling);if(['left','both'].includes(state.quarterPanels))keys.push(TWI_KEYS.left);if(['right','both'].includes(state.quarterPanels))keys.push(TWI_KEYS.right);if(wallEnabled())keys.push(WALL.key);if(airconEnabled())keys.push(AIRCON.key);if(panelEnabled())keys.push(PANEL.key);if(ceilingEnabled())keys.push(CEILING.key);if(floorEnabled())keys.push(FLOOR.key);for(const [flag,info] of Object.entries(LIGHTS))if(state[flag])keys.push(info.key);if(state.bed==='lounge-bed')keys.push('lounge-fillers');if(state.bed==='two-side-bed'&&state.flat)keys.push('centre-mattresses');$('#loading').style.display='flex';$('#loading p').textContent='選んだ家具・内装を配置しています';let models;try{models=await Promise.all(keys.map(loadModel))}catch(e){$('#loading p').textContent=e.message;throw e}if(ticket!==renderVersion)return;
 for(const p of cache.values()){const g=await p;resetNodes(g)}for(const g of models)g.visible=true;iSeatVisuals.update(models.find(g=>g.name==='i-seat'),state);
 activeAirconMount=null;const airconModel=models.find(g=>g.name===AIRCON.key);if(airconModel&&isSuperGL(state)){activeAirconMount=twiVisuals.airconMount(airconModel.userData.data.bounds);airconModel.position.set(...activeAirconMount.translation_mm);airconModel.rotation.set(0,0,0);airconModel.userData.mount=activeAirconMount}else if(airconModel){delete airconModel.userData.mount}
 const floorModel=models.find(g=>g.name===FLOOR.key);if(floorModel){const replaced=new Set(floorModel.userData.data.source.replaces_vehicle_bodies);for(const node of models.find(g=>g.name==='vehicle').children)if(replaced.has(node.name))node.visible=false}
 const panelModel=models.find(g=>g.name===PANEL.key);if(panelModel){for(const node of panelModel.children)node.visible=!(wallEnabled()&&node.userData.hide_with_wall);const replaced=new Set(panelModel.userData.data.source.replaces_vehicle_bodies);for(const node of models.find(g=>g.name==='vehicle').children)if(replaced.has(node.name))node.visible=false}
 let bed=models.find(g=>g.name===state.bed),cab=models.find(g=>g.name===state.cab);let fit=bed&&SINGLE.includes(state.bed)?(placementReportFor()?.fit||travelFor(bed,cab)):null;if(bed&&['lounge-bed','slide-bed','lounge-slide-bed'].includes(state.bed))stretch(bed,bedLength());if(bed)positionMotion(bed,fit);mattressVisuals.update(models,state,fit,bedLength());setFinish();setWallFinish();setPanelFinish();setCeilingFinish();setFloorFinish();setLighting();
 if(ui){motionUI(fit);$('#dimensions').textContent=state.bed==='none'?`ナロー車体 · ${name(state.front)}`:`ベッド長 ${bedLength().toLocaleString()}mm${fit?'　·　横への展開 '+(state.bed==='aluminum-bed'?fit.front_travel+' / '+fit.rear_travel:fit.travel)+'mm':''}　·　${state.finish==='black'?'ヘキサ':'バーチ'}合板`}
 if(ui&&((!airconEnabled()&&activeView==='aircon')||(!panelEnabled()&&['panels','tailgate'].includes(activeView))||(!panelEnabled()&&!state.tailgateLights&&activeView==='tailgate-light')||(!ceilingEnabled()&&!twiCeilingEnabled(state)&&activeView==='ceiling')||(!floorEnabled()&&activeView==='floor')))setView('rear');
 updateInteriorPresentation();
 updateFitDisplay();
 if(history&&!batchRunning)window.history.replaceState(null,'',urlFor());$('#loading').style.display='none';$('#viewport').dataset.assets=keys.join(',');renderer.render(scene,camera);return {keys,fit,bedLength:bedLength()}}
const checkMarkers=new THREE.Group();scene.add(checkMarkers);
function updateFitDisplay(){
 if(state.front==='i-seat'){$('#geometry-check').hidden=false;$('#geometry-check').classList.remove('has-issues');$('#check-title').textContent=getLanguage()==='en'?'i seat · installation':'i seat の取り付けについて';$('#check-details').textContent=iSeatInstallationNote(getLanguage());$('#toggle-checks').hidden=true;checkMarkers.clear();updateReviewIndicator(false);return}

 if(isSuperGL(state)){$('#geometry-check').hidden=false;$('#check-title').textContent='スーパーGLの配置イメージ';$('#check-details').textContent='TWI製品の形状は表示用の参考形状です。製作時には実車との取り合いを確認します。';$('#toggle-checks').hidden=true;checkMarkers.clear();updateReviewIndicator(false);return}
 const r=reportFor();while(checkMarkers.children.length){const m=checkMarkers.children.pop();m.geometry.dispose();m.material.dispose()}
 if(!r){$('#geometry-check').hidden=true;updateReviewIndicator(false);return}$('#geometry-check').hidden=false;
 const slideOpen=state.expanded||state.frontExpanded||state.rearExpanded;const pose=state.storage?(slideOpen?'slide-and-storage':'storage'):'full-slide';const extra=r.motion_checks.filter(m=>(state.flat&&m.pose==='flat-mattresses')||((slideOpen||state.storage)&&m.pose===pose)).flatMap(m=>m.additional_hits);
 const wallHits=wallEnabled()?[state.front,state.bed,state.cab].flatMap(k=>wallVerification.module_checks[k]||[]):[];
 updateReviewIndicator(r.status!=='clear'||wallHits.length>0||extra.length>0);
 const hits=[...r.closed_hits,...extra,...wallHits];const unique=new Map(hits.map(h=>[h.a+'|'+h.b,h]));
 $('#check-title').textContent=r.status==='clear'&&!wallHits.length?'配置の確認ができた構成':'車体合わせの確認箇所があります';
 $('#geometry-check').classList.toggle('has-issues',r.status!=='clear'||wallHits.length>0);
 let lines=[...r.adjustments];if(r.closed_hits.some(h=>h.kind==='vehicle'))lines.push('タイヤハウス・内張りと家具の逃げを確認します。');if(r.closed_hits.some(h=>h.kind==='module'))lines.push('前後の家具が重なるため、現寸法のままでは収まりません。寸法や配置の調整が必要です。');
 if(r.motion_checks.some(m=>m.additional_hits.length))lines.push('開いた状態にも確認箇所があります。');
 if(['lounge-bed','lounge-slide-bed'].includes(state.bed))lines.push('ベッド前側の長さを調整した配置案です。');
 if(wallHits.length)lines.push('閉じた配置で、追加した壁板とベッドの端に重なりがあります。壁板の厚みに合わせた取り合いの調整が必要です。');
 if(!lines.length)lines.push('参照形状の範囲では、閉じた状態と確認した展開位置で重なりを検出していません。');
 $('#check-details').textContent=lines.join(' ');$('#toggle-checks').hidden=!unique.size;$('#toggle-checks').textContent=showChecks?'確認位置の印を隠す':`確認位置を車体に表示`;
 if(showChecks)for(const h of unique.values()){const m=new THREE.Mesh(new THREE.SphereGeometry(18,10,8),new THREE.MeshBasicMaterial({color:0xd7682e,depthTest:false,transparent:true,opacity:.85}));m.position.set(...h.point);m.renderOrder=20;checkMarkers.add(m)}
}
$('#toggle-checks').onclick=()=>{showChecks=!showChecks;updateFitDisplay();renderer.render(scene,camera)};
// Front of the vehicle is +Z; +X is the left rear viewpoint.
const views={'i-seat':[[2400,1650,3950],[0,430,2220]],'quarter-left':[[-2500,1050,800],[680,900,800]],'quarter-right':[[2500,1050,800],[-720,900,800]],home:HOME_VIEW,rear:[[2388,2415,-4154],[-607,200,1151]],side:[[6600,3155,1660],[0,350,2100]],top:[[0,7200,2200],[0,0,2200]],inside:[[40,1270,2870],[0,380,350]],wall:[[2600,1250,1500],[-750,650,800]],ceiling:[[700,600,-1000],[-30,1320,1350]],floor:[[3100,2050,1800],[100,-40,1450]],panels:[[3000,800,-3500],[-200,700,600]],tailgate:[[1000,900,-3000],[0,1460,-1000]],'tailgate-light':[[2300,1250,-4400],[0,450,-600]],aircon:[[1400,1450,-400],[-640,1060,800]]};
// Keep the furniture visible in overview views; show the chosen veneer underside
// when looking from the cabin. This changes presentation only, not selection.
function setInteriorOpacity(materials,transparent){for(const m of materials){if(m.transparent!==transparent){m.transparent=transparent;m.depthWrite=!transparent;m.needsUpdate=true}m.opacity=transparent?.18:1}}
let lastCeilingHelpAbove;
function updateInteriorPresentation(){
 twiVisuals.updatePresentation(camera);
 const above=camera.position.y>1340;setInteriorOpacity(ceilingMaterials,above);
 for(const panel of [...wallPanels,...colorPanels]){
  panel.node.updateWorldMatrix(true,false);
  const normal=panel.normal.clone().transformDirection(panel.node.matrixWorld),center=panel.center.clone().applyMatrix4(panel.node.matrixWorld);
  const signed=normal.dot(camera.position)-normal.dot(center);
  // A 1 mm band avoids flicker while passing a strip's surface.
  if(signed<-1)panel.behind=true;else if(signed>1)panel.behind=false;
  setInteriorOpacity(panel.materials,panel.behind);
  for(const mesh of panel.node.children)mesh.castShadow=!panel.behind;
 }
 if(lastCeilingHelpAbove!==above){lastCeilingHelpAbove=above;$('#ceiling-view-help').textContent=above?'天井は透過表示です。「天井を見上げる」で木目と開口を確認できます。':'天井の木目を表示しています。上からの全景では透過表示に切り替わります。';}
}
controls.addEventListener('change',updateInteriorPresentation);
let viewFitScale=1,frameOpening=null;
function responsiveViewScale(v){const min=['home','rear','side','top'].includes(v)?1.18:['floor','panels','tailgate','tailgate-light','aircon'].includes(v)?1.35:0;return Math.max(1,min/camera.aspect)}
function setView(v){activeView=v;const [eye,target]=views[v];camera.position.set(...eye);controls.target.set(...target);viewFitScale=responsiveViewScale(v);camera.position.sub(controls.target).multiplyScalar(viewFitScale).add(controls.target);camera.up.set(0,1,0);controls.maxPolarAngle=THREE.MathUtils.degToRad(110);if(v==='top'){camera.position.z+=.1;camera.up.set(1,0,0)}controls.update();updateInteriorPresentation();$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v));renderer.render(scene,camera)}
const observer=new ResizeObserver(()=>{if(batchRunning)return;let rect=$('#viewport').getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;const nextScale=responsiveViewScale(activeView);camera.position.sub(controls.target).multiplyScalar(nextScale/viewFitScale).add(controls.target);viewFitScale=nextScale;camera.updateProjectionMatrix();if(frameOpening)frameOpening();renderer.render(scene,camera)});observer.observe($('#viewport'));
function animate(){requestAnimationFrame(animate);if(!batchRunning&&!document.hidden){controls.update();if(needsFrame){renderer.render(scene,camera);needsFrame=false}}}animate();setView(DEFAULT_VIEW);
function updated(next){if(next.bed!==undefined&&next.bed!==state.bed)next.bedMattress=false;if(next.front!==undefined&&next.front!==state.front)next.frontMattress=false;state={...state,...next,expanded:false,frontExpanded:false,rearExpanded:false,storage:false,flat:false};apply().catch(console.error)}
$('#front-options').addEventListener('click',e=>{let b=e.target.closest('.option[data-key]');if(b){moduleDetails.selected(b.dataset.key);updated({front:b.dataset.key})}});$('#bed-options').addEventListener('click',e=>{let b=e.target.closest('.option[data-key]');if(b){moduleDetails.selected(b.dataset.key);updated({bed:b.dataset.key,cab:FULL.includes(b.dataset.key)?'none':state.cab})}});$('#cabinet-options').addEventListener('click',e=>{let b=e.target.closest('.option[data-key]');if(b){moduleDetails.selected(b.dataset.key);updated({cab:b.dataset.key})}});$('#rear-types').addEventListener('click',e=>{let b=e.target.closest('[data-type]');if(b){rearType=b.dataset.type;configureUI()}});$('#clear-rear').onclick=()=>updated({bed:'none',cab:'none'});$$('[data-finish]').forEach(b=>b.onclick=()=>{apply({...state,finish:b.dataset.finish}).catch(console.error)});$('#motion-controls').addEventListener('click',e=>{let b=e.target.closest('[data-motion]');if(b)apply({...state,[b.dataset.motion]:!state[b.dataset.motion]}).catch(console.error)});$$('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));$('#reset-view').onclick=()=>setView(DEFAULT_VIEW);

$('#aircon-options').addEventListener('click',e=>{const b=e.target.closest('[data-aircon]');if(!b||!['none',AIRCON.value].includes(b.dataset.aircon))return;const next={...state,ac:b.dataset.aircon};if(airconEnabled(next)&&!wallEnabled(next)&&!isSuperGL(next)){next.wall=lastWallColor;next.panel='auto'}apply(next).catch(console.error)});
$('#heater-options').addEventListener('click',e=>{const b=e.target.closest('[data-heater]');if(!b||!['none',HEATER.value].includes(b.dataset.heater))return;apply({...state,heater:b.dataset.heater}).catch(console.error)});
$('#insulation-options').addEventListener('click',e=>{const b=e.target.closest('[data-insulation]');if(!b||!['none',INSULATION.value].includes(b.dataset.insulation))return;apply({...state,insulation:b.dataset.insulation}).catch(console.error)});
$('#electrical-standard').addEventListener('change',e=>apply({...state,electrical:e.target.checked?'standard':'none',batteryAh:100,inverterW:0}).catch(console.error));
$('#battery-options').addEventListener('click',e=>{const b=e.target.closest('[data-battery]');if(!b||!electricalEnabled())return;const value=Number(b.dataset.battery);if([100,200,300].includes(value))apply({...state,batteryAh:value}).catch(console.error)});
$('#inverter-options').addEventListener('click',e=>{const b=e.target.closest('[data-inverter]');if(!b||!electricalEnabled())return;const value=Number(b.dataset.inverter);if([0,1000,2000].includes(value))apply({...state,inverterW:value}).catch(console.error)});
$('#light-options').addEventListener('click',e=>{const b=e.target.closest('[data-light]');if(!b)return;const flag=b.dataset.light;if(!Object.hasOwn(LIGHTS,flag))return;const next={...state,[flag]:!state[flag]};if(next[flag]&&flag==='ceilingLights'&&!ceilingEnabled(next))next.ceiling=lastCeilingColor;if(next[flag]&&flag==='tailgateLights'&&!isSuperGL(next)&&!panelEnabled(next))next.panel=lastPanelColor;apply(next).catch(console.error)});
$$('[data-night-toggle]').forEach(b=>b.onclick=()=>apply({...state,night:!state.night}).catch(console.error));
$('#ceiling-options').addEventListener('click',e=>{const b=e.target.closest('[data-ceiling-choice]');if(!b)return;apply({...state,ceiling:b.dataset.ceilingChoice==='finish'?lastCeilingColor:'none'}).catch(console.error)});
$('#wall-options').addEventListener('click',e=>{
 const b=e.target.closest('[data-wall-choice]');if(!b)return;
 const kind=b.dataset.wallChoice;if(!['none','panel','wall'].includes(kind))return;
 const color=panelColor();
 apply({...state,wall:kind==='wall'?color:'none',panel:kind==='wall'?'auto':kind==='panel'?color:'none'}).catch(console.error);
});
$('#wall-color-options').addEventListener('click',e=>{
 const b=e.target.closest('[data-wall-color]');if(!b||!panelEnabled()||!Object.hasOwn(WALL_COLORS,b.dataset.wallColor))return;
 apply({...state,...(wallEnabled()?{wall:b.dataset.wallColor,panel:'auto'}:{panel:b.dataset.wallColor})}).catch(console.error);
});
$('#ceiling-color-options').addEventListener('click',e=>{const b=e.target.closest('[data-ceiling-color]');if(b&&Object.hasOwn(CEILING_COLORS,b.dataset.ceilingColor))apply({...state,ceiling:b.dataset.ceilingColor}).catch(console.error)});
$('#floor-color-options').addEventListener('click',e=>{const b=e.target.closest('[data-floor-color]');if(b&&Object.hasOwn(FLOOR_COLORS,b.dataset.floorColor))apply({...state,floor:b.dataset.floorColor}).catch(console.error)});
for(const [id,key] of [['shipping-sourcing','vehicleSourcing'],['shipping-agent','shippingAgent']])$('#'+id).addEventListener('change',e=>{
 if(!shippingForAustralia())return;
 state=normalizeShipping({...state,[key]:e.target.checked});shippingUI();
 window.history.replaceState(null,'',urlFor());
});
$('#vehicle-preferences').addEventListener('click',e=>{
 if(!shippingForAustralia()||!state.vehicleSourcing)return;
 const button=e.target.closest('button');if(!button||button.disabled)return;
 let change;
 if(button.hasAttribute('data-sourcing-fuel'))change={sourcingFuel:button.dataset.sourcingFuel};
 else if(button.hasAttribute('data-sourcing-drive'))change={sourcingDrive:button.dataset.sourcingDrive};
 else if(button.hasAttribute('data-vehicle-budget'))change={sourcingBudget:Number(button.dataset.vehicleBudget)};
 if(!change)return;
 state=normalizeShipping({...state,...change});shippingUI();window.history.replaceState(null,'',urlFor());
});
function addRegistrationParams(q,s){
 if(s.registrationState)q.set('registration_state',s.registrationState);
 if(s.registrationPostcode)q.set('postcode',s.registrationPostcode);
 if(s.registrationLocality)q.set('locality',s.registrationLocality);
}
function changeRegistration(patch){
 if(!shippingForAustralia()||!state.shippingAgent)return;
 state=normalizeShipping({...state,...patch});
 const detail=normalizeRegistration(state,true);
 if(document.documentElement.classList.contains('intro-active')&&openingState)Object.assign(openingState,detail);
 if(document.documentElement.classList.contains('outro-active')&&outroState)Object.assign(outroState,detail);
 shippingUI();pricing.update();vehicleControls.update();newVehicleControls.update();
 // Only update destination keys: a late lookup during the intro must not save
 // the temporary empty model over the customer's existing configuration.
 const url=new URL(location.href);for(const key of ['registration_state','postcode','locality'])url.searchParams.delete(key);
 addRegistrationParams(url.searchParams,state);window.history.replaceState(null,'',url);
}
function download(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
let savingImage=false;

initStudio({getLocation:()=>getStudioLocation().id,hasRequiredFloor:()=>floorEnabled(),hasElectrical:()=>dealerOptions.electrical,hasVehicleSelection:()=>vehicleSelectionComplete(state)});initLanguage();
window.addEventListener('studio-locale-change',()=>{
 if(!shippingForAustralia()){
  for(const snapshot of [state,openingState,outroState])if(snapshot){snapshot.vehicleSourcing=false;snapshot.shippingAgent=false;snapshot.sourcingFuel=null;snapshot.sourcingDrive=null;snapshot.sourcingBudget=null;snapshot.registrationState=null;snapshot.registrationPostcode='';snapshot.registrationLocality=null}
  const url=new URL(location.href);for(const key of ['sourcing','shipping','sourcing_fuel','sourcing_drive','vehicle_budget','registration_state','postcode','locality'])url.searchParams.delete(key);window.history.replaceState(null,'',url);
 }
 shippingUI();mattressControls.refresh();iSeatControls.refresh();pricing.update();vehicleControls.update();newVehicleControls.update();dealerOptionsUI.update();
 // Refit after translated opening text reflows, without moving furniture.
 requestAnimationFrame(()=>{if(frameOpening)frameOpening()});
});
window.addEventListener('popstate',()=>{state=parseState();rearType=FULL.includes(state.bed)?'full':'single';apply(state,{history:false})});
let openingState,openingView,openingVehicle,openingTailgate,openingBody,openingSlider,openingRig,openingGroups=[],openingMaterials=[];
// Same upper-edge presentation pivot as hiace_panel_review_open_tailgate.py:
// native [4.4818,2155,1958] mm -> web [X-29.4818,Z-583,2200-Y].
const tailgateHinge=new THREE.Vector3(-25,1375,45);
const opening=createOpening({
 prepare:async()=>{
  openingState={...state};openingView=activeView;controls.enabled=false;controls.maxDistance=28000;
  $('#motion-section').open=false;
  await apply({...state,front:'none',bed:'none',cab:'none',twiCeiling:'none',quarterPanels:'none',wall:'none',panel:'none',ceiling:'none',floor:'none',ac:'none',heater:'none',insulation:'none',electrical:'none',batteryAh:100,inverterW:0,ceilingLights:false,tailgateLights:false,night:false,expanded:false,frontExpanded:false,rearExpanded:false,storage:false,flat:false},{history:false});
  $('#loading').style.display='flex';$('#loading p').textContent='車体を準備しています';
  [openingVehicle,openingTailgate,openingBody,openingSlider]=await Promise.all(['vehicle',TAILGATE,BODY_COMPLETION,SLIDING_DOOR].map(loadModel));
  for(const g of [openingBody,openingSlider]){resetNodes(g);g.visible=true}
  for(const node of openingBody.children)node.visible=![26,41].includes(node.userData.source.index);
  for(const node of openingVehicle.children)if(['メッシュ ボディ3_編集済み','メッシュ ボディ1_編集済み','メッシュ ボディ1298'].includes(node.name))node.visible=false;
  openingGroups=[openingVehicle,openingTailgate,openingBody,openingSlider];
  openingRig=new THREE.Group();openingRig.name='Complete van entrance';scene.add(openingRig);
  for(const g of openingGroups)openingRig.attach(g);
  setLighting();grid.visible=false;
  const materials=new Set();for(const g of openingGroups)g.traverse(n=>{if(n.isMesh)materials.add(n.material)});
  openingMaterials=[...materials].map(mat=>({mat,opacity:mat.opacity}));
  // Fit both open access doors, while centring only the body under the logo.
  const sliderEnvelope={userData:{data:{bodies:openingSlider.userData.data.bodies.map(b=>({bounds:b.bounds.map(p=>[p[0]+85,p[1],p[2]-1180])}))}}};
  poseTail(openingTailgate,0);openingSlider.position.set(0,0,0);openingRig.position.set(0,0,-9000);
  setView('rear');frameOpening=openingCamera(camera,controls,[openingVehicle,openingTailgate,openingBody,sliderEnvelope],{centerModels:[openingVehicle,openingBody]});frameOpening();
  $('#viewport').dataset.assets=openingGroups.map(g=>g.name).join(',');$('#loading').style.display='none';
 },
 pose:({arrival,door})=>{
  // The van enters from its rear and drives straight forward (+Z) to the logo.
  openingRig.position.set(0,0,-9000*(1-arrival));
  poseTail(openingTailgate,door);
  const out=Math.min(1,door/.16),rear=Math.max(0,(door-.12)/.88);
  openingSlider.position.set(85*out,0,-1180*rear);
  for(const {mat,opacity} of openingMaterials)mat.opacity=opacity*Math.min(1,arrival*5);
  $('#viewport').dataset.entrance=JSON.stringify({vehicle_mm:openingRig.position.toArray().map(Math.round),tailgate_deg:Math.round(door*90),sliding_mm:Math.round(1180*rear),complete_body:openingBody.visible});
  renderer.render(scene,camera);
 },
 restore:async()=>{
  frameOpening=null;
  for(const {mat,opacity} of openingMaterials)mat.opacity=opacity;
  for(const group of openingGroups)scene.attach(group);
  if(openingRig){scene.remove(openingRig);openingRig=null}openingGroups=[];
  await apply(openingState);
  setView(openingView);
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)await new Promise(resolve=>setTimeout(resolve,560));
  setView(openingView);controls.maxDistance=Math.max(12000,camera.position.distanceTo(controls.target));
  controls.enabled=true;grid.visible=!state.night;needsFrame=true;
 }
});
// Website-only motion. All selected assets share a rigid vehicle group.
let outroState,outroView,outroRig,outroVehicle,outroTail,outroSlider,outroTailLights,outroFrontDoor,outroBody;
const frontDoorHinge=new THREE.Vector3(785,500,4130);
let outroGroups=[],outroLightGroups=[],outroTailPanels=[],outroPreset='rear';
function updateOutroLighting(){
 const button=$('#outro-night-toggle');
 button.hidden=false;
 button.setAttribute('aria-pressed',Boolean(state.night));
 button.textContent=state.night?'☀ 昼の表示に戻す':'☾ ナイトモード';
 document.documentElement.classList.toggle('outro-night',Boolean(state.night));
}
function frameOutro(v='rear'){
 const directions={rear:[3465,2563,-6138],side:[6600,2300,0],top:[0,1,.00001]};
 outroPreset=v;
 if(v==='inside'){frameOpening=null;setView('inside')}
 else{
  frameOpening=openingCamera(camera,controls,outroFrameModels(),{centerModels:[outroVehicle,outroBody],copySelector:'.outro-copy',actionSelector:'.outro-action',direction:directions[v],up:v==='top'?[1,0,0]:[0,1,0],fitArea:stage=>innerWidth>850?{left:Math.min(270,stage.width*.2),right:stage.width-24,top:125,bottom:stage.height-135}:{left:12,right:stage.width-12,top:95,bottom:stage.height-200}});
  frameOpening();updateInteriorPresentation();renderer.render(scene,camera);
 }

$$('[data-outro-view]').forEach(b=>{const on=b.dataset.outroView===v;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on)});
}
function outroFrameModels(){
 const points=[];
 for(const [group,turn,shift] of [[outroFrontDoor,-65,new THREE.Vector3()],[outroSlider,0,new THREE.Vector3(85,0,-1180)]]){
  const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),THREE.MathUtils.degToRad(turn));
  for(const body of group.userData.data.bodies){const [a,b]=body.bounds;
   for(const x of [a[0],b[0]])for(const y of [a[1],b[1]])for(const z of [a[2],b[2]]){
    const p=new THREE.Vector3(x,y,z);if(turn)p.sub(frontDoorHinge).applyQuaternion(q).add(frontDoorHinge);points.push(p.add(shift));
   }
  }
 }
 const box=new THREE.Box3().setFromPoints(points);
 return [outroVehicle,outroTail,outroBody,{userData:{data:{bodies:[{bounds:[box.min.toArray(),box.max.toArray()]}]}}}];
}
function poseFrontDoor(open){
 outroFrontDoor.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),-THREE.MathUtils.degToRad(65)*open);
 outroFrontDoor.position.copy(frontDoorHinge).sub(frontDoorHinge.clone().applyQuaternion(outroFrontDoor.quaternion));
}
function poseTail(object,open){
 if(!object)return;
 object.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),-(1-open)*Math.PI/2);
 object.position.copy(tailgateHinge).sub(tailgateHinge.clone().applyQuaternion(object.quaternion));
}
function detachOutro(){
 frameOpening=null;
 for(const group of [...outroGroups,...outroLightGroups])scene.attach(group);
 for(const {rig:group} of lightRigs.values()){group.position.set(0,0,0);group.quaternion.identity()}
 if(outroRig){scene.remove(outroRig);outroRig=null}
 outroGroups=[];outroLightGroups=[];
}
function contactPreview(){
 renderer.render(scene,camera);
 if(outroPreset==='inside')return renderer.domElement.toDataURL('image/png');
 const canvas=renderer.domElement,rect=canvas.getBoundingClientRect(),point=new THREE.Vector3();
 let minX=rect.width,maxX=0,minY=rect.height,maxY=0;
 for(const group of outroGroups)for(const node of group.children){
  if(!node.visible||!node.userData.bounds)continue;node.updateWorldMatrix(true,false);
  const [a,b]=node.userData.bounds;
  for(const x of [a[0],b[0]])for(const y of [a[1],b[1]])for(const z of [a[2],b[2]]){
   point.set(x,y,z).applyMatrix4(node.matrixWorld).project(camera);
   if(point.z < -1||point.z>1)continue;
   const px=(point.x+1)*rect.width/2,py=(1-point.y)*rect.height/2;
   minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
  }
 }
 const pad=rect.width*.025,sx=Math.max(0,minX-pad),sy=Math.max(0,minY-pad),sw=Math.min(rect.width,maxX+pad)-sx,sh=Math.min(rect.height,maxY+pad)-sy;
 if(sw<=0||sh<=0)return canvas.toDataURL('image/png');
 const preview=document.createElement('canvas');preview.width=720;preview.height=Math.round(720*sh/sw);
 const ratio=canvas.width/rect.width;
 preview.getContext('2d').drawImage(canvas,sx*ratio,sy*ratio,sw*ratio,sh*ratio,0,0,preview.width,preview.height);
 return preview.toDataURL('image/png');
}
function enquiryPreview(){
 try{
  updateInteriorPresentation();renderer.render(scene,camera);
  const source=renderer.domElement,canvas=document.createElement('canvas');
  // One JPEG, at quality 0.85; reduce dimensions only if above 400 KiB.
  for(const edge of [1600,1400,1200,1000,800]){
   const scale=Math.min(1,edge/Math.max(source.width,source.height));
   canvas.width=Math.max(1,Math.round(source.width*scale));canvas.height=Math.max(1,Math.round(source.height*scale));
   canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);
   const data=canvas.toDataURL('image/jpeg',.85);
   if(data.startsWith('data:image/jpeg;base64,')&&data.length<=546159)return data;
  }
 }catch{/* Images are optional. */}
 return '';
}
function enquiryPreviews(){
 const saved={eye:camera.position.clone(),target:controls.target.clone(),up:camera.up.clone(),
  quaternion:camera.quaternion.clone(),fov:camera.fov,frame:frameOpening,preset:outroPreset,view:activeView,
  fit:viewFitScale,polar:controls.maxPolarAngle,damping:controls.enableDamping,enabled:controls.enabled};
 const images=[];
 try{
  controls.enabled=false;controls.enableDamping=false;
  // Fit the whole vehicle into the image, without the completion-screen text margins.
  frameOpening=null;
  openingCamera(camera,controls,outroFrameModels(),{centerModels:[outroVehicle,outroBody],
   copySelector:'.outro-copy',actionSelector:'.outro-action',direction:[3465,2563,-6138],
   fitArea:stage=>({left:stage.width*.04,right:stage.width*.96,top:stage.height*.04,bottom:stage.height*.96})})();
  const data=enquiryPreview();if(data)images.push(data);
 }catch{/* Images are optional; restore the current view even if framing fails. */}finally{
  frameOpening=saved.frame;outroPreset=saved.preset;activeView=saved.view;viewFitScale=saved.fit;
  camera.position.copy(saved.eye);controls.target.copy(saved.target);camera.up.copy(saved.up);camera.fov=saved.fov;
  controls.maxPolarAngle=saved.polar;controls.update();camera.quaternion.copy(saved.quaternion);camera.updateProjectionMatrix();
  controls.enableDamping=saved.damping;controls.enabled=saved.enabled;
  $$('[data-outro-view]').forEach(b=>{const on=b.dataset.outroView===saved.preset;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on)});
  $$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===saved.view));
  updateInteriorPresentation();renderer.render(scene,camera);needsFrame=true;
 }
 return images;
}
const outro=createOutro({
 captureSpecification:()=>[contactPreview()],
 captureEnquiry:enquiryPreviews,
 catalogue:priceCatalogue,
 getVehicleState:()=>outroState||state,
 getLocation:()=>getStudioLocation().id,
 prepare:async()=>{
  outroState={...state};outroView=activeView;controls.enabled=false;controls.maxDistance=28000;
  $('#outro-equipment-content').append($('.equipment-indicators'),$('#electrical-preview'));
  const details=$('#outro-equipment-details');details.replaceChildren();
  for(const [label,value] of [['照明',lightsAvailable()?lightingLabel():null],['エアコン',airconEnabled()?'CUBE AIR460B':null]]){
   if(!value)continue;
   const row=document.createElement('p'),title=document.createElement('span'),description=document.createElement('span');
   title.textContent=label;description.textContent=value;row.append(title,document.createTextNode(' · '),description);details.append(row);
  }
  $('#outro-equipment').hidden=![lightsAvailable(),electricalEnabled(),airconEnabled(),heaterEnabled(),insulationEnabled()].some(Boolean);
  updateOutroLighting();$('#outro-night-toggle').disabled=true;
  // Store extended furniture for the driving scene. The editing pose is retained.
  await apply({...state,expanded:false,frontExpanded:false,rearExpanded:false,storage:false},{history:false});
  $('#loading').style.display='flex';$('#loading p').textContent='車体を準備しています';
  outroVehicle=await loadModel('vehicle');outroTail=await loadModel(TAILGATE);outroSlider=await loadModel(SLIDING_DOOR);
  outroBody=await loadModel(BODY_COMPLETION);outroFrontDoor=await loadModel(FRONT_DOOR);
  for(const group of [outroSlider,outroBody,outroFrontDoor]){resetNodes(group);group.visible=true}
  // The original full shell replaces its trimmed viewing copies. Source 41
  // duplicates 24 exactly; 26 is already contained in the complete source 40.
  for(const node of outroBody.children)node.visible=![26,41].includes(node.userData.source.index);
  const movingDoorNames=new Set(outroFrontDoor.children.map(n=>n.name));
  for(const node of outroVehicle.children)if(movingDoorNames.has(node.name)||['メッシュ ボディ3_編集済み','メッシュ ボディ1_編集済み','メッシュ ボディ1298'].includes(node.name))node.visible=false;
  outroGroups=[];for(const promise of cache.values()){const group=await promise;if(group.visible)outroGroups.push(group)}
  outroLightGroups=Object.entries(LIGHTS).filter(([flag])=>state[flag]).map(([,info])=>lightRigs.get(info.key)?.rig).filter(Boolean);
  outroRig=new THREE.Group();outroRig.name='Saved van journey';scene.add(outroRig);
  for(const group of [...outroGroups,...outroLightGroups])outroRig.attach(group);
  outroTailPanels=outroGroups.find(g=>g.name===PANEL.key)?.children.filter(n=>n.name.startsWith('03 '))||[];
  outroTailLights=outroGroups.find(g=>g.name===LIGHTS.tailgateLights.key);
  setLighting();scene.fog=null;grid.visible=false;
  // First visible frame: complete body with the two rear access doors open.
  poseTail(outroTail,1);for(const node of outroTailPanels)poseTail(node,1);
  poseTail(outroTailLights,1);poseTail(lightRigs.get(LIGHTS.tailgateLights.key)?.rig,1);
  outroSlider.position.set(85,0,-1180);poseFrontDoor(0);frameOutro('rear');
  $('#loading').style.display='none';
 },
 pose:({tail,slide,frontDoor,departure,arrival,returned,visible})=>{
  if(!outroRig)return;
  outroRig.visible=visible;
  // +Z is the vehicle's forward direction: no diagonal or sideways departure.
  outroRig.position.set(0,0,returned?-1000*(1-arrival):departure*19000);
  poseTail(outroTail,tail);for(const node of outroTailPanels)poseTail(node,tail);
  poseTail(outroTailLights,tail);poseTail(lightRigs.get(LIGHTS.tailgateLights.key)?.rig,tail);
  const out=Math.min(1,slide/.16),rear=Math.max(0,(slide-.12)/.88);
  outroSlider.position.set(85*out,0,-1180*rear);
  poseFrontDoor(frontDoor);
  for(const group of [outroSlider,outroFrontDoor])group.traverse(n=>{if(n.isMesh)n.material.opacity=returned?(state.night?.065:.12):(state.night?.14:.24)});
  $('#viewport').dataset.journey=JSON.stringify({tailgate_deg:Math.round(tail*90),front_door_deg:Math.round(frontDoor*65),full_body:outroBody.visible,sliding_mm:Math.round(1180*rear),vehicle_mm:outroRig.position.toArray().map(Math.round)});
  updateInteriorPresentation();renderer.render(scene,camera);
 },
 showcase:async()=>{
  outroRig.visible=true;outroRig.position.set(0,0,0);controls.enabled=true;
  frameOutro('rear');$('#outro-night-toggle').disabled=false;needsFrame=true;
 },
 restore:async()=>{
  detachOutro();$('.stage').append($('.equipment-indicators'),$('#electrical-preview'));await apply(outroState,{history:false});setView(outroView);
  // Layout shrinks back after the overlay closes; fit against that final size.
  requestAnimationFrame(()=>{setView(outroView);controls.maxDistance=Math.max(12000,camera.position.distanceTo(controls.target));controls.enabled=true;needsFrame=true});
 },
 describe:({includeImage=true}={})=>{
  if(includeImage){try{renderer.render(scene,camera)}catch{/* Optional preview only. */}}
  const configuration={...(outroState||state)},customerSummary=$$('#selection-summary .selection-row').filter(row=>!row.querySelector('.selection-module')||configuration.front==='i-seat'&&/i[\s-]?seat/i.test(row.textContent)).map(row=>({label:row.children[0].textContent.trim(),value:[...row.children].slice(1).map(c=>c.textContent.trim()).join(' ')})).filter(r=>r.label&&r.value);
  return {configuration,layoutNumber:pricing.quote(configuration).number,customerSummary,summary:dealerSummary(getLanguage())+$$('#selection-summary .selection-row').map(row=>[...row.children].map(c=>c.textContent).join(': ')).join('\n')+'\n'+lightingCutoutSummary(outroState,getLanguage())+pricing.summary(outroState)+dealerOptionSummary(outroState,getLanguage()),url:new URL(urlFor(outroState),location.href).href,image:includeImage?(()=>{try{return contactPreview()}catch{return ''}})():''};
 }
});
$('#review-enquiry').onclick=()=>{if(!readyForReview())return;outro.play()};
initRetailerSimulation({getState:()=>state,canApply:readyForReview,capture:()=>{
 renderer.render(scene,camera);
 const source=renderer.domElement,canvas=document.createElement('canvas');canvas.width=720;canvas.height=Math.round(720*source.height/source.width);
 canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.85);
}});

$('#outro-night-toggle').onclick=()=>{
 if(!outro.ready)return;
 state={...state,night:!state.night};outroState={...outroState,night:state.night};
 // Change only the lighting: retain the full shell, open doors and current orbit.
 setLighting();scene.fog=null;grid.visible=false;lightingUI();updateOutroLighting();
 window.history.replaceState(null,'',urlFor(outroState));
 updateInteriorPresentation();renderer.render(scene,camera);needsFrame=true;
};
$$('[data-outro-view]').forEach(b=>b.onclick=()=>{if(outro.ready)frameOutro(b.dataset.outroView)});

// Pick visible furniture through the transparent shell. Raycasting runs only
// on a short click/tap, never on orbit drags, pinches or the intro/outro scenes.
const furnitureRay=new THREE.Raycaster(),furniturePointer=new THREE.Vector2();
const furnitureTouches=new Set();let furnitureTap=null;
const pickCanvas=renderer.domElement;
pickCanvas.addEventListener('pointerdown',e=>{
 furnitureTouches.add(e.pointerId);
 if(furnitureTouches.size>1){furnitureTap=null;return;}
 furnitureTap=e.button===0?{id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now(),moved:false}:null;
 moduleDetails.close();
});
pickCanvas.addEventListener('pointermove',e=>{
 if(furnitureTap?.id===e.pointerId&&Math.hypot(e.clientX-furnitureTap.x,e.clientY-furnitureTap.y)>7)furnitureTap.moved=true;
});
pickCanvas.addEventListener('pointercancel',e=>{furnitureTouches.delete(e.pointerId);furnitureTap=null});
pickCanvas.addEventListener('lostpointercapture',e=>{furnitureTouches.delete(e.pointerId)});
pickCanvas.addEventListener('pointerup',e=>{
 const tap=furnitureTap;furnitureTap=null;furnitureTouches.delete(e.pointerId);
 if(!tap||tap.id!==e.pointerId||tap.moved||performance.now()-tap.time>650||opening.active||outro.active||batchRunning||!controls.enabled||$('#loading').style.display!=='none')return;
 const rect=pickCanvas.getBoundingClientRect();
 furniturePointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
 furnitureRay.setFromCamera(furniturePointer,camera);
 const selected=new Set([state.front,state.bed,state.cab]);
 const groups=scene.children.filter(g=>g.visible&&selected.has(g.userData.moduleId));
 for(const hit of furnitureRay.intersectObjects(groups,true)){
  let visible=true,id=null;
  for(let node=hit.object;node;node=node.parent){if(!node.visible)visible=false;if(node.userData.moduleId)id=node.userData.moduleId;}
  if(visible&&id){moduleDetails.open(id);break;}
 }
});

if(document.documentElement.classList.contains('intro-active')&&!reviewMode)await opening.play();
else await apply();
initLayoutRecall({begin:()=>opening.start(),restore:async saved=>{if(outro.active)await outro.edit();if(opening.active)await opening.start?.();await apply({...state,...saved,expanded:false,frontExpanded:false,rearExpanded:false,storage:false,night:false},{history:true});$('#tab-review').click();setView('rear');}});

})().catch(e=>{
 console.error(e);
 // Temporary Safari diagnostics: retain the first three stack lines verbatim.
 const message=document.querySelector('#loading p');
 if(!message)return;
 const name=e&&e.name?String(e.name):'Error';
 const detail=e&&e.message?String(e.message):String(e);
 const stack=e&&e.stack?String(e.stack).split(/\r?\n/).slice(0,3).join('\n'):'';
 message.textContent='読み込みに失敗しました: '+detail+'\n'+name+(stack?'\n'+stack:'');
 message.style.whiteSpace='pre-wrap';
 message.style.overflowWrap='anywhere';
 const loading=document.querySelector('#loading');
 if(loading)loading.style.display='flex';
});
