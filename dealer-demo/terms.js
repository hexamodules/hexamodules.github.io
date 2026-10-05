import {readSetupDraft} from '../layouts/dealer-preview.js?v=20261005';
import {RETAILER_PRICES,resolveRetailerPrice} from '../layouts/retailer-prices.js?v=20261005';
import {setupErrors} from './setup-fields.js?v=20261005';
import {setupDealerOptions,dealerOptionNames,setupCanArrange} from '../layouts/dealer-option-policy.js?v=20261005';
import {networkReviewRows} from '../layouts/dealer-network.js?v=2';
const draft=readSetupDraft(),values=draft?.values;
if(!values||Object.keys(setupErrors(values)).length){document.querySelector('#setup-incomplete').hidden=false}
else{
 document.querySelector('#setup-review').hidden=false;
 const rows=[['取扱店・ブランド名',values.dealerName],['施工対応',values.installation==='yes'?'組み立て・設置まで行う':'取扱・相談のみ'],['会社名・屋号',values.companyName],['対応地域',values.market==='au'?'オーストラリア':'日本'],['郵便番号',values.postalCode],['所在地',values.address],['会社の電話番号',values.companyPhone],['担当者',values.contactName],['部署・役職',values.contactDepartment],['組み込み先URL',values.website],['受信メール',values.enquiryEmail]];
 rows.splice(2,0,['ディーラーオプション',Object.entries(setupDealerOptions(values)).filter(([,on])=>on).map(([key])=>dealerOptionNames.ja[key]).join(' / ')||'表示しない']);
 rows.splice(2,0,['Hexaをベースにしたカスタム相談',setupCanArrange(values)&&values.customSupport==='yes'?'対応する':'対応しない']);
 rows.splice(2,0,['提携先への施工手配',values.outsourceInstallation==='yes'?'対応する':'対応しない'],...networkReviewRows(values));
 const list=document.querySelector('#setup-review-fields');
 for(const [label,value]of rows){if(!value)continue;const group=document.createElement('div'),term=document.createElement('dt'),detail=document.createElement('dd');term.textContent=label;detail.textContent=value;group.append(term,detail);list.append(group)}
}
