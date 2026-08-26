import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiArrowLeft, FiCheckCircle, FiEdit2, FiEye, FiFilter, FiPlus, FiSearch } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import {
  createCourseSemesterMapping,
  getCourseSemesterMappingById,
  getCourseSemesterMappings,
  updateCourseSemesterMapping,
  updateCourseSemesterMappingStatus,
} from '../../auth/collegeApi'
import './Course.css'

// These helpers are retained for the Branch and Department screens, which still own
// their independent local data. The Course / Programme screen below uses the API only.
const COURSE_KEY = 'btech-courses', DEPARTMENT_KEY = 'btech-departments', BRANCH_KEY = 'btech-branches', STRUCTURE_KEY = 'btech-course-structures'
export const academicYears = ['2025-26', '2026-27', '2027-28']
const read = (key, fallback = []) => { try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return Array.isArray(value) ? value : fallback } catch { return fallback } }
export const getDepartments = () => read(DEPARTMENT_KEY)
export const getCourses = () => read(COURSE_KEY)
export const getBranches = () => read(BRANCH_KEY)
export const getStructures = () => { try { return JSON.parse(localStorage.getItem(STRUCTURE_KEY) || '{}') } catch { return {} } }
export const saveCourse = (value) => { const rows = getCourses(); const row = { ...value, id: value.id || crypto.randomUUID() }; localStorage.setItem(COURSE_KEY, JSON.stringify(value.id ? rows.map((item) => item.id === value.id ? row : item) : [...rows, row])); return row }
export const saveBranch = (value) => { const rows = getBranches(); const row = { ...value, id: value.id || crypto.randomUUID() }; localStorage.setItem(BRANCH_KEY, JSON.stringify(value.id ? rows.map((item) => item.id === value.id ? row : item) : [...rows, row])); return row }
export const saveStructures = (value) => localStorage.setItem(STRUCTURE_KEY, JSON.stringify(value))

const blank = { courseId: '', semesterId: '', actorUserId: '', status: 'Active' }
const apiError = (error, fallback) => error?.response?.status === 401 ? 'Your session has expired. Please sign in again.' : error?.response?.status === 403 ? "You don't have permission to manage course mappings." : error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback
const listFrom = (response) => { const data = response?.data ?? response; return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : data && typeof data === 'object' ? [data] : [] }
const recordFrom = (response) => response?.data?.data ?? response?.data ?? response
const normalizeStatus = (value) => value === true || Number(value) === 1 || String(value).toLowerCase() === 'active' ? 'Active' : 'Inactive'
const mapMapping = (record) => {
  const course = record.course ?? record.courseDto ?? {}
  const semester = record.semester ?? record.semesterDto ?? {}
  return {
    id: record.id ?? record.courseSemesterMappingId,
    courseId: record.courseId ?? course.id ?? '',
    courseName: record.courseName ?? course.name ?? course.courseName ?? `Course #${record.courseId ?? course.id ?? '—'}`,
    courseCode: record.courseCode ?? course.code ?? '',
    semesterId: record.semesterId ?? semester.id ?? '',
    semesterName: record.semesterName ?? semester.name ?? semester.semesterName ?? `Semester #${record.semesterId ?? semester.id ?? '—'}`,
    departmentId: record.departmentId ?? course.departmentId ?? '',
    departmentName: record.departmentName ?? course.departmentName ?? course.department?.name ?? '',
    branchId: record.branchId ?? course.branchId ?? '',
    status: normalizeStatus(record.status ?? record.isActive ?? 1),
    createdAt: record.createdAt ?? record.createdDate ?? '',
  }
}
const createPayload = (value) => ({ courseId: Number(value.courseId), semesterId: Number(value.semesterId), createdBy: value.actorUserId === '' ? null : Number(value.actorUserId) })
const updatePayload = (value) => ({ courseId: Number(value.courseId), semesterId: Number(value.semesterId), updatedBy: value.actorUserId === '' ? null : Number(value.actorUserId) })
const Page = ({ children }) => <DashboardLayout><main className="cm-page course-management">{children}</main></DashboardLayout>
const Header = ({ title, text, children }) => <header className="cm-header"><div><span className="cm-eyebrow">Academic Management</span><h1>{title}</h1><p>{text}</p></div><div className="cm-row-actions">{children}</div></header>
const Badge = ({ value }) => <span className={`course-badge ${String(value).toLowerCase()}`}><i />{value}</span>

function CourseList() {
  const [mappings, setMappings] = useState([])
  const [filters, setFilters] = useState({ query: '', status: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const loadMappings = async () => {
    setIsLoading(true); setError('')
    try { const response = await getCourseSemesterMappings(); setMappings(listFrom(response.data).map(mapMapping)) }
    catch (requestError) { setMappings([]); setError(apiError(requestError, 'Unable to load course mappings. Please try again.')) }
    finally { setIsLoading(false) }
  }
  useEffect(() => { loadMappings() }, [])
  const rows = useMemo(() => mappings.filter((item) => `${item.courseName} ${item.courseCode} ${item.semesterName} ${item.departmentName}`.toLowerCase().includes(filters.query.trim().toLowerCase()) && (!filters.status || item.status === filters.status)), [mappings, filters])
  const stats = { total: mappings.length, active: mappings.filter((item) => item.status === 'Active').length, branches: new Set(mappings.map((item) => item.branchId).filter(Boolean)).size, departments: new Set(mappings.map((item) => item.departmentId).filter(Boolean)).size }
  const hasFilters = Boolean(filters.query || filters.status)
  const toggle = async (item) => {
    const nextStatus = item.status === 'Active' ? 'Inactive' : 'Active'; setError('')
    try { const response = await updateCourseSemesterMappingStatus(item.id, nextStatus === 'Active' ? 1 : 0); const result = recordFrom(response); const updated = result?.id || result?.courseSemesterMappingId ? mapMapping(result) : { ...item, status: nextStatus }; setMappings((current) => current.map((entry) => entry.id === item.id ? updated : entry)) }
    catch (requestError) { setError(apiError(requestError, 'Unable to update course mapping status. Please try again.')) }
  }
  return <Page><Header title="Course / Programme Management" text="Manage course and semester mappings."><Link className="cm-button" to="/courses/add"><FiPlus /> Add Course Mapping</Link></Header>
    <section className="course-summary">{[['Total Courses', stats.total], ['Active Courses', stats.active], ['Associated Branches', stats.branches], ['Departments', stats.departments]].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>
    <section className="cm-panel course-toolbar"><label className="course-search"><FiSearch /><input aria-label="Search course mappings" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Search course, semester or department" /></label><select aria-label="Status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All Status</option><option>Active</option><option>Inactive</option></select>{hasFilters && <button className="course-clear" onClick={() => setFilters({ query: '', status: '' })}><FiFilter /> Clear Filters</button>}</section>
    <section className="cm-panel course-directory">{isLoading ? <div className="course-empty"><strong>Loading course mappings...</strong></div> : error ? <div className="course-empty"><strong role="alert">{error}</strong><button className="cm-button" onClick={loadMappings}>Retry</button></div> : !mappings.length ? <div className="course-empty"><strong>No course mappings have been added yet.</strong><Link className="cm-button" to="/courses/add">+ Add Course Mapping</Link></div> : rows.length ? <><div className="course-results">Showing <strong>{rows.length}</strong> of <strong>{mappings.length}</strong> course mappings</div><div className="course-table-scroll"><table className="course-advanced-table"><thead><tr>{['Course', 'Semester', 'Department', 'Status', 'Last Updated', 'Actions'].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td><strong>{item.courseName}</strong><small>{item.courseCode || `Course ID: ${item.courseId}`}</small></td><td>{item.semesterName}</td><td>{item.departmentName || 'Not available'}</td><td><Badge value={item.status} /></td><td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Not available'}</td><td><div className="course-actions"><Link aria-label={`View ${item.courseName}`} to={`/courses/${item.id}`}><FiEye /></Link><Link aria-label={`Edit ${item.courseName}`} to={`/courses/${item.id}/edit`}><FiEdit2 /></Link><button onClick={() => toggle(item)}>{item.status === 'Active' ? 'Deactivate' : 'Activate'}</button></div></td></tr>)}</tbody></table></div></> : <div className="course-empty"><strong>No course mappings match your filters.</strong><button className="cm-button" onClick={() => setFilters({ query: '', status: '' })}>Clear Filters</button></div>}</section>
  </Page>
}

function CourseForm() {
  const { id } = useParams()
  const [value, setValue] = useState(blank)
  const [isLoading, setIsLoading] = useState(Boolean(id))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (!id) return; (async () => { setIsLoading(true); try { const response = await getCourseSemesterMappingById(id); const item = mapMapping(recordFrom(response)); setValue({ courseId: String(item.courseId), semesterId: String(item.semesterId), actorUserId: '', status: item.status }) } catch (requestError) { setError(apiError(requestError, 'Unable to load course mapping details. Please try again.')) } finally { setIsLoading(false) } })() }, [id])
  const submit = async (event) => {
    event.preventDefault()
    if (!Number.isInteger(Number(value.courseId)) || Number(value.courseId) < 1 || !Number.isInteger(Number(value.semesterId)) || Number(value.semesterId) < 1) return setError('Course ID and semester ID must be valid numbers.')
    if (value.actorUserId !== '' && (!Number.isInteger(Number(value.actorUserId)) || Number(value.actorUserId) < 1)) return setError('User ID must be a valid number.')
    setIsSaving(true); setError('')
    try { const response = id ? await updateCourseSemesterMapping(id, updatePayload(value)) : await createCourseSemesterMapping(createPayload(value)); const result = recordFrom(response); const mappingId = result?.id ?? result?.courseSemesterMappingId ?? id; if (value.status === 'Inactive' && mappingId) await updateCourseSemesterMappingStatus(mappingId, 0); window.location.assign('/courses') }
    catch (requestError) { setError(apiError(requestError, `Unable to ${id ? 'update' : 'create'} this course mapping. Please try again.`)) }
    finally { setIsSaving(false) }
  }
  return <Page><Header title={id ? 'Edit Course Mapping' : 'Add Course Mapping'} text="Map a course to a semester."><Link className="cm-button secondary" to="/courses"><FiArrowLeft /> Cancel</Link></Header><div className="course-form-layout"><section className="cm-panel course-form">{isLoading ? <div className="course-empty"><strong>Loading course mapping...</strong></div> : <form onSubmit={submit}><section><h2>Course & Semester Mapping</h2><div className="cm-form-grid"><label className="cm-field"><span>Course ID *</span><input type="number" min="1" value={value.courseId} onChange={(event) => setValue({ ...value, courseId: event.target.value })} required /></label><label className="cm-field"><span>Semester ID *</span><input type="number" min="1" value={value.semesterId} onChange={(event) => setValue({ ...value, semesterId: event.target.value })} required /></label><label className="cm-field"><span>{id ? 'Updated By User ID' : 'Created By User ID'}</span><input type="number" min="1" value={value.actorUserId} onChange={(event) => setValue({ ...value, actorUserId: event.target.value })} placeholder="Optional" /></label><label className="cm-field"><span>Status</span><select value={value.status} onChange={(event) => setValue({ ...value, status: event.target.value })}><option>Active</option><option>Inactive</option></select></label></div></section>{error && <p className="cm-error" role="alert">{error}</p>}<footer><span /><button className="cm-button" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : id ? 'Save Changes' : 'Create Course Mapping'}</button></footer></form>}</section></div></Page>
}

function CourseDetails() {
  const { id } = useParams(); const [item, setItem] = useState(null); const [isLoading, setIsLoading] = useState(true); const [error, setError] = useState('')
  const load = async () => { setIsLoading(true); setError(''); try { const response = await getCourseSemesterMappingById(id); setItem(mapMapping(recordFrom(response))) } catch (requestError) { setError(apiError(requestError, 'Unable to load course mapping details. Please try again.')) } finally { setIsLoading(false) } }
  useEffect(() => { load() }, [id])
  return <Page><Header title="Course Mapping Details" text="Course and semester mapping information."><Link className="cm-button secondary" to="/courses"><FiArrowLeft /> Back</Link>{item && <Link className="cm-button" to={`/courses/${id}/edit`}><FiEdit2 /> Edit</Link>}</Header>{isLoading ? <div className="course-empty"><strong>Loading course mapping...</strong></div> : error ? <div className="course-empty"><strong role="alert">{error}</strong><button className="cm-button" onClick={load}>Retry</button></div> : <><section className="course-detail-hero"><div><span className="cm-eyebrow">Course / Programme Mapping</span><h2>{item.courseName}</h2><Badge value={item.status} /></div><strong>{item.courseCode || `#${item.courseId}`}</strong></section><section className="cm-panel course-detail-grid">{[['Course ID', item.courseId], ['Semester', item.semesterName], ['Semester ID', item.semesterId], ['Department', item.departmentName || 'Not available'], ['Status', item.status]].map(([label, value]) => <div className="cm-detail" key={label}><span>{label}</span><strong>{value}</strong></div>)}</section></>}</Page>
}

export function CourseStructure() { return <Page><div className="course-empty"><strong>Course structure is not available from the course-semester mapping API.</strong></div></Page> }
export default function Course({ mode = 'list' }) { return mode === 'form' ? <CourseForm /> : mode === 'details' ? <CourseDetails /> : <CourseList /> }
