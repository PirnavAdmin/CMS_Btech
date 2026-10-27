const same = (a, b) => String(a) === String(b)
export function createAttendanceDemo(date) {
  const a = { id: 'demo-allocation', subjectId: 'demo-subject', subjectName: 'Electrical Circuits', subjectCode: 'EE101', sectionId: 'demo-section', sectionName: 'Section A', semesterName: 'Semester 1', academicYearName: '2026–2027' }
  const names = ['Aarav Reddy', 'Ananya Rao', 'Vihan Kumar', 'Diya Sharma', 'Arjun Naidu', 'Meera Patel', 'Rohan Das', 'Ishita Nair']
  const students = names.map((name, index) => ({ id: `demo-student-${index + 1}`, studentId: `demo-student-${index + 1}`, name, studentName: name, rollNumber: `DEMO-${String(index + 1).padStart(3, '0')}`, studentCode: `DEMO-${String(index + 1).padStart(3, '0')}`, sectionId: a.sectionId }))
  const saved = new Map()
  let nextId = 1
  const authorize = allocationId => { if (!same(allocationId, a.id)) throw new Error('Choose the demo class.') }
  const api = {
    async getSessions(allocationId, selectedDate) { authorize(allocationId); return [...saved.values()].filter(row => row.attendanceDate === selectedDate).map(({ records: _records, ...row }) => row) },
    async getSessionHistory(allocationId) { authorize(allocationId); return [...saved.values()].map(({ records: _records, ...row }) => row) },
    async getSessionRoster(allocationId, selectedDate, sessionId) {
      authorize(allocationId)
      const row = saved.get(String(sessionId))
      if (!row || row.attendanceDate !== selectedDate) throw new Error('Demo session not found.')
      return { attendanceSessionId: sessionId, sessionStatus: row.sessionStatus, students: students.map(student => ({ ...student, ...row.records.find(record => same(record.studentId, student.id)) })) }
    },
    async saveAttendance({ allocationId, date: selectedDate, records }) {
      authorize(allocationId)
      if (!selectedDate || !records.length || records.length !== students.length || new Set(records.map(row => String(row.studentId))).size !== students.length || records.some(row => !students.some(student => same(student.id, row.studentId)) || !['PRESENT', 'ABSENT', 'LATE', 'LEAVE'].includes(row.attendanceStatus))) throw new Error('Mark every demo student before submitting.')
      if ([...saved.values()].some(row => row.attendanceDate === selectedDate)) throw new Error('This demo session is already completed. Choose another date or restart demo mode.')
      const id = `demo-session-${nextId++}`
      saved.set(id, { attendanceSessionId: id, attendanceDate: selectedDate, subjectName: a.subjectName, sectionName: a.sectionName, sessionStatus: 'COMPLETED', records: structuredClone(records) })
      return { success: true, demo: true }
    },
  }
  return { data: { assignments: [a], students, warnings: [], mode: 'demo' }, api, initialDate: date }
}
