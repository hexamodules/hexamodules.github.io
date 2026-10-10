import * as THREE from 'three';
export function createStudioScale({scene,stage,onChange}){
 const person=new THREE.Group();person.name='Scale silhouette 1700mm';
 const material=new THREE.MeshBasicMaterial({color:'#b8bcb8',transparent:true,opacity:.26,depthWrite:false,depthTest:false,side:THREE.DoubleSide});
 // Simple neutral standing silhouette, 1700 mm from soles to crown.
 const shape=new THREE.Shape();shape.moveTo(-90,0);for(const [x,y] of [[-115,760],[-155,1200],[-240,820],[-295,840],[-210,1350],[-100,1460],[100,1460],[210,1350],[295,840],[240,820],[155,1200],[115,760],[90,0],[25,0],[0,710],[-25,0],[-90,0]])shape.lineTo(x,y);
 const body=new THREE.Mesh(new THREE.ShapeGeometry(shape),material);body.renderOrder=20;person.add(body);const head=new THREE.Mesh(new THREE.CircleGeometry(110,24),material);head.position.y=1590;head.renderOrder=20;person.add(head);person.position.set(0,0,2350);person.rotation.y=Math.PI/2;scene.add(person);
 const ui=document.createElement('div');ui.className='stage-scale';ui.innerHTML='<span class="scale-dimensions"></span><button type="button" aria-pressed="false">人の目安 170cm</button><p class="rotate-note">横にするとワイドで見られます</p>';stage.append(ui);
 const button=ui.querySelector('button');let enabled=false;button.onclick=()=>{enabled=!enabled;button.setAttribute('aria-pressed',String(enabled));sync();onChange()};
 function sync(){person.visible=enabled&&!document.documentElement.classList.contains('intro-active')&&!document.documentElement.classList.contains('outro-active');onChange()}
 new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['class']});sync();
 const panel=document.querySelector('.configuration'),toggle=document.createElement('button');toggle.className='card-toggle';toggle.textContent='選択肢';toggle.setAttribute('aria-expanded','false');panel.after(toggle);toggle.onclick=()=>{const on=panel.classList.toggle('card-expanded');toggle.setAttribute('aria-expanded',String(on))};
 return {person,dimensions(bounds){if(!bounds)return;const size=bounds[1].map((n,i)=>Math.round(n-bounds[0][i]));ui.querySelector('.scale-dimensions').textContent=`幅 × 奥行 × 高さ: ${size[0]} × ${size[2]} × ${size[1]} mm`;}};
}
