// Shared by setup, the studio and configuration exports. These are enquiries,
// not Hexa-supplied equipment or confirmed installation specifications.
export const DEALER_OPTION_FIELDS = Object.freeze({optionElectrical:'electrical',optionAircon:'ac',optionHeater:'heater',optionInsulation:'insulation'});
export const setupCanArrange=values=>values.installation==='yes'||(values.installation==='no'&&values.outsourceInstallation==='yes');
export const dealerCanArrange=profile=>profile?.installation===true||(profile?.installation===false&&profile.outsourceInstallation===true);
export function setupDealerOptions(values={}) {
 return Object.fromEntries(Object.entries(DEALER_OPTION_FIELDS).map(([field,key])=>[key,setupCanArrange(values)&&values[field]==='yes']));
}
export function dealerOptionAvailability(profile=null) {
 return Object.fromEntries(Object.values(DEALER_OPTION_FIELDS).map(key=>[key,!profile||(dealerCanArrange(profile)&&profile.dealerOptions?.[key]===true)]));
}
export function normalizeDealerOptionState(state,available) {
 return {...state,...(!available.ac?{ac:'none'}:{}),...(!available.heater?{heater:'none'}:{}),...(!available.insulation?{insulation:'none'}:{}),
  ...(!available.electrical||state.electrical!=='standard'?{electrical:'none',batteryAh:100,inverterW:0}:{})};
}
export const dealerOptionNames={ja:{electrical:'電装・サブバッテリー',ac:'エアコン',heater:'FFヒーター',insulation:'断熱施工'},en:{electrical:'Electrical / auxiliary battery',ac:'Air conditioning',heater:'FF heater',insulation:'Insulation installation'}};
export const dealerOptionCopy={
 ja:{badge:'DEALER OPTION',title:'ディーラーオプション',short:'仕様・対応可否・正式価格は取扱店が確認します。',
  scope:'電装・サブバッテリー、エアコン、FFヒーターはHexaの供給品ではありません。断熱施工も取扱店の対応項目です。担当取扱店が機器・材料の選定、調達、施工（外注を含む）を手配し、価格、保証条件と修理窓口をご案内します。',
  example:'表示の機種・構成は参考イメージです。実際の機器・取付方法は取扱店が確認します。',price:'選択した装備のお見積もりは取扱店がご案内します。'},
 en:{badge:'DEALER OPTION',title:'Dealer options',short:'Your dealer confirms specifications, availability and the final price.',
  scope:'Electrical / auxiliary battery systems, air conditioning and FF heaters are not supplied by Hexa. Insulation installation is also a dealer service. Your dealer arranges equipment and material selection, procurement and installation, including subcontractors, and sets prices and explains warranty terms and repair contacts.',
  example:'The equipment and configuration shown are illustrative. Your dealer will confirm the actual equipment and installation method.',price:'Your dealer will provide a quote for your selected equipment.'}
};
export function dealerOptionRequests(state) {
 return Object.keys(dealerOptionNames.ja).filter(key=>key==='electrical'?state.electrical==='standard':state[key]&&state[key]!=='none');
}
export function dealerOptionSummary(state,language='ja') {
 const lang=language==='en'?'en':'ja',requested=dealerOptionRequests(state),copy=dealerOptionCopy[lang];
 return requested.length?'\n'+copy.title+': '+requested.map(key=>dealerOptionNames[lang][key]).join(' / ')+'\n'+copy.example+'\n'+copy.price+'\n'+copy.scope+'\n':'';
}
export function dealerOptionExport(state,estimate=null) {
 return {type:'dealer_option_enquiry',requested:dealerOptionRequests(state),illustration_only:true,price_included_in_reference:false,
  specification_confirmation:'dealer',procurement_and_installation:'arranged_by_dealer_including_subcontractors',warranty_and_repair_contacts:'to_be_explained_by_dealer',hexa_procures_sells_or_installs_equipment:false};
}
