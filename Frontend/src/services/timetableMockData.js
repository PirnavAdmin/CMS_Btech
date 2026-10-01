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
    { id: 'branch-cse-aiml', departmentId: 'dept-cse', name: 'CSE (AI & ML)' },
    { id: 'branch-ece', departmentId: 'dept-ece', name: 'ECE' },
    { id: 'branch-me', departmentId: 'dept-me', name: 'Mechanical Engineering' },
  ],
  semesters: [
    { id: 'sem-1', academicLevel: '1st Year', name: 'Semester 1' },
    { id: 'sem-2', academicLevel: '1st Year', name: 'Semester 2' },
    { id: 'sem-3', academicLevel: '2nd Year', name: 'Semester 3' },
    { id: 'sem-4', academicLevel: '2nd Year', name: 'Semester 4' },
    { id: 'sem-5', academicLevel: '3rd Year', name: 'Semester 5' },
    { id: 'sem-6', academicLevel: '3rd Year', name: 'Semester 6' },
    { id: 'sem-7', academicLevel: '4th Year', name: 'Semester 7' },
    { id: 'sem-8', academicLevel: '4th Year', name: 'Semester 8' },
  ],
  sections: [
    { id: 'sec-cse-a', branchId: 'branch-cse', semesterId: 'sem-3', name: 'Section A', shortName: 'A' },
    { id: 'sec-cse-b', branchId: 'branch-cse', semesterId: 'sem-3', name: 'Section B', shortName: 'B' },
    { id: 'sec-cse-c', branchId: 'branch-cse', semesterId: 'sem-3', name: 'Section C', shortName: 'C' },
  ],
  subjects: [
    { id: 'sub-ds', branchId: 'branch-cse', semesterId: 'sem-3', code: 'CS301', name: 'Data Structures', type: 'THEORY', blockSize: 1, periodsPerWeek: 4 },
    { id: 'sub-dbms', branchId: 'branch-cse', semesterId: 'sem-3', code: 'CS302', name: 'Database Management Systems', type: 'THEORY', blockSize: 1, periodsPerWeek: 4 },
    { id: 'sub-os', branchId: 'branch-cse', semesterId: 'sem-3', code: 'CS303', name: 'Operating Systems', type: 'THEORY', blockSize: 1, periodsPerWeek: 4 },
    { id: 'sub-oop', branchId: 'branch-cse', semesterId: 'sem-3', code: 'CS304', name: 'Object Oriented Programming', type: 'THEORY', blockSize: 1, periodsPerWeek: 3 },
    { id: 'sub-cn', branchId: 'branch-cse', semesterId: 'sem-3', code: 'CS305', name: 'Computer Networks', type: 'THEORY', blockSize: 1, periodsPerWeek: 3 },
    { id: 'sub-dbmsp', branchId: 'branch-cse', semesterId: 'sem-3', code: 'CS306L', name: 'DBMS Lab', type: 'LAB', blockSize: 2, periodsPerWeek: 2 },
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
    { id: 'room-lab-1', name: 'CSE-LAB-1', type: 'LAB' },
    { id: 'room-lab-2', name: 'CSE-LAB-2', type: 'LAB' },
  ],
  allocations: [
    { sectionId: 'sec-cse-a', subjectId: 'sub-dbms', facultyId: 'fac-001' },
    { sectionId: 'sec-cse-b', subjectId: 'sub-dbms', facultyId: 'fac-003' },
    { sectionId: 'sec-cse-c', subjectId: 'sub-dbms', facultyId: 'fac-002' },
    { sectionId: 'sec-cse-a', subjectId: 'sub-os', facultyId: 'fac-002' },
    { sectionId: 'sec-cse-b', subjectId: 'sub-os', facultyId: 'fac-004' },
    { sectionId: 'sec-cse-c', subjectId: 'sub-os', facultyId: 'fac-001' },
    { sectionId: 'sec-cse-a', subjectId: 'sub-ds', facultyId: 'fac-006' },
    { sectionId: 'sec-cse-b', subjectId: 'sub-ds', facultyId: 'fac-002' },
    { sectionId: 'sec-cse-c', subjectId: 'sub-ds', facultyId: 'fac-003' },
    { sectionId: 'sec-cse-a', subjectId: 'sub-oop', facultyId: 'fac-004' },
    { sectionId: 'sec-cse-b', subjectId: 'sub-oop', facultyId: 'fac-005' },
    { sectionId: 'sec-cse-c', subjectId: 'sub-oop', facultyId: 'fac-006' },
    { sectionId: 'sec-cse-a', subjectId: 'sub-cn', facultyId: 'fac-005' },
    { sectionId: 'sec-cse-b', subjectId: 'sub-cn', facultyId: 'fac-006' },
    { sectionId: 'sec-cse-c', subjectId: 'sub-cn', facultyId: 'fac-004' },
    { sectionId: 'sec-cse-a', subjectId: 'sub-dbmsp', facultyId: 'fac-003' },
    { sectionId: 'sec-cse-b', subjectId: 'sub-dbmsp', facultyId: 'fac-001' },
    { sectionId: 'sec-cse-c', subjectId: 'sub-dbmsp', facultyId: 'fac-005' },
  ],
}

export const defaultDemoSettings = {
  startTime: '09:00', periodsPerDay: 7, periodDuration: 50,
  breakAfter: 2, breakDuration: 20, lunchAfter: 4, lunchDuration: 50,
  workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
}

export const demoSubjects = demoAcademicData.subjects
export const demoWeekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
