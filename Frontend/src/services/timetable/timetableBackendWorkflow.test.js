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
  const service = { getSources: async () => sources, list: async () => tables, detail: async id => tables.find(row => same(row.id, id)), setup: async (scope, name, planning) => { calls.push('create'); const table = { ...scope, id: '11', name, planning, publicationStatus: 'draft', revision: 1, entries: [] }; tables.push(table); return table }, generate: async () => { if (fail) throw new Error('Actual backend 500'); calls.push('generate') }, validateGlobal: async () => ({ valid: true }), validate: async () => ({ valid: true, warnings: [] }), publish: async () => { throw new Error('Individual publish must not be used') }, publishBatch: async selected => { calls.push('publish-batch'); selected.forEach(item => { tables.find(row => same(row.id, item.id)).publicationStatus = 'published' }) }, createRevision: async (id, expectedRevision, reason) => { calls.push('revision'); const source = tables.find(row => same(row.id, id)); assert.equal(expectedRevision, source.revision); assert(reason === undefined || typeof reason === 'string'); const created = { ...structuredClone(source), id: '11', publicationStatus: 'draft', revision: 1 }; tables.push(created); return { timetableId: 11 } } }
  const context = vm.createContext({ service, departmentApi: { getAll: async () => sources.departments }, subjectApi: { list: async () => [] }, backendEntries: () => [], validateTable: () => [], decorateEntries: rows => rows, academicLevel, scopeSections, same, planningErrors, subjectRequirements, entryPlanningErrors, getUserRole: () => 'admin' })
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

test('Save Draft creates and reopens a draft without generating or publishing', async () => {
  const { workflow, tables, calls } = fixture()
  const saved = await workflow.saveDraft({ scope, selected: ['6'], config })
  assert.equal(saved[0].publicationStatus, 'draft')
  assert.equal(saved[0].entries.length, 0)
  assert.deepEqual(calls, ['create'])
  assert.equal(tables[0].publicationStatus, 'published')
  await assert.rejects(workflow.saveDraft({ scope, selected: ['6'], config, expected: [tables[0]] }), /history cannot be edited/)
})

test('publication refuses missing global validation and releases duplicate-request guard', async () => {
  const { workflow, tables, service, calls } = fixture()
  await workflow.saveDraft({ scope, selected: ['6'], config })
  service.validateGlobal = async () => ({})
  await assert.rejects(workflow.publish([tables[1]]), /Global validation/)
  assert(!calls.some(call => call === 'publish-batch'))
  service.validateGlobal = async () => ({ isValid: true })
  await workflow.publish([tables[1]])
  assert.equal(calls.filter(call => call === 'publish-batch').length, 1)
})

test('overlapping publish attempts cannot send duplicate requests', async () => {
  const { workflow, tables, service, calls } = fixture()
  await workflow.saveDraft({ scope, selected: ['6'], config })
  let release
  service.validateGlobal = () => new Promise(resolve => { release = () => resolve({ valid: true }) })
  const first = workflow.publish([tables[1]])
  await assert.rejects(workflow.publish([tables[1]]), /already in progress/)
  while (!release) await new Promise(resolve => setImmediate(resolve))
  release(); await first
  assert.equal(calls.filter(call => call === 'publish-batch').length, 1)
})

test('changed schedule content is rejected even when the backend omits a revision number', async () => {
  const { workflow, tables, service } = fixture()
  await workflow.saveDraft({ scope, selected: ['6'], config })
  const expected = { ...tables[1], revision: undefined }
  service.detail = async () => ({ ...expected, planning: { ...config, calendar: { ...config.calendar, endDate: '2027-03-01' } } })
  await assert.rejects(workflow.saveEntry(expected, {}), /Timetable changed/)
})

test('real revision creates a separate draft and retains the original published record', async () => {
  const { workflow, tables, calls } = fixture()
  const before = JSON.stringify(tables[0])
  const revision = await workflow.createRevision(tables[0], 'Correct classroom')
  assert.equal(revision.publicationStatus, 'draft')
  assert.notEqual(revision.id, tables[0].id)
  assert.equal(JSON.stringify(tables[0]), before)
  assert.deepEqual(calls, ['revision'])
  await assert.rejects(workflow.createRevision(revision, ''), /Only a published timetable/)
})

test('batch rejection propagates without falling back to individual publication', async () => {
  const { workflow, tables, service, calls } = fixture()
  await workflow.saveDraft({ scope, selected: ['6'], config })
  service.publishBatch = async () => { throw Object.assign(new Error('Stale revision'), { status: 409 }) }
  await assert.rejects(workflow.publish([tables[1]]), error => error.status === 409)
  assert.equal(tables[1].publicationStatus, 'draft')
  assert(!calls.includes('publish-batch'))
})

test('successful batch HTTP response must also be confirmed by published backend state', async () => {
  const { workflow, tables, service } = fixture()
  await workflow.saveDraft({ scope, selected: ['6'], config })
  service.publishBatch = async () => ({ accepted: true })
  await assert.rejects(workflow.publish([tables[1]]), /not confirmed publication/)
})
