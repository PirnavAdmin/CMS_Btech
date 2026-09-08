import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiBookOpen, FiCheckCircle, FiEdit2, FiEye, FiFilter, FiGitBranch, FiGrid, FiPlus, FiSearch, FiToggleLeft, FiToggleRight, FiUsers } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import FilterPanel from '../../components/FilterPanel'
import TablePagination, { PAGE_SIZE } from '../../components/TablePagination'
import StatusConfirmDialog from '../../components/StatusConfirmDialog'
import { branchApi, courseApi, courseStructureApi, departmentApi, studentAdmissionApi } from '../../api/apiEndpoints'
import { getCourseById, createCourse, updateCourse, updateCourseStatus, getSemesters, getCourseSemesterMappings, createCourseSemesterMapping, updateCourseSemesterMapping, updateCourseSemesterMappingStatus } from '../../auth/collegeApi'
import { normalize } from './Branch'
import './Course.css'

const blank = { name: 'B.Tech', code: 'BTECH', shortName: '', type: 'Undergraduate', durationValue: '', semesters: '', description: '', departmentId: '', departmentCode: '', branchId: '', branchCode: '', collegeId: '', status: '' }

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
  const name = String(record.departmentName ?? record.name ?? '').trim()
  return { id: record.id ?? record.departmentId, name, code: record.departmentCode ?? record.deptCode ?? record.code ?? '', collegeId: record.collegeId ?? '', status: active ? 'Active' : 'Inactive' }
}

const dedupeDepartmentOptions = (rows) => {
  const map = new Map()
  for (const raw of rows) {
    const item = mapDepartmentOption(raw)
    const name = item.name
    if (item.id == null || !name) continue
    const key = String(item.id)
    if (!map.has(key)) map.set(key, { ...item, name })
  }
  return Array.from(map.values())
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
    departmentCode: record.departmentCode ?? record.department?.departmentCode ?? record.department?.code ?? '',
    branchId: record.branchId ?? record.branch?.branchId ?? record.branch?.id ?? '',
    branchCode: record.branchCode ?? record.branch?.branchCode ?? record.branch?.code ?? '',
    branch: record.branchName ?? record.branch?.branchName ?? record.branch?.name ?? record.branch?.shortName ?? '',
    department: record.departmentName ?? record.department?.departmentName ?? record.department?.name ?? (typeof record.department === 'string' ? record.department : ''),
    collegeId: record.collegeId ?? '',
    college: record.collegeName ?? record.college?.name ?? (typeof record.college === 'string' ? record.college : ''),
    durationValue: record.durationYears ?? record.durationValue ?? record.duration ?? '',
    durationUnit: record.durationUnit ?? '',
    semesters: [3, 4].includes(Number(record.durationYears ?? record.durationValue ?? record.duration))
      ? Number(record.durationYears ?? record.durationValue ?? record.duration) * 2
      : record.totalSemesters ?? record.semesters ?? record.semesterCount ?? '',
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
  courseShortName: value.shortName.trim(),
  courseType: value.type,
  durationYears: Number(value.durationValue),
  totalSemesters: Number(value.semesters),
  description: value.description || '',
})

const validateBasic = (v, courses = [], editingId = null) => {
  const e = {}, code = v.code.trim().toUpperCase(), name = v.name.trim()
  if (!name) e.name = 'Course name is required.'
  else if (name.length < 3 || name.length > 120) e.name = 'Use a course name between 3 and 120 characters.'
  if (!code) e.code = 'Course code is required.'
  else if (code.length < 2 || code.length > 20) e.code = 'Course code must be 2?20 characters.'
  else if (!/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*$/.test(code)) e.code = 'Start with a letter. Use letters, numbers and single hyphens only.'
  else if (courses.some(course => String(course.id) !== String(editingId) && String(course.code || '').trim().toUpperCase() === code)) e.code = 'This course code already exists. Enter a unique code.'
  if (!v.durationValue) e.durationValue = 'Duration is required.'
  if (String(v.durationValue) && Number(v.durationValue) !== 3 && Number(v.durationValue) !== 4) e.durationValue = 'Select a supported duration.'
  if (!v.departmentId) e.departmentId = 'Department is required.'
  if (!v.branchId) e.branchId = 'Branch is required.'
  if (!v.status) e.status = 'Status is required.'
  return e
}

const codeFor = name => { const known = { 'computer science and engineering': 'CSE', 'electronics and communication engineering': 'ECE', 'electrical and electronics engineering': 'EEE', 'mechanical engineering': 'ME', 'civil engineering': 'CE', 'artificial intelligence and data science': 'AI-DS' }, clean = name.trim().toLowerCase(); return known[clean] || name.split(/\s+/).filter(x => x && !['and', '&', 'of', 'the'].includes(x.toLowerCase())).map(x => x[0]).join('').slice(0, 10).toUpperCase() }

const Page = ({ children }) => <DashboardLayout><main className="cm-page course-management">{children}</main></DashboardLayout>
const Header = ({ title, text, children }) => <header className="cm-header"><div><h1>{title}</h1><p>{text}</p></div><div className="cm-row-actions">{children}</div></header>
const Field = ({ label, error, wide, children }) => <label className={`cm-field ${wide ? 'wide' : ''}`}><span>{label.endsWith(' *') ? <>{label.slice(0, -2)} <b className="required-mark">*</b></> : label}</span>{children}{error && <small className="cm-error" role="alert">{error}</small>}</label>
const Badge = ({ value }) => <span className={`course-badge ${String(value).toLowerCase()}`}><i />{value}</span>

function CourseList() {
  const [courses, setCourses] = useState([])
  const [departments, setDepartments] = useState([])
  const [branches, setBranches] = useState([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const statusLock = useRef(false)
  const [statusNotice, setStatusNotice] = useState('')
  const [statusError, setStatusError] = useState('')
  const [pendingStatus, setPendingStatus] = useState(null)
  const [impactChecking, setImpactChecking] = useState(false)
  const [courseImpact, setCourseImpact] = useState(null)
  const [isStatusSaving, setIsStatusSaving] = useState(false)
  const itemsPerPage = 5

  const load = async () => {
    setIsLoading(true); setError('')
    try {
      const [courseRows, departmentRows, branchRows] = await Promise.all([courseApi.getAll(), departmentApi.getAll(), branchApi.getAll()])
      setCourses(courseRows.map(mapCourse).filter(course => course.id && course.name))
      setDepartments(dedupeDepartmentOptions(departmentRows))
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
  const studentCourseId = student => student.courseId ?? student.course?.id ?? student.academic?.courseId ?? student.academicInformation?.courseId ?? null
  const checkCourseImpact = async course => {
    const students = await studentAdmissionApi.getAll({ courseId: course.id })
    const canMatch = students.every(student => studentCourseId(student) !== null && studentCourseId(student) !== undefined && studentCourseId(student) !== '')
    return canMatch ? { state: 'known', count: students.filter(student => String(studentCourseId(student)) === String(course.id)).length } : { state: 'unknown' }
  }
  const toggleStatus = async course => {
    setStatusError(''); setStatusNotice('')
    if (course.status !== 'Active') { setPendingStatus({ course, nextStatus: 'Active' }); return }
    setImpactChecking(true); setCourseImpact(null); setStatusNotice('Checking course dependencies...')
    try { setCourseImpact(await checkCourseImpact(course)) } catch { setCourseImpact({ state: 'unknown' }) }
    finally { setImpactChecking(false); setStatusNotice(''); setPendingStatus({ course, nextStatus: 'Inactive' }) }
  }
  const confirmStatusChange = async () => {
    if (!pendingStatus || statusLock.current) return
    statusLock.current = true
    const { course, nextStatus } = pendingStatus
    setIsStatusSaving(true); setStatusError('')
    try {
      const response = await updateCourseStatus(course.id, nextStatus === 'Active' ? 1 : 0)
      if (response?.data?.success === false) throw new Error('Course status could not be updated.')
      setStatusNotice(nextStatus === 'Active' ? 'Course activated successfully.' : 'Course deactivated successfully.')
      await load()
      setPendingStatus(null)
    } catch (requestError) {
      setStatusError(apiError(requestError, 'Unable to update course status. Please try again.'))
    } finally {
      statusLock.current = false
      setIsStatusSaving(false)
    }
  }

  return <Page>
    <Header title="Course Management" text="Manage B.Tech courses, branches and structures."><Link className="cm-button" to="/courses/add"><FiPlus /> Add Course</Link></Header>
    {statusNotice && <div className="course-toast" role="status">{statusNotice}</div>}
    <section className="course-summary">{[['Total Courses', stats.total, FiBookOpen], ['Active Courses', stats.active, FiCheckCircle], ['Associated Branches', stats.branches, FiGitBranch], ['Departments', stats.departments, FiGrid]].map(([label, value, Icon]) => <article key={label}><span className="cm-kpi-icon"><Icon aria-hidden="true" /></span><div><span>{label}</span><strong>{value}</strong></div></article>)}</section>
    <FilterPanel active={hasFilters} onClear={clearFilters}><section className="cm-panel course-toolbar">
      <label className="course-search"><FiSearch /><input aria-label="Search courses" value={query} onChange={e => { setQuery(e.target.value); setCurrentPage(1) }} placeholder="Search course name, code or department" /></label>
      <select aria-label="Status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1) }}><option value="">Select Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select>
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
                      <td><strong>{c.name}</strong><small>{c.code}{c.shortName ? ` ? ${c.shortName}` : ''}</small></td>
                      <td>{departmentName(c) || 'Not available'}</td>
                      <td>{c.durationValue ? `${c.durationValue} ${c.durationUnit}`.trim() : 'Not available'}</td>
                      <td>{c.status ? <Badge value={c.status} /> : 'Not available'}</td>
                      <td>
                        <div className="course-actions">
                          <Link aria-label={`View ${c.name}`} to={`/courses/${c.id}`}><FiEye className="module-action-icon module-action-icon--view" /></Link>
                          <Link aria-label={`Edit ${c.name}`} to={`/courses/${c.id}/edit`}><FiEdit2 className="module-action-icon module-action-icon--edit" /></Link>
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
    {pendingStatus && <StatusConfirmDialog entity="Course" name={`${pendingStatus.course.name} (${pendingStatus.course.code})`} nextStatus={pendingStatus.nextStatus} onCancel={() => { if (!isStatusSaving) { setPendingStatus(null); setCourseImpact(null) } }} onConfirm={confirmStatusChange} busy={isStatusSaving || impactChecking} error={statusError} details={pendingStatus.nextStatus === 'Inactive' && courseImpact?.state === 'known' ? [['Associated Students', `${courseImpact.count} Students`]] : []} description={pendingStatus.nextStatus === 'Active' ? 'This course will be marked active.' : courseImpact?.state === 'known' && courseImpact.count === 0 ? 'No students are currently associated with this course. This course will be marked inactive for operations that exclude inactive courses.' : courseImpact?.state === 'known' ? `This course currently has ${courseImpact.count} associated students. Existing student records will not be deleted by this action.` : 'The associated student count could not be determined from the available data. Existing student or academic records may remain available according to current system rules.'} confirmLabel={pendingStatus.nextStatus === 'Inactive' ? 'Deactivate Course' : 'Activate Course'} />}
  </Page>
}

function CourseForm() {
  const saveLock = useRef(false)
  const [persistedId, setPersistedId] = useState(null)
  const [existingCourses, setExistingCourses] = useState([])
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
      const [departmentRows, branchRows, courseRows] = await Promise.all([departmentApi.getAll(), branchApi.getAll(), courseApi.getAll()])
      const normalizedDepartments = dedupeDepartmentOptions(departmentRows)
      const normalizedBranches = branchRows.map(normalize)
      setExistingCourses(courseRows.map(mapCourse))
      setDepartments(normalizedDepartments)
      setBranches(normalizedBranches)
      if (id) {
        const courseRes = await getCourseById(id)
        const detail = mapCourse(recordFrom(courseRes))
        const department = normalizedDepartments.find(item => String(item.id) === String(detail.departmentId))
        const branch = normalizedBranches.find(item => String(item.id) === String(detail.branchId))
        setValue({ ...blank, ...detail, departmentCode: detail.departmentCode || department?.code || '', branchCode: detail.branchCode || branch?.code || '' })
        setCodeEdited(true)
      }
    } catch (requestError) {
      setError(apiError(requestError, 'Unable to load course details. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => { load() }, [id])

  const live = validateBasic(value, existingCourses, persistedId ?? id)
  const update = (key, next) => { setValue(v => { const n = { ...v, [key]: next }; if (key === 'durationValue') n.semesters = next ? Number(next) * 2 : ''; if (key === 'name' && !codeEdited) n.code = codeFor(next); if (key === 'code') { n.code = next.toUpperCase(); setCodeEdited(true) } if (key === 'departmentId') { const department = departments.find(x => String(x.id) === String(next)); n.collegeId = department?.collegeId ?? ''; n.departmentCode = department?.code || ''; n.branchId = ''; n.branchCode = '' } if (key === 'branchId') n.branchCode = branches.find(x => String(x.id) === String(next))?.code || ''; return n }); setErrors(e => ({ ...e, [key]: '', ...(key === 'departmentId' ? { branchId: '' } : {}) })) }

  const submit = async () => {
    if (saveLock.current || saved) return
    const e = validateBasic(value, existingCourses, persistedId ?? id); setErrors(e)
    if (Object.keys(e).length) return
    saveLock.current = true
    setIsSaving(true); setError('')
    try {
      const latestCourses = (await courseApi.getAll()).map(mapCourse)
      setExistingCourses(latestCourses)
      const latestErrors = validateBasic(value, latestCourses, persistedId ?? id)
      if (Object.keys(latestErrors).length) { setErrors(latestErrors); return }
      const payload = payloadFor(value)
      const targetId = persistedId ?? id
      const response = targetId ? await updateCourse(targetId, payload) : await createCourse(payload)
      if (response?.data?.success === false) throw new Error('Course could not be saved.')
      const result = recordFrom(response)
      const courseId = result?.id ?? result?.courseId ?? targetId
      if (!courseId) { setSaved(true); throw new Error('Course saved, but its ID was not returned. Check the course list before making further changes.') }
      setPersistedId(courseId)
      const statusResponse = await updateCourseStatus(courseId, value.status === 'Active' ? 1 : 0)
      if (statusResponse?.data?.success === false) throw new Error('Course saved, but its status could not be updated. Please retry.')
      setSaved(true)
      setTimeout(() => navigate('/courses'), 500)
    } catch (requestError) {
      const message = apiError(requestError, `Unable to ${id ? 'update' : 'create'} this course. Please try again.`)
      if (/code/i.test(message) && /already exists|duplicate|already in use/i.test(message)) {
        setErrors(current => ({ ...current, code: 'This course code already exists. Enter a unique code.' }))
      } else setError(message)
    } finally {
      saveLock.current = false
      setIsSaving(false)
    }
  }

  if (isLoading) return <Page><div className="cm-empty">Loading course...</div></Page>

  const departmentOptions = departments.filter(x => x.status !== 'Inactive' || String(x.id) === String(value.departmentId))
  const branchOptions = branches.filter(x => String(x.departmentId) === String(value.departmentId))
  return <Page><Header title={id ? 'Edit B.Tech Course' : 'Add B.Tech Course'} text="Create a focused B.Tech undergraduate course."><Link className="cm-button secondary" to="/courses"><FiArrowLeft /> Cancel</Link></Header>
    {saved && !error && <div className="course-toast"><FiCheckCircle /> Course saved successfully.</div>}
    {error && <p className="cm-error" role="alert">{error} <button type="button" className="cm-button secondary" disabled={isSaving} onClick={load}>Reload options</button></p>}
    <div className="course-form-layout">
      <section className="cm-panel course-form">
        <section><h2>Course Identity</h2><div className="cm-form-grid">
          <Field label="Course Name *" error={errors.name || (value.name ? live.name : '')}><input value={value.name} required onChange={e => update('name', e.target.value)} /></Field>
          <Field label="Course Code *" error={errors.code || (value.code ? live.code : '')}><input value={value.code} required minLength={2} maxLength={20} aria-invalid={Boolean(errors.code || live.code)} onChange={e => update('code', e.target.value)} onBlur={() => setErrors(current => ({ ...current, code: live.code || '' }))} placeholder="e.g. BTECH-02 (2?20 characters)" /></Field>
          <Field label="Short Name (Optional)"><input value={value.shortName} onChange={e => update('shortName', e.target.value)} placeholder="e.g. B.Tech" /></Field>
        </div></section>
        <section><h2>Academic Mapping</h2><div className="cm-form-grid">
          <Field label="Department *" error={errors.departmentId || (value.departmentId ? live.departmentId : '')}><SearchableSelect label="Department" value={value.departmentId} options={departmentOptions.map((x) => ({ id: x.id, name: x.name, code: x.code || '' }))} onChange={value => update('departmentId', value)} placeholder={departmentOptions.length ? 'Select department' : 'No departments available'} searchPlaceholder="Search departments..." noOptionsMessage="No department matches your search." disabled={!departmentOptions.length} /></Field>
          <Field label="Department Code"><input value={value.departmentCode || ''} placeholder="Resolved from department" readOnly /></Field>
          <Field label="Branch / Specialization *" error={errors.branchId}><SearchableSelect label="Branch / Specialization" value={value.branchId} options={branchOptions.map((branch) => ({ id: branch.id, name: `${branch.code ? `${branch.code} - ` : ''}${branch.name} (${branchType(branch)})`, code: branch.code || '' }))} onChange={value => update('branchId', value)} placeholder={value.departmentId ? (branchOptions.length ? 'Select core branch or specialization' : 'No branches for this department') : 'Select department first'} searchPlaceholder="Search branch or specialization..." noOptionsMessage="No matching branch found." disabled={!value.departmentId} /></Field>
          <Field label="Branch Code"><input value={value.branchCode || ''} placeholder="Resolved from branch" readOnly /></Field>
        </div></section>
        <section><h2>Academic Structure</h2><div className="cm-form-grid">
          <Field label="Duration *" error={errors.durationValue}><select value={value.durationValue} onChange={e => update('durationValue', e.target.value ? Number(e.target.value) : '')}><option value="">Select Duration</option><option value="3">3 Years</option><option value="4">4 Years</option></select></Field>
          <Field label="Academic Pattern"><input value="Semester" readOnly /></Field>
          <Field label="Total Semesters"><input value={value.semesters || ''} placeholder="Calculated from duration" readOnly /></Field>
          <Field label="Status *" error={errors.status}><select required value={value.status} onChange={e => update('status', e.target.value)}><option value="" disabled>Select Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select></Field>
        </div></section>
        <footer><button type="button" className="cm-button" disabled={isSaving || saved} onClick={submit}>{isSaving ? 'Saving...' : id ? 'Save Changes' : 'Create Course'}</button></footer>
      </section>
      <aside className="course-preview" aria-label="Course preview"><span>Live Preview</span><div>
        <h2>{value.name.trim() || 'Course Preview'}</h2>
        {[
          ['Basic Information', [['Course Name', value.name], ...(value.shortName.trim() ? [['Short Name', value.shortName]] : []), ['Course Code', value.code], ['Department', departments.find(x => String(x.id) === String(value.departmentId))?.name], ['Department Code', value.departmentCode], ['Branch', branches.find(x => String(x.id) === String(value.branchId))?.name], ['Branch Code', value.branchCode]]],
          ['Academic Structure', [['Course Type', value.type], ['Duration', value.durationValue ? value.durationValue + ' Years' : ''], ['Total Semesters', value.semesters]]],
        ].map(([title, fields]) => <section key={title}><h3>{title}</h3><dl>{fields.map(([label, text]) => <div key={label}><dt>{label}</dt><dd>{typeof text === 'string' ? text.trim() || 'Not provided' : typeof text === 'number' ? text : 'Not provided'}</dd></div>)}</dl></section>)}
        <h3>Status</h3>{value.status ? <Badge value={value.status} /> : 'Not provided'}
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
      setDepartments(dedupeDepartmentOptions(departmentRows))
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
  const valueText = value => value === null || value === undefined || String(value).trim() === '' ? '' : String(value)
  const detailRows = (rows) => rows.filter(([, value]) => valueText(value)).map(([label, value]) => <div className="course-detail-row" key={label}><span>{label}</span><strong>{valueText(value)}</strong></div>)
  const duration = course.durationValue ? `${course.durationValue} ${course.durationUnit || 'Years'}` : ''
  const pattern = course.academicSystem || 'Semester'

  return <Page><Header title="B.Tech Course Details" text="Course configuration and associated B.Tech branches."><Link className="cm-button secondary" to="/courses"><FiArrowLeft /> Back</Link><Link className="cm-button" to={`/courses/${id}/edit`}><FiEdit2 className="module-action-icon module-action-icon--edit" /> Edit Course</Link></Header>
    <section className="course-detail-summary"><div className="course-detail-summary__main"><span className="cm-eyebrow">B.Tech Course</span><h2>{course.name || 'Course'}</h2>{valueText(course.shortName) && <p className="course-detail-summary__short">{course.shortName}</p>}<strong className="course-detail-summary__code">Course Code: {course.code || '—'}</strong></div><div className="course-detail-summary__meta"><span>Department <b>{department?.name || course.department || '—'}</b></span><span>{course.type || 'Undergraduate'} {duration && ` · ${duration}`} {course.semesters && ` · ${course.semesters} Semesters`}</span><Badge value={course.status || 'Active'} /></div></section>
    <div className="course-detail-sections">
      <section className="cm-panel course-detail-section"><header><span>Course identity</span><h2>Basic Information</h2></header><div className="course-detail-rows">{detailRows([['Course Name', course.name], ['Course Code', course.code], ['Short Name', course.shortName], ['Course Type', course.type], ['College', course.college]])}</div></section>
      <section className="cm-panel course-detail-section"><header><span>Academic context</span><h2>Academic Information</h2></header><div className="course-detail-rows">{detailRows([['Department', department?.name || course.department], ['Department Code', department?.code || course.departmentCode], ['College', course.college], ['Branch', course.branch], ['Branch Code', course.branchCode], ['Duration', duration], ['Academic Pattern', pattern], ['Total Semesters', course.semesters]])}</div></section>
    </div>
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
    <section className="cm-panel cm-table-wrap"><table className="cm-table"><thead><tr><th>Year</th><th>Semester</th><th>Name</th><th>Status</th><th>Action</th></tr></thead><tbody>{pageRows.map(x => <tr key={x.structureId}><td>{x.yearNumber}</td><td>{x.semesterNumber}</td><td>{x.semesterName}</td><td>{Number(x.status) === 0 ? 'Deactive' : 'Active'}</td><td><button className="cm-button" onClick={() => edit(x)}><FiEdit2 className="module-action-icon module-action-icon--edit" /> Edit</button></td></tr>)}</tbody></table>{loading ? <div className="cm-empty">Loading structures…</div> : !visible.length ? <div className="cm-empty">No structure configured for Semester {semester}.</div> : <TablePagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />}</section>
  </Page>
}

export default function Course({ mode = 'list' }) { return mode === 'form' ? <CourseForm /> : mode === 'details' ? <CourseDetails /> : <CourseList /> }
