import ExportMenu, { PrintDetailsButton } from '../../components/ExportMenu'
import { branchColumns } from '../../utils/exportColumns'
import { cloneElement, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FiAlertCircle, FiArrowLeft, FiCheckCircle, FiEdit2, FiEye, FiFilter, FiGitBranch, FiLayers, FiPlus, FiSearch, FiTarget, FiToggleLeft, FiToggleRight, FiUsers } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import FilterPanel from '../../components/FilterPanel'
import SearchableSelect from '../../components/SearchableSelect'
import TablePagination, { PAGE_SIZE } from '../../components/TablePagination'
import CompactSummary from '../../components/CompactSummary'
import InfoCard from '../../components/InfoCard'
import StatusBadge from '../../components/StatusBadge'
import { academicYearApi, branchApi, courseApi } from '../../api/apiEndpoints'
import { branchTypeLabel } from '../../utils/semesterUtils'
import ViewDialog from '../../components/ViewDialog'
import './Branch.css'

const blank = {
  courseId: '',
  courseCode: '',
  branchName: '',
  branchCode: '',
  shortName: '',
  branchType: 'Core',
  specialization: '',
  intakeCapacity: '',
  status: 'Active',
  academicYearId: '',
  duration: '',
  academicPattern: '',
  totalSemesters: '',
  description: '',
}

const normalizeId = (value) => {
  if (value === null || value === undefined || value === '') return ''
  const normalized = String(value).trim()
  return normalized === 'null' || normalized === 'undefined' ? '' : normalized
}

const content = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  return String(value).trim()
}

const toLower = (value) => String(value ?? '').trim().toLowerCase()

const courseMap = (record = {}) => ({
  id: normalizeId(record.id ?? record.courseId),
  name: content(record.courseName ?? record.name ?? ''),
  code: content(record.courseCode ?? record.code ?? record.shortName ?? ''),
  shortName: content(record.courseShortName ?? record.shortName ?? record.courseCode ?? record.code ?? ''),
  type: content(record.courseType ?? record.type ?? ''),
  departmentId: normalizeId(record.departmentId ?? record.department?.departmentId ?? record.department?.id ?? ''),
  departmentName: content(record.departmentName ?? record.department?.departmentName ?? record.department?.name ?? ''),
  durationValue: normalizeId(record.durationYears ?? record.durationValue ?? record.duration ?? ''),
  academicPattern: content(record.academicSystem ?? record.academicPattern ?? record.pattern ?? ''),
  totalSemesters: normalizeId(record.totalSemesters ?? record.semesters ?? record.semesterCount ?? record.numberOfSemesters ?? ''),
  status: content(record.status ?? record.courseStatus ?? ''),
})

const academicYearMap = (record = {}) => {
  const rawStatus = record.status ?? record.academicYearStatus ?? record.state ?? ''
  const status = record.isActive === true || Number(rawStatus) === 1 || toLower(rawStatus) === 'active' ? 'Active' : content(rawStatus)
  return {
    id: normalizeId(record.academicYearId ?? record.id ?? record.yearId ?? ''),
    name: content(record.academicYearName ?? record.name ?? record.academicYear ?? ''),
    status,
  }
}

export const normalize = (input = {}) => {
  const b = input?.branch ?? input?.branchDetails ?? input?.item ?? input?.result ?? input?.record ?? input?.data ?? input
  return {
    id: normalizeId(b.branchId ?? b.id),
    courseId: normalizeId(b.courseId ?? b.course?.id ?? ''),
    courseName: content(b.courseName ?? b.course?.name ?? b.course?.courseName ?? ''),
    courseCode: content(b.courseCode ?? b.course?.code ?? b.courseShortName ?? b.course?.courseCode ?? ''),
    branchName: content(b.branchName ?? b.name ?? ''),
    branchCode: content(b.branchCode ?? b.code ?? ''),
    branchType: branchTypeLabel(b),
    specialization: content(b.specialization ?? ''),
    shortName: content(b.shortName ?? b.branchShortName ?? ''),
    duration: normalizeId(b.duration ?? b.durationYears ?? ''),
    academicPattern: content(b.academicPattern ?? b.academicSystem ?? b.pattern ?? ''),
    totalSemesters: normalizeId(b.totalSemesters ?? b.semesters ?? b.totalSemester ?? ''),
    intakeCapacity: normalizeId(b.intakeCapacity ?? b.intake ?? ''),
    status: Number(b.status) === 0 || toLower(b.status) === 'inactive' || b.isActive === false ? 'Inactive' : 'Active',
    startingAcademicYearId: normalizeId(b.startingAcademicYearId ?? b.academicYearId ?? b.yearId ?? ''),
    startingAcademicYearName: content(b.startingAcademicYearName ?? b.academicYearName ?? b.yearName ?? ''),
    departmentId: normalizeId(b.departmentId ?? b.department?.departmentId ?? b.department?.id ?? ''),
    departmentName: content(b.departmentName ?? b.department?.departmentName ?? b.department?.name ?? ''),
    description: content(b.description ?? ''),
  }
}

const normalizeBranch = (input = {}) => normalize(input)

const typeOf = branchTypeLabel

const Page = ({ children }) => <DashboardLayout><main className="cm-page branch-management">{children}</main></DashboardLayout>

const Header = ({ title, text, children }) => <header className="cm-header"><div><h1>{title}</h1><p>{text}</p></div><div className="cm-row-actions">{children}</div></header>

const Badge = ({ value }) => <span className={`branch-badge ${String(value || 'Active').toLowerCase()}`}><i />{value === 'Inactive' ? 'Deactive' : value || 'Active'}</span>

const Notice = ({ children }) => {
  if (!children) return null
  if (children?.kind === 'confirm') {
    return <div className="branch-confirm-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && children.cancel()}><section className="branch-confirm" role="alertdialog" aria-modal="true" aria-labelledby="branch-confirm-title" aria-describedby="branch-confirm-message"><div className="branch-confirm-icon"><FiAlertCircle /></div><h2 id="branch-confirm-title">{children.action} Branch?</h2><p id="branch-confirm-message">Are you sure you want to {children.action.toLowerCase()} <strong>{children.code}</strong>?</p><footer><button type="button" className="cm-button secondary" onClick={children.cancel}>Cancel</button><button type="button" className={`cm-button ${children.action === 'Deactivate' ? 'danger' : ''}`} onClick={children.confirm}>{children.action} Branch</button></footer></section></div>
  }

  const success = String(children).startsWith('Branch ')
  return <p className={success ? 'branch-api-success' : 'branch-api-error'} role={success ? 'status' : 'alert'}><FiAlertCircle />{children}</p>
}

const Field = ({ label, error, children, wide = false }) => {
  const required = label.trim().endsWith('*')
  const text = label.replace(/\s*\*$/, '')
  const numeric = children?.props?.type === 'number'
  return <label className={`cm-field ${wide ? 'wide' : ''}`}><span>{text}{required && <b className="required-mark"> *</b>}</span>{cloneElement(children, {
    placeholder: children.props.placeholder || children.props.defaultValue || '',
    ...(numeric ? { onKeyDown: (event) => { if (['-', '+', 'e', 'E', '.'].includes(event.key)) event.preventDefault() }, onPaste: (event) => { if (/\D/.test(event.clipboardData.getData('text'))) event.preventDefault() } } : {}),
  })}{error && <small className="cm-error">{error}</small>}</label>
}

function List() {
  const [params] = useSearchParams()
  const [courses, setCourses] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ query: '', courseId: params.get('course') || '', branchType: '', status: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [branchRows, courseRows] = await Promise.all([branchApi.getAll(), courseApi.getAll()])
      setBranches((branchRows || []).map(normalizeBranch))
      setCourses(await Promise.all((courseRows || []).map(courseMap).filter((course) => course.id && course.name).map(async (course) => course.durationValue && course.totalSemesters ? course : courseMap(await courseApi.getById(course.id)))))
      setError('')
    } catch (requestError) {
      setError(requestError?.message || 'Unable to load branch data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const courseById = useMemo(() => new Map(courses.map((course) => [String(course.id), course])), [courses])
  const rows = useMemo(() => {
    const needle = filters.query.trim().toLowerCase()
    return branches.filter((branch) => {
      const course = courseById.get(String(branch.courseId))
      const haystack = `${branch.branchName} ${branch.branchCode} ${course?.name || branch.courseName || ''}`.toLowerCase()
      return (!needle || haystack.includes(needle))
        && (!filters.courseId || String(branch.courseId) === String(filters.courseId))
        && (!filters.branchType || typeOf(branch) === filters.branchType)
        && (!filters.status || branch.status === filters.status)
    })
  }, [branches, courseById, filters])

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  useEffect(() => setPage(1), [filters])

  const stats = { total: branches.length, active: branches.filter((row) => row.status === 'Active').length, inactive: branches.filter((row) => row.status === 'Inactive').length }

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const clearFilters = () => setFilters({ query: '', courseId: '', branchType: '', status: '' })
  const hasFilters = Object.values(filters).some(Boolean)

  const onToggleStatus = (branch) => {
    const nextStatus = branch.status === 'Active' ? 'Inactive' : 'Active'
    setError({ kind: 'confirm', action: nextStatus === 'Active' ? 'Activate' : 'Deactivate', code: branch.branchCode || branch.branchName, cancel: () => setError(''), confirm: async () => {
      setError('')
      try {
        await branchApi.updateStatus(branch.id, nextStatus)
        setBranches((current) => current.map((row) => String(row.id) === String(branch.id) ? { ...row, status: nextStatus } : row))
        setError(`Branch ${nextStatus === 'Active' ? 'activated' : 'deactivated'} successfully.`)
      } catch (requestError) {
        setError(requestError?.message || 'Unable to update branch status.')
      }
    }})
  }

  return <Page>
    <Header title="B.Tech Branch Management" text="Manage branches using the selected course as the source of truth.">
      <CompactSummary label="Branch summary" items={[{ label: 'Total', value: stats.total }, { label: 'Active', value: stats.active, tone: 'active' }, { label: 'Inactive', value: stats.inactive, tone: 'inactive' }]} />
    </Header>
    <Notice>{error}</Notice>
    <section className="cm-panel branch-directory-card">
      <header className="branch-directory-heading"><div><span className="cm-eyebrow">Branch Directory</span><p>{rows.length} records</p></div><div className="directory-export-actions"><ExportMenu rows={rows.map(branch => ({ ...branch, courseName: courseById.get(String(branch.courseId))?.name || branch.courseName }))} columns={branchColumns} title="Branches" filename="branches" loading={loading || Boolean(error)} /><Link className="cm-button" to="/branches/add"><FiPlus /> Add Branch</Link></div></header>
    <FilterPanel active={hasFilters} onClear={clearFilters}>
      <section className="cm-panel branch-filter-toolbar">
        <label className="branch-search"><FiSearch /><input aria-label="Search branches" value={filters.query} onChange={(event) => setFilter('query', event.target.value)} placeholder="Search branch name, code or course" /></label>
        <SearchableSelect label="Course" value={filters.courseId} options={courses.map((course) => ({ id: course.id, name: course.name, code: course.code }))} onChange={(value) => setFilter('courseId', value)} placeholder="Select Course" searchPlaceholder="Search course..." noOptionsMessage="No courses found." />
        <select value={filters.branchType} onChange={(event) => setFilter('branchType', event.target.value)}><option value="">Type</option><option value="Core">Core</option><option value="Specialization">Specialization</option></select>
        <select value={filters.status} onChange={(event) => setFilter('status', event.target.value)}><option value="">Status</option><option value="Active">Active</option><option value="Inactive">Deactive</option></select>
        {hasFilters && <button className="branch-clear" onClick={clearFilters}><FiFilter /> Clear</button>}
      </section>
    </FilterPanel>

    {loading ? <div className="branch-empty">Loading branches…</div> : rows.length ? <>
      <div className="branch-results">Showing <strong>{rows.length}</strong> branches</div>
      <div className="branch-table-scroll">
        <table className="branch-table">
          <thead>
            <tr>
              <th style={{ minWidth: '220px' }}>Branch</th>
              <th className="table-center" style={{ width: '110px' }}>Code</th>
              <th style={{ minWidth: '160px', maxWidth: '220px' }}>Course</th>
              <th className="table-center" style={{ width: '130px' }}>Type</th>
              <th className="table-center" style={{ width: '110px' }}>Duration</th>
              <th className="table-center" style={{ width: '110px' }}>Semesters</th>
              <th className="table-center" style={{ width: '130px' }}>Approved Intake</th>
              <th className="table-center" style={{ width: '120px' }}>Status</th>
              <th className="table-center" style={{ width: '140px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((branch) => {
              const course = courseById.get(String(branch.courseId))
              const courseDisplayName = course?.name || branch.courseName || ''
              return (
                <tr key={branch.id}>
                  <td style={{ minWidth: '220px' }}>
                    <div className="table-primary-cell">
                      <strong title={branch.branchName}>{branch.branchName}</strong>
                      {branch.shortName && <small title={branch.shortName}>{branch.shortName}</small>}
                    </div>
                  </td>
                  <td className="table-center" style={{ width: '110px' }}>{branch.branchCode}</td>
                  <td style={{ minWidth: '160px', maxWidth: '220px' }}><span className="table-cell-truncate" title={courseDisplayName}>{courseDisplayName || '—'}</span></td>
                  <td className="table-center" style={{ width: '130px' }}>{typeOf(branch)}</td>
                  <td className="table-center" style={{ width: '110px' }}>{course?.durationValue ? `${course.durationValue} Years` : ''}</td>
                  <td className="table-center" style={{ width: '110px' }}>{course?.totalSemesters || ''}</td>
                  <td className="table-center" style={{ width: '130px' }}>{branch.intakeCapacity || ''}</td>
                  <td className="table-center" style={{ width: '120px' }}><StatusBadge value={branch.status} /></td>
                  <td className="table-center" style={{ width: '140px' }}>
                    <div className="branch-actions table-actions-group">
                      <Link className="table-action-btn action-view" aria-label={`View ${branch.branchName}`} title={`View ${branch.branchName}`} to={`/branches/${branch.id}`}><FiEye /></Link>
                      <Link className="table-action-btn action-edit" aria-label={`Edit ${branch.branchName}`} title={`Edit ${branch.branchName}`} to={`/branches/${branch.id}/edit`}><FiEdit2 /></Link>
                      <button type="button" title={branch.status === 'Active' ? `Deactivate ${branch.branchName}` : `Activate ${branch.branchName}`} aria-label={branch.status === 'Active' ? `Deactivate ${branch.branchName}` : `Activate ${branch.branchName}`} className={`table-action-btn ${branch.status === 'Active' ? 'action-deactivate' : 'action-activate'}`} onClick={() => onToggleStatus(branch)}>{branch.status === 'Active' ? <FiToggleRight /> : <FiToggleLeft />}</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
    </> : <div className="branch-empty">No branches match the current filters.</div> }
    </section>
  </Page>
}

const validateBranch = (value, branchId, existingRows, courses) => {
  const errors = {}
  const code = String(value.branchCode || '').trim().toUpperCase()
  const name = String(value.branchName || '').trim()

  if (!value.courseId) errors.courseId = 'Course is required.'
  if (!name) errors.branchName = 'Branch name is required.'
  if (!code) errors.branchCode = 'Branch code is required.'
  else if (!/^[A-Z0-9]+(?:[-/][A-Z0-9]+)*$/.test(code)) errors.branchCode = 'Use uppercase letters, numbers, hyphens, or slashes only.'
  else if (existingRows.some((row) => String(row.id) !== String(branchId) && String(row.branchCode || '').trim().toUpperCase() === code)) errors.branchCode = 'Branch code already exists.'

  if (value.branchType === 'Specialization' && !String(value.specialization || '').trim()) errors.specialization = 'Specialization is required.'
  if (!Number.isInteger(Number(value.intakeCapacity)) || Number(value.intakeCapacity) < 1) errors.intakeCapacity = 'Approved intake must be a positive whole number.'
  if (!value.status) errors.status = 'Status is required.'

  const chosenCourse = courses.find((course) => String(course.id) === String(value.courseId))
  if (chosenCourse && String(chosenCourse.departmentId || '') && String(value.departmentId || '') && String(chosenCourse.departmentId) !== String(value.departmentId)) {
    errors.departmentId = 'The selected course department does not match the branch record.'
  }

  return errors
}

function Form() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [years, setYears] = useState([])
  const [branches, setBranches] = useState([])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [value, setValue] = useState(blank)
  const [step, setStep] = useState(0)
  const [courseStructureLoading, setCourseStructureLoading] = useState(false)
  const [mastersReady, setMastersReady] = useState(false)
  const hydratedRef = useRef(false)
  const courseDetailRequestsRef = useRef(new Set())

  useEffect(() => {
    let alive = true
    Promise.allSettled([courseApi.getAll(), academicYearApi.getAll(), branchApi.getAll()]).then(([courseResult, yearResult, branchResult]) => {
      if (!alive) return
      const courseRows = courseResult.status === 'fulfilled' ? (courseResult.value || []) : []
      const yearRows = yearResult.status === 'fulfilled' ? (yearResult.value || []) : []
      const branchRows = branchResult.status === 'fulfilled' ? (branchResult.value || []) : []
      const allCourses = courseRows.map(courseMap).filter((course) => course.id && course.name)
      const activeYears = (yearRows || []).map(academicYearMap).filter((year) => year.id && year.name && (!year.status || ['active', 'upcoming'].includes(toLower(year.status))))
      setCourses(allCourses)
      setYears(activeYears)
      setBranches((branchRows || []).map(normalizeBranch))
      setMastersReady(true)
      if (courseResult.status === 'rejected') setError(courseResult.reason?.message || 'Unable to load courses.')
      else if (yearResult.status === 'rejected') setError(yearResult.reason?.message || 'Unable to load academic years.')
      else setError('')
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!mastersReady || hydratedRef.current) return
    hydratedRef.current = true
    if (id) {
      branchApi.getById(id).then((record) => {
        const current = normalizeBranch(record)
        const selectedCourse = courses.find((course) => String(course.id) === String(current.courseId)) || courses[0]
        const selectedYear = years.find((year) => String(year.id) === String(current.startingAcademicYearId)) || years[0] || null
        setValue({
          ...blank,
          ...current,
          courseId: current.courseId || selectedCourse?.id || '',
          courseCode: current.courseCode || selectedCourse?.code || '',
          branchName: current.branchName || '',
          branchCode: current.branchCode || '',
          branchType: current.branchType || 'Core',
          specialization: current.specialization || '',
          academicYearId: current.startingAcademicYearId || selectedYear?.id || '',
          duration: selectedCourse?.durationValue || '',
          academicPattern: selectedCourse?.academicPattern || '',
          totalSemesters: selectedCourse?.totalSemesters || '',
          departmentId: current.departmentId || selectedCourse?.departmentId || '',
          status: current.status || 'Active',
        })
        if (selectedCourse && (!selectedCourse.durationValue || !selectedCourse.totalSemesters) && !courseDetailRequestsRef.current.has(selectedCourse.id)) {
          courseDetailRequestsRef.current.add(selectedCourse.id)
          courseApi.getById(selectedCourse.id).then((detail) => {
            const detailedCourse = courseMap(detail)
            setCourses((currentCourses) => currentCourses.map((course) => String(course.id) === String(selectedCourse.id) ? { ...course, ...detailedCourse } : course))
          }).catch(() => {})
        }
      }).catch((requestError) => setError(requestError?.message || 'Unable to load branch details.'))
      return
    }

    const courseId = params.get('course') || ''
    const selectedCourse = courses.find((course) => String(course.id) === String(courseId)) || null
    const selectedYear = years.length === 1 ? years[0] : null
    setValue({
      ...blank,
      courseId: selectedCourse?.id || '',
      courseCode: selectedCourse?.code || '',
      departmentId: selectedCourse?.departmentId || '',
      duration: selectedCourse?.durationValue || '',
      academicPattern: selectedCourse?.academicPattern || '',
      totalSemesters: selectedCourse?.totalSemesters || '',
      academicYearId: selectedYear?.id || '',
      status: 'Active',
    })
    if (selectedCourse && (!selectedCourse.durationValue || !selectedCourse.totalSemesters) && !courseDetailRequestsRef.current.has(selectedCourse.id)) {
      courseDetailRequestsRef.current.add(selectedCourse.id)
      courseApi.getById(selectedCourse.id).then((detail) => {
        const detailedCourse = courseMap(detail)
        setCourses((currentCourses) => currentCourses.map((course) => String(course.id) === String(selectedCourse.id) ? { ...course, ...detailedCourse } : course))
      }).catch(() => {})
    }
  }, [mastersReady, id, params])

  const update = (key, nextValue) => setValue((current) => {
    const next = { ...current, [key]: nextValue }
    if (key === 'courseId') {
      const selectedCourse = courses.find((course) => String(course.id) === String(nextValue)) || null
      next.courseCode = selectedCourse?.code || ''
      next.departmentId = selectedCourse?.departmentId || ''
      next.duration = selectedCourse?.durationValue || ''
      next.academicPattern = selectedCourse?.academicPattern || ''
      next.totalSemesters = selectedCourse?.totalSemesters || ''
    }
    if (key === 'branchType' && nextValue === 'Core') next.specialization = ''
    if (key === 'branchCode') next.branchCode = String(nextValue || '').toUpperCase().replace(/\s+/g, '')
    return next
  })

  const selectCourse = async (courseId) => {
    update('courseId', courseId)
    if (!courseId) return
    const selectedCourse = courses.find((course) => String(course.id) === String(courseId))
    if (selectedCourse?.durationValue && selectedCourse?.totalSemesters) return
    if (courseDetailRequestsRef.current.has(courseId)) return
    courseDetailRequestsRef.current.add(courseId)
    setCourseStructureLoading(true)
    try {
      const detailedCourse = courseMap(await courseApi.getById(courseId))
      setCourses((current) => current.map((course) => String(course.id) === String(courseId) ? { ...course, ...detailedCourse } : course))
    } catch (requestError) {
      setError(requestError?.message || 'Unable to load course structure.')
    } finally {
      setCourseStructureLoading(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    const selectedCourse = courses.find((course) => String(course.id) === String(value.courseId)) || null
    const academicYear = years.find((year) => String(year.id) === String(value.academicYearId)) || null
    const payload = {
      ...value,
      courseId: selectedCourse?.id || value.courseId,
      departmentId: selectedCourse?.departmentId || value.departmentId || '',
      courseName: selectedCourse?.name || value.courseName || '',
      courseCode: selectedCourse?.code || value.courseCode || '',
      branchName: String(value.branchName || '').trim(),
      branchCode: String(value.branchCode || '').trim().toUpperCase(),
      specialization: String(value.specialization || '').trim(),
      duration: selectedCourse?.durationValue || '',
      academicPattern: selectedCourse?.academicPattern || '',
      totalSemesters: selectedCourse?.totalSemesters || '',
      startingAcademicYearId: academicYear?.id || value.academicYearId || '',
      startingAcademicYearName: academicYear?.name || value.startingAcademicYearName || '',
      status: value.status === 'Inactive' ? 'Inactive' : 'Active',
    }

    const validationErrors = validateBranch(payload, id || '', branches, courses)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length) {
      setError(Object.values(validationErrors)[0])
      return
    }

    setSaving(true)
    setError('')
    try {
      const result = normalizeBranch(id ? await branchApi.update(id, payload) : await branchApi.create(payload))
      navigate(id ? `/branches/${result.id}` : '/branches')
    } catch (requestError) {
      setError(requestError?.message || 'Unable to save branch.')
    } finally {
      setSaving(false)
    }
  }

  const selectedCourse = courses.find((course) => String(course.id) === String(value.courseId)) || null

  const nextStep = () => {
    const selectedCourse = courses.find((course) => String(course.id) === String(value.courseId))
    if (!selectedCourse) {
      setErrors((current) => ({ ...current, courseId: 'Course is required.' }))
      setError('Course is required.')
      return
    }
    setStep(1)
  }

  return <Page>
    <Header title={id ? 'Edit B.Tech Branch' : 'Add B.Tech Branch'} text="Select a course and let the system resolve the structure details automatically.">
      <Link className="cm-button secondary" to="/branches"><FiArrowLeft /> Cancel</Link>
    </Header>
    <Notice>{error}</Notice>
    <form onSubmit={submit} className="branch-form-layout">
      <section className="cm-panel branch-form">
        <nav className="branch-steps"><button type="button" className={step === 0 ? 'active' : ''} onClick={() => setStep(0)}><b>1</b>Branch Details</button><button type="button" className={step === 1 ? 'active' : ''} onClick={nextStep}><b>2</b>Branch Configuration</button></nav>
        {step === 0 && <section className="branch-step-content">
          <div className="cm-form-grid"><Field label="Course Name *" error={errors.courseId}><SearchableSelect label="Course Name" value={value.courseId} options={courses.map((course) => ({ id: course.id, name: course.name, code: course.code }))} onChange={selectCourse} placeholder="Select Course" searchPlaceholder="Search course name or code..." noOptionsMessage="No courses found." error={Boolean(errors.courseId)} /></Field><Field label="Course Code"><input value={selectedCourse?.code || value.courseCode || ''} readOnly /></Field></div>
          {!value.courseId && <p className="branch-structure-empty">Select a course to load its academic structure.</p>}
          <div className="cm-form-grid"><Field label="Branch Name *" error={errors.branchName}><input value={value.branchName} onChange={(event) => update('branchName', event.target.value)} placeholder="Enter branch name" /></Field><Field label="Branch Code *" error={errors.branchCode}><input value={value.branchCode} onChange={(event) => update('branchCode', event.target.value)} placeholder="e.g. CSE" /></Field></div>
          <div className="cm-form-grid"><Field label="Branch Type *"><select value={value.branchType} onChange={(event) => update('branchType', event.target.value)}><option value="Core">Core</option><option value="Specialization">Specialization</option></select></Field>{value.branchType === 'Specialization' && <Field label="Specialization *" error={errors.specialization}><input value={value.specialization} onChange={(event) => update('specialization', event.target.value)} placeholder="e.g. Artificial Intelligence" /></Field>}<Field label="Short Name"><input value={value.shortName} onChange={(event) => update('shortName', event.target.value)} placeholder="Optional short name" /></Field></div>
          <div className="cm-form-grid"><Field label="Active Academic Year"><select value={value.academicYearId} onChange={(event) => update('academicYearId', event.target.value)}><option value="">Select active year</option>{years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></Field></div>
          <div className="branch-form-actions"><span aria-hidden="true" /><button type="button" className="cm-button" onClick={nextStep}>Next</button></div>
        </section>}
        {step === 1 && <section className="branch-step-content"><h2>Branch Configuration</h2><div className="branch-structure-summary"><h3>Course Structure</h3>{courseStructureLoading ? <p>Loading course structure...</p> : <><div><span>Duration</span><strong>{selectedCourse?.durationValue ? `${selectedCourse.durationValue} Years` : ''}</strong></div><div><span>Total Semesters</span><strong>{selectedCourse?.totalSemesters || ''}</strong></div></>}</div><div className="cm-form-grid"><Field label="Approved Intake *" error={errors.intakeCapacity}><input type="number" min="1" value={value.intakeCapacity} onChange={(event) => update('intakeCapacity', event.target.value)} placeholder="Enter approved intake" /></Field><Field label="Status *" error={errors.status}><select value={value.status} onChange={(event) => update('status', event.target.value)}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></Field></div><div className="branch-form-actions"><button type="button" className="cm-button secondary" onClick={() => setStep(0)}>Back</button><button type="submit" className="cm-button" disabled={saving || courseStructureLoading}>{saving ? 'Saving…' : id ? 'Update Branch' : 'Create Branch'}</button></div></section>}
      </section>
      <aside className="cm-panel course-preview branch-course-preview" aria-label="Branch preview"><span>Live Preview</span><div>
        <h2>{value.branchName.trim() || 'Branch Preview'}</h2>
        {[
          ['Basic Information', [
            ['Branch Name', value.branchName],
            ...(value.shortName.trim() ? [['Short Name', value.shortName]] : []),
            ...(value.branchCode.trim() ? [['Branch Code', value.branchCode]] : []),
            ...(value.branchType ? [['Branch Type', value.branchType]] : []),
            ...(selectedCourse?.name ? [['Course', selectedCourse.name]] : []),
            ...(selectedCourse?.code ? [['Course Code', selectedCourse.code]] : []),
          ]],
          ['Academic Structure', [
            ...(selectedCourse?.durationValue ? [['Duration', `${selectedCourse.durationValue} Years`]] : []),
            ...(selectedCourse?.totalSemesters ? [['Total Semesters', selectedCourse.totalSemesters]] : []),
          ]],
        ].filter(([, fields]) => fields.some(([, text]) => String(text || '').trim())).map(([title, fields]) => <section key={title}><h3>{title}</h3><dl>{fields.filter(([, text]) => String(text || '').trim()).map(([label, text]) => <div key={label}><dt>{label}</dt><dd>{String(text).trim()}</dd></div>)}</dl></section>)}
        {value.academicYearId && <section><h3>Academic Year</h3><dl><div><dt>Active Academic Year</dt><dd>{years.find((year) => String(year.id) === String(value.academicYearId))?.name || ''}</dd></div></dl></section>}
        {(value.intakeCapacity || value.status) && <section><h3>Branch Configuration</h3><dl>{value.intakeCapacity && <div><dt>Approved Intake</dt><dd>{value.intakeCapacity}</dd></div>}{value.status && <div><dt>Status</dt><dd>{value.status}</dd></div>}</dl></section>}
      </div></aside>
    </form>
  </Page>
}

function Details() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [branch, setBranch] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    let alive = true
    const load = async () => {
      const row = normalizeBranch(await branchApi.getById(id))
      const [courseRecord, years] = await Promise.all([row.courseId ? courseApi.getById(row.courseId) : null, academicYearApi.getAll()])
      const course = courseMap(courseRecord || {})
      const year = years.map(academicYearMap).find((item) => item.id === row.startingAcademicYearId)
      if (alive) setBranch({ ...row, courseName: course.name || row.courseName, courseCode: course.code || row.courseCode, duration: course.durationValue, academicPattern: course.academicPattern, totalSemesters: course.totalSemesters, startingAcademicYearName: year?.name || row.startingAcademicYearName })
    }
    load().catch((requestError) => { if (alive) setError(requestError?.message || 'Unable to load branch details.') })
    return () => { alive = false }
  }, [id])

  if (error) return <Page><Notice>{error}</Notice></Page>
  if (!branch) return <Page><div className="branch-empty">Loading branch details…</div></Page>

  const fields = [
    ['Course Name', branch.courseName],
    ['Course Code', branch.courseCode],
    ['Branch Name', branch.branchName],
    ['Branch Type', typeOf(branch)],
    ...(branch.specialization ? [['Specialization', branch.specialization]] : []),
    ['Branch Code', branch.branchCode],
    ['Duration', branch.duration ? `${branch.duration} Years` : ''],
    ['Academic Pattern', branch.academicPattern],
    ['Total Semesters', branch.totalSemesters],
    ['Approved Intake', branch.intakeCapacity],
    ['Academic Year', branch.startingAcademicYearName],
    ['Status', branch.status],
  ].filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')

  return (
    <Page>
      <div className="cm-profile-view">
        <div className="cm-profile-top-bar">
          <Link className="cm-button secondary" to="/branches">
            &larr; Back to Branches List
          </Link>
        </div>

        <div className="cm-profile-card">
          {/* Header Profile Banner */}
          <div className="cm-profile-banner">
            <div className="cm-profile-avatar-wrap">
              <div className="cm-profile-placeholder">
                <FiGitBranch />
              </div>
            </div>
            <div className="cm-profile-header-info">
              <div className="cm-profile-badges">
                <span className="cm-badge cm-badge-code">Code: {branch.branchCode || '—'}</span>
                <span className="cm-badge cm-badge-type">{typeOf(branch)}</span>
                <span className={`cm-status-badge ${String(branch.status || 'Active').toLowerCase()}`}>
                  {branch.status || 'Active'}
                </span>
              </div>
              <h1 className="cm-profile-title"><span style={{ color: '#fff' }}>{branch.branchName}</span></h1>
              <p className="cm-profile-subtitle">
                <span style={{ color: '#fff' }}>Course: </span>
                <strong style={{ color: '#fff' }}>{branch.courseName || branch.courseCode || '—'}</strong>
                {branch.specialization && <span style={{ color: '#fff' }}> · Specialization: {branch.specialization}</span>}
              </p>
            </div>
          </div>

          {/* Profile Information Cards Grid */}
          <div className="cm-profile-grid">
            <InfoCard
              title="Branch Information"
              icon={FiGitBranch}
              items={[
                { label: 'Course Name', value: branch.courseName },
                { label: 'Course Code', value: branch.courseCode },
                { label: 'Branch Name', value: branch.branchName },
                { label: 'Branch Code', value: branch.branchCode },
                { label: 'Branch Type', value: typeOf(branch) },
                { label: 'Specialization', value: branch.specialization },
                { label: 'Status', value: branch.status },
              ]}
            />
            <InfoCard
              title="Academic Structure"
              icon={FiLayers}
              items={[
                { label: 'Duration', value: branch.duration ? `${branch.duration} Years` : '' },
                { label: 'Academic Pattern', value: branch.academicPattern },
                { label: 'Total Semesters', value: branch.totalSemesters },
                { label: 'Approved Intake', value: branch.intakeCapacity },
                { label: 'Academic Year', value: branch.startingAcademicYearName },
              ]}
            />
          </div>
        </div>
      </div>
    </Page>
  );
}

export default function Branch({ mode }) {
  const { id } = useParams()
  if (mode === 'form') return <Form />
  if (mode === 'details' || id) return <Details />
  return <List />
}
