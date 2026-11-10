import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FiEdit2, FiSearch, FiTrash2, FiEye, FiFileText, FiLayers, FiList, FiCalendar, FiMapPin, FiUsers, FiCheckCircle } from 'react-icons/fi'
import ViewDialog from '../../components/ViewDialog'
import PageHeader from '../../components/PageHeader'
import { useScreenAccess } from '../../auth/ScreenAccess'
import DashboardLayout from '../../layouts/DashboardLayout'
import ScopedModuleNotice from '../../components/ScopedModuleNotice'
import TablePagination from '../../components/TablePagination'
import FilterPanel from '../../components/FilterPanel'
import { ProjectSelect } from '../../components/SearchableSelect'
import { useAcademic } from '../../context/AcademicContext'
import { getUserRole } from '../../auth/auth'
import { studentProfileApi } from '../../api/apiEndpoints'
import { call, list, record, requireId, dateOnly } from '../../services/scopedModulesService'
import { loadExaminationData, loadScheduleLookups, scheduleConflict } from '../../services/examinationWorkspaceService'
import useScopedModule from '../../services/useScopedModule'
import './examination-setup/ExaminationSetup.css'
import './exam-timetable/ExamModule.css'
import './LiveExaminationWorkspace.css'

const workspaceSections = [
  { label: 'Setup', links: [
    { id: 'examinations', label: 'Examinations', path: '/examination-setup', icon: FiFileText, description: 'Manage examination cycles for the selected academic year.' },
    { id: 'types', label: 'Exam Types', path: '/examination-setup/exam-type', icon: FiLayers, description: 'Configure the types used when creating examinations.' },
    { id: 'rules', label: 'Exam Rules', path: '/examination-setup/exam-rules', icon: FiList, description: 'Manage assessment rules for each examination.' },
  ] },
  { label: 'Scheduling', links: [
    { id: 'schedules', label: 'Timetable', path: '/exam/timetable', icon: FiCalendar, description: 'Plan subject sessions, times and rooms across examinations.' },
    { id: 'halls', label: 'Hall Allocation', path: '/exam/hall-allocation', icon: FiMapPin, description: 'Assign halls and seat ranges to scheduled sessions.' },
    { id: 'student', label: 'Student Schedule', path: '/exam/student-schedule', icon: FiUsers, description: 'Review the student schedule.' },
    { id: 'completed', label: 'Completed Exams', path: '/examination/completed-exams', icon: FiCheckCircle, description: 'Review examination sessions whose scheduled date has passed.' },
  ] },
]
const active = value => value === true || value === 1 || ['active','scheduled'].includes(String(value).toLowerCase())
const ids = { examinations: 'examId', types: 'examTypeId', schedules: 'scheduleId', rules: 'ruleId', halls: 'examHallAllocationId' }
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

async function loadStudentExaminationData(scope) {
  const profile = await studentProfileApi.getMyProfile()
  const assignment = profile.academic || profile
  const courseId = assignment.courseId, branchId = assignment.branchId, semesterId = assignment.semesterId
  if (!courseId || !branchId || !semesterId) throw new Error('Your course, branch and semester assignment is required to load your examination schedule.')
  const examinations = (await list('exams', {CollegeId:scope.collegeId,AcademicYearId:scope.academicYearId,CourseId:courseId,BranchId:branchId,SemesterId:semesterId})).filter(e => active(e.status) && String(e.collegeId)===String(scope.collegeId) && String(e.academicYearId)===String(scope.academicYearId) && String(e.courseId)===String(courseId) && String(e.branchId)===String(branchId) && String(e.semesterId)===String(semesterId))
  const schedules = (await Promise.all(examinations.map(async e => (await list(`exams/${e.examId}/schedules`)).filter(s => active(s.status) && (!s.sectionId || String(s.sectionId)===String(assignment.sectionId))).map(s=>({...s,examId:e.examId,examName:e.examName,scheduleId:s.examScheduleId,roomName:s.classroomName}))))).flat()
  return {examinations,schedules,types:[],rules:[],halls:[],lookups:{}}
}

export default function LiveExaminationWorkspace({ screen = 'examination-list', timetable = false }) {
  const academic = useAcademic()
  const key = `${academic.selectedCollegeId}:${academic.selectedAcademicYearId}:${screen}`
  return <Workspace key={key} academic={academic} screen={screen} timetable={timetable} />
}

function Workspace({ academic, screen, timetable }) {
  const location = useLocation()
  const { canAction } = useScreenAccess()
  const accessPath = timetable ? '/exam/timetable' : '/examination-setup/examination-list'
  const canCreate = canAction(accessPath, 'create'), canEdit = canAction(accessPath, 'edit'), canDelete = canAction(accessPath, 'delete')
  const [viewing, setViewing] = useState(null)
  const collection = screen === 'exam-type' ? 'types' : screen === 'exam-rules' ? 'rules' : screen === 'halls' ? 'halls' : timetable || screen === 'exam-schedule' ? 'schedules' : 'examinations'
  const scope = { collegeId: academic.selectedCollegeId, academicYearId: academic.selectedAcademicYearId,area:collection,resource:collection,enabled:!academic.loading && Boolean(academic.selectedCollegeId) }
  const { data, state, mutate, reload, clearSaveError } = useScopedModule(getUserRole() === 'student' ? loadStudentExaminationData : loadExaminationData, scope, { examinations: [], types: [], schedules: [], rules: [], halls: [], lookups: {},loaded:[],resourceErrors:{} })
  const primaryError = data.resourceErrors?.[collection]
  const blocked = Boolean(primaryError || state.error || !scope.enabled)
  const initial = location.state?.exam
  const [editor, setEditor] = useState(screen === 'create' || screen === 'create-examination' ? initial || {} : null)
  const [query, setQuery] = useState('')
  const [examFilter, setExamFilter] = useState('')
  const [filters, setFilters] = useState({status:'',from:'',to:'',hall:''})
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState('')
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)
  const readonly = screen === 'student' || getUserRole() === 'student'
  const studentPortal = getUserRole() === 'student'
  const currentSection = screen === 'student' || screen === 'completed' ? screen : collection
  const currentView = workspaceSections.flatMap(section => section.links).find(link => link.id === currentSection)
  const idKey = ids[collection]
  const lookup = (keys, fallback = []) => { for (const k of keys) if (Array.isArray(data.lookups[k])) return data.lookups[k].map(record); return fallback }
  const courses = lookup(['courses'], academic.activeCourses || academic.courses || [])
  const branches = lookup(['branches'], academic.activeBranches || academic.branches || [])
  const semesters = lookup(['semesters'], academic.activeSemesters || academic.semesters || [])
  const classrooms = lookup(['classrooms', 'rooms'])
  const selectedExam = data.examinations.find(exam => String(exam.examId) === String(editor?.examId))
  const [scheduleMappings, setScheduleMappings] = useState(null)
  const [mappingAttempt, setMappingAttempt] = useState(0)
  const mappingCollege = scope.collegeId
  useEffect(() => {
    if (collection !== 'schedules' || !selectedExam) return
    const controller = new AbortController()
    loadScheduleLookups({ collegeId: mappingCollege }, selectedExam, controller.signal)
      .then(data => { if (!controller.signal.aborted) setScheduleMappings({ exam: selectedExam, attempt: mappingAttempt, data }) })
      .catch(error => { if (!controller.signal.aborted) setScheduleMappings({ exam: selectedExam, attempt: mappingAttempt, error: error.message }) })
    return () => controller.abort()
  }, [collection, selectedExam, mappingCollege, mappingAttempt])
  const currentMappings = scheduleMappings?.exam === selectedExam && scheduleMappings?.attempt === mappingAttempt ? scheduleMappings : null
  const subjects = currentMappings?.data?.subjects ?? []
  const sections = currentMappings?.data?.sections ?? []
  const examStart = dateOnly(selectedExam?.startDate), examEnd = dateOnly(selectedExam?.endDate)
  const displayDate = date => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})
  const dateHint = examStart && examEnd ? `Choose a date between ${displayDate(examStart)} and ${displayDate(examEnd)}.` : 'Select an examination to choose the exam date.'
  const openEditor = value => {setEditor(value);setFormError('');setFieldErrors({});clearSaveError()}
  const changeField = (key,value) => {
    setFormError('');clearSaveError()
    setFieldErrors(current=>({...current,[key]:'',...(key==='examId'?{examDate:''}:{})}))
    setEditor(current=>{
      const next={...current,[key]:value}
      if (key==='courseId') { next.branchId=''; next.semesterId='' }
      if (key==='branchId') next.semesterId=''
      if (key==='examId' && collection==='schedules') {
        next.subjectId = ''
        next.sectionId = ''
        const parent=data.examinations.find(exam=>String(exam.examId)===String(value))
        if (next.examDate && (dateOnly(next.examDate)<dateOnly(parent?.startDate) || dateOnly(next.examDate)>dateOnly(parent?.endDate))) next.examDate=''
      }
      return next
    })
  }
  const showSaveError = error => {
    if (collection==='schedules' && /examDate|schedule date/i.test(error.message || '')) {
      setFieldErrors(current=>({...current,examDate:dateHint}))
    } else {
      const message=error.status ? error.status===409 ? 'This record conflicts with an existing record. Review the details and try again.' : 'Unable to save these details. Check the form and try again.' : error.message
      setFormError(message)
    }
  }
  const fields = collection === 'examinations' ? [
    ['examName','Examination Name'], ['examCode','Examination Code'], ['courseId','Course','select',courses,'courseId','courseName'], ['branchId','Branch','select',branches.filter(b => !editor?.courseId || String(b.courseId) === String(editor.courseId)),'branchId','branchName'], ['semesterId','Semester / Term','select',semesters.filter(s => (!editor?.courseId || !s.courseId || String(s.courseId) === String(editor.courseId)) && (!editor?.branchId || !s.branchId || String(s.branchId) === String(editor.branchId))),'semesterId','semesterName'], ['examTypeId','Exam Type','select',data.types,'examTypeId','name'], ['description','Description','textarea',false],
  ] : collection === 'types' ? [['name','Exam Type Name'], ['code','Type Code'], ['description','Description','textarea',false], ['defaultDurationMinutes','Default Duration (minutes)','number',false]] : collection === 'rules' ? [
    ['examId','Examination','select',data.examinations,'examId','examName'], ['ruleCode','Rule Code'], ['ruleName','Rule Name'], ['ruleValue','Rule Value'], ['description','Description','textarea',false],
  ] : collection === 'halls' ? [
    ['examScheduleId','Exam Schedule','select',data.schedules.map(s => ({ ...s, label: `${s.examName} · ${s.subjectName} · ${dateOnly(s.examDate)} ${s.startTime}` })),'scheduleId','label'], ['classroomId','Hall','select',classrooms,'classroomId','roomName'], ['allocatedStudents','Allocated Students','number'], ['seatStartNumber','First Seat Number','number',false], ['seatEndNumber','Last Seat Number','number',false],
  ] : [
    ['examId','Examination','select',data.examinations,'examId','examName'], ['subjectId','Subject','select',subjects,'subjectId','subjectName'], ['sectionId','Section','select',sections,'sectionId','sectionName',false], ['classroomId','Hall','select',classrooms,'classroomId','roomName',false], ['examDate','Exam Date','date'], ['startTime','Start Time','time'], ['endTime','End Time','time'], ['reportingTime','Reporting Time','time',false], ['instructions','Instructions','textarea',false],
  ]
  const changeFilter = (key,value) => {setFilters(current=>({...current,[key]:value}));setPage(1)}
  const clearFilters = () => {setExamFilter('');setFilters({status:'',from:'',to:'',hall:''});setQuery('');setPage(1)}
  const hasFilters = Boolean(examFilter || Object.values(filters).some(Boolean))
  const dated = ['examinations','schedules','halls'].includes(collection)
  const hasHallFilter = ['schedules','halls'].includes(collection)
  const hallOptions = [...new Map(data[collection].filter(row=>row.roomName).map(row=>[String(row.classroomId ?? row.roomName),row.roomName])).entries()]
  const filtered = useMemo(() => data[collection].filter(r => {
    if (examFilter && String(r.examId) !== examFilter) return false
    if (filters.status && active(r.status) !== (filters.status==='active')) return false
    const date = dateOnly(r.examDate || r.startDate)
    if (filters.from && (!date || date<filters.from)) return false
    if (filters.to && (!date || date>filters.to)) return false
    if (filters.hall && String(r.classroomId ?? r.roomName) !== filters.hall) return false
    if (screen === 'completed' && dateOnly(r.examDate) >= today()) return false
    return Object.values(r).some(value => String(value ?? '').toLowerCase().includes(query.toLowerCase()))
  }), [data, collection, query, examFilter, screen, filters])
  const pathFor = item => collection === 'examinations' ? `exams${item.examId ? `/${requireId(item.examId)}` : ''}` : collection === 'types' ? `exam-types${item.examTypeId ? `/${requireId(item.examTypeId)}` : ''}` : collection === 'halls' ? `exam-schedules/hall-allocations${item.examHallAllocationId ? `/${requireId(item.examHallAllocationId)}` : ''}` : `exams/${requireId(item.examId, 'examination')}/${collection}${item[idKey] ? `/${requireId(item[idKey])}` : ''}`
  const save = async e => {
    e.preventDefault(); if (state.saving || !(editor[idKey] ? canEdit : canCreate)) return; setFormError(''); setFieldErrors({}); setNotice('')
    try {
      const body = Object.fromEntries(fields.map(([key,,type,options,,,required]) => [key, type === 'number' || type === 'select' ? editor[key] === '' || editor[key] == null ? null : Number(editor[key]) : editor[key] || (required === false || options === false ? null : '')]))
      body.status = editor.status == null ? true : active(editor.status)
      if (collection === 'examinations') {
        body.startDate = editor.startDate
        body.endDate = editor.endDate
        if (!editor[idKey]) throw new Error('New examinations cannot be saved because the date fields have been removed. Contact an administrator to create the examination.')
        if (!body.startDate || !body.endDate) throw new Error('Existing examination dates are unavailable. Contact an administrator before editing this record.')
        body.collegeId = requireId(scope.collegeId, 'college')
        body.academicYearId = requireId(scope.academicYearId, 'academic year')
        const course = courses.find(row => Number(row.courseId ?? row.id) === body.courseId)
        const branch = branches.find(row => Number(row.branchId ?? row.id) === body.branchId)
        const semester = semesters.find(row => Number(row.semesterId ?? row.id) === body.semesterId)
        if (!course || !branch || Number(branch.courseId) !== body.courseId || !semester ||
          (semester.courseId && Number(semester.courseId) !== body.courseId) || (semester.branchId && Number(semester.branchId) !== body.branchId)) {
          throw new Error('Select a matching course, branch and semester from the current academic configuration.')
        }
        if (!data.types.some(type => Number(type.examTypeId) === body.examTypeId)) throw new Error('Select a configured examination type.')
      }
      if (collection === 'types') body.collegeId = requireId(scope.collegeId, 'college')
      if (collection === 'schedules') {
        if (!selectedExam) throw new Error('Select an examination before saving the schedule.')
        if (!currentMappings?.data || !subjects.some(subject => String(subject.id ?? subject.subjectId) === String(body.subjectId)) ||
          (body.sectionId != null && !sections.some(section => String(section.id ?? section.sectionId) === String(body.sectionId)))) {
          throw new Error('Select a mapped subject and, if applicable, a section for this examination.')
        }
        if (!examStart || !examEnd) throw new Error('This examination needs valid start and end dates before a schedule can be added.')
        if (!body.examDate || body.examDate<examStart || body.examDate>examEnd) {setFieldErrors({examDate:dateHint});return}
        if (body.endTime <= body.startTime) {setFieldErrors({endTime:'End time must be later than start time.'});return}
        if (body.reportingTime && body.reportingTime > body.startTime) throw new Error('Reporting time must not be later than the examination start time.')
        const conflict = body.status && scheduleConflict(body, data.schedules, editor[idKey])
        if (conflict) throw new Error(conflict)
      }
      const path = pathFor(editor)
      if (blocked) throw new Error('Load this screen successfully before saving records.')
      if (collection !== 'types' && !scope.academicYearId) throw new Error('Select an active academic year before saving.')
      if (await mutate(() => call(path, { method: editor[idKey] ? 'PUT' : 'POST', body,query:{collegeId:scope.collegeId} }),{onError:showSaveError})) { setEditor(null); setNotice('Record saved successfully.') }
    } catch (error) { showSaveError(error) }
  }
  const remove = async () => {
    if (!deleteTarget || !canDelete || state.saving) return
    if (await mutate(() => call(pathFor(deleteTarget), { method: 'DELETE',query:{collegeId:scope.collegeId} }))) { setDeleteTarget(null); setNotice('Record deleted successfully.') }
  }
  const columns = collection === 'examinations' ? [['examName','Examination'],['examCode','Code'],['examTypeName','Exam Type'],['semesterName','Semester'],['startDate','Start Date'],['endDate','End Date']] : collection === 'types' ? [['name','Exam Type'],['code','Code'],['description','Description']] : collection === 'rules' ? [['examName','Examination'],['ruleName','Rule'],['ruleValue','Value'],['description','Description']] : collection === 'halls' ? [['examName','Examination'],['subjectName','Subject'],['roomName','Hall'],['allocatedStudents','Students'],['seatStartNumber','First Seat'],['seatEndNumber','Last Seat']] : [['examName','Examination'],['subjectName','Subject'],['sectionName','Section'],['examDate','Date'],['startTime','Start'],['endTime','End'],['roomName','Hall']]
  const count = key => state.loading || !scope.enabled || !data.loaded?.includes(key) || data.resourceErrors?.[key] ? '—' : data[key].length
  const addLabel = collection === 'schedules' ? 'Schedule' : collection === 'halls' ? 'Allocation' : collection === 'types' ? 'Exam Type' : collection === 'rules' ? 'Rule' : 'Examination'
  return <DashboardLayout><main className="examination-setup examination-setup--connected">
    <PageHeader title={studentPortal ? 'Student Exam Schedule' : 'Exam Management'} subtitle={studentPortal ? currentView.description : 'Set up examinations, plan the timetable and allocate halls in one workspace.'} compactSummary={[{label:'Examinations',value:count('examinations')},{label:'Exam Types',value:count('types')},{label:'Schedules',value:count('schedules')}]} />
    {!studentPortal && <nav className="exam-workspace-navigation" aria-label="Exam Management">
      {workspaceSections.map(section => <div className="exam-workspace-navigation__group" key={section.label}>
        <span>{section.label}</span>
        <div className="exam-workspace-navigation__links">
          {section.links.map(({ id, label, path, icon: Icon }) => <Link key={id} to={path} aria-current={currentSection === id ? 'page' : undefined}>
            <Icon aria-hidden="true" />{label}
          </Link>)}
        </div>
      </div>)}
    </nav>}
    {scope.enabled ? <ScopedModuleNotice state={state} data={data} resource={collection} onRetry={reload} /> : <p role="status" className="campus-notice">{academic.loading ? 'Loading college configuration…' : 'Select a college to view examination records.'}</p>}{notice && <p role="status" className="examination-setup__success">{notice}</p>}
    {scope.enabled && !scope.academicYearId && collection !== 'types' && <p role="status" className="campus-notice">No active academic year is available for this college. Existing records can be reviewed; an academic year is required to save examinations and schedules.</p>}
    <section className="examination-setup__card" aria-labelledby="exam-workspace-view">
      <header className="exam-workspace-view">
        <h2 id="exam-workspace-view">{currentView.label}</h2>
        <p>{currentView.description}</p>
      </header>
    <FilterPanel className="examination-setup__filter-panel" active={hasFilters} onClear={clearFilters} actions={!readonly && canCreate && <button type="button" className="examination-setup__primary" disabled={state.loading || state.saving || blocked} onClick={() => openEditor({})}>Add {addLabel}</button>}>
      <label className="examination-setup__search"><FiSearch aria-hidden="true" /><input aria-label="Search records" placeholder="Search records…" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} /></label>
      <div className="examination-setup__filter-fields">
        {['rules','schedules','halls'].includes(collection) && <label><span>Examination</span><ProjectSelect value={examFilter} onChange={e=>{setExamFilter(e.target.value);setPage(1)}} aria-label="Filter examination"><option value="">All examinations</option>{data.examinations.map(row=><option key={row.examId} value={row.examId}>{row.examName}</option>)}</ProjectSelect></label>}
        <label><span>Status</span><ProjectSelect aria-label="Filter status" value={filters.status} onChange={e=>changeFilter('status',e.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></ProjectSelect></label>
        {hasHallFilter && <label><span>Hall</span><ProjectSelect aria-label="Filter hall" value={filters.hall} onChange={e=>changeFilter('hall',e.target.value)}><option value="">All halls</option>{hallOptions.map(([id,name])=><option key={id} value={id}>{name}</option>)}</ProjectSelect></label>}
        {dated && <><label><span>From date</span><input aria-label="From date" type="date" value={filters.from} max={filters.to || undefined} onChange={e=>changeFilter('from',e.target.value)} /></label><label><span>To date</span><input aria-label="To date" type="date" value={filters.to} min={filters.from || undefined} onChange={e=>changeFilter('to',e.target.value)} /></label></>}
      </div>
    </FilterPanel>
    {!scope.enabled ? <p className="examination-setup__empty">Select a college to continue.</p> : state.loading ? <p role="status">Loading records…</p> : blocked ? null : <div className="examination-setup__table-wrap"><table><thead><tr>{columns.map(([key,label]) => <th key={key}>{label}</th>)}<th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.slice((page-1)*10,page*10).map((r,index) => <tr key={r[idKey] ?? index}>{columns.map(([key]) => <td key={key}>{/Date$/.test(key) ? dateOnly(r[key]) : r[key] ?? '—'}</td>)}<td>{active(r.status) ? 'Active' : 'Inactive'}</td><td><div className="examination-setup__actions"><button type="button" className="table-action-btn action-view" aria-label="View details" onClick={() => setViewing(r)}><FiEye /></button>{!readonly && canEdit && <button type="button" className="table-action-btn action-edit" title="Edit" aria-label="Edit" disabled={state.saving} onClick={() => openEditor({...r})}><FiEdit2 aria-hidden="true" /></button>}{!readonly && canDelete && collection !== 'types' && <button type="button" className="table-action-btn action-delete" title="Delete" aria-label="Delete" disabled={state.saving} onClick={() => setDeleteTarget(r)}><FiTrash2 aria-hidden="true" /></button>}</div></td></tr>)}{!filtered.length && <tr><td colSpan={columns.length+2}>No matching institutional records.</td></tr>}</tbody></table></div>}
    {scope.enabled && !blocked && !state.loading && <TablePagination page={page} totalPages={Math.max(1,Math.ceil(filtered.length/10))} onPageChange={setPage} />}
    </section>
    {editor && !readonly && (editor[idKey] ? canEdit : canCreate) && <ViewDialog title={`Manage ${addLabel}`} subtitle={`${editor[idKey] ? "Edit" : "Add"} ${addLabel}`} onClose={() => setEditor(null)} showExport={false} hideFooter busy={state.saving} maxWidth="820px"><form className="examination-setup__form" onSubmit={save}>
      {collection === 'examinations' && !editor[idKey] && <p role="status" className="campus-notice">New examinations cannot be saved because the date fields have been removed. Contact an administrator to create the examination.</p>}
      {fields.map(([key,label,type = 'text', options, optionKey, optionLabel, required]) => <label key={key}><span>{label}{options === false || required === false ? '' : ' *'}</span>{type === 'select' ? <ProjectSelect required={required !== false} value={editor[key] ?? ''} onChange={e => changeField(key,e.target.value)}><option value="">Select {label.toLowerCase()}</option>{options.map((o,index) => <option key={o[optionKey] ?? o.id ?? index} value={o[optionKey] ?? o.id}>{o[optionLabel] || o.name || o.classroomName || o.roomNumber || o.code || o.id}</option>)}</ProjectSelect> : type === 'textarea' ? <textarea value={editor[key] || ''} onChange={e => changeField(key,e.target.value)} /> : <input required={options !== false} type={type} aria-invalid={Boolean(fieldErrors[key])} aria-describedby={fieldErrors[key] || key === 'examDate' ? `exam-field-${key}-hint` : undefined} disabled={key === 'examDate' && collection === 'schedules' && (!examStart || !examEnd)} min={key === 'examDate' && collection === 'schedules' ? examStart : type === 'number' ? key === 'allocatedStudents' ? 0 : 1 : undefined} max={key === 'examDate' && collection === 'schedules' ? examEnd : undefined} value={type === 'date' ? dateOnly(editor[key]) : editor[key] ?? ''} onChange={e => changeField(key,e.target.value)} />}{(fieldErrors[key] || key === 'examDate' && collection === 'schedules') && <small id={`exam-field-${key}-hint`} className={fieldErrors[key] ? 'examination-setup__field-error' : 'examination-setup__field-hint'} role={fieldErrors[key] ? 'alert' : undefined}>{fieldErrors[key] || dateHint}</small>}</label>)}
      {collection === 'schedules' && selectedExam && !currentMappings && <p role="status">Loading examination subject and section mappings…</p>}
      {currentMappings?.error && <div role="alert">{currentMappings.error} <button type="button" className="examination-setup__secondary" onClick={() => setMappingAttempt(attempt => attempt + 1)}>Retry mappings</button></div>}
      {currentMappings?.data && !subjects.length && <p role="status">No subjects are mapped to this examination’s course, branch and semester.</p>}
      <label><span>Status</span><ProjectSelect value={editor.status == null || active(editor.status) ? 'active' : 'inactive'} onChange={e => setEditor(v => ({...v,status:e.target.value==='active'}))}><option value="active">Active</option><option value="inactive">Inactive</option></ProjectSelect></label>
      {formError && <p role="alert" className="examination-setup__form-feedback">{formError}</p>}<footer><button type="button" className="examination-setup__secondary" onClick={() => setEditor(null)}>Cancel</button><button className="examination-setup__primary" disabled={state.loading || state.saving || blocked || collection === 'examinations' && !editor[idKey]} type="submit">{state.saving ? 'Saving…' : 'Save'}</button></footer>
    </form></ViewDialog>}
    {deleteTarget && canDelete && <ViewDialog title="Confirm deletion" showExport={false} hideFooter busy={state.saving} onClose={() => setDeleteTarget(null)}><p>Delete this institutional record? Existing backend dependency rules still apply.</p>{state.saveError && <p role="alert">{String(state.saveError.message || state.saveError)}</p>}<div className="examination-setup__actions"><button className="examination-setup__secondary" disabled={state.saving} onClick={() => setDeleteTarget(null)}>Cancel</button><button className="examination-setup__primary" disabled={state.saving} onClick={remove}>Delete</button></div></ViewDialog>}
    {viewing && <ViewDialog title={addLabel+' Details'} subtitle={viewing.examName || viewing.name || viewing.subjectName} onClose={() => setViewing(null)} showExport={false}><dl className="examination-record-details">{[...columns,['courseName','Course'],['branchName','Branch'],['description','Description']].filter(([key],index,all)=>all.findIndex(([k])=>k===key)===index).map(([key,label])=><div key={key}><dt>{label}</dt><dd>{/Date$/.test(key) ? dateOnly(viewing[key]) || '—' : viewing[key] ?? '—'}</dd></div>)}<div><dt>Status</dt><dd>{active(viewing.status)?'Active':'Inactive'}</dd></div></dl></ViewDialog>}
  </main></DashboardLayout>
}
