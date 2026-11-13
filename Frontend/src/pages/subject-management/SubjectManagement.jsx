import PageHeader from '../../components/PageHeader'
import ViewDialog from '../../components/ViewDialog'
import { useScreenAccess } from '../../auth/ScreenAccess'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { FiPlus, FiSearch, FiBookOpen, FiTrash2, FiX, FiChevronDown, FiLayers, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
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
import { getCourses, getBranches, getSemesters } from '../../auth/collegeApi'
import academicService, { isRecordActive } from '../../services/academicService'
import eventBus, { ERP_EVENTS } from '../../services/eventBus'
import { showError, showSuccess } from '../../utils/toast'
import { useAcademic } from '../../context/AcademicContext'
import { classificationOf, enrichSubject } from '../../utils/subjectDirectory'
import { calculateCompletion, completionSchemas } from '../../utils/recordCompletion'
import { CompletionIndicator, ResumeSetupAction } from '../../components/RecordCompletion'
import { subjectTypeOptions } from '../../utils/subjectTypes'
import { downloadServerExport } from '../../utils/exportUtils'
import './SubjectManagement.css'

// These lookup requests include the selected college on the existing API client.
export const subjectMappingRows = (response, type, collegeId) => {
  let rows = response
  for (let depth = 0; depth < 6 && !Array.isArray(rows); depth += 1) {
    if (!rows || typeof rows !== 'object' || rows.success === false || rows.isSuccess === false) throw new Error('Academic options could not be loaded.')
    rows = rows.data ?? rows.items ?? rows.records ?? rows.results ?? rows.content ?? rows.$values ?? rows[type + 's'] ?? rows.result ?? rows.payload
  }
  if (!Array.isArray(rows)) throw new Error('Academic options were not returned as a list.')
  const scopedRows = rows.filter(row => {
    const owner = row?.collegeId ?? row?.CollegeId ?? row?.college_id
    return owner == null || owner === '' || String(owner) === String(collegeId)
  })
  const options = scopedRows.filter(row => row && typeof row === 'object').map(row => {
    const read = name => row[name] ?? row[name[0].toUpperCase() + name.slice(1)]
    return {
      ...row,
      id: read(type + 'Id') ?? read('id'),
      name: read(type + 'Name') ?? read('name') ?? '',
      collegeId: String(collegeId),
      courseId: read('courseId'),
      branchId: read('branchId'),
      departmentId: read('departmentId'),
      academicYearId: read('academicYearId'),
      semesterNumber: read('semesterNumber'),
      yearNumber: read('yearNumber'),
      semesterName: read('semesterName') ?? read('name'),
      status: read('status') ?? read(type + 'Status'),
      isActive: read('isActive'),
    }
  }).filter(row => row.id != null && row.id !== '' && String(row.name).trim())
  if (scopedRows.length && !options.length) throw new Error('Academic options lack usable IDs or names.')
  return options.filter(isRecordActive)
}

const lookupDefinitions = {
  years: ['Academic years', () => academicService.getAcademicYears(false)],
  courses: ['Courses', async collegeId => subjectMappingRows(await getCourses({ collegeId }), 'course', collegeId)],
  branches: ['Branches', async collegeId => subjectMappingRows(await getBranches({ collegeId }), 'branch', collegeId)],
  semesters: ['Semesters', async collegeId => subjectMappingRows(await getSemesters({ collegeId }), 'semester', collegeId)],
}

function useSubjectMapping(collegeId, needsBranches, needsSemesters) {
  // Keep in-flight and settled lookups for this college across modal and effect replays.
  const cache = useRef(null)
  const [results, setResults] = useState(null)
  const [reload, refresh] = useState(0)
  useEffect(() => eventBus.subscribe(ERP_EVENTS.ACADEMIC_UPDATED, () => {
    cache.current = null
    setResults(null)
    refresh(value => value + 1)
  }), [])

  useEffect(() => {
    if (!collegeId) {
      cache.current = null
      setResults(null)
      return
    }
    if (cache.current?.collegeId !== collegeId) cache.current = { collegeId, requests: new Map() }
    const { requests } = cache.current
    const fields = ['years', 'courses']
    if (needsBranches) fields.push('branches')
    if (needsSemesters) fields.push('semesters')
    let active = true
    for (const field of fields) {
      if (!requests.has(field)) {
        const [label, fetch] = lookupDefinitions[field]
        const request = Promise.resolve().then(() => fetch(collegeId)).then(rows => {
          if (!Array.isArray(rows) || rows.loadError) throw new Error(label)
          return { rows: field === 'years' ? rows.filter(isRecordActive) : rows }
        }).catch(error => ({
          error: field === 'semesters' && error.response?.status === 502
            ? 'The semester service returned HTTP 502. Please retry.'
            : label + ' could not be loaded. Please retry.',
        }))
        requests.set(field, request)
      }
      requests.get(field).then(result => {
        if (active) setResults(current => ({
          ...(current?.collegeId === collegeId ? current : { collegeId }),
          [field]: result,
        }))
      })
    }
    return () => { active = false }
  }, [collegeId, needsBranches, needsSemesters, reload])

  const current = results?.collegeId === collegeId ? results : {}
  const retry = () => {
    if (cache.current?.collegeId !== collegeId) return
    const failed = Object.keys(lookupDefinitions).filter(field => current[field]?.error)
    for (const field of failed) cache.current.requests.delete(field)
    setResults(previous => ({ ...previous, ...Object.fromEntries(failed.map(field => [field, undefined])) }))
    refresh(value => value + 1)
  }
  return { current, retry }
}

const ELECTIVE_TYPES = ['Elective', 'Core Subject']
const formatSubjectType = value => String(value ?? '').trim().toLowerCase().replace(/\b\w/g, character => character.toUpperCase())
const blank = () => ({ academicYearId: '', departmentId: '', courseId: '', branchId: '', semesterId: '', subjectCode: '', subjectName: '', subjectType: '', electiveType: 'Core Subject', credits: '', status: 'Active', lectureHours: '', tutorialHours: '', practicalHours: '', internalMarks: '', externalMarks: '' })
const blankMultiSubject = (id = 1) => ({
  id: String(id || Date.now()),
  subjectCode: '',
  subjectName: '',
  subjectType: '',
  electiveType: 'Core Subject',
  description: '',
  status: 'Active',
  credits: '',
  lectureHours: '',
  tutorialHours: '',
  practicalHours: '',
  internalMarks: '',
  externalMarks: '',
  isExpanded: true,
  saveStatus: 'idle',
  saveError: '',
})
const key = v => String(v ?? '')
const semNo = s => Number(s?.semesterNumber ?? String(s?.semesterName ?? s?.semester ?? s?.name ?? s?.id ?? '').match(/\d+/)?.[0] ?? 0)
export const getAcademicLevelFromSemester = s => {
  const year = Number(s?.yearNumber) || Math.ceil(semNo(s) / 2)
  return year > 0 ? `${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year` : ''
}
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
  const [filters, updateFilters] = useState({ search: '', academicYearId: '', courseId: '', branchId: '', level: '', semesterId: '', subjectType: '', electiveType: '', status: '' })
  const [form, setForm] = useState(blank), [editing, setEditing] = useState(null), [editorOpen, setEditorOpen] = useState(false), [editorMode, setEditorMode] = useState('single'), [saving, setSaving] = useState(false), [recentId, setRecentId] = useState('')
  const [returnToElectives, setReturnToElectives] = useState(false)
  const [confirmingSubject, setConfirmingSubject] = useState(null), [statusSaving, setStatusSaving] = useState(false)
  const setFilters = next => { setPage(1); updateFilters(next) }
  const loadSubjects = async () => { const requestId=++listRequest.current; setLoading(true); setLoadError(''); try { const rows=await subjectService.getSubjects({ liveOnly: true }); if(requestId===listRequest.current) setSubjects(rows) } catch (e) { if(requestId===listRequest.current) setLoadError(e.message || 'Unable to load subjects.') } finally { if(requestId===listRequest.current) setLoading(false) } }
  useEffect(() => { setEditorOpen(false); setViewing(null); loadSubjects(); return () => { listRequest.current += 1 } }, [selectedCollegeId, selectedAcademicYearId])
  const editorHasCourse = Boolean(editorOpen && form.academicYearId && form.courseId)
  const editorHasBranch = Boolean(editorHasCourse && form.branchId)
  const { current: lookups, retry: retryMasters } = useSubjectMapping(
    selectedCollegeId,
    editorHasCourse || Boolean(filters.courseId),
    editorHasBranch || Boolean(filters.courseId && filters.branchId),
  )
  const masters = Object.fromEntries(Object.keys(lookupDefinitions).map(field => [field, lookups[field]?.rows ?? []]))
  const editorFields = ['years', 'courses', ...(editorHasCourse ? ['branches'] : []), ...(editorHasBranch ? ['semesters'] : [])]
  const mastersLoading = Boolean(selectedCollegeId && editorFields.some(field => !lookups[field]))
  const mastersError = editorFields.map(field => lookups[field]?.error).filter(Boolean).join(' ')
  const scopedCourses = masters.courses
  const branches = courseId => masters.branches.filter(b => key(b.courseId) === key(courseId))
  const semesters = (courseId, branchId) => masters.semesters.filter(s => key(s.courseId) === key(courseId) && key(s.branchId) === key(branchId))
  const semestersForYear = (courseId, branchId, yearId) => semesters(courseId, branchId)
    .filter(row => !row.academicYearId || key(row.academicYearId) === '0' || key(row.academicYearId) === key(yearId))
  const filterSemesters = filters.academicYearId
    ? semestersForYear(filters.courseId, filters.branchId, filters.academicYearId)
    : semesters(filters.courseId, filters.branchId)
  const formSemesters = editorHasBranch ? semestersForYear(form.courseId, form.branchId, form.academicYearId) : []
  const levels = list => [...new Set(list.map(getAcademicLevelFromSemester).filter(Boolean))]
  const subjectLevel = subject => getAcademicLevelFromSemester(
    masters.semesters.find(row => key(row.id) === key(subject.semesterId)) || subject,
  )
  useEffect(() => {
    const years = lookups.years?.rows
    if (!editorOpen || editing || !years?.length) return
    setForm(old => years.some(year => key(year.id) === key(old.academicYearId))
      ? old
      : { ...old, academicYearId: key(years.find(year => year.isCurrent)?.id ?? years[0].id), semesterId: '' })
  }, [editorOpen, editing, lookups.years])
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

  const records = useMemo(() => scopedSubjects.filter(s => { const q = filters.search.trim().toLowerCase(), isElective = classificationOf(s) === 'Elective'; return (!q || `${s.subjectCode} ${s.subjectName}`.toLowerCase().includes(q)) && (!filters.academicYearId || key(s.academicYearId) === key(filters.academicYearId)) && (!filters.courseId || key(s.courseId) === key(filters.courseId)) && (!filters.branchId || key(s.branchId) === key(filters.branchId)) && (!filters.semesterId || key(s.semesterId) === key(filters.semesterId)) && (!filters.level || subjectLevel(s) === filters.level) && (!filters.subjectType || s.subjectType === filters.subjectType) && (!filters.electiveType || (filters.electiveType === 'Elective' ? isElective : !isElective)) && (!filters.status || s.status === filters.status) }).sort((left, right) => key(left.id) === key(recentId) ? -1 : key(right.id) === key(recentId) ? 1 : 0), [scopedSubjects, filters, recentId, masters.semesters])
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedRecords = records.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const kpis = useMemo(() => ({ total: records.length, active: records.filter(s => String(s.status).toLowerCase() === 'active').length, theory: records.filter(s => /theory/i.test(s.subjectType)).length, lab: records.filter(s => /lab|practical/i.test(s.subjectType)).length, credits: records.reduce((n, s) => n + Number(s.credits || 0), 0) }), [records])
  const changeFilter = (field, value) => setFilters(old => field === 'courseId' ? { ...old, courseId: value, branchId: '', level: '', semesterId: '' } : field === 'branchId' ? { ...old, branchId: value, level: '', semesterId: '' } : field === 'level' ? { ...old, level: value, semesterId: '' } : { ...old, [field]: value })
  const changeForm = (field, value) => setForm(old => {
    if (old[field] === value) return old
    const next = { ...old, [field]: value }
    if (field === 'courseId') {
      next.branchId = ''
      next.semesterId = ''
    }
    if (field === 'branchId') next.semesterId = ''
    if (field === 'academicYearId' && !semestersForYear(old.courseId, old.branchId, value).some(row => key(row.id) === key(old.semesterId))) {
      next.semesterId = ''
    }
    return next
  })
  const formLevel = getAcademicLevelFromSemester(formSemesters.find(s => key(s.id) === key(form.semesterId)))
  const openAdd = (mode = 'single') => { if(!canCreate) return; setSaveError(''); setEditorMode(typeof mode === 'string' ? mode : 'single'); const activeYear = masters.years.find(year => year.isCurrent || String(year.status).toLowerCase() === 'active' || String(year.status).toLowerCase() === 'current'); setEditing(null); setForm({ ...blank(), academicYearId: selectedAcademicYearId || (activeYear ? key(activeYear.id) : '') }); setEditorOpen(true) }
  const closeEditor = (force = false) => { if(saving && force !== true) return; setSaveError(''); setEditing(null); setForm(blank()); setEditorOpen(false); if (returnToElectives) { setReturnToElectives(false); navigate('/elective-management') } }
  const openEdit = s => { if(!canEdit) return; setSaveError(''); setEditorMode('single'); setEditing(s); setForm({ ...blank(), ...s, departmentId: enrichSubject(s, masters).departmentId, academicYearId: key(s.academicYearId), courseId: key(s.courseId), branchId: key(s.branchId), semesterId: key(s.semesterId) }); setEditorOpen(true) }
  const handledSubjectAction = useRef(null)
  useEffect(() => {
    const request = location.state?.subjectAction
    if (!request || !subjects.length || !lookups.courses) return
    const requestKey = `${location.key}:${request.mode}:${request.id}`
    if (handledSubjectAction.current === requestKey) return
    const subject = subjects.find(item => key(item.id) === key(request.id) || key(item.subjectCode) === key(request.id))
    if (!subject) return
    handledSubjectAction.current = requestKey
    if (request.mode === 'edit') { openEdit(subject); setReturnToElectives(request.returnTo === '/elective-management') }
    navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, location.key, subjects, lookups.courses, navigate, openEdit])
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
  const columns = [{ label: 'Subject Code', value: 'subjectCode' }, { label: 'Subject Name', value: 'subjectName' }, { label: 'Academic Year', value: s => mapping(s).year }, { label: 'Course', value: s => mapping(s).course }, { label: 'Branch', value: s => mapping(s).branch }, { label: 'Academic Level', value: subjectLevel }, { label: 'Semester', value: s => mapping(s).semester }, { label: 'Subject Type', value: s => formatSubjectType(s.subjectType) }, { label: 'Credits', value: 'credits' }, { label: 'Status', value: 'status' }]
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
  const detailSections = s => { const m = mapping(s); return [{ title: 'Subject Information', rows: [['Subject Code', s.subjectCode], ['Subject Name', s.subjectName], ['Subject Type', formatSubjectType(s.subjectType)], ['Elective Type', s.electiveType], ['Credits', s.credits], ['Status', s.status]] }, { title: 'Academic Mapping', rows: [['Academic Year', m.year], ['Course', m.course], ['Branch', m.branch], ['Academic Level', subjectLevel(s)], ['Semester', m.semester]] }, { title: 'Academic Configuration', rows: [['Lecture Hours', s.lectureHours], ['Tutorial Hours', s.tutorialHours], ['Practical Hours', s.practicalHours], ['Internal Marks', s.internalMarks], ['External Marks', s.externalMarks]].filter(([, v]) => v !== '' && v != null) }].filter(x => x.rows.length) }
  const editor = editorOpen && <ViewDialog title={editing ? 'Edit Subject' : editorMode === 'multiple' ? 'Add Multiple Subjects' : 'Add Subject'} subtitle={editorMode === 'multiple' ? 'Configure shared academic mapping, then create multiple subjects for the semester.' : 'Map the subject to its academic program, then complete its details and workload.'} icon={editorMode === 'multiple' ? FiLayers : FiBookOpen} onClose={closeEditor} busy={saving} showExport={false} hideFooter maxWidth={editorMode === 'multiple' ? '920px' : '860px'} className="subject-editor-dialog">{saveError && <p role="alert" className="sm-error">{saveError}</p>}<Editor
            form={form}
            editing={editing}
            masters={{ ...masters, courses: scopedCourses }}
            mastersLoading={mastersLoading}
            mastersError={mastersError}
            retryMasters={retryMasters}
            branches={branches(form.courseId)}
            semesters={formSemesters}
            levels={levels(formSemesters)}
            typeOptions={types}
            formLevel={formLevel}
            change={changeForm}
            close={closeEditor}
            save={save}
            saving={saving}
            editorMode={editorMode}
            setEditorMode={setEditorMode}
            loadSubjects={loadSubjects}
            allSubjects={subjects}
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
              <div className="sm-header-actions-group">
                <button hidden={!canCreate} className="sm-btn sm-btn--primary" onClick={() => openAdd('single')}><FiPlus /> Add Subject</button>
                <button hidden={!canCreate} className="sm-btn sm-btn--secondary sm-btn--multi" onClick={() => openAdd('multiple')}><FiLayers /> Add Multiple Subjects</button>
              </div>
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
                        <td className="table-center">{subjectLevel(s) || '-'}</td>
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
function Input({ label, value, change, type = 'text', disabled = false, error = null, placeholder }) {
  const numeric = type === 'number'
  return (
    <label className="sm-field">
      <span>{label}</span>
      <input
        type={type}
        min={numeric ? 0 : undefined}
        step={numeric ? '0.01' : undefined}
        disabled={disabled}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={event => change(event.target.value)}
      />
      {error && <small className="sm-field-error" role="alert">{error}</small>}
    </label>
  )
}
function StatusConfirmation({ subject, saving, close, confirm }) { return <ViewDialog title="Deactivate Subject?" onClose={close} busy={saving} showExport={false} hideFooter maxWidth="520px"><p><strong>{subject.subjectName} ({subject.subjectCode})</strong> will no longer be available for new academic use. Continue?</p><footer className="sm-modal-footer"><button type="button" className="sm-btn sm-btn--secondary" disabled={saving} onClick={close}>Cancel</button><button type="button" className="sm-btn sm-btn--danger" disabled={saving} onClick={confirm}>{saving ? 'Deactivating…' : 'Confirm Deactivate'}</button></footer></ViewDialog> }

function Editor({
  form,
  editing,
  masters,
  branches,
  semesters,
  levels,
  typeOptions,
  formLevel: initialLevel,
  change: updateForm,
  close,
  save,
  saving,
  mastersLoading = false,
  mastersError = '',
  retryMasters,
  editorMode = 'single',
  setEditorMode,
  loadSubjects,
  allSubjects = [],
}) {
  const [selectedLevel, setFormLevel] = useState('');
  const formLevel = levels.includes(selectedLevel) ? selectedLevel : initialLevel;
  const hasYear = masters.years.some(year => key(year.id) === key(form.academicYearId));
  const [activeTab, setActiveTab] = useState('mapping');
  const [mappingError, setMappingError] = useState('');
  const [singleErrors, setSingleErrors] = useState({});
  const [multiSubjects, setMultiSubjects] = useState([blankMultiSubject(1)]);
  const [multiErrors, setMultiErrors] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  const [saveResults, setSaveResults] = useState(null);


  const change = (field, value) => {
    if ((field === 'courseId' || field === 'branchId') && form[field] !== value) setFormLevel('');
    if (singleErrors[field]) {
      setSingleErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    updateForm(field, value);
  };
  const selectLevel = v => {
    if (v === formLevel) return;
    setFormLevel(v);
    change('semesterId', '');
  };

  const switchMode = newMode => {
    if (newMode === editorMode) return;
    if (newMode === 'multiple') {
      setMultiSubjects(prev => {
        if (prev.length === 1 && !prev[0].subjectName && !prev[0].subjectCode) {
          return [{
            ...prev[0],
            subjectName: form.subjectName || '',
            subjectCode: form.subjectCode || '',
            subjectType: form.subjectType || '',
            electiveType: form.electiveType || 'Core Subject',
            description: form.description || '',
            status: form.status || 'Active',
            credits: form.credits || '',
            lectureHours: form.lectureHours || '',
            tutorialHours: form.tutorialHours || '',
            practicalHours: form.practicalHours || '',
            internalMarks: form.internalMarks || '',
            externalMarks: form.externalMarks || '',
          }];
        }
        return prev;
      });
    } else {
      if (multiSubjects.length > 0 && (!form.subjectName && !form.subjectCode)) {
        const first = multiSubjects[0];
        if (first.subjectName || first.subjectCode) {
          updateForm('subjectName', first.subjectName || '');
          updateForm('subjectCode', first.subjectCode || '');
          updateForm('subjectType', first.subjectType || '');
          updateForm('electiveType', first.electiveType || 'Core Subject');
          updateForm('description', first.description || '');
          updateForm('status', first.status || 'Active');
          updateForm('credits', first.credits || '');
          updateForm('lectureHours', first.lectureHours || '');
          updateForm('tutorialHours', first.tutorialHours || '');
          updateForm('practicalHours', first.practicalHours || '');
          updateForm('internalMarks', first.internalMarks || '');
          updateForm('externalMarks', first.externalMarks || '');
        }
      }
    }
    if (setEditorMode) setEditorMode(newMode);
  };

  const tabs = [
    { id: 'mapping', label: '1. Academic Mapping' },
    { id: 'info', label: '2. Subject Details' },
    { id: 'review', label: '3. Review & Save' },
  ];
  const stepIndex = tabs.findIndex(t => t.id === activeTab);

  const getWeeklyHours = sub => {
    const l = parseFloat(sub.lectureHours) || 0;
    const t = parseFloat(sub.tutorialHours) || 0;
    const p = parseFloat(sub.practicalHours) || 0;
    const sum = l + t + p;
    return Number.isFinite(sum) ? sum : 0;
  };

  const getTotalMarks = sub => {
    const i = parseFloat(sub.internalMarks) || 0;
    const e = parseFloat(sub.externalMarks) || 0;
    const sum = i + e;
    return Number.isFinite(sum) ? sum : 0;
  };

  const formatCardTitle = (sub, idx) => {
    const name = String(sub.subjectName || '').trim();
    const code = String(sub.subjectCode || '').trim();
    if (name && code) return `Subject ${idx + 1} – ${name} (${code})`;
    if (name) return `Subject ${idx + 1} – ${name}`;
    if (code) return `Subject ${idx + 1} – (${code})`;
    return `Subject ${idx + 1}`;
  };

  const validateMapping = () => {
    const hasValue = value => value !== '' && value !== null && value !== undefined;
    const missing = !hasYear || !masters.courses.some(course => key(course.id) === key(form.courseId)) || !branches.some(branch => key(branch.id) === key(form.branchId)) || !hasValue(formLevel) || !getSemestersForAcademicLevel(semesters, formLevel).some(row => key(row.id) === key(form.semesterId));
    if (missing) {
      setMappingError('Please complete Academic Year, Course, Branch, Academic Level, and Semester before continuing.');
      return false;
    }
    setMappingError('');
    return true;
  };

  const validateMultiSubjectDetails = () => {
    const errors = {};
    let hasError = false;
    const seenCodes = new Map();

    multiSubjects.forEach((sub, idx) => {
      const subErrors = {};
      const nameTrimmed = String(sub.subjectName || '').trim();
      const codeTrimmed = String(sub.subjectCode || '').trim();

      if (!nameTrimmed) {
        subErrors.subjectName = 'Subject Name is required.';
        hasError = true;
      }
      if (!codeTrimmed) {
        subErrors.subjectCode = 'Subject Code is required.';
        hasError = true;
      } else {
        const codeLower = codeTrimmed.toLowerCase();
        if (seenCodes.has(codeLower)) {
          subErrors.subjectCode = `Duplicate subject code '${codeTrimmed}' in this batch (matches Subject ${seenCodes.get(codeLower) + 1}).`;
          hasError = true;
        } else {
          seenCodes.set(codeLower, idx);
        }

        const existingMatch = allSubjects.find(s => s.subjectCode?.trim().toLowerCase() === codeLower);
        if (existingMatch) {
          subErrors.subjectCode = `Subject code '${codeTrimmed}' already exists in the system.`;
          hasError = true;
        }
      }

      const numericFields = [
        ['credits', 'Credits', sub.credits],
        ['lectureHours', 'Lecture hours', sub.lectureHours],
        ['tutorialHours', 'Tutorial hours', sub.tutorialHours],
        ['practicalHours', 'Practical hours', sub.practicalHours],
        ['internalMarks', 'Internal marks', sub.internalMarks],
        ['externalMarks', 'External marks', sub.externalMarks],
      ];

      for (const [fKey, label, val] of numericFields) {
        if (val !== '' && val !== null && val !== undefined) {
          const num = Number(val);
          if (!Number.isFinite(num) || num < 0) {
            subErrors[fKey] = `${label} must be a non-negative number.`;
            hasError = true;
          }
        }
      }

      if (Object.keys(subErrors).length > 0) {
        errors[idx] = subErrors;
      }
    });

    setMultiErrors(errors);
    if (hasError) {
      setMultiSubjects(prev => prev.map((s, idx) => errors[idx] ? { ...s, isExpanded: true } : s));
    }
    return !hasError;
  };

  const validateSingleSubjectDetails = () => {
    const errs = {};
    const nameTrimmed = String(form.subjectName || '').trim();
    const codeTrimmed = String(form.subjectCode || '').trim();

    if (!nameTrimmed) {
      errs.subjectName = 'Subject Name is required.';
    }
    if (!codeTrimmed) {
      errs.subjectCode = 'Subject Code is required.';
    } else {
      const codeLower = codeTrimmed.toLowerCase();
      const existingMatch = allSubjects.find(
        s => key(s.id) !== key(editing?.id) && s.subjectCode?.trim().toLowerCase() === codeLower
      );
      if (existingMatch) {
        errs.subjectCode = `Subject code '${codeTrimmed}' already exists in the system.`;
      }
    }

    const numericFields = [
      ['credits', 'Credits', form.credits],
      ['lectureHours', 'Lecture hours', form.lectureHours],
      ['tutorialHours', 'Tutorial hours', form.tutorialHours],
      ['practicalHours', 'Practical hours', form.practicalHours],
      ['internalMarks', 'Internal marks', form.internalMarks],
      ['externalMarks', 'External marks', form.externalMarks],
    ];

    for (const [fKey, label, val] of numericFields) {
      if (val !== '' && val !== null && val !== undefined) {
        const num = Number(val);
        if (!Number.isFinite(num) || num < 0) {
          errs[fKey] = `${label} must be a non-negative number.`;
        }
      }
    }

    setSingleErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goToTab = tabId => {
    if (activeTab === 'mapping' && tabId !== 'mapping' && !validateMapping()) return;
    const targetIdx = tabs.findIndex(t => t.id === tabId);
    if (stepIndex <= 1 && targetIdx > 1) {
      if (editorMode === 'multiple') {
        if (!validateMultiSubjectDetails()) return;
      } else {
        if (!validateSingleSubjectDetails()) return;
      }
    }
    setActiveTab(tabId);
  };

  const addAnotherSubject = () => {
    setMultiSubjects(prev => [
      ...prev,
      blankMultiSubject(prev.length + 1)
    ]);
  };

  const removeSubject = idx => {
    if (multiSubjects.length <= 1) return;
    setMultiSubjects(prev => prev.filter((_, i) => i !== idx));
    setMultiErrors(prev => {
      const next = {};
      Object.keys(prev).forEach(k => {
        const numK = Number(k);
        if (numK < idx) next[numK] = prev[k];
        else if (numK > idx) next[numK - 1] = prev[k];
      });
      return next;
    });
  };

  const toggleExpand = idx => {
    setMultiSubjects(prev => prev.map((s, i) => i === idx ? { ...s, isExpanded: !s.isExpanded } : s));
  };

  const updateMultiSubject = (idx, field, value) => {
    setMultiSubjects(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
    if (multiErrors[idx]?.[field]) {
      setMultiErrors(prev => ({
        ...prev,
        [idx]: { ...prev[idx], [field]: null }
      }));
    }
  };

  const handleSaveAll = async () => {
    if (saving || savingAll) return;
    if (!validateMapping()) {
      setActiveTab('mapping');
      return;
    }
    if (!validateMultiSubjectDetails()) {
      setActiveTab('info');
      return;
    }

    setSavingAll(true);
    const semester = semesters.find(s => key(s.id) === key(form.semesterId));
    const semesterName = semester ? (semester.semesterName || semester.name || `Semester ${semNo(semester)}`) : '';
    const academicYearName = entityName(masters.years, form.academicYearId);
    const courseName = entityName(masters.courses, form.courseId);
    const branchName = entityName(branches, form.branchId);

    let successCount = 0;
    let failCount = 0;
    const currentList = [...multiSubjects];

    for (let i = 0; i < currentList.length; i++) {
      const item = currentList[i];
      if (item.saveStatus === 'success') {
        successCount++;
        continue;
      }

      const payload = {
        subjectCode: item.subjectCode.trim(),
        subjectName: item.subjectName.trim(),
        subjectType: item.subjectType || '',
        electiveType: item.electiveType || 'Core Subject',
        description: item.description || '',
        status: item.status || 'Active',
        credits: item.credits,
        lectureHours: item.lectureHours,
        tutorialHours: item.tutorialHours,
        practicalHours: item.practicalHours,
        internalMarks: item.internalMarks,
        externalMarks: item.externalMarks,
        academicYearId: form.academicYearId,
        courseId: form.courseId,
        branchId: form.branchId,
        semesterId: form.semesterId,
        semester: semesterName,
        academicYear: academicYearName,
        course: courseName,
        branch: branchName,
      };

      try {
        const created = await subjectService.createSubject(payload);
        if (!(created?.id || created?.subjectId)) {
          throw new Error('The server did not return a subject identity.');
        }
        currentList[i] = {
          ...item,
          saveStatus: 'success',
          saveError: '',
          createdId: created.id || created.subjectId,
        };
        successCount++;
      } catch (err) {
        currentList[i] = {
          ...item,
          saveStatus: 'failed',
          saveError: err.message || 'Failed to create subject.',
        };
        failCount++;
      }
    }

    setMultiSubjects(currentList);
    setSavingAll(false);
    setSaveResults({ successCount, failCount, attempted: true });

    if (successCount > 0 && loadSubjects) {
      await loadSubjects();
    }

    if (failCount === 0 && successCount > 0) {
      showSuccess(`Successfully created ${successCount} ${successCount === 1 ? 'subject' : 'subjects'}`);
      close(true);
    } else if (failCount > 0 && successCount > 0) {
      showError(`${successCount} subjects created, but ${failCount} failed. You can review and retry the failed subjects.`);
    } else if (failCount > 0 && successCount === 0) {
      const firstErr = currentList.find(s => s.saveError)?.saveError || 'Failed to save subjects.';
      showError(firstErr);
    }
  };

  const handleSubmit = event => {
    event.preventDefault();
    if (saving || savingAll) return;
    if (activeTab !== 'review') {
      goToTab(tabs[stepIndex + 1].id);
      return;
    }
    if (editorMode === 'single') {
      save(event);
    } else {
      handleSaveAll();
    }
  };

  return (
    <div className="erp-two-column-layout sm-editor-layout" data-without-live-preview="true">
      <div className="erp-card-main">
        {!editing && (
          <div className="sm-mode-switch-bar">
            <div className="sm-mode-switch" role="radiogroup" aria-label="Creation Mode">
              <button
                type="button"
                role="radio"
                aria-checked={editorMode === 'single'}
                className={`sm-mode-btn ${editorMode === 'single' ? 'active' : ''}`}
                onClick={() => switchMode('single')}
              >
                Single Subject
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={editorMode === 'multiple'}
                className={`sm-mode-btn ${editorMode === 'multiple' ? 'active' : ''}`}
                onClick={() => switchMode('multiple')}
              >
                Multiple Subjects
              </button>
            </div>
            {editorMode === 'multiple' && (
              <span className="sm-counter-badge" aria-label="Subject count">
                {multiSubjects.length} {multiSubjects.length === 1 ? 'Subject' : 'Subjects'} Added
              </span>
            )}
          </div>
        )}

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
                <p className="sm-editor-section-description">
                  {editorMode === 'multiple'
                    ? 'Choose the academic year and program placement. This academic mapping will apply to all subjects added in this workflow.'
                    : 'Choose the academic year and program placement for this subject.'}
                </p>
                {mastersLoading && <p role="status" className="sm-editor-section-description">Loading academic options...</p>}
                {mastersError && <div role="alert" className="sm-editor-error">{mastersError} <button type="button" className="sm-btn sm-btn--secondary" onClick={retryMasters} disabled={mastersLoading}>Retry</button></div>}
                {mappingError && <p role="alert" className="sm-editor-error">{mappingError}</p>}
                <div className="sm-form-grid-2">
                  <Field label={<>Academic Year <span className="sm-required">*</span></>}>
                    <Select label="Academic Year" value={form.academicYearId} options={masters.years} onChange={v => change('academicYearId', v)} />
                    {!mastersLoading && !mastersError && !masters.years.length && <small>No academic years are available for this college.</small>}
                  </Field>
                  <Field label={<>Course <span className="sm-required">*</span></>}>
                    <Select label="Course" value={form.courseId} options={masters.courses} onChange={v => change('courseId', v)} disabled={!hasYear} />
                    {!mastersLoading && !mastersError && !masters.courses.length && <small>No active courses are available for this college.</small>}
                  </Field>
                  <Field label={<>Branch <span className="sm-required">*</span></>}>
                    <Select label="Branch" value={form.branchId} options={branches} onChange={v => change('branchId', v)} disabled={!hasYear || !form.courseId || !branches.length} placeholder={form.courseId ? 'Select branch' : 'Choose a course first'} />
                    {!mastersLoading && !mastersError && form.courseId && !branches.length && <small>No active branches are available for this course.</small>}
                  </Field>
                  <Field label={<>Academic Level <span className="sm-required">*</span></>}>
                    <Select label="Academic Level" value={formLevel} options={levels} onChange={selectLevel} disabled={!hasYear || !form.branchId || !levels.length} placeholder={form.branchId ? 'Select academic level' : 'Choose a branch first'} />
                    {!mastersLoading && !mastersError && form.branchId && !levels.length && <small>No active semesters are available for this branch and academic year.</small>}
                  </Field>
                  <Field label={<>Semester <span className="sm-required">*</span></>}>
                    <Select label="Semester" hideSearch value={form.semesterId} options={getSemestersForAcademicLevel(semesters, formLevel)} onChange={v => change('semesterId', v)} disabled={!form.branchId || !formLevel} placeholder={formLevel ? 'Select semester' : 'Choose an academic level first'} semester />
                  </Field>
                </div>
              </section>
            )}

            {activeTab === 'info' && editorMode === 'single' && (
              <section>
                <div className="sm-step-header-row">
                  <div>
                    <h3 className="sm-editor-section-title">Subject Details</h3>
                    <p className="sm-editor-section-description">Set the subject identity, classification, credits, workload hours, and assessment marks.</p>
                  </div>
                </div>
                <div className="sm-compact-grid-3">
                  {/* Row 1: Subject Name | Subject Code | Subject Type */}
                  <Input
                    label={<>Subject Name <span className="sm-required">*</span></>}
                    placeholder="e.g. Data Structures"
                    value={form.subjectName}
                    change={v => change('subjectName', v)}
                    error={singleErrors.subjectName}
                  />
                  <Input
                    label={<>Subject Code <span className="sm-required">*</span></>}
                    placeholder="e.g. CS201"
                    value={form.subjectCode}
                    change={v => change('subjectCode', v)}
                    error={singleErrors.subjectCode}
                  />
                  <Field label="Subject Type">
                    <Select
                      label="Subject Type"
                      value={form.subjectType}
                      options={typeOptions}
                      onChange={v => change('subjectType', v)}
                      disabled={!typeOptions.length}
                    />
                  </Field>

                  {/* Row 2: Credits | Lecture Hours | Tutorial Hours */}
                  <Input
                    label="Credits"
                    type="number"
                    placeholder="0"
                    value={form.credits}
                    change={v => change('credits', v)}
                    error={singleErrors.credits}
                  />
                  <Input
                    label="Lecture Hours"
                    type="number"
                    placeholder="0"
                    value={form.lectureHours}
                    change={v => change('lectureHours', v)}
                    error={singleErrors.lectureHours}
                  />
                  <Input
                    label="Tutorial Hours"
                    type="number"
                    placeholder="0"
                    value={form.tutorialHours}
                    change={v => change('tutorialHours', v)}
                    error={singleErrors.tutorialHours}
                  />

                  {/* Row 3: Practical Hours | Internal Marks | External Marks */}
                  <Input
                    label="Practical Hours"
                    type="number"
                    placeholder="0"
                    value={form.practicalHours}
                    change={v => change('practicalHours', v)}
                    error={singleErrors.practicalHours}
                  />
                  <Input
                    label="Internal Marks"
                    type="number"
                    placeholder="0"
                    value={form.internalMarks}
                    change={v => change('internalMarks', v)}
                    error={singleErrors.internalMarks}
                  />
                  <Input
                    label="External Marks"
                    type="number"
                    placeholder="0"
                    value={form.externalMarks}
                    change={v => change('externalMarks', v)}
                    error={singleErrors.externalMarks}
                  />

                  {/* Row 4: Description | Status | Elective Option */}
                  <Input
                    label="Description (optional)"
                    placeholder="Brief subject description"
                    value={form.description}
                    change={v => change('description', v)}
                  />
                  <Field label="Status">
                    <Select
                      label="Status"
                      value={form.status}
                      options={['Active', 'Inactive']}
                      onChange={v => change('status', v)}
                    />
                  </Field>
                  <div className="sm-field">
                    <label>Elective Option</label>
                    <label className="sm-elective-toggle">
                      <input
                        type="checkbox"
                        checked={form.electiveType === 'Elective'}
                        onChange={event => change('electiveType', event.target.checked ? 'Elective' : 'Core Subject')}
                      />
                      <span>Is Elective</span>
                    </label>
                    {form.electiveType === 'Elective' && <small className="sm-elective-hint">Configured in Elective Allocation</small>}
                  </div>
                </div>

                {/* Automatic Calculations */}
                <div className="sm-calc-strip">
                  <div className="sm-calc-item">
                    <span>Weekly Contact Hours:</span>
                    <strong>{getWeeklyHours(form)} hrs</strong>
                    <small>({form.lectureHours || 0}L + {form.tutorialHours || 0}T + {form.practicalHours || 0}P)</small>
                  </div>
                  <div className="sm-calc-item">
                    <span>Total Marks:</span>
                    <strong>{getTotalMarks(form)}</strong>
                    <small>({form.internalMarks || 0} Int + {form.externalMarks || 0} Ext)</small>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'info' && editorMode === 'multiple' && (
              <section>
                <div className="sm-step-header-row">
                  <div>
                    <h3 className="sm-editor-section-title">Subject Details</h3>
                    <p className="sm-editor-section-description">Enter the subject details, workload hours, credits, and marks for each subject in this semester.</p>
                  </div>
                </div>

                {multiSubjects.map((sub, idx) => (
                  <div key={sub.id} className={`sm-multi-card ${multiErrors[idx] ? 'has-error' : ''}`}>
                    <div
                      className="sm-multi-card-header"
                      onClick={() => toggleExpand(idx)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(idx); } }}
                      aria-expanded={sub.isExpanded}
                    >
                      <div className="sm-multi-card-title">
                        <span className="sm-subject-num-badge">Subject {idx + 1}</span>
                        <span className="sm-subject-title-text">
                          <strong>{formatCardTitle(sub, idx)}</strong>
                        </span>
                        {sub.credits !== '' && <span className="sm-credit-pill">{sub.credits} Credits</span>}
                        {sub.saveStatus === 'success' && <span className="sm-status-pill sm-status-pill--success">Saved</span>}
                        {sub.saveStatus === 'failed' && <span className="sm-status-pill sm-status-pill--danger">Failed</span>}
                      </div>
                      <div className="sm-multi-card-actions" onClick={e => e.stopPropagation()}>
                        {multiSubjects.length > 1 && sub.saveStatus !== 'success' && (
                          <button
                            type="button"
                            className="sm-card-btn sm-card-btn--danger"
                            onClick={() => removeSubject(idx)}
                            aria-label={`Remove Subject ${idx + 1}`}
                            title="Remove subject"
                          >
                            <FiTrash2 aria-hidden="true" />
                            <span>Remove</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="sm-card-btn sm-card-btn--toggle"
                          onClick={() => toggleExpand(idx)}
                          aria-label={sub.isExpanded ? `Collapse Subject ${idx + 1}` : `Expand Subject ${idx + 1}`}
                        >
                          <FiChevronDown style={{ transform: sub.isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>
                      </div>
                    </div>
                    {sub.isExpanded && (
                      <div className="sm-multi-card-body">
                        {sub.saveError && (
                          <p role="alert" className="sm-card-error">{sub.saveError}</p>
                        )}
                        <div className="sm-compact-grid-3">
                          {/* Row 1: Subject Name | Subject Code | Subject Type */}
                          <Input
                            label={<>Subject Name <span className="sm-required">*</span></>}
                            placeholder="e.g. Python Programming"
                            value={sub.subjectName}
                            disabled={sub.saveStatus === 'success'}
                            change={v => updateMultiSubject(idx, 'subjectName', v)}
                            error={multiErrors[idx]?.subjectName}
                          />
                          <Input
                            label={<>Subject Code <span className="sm-required">*</span></>}
                            placeholder="e.g. PY301"
                            value={sub.subjectCode}
                            disabled={sub.saveStatus === 'success'}
                            change={v => updateMultiSubject(idx, 'subjectCode', v)}
                            error={multiErrors[idx]?.subjectCode}
                          />
                          <Field label="Subject Type">
                            <Select
                              label="Subject Type"
                              value={sub.subjectType}
                              options={typeOptions}
                              onChange={v => updateMultiSubject(idx, 'subjectType', v)}
                              disabled={sub.saveStatus === 'success' || !typeOptions.length}
                            />
                          </Field>

                          {/* Row 2: Credits | Lecture Hours | Tutorial Hours */}
                          <Input
                            label="Credits"
                            type="number"
                            placeholder="0"
                            value={sub.credits}
                            disabled={sub.saveStatus === 'success'}
                            change={v => updateMultiSubject(idx, 'credits', v)}
                            error={multiErrors[idx]?.credits}
                          />
                          <Input
                            label="Lecture Hours"
                            type="number"
                            placeholder="0"
                            value={sub.lectureHours}
                            disabled={sub.saveStatus === 'success'}
                            change={v => updateMultiSubject(idx, 'lectureHours', v)}
                            error={multiErrors[idx]?.lectureHours}
                          />
                          <Input
                            label="Tutorial Hours"
                            type="number"
                            placeholder="0"
                            value={sub.tutorialHours}
                            disabled={sub.saveStatus === 'success'}
                            change={v => updateMultiSubject(idx, 'tutorialHours', v)}
                            error={multiErrors[idx]?.tutorialHours}
                          />

                          {/* Row 3: Practical Hours | Internal Marks | External Marks */}
                          <Input
                            label="Practical Hours"
                            type="number"
                            placeholder="0"
                            value={sub.practicalHours}
                            disabled={sub.saveStatus === 'success'}
                            change={v => updateMultiSubject(idx, 'practicalHours', v)}
                            error={multiErrors[idx]?.practicalHours}
                          />
                          <Input
                            label="Internal Marks"
                            type="number"
                            placeholder="0"
                            value={sub.internalMarks}
                            disabled={sub.saveStatus === 'success'}
                            change={v => updateMultiSubject(idx, 'internalMarks', v)}
                            error={multiErrors[idx]?.internalMarks}
                          />
                          <Input
                            label="External Marks"
                            type="number"
                            placeholder="0"
                            value={sub.externalMarks}
                            disabled={sub.saveStatus === 'success'}
                            change={v => updateMultiSubject(idx, 'externalMarks', v)}
                            error={multiErrors[idx]?.externalMarks}
                          />

                          {/* Row 4: Description | Status | Is Elective */}
                          <Input
                            label="Description (optional)"
                            placeholder="Brief subject description"
                            value={sub.description}
                            disabled={sub.saveStatus === 'success'}
                            change={v => updateMultiSubject(idx, 'description', v)}
                          />
                          <Field label="Status">
                            <Select
                              label="Status"
                              value={sub.status}
                              options={['Active', 'Inactive']}
                              onChange={v => updateMultiSubject(idx, 'status', v)}
                              disabled={sub.saveStatus === 'success'}
                            />
                          </Field>
                          <div className="sm-field">
                            <label>Elective Option</label>
                            <label className="sm-elective-toggle">
                              <input
                                type="checkbox"
                                checked={sub.electiveType === 'Elective'}
                                disabled={sub.saveStatus === 'success'}
                                onChange={event => updateMultiSubject(idx, 'electiveType', event.target.checked ? 'Elective' : 'Core Subject')}
                              />
                              <span>Is Elective</span>
                            </label>
                            {sub.electiveType === 'Elective' && <small className="sm-elective-hint">Configured in Elective Allocation</small>}
                          </div>
                        </div>

                        {/* Automatic Calculations */}
                        <div className="sm-calc-strip">
                          <div className="sm-calc-item">
                            <span>Weekly Contact Hours:</span>
                            <strong>{getWeeklyHours(sub)} hrs</strong>
                            <small>({sub.lectureHours || 0}L + {sub.tutorialHours || 0}T + {sub.practicalHours || 0}P)</small>
                          </div>
                          <div className="sm-calc-item">
                            <span>Total Marks:</span>
                            <strong>{getTotalMarks(sub)}</strong>
                            <small>({sub.internalMarks || 0} Int + {sub.externalMarks || 0} Ext)</small>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <div className="sm-add-another-wrap">
                  <button
                    type="button"
                    className="sm-btn sm-btn--secondary sm-btn--add-subject"
                    onClick={addAnotherSubject}
                  >
                    <FiPlus /> Add Another Subject
                  </button>
                </div>
              </section>
            )}

            {activeTab === 'review' && editorMode === 'single' && (
              <section className="sm-review-step">
                <div className="sm-step-header-row">
                  <div>
                    <h3 className="sm-editor-section-title">Review and Save</h3>
                    <p className="sm-editor-section-description">Review all subject information, academic mapping, and workload details before saving.</p>
                  </div>
                </div>

                {/* Academic Mapping */}
                <div className="sm-review-mapping-card">
                  <div className="sm-review-mapping-header">
                    <h4>Academic Mapping</h4>
                  </div>
                  <div className="sm-review-grid">
                    <div className="sm-review-grid-item">
                      <span>Academic Year</span>
                      <strong>{entityName(masters.years, form.academicYearId)}</strong>
                    </div>
                    <div className="sm-review-grid-item">
                      <span>Course</span>
                      <strong>{entityName(masters.courses, form.courseId)}</strong>
                    </div>
                    <div className="sm-review-grid-item">
                      <span>Branch</span>
                      <strong>{entityName(branches, form.branchId)}</strong>
                    </div>
                    <div className="sm-review-grid-item">
                      <span>Academic Level</span>
                      <strong>{formLevel || '-'}</strong>
                    </div>
                    <div className="sm-review-grid-item">
                      <span>Semester</span>
                      <strong>{(() => {
                        const sem = semesters.find(s => key(s.id) === key(form.semesterId));
                        return sem ? (sem.semesterName || sem.name || `Semester ${semNo(sem)}`) : '-';
                      })()}</strong>
                    </div>
                  </div>
                </div>

                {/* Subject Information */}
                <div className="sm-review-mapping-card">
                  <div className="sm-review-mapping-header">
                    <h4>Subject Information</h4>
                  </div>
                  <div className="sm-review-grid">
                    <div className="sm-review-grid-item">
                      <span>Subject Name</span>
                      <strong>{form.subjectName || '—'}</strong>
                    </div>
                    <div className="sm-review-grid-item">
                      <span>Subject Code</span>
                      <strong>{form.subjectCode || '—'}</strong>
                    </div>
                    <div className="sm-review-grid-item">
                      <span>Subject Type</span>
                      <strong>{form.subjectType ? formatSubjectType(form.subjectType) : '—'}</strong>
                    </div>
                    <div className="sm-review-grid-item">
                      <span>Status</span>
                      <strong>{form.status || 'Active'}</strong>
                    </div>
                    <div className="sm-review-grid-item">
                      <span>Elective Option</span>
                      <strong>{form.electiveType === 'Elective' ? 'Yes (Elective)' : 'No (Core Subject)'}</strong>
                    </div>
                    {form.description ? (
                      <div className="sm-review-grid-item" style={{ gridColumn: '1 / -1' }}>
                        <span>Description</span>
                        <strong>{form.description}</strong>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Credits, Hours & Marks */}
                <div className="sm-review-mapping-card">
                  <div className="sm-review-mapping-header">
                    <h4>Credits, Hours & Marks</h4>
                  </div>
                  <div className="sm-review-grid">
                    <div className="sm-review-grid-item">
                      <span>Credits</span>
                      <strong>{form.credits !== '' && form.credits != null ? form.credits : '—'}</strong>
                    </div>
                    <div className="sm-review-grid-item">
                      <span>Lecture Hours</span>
                      <strong>{form.lectureHours !== '' && form.lectureHours != null ? `${form.lectureHours} hrs` : '0 hrs'}</strong>
                    </div>
                    <div className="sm-review-grid-item">
                      <span>Tutorial Hours</span>
                      <strong>{form.tutorialHours !== '' && form.tutorialHours != null ? `${form.tutorialHours} hrs` : '0 hrs'}</strong>
                    </div>
                    <div className="sm-review-grid-item">
                      <span>Practical Hours</span>
                      <strong>{form.practicalHours !== '' && form.practicalHours != null ? `${form.practicalHours} hrs` : '0 hrs'}</strong>
                    </div>
                    <div className="sm-review-grid-item">
                      <span>Weekly Contact Hours</span>
                      <strong style={{ color: 'var(--brand-hover, #0284c7)' }}>{getWeeklyHours(form)} hrs</strong>
                    </div>
                    <div className="sm-review-grid-item">
                      <span>Internal Marks</span>
                      <strong>{form.internalMarks !== '' && form.internalMarks != null ? form.internalMarks : '0'}</strong>
                    </div>
                    <div className="sm-review-grid-item">
                      <span>External Marks</span>
                      <strong>{form.externalMarks !== '' && form.externalMarks != null ? form.externalMarks : '0'}</strong>
                    </div>
                    <div className="sm-review-grid-item">
                      <span>Total Marks</span>
                      <strong style={{ color: 'var(--brand-hover, #0284c7)' }}>{getTotalMarks(form)}</strong>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'review' && editorMode === 'multiple' && (
              <section className="sm-review-step">
                <div className="sm-step-header-row">
                  <div>
                    <h3 className="sm-editor-section-title">Review and Save</h3>
                    <p className="sm-editor-section-description">Review the academic mapping and subject details before saving all subjects.</p>
                  </div>
                </div>

                {saveResults?.attempted && saveResults.failCount > 0 && (
                  <div className="sm-save-alert sm-save-alert--warning" role="alert">
                    <FiAlertCircle />
                    <div>
                      <strong>Partial Save Completed</strong>
                      <p>{saveResults.successCount} of {multiSubjects.length} subjects saved. {saveResults.failCount} failed. You can correct any errors and click &quot;Retry Failed Subjects&quot;.</p>
                    </div>
                  </div>
                )}

                {saveResults?.attempted && saveResults.failCount === 0 && saveResults.successCount > 0 && (
                  <div className="sm-save-alert sm-save-alert--success" role="status">
                    <FiCheckCircle />
                    <div>
                      <strong>All Subjects Created Successfully!</strong>
                    </div>
                  </div>
                )}

                <div className="sm-review-mapping-card">
                  <div className="sm-review-mapping-header">
                    <h4>Academic Mapping</h4>
                  </div>
                  <div className="sm-review-grid">
                    <div className="sm-review-grid-item">
                      <span>Academic Year</span>
                      <strong>{entityName(masters.years, form.academicYearId)}</strong>
                    </div>
                    <div className="sm-review-grid-item">
                      <span>Course</span>
                      <strong>{entityName(masters.courses, form.courseId)}</strong>
                    </div>
                    <div className="sm-review-grid-item">
                      <span>Branch</span>
                      <strong>{entityName(branches, form.branchId)}</strong>
                    </div>
                    <div className="sm-review-grid-item">
                      <span>Academic Level</span>
                      <strong>{formLevel || '-'}</strong>
                    </div>
                    <div className="sm-review-grid-item">
                      <span>Semester</span>
                      <strong>{(() => {
                        const sem = semesters.find(s => key(s.id) === key(form.semesterId));
                        return sem ? (sem.semesterName || sem.name || `Semester ${semNo(sem)}`) : '-';
                      })()}</strong>
                    </div>
                  </div>
                </div>

                <div className="sm-review-subjects-section">
                  <div className="sm-review-subjects-header">
                    <h4>Subject Entries ({multiSubjects.length})</h4>
                  </div>
                  <div className="sm-review-table-wrap">
                    <table className="sm-review-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Subject Code</th>
                          <th>Subject Name</th>
                          <th>Type</th>
                          <th>Elective</th>
                          <th>Credits</th>
                          <th>Hours (L/T/P)</th>
                          <th>Marks (Int/Ext)</th>
                          <th>Status</th>
                          {saveResults?.attempted && <th>Result</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {multiSubjects.map((sub, idx) => (
                          <tr key={sub.id} className={sub.saveStatus === 'failed' ? 'row-failed' : sub.saveStatus === 'success' ? 'row-success' : ''}>
                            <td>{idx + 1}</td>
                            <td><strong>{sub.subjectCode || '—'}</strong></td>
                            <td>{sub.subjectName || '—'}</td>
                            <td>{sub.subjectType ? formatSubjectType(sub.subjectType) : '—'}</td>
                            <td>{sub.electiveType || 'Core Subject'}</td>
                            <td>{sub.credits !== '' && sub.credits != null ? sub.credits : '—'}</td>
                            <td>
                              {[sub.lectureHours, sub.tutorialHours, sub.practicalHours].map(v => v !== '' && v != null ? v : '0').join('/')}
                              <small style={{ display: 'block', color: 'var(--text-muted)' }}>({getWeeklyHours(sub)} hrs)</small>
                            </td>
                            <td>
                              {[sub.internalMarks, sub.externalMarks].map(v => v !== '' && v != null ? v : '0').join('/')}
                              <small style={{ display: 'block', color: 'var(--text-muted)' }}>Total: {getTotalMarks(sub)}</small>
                            </td>
                            <td>{sub.status}</td>
                            {saveResults?.attempted && (
                              <td>
                                {sub.saveStatus === 'success' && <span className="sm-status-pill sm-status-pill--success">Saved</span>}
                                {sub.saveStatus === 'failed' && (
                                  <span className="sm-status-pill sm-status-pill--danger" title={sub.saveError}>
                                    Failed: {sub.saveError}
                                  </span>
                                )}
                                {sub.saveStatus === 'idle' && <span className="sm-status-pill">Pending</span>}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}
          </div>

          <div className="erp-actions-bar sm-editor-footer">
            {stepIndex > 0 ? (
              <button
                type="button"
                className="cm-button secondary erp-btn erp-btn--secondary"
                disabled={saving || savingAll}
                onClick={() => goToTab(tabs[stepIndex - 1].id)}
              >
                &larr; Previous
              </button>
            ) : (
              <button
                type="button"
                className="cm-button secondary erp-btn erp-btn--secondary"
                disabled={saving || savingAll}
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
              ) : editorMode === 'single' ? (
                <button
                  key="save-single"
                  type="submit"
                  disabled={saving}
                  className="cm-button erp-btn erp-btn--primary"
                  aria-label={editing ? 'Update Subject' : 'Save Subject'}
                >
                  {saving ? 'Saving...' : editing ? 'Update Subject' : 'Save Subject'}
                </button>
              ) : (
                <button
                  key="save-all"
                  type="button"
                  disabled={savingAll}
                  className="cm-button erp-btn erp-btn--primary"
                  onClick={handleSaveAll}
                >
                  {savingAll
                    ? 'Saving All Subjects...'
                    : saveResults?.failCount > 0
                    ? 'Retry Failed Subjects'
                    : 'Save All Subjects'}
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
