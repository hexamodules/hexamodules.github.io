const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require('/Users/shoichihiguchi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
let root=path.resolve(__dirname,'../..');if(path.basename(root)==='hexa-public')root=path.resolve(root,'../..');
const out=path.join(root,'exports/hexa-studio-blender-20261011/albero-review');
const preview=path.join(out,'preview');
const keys=['side-cabinet','front-module','aluminum-side-cabinet'];
(async()=>{const b=await chromium.connectOverCDP('http://127.0.0.1:9222');const results=[];
try{for(const phase of ['before','after']){
const c=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
try {const p=await c.newPage(),log={phase,errors:[],warnings:[],badResponses:[],tests:[]};
p.on('pageerror',e=>log.errors.push(e.message));p.on('console',m=>{if(m.type()==='warning'&&m.text().includes('Blender furniture'))log.warnings.push(m.text())});p.on('response',r=>{if(r.status()>=400)log.badResponses.push({url:r.url(),status:r.status()})});
await p.route('**/*',r=>{const u=new URL(r.request().url()),name=path.basename(u.pathname);if(u.origin!=='http://127.0.0.1:8767')return r.abort();if(phase==='before'&&name.endsWith('.glb')&&fs.existsSync(path.join(out,'before-glb',name)))return r.fulfill({body:fs.readFileSync(path.join(out,'before-glb',name)),contentType:'model/gltf-binary'});if(name==='app.js') {let s=fs.readFileSync(path.join(preview,'layouts/app.js'),'utf8');assert(s.includes('})().catch(e=>{'));s=s.replace('})().catch(e=>{','window.__test={apply,getState:()=>state,scene,camera,controls,setView,cache,renderer,loadModel};\n})().catch(e=>{');return r.fulfill({body:s,contentType:'text/javascript'});}return r.continue()});
await p.goto('http://127.0.0.1:8767/layouts/');await p.waitForFunction(()=>document.documentElement.dataset.introState==='ready',null,{timeout:60000});await p.waitForLoadState('networkidle');await p.locator('#opening-start').click();await p.waitForFunction(()=>window.__test&&document.documentElement.dataset.introState==='complete',null,{timeout:60000});await p.waitForLoadState('networkidle');
fs.mkdirSync(path.join(out,phase),{recursive:true});
for(const key of keys)for(const finish of ['black','birch']){
 if(log.tests.length){await p.reload();await p.waitForFunction(()=>window.__test,null,{timeout:60000});await p.waitForLoadState('networkidle');}
 await p.evaluate(async({key,finish})=>{await __test.apply({...__test.getState(),front:'none',cab:'none',bed:'none',finish,bedMattress:false,frontMattress:false,frontExpanded:false,rearExpanded:false,expanded:false,storage:false,frontStorage:false,cabStorage:false,flat:false,night:false,[key.includes('bed')?'bed':key.includes('cabinet')?'cab':'front']:key});__test.controls.enableDamping=false},{key,finish});
 await p.waitForLoadState('networkidle');
 const test=await p.evaluate(async key=>{const g=await __test.cache.get(key);let meshes=[];g.traverse(n=>{if(n.isMesh&&n.userData.blenderFurniture)meshes.push({name:n.parent.name,body:n.parent.userData,material:n.material.name})});return {key,glb:!!g.userData.blenderFurniture,variant:g.userData.blenderVariant,delta:g.userData.blenderBoundsDelta,meshes}},key);test.finish=finish;test.views=[];log.tests.push(test);assert(test.glb);assert(test.delta<=2);assert.equal(test.variant,finish==='black'?'hexa':'birch');
 for(const view of ['inside','underside','top-only']){
 await p.evaluate(({view,key})=>{__test.setView(view==='inside'?view:'rear');if(view==='inside'&&key.includes('front')){__test.camera.position.set(400,1250,700);__test.controls.target.set(0,380,2400);__test.controls.update()}__test.renderer.render(__test.scene,__test.camera)}, {view,key});
 if(view!=='inside')await p.evaluate(async({key,view})=>{
 const T=await import('./vendor/three.module.js'),g=await __test.cache.get(key),box=new T.Box3();
 const tops=[];g.traverse(n=>{if(n.isMesh&&n.material.name.startsWith('ALBERO'))tops.push(n.parent)});
 for(const n of tops)box.expandByObject(n);
 const target=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());
 if(view==='top-only'){const keep=new Set();for(const n of tops)n.traverse(m=>{if(m.isMesh)keep.add(m)});__test.scene.traverse(n=>{if(n.isMesh)n.visible=keep.has(n)});}
 __test.controls.minPolarAngle=0;__test.controls.maxPolarAngle=Math.PI;
 __test.controls.target.copy(target);__test.camera.position.copy(target).add(new T.Vector3(-.9,-.65,-1).normalize().multiplyScalar(Math.max(size.x,size.z)*1.25));__test.controls.update();__test.renderer.render(__test.scene,__test.camera);
 },{key,view});
 await p.waitForTimeout(450);
 test.views.push(await p.evaluate(view=>({view,position:__test.camera.position.toArray(),target:__test.controls.target.toArray(),up:__test.camera.up.toArray()}),view));
 await p.screenshot({path:path.join(out,phase,`${key}-${finish}-${view}.png`)});
 }
 console.log(phase,key,finish,test.delta);fs.writeFileSync(path.join(out,'capture-progress.json'),JSON.stringify(log,null,2));
}
if(phase==='after') {log.all38=await p.evaluate(async()=>{const keys=['front-module','aluminum-front-kitchen','i-seat','seat','side-cabinet','simple-side-cabinet','aluminum-side-cabinet','active-side-cabinet','slide-bed','lounge-slide-bed','aluminum-bed','lounge-bed','two-side-bed','lounge-fillers','centre-mattresses','front-module-rear-20','front-module-rear-114','front-module-rear-130','front-module-rear-140'];let out=[];for(const finish of ['birch','black']){await __test.apply({...__test.getState(),finish});for(const key of keys){const g=await __test.loadModel(key);out.push({key,finish,glb:!!g.userData.blenderFurniture,delta:g.userData.blenderBoundsDelta,variant:g.userData.blenderVariant})}}return out});assert.equal(log.all38.length,38);assert(log.all38.every(x=>x.glb&&x.delta<=2));}
results.push(log);fs.writeFileSync(path.join(out,'capture-results.json'),JSON.stringify(results,null,2));assert.deepEqual(log.errors,[]);assert.deepEqual(log.warnings,[]);assert.deepEqual(log.badResponses,[]);
}finally{await c.close()}
}}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
