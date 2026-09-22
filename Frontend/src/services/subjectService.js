import { courseApi, branchApi, departmentApi } from '../api/apiEndpoints'

const LOCAL_SUBJECTS_KEY = 'pirnav-academic-subjects-v1'
const LOCAL_CREDITS_KEY = 'pirnav-academic-credits-v1'
const LOCAL_ELECTIVES_KEY = 'pirnav-academic-electives-v1'
const LOCAL_ALLOCATIONS_KEY = 'pirnav-elective-allocations-v1'

const initialSubjects = [
  {
    id: 'SUB-101',
    subjectCode: 'CS301PC',
    subjectName: 'Data Structures & Algorithms',
    shortName: 'DSA',
    department: 'Computer Science and Engineering',
    departmentId: '1',
    course: 'B.Tech',
    courseId: '1',
    branch: 'Computer Science & Engineering',
    branchId: '1',
    semester: 'Semester 3',
    semesterId: '3',
    academicYear: '2025-2026',
    subjectType: 'Theory',
    category: 'Professional Core (PCC)',
    lectureHours: 3,
    tutorialHours: 1,
    practicalHours: 0,
    credits: 4,
    internalMarks: 30,
    externalMarks: 70,
    totalMarks: 100,
    status: 'Active',
    description: 'Fundamental data structures, abstract data types, searching and sorting algorithms, complexity analysis.',
    facultyName: 'Dr. Suresh Kumar',
  },
  {
    id: 'SUB-102',
    subjectCode: 'CS302PC',
    subjectName: 'Object Oriented Programming through Java',
    shortName: 'Java',
    department: 'Computer Science and Engineering',
    departmentId: '1',
    course: 'B.Tech',
    courseId: '1',
    branch: 'Computer Science & Engineering',
    branchId: '1',
    semester: 'Semester 3',
    semesterId: '3',
    academicYear: '2025-2026',
    subjectType: 'Theory',
    category: 'Professional Core (PCC)',
    lectureHours: 3,
    tutorialHours: 0,
    practicalHours: 0,
    credits: 3,
    internalMarks: 30,
    externalMarks: 70,
    totalMarks: 100,
    status: 'Active',
    description: 'OOP concepts, inheritance, polymorphism, interfaces, packages, exception handling, multithreading.',
    facultyName: 'Prof. Ramesh Chandra',
  },
  {
    id: 'SUB-103',
    subjectCode: 'CS306PC',
    subjectName: 'Data Structures Lab',
    shortName: 'DSA Lab',
    department: 'Computer Science and Engineering',
    departmentId: '1',
    course: 'B.Tech',
    courseId: '1',
    branch: 'Computer Science & Engineering',
    branchId: '1',
    semester: 'Semester 3',
    semesterId: '3',
    academicYear: '2025-2026',
    subjectType: 'Practical / Lab',
    category: 'Professional Core Lab (PCC Lab)',
    lectureHours: 0,
    tutorialHours: 0,
    practicalHours: 3,
    credits: 1.5,
    internalMarks: 15,
    externalMarks: 35,
    totalMarks: 50,
    status: 'Active',
    description: 'Implementation of stacks, queues, linked lists, trees, graphs, and hashing techniques in C/C++.',
    facultyName: 'Dr. Suresh Kumar',
  },
  {
    id: 'SUB-104',
    subjectCode: 'CS501PE',
    subjectName: 'Machine Learning',
    shortName: 'ML',
    department: 'Computer Science and Engineering',
    departmentId: '1',
    course: 'B.Tech',
    courseId: '1',
    branch: 'Computer Science & Engineering',
    branchId: '1',
    semester: 'Semester 5',
    semesterId: '5',
    academicYear: '2025-2026',
    subjectType: 'Elective (PE)',
    category: 'Professional Elective (PEC)',
    electiveGroup: 'Professional Elective - I',
    lectureHours: 3,
    tutorialHours: 0,
    practicalHours: 0,
    credits: 3,
    internalMarks: 30,
    externalMarks: 70,
    totalMarks: 100,
    status: 'Active',
    description: 'Supervised learning, unsupervised learning, neural networks, decision trees, support vector machines.',
    facultyName: 'Dr. Ananya Roy',
  },
  {
    id: 'SUB-105',
    subjectCode: 'CS502PE',
    subjectName: 'Cloud Computing & Virtualization',
    shortName: 'Cloud',
    department: 'Computer Science and Engineering',
    departmentId: '1',
    course: 'B.Tech',
    courseId: '1',
    branch: 'Computer Science & Engineering',
    branchId: '1',
    semester: 'Semester 5',
    semesterId: '5',
    academicYear: '2025-2026',
    subjectType: 'Elective (PE)',
    category: 'Professional Elective (PEC)',
    electiveGroup: 'Professional Elective - I',
    lectureHours: 3,
    tutorialHours: 0,
    practicalHours: 0,
    credits: 3,
    internalMarks: 30,
    externalMarks: 70,
    totalMarks: 100,
    status: 'Active',
    description: 'Cloud service models, IaaS, PaaS, SaaS, virtualization techniques, containerization with Docker.',
    facultyName: 'Prof. K. Venkatesh',
  },
  {
    id: 'SUB-106',
    subjectCode: 'OE601OE',
    subjectName: 'Renewable Energy Systems',
    shortName: 'RES',
    department: 'Electrical and Electronics Engineering',
    departmentId: '2',
    course: 'B.Tech',
    courseId: '1',
    branch: 'All Branches',
    branchId: 'all',
    semester: 'Semester 6',
    semesterId: '6',
    academicYear: '2025-2026',
    subjectType: 'Elective (OE)',
    category: 'Open Elective (OEC)',
    electiveGroup: 'Open Elective - I',
    lectureHours: 3,
    tutorialHours: 0,
    practicalHours: 0,
    credits: 3,
    internalMarks: 30,
    externalMarks: 70,
    totalMarks: 100,
    status: 'Active',
    description: 'Solar PV, wind energy conversion, hydro power systems, biomass and energy storage technologies.',
    facultyName: 'Dr. P. Srinivasa Rao',
  },
  {
    id: 'SUB-107',
    subjectCode: 'MC101',
    subjectName: 'Environmental Science & Sustainability',
    shortName: 'EVS',
    department: 'Humanities and Sciences',
    departmentId: '3',
    course: 'B.Tech',
    courseId: '1',
    branch: 'Computer Science & Engineering',
    branchId: '1',
    semester: 'Semester 1',
    semesterId: '1',
    academicYear: '2025-2026',
    subjectType: 'Mandatory Non-Credit',
    category: 'Mandatory Course (MC)',
    lectureHours: 2,
    tutorialHours: 0,
    practicalHours: 0,
    credits: 0,
    internalMarks: 40,
    externalMarks: 60,
    totalMarks: 100,
    status: 'Active',
    description: 'Ecology, ecosystems, biodiversity conservation, environmental pollution and sustainable development.',
    facultyName: 'Dr. M. Gayatri',
  },
]

const initialCreditStructure = {
  totalProgramCredits: 160,
  minCreditsPerSemester: 18,
  maxCreditsPerSemester: 26,
  defaultSemesterCredits: 20,
  categories: [
    { code: 'BSC', name: 'Basic Science Courses', requiredCredits: 25, earnedRange: '24-26', color: '#3b82f6' },
    { code: 'ESC', name: 'Engineering Science Courses', requiredCredits: 24, earnedRange: '22-26', color: '#8b5cf6' },
    { code: 'HSMC', name: 'Humanities, Social Sciences & Management', requiredCredits: 12, earnedRange: '10-14', color: '#10b981' },
    { code: 'PCC', name: 'Professional Core Courses', requiredCredits: 54, earnedRange: '50-58', color: '#06b6d4' },
    { code: 'PEC', name: 'Professional Elective Courses', requiredCredits: 18, earnedRange: '15-21', color: '#f59e0b' },
    { code: 'OEC', name: 'Open Elective Courses', requiredCredits: 12, earnedRange: '9-15', color: '#ec4899' },
    { code: 'PROJ', name: 'Project Work, Internship & Seminar', requiredCredits: 15, earnedRange: '14-16', color: '#6366f1' },
    { code: 'MC', name: 'Mandatory Non-Credit Courses', requiredCredits: 0, earnedRange: 'Audit', color: '#64748b' },
  ],
  semesterBreakdown: [
    { semester: 'Semester 1', credits: 19.5, coursesCount: 8, status: 'Standard' },
    { semester: 'Semester 2', credits: 19.5, coursesCount: 8, status: 'Standard' },
    { semester: 'Semester 3', credits: 21.0, coursesCount: 8, status: 'Standard' },
    { semester: 'Semester 4', credits: 21.0, coursesCount: 8, status: 'Standard' },
    { semester: 'Semester 5', credits: 22.0, coursesCount: 7, status: 'Standard' },
    { semester: 'Semester 6', credits: 22.0, coursesCount: 7, status: 'Standard' },
    { semester: 'Semester 7', credits: 21.0, coursesCount: 6, status: 'Standard' },
    { semester: 'Semester 8', credits: 14.0, coursesCount: 3, status: 'Standard' },
  ]
}

const initialElectiveGroups = [
  {
    id: 'ELG-01',
    groupCode: 'PE-I',
    groupName: 'Professional Elective - I (Track: Intelligent Systems)',
    type: 'Professional Elective (PE)',
    semester: 'Semester 5',
    semesterId: '5',
    branch: 'Computer Science & Engineering',
    branchId: '1',
    academicYear: '2025-2026',
    minOptionsRequired: 1,
    maxAllowed: 1,
    totalCapacity: 120,
    enrolledStudents: 104,
    status: 'Open',
    subjects: [
      { id: 'SUB-104', code: 'CS501PE', name: 'Machine Learning', capacity: 60, enrolled: 58, faculty: 'Dr. Ananya Roy' },
      { id: 'SUB-105', code: 'CS502PE', name: 'Cloud Computing & Virtualization', capacity: 60, enrolled: 46, faculty: 'Prof. K. Venkatesh' },
      { id: 'SUB-108', code: 'CS503PE', name: 'Information Security Fundamentals', capacity: 60, enrolled: 0, faculty: 'Prof. S. R. Naidu' },
    ]
  },
  {
    id: 'ELG-02',
    groupCode: 'OE-I',
    groupName: 'Open Elective - I (Inter-Disciplinary)',
    type: 'Open Elective (OE)',
    semester: 'Semester 6',
    semesterId: '6',
    branch: 'All Branches',
    branchId: 'all',
    academicYear: '2025-2026',
    minOptionsRequired: 1,
    maxAllowed: 1,
    totalCapacity: 240,
    enrolledStudents: 198,
    status: 'Open',
    subjects: [
      { id: 'SUB-106', code: 'OE601OE', name: 'Renewable Energy Systems', capacity: 80, enrolled: 72, faculty: 'Dr. P. Srinivasa Rao' },
      { id: 'SUB-109', code: 'OE602OE', name: 'Robotics & Automation Basics', capacity: 80, enrolled: 76, faculty: 'Dr. V. K. Sharma' },
      { id: 'SUB-110', code: 'OE603OE', name: 'Total Quality Management', capacity: 80, enrolled: 50, faculty: 'Prof. M. B. Reddy' },
    ]
  },
  {
    id: 'ELG-03',
    groupCode: 'PE-II',
    groupName: 'Professional Elective - II (Track: Advanced Computing)',
    type: 'Professional Elective (PE)',
    semester: 'Semester 6',
    semesterId: '6',
    branch: 'Computer Science & Engineering',
    branchId: '1',
    academicYear: '2025-2026',
    minOptionsRequired: 1,
    maxAllowed: 1,
    totalCapacity: 120,
    enrolledStudents: 88,
    status: 'Open',
    subjects: [
      { id: 'SUB-111', code: 'CS601PE', name: 'Big Data Analytics', capacity: 60, enrolled: 48, faculty: 'Dr. C. H. Prasad' },
      { id: 'SUB-112', code: 'CS602PE', name: 'Deep Learning & Computer Vision', capacity: 60, enrolled: 40, faculty: 'Dr. Ananya Roy' },
    ]
  }
]

const initialStudentAllocations = [
  { id: 'AL-1001', rollNumber: '23BTECHCSE001', studentName: 'Aditya Varma', branch: 'CSE', semester: 'Semester 5', groupCode: 'PE-I', groupName: 'Professional Elective - I', subjectCode: 'CS501PE', subjectName: 'Machine Learning', preferenceRank: 1, allocationDate: '2026-08-10', status: 'Allocated' },
  { id: 'AL-1002', rollNumber: '23BTECHCSE002', studentName: 'Bhavana Reddy', branch: 'CSE', semester: 'Semester 5', groupCode: 'PE-I', groupName: 'Professional Elective - I', subjectCode: 'CS501PE', subjectName: 'Machine Learning', preferenceRank: 1, allocationDate: '2026-08-10', status: 'Allocated' },
  { id: 'AL-1003', rollNumber: '23BTECHCSE003', studentName: 'Chaitanya Krishna', branch: 'CSE', semester: 'Semester 5', groupCode: 'PE-I', groupName: 'Professional Elective - I', subjectCode: 'CS502PE', subjectName: 'Cloud Computing & Virtualization', preferenceRank: 2, allocationDate: '2026-08-11', status: 'Allocated' },
  { id: 'AL-1004', rollNumber: '23BTECHECE015', studentName: 'Divya Sri', branch: 'ECE', semester: 'Semester 6', groupCode: 'OE-I', groupName: 'Open Elective - I', subjectCode: 'OE601OE', subjectName: 'Renewable Energy Systems', preferenceRank: 1, allocationDate: '2026-08-12', status: 'Allocated' },
  { id: 'AL-1005', rollNumber: '23BTECHME008', studentName: 'Eswar Prasad', branch: 'ME', semester: 'Semester 6', groupCode: 'OE-I', groupName: 'Open Elective - I', subjectCode: 'OE602OE', subjectName: 'Robotics & Automation Basics', preferenceRank: 1, allocationDate: '2026-08-12', status: 'Allocated' },
]

export const subjectService = {
  // Subjects CRUD
  getSubjects: async (params = {}) => {
    try {
      const stored = localStorage.getItem(LOCAL_SUBJECTS_KEY)
      let list = stored ? JSON.parse(stored) : initialSubjects
      if (!stored) {
        localStorage.setItem(LOCAL_SUBJECTS_KEY, JSON.stringify(initialSubjects))
      }
      if (params.search) {
        const query = String(params.search).toLowerCase()
        list = list.filter(item =>
          item.subjectCode.toLowerCase().includes(query) ||
          item.subjectName.toLowerCase().includes(query) ||
          item.shortName.toLowerCase().includes(query) ||
          item.department.toLowerCase().includes(query)
        )
      }
      if (params.department && params.department !== 'All Departments') {
        list = list.filter(item => item.department === params.department || item.departmentId === params.department)
      }
      if (params.branch && params.branch !== 'All Branches') {
        list = list.filter(item => item.branch === params.branch || item.branchId === params.branch || item.branch === 'All Branches')
      }
      if (params.semester && params.semester !== 'All Semesters') {
        list = list.filter(item => item.semester === params.semester || item.semesterId === params.semester)
      }
      if (params.subjectType && params.subjectType !== 'All Types') {
        list = list.filter(item => item.subjectType === params.subjectType)
      }
      return list
    } catch {
      return initialSubjects
    }
  },

  createSubject: async (payload) => {
    const stored = localStorage.getItem(LOCAL_SUBJECTS_KEY)
    const list = stored ? JSON.parse(stored) : [...initialSubjects]
    const newSubject = {
      ...payload,
      id: `SUB-${Date.now().toString().slice(-4)}`,
      credits: Number(payload.credits || 0),
      lectureHours: Number(payload.lectureHours || 0),
      tutorialHours: Number(payload.tutorialHours || 0),
      practicalHours: Number(payload.practicalHours || 0),
      totalMarks: Number(payload.internalMarks || 0) + Number(payload.externalMarks || 0),
      status: payload.status || 'Active',
    }
    list.unshift(newSubject)
    localStorage.setItem(LOCAL_SUBJECTS_KEY, JSON.stringify(list))
    return newSubject
  },

  updateSubject: async (id, payload) => {
    const stored = localStorage.getItem(LOCAL_SUBJECTS_KEY)
    const list = stored ? JSON.parse(stored) : [...initialSubjects]
    const index = list.findIndex(item => String(item.id) === String(id) || String(item.subjectCode) === String(id))
    if (index >= 0) {
      list[index] = {
        ...list[index],
        ...payload,
        id: list[index].id,
        credits: Number(payload.credits ?? list[index].credits),
        lectureHours: Number(payload.lectureHours ?? list[index].lectureHours),
        tutorialHours: Number(payload.tutorialHours ?? list[index].tutorialHours),
        practicalHours: Number(payload.practicalHours ?? list[index].practicalHours),
        totalMarks: Number(payload.internalMarks ?? list[index].internalMarks) + Number(payload.externalMarks ?? list[index].externalMarks),
      }
      localStorage.setItem(LOCAL_SUBJECTS_KEY, JSON.stringify(list))
      return list[index]
    }
    return payload
  },

  deleteSubject: async (id) => {
    const stored = localStorage.getItem(LOCAL_SUBJECTS_KEY)
    const list = stored ? JSON.parse(stored) : [...initialSubjects]
    const filtered = list.filter(item => String(item.id) !== String(id) && String(item.subjectCode) !== String(id))
    localStorage.setItem(LOCAL_SUBJECTS_KEY, JSON.stringify(filtered))
    return true
  },

  // Credits Management
  getCreditStructure: async () => {
    try {
      const stored = localStorage.getItem(LOCAL_CREDITS_KEY)
      if (stored) return JSON.parse(stored)
      localStorage.setItem(LOCAL_CREDITS_KEY, JSON.stringify(initialCreditStructure))
      return initialCreditStructure
    } catch {
      return initialCreditStructure
    }
  },

  updateCreditStructure: async (payload) => {
    try {
      localStorage.setItem(LOCAL_CREDITS_KEY, JSON.stringify(payload))
      return payload
    } catch {
      return payload
    }
  },

  // Elective Management
  getElectiveGroups: async () => {
    try {
      const stored = localStorage.getItem(LOCAL_ELECTIVES_KEY)
      if (stored) return JSON.parse(stored)
      localStorage.setItem(LOCAL_ELECTIVES_KEY, JSON.stringify(initialElectiveGroups))
      return initialElectiveGroups
    } catch {
      return initialElectiveGroups
    }
  },

  createElectiveGroup: async (payload) => {
    const stored = localStorage.getItem(LOCAL_ELECTIVES_KEY)
    const list = stored ? JSON.parse(stored) : [...initialElectiveGroups]
    const newGroup = {
      ...payload,
      id: `ELG-${Date.now().toString().slice(-4)}`,
      enrolledStudents: 0,
      status: payload.status || 'Open',
      subjects: payload.subjects || [],
    }
    list.unshift(newGroup)
    localStorage.setItem(LOCAL_ELECTIVES_KEY, JSON.stringify(list))
    return newGroup
  },

  updateElectiveGroup: async (id, payload) => {
    const stored = localStorage.getItem(LOCAL_ELECTIVES_KEY)
    const list = stored ? JSON.parse(stored) : [...initialElectiveGroups]
    const index = list.findIndex(item => String(item.id) === String(id) || String(item.groupCode) === String(id))
    if (index >= 0) {
      list[index] = { ...list[index], ...payload }
      localStorage.setItem(LOCAL_ELECTIVES_KEY, JSON.stringify(list))
      return list[index]
    }
    return payload
  },

  deleteElectiveGroup: async (id) => {
    const stored = localStorage.getItem(LOCAL_ELECTIVES_KEY)
    const list = stored ? JSON.parse(stored) : [...initialElectiveGroups]
    const filtered = list.filter(item => String(item.id) !== String(id) && String(item.groupCode) !== String(id))
    localStorage.setItem(LOCAL_ELECTIVES_KEY, JSON.stringify(filtered))
    return true
  },

  // Student Elective Allocations
  getStudentAllocations: async () => {
    try {
      const stored = localStorage.getItem(LOCAL_ALLOCATIONS_KEY)
      if (stored) return JSON.parse(stored)
      localStorage.setItem(LOCAL_ALLOCATIONS_KEY, JSON.stringify(initialStudentAllocations))
      return initialStudentAllocations
    } catch {
      return initialStudentAllocations
    }
  },

  createAllocation: async (payload) => {
    const stored = localStorage.getItem(LOCAL_ALLOCATIONS_KEY)
    const list = stored ? JSON.parse(stored) : [...initialStudentAllocations]
    const newAlloc = {
      ...payload,
      id: `AL-${Date.now().toString().slice(-4)}`,
      allocationDate: new Date().toISOString().slice(0, 10),
      status: 'Allocated',
    }
    list.unshift(newAlloc)
    localStorage.setItem(LOCAL_ALLOCATIONS_KEY, JSON.stringify(list))
    return newAlloc
  },

  removeAllocation: async (id) => {
    const stored = localStorage.getItem(LOCAL_ALLOCATIONS_KEY)
    const list = stored ? JSON.parse(stored) : [...initialStudentAllocations]
    const filtered = list.filter(item => String(item.id) !== String(id))
    localStorage.setItem(LOCAL_ALLOCATIONS_KEY, JSON.stringify(filtered))
    return true
  },
}

export default subjectService
