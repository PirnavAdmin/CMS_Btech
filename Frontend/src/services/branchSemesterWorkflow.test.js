import test from 'node:test'
import assert from 'node:assert/strict'
import { ensureBranchSemesters, semesterStructure } from './branchSemesterWorkflow.js'

for (const [name, years, count] of [['B.Tech',4,8],['M.Tech',2,4],['Other',3,9]]) {
  test(`${name} uses its configured ${count} semesters`, () => {
    const rows = semesterStructure({ durationYears: years, totalSemesters: count })
    assert.equal(rows.length,count); assert.equal(rows.at(-1).yearNumber,years)
  })
}
test('unknown or inconsistent structure blocks generation', () => {
  assert.throws(() => semesterStructure({ durationYears: 4 }), /Configure/)
  assert.throws(() => semesterStructure({ durationYears: 4, totalSemesters: 7 }), /Configure/)
})
function adapter(rows = []) {
  const calls = []
  return { rows, calls, list: async () => ({ data: { data: rows } }), create: async body => { calls.push(body); rows.push({ ...body, semesterId: 100 + body.semesterNumber }) } }
}
const options = a => ({ branchId: 7, courseId: 10, course: { durationYears: 2, totalSemesters: 4 }, ...a })
test('generates only missing definitions, retains IDs and is idempotent', async () => {
  const a = adapter([{ semesterId: 22, branchId: 7, courseId: 10, semesterNumber: 1, yearNumber: 1, academicYearId: 5 }])
  await ensureBranchSemesters(options(a)); await ensureBranchSemesters(options(a))
  assert.equal(a.calls.length,3); assert.equal(a.rows[0].semesterId,22)
  assert.ok(a.calls.every(row => row.academicYearId === 5 && row.startDate === null))
})
test('partial failure retries only missing saved records', async () => {
  const a = adapter(); const create = a.create; let fail = true
  a.create = async body => { if (body.semesterNumber === 3 && fail) throw Error('offline'); return create(body) }
  await assert.rejects(ensureBranchSemesters(options(a)), /offline/)
  assert.equal(a.rows.length,2); fail = false
  await ensureBranchSemesters(options(a)); assert.equal(a.rows.length,4); assert.equal(a.calls.length,4)
})
test('concurrent recovery shares one run', async () => {
  const a = adapter(); await Promise.all([ensureBranchSemesters(options(a)),ensureBranchSemesters(options(a))]); assert.equal(a.calls.length,4)
})
test('unknown list, unsaved branch and changed college never write records', async () => {
  const a = adapter()
  await assert.rejects(ensureBranchSemesters(options({ ...a, branchId: null })), /Save the branch/)
  await assert.rejects(ensureBranchSemesters(options({ ...a, list: async () => ({ success: true }) })), /could not be verified/)
  await assert.rejects(ensureBranchSemesters(options({ ...a, assertScope: () => { throw Error('college changed') } })), /college changed/)
  assert.equal(a.calls.length,0)
})
test('structural reductions preserve all records and require validation', async () => {
  const a = adapter([{ semesterId: 30, branchId:7,courseId:10,semesterNumber:8,yearNumber:4 }])
  await assert.rejects(ensureBranchSemesters(options(a)), /dependency validation/)
  assert.equal(a.calls.length,0); assert.equal(a.rows[0].semesterId,30)
})
test('ambiguous academic years and unapproved repairs never create records', async () => {
  const one = { semesterId: 31, branchId: 7, courseId: 10, semesterNumber: 1, yearNumber: 1, academicYearId: 5 }
  const a = adapter([one, { ...one, semesterId: 32, semesterNumber: 2, academicYearId: 6 }])
  await assert.rejects(ensureBranchSemesters(options(a)), /multiple academic years/)
  a.rows.pop()
  await assert.rejects(ensureBranchSemesters(options({ ...a, approvedNumbers: [2, 3] })), /missing records changed/)
  assert.equal(a.calls.length, 0)
})
test('a successful response without saved rows fails persistence verification', async () => {
  const a = adapter(); a.create = async () => ({ success: true })
  await assert.rejects(ensureBranchSemesters(options(a)), /persistence could not be verified/)
})
