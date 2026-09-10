import ExportMenu, { PrintDetailsButton } from '../../components/ExportMenu'
import { semesterColumns } from '../../utils/exportColumns'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiBookOpen, FiCalendar, FiCheckCircle, FiClock, FiEdit2, FiEye, FiFilter, FiLayers, FiPlus, FiSearch } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import FilterPanel from '../../components/FilterPanel'
import SearchableSelect from '../../components/SearchableSelect'
import CompactSummary from '../../components/CompactSummary'
import { academicYearApi, branchApi, courseApi } from '../../api/apiEndpoints'
import { createSemester, getSemesterById, getSemesters, updateSemester } from '../../auth/collegeApi'
import { getActiveAcademicYears, normalizeAcademicYear } from '../../utils/academicYearUtils'
import { deriveLifecycleStatus, cohortStart, sameCohort, branchTypeLabel, validateSchedule } from '../../utils/semesterUtils'
import ViewDialog from '../../components/ViewDialog'
import './SemesterManagement.css'
import '../../styles/directory-search.css'

const emptyForm = { courseId: '', branchId: '', academicYearId: '', semesterNumber: 1, semesterName: 'Semester 1', startDate: '', endDate: '', status: 'Upcoming' }
const clean = (value) => value !== null && value !== undefined && String(value).trim() !== ''
const courseIdOf = (item = {}) => item.courseId ?? item.courseID ?? item.CourseId ?? item.CourseID ?? item.id ?? item.Id ?? ''
const branchIdOf = (item = {}) => item.branchId ?? item.branchID ?? item.BranchId ?? item.BranchID ?? item.id ?? item.Id ?? ''
const courseName = (item = {}) => item.courseName ?? item.CourseName ?? item.name ?? item.Name ?? item.shortName ?? item.code ?? ''
const courseCode = (item = {}) => item.courseCode ?? item.CourseCode ?? item.course_code ?? item.code ?? item.Code ?? item.shortName ?? ''
const branchName = (item = {}) => item.branchName ?? item.BranchName ?? item.name ?? item.Name ?? item.shortName ?? item.code ?? ''
const branchCode = (item = {}) => item.branchCode ?? item.BranchCode ?? item.branch_code ?? item.code ?? item.Code ?? item.shortName ?? ''
const yearName = (item = {}) => item.academicYearName ?? item.name ?? item.academicYear ?? item.code ?? ''
const yearNumberForSemester = (semesterNumber) => Math.ceil(Number(semesterNumber || 1) / 2)
const normalizePattern = (value) => String(value || '').trim()
const isSemesterPattern = (value) => normalizePattern(value).toLowerCase().includes('semester')
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

const parseAcademicYearStart = (year) => {
  const startDate = String(year?.startDate ?? '').slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return Number(startDate.slice(0, 4))
  const match = String(yearName(year)).match(/(\d{4})\D+(\d{2,4})/)
  return match ? Number(match[1]) : null
}

const academicYearForStart = (years, startYear) => years.find((year) => parseAcademicYearStart(year) === startYear)
const periodLabel = (startYear, durationYears) => startYear && durationYears ? `${startYear} - ${startYear + Number(durationYears)}` : ''
const yearLabelFromStart = (startYear) => startYear ? `${startYear}-${startYear + 1}` : ''
const displayDate = (value) => clean(value) ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

const normalizeCourse = (record = {}) => {
  const durationValue = Number(record.durationValue ?? record.duration ?? 0)
  const unit = String(record.durationUnit ?? 'Years').toLowerCase()
  const durationYears = Number(record.durationYears ?? record.DurationYears ?? (unit.startsWith('month') ? durationValue / 12 : unit.startsWith('year') ? durationValue : 0))
  const explicitSemesters = Number(record.totalSemesters ?? record.TotalSemesters ?? record.semesters ?? record.semesterCount ?? record.numberOfSemesters ?? 0)
  const rawPattern = normalizePattern(record.academicSystem ?? record.AcademicSystem ?? record.academicPattern ?? record.AcademicPattern ?? record.pattern ?? '')
  const academicPattern = rawPattern || (explicitSemesters > 0 ? 'Semester' : '')
  return { ...record, id: courseIdOf(record), name: courseName(record), code: courseCode(record), durationYears, academicPattern, totalSemesters: explicitSemesters || (durationYears && isSemesterPattern(academicPattern) ? durationYears * 2 : 0) }
}

const normalizeBranch = (record = {}) => ({
  ...record,
  id: branchIdOf(record),
  courseId: (record.courseId ?? record.courseID ?? record.CourseId ?? record.CourseID) || record.course?.courseId || record.course?.id || '',
  name: branchName(record),
  code: branchCode(record),
  branchType: branchTypeLabel(record),
})

const makeLookups = (courses, branches, years) => ({
  courseById: new Map(courses.map((item) => [String(item.id), item])),
  branchById: new Map(branches.map((item) => [String(item.id), item])),
  yearById: new Map(years.map((item) => [String(item.id), item])),
})

const mapSemester = (record = {}, lookups = {}) => {
  const semesterNumber = Number(record.semesterNumber ?? 1)
  const branchId = (record.branchId ?? record.branchID ?? record.BranchId ?? record.BranchID) || record.branch?.branchId || record.branch?.id || ''
  const branch = lookups.branchById?.get(String(branchId))
  const courseId = (record.courseId ?? record.courseID ?? record.CourseId ?? record.CourseID) || record.course?.courseId || record.course?.id || branch?.courseId || ''
  const course = lookups.courseById?.get(String(courseId))
  const academicYearId = record.academicYearId ?? record.academicYear?.academicYearId ?? record.academicYear?.id ?? record.yearId ?? ''
  const academicYear = lookups.yearById?.get(String(academicYearId))
  const mapped = {
    ...record,
    backendStatus: record.backendStatus ?? record.status,
    id: record.semesterId ?? record.structureId ?? record.id,
    courseId,
    courseName: record.courseName ?? record.course?.courseName ?? record.course?.name ?? course?.name ?? '',
    courseCode: record.courseCode ?? record.course?.courseCode ?? course?.code ?? '',
    branchId,
    branchType: branchTypeLabel(record.branch ?? branch ?? { branchType: record.branchType }),
    branchName: record.branchName ?? record.branch?.branchName ?? record.branch?.name ?? branch?.name ?? '',
    branchCode: record.branchCode ?? record.branch?.branchCode ?? branch?.code ?? '',
    academicYearId,
    academicYearName: record.academicYearName ?? record.academicYear?.academicYearName ?? record.academicYear?.name ?? yearName(academicYear),
    yearNumber: Number(record.yearNumber ?? yearNumberForSemester(semesterNumber)),
    semesterNumber,
    semesterName: record.semesterName || `Semester ${semesterNumber}`,
    startDate: record.startDate ?? '',
    endDate: record.endDate ?? '',
    courseDuration: course?.durationYears || record.courseDuration || '',
    academicPattern: course?.academicPattern || record.academicPattern || '',
    totalSemesters: course?.totalSemesters || record.totalSemesters || '',
  }
  return { ...mapped, status: deriveLifecycleStatus(mapped) }
}

const semesterPayloadStatus = (status) => status === 'Active' ? 1 : 0

const createPlan = ({ course, branch, activeYear, academicYears, dates = {}, editingSemester }) => {
  if (editingSemester) return [{ ...editingSemester, ...dates[editingSemester.semesterNumber], status: deriveLifecycleStatus({ ...editingSemester, ...dates[editingSemester.semesterNumber] }) }]
  if (!course || !branch || !isSemesterPattern(course.academicPattern) || !Number.isInteger(course.totalSemesters) || course.totalSemesters <= 0) return []
  const startYear = parseAcademicYearStart(activeYear)
  if (!startYear) return []

  return Array.from({ length: Number(course.totalSemesters) }, (_, index) => {
    const semesterNumber = index + 1
    const yearStart = startYear + Math.floor(index / 2)
    const academicYear = academicYearForStart(academicYears, yearStart)
    const dateRow = dates[semesterNumber] || {}
    return {
      semesterNumber,
      semesterName: `Semester ${semesterNumber}`,
      yearNumber: yearNumberForSemester(semesterNumber),
      academicYearId: academicYear?.id ?? academicYear?.academicYearId ?? '',
      academicYearName: yearName(academicYear) || yearLabelFromStart(yearStart),
      startDate: dateRow.startDate || '',
      endDate: dateRow.endDate || '',
      status: deriveLifecycleStatus(dateRow, 'Upcoming'),
      courseId: course.id,
      courseName: course.name,
      courseCode: course.code,
      branchId: branch.id,
      branchName: branch.name,
      branchCode: branch.code,
      branchType: branch.branchType,
    }
  }).filter((item) => item.academicYearId)
}

const Page = ({ children }) => <DashboardLayout><main className="semester-management">{children}</main></DashboardLayout>
const Header = ({ title, text, children }) => <header className="semester-page-header"><div><p className="semester-breadcrumb">Academic Configuration <span>/</span> Semesters</p><h1>{title}</h1>{text && <p>{text}</p>}</div><div className="management-header-actions">{children}</div></header>
const StatusBadge = ({ value }) => <span className={`semester-badge status ${String(value || '').toLowerCase().replace(/\s+/g, '-')}`}>{value}</span>
const Field = ({ label, children }) => <label className="semester-field"><span>{label}</span>{children}</label>
const ReadOnly = ({ value, placeholder = 'Resolved after selection' }) => <input value={value || ''} placeholder={placeholder} readOnly />

function InfoRows({ rows }) {
  const visibleRows = rows.filter(([, value]) => clean(value))
  if (!visibleRows.length) return null
  return <div className="cm-info-rows">{visibleRows.map(([label, value]) => <div className="cm-info-row" key={label}><span className="cm-info-label">{label}</span><span className="cm-info-val">{value}</span></div>)}</div>
}

async function loadSemesterSources() {
  const [courseRows, branchRows, yearRows, semesterRows] = await Promise.all([courseApi.getAll(), branchApi.getAll(), academicYearApi.getAll(), getSemesters()])
  const courses = await Promise.all(courseRows.map(normalizeCourse).filter((item) => item.id && item.name).map(async (item) => {
    if (item.durationYears && item.totalSemesters && item.academicPattern) return item
    return normalizeCourse({ ...courseRows.find((row) => String(courseIdOf(row)) === String(item.id)), ...responseRecord(await courseApi.getById(item.id)) })
  }))
  const branches = branchRows.map(normalizeBranch).filter((item) => item.id && item.name)
  const years = yearRows.map(normalizeAcademicYear).filter((item) => item.id && item.name)
  const rows = responseList(semesterRows).map((item) => mapSemester(item, makeLookups(courses, branches, years)))
  return { courses, branches, years, rows }
}

function useLifecycleClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const refresh = () => setNow(new Date())
    const timer = setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  return now
}

function SemesterList() {
  const now = useLifecycleClock()
  const [rows, setRows] = useState([])
  const [courses, setCourses] = useState([])
  const [branches, setBranches] = useState([])
  const [years, setYears] = useState([])
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ courseId: '', branchId: '', academicYearId: '', status: '' })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const sources = await loadSemesterSources()
      setRows(sources.rows)
      setCourses(sources.courses)
      setBranches(sources.branches)
      setYears(sources.years)
    } catch (requestError) {
      setRows([])
      setError(apiError(requestError, 'Unable to load semester sources. Please try again.'))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const lifecycleRows = useMemo(() => rows.map((item) => ({ ...item, status: deriveLifecycleStatus(item, 'Upcoming', now) })), [rows, now])
  const filteredBranches = branches.filter((item) => !filters.courseId || String(item.courseId) === String(filters.courseId))
  const filtered = useMemo(() => lifecycleRows.filter((item) => `${item.semesterName} ${item.courseName} ${item.courseCode} ${item.branchName} ${item.branchCode} ${item.academicYearName}`.toLowerCase().includes(query.trim().toLowerCase()) && (!filters.courseId || String(item.courseId) === String(filters.courseId)) && (!filters.branchId || String(item.branchId) === String(filters.branchId)) && (!filters.academicYearId || String(item.academicYearId) === String(filters.academicYearId)) && (!filters.status || item.status === filters.status)).sort((left, right) => String(left.courseName).localeCompare(String(right.courseName)) || String(left.branchName).localeCompare(String(right.branchName)) || Number(left.semesterNumber) - Number(right.semesterNumber)), [lifecycleRows, query, filters])
  const counts = { total: rows.length, active: lifecycleRows.filter((item) => item.status === 'Active').length, upcoming: lifecycleRows.filter((item) => item.status === 'Upcoming').length, completed: lifecycleRows.filter((item) => item.status === 'Completed').length }
  const pageSize = 5
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const changeFilter = (name, value) => { setFilters((current) => ({ ...current, [name]: value, ...(name === 'courseId' ? { branchId: '' } : {}) })); setPage(1) }
  const clearFilters = () => { setQuery(''); setFilters({ courseId: '', branchId: '', academicYearId: '', status: '' }); setPage(1) }
  const hasFilters = Boolean(query || Object.values(filters).some(Boolean))

  return <Page>
    <Header title="Semester Management" text="Manage course-based semester structures, academic years, schedules, and lifecycle status.">
      <CompactSummary label="Semester summary" items={[{ label: 'Total', value: counts.total }, { label: 'Active', value: counts.active, tone: 'active' }, { label: 'Upcoming', value: counts.upcoming, tone: 'upcoming' }, { label: 'Completed', value: counts.completed, tone: 'completed' }]} />
    </Header>
    <section className="semester-directory-card">
      <header className="course-directory-heading">
        <div>
          <span className="cm-eyebrow">Semester Directory</span>
          <p>{filtered.length} configured semesters</p>
        </div>
        <div className="directory-export-actions">
          <ExportMenu rows={filtered} columns={semesterColumns} title="Semesters" filename="semesters" loading={loading || Boolean(error)} />
          <Link className="cm-button" to="/semester-management/add"><FiPlus /> Add Semester Structure</Link>
        </div>
      </header>
      <FilterPanel active={hasFilters} onClear={clearFilters}>
        <div className="semester-filters">
          <label className="semester-search">
            <FiSearch />
            <input aria-label="Search semesters" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search semester, course, code or branch..." />
          </label>
          <select aria-label="Filter by course" value={filters.courseId} onChange={(event) => changeFilter('courseId', event.target.value)}>
            <option value="">Select Course</option>
            {courses.map((item) => <option key={item.id} value={item.id}>{item.name}{item.code ? ` - ${item.code}` : ''}</option>)}
          </select>
          <select aria-label="Filter by branch" value={filters.branchId} onChange={(event) => changeFilter('branchId', event.target.value)}>
            <option value="">Select Branch</option>
            {filteredBranches.map((item) => <option key={item.id} value={item.id}>{item.code ? `${item.code} - ` : ''}{item.name}</option>)}
          </select>
          <select aria-label="Filter by academic year" value={filters.academicYearId} onChange={(event) => changeFilter('academicYearId', event.target.value)}>
            <option value="">Select Academic Year</option>
            {years.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select aria-label="Filter by status" value={filters.status} onChange={(event) => changeFilter('status', event.target.value)}>
            <option value="">Select Status</option>
            {['Active', 'Upcoming', 'Completed'].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          {hasFilters && <button className="semester-clear" onClick={clearFilters}><FiFilter /> Clear</button>}
        </div>
      </FilterPanel>
      {loading ? <Empty icon={FiClock} title="Loading semesters..." /> : error ? <Empty icon={FiLayers} title={error} action={<button className="semester-primary" onClick={load}>Retry</button>} /> : visible.length ? (
        <>
          <div className="semester-table-wrapper">
            <table className="semester-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '160px' }}>Semester</th>
                  <th style={{ minWidth: '160px' }}>Course</th>
                  <th style={{ minWidth: '160px' }}>Branch</th>
                  <th className="table-center" style={{ width: '130px' }}>Academic Year</th>
                  <th className="table-center" style={{ width: '120px' }}>Start Date</th>
                  <th className="table-center" style={{ width: '120px' }}>End Date</th>
                  <th className="table-center" style={{ width: '120px' }}>Status</th>
                  <th className="table-center" style={{ width: '130px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.id || `${item.branchId}-${item.semesterNumber}`}>
                    <td style={{ minWidth: '160px' }}>
                      <div className="table-primary-cell">
                        <strong title={item.semesterName}>{item.semesterName}</strong>
                        {item.semesterName && item.semesterNumber && String(item.semesterName).trim().toLowerCase() !== `semester ${item.semesterNumber}`.toLowerCase() ? (
                          <small>Semester {item.semesterNumber}</small>
                        ) : null}
                      </div>
                    </td>
                    <td style={{ minWidth: '160px' }}>
                      <div className="table-primary-cell">
                        <strong title={item.courseName}>{item.courseName}</strong>
                        {item.courseCode && <small title={item.courseCode}>{item.courseCode}</small>}
                      </div>
                    </td>
                    <td style={{ minWidth: '160px' }}>
                      <div className="table-primary-cell">
                        <strong title={item.branchName}>{item.branchName}</strong>
                        {item.branchCode && <small title={item.branchCode}>{item.branchCode}</small>}
                        {item.branchType && <small title={item.branchType}>{item.branchType}</small>}
                      </div>
                    </td>
                    <td className="table-center" style={{ width: '130px' }}>{item.academicYearName}</td>
                    <td className="table-center" style={{ width: '120px' }}>{displayDate(item.startDate)}</td>
                    <td className="table-center" style={{ width: '120px' }}>{displayDate(item.endDate)}</td>
                    <td className="table-center" style={{ width: '120px' }}><StatusBadge value={item.status} /></td>
                    <td className="table-center" style={{ width: '130px' }}>
                      <div className="semester-row-actions table-actions-group">
                        <Link className="table-action-btn action-view" title={`View ${item.semesterName}`} aria-label={`View ${item.semesterName}`} to={`/semester-management/${item.id}`}><FiEye /></Link>
                        <Link className="table-action-btn action-edit" title={`Edit ${item.semesterName}`} aria-label={`Edit ${item.semesterName}`} to={`/semester-management/${item.id}/edit`}><FiEdit2 /></Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={currentPage} pageCount={pageCount} setPage={setPage} />
        </>
      ) : (
        <Empty icon={FiLayers} title="No semesters match the current filters." />
      )}
    </section>
  </Page>
}

function SemesterForm({ editMode = false }) {
  useLifecycleClock()
  const { id } = useParams()
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [branches, setBranches] = useState([])
  const [academicYears, setAcademicYears] = useState([])
  const [existingRows, setExistingRows] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [dates, setDates] = useState({})
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editingSemester, setEditingSemester] = useState(null)

  const course = courses.find((item) => String(item.id || item.courseId) === String(form.courseId))
  const availableBranches = branches.filter((item) => String(item.courseId) === String(form.courseId))
  const branch = availableBranches.find((item) => String(item.id || item.branchId) === String(form.branchId))
  const activeYears = useMemo(() => getActiveAcademicYears(academicYears), [academicYears])
  const activeYear = editMode ? academicYears.find((item) => String(item.id) === String(form.academicYearId)) : activeYears[0]
  const startYear = editMode && editingSemester ? cohortStart(editingSemester) : parseAcademicYearStart(activeYear)
  const coursePeriod = periodLabel(startYear, course?.durationYears)
  const plan = createPlan({ course, branch, activeYear, academicYears, dates, editingSemester })
  const selectedPlanRow = plan.find((item) => Number(item.semesterNumber) === Number(form.semesterNumber))
  const unsupportedPattern = course && !isSemesterPattern(course.academicPattern)
  const noActiveYear = !editMode && activeYears.length === 0
  const yearWarning = noActiveYear ? 'No active academic year is configured.' : !editMode && activeYears.length > 1 ? 'Multiple active academic years are configured. Using the first active academic year for this semester structure.' : ''
  const duplicateRows = branch ? existingRows.filter((item) => sameCohort(item, { courseId: form.courseId, branchId: form.branchId, semesterNumber: 1, academicYearName: yearName(activeYear) })) : []

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const sources = await loadSemesterSources()
      setCourses(sources.courses)
      setBranches(sources.branches)
      setAcademicYears(sources.years)
      setExistingRows(sources.rows)
      if (editMode && id) {
        const detailResponse = await getSemesterById(id)
        const base = sources.rows.find((row) => String(row.id) === String(id)) || {}
        const detail = mapSemester({ ...base, ...responseRecord(detailResponse) }, makeLookups(sources.courses, sources.branches, sources.years))
        if (!detail.id) throw new Error('Semester not found.')
        setEditingSemester(detail)
        setForm({ courseId: String(detail.courseId || ''), branchId: String(detail.branchId || ''), academicYearId: String(detail.academicYearId || ''), semesterNumber: Number(detail.semesterNumber || 1), semesterName: detail.semesterName || `Semester ${detail.semesterNumber || 1}`, startDate: String(detail.startDate || '').slice(0, 10), endDate: String(detail.endDate || '').slice(0, 10), status: detail.status || 'Upcoming' })
        setDates({ [Number(detail.semesterNumber || 1)]: { startDate: String(detail.startDate || '').slice(0, 10), endDate: String(detail.endDate || '').slice(0, 10) } })
        setStep(2)
      } else {
        const active = getActiveAcademicYears(sources.years)
        setForm((current) => ({ ...current, academicYearId: active.length ? String(active[0].id) : '' }))
      }
    } catch (requestError) {
      setError(apiError(requestError, 'Unable to load semester configuration data.'))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [id, editMode])

  const setCourse = (courseId) => { setError(''); setForm((current) => ({ ...current, courseId, branchId: '' })); setDates({}); setStep(1) }
  const setBranch = (branchId) => { setError(''); setForm((current) => ({ ...current, branchId })); setStep(1) }
  const updateDate = (semesterNumber, field, value) => setDates((current) => ({ ...current, [semesterNumber]: { ...current[semesterNumber], [field]: value } }))

  const validate = () => {
    const scheduleRows = editMode ? [...existingRows.filter((item) => String(item.id) !== String(id) && sameCohort(item, editingSemester)), ...plan] : plan
    const scheduleError = validateSchedule(scheduleRows)
    if (scheduleError) return scheduleError
    if (editMode) return editingSemester?.id && form.courseId && form.branchId && form.academicYearId ? '' : 'Semester mapping could not be loaded.'
    if (noActiveYear) return yearWarning
    if (!form.courseId) return 'Course is required.'
    if (!form.branchId || !branch) return 'Branch is required.'
    if (duplicateRows.length) return `Semester structure already exists for ${course?.name} - ${branch?.code || branch?.name} - ${coursePeriod}.`
    if (!course?.durationYears) return 'Selected course does not include a duration.'
    if (!Number.isInteger(course?.totalSemesters) || course.totalSemesters <= 0) return 'Selected course does not include total semesters.'
    if (unsupportedPattern) return `${course.academicPattern} courses are not supported for semester generation.`
    if (course.totalSemesters !== course.durationYears * 2) return 'Course duration and total semesters do not match the standard two-semester academic year.'
    if (!coursePeriod) return 'Course period could not be calculated from academic year and course duration.'
    return ''
  }

  const save = async (event) => {
    event?.preventDefault?.()
    if (saving || notice) return
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setSaving(true)
    setError('')
    try {
      if (editMode) {
        const row = { ...form, ...(selectedPlanRow || {}), startDate: dates[form.semesterNumber]?.startDate ?? form.startDate, endDate: dates[form.semesterNumber]?.endDate ?? form.endDate }
        await updateSemester(id, { courseId: Number(form.courseId), branchId: Number(form.branchId), academicYearId: Number(form.academicYearId || row.academicYearId), semesterName: form.semesterName, semesterNumber: Number(form.semesterNumber), yearNumber: yearNumberForSemester(form.semesterNumber), startDate: row.startDate || null, endDate: row.endDate || null, status: [0, 1].includes(Number(editingSemester.backendStatus)) ? Number(editingSemester.backendStatus) : semesterPayloadStatus(deriveLifecycleStatus(row)), createdBy: 1 })
        setNotice('Semester updated successfully.')
      } else {
        const freshRows = responseList(await getSemesters()).map((item) => mapSemester(item, makeLookups(courses, branches, academicYears)))
        setExistingRows(freshRows)
        if (freshRows.some((item) => sameCohort(item, plan[0]))) throw new Error(`Semester structure already exists for ${course.name} - ${branch.code || branch.name} - ${coursePeriod}.`)
        const missing = plan.filter((row) => !freshRows.some((item) => sameCohort(item, row) && Number(item.semesterNumber) === Number(row.semesterNumber)))
        if (!missing.length) { setNotice('Semester structure is already saved.'); return }
        const results = await Promise.allSettled(missing.map((item) => createSemester({ courseId: Number(item.courseId), branchId: Number(item.branchId), academicYearId: Number(item.academicYearId), semesterName: item.semesterName, semesterNumber: Number(item.semesterNumber), yearNumber: Number(item.yearNumber), startDate: item.startDate || null, endDate: item.endDate || null, status: semesterPayloadStatus(item.status), createdBy: 1 })))
        const created = results.filter((result) => result.status === 'fulfilled').length
        if (!created) throw results.find((result) => result.status === 'rejected')?.reason || new Error('Unable to generate semester structure.')
        if (created !== missing.length) throw new Error(`${created} of ${missing.length} semesters created. Use Generate again to retry missing semesters. ${apiError(results.find((result) => result.status === 'rejected')?.reason, '')}`)
        setNotice(`Semester structure generated successfully for ${branch.code || branch.name}.`)
      }
      setTimeout(() => navigate('/semester-management'), 700)
    } catch (requestError) {
      setError(apiError(requestError, 'Unable to save semester structure.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Page><Empty icon={FiClock} title="Loading semester workflow..." /></Page>
  return <Page>
    {notice && <div className="semester-toast" role="status"><FiCheckCircle />{notice}</div>}
    <Header title={editMode ? 'Edit Semester' : 'Add Semester Structure'} text={editMode ? 'Update schedule and lifecycle details without replacing the historical academic year.' : 'Configure semesters from Course, Branch, and the active Academic Year.'}><Link className="semester-primary secondary" to="/semester-management"><FiArrowLeft /> Back</Link></Header>
    <div className="semester-workflow">
      <section className="semester-workflow-main">
        {error && <div className="semester-form-error" role="alert">{error}</div>}
        {yearWarning && <div className="semester-config-warning" role="alert">{yearWarning}</div>}
        <div className="semester-stepper"><button type="button" className={step === 1 ? 'active' : ''} onClick={() => setStep(1)}>Step 1 - Academic Mapping</button><button type="button" className={step === 2 ? 'active' : ''} onClick={() => setStep(2)} disabled={!form.courseId || (!editMode && !form.branchId)}>Step 2 - Semester Configuration</button></div>
        {step === 1 ? <section className="semester-form-card"><header><span>Step 1</span><h2>Academic Mapping</h2></header><div className="semester-form-grid"><Field label="Course *"><SearchableSelect label="Course" value={form.courseId} options={courses.map((item) => ({ id: item.id || item.courseId, value: item.id || item.courseId, name: item.name, code: item.code }))} onChange={setCourse} disabled={editMode || saving} placeholder="Select Course" searchPlaceholder="Search course name or code..." noOptionsMessage="No courses found." /></Field><Field label="Course Code"><ReadOnly value={course?.code} placeholder="Resolved from selected course" /></Field><Field label="Branch *"><SearchableSelect label="Branch" value={form.branchId} options={availableBranches.map((item) => ({ id: item.id || item.branchId, value: item.id || item.branchId, name: item.name, code: item.code }))} onChange={setBranch} disabled={editMode || saving || !form.courseId} placeholder={form.courseId ? 'Select Branch' : 'Select Course first'} searchPlaceholder="Search branch name or code..." noOptionsMessage="No branches found for this course." /></Field><Field label="Branch Code"><ReadOnly value={branch?.code || editingSemester?.branchCode} placeholder="Resolved from selected branch" /></Field><Field label="Branch Type"><ReadOnly value={branch?.branchType || editingSemester?.branchType} placeholder="Resolved from selected branch" /></Field><Field label={editMode ? 'Academic Year' : 'Active Academic Year'}><ReadOnly value={activeYear?.name} placeholder="Resolved from active academic year" /></Field><Field label="Course Period / Cohort"><ReadOnly value={coursePeriod} placeholder="Resolved from course duration" /></Field></div></section> : <section className="semester-form-card"><header><span>Step 2</span><h2>Semester Configuration / Preview</h2></header><div className="semester-structure-summary"><InfoRows rows={[["Duration", course?.durationYears ? `${course.durationYears} Years` : ''], ["Academic Pattern", course?.academicPattern], ["Total Semesters", course?.totalSemesters], ["Course Period", coursePeriod], ["Branch", branch?.name || editingSemester?.branchName], ["Branch Type", branch?.branchType || editingSemester?.branchType]]} /></div>{unsupportedPattern ? <div className="semester-config-warning">This course uses {course.academicPattern}. Semester generation is available only for Semester pattern courses.</div> : <div className="semester-generated-list">{(editMode ? plan.filter((item) => Number(item.semesterNumber) === Number(form.semesterNumber)) : plan).map((item) => <article key={item.semesterNumber} className="semester-generated-item"><div><strong>{item.semesterName}</strong><span>{item.academicYearName}</span></div><div className="semester-date-pair"><input type="date" aria-label={`${item.semesterName} start date`} value={dates[item.semesterNumber]?.startDate || ''} disabled={saving || Boolean(notice)} onChange={(event) => updateDate(item.semesterNumber, 'startDate', event.target.value)} /><input type="date" aria-label={`${item.semesterName} end date`} value={dates[item.semesterNumber]?.endDate || ''} disabled={saving || Boolean(notice)} onChange={(event) => updateDate(item.semesterNumber, 'endDate', event.target.value)} /></div><StatusBadge value={item.status} /></article>)}</div>}</section>}
        <footer className="semester-workflow-actions"><button type="button" className="semester-primary secondary" onClick={() => step === 1 ? navigate('/semester-management') : setStep(1)}>{step === 1 ? 'Cancel' : 'Back'}</button>{step === 1 ? <button type="button" className="semester-primary" disabled={!form.courseId || !form.branchId || noActiveYear} onClick={() => setStep(2)}>Next</button> : <button type="button" className="semester-primary" disabled={saving || Boolean(notice) || noActiveYear} onClick={save}>{saving ? 'Saving...' : editMode ? 'Save Semester' : 'Generate Semester Structure'}</button>}</footer>
      </section>
      <SemesterPreview course={course} branch={branch || editingSemester} activeYear={activeYear} coursePeriod={coursePeriod} plan={editMode ? plan.filter((item) => Number(item.semesterNumber) === Number(form.semesterNumber)) : plan} />
    </div>
  </Page>
}

function SemesterPreview({ course, branch, activeYear, coursePeriod, plan }) {
  const hasContext = course || branch
  return <aside className="semester-live-preview"><header><span>Semester Structure Preview</span><h2>{course?.name || 'Preview'}</h2></header>{hasContext ? <><InfoRows rows={[["Course", course?.name], ["Course Code", course?.code], ["Branch", branch?.name || branch?.branchName], ["Branch Code", branch?.code || branch?.branchCode], ["Branch Type", branch?.branchType], ["Active Academic Year", activeYear?.name], ["Course Period", coursePeriod], ["Duration", course?.durationYears ? `${course.durationYears} Years` : ''], ["Total Semesters", course?.totalSemesters]]} />{plan.length > 0 && <div className="semester-preview-list">{plan.map((item) => <div key={item.semesterNumber}><span>{item.semesterName}<small className="semester-preview-year">{item.academicYearName}</small></span><StatusBadge value={item.status} /></div>)}</div>}</> : <p>Select a Course and Branch to preview semester structure.</p>}</aside>
}

function SemesterDetailsPage() {
  const now = useLifecycleClock()
  const navigate = useNavigate()
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const sources = await loadSemesterSources()
        const base = sources.rows.find((row) => String(row.id) === String(id)) || {}
        const detailResponse = await getSemesterById(id)
        const detail = mapSemester({ ...base, ...responseRecord(detailResponse) }, makeLookups(sources.courses, sources.branches, sources.years))
        if (!detail.id) throw new Error('Semester not found.')
        if (alive) setItem(detail)
      } catch (requestError) {
        if (alive) setError(apiError(requestError, 'Unable to load semester details.'))
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [id])

  if (loading) return <Page><Empty icon={FiClock} title="Loading semester details..." /></Page>
  if (error || !item) return <Page><div className="cm-profile-view"><div className="cm-profile-top-bar"><Link className="cm-button secondary" to="/semester-management">&larr; Back to Semesters List</Link></div><Empty icon={FiLayers} title={error || 'Semester not found.'} /></div></Page>
  const semesterItem = { ...item, status: deriveLifecycleStatus(item, 'Upcoming', now) }
  return (
    <Page>
      <div className="cm-profile-view">
        <div className="cm-profile-top-bar">
          <Link className="cm-button secondary" to="/semester-management">
            &larr; Back to Semesters List
          </Link>
        </div>
        <SemesterProfile item={semesterItem} />
      </div>
    </Page>
  )
}

function SemesterProfile({ item }) {
  const startYear = item.courseDuration && item.academicYearName ? parseAcademicYearStart({ academicYearName: item.academicYearName }) - Math.floor((Number(item.semesterNumber || 1) - 1) / 2) : null
  const coursePeriod = periodLabel(startYear, item.courseDuration)
  return (
    <div className="cm-profile-card">
      <div className="cm-profile-banner">
        <div className="cm-profile-avatar-wrap">
          <div className="cm-profile-placeholder">
            <FiCalendar />
          </div>
        </div>
        <div className="cm-profile-header-info">
          <div className="cm-profile-badges">
            <span className="cm-badge cm-badge-code">Semester {item.semesterNumber}</span>
            {item.courseCode && <span className="cm-badge cm-badge-type">{item.courseCode}</span>}
            <span className={`cm-status-badge ${String(item.status).toLowerCase()}`}>{item.status}</span>
          </div>
          <h1 className="cm-profile-title"><span style={{ color: '#fff' }}>{item.semesterName}</span></h1>
          <p className="cm-profile-subtitle">
            <span style={{ color: '#fff' }}>{[item.courseName, item.branchCode || item.branchName, item.academicYearName].filter(clean).join(' • ')}</span>
          </p>
        </div>
      </div>
      <div className="cm-profile-grid">
        <InfoCard icon={FiCalendar} title="Basic Information" rows={[["Semester Name", item.semesterName], ["Semester Number", item.semesterNumber], ["Academic Year", item.academicYearName], ["Status", item.status]]} />
        <InfoCard icon={FiBookOpen} title="Academic Mapping" rows={[["Course Name", item.courseName], ["Course Code", item.courseCode], ["Branch Name", item.branchName], ["Branch Code", item.branchCode], ["Branch Type", item.branchType]]} />
        <InfoCard icon={FiClock} title="Academic Schedule" rows={[["Start Date", displayDate(item.startDate)], ["End Date", displayDate(item.endDate)]]} />
        <InfoCard icon={FiLayers} title="Course Structure" rows={[["Starting Academic Year", yearLabelFromStart(cohortStart(item))], ["Course Duration", item.courseDuration ? `${item.courseDuration} Years` : ''], ["Academic Pattern", item.academicPattern], ["Total Semesters", item.totalSemesters], ["Course Period", coursePeriod]]} />
      </div>
    </div>
  )
}

function InfoCard({ icon: Icon, title, rows }) {
  const visibleRows = rows.filter(([, value]) => clean(value))
  if (!visibleRows.length) return null
  return <section className="cm-info-card"><div className="cm-info-card-header"><Icon /><h2>{title}</h2></div><InfoRows rows={visibleRows} /></section>
}

function Empty({ icon: Icon, title, action }) {
  return <div className="semester-empty-state"><Icon /><h3>{title}</h3>{action}</div>
}

function Pagination({ page, pageCount, setPage }) {
  return <div className="semester-pagination"><p>Page {page} of {pageCount}</p><div><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><button className="active">{page}</button><button disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button></div></div>
}

export default function SemesterManagement({ mode }) {
  const { id } = useParams()
  if (mode === 'form') return <SemesterForm />
  if (mode === 'edit') return <SemesterForm editMode />
  if (mode === 'details' || id) return <SemesterDetailsPage />
  return <SemesterList />
}
