import ExportMenu, { PrintDetailsButton } from '../../components/ExportMenu'
import { sectionColumns } from '../../utils/exportColumns'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiBookOpen, FiCheckCircle, FiClock, FiEdit2, FiEye, FiFilter, FiGrid, FiLayers, FiPlus, FiSearch, FiToggleLeft, FiToggleRight, FiTrash2, FiUser, FiUserPlus, FiUsers, FiX } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import FilterPanel from '../../components/FilterPanel'
import SearchableSelect from '../../components/SearchableSelect'
import CompactSummary from '../../components/CompactSummary'
import { academicYearApi, branchApi, courseApi, sectionAllocationApi, sectionApi, sectionAssignmentApi, studentApi } from '../../api/apiEndpoints'
import { searchSemesters } from '../../auth/collegeApi'
import { getActiveAcademicYears, normalizeAcademicYear } from '../../utils/academicYearUtils'
import { branchTypeLabel } from '../../utils/semesterUtils'
import eventBus, { ERP_EVENTS } from '../../services/eventBus'
import './SectionManagement.css'
import '../../styles/directory-search.css'

const PAGE_SIZE = 5
const sectionLabel = (index) => { let label = ''; for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) label = String.fromCharCode(65 + (n - 1) % 26) + label; return label }
const emptyForm = { name: '', code: '', courseId: '', branchId: '', semesterId: '', academicYearId: '', capacity: 60, facultyAdvisorEmployeeProfileId: '', advisor: '', room: '', status: '' }
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
const normalizeCourse = (item = {}) => ({ ...item, id: idOf(item, 'courseId', 'CourseId', 'id', 'Id'), name: courseName(item), code: courseCode(item), collegeId: item.collegeId ?? item.college?.collegeId ?? item.college?.id ?? '', departmentId: item.departmentId ?? item.department?.departmentId ?? item.department?.id ?? '' })
const normalizeBranch = (item = {}) => ({ ...item, id: idOf(item, 'branchId', 'BranchId', 'id', 'Id'), courseId: idOf(item, 'courseId', 'CourseId') || item.course?.courseId || item.course?.id || '', name: branchName(item), code: branchCode(item), branchType: branchTypeLabel(item), collegeId: item.collegeId ?? item.college?.collegeId ?? item.college?.id ?? '', departmentId: item.departmentId ?? item.department?.departmentId ?? item.department?.id ?? '' })
const normalizeSemester = (item = {}) => {
  const number = item.semesterNumber ?? item.semester?.semesterNumber ?? item.number
  return { ...item, id: idOf(item, 'semesterId', 'courseStructureId', 'structureId', 'id') || item.semester?.semesterId || item.semester?.id || '', name: number ? `Semester ${number}` : sem(item.semesterName ?? item.semester?.semesterName ?? item.semester?.name ?? item.name ?? ''), number: Number(number || String(item.semesterName || '').match(/\d+/)?.[0] || 0), courseId: item.courseId ?? item.course?.courseId ?? item.course?.id ?? '', branchId: item.branchId ?? item.branch?.branchId ?? item.branch?.id ?? '', academicYearId: item.academicYearId ?? item.academicYear?.academicYearId ?? item.academicYear?.id ?? item.yearId ?? '', academicYearName: item.academicYearName ?? item.academicYear?.academicYearName ?? item.academicYear?.name ?? item.yearName ?? '' }
}
const normalizeAssignment = (item = {}) => ({ id: item.assignmentId ?? item.id ?? item.studentId, sectionId: item.sectionId ?? item.section_id ?? '', studentId: item.studentId ?? item.student_id ?? item.student?.studentId ?? item.student?.id ?? item.enrollmentNo ?? '', studentName: item.studentName ?? item.fullName ?? item.student_name ?? item.student?.fullName ?? item.student?.name ?? item.name ?? '', enrollmentNo: item.enrollmentNo ?? item.studentCode ?? item.registrationNumber ?? item.rollNumber ?? item.studentId ?? '' })
const studentAcademicValue = (student = {}, key) => student[key] ?? student.academic?.[key] ?? student.academicDetails?.[key] ?? student.academicInformation?.[key] ?? student.studentAcademicDetails?.[key] ?? student.studentAcademicInformation?.[key] ?? ''
const normalizeStudent = (item = {}) => ({ ...item, id: item.studentId ?? item.id ?? '', name: item.fullName ?? item.studentName ?? item.name ?? [item.firstName, item.lastName].filter(Boolean).join(' '), code: [item.admissionNumber, item.registrationNumber, item.rollNumber, item.studentCode].filter(clean).join(' / '), courseId: studentAcademicValue(item, 'courseId'), branchId: studentAcademicValue(item, 'branchId'), semesterId: studentAcademicValue(item, 'semesterId'), academicYearId: studentAcademicValue(item, 'academicYearId') })
const sameStudent = (assignment = {}, student = {}) => [assignment.studentId, assignment.enrollmentNo, assignment.studentCode, assignment.registrationNumber].filter(clean).some((value) => [student.id, student.code, student.studentCode, student.registrationNumber, student.rollNumber, student.admissionNumber].filter(clean).some((candidate) => String(candidate).split('/').map((part) => part.trim()).includes(String(value).trim())))
const matchesStudentMapping = (student, section) => ['courseId', 'branchId', 'semesterId', 'academicYearId'].every((key) => clean(section?.[key]) && clean(student?.[key]) && String(student[key]) === String(section[key]))
const sectionLetter = (section) => String(section.name || '').match(/^Section\s+([A-Z]+)$/i)?.[1]?.toUpperCase() || String(section.code || '').match(/(?:^|-)([A-Z]+)$/i)?.[1]?.toUpperCase()
const sameMapping = (left, right) => ['courseId', 'branchId', 'semesterId', 'academicYearId'].every((key) => clean(left?.[key]) && clean(right?.[key]) ? String(left[key]) === String(right[key]) : false)

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
  return { ...item, id: item.sectionId ?? item.id ?? '', name: item.sectionName ?? item.name ?? '', code: item.sectionCode ?? item.code ?? '', courseId, course: item.courseName ?? item.course?.courseName ?? item.course?.name ?? course?.name ?? '', courseCode: item.courseCode ?? item.course?.courseCode ?? course?.code ?? '', branchId, branch: item.branchName ?? item.branch?.branchName ?? item.branch?.name ?? branch?.name ?? '', branchCode: item.branchCode ?? item.branch?.branchCode ?? branch?.code ?? '', branchType: branchTypeLabel(item.branch ?? branch ?? { branchType: item.branchType }), semesterId, semester: sem(item.semesterName ?? item.semester?.semesterName ?? semester?.name ?? item.semesterNumber ?? ''), semesterNumber: item.semesterNumber ?? semester?.number ?? '', academicYearId, academicYear: item.academicYearName ?? item.academicYear?.academicYearName ?? item.academicYear?.name ?? yearName(year), collegeId: item.collegeId ?? branch?.collegeId ?? course?.collegeId ?? '', departmentId: item.departmentId ?? branch?.departmentId ?? course?.departmentId ?? '', capacity, currentStrength, availableSeats: Number(item.availableSeats ?? Math.max(capacity - currentStrength, 0)), advisor: item.advisor ?? item.facultyAdvisorName ?? item.classTeacherName ?? '', facultyAdvisorEmployeeProfileId: item.facultyAdvisorEmployeeProfileId ?? item.classTeacherEmployeeProfileId ?? '', room: item.room ?? item.classRoom ?? '', status: item.status === false || item.status === 0 || item.status === 'Inactive' ? 'Inactive' : 'Active' }
}

async function loadSources() {
  const [sectionRows, courseRows, branchRows, yearRows, assignmentRows, summaryData] = await Promise.all([sectionApi.getAll(), courseApi.getAll(), branchApi.getAll(), academicYearApi.getAll(), sectionAssignmentApi.list().catch(() => []), sectionApi.summary().catch(() => null)])
  const courses = courseRows.map(normalizeCourse).filter((item) => item.id && item.name)
  const branches = branchRows.map(normalizeBranch).filter((item) => item.id && item.name)
  const years = yearRows.map((year) => normalizeAcademicYear({ ...year, status: year.status === false || year.status === 0 || year.isActive === false ? 'ARCHIVED' : year.status })).filter((item) => item.id && item.name)
  const semesters = []
  const sections = sectionRows.map((item) => normalizeSection(item, makeLookups(courses, branches, semesters, years)))
  return { courses, branches, years, semesters, sections, assignments: assignmentRows.map(normalizeAssignment), summary: summaryData }
}

const Page = ({ children }) => <DashboardLayout><main className="section-management">{children}</main></DashboardLayout>
const Header = ({ title, text, children }) => <header className="section-page-header"><div><p className="section-breadcrumb">Academic Configuration <span>/</span> Sections</p><h1>{title}</h1>{text && <p>{text}</p>}</div><div className="section-header-actions">{children}</div></header>
const Status = ({ value }) => <span className={`section-status ${String(value || '').toLowerCase()}`}>{value}</span>
const ReadOnly = ({ value, placeholder = 'Resolved after selection' }) => <input value={value || ''} placeholder={placeholder} readOnly />
const Field = ({ label, error, children }) => <label className={`section-field ${error ? 'invalid' : ''}`}><span>{label.endsWith(' *') ? <>{label.slice(0, -2)} <b className="section-required">*</b></> : label}</span>{children}{error && <small role="alert">{error}</small>}</label>
function InfoRows({ rows }) { const visible = rows.filter(([, value]) => clean(value)); if (!visible.length) return null; return <div className="cm-info-rows">{visible.map(([label, value]) => <div className="cm-info-row" key={label}><span className="cm-info-label">{label}</span><span className="cm-info-val">{value}</span></div>)}</div> }
function InfoCard({ icon: Icon, title, rows }) { const visible = rows.filter(([, value]) => clean(value)); if (!visible.length) return null; return <section className="cm-info-card"><div className="cm-info-card-header"><Icon /><h2>{title}</h2></div><InfoRows rows={visible} /></section> }
function Empty({ icon: Icon, title, action }) { return <div className="section-empty"><Icon /><h3>{title}</h3>{action}</div> }

function SectionList() {
  const [sections, setSections] = useState([]), [assignments, setAssignments] = useState([]), [summaryData, setSummaryData] = useState(null)
  const [filters, setFilters] = useState({ query: '', course: '', branch: '', semester: '', status: '', academicYear: '' }), [page, setPage] = useState(1), [loading, setLoading] = useState(true), [error, setError] = useState(''), [toast, setToast] = useState(''), [assigning, setAssigning] = useState(null), [confirmAction, setConfirmAction] = useState(null)
  const load = useCallback(async () => { setLoading(true); setError(''); try { const data = await loadSources(); setSections(data.sections); setAssignments(data.assignments);  setSummaryData(data.summary) } catch (requestError) { setError(apiError(requestError, 'Unable to load sections.')) } finally { setLoading(false) } }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(''), 2200); return () => clearTimeout(timer) }, [toast])
  const count = (sectionId) => assignments.filter((item) => String(item.sectionId) === String(sectionId)).length
  const courses = [...new Set(sections.map((item) => item.course).filter(Boolean))]
  const branches = [...new Set(sections.filter((item) => !filters.course || item.course === filters.course).map((item) => item.branch).filter(Boolean))]
  const semesters = [...new Set(sections.map((item) => item.semester).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const years = [...new Set(sections.map((item) => item.academicYear).filter(Boolean))]
  const filtered = useMemo(() => sections.filter((item) => `${item.name} ${item.code} ${item.course} ${item.courseCode} ${item.branch} ${item.branchCode} ${item.semester} ${item.academicYear} ${item.advisor}`.toLowerCase().includes(filters.query.toLowerCase().trim()) && (!filters.course || item.course === filters.course) && (!filters.branch || item.branch === filters.branch) && (!filters.semester || item.semester === filters.semester) && (!filters.academicYear || item.academicYear === filters.academicYear) && (!filters.status || item.status === filters.status)), [sections, filters])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), currentPage = Math.min(page, pageCount), visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const summary = { total: summaryData?.totalSections ?? summaryData?.total ?? sections.length, active: summaryData?.activeSections ?? summaryData?.active ?? sections.filter((item) => item.status === 'Active').length, inactive: sections.filter((item) => item.status === 'Inactive').length, students: summaryData?.currentStudents ?? summaryData?.totalStudents ?? sections.reduce((sum, item) => sum + Math.max(Number(item.currentStrength || 0), count(item.id)), 0) }
  const changeFilter = (key, value) => { setFilters((current) => ({ ...current, [key]: value, ...(key === 'course' ? { branch: '' } : {}) })); setPage(1) }
  const clearFilters = () => { setFilters({ query: '', course: '', branch: '', semester: '', status: '', academicYear: '' }); setPage(1) }
  const openAssign = async (section) => { try { const latest = (await sectionAssignmentApi.listBySection(section.id)).map((item) => normalizeAssignment({ ...item, sectionId: section.id })); setAssignments((current) => [...current.filter((item) => String(item.sectionId) !== String(section.id)), ...latest]); setAssigning({ ...section, currentStrength: latest.length }) } catch (requestError) { setToast(apiError(requestError, 'Unable to load section assignments.')) } }
  const assignStudent = async (student) => { const current = (await sectionAssignmentApi.listBySection(assigning.id)).map(normalizeAssignment); const latestSection = normalizeSection(responseRecord(await sectionApi.getById(assigning.id))); if (latestSection.status !== 'Active') throw new Error('Students can only be assigned to an active section.'); if (Math.max(current.length, latestSection.currentStrength) >= latestSection.capacity) throw new Error(`${assigning.name} is already at full capacity.`); if (current.some((item) => String(item.studentId) === String(student.studentId))) throw new Error('This student is already assigned to this section.'); await sectionAssignmentApi.assign(assigning.id, student); const latest = (await sectionAssignmentApi.listBySection(assigning.id)).map((item) => normalizeAssignment({ ...item, sectionId: assigning.id })); setAssignments([...assignments.filter((item) => String(item.sectionId) !== String(assigning.id)), ...latest]); setSections((rows) => rows.map((row) => String(row.id) === String(assigning.id) ? { ...row, currentStrength: latest.length } : row)); setSummaryData(null); setToast(`${student.studentName} assigned to ${assigning.name}.`) }
  const removeAssignment = async (assignment) => { await sectionAssignmentApi.remove(assignment.sectionId, assignment.id); const latest = (await sectionAssignmentApi.listBySection(assignment.sectionId)).map((item) => normalizeAssignment({ ...item, sectionId: assignment.sectionId })); setAssignments((rows) => [...rows.filter((item) => String(item.sectionId) !== String(assignment.sectionId)), ...latest]); setSections((rows) => rows.map((row) => String(row.id) === String(assignment.sectionId) ? { ...row, currentStrength: latest.length } : row)); setSummaryData(null); setToast(`${assignment.studentName} removed from the section.`) }
  const assignTeacher = async (teacher) => { if (!teacher?.employeeProfileId) throw new Error('Select a faculty candidate.'); await sectionAllocationApi.assignTeacher(assigning.id, teacher.employeeProfileId); const next = sections.map((item) => item.id === assigning.id ? { ...item, advisor: teacher.fullName, facultyAdvisorEmployeeProfileId: teacher.employeeProfileId } : item); setSections(next); setAssigning((current) => current ? { ...current, advisor: teacher.fullName, facultyAdvisorEmployeeProfileId: teacher.employeeProfileId } : current); setToast(`${teacher.fullName} assigned to ${assigning.name}.`) }
  const toggle = async (section) => {
    try {
      const rows = await sectionAssignmentApi.listBySection(section.id)
      setConfirmAction({ row: section, nextStatus: section.status === 'Active' ? 'Inactive' : 'Active', assigned: rows.length })
    } catch (error) { setToast(apiError(error, 'Unable to verify the assigned student count.')) }
  }
  const confirm = async () => { const { row, nextStatus } = confirmAction; try { await sectionApi.updateStatus(row.id, nextStatus); eventBus.emit(ERP_EVENTS.ACADEMIC_UPDATED, { sectionId: row.id, status: nextStatus }); setSections(sections.map((item) => item.id === row.id ? { ...item, status: nextStatus } : item)); setSummaryData(null); setToast(`Section ${nextStatus === 'Active' ? 'activated' : 'deactivated'}.`); setConfirmAction(null) } catch (requestError) { setToast(apiError(requestError, 'Unable to update section status.')) } }
  const hasFilters = Object.values(filters).some(Boolean)
  return <Page>
    {toast && <div className="section-toast" role="status"><FiCheckCircle />{toast}<button aria-label="Dismiss" onClick={() => setToast('')}><FiX /></button></div>}
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
              <thead><tr>{['Section', 'Course', 'Branch', 'Semester', 'Academic Year', 'Strength / Capacity', 'Faculty Advisor', 'Status', 'Actions'].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
              <tbody>
                {visible.map((section) => {
                  const assigned = Math.max(count(section.id), Number(section.currentStrength || 0))
                  return (
                    <tr key={section.id}>
                      <td><strong className="section-name">{section.name}</strong><small>{section.code}</small></td>
                      <td><strong>{section.course}</strong>{section.courseCode && <small>{section.courseCode}</small>}</td>
                      <td><strong>{section.branch}</strong>{section.branchCode && <small>{section.branchCode}</small>}</td>
                      <td>{section.semester}</td>
                      <td>{section.academicYear}</td>
                      <td><strong>{assigned} / {section.capacity}</strong><small>{Math.max(Number(section.capacity || 0) - assigned, 0)} seats available</small></td>
                      <td>{section.advisor ? <strong>{section.advisor}</strong> : <span className="section-unassigned">Unassigned</span>}</td>
                      <td><Status value={section.status} /></td>
                      <td>
                        <div className="section-actions">
                          <Link title="View details" to={`/section-management/${section.id}`}><FiEye className="module-action-icon module-action-icon--view" /></Link>
                          <Link title="Edit section" to={`/section-management/${section.id}/edit`}><FiEdit2 className="module-action-icon module-action-icon--edit" /></Link>
                          <button className="section-assign-action" onClick={() => openAssign(section)}><FiUserPlus /> Assign</button>
                          <button className={`section-status-action ${section.status === 'Active' ? 'success' : 'danger'}`} onClick={() => toggle(section)}>{section.status === 'Active' ? <FiToggleRight /> : <FiToggleLeft />}</button>
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
    {assigning && <AssignStudents section={assigning} assignments={assignments.filter((item) => String(item.sectionId) === String(assigning.id))} allAssignments={assignments} sections={sections} assign={assignStudent} assignTeacher={assignTeacher} remove={removeAssignment} close={() => setAssigning(null)} />}
    {confirmAction && <Confirm action={confirmAction} close={() => setConfirmAction(null)} confirm={confirm} />}
  </Page>
}

function SectionForm({ editMode = false }) {
  const { id } = useParams(), navigate = useNavigate()
  const [masters, setMasters] = useState({ courses: [], branches: [], years: [], semesters: [] }), [sections, setSections] = useState([]), [assignments, setAssignments] = useState([]), [teacherCandidates, setTeacherCandidates] = useState([])
  const semesterRequest = useRef(0)
  const legacy = useRef({})
  const [form, setForm] = useState(emptyForm), [errors, setErrors] = useState({}), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [notice, setNotice] = useState('')
  const [formTab, setFormTab] = useState('mapping')
  const course = masters.courses.find((item) => String(item.id) === String(form.courseId))
  const branches = masters.branches.filter((item) => String(item.courseId) === String(form.courseId))
  const branch = branches.find((item) => String(item.id) === String(form.branchId))
  const activeYears = useMemo(() => getActiveAcademicYears(masters.years), [masters.years])
  const activeYear = editMode ? masters.years.find((item) => String(item.id) === String(form.academicYearId)) : activeYears.find((item) => String(item.id) === String(form.academicYearId))
  const semesters = masters.semesters.filter((item) => (!form.courseId || (!item.courseId || String(item.courseId) === String(form.courseId))) && (!form.branchId || (!item.branchId || String(item.branchId) === String(form.branchId))) && (!form.academicYearId || !item.academicYearId || String(item.academicYearId) === String(form.academicYearId)))
  const semester = semesters.find((item) => String(item.id) === String(form.semesterId))
  const assignedCount = Math.max(Number(form.currentStrength || 0), assignments.filter((item) => String(item.sectionId) === String(id)).length)
  const noActiveYear = !editMode && activeYears.length === 0
  const yearWarning = noActiveYear ? 'No active academic year is configured.' : !editMode && activeYears.length > 1 ? 'Multiple active academic years are configured. Select the applicable active year.' : ''
  const canOpenDetailsTab = Boolean(form.courseId && form.branchId && form.semesterId && form.academicYearId)

  const fetchSemesters = useCallback(async (branchId, academicYearId, courseId) => {
    const request = ++semesterRequest.current
    setMasters((current) => ({ ...current, semesters: [] }))
    if (!branchId || !academicYearId) return
    try {
      const response = await searchSemesters({ courseId, branchId, academicYearId })
      if (request === semesterRequest.current) setMasters((current) => ({ ...current, semesters: responseList(response).map(normalizeSemester) }))
    } catch (error) { if (request === semesterRequest.current) setErrors((current) => ({ ...current, semesterId: apiError(error, 'Unable to load semesters.') })) }
  }, [])
  const load = useCallback(async () => { setLoading(true); try { const data = await loadSources(); setMasters({ courses: data.courses, branches: data.branches, years: data.years, semesters: [] }); setSections(data.sections); setAssignments(data.assignments); setTeacherCandidates(await sectionAllocationApi.getTeacherCandidates(id || 0).catch(() => [])); if (editMode && id) { const detail = normalizeSection({ ...(data.sections.find((item) => String(item.id) === String(id)) || {}), ...responseRecord(await sectionApi.getById(id)) }, makeLookups(data.courses, data.branches, [], data.years)); legacy.current = { sectionType: detail.sectionType ?? detail.type, shift: detail.shift }; const editable = { ...detail }; delete editable.type; delete editable.sectionType; delete editable.shift; setForm({ ...emptyForm, ...editable, courseId: String(detail.courseId || ''), branchId: String(detail.branchId || ''), semesterId: String(detail.semesterId || ''), academicYearId: String(detail.academicYearId || ''), facultyAdvisorEmployeeProfileId: detail.facultyAdvisorEmployeeProfileId || '' }); setFormTab('details'); await fetchSemesters(detail.branchId, detail.academicYearId, detail.courseId) } else { const active = getActiveAcademicYears(data.years); setForm((current) => ({ ...current, academicYearId: active.length === 1 ? String(active[0].id) : '', status: '' })); setFormTab('mapping') } } catch (error) { setErrors({ form: apiError(error, 'Unable to load section form.') }) } finally { setLoading(false) } }, [id, editMode, fetchSemesters])
  useEffect(() => { load() }, [load])
  const setCourse = async (courseId) => { semesterRequest.current += 1; const selectedCourse = masters.courses.find((item) => String(item.id) === String(courseId)); setForm((current) => ({ ...current, courseId, course: selectedCourse?.name || '', courseCode: selectedCourse?.code || '', branchId: '', branch: '', branchCode: '', semesterId: '', semester: '', name: '', code: '' })); setMasters((current) => ({ ...current, semesters: [] })); setErrors({}) }
  const setBranch = async (branchId) => { const selectedBranch = masters.branches.find((item) => String(item.id) === String(branchId)); setForm((current) => ({ ...current, branchId, branch: selectedBranch?.name || '', branchCode: selectedBranch?.code || '', semesterId: '', semester: '', name: '', code: '' })); setErrors({}); await fetchSemesters(branchId, form.academicYearId, form.courseId) }
  const suggestSection = (semesterId) => { const selectedSemester = masters.semesters.find((item) => String(item.id) === String(semesterId)); const draft = { ...form, semesterId, semester: selectedSemester?.name || '', academicYear: activeYear?.name || form.academicYear }; const used = new Set(sections.filter((item) => sameMapping(item, draft) && String(item.id) !== String(id)).map(sectionLetter).filter(Boolean)); let index = 0; while (used.has(sectionLabel(index))) index += 1; const letter = sectionLabel(index); const prefix = branch?.code || form.branchCode || branch?.name || ''; const semesterNumber = selectedSemester?.number || String(selectedSemester?.name || '').match(/\d+/)?.[0] || ''; return letter ? { name: `Section ${letter}`, code: [prefix, semesterNumber ? `S${semesterNumber}` : '', letter].filter(Boolean).join('-').toUpperCase() } : {} }
  const setSemester = (semesterId) => { const selectedSemester = masters.semesters.find((item) => String(item.id) === String(semesterId)); const suggestion = editMode ? {} : suggestSection(semesterId); setForm((current) => ({ ...current, semesterId, semester: selectedSemester?.name || '', academicYearId: selectedSemester?.academicYearId || current.academicYearId, academicYear: selectedSemester?.academicYearName || activeYear?.name || current.academicYear, ...suggestion })); setErrors((current) => ({ ...current, semesterId: '', name: '', code: '' })) }
  const setField = (key, value) => { setForm((current) => ({ ...current, [key]: key === 'code' ? value.toUpperCase() : value })); setErrors((current) => ({ ...current, [key]: '' })) }
  const validate = () => { const next = {}; ['courseId', 'branchId', 'semesterId', 'name', 'code', 'status'].forEach((key) => { if (!String(form[key] || '').trim()) next[key] = 'Required.' }); if (!form.academicYearId) next.academicYearId = yearWarning || 'An academic year is required.'; if (!editMode && !semester) next.semesterId = 'Select a configured semester.'; if (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 1 || Number(form.capacity) > 120) next.capacity = 'Capacity must be a whole number from 1 to 120.'; if (editMode && Number(form.capacity) < assignedCount) next.capacity = `Capacity cannot be below the ${assignedCount} assigned students.`; if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(String(form.code || '').trim().toUpperCase())) next.code = 'Use uppercase letters, numbers, and single hyphens only.'; const mapping = { ...form, academicYearId: form.academicYearId || activeYear?.id }; if (sections.some((item) => String(item.id) !== String(id) && sameMapping(item, mapping) && item.name.trim().toLowerCase() === form.name.trim().toLowerCase())) next.name = 'This section already exists for this academic mapping.'; if (sections.some((item) => String(item.id) !== String(id) && sameMapping(item, mapping) && item.code.trim().toLowerCase() === form.code.trim().toLowerCase())) next.code = 'This section code already exists for this academic mapping.'; setErrors(next); return !Object.keys(next).length }
  const submit = async (event) => { event.preventDefault(); if (saving || !validate()) return; setSaving(true); try { const mappedBranch = !editMode && (!branch?.collegeId || !branch?.departmentId) ? normalizeBranch(responseRecord(await branchApi.getById(form.branchId))) : branch; const mappedCourse = !editMode && (!mappedBranch?.collegeId || !mappedBranch?.departmentId) ? normalizeCourse(responseRecord(await courseApi.getById(form.courseId))) : course; const payload = { ...form, collegeId: mappedBranch?.collegeId || mappedCourse?.collegeId || form.collegeId, departmentId: mappedBranch?.departmentId || mappedCourse?.departmentId || form.departmentId, academicYearId: form.academicYearId || activeYear?.id, academicYear: activeYear?.name || form.academicYear, ...legacy.current, capacity: Number(form.capacity) }; if (editMode) { const currentStudents = await sectionAssignmentApi.listBySection(id); if (payload.capacity < currentStudents.length) throw new Error('Capacity cannot be below the current assigned student count.'); const capacityCheck = await sectionApi.validateCapacity(id, payload.capacity); if (capacityCheck === false || capacityCheck?.isValid === false) throw new Error(capacityCheck?.message || 'The requested capacity is not allowed.'); await sectionApi.update(id, payload); await sectionApi.updateStatus(id, payload.status) } else { const created = await sectionApi.create(payload); if (payload.status === 'Inactive') await sectionApi.updateStatus(created.id, payload.status) }; eventBus.emit(ERP_EVENTS.ACADEMIC_UPDATED, { form }); setNotice(`Section ${editMode ? 'updated' : 'created'} successfully.`); setTimeout(() => navigate('/section-management'), 700) } catch (error) { setErrors((current) => ({ ...current, form: apiError(error, 'Unable to save section.') })) } finally { setSaving(false) } }
  if (loading) return <Page><Empty icon={FiClock} title="Loading section form..." /></Page>
  return <Page>{notice && <div className="section-toast" role="status"><FiCheckCircle />{notice}</div>}<Header title={editMode ? 'Edit Section' : 'Add Section'} text={editMode ? 'Update section capacity, advisor, room, and status.' : 'Create a section for the selected academic mapping.'}><Link className="section-primary secondary" to="/section-management"><FiArrowLeft /> Back</Link></Header><form className={`section-form-page section-form-page--${formTab}`} onSubmit={submit} noValidate>{errors.form && <div className="section-form-error" role="alert">{errors.form}</div>}{yearWarning && <div className="section-form-warning" role="alert">{yearWarning}</div>}<div className="section-form-tabs" role="tablist" aria-label="Section form tabs"><button type="button" role="tab" aria-selected={formTab === 'mapping'} className={formTab === 'mapping' ? 'active' : ''} onClick={() => setFormTab('mapping')}>Academic Mapping</button><button type="button" role="tab" aria-selected={formTab === 'details'} className={formTab === 'details' ? 'active' : ''} disabled={!canOpenDetailsTab} onClick={() => setFormTab('details')}>Section Details</button></div><section className="section-form-card section-form-card--mapping"><header><span>Academic Mapping</span><h2>Course, Branch, Semester, Academic Year</h2></header><div className="section-form-grid"><Field label="Course *" error={errors.courseId}><SearchableSelect label="Course" value={form.courseId} options={masters.courses.map((item) => ({ id: item.id, value: item.id, name: item.name, code: item.code }))} onChange={setCourse} disabled={editMode} placeholder="Select Course" searchPlaceholder="Search course name or code..." /></Field><Field label="Course Code"><ReadOnly value={course?.code || form.courseCode} placeholder="Resolved from selected course" /></Field><Field label="Branch *" error={errors.branchId}><SearchableSelect label="Branch" value={form.branchId} options={branches.map((item) => ({ id: item.id, value: item.id, name: item.name, code: item.code }))} onChange={setBranch} disabled={editMode || !form.courseId} placeholder={form.courseId ? 'Select Branch' : 'Select Course first'} searchPlaceholder="Search branch name or code..." /></Field><Field label="Branch Code"><ReadOnly value={branch?.code || form.branchCode} placeholder="Resolved from selected branch" /></Field><Field label={editMode ? "Academic Year" : "Active Academic Year"} error={errors.academicYearId}>{!editMode && activeYears.length > 1 ? <SearchableSelect label="Active Academic Year" value={form.academicYearId} options={activeYears} onChange={(value) => { setForm((current) => ({ ...current, academicYearId: value, semesterId: "", name: "", code: "" })); fetchSemesters(form.branchId, value, form.courseId) }} placeholder="Select active academic year" /> : <ReadOnly value={activeYear?.name || form.academicYear} placeholder="Resolved from active academic year" />}</Field><Field label="Semester *" error={errors.semesterId}><SearchableSelect label="Semester" value={form.semesterId} options={(editMode && !semesters.some((item) => String(item.id) === String(form.semesterId)) && form.semesterId ? [...semesters, { id: form.semesterId, name: form.semester }] : semesters).map((item) => ({ id: item.id, value: item.id, name: item.name, code: item.academicYearName }))} onChange={setSemester} disabled={editMode || !form.branchId || !form.academicYearId} placeholder={form.branchId ? 'Select Semester' : 'Select Branch first'} searchPlaceholder="Search semester..." noOptionsMessage="No configured semesters found." /></Field></div></section><section className="section-form-card section-form-card--details"><header><span>Section Information</span><h2>Capacity, Faculty Advisor, and Room</h2></header><div className="section-form-grid"><Field label="Section Name *" error={errors.name}><input value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="Section A" /></Field><Field label="Section Code *" error={errors.code}><input value={form.code} onChange={(event) => setField('code', event.target.value)} placeholder="CSE-S1-A" /></Field><Field label="Capacity *" error={errors.capacity}><input type="number" min="1" max="120" value={form.capacity} onChange={(event) => setField('capacity', event.target.value)} /></Field><Field label="Faculty Advisor"><SearchableSelect label="Faculty Advisor" value={form.facultyAdvisorEmployeeProfileId} options={teacherCandidates.map((item) => ({ id: item.employeeProfileId, value: item.employeeProfileId, name: item.fullName, code: item.employeeCode || item.designation || '' }))} onChange={(value) => { const teacher = teacherCandidates.find((item) => String(item.employeeProfileId) === String(value)); setForm((current) => ({ ...current, facultyAdvisorEmployeeProfileId: value, advisor: teacher?.fullName || '' })) }} placeholder="Select Faculty Advisor" searchPlaceholder="Search faculty..." noOptionsMessage="No faculty candidates found." />{!teacherCandidates.length && <small>No faculty candidates are available from the current assignment API.</small>}</Field><Field label="Room / Classroom"><input value={form.room} onChange={(event) => setField('room', event.target.value)} placeholder="CSE-101" /></Field><Field label="Status *" error={errors.status}><select value={form.status} onChange={(event) => setField('status', event.target.value)}><option value="" disabled>Select Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select></Field></div></section><footer className="section-form-actions">{formTab === 'mapping' ? <><Link className="section-primary secondary" to="/section-management">Cancel</Link><button type="button" className="section-primary" disabled={!canOpenDetailsTab} onClick={() => setFormTab('details')}>Next</button></> : <><button type="button" className="section-primary secondary" onClick={() => setFormTab('mapping')}>Back</button><button className="section-primary" disabled={saving}>{saving ? 'Saving...' : editMode ? 'Save Changes' : 'Create Section'}</button></>}</footer></form></Page>
}

function SectionDetails() {
  const { id } = useParams()
  const [section, setSection] = useState(null), [assignments, setAssignments] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('')
  useEffect(() => { let alive = true; const load = async () => { setLoading(true); try { const sources = await loadSources(); const base = sources.sections.find((item) => String(item.id) === String(id)) || {}; const detail = normalizeSection({ ...base, ...responseRecord(await sectionApi.getById(id)) }, makeLookups(sources.courses, sources.branches, sources.semesters, sources.years)); const rows = await sectionAssignmentApi.listBySection(id).catch(() => []); if (alive) { setSection(detail); setAssignments(rows.map((item) => normalizeAssignment({ ...item, sectionId: id }))) } } catch (requestError) { if (alive) setError(apiError(requestError, 'Unable to load section details.')) } finally { if (alive) setLoading(false) } }; load(); return () => { alive = false } }, [id])
  if (loading) return <Page><Empty icon={FiClock} title="Loading section details..." /></Page>
  if (error || !section) return <Page><Header title="Section Details"><Link className="section-primary secondary" to="/section-management"><FiArrowLeft /> Back</Link></Header><Empty icon={FiLayers} title={error || 'Section not found.'} /></Page>
  const assigned = Math.max(assignments.length, Number(section.currentStrength || 0)), available = Math.max(Number(section.capacity || 0) - assigned, 0)
  return <Page><Header title="Section Details" text="View section identity, academic mapping, and allocation capacity."><PrintDetailsButton title={section.name + " details"} selector=".section-profile-page" /><Link className="section-primary secondary" to="/section-management"><FiArrowLeft /> Back to Sections</Link><Link className="section-primary" to={`/section-management/${section.id}/edit`}><FiEdit2 /> Edit Section</Link></Header><article className="section-profile-page"><div className="cm-profile-card"><div className="cm-profile-banner"><div className="cm-profile-avatar-wrap"><div className="cm-profile-placeholder"><FiUsers /></div></div><div className="cm-profile-header-info"><div className="cm-profile-badges"><span className="cm-badge cm-badge-code">SECTION</span>{section.code && <span className="cm-badge cm-badge-type">{section.code}</span>}<span className={`cm-status-badge ${String(section.status).toLowerCase()}`}>{section.status}</span></div><h1 className="cm-profile-title">{section.name}</h1><p className="cm-profile-subtitle">{[section.course, section.branchCode || section.branch, section.semester].filter(clean).join(' • ')}</p></div></div><div className="cm-profile-grid"><InfoCard icon={FiGrid} title="Basic Information" rows={[["Section Name", section.name], ["Section Code", section.code], ["Capacity", section.capacity], ["Current Strength", assigned], ["Available Seats", available], ["Status", section.status]]} /><InfoCard icon={FiBookOpen} title="Academic Mapping" rows={[["Course Name", section.course], ["Course Code", section.courseCode], ["Branch Name", section.branch], ["Branch Code", section.branchCode], ["Semester", section.semester], ["Academic Year", section.academicYear]]} /><InfoCard icon={FiUser} title="Section Allocation" rows={[["Faculty Advisor", section.advisor], ["Room / Classroom", section.room], ["Assigned Students", assigned], ["Available Seats", available]]} /></div></div></article></Page>
}

function Select({ label, value, change, first, values }) { return <SearchableSelect label={'Filter by ' + label} value={value} onChange={(next) => change(label, next)} placeholder={first} options={[{ value: '', name: first }, ...values.map((item) => ({ value: item, name: item }))]} searchPlaceholder={'Search ' + label + '...'} /> }
function Pagination({ page, pageCount, setPage }) { return <footer className="section-pagination"><p>Page {page} of {pageCount}</p><div><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><button className="active">{page}</button><button disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button></div></footer> }

function AssignStudents({ section, assignments, allAssignments = [], sections = [], assign, assignTeacher, remove, close }) {
  const [mode, setMode] = useState('')
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [students, setStudents] = useState([])
  const [teacher, setTeacher] = useState(String(section.facultyAdvisorEmployeeProfileId || ''))
  const [teacherCandidates, setTeacherCandidates] = useState([])
  const [error, setError] = useState('')
  const [teacherError, setTeacherError] = useState('')
  const [saving, setSaving] = useState(false)
  const assignedCount = assignments.length
  const available = Math.max(Number(section.capacity || 0) - assignedCount, 0)
  const isAssignedToCurrentSection = (student) => [...assignments, ...allAssignments].some((assignment) => String(assignment.sectionId) === String(section.id) && sameStudent(assignment, student))

  useEffect(() => { sectionAllocationApi.getTeacherCandidates(section.id).then(setTeacherCandidates).catch((reason) => setTeacherError(apiError(reason, 'Unable to load faculty candidates.'))) }, [section.id])
  useEffect(() => {
    if (mode !== 'student') return undefined
    let active = true
    setError('')
    studentApi.getAll({ courseId: section.courseId, branchId: section.branchId, semesterId: section.semesterId, academicYearId: section.academicYearId })
      .then((rows) => active && setStudents(rows.map(normalizeStudent).filter((student) => student.id && student.name && matchesStudentMapping(student, section))))
      .catch((reason) => active && setError(apiError(reason, 'Unable to load eligible students.')))
    return () => { active = false }
  }, [mode, section])

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
  const submitTeacher = async (event) => { event.preventDefault(); if (saving) return; setSaving(true); try { const candidate = teacherCandidates.find((item) => String(item.employeeProfileId) === String(teacher)); await assignTeacher(candidate); setTeacherError(''); setMode('') } catch (reason) { setTeacherError(reason.message || 'Unable to assign teacher.') } finally { setSaving(false) } }
  const submitSelected = async (event) => {
    event.preventDefault()
    if (saving) return
    if (section.status !== 'Active') return setError('Students can only be assigned to an active section.')
    if (!selectedStudents.length) return setError('Select at least one eligible student.')
    if (selectedStudents.length > available) return setError(`Only ${available} seats are available in ${section.name}.`)
    setSaving(true)
    let success = 0, failed = 0
    for (const student of selectedStudents) {
      try { await assign({ studentId: student.id, enrollmentNo: student.code, studentName: student.name }); success += 1 }
      catch { failed += 1 }
    }
    setSaving(false)
    setSelectedIds([])
    setError(failed ? `${success} students assigned successfully. ${failed} could not be assigned.` : `${success} students assigned successfully.`)
  }

  return <div className="section-overlay centered" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="section-assignment-panel" role="dialog" aria-modal="true" aria-label="Assign teacher or student"><header><div><p>Section Allocation</p><h2>{section.name}</h2><span>{[section.branchCode || section.branch, section.semester, section.academicYear].filter(clean).join(' � ')}</span></div><button type="button" aria-label="Close section allocation" onClick={close}><FiX /></button></header><div className="section-capacity"><strong>{assignedCount} / {section.capacity}</strong><span>{available} seats available</span><i><b style={{ width: `${Math.min(100, assignedCount * 100 / Math.max(Number(section.capacity || 1), 1))}%` }} /></i></div>{!mode && <div className="section-assignment-chooser"><button type="button" onClick={() => setMode('teacher')}><FiCheckCircle /><span><strong>Assign Teacher</strong><small>{section.advisor || 'No teacher assigned'}</small></span></button><button type="button" onClick={() => setMode('student')}><FiUserPlus /><span><strong>Students / Allocations</strong><small>{assignedCount} students assigned</small></span></button></div>}{mode === 'teacher' && <form className="section-assignment-form section-teacher-form" onSubmit={submitTeacher}><div className="section-assignment-form-head"><h3>Assign teacher</h3></div><div><label>Teacher / Faculty Advisor<SearchableSelect label="Faculty Advisor" value={teacher} onChange={setTeacher} options={teacherCandidates.map((item) => ({ value: item.employeeProfileId, name: item.fullName, code: [item.employeeCode, item.designation].filter(clean).join(' / ') }))} placeholder="Select faculty advisor" searchPlaceholder="Search faculty name or employee code..." /></label><button className="section-primary" disabled={saving}><FiCheckCircle /> {saving ? 'Saving...' : 'Save Teacher'}</button></div>{teacherError && <p className="section-assignment-error" role="alert">{teacherError}</p>}</form>}{mode === 'student' && <div className="section-student-allocation"><div className="section-assignment-form-head"><h3>Students / Allocations</h3><span>{selectedStudents.length} selected</span></div>{section.status !== 'Active' && <p className="section-assignment-error" role="alert">Students can only be assigned to an active section.</p>}<label className="section-student-search"><FiSearch aria-hidden="true" /><input type="search" aria-label="Search students" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search students..." /></label><label className="section-select-all"><input type="checkbox" checked={allVisibleSelected} disabled={!available || !selectableRows.length || section.status !== 'Active'} onChange={toggleAll} /> Select All Eligible</label><div className="section-eligible-list">{visibleStudents.length ? visibleStudents.map(({ student, crossAssignment }) => { const otherSection = crossAssignment ? sectionById.get(String(crossAssignment.sectionId)) : null; const disabled = Boolean(crossAssignment) || section.status !== 'Active'; return <label className={`section-student-row ${disabled ? 'disabled' : ''}`} key={student.id}><input type="checkbox" checked={selectedIds.includes(String(student.id))} disabled={disabled} onChange={() => toggleStudent(student.id)} /><span><strong>{student.name}</strong><small>{student.code || 'Student record'}</small></span><em>{crossAssignment ? `Already assigned to ${otherSection?.name || 'another section'}` : 'Unassigned'}</em></label> }) : <p className="section-assignment-empty">No eligible unassigned students found for this academic mapping.</p>}</div><footer className="section-student-actions"><span>Selected: {selectedStudents.length}</span><button className="section-primary" disabled={saving || !selectedStudents.length || section.status !== 'Active'} onClick={submitSelected}><FiUserPlus /> {saving ? 'Assigning...' : 'Assign Selected Students'}</button></footer>{error && <p className="section-assignment-error" role="alert">{error}</p>}<div className="section-assigned-list"><h3>Assigned Students <span>{assignments.length}</span></h3>{assignments.length ? assignments.map((assignment) => <article key={`${assignment.sectionId}-${assignment.studentId}-${assignment.id}`}><div><strong>{assignment.studentName}</strong><span>{assignment.enrollmentNo}</span></div><button title="Remove student" onClick={() => remove(assignment)}><FiTrash2 className="module-action-icon module-action-icon--danger" /> Remove</button></article>) : <p>No students have been assigned yet.</p>}</div></div>}{mode && <footer><button type="button" className="section-back-button" onClick={() => { setMode(''); setError(''); setSelectedIds([]) }}>Back</button></footer>}</section></div>
}
function Confirm({ action, close, confirm }) { const activate = action.nextStatus === 'Active'; return <div className="section-overlay centered"><section className="section-confirm" role="alertdialog" aria-modal="true"><i>!</i><h2>{activate ? 'Activate' : 'Deactivate'} Section?</h2><p><strong>{action.row.name} ({action.row.code})</strong> {activate ? 'will become available for student allocations.' : `${action.assigned} students are currently assigned to this section. Deactivating this section will prevent new allocations. Existing allocations are not removed by this action.`}</p><footer><button onClick={close}>Cancel</button><button className={activate ? 'section-primary' : 'section-danger'} onClick={confirm}>{activate ? 'Activate' : 'Confirm Deactivate'}</button></footer></section></div> }

export default function SectionManagement({ mode = 'list' }) {
  if (mode === 'form') return <SectionForm />
  if (mode === 'edit') return <SectionForm editMode />
  if (mode === 'details') return <SectionDetails />
  return <SectionList />
}


