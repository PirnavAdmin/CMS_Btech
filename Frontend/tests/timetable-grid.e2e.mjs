// Mount the real grid with the real global styles; no college records are accessed.
import { chromium } from 'playwright'
import { expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const artifacts = join(tmpdir(), 'cms-timetable-grid-check')
const html = `<!doctype html><html data-theme="light"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module">
import React from 'react';
import { createRoot } from 'react-dom/client';
import TimetableGrid from '/src/pages/timetable/TimetableGrid.jsx';
import '/src/index.css'; import '/src/App.css'; import '/src/styles/global.css';
import '/src/pages/timetable/TimetableManagement.css'; import '/src/pages/timetable/TimetableWorkflow.css';
import '/src/styles/dark-mode.css'; import '/src/styles/dark-mode-contrast.css';
const periods = [{ id:'1',name:'Period 1',type:'class',startTime:'09:00',endTime:'10:00' }, { id:'2',name:'Period 2',type:'class',startTime:'10:00',endTime:'11:00' }, {id:'3',name:'Short Break',type:'break',startTime:'11:00',endTime:'11:15'}];
const rows = [{id:1,subjectCode:'CS301',subjectName:'Database Management Systems and Application Development',facultyName:'Dr. Faculty With A Longer Name',classroom:'Computer Science Laboratory 101',sectionName:'CSE Section A',dayOfWeek:'MONDAY',startTime:'09:00',endTime:'10:00'}, {id:2,subjectCode:'CS302',subjectName:'Operating Systems',facultyName:'Dr. Ravi',classroom:'Room 102',sectionName:'CSE Section B',dayOfWeek:'TUESDAY',startTime:'10:00',endTime:'11:00'}];
const render = rows => createRoot(document.getElementById('root')).render(React.createElement('div',{className:'page-content',style:{margin:0,padding:16}},React.createElement('main',{className:'tt-page tt-workflow'},React.createElement('section',{className:'tt-card tt-clean-workspace'},React.createElement(TimetableGrid,{rows,periods,workingDays:['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY']})))));
render(rows);
</script></body></html>`
const server = await createServer({ root:fileURLToPath(new URL('../',import.meta.url)), cacheDir:'node_modules/.vite-timetable-grid', appType:'custom', optimizeDeps:{noDiscovery:true,include:['react','react-dom/client','react-icons/fi']}, server:{host:'127.0.0.1',port:5188,strictPort:true} })
server.middlewares.use(async (req,res,next) => { if(req.url!=='/grid-fixture') return next(); res.setHeader('Content-Type','text/html'); res.end(await server.transformIndexHtml(req.url,html)) })
await server.listen()
const browser = await chromium.launch({channel:'msedge',headless:true})
try {
 const page = await browser.newPage({viewport:{width:1440,height:1000}})
 await page.goto('http://127.0.0.1:5188/grid-fixture',{timeout:90000})
 await expect(page.locator('.tt-grid-scroll .tt-class')).toHaveCount(2)
 await expect(page.locator('.tt-empty-slot').first()).toHaveText('No class scheduled')
 for(const theme of ['light','dark']) {
  await page.evaluate(theme=>document.documentElement.setAttribute('data-theme',theme),theme)
  const appearance = await page.locator('.tt-grid-container').evaluate(root=>{
   const label=root.querySelector('tbody th'), time=label.querySelector('small'), css=getComputedStyle(label)
   const lum=value=>value.match(/[\d.]+/g).slice(0,3).map(Number).map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4}).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0)
   const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05)
   return {contrast:contrast(css.color,css.backgroundColor),timeContrast:contrast(getComputedStyle(time).color,css.backgroundColor),top:css.top,cards:[...root.querySelectorAll('.tt-grid-scroll .tt-class')].map(card=>({right:card.getBoundingClientRect().right,cellRight:card.closest('td').getBoundingClientRect().right,wrapping:getComputedStyle(card.querySelector('button')).whiteSpace,overflow:card.scrollWidth-card.clientWidth}))}
  })
  assert(appearance.contrast>=4.5,`${theme} label contrast ${appearance.contrast}`);assert(appearance.timeContrast>=4.5,`${theme} time contrast ${appearance.timeContrast}`);assert.equal(appearance.top,'auto')
  for(const card of appearance.cards){assert(card.right<=card.cellRight);assert.equal(card.wrapping,'normal');assert(card.overflow<=1)}
  mkdirSync(artifacts,{recursive:true});await page.locator('.tt-grid-container').screenshot({path:join(artifacts,`timetable-grid-${theme}.png`)})
 }
 await page.setViewportSize({width:390,height:844})
 await expect(page.locator('.tt-grid-scroll')).toBeHidden();await expect(page.locator('.tt-day-view')).toBeVisible();await expect(page.locator('.tt-day-view .tt-class')).toHaveCount(1)
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile page overflowed horizontally')
 await page.locator('.tt-grid-container').screenshot({path:join(artifacts,'timetable-grid-mobile.png')})
 console.log('PASS: readable light/dark period labels, wrapped long class names, contained cards, clear empty slots, mobile agenda.')
} finally {await browser.close();await server.close()}
