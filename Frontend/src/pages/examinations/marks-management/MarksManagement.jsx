import { NavLink as react_router_domImports_NavLink, Link as react_router_domImports_Link, Navigate as react_router_domImports_Navigate } from 'react-router-dom'
import { FiBarChart2 as fiImports_FiBarChart2, FiCheckSquare as fiImports_FiCheckSquare, FiEdit3 as fiImports_FiEdit3, FiUploadCloud as fiImports_FiUploadCloud, FiUser as fiImports_FiUser, FiFileText as fiImports_FiFileText, FiSearch as fiImports_FiSearch, FiX as fiImports_FiX, FiCheck as fiImports_FiCheck, FiEye as fiImports_FiEye, FiEdit2 as fiImports_FiEdit2, FiPlus as fiImports_FiPlus, FiTrash2 as fiImports_FiTrash2, FiBookOpen as fiImports_FiBookOpen } from 'react-icons/fi'
import SearchableSelectImports_default, { ProjectSelect as SearchableSelectImports_ProjectSelect } from '../../../components/SearchableSelect'
import { useMemo as reactImports_useMemo, useState as reactImports_useState, useCallback as reactImports_useCallback, useEffect as reactImports_useEffect, useRef as reactImports_useRef } from 'react'
import DashboardLayoutImports_default from '../../../layouts/DashboardLayout'
import PageHeaderImports_default from '../../../components/PageHeader'
import FilterPanelImports_default from '../../../components/FilterPanel'
import ExportMenuImports_default from '../../../components/ExportMenu'
import TablePaginationImports_default from '../../../components/TablePagination'
import EmptyStateImports_default from '../../../components/EmptyState'
import { marksApi as apiEndpointsImports_marksApi, facultyApi as apiEndpointsImports_facultyApi, facultySubjectAllocationApi as apiEndpointsImports_facultySubjectAllocationApi, subjectApi as apiEndpointsImports_subjectApi } from '../../../api/apiEndpoints'
import StatusBadgeImports_default from '../../../components/StatusBadge'
import ViewDialogImports_default from '../../../components/ViewDialog'
import { useAcademic as AcademicContextImports_useAcademic } from '../../../context/AcademicContext'
import { getUserRole as authImports_getUserRole } from '../../../auth/auth'
import { marksWorkflowPayload as marksWorkflowImports_marksWorkflowPayload } from '../../../utils/marksWorkflow'
import { showError as toastImports_showError, showSuccess as toastImports_showSuccess } from '../../../utils/toast'
import eventBusImports_default, { ERP_EVENTS as eventBusImports_ERP_EVENTS } from '../../../services/eventBus'
import { createPortal as react_domImports_createPortal } from 'react-dom'
import facultyServiceImports_default from '../../../services/facultyService'
import studentServiceImports_default from '../../../services/studentService'
import subjectServiceImports_default from '../../../services/subjectService'
import { collegeStorageKey as collegeScopeImports_collegeStorageKey } from '../../../utils/collegeScope'
import resultsServiceImports_default from '../../../services/resultsService'
import academicServiceImports_default from '../../../services/academicService'
import { getExamTypes as examServiceImports_getExamTypes } from '../../../services/examService'
import './MarksManagement.css'

// MarksModuleNav screen and private helpers.
const MarksModuleNavScreen = (() => {
const NavLink = react_router_domImports_NavLink
const FiBarChart2 = fiImports_FiBarChart2
const FiCheckSquare = fiImports_FiCheckSquare
const FiEdit3 = fiImports_FiEdit3
const FiUploadCloud = fiImports_FiUploadCloud
const FiUser = fiImports_FiUser

const modules = [
  { label: 'Marks Entry', description: 'Record assessments', to: '/marks-management/marks-entry', icon: FiEdit3 },
  { label: 'Bulk Marks Upload', description: 'Preview a marks file', to: '/marks-management/bulk-marks-upload', icon: FiUploadCloud },
  { label: 'Student Marks', description: 'Review one student', to: '/marks-management/student-marks', icon: FiUser },
  { label: 'Subject Marks Report', description: 'Compare performance', to: '/marks-management/subject-marks-report', icon: FiBarChart2 },
  { label: 'Marks Approval', description: 'Verify submissions', to: '/marks-management/marks-approval', icon: FiCheckSquare },
]

function MarksModuleNav() {
  return (
    <nav className="marks-module-nav" aria-label="Marks management workflows">
      {modules.map(({ label, description, to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `marks-module-nav__link${isActive ? ' active' : ''}`}
        >
          <span className="marks-module-nav__icon" aria-hidden="true"><Icon /></span>
          <span className="marks-module-nav__copy">
            <strong>{label}</strong>
            <small>{description}</small>
          </span>
        </NavLink>
      ))}
    </nav>
  )
}

return { default: MarksModuleNav }
})()

// BulkMarksUpload screen and private helpers.
const BulkMarksUploadScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const useMemo = reactImports_useMemo
const useState = reactImports_useState
const FiFileText = fiImports_FiFileText
const FiSearch = fiImports_FiSearch
const FiUploadCloud = fiImports_FiUploadCloud
const FiX = fiImports_FiX
const DashboardLayout = DashboardLayoutImports_default
const PageHeader = PageHeaderImports_default
const MarksModuleNav = MarksModuleNavScreen.default
const FilterPanel = FilterPanelImports_default
const ExportMenu = ExportMenuImports_default
const TablePagination = TablePaginationImports_default
const EmptyState = EmptyStateImports_default

const PAGE_SIZE = 10
const normalized = value => String(value ?? '').trim().toLowerCase()

const countDelimiter = (line, delimiter) => {
  let count = 0
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') {
      if (quoted && line[index + 1] === '"') index += 1
      else quoted = !quoted
    } else if (!quoted && line[index] === delimiter) count += 1
  }
  return count
}

const parseDelimitedFile = (text, filename) => {
  const source = text.replace(/^\uFEFF/, '')
  if (!source.trim()) throw new Error('The selected file is empty.')

  const extension = filename.split('.').pop()?.toLowerCase()
  const sample = source.split(/\r?\n/, 1)[0]
  const delimiter = extension === 'tsv'
    ? '\t'
    : [',', '\t', ';'].sort((left, right) => countDelimiter(sample, right) - countDelimiter(sample, left))[0]
  const matrix = []
  let record = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"'
        index += 1
      } else quoted = !quoted
    } else if (!quoted && character === delimiter) {
      record.push(cell)
      cell = ''
    } else if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && source[index + 1] === '\n') index += 1
      record.push(cell)
      matrix.push(record)
      record = []
      cell = ''
    } else cell += character
  }
  if (cell.length || record.length) {
    record.push(cell)
    matrix.push(record)
  }

  const nonEmptyRows = matrix.filter(row => row.some(value => String(value).trim()))
  if (!nonEmptyRows.length) throw new Error('The selected file does not contain a header row.')

  const headerRow = nonEmptyRows[0]
  const usedKeys = new Map()
  const columns = headerRow.map((value, index) => {
    const label = String(value).trim() || `Column ${index + 1}`
    const base = label.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `column_${index + 1}`
    const occurrence = (usedKeys.get(base) || 0) + 1
    usedKeys.set(base, occurrence)
    const key = `field_${index}_${base}${occurrence > 1 ? `_${occurrence}` : ''}`
    return { key, value: key, label }
  })

  const rows = nonEmptyRows.slice(1).map((values, index) => ({
    __bulkRowId: `upload-row-${index}`,
    ...Object.fromEntries(columns.map((column, columnIndex) => [column.key, String(values[columnIndex] ?? '').trim()])),
  }))
  return { columns, rows }
}

function BulkMarksUpload() {
  const [fileName, setFileName] = useState('')
  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [fileError, setFileError] = useState('')
  const [reading, setReading] = useState(false)
  const [query, setQuery] = useState('')
  const [columnFilters, setColumnFilters] = useState({})
  const [page, setPage] = useState(1)

  const columnOptions = useMemo(() => Object.fromEntries(
    columns.map(column => {
      const values = new Map()
      rows.forEach(row => {
        const value = String(row[column.key] ?? '').trim()
        const key = normalized(value)
        if (key && !values.has(key)) values.set(key, value)
      })
      return [column.key, [...values.values()]]
    })
  ), [columns, rows])

  const filteredRows = useMemo(() => rows.filter(row => {
    const searchText = query.trim().toLowerCase()
    const searchMatches = !searchText || columns.some(column => normalized(row[column.key]).includes(searchText))
    const selectedFilters = columns.filter(column => columnFilters[column.key])
    const valueMatches = selectedFilters.every(column =>
      normalized(row[column.key]) === normalized(columnFilters[column.key])
    )
    return searchMatches && valueMatches
  }), [rows, columns, query, columnFilters])
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasFilters = Boolean(query || Object.values(columnFilters).some(Boolean))
  const activeFilterCount = Object.values(columnFilters).filter(Boolean).length + Number(Boolean(query.trim()))

  const uploadFile = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setFileError('')
    setReading(true)
    try {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (!['csv', 'tsv', 'txt'].includes(extension)) throw new Error('Choose a CSV, TSV, or TXT file. Excel workbooks are not supported yet; save the sheet as CSV first.')
      const parsed = parseDelimitedFile(await file.text(), file.name)
      setColumns(parsed.columns)
      setRows(parsed.rows)
      setFileName(file.name)
      setQuery('')
      setColumnFilters({})
      setPage(1)
    } catch (error) {
      setFileError(error.message || 'Could not read this file. Check that it is a valid CSV or TSV.')
    } finally {
      setReading(false)
    }
  }

  const clearPreview = () => {
    setFileName('')
    setColumns([])
    setRows([])
    setQuery('')
    setColumnFilters({})
    setPage(1)
    setFileError('')
  }
  const clearFilters = () => {
    setQuery('')
    setColumnFilters({})
    setPage(1)
  }

  return (
    <DashboardLayout>
      <section className="marks-management-bulk-marks-upload">
        <PageHeader
          className="marks-module-page-header"
          title="Bulk Marks Upload"
          subtitle="Inspect an uploaded marks file, review its structure, and prepare the rows you need."
          breadcrumb={[{ label: 'Marks Management', link: '/marks-management' }, 'Bulk Marks Upload']}
          compactSummary={[
            { label: 'Uploaded Rows', value: rows.length, tone: 'warning' },
            { label: 'File Columns', value: columns.length },
            { label: 'Matching Rows', value: filteredRows.length, tone: 'completed' },
            { label: 'Active Filters', value: activeFilterCount, tone: activeFilterCount ? 'active' : 'default' },
          ]}
        />
        <MarksModuleNav />

        <article className="erp-card bulk-marks-upload-card">
          <header className="erp-card-header bulk-marks-upload-card__header">
            <div>
              <h2 className="erp-card-title">Upload Marks File</h2>
              <p className="erp-card-subtitle">Upload a CSV, TSV, or TXT file to preview its rows before importing.</p>
            </div>
            {fileName && <button type="button" className="erp-btn erp-btn--secondary bulk-marks-upload-clear" onClick={clearPreview}><FiX /> Clear file</button>}
          </header>

          <label className={`bulk-marks-upload-dropzone${reading ? ' is-reading' : ''}`}>
            <input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" onChange={uploadFile} disabled={reading} />
            <span className="bulk-marks-upload-dropzone__icon"><FiUploadCloud /></span>
            <span className="bulk-marks-upload-dropzone__text"><strong>{reading ? 'Reading file…' : fileName || 'Choose a marks file'}</strong><small>{reading ? 'Parsing rows and columns' : 'CSV / TSV / TXT · First row should contain column headings'}</small></span>
            <span className="erp-btn erp-btn--primary bulk-marks-upload-browse">Browse files</span>
          </label>
          {fileError && <p className="bulk-marks-upload-error" role="alert">{fileError}</p>}
          {fileName && !fileError && <p className="bulk-marks-upload-status" role="status"><FiFileText /> Loaded {rows.length} data {rows.length === 1 ? 'row' : 'rows'} and {columns.length} columns from {fileName}.</p>}
        </article>

        <article className="erp-card bulk-marks-preview-card">
          <header className="erp-card-header bulk-marks-preview-card__header">
            <div><h2 className="erp-card-title">Uploaded Data</h2><p className="erp-card-subtitle">{fileName ? `${filteredRows.length} of ${rows.length} rows shown` : 'Upload a file to preview its data in a table.'}</p></div>
          </header>

          <FilterPanel
            active={hasFilters}
            onClear={clearFilters}
            className="bulk-marks-preview-filters"
            actions={<ExportMenu rows={filteredRows} columns={columns} title="Bulk Marks Upload" filename="bulk-marks-upload" scope="All matching rows" allowEmpty />}
          >
            <div className="bulk-marks-search-wrap"><label className="bulk-marks-search"><FiSearch aria-hidden="true" /><input type="search" aria-label="Search uploaded marks" placeholder="Search uploaded data" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} /></label></div>
            {columns.map((column, index) => (
              <label className="bulk-marks-filter" key={column.key}>
                <span title={column.label}>{column.label}</span>
                <ProjectSelect
                  aria-label={`Filter by ${column.label}, column ${index + 1}`}
                  value={columnFilters[column.key] || ''}
                  onChange={event => {
                    setColumnFilters(current => ({
                      ...current,
                      [column.key]: event.target.value,
                    }))
                    setPage(1)
                  }}
                >
                  <option value="">All {column.label}</option>
                  {(columnOptions[column.key] || []).map(value => (
                    <option key={`${column.key}-${value}`} value={value}>{value}</option>
                  ))}
                </ProjectSelect>
              </label>
            ))}
          </FilterPanel>

          {columns.length > 0 && (
            <div className="bulk-marks-table-wrap">
              <table className="erp-table bulk-marks-table">
                <thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead>
                <tbody>{visibleRows.map(row => <tr key={row.__bulkRowId}>{columns.map(column => <td key={column.key}>{row[column.key] || '—'}</td>)}</tr>)}</tbody>
              </table>
              {filteredRows.length === 0 && <EmptyState title="No matching rows" description="Adjust or clear the filters to see more uploaded data." />}
            </div>
          )}
          {columns.length === 0 && <EmptyState title="No file uploaded" description="Choose a CSV, TSV, or TXT file above to display its contents here." />}
          {filteredRows.length > PAGE_SIZE && <TablePagination currentPage={page} totalPages={Math.ceil(filteredRows.length / PAGE_SIZE)} onPageChange={setPage} />}
        </article>
      </section>
    </DashboardLayout>
  )
}

return { default: BulkMarksUpload }
})()

// EditMarks screen and private helpers.
const EditMarksScreen = (() => {
const Link = react_router_domImports_Link
const DashboardLayout = DashboardLayoutImports_default
const PageHeader = PageHeaderImports_default
const MarksModuleNav = MarksModuleNavScreen.default

function EditMarks() {
  return (
    <DashboardLayout>
      <section className="marks-management-edit-marks">
        <PageHeader title="Edit Marks" breadcrumb={[{ label: "Marks Management", link: '/marks-management' }, "Edit Marks"]} />
        <MarksModuleNav />
        <div className="marks-management-edit-marks__content">
          <h2>Edit Marks</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/marks-management">Back to Marks Management</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}

return { default: EditMarks }
})()

// MarksApproval screen and private helpers.
const MarksApprovalScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const useCallback = reactImports_useCallback
const useEffect = reactImports_useEffect
const useMemo = reactImports_useMemo
const useRef = reactImports_useRef
const useState = reactImports_useState
const FiCheck = fiImports_FiCheck
const FiEye = fiImports_FiEye
const FiSearch = fiImports_FiSearch
const FiX = fiImports_FiX
const marksApi = apiEndpointsImports_marksApi
const facultyApi = apiEndpointsImports_facultyApi
const facultySubjectAllocationApi = apiEndpointsImports_facultySubjectAllocationApi
const subjectApi = apiEndpointsImports_subjectApi
const DashboardLayout = DashboardLayoutImports_default
const PageHeader = PageHeaderImports_default
const MarksModuleNav = MarksModuleNavScreen.default
const FilterPanel = FilterPanelImports_default
const ExportMenu = ExportMenuImports_default
const StatusBadge = StatusBadgeImports_default
const ViewDialog = ViewDialogImports_default
const TablePagination = TablePaginationImports_default
const EmptyState = EmptyStateImports_default
const SearchableSelect = SearchableSelectImports_default
const useAcademic = AcademicContextImports_useAcademic
const getUserRole = authImports_getUserRole
const marksWorkflowPayload = marksWorkflowImports_marksWorkflowPayload
const showError = toastImports_showError
const showSuccess = toastImports_showSuccess
const ERP_EVENTS = eventBusImports_ERP_EVENTS
const eventBus = eventBusImports_default

const PAGE_SIZE = 10
const DASH = '—'
const FILTER_KEYS = ['academicYear', 'course', 'branch', 'semester', 'section', 'subject', 'exam', 'faculty']
const FILTER_LABELS = {
  academicYear: 'Academic Year',
  course: 'Course',
  branch: 'Branch',
  semester: 'Semester',
  section: 'Section',
  subject: 'Subject',
  exam: 'Exam',
  faculty: 'Faculty',
}
const approvalColumns = [
  ['subject', 'Subject'],
  ['subjectCode', 'Subject Code'],
  ['faculty', 'Faculty'],
  ['course', 'Course'],
  ['branch', 'Branch'],
  ['semesterSection', 'Semester / Section'],
  ['exam', 'Exam'],
  ['totalStudents', 'Students'],
  ['averageMaximum', 'Average / Maximum Marks'],
  ['submittedAtLabel', 'Submitted On'],
  ['status', 'Status'],
].map(([key, label]) => ({ key, value: key, label }))

const clean = value => String(value ?? '').trim()
const norm = value => clean(value).toLowerCase().replace(/[_-]+/g, ' ')
const pick = (record, ...keys) => {
  for (const key of keys) {
    const value = record?.[key]
    if (value !== undefined && value !== null && clean(value) !== '') return value
  }
  return undefined
}
const toId = value => value === undefined || value === null || clean(value) === '' ? '' : String(value)
const sameId = (left, right) => toId(left) !== '' && toId(right) !== '' && toId(left) === toId(right)
const number = value => value !== undefined && value !== null && clean(value) !== '' && Number.isFinite(Number(value)) ? Number(value) : null
const text = value => value === undefined || value === null || clean(value) === '' ? DASH : String(value)
const numberLabel = value => value === null || value === undefined ? DASH : Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })
const findById = (records, id, idKeys = ['id']) => {
  if (!toId(id)) return null
  return (records || []).find(record => idKeys.some(key => sameId(record?.[key], id))) || null
}
const relationId = (record, ...keys) => toId(pick(record, ...keys))
const entityName = (record, ...keys) => pick(record, ...keys)
const withSemesterPrefix = value => {
  const label = clean(value)
  if (!label) return ''
  return /^semester\b/i.test(label) ? label : 'Semester ' + label
}
const dateTimeLabel = value => {
  if (!value) return DASH
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return String(value)
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date)
}
const dateLabel = value => {
  if (!value) return DASH
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return String(value)
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}
const normalizeStatus = value => {
  const status = norm(value).toUpperCase()
  if (status === 'SUBMITTED' || status === 'PENDING') return 'Pending'
  if (status === 'APPROVED' || status === 'PUBLISHED') return 'Approved'
  if (status === 'REJECTED') return 'Rejected'
  return ''
}
const marksStatus = row => normalizeStatus(pick(row, 'workflowStatus', 'status'))

function entityLabel(records, id, directName, idKeys, nameKeys, format = value => value) {
  const direct = clean(directName)
  const entity = findById(records, id, idKeys)
  const resolved = entityName(entity, ...nameKeys)
  if (resolved !== undefined) return String(format(resolved))
  if (direct && !/^\d+$/.test(direct)) return String(format(direct))
  return ''
}

function getAcademicRelation(mark, section, allocation, subject, academic) {
  const courseId = relationId(mark, 'courseId') ||
    relationId(section, 'courseId') || relationId(allocation, 'courseId') || relationId(subject, 'courseId')
  const branchId = relationId(mark, 'branchId') ||
    relationId(section, 'branchId') || relationId(allocation, 'branchId') || relationId(subject, 'branchId')
  const semesterId = relationId(mark, 'semesterId') ||
    relationId(section, 'semesterId') || relationId(allocation, 'semesterId') || relationId(subject, 'semesterId')
  const academicYearId = relationId(mark, 'academicYearId', 'yearId') ||
    relationId(section, 'academicYearId', 'yearId') || relationId(allocation, 'academicYearId', 'yearId') ||
    relationId(subject, 'academicYearId', 'yearId')

  const course = entityLabel(academic.courses, courseId,
    pick(mark, 'courseName', 'course') || pick(section, 'courseName', 'course') ||
    pick(allocation, 'courseName', 'course') || pick(subject, 'courseName', 'course'),
    ['id', 'courseId'], ['courseName', 'name', 'label', 'title'])
  const branch = entityLabel(academic.branches, branchId,
    pick(mark, 'branchName', 'branch') || pick(section, 'branchName', 'branch') ||
    pick(allocation, 'branchName', 'branch') || pick(subject, 'branchName', 'branch'),
    ['id', 'branchId'], ['branchName', 'name', 'label', 'title', 'branchCode'])
  const semesterRaw = pick(mark, 'semesterName', 'semester') || pick(section, 'semesterName', 'semesterNumber', 'semester') ||
    pick(allocation, 'semesterName', 'semesterNumber', 'semester') || pick(subject, 'semesterName', 'semesterNumber', 'semester')
  const semester = entityLabel(academic.semesters, semesterId, semesterRaw,
    ['id', 'semesterId', 'semesterNumber'], ['semesterName', 'name', 'label', 'title', 'semesterNumber'],
    withSemesterPrefix)
  const academicYear = entityLabel(academic.academicYears, academicYearId,
    pick(mark, 'academicYearName', 'academicYear') || pick(section, 'academicYearName', 'academicYear') ||
    pick(allocation, 'academicYearName', 'academicYear') || pick(subject, 'academicYearName', 'academicYear'),
    ['id', 'academicYearId'], ['academicYearName', 'name', 'label', 'title', 'yearName'])

  return { courseId, branchId, semesterId, academicYearId, course, branch, semester, academicYear }
}

function findFacultyAllocation(mark, relation, allocations) {
  const subjectId = relationId(mark, 'subjectId')
  const sectionId = relationId(mark, 'sectionId')
  const relevant = (allocations || []).filter(allocation => {
    const allocationSubjectId = relationId(allocation, 'subjectId')
    if (!subjectId || !allocationSubjectId || allocationSubjectId !== subjectId) return false
    const checks = [
      [sectionId, relationId(allocation, 'sectionId')],
      [relation.academicYearId, relationId(allocation, 'academicYearId', 'yearId')],
      [relation.semesterId, relationId(allocation, 'semesterId')],
      [relation.branchId, relationId(allocation, 'branchId')],
      [relation.courseId, relationId(allocation, 'courseId')],
    ]
    return checks.every(([expected, actual]) => !expected || !actual || expected === actual)
  })
  if (!relevant.length) return null

  const scored = relevant.map(allocation => {
    const checks = [
      [sectionId, relationId(allocation, 'sectionId')],
      [relation.academicYearId, relationId(allocation, 'academicYearId', 'yearId')],
      [relation.semesterId, relationId(allocation, 'semesterId')],
      [relation.branchId, relationId(allocation, 'branchId')],
      [relation.courseId, relationId(allocation, 'courseId')],
    ]
    return { allocation, score: checks.reduce((total, [expected, actual]) => total + (expected && actual && expected === actual ? 1 : 0), 0) }
  })
  const maxScore = Math.max(...scored.map(item => item.score))
  const best = scored.filter(item => item.score === maxScore).map(item => item.allocation)
  const facultyIds = [...new Set(best.map(item => relationId(item, 'facultyId')).filter(Boolean))]
  return facultyIds.length === 1 ? best.find(item => relationId(item, 'facultyId') === facultyIds[0]) : null
}

function actorLabel(value) {
  if (value === undefined || value === null || clean(value) === '') return DASH
  const id = String(value)
  const user = currentUser()
  return id === user.id ? user.name || ('User #' + id) : 'User #' + id
}

function currentUser() {
  try {
    const storage = window.localStorage
    const session = window.sessionStorage
    return {
      id: storage.getItem('btech-user-id') || session.getItem('btech-user-id') || '',
      name: storage.getItem('btech-user-name') || session.getItem('btech-user-name') || '',
    }
  } catch {
    return { id: '', name: '' }
  }
}

function getWorkflowAction(entry) {
  const fromStatus = clean(pick(entry, 'fromStatus')).toUpperCase()
  const toStatus = clean(pick(entry, 'toStatus')).toUpperCase()
  if (toStatus === 'SUBMITTED' && fromStatus === 'REJECTED') return 'Resubmitted'
  if (toStatus === 'SUBMITTED') return 'Submitted'
  if (toStatus === 'APPROVED') return 'Approved'
  if (toStatus === 'REJECTED') return 'Rejected'
  return toStatus || fromStatus || 'Updated'
}

function getResult(row) {
  const explicit = pick(row, 'resultStatus', 'result')
  if (explicit !== undefined && clean(explicit)) return String(explicit)
  const grade = clean(pick(row, 'grade')).toUpperCase()
  if (grade) return ['F', 'FAIL', 'FAILED'].includes(grade) ? 'Fail' : 'Pass'
  const obtained = number(pick(row, 'marksObtained'))
  const passing = number(pick(row, 'passingMarks', 'minimumPassingMarks'))
  if (obtained !== null && passing !== null) return obtained >= passing ? 'Pass' : 'Fail'
  return DASH
}

function getAttendance(row) {
  const direct = pick(row, 'attendanceStatus', 'attendance', 'presence')
  if (direct === true) return 'Present'
  if (direct === false) return 'Absent'
  if (direct !== undefined) return String(direct)
  const isAbsent = pick(row, 'isAbsent', 'absent')
  if (isAbsent === true || String(isAbsent).toLowerCase() === 'true') return 'Absent'
  const marks = clean(pick(row, 'marksObtained')).toUpperCase()
  return ['AB', 'ABSENT'].includes(marks) ? 'Absent' : DASH
}

function getStudentRow(mark, index) {
  const obtainedRaw = pick(mark, 'marksObtained')
  const obtained = number(obtainedRaw)
  const maximum = number(pick(mark, 'maxMarks', 'maximumMarks'))
  const percentage = number(pick(mark, 'percentage')) ??
    (obtained !== null && maximum > 0 ? obtained / maximum * 100 : null)
  return {
    id: toId(pick(mark, 'markId')) || String(index),
    raw: mark,
    rollNumber: text(pick(mark, 'studentCode', 'rollNumber', 'registrationNumber')),
    studentName: text(pick(mark, 'studentName', 'name')),
    marksObtained: obtainedRaw === undefined ? DASH : String(obtainedRaw),
    maximumMarks: maximum === null ? text(pick(mark, 'maxMarks', 'maximumMarks')) : numberLabel(maximum),
    percentage: percentage === null ? DASH : numberLabel(percentage) + '%',
    attendance: getAttendance(mark),
    result: getResult(mark),
    remarks: text(pick(mark, 'remarks')),
    grade: pick(mark, 'grade'),
  }
}

function groupMarkRows(markRows, academic, subjects, allocations, faculty) {
  const groups = new Map()
  for (const mark of markRows || []) {
    const status = marksStatus(mark)
    if (!status) continue

    const examId = relationId(mark, 'examId')
    const subjectId = relationId(mark, 'subjectId')
    const sectionId = relationId(mark, 'sectionId')
    const key = [examId, subjectId, sectionId, status].join('|')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(mark)
  }

  return [...groups.entries()].map(([key, rawMarks]) => {
    const mark = rawMarks[0]
    const subjectId = relationId(mark, 'subjectId')
    const sectionId = relationId(mark, 'sectionId')
    const section = findById(academic.sections, sectionId, ['id', 'sectionId'])
    const subject = findById(subjects, subjectId, ['id', 'subjectId'])
    const preliminaryRelation = getAcademicRelation(mark, section, null, subject, academic)
    const allocation = findFacultyAllocation(mark, preliminaryRelation, allocations)
    const relation = getAcademicRelation(mark, section, allocation, subject, academic)
    const facultyId = relationId(mark, 'facultyId', 'assignedFacultyId') ||
      relationId(allocation, 'facultyId')
    const facultyRecord = findById(faculty, facultyId, ['id', 'facultyId'])
    const facultyName = pick(mark, 'facultyName') ||
      entityName(facultyRecord, 'facultyName', 'fullName', 'name', 'displayName') ||
      pick(allocation, 'facultyName', 'fullName') || ''
    const subjectName = pick(mark, 'subjectName') ||
      entityName(subject, 'subjectName', 'name', 'title') || ''
    const subjectCode = pick(mark, 'subjectCode') ||
      entityName(subject, 'subjectCode', 'code') || ''
    const sectionName = pick(mark, 'sectionName') ||
      entityName(section, 'sectionName', 'name', 'label') || ''
    const rawDates = rawMarks.map(row => pick(row, 'submittedAt', 'enteredAt')).filter(Boolean)
    const submittedAt = rawDates.length ? rawDates.sort((left, right) => new Date(left) - new Date(right)).at(-1) : ''
    const studentRows = rawMarks.map(getStudentRow)
    const numericMarks = studentRows.map(row => number(pick(row.raw, 'marksObtained'))).filter(value => value !== null)
    const maxima = rawMarks.map(row => number(pick(row, 'maxMarks', 'maximumMarks'))).filter(value => value !== null)
    const maximumMarks = maxima.length ? Math.max(...maxima) : null
    const average = numericMarks.length ? numericMarks.reduce((total, value) => total + value, 0) / numericMarks.length : null
    const outcomes = studentRows.map(row => row.result.toLowerCase())
    const knownOutcomes = outcomes.filter(value => value !== DASH.toLowerCase())
    const attendance = studentRows.map(row => row.attendance.toLowerCase())
    const knownAttendance = attendance.filter(value => value !== DASH.toLowerCase())
    const enteredCount = studentRows.filter(row => pick(row.raw, 'marksObtained') !== undefined).length
    const enteredBy = [...new Set(rawMarks.map(row => toId(pick(row, 'enteredBy'))).filter(Boolean))]
    const examName = pick(mark, 'examName', 'examCode') || ''
    return {
      id: key,
      rawMarks,
      examId,
      subjectId,
      sectionId,
      facultyId,
      academicYearId: relation.academicYearId,
      courseId: relation.courseId,
      branchId: relation.branchId,
      semesterId: relation.semesterId,
      subject: subjectName,
      subjectCode,
      faculty: clean(facultyName),
      academicYear: relation.academicYear,
      course: relation.course,
      branch: relation.branch,
      semester: relation.semester,
      section: sectionName,
      exam: examName,
      examType: pick(mark, 'examType') || '',
      examCode: pick(mark, 'examCode') || '',
      assessmentType: pick(mark, 'assessmentType') || '',
      examDate: pick(mark, 'examDate', 'examinationDate') || '',
      maximumMarks,
      passingMarks: pick(mark, 'passingMarks', 'minimumPassingMarks'),
      submittedAt,
      submittedAtLabel: dateTimeLabel(submittedAt),
      enteredBy,
      status,
      students: studentRows,
      totalStudents: rawMarks.length,
      enteredCount,
      pendingCount: Math.max(0, rawMarks.length - enteredCount),
      average,
      averageMaximum: (average === null ? DASH : numberLabel(average)) + ' / ' + (maximumMarks === null ? DASH : numberLabel(maximumMarks)),
      highest: numericMarks.length ? Math.max(...numericMarks) : null,
      lowest: numericMarks.length ? Math.min(...numericMarks) : null,
      passed: knownOutcomes.length ? outcomes.filter(value => value.includes('pass') && !value.includes('fail')).length : null,
      failed: knownOutcomes.length ? outcomes.filter(value => value.includes('fail')).length : null,
      absent: knownAttendance.length ? attendance.filter(value => value.includes('absent')).length : null,
      semesterSection: [relation.semester, sectionName].filter(Boolean).join(' / ') || DASH,
      searchText: [subjectName, subjectCode, facultyName, relation.branch, examName].map(clean).join(' ').toLowerCase(),
    }
  })
}

const approverRoles = new Set(['admin', 'college_admin', 'super_admin', 'hod', 'department_head', 'exam_cell', 'examcell', 'exam_officer', 'exam_office'])

function decisionResultCount(result, action) {
  const ids = result?.processedMarkIds
  if (Array.isArray(ids)) return ids.length
  if (action === 'approve') return Number(result?.processedCount) || 0
  return Number(result?.rejectedCount) || 0
}

function DecisionDialog({ kind, batch, onCancel, onConfirm, busy }) {
  const [remarks, setRemarks] = useState('')
  const reject = kind === 'reject'

  const submit = event => {
    event.preventDefault()
    if (reject && !remarks.trim()) return
    onConfirm(remarks.trim())
  }

  return (
    <div
      className="marks-approval-dialog-backdrop"
      role="presentation"
      onMouseDown={event => event.target === event.currentTarget && !busy && onCancel()}
    >
      <section className="marks-approval-decision" role="alertdialog" aria-modal="true" aria-labelledby="marks-approval-decision-title">
        <button className="marks-approval-decision__close" type="button" aria-label="Close" onClick={onCancel} disabled={busy}><FiX /></button>
        <div className={'marks-approval-decision__icon ' + (reject ? 'is-reject' : '')} aria-hidden="true">{reject ? <FiX /> : <FiCheck />}</div>
        <h2 id="marks-approval-decision-title">{reject ? 'Reject Marks' : 'Approve Marks'}</h2>
        <p>{reject ? 'Review this submission and provide a reason for rejection.' : 'Confirm the submitted marks after review.'}</p>
        <dl>
          <div><dt>Subject</dt><dd>{text(batch.subject)}</dd></div>
          <div><dt>Subject Code</dt><dd>{text(batch.subjectCode)}</dd></div>
          <div><dt>Faculty</dt><dd>{text(batch.faculty)}</dd></div>
          <div><dt>Exam</dt><dd>{text(batch.exam)}</dd></div>
          <div><dt>Students</dt><dd>{batch.totalStudents}</dd></div>
        </dl>
        <form onSubmit={submit}>
          <label>
            {reject ? 'Rejection Reason *' : 'Approval Remarks (optional)'}
            <textarea
              rows="3"
              maxLength={500}
              value={remarks}
              onChange={event => setRemarks(event.target.value)}
              required={reject}
              placeholder={reject ? 'Explain what needs correction' : 'Add a note to the approval history'}
            />
          </label>
          <footer>
            <button className="erp-btn erp-btn--secondary" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
            <button className={'erp-btn ' + (reject ? 'erp-btn--danger' : 'erp-btn--primary')} type="submit" disabled={busy || (reject && !remarks.trim())}>
              {busy ? (reject ? 'Rejecting marks…' : 'Approving marks…') : (reject ? 'Reject Marks' : 'Approve Marks')}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

function makeOptions(masterRecords, batches, idKeys, nameKeys, batchIdKey, batchNameKey, codeKeys = []) {
  const options = []
  for (const record of masterRecords || []) {
    const id = toId(pick(record, ...idKeys))
    const label = clean(pick(record, ...nameKeys))
    if (!label) continue
    options.push({ value: id || label, label, code: clean(pick(record, ...codeKeys)) })
  }
  for (const batch of batches || []) {
    const label = clean(batch[batchNameKey])
    if (!label || label === DASH) continue
    options.push({
      value: toId(batch[batchIdKey]) || label,
      label,
      code: batchNameKey === 'subject' ? clean(batch.subjectCode) : batchNameKey === 'exam' ? clean(batch.examCode) : '',
    })
  }
  const unique = new Map()
  options.forEach(option => {
    const key = toId(option.value) || norm(option.label)
    if (!unique.has(key)) unique.set(key, option)
  })
  return [...unique.values()].sort((left, right) => left.label.localeCompare(right.label, undefined, { numeric: true }))
}

function actorFromHistory(history, target) {
  const events = (history || []).filter(entry => clean(pick(entry, 'toStatus')).toUpperCase() === target)
  if (!events.length) return null
  return events.sort((left, right) => new Date(pick(right, 'actionAt')) - new Date(pick(left, 'actionAt')))[0]
}

function MarksApproval() {
  const academic = useAcademic()
  const role = getUserRole() || ''
  const canDecide = approverRoles.has(role)
  const forbidden = role === 'student'
  const historyRequest = useRef(0)

  const [markRows, setMarkRows] = useState([])
  const [subjects, setSubjects] = useState([])
  const [allocations, setAllocations] = useState([])
  const [faculty, setFaculty] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [filters, setFilters] = useState({
    academicYear: '', course: '', branch: '', semester: '', section: '', subject: '', exam: '', faculty: '',
  })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [decision, setDecision] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (forbidden) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError('')
    const [marksResponse, subjectsResponse, allocationResponse, facultyResponse] = await Promise.allSettled([
      marksApi.list(),
      subjectApi.list(),
      facultySubjectAllocationApi.getAll(),
      facultyApi.getAll(),
    ])
    if (marksResponse.status === 'rejected') {
      const error = marksResponse.reason
      setLoadError(error?.message || 'Submitted marks could not be loaded. Please retry.')
      setMarkRows([])
      showError(error)
    } else {
      setMarkRows(Array.isArray(marksResponse.value) ? marksResponse.value : [])
      if (subjectsResponse.status === 'fulfilled') setSubjects(Array.isArray(subjectsResponse.value) ? subjectsResponse.value : [])
      if (allocationResponse.status === 'fulfilled') setAllocations(Array.isArray(allocationResponse.value) ? allocationResponse.value : [])
      if (facultyResponse.status === 'fulfilled') setFaculty(Array.isArray(facultyResponse.value) ? facultyResponse.value : [])
    }
    setLoading(false)
  }, [forbidden])

  useEffect(() => {
    load()
    const refresh = () => load()
    const unsubscribe = ERP_EVENTS.RESULTS_RECORDED ? eventBus.subscribe(ERP_EVENTS.RESULTS_RECORDED, refresh) : () => {}
    window.addEventListener('focus', refresh)
    return () => {
      unsubscribe?.()
      window.removeEventListener('focus', refresh)
    }
  }, [load])

  const academicCatalog = useMemo(() => ({
    academicYears: academic.academicYears,
    courses: academic.courses,
    branches: academic.branches,
    semesters: academic.semesters,
    sections: academic.sections,
  }), [academic.academicYears, academic.courses, academic.branches, academic.semesters, academic.sections])

  const batches = useMemo(
    () => groupMarkRows(markRows, academicCatalog, subjects, allocations, faculty),
    [markRows, academicCatalog, subjects, allocations, faculty],
  )

  const optionSets = useMemo(() => ({
    academicYear: makeOptions(academic.academicYears, batches, ['id', 'academicYearId'], ['academicYearName', 'name', 'label', 'title', 'yearName'], 'academicYearId', 'academicYear'),
    course: makeOptions(academic.courses, batches, ['id', 'courseId'], ['courseName', 'name', 'label', 'title'], 'courseId', 'course'),
    branch: makeOptions(academic.branches, batches, ['id', 'branchId'], ['branchName', 'name', 'label', 'title', 'branchCode'], 'branchId', 'branch', ['branchCode', 'code']),
    semester: makeOptions(academic.semesters, batches, ['id', 'semesterId', 'semesterNumber'], ['semesterName', 'name', 'label', 'title', 'semesterNumber'], 'semesterId', 'semester'),
    section: makeOptions(academic.sections, batches, ['id', 'sectionId'], ['sectionName', 'name', 'label', 'title'], 'sectionId', 'section'),
    subject: makeOptions(subjects, batches, ['id', 'subjectId'], ['subjectName', 'name', 'label', 'title'], 'subjectId', 'subject', ['subjectCode', 'code']),
    exam: makeOptions([], batches, ['examId'], ['exam'], 'examId', 'exam', ['examCode']),
    faculty: makeOptions(faculty, batches, ['id', 'facultyId'], ['facultyName', 'fullName', 'name', 'displayName'], 'facultyId', 'faculty'),
  }), [academic.academicYears, academic.courses, academic.branches, academic.semesters, academic.sections, subjects, faculty, batches])

  const scopedRows = useMemo(() => {
    return batches.filter(batch => FILTER_KEYS.every(key => {
      const value = filters[key]
      if (!value) return true
      const fieldKey = key === 'exam' ? 'examId' : key === 'academicYear' ? 'academicYearId' : key + 'Id'
      const actual = batch[fieldKey] || batch[key]
      return toId(actual) === toId(value)
    }))
  }, [batches, filters])

  const rows = useMemo(() => scopedRows.filter(batch => {
    const statusMatches = statusFilter === 'All' || batch.status === statusFilter
    const query = norm(search)
    return statusMatches && (!query || batch.searchText.includes(query))
  }), [scopedRows, statusFilter, search])

  const counts = useMemo(() => ({
    total: scopedRows.length,
    pending: scopedRows.filter(row => row.status === 'Pending').length,
    approved: scopedRows.filter(row => row.status === 'Approved').length,
    rejected: scopedRows.filter(row => row.status === 'Rejected').length,
  }), [scopedRows])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const activePage = Math.min(page, pageCount)
  const visibleRows = rows.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE)

  const setField = (key, value) => {
    setFilters(current => ({ ...current, [key]: value }))
    setPage(1)
  }

  const closeDetails = () => {
    historyRequest.current += 1
    setSelected(null)
  }

  const openDetails = async batch => {
    const requestId = ++historyRequest.current
    setSelected({ ...batch, history: [], historyLoading: canDecide, historyError: '' })
    if (!canDecide || !batch.rawMarks.length) return

    const responses = await Promise.allSettled(
      batch.rawMarks.map(mark => marksApi.approvalHistory(pick(mark, 'markId'))),
    )
    if (requestId !== historyRequest.current) return
    const events = responses.flatMap((response, index) => {
      if (response.status !== 'fulfilled' || !Array.isArray(response.value)) return []
      return response.value.map(entry => ({ ...entry, __sourceMarkId: pick(batch.rawMarks[index], 'markId') }))
    })
    const grouped = new Map()
    events.forEach(entry => {
      const timestamp = pick(entry, 'actionAt')
      const key = [
        pick(entry, 'fromStatus'), pick(entry, 'toStatus'), pick(entry, 'actionBy'),
        timestamp ? new Date(timestamp).toISOString() : '', pick(entry, 'remarks'),
      ].map(value => clean(value)).join('|')
      const current = grouped.get(key)
      if (current) current.markCount += 1
      else grouped.set(key, { ...entry, markCount: 1 })
    })
    const history = [...grouped.values()].sort((left, right) => new Date(pick(left, 'actionAt')) - new Date(pick(right, 'actionAt')))
    const anyFailed = responses.some(response => response.status === 'rejected')
    setSelected(current => current?.id === batch.id
      ? { ...current, history, historyLoading: false, historyError: anyFailed && !history.length ? 'Approval history is unavailable.' : '' }
      : current)
  }

  const confirmDecision = async remarks => {
    if (!selected || !canDecide || selected.status !== 'Pending') return
    setBusy(true)
    const action = decision
    try {
      const payload = marksWorkflowPayload(action, selected.rawMarks, remarks)
      const sectionId = Number(selected.sectionId)
      const subjectId = Number(selected.subjectId)
      if (Number.isSafeInteger(sectionId) && sectionId > 0) payload.sectionId = sectionId
      if (Number.isSafeInteger(subjectId) && subjectId > 0) payload.subjectId = subjectId

      const response = await marksApi.workflow(action, payload)
      const completed = decisionResultCount(response, action)
      if (completed !== payload.markIds.length) {
        const details = Array.isArray(response?.errors)
          ? response.errors.map(error => error?.message || error?.errorCode).filter(Boolean).join(' ')
          : ''
        showError(details || 'The server processed ' + completed + ' of ' + payload.markIds.length + ' marks. The list has been refreshed.')
        setDecision('')
        closeDetails()
        await load()
        return
      }

      showSuccess(action === 'approve' ? 'Marks approved successfully.' : 'Marks rejected successfully.')
      setDecision('')
      closeDetails()
      await load()
    } catch (error) {
      showError(error)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const statusTag = status => <StatusBadge value={status} />
  const detailHistory = selected?.history || []
  const approvedEvent = actorFromHistory(detailHistory, 'APPROVED')
  const rejectedEvent = actorFromHistory(detailHistory, 'REJECTED')
  const submittedEvent = detailHistory.filter(entry => clean(pick(entry, 'toStatus')).toUpperCase() === 'SUBMITTED')
    .sort((left, right) => new Date(pick(right, 'actionAt')) - new Date(pick(left, 'actionAt')))[0]
  const submittedBy = selected?.enteredBy?.length
    ? [...new Set(selected.enteredBy.map(actorLabel))].join(', ')
    : actorLabel(pick(submittedEvent, 'actionBy'))
  const approvalRemarks = approvedEvent ? text(pick(approvedEvent, 'remarks')) : DASH
  const rejectionReason = rejectedEvent ? text(pick(rejectedEvent, 'remarks')) : DASH

  const detailFields = selected ? [
    ['Academic Year', text(selected.academicYear)],
    ['Course', text(selected.course)],
    ['Branch', text(selected.branch)],
    ['Semester', text(selected.semester)],
    ['Section', text(selected.section)],
    ['Subject', text(selected.subject)],
    ['Subject Code', text(selected.subjectCode)],
    ['Faculty', text(selected.faculty)],
    ['Exam', text(selected.exam)],
    ['Exam Type', text(selected.examType)],
    ['Assessment Type', text(selected.assessmentType)],
    ['Maximum Marks', selected.maximumMarks === null ? DASH : numberLabel(selected.maximumMarks)],
    ['Passing Marks', text(selected.passingMarks)],
    ['Exam Date', dateLabel(selected.examDate)],
    ['Submitted By', submittedBy],
    ['Submitted On', dateTimeLabel(pick(submittedEvent, 'actionAt') || selected.submittedAt)],
    ['Current Status', statusTag(selected.status)],
    ...(selected.status === 'Approved' ? [
      ['Approved By', actorLabel(pick(approvedEvent, 'actionBy'))],
      ['Approved On', dateTimeLabel(pick(approvedEvent, 'actionAt'))],
      ['Approval Remarks', approvalRemarks],
    ] : []),
    ...(selected.status === 'Rejected' ? [
      ['Rejected By', actorLabel(pick(rejectedEvent, 'actionBy'))],
      ['Rejected On', dateTimeLabel(pick(rejectedEvent, 'actionAt'))],
      ['Rejection Reason', rejectionReason],
    ] : []),
  ] : []

  const filterFields = FILTER_KEYS.map(key => (
    <div className="marks-approval-filter" key={key}>
      <span className="marks-approval-filter-label">{FILTER_LABELS[key]}</span>
      <SearchableSelect
        label={FILTER_LABELS[key]}
        value={filters[key]}
        options={optionSets[key]}
        onChange={value => setField(key, value)}
        placeholder={'All ' + FILTER_LABELS[key].toLowerCase() + 's'}
        searchPlaceholder={'Search ' + FILTER_LABELS[key].toLowerCase()}
      />
    </div>
  ))

  const exportRows = rows.map(row => ({
    ...row,
    averageMaximum: row.averageMaximum,
    submittedAtLabel: row.submittedAtLabel,
  }))

  return (
    <DashboardLayout>
      <section className="marks-management-marks-approval">
        <PageHeader
          className="marks-module-page-header"
          title="Marks Approval"
          subtitle="Review, verify, and resolve submitted marks with a complete approval history."
          breadcrumb={[{ label: 'Marks Management', link: '/marks-management' }, 'Marks Approval']}
          compactSummary={!forbidden ? [
            { label: 'Submissions', value: counts.total, tone: 'warning' },
            { label: 'Pending', value: counts.pending, tone: 'upcoming' },
            { label: 'Approved', value: counts.approved, tone: 'active' },
            { label: 'Rejected', value: counts.rejected, tone: 'danger' },
          ] : undefined}
        />
        <MarksModuleNav />

        {forbidden ? (
          <article className="erp-card marks-approval-forbidden">
            <EmptyState title="Access restricted" description="Students cannot access Marks Approval." />
          </article>
        ) : (
          <>
            <article className="erp-card marks-approval-filter-card">
              <div>
                <FilterPanel
                  className="marks-approval-filter-panel"
                  active={Boolean(Object.values(filters).some(Boolean) || statusFilter !== 'All' || search)}
                  hideClear
                  leadingActions={
                    <ExportMenu
                      rows={exportRows}
                      columns={approvalColumns}
                      title="Marks Approval"
                      filename="marks-approval-submissions"
                      scope="Filtered submissions"
                      allowEmpty
                    />
                  }
                >
                  <div className="marks-approval-filter-layout">
                    <label className="marks-approval-filter-search">
                      <FiSearch aria-hidden="true" />
                      <input
                        type="search"
                        aria-label="Search marks submissions"
                        placeholder="Search subject, code, faculty, branch or exam"
                        value={search}
                        onChange={event => { setSearch(event.target.value); setPage(1) }}
                      />
                    </label>
                    <div className="marks-approval-dropdown-grid">
                      {filterFields}
                      <label className="marks-approval-filter marks-approval-status-filter">
                        <span className="marks-approval-filter-label">Approval Status</span>
                        <ProjectSelect value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1) }}>
                          <option>All</option>
                          <option>Pending</option>
                          <option>Approved</option>
                          <option>Rejected</option>
                        </ProjectSelect>
                      </label>
                    </div>
                  </div>
                </FilterPanel>
              </div>
            </article>

            <article className="erp-card marks-approval-table-card">
              <header className="erp-card-header">
                <div>
                  <h2 className="erp-card-title">Submitted Marks</h2>
                  <p className="erp-card-subtitle">{rows.length} submission{rows.length === 1 ? '' : 's'} match the current filters.</p>
                </div>
              </header>

              {loadError && (
                <div className="marks-approval-error" role="alert">
                  <span>{loadError}</span>
                  <button type="button" className="erp-btn erp-btn--secondary" onClick={load} disabled={loading}>Retry</button>
                </div>
              )}

              {loading ? (
                <p className="marks-approval-loading" role="status">Loading submitted marks…</p>
              ) : !rows.length ? (
                <EmptyState
                  title={statusFilter === 'Pending' ? 'No pending marks submissions found.' : 'No marks submissions found.'}
                  description="Try changing the filters or search terms."
                />
              ) : (
                <>
                  <div className="marks-approval-table-wrap">
                    <table className="erp-table marks-approval-table">
                      <thead>
                        <tr>
                          {['Subject', 'Subject Code', 'Faculty', 'Course', 'Branch', 'Semester / Section', 'Exam', 'Students', 'Average / Maximum', 'Submitted On', 'Status', 'Action'].map(column => (
                            <th key={column}>{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRows.map(batch => (
                          <tr key={batch.id}>
                            <td>{text(batch.subject)}</td>
                            <td>{text(batch.subjectCode)}</td>
                            <td>{text(batch.faculty)}</td>
                            <td>{text(batch.course)}</td>
                            <td>{text(batch.branch)}</td>
                            <td>{batch.semesterSection}</td>
                            <td>{text(batch.exam)}</td>
                            <td>{batch.totalStudents}</td>
                            <td>{batch.averageMaximum}</td>
                            <td>{batch.submittedAtLabel}</td>
                            <td>{statusTag(batch.status)}</td>
                            <td>
                              <button type="button" className="marks-approval-view-btn" onClick={() => openDetails(batch)}>
                                <FiEye aria-hidden="true" /> View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="marks-approval-pagination">
                    <span>Showing {rows.length ? (activePage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(activePage * PAGE_SIZE, rows.length)} of {rows.length}</span>
                    {rows.length > PAGE_SIZE && (
                      <TablePagination currentPage={activePage} totalPages={pageCount} onPageChange={setPage} />
                    )}
                  </div>
                </>
              )}
            </article>

            {selected && (
              <ViewDialog
                title="Marks Approval Details"
                subtitle={[selected.subject, selected.subjectCode].filter(Boolean).join(' · ')}
                onClose={closeDetails}
                maxWidth="1180px"
                footerActions={canDecide && selected.status === 'Pending' ? (
                  <>
                    <button className="erp-btn erp-btn--danger" type="button" onClick={() => setDecision('reject')} disabled={busy}>Reject</button>
                    <button className="erp-btn erp-btn--primary" type="button" onClick={() => setDecision('approve')} disabled={busy}>Approve</button>
                  </>
                ) : null}
              >
                <dl className="marks-approval-details-grid">
                  {detailFields.map(([name, value]) => (
                    <div key={name}><dt>{name}</dt><dd>{value}</dd></div>
                  ))}
                </dl>

                {selected.status === 'Rejected' && (
                  <p className="marks-approval-rejection-note"><strong>Rejection reason:</strong> {rejectionReason}</p>
                )}

                <div className="marks-approval-detail-summary">
                  {[
                    ['Total Students', selected.totalStudents],
                    ['Marks Entered', selected.enteredCount],
                    ['Pending Marks', selected.pendingCount],
                    ['Average Marks', selected.average === null ? DASH : numberLabel(selected.average)],
                    ['Highest Marks', selected.highest === null ? DASH : numberLabel(selected.highest)],
                    ['Lowest Marks', selected.lowest === null ? DASH : numberLabel(selected.lowest)],
                    ['Passed', selected.passed === null ? DASH : selected.passed],
                    ['Failed', selected.failed === null ? DASH : selected.failed],
                    ['Absent', selected.absent === null ? DASH : selected.absent],
                  ].map(([name, value]) => (
                    <div key={name}><small>{name}</small><strong>{value}</strong></div>
                  ))}
                </div>

                <h3 className="marks-approval-section-title">Student Marks Review</h3>
                {selected.students.length ? (
                  <div className="marks-approval-students-wrap">
                    <table className="erp-table marks-approval-students">
                      <thead>
                        <tr>{['S.No', 'Roll Number', 'Student Name', 'Marks Obtained', 'Maximum Marks', 'Percentage', 'Attendance Status', 'Result', 'Remarks'].map(column => <th key={column}>{column}</th>)}</tr>
                      </thead>
                      <tbody>
                        {selected.students.map((student, index) => (
                          <tr key={student.id}>
                            <td>{index + 1}</td>
                            <td>{student.rollNumber}</td>
                            <td>{student.studentName}</td>
                            <td>{student.marksObtained}</td>
                            <td>{student.maximumMarks}</td>
                            <td>{student.percentage}</td>
                            <td>{student.attendance}</td>
                            <td>{student.result}</td>
                            <td>{student.remarks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState title="Student marks are unavailable" description="No student marks were returned for this submission." />
                )}

                <h3 className="marks-approval-section-title">Approval History</h3>
                {selected.historyLoading ? (
                  <p className="marks-approval-loading" role="status">Loading approval history…</p>
                ) : selected.historyError ? (
                  <p className="marks-approval-history-empty">{selected.historyError}</p>
                ) : detailHistory.length ? (
                  <ol className="marks-approval-history">
                    {detailHistory.map((entry, index) => (
                      <li key={pick(entry, 'historyId') || index}>
                        <span className="marks-approval-history__dot" aria-hidden="true" />
                        <div>
                          <div className="marks-approval-history__head">
                            <strong>{getWorkflowAction(entry)}{entry.markCount > 1 ? ' · ' + entry.markCount + ' marks' : ''}</strong>
                            <time>{dateTimeLabel(pick(entry, 'actionAt'))}</time>
                          </div>
                          <p>{actorLabel(pick(entry, 'actionBy'))}{pick(entry, 'remarks') ? ' · ' + pick(entry, 'remarks') : ''}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="marks-approval-history-empty">No approval history is available from the backend.</p>
                )}
              </ViewDialog>
            )}

            {decision && selected && (
              <DecisionDialog
                key={decision + selected.id}
                kind={decision}
                batch={selected}
                onCancel={() => setDecision('')}
                onConfirm={confirmDecision}
                busy={busy}
              />
            )}
          </>
        )}
      </section>
    </DashboardLayout>
  )
}

return { default: MarksApproval }
})()

// MarksEntry screen and private helpers.
const MarksEntryScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const useEffect = reactImports_useEffect
const useMemo = reactImports_useMemo
const useState = reactImports_useState
const createPortal = react_domImports_createPortal
const FiEdit2 = fiImports_FiEdit2
const FiPlus = fiImports_FiPlus
const FiSearch = fiImports_FiSearch
const FiTrash2 = fiImports_FiTrash2
const FiX = fiImports_FiX
const DashboardLayout = DashboardLayoutImports_default
const PageHeader = PageHeaderImports_default
const EmptyState = EmptyStateImports_default
const ExportMenu = ExportMenuImports_default
const FilterPanel = FilterPanelImports_default
const TablePagination = TablePaginationImports_default
const MarksModuleNav = MarksModuleNavScreen.default
const useAcademic = AcademicContextImports_useAcademic
const facultyService = facultyServiceImports_default
const studentService = studentServiceImports_default
const subjectService = subjectServiceImports_default
const collegeStorageKey = collegeScopeImports_collegeStorageKey

const columns = [
  { key: 'academicYear', label: 'Academic Year' },
  { key: 'course', label: 'Course' },
  { key: 'branch', label: 'Branch' },
  { key: 'semester', label: 'Semester' },
  { key: 'section', label: 'Section' },
  { key: 'registrationNumber', label: 'Registration Number' },
  { key: 'studentName', label: 'Student Name' },
  { key: 'subjectName', label: 'Subject' },
  { key: 'facultyName', label: 'Faculty Name' },
  { key: 'subjectCode', label: 'Subject Code' },
  { key: 'examType', label: 'Exam Type' },
  { key: 'assessmentType', label: 'Assessment Type' },
  { key: 'examDate', label: 'Exam Date' },
  { key: 'maximumMarks', label: 'Maximum Marks' },
  { key: 'passingMarks', label: 'Passing Marks' },
  { key: 'studentMarks', label: 'Student Marks' },
  { key: 'examStatus', label: 'Exam Status' },
  { key: 'percentage', label: 'Percentage' },
]

const PAGE_SIZE = 10

const initialAssessment = {
  academicYear: '',
  course: '',
  branch: '',
  semester: '',
  section: '',
  registrationNumber: '',
  studentName: '',
  subject: '',
  facultyName: '',
  subjectCode: '',
  examType: '',
  assessmentType: '',
  examDate: '',
  maximumMarks: '',
  passingMarks: '',
  studentMarks: '',
}

const fieldOptions = {
  examType: [
    'End Semester Regular Exam',
    'Supplementary Exam',
    'Improvement Exam',
  ],
  assessmentType: ['Internal', 'External'],
}

const entityLabel = (item, keys) =>
  keys
    .map(key => item?.[key])
    .find(
      value =>
        value !== undefined &&
        value !== null &&
        String(value).trim()
    )

const normalized = value =>
  String(value ?? '').trim().toLowerCase()

const semesterNumber = value =>
  String(value ?? '').match(/\d+/)?.[0] || ''

const uniqueValues = values => {
  const unique = new Map()

  values.forEach(value => {
    const label = String(value ?? '').trim()
    const key = normalized(label)

    if (key && !unique.has(key)) {
      unique.set(key, label)
    }
  })

  return [...unique.values()]
}

const getMarksSummary = ({
  studentMarks,
  maximumMarks,
  passingMarks,
}) => {
  const marks =
    studentMarks === '' || studentMarks == null
      ? NaN
      : Number(studentMarks)

  const maximum =
    maximumMarks === '' || maximumMarks == null
      ? NaN
      : Number(maximumMarks)

  const passing =
    passingMarks === '' || passingMarks == null
      ? NaN
      : Number(passingMarks)

  const percentage =
    Number.isFinite(marks) &&
      Number.isFinite(maximum) &&
      maximum > 0
      ? `${((marks / maximum) * 100).toFixed(2)}%`
      : ''

  const examStatus =
    Number.isFinite(marks) &&
      Number.isFinite(maximum) &&
      maximum > 0 &&
      Number.isFinite(passing) &&
      marks >= 0 &&
      marks <= maximum &&
      passing >= 0 &&
      passing <= maximum
      ? marks >= passing
        ? 'Pass'
        : 'Fail'
      : ''

  return {
    percentage,
    examStatus,
  }
}

const LEGACY_DRAFTS_KEY = collegeStorageKey(
  'marks-entry-assessment-drafts-v1'
)

const DRAFTS_KEY = collegeStorageKey(
  'marks-entry-assessment-drafts-v2'
)

const readDrafts = () => {
  try {
    const value = JSON.parse(
      localStorage.getItem(DRAFTS_KEY) || '[]'
    )

    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function MarksEntry() {
  const {
    academicYears = [],
    courses: academicCourses = [],
    branches = [],
    semesters = [],
    sections = [],
  } = useAcademic()

  const [draftRows, setDraftRows] = useState(readDrafts)
  const [subjects, setSubjects] = useState([])
  const [students, setStudents] = useState([])
  const [facultyMembers, setFacultyMembers] = useState([])
  const [activeSuggestion, setActiveSuggestion] = useState('')
  const [query, setQuery] = useState('')

  const [filters, setFilters] = useState({
    academicYear: '',
    course: '',
    branch: '',
    semester: '',
    section: '',
    subject: '',
    examType: '',
    assessmentType: '',
  })

  const [page, setPage] = useState(1)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [deletingRow, setDeletingRow] = useState(null)
  const [assessment, setAssessment] =
    useState(initialAssessment)

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_DRAFTS_KEY)
    } catch {
      // Ignore unavailable storage
    }
  }, [])

  useEffect(() => {
    subjectService
      .getSubjects({ liveOnly: true })
      .then(data =>
        setSubjects(Array.isArray(data) ? data : [])
      )
      .catch(() => setSubjects([]))
  }, [])

  useEffect(() => {
    studentService
      .getAllProfiles()
      .then(data =>
        setStudents(Array.isArray(data) ? data : [])
      )
      .catch(() => setStudents([]))
  }, [])

  useEffect(() => {
    facultyService
      .list()
      .then(data =>
        setFacultyMembers(Array.isArray(data) ? data : [])
      )
      .catch(() => setFacultyMembers([]))
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFTS_KEY,
        JSON.stringify(draftRows)
      )
    } catch {
      // Keep current session drafts if storage is unavailable
    }
  }, [draftRows])

  const allRows = draftRows

  const summaryStats = useMemo(() => {
    const results = allRows.map(row => {
      const summary = getMarksSummary(row)
      const percentage = Number.parseFloat(
        row.percentage || summary.percentage
      )

      return {
        status: row.examStatus || summary.examStatus,
        percentage,
      }
    })
    const scoredRows = results.filter(row =>
      Number.isFinite(row.percentage)
    )
    const passedCount = results.filter(
      row => row.status === 'Pass'
    ).length
    const failedCount = results.filter(
      row => row.status === 'Fail'
    ).length
    const average = scoredRows.length
      ? scoredRows.reduce(
        (total, row) => total + row.percentage,
        0
      ) / scoredRows.length
      : 0

    return [
      {
        label: 'Total Records',
        value: allRows.length,
        tone: 'warning',
      },
      {
        label: 'Passed Students',
        value: passedCount,
        tone: 'active',
      },
      {
        label: 'Failed Students',
        value: failedCount,
        tone: 'inactive',
      },
      {
        label: 'Average Score',
        value: `${average.toFixed(1)}%`,
        tone: 'completed',
      },
    ]
  }, [allRows])

  const academicOptions = useMemo(
    () => ({
      academicYear: academicYears
        .map(item =>
          entityLabel(item, [
            'academicYearName',
            'name',
            'academicYear',
            'yearName',
          ])
        )
        .filter(Boolean),

      course: academicCourses
        .map(item =>
          entityLabel(item, [
            'courseName',
            'name',
            'course',
            'programName',
            'title',
          ])
        )
        .filter(Boolean),

      branch: branches
        .map(item =>
          entityLabel(item, [
            'branchName',
            'name',
            'branch',
            'title',
          ])
        )
        .filter(Boolean),

      semester: semesters
        .map(item =>
          entityLabel(item, [
            'semesterName',
            'name',
            'semesterNumber',
            'semester',
          ])
        )
        .filter(Boolean),

      section: sections
        .map(item =>
          entityLabel(item, [
            'sectionName',
            'name',
            'section',
            'code',
          ])
        )
        .filter(Boolean),

      registrationNumber: students
        .map(
          item =>
            item.registrationNumber ||
            item.application?.registrationNumber ||
            item.application?.number ||
            item.academic?.registrationNumber ||
            item.academic?.rollNumber
        )
        .filter(Boolean),

      studentName: students
        .map(
          item =>
            item.fullName ||
            item.personal?.fullName ||
            item.name ||
            item.studentName
        )
        .filter(Boolean),

      facultyName: facultyMembers
        .map(item =>
          entityLabel(item, [
            'fullName',
            'facultyName',
            'name',
          ])
        )
        .filter(Boolean),

      subject: [],

      subjectCode: [],

      examType: [
        ...fieldOptions.examType,
        ...subjects
          .map(item => item.examType)
          .filter(Boolean),
      ],

      assessmentType: [
        ...fieldOptions.assessmentType,
        ...subjects
          .map(item => item.assessmentType)
          .filter(Boolean),
      ],

      examDate: subjects
        .map(
          item =>
            item.examDate ||
            item.lastExamDate
        )
        .filter(Boolean),

      maximumMarks: subjects
        .flatMap(item => [
          item.internalMarks,
          item.externalMarks,
          item.maximumMarks,
          item.maxMarks,
        ])
        .filter(
          value =>
            value !== '' &&
            value != null
        ),

      passingMarks: subjects
        .flatMap(item => [
          item.passingMarks,
          item.internalPassingMarks,
          item.externalPassingMarks,
          item.minimumPassingMarks,
          item.minPassingMarks,
        ])
        .filter(
          value =>
            value !== '' &&
            value != null
        ),
    }),
    [
      academicYears,
      academicCourses,
      branches,
      semesters,
      sections,
      subjects,
      students,
      facultyMembers,
    ]
  )

  const filterOptions = useMemo(
    () => ({
      academicYear: uniqueValues([
        ...academicOptions.academicYear,
        ...allRows.map(row => row.academicYear),
      ]),

      course: uniqueValues([
        ...academicOptions.course,
        ...allRows.map(row => row.course),
      ]),

      branch: uniqueValues([
        ...academicOptions.branch,
        ...allRows.map(row => row.branch),
      ]),

      semester: uniqueValues([
        ...academicOptions.semester,
        ...allRows.map(row => row.semester),
      ]),

      section: uniqueValues([
        ...academicOptions.section,
        ...allRows.map(row => row.section),
      ]),

      subject: uniqueValues([
        ...subjects.map(item =>
          entityLabel(item, [
            'subjectName',
            'name',
          ])
        ),
        ...allRows.map(
          row =>
            row.subjectName ||
            row.subject
        ),
      ]),

      examType: uniqueValues([
        ...fieldOptions.examType,
        ...subjects.map(
          item => item.examType
        ),
        ...allRows.map(
          row => row.examType
        ),
      ]),

      assessmentType: uniqueValues([
        ...fieldOptions.assessmentType,
        ...subjects.map(
          item => item.assessmentType
        ),
        ...allRows.map(
          row => row.assessmentType
        ),
      ]),
    }),
    [
      academicOptions,
      allRows,
      subjects,
    ]
  )

  const filtered = useMemo(
    () =>
      allRows.filter(row => {
        const searchText = [
          row.studentName,
          row.registrationNumber,
          row.subjectCode,
          row.subjectName || row.subject,
          row.facultyName || row.faculty?.fullName || row.faculty?.facultyName || row.faculty?.name || row.faculty,
          row.examType,
          row.course,
          row.branch,
          row.semester,
          row.section,
          row.academicYear,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        const rowValues = {
          academicYear:
            row.academicYear,

          course: row.course,

          branch: row.branch,

          semester: row.semester,

          section: row.section,

          subject:
            row.subjectName ||
            row.subject,

          examType: row.examType,

          assessmentType:
            row.assessmentType,
        }

        return (
          (!query ||
            searchText.includes(
              query.toLowerCase()
            )) &&
          Object.entries(filters).every(
            ([key, value]) =>
              !value ||
              normalized(
                rowValues[key]
              ) === normalized(value)
          )
        )
      }),
    [
      allRows,
      query,
      filters,
    ]
  )

  const visible = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  )

  const setFilter = (
    key,
    value
  ) => {
    setFilters(current => ({
      ...current,
      [key]: value,
    }))

    setPage(1)
  }

  const clearFilters = () => {
    setQuery('')

    setFilters({
      academicYear: '',
      course: '',
      branch: '',
      semester: '',
      section: '',
      subject: '',
      examType: '',
      assessmentType: '',
    })

    setPage(1)
  }

  const hasFilters = Boolean(
    query ||
    Object.values(filters).some(Boolean)
  )

  const eligibleSubjects = useMemo(
    () =>
      subjects.filter(subject => {
        const selectedBranch =
          branches.find(
            item =>
              normalized(
                entityLabel(item, [
                  'name',
                  'branchName',
                  'branch',
                ])
              ) ===
              normalized(
                assessment.branch
              ) ||
              normalized(item.id) ===
              normalized(
                assessment.branch
              )
          )

        const selectedSemester =
          semesters.find(
            item =>
              normalized(
                entityLabel(item, [
                  'semesterName',
                  'name',
                  'semesterNumber',
                ])
              ) ===
              normalized(
                assessment.semester
              ) ||
              normalized(item.id) ===
              normalized(
                assessment.semester
              ) ||
              semesterNumber(
                entityLabel(item, [
                  'semesterName',
                  'name',
                  'semesterNumber',
                ])
              ) ===
              semesterNumber(
                assessment.semester
              )
          )

        const subjectBranchId =
          subject.branchId ??
          subject.branchID

        const subjectBranchName =
          subject.branchName ||
          (typeof subject.branch ===
            'string'
            ? subject.branch
            : '')

        const subjectSemesterId =
          subject.semesterId ??
          subject.semesterID

        const subjectSemesterName =
          subject.semesterName ||
          (typeof subject.semester ===
            'string'
            ? subject.semester
            : '')

        const branchMatches =
          !assessment.branch ||
          (selectedBranch &&
            subjectBranchId != null
            ? normalized(
              subjectBranchId
            ) ===
            normalized(
              selectedBranch.id ??
              selectedBranch.branchId
            )
            : normalized(
              subjectBranchName
            ) ===
            normalized(
              assessment.branch
            ))

        const semesterMatches =
          !assessment.semester ||
          (selectedSemester &&
            subjectSemesterId != null
            ? normalized(
              subjectSemesterId
            ) ===
            normalized(
              selectedSemester.id ??
              selectedSemester.semesterId
            )
            : semesterNumber(
              subjectSemesterName ||
              subjectSemesterId
            ) ===
            semesterNumber(
              assessment.semester
            ))

        return (
          branchMatches &&
          semesterMatches
        )
      }),
    [
      subjects,
      branches,
      semesters,
      assessment.branch,
      assessment.semester,
    ]
  )

  const suggestionOptions = {
    ...academicOptions,

    subject: eligibleSubjects
      .map(item =>
        entityLabel(item, [
          'subjectName',
          'name',
        ])
      )
      .filter(Boolean),

    subjectCode: eligibleSubjects
      .map(item => item.subjectCode)
      .filter(Boolean),
  }

  const savedAssessmentOptions = useMemo(() => ({
    academicYear: allRows.map(row => row.academicYear),
    course: allRows.map(row => row.course),
    branch: allRows.map(row => row.branch),
    semester: allRows.map(row => row.semester),
    section: allRows.map(row => row.section),
    registrationNumber: allRows.map(row => row.registrationNumber),
    studentName: allRows.map(row => row.studentName),
    subject: allRows.map(row => row.subjectName || row.subject),
    facultyName: allRows.map(row => row.facultyName || row.faculty?.fullName || row.faculty?.facultyName || row.faculty?.name || row.faculty),
    subjectCode: allRows.map(row => row.subjectCode),
    examType: allRows.map(row => row.examType),
    assessmentType: allRows.map(row => row.assessmentType),
    examDate: allRows.map(row => row.examDate),
    maximumMarks: allRows.flatMap(row => [row.maximumMarks, row.maxExternal]),
    passingMarks: allRows.map(row => row.passingMarks),
    studentMarks: allRows.map(row => row.studentMarks),
  }), [allRows])

  const updateAssessment = (
    key,
    value
  ) => {
    const matchedSubject =
      key === 'subject'
        ? eligibleSubjects.find(
          row =>
            normalized(
              row.subjectName ||
              row.subject
            ) ===
            normalized(value)
        )
        : null

    const matchedSavedSubject =
      key === 'subject'
        ? allRows.find(row => {
          const sameSubject = normalized(
            row.subjectName || row.subject
          ) === normalized(value)
          const sameBranch =
            !assessment.branch ||
            normalized(row.branch) === normalized(assessment.branch)
          const sameSemester =
            !assessment.semester ||
            semesterNumber(row.semester) ===
              semesterNumber(assessment.semester)

          return sameSubject && sameBranch && sameSemester
        })
        : null

    const matchedStudent = [
      'registrationNumber',
      'studentName',
    ].includes(key)
      ? students.find(student =>
        normalized(
          key ===
            'registrationNumber'
            ? student.registrationNumber
            : student.fullName ||
            student.personal
              ?.fullName ||
            student.name ||
            student.studentName
        ) === normalized(value)
      )
      : null

    setAssessment(current => ({
      ...current,

      [key]: value,

      ...(key === 'subject'
        ? {
          subjectCode:
            matchedSubject?.subjectCode ||
            matchedSavedSubject?.subjectCode ||
            '',
        }
        : {}),

      ...(key ===
        'registrationNumber' &&
        matchedStudent
        ? {
          studentName:
            matchedStudent.fullName ||
            matchedStudent.personal
              ?.fullName ||
            matchedStudent.name ||
            matchedStudent.studentName ||
            '',
        }
        : {}),

      ...(key === 'studentName' &&
        matchedStudent
        ? {
          registrationNumber:
            matchedStudent.registrationNumber ||
            matchedStudent.application
              ?.registrationNumber ||
            matchedStudent.application
              ?.number ||
            matchedStudent.academic
              ?.registrationNumber ||
            matchedStudent.academic
              ?.rollNumber ||
            '',
        }
        : {}),

      ...(['branch', 'semester'].includes(
        key
      )
        ? {
          subject: '',
          subjectCode: '',
        }
        : {}),
    }))
  }

  const submitAssessment = event => {
    event.preventDefault()

    const {
      percentage,
      examStatus,
    } = getMarksSummary(assessment)

    const record = {
      ...assessment,

      id:
        editingId ||
        `draft-${Date.now()}`,

      subjectName:
        assessment.subject,

      percentage,

      examStatus,

      totalStudents: 0,

      passedCount: 0,

      failedCount: 0,

      status: 'Draft',
    }

    setDraftRows(current =>
      editingId
        ? current.map(row =>
          row.id === editingId
            ? {
              ...row,
              ...record,
            }
            : row
        )
        : [record, ...current]
    )

    setShowAddForm(false)
    setEditingId('')
    setAssessment(initialAssessment)
    setPage(1)
  }

  const editAssessment = row => {
    setEditingId(row.id)

    setAssessment({
      ...initialAssessment,
      ...row,
      subject:
        row.subject ||
        row.subjectName ||
        '',
    })

    setActiveSuggestion('')
    setShowAddForm(true)
  }

  const deleteAssessment = row => {
    setDeletingRow(row)
  }

  const confirmDeleteAssessment = () => {
    if (!deletingRow) return

    const deletedId =
      deletingRow.id

    setDraftRows(current =>
      current.filter(
        item => item.id !== deletedId
      )
    )

    setDeletingRow(null)
    setPage(1)
  }

  return (
    <DashboardLayout>
      <section className="marks-management-marks-entry">
        <PageHeader
          className="marks-module-page-header marks-entry-page-header"
          title="Marks Entry"
          subtitle="Enter and review student marks across exams and assessments."
          breadcrumb={[
            {
              label: 'Marks Management',
              link: '/marks-management',
            },
            'Marks Entry',
          ]}
          compactSummary={summaryStats}
        />

        <MarksModuleNav />

        <article className="erp-card marks-entry-card">
          <header className="erp-card-header marks-entry-card__header">
            <div>
              <h2 className="erp-card-title">
                Marks Records
              </h2>

              <p className="erp-card-subtitle">
                Review and manage submitted marks with compact, high-density records.
              </p>
            </div>
          </header>

          {deletingRow &&
            createPortal(
              <div
                className="marks-entry-delete-backdrop"
                onMouseDown={() =>
                  setDeletingRow(null)
                }
              >
                <section
                  className="marks-entry-delete-modal"
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="marks-entry-delete-title"
                  aria-describedby="marks-entry-delete-description"
                  onMouseDown={event =>
                    event.stopPropagation()
                  }
                >
                  <header className="marks-entry-delete-modal__header">
                    <span className="marks-entry-delete-modal__icon">
                      <FiTrash2 aria-hidden="true" />
                    </span>

                    <div>
                      <h2 id="marks-entry-delete-title">
                        Delete Marks Confirmation
                      </h2>

                      <p>
                        Marks record deletion
                        confirmation.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="marks-entry-delete-modal__close"
                      onClick={() =>
                        setDeletingRow(null)
                      }
                      aria-label="Close confirmation"
                    >
                      <FiX aria-hidden="true" />
                    </button>
                  </header>

                  <div className="marks-entry-delete-modal__body">
                    <div className="marks-entry-delete-record">
                      <span className="marks-entry-delete-record__badge">
                        MARKS
                      </span>

                      <div>
                        <strong>
                          {deletingRow.studentName ||
                            deletingRow.registrationNumber ||
                            'Student marks'}
                        </strong>

                        <p>
                          {[
                            deletingRow.subjectName ||
                            deletingRow.subject,
                            deletingRow.subjectCode,
                            deletingRow.examType,
                            deletingRow.course,
                            deletingRow.branch,
                            deletingRow.section,
                          ]
                            .filter(Boolean)
                            .join(' | ') ||
                            'Marks entry record'}
                        </p>
                      </div>
                    </div>

                    <p
                      id="marks-entry-delete-description"
                      className="marks-entry-delete-modal__message"
                    >
                      Are you sure you want
                      to permanently delete
                      this marks record? This
                      action cannot be undone.
                    </p>
                  </div>

                  <footer className="marks-entry-delete-modal__footer">
                    <button
                      type="button"
                      className="marks-entry-delete-modal__cancel"
                      onClick={() =>
                        setDeletingRow(null)
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="marks-entry-delete-modal__confirm"
                      onClick={
                        confirmDeleteAssessment
                      }
                    >
                      <FiTrash2 aria-hidden="true" />
                      Confirm &amp; Delete Marks
                    </button>
                  </footer>
                </section>
              </div>,
              document.body
            )}

          <FilterPanel
            active={hasFilters}
            onClear={clearFilters}
            className="marks-entry-filters"
            actions={
              <div className="marks-entry-card__actions">
                <ExportMenu
                  rows={filtered}
                  columns={columns}
                  title="Marks Entry Records"
                  filename="marks-entry-records"
                  scope="All matching marks"
                  allowEmpty
                  printLabel="Save as PDF"
                />

                <button
                  type="button"
                  className="erp-btn erp-btn--primary"
                  onClick={() => {
                    setEditingId('')
                    setAssessment(
                      initialAssessment
                    )
                    setShowAddForm(true)
                  }}
                >
                  <FiPlus />
                  Add Marks
                </button>
              </div>
            }
          >
            <div className="marks-entry-search-wrap">
              <label className="marks-entry-search">
                <FiSearch aria-hidden="true" />

                <input
                  aria-label="Search marks records"
                  placeholder="Search student, reg number, subject, exam or class"
                  value={query}
                  onChange={event => {
                    setQuery(
                      event.target.value
                    )
                    setPage(1)
                  }}
                />
              </label>
            </div>

            {[
              [
                'academicYear',
                'Academic Year',
                'All academic years',
              ],
              [
                'course',
                'Course',
                'All courses',
              ],
              [
                'branch',
                'Branch',
                'All branches',
              ],
              [
                'semester',
                'Semester',
                'All semesters',
              ],
              [
                'section',
                'Section',
                'All sections',
              ],
              [
                'subject',
                'Subject',
                'All subjects',
              ],
              [
                'examType',
                'Exam Type',
                'All exam types',
              ],
              [
                'assessmentType',
                'Assessment Type',
                'All assessment types',
              ],
            ].map(
              ([
                key,
                label,
                placeholder,
              ]) => (
                <label
                  className="marks-entry-filter"
                  key={key}
                >
                  <span>{label}</span>

                  <ProjectSelect
                    aria-label={`Filter by ${label}`}
                    value={filters[key]}
                    onChange={event =>
                      setFilter(
                        key,
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      {placeholder}
                    </option>

                    {filterOptions[key].map(
                      value => (
                        <option
                          key={value}
                          value={value}
                        >
                          {value}
                        </option>
                      )
                    )}
                  </ProjectSelect>
                </label>
              )
            )}
          </FilterPanel>

          {showAddForm &&
            createPortal(
              <div
                className={`marks-entry-modal${localStorage.getItem(
                  'pirnav-sidebar-collapsed'
                ) === 'true'
                    ? ' sidebar-collapsed'
                    : ''
                  }`}
                onMouseDown={() =>
                  setShowAddForm(false)
                }
              >
                <form
                  className="marks-entry-form"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="marks-entry-form-title"
                  onMouseDown={event =>
                    event.stopPropagation()
                  }
                  onSubmit={
                    submitAssessment
                  }
                >
                  <div className="marks-entry-form__heading">
                    <div>
                      <h3 id="marks-entry-form-title">
                        {editingId
                          ? 'Edit Marks Assessment'
                          : 'Add Marks Assessment'}
                      </h3>

                      <p>
                        Enter the assessment
                        details. Existing
                        values are available
                        as suggestions.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="marks-entry-form__close"
                      onClick={() => {
                        setShowAddForm(false)
                        setEditingId('')
                      }}
                      aria-label="Close form"
                    >
                      &times;
                    </button>
                  </div>

                  <div className="marks-entry-form__body">
                    <div className="marks-entry-form__grid">
                      {[
                        [
                          'academicYear',
                          'Academic Year',
                        ],
                        [
                          'course',
                          'Course',
                        ],
                        [
                          'branch',
                          'Branch',
                        ],
                        [
                          'semester',
                          'Semester',
                        ],
                        [
                          'section',
                          'Section',
                        ],
                        [
                          'registrationNumber',
                          'Registration Number',
                        ],
                        [
                          'studentName',
                          'Student Name',
                        ],
                        [
                          'subject',
                          'Subject',
                        ],
                        [
                          'facultyName',
                          'Faculty Name',
                        ],
                        [
                          'subjectCode',
                          'Subject Code',
                        ],
                        [
                          'examType',
                          'Exam Type',
                        ],
                        [
                          'assessmentType',
                          'Assessment Type',
                        ],
                        [
                          'examDate',
                          'Exam Date',
                        ],
                        [
                          'maximumMarks',
                          'Maximum Marks',
                        ],
                        [
                          'passingMarks',
                          'Passing Marks',
                        ],
                        [
                          'studentMarks',
                          'Student Marks',
                        ],
                        [
                          'examStatus',
                          'Exam Status',
                        ],
                        [
                          'percentage',
                          'Percentage',
                        ],
                      ].map(
                        ([key, label]) => {
                          const suggestions =
                            uniqueValues([
                              ...(fieldOptions[
                                key
                              ] || []),
                              ...(suggestionOptions[
                                key
                              ] || []),
                              ...(savedAssessmentOptions[
                                key
                              ] || []),
                            ])

                          const matches =
                            suggestions.filter(
                              value =>
                                !assessment[
                                key
                                ] ||
                                normalized(
                                  value
                                ).includes(
                                  normalized(
                                    assessment[
                                    key
                                    ]
                                  )
                                )
                            )

                          const summary =
                            getMarksSummary(
                              assessment
                            )

                          const isDerived =
                            key ===
                            'examStatus' ||
                            key ===
                            'percentage'

                          const fieldValue =
                            key ===
                              'examStatus'
                              ? summary.examStatus
                              : key ===
                                'percentage'
                                ? summary.percentage
                                : assessment[
                                key
                                ]

                          return (
                            <label
                              className="marks-entry-form__field"
                              key={key}
                            >
                              <span>
                                {label}
                              </span>

                              <div
                                className={`marks-entry-input-combo${key ===
                                    'examDate'
                                    ? ' marks-entry-input-combo--datetime'
                                    : ''
                                  }`}
                              >
                                <input
                                  type={
                                    [
                                      'maximumMarks',
                                      'passingMarks',
                                      'studentMarks',
                                    ].includes(
                                      key
                                    )
                                      ? 'number'
                                      : key ===
                                        'examDate'
                                        ? 'datetime-local'
                                        : 'text'
                                  }
                                  value={
                                    fieldValue ??
                                    ''
                                  }
                                  min={
                                    key ===
                                      'maximumMarks'
                                      ? 1
                                      : [
                                        'passingMarks',
                                        'studentMarks',
                                      ].includes(
                                        key
                                      )
                                        ? 0
                                        : undefined
                                  }
                                  max={
                                    key ===
                                      'passingMarks' ||
                                      key ===
                                      'studentMarks'
                                      ? assessment.maximumMarks ||
                                      undefined
                                      : undefined
                                  }
                                  step={
                                    [
                                      'maximumMarks',
                                      'passingMarks',
                                      'studentMarks',
                                    ].includes(
                                      key
                                    )
                                      ? 'any'
                                      : undefined
                                  }
                                  readOnly={
                                    isDerived
                                  }
                                  required={
                                    !isDerived
                                  }
                                  autoComplete="off"
                                  role={
                                    isDerived
                                      ? undefined
                                      : 'combobox'
                                  }
                                  aria-autocomplete={
                                    isDerived
                                      ? undefined
                                      : 'list'
                                  }
                                  aria-expanded={
                                    !isDerived &&
                                    activeSuggestion ===
                                    key &&
                                    matches.length >
                                    0
                                  }
                                  onFocus={() =>
                                    !isDerived &&
                                    setActiveSuggestion(
                                      key
                                    )
                                  }
                                  onClick={() =>
                                    !isDerived &&
                                    setActiveSuggestion(
                                      key
                                    )
                                  }
                                  onBlur={() =>
                                    window.setTimeout(
                                      () =>
                                        setActiveSuggestion(
                                          current =>
                                            current ===
                                              key
                                              ? ''
                                              : current
                                        ),
                                      120
                                    )
                                  }
                                  onChange={event => {
                                    updateAssessment(
                                      key,
                                      event.target
                                        .value
                                    )
                                    setActiveSuggestion(
                                      key
                                    )
                                  }}
                                />

                                {!isDerived &&
                                  activeSuggestion ===
                                  key &&
                                  matches.length >
                                  0 && (
                                    <div
                                      className="marks-entry-suggestions"
                                      role="listbox"
                                    >
                                      {matches.map(
                                        value => (
                                          <button
                                            type="button"
                                            role="option"
                                            key={value}
                                            onMouseDown={event =>
                                              event.preventDefault()
                                            }
                                            onClick={() => {
                                              updateAssessment(
                                                key,
                                                String(
                                                  value
                                                )
                                              )
                                              setActiveSuggestion(
                                                ''
                                              )
                                            }}
                                          >
                                            {value}
                                          </button>
                                        )
                                      )}
                                    </div>
                                  )}
                              </div>
                            </label>
                          )
                        }
                      )}
                    </div>

                    <aside className="marks-entry-form__preview">
                      <div className="marks-entry-form__preview-head">
                        <span className="marks-entry-live-dot" />

                        Live Preview

                        <small>
                          Updates as you type
                        </small>
                      </div>

                      <h4>
                        {assessment.subject ||
                          'New Assessment'}
                      </h4>

                      <dl>
                        {[
                          [
                            'Academic Year',
                            assessment.academicYear,
                          ],
                          [
                            'Course / Branch',
                            [
                              assessment.course,
                              assessment.branch,
                            ]
                              .filter(Boolean)
                              .join(' / '),
                          ],
                          [
                            'Semester',
                            assessment.semester,
                          ],
                          [
                            'Section',
                            assessment.section,
                          ],
                          [
                            'Registration Number',
                            assessment.registrationNumber,
                          ],
                          [
                            'Student Name',
                            assessment.studentName,
                          ],
                          [
                            'Faculty Name',
                            assessment.facultyName,
                          ],
                          [
                            'Subject Code',
                            assessment.subjectCode,
                          ],
                          [
                            'Exam',
                            assessment.examType,
                          ],
                          [
                            'Assessment',
                            assessment.assessmentType,
                          ],
                          [
                            'Exam Date',
                            assessment.examDate,
                          ],
                          [
                            'Maximum / Passing',
                            `${assessment.maximumMarks} / ${assessment.passingMarks}`,
                          ],
                        ].map(
                          ([label, value]) => (
                            <div key={label}>
                              <dt>{label}</dt>
                              <dd>
                                {value || '—'}
                              </dd>
                            </div>
                          )
                        )}
                      </dl>
                    </aside>
                  </div>

                  <div className="marks-entry-form__footer">
                    <button
                      type="submit"
                      className="erp-btn erp-btn--primary"
                    >
                      {editingId
                        ? 'Save Changes'
                        : 'Confirm'}
                    </button>
                  </div>
                </form>
              </div>,
              document.body
            )}

          <div className="marks-entry-table-wrap">
            <table className="erp-table marks-entry-records-table">
              <colgroup>
                <col className="marks-entry-col-student" />
                <col className="marks-entry-col-academic" />
                <col className="marks-entry-col-subject" />
                <col className="marks-entry-col-faculty" />
                <col className="marks-entry-col-exam" />
                <col className="marks-entry-col-score" />
                <col className="marks-entry-col-result" />
                <col className="marks-entry-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  {[
                    'Student Details',
                    'Class & Academic',
                    'Subject',
                    'Faculty Name',
                    'Exam & Assessment',
                    'Marks Scored',
                    'Result & %',
                    'Actions',
                  ].map(label => (
                    <th key={label}>
                      {label}
                    </th>
                  ))}

                </tr>
              </thead>

              <tbody>
                {visible.map((row, index) => {
                  const summary = getMarksSummary(row)
                  const result = row.examStatus || summary.examStatus
                  const resultClass = result === 'Pass'
                    ? 'is-pass'
                    : result === 'Fail'
                      ? 'is-fail'
                      : 'is-pending'
                  const percentage = row.percentage || summary.percentage
                  const studentName = row.studentName || row.registrationNumber || 'Student'
                  const score = row.studentMarks !== '' && row.studentMarks != null
                    ? row.studentMarks
                    : '—'
                  const maximum = row.maximumMarks || row.maxExternal || '—'
                  const examDate = row.examDate
                    ? String(row.examDate).replace('T', ' ').slice(0, 16)
                    : ''

                  return (
                    <tr key={row.id || row.registrationNumber || index}>
                      <td className="marks-entry-student-cell">
                        <div className="marks-entry-student-layout">
                          <span className="marks-entry-student-avatar" aria-hidden="true">
                            {studentName.trim().charAt(0).toUpperCase()}
                          </span>
                          <span className="marks-entry-student-copy">
                            <strong>{studentName}</strong>
                            <small>{row.registrationNumber || '—'}</small>
                          </span>
                        </div>
                      </td>

                      <td
                        className="marks-entry-academic-cell"
                        title={[
                          ['Course', row.course],
                          ['Branch', row.branch],
                          ['Semester', row.semester],
                          ['Section', row.section],
                          ['Academic Year', row.academicYear],
                        ]
                          .filter(([, value]) => value)
                          .map(([label, value]) => `${label}: ${value}`)
                          .join('\n') || 'Academic details unavailable'}
                      >
                        <div className="marks-entry-academic-copy">
                          <strong>{[row.course, row.branch].filter(Boolean).join(' · ') || '—'}</strong>
                          <span>
                            {[row.semester, row.section].filter(Boolean).join(' · ')}
                            {[row.semester, row.section].some(Boolean) && row.academicYear ? '  ' : ''}
                            {row.academicYear}
                          </span>
                          <div className="marks-entry-academic-lines">
                            {[
                              ['Course', row.course],
                              ['Branch', row.branch],
                              [
                                'Academic details',
                                [row.semester, row.section, row.academicYear]
                                  .filter(Boolean)
                                  .join(' · '),
                              ],
                            ].map(([label, value]) => (
                            <span key={label}>{value || '—'}</span>
                            ))}
                          </div>
                        </div>
                      </td>

                      <td className="marks-entry-subject-cell">
                        <div className="marks-entry-subject-copy">
                          <strong>{row.subjectName || row.subject || '—'}</strong>
                          {row.subjectCode && <span>{row.subjectCode}</span>}
                        </div>
                      </td>

                      <td className="marks-entry-faculty-cell">
                        <strong>{row.facultyName || row.faculty?.fullName || row.faculty?.facultyName || row.faculty?.name || row.faculty || '—'}</strong>
                      </td>

                      <td className="marks-entry-exam-cell">
                        <div className="marks-entry-exam-copy">
                          <span className="marks-entry-exam-pill">{row.examType || 'Exam not set'}</span>
                          {row.assessmentType && (
                            <span className="marks-entry-assessment-pill">{row.assessmentType}</span>
                          )}
                          {examDate && <small>{examDate}</small>}
                        </div>
                      </td>

                      <td className="marks-entry-score-cell">
                        <div className="marks-entry-score-copy">
                          <strong>{score}</strong>
                          <span>/ {maximum}</span>
                          {row.passingMarks != null && row.passingMarks !== '' && (
                            <small>Min: {row.passingMarks}</small>
                          )}
                        </div>
                      </td>

                      <td className="marks-entry-result-cell">
                        <div className="marks-entry-result-copy">
                          <span className={'marks-entry-result-pill ' + resultClass}>
                            <i aria-hidden="true" />
                            {result || 'Pending'}
                          </span>
                          {percentage && <strong>{percentage}</strong>}
                        </div>
                      </td>

                      <td className="marks-entry-actions-cell">
                        <div className="marks-entry-row-actions">
                          <button
                            type="button"
                            className="table-action-btn marks-entry-row-action marks-entry-row-action--edit"
                            title="Edit marks"
                            aria-label={'Edit marks for ' + studentName}
                            onClick={() => editAssessment(row)}
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="table-action-btn marks-entry-row-action marks-entry-row-action--delete"
                            title="Delete marks"
                            aria-label={'Delete marks for ' + studentName}
                            onClick={() => deleteAssessment(row)}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <EmptyState
                title={
                  hasFilters
                    ? 'No matching marks records'
                    : 'No marks have been entered yet'
                }
                description={
                  hasFilters
                    ? 'Adjust or clear the filters to see more records.'
                    : 'Add marks to create the first result sheet.'
                }
              />
            )}
          </div>

          {filtered.length > PAGE_SIZE && (
            <TablePagination
              currentPage={page}
              totalPages={Math.ceil(
                filtered.length / PAGE_SIZE
              )}
              onPageChange={setPage}
            />
          )}
        </article>
      </section>
    </DashboardLayout>
  )
}

return { default: MarksEntry }
})()

// MarksManagement screen and private helpers.
const MarksManagementScreen = (() => {
const Navigate = react_router_domImports_Navigate

function MarksManagement() {
  return <Navigate to="/marks-management/marks-entry" replace />
}

return { default: MarksManagement }
})()

// StudentMarks screen and private helpers.
const StudentMarksScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const useEffect = reactImports_useEffect
const useMemo = reactImports_useMemo
const useState = reactImports_useState
const FiSearch = fiImports_FiSearch
const FiUser = fiImports_FiUser
const DashboardLayout = DashboardLayoutImports_default
const PageHeader = PageHeaderImports_default
const MarksModuleNav = MarksModuleNavScreen.default
const FilterPanel = FilterPanelImports_default
const ExportMenu = ExportMenuImports_default
const TablePagination = TablePaginationImports_default
const EmptyState = EmptyStateImports_default
const resultsService = resultsServiceImports_default
const academicService = academicServiceImports_default
const getExamTypes = examServiceImports_getExamTypes
const studentService = studentServiceImports_default

const PAGE_SIZE = 10
const clean = value => String(value ?? '').trim()
const normalized = value => clean(value).toLowerCase()
const firstValue = (...values) => values.find(value => value !== undefined && value !== null && clean(value) !== '')
const displayValue = value => {
  if (value && typeof value === 'object') return firstValue(value.name, value.label, value.title, value.value, value.semesterName, '')
  return value
}
const getStudentId = student => clean(firstValue(student?.studentId, student?.id))
const getStudentName = student => clean(firstValue(student?.fullName, student?.personal?.fullName, student?.studentName, student?.name, 'Student'))
const getRegistrationNumber = student => clean(firstValue(student?.registrationNumber, student?.application?.registrationNumber, student?.application?.number, student?.academic?.registrationNumber, student?.academic?.rollNumber, student?.rollNumber, ''))

const columns = [
  ['studentName', 'Student Name'], ['registrationNumber', 'Registration Number'], ['academicYear', 'Academic Year'], ['course', 'Course'], ['branch', 'Branch'], ['semester', 'Semester'], ['section', 'Section'],
  ['subjectCode', 'Subject Code'], ['subjectName', 'Subject'], ['examType', 'Exam Type'], ['assessmentType', 'Assessment Type'], ['examDate', 'Exam Date'],
  ['maxInternal', 'Max Internal'], ['internalMarks', 'Internal Marks'], ['maxExternal', 'Max External'], ['externalMarks', 'External Marks'],
  ['maximumMarks', 'Maximum Marks'], ['passingMarks', 'Passing Marks'], ['totalMarks', 'Total Marks'], ['grade', 'Grade'], ['gradePoint', 'Grade Point'], ['status', 'Result'],
].map(([key, label]) => ({ key, value: key, label }))
const matchesStudent = (record, student) => {
  const selectedId = getStudentId(student)
  const resultIds = [record.studentId, record.studentProfileId, record.student?.studentId, record.student?.id, record.profileId].map(normalized).filter(Boolean)
  if (selectedId && resultIds.includes(normalized(selectedId))) return true

  const selectedRegistration = normalized(getRegistrationNumber(student))
  const resultRegistration = normalized(firstValue(record.registrationNumber, record.rollNumber, record.enrollmentNo, record.admissionNumber, record.student?.registrationNumber, record.student?.rollNumber, ''))
  if (selectedRegistration && resultRegistration) return selectedRegistration === resultRegistration

  const hasStrongId = Boolean(selectedId || resultIds.length || selectedRegistration || resultRegistration)
  return !hasStrongId && normalized(firstValue(record.studentName, record.name, record.student?.name, '')) === normalized(getStudentName(student))
}

const resultRow = (sheet, record, student, index) => {
  const maxInternal = firstValue(sheet.maxInternal, sheet.maximumInternalMarks, sheet.internalMaxMarks, record.maxInternal, '')
  const maxExternal = firstValue(sheet.maxExternal, sheet.maximumExternalMarks, sheet.externalMaxMarks, record.maxExternal, '')
  const totalMaximum = maxInternal !== '' && maxExternal !== '' && Number.isFinite(Number(maxInternal)) && Number.isFinite(Number(maxExternal))
    ? Number(maxInternal) + Number(maxExternal)
    : ''
  const internalMarks = firstValue(record.internalMarks, record.internal, record.internalScore, '')
  const externalMarks = firstValue(record.externalMarks, record.external, record.externalScore, '')
  const totalMarks = firstValue(record.totalMarks, record.marksObtained, record.obtainedMarks,
    internalMarks !== '' && externalMarks !== '' ? Number(internalMarks) + Number(externalMarks) : '', '')
  const sheetId = firstValue(sheet.id, sheet.resultId, sheet.resultSheetId, sheet.subjectCode, `exam-${index}`)

  return {
    id: `${sheetId}-${getStudentId(student)}-${index}`,
    studentName: getStudentName(student),
    registrationNumber: getRegistrationNumber(student),
    academicYear: displayValue(firstValue(sheet.academicYear, sheet.academicYearName, student.academic?.academicYear, '')),
    course: displayValue(firstValue(sheet.course, sheet.courseName, student.academic?.course, '')),
    branch: displayValue(firstValue(sheet.branch, sheet.branchName, student.academic?.branch, '')),
    semester: displayValue(firstValue(sheet.semester, sheet.semesterName, student.academic?.semester, '')),
    section: displayValue(firstValue(sheet.section, sheet.sectionName, student.academic?.section, '')),
    subjectCode: firstValue(sheet.subjectCode, record.subjectCode, ''),
    subjectName: firstValue(sheet.subjectName, sheet.subject, record.subjectName, record.subject, ''),
    examType: firstValue(sheet.examType, sheet.examName, sheet.examinationName, record.examType, ''),
    assessmentType: firstValue(sheet.assessmentType, record.assessmentType, ''),
    examDate: firstValue(sheet.examDate, sheet.examinationDate, sheet.date, record.examDate, ''),
    maxInternal,
    internalMarks,
    maxExternal,
    externalMarks,
    maximumMarks: firstValue(sheet.maximumMarks, sheet.maxMarks, record.maximumMarks, totalMaximum, ''),
    passingMarks: firstValue(sheet.passingMarks, sheet.minimumPassingMarks, record.passingMarks, ''),
    totalMarks,
    grade: firstValue(record.grade, record.resultGrade, ''),
    gradePoint: firstValue(record.gradePoint, record.points, ''),
    status: firstValue(record.status, record.resultStatus, ''),
  }
}

function StudentMarks() {
  const [students, setStudents] = useState([])
  const [resultSheets, setResultSheets] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [course, setCourse] = useState('')
  const [branch, setBranch] = useState('')
  const [semester, setSemester] = useState('')
  const [examType, setExamType] = useState('')
  const [page, setPage] = useState(1)
  const [studentSearch, setStudentSearch] = useState('')
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false)
  const [lookupOptions, setLookupOptions] = useState({ academicYears: [], courses: [], branches: [], examTypes: [] })

  useEffect(() => {
    let active = true
    Promise.allSettled([studentService.getAllProfiles(), resultsService.getResults()]).then(([studentsResult, sheetsResult]) => {
      if (!active) return
      if (studentsResult.status === 'fulfilled') setStudents(Array.isArray(studentsResult.value) ? studentsResult.value : [])
      if (sheetsResult.status === 'fulfilled') setResultSheets(Array.isArray(sheetsResult.value) ? sheetsResult.value : [])
      const errors = [studentsResult, sheetsResult].filter(result => result.status === 'rejected')
      if (errors.length) setLoadError(errors.map(result => result.reason?.message).filter(Boolean).join(' ') || 'Some marks data could not be loaded.')
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    Promise.allSettled([
      academicService.getAcademicYears(false),
      academicService.getCourses({}, false),
      academicService.getBranches(null, false),
      Promise.resolve(getExamTypes()),
    ]).then(([years, courses, branches, exams]) => {
      if (!active) return
      setLookupOptions({
        academicYears: years.status === 'fulfilled' && Array.isArray(years.value) ? years.value : [],
        courses: courses.status === 'fulfilled' && Array.isArray(courses.value) ? courses.value : [],
        branches: branches.status === 'fulfilled' && Array.isArray(branches.value) ? branches.value : [],
        examTypes: exams.status === 'fulfilled' && Array.isArray(exams.value) ? exams.value : [],
      })
    })
    return () => { active = false }
  }, [])

  const studentOptions = useMemo(() => [...students].sort((left, right) => getStudentName(left).localeCompare(getStudentName(right))), [students])
  const selectedStudent = studentOptions.find(student => getStudentId(student) === selectedStudentId)
  const matchingStudents = studentOptions.filter(student => (getStudentName(student) + ' ' + getRegistrationNumber(student)).toLowerCase().includes(studentSearch.trim().toLowerCase()))
  const studentRows = useMemo(() => {
    if (!selectedStudent) return []
    return resultSheets.flatMap((sheet, index) => (Array.isArray(sheet.records) ? sheet.records : [])
      .filter(record => matchesStudent(record, selectedStudent))
      .map(record => resultRow(sheet, record, selectedStudent, index)))
  }, [resultSheets, selectedStudent])

  const optionsFor = key => {
    if (key === 'semester') return Array.from({ length: 8 }, (_, index) => 'Semester ' + (index + 1))
    const values = studentRows.map(row => row[key])
    const add = value => { const label = clean(displayValue(value)); if (label) values.push(label) }
    if (key === 'academicYear') {
      lookupOptions.academicYears.forEach(item => add(firstValue(item.name, item.academicYearName, item.label)))
      students.forEach(student => add(firstValue(student.academic?.academicYear, student.academicYear)))
      resultSheets.forEach(sheet => add(firstValue(sheet.academicYear, sheet.academicYearName)))
    }
    if (key === 'course') {
      lookupOptions.courses.forEach(item => add(firstValue(item.name, item.courseName, item.label)))
      students.forEach(student => add(firstValue(student.academic?.course, student.academic?.courseName, student.course)))
      resultSheets.forEach(sheet => add(firstValue(sheet.course, sheet.courseName)))
    }
    if (key === 'branch') {
      lookupOptions.branches.forEach(item => add(firstValue(item.name, item.branchName, item.label)))
      students.forEach(student => add(firstValue(student.academic?.branch, student.academic?.branchName, student.branch)))
      resultSheets.forEach(sheet => add(firstValue(sheet.branch, sheet.branchName)))
    }
    if (key === 'examType') {
      lookupOptions.examTypes.forEach(item => add(firstValue(item.name, item.examType, item.examTypeName, item.label, item)))
      resultSheets.forEach(sheet => {
      add(firstValue(sheet.examType, sheet.examName, sheet.examinationName))
      ;(Array.isArray(sheet.records) ? sheet.records : []).forEach(record => add(firstValue(record.examType, record.assessmentType)))
      })
    }
    return [...new Set(values.map(value => clean(displayValue(value))).filter(Boolean))].sort((left, right) => left.localeCompare(right))
  }
  const filteredRows = useMemo(() => studentRows.filter(row => {
    const search = query.trim().toLowerCase()
    const matchesSearch = !search || `${row.subjectCode} ${row.subjectName} ${row.examType} ${row.assessmentType}`.toLowerCase().includes(search)
    return matchesSearch
      && (!academicYear || row.academicYear === academicYear)
      && (!course || row.course === course)
      && (!branch || row.branch === branch)
      && (!semester || clean(row.semester).toLowerCase().replace(/^semester\s*/, '') === semester.toLowerCase().replace(/^semester\s*/, ''))
      && (!examType || row.examType === examType)
  }), [studentRows, query, academicYear, course, branch, semester, examType])
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasFilters = Boolean(query || academicYear || course || branch || semester || examType)

  const selectStudent = value => {
    setSelectedStudentId(value)
    setAcademicYear('')
    setCourse('')
    setBranch('')
    setSemester('')
    setExamType('')
    setQuery('')
    setPage(1)
  }
  const clearFilters = () => {
    setQuery('')
    setAcademicYear('')
    setCourse('')
    setBranch('')
    setSemester('')
    setExamType('')
    setPage(1)
  }

  return (
    <DashboardLayout>
      <section className="marks-management-student-marks">
        <PageHeader
          className="marks-module-page-header"
          title="Student Marks"
          subtitle="Look up a student to review their examination history across subjects."
          breadcrumb={[{ label: 'Marks Management', link: '/marks-management' }, 'Student Marks']}
          compactSummary={[
            { label: 'Students', value: studentOptions.length, tone: 'warning' },
            { label: 'Result Sheets', value: resultSheets.length },
            { label: 'Student Records', value: selectedStudent ? studentRows.length : '—', tone: 'completed' },
            { label: 'Matching Records', value: selectedStudent ? filteredRows.length : '—', tone: 'active' },
          ]}
        />
        <MarksModuleNav />

        <article className="erp-card student-marks-card">
          <header className="erp-card-header student-marks-card__header">
            <div><h2 className="erp-card-title">{selectedStudent ? `${getStudentName(selectedStudent)} â€” Marks` : 'Student Marks Records'}</h2><p className="erp-card-subtitle">{selectedStudent ? 'Showing this studentâ€™s details and examination marks.' : 'Select one student to view only their details and marks.'}</p></div>
            {selectedStudent && <div className="student-marks-header-actions"><span className="student-marks-count">{filteredRows.length} {filteredRows.length === 1 ? 'record' : 'records'}</span><button type="button" className="student-marks-back-button" onClick={() => selectStudent('')}>Change Student</button></div>}
          </header>

          {!selectedStudent && <div className="student-marks-student-picker">
            <FiUser aria-hidden="true" />
            <div className="student-marks-student-field"><label htmlFor="student-marks-student-search">Student Name</label><div className="student-marks-student-searchbox"><FiSearch aria-hidden="true" /><input id="student-marks-student-search" type="text" role="combobox" aria-autocomplete="list" aria-expanded={studentDropdownOpen} aria-controls="student-marks-student-options" placeholder={loading ? 'Loading students…' : 'Search or select a student'} value={studentDropdownOpen ? studentSearch : selectedStudent ? (getStudentName(selectedStudent) + (getRegistrationNumber(selectedStudent) ? ' · ' + getRegistrationNumber(selectedStudent) : '')) : studentSearch} disabled={loading || !studentOptions.length} onFocus={() => { setStudentSearch(''); setStudentDropdownOpen(true) }} onClick={() => { if (!studentDropdownOpen) { setStudentSearch(''); setStudentDropdownOpen(true) } }} onChange={event => { setStudentSearch(event.target.value); setStudentDropdownOpen(true) }} onKeyDown={event => { if (event.key === 'Escape') setStudentDropdownOpen(false); if (event.key === 'Enter' && matchingStudents.length) { event.preventDefault(); selectStudent(getStudentId(matchingStudents[0])); setStudentDropdownOpen(false) } }} /></div>{studentDropdownOpen && <ul className="student-marks-student-options" id="student-marks-student-options" role="listbox" aria-label="Students">{matchingStudents.length ? matchingStudents.map(student => <li key={getStudentId(student)} role="option" aria-selected={getStudentId(student) === selectedStudentId}><button type="button" onClick={() => { selectStudent(getStudentId(student)); setStudentDropdownOpen(false); setStudentSearch('') }}><strong>{getStudentName(student)}</strong>{getRegistrationNumber(student) && <span>{getRegistrationNumber(student)}</span>}</button></li>) : <li className="student-marks-student-empty">No students match this search.</li>}</ul>}</div>
          </div>}

          {selectedStudent && <div className="student-marks-profile">
            <div><small>Student</small><strong>{getStudentName(selectedStudent)}</strong></div>
            <div><small>Registration Number</small><strong>{getRegistrationNumber(selectedStudent) || 'â€”'}</strong></div>
            <div><small>Course / Branch</small><strong>{[displayValue(selectedStudent.academic?.course), displayValue(selectedStudent.academic?.branch)].filter(Boolean).join(' / ') || 'â€”'}</strong></div>
            <div><small>Semester / Section</small><strong>{[displayValue(selectedStudent.academic?.semester), displayValue(selectedStudent.academic?.section)].filter(Boolean).join(' / ') || 'â€”'}</strong></div>
          </div>}

          {loadError && <p className="student-marks-error" role="alert">{loadError}</p>}

          {selectedStudent && <FilterPanel
            active={hasFilters}
            onClear={clearFilters}
            className="student-marks-filters"
            actions={<ExportMenu rows={filteredRows} columns={columns} title="Student Marks" filename={`student-marks-${getRegistrationNumber(selectedStudent) || 'records'}`} scope="All matching marks" allowEmpty />}
          >
            <div className="student-marks-search-wrap"><label className="student-marks-search"><FiSearch aria-hidden="true" /><input type="search" aria-label="Search student marks" placeholder="Search subject or exam" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} /></label></div>
            <label className="student-marks-filter"><span>Academic Year</span><ProjectSelect value={academicYear} onChange={event => { setAcademicYear(event.target.value); setPage(1) }}><option value="">All academic years</option>{optionsFor('academicYear').map(value => <option key={value}>{value}</option>)}</ProjectSelect></label>
            <label className="student-marks-filter"><span>Course</span><ProjectSelect value={course} onChange={event => { setCourse(event.target.value); setPage(1) }}><option value="">All courses</option>{optionsFor('course').map(value => <option key={value}>{value}</option>)}</ProjectSelect></label>
            <label className="student-marks-filter"><span>Branch</span><ProjectSelect value={branch} onChange={event => { setBranch(event.target.value); setPage(1) }}><option value="">All branches</option>{optionsFor('branch').map(value => <option key={value}>{value}</option>)}</ProjectSelect></label>
            <label className="student-marks-filter"><span>Semester</span><ProjectSelect value={semester} onChange={event => { setSemester(event.target.value); setPage(1) }}><option value="">All semesters</option>{optionsFor('semester').map(value => <option key={value}>{value}</option>)}</ProjectSelect></label>
            <label className="student-marks-filter"><span>Exam Type</span><ProjectSelect value={examType} onChange={event => { setExamType(event.target.value); setPage(1) }}><option value="">All exam types</option>{optionsFor('examType').map(value => <option key={value}>{value}</option>)}</ProjectSelect></label>
          </FilterPanel>}

          {loading && <p className="student-marks-loading" role="status">Loading students and examination records...</p>}
          {selectedStudent && !loading && filteredRows.length === 0 && <EmptyState title={hasFilters ? 'No matching marks' : 'No examination marks found'} description={hasFilters ? 'Adjust or clear the filters to see more records.' : 'There are no published marks records for this student yet.'} />}
          {selectedStudent && !loading && filteredRows.length > 0 && (
            <div className="student-marks-table-wrap">
              <table className="erp-table student-marks-table">
                <thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead>
                <tbody>{visibleRows.map(row => <tr key={row.id}>{columns.map(column => <td key={column.key}>{clean(row[column.key]) || '—'}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
          {selectedStudent && filteredRows.length > PAGE_SIZE && <TablePagination currentPage={page} totalPages={Math.ceil(filteredRows.length / PAGE_SIZE)} onPageChange={setPage} />}
        </article>
      </section>
    </DashboardLayout>
  )
}

return { default: StudentMarks }
})()

// SubjectMarksReport screen and private helpers.
const SubjectMarksReportScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const useEffect = reactImports_useEffect
const useMemo = reactImports_useMemo
const useRef = reactImports_useRef
const useState = reactImports_useState
const FiBookOpen = fiImports_FiBookOpen
const FiSearch = fiImports_FiSearch
const DashboardLayout = DashboardLayoutImports_default
const PageHeader = PageHeaderImports_default
const MarksModuleNav = MarksModuleNavScreen.default
const FilterPanel = FilterPanelImports_default
const ExportMenu = ExportMenuImports_default
const TablePagination = TablePaginationImports_default
const EmptyState = EmptyStateImports_default
const resultsService = resultsServiceImports_default
const academicService = academicServiceImports_default
const getExamTypes = examServiceImports_getExamTypes
const studentService = studentServiceImports_default
const subjectService = subjectServiceImports_default

const PAGE_SIZE = 10
const clean = value => String(value ?? '').trim()
const norm = value => clean(value).toLowerCase()
const first = (...values) => values.find(value => value !== undefined && value !== null && clean(value) !== '')
const display = value => value && typeof value === 'object' ? first(value.name, value.label, value.title, value.value, value.semesterName, '') : value
const getId = student => clean(first(student?.studentId, student?.id))
const getName = student => clean(first(student?.fullName, student?.personal?.fullName, student?.studentName, student?.name, 'Student'))
const getReg = student => clean(first(student?.registrationNumber, student?.application?.registrationNumber, student?.academic?.registrationNumber, student?.academic?.rollNumber, student?.rollNumber, ''))
const keyFor = (code, name) => norm(first(code, name, 'unknown'))
const columns = [['studentName','Student Name'],['registrationNumber','Registration Number'],['academicYear','Academic Year'],['course','Course'],['branch','Branch'],['semester','Semester'],['section','Section'],['subjectCode','Subject Code'],['subjectName','Subject'],['examType','Exam Type'],['assessmentType','Assessment Type'],['examDate','Exam Date'],['maxInternal','Max Internal'],['internalMarks','Internal Marks'],['maxExternal','Max External'],['externalMarks','External Marks'],['maximumMarks','Maximum Marks'],['passingMarks','Passing Marks'],['totalMarks','Total Marks'],['grade','Grade'],['gradePoint','Grade Point'],['status','Result']].map(([key,label]) => ({ key, value:key, label }))

function SubjectMarksReport() {
  const [students,setStudents] = useState([]), [sheets,setSheets] = useState([]), [subjectCatalog,setSubjectCatalog] = useState([]), [lookupOptions,setLookupOptions] = useState({ academicYears: [], courses: [], branches: [], examTypes: [] }), [loading,setLoading] = useState(true), [loadError,setLoadError] = useState('')
  const [subject,setSubject] = useState(''), [subjectQuery,setSubjectQuery] = useState(''), [subjectOpen,setSubjectOpen] = useState(false), [query,setQuery] = useState(''), [year,setYear] = useState(''), [course,setCourse] = useState(''), [branch,setBranch] = useState(''), [semester,setSemester] = useState(''), [exam,setExam] = useState(''), [page,setPage] = useState(1)
  useEffect(() => { let active=true; Promise.allSettled([studentService.getAllProfiles(),resultsService.getResults(),subjectService.getSubjects({liveOnly:true}),subjectService.getSubjects()]).then(([studentsResult,sheetsResult,liveSubjects,localSubjects]) => { if(!active)return; if(studentsResult.status==='fulfilled')setStudents(Array.isArray(studentsResult.value)?studentsResult.value:[]); if(sheetsResult.status==='fulfilled')setSheets(Array.isArray(sheetsResult.value)?sheetsResult.value:[]); const catalogs=[liveSubjects,localSubjects].filter(item=>item.status==='fulfilled').flatMap(item=>Array.isArray(item.value)?item.value:[]); setSubjectCatalog(catalogs); const errors=[studentsResult,sheetsResult].filter(item=>item.status==='rejected'&&!/record not found/i.test(item.reason?.message||'')); if(errors.length)setLoadError(errors.map(item=>item.reason?.message).filter(Boolean).join(' ')||'Some marks data could not be loaded.'); setLoading(false) }); return()=>{active=false} },[])
  useEffect(() => {
    let active = true
    Promise.allSettled([
      academicService.getAcademicYears(false),
      academicService.getCourses({}, false),
      academicService.getBranches(null, false),
      Promise.resolve(getExamTypes()),
    ]).then(([years, courses, branches, exams]) => {
      if (!active) return
      setLookupOptions({
        academicYears: years.status === 'fulfilled' && Array.isArray(years.value) ? years.value : [],
        courses: courses.status === 'fulfilled' && Array.isArray(courses.value) ? courses.value : [],
        branches: branches.status === 'fulfilled' && Array.isArray(branches.value) ? branches.value : [],
        examTypes: exams.status === 'fulfilled' && Array.isArray(exams.value) ? exams.value : [],
      })
    })
    return () => { active = false }
  }, [])
  const studentMap = useMemo(() => { const map=new Map(); students.forEach(s=>[getId(s),getReg(s)].filter(Boolean).forEach(id=>map.set(norm(id),s))); return map },[students])
  const subjects = useMemo(() => { const map=new Map(); [...subjectCatalog,...sheets].forEach(s=>{const code=clean(first(s.subjectCode,s.code,'')), name=clean(first(s.subjectName,s.subject,s.name,s.label,'')), key=keyFor(code,name); if(key!=='unknown'&&!map.has(key))map.set(key,{key,code,name})}); return [...map.values()].sort((a,b)=>(a.name||a.code).localeCompare(b.name||b.code)) },[subjectCatalog,sheets])
  const selected=subjects.find(s=>s.key===subject)
  const subjectPicker=useRef(null)
  const subjectLabel=s=>[s.code,s.name].filter(Boolean).join(' · ')
  const visibleSubjects=subjects.filter(s=>!subjectQuery.trim()||subjectLabel(s).toLowerCase().includes(subjectQuery.trim().toLowerCase()))
  useEffect(()=>{if(!subjectOpen)return undefined;const dismiss=e=>{if(!subjectPicker.current?.contains(e.target))setSubjectOpen(false)};document.addEventListener('pointerdown',dismiss);return()=>document.removeEventListener('pointerdown',dismiss)},[subjectOpen])
  const rows=useMemo(()=>{if(!selected)return[];return sheets.flatMap((sheet,si)=>{const code=clean(first(sheet.subjectCode,sheet.code,'')),name=clean(first(sheet.subjectName,sheet.subject,''));if(keyFor(code,name)!==selected.key)return[];return(Array.isArray(sheet.records)?sheet.records:[]).map((record,ri)=>{const student=studentMap.get(norm(first(record.studentId,record.studentProfileId,record.profileId,record.registrationNumber,record.rollNumber,record.student?.studentId,record.student?.id,'')))||record.student||{};const internal=first(record.internalMarks,record.internal,record.internalScore,''),external=first(record.externalMarks,record.external,record.externalScore,''),total=first(record.totalMarks,record.marksObtained,record.obtainedMarks,internal!==''&&external!==''?Number(internal)+Number(external):'');const maxInternal=first(sheet.maxInternal,sheet.maximumInternalMarks,sheet.internalMaxMarks,record.maxInternal,''),maxExternal=first(sheet.maxExternal,sheet.maximumExternalMarks,sheet.externalMaxMarks,record.maxExternal,'');return{id:String(first(record.studentId,record.id,record.registrationNumber,si+'-'+ri))+'-'+si+'-'+ri,studentName:getName(student)!=='Student'?getName(student):first(record.studentName,record.name,record.student?.name,'Student'),registrationNumber:getReg(student)||first(record.registrationNumber,record.rollNumber,record.enrollmentNo,''),academicYear:display(first(sheet.academicYear,sheet.academicYearName,student.academic?.academicYear,'')),course:display(first(sheet.course,sheet.courseName,student.academic?.course,'')),branch:display(first(sheet.branch,sheet.branchName,student.academic?.branch,'')),semester:display(first(sheet.semester,sheet.semesterName,student.academic?.semester,'')),section:display(first(sheet.section,sheet.sectionName,student.academic?.section,'')),subjectCode:code,subjectName:name,examType:first(sheet.examType,sheet.examName,sheet.examinationName,record.examType,''),assessmentType:first(sheet.assessmentType,record.assessmentType,''),examDate:first(sheet.examDate,sheet.examinationDate,sheet.date,record.examDate,''),maxInternal,internalMarks:internal,maxExternal,externalMarks:external,maximumMarks:first(sheet.maximumMarks,sheet.maxMarks,record.maximumMarks,maxInternal!==''&&maxExternal!==''?Number(maxInternal)+Number(maxExternal):''),passingMarks:first(sheet.passingMarks,sheet.minimumPassingMarks,record.passingMarks,''),totalMarks:total,grade:first(record.grade,record.resultGrade,''),gradePoint:first(record.gradePoint,record.points,''),status:first(record.status,record.resultStatus,'')}})})},[sheets,selected,studentMap])
  const optionsFor = key => {
    if (key === 'semester') return Array.from({ length: 8 }, (_, index) => 'Semester ' + (index + 1))
    const values = rows.map(row => row[key])
    const add = value => { const label = clean(display(value)); if (label) values.push(label) }
    if (key === 'academicYear') {
      lookupOptions.academicYears.forEach(item => add(first(item.name, item.academicYearName, item.label, '')))
      students.forEach(student => add(first(student.academic?.academicYear, student.academicYear, '')))
      sheets.forEach(sheet => add(first(sheet.academicYear, sheet.academicYearName, '')))
    }
    if (key === 'course') {
      lookupOptions.courses.forEach(item => add(first(item.name, item.courseName, item.label, '')))
      students.forEach(student => add(first(student.academic?.course, student.academic?.courseName, student.course, '')))
      sheets.forEach(sheet => add(first(sheet.course, sheet.courseName, '')))
    }
    if (key === 'branch') {
      lookupOptions.branches.forEach(item => add(first(item.name, item.branchName, item.label, '')))
      students.forEach(student => add(first(student.academic?.branch, student.academic?.branchName, student.branch, '')))
      sheets.forEach(sheet => add(first(sheet.branch, sheet.branchName, '')))
    }
    if (key === 'examType') {
      lookupOptions.examTypes.forEach(item => add(first(item.name, item.examType, item.examTypeName, item.label, item, '')))
      sheets.forEach(sheet => {
      add(first(sheet.examType, sheet.examName, sheet.examinationName, ''))
      ;(Array.isArray(sheet.records) ? sheet.records : []).forEach(record => add(first(record.examType, record.assessmentType, '')))
      })
    }
    return [...new Set(values.map(value => clean(display(value))).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  }
  const filtered=useMemo(()=>rows.filter(r=>{const q=query.trim().toLowerCase();return(!q||[r.studentName,r.registrationNumber,r.examType,r.assessmentType].join(' ').toLowerCase().includes(q))&&(!year||r.academicYear===year)&&(!course||r.course===course)&&(!branch||r.branch===branch)&&(!semester||clean(r.semester).toLowerCase().replace(/^semester\s*/,'')===semester.toLowerCase().replace(/^semester\s*/,''))&&(!exam||r.examType===exam)}),[rows,query,year,course,branch,semester,exam])
  const clear=()=>{setQuery('');setYear('');setCourse('');setBranch('');setSemester('');setExam('');setPage(1)}
  const numeric=filtered.map(r=>Number(r.totalMarks)).filter(Number.isFinite), avg=numeric.length?(numeric.reduce((a,b)=>a+b,0)/numeric.length).toFixed(1):'—', outcomes=filtered.map(r=>{const status=norm(r.status);if(status.includes('fail')||status.includes('not pass'))return false;if(status.includes('pass'))return true;const threshold=Number(r.passingMarks),marks=Number(r.totalMarks);return r.passingMarks!==''&&Number.isFinite(threshold)&&Number.isFinite(marks)?marks>=threshold:null}).filter(value=>value!==null), passed=outcomes.filter(Boolean).length, passRate=outcomes.length?Math.round(passed/outcomes.length*100)+'%':'—'
  const active=Boolean(query||year||course||branch||semester||exam), visible=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE)
  return <DashboardLayout><section className="marks-management-subject-marks-report"><PageHeader
  className="marks-module-page-header"
  title="Subject Marks Report"
  subtitle={selected ? `Performance snapshot for ${selected.name || selected.code}.` : 'Select a subject to explore marks and performance.'}
  breadcrumb={[{ label: 'Marks Management', link: '/marks-management' }, 'Subject Marks Report']}
  compactSummary={[
    { label: 'Matching Records', value: selected ? filtered.length : '—', tone: 'warning' },
    { label: 'Average Marks', value: selected ? avg : '—', tone: 'completed' },
    { label: 'Pass Rate', value: selected ? passRate : '—', tone: 'active' },
    { label: 'Available Subjects', value: subjects.length },
  ]}
/><MarksModuleNav/><article className="erp-card subject-marks-report-card"><header className="erp-card-header subject-marks-report-card__header"><div><h2 className="erp-card-title">Subject Marks Report</h2><p className="erp-card-subtitle">Review and export student performance for a subject across examinations.</p></div>{selected&&<span className="subject-marks-report-count">{filtered.length} {filtered.length===1?'record':'records'}</span>}</header>
  <div className="subject-marks-report-picker" ref={subjectPicker}><FiBookOpen aria-hidden="true"/><div className="subject-marks-report-subject-field"><label htmlFor="subject-marks-subject-search">Subject</label><div className="subject-marks-report-subject-search"><FiSearch aria-hidden="true"/><input id="subject-marks-subject-search" type="text" role="combobox" aria-autocomplete="list" aria-expanded={subjectOpen} aria-controls="subject-marks-subject-options" placeholder={loading?'Loading subjects…':'Search or select a subject'} value={subjectOpen?subjectQuery:(selected?subjectLabel(selected):subjectQuery)} disabled={loading||!subjects.length} onFocus={()=>{setSubjectQuery('');setSubjectOpen(true)}} onClick={()=>{if(!subjectOpen){setSubjectQuery('');setSubjectOpen(true)}}} onChange={e=>{setSubjectQuery(e.target.value);setSubjectOpen(true)}} onKeyDown={e=>{if(e.key==='Escape')setSubjectOpen(false);if(e.key==='Enter'&&visibleSubjects.length){e.preventDefault();const choice=visibleSubjects[0];setSubject(choice.key);setSubjectQuery(subjectLabel(choice));setSubjectOpen(false);clear()}}}/></div>{subjectOpen&&<ul className="subject-marks-report-subject-options" id="subject-marks-subject-options" role="listbox" aria-label="Subjects">{visibleSubjects.length?visibleSubjects.map(s=><li key={s.key} role="option" aria-selected={s.key===subject}><button type="button" onClick={()=>{setSubject(s.key);setSubjectQuery(subjectLabel(s));setSubjectOpen(false);clear()}}>{s.code&&<strong>{s.code}</strong>}<span>{s.name||s.code}</span></button></li>):<li className="subject-marks-report-no-subjects">No subjects match this search.</li>}</ul>}</div></div>
  {selected&&<>
  <FilterPanel active={active} onClear={clear} className="subject-marks-report-filters" actions={<ExportMenu rows={filtered} columns={columns} title="Subject Marks Report" filename={'subject-marks-'+(selected.code||selected.name||'report')} scope="All matching marks" allowEmpty/>}><div className="subject-marks-report-search-wrap"><label className="subject-marks-report-search"><FiSearch aria-hidden="true"/><input type="search" aria-label="Search subject marks" placeholder="Search student or exam" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/></label></div>
  <label className="subject-marks-report-filter"><span>Academic Year</span><ProjectSelect value={year} onChange={e=>{setYear(e.target.value);setPage(1)}}><option value="">All academic years</option>{optionsFor('academicYear').map(v=><option key={v}>{v}</option>)}</ProjectSelect></label><label className="subject-marks-report-filter"><span>Course</span><ProjectSelect value={course} onChange={e=>{setCourse(e.target.value);setPage(1)}}><option value="">All courses</option>{optionsFor('course').map(v=><option key={v}>{v}</option>)}</ProjectSelect></label><label className="subject-marks-report-filter"><span>Branch</span><ProjectSelect value={branch} onChange={e=>{setBranch(e.target.value);setPage(1)}}><option value="">All branches</option>{optionsFor('branch').map(v=><option key={v}>{v}</option>)}</ProjectSelect></label><label className="subject-marks-report-filter"><span>Semester</span><ProjectSelect value={semester} onChange={e=>{setSemester(e.target.value);setPage(1)}}><option value="">All semesters</option>{optionsFor('semester').map(v=><option key={v}>{v}</option>)}</ProjectSelect></label><label className="subject-marks-report-filter"><span>Exam Type</span><ProjectSelect value={exam} onChange={e=>{setExam(e.target.value);setPage(1)}}><option value="">All exam types</option>{optionsFor('examType').map(v=><option key={v}>{v}</option>)}</ProjectSelect></label></FilterPanel></>}
  {loadError&&<p className="subject-marks-report-error" role="alert">{loadError}</p>}{loading&&<p className="subject-marks-report-loading" role="status">Loading subjects and examination records...</p>}{!loading&&!selected&&!subjects.length&&<EmptyState title="No subject marks found" description="Published result sheets will appear here once they are available."/>}{selected&&!loading&&!filtered.length&&<EmptyState title={active?'No matching marks':'No examination marks found'} description={active?'Adjust or clear the filters to see more records.':'There are no published marks records for this subject yet.'}/>}
  {selected&&!loading&&filtered.length>0&&<div className="subject-marks-report-table-wrap"><table className="erp-table subject-marks-report-table"><thead><tr>{columns.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{visible.map(row=><tr key={row.id}>{columns.map(c=><td key={c.key}>{clean(row[c.key])||'—'}</td>)}</tr>)}</tbody></table></div>}{selected&&filtered.length>PAGE_SIZE&&<TablePagination currentPage={page} totalPages={Math.ceil(filtered.length/PAGE_SIZE)} onPageChange={setPage}/>}</article></section></DashboardLayout>
}

return { default: SubjectMarksReport }
})()

export const MarksModuleNav = MarksModuleNavScreen.default
export const BulkMarksUpload = BulkMarksUploadScreen.default
export const EditMarks = EditMarksScreen.default
export const MarksApproval = MarksApprovalScreen.default
export const MarksEntry = MarksEntryScreen.default
export const MarksManagement = MarksManagementScreen.default
export const StudentMarks = StudentMarksScreen.default
export const SubjectMarksReport = SubjectMarksReportScreen.default
export default MarksManagement
