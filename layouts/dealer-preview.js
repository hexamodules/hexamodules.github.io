import {DEALERS} from './dealer-config.js?v=2';
import {normalizeRetailerPrices} from './retailer-prices.js?v=2';
import {setupDealerOptions,setupCanArrange,dealerCanArrange} from './dealer-option-policy.js?v=4';
import {NETWORK_FIELDS,normalizeNetworkValues} from './dealer-network.js?v=2';

// Browser-only setup drafts. Public previews exclude routing, staff and network application details.
const DRAFT_KEY='hexa-dealer-setup-draft-v1',PREVIEW_KEY='hexa-dealer-preview-profiles-v1';
const FIELDS={laborDailyCost:10,procurementMode:12,...NETWORK_FIELDS,outsourceInstallation:3,customSupport:3,optionElectrical:3,optionAircon:3,optionHeater:3,optionInsulation:3,dealerName:100,installation:3,market:2,companyName:120,postalCode:12,address:240,companyPhone:40,contactName:100,contactDepartment:100,website:500,enquiryEmail:254};
export const SAMPLE_DEALER_LOGO='assets/dealers/sample-a.svg';
// Only local, decoded raster uploads are persisted. No remote logo URLs or uploaded SVG markup.
const cleanLogo=logo=>typeof logo==='string'&&logo.length<=500000&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(logo)?logo:SAMPLE_DEALER_LOGO;
// Call with a registered profile's asset path, or an already validated preview logo.
export const dealerLogoUrl=logo=>new URL(logo||SAMPLE_DEALER_LOGO,import.meta.url).href;
const validId=id=>/^preview-[a-f0-9-]{36}$/.test(id||'');
const clean=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}}
function values(input={}){
 const source=input&&typeof input==='object'?input:{};
 const result={...Object.fromEntries(Object.entries(FIELDS).map(([key,max])=>[key,clean(source[key],max)])),logo:cleanLogo(source.logo),logoName:clean(source.logoName,160),pricing:normalizeRetailerPrices(source.pricing)};
 result.outsourceInstallation=['yes','no'].includes(result.installation)&&result.outsourceInstallation==='yes'?'yes':'';
 if(!setupCanArrange(result))for(const key of ['customSupport','optionElectrical','optionAircon','optionHeater','optionInsulation'])result[key]='';
 return normalizeNetworkValues(result);
}
export function readSetupDraft(){
 const stored=read(DRAFT_KEY,null);
 return stored?{id:validId(stored.id)?stored.id:null,values:values(stored.values)}:null;
}
export function saveSetupDraft(input,id=null){
 const draft={version:1,id:validId(id)?id:null,values:values(input)};
 localStorage.setItem(DRAFT_KEY,JSON.stringify(draft));return draft;
}
export function saveDealerPreview(input,id=null){
 const v=values(input),previewId=validId(id)?id:'preview-'+crypto.randomUUID();
 const market=v.market==='au'?'au':'jp';
 const profile={id:previewId,pricing:v.pricing,name:v.dealerName,logo:v.logo,customSupport:setupCanArrange(v)&&v.customSupport==='yes',dealerOptions:setupDealerOptions(v),installation:v.installation==='yes'?true:v.installation==='no'?false:null,outsourceInstallation:v.outsourceInstallation==='yes',companyName:v.companyName,postalCode:v.postalCode,address:v.address,companyPhone:v.companyPhone,defaultLocation:market,locations:[market],demo:true,preview:true};
 const stored=read(PREVIEW_KEY,{}),profiles=stored&&typeof stored==='object'&&!Array.isArray(stored)?stored:{};
 profiles[previewId]=profile;
 localStorage.setItem(PREVIEW_KEY,JSON.stringify(profiles));
 saveSetupDraft(v,previewId);return profile;
}
export function readDealerPreview(id){
 if(!validId(id))return null;
 const stored=read(PREVIEW_KEY,{}),p=stored?.[id];
 if(!p||p.preview!==true||p.id!==id||!clean(p.name,100)||!['jp','au'].includes(p.defaultLocation))return null;
 const dealerOptions=Object.fromEntries(['electrical','ac','heater','insulation'].map(key=>[key,dealerCanArrange(p)&&p.dealerOptions?.[key]===true]));
 return {id,pricing:normalizeRetailerPrices(p.pricing),dealerOptions,customSupport:dealerCanArrange(p)&&p.customSupport===true,name:clean(p.name,100),logo:cleanLogo(p.logo),installation:typeof p.installation==='boolean'?p.installation:null,outsourceInstallation:typeof p.installation==='boolean'&&p.outsourceInstallation===true,companyName:clean(p.companyName,120),postalCode:clean(p.postalCode,12),address:clean(p.address,240),companyPhone:clean(p.companyPhone,40),defaultLocation:p.defaultLocation,locations:[p.defaultLocation],demo:true,preview:true};
}
export function isDealerPreviewRequest(search=location.search){
 const q=new URLSearchParams(search);return q.get('dealer_preview')==='1'||(q.get('dealer')||'').startsWith('preview-');
}
export function selectedDealer(search=location.search){
 const q=new URLSearchParams(search);
 return isDealerPreviewRequest(search)?readDealerPreview(q.get('dealer')):DEALERS.find(p=>p.id===q.get('dealer'))||null;
}
