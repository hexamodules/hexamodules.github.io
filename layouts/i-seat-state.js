import {MATTRESS_COLORS,bedMattressEnabled} from './mattress-state.js?v=2';
export const I_SEAT_POSES=[
 {id:'forward',defaultSlide:0,ja:'前向き',en:'Forward-facing'},
 {id:'rearward',defaultSlide:120,ja:'後ろ向き',en:'Rear-facing'},
 {id:'flat-front',defaultSlide:-120,ja:'フラット・前方',en:'Flat · front extension'}
];
// Flat-front rear edge = -237.5 mm relative to the fixed cushion centre.
// At the rearmost slide (-120), it meets the aluminium bed front at Z1800.
export const I_SEAT_MOUNT={position_mm:[0,0,1800-(-237.5)-(-120)],reference_bed:'aluminum-bed',reference_bed_front_mm:1800,reference_pose:'flat-front',reference_slide_mm:-120,seat_rear_edge_local_mm:-237.5};
export const iSeatDefaultSlide=pose=>(I_SEAT_POSES.find(p=>p.id===pose)||I_SEAT_POSES[0]).defaultSlide;
export const iSeatColor=s=>MATTRESS_COLORS.find(c=>c.id===s.iSeatColor)||MATTRESS_COLORS[1];
export const iSeatInstallationNote=language=>language==='en'?'For campervans registered in Japan under the 8-number classification only. We will review your layout and confirm installation feasibility when preparing your quotation.':'8ナンバーのキャンピングカー仕様専用です。取付可否は、お見積もり時にレイアウトを確認のうえご案内します。';
// The forward backrest clears the 80 mm aluminium-bed mattress at slide 0
// (12.6 mm minimum fore–aft gap across the mattress height). Keep the physical
// 240 mm travel; limit the preview only for this verified combination.
export const iSeatSlideRange=s=>[s.iSeatPose==='forward'&&s.bed==='aluminum-bed'&&bedMattressEnabled(s)?0:-120,120];
export const iSeatSlide=s=>{const [min,max]=iSeatSlideRange(s);return s.iSeatSlide!==null&&s.iSeatSlide!==undefined&&s.iSeatSlide!==''&&Number.isFinite(Number(s.iSeatSlide))?Math.max(min,Math.min(max,Math.round(Number(s.iSeatSlide)/20)*20)):iSeatDefaultSlide(s.iSeatPose)};
export function normalizeISeat(s){
 const pose=s.iSeatPose==='flat-rear'?'flat-front':I_SEAT_POSES.some(p=>p.id===s.iSeatPose)?s.iSeatPose:'forward';
 const next={...s,iSeatPose:pose,iSeatSlide:pose!==s.iSeatPose?iSeatDefaultSlide(pose):s.iSeatSlide};
 // Old shared layouts keep their displayed seat colour once, then the seat
 // and mattress colours remain independent as furniture is selected later.
 const color=s.iSeatMatchMattress&&bedMattressEnabled(s)?s.bedMattressColor:s.iSeatColor;
 return {...next,iSeatSlide:iSeatSlide(next),iSeatColor:MATTRESS_COLORS.some(c=>c.id===color)?color:'light-green',iSeatMatchMattress:false};
}
export function iSeatSpecification(s){return s.front==='i-seat'?{manufacturer:'WORKVOX',product:'i-seat First REVO FW',width_mm:1400,model:'High',flat_length_mm:950,flat_top_height_mm:390,preview_pose:s.iSeatPose,mounting_reference:I_SEAT_MOUNT,slide_from_mount_centre_mm:iSeatSlide(s),slide_range_mm:[-120,120],slide_step_mm:20,slide_positions:13,upholstery_color:iSeatColor(s).id,match_bed_mattress:s.iSeatMatchMattress,price_status:'quoted_separately_by_retailer',included_in_hexa_reference_total:false,geometry_basis:'published_dimensions_and_photo_estimated_details',headrests:'optional_equipment_shown_in_upright_previews',fit_requires_confirmation:true,upholstery_requires_confirmation:true}:null;}
