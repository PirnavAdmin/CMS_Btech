import { useEffect, useMemo, useState } from 'react'
import { FiBookOpen, FiCheckCircle, FiEdit2, FiEye, FiGitBranch, FiLayers, FiPlus, FiSearch, FiX } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import FilterPanel from '../../components/FilterPanel'
import { academicYearApi, branchApi, courseApi } from '../../api/apiEndpoints'
import { createSemester, getSemesterById, getSemesterSummary, getSemesters, searchSemesters, updateSemester } from '../../auth/collegeApi'
import './SemesterManagement.css'

const blank = { id: null, courseId: '', branchId: '', academicYearId: '', coursePeriod: '', yearNumber: 1, semesterNumber: 1, semesterName: 'Semester 1', startDate: '', endDate: '', status: 'Active' }
const list = (value) => Array.isArray(value) ? value : []
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
const yearFromSemester = (semesterNumber) => Math.ceil(Number(semesterNumber) / 2)
const coursePeriodStart = (value) => {
  const match = String(value || '').trim().match(/^(\d{4})\s*[-/]\s*(\d{4})$/)
  if (!match || Number(match[2]) !== Number(match[1]) + 4) return null
  return Number(match[1])
}
const academicYearFor = (years, startYear) => years.find((item) => {
  const label = String(item.academicYearName ?? item.name ?? item.academicYear ?? item.code ?? '')
  const match = label.match(/(\d{4})\D+(\d{2,4})/)
  if (!match) return false
  const endYear = match[2].length === 2 ? Math.floor(startYear / 100) * 100 + Number(match[2]) : Number(match[2])
  return Number(match[1]) === startYear && endYear === startYear + 1
})
const isBTechCourse = (item) => /b\.?tech|bachelor\s+of\s+technology/i.test(`${item.courseCode ?? item.code ?? ''} ${item.courseName ?? item.name ?? ''} ${item.shortName ?? ''}`)
const mapSemester = (item) => {
  const semesterNumber = item.semesterNumber ?? 1
  const semesterName = item.semesterName?.trim()
  return { ...item, id: item.semesterId ?? item.structureId ?? item.id, courseId: item.courseId ?? item.course?.courseId ?? item.course?.id ?? '', courseName: item.courseName ?? item.course?.name ?? item.course?.courseName ?? '', branchId: item.branchId ?? item.branch?.branchId ?? item.branch?.id ?? '', branchName: item.branchName ?? item.branch?.name ?? item.branch?.branchName ?? '', academicYearId: item.academicYearId ?? item.academicYear?.academicYearId ?? item.academicYear?.id ?? item.yearId ?? '', academicYearName: item.academicYearName ?? item.academicYear?.academicYearName ?? item.academicYear?.name ?? item.yearName ?? '', yearNumber: yearFromSemester(semesterNumber), semesterNumber, semesterName: !semesterName || /^semester\s+\d+$/i.test(semesterName) ? `Semester ${semesterNumber}` : semesterName, startDate: item.startDate ?? '', endDate: item.endDate ?? '', status: Number(item.status) === 0 ? 'Inactive' : 'Active' }
}
const sourceId = (item) => item.courseId ?? item.id ?? item.courseCode
const courseName = (item) => item.courseName ?? item.name ?? item.shortName ?? item.code ?? `ID ${sourceId(item)}`
const branchName = (item) => item.branchName ?? item.name ?? item.shortName ?? item.code ?? `ID ${sourceId(item)}`
const yearName = (item) => item.academicYearName ?? item.name ?? item.academicYear ?? item.code ?? `ID ${sourceId(item)}`
const apiError = (error, fallback) => error?.response?.status === 401 ? 'Your session has expired. Please sign in again.' : error?.response?.status === 403 ? "You don't have permission to manage semesters." : error?.message || fallback

export default function SemesterManagement() {
  const [rows, setRows] = useState([]), [courses, setCourses] = useState([]), [branches, setBranches] = useState([]), [years, setYears] = useState([]), [summary, setSummary] = useState(null)
  const [query, setQuery] = useState(''), [filters, setFilters] = useState({ courseId: '', branchId: '', academicYearId: '', status: '' }), [page, setPage] = useState(1), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [form, setForm] = useState(blank), [open, setOpen] = useState(false), [selected, setSelected] = useState(null)
  const load = async () => { setLoading(true); setError(''); try { const [semesterResponse, courseRows, branchRows, yearRows, summaryResponse] = await Promise.all([query.trim() ? searchSemesters({ search: query.trim() }) : getSemesters(), courseApi.getAll(), branchApi.getAll(), academicYearApi.getAll(), getSemesterSummary()]); const structures = responseList(semesterResponse); const bTechCourses = courseRows.filter(isBTechCourse); const bTechCourseIds = new Set(bTechCourses.map((item) => String(sourceId(item)))); const courseLookup = new Map(bTechCourses.map((item) => [String(sourceId(item)), courseName(item)])); const branchById = new Map(branchRows.map((item) => [String(item.branchId ?? item.id), item])); const branchLookup = new Map(branchRows.map((item) => [String(item.branchId ?? item.id), branchName(item)])); const yearLookup = new Map(yearRows.map((item) => [String(item.academicYearId ?? item.id), yearName(item)])); const mapped = list(structures).map(mapSemester).map((item) => ({ ...item, courseId: item.courseId || branchById.get(String(item.branchId))?.courseId || '' })).filter((item) => !item.courseId || bTechCourseIds.has(String(item.courseId))).map((item) => ({ ...item, courseName: item.courseName || courseLookup.get(String(item.courseId)) || 'Not assigned', branchName: item.branchName || branchLookup.get(String(item.branchId)) || 'Not assigned', academicYearName: item.academicYearName || yearLookup.get(String(item.academicYearId)) || 'Not assigned' })); setRows(mapped); setSummary(summaryResponse?.data?.data ?? null); setCourses(bTechCourses); setBranches(branchRows); setYears(yearRows) } catch (requestError) { setRows([]); setError(apiError(requestError, 'Unable to load semester sources. Please try again.')) } finally { setLoading(false) } }
  useEffect(() => { load() }, [query])
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 2000); return () => clearTimeout(timer) }, [notice])
  const filtered = useMemo(() => rows.filter((item) => `${item.semesterName} ${item.courseName} ${item.branchName} ${item.academicYearName}`.toLowerCase().includes(query.trim().toLowerCase()) && (!filters.courseId || String(item.courseId) === filters.courseId) && (!filters.branchId || String(item.branchId) === filters.branchId) && (!filters.academicYearId || String(item.academicYearId) === filters.academicYearId) && (!filters.status || item.status === filters.status)).sort((left, right) => String(left.branchName).localeCompare(String(right.branchName), undefined, { sensitivity: 'base' }) || String(left.courseName).localeCompare(String(right.courseName), undefined, { sensitivity: 'base' }) || Number(left.semesterNumber) - Number(right.semesterNumber)), [rows, query, filters])
  const filterBranches = branches.filter((item) => !filters.courseId || String(item.courseId ?? item.course?.id) === filters.courseId)
  const changeFilter = (name, value) => { setFilters((current) => ({ ...current, [name]: value, ...(name === 'courseId' ? { branchId: '' } : {}) })); setPage(1) }
  const clearFilters = () => { setQuery(''); setFilters({ courseId: '', branchId: '', academicYearId: '', status: '' }); setPage(1) }
  const hasFilters = Boolean(query || Object.values(filters).some(Boolean))
  const pageSize = 8, pageCount = Math.max(1, Math.ceil(filtered.length / pageSize)), currentPage = Math.min(page, pageCount), visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const close = () => { if (!saving) { setOpen(false); setForm(blank); setError('') } }
  const update = ({ target: { name, value } }) => setForm((current) => ({
    ...current,
    [name]: value,
    ...(name === 'courseId' ? { branchId: '' } : {}),
    ...(name === 'semesterNumber' ? { semesterName: `Semester ${value}`, yearNumber: yearFromSemester(value) } : {}),
  }))
  const availableBranches = branches.filter((item) => String(item.courseId ?? item.course?.id) === String(form.courseId))
  const openDetails = async (item) => { setSelected(item); try { const response = await getSemesterById(item.id); const detail = response?.data?.data ?? response?.data; if (detail) setSelected(mapSemester({ ...item, ...detail })) } catch { /* keep the list record visible when detail lookup is unavailable */ } }
  const submit = async (event) => {
    event.preventDefault()
    if (!form.courseId || !form.branchId || (form.id ? !form.academicYearId : !form.coursePeriod)) return setError(form.id ? 'Course, Branch, and Academic Year are required.' : 'Course, Branch, and Course Period are required.')
    setSaving(true); setError('')
    try {
      if (form.id) {
        const semesterNumber = Number(form.semesterNumber)
        const duplicate = rows.some((item) => String(item.id) !== String(form.id) && String(item.branchId) === String(form.branchId) && String(item.academicYearId) === String(form.academicYearId) && Number(item.semesterNumber) === semesterNumber)
        if (duplicate) throw new Error(`Semester ${semesterNumber} already exists for this course, branch, and academic year.`)
        const payload = { courseId: Number(form.courseId), branchId: Number(form.branchId), academicYearId: Number(form.academicYearId), semesterName: `Semester ${semesterNumber}`, semesterNumber, yearNumber: yearFromSemester(semesterNumber), startDate: form.startDate || null, endDate: form.endDate || null, status: form.status === 'Inactive' ? 0 : 1, createdBy: 1 }
        await updateSemester(form.id, payload)
        setNotice('Semester updated successfully.')
      } else {
        const periodStart = coursePeriodStart(form.coursePeriod)
        if (!periodStart) throw new Error('Enter a valid 4-year course period, for example 2026-2030.')
        let periodYears = Array.from({ length: 4 }, (_, index) => academicYearFor(years, periodStart + index))
        for (let index = 0; index < periodYears.length; index += 1) {
          if (periodYears[index]) continue
          const startYear = periodStart + index
          periodYears[index] = await academicYearApi.create({ name: `${startYear}-${startYear + 1}`, startDate: `${startYear}-06-01`, endDate: `${startYear + 1}-05-31` })
        }
        if (periodYears.some((year) => !(year?.academicYearId ?? year?.id))) {
          const refreshedYears = await academicYearApi.getAll()
          periodYears = Array.from({ length: 4 }, (_, index) => academicYearFor(refreshedYears, periodStart + index))
        }
        if (periodYears.some((year) => !(year?.academicYearId ?? year?.id))) throw new Error('Unable to prepare the academic records for this course period.')
        const semesterResponse = await getSemesters()
        const yearIds = new Set(periodYears.map((year) => String(year.academicYearId ?? year.id)))
        const existingNumbers = new Set(responseList(semesterResponse).map(mapSemester).filter((item) => String(item.branchId) === String(form.branchId) && yearIds.has(String(item.academicYearId))).map((item) => Number(item.semesterNumber)))
        const missing = Array.from({ length: 8 }, (_, index) => index + 1).filter((number) => !existingNumbers.has(number))
        if (!missing.length) throw new Error('Semester structure already exists for this course, branch, and course period.')
        const results = await Promise.allSettled(missing.map((semesterNumber) => { const academicYear = periodYears[yearFromSemester(semesterNumber) - 1]; return createSemester({ courseId: Number(form.courseId), branchId: Number(form.branchId), academicYearId: Number(academicYear.academicYearId ?? academicYear.id), semesterName: `Semester ${semesterNumber}`, semesterNumber, yearNumber: yearFromSemester(semesterNumber), startDate: null, endDate: null, status: 1, createdBy: 1 }) }))
        const created = results.filter((result) => result.status === 'fulfilled').length
        const failed = results.length - created
        if (!created) throw results.find((result) => result.status === 'rejected')?.reason || new Error('Unable to generate semester structure.')
        setNotice(failed ? `${created} missing semesters created; ${failed} could not be created.` : `${created} semester${created === 1 ? '' : 's'} generated successfully.`)
      }
      setOpen(false); setForm(blank); await load()
    } catch (requestError) { setError(apiError(requestError, 'Unable to save the semester structure. Please try again.')) }
    finally { setSaving(false) }
  }
  return <DashboardLayout><main className="semester-management">{notice && <div className="semester-toast" role="status"><FiCheckCircle />{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss"><FiX /></button></div>}<header className="semester-page-header"><div><p className="semester-breadcrumb">Academic Configuration <span>/</span> Semesters</p><h1>Semester Management</h1><p>Manage semesters across courses, branches, and academic years.</p></div><button className="semester-primary" onClick={() => { setForm(blank); setError(''); setOpen(true) }}><FiPlus /> Configure Semesters</button></header><section className="semester-stats">{[['Total Semesters', rows.length, FiLayers], ['Active Semesters', rows.filter((item) => item.status === 'Active').length, FiCheckCircle], ['Courses Mapped', new Set(rows.map((item) => item.courseId)).size, FiBookOpen], ['Branches Mapped', new Set(rows.map((item) => item.branchId)).size, FiGitBranch]].map(([label, value, Icon]) => <article className="semester-stat-card" key={label}><span className="cm-kpi-icon"><Icon aria-hidden="true" /></span><div><span>{label}</span><strong>{value}</strong></div></article>)}</section><section className="semester-directory-card"><div className="semester-directory-heading"><i><FiLayers /></i><div><h2>Semester Directory</h2><p>{filtered.length} configured semesters</p></div></div><FilterPanel active={hasFilters} onClear={clearFilters}><div className="semester-filters"><label className="semester-search"><FiSearch /><input aria-label="Search semesters" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search semester, course or branch..." /></label><select aria-label="Filter by course" value={filters.courseId} onChange={(event) => changeFilter('courseId', event.target.value)}><option value="">Select Course</option>{courses.map((item) => <option key={sourceId(item)} value={sourceId(item)}>{courseName(item)}</option>)}</select><select aria-label="Filter by branch" value={filters.branchId} onChange={(event) => changeFilter('branchId', event.target.value)}><option value="">Select Branch</option>{filterBranches.map((item) => <option key={item.branchId ?? item.id} value={item.branchId ?? item.id}>{branchName(item)}</option>)}</select><select aria-label="Filter by academic year" value={filters.academicYearId} onChange={(event) => changeFilter('academicYearId', event.target.value)}><option value="">Select Year</option>{years.map((item) => <option key={item.academicYearId ?? item.id} value={item.academicYearId ?? item.id}>{yearName(item)}</option>)}</select><select aria-label="Filter by status" value={filters.status} onChange={(event) => changeFilter('status', event.target.value)}><option value="">Select Status</option><option value="Active">Active</option><option value="Inactive">Deactive</option></select>{hasFilters && <button type="button" className="semester-clear" onClick={clearFilters}>Clear Filters</button>}</div></FilterPanel>{loading ? <div className="semester-empty-state"><FiLayers /><h3>Loading semesters...</h3></div> : error ? <div className="semester-empty-state"><FiLayers /><h3 role="alert">{error}</h3><button className="semester-primary" onClick={load}>Retry</button></div> : !filtered.length ? <div className="semester-empty-state"><FiLayers /><h3>No semesters configured</h3><button className="semester-primary" onClick={() => { setForm(blank); setOpen(true) }}>Configure Semesters</button></div> : <><div className="semester-table-wrapper"><table className="semester-table"><thead><tr><th>Semester</th><th>Course</th><th>Branch</th><th>Academic Year</th><th>Year</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map((item, index) => <tr key={item.id} className={index > 0 && String(visible[index - 1].branchId) !== String(item.branchId) ? 'semester-branch-start' : ''}><td><strong>{item.semesterName}</strong></td><td>{item.courseName || 'Not assigned'}</td><td>{item.branchName || 'Not assigned'}</td><td>{item.academicYearName || 'Not assigned'}</td><td>Year {item.yearNumber}</td><td><span className={`semester-badge status ${item.status.toLowerCase()}`}>● {item.status}</span></td><td><div className="semester-row-actions"><button type="button" title="View semester" aria-label={`View ${item.semesterName}`} onClick={() => setSelected(item)}><FiEye /></button><button type="button" title="Edit semester" aria-label={`Edit ${item.semesterName}`} onClick={() => { setForm(item); setOpen(true) }}><FiEdit2 /></button></div></td></tr>)}</tbody></table></div><div className="semester-pagination"><p>Page {currentPage} of {pageCount}</p><div><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}>Previous</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((value) => <button type="button" className={value === currentPage ? 'active' : ''} onClick={() => setPage(value)} key={value}>{value}</button>)}<button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount}>Next</button></div></div></>}</section>{selected && <SemesterDetails item={selected} close={() => setSelected(null)} edit={() => { setForm(selected); setSelected(null); setOpen(true) }} />}{open && <div className="semester-overlay" onMouseDown={(event) => event.target === event.currentTarget && close()}><aside className="semester-form-panel" role="dialog" aria-modal="true"><header><div><p>Academic Configuration</p><h2>{form.id ? 'Edit Semester' : 'Semester Structure Configuration'}</h2><span>{form.id ? 'Review the derived semester details before saving.' : 'Configure the complete 8-semester B.Tech structure.'}</span></div><button type="button" onClick={close} aria-label="Close"><FiX /></button></header><form onSubmit={submit}><fieldset><legend>Semester Information</legend><div className="semester-form-grid two"><label className="semester-field"><span>Course <b>*</b></span><select name="courseId" value={form.courseId} onChange={update} disabled={Boolean(form.id)} required><option value="">Select course</option>{courses.map((item) => <option key={sourceId(item)} value={sourceId(item)}>{courseName(item)}</option>)}</select></label><label className="semester-field"><span>Branch <b>*</b></span><select name="branchId" value={form.branchId} onChange={update} disabled={!form.courseId || Boolean(form.id)} required><option value="">{form.courseId ? 'Select branch' : 'Select course first'}</option>{availableBranches.map((item) => <option key={item.branchId ?? item.id} value={item.branchId ?? item.id}>{branchName(item)}</option>)}</select></label>{form.id ? <label className="semester-field"><span>Academic Year</span><select name="academicYearId" value={form.academicYearId} disabled><option value={form.academicYearId}>{form.academicYearName || 'Assigned academic year'}</option></select></label> : <label className="semester-field"><span>Course Period <b>*</b></span><input name="coursePeriod" value={form.coursePeriod} onChange={update} placeholder="e.g. 2026-2030" inputMode="numeric" required /></label>}{form.id && <label className="semester-field"><span>Semester</span><input value={`Semester ${form.semesterNumber} · Year ${yearFromSemester(form.semesterNumber)}`} readOnly /></label>}</div>{!form.id && form.courseId && form.branchId && coursePeriodStart(form.coursePeriod) && <section className="semester-structure-preview"><h3>Semester Structure Preview</h3><div>{Array.from({ length: 8 }, (_, index) => { const number = index + 1; return <span key={number}><b>Year {yearFromSemester(number)}</b>Semester {number}</span> })}</div></section>}</fieldset>{error && <p className="semester-form-error" role="alert">{error}</p>}<footer><button type="button" onClick={close} disabled={saving}>Cancel</button><button type="submit" className="semester-primary" disabled={saving || (!form.id && (!form.courseId || !form.branchId || !coursePeriodStart(form.coursePeriod)))}>{saving ? 'Saving...' : form.id ? 'Save Changes' : 'Generate 8 Semesters'}</button></footer></form></aside></div>}</main></DashboardLayout>
}

function SemesterDetails({ item, close, edit }) {
  const fields = [
    ['Semester Number', item.semesterNumber],
    ['Course', item.courseName || 'Not assigned'],
    ['Branch', item.branchName || 'Not assigned'],
    ['Academic Year', item.academicYearName || 'Not assigned'],
    ['Year Number', `Year ${item.yearNumber}`],
  ]

  return <div className="semester-overlay" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="semester-details-panel" role="dialog" aria-modal="true" aria-labelledby="semester-details-title"><header><div><p>Semester Details</p><h2 id="semester-details-title">{item.semesterName}</h2><span>Complete semester configuration</span></div><button type="button" onClick={close} aria-label="Close semester details"><FiX /></button></header><div className="semester-details-grid">{fields.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || 'Not provided'}</strong></div>)}</div><footer><button type="button" className="semester-primary" onClick={edit}><FiEdit2 /> Edit Semester</button></footer></section></div>
}
