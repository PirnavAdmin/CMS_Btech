import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import * as utils from '../utils/timetableUtils.js'
import * as periods from '../utils/timetablePeriods.js'

const source = readFileSync(new URL('./backendTimetableService.js', import.meta.url), 'utf8').replace(/^import .*$/gm, '').replaceAll('export ', '')
const scope = { academicYearId: 2, courseId: 1, branchId: 1, semesterId: 1, sectionId: 1 }
const detail = { timetable: { ...scope, timetableId: 8, timetableName: 'CSE A', status: 'DRAFT', revision: 1, effectiveFrom: '2026-09-01', effectiveTo: '2026-12-31' },
  slots: [{ timetableSlotId: 21, startTime: '09:00:00', endTime: '10:00:00', slotName: 'P1' }], requirements: [{ subjectId: 3, periodsPerWeek: 2, blockSize: 1 }], entries: [{ timetableEntryId: 11, timetableSlotId: 21, subjectId: 3, facultyId: 4, classroomId: 5, classroomName: 'Room A', dayOfWeek: 'Monday', startTime: '09:00:00', endTime: '10:00:00', active: true }] }
function setup(failPath = '') {
  const calls = []
  const api = Object.fromEntries(['get', 'post', 'put', 'remove'].map(method => [method, async (path, payload) => {
    calls.push({ method, path, payload })
    if (path === failPath) throw new Error('Backend failure')
    if (path === '/timetables' && method === 'post') return { timetableId: 8 }
    if (path === '/timetables') return [detail.timetable]
    if (path === '/timetables/8') return detail
    if (path === '/periods' && method === 'post') return { periodId: 6 }
    if (path === '/periods') return []
    if (path === '/calendar') return { reviewed: true, workingDays: ['MONDAY'], holidays: [], academicYearStartDate: '2026-09-01', academicYearEndDate: '2026-12-31' }
    if (path === '/classrooms') return [{ classroomId: 5, classroomName: 'Room A', active: true }]
    if (path.endsWith('/validate')) return { valid: false, unscheduled: [{ message: 'Weekly frequency missing' }] }
    if (path.includes('/views/')) return []
    return {}
  }]))
  const context = vm.createContext({ ...utils, ...periods, api, timetableService: {} })
  vm.runInContext(`${source}\nthis.service = backendTimetableService; this.normalize = normalizeTimetable`, context)
  return { ...context, calls }
}
test('backend details map real IDs, publication, room and calendar without browser storage', async () => {
  const { service, calls } = setup()
  const [table] = await service.list()
  assert.equal(table.id, '8'); assert.equal(table.publicationStatus, 'draft')
  assert.equal(table.entries[0].id, 11); assert.equal(table.entries[0].roomId, 5)
  assert.equal(table.planning.periods[0].id, '21'); assert.equal(table.planning.requirements[3].periodsPerWeek, 2)
  assert(calls.filter(row => ['/periods', '/calendar'].includes(row.path)).every(row => row.payload.academicYearId === 2))
})
test('setup sends documented numeric IDs, calendar and period payloads before synchronizing slots', async () => {
  const { service, calls } = setup()
  await service.setup(scope, 'CSE A', { periods: [{ id: 'preview-id', name: 'P1', type: 'class', startTime: '09:00', endTime: '10:00' }], calendar: { reviewed: true, workingDays: ['MONDAY'], holidays: ['2026-10-02'], startDate: '2026-09-01', endDate: '2026-12-31' }, requirements: {} })
  const created = calls.find(row => row.path === '/timetables' && row.method === 'post')
  assert.equal(created.payload.academicYearId, 2); assert.equal(created.payload.effectiveFrom, '2026-09-01T00:00:00')
  assert.equal(calls.find(row => row.path === '/periods' && row.method === 'post').payload.periodType, 'CLASS')
  assert.equal(calls.find(row => row.path === '/calendar' && row.method === 'put').payload.holidays[0].date, '2026-10-02T00:00:00')
  assert(calls.some(row => row.path === '/timetables/8/sync-periods'))
})
test('manual entry uses slot and classroom IDs; updates and deletes target the selected timetable', async () => {
  const { service, calls } = setup()
  const form = { subjectId: '3', facultyId: '4', roomId: '5', dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' }
  await service.saveEntry(8, 1, form)
  const saved = calls.find(row => row.path.endsWith('/entries'))
  assert.equal(saved.payload.timetableSlotId, 21); assert.equal(saved.payload.classroomId, 5)
  await service.saveEntry(8, 1, { ...form, id: 11 })
  await service.removeEntry(8, 1, 11)
  assert(calls.some(row => row.method === 'put' && row.path.endsWith('/entries/11')))
  assert(calls.some(row => row.method === 'remove' && row.path.endsWith('/entries/11')))
  await assert.rejects(service.saveEntry(8, 1, { ...form, roomId: 'text:Room A' }), /valid backend/)
})
test('generation preserves endpoint semantics and validation displays server reasons', async () => {
  const { service, calls } = setup()
  await service.generate(scope, 'CSE A', { rooms: ['id:5'] }, { tableId: 8 })
  await service.generate(scope, 'CSE A', { rooms: ['id:5'] }, { tableId: 8, replace: true })
  assert(calls.some(row => row.path.endsWith('/generate-missing') && row.payload.classroomIds[0] === 5))
  assert(calls.some(row => row.path.endsWith('/generate') && row.payload.replaceGenerated === true))
  const result = await service.validate(8)
  assert.equal(result.valid, false); assert.match(result.message, /Weekly frequency missing/)
  await service.publish(8); await service.reopen(8); await service.view('faculty', 4, { academicYearId: 2 })
  assert(calls.some(row => row.method === 'post' && row.path.endsWith('/publish')))
  assert(calls.some(row => row.path === '/views/faculty/4'))
})
test('backend failures propagate and stop the workflow instead of local success', async () => {
  const { service, calls } = setup('/periods')
  await assert.rejects(service.setup(scope, 'CSE A', {}), /Backend failure/)
  assert.equal(calls.length, 1)
  await assert.rejects(service.detail('local-uuid'), /valid backend/)
})
