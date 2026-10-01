// All HTTP API calls are intercepted; this test never writes live college records.
import { chromium } from 'playwright'
import { expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
const server = process.env.TIMETABLE_TEST_URL ? null : await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { host: '127.0.0.1', port: 5183, strictPort: true } })
await server?.listen()
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage(), errors = [], calls = []
const scope = { academicYearId: 1, departmentId: 2, courseId: 3, branchId: 4, semesterId: 5 }
let fail = false, backendEntries = []
const allocations = [6, 7].map((sectionId, index) => ({ ...scope, allocationId: index + 1, sectionId, subjectId: 8, facultyId: 10, periodsPerWeek: 2, status: true }))
await context.route(url => url.pathname.startsWith('/api/'), async route => {
 const req = route.request(), path = new URL(req.url()).pathname
 calls.push({ path, method: req.method() })
 let data = []
 if (path.includes('timetable-management')) throw new Error('Invented API called: ' + path)
 if (path.endsWith('/academic-years')) data = [{ academicYearId: 1, academicYearName: '2026-2027', startDate: '2026-01-01', endDate: '2026-12-31', status: 'Active' }]
 else if (path.endsWith('/departments')) data = [{ departmentId: 2, departmentName: 'CSE' }]
 else if (path.endsWith('/courses')) data = [{ courseId: 3, courseName: 'B.Tech' }]
 else if (path.endsWith('/branches')) data = [{ branchId: 4, courseId: 3, departmentId: 2, branchName: 'Computer Science' }]
 else if (path.endsWith('/semester')) data = [{ ...scope, semesterNumber: 3, semesterName: 'Semester 3' }]
 else if (path.endsWith('/sections')) data = [6, 7].map((sectionId, index) => ({ ...scope, sectionId, sectionName: index ? 'Section B' : 'Section A', room: `Room ${sectionId}` }))
 else if (path.endsWith('/subjects')) data = [{ ...scope, subjectId: 8, subjectName: 'DBMS', subjectCode: 'CS301', subjectType: 'THEORY' }, { ...scope, subjectId: 9, subjectName: 'Optional Seminar', subjectType: 'THEORY' }]
 else if (path.endsWith('/faculty')) data = [{ facultyId: 10, facultyName: 'Dr. Ravi', userId: 99, status: true }]
 else if (path.endsWith('/faculty-subject-allocations')) data = allocations
 else if (path.includes('/faculty-subject-allocations/') && req.method() === 'PUT') { const index = allocations.findIndex(row => String(row.allocationId) === path.split('/').at(-1)); allocations[index] = { ...allocations[index], ...req.postDataJSON() }; data = allocations[index] }
 else if (path.includes('/timetable-entries/') && req.method() === 'PUT') { const body = req.postDataJSON(); backendEntries = backendEntries.map(row => String(row.timetableEntryId) === path.split('/').at(-1) ? { ...row, ...body } : row); data = backendEntries[0] }
 else if (path.includes('/timetable-entries/') && req.method() === 'DELETE') backendEntries = backendEntries.filter(row => String(row.timetableEntryId) !== path.split('/').at(-1))
 else if (path.endsWith('/timetable-entries') && req.method() === 'POST') { data = { ...backendEntries[0], ...req.postDataJSON(), timetableEntryId: 601 }; backendEntries.push(data) }
 else if (path.endsWith('/timetable-entries')) { if (fail) return route.fulfill({ status: 500, json: { message: 'Timetable API unavailable' } }); data = backendEntries }
 else if (path.endsWith('/profile')) data = { userId: 99, fullName: 'Dr. Ravi', role: 'faculty' }
 return route.fulfill({ status: 200, json: { success: true, data } })
})
await context.addInitScript(() => {
 if (!localStorage.getItem('btech-user-role')) { localStorage.setItem('btech-authenticated', 'true'); localStorage.setItem('btech-user-role', 'admin'); localStorage.setItem('btech-user-id', '1'); localStorage.setItem('btech-access-token', 'test-token') }
})
page.on('pageerror', error => errors.push(error.message))
const button = name => page.getByRole('button', { name, exact: true })
const choose = async (label, value) => { await button(label).click(); await page.getByRole('option', { name: value, exact: true }).click() }
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('pirnav-timetable-workflow-v2') || '[]'))
try {
 await page.goto(process.env.TIMETABLE_TEST_URL || 'http://127.0.0.1:5183/timetable')
 await expect(page.locator('.tt-dashboard-stats > div')).toHaveCount(4)
 await button('Open Builder').click()
 for (const [label, value] of [['Academic Year', '2026-2027'], ['Department', 'CSE'], ['Course', 'B.Tech'], ['Branch', 'Computer Science'], ['Academic Level', 'Year 2'], ['Semester', 'Semester 3']]) await choose(label, value)
 await expect(page.getByLabel('Section A', { exact: true })).toBeChecked(); await expect(page.getByLabel('Section B', { exact: true })).toBeChecked()
 await button('Continue').click()
 await expect(page.getByText('16:00', { exact: true }).first()).toBeVisible()
 await expect(page.getByText('Holidays / Non-working Dates')).toHaveCount(0)
 await page.getByLabel('Timetable Start Date').fill('2026-09-01'); await page.getByLabel('Timetable End Date').fill('2026-12-15')
 await button('Continue to Subjects').click()
 await page.getByLabel('Optional Seminar', { exact: true }).uncheck()
 await button('GENERATE ALL SELECTED SECTIONS').click()
 await expect(page.locator('.tt-section-tabs button')).toHaveCount(2)
 await expect(page.locator('.tt-grid-scroll .tt-class')).toHaveCount(2)
 await page.screenshot({ path: join(tmpdir(), 'pirnav-timetable-desktop.png'), fullPage: true })
 assert.equal((await stored()).length, 2)
 assert((await stored()).every(table => table.entries.length === 2 && table.publicationStatus === 'draft'))
 await page.locator('.tt-grid-scroll .tt-faculty-link').first().click(); await expect(page.getByRole('dialog', { name: 'Faculty schedule' })).toBeVisible(); await button('Close Faculty schedule').click()
 // A manual move is retained by Generate Missing and explicit regeneration.
 await page.locator('.tt-grid-scroll .tt-class-details').first().click()
 await expect(page.getByRole('dialog', { name: 'Edit schedule' })).toBeVisible()
 await choose('Day', 'FRIDAY'); await button('Save Draft Entry').click()
 await expect(page.getByRole('dialog')).toHaveCount(0)
 const manual = (await stored())[0].entries.find(row => !row.generated)
 assert(manual && manual.dayOfWeek === 'FRIDAY')
 await button('Generate Missing').click(); await expect(button('Generate Missing')).toBeEnabled()
 assert.deepEqual((await stored())[0].entries.find(row => row.id === manual.id), manual)
 await page.locator('summary').filter({ hasText: 'More Actions' }).click(); await button('Regenerate').click(); await expect(page.getByRole('dialog')).toContainText('Manual additions, edits and moves'); await button('Confirm Regenerate').click(); await expect(page.getByRole('dialog')).toHaveCount(0); assert.deepEqual((await stored())[0].entries.find(row => row.id === manual.id), manual)
 await button('Validate').click(); await expect(page.getByRole('dialog', { name: 'Validation', exact: true })).toContainText('No issues found.'); await button('Close Validation').click()
 await button('Publish').click(); await expect(page.getByRole('dialog')).toContainText('4 classes'); await button('Confirm Publish').click()
 await expect(page.getByRole('dialog')).toHaveCount(0)
 assert((await stored()).every(table => table.publicationStatus === 'published'))
 await button('Faculty My Timetable').click(); await choose('Faculty', 'Dr. Ravi'); await button('Week').click(); await expect(page.locator('.tt-grid-scroll .tt-class')).toHaveCount(4)
 // Responsive theme checks, with no page-wide horizontal overflow.
 for (const [width, height] of [[820, 1000], [390, 844]]) {
  await page.setViewportSize({ width, height })
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  if (width === 390) { await page.screenshot({ path: join(tmpdir(), 'pirnav-timetable-mobile.png'), fullPage: true }); await expect(page.locator('.tt-day-view')).toBeVisible(); await expect(page.locator('.tt-grid-scroll')).toBeHidden() }
 }
 await page.setViewportSize({ width: 1440, height: 1000 })
 // Authenticated mapping, persisted published data and no admin controls for faculty.
 await page.evaluate(() => { localStorage.setItem('btech-user-role', 'faculty'); localStorage.setItem('btech-user-id', '99') })
 await page.reload(); await expect(page.getByRole('heading', { name: 'Dr. Ravi' })).toBeVisible(); await expect(button('Timetable Builder')).toHaveCount(0)
 await button('Week').click(); await expect(page.locator('.tt-grid-scroll .tt-class')).toHaveCount(4)
 // Existing real timetable records use only the actual entry CRUD routes and IDs.
 backendEntries = [{ ...scope, sectionId: 6, timetableId: 800, timetableName: 'Backend timetable', timetableEntryId: 600, timetableSlotId: 900, subjectId: 8, facultyId: 10, classroom: 'Room 6', dayOfWeek: 'WEDNESDAY', startTime: '14:20', endTime: '15:10', status: true }]
 await page.evaluate(() => localStorage.setItem('btech-user-role', 'admin')); await page.reload()
 await page.getByRole('button', { name: /Backend timetable/ }).click()
 await page.locator('.tt-grid-scroll .tt-class-details').first().click(); await choose('Day', 'THURSDAY'); await button('Save Draft Entry').click(); await expect(page.getByRole('dialog')).toHaveCount(0)
 assert.equal(backendEntries[0].dayOfWeek, 'THURSDAY')
 await page.getByRole('button', { name: 'Add class SATURDAY P1 14:20', exact: true }).click()
 await choose('Subject', 'CS301 \u00b7 DBMS'); await choose('Faculty', 'Dr. Ravi'); await choose('Classroom / Lab', 'Room 6'); await button('Save Draft Entry').click(); await expect(page.getByRole('dialog')).toHaveCount(0)
 assert.equal(backendEntries.length, 2)
 await page.locator('.tt-grid-scroll .tt-class-details').first().click(); await button('Remove class').click(); await button('Confirm removal').click(); await expect(page.getByRole('dialog')).toHaveCount(0)
 assert.equal(backendEntries.length, 1)
 assert(calls.some(call => call.path === '/api/v1/timetable-entries/600' && call.method === 'PUT'))
 assert(calls.some(call => call.path === '/api/v1/timetable-entries' && call.method === 'POST'))
 assert(calls.some(call => call.path.startsWith('/api/v1/timetable-entries/') && call.method === 'DELETE'))
 await page.evaluate(() => localStorage.setItem('btech-user-role', 'faculty')); await page.reload(); await expect(page.getByRole('heading', { name: 'Dr. Ravi' })).toBeVisible()
 // A backend failure must not silently use browser records as a fallback.
 fail = true; await page.reload(); await expect(page.locator('.tt-page [role=alert]')).toContainText('server encountered an error'); await expect(page.locator('.tt-grid-scroll')).toHaveCount(0)
 fail = false; await button('Refresh').click(); await expect(page.getByRole('heading', { name: 'Dr. Ravi' })).toBeVisible()
 await page.evaluate(() => localStorage.setItem('btech-user-role', 'student')); await page.reload(); await expect(page).toHaveURL(/unauthorized/)
 assert.deepEqual(errors, [])
 assert(!calls.some(call => call.path.includes('timetable-management')))
 console.log('PASS: cascade, dates/live periods, coordinated drafts, subjects, faculty drawer, manual move, Generate Missing, regeneration confirmation, validation, publish, faculty mapping, mobile/tablet/dark theme, persistence, API error, student exclusion.')
} catch (error) { console.error((await page.locator('body').innerText()).slice(-5500)); throw error }
finally { await browser.close(); await server?.close() }
