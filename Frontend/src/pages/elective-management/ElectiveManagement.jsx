import { GENERIC_ERROR_MESSAGE } from '../../utils/userError.js'
import DirectoryEmptyState from '../../components/DirectoryEmptyState'
import { collegeStorageKey } from '../../utils/collegeScope.js'
import useCollegeState from '../../hooks/useCollegeState'
﻿import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiAward, FiCheck, FiCheckCircle, FiEdit2, FiEye, FiInfo, FiLayers, FiPlus, FiSearch, FiTrash2, FiUsers, FiX } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'
import ExportMenu from '../../components/ExportMenu'
import FilterPanel from '../../components/FilterPanel'
import SearchableSelect from '../../components/SearchableSelect'
import { API_BASE_URL, departmentApi, academicYearApi, branchApi, courseApi, facultyMasterApi, profileApi, electiveManagementApi } from '../../api/apiEndpoints'
import { getAccessToken } from '../../auth/auth'
import { selectHeaderAcademicYear } from '../../utils/headerAcademicYear'
import { showError, showSuccess } from '../../utils/toast'
import subjectService from '../../services/subjectService'
import { createApiUnavailableError, notifyApiUnavailable } from '../../api/apiFailureNotice'
import { academicFilterOptions, changeAcademicFilter, enrichSubject, eligibleForGroup, hasAcademicFilter, isElectiveSubject, matchesSubject, subjectQuery } from '../../utils/subjectDirectory'
import './ElectiveManagement.css'

const tabs = [{ id: 'subjects', label: 'Subjects' }, { id: 'groups', label: 'Elective Groups' }, { id: 'selection', label: 'Student Selection' }, { id: 'approval', label: 'Faculty Approval' }, { id: 'allocation', label: 'Allocation' }, { id: 'report', label: 'Allocation Report' }]
const blankGroup = () => ({ groupCode: '', groupName: '', course: '', branch: '', academicYear: '', semester: '', electiveType: '', credits: '', minimumSelection: 1, maximumSelection: 1, selectionStartDate: '', selectionEndDate: '', status: 'Open' })
const text = (value, fallback = 'N/A') => value === null || value === undefined || value === '' ? fallback : value
const unwrap = value => { let current = value; for (let depth = 0; depth < 5 && current; depth += 1) { if (Array.isArray(current)) return current; current = current.data || current.items || current.results || current.records || current.content } return [] }
const courseOptions = rows => rows.map(item => ({ id: item.id || item.courseId || item.code || item.courseCode, name: item.name || item.courseName || item.title || item.code || item.courseCode, code: item.code || item.courseCode || '' })).filter(item => item.id && item.name)
const branchOptions = (rows, courseId) => rows.filter(item => !courseId || String(item.courseId || item.course?.id || '') === String(courseId)).map(item => ({ id: item.id || item.branchId || item.code || item.branchCode, name: `${item.name || item.branchName || item.branchCode || item.code}${item.departmentName || item.department ? ` - ${item.departmentName || item.department}` : ''}`, code: item.code || item.branchCode || '' })).filter(item => item.id && item.name)
const dateText = value => value ? String(value).slice(0, 10) : '-'
const rowId = row => row?.id ?? row?.selectionId ?? row?.studentElectiveSelectionId
const electiveGroupIdOf = group => group?.electiveGroupId ?? group?.electiveGroupID ?? group?.ElectiveGroupId ?? group?.elective_group_id ?? group?.groupId ?? group?.groupID ?? group?.GroupId ?? group?.group_id ?? group?.id ?? group?.ID
const approvalStatus = row => row?.approvalStatus || row?.status || 'Pending'
const allocationStatus = row => row?.allocationStatus || (String(row?.status).toLowerCase() === 'allocated' ? 'Allocated' : 'Pending')
const displayApprovalStatus = row => { const value = String(approvalStatus(row)); return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() }
const firstValue = (...values) => values.find(value => {
  if (value === null || value === undefined || String(value).trim() === '') return false
  return !['N/A', '-'].includes(String(value).trim().toUpperCase())
}) ?? ''
const electiveTypeOf = group => firstValue(group?.electiveType, group?.ElectiveType, group?.elective_type, group?.electiveTypeName, group?.type, group?.Type, group?.typeName)
const creditsOf = group => firstValue(group?.credits, group?.Credits, group?.credit, group?.Credit, group?.creditValue, group?.credit_value, group?.creditCount)
const groupExportColumns = [
  { label: 'Group Code', value: row => row.groupCode },
  { label: 'Group Name', value: row => row.groupName },
  { label: 'Course', value: row => row.course },
  { label: 'Department', value: row => row.department },
  { label: 'Branch', value: row => row.branch },
  { label: 'Academic Year', value: row => row.academicYear },
  { label: 'Semester', value: row => row.semester },
  { label: 'Elective Type', value: row => electiveTypeOf(row) },
  { label: 'Credits', value: row => creditsOf(row) },
  { label: 'Minimum Selection', value: row => row.minimumSelection },
  { label: 'Maximum Selection', value: row => row.maximumSelection },
  { label: 'Selection Start Date', value: row => row.selectionStartDate },
  { label: 'Selection End Date', value: row => row.selectionEndDate },
  { label: 'Status', value: row => row.status },
]
const reportExportColumns = [
  { label: 'Student', value: row => row.studentName || row.fullName || row.rollNumber || row.studentId },
  { label: 'Student Code', value: row => row.studentCode || row.studentId || row.rollNumber },
  { label: 'Group', value: row => row.groupCode || row.electiveGroupCode },
  { label: 'Subject', value: row => row.subjectCode },
  { label: 'Subject Name', value: row => row.subjectName },
  { label: 'Approval', value: row => approvalStatus(row) },
  { label: 'Allocation', value: row => allocationStatus(row) },
]

async function request(path, options = {}) {
  const token = getAccessToken(); let response
  try { response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } }) } catch { throw createApiUnavailableError() }
  let body = null; try { body = await response.json() } catch { /* Empty successful responses are valid. */ }
  if (response.status >= 500) notifyApiUnavailable({ status: response.status })
  if (!response.ok || body?.success === false) { const messages = { 401: 'Your session has expired. Please sign in again.', 403: 'You do not have permission to perform this action.', 404: path.includes('/allocations/report') ? 'No allocation report is available yet.' : path.includes('/profile/exam-results') ? 'No examination results are available.' : path.includes('/electives') ? 'No elective records are available yet.' : 'The requested information was not found.', 500: GENERIC_ERROR_MESSAGE }; const error = new Error(response.status >= 500 ? GENERIC_ERROR_MESSAGE : messages[response.status] || body?.message || 'The request could not be completed.'); error.status = response.status; throw error }
  return body
}
const get = path => request(path).then(unwrap)

function Pagination({ page, pageCount, total, size, onChange }) { if (pageCount < 2) return total ? <p className="em-pagination-count">Showing 1-{Math.min(total, size)} of {total}</p> : null; return <div className="em-pagination"><span>Showing {(page - 1) * size + 1}-{Math.min(page * size, total)} of {total}</span><div><button type="button" onClick={() => onChange(page - 1)} disabled={page === 1}>Previous</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map(number => <button type="button" key={number} className={number === page ? 'active' : ''} onClick={() => onChange(number)}>{number}</button>)}<button type="button" onClick={() => onChange(page + 1)} disabled={page === pageCount}>Next</button></div></div> }
function Toolbar({ search, setSearch, filters, setFilters, options, values, placeholder, showFilters = true, quickFilterKeys = [], leadingActions = null }) {
  const active = options.some(key => filters[key] !== 'All')
  const clear = () => setFilters({ ...filters, ...Object.fromEntries(options.map(key => [key, 'All'])) })
  const filterOptions = options.filter(key => !quickFilterKeys.includes(key))
  const content = <div className="em-toolbar"><div className="em-search"><FiSearch /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={placeholder} aria-label={placeholder} /></div>{showFilters && <div className="em-filters">{filterOptions.map(key => <select key={key} value={filters[key]} onChange={event => setFilters({ ...filters, [key]: event.target.value })}><option value="All">All {key.replace(/([A-Z])/g, ' $1')}</option>{values(key).map(value => <option key={value}>{value}</option>)}</select>)}</div>}</div>
  return showFilters ? <FilterPanel active={active} onClear={clear} leadingActions={leadingActions} className="em-filter-panel">{content}</FilterPanel> : content
}
function SelectionTable({ rows, approval = false, onApproval, emptyTitle = 'No elective selections found', search = '', className = '' }) { if (!rows.length) return <EmptyState title={approval ? 'No pending approvals' : emptyTitle} description={search ? 'Try a different search or filter.' : 'Records will appear here when they are available.'} />; return <div className={`sm-table-wrap ${className}`}><table className="em-table"><thead><tr><th>Student</th><th>Group</th><th>Subject</th><th>Credits</th><th>Selection Date</th><th>Approval</th><th>Allocation</th>{approval && <th>Actions</th>}</tr></thead><tbody>{rows.map(row => <tr key={rowId(row)}><td><strong>{text(row.studentName || row.fullName, row.rollNumber || row.studentId)}</strong><span className="em-cell-subtitle">{text(row.studentCode || row.studentId || row.rollNumber)}</span></td><td>{text(row.groupCode || row.electiveGroupCode)}<span className="em-cell-subtitle">{text(row.groupName || row.electiveGroupName)}</span></td><td><strong>{text(row.subjectCode)}</strong><span className="em-cell-subtitle">{text(row.subjectName)}</span></td><td>{text(row.credits, '-')}</td><td>{text(row.selectionDate || row.createdAt, '-')}</td><td><StatusBadge value={displayApprovalStatus(row)} /></td><td><StatusBadge value={allocationStatus(row)} /></td>{approval && <td><div className="em-row-actions"><button type="button" className="sm-btn sm-btn--primary em-compact-btn" onClick={() => onApproval(row, 'Approved')}>Approve</button><button type="button" className="sm-btn sm-btn--danger em-compact-btn" onClick={() => onApproval(row, 'Rejected')}>Reject</button></div></td>}</tr>)}</tbody></table></div> }
function ResultsTable({ rows, page, size, setPage }) { const pageRows = rows.slice((page - 1) * size, page * size); return !rows.length ? <EmptyState title="No examination results available" description="Academic results have not been published for this student." /> : <><div className="sm-table-wrap"><table className="em-table"><thead><tr><th>Examination</th><th>Semester</th><th>Subject</th><th>Maximum</th><th>Obtained</th><th>Percentage</th><th>Grade</th><th>Status</th></tr></thead><tbody>{pageRows.map((row, index) => <tr key={row.id || row.subjectCode || index}><td>{text(row.examinationName || row.examName)}</td><td>{text(row.semester)}</td><td><strong>{text(row.subjectCode)}</strong><span className="em-cell-subtitle">{text(row.subjectName)}</span></td><td>{text(row.maximumMarks || row.maxMarks, '-')}</td><td>{text(row.obtainedMarks || row.marksObtained, '-')}</td><td>{text(row.percentage, '-')}</td><td>{text(row.grade, '-')}</td><td><StatusBadge value={text(row.resultStatus || row.status, '-')} /></td></tr>)}</tbody></table></div><Pagination page={page} pageCount={Math.ceil(rows.length / size)} total={rows.length} size={size} onChange={setPage} /></> }
function StudentCard({ profile, loading }) { if (loading) return <section className="em-student-card em-loading">Loading student profile...</section>; if (!profile) return null; const value = key => text(profile[key], key === 'semester' ? 'Semester information unavailable' : 'N/A'); return <section className="em-student-card"><div className="em-avatar">{String(profile.fullName || profile.studentName || 'S').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}</div><div className="em-student-identity"><h2>{value('fullName')}</h2><p>{value('studentCode', profile.identifier || profile.id)}</p></div><dl>{[['Course', 'course'], ['Department', 'department'], ['Branch', 'branch'], ['Academic Year', 'academicYear'], ['Semester', 'semester'], ['Section', 'section'], ['Roll Number', 'rollNumber'], ['Registration Number', 'registrationNumber']].map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{value(key)}</dd></div>)}</dl></section> }

const ELECTIVE_DATES_KEY = 'elective_dates_cache'

const readCachedElectiveDates = (id, code) => {
  try {
    const raw = localStorage.getItem(collegeStorageKey(ELECTIVE_DATES_KEY))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    const key = [id, code].filter(Boolean).map(String).find((candidate) => parsed[candidate])
    return key ? (parsed[key] || {}) : {}
  } catch {
    return {}
  }
}

const cacheElectiveDates = (id, code, dates) => {
  if (!dates || (!dates.startDate && !dates.endDate)) return
  try {
    const raw = localStorage.getItem(collegeStorageKey(ELECTIVE_DATES_KEY))
    const parsed = raw ? JSON.parse(raw) : {}
    const keys = [id, code].filter(Boolean).map(String)
    keys.forEach((k) => {
      parsed[k] = {
        startDate: dates.startDate || parsed[k]?.startDate || '',
        endDate: dates.endDate || parsed[k]?.endDate || '',
      }
    })
    localStorage.setItem(collegeStorageKey(ELECTIVE_DATES_KEY), JSON.stringify(parsed))
  } catch {
    // Ignore storage errors
  }
}

export default function ElectiveManagement() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('subjects'); const [groups, setGroups] = useCollegeState([]); const [workflowSubjects, setWorkflowSubjects] = useCollegeState([]); const [selections, setSelections] = useCollegeState([], { groups, subjects: workflowSubjects }); const [report, setReport] = useCollegeState([], { groups, subjects: workflowSubjects }); const [profile, setProfile] = useState(null); const [results, setResults] = useState([])
  const [departments, setDepartments] = useCollegeState([]); const [directoryLoading, setDirectoryLoading] = useState(true); const [directoryError, setDirectoryError] = useState(''); const [mastersError, setMastersError] = useState('');
  const [courses, setCourses] = useCollegeState([]); const [branches, setBranches] = useCollegeState([]); const [academicYears, setAcademicYears] = useState([]); const [semesters, setSemesters] = useCollegeState([]); const [activeAcademicYear, setActiveAcademicYear] = useState(''); const [mastersLoading, setMastersLoading] = useState(true)
  const [loading, setLoading] = useState(true); const [profileLoading, setProfileLoading] = useState(true); const [resultsLoading, setResultsLoading] = useState(false); const [error, setError] = useState(''); const [search, setSearch] = useState(''); const [filters, setFilters] = useState({ status: 'All', semester: 'All', branch: 'All', course: 'All', academicYear: 'All', level: 'All', electiveType: 'Elective', approvalStatus: 'All', allocationStatus: 'All' }); const [page, setPage] = useState(1); const [resultPage, setResultPage] = useState(1); const size = 10
  const [groupModal, setGroupModal] = useState(false); const [editingGroup, setEditingGroup] = useState(null); const [viewingGroup, setViewingGroup] = useState(null); const [viewingSubject, setViewingSubject] = useState(null); const [editingSubject, setEditingSubject] = useState(null); const [subjectEditForm, setSubjectEditForm] = useState(null); const [deletingGroup, setDeletingGroup] = useState(null); const [subjectModal, setSubjectModal] = useState(null); const [groupForm, setGroupForm] = useState(blankGroup()); const [selectedSubjects, setSelectedSubjects] = useState([]); const [selectedGroupId, setSelectedGroupId] = useState(''); const [selectedSubjectId, setSelectedSubjectId] = useState(''); const [actionLoading, setActionLoading] = useState(false); const [groupFieldOverrides, setGroupFieldOverrides] = useState({})
  const studentId = profile?.id || profile?.studentId || ''
  const loadMasters = async () => { setMastersLoading(true); setMastersError(''); try { const [courseRows, branchRows, yearRows, semesterRows, departmentRows] = await Promise.all([courseApi.getAll(), branchApi.getAll(), academicYearApi.getAll(), facultyMasterApi.getSemesters(), departmentApi.getAll()]); setDepartments(unwrap(departmentRows)); const years = unwrap(yearRows); setCourses(unwrap(courseRows)); setBranches(unwrap(branchRows)); setAcademicYears(years); setSemesters(unwrap(semesterRows)); const selected = selectHeaderAcademicYear(years).year; setActiveAcademicYear(selected?.academicYearName || selected?.name || '') } catch (err) { setMastersError(err.message || 'Unable to load academic filters.'); } finally { setMastersLoading(false) } }
  const loadCore = async (preservedGroupValues = {}) => {
    setLoading(true)
    setError('')
    try {
      const [rawGroups, approvals, allocations] = await Promise.all([
        electiveManagementApi.getGroups(),
        electiveManagementApi.getApprovals(),
        electiveManagementApi.getAllocations(),
      ])

      const groupsWithSubjects = await Promise.all(rawGroups.map(async group => {
        const id = electiveGroupIdOf(group)
        let groupSubjects = []

        try {
          groupSubjects = await electiveManagementApi.getGroupSubjects(id)
        } catch {
          /* A group without subjects remains visible for configuration. */
        }

        const preserved =
          preservedGroupValues[String(id)] ||
          preservedGroupValues[String(group.groupCode)] ||
          groupFieldOverrides[String(id)] ||
          groupFieldOverrides[String(group.groupCode)] ||
          {}

        return {
          ...group,
          id,
          groupId: id,
          courseId: group.courseId ?? '',
          branchId: group.branchId ?? '',
          academicYear: group.academicYearName || group.academicYear || '',
          semester: group.semesterName || group.semester || '',
          electiveType: firstValue(electiveTypeOf(group), preserved.electiveType),
          credits: firstValue(creditsOf(group), preserved.credits),
          minimumSelection: group.minSelections ?? group.minimumSelection ?? 1,
          maximumSelection: group.maxSelections ?? group.maximumSelection ?? 1,
          selectionStartDate: group.selectionStartDate || '',
          selectionEndDate: group.selectionEndDate || '',
          status: Number(group.status) === 1 ? 'Open' : 'Inactive',
          subjects: groupSubjects.map(item => ({
            ...item,
            id: item.subjectId,
            subjectName: item.subjectName,
            subjectCode: item.subjectCode,
          })),
        }
      }))

      const allocationBySelection = new Map(allocations.map(item => [String(item.selectionId), item]))
      const combined = approvals.map(item => ({
        ...item,
        id: item.selectionId,
        approvalStatus: item.approvalStatus,
        allocationStatus:
          allocationBySelection.get(String(item.selectionId))?.allocationStatus || 'Pending',
      }))

      setGroups(groupsWithSubjects)
      setReport(combined)
    } catch (requestError) {
      setError(requestError.message || 'Unable to load elective groups.')
      showError(requestError.message || 'Unable to load elective groups.')
    } finally {
      setLoading(false)
    }
  }
  const loadProfile = async () => { setProfileLoading(true); try { const current = await profileApi.getProfile(); setProfile(current); if (current?.id || current?.studentId) { setResultsLoading(true); const id = current.id || current.studentId; const [currentSelections, examResults] = await Promise.all([electiveManagementApi.getStudentSelections(id).catch(() => []), get(`/api/v1/students/${encodeURIComponent(id)}/profile/exam-results`).catch(() => [])]); setSelections(currentSelections); setResults(examResults) } } catch { setProfile(null); showError('Unable to load student profile.') } finally { setProfileLoading(false); setResultsLoading(false) } }
  const loadDirectory = useCallback(async () => {
    setDirectoryLoading(true)
    setDirectoryError('')
    try {
      const all = await subjectService.getSubjects({ liveOnly: true })
      setWorkflowSubjects(all)
    } catch (err) {
      setDirectoryError(err.message || 'Unable to load subjects.')
      setWorkflowSubjects([])
    } finally {
      setDirectoryLoading(false)
    }
  }, [])
  useEffect(() => { loadCore(); loadProfile(); loadMasters() }, [])
  useEffect(() => { loadDirectory() }, [loadDirectory])
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') loadDirectory() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [loadDirectory])
  useEffect(() => { setPage(1) }, [search, filters, activeTab])
  const workflowRows = useMemo(() => workflowSubjects.map(subject => enrichSubject(subject, { courses, branches, semesters, years: academicYears, departments })), [workflowSubjects, courses, branches, semesters, academicYears, departments])
  const subjects = workflowRows.filter(subject => eligibleForGroup(subject, subjectModal) && !(subjectModal?.subjects || []).some(linked => String(linked.subjectId ?? linked.id) === String(subject.id)))
  const electiveIds = new Set(workflowRows.filter(isElectiveSubject).map(subject => String(subject.id)))

  const displayGroups = useMemo(() => groups.map(group => {
    const course = courses.find(item => String(item.id ?? item.courseId) === String(group.courseId))
    const branch = branches.find(item => String(item.id ?? item.branchId) === String(group.branchId))
    const departmentValue = group.departmentName || branch?.departmentName || branch?.department?.name || course?.departmentName || course?.department?.name || ''
    return {
      ...group,
      course: group.courseName || course?.name || course?.courseName || 'N/A',
      courseCode: group.courseCode || course?.courseCode || course?.code || 'N/A',
      branch: group.branchName || branch?.name || branch?.branchName || 'N/A',
      branchCode: group.branchCode || branch?.branchCode || branch?.code || 'N/A',
      department: typeof departmentValue === 'string' && !/^\d+$/.test(departmentValue) ? departmentValue : 'N/A',
    }
  }), [groups, courses, branches])
  const selectedGroup = groups.find(row => String(row.id || row.groupId) === String(selectedGroupId)); const eligibleSubjects = workflowRows.filter(subject => eligibleForGroup(subject, selectedGroup) && (selectedGroup?.subjects || []).some(linked => String(linked.subjectId ?? linked.id) === String(subject.id)))
  const pending = report.filter(row => String(approvalStatus(row)).toLowerCase() === 'pending'); const approved = report.filter(row => String(approvalStatus(row)).toLowerCase() === 'approved'); const pageRows = rows => rows.slice((page - 1) * size, page * size)
  const filteredGroups = useMemo(() => displayGroups.filter(row => !search.trim() || [row.groupCode, row.groupName].some(value => String(value || '').toLowerCase().includes(search.trim().toLowerCase()))), [displayGroups, search])
  const electiveTableRows = useMemo(() => workflowRows.filter(subject => matchesSubject(subject, filters, search)), [workflowRows, filters, search])
  const electiveTablePageSize = 5
  const electiveTablePageRows = electiveTableRows.slice((page - 1) * electiveTablePageSize, page * electiveTablePageSize)
  const electiveTableExportColumns = [
    { label: 'Course Code', value: 'courseCode' },
    { label: 'Branch', value: 'branchName' },
    { label: 'Branch Code', value: 'branchCode' },
    { label: 'Academic Year', value: 'academicYearName' },
    { label: 'Semester', value: 'semesterName' },
    { label: 'Subject Name', value: 'subjectName' },
    { label: 'Subject Code', value: 'subjectCode' },
    { label: 'Elective Type', value: 'electiveType' },
    { label: 'Credits', value: 'credits' },
    { label: 'Status', value: 'status' },
  ]
  const directoryFilterOptions = key => {
    const activeYear = selectHeaderAcademicYear(academicYears).year
    const years = key === 'academicYear' ? (activeYear ? [activeYear] : []) : academicYears
    return academicFilterOptions(key, filters, { departments, courses, branches, semesters, years })
  }
  const filteredSelections = useMemo(() => selections.filter(row => { const query = search.toLowerCase(); return !query || [row.studentName, row.studentCode, row.rollNumber].some(value => String(value || '').toLowerCase().includes(query)) }), [selections, search])
  const filteredReport = useMemo(() => report.filter(row => { const query = search.toLowerCase(); return (!query || [row.studentName, row.studentCode, row.subjectName, row.electiveGroupName, row.groupName].some(value => String(value || '').toLowerCase().includes(query))) && (filters.approvalStatus === 'All' || approvalStatus(row) === filters.approvalStatus) && (filters.allocationStatus === 'All' || allocationStatus(row) === filters.allocationStatus) }), [report, search, filters])
  const reportGroups = new Set(report.map(row => row.groupCode || row.electiveGroupCode || row.groupName || row.electiveGroupName).filter(Boolean)).size
  const kpis = { groups: groups.length, active: groups.filter(row => ['active', 'open'].includes(String(row.status).toLowerCase())).length, selections: report.length, pending: pending.length, approved: approved.length, allocated: report.filter(row => String(allocationStatus(row)).toLowerCase() === 'allocated').length }
  const saveGroup = async event => {
    event.preventDefault()

    const year = academicYears.find(
      item => String(item.academicYearName || item.name || '') === String(groupForm.academicYear)
    )

    const semesterNumber = value =>
      String(value ?? '').replace(/^Semester\s*/i, '').trim()

    const semester = semesters.find(item =>
      [item.semesterName, item.name, item.semesterNumber].some(
        value => semesterNumber(value) === semesterNumber(groupForm.semester)
      )
    )

    const courseId = Number(groupForm.course)
    const branchId = Number(groupForm.branch)
    const credits = groupForm.credits === '' ? null : Number(groupForm.credits)
    const minimumSelection = Number(groupForm.minimumSelection)
    const maximumSelection = Number(groupForm.maximumSelection)

    if (
      (!year?.academicYearId && !year?.id) ||
      (!semester?.semesterId && !semester?.id) ||
      !courseId ||
      !branchId
    ) {
      return showError('Select valid course, branch, academic year, and semester IDs.')
    }

    if (!groupForm.electiveType) {
      return showError('Please select Elective Type.')
    }

    if (groupForm.credits === '' || !Number.isFinite(credits) || credits <= 0) {
      return showError('Please enter valid Credits greater than 0.')
    }

    if (minimumSelection < 1 || maximumSelection < 1) {
      return showError('Minimum and maximum selection must be at least 1.')
    }

    if (minimumSelection > maximumSelection) {
      return showError('Minimum selection cannot be greater than maximum selection.')
    }

    if (
      groupForm.selectionStartDate &&
      groupForm.selectionEndDate &&
      groupForm.selectionEndDate < groupForm.selectionStartDate
    ) {
      return showError('Selection end date cannot be before the start date.')
    }

    const payload = {
      groupCode: groupForm.groupCode.trim(),
      groupName: groupForm.groupName.trim(),
      description: editingGroup?.description || null,
      courseId,
      branchId,
      semesterId: Number(semester.semesterId || semester.id),
      academicYearId: Number(year.academicYearId || year.id),
      minSelections: minimumSelection,
      maxSelections: maximumSelection,
      electiveType: groupForm.electiveType,
      credits,
      selectionStartDate: groupForm.selectionStartDate || null,
      selectionEndDate: groupForm.selectionEndDate || null,
    }

    // Frontend fallback values. If the backend does not return these two
    // fields from GET /electives/groups, the entered values remain visible.
    const preservedValues = {
      electiveType: groupForm.electiveType,
      credits: groupForm.credits,
    }

    setActionLoading(true)

    try {
      let savedGroupId = editingGroup ? electiveGroupIdOf(editingGroup) : null

      if (editingGroup) {
        await electiveManagementApi.updateGroup(savedGroupId, payload)
        showSuccess('Elective group updated.')
      } else {
        const created = await electiveManagementApi.createGroup(payload)

        savedGroupId =
          electiveGroupIdOf(created) ||
          electiveGroupIdOf(created?.data) ||
          electiveGroupIdOf(created?.data?.data)
      }

      setGroupModal(false)
      setEditingGroup(null)

      const preservedGroupValues = {
        [String(savedGroupId || payload.groupCode)]: preservedValues,
        [String(payload.groupCode)]: preservedValues,
      }

      setGroupFieldOverrides(current => ({ ...current, ...preservedGroupValues }))
      await loadCore(preservedGroupValues)
    } catch (requestError) {
      showError(
        requestError.message ||
        `Unable to ${editingGroup ? 'update' : 'create'} elective group.`
      )
    } finally {
      setActionLoading(false)
    }
  }
  const addSubjects = async () => { const subjectIds = selectedSubjects.map(subject => Number(subject.subjectId || subject.id)).filter(id => Number.isInteger(id) && id > 0); if (directoryLoading || directoryError || selectedSubjects.some(selected => !subjects.some(subject => String(subject.id) === String(selected.subjectId ?? selected.id)))) return showError('Refresh and select only eligible elective subjects.'); if (!subjectIds.length) return showError('Select subjects with valid backend IDs.'); setActionLoading(true); try { await electiveManagementApi.addGroupSubjects(subjectModal.electiveGroupId || subjectModal.id || subjectModal.groupId, subjectIds); showSuccess('Subjects added to the elective group.'); setSubjectModal(null); await loadCore() } catch (requestError) { showError(requestError.message || 'Unable to add subjects.') } finally { setActionLoading(false) } }
  const openSubjectEdit = subject => {
    setEditingSubject(subject)
    setSubjectEditForm({
      subjectCode: subject.subjectCode || subject.code || '',
      subjectName: subject.subjectName || subject.name || '',
      courseId: subject.courseId || '',
      branchId: subject.branchId || '',
      semesterId: subject.semesterId || '',
      academicYearId: subject.academicYearId || '',
      credits: subject.credits ?? '',
      subjectType: subject.subjectType || '',
      electiveType: subject.electiveType || 'Elective',
      description: subject.description || '',
      status: subject.status || 'Active',
    })
  }
  const saveSubjectEdit = async event => {
    event.preventDefault()
    if (!editingSubject || !subjectEditForm) return
    setActionLoading(true)
    try {
      await subjectService.updateSubject(editingSubject.id, subjectEditForm)
      showSuccess('Subject updated successfully.')
      setEditingSubject(null)
      setSubjectEditForm(null)
      await Promise.all([loadCore(), loadDirectory()])
    } catch (requestError) {
      showError(requestError.message || 'Unable to update subject.')
    } finally {
      setActionLoading(false)
    }
  }
  const submitSelection = async event => { event.preventDefault(); if (!studentId || !selectedGroup || !selectedSubjectId) return showError('Student profile, group, and subject are required.'); const subject = eligibleSubjects.find(row => String(row.id || row.subjectId) === String(selectedSubjectId)); if (!subject || directoryLoading || directoryError) return showError('Select an available elective subject.'); setActionLoading(true); try { await electiveManagementApi.createStudentSelection(studentId, { electiveGroupId: Number(selectedGroup.electiveGroupId || selectedGroup.id), subjectId: Number(subject.subjectId || subject.id), academicYearId: Number(selectedGroup.academicYearId), semesterId: Number(selectedGroup.semesterId) }); showSuccess('Elective selection submitted.'); setSelectedSubjectId(''); setSelections(await electiveManagementApi.getStudentSelections(studentId)); await loadCore() } catch (requestError) { showError(requestError.message || 'Unable to complete elective selection.') } finally { setActionLoading(false) } }
  const updateApproval = async (row, status) => { if (status === 'Approved' && (directoryLoading || directoryError || !electiveIds.has(String(row.subjectId)))) return showError('Only current elective subjects can be approved.'); setActionLoading(true); try { await electiveManagementApi.updateApproval(rowId(row), { approvalStatus: status.toUpperCase() }); showSuccess(`Selection ${status.toLowerCase()}.`); await loadCore() } catch (requestError) { showError(requestError.message || 'Unable to update approval.') } finally { setActionLoading(false) } }
  const allocate = async () => { if (directoryLoading || directoryError || approved.some(row => String(allocationStatus(row)).toLowerCase() !== 'allocated' && !electiveIds.has(String(row.subjectId)))) return showError('Only current elective subjects can be allocated. Refresh and review approved selections.'); setActionLoading(true); try { const pendingAllocations = approved.filter(row => String(allocationStatus(row)).toLowerCase() !== 'allocated'); const results = await Promise.allSettled(pendingAllocations.map(row => electiveManagementApi.createAllocation(rowId(row), { selectionId: Number(rowId(row)) }))); const failed = results.filter(result => result.status === 'rejected'); if (failed.length) throw new Error(`${failed.length} of ${pendingAllocations.length} approved selections could not be allocated. ${failed[0].reason?.message || ''}`); showSuccess('Electives allocated successfully.'); await loadCore() } catch (requestError) { showError(requestError.message || 'Unable to allocate electives.') } finally { setActionLoading(false) } }
  const openGroup = group => {
    setEditingGroup(group || null)
    setGroupForm(group ? {
      ...blankGroup(),
      groupCode: group.groupCode || '',
      groupName: group.groupName || '',
      course: String(group.courseId || ''),
      branch: String(group.branchId || ''),
      academicYear: group.academicYear || '',
      semester: group.semester || '',
      electiveType: electiveTypeOf(group),
      credits: creditsOf(group),
      minimumSelection: group.minimumSelection ?? 1,
      maximumSelection: group.maximumSelection ?? 1,
      selectionStartDate: String(group.selectionStartDate || '').slice(0, 10),
      selectionEndDate: String(group.selectionEndDate || '').slice(0, 10),
    } : { ...blankGroup(), academicYear: activeAcademicYear })
    setGroupModal(true)
  }
  const removeGroup = async () => {
    if (!deletingGroup) return
    setActionLoading(true)
    try {
      await electiveManagementApi.deleteGroup(electiveGroupIdOf(deletingGroup))
      showSuccess('Elective group deleted.')
      setDeletingGroup(null)
      await loadCore()
    } catch (requestError) { showError(requestError.message || 'Unable to delete elective group.') }
    finally { setActionLoading(false) }
  }

  if (groupModal) {
    return (
      <DashboardLayout>
        <main className="em-screen">
          <header className="em-header">
            <div>
              <button type="button" className="cm-button secondary erp-btn erp-btn--secondary" onClick={() => setGroupModal(false)} style={{ marginBottom: '10px' }}>
                &larr; Back to Elective Groups
              </button>
              <h1>{editingGroup ? 'Edit Elective Group' : 'Create Elective Group'}</h1>
              <p>Configure elective group parameters, academic mapping, and selection window.</p>
            </div>
          </header>

          <div className="erp-two-column-layout">
            <div className="erp-card-main">
              <form className="erp-form-scroll-body" onSubmit={saveGroup}>
                <div className="sm-form-grid-2">
                  {[['groupCode', 'Elective Code'], ['groupName', 'Elective Name'], ['academicYear', 'Academic Year'], ['credits', 'Credits'], ['selectionStartDate', 'Selection Start Date'], ['selectionEndDate', 'Selection End Date']].map(([key, label]) => (
                    <label className="sm-field" key={key}>
                      <span>{label}<b className="em-required-star">*</b></span>
                      {key === 'academicYear' ? (
                        <select value={groupForm.academicYear} onChange={event => setGroupForm({ ...groupForm, academicYear: event.target.value })} required>
                          <option value="">Select academic year</option>
                          {academicYears.map(year => {
                            const name = year.academicYearName || year.name
                            return name ? <option key={year.academicYearId || year.id || name} value={name}>{name}</option> : null
                          })}
                        </select>
                      ) : (
                        <input
                          type={key.includes('Date') ? 'date' : key === 'credits' ? 'number' : 'text'}
                          min={key === 'credits' ? '0.5' : undefined}
                          step={key === 'credits' ? '0.5' : undefined}
                          value={groupForm[key]}
                          onChange={event => setGroupForm({ ...groupForm, [key]: event.target.value })}
                          required
                        />
                      )}
                    </label>
                  ))}
                  <label className="sm-field">
                    <span>Course</span>
                    <SearchableSelect
                      label="Course"
                      value={groupForm.course}
                      options={courseOptions(courses)}
                      onChange={value => setGroupForm({ ...groupForm, course: value, branch: '' })}
                      placeholder={mastersLoading ? 'Loading courses...' : 'Select course'}
                      searchPlaceholder="Search course..."
                      noOptionsMessage="No courses found."
                      disabled={mastersLoading}
                    />
                  </label>
                  <label className="sm-field">
                    <span>Branch</span>
                    <SearchableSelect
                      label="Branch"
                      value={groupForm.branch}
                      options={branchOptions(branches, groupForm.course)}
                      onChange={value => setGroupForm({ ...groupForm, branch: value })}
                      placeholder={!groupForm.course ? 'Select a course first' : mastersLoading ? 'Loading branches...' : 'Select branch'}
                      searchPlaceholder="Search branch or department..."
                      noOptionsMessage="No branches are present."
                      disabled={mastersLoading || !groupForm.course}
                    />
                  </label>
                  <label className="sm-field">
                    <span>Semester</span>
                    <select value={groupForm.semester} onChange={event => setGroupForm({ ...groupForm, semester: event.target.value })} required>
                      <option value="">Select semester</option>
                      {Array.from({ length: 8 }, (_, index) => `Semester ${index + 1}`).map(semester => <option key={semester} value={semester}>{semester}</option>)}
                    </select>
                  </label>
                  <label className="sm-field">
                    <span>Elective Type</span>
                    <select value={groupForm.electiveType} onChange={event => setGroupForm({ ...groupForm, electiveType: event.target.value })} required>
                      <option value="">Select</option>
                      <option value="Elective">Elective</option>
                      <option value="Non-Elective">Non-Elective</option>
                    </select>
                  </label>
                  <label className="sm-field">
                    <span>Minimum Selection</span>
                    <input type="number" min="1" value={groupForm.minimumSelection} onChange={event => setGroupForm({ ...groupForm, minimumSelection: event.target.value })} />
                  </label>
                  <label className="sm-field">
                    <span>Maximum Selection</span>
                    <input type="number" min="1" value={groupForm.maximumSelection} onChange={event => setGroupForm({ ...groupForm, maximumSelection: event.target.value })} />
                  </label>
                </div>

                <div className="erp-actions-bar" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button type="button" className="cm-button secondary erp-btn erp-btn--secondary" onClick={() => setGroupModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="cm-button erp-btn erp-btn--primary" disabled={actionLoading}>
                    {actionLoading ? 'Saving...' : editingGroup ? 'Save Changes' : 'Create Group'}
                  </button>
                </div>
              </form>
            </div>

            <aside className="preview-card" aria-label="Elective Live Preview">
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
                      title: 'Elective Details',
                      fields: [
                        ['Group Code', groupForm.groupCode],
                        ['Group Name', groupForm.groupName],
                        ['Academic Year', groupForm.academicYear],
                        ['Semester', groupForm.semester],
                        ['Elective Type', groupForm.electiveType],
                        ['Credits', groupForm.credits],
                        ['Min / Max Picks', groupForm.minimumSelection && groupForm.maximumSelection ? `${groupForm.minimumSelection} to ${groupForm.maximumSelection}` : ''],
                        ['Window', [groupForm.selectionStartDate, groupForm.selectionEndDate].filter(Boolean).join(' to ')],
                      ],
                    },
                  ].map(sec => ({
                    ...sec,
                    fields: sec.fields.filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== '' && String(val).trim() !== '-'),
                  })).filter(sec => sec.fields.length > 0)

                  if (sections.length === 0) {
                    return (
                      <div className="preview-empty-hint">
                        <span>Enter details in the form to preview here in real time.</span>
                      </div>
                    )
                  }

                  return (
                    <>
                      <div className="preview-hero" style={{ marginBottom: '12px' }}>
                        <div className="preview-hero-badge">{groupForm.groupCode ? groupForm.groupCode.slice(0, 4).toUpperCase() : 'ELEC'}</div>
                        <div className="preview-hero-details">
                          <h3 className="preview-course-title" style={{ margin: 0 }}>{groupForm.groupName || 'Elective Group Preview'}</h3>
                          <p className="preview-course-meta" style={{ margin: '2px 0 0', color: '#64748B', fontSize: '0.78rem' }}>{[groupForm.groupCode, groupForm.electiveType, groupForm.credits && `${groupForm.credits} Credits`].filter(Boolean).join('   ')}</p>
                        </div>
                      </div>
                      {sections.map(sec => (
                        <div key={sec.title} className="preview-section-group" style={{ marginBottom: '10px' }}>
                          <span className="preview-section-title">{sec.title}</span>
                          <div className="preview-kv-grid">
                            {sec.fields.map(([label, textVal]) => (
                              <div key={label} className="preview-kv-item">
                                <span className="kv-label">{label}</span>
                                <strong className="kv-val" title={String(textVal).trim()}>{String(textVal).trim()}</strong>
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
        </main>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <main className="em-screen em-screen--group-table">
        <header className="em-header">
          <div>
            <h1>Elective Management</h1>
            <p>Review subjects and their elective classification.</p>
          </div>
        </header>
        <div className="em-tabs">
          {tabs.map(tab => (
            <button type="button" key={tab.id} className={`em-tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}{tab.id === 'approval' && pending.length ? ` (${pending.length})` : ''}
            </button>
          ))}
        </div>
        <section className="em-kpi-grid">
          {[[FiLayers, kpis.groups, 'Total Elective Groups'], [FiAward, kpis.active, 'Active Groups'], [FiUsers, kpis.selections, 'Total Selections'], [FiCheckCircle, kpis.pending, 'Pending Approvals'], [FiCheck, kpis.approved, 'Approved Selections'], [FiCheckCircle, kpis.allocated, 'Allocated Students']].map(([Icon, value, label]) => (
            <div className="em-kpi-card" key={label}>
              <div className="sm-kpi-icon sm-kpi-icon--blue"><Icon /></div>
              <div className="em-kpi-content"><small>{label}</small><strong>{value}</strong></div>
            </div>
          ))}
        </section>
        {error && <div className="em-alert" role="alert"><FiInfo /> {error}</div>}
        {activeTab === 'subjects' && (
          <section className="sm-card em-subject-directory-card">
            <FilterPanel
              className="em-subject-filter-panel"
              active={hasAcademicFilter(filters) || filters.status !== 'All'}
              hideClear
              leadingActions={(
                <div className="em-subject-toolbar-actions">
                  <div className="em-type-filter em-type-filter--segmented" role="group" aria-label="Elective type">
                    {['Elective', 'Non-Elective'].map(type => (
                      <button key={type} type="button" className={filters.electiveType === type ? 'active' : ''} aria-pressed={filters.electiveType === type} onClick={() => setFilters(old => ({ ...old, electiveType: type }))}>{type}</button>
                    ))}
                  </div>
                  <ExportMenu rows={electiveTableRows} columns={electiveTableExportColumns} title="Elective Subject Directory" filename="elective-subject-directory" scope="All matching subject records" loading={directoryLoading || Boolean(directoryError) || mastersLoading || Boolean(mastersError)} />
                </div>
              )}
            >
              <div className="em-toolbar">
                <div className="em-search"><FiSearch /><input aria-label="Search subjects" placeholder="Search subject code or name..." value={search} onChange={event => setSearch(event.target.value)} /></div>
                <div className="em-filters">
                  {['course', 'branch', 'semester', 'academicYear', 'level', 'status'].map(key => {
                    const labels = { course: 'Course', branch: 'Branch', semester: 'Semester', academicYear: 'Academic Year', level: 'Level', status: 'Status' }
                    const label = labels[key]
                    return (
                      <label key={key}>
                        <span>{label}</span>
                        <SearchableSelect
                          label={`Select ${label}`}
                          value={filters[key]}
                          options={[{ value: 'All', label: `Select ${label}` }, ...directoryFilterOptions(key)]}
                          onChange={value => setFilters(old => changeAcademicFilter(old, key, value))}
                          placeholder={`Select ${label}`}
                          searchPlaceholder={`Search ${label.toLowerCase()}...`}
                          noOptionsMessage={`No ${label.toLowerCase()} options found.`}
                        />
                      </label>
                    )
                  })}
                  {(hasAcademicFilter(filters) || filters.status !== 'All') && <button type="button" className="sm-btn sm-btn--secondary em-clear-subject-filters" onClick={() => setFilters(old => ({ ...old, course: 'All', branch: 'All', semester: 'All', academicYear: 'All', level: 'All', status: 'All' }))}>Clear Filters</button>}
                </div>
              </div>
            </FilterPanel>
            <div className="sm-table-wrap">
              {directoryLoading || mastersLoading ? (
                <div className="em-loading">Loading subjects...</div>
              ) : directoryError || mastersError ? (
                <div className="em-alert" role="alert">{directoryError || mastersError}<button type="button" onClick={() => { loadDirectory(); loadMasters() }}>Retry</button></div>
              ) : !electiveTableRows.length ? (
                <EmptyState title={`No ${filters.electiveType === 'Non-Elective' ? 'non-elective' : 'elective'} subjects found.`} description="Check the academic filters and the classification saved in Subject Management." />
              ) : (
                <table className="em-table em-group-table">
                  <thead>
                    <tr>
                      <th>Course Code</th>
                      <th>Branch</th>
                      <th>Branch Code</th>
                      <th>Academic Year</th>
                      <th>Semester</th>
                      <th>Subject Name</th>
                      <th>Subject Code</th>
                      <th>Elective Type</th>
                      <th>Credits</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {electiveTablePageRows.map(group => (
                      <tr key={`${group.id}:${group.courseId}:${group.branchId}:${group.semesterId}:${group.academicYearId}`}>
                        <td>{text(group.courseCode)}</td>
                        <td>{text(group.branchName)}</td>
                        <td>{text(group.branchCode)}</td>
                        <td>{text(group.academicYearName)}</td>
                        <td>{text(group.semesterName)}</td>
                        <td>{text(group.subjectName, '-')}</td>
                        <td>{text(group.subjectCode, '-')}</td>
                        <td>{text(electiveTypeOf(group), 'Not set')}</td>
                        <td>{text(creditsOf(group), '-')}</td>
                        <td><StatusBadge value={text(group.status)} /></td>
                        <td>
                          <div className="em-group-actions">
                            <button type="button" className="em-icon-action" title="View subject" aria-label={`View ${group.subjectCode}`} onClick={() => setViewingSubject(group)}><FiEye /></button>
                            <button type="button" className="em-icon-action" title="Edit subject" aria-label={`Edit ${group.subjectCode}`} onClick={() => openSubjectEdit(group)}><FiEdit2 /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {!directoryLoading && !directoryError && !mastersError && electiveTableRows.length > 0 && <Pagination page={page} pageCount={Math.ceil(electiveTableRows.length / electiveTablePageSize)} total={electiveTableRows.length} size={electiveTablePageSize} onChange={setPage} />}
          </section>
        )}
        {activeTab === 'groups' && (
          <section className="sm-card">
            <div className="em-toolbar"><div className="em-search"><FiSearch /><input aria-label="Search elective groups" placeholder="Search elective groups..." value={search} onChange={event => setSearch(event.target.value)} /></div><button type="button" className="sm-btn sm-btn--primary" onClick={() => openGroup()}><FiPlus /> Create Elective Group</button><button type="button" className="sm-btn sm-btn--secondary" onClick={() => { loadCore(); loadDirectory() }}>Refresh</button></div>
            {loading ? <div className="em-loading">Loading elective groups...</div> : error ? <div role="alert">{error}<button type="button" onClick={() => loadCore()}>Retry</button></div> : !filteredGroups.length ? <DirectoryEmptyState title="No elective groups found." actionLabel="Create Elective Group" onAction={() => openGroup()} /> : <div className="sm-table-wrap"><table className="em-table"><thead><tr><th>Group</th><th>Course</th><th>Branch</th><th>Semester</th><th>Status</th><th>Actions</th></tr></thead><tbody>{pageRows(filteredGroups).map(group => <tr key={group.id}><td>{group.groupCode}<span className="em-cell-subtitle">{group.groupName}</span></td><td>{group.course}</td><td>{group.branch}</td><td>{group.semester}</td><td><StatusBadge value={group.status} /></td><td><div className="em-row-actions"><button type="button" onClick={() => setViewingGroup(group)}>View</button><button type="button" onClick={() => openGroup(group)}>Edit</button><button type="button" onClick={() => { setSubjectModal(group); setSelectedSubjects([]); loadDirectory() }}>Link Subjects</button><button type="button" onClick={() => setDeletingGroup(group)}><FiTrash2 /> Delete</button></div></td></tr>)}</tbody></table></div>}
            <Pagination page={page} pageCount={Math.ceil(filteredGroups.length / size)} total={filteredGroups.length} size={size} onChange={setPage} />
          </section>
        )}
        {activeTab === 'selection' && (
          <>
            <StudentCard profile={profile} loading={profileLoading} />
            <section className="em-workflow-grid">
              <div className="sm-card">
                <div className="sm-card-header"><h2>Student Elective Selection</h2></div>
                {profileLoading ? (
                  <div className="em-loading">Loading student profile...</div>
                ) : !studentId ? (
                  <EmptyState title="Student profile unavailable" description="A student profile is required for elective selection." />
                ) : (
                  <form className="em-form-body" onSubmit={submitSelection}>
                    <div className="em-readonly-student">
                      <strong>{text(profile.fullName || profile.studentName)}</strong>
                      <span>{text(profile.studentCode || profile.identifier || studentId)} Â| {text(profile.semester, 'Semester information unavailable')}</span>
                    </div>
                    <label className="sm-field">
                      Elective Group
                      <select value={selectedGroupId} onChange={event => { setSelectedGroupId(event.target.value); setSelectedSubjectId('') }} required>
                        <option value="">Select group</option>
                        {groups.filter(group => ['open', 'active'].includes(String(group.status).toLowerCase())).map(group => (
                          <option key={group.id || group.groupId} value={group.id || group.groupId}>{group.groupCode} - {group.groupName}</option>
                        ))}
                      </select>
                    </label>
                    <label className="sm-field">
                      Available Subject
                      <select value={selectedSubjectId} onChange={event => setSelectedSubjectId(event.target.value)} disabled={!selectedGroup} required>
                        <option value="">Select subject</option>
                        {eligibleSubjects.map(subject => (
                          <option key={subject.id || subject.subjectId || subject.code} value={subject.id || subject.subjectId || subject.code}>
                            {subject.subjectCode || subject.code} - {subject.subjectName || subject.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="submit" className="sm-btn sm-btn--primary" disabled={actionLoading}><FiCheck /> Submit Selection</button>
                  </form>
                )}
              </div>
              <div className="sm-card">
                <div className="sm-card-header"><h2>Existing Selections</h2></div>
                {loading ? (
                  <div className="em-loading">Loading elective selections...</div>
                ) : (
                  <>
                    <SelectionTable rows={pageRows(filteredSelections)} search={search} />
                    <Pagination page={page} pageCount={Math.ceil(filteredSelections.length / size)} total={filteredSelections.length} size={size} onChange={setPage} />
                  </>
                )}
              </div>
            </section>
            <section className="sm-card em-results-card">
              <div className="sm-card-header"><h2>Academic Results</h2></div>
              {resultsLoading ? <div className="em-loading">Loading examination results...</div> : <ResultsTable rows={results} page={resultPage} size={size} setPage={setResultPage} />}
            </section>
          </>
        )}
        {activeTab === 'approval' && (
          <section className="sm-card">
            <div className="sm-card-header">
              <h2>Faculty Approval</h2>
              <span className="em-muted">{pending.length} pending</span>
            </div>
            <Toolbar search={search} setSearch={setSearch} filters={filters} setFilters={setFilters} options={['approvalStatus']} values={() => ['Pending', 'Approved', 'Rejected']} placeholder="Search student..." />
            <SelectionTable rows={pageRows(pending)} approval onApproval={updateApproval} search={search} />
            <Pagination page={page} pageCount={Math.ceil(pending.length / size)} total={pending.length} size={size} onChange={setPage} />
          </section>
        )}
        {activeTab === 'allocation' && (
          <section className="sm-card">
            <div className="sm-card-header">
              <div>
                <h2>Elective Allocation</h2>
                <p className="em-muted">Review approved selections before running allocation.</p>
              </div>
              <button type="button" className="sm-btn sm-btn--primary" onClick={allocate} disabled={actionLoading || !approved.length}><FiCheck /> Allocate Electives</button>
            </div>
            <SelectionTable rows={approved} emptyTitle="No approved selections found" />
          </section>
        )}
        {activeTab === 'report' && (
          <section className="sm-card em-report-card">
            <div className="em-report-heading">
              <div>
                <span className="em-report-eyebrow">Allocation overview</span>
                <h2>Allocation Report</h2>
                <p>Track student choices, approvals, and final elective allocations.</p>
              </div>
              <ExportMenu rows={filteredReport} columns={reportExportColumns} title="Elective Allocation Report" filename="elective-allocation-report" scope="All matching allocation records" loading={loading || Boolean(error)} />
            </div>
            <div className="em-report-summary">
              <span><small>Total records</small><strong>{report.length}</strong><em>All selections</em></span>
              <span><small>Allocated</small><strong>{kpis.allocated}</strong><em>Finalized choices</em></span>
              <span><small>Pending review</small><strong>{kpis.pending}</strong><em>Awaiting approval</em></span>
              <span><small>Elective groups</small><strong>{reportGroups}</strong><em>Represented in report</em></span>
            </div>
            <Toolbar search={search} setSearch={setSearch} filters={filters} setFilters={setFilters} options={['approvalStatus', 'allocationStatus']} values={() => ['Pending', 'Approved', 'Rejected', 'Allocated']} placeholder="Search student, subject, or group..." />
            <SelectionTable rows={pageRows(filteredReport)} search={search} emptyTitle="No allocation records found" className="em-report-table" />
            <Pagination page={page} pageCount={Math.ceil(filteredReport.length / size)} total={filteredReport.length} size={size} onChange={setPage} />
          </section>
        )}
        {viewingSubject && (
          <div className="sm-modal-backdrop" onClick={() => setViewingSubject(null)}>
            <section className="sm-modal" role="dialog" aria-modal="true" aria-labelledby="em-subject-view-title" onClick={event => event.stopPropagation()}>
              <header className="sm-modal-header"><h2 id="em-subject-view-title">Subject Details</h2><button type="button" className="sm-icon-btn" onClick={() => setViewingSubject(null)} aria-label="Close"><FiX /></button></header>
              <div className="sm-modal-body em-group-details">
                {[
                  ['Subject Code', viewingSubject.subjectCode || viewingSubject.code],
                  ['Subject Name', viewingSubject.subjectName || viewingSubject.name],
                  ['Department', viewingSubject.department || viewingSubject.departmentName],
                  ['Course', viewingSubject.course || viewingSubject.courseName],
                  ['Course Code', viewingSubject.courseCode],
                  ['Branch', viewingSubject.branchName || viewingSubject.branch],
                  ['Branch Code', viewingSubject.branchCode],
                  ['Academic Year', viewingSubject.academicYearName || viewingSubject.academicYear],
                  ['Academic Level', viewingSubject.level || viewingSubject.academicLevel],
                  ['Semester', viewingSubject.semesterName || viewingSubject.semester],
                  ['Elective Type', electiveTypeOf(viewingSubject)],
                  ['Subject Type', viewingSubject.subjectType || viewingSubject.type],
                  ['Credits', creditsOf(viewingSubject)],
                  ['Status', viewingSubject.status],
                ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{text(value, '-')}</strong></div>)}
              </div>
              <footer className="sm-modal-footer"><button type="button" className="sm-btn sm-btn--secondary" onClick={() => setViewingSubject(null)}>Close</button></footer>
            </section>
          </div>
        )}
        {editingSubject && subjectEditForm && (
          <div className="sm-modal-backdrop" onClick={actionLoading ? undefined : () => { setEditingSubject(null); setSubjectEditForm(null) }}>
            <section className="sm-modal" role="dialog" aria-modal="true" aria-labelledby="em-subject-edit-title" onClick={event => event.stopPropagation()}>
              <header className="sm-modal-header"><h2 id="em-subject-edit-title">Edit Subject</h2><button type="button" className="sm-icon-btn" disabled={actionLoading} onClick={() => { setEditingSubject(null); setSubjectEditForm(null) }} aria-label="Close"><FiX /></button></header>
              <form onSubmit={saveSubjectEdit}>
                <div className="sm-modal-body">
                  <div className="em-subject-edit-grid">
                    <label>Subject Code<input required value={subjectEditForm.subjectCode} onChange={event => setSubjectEditForm({ ...subjectEditForm, subjectCode: event.target.value })} /></label>
                    <label>Subject Name<input required value={subjectEditForm.subjectName} onChange={event => setSubjectEditForm({ ...subjectEditForm, subjectName: event.target.value })} /></label>
                    <label>Credits<input type="number" min="0" step="0.5" value={subjectEditForm.credits} onChange={event => setSubjectEditForm({ ...subjectEditForm, credits: event.target.value })} /></label>
                    <label>Subject Type<input value={subjectEditForm.subjectType} onChange={event => setSubjectEditForm({ ...subjectEditForm, subjectType: event.target.value })} /></label>
                    <label>Elective Type<select value={subjectEditForm.electiveType} onChange={event => setSubjectEditForm({ ...subjectEditForm, electiveType: event.target.value })}><option value="Elective">Elective</option><option value="Non-Elective">Non-Elective</option></select></label>
                    <label>Status<select value={subjectEditForm.status} onChange={event => setSubjectEditForm({ ...subjectEditForm, status: event.target.value })}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label>
                    <label className="em-subject-edit-description">Description<textarea rows="3" value={subjectEditForm.description} onChange={event => setSubjectEditForm({ ...subjectEditForm, description: event.target.value })} /></label>
                  </div>
                </div>
                <footer className="sm-modal-footer"><button type="button" className="sm-btn sm-btn--secondary" disabled={actionLoading} onClick={() => { setEditingSubject(null); setSubjectEditForm(null) }}>Cancel</button><button type="submit" className="sm-btn sm-btn--primary" disabled={actionLoading}>{actionLoading ? 'Saving...' : 'Save Changes'}</button></footer>
              </form>
            </section>
          </div>
        )}
        {viewingGroup && (
          <div className="sm-modal-backdrop" onClick={() => setViewingGroup(null)}>
            <section className="sm-modal" role="dialog" aria-modal="true" aria-labelledby="em-group-view-title" onClick={event => event.stopPropagation()}>
              <header className="sm-modal-header"><h2 id="em-group-view-title">Elective Group Details</h2><button type="button" className="sm-icon-btn" onClick={() => setViewingGroup(null)} aria-label="Close"><FiX /></button></header>
              <div className="sm-modal-body em-group-details">
                {[['Elective Code', viewingGroup.groupCode], ['Elective Name', viewingGroup.groupName], ['Course', viewingGroup.course], ['Department', viewingGroup.department], ['Branch', viewingGroup.branch], ['Academic Year', viewingGroup.academicYear], ['Semester', viewingGroup.semester], ['Elective Type', electiveTypeOf(viewingGroup)], ['Credits', creditsOf(viewingGroup)], ['Minimum / Maximum Selection', `${viewingGroup.minimumSelection} / ${viewingGroup.maximumSelection}`], ['Selection Start Date', viewingGroup.selectionStartDate], ['Selection End Date', viewingGroup.selectionEndDate], ['Status', viewingGroup.status]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{text(value, '-')}</strong></div>)}
              </div>
              <footer className="sm-modal-footer"><button type="button" className="sm-btn sm-btn--secondary" onClick={() => setViewingGroup(null)}>Close</button><button type="button" className="sm-btn sm-btn--primary" onClick={() => { const group = viewingGroup; setViewingGroup(null); openGroup(group) }}><FiEdit2 /> Edit Group</button></footer>
            </section>
          </div>
        )}
        {deletingGroup && (
          <div className="sm-modal-backdrop" onClick={actionLoading ? undefined : () => setDeletingGroup(null)}>
            <section className="sm-modal" role="alertdialog" aria-modal="true" aria-labelledby="em-group-delete-title" onClick={event => event.stopPropagation()}>
              <header className="sm-modal-header"><h2 id="em-group-delete-title">Delete Elective Group?</h2><button type="button" className="sm-icon-btn" disabled={actionLoading} onClick={() => setDeletingGroup(null)} aria-label="Close"><FiX /></button></header>
              <div className="sm-modal-body"><p><strong>{deletingGroup.groupCode} - {deletingGroup.groupName}</strong> will be removed from the group list.</p></div>
              <footer className="sm-modal-footer"><button type="button" className="sm-btn sm-btn--secondary" disabled={actionLoading} onClick={() => setDeletingGroup(null)}>Cancel</button><button type="button" className="sm-btn sm-btn--danger" disabled={actionLoading} onClick={removeGroup}>{actionLoading ? 'Deleting...' : 'Delete Group'}</button></footer>
            </section>
          </div>
        )}
        {subjectModal && (
          <div className="sm-modal-backdrop" onClick={() => setSubjectModal(null)}>
            <div className="sm-modal" onClick={event => event.stopPropagation()}>
              <div className="sm-modal-header">
                <h2>Manage Subjects: {subjectModal.groupCode}</h2>
                <button type="button" className="sm-icon-btn" onClick={() => setSubjectModal(null)} aria-label="Close"><FiX /></button>
              </div>
              <div className="sm-modal-body">
                <p className="em-muted">Select subjects from the existing academic data.</p>
                <div className="em-subject-picker">
                  {directoryLoading ? <div className="em-loading">Loading subjects...</div> : directoryError ? <div role="alert">{directoryError}<button onClick={loadDirectory}>Retry</button></div> : subjects.length ? (
                    subjects.map(subject => {
                      const subjectId = subject.id || subject.subjectId || subject.subjectCode;
                      const selected = selectedSubjects.some(row => String(row.id || row.subjectId || row.subjectCode) === String(subjectId));
                      return (
                        <label key={subjectId} className={`em-subject-option ${selected ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => setSelectedSubjects(current => selected ? current.filter(row => String(row.id || row.subjectId || row.subjectCode) !== String(subjectId)) : [...current, subject])}
                          />
                          <span>
                            <strong>{text(subject.subjectCode || subject.code)}</strong> {text(subject.subjectName || subject.name)}
                            <small>{text(subject.credits, '-')} credits Â| {text(subject.department)} Â| {text(subject.semester)}</small>
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <EmptyState title="No elective subjects available" description="No subjects were returned by the existing academic data source." />
                  )}
                </div>
              </div>
              <div className="sm-modal-footer">
                <button type="button" className="sm-btn sm-btn--secondary" onClick={() => setSubjectModal(null)}>Cancel</button>
                <button type="button" className="sm-btn sm-btn--primary" onClick={addSubjects} disabled={actionLoading}>
                  Add Selected Subjects ({selectedSubjects.length})
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}



