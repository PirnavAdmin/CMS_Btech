import { chromium } from 'playwright'
import { createServer } from 'vite'
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const testSource=await readFile('src/pages/timetable/TimetableDashboard.test.js','utf8')
const fixture=testSource.slice(testSource.indexOf('const scope ='),testSource.indexOf("test('readiness"))
const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module">
import React from 'react'; import { createRoot } from 'react-dom/client'; import Dashboard from '/src/pages/timetable/TimetableDashboard.jsx'; import '/src/index.css'; import '/src/styles/global.css'; import '/src/pages/timetable/TimetableManagement.css'; import '/src/pages/timetable/TimetableWorkflow.css';
${fixture}
const tables=[{...scope,id:'1',name:'Section A timetable',publicationStatus:'draft',updatedAt:'2026-10-01',entries:[],planning:table.planning}];
const root=createRoot(document.getElementById('root')); window.loadedSources={...sources,allocations:[]}; const render=()=>root.render(React.createElement('main',{className:'tt-page'},React.createElement(Dashboard,{sources:window.loadedSources,tables,entries:[],today:[],open:()=>{window.openedSection=true}})));window.restoreCoverage=()=>{window.loadedSources=sources;render()};render();
</script></body></html>`
const server=await createServer({server:{host:'127.0.0.1',port:5187},plugins:[{name:'dashboard-check',configureServer(server){server.middlewares.use('/__dashboard',async (_req,res)=>{res.setHeader('Content-Type','text/html');res.end(await server.transformIndexHtml('/__dashboard',html))})}}]})
let browser
try {
 await server.listen(); browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL || 'msedge'});const page=await browser.newPage()
 const errors=[];page.on('pageerror',e=>{errors.push(e.message); console.log('Page error:',e.message)});page.on('console',m=>{if(m.type()==='error')console.log(m.text())});page.setDefaultTimeout(12000)
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:950});await page.goto('http://127.0.0.1:5187/__dashboard');await page.getByRole('button',{name:/Needs Attention/}).waitFor()
  assert.equal(await page.locator('.tt-dashboard-stats > .tt-card').count(),4)
  assert.equal(await page.locator('.tt-validation-status').count(),6)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`overflow at ${width}`)
  await page.getByRole('button',{name:/Needs Attention/}).click();await page.locator('#tt-attention-details').waitFor()
  assert.match(await page.locator('#tt-attention-details').innerText(),/no allocated faculty/)
  await page.locator('#tt-attention-details .tt-recent-table').click();assert.equal(await page.evaluate(()=>window.openedSection),true);await page.evaluate(()=>window.restoreCoverage());await page.waitForFunction(()=>document.querySelector('.tt-dashboard-stats > :nth-child(2) strong').textContent==='1');assert.equal(await page.locator('.tt-dashboard-stats > :nth-child(3) strong').innerText(),'0')
 }
 assert.deepEqual(errors,[]);console.log('Dashboard desktop/tablet/mobile layout and attention interaction passed.')
} finally {await browser?.close();await server.close()}

