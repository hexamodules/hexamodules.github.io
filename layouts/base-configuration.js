// Owner-approved starting package. One place to change the furniture/interior defaults.
export const BASE_CONFIGURATION=Object.freeze({
 furniture:{front:'i-seat',bed:'aluminum-bed',cab:'aluminum-side-cabinet',finish:'birch'},
 dx:{floor:'teak',ceiling:'white-ash',wall:'white',panel:'auto'},
 'super-gl':{floor:'teak'}
});
export function startingConfiguration(state){return {...state,...BASE_CONFIGURATION.furniture,...BASE_CONFIGURATION[state.vehicle||'dx']};}
export function hasSavedConfiguration(search){const q=new URLSearchParams(search);return ['front','bed','cab','floor','ceiling','wall','panel','twi_ceiling','complete','layout'].some(k=>q.has(k));}
