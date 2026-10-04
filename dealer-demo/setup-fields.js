import {NETWORK_WORK_FIELDS,hasInstallerNetwork} from '../layouts/dealer-network.js?v=2';
import {pricingSetupErrors} from './setup-pricing.js?v=2';
export const normaliseInput=value=>String(value||'').normalize('NFKC').trim().replace(/[ー−‐‑‒–—―]/g,'-');
const validPhone=value=>{const phone=normaliseInput(value);return /^[+()\d\s.-]+$/.test(phone)&&phone.replace(/\D/g,'').length>=6};
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export function postcodeKey(value,market='jp'){
 const text=normaliseInput(value);
 return (market==='au'?/^\d{4}$/:/^\d{3}-?\d{4}$/).test(text)?text.replace('-',''):'';
}
export function setupErrors(values){
 const errors={};
 const required={dealerName:'取扱店・ブランド名',companyName:'会社名・屋号',postalCode:'郵便番号',address:'所在地',companyPhone:'会社の電話番号',contactName:'担当者名',website:'ホームページのURL',enquiryEmail:'送付先メールアドレス'};
 for(const [key,label]of Object.entries(required))if(!String(values[key]||'').trim())errors[key]=label+'を入力してください。';
 if(!['yes','no'].includes(values.installation))errors.installation='施工対応を選択してください。';
 if(!['jp','au'].includes(values.market))errors.market='対応地域を選択してください。';
 if(values.postalCode&&!postcodeKey(values.postalCode,values.market))errors.postalCode=values.market==='au'?'郵便番号を4桁で入力してください。':'郵便番号を7桁で入力してください。';
 if(values.companyPhone&&!validPhone(values.companyPhone))errors.companyPhone='電話番号を数字で入力してください。ハイフンや国番号も使えます。';
 if(values.website)try{if(!['https:','http:'].includes(new URL(values.website).protocol))throw Error()}catch{errors.website='http:// または https:// で始まるホームページURLを入力してください。'}
 if(values.enquiryEmail&&!validEmail(values.enquiryEmail))errors.enquiryEmail='メールアドレスを確認してください。';
 Object.assign(errors,networkErrors(values),pricingSetupErrors(values));
 return errors;
}
export function networkErrors(values){
 const errors={};if(!hasInstallerNetwork(values))return errors;
 if(!String(values.networkRegions||'').trim())errors.networkRegions='施工相談を受け付ける地域を入力してください。';
 if(!Object.keys(NETWORK_WORK_FIELDS).some(key=>values[key]==='yes'))errors.networkModules='対応できる作業を1つ以上選択してください。';
 if(values.workshopLocation==='other'&&!String(values.workshopAddress||'').trim())errors.workshopAddress='工場・施工場所の住所を入力してください。';
 if(values.networkContact==='other'){
  for(const [key,label] of Object.entries({networkContactName:'施工相談の担当者',networkPhone:'施工相談の電話番号',networkEmail:'施工相談のメールアドレス'}))if(!String(values[key]||'').trim())errors[key]=label+'を入力してください。';
  if(values.networkPhone&&!validPhone(values.networkPhone))errors.networkPhone='施工相談の電話番号を確認してください。';
  if(values.networkEmail&&!validEmail(values.networkEmail))errors.networkEmail='施工相談のメールアドレスを確認してください。';
 }
 return errors;
}
