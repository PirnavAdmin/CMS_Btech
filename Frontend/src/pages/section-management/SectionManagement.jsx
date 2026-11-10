import SectionsRoomsHeader from '../../components/SectionsRoomsHeader'
import PageHeader from '../../components/PageHeader'
import ViewDialog from '../../components/ViewDialog'
import SharedInfoCard from '../../components/InfoCard'
import StatusConfirmDialog from '../../components/StatusConfirmDialog'
import AsyncState from '../../components/AsyncState'
import { ProjectSelect } from '../../components/SearchableSelect'
import { newestFirst, rememberCreated } from '../../utils/newestFirst'
import { showError, showSuccess, showWarning } from '../../utils/toast'
import useToastState from '../../hooks/useToastState'
import ExportMenu, { PrintDetailsButton } from '../../components/ExportMenu'
import { sectionColumns } from '../../utils/exportColumns'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiArrowRight, FiBookOpen, FiCheckCircle, FiClock, FiEdit2, FiEye, FiFilter, FiGrid, FiLayers, FiPlus, FiSearch, FiToggleLeft, FiToggleRight, FiTrash2, FiUser, FiUserPlus, FiUsers, FiX } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import FilterPanel from '../../components/FilterPanel'
import SearchableSelect from '../../components/SearchableSelect'
import CompactSummary from '../../components/CompactSummary'
import StatusBadge from '../../components/StatusBadge'
import { showDeactivationBlocked } from '../../components/DeactivationBlockedDialog'
import { academicYearApi, branchApi, courseApi, sectionAllocationApi, sectionApi, sectionAssignmentApi, studentAdmissionApi, studentProfilesApi } from '../../api/apiEndpoints'
import { getSemesters } from '../../auth/collegeApi'
import { getActiveAcademicYears, normalizeAcademicYear } from '../../utils/academicYearUtils'
import { branchTypeLabel } from '../../utils/semesterUtils'
import { sectionSemesterOptions, isSectionYearActive } from '../../utils/sectionMappingOptions'
import { calculateCompletion, completionSchemas } from '../../utils/recordCompletion'
import eventBus, { ERP_EVENTS } from '../../services/eventBus'
import facultyService, { normalizeFaculty } from '../../services/facultyService'
import studentService from '../../services/studentService'
import { sectionStudentProfiles, matchesSectionStudent } from '../../utils/sectionStudents'
import roomService from '../../services/roomService'
import { useAcademic } from '../../context/AcademicContext'
import './SectionManagement.css'
import '../../styles/directory-search.css'

const PAGE_SIZE = 5
const emptyForm = { name: '', code: '', courseId: '', branchId: '', semesterId: '', academicYearId: '', capacity: '', facultyAdvisorEmployeeProfileId: '', advisor: '', room: '', status: '', startDate: '', endDate: '' }
const clean = (value) => value !== null && value !== undefined && !['', 'null', 'undefined', 'not provided', 'not set', '?'].includes(String(value).trim().toLowerCase())
const idOf = (item = {}, ...keys) => keys.map((key) => item?.[key]).find((value) => clean(value)) ?? ''
const sem = (value) => /^\d+$/.test(String(value)) ? `Semester ${value}` : String(value || '')
const apiError = (error, fallback) => error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback
const responseList = (response) => {
  let current = response
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth += 1) {
    if (Array.isArray(current)) return current
    const records = current.items ?? current.content ?? current.results ?? current.records
    if (Array.isArray(records)) return records
    current = current.data
  }
  return []
}
const responseRecord = (response) => {
  const data = response?.data?.data ?? response?.data ?? response
  if (Array.isArray(data)) return data[0] || {}
  return data && typeof data === 'object' ? data : {}
}

const courseName = (item = {}) => item.courseName ?? item.CourseName ?? item.name ?? item.Name ?? item.shortName ?? item.courseShortName ?? item.code ?? item.courseCode ?? ''
const courseCode = (item = {}) => item.courseCode ?? item.CourseCode ?? item.code ?? item.Code ?? item.shortName ?? item.courseShortName ?? ''
const branchName = (item = {}) => item.branchName ?? item.BranchName ?? item.name ?? item.Name ?? item.shortName ?? item.branchShortName ?? item.code ?? item.branchCode ?? ''
const branchCode = (item = {}) => item.branchCode ?? item.BranchCode ?? item.code ?? item.Code ?? item.shortName ?? item.branchShortName ?? ''
const yearName = (item = {}) => item.academicYearName ?? item.name ?? item.academicYear ?? item.code ?? ''
const normalizeCourse = (item = {}) => ({ ...item, id: idOf(item, 'courseId', 'CourseId', 'course_id', 'id', 'Id'), name: courseName(item), code: courseCode(item), collegeId: idOf(item, 'collegeId', 'CollegeId', 'college_id') || item.college?.collegeId || item.college?.id || '', departmentId: idOf(item, 'departmentId', 'DepartmentId', 'department_id') || item.department?.departmentId || item.department?.id || '', departmentName: item.departmentName ?? item.DepartmentName ?? item.department_name ?? item.department?.departmentName ?? item.department?.name ?? item.department ?? '' })
const normalizeBranch = (item = {}) => ({ ...item, id: idOf(item, 'branchId', 'BranchId', 'branch_id', 'id', 'Id'), courseId: idOf(item, 'courseId', 'CourseId', 'course_id') || item.course?.courseId || item.course?.id || '', name: branchName(item), code: branchCode(item), branchType: branchTypeLabel(item), collegeId: idOf(item, 'collegeId', 'CollegeId', 'college_id') || item.college?.collegeId || item.college?.id || '', departmentId: idOf(item, 'departmentId', 'DepartmentId', 'department_id') || item.department?.departmentId || item.department?.id || '', departmentName: item.departmentName ?? item.DepartmentName ?? item.department_name ?? item.department?.departmentName ?? item.department?.name ?? item.department ?? '' })
const normalizeSemester = (item = {}) => {
  const number = item.semesterNumber ?? item.semester?.semesterNumber ?? item.number
  return { ...item, id: idOf(item, 'semesterId', 'SemesterId', 'semester_id', 'courseStructureId', 'structureId', 'id') || item.semester?.semesterId || item.semester?.id || '', name: number ? `Semester ${number}` : sem(item.semesterName ?? item.semester?.semesterName ?? item.semester?.name ?? item.name ?? ''), number: Number(number || String(item.semesterName || '').match(/\d+/)?.[0] || 0), courseId: idOf(item, 'courseId', 'CourseId', 'course_id') || item.course?.courseId || item.course?.id || '', branchId: idOf(item, 'branchId', 'BranchId', 'branch_id') || item.branch?.branchId || item.branch?.id || '', academicYearId: idOf(item, 'academicYearId', 'AcademicYearId', 'academic_year_id', 'yearId') || item.academicYear?.academicYearId || item.academicYear?.id || '', academicYearName: item.academicYearName ?? item.academicYear?.academicYearName ?? item.academicYear?.name ?? item.yearName ?? '' }
}
const normalizeAssignment = (item = {}) => ({ id: item.assignmentId ?? item.id ?? item.studentId, sectionId: item.sectionId ?? item.section_id ?? '', studentId: item.studentId ?? item.student_id ?? item.student?.studentId ?? item.student?.id ?? item.enrollmentNo ?? '', studentName: item.studentName ?? item.fullName ?? item.student_name ?? item.student?.fullName ?? item.student?.name ?? item.name ?? '', enrollmentNo: item.enrollmentNo ?? item.studentCode ?? item.registrationNumber ?? item.rollNumber ?? item.studentId ?? '' })
const sameStudent = (assignment = {}, student = {}) => [assignment.studentId, assignment.enrollmentNo, assignment.studentCode, assignment.registrationNumber].filter(clean).some((value) => [student.id, student.code, student.studentCode, student.registrationNumber, student.rollNumber, student.admissionNumber].filter(clean).some((candidate) => String(candidate).split('/').map((part) => part.trim()).includes(String(value).trim())))
const sameMapping = (left, right) => ['courseId', 'branchId', 'semesterId', 'academicYearId'].every((key) => clean(left?.[key]) && clean(right?.[key]) ? String(left[key]) === String(right[key]) : false)
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

const teacherCandidatesForBranch = (faculty = [], branchName = '', branchCode = '', branchId = '', departmentName = '', departmentId = '') => {
  const targetKey = normalizeBranchKey(branchCode || branchName)
  const departmentKey = normalizeBranchKey(departmentName)
  return faculty
    .map((member) => normalizeFaculty(member))
    .filter((member) => {
      if (member.employeeCategory === 'Non-Teaching') return false
      const unavailable = ['inactive', 'resigned', 'retired'].includes(String(member.employmentStatus || member.status || '').trim().toLowerCase())
      if (unavailable) return false

      if (!targetKey && !branchId && !departmentKey && !departmentId) return true

      const memberBranchKey = normalizeBranchKey(member.branchCode || member.branch || member.branchName || '')
      const memberDeptKey = normalizeBranchKey(member.departmentName || member.department || '')
      const memberSpecKey = normalizeBranchKey(member.specialization || '')
      const memberDepartmentId = member.departmentId || member.DepartmentId || member.department_id || ''

      const matchesBranch = Boolean(
        (member.branchId && branchId && String(member.branchId) === String(branchId)) ||
        (memberBranchKey && memberBranchKey === targetKey) ||
        (memberDeptKey && memberDeptKey === targetKey) ||
        (memberDepartmentId && departmentId && String(memberDepartmentId) === String(departmentId)) ||
        (memberDeptKey && departmentKey && memberDeptKey === departmentKey) ||
        (memberSpecKey && (memberSpecKey === targetKey || memberSpecKey.includes(targetKey)))
      )

      // The class-teacher candidates endpoint is already scoped to the
      // section's college. Its DTO only includes DepartmentName (not branch
      // metadata), so don't discard valid college faculty when that name
      // cannot be matched to the section's branch code.
      const hasBranchMetadata = Boolean(member.branchId || member.branchCode || member.branchName || member.branch)
      const hasDepartmentId = Boolean(memberDepartmentId && departmentId)
      return matchesBranch || (!hasBranchMetadata && !hasDepartmentId)
    })
    .map((member) => ({
      ...member,
      // Assignment APIs require employee_profiles.employee_profile_id.
      // FacultyId/UserId are different keys and must never be substituted.
      employeeProfileId: member.employeeProfileId ?? member.EmployeeProfileId ?? member.employee_profile_id ?? '',
      fullName: member.fullName || member.FullName || member.name || '',
      employeeCode: member.employeeCode ?? member.EmployeeCode ?? member.employeeId ?? member.facultyCode ?? '',
      designation: member.designation || member.Designation || member.designationName || member.title || '',
    }))
    .filter((member) => clean(member.employeeProfileId) && clean(member.fullName))
}
const teacherCandidatesForDepartment = teacherCandidatesForBranch

const makeLookups = (courses, branches, semesters, years) => ({ courseById: new Map(courses.map((item) => [String(item.id), item])), branchById: new Map(branches.map((item) => [String(item.id), item])), semesterById: new Map(semesters.map((item) => [String(item.id), item])), yearById: new Map(years.map((item) => [String(item.id), item])) })
const normalizeSection = (item = {}, lookups = {}) => {
  const courseId = item.courseId ?? item.course?.courseId ?? item.course?.id ?? ''
  const branchId = item.branchId ?? item.branch?.branchId ?? item.branch?.id ?? ''
  const semesterId = item.semesterId ?? item.semester?.semesterId ?? item.semester?.id ?? ''
  const academicYearId = item.academicYearId ?? item.academicYear?.academicYearId ?? item.academicYear?.id ?? ''
  const course = lookups.courseById?.get(String(courseId))
  const branch = lookups.branchById?.get(String(branchId))
  const semester = lookups.semesterById?.get(String(semesterId))
  const year = lookups.yearById?.get(String(academicYearId))
  const capacity = Number(item.capacity) || 0
  const currentStrength = Number(item.currentStrength ?? item.assignedStudents ?? item.studentCount ?? 0) || 0
  const normalized = { ...item, id: item.sectionId ?? item.id ?? '', name: item.sectionName ?? item.name ?? '', code: item.sectionCode ?? item.code ?? '', courseId, course: item.courseName ?? item.course?.courseName ?? item.course?.name ?? course?.name ?? '', courseCode: item.courseCode ?? item.course?.courseCode ?? course?.code ?? '', branchId, branch: item.branchName ?? item.branch?.branchName ?? item.branch?.name ?? branch?.name ?? '', branchCode: item.branchCode ?? item.branch?.branchCode ?? branch?.code ?? '', branchType: branchTypeLabel(item.branch ?? branch ?? { branchType: item.branchType }), semesterId, semester: sem(item.semesterName ?? item.semester?.semesterName ?? semester?.name ?? item.semesterNumber ?? ''), semesterNumber: item.semesterNumber ?? semester?.number ?? '', academicYearId, academicYear: item.academicYearName ?? item.academicYear?.academicYearName ?? item.academicYear?.name ?? yearName(year), collegeId: item.collegeId ?? branch?.collegeId ?? course?.collegeId ?? '', departmentId: item.departmentId ?? branch?.departmentId ?? course?.departmentId ?? '', departmentName: item.departmentName ?? item.department?.departmentName ?? item.department?.name ?? branch?.departmentName ?? course?.departmentName ?? '', capacity, currentStrength, availableSeats: Number(item.availableSeats ?? Math.max(capacity - currentStrength, 0)), advisor: item.advisor ?? item.facultyAdvisorName ?? item.classTeacherName ?? '', facultyAdvisorEmployeeProfileId: item.facultyAdvisorEmployeeProfileId ?? item.classTeacherEmployeeProfileId ?? '', room: item.room ?? item.classRoom ?? '', status: item.status === false || item.status === 0 || item.status === 'Inactive' ? 'Inactive' : 'Active' }
  return { ...normalized, completion: calculateCompletion(completionSchemas.section, normalized) }
}

async function loadSources() {
  const [sectionRows, courseRows, branchRows, yearRows, semesterRows, assignmentRows, summaryData, facultyRows] = await Promise.all([sectionApi.getAll(), courseApi.getAll(), branchApi.getAll(), academicYearApi.getAll(), getSemesters(), sectionAssignmentApi.list(), sectionApi.summary().catch(() => null), facultyService.list().catch(() => [])])
  const courses = courseRows.map(normalizeCourse).filter((item) => item.id && item.name)
  const branches = branchRows.map(normalizeBranch).filter((item) => item.id && item.name)
  const years = yearRows.map(normalizeAcademicYear).filter((item) => item.id && item.name)
  const semesters = responseList(semesterRows).map(normalizeSemester).filter((item) => item.id && item.name)
  const sections = sectionRows.map((item) => normalizeSection(item, makeLookups(courses, branches, semesters, years)))
  return { courses, branches, years, semesters, sections, assignments: assignmentRows.map(normalizeAssignment), summary: summaryData, faculty: facultyRows }
}

const Page = ({ children }) => <DashboardLayout><main className="section-management">{children}</main></DashboardLayout>
const Header = ({ title, text, children }) => <PageHeader title={title} subtitle={text}>{children}</PageHeader>
const Status = ({ value }) => <span className={`section-status ${String(value || '').toLowerCase()}`}>{value}</span>
const ReadOnly = ({ value, placeholder = 'Resolved after selection' }) => <input value={value || ''} placeholder={placeholder} readOnly />
const Field = ({ label, error, children }) => <label className={`section-field ${error ? 'invalid' : ''}`}><span>{label.endsWith(' *') ? <>{label.slice(0, -2)} <b className="section-required">*</b></> : label}</span>{children}{error && <small role="alert">{error}</small>}</label>
function InfoRows({ rows }) { const visible = rows.filter(([, value]) => clean(value)); if (!visible.length) return null; return <div className="cm-info-rows sa-detail-kv-grid erp-view-grid">{visible.map(([label, value]) => <div className="cm-info-row sa-kv-cell erp-view-field" key={label}><span className="cm-info-label sa-kv-label erp-view-label">{label}</span><strong className="cm-info-val sa-kv-val erp-view-value">{value}</strong></div>)}</div> }
function InfoCard({ icon, title, rows }) { return <SharedInfoCard icon={icon} title={title} rows={rows} /> }
function Empty({ icon: Icon, title, action, isError = false }) { return <div className="section-empty" role={isError ? 'alert' : undefined} data-message-tone={isError ? 'error' : undefined}><Icon /><h3>{title}</h3>{action}</div> }

function SectionList({ initialViewId = null }) {
  const navigate = useNavigate()
  const [viewId, setViewId] = useState(initialViewId)
  const closeView = () => { setViewId(null); if (initialViewId) navigate('/section-management') }
  const [statusSaving, setStatusSaving] = useState(false)
  const { scopeRecords, selectedCollegeId, selectedAcademicYearId } = useAcademic()
  const [sections, setSections] = useState([]), [assignments, setAssignments] = useState([]), [summaryData, setSummaryData] = useState(null), [faculty, setFaculty] = useState([]), [rooms, setRooms] = useState([])
  const [filters, setFilters] = useState({ query: '', course: '', branch: '', semester: '', status: '', academicYear: '' }), [page, setPage] = useState(1), [loading, setLoading] = useState(true), [error, setError] = useToastState('', 'error'), [, setToast] = useToastState('', 'success'), [assigning, setAssigning] = useState(null), [confirmAction, setConfirmAction] = useState(null)
  const load = useCallback(async () => { setLoading(true); setError(''); try { const [data, roomRows] = await Promise.all([loadSources(), typeof roomService.getRooms === 'function' ? roomService.getRooms().catch(() => []) : Promise.resolve([])]); setSections(newestFirst('sections', data.sections)); setAssignments(data.assignments); setSummaryData(data.summary); setFaculty(data.faculty); setRooms(Array.isArray(roomRows) ? roomRows : []) } catch (requestError) { setError(apiError(requestError, 'Unable to load sections.')) } finally { setLoading(false) } }, [setError])
  useEffect(() => { load() }, [load])
  const count = (sectionId) => assignments.filter((item) => String(item.sectionId) === String(sectionId)).length

  const scopedSections = useMemo(() => {
    return scopeRecords(sections).filter((item) => {
      const matchesCollege = !selectedCollegeId || !item.collegeId || String(item.collegeId) === String(selectedCollegeId)
      const matchesYear = !selectedAcademicYearId || !item.academicYearId || String(item.academicYearId) === String(selectedAcademicYearId)
      return matchesCollege && matchesYear
    })
  }, [sections, scopeRecords, selectedCollegeId, selectedAcademicYearId])

  const courses = [...new Set(scopedSections.map((item) => item.course).filter(Boolean))]
  const branches = [...new Set(scopedSections.filter((item) => !filters.course || item.course === filters.course).map((item) => item.branch).filter(Boolean))]
  const semesters = [...new Set(scopedSections.map((item) => item.semester).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const years = [...new Set(scopedSections.map((item) => item.academicYear).filter(Boolean))]
  const filtered = useMemo(() => scopedSections.filter((item) => `${item.name} ${item.code} ${item.course} ${item.courseCode} ${item.branch} ${item.branchCode} ${item.semester} ${item.academicYear} ${item.advisor}`.toLowerCase().includes(filters.query.toLowerCase().trim()) && (!filters.course || item.course === filters.course) && (!filters.branch || item.branch === filters.branch) && (!filters.semester || item.semester === filters.semester) && (!filters.academicYear || item.academicYear === filters.academicYear) && (!filters.status || item.status === filters.status)), [scopedSections, filters])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), currentPage = Math.min(page, pageCount), visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const summary = { total: scopedSections.length, active: scopedSections.filter((item) => item.status === 'Active').length, inactive: scopedSections.filter((item) => item.status === 'Inactive').length, students: scopedSections.reduce((sum, item) => sum + Math.max(Number(item.currentStrength || 0), count(item.id)), 0) }
  const hasRooms = scopeRecords(rooms).some(room => !['inactive', 'maintenance', 'unavailable'].includes(String(room.status || '').toLowerCase()))
  const changeFilter = (key, value) => { setFilters((current) => ({ ...current, [key]: value, ...(key === 'course' ? { branch: '' } : {}) })); setPage(1) }
  const clearFilters = () => { setFilters({ query: '', course: '', branch: '', semester: '', status: '', academicYear: '' }); setPage(1) }
  const openAssign = async (section) => { try { const latest = (await sectionAssignmentApi.listBySection(section.id)).map((item) => normalizeAssignment({ ...item, sectionId: section.id })); setAssignments((current) => [...current.filter((item) => String(item.sectionId) !== String(section.id)), ...latest]); setAssigning({ ...section, currentStrength: latest.length }) } catch (requestError) { setToast(apiError(requestError, 'Unable to load section assignments.'), 'error') } }
  const assignStudents = async (studentIds) => {
    const current = (await sectionAssignmentApi.listBySection(assigning.id)).map(normalizeAssignment)
    const latestSection = normalizeSection(responseRecord(await sectionApi.getById(assigning.id)))
    if (latestSection.status !== 'Active') throw new Error('Students can only be assigned to an active section.')
    const ids = [...new Set(studentIds.map(String))]
    if (!ids.length || ids.some((studentId) => !/^\d+$/.test(studentId))) throw new Error('Select valid students before assigning them.')
    if (ids.some((studentId) => current.some((item) => String(item.studentId) === studentId))) throw new Error('One or more students are already assigned to this section. Refresh the section and try again.')
    if (Math.max(current.length, latestSection.currentStrength) + ids.length > latestSection.capacity) throw new Error(`Only ${Math.max(latestSection.capacity - current.length, 0)} seats are available in ${assigning.name}.`)
    await sectionAssignmentApi.assignMany(assigning.id, ids)
    const latest = (await sectionAssignmentApi.listBySection(assigning.id)).map((item) => normalizeAssignment({ ...item, sectionId: assigning.id }))
    setAssignments((rows) => [...rows.filter((item) => String(item.sectionId) !== String(assigning.id)), ...latest])
    setSections((rows) => rows.map((row) => String(row.id) === String(assigning.id) ? { ...row, currentStrength: latest.length } : row))
    setSummaryData(null)
  }
  const removeAssignment = async (assignment) => {
    if (!clean(assignment.studentId)) throw new Error('Unable to remove this student because their student ID is missing.')
    await sectionAssignmentApi.remove(assignment.sectionId, assignment.studentId)
    const remainingCount = assignments.filter((item) => String(item.sectionId) === String(assignment.sectionId) && String(item.studentId) !== String(assignment.studentId)).length
    setAssignments((rows) => rows.filter((item) => String(item.sectionId) !== String(assignment.sectionId) || String(item.studentId) !== String(assignment.studentId)))
    setSections((rows) => rows.map((row) => String(row.id) === String(assignment.sectionId) ? { ...row, currentStrength: remainingCount } : row))
    setSummaryData(null)
    setToast(`${assignment.studentName} removed from the section.`)
    let latest
    try {
      latest = (await sectionAssignmentApi.listBySection(assignment.sectionId)).map((item) => normalizeAssignment({ ...item, sectionId: assignment.sectionId }))
    } catch (requestError) {
      setToast(`Student removed, but the section assignments could not be refreshed: ${apiError(requestError, 'Please reload the section.')}`, 'error')
      return
    }
    setAssignments((rows) => [...rows.filter((item) => String(item.sectionId) !== String(assignment.sectionId)), ...latest])
    setSections((rows) => rows.map((row) => String(row.id) === String(assignment.sectionId) ? { ...row, currentStrength: latest.length } : row))
  }
  const assignTeacher = async (teacher) => {
    if (!teacher?.employeeProfileId) throw new Error('Select a faculty candidate.')
    await sectionAllocationApi.assignTeacher(assigning.id, teacher.employeeProfileId)
    const next = sections.map((item) => item.id === assigning.id ? { ...item, advisor: teacher.fullName, facultyAdvisorEmployeeProfileId: teacher.employeeProfileId } : item)
    setSections(next)
    setAssigning((current) => current ? { ...current, advisor: teacher.fullName, facultyAdvisorEmployeeProfileId: teacher.employeeProfileId } : current)
    setToast(`${teacher.fullName} assigned to ${assigning.name}.`)
  }
  const toggle = async (section) => {
    try {
      const rows = await sectionAssignmentApi.listBySection(section.id)
      const nextStatus = section.status === 'Active' ? 'Inactive' : 'Active'
      if (nextStatus === 'Inactive' && rows.length > 0) {
        showDeactivationBlocked(`Cannot deactivate ${section.name}. ${rows.length} student${rows.length === 1 ? '' : 's'} are assigned to this section.`)
        return
      }
      setConfirmAction({ row: section, nextStatus, assigned: rows.length })
    } catch (error) { setToast(apiError(error, 'Unable to verify the assigned student count.'), 'error') }
  }
  const confirm = async () => { if (statusSaving) return; const { row, nextStatus } = confirmAction; setStatusSaving(true); try { await sectionApi.updateStatus(row.id, nextStatus); eventBus.emit(ERP_EVENTS.ACADEMIC_UPDATED, { sectionId: row.id, status: nextStatus }); setSections(sections.map((item) => item.id === row.id ? { ...item, status: nextStatus } : item)); setSummaryData(null); setToast(`Section ${nextStatus === 'Active' ? 'activated' : 'deactivated'}.`); setConfirmAction(null) } catch (requestError) { setToast(apiError(requestError, 'Unable to update section status.'), 'error') } finally { setStatusSaving(false) } }
  const hasFilters = Object.values(filters).some(Boolean)
  return <Page>

    <SectionsRoomsHeader view="sections" compactSummary={<CompactSummary label="Section summary" items={[{ label: 'Total', value: summary.total }, { label: 'Active', value: summary.active, tone: 'active' }, { label: 'Inactive', value: summary.inactive, tone: 'inactive' }, { label: 'Students', value: summary.students }]} />} />
    <section className="section-table-card">
      <header className="section-reference-heading">
        <div>
          <h2>Section Directory</h2>
          <p>{filtered.length} records</p>
        </div>
        <div className="directory-export-actions">
          <ExportMenu rows={filtered.map(row => ({ ...row, currentStrength: Math.max(row.currentStrength, count(row.id)) }))} columns={sectionColumns} title="Sections" filename="sections" loading={loading || Boolean(error)} />
          {hasRooms
            ? <Link className="cm-button" to="/section-management/add"><FiPlus /> Add Section</Link>
            : <Link className="cm-button" to="/rooms-management/add"><FiGrid /> Add Room First</Link>}
        </div>
      </header>
      <FilterPanel
        className="section-directory-filters"
        active={hasFilters}
        onClear={clearFilters}
        search={<label className="section-search"><FiSearch aria-hidden="true" /><input aria-label="Search sections" value={filters.query} onChange={(event) => changeFilter('query', event.target.value)} placeholder="Search sections..." /></label>}
        filters={<div className="section-filter-bar">
          <Select label="course" value={filters.course} change={changeFilter} first="All Courses" values={courses} />
          <Select label="branch" value={filters.branch} change={changeFilter} first="All Branches" values={branches} />
          <Select label="semester" value={filters.semester} change={changeFilter} first="All Semesters" values={semesters} />
          <Select label="academicYear" value={filters.academicYear} change={changeFilter} first="All Years" values={years} />
          <Select label="status" value={filters.status} change={changeFilter} first="All Status" values={['Active', 'Inactive']} />
        </div>}
      />
      {loading ? <Empty icon={FiClock} title="Loading sections..." /> : error ? <Empty icon={FiLayers} title={error} action={<button className="section-primary" onClick={load}>Retry</button>} isError /> : visible.length ? (
        <>
          <div className="section-table-wrap">
            <table className="section-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '150px' }}>Section</th>
                  <th style={{ minWidth: '150px' }}>Course</th>
                  <th style={{ minWidth: '150px' }}>Branch</th>
                  <th className="table-center" style={{ width: '100px' }}>Semester</th>
                  <th className="table-center" style={{ width: '130px' }}>Academic Year</th>
                  <th className="table-center" style={{ width: '150px' }}>Strength / Capacity</th>
                  <th className="table-center" style={{ minWidth: '170px', maxWidth: '220px' }}>Faculty Advisor</th>
                  <th style={{ minWidth: '130px' }}>Room</th>
                  <th className="table-center" style={{ width: '115px' }}>Completion</th>
                  <th className="table-center" style={{ width: '120px' }}>Status</th>
                  <th className="table-center" style={{ width: '170px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((section) => {
                  const assigned = Math.max(count(section.id), Number(section.currentStrength || 0))
                  return (
                    <tr key={section.id}>
                      <td style={{ minWidth: '150px' }}>
                        <div className="table-primary-cell">
                          <strong className="table-cell-truncate" title={section.name}>{section.name}</strong>
                          <small>{section.code}</small>
                        </div>
                      </td>
                      <td style={{ minWidth: '150px' }}>
                        <div className="table-primary-cell">
                          <strong title={section.course}>{section.course}</strong>
                          {section.courseCode && <small title={section.courseCode}>{section.courseCode}</small>}
                        </div>
                      </td>
                      <td style={{ minWidth: '150px' }}>
                        <div className="table-primary-cell">
                          <strong title={section.branch}>{section.branch}</strong>
                          {section.branchCode && <small title={section.branchCode}>{section.branchCode}</small>}
                        </div>
                      </td>
                      <td className="table-center" style={{ width: '100px' }}>{section.semester}</td>
                      <td className="table-center" style={{ width: '130px' }}>{section.academicYear}</td>
                      <td className="table-center" style={{ width: '150px' }}>
                        <strong>{assigned} / {section.capacity}</strong>
                        <small>{Math.max(Number(section.capacity || 0) - assigned, 0)} seats available</small>
                      </td>
                      <td className="table-center" style={{ minWidth: '170px', maxWidth: '220px' }}>
                        {section.advisor ? (
                          <strong className="table-cell-truncate" title={section.advisor}>{section.advisor}</strong>
                        ) : (
                          <span className="section-unassigned">Unassigned</span>
                        )}
                      </td>
                      <td style={{ minWidth: '130px' }}>{section.room ? <span className="table-cell-truncate" title={section.room}>{section.room}</span> : <span className="section-unassigned">Not assigned</span>}</td>
                      <td className="table-center" style={{ width: '115px' }}><div className="section-completion"><strong>{section.completion.percent ?? 0}%</strong><small>{section.completion.complete ? 'Complete' : 'In progress'}</small></div></td>
                      <td className="table-center" style={{ width: '120px' }}><StatusBadge value={section.status} /></td>
                      <td className="table-center" style={{ width: '170px' }}>
                        <div className="section-actions table-actions-group">
                          <Link className="table-action-btn action-edit" title={`Edit ${section.name}`} aria-label={`Edit ${section.name}`} to={`/section-management/${section.id}/edit`}><FiEdit2 /></Link>
                          <button type="button" className="table-action-btn action-assign section-assign-action" title={`Assign Students / Faculty to ${section.name}`} aria-label={`Assign Students to ${section.name}`} onClick={() => openAssign(section)}><FiUserPlus /></button>
                          <button type="button" className={`table-action-btn ${section.status === 'Active' ? 'action-activate erp-action-btn--success' : 'action-deactivate erp-action-btn--danger'}`} title={section.status === 'Active' ? `Deactivate ${section.name}` : `Activate ${section.name}`} aria-label={section.status === 'Active' ? `Deactivate ${section.name}` : `Activate ${section.name}`} onClick={() => toggle(section)}>{section.status === 'Active' ? <FiToggleRight data-status="active" /> : <FiToggleLeft data-status="inactive" />}</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={currentPage} pageCount={pageCount} setPage={setPage} />
        </>
      ) : (
        <Empty icon={FiUsers} title="No sections configured" />
      )}
    </section>
    {assigning && <AssignStudents section={assigning} faculty={faculty} assignments={assignments.filter((item) => String(item.sectionId) === String(assigning.id))} allAssignments={assignments} sections={sections} assignMany={assignStudents} assignTeacher={assignTeacher} remove={removeAssignment} close={() => setAssigning(null)} />}
    {confirmAction && <Confirm action={confirmAction} close={() => setConfirmAction(null)} confirm={confirm} busy={statusSaving} />}
    {viewId && <SectionDetails sectionId={viewId} onClose={closeView} />}
  </Page>
}

function SectionForm({ editMode = false }) {
  const { id } = useParams(), navigate = useNavigate()
  const { scopeRecords, selectedCollegeId, selectedCollege, selectedAcademicYearId, selectedAcademicYear } = useAcademic()
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')
  const [masters, setMasters] = useState({ courses: [], branches: [], years: [], semesters: [] }), [sections, setSections] = useState([]), [assignments, setAssignments] = useState([]), [faculty, setFaculty] = useState([]), [rooms, setRooms] = useState([])
  const semesterRequest = useRef(0)
  const legacy = useRef({})
  const originalRoom = useRef('')
  const [formTab, setFormTab] = useState(editMode ? 'details' : 'mapping')
  const scopedCourses = useMemo(() => scopeRecords(masters.courses).filter(item => (item.status !== 'Inactive' && item.status !== 0 && item.status !== false && item.isActive !== false) || String(item.id) === String(form.courseId)), [scopeRecords, masters.courses, form.courseId])
  const course = scopedCourses.find((item) => String(item.id) === String(form.courseId))
  const branches = useMemo(() => scopeRecords(masters.branches, { courses: masters.courses }), [scopeRecords, masters.branches, masters.courses])
  const branch = branches.find((item) => String(item.id) === String(form.branchId))
  const activeYears = useMemo(() => masters.years.filter(isSectionYearActive), [masters.years])
  const academicYearOptions = useMemo(() => {
    const options = new Map(masters.years.map(item => [String(item.id), item]))
    const contextId = selectedAcademicYear?.id ?? selectedAcademicYear?.academicYearId
    if (contextId && !options.has(String(contextId))) {
      options.set(String(contextId), { ...selectedAcademicYear, id: String(contextId), name: yearName(selectedAcademicYear) })
    }
    if (form.academicYearId && form.academicYear && !options.has(String(form.academicYearId))) {
      options.set(String(form.academicYearId), { id: String(form.academicYearId), name: form.academicYear })
    }
    return [...options.values()]
  }, [masters.years, selectedAcademicYear, form.academicYearId, form.academicYear])
  const activeYear = masters.years.find((item) => String(item.id) === String(form.academicYearId)) || (form.academicYear ? { id: form.academicYearId, name: form.academicYear } : null) || (!editMode ? (masters.years.find(y => String(y.id) === String(selectedAcademicYearId)) || selectedAcademicYear || activeYears[0]) : null)
  const semesters = useMemo(() => scopeRecords(masters.semesters, { courses: masters.courses, branches: masters.branches }).filter((item) => (!form.courseId || !item.courseId || String(item.courseId) === String(form.courseId)) && (!form.branchId || !item.branchId || String(item.branchId) === String(form.branchId))), [scopeRecords, masters.semesters, masters.courses, masters.branches, form.courseId, form.branchId])
  const semesterOptions = useMemo(() => sectionSemesterOptions(semesters, { courseId: form.courseId, branchId: form.branchId, academicYearId: form.academicYearId, selectedId: form.semesterId }), [semesters, form.courseId, form.branchId, form.academicYearId, form.semesterId])
  const semester = semesters.find((item) => String(item.id) === String(form.semesterId))
  const assignedCount = Math.max(Number(form.currentStrength || 0), assignments.filter((item) => String(item.sectionId) === String(id)).length)
  const teacherCandidates = useMemo(() => teacherCandidatesForBranch(faculty, branch?.name || form.branch, branch?.code || form.branchCode, branch?.id || form.branchId), [faculty, branch, form.branch, form.branchCode, form.branchId])
  const validAcademicYear = activeYears.find(item => String(item.id) === String(form.academicYearId))
  const noActiveYear = !editMode && activeYears.length === 0
  const yearWarning = noActiveYear ? 'No active academic year is configured. Activate an academic year before creating a section.' : !editMode && form.academicYearId && !validAcademicYear ? 'Choose an active academic year. The selected year is missing or inactive.' : ''
  const canOpenDetailsTab = Boolean(form.courseId && form.branchId && form.semesterId && form.academicYearId && (editMode || validAcademicYear))

  const fetchSemesters = useCallback(async (branchId, academicYearId, courseId) => {
    const request = ++semesterRequest.current
    setMasters((current) => ({ ...current, semesters: [] }))
    if (!branchId) return
    try {
      // The semester search route is returning HTTP 502 in the current API
      // deployment. The list route is healthy, so fetch once and scope it here.
      const response = await getSemesters()
      const matches = (actual, expected) => !actual || String(actual) === String(expected)
      const scopedSemesters = responseList(response).map(normalizeSemester).filter((item) =>
        matches(item.courseId, courseId) && matches(item.branchId, branchId)
      )
      if (request === semesterRequest.current) setMasters((current) => ({ ...current, semesters: scopedSemesters }))
    } catch (error) { if (request === semesterRequest.current) setErrors((current) => ({ ...current, semesterId: apiError(error, 'Unable to load semesters.') })) }
  }, [setErrors])
  const load = useCallback(async () => { setLoading(true); setErrors({}); try { const [data, roomRows] = await Promise.all([loadSources(), typeof roomService.getRooms === 'function' ? roomService.getRooms().catch(() => []) : Promise.resolve([])]); setMasters({ courses: data.courses, branches: data.branches, years: data.years, semesters: [] }); setSections(newestFirst('sections', data.sections)); setAssignments(data.assignments); setFaculty(data.faculty); setRooms(Array.isArray(roomRows) ? roomRows : []); if (editMode && id) { const detail = normalizeSection({ ...(data.sections.find((item) => String(item.id) === String(id)) || {}), ...responseRecord(await sectionApi.getById(id)) }, makeLookups(data.courses, data.branches, [], data.years)); originalRoom.current = detail.room || ''; legacy.current = { sectionType: detail.sectionType ?? detail.type, shift: detail.shift }; const editable = { ...detail }; delete editable.type; delete editable.sectionType; delete editable.shift; setForm({ ...emptyForm, ...editable, courseId: String(detail.courseId || ''), branchId: String(detail.branchId || ''), semesterId: String(detail.semesterId || ''), academicYearId: String(detail.academicYearId || ''), facultyAdvisorEmployeeProfileId: detail.facultyAdvisorEmployeeProfileId || '' }); await fetchSemesters(detail.branchId, detail.academicYearId, detail.courseId) } else { originalRoom.current = ''; const initialYearId = selectedAcademicYearId || (getActiveAcademicYears(data.years)[0]?.id) || ''; setForm(() => ({ ...emptyForm, academicYearId: initialYearId, collegeId: selectedCollegeId || '' })); setErrors({}) } } catch (error) { setErrors({ form: apiError(error, 'Unable to load section form.') }) } finally { setLoading(false) } }, [id, editMode, fetchSemesters, selectedAcademicYearId, selectedCollegeId, setErrors])
  useEffect(() => { load() }, [load])
  const prevCollegeIdRef = useRef(selectedCollegeId)
  useEffect(() => {
    if (editMode) return
    const prev = prevCollegeIdRef.current
    prevCollegeIdRef.current = selectedCollegeId
    if (!prev || prev === selectedCollegeId) return
    // College changed — immediately wipe mapping fields so stale IDs from the
    // old college are not submitted or shown while the async load() is pending.
    semesterRequest.current += 1
    setForm((current) => ({ ...emptyForm, academicYearId: current.academicYearId, collegeId: selectedCollegeId || '' }))
    setMasters((current) => ({ ...current, semesters: [] }))
    setErrors({})
    setFormTab('mapping')
  }, [selectedCollegeId, editMode])
  const setCourse = async (courseId) => { semesterRequest.current += 1; const selectedCourse = scopedCourses.find((item) => String(item.id) === String(courseId)); setForm((current) => ({ ...current, courseId, course: selectedCourse?.name || '', courseCode: selectedCourse?.code || '', branchId: '', branch: '', branchCode: '', semesterId: '', semester: '', name: '', code: '' })); setMasters((current) => ({ ...current, semesters: [] })); setErrors({}) }
  const setBranch = async (branchId) => {
    const selectedBranch = branches.find((item) => String(item.id) === String(branchId))
    const courseId = selectedBranch?.courseId || form.courseId
    const linkedCourse = masters.courses.find((item) => String(item.id) === String(courseId))
    const yearId = selectedAcademicYearId || activeYear?.id || form.academicYearId
    setForm((current) => ({ ...current, courseId, course: linkedCourse?.name || '', courseCode: linkedCourse?.code || '', branchId, branch: selectedBranch?.name || '', branchCode: selectedBranch?.code || '', semesterId: '', semester: '', name: '', code: '', academicYearId: yearId, academicYear: '' }))
    setErrors({})
    await fetchSemesters(branchId, yearId, courseId)
  }
  const setSemester = (semesterId) => {
    const selectedSemester = masters.semesters.find((item) => String(item.id) === String(semesterId))
    setForm((current) => {
      const next = { ...current, semesterId, semester: selectedSemester?.name || '', academicYearId: selectedSemester?.academicYearId || current.academicYearId || selectedAcademicYearId || activeYear?.id, academicYear: selectedSemester?.academicYearName || activeYear?.name || current.academicYear }
      if (editMode) return next
      if (!selectedSemester) return { ...next, name: '', code: '' }
      const existing = sections.filter((item) => sameMapping(item, next))
      const labelNumber = (label) => [...label.toUpperCase()].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0)
      const labelFor = (number) => {
        let label = ''
        for (let n = number; n > 0; n = Math.floor((n - 1) / 26)) label = String.fromCharCode(65 + (n - 1) % 26) + label
        return label
      }
      let number = existing.reduce((highest, item) => {
        const nameLabel = String(item.name || '').trim().match(/^Section\s+([A-Z]+)$/i)?.[1]
        const codeLabel = String(item.code || '').trim().match(/-([A-Z]+)$/i)?.[1]
        return Math.max(highest, nameLabel ? labelNumber(nameLabel) : 0, codeLabel ? labelNumber(codeLabel) : 0)
      }, 0) + 1
      const prefix = String(branch?.code || current.branchCode || branch?.name || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '')
      const semesterNumber = selectedSemester.number || String(selectedSemester.name || '').match(/\d+/)?.[0] || ''
      let name, code
      do {
        const letter = labelFor(number++)
        name = 'Section ' + letter
        code = [prefix, semesterNumber ? 'S' + semesterNumber : '', letter].filter(Boolean).join('-')
      } while (existing.some((item) => String(item.name || '').trim().toLowerCase() === name.toLowerCase() || String(item.code || '').trim().toUpperCase() === code))
      return { ...next, name, code }
    })
    setErrors((current) => ({ ...current, semesterId: '', name: '', code: '' }))
  }
  const setField = (key, value) => { setForm((current) => ({ ...current, [key]: key === 'code' ? value.toUpperCase() : value })); setErrors((current) => ({ ...current, [key]: '' })) }
  const validate = () => { const next = {}; ['courseId', 'branchId', 'semesterId', 'name', 'code', 'status'].forEach((key) => { if (!String(form[key] || '').trim()) next[key] = 'Required.' }); if (!editMode && !String(form.room || '').trim()) next.room = 'Create and select a room before creating a section.'; if (!form.academicYearId && !selectedAcademicYearId) next.academicYearId = yearWarning || 'An academic year is required.'; if (!editMode && !semester) next.semesterId = 'Select a configured semester.'; if (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 1 || Number(form.capacity) > 120) next.capacity = 'Capacity must be a whole number from 1 to 120.'; if (editMode && Number(form.capacity) < assignedCount) next.capacity = `Capacity cannot be below the ${assignedCount} assigned students.`; if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(String(form.code || '').trim().toUpperCase())) next.code = 'Use uppercase letters, numbers, and single hyphens only.'; const mapping = { ...form, academicYearId: form.academicYearId || selectedAcademicYearId || activeYear?.id }; if (sections.some((item) => String(item.id) !== String(id) && sameMapping(item, mapping) && item.name.trim().toLowerCase() === form.name.trim().toLowerCase())) next.name = 'This section already exists for this academic mapping.'; if (sections.some((item) => String(item.id) !== String(id) && sameMapping(item, mapping) && item.code.trim().toLowerCase() === form.code.trim().toLowerCase())) next.code = 'This section code already exists for this academic mapping.'; setErrors(next); if (Object.keys(next).length) showWarning('Correct the highlighted fields before saving the section.'); return !Object.keys(next).length }
  const submit = async (event) => {
    event.preventDefault()
    if (saving || !validate()) return
    setSaving(true)
    try {
      let verifiedYear = activeYear
      if (!editMode) {
        const freshYears = (await academicYearApi.getAll()).map(normalizeAcademicYear)
        setMasters(current => ({ ...current, years: freshYears }))
        verifiedYear = freshYears.find(item => String(item.id) === String(form.academicYearId) && isSectionYearActive(item))
        if (!verifiedYear) {
          setErrors(current => ({ ...current, academicYearId: 'Select an active academic year.', form: 'The selected academic year is missing or inactive. Choose an active year in Academic Mapping.' }))
          setFormTab('mapping')
          return
        }
      }
      const payload = {
        ...form,
        collegeId: branch?.collegeId || course?.collegeId || selectedCollegeId || selectedCollege?.collegeId || selectedCollege?.id || form.collegeId,
        departmentId: branch?.departmentId || course?.departmentId || form.departmentId || null,
        academicYearId: verifiedYear?.id || form.academicYearId,
        academicYear: verifiedYear?.name || form.academicYear,
        ...legacy.current,
        capacity: Number(form.capacity),
      }
      let savedSection = null
      if (editMode) {
        const currentStudents = await sectionAssignmentApi.listBySection(id)
        if (payload.status === 'Inactive' && currentStudents.length > 0) throw new Error(`Cannot deactivate section "${payload.name}". ${currentStudents.length} student${currentStudents.length === 1 ? '' : 's'} are currently enrolled. Transfer or unassign students first.`)
        if (payload.capacity < currentStudents.length) throw new Error('Capacity cannot be below the current assigned student count.')
        const capacityCheck = await sectionApi.validateCapacity(id, payload.capacity)
        if (capacityCheck === false || capacityCheck?.isValid === false) throw new Error(capacityCheck?.message || 'The requested capacity is not allowed.')
        savedSection = await sectionApi.update(id, payload)
        await sectionApi.updateStatus(id, payload.status)
      } else {
        const created = await sectionApi.create(payload)
        savedSection = created
        rememberCreated('sections', created)
        if (payload.status === 'Inactive') await sectionApi.updateStatus(created.id, payload.status)
      }
      if (originalRoom.current && originalRoom.current !== payload.room && typeof roomService.allocateRoom === 'function') {
        const previousRoom = rooms.find(room => String(room.roomNumber || room.roomName || room.id) === String(originalRoom.current))
        if (previousRoom) await roomService.allocateRoom(previousRoom.id, '')
      }
      if (payload.room) {
        const selectedRoom = rooms.find(room => String(room.roomNumber || room.roomName || room.id) === String(payload.room))
        if (selectedRoom && typeof roomService.allocateRoom === 'function') {
          await roomService.allocateRoom(selectedRoom.id, payload.name || 'Section', savedSection?.id ?? savedSection?.sectionId ?? id)
        }
      }
      originalRoom.current = payload.room || ''
      eventBus.emit(ERP_EVENTS.ACADEMIC_UPDATED, { form })
      setNotice(`Section ${editMode ? 'updated' : 'created'} successfully.`)
      setTimeout(() => navigate('/section-management'), 700)
    } catch (error) {
      const message = apiError(error, 'Unable to save section.')
      setErrors(current => ({ ...current, form: message, ...(/academic year.*(?:inactive|exist)/i.test(message) ? { academicYearId: 'Choose an active academic year.' } : {}) }))
      if (/academic year.*(?:inactive|exist)/i.test(message)) setFormTab('mapping')
    } finally {
      setSaving(false)
    }
  }
  if (loading) return <Page><Empty icon={FiClock} title="Loading section form..." /></Page>
  const selectedTeacher = teacherCandidates.find((item) => String(item.employeeProfileId) === String(form.facultyAdvisorEmployeeProfileId))
  const selectedCourseObj = scopedCourses.find((item) => String(item.id) === String(form.courseId))
  const selectedBranchObj = branches.find((item) => String(item.id) === String(form.branchId))
  const selectedSemesterObj = semesters.find((item) => String(item.id) === String(form.semesterId))
  const selectedYearObj = academicYearOptions.find((item) => String(item.id) === String(form.academicYearId)) || activeYear
  const mappingProgress = [form.courseId, form.branchId, form.semesterId, form.academicYearId].filter(Boolean).length
  const mappingReady = canOpenDetailsTab

  const roomLabel = (room) => [room.roomNumber || room.roomName, room.roomName && room.roomName !== room.roomNumber ? room.roomName : '', room.capacity ? `${room.capacity} seats` : ''].filter(Boolean).join(' · ')
  const availableRooms = rooms.filter((room) => {
    const label = room.roomNumber || room.roomName || room.id
    const status = String(room.status || '').toLowerCase()
    const alreadyAssigned = room.assignedSection && String(room.assignedSection) !== String(form.name)
    const fitsCapacity = !form.capacity || !room.capacity || Number(room.capacity) >= Number(form.capacity)
    return (String(label) === String(form.room) || (!alreadyAssigned && !['inactive', 'maintenance', 'unavailable'].includes(status))) && fitsCapacity
  })

  return (
    <Page>
      <ViewDialog
        title={editMode ? 'Edit Section' : 'Add Section'}
        subtitle="Map the academic term, section details, and optional room assignment."
        icon={FiLayers}
        maxWidth="820px"
        showExport={false}
        busy={saving}
        className="section-compact-dialog"
        onClose={() => navigate('/section-management')}
        footerContent={<><button type="button" className="erp-btn erp-btn--secondary" onClick={() => navigate('/section-management')} disabled={saving}>Cancel</button><button type="submit" form="section-compact-form" className="erp-btn erp-btn--primary" disabled={saving}>{saving ? 'Saving...' : editMode ? 'Save Changes' : 'Create Section'}</button></>}
      >
        <form id="section-compact-form" className="section-compact-form" onSubmit={submit} noValidate>
          {errors.form && <div className="section-form-error" role="alert">{errors.form}</div>}
          {yearWarning && <div className="section-form-warning" role="alert">{yearWarning}</div>}

          <section className="section-compact-form__group">
            <header><h3>Academic mapping</h3><p>Only saved semester definitions are available.</p></header>
            <div className="section-form-grid">
              <Field label="Course *" error={errors.courseId}><SearchableSelect label="Course" value={form.courseId} options={scopedCourses.map(item => ({ id: item.id, value: item.id, name: item.name, code: item.code }))} onChange={setCourse} disabled={editMode} placeholder="Select course" /></Field>
              <Field label="Branch *" error={errors.branchId}><SearchableSelect label="Branch" value={form.branchId} options={branches.filter(item => !form.courseId || String(item.courseId) === String(form.courseId)).map(item => ({ id: item.id, value: item.id, name: item.name, code: item.code }))} onChange={setBranch} disabled={editMode || !form.courseId} placeholder={form.courseId ? 'Select branch' : 'Select course first'} /></Field>
              <Field label="Academic Year *" error={errors.academicYearId}>{editMode ? <ReadOnly value={form.academicYear || activeYear?.name} /> : <SearchableSelect label="Academic year" value={form.academicYearId || ''} options={academicYearOptions.filter(isSectionYearActive).map(item => ({ id: item.id, name: item.name }))} onChange={(academicYearId) => { const selectedYear = academicYearOptions.find(item => String(item.id) === String(academicYearId)); setForm(current => ({ ...current, academicYearId, academicYear: selectedYear?.name || '', semesterId: '', semester: '' })); setErrors(current => ({ ...current, academicYearId: '', semesterId: '' })) }} placeholder="Select academic year" />}</Field>
              <Field label="Semester *" error={errors.semesterId}><ProjectSelect aria-label="Semester" value={form.semesterId} onChange={(event) => setSemester(event.target.value)} disabled={editMode || !form.branchId || !form.academicYearId}><option value="">{form.branchId ? (semesterOptions.length ? 'Select semester' : 'No saved semesters') : 'Select branch first'}</option>{semesterOptions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</ProjectSelect>{form.branchId && !semesterOptions.length && <small>Create the semester definition in Program Configuration first.</small>}</Field>
            </div>
          </section>

          <section className="section-compact-form__group">
            <header><h3>Section details</h3><p>Set the identity and approved capacity.</p></header>
            <div className="section-form-grid">
              <Field label="Section Name *" error={errors.name}><input value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="e.g. Section A" /></Field>
              <Field label="Section Code *" error={errors.code}><input value={form.code} onChange={(event) => setField('code', event.target.value)} placeholder="e.g. CSE-S1-A" /></Field>
              <Field label="Capacity *" error={errors.capacity}><input type="number" min="1" max="120" value={form.capacity} onChange={(event) => setField('capacity', event.target.value)} placeholder="e.g. 60" /></Field>
              <Field label="Status *" error={errors.status}><ProjectSelect value={form.status} onChange={(event) => setField('status', event.target.value)}><option value="" disabled>Select status</option><option value="Active">Active</option><option value="Inactive">Inactive</option></ProjectSelect></Field>
            </div>
          </section>

          <section className="section-compact-form__group">
            <header><h3>Room & assignments</h3><p>Create a room first, then select it for this section. Advisor can be assigned later.</p></header>
            <div className="section-form-grid">
              <Field label={editMode ? 'Room / Classroom' : 'Room / Classroom *'} error={errors.room}><ProjectSelect value={form.room} onChange={(event) => setField('room', event.target.value)}><option value="">{editMode ? 'Assign later' : 'Select a room'}</option>{availableRooms.map(room => <option key={room.id} value={room.roomNumber || room.roomName || room.id}>{roomLabel(room)}</option>)}</ProjectSelect>{!rooms.length && <small>No rooms configured. <Link to="/rooms-management/add">Add a room first</Link></small>}</Field>
              <Field label="Faculty Advisor" error={errors.facultyAdvisorEmployeeProfileId}><SearchableSelect label="Faculty advisor" value={form.facultyAdvisorEmployeeProfileId} options={teacherCandidates.map(item => ({ id: item.employeeProfileId, value: item.employeeProfileId, name: item.fullName, code: [item.employeeCode, item.designation].filter(clean).join(' / ') }))} onChange={(value) => { const teacher = teacherCandidates.find(item => String(item.employeeProfileId) === String(value)); setForm(current => ({ ...current, facultyAdvisorEmployeeProfileId: value, advisor: teacher?.fullName || '' })) }} placeholder="Assign later" noOptionsMessage="No eligible faculty found." /></Field>
            </div>
          </section>
        </form>
      </ViewDialog>
    </Page>
  )

  return (
    <Page>
      <Header title={editMode ? 'Edit Section' : 'Add Section'} text={editMode ? 'Update section capacity, advisor, room, and status.' : 'Create a section for the selected academic mapping.'}>
        <Link className="section-primary secondary" to="/section-management"><FiArrowLeft /> Back</Link>
      </Header>

      <div className="section-reference-editor">
        <form className={`section-reference-form section-reference-form--${formTab}`} onSubmit={submit} noValidate>
          {errors.form && <div className="section-form-error" role="alert">{errors.form}</div>}
          {yearWarning && <div className="section-form-warning" role="alert">{yearWarning}</div>}

          <div className="section-form-progressline">
            <span>{formTab === 'mapping' ? 'STEP 01 OF 02' : 'STEP 02 OF 02'}</span>
            <div className="section-form-progressline__track" role="progressbar" aria-label="Section form progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={formTab === 'mapping' ? 50 : 100}>
              <i style={{ width: formTab === 'mapping' ? '50%' : '100%' }} />
            </div>
            <strong>{formTab === 'mapping' ? 'Academic mapping' : 'Section details'}</strong>
          </div>

          <div className="erp-tabs-bar" role="tablist" aria-label="Section form tabs" onKeyDown={event => { if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return; const tabs = [...event.currentTarget.querySelectorAll('[role="tab"]')]; const index = tabs.indexOf(document.activeElement); if (index < 0) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; tabs[next].click(); tabs[next].focus() }}>
            <button
              type="button"
              role="tab"
              aria-selected={formTab === 'mapping'}
              className={`erp-tab-btn section-form-step-tab ${formTab === 'mapping' ? 'active' : ''} ${formTab === 'details' ? 'completed' : ''}`}
              onClick={() => setFormTab('mapping')}
            >
              <span className="section-form-step-tab__number">{formTab === 'details' ? <FiCheckCircle /> : '01'}</span>
              <span className="section-form-step-tab__copy"><strong>Academic Mapping</strong><small>Course, branch and term</small></span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={formTab === 'details'}
              className={`erp-tab-btn section-form-step-tab ${formTab === 'details' ? 'active' : ''}`}
              disabled={!canOpenDetailsTab}
              onClick={() => setFormTab('details')}
            >
              <span className="section-form-step-tab__number">02</span>
              <span className="section-form-step-tab__copy"><strong>Section Details</strong><small>Name, capacity and advisor</small></span>
            </button>
          </div>

          <div className="erp-form-scroll-body">
            {formTab === 'mapping' ? (
              <section className="section-step-content section-step-content--mapping">
                <header className="step-content-heading">
                  <span className="section-form-eyebrow"><FiBookOpen /> Academic structure</span>
                  <h3>Academic Mapping</h3>
                  <p>Choose a course, then its branch and configured semester. Your selection is summarized as you go.</p>
                </header>
                <div className="section-mapping-layout">
                  <div className="section-mapping-sequence">
                    <div className={`section-mapping-item ${form.courseId ? 'is-complete' : 'is-current'}`}>
                      <span className="section-mapping-item__step">01</span>
                      <div className="section-mapping-item__control">
                        <Field label="Course *" error={errors.courseId}>
                          <SearchableSelect label="Course" value={form.courseId} options={scopedCourses.map((item) => ({ id: item.id, value: item.id, name: item.name, code: item.code }))} onChange={setCourse} disabled={editMode} placeholder="Select Course" searchPlaceholder="Search course name or code..." />
                        </Field>
                        <small className="section-mapping-item__hint">Select the degree program that owns this section.</small>
                      </div>
                    </div>
                    <div className={`section-mapping-item ${form.branchId ? 'is-complete' : form.courseId ? 'is-current' : 'is-waiting'}`}>
                      <span className="section-mapping-item__step">02</span>
                      <div className="section-mapping-item__control">
                        <Field label="Branch *" error={errors.branchId}>
                          <SearchableSelect label="Branch" value={form.branchId} options={branches.map((item) => ({ id: item.id, value: item.id, name: item.name, code: item.code }))} onChange={setBranch} disabled={editMode} placeholder="Select Branch" searchPlaceholder="Search branch name or code..." />
                        </Field>
                        <small className="section-mapping-item__hint">Choose a branch under the selected course.</small>
                      </div>
                    </div>
                    <div className={`section-mapping-item ${form.semesterId ? 'is-complete' : form.branchId ? 'is-current' : 'is-waiting'}`}>
                      <span className="section-mapping-item__step">03</span>
                      <div className="section-mapping-item__control">
                        <Field label="Semester *" error={errors.semesterId}>
                          <ProjectSelect aria-label="Semester" value={form.semesterId} onChange={(event) => setSemester(event.target.value)} disabled={editMode || !form.branchId}>
                            <option value="">{form.branchId ? 'Select Semester' : 'Select Branch first'}</option>
                            {semesterOptions.map((item) => <option key={item.number} value={item.id || `unconfigured-${item.number}`} disabled={!item.configured}>{item.name}</option>)}
                            {editMode && form.semesterId && !semesterOptions.some((item) => String(item.id) === String(form.semesterId)) && <option value={form.semesterId}>{form.semester}</option>}
                          </ProjectSelect>
                          {form.branchId && semesterOptions.some((item) => !item.configured) && <small>Configure missing semesters in Semester Management to enable them here.</small>}
                        </Field>
                        <small className="section-mapping-item__hint">Only semesters configured for this branch can be selected.</small>
                      </div>
                    </div>
                    <div className={`section-mapping-item ${form.academicYearId ? 'is-complete' : 'is-current'}`}>
                      <span className="section-mapping-item__step">04</span>
                      <div className="section-mapping-item__control">
                        <Field label="Academic Year *" error={errors.academicYearId}>
                          {editMode ? <ReadOnly value={form.academicYear || activeYear?.name} /> : <SearchableSelect label="Academic Year" value={form.academicYearId || ''} options={academicYearOptions.map(item => ({ id: item.id, name: item.name }))} onChange={(academicYearId) => {
                            const selectedYear = academicYearOptions.find(item => String(item.id) === String(academicYearId))
                            setForm(current => ({ ...current, academicYearId, academicYear: selectedYear?.name || '' }))
                            setErrors(current => ({ ...current, academicYearId: '', form: '' }))
                          }} placeholder="Select Academic Year" noOptionsMessage="No academic years found." />}
                          {noActiveYear && <Link to="/academic-year-management">Manage Academic Years</Link>}
                        </Field>
                        <small className="section-mapping-item__hint">The section will be created for this academic year.</small>
                      </div>
                    </div>
                  </div>

                  <aside className="section-mapping-preview" aria-label="Academic mapping preview">
                    <div className="section-mapping-preview__head">
                      <span className="section-mapping-preview__icon"><FiLayers /></span>
                      <div><small>LIVE PREVIEW</small><h4>Academic mapping</h4></div>
                      <span className={`section-mapping-preview__status ${mappingReady ? 'is-ready' : ''}`}>{mappingReady ? 'Ready' : 'In progress'}</span>
                    </div>
                    <div className="section-mapping-preview__meter" role="progressbar" aria-label="Mapping completion" aria-valuemin="0" aria-valuemax="4" aria-valuenow={mappingProgress}><span style={{ width: `${mappingProgress * 25}%` }} /></div>
                    <div className="section-mapping-preview__entries">
                      <div className={`section-mapping-preview__entry ${selectedCourseObj ? 'is-selected' : ''}`}>
                        <span>01</span><div><small>Course</small><strong>{selectedCourseObj?.name || 'Select a course'}</strong></div><em>{selectedCourseObj?.code || '—'}</em>
                      </div>
                      <div className={`section-mapping-preview__entry ${selectedBranchObj ? 'is-selected' : ''}`}>
                        <span>02</span><div><small>Branch</small><strong>{selectedBranchObj?.name || 'Select a branch'}</strong></div><em>{selectedBranchObj?.code || '—'}</em>
                      </div>
                      <div className={`section-mapping-preview__entry ${selectedSemesterObj ? 'is-selected' : ''}`}>
                        <span>03</span><div><small>Semester</small><strong>{selectedSemesterObj?.name || 'Select a semester'}</strong></div><em>{selectedSemesterObj?.number ? `SEM ${selectedSemesterObj.number}` : '—'}</em>
                      </div>
                      <div className={`section-mapping-preview__entry ${selectedYearObj ? 'is-selected' : ''}`}>
                        <span>04</span><div><small>Academic year</small><strong>{selectedYearObj?.name || 'Select an academic year'}</strong></div><em>{selectedYearObj ? 'YEAR' : '—'}</em>
                      </div>
                    </div>
                    <p className="section-mapping-preview__note">{mappingReady ? 'Your mapping is complete. Continue to enter section details.' : 'Complete each selection to unlock the next step.'}</p>
                  </aside>
                </div>
              </section>
            ) : (
              <section className="section-step-content section-step-content--details">
                <header className="step-content-heading">
                  <span className="section-form-eyebrow"><FiLayers /> SECTION SETUP</span>
                  <h3>Section Information</h3>
                  <p>Specify section name, code, capacity, and classroom details.</p>
                </header>
                <div className="section-form-grid">
                  <Field label="Section Name *" error={errors.name}>
                    <input value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="Enter section name" />
                  </Field>
                  <Field label="Section Code *" error={errors.code}>
                    <input value={form.code} onChange={(event) => setField('code', event.target.value)} placeholder="Enter section code" />
                  </Field>
                  <Field label="Capacity *" error={errors.capacity}>
                    <input type="number" min="1" max="120" placeholder="Enter capacity" value={form.capacity} onChange={(event) => setField('capacity', event.target.value)} />
                  </Field>
                  <Field label="Faculty Advisor" error={errors.facultyAdvisorEmployeeProfileId}>
                    <SearchableSelect label="Faculty Advisor" value={form.facultyAdvisorEmployeeProfileId} options={teacherCandidates.map((item) => ({ id: item.employeeProfileId, value: item.employeeProfileId, name: item.fullName, code: [item.employeeCode, item.designation].filter(clean).join(' / ') }))} onChange={(value) => { const teacher = teacherCandidates.find((item) => String(item.employeeProfileId) === String(value)); setForm((current) => ({ ...current, facultyAdvisorEmployeeProfileId: value, advisor: teacher?.fullName || '' })) }} placeholder="Select Faculty Advisor" searchPlaceholder="Search faculty..." noOptionsMessage="No faculty candidates found." />
                  </Field>
                  <Field label="Status *" error={errors.status}>
                    <ProjectSelect value={form.status} onChange={(event) => setField('status', event.target.value)}>
                      <option value="" disabled>Select Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </ProjectSelect>
                  </Field>
                </div>
              </section>
            )}
          </div>

          <footer className="erp-actions-bar">
            {formTab === 'mapping' ? (
              <>
                <Link className="cm-button secondary" to="/section-management">Cancel</Link>
                <button type="button" className="cm-button" disabled={!canOpenDetailsTab} onClick={() => setFormTab('details')}>
                  Next <FiArrowRight />
                </button>
              </>
            ) : (
              <>
                <button type="button" className="cm-button secondary" onClick={() => setFormTab('mapping')}>
                  <FiArrowLeft /> Previous
                </button>
                <button type="submit" className="cm-button" disabled={saving}>
                  {saving ? 'Saving...' : editMode ? 'Save Changes' : 'Create Section'}
                </button>
              </>
            )}
          </footer>
        </form>

        <></>
      </div>
    </Page>
  )
}

function SectionDetails({ sectionId, onClose }) {
  const { id: routeId } = useParams()
  const id = sectionId || routeId
  const [attempt, setAttempt] = useState(0)
  const [section, setSection] = useState(null), [assignments, setAssignments] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useToastState('', 'error')
  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true); setError('')
      try {
        const sources = await loadSources()
        const base = sources.sections.find(item => String(item.id) === String(id)) || {}
        const detail = normalizeSection({ ...base, ...responseRecord(await sectionApi.getById(id)) }, makeLookups(sources.courses, sources.branches, sources.semesters, sources.years))
        const rows = await sectionAssignmentApi.listBySection(id)
        if (active) { setSection(detail); setAssignments(rows.map(item => normalizeAssignment({ ...item, sectionId:id }))) }
      } catch (cause) { if (active) setError(apiError(cause, 'Unable to load section details.')) }
      finally { if (active) setLoading(false) }
    }
    load(); return () => { active = false }
  }, [id, attempt, setError])
  const assigned = section ? Math.max(assignments.length, Number(section.currentStrength || 0)) : 0
  const available = section ? Math.max(Number(section.capacity || 0) - assigned, 0) : 0
  return <ViewDialog title="Section Details" subtitle={section?.name} onClose={onClose} maxWidth="900px" showExport={Boolean(section) && !error} exportFilename={`section_${id}`}>{loading || error || !section ? <AsyncState status={loading ? 'loading' : 'error'} message={error || undefined} onRetry={() => setAttempt(value => value + 1)} /> : <div className="section-reference-detail-grid">
              <InfoCard icon={FiGrid} title="Basic Information" rows={[["Section Name", section.name], ["Section Code", section.code], ["Type", section.sectionType || section.type], ["Capacity", section.capacity], ["Current Strength", assigned], ["Available Seats", available], ["Status", section.status]]} />
              <InfoCard icon={FiBookOpen} title="Academic Mapping" rows={[["Course Name", section.course], ["Course Code", section.courseCode], ["Branch Name", section.branch], ["Branch Code", section.branchCode], ["Academic Level", section.academicLevel || (["1st Year", "2nd Year", "3rd Year", "4th Year"][Math.ceil(Number(section.semesterNumber) / 2) - 1])], ["Semester", section.semester], ["Academic Year", section.academicYear]]} />
              <InfoCard icon={FiUser} title="Section Allocation" rows={[["Faculty Advisor", section.advisor], ["Room / Classroom", section.room], ["Assigned Students", assigned], ["Available Seats", available]]} /></div>}</ViewDialog>
}

function Select({ label, value, change, first, values }) { return <SearchableSelect label={'Filter by ' + label} value={value} onChange={(next) => change(label, next)} placeholder={first} options={[{ value: '', name: first }, ...values.map((item) => ({ value: item, name: item }))]} searchPlaceholder={'Search ' + label + '...'} /> }
function Pagination({ page, pageCount, setPage }) { return <footer className="section-pagination"><p>Page {page} of {pageCount}</p><div><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><button className="active">{page}</button><button disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button></div></footer> }

function AssignStudents({ section, faculty = [], assignments, allAssignments = [], sections = [], assignMany, assignTeacher, remove, close }) {
  const [mode, setMode] = useState('')
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [teacher, setTeacher] = useState(String(section.facultyAdvisorEmployeeProfileId || ''))
  const [teacherCandidates, setTeacherCandidates] = useState([])
  const [teacherLoading, setTeacherLoading] = useState(false)
  const [error, setError] = useToastState('', 'error')
  const [teacherError, setTeacherError] = useToastState('', 'error')
  const [saving, setSaving] = useState(false)
  const [removingStudentIds, setRemovingStudentIds] = useState([])
  const assignedCount = assignments.length
  const available = Math.max(Number(section.capacity || 0) - assignedCount, 0)
  const removeStudent = async (assignment) => {
    const studentId = String(assignment.studentId)
    if (!studentId || removingStudentIds.includes(studentId)) return
    setRemovingStudentIds((current) => [...current, studentId])
    try {
      await remove(assignment)
    } catch (reason) {
      showError(reason)
    } finally {
      setRemovingStudentIds((current) => current.filter((id) => id !== studentId))
    }
  }
  const isAssignedToCurrentSection = (student) => [...assignments, ...allAssignments].some((assignment) => String(assignment.sectionId) === String(section.id) && sameStudent(assignment, student))

  useEffect(() => {
    if (mode !== 'teacher') return undefined
    let active = true
    setTeacherLoading(true)
    setTeacherError('')
    sectionAllocationApi.getTeacherCandidates(section.id)
      .then((rows) => {
        if (!active) return
        const candidates = teacherCandidatesForBranch(rows.length ? rows : faculty, section.branchName || section.branch, section.branchCode, section.branchId, section.departmentName, section.departmentId)
        setTeacherCandidates(candidates)
        setTeacher(section.facultyAdvisorEmployeeProfileId && candidates.some((candidate) => String(candidate.employeeProfileId) === String(section.facultyAdvisorEmployeeProfileId)) ? String(section.facultyAdvisorEmployeeProfileId) : '')
      })
      .catch((reason) => { if (active) { const candidates = teacherCandidatesForBranch(faculty, section.branchName || section.branch, section.branchCode, section.branchId, section.departmentName, section.departmentId); setTeacherCandidates(candidates); setTeacher(''); setTeacherError(candidates.length ? '' : apiError(reason, 'Unable to load faculty candidates.')) } })
      .finally(() => { if (active) setTeacherLoading(false) })
    return () => { active = false }
  }, [mode, section.id, section.branchName, section.branch, section.branchCode, section.branchId, section.departmentName, section.departmentId, section.facultyAdvisorEmployeeProfileId, faculty, setTeacherError])
  useEffect(() => {
    if (mode !== 'student') return undefined
    let active = true
    setError('')
    setStudentsLoading(true)
    setStudents([])
    setSelectedIds([])
    Promise.all([studentProfilesApi.getAll(), studentAdmissionApi.getAll()])
      .then(([profiles, admissions]) => {
        if (!active) return
        const candidates = sectionStudentProfiles(responseList(profiles), responseList(admissions))
          .filter((student) => matchesSectionStudent(student, section))
          .map((item) => {
            const id = item.studentId ?? item.id
            const code = item.code ?? item.enrollmentNo ?? item.rollNumber ?? item.registrationNumber ?? item.admissionNumber ?? ''
            return { ...item, id: String(id ?? ''), studentId: String(id ?? ''), name: item.name || item.fullName || '', code, studentCode: code, enrollmentNo: item.enrollmentNo || code, registrationNumber: item.registrationNumber || code, rollNumber: item.rollNumber || code }
          })
          .filter((student) => clean(student.id) && clean(student.name))
        setStudents(candidates)
      })
      .catch((reason) => active && setError(apiError(reason, 'Unable to load student profiles for this section.')))
      .finally(() => { if (active) setStudentsLoading(false) })
    return () => { active = false }
  }, [mode, section.id, setError])

  const sectionById = useMemo(() => new Map(sections.map((item) => [String(item.id), item])), [sections])
  const crossAssignmentFor = (student) => allAssignments.find((assignment) => {
    if (!sameStudent(assignment, student) || String(assignment.sectionId) === String(section.id)) return false
    const otherSection = sectionById.get(String(assignment.sectionId))
    return otherSection ? sameMapping(otherSection, section) : sameMapping(assignment, section)
  })
  const visibleStudents = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return students
      .filter((student) => !isAssignedToCurrentSection(student))
      .map((student) => ({ student, crossAssignment: crossAssignmentFor(student) }))
      .filter(({ student, crossAssignment }) => {
        const otherSection = crossAssignment ? sectionById.get(String(crossAssignment.sectionId)) : null
        const haystack = `${student.name} ${student.code} ${student.admissionNumber || ''} ${student.registrationNumber || ''} ${student.rollNumber || ''} ${otherSection?.name || ''}`.toLowerCase()
        return !needle || haystack.includes(needle)
      })
  }, [students, assignments, allAssignments, section, query, sectionById])
  const selectableRows = visibleStudents.filter(({ crossAssignment }) => !crossAssignment)
  const selectedStudents = selectableRows.filter(({ student }) => selectedIds.includes(String(student.id))).map(({ student }) => student)
  const capacityLimitedSelectable = selectableRows.slice(0, available)
  const allVisibleSelected = capacityLimitedSelectable.length > 0 && capacityLimitedSelectable.every(({ student }) => selectedIds.includes(String(student.id)))

  const toggleStudent = (studentId) => {
    const key = String(studentId)
    setError('')
    setSelectedIds((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key)
      if (current.length >= available) { setError(`Only ${available} seats are available in ${section.name}.`); return current }
      return [...current, key]
    })
  }
  const toggleAll = () => {
    setError('')
    if (allVisibleSelected) { setSelectedIds([]); return }
    setSelectedIds(capacityLimitedSelectable.map(({ student }) => String(student.id)))
    if (selectableRows.length > available) setError(`Only ${available} seats are available in ${section.name}.`)
  }
  const submitTeacher = async (event) => {
    event.preventDefault()
    if (saving) return
    if (!teacher) {
      setTeacherError('Please select a faculty advisor.')
      return
    }
    setSaving(true)
    try {
      const candidate = teacherCandidates.find((item) => String(item.employeeProfileId) === String(teacher))
      if (!candidate) throw new Error('Selected faculty advisor is not valid for this branch.')
      await assignTeacher(candidate)
      setTeacherError('')
      setMode('')
    } catch (reason) {
      setTeacherError(reason.message || 'Unable to assign teacher.')
    } finally {
      setSaving(false)
    }
  }
  const submitSelected = async (event) => {
    event.preventDefault()
    if (saving) return
    if (section.status !== 'Active') return setError('Students can only be assigned to an active section.')
    if (!selectedStudents.length) return setError('Select at least one eligible student.')
    if (selectedStudents.length > available) return setError(`Only ${available} seats are available in ${section.name}.`)
    setSaving(true)
    try {
      await assignMany(selectedStudents.map((student) => student.id))
      setSelectedIds([])
      setError('')
      showSuccess(`${selectedStudents.length} students assigned successfully.`)
    } catch (reason) {
      setError(apiError(reason, 'Unable to assign selected students. No students were assigned.'))
    } finally {
      setSaving(false)
    }
  }

  return <ViewDialog title="Assign teacher or student" subtitle={section.name} onClose={close} busy={saving} showExport={false} hideFooter maxWidth="900px"><section className="section-assignment-panel"><p className="section-assignment-context">{[section.branchCode || section.branch, section.semester, section.academicYear].filter(clean).join(' · ')}</p><div className="section-capacity"><strong>{assignedCount} / {section.capacity}</strong><span>{available} seats available</span><i><b style={{ width: `${Math.min(100, assignedCount * 100 / Math.max(Number(section.capacity || 1), 1))}%` }} /></i></div>{!mode && <div className="section-assignment-chooser"><button type="button" onClick={() => setMode('teacher')}><FiCheckCircle /><span><strong>Assign Teacher</strong><small>{section.advisor || 'No teacher assigned'}</small></span></button><button type="button" onClick={() => setMode('student')}><FiUserPlus /><span><strong>Students / Allocations</strong><small>{assignedCount} students assigned</small></span></button></div>}{mode === 'teacher' && <form className="section-assignment-form section-teacher-form" onSubmit={submitTeacher}><div className="section-assignment-form-head"><h3>Assign teacher</h3></div><div><label>Teacher / Faculty Advisor<SearchableSelect label="Faculty Advisor" value={teacher} onChange={setTeacher} loading={teacherLoading} noOptionsMessage={teacherError ? 'Unable to load faculty candidates.' : 'No active faculty candidates found for this section.'} options={teacherCandidates.map((item) => ({ value: item.employeeProfileId, name: item.fullName, code: [item.employeeCode, item.designation].filter(clean).join(' / ') }))} placeholder="Select faculty advisor" searchPlaceholder="Search faculty name or employee code..." /></label><button className="section-primary" disabled={saving || teacherLoading}><FiCheckCircle /> {saving ? 'Saving...' : 'Save Teacher'}</button></div>{teacherError && <p className="section-assignment-error" role="alert">{teacherError}</p>}</form>}{mode === 'student' && <div className="section-student-allocation"><div className="section-assignment-form-head"><h3>Students / Allocations</h3><span>{selectedStudents.length} selected</span></div>{section.status !== 'Active' && <p className="section-assignment-error" role="alert">Students can only be assigned to an active section.</p>}<label className="section-student-search"><FiSearch aria-hidden="true" /><input type="search" aria-label="Search students" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search students..." /></label><label className="section-select-all"><input type="checkbox" checked={allVisibleSelected} disabled={!available || !selectableRows.length || section.status !== 'Active'} onChange={toggleAll} /> Select All Eligible</label><div className="section-eligible-list">{visibleStudents.length ? visibleStudents.map(({ student, crossAssignment }) => { const otherSection = crossAssignment ? sectionById.get(String(crossAssignment.sectionId)) : null; const disabled = Boolean(crossAssignment) || section.status !== 'Active'; return <label className={`section-student-row ${disabled ? 'disabled' : ''}`} key={student.id}><input type="checkbox" checked={selectedIds.includes(String(student.id))} disabled={disabled} onChange={() => toggleStudent(student.id)} /><span><strong>{student.name}</strong><small>{student.code || 'Student record'}</small></span><em>{crossAssignment ? `Already assigned to ${otherSection?.name || 'another section'}` : 'Unassigned'}</em></label> }) : <p className="section-assignment-empty">{studentsLoading ? 'Loading students...' : error ? 'Unable to load students for this section. Please retry.' : 'No eligible unassigned students found for this section.'}</p>}</div><footer className="section-student-actions"><span>Selected: {selectedStudents.length}</span><button className="section-primary" disabled={saving || !selectedStudents.length || section.status !== 'Active'} onClick={submitSelected}><FiUserPlus /> {saving ? 'Assigning...' : 'Assign Selected Students'}</button></footer>{error && <p className="section-assignment-error" role="alert">{error}</p>}<div className="section-assigned-list"><h3>Assigned Students <span>{assignments.length}</span></h3>{assignments.length ? assignments.map((assignment) => <article key={`${assignment.sectionId}-${assignment.studentId}-${assignment.id}`}><div><strong>{assignment.studentName}</strong><span>{assignment.enrollmentNo}</span></div><button title="Remove student" disabled={removingStudentIds.includes(String(assignment.studentId))} onClick={() => removeStudent(assignment)}><FiTrash2 className="module-action-icon module-action-icon--danger" /> {removingStudentIds.includes(String(assignment.studentId)) ? 'Removing...' : 'Remove'}</button></article>) : <p>No students have been assigned yet.</p>}</div></div>}{mode && <footer><button type="button" className="section-back-button" onClick={() => { setMode(''); setError(''); setSelectedIds([]) }}>Back</button></footer>}</section></ViewDialog>
}
function Confirm({ action, close, confirm, busy }) { return <StatusConfirmDialog entity="Section" name={`${action.row.name} (${action.row.code})`} nextStatus={action.nextStatus} onCancel={close} onConfirm={confirm} busy={busy} description={action.nextStatus === 'Active' ? 'This section will become available for student allocations.' : `${action.assigned} students are currently assigned. Existing allocations are retained.`} confirmLabel={action.nextStatus === 'Active' ? 'Activate' : 'Confirm Deactivate'} /> }


export default function SectionManagement({ mode }) {
  const { id } = useParams()
  if (mode === 'form') return <SectionForm key="add" />
  if (mode === 'edit') return <SectionForm key={id} editMode />
  if (mode === 'details' || id) return <SectionList initialViewId={id} />
  return <SectionList />
}
