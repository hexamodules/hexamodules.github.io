// Construction family is independent of the selected Hexa / birch panel finish.
export function constructionBadge(module){
 const type=module?.construction;
 if(!['plywood','aluminum'].includes(type))return '';
 return `<span class="construction-badge construction-${type}" lang="en"><i aria-hidden="true"></i>${type==='plywood'?'PLYWOOD':'ALUMINUM'}</span>`;
}
