import { courseApi, branchApi, departmentApi, facultyMasterApi } from '../api/apiEndpoints'

/* =========================================================
   LOCAL STORAGE KEYS
========================================================= */

const LOCAL_SUBJECTS_KEY = 'pirnav-academic-subjects-v1'
const LOCAL_CREDITS_KEY = 'pirnav-academic-credits-v1'
const LOCAL_ELECTIVES_KEY = 'pirnav-academic-electives-v1'
const LOCAL_ALLOCATIONS_KEY = 'pirnav-elective-allocations-v1'
const LOCAL_STUDENT_CREDITS_KEY = 'pirnav-student-credits-v1'
const LOCAL_CREDIT_CONFIG_KEY = 'pirnav-credit-configurations-v1'
const LOCAL_CREDIT_VALIDATION_KEY = 'pirnav-credit-validations-v1'


/* =========================================================
   INITIAL SUBJECT DATA
========================================================= */

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
    description:
      'Fundamental data structures, abstract data types, searching and sorting algorithms, complexity analysis.',
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
    description:
      'OOP concepts, inheritance, polymorphism, interfaces, packages, exception handling, multithreading.',
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
    description:
      'Implementation of stacks, queues, linked lists, trees, graphs, and hashing techniques in C/C++.',
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
    description:
      'Supervised learning, unsupervised learning, neural networks, decision trees, support vector machines.',
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
    description:
      'Cloud service models, IaaS, PaaS, SaaS, virtualization techniques, containerization with Docker.',
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
    description:
      'Solar PV, wind energy conversion, hydro power systems, biomass and energy storage technologies.',
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
    description:
      'Ecology, ecosystems, biodiversity conservation, environmental pollution and sustainable development.',
    facultyName: 'Dr. M. Gayatri',
  },
]


/* =========================================================
   CBCS / CREDIT STRUCTURE
========================================================= */

const initialCreditStructure = {
  totalProgramCredits: 160,

  minCreditsPerSemester: 18,

  maxCreditsPerSemester: 26,

  defaultSemesterCredits: 20,

  categories: [
    {
      code: 'BSC',
      name: 'Basic Science Courses',
      requiredCredits: 25,
      earnedRange: '24-26',
      color: '#8782BC',
    },

    {
      code: 'ESC',
      name: 'Engineering Science Courses',
      requiredCredits: 24,
      earnedRange: '22-26',
      color: '#8b5cf6',
    },

    {
      code: 'HSMC',
      name: 'Humanities, Social Sciences & Management',
      requiredCredits: 12,
      earnedRange: '10-14',
      color: '#8782BC',
    },

    {
      code: 'PCC',
      name: 'Professional Core Courses',
      requiredCredits: 54,
      earnedRange: '50-58',
      color: '#06b6d4',
    },

    {
      code: 'PEC',
      name: 'Professional Elective Courses',
      requiredCredits: 18,
      earnedRange: '15-21',
      color: '#8782BC',
    },

    {
      code: 'OEC',
      name: 'Open Elective Courses',
      requiredCredits: 12,
      earnedRange: '9-15',
      color: '#ec4899',
    },

    {
      code: 'PROJ',
      name: 'Project Work, Internship & Seminar',
      requiredCredits: 15,
      earnedRange: '14-16',
      color: '#6366f1',
    },

    {
      code: 'MC',
      name: 'Mandatory Non-Credit Courses',
      requiredCredits: 0,
      earnedRange: 'Audit',
      color: '#64748b',
    },
  ],

  semesterBreakdown: [
    {
      semester: 'Semester 1',
      credits: 19.5,
      coursesCount: 8,
      status: 'Standard',
    },

    {
      semester: 'Semester 2',
      credits: 19.5,
      coursesCount: 8,
      status: 'Standard',
    },

    {
      semester: 'Semester 3',
      credits: 21,
      coursesCount: 8,
      status: 'Standard',
    },

    {
      semester: 'Semester 4',
      credits: 21,
      coursesCount: 8,
      status: 'Standard',
    },

    {
      semester: 'Semester 5',
      credits: 22,
      coursesCount: 7,
      status: 'Standard',
    },

    {
      semester: 'Semester 6',
      credits: 22,
      coursesCount: 7,
      status: 'Standard',
    },

    {
      semester: 'Semester 7',
      credits: 21,
      coursesCount: 6,
      status: 'Standard',
    },

    {
      semester: 'Semester 8',
      credits: 14,
      coursesCount: 3,
      status: 'Standard',
    },
  ],
}


/* =========================================================
   ELECTIVE GROUPS
========================================================= */

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
      {
        id: 'SUB-104',
        code: 'CS501PE',
        name: 'Machine Learning',
        capacity: 60,
        enrolled: 58,
        faculty: 'Dr. Ananya Roy',
      },

      {
        id: 'SUB-105',
        code: 'CS502PE',
        name: 'Cloud Computing & Virtualization',
        capacity: 60,
        enrolled: 46,
        faculty: 'Prof. K. Venkatesh',
      },

      {
        id: 'SUB-108',
        code: 'CS503PE',
        name: 'Information Security Fundamentals',
        capacity: 60,
        enrolled: 0,
        faculty: 'Prof. S. R. Naidu',
      },
    ],
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
      {
        id: 'SUB-106',
        code: 'OE601OE',
        name: 'Renewable Energy Systems',
        capacity: 80,
        enrolled: 72,
        faculty: 'Dr. P. Srinivasa Rao',
      },

      {
        id: 'SUB-109',
        code: 'OE602OE',
        name: 'Robotics & Automation Basics',
        capacity: 80,
        enrolled: 76,
        faculty: 'Dr. V. K. Sharma',
      },

      {
        id: 'SUB-110',
        code: 'OE603OE',
        name: 'Total Quality Management',
        capacity: 80,
        enrolled: 50,
        faculty: 'Prof. M. B. Reddy',
      },
    ],
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
      {
        id: 'SUB-111',
        code: 'CS601PE',
        name: 'Big Data Analytics',
        capacity: 60,
        enrolled: 48,
        faculty: 'Dr. C. H. Prasad',
      },

      {
        id: 'SUB-112',
        code: 'CS602PE',
        name: 'Deep Learning & Computer Vision',
        capacity: 60,
        enrolled: 40,
        faculty: 'Dr. Ananya Roy',
      },
    ],
  },
]


/* =========================================================
   STUDENT ELECTIVE ALLOCATIONS
========================================================= */

const initialStudentAllocations = [
  {
    id: 'AL-1001',
    rollNumber: '23BTECHCSE001',
    studentName: 'Aditya Varma',
    branch: 'CSE',
    semester: 'Semester 5',
    groupCode: 'PE-I',
    groupName: 'Professional Elective - I',
    subjectCode: 'CS501PE',
    subjectName: 'Machine Learning',
    preferenceRank: 1,
    allocationDate: '2026-08-10',
    status: 'Allocated',
  },

  {
    id: 'AL-1002',
    rollNumber: '23BTECHCSE002',
    studentName: 'Bhavana Reddy',
    branch: 'CSE',
    semester: 'Semester 5',
    groupCode: 'PE-I',
    groupName: 'Professional Elective - I',
    subjectCode: 'CS501PE',
    subjectName: 'Machine Learning',
    preferenceRank: 1,
    allocationDate: '2026-08-10',
    status: 'Allocated',
  },

  {
    id: 'AL-1003',
    rollNumber: '23BTECHCSE003',
    studentName: 'Chaitanya Krishna',
    branch: 'CSE',
    semester: 'Semester 5',
    groupCode: 'PE-I',
    groupName: 'Professional Elective - I',
    subjectCode: 'CS502PE',
    subjectName: 'Cloud Computing & Virtualization',
    preferenceRank: 2,
    allocationDate: '2026-08-11',
    status: 'Allocated',
  },

  {
    id: 'AL-1004',
    rollNumber: '23BTECHECE015',
    studentName: 'Divya Sri',
    branch: 'ECE',
    semester: 'Semester 6',
    groupCode: 'OE-I',
    groupName: 'Open Elective - I',
    subjectCode: 'OE601OE',
    subjectName: 'Renewable Energy Systems',
    preferenceRank: 1,
    allocationDate: '2026-08-12',
    status: 'Allocated',
  },

  {
    id: 'AL-1005',
    rollNumber: '23BTECHME008',
    studentName: 'Eswar Prasad',
    branch: 'ME',
    semester: 'Semester 6',
    groupCode: 'OE-I',
    groupName: 'Open Elective - I',
    subjectCode: 'OE602OE',
    subjectName: 'Robotics & Automation Basics',
    preferenceRank: 1,
    allocationDate: '2026-08-12',
    status: 'Allocated',
  },
]


/* =========================================================
   HELPER FUNCTIONS
========================================================= */

const getLocalData = (key, fallback) => {
  try {
    const stored = localStorage.getItem(key)

    if (stored) {
      return JSON.parse(stored)
    }

    localStorage.setItem(key, JSON.stringify(fallback))

    return fallback
  } catch {
    return fallback
  }
}


const saveLocalData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data))
  return data
}


const normalize = value =>
  String(value ?? '')
    .trim()
    .toLowerCase()


const sumCredits = items =>
  items.reduce(
    (total, item) => total + Number(item.credits || 0),
    0
  )


/* =========================================================
   SUBJECT SERVICE
========================================================= */

export const subjectService = {

  /* =======================================================
     SUBJECT CRUD
  ======================================================= */

  getSubjects: async (params = {}) => {
    // Live consumers must not count the seeded local catalog.
    if (params.liveOnly) {
      const query = { ...params }
      delete query.liveOnly
      return facultyMasterApi.getSubjects(query)
    }
    try {
      let list = getLocalData(
        LOCAL_SUBJECTS_KEY,
        initialSubjects
      )

      if (params.search) {
        const query = normalize(params.search)

        list = list.filter(item =>
          normalize(item.subjectCode).includes(query) ||
          normalize(item.subjectName).includes(query) ||
          normalize(item.shortName).includes(query) ||
          normalize(item.department).includes(query)
        )
      }

      if (
        params.department &&
        params.department !== 'All Departments'
      ) {
        list = list.filter(
          item =>
            item.department === params.department ||
            item.departmentId === params.department
        )
      }

      if (
        params.branch &&
        params.branch !== 'All Branches'
      ) {
        list = list.filter(
          item =>
            item.branch === params.branch ||
            item.branchId === params.branch ||
            item.branch === 'All Branches'
        )
      }

      if (
        params.semester &&
        params.semester !== 'All Semesters'
      ) {
        list = list.filter(
          item =>
            item.semester === params.semester ||
            item.semesterId === params.semester
        )
      }

      if (
        params.subjectType &&
        params.subjectType !== 'All Types'
      ) {
        list = list.filter(
          item => item.subjectType === params.subjectType
        )
      }

      return list
    } catch {
      return initialSubjects
    }
  },


  /* =======================================================
     CREATE SUBJECT
  ======================================================= */

  createSubject: async payload => {
    const list = getLocalData(
      LOCAL_SUBJECTS_KEY,
      initialSubjects
    )

    const duplicate = list.some(
      item =>
        normalize(item.subjectCode) ===
        normalize(payload.subjectCode)
    )

    if (duplicate) {
      throw new Error(
        `Subject code "${payload.subjectCode}" already exists.`
      )
    }

    const newSubject = {
      ...payload,

      id: `SUB-${Date.now().toString().slice(-4)}`,

      credits: Number(payload.credits || 0),

      lectureHours: Number(payload.lectureHours || 0),

      tutorialHours: Number(payload.tutorialHours || 0),

      practicalHours: Number(payload.practicalHours || 0),

      totalMarks:
        Number(payload.internalMarks || 0) +
        Number(payload.externalMarks || 0),

      status: payload.status || 'Active',
    }

    list.unshift(newSubject)

    saveLocalData(
      LOCAL_SUBJECTS_KEY,
      list
    )

    return newSubject
  },


  /* =======================================================
     UPDATE SUBJECT
  ======================================================= */

  updateSubject: async (id, payload) => {
    const list = getLocalData(
      LOCAL_SUBJECTS_KEY,
      initialSubjects
    )

    const index = list.findIndex(
      item =>
        String(item.id) === String(id) ||
        String(item.subjectCode) === String(id)
    )

    if (index >= 0) {

      const duplicate = list.some(
        (item, itemIndex) =>
          itemIndex !== index &&
          normalize(item.subjectCode) ===
            normalize(
              payload.subjectCode ??
                list[index].subjectCode
            )
      )

      if (duplicate) {
        throw new Error(
          `Subject code "${payload.subjectCode}" already exists.`
        )
      }

      list[index] = {
        ...list[index],
        ...payload,

        id: list[index].id,

        credits: Number(
          payload.credits ??
          list[index].credits
        ),

        lectureHours: Number(
          payload.lectureHours ??
          list[index].lectureHours
        ),

        tutorialHours: Number(
          payload.tutorialHours ??
          list[index].tutorialHours
        ),

        practicalHours: Number(
          payload.practicalHours ??
          list[index].practicalHours
        ),

        totalMarks:
          Number(
            payload.internalMarks ??
            list[index].internalMarks
          ) +
          Number(
            payload.externalMarks ??
            list[index].externalMarks
          ),
      }

      saveLocalData(
        LOCAL_SUBJECTS_KEY,
        list
      )

      return list[index]
    }

    return payload
  },


  /* =======================================================
     DELETE SUBJECT
  ======================================================= */

  deleteSubject: async id => {
    const list = getLocalData(
      LOCAL_SUBJECTS_KEY,
      initialSubjects
    )

    const filtered = list.filter(
      item =>
        String(item.id) !== String(id) &&
        String(item.subjectCode) !== String(id)
    )

    saveLocalData(
      LOCAL_SUBJECTS_KEY,
      filtered
    )

    return true
  },


  /* =======================================================
     CBCS - CREDIT STRUCTURE
  ======================================================= */

  getCreditStructure: async () => {
    return getLocalData(
      LOCAL_CREDITS_KEY,
      initialCreditStructure
    )
  },


  updateCreditStructure: async payload => {
    saveLocalData(
      LOCAL_CREDITS_KEY,
      payload
    )

    return payload
  },


  /* =======================================================
     CBCS - SUBJECT CREDIT CONFIGURATION
  ======================================================= */

  getCreditConfigurations: async (params = {}) => {

    const subjects = await subjectService.getSubjects()

    let configurations = subjects.map(subject => ({
      id: subject.id,

      subjectCode: subject.subjectCode,

      subjectName: subject.subjectName,

      department: subject.department,

      departmentId: subject.departmentId,

      course: subject.course,

      courseId: subject.courseId,

      branch: subject.branch,

      branchId: subject.branchId,

      semester: subject.semester,

      semesterId: subject.semesterId,

      academicYear: subject.academicYear,

      subjectType: subject.subjectType,

      category: subject.category,

      credits: Number(subject.credits || 0),

      lectureHours: Number(
        subject.lectureHours || 0
      ),

      tutorialHours: Number(
        subject.tutorialHours || 0
      ),

      practicalHours: Number(
        subject.practicalHours || 0
      ),

      status: subject.status,

      facultyName: subject.facultyName,
    }))


    if (params.department) {
      configurations = configurations.filter(
        item =>
          item.department === params.department ||
          item.departmentId === params.department
      )
    }


    if (params.branch) {
      configurations = configurations.filter(
        item =>
          item.branch === params.branch ||
          item.branchId === params.branch ||
          item.branch === 'All Branches'
      )
    }


    if (params.semester) {
      configurations = configurations.filter(
        item =>
          item.semester === params.semester ||
          item.semesterId === params.semester
      )
    }


    if (params.category) {
      configurations = configurations.filter(
        item =>
          item.category === params.category
      )
    }


    return configurations
  },


  /* =======================================================
     CONFIGURE SUBJECT CREDITS
  ======================================================= */

  configureSubjectCredit: async payload => {

    const subjects = getLocalData(
      LOCAL_SUBJECTS_KEY,
      initialSubjects
    )

    const index = subjects.findIndex(
      item =>
        String(item.id) === String(payload.subjectId) ||
        normalize(item.subjectCode) ===
          normalize(payload.subjectCode)
    )

    if (index === -1) {
      throw new Error(
        'Subject not found.'
      )
    }


    const credits = Number(
      payload.credits
    )

    if (credits < 0) {
      throw new Error(
        'Credits cannot be negative.'
      )
    }


    subjects[index] = {
      ...subjects[index],

      credits,

      category:
        payload.category ??
        subjects[index].category,

      subjectType:
        payload.subjectType ??
        subjects[index].subjectType,

      updatedAt:
        new Date().toISOString(),

      updatedBy:
        payload.updatedBy ||
        'Admin',
    }


    saveLocalData(
      LOCAL_SUBJECTS_KEY,
      subjects
    )


    return subjects[index]
  },


  /* =======================================================
     UPDATE CREDIT CONFIGURATION
  ======================================================= */

  updateCreditConfiguration: async (
    id,
    payload
  ) => {

    return subjectService.configureSubjectCredit({
      ...payload,
      subjectId: id,
    })
  },


  /* =======================================================
     CBCS - STUDENT CREDIT REGISTRATION
  ======================================================= */

  getStudentCredits: async (
    studentId = null
  ) => {

    const records = getLocalData(
      LOCAL_STUDENT_CREDITS_KEY,
      []
    )

    if (!studentId) {
      return records
    }

    return records.filter(
      item =>
        String(item.studentId) ===
        String(studentId)
    )
  },


  /* =======================================================
     REGISTER STUDENT CREDIT
  ======================================================= */

  registerStudentCredit: async payload => {

    const records = getLocalData(
      LOCAL_STUDENT_CREDITS_KEY,
      []
    )


    const duplicate = records.some(
      item =>
        normalize(item.studentId) ===
          normalize(payload.studentId) &&
        normalize(item.subjectCode) ===
          normalize(payload.subjectCode) &&
        normalize(item.academicYear) ===
          normalize(payload.academicYear) &&
        normalize(item.semester) ===
          normalize(payload.semester)
    )


    if (duplicate) {
      throw new Error(
        'Student is already registered for this subject in the selected semester.'
      )
    }


    const subjectList =
      await subjectService.getSubjects()


    const subject = subjectList.find(
      item =>
        normalize(item.subjectCode) ===
        normalize(payload.subjectCode)
    )


    if (!subject) {
      throw new Error(
        'Subject code does not exist.'
      )
    }


    const newRecord = {

      id:
        `SC-${Date.now().toString().slice(-6)}`,

      studentId:
        payload.studentId,

      studentName:
        payload.studentName || '',

      department:
        payload.department ||
        subject.department,

      departmentId:
        payload.departmentId ||
        subject.departmentId,

      course:
        payload.course ||
        subject.course,

      courseId:
        payload.courseId ||
        subject.courseId,

      branch:
        payload.branch ||
        subject.branch,

      branchId:
        payload.branchId ||
        subject.branchId,

      semester:
        payload.semester ||
        subject.semester,

      semesterId:
        payload.semesterId ||
        subject.semesterId,

      academicYear:
        payload.academicYear ||
        subject.academicYear,

      subjectCode:
        subject.subjectCode,

      subjectName:
        subject.subjectName,

      category:
        subject.category,

      credits:
        Number(subject.credits || 0),

      status:
        payload.status ||
        'Registered',

      grade:
        payload.grade || null,

      attemptNo:
        Number(payload.attemptNo || 1),

      registeredAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),
    }


    records.unshift(newRecord)


    saveLocalData(
      LOCAL_STUDENT_CREDITS_KEY,
      records
    )


    return newRecord
  },


  /* =======================================================
     UPDATE STUDENT CREDIT
  ======================================================= */

  updateStudentCredit: async (
    id,
    payload
  ) => {

    const records = getLocalData(
      LOCAL_STUDENT_CREDITS_KEY,
      []
    )


    const index = records.findIndex(
      item =>
        String(item.id) ===
        String(id)
    )


    if (index === -1) {
      throw new Error(
        'Student credit record not found.'
      )
    }


    records[index] = {

      ...records[index],

      ...payload,

      credits:
        payload.credits !== undefined
          ? Number(payload.credits)
          : records[index].credits,

      updatedAt:
        new Date().toISOString(),
    }


    saveLocalData(
      LOCAL_STUDENT_CREDITS_KEY,
      records
    )


    return records[index]
  },


  /* =======================================================
     DELETE STUDENT CREDIT
  ======================================================= */

  deleteStudentCredit: async id => {

    const records = getLocalData(
      LOCAL_STUDENT_CREDITS_KEY,
      []
    )


    const filtered =
      records.filter(
        item =>
          String(item.id) !==
          String(id)
      )


    saveLocalData(
      LOCAL_STUDENT_CREDITS_KEY,
      filtered
    )


    return true
  },


  /* =======================================================
     SEMESTER CREDIT SUMMARY
  ======================================================= */

  getSemesterCreditSummary: async studentId => {

    const records =
      await subjectService.getStudentCredits(
        studentId
      )


    const grouped = {}


    records.forEach(record => {

      const semester =
        record.semester ||
        'Unknown'


      if (!grouped[semester]) {

        grouped[semester] = {

          semester,

          registeredCredits: 0,

          earnedCredits: 0,

          failedCredits: 0,

          backlogCredits: 0,

          subjectCount: 0,

          subjects: [],
        }
      }


      const credits =
        Number(record.credits || 0)


      grouped[semester]
        .registeredCredits += credits


      grouped[semester]
        .subjectCount += 1


      grouped[semester]
        .subjects.push(record)


      const status =
        normalize(record.status)


      if (
        status === 'completed' ||
        status === 'passed' ||
        status === 'earned'
      ) {

        grouped[semester]
          .earnedCredits += credits

      }


      if (
        status === 'failed'
      ) {

        grouped[semester]
          .failedCredits += credits

      }


      if (
        status === 'backlog'
      ) {

        grouped[semester]
          .backlogCredits += credits

      }

    })


    return Object.values(grouped)
  },


  /* =======================================================
     OVERALL STUDENT CREDIT SUMMARY
  ======================================================= */

  getStudentCreditSummary: async studentId => {

    const records =
      await subjectService.getStudentCredits(
        studentId
      )


    const creditStructure =
      await subjectService.getCreditStructure()


    const registeredCredits =
      sumCredits(records)


    const earnedCredits =
      records.reduce(
        (total, record) => {

          const status =
            normalize(record.status)

          if (
            status === 'completed' ||
            status === 'passed' ||
            status === 'earned'
          ) {

            return (
              total +
              Number(record.credits || 0)
            )

          }

          return total
        },
        0
      )


    const failedCredits =
      records
        .filter(
          record =>
            normalize(record.status) ===
            'failed'
        )
        .reduce(
          (total, record) =>
            total +
            Number(record.credits || 0),
          0
        )


    const backlogCredits =
      records
        .filter(
          record =>
            normalize(record.status) ===
            'backlog'
        )
        .reduce(
          (total, record) =>
            total +
            Number(record.credits || 0),
          0
        )


    const requiredCredits =
      Number(
        creditStructure.totalProgramCredits ||
        0
      )


    const remainingCredits =
      Math.max(
        requiredCredits -
          earnedCredits,
        0
      )


    const progress =
      requiredCredits > 0
        ? Number(
            (
              (earnedCredits /
                requiredCredits) *
              100
            ).toFixed(2)
          )
        : 0


    let status = 'On Track'


    if (
      registeredCredits >
      Number(
        creditStructure.maxCreditsPerSemester ||
        26
      )
    ) {
      status = 'Overload'
    }


    if (
      remainingCredits >
      0 &&
      earnedCredits <
        requiredCredits
    ) {
      status = 'Credit Shortage'
    }


    if (
      failedCredits > 0 ||
      backlogCredits > 0
    ) {
      status = 'Backlog'
    }


    return {

      studentId,

      requiredCredits,

      registeredCredits,

      earnedCredits,

      remainingCredits,

      failedCredits,

      backlogCredits,

      progress,

      status,

      totalSubjects:
        records.length,

      semesterSummary:
        await subjectService
          .getSemesterCreditSummary(
            studentId
          ),
    }
  },


  /* =======================================================
     CREDIT DASHBOARD
  ======================================================= */

  getCreditDashboard: async () => {

    const subjects =
      await subjectService.getSubjects()


    const studentCredits =
      await subjectService.getStudentCredits()


    const creditStructure =
      await subjectService.getCreditStructure()


    const totalSubjects =
      subjects.length


    const totalCreditsConfigured =
      sumCredits(subjects)


    const uniqueStudents =
      [
        ...new Set(
          studentCredits.map(
            item => item.studentId
          )
        ),
      ]


    const totalStudents =
      uniqueStudents.length


    const completedCredits =
      studentCredits
        .filter(record => {

          const status =
            normalize(record.status)

          return (
            status === 'completed' ||
            status === 'passed' ||
            status === 'earned'
          )
        })
        .reduce(
          (total, record) =>
            total +
            Number(record.credits || 0),
          0
        )


    const backlogCredits =
      studentCredits
        .filter(
          record =>
            normalize(record.status) ===
            'backlog'
        )
        .reduce(
          (total, record) =>
            total +
            Number(record.credits || 0),
          0
        )


    const failedCredits =
      studentCredits
        .filter(
          record =>
            normalize(record.status) ===
            'failed'
        )
        .reduce(
          (total, record) =>
            total +
            Number(record.credits || 0),
          0
        )


    /* -------------------------------------------------------
       CATEGORY-WISE CREDIT MONITORING
    ------------------------------------------------------- */

    const categoryMap = {}


    subjects.forEach(subject => {

      const category =
        subject.category ||
        'Uncategorized'


      if (!categoryMap[category]) {

        categoryMap[category] = {

          category,

          subjectCount: 0,

          totalCredits: 0,

        }
      }


      categoryMap[category]
        .subjectCount += 1


      categoryMap[category]
        .totalCredits +=
          Number(subject.credits || 0)

    })


    const categoryBreakdown =
      Object.values(categoryMap)


    /* -------------------------------------------------------
       SEMESTER-WISE CREDIT MONITORING
    ------------------------------------------------------- */

    const semesterMap = {}


    subjects.forEach(subject => {

      const semester =
        subject.semester ||
        'Unknown'


      if (!semesterMap[semester]) {

        semesterMap[semester] = {

          semester,

          subjectCount: 0,

          totalCredits: 0,

        }
      }


      semesterMap[semester]
        .subjectCount += 1


      semesterMap[semester]
        .totalCredits +=
          Number(subject.credits || 0)

    })


    const semesterBreakdown =
      Object.values(semesterMap)


    /* -------------------------------------------------------
       DUPLICATE SUBJECT VALIDATION
    ------------------------------------------------------- */

    const subjectCodeMap = {}


    subjects.forEach(subject => {

      const code =
        normalize(subject.subjectCode)


      if (!code) return


      if (!subjectCodeMap[code]) {

        subjectCodeMap[code] = []
      }


      subjectCodeMap[code].push(subject)

    })


    const duplicateSubjects =
      Object.values(subjectCodeMap)
        .filter(group => group.length > 1)


    /* -------------------------------------------------------
       INVALID CREDIT CONFIGURATION
    ------------------------------------------------------- */

    const invalidCreditConfigurations =
      subjects.filter(subject => {

        const credits =
          Number(subject.credits)


        return (
          !subject.subjectCode ||
          !subject.subjectName ||
          Number.isNaN(credits) ||
          credits < 0
        )
      })


    return {

      totalSubjects,

      totalCreditsConfigured,

      totalStudents,

      registeredCreditRecords:
        studentCredits.length,

      completedCredits,

      backlogCredits,

      failedCredits,

      duplicateSubjects:
        duplicateSubjects.length,

      invalidCreditConfigurations:
        invalidCreditConfigurations.length,

      categoryBreakdown,

      semesterBreakdown,

      creditStructure,

      alerts: {

        creditShortage:
          studentCredits.filter(
            record =>
              normalize(record.status) ===
                'backlog' ||
              normalize(record.status) ===
                'failed'
          ).length,

        duplicateSubjects:
          duplicateSubjects.length,

        invalidConfigurations:
          invalidCreditConfigurations.length,

        inactiveSubjects:
          subjects.filter(
            item =>
              normalize(item.status) !==
              'active'
          ).length,
      },
    }
  },


  /* =======================================================
     CREDIT VALIDATION
  ======================================================= */

  validateCredits: async () => {

    const subjects =
      await subjectService.getSubjects()


    const studentCredits =
      await subjectService.getStudentCredits()


    const duplicateSubjectCodes = []


    const subjectCodeMap = {}


    subjects.forEach(subject => {

      const code =
        normalize(subject.subjectCode)


      if (!code) return


      if (!subjectCodeMap[code]) {

        subjectCodeMap[code] = []
      }


      subjectCodeMap[code].push(subject)

    })


    Object.entries(
      subjectCodeMap
    ).forEach(
      ([code, items]) => {

        if (items.length > 1) {

          duplicateSubjectCodes.push({

            code,

            records: items,

          })

        }

      }
    )


    /* -------------------------------------------------------
       INVALID SUBJECT MAPPINGS
    ------------------------------------------------------- */

    const invalidMappings =
      subjects.filter(subject => {

        return (
          !subject.subjectCode ||
          !subject.subjectName ||
          !subject.course ||
          !subject.branch ||
          !subject.semester ||
          !subject.academicYear
        )

      })


    /* -------------------------------------------------------
       DUPLICATE STUDENT REGISTRATIONS
    ------------------------------------------------------- */

    const registrationMap = {}


    studentCredits.forEach(record => {

      const key = [

        normalize(record.studentId),

        normalize(record.subjectCode),

        normalize(record.semester),

        normalize(record.academicYear),

      ].join('|')


      if (!registrationMap[key]) {

        registrationMap[key] = []
      }


      registrationMap[key].push(record)

    })


    const duplicateStudentRegistrations =
      Object.values(
        registrationMap
      ).filter(
        records =>
          records.length > 1
      )


    const result = {

      valid:
        duplicateSubjectCodes.length === 0 &&
        invalidMappings.length === 0 &&
        duplicateStudentRegistrations.length === 0,

      duplicateSubjectCodes,

      invalidMappings,

      duplicateStudentRegistrations,

      totalIssues:
        duplicateSubjectCodes.length +
        invalidMappings.length +
        duplicateStudentRegistrations.length,

      validatedAt:
        new Date().toISOString(),
    }


    saveLocalData(
      LOCAL_CREDIT_VALIDATION_KEY,
      result
    )


    return result
  },


  /* =======================================================
     GET LAST VALIDATION RESULT
  ======================================================= */

  getCreditValidation: async () => {

    return getLocalData(
      LOCAL_CREDIT_VALIDATION_KEY,
      {
        valid: true,

        duplicateSubjectCodes: [],

        invalidMappings: [],

        duplicateStudentRegistrations: [],

        totalIssues: 0,

        validatedAt: null,
      }
    )
  },


  /* =======================================================
     ELECTIVE MANAGEMENT
  ======================================================= */

  getElectiveGroups: async () => {

    return getLocalData(
      LOCAL_ELECTIVES_KEY,
      initialElectiveGroups
    )
  },


  createElectiveGroup: async payload => {

    const list = getLocalData(
      LOCAL_ELECTIVES_KEY,
      initialElectiveGroups
    )


    const newGroup = {

      ...payload,

      id:
        `ELG-${Date.now().toString().slice(-4)}`,

      enrolledStudents: 0,

      status:
        payload.status || 'Open',

      subjects:
        payload.subjects || [],
    }


    list.unshift(newGroup)


    saveLocalData(
      LOCAL_ELECTIVES_KEY,
      list
    )


    return newGroup
  },


  updateElectiveGroup: async (
    id,
    payload
  ) => {

    const list = getLocalData(
      LOCAL_ELECTIVES_KEY,
      initialElectiveGroups
    )


    const index =
      list.findIndex(
        item =>
          String(item.id) ===
            String(id) ||
          String(item.groupCode) ===
            String(id)
      )


    if (index >= 0) {

      list[index] = {

        ...list[index],

        ...payload,

      }


      saveLocalData(
        LOCAL_ELECTIVES_KEY,
        list
      )


      return list[index]
    }


    return payload
  },


  deleteElectiveGroup: async id => {

    const list = getLocalData(
      LOCAL_ELECTIVES_KEY,
      initialElectiveGroups
    )


    const filtered =
      list.filter(
        item =>
          String(item.id) !==
            String(id) &&
          String(item.groupCode) !==
            String(id)
      )


    saveLocalData(
      LOCAL_ELECTIVES_KEY,
      filtered
    )


    return true
  },


  /* =======================================================
     STUDENT ELECTIVE ALLOCATIONS
  ======================================================= */

  getStudentAllocations: async () => {

    return getLocalData(
      LOCAL_ALLOCATIONS_KEY,
      initialStudentAllocations
    )
  },


  createAllocation: async payload => {

    const list = getLocalData(
      LOCAL_ALLOCATIONS_KEY,
      initialStudentAllocations
    )


    const newAlloc = {

      ...payload,

      id:
        `AL-${Date.now().toString().slice(-4)}`,

      allocationDate:
        new Date()
          .toISOString()
          .slice(0, 10),

      status: 'Allocated',
    }


    list.unshift(newAlloc)


    saveLocalData(
      LOCAL_ALLOCATIONS_KEY,
      list
    )


    return newAlloc
  },


  removeAllocation: async id => {

    const list = getLocalData(
      LOCAL_ALLOCATIONS_KEY,
      initialStudentAllocations
    )


    const filtered =
      list.filter(
        item =>
          String(item.id) !==
          String(id)
      )


    saveLocalData(
      LOCAL_ALLOCATIONS_KEY,
      filtered
    )


    return true
  },
}


/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default subjectService
