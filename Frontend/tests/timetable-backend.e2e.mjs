// All HTTP API calls are intercepted; this test never writes live college records.
import { chromium } from 'playwright'
import { expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
const server = process.env.TIMETABLE_TEST_URL ? null : await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), define: { 'import.meta.env.VITE_TIMETABLE_DRAFT_ADAPTER': JSON.stringify('false') }, server: { host: '127.0.0.1', port: 5186, strictPort: true } })
await server?.listen()
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage(), errors = [], calls = []
const scope = { academicYearId: 1, departmentId: 2, courseId: 3, branchId: 4, semesterId: 5 }
let fail = false, backendEntries = []
const masters = [{ ...scope, sectionId: 6, timetableId: 800, timetableName: 'Published history', status: 'PUBLISHED', revision: 1, effectiveFrom: '2026-10-06', effectiveTo: '2026-10-30' }]
const history = JSON.stringify(masters[0])
const periods = [{ periodId: 21, periodName: 'P1', periodType: 'CLASS', startTime: '09:00:00', endTime: '10:00:00', displayOrder: 1, active: true }]
const calendar = { reviewed: true, workingDays: ['MONDAY'], holidays: [{ date: '2027-01-11', type: 'HOLIDAY' }] }
const allocations = [6, 7].map((sectionId, index) => ({ ...scope, allocationId: index + 1, sectionId, subjectId: 8, facultyId: 10, periodsPerWeek: 2, status: true }))
await context.route(url => url.pathname.startsWith('/api/'), async route => {
 const req = route.request(), path = new URL(req.url()).pathname
 calls.push({ path, method: req.method() })
 let data = []
 if (path.includes('timetable-management')) {
   const suffix = path.split('/timetable-management')[1], method = req.method()
   if (suffix === '/timetables' && method === 'GET') {
     if (fail) return route.fulfill({ status: 500, json: { success: false, message: 'Actual timetable API failure' } })
     data = masters
   } else if (suffix === '/periods') data = periods
   else if (suffix === '/calendar') data = calendar
   else if (suffix === '/classrooms') data = [{ classroomId: 31, classroomName: 'Room A', active: true }]
   else if (suffix === '/timetables' && method === 'POST') {
     const body = req.postDataJSON(); assert.equal(body.effectiveFrom, '2027-01-04T00:00:00'); assert.equal(body.effectiveTo, '2027-02-01T00:00:00')
     masters.push({ ...body, timetableId: 801, revision: 1, status: 'DRAFT' }); data = { timetableId: 801 }
   } else {
     const id = Number(suffix.split('/')[2]), table = masters.find(row => row.timetableId === id)
     if (suffix.endsWith('/generate')) { backendEntries = [{ timetableEntryId: 901, timetableSlotId: 21, subjectId: 8, facultyId: 10, classroomId: 31, classroomName: 'Room A', active: true, dayOfWeek: 'MONDAY', startTime: '09:00:00', endTime: '10:00:00' }]; table.revision++; data = { added: 1 } }
     else if (suffix.endsWith('/validate')) data = { valid: true, warnings: [], conflicts: [], unscheduled: [] }
     else if (suffix.endsWith('/publish')) { table.status = 'PUBLISHED'; table.revision++; data = {} }
     else if (suffix.endsWith('/requirements') || suffix.endsWith('/sync-periods')) data = {}
     else data = { timetable: table, slots: [{ timetableSlotId: 21, slotName: 'P1', startTime: '09:00:00', endTime: '10:00:00' }], requirements: [{ subjectId: 8, periodsPerWeek: 2, blockSize: 1 }], entries: id === 801 ? backendEntries : [] }
   }
   return route.fulfill({ status: 200, json: { success: true, data } })
 }
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
try {
 await page.goto('http://127.0.0.1:5186/timetable')
 await button('Timetable Builder').click()
 for (const [label, value] of [['Academic Year', '2026-2027'], ['Department', 'CSE'], ['Course', 'B.Tech'], ['Branch', 'Computer Science'], ['Academic Level', 'Year 2'], ['Semester', 'Semester 3']]) await choose(label, value)
 await page.getByLabel('Section B', { exact: true }).uncheck()
 await button('Continue').click()
 await expect(page.getByText('Semester dates are not configured.', { exact: false })).toBeVisible()
 await expect(button('Continue to Subjects')).toBeDisabled()
 await page.getByLabel('Timetable Start Date').fill('2027-01-04'); await page.getByLabel('Timetable End Date').fill('2027-01-04')
 await expect(page.locator('.tt-clean-step [role=alert]')).toContainText('Timetable end date must be after')
 await page.getByLabel('Timetable End Date').fill('2027-02-01')
 assert.equal(await page.getByLabel('Timetable End Date').getAttribute('max'), null)
 await button('Continue to Subjects').click(); await button('GENERATE ALL SELECTED SECTIONS').click()
 await expect(page.locator('.tt-grid-scroll .tt-class')).toHaveCount(1)
 await button('Validate').click(); await expect(page.getByRole('dialog')).toContainText('READY TO PUBLISH'); await button('Close Validation result').click()
 await button('Publish').click(); await button('Confirm Publish Timetable').click(); await expect(page.getByRole('dialog')).toHaveCount(0)
 await expect(page.locator('.tt-clean-workspace .tt-status')).toHaveText('PUBLISHED')
 assert.equal(JSON.stringify(masters[0]), history); assert.equal(masters.length, 2)
 assert(!calls.some(call => call.method !== 'GET' && call.path.includes('/timetables/800')))
 assert.equal(await page.evaluate(() => localStorage.getItem('pirnav-timetable-workflow-v2')), null)
 fail = true; await page.reload(); await expect(page.locator('.tt-page [role=alert]')).toHaveText('Actual timetable API failure')
 assert.deepEqual(errors, [])
 console.log('PASS: real adapter, missing semester dates, extended independent validity, equal-date rejection, creation/generation/validation/publish, retained published history, no local drafts, actual API error.')
} catch (error) { console.error((await page.locator('body').innerText()).slice(-4500)); console.error(error); process.exitCode = 1 }
finally { await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 3000))]); server?.httpServer?.closeAllConnections(); void server?.close(); process.exit(process.exitCode || 0) }
