// Private setup and management data. Never project these fields into a customer profile.
export const NETWORK_WORK_FIELDS=Object.freeze({
 networkModules:'家具モジュールの組み立て・設置',networkInterior:'天井・壁・床などの内装',
 networkElectrical:'電装・サブバッテリー',networkAircon:'エアコン',networkHeater:'FFヒーター',networkInsulation:'断熱施工',networkCustom:'Hexaをベースにしたカスタム'
});
export const NETWORK_FIELDS=Object.freeze({
 installerNetwork:3,workshopLocation:7,workshopAddress:240,networkRegions:300,
 ...Object.fromEntries(Object.keys(NETWORK_WORK_FIELDS).map(key=>[key,3])),
 networkContact:5,networkContactName:100,networkPhone:40,networkEmail:254,networkAvailability:9
});
export const hasInstallerNetwork=v=>v?.installation==='yes'&&v.installerNetwork==='yes';
export function normalizeNetworkValues(values){
 const v={...values};
 v.installerNetwork=hasInstallerNetwork(v)?'yes':'';
 v.workshopLocation=v.workshopLocation==='other'?'other':'company';
 v.networkContact=v.networkContact==='other'?'other':'same';
 v.networkAvailability=v.installerNetwork&&v.networkAvailability==='paused'?'paused':'accepting';
 for(const field of Object.keys(NETWORK_WORK_FIELDS))v[field]=v.installerNetwork&&v[field]==='yes'?'yes':'';
 return v;
}
export function installerNetworkDetails(v){
 if(!hasInstallerNetwork(v))return null;
 return {
  address:v.workshopLocation==='other'?v.workshopAddress:v.address,
  regions:v.networkRegions,
  work:Object.entries(NETWORK_WORK_FIELDS).filter(([key])=>v[key]==='yes').map(([,label])=>label),
  contact:v.networkContact==='other'?{name:v.networkContactName,phone:v.networkPhone,email:v.networkEmail}:{name:v.contactName,phone:v.companyPhone,email:v.enquiryEmail},
  availability:v.networkAvailability==='paused'?'paused':'accepting'
 };
}
export function networkReviewRows(v){
 const network=installerNetworkDetails(v);
 if(!network)return [['施工店ネットワーク','登録を希望しない']];
 return [
  ['施工店ネットワーク','登録を希望する（Hexaの確認・承認後）'],
  ['施工場所',(v.workshopLocation==='other'?'会社所在地と別の施工場所：':'会社所在地と同じ：')+(network.address||'未入力')],
  ['施工の対応地域',network.regions||'未入力'],['対応できる作業',network.work.join(' / ')||'未選択'],
  ['施工相談の窓口',[network.contact.name,network.contact.phone,network.contact.email].filter(Boolean).join(' / ')||'未入力'],
  ['承認後の施工相談受付',network.availability==='paused'?'新規相談の受付を一時停止':'新規相談を受け付ける']
 ];
}
