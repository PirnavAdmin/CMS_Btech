import SearchableSelectImports_default, { ProjectSelect as SearchableSelectImports_ProjectSelect } from '../../components/SearchableSelect'
import { newestFirst as newestFirstImports_newestFirst, rememberCreated as newestFirstImports_rememberCreated } from '../../utils/newestFirst'
import { showSuccess as toastImports_showSuccess } from '../../utils/toast'
import useToastStateImports_default from '../../hooks/useToastState'
import ExportMenuImports_default, { PrintDetailsButton as ExportMenuImports_PrintDetailsButton } from '../../components/ExportMenu'
import { branchColumns as exportColumnsImports_branchColumns, courseColumns as exportColumnsImports_courseColumns, structureColumns as exportColumnsImports_structureColumns } from '../../utils/exportColumns'
import { cloneElement as reactImports_cloneElement, useEffect as reactImports_useEffect, useMemo as reactImports_useMemo, useRef as reactImports_useRef, useState as reactImports_useState } from 'react'
import { Link as react_router_domImports_Link, useNavigate as react_router_domImports_useNavigate, useParams as react_router_domImports_useParams, useSearchParams as react_router_domImports_useSearchParams } from 'react-router-dom'
import { FiAlertCircle as fiImports_FiAlertCircle, FiArrowLeft as fiImports_FiArrowLeft, FiEdit2 as fiImports_FiEdit2, FiEye as fiImports_FiEye, FiFilter as fiImports_FiFilter, FiGitBranch as fiImports_FiGitBranch, FiLayers as fiImports_FiLayers, FiPlus as fiImports_FiPlus, FiSearch as fiImports_FiSearch, FiTarget as fiImports_FiTarget, FiToggleLeft as fiImports_FiToggleLeft, FiToggleRight as fiImports_FiToggleRight, FiUsers as fiImports_FiUsers, FiBookOpen as fiImports_FiBookOpen } from 'react-icons/fi'
import DashboardLayoutImports_default from '../../layouts/DashboardLayout'
import FilterPanelImports_default from '../../components/FilterPanel'
import TablePaginationImports_default, { PAGE_SIZE as TablePaginationImports_PAGE_SIZE } from '../../components/TablePagination'
import CompactSummaryImports_default from '../../components/CompactSummary'
import InfoCardImports_default from '../../components/InfoCard'
import StatusBadgeImports_default from '../../components/StatusBadge'
import StatusConfirmDialogImports_default from '../../components/StatusConfirmDialog'
import { academicYearApi as apiEndpointsImports_academicYearApi, branchApi as apiEndpointsImports_branchApi, courseApi as apiEndpointsImports_courseApi, studentApi as apiEndpointsImports_studentApi, courseStructureApi as apiEndpointsImports_courseStructureApi, departmentApi as apiEndpointsImports_departmentApi, sectionApi as apiEndpointsImports_sectionApi } from '../../api/apiEndpoints'
import { branchTypeLabel as semesterUtilsImports_branchTypeLabel } from '../../utils/semesterUtils'
import ViewDialogImports_default from '../../components/ViewDialog'
import { showDeactivationBlocked as DeactivationBlockedDialogImports_showDeactivationBlocked } from '../../components/DeactivationBlockedDialog'
import { useAcademic as AcademicContextImports_useAcademic } from '../../context/AcademicContext'
import academicServiceImports_default, { isRecordActive as academicServiceImports_isRecordActive } from '../../services/academicService'
import { getOperationalAcademicYearOptions as academicYearUtilsImports_getOperationalAcademicYearOptions } from '../../utils/academicYearUtils'
import DirectoryEmptyStateImports_default from '../../components/DirectoryEmptyState'
import { getCourseById as collegeApiImports_getCourseById, createCourse as collegeApiImports_createCourse, updateCourse as collegeApiImports_updateCourse, updateCourseStatus as collegeApiImports_updateCourseStatus, getSemesters as collegeApiImports_getSemesters, getCourseSemesterMappings as collegeApiImports_getCourseSemesterMappings, createCourseSemesterMapping as collegeApiImports_createCourseSemesterMapping, updateCourseSemesterMapping as collegeApiImports_updateCourseSemesterMapping, updateCourseSemesterMappingStatus as collegeApiImports_updateCourseSemesterMappingStatus } from '../../auth/collegeApi'
import facultyServiceImports_default from '../../services/facultyService'
import eventBusImports_default, { ERP_EVENTS as eventBusImports_ERP_EVENTS } from '../../services/eventBus'
import './Course.css'

// Branch screen and private helpers.
const BranchScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const newestFirst = newestFirstImports_newestFirst
const rememberCreated = newestFirstImports_rememberCreated
const showSuccess = toastImports_showSuccess
const useToastState = useToastStateImports_default
const PrintDetailsButton = ExportMenuImports_PrintDetailsButton
const ExportMenu = ExportMenuImports_default
const branchColumns = exportColumnsImports_branchColumns
const cloneElement = reactImports_cloneElement
const useEffect = reactImports_useEffect
const useMemo = reactImports_useMemo
const useRef = reactImports_useRef
const useState = reactImports_useState
const Link = react_router_domImports_Link
const useNavigate = react_router_domImports_useNavigate
const useParams = react_router_domImports_useParams
const useSearchParams = react_router_domImports_useSearchParams
const FiAlertCircle = fiImports_FiAlertCircle
const FiArrowLeft = fiImports_FiArrowLeft
const FiEdit2 = fiImports_FiEdit2
const FiEye = fiImports_FiEye
const FiFilter = fiImports_FiFilter
const FiGitBranch = fiImports_FiGitBranch
const FiLayers = fiImports_FiLayers
const FiPlus = fiImports_FiPlus
const FiSearch = fiImports_FiSearch
const FiTarget = fiImports_FiTarget
const FiToggleLeft = fiImports_FiToggleLeft
const FiToggleRight = fiImports_FiToggleRight
const FiUsers = fiImports_FiUsers
const DashboardLayout = DashboardLayoutImports_default
const FilterPanel = FilterPanelImports_default
const SearchableSelect = SearchableSelectImports_default
const PAGE_SIZE = TablePaginationImports_PAGE_SIZE
const TablePagination = TablePaginationImports_default
const CompactSummary = CompactSummaryImports_default
const InfoCard = InfoCardImports_default
const StatusBadge = StatusBadgeImports_default
const StatusConfirmDialog = StatusConfirmDialogImports_default
const academicYearApi = apiEndpointsImports_academicYearApi
const branchApi = apiEndpointsImports_branchApi
const courseApi = apiEndpointsImports_courseApi
const studentApi = apiEndpointsImports_studentApi
const branchTypeLabel = semesterUtilsImports_branchTypeLabel
const ViewDialog = ViewDialogImports_default
const showDeactivationBlocked = DeactivationBlockedDialogImports_showDeactivationBlocked
const useAcademic = AcademicContextImports_useAcademic
const isRecordActive = academicServiceImports_isRecordActive
const getOperationalAcademicYearOptions = academicYearUtilsImports_getOperationalAcademicYearOptions

const blank = {
  courseId: '',
  courseCode: '',
  branchName: '',
  branchCode: '',
  shortName: '',
  branchType: '',
  specialization: '',
  intakeCapacity: '',
  status: '',
  academicYearId: '',
  duration: '',
  academicPattern: '',
  totalSemesters: '',
  description: '',
  startDate: '',
  endDate: '',
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

const courseMap = (record = {}) => {
  const active = isRecordActive(record)
  return {
    id: normalizeId(record.id ?? record.courseId),
    name: content(record.courseName ?? record.name ?? ''),
    code: content(record.courseCode ?? record.code ?? record.shortName ?? ''),
    shortName: content(record.courseShortName ?? record.shortName ?? record.courseCode ?? record.code ?? ''),
    type: content(record.courseType ?? record.type ?? ''),
    collegeId: normalizeId(record.collegeId ?? record.college?.collegeId ?? record.college?.id ?? record.collegeNumericId ?? ''),
    departmentId: normalizeId(record.departmentId ?? record.department?.departmentId ?? record.department?.id ?? ''),
    departmentName: content(record.departmentName ?? record.department?.departmentName ?? record.department?.name ?? ''),
    durationValue: normalizeId(record.durationYears ?? record.durationValue ?? record.duration ?? ''),
    academicPattern: content(record.academicSystem ?? record.academicPattern ?? record.pattern ?? ''),
    totalSemesters: normalizeId(record.totalSemesters ?? record.semesters ?? record.semesterCount ?? record.numberOfSemesters ?? ''),
    status: active ? 'Active' : 'Inactive',
    isActive: active,
  }
}

const academicYearMap = (record = {}) => {
  const active = isRecordActive(record)
  return {
    id: normalizeId(record.academicYearId ?? record.id ?? record.yearId ?? ''),
    name: content(record.academicYearName ?? record.name ?? record.academicYear ?? ''),
    status: active ? 'Active' : 'Inactive',
  }
}

const BRANCH_DATES_KEY = 'branch_dates_cache'

const readCachedBranchDates = (id, code) => {
  try {
    const raw = localStorage.getItem(BRANCH_DATES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    const key = [id, code].filter(Boolean).map(String).find((candidate) => parsed[candidate])
    return key ? (parsed[key] || {}) : {}
  } catch {
    return {}
  }
}

const cacheBranchDates = (id, code, dates) => {
  if (!dates || (!dates.startDate && !dates.endDate)) return
  try {
    const raw = localStorage.getItem(BRANCH_DATES_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    const keys = [id, code].filter(Boolean).map(String)
    keys.forEach((k) => {
      parsed[k] = {
        startDate: dates.startDate || parsed[k]?.startDate || '',
        endDate: dates.endDate || parsed[k]?.endDate || '',
      }
    })
    localStorage.setItem(BRANCH_DATES_KEY, JSON.stringify(parsed))
  } catch {
    // Ignore storage errors
  }
}

const normalize = (input = {}) => {
  const b = input?.branch ?? input?.branchDetails ?? input?.item ?? input?.result ?? input?.record ?? input?.data ?? input
  const id = normalizeId(b.branchId ?? b.id)
  const branchCode = content(b.branchCode ?? b.code ?? '')
  const cachedDates = readCachedBranchDates(id, branchCode)
  const rawStartDate = b.startDate ?? b.StartDate ?? b.start_date ?? b.fromDate ?? cachedDates.startDate ?? ''
  const rawEndDate = b.endDate ?? b.EndDate ?? b.end_date ?? b.toDate ?? cachedDates.endDate ?? ''
  const startDate = rawStartDate ? String(rawStartDate).slice(0, 10) : ''
  const endDate = rawEndDate ? String(rawEndDate).slice(0, 10) : ''

  if (startDate || endDate) {
    cacheBranchDates(id, branchCode, { startDate, endDate })
  }

  return {
    id,
    collegeId: normalizeId(b.collegeId ?? b.collegeNumericId ?? b.college?.collegeId ?? b.college?.id ?? ''),
    courseId: normalizeId(b.courseId ?? b.course?.id ?? ''),
    courseName: content(b.courseName ?? b.course?.name ?? b.course?.courseName ?? ''),
    courseCode: content(b.courseCode ?? b.course?.code ?? b.courseShortName ?? b.course?.courseCode ?? ''),
    branchName: content(b.branchName ?? b.name ?? ''),
    branchCode,
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
    startDate,
    endDate,
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
  const { scopeRecords, selectedCollegeId, selectedAcademicYearId } = useAcademic()
  const [params] = useSearchParams()
  const [pendingStatus, setPendingStatus] = useState(null)
  const [allCourses, setCourses] = useState([])
  const courses = scopeRecords(allCourses)
  const [allBranches, setBranches] = useState([])
  const branches = scopeRecords(allBranches, { courses: allCourses })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useToastState('', 'error')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ query: '', courseId: params.get('course') || '', branchType: '', status: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [branchRows, courseRows] = await Promise.all([
        branchApi.getAll(),
        courseApi.getAll(),
      ])
      setBranches(newestFirst('branches', branchRows || []).map(normalizeBranch))
      const safeCourses = await Promise.all(
        (courseRows || [])
          .map(courseMap)
          .filter((course) => course.id && course.name)
          .map(async (course) => {
            if (course.durationValue && course.totalSemesters) return course
            try {
              const detail = await courseApi.getById(course.id)
              return detail ? { ...courseMap(detail), collegeId: courseMap(detail).collegeId || course.collegeId } : course
            } catch {
              return course
            }
          })
      )
      setCourses(safeCourses)
      setError('')
    } catch (requestError) {
      setError(requestError?.message || 'Unable to load branch data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const courseById = useMemo(() => new Map(courses.map((course) => [String(course.id), course])), [courses])

  const scopedBranches = branches

  const rows = useMemo(() => {
    const needle = filters.query.trim().toLowerCase()
    return scopedBranches.filter((branch) => {
      const course = courseById.get(String(branch.courseId))
      const haystack = `${branch.branchName} ${branch.branchCode} ${course?.name || branch.courseName || ''}`.toLowerCase()
      return (!needle || haystack.includes(needle))
        && (!filters.courseId || String(branch.courseId) === String(filters.courseId))
        && (!filters.branchType || typeOf(branch) === filters.branchType)
        && (!filters.status || branch.status === filters.status)
    })
  }, [scopedBranches, courseById, filters])

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  useEffect(() => setPage(1), [filters])

  const stats = { total: scopedBranches.length, active: scopedBranches.filter((row) => row.status === 'Active').length, inactive: scopedBranches.filter((row) => row.status === 'Inactive').length }

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const clearFilters = () => setFilters({ query: '', courseId: '', branchType: '', status: '' })
  const hasFilters = Object.values(filters).some(Boolean)

  const onToggleStatus = async (branch) => {
    const nextStatus = branch.status === 'Active' ? 'Inactive' : 'Active'
    let studentCount = 0
    if (nextStatus === 'Inactive') {
      try {
        const students = await studentApi.getAll({ BranchId: Number(branch.id) })
        studentCount = students.length
        if (studentCount > 0) {
          showDeactivationBlocked({
            message: `Cannot deactivate ${branch.branchName}. ${studentCount} enrolled student${studentCount === 1 ? '' : 's'} are associated with this branch.`,
            name: branch.branchName,
            entity: 'branch',
            studentCount,
          })
          return
        }
      } catch (requestError) {
        showDeactivationBlocked(requestError?.message || 'Unable to verify associated students. The branch was not deactivated.')
        return
      }
    }
    setPendingStatus({ branch, nextStatus, studentCount })
  }

  const confirmStatusChange = async () => {
    if (!pendingStatus) return
    const { branch, nextStatus, studentCount } = pendingStatus
    if (nextStatus === 'Inactive' && studentCount > 0) {
      setPendingStatus(null)
      showDeactivationBlocked({
        message: `Cannot deactivate ${branch.branchName}. ${studentCount} enrolled student${studentCount === 1 ? '' : 's'} are associated with this branch.`,
        name: branch.branchName,
        entity: 'branch',
        studentCount,
      })
      return
    }
    setPendingStatus(null)
    setError('')
    try {
      await branchApi.updateStatus(branch.id, nextStatus)
      setBranches((current) => current.map((row) => String(row.id) === String(branch.id) ? { ...row, status: nextStatus } : row))
      showSuccess(`Branch ${nextStatus === 'Active' ? 'activated' : 'deactivated'} successfully.`)
    } catch (requestError) {
      setError(requestError?.message || 'Unable to update branch status.')
    }
  }

  return <Page>
    <Header title="B.Tech Branch Management" text="Manage branches using the selected course as the source of truth.">
      <CompactSummary label="Branch summary" items={[{ label: 'Total', value: stats.total }, { label: 'Active', value: stats.active, tone: 'active' }, { label: 'Inactive', value: stats.inactive, tone: 'inactive' }]} />
    </Header>
    <Notice>{error}</Notice>
    {pendingStatus && <StatusConfirmDialog entity="Branch" name={`${pendingStatus.branch.branchName} (${pendingStatus.branch.branchCode})`} nextStatus={pendingStatus.nextStatus} onCancel={() => setPendingStatus(null)} onConfirm={confirmStatusChange} details={pendingStatus.nextStatus === 'Inactive' ? [['Associated Students', `${pendingStatus.studentCount} student${pendingStatus.studentCount === 1 ? '' : 's'}`]] : []} description={pendingStatus.nextStatus === 'Inactive' ? pendingStatus.studentCount > 0 ? 'Students are associated with this branch. Deactivation will be checked when you continue.' : 'No students are associated with this branch, so it can be deactivated.' : 'This branch will become active again.'} confirmLabel={pendingStatus.nextStatus === 'Inactive' ? 'Deactivate Branch' : 'Activate Branch'} />}
    <section className="cm-panel branch-directory-card">
      <header className="branch-directory-heading"><div><span className="cm-eyebrow">Branch Directory</span><p>{rows.length} records</p></div><div className="directory-export-actions"><ExportMenu rows={rows.map(branch => ({ ...branch, courseName: courseById.get(String(branch.courseId))?.name || branch.courseName }))} columns={branchColumns} title="Branches" filename="branches" loading={loading || Boolean(error)} /><Link className="cm-button" to="/branches/add"><FiPlus /> Add Branch</Link></div></header>
    <FilterPanel active={hasFilters} onClear={clearFilters}>
      <div className="branch-filter-toolbar">
        <label className="branch-search"><FiSearch /><input aria-label="Search branches" value={filters.query} onChange={(event) => setFilter('query', event.target.value)} placeholder="Search branch name, code or course" /></label>
        <SearchableSelect label="Course" value={filters.courseId} options={courses.filter(course => course.status === 'Active').map((course) => ({ id: course.id, name: course.name, code: course.code }))} onChange={(value) => setFilter('courseId', value)} placeholder="Select Course" searchPlaceholder="Search course..." noOptionsMessage="No courses found." />
        <ProjectSelect value={filters.branchType} onChange={(event) => setFilter('branchType', event.target.value)}><option value="">Type</option><option value="Core">Core</option><option value="Specialization">Specialization</option></ProjectSelect>
        <ProjectSelect value={filters.status} onChange={(event) => setFilter('status', event.target.value)}><option value="">Status</option><option value="Active">Active</option><option value="Inactive">Deactive</option></ProjectSelect>
      </div>
    </FilterPanel>

    {loading ? <div className="branch-empty">Loading branches...</div> : rows.length ? <>
      <div className="branch-results">Showing <strong>{rows.length}</strong> branches</div>
      <div className="branch-table-scroll">
        <table className="branch-table">
          <thead>
            <tr>
              <th className="table-center" style={{ minWidth: '220px' }}>Branch</th>
              <th className="table-center" style={{ width: '110px' }}>Code</th>
              <th className="table-center" style={{ minWidth: '160px', maxWidth: '220px' }}>Course</th>
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
                  <td className="table-center" style={{ minWidth: '220px' }}>
                    <div className="table-primary-cell">
                      <Link to={`/branches/${branch.id}`} className="branch-name-link table-cell-truncate" title={`Click to view details for ${branch.branchName}`}>
                        {branch.branchName}
                      </Link>
                      {branch.shortName && <small title={branch.shortName}>{branch.shortName}</small>}
                    </div>
                  </td>
                  <td className="table-center" style={{ width: '110px' }}>{branch.branchCode}</td>
                  <td className="table-center" style={{ minWidth: '160px', maxWidth: '220px' }}><span className="table-cell-truncate" title={courseDisplayName}>{courseDisplayName || '-'}</span></td>
                  <td className="table-center" style={{ width: '130px' }}>{typeOf(branch)}</td>
                  <td className="table-center" style={{ width: '110px' }}>{course?.durationValue ? `${course.durationValue} Years` : ''}</td>
                  <td className="table-center" style={{ width: '110px' }}>{course?.totalSemesters || ''}</td>
                  <td className="table-center" style={{ width: '130px' }}>{branch.intakeCapacity || ''}</td>
                  <td className="table-center" style={{ width: '120px' }}><StatusBadge value={branch.status} /></td>
                  <td className="table-center" style={{ width: '140px' }}>
                    <div className="branch-actions table-actions-group">
                      <Link className="table-action-btn action-edit" aria-label={`Edit ${branch.branchName}`} title={`Edit ${branch.branchName}`} to={`/branches/${branch.id}/edit`}><FiEdit2 /></Link>
                      <button type="button" title={branch.status === 'Active' ? `Deactivate ${branch.branchName}` : `Activate ${branch.branchName}`} aria-label={branch.status === 'Active' ? `Deactivate ${branch.branchName}` : `Activate ${branch.branchName}`} className={`table-action-btn ${branch.status === 'Active' ? 'action-activate erp-action-btn--success' : 'action-deactivate erp-action-btn--danger'}`} onClick={() => onToggleStatus(branch)}>{branch.status === 'Active' ? <FiToggleRight data-status="active" /> : <FiToggleLeft data-status="inactive" />}</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
    </> : !error && <div className="branch-empty">
      <strong>No branches found.</strong>
      <span>Add a branch to get started.</span>
      <Link className="cm-button" to="/branches/add">Add Branch</Link>
    </div> }
    </section>
  </Page>
}

const validateBranch = (value, branchId, existingRows) => {
  const errors = {}
  const code = String(value.branchCode || '').trim().toUpperCase()
  const name = String(value.branchName || '').trim()

  if (!value.courseId) errors.courseId = 'Course is required.'
  if (!name) errors.branchName = 'Branch name is required.'
  if (!code) errors.branchCode = 'Branch code is required.'
  else if (!/^[A-Z0-9]+(?:[-/][A-Z0-9]+)*$/.test(code)) errors.branchCode = 'Use uppercase letters, numbers, hyphens, or slashes only.'
  else if (existingRows.some((row) => String(row.id) !== String(branchId) && String(row.branchCode || '').trim().toUpperCase() === code)) errors.branchCode = 'Branch code already exists.'
  else if (existingRows.some((row) => String(row.id) !== String(branchId) && String(row.courseId) === String(value.courseId) && String(row.branchName || '').trim().toLowerCase() === name.toLowerCase())) errors.branchName = 'This branch name already exists for the selected course.'

  if (!value.branchType) errors.branchType = 'Branch type is required.'
  if (value.branchType === 'Specialization' && !String(value.specialization || '').trim()) errors.specialization = 'Specialization is required.'
  if (!Number.isInteger(Number(value.intakeCapacity)) || Number(value.intakeCapacity) < 1) errors.intakeCapacity = 'Approved intake must be a positive whole number.'
  if (!value.status) errors.status = 'Status is required.'


  return errors
}

function Form() {
  const { scopeRecords, selectedAcademicYearId } = useAcademic()
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [allCourses, setCourses] = useState([])
  const courses = scopeRecords(allCourses)
  const [years, setYears] = useState([])
  const [allBranches, setBranches] = useState([])
  const branches = scopeRecords(allBranches, { courses: allCourses })
  const [errors, setErrors] = useToastState({}, 'error')
  const [touched, setTouched] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useToastState('', 'error')
  const [value, setValue] = useState(() => ({ ...blank, academicYearId: selectedAcademicYearId || '' }))
  const [step, setStep] = useState(0)
  const [courseStructureLoading, setCourseStructureLoading] = useState(false)
  const [mastersReady, setMastersReady] = useState(false)
  const hydratedRef = useRef(false)
  const courseDetailRequestsRef = useRef(new Set())

  const markTouched = (key) => setTouched(prev => ({ ...prev, [key]: true }))
  const liveErrors = useMemo(() => validateBranch(value, id || '', branches), [value, id, branches])
  const getFieldError = (key) => (touched[key] || Boolean(String(value[key] || '').trim())) ? (liveErrors[key] || errors[key]) : errors[key]

  useEffect(() => {
    let alive = true
    Promise.allSettled([courseApi.getAll(), academicYearApi.getAll(), branchApi.getAll()]).then(([courseResult, yearResult, branchResult]) => {
      if (!alive) return
      const courseRows = courseResult.status === 'fulfilled' ? (courseResult.value || []) : []
      const yearRows = yearResult.status === 'fulfilled' ? (yearResult.value || []) : []
      const branchRows = branchResult.status === 'fulfilled' ? (branchResult.value || []) : []
      const allCourses = (courseRows || [])
        .map(courseMap)
        .filter((course) => course.id && course.name)
      const activeYears = getOperationalAcademicYearOptions(yearRows || []).map((year) => ({ ...year, status: 'Active' }))
      setCourses(allCourses)
      setYears(activeYears)
      setBranches(newestFirst('branches', branchRows || []).map(normalizeBranch))
      setMastersReady(true)
      if (courseResult.status === 'rejected') setError(courseResult.reason?.message || 'Unable to load courses.')
      else if (yearResult.status === 'rejected') setError(yearResult.reason?.message || 'Unable to load academic years.')
      else setError('')
    })
    return () => { alive = false }
  }, [setError])

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
    setValue({
      ...blank,
      courseId: selectedCourse?.id || '',
      courseCode: selectedCourse?.code || '',
      departmentId: selectedCourse?.departmentId || '',
      duration: selectedCourse?.durationValue || '',
      academicPattern: selectedCourse?.academicPattern || '',
      totalSemesters: selectedCourse?.totalSemesters || '',
      academicYearId: '',
      status: '',
    })
    if (selectedCourse && (!selectedCourse.durationValue || !selectedCourse.totalSemesters) && !courseDetailRequestsRef.current.has(selectedCourse.id)) {
      courseDetailRequestsRef.current.add(selectedCourse.id)
      courseApi.getById(selectedCourse.id).then((detail) => {
        const detailedCourse = courseMap(detail)
        setCourses((currentCourses) => currentCourses.map((course) => String(course.id) === String(selectedCourse.id) ? { ...course, ...detailedCourse } : course))
      }).catch(() => {})
    }
  }, [mastersReady, id, params, setError])

  const update = (key, nextValue) => {
    markTouched(key)
    setValue((current) => {
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
  }

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
    const effectiveYearId = value.academicYearId || selectedAcademicYearId || (years[0]?.id ? String(years[0].id) : '')
    const academicYear = years.find((year) => String(year.id) === String(effectiveYearId)) || null
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
      startingAcademicYearId: academicYear?.id || effectiveYearId || '',
      startingAcademicYearName: academicYear?.name || value.startingAcademicYearName || '',
      startDate: value.startDate ? value.startDate.slice(0, 10) : null,
      endDate: value.endDate ? value.endDate.slice(0, 10) : null,
      StartDate: value.startDate ? value.startDate.slice(0, 10) : null,
      EndDate: value.endDate ? value.endDate.slice(0, 10) : null,
      status: value.status,
    }

    const validationErrors = validateBranch(payload, id || '', branches)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length) {
      setError(Object.values(validationErrors)[0])
      return
    }

    setSaving(true)
    setError('')
    try {
      const result = await (id ? branchApi.update(id, payload) : branchApi.create(payload))
      cacheBranchDates(result?.branchId || result?.id || id, payload.branchCode, {
        startDate: value.startDate ? value.startDate.slice(0, 10) : '',
        endDate: value.endDate ? value.endDate.slice(0, 10) : '',
      })
      if (!id) rememberCreated('branches', result)
      eventBusImports_default.emit(eventBusImports_ERP_EVENTS.ACADEMIC_UPDATED, { branchId: result?.branchId ?? result?.id ?? id })
      showSuccess(`Branch ${id ? 'updated' : 'created'} successfully.`)
      navigate('/branches')
    } catch (requestError) {
      setError(requestError?.message || 'Unable to save branch.')
    } finally {
      setSaving(false)
    }
  }

  const selectedCourse = courses.find((course) => String(course.id) === String(value.courseId)) || null

  const nextStep = () => {
    const selectedCourse = courses.find((course) => String(course.id) === String(value.courseId))
    const nextErrors = {}
    if (!selectedCourse) {
      nextErrors.courseId = 'Course is required.'
    }
    if (!value.branchType) nextErrors.branchType = 'Branch type is required.'
    if (Object.keys(nextErrors).length) {
      setErrors((current) => ({ ...current, ...nextErrors }))
      setTouched((current) => ({ ...current, ...Object.fromEntries(Object.keys(nextErrors).map((key) => [key, true])) }))
      setError(Object.values(nextErrors)[0])
      return
    }
    setStep(1)
  }

  return <Page>
    <Header title={id ? 'Edit B.Tech Branch' : 'Add B.Tech Branch'} text="Select a course and let the system resolve the structure details automatically.">
      <Link className="cm-button secondary" to="/branches"><FiArrowLeft /> Back</Link>
    </Header>
    <Notice>{error}</Notice>
    <form onSubmit={submit} className="branch-form-layout">
      <section className="cm-panel branch-form">
        <nav className="branch-steps"><button type="button" className={step === 0 ? 'active' : ''} onClick={() => setStep(0)}><b>1</b>Branch Details</button><button type="button" className={step === 1 ? 'active' : ''} onClick={nextStep}><b>2</b>Branch Configuration</button></nav>
        {step === 0 && <section className="branch-step-content">
          <div className="cm-form-grid"><Field label="Course Name *" error={getFieldError('courseId')}><SearchableSelect label="Course Name" value={value.courseId} options={courses.filter(course => course.status === 'Active' || (id && String(course.id) === String(value.courseId))).map((course) => ({ id: course.id, name: course.name, code: course.code }))} onChange={selectCourse} placeholder="Select Course" searchPlaceholder="Search course name or code..." noOptionsMessage="No courses found." error={Boolean(errors.courseId)} /></Field><Field label="Course Code"><input value={selectedCourse?.code || value.courseCode || ''} readOnly /></Field></div>
          {!value.courseId && <p className="branch-structure-empty">Select a course to load its academic structure.</p>}
          <div className="cm-form-grid"><Field label="Branch Name *" error={getFieldError('branchName')}><input value={value.branchName} onChange={(event) => update('branchName', event.target.value)} placeholder="Enter branch name" /></Field><Field label="Branch Code *" error={getFieldError('branchCode')}><input value={value.branchCode} onChange={(event) => update('branchCode', event.target.value)} placeholder="e.g. CSE" /></Field></div>
          <div className="cm-form-grid"><Field label="Branch Type *" error={getFieldError('branchType')}><ProjectSelect value={value.branchType} onChange={(event) => update('branchType', event.target.value)}><option value="">Select Branch Type</option><option value="Core">Core</option><option value="Specialization">Specialization</option></ProjectSelect></Field>{value.branchType === 'Specialization' && <Field label="Specialization *" error={getFieldError('specialization')}><input value={value.specialization} onChange={(event) => update('specialization', event.target.value)} placeholder="e.g. Artificial Intelligence" /></Field>}<Field label="Short Name"><input value={value.shortName} onChange={(event) => update('shortName', event.target.value)} placeholder="Optional short name" /></Field></div>
          <div className="cm-form-grid"><Field label="Start Date"><input type="date" value={value.startDate || ''} onChange={(event) => update('startDate', event.target.value)} /></Field><Field label="End Date"><input type="date" value={value.endDate || ''} onChange={(event) => update('endDate', event.target.value)} /></Field></div>
          <div className="branch-form-actions"><span aria-hidden="true" /><button type="button" className="cm-button" onClick={nextStep}>Next</button></div>
        </section>}
        {step === 1 && <section className="branch-step-content"><h2>Branch Configuration</h2><div className="branch-structure-summary"><h3>Course Structure</h3>{courseStructureLoading ? <p>Loading course structure...</p> : <><div><span>Duration</span><strong>{selectedCourse?.durationValue ? `${selectedCourse.durationValue} Years` : ''}</strong></div><div><span>Total Semesters</span><strong>{selectedCourse?.totalSemesters || ''}</strong></div></>}</div><div className="cm-form-grid"><Field label="Approved Intake *" error={getFieldError('intakeCapacity')}><input type="number" min="1" value={value.intakeCapacity} onChange={(event) => update('intakeCapacity', event.target.value)} placeholder="Enter approved intake" /></Field><Field label="Status *" error={getFieldError('status')}><ProjectSelect value={value.status} onChange={(event) => update('status', event.target.value)}><option value="" disabled>Select Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option></ProjectSelect></Field></div><div className="branch-form-actions"><button type="button" className="cm-button secondary" onClick={() => setStep(0)}>Back</button><button type="submit" className="cm-button" disabled={saving || courseStructureLoading}>{saving ? 'Saving...' : id ? 'Update Branch' : 'Create Branch'}</button></div></section>}
      </section>
      <aside className="cm-panel course-preview branch-course-preview" aria-label="Branch preview">
        <header className="preview-top-bar">
          <span className="preview-live-tag">
            <span className="live-dot" /> LIVE PREVIEW
          </span>
          <span className="preview-sync-hint">Real-time sync</span>
        </header>
        <div className="preview-body-container">
          {(() => {
            const sections = [
              {
                title: 'Branch Details',
                fields: [
                  ['Branch Name', value.branchName],
                  ['Branch Code', value.branchCode],
                  ['Course', selectedCourse?.name],
                  ['Branch Type', value.branchType],
                  ['Specialization', value.specialization],
                  ['Short Name', value.shortName],
                  ['Pattern', selectedCourse?.academicPattern || 'Semester System'],
                  ['Approved Intake', value.intakeCapacity ? String(value.intakeCapacity) : ''],
                  ['Start Date', value.startDate],
                  ['End Date', value.endDate],
                  ['Status', value.status || 'Active'],
                ],
              },
            ].map((sec) => ({
              ...sec,
              fields: sec.fields.filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== '' && String(val).trim() !== '-'),
            })).filter((sec) => sec.fields.length > 0)

            if (sections.length === 0) {
              return (
                <div className="preview-empty-hint">
                  <span>Enter details in the form to preview here in real time.</span>
                </div>
              )
            }

            return (
              <>
                <div className="preview-hero">
                  <div className="preview-hero-badge">
                    {value.branchCode ? value.branchCode.slice(0, 4).toUpperCase() : 'BR'}
                  </div>
                  <div className="preview-hero-details">
                    <h3 className="preview-course-title">{value.branchName.trim() || 'Branch Preview'}</h3>
                    <p className="preview-course-meta">
                      {selectedCourse?.name || ''}
                      {value.branchType ? ` \u00B7 ${value.branchType}` : ''}
                    </p>
                  </div>
                </div>
                {sections.map((sec) => (
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
                ))}
              </>
            )
          })()}
        </div>
      </aside>
    </form>
  </Page>
}

function Details() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [branch, setBranch] = useState(null)
  const [error, setError] = useToastState('', 'error')

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
  }, [id, setError])

  if (error) return <Page><Notice>{error}</Notice></Page>
  if (!branch) return <Page><div className="branch-empty">Loading branch details...</div></Page>

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
      <div className="cm-profile-view" data-export-record>
        <div className="cm-profile-top-bar">
          <ExportMenu mode="single" title="Branch Details" filename={`branch_${branch.branchCode || branch.id}`} />
          <Link className="cm-button secondary" to="/branches">
            &larr; Back 
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
                <span className="cm-badge cm-badge-code">Code: {branch.branchCode || '-'}</span>
                <span className="cm-badge cm-badge-type">{typeOf(branch)}</span>
                <span className={`cm-status-badge ${String(branch.status || 'Active').toLowerCase()}`}>
                  {branch.status || 'Active'}
                </span>
              </div>
              <h1 className="cm-profile-title">{branch.branchName}</h1>
              <p className="cm-profile-subtitle">
                <span>Course: </span>
                <strong>{branch.courseName || branch.courseCode || '-'}</strong>
                {branch.specialization && <span> Â| Specialization: {branch.specialization}</span>}
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
                { label: 'Start Date', value: branch.startDate },
                { label: 'End Date', value: branch.endDate },
              ]}
            />
          </div>
        </div>
      </div>
    </Page>
  );
}

function Branch({ mode }) {
  const { id } = useParams()
  if (mode === 'form') return <Form key={id || 'add'} />
  if (mode === 'details' || id) return <Details />
  return <List />
}

return { normalize, default: Branch }
})()

// Course screen and private helpers.
const CourseScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const DirectoryEmptyState = DirectoryEmptyStateImports_default
const newestFirst = newestFirstImports_newestFirst
const rememberCreated = newestFirstImports_rememberCreated
const showSuccess = toastImports_showSuccess
const useToastState = useToastStateImports_default
const PrintDetailsButton = ExportMenuImports_PrintDetailsButton
const ExportMenu = ExportMenuImports_default
const courseColumns = exportColumnsImports_courseColumns
const structureColumns = exportColumnsImports_structureColumns
const useEffect = reactImports_useEffect
const useMemo = reactImports_useMemo
const useRef = reactImports_useRef
const useState = reactImports_useState
const Link = react_router_domImports_Link
const useParams = react_router_domImports_useParams
const useNavigate = react_router_domImports_useNavigate
const FiArrowLeft = fiImports_FiArrowLeft
const FiBookOpen = fiImports_FiBookOpen
const FiEdit2 = fiImports_FiEdit2
const FiEye = fiImports_FiEye
const FiFilter = fiImports_FiFilter
const FiLayers = fiImports_FiLayers
const FiPlus = fiImports_FiPlus
const FiSearch = fiImports_FiSearch
const FiToggleLeft = fiImports_FiToggleLeft
const FiToggleRight = fiImports_FiToggleRight
const FiUsers = fiImports_FiUsers
const DashboardLayout = DashboardLayoutImports_default
const FilterPanel = FilterPanelImports_default
const SearchableSelect = SearchableSelectImports_default
const PAGE_SIZE = TablePaginationImports_PAGE_SIZE
const TablePagination = TablePaginationImports_default
const StatusConfirmDialog = StatusConfirmDialogImports_default
const StatusBadge = StatusBadgeImports_default
const CompactSummary = CompactSummaryImports_default
const InfoCard = InfoCardImports_default
const branchApi = apiEndpointsImports_branchApi
const courseApi = apiEndpointsImports_courseApi
const courseStructureApi = apiEndpointsImports_courseStructureApi
const departmentApi = apiEndpointsImports_departmentApi
const sectionApi = apiEndpointsImports_sectionApi
const studentApi = apiEndpointsImports_studentApi
const getCourseById = collegeApiImports_getCourseById
const createCourse = collegeApiImports_createCourse
const updateCourse = collegeApiImports_updateCourse
const updateCourseStatus = collegeApiImports_updateCourseStatus
const getSemesters = collegeApiImports_getSemesters
const getCourseSemesterMappings = collegeApiImports_getCourseSemesterMappings
const createCourseSemesterMapping = collegeApiImports_createCourseSemesterMapping
const updateCourseSemesterMapping = collegeApiImports_updateCourseSemesterMapping
const updateCourseSemesterMappingStatus = collegeApiImports_updateCourseSemesterMappingStatus
const useAcademic = AcademicContextImports_useAcademic
const { normalize } = BranchScreen
const showDeactivationBlocked = DeactivationBlockedDialogImports_showDeactivationBlocked
const facultyService = facultyServiceImports_default
const ERP_EVENTS = eventBusImports_ERP_EVENTS
const eventBus = eventBusImports_default
const isRecordActive = academicServiceImports_isRecordActive
const academicService = academicServiceImports_default

const blank = { name: '', code: '', shortName: '', type: '', durationValue: '', semesters: '', description: '', departmentId: '', departmentCode: '', branchId: '', branchCode: '', collegeId: '', status: '', startDate: '', endDate: '' }

const apiError = (error, fallback) => error?.response?.status === 401 ? 'Your session has expired. Please sign in again.' : error?.response?.status === 403 ? "You don't have permission to manage courses." : error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback
const listFrom = (response) => { const data = response?.data ?? response; return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : data && typeof data === 'object' ? [data] : [] }
const normalizeId = (value) => {
  if (value === null || value === undefined || value === '') return ''
  const normalized = String(value).trim()
  return normalized === 'null' || normalized === 'undefined' ? '' : normalized
}
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
    if (item.id == null || !name || item.status === 'Inactive') continue
    const key = String(item.id)
    if (!map.has(key)) map.set(key, { ...item, name })
  }
  return Array.from(map.values())
}

const COURSE_DATES_KEY = 'pirnav-course-dates-map'

const readCachedCourseDates = (id, code) => {
  try {
    const raw = localStorage.getItem(COURSE_DATES_KEY)
    const map = raw ? JSON.parse(raw) : {}
    const keyId = String(id || '').trim().toLowerCase()
    const keyCode = String(code || '').trim().toLowerCase()
    return map[keyId] || map[keyCode] || null
  } catch {
    return null
  }
}

const cacheCourseDates = (id, code, dates) => {
  try {
    const raw = localStorage.getItem(COURSE_DATES_KEY)
    const map = raw ? JSON.parse(raw) : {}
    const dateObj = {
      startDate: dates?.startDate ? String(dates.startDate).slice(0, 10) : '',
      endDate: dates?.endDate ? String(dates.endDate).slice(0, 10) : '',
    }
    const hasDates = Boolean(dateObj.startDate || dateObj.endDate)
    const keys = [String(id || '').trim().toLowerCase(), String(code || '').trim().toLowerCase()].filter(Boolean)
    keys.forEach((k) => {
      if (hasDates) map[k] = dateObj
      else delete map[k]
    })
    localStorage.setItem(COURSE_DATES_KEY, JSON.stringify(map))
  } catch {}
}

const mapCourse = (record) => {
  const status = record.status ?? record.courseStatus ?? (record.isActive === true ? 1 : record.isActive === false ? 0 : '')
  const active = status === true || Number(status) === 1 || String(status).toLowerCase() === 'active'
  const durationYears = Number(record.durationYears ?? record.durationValue ?? record.duration ?? 0)
  const academicPattern = String(record.academicSystem ?? record.academicPattern ?? '').trim().toLowerCase()
  const explicitSemesterCount = Number(record.totalSemesters ?? record.semesters ?? record.semesterCount ?? record.numberOfSemesters ?? 0)
  const derivedSemesterCount = academicPattern === 'semester' && durationYears > 0 ? durationYears * 2 : 0
  const semesterCount = explicitSemesterCount > 0 ? explicitSemesterCount : derivedSemesterCount
  const cachedDates = readCachedCourseDates(record.id ?? record.courseId, record.courseCode ?? record.code ?? record.name) || {}
  const startDate = String(record.startDate ?? record.StartDate ?? record.start_date ?? cachedDates.startDate ?? '').slice(0, 10)
  const endDate = String(record.endDate ?? record.EndDate ?? record.end_date ?? cachedDates.endDate ?? '').slice(0, 10)
  if (startDate || endDate) {
    cacheCourseDates(record.id ?? record.courseId, record.courseCode ?? record.code ?? record.name, { startDate, endDate })
  }

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
    semesters: semesterCount,
    academicSystem: record.academicSystem ?? record.academicPattern ?? '',
    eligibility: record.eligibility ?? '',
    description: record.description ?? '',
    startDate,
    endDate,
    status: status === '' ? '' : active ? 'Active' : 'Inactive',
  }
}

const payloadFor = (value) => ({
  collegeId: value.collegeId === '' ? 0 : Number(value.collegeId),
  courseCode: value.code.trim().toUpperCase(),
  courseName: value.name.trim(),
  courseShortName: value.shortName.trim(),
  durationYears: Number(value.durationValue),
  totalSemesters: Number(value.semesters),
  description: value.description || '',
  startDate: value.startDate ? value.startDate.slice(0, 10) : null,
  endDate: value.endDate ? value.endDate.slice(0, 10) : null,
  StartDate: value.startDate ? value.startDate.slice(0, 10) : null,
  EndDate: value.endDate ? value.endDate.slice(0, 10) : null,
  start_date: value.startDate ? value.startDate.slice(0, 10) : null,
  end_date: value.endDate ? value.endDate.slice(0, 10) : null,
})

const validateBasic = (v, courses = [], editingId = null) => {
  const e = {}, code = v.code.trim().toUpperCase(), name = v.name.trim()
  if (!name) e.name = 'Course name is required.'
  else if (name.length < 3 || name.length > 120) e.name = 'Use a course name between 3 and 120 characters.'
  if (!code) e.code = 'Course code is required.'
  else if (code.length < 2 || code.length > 20) e.code = 'Course code must be 2?20 characters.'
  else if (!/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*$/.test(code)) e.code = 'Start with a letter. Use letters, numbers and single hyphens only.'
  else if (courses.some(course => String(course.id) !== String(editingId) && String(course.code || '').trim().toUpperCase() === code)) e.code = 'This course code already exists. Enter a unique code.'
  else if (courses.some(course => String(course.id) !== String(editingId) && String(course.name || '').trim().toLowerCase() === name.toLowerCase())) e.name = 'This course name already exists. Enter a unique name.'
  if (!v.durationValue) e.durationValue = 'Duration is required.'
  if (String(v.durationValue) && Number(v.durationValue) !== 3 && Number(v.durationValue) !== 4) e.durationValue = 'Select a supported duration.'
  if (!v.status) e.status = 'Status is required.'
  return e
}

const coursesForCollege = (rows, collegeId, collegeName, departments = [], responseIsCollegeScoped = false) => {
  const targetId = normalizeId(collegeId)
  const targetName = String(collegeName || '').trim().toLowerCase()
  const departmentIds = new Set(departments
    .filter(department => String(department.collegeId ?? department.collegeNumericId ?? '') === targetId)
    .map(department => normalizeId(department.id ?? department.departmentId))
    .filter(Boolean))

  return rows.filter(course => {
    const ownCollegeId = normalizeId(course.collegeId ?? course.collegeNumericId ?? course.CollegeId ?? course.college?.collegeId ?? course.college?.id)
    if (ownCollegeId) return ownCollegeId === targetId

    const departmentId = normalizeId(course.departmentId ?? course.DepartmentId ?? course.department?.departmentId ?? course.department?.id)
    if (departmentId) return departmentIds.has(departmentId)

    const ownCollegeName = String(course.collegeName ?? course.CollegeName ?? course.college?.name ?? course.college ?? '').trim().toLowerCase()
    if (targetName && ownCollegeName) return ownCollegeName === targetName
    return responseIsCollegeScoped
  })
}

const codeFor = name => { const known = { 'computer science and engineering': 'CSE', 'electronics and communication engineering': 'ECE', 'electrical and electronics engineering': 'EEE', 'mechanical engineering': 'ME', 'civil engineering': 'CE', 'artificial intelligence and data science': 'AI-DS' }, clean = name.trim().toLowerCase(); return known[clean] || name.split(/\s+/).filter(x => x && !['and', '&', 'of', 'the'].includes(x.toLowerCase())).map(x => x[0]).join('').slice(0, 10).toUpperCase() }

const Page = ({ children }) => <DashboardLayout><main className="cm-page course-management">{children}</main></DashboardLayout>
const Header = ({ title, text, children }) => <header className="cm-header"><div><h1>{title}</h1><p>{text}</p></div><div className="cm-row-actions">{children}</div></header>
const Field = ({ label, error, wide, children }) => <label className={`cm-field ${wide ? 'wide' : ''}`}><span>{label.endsWith(' *') ? <>{label.slice(0, -2)} <b className="required-mark">*</b></> : label}</span>{children}{error && <small className="cm-error" role="alert">{error}</small>}</label>
const Badge = ({ value }) => <span className={`course-badge ${String(value).toLowerCase()}`}><i />{value}</span>

function CourseList() {
  const { scopeRecords, selectedCollegeId, selectedCollege } = useAcademic()
  const [allCourses, setCourses] = useState([])
  const courses = scopeRecords(allCourses)
  const [allDepartments, setDepartments] = useState([])
  const departments = scopeRecords(allDepartments)
  const [allBranches, setBranches] = useState([])
  const branches = scopeRecords(allBranches)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useToastState('', 'error')
  const [currentPage, setCurrentPage] = useState(1)
  const statusLock = useRef(false)
  const [, setStatusNotice] = useToastState('', 'success')
  const [statusError, setStatusError] = useToastState('', 'error')
  const [pendingStatus, setPendingStatus] = useState(null)
  const [impactChecking, setImpactChecking] = useState(false)
  const [courseImpact, setCourseImpact] = useState(null)
  const [isStatusSaving, setIsStatusSaving] = useState(false)
  const itemsPerPage = 5

  const load = async () => {
    setIsLoading(true); setError('')
    try {
      const [courseRows, departmentRows, branchRows] = await Promise.all([courseApi.getAll(), departmentApi.getAll(), branchApi.getAll()])
      setCourses(newestFirst('courses', courseRows).map(mapCourse).filter(course => course.id && course.name))
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

  const scopedCourses = scopeRecords(courses)

  const departmentName = (c) => departments.find(d => String(d.id) === String(c.departmentId))?.name || c.department || ''
  const rows = useMemo(() => scopedCourses.filter(c => `${c.name} ${c.code}`.toLowerCase().includes(query.trim().toLowerCase()) && (!statusFilter || c.status === statusFilter)), [scopedCourses, query, statusFilter])
  const totalPages = Math.ceil(rows.length / itemsPerPage) || 1
  const currentPageClamped = Math.min(Math.max(currentPage, 1), totalPages)
  const pageRows = useMemo(() => rows.slice((currentPageClamped - 1) * itemsPerPage, currentPageClamped * itemsPerPage), [rows, currentPageClamped])
  const stats = { total: scopedCourses.length, active: scopedCourses.filter(c => c.status === 'Active').length, inactive: scopedCourses.filter(c => c.status === 'Inactive').length }
  const hasFilters = Boolean(query || statusFilter)
  const clearFilters = () => { setQuery(''); setStatusFilter(''); setCurrentPage(1) }
  const studentCourseId = student => student.courseId ?? student.course?.id ?? student.academic?.courseId ?? student.academicInformation?.courseId ?? null
  const checkCourseImpact = async (course) => {
    const targetCourseId = String(course.id ?? course.courseId ?? '').trim()
    const targetCourseName = String(course.name ?? course.courseName ?? '').trim().toLowerCase()
    const targetCourseCode = String(course.code ?? course.courseCode ?? '').trim().toLowerCase()

    try {
      const [allStudents, allBranches, allFaculty, allSections] = await Promise.all([
        studentApi.getAll().catch(() => []),
        branchApi.getAll().catch(() => []),
        facultyService.list().catch(() => []),
        sectionApi.getAll().catch(() => []),
      ])

      // 1. Enrolled Students linked to this course
      const courseStudents = (allStudents || []).filter((s) => {
        const sCourseId = String(s.courseId ?? s.course?.id ?? s.academic?.courseId ?? s.academicInformation?.courseId ?? '').trim()
        const sCourseName = String(s.courseName ?? s.course?.name ?? s.course ?? '').trim().toLowerCase()
        const sCourseCode = String(s.courseCode ?? s.course?.code ?? '').trim().toLowerCase()
        return (
          (targetCourseId && sCourseId === targetCourseId) ||
          (targetCourseName && sCourseName === targetCourseName) ||
          (targetCourseCode && sCourseCode === targetCourseCode)
        )
      })

      // 2. Active Branches under this course
      const courseBranches = (allBranches || []).filter((b) => {
        const bCourseId = String(b.courseId ?? b.course?.id ?? '').trim()
        const bStatus = String(b.status ?? '').trim().toLowerCase()
        const isActive = b.status !== false && b.status !== 0 && bStatus !== 'inactive' && b.isActive !== false
        return isActive && targetCourseId && bCourseId === targetCourseId
      })

      // 3. Faculty members assigned to this course
      const courseFaculty = (allFaculty || []).filter((f) => {
        const fCourseId = String(f.courseId ?? f.course?.id ?? '').trim()
        const assignments = f.assignments || []
        const hasAssignment = assignments.some((a) => {
          const aCourseId = String(a.courseId ?? a.course?.id ?? '').trim()
          return targetCourseId && aCourseId === targetCourseId
        })
        const fStatus = String(f.employmentStatus || f.status || '').trim().toLowerCase()
        const isActive = !['inactive', 'resigned', 'retired', 'terminated'].includes(fStatus)
        return isActive && (hasAssignment || (targetCourseId && fCourseId === targetCourseId))
      })

      // 4. Active Sections configured under this course
      const courseSections = (allSections || []).filter((sec) => {
        const secCourseId = String(sec.courseId ?? sec.course?.id ?? '').trim()
        const secStatus = String(sec.status ?? '').trim().toLowerCase()
        const isActive = sec.status !== false && sec.status !== 0 && secStatus !== 'inactive' && sec.isActive !== false
        return isActive && targetCourseId && secCourseId === targetCourseId
      })

      return {
        studentCount: courseStudents.length,
        branchCount: courseBranches.length,
        facultyCount: courseFaculty.length,
        sectionCount: courseSections.length,
        totalCount: courseStudents.length + courseBranches.length + courseFaculty.length + courseSections.length,
      }
    } catch {
      return { studentCount: 0, branchCount: 0, facultyCount: 0, sectionCount: 0, totalCount: 0 }
    }
  }

  const toggleStatus = async (course) => {
    setStatusError(''); setStatusNotice('')
    if (course.status !== 'Active') { setPendingStatus({ course, nextStatus: 'Active' }); return }
    setImpactChecking(true); setCourseImpact(null)
    try {
      const impact = await checkCourseImpact(course)
      setCourseImpact(impact)
      if (impact.totalCount > 0) {
        const parts = []
        if (impact.branchCount > 0) parts.push(`${impact.branchCount} active ${impact.branchCount === 1 ? 'branch' : 'branches'}`)
        if (impact.studentCount > 0) parts.push(`${impact.studentCount} enrolled ${impact.studentCount === 1 ? 'student' : 'students'}`)
        if (impact.facultyCount > 0) parts.push(`${impact.facultyCount} assigned faculty ${impact.facultyCount === 1 ? 'member' : 'members'}`)
        if (impact.sectionCount > 0) parts.push(`${impact.sectionCount} active ${impact.sectionCount === 1 ? 'section' : 'sections'}`)

        showDeactivationBlocked({
          message: `Cannot deactivate ${course.name}. ${parts.join(', ')} are associated with this course.`,
          name: course.name,
          entity: 'course',
          branchCount: impact.branchCount,
          studentCount: impact.studentCount,
          facultyCount: impact.facultyCount,
          sectionCount: impact.sectionCount,
        })
        return
      }
      setPendingStatus({ course, nextStatus: 'Inactive' })
    } catch (error) {
      showDeactivationBlocked(apiError(error, 'Unable to verify associated records. The course was not deactivated.'))
    } finally { setImpactChecking(false); setStatusNotice('') }
  }

  const confirmStatusChange = async () => {
    if (!pendingStatus || statusLock.current) return
    statusLock.current = true
    const { course, nextStatus } = pendingStatus
    if (nextStatus === 'Inactive' && courseImpact?.totalCount > 0) {
      setPendingStatus(null)
      showDeactivationBlocked({
        message: `Cannot deactivate ${course.name}. Associated active records must be reassigned first.`,
        name: course.name,
        entity: 'course',
        branchCount: courseImpact.branchCount,
        studentCount: courseImpact.studentCount,
        facultyCount: courseImpact.facultyCount,
        sectionCount: courseImpact.sectionCount,
      })
      return
    }
    setIsStatusSaving(true); setStatusError('')
    try {
      const response = await updateCourseStatus(course.id, nextStatus === 'Active' ? 1 : 0)
      if (response?.data?.success === false) throw new Error('Course status could not be updated.')
      eventBus.emit(ERP_EVENTS.ACADEMIC_UPDATED, { courseId: course.id, status: nextStatus })
      academicService.clearCache?.()
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
    <Header title="Course Management" text="Manage B.Tech courses, branches and structures.">
      <CompactSummary label="Course summary" items={[{ label: 'Total', value: stats.total }, { label: 'Active', value: stats.active, tone: 'active' }, { label: 'Inactive', value: stats.inactive, tone: 'inactive' }]} />
    </Header>

    <section className="cm-panel course-directory">
      <header className="course-directory-heading"><div><span className="cm-eyebrow">Course Directory</span><p>{rows.length} records</p></div><div className="directory-export-actions"><ExportMenu rows={rows} columns={courseColumns} title="Courses" filename="courses" loading={isLoading || Boolean(error)} /><Link className="cm-button" to="/courses/add"><FiPlus /> Add Course</Link></div></header>
      <FilterPanel active={hasFilters} onClear={clearFilters}>
        <div className="course-toolbar">
          <label className="course-search"><FiSearch /><input aria-label="Search courses" value={query} onChange={e => { setQuery(e.target.value); setCurrentPage(1) }} placeholder="Search course name or code" /></label>
          <ProjectSelect aria-label="Status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1) }}><option value="">Select Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option></ProjectSelect>
        </div>
      </FilterPanel>
      {isLoading ? <div className="course-empty"><strong>Loading courses...</strong></div>
        : error ? <div className="course-empty course-empty--error" role="alert"><strong>{error}</strong><button className="cm-button" onClick={load}>Retry</button></div>
        : !courses.length ? <div className="course-empty"><strong>No courses have been added yet.</strong></div>
        : rows.length ? (
          <>
            <div className="course-results">Showing <strong>{rows.length}</strong> of <strong>{courses.length}</strong> courses</div>
            <div className="course-table-scroll">
              <table className="course-advanced-table">
                <thead>
                    <tr>
                    <th className="table-center" style={{ minWidth: '240px' }}>Course</th>
                    <th className="table-center" style={{ width: '130px' }}>Duration</th>
                    <th className="table-center" style={{ width: '130px' }}>Semesters</th>
                    <th className="table-center" style={{ width: '120px' }}>Status</th>
                    <th className="table-center" style={{ width: '140px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(c => {
                    const semesterText = Number(c.semesters) > 0 ? `${Number(c.semesters)} Semesters` : 'Not available'
                    const durationText = c.durationValue ? `${c.durationValue} ${c.durationUnit || 'Years'}`.trim() : 'Not available'
                      const secondaryText = `${c.code || ''}${c.shortName ? ` - ${c.shortName}` : ''}`.trim()
                    return (
                      <tr key={c.id}>
                        <td className="table-center" style={{ minWidth: '240px' }}>
                          <div className="table-primary-cell">
                            <Link to={`/courses/${c.id}`} className="course-name-link table-cell-truncate" title={`Click to view details for ${c.name}`}>
                              {c.name}
                            </Link>
                            {secondaryText && <small title={secondaryText}>{secondaryText}</small>}
                          </div>
                        </td>
                        <td className="table-center" style={{ width: '130px' }}>{durationText}</td>
                        <td className="table-center" style={{ width: '130px' }}>{semesterText}</td>
                        <td className="table-center" style={{ width: '120px' }}><StatusBadge value={c.status || 'Active'} /></td>
                        <td className="table-center" style={{ width: '140px' }}>
                          <div className="course-actions table-actions-group">
                            <Link className="table-action-btn action-edit" title={`Edit ${c.name}`} aria-label={`Edit ${c.name}`} to={`/courses/${c.id}/edit`}><FiEdit2 /></Link>
                            <button type="button" className={`table-action-btn ${(c.status || 'Active') === 'Active' ? 'action-deactivate' : 'action-activate'}`} title={(c.status || 'Active') === 'Active' ? `Deactivate ${c.name}` : `Activate ${c.name}`} aria-label={(c.status || 'Active') === 'Active' ? `Deactivate ${c.name}` : `Activate ${c.name}`} onClick={() => toggleStatus(c)}>{(c.status || 'Active') === 'Active' ? <FiToggleRight data-status="active" /> : <FiToggleLeft data-status="inactive" />}</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
          <DirectoryEmptyState title="No courses found." actionLabel="Add Course" to="/courses/add" />
        )}
    </section>
    {pendingStatus && <StatusConfirmDialog entity="Course" name={`${pendingStatus.course.name} (${pendingStatus.course.code})`} nextStatus={pendingStatus.nextStatus} onCancel={() => { if (!isStatusSaving) { setPendingStatus(null); setCourseImpact(null) } }} onConfirm={confirmStatusChange} busy={isStatusSaving || impactChecking} blocked={Boolean(pendingStatus.blocked)} error={statusError} details={pendingStatus.nextStatus === 'Inactive' && courseImpact?.state === 'known' ? [['Associated Students', `${courseImpact.count} student${courseImpact.count === 1 ? '' : 's'}`]] : []} description={pendingStatus.blocked ? 'Deactivate is unavailable until all associated students are moved or removed from this course.' : pendingStatus.nextStatus === 'Active' ? 'This course will be marked active.' : 'No students are currently associated with this course. This course will be marked inactive for operations that exclude inactive courses.'} confirmLabel={pendingStatus.nextStatus === 'Inactive' ? 'Deactivate Course' : 'Activate Course'} />}
  </Page>
}

function CourseForm() {
  const { scopeRecords, selectedCollegeId, selectedCollege } = useAcademic()
  const saveLock = useRef(false)
  const [persistedId, setPersistedId] = useState(null)
  const [existingCourses, setExistingCourses] = useState([])
  const { id } = useParams(), navigate = useNavigate()
  const [allDepartments, setDepartments] = useState([])
  const departments = scopeRecords(allDepartments)
  const [allBranches, setBranches] = useState([])
  const branches = scopeRecords(allBranches)
  const [value, setValue] = useState(() => ({ ...blank, collegeId: selectedCollegeId || '' }))
  const [errors, setErrors] = useToastState({}, 'error')
  const [codeEdited, setCodeEdited] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useToastState('', 'error')
  const hydrationRef = useRef(false)
  const loadRequestRef = useRef(0)

  const load = async () => {
    const requestId = ++loadRequestRef.current
    const collegeId = normalizeId(selectedCollegeId || selectedCollege?.collegeId || selectedCollege?.id)
    setIsLoading(true); setError('')
    try {
      const [departmentRows, branchRows, courseRows] = await Promise.all([departmentApi.getAll(), branchApi.getAll(), courseApi.getAll({ collegeId })])
      const normalizedDepartments = dedupeDepartmentOptions(departmentRows)
      const normalizedBranches = branchRows.map(normalize)
      if (requestId !== loadRequestRef.current) return
      setExistingCourses(coursesForCollege(courseRows, collegeId, selectedCollege?.name || selectedCollege?.collegeName, normalizedDepartments, true).map(mapCourse))
      setDepartments(normalizedDepartments)
      setBranches(normalizedBranches)
      if (id) {
        const courseRes = await getCourseById(id)
        if (requestId !== loadRequestRef.current) return
        const detail = mapCourse(recordFrom(courseRes))
        const departmentId = normalizeId(detail.departmentId ?? detail.department?.departmentId ?? detail.department?.id)
        const branchId = normalizeId(detail.branchId ?? detail.branch?.branchId ?? detail.branch?.id)
        const department = normalizedDepartments.find(item => String(item.id) === String(departmentId))
        const branch = normalizedBranches.find(item => String(item.id) === String(branchId))
        hydrationRef.current = true
        setValue({
          ...blank,
          ...detail,
          departmentId,
          branchId,
          departmentCode: detail.departmentCode || department?.code || '',
          branchCode: detail.branchCode || branch?.code || '',
        })
        hydrationRef.current = false
        setCodeEdited(true)
      }
    } catch (requestError) {
      if (requestId === loadRequestRef.current) setError(apiError(requestError, 'Unable to load course details. Please try again.'))
    } finally {
      if (requestId === loadRequestRef.current) setIsLoading(false)
    }
  }
  useEffect(() => { load() }, [id, selectedCollegeId, scopeRecords])
  useEffect(() => {
    if (id) return
    setExistingCourses([])
    setValue({ ...blank, collegeId: selectedCollegeId || '' })
    setCodeEdited(false)
    setErrors({})
  }, [id, selectedCollegeId])

  const live = validateBasic(value, existingCourses, persistedId ?? id)
  const update = (key, next) => { setValue(v => { const n = { ...v, [key]: next }; if (key === 'durationValue') n.semesters = next ? Number(next) * 2 : ''; if (key === 'name' && !codeEdited) n.code = codeFor(next); if (key === 'code') { n.code = next.toUpperCase(); setCodeEdited(true) } if (key === 'departmentId') { const department = departments.find(x => String(x.id) === String(next)); n.collegeId = department?.collegeId ?? selectedCollegeId ?? ''; n.departmentCode = department?.code || ''; if (!hydrationRef.current) { const previousBranchIsStillValid = n.branchId && branches.some(branch => String(branch.departmentId ?? branch.department?.departmentId ?? branch.department?.id ?? '') === String(next) && String(branch.id ?? branch.branchId) === String(n.branchId)); if (!previousBranchIsStillValid) { n.branchId = ''; n.branchCode = '' } } } if (key === 'branchId') n.branchCode = branches.find(x => String(x.id) === String(next))?.code || ''; return n }); setErrors(e => ({ ...e, [key]: '', ...(key === 'departmentId' ? { branchId: '' } : {}) })) }

  const submit = async () => {
    if (saveLock.current || saved) return
    const e = validateBasic(value, existingCourses, persistedId ?? id); setErrors(e)
    if (Object.keys(e).length) return
    saveLock.current = true
    setIsSaving(true); setError('')
    try {
      const collegeId = normalizeId(selectedCollegeId || selectedCollege?.collegeId || selectedCollege?.id)
      const latestCourseRows = await courseApi.getAll({ collegeId })
      const latestCourses = coursesForCollege(latestCourseRows, collegeId, selectedCollege?.name || selectedCollege?.collegeName, allDepartments, true).map(mapCourse)
      setExistingCourses(latestCourses)
      const latestErrors = validateBasic(value, latestCourses, persistedId ?? id)
      if (Object.keys(latestErrors).length) { setErrors(latestErrors); return }
      const payload = payloadFor({ ...value, collegeId: value.collegeId || selectedCollegeId || selectedCollege?.collegeId || selectedCollege?.id || '' })
      const targetId = persistedId ?? id
      const response = targetId ? await updateCourse(targetId, payload) : await createCourse(payload)
      if (response?.data?.success === false) throw new Error('Course could not be saved.')
      const result = recordFrom(response)
      const courseId = result?.id ?? result?.courseId ?? targetId
      if (!courseId) { setSaved(true); throw new Error('Course saved, but its ID was not returned. Check the course list before making further changes.') }
      if (!targetId) rememberCreated('courses', courseId)
      setPersistedId(courseId)
      cacheCourseDates(courseId, value.code, { startDate: value.startDate, endDate: value.endDate })
      const statusResponse = await updateCourseStatus(courseId, value.status === 'Active' ? 1 : 0)
      if (statusResponse?.data?.success === false) throw new Error('Course saved, but its status could not be updated. Please retry.')
      setSaved(true)
      setValue({ ...blank }); setErrors({})
      showSuccess(id ? 'Course updated successfully.' : 'Course created successfully.')
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
  const branchOptions = branches.filter((branch) => {
    const branchDepartmentId = normalizeId(branch.departmentId ?? branch.department?.departmentId ?? branch.department?.id)
    const matchesDepartment = !value.departmentId || !branchDepartmentId || String(branchDepartmentId) === String(value.departmentId)
    return matchesDepartment
  })
  return <Page><Header title={id ? 'Edit B.Tech Course' : 'Add B.Tech Course'} text="Create a focused B.Tech undergraduate course."><Link className="cm-button secondary" to="/courses"><FiArrowLeft /> Back</Link></Header>

    {error && <p className="cm-error" role="alert">{error} <button type="button" className="cm-button secondary" disabled={isSaving} onClick={load}>Reload options</button></p>}
    <div className="course-form-layout">
      <section className="cm-panel course-form">
        <div className="course-form-scroll">
          <section><h2>Course Identity</h2><div className="cm-form-grid">
            <Field label="Course Name *" error={errors.name || (value.name ? live.name : '')}><input value={value.name} required onChange={e => update('name', e.target.value)} /></Field>
            <Field label="Course Code *" error={errors.code || (value.code ? live.code : '')}><input value={value.code} required minLength={2} maxLength={20} aria-invalid={Boolean(errors.code || live.code)} onChange={e => update('code', e.target.value)} onBlur={() => setErrors(current => ({ ...current, code: live.code || '' }))} placeholder="e.g. BTECH-02 (2?20 characters)" /></Field>
            <Field label="Short Name (Optional)"><input value={value.shortName} onChange={e => update('shortName', e.target.value)} placeholder="e.g. B.Tech" /></Field>
          </div></section>
          <section><h2>Academic Structure</h2><div className="cm-form-grid">
            <Field label="Duration *" error={errors.durationValue}><ProjectSelect value={value.durationValue} onChange={e => update('durationValue', e.target.value ? Number(e.target.value) : '')}><option value="">Select Duration</option><option value="3">3 Years</option><option value="4">4 Years</option></ProjectSelect></Field>
            <Field label="Academic Pattern"><input value="Semester" readOnly /></Field>
            <Field label="Total Semesters"><input value={value.semesters || ''} placeholder="Calculated from duration" readOnly /></Field>
            <Field label="Start Date"><input type="date" value={value.startDate || ''} onChange={e => update('startDate', e.target.value)} /></Field>
            <Field label="End Date"><input type="date" value={value.endDate || ''} onChange={e => update('endDate', e.target.value)} /></Field>
            <Field label="Status *" error={errors.status}><ProjectSelect required value={value.status} onChange={e => update('status', e.target.value)}><option value="">Select Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option></ProjectSelect></Field>
          </div></section>
        </div>
        <footer><button type="button" className="cm-button" disabled={isSaving || saved} onClick={submit}>{isSaving ? 'Saving...' : id ? 'Save Changes' : 'Create Course'}</button></footer>
      </section>
      <aside className="course-preview" aria-label="Course preview">
        <header className="preview-top-bar">
          <span className="preview-live-tag">
            <span className="live-dot" /> LIVE PREVIEW
          </span>
          <span className="preview-sync-hint">Real-time sync</span>
        </header>
        <div className="preview-body-container">
          {(() => {
            const sections = [
              {
                title: 'Course Overview',
                fields: [
                  ['Course Name', value.name],
                  ['Course Code', value.code],
                  ['Short Name', value.shortName],
                  ['Duration', value.durationValue ? `${value.durationValue} Years` : ''],
                  ['Total Semesters', value.semesters ? `${value.semesters} Semesters` : ''],
                  ['Pattern', 'Semester System'],
                  ['Start Date', value.startDate],
                  ['End Date', value.endDate],
                  ['Status', value.status || 'Active'],
                ],
              },
            ].map((sec) => ({
              ...sec,
              fields: sec.fields.filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== '' && String(val).trim() !== '-'),
            })).filter((sec) => sec.fields.length > 0)

            if (sections.length === 0) {
              return (
                <div className="preview-empty-hint">
                  <span>Enter details in the form to preview here in real time.</span>
                </div>
              )
            }

            return (
              <>
                <div className="preview-hero">
                  <div className="preview-hero-badge">
                    {value.code ? value.code.slice(0, 4).toUpperCase() : 'BTECH'}
                  </div>
                  <div className="preview-hero-details">
                    <h3 className="preview-course-title">{value.name.trim() || 'Course Preview'}</h3>
                    <p className="preview-course-meta">
                      {value.durationValue ? `${value.durationValue} Years` : ''}
                      {value.semesters ? `   ${value.semesters} Semesters` : ''}
                    </p>
                  </div>
                </div>
                {sections.map((sec) => (
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
                ))}
              </>
            )
          })()}
        </div>
      </aside>
    </div>
  </Page>
}

function CourseDetails() {
  const { scopeRecords } = useAcademic()
  const { id } = useParams()
  const [course, setCourse] = useState(null)
  const [allDepartments, setDepartments] = useState([])
  const departments = scopeRecords(allDepartments)
  const [allBranches, setBranches] = useState([])
  const branches = scopeRecords(allBranches)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useToastState('', 'error')

  const load = async () => {
    setIsLoading(true); setError('')
    try {
      let rawCourse = null
      try {
        const res = await courseApi.getById(id)
        rawCourse = recordFrom(res)
      } catch {
        try {
          const res = await getCourseById(id)
          rawCourse = recordFrom(res)
        } catch {
          const allCourses = await courseApi.getAll().catch(() => [])
          rawCourse = allCourses.find(c => String(c.id || c.courseId) === String(id))
        }
      }

      if (!rawCourse || (!rawCourse.id && !rawCourse.courseId && !rawCourse.name && !rawCourse.courseName)) {
        const allCourses = await courseApi.getAll().catch(() => [])
        rawCourse = allCourses.find(c => String(c.id || c.courseId) === String(id)) || rawCourse
      }

      if (!rawCourse) {
        throw new Error('Course not found.')
      }

      setCourse(mapCourse(rawCourse))

      try {
        const departmentRows = await departmentApi.getAll()
        setDepartments(dedupeDepartmentOptions(departmentRows))
      } catch {
        setDepartments([])
      }

      try {
        const branchRows = await branchApi.getAll()
        setBranches(branchRows.map(normalize).filter(b => String(b.courseId) === String(id)))
      } catch {
        setBranches([])
      }
    } catch (requestError) {
      setCourse(null)
      setError(apiError(requestError, 'Unable to load course details. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => { load() }, [id])

  if (isLoading) return <Page><div className="cm-empty">Loading course...</div></Page>
  if (error || !course) return <Page><div className="course-empty course-empty--error" role="alert"><strong>{error || 'Course not found.'}</strong><Link className="cm-button" to="/courses">Back</Link></div></Page>

  const department = departments.find(x => String(x.id) === String(course.departmentId))
  const valueText = value => value === null || value === undefined || String(value).trim() === '' ? '' : String(value)
  const detailRows = (rows) => rows.filter(([, value]) => valueText(value)).map(([label, value]) => <div className="course-detail-row" key={label}><span>{label}</span><strong>{valueText(value)}</strong></div>)
  const duration = course.durationValue ? `${course.durationValue} ${course.durationUnit || 'Years'}` : ''
  const pattern = course.academicSystem || 'Semester'

  return (
    <Page>
      <div className="cm-profile-view" data-export-record>
        <div className="cm-profile-top-bar">
          <ExportMenu mode="single" title="Course Details" filename={`course_${course.code || course.id}`} />
          <Link className="cm-button secondary" to="/courses">
            &larr; Back
          </Link>
        </div>

        <div className="cm-profile-card">
          {/* Header Profile Banner */}
          <div className="cm-profile-banner">
            <div className="cm-profile-avatar-wrap">
              <div className="cm-profile-placeholder">
                <FiBookOpen />
              </div>
            </div>
            <div className="cm-profile-header-info">
              <div className="cm-profile-badges">
                <span className="cm-badge cm-badge-code">Code: {course.code || '-'}</span>
                <span className="cm-badge cm-badge-type">{course.type || 'Undergraduate'}</span>
                <span className={`cm-status-badge ${String(course.status || 'Active').toLowerCase()}`}>
                  {course.status || 'Active'}
                </span>
              </div>
              <h1 className="cm-profile-title">{course.name || 'Course'}</h1>
              <p className="cm-profile-subtitle">
                <span>Department: </span>
                <strong>{department?.name || course.department || '-'}</strong>
                {duration && <span> Â| {duration}</span>}
                {course.semesters && <span> Â| {course.semesters} Semesters</span>}
              </p>
            </div>
          </div>

          {/* Profile Information Cards Grid */}
          <div className="cm-profile-grid">
            <InfoCard
              title="Basic Information"
              icon={FiBookOpen}
              items={[
                { label: 'Course Name', value: course.name },
                { label: 'Course Code', value: course.code },
                { label: 'Short Name', value: course.shortName },
                { label: 'Course Type', value: course.type },
                { label: 'College', value: course.college },
                { label: 'Start Date', value: course.startDate },
                { label: 'End Date', value: course.endDate },
                { label: 'Status', value: course.status || 'Active' },
              ]}
            />
            <InfoCard
              title="Academic Information"
              icon={FiLayers}
              items={[
                { label: 'College', value: course.college },
                { label: 'Duration', value: duration },
                { label: 'Academic Pattern', value: pattern },
                { label: 'Total Semesters', value: course.semesters },
              ]}
            />
          </div>
        </div>
      </div>
    </Page>
  );
}

const branchType = b => b.branchType || (b.specialization ? 'Specialization' : 'Core')

function CourseStructure() {
  const { courseId, branchId } = useParams()
  const [course, setCourse] = useState(null)
  const [branch, setBranch] = useState(null)
  const [rows, setRows] = useState([]), [semesterOptions, setSemesterOptions] = useState([]), [semester, setSemester] = useState(''), [form, setForm] = useState({ semesterId: '', yearNumber: '', semesterNumber: '', semesterName: '' }), [editing, setEditing] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useToastState('', 'error'), [saving, setSaving] = useState(false), [page, setPage] = useState(1)

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
      if (semesters.length) {
        const first = semesters[0]
        setSemester(Number(first.semesterNumber))
        setForm({ semesterId: '', yearNumber: Math.ceil(Number(first.semesterNumber) / 2), semesterNumber: Number(first.semesterNumber), semesterName: first.semesterName || '' })
      }
      setRows(newestFirst('course-mappings', mappings).map(x => { const s = byId.get(String(x.semesterId)) || {}; return { ...x, structureId: x.courseSemesterMappingId, semesterNumber: Number(s.semesterNumber || 1), semesterName: s.semesterName || `Semester ${s.semesterNumber || 1}`, yearNumber: Math.ceil(Number(s.semesterNumber || 1) / 2) } }))
      setError('')
    } catch (e) { setError(e.message || 'Unable to load course structures.') } finally { setLoading(false) }
  }
  useEffect(() => { if (courseId && branchId) load() }, [courseId, branchId])

  if (loading) return <Page><div className="cm-empty">Loading...</div></Page>
  if (!course || !branch) return <Page><div className="cm-empty">Academic structure not found.</div></Page>

  const visible = rows.filter(x => Number(x.semesterNumber) === semester), totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE)), currentPage = Math.min(page, totalPages), pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), changeSemester = (value) => { const option = semesterOptions.find(x => Number(x.semesterNumber) === value); setSemester(value); setPage(1); setEditing(null); setForm({ semesterId: option?.semesterId || '', yearNumber: Math.ceil(value / 2), semesterNumber: value, semesterName: option?.semesterName || `Semester ${value}` }) }
  const submit = async () => { if (!form.semesterId) { setError('Select a semester to map.'); return } setSaving(true); try { const payload = { courseId: Number(courseId), semesterId: Number(form.semesterId), ...(editing ? { updatedBy: 1 } : { createdBy: 1 }) }; const result = editing ? await updateCourseSemesterMapping(editing, payload) : await createCourseSemesterMapping(payload); const mapped = result?.data?.data || result?.data || result; const option = semesterOptions.find(x => String(x.semesterId) === String(form.semesterId)) || {}; const row = { ...mapped, structureId: mapped.courseSemesterMappingId || editing, semesterNumber: Number(option.semesterNumber || form.semesterNumber), semesterName: option.semesterName || form.semesterName, yearNumber: Math.ceil(Number(option.semesterNumber || form.semesterNumber) / 2) }; setRows(current => editing ? current.map(x => x.structureId === editing ? row : x) : [row, ...current]); setEditing(null); setForm({ semesterId: '', yearNumber: 1, semesterNumber: semester, semesterName: '' }); setPage(1); setError(''); showSuccess('Semester mapping saved successfully.') } catch (e) { setError(e.message || 'Unable to save semester mapping.') } finally { setSaving(false) } }
  const edit = (row) => { setEditing(row.structureId); setForm({ semesterId: row.semesterId, yearNumber: row.yearNumber, semesterNumber: row.semesterNumber, semesterName: row.semesterName || `Semester ${row.semesterNumber}` }); setSemester(Number(row.semesterNumber)) }
  const toggleStatus = async (row) => { try { await updateCourseSemesterMappingStatus(row.structureId, Number(row.status) === 0 ? 1 : 0); setRows(current => current.map(x => x.structureId === row.structureId ? { ...x, status: Number(x.status) === 0 ? 1 : 0 } : x)); showSuccess('Semester mapping status updated successfully.') } catch (e) { setError(e.message || 'Unable to update mapping status.') } }

  return <Page><ExportMenu rows={visible} columns={structureColumns} title="Course Structure" filename="course-structure" loading={loading || Boolean(error)} /><Header title="Course Structure" text={`${course.name} / ${branch.name}`}><Link className="cm-button secondary" to={`/branches/${branchId}`}><FiArrowLeft /> Back</Link></Header>
    {error && <p className="cm-error" role="alert">{error}</p>}
    <div className="cm-semesters">{semesterOptions.map(option => <button className={`cm-semester ${semester === Number(option.semesterNumber) ? 'active' : ''}`} onClick={() => changeSemester(Number(option.semesterNumber))} key={option.semesterId}>{option.semesterName}</button>)}</div>
    <section className="cm-panel cm-form-grid">
      <Field label="Year"><input type="number" min="1" max="4" value={form.yearNumber} onChange={e => setForm({ ...form, yearNumber: e.target.value })} /></Field>
      <Field label="Semester"><ProjectSelect value={form.semesterId} onChange={e => { const option = semesterOptions.find(x => String(x.semesterId) === e.target.value); const number = Number(option?.semesterNumber || form.semesterNumber); setForm({ ...form, semesterId: e.target.value, semesterNumber: number, semesterName: option?.semesterName || form.semesterName, yearNumber: Math.ceil(number / 2) }); setSemester(number) }}><option value="">Select semester</option>{semesterOptions.map(x => <option key={x.semesterId} value={x.semesterId}>{x.semesterName || `Semester ${x.semesterNumber}`}</option>)}</ProjectSelect></Field>
      <Field label="Semester Name"><input value={form.semesterName} readOnly /></Field>
      <button className="cm-button" disabled={saving} onClick={submit}>{saving ? 'Saving...' : editing ? 'Update Structure' : 'Add Structure'}</button>
      {editing && <button className="cm-button secondary" onClick={() => setEditing(null)}>Cancel</button>}
    </section>
    <section className="cm-panel cm-table-wrap"><table className="cm-table"><thead><tr><th>Year</th><th>Semester</th><th>Name</th><th>Status</th><th>Action</th></tr></thead><tbody>{pageRows.map(x => <tr key={x.structureId}><td>{x.yearNumber}</td><td>{x.semesterNumber}</td><td>{x.semesterName}</td><td>{Number(x.status) === 0 ? 'Deactive' : 'Active'}</td><td><button className="cm-button" onClick={() => edit(x)}><FiEdit2 className="module-action-icon module-action-icon--edit" /> Edit</button></td></tr>)}</tbody></table>{loading ? <div className="cm-empty">Loading structures...</div> : !visible.length ? <div className="cm-empty">No structure configured for Semester {semester}.</div> : <TablePagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />}</section>
  </Page>
}

function Course({ mode }) {
  const { id } = useParams()
  if (mode === 'form') return <CourseForm key={id || 'add'} />
  if (mode === 'details' || id) return <CourseDetails />
  return <CourseList />
}

return { CourseStructure, default: Course }
})()

export const Branch = BranchScreen.default
export const normalize = BranchScreen.normalize
export const Course = CourseScreen.default
export const CourseStructure = CourseScreen.CourseStructure
export default Course
