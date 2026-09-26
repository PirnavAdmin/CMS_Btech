export const demoAcademicData = {
  academicYears: [{ id: 'ay-2026', name: '2026-2027', status: 'Active' }],
  departments: [
    { id: 'dept-cse', name: 'Computer Science & Engineering' },
    { id: 'dept-ece', name: 'Electronics & Communication Engineering' },
    { id: 'dept-me', name: 'Mechanical Engineering' },
  ],
  courses: [{ id: 'course-btech', name: 'B.Tech' }],
  branches: [
    { id: 'branch-cse', departmentId: 'dept-cse', name: 'CSE' },
    { id: 'branch-aiml', departmentId: 'dept-cse', name: 'CSE (AI & ML)' },
    { id: 'branch-ece', departmentId: 'dept-ece', name: 'ECE' },
    { id: 'branch-me', departmentId: 'dept-me', name: 'Mechanical Engineering' },
  ],
  semesters: Array.from({ length: 8 }, (_, index) => ({ id: `sem-${index + 1}`, semesterNumber: index + 1, name: `Semester ${index + 1}`, academicLevel: `${Math.ceil((index + 1) / 2)}${['st', 'nd', 'rd', 'th'][Math.min(Math.ceil((index + 1) / 2) - 1, 3)]} Year` })),
  sections: [
    { id: 'sec-cse-a', branchId: 'branch-cse', semesterId: 'sem-3', name: 'Section A', shortName: 'A' },
    { id: 'sec-cse-b', branchId: 'branch-cse', semesterId: 'sem-3', name: 'Section B', shortName: 'B' },
    { id: 'sec-cse-c', branchId: 'branch-cse', semesterId: 'sem-3', name: 'Section C', shortName: 'C' },
    { id: 'sec-aiml-a', branchId: 'branch-aiml', semesterId: 'sem-3', name: 'Section A', shortName: 'A' },
    { id: 'sec-ece-a', branchId: 'branch-ece', semesterId: 'sem-3', name: 'Section A', shortName: 'A' },
    { id: 'sec-me-a', branchId: 'branch-me', semesterId: 'sem-3', name: 'Section A', shortName: 'A' },
    ...['branch-cse', 'branch-aiml', 'branch-ece', 'branch-me'].flatMap(branchId => Array.from({ length: 8 }, (_, index) => ({
      id: `section-${branchId}-${index + 1}-a`, branchId, semesterId: `sem-${index + 1}`, name: 'Section A', shortName: 'A',
    })).filter(section => !(branchId === 'branch-cse' && section.semesterId === 'sem-3') && !(branchId !== 'branch-cse' && section.semesterId === 'sem-3'))),
  ],
  subjects: [
    { id: 'sub-ds', branchId: 'branch-cse', semesterId: 'sem-3', code: 'CS301', name: 'Data Structures', type: 'THEORY', periodsPerWeek: 4, blockSize: 1 },
    { id: 'sub-dbms', branchId: 'branch-cse', semesterId: 'sem-3', code: 'CS302', name: 'Database Management Systems', type: 'THEORY', periodsPerWeek: 4, blockSize: 1 },
    { id: 'sub-os', branchId: 'branch-cse', semesterId: 'sem-3', code: 'CS303', name: 'Operating Systems', type: 'THEORY', periodsPerWeek: 4, blockSize: 1 },
    { id: 'sub-oop', branchId: 'branch-cse', semesterId: 'sem-3', code: 'CS304', name: 'Object Oriented Programming', type: 'THEORY', periodsPerWeek: 3, blockSize: 1 },
    { id: 'sub-cn', branchId: 'branch-cse', semesterId: 'sem-3', code: 'CS305', name: 'Computer Networks', type: 'THEORY', periodsPerWeek: 3, blockSize: 1 },
    { id: 'sub-dbmsp', branchId: 'branch-cse', semesterId: 'sem-3', code: 'CS306L', name: 'DBMS Lab', type: 'LAB', periodsPerWeek: 2, blockSize: 2 },
    { id: 'sub-aiml', branchId: 'branch-aiml', semesterId: 'sem-3', code: 'AIML301', name: 'Machine Learning Foundations', type: 'THEORY', periodsPerWeek: 4, blockSize: 1 },
    { id: 'sub-ece', branchId: 'branch-ece', semesterId: 'sem-3', code: 'ECE301', name: 'Signals and Systems', type: 'THEORY', periodsPerWeek: 4, blockSize: 1 },
    { id: 'sub-me', branchId: 'branch-me', semesterId: 'sem-3', code: 'ME301', name: 'Engineering Thermodynamics', type: 'THEORY', periodsPerWeek: 4, blockSize: 1 },
  ],
  faculty: [
    { id: 'fac-001', code: 'F001', name: 'Dr. Ravi Kumar' },
    { id: 'fac-002', code: 'F002', name: 'Dr. Priya Sharma' },
    { id: 'fac-003', code: 'F003', name: 'Dr. Suresh Reddy' },
    { id: 'fac-004', code: 'F004', name: 'Dr. Anil Kumar' },
    { id: 'fac-005', code: 'F005', name: 'Dr. Kavitha Rao' },
    { id: 'fac-006', code: 'F006', name: 'Dr. Naveen' },
  ],
  rooms: [
    { id: 'room-201', name: 'CSE-201', type: 'CLASSROOM' },
    { id: 'room-202', name: 'CSE-202', type: 'CLASSROOM' },
    { id: 'room-203', name: 'CSE-203', type: 'CLASSROOM' },
    { id: 'lab-1', name: 'CSE-LAB-1', type: 'LAB' },
    { id: 'lab-2', name: 'CSE-LAB-2', type: 'LAB' },
  ],
  allocations: [
    ...['sec-cse-a', 'sec-cse-b', 'sec-cse-c'].flatMap((sectionId, index) => {
      const bySection = [
        { 'sub-dbms': 'fac-001', 'sub-os': 'fac-002', 'sub-ds': 'fac-006', 'sub-oop': 'fac-004', 'sub-cn': 'fac-005', 'sub-dbmsp': 'fac-003' },
        { 'sub-dbms': 'fac-003', 'sub-os': 'fac-004', 'sub-ds': 'fac-002', 'sub-oop': 'fac-006', 'sub-cn': 'fac-001', 'sub-dbmsp': 'fac-005' },
        { 'sub-dbms': 'fac-002', 'sub-os': 'fac-001', 'sub-ds': 'fac-003', 'sub-oop': 'fac-005', 'sub-cn': 'fac-004', 'sub-dbmsp': 'fac-006' },
      ][index]
      return Object.entries(bySection).map(([subjectId, facultyId]) => ({ sectionId, subjectId, facultyId }))
    }),
    { sectionId: 'sec-aiml-a', subjectId: 'sub-aiml', facultyId: 'fac-006' },
    { sectionId: 'sec-ece-a', subjectId: 'sub-ece', facultyId: 'fac-005' },
    { sectionId: 'sec-me-a', subjectId: 'sub-me', facultyId: 'fac-004' },
  ],
}

export const defaultDemoSettings = {
  startTime: '09:00', periodsPerDay: 7, periodDuration: 50,
  breakAfter: 2, breakDuration: 20, lunchAfter: 4, lunchDuration: 50,
  workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
}

export const demoSubjects = demoAcademicData.subjects
export const demoWeekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
