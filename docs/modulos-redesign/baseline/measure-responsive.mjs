import { spawn } from "node:child_process";
import fs from "node:fs";
const SP = process.argv[2];
const CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const chrome = spawn(CH, ["--headless=new","--disable-gpu","--hide-scrollbars","--force-prefers-reduced-motion","--remote-debugging-port=9333",`--user-data-dir=${SP}/chrome-profile`,"about:blank"],{stdio:"ignore"});
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
let targets; for (let i=0;i<40;i++){ try{ targets = await (await fetch("http://127.0.0.1:9333/json")).json(); if(targets.length) break;}catch{} await sleep(250); }
const page = targets.find(t=>t.type==="page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener("open",r));
let id=0; const pending=new Map();
ws.addEventListener("message",e=>{const m=JSON.parse(e.data); if(m.id&&pending.has(m.id)){pending.get(m.id)(m); pending.delete(m.id);}});
const send=(method,params={})=>new Promise(res=>{const i=++id; pending.set(i,res); ws.send(JSON.stringify({id:i,method,params}));});
await send("Page.enable");

const MEASURE = `(() => {
  const r = (el)=> el ? (b=>({x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)}))(el.getBoundingClientRect()) : null;
  const frame = document.querySelector('[data-template]');
  const nav = document.querySelector('nav[aria-label="Índice de bloques"]');
  const scroller = (frame ? frame.querySelector('.overflow-y-auto') : document.querySelector('.overflow-y-auto.h-full, [class*="justify-center"][class*="overflow-y-auto"]'));
  const headline = document.querySelector('p.font-display');
  const stat = document.querySelector('[aria-label*="—"]');
  const body = document.querySelector('p.leading-relaxed');
  const fs = (el)=> el ? parseFloat(getComputedStyle(el).fontSize) : null;
  return JSON.stringify({
    vw: innerWidth, vh: innerHeight,
    player: nav ? 'btb' : (document.querySelector('[aria-label="Bloque anterior"]') ? 'stories' : 'btb-focus'),
    templated: !!frame, frame: r(frame), ratio: frame ? +(frame.getBoundingClientRect().width/frame.getBoundingClientRect().height).toFixed(3) : null,
    nav: r(nav),
    scroll: scroller ? {client: scroller.clientHeight, scroll: scroller.scrollHeight, overflows: scroller.scrollHeight > scroller.clientHeight+1} : null,
    fontHeadline: fs(headline), fontStat: fs(stat), fontBody: fs(body),
    docOverflowX: document.documentElement.scrollWidth > innerWidth+1,
  });
})()`;

const cases = JSON.parse(fs.readFileSync(`${SP}/cases.json`,"utf8"));
const widths = process.env.W ? JSON.parse(process.env.W) : [[375,812],[414,896],[769,1024],[900,800],[1024,768],[1440,900]];
const out=[];
for (const c of cases) for (const [w,h] of widths) for (const focus of (w>=769?[false,true]:[false])) {
  await send("Emulation.setDeviceMetricsOverride",{width:w,height:h,deviceScaleFactor:1,mobile:w<769});
  await send("Page.navigate",{url:`http://localhost:3200/_showcase/lu-templates?unit=${c.unit}&block=${c.block}&player=auto`});
  await sleep(c.first?7000:2200); c.first=false;
  if (focus) { for (const t of ["keyDown","keyUp"]) await send("Input.dispatchKeyEvent",{type:t,key:"f",code:"KeyF",text:t==="keyDown"?"f":undefined}); await sleep(600); }
  const m = JSON.parse((await send("Runtime.evaluate",{expression:MEASURE,returnByValue:true})).result.result.value);
  const name = `${c.name}_${w}${focus?"_focus":""}`;
  const shot = await send("Page.captureScreenshot",{format:"png"});
  fs.writeFileSync(`${SP}/resp/${name}.png`, Buffer.from(shot.result.data,"base64"));
  out.push({name, ...m});
  console.log(name, JSON.stringify({p:m.player,tpl:m.templated,frame:m.frame&&`${m.frame.w}x${m.frame.h}`,scroll:m.scroll&&(m.scroll.overflows?`OVERFLOW ${m.scroll.scroll}/${m.scroll.client}`:"fits"),fh:m.fontHeadline,fs:m.fontStat,fb:m.fontBody,nav:m.nav&&m.nav.w,xo:m.docOverflowX}));
}
fs.writeFileSync(`${SP}/resp/results.json`,JSON.stringify(out,null,1));
ws.close(); chrome.kill(); process.exit(0);
