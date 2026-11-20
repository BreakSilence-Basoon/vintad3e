import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';

const apps = [
  ['portal','/', 'VINTAD3E_PORTAL_FIXTURE'],
  ['timetable',process.env.SMOKE_TIMETABLE_PATH || '/?view=history','VINTAD3E_TIMETABLE_FIXTURE'],
  ['apparel','/','VINTAD3E_APPAREL_FIXTURE'],
  ['supporters','/coupon','VINTAD3E_SUPPORTERS_FIXTURE'],
  ['partners','/','VINTAD3E_PARTNERS_FIXTURE'],
  ['library','/','VINTAD3E_LIBRARY_FIXTURE'],
  ['floor','/','VINTAD3E_FLOOR_FIXTURE'],
  ['creative','/','VINTAD3E_CREATIVE_FIXTURE'],
  ['admin','/members','VINTAD3E_ADMIN_FIXTURE'],
];
async function freePort() { const s=createServer(); s.listen(0,'127.0.0.1'); await once(s,'listening'); const p=s.address().port; await new Promise(r=>s.close(r)); return p; }
const requested=process.argv.slice(2);
if (requested.some(name => !apps.some(app => app[0] === name))) throw new Error('Unknown app');
const browser=await chromium.launch({headless:true, channel:'chrome', args:['--no-sandbox']});
let bad=false;
try {
 for (const [name,path,flag] of apps) {
  if (process.argv.length>2 && !process.argv.slice(2).includes(name)) continue;
  const port=await freePort(), origin=`http://127.0.0.1:${port}`;
  const cwd=resolve(`apps/${name}-web`);
  const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)], {cwd, env:{...process.env,NODE_ENV:'development',[flag]:'1',[`${flag}_ORIGIN`]:origin},stdio:'ignore'});
  try {
   let ready=false;
   for(let i=0;i<120;i++){if(child.exitCode!==null)break;try {const r=await fetch(origin,{redirect:'manual'});if(r.status<500){ready=true;break;}} catch {} await delay(250);}
   if(!ready)throw new Error('server did not start');
   for(const [width,height] of [[1440,900],[390,844]]){
    const context=await browser.newContext({viewport:{width,height}}); const page=await context.newPage(); const errors=[];
    page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text()+' '+m.location().url);});
    try {
     const response=await page.goto(origin+path,{waitUntil:'networkidle',timeout:60000});
     if(!response || !response.ok()) throw new Error(`HTTP ${response?.status() ?? 'no response'}`);
     if(name==='portal'||name==='library'){await page.getByRole('button',{name:'회사 계정으로 로그인'}).click(); await page.waitForURL(origin+'/');}
     await page.waitForTimeout(500);
     if (process.env.SMOKE_SCREENSHOT_PREFIX) await page.screenshot({path:`${process.env.SMOKE_SCREENSHOT_PREFIX}${name}-${width}.png`});
     const result=await page.evaluate(()=>({title:document.title, text:document.body.innerText.trim().length, viewport:innerWidth, scroll:document.documentElement.scrollWidth, clipped:[...document.querySelectorAll('h1,h2,h3,button,a')].filter(e=>{const s=getComputedStyle(e); if(e.matches('.topbar__logout')&&!e.closest('.is-confirming')){const label=e.querySelector('.topbar__logout-label');return label && label.clientWidth>2 && label.scrollWidth>label.clientWidth+2;} return e.clientWidth>2 && e.scrollWidth>e.clientWidth+2 && s.overflowX==='hidden' && s.textOverflow!=='ellipsis';}).map(e=>(e.innerText||'').trim().slice(0,80)).filter(Boolean).slice(0,10)}));
     if(!result.text || result.scroll>width+1 || result.clipped.length || errors.length)bad=true;
     console.log(JSON.stringify({app:name,width,...result,errors}));
    }finally{await context.close();}
   }
  }catch(e){bad=true;console.log(JSON.stringify({app:name,error:e.message}));}
  finally{child.kill('SIGTERM');if(child.exitCode===null)await Promise.race([once(child,'exit'),delay(5000)]);if(child.exitCode===null)child.kill('SIGKILL');}
 }
}finally{await browser.close();}
if(bad)process.exitCode=1;
