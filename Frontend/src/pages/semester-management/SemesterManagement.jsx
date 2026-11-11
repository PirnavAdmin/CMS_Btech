import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import PageHeader from '../../components/PageHeader'
import ViewDialog from '../../components/ViewDialog'
import TablePagination from '../../components/TablePagination'
import { ProjectSelect } from '../../components/SearchableSelect'
import { academicYearApi, branchApi, courseApi } from '../../api/apiEndpoints'
import { getSemesters, getSemesterById, updateSemester } from '../../auth/collegeApi'
import { getUserCollegeId, getUserRole } from '../../auth/auth'
import { useAcademic } from '../../context/AcademicContext'
import { normalizeAcademicYear } from '../../utils/academicYearUtils'
import { collegeField } from '../../utils/collegeScope'
import { scopeSemesterDirectory } from '../../utils/semesterDirectory'
import { dateOnly, deriveLifecycleStatus } from '../../utils/semesterUtils'
import { semesterRecords } from '../../services/branchSemesterWorkflow'
import './SemesterManagement.css'

const same = (a, b) => String(a ?? '') === String(b ?? '')
const keyOf = (row, type) => collegeField(row, type) ?? row?.id
const nameOf = (row, type) => row?.[type + 'Name'] || row?.name || ''
const day = value => dateOnly(value)
const todayStatus = (start, end) => start && end && start < end ? deriveLifecycleStatus({ startDate: start, endDate: end }) : 'Not Scheduled'
const formatDay = value => value ? new Date(value + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const message = error => error?.response?.data?.message || error?.message || 'The request could not be completed.'

function normalize(row) {
  return { ...row, id: keyOf(row, 'semester'), courseId: collegeField(row, 'course'), branchId: collegeField(row, 'branch'),
    academicYearId: collegeField(row, 'academicYear'), name: nameOf(row, 'semester') || 'Semester ' + row.semesterNumber,
    startDate: day(row.startDate), endDate: day(row.endDate) }
}

export const readSavedSemesters = async () => semesterRecords(await getSemesters()).map(normalize)

export default function SemesterManagement() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { selectedCollegeId } = useAcademic()
  const [source, setSource] = useState({ courses: [], branches: [], years: [], rows: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [scheduleEditor, setScheduleEditor] = useState(null)
  const [scheduleForm, setScheduleForm] = useState({ startDate: '', endDate: '' })
  const [scheduleError, setScheduleError] = useState('')
  const [scheduleSuccess, setScheduleSuccess] = useState('')
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const editRouteOpened = useRef('')
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [])
  const scope = { collegeId: selectedCollegeId, assignedCollegeId: getUserCollegeId(), isAdmin: getUserRole() === 'admin', courses: source.courses, branches: source.branches }
  const scopeRows = rows => scopeSemesterDirectory(rows, scope)
  const readRows = readSavedSemesters

  useEffect(() => {
    let current = true
    setLoading(true)
    setError('')
    setPage(1)
    setSource({ courses: [], branches: [], years: [], rows: [] })
    Promise.all([courseApi.getAll(), branchApi.getAll(), academicYearApi.getAll(), readRows()]).then(([courses, branches, years, rows]) => {
      if (current) setSource({ courses, branches, years: years.map(normalizeAcademicYear), rows })
    }).catch(reason => { if (current) setError(message(reason)) }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [selectedCollegeId, attempt])

  const courses = scopeRows(source.courses)
  const branches = scopeRows(source.branches)
  const rows = scopeRows(source.rows)
  const yearLabel = row => row.academicYearName || nameOf(row.academicYear, 'academicYear') || source.years.find(year => same(year.id, row.academicYearId))?.name || (row.academicYearId ? 'Year #' + row.academicYearId : 'Unassigned')
  const courseLabel = row => row.courseName || nameOf(row.course, 'course') || nameOf(courses.find(course => same(keyOf(course, 'course'), row.courseId)), 'course') || '—'
  const branchLabel = row => row.branchName || nameOf(row.branch, 'branch') || nameOf(branches.find(branch => same(keyOf(branch, 'branch'), row.branchId)), 'branch') || '—'
  const active = rows.find(row => same(row.id, id))
  const isEditRoute = location.pathname.endsWith('/edit')
  useEffect(() => {
    const routeKey = location.pathname
    if (!isEditRoute || !active || editRouteOpened.current === routeKey) return
    editRouteOpened.current = routeKey
    let current = true
    const load = async () => {
      let row = active
      try {
        const response = await getSemesterById(active.id)
        const detail = response?.data?.data ?? response?.data ?? response
        if (detail && typeof detail === 'object') row = normalize({ ...active, ...detail })
      } catch { /* The directory row already contains the saved schedule values. */ }
      if (!current) return
      setScheduleForm({ startDate: row.startDate || '', endDate: row.endDate || '' })
      setScheduleEditor(row)
    }
    setScheduleError('')
    load()
    return () => { current = false }
  }, [active, isEditRoute, location.pathname])
  const courseFilter = params.get('course') || ''
  const branchFilter = params.get('branch') || ''
  const yearFilter = params.get('year') || ''
  const yearOptions = new Map(rows.filter(row => row.academicYearId).map(row => [String(row.academicYearId), yearLabel(row)]))
  const filtered = rows.filter(row => (!courseFilter || same(row.courseId, courseFilter)) && (!branchFilter || same(row.branchId, branchFilter)) &&
    (!yearFilter || same(row.academicYearId, yearFilter)) &&
    [row.name, courseLabel(row), branchLabel(row), yearLabel(row)].some(value => value.toLowerCase().includes(query.trim().toLowerCase())))
    .sort((a, b) => courseLabel(a).localeCompare(courseLabel(b)) || branchLabel(a).localeCompare(branchLabel(b)) ||
      Number(a.semesterNumber) - Number(b.semesterNumber) || yearLabel(a).localeCompare(yearLabel(b)))
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visiblePage = Math.min(page, totalPages)
  const setFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key === 'course') next.delete('branch')
    setParams(next, { replace: true })
    setPage(1)
  }
  const search = params.size ? '?' + params.toString() : ''
  const close = () => navigate('/semester-management' + search, { replace: true })
  const openScheduleEditor = row => {
    setScheduleForm({ startDate: row.startDate || '', endDate: row.endDate || '' })
    setScheduleError('')
    setScheduleSuccess('')
    setScheduleEditor(row)
  }
  const saveSchedule = async event => {
    event.preventDefault()
    if (!scheduleEditor || scheduleSaving) return
    const { startDate, endDate } = scheduleForm
    if (!startDate || !endDate) return setScheduleError('Enter both semester dates.')
    if (endDate <= startDate) return setScheduleError('End date must be later than the start date.')
    const year = source.years.find(item => same(item.id, scheduleEditor.academicYearId))
    if ((year?.startDate && startDate < day(year.startDate)) || (year?.endDate && endDate > day(year.endDate)))
      return setScheduleError('Semester dates must be within the configured academic year.')
    const conflict = rows.find(row => !same(row.id, scheduleEditor.id) && same(row.branchId, scheduleEditor.branchId) && same(row.academicYearId, scheduleEditor.academicYearId) && row.startDate && row.endDate && startDate <= row.endDate && endDate >= row.startDate)
    if (conflict) return setScheduleError(`${conflict.name} is already scheduled during these dates. Choose a range without overlap.`)
    setScheduleSaving(true)
    setScheduleError('')
    try {
      await updateSemester(String(scheduleEditor.id), {
        courseId: Number(scheduleEditor.courseId), branchId: Number(scheduleEditor.branchId),
        academicYearId: Number(scheduleEditor.academicYearId), semesterName: scheduleEditor.name,
        semesterNumber: Number(scheduleEditor.semesterNumber), yearNumber: Number(scheduleEditor.yearNumber || 0),
        startDate, endDate, status: Number(scheduleEditor.status ?? 1),
      })
      await getSemesterById(String(scheduleEditor.id))
      setScheduleSuccess(`${scheduleEditor.name} schedule saved successfully.`)
      setScheduleEditor(null)
      setAttempt(value => value + 1)
    } catch (reason) {
      setScheduleError(message(reason))
    } finally { setScheduleSaving(false) }
  }
  return <DashboardLayout><main className="semester-management">
    <PageHeader title="Semester Overview & Academic Scheduling" subtitle="Review saved semester records by course, branch, and academic year.">
      <Link className="erp-btn erp-btn--secondary" to="/academic-structure?step=programs">
        <FiArrowLeft aria-hidden="true" /> Back to Programs
      </Link>
    </PageHeader>
    <section className="semester-directory">
      <div className="semester-filters">
        <label>Search<input type="text" aria-label="Search semesters" placeholder="Search semester, course, or branch" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} /></label>
        <label>Course<ProjectSelect aria-label="Course" value={courseFilter} onChange={e => setFilter('course', e.target.value)}><option value="">All courses</option>{courses.map(row => <option key={keyOf(row, 'course')} value={keyOf(row, 'course')}>{nameOf(row, 'course')}</option>)}</ProjectSelect></label>
        <label>Branch<ProjectSelect aria-label="Branch" value={branchFilter} onChange={e => setFilter('branch', e.target.value)}><option value="">All branches</option>{branches.filter(row => !courseFilter || same(collegeField(row, 'course'), courseFilter)).map(row => <option key={keyOf(row, 'branch')} value={keyOf(row, 'branch')}>{nameOf(row, 'branch')}</option>)}</ProjectSelect></label>
        <label>Academic year<ProjectSelect aria-label="Academic year" value={yearFilter} onChange={e => setFilter('year', e.target.value)}><option value="">All academic years</option>{[...yearOptions].map(([key, value]) => <option key={key} value={key}>{value}</option>)}</ProjectSelect></label>
      </div>
      <p className="semester-note">Review saved semester records by course, branch, and academic year.</p>
      {loading ? <p role="status" className="semester-note">Loading semesters…</p> : error ? <p role="alert" className="semester-note">{error} <button onClick={() => setAttempt(attempt + 1)}>Retry</button></p> : filtered.length ? <>
        {scheduleSuccess && <p className="semester-success" role="status">{scheduleSuccess}<button type="button" aria-label="Dismiss success message" onClick={() => setScheduleSuccess('')}>×</button></p>}
        <div className="semester-table-scroll"><table><thead><tr>{['Semester', 'Course', 'Branch', 'Academic year', 'Start date', 'End date', 'Academic status', 'Action'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{filtered.slice((visiblePage - 1) * pageSize, visiblePage * pageSize).map(row => <tr key={row.id}>
            <th scope="row">{row.name}</th>
            <td>{courseLabel(row)}</td><td>{branchLabel(row)}</td><td>{yearLabel(row)}</td><td>{formatDay(row.startDate)}</td><td>{formatDay(row.endDate)}</td>
            <td><span className="semester-status">{row.startDate && row.endDate && row.startDate < row.endDate ? deriveLifecycleStatus(row, undefined, new Date(now)) : 'Not Scheduled'}</span></td>
            <td>{row.id && <button type="button" className="erp-btn erp-btn--secondary" onClick={() => openScheduleEditor(row)}>Edit Schedule</button>}</td>
          </tr>)}</tbody></table></div>
        {totalPages > 1 && <TablePagination page={visiblePage} totalPages={totalPages} onPageChange={setPage} />}
      </> : <p className="semester-note">{rows.length ? 'No saved semesters match these filters.' : <>No semester definitions are saved for this college. <Link to="/academic-structure">Open Academic Structure</Link></>}</p>}
    </section>
    {!loading && !error && id && !active && <ViewDialog title="Semester unavailable" showExport={false} onClose={close}><p>This semester was not found in the selected college.</p></ViewDialog>}
    {active && !isEditRoute && <ViewDialog title="Semester Details" subtitle={active.name} onClose={close} showExport={false}>
      <h3>Academic Mapping</h3><p>{courseLabel(active)} · {branchLabel(active)} · {yearLabel(active)}</p>
      <p>{formatDay(active.startDate)} to {formatDay(active.endDate)} · {todayStatus(active.startDate, active.endDate)}</p>
      <button type="button" className="erp-btn erp-btn--secondary" onClick={() => openScheduleEditor(active)}>Edit Schedule</button>
    </ViewDialog>}
    {scheduleEditor && <ViewDialog title="Edit Semester Schedule" subtitle={`${scheduleEditor.name} · ${courseLabel(scheduleEditor)} · ${branchLabel(scheduleEditor)} · ${yearLabel(scheduleEditor)}`} onClose={() => !scheduleSaving && setScheduleEditor(null)} showExport={false} busy={scheduleSaving} footerContent={<><button type="button" className="erp-btn erp-btn--secondary" disabled={scheduleSaving} onClick={() => setScheduleEditor(null)}>Cancel</button><button type="submit" form="semester-schedule-form" className="erp-btn erp-btn--primary" disabled={scheduleSaving}>{scheduleSaving ? 'Saving…' : 'Save Schedule'}</button></>}>
      <form id="semester-schedule-form" className="semester-date-form" onSubmit={saveSchedule}>
        <p>Semester dates must fit within the selected academic year.</p>
        <label>Start Date<input aria-label={`${scheduleEditor.name} start date`} type="date" value={scheduleForm.startDate} onChange={event => setScheduleForm(current => ({ ...current, startDate: event.target.value }))} required /></label>
        <label>End Date<input aria-label={`${scheduleEditor.name} end date`} type="date" min={scheduleForm.startDate || undefined} value={scheduleForm.endDate} onChange={event => setScheduleForm(current => ({ ...current, endDate: event.target.value }))} required /></label>
        {scheduleError && <p role="alert" className="semester-form-error">{scheduleError}</p>}
      </form>
    </ViewDialog>}
  </main></DashboardLayout>
}
