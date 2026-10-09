const KEYS = {
  exams: 'cms_exam_schedules', halls: 'cms_exam_halls', students: 'cms_exam_students', allocations: 'cms_exam_hall_allocations', examTypes: 'cms_exam_types', invigilationRules: 'cms_exam_invigilation_rules', invigilations: 'cms_exam_invigilations',
}

const defaultExamTypes = [
  ['Mid Semester', 90, 30, ['Theory'], true, true], ['Internal Assessment', 60, 30, ['Theory','Practical'], false, true],
  ['Practical', 180, 50, ['Practical','Laboratory'], true, true], ['End Semester', 180, 100, ['Theory','Practical','Project','Viva'], true, true],
  ['Backlog', 180, 100, ['Theory','Practical'], true, true], ['Supplementary', 180, 100, ['Theory','Practical'], true, true],
  ['Special', 180, 100, ['Theory','Practical'], true, true], ['Viva', 60, 50, ['Viva'], false, false],
  ['Project Evaluation', 120, 100, ['Project'], false, false], ['Continuous Internal Assessment', 60, 30, ['Theory','Practical'], false, false],
  ['Lab/Internal Practical Examination', 180, 50, ['Practical','Laboratory'], true, true],
].map(([name,durationMinutes,maxMarks,subjectTypes,hallRequired,invigilatorRequired])=>({name,durationMinutes,maxMarks,subjectTypes,hallRequired,invigilatorRequired,examinerRequired:false,enabled:true,applicableSemesters:['I','II','III','IV','V','VI','VII','VIII'],studentCategories:['Regular']}))
const defaultInvigilationRules = [
  { examDepartment:'Computer Science', allowedDepartments:['Electrical Engineering'], enabled:true },
  { examDepartment:'Electronics & Communication', allowedDepartments:['Civil Engineering','Mechanical Engineering'], enabled:true },
  { examDepartment:'Electrical Engineering', allowedDepartments:['Computer Science'], enabled:true },
  { examDepartment:'Mechanical Engineering', allowedDepartments:['Electronics & Communication'], enabled:true },
  { examDepartment:'Civil Engineering', allowedDepartments:['Electronics & Communication'], enabled:true },
]
const defaultExamSessions = [
  { code:'FN', label:'Forenoon', startTime:'09:00', endTime:'12:00', enabled:true },
  { code:'AN', label:'Afternoon', startTime:'14:00', endTime:'17:00', enabled:true },
]

export const examMaster = {
  academicYears: ['2026-2027', '2025-2026'],
  departments: ['Computer Science', 'Electronics & Communication', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering'],
  courses: ['B.Tech'],
  branches: ['CSE', 'ECE', 'EEE', 'Mechanical', 'Civil'],
  batches: ['2023-2027', '2022-2026', '2024-2028'],
  semesters: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'],
  sections: ['A', 'B', 'C'],
  examTypes: ['Regular', 'Supplementary', 'Backlog', 'Mid Semester', 'End Semester', 'Internal Assessment', 'Practical', 'Viva'],
  subjectTypes: ['Theory', 'Practical', 'Laboratory', 'Project', 'Seminar', 'Viva', 'Internship', 'Elective', 'Open Elective', 'Professional Elective', 'Mandatory Course'],
  subjects: [
    { code: 'CS701PC', name: 'Machine Learning', branch: 'CSE', semester: 'VII', type: 'Theory', credits: 4, faculty: 'Dr. Kavya Sharma' },
    { code: 'CS702PC', name: 'Cloud Computing', branch: 'CSE', semester: 'VII', type: 'Theory', credits: 3, faculty: 'Rahul Verma' },
    { code: 'CS703PE', name: 'Data Mining', branch: 'CSE', semester: 'VII', type: 'Practical', credits: 2, faculty: 'Dr. Neha Reddy' },
    { code: 'EC701PC', name: 'Wireless Networks', branch: 'ECE', semester: 'VII', type: 'Theory', credits: 4, faculty: 'Priya Nair' },
    { code: 'EE701PC', name: 'Power Systems', branch: 'EEE', semester: 'VII', type: 'Theory', credits: 4, faculty: 'Arvind Kumar' },
  ],
  faculty: ['Dr. Kavya Sharma', 'Rahul Verma', 'Dr. Neha Reddy', 'Priya Nair', 'Arvind Kumar'],
  facultyDirectory: [
    {id:'FAC001',name:'Dr. Kavya Sharma',department:'Computer Science',active:true,eligible:true,onLeave:false,maxDailyAssignments:2},
    {id:'FAC002',name:'Rahul Verma',department:'Computer Science',active:true,eligible:true,onLeave:false,maxDailyAssignments:2},
    {id:'FAC003',name:'Dr. Neha Reddy',department:'Computer Science',active:true,eligible:true,onLeave:false,maxDailyAssignments:2},
    {id:'FAC004',name:'Priya Nair',department:'Electronics & Communication',active:true,eligible:true,onLeave:false,maxDailyAssignments:2},
    {id:'FAC005',name:'Arvind Kumar',department:'Electrical Engineering',active:true,eligible:true,onLeave:false,maxDailyAssignments:2},
    {id:'FAC006',name:'Civil Faculty A',department:'Civil Engineering',active:true,eligible:true,onLeave:false,maxDailyAssignments:2},
    {id:'FAC007',name:'Civil Faculty B',department:'Civil Engineering',active:true,eligible:true,onLeave:false,maxDailyAssignments:2},
    {id:'FAC008',name:'Mechanical Faculty A',department:'Mechanical Engineering',active:true,eligible:true,onLeave:false,maxDailyAssignments:2},
  ],
}

const seedExams = [
  { id: 'EXM001', academicYear: '2026-2027', examType: 'End Semester', examName: 'B.Tech End Semester Examination', examCode: 'ESE-2026-01', department: 'Computer Science', course: 'B.Tech', branch: 'CSE', batch: '2023-2027', semester: 'VII', section: 'A', subjectCode: 'CS701PC', subjectName: 'Machine Learning', subjectType: 'Theory', credits: 4, faculty: 'Dr. Kavya Sharma', examDate: '2026-10-15', startTime: '09:00', endTime: '12:00', session: 'FN', hallId: 'H101', status: 'Scheduled' },
  { id: 'EXM002', academicYear: '2026-2027', examType: 'End Semester', examName: 'B.Tech End Semester Examination', examCode: 'ESE-2026-01', department: 'Computer Science', course: 'B.Tech', branch: 'CSE', batch: '2023-2027', semester: 'VII', section: 'A', subjectCode: 'CS702PC', subjectName: 'Cloud Computing', subjectType: 'Theory', credits: 3, faculty: 'Rahul Verma', examDate: '2026-10-17', startTime: '09:00', endTime: '12:00', session: 'FN', hallId: 'H102', status: 'Scheduled' },
  { id: 'EXM003', academicYear: '2026-2027', examType: 'End Semester', examName: 'B.Tech End Semester Examination', examCode: 'ESE-2026-01', department: 'Computer Science', course: 'B.Tech', branch: 'CSE', batch: '2023-2027', semester: 'VII', section: 'A', subjectCode: 'CS703PE', subjectName: 'Data Mining', subjectType: 'Practical', credits: 2, faculty: 'Dr. Neha Reddy', examDate: '2026-10-20', startTime: '13:30', endTime: '16:30', session: 'AN', hallId: 'H103', status: 'Scheduled' },
  { id: 'EXM004', academicYear: '2026-2027', examType: 'End Semester', examName: 'B.Tech End Semester Examination', examCode: 'ESE-2026-01', department: 'Electronics & Communication', course: 'B.Tech', branch: 'ECE', batch: '2023-2027', semester: 'VII', section: 'A', subjectCode: 'EC701PC', subjectName: 'Wireless Networks', subjectType: 'Theory', credits: 4, faculty: 'Priya Nair', examDate: '2026-10-15', startTime: '09:00', endTime: '12:00', session: 'FN', hallId: 'H104', status: 'Scheduled' },
  { id: 'EXM005', academicYear: '2026-2027', examType: 'End Semester', examName: 'B.Tech End Semester Examination', examCode: 'ESE-2026-01', department: 'Electrical Engineering', course: 'B.Tech', branch: 'EEE', batch: '2023-2027', semester: 'VII', section: 'A', subjectCode: 'EE701PC', subjectName: 'Power Systems', subjectType: 'Theory', credits: 4, faculty: 'Arvind Kumar', examDate: '2026-10-18', startTime: '09:00', endTime: '12:00', session: 'FN', hallId: 'H105', status: 'Scheduled' },
]
const seedHalls = [
  { id: 'H101', name: 'A101', building: 'Academic Block A', floor: '1', capacity: 40 }, { id: 'H102', name: 'A102', building: 'Academic Block A', floor: '1', capacity: 40 },
  { id: 'H103', name: 'A103', building: 'Academic Block A', floor: '1', capacity: 40 }, { id: 'H104', name: 'B201', building: 'Academic Block B', floor: '2', capacity: 60 },
  { id: 'H105', name: 'B202', building: 'Academic Block B', floor: '2', capacity: 60 },
]
const seedStudents = Array.from({ length: 120 }, (_, i) => ({ id: `STU${String(i + 1).padStart(4, '0')}`, name: `Student ${String(i + 1).padStart(3, '0')}`, registerNumber: `23CS${String(i + 1).padStart(3, '0')}`, department: 'Computer Science', course: 'B.Tech', branch: 'CSE', batch: '2023-2027', semester: 'VII', section: i < 40 ? 'A' : i < 80 ? 'B' : 'C' }))
const subjectCatalog = {
  CSE: ['Programming Fundamentals','Data Structures','Database Systems','Computer Networks','Software Engineering','Artificial Intelligence','Machine Learning','Project Work'],
  ECE: ['Circuit Analysis','Electronic Devices','Digital Systems','Signals and Systems','Communication Networks','Embedded Systems','Wireless Networks','Project Work'],
  EEE: ['Electrical Circuits','Electromagnetic Fields','Electrical Machines','Control Systems','Power Electronics','Power Systems','Smart Grids','Project Work'],
  Mechanical: ['Engineering Mechanics','Thermodynamics','Manufacturing Processes','Fluid Mechanics','Machine Design','Heat Transfer','Robotics','Project Work'],
  Civil: ['Engineering Geology','Surveying','Structural Analysis','Geotechnical Engineering','Transportation Engineering','Water Resources','Environmental Engineering','Project Work'],
}
const branchCodes = { CSE:'CS', ECE:'EC', EEE:'EE', Mechanical:'ME', Civil:'CE' }
const additionalSubjects = examMaster.branches.flatMap((branch) => examMaster.semesters.flatMap((semester, index) => (subjectCatalog[branch] || []).slice(index, index + 2).map((name, part) => ({ code:`${branchCodes[branch]}${String((index + 1) * 10 + part + 1).padStart(3,'0')}PC`, name, branch, semester, type:'Theory', credits:3, faculty:examMaster.faculty[(index + part) % examMaster.faculty.length] }))))
examMaster.subjects = [...examMaster.subjects, ...additionalSubjects.filter((item) => !examMaster.subjects.some((subject) => subject.code === item.code))]

function read(key, seed) {
  try {
    const value = localStorage.getItem(KEYS[key])
    if (value !== null) return JSON.parse(value)
    localStorage.setItem(KEYS[key], JSON.stringify(seed))
  } catch { /* use the in-memory sample if storage is unavailable */ }
  return structuredClone(seed)
}
function write(key, value) {
  localStorage.setItem(KEYS[key], JSON.stringify(value))
  window.dispatchEvent(new CustomEvent('exam-data-updated'))
  return value
}
export const getExams = () => read('exams', seedExams)
export const getExamById = (id) => getExams().find((exam) => exam.id === id) || null
export const getHalls = () => read('halls', seedHalls)
export const getStudents = () => read('students', seedStudents)
export const getHallAllocations = () => read('allocations', [])
export const getInvigilationRules = () => read('invigilationRules', defaultInvigilationRules)
export const saveInvigilationRules = (rules) => write('invigilationRules', rules)
export const getInvigilations = () => read('invigilations', [])
export const saveInvigilations = (records) => write('invigilations', records)
export const getExamTypes = () => read('examTypes', defaultExamTypes)
export const saveExamTypes = (types) => write('examTypes', types)
export const getExamSessions = () => read('examSessions', defaultExamSessions)
export const saveExamSessions = (sessions) => write('examSessions', sessions)
export const replaceHalls = (halls) => write('halls', halls)
export const upsertStudents = (students) => {
  const current = getStudents()
  const byId = new Map(current.map((student) => [String(student.id), student]))
  students.forEach((student) => byId.set(String(student.id), { ...byId.get(String(student.id)), ...student }))
  return write('students', [...byId.values()])
}
export const getDepartments = () => examMaster.departments
export const getCourses = (department) => department ? ['B.Tech'] : examMaster.courses
export const getBranches = (department, course) => {
  const d = { 'Computer Science': ['CSE'], 'Electronics & Communication': ['ECE'], 'Electrical Engineering': ['EEE'], 'Mechanical Engineering': ['Mechanical'], 'Civil Engineering': ['Civil'] }
  return d[department] || (course ? examMaster.branches : examMaster.branches)
}
export const getSubjects = (branch, semester) => examMaster.subjects.filter((s) => (!branch || s.branch === branch) && (!semester || s.semester === semester))
export const getAvailableHalls = (date, session, examId) => {
  const occupied = new Set([...getExams().filter((e) => e.id !== examId && e.examDate === date && e.session === session && e.status !== 'Cancelled').map((e) => e.hallId), ...getHallAllocations().filter((a) => a.examId !== examId && a.examDate === date && a.session === session).map((a) => a.hallId)])
  return getHalls().filter((hall) => !occupied.has(hall.id))
}
export function createExam(record) {
  const exams = getExams()
  const conflicts = validateExam(record, exams)
  if (conflicts.length) throw new Error(conflicts.join(' '))
  const nextId = Math.max(0, ...exams.map((exam) => Number(String(exam.id).replace(/\D/g, '')) || 0)) + 1
  const created = { ...record, id: `EXM${String(nextId).padStart(3, '0')}` }
  write('exams', [...exams, created])
  return created
}
export function updateExam(id, changes) {
  const exams = getExams()
  const updated = exams.map((exam) => exam.id === id ? { ...exam, ...changes, id } : exam)
  const record = updated.find((exam) => exam.id === id)
  const errors = validateExam(record, exams, id)
  if (errors.length) throw new Error(errors.join(' '))
  write('exams', updated)
  return record
}
export function validateExam(record, exams = getExams(), ignoreId = '') {
  const errors = []
  if (!record.examName || !record.examType || !record.department || !record.branch || !record.batch || !record.semester || !record.subjectCode || !record.examDate || !record.startTime || !record.endTime || !record.faculty) errors.push('Complete all required examination, subject, schedule and faculty fields.')
  if (record.examDate && Number.isNaN(Date.parse(`${record.examDate}T00:00:00`))) errors.push('Enter a valid examination date.')
  if (record.startTime && record.endTime && record.endTime <= record.startTime) errors.push('End time must be later than start time.')
  const peers = exams.filter((e) => e.id !== ignoreId && e.status !== 'Cancelled')
  if (peers.some((e) => e.subjectCode === record.subjectCode && e.batch === record.batch && e.semester === record.semester && e.academicYear === record.academicYear && e.examType === record.examType)) errors.push('This subject already has a schedule for this batch, semester, academic year and exam type.')
  if (peers.some((e) => e.course === record.course && e.branch === record.branch && e.batch === record.batch && e.semester === record.semester && e.section === record.section && e.examDate === record.examDate && e.startTime < record.endTime && e.endTime > record.startTime)) errors.push('Students in this batch, semester and section already have an examination at that time.')
  if (record.hallId && peers.some((e) => e.hallId === record.hallId && e.examDate === record.examDate && e.startTime < record.endTime && e.endTime > record.startTime)) errors.push('This hall is already allocated during that time.')
  if (record.faculty && peers.some((e) => e.faculty === record.faculty && e.examDate === record.examDate && e.startTime < record.endTime && e.endTime > record.startTime)) errors.push('This faculty member has another examination during that time.')
  return errors
}
export function deleteExam(id) { write('exams', getExams().filter((e) => e.id !== id)); write('allocations', getHallAllocations().filter((a) => a.examId !== id)) }
export function createHallAllocation(allocation) {
  const allocations = getHallAllocations()
  const hall = getHalls().find((h) => h.id === allocation.hallId)
  const count = Number(allocation.studentCount || 0)
  const existing = allocations.find((a) => a.examId === allocation.examId && a.hallId === allocation.hallId)
  if (!hall) throw new Error('Select a valid examination hall.')
  if (!Number.isInteger(count) || count < 1) throw new Error('Select at least one student to allocate.')
  if (Number(existing?.studentCount || 0) + count > hall.capacity) throw new Error(`Allocation exceeds ${hall.name} capacity (${hall.capacity}).`)
  if (allocations.some((a) => a.examId !== allocation.examId && a.hallId === allocation.hallId && a.examDate === allocation.examDate && a.session === allocation.session)) throw new Error('This hall is allocated to another examination in this session.')
  const scheduledHallConflict = getExams().some((e) => e.id !== allocation.examId && e.hallId === allocation.hallId && e.examDate === allocation.examDate && e.session === allocation.session && e.status !== 'Cancelled')
  if (scheduledHallConflict) throw new Error('This hall is already assigned to another examination in this session.')
  const studentIds = allocation.studentIds || []
  const alreadyAssigned = new Set(allocations.filter((a) => a.examId === allocation.examId).flatMap((a) => a.studentIds || []))
  if (studentIds.some((id) => alreadyAssigned.has(id))) throw new Error('One or more students are already allocated to a hall for this examination.')
  const otherExamStudents = new Set(allocations.filter((a) => a.examId !== allocation.examId && a.examDate === allocation.examDate && a.session === allocation.session).flatMap((a) => a.studentIds || []))
  if (studentIds.some((id) => otherExamStudents.has(id))) throw new Error('One or more students already have an examination allocation in this session.')
  if (studentIds.length && studentIds.length !== count) throw new Error('The selected student range does not match the allocation count.')
  if (allocation.invigilator && allocations.some((a) => a.id !== existing?.id && a.invigilator === allocation.invigilator && a.examDate === allocation.examDate && a.session === allocation.session)) throw new Error('This invigilator is already assigned to a hall in this session.')
  const updated = existing
    ? allocations.map((a) => a.id === existing.id ? { ...a, studentCount: Number(a.studentCount || 0) + count, studentIds: [...(a.studentIds || []), ...studentIds], studentTo: allocation.studentTo || a.studentTo, invigilator: allocation.invigilator || a.invigilator } : a)
    : [...allocations, { ...allocation, id: `ALLOC${globalThis.crypto?.randomUUID?.() || Date.now()}` }]
  write('allocations', updated)
}
export function updateHallAllocation(id, changes) { write('allocations', getHallAllocations().map((a) => a.id === id ? { ...a, ...changes } : a)) }
export function deleteHallAllocation(id) { write('allocations', getHallAllocations().filter((a) => a.id !== id)) }
