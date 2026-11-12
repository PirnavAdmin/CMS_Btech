import PageHeader from '../../components/PageHeader'
import ViewDialog from '../../components/ViewDialog'
import { useScreenAccess } from '../../auth/ScreenAccess'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { FiPlus, FiSearch, FiBookOpen, FiTrash2, FiX } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import EmptyState from '../../components/EmptyState'
import ExportMenu from '../../components/ExportMenu'
import FilterPanel from '../../components/FilterPanel'
import SearchableSelect from '../../components/SearchableSelect'
import StatusBadge from '../../components/StatusBadge'
import InfoCard from '../../components/InfoCard'
import TableActionButton from '../../components/TableActionButton'
import TablePagination, { PAGE_SIZE } from '../../components/TablePagination'
import subjectService from '../../services/subjectService'
import academicService, { isRecordActive } from '../../services/academicService'
import { showError, showSuccess } from '../../utils/toast'
import { useAcademic } from '../../context/AcademicContext'
import { classificationOf, enrichSubject } from '../../utils/subjectDirectory'
import { calculateCompletion, completionSchemas } from '../../utils/recordCompletion'
import { CompletionIndicator, ResumeSetupAction } from '../../components/RecordCompletion'
import { subjectTypeOptions } from '../../utils/subjectTypes'
import { downloadServerExport } from '../../utils/exportUtils'
import './SubjectManagement.css'

const ELECTIVE_TYPES = ['Elective', 'Core Subject']
const formatSubjectType = value => String(value ?? '').trim().toLowerCase().replace(/\b\w/g, character => character.toUpperCase())
const blank = () => ({ academicYearId: '', departmentId: '', courseId: '', branchId: '', semesterId: '', subjectCode: '', subjectName: '', subjectType: '', electiveType: 'Core Subject', credits: '', status: 'Active', lectureHours: '', tutorialHours: '', practicalHours: '', internalMarks: '', externalMarks: '' })
const key = v => String(v ?? '')
const semNo = s => Number(s?.semesterNumber ?? String(s?.semesterName ?? s?.semester ?? s?.name ?? s?.id ?? '').match(/\d+/)?.[0] ?? 0)
const ACADEMIC_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year']
export const getAcademicLevelFromSemester = s => { const n = semNo(s); const year = Math.ceil(n / 2); return n > 0 ? `${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year` : '' }
export const getSemestersForAcademicLevel = (list, level) => list.filter(s => getAcademicLevelFromSemester(s) === level)
const entityName = (list, value, fallback = '') => list.find(x => key(x.id) === key(value))?.name || fallback || '-'

export default function SubjectManagement() {
  const { canAction } = useScreenAccess()
  const canCreate = canAction('/subject-management','create'), canEdit = canAction('/subject-management','edit'), canDelete = canAction('/subject-management','delete')
  const [viewing, setViewing] = useState(null)
  const [deletingSubject,setDeletingSubject] = useState(null), [deleteSaving,setDeleteSaving] = useState(false)
  const deleteLock = useRef(false)
  const [saveError, setSaveError] = useState('')
  const subjectSaveLock=useRef(false), unconfirmedSubjectCreate=useRef(false)
  const listRequest = useRef(0)
  const location = useLocation()
  const navigate = useNavigate()
  const { scopeRecords, selectedCollegeId, selectedAcademicYearId, selectedAcademicYear } = useAcademic()
  const [subjects, setSubjects] = useState([]), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState('')
  const [page, setPage] = useState(1)
  const [allMasters, setMasters] = useState({ years: [], courses: [], branches: [], semesters: [] })
  const masters = { ...allMasters, ...Object.fromEntries(['courses', 'branches', 'semesters'].map(type => [type, scopeRecords(allMasters[type])])) }
  const [filters, updateFilters] = useState({ search: '', academicYearId: '', courseId: '', branchId: '', level: '', semesterId: '', subjectType: '', electiveType: '', status: '' })
  const [form, setForm] = useState(blank), [editing, setEditing] = useState(null), [editorOpen, setEditorOpen] = useState(false), [saving, setSaving] = useState(false), [recentId, setRecentId] = useState('')
  const [returnToElectives, setReturnToElectives] = useState(false)
  const [confirmingSubject, setConfirmingSubject] = useState(null), [statusSaving, setStatusSaving] = useState(false)
  const setFilters = next => { setPage(1); updateFilters(next) }
  const loadSubjects = async () => { const requestId=++listRequest.current; setLoading(true); setLoadError(''); try { const rows=await subjectService.getSubjects({ liveOnly: true }); if(requestId===listRequest.current) setSubjects(rows) } catch (e) { if(requestId===listRequest.current) setLoadError(e.message || 'Unable to load subjects.') } finally { if(requestId===listRequest.current) setLoading(false) } }
  useEffect(() => { setEditorOpen(false); setViewing(null); loadSubjects(); return () => { listRequest.current += 1 } }, [selectedCollegeId, selectedAcademicYearId])
  useEffect(() => {
    let active = true
    setMasters({ years: [], courses: [], branches: [], semesters: [] })
    if (!selectedCollegeId) return () => { active = false }
    Promise.all([
      academicService.getAcademicYears(),
      academicService.getCourses({ status: 1 }),
      academicService.getBranches(),
      academicService.getSemesters(),
    ]).then(([years, courses, branches, semesters]) => {
      if (active) setMasters({ years, courses, branches, semesters })
    }).catch(() => {
      if (active) showError('Academic mapping options could not be loaded.')
    })
    return () => { active = false }
  }, [selectedCollegeId])
  const scopedCourses = scopeRecords(masters.courses).filter(isRecordActive)
  const branches = courseId => scopeRecords(masters.branches).filter(b => (!courseId || key(b.courseId) === key(courseId)))
  const semesters = (courseId, branchId) => scopeRecords(masters.semesters).filter(s => (!courseId || !s.courseId || key(s.courseId) === key(courseId)) && (!branchId || !s.branchId || key(s.branchId) === key(branchId)))
  const filterSemesters = semesters(filters.courseId, filters.branchId), formSemesters = semesters(form.courseId, form.branchId).filter(row => !row.academicYearId || key(row.academicYearId) === key(form.academicYearId))
  const levels = list => [...new Set(list.map(getAcademicLevelFromSemester).filter(Boolean))]
  const types = useMemo(() => subjectTypeOptions(subjects), [subjects])
  const mapping = s => ({ year: entityName(masters.years, s.academicYearId, s.academicYear), course: entityName(masters.courses, s.courseId, s.course), branch: entityName(masters.branches, s.branchId, s.branch), semester: entityName(masters.semesters, s.semesterId, s.semester) })

  const scopedSubjects = useMemo(() => {
    return scopeRecords(subjects).filter((s) => {
      const matchesYear = !selectedAcademicYearId || !s.academicYearId || key(s.academicYearId) === key(selectedAcademicYearId)
      const course = masters.courses.find(c => key(c.id) === key(s.courseId))
      const branch = masters.branches.find(b => key(b.id) === key(s.branchId))
      const itemCollegeId = s.collegeId || course?.collegeId || branch?.collegeId
      const matchesCollege = !selectedCollegeId || !itemCollegeId || key(itemCollegeId) === key(selectedCollegeId)
      return matchesYear && matchesCollege
    })
  }, [subjects, scopeRecords, selectedAcademicYearId, selectedCollegeId, masters.courses, masters.branches])

  const records = useMemo(() => scopedSubjects.filter(s => { const q = filters.search.trim().toLowerCase(), n = semNo(s), isElective = classificationOf(s) === 'Elective'; return (!q || `${s.subjectCode} ${s.subjectName}`.toLowerCase().includes(q)) && (!filters.academicYearId || key(s.academicYearId) === key(filters.academicYearId)) && (!filters.courseId || key(s.courseId) === key(filters.courseId)) && (!filters.branchId || key(s.branchId) === key(filters.branchId)) && (!filters.semesterId || key(s.semesterId) === key(filters.semesterId)) && (!filters.level || getAcademicLevelFromSemester({ semesterNumber: n }) === filters.level) && (!filters.subjectType || s.subjectType === filters.subjectType) && (!filters.electiveType || (filters.electiveType === 'Elective' ? isElective : !isElective)) && (!filters.status || s.status === filters.status) }).sort((left, right) => key(left.id) === key(recentId) ? -1 : key(right.id) === key(recentId) ? 1 : 0), [scopedSubjects, filters, recentId])
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedRecords = records.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const kpis = useMemo(() => ({ total: records.length, active: records.filter(s => String(s.status).toLowerCase() === 'active').length, theory: records.filter(s => /theory/i.test(s.subjectType)).length, lab: records.filter(s => /lab|practical/i.test(s.subjectType)).length, credits: records.reduce((n, s) => n + Number(s.credits || 0), 0) }), [records])
  const changeFilter = (field, value) => setFilters(old => field === 'courseId' ? { ...old, courseId: value, branchId: '', level: '', semesterId: '' } : field === 'branchId' ? { ...old, branchId: value, level: '', semesterId: '' } : field === 'level' ? { ...old, level: value, semesterId: '' } : { ...old, [field]: value })
  const changeForm = (field, value) => setForm(old => field === 'academicYearId' ? { ...old, academicYearId:value, semesterId:'' } : field === 'courseId' ? { ...old, courseId: value, branchId: '', semesterId: '' } : field === 'branchId' ? { ...old, branchId: value, semesterId: '' } : { ...old, [field]: value })
  const formLevel = getAcademicLevelFromSemester(formSemesters.find(s => key(s.id) === key(form.semesterId)) || { semester: form.semester })
  const openAdd = () => { if(!canCreate) return; setSaveError(''); const activeYear = masters.years.find(year => year.isCurrent || String(year.status).toLowerCase() === 'active' || String(year.status).toLowerCase() === 'current'); setEditing(null); setForm({ ...blank(), academicYearId: selectedAcademicYearId || (activeYear ? key(activeYear.id) : '') }); setEditorOpen(true) }
  const closeEditor = (force = false) => { if(saving && force !== true) return; setSaveError(''); setEditing(null); setForm(blank()); setEditorOpen(false); if (returnToElectives) { setReturnToElectives(false); navigate('/elective-management') } }
  const openEdit = s => { if(!canEdit) return; setSaveError(''); setEditing(s); setForm({ ...blank(), ...s, departmentId: enrichSubject(s, masters).departmentId, academicYearId: key(s.academicYearId), courseId: key(s.courseId), branchId: key(s.branchId), semesterId: key(s.semesterId) }); setEditorOpen(true) }
  const handledSubjectAction = useRef(null)
  useEffect(() => {
    const request = location.state?.subjectAction
    if (!request || !subjects.length || !masters.semesters.length) return
    const requestKey = `${location.key}:${request.mode}:${request.id}`
    if (handledSubjectAction.current === requestKey) return
    const subject = subjects.find(item => key(item.id) === key(request.id) || key(item.subjectCode) === key(request.id))
    if (!subject) return
    handledSubjectAction.current = requestKey
    if (request.mode === 'edit') { openEdit(subject); setReturnToElectives(request.returnTo === '/elective-management') }
    navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, location.key, subjects, masters.semesters.length, navigate, openEdit])
  const save = async e => { e.preventDefault(); if(subjectSaveLock.current || !(editing ? canEdit : canCreate)) return; setSaveError(''); const fail = message => { setSaveError(message); showError(message) }; const requiredFields = [['Academic Year', form.academicYearId], ['Course', form.courseId], ['Branch', form.branchId], ['Semester', form.semesterId], ['Subject Code', form.subjectCode], ['Subject Name', form.subjectName]]; const missingFields = requiredFields.filter(([, value]) => !String(value ?? '').trim()).map(([label]) => label); if (missingFields.length) return fail(`Please complete: ${missingFields.join(', ')}.`); if (!ELECTIVE_TYPES.includes(form.electiveType)) return fail('Select Elective Type.'); const selectedCourse = masters.courses.find(course => key(course.id) === key(form.courseId)); const selectedBranch = branches(form.courseId).find(branch => key(branch.id) === key(form.branchId)); if (!selectedCourse || !selectedBranch) return fail('Select a valid course and a branch belonging to that course.'); const numericFields = [['Credits', form.credits], ['Lecture hours', form.lectureHours], ['Tutorial hours', form.tutorialHours], ['Practical hours', form.practicalHours], ['Internal marks', form.internalMarks], ['External marks', form.externalMarks]]; if (numericFields.some(([, value]) => value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0))) return fail('Credits, hours, and marks must be non-negative numbers.'); if (subjects.some(s => key(s.id) !== key(editing?.id) && s.subjectCode?.toLowerCase() === form.subjectCode.trim().toLowerCase())) return fail('Subject code already exists.'); const semester = formSemesters.find(s => key(s.id) === key(form.semesterId)); if (!semester) return fail('Select a valid semester for this course and branch.'); const payload = { ...form, semester: semester.semesterName || semester.name || `Semester ${semNo(semester)}`, academicYear: entityName(masters.years, form.academicYearId), course: entityName(masters.courses, form.courseId), branch: entityName(masters.branches, form.branchId) }; if(!editing && unconfirmedSubjectCreate.current) return fail('Verify the previous subject creation in the directory before another submission.'); subjectSaveLock.current=true; setSaving(true); try { if (editing) { await subjectService.updateSubject(editing.id, payload); showSuccess('Subject updated successfully') } else { const created = await subjectService.createSubject(payload); if(!(created?.id || created?.subjectId)){unconfirmedSubjectCreate.current=true;throw new Error('The server did not return a subject identity. Verify the directory before creating again.')} setRecentId(created.id || created.subjectId); setPage(1); showSuccess('Subject created successfully') } closeEditor(true); await loadSubjects() } catch (err) { fail(err.message || 'Failed to save subject.') } finally { subjectSaveLock.current=false; setSaving(false) } }
  const openDelete = async subject => {
    if(!canDelete)return
    setDeletingSubject({...subject,checking:true,dependencyError:'',canDelete:false})
    try {
      const result=await subjectService.getSubjectDependencies(subject.id)
      const rows=Array.isArray(result)?result:result?.dependencies || result?.data
      if(!Array.isArray(rows))throw new Error('Subject dependencies could not be verified.')
      const allowed=rows.every(row=>{const count=row.totalCount ?? row.TotalCount;return count!=null && Number.isFinite(Number(count)) && Number(count)===0})
      setDeletingSubject(current=>current?.id===subject.id?{...current,checking:false,canDelete:allowed,dependencies:rows}:current)
    } catch(error) {setDeletingSubject(current=>current?.id===subject.id?{...current,checking:false,dependencyError:error.message}:current)}
  }
  const confirmDelete = async () => {
    if(!canDelete || deleteLock.current || !deletingSubject?.canDelete || deletingSubject.checking)return
    deleteLock.current=true;setDeleteSaving(true)
    try {await subjectService.deleteSubject(deletingSubject.id);setSubjects(current=>current.filter(row=>key(row.id)!==key(deletingSubject.id)));setDeletingSubject(null);showSuccess('Subject deleted successfully.');await loadSubjects()}
    catch(error){setDeletingSubject(current=>({...current,dependencyError:error.message || 'Subject could not be deleted.'}))}
    finally{deleteLock.current=false;setDeleteSaving(false)}
  }
  const updateStatus = async s => {
    if (!canEdit || statusSaving) return
    const status = String(s.status).toLowerCase() === 'active' ? 'Inactive' : 'Active'
    if (status === 'Inactive') { setConfirmingSubject(s); return }
    await persistStatus(s, status)
  }
  const persistStatus = async (subject, status) => {
    if (!canEdit || statusSaving) return
    setStatusSaving(true)
    try {
      await subjectService.updateSubjectStatus(subject.id, status)
      showSuccess(`Subject ${status.toLowerCase()}d successfully`)
      setConfirmingSubject(null)
      await loadSubjects()
    } catch (err) { showError(err.message || 'Unable to update status.') }
    finally { setStatusSaving(false) }
  }
  const columns = [{ label: 'Subject Code', value: 'subjectCode' }, { label: 'Subject Name', value: 'subjectName' }, { label: 'Academic Year', value: s => mapping(s).year }, { label: 'Course', value: s => mapping(s).course }, { label: 'Branch', value: s => mapping(s).branch }, { label: 'Academic Level', value: s => getAcademicLevelFromSemester(s) }, { label: 'Semester', value: s => mapping(s).semester }, { label: 'Subject Type', value: s => formatSubjectType(s.subjectType) }, { label: 'Credits', value: 'credits' }, { label: 'Status', value: 'status' }]
  const activeFilters = [
    filters.academicYearId && { label: 'Academic year', value: masters.years.find(row => key(row.id) === key(filters.academicYearId))?.name || filters.academicYearId, field: 'academicYearId' },
    filters.courseId && { label: 'Course', value: masters.courses.find(row => key(row.id) === key(filters.courseId))?.name || filters.courseId, field: 'courseId' },
    filters.branchId && { label: 'Branch', value: masters.branches.find(row => key(row.id) === key(filters.branchId))?.name || filters.branchId, field: 'branchId' },
    filters.level && { label: 'Academic level', value: filters.level, field: 'level' },
    filters.semesterId && { label: 'Semester', value: (() => { const semester = masters.semesters.find(row => key(row.id) === key(filters.semesterId)); return semester ? semester.semesterName || semester.name || `Semester ${semNo(semester)}` : filters.semesterId })(), field: 'semesterId' },
    filters.subjectType && { label: 'Subject type', value: formatSubjectType(filters.subjectType), field: 'subjectType' },
    filters.electiveType && { label: 'Elective classification', value: filters.electiveType, field: 'electiveType' },
    filters.status && { label: 'Status', value: filters.status, field: 'status' },
  ].filter(Boolean)
  const detailSections = s => { const m = mapping(s); return [{ title: 'Subject Information', rows: [['Subject Code', s.subjectCode], ['Subject Name', s.subjectName], ['Subject Type', formatSubjectType(s.subjectType)], ['Elective Type', s.electiveType], ['Credits', s.credits], ['Status', s.status]] }, { title: 'Academic Mapping', rows: [['Academic Year', m.year], ['Course', m.course], ['Branch', m.branch], ['Academic Level', getAcademicLevelFromSemester({ semester: m.semester })], ['Semester', m.semester]] }, { title: 'Academic Configuration', rows: [['Lecture Hours', s.lectureHours], ['Tutorial Hours', s.tutorialHours], ['Practical Hours', s.practicalHours], ['Internal Marks', s.internalMarks], ['External Marks', s.externalMarks]].filter(([, v]) => v !== '' && v != null) }].filter(x => x.rows.length) }
  const editor = editorOpen && <ViewDialog title={editing ? 'Edit Subject' : 'Add Subject'} subtitle="Map the subject to its academic program, then complete its details and workload." icon={FiBookOpen} onClose={closeEditor} busy={saving} showExport={false} hideFooter maxWidth="860px" className="subject-editor-dialog">{saveError && <p role="alert" className="sm-error">{saveError}</p>}<Editor
            form={form}
            editing={editing}
            masters={{ ...masters, courses: scopedCourses }}
            branches={branches(form.courseId)}
            semesters={formSemesters}
            levels={ACADEMIC_LEVELS}
            typeOptions={types}
            formLevel={formLevel}
            change={changeForm}
            close={closeEditor}
            save={save}
            saving={saving}
          /></ViewDialog>

  return (
    <DashboardLayout>
      <main className="sm-screen">
        <PageHeader
          className="sm-page-header"
          title="Subject Management"
          subtitle="Configure subjects, academic mappings, credits, teaching hours and marks."
          compactSummary={(
            <section className="sm-summary-strip" aria-label="Subject summary">
              {[
                ['Total Subjects', kpis.total, 'total'],
                ['Active Subjects', kpis.active, 'active'],
                ['Theory Subjects', kpis.theory, 'theory'],
                ['Practical / Lab', kpis.lab, 'lab'],
                ['Listed Subject Credits', kpis.credits, 'credits'],
              ].map(([label, value, tone]) => (
                <div className={`sm-summary-item sm-summary-item--${tone}`} key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </section>
          )}
        />
        <section className="sm-card">
          <div className="sm-directory-title">
            <div>
              <h2>Subject Directory</h2>
              <p>{loading ? 'Loading subjects...' : `${records.length} subjects found`}</p>
            </div>
          </div>
          <FilterPanel
            active={activeFilters.length > 0}
            activeCount={activeFilters.length}
            appliedFilters={[]}
            onClear={() => setFilters({ search: '', academicYearId: '', courseId: '', branchId: '', level: '', semesterId: '', subjectType: '', electiveType: '', status: '' })}
            hideClear
            className="sm-filter-panel"
            leadingActions={(
              <ExportMenu rows={records} columns={columns} filename="subject-directory" title="Subject Directory" scope="All matching subjects" onDownload={async () => downloadServerExport(await subjectService.exportSubjects({ search: filters.search, academicYearId: filters.academicYearId, courseId: filters.courseId, branchId: filters.branchId, semesterId: filters.semesterId, subjectType: filters.subjectType, electiveType: filters.electiveType === 'Non-Elective' ? 'Core Subject' : filters.electiveType, status: filters.status }), 'subject-directory')} />
            )}
            actions={(
              <button hidden={!canCreate} className="sm-btn sm-btn--primary" onClick={openAdd}><FiPlus /> Add Subject</button>
            )}
            search={(
              <label className="sm-search-wrap">
                <FiSearch aria-hidden="true" />
                <input type="search" className="sm-search-input" aria-label="Search subjects" value={filters.search} onChange={e => changeFilter('search', e.target.value)} placeholder="Search by code or name" />
              </label>
            )}
            filters={(
              <div className="sm-filter-content">
                {activeFilters.length > 0 && (
                  <div className="sm-filter-summary" aria-label="Selected filters">
                    <div className="sm-filter-summary__heading">
                      <strong>Selected filters</strong>
                      <span>{activeFilters.length} applied</span>
                    </div>
                    <div className="sm-filter-chips">
                      {activeFilters.map(filter => (
                        <button key={filter.field} type="button" className="sm-filter-chip" title={`${filter.label}: ${filter.value} · click to remove`} onClick={() => changeFilter(filter.field, '')} aria-label={`Remove ${filter.label} filter`}>
                          <span><small>{filter.label}</small><strong>{filter.value}</strong></span>
                          <FiX aria-hidden="true" />
                        </button>
                      ))}
                      <button type="button" className="sm-filter-clear" onClick={() => setFilters({ search: '', academicYearId: '', courseId: '', branchId: '', level: '', semesterId: '', subjectType: '', electiveType: '', status: '' })}>Clear filters</button>
                    </div>
                  </div>
                )}
                <div className="sm-filter-grid">
                  <Select label="Academic Year" value={filters.academicYearId} options={masters.years} onChange={v => changeFilter('academicYearId', v)} />
                  <Select label="Course" value={filters.courseId} options={scopedCourses} onChange={v => changeFilter('courseId', v)} />
                  <Select label="Branch" value={filters.branchId} options={branches(filters.courseId)} onChange={v => changeFilter('branchId', v)} disabled={!filters.courseId} />
                  <Select label="Academic Level" value={filters.level} options={levels(filterSemesters)} onChange={v => changeFilter('level', v)} disabled={!filters.branchId} />
                  <Select label="Semester" value={filters.semesterId} options={getSemestersForAcademicLevel(filterSemesters, filters.level)} onChange={v => changeFilter('semesterId', v)} disabled={!filters.level} semester />
                  <Select label="Subject Type" value={filters.subjectType} options={types} onChange={v => changeFilter('subjectType', v)} />
                  <Select label="Elective Classification" value={filters.electiveType} options={['Elective', 'Non-Elective']} onChange={v => changeFilter('electiveType', v)} />
                  <Select label="Status" value={filters.status} options={['Active', 'Inactive']} onChange={v => changeFilter('status', v)} />
                </div>
              </div>
            )}
          />
          <div className="sm-table-wrap">
            {loading ? (
              <div className="sm-loading">Loading subject directory...</div>
            ) : loadError ? (
              <div className="sm-directory-feedback">
                <div className="sm-error" role="alert">
                  <span>{loadError}</span>
                  <button type="button" className="sm-btn sm-btn--secondary" onClick={loadSubjects}>Retry</button>
                </div>
              </div>
            ) : !records.length ? (
              <EmptyState
                title="No subjects found."
                description="Add a subject to get started."
              />
            ) : (
              <table className="sm-table">
                <colgroup>{[8, 13, 13, 6, 7, 7, 6, 9, 8, 7, 16].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
                <thead>
                  <tr>
                    <th className="table-center">Subject Code</th>
                    <th className="table-center">Subject Name</th>
                    <th className="table-center">Academic Mapping</th>
                    <th className="table-center">Academic Level</th>
                    <th className="table-center">Semester</th>
                    <th className="table-center">Type</th>
                    <th className="table-center">Credits</th>
                    <th className="table-center">Hours / Marks</th>
                    <th className="table-center">Completion</th>
                    <th className="table-center">Status</th>
                    <th className="table-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map(s => {
                    const m = mapping(s);
                    const completion = calculateCompletion(completionSchemas.subject, s);
                    return (
                      <tr key={s.id}>
                        <td className="table-center"><span className="sm-code-badge">{s.subjectCode}</span></td>
                        <td className="table-center">
                          <div className="table-primary-cell">
                            <button
                              type="button"
                              className="subject-name-link table-cell-truncate"
                              onClick={() => setViewing(s)}
                              title={`Click to view details for ${s.subjectName}`}
                            >
                              {s.subjectName}
                            </button>
                          </div>
                        </td>
                        <td className="table-center">
                          <div className="table-primary-cell">
                            <span>{m.course}</span>
                            <small>| {m.branch}</small>
                            <small>{m.year}</small>
                          </div>
                        </td>
                        <td className="table-center">{getAcademicLevelFromSemester({ semester: m.semester }) || '-'}</td>
                        <td className="table-center">{m.semester}</td>
                        <td className="table-center"><div className="table-primary-cell">{s.subjectType && <span className={`sm-type-tag ${/lab|practical/i.test(s.subjectType) ? 'sm-type-tag--lab' : 'sm-type-tag--theory'}`}>{formatSubjectType(s.subjectType)}</span>}<small>{s.electiveType || '—'}</small></div></td>
                        <td className="table-center"><span className="sm-credit-badge">{s.credits}</span></td>
                        <td className="table-center"><div className="table-primary-cell"><span>L/T/P: {[s.lectureHours, s.tutorialHours, s.practicalHours].map(value => value ?? '—').join(' / ')}</span><small>Internal / External: {[s.internalMarks, s.externalMarks].map(value => value ?? '—').join(' / ')}</small></div></td>
                        <td className="table-center"><CompletionIndicator completion={completion} /></td>
                        <td className="table-center"><StatusBadge value={s.status} /></td>
                        <td className="table-center sm-actions-cell">
                          <div className="sm-row-actions">
                            <TableActionButton type="view" ariaLabel={`View ${s.subjectCode}`} onClick={() => setViewing(s)} />
                            <TableActionButton hidden={!canEdit} type="edit" ariaLabel={`Edit ${s.subjectCode}`} onClick={() => openEdit(s)} />
                            {canEdit && <ResumeSetupAction completion={completion} name={s.subjectCode} onClick={() => openEdit(s)} />}
                            <button hidden={!canDelete} type="button" className="table-action-btn action-delete" aria-label={`Delete ${s.subjectCode}`} title="Delete Subject" onClick={()=>openDelete(s)}><FiTrash2/></button>
                            <TableActionButton hidden={!canEdit} type={String(s.status).toLowerCase() === 'active' ? 'deactivate' : 'activate'} ariaLabel={`${String(s.status).toLowerCase() === 'active' ? 'Deactivate' : 'Activate'} ${s.subjectCode}`} onClick={() => updateStatus(s)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {!loading && !loadError && records.length > 0 && <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />}
        </section>
        {editor}
        {viewing && <Details subject={viewing} sections={detailSections(viewing)} close={() => setViewing(null)} edit={canEdit ? () => { openEdit(viewing); setViewing(null) } : null} />}
        {deletingSubject && <ViewDialog title="Delete Subject?" subtitle={deletingSubject.subjectCode+' · '+deletingSubject.subjectName} onClose={()=>setDeletingSubject(null)} busy={deleteSaving} showExport={false} hideFooter>{deletingSubject.checking ? <p role="status">Checking subject dependencies…</p> : deletingSubject.dependencyError ? <p role="alert">{deletingSubject.dependencyError} <button onClick={()=>openDelete(deletingSubject)}>Retry dependency check</button></p> : deletingSubject.canDelete ? <p>Delete this subject? Referenced academic records remain subject to backend validation.</p> : <p role="alert">This subject has dependent records and cannot be deleted.</p>}<button disabled={deleteSaving} onClick={()=>setDeletingSubject(null)}>Cancel</button><button disabled={deleteSaving || deletingSubject.checking || !deletingSubject.canDelete || Boolean(deletingSubject.dependencyError)} onClick={confirmDelete}>{deleteSaving ? 'Deleting…' : 'Confirm delete'}</button></ViewDialog>}
        {confirmingSubject && <StatusConfirmation subject={confirmingSubject} saving={statusSaving} close={() => setConfirmingSubject(null)} confirm={() => persistStatus(confirmingSubject, 'Inactive')} />}
      </main>
    </DashboardLayout>
  );
}

export function SubjectDetailsPage() {
  const { canAction } = useScreenAccess()
  const { scopeRecords } = useAcademic()
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [subject, setSubject] = useState(null)
  const [masters, setMasters] = useState({ years: [], courses: [], branches: [], semesters: [] })
  const [loading, setLoading] = useState(true)
  const returnTo = location.state?.returnTo || '/subject-management'
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    Promise.all([subjectService.getSubject(id), academicService.getAcademicYears(), academicService.getCourses(), academicService.getBranches(), academicService.getSemesters()])
      .then(([found, years, courses, branches, semesters]) => {
        if (!active) return
        if (!found || !scopeRecords([found]).length) throw new Error('Subject not found in the selected college.')
        setSubject(found)
        setMasters({ years, courses, branches, semesters })
      })
      .catch(error => { if(active) setError(error.message || 'Unable to load subject details.') })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [id, navigate, attempt, scopeRecords])
  const mapping = s => ({ year: entityName(masters.years, s.academicYearId, s.academicYear), course: entityName(masters.courses, s.courseId, s.course), branch: entityName(masters.branches, s.branchId, s.branch), semester: entityName(masters.semesters, s.semesterId, s.semester) })
  const sections = subject ? (() => { const m = mapping(subject); return [{ title: 'Subject Information', rows: [['Subject Code', subject.subjectCode], ['Subject Name', subject.subjectName], ['Subject Type', formatSubjectType(subject.subjectType)], ['Elective Type', subject.electiveType], ['Credits', subject.credits], ['Status', subject.status]] }, { title: 'Academic Mapping', rows: [['Academic Year', m.year], ['Course', m.course], ['Branch', m.branch], ['Academic Level', getAcademicLevelFromSemester({ semester: m.semester })], ['Semester', m.semester]] }, { title: 'Academic Configuration', rows: [['Lecture Hours', subject.lectureHours], ['Tutorial Hours', subject.tutorialHours], ['Practical Hours', subject.practicalHours], ['Internal Marks', subject.internalMarks], ['External Marks', subject.externalMarks]].filter(([, value]) => value !== '' && value != null) }].filter(section => section.rows.length) })() : []
  const edit = () => navigate('/subject-management', { state: { subjectAction: { mode: 'edit', id: subject.id } } })
  return <><SubjectManagement />{subject && !loading && !error ? <Details subject={subject} sections={sections} close={() => navigate(returnTo)} edit={canAction('/subject-management','edit') ? edit : null} /> : <ViewDialog title="Subject Details" onClose={() => navigate(returnTo)} showExport={false}><div role={error ? 'alert' : 'status'}>{error || 'Loading subject details...'}{error && <button type="button" onClick={() => setAttempt(value => value + 1)}>Retry details</button>}</div></ViewDialog>}</>

}
function Select({ label, value, options, onChange, disabled, semester = false, hideSearch = false, placeholder = label }) { return <SearchableSelect placement="bottom" hideSearch={hideSearch} label={label} value={value} options={options} onChange={onChange} placeholder={placeholder} disabled={disabled} getOptionLabel={semester ? s => s.semesterName || s.name || `Semester ${semNo(s)}` : undefined} /> }
function Field({ label, children }) { return <div className="sm-field"><label>{label}</label>{children}</div> }
function Input({ label, value, change, type = 'text' }) {
  const numeric = type === 'number'
  return <label className="sm-field">
    <span>{label}</span>
    <input type={type} min={numeric ? 0 : undefined} step={numeric ? '0.01' : undefined}
      value={value ?? ''} onChange={event => change(event.target.value)} />
  </label>
}
function StatusConfirmation({ subject, saving, close, confirm }) { return <ViewDialog title="Deactivate Subject?" onClose={close} busy={saving} showExport={false} hideFooter maxWidth="520px"><p><strong>{subject.subjectName} ({subject.subjectCode})</strong> will no longer be available for new academic use. Continue?</p><footer className="sm-modal-footer"><button type="button" className="sm-btn sm-btn--secondary" disabled={saving} onClick={close}>Cancel</button><button type="button" className="sm-btn sm-btn--danger" disabled={saving} onClick={confirm}>{saving ? 'Deactivating…' : 'Confirm Deactivate'}</button></footer></ViewDialog> }

function Editor({ form, editing, masters, branches, semesters, levels, typeOptions, formLevel: initialLevel, change: updateForm, close, save, saving }) {
  const [formLevel, setFormLevel] = useState(initialLevel);
  const [activeTab, setActiveTab] = useState('mapping');
  const [mappingError, setMappingError] = useState('');
  const change = (field, value) => {
    if (field === 'courseId' || field === 'branchId') setFormLevel('');
    updateForm(field, value);
  };
  const selectLevel = v => {
    setFormLevel(v);
    change('semesterId', '');
  };

  const tabs = [
    { id: 'mapping', label: '1. Academic Mapping' },
    { id: 'info', label: '2. Subject Details' },
    { id: 'config', label: '3. Credits, Hours & Marks' },
  ];
  const stepIndex = tabs.findIndex(t => t.id === activeTab);
  const validateMapping = () => {
    const hasValue = value => value !== '' && value !== null && value !== undefined;
    const missing = !hasValue(form.academicYearId) || !hasValue(form.courseId) || !hasValue(form.branchId) || !hasValue(formLevel) || !hasValue(form.semesterId);
    if (missing) {
      setMappingError('Please complete Academic Year, Course, Branch, Academic Level, and Semester before continuing.');
      return false;
    }
    setMappingError('');
    return true;
  };
  const goToTab = tabId => {
    if (activeTab === 'mapping' && tabId !== 'mapping' && !validateMapping()) return;
    setActiveTab(tabId);
  };
  const handleSubmit = event => {
    event.preventDefault();
    if (saving) return;
    if (activeTab !== 'config') {
      goToTab(tabs[stepIndex + 1].id);
      return;
    }
    save(event);
  };

  return (
    <div className="erp-two-column-layout sm-editor-layout" data-without-live-preview="true">
      <div className="erp-card-main">
        <div className="sm-reference-tabs">
          {tabs.map((t, idx) => (
            <button
              key={t.id}
              type="button"
              className={`erp-tab-btn ${activeTab === t.id ? 'active' : ''}`}
              aria-current={activeTab === t.id ? 'step' : undefined}
              onClick={() => goToTab(t.id)}
            >
              <span>{idx + 1}</span> {t.label.replace(/^\d+\.\s*/, '')}
            </button>
          ))}
        </div>

        <form className="erp-form-scroll-body sm-editor-form" onSubmit={handleSubmit}>
          <div className="sm-editor-step-content">
          {activeTab === 'mapping' && (
            <section>
              <h3 className="sm-editor-section-title">Academic Mapping</h3>
              <p className="sm-editor-section-description">Choose the academic year and program placement for this subject.</p>
              {mappingError && <p role="alert" className="sm-editor-error">{mappingError}</p>}
              <div className="sm-form-grid-2">
                <Field label={<>Academic Year <span className="sm-required">*</span></>}>
                  <Select label="Academic Year" value={form.academicYearId} options={masters.years} onChange={v => change('academicYearId', v)} />
                  {!masters.years.length && <small>Academic years are unavailable. Check Academic Year setup and reopen this form.</small>}
                </Field>
                <Field label={<>Course <span className="sm-required">*</span></>}>
                    <Select label="Course" value={form.courseId} options={masters.courses} onChange={v => change('courseId', v)} />
                </Field>
                <Field label={<>Branch <span className="sm-required">*</span></>}>
                    <Select label="Branch" value={form.branchId} options={branches} onChange={v => change('branchId', v)} disabled={!form.courseId} placeholder={form.courseId ? 'Select branch' : 'Choose a course first'} />
                </Field>
                <Field label={<>Academic Level <span className="sm-required">*</span></>}>
                  <Select label="Academic Level" value={formLevel} options={levels} onChange={selectLevel} disabled={!form.branchId} placeholder={form.branchId ? 'Select academic level' : 'Choose a branch first'} />
                </Field>
                <Field label={<>Semester <span className="sm-required">*</span></>}>
                  <Select label="Semester" hideSearch value={form.semesterId} options={getSemestersForAcademicLevel(semesters, formLevel)} onChange={v => change('semesterId', v)} disabled={!form.branchId || !formLevel} placeholder={formLevel ? 'Select semester' : 'Choose an academic level first'} semester />
                </Field>
              </div>
            </section>
          )}

          {activeTab === 'info' && (
            <section>
              <h3 className="sm-editor-section-title">Subject Information</h3>
              <p className="sm-editor-section-description">Set the subject identity, classification and availability.</p>
              <div className="sm-form-grid-2">
                <Input label={<>Subject Name <span className="sm-required">*</span></>} value={form.subjectName} change={v => change('subjectName', v)} />
                <Input label={<>Subject Code <span className="sm-required">*</span></>} value={form.subjectCode} change={v => change('subjectCode', v)} />
                <Field label="Subject Type">
                  <Select label="Subject Type" value={form.subjectType} options={typeOptions} onChange={v => change('subjectType', v)} disabled={!typeOptions.length} />
                </Field>
                <Input label="Description (optional)" value={form.description} change={v => change('description', v)} />
                <div className="sm-elective-field">
                  <label className="sm-elective-toggle"><input type="checkbox" checked={form.electiveType === 'Elective'} onChange={event => change('electiveType', event.target.checked ? 'Elective' : 'Core Subject')} /> Is Elective</label>
                  {form.electiveType === 'Elective' && <small>Link the saved subject to a group in Elective Allocation.</small>}
                </div>
                <Field label="Status">
                  <Select label="Status" value={form.status} options={['Active', 'Inactive']} onChange={v => change('status', v)} />
                </Field>
              </div>
            </section>
          )}

          {activeTab === 'config' && (
            <section>
              <h3 className="sm-editor-section-title">Credits, Hours & Marks</h3>
              <p className="sm-editor-section-description">Enter the approved credit value, weekly teaching hours and assessment marks.</p>
              <div className="sm-form-grid-3">
                <Input label="Credits" type="number" value={form.credits} change={v => change('credits', v)} />
                <Input label="Lecture Hours" type="number" value={form.lectureHours} change={v => change('lectureHours', v)} />
                <Input label="Tutorial Hours" type="number" value={form.tutorialHours} change={v => change('tutorialHours', v)} />
                <Input label="Practical Hours" type="number" value={form.practicalHours} change={v => change('practicalHours', v)} />
                <Input label="Internal Marks" type="number" value={form.internalMarks} change={v => change('internalMarks', v)} />
                <Input label="External Marks" type="number" value={form.externalMarks} change={v => change('externalMarks', v)} />
              </div>
              <p className="sm-editor-section-description">Weekly contact hours: {[form.lectureHours, form.tutorialHours, form.practicalHours].every(value => value !== '' && value != null && Number.isFinite(Number(value))) ? [form.lectureHours, form.tutorialHours, form.practicalHours].reduce((total, value) => total + Number(value), 0).toLocaleString() : '—'}</p>
            </section>
          )}
          </div>

          <div className="erp-actions-bar sm-editor-footer">
            {stepIndex > 0 ? (
              <button
                type="button"
                className="cm-button secondary erp-btn erp-btn--secondary"
                onClick={() => goToTab(tabs[stepIndex - 1].id)}
              >
                &larr; Previous
              </button>
            ) : (
              <button
                type="button"
                className="cm-button secondary erp-btn erp-btn--secondary"
                onClick={close}
              >
                Cancel
              </button>
            )}

            <div className="sm-editor-footer-actions">
              {stepIndex < tabs.length - 1 ? (
                <button
                  key="continue"
                  type="button"
                  className="cm-button erp-btn erp-btn--primary"
                  onClick={() => goToTab(tabs[stepIndex + 1].id)}
                >
                  Continue &rarr;
                </button>
              ) : (
                <button
                  key="save"
                  type="submit"
                  disabled={saving}
                  className="cm-button erp-btn erp-btn--primary"
                >
                  {saving ? 'Saving...' : editing ? 'Update Subject' : 'Create Subject'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <></>
    </div>
  );
}

function Details({ subject, sections, close, edit }) { return <ViewDialog title={subject.subjectName} subtitle={subject.subjectCode} icon={FiBookOpen} onClose={close} recordSections={sections} exportFilename={'subject-' + subject.subjectCode} footerActions={edit && <button type="button" className="sm-btn sm-btn--primary" onClick={edit}>Edit Subject</button>} maxWidth="900px"><StatusBadge value={subject.status} /><div className="sm-reference-details">{sections.map(section => <InfoCard key={section.title} title={section.title} rows={section.rows} />)}</div></ViewDialog> }
