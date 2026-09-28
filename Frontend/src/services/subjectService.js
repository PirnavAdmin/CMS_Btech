import { courseApi, branchApi, departmentApi, facultyMasterApi, subjectApi } from '../api/apiEndpoints'
import { mapApiSubject, subjectApiPayload } from '../utils/subjectApiData'

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

const initialSubjects = []

const initialCreditStructure = {
  totalProgramCredits: 160,
  minCreditsPerSemester: 18,
  maxCreditsPerSemester: 26,
  defaultSemesterCredits: 20,
  categories: [],
  semesterBreakdown: [],
}

const initialElectiveGroups = []

const initialStudentAllocations = []

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
      return (await subjectApi.list(query)).map(mapApiSubject)
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
    return mapApiSubject(await subjectApi.create(subjectApiPayload(payload)))
  },


  /* =======================================================
     UPDATE SUBJECT
  ======================================================= */

  updateSubject: async (id, payload) => {
    return mapApiSubject(await subjectApi.update(id, subjectApiPayload(payload)))
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
