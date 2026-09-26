import { newestFirst, rememberCreated } from '../../utils/newestFirst'
import { showError, showSuccess, showWarning } from '../../utils/toast'
import useToastState from '../../hooks/useToastState'
import ExportMenu, { PrintDetailsButton } from '../../components/ExportMenu'
import { sectionColumns } from '../../utils/exportColumns'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiBookOpen, FiCheckCircle, FiClock, FiEdit2, FiEye, FiFilter, FiGrid, FiLayers, FiPlus, FiSearch, FiToggleLeft, FiToggleRight, FiTrash2, FiUser, FiUserPlus, FiUsers, FiX } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import FilterPanel from '../../components/FilterPanel'
import SearchableSelect from '../../components/SearchableSelect'
import CompactSummary from '../../components/CompactSummary'
import StatusBadge from '../../components/StatusBadge'
import { showDeactivationBlocked } from '../../components/DeactivationBlockedDialog'
import { academicYearApi, branchApi, courseApi, sectionAllocationApi, sectionApi, sectionAssignmentApi, studentProfilesApi, studentAdmissionApi } from '../../api/apiEndpoints'
import { getSemesters } from '../../auth/collegeApi'
import { getActiveAcademicYears, normalizeAcademicYear } from '../../utils/academicYearUtils'
import { matchesSectionStudent, sectionStudentProfiles } from '../../utils/sectionStudents'
import { branchTypeLabel } from '../../utils/semesterUtils'
import eventBus, { ERP_EVENTS } from '../../services/eventBus'
import facultyService, { normalizeFaculty } from '../../services/facultyService'
import roomService from '../../services/roomService'
import { useAcademic } from '../../context/AcademicContext'
import './SectionManagement.css'
import '../../styles/directory-search.css'

const PAGE_SIZE = 5
const sectionLabel = (index) => { let label = ''; for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) label = String.fromCharCode(65 + (n - 1) % 26) + label; return label }
const emptyForm = { name: '', code: '', courseId: '', branchId: '', semesterId: '', academicYearId: '', capacity: 60, facultyAdvisorEmployeeProfileId: '', advisor: '', room: '', status: '', startDate: '', endDate: '' }
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
const sectionLetter = (section) => String(section.name || '').match(/^Section\s+([A-Z]+)$/i)?.[1]?.toUpperCase() || String(section.code || '').match(/(?:^|-)([A-Z]+)$/i)?.[1]?.toUpperCase()
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

const teacherCandidatesForBranch = (faculty = [], branchName = '', branchCode = '', branchId = '') => {
  const targetKey = normalizeBranchKey(branchCode || branchName)
  return faculty
    .map((member) => normalizeFaculty(member))
    .filter((member) => {
      if (member.employeeCategory === 'Non-Teaching') return false
      const unavailable = ['inactive', 'resigned', 'retired'].includes(String(member.employmentStatus || member.status || '').trim().toLowerCase())
      if (unavailable) return false

      if (!targetKey && !branchId) return true

      const memberBranchKey = normalizeBranchKey(member.branchCode || member.branch || member.branchName || '')
      const memberDeptKey = normalizeBranchKey(member.departmentName || member.department || '')
      const memberSpecKey = normalizeBranchKey(member.specialization || '')

      const matchesBranch = Boolean(
        (member.branchId && branchId && String(member.branchId) === String(branchId)) ||
        (memberBranchKey && memberBranchKey === targetKey) ||
        (memberDeptKey && memberDeptKey === targetKey) ||
        (memberSpecKey && (memberSpecKey === targetKey || memberSpecKey.includes(targetKey)))
      )

      return matchesBranch
    })
    .map((member) => ({
      ...member,
      employeeProfileId: member.employeeProfileId ?? member.facultyId ?? member.id,
      employeeCode: member.employeeCode ?? member.employeeId,
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
  return { ...item, id: item.sectionId ?? item.id ?? '', name: item.sectionName ?? item.name ?? '', code: item.sectionCode ?? item.code ?? '', courseId, course: item.courseName ?? item.course?.courseName ?? item.course?.name ?? course?.name ?? '', courseCode: item.courseCode ?? item.course?.courseCode ?? course?.code ?? '', branchId, branch: item.branchName ?? item.branch?.branchName ?? item.branch?.name ?? branch?.name ?? '', branchCode: item.branchCode ?? item.branch?.branchCode ?? branch?.code ?? '', branchType: branchTypeLabel(item.branch ?? branch ?? { branchType: item.branchType }), semesterId, semester: sem(item.semesterName ?? item.semester?.semesterName ?? semester?.name ?? item.semesterNumber ?? ''), semesterNumber: item.semesterNumber ?? semester?.number ?? '', academicYearId, academicYear: item.academicYearName ?? item.academicYear?.academicYearName ?? item.academicYear?.name ?? yearName(year), collegeId: item.collegeId ?? branch?.collegeId ?? course?.collegeId ?? '', departmentId: item.departmentId ?? branch?.departmentId ?? course?.departmentId ?? '', departmentName: item.departmentName ?? item.department?.departmentName ?? item.department?.name ?? branch?.departmentName ?? course?.departmentName ?? '', capacity, currentStrength, availableSeats: Number(item.availableSeats ?? Math.max(capacity - currentStrength, 0)), advisor: item.advisor ?? item.facultyAdvisorName ?? item.classTeacherName ?? '', facultyAdvisorEmployeeProfileId: item.facultyAdvisorEmployeeProfileId ?? item.classTeacherEmployeeProfileId ?? '', room: item.room ?? item.classRoom ?? '', status: item.status === false || item.status === 0 || item.status === 'Inactive' ? 'Inactive' : 'Active' }
}

async function loadSources() {
  const [sectionRows, courseRows, branchRows, yearRows, semesterRows, assignmentRows, summaryData, facultyRows] = await Promise.all([sectionApi.getAll(), courseApi.getAll(), branchApi.getAll(), academicYearApi.getAll(), getSemesters(), sectionAssignmentApi.list().catch(() => []), sectionApi.summary().catch(() => null), facultyService.list().catch(() => [])])
  const courses = courseRows.map(normalizeCourse).filter((item) => item.id && item.name)
  const branches = branchRows.map(normalizeBranch).filter((item) => item.id && item.name)
  const years = yearRows.map(normalizeAcademicYear).filter((item) => item.id && item.name)
  const semesters = responseList(semesterRows).map(normalizeSemester).filter((item) => item.id && item.name)
  const sections = sectionRows.map((item) => normalizeSection(item, makeLookups(courses, branches, semesters, years)))
  return { courses, branches, years, semesters, sections, assignments: assignmentRows.map(normalizeAssignment), summary: summaryData, faculty: facultyRows }
}

const Page = ({ children }) => <DashboardLayout><main className="section-management">{children}</main></DashboardLayout>
const Header = ({ title, text, children }) => <header className="section-page-header"><div><p className="section-breadcrumb">Academic Configuration <span>/</span> Sections</p><h1>{title}</h1>{text && <p>{text}</p>}</div><div className="section-header-actions">{children}</div></header>
const Status = ({ value }) => <span className={`section-status ${String(value || '').toLowerCase()}`}>{value}</span>
const ReadOnly = ({ value, placeholder = 'Resolved after selection' }) => <input value={value || ''} placeholder={placeholder} readOnly />
const Field = ({ label, error, children }) => <label className={`section-field ${error ? 'invalid' : ''}`}><span>{label.endsWith(' *') ? <>{label.slice(0, -2)} <b className="section-required">*</b></> : label}</span>{children}{error && <small role="alert">{error}</small>}</label>
function InfoRows({ rows }) { const visible = rows.filter(([, value]) => clean(value)); if (!visible.length) return null; return <div className="cm-info-rows sa-detail-kv-grid erp-view-grid">{visible.map(([label, value]) => <div className="cm-info-row sa-kv-cell erp-view-field" key={label}><span className="cm-info-label sa-kv-label erp-view-label">{label}</span><strong className="cm-info-val sa-kv-val erp-view-value">{value}</strong></div>)}</div> }
function InfoCard({ icon: Icon, title, rows }) { const visible = rows.filter(([, value]) => clean(value)); if (!visible.length) return null; return <section className="cm-info-card sa-detail-panel sa-modern-panel erp-view-section"><div className="cm-info-card-header sa-panel-header"><div className="sa-panel-title-wrap">{Icon && <span className="sa-panel-icon"><Icon aria-hidden="true" /></span>}<h2>{title}</h2></div><span className="sa-card-count-badge">{visible.length} items</span></div><InfoRows rows={visible} /></section> }
function Empty({ icon: Icon, title, action }) { return <div className="section-empty"><Icon /><h3>{title}</h3>{action}</div> }

function SectionList() {
  const { selectedCollegeId, selectedAcademicYearId } = useAcademic()
  const [sections, setSections] = useState([]), [assignments, setAssignments] = useState([]), [summaryData, setSummaryData] = useState(null), [faculty, setFaculty] = useState([])
  const [filters, setFilters] = useState({ query: '', course: '', branch: '', semester: '', status: '', academicYear: '' }), [page, setPage] = useState(1), [loading, setLoading] = useState(true), [error, setError] = useToastState('', 'error'), [, setToast] = useToastState('', 'success'), [assigning, setAssigning] = useState(null), [confirmAction, setConfirmAction] = useState(null)
  const load = useCallback(async () => { setLoading(true); setError(''); try { const data = await loadSources(); setSections(newestFirst('sections', data.sections)); setAssignments(data.assignments); setSummaryData(data.summary); setFaculty(data.faculty) } catch (requestError) { setError(apiError(requestError, 'Unable to load sections.')) } finally { setLoading(false) } }, [setError])
  useEffect(() => { load() }, [load])
  const count = (sectionId) => assignments.filter((item) => String(item.sectionId) === String(sectionId)).length

  const scopedSections = useMemo(() => {
    return sections.filter((item) => {
      const matchesCollege = !selectedCollegeId || !item.collegeId || String(item.collegeId) === String(selectedCollegeId)
      const matchesYear = !selectedAcademicYearId || !item.academicYearId || String(item.academicYearId) === String(selectedAcademicYearId)
      return matchesCollege && matchesYear
    })
  }, [sections, selectedCollegeId, selectedAcademicYearId])

  const courses = [...new Set(scopedSections.map((item) => item.course).filter(Boolean))]
  const branches = [...new Set(scopedSections.filter((item) => !filters.course || item.course === filters.course).map((item) => item.branch).filter(Boolean))]
  const semesters = [...new Set(scopedSections.map((item) => item.semester).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const years = [...new Set(scopedSections.map((item) => item.academicYear).filter(Boolean))]
  const filtered = useMemo(() => scopedSections.filter((item) => `${item.name} ${item.code} ${item.course} ${item.courseCode} ${item.branch} ${item.branchCode} ${item.semester} ${item.academicYear} ${item.advisor}`.toLowerCase().includes(filters.query.toLowerCase().trim()) && (!filters.course || item.course === filters.course) && (!filters.branch || item.branch === filters.branch) && (!filters.semester || item.semester === filters.semester) && (!filters.academicYear || item.academicYear === filters.academicYear) && (!filters.status || item.status === filters.status)), [scopedSections, filters])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), currentPage = Math.min(page, pageCount), visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const summary = { total: summaryData?.totalSections ?? summaryData?.total ?? scopedSections.length, active: summaryData?.activeSections ?? summaryData?.active ?? scopedSections.filter((item) => item.status === 'Active').length, inactive: scopedSections.filter((item) => item.status === 'Inactive').length, students: summaryData?.currentStudents ?? summaryData?.totalStudents ?? scopedSections.reduce((sum, item) => sum + Math.max(Number(item.currentStrength || 0), count(item.id)), 0) }
  const changeFilter = (key, value) => { setFilters((current) => ({ ...current, [key]: value, ...(key === 'course' ? { branch: '' } : {}) })); setPage(1) }
  const clearFilters = () => { setFilters({ query: '', course: '', branch: '', semester: '', status: '', academicYear: '' }); setPage(1) }
  const openAssign = async (section) => { try { const latest = (await sectionAssignmentApi.listBySection(section.id)).map((item) => normalizeAssignment({ ...item, sectionId: section.id })); setAssignments((current) => [...current.filter((item) => String(item.sectionId) !== String(section.id)), ...latest]); setAssigning({ ...section, currentStrength: latest.length }) } catch (requestError) { setToast(apiError(requestError, 'Unable to load section assignments.'), 'error') } }
  const assignStudent = async (student) => { const current = (await sectionAssignmentApi.listBySection(assigning.id)).map(normalizeAssignment); const latestSection = normalizeSection(responseRecord(await sectionApi.getById(assigning.id))); if (latestSection.status !== 'Active') throw new Error('Students can only be assigned to an active section.'); if (Math.max(current.length, latestSection.currentStrength) >= latestSection.capacity) throw new Error(`${assigning.name} is already at full capacity.`); if (current.some((item) => String(item.studentId) === String(student.studentId))) throw new Error('This student is already assigned to this section.'); await sectionAssignmentApi.assign(assigning.id, student); const latest = (await sectionAssignmentApi.listBySection(assigning.id)).map((item) => normalizeAssignment({ ...item, sectionId: assigning.id })); setAssignments([...assignments.filter((item) => String(item.sectionId) !== String(assigning.id)), ...latest]); setSections((rows) => rows.map((row) => String(row.id) === String(assigning.id) ? { ...row, currentStrength: latest.length } : row)); setSummaryData(null) }
  const removeAssignment = async (assignment) => { await sectionAssignmentApi.remove(assignment.sectionId, assignment.id); const latest = (await sectionAssignmentApi.listBySection(assignment.sectionId)).map((item) => normalizeAssignment({ ...item, sectionId: assignment.sectionId })); setAssignments((rows) => [...rows.filter((item) => String(item.sectionId) !== String(assignment.sectionId)), ...latest]); setSections((rows) => rows.map((row) => String(row.id) === String(assignment.sectionId) ? { ...row, currentStrength: latest.length } : row)); setSummaryData(null); setToast(`${assignment.studentName} removed from the section.`) }
  const assignTeacher = async (teacher) => {
    if (!teacher?.employeeProfileId) throw new Error('Select a faculty candidate.')
    try {
      await sectionAllocationApi.assignTeacher(assigning.id, teacher.employeeProfileId)
    } catch (assignError) {
      // Fallback update section record directly
      await sectionApi.update(assigning.id, {
        ...assigning,
        facultyAdvisorEmployeeProfileId: teacher.employeeProfileId,
        advisor: teacher.fullName
      })
    }
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
  const confirm = async () => { const { row, nextStatus } = confirmAction; try { await sectionApi.updateStatus(row.id, nextStatus); eventBus.emit(ERP_EVENTS.ACADEMIC_UPDATED, { sectionId: row.id, status: nextStatus }); setSections(sections.map((item) => item.id === row.id ? { ...item, status: nextStatus } : item)); setSummaryData(null); setToast(`Section ${nextStatus === 'Active' ? 'activated' : 'deactivated'}.`); setConfirmAction(null) } catch (requestError) { setToast(apiError(requestError, 'Unable to update section status.'), 'error') } }
  const hasFilters = Object.values(filters).some(Boolean)
  return <Page>

    <Header title="Section Management" text="Manage sections as student groups under Course, Branch, Semester, and Academic Year.">
      <CompactSummary label="Section summary" items={[{ label: 'Total', value: summary.total }, { label: 'Active', value: summary.active, tone: 'active' }, { label: 'Inactive', value: summary.inactive, tone: 'inactive' }, { label: 'Students', value: summary.students }]} />
    </Header>
    <section className="section-table-card">
      <header className="course-directory-heading">
        <div>
          <span className="cm-eyebrow">Section Directory</span>
          <p>{filtered.length} records</p>
        </div>
        <div className="directory-export-actions">
          <ExportMenu rows={filtered.map(row => ({ ...row, currentStrength: Math.max(row.currentStrength, count(row.id)) }))} columns={sectionColumns} title="Sections" filename="sections" loading={loading || Boolean(error)} />
          <Link className="cm-button" to="/section-management/add"><FiPlus /> Add Section</Link>
        </div>
      </header>
      <FilterPanel active={hasFilters} onClear={clearFilters}>
        <div className="section-filter-bar">
          <label className="section-search"><FiSearch /><input aria-label="Search sections" value={filters.query} onChange={(event) => changeFilter('query', event.target.value)} placeholder="Search sections..." /></label>
          <Select label="course" value={filters.course} change={changeFilter} first="All Courses" values={courses} />
          <Select label="branch" value={filters.branch} change={changeFilter} first="All Branches" values={branches} />
          <Select label="semester" value={filters.semester} change={changeFilter} first="All Semesters" values={semesters} />
          <Select label="academicYear" value={filters.academicYear} change={changeFilter} first="All Years" values={years} />
          <Select label="status" value={filters.status} change={changeFilter} first="All Status" values={['Active', 'Inactive']} />
          {hasFilters && <button className="section-clear" onClick={clearFilters}><FiFilter /> Clear</button>}
        </div>
      </FilterPanel>
      {loading ? <Empty icon={FiClock} title="Loading sections..." /> : error ? <Empty icon={FiLayers} title={error} action={<button className="section-primary" onClick={load}>Retry</button>} /> : visible.length ? (
        <>
          <div className="section-table-wrap">
            <table className="section-table">
              <thead>
                <tr>
                  <th className="table-center" style={{ minWidth: '150px' }}>Section</th>
                  <th className="table-center" style={{ minWidth: '150px' }}>Course</th>
                  <th className="table-center" style={{ minWidth: '150px' }}>Branch</th>
                  <th className="table-center" style={{ width: '100px' }}>Semester</th>
                  <th className="table-center" style={{ width: '130px' }}>Academic Year</th>
                  <th className="table-center" style={{ width: '150px' }}>Strength / Capacity</th>
                  <th className="table-center" style={{ minWidth: '170px', maxWidth: '220px' }}>Faculty Advisor</th>
                  <th className="table-center" style={{ width: '120px' }}>Status</th>
                  <th className="table-center" style={{ width: '170px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((section) => {
                  const assigned = Math.max(count(section.id), Number(section.currentStrength || 0))
                  return (
                    <tr key={section.id}>
                      <td className="table-center" style={{ minWidth: '150px' }}>
                        <div className="table-primary-cell">
                          <Link to={`/section-management/${section.id}`} className="section-name-link table-cell-truncate" title={`Click to view details for ${section.name}`}>
                            {section.name}
                          </Link>
                          <small>{section.code}</small>
                        </div>
                      </td>
                      <td className="table-center" style={{ minWidth: '150px' }}>
                        <div className="table-primary-cell">
                          <strong title={section.course}>{section.course}</strong>
                          {section.courseCode && <small title={section.courseCode}>{section.courseCode}</small>}
                        </div>
                      </td>
                      <td className="table-center" style={{ minWidth: '150px' }}>
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
                      <td className="table-center" style={{ width: '120px' }}><StatusBadge value={section.status} /></td>
                      <td className="table-center" style={{ width: '170px' }}>
                        <div className="section-actions table-actions-group">
                          <Link className="table-action-btn action-edit" title={`Edit ${section.name}`} aria-label={`Edit ${section.name}`} to={`/section-management/${section.id}/edit`}><FiEdit2 /></Link>
                          <button type="button" className="table-action-btn action-assign section-assign-action" title={`Assign Students / Faculty to ${section.name}`} aria-label={`Assign Students to ${section.name}`} onClick={() => openAssign(section)}><FiUserPlus /></button>
                          <button type="button" className={`table-action-btn ${section.status === 'Active' ? 'action-deactivate' : 'action-activate'}`} title={section.status === 'Active' ? `Deactivate ${section.name}` : `Activate ${section.name}`} aria-label={section.status === 'Active' ? `Deactivate ${section.name}` : `Activate ${section.name}`} onClick={() => toggle(section)}>{section.status === 'Active' ? <FiToggleRight /> : <FiToggleLeft />}</button>
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
        <Empty icon={FiUsers} title="No sections configured" action={<Link className="cm-button" to="/section-management/add">Add Section</Link>} />
      )}
    </section>
    {assigning && <AssignStudents section={assigning} faculty={faculty} assignments={assignments.filter((item) => String(item.sectionId) === String(assigning.id))} allAssignments={assignments} sections={sections} assign={assignStudent} assignTeacher={assignTeacher} remove={removeAssignment} close={() => setAssigning(null)} />}
    {confirmAction && <Confirm action={confirmAction} close={() => setConfirmAction(null)} confirm={confirm} />}
  </Page>
}

function SectionForm({ editMode = false }) {
  const { id } = useParams(), navigate = useNavigate()
  const { selectedCollegeId, selectedCollege, activeDepartments, selectedAcademicYearId, selectedAcademicYear } = useAcademic()
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')
  const [masters, setMasters] = useState({ courses: [], branches: [], years: [], semesters: [] }), [sections, setSections] = useState([]), [assignments, setAssignments] = useState([]), [faculty, setFaculty] = useState([])
  const semesterRequest = useRef(0)
  const legacy = useRef({})
  const [formTab, setFormTab] = useState(editMode ? 'details' : 'mapping')
  const scopedCourses = useMemo(() => (masters.courses || []).filter(item => (item.status !== 'Inactive' && item.status !== 0 && item.status !== false && item.isActive !== false) || (editMode && String(item.id) === String(form.courseId))), [masters.courses, editMode, form.courseId])
  const course = scopedCourses.find((item) => String(item.id) === String(form.courseId))
  const branches = useMemo(() => (masters.branches || []).filter((item) => String(item.courseId) === String(form.courseId) && ((item.status !== 'Inactive' && item.status !== 0 && item.status !== false && item.isActive !== false) || (editMode && String(item.id) === String(form.branchId)))), [masters.branches, form.courseId, editMode, form.branchId])
  const branch = branches.find((item) => String(item.id) === String(form.branchId))
  const activeYears = useMemo(() => getActiveAcademicYears(masters.years), [masters.years])
  const activeYear = editMode ? masters.years.find((item) => String(item.id) === String(form.academicYearId)) : (masters.years.find(y => String(y.id) === String(selectedAcademicYearId)) || selectedAcademicYear || activeYears.find((item) => String(item.id) === String(form.academicYearId)) || activeYears[0])
  const semesters = useMemo(() => (masters.semesters || []).filter((item) => (!form.courseId || (!item.courseId || String(item.courseId) === String(form.courseId))) && (!form.branchId || (!item.branchId || String(item.branchId) === String(form.branchId))) && (!form.academicYearId || !item.academicYearId || String(item.academicYearId) === String(form.academicYearId)) && ((item.status !== 'Inactive' && item.status !== 0 && item.status !== false && item.isActive !== false) || (editMode && String(item.id) === String(form.semesterId)))), [masters.semesters, form.courseId, form.branchId, form.academicYearId, editMode, form.semesterId])
  const semester = semesters.find((item) => String(item.id) === String(form.semesterId))
  const assignedCount = Math.max(Number(form.currentStrength || 0), assignments.filter((item) => String(item.sectionId) === String(id)).length)
  const teacherCandidates = useMemo(() => teacherCandidatesForBranch(faculty, branch?.name || form.branch, branch?.code || form.branchCode, branch?.id || form.branchId), [faculty, branch, form.branch, form.branchCode, form.branchId])
  const noActiveYear = !editMode && !selectedAcademicYearId && activeYears.length === 0
  const yearWarning = noActiveYear ? 'No active academic year is configured.' : ''
  const canOpenDetailsTab = Boolean(form.courseId && form.branchId && form.semesterId && form.academicYearId)

  const fetchSemesters = useCallback(async (branchId, academicYearId, courseId) => {
    const request = ++semesterRequest.current
    setMasters((current) => ({ ...current, semesters: [] }))
    if (!branchId || !academicYearId) return
    try {
      // The semester search route is returning HTTP 502 in the current API
      // deployment. The list route is healthy, so fetch once and scope it here.
      const response = await getSemesters()
      const matches = (actual, expected) => !actual || String(actual) === String(expected)
      const scopedSemesters = responseList(response).map(normalizeSemester).filter((item) =>
        matches(item.courseId, courseId) && matches(item.branchId, branchId) && matches(item.academicYearId, academicYearId)
      )
      if (request === semesterRequest.current) setMasters((current) => ({ ...current, semesters: scopedSemesters }))
    } catch (error) { if (request === semesterRequest.current) setErrors((current) => ({ ...current, semesterId: apiError(error, 'Unable to load semesters.') })) }
  }, [setErrors])
  const load = useCallback(async () => { setLoading(true); try { const data = await loadSources(); setMasters({ courses: data.courses, branches: data.branches, years: data.years, semesters: [] }); setSections(newestFirst('sections', data.sections)); setAssignments(data.assignments); setFaculty(data.faculty); if (editMode && id) { const detail = normalizeSection({ ...(data.sections.find((item) => String(item.id) === String(id)) || {}), ...responseRecord(await sectionApi.getById(id)) }, makeLookups(data.courses, data.branches, [], data.years)); legacy.current = { sectionType: detail.sectionType ?? detail.type, shift: detail.shift }; const editable = { ...detail }; delete editable.type; delete editable.sectionType; delete editable.shift; setForm({ ...emptyForm, ...editable, courseId: String(detail.courseId || ''), branchId: String(detail.branchId || ''), semesterId: String(detail.semesterId || ''), academicYearId: String(detail.academicYearId || ''), facultyAdvisorEmployeeProfileId: detail.facultyAdvisorEmployeeProfileId || '' }); setFormTab('details'); await fetchSemesters(detail.branchId, detail.academicYearId, detail.courseId) } else { const initialYearId = selectedAcademicYearId || (getActiveAcademicYears(data.years)[0]?.id) || ''; setForm(() => ({ ...emptyForm, academicYearId: initialYearId, collegeId: selectedCollegeId || '', status: 'Active' })); setFormTab('mapping') } } catch (error) { setErrors({ form: apiError(error, 'Unable to load section form.') }) } finally { setLoading(false) } }, [id, editMode, fetchSemesters, selectedAcademicYearId, selectedCollegeId, setErrors])
  useEffect(() => { load() }, [load])
  const setCourse = async (courseId) => { semesterRequest.current += 1; const selectedCourse = scopedCourses.find((item) => String(item.id) === String(courseId)); setForm((current) => ({ ...current, courseId, course: selectedCourse?.name || '', courseCode: selectedCourse?.code || '', branchId: '', branch: '', branchCode: '', semesterId: '', semester: '', name: '', code: '' })); setMasters((current) => ({ ...current, semesters: [] })); setErrors({}) }
  const setBranch = async (branchId) => { const selectedBranch = masters.branches.find((item) => String(item.id) === String(branchId)); const yearId = form.academicYearId || selectedAcademicYearId || activeYear?.id; setForm((current) => ({ ...current, branchId, branch: selectedBranch?.name || '', branchCode: selectedBranch?.code || '', semesterId: '', semester: '', name: '', code: '', academicYearId: yearId })); setErrors({}); await fetchSemesters(branchId, yearId, form.courseId) }
  const suggestSection = (semesterId) => { const selectedSemester = masters.semesters.find((item) => String(item.id) === String(semesterId)); const draft = { ...form, semesterId, semester: selectedSemester?.name || '', academicYear: activeYear?.name || form.academicYear }; const used = new Set(sections.filter((item) => sameMapping(item, draft) && String(item.id) !== String(id)).map(sectionLetter).filter(Boolean)); let index = 0; while (used.has(sectionLabel(index))) index += 1; const letter = sectionLabel(index); const prefix = branch?.code || form.branchCode || branch?.name || ''; const semesterNumber = selectedSemester?.number || String(selectedSemester?.name || '').match(/\d+/)?.[0] || ''; return letter ? { name: `Section ${letter}`, code: [prefix, semesterNumber ? `S${semesterNumber}` : '', letter].filter(Boolean).join('-').toUpperCase() } : {} }
  const setSemester = (semesterId) => { const selectedSemester = masters.semesters.find((item) => String(item.id) === String(semesterId)); const suggestion = editMode ? {} : suggestSection(semesterId); setForm((current) => ({ ...current, semesterId, semester: selectedSemester?.name || '', academicYearId: selectedSemester?.academicYearId || current.academicYearId || selectedAcademicYearId || activeYear?.id, academicYear: selectedSemester?.academicYearName || activeYear?.name || current.academicYear, ...suggestion })); setErrors((current) => ({ ...current, semesterId: '', name: '', code: '' })) }
  const setField = (key, value) => { setForm((current) => ({ ...current, [key]: key === 'code' ? value.toUpperCase() : value })); setErrors((current) => ({ ...current, [key]: '' })) }
  const validate = () => { const next = {}; ['courseId', 'branchId', 'semesterId', 'name', 'code', 'status'].forEach((key) => { if (!String(form[key] || '').trim()) next[key] = 'Required.' }); if (!form.academicYearId && !selectedAcademicYearId) next.academicYearId = yearWarning || 'An academic year is required.'; if (!editMode && !semester) next.semesterId = 'Select a configured semester.'; if (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 1 || Number(form.capacity) > 120) next.capacity = 'Capacity must be a whole number from 1 to 120.'; if (editMode && Number(form.capacity) < assignedCount) next.capacity = `Capacity cannot be below the ${assignedCount} assigned students.`; if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(String(form.code || '').trim().toUpperCase())) next.code = 'Use uppercase letters, numbers, and single hyphens only.'; const mapping = { ...form, academicYearId: form.academicYearId || selectedAcademicYearId || activeYear?.id }; if (sections.some((item) => String(item.id) !== String(id) && sameMapping(item, mapping) && item.name.trim().toLowerCase() === form.name.trim().toLowerCase())) next.name = 'This section already exists for this academic mapping.'; if (sections.some((item) => String(item.id) !== String(id) && sameMapping(item, mapping) && item.code.trim().toLowerCase() === form.code.trim().toLowerCase())) next.code = 'This section code already exists for this academic mapping.'; setErrors(next); if (Object.keys(next).length) showWarning('Correct the highlighted fields before saving the section.'); return !Object.keys(next).length }
  const submit = async (event) => { event.preventDefault(); if (saving || !validate()) return; setSaving(true); try { const mappedBranch = !editMode && (!branch?.collegeId || !branch?.departmentId) ? normalizeBranch(responseRecord(await branchApi.getById(form.branchId))) : branch; const mappedCourse = !editMode && (!mappedBranch?.collegeId || !mappedBranch?.departmentId) ? normalizeCourse(responseRecord(await courseApi.getById(form.courseId))) : course; const departmentName = String(mappedBranch?.departmentName || mappedCourse?.departmentName || '').trim().toLowerCase(); const matchedDepartment = activeDepartments.find((item) => String(item.departmentName || item.name || '').trim().toLowerCase() === departmentName); const payload = { ...form, collegeId: mappedBranch?.collegeId || mappedCourse?.collegeId || selectedCollegeId || selectedCollege?.collegeId || selectedCollege?.id || form.collegeId, departmentId: mappedBranch?.departmentId || mappedCourse?.departmentId || matchedDepartment?.departmentId || matchedDepartment?.id || form.departmentId, academicYearId: form.academicYearId || selectedAcademicYearId || activeYear?.id, academicYear: activeYear?.name || form.academicYear, ...legacy.current, capacity: Number(form.capacity) }; if (editMode) { const currentStudents = await sectionAssignmentApi.listBySection(id); if (payload.status === 'Inactive' && currentStudents.length > 0) throw new Error(`Cannot deactivate section "${payload.name}". ${currentStudents.length} student${currentStudents.length === 1 ? '' : 's'} are currently enrolled. Transfer or unassign students first.`); if (payload.capacity < currentStudents.length) throw new Error('Capacity cannot be below the current assigned student count.'); const capacityCheck = await sectionApi.validateCapacity(id, payload.capacity); if (capacityCheck === false || capacityCheck?.isValid === false) throw new Error(capacityCheck?.message || 'The requested capacity is not allowed.'); await sectionApi.update(id, payload); await sectionApi.updateStatus(id, payload.status) } else { const created = await sectionApi.create(payload); rememberCreated('sections', created); if (payload.status === 'Inactive') await sectionApi.updateStatus(created.id, payload.status) }; if (payload.room) { roomService.allocateRoom(payload.room, payload.name || 'Section') }; eventBus.emit(ERP_EVENTS.ACADEMIC_UPDATED, { form }); setNotice(`Section ${editMode ? 'updated' : 'created'} successfully.`); setTimeout(() => navigate('/section-management'), 700) } catch (error) { setErrors((current) => ({ ...current, form: apiError(error, 'Unable to save section.') })) } finally { setSaving(false) } }
  if (loading) return <Page><Empty icon={FiClock} title="Loading section form..." /></Page>
  const selectedTeacher = teacherCandidates.find((item) => String(item.employeeProfileId) === String(form.facultyAdvisorEmployeeProfileId))
  const selectedCourseObj = scopedCourses.find((item) => String(item.id) === String(form.courseId))
  const selectedBranchObj = branches.find((item) => String(item.id) === String(form.branchId))
  const selectedSemesterObj = semesters.find((item) => String(item.id) === String(form.semesterId))

  return (
    <Page>
      <Header title={editMode ? 'Edit Section' : 'Add Section'} text={editMode ? 'Update section capacity, advisor, room, and status.' : 'Create a section for the selected academic mapping.'}>
        <Link className="section-primary secondary" to="/section-management"><FiArrowLeft /> Back</Link>
      </Header>
      
      <div className="erp-two-column-layout">
        <form className="erp-card-main section-form-card-unified" onSubmit={submit} noValidate>
          {errors.form && <div className="section-form-error" role="alert">{errors.form}</div>}
          {yearWarning && <div className="section-form-warning" role="alert">{yearWarning}</div>}
          
          <div className="erp-tabs-bar" role="tablist" aria-label="Section form tabs">
            <button
              type="button"
              role="tab"
              aria-selected={formTab === 'mapping'}
              className={`erp-tab-btn ${formTab === 'mapping' ? 'active' : ''}`}
              onClick={() => setFormTab('mapping')}
            >
              1. Academic Mapping
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={formTab === 'details'}
              className={`erp-tab-btn ${formTab === 'details' ? 'active' : ''}`}
              disabled={!canOpenDetailsTab}
              onClick={() => setFormTab('details')}
            >
              2. Section Details
            </button>
          </div>

          <div className="erp-form-scroll-body">
            {formTab === 'mapping' ? (
              <section className="section-step-content">
                <header className="step-content-heading">
                  <h3>Academic Mapping</h3>
                  <p>Select Course, Branch, and Semester for this section.</p>
                </header>
                <div className="semester-form-grid">
                  <Field label="Course *" error={errors.courseId}>
                    <SearchableSelect label="Course" value={form.courseId} options={scopedCourses.map((item) => ({ id: item.id, value: item.id, name: item.name, code: item.code }))} onChange={setCourse} disabled={editMode} placeholder="Select Course" searchPlaceholder="Search course name or code..." />
                  </Field>
                  <Field label="Course Code">
                    <ReadOnly value={course?.code || form.courseCode} placeholder="Resolved from selected course" />
                  </Field>
                  <Field label="Branch *" error={errors.branchId}>
                    <SearchableSelect label="Branch" value={form.branchId} options={branches.map((item) => ({ id: item.id, value: item.id, name: item.name, code: item.code }))} onChange={setBranch} disabled={editMode || !form.courseId} placeholder={form.courseId ? 'Select Branch' : 'Select Course first'} searchPlaceholder="Search branch name or code..." />
                  </Field>
                  <Field label="Branch Code">
                    <ReadOnly value={branch?.code || form.branchCode} placeholder="Resolved from selected branch" />
                  </Field>
                  <Field label="Semester *" error={errors.semesterId}>
                    <SearchableSelect label="Semester" value={form.semesterId} options={(editMode && !semesters.some((item) => String(item.id) === String(form.semesterId)) && form.semesterId ? [...semesters, { id: form.semesterId, name: form.semester }] : semesters).map((item) => ({ id: item.id, value: item.id, name: item.name, code: item.academicYearName }))} onChange={setSemester} disabled={editMode || !form.branchId} placeholder={form.branchId ? 'Select Semester' : 'Select Branch first'} searchPlaceholder="Search semester..." noOptionsMessage="No configured semesters found." />
                  </Field>
                  <Field label="Academic Year">
                    <ReadOnly value={activeYear?.name || form.academicYear} placeholder="Resolved from active year" />
                  </Field>
                </div>
              </section>
            ) : (
              <section className="section-step-content">
                <header className="step-content-heading">
                  <h3>Section Information</h3>
                  <p>Specify section name, code, capacity, and classroom details.</p>
                </header>
                <div className="semester-form-grid">
                  <Field label="Section Name *" error={errors.name}>
                    <input value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="Section A" />
                  </Field>
                  <Field label="Section Code *" error={errors.code}>
                    <input value={form.code} onChange={(event) => setField('code', event.target.value)} placeholder="CSE-S1-A" />
                  </Field>
                  <Field label="Capacity *" error={errors.capacity}>
                    <input type="number" min="1" max="120" value={form.capacity} onChange={(event) => setField('capacity', event.target.value)} />
                  </Field>
                  <Field label="Faculty Advisor" error={errors.facultyAdvisorEmployeeProfileId}>
                    <SearchableSelect label="Faculty Advisor" value={form.facultyAdvisorEmployeeProfileId} options={teacherCandidates.map((item) => ({ id: item.employeeProfileId, value: item.employeeProfileId, name: item.fullName, code: [item.employeeCode, item.designation].filter(clean).join(' / ') }))} onChange={(value) => { const teacher = teacherCandidates.find((item) => String(item.employeeProfileId) === String(value)); setForm((current) => ({ ...current, facultyAdvisorEmployeeProfileId: value, advisor: teacher?.fullName || '' })) }} placeholder="Select Faculty Advisor" searchPlaceholder="Search faculty..." noOptionsMessage="No faculty candidates found." />
                  </Field>
                  <Field label="Status *" error={errors.status}>
                    <select value={form.status} onChange={(event) => setField('status', event.target.value)}>
                      <option value="" disabled>Select Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
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
                  Next →
                </button>
              </>
            ) : (
              <>
                <button type="button" className="cm-button secondary" onClick={() => setFormTab('mapping')}>
                  ← Previous
                </button>
                <button type="submit" className="cm-button" disabled={saving}>
                  {saving ? 'Saving...' : editMode ? 'Save Changes' : 'Create Section'}
                </button>
              </>
            )}
          </footer>
        </form>

        <aside className="college-live-preview" aria-label="Section Live Preview">
          <header className="preview-top-bar">
            <span className="preview-live-tag">
              <span className="live-dot" /> LIVE PREVIEW
            </span>
            <span className="preview-sync-hint">Real-time sync</span>
          </header>

          <div className="preview-body-container">
            <div className="preview-hero">
              <div className="preview-hero-badge">
                {form.code ? form.code.slice(0, 4).toUpperCase() : (form.name ? form.name.slice(0, 4).toUpperCase() : 'SEC')}
              </div>
              <div className="preview-hero-details">
                <h3 className="preview-course-title">
                  {form.name ? form.name.trim() : 'Section Preview'}
                </h3>
                <p className="preview-course-meta">
                  {[form.code, selectedCourseObj?.name, form.capacity && `${form.capacity} Students`].filter(Boolean).join(' • ') || 'Academic details'}
                </p>
              </div>
            </div>

            {(() => {
              const sections = [
                {
                  title: 'Academic Mapping',
                  fields: [
                    ['Course', selectedCourseObj?.name],
                    ['Branch', selectedBranchObj?.name],
                    ['Semester', selectedSemesterObj?.name || form.semester],
                    ['Academic Year', form.courseId ? activeYear?.name : ''],
                  ],
                },
                {
                  title: 'Section Details',
                  fields: [
                    ['Section Name', form.name],
                    ['Section Code', form.code],
                    ['Capacity', form.capacity ? `${form.capacity} Students` : ''],
                    ['Faculty Advisor', selectedTeacher?.fullName || form.advisor],
                    ['Status', form.name || form.code ? form.status || 'Active' : ''],
                  ],
                },
              ].map((sec) => ({
                ...sec,
                fields: sec.fields.filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== '' && String(val).trim() !== '—'),
              })).filter((sec) => sec.fields.length > 0)

              if (sections.length === 0) {
                return (
                  <div className="preview-empty-hint">
                    <span>Enter details in the form to preview here in real time.</span>
                  </div>
                )
              }

              return sections.map((sec) => (
                <div key={sec.title} className="preview-section-group">
                  <span className="preview-section-title">{sec.title}</span>
                  <div className="preview-kv-grid">
                    {sec.fields.map(([label, text]) => (
                      <div key={label} className="preview-kv-item">
                        <span className="kv-label">{label}</span>
                        <strong className="kv-val" title={String(text).trim()}>{String(text).trim()}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            })()}
          </div>
        </aside>
      </div>
    </Page>
  )
}

function SectionDetails() {
  const { id } = useParams()
  const [section, setSection] = useState(null), [assignments, setAssignments] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useToastState('', 'error')
  useEffect(() => { let alive = true; const load = async () => { setLoading(true); try { const sources = await loadSources(); const base = sources.sections.find((item) => String(item.id) === String(id)) || {}; const detail = normalizeSection({ ...base, ...responseRecord(await sectionApi.getById(id)) }, makeLookups(sources.courses, sources.branches, sources.semesters, sources.years)); const rows = await sectionAssignmentApi.listBySection(id).catch(() => []); if (alive) { setSection(detail); setAssignments(rows.map((item) => normalizeAssignment({ ...item, sectionId: id }))) } } catch (requestError) { if (alive) setError(apiError(requestError, 'Unable to load section details.')) } finally { if (alive) setLoading(false) } }; load(); return () => { alive = false } }, [id, setError])
  if (loading) return <Page><Empty icon={FiClock} title="Loading section details..." /></Page>
  if (error || !section) return <Page><div className="cm-profile-view" data-export-record><div className="cm-profile-top-bar"><Link className="cm-button secondary" to="/section-management">&larr; Back to Sections List</Link></div><Empty icon={FiLayers} title={error || 'Section not found.'} /></div></Page>
  const assigned = Math.max(assignments.length, Number(section.currentStrength || 0)), available = Math.max(Number(section.capacity || 0) - assigned, 0)
  return (
    <Page>
      <div className="cm-profile-view" data-export-record>
        <div className="cm-profile-top-bar">
          <ExportMenu mode="single" title="Section Details" filename={`section_${section.code || section.id}_${section.academicYear || ""}`} />
          <Link className="cm-button secondary" to="/section-management">
            &larr; Back to Sections List
          </Link>
        </div>
        <article className="section-profile-page">
          <div className="cm-profile-card">
            <div className="cm-profile-banner">
              <div className="cm-profile-avatar-wrap">
                <div className="cm-profile-placeholder">
                  <FiUsers />
                </div>
              </div>
              <div className="cm-profile-header-info">
                <div className="cm-profile-badges">
                  <span className="cm-badge cm-badge-code">SECTION</span>
                  {section.code && <span className="cm-badge cm-badge-type">{section.code}</span>}
                  <span className={`cm-status-badge ${String(section.status).toLowerCase()}`}>{section.status}</span>
                </div>
                <h1 className="cm-profile-title">{section.name}</h1>
                <p className="cm-profile-subtitle">
                  {[section.course, section.branchCode || section.branch, section.semester].filter(clean).join(' • ')}
                </p>
              </div>
            </div>
            <div className="cm-profile-grid">
              <InfoCard icon={FiGrid} title="Basic Information" rows={[["Section Name", section.name], ["Section Code", section.code], ["Type", section.sectionType || section.type], ["Capacity", section.capacity], ["Current Strength", assigned], ["Available Seats", available], ["Status", section.status]]} />
              <InfoCard icon={FiBookOpen} title="Academic Mapping" rows={[["Course Name", section.course], ["Course Code", section.courseCode], ["Branch Name", section.branch], ["Branch Code", section.branchCode], ["Academic Level", section.academicLevel || (["1st Year", "2nd Year", "3rd Year", "4th Year"][Math.ceil(Number(section.semesterNumber) / 2) - 1])], ["Semester", section.semester], ["Academic Year", section.academicYear]]} />
              <InfoCard icon={FiUser} title="Section Allocation" rows={[["Faculty Advisor", section.advisor], ["Room / Classroom", section.room], ["Assigned Students", assigned], ["Available Seats", available]]} />
            </div>
          </div>
        </article>
      </div>
    </Page>
  )
}

function Select({ label, value, change, first, values }) { return <SearchableSelect label={'Filter by ' + label} value={value} onChange={(next) => change(label, next)} placeholder={first} options={[{ value: '', name: first }, ...values.map((item) => ({ value: item, name: item }))]} searchPlaceholder={'Search ' + label + '...'} /> }
function Pagination({ page, pageCount, setPage }) { return <footer className="section-pagination"><p>Page {page} of {pageCount}</p><div><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><button className="active">{page}</button><button disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button></div></footer> }

function AssignStudents({ section, faculty = [], assignments, allAssignments = [], sections = [], assign, assignTeacher, remove, close }) {
  const [mode, setMode] = useState('')
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [teacher, setTeacher] = useState(String(section.facultyAdvisorEmployeeProfileId || ''))
  const [teacherCandidates, setTeacherCandidates] = useState([])
  const [error, setError] = useToastState('', 'error')
  const [teacherError, setTeacherError] = useToastState('', 'error')
  const [saving, setSaving] = useState(false)
  const assignedCount = assignments.length
  const available = Math.max(Number(section.capacity || 0) - assignedCount, 0)
  const isAssignedToCurrentSection = (student) => [...assignments, ...allAssignments].some((assignment) => String(assignment.sectionId) === String(section.id) && sameStudent(assignment, student))

  useEffect(() => {
    const candidates = teacherCandidatesForBranch(faculty, section.branchName || section.branch, section.branchCode, section.branchId)
    setTeacherCandidates(candidates)
    if (section.facultyAdvisorEmployeeProfileId && candidates.some(c => String(c.employeeProfileId) === String(section.facultyAdvisorEmployeeProfileId))) {
      setTeacher(String(section.facultyAdvisorEmployeeProfileId))
    } else {
      setTeacher('')
    }
  }, [faculty, section.branchName, section.branch, section.branchCode, section.branchId, section.facultyAdvisorEmployeeProfileId])
  useEffect(() => {
    if (mode !== 'student') return undefined
    let active = true
    setError('')
    setStudentsLoading(true)
    setStudents([])
    setSelectedIds([])
    Promise.allSettled([studentProfilesApi.getAll(), studentAdmissionApi.getAll()])
      .then(([profilesResult, admissionsResult]) => {
        const profiles = profilesResult.status === 'fulfilled' ? profilesResult.value : []
        const admissions = admissionsResult.status === 'fulfilled' ? admissionsResult.value : []
        if (profilesResult.status !== 'fulfilled' && admissionsResult.status !== 'fulfilled') throw profilesResult.reason || admissionsResult.reason || new Error('Unable to load student profiles.')
        if (active) setStudents(sectionStudentProfiles(profiles, admissions).filter(student => matchesSectionStudent(student, section)))
      })
      .catch((reason) => active && setError(apiError(reason, 'Unable to load admitted students.')))
      .finally(() => { if (active) setStudentsLoading(false) })
    return () => { active = false }
  }, [mode, section, setError])

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
    let success = 0, failed = 0
    const failureMessages = new Set()
    for (const student of selectedStudents) {
      try { await assign({ studentId: student.id, enrollmentNo: student.enrollmentNo, studentName: student.name }); success += 1 }
      catch (reason) { failed += 1; failureMessages.add(reason.message || 'Unable to assign student.') }
    }
    setSaving(false)
    setSelectedIds([])
    setError(failed ? `${success} students assigned successfully. ${failed} could not be assigned. ${[...failureMessages].join(' ')}` : '', success ? 'warning' : 'error'); if (!failed) showSuccess(`${success} students assigned successfully.`)
  }

  return <div className="section-overlay centered" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="section-assignment-panel" role="dialog" aria-modal="true" aria-label="Assign teacher or student"><header><div><p>Section Allocation</p><h2>{section.name}</h2><span>{[section.branchCode || section.branch, section.semester, section.academicYear].filter(clean).join(' � ')}</span></div><button type="button" aria-label="Close section allocation" onClick={close}><FiX /></button></header><div className="section-capacity"><strong>{assignedCount} / {section.capacity}</strong><span>{available} seats available</span><i><b style={{ width: `${Math.min(100, assignedCount * 100 / Math.max(Number(section.capacity || 1), 1))}%` }} /></i></div>{!mode && <div className="section-assignment-chooser"><button type="button" onClick={() => setMode('teacher')}><FiCheckCircle /><span><strong>Assign Teacher</strong><small>{section.advisor || 'No teacher assigned'}</small></span></button><button type="button" onClick={() => setMode('student')}><FiUserPlus /><span><strong>Students / Allocations</strong><small>{assignedCount} students assigned</small></span></button></div>}{mode === 'teacher' && <form className="section-assignment-form section-teacher-form" onSubmit={submitTeacher}><div className="section-assignment-form-head"><h3>Assign teacher</h3></div><div><label>Teacher / Faculty Advisor<SearchableSelect label="Faculty Advisor" value={teacher} onChange={setTeacher} options={teacherCandidates.map((item) => ({ value: item.employeeProfileId, name: item.fullName, code: [item.employeeCode, item.designation].filter(clean).join(' / ') }))} placeholder="Select faculty advisor" searchPlaceholder="Search faculty name or employee code..." /></label><button className="section-primary" disabled={saving}><FiCheckCircle /> {saving ? 'Saving...' : 'Save Teacher'}</button></div>{teacherError && <p className="section-assignment-error" role="alert">{teacherError}</p>}</form>}{mode === 'student' && <div className="section-student-allocation"><div className="section-assignment-form-head"><h3>Students / Allocations</h3><span>{selectedStudents.length} selected</span></div>{section.status !== 'Active' && <p className="section-assignment-error" role="alert">Students can only be assigned to an active section.</p>}<label className="section-student-search"><FiSearch aria-hidden="true" /><input type="search" aria-label="Search students" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search students..." /></label><label className="section-select-all"><input type="checkbox" checked={allVisibleSelected} disabled={!available || !selectableRows.length || section.status !== 'Active'} onChange={toggleAll} /> Select All Eligible</label><div className="section-eligible-list">{visibleStudents.length ? visibleStudents.map(({ student, crossAssignment }) => { const otherSection = crossAssignment ? sectionById.get(String(crossAssignment.sectionId)) : null; const disabled = Boolean(crossAssignment) || section.status !== 'Active'; return <label className={`section-student-row ${disabled ? 'disabled' : ''}`} key={student.id}><input type="checkbox" checked={selectedIds.includes(String(student.id))} disabled={disabled} onChange={() => toggleStudent(student.id)} /><span><strong>{student.name}</strong><small>{student.code || 'Student record'}</small></span><em>{crossAssignment ? `Already assigned to ${otherSection?.name || 'another section'}` : 'Unassigned'}</em></label> }) : <p className="section-assignment-empty">{studentsLoading ? 'Loading student profiles...' : error ? 'Unable to load student profiles. Please reopen this panel to retry.' : 'No matching unassigned student profiles found for this branch and section.'}</p>}</div><footer className="section-student-actions"><span>Selected: {selectedStudents.length}</span><button className="section-primary" disabled={saving || !selectedStudents.length || section.status !== 'Active'} onClick={submitSelected}><FiUserPlus /> {saving ? 'Assigning...' : 'Assign Selected Students'}</button></footer>{error && <p className="section-assignment-error" role="alert">{error}</p>}<div className="section-assigned-list"><h3>Assigned Students <span>{assignments.length}</span></h3>{assignments.length ? assignments.map((assignment) => <article key={`${assignment.sectionId}-${assignment.studentId}-${assignment.id}`}><div><strong>{assignment.studentName}</strong><span>{assignment.enrollmentNo}</span></div><button title="Remove student" onClick={() => remove(assignment).catch(showError)}><FiTrash2 className="module-action-icon module-action-icon--danger" /> Remove</button></article>) : <p>No students have been assigned yet.</p>}</div></div>}{mode && <footer><button type="button" className="section-back-button" onClick={() => { setMode(''); setError(''); setSelectedIds([]) }}>Back</button></footer>}</section></div>
}
function Confirm({ action, close, confirm }) { const activate = action.nextStatus === 'Active'; return <div className="section-overlay centered"><section className="section-confirm" role="alertdialog" aria-modal="true"><i>!</i><h2>{activate ? 'Activate' : 'Deactivate'} Section?</h2><p><strong>{action.row.name} ({action.row.code})</strong> {activate ? 'will become available for student allocations.' : `${action.assigned} students are currently assigned to this section. Deactivating this section will prevent new allocations. Existing allocations are not removed by this action.`}</p><footer><button onClick={close}>Cancel</button><button className={activate ? 'section-primary' : 'section-danger'} onClick={confirm}>{activate ? 'Activate' : 'Confirm Deactivate'}</button></footer></section></div> }

export default function SectionManagement({ mode }) {
  const { id } = useParams()
  if (mode === 'form') return <SectionForm key="add" />
  if (mode === 'edit') return <SectionForm key={id} editMode />
  if (mode === 'details' || id) return <SectionDetails />
  return <SectionList />
}


