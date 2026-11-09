import { useRef,useLayoutEffect } from 'react'
import { knownAttendanceRate, attendancePercentage } from '../../utils/attendanceMetrics'
import { useScreenAccess } from '../../auth/ScreenAccess'
import { ProjectSelect as SearchableSelectImports_ProjectSelect } from '../../components/SearchableSelect'
import useCollegeStateImports_default from '../../hooks/useCollegeState'
import { newestFirst as newestFirstImports_newestFirst } from '../../utils/newestFirst'
import useToastStateImports_default from '../../hooks/useToastState'
import reactImports_default, { useState as reactImports_useState, useEffect as reactImports_useEffect, useMemo as reactImports_useMemo, useCallback as reactImports_useCallback } from 'react'
import { useLocation as react_router_domImports_useLocation, useNavigate as react_router_domImports_useNavigate, Link as react_router_domImports_Link, useParams as react_router_domImports_useParams } from 'react-router-dom'
import { FiCalendar, FiCheckCircle, FiClock, FiEye, FiLayers, FiPlus, FiSearch, FiUsers, FiUserCheck, FiUserX, FiAlertTriangle, FiBarChart2, FiBell, FiSave, FiFilter, FiChevronDown, FiChevronUp, FiArrowLeft } from 'react-icons/fi'
import DashboardLayoutImports_default from '../../layouts/DashboardLayout'
import PageHeaderImports_default from '../../components/PageHeader'
import CompactSummaryImports_default from '../../components/CompactSummary'
import StatusBadgeImports_default from '../../components/StatusBadge'
import EmptyStateImports_default from '../../components/EmptyState'
import InfoCardImports_default from '../../components/InfoCard'
import TablePaginationImports_default from '../../components/TablePagination'
import ExportMenuImports_default from '../../components/ExportMenu'
import ViewDialogImports_default from '../../components/ViewDialog'
import { useAcademic as AcademicContextImports_useAcademic } from '../../context/AcademicContext'
import { facultyMasterApi as apiEndpointsImports_facultyMasterApi } from '../../api/apiEndpoints'
import attendanceServiceImports_default from '../../services/attendanceService'
import studentServiceImports_default from '../../services/studentService'
import facultyServiceImports_default from '../../services/facultyService'
import subjectServiceImports_default from '../../services/subjectService'
import './Attendance.css'

// Attendance screen and private helpers.
const AttendanceScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const useCollegeState = useCollegeStateImports_default
const newestFirst = newestFirstImports_newestFirst
const useToastState = useToastStateImports_default
const useState = reactImports_useState
const useEffect = reactImports_useEffect
const useMemo = reactImports_useMemo
const useCallback = reactImports_useCallback
const React = reactImports_default
const useLocation = react_router_domImports_useLocation
const useNavigate = react_router_domImports_useNavigate
const DashboardLayout = DashboardLayoutImports_default
const PageHeader = PageHeaderImports_default
const CompactSummary = CompactSummaryImports_default
const StatusBadge = StatusBadgeImports_default
const EmptyState = EmptyStateImports_default
const InfoCard = InfoCardImports_default
const TablePagination = TablePaginationImports_default
const ExportMenu = ExportMenuImports_default
const ViewDialog = ViewDialogImports_default
const useAcademic = AcademicContextImports_useAcademic
const facultyMasterApi = apiEndpointsImports_facultyMasterApi
const attendanceService = attendanceServiceImports_default
const studentService = studentServiceImports_default
const facultyService = facultyServiceImports_default
const subjectService = subjectServiceImports_default

const ATTENDANCE_COLUMNS = [
  { value: 'date', label: 'Date' },
  { value: 'sessionStatus', label: 'Session Status' },
  { value: 'subject', label: 'Subject' },
  { value: 'course', label: 'Course' },
  { value: 'branch', label: 'Branch' },
  { value: 'semester', label: 'Semester' },
  { value: 'section', label: 'Section' },
  { value: 'totalStudents', label: 'Total' },
  { value: 'presentCount', label: 'Present' },
  { value: 'absentCount', label: 'Absent' },
  { value: 'attendanceRate', label: 'Attendance %' },
  { value: 'faculty', label: 'Faculty' },
]

function Attendance() {
  const { canAction } = useScreenAccess()
  const canRecord = canAction('/student-management/attendance','edit') || canAction('/student-management/attendance','create')
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const {
    scopeRecords,
    currentAcademicYear,
    selectedAcademicYearId,
    selectedAcademicYear,
    selectedCollegeId,
    activeDepartments,
    activeCourses,
    getBranchesForCourse,
    getSemestersForCourse,
    getSectionsForScope,
  } = useAcademic()

  const [activeTab, setActiveTab] = useState('register') // 'register' | 'shortage'
  const [reportView, setReportView] = useState('subject')
  const [reportStudent,setReportStudent]=useState('')
  const reportLayout=reportView==='daily'?'monthly':reportView
  const [takeModalOpen, setTakeModalOpen] = useState(pathname.endsWith('/take') && canRecord)
  const [sessions, setSessions] = useCollegeState([])
  const [loading, setLoading] = useState(false)
  const [saveError,setSaveError]=useState(''),[savedPending,setSavedPending]=useState(false)
  const [loadError,setLoadError]=useState(''), [profileError,setProfileError]=useState(''),[masterError,setMasterError]=useState(''),[masterAttempt,setMasterAttempt]=useState(0),[rosterError,setRosterError]=useState('')
  const sessionRequest=useRef(0),profileRequest=useRef(0),rosterRequest=useRef(0),saveLock=useRef(false),saveAcknowledgement=useRef('')
  const currentScope=useRef('');const scopeKey=String(selectedCollegeId)+':'+String(selectedAcademicYearId);useLayoutEffect(()=>{currentScope.current=scopeKey},[scopeKey])
  const [, setToast] = useToastState('', 'success')
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
  const [fromDate,setFromDate]=useState(''),[toDate,setToDate]=useState(''),[sessionStatus,setSessionStatus]=useState('')
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
  const currentAcademicYearId = selectedAcademicYearId || currentAcademicYear?.id || currentAcademicYear?.academicYearId || ''
  useEffect(() => {
    if (!takeModalOpen || !currentAcademicYearId) return
    setTakeScope(current => current.academicYearId === String(currentAcademicYearId)
      ? current
      : { ...current, academicYearId: String(currentAcademicYearId) })
  }, [takeModalOpen, currentAcademicYearId])
  const [markingStudents, setMarkingStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [savingSession, setSavingSession] = useState(false)
  const [activeFaculty, setActiveFaculty] = useCollegeState([])
  const [facultyAssignments, setFacultyAssignments] = useCollegeState([])
  const [loadingFaculty, setLoadingFaculty] = useState(false)
  const [allSubjects, setAllSubjects] = useCollegeState([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [attendanceSemesterCatalog, setAttendanceSemesterCatalog] = useCollegeState([])

  // Shortage list state
  const [allProfiles, setAllProfiles] = useCollegeState([])

  const notify = useCallback((msg,type='success')=>setToast(msg,type),[setToast])

  // Keep the option value and selected-subject lookup on the same ID field.
  // Subject APIs use different casing/names for this field across endpoints.
  const getSubjectId = (subject) => subject?.subjectId ?? subject?.subject_id ?? subject?.id

  const loadSessions = useCallback(async (propagate=false) => {
    if(currentScope.current!==scopeKey)return
    const version=++sessionRequest.current;setLoading(true);setLoadError('')
    try {
      const data=await attendanceService.getSessions({collegeId:selectedCollegeId,academicYearId:selectedAcademicYearId || undefined})
      if(version!==sessionRequest.current || currentScope.current!==scopeKey)return
      setSessions(newestFirst('attendance',scopeRecords(data || []).filter(row=>!selectedAcademicYearId || String(row.academicYearId)===String(selectedAcademicYearId))))
    }catch(reason){if(version===sessionRequest.current){setSessions([]);setLoadError(reason.message || 'Unable to load attendance.')}if(propagate)throw reason}
    finally{if(version===sessionRequest.current)setLoading(false)}
  },[selectedCollegeId,selectedAcademicYearId,scopeKey,scopeRecords])
  const loadProfiles = useCallback(async()=>{
    const version=++profileRequest.current;setProfileError('')
    try{const rows=await studentService.getAllProfiles();if(version===profileRequest.current)setAllProfiles(scopeRecords(rows || []).filter(row=>!selectedAcademicYearId || String(row.academicYearId ?? row.academic?.academicYearId)===String(selectedAcademicYearId)))}
    catch(reason){if(version===profileRequest.current){setAllProfiles([]);setProfileError(reason.message || 'Unable to load student profiles.')}}
  },[selectedAcademicYearId,scopeRecords])
  const invalidateRequests=useCallback(()=>{sessionRequest.current++;profileRequest.current++;rosterRequest.current++},[])
  useEffect(()=>{setSessions([]);setAllProfiles([]);setMarkingStudents([]);setSelectedStudentReport(null);setReportStudent('');setTakeModalOpen(pathname.endsWith('/take') && canRecord);setTakeScope(current=>({...current,academicYearId:String(selectedAcademicYearId || ''),courseId:'',branchId:'',semesterId:'',sectionId:'',subjectId:'',subject:'',subjectCode:'',facultyId:'',faculty:''}));saveAcknowledgement.current='';setSavedPending(false);loadSessions();loadProfiles();return invalidateRequests},[loadSessions,loadProfiles,invalidateRequests,canRecord,setSessions,setAllProfiles,selectedAcademicYearId,pathname])

  useEffect(() => {
    let mounted = true
    const loadData = async () => {
      try {
        setMasterError('');setLoadingFaculty(true)
        setLoadingSubjects(true)
        const [faculty, assignments, backendSubjects, localSubjects, semesters] = await Promise.all([
          facultyService.list(),
          facultyService.getSubjectAllocations(),
          facultyMasterApi.getSubjects(),
          subjectService.getSubjects(),
          facultyMasterApi.getSemesters(),
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
      } catch (error) {
        if (mounted) { setActiveFaculty([]); setFacultyAssignments([]); setAllSubjects([]);setMasterError(error.message || 'Unable to load attendance academic options.') }
      } finally {
        if (mounted) { setLoadingFaculty(false); setLoadingSubjects(false) }
      }
    }
    loadData()
    return () => { mounted = false }
  }, [selectedCollegeId,selectedAcademicYearId,masterAttempt,setFacultyAssignments,setAllSubjects,setAttendanceSemesterCatalog,setActiveFaculty])

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

  // Available subjects filtered strictly by selected Course, Branch, and Semester
  const availableSubjects = useMemo(()=>allSubjects.filter(subject=>{
    if(!takeScope.courseId || !takeScope.branchId || !takeScope.semesterId)return false
    const fields=['courseId','branchId','semesterId','academicYearId']
    const exact=row=>fields.every(field=>String(row[field] ?? row[field.replace('Id','_id')] ?? '')===String(takeScope[field]))
    return exact(subject) || facultyAssignments.some(row=>String(row.subjectId)===String(getSubjectId(subject)) && exact(row))
  }),[allSubjects,facultyAssignments,takeScope])

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

    return matched
  }, [activeFaculty, facultyAssignments, selectedTakeBranch, takeScope.branchId, takeBranchCode])

  const filterBranches = useMemo(() => getBranchesForCourse(filterCourseId, true), [getBranchesForCourse, filterCourseId])
  const registerSections = useMemo(() => getSectionsForScope({
    academicYearId: selectedAcademicYearId,
    courseId: filterCourseId,
    branchId: filterBranchId,
  }, true), [getSectionsForScope, selectedAcademicYearId, filterCourseId, filterBranchId])

  const takeSections = useMemo(() => {
    return getSectionsForScope({
      academicYearId: takeScope.academicYearId,
      courseId: takeScope.courseId,
      branchId: takeScope.branchId,
      semesterId: takeScope.semesterId,
    }, true)
  }, [getSectionsForScope, takeScope.academicYearId,takeScope.courseId,takeScope.branchId,takeScope.semesterId])

  // Load students to mark attendance
  const handleFetchStudentsForMarking = useCallback(async (customScope) => {
    const scope = customScope
    if (!scope.courseId || !scope.branchId || !scope.semesterId || !scope.sectionId) {
      if (!customScope) notify('Please select Course, Branch, Semester, and Section first.', 'warning')
      return
    }

    const request=++rosterRequest.current
    setRosterError('');setMarkingStudents([])
    try {
      setLoadingStudents(true)
      const selectedBranch = takeBranches.find(b => String(b.id) === String(scope.branchId))
      const selectedSemester = takeSemesters.find(s => String(s.id) === String(scope.semesterId))
      const selectedSection = takeSections.find(sec => String(sec.id) === String(scope.sectionId))

      const list = await attendanceService.getStudentsForAttendance({
        collegeId: selectedCollegeId,
        branchId: scope.branchId,
        branchCode: takeBranchCode,
        semesterId: scope.semesterId,
        sectionId: scope.sectionId,
        branch: selectedBranch?.name || selectedBranch?.branchName,
        semester: selectedSemester?.semesterName || selectedSemester?.name,
        section: selectedSection?.name || selectedSection?.sectionName || selectedSection?.sectionCode,
      })

      if(request!==rosterRequest.current)return
      setMarkingStudents(list || [])
      if ((!list || list.length === 0) && !customScope) {
        notify('No students found for this section / academic scope. Please ensure students are enrolled or assigned in Section Management.', 'warning')
      }
    } catch (err) {
      if(request===rosterRequest.current)setRosterError(err.message || 'Failed to load students for attendance.')
    } finally {
      if(request===rosterRequest.current)setLoadingStudents(false)
    }
  }, [
    notify,
    selectedCollegeId,
    takeBranches,
    takeSemesters,
    takeSections,
    takeBranchCode,
  ])

  const rosterScope=useMemo(()=>({academicYearId:takeScope.academicYearId,courseId:takeScope.courseId,branchId:takeScope.branchId,semesterId:takeScope.semesterId,sectionId:takeScope.sectionId,date:takeScope.date}),[takeScope.academicYearId,takeScope.courseId,takeScope.branchId,takeScope.semesterId,takeScope.sectionId,takeScope.date])
  useEffect(()=>{
    if(!takeModalOpen){rosterRequest.current++;return}
    if(!rosterScope.courseId || !rosterScope.branchId || !rosterScope.semesterId || !rosterScope.sectionId){rosterRequest.current++;setMarkingStudents([]);return}
    handleFetchStudentsForMarking(rosterScope)
  },[takeModalOpen,rosterScope,handleFetchStudentsForMarking])

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
    if (!canRecord || savingSession || saveLock.current) return
    if (savedPending) {
      saveLock.current=true;setSavingSession(true);setSaveError('')
      try{await loadSessions(true);if(currentScope.current!==scopeKey)return;saveAcknowledgement.current='';setSavedPending(false);setActiveTab('register');setTakeModalOpen(false);notify('Saved attendance refreshed.')}
      catch(error){if(currentScope.current===scopeKey)setSaveError(error.message || 'Unable to refresh saved attendance.')}
      finally{saveLock.current=false;setSavingSession(false)}
      return
    }
    if (!takeScope.academicYearId || !takeScope.courseId || !takeScope.branchId || !takeScope.semesterId || !takeScope.sectionId || !takeScope.subject.trim() || !takeScope.faculty.trim()) {
      if (!takeScope.sectionId) {
        notify('Select a section before saving attendance.', 'warning')
        return
      }
      notify('Select the complete class scope, subject, and faculty before saving attendance.', 'warning')
      return
    }
    if (!markingStudents.length || loadingStudents || rosterError) {
      notify('No students to record attendance for.', 'warning')
      return
    }

    try {
      saveLock.current=true;setSaveError('');setSavingSession(true)
      const selectedCourse = activeCourses.find(c => String(c.id) === String(takeScope.courseId))
      const selectedBranch = takeBranches.find(b => String(b.id) === String(takeScope.branchId))
      const selectedSemester = takeSemesters.find(s => String(s.id) === String(takeScope.semesterId))
      const selectedSection = takeSections.find(sec => String(sec.id) === String(takeScope.sectionId))
      const selectedYear = selectedAcademicYear || currentAcademicYear

      const finalSubjectId=Number(takeScope.subjectId)
      if(!Number.isSafeInteger(finalSubjectId) || finalSubjectId<=0 || !availableSubjects.some(row=>Number(getSubjectId(row))===finalSubjectId))throw Error('Select a subject mapped to this academic year, course, branch and semester.')
      if(!selectedCourse || !selectedBranch || !selectedSemester || !selectedSection || !branchFaculty.some(row=>String(row.id ?? row.facultyId)===String(takeScope.facultyId)))throw Error('The academic or faculty selection is no longer valid. Review the selected class.')
      const saveSignature=JSON.stringify([scopeKey,takeScope,markingStudents])
      if(saveAcknowledgement.current && saveAcknowledgement.current!==saveSignature)throw Error('Attendance was saved. Refresh the register before changing saved marks.')
      if(!saveAcknowledgement.current)await attendanceService.recordAttendance({
        collegeId: Number(selectedCollegeId),
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
        section: selectedSection?.name || selectedSection?.sectionName || '',
        date: takeScope.date,
        subject: takeScope.subject,
        subjectCode: takeScope.subjectCode || '',
        faculty: takeScope.faculty,
        facultyId: Number(takeScope.facultyId),
        records: markingStudents,
      })

      saveAcknowledgement.current=saveSignature;setSavedPending(true)
      await loadSessions(true)
      if(currentScope.current!==scopeKey)return
      saveAcknowledgement.current='';setSavedPending(false)
      notify('Attendance recorded and saved successfully!')
      setFilterQuery('')
      setFilterCourseId(String(takeScope.courseId))
      setFilterBranchId(String(takeScope.branchId))
      setFilterDate(takeScope.date)
      setCurrentPage(1)
      setActiveTab('register')
      setTakeModalOpen(false)
    } catch (err) {
      if(currentScope.current===scopeKey){setSaveError(err.message || 'Failed to save attendance.');notify(err.message || 'Failed to save attendance.', 'error')}
    } finally {
      saveLock.current=false;setSavingSession(false)
    }
  }

  // Filtered Sessions for Register Tab
  const filteredSessions = useMemo(() => {
    const scopedSectionIds = new Set(registerSections.map(section => String(section.id)))
    return sessions.filter(s => {
      const matchQuery = !filterQuery || `${s.subject} ${s.course} ${s.branch} ${s.section} ${s.faculty}`.toLowerCase().includes(filterQuery.toLowerCase())
      const matchScope = !filterCourseId || String(s.courseId) === String(filterCourseId) || scopedSectionIds.has(String(s.sectionId))
      const matchBranch = !filterBranchId || String(s.branchId) === String(filterBranchId) || scopedSectionIds.has(String(s.sectionId))
      const matchSemester = !filterSemesterId || String(s.semesterId) === String(filterSemesterId)
      const matchDate = (!filterDate || s.date === filterDate) && (!fromDate || s.date>=fromDate) && (!toDate || s.date<=toDate) && (!fromDate || !toDate || fromDate<=toDate)
      const matchStatus=!sessionStatus || String(s.sessionStatus).toUpperCase()===sessionStatus
      return matchQuery && matchScope && matchBranch && matchSemester && matchDate && matchStatus
    })
  }, [sessions, registerSections, filterQuery, filterCourseId, filterBranchId, filterSemesterId, filterDate,fromDate,toDate,sessionStatus])

  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredSessions.slice(start, start + pageSize)
  }, [filteredSessions, currentPage])
  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / pageSize))

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const hasRegisterFilters = Boolean(filterCourseId || filterBranchId || filterDate || fromDate || toDate || sessionStatus)
  const clearRegisterFilters = () => {
    setFilterCourseId('')
    setFilterBranchId('')
    setFilterDate('');setFromDate('');setToDate('');setSessionStatus('')
    setCurrentPage(1)
  }

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalSessions = sessions.length
    const totalPresent = sessions.reduce((acc, s) => acc + (s.presentCount || 0), 0)
    const totalHeadcount = sessions.reduce((acc, s) => acc + (s.totalStudents || 0), 0)
    const avgPercentage = attendancePercentage(totalPresent,totalHeadcount)

    return {
      totalSessions,
      totalPresent,
      avgPercentage: avgPercentage == null ? 'Unavailable' : `${avgPercentage}%`,
      shortageCount: allProfiles.filter(p => knownAttendanceRate(p.attendanceRate) != null && Number(p.attendanceRate) < 75).length,
    }
  }, [sessions, allProfiles])

  const [reportSessions,setReportSessions]=useState([]),[reportError,setReportError]=useState(''),[reportLoading,setReportLoading]=useState(false),[reportAttempt,setReportAttempt]=useState(0)
  useEffect(()=>{
    let current=true;setReportSessions([]);setReportError('')
    if(activeTab!=='reports' && activeTab!=='shortage')return
    setReportLoading(true)
    Promise.all(filteredSessions.filter(row=>String(row.sessionStatus).toUpperCase()!=='CANCELLED').map(async row=>({...row,records:await attendanceService.getSessionStudents(row.id || row.sessionId)})))
      .then(rows=>{if(current)setReportSessions(rows)}).catch(reason=>{if(current)setReportError(reason.message || 'Unable to load report records.')}).finally(()=>{if(current)setReportLoading(false)})
    return()=>{current=false}
  },[activeTab,filteredSessions,reportAttempt])
  const weeklyAttendance=useMemo(()=>Object.values(filteredSessions.reduce((result,row)=>{
    const day=new Date(row.date+'T12:00:00Z');if(Number.isNaN(day.getTime()))return result;day.setUTCDate(day.getUTCDate()-(day.getUTCDay()+6)%7);const week=day.toISOString().slice(0,10)
    const item=result[week] || {month:'Week of '+week,sessions:0,present:0,total:0};item.sessions++;item.present+=Number(row.presentCount || 0);item.total+=Number(row.totalStudents || 0);result[week]=item;return result
  },{})).map(row=>({...row,rate:attendancePercentage(row.present,row.total)})),[filteredSessions])
  // Report data is calculated from the sessions already returned by the
  // attendance API; no client-side sample records are introduced.
  const subjectAttendance = useMemo(() => Object.values(filteredSessions.reduce((result, session) => {
    const id = `${session.subject || 'Unassigned'}|${session.courseId || session.course || ''}|${session.semesterId || session.semester || ''}`
    const current = result[id] || { subject: session.subject || 'Unassigned', sessions: 0, present: 0, total: 0 }
    current.sessions += 1; current.present += Number(session.presentCount || 0); current.total += Number(session.totalStudents || 0)
    result[id] = current; return result
  }, {})).map(row => ({ ...row, rate: attendancePercentage(row.present,row.total) })), [filteredSessions])
  const dailyAttendance = useMemo(() => Object.values(filteredSessions.reduce((result, session) => {
    const month = String(session.date || '') || 'Unspecified'
    const current = result[month] || { month, sessions: 0, present: 0, total: 0 }
    current.sessions += 1; current.present += Number(session.presentCount || 0); current.total += Number(session.totalStudents || 0)
    result[month] = current; return result
  }, {})).map(row => ({ ...row, rate: attendancePercentage(row.present,row.total) })), [filteredSessions])
  const monthlyAttendance = useMemo(() => Object.values(filteredSessions.reduce((result, session) => {
    const month = String(session.date || '').slice(0, 7) || 'Unspecified'
    const current = result[month] || { month, sessions: 0, present: 0, total: 0 }
    current.sessions += 1; current.present += Number(session.presentCount || 0); current.total += Number(session.totalStudents || 0)
    result[month] = current; return result
  }, {})).map(row => ({ ...row, rate: attendancePercentage(row.present,row.total) })), [filteredSessions])
  const studentAttendance = useMemo(() => Object.values(reportSessions.reduce((result, session) => {
    ;(session.records || []).forEach(record => {
      const id = String(record.studentId || record.id || record.rollNumber || '')
      if (!id || !['Present','Absent','Late','Excused'].includes(record.status)) return
      const profile = allProfiles.find(item => String(item.studentId || item.id) === id) || {}
      const current = result[id] || { id, name: record.name || profile.fullName || profile.name || 'Student', rollNumber: record.rollNumber || profile.rollNumber || id, course: profile.academic?.course || session.course || '-', branch: profile.academic?.branch || session.branch || '-', present: 0, total: 0 }
      current.total += 1
      if (['Present', 'Late'].includes(record.status)) current.present += 1
      result[id] = current
    })
    return result
  }, {})).map(row => ({ ...row, rate: row.total ? Math.round((row.present / row.total) * 100) : 0 })), [reportSessions, allProfiles])
  const filteredStudentAttendance=studentAttendance.filter(row=>!reportStudent||row.id===reportStudent)
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
    const rate = matchingReport?.rate ?? knownAttendanceRate(profile.attendanceRate)
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
                <label className="attendance-search-control">
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
                <div className="attendance-register-actions">
                  <ExportMenu
                    rows={filteredSessions.map(s => ({
                      ...s,
                      attendanceRate: attendancePercentage(s.presentCount,s.totalStudents)==null ? 'Unavailable' : attendancePercentage(s.presentCount,s.totalStudents)+'%',
                    }))}
                    columns={ATTENDANCE_COLUMNS}
                    title="Attendance Register"
                    filename="attendance-register"
                  />
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
                  <button
                    type="button"
                    className="erp-btn erp-btn--primary"
                    hidden={!canRecord} onClick={() => setTakeModalOpen(true)}
                  >
                    <FiPlus /> Record Attendance
                  </button>
                </div>
              </div>
              {showRegisterFilters && <div id="attendance-register-filters" className="attendance-register-filters">
                <div className="erp-form-group">
                  <label>Course</label>
                  <ProjectSelect className="erp-select" value={filterCourseId} onChange={(e) => {
                    setFilterCourseId(e.target.value)
                    setFilterBranchId('')
                    setCurrentPage(1)
                  }}>
                    <option value="">All Courses</option>
                    {activeCourses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </ProjectSelect>
                </div>
                <div className="erp-form-group">
                  <label>Branch</label>
                  <ProjectSelect className="erp-select" value={filterBranchId} disabled={!filterCourseId} onChange={(e) => {
                    setFilterBranchId(e.target.value)
                    setCurrentPage(1)
                  }}>
                    <option value="">All Branches</option>
                    {filterBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </ProjectSelect>
                </div>
                <div className="erp-form-group">
                  <label>Date</label>
                  <input type="date" className="erp-input" value={filterDate} onChange={(e) => {
                    setFilterDate(e.target.value)
                    setCurrentPage(1)
                  }} />
                </div>
                <label>From date<input aria-label="Attendance from date" type="date" value={fromDate} onChange={e=>{setFromDate(e.target.value);setCurrentPage(1)}}/></label><label>To date<input aria-label="Attendance to date" type="date" value={toDate} onChange={e=>{setToDate(e.target.value);setCurrentPage(1)}}/></label><label>Session status<select aria-label="Session status" value={sessionStatus} onChange={e=>{setSessionStatus(e.target.value);setCurrentPage(1)}}><option value="">All statuses</option>{['OPEN','COMPLETED','CANCELLED'].map(value=><option key={value}>{value}</option>)}</select></label>
                {hasRegisterFilters && <button type="button" className="attendance-clear-filters" onClick={clearRegisterFilters}>Clear Filters</button>}
              </div>}
            </div>

        {masterError && <p role="alert">{masterError} <button type="button" onClick={()=>setMasterAttempt(value=>value+1)}>Retry academic options</button></p>}{loadError && <p role="alert">{loadError} <button type="button" onClick={()=>loadSessions()}>Retry attendance</button></p>}{profileError && <p role="alert">{profileError} <button type="button" onClick={loadProfiles}>Retry student profiles</button></p>}{fromDate && toDate && fromDate>toDate && <p role="alert">End date must be on or after start date.</p>}
        {/* Tab Navigation */}
        <nav className="attendance-tabs" aria-label="Student attendance sections">
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
                />
              ) : (
                <>
                  <div className="erp-table-responsive">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>Date</th><th>Status</th>
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
                          const rate = attendancePercentage(session.presentCount,session.totalStudents)

                          return (
                            <tr key={session.sessionId}>
                              <td><strong>{session.date}</strong></td><td><StatusBadge value={session.sessionStatus || 'Not reported'}/></td>
                              <td><strong>{session.subject}</strong></td>
                              <td>{session.course} | {session.branch} | {session.semester}</td>
                              <td><span className="erp-badge erp-badge--neutral">{session.section}</span></td>
                              <td>{session.totalStudents}</td>
                              <td>
                                <span className="text-success font-semibold">{session.presentCount} P</span> /{' '}
                                <span className="text-danger font-semibold">{session.absentCount} A</span>
                              </td>
                              <td>
                                <span className={`erp-status-badge erp-status-badge--${rate >= 75 ? 'active' : 'pending'}`}>
                                  <i aria-hidden="true" />
                                  {rate==null?'Unavailable':rate+'%'}
                                </span>
                              </td>
                              <td>{session.faculty}</td>
                              <td>
                                <button
                                  type="button"
                                  className="erp-btn erp-btn--icon"
                                  title="View Session Details"
                                  aria-label="View session details"
                                  onClick={() => navigate(`/student-management/attendance/sessions/${encodeURIComponent(session.id || session.sessionId)}`)}
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
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </>
              )}
            </div>
          </section>
        )}

        {activeTab === 'reports' && (
          <section className={`attendance-content attendance-reports report-view-${reportLayout}`}>
            {reportLoading && <p role="status">Loading attendance report records…</p>}{reportError && <p role="alert">{reportError} <button type="button" onClick={()=>setReportAttempt(value=>value+1)}>Retry attendance reports</button></p>}
            <ExportMenu rows={reportView==='subject'?subjectAttendance:reportView==='weekly'?weeklyAttendance:reportView==='monthly'?monthlyAttendance:reportView==='daily'?dailyAttendance:filteredStudentAttendance} columns={reportView==='student'?[{label:'Student',value:'name'},{label:'Present',value:'present'},{label:'Total',value:'total'},{label:'Attendance %',value:'rate'}]:[{label:reportView==='subject'?'Subject':'Period',value:reportView==='subject'?'subject':'month'},{label:'Sessions',value:'sessions'},{label:'Present',value:'present'},{label:'Total',value:'total'},{label:'Attendance %',value:'rate'}]} title="Attendance Report" filename="attendance-report" loading={loading || (reportView==='student' && (reportLoading || Boolean(reportError)))}/>
            <div className="attendance-report-nav" role="tablist" aria-label="Attendance report sections">
              <button type="button" role="tab" aria-selected={reportView === 'subject'} className={reportView === 'subject' ? 'active' : ''} onClick={() => setReportView('subject')}>Subject-wise</button>
              <button type="button" role="tab" aria-selected={reportView === 'daily'} className={reportView === 'daily' ? 'active' : ''} onClick={() => setReportView('daily')}>Daily</button><button type="button" role="tab" aria-selected={reportView === 'weekly'} className={reportView === 'weekly' ? 'active' : ''} onClick={() => setReportView('weekly')}>Weekly</button><button type="button" role="tab" aria-selected={reportView === 'monthly'} className={reportView === 'monthly' ? 'active' : ''} onClick={() => setReportView('monthly')}>Monthly</button>
              <button type="button" role="tab" aria-selected={reportView === 'student'} className={reportView === 'student' ? 'active' : ''} onClick={() => setReportView('student')}>Student Report</button>
            </div>
            <div className="attendance-report-context">
              <div><span>Attendance reports</span><strong>Review recorded attendance by subject, month, or student.</strong></div>
              <small>Required attendance <b>75%</b></small>
            </div>
            <div className={`attendance-report-grid report-view-${reportLayout}`}>
              <article className="erp-card"><div className="erp-card-header"><div><h2 className="erp-card-title">Subject-wise Attendance</h2><p className="erp-card-subtitle">Attendance performance for every recorded subject.</p></div></div><ReportTable rows={subjectAttendance} empty="No subject sessions recorded yet." columns={[['Subject', row => row.subject], ['Sessions', row => row.sessions], ['Present / Total', row => `${row.present} / ${row.total}`], ['Attendance', row => <AttendanceRateBadge rate={row.rate} />]]} /></article>
              <article className="erp-card"><div className="erp-card-header"><div><h2 className="erp-card-title">{reportView==='daily'?'Daily Attendance':reportView==='weekly'?'Weekly Attendance':'Monthly Attendance'}</h2><p className="erp-card-subtitle">Class attendance for the selected period.</p></div></div><ReportTable rows={reportView==='daily'?dailyAttendance:reportView==='weekly'?weeklyAttendance:monthlyAttendance} empty="No attendance data for this period." columns={[['Period', row => row.month], ['Sessions', row => row.sessions], ['Present / Total', row => `${row.present} / ${row.total}`], ['Attendance', row => <AttendanceRateBadge rate={row.rate} />]]} /></article>
            </div>
            <article className="erp-card"><div className="erp-card-header"><div><h2 className="erp-card-title">Student Attendance Report</h2><p className="erp-card-subtitle">Student-wise attendance calculated from all recorded subject sessions.</p></div><label>Student<select value={reportStudent} onChange={event=>setReportStudent(event.target.value)}><option value="">All students</option>{studentAttendance.map(row=><option value={row.id} key={row.id}>{row.name} · {row.rollNumber}</option>)}</select></label></div><ReportTable rows={filteredStudentAttendance} empty="No student attendance records available." columns={[['Roll Number', row => row.rollNumber], ['Student', row => row.name], ['Course / Branch', row => `${row.course} | ${row.branch}`], ['Present / Total', row => `${row.present} / ${row.total}`], ['Attendance', row => <AttendanceRateBadge rate={row.rate} criticalThreshold={65} />], ['Action', row => <button type="button" className="erp-btn erp-btn--icon" title="View Student Report" aria-label="View Student Report" onClick={() => setSelectedStudentReport(row)}><FiEye /></button>]]} /></article>
          </section>
        )}

        {/* Record Attendance popup */}
    {takeModalOpen && canRecord && (
          <ViewDialog title="Record Student Attendance" onClose={() => setTakeModalOpen(false)} busy={savingSession} showExport={false} hideFooter maxWidth="1150px">{saveError && <p role="alert">{saveError}</p>}{rosterError && <p role="alert">{rosterError} <button type="button" onClick={()=>handleFetchStudentsForMarking(takeScope)}>Retry class roster</button></p>}
            {savedPending ? <div><p>Attendance was saved. Refresh the register to see the saved session.</p><button type="button" className="erp-btn erp-btn--primary" disabled={savingSession} onClick={handleSaveAttendance}>Retry saved attendance refresh</button></div> : <><div className="attendance-record-body">
              {/* Scope Selection Form */}
              <div className="erp-form-grid">
                <div className="erp-form-group">
                  <label>Academic Year <span className="attendance-required-mark">*</span></label>
                  <input
                    type="text"
                    className="erp-input attendance-academic-year"
                    value={selectedAcademicYear?.name || selectedAcademicYear?.academicYearName || currentAcademicYear?.name || currentAcademicYear?.academicYearName || ''}
                    placeholder="No active academic year"
                    readOnly
                  />
                </div>

                <div className="erp-form-group">
                  <label>Course <span className="attendance-required-mark">*</span></label>
                  <ProjectSelect
                    className="erp-select"
                    forceCustom
                    menuPlacement="bottom"
                    aria-label="Attendance course" value={takeScope.courseId}
                    onChange={(e) => setTakeScope(prev => ({ ...prev, courseId: e.target.value, branchId: '', semesterId: '', sectionId: '', subjectId: '', subject: '', subjectCode: '', facultyId: '', faculty: '' }))}
                  >
                    <option value="">Select Course</option>
                    {activeCourses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </ProjectSelect>
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
                  <ProjectSelect
                    className="erp-select"
                    forceCustom
                    menuPlacement="bottom"
                    aria-label="Attendance branch" value={takeScope.branchId}
                    disabled={!takeScope.courseId}
                    onChange={(e) => setTakeScope(prev => ({ ...prev, branchId: e.target.value, semesterId: '', sectionId: '', subjectId: '', subject: '', subjectCode: '', facultyId: '', faculty: '' }))}
                  >
                    <option value="">Select Branch</option>
                    {takeBranches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </ProjectSelect>
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
                  <ProjectSelect
                    className="erp-select"
                    forceCustom
                    menuPlacement="bottom"
                    aria-label="Attendance semester" value={takeScope.semesterId}
                    disabled={!takeScope.courseId}
                    onChange={(e) => setTakeScope(prev => ({ ...prev, semesterId: e.target.value, sectionId: '', subjectId: '', subject: '', subjectCode: '' }))}
                  >
                    <option value="">Select Semester</option>
                    {takeSemesters.map(s => (
                      <option key={s.id} value={s.id}>{s.semesterName}</option>
                    ))}
                  </ProjectSelect>
                </div>

                <div className="erp-form-group">
                  <label>Section <span className="attendance-required-mark">*</span></label>
                  <ProjectSelect
                    className="erp-select"
                    forceCustom
                    menuPlacement="bottom"
                    aria-label="Attendance section" value={takeScope.sectionId}
                    onChange={(e) => setTakeScope(prev => ({ ...prev, sectionId: e.target.value }))}
                  >
                    <option value="">Select Section</option>
                    {takeSections.map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </ProjectSelect>
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
                  <ProjectSelect
                    className="erp-select"
                    forceCustom
                    menuPlacement="bottom"
                    aria-label="Attendance subject" value={takeScope.subjectId || ''}
                    disabled={loadingSubjects || !takeScope.branchId}
                    onChange={(e) => {
                      const selectedVal = e.target.value
                      const selectedSub = availableSubjects.find(sub => String(getSubjectId(sub) ?? '') === String(selectedVal))
                      if (selectedSub) {
                        const subName = selectedSub.subjectName || selectedSub.name || ''
                        const subCode = selectedSub.subjectCode || selectedSub.code || ''
                        const subId = String(getSubjectId(selectedSub) ?? '')

                        setTakeScope(prev=>({...prev,subjectId:subId,subject:subName,subjectCode:subCode,facultyId:'',faculty:''}))
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
                  </ProjectSelect>
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
                  <ProjectSelect
                    className="erp-select"
                    forceCustom
                    menuPlacement="bottom"
                    aria-label="Attendance faculty" value={takeScope.facultyId || ''}
                    disabled={loadingFaculty || !takeScope.branchId}
                    onChange={(e) => {
                      const selectedFaculty = activeFaculty.find(member => String(member.id || member.facultyId) === String(e.target.value))
                      setTakeScope(prev => ({ ...prev, facultyId: e.target.value, faculty: selectedFaculty?.fullName || '' }))
                    }}
                  >
                    <option value="">{loadingFaculty ? 'Loading active faculty...' : !takeScope.branchId ? 'Select Branch first' : 'Select Faculty In-Charge'}</option>
                    {branchFaculty.map(member => (
                      <option key={member.id || member.facultyId} value={member.id || member.facultyId}>
                        {[member.fullName, member.employeeId || member.facultyCode, member.designation].filter(Boolean).join(' - ')}
                      </option>
                    ))}
                  </ProjectSelect>
                  {!loadingFaculty && takeScope.branchId && branchFaculty.length === 0 && <small className="attendance-field-help">No active faculty assignment is available for the selected branch.</small>}
                </div>
              </div>

              <div className="attendance-fetch-action">
                <button
                  type="button"
                  className="erp-btn erp-btn--primary"
                  disabled={loadingStudents || !takeScope.courseId || !takeScope.branchId || !takeScope.semesterId || !takeScope.sectionId}
                  onClick={() => handleFetchStudentsForMarking(takeScope)}
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

              {!loadingStudents && takeScope.courseId && takeScope.branchId && takeScope.semesterId && takeScope.sectionId && markingStudents.length === 0 && (
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
                      disabled={savingSession || !canRecord}
                      onClick={handleSaveAttendance}
                    >
                      <FiSave /> {savingSession ? 'Saving Session...' : savedPending ? 'Retry saved attendance refresh' : 'Save & Publish Attendance'}
                    </button>
                  </div>
                </div>
              )}
            </div>
           </>}</ViewDialog>
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
                      attendancePercentage: `${p.attendanceRate ?? 'Unavailable'}%`,
                      status: 'Shortage (Exam Ineligible)',
                    }))}
                    columns={[
                      { value: 'rollNumber', label: 'Roll No' },
                      { value: 'name', label: 'Student Name' },
                      { value: 'course', label: 'Course' },
                      { value: 'branch', label: 'Branch' },
                      { value: 'semester', label: 'Semester' },
                      { value: 'attendancePercentage', label: 'Attendance' },
                      { value: 'status', label: 'Eligibility Status' },
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
                          <p>No confirmed attendance shortages were found in the available API records.</p>
                        </td>
                      </tr>
                    ) : (
                      shortageStudents.map((p) => {
                        const rate = p.attendanceRate || 68
                        return (
                          <tr key={p.studentId || p.id}>
                            <td><strong>{p.academic?.rollNumber || p.rollNumber || p.id}</strong></td>
                            <td>{p.personal?.fullName || p.name}</td>
                            <td>{p.academic?.course || 'B.Tech'} | {p.academic?.branch || 'CSE'}</td>
                            <td>{p.academic?.semester || 'Semester 1'}</td>
                            <td><AttendanceRateBadge rate={rate} criticalThreshold={65} /></td>
                            <td>{75 - rate}% required</td>
                            <td><div className="attendance-shortage-status"><StatusBadge status={rate < 65 ? 'Danger' : 'Warning'} label={rate < 65 ? 'Critical' : 'Shortage'} /><button type="button" className="erp-btn erp-btn--icon" title="View Details" aria-label="View Details" onClick={() => setSelectedStudentReport(p.attendanceReport || { id: p.studentId || p.id, name: p.personal?.fullName || p.name, rollNumber: p.academic?.rollNumber || p.rollNumber, course: p.academic?.course || '-', branch: p.academic?.branch || '-', rate, present: 0, total: 0 })}><FiEye /></button><button type="button" className="erp-btn erp-btn--secondary" disabled title="Attendance notifications require a backend notification service"><FiBell /> Notify</button></div></td>
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
        {selectedStudentReport && (
          <ViewDialog
            title={`Student Attendance: ${selectedStudentReport.name || 'Student'}`}
            subtitle={`${selectedStudentReport.rollNumber || selectedStudentReport.id} | ${selectedStudentReport.course || '-'} / ${selectedStudentReport.branch || '-'}`}
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

function AttendanceRateBadge({ rate, criticalThreshold = null }) {
  const percentage = knownAttendanceRate(rate)
  if (percentage == null) return <span className="erp-status-badge">Unavailable</span>
  const tone = percentage >= 75 ? 'active' : criticalThreshold !== null && percentage < criticalThreshold ? 'rejected' : 'pending'
  return <span className={`erp-status-badge erp-status-badge--${tone}`}><i aria-hidden="true" />{`${percentage}%`}</span>
}

function ReportTable({ rows, columns, empty }) {
  return <div className="erp-table-responsive"><table className="erp-table attendance-report-table"><thead><tr>{columns.map(([label]) => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={row.id || row.subject || row.month || index}>{columns.map(([label, render]) => <td key={label}>{render(row)}</td>)}</tr>) : <tr><td colSpan={columns.length} className="attendance-report-empty">{empty}</td></tr>}</tbody></table></div>
}

return { default: Attendance }
})()

// AttendanceSessionDetails screen and private helpers.
const AttendanceSessionDetailsScreen = (() => {
const useAcademic = AcademicContextImports_useAcademic
const useEffect = reactImports_useEffect
const useState = reactImports_useState
const Link = react_router_domImports_Link
const useParams = react_router_domImports_useParams
const DashboardLayout = DashboardLayoutImports_default
const InfoCard = InfoCardImports_default
const StatusBadge = StatusBadgeImports_default
const attendanceService = attendanceServiceImports_default
function AttendanceSessionDetails() {
  const { sessionId } = useParams()
  const { scopeRecords } = useAcademic()
  const [session, setSession] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([attendanceService.getSessions(), attendanceService.getSessionStudents(sessionId)])
      .then(([sessions, students]) => {
        const found = scopeRecords(sessions).find(item => String(item.id) === sessionId)
        if (!found) throw new Error('Attendance session not found.')
        if (active) { setSession(found); setRecords(students) }
      })
      .catch(cause => { if (active) setError(cause.message || 'Unable to load session details.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [sessionId, retry, scopeRecords])

  return <DashboardLayout>
    <section className="attendance-content">
      <header className="attendance-session-details-header">
        <h1>Session Details</h1>
        <Link className="erp-btn erp-btn--secondary attendance-session-back" to="/student-management/attendance"><FiArrowLeft aria-hidden="true" />Back</Link>
      </header>
      {loading ? <p role="status">Loading session details...</p> : error ? <div role="alert"><p>{error}</p><button type="button" className="erp-btn erp-btn--secondary" onClick={() => setRetry(value => value + 1)}>Retry</button></div> : session && <>
        <InfoCard icon={FiCalendar} title={session.subject || 'Attendance session'} items={[
          { label: 'Date', value: session.date }, { label: 'Faculty', value: session.faculty },
          { label: 'Academic Year', value: session.academicYear }, { label: 'Course', value: session.course },
          { label: 'Semester', value: session.semester }, { label: 'Section', value: session.section },
        ]} />
        <h2>Student Attendance ({records.length})</h2>
        <div className="erp-table-responsive"><table className="erp-table">
          <thead><tr><th>#</th><th>Roll No</th><th>Student Name</th><th>Status</th></tr></thead>
          <tbody>{records.length ? records.map((record, index) => <tr key={record.studentId || index}>
            <td>{index + 1}</td><td>{record.rollNumber || record.studentId}</td><td>{record.name}</td>
            <td><StatusBadge status={record.status === 'Present' ? 'Active' : record.status === 'Late' ? 'Warning' : 'Danger'} label={record.status} /></td>
          </tr>) : <tr><td colSpan={4}>No student attendance records are available for this session.</td></tr>}</tbody>
        </table></div>
      </>}
    </section>
  </DashboardLayout>
}

return { default: AttendanceSessionDetails }
})()

export const Attendance = AttendanceScreen.default
export const AttendanceSessionDetails = AttendanceSessionDetailsScreen.default
export default Attendance
