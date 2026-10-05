export function createPricingSetup(form){
 const host=form.querySelector('#retailer-price-settings');
 host.innerHTML='<div class="retailer-labor-settings"><label>家具モジュールの仕入れ方<select name="procurementMode"><option value="flat">フラットパック</option><option value="assembled">組立済みモジュール</option></select></label><label>1人あたりの日額人件費（円）<input name="laborDailyCost" type="number" min="0" max="1000000" step="1" inputmode="numeric" value="15000" required></label><p class="section-help">Hexaの承認後、ここで選んだ仕入れ方で見積書が届きます。</p></div>';
 return {read:()=>({}),update:()=>{}};
}
export function pricingSetupErrors(values){
 const errors={};
 if(!/^\d+$/.test(String(values.laborDailyCost??''))||Number(values.laborDailyCost)>1000000)errors.laborDailyCost='日額人件費を0以上100万円以下の整数で入力してください。';
 if(!['flat','assembled'].includes(values.procurementMode))errors.procurementMode='仕入れ方を選択してください。';
 return errors;
}
