// Owner-approved starting package. One place to change the furniture/interior defaults.
export const BASE_CONFIGURATION=Object.freeze({
 furniture:{front:'i-seat',bed:'aluminum-bed',cab:'aluminum-side-cabinet',finish:'birch',bedMattress:true},
 dx:{floor:'teak',ceiling:'white-ash',wall:'white',panel:'auto'},
 'super-gl':{floor:'teak'}
});
export function startingConfiguration(state){return {...state,...BASE_CONFIGURATION.furniture,...BASE_CONFIGURATION[state.vehicle||'dx']};}
export function hasSavedConfiguration(search){const q=new URLSearchParams(search);return ['front','bed','cab','floor','ceiling','wall','panel','twi_ceiling','complete','layout'].some(k=>q.has(k));}

// Empty-slot anchors derived from the base placements in configurations.json and mesh bounds.
export const PIN_ANCHORS={"floor":[126.397,-37.066,1429.246],"ceiling":[-25.0,1356.439,1465.711],"wall":[-755.492,1080.29,783.946],"seat":[51.285,899.624,2157.279],"kitchen":[483.5,789.944,2421.252],"bed":[-406.0,273.47,883.5],"left":[578.5,671.236,700.9],"right":[-406.0,273.47,883.5],"mattress":[-406.0,363.47,683.5],"lights":[-25.0,1356.439,500]};
