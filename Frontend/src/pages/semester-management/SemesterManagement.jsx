import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import PageHeader from '../../components/PageHeader'
import ViewDialog from '../../components/ViewDialog'
import TablePagination from '../../components/TablePagination'
import { ProjectSelect } from '../../components/SearchableSelect'
import { academicYearApi, branchApi, courseApi } from '../../api/apiEndpoints'
import { getSemesterById, getSemesters, updateSemester } from '../../auth/collegeApi'
import { getUserCollegeId, getUserRole } from '../../auth/auth'
import { useAcademic } from '../../context/AcademicContext'
import { normalizeAcademicYear } from '../../utils/academicYearUtils'
import { collegeField } from '../../utils/collegeScope'
import { scopeSemesterDirectory } from '../../utils/semesterDirectory'
import { dateOnly, deriveLifecycleStatus } from '../../utils/semesterUtils'
import { semesterRecords } from '../../services/branchSemesterWorkflow'
import eventBus, { ERP_EVENTS } from '../../services/eventBus'
import './SemesterManagement.css'

const same = (a, b) => String(a ?? '') === String(b ?? '')
const keyOf = (row, type) => collegeField(row, type) ?? row?.id
const nameOf = (row, type) => row?.[type + 'Name'] || row?.name || ''
const record = response => response?.data?.data ?? response?.data ?? response
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

export function ScheduleDialog({ row, loadRows = readSavedSemesters, onClose, onSaved, context, yearName }) {
  const [detail, setDetail] = useState(null)
  const [dates, setDates] = useState({ startDate: '', endDate: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let current = true
    getSemesterById(row.id).then(response => {
      const saved = normalize(record(response) || {})
      if (!same(saved.id, row.id) || !same(saved.branchId, row.branchId) || !same(saved.courseId, row.courseId)) throw new Error('The saved semester mapping could not be verified.')
      if (current) { setDetail(saved); setDates({ startDate: saved.startDate, endDate: saved.endDate }) }
    }).catch(reason => { if (current) setError(message(reason)) })
    return () => { current = false }
  }, [row.id, row.branchId, row.courseId])

  async function save(event) {
    event.preventDefault()
    if (busy || !detail) return
    const { startDate, endDate } = dates
    if (!detail.academicYearId || !detail.branchId || !detail.courseId) return setError('This semester is missing its saved academic context. Contact an administrator.')
    if (!day(startDate) || !day(endDate) || startDate >= endDate) return setError('Enter both dates. The start date must be before the end date.')
    setBusy(true)
    setError('')
    try {
      const current = await loadRows()
      const latest = current.find(item => same(item.id, detail.id))
      if (!latest || ['courseId', 'branchId', 'academicYearId', 'semesterNumber', 'startDate', 'endDate'].some(key => !same(latest[key], detail[key]))) throw new Error('This semester changed while the dialog was open. Reopen it before saving.')
      const peers = current.filter(item => !same(item.id, detail.id) && same(item.branchId, detail.branchId) && same(item.academicYearId, detail.academicYearId))
      if (peers.some(item => same(item.semesterNumber, detail.semesterNumber))) throw new Error('A duplicate semester exists in this branch and academic year. Resolve it before scheduling.')
      if (peers.some(item => item.startDate && item.endDate && item.startDate <= endDate && item.endDate >= startDate)) throw new Error('Choose dates without overlap with another semester in this branch and academic year.')
      context()
      await updateSemester(String(detail.id), { courseId: Number(detail.courseId), branchId: Number(detail.branchId),
        academicYearId: Number(detail.academicYearId), semesterNumber: detail.semesterNumber, semesterName: detail.name,
        yearNumber: detail.yearNumber, status: detail.status, startDate, endDate })
      const saved = normalize(record(await getSemesterById(detail.id)) || {})
      if (!same(saved.id, detail.id) || !same(saved.academicYearId, detail.academicYearId) || saved.startDate !== startDate || saved.endDate !== endDate) throw new Error('The saved dates could not be verified. Reopen the semester before retrying.')
      eventBus.emit(ERP_EVENTS.ACADEMIC_UPDATED, { semesterId: detail.id })
      onSaved(saved)
    } catch (reason) { setError(message(reason)) }
    finally { setBusy(false) }
  }

  return <ViewDialog title="Configure Schedule" subtitle={row.name + ' · ' + yearName} maxWidth="520px" busy={busy} showExport={false} onClose={onClose}
    footerContent={<><button className="erp-btn erp-btn--secondary" disabled={busy} onClick={onClose}>Cancel</button>
      <button className="erp-btn erp-btn--primary" disabled={busy || !detail} form="semester-schedule-form">{busy ? 'Saving…' : 'Save Schedule'}</button></>}>
    <form id="semester-schedule-form" className="semester-date-form" onSubmit={save}>
      {!detail && !error && <p role="status">Loading saved schedule…</p>}
      {detail && <><label>Start date<input required type="date" aria-label={row.name + ' start date'} value={dates.startDate} onChange={e => setDates({ ...dates, startDate: e.target.value })} /></label>
        <label>End date<input required type="date" aria-label={row.name + ' end date'} value={dates.endDate} onChange={e => setDates({ ...dates, endDate: e.target.value })} /></label>
        <p>Academic status: <strong>{todayStatus(dates.startDate, dates.endDate)}</strong></p></>}
      {error && <p role="alert">{error}</p>}
    </form>
  </ViewDialog>
}

export default function SemesterManagement({ mode }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { selectedCollegeId } = useAcademic()
  const collegeRef = useRef(selectedCollegeId)
  collegeRef.current = selectedCollegeId
  const [source, setSource] = useState({ courses: [], branches: [], years: [], rows: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
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
    setNotice('')
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
  return <DashboardLayout><main className="semester-management">
    <PageHeader title="Semester Overview & Academic Scheduling" subtitle="Schedule saved semester records by course, branch, and academic year.">
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
      <p className="semester-note">Schedules apply to the saved branch and academic year. Batch-specific scheduling is unavailable.</p>
      {notice && <p role="status" className="semester-note">{notice}</p>}
      {loading ? <p role="status" className="semester-note">Loading semesters…</p> : error ? <p role="alert" className="semester-note">{error} <button onClick={() => setAttempt(attempt + 1)}>Retry</button></p> : filtered.length ? <>
        <div className="semester-table-scroll"><table><thead><tr>{['Semester', 'Course', 'Branch', 'Academic year', 'Start date', 'End date', 'Academic status', 'Action'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{filtered.slice((visiblePage - 1) * pageSize, visiblePage * pageSize).map(row => <tr key={row.id}>
            <th scope="row">{row.name}</th>
            <td>{courseLabel(row)}</td><td>{branchLabel(row)}</td><td>{yearLabel(row)}</td><td>{formatDay(row.startDate)}</td><td>{formatDay(row.endDate)}</td>
            <td><span className="semester-status">{row.startDate && row.endDate && row.startDate < row.endDate ? deriveLifecycleStatus(row, undefined, new Date(now)) : 'Not Scheduled'}</span></td>
            <td><Link className="erp-btn erp-btn--secondary" to={'/semester-management/' + row.id + '/edit' + search}>{row.startDate && row.endDate ? 'Edit dates' : 'Configure dates'}</Link></td>
          </tr>)}</tbody></table></div>
        {totalPages > 1 && <TablePagination page={visiblePage} totalPages={totalPages} onPageChange={setPage} />}
      </> : <p className="semester-note">{rows.length ? 'No saved semesters match these filters.' : <>No semester definitions are saved for this college. <Link to="/academic-structure">Open Academic Structure</Link></>}</p>}
    </section>
    {!loading && !error && id && !active && <ViewDialog title="Semester unavailable" showExport={false} onClose={close}><p>This semester was not found in the selected college.</p></ViewDialog>}
    {active && mode === 'edit' && <ScheduleDialog key={String(selectedCollegeId) + ':' + id} row={active} yearName={yearLabel(active)} loadRows={readRows} onClose={close}
      context={() => { if (!same(collegeRef.current, selectedCollegeId)) throw new Error('The college selection changed. Reopen the semester before saving.') }}
      onSaved={saved => { setSource(prev => ({ ...prev, rows: prev.rows.map(row => same(row.id, saved.id) ? { ...row, ...saved } : row) })); setNotice('Schedule saved.'); close() }} />}
    {active && mode !== 'edit' && <ViewDialog title="Semester Details" subtitle={active.name} onClose={close} showExport={false}>
      <h3>Academic Mapping</h3><p>{courseLabel(active)} · {branchLabel(active)} · {yearLabel(active)}</p>
      <p>{formatDay(active.startDate)} to {formatDay(active.endDate)} · {todayStatus(active.startDate, active.endDate)}</p>
    </ViewDialog>}
  </main></DashboardLayout>
}
