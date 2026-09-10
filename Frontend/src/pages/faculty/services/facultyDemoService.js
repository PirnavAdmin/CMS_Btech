import { academicYears, branches, classAdvisorAssignments, courses, facultyAttendance, facultyDemoData, sections, semesters, subjectAllocations, subjects } from '../data/facultyDemoData'

let state = { faculty: structuredClone(facultyDemoData), allocations: structuredClone(subjectAllocations), advisors: structuredClone(classAdvisorAssignments), attendance: structuredClone(facultyAttendance) }
const listeners = new Set()
const notify = () => listeners.forEach((listener) => listener())
const clone = (value) => structuredClone(value)
const find = (rows, id) => rows.find((row) => String(row.id) === String(id))
const join = (allocation) => ({ ...allocation, faculty: find(state.faculty, allocation.facultyId), subject: find(subjects, allocation.subjectId), branch: find(branches, allocation.branchId), semester: find(semesters, allocation.semesterId), section: find(sections, allocation.sectionId), academicYear: find(academicYears, allocation.academicYearId) })
const nextEmployeeId = () => {
  const highest = state.faculty.reduce((max, row) => Math.max(max, Number(String(row.employeeId || '').match(/(\d+)$/)?.[1] || 0)), 0)
  return `FAC${String(highest + 1).padStart(3, '0')}`
}

export const facultyDemoService = {
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  getState() { return clone(state) },
  list() { return clone(state.faculty) },
  getById(id) { return clone(find(state.faculty, id)) },
  getNextEmployeeId() { return nextEmployeeId() },
  create(values) { const record = { ...values, id: `faculty-${Date.now()}`, employeeStatus: values.employmentStatus || 'Working', documents: values.documents || [] }; state.faculty = [record, ...state.faculty]; notify(); return clone(record) },
  update(id, values) { state.faculty = state.faculty.map((row) => String(row.id) === String(id) ? { ...row, ...values } : row); notify(); return this.getById(id) },
  updateStatus(id, employmentStatus) {
    const faculty = find(state.faculty, id)
    if (!faculty) throw new Error('Faculty record was not found.')
    if (['Resigned', 'Retired'].includes(employmentStatus)) {
      const hasAssignments = state.advisors.some((row) => row.facultyId === id) || state.allocations.some((row) => row.facultyId === id && row.status !== 'Inactive')
      if (hasAssignments) throw new Error('This faculty member currently has academic responsibilities. Reassign the active responsibilities before completing the employment status change.')
    }
    const historyEvent = employmentStatus === 'Working' && faculty.employmentStatus === 'On Leave' ? 'Returned to Work' : employmentStatus
    return this.update(id, { employmentStatus, employmentHistory: [...(faculty.employmentHistory || []), { event: historyEvent, date: new Date().toISOString().slice(0, 10), detail: `Employment status changed to ${employmentStatus}` }] })
  },
  getAllocations(filters = {}) { return state.allocations.filter((row) => Object.entries(filters).every(([key, value]) => !value || String(row[key]) === String(value))).map(join).map(clone) },
  createAllocation(values) { const faculty = find(state.faculty, values.facultyId); if (faculty?.employmentStatus !== 'Working') throw new Error('Only Working Faculty can receive new subject allocations.'); const duplicate = state.allocations.some((row) => ['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId', 'subjectId', 'facultyId', 'type'].every((key) => String(row[key]) === String(values[key]))); if (duplicate) throw new Error('This subject is already allocated to this faculty for the selected section and type.'); const record = { ...values, id: `alloc-${Date.now()}`, allocationStatus: values.allocationStatus || 'Active' }; state.allocations = [...state.allocations, record]; notify(); return clone(join(record)) },
  updateAllocation(id, values) { state.allocations = state.allocations.map((row) => row.id === id ? { ...row, ...values } : row); notify(); return this.getAllocations().find((row) => row.id === id) },
  updateAllocationStatus(id, status) { return this.updateAllocation(id, { status }) },
  getAdvisors() { return state.advisors.map((row) => ({ ...row, section: find(sections, row.sectionId), faculty: find(state.faculty, row.facultyId), academicYear: find(academicYears, row.academicYearId) })).map(clone) },
  assignAdvisor(values) { const selected = find(state.faculty, values.facultyId); if (selected?.employmentStatus !== 'Working') throw new Error('Only Working Faculty can receive new class advisor assignments.'); const next = { ...values, id: values.id || `advisor-${Date.now()}` }; state.advisors = [...state.advisors.filter((row) => row.sectionId !== values.sectionId), next]; notify(); return clone(next) },
  getAttendance(filters = {}) { return state.attendance.filter((row) => Object.entries(filters).every(([key, value]) => !value || String(row[key]) === String(value))).map((row) => ({ ...row, faculty: find(state.faculty, row.facultyId) })).map(clone) },
  markAttendance(values) { const record = { ...values, id: values.id || `att-${Date.now()}` }; state.attendance = [...state.attendance.filter((row) => !(row.facultyId === values.facultyId && row.date === values.date)), record]; notify(); return clone(record) },
  attendanceSummary(month) { return state.faculty.map((faculty) => { const rows = state.attendance.filter((row) => row.facultyId === faculty.id && (!month || row.date.startsWith(month))); const present = rows.filter((row) => row.attendanceStatus === 'Present').length; const absent = rows.filter((row) => row.attendanceStatus === 'Absent').length; const leave = rows.filter((row) => row.attendanceStatus === 'On Leave').length; const duty = rows.filter((row) => row.attendanceStatus === 'On Duty').length; const halfDay = rows.filter((row) => row.attendanceStatus === 'Half Day').length; const workingDays = rows.length; return { faculty, workingDays, present, absent, leave, duty, halfDay, percentage: workingDays ? Math.round((present / workingDays) * 100) : 0 } }) },
  workload(facultyId) { const rows = this.getAllocations({ facultyId }); return { allocations: rows, subjects: new Set(rows.map((row) => row.subjectId)).size, sections: new Set(rows.map((row) => row.sectionId)).size, theory: rows.filter((row) => row.type === 'Theory').reduce((sum, row) => sum + Number(row.hours), 0), lab: rows.filter((row) => row.type === 'Lab').reduce((sum, row) => sum + Number(row.hours), 0), tutorial: rows.filter((row) => row.type === 'Tutorial').reduce((sum, row) => sum + Number(row.hours), 0), total: rows.reduce((sum, row) => sum + Number(row.hours), 0) } },
  masters: { academicYears: clone(academicYears), courses: clone(courses), branches: clone(branches), semesters: clone(semesters), sections: clone(sections), subjects: clone(subjects) },
};

export const useFacultyDemoSnapshot = (useState, useEffect) => { const [snapshot, setSnapshot] = useState(() => facultyDemoService.getState()); useEffect(() => facultyDemoService.subscribe(() => setSnapshot(facultyDemoService.getState())), []); return snapshot }
