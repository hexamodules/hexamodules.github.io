export function createPricingSetup(form){
 const host=form.querySelector('#retailer-price-settings');
 host.textContent='取扱店向けの価格画面は準備中です。価格情報は、登録後にご案内します。 / Dealer pricing is being prepared. Price information will be provided after registration.';
 return {read:()=>({}),update:()=>{}};
}
export function pricingSetupErrors(){return {};}
