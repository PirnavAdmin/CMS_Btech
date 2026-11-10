import { dateOnly, validateSchedule } from '../utils/semesterUtils.js'

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
    value = value.data ?? value.items ?? value.semesters ?? value.records ?? value.$values
  }
  throw new Error('The semester list could not be verified. No semesters were created.')
}

export function inspectBranchSemesters({ branchId, courseId, course, rows }) {
  const expected = semesterStructure(course)
  const existing = rows.filter(row => String(row.branchId) === String(branchId) && String(row.courseId) === String(courseId))
  const numbers = new Set(existing.map(row => Number(row.semesterNumber)))
  const missing = expected.filter(row => !numbers.has(row.semesterNumber))
  if (existing.some(row => {
    const planned = expected.find(item => item.semesterNumber === Number(row.semesterNumber))
    return !planned || !(row.semesterId ?? row.id) || (Number(row.yearNumber) > 0 && planned.yearNumber !== Number(row.yearNumber))
  })) throw new Error('The saved semester structure differs from the course configuration. Backend dependency validation is required before structural changes.')
  const years = new Set(existing.map(row => Number(row.academicYearId)).filter(id => id > 0))
  if (missing.length && years.size > 1) throw new Error('Existing definitions span multiple academic years. The correct year for the missing records cannot be determined safely.')
  return { expected, existing, missing, academicYearId: [...years][0] ?? null }
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
async function generate({ branchId, courseId, course, list, create, approvedNumbers, datesByNumber = {}, assertScope = () => {} }) {
  if (!(Number(branchId) > 0) || !(Number(courseId) > 0)) throw new Error('Save the branch before generating semesters.')
  const plan = semesterStructure(course)
  const requested = plan.filter(term => datesByNumber[term.semesterNumber]?.startDate || datesByNumber[term.semesterNumber]?.endDate)
    .map(term => ({ ...term, ...datesByNumber[term.semesterNumber] }))
  for (const term of requested) {
    if (term.startDate && term.startDate === term.endDate) throw new Error(term.semesterName + ': the start date must be before the end date.')
  }
  const dateError = validateSchedule(requested)
  if (dateError) throw new Error(dateError)
  const matching = rows => rows.filter(row => String(row.branchId) === String(branchId) && String(row.courseId) === String(courseId))
  for (const definition of plan) {
    assertScope()
    const inspected = inspectBranchSemesters({ branchId, courseId, course, rows: semesterRecords(await list()) })
    assertScope()
    if (approvedNumbers && inspected.missing.some(row => !approvedNumbers.includes(row.semesterNumber))) throw new Error('The missing records changed. Review the latest structure before confirming again.')
    if (!inspected.missing.some(row => row.semesterNumber === definition.semesterNumber)) continue
    if (requested.length) {
      const missingNumbers = new Set(inspected.missing.map(row => row.semesterNumber))
      const scheduleError = validateSchedule([
        ...inspected.existing.filter(row => row.startDate && row.endDate),
        ...requested.filter(row => missingNumbers.has(row.semesterNumber)),
      ])
      if (scheduleError) throw new Error(scheduleError)
    }
    const dates = requested.find(term => term.semesterNumber === definition.semesterNumber)
    try {
      await create({ courseId: Number(courseId), branchId: Number(branchId), academicYearId: inspected.academicYearId, ...definition,
        startDate: dates?.startDate ?? null, endDate: dates?.endDate ?? null, status: 0 })
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
  if (requested.some(term => !rows.some(row => Number(row.semesterNumber) === term.semesterNumber &&
    dateOnly(row.startDate) === term.startDate && dateOnly(row.endDate) === term.endDate))) {
    throw new Error('Semester definitions are saved, but some dates could not be verified. Check the saved dates before making changes.')
  }
  return rows
}
