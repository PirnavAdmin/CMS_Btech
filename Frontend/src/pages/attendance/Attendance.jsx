import { getUserRole } from '../../auth/auth'
import { resolveMyFaculty } from '../../services/timetable/timetableWorkflowService'
import { backendTimetableService } from '../../services/backendTimetableService'
import { localDate } from '../../utils/timetablePlanner'
import { useRef,useLayoutEffect } from 'react'
import { knownAttendanceRate, attendancePercentage } from '../../utils/attendanceMetrics'
import { useScreenAccess } from '../../auth/ScreenAccess'
import { ProjectSelect as SearchableSelectImports_ProjectSelect } from '../../components/SearchableSelect'
import useCollegeStateImports_default from '../../hooks/useCollegeState'
import { newestFirst as newestFirstImports_newestFirst } from '../../utils/newestFirst'
import useToastStateImports_default from '../../hooks/useToastState'
import reactImports_default, { useState as reactImports_useState, useEffect as reactImports_useEffect, useMemo as reactImports_useMemo, useCallback as reactImports_useCallback } from 'react'
import { useLocation as react_router_domImports_useLocation, useNavigate as react_router_domImports_useNavigate, Link as react_router_domImports_Link, useParams as react_router_domImports_useParams } from 'react-router-dom'
import { FiCalendar, FiCheckCircle, FiClock, FiEye, FiLayers, FiPlus, FiSearch, FiUsers, FiUserCheck, FiUserX, FiAlertTriangle, FiBarChart2, FiSave, FiFilter, FiChevronDown, FiChevronUp, FiArrowLeft } from 'react-icons/fi'
import DashboardLayoutImports_default from '../../layouts/DashboardLayout'
import PageHeaderImports_default from '../../components/PageHeader'
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
  const isFaculty = getUserRole() === 'faculty'
  const [ownFacultyId, setOwnFacultyId] = useState('')
  const [facultyIdentityError, setFacultyIdentityError] = useState('')
  const [occurrences, setOccurrences] = useState([])
  const [occurrenceError, setOccurrenceError] = useState('')
  const { canAction } = useScreenAccess()
  const canRecord = canAction('/student-management/attendance','edit') || canAction('/student-management/attendance','create')
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const {
    scopeRecords,
    currentAcademicYear,
    selectedAcademicYearId,
    selectedAcademicYear,
    activeAcademicYears,
    academicYears,
    selectAcademicYear,
    selectedCollegeId,
    activeDepartments,
    activeCourses,
    courses,
    getBranchesForCourse,
    getSemestersForCourse,
    getSectionsForScope,
  } = useAcademic()

  const [activeTab, setActiveTab] = useState('register') // 'register' | 'shortage'
  const [reportView, setReportView] = useState('subject')
  const [matrixPeriod, setMatrixPeriod] = useState('')
  const [reportStudent,setReportStudent]=useState('')
  const reportLayout=reportView==='daily'?'monthly':reportView
  const [takeEditorOpen, setTakeEditorOpen] = useState(pathname.endsWith('/take') && canRecord)
  const [sessions, setSessions] = useCollegeState([])
  const [loading, setLoading] = useState(false)
  const [saveError,setSaveError]=useState(''),[savedPending,setSavedPending]=useState(false)
  const [loadError,setLoadError]=useState(''), [profileError,setProfileError]=useState(''),[masterError,setMasterError]=useState(''),[masterAttempt,setMasterAttempt]=useState(0),[rosterError,setRosterError]=useState('')
  const sessionRequest=useRef(0),profileRequest=useRef(0),rosterRequest=useRef(0),saveLock=useRef(false),saveAcknowledgement=useRef('')
  const currentScope=useRef('');const scopeKey=String(selectedCollegeId)+':'+String(selectedAcademicYearId);useLayoutEffect(()=>{currentScope.current=scopeKey},[scopeKey])
  const [, setToast] = useToastState('', 'success')
  const [selectedStudentReport, setSelectedStudentReport] = useState(null)
  const [showShortageFilters, setShowShortageFilters] = useState(false)

  // Scope Filters for Register
  const [filterQuery, setFilterQuery] = useState('')
  const [filterCourseId, setFilterCourseId] = useState('')
  const [filterBranchId, setFilterBranchId] = useState('')
  const [filterSemesterId, setFilterSemesterId] = useState('')
  const [filterSectionId, setFilterSectionId] = useState('')
  const [filterSubjectId, setFilterSubjectId] = useState('')
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
    date: localDate(new Date()),
    subject: '',
    subjectId: '',
    subjectCode: '',
    timetableEntryId: '',
    faculty: '',
    facultyId: '',
  })
  const currentAcademicYearId = selectedAcademicYearId || currentAcademicYear?.id || currentAcademicYear?.academicYearId || ''
  const attendanceAcademicYear = selectedAcademicYear || currentAcademicYear || activeAcademicYears[0] || academicYears[0] || null
  const attendanceAcademicYearId = attendanceAcademicYear?.id || attendanceAcademicYear?.academicYearId || ''
  const attendanceAcademicYearName = attendanceAcademicYear?.name || attendanceAcademicYear?.academicYearName || attendanceAcademicYear?.academicYear || (attendanceAcademicYearId ? `Academic Year ${attendanceAcademicYearId}` : '')
  const defaultYearSelection = useRef('')
  useEffect(() => {
    if (selectedAcademicYearId || !attendanceAcademicYearId || defaultYearSelection.current === String(attendanceAcademicYearId)) return
    defaultYearSelection.current = String(attendanceAcademicYearId)
    selectAcademicYear?.(attendanceAcademicYearId)
  }, [selectedAcademicYearId, attendanceAcademicYearId, selectAcademicYear])
  useEffect(() => {
    const yearId = currentAcademicYearId || attendanceAcademicYearId
    if (!takeEditorOpen || !yearId) return
    setTakeScope(current => current.academicYearId === String(yearId)
      ? current
      : { ...current, academicYearId: String(yearId) })
  }, [takeEditorOpen, currentAcademicYearId, attendanceAcademicYearId])
  const [markingStudents, setMarkingStudents] = useState([])
  const [loadedSession, setLoadedSession] = useState(null)
  const [selectedStudents, setSelectedStudents] = useState([])
  const originalRoster = useRef([])
  const dirty = markingStudents.some((row, index) => row.status !== originalRoster.current[index]?.status)
  const confirmDiscard = () => !dirty || savedPending || window.confirm('Discard unsaved attendance marks?')
  const changeTakeScope = update => {
    if (savingSession || !confirmDiscard()) return
    setMarkingStudents(originalRoster.current)
    setSelectedStudents([])
    setTakeScope(current => ({ ...update(current), timetableEntryId: '' }))
  }
  useEffect(() => {
    if (!dirty || savedPending) return undefined
    const warn = event => { event.preventDefault(); event.returnValue = true }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, savedPending])
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
  useEffect(()=>{setSessions([]);setAllProfiles([]);setMarkingStudents([]);setSelectedStudentReport(null);setReportStudent('');setTakeEditorOpen(pathname.endsWith('/take') && canRecord);setTakeScope(current=>({...current,timetableEntryId:'',academicYearId:String(selectedAcademicYearId || ''),courseId:'',branchId:'',semesterId:'',sectionId:'',subjectId:'',subject:'',subjectCode:'',facultyId:'',faculty:''}));saveAcknowledgement.current='';setSavedPending(false);loadSessions();loadProfiles();return invalidateRequests},[loadSessions,loadProfiles,invalidateRequests,canRecord,setSessions,setAllProfiles,selectedAcademicYearId,pathname])

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
          id: semester.semesterId ?? semester.semester_id ?? semester.id,
          semesterId: semester.semesterId ?? semester.semester_id ?? semester.id,
          semesterNumber: semester.semesterNumber ?? semester.semester_number ?? String(semester.semesterName || semester.semester_name || semester.name || '').match(/\d+/)?.[0],
          semesterName: semester.semesterName ?? semester.semester_name ?? semester.name ?? '',
          courseId: semester.courseId ?? semester.course_id,
          branchId: semester.branchId ?? semester.branch_id,
          academicYearId: semester.academicYearId ?? semester.academic_year_id,
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

  useEffect(() => {
    if (!isFaculty || !activeFaculty.length) return undefined
    let active = true
    setOwnFacultyId('')
    resolveMyFaculty({ faculty: activeFaculty.map(row => ({ ...row, id: row.facultyId ?? row.id })) })
      .then(id => { if (active) { setOwnFacultyId(String(id)); setFacultyIdentityError('') } })
      .catch(error => { if (active) setFacultyIdentityError(error.message) })
    return () => { active = false }
  }, [isFaculty, activeFaculty])
  const ownAssignments = useMemo(() => facultyAssignments.filter(row => ownFacultyId &&
    String(row.facultyId) === ownFacultyId && String(row.academicYearId) === String(takeScope.academicYearId)
    && ![false, 0, '0', 'false', 'inactive'].includes(typeof row.status === 'string' ? row.status.toLowerCase() : row.status)
  ), [facultyAssignments, ownFacultyId, takeScope.academicYearId])
  useEffect(() => {
    setOccurrences([]); setOccurrenceError('')
    if (!takeEditorOpen || !takeScope.sectionId || !takeScope.date || (isFaculty && !ownFacultyId)) return undefined
    let active = true
    backendTimetableService.occurrences({ date: takeScope.date, sectionId: takeScope.sectionId, facultyId: isFaculty ? ownFacultyId : undefined })
      .then(rows => { if (active) setOccurrences(Array.isArray(rows?.classes) ? rows.classes : []) })
      .catch(error => { if (active) setOccurrenceError(error.message || 'Unable to load timetable sessions.') })
    return () => { active = false }
  }, [takeEditorOpen, takeScope.sectionId, takeScope.date, isFaculty, ownFacultyId])
  // Cascading lists for Take Attendance
  const takeBranches = useMemo(() => {
    const active = getBranchesForCourse(takeScope.courseId, true)
    return active.filter(branch => !isFaculty || ownAssignments.some(row => String(row.branchId) === String(branch.id)))
  }, [getBranchesForCourse, takeScope.courseId, isFaculty, ownAssignments])

  const attendanceCourses = (activeCourses.length ? activeCourses : courses).filter(course => !isFaculty || ownAssignments.some(row => String(row.courseId) === String(course.id)))
  const onlyCourseId = attendanceCourses.length === 1 ? String(attendanceCourses[0].id) : ''
  useEffect(() => {
    if (takeEditorOpen && onlyCourseId) setTakeScope(current => current.courseId ? current : { ...current, courseId: onlyCourseId })
  }, [takeEditorOpen, onlyCourseId, scopeKey])

  const takeSemesters = useMemo(() => {
    const source = attendanceSemesterCatalog.length ? attendanceSemesterCatalog : getSemestersForCourse(takeScope.courseId, false, takeScope)
    const filtered = source.filter(semester =>
      String(semester.courseId) === String(takeScope.courseId) &&
      String(semester.branchId) === String(takeScope.branchId) &&
      String(semester.academicYearId) === String(takeScope.academicYearId) && (!isFaculty || ownAssignments.some(row => String(row.semesterId) === String(semester.id ?? semester.semesterId)))
    )
    const unique = new Map()
    filtered.forEach(semester => {
      const id = semester.id ?? semester.semesterId
      if (id != null && !unique.has(String(id))) unique.set(String(id), semester)
    })
    return Array.from(unique.values()).sort((a, b) => Number(a.semesterNumber || 0) - Number(b.semesterNumber || 0))
  }, [attendanceSemesterCatalog, getSemestersForCourse, takeScope, isFaculty, ownAssignments])

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

  const selectedTakeBranch = useMemo(
    () => takeBranches.find(branch => String(branch.id) === String(takeScope.branchId)),
    [takeBranches, takeScope.branchId],
  )
  const takeBranchCode = selectedTakeBranch?.branchCode ?? selectedTakeBranch?.code ?? selectedTakeBranch?.shortName ?? ''

  const normalizeKey = (val) => String(val || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')

  // Available subjects filtered strictly by selected Course, Branch, and Semester
  const availableSubjects = useMemo(()=>allSubjects.filter(subject=>{
    if(!takeScope.courseId || !takeScope.branchId || !takeScope.semesterId)return false
    const fields=['courseId','branchId','semesterId','academicYearId']
    const exact=row=>fields.every(field=>String(row[field] ?? row[field.replace('Id','_id')] ?? '')===String(takeScope[field]))
    const matchesSubject = row => String(row.subjectId) === String(getSubjectId(subject)) && exact(row)
    if (isFaculty) return ownAssignments.some(row => matchesSubject(row) && String(row.sectionId) === String(takeScope.sectionId))
    return exact(subject) || facultyAssignments.some(matchesSubject)
  }),[allSubjects,facultyAssignments,takeScope,isFaculty,ownAssignments])

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
    if (isFaculty) return activeFaculty.filter(row => String(row.facultyId ?? row.id) === ownFacultyId)
    if (!takeScope.branchId) return activeFaculty
    const selectedBranchName = String(selectedTakeBranch?.name || selectedTakeBranch?.branchName || '').trim().toLowerCase()
    const targetBranchKey = normalizeKey(selectedTakeBranch?.name || selectedTakeBranch?.branchName || takeBranchCode)

    const matched = activeFaculty.filter(member => {
      const memBranchKey = normalizeKey(member.branchCode || member.branch || member.branchName || member.departmentName || member.department || '')
      if (member.branchId && String(member.branchId) === String(takeScope.branchId)) return true
      if (targetBranchKey && memBranchKey && (memBranchKey === targetBranchKey || memBranchKey.includes(targetBranchKey) || targetBranchKey.includes(memBranchKey))) return true

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
  }, [activeFaculty, facultyAssignments, selectedTakeBranch, takeScope.branchId, takeBranchCode, isFaculty, ownFacultyId])

  const availableOccurrences = occurrences.filter(row =>
    String(row.sectionId) === String(takeScope.sectionId) && String(row.academicYearId) === String(takeScope.academicYearId) &&
    availableSubjects.some(subject => String(getSubjectId(subject)) === String(row.subjectId)) &&
    branchFaculty.some(member => String(member.facultyId ?? member.id) === String(row.facultyId))
  )
  const selectOccurrence = entryId => {
    if (savingSession || !confirmDiscard()) return
    const session = availableOccurrences.find(row => String(row.timetableEntryId) === entryId)
    const subject = availableSubjects.find(row => String(getSubjectId(row)) === String(session?.subjectId))
    const member = branchFaculty.find(row => String(row.facultyId ?? row.id) === String(session?.facultyId))
    setMarkingStudents(originalRoster.current)
    setSelectedStudents([])
    setTakeScope(current => ({ ...current, timetableEntryId: entryId, subjectId: session?.subjectId ?? '', subject: subject?.name || subject?.subjectName || '', subjectCode: subject?.subjectCode || '', facultyId: session?.facultyId ?? '', faculty: member?.fullName || member?.name || '' }))
  }

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
    setRosterError('');setMarkingStudents([]);setLoadedSession(null)
    try {
      setLoadingStudents(true)
      const selectedBranch = takeBranches.find(b => String(b.id) === String(scope.branchId))
      const selectedSemester = takeSemesters.find(s => String(s.id) === String(scope.semesterId))
      const selectedSection = takeSections.find(sec => String(sec.id) === String(scope.sectionId))

      const existing = scope.subjectId && scope.facultyId && sessions.find(row =>
        String(row.sectionId) === String(scope.sectionId) && row.date === scope.date &&
        (scope.timetableEntryId ? String(row.timetableEntryId) === String(scope.timetableEntryId) :
          !row.timetableEntryId && !row.timetableSlotId && String(row.subjectId) === String(scope.subjectId) && String(row.facultyId) === String(scope.facultyId)))
      const list = existing ? await attendanceService.getSessionStudents(existing.id || existing.sessionId) : await attendanceService.getStudentsForAttendance({
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
      setLoadedSession(existing || null)
      originalRoster.current = list || []
      setSelectedStudents([])
      setMarkingStudents(originalRoster.current)
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

  const { academicYearId, courseId, branchId, semesterId, sectionId, date, subjectId, facultyId, timetableEntryId } = takeScope
  const rosterScope = useMemo(() => ({ academicYearId, courseId, branchId, semesterId, sectionId, date, subjectId, facultyId, timetableEntryId }),
    [academicYearId, courseId, branchId, semesterId, sectionId, date, subjectId, facultyId, timetableEntryId])
  const lockedSession = loadedSession && String(loadedSession.sessionStatus).toUpperCase() !== 'OPEN'

  useEffect(()=>{
    if(!takeEditorOpen || activeTab !== 'register'){rosterRequest.current++;return}
    if(!rosterScope.courseId || !rosterScope.branchId || !rosterScope.semesterId || !rosterScope.sectionId){rosterRequest.current++;setMarkingStudents([]);return}
    handleFetchStudentsForMarking(rosterScope)
  },[takeEditorOpen,activeTab,rosterScope,handleFetchStudentsForMarking])

  // Quick action: Mark All Present
  const handleMarkAll = (status, selectedOnly = false) => {
    setMarkingStudents(prev => prev.map(row =>
      !row.attendanceDetailId && (!selectedOnly || selectedStudents.includes(row.studentId)) ? { ...row, status } : row))
  }

  // Toggle individual student status
  const handleStudentStatusChange = (studentId, status) => {
    setMarkingStudents(prev => prev.map(row => row.studentId === studentId && !row.attendanceDetailId ? { ...row, status } : row))
  }

  // Save session
  const handleSaveAttendance = async () => {
    if (!canRecord || (lockedSession && !savedPending) || savingSession || saveLock.current) return
    if (savedPending) {
      saveLock.current=true;setSavingSession(true);setSaveError('')
      try{await loadSessions(true);if(currentScope.current!==scopeKey)return;saveAcknowledgement.current='';setSavedPending(false);setActiveTab('register');setTakeEditorOpen(false);notify('Saved attendance refreshed.')}
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

    if (!takeScope.date || takeScope.date > localDate()) {
      setSaveError('Choose today or a past attendance date.')
      return
    }
    const statuses = ['Present', 'Absent', 'Late', 'Excused']
    if (markingStudents.some(row => !statuses.includes(row.status))) {
      setSaveError('Mark every student before saving attendance.')
      return
    }
    const summary = statuses.map(status => status + ' ' + markingStudents.filter(row => row.status === status).length)
    if (!window.confirm('Save attendance for ' + markingStudents.length + ' students?\n' + summary.join(' · '))) return

    try {
      saveLock.current=true;setSaveError('');setSavingSession(true)
      const selectedCourse = attendanceCourses.find(c => String(c.id) === String(takeScope.courseId))
      const selectedBranch = takeBranches.find(b => String(b.id) === String(takeScope.branchId))
      const selectedSemester = takeSemesters.find(s => String(s.id) === String(takeScope.semesterId))
      const selectedSection = takeSections.find(sec => String(sec.id) === String(takeScope.sectionId))
      const selectedYear = selectedAcademicYear || currentAcademicYear

      const finalSubjectId=Number(takeScope.subjectId)
      if(!Number.isSafeInteger(finalSubjectId) || finalSubjectId<=0 || !availableSubjects.some(row=>Number(getSubjectId(row))===finalSubjectId))throw Error('Select a subject mapped to this academic year, course, branch and semester.')
      if(!selectedCourse || !selectedBranch || !selectedSemester || !selectedSection || !branchFaculty.some(row=>String(row.id ?? row.facultyId)===String(takeScope.facultyId)))throw Error('The academic or faculty selection is no longer valid. Review the selected class.')
      const occurrence = availableOccurrences.find(row => String(row.timetableEntryId) === String(takeScope.timetableEntryId))
      if (takeScope.timetableEntryId && !occurrence) throw Error('The selected timetable session is no longer available.')
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
        ...(occurrence ? { timetableEntryId: occurrence.timetableEntryId, timetableId: occurrence.timetableId, timetableSlotId: occurrence.timetableSlotId } : {}),
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
      setTakeEditorOpen(false)
    } catch (err) {
      if(currentScope.current===scopeKey){setSaveError(err.message || 'Failed to save attendance.');notify(err.message || 'Failed to save attendance.', 'error')}
    } finally {
      saveLock.current=false;setSavingSession(false)
    }
  }

  // Filtered Sessions for Register Tab
  const studentQuery = activeTab === 'shortage' || (activeTab === 'reports' && reportView === 'student')
  const filteredSessions = useMemo(() => {
    const scopedSectionIds = new Set(registerSections.map(section => String(section.id)))
    return sessions.filter(s => {
      const matchQuery = studentQuery || !filterQuery || `${s.subject} ${s.course} ${s.branch} ${s.section} ${s.faculty}`.toLowerCase().includes(filterQuery.toLowerCase())
      const matchScope = !filterCourseId || String(s.courseId) === String(filterCourseId) || scopedSectionIds.has(String(s.sectionId))
      const matchBranch = !filterBranchId || String(s.branchId) === String(filterBranchId) || scopedSectionIds.has(String(s.sectionId))
      const matchSemester = !filterSemesterId || String(s.semesterId) === String(filterSemesterId)
      const matchDate = (!filterDate || s.date === filterDate) && (!fromDate || s.date>=fromDate) && (!toDate || s.date<=toDate) && (!fromDate || !toDate || fromDate<=toDate)
      const matchStatus=activeTab !== 'register' || !sessionStatus || String(s.sessionStatus).toUpperCase()===sessionStatus
      const ownClass = !isFaculty || (ownFacultyId && (String(s.facultyId) === ownFacultyId || ownAssignments.some(row => String(row.sectionId) === String(s.sectionId) && String(row.subjectId) === String(s.subjectId))))
      const matchDetail = (!filterSectionId || String(s.sectionId) === filterSectionId) && (!filterSubjectId || String(s.subjectId) === filterSubjectId)
      return ownClass && matchDetail && matchQuery && matchScope && matchBranch && matchSemester && matchDate && matchStatus
    })
  }, [sessions, registerSections, filterQuery, studentQuery, activeTab, isFaculty, ownFacultyId, ownAssignments, filterCourseId, filterBranchId, filterSemesterId, filterSectionId, filterSubjectId, filterDate,fromDate,toDate,sessionStatus])

  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredSessions.slice(start, start + pageSize)
  }, [filteredSessions, currentPage])
  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / pageSize))

  useEffect(() => {
    if (activeTab === 'register' && currentPage > totalPages) setCurrentPage(totalPages)
  }, [activeTab, currentPage, totalPages])

  const hasRegisterFilters = Boolean(filterCourseId || filterBranchId || filterSemesterId || filterSectionId || filterSubjectId || filterDate || fromDate || toDate || sessionStatus)
  const clearRegisterFilters = () => {
    setFilterCourseId('')
    setFilterBranchId('')
    setFilterSemesterId(''); setFilterSectionId(''); setFilterSubjectId('')
    setFilterDate('');setFromDate('');setToDate('');setSessionStatus('')
    setCurrentPage(1)
  }

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const completed = filteredSessions.filter(row => String(row.sessionStatus).toUpperCase() === 'COMPLETED')
    const totalSessions = completed.length
    const totalPresent = completed.reduce((acc, s) => acc + (s.presentCount || 0), 0)
    const totalHeadcount = completed.reduce((acc, s) => acc + (s.totalStudents || 0), 0)
    const avgPercentage = attendancePercentage(totalPresent,totalHeadcount)

    return {
      totalSessions,
      totalPresent,
      avgPercentage: avgPercentage == null ? null : `${avgPercentage}%`,
    }
  }, [filteredSessions])

  const [reportSessions,setReportSessions]=useState([]),[reportError,setReportError]=useState(''),[reportLoading,setReportLoading]=useState(false),[reportAttempt,setReportAttempt]=useState(0)
  useEffect(()=>{
    let current=true;setReportSessions([]);setReportError('')
    if(activeTab!=='reports' && activeTab!=='shortage')return
    setReportLoading(true)
    Promise.all(filteredSessions.filter(row=>String(row.sessionStatus).toUpperCase()==='COMPLETED').map(async row=>({...row,records:await attendanceService.getSessionStudents(row.id || row.sessionId)})))
      .then(rows=>{if(current)setReportSessions(rows)}).catch(reason=>{if(current)setReportError(reason.message || 'Unable to load report records.')}).finally(()=>{if(current)setReportLoading(false)})
    return()=>{current=false}
  },[activeTab,filteredSessions,reportAttempt])
  const confirmedSessions = useMemo(() => filteredSessions.filter(row => String(row.sessionStatus).toUpperCase() === 'COMPLETED'), [filteredSessions])
  // Report data is calculated from the sessions already returned by the
  // attendance API; no client-side sample records are introduced.
  const subjectAttendance = useMemo(() => Object.values(confirmedSessions.reduce((result, session) => {
    const id = [session.subjectId || session.subject, session.facultyId || session.faculty, session.semesterId].join('|')
    const current = result[id] || { id, subject: session.subject || 'Unassigned', code: session.subjectCode, faculty: session.faculty, sessions: 0, present: 0, absent: 0, total: 0 }
    current.sessions += 1; current.present += Number(session.presentCount || 0); current.absent += Number(session.absentCount || 0); current.total += Number(session.totalStudents || 0)
    result[id] = current; return result
  }, {})).map(row => ({ ...row, rate: attendancePercentage(row.present,row.total) })), [confirmedSessions])
  const studentAttendance = useMemo(() => Object.values(reportSessions.reduce((result, session) => {
    ;(session.records || []).forEach(record => {
      const id = String(record.studentId || record.id || record.rollNumber || '')
      if (!id || !['Present','Absent','Late','Excused'].includes(record.status)) return
      const profile = allProfiles.find(item => String(item.studentId || item.id) === id) || {}
      const current = result[id] || {
        id, name: record.name || profile.fullName || profile.name || 'Student',
        rollNumber: record.rollNumber || profile.rollNumber || id,
        admissionNumber: record.admissionNumber || profile.academic?.admissionNumber || profile.admissionNumber,
        course: profile.academic?.course || session.course || '—', branch: profile.academic?.branch || session.branch || '—',
        semester: session.semester, section: session.section, present: 0, total: 0, marks: {},
      }
      current.marks[session.id || session.sessionId] = record.status
      current.total += 1
      if (['Present', 'Late'].includes(record.status)) current.present += 1
      result[id] = current
    })
    return result
  }, {})).map(row => ({ ...row, rate: row.total ? row.present * 100 / row.total : 0 })), [reportSessions, allProfiles])
  const matchesStudent = row => [row.name, row.rollNumber, row.admissionNumber].some(value => String(value || '').toLowerCase().includes(filterQuery.trim().toLowerCase()))
  const filteredStudentAttendance = studentAttendance.filter(row => (!reportStudent || row.id === reportStudent) && matchesStudent(row))
  const reportPeriod = date => {
    if (reportView === 'monthly') return date.slice(0, 7)
    if (reportView !== 'weekly') return date
    const monday = new Date(date + 'T12:00:00Z')
    if (Number.isNaN(monday.getTime())) return date
    monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7)
    return monday.toISOString().slice(0, 10)
  }
  const matrixPeriods = [...new Set(reportSessions.filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.date)).map(row => reportPeriod(row.date)))].sort().reverse()
  const selectedPeriod = matrixPeriods.includes(matrixPeriod) ? matrixPeriod : matrixPeriods[0]
  const matrixSessions = reportSessions.filter(row => matrixPeriods.length && /^\d{4}-\d{2}-\d{2}$/.test(row.date) && reportPeriod(row.date) === selectedPeriod)
    .sort((first, second) => first.date.localeCompare(second.date))
  const matrixRows = studentAttendance.flatMap(row => {
    const marks = matrixSessions.map(session => row.marks[session.id || session.sessionId]).filter(Boolean)
    if (!marks.length) return []
    const present = marks.filter(mark => ['Present', 'Late'].includes(mark)).length
    return [{ ...row, present, absent: marks.filter(mark => mark === 'Absent').length, rate: present * 100 / marks.length }]
  })
  const matrixColumns = [
    ['Roll Number', row => row.rollNumber], ['Student', row => row.name],
    ...matrixSessions.map(session => [session.date + ' · ' + session.subject + ' · ' + session.section + ' #' + (session.id || session.sessionId), row => row.marks[session.id || session.sessionId] || '—']),
    ['Present', row => row.present], ['Absent', row => row.absent], ['Attendance %', row => row.rate.toFixed(2)],
  ]
  const selectedStudentGroups = field => {
    const totals = new Map()
    for (const session of reportSessions) {
      const mark = selectedStudentReport?.marks?.[session.id || session.sessionId]
      if (!mark) continue
      const label = field === 'month' ? session.date.slice(0, 7) : session.subject || 'Subject unavailable'
      const group = totals.get(label) || { id: label, total: 0, attended: 0 }
      group.total += 1
      if (mark === 'Present' || mark === 'Late') group.attended += 1
      totals.set(label, group)
    }
    return [...totals.values()]
  }
  const shortageStudents = studentAttendance.filter(row => row.rate < 75 && matchesStudent(row)).map(row => ({
    ...row, deficit: 75 - row.rate, recovery: Math.ceil((75 * row.total - 100 * row.present) / 25),
  }))
  const shortagePageCount = Math.max(1, Math.ceil(shortageStudents.length / pageSize))
  const shortagePage = Math.min(currentPage, shortagePageCount)

  return (
    <DashboardLayout>
      <div className="attendance-page">
        <PageHeader
          className="attendance-page-header"
          title="Student Attendance"
          subtitle="Manage student attendance registers, daily marking, and shortage monitoring."
          compactSummary={activeTab === 'register' ? [
            { label: 'Recorded Sessions', value: summaryMetrics.totalSessions },
            { label: 'Avg Attendance', value: summaryMetrics.avgPercentage ?? '—', tone: summaryMetrics.avgPercentage == null ? 'archived' : 'active' },
            { label: 'Present Entries', value: summaryMetrics.totalPresent },
          ] : undefined}
        />



            {/* Filter Panel */}
            <div className="erp-card erp-filter-card">
              <div className="attendance-filter-toolbar">
                <label className="attendance-search-control">
                  <FiSearch aria-hidden="true" />
                  <input
                    type="search"
                    placeholder={studentQuery ? "Search student name, roll or admission number" : "Search subject, faculty or section"}
                    value={filterQuery}
                    onChange={(e) => {
                      setFilterQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    aria-label="Search attendance"
                  />
                </label>
                <div className="attendance-register-actions">
                  {activeTab === 'register' && <ExportMenu
                    rows={filteredSessions.map(s => ({
                      ...s,
                      attendanceRate: attendancePercentage(s.presentCount,s.totalStudents)==null ? 'Unavailable' : attendancePercentage(s.presentCount,s.totalStudents)+'%',
                    }))}
                    columns={ATTENDANCE_COLUMNS}
                    title="Attendance Register"
                    filename="attendance-register"
                  />}
                  <button
                    type="button"
                    className={`attendance-filter-toggle${hasRegisterFilters ? ' attendance-filter-toggle--active' : ''}`}
                    aria-expanded={showRegisterFilters}
                    aria-controls="attendance-register-filters"
                    onClick={() => setShowRegisterFilters(value => !value)}
                  >
                    <FiFilter aria-hidden="true" /> Filters
                    {hasRegisterFilters && <span className="attendance-filter-count" aria-label="Filters applied">{[filterCourseId, filterBranchId, filterDate, fromDate, toDate, sessionStatus].filter(Boolean).length}</span>}
                    {showRegisterFilters ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}
                  </button>
                  {activeTab === 'reports' && <ExportMenu
                    rows={reportView === 'subject' ? subjectAttendance : reportView === 'student' ? filteredStudentAttendance : matrixRows}
                    columns={reportView === 'subject' ? [
                      { label: 'Subject', value: 'subject' }, { label: 'Code', value: 'code' }, { label: 'Faculty', value: 'faculty' },
                      { label: 'Sessions', value: 'sessions' }, { label: 'Present', value: 'present' }, { label: 'Absent', value: 'absent' }, { label: 'Attendance %', value: 'rate' },
                    ] : reportView === 'student' ? [
                      { label: 'Roll Number', value: 'rollNumber' }, { label: 'Student', value: 'name' }, { label: 'Present', value: 'present' },
                      { label: 'Total', value: 'total' }, { label: 'Attendance %', value: row => row.rate.toFixed(2) },
                    ] : matrixColumns.map(([label, value]) => ({ label, value }))}
                    title="Attendance Report" filename="attendance-report"
                    loading={loading || (reportView !== 'subject' && (reportLoading || Boolean(reportError)))}
                  />}
                  {activeTab === 'shortage' && <ExportMenu rows={shortageStudents} columns={[
                    { value: 'rollNumber', label: 'Roll Number' }, { value: 'name', label: 'Student' },
                    { value: 'course', label: 'Course' }, { value: 'branch', label: 'Branch' },
                    { value: 'semester', label: 'Semester' }, { value: 'section', label: 'Section' },
                    { value: 'total', label: 'Conducted' }, { value: 'present', label: 'Attended' },
                    { value: row => row.rate.toFixed(2), label: 'Attendance %' }, { value: 'recovery', label: 'Sessions Needed' },
                  ]} title="Attendance Shortage" filename="attendance-shortage-list" loading={reportLoading} />}
                  {canRecord && activeTab === 'register' && <button
                    type="button"
                    className="erp-btn erp-btn--primary"
                    onClick={() => setTakeEditorOpen(true)}
                  >
                    <FiPlus /> Record Attendance
                  </button>}
                </div>
              </div>
              {showRegisterFilters && <div id="attendance-register-filters" className="attendance-register-filters">
                <div className="attendance-register-filter-fields">
                  <div className="attendance-register-field">
                    <label htmlFor="attendance-filter-course">Course</label>
                    <ProjectSelect id="attendance-filter-course" aria-label="Course" value={filterCourseId} onChange={(e) => {
                      setFilterCourseId(e.target.value)
                      setFilterBranchId(''); setFilterSemesterId(''); setFilterSectionId(''); setFilterSubjectId('')
                      setCurrentPage(1)
                    }}>
                      <option value="">All Courses</option>
                      {activeCourses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </ProjectSelect>
                  </div>
                  <div className="attendance-register-field">
                    <label htmlFor="attendance-filter-branch">Branch</label>
                    <ProjectSelect id="attendance-filter-branch" aria-label="Branch" value={filterBranchId} disabled={!filterCourseId} onChange={(e) => {
                      setFilterBranchId(e.target.value); setFilterSemesterId(''); setFilterSectionId(''); setFilterSubjectId('')
                      setCurrentPage(1)
                    }}>
                      <option value="">All Branches</option>
                      {filterBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </ProjectSelect>
                  </div>
                  <label className="attendance-register-field">Semester
                    <select className="erp-select" value={filterSemesterId} onChange={event => { setFilterSemesterId(event.target.value); setFilterSectionId(''); setFilterSubjectId(''); setCurrentPage(1) }}>
                      <option value="">All semesters</option>
                      {attendanceSemesterCatalog.filter(row => (!filterCourseId || String(row.courseId) === filterCourseId) && (!filterBranchId || String(row.branchId) === filterBranchId) && String(row.academicYearId) === String(currentAcademicYearId)).map(row => <option key={row.id} value={row.id}>{row.semesterName}</option>)}
                    </select>
                  </label>
                  <label className="attendance-register-field">Section
                    <select className="erp-select" value={filterSectionId} onChange={event => { setFilterSectionId(event.target.value); setFilterSubjectId(''); setCurrentPage(1) }}>
                      <option value="">All sections</option>
                      {registerSections.filter(row => !filterSemesterId || String(row.semesterId) === filterSemesterId).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
                    </select>
                  </label>
                  {activeTab === 'reports' && <label className="attendance-register-field">Subject
                    <select className="erp-select" value={filterSubjectId} onChange={event => setFilterSubjectId(event.target.value)}>
                      <option value="">All subjects</option>
                      {[...new Map(sessions.filter(row => row.subjectId && (!filterSemesterId || String(row.semesterId) === filterSemesterId) && (!filterSectionId || String(row.sectionId) === filterSectionId)).map(row => [row.subjectId, row.subject])).entries()].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                  </label>}
                  {[
                    ['Date', 'Attendance date', filterDate, setFilterDate],
                    ['From date', 'Attendance from date', fromDate, setFromDate],
                    ['To date', 'Attendance to date', toDate, setToDate],
                  ].map(([label, accessibleLabel, value, setDate]) => (
                    <label className="attendance-register-field" key={label}>
                      <span>{label}</span>
                      <input aria-label={accessibleLabel} type="date" className="erp-input" value={value} onChange={event => {
                        setDate(event.target.value)
                        setCurrentPage(1)
                      }} />
                    </label>
                  ))}
                  {activeTab === 'register' && <div className="attendance-register-field">
                    <label htmlFor="attendance-filter-status">Session status</label>
                    <select id="attendance-filter-status" className="erp-select" value={sessionStatus} onChange={event => {
                      setSessionStatus(event.target.value)
                      setCurrentPage(1)
                    }}>
                      <option value="">All statuses</option>
                      {['OPEN', 'COMPLETED', 'CANCELLED'].map(value => <option key={value}>{value}</option>)}
                    </select>
                  </div>}
                </div>
                {hasRegisterFilters && <button type="button" className="attendance-clear-filters" onClick={clearRegisterFilters}>Clear Filters</button>}
              </div>}
            </div>

        {masterError && <p role="alert">{masterError} <button type="button" onClick={()=>setMasterAttempt(value=>value+1)}>Retry academic options</button></p>}{loadError && <p role="alert">{loadError} <button type="button" onClick={()=>loadSessions()}>Retry attendance</button></p>}{profileError && <p role="alert">{profileError} <button type="button" onClick={loadProfiles}>Retry student profiles</button></p>}{fromDate && toDate && fromDate>toDate && <p role="alert">End date must be on or after start date.</p>}
        {/* Tab Navigation */}
        <nav className="attendance-tabs" aria-label="Student attendance sections">
          <button
            type="button"
            className={`attendance-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => { if (!savingSession && confirmDiscard()) { setMarkingStudents(originalRoster.current); setCurrentPage(1); setFilterSubjectId(''); setActiveTab('register') } }}
          >
            <FiCalendar /> Daily Attendance
          </button>
          <button
            type="button"
            className={`attendance-tab ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => { if (!savingSession && confirmDiscard()) { setMarkingStudents(originalRoster.current); setCurrentPage(1); setActiveTab('reports') } }}
          >
            <FiBarChart2 /> Attendance Reports
          </button>
          <button
            type="button"
            className={`attendance-tab ${activeTab === 'shortage' ? 'active' : ''}`}
            onClick={() => { if (!savingSession && confirmDiscard()) { setMarkingStudents(originalRoster.current); setActiveTab('shortage') } }}
          >
            <FiAlertTriangle /> Shortage List (&lt;75%)
          </button>
        </nav>

        {activeTab === 'register' && takeEditorOpen && canRecord && (
          <ViewDialog
            className="attendance-record-dialog"
            title="Record Student Attendance"
            subtitle={attendanceAcademicYearName}
            maxWidth="1000px"
            busy={savingSession}
            showExport={false}
            onClose={() => {
              if (!savingSession && confirmDiscard()) {
                setMarkingStudents(originalRoster.current)
                setTakeEditorOpen(false)
              }
            }}
            footerActions={savedPending || !lockedSession ? (
              <button type="button" className="erp-btn erp-btn--primary" onClick={handleSaveAttendance}
                disabled={savingSession || (!savedPending && (loadingStudents || Boolean(rosterError) || !markingStudents.length || !takeScope.subjectId || !takeScope.facultyId))}>
                <FiSave /> {savingSession ? 'Saving…' : savedPending ? 'Retry saved attendance refresh' : 'Save Attendance'}
              </button>
            ) : null}
          >
            {facultyIdentityError && <p role="alert">{facultyIdentityError}</p>}{occurrenceError && <p role="status">Timetable sessions unavailable. {occurrenceError}</p>}{saveError && <p role="alert">{saveError}</p>}{rosterError && <p role="alert">{rosterError} <button type="button" onClick={()=>handleFetchStudentsForMarking(takeScope)}>Retry class roster</button></p>}
            {savedPending ? <p role="status">Attendance was saved. Refresh the register to see the saved session.</p> : <><div className="attendance-record-body">
              {/* Scope Selection Form */}
              <div className="erp-form-grid">
{!onlyCourseId && <div className="erp-form-group"><label>Course <span className="attendance-required-mark">*</span></label>
                  <ProjectSelect
                    className="erp-select"
                    forceCustom
                    menuPlacement="bottom"
                    aria-label="Attendance course" value={takeScope.courseId}
                    onChange={(e) => changeTakeScope(prev => ({ ...prev, courseId: e.target.value, branchId: '', semesterId: '', sectionId: '', subjectId: '', subject: '', subjectCode: '', facultyId: '', faculty: '' }))}
                  >
                    <option value="">Select Course</option>
                    {attendanceCourses.map(c => (
                      <option key={c.id ?? c.courseId} value={c.id ?? c.courseId}>{c.name || c.courseName || c.CourseName || c.code || c.courseCode || `Course ${c.id ?? c.courseId}`}</option>
                    ))}
                  </ProjectSelect>
                </div>}

<div className="erp-form-group">
                  <label>Branch <span className="attendance-required-mark">*</span></label>
                  <ProjectSelect
                    className="erp-select"
                    forceCustom
                    menuPlacement="bottom"
                    aria-label="Attendance branch" value={takeScope.branchId}
                    disabled={!takeScope.courseId}
                    onChange={(e) => changeTakeScope(prev => ({ ...prev, branchId: e.target.value, semesterId: '', sectionId: '', subjectId: '', subject: '', subjectCode: '', facultyId: '', faculty: '' }))}
                  >
                    <option value="">Select Branch</option>
                    {takeBranches.map(b => (
                      <option key={b.id ?? b.branchId} value={b.id ?? b.branchId}>{b.name || b.branchName || b.BranchName || b.code || b.branchCode || `Branch ${b.id ?? b.branchId}`}</option>
                    ))}
                  </ProjectSelect>
                </div>

<div className="erp-form-group">
                  <label>Semester <span className="attendance-required-mark">*</span></label>
                  <ProjectSelect
                    className="erp-select"
                    forceCustom
                    menuPlacement="bottom"
                    aria-label="Attendance semester" value={takeScope.semesterId}
                    disabled={savingSession || !takeScope.branchId}
                    onChange={(e) => changeTakeScope(prev => ({ ...prev, semesterId: e.target.value, sectionId: '', subjectId: '', subject: '', subjectCode: '' }))}
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
                    aria-label="Attendance section" value={takeScope.sectionId} disabled={savingSession || !takeScope.semesterId}
                    onChange={(e) => changeTakeScope(prev => ({ ...prev, sectionId: e.target.value, subjectId: '', subject: '', subjectCode: '', facultyId: '', faculty: '' }))}
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
                    type="date" max={localDate(new Date())}
                    className="erp-input"
                    value={takeScope.date}
                    onChange={(e) => changeTakeScope(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>

                                {availableOccurrences.length > 0 && <label className="erp-form-group">
                  <span>Timetable session</span>
                  <select className="erp-select" value={takeScope.timetableEntryId} onChange={event => selectOccurrence(event.target.value)}>
                    <option value="">Select a session or mark manually</option>
                    {availableOccurrences.map(row => <option key={row.timetableEntryId} value={row.timetableEntryId}>{row.subjectName} · {String(row.startTime || '').slice(0, 5)}–{String(row.endTime || '').slice(0, 5)}</option>)}
                  </select>
                </label>}

                <div className="erp-form-group">
                  <label>Subject <span className="attendance-required-mark">*</span></label>
                  <ProjectSelect
                    className="erp-select"
                    forceCustom
                    menuPlacement="bottom"
                    aria-label="Attendance subject" value={takeScope.subjectId || ''}
                    disabled={savingSession || loadingSubjects || !takeScope.sectionId || Boolean(takeScope.timetableEntryId)}
                    onChange={(e) => {
                      const selectedVal = e.target.value
                      const selectedSub = availableSubjects.find(sub => String(getSubjectId(sub) ?? '') === String(selectedVal))
                      if (selectedSub) {
                        const subName = selectedSub.subjectName || selectedSub.name || ''
                        const subCode = selectedSub.subjectCode || selectedSub.code || ''
                        const subId = String(getSubjectId(selectedSub) ?? '')

                        changeTakeScope(prev=>({...prev,subjectId:subId,subject:subName,subjectCode:subCode,facultyId:isFaculty ? ownFacultyId : '',faculty:isFaculty ? branchFaculty[0]?.fullName || branchFaculty[0]?.name || '' : ''}))
                      } else {
                        changeTakeScope(prev => ({ ...prev, subjectId: '', subject: '', subjectCode: '' }))
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

                {!isFaculty && <div className="erp-form-group">
                  <label>Faculty In-Charge <span className="attendance-required-mark">*</span></label>
                  <ProjectSelect
                    className="erp-select"
                    forceCustom
                    menuPlacement="bottom"
                    aria-label="Attendance faculty" value={takeScope.facultyId || ''}
                    disabled={savingSession || loadingFaculty || !takeScope.branchId || Boolean(takeScope.timetableEntryId)}
                    onChange={(e) => {
                      const selectedFaculty = activeFaculty.find(member => String(member.id || member.facultyId) === String(e.target.value))
                      changeTakeScope(prev => ({ ...prev, facultyId: e.target.value, faculty: selectedFaculty?.fullName || '' }))
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
                </div>}
              </div>



              {/* Roster Marking Grid / Loading / Empty State */}
              {loadingStudents && (
                <div className="attendance-marking-section">
                  <p>Loading Student Roster...</p>
                </div>
              )}

              {!loadingStudents && !rosterError && takeScope.courseId && takeScope.branchId && takeScope.semesterId && takeScope.sectionId && markingStudents.length === 0 && (
                <div className="attendance-marking-section">
                  <p>No students found for the selected section/scope.</p>
                  <small>You can assign students in Section Management or select another section.</small>
                </div>
              )}

              {!loadingStudents && markingStudents.length > 0 && (
                <div className="attendance-marking-section">
                  <div className="attendance-marking-header">
                    <h3>Student Roster ({markingStudents.length})</h3>
                    {lockedSession && <p role="status">This session is {String(loadedSession.sessionStatus).toLowerCase()}. Saved attendance is shown below.</p>}
                    {!lockedSession && <div className="attendance-bulk-buttons"><button type="button" className="erp-btn erp-btn--secondary" disabled={savingSession || !selectedStudents.length} onClick={() => handleMarkAll('Present', true)}>Selected Present</button><button type="button" className="erp-btn erp-btn--secondary" disabled={savingSession || !selectedStudents.length} onClick={() => handleMarkAll('Absent', true)}>Selected Absent</button><button type="button" className="erp-btn erp-btn--secondary" disabled={savingSession || !dirty} onClick={() => setMarkingStudents(originalRoster.current)}>Reset Changes</button>
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
                    </div>}
                  </div>

                  <div className="erp-table-responsive">
                    <table className="erp-table attendance-marking-table">
                      <thead>
                        <tr>
                          <th scope="col">Select</th>
                          <th>Roll Number</th>
                          <th>Student Name</th>
                          <th>Admission Number</th>
                          <th>Attendance Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {markingStudents.map((s, idx) => (
                          <tr key={s.studentId || idx}>
                            <td><input type="checkbox" aria-label={`Select ${s.name}`} disabled={savingSession || lockedSession || Boolean(s.attendanceDetailId)} checked={selectedStudents.includes(s.studentId)} onChange={event => setSelectedStudents(current => event.target.checked ? [...current, s.studentId] : current.filter(id => id !== s.studentId))} /></td>
                            <td><strong>{s.rollNumber || s.id}</strong></td>
                            <td>{s.name}</td>
                            <td>{s.admissionNumber || '—'}</td>
                            <td>
                              <div className="attendance-status-radios">
                                {['Present', 'Absent', 'Late', 'Excused'].map((statusOption) => (
                                  <label
                                    key={statusOption}
                                    className={`attendance-radio-chip ${s.status === statusOption ? `active active--${statusOption.toLowerCase()}` : ''}`}
                                  >
                                    <input
                                      type="radio"
                                      disabled={savingSession || lockedSession || Boolean(s.attendanceDetailId)} name={`status-${s.studentId}`}
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


                </div>
              )}
            </div>
           </>}</ViewDialog>
        )}

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
                  className="attendance-register-empty"
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
          <section className="attendance-content attendance-reports">
            {reportLoading && <p role="status">Loading attendance report records…</p>}{reportError && <p role="alert">{reportError} <button type="button" onClick={()=>setReportAttempt(value=>value+1)}>Retry attendance reports</button></p>}
            <div className="attendance-report-nav" role="tablist" aria-label="Attendance report sections">
              <button type="button" role="tab" aria-selected={reportView === 'subject'} className={reportView === 'subject' ? 'active' : ''} onClick={() => setReportView('subject')}>Subject-wise</button>
              <button type="button" role="tab" aria-selected={reportView === 'daily'} className={reportView === 'daily' ? 'active' : ''} onClick={() => setReportView('daily')}>Daily</button><button type="button" role="tab" aria-selected={reportView === 'weekly'} className={reportView === 'weekly' ? 'active' : ''} onClick={() => setReportView('weekly')}>Weekly</button><button type="button" role="tab" aria-selected={reportView === 'monthly'} className={reportView === 'monthly' ? 'active' : ''} onClick={() => setReportView('monthly')}>Monthly</button>
              <button type="button" role="tab" aria-selected={reportView === 'student'} className={reportView === 'student' ? 'active' : ''} onClick={() => setReportView('student')}>Student Report</button>
            </div>
            {reportView === 'subject' && <article className="erp-card"><ReportTable rows={subjectAttendance} empty="No confirmed subject sessions." columns={[
              ['Subject', row => row.subject], ['Code', row => row.code], ['Faculty', row => row.faculty], ['Conducted Sessions', row => row.sessions],
              ['Present Marks', row => row.present], ['Absent Marks', row => row.absent], ['Attendance', row => <AttendanceRateBadge rate={row.rate} />],
              ['Status', row => row.rate == null ? 'Unavailable' : row.rate < 75 ? 'Below threshold' : 'Meets threshold'],
            ]} /></article>}
            {['daily', 'weekly', 'monthly'].includes(reportView) && !reportLoading && !reportError && <article className="erp-card">
              <div className="erp-card-header"><label>{reportView === 'monthly' ? 'Month' : reportView === 'weekly' ? 'Week starting' : 'Date'}
                <select className="erp-select" value={selectedPeriod || ''} onChange={event => setMatrixPeriod(event.target.value)}>
                  {!matrixPeriods.length && <option value="">No confirmed sessions</option>}
                  {matrixPeriods.map(period => <option key={period}>{period}</option>)}
                </select>
              </label></div>
              <ReportTable rows={matrixRows} columns={matrixColumns} empty="No confirmed attendance for this period." />
            </article>}
            {reportView === 'student' && !reportLoading && !reportError && <article className="erp-card"><div className="erp-card-header"><div><h2 className="erp-card-title">Student Attendance Report</h2><p className="erp-card-subtitle">Student-wise attendance calculated from all recorded subject sessions.</p></div><label>Student<select value={reportStudent} onChange={event=>setReportStudent(event.target.value)}><option value="">All students</option>{studentAttendance.map(row=><option value={row.id} key={row.id}>{row.name} · {row.rollNumber}</option>)}</select></label></div><ReportTable rows={filteredStudentAttendance} empty="No student attendance records available." columns={[['Roll Number', row => row.rollNumber], ['Student', row => row.name], ['Course / Branch', row => `${row.course} | ${row.branch}`], ['Present / Total', row => `${row.present} / ${row.total}`], ['Attendance', row => <AttendanceRateBadge rate={row.rate} criticalThreshold={65} />], ['Action', row => <button type="button" className="erp-btn erp-btn--icon" title="View Student Report" aria-label="View Student Report" onClick={() => setSelectedStudentReport(row)}><FiEye /></button>]]} /></article>}
          </section>
        )}

        {/* TAB 3: Shortage List */}
        {activeTab === 'shortage' && <section className="erp-card attendance-content attendance-shortage-table">
          {reportError ? <p role="alert">{reportError} <button type="button" onClick={() => setReportAttempt(value => value + 1)}>Retry shortages</button></p> : reportLoading ? <p role="status">Loading confirmed attendance…</p> : <>
            <ReportTable rows={shortageStudents.slice((shortagePage - 1) * pageSize, shortagePage * pageSize)}
              empty={studentAttendance.length ? 'No students currently fall below the attendance threshold.' : 'No attendance records are available to calculate shortages.'}
              columns={[
                ['Roll Number', row => row.rollNumber], ['Student', row => row.name],
                ['Course / Branch', row => row.course + ' / ' + row.branch],
                ['Semester / Section', row => [row.semester, row.section].filter(Boolean).join(' / ')],
                ['Conducted', row => row.total], ['Attended', row => row.present],
                ['Attendance', row => <AttendanceRateBadge rate={Number(row.rate.toFixed(2))} />],
                ['Deficit', row => row.deficit.toFixed(2) + ' pp'],
                ['Sessions Needed', row => row.recovery],
                ['Status', row => <StatusBadge status={row.rate < 65 ? 'Danger' : 'Warning'} label={row.rate < 65 ? 'Critical' : 'Shortage'} />],
                ['Actions', row => <button type="button" className="erp-btn erp-btn--icon" aria-label={'View attendance for ' + row.name} onClick={() => setSelectedStudentReport(row)}><FiEye /></button>],
              ]} />
            {shortagePageCount > 1 && <TablePagination page={shortagePage} totalPages={shortagePageCount} onPageChange={setCurrentPage} />}
          </>}
        </section>}

        {/* View Details Dialog */}
        {selectedStudentReport && (
          <ViewDialog
            title={`Student Attendance: ${selectedStudentReport.name || 'Student'}`}
            subtitle={`${selectedStudentReport.rollNumber || selectedStudentReport.id} | ${selectedStudentReport.course || '-'} / ${selectedStudentReport.branch || '-'}`}
            icon={FiUsers}
            onClose={() => setSelectedStudentReport(null)}
          >
            <div className="attendance-student-detail">
              <div className="attendance-student-metric"><small>Attendance</small><strong className={selectedStudentReport.rate < 65 ? 'text-danger' : selectedStudentReport.rate < 75 ? 'text-warning' : 'text-success'}>{Number(selectedStudentReport.rate.toFixed(2))}%</strong><StatusBadge status={selectedStudentReport.rate >= 75 ? 'Active' : selectedStudentReport.rate >= 65 ? 'Warning' : 'Danger'} label={selectedStudentReport.rate >= 75 ? 'Eligible' : selectedStudentReport.rate >= 65 ? 'Shortage' : 'Critical'} /></div>
              <InfoCard icon={FiCalendar} title="Attendance Summary" items={[{ label: 'Classes attended', value: selectedStudentReport.present ?? 0 }, { label: 'Classes recorded', value: selectedStudentReport.total ?? 0 }, { label: 'Required attendance', value: '75%' }, { label: 'Shortfall', value: `${Math.max(0, 75 - Number(selectedStudentReport.rate || 0))}%` }]} />
            </div>
            {[['Subject-wise attendance', 'subject'], ['Monthly trends', 'month']].map(([title, field]) => <section key={field}>
              <h3>{title}</h3>
              <ReportTable rows={selectedStudentGroups(field)} empty="No confirmed marks in this view." columns={[
                [field === 'month' ? 'Month' : 'Subject', row => row.id], ['Attended', row => row.attended], ['Conducted', row => row.total],
                ['Attendance %', row => (row.attended * 100 / row.total).toFixed(2) + '%'],
              ]} />
            </section>)}
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
