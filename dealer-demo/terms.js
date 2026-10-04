import {readSetupDraft} from '../layouts/dealer-preview.js?v=10';
import {RETAILER_PRICES,resolveRetailerPrice} from '../layouts/retailer-prices.js?v=2';
import {setupErrors} from './setup-fields.js?v=5';
import {setupDealerOptions,dealerOptionNames,setupCanArrange} from '../layouts/dealer-option-policy.js?v=4';
import {networkReviewRows} from '../layouts/dealer-network.js?v=2';
const draft=readSetupDraft(),values=draft?.values;
if(!values||Object.keys(setupErrors(values)).length){document.querySelector('#setup-incomplete').hidden=false}
else{
 document.querySelector('#setup-review').hidden=false;
 const rows=[['取扱店・ブランド名',values.dealerName],['施工対応',values.installation==='yes'?'組み立て・設置まで行う':'取扱・相談のみ'],['会社名・屋号',values.companyName],['対応地域',values.market==='au'?'オーストラリア':'日本'],['郵便番号',values.postalCode],['所在地',values.address],['会社の電話番号',values.companyPhone],['担当者',values.contactName],['部署・役職',values.contactDepartment],['組み込み先URL',values.website],['受信メール',values.enquiryEmail]];
 rows.splice(2,0,['ディーラーオプション',Object.entries(setupDealerOptions(values)).filter(([,on])=>on).map(([key])=>dealerOptionNames.ja[key]).join(' / ')||'表示しない']);
 rows.splice(2,0,['Hexaをベースにしたカスタム相談',setupCanArrange(values)&&values.customSupport==='yes'?'対応する':'対応しない']);
 rows.splice(2,0,['提携先への施工手配',values.outsourceInstallation==='yes'?'対応する':'対応しない'],...networkReviewRows(values));
 rows.push(['日額人件費',values.laborDailyCost?Number(values.laborDailyCost).toLocaleString('ja-JP')+'円／人・8時間換算':'未設定'],['仕入れ方',values.procurementMode==='assembled'?'組立済みモジュール':'フラットパック']);
 const available=setupDealerOptions(values);
 for(const row of RETAILER_PRICES){
  if(row.availability&&!available[row.availability])continue;
  const r=resolveRetailerPrice(row,values.pricing);
  rows.push([(row.kind==='installation'?'施工費：':'装備：')+row.ja,(r.price_jpy===null?'未設定':r.price_jpy.toLocaleString('ja-JP')+'円（税込）')+(r.source==='retailer'?' ／ 取扱店設定':' ／ Hexa参考')]);
 }
 const list=document.querySelector('#setup-review-fields');
 for(const [label,value]of rows){if(!value)continue;const group=document.createElement('div'),term=document.createElement('dt'),detail=document.createElement('dd');term.textContent=label;detail.textContent=value;group.append(term,detail);list.append(group)}
}
