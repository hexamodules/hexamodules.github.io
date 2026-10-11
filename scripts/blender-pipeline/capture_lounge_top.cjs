const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require('/Users/shoichihiguchi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
let root=path.resolve(__dirname,'../..');if(path.basename(root)==='hexa-public')root=path.resolve(root,'../..');
const out=path.join(root,'exports/hexa-studio-blender-20261011/lounge-top-review');
const preview=path.join(out,'studio-snapshot');
const keys=['lounge-bed'];
(async()=>{const b=await chromium.connectOverCDP('http://127.0.0.1:9222');const results=[];
try{for(const phase of ['before','after']){
const c=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
try {const p=await c.newPage(),log={phase,errors:[],warnings:[],badResponses:[],tests:[]};
p.on('pageerror',e=>log.errors.push(e.message));p.on('console',m=>{if(m.type()==='warning'&&m.text().includes('Blender furniture'))log.warnings.push(m.text())});p.on('response',r=>{if(r.status()>=400)log.badResponses.push({url:r.url(),status:r.status()})});
await p.route('**/*',r=>{const u=new URL(r.request().url()),name=path.basename(u.pathname);if(u.origin!=='http://127.0.0.1:8767')return r.abort();if(name.endsWith('.glb')||u.pathname.includes('/blender/tex/')){const source=path.join(root,'exports/hexa-studio-blender-20261011/shared-textures-hexafix-20261011-'+(phase==='before'?'3':'4')+'/assets/blender',u.pathname.includes('/tex/')?'tex/'+name:name);if(fs.existsSync(source))return r.fulfill({body:fs.readFileSync(source),contentType:name.endsWith('.glb')?'model/gltf-binary':'image/webp'});}if(name==='app.js') {let s=fs.readFileSync(path.join(preview,'app.js'),'utf8');assert(s.includes('})().catch(e=>{'));s=s.replace('})().catch(e=>{','window.__test={apply,getState:()=>state,scene,camera,controls,setView,cache,renderer,loadModel};\n})().catch(e=>{');return r.fulfill({body:s,contentType:'text/javascript'});}return r.continue()});
await p.goto('http://127.0.0.1:8767/layouts/');await p.waitForFunction(()=>document.documentElement.dataset.introState==='ready',null,{timeout:60000});await p.waitForLoadState('networkidle');await p.locator('#opening-start').click();await p.waitForFunction(()=>window.__test&&document.documentElement.dataset.introState==='complete',null,{timeout:60000});await p.waitForLoadState('networkidle');
fs.mkdirSync(path.join(out,phase),{recursive:true});
for(const key of keys)for(const finish of ['black'])for(const opened of [false,true]){
 await p.evaluate(async({key,finish,opened})=>{await __test.apply({...__test.getState(),front:'none',cab:'none',bed:'none',finish,bedMattress:false,frontMattress:false,frontExpanded:false,rearExpanded:false,expanded:false,storage:opened,frontStorage:false,cabStorage:false,flat:false,night:false,[key.includes('bed')?'bed':key.includes('cabinet')?'cab':'front']:key});__test.controls.enableDamping=false},{key,finish,opened});
 await p.waitForLoadState('networkidle');
 const test=await p.evaluate(async key=>{const g=await __test.cache.get(key);let meshes=[];g.traverse(n=>{if(n.isMesh&&n.userData.blenderFurniture)meshes.push({name:n.parent.name,body:n.parent.userData,material:n.material.name})});return {key,glb:!!g.userData.blenderFurniture,variant:g.userData.blenderVariant,delta:g.userData.blenderBoundsDelta,meshes}},key);test.finish=finish;test.opened=opened;test.views=[];log.tests.push(test);assert(test.glb);assert(test.delta<=2);assert.equal(test.variant,finish==='black'?'hexa':'birch');
 for(const view of ['side','inside','rear']){
 await p.evaluate(({view,key})=>{__test.setView(view);if(view==='inside'&&key.includes('front')){__test.camera.position.set(400,1250,700);__test.controls.target.set(0,380,2400);__test.controls.update()}__test.renderer.render(__test.scene,__test.camera)}, {view,key});
 await p.waitForTimeout(450);
 test.views.push(await p.evaluate(view=>({view,position:__test.camera.position.toArray(),target:__test.controls.target.toArray(),up:__test.camera.up.toArray()}),view));
 await p.screenshot({path:path.join(out,phase,`${key}-${finish}-${opened?'open':'closed'}-${view}.png`)});
 }
 console.log(phase,key,finish,test.delta);fs.writeFileSync(path.join(out,'capture-progress.json'),JSON.stringify(log,null,2));
}
results.push(log);fs.writeFileSync(path.join(out,'capture-results.json'),JSON.stringify(results,null,2));assert.deepEqual(log.errors,[]);assert.deepEqual(log.warnings,[]);assert.deepEqual(log.badResponses,[]);
}finally{await c.close()}
}}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
