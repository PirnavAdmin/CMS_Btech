import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const spec = JSON.parse(readFileSync(new URL('../../timetable-current-openapi.json', import.meta.url), 'utf8'))
const source = readFileSync(new URL('./timetableLifecycleApi.js', import.meta.url), 'utf8').replace(/^import .*$/gm, '').replaceAll('export ', '')
const context = vm.createContext({ timetableManagementApi: {} })
vm.runInContext(`${source}\nthis.operations = timetableOperations; this.create = createTimetableLifecycleApi`, context)

test('all lifecycle operations match downloaded Swagger methods, paths, query names and request schemas', () => {
  const verified = new Set()
  for (const [method, path, fields] of Object.values(context.operations)) {
    const http = method === 'remove' ? 'delete' : method
    const operation = spec.paths[`/api/v1/timetable-management${path}`]?.[http]
    assert.ok(operation, `${http} ${path}`)
    if (typeof fields === 'string') assert.equal(operation.requestBody.content['application/json'].schema.$ref, `#/components/schemas/${fields}`)
    if (Array.isArray(fields)) assert.deepEqual([...fields], operation.parameters.filter(row => row.in === 'query').map(row => row.name))
    verified.add(`${http} /api/v1/timetable-management${path}`)
  }
  for (const [path, operations] of Object.entries(spec.paths).filter(([path]) => path.startsWith('/api/v1/timetable-management/'))) {
    for (const method of Object.keys(operations)) assert.ok(verified.has(`${method} ${path}`), `Unmapped: ${method} ${path}`)
  }
})

test('transport preserves server responses and errors without reading browser persistence', async () => {
  const response = { server: 'authoritative' }, calls = []
  const api = context.create(Object.fromEntries(['get', 'post', 'put', 'remove'].map(method => [method, async (...args) => { calls.push({ method, args }); return response }])))
  const ids = { timetableId: 7, entryId: 8, periodId: 9, classroomId: 10, facultyId: 11, studentId: 12, sectionId: 13 }
  for (const operation of Object.keys(context.operations)) assert.equal(await api[operation](ids, { body: true }), response)
  assert.ok(calls.some(call => call.method === 'post' && call.args[0] === '/timetables/7/regenerate'))
  assert.ok(calls.some(call => call.method === 'put' && call.args[0] === '/timetables/7/entries/8/move'))
  assert.throws(() => api.timetable({ timetableId: 'local-uuid' }), /valid backend/)
  for (const status of [400, 401, 403, 404, 409, 422, 500]) {
    const error = Object.assign(new Error(`API ${status}`), { status })
    const failing = context.create({ post: async () => { throw error } })
    await assert.rejects(failing.generate({ timetableId: 7 }, {}), reason => reason === error)
  }
})
