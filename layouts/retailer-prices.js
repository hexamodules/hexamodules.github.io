import {LOCKED_REFERENCE} from './reference-baseline.js?v=20261005';
// Public selection labels only. Pricing is unavailable.
export const RETAILER_PRICE_REVISION=LOCKED_REFERENCE.revision;
const install=(id,ja,en,productKeys)=>({id,ja,en,kind:'installation',productKeys});
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
  ['ceiling-lights','天井ダウンライト（6灯）','Ceiling downlights · six',null,null],
  ['tailgate-lights-dx','DX バックドアライト（2灯）','DX tailgate lights · two',null,null],
  ['tailgate-lights-gl','スーパーGL バックドアライト（2灯）','Super GL tailgate lights · two',null,null],
  ['insulation','断熱施工','Insulation installation',null,'insulation'],
  ['electrical-standard','電装標準（走行40A・外部40A・100Ah）','Standard electrical system · 40A / 40A / 100Ah',null,'electrical'],
  ['battery-200','200Ahへの変更（標準100Ahとの差額）','200Ah upgrade · additional to 100Ah',null,'electrical'],
  ['battery-300','300Ahへの変更（標準100Ahとの差額）','300Ah upgrade · additional to 100Ah',null,'electrical'],
  ['inverter-1000','1000Wインバーター（追加）','1000W inverter · additional',null,'electrical'],
  ['inverter-2000','2000Wインバーター（追加）','2000W inverter · additional',null,'electrical'],
  ['ac','エアコン CUBE AIR460B（配管カバー付き）','CUBE AIR460B air conditioning with pipe cover',null,'ac'],
  ['i-seat','i seat（幅1400mm）','i seat · 1400 mm',null,null],
  ['heater','FFヒーター（ベバスト）','Webasto FF heater',null,'heater'],
 ].map(([id,ja,en,price_jpy,availability])=>({id,ja,en,kind:'equipment',availability})),
];
export function normalizeRetailerPrices(){return {};}
export function resolveRetailerPrice(){return {price_jpy:null,source:'unavailable'};}
export function retailerPriceLines(state,parts,profile=null){
 const lines=[];
 const add=(row,quantity=1)=>{
  lines.push({key:row.id,kind:row.kind,name:row.ja,name_en:row.en,quantity});
 };
 // Preserve which options a dealer offers.
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
