import { newestFirst } from '../../utils/newestFirst'
import { showError } from '../../utils/toast'
import useToastState from '../../hooks/useToastState'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiLayers,
  FiPlus,
  FiSearch,
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiAlertTriangle,
  FiBarChart2,
  FiBell,
  FiSave,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import PageHeader from '../../components/PageHeader'
import CompactSummary from '../../components/CompactSummary'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'
import InfoCard from '../../components/InfoCard'
import TablePagination from '../../components/TablePagination'
import ExportMenu from '../../components/ExportMenu'
import ViewDialog from '../../components/ViewDialog'
import { useAcademic } from '../../context/AcademicContext'
import { facultyMasterApi } from '../../api/apiEndpoints'
import attendanceService from '../../services/attendanceService'
import studentService from '../../services/studentService'
import facultyService from '../../services/facultyService'
import subjectService from '../../services/subjectService'
import './Attendance.css'

const ATTENDANCE_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'subject', label: 'Subject' },
  { key: 'course', label: 'Course' },
  { key: 'branch', label: 'Branch' },
  { key: 'semester', label: 'Semester' },
  { key: 'section', label: 'Section' },
  { key: 'totalStudents', label: 'Total' },
  { key: 'presentCount', label: 'Present' },
  { key: 'absentCount', label: 'Absent' },
  { key: 'attendanceRate', label: 'Attendance %' },
  { key: 'faculty', label: 'Faculty' },
]

export default function Attendance() {
  const { pathname } = useLocation()
  const {
    currentAcademicYear,
    activeDepartments,
    activeCourses,
    getBranchesForCourse,
    getSemestersForCourse,
    getSectionsForScope,
  } = useAcademic()

  const [activeTab, setActiveTab] = useState('register') // 'register' | 'shortage'
  const [reportView, setReportView] = useState('subject')
  const [takeModalOpen, setTakeModalOpen] = useState(pathname.endsWith('/take'))
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [, setToast] = useToastState('', 'success')
  const [selectedSession, setSelectedSession] = useState(null)
  const [selectedStudentReport, setSelectedStudentReport] = useState(null)
  const [shortageDepartmentId, setShortageDepartmentId] = useState('')
  const [shortageCourseId, setShortageCourseId] = useState('')
  const [shortageBranchId, setShortageBranchId] = useState('')
  const [showShortageFilters, setShowShortageFilters] = useState(false)

  // Scope Filters for Register
  const [filterQuery, setFilterQuery] = useState('')
  const [filterCourseId, setFilterCourseId] = useState('')
  const [filterBranchId, setFilterBranchId] = useState('')
  const [filterSemesterId] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [showRegisterFilters, setShowRegisterFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5

  // "Take Attendance" Form State
  const [takeScope, setTakeScope] = useState({
    academicYearId: '',
    courseId: '',
    branchId: '',
    semesterId: '',
    sectionId: '',
    date: new Date().toISOString().slice(0, 10),
    subject: '',
    subjectId: '',
    subjectCode: '',
    faculty: '',
    facultyId: '',
  })
  const currentAcademicYearId = currentAcademicYear?.id ?? currentAcademicYear?.academicYearId ?? ''
  useEffect(() => {
    if (!takeModalOpen || !currentAcademicYearId) return
    setTakeScope(current => current.academicYearId === String(currentAcademicYearId)
      ? current
      : { ...current, academicYearId: String(currentAcademicYearId) })
  }, [takeModalOpen, currentAcademicYearId])
  const [markingStudents, setMarkingStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [savingSession, setSavingSession] = useState(false)
  const [activeFaculty, setActiveFaculty] = useState([])
  const [facultyAssignments, setFacultyAssignments] = useState([])
  const [loadingFaculty, setLoadingFaculty] = useState(false)
  const [allSubjects, setAllSubjects] = useState([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [attendanceSemesterCatalog, setAttendanceSemesterCatalog] = useState([])

  // Shortage list state
  const [allProfiles, setAllProfiles] = useState([])

  const notify = (msg, type = 'success') => setToast(msg, type)

  // Keep the option value and selected-subject lookup on the same ID field.
  // Subject APIs use different casing/names for this field across endpoints.
  const getSubjectId = (subject) => subject?.subjectId ?? subject?.subject_id ?? subject?.id

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true)
      const data = await attendanceService.getSessions()
      setSessions(newestFirst('attendance', data || []))
    } catch (err) {
      showError(err.message || 'Error loading attendance sessions:')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadProfiles = useCallback(async () => {
    try {
      const profiles = await studentService.getAllProfiles()
      setAllProfiles(profiles || [])
    } catch (err) {
      showError(err.message || 'Error loading profiles for shortage:')
    }
  }, [])

  useEffect(() => {
    loadSessions()
    loadProfiles()
  }, [loadSessions, loadProfiles])

  useEffect(() => {
    let mounted = true
    const loadData = async () => {
      try {
        setLoadingFaculty(true)
        setLoadingSubjects(true)
        const [faculty, assignments, backendSubjects, localSubjects, semesters] = await Promise.all([
          facultyService.list().catch(() => []),
          facultyService.getSubjectAllocations().catch(() => []),
          facultyMasterApi.getSubjects().catch(() => []),
          subjectService.getSubjects().catch(() => []),
          facultyMasterApi.getSemesters().catch(() => []),
        ])
        if (!mounted) return
        setActiveFaculty((faculty || []).filter(member => ['working', 'active'].includes(String(member.employmentStatus || member.status || '').trim().toLowerCase())))
        setFacultyAssignments(assignments || [])
        setAttendanceSemesterCatalog((semesters || []).map(semester => ({
          ...semester,
          id: semester.semesterId ?? semester.semester_id ?? semester.id ?? semester.semesterNumber ?? semester.semester_number,
          semesterId: semester.semesterId ?? semester.semester_id ?? semester.id ?? semester.semesterNumber ?? semester.semester_number,
          semesterNumber: semester.semesterNumber ?? semester.semester_number ?? String(semester.semesterName || semester.semester_name || semester.name || '').match(/\d+/)?.[0],
          semesterName: semester.semesterName ?? semester.semester_name ?? semester.name ?? '',
          courseId: semester.courseId ?? semester.course_id,
          branchId: semester.branchId ?? semester.branch_id,
        })).filter(semester => semester.id != null))

        // Merge backend subjects and local subjects, ensuring numeric integer IDs and complete names
        const combinedSubjectMap = new Map()

        const getSubName = (s) => s.subjectName || s.subject_name || s.name || s.title || s.subjectTitle || s.subject || ''
        const getSubCode = (s) => s.subjectCode || s.subject_code || s.code || ''
        const getDatabaseId = (value) => {
          const text = String(value ?? '').trim()
          if (!/^\d+$/.test(text)) return 0
          const id = Number(text)
          return Number.isSafeInteger(id) && id > 0 ? id : 0
        }
        const isActiveRecord = (record) => {
          const status = record?.status ?? record?.isActive ?? record?.active
          return status === undefined || status === null || ![false, 0, '0', 'inactive', 'disabled'].includes(
            typeof status === 'string' ? status.trim().toLowerCase() : status,
          )
        }

        // 1. First add backend database subjects (they carry numeric database subject_id)
        ;(backendSubjects || []).forEach(sub => {
          const id = getDatabaseId(sub.subjectId ?? sub.subject_id ?? sub.id)
          const name = getSubName(sub)
          const code = getSubCode(sub)
          if (name && id > 0 && isActiveRecord(sub)) {
            const finalId = id
            combinedSubjectMap.set(String(finalId), {
              ...sub,
              id: finalId,
              subjectId: finalId,
              subjectName: name || `Subject ${finalId}`,
              name: name || `Subject ${finalId}`,
              subjectCode: code,
              code,
              courseId: sub.courseId ?? sub.course_id,
              branchId: sub.branchId ?? sub.branch_id,
              semesterId: sub.semesterId ?? sub.semester_id,
            })
          }
        })

        // 2. Add from allocations if not already present
        ;(assignments || []).forEach(alloc => {
          const allocId = getDatabaseId(alloc.subjectId ?? alloc.subject?.subjectId ?? alloc.subject?.id)
          const name = alloc.subjectName ?? alloc.subject?.subjectName ?? alloc.subject?.name ?? alloc.subject ?? ''
          const code = alloc.subjectCode ?? alloc.subject?.subjectCode ?? alloc.subject?.code ?? ''
          if (name && allocId > 0 && isActiveRecord(alloc) && isActiveRecord(alloc.subject || {})) {
            const finalId = allocId
            if (!combinedSubjectMap.has(String(finalId))) {
              combinedSubjectMap.set(String(finalId), {
                id: finalId,
                subjectId: finalId,
                subjectName: name,
                name,
                subjectCode: code,
                code,
                courseId: alloc.courseId ?? alloc.branch?.courseId,
                branchId: alloc.branchId ?? alloc.branch?.branchId,
                semesterId: alloc.semesterId ?? alloc.semester?.semesterId,
              })
            }
          }
        })

        // 3. Add local subjects with numeric sanitized IDs
        ;(localSubjects || []).forEach(sub => {
          const id = getDatabaseId(sub.subjectId ?? sub.subject_id ?? sub.id)
          const name = getSubName(sub)
          const code = getSubCode(sub)
          const key = String(id)
          if (name && id > 0 && isActiveRecord(sub) && !combinedSubjectMap.has(key)) {
            combinedSubjectMap.set(key, {
              ...sub,
              id,
              subjectId: id,
              subjectName: name,
              name,
              subjectCode: code,
              code,
            })
          }
        })

        setAllSubjects([...combinedSubjectMap.values()])
      } catch {
        if (mounted) { setActiveFaculty([]); setFacultyAssignments([]); setAllSubjects([]) }
      } finally {
        if (mounted) { setLoadingFaculty(false); setLoadingSubjects(false) }
      }
    }
    loadData()
    return () => { mounted = false }
  }, [])

  // Cascading lists for Take Attendance
  const takeBranches = useMemo(() => {
    return getBranchesForCourse(takeScope.courseId, true)
  }, [getBranchesForCourse, takeScope.courseId])

  const takeSemesters = useMemo(() => {
    const source = attendanceSemesterCatalog.length ? attendanceSemesterCatalog : getSemestersForCourse(takeScope.courseId, true)
    const filtered = source.filter(semester =>
      (!semester.courseId || String(semester.courseId) === String(takeScope.courseId)) &&
      (!takeScope.branchId || !semester.branchId || String(semester.branchId) === String(takeScope.branchId))
    )
    const unique = new Map()
    filtered.forEach(semester => {
      const id = semester.id ?? semester.semesterId
      if (id != null && !unique.has(String(id))) unique.set(String(id), semester)
    })
    return Array.from(unique.values()).sort((a, b) => Number(a.semesterNumber || 0) - Number(b.semesterNumber || 0))
  }, [attendanceSemesterCatalog, getSemestersForCourse, takeScope.courseId, takeScope.branchId])

  // The subject endpoint supports semester assignment filtering. Load that
  // authoritative list once the user has picked a semester, then attach the
  // selected course/branch only when the endpoint omits those joined fields.
  useEffect(() => {
    if (!takeScope.semesterId || !takeScope.branchId) {
      setLoadingSubjects(false)
      return undefined
    }
    let active = true
    const loadSemesterSubjects = async () => {
      setLoadingSubjects(true)
      try {
        const subjects = await facultyMasterApi.getSubjects({ semesterId: takeScope.semesterId, status: 1 })
        if (!active) return
        const mapped = (subjects || []).flatMap(subject => {
          const rawId = String(subject.subjectId ?? subject.subject_id ?? subject.id ?? '').trim()
          if (!/^\d+$/.test(rawId) || Number(rawId) <= 0) return []
          const name = subject.subjectName ?? subject.subject_name ?? subject.name ?? ''
          if (!name) return []
          return [{
            ...subject,
            id: Number(rawId),
            subjectId: Number(rawId),
            subjectName: name,
            name,
            subjectCode: subject.subjectCode ?? subject.subject_code ?? subject.code ?? '',
            code: subject.subjectCode ?? subject.subject_code ?? subject.code ?? '',
            courseId: subject.courseId ?? subject.course_id ?? takeScope.courseId,
            branchId: subject.branchId ?? subject.branch_id ?? takeScope.branchId,
            semesterId: subject.semesterId ?? subject.semester_id ?? takeScope.semesterId,
          }]
        })
        setAllSubjects(current => {
          const byId = new Map(current.map(subject => [String(getSubjectId(subject)), subject]))
          mapped.forEach(subject => byId.set(String(subject.id), { ...byId.get(String(subject.id)), ...subject }))
          return Array.from(byId.values())
        })
      } catch (error) {
        console.warn('Unable to load subjects for the selected semester:', error)
      } finally {
        if (active) setLoadingSubjects(false)
      }
    }
    loadSemesterSubjects()
    return () => { active = false }
  }, [takeScope.semesterId, takeScope.branchId, takeScope.courseId])

  const selectedTakeCourse = useMemo(
    () => activeCourses.find(course => String(course.id) === String(takeScope.courseId)),
    [activeCourses, takeScope.courseId],
  )
  const selectedTakeBranch = useMemo(
    () => takeBranches.find(branch => String(branch.id) === String(takeScope.branchId)),
    [takeBranches, takeScope.branchId],
  )
  const takeCourseCode = selectedTakeCourse?.courseCode ?? selectedTakeCourse?.code ?? selectedTakeCourse?.shortName ?? ''
  const takeBranchCode = selectedTakeBranch?.branchCode ?? selectedTakeBranch?.code ?? selectedTakeBranch?.shortName ?? ''

  const normalizeKey = (val) => String(val || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')

  const normalizeBranchKey = (name = '') => {
    const s = String(name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    if (/mech|mechanical/i.test(s)) return 'mech'
    if (/cse|computerscience|computer/i.test(s)) return 'cse'
    if (/ece|electronicsandcommunication|electronicscommunication/i.test(s)) return 'ece'
    if (/eee|electricalandelectronics|electricalelectronics/i.test(s)) return 'eee'
    if (/civil/i.test(s)) return 'civil'
    if (/aiml|artificialintelligenceandmachinelearning/i.test(s)) return 'aiml'
    if (/aids|artificialintelligenceanddatascience/i.test(s)) return 'aids'
    if (/it|informationtechnology/i.test(s)) return 'it'
    return s
  }

  // Available subjects filtered strictly by selected Course, Branch, and Semester
  const availableSubjects = useMemo(() => {
    if (!takeScope.branchId && !takeScope.courseId) return allSubjects

    const selectedCourse = activeCourses.find(c => String(c.id) === String(takeScope.courseId))
    const selectedBranch = takeBranches.find(b => String(b.id) === String(takeScope.branchId))
    const selectedSemester = takeSemesters.find(s => String(s.id) === String(takeScope.semesterId))

    const targetCourseKey = normalizeKey(selectedCourse?.name || takeCourseCode)
    const targetBranchKey = normalizeBranchKey(selectedBranch?.name || selectedBranch?.branchName || takeBranchCode)
    const targetSemKey = normalizeKey(selectedSemester?.semesterName || selectedSemester?.name || takeScope.semesterId)
    const targetSemNum = Number(String(selectedSemester?.semesterName || selectedSemester?.name || takeScope.semesterId || '').match(/\d+/)?.[0] || 0)

    // 1. Strictly match subjects belonging to the selected Branch (or All Branches)
    const branchMatched = allSubjects.filter(sub => {
      if (takeScope.branchId) {
        const subBranchKey = normalizeBranchKey(sub.branch || sub.branchName || sub.branch_name || '')
        const subBranchId = sub.branchId ?? sub.branch_id

        const matchesId = subBranchId && String(subBranchId) === String(takeScope.branchId)
        const matchesKey = targetBranchKey && subBranchKey && (subBranchKey === targetBranchKey || subBranchKey === 'all' || subBranchKey === 'allbranches' || subBranchKey === 'common')
        
        if (!matchesId && !matchesKey) {
          return false
        }
      }

      if (takeScope.courseId) {
        const subCourseKey = normalizeKey(sub.course || sub.courseName || sub.course_name || '')
        if (sub.courseId && String(sub.courseId) === String(takeScope.courseId)) {
          // match
        } else if (targetCourseKey && subCourseKey && !subCourseKey.includes(targetCourseKey) && !targetCourseKey.includes(subCourseKey)) {
          return false
        }
      }

      return true
    })

    // 2. Filter by semester if semester is selected
    if (takeScope.semesterId) {
      const semMatched = branchMatched.filter(sub => {
        const subSemNum = Number(String(sub.semester || sub.semesterName || sub.semesterId || '').match(/\d+/)?.[0] || 0)
        const subSemKey = normalizeKey(sub.semester || sub.semesterName || sub.semester_name || '')

        if (sub.semesterId && String(sub.semesterId) === String(takeScope.semesterId)) {
          return true
        }
        if (targetSemNum > 0 && subSemNum > 0) {
          return targetSemNum === subSemNum
        }
        if (targetSemKey && subSemKey) {
          return subSemKey.includes(targetSemKey) || targetSemKey.includes(subSemKey)
        }
        return true
      })

      // Also include matching allocations for this branch and semester
      const allocMatched = []
      facultyAssignments.forEach(alloc => {
        const allocBranchId = alloc.branchId ?? alloc.branch?.branchId ?? alloc.branch?.id
        const allocBranchKey = normalizeBranchKey(alloc.branchName || alloc.branch || '')
        const allocSemId = alloc.semesterId ?? alloc.semester?.semesterId ?? alloc.semester?.id
        const allocSemNum = Number(String(alloc.semesterName || alloc.semester || '').match(/\d+/)?.[0] || 0)

        const matchBranch = (allocBranchId && String(allocBranchId) === String(takeScope.branchId)) ||
          (targetBranchKey && (allocBranchKey === targetBranchKey || allocBranchKey === 'all' || allocBranchKey === 'allbranches'))
        
        const matchSem = !takeScope.semesterId || (allocSemId && String(allocSemId) === String(takeScope.semesterId)) ||
          (targetSemNum > 0 && allocSemNum > 0 && targetSemNum === allocSemNum)

        if (matchBranch && matchSem) {
          const subName = alloc.subjectName ?? alloc.subject?.subjectName ?? alloc.subject?.name ?? alloc.subject
          const subId = alloc.subjectId ?? alloc.subject?.subjectId ?? alloc.subject?.id ?? `ALLOC-${alloc.id}`
          const subCode = alloc.subjectCode ?? alloc.subject?.subjectCode ?? alloc.subject?.code ?? ''
          if (subName && !semMatched.some(m => String(m.id || m.subjectId) === String(subId) || normalizeKey(m.subjectName || m.name) === normalizeKey(subName))) {
            allocMatched.push({
              id: subId,
              subjectId: subId,
              subjectName: subName,
              name: subName,
              subjectCode: subCode,
              code: subCode,
              course: alloc.courseName ?? alloc.course,
              branch: alloc.branchName ?? alloc.branch,
              semester: alloc.semesterName ?? alloc.semester
            })
          }
        }
      })

      const combinedWithSem = [...semMatched, ...allocMatched]
      if (combinedWithSem.length > 0) {
        return combinedWithSem
      }
    }

    // Return only branch-matched subjects (never subjects from other branches)
    return branchMatched
  }, [allSubjects, facultyAssignments, takeScope.courseId, takeScope.branchId, takeScope.semesterId, activeCourses, takeBranches, takeSemesters, takeCourseCode, takeBranchCode])

  useEffect(() => {
    if (!takeScope.subjectId || loadingSubjects) return
    const subjectStillAvailable = availableSubjects.some(subject =>
      String(getSubjectId(subject) ?? '') === String(takeScope.subjectId)
    )
    if (!subjectStillAvailable) {
      setTakeScope(current => ({ ...current, subjectId: '', subject: '', subjectCode: '' }))
    }
  }, [availableSubjects, loadingSubjects, takeScope.subjectId])

  const branchFaculty = useMemo(() => {
    if (!takeScope.branchId) return activeFaculty
    const selectedBranchName = String(selectedTakeBranch?.name || selectedTakeBranch?.branchName || '').trim().toLowerCase()
    const targetBranchKey = normalizeKey(selectedTakeBranch?.name || selectedTakeBranch?.branchName || takeBranchCode)

    const matched = activeFaculty.filter(member => {
      const memBranchKey = normalizeKey(member.branchCode || member.branch || member.branchName || member.departmentName || member.department || '')
      if (member.branchId && String(member.branchId) === String(takeScope.branchId)) return true
      if (targetBranchKey && (memBranchKey === targetBranchKey || memBranchKey.includes(targetBranchKey) || targetBranchKey.includes(memBranchKey))) return true

      const isAllocated = facultyAssignments.some(assignment => {
        const assignmentFacultyId = assignment.facultyId ?? assignment.employeeProfileId ?? assignment.faculty?.facultyId ?? assignment.faculty?.id
        const assignmentBranchId = assignment.branchId ?? assignment.branch?.branchId ?? assignment.branch?.id
        const assignmentBranchName = String(assignment.branchName ?? assignment.branch ?? '').trim().toLowerCase()
        return String(assignmentFacultyId) === String(member.id || member.facultyId) &&
          (String(assignmentBranchId) === String(takeScope.branchId) || (selectedBranchName && assignmentBranchName === selectedBranchName))
      })
      return isAllocated
    })

    return matched.length > 0 ? matched : activeFaculty
  }, [activeFaculty, facultyAssignments, selectedTakeBranch, takeScope.branchId, takeBranchCode])

  const filterBranches = useMemo(() => getBranchesForCourse(filterCourseId, true), [getBranchesForCourse, filterCourseId])

  const takeSections = useMemo(() => {
    return getSectionsForScope({
      academicYearId: takeScope.academicYearId,
      courseId: takeScope.courseId,
      branchId: takeScope.branchId,
      semesterId: takeScope.semesterId,
    }, true)
  }, [getSectionsForScope, takeScope])

  // Load students to mark attendance
  const handleFetchStudentsForMarking = useCallback(async (customScope) => {
    const scope = customScope || takeScope
    if (!scope.courseId || !scope.branchId || !scope.semesterId) {
      if (!customScope) notify('Please select Course, Branch, and Semester first.', 'warning')
      return
    }

    try {
      setLoadingStudents(true)
      const selectedBranch = takeBranches.find(b => String(b.id) === String(scope.branchId))
      const selectedSemester = takeSemesters.find(s => String(s.id) === String(scope.semesterId))
      const selectedSection = takeSections.find(sec => String(sec.id) === String(scope.sectionId))

      const list = await attendanceService.getStudentsForAttendance({
        branchId: scope.branchId,
        branchCode: takeBranchCode,
        semesterId: scope.semesterId,
        sectionId: scope.sectionId,
        branch: selectedBranch?.name || selectedBranch?.branchName,
        semester: selectedSemester?.semesterName || selectedSemester?.name,
        section: selectedSection?.name || selectedSection?.sectionName || selectedSection?.sectionCode,
      })

      setMarkingStudents(list || [])
      if ((!list || list.length === 0) && !customScope) {
        notify('No students found for this section / academic scope. Please ensure students are enrolled or assigned in Section Management.', 'warning')
      }
    } catch (err) {
      if (!customScope) notify(err.message || 'Failed to load students for attendance.', 'error')
    } finally {
      setLoadingStudents(false)
    }
  }, [
    takeScope,
    takeBranches,
    takeSemesters,
    takeSections,
    takeBranchCode,
  ])

  // Auto-fetch student roster whenever Take Attendance modal is open and scope changes
  useEffect(() => {
    if (!takeModalOpen) return
    if (!takeScope.courseId || !takeScope.branchId || !takeScope.semesterId) {
      setMarkingStudents([])
      return
    }
    handleFetchStudentsForMarking(takeScope)
  }, [
    takeModalOpen,
    takeScope.academicYearId,
    takeScope.courseId,
    takeScope.branchId,
    takeScope.semesterId,
    takeScope.sectionId,
  ])

  // Quick action: Mark All Present
  const handleMarkAll = (status) => {
    setMarkingStudents(prev => prev.map(s => ({ ...s, status })))
  }

  // Toggle individual student status
  const handleStudentStatusChange = (studentId, status) => {
    setMarkingStudents(prev => prev.map(s => (s.studentId === studentId ? { ...s, status } : s)))
  }

  // Save session
  const handleSaveAttendance = async () => {
    if (!takeScope.academicYearId || !takeScope.courseId || !takeScope.branchId || !takeScope.semesterId || !takeScope.sectionId || !takeScope.subject.trim() || !takeScope.faculty.trim()) {
      if (!takeScope.sectionId) {
        notify('Select a section before saving attendance.', 'warning')
        return
      }
      notify('Select the complete class scope, subject, and faculty before saving attendance.', 'warning')
      return
    }
    if (!markingStudents.length) {
      notify('No students to record attendance for.', 'warning')
      return
    }

    try {
      setSavingSession(true)
      const selectedCourse = activeCourses.find(c => String(c.id) === String(takeScope.courseId))
      const selectedBranch = takeBranches.find(b => String(b.id) === String(takeScope.branchId))
      const selectedSemester = takeSemesters.find(s => String(s.id) === String(takeScope.semesterId))
      const selectedSection = takeSections.find(sec => String(sec.id) === String(takeScope.sectionId))
      const selectedYear = currentAcademicYear

      let finalSubjectId = Number(takeScope.subjectId)
      if (!Number.isFinite(finalSubjectId) || finalSubjectId <= 0) {
        const resolvedSubject = availableSubjects.find(s => String(getSubjectId(s) ?? '') === String(takeScope.subjectId) || String(s.subjectName || s.name).trim().toLowerCase() === takeScope.subject.trim().toLowerCase())
        const subId = Number(resolvedSubject?.subjectId ?? resolvedSubject?.id)
        if (Number.isFinite(subId) && subId > 0) {
          finalSubjectId = subId
        } else {
          const matchingAlloc = facultyAssignments.find(item => {
            const allocSubName = item.subjectName ?? item.subject?.subjectName ?? item.subject?.name ?? item.subject
            return String(allocSubName || '').trim().toLowerCase() === String(takeScope.subject).trim().toLowerCase()
          })
          const allocId = Number(matchingAlloc?.subjectId ?? matchingAlloc?.subject?.subjectId ?? matchingAlloc?.subject?.id)
          if (Number.isFinite(allocId) && allocId > 0) {
            finalSubjectId = allocId
          } else {
            notify('This subject is not linked to an active subject record. Select a subject assigned to the chosen semester.', 'warning')
            return
          }
        }
      }

      if (!Number.isSafeInteger(finalSubjectId) || finalSubjectId <= 0) {
        notify('Select an active subject assigned to the chosen semester.', 'warning')
        return
      }

      await attendanceService.recordAttendance({
        academicYearId: Number(takeScope.academicYearId),
        courseId: Number(takeScope.courseId),
        branchId: Number(takeScope.branchId),
        semesterId: Number(takeScope.semesterId),
        sectionId: Number(takeScope.sectionId),
        subjectId: finalSubjectId,
        academicYear: selectedYear?.name || '',
        course: selectedCourse?.name || '',
        courseCode: selectedCourse?.courseCode ?? selectedCourse?.code ?? selectedCourse?.shortName ?? '',
        branch: selectedBranch?.name || selectedBranch?.branchName || '',
        branchCode: selectedBranch?.branchCode ?? selectedBranch?.code ?? selectedBranch?.shortName ?? '',
        semester: selectedSemester?.semesterName || selectedSemester?.name || '',
        section: selectedSection?.name || (takeScope.sectionId ? 'Section A' : 'All Sections'),
        date: takeScope.date,
        subject: takeScope.subject,
        subjectCode: takeScope.subjectCode || '',
        faculty: takeScope.faculty,
        facultyId: Number(takeScope.facultyId),
        records: markingStudents,
      })

      notify('Attendance recorded and saved successfully!')
      loadSessions()
      setActiveTab('register')
      setTakeModalOpen(false)
    } catch (err) {
      notify(err.message || 'Failed to save attendance.', 'error')
    } finally {
      setSavingSession(false)
    }
  }

  // Filtered Sessions for Register Tab
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchQuery = !filterQuery || `${s.subject} ${s.course} ${s.branch} ${s.section} ${s.faculty}`.toLowerCase().includes(filterQuery.toLowerCase())
      const matchCourse = !filterCourseId || String(s.courseId) === String(filterCourseId)
      const matchBranch = !filterBranchId || String(s.branchId) === String(filterBranchId)
      const matchSemester = !filterSemesterId || String(s.semesterId) === String(filterSemesterId)
      const matchDate = !filterDate || s.date === filterDate
      return matchQuery && matchCourse && matchBranch && matchSemester && matchDate
    })
  }, [sessions, filterQuery, filterCourseId, filterBranchId, filterSemesterId, filterDate])

  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredSessions.slice(start, start + pageSize)
  }, [filteredSessions, currentPage])

  const hasRegisterFilters = Boolean(filterCourseId || filterBranchId || filterDate)
  const clearRegisterFilters = () => {
    setFilterCourseId('')
    setFilterBranchId('')
    setFilterDate('')
    setCurrentPage(1)
  }

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalSessions = sessions.length
    const totalPresent = sessions.reduce((acc, s) => acc + (s.presentCount || 0), 0)
    const totalHeadcount = sessions.reduce((acc, s) => acc + (s.totalStudents || 0), 0)
    const avgPercentage = totalHeadcount > 0 ? Math.round((totalPresent / totalHeadcount) * 100) : 0

    return {
      totalSessions,
      totalPresent,
      avgPercentage: `${avgPercentage}%`,
      shortageCount: allProfiles.filter(p => Number(p.attendanceRate) < 75).length,
    }
  }, [sessions, allProfiles])

  // Report data is calculated from the sessions already returned by the
  // attendance API; no client-side sample records are introduced.
  const subjectAttendance = useMemo(() => Object.values(sessions.reduce((result, session) => {
    const id = `${session.subject || 'Unassigned'}|${session.courseId || session.course || ''}|${session.semesterId || session.semester || ''}`
    const current = result[id] || { subject: session.subject || 'Unassigned', sessions: 0, present: 0, total: 0 }
    current.sessions += 1; current.present += Number(session.presentCount || 0); current.total += Number(session.totalStudents || 0)
    result[id] = current; return result
  }, {})).map(row => ({ ...row, rate: row.total ? Math.round((row.present / row.total) * 100) : 0 })), [sessions])
  const monthlyAttendance = useMemo(() => Object.values(sessions.reduce((result, session) => {
    const month = String(session.date || '').slice(0, 7) || 'Unspecified'
    const current = result[month] || { month, sessions: 0, present: 0, total: 0 }
    current.sessions += 1; current.present += Number(session.presentCount || 0); current.total += Number(session.totalStudents || 0)
    result[month] = current; return result
  }, {})).map(row => ({ ...row, rate: row.total ? Math.round((row.present / row.total) * 100) : 0 })), [sessions])
  const studentAttendance = useMemo(() => Object.values(sessions.reduce((result, session) => {
    ;(session.records || []).forEach(record => {
      const id = String(record.studentId || record.id || record.rollNumber || '')
      if (!id) return
      const profile = allProfiles.find(item => String(item.studentId || item.id) === id) || {}
      const current = result[id] || { id, name: record.name || profile.fullName || profile.name || 'Student', rollNumber: record.rollNumber || profile.rollNumber || id, course: profile.academic?.course || session.course || '-', branch: profile.academic?.branch || session.branch || '-', present: 0, total: 0 }
      current.total += 1
      if (['Present', 'Late', 'Excused'].includes(record.status)) current.present += 1
      result[id] = current
    })
    return result
  }, {})).map(row => ({ ...row, rate: row.total ? Math.round((row.present / row.total) * 100) : 0 })), [sessions, allProfiles])
  const shortageStudents = useMemo(() => allProfiles.filter(profile => {
    const courseId = profile.academic?.courseId || profile.courseId
    const courseName = String(profile.academic?.course || profile.course || '').trim().toLowerCase()
    const branchId = profile.academic?.branchId || profile.branchId
    const branchName = String(profile.academic?.branch || profile.branch || '').trim().toLowerCase()

    const selectedCourseObj = activeCourses.find(c => String(c.id) === String(filterCourseId))
    const selectedBranchObj = filterBranches.find(b => String(b.id) === String(filterBranchId))

    const courseMatches = !filterCourseId ||
      String(courseId) === String(filterCourseId) ||
      (selectedCourseObj && courseName === String(selectedCourseObj.name || '').trim().toLowerCase())

    const branchMatches = !filterBranchId ||
      String(branchId) === String(filterBranchId) ||
      (selectedBranchObj && branchName === String(selectedBranchObj.name || selectedBranchObj.branchName || '').trim().toLowerCase())

    const name = String(profile.personal?.fullName || profile.name || '').toLowerCase()
    const rollNumber = String(profile.academic?.rollNumber || profile.rollNumber || '').toLowerCase()
    const queryMatches = !filterQuery.trim() ||
      name.includes(filterQuery.trim().toLowerCase()) ||
      rollNumber.includes(filterQuery.trim().toLowerCase())

    const matchingReport = studentAttendance.find(row => String(row.id) === String(profile.studentId || profile.id))
    const rate = matchingReport?.rate ?? Number(profile.attendanceRate)
    return courseMatches && branchMatches && queryMatches && Number.isFinite(rate) && rate < 75
  }).map(profile => {
    const report = studentAttendance.find(row => String(row.id) === String(profile.studentId || profile.id))
    return { ...profile, attendanceRate: report?.rate ?? Number(profile.attendanceRate), attendanceReport: report }
  }), [allProfiles, filterCourseId, filterBranchId, filterBranches, filterQuery, activeCourses, studentAttendance])

  return (
    <DashboardLayout>
      <div className="attendance-page">
        <PageHeader
          title="Student Attendance"
          subtitle="Manage student attendance registers, daily marking, and shortage monitoring."
          breadcrumb={[
            { label: 'Student Management', link: '/student-management/profiles' },
            { label: 'Student Attendance' },
          ]}
          compactSummary={[
            { label: 'Recorded Sessions', value: summaryMetrics.totalSessions },
            { label: 'Avg Attendance Rate', value: summaryMetrics.avgPercentage, tone: 'active' },
            { label: 'Total Student Entries', value: summaryMetrics.totalPresent },
            { label: 'Shortage Risk Students', value: summaryMetrics.shortageCount, tone: summaryMetrics.shortageCount > 0 ? 'inactive' : 'default' },
          ]}
        />



            {/* Filter Panel */}
            <div className="erp-card erp-filter-card">
              <div className="attendance-filter-toolbar">
                <label className="course-search">
                  <FiSearch />
                  <input
                    type="text"
                    placeholder="Search by subject, faculty or student..."
                    value={filterQuery}
                    onChange={(e) => {
                      setFilterQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    aria-label="Search attendance"
                  />
                </label>
                <button
                  type="button"
                  className={`attendance-filter-toggle${hasRegisterFilters ? ' attendance-filter-toggle--active' : ''}`}
                  aria-expanded={showRegisterFilters}
                  aria-controls="attendance-register-filters"
                  onClick={() => setShowRegisterFilters(value => !value)}
                >
                  <FiFilter aria-hidden="true" /> Filters
                  {hasRegisterFilters && <span className="attendance-filter-count" aria-label="Filters applied">{[filterCourseId, filterBranchId, filterDate].filter(Boolean).length}</span>}
                  {showRegisterFilters ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}
                </button>
                <div className="attendance-register-actions">
                  <ExportMenu
                    rows={filteredSessions.map(s => ({
                      ...s,
                      attendanceRate: `${Math.round(((s.presentCount || 0) / (s.totalStudents || 1)) * 100)}%`,
                    }))}
                    columns={ATTENDANCE_COLUMNS}
                    title="Attendance Register"
                    filename="attendance-register"
                  />
                  <button
                    type="button"
                    className="erp-btn erp-btn--primary"
                    onClick={() => setTakeModalOpen(true)}
                  >
                    <FiPlus /> Record Attendance
                  </button>
                </div>
              </div>
              {showRegisterFilters && <div id="attendance-register-filters" className="attendance-register-filters">
                <div className="erp-form-group">
                  <label>Course</label>
                  <select className="erp-select" value={filterCourseId} onChange={(e) => {
                    setFilterCourseId(e.target.value)
                    setFilterBranchId('')
                    setCurrentPage(1)
                  }}>
                    <option value="">All Courses</option>
                    {activeCourses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="erp-form-group">
                  <label>Branch</label>
                  <select className="erp-select" value={filterBranchId} disabled={!filterCourseId} onChange={(e) => {
                    setFilterBranchId(e.target.value)
                    setCurrentPage(1)
                  }}>
                    <option value="">All Branches</option>
                    {filterBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                </div>
                <div className="erp-form-group">
                  <label>Date</label>
                  <input type="date" className="erp-input" value={filterDate} onChange={(e) => {
                    setFilterDate(e.target.value)
                    setCurrentPage(1)
                  }} />
                </div>
                {hasRegisterFilters && <button type="button" className="attendance-clear-filters" onClick={clearRegisterFilters}>Clear Filters</button>}
              </div>}
            </div>

        {/* Tab Navigation */}
        <nav className="attendance-tabs">
          <button
            type="button"
            className={`attendance-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            <FiCalendar /> Attendance Dashboard
          </button>
          <button
            type="button"
            className={`attendance-tab ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <FiBarChart2 /> Reports
          </button>
          <button
            type="button"
            className={`attendance-tab ${activeTab === 'shortage' ? 'active' : ''}`}
            onClick={() => setActiveTab('shortage')}
          >
            <FiAlertTriangle /> Shortage List (&lt;75%)
          </button>
        </nav>

        {/* TAB 1: Attendance Register */}
        {activeTab === 'register' && (
          <section className="attendance-content">



            {/* Attendance Table */}
            <div className="erp-card erp-table-card">
              {loading ? (
                <div className="erp-loading-state"><FiClock /> Loading attendance sessions...</div>
              ) : paginatedSessions.length === 0 ? (
                <EmptyState
                  icon={FiCalendar}
                  title="No Attendance Sessions Found"
                  subtitle="Start by recording daily class attendance using the attendance workspace."
                  actionLabel="Record Attendance"
                  onAction={() => setTakeModalOpen(true)}
                />
              ) : (
                <>
                  <div className="erp-table-responsive">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Subject</th>
                          <th>Academic Scope</th>
                          <th>Section</th>
                          <th>Strength</th>
                          <th>Present / Absent</th>
                          <th>Attendance Rate</th>
                          <th>Faculty</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedSessions.map((session) => {
                          const rate = session.totalStudents > 0
                            ? Math.round((session.presentCount / session.totalStudents) * 100)
                            : 0

                          return (
                            <tr key={session.sessionId}>
                              <td><strong>{session.date}</strong></td>
                              <td><strong>{session.subject}</strong></td>
                              <td>{session.course} · {session.branch} · {session.semester}</td>
                              <td><span className="erp-badge erp-badge--neutral">{session.section}</span></td>
                              <td>{session.totalStudents}</td>
                              <td>
                                <span className="text-success font-semibold">{session.presentCount} P</span> /{' '}
                                <span className="text-danger font-semibold">{session.absentCount} A</span>
                              </td>
                              <td>
                                <StatusBadge
                                  status={rate >= 75 ? 'Active' : 'Warning'}
                                  label={`${rate}%`}
                                />
                              </td>
                              <td>{session.faculty}</td>
                              <td>
                                <button
                                  type="button"
                                  className="erp-btn erp-btn--icon"
                                  title="View Session Details"
                                  onClick={async () => {
                                    setSelectedSession({ ...session, records: [], detailsLoading: true })
                                    try {
                                      const records = await attendanceService.getSessionStudents(session.id || session.sessionId)
                                      setSelectedSession(current => current?.id === session.id
                                        ? { ...current, records, totalStudents: records.length, detailsLoading: false }
                                        : current)
                                    } catch (error) {
                                      setSelectedSession(current => current?.id === session.id ? { ...current, detailsLoading: false } : current)
                                      notify(error.message || 'Unable to load students for this attendance session.', 'error')
                                    }
                                  }}
                                >
                                  <FiEye />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <TablePagination
                    currentPage={currentPage}
                    totalItems={filteredSessions.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                  />
                </>
              )}
            </div>
          </section>
        )}

        {activeTab === 'reports' && (
          <section className={`attendance-content attendance-reports report-view-${reportView}`}>
            <div className="attendance-report-nav" role="tablist" aria-label="Attendance report sections">
              <button type="button" role="tab" aria-selected={reportView === 'subject'} className={reportView === 'subject' ? 'active' : ''} onClick={() => setReportView('subject')}>Subject-wise</button>
              <button type="button" role="tab" aria-selected={reportView === 'monthly'} className={reportView === 'monthly' ? 'active' : ''} onClick={() => setReportView('monthly')}>Monthly</button>
              <button type="button" role="tab" aria-selected={reportView === 'student'} className={reportView === 'student' ? 'active' : ''} onClick={() => setReportView('student')}>Student Report</button>
            </div>
            <div className="attendance-report-context">
              <div><span>Attendance reports</span><strong>Review recorded attendance by subject, month, or student.</strong></div>
              <small>Required attendance <b>75%</b></small>
            </div>
            <div className={`attendance-report-grid report-view-${reportView}`}>
              <article className="erp-card"><div className="erp-card-header"><div><h2 className="erp-card-title">Subject-wise Attendance</h2><p className="erp-card-subtitle">Attendance performance for every recorded subject.</p></div></div><ReportTable rows={subjectAttendance} empty="No subject sessions recorded yet." columns={[['Subject', row => row.subject], ['Sessions', row => row.sessions], ['Present / Total', row => `${row.present} / ${row.total}`], ['Attendance', row => <StatusBadge status={row.rate >= 75 ? 'Active' : 'Warning'} label={`${row.rate}%`} />]]} /></article>
              <article className="erp-card"><div className="erp-card-header"><div><h2 className="erp-card-title">Monthly Attendance</h2><p className="erp-card-subtitle">Monthly class attendance summary.</p></div></div><ReportTable rows={monthlyAttendance} empty="No monthly attendance data available." columns={[['Month', row => row.month], ['Sessions', row => row.sessions], ['Present / Total', row => `${row.present} / ${row.total}`], ['Attendance', row => <StatusBadge status={row.rate >= 75 ? 'Active' : 'Warning'} label={`${row.rate}%`} />]]} /></article>
            </div>
            <article className="erp-card"><div className="erp-card-header"><div><h2 className="erp-card-title">Student Attendance Report</h2><p className="erp-card-subtitle">Student-wise attendance calculated from all recorded subject sessions.</p></div><ExportMenu rows={studentAttendance} columns={[{ key: 'rollNumber', label: 'Roll Number' }, { key: 'name', label: 'Student' }, { key: 'course', label: 'Course' }, { key: 'branch', label: 'Branch' }, { key: 'present', label: 'Present' }, { key: 'total', label: 'Total Classes' }, { key: 'rate', label: 'Attendance %' }]} title="Student Attendance Report" filename="student-attendance-report" /></div><ReportTable rows={studentAttendance} empty="No student attendance records available." columns={[['Roll Number', row => row.rollNumber], ['Student', row => row.name], ['Course / Branch', row => `${row.course} · ${row.branch}`], ['Present / Total', row => `${row.present} / ${row.total}`], ['Attendance', row => <StatusBadge status={row.rate >= 75 ? 'Active' : row.rate >= 65 ? 'Warning' : 'Danger'} label={`${row.rate}%`} />], ['Action', row => <button type="button" className="erp-btn erp-btn--icon" title="View Student Report" aria-label="View Student Report" onClick={() => setSelectedStudentReport(row)}><FiEye /></button>]]} /></article>
          </section>
        )}

        {/* Record Attendance popup */}
        {takeModalOpen && (
          <div className="attendance-modal-backdrop" role="presentation" onMouseDown={() => setTakeModalOpen(false)}>
          <section className="attendance-content attendance-modal" role="dialog" aria-modal="true" aria-labelledby="take-attendance-title" onMouseDown={event => event.stopPropagation()}>
            <div className="erp-card">
              <div className="erp-card-header">
                <div>
                  <h2 className="erp-card-title" id="take-attendance-title">Record Student Attendance</h2>
                  <p className="erp-card-subtitle">Select academic scope, load student roster, and mark session attendance.</p>
                </div>
                <button type="button" className="attendance-modal-close" onClick={() => setTakeModalOpen(false)} aria-label="Close attendance recording">×</button>
              </div>

              {/* Scope Selection Form */}
              <div className="erp-form-grid">
                <div className="erp-form-group">
                  <label>Academic Year <span className="attendance-required-mark">*</span></label>
                  <input
                    type="text"
                    className="erp-input attendance-academic-year"
                    value={currentAcademicYear?.name || currentAcademicYear?.academicYearName || ''}
                    placeholder="No active academic year"
                    readOnly
                  />
                </div>

                <div className="erp-form-group">
                  <label>Course <span className="attendance-required-mark">*</span></label>
                  <select
                    className="erp-select"
                    value={takeScope.courseId}
                    onChange={(e) => setTakeScope(prev => ({ ...prev, courseId: e.target.value, branchId: '', semesterId: '', sectionId: '', subjectId: '', subject: '', subjectCode: '', facultyId: '', faculty: '' }))}
                  >
                    <option value="">Select Course</option>
                    {activeCourses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label>Course Code</label>
                  <input
                    type="text"
                    className="erp-input attendance-auto-code"
                    value={takeCourseCode}
                    placeholder="Auto-filled after course selection"
                    readOnly
                  />
                </div>

                <div className="erp-form-group">
                  <label>Branch <span className="attendance-required-mark">*</span></label>
                  <select
                    className="erp-select"
                    value={takeScope.branchId}
                    disabled={!takeScope.courseId}
                    onChange={(e) => setTakeScope(prev => ({ ...prev, branchId: e.target.value, semesterId: '', sectionId: '', subjectId: '', subject: '', subjectCode: '', facultyId: '', faculty: '' }))}
                  >
                    <option value="">Select Branch</option>
                    {takeBranches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label>Branch Code</label>
                  <input
                    type="text"
                    className="erp-input attendance-auto-code"
                    value={takeBranchCode}
                    placeholder="Auto-filled after branch selection"
                    readOnly
                  />
                </div>

                <div className="erp-form-group">
                  <label>Semester <span className="attendance-required-mark">*</span></label>
                  <select
                    className="erp-select"
                    value={takeScope.semesterId}
                    disabled={!takeScope.courseId}
                    onChange={(e) => setTakeScope(prev => ({ ...prev, semesterId: e.target.value, sectionId: '', subjectId: '', subject: '', subjectCode: '' }))}
                  >
                    <option value="">Select Semester</option>
                    {takeSemesters.map(s => (
                      <option key={s.id} value={s.id}>{s.semesterName}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label>Section</label>
                  <select
                    className="erp-select"
                    value={takeScope.sectionId}
                    onChange={(e) => setTakeScope(prev => ({ ...prev, sectionId: e.target.value }))}
                  >
                    <option value="">All Sections / Unspecified</option>
                    {takeSections.map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label>Session Date <span className="attendance-required-mark">*</span></label>
                  <input
                    type="date"
                    className="erp-input"
                    value={takeScope.date}
                    onChange={(e) => setTakeScope(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>

                <div className="erp-form-group">
                  <label>Subject / Course Module <span className="attendance-required-mark">*</span></label>
                  <select
                    className="erp-select"
                    value={takeScope.subjectId || ''}
                    disabled={loadingSubjects || !takeScope.branchId}
                    onChange={(e) => {
                      const selectedVal = e.target.value
                      const selectedSub = availableSubjects.find(sub => String(getSubjectId(sub) ?? '') === String(selectedVal))
                      if (selectedSub) {
                        const subName = selectedSub.subjectName || selectedSub.name || ''
                        const subCode = selectedSub.subjectCode || selectedSub.code || ''
                        const subId = String(getSubjectId(selectedSub) ?? '')

                        setTakeScope(prev => {
                          const next = {
                            ...prev,
                            subjectId: subId,
                            subject: subName,
                            subjectCode: subCode,
                          }

                          // Auto-select matching faculty if assigned to this subject
                          const matchingAlloc = facultyAssignments.find(item => {
                            const allocSubId = item.subjectId ?? item.subject?.subjectId ?? item.subject?.id
                            const allocSubName = item.subjectName ?? item.subject?.subjectName ?? item.subject?.name
                            return (allocSubId && String(allocSubId) === subId) ||
                              (allocSubName && String(allocSubName).trim().toLowerCase() === subName.trim().toLowerCase())
                          })
                          if (matchingAlloc) {
                            const assignedFacId = matchingAlloc.facultyId ?? matchingAlloc.employeeProfileId ?? matchingAlloc.faculty?.facultyId ?? matchingAlloc.faculty?.id
                            const matchedFaculty = activeFaculty.find(f => String(f.id || f.facultyId) === String(assignedFacId))
                            if (matchedFaculty) {
                              next.facultyId = String(matchedFaculty.id || matchedFaculty.facultyId)
                              next.faculty = matchedFaculty.fullName
                            }
                          }
                          return next
                        })
                      } else {
                        setTakeScope(prev => ({ ...prev, subjectId: '', subject: '', subjectCode: '' }))
                      }
                    }}
                  >
                    <option value="">
                      {loadingSubjects
                        ? 'Loading subjects...'
                        : !takeScope.branchId
                        ? 'Select Branch first'
                        : availableSubjects.length === 0
                        ? 'No subjects found for this branch'
                        : 'Select Subject'}
                    </option>
                    {availableSubjects.map((sub) => {
                      const name = sub.subjectName || sub.subject_name || sub.name || sub.title || sub.subject || 'Subject'
                      const code = sub.subjectCode || sub.subject_code || sub.code || ''
                      const val = String(getSubjectId(sub) ?? '')
                      return (
                        <option key={val} value={val}>
                          {name} {code ? `(${code})` : ''}
                        </option>
                      )
                    })}
                  </select>
                  {!loadingSubjects && takeScope.branchId && availableSubjects.length === 0 && (
                    <small className="attendance-field-help">No subjects configured in Subject Management for this branch.</small>
                  )}
                </div>

                <div className="erp-form-group">
                  <label>Subject Code</label>
                  <input
                    type="text"
                    className="erp-input attendance-auto-code"
                    value={takeScope.subjectCode}
                    placeholder="Auto-filled after subject selection"
                    readOnly
                  />
                </div>

                <div className="erp-form-group">
                  <label>Faculty In-Charge <span className="attendance-required-mark">*</span></label>
                  <select
                    className="erp-select"
                    value={takeScope.facultyId || ''}
                    disabled={loadingFaculty || !takeScope.branchId}
                    onChange={(e) => {
                      const selectedFaculty = activeFaculty.find(member => String(member.id || member.facultyId) === String(e.target.value))
                      setTakeScope(prev => ({ ...prev, facultyId: e.target.value, faculty: selectedFaculty?.fullName || '' }))
                    }}
                  >
                    <option value="">{loadingFaculty ? 'Loading active faculty...' : !takeScope.branchId ? 'Select Branch first' : 'Select Faculty In-Charge'}</option>
                    {branchFaculty.map(member => (
                      <option key={member.id || member.facultyId} value={member.id || member.facultyId}>
                        {[member.fullName, member.employeeId || member.facultyCode, member.designation].filter(Boolean).join(' · ')}
                      </option>
                    ))}
                  </select>
                  {!loadingFaculty && takeScope.branchId && branchFaculty.length === 0 && <small className="attendance-field-help">No active faculty assignment is available for the selected branch.</small>}
                </div>
              </div>

              <div className="attendance-fetch-action">
                <button
                  type="button"
                  className="erp-btn erp-btn--primary"
                  disabled={loadingStudents || !takeScope.courseId || !takeScope.branchId || !takeScope.semesterId}
                  onClick={() => handleFetchStudentsForMarking()}
                >
                  {loadingStudents ? 'Fetching Roster...' : 'Refresh Student Roster'}
                </button>
              </div>

              {/* Roster Marking Grid / Loading / Empty State */}
              {loadingStudents && (
                <div className="attendance-marking-section" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <p style={{ color: '#4B3F72', fontWeight: 600 }}>Loading Student Roster...</p>
                </div>
              )}

              {!loadingStudents && takeScope.courseId && takeScope.branchId && takeScope.semesterId && markingStudents.length === 0 && (
                <div className="attendance-marking-section" style={{ textAlign: 'center', padding: '1.5rem 1rem', background: '#FAF9FE', borderRadius: '8px', margin: '1rem 0' }}>
                  <p style={{ color: '#666', marginBottom: '0.5rem' }}>No students found for the selected section/scope.</p>
                  <small style={{ color: '#888' }}>You can assign students in Section Management or select another section.</small>
                </div>
              )}

              {!loadingStudents && markingStudents.length > 0 && (
                <div className="attendance-marking-section">
                  <div className="attendance-marking-header">
                    <h3>Student Roster ({markingStudents.length} Students)</h3>
                    <div className="attendance-bulk-buttons">
                      <button
                        type="button"
                        className="erp-btn erp-btn--secondary"
                        onClick={() => handleMarkAll('Present')}
                      >
                        <FiUserCheck /> Mark All Present
                      </button>
                      <button
                        type="button"
                        className="erp-btn erp-btn--secondary"
                        onClick={() => handleMarkAll('Absent')}
                      >
                        <FiUserX /> Mark All Absent
                      </button>
                    </div>
                  </div>

                  <div className="erp-table-responsive">
                    <table className="erp-table attendance-marking-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Roll Number</th>
                          <th>Student Name</th>
                          <th>Status Marking</th>
                        </tr>
                      </thead>
                      <tbody>
                        {markingStudents.map((s, idx) => (
                          <tr key={s.studentId || idx}>
                            <td>{idx + 1}</td>
                            <td><strong>{s.rollNumber || s.id}</strong></td>
                            <td>{s.name}</td>
                            <td>
                              <div className="attendance-status-radios">
                                {['Present', 'Absent', 'Late', 'Excused'].map((statusOption) => (
                                  <label
                                    key={statusOption}
                                    className={`attendance-radio-chip ${s.status === statusOption ? `active active--${statusOption.toLowerCase()}` : ''}`}
                                  >
                                    <input
                                      type="radio"
                                      name={`status-${s.studentId}`}
                                      value={statusOption}
                                      checked={s.status === statusOption}
                                      onChange={() => handleStudentStatusChange(s.studentId, statusOption)}
                                    />
                                    {statusOption}
                                  </label>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="attendance-save-footer">
                    <button
                      type="button"
                      className="erp-btn erp-btn--primary erp-btn--lg"
                      disabled={savingSession}
                      onClick={handleSaveAttendance}
                    >
                      <FiSave /> {savingSession ? 'Saving Session...' : 'Save & Publish Attendance'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
          </div>
        )}

        {/* TAB 3: Shortage List */}
        {activeTab === 'shortage' && (
          <section className="attendance-content">
            <div className="erp-card">
              <div className="erp-card-header">
                <div>
                  <h2 className="erp-card-title">Attendance Shortage List (&lt; 75% Threshold)</h2>
                  <p className="erp-card-subtitle">{shortageStudents.length} students require attendance intervention. Filter using the toolbar above to notify an affected student.</p>
                </div>
                <div className="attendance-shortage-actions">
                  <ExportMenu
                    rows={shortageStudents.map(p => ({
                      studentId: p.studentId || p.id,
                      name: p.personal?.fullName || p.name,
                      rollNumber: p.academic?.rollNumber || p.rollNumber,
                      course: p.academic?.course || 'B.Tech',
                      branch: p.academic?.branch || 'CSE',
                      semester: p.academic?.semester || 'Semester 1',
                      attendancePercentage: `${p.attendanceRate || 68}%`,
                      status: 'Shortage (Exam Ineligible)',
                    }))}
                    columns={[
                      { key: 'rollNumber', label: 'Roll No' },
                      { key: 'name', label: 'Student Name' },
                      { key: 'course', label: 'Course' },
                      { key: 'branch', label: 'Branch' },
                      { key: 'semester', label: 'Semester' },
                      { key: 'attendancePercentage', label: 'Attendance' },
                      { key: 'status', label: 'Eligibility Status' },
                    ]}
                    title="Attendance Shortage"
                    filename="attendance-shortage-list"
                  />
                </div>
              </div>

              <div className="erp-table-responsive">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Roll Number</th>
                      <th>Student Name</th>
                      <th>Course / Branch</th>
                      <th>Semester</th>
                      <th>Recorded Attendance</th>
                      <th>Deficit</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shortageStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6">
                          <FiCheckCircle className="text-success text-2xl mb-2" />
                          <p>All active students meet the 75% minimum attendance requirement.</p>
                        </td>
                      </tr>
                    ) : (
                      shortageStudents.map((p) => {
                        const rate = p.attendanceRate || 68
                        return (
                          <tr key={p.studentId || p.id}>
                            <td><strong>{p.academic?.rollNumber || p.rollNumber || p.id}</strong></td>
                            <td>{p.personal?.fullName || p.name}</td>
                            <td>{p.academic?.course || 'B.Tech'} · {p.academic?.branch || 'CSE'}</td>
                            <td>{p.academic?.semester || 'Semester 1'}</td>
                            <td><strong className="text-danger">{rate}%</strong></td>
                            <td>{75 - rate}% required</td>
                            <td><div className="attendance-shortage-status"><StatusBadge status={rate < 65 ? 'Danger' : 'Warning'} label={rate < 65 ? 'Critical' : 'Shortage'} /><button type="button" className="erp-btn erp-btn--icon" title="View Details" aria-label="View Details" onClick={() => setSelectedStudentReport(p.attendanceReport || { id: p.studentId || p.id, name: p.personal?.fullName || p.name, rollNumber: p.academic?.rollNumber || p.rollNumber, course: p.academic?.course || '-', branch: p.academic?.branch || '-', rate, present: 0, total: 0 })}><FiEye /></button><button type="button" className="erp-btn erp-btn--secondary" onClick={() => notify(`Attendance shortage notification prepared for ${p.personal?.fullName || p.name || 'student'}.`, 'info')}><FiBell /> Notify</button></div></td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* View Details Dialog */}
        {selectedSession && (
          <ViewDialog
            exportFilename={`attendance_${selectedSession.id || selectedSession.subject}_${selectedSession.date}`}
            title={`Session Details: ${selectedSession.subject}`}
            subtitle={`${selectedSession.course || 'B.Tech'} · ${selectedSession.branch || 'CSE'} · Semester ${selectedSession.semester || '1'}`}
            icon={FiCalendar}
            onClose={() => setSelectedSession(null)}
          >
            <div className="attendance-session-detail" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="view-modal-banner">
                <div className="view-modal-avatar">
                  <FiCalendar />
                </div>
                <div className="view-modal-header-info">
                  <div className="view-modal-badges">
                    <span className="view-modal-badge">{selectedSession.date}</span>
                    {selectedSession.section && (
                      <span className="view-modal-badge">
                        {String(selectedSession.section).toLowerCase().startsWith('section')
                          ? selectedSession.section
                          : `Section ${selectedSession.section}`}
                      </span>
                    )}
                    <span className="view-modal-badge-status active">{selectedSession.status || 'Marked'}</span>
                  </div>
                  <h1 className="view-modal-title">{selectedSession.subject}</h1>
                  <p className="view-modal-subtitle">Faculty: {selectedSession.faculty} · Total Students: {selectedSession.detailsLoading ? 'Loading…' : selectedSession.records?.length ?? selectedSession.totalStudents}</p>
                </div>
              </div>

              <div className="view-modal-grid">
                <InfoCard
                  icon={FiCalendar}
                  title="Session Information"
                  items={[
                    { label: 'Date', value: selectedSession.date },
                    { label: 'Subject', value: selectedSession.subject },
                    { label: 'Faculty', value: selectedSession.faculty },
                    { label: 'Academic Year', value: selectedSession.academicYear },
                  ]}
                />
                <InfoCard
                  icon={FiLayers}
                  title="Academic Scope"
                  items={[
                    { label: 'Course', value: selectedSession.course },
                    { label: 'Branch', value: selectedSession.branch },
                    { label: 'Semester', value: selectedSession.semester },
                    { label: 'Section', value: selectedSession.section },
                  ]}
                />
              </div>

              <div className="erp-detail-section">
                <h3 className="erp-detail-heading">Student Attendance Breakdown ({selectedSession.detailsLoading ? 'Loading…' : selectedSession.records?.length ?? selectedSession.totalStudents} Students)</h3>
                <div className="erp-table-responsive">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Roll No</th>
                        <th>Student Name</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSession.detailsLoading ? (
                        <tr><td colSpan="4">Loading student attendance…</td></tr>
                      ) : (selectedSession.records || []).length === 0 ? (
                        <tr><td colSpan="4">No student attendance records are available for this session.</td></tr>
                      ) : (selectedSession.records || []).map((r, idx) => (
                        <tr key={r.studentId || idx}>
                          <td>{idx + 1}</td>
                          <td><strong>{r.rollNumber || r.studentId}</strong></td>
                          <td>{r.name}</td>
                          <td>
                            <StatusBadge
                              status={r.status === 'Present' ? 'Active' : r.status === 'Late' ? 'Warning' : 'Danger'}
                              label={r.status}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </ViewDialog>
        )}
        {selectedStudentReport && (
          <ViewDialog
            title={`Student Attendance: ${selectedStudentReport.name || 'Student'}`}
            subtitle={`${selectedStudentReport.rollNumber || selectedStudentReport.id} · ${selectedStudentReport.course || '-'} / ${selectedStudentReport.branch || '-'}`}
            icon={FiUsers}
            onClose={() => setSelectedStudentReport(null)}
          >
            <div className="attendance-student-detail">
              <div className="attendance-student-metric"><small>Attendance</small><strong className={selectedStudentReport.rate < 65 ? 'text-danger' : selectedStudentReport.rate < 75 ? 'text-warning' : 'text-success'}>{selectedStudentReport.rate ?? 0}%</strong><StatusBadge status={selectedStudentReport.rate >= 75 ? 'Active' : selectedStudentReport.rate >= 65 ? 'Warning' : 'Danger'} label={selectedStudentReport.rate >= 75 ? 'Eligible' : selectedStudentReport.rate >= 65 ? 'Shortage' : 'Critical'} /></div>
              <InfoCard icon={FiCalendar} title="Attendance Summary" items={[{ label: 'Classes attended', value: selectedStudentReport.present ?? 0 }, { label: 'Classes recorded', value: selectedStudentReport.total ?? 0 }, { label: 'Required attendance', value: '75%' }, { label: 'Shortfall', value: `${Math.max(0, 75 - Number(selectedStudentReport.rate || 0))}%` }]} />
            </div>
          </ViewDialog>
        )}
      </div>
    </DashboardLayout>
  )
}

function ReportTable({ rows, columns, empty }) {
  return <div className="erp-table-responsive"><table className="erp-table attendance-report-table"><thead><tr>{columns.map(([label]) => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={row.id || row.subject || row.month || index}>{columns.map(([label, render]) => <td key={label}>{render(row)}</td>)}</tr>) : <tr><td colSpan={columns.length} className="attendance-report-empty">{empty}</td></tr>}</tbody></table></div>
}
