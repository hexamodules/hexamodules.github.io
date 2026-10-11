const fs=require('fs'),path=require('path');
const {chromium}=require('/Users/shoichihiguchi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
let root=path.resolve(__dirname,'../..');if(path.basename(root)==='hexa-public')root=path.resolve(root,'../..');
const out=path.join(root,'exports/hexa-studio-blender-20261011/fridge-apron-review'),phase=process.argv[2]||'before';
(async()=>{const b=await chromium.connectOverCDP('http://127.0.0.1:9222');const c=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});let errors=[],shots=[];
try{const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});await p.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:8767'?r.continue():r.abort());await p.goto('http://127.0.0.1:8767/viewer.html');await p.waitForFunction(()=>window.ready);
fs.mkdirSync(path.join(out,phase+'-photos'),{recursive:true});
for(const key of ['front-module','front-module-rear-20','front-module-rear-114','front-module-rear-130','front-module-rear-140']){
await p.evaluate(async({phase,key})=>{await load(`./${phase}/${key}-hexa.glb`)},{phase,key});
for(const view of ['whole','aisle','below','front','low']){const camera=await p.evaluate(({view,key,phase})=>shot(view,`${key} / Hexa / ${phase} / ${view}`),{view,key,phase});await p.screenshot({path:path.join(out,phase+'-photos',`${key}-${view}.png`)});shots.push({key,view,camera});}
console.log(phase,key);
}fs.writeFileSync(path.join(out,phase+'-capture.json'),JSON.stringify({errors,shots},null,2));if(errors.length)throw Error(JSON.stringify(errors));
}finally{await c.close();await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
