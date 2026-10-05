import {dealerCanArrange} from './dealer-option-policy.js?v=20261005';
// A dealer capability, including work arranged through an installation partner.
export const isCustomDealer=profile=>dealerCanArrange(profile)&&profile.customSupport===true;
export const customDealerCopy={
 ja:{badge:'カスタム対応店',description:'Hexaをベースにしたカスタムのご相談に対応しています。ご希望をお知らせください。対応内容・費用は、取扱店より個別にご案内します。'},
 en:{badge:'Custom dealer',description:'This dealer welcomes customisation enquiries based on Hexa. Tell us what you have in mind. The dealer will confirm the available work and provide a separate quote.'}
};
export function createCustomDealerBadge(language='ja'){
 const badge=document.createElement('span');badge.className='custom-dealer-badge';badge.setAttribute('data-module-i18n','');
 badge.innerHTML='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round" aria-hidden="true"><path d="m10 1.7 7.2 4.15v8.3L10 18.3l-7.2-4.15v-8.3z"/><path d="M10 6v8M6 10h8"/></svg><span></span>';
 updateCustomDealerBadge(badge,language);return badge;
}
export function updateCustomDealerBadge(badge,language='ja'){
 const copy=customDealerCopy[language==='en'?'en':'ja'];badge.querySelector('span').textContent=copy.badge;badge.title=copy.description;
}
