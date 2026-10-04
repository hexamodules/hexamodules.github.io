import {LOCKED_REFERENCE} from './reference-baseline.js?v=20261004';
// Owner-confirmed reference amounts. Equipment prices include fitting.
// null is deliberately unpriced, never a free service. Retailer inputs do not override this locked reference baseline.
export const RETAILER_PRICE_REVISION=LOCKED_REFERENCE.revision;
const install=(id,ja,en,productKeys)=>({id,ja,en,kind:'installation',price_jpy:LOCKED_REFERENCE.fitting[id]??null,productKeys});
export const RETAILER_PRICES=[
 install('fit-floor','床（全柄共通）','Floor · all finishes',['floor:']),
 install('fit-ceiling','DX 天井（全樹種共通）','DX ceiling · all woods',['ceiling:']),
 install('fit-panel','DX カラーパネル3枚（全色共通）','DX colour panels · three panels',['panel:']),
 install('fit-wall','DX 壁面＋カラーパネル（全色共通）','DX wall and colour panel package',['wall:']),
 install('fit-twi-ceiling','TWI 天井（付属照明の取付込み）','TWI ceiling with integrated lighting',['twi-ceiling:']),
 install('fit-twi-quarter','TWI クォーターパネル（1枚）','TWI quarter panel · one side',['twi-quarter']),
 ...[
  ['front-module','フロントモジュール（プライウッド）','Front module · Plywood'],
  ['aluminum-front-kitchen','フロントモジュール（アルミ）','Front module · Aluminium'],
  ['slide-bed','シンプルスライドアウトベッド（プライウッド）','Simple slide-out bed · Plywood'],
  ['lounge-slide-bed','収納付きスライドアウトベッド（プライウッド）','Storage slide-out bed · Plywood'],
  ['aluminum-bed','スライドアウトベッド（アルミ）','Slide-out bed · Aluminium'],
  ['lounge-bed','ラウンジベッド（プライウッド）','Lounge bed · Plywood'],
  ['two-side-bed','床スライド付きラウンジベッド（プライウッド）','Lounge bed with floor slide · Plywood'],
  ['side-cabinet','フリップアップテーブル付きサイドキャビネット（プライウッド）','Flip-up side cabinet · Plywood'],
  ['aluminum-side-cabinet','シンク付きサイドキャビネット（アルミ）','Sink side cabinet · Aluminium'],
  ['simple-side-cabinet','サイドキャビネット（アルミ）','Side cabinet · Aluminium'],
  ['active-side-cabinet','冷蔵庫付きサイドキャビネット（アルミ）','Fridge side cabinet · Aluminium'],
 ].map(([key,ja,en])=>install('fit-'+key,ja,en,['module:'+key])),
 install('fit-floor-slide','脱着式の床スライド（追加分）','Removable centre floor slide',['two-side-bed:floor-slide']),
 ...[
  ['ceiling-lights','天井ダウンライト（6灯）','Ceiling downlights · six',86000,null],
  ['tailgate-lights-dx','DX バックドアライト（2灯）','DX tailgate lights · two',47000,null],
  ['tailgate-lights-gl','スーパーGL バックドアライト（2灯）','Super GL tailgate lights · two',62000,null],
  ['insulation','断熱施工','Insulation installation',120000,'insulation'],
  ['electrical-standard','電装標準（走行40A・外部40A・100Ah）','Standard electrical system · 40A / 40A / 100Ah',370000,'electrical'],
  ['battery-200','200Ahへの変更（標準100Ahとの差額）','200Ah upgrade · additional to 100Ah',70000,'electrical'],
  ['battery-300','300Ahへの変更（標準100Ahとの差額）','300Ah upgrade · additional to 100Ah',140000,'electrical'],
  ['inverter-1000','1000Wインバーター（追加）','1000W inverter · additional',42000,'electrical'],
  ['inverter-2000','2000Wインバーター（追加）','2000W inverter · additional',68000,'electrical'],
  ['ac','エアコン CUBE AIR460B（配管カバー付き）','CUBE AIR460B air conditioning with pipe cover',520000,'ac'],
  ['i-seat','i seat（幅1400mm）','i seat · 1400 mm',690000,null],
  ['heater','FFヒーター（ベバスト）','Webasto FF heater',480000,'heater'],
 ].map(([id,ja,en,price_jpy,availability])=>({id,ja,en,kind:'equipment',price_jpy:LOCKED_REFERENCE.equipment[id]??price_jpy,availability})),
];
const validAmount=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000;
export function parseRetailerAmount(value){
 if(typeof value==='number')return validAmount(value)?value:null;
 if(typeof value!=='string'||!/^\d+$/.test(value.trim()))return null;
 const n=Number(value.trim());return validAmount(n)?n:null;
}
export function normalizeRetailerPrices(input){
 const obj=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 return Object.fromEntries(RETAILER_PRICES.map(row=>[row.id,obj[row.id]?.mode==='custom'?{mode:'custom',price_jpy:parseRetailerAmount(obj[row.id]?.price_jpy)}:{mode:'reference'}]));
}
export function resolveRetailerPrice(row,settings){
 return {price_jpy:row.price_jpy,source:'hexa_reference'};
}
export function retailerPriceLines(state,parts,profile=null){
 const settings=normalizeRetailerPrices(profile?.pricing),lines=[];
 const add=(row,quantity=1)=>{
  const resolved=resolveRetailerPrice(row,settings);
  lines.push({key:row.id,kind:row.kind,name:row.ja,name_en:row.en,quantity,unit_price_jpy:resolved.price_jpy,amount_jpy:resolved.price_jpy===null?null:resolved.price_jpy*quantity,price_source:resolved.source,includes_fitting:true,price_basis:row.kind==='equipment'?'equipment_materials_and_fitting':'vehicle_fitting_labour'});
 };
 for(const item of []){ // Product reference amounts already include fitting.
  const row=RETAILER_PRICES.find(r=>r.kind==='installation'&&r.productKeys.some(k=>k.endsWith(':')?item.key.startsWith(k):k===item.key));
  if(row)add(row,item.quantity);
 }
 // Eligibility is also checked here so a saved hidden option cannot add a charge.
 const canArrange=!profile||profile.installation===true||(profile.installation===false&&profile.outsourceInstallation===true);
 const offered=key=>!profile||(canArrange&&profile.dealerOptions?.[key]===true);
 const ids=[];
 if(state.front==='i-seat')ids.push('i-seat');
 if(state.vehicle!=='super-gl'&&state.ceilingLights)ids.push('ceiling-lights');
 if(state.tailgateLights)ids.push(state.vehicle==='super-gl'?'tailgate-lights-gl':'tailgate-lights-dx');
 if(state.insulation==='installed'&&offered('insulation'))ids.push('insulation');
 if(state.ac==='cube-air460b'&&offered('ac'))ids.push('ac');
 if(state.heater==='webasto'&&offered('heater'))ids.push('heater');
 if(state.electrical==='standard'&&offered('electrical')){
  ids.push('electrical-standard');
  if([200,300].includes(state.batteryAh))ids.push('battery-'+state.batteryAh);
  if([1000,2000].includes(state.inverterW))ids.push('inverter-'+state.inverterW);
 }
 for(const id of ids)add(RETAILER_PRICES.find(r=>r.id===id));
 return lines;
}
