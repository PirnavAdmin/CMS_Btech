// Fixture IDs belong exclusively to the isolated preview workspace.
export function createPortalFixtures() {
  return {
    departments: [{ id: 'cse', name: 'Computer Science' }, { id: 'ece', name: 'Electronics & Communication' }],
    courses: [{ id: 'btech', name: 'B.Tech' }],
    branches: [{ id: 'btech-cse', name: 'Computer Science & Engineering', courseId: 'btech', departmentId: 'cse' }, { id: 'btech-ece', name: 'Electronics & Communication Engineering', courseId: 'btech', departmentId: 'ece' }],
    academicLevels: [1, 2, 3, 4].map(year => ({ id: `year-${year}`, name: `Year ${year}`, courseId: 'btech' })),
    sections: [{ id: 'cse-a', name: 'CSE · Semester 3 · A', departmentId: 'cse', courseId: 'btech', branchId: 'btech-cse', academicLevelId: 'year-2' }, { id: 'ece-a', name: 'ECE · Semester 3 · A', departmentId: 'ece', courseId: 'btech', branchId: 'btech-ece', academicLevelId: 'year-2' }],
    users: [
      { id: 'admin-1', name: 'Dr. Rajesh Kumar', email: 'admin@preview.invalid', departmentId: 'cse', role: 'admin', status: 'active', phone: '' },
      { id: 'faculty-1', name: 'Dr. Ananya Rao', email: 'ananya@preview.invalid', departmentId: 'cse', role: 'faculty', status: 'active', phone: '9876543210' },
      { id: 'faculty-2', name: 'Prof. Kiran Patel', email: 'kiran@preview.invalid', departmentId: 'ece', role: 'faculty', status: 'active', phone: '' },
      { id: 'student-1', name: 'Aarav Reddy', email: 'aarav@preview.invalid', departmentId: 'cse', sectionId: 'cse-a', role: 'student', status: 'active', phone: '9876543211', rollNumber: '23CSE001' },
      { id: 'student-2', name: 'Meera Shah', email: 'meera@preview.invalid', departmentId: 'cse', sectionId: 'cse-a', role: 'student', status: 'active', phone: '', rollNumber: '23CSE002' },
      { id: 'student-3', name: 'Ishaan Kumar', email: 'ishaan@preview.invalid', departmentId: 'ece', sectionId: 'ece-a', role: 'student', status: 'active', phone: '', rollNumber: '23ECE001' },
    ],
    subjects: [{ id: 'dbms', name: 'Database Management Systems', code: 'CS301', departmentId: 'cse', credits: 4 }, { id: 'ds', name: 'Data Structures', code: 'CS302', departmentId: 'cse', credits: 4 }, { id: 'circuits', name: 'Electronic Circuits', code: 'EC301', departmentId: 'ece', credits: 3 }],
    assignments: [{ id: 'assignment-1', facultyId: 'faculty-1', subjectId: 'dbms', sectionId: 'cse-a' }, { id: 'assignment-2', facultyId: 'faculty-1', subjectId: 'ds', sectionId: 'cse-a' }, { id: 'assignment-3', facultyId: 'faculty-2', subjectId: 'circuits', sectionId: 'ece-a' }],
    attendance: Array.from({ length: 8 }, (_, i) => ({ id: `attendance-${i}`, assignmentId: 'assignment-1', date: `2026-10-${String(i + 1).padStart(2, '0')}`, records: [{ studentId: 'student-1', status: i === 2 ? 'absent' : 'present' }, { studentId: 'student-2', status: i % 3 ? 'present' : 'absent' }] })),
    results: [{ id: 'result-1', assignmentId: 'assignment-1', assessment: 'Midterm 1', maxMarks: 30, published: true, records: [{ studentId: 'student-1', marks: 26 }, { studentId: 'student-2', marks: 24 }] }],
    timetable: [{ id: 'class-1', assignmentId: 'assignment-1', day: 'Monday', start: '09:00', end: '10:00', room: 'CSE 201' }, { id: 'class-2', assignmentId: 'assignment-2', day: 'Tuesday', start: '10:00', end: '11:00', room: 'Lab 2' }, { id: 'class-3', assignmentId: 'assignment-1', day: 'Thursday', start: '11:00', end: '12:00', room: 'CSE 201' }],
    materials: [{ id: 'material-1', assignmentId: 'assignment-1', title: 'Normalization revision notes', description: 'Review normal forms and practice the examples before the next class.', content: 'Normalization study guide\n\n1NF: Atomic attribute values.\n2NF: No partial dependency on a candidate key.\n3NF: No transitive dependency on a candidate key.\n\nPractice: Normalize an order table with customer and product details.', fileName: 'normalization-notes.txt', createdAt: '2026-10-08T09:00:00Z' }],
    leaves: [{ id: 'leave-1', facultyId: 'faculty-1', from: '2026-11-02', to: '2026-11-03', type: 'Casual', reason: 'Family commitment', status: 'pending' }],
    notifications: [{ id: 'notice-1', title: 'Midterm timetable published', message: 'Check your subject schedule and arrive 15 minutes before the examination.', roles: ['faculty', 'student'], createdAt: '2026-10-10T09:00:00Z', readBy: [] }, { id: 'notice-2', title: 'Attendance review', message: 'Please review your attendance records for this semester.', roles: ['student'], createdAt: '2026-10-12T09:00:00Z', readBy: [] }],
    fees: [{ id: 'fee-1', studentId: 'student-1', description: 'Semester tuition', amount: 45000, paid: 30000, dueDate: '2026-11-15' }, { id: 'fee-2', studentId: 'student-1', description: 'Library & laboratory', amount: 5000, paid: 5000, dueDate: '2026-10-01' }],
  }
}

export function emptyPortalWorkspace() {
  return Object.fromEntries(Object.keys(createPortalFixtures()).map(key => [key, []]))
}
