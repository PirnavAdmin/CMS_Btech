// All API requests are intercepted; no live records are changed.
import { chromium } from 'playwright'
import { expect } from '@playwright/test'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const scope = { academicYearId: 2, courseId: 1, branchId: 1, semesterId: 1, sectionId: 1 }
const calls = [], errors = []
let table = null, entries = [], periods = [], fail = false
let calendar = { reviewed: false, workingDays: [], holidays: [], academicYearStartDate: '2026-06-01', academicYearEndDate: '2027-05-31' }
const slots = () => periods.filter(row => row.periodType === 'CLASS').map(row => ({ ...row, timetableSlotId: 100 + row.periodId, slotName: row.periodName }))
const newEntry = payload => { const slot = slots().find(row => row.timetableSlotId === payload.timetableSlotId); return { ...scope, ...slot, ...payload, timetableId: 8, timetableEntryId: 11, classroomName: 'Room A', facultyName: 'Kavya', subjectName: 'Algorithms', subjectCode: 'CS101', active: true } }
await context.route(url => url.pathname.startsWith('/api/'), async route => {
 const request = route.request(), path = new URL(request.url()).pathname, method = request.method(), body = request.postDataJSON()
 calls.push({ path, method, body })
 let data = [], status = 200
 const root = '/api/v1/timetable-management'
 if (path.startsWith(root)) {
  const resource = path.slice(root.length)
  if (fail && resource === '/timetables') return route.fulfill({ status: 500, json: { success: false, message: 'Unavailable' } })
  if (resource === '/classrooms') data = [{ classroomId: 5, classroomName: 'Room A', roomType: 'CLASSROOM', active: true }]
  else if (resource === '/periods') { if (method === 'POST') { data = { ...body, periodId: periods.length + 1 }; periods.push(data); status = 201 } else { assert(new URL(request.url()).searchParams.get('academicYearId')); data = periods } }
  else if (resource === '/periods/reorder') data = {}
  else if (resource === '/calendar') { if (method === 'PUT') calendar = { ...calendar, ...body }; else assert(new URL(request.url()).searchParams.get('academicYearId')); data = calendar }
  else if (resource === '/timetables') { if (method === 'POST') { table = { ...body, timetableId: 8, status: 'DRAFT', revision: 1 }; data = table; status = 201 } else data = table ? [table] : [] }
  else if (resource === '/timetables/8') data = { timetable: table, slots: slots(), entries, requirements: [{ subjectId: 3, periodsPerWeek: 1, blockSize: 1 }] }
  else if (resource.endsWith('/requirements') || resource.endsWith('/sync-periods')) data = {}
  else if (resource.endsWith('/generate-missing') || resource.endsWith('/generate')) { if (!entries.length) entries = [newEntry({ dayOfWeek: 'MONDAY', subjectId: 3, facultyId: 4, classroomId: 5, timetableSlotId: slots()[0].timetableSlotId })]; data = { added: 1, issues: [] } }
  else if (resource.endsWith('/entries/11') && method === 'DELETE') entries = []
  else if (resource.endsWith('/entries') || resource.endsWith('/entries/11')) { entries = [newEntry(body)]; data = entries[0]; status = method === 'POST' ? 201 : 200 }
  else if (resource.endsWith('/validate')) data = { valid: true, conflicts: [], warnings: [], unscheduled: [] }
  else if (resource.endsWith('/publish')) { table.status = 'PUBLISHED'; data = table }
  else if (resource.endsWith('/reopen')) { table.status = 'DRAFT'; data = table }
  else if (resource.startsWith('/views/')) data = table?.status === 'PUBLISHED' ? entries : []
  else throw new Error('Unexpected timetable API: ' + method + ' ' + resource)
 } else if (path.endsWith('/academic-years')) data = [{ academicYearId: 2, academicYearName: '2026-2027', status: 'Active', startDate: '2026-06-01', endDate: '2027-05-31' }]
 else if (path.endsWith('/courses')) data = [{ courseId: 1, courseName: 'B.Tech' }]
 else if (path.endsWith('/branches')) data = [{ branchId: 2, courseId: 1, branchName: 'MECH' }, { branchId: 1, courseId: 1, branchName: 'CSE' }]
 else if (path.endsWith('/semester')) data = [{ ...scope, semesterNumber: 1, semesterName: 'Semester 1', startDate: '2026-09-01', endDate: '2027-05-31' }]
 else if (path.endsWith('/sections')) data = [{ ...scope, sectionName: 'Section A', room: 'Room A', classroomId: 5 }]
 else if (path.endsWith('/subjects')) data = [{ ...scope, subjectId: 3, subjectCode: 'CS101', subjectName: 'Algorithms', subjectType: 'THEORY', status: 1 }]
 else if (path.endsWith('/faculty')) data = [{ facultyId: 4, facultyName: 'Kavya', status: 1 }]
 else if (path.endsWith('/faculty-subject-allocations')) data = [{ ...scope, subjectId: 3, facultyId: 4, periodsPerWeek: 1, status: true }]
 else if (path.endsWith('/student-profiles') || path.endsWith('/student-admissions')) data = [{ ...scope, studentId: 9, admissionId: 10, firstName: 'Ravi', lastName: 'Kumar', rollNumber: 'R001', status: 'Approved' }]
 return route.fulfill({ status, json: { success: true, data } })
})
await context.addInitScript(() => { localStorage.setItem('btech-access-token', 'test-token'); localStorage.setItem('btech-authenticated', 'true'); localStorage.setItem('btech-user-role', 'admin'); localStorage.setItem('btech-user-id', 'tt-api-test') })
page.on('pageerror', error => errors.push(error.message))
const button = name => page.getByRole('button', { name, exact: true })
const choose = async (label, name) => { await button(label).click(); await page.getByRole('option', { name, exact: typeof name === 'string' }).click() }
const tab = name => page.getByRole('navigation', { name: 'Timetable views' }).getByRole('button', { name, exact: true }).click()
try {
 await page.goto(process.env.TIMETABLE_TEST_URL || 'http://127.0.0.1:5181/timetable')
 await expect(page.locator('.tt-kpis article')).toHaveCount(4)
 await expect(button('Refresh')).toHaveCount(0); await expect(page.locator('.tt-storage-note')).toHaveCount(0)
 await tab('Create & Manage Timetable')
 await expect(page.getByRole('textbox', { name: 'Academic Year', exact: true })).toHaveValue('2026-2027')
 await choose('Course', 'B.Tech'); await choose('Branch', 'CSE'); await expect(button('Branch')).toContainText('CSE')
 await choose('Academic Level', '1st Year'); await choose('Semester', 'Semester 1'); await choose('Section', 'Section A')
 await button('Continue to Period Setup').click()
 await page.getByLabel('MON', { exact: true }).check()
 await page.getByLabel('I have reviewed the working days and holiday dates.').check()
 await page.getByRole('button', { name: /Continue to Generate/ }).click()
 await expect(button('Auto Generate')).toBeVisible()
 assert.equal(table.branchId, 1); assert(periods.length > 0); assert.equal(calendar.reviewed, true)
 await button('Auto Generate').click(); await expect(page.locator('.tt-grid-scroll .tt-class')).toHaveCount(1)
 await page.locator('.tt-grid-scroll .tt-class').click(); await button('Remove class').click(); await button('Confirm removal').click()
 await expect(page.locator('.tt-grid-scroll .tt-class')).toHaveCount(0)
 await button('Add Class').click(); await choose('Subject', /CS101/); await choose('Faculty', 'Kavya'); await choose('Classroom / Lab', 'Room A'); await choose('Period', /P1|Period 1/)
 await button('Save Draft Entry').click(); await expect(page.locator('.tt-grid-scroll .tt-class')).toHaveCount(1)
 assert.equal(calls.findLast(row => row.path.endsWith('/entries')).body.classroomId, 5)
 await button('Validate').click(); await expect(page.getByRole('dialog')).toContainText('Validation passed'); await button('Close Validation results').click()
 await button('Publish').click(); await button('Confirm Publish').click(); await expect(button('Move to Draft')).toBeVisible()
 await tab('Faculty Timetable'); await choose('Faculty', 'Kavya'); await expect(page.locator('.tt-grid-scroll .tt-class')).toHaveCount(1)
 await tab('Student Timetable'); await choose('Student', /Ravi/); await expect(page.locator('.tt-grid-scroll .tt-class')).toHaveCount(1)
 await tab('Classroom Timetable'); await choose('Classroom / Lab', 'Room A'); await expect(page.locator('.tt-grid-scroll .tt-class')).toHaveCount(1)
 await page.reload(); await choose('Classroom / Lab', 'Room A'); await expect(page.locator('.tt-grid-scroll .tt-class')).toHaveCount(1)
 assert.equal(await page.evaluate(() => localStorage.getItem('pirnav-timetables-v1:tt-api-test')), null)
 fail = true; await page.reload(); await expect(page.getByRole('alert')).toBeVisible(); fail = false; await button('Retry').click(); await expect(button('Classroom / Lab')).toBeVisible()
 assert.deepEqual(errors, [])
 console.log('PASS: backend create/period/calendar setup, generation, manual add/remove, validation, publication, all three views, reload persistence, error recovery, and no local timetable writes.')
} catch (error) { console.error((await page.locator('.tt-page').innerText()).slice(-4500)); throw error } finally { await browser.close() }
