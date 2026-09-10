const departments = {
  cse: { id: 'dept-cse', name: 'Computer Science & Engineering', code: 'CSE' },
  ece: { id: 'dept-ece', name: 'Electronics & Communication', code: 'ECE' },
  eee: { id: 'dept-eee', name: 'Electrical & Electronics', code: 'EEE' },
  mech: { id: 'dept-mech', name: 'Mechanical Engineering', code: 'MECH' },
  civil: { id: 'dept-civil', name: 'Civil Engineering', code: 'CIVIL' },
}

export const facultyDemoData = [
  ['FAC001', 'Dr. Anitha Sharma', 'Professor', 'Ph.D', '14 Years', '9876543210', 'anitha.sharma@pirnav.edu.in', 'Permanent', 'Working', '1982-03-15', '2012-06-12', 'Female', 'Computer Architecture'],
  ['FAC002', 'Dr. Rakesh Kumar', 'Associate Professor', 'Ph.D', '11 Years', '9876543211', 'rakesh.kumar@pirnav.edu.in', 'Permanent', 'Working', '1985-07-21', '2015-07-01', 'Male', 'Distributed Systems'],
  ['FAC003', 'Prof. Meera Nair', 'Assistant Professor', 'M.Tech', '8 Years', '9876543212', 'meera.nair@pirnav.edu.in', 'Permanent', 'Working', '1988-11-03', '2018-08-06', 'Female', 'Data Science'],
  ['FAC004', 'Dr. Vikram Rao', 'Professor', 'Ph.D', '18 Years', '9876543213', 'vikram.rao@pirnav.edu.in', 'Permanent', 'On Leave', '1978-05-11', '2008-01-14', 'Male', 'Embedded Systems'],
  ['FAC005', 'Ms. Priya Menon', 'Assistant Professor', 'M.Tech', '6 Years', '9876543214', 'priya.menon@pirnav.edu.in', 'Contract', 'Working', '1990-02-27', '2020-07-20', 'Female', 'Cloud Computing'],
  ['FAC006', 'Mr. Arjun Reddy', 'Senior Lecturer', 'M.Tech', '10 Years', '9876543215', 'arjun.reddy@pirnav.edu.in', 'Permanent', 'Working', '1986-09-18', '2016-06-20', 'Male', 'Power Electronics'],
  ['FAC007', 'Dr. Sneha Iyer', 'Associate Professor', 'Ph.D', '12 Years', '9876543216', 'sneha.iyer@pirnav.edu.in', 'Permanent', 'Working', '1984-12-09', '2014-07-07', 'Female', 'Structural Engineering'],
  ['FAC008', 'Mr. Karthik Bose', 'Lab Instructor', 'M.Sc', '5 Years', '9876543217', 'karthik.bose@pirnav.edu.in', 'Contract', 'Resigned', '1992-04-19', '2021-01-11', 'Male', 'Programming Laboratory'],
  ['FAC009', 'Ms. Divya Joseph', 'Assistant Professor', 'M.Tech', '7 Years', '9876543218', 'divya.joseph@pirnav.edu.in', 'Permanent', 'Working', '1989-08-30', '2019-06-17', 'Female', 'Computer Networks'],
  ['FAC010', 'Dr. Nitin Kapoor', 'Professor', 'Ph.D', '20 Years', '9876543219', 'nitin.kapoor@pirnav.edu.in', 'Permanent', 'Working', '1976-01-25', '2006-07-03', 'Male', 'Artificial Intelligence'],
  ['FAC011', 'Ms. Farah Khan', 'Visiting Faculty', 'MCA', '4 Years', '9876543220', 'farah.khan@pirnav.edu.in', 'Visiting', 'Working', '1993-06-14', '2022-08-01', 'Female', 'Human Computer Interaction'],
  ['FAC012', 'Mr. Suresh Patil', 'Lecturer', 'M.Tech', '9 Years', '9876543221', 'suresh.patil@pirnav.edu.in', 'Permanent', 'Retired', '1987-10-08', '2017-06-19', 'Male', 'Engineering Mathematics'],
].map(([employeeId, fullName, designation, qualification, experience, mobile, email, employmentType, status, dob, joiningDate, gender, specialization], index) => ({
  id: `faculty-${index + 1}`,
  employeeId,
  fullName,
  firstName: fullName.replace(/^(Dr\.|Prof\.|Ms\.|Mr\.)\s+/, '').split(' ')[0],
  lastName: fullName.split(' ').at(-1),
  designation,
  qualification,
  experience,
  mobile,
  email,
  personalEmail: email.replace('@pirnav.edu.in', '@gmail.com'),
  employmentType,
  employmentStatus: status,
  dob,
  joiningDate,
  gender,
  specialization,
  employmentHistory: [{ event: 'Joined', date: joiningDate, detail: `${designation} · ${employmentType}` }, ...(status === 'On Leave' ? [{ event: 'Leave', date: '2026-07-01', detail: 'Approved leave' }] : []), ...(status === 'Resigned' ? [{ event: 'Resigned', date: '2026-03-31', detail: 'Voluntary resignation' }] : []), ...(status === 'Retired' ? [{ event: 'Retired', date: '2026-04-30', detail: 'Retirement recorded' }] : [])],
  department: Object.values(departments)[index % Object.values(departments).length],
  address: { current: '12, College Road', city: 'Hyderabad', district: 'Rangareddy', state: 'Telangana', pincode: '500032' },
  documents: [
    { id: `${index}-photo`, type: 'Profile Photo', fileName: `${employeeId.toLowerCase()}-profile.jpg`, size: '148 KB', status: 'Demo record' },
    { id: `${index}-degree`, type: 'Degree Certificate', fileName: `${employeeId.toLowerCase()}-degree.pdf`, size: '824 KB', status: 'Demo record' },
  ],
}))

export const academicYears = [{ id: 'ay-2026', name: '2026 - 2027', active: true }, { id: 'ay-2025', name: '2025 - 2026', active: false }]
export const courses = [{ id: 'course-btech', name: 'B.Tech', code: 'BTECH' }, { id: 'course-mtech', name: 'M.Tech', code: 'MTECH' }]
export const branches = [{ id: 'branch-cse', name: 'Computer Science & Engineering', code: 'CSE', courseId: 'course-btech' }, { id: 'branch-ece', name: 'Electronics & Communication', code: 'ECE', courseId: 'course-btech' }, { id: 'branch-mech', name: 'Mechanical Engineering', code: 'MECH', courseId: 'course-btech' }]
export const semesters = [1, 2, 3, 4, 5, 6, 7, 8].map((number) => ({ id: `sem-${number}`, name: `Semester ${number}`, number }))
export const sections = ['A', 'B', 'C'].flatMap((letter, index) => ({ id: `section-cse-${letter}`, name: `Section ${letter}`, code: `CSE-S${index + 1}-${letter}`, academicYearId: 'ay-2026', courseId: 'course-btech', branchId: 'branch-cse', semesterId: `sem-${index + 1}` }))
export const subjects = [
  { id: 'sub-dsa', name: 'Data Structures & Algorithms', code: 'CS301', courseId: 'course-btech', branchId: 'branch-cse', semesterId: 'sem-3' },
  { id: 'sub-dbms', name: 'Database Management Systems', code: 'CS401', courseId: 'course-btech', branchId: 'branch-cse', semesterId: 'sem-4' },
  { id: 'sub-cn', name: 'Computer Networks', code: 'CS501', courseId: 'course-btech', branchId: 'branch-cse', semesterId: 'sem-5' },
  { id: 'sub-ai', name: 'Artificial Intelligence', code: 'CS601', courseId: 'course-btech', branchId: 'branch-cse', semesterId: 'sem-6' },
  { id: 'sub-cloud', name: 'Cloud Computing', code: 'CS701', courseId: 'course-btech', branchId: 'branch-cse', semesterId: 'sem-7' },
]
export const subjectAllocations = [
  { id: 'alloc-1', facultyId: 'faculty-1', academicYearId: 'ay-2026', courseId: 'course-btech', branchId: 'branch-cse', semesterId: 'sem-3', sectionId: 'section-cse-A', subjectId: 'sub-dsa', type: 'Theory', hours: 4, status: 'Active' },
  { id: 'alloc-2', facultyId: 'faculty-3', academicYearId: 'ay-2026', courseId: 'course-btech', branchId: 'branch-cse', semesterId: 'sem-4', sectionId: 'section-cse-B', subjectId: 'sub-dbms', type: 'Theory', hours: 4, status: 'Active' },
  { id: 'alloc-3', facultyId: 'faculty-9', academicYearId: 'ay-2026', courseId: 'course-btech', branchId: 'branch-cse', semesterId: 'sem-5', sectionId: 'section-cse-C', subjectId: 'sub-cn', type: 'Lab', hours: 3, status: 'Active' },
  { id: 'alloc-4', facultyId: 'faculty-10', academicYearId: 'ay-2026', courseId: 'course-btech', branchId: 'branch-cse', semesterId: 'sem-6', sectionId: 'section-cse-A', subjectId: 'sub-ai', type: 'Theory', hours: 4, status: 'Active' },
  { id: 'alloc-5', facultyId: 'faculty-5', academicYearId: 'ay-2026', courseId: 'course-btech', branchId: 'branch-cse', semesterId: 'sem-7', sectionId: 'section-cse-B', subjectId: 'sub-cloud', type: 'Theory', hours: 4, status: 'Upcoming' },
]
export const classAdvisorAssignments = [{ id: 'advisor-1', sectionId: 'section-cse-A', facultyId: 'faculty-1', academicYearId: 'ay-2026' }, { id: 'advisor-2', sectionId: 'section-cse-B', facultyId: 'faculty-3', academicYearId: 'ay-2026' }]

export const facultyAttendance = [
  { id: 'att-1', facultyId: 'faculty-1', date: '2026-09-10', checkIn: '08:42', checkOut: '17:10', workingHours: 8.5, attendanceStatus: 'Present', remarks: '' },
  { id: 'att-2', facultyId: 'faculty-2', date: '2026-09-10', checkIn: '09:05', checkOut: '13:15', workingHours: 4.2, attendanceStatus: 'Half Day', remarks: 'Personal appointment' },
  { id: 'att-3', facultyId: 'faculty-3', date: '2026-09-10', checkIn: '', checkOut: '', workingHours: 0, attendanceStatus: 'On Leave', remarks: 'Approved leave' },
  { id: 'att-4', facultyId: 'faculty-5', date: '2026-09-10', checkIn: '08:55', checkOut: '17:02', workingHours: 8.1, attendanceStatus: 'On Duty', remarks: 'University examination duty' },
  { id: 'att-5', facultyId: 'faculty-9', date: '2026-09-09', checkIn: '', checkOut: '', workingHours: 0, attendanceStatus: 'Absent', remarks: '' },
  { id: 'att-6', facultyId: 'faculty-8', date: '2026-01-10', checkIn: '09:00', checkOut: '17:00', workingHours: 8, attendanceStatus: 'Present', remarks: 'Historical record' },
]
