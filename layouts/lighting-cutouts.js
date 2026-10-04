// Customer selections are not manufacturing approval. The dealer confirms the
// final panel specification before sending an order to Hexa.
const has=value=>Boolean(value&&value!=='none'&&value!=='auto');
export function lightingCutoutSpecification(state){
 const gl=state.vehicle==='super-gl';
 const ceiling=!gl&&has(state.ceiling),tailgate=!gl&&(has(state.wall)||has(state.panel));
 return {
  status:'customer_request_awaiting_dealer_confirmation',ready_for_manufacture:false,
  confirmation_by:'dealer',panel_cutting_by:'Hexa',light_fitting_by:'dealer_or_installer',
  ceiling:{panel_selected:ceiling,cutouts_requested:ceiling&&!!state.ceilingLights,count:ceiling&&state.ceilingLights?6:0,
   ...(gl?{not_applicable:'twi_ceiling_uses_standard_integrated_lighting'}:{})},
  tailgate:{panel_selected:tailgate,cutouts_requested:tailgate&&!!state.tailgateLights,count:tailgate&&state.tailgateLights?2:0,
   ...(gl?{not_applicable:'vehicle_panel_fitting_to_be_confirmed_by_installer',light_fitting_requested:!!state.tailgateLights}:{})}
 };
}
export function lightingCutoutSummary(state,language='ja'){
 const en=language==='en',spec=lightingCutoutSpecification(state),gl=state.vehicle==='super-gl';
 const label=part=>!part.panel_selected?(en?'Panel not selected':'パネル未選択'):part.cutouts_requested?(en?`Cutouts requested (${part.count})`:`開口あり（${part.count}か所）`):(en?'No cutouts':'開口なし');
 return [en?'Light cutouts — request, awaiting dealer confirmation':'ライト用開口 — 希望仕様・取扱店確認前',
  (en?'Ceiling: ':'天井: ')+(gl?(en?'TWI ceiling has standard integrated lighting':'TWI天井の標準付属照明'):label(spec.ceiling)),
  (en?'Tailgate: ':'バックドア: ')+(gl?(state.tailgateLights?(en?'Vehicle-panel light fitting requested; installer to confirm':'車体パネルへの取付希望・施工店で確認'):(en?'No light fitting requested':'ライト取付希望なし')):label(spec.tailgate)),
  en?'The dealer must confirm the final cutout specification with the customer and send it to Hexa before panel manufacture. Light fittings and installation are arranged by the dealer.':'取扱店がお客様と開口の有無・仕様を最終確認し、Hexaへ確定情報を伝えます。ライト本体の手配・取付は取扱店が行います。'
 ].join('\n');
}
