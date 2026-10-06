import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { same } from '../../utils/timetableUtils.js'
import { planningErrors, subjectRequirements, entryPlanningErrors } from '../../utils/timetablePlanner.js'
import { academicLevel, scopeSections } from './timetableDomain.js'
const code = readFileSync(new URL('./timetableBackendWorkflow.js', import.meta.url), 'utf8').replace(/^import .*$/gm, '').replaceAll('export ', '')
const scope = { academicYearId: '1', departmentId: '2', courseId: '3', branchId: '4', level: '1', semesterId: '5', sectionId: '6' }
const sources = { years: [{ id: '1' }], departments: [{ id: '2' }], courses: [{ id: '3', departmentId: '2' }], branches: [{ id: '4', courseId: '3', departmentId: '2', name: 'CSE' }], semesters: [{ id: '5', academicYearId: '1', semesterNumber: 1 }], sections: [{ ...scope, id: '6', room: 'A', name: 'A' }], subjects: [], faculty: [], allocations: [] }
const config = { calendar: { startDate: '2026-10-06', endDate: '2027-02-01', workingDays: ['MONDAY'], reviewed: true, holidays: [] }, periods: [{ id: '1', startTime: '09:00', endTime: '10:00' }], rooms: ['text:a'], requirements: {} }
function fixture(fail = false) {
  const calls = [], tables = [{ ...scope, id: '10', publicationStatus: 'published', revision: 1, planning: config, entries: [] }]
  const service = { getSources: async () => sources, list: async () => tables, detail: async id => tables.find(row => same(row.id, id)), setup: async (scope, name, planning) => { calls.push('create'); const table = { ...scope, id: '11', name, planning, publicationStatus: 'draft', revision: 1, entries: [] }; tables.push(table); return table }, generate: async () => { if (fail) throw new Error('Actual backend 500'); calls.push('generate') }, validate: async () => ({ valid: true, warnings: [] }), publish: async id => { calls.push(`publish:${id}`); tables.find(row => same(row.id, id)).publicationStatus = 'published' } }
  const context = vm.createContext({ service, departmentApi: { getAll: async () => sources.departments }, subjectApi: { list: async () => [] }, backendEntries: () => [], academicLevel, scopeSections, same, planningErrors, subjectRequirements, entryPlanningErrors, getUserRole: () => 'admin' })
  vm.runInContext(code + '\nthis.workflow = backendWorkflow', context)
  return { ...context, calls, tables }
}
test('new timetable period preserves published records for the same semester', async () => {
  const { workflow, tables, calls } = fixture()
  const history = JSON.stringify(tables[0])
  await workflow.generate({ scope, selected: ['6'], config, expected: [] })
  assert.equal(tables.length, 2)
  assert.equal(JSON.stringify(tables[0]), history)
  assert.deepEqual(calls, ['create', 'generate'])
  await workflow.publish([tables[1]])
  assert.equal(JSON.stringify(tables[0]), history)
  assert.equal(tables[1].publicationStatus, 'published')
})
test('backend failure remains a failure with no mock fallback or history changes', async () => {
  const { workflow, tables } = fixture(true)
  const history = JSON.stringify(tables[0])
  await assert.rejects(workflow.generate({ scope, selected: ['6'], config, expected: [] }), /Actual backend 500/)
  assert.equal(JSON.stringify(tables[0]), history)
})
test('published mutation and destructive reopen are rejected', async () => {
  const { workflow, tables } = fixture()
  await assert.rejects(workflow.saveEntry(tables[0], {}), /history cannot be edited/)
  assert.throws(() => workflow.reopen(tables[0]), /changes the published record in place/)
})
test('context changed after selection blocks backend generation', async () => {
  const { workflow, calls } = fixture()
  await assert.rejects(workflow.generate({ scope: { ...scope, academicYearId: '99' }, selected: ['6'], config, expected: [] }), /valid active sections/)
  assert.deepEqual(calls, [])
})
