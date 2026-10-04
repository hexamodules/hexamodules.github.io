// Shared order rules: independent of rendering and preview poses.
export const MATTRESS_BEDS=['slide-bed','lounge-slide-bed','aluminum-bed','lounge-bed','two-side-bed'];
export const MATTRESS_COLORS=[
 {id:'beige',ja:'ベージュ',en:'Beige',hex:'#c5b69e'},
 {id:'light-green',ja:'ライトグリーン',en:'Light green',hex:'#94977d'},
 {id:'light-brown',ja:'ライトブラウン',en:'Light brown',hex:'#9c8978'},
 {id:'dark-brown',ja:'ダークブラウン',en:'Dark brown',hex:'#524945'},
 {id:'black',ja:'ブラック',en:'Black',hex:'#323237'}
].map(c=>({...c,image:`assets/mattress-colors/${c.id}.jpg`}));
export const mattressColor=(s,slot)=>MATTRESS_COLORS.find(c=>c.id===s[slot+'MattressColor'])||MATTRESS_COLORS[1];
export const mattressIncluded=s=>s.bed==='two-side-bed';
export const bedMattressEnabled=s=>MATTRESS_BEDS.includes(s.bed)&&(mattressIncluded(s)||s.bedMattress===true);
export const frontMattressEnabled=s=>s.front==='front-module'&&s.frontMattress===true;
export function normalizeMattresses(s){
 return {...s,bedMattress:MATTRESS_BEDS.includes(s.bed)&&!mattressIncluded(s)&&s.bedMattress===true,frontMattress:frontMattressEnabled(s),bedMattressColor:mattressColor(s,'bed').id,frontMattressColor:mattressColor(s,'front').id};
}
export function mattressSpecification(s){
 return [bedMattressEnabled(s)?{module:s.bed,slot:'bed',included:mattressIncluded(s)}:null,frontMattressEnabled(s)?{module:s.front,slot:'front',included:false}:null].filter(Boolean).map(item=>({...item,thickness_mm:80,core:'urethane',cover:'fabric',color:mattressColor(s,item.slot).id,price_status:item.included?'included':'reference_price'}));
}
