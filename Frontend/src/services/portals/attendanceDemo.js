const same = (a, b) => String(a) === String(b)

const subjects = [
  { id: 'electrical-circuits', name: 'Electrical Circuits' },
  { id: 'signals-systems', name: 'Signals and Systems' },
  { id: 'engineering-mathematics', name: 'Engineering Mathematics' },
  { id: 'programming-problem-solving', name: 'Programming for Problem Solving' },
]
const sections = ['A', 'B', 'C', 'D']
const names = ['Aarav Reddy', 'Ananya Rao', 'Vihan Kumar', 'Diya Sharma', 'Arjun Naidu', 'Meera Patel', 'Rohan Das', 'Ishita Nair']

export function createAttendanceDemo(date) {
  const assignments = subjects.flatMap(subject => Array.from({ length: 8 }, (_, index) => index + 1).flatMap(semester => sections.map(section => ({
    id: `demo-${subject.id}-sem${semester}-${section.toLowerCase()}`,
    subjectId: `demo-${subject.id}`,
    subjectName: subject.name,
    sectionId: `demo-section-${section.toLowerCase()}`,
    sectionName: `Section ${section}`,
    semesterId: semester,
    semesterName: `Semester ${semester}`,
    academicYearName: '2026–2027',
  }))))
  const students = sections.flatMap(section => names.map((name, index) => ({
    id: `demo-student-${section}-${index + 1}`,
    studentId: `demo-student-${section}-${index + 1}`,
    name,
    studentName: name,
    rollNumber: `DEMO-${section}${String(index + 1).padStart(3, '0')}`,
    studentCode: `DEMO-${section}${String(index + 1).padStart(3, '0')}`,
    sectionId: `demo-section-${section.toLowerCase()}`,
  })))
  const saved = new Map()
  let nextId = 1
  const assignmentFor = allocationId => {
    const assignment = assignments.find(row => same(row.id, allocationId))
    if (!assignment) throw new Error('Choose a class from the demo catalog.')
    return assignment
  }
  const classStudents = assignment => students.filter(student => same(student.sectionId, assignment.sectionId))
  const api = {
    async getSessions(allocationId, selectedDate) {
      assignmentFor(allocationId)
      return [...saved.values()].filter(row => row.allocationId === allocationId && row.attendanceDate === selectedDate).map(({ records: _records, ...row }) => row)
    },
    async getSessionHistory(allocationId) {
      assignmentFor(allocationId)
      return [...saved.values()].filter(row => row.allocationId === allocationId).map(({ records: _records, ...row }) => row)
    },
    async getSessionRoster(allocationId, selectedDate, sessionId) {
      const assignment = assignmentFor(allocationId)
      const row = saved.get(String(sessionId))
      if (!row || row.allocationId !== allocationId || row.attendanceDate !== selectedDate) throw new Error('Demo session not found.')
      return { attendanceSessionId: sessionId, sessionStatus: row.sessionStatus, students: classStudents(assignment).map(student => ({ ...student, ...row.records.find(record => same(record.studentId, student.id)) })) }
    },
    async saveAttendance({ allocationId, date: selectedDate, records }) {
      const assignment = assignmentFor(allocationId)
      const roster = classStudents(assignment)
      if (!selectedDate || !records.length || records.length !== roster.length || new Set(records.map(row => String(row.studentId))).size !== roster.length || records.some(row => !roster.some(student => same(student.id, row.studentId)) || !['PRESENT', 'ABSENT', 'LATE', 'LEAVE'].includes(row.attendanceStatus))) throw new Error('Mark every demo student before submitting.')
      if ([...saved.values()].some(row => row.allocationId === allocationId && row.attendanceDate === selectedDate)) throw new Error('This demo session is already completed. Choose another date or class.')
      const id = `demo-session-${nextId++}`
      saved.set(id, { attendanceSessionId: id, allocationId, attendanceDate: selectedDate, subjectName: assignment.subjectName, sectionName: assignment.sectionName, sessionStatus: 'COMPLETED', records: structuredClone(records) })
      return { success: true, demo: true }
    },
  }
  return { data: { assignments, students, warnings: [], mode: 'demo' }, api, initialDate: date }
}
