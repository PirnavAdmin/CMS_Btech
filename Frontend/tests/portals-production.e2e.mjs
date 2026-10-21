import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { preview } from 'vite'
import { fileURLToPath } from 'node:url'

const server = await preview({ root: fileURLToPath(new URL('../', import.meta.url)), preview: { host: '127.0.0.1', port: 5193, strictPort: true } })
let browser
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const context = await browser.newContext(), calls = [], errors = []
  await context.route(url => url.pathname.startsWith('/api/'), async route => { calls.push(route.request().url()); await route.abort() })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:5193/portal-preview')
  await page.waitForURL('**/login')
  assert.equal(await page.getByRole('button', { name: 'Preview faculty', exact: true }).count(), 0)
  await page.evaluate(() => {
    sessionStorage.setItem('btech-authenticated', 'true')
    sessionStorage.setItem('btech-user-role', 'student')
    sessionStorage.setItem('btech-user-id', 'browser-student')
    sessionStorage.setItem('btech-user-name', 'Browser Student')
    sessionStorage.setItem('btech-user-college-id', 'empty-test-college')
    // Even a stale marker cannot enable preview fixture authentication in production.
    sessionStorage.setItem('cms-portal-preview', 'true')
  })
  await page.goto('http://127.0.0.1:5193/dashboard')
  await page.waitForURL('**/student-portal/dashboard')
  await page.getByRole('heading', { name: 'Dashboard', exact: true, level: 1 }).waitFor()
  await page.getByRole('heading', { name: 'No classes scheduled today', exact: true }).waitFor()
  assert.equal(await page.getByText('Aarav Reddy', { exact: true }).count(), 0)
  await page.goto('http://127.0.0.1:5193/student-portal/subjects')
  await page.getByRole('heading', { name: 'No records available', exact: true }).waitFor()
  await page.goto('http://127.0.0.1:5193/user-access')
  await page.waitForURL('**/unauthorized')
  assert.deepEqual(calls, [])
  assert.deepEqual(errors, [])
  console.log('PASS: production preview disabled; normal student college starts empty; student cannot access admin; no backend requests.')
} finally { await browser?.close(); await new Promise(resolve => server.httpServer.close(resolve)) }
