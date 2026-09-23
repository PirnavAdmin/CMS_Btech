// Run Vite on port 5178. Every API request is intercepted; no live writes.
import { chromium } from 'playwright'
import { expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
const page = await context.newPage()
page.setDefaultTimeout(15000)
const errors = [], writes = []
page.on('pageerror', error => errors.push(error.message))
const scope = { academicYearId: 1, courseId: 2, branchId: 2, semesterId: 4, sectionId: 5 }
const otherScope = { ...scope, sectionId: 50 }
const students = [{ ...scope, studentId: 10, admissionId: 11, status: 'Approved', firstName: 'Ravi', lastName: 'Kumar', rollNumber: 'ROLL001' }, { ...otherScope, studentId: 20, admissionId: 21, status: 'Approved', firstName: 'Meera', lastName: 'Rao', rollNumber: 'ROLL002' }]
let failBackend = false, yearActive = true
await context.route(url => url.pathname.startsWith('/api/'), route => {
  const path = new URL(route.request().url()).pathname
  if (route.request().method() !== 'GET') writes.push(path)
  if (failBackend && path.endsWith('/timetable-entries')) return route.fulfill({ status: 500, json: { message: 'Schedule unavailable' } })
  const data = path.toLowerCase().endsWith('/colleges') || path.toLowerCase() === '/api/college' ? [{ collegeId: 1, collegeName: 'Pirnav Engineering College', status: 'Active' }]
    : path.endsWith('/academic-years') ? [{ academicYearId: 1, academicYearName: '2026-2027', startDate: '2026-06-01', endDate: '2027-05-31', status: yearActive ? 'Active' : 'Upcoming' }]
    : path.endsWith('/courses') ? [{ courseId: 2, courseName: 'B.Tech' }]
      : path.endsWith('/branches') ? [{ courseId: 2, branchId: 30, branchName: 'MECH' }, { courseId: 2, branchId: 2, branchName: 'CSE' }]
        : path.endsWith('/semester') ? [{ ...scope, semesterId: 4, semesterNumber: 3, semesterName: 'Semester 3', startDate: '2026-09-01', endDate: '2026-12-31' }, { ...scope, semesterId: 40, semesterNumber: 4, semesterName: 'Semester 4' }]
          : path.endsWith('/sections') ? [{ ...scope, sectionName: 'Section A', room: 'Room 1' }, { ...otherScope, sectionName: 'Section B', room: 'Room 1' }]
            : path.endsWith('/subjects') ? [{ ...scope, subjectId: 6, subjectCode: 'CS301', subjectName: 'Data Structures', subjectType: 'Theory', status: 1 }, { ...scope, subjectId: 60, branchId: 30, subjectName: 'Other branch subject' }]
              : path.endsWith('/faculty') ? [{ facultyId: 7, facultyName: 'Kavya Sharma', status: 1 }, { facultyId: 70, facultyName: 'Unallocated Faculty', status: 1 }]
                : path.endsWith('/faculty-subject-allocations') ? [{ ...scope, subjectId: 6, facultyId: 7, periodsPerWeek: 2, status: true }, { ...otherScope, subjectId: 6, facultyId: 7, status: true }]
                  : path.endsWith('/student-profiles') || path.endsWith('/student-admissions') ? students
                    : path.endsWith('/timetable-entries') ? [{ timetableEntryId: 99, timetableId: 9, timetableSlotId: 8, sectionId: 5, facultyId: 7, subjectId: 6, dayOfWeek: 'MONDAY', startTime: '09:00:00', endTime: '10:00:00', classroom: 'Room 1', status: true }]
                      : path.endsWith('/profile') ? { id: 'tt-test', name: 'Timetable Tester' } : []
  return route.fulfill({ status: 200, json: { success: true, data } })
})
await context.addInitScript(() => {
  localStorage.setItem('btech-authenticated', 'true'); localStorage.setItem('btech-user-role', 'admin'); localStorage.setItem('btech-user-id', 'tt-test'); localStorage.setItem('btech-access-token', 'test-token')
})
const choose = async (label, name) => { await page.getByRole('button', { name: label, exact: true }).click(); await page.getByRole('option', { name, exact: typeof name === 'string' }).click() }
const button = name => page.getByRole('button', { name, exact: true })
const goTab = async name => { const tab = page.getByRole('navigation', { name: 'Timetable views' }).getByRole('button', { name, exact: true }); await tab.click(); await expect(tab).toHaveAttribute('aria-current', 'page') }
const step = name => page.getByRole('navigation', { name: 'Timetable steps' }).getByRole('button', { name: new RegExp(name) })
const gridClasses = page.locator('.tt-grid-scroll .tt-class')
const records = () => page.evaluate(() => JSON.parse(localStorage.getItem('pirnav-timetables-v1:tt-test') || '[]'))
const tableFor = async id => (await records()).find(row => row.sectionId === String(id))
const selectAcademic = async (section = 'Section A') => {
  await expect(page.getByRole('textbox', { name: 'Academic Year', exact: true })).toHaveValue('2026-2027')
  await expect(page.getByRole('textbox', { name: 'Academic Year', exact: true })).toHaveAttribute('readonly', '')
  await expect(button('Academic Year')).toHaveCount(0)
  await choose('Course', 'B.Tech'); await choose('Branch', 'CSE')
  await expect(button('Branch')).toContainText('CSE')
  await choose('Academic Level', '2nd Year')
  await button('Semester').click()
  assert.deepEqual(await page.getByRole('option').allTextContents(), ['Semester 3', 'Semester 4'])
  await page.getByRole('option', { name: 'Semester 3', exact: true }).click()
  await choose('Section', section)
}
const fillClass = async () => {
  await choose('Subject', /CS301/); await choose('Faculty', 'Kavya Sharma'); await choose('Classroom / Lab', 'Room 1')
}
const validate = async () => {
  await button('Validate').click()
  const dialog = page.getByRole('dialog', { name: 'Validation results' })
  await expect(dialog).toContainText('Validation passed')
  for (const label of ['No Faculty Conflicts', 'No Room Conflicts', 'No Section Conflicts', 'Valid Periods', 'No Break/Lunch scheduling']) await expect(dialog).toContainText(label)
  await button('Close Validation results').click()
}
const publish = async () => {
  await button('Publish').click()
  await expect(page.getByRole('dialog', { name: 'Publish Timetable', exact: true })).toContainText('0 unresolved items')
  await button('Confirm Publish').click()
  await expect(button('Move to Draft')).toBeVisible()
}
try {
  await mkdir('test-results', { recursive: true })
  await page.goto('http://127.0.0.1:5178/timetable')
  await expect(page.locator('.tt-kpis article')).toHaveCount(4)
  await goTab('Create & Manage Timetable')
  await expect(step('Academic Setup')).toHaveAttribute('aria-current', 'step')
  await expect(button('Auto Generate')).toHaveCount(0)
  await expect(button('Continue to Period Setup')).toBeDisabled()
  yearActive = false; await button('Refresh').click()
  await expect(page.getByRole('textbox', { name: 'Academic Year', exact: true })).toHaveAttribute('placeholder', 'No active academic year')
  await expect(button('Course')).toBeDisabled()
  yearActive = true; await button('Refresh').click()
  await selectAcademic()
  await choose('Branch', 'MECH')
  await expect(button('Academic Level')).toContainText('Select academic level')
  await expect(button('Semester')).toBeDisabled(); await expect(button('Section')).toBeDisabled()
  await choose('Course', 'B.Tech'); await expect(button('Branch')).toContainText('Select branch')
  await selectAcademic()
  await page.screenshot({ path: 'test-results/timetable-step1-desktop.png', fullPage: true })

  // Flow A: automatic periods, auto generation, manual move, fill missing, publish.
  await button('Continue to Period Setup').click()
  await expect(step('Period Setup')).toHaveAttribute('aria-current', 'step')
  await expect(button('Automatic Setup')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Period 3 type')).toHaveValue('break')
  await expect(page.getByLabel('Period 6 type')).toHaveValue('lunch')
  await expect(page.getByLabel('Period 4 start')).toHaveValue('11:15')
  await expect(page.getByLabel('Period 7 start')).toHaveValue('14:00')
  await page.getByLabel('Period Duration (minutes)', { exact: true }).fill('30')
  await expect(page.getByLabel('Period 1 end')).toHaveValue('09:30')
  await page.getByLabel('Period Duration (minutes)', { exact: true }).fill('60')
  await expect(page.getByLabel('Period 1 end')).toHaveValue('10:00')
  for (const day of ['MON', 'TUE', 'WED']) await page.getByRole('checkbox', { name: day, exact: true }).check()
  await page.locator('summary').filter({ hasText: 'Calendar & holidays' }).click()
  await expect(page.getByLabel('Timetable Start Date')).toHaveValue('2026-09-01')
  await page.getByLabel('Holidays / Non-working Dates').fill('2026-09-08')
  await page.getByRole('checkbox', { name: /I have reviewed/ }).check()
  await page.screenshot({ path: 'test-results/timetable-step2-desktop.png', fullPage: true })
  await button('Continue to Generate & Manage').click()
  await expect(step('Generate & Manage')).toHaveAttribute('aria-current', 'step')
  assert.equal((await tableFor(5)).entries.length, 0)
  await expect(button('Add Class')).toBeEnabled()
  assert.equal(await page.locator('.tt-grid-scroll .tt-break-row button').count(), 0)
  await expect(page.locator('.tt-grid-scroll .tt-break-row')).toHaveCount(2)
  await button('Auto Generate').click(); await expect(gridClasses).toHaveCount(2)
  const first = (await tableFor(5)).entries[0]
  assert.equal(first.dayOfWeek, 'MONDAY'); assert.equal(first.startTime, '10:00')
  const builder = await page.getByRole('region', { name: 'Timetable builder', exact: true }).boundingBox()
  assert.ok(builder.y + builder.height <= 1000)
  assert.ok(await page.locator('.tt-grid-scroll').evaluate(el => el.scrollHeight > el.clientHeight), 'Only the timetable scrolls for a full college day')
  assert.equal(await page.locator('.tt-week thead th').first().evaluate(el => getComputedStyle(el).position), 'sticky')
  await page.screenshot({ path: 'test-results/timetable-step3-desktop.png', fullPage: true })
  await page.locator(`.tt-grid-scroll .tt-class[data-entry-id="${first.id}"]`).click()
  const drawer = await page.getByRole('dialog', { name: 'Schedule details' }).boundingBox()
  assert.ok(drawer.x > 800 && drawer.height >= 990)
  await button('Edit').click(); await expect(page.getByRole('dialog', { name: 'Edit schedule' })).toBeVisible()
  await button('Close Edit schedule').click(); await page.locator(`.tt-grid-scroll .tt-class[data-entry-id="${first.id}"]`).click(); await button('Move').click()
  await button('Period').click()
  assert.ok(!(await page.getByRole('option').allTextContents()).some(text => /Break|Lunch/.test(text)))
  await page.getByRole('option', { name: /^P1 / }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Faculty / Section / Classroom conflict')
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Kavya Sharma')
  await expect(button('Save Draft Entry')).toBeDisabled()
  await choose('Day', 'WEDNESDAY'); await button('Save Draft Entry').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  assert.equal((await tableFor(5)).entries[0].id, first.id)
  assert.equal((await tableFor(5)).entries[0].generated, false)
  await button('Subjects (1)').click()
  await expect(page.getByLabel('Data Structures periods per week')).toHaveValue('2')
  await page.getByLabel('Data Structures periods per week').fill('3')
  await button('Save frequencies').click(); await expect(page.getByRole('dialog')).toHaveCount(0)
  await button('Generate Missing').click(); await expect(gridClasses).toHaveCount(3)
  assert.equal((await tableFor(5)).entries[0].id, first.id)
  await button('Auto Generate').click(); await expect(page.getByRole('dialog')).toContainText('including manual edits'); await button('Cancel').click()
  assert.equal((await tableFor(5)).entries[0].id, first.id)
  const remove = (await tableFor(5)).entries.find(row => row.dayOfWeek === 'TUESDAY')
  await page.locator(`.tt-grid-scroll .tt-class[data-entry-id="${remove.id}"]`).click(); await button('Remove class').click(); await button('Confirm removal').click()
  await expect(gridClasses).toHaveCount(2)
  await expect(button('Publish')).toBeDisabled()
  await button('Unscheduled (1)').click(); await expect(page.getByRole('dialog')).toContainText('unscheduled')
  await button('Assign manually').click(); await expect(button('Subject')).toContainText('CS301'); await button('Cancel').click()
  await page.locator('.tt-grid-scroll').getByRole('button', { name: 'Add class TUESDAY P1 09:00', exact: true }).click()
  await expect(button('Day')).toContainText('TUESDAY'); await expect(button('Period')).toContainText('P1')
  await fillClass(); await button('Save Draft Entry').click(); await expect(gridClasses).toHaveCount(3)
  await validate()
  failBackend = true
  await button('Publish').click(); await button('Confirm Publish').click()
  await expect(page.getByRole('dialog', { name: 'Validation results' })).not.toContainText('Validation passed')
  assert.equal((await tableFor(5)).publicationStatus, 'draft')
  await button('Close Validation results').click(); failBackend = false
  await publish()
  await goTab('Faculty Timetable'); await choose('Faculty', 'Kavya Sharma'); await expect(gridClasses).toHaveCount(3)
  await goTab('Student Timetable'); await choose('Student', /Ravi Kumar/); await expect(gridClasses).toHaveCount(3)
  await page.getByLabel('View Date', { exact: true }).fill('2026-09-08'); await expect(gridClasses).toHaveCount(0)
  await expect(page.locator('.tt-notice').filter({ hasText: 'Holiday / non-working date' })).toBeVisible()
  await page.getByLabel('View Date', { exact: true }).fill('2026-09-15'); await expect(gridClasses).toHaveCount(1)
  await page.getByLabel('View Date', { exact: true }).fill('2026-09-13'); await expect(gridClasses).toHaveCount(0)
  await button('Weekly Template').click()
  const downloadPromise = page.waitForEvent('download')
  await button('Export Student Timetable').click(); await button('Download CSV').click()
  const csv = await readFile(await (await downloadPromise).path(), 'utf8')
  assert.match(csv, /CS301/); assert.doesNotMatch(csv, /access-token/)
  await goTab('Classroom Timetable'); await choose('Classroom / Lab', 'Room 1'); await expect(gridClasses).toHaveCount(3)

  // Flow B: manual periods and manual-only scheduling, with no weekly frequency.
  await goTab('Create & Manage Timetable'); await step('Academic Setup').click()
  await choose('Section', 'Section B'); await button('Continue to Period Setup').click()
  await button('Manual Setup').click()
  await expect(button('Manual Setup')).toHaveAttribute('aria-pressed', 'true')
  while (await button('Delete period 1').count()) await button('Delete period 1').click()
  const manualPeriods = [['P1', '09:00', '10:00', 'class'], ['Short Break', '10:00', '10:15', 'break'], ['P2', '10:15', '11:15', 'class'], ['Lunch', '11:15', '12:00', 'lunch'], ['P3', '12:00', '13:00', 'class']]
  for (const [index, [name, start, end, type]] of manualPeriods.entries()) {
    await button('Add Period').click()
    await page.getByLabel(`Period ${index + 1} name`).fill(name)
    await page.getByLabel(`Period ${index + 1} start`).fill(start); await page.getByLabel(`Period ${index + 1} end`).fill(end)
    await page.getByLabel(`Period ${index + 1} type`).selectOption(type)
  }
  await button('Move period 1 down').click(); await expect(page.getByLabel('Period 1 name')).toHaveValue('Short Break')
  await button('Move period 2 up').click(); await expect(page.getByLabel('Period 1 name')).toHaveValue('P1')
  await page.getByRole('checkbox', { name: 'THU', exact: true }).check()
  await page.getByRole('checkbox', { name: /I have reviewed/ }).check()
  await page.getByLabel('Period 3 name').fill('P1'); await expect(button('Continue to Generate & Manage')).toBeDisabled()
  await page.getByLabel('Period 3 name').fill('P2')
  await page.getByLabel('Period 2 end').fill('10:30'); await expect(button('Continue to Generate & Manage')).toBeDisabled()
  await page.getByLabel('Period 2 end').fill('10:15')
  await page.setViewportSize({ width: 1024, height: 900 })
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
  await page.screenshot({ path: 'test-results/timetable-manual-periods-tablet-dark.png', fullPage: true })
  await button('Continue to Generate & Manage').click()
  await expect(button('Auto Generate')).toBeDisabled()
  await expect(button('Frequency unavailable (1)')).toBeVisible()
  await button('Add Class').click(); await expect(page.getByRole('dialog', { name: 'Add Class' })).toBeVisible(); await button('Cancel').click()
  await page.locator('.tt-grid-scroll').getByRole('button', { name: 'Add class THURSDAY P2 10:15', exact: true }).click()
  await expect(button('Period')).toContainText('P2'); await expect(button('Day')).toContainText('THURSDAY')
  await fillClass(); await button('Save Draft Entry').click(); await expect(gridClasses).toHaveCount(1)
  await validate(); await publish()
  const manualTable = await tableFor(50)
  assert.equal(manualTable.entries.length, 1); assert.equal(manualTable.entries[0].generated, false)
  assert.equal(manualTable.planning.periodMode, 'manual')
  assert.deepEqual(manualTable.planning.periods.map(row => row.type), ['class', 'break', 'class', 'lunch', 'class'])
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.tt-day-view')).toBeVisible()
  await expect(page.locator('.tt-day-view .tt-agenda-break')).toHaveCount(2)
  await expect(page.locator('.tt-day-view .tt-class')).toHaveCount(1)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await page.screenshot({ path: 'test-results/timetable-manual-mobile-dark.png', fullPage: true })
  await page.locator('.tt-day-view .tt-class').click(); await expect(page.getByRole('dialog')).toContainText('THURSDAY'); await button('Close Schedule details').click()
  await step('Academic Setup').click(); await expect(button('Open Timetable')).toBeVisible()
  await page.screenshot({ path: 'test-results/timetable-academic-mobile-dark.png', fullPage: true })
  await button('Open Timetable').click()
  await goTab('Student Timetable'); await choose('Student', /Meera Rao/)
  await expect(page.locator('.tt-day-view .tt-class')).toHaveCount(1)
  await page.reload(); await choose('Student', /Meera Rao/); await expect(page.locator('.tt-day-view .tt-class')).toHaveCount(1)
  failBackend = true; await button('Refresh').click(); await expect(page.getByRole('alert')).toBeVisible()
  failBackend = false; await button('Retry').click(); await expect(page.getByRole('alert')).toHaveCount(0)
  assert.deepEqual(writes, []); assert.deepEqual(errors, [])
  console.log('PASS: both three-step flows, live automatic periods, editable/reordered manual periods, breaks/lunch, independent manual drafts, frequency absence, conflict-blocked move, Generate Missing preservation, final publish checks, holidays, shared published views, exports, persistence, desktop/tablet/mobile/dark, and API failures. No live writes.')
} catch (error) {
  await mkdir('test-results', { recursive: true }); await page.screenshot({ path: 'test-results/timetable-failure.png', fullPage: true })
  console.error('Browser failure:', page.url(), errors, (await page.locator('body').innerText()).slice(-5000)); throw error
} finally { await browser.close() }
