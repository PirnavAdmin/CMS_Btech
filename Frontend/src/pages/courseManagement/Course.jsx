import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiBookOpen, FiCheckCircle, FiEdit2, FiEye, FiFilter, FiGitBranch, FiGrid, FiPlus, FiSearch, FiToggleLeft, FiToggleRight, FiUsers } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import FilterPanel from '../../components/FilterPanel'
import TablePagination, { PAGE_SIZE } from '../../components/TablePagination'
import StatusConfirmDialog from '../../components/StatusConfirmDialog'
import { branchApi, courseApi, courseStructureApi, departmentApi } from '../../api/apiEndpoints'
import { getCourseById, createCourse, updateCourse, updateCourseStatus, getSemesters, getCourseSemesterMappings, createCourseSemesterMapping, updateCourseSemesterMapping, updateCourseSemesterMappingStatus } from '../../auth/collegeApi'
import { normalize } from './Branch'
import './Course.css'

const blank = { name: 'B.Tech', code: 'BTECH', description: '', departmentId: '', branchId: '', collegeId: '', eligibility: '', status: '' }

const apiError = (error, fallback) => error?.response?.status === 401 ? 'Your session has expired. Please sign in again.' : error?.response?.status === 403 ? "You don't have permission to manage courses." : error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback
const listFrom = (response) => { const data = response?.data ?? response; return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : data && typeof data === 'object' ? [data] : [] }
const recordFrom = (response) => {
  let current = response
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth += 1) {
    if (current.course && typeof current.course === 'object') return current.course
    if (current.courseDetails && typeof current.courseDetails === 'object') return current.courseDetails
    if (current.item && typeof current.item === 'object') return current.item
    if (current.result && typeof current.result === 'object') return current.result
    if (current.record && typeof current.record === 'object') return current.record
    if (current.data && typeof current.data === 'object') { current = current.data; continue }
    break
  }
  return current && typeof current === 'object' ? current : {}
}

const mapDepartmentOption = (record) => {
  const status = record.status ?? record.departmentStatus ?? (record.isActive === false ? 0 : 1)
  const active = status === true || Number(status) === 1 || String(status).toLowerCase() === 'active'
  return { id: record.id ?? record.departmentId, name: record.departmentName ?? record.name ?? '', code: record.departmentCode ?? record.code ?? '', collegeId: record.collegeId ?? '', status: active ? 'Active' : 'Inactive' }
}

const mapCourse = (record) => {
  const status = record.status ?? record.courseStatus ?? (record.isActive === true ? 1 : record.isActive === false ? 0 : '')
  const active = status === true || Number(status) === 1 || String(status).toLowerCase() === 'active'
  return {
    id: record.id ?? record.courseId,
    name: record.courseName ?? record.name ?? '',
    code: record.courseCode ?? record.code ?? '',
    shortName: record.courseShortName ?? record.shortName ?? '',
    type: record.courseType ?? record.type ?? '',
    departmentId: record.departmentId ?? '',
    branchId: record.branchId ?? record.branch?.branchId ?? record.branch?.id ?? '',
    department: record.departmentName ?? record.department ?? '',
    collegeId: record.collegeId ?? '',
    college: record.collegeName ?? record.college ?? '',
    durationValue: record.durationYears ?? record.durationValue ?? record.duration ?? '',
    durationUnit: record.durationUnit ?? '',
    semesters: record.totalSemesters ?? record.semesters ?? record.semesterCount ?? '',
    academicSystem: record.academicSystem ?? record.academicPattern ?? '',
    eligibility: record.eligibility ?? '',
    description: record.description ?? '',
    status: status === '' ? '' : active ? 'Active' : 'Inactive',
  }
}

const payloadFor = (value) => ({
  collegeId: value.collegeId === '' ? 0 : Number(value.collegeId),
  departmentId: value.departmentId === '' ? 0 : Number(value.departmentId),
  branchId: value.branchId === '' ? 0 : Number(value.branchId),
  courseCode: value.code.trim().toUpperCase(),
  courseName: value.name.trim(),
  courseShortName: value.code.trim().toUpperCase(),
  courseType: 'Undergraduate',
  durationYears: 4,
  totalSemesters: 8,
  eligibility: value.eligibility || '',
  description: value.description || '',
})

const validateBasic = (v) => {
  const e = {}, code = v.code.trim().toUpperCase(), name = v.name.trim()
  if (!name) e.name = 'Course name is required.'
  else if (name.length < 3 || name.length > 120) e.name = 'Use a course name between 3 and 120 characters.'
  if (!code) e.code = 'Course code is required.'
  else if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(code)) e.code = 'Use uppercase letters, numbers and single hyphens only.'
  if (!v.departmentId) e.departmentId = 'Department is required.'
  if (!v.branchId) e.branchId = 'Branch is required.'
  if (!v.status) e.status = 'Status is required.'
  return e
}

const codeFor = name => { const known = { 'computer science and engineering': 'CSE', 'electronics and communication engineering': 'ECE', 'electrical and electronics engineering': 'EEE', 'mechanical engineering': 'ME', 'civil engineering': 'CE', 'artificial intelligence and data science': 'AI-DS' }, clean = name.trim().toLowerCase(); return known[clean] || name.split(/\s+/).filter(x => x && !['and', '&', 'of', 'the'].includes(x.toLowerCase())).map(x => x[0]).join('').slice(0, 10).toUpperCase() }

const Page = ({ children }) => <DashboardLayout><main className="cm-page course-management">{children}</main></DashboardLayout>
const Header = ({ title, text, children }) => <header className="cm-header"><div><h1>{title}</h1><p>{text}</p></div><div className="cm-row-actions">{children}</div></header>
const Field = ({ label, error, wide, children }) => <label className={`cm-field ${wide ? 'wide' : ''}`}><span>{label.endsWith(' *') ? <>{label.slice(0, -2)} <b className="required-mark">*</b></> : label}</span>{children}{error && <small className="cm-error" role="alert">{error}</small>}</label>
const Badge = ({ value }) => <span className={`course-badge ${String(value).toLowerCase()}`}><i />{value === 'Inactive' ? 'Deactive' : value}</span>

function CourseList() {
  const [courses, setCourses] = useState([])
  const [departments, setDepartments] = useState([])
  const [branches, setBranches] = useState([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pendingStatus, setPendingStatus] = useState(null)
  const [isStatusSaving, setIsStatusSaving] = useState(false)
  const itemsPerPage = 5

  const load = async () => {
    setIsLoading(true); setError('')
    try {
      const [courseRows, departmentRows, branchRows] = await Promise.all([courseApi.getAll(), departmentApi.getAll(), branchApi.getAll()])
      setCourses(courseRows.map(mapCourse).filter(course => course.id && course.name))
      setDepartments(departmentRows.map(mapDepartmentOption))
      setBranches(branchRows)
    } catch (requestError) {
      setCourses([])
      setError(apiError(requestError, 'Unable to load courses. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const departmentName = (c) => departments.find(d => String(d.id) === String(c.departmentId))?.name || c.department || ''
  const rows = useMemo(() => courses.filter(c => `${c.name} ${c.code} ${departmentName(c)}`.toLowerCase().includes(query.trim().toLowerCase()) && (!statusFilter || c.status === statusFilter)), [courses, departments, query, statusFilter])
  const totalPages = Math.ceil(rows.length / itemsPerPage) || 1
  const currentPageClamped = Math.min(Math.max(currentPage, 1), totalPages)
  const pageRows = useMemo(() => rows.slice((currentPageClamped - 1) * itemsPerPage, currentPageClamped * itemsPerPage), [rows, currentPageClamped])
  const stats = { total: courses.length, active: courses.filter(c => c.status === 'Active').length, branches: branches.length, departments: departments.length }
  const hasFilters = Boolean(query || statusFilter)
  const clearFilters = () => { setQuery(''); setStatusFilter(''); setCurrentPage(1) }
  const toggleStatus = (course) => setPendingStatus({ course, nextStatus: (course.status || 'Active') === 'Active' ? 'Inactive' : 'Active' })
  const confirmStatusChange = async () => {
    if (!pendingStatus || isStatusSaving) return
    const { course, nextStatus } = pendingStatus
    setIsStatusSaving(true); setError('')
    try {
      const response = await updateCourseStatus(course.id, nextStatus === 'Active' ? 1 : 0)
      const result = recordFrom(response)
      const updated = result?.id || result?.courseId ? mapCourse(result) : { ...course, status: nextStatus }
      setCourses(current => current.map(item => item.id === course.id ? updated : item))
      setPendingStatus(null)
    } catch (requestError) {
      setError(apiError(requestError, 'Unable to update course status. Please try again.'))
    } finally {
      setIsStatusSaving(false)
    }
  }

  return <Page>
    <Header title="Course Management" text="Manage B.Tech courses, branches and structures."><Link className="cm-button" to="/courses/add"><FiPlus /> Add Course</Link></Header>
    <section className="course-summary">{[['Total Courses', stats.total, FiBookOpen], ['Active Courses', stats.active, FiCheckCircle], ['Associated Branches', stats.branches, FiGitBranch], ['Departments', stats.departments, FiGrid]].map(([label, value, Icon]) => <article key={label}><span className="cm-kpi-icon"><Icon aria-hidden="true" /></span><div><span>{label}</span><strong>{value}</strong></div></article>)}</section>
    <FilterPanel active={hasFilters} onClear={clearFilters}><section className="cm-panel course-toolbar">
      <label className="course-search"><FiSearch /><input aria-label="Search courses" value={query} onChange={e => { setQuery(e.target.value); setCurrentPage(1) }} placeholder="Search course name, code or department" /></label>
      <select aria-label="Status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1) }}><option value="">Select Status</option><option value="Active">Active</option><option value="Inactive">Deactive</option></select>
      {hasFilters && <button className="course-clear" onClick={clearFilters}><FiFilter /> Clear Filters</button>}
    </section></FilterPanel>
    <section className="cm-panel course-directory">
      {isLoading ? <div className="course-empty"><strong>Loading courses...</strong></div>
        : error ? <div className="course-empty"><strong>{error}</strong><button className="cm-button" onClick={load}>Retry</button></div>
        : !courses.length ? <div className="course-empty"><strong>No courses have been added yet.</strong><Link className="cm-button" to="/courses/add">+ Add Course</Link></div>
        : rows.length ? (
          <>
            <div className="course-results">Showing <strong>{rows.length}</strong> of <strong>{courses.length}</strong> courses</div>
            <div className="course-table-scroll">
              <table className="course-advanced-table">
                <thead><tr>{['Course', 'Department', 'Duration', 'Status', 'Actions'].map(label => <th key={label}>{label}</th>)}</tr></thead>
                <tbody>
                  {pageRows.map(c => (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong><small>{c.code}</small></td>
                      <td>{departmentName(c) || 'Not available'}</td>
                      <td>{c.durationValue ? `${c.durationValue} ${c.durationUnit}`.trim() : 'Not available'}</td>
                      <td>{c.status ? <Badge value={c.status} /> : 'Not available'}</td>
                      <td>
                        <div className="course-actions">
                          <Link aria-label={`View ${c.name}`} to={`/courses/${c.id}`}><FiEye /></Link>
                          <Link aria-label={`Edit ${c.name}`} to={`/courses/${c.id}/edit`}><FiEdit2 /></Link>
                          <button className={`course-status-action ${(c.status || 'Active') === 'Active' ? 'danger' : 'success'}`} title={(c.status || 'Active') === 'Active' ? `Mark ${c.name} inactive` : `Mark ${c.name} active`} aria-label={(c.status || 'Active') === 'Active' ? `Mark ${c.name} inactive` : `Mark ${c.name} active`} onClick={() => toggleStatus(c)}>{(c.status || 'Active') === 'Active' ? <FiToggleRight /> : <FiToggleLeft />}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="course-pagination">
              <button className="pagination-btn" onClick={() => setCurrentPage(value => Math.max(value - 1, 1))} disabled={currentPageClamped === 1}>Previous</button>
              <span className="pagination-status">Page {currentPageClamped} of {totalPages}</span>
              <button className="pagination-btn" onClick={() => setCurrentPage(value => Math.min(value + 1, totalPages))} disabled={currentPageClamped === totalPages}>Next</button>
            </div>
          </>
        ) : (
          <div className="course-empty"><strong>No courses match your filters.</strong><button className="cm-button" onClick={clearFilters}>Clear Filters</button></div>
        )}
    </section>
    {pendingStatus && <StatusConfirmDialog entity="Course" name={`${pendingStatus.course.name} (${pendingStatus.course.code})`} nextStatus={pendingStatus.nextStatus} onCancel={() => setPendingStatus(null)} onConfirm={confirmStatusChange} busy={isStatusSaving} />}
  </Page>
}

function CourseForm() {
  const { id } = useParams(), navigate = useNavigate()
  const [departments, setDepartments] = useState([])
  const [branches, setBranches] = useState([])
  const [value, setValue] = useState(blank)
  const [errors, setErrors] = useState({})
  const [codeEdited, setCodeEdited] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setIsLoading(true); setError('')
    try {
      const [departmentRows, branchRows] = await Promise.all([departmentApi.getAll(), branchApi.getAll()])
      setDepartments(departmentRows.map(mapDepartmentOption))
      setBranches(branchRows.map(normalize))
      if (id) {
        const courseRes = await getCourseById(id)
        const detail = mapCourse(recordFrom(courseRes))
        setValue({ ...blank, ...detail, name: 'B.Tech', code: 'BTECH', status: '' })
        setCodeEdited(true)
      }
    } catch (requestError) {
      setError(apiError(requestError, 'Unable to load course details. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => { load() }, [id])

  const live = validateBasic(value)
  const update = (key, next) => { setValue(v => { const n = { ...v, [key]: next }; if (key === 'name' && !codeEdited) n.code = codeFor(next); if (key === 'code') { n.code = next.toUpperCase().replace(/\s/g, ''); setCodeEdited(true) } if (key === 'departmentId') { n.collegeId = departments.find(x => String(x.id) === String(next))?.collegeId ?? ''; n.branchId = '' } return n }); setErrors(e => ({ ...e, [key]: '', ...(key === 'departmentId' ? { branchId: '' } : {}) })) }

  const submit = async () => {
    const e = validateBasic(value); setErrors(e)
    if (Object.keys(e).length) return
    setIsSaving(true); setError('')
    try {
      const payload = payloadFor(value)
      const response = id ? await updateCourse(id, payload) : await createCourse(payload)
      const result = recordFrom(response)
      const courseId = result?.id ?? result?.courseId ?? id
      if (value.status === 'Inactive' && courseId) await updateCourseStatus(courseId, 0)
      setSaved(true)
      setTimeout(() => navigate(`/courses/${courseId}`), 500)
    } catch (requestError) {
      setError(apiError(requestError, `Unable to ${id ? 'update' : 'create'} this course. Please try again.`))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <Page><div className="cm-empty">Loading course...</div></Page>

  return <Page><Header title={id ? 'Edit B.Tech Course' : 'Add B.Tech Course'} text="Create a focused B.Tech undergraduate course."><Link className="cm-button secondary" to="/courses"><FiArrowLeft /> Cancel</Link></Header>
    {saved && <div className="course-toast"><FiCheckCircle /> Course saved successfully.</div>}
    {error && <p className="cm-error" role="alert">{error}</p>}
    <div className="course-form-layout">
      <section className="cm-panel course-form">
        <section><h2>Course Identity</h2><div className="cm-form-grid">
          <Field label="Course Name *" error={errors.name || (value.name ? live.name : '')}><input value="B.Tech" readOnly /></Field>
          <Field label="Course Code *" error={errors.code || (value.code ? live.code : '')}><input value="BTECH" readOnly /></Field>
        </div></section>
        <section><h2>Academic Mapping</h2><div className="cm-form-grid">
          <Field label="Department *" error={errors.departmentId || (value.departmentId ? live.departmentId : '')}><select value={value.departmentId} onChange={e => update('departmentId', e.target.value)}><option value="">Select B.Tech department</option>{departments.filter(x => x.status !== 'Inactive' || String(x.id) === String(value.departmentId)).map(x => <option value={x.id} key={x.id}>{x.code ? `${x.code} — ` : ''}{x.name}</option>)}</select></Field>
          <Field label="Branch / Specialization *" error={errors.branchId}><select value={value.branchId} disabled={!value.departmentId} onChange={e => update('branchId', e.target.value)}><option value="">{value.departmentId ? 'Select core branch or specialization' : 'Select department first'}</option>{branches.filter(branch => String(branch.departmentId) === String(value.departmentId)).map(branch => <option key={branch.id} value={branch.id}>{branch.code ? `${branch.code} - ` : ''}{branch.name} ({branchType(branch)})</option>)}</select></Field>
          <Field label="Eligibility"><input value={value.eligibility || ''} onChange={e => update('eligibility', e.target.value)} placeholder="e.g. 10+2 with PCM" /></Field>
        </div></section>
        <section><h2>Academic Structure</h2><div className="cm-form-grid">
          <Field label="Duration"><input value="4 Years" readOnly /></Field>
          <Field label="Academic Pattern"><input value="Semester" readOnly /></Field>
          <Field label="Total Semesters"><input value="8" readOnly /></Field>
          <Field label="Status *" error={errors.status}><select required value={value.status} onChange={e => update('status', e.target.value)}><option value="" disabled>Select Status</option><option value="Active">Active</option><option value="Inactive">Deactive</option></select></Field>
        </div></section>
        <footer><span></span><button className="cm-button" disabled={isSaving} onClick={submit}>{isSaving ? 'Saving...' : id ? 'Save Changes' : 'Create Course'}</button></footer>
      </section>
      <aside className="course-preview"><span>Live Preview</span><div>
        {value.status ? <Badge value={value.status} /> : <span className="course-badge">Select Status</span>}<h2>{value.name || 'Course Name'}</h2><strong>{value.code || 'CODE'}</strong><p>B.Tech Undergraduate</p><hr />
        <b>{departments.find(x => String(x.id) === String(value.departmentId))?.name || 'B.Tech Department'}</b><p>4 Years · 8 Semesters</p>
        {value.eligibility && <p className="course-preview-note"><strong>Eligibility:</strong> {value.eligibility}</p>}
      </div></aside>
    </div>
  </Page>
}

function CourseDetails() {
  const { id } = useParams()
  const [course, setCourse] = useState(null)
  const [departments, setDepartments] = useState([])
  const [branches, setBranches] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setIsLoading(true); setError('')
    try {
      const [course, departmentRows, branchRows] = await Promise.all([courseApi.getById(id), departmentApi.getAll(), branchApi.getByCourse(id)])
      setCourse(mapCourse(recordFrom(course)))
      setDepartments(departmentRows.map(mapDepartmentOption))
      setBranches(branchRows.map(normalize))
    } catch (requestError) {
      setCourse(null)
      setError(apiError(requestError, 'Unable to load course details. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => { load() }, [id])

  if (isLoading) return <Page><div className="cm-empty">Loading course...</div></Page>
  if (error || !course) return <Page><div className="course-empty"><strong>{error || 'Course not found.'}</strong><Link className="cm-button" to="/courses">Back to Courses</Link></div></Page>

  const department = departments.find(x => String(x.id) === String(course.departmentId))
  const stats = [['Total Branches', branches.length], ['Active Branches', branches.filter(x => (x.status || 'Active') === 'Active').length], ['Inactive Branches', branches.filter(x => x.status === 'Inactive').length], ['Total Approved Intake', branches.reduce((n, x) => n + Number(x.intakeCapacity ?? x.intake ?? 0), 0)]]

  return <Page><Header title="B.Tech Course Details" text="Course configuration and associated B.Tech branches."><Link className="cm-button secondary" to="/courses"><FiArrowLeft /> Back</Link><Link className="cm-button" to={`/courses/${id}/edit`}><FiEdit2 /> Edit Course</Link></Header>
    <section className="course-detail-hero"><div><span className="cm-eyebrow">B.Tech Course</span><h2>{course.name}</h2><Badge value={course.status || 'Active'} /></div><strong>{course.code}</strong></section>
    <section className="cm-panel course-detail-grid">{[
      ['Course Name', course.name],
      ['Course Code', course.code],
      ['Short Name', course.shortName],
      ['Course Type', course.type],
      ['College', course.college],
      ['Department', department?.name || course.department],
      ['Duration', `${course.durationValue || 4} ${course.durationUnit || 'Years'}`],
      ['Academic Pattern', course.academicSystem],
      ['Total Semesters', course.semesters],
      ['Eligibility', course.eligibility],
      ['Status', course.status],
    ].map(([label, value]) => <div className="cm-detail" key={label}><span>{label}</span><strong>{value === null || value === undefined || String(value).trim() === '' ? 'Not provided' : String(value)}</strong></div>)}</section>
    <section className="course-summary course-detail-stats">{stats.map(x => <article key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong></article>)}</section>
    <section className="cm-panel course-branches"><div><h2>Associated Branches</h2><Link className="cm-button secondary" to={`/branches?course=${id}`}>View All</Link></div>{branches.length ? <div className="course-branch-grid">{branches.map(b => <Link to={`/branches/${b.id}`} key={b.id}><strong>{b.name}</strong><span>{b.code} · {branchType(b)}</span><small>Intake: {Number(b.intakeCapacity ?? b.intake ?? 0)} · {b.status || 'Active'}</small></Link>)}</div> : <p>No branches are configured for this course.</p>}</section>
  </Page>
}

const branchType = b => b.branchType || (b.specialization ? 'Specialization' : 'Core')

export function CourseStructure() {
  const { courseId, branchId } = useParams()
  const [course, setCourse] = useState(null)
  const [branch, setBranch] = useState(null)
  const [rows, setRows] = useState([]), [semesterOptions, setSemesterOptions] = useState([]), [semester, setSemester] = useState(1), [form, setForm] = useState({ semesterId: '', yearNumber: 1, semesterNumber: 1, semesterName: 'Semester 1' }), [editing, setEditing] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [saving, setSaving] = useState(false), [page, setPage] = useState(1)

  const load = async () => {
    setLoading(true)
    try {
      const [courseRes, semesterRes, mappingRes, branchRecord] = await Promise.all([getCourseById(courseId), getSemesters(), getCourseSemesterMappings(), branchApi.getById(branchId)])
      setCourse(mapCourse(recordFrom(courseRes)))
      setBranch(branchRecord ? normalize(branchRecord) : null)
      const semesters = listFrom(semesterRes?.data).filter(x => !x.branchId || String(x.branchId) === String(branchId))
      const mappings = listFrom(mappingRes?.data).filter(x => String(x.courseId) === String(courseId))
      const byId = new Map(semesters.map(x => [String(x.semesterId), x]))
      setSemesterOptions(semesters)
      setRows(mappings.map(x => { const s = byId.get(String(x.semesterId)) || {}; return { ...x, structureId: x.courseSemesterMappingId, semesterNumber: Number(s.semesterNumber || 1), semesterName: s.semesterName || `Semester ${s.semesterNumber || 1}`, yearNumber: Math.ceil(Number(s.semesterNumber || 1) / 2) } }))
      setError('')
    } catch (e) { setError(e.message || 'Unable to load course structures.') } finally { setLoading(false) }
  }
  useEffect(() => { if (courseId && branchId) load() }, [courseId, branchId])

  if (loading) return <Page><div className="cm-empty">Loading...</div></Page>
  if (!course || !branch) return <Page><div className="cm-empty">Academic structure not found.</div></Page>

  const visible = rows.filter(x => Number(x.semesterNumber) === semester), totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE)), currentPage = Math.min(page, totalPages), pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), changeSemester = (value) => { const option = semesterOptions.find(x => Number(x.semesterNumber) === value); setSemester(value); setPage(1); setEditing(null); setForm({ semesterId: option?.semesterId || '', yearNumber: Math.ceil(value / 2), semesterNumber: value, semesterName: option?.semesterName || `Semester ${value}` }) }
  const submit = async () => { if (!form.semesterId) { setError('Select a semester to map.'); return } setSaving(true); try { const payload = { courseId: Number(courseId), semesterId: Number(form.semesterId), ...(editing ? { updatedBy: 1 } : { createdBy: 1 }) }; const result = editing ? await updateCourseSemesterMapping(editing, payload) : await createCourseSemesterMapping(payload); const mapped = result?.data?.data || result?.data || result; const option = semesterOptions.find(x => String(x.semesterId) === String(form.semesterId)) || {}; const row = { ...mapped, structureId: mapped.courseSemesterMappingId || editing, semesterNumber: Number(option.semesterNumber || form.semesterNumber), semesterName: option.semesterName || form.semesterName, yearNumber: Math.ceil(Number(option.semesterNumber || form.semesterNumber) / 2) }; setRows(current => editing ? current.map(x => x.structureId === editing ? row : x) : [...current, row]); setEditing(null); setError('') } catch (e) { setError(e.message || 'Unable to save semester mapping.') } finally { setSaving(false) } }
  const edit = (row) => { setEditing(row.structureId); setForm({ semesterId: row.semesterId, yearNumber: row.yearNumber, semesterNumber: row.semesterNumber, semesterName: row.semesterName || `Semester ${row.semesterNumber}` }); setSemester(Number(row.semesterNumber)) }
  const toggleStatus = async (row) => { try { await updateCourseSemesterMappingStatus(row.structureId, Number(row.status) === 0 ? 1 : 0); setRows(current => current.map(x => x.structureId === row.structureId ? { ...x, status: Number(x.status) === 0 ? 1 : 0 } : x)) } catch (e) { setError(e.message || 'Unable to update mapping status.') } }

  return <Page><Header title="Course Structure" text={`${course.name} / ${branch.name}`}><Link className="cm-button secondary" to={`/branches/${branchId}`}><FiArrowLeft /> Back to Branch</Link></Header>
    {error && <p className="cm-error" role="alert">{error}</p>}
    <div className="cm-semesters">{Array.from({ length: 8 }, (_, i) => i + 1).map(x => <button className={`cm-semester ${semester === x ? 'active' : ''}`} onClick={() => changeSemester(x)} key={x}>Semester {x}</button>)}</div>
    <section className="cm-panel cm-form-grid">
      <Field label="Year"><input type="number" min="1" max="4" value={form.yearNumber} onChange={e => setForm({ ...form, yearNumber: e.target.value })} /></Field>
      <Field label="Semester"><select value={form.semesterId} onChange={e => { const option = semesterOptions.find(x => String(x.semesterId) === e.target.value); const number = Number(option?.semesterNumber || form.semesterNumber); setForm({ ...form, semesterId: e.target.value, semesterNumber: number, semesterName: option?.semesterName || form.semesterName, yearNumber: Math.ceil(number / 2) }); setSemester(number) }}><option value="">Select semester</option>{semesterOptions.map(x => <option key={x.semesterId} value={x.semesterId}>{x.semesterName || `Semester ${x.semesterNumber}`}</option>)}</select></Field>
      <Field label="Semester Name"><input value={form.semesterName} readOnly /></Field>
      <button className="cm-button" disabled={saving} onClick={submit}>{saving ? 'Saving…' : editing ? 'Update Structure' : 'Add Structure'}</button>
      {editing && <button className="cm-button secondary" onClick={() => setEditing(null)}>Cancel</button>}
    </section>
    <section className="cm-panel cm-table-wrap"><table className="cm-table"><thead><tr><th>Year</th><th>Semester</th><th>Name</th><th>Status</th><th>Action</th></tr></thead><tbody>{pageRows.map(x => <tr key={x.structureId}><td>{x.yearNumber}</td><td>{x.semesterNumber}</td><td>{x.semesterName}</td><td>{Number(x.status) === 0 ? 'Deactive' : 'Active'}</td><td><button className="cm-button" onClick={() => edit(x)}><FiEdit2 /> Edit</button></td></tr>)}</tbody></table>{loading ? <div className="cm-empty">Loading structures…</div> : !visible.length ? <div className="cm-empty">No structure configured for Semester {semester}.</div> : <TablePagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />}</section>
  </Page>
}

export default function Course({ mode = 'list' }) { return mode === 'form' ? <CourseForm /> : mode === 'details' ? <CourseDetails /> : <CourseList /> }
