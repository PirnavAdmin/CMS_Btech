export function semesterStructure(course = {}) {
  const years = Number(course.durationYears ?? course.durationValue ?? course.duration)
  const count = Number(course.totalSemesters ?? course.semesters)
  const perYear = Number(course.semestersPerYear || (count / years))
  if (!Number.isFinite(years) || years <= 0 || !Number.isInteger(count) || count < 1 || count > 100 || !Number.isInteger(perYear) || perYear < 1 || years * perYear !== count) {
    throw new Error('Configure a valid course duration and total semesters before generating branch semesters.')
  }
  return Array.from({ length: count }, (_, index) => ({ semesterNumber: index + 1, semesterName: `Semester ${index + 1}`, yearNumber: Math.floor(index / perYear) + 1 }))
}

export function semesterRecords(response) {
  let value = response
  for (let depth = 0; depth < 6; depth++) {
    if (Array.isArray(value)) return value
    if (!value || typeof value !== 'object') break
    value = value.data ?? value.items ?? value.semesters ?? value.records
  }
  throw new Error('The semester list could not be verified. No semesters were created.')
}

// Read before every create, then re-read after completion. A failed/ambiguous
// response stops this run; retry reads the server and skips saved records.
const pending = new Map()
export function ensureBranchSemesters(options) {
  const key = `${options.courseId}:${options.branchId}`
  if (pending.has(key)) return pending.get(key)
  const run = generate(options).finally(() => pending.delete(key))
  pending.set(key, run)
  return run
}
async function generate({ branchId, courseId, course, list, create, assertScope = () => {} }) {
  if (!(Number(branchId) > 0) || !(Number(courseId) > 0)) throw new Error('Save the branch before generating semesters.')
  const plan = semesterStructure(course)
  const matching = rows => rows.filter(row => String(row.branchId) === String(branchId) && String(row.courseId) === String(courseId))
  for (const definition of plan) {
    assertScope()
    const rows = matching(semesterRecords(await list()))
    assertScope()
    if (rows.some(row => Number(row.semesterNumber) > plan.length || (Number(row.yearNumber) > 0 && plan.find(item => item.semesterNumber === Number(row.semesterNumber))?.yearNumber !== Number(row.yearNumber)))) throw new Error('The saved semester structure differs from the course configuration. Backend dependency validation is required before structural changes.')
    if (rows.some(row => Number(row.semesterNumber) === definition.semesterNumber)) continue
    try {
      await create({ courseId: Number(courseId), branchId: Number(branchId), academicYearId: null, ...definition, startDate: null, endDate: null, status: 0 })
    } catch (reason) {
      assertScope()
      const refreshed = matching(semesterRecords(await list()))
      if (!refreshed.some(row => Number(row.semesterNumber) === definition.semesterNumber)) throw reason
    }
  }
  assertScope()
  const rows = matching(semesterRecords(await list()))
  assertScope()
  if (plan.some(definition => !rows.some(row => Number(row.semesterNumber) === definition.semesterNumber && (row.semesterId ?? row.id)))) throw new Error('Semester persistence could not be verified. Retry to check the saved structure.')
  return rows
}
