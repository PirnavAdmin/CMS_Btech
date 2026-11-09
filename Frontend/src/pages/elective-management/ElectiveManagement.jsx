import { useScreenAccess } from '../../auth/ScreenAccess'
import { useAcademic } from '../../context/AcademicContext'
import SharedViewDialog from '../../components/ViewDialog'
import { ProjectSelect } from '../../components/SearchableSelect'
import DirectoryEmptyState from '../../components/DirectoryEmptyState'
import useCollegeState from '../../hooks/useCollegeState'
﻿import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiAward, FiArrowLeft, FiBookOpen, FiCheck, FiCheckCircle, FiEdit2, FiEye, FiInfo, FiLayers, FiPlus, FiSearch, FiTrash2, FiUsers, FiX } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'
import ExportMenu from '../../components/ExportMenu'
import InfoCard from '../../components/InfoCard'
import FilterPanel from '../../components/FilterPanel'
import SearchableSelect from '../../components/SearchableSelect'
import { departmentApi, academicYearApi, branchApi, courseApi, facultyMasterApi, studentApi, studentProfileApi, electiveManagementApi } from '../../api/apiEndpoints'
import { selectHeaderAcademicYear } from '../../utils/headerAcademicYear'
import { showError, showSuccess } from '../../utils/toast'
import subjectService from '../../services/subjectService'
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
const approvalStatus = row => row?.approvalStatus || row?.status || 'Not reported'
const allocationStatus = row => row?.allocationStatus || (String(row?.status).toLowerCase() === 'allocated' ? 'Allocated' : 'Not reported')
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

function Pagination({ page, pageCount, total, size, onChange }) { if (pageCount < 2) return total ? <p className="em-pagination-count">Showing 1-{Math.min(total, size)} of {total}</p> : null; return <div className="em-pagination"><span>Showing {(page - 1) * size + 1}-{Math.min(page * size, total)} of {total}</span><div><button type="button" onClick={() => onChange(page - 1)} disabled={page === 1}>Previous</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map(number => <button type="button" key={number} className={number === page ? 'active' : ''} onClick={() => onChange(number)}>{number}</button>)}<button type="button" onClick={() => onChange(page + 1)} disabled={page === pageCount}>Next</button></div></div> }
function Toolbar({ search, setSearch, filters, setFilters, options, values, placeholder, showFilters = true, quickFilterKeys = [], leadingActions = null }) {
  const active = options.some(key => filters[key] !== 'All')
  const clear = () => setFilters({ ...filters, ...Object.fromEntries(options.map(key => [key, 'All'])) })
  const filterOptions = options.filter(key => !quickFilterKeys.includes(key))
  const content = <div className="em-toolbar"><div className="em-search"><FiSearch /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={placeholder} aria-label={placeholder} /></div>{showFilters && <div className="em-filters">{filterOptions.map(key => <ProjectSelect key={key} value={filters[key]} onChange={event => setFilters({ ...filters, [key]: event.target.value })}><option value="All">All {key.replace(/([A-Z])/g, ' $1')}</option>{values(key).map(value => <option key={value}>{value}</option>)}</ProjectSelect>)}</div>}</div>
  return showFilters ? <FilterPanel active={active} onClear={clear} leadingActions={leadingActions} className="em-filter-panel">{content}</FilterPanel> : content
}
function SelectionTable({ rows, approval = false, onApproval, emptyTitle = 'No elective selections found', search = '', className = '' }) { if (!rows.length) return <EmptyState title={approval ? 'No pending approvals' : emptyTitle} description={search ? 'Try a different search or filter.' : 'Records will appear here when they are available.'} />; return <div className={`sm-table-wrap ${className}`}><table className="em-table"><thead><tr><th>Student</th><th>Group</th><th>Subject</th><th>Credits</th><th>Selection Date</th><th>Approval</th><th>Allocation</th>{approval && <th>Actions</th>}</tr></thead><tbody>{rows.map(row => <tr key={rowId(row)}><td><strong>{text(row.studentName || row.fullName, row.rollNumber || row.studentId)}</strong><span className="em-cell-subtitle">{text(row.studentCode || row.studentId || row.rollNumber)}</span></td><td>{text(row.groupCode || row.electiveGroupCode)}<span className="em-cell-subtitle">{text(row.groupName || row.electiveGroupName)}</span></td><td><strong>{text(row.subjectCode)}</strong><span className="em-cell-subtitle">{text(row.subjectName)}</span></td><td>{text(row.credits, '-')}</td><td>{text(row.selectionDate || row.createdAt, '-')}</td><td><StatusBadge value={displayApprovalStatus(row)} /></td><td><StatusBadge value={allocationStatus(row)} /></td>{approval && <td><div className="em-row-actions"><button type="button" className="sm-btn sm-btn--primary em-compact-btn" onClick={() => onApproval(row, 'Approved')}>Approve</button><button type="button" className="sm-btn sm-btn--danger em-compact-btn" onClick={() => onApproval(row, 'Rejected')}>Reject</button></div></td>}</tr>)}</tbody></table></div> }
function ResultsTable({ rows, page, size, setPage }) { const pageRows = rows.slice((page - 1) * size, page * size); return !rows.length ? <EmptyState title="No examination results available" description="Academic results have not been published for this student." /> : <><div className="sm-table-wrap"><table className="em-table"><thead><tr><th>Examination</th><th>Semester</th><th>Subject</th><th>Maximum</th><th>Obtained</th><th>Percentage</th><th>Grade</th><th>Status</th></tr></thead><tbody>{pageRows.map((row, index) => <tr key={row.id || row.subjectCode || index}><td>{text(row.examinationName || row.examName)}</td><td>{text(row.semester)}</td><td><strong>{text(row.subjectCode)}</strong><span className="em-cell-subtitle">{text(row.subjectName)}</span></td><td>{text(row.maximumMarks ?? row.maxMarks, '-')}</td><td>{text(row.obtainedMarks ?? row.marksObtained, '-')}</td><td>{text(row.percentage, '-')}</td><td>{text(row.grade, '-')}</td><td><StatusBadge value={text(row.resultStatus || row.status, '-')} /></td></tr>)}</tbody></table></div><Pagination page={page} pageCount={Math.ceil(rows.length / size)} total={rows.length} size={size} onChange={setPage} /></> }
function StudentCard({ profile, loading }) { if (loading) return <section className="em-student-card em-loading">Loading student profile...</section>; if (!profile) return null; const value = key => text(profile[key], key === 'semester' ? 'Semester information unavailable' : 'N/A'); return <section className="em-student-card"><div className="em-avatar">{String(profile.fullName || profile.studentName || 'S').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}</div><div className="em-student-identity"><h2>{value('fullName')}</h2><p>{value('studentCode', profile.identifier || profile.id)}</p></div><dl>{[['Course', 'course'], ['Department', 'department'], ['Branch', 'branch'], ['Academic Year', 'academicYear'], ['Semester', 'semester'], ['Section', 'section'], ['Roll Number', 'rollNumber'], ['Registration Number', 'registrationNumber']].map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{value(key)}</dd></div>)}</dl></section> }

export default function ElectiveManagement() {
  const coreRequest = useRef(0), mastersRequest = useRef(0)
  const allocatedAcknowledgements = useRef(new Set())
  const actionLock = useRef(false), groupProgress = useRef({}), linkedWrites = useRef(new Set()), approvalWrites = useRef(new Map())
  const selectionWrite = useRef(''), selectionLock = useRef(false), selectionScope = useRef(0)
  const [studentOptions,setStudentOptions] = useCollegeState([])
  const [studentError,setStudentError] = useState('')
  const navigate = useNavigate()
  const { selectedCollegeId, selectedAcademicYearId, selectedAcademicYear } = useAcademic()
  const { canAction } = useScreenAccess()
  const canCreate = canAction('/elective-management','create'), canEdit = canAction('/elective-management','edit')
  const [activeTab, setActiveTab] = useState('subjects'); const [groups, setGroups] = useCollegeState([]); const [workflowSubjects, setWorkflowSubjects] = useCollegeState([]); const [selections, setSelections] = useCollegeState([], { groups, subjects: workflowSubjects }); const [report, setReport] = useCollegeState([], { groups, subjects: workflowSubjects }); const [profile, setProfile] = useState(null); const [results, setResults] = useState([])
  const [departments, setDepartments] = useCollegeState([]); const [directoryLoading, setDirectoryLoading] = useState(true); const [directoryError, setDirectoryError] = useState(''); const [mastersError, setMastersError] = useState('');
  const [courses, setCourses] = useCollegeState([]); const [branches, setBranches] = useCollegeState([]); const [academicYears, setAcademicYears] = useState([]); const [semesters, setSemesters] = useCollegeState([]); const [activeAcademicYear, setActiveAcademicYear] = useState(''); const [mastersLoading, setMastersLoading] = useState(true)
  const [loading, setLoading] = useState(true); const [profileLoading, setProfileLoading] = useState(true); const [resultsLoading, setResultsLoading] = useState(false); const [error, setError] = useState(''); const [search, setSearch] = useState(''); const [filters, setFilters] = useState({ status: 'All', semester: 'All', branch: 'All', course: 'All', academicYear: 'All', level: 'All', electiveType: 'Elective', approvalStatus: 'All', allocationStatus: 'All' }); const [page, setPage] = useState(1); const [resultPage, setResultPage] = useState(1); const size = 10
  const [groupModal, setGroupModal] = useState(false); const [editingGroup, setEditingGroup] = useState(null); const [viewingGroup, setViewingGroup] = useState(null); const [viewingSubject, setViewingSubject] = useState(null); const [subjectModal, setSubjectModal] = useState(null); const [groupForm, setGroupForm] = useState(blankGroup()); const [selectedSubjects, setSelectedSubjects] = useState([]); const [selectedGroupId, setSelectedGroupId] = useState(''); const [selectedSubjectId, setSelectedSubjectId] = useState(''); const [actionLoading, setActionLoading] = useState(false)
  const studentId = profile?.id || profile?.studentId || ''
  const loadMasters = async () => { const version=++mastersRequest.current;setMastersLoading(true); setMastersError(''); try { const [courseRows, branchRows, yearRows, semesterRows, departmentRows] = await Promise.all([courseApi.getAll(), branchApi.getAll(), academicYearApi.getAll(), facultyMasterApi.getSemesters(), departmentApi.getAll()]); if(version!==mastersRequest.current)return;setDepartments(unwrap(departmentRows)); const years = unwrap(yearRows).filter(row=>row.collegeId==null || String(row.collegeId)===String(selectedCollegeId)); setCourses(unwrap(courseRows)); setBranches(unwrap(branchRows)); setAcademicYears(years); setSemesters(unwrap(semesterRows)); const selected = selectHeaderAcademicYear(years).year; setActiveAcademicYear(selectedAcademicYear?.name || selectedAcademicYear?.academicYearName || selected?.academicYearName || selected?.name || '') } catch (err) { if(version===mastersRequest.current)setMastersError(err.message || 'Unable to load academic filters.'); } finally { if(version===mastersRequest.current)setMastersLoading(false) } }
  const loadCore = async (_preservedGroupValues = {}, propagate = false) => {
    const version=++coreRequest.current
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
        let groupSubjects = [], subjectsError = ''

        try {
          groupSubjects = await electiveManagementApi.getGroupSubjects(id)
        } catch {
          subjectsError = 'Unable to load group subjects. Retry the elective directory before changing this group.'
        }

        return {
          ...group, subjectsError,
          id,
          groupId: id,
          courseId: group.courseId ?? '',
          branchId: group.branchId ?? '',
          academicYear: group.academicYearName || group.academicYear || '',
          semester: group.semesterName || group.semester || '',
          electiveType: electiveTypeOf(group),
          credits: creditsOf(group),
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
          allocationBySelection.get(String(item.selectionId))?.allocationStatus || 'Not reported',
      }))

      if(version!==coreRequest.current)return
      setGroups(groupsWithSubjects)
      setSubjectModal(current=>current ? groupsWithSubjects.find(row=>String(row.id)===String(electiveGroupIdOf(current))) || null : null)
      setReport(combined)
    } catch (requestError) {
      if(version!==coreRequest.current)return
      setGroups([]); setReport([])
      setError(requestError.message || 'Unable to load elective groups.')
      if(propagate) throw requestError
    } finally {
      if(version===coreRequest.current)setLoading(false)
    }
  }
  const loadProfile = async () => {
    selectionScope.current++;setProfile(null);setSelections([]);setResults([]);setSelectedGroupId('');setSelectedSubjectId('');setProfileLoading(true);setStudentError('')
    const scope=selectionScope.current
    try {const records=await studentApi.getAll();if(scope!==selectionScope.current)return;setStudentOptions(records.map(row=>{const academic=row.academic || row.academicInformation || {};return {...row,...academic,id:String(row.studentId ?? row.id),studentId:row.studentId ?? row.id,fullName:row.fullName || row.studentName || row.personal?.fullName || row.name,studentCode:row.studentCode || row.rollNumber}}).filter(row=>!selectedAcademicYearId || String(row.academicYearId)===String(selectedAcademicYearId)))}
    catch(reason){if(scope===selectionScope.current){setStudentOptions([]);setStudentError(reason.message || 'Unable to load students.')}}
    finally{if(scope===selectionScope.current)setProfileLoading(false)}
  }
  const selectStudent = async id => {
    const student=studentOptions.find(row=>String(row.studentId)===String(id))
    setProfile(student || null);setSelections([]);setResults([]);setSelectedGroupId('');setSelectedSubjectId('');selectionWrite.current='';setStudentError('')
    if(!student)return
    setProfileLoading(true);setResultsLoading(true)
    const scope=++selectionScope.current
    try {const [saved,marks]=await Promise.all([electiveManagementApi.getStudentSelections(student.studentId),studentProfileApi.getExamResults(student.studentId)]);if(scope!==selectionScope.current)return;setSelections(saved);setResults(marks)}
    catch(reason){if(scope===selectionScope.current)setStudentError(reason.message || 'Unable to load student elective records.')}
    finally{if(scope===selectionScope.current){setProfileLoading(false);setResultsLoading(false)}}
  }
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
  useEffect(() => { allocatedAcknowledgements.current.clear();approvalWrites.current.clear();linkedWrites.current.clear();groupProgress.current={};selectionWrite.current='';setGroupModal(false);setViewingGroup(null);setSubjectModal(null);loadCore();loadProfile();loadMasters();return ()=>{coreRequest.current++;mastersRequest.current++;selectionScope.current++} }, [selectedCollegeId, selectedAcademicYearId])
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
  const groupsForStudent=groups.filter(group=>profile && ['courseId','branchId','semesterId','academicYearId'].every(key=>Number(profile[key])>0 && String(profile[key])===String(group[key]))); const selectedGroup = groupsForStudent.find(row => String(row.id || row.groupId) === String(selectedGroupId)); const eligibleSubjects = workflowRows.filter(subject => eligibleForGroup(subject, selectedGroup) && (selectedGroup?.subjects || []).some(linked => String(linked.subjectId ?? linked.id) === String(subject.id)))
  const pending = report.filter(row => String(approvalStatus(row)).toLowerCase() === 'pending'); const approved = report.filter(row => String(approvalStatus(row)).toLowerCase() === 'approved'); const pageRows = rows => rows.slice((page - 1) * size, page * size)
  const filteredGroups = useMemo(() => displayGroups.filter(row => !search.trim() || [row.groupCode, row.groupName].some(value => String(value || '').toLowerCase().includes(search.trim().toLowerCase()))), [displayGroups, search])
  const electiveFiltersActive = hasAcademicFilter(filters) || filters.status !== 'All'
  const hasSubjectFilter = hasAcademicFilter(filters) || filters.status !== 'All' || Boolean(search.trim())
  const electiveTableRows = useMemo(() => hasSubjectFilter ? workflowRows.filter(subject => isElectiveSubject(subject) && matchesSubject(subject, filters, search)) : [], [workflowRows, filters, search, hasSubjectFilter])
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
  const filteredReport = useMemo(() => report.filter(row => { const query = search.toLowerCase(); return (!query || [row.studentName, row.studentCode, row.subjectName, row.electiveGroupName, row.groupName].some(value => String(value || '').toLowerCase().includes(query))) && (filters.approvalStatus === 'All' || String(approvalStatus(row)).toLowerCase() === filters.approvalStatus.toLowerCase()) && (filters.allocationStatus === 'All' || String(allocationStatus(row)).toLowerCase() === filters.allocationStatus.toLowerCase()) }), [report, search, filters])
  const pendingFiltered = pending.filter(row=>(!search || [row.studentName,row.studentCode,row.subjectName,row.subjectCode].join(' ').toLowerCase().includes(search.toLowerCase())) && (filters.approvalStatus==='All' || String(approvalStatus(row)).toLowerCase()===filters.approvalStatus.toLowerCase()))
  const reportGroups = new Set(report.map(row => row.groupCode || row.electiveGroupCode || row.groupName || row.electiveGroupName).filter(Boolean)).size
  const kpis = { groups: groups.length, active: groups.filter(row => ['active', 'open'].includes(String(row.status).toLowerCase())).length, selections: report.length, pending: pending.length, approved: approved.length, allocated: report.filter(row => String(allocationStatus(row)).toLowerCase() === 'allocated').length }
  const saveGroup = async event => {
    event.preventDefault()
    if(actionLock.current || !canCreate) return
    if(editingGroup) return showError('Elective group editing is unavailable: no verified update endpoint exists.')

    const year = academicYears.find(
      item => String(item.academicYearId ?? item.id) === String(groupForm.academicYear)
    )


    const semester = semesters.find(item => String(item.semesterId ?? item.id) === String(groupForm.semester) && (!item.courseId || String(item.courseId) === String(groupForm.course)) && (!item.branchId || String(item.branchId) === String(groupForm.branch)) && (!item.academicYearId || String(item.academicYearId) === String(year?.academicYearId ?? year?.id)))

    const courseId = Number(groupForm.course)
    const branchId = Number(groupForm.branch)
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

    if (!groupForm.groupCode.trim() || !groupForm.groupName.trim()) return showError('Elective code and name are required.')
    if (!Number.isInteger(minimumSelection) || !Number.isInteger(maximumSelection)) return showError('Selection limits must be whole numbers.')
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

    }

    actionLock.current=true;setActionLoading(true)
    try {
      if(groupProgress.current.uncertain) throw new Error('Verify elective groups before another creation. The saved group identity was not returned.')
      if(!groupProgress.current.id){
        const created=await electiveManagementApi.createGroup(payload)
        const id=electiveGroupIdOf(created) || electiveGroupIdOf(created?.data)
        if(!id){groupProgress.current.uncertain=true;throw new Error('Group created without an identity. Verify groups before submitting again.')}
        groupProgress.current.id=id
      }
      await loadCore({},true);setGroupModal(false);setEditingGroup(null);groupProgress.current={};showSuccess('Elective group created.')
    } catch(reason){showError(reason.message || 'Unable to create elective group.')}
    finally{actionLock.current=false;setActionLoading(false)}
  }
  const addSubjects = async () => {
    if(!canEdit || actionLock.current)return
    if(subjectModal?.subjectsError)return showError(subjectModal.subjectsError)
    const subjectIds=selectedSubjects.map(row=>Number(row.subjectId || row.id))
    if(!subjectIds.length || subjectIds.some(id=>!Number.isSafeInteger(id)||id<=0) || directoryLoading || directoryError || selectedSubjects.some(row=>!subjects.some(subject=>String(subject.id)===String(row.subjectId ?? row.id))))return showError('Select eligible subjects from the current group mapping.')
    const id=electiveGroupIdOf(subjectModal),signature=JSON.stringify([id,[...subjectIds].sort()]);actionLock.current=true;setActionLoading(true)
    try{if(!linkedWrites.current.has(signature)){await electiveManagementApi.addGroupSubjects(id,subjectIds);linkedWrites.current.add(signature)}await loadCore({},true);setSubjectModal(null);showSuccess('Subjects linked to elective group.')}
    catch(reason){showError(reason.message || 'Unable to link subjects.')}finally{actionLock.current=false;setActionLoading(false)}
  }
  const openSubjectEdit = subject => {
    if (!canEdit) return
    navigate('/subject-management', { state: { subjectAction: { mode: 'edit', id: subject.id, returnTo: '/elective-management' } } })
  }
  const submitSelection = async event => {
    event.preventDefault()
    if(!canCreate || selectionLock.current)return
    if(!studentId || !selectedGroup || !selectedSubjectId)return showError('Select a student, mapped elective group and subject.')
    const subject=eligibleSubjects.find(row=>String(row.id || row.subjectId)===String(selectedSubjectId))
    if(!subject || directoryLoading || directoryError || selectedGroup.subjectsError)return showError('Select an available elective subject from a successfully loaded group.')
    const payload={electiveGroupId:Number(selectedGroup.electiveGroupId || selectedGroup.id),subjectId:Number(subject.subjectId || subject.id),academicYearId:Number(selectedGroup.academicYearId),semesterId:Number(selectedGroup.semesterId)}
    const signature=JSON.stringify([studentId,payload]);selectionLock.current=true;setActionLoading(true)
    try{if(selectionWrite.current!==signature){await electiveManagementApi.createStudentSelection(studentId,payload);selectionWrite.current=signature}setSelections(await electiveManagementApi.getStudentSelections(studentId));await loadCore({},true);setSelectedSubjectId('');showSuccess('Elective selection submitted.')}
    catch(reason){showError(reason.message || 'Unable to complete elective selection. Acknowledged writes are retained for refresh retry.')}
    finally{selectionLock.current=false;setActionLoading(false)}
  }
  const updateApproval = async (row,status) => {
    if(!canEdit || actionLock.current)return
    if(status==='Approved' && (directoryLoading || directoryError || !electiveIds.has(String(row.subjectId))))return showError('Only current elective subjects can be approved.')
    const id=rowId(row);actionLock.current=true;setActionLoading(true)
    try{if(approvalWrites.current.get(String(id))!==status){await electiveManagementApi.updateApproval(id,{approvalStatus:status.toUpperCase()});approvalWrites.current.set(String(id),status)}await loadCore({},true);showSuccess('Selection '+status.toLowerCase()+'.')}
    catch(reason){showError(reason.message || 'Unable to update approval.')}finally{actionLock.current=false;setActionLoading(false)}
  }
  const allocate = async () => { if (!canEdit || actionLock.current) return; if (directoryLoading || directoryError || approved.some(row => String(allocationStatus(row)).toLowerCase() !== 'allocated' && !electiveIds.has(String(row.subjectId)))) return showError('Only current elective subjects can be allocated. Refresh and review approved selections.'); actionLock.current=true; setActionLoading(true); try { const pendingAllocations = approved.filter(row => String(allocationStatus(row)).toLowerCase() !== 'allocated' && !allocatedAcknowledgements.current.has(String(rowId(row)))); if (!pendingAllocations.length) return showError('No unallocated approved selections are available.'); const results = await Promise.allSettled(pendingAllocations.map(async row => { const result = await electiveManagementApi.createAllocation(rowId(row), { selectionId: Number(rowId(row)) }); allocatedAcknowledgements.current.add(String(rowId(row))); return result })); const failed = results.filter(result => result.status === 'rejected'); if (failed.length) throw new Error(`${failed.length} of ${pendingAllocations.length} approved selections could not be allocated. ${failed[0].reason?.message || ''}`); showSuccess('Electives allocated successfully.'); await loadCore() } catch (requestError) { await loadCore(); showError(requestError.message || 'Unable to allocate electives.') } finally { actionLock.current=false; setActionLoading(false) } }
  const openGroup = group => {
    if(group)return showError('Elective group edit is unavailable until a backend update endpoint is supported.')
    if(!canCreate)return
    groupProgress.current={}
    setEditingGroup(group || null)
    setGroupForm(group ? {
      ...blankGroup(),
      groupCode: group.groupCode || '',
      groupName: group.groupName || '',
      course: String(group.courseId || ''),
      branch: String(group.branchId || ''),
      academicYear: group.academicYear || '',
      semester: String(group.semesterId || ''),
      electiveType: electiveTypeOf(group),
      credits: creditsOf(group),
      minimumSelection: group.minimumSelection ?? 1,
      maximumSelection: group.maximumSelection ?? 1,
      selectionStartDate: String(group.selectionStartDate || '').slice(0, 10),
      selectionEndDate: String(group.selectionEndDate || '').slice(0, 10),
    } : { ...blankGroup(), academicYear: String(selectedAcademicYearId || '') })
    setGroupModal(true)
  }
  if (viewingSubject) {
    const subject = viewingSubject
    const subjectCode = subject.subjectCode || subject.code
    const subjectName = subject.subjectName || subject.name
    const subjectStatus = subject.status || 'Active'
    const subjectSections = [
      {
        title: 'Subject Information',
        rows: [
          ['Subject Code', subjectCode],
          ['Subject Name', subjectName],
          ['Subject Type', subject.subjectType || subject.type],
          ['Elective Type', electiveTypeOf(subject)],
          ['Credits', creditsOf(subject)],
          ['Status', subjectStatus],
        ],
      },
      {
        title: 'Academic Mapping',
        rows: [
          ['Academic Year', subject.academicYearName || subject.academicYear],
          ['Course', subject.courseName || subject.course],
          ['Course Code', subject.courseCode],
          ['Department', subject.departmentName || subject.department],
          ['Branch', subject.branchName || subject.branch],
          ['Branch Code', subject.branchCode],
          ['Academic Level', subject.level || subject.academicLevel],
          ['Semester', subject.semesterName || subject.semester],
        ],
      },
    ]
    const subjectSubtitle = [subject.courseName || subject.course, subject.branchName || subject.branch, subject.academicYearName || subject.academicYear]
      .filter(Boolean)
      .join(' · ')

    return (
      <DashboardLayout>
        <main className="sm-screen">
          <div className="cm-profile-view sm-profile-view em-subject-profile">
            <div className="cm-profile-top-bar">
              <div className="sp-profile-top-actions">
                <ExportMenu
                  mode="single"
                  title={`${subjectCode || 'Subject'} - Subject Details`}
                  filename={`subject-${subjectCode || 'details'}`}
                  recordSections={subjectSections}
                />
                <button type="button" className="cm-button secondary erp-btn erp-btn--secondary" onClick={() => setViewingSubject(null)}>
                  <FiArrowLeft /> Back
                </button>
              </div>
            </div>
            <article className="cm-profile-card">
              <div className="cm-profile-banner">
                <div className="cm-profile-avatar-wrap">
                  <div className="cm-profile-placeholder"><FiBookOpen /></div>
                </div>
                <div className="cm-profile-header-info">
                  <div className="cm-profile-badges">
                    <span className="cm-badge cm-badge-code">SUB: {text(subjectCode, 'SUBJECT')}</span>
                    <span className="cm-badge cm-badge-type">{text(electiveTypeOf(subject) || subject.subjectType || subject.type, 'SUBJECT')}</span>
                    <span className={`cm-status-badge ${String(subjectStatus).toLowerCase() === 'active' ? 'active' : 'pending'}`}>
                      {subjectStatus}
                    </span>
                  </div>
                  <h1 className="cm-profile-title">{text(subjectName, 'Subject Details')}</h1>
                  <p className="cm-profile-subtitle">{subjectSubtitle || 'Subject information and academic mapping'}</p>
                </div>
              </div>
              <div className="cm-profile-grid sm-profile-sections">
                {subjectSections.map(section => (
                  <InfoCard key={section.title} title={section.title} icon={FiBookOpen} rows={section.rows} />
                ))}
              </div>
            </article>
          </div>
        </main>
      </DashboardLayout>
    )
  }

  const groupEditor = groupModal && <SharedViewDialog title={editingGroup ? 'Edit Elective Group' : 'Create Elective Group'} onClose={() => setGroupModal(false)} busy={actionLoading} showExport={false} hideFooter maxWidth="1000px"><div className="erp-two-column-layout" data-without-live-preview="true">
            <div className="erp-card-main">
              <form className="erp-form-scroll-body" onSubmit={saveGroup}>
                <div className="sm-form-grid-2">
                  {[['groupCode', 'Elective Code'], ['groupName', 'Elective Name'], ['academicYear', 'Academic Year']].map(([key, label]) => (
                    <label className="sm-field" key={key}>
                      <span>{label}<b className="em-required-star">*</b></span>
                      {key === 'academicYear' ? (
                        <ProjectSelect value={groupForm.academicYear} onChange={event => setGroupForm({ ...groupForm, academicYear: event.target.value, semester: '' })} required>
                          <option value="">Select academic year</option>
                          {academicYears.map(year => {
                            const name = year.academicYearName || year.name
                            return name ? <option key={year.academicYearId || year.id || name} value={String(year.academicYearId ?? year.id)}>{name}</option> : null
                          })}
                        </ProjectSelect>
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
                      onChange={value => setGroupForm({ ...groupForm, course: value, branch: '', semester: '' })}
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
                      onChange={value => setGroupForm({ ...groupForm, branch: value, semester: '' })}
                      placeholder={!groupForm.course ? 'Select a course first' : mastersLoading ? 'Loading branches...' : 'Select branch'}
                      searchPlaceholder="Search branch or department..."
                      noOptionsMessage="No branches are present."
                      disabled={mastersLoading || !groupForm.course}
                    />
                  </label>
                  <label className="sm-field">
                    <span>Semester</span>
                    <ProjectSelect value={groupForm.semester} onChange={event => setGroupForm({ ...groupForm, semester: event.target.value })} required>
                      <option value="">Select semester</option>
                      {semesters.filter(row => groupForm.course && groupForm.branch && (!row.courseId || String(row.courseId)===String(groupForm.course)) && (!row.branchId || String(row.branchId)===String(groupForm.branch)) && (!row.academicYearId || String(row.academicYearId)===String(academicYears.find(year=>String(year.academicYearId ?? year.id)===String(groupForm.academicYear))?.academicYearId ?? academicYears.find(year=>String(year.academicYearName||year.name)===String(groupForm.academicYear))?.id))).map(row=><option key={row.semesterId ?? row.id} value={row.semesterId ?? row.id}>{row.semesterName || row.name || row.semesterNumber}</option>)}
                    </ProjectSelect>
                  </label>
                  <label className="sm-field">
                    <span>Elective Type (backend unavailable)</span>
                    <ProjectSelect disabled value={groupForm.electiveType} onChange={event => setGroupForm({ ...groupForm, electiveType: event.target.value })} required>
                      <option value="">Select</option>
                      <option value="Elective">Elective</option>
                      <option value="Non-Elective">Non-Elective</option>
                    </ProjectSelect>
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

            <></>
          </div>
</SharedViewDialog>

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
        {error && activeTab !== 'groups' && <p role="alert">{error}<button onClick={()=>loadCore()}>Retry elective records</button></p>}
        <section className="em-kpi-grid">
          {[[FiLayers, kpis.groups, 'Total Elective Groups'], [FiAward, kpis.active, 'Active Groups'], [FiUsers, kpis.selections, 'Total Selections'], [FiCheckCircle, kpis.pending, 'Pending Approvals'], [FiCheck, kpis.approved, 'Approved Selections'], [FiCheckCircle, kpis.allocated, 'Allocated Students']].map(([Icon, value, label]) => (
            <div className="em-kpi-card" key={label}>
              <div className="sm-kpi-icon sm-kpi-icon--blue"><Icon /></div>
              <div className="em-kpi-content"><small>{label}</small><strong>{value}</strong></div>
            </div>
          ))}
        </section>
        {activeTab === 'subjects' && (
          <section className="sm-card em-subject-directory-card" aria-labelledby="elective-directory-title">
            <div className="sm-card-header">
              <h2 id="elective-directory-title">Elective Subject Directory</h2>
            </div>
            <FilterPanel
              className="em-subject-filter-panel"
              active={electiveFiltersActive}
              onClear={() => setFilters(old => ({ ...old, course: 'All', branch: 'All', semester: 'All', academicYear: 'All', level: 'All', status: 'All' }))}
              hideClear
              leadingActions={(
                <ExportMenu rows={electiveTableRows} columns={electiveTableExportColumns} title="Elective Subject Directory" filename="elective-subject-directory" scope="All matching subject records" loading={directoryLoading || Boolean(directoryError) || mastersLoading || Boolean(mastersError)} />
              )}
              search={(
                <label className="em-subject-search">
                  <FiSearch aria-hidden="true" />
                  <input type="search" aria-label="Search elective subjects" placeholder="Search by subject code or name" value={search} onChange={event => setSearch(event.target.value)} />
                </label>
              )}
              filters={(
                <div className="em-subject-filter-content">
                  <div className="em-filters">
                    {['academicYear', 'course', 'branch', 'semester', 'level', 'status'].map(key => {
                      const labels = { course: 'Course', branch: 'Branch', semester: 'Semester', academicYear: 'Academic Year', level: 'Level', status: 'Status' }
                      const label = labels[key]
                      return (
                        <label key={key}>
                          <span className="em-filter-label">{label}</span>
                          <SearchableSelect
                            label={`Select ${label}`}
                            value={filters[key]}
                            options={[{ value: 'All', label: 'All' }, ...directoryFilterOptions(key)]}
                            onChange={value => setFilters(old => changeAcademicFilter(old, key, value))}
                            placeholder="All"
                            searchPlaceholder={`Search ${label.toLowerCase()}...`}
                            noOptionsMessage={`No ${label.toLowerCase()} options found.`}
                          />
                        </label>
                      )
                    })}
                  </div>
                  {electiveFiltersActive && <button type="button" className="em-subject-filter-clear" onClick={() => setFilters(old => ({ ...old, course: 'All', branch: 'All', semester: 'All', academicYear: 'All', level: 'All', status: 'All' }))}>Clear filters</button>}
                </div>
              )}
            />
            <div className="sm-table-wrap">
              {directoryLoading || mastersLoading ? (
                <div className="em-loading">Loading subjects...</div>
              ) : directoryError || mastersError ? (
                <div className="em-alert" role="alert">{directoryError || mastersError}<button type="button" onClick={() => { loadDirectory(); loadMasters() }}>Retry</button></div>
              ) : !electiveTableRows.length ? (
                <EmptyState className="em-subject-empty" icon={FiBookOpen} title={hasSubjectFilter ? 'No matching elective subjects' : 'Find elective subjects'} description={hasSubjectFilter ? 'Try a different search or adjust the filters.' : 'Search by subject code or name, or open Filters to narrow the directory.'} />
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
          <section className="sm-card"><p role="status">Group editing, deletion, status, group credits and selection windows are unavailable: no verified writable backend capability exists.</p>
            <div className="em-toolbar"><div className="em-search"><FiSearch /><input aria-label="Search elective groups" placeholder="Search elective groups..." value={search} onChange={event => setSearch(event.target.value)} /></div><button type="button" className="sm-btn sm-btn--primary" hidden={!canCreate} onClick={() => openGroup()}><FiPlus /> Create Elective Group</button><button type="button" className="sm-btn sm-btn--secondary" onClick={() => { loadCore(); loadDirectory() }}>Refresh</button></div>
            {loading ? <div className="em-loading">Loading elective groups...</div> : error ? <div role="alert">{error}<button type="button" onClick={() => loadCore()}>Retry</button></div> : !filteredGroups.length ? <DirectoryEmptyState title="No elective groups found." actionLabel="Create Elective Group" onAction={() => openGroup()} /> : <div className="sm-table-wrap"><table className="em-table"><thead><tr><th>Group</th><th>Course</th><th>Branch</th><th>Semester</th><th>Status</th><th>Actions</th></tr></thead><tbody>{pageRows(filteredGroups).map(group => <tr key={group.id}><td>{group.groupCode}<span className="em-cell-subtitle">{group.groupName}</span>{group.subjectsError && <p role="alert">{group.subjectsError} <button onClick={()=>loadCore()}>Retry group subjects</button></p>}</td><td>{group.course}</td><td>{group.branch}</td><td>{group.semester}</td><td><StatusBadge value={group.status} /></td><td><div className="em-row-actions"><button type="button" onClick={() => setViewingGroup(group)}>View</button><button type="button" disabled title="No verified group update endpoint">Edit unavailable</button><button type="button" hidden={!canEdit} onClick={() => { setSubjectModal(group); setSelectedSubjects([]); loadDirectory() }}>Link Subjects</button><button type="button" disabled title="No verified group delete endpoint"><FiTrash2 /> Delete unavailable</button></div></td></tr>)}</tbody></table></div>}
            <Pagination page={page} pageCount={Math.ceil(filteredGroups.length / size)} total={filteredGroups.length} size={size} onChange={setPage} />
          </section>
        )}
        {activeTab === 'selection' && (
          <>
            <StudentCard profile={profile} loading={profileLoading} />
            <><label className="sm-field">Student<ProjectSelect value={studentId} disabled={profileLoading || actionLoading} onChange={event=>selectStudent(event.target.value)}><option value="">Select a student</option>{studentOptions.map(student=><option key={student.studentId} value={student.studentId}>{student.fullName} · {student.studentCode}</option>)}</ProjectSelect></label>{studentError && <p role="alert">{studentError}<button onClick={()=>studentId ? selectStudent(studentId) : loadProfile()}>Retry student records</button></p>}<section className="em-workflow-grid">
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
                      <ProjectSelect value={selectedGroupId} onChange={event => { setSelectedGroupId(event.target.value); setSelectedSubjectId('') }} required>
                        <option value="">Select group</option>
                        {groupsForStudent.filter(group => ['open', 'active'].includes(String(group.status).toLowerCase())).map(group => (
                          <option key={group.id || group.groupId} value={group.id || group.groupId}>{group.groupCode} - {group.groupName}</option>
                        ))}
                      </ProjectSelect>
                    </label>
                    <label className="sm-field">
                      Available Subject
                      <ProjectSelect value={selectedSubjectId} onChange={event => setSelectedSubjectId(event.target.value)} disabled={!selectedGroup} required>
                        <option value="">Select subject</option>
                        {eligibleSubjects.map(subject => (
                          <option key={subject.id || subject.subjectId || subject.code} value={subject.id || subject.subjectId || subject.code}>
                            {subject.subjectCode || subject.code} - {subject.subjectName || subject.name}
                          </option>
                        ))}
                      </ProjectSelect>
                    </label>
                    <button type="submit" className="sm-btn sm-btn--primary" disabled={actionLoading || !canCreate}><FiCheck /> Submit Selection</button>
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
            </section></>
          </>
        )}
        {activeTab === 'approval' && (
          <section className="sm-card">
            <div className="sm-card-header">
              <h2>Faculty Approval</h2>
              <span className="em-muted">{pending.length} pending</span>
            </div>
            <Toolbar search={search} setSearch={setSearch} filters={filters} setFilters={setFilters} options={['approvalStatus']} values={() => ['Pending', 'Approved', 'Rejected']} placeholder="Search student..." />
            <SelectionTable rows={pageRows(pendingFiltered)} approval={canEdit} onApproval={updateApproval} search={search} />
            <Pagination page={page} pageCount={Math.ceil(pendingFiltered.length / size)} total={pendingFiltered.length} size={size} onChange={setPage} />
          </section>
        )}
        {activeTab === 'allocation' && (
          <section className="sm-card">
            <div className="sm-card-header">
              <div>
                <h2>Elective Allocation</h2>
                <p className="em-muted">Review approved selections before running allocation.</p>
              </div>
              <button type="button" className="sm-btn sm-btn--primary" onClick={allocate} disabled={!canEdit || actionLoading || !approved.length}><FiCheck /> Allocate Electives</button>
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
        {groupEditor}
        {viewingSubject && (
          <SharedViewDialog
            title="Subject Details"
            subtitle={[viewingSubject.subjectCode || viewingSubject.code, viewingSubject.subjectName || viewingSubject.name].filter(Boolean).join(' · ')}
            icon={FiBookOpen}
            onClose={() => setViewingSubject(null)}
            hideFooter
            maxWidth="900px"
          >
              <div className="view-modal-fields em-subject-view-details">
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
                ].map(([label, value]) => (
                  <div className="view-modal-field em-subject-view-field" key={label}>
                    <span className="view-modal-label">{label}</span>
                    <strong className="view-modal-value">{text(value, '-')}</strong>
                  </div>
                ))}
              </div>
          </SharedViewDialog>
        )}
        {viewingGroup && (
          <SharedViewDialog title={'Elective Group Details'} onClose={() => setViewingGroup(null)} busy={actionLoading} showExport={false} hideFooter maxWidth="900px">


              <div className="sm-modal-body em-group-details">
                {[['Elective Code', viewingGroup.groupCode], ['Elective Name', viewingGroup.groupName], ['Course', viewingGroup.course], ['Department', viewingGroup.department], ['Branch', viewingGroup.branch], ['Academic Year', viewingGroup.academicYear], ['Semester', viewingGroup.semester], ['Elective Type', electiveTypeOf(viewingGroup)], ['Credits', creditsOf(viewingGroup)], ['Minimum / Maximum Selection', `${viewingGroup.minimumSelection} / ${viewingGroup.maximumSelection}`], ['Selection Start Date', viewingGroup.selectionStartDate], ['Selection End Date', viewingGroup.selectionEndDate], ['Status', viewingGroup.status]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{text(value, '-')}</strong></div>)}
              </div>
              <footer className="sm-modal-footer"><button type="button" className="sm-btn sm-btn--secondary" onClick={() => setViewingGroup(null)}>Close</button><button type="button" className="sm-btn sm-btn--primary" onClick={() => { const group = viewingGroup; setViewingGroup(null); openGroup(group) }}><FiEdit2 /> Edit Group</button></footer>

          </SharedViewDialog>
        )}
        {subjectModal && (
          <SharedViewDialog title={'Manage Subjects: ' + subjectModal.groupCode} onClose={() => setSubjectModal(null)} busy={actionLoading} showExport={false} hideFooter maxWidth="900px">

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

          </SharedViewDialog>
        )}
      </main>
    </DashboardLayout>
  );
}
