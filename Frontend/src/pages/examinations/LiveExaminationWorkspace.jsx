import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FiEdit2, FiSearch, FiTrash2 } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import ScopedModuleNotice from '../../components/ScopedModuleNotice'
import TablePagination from '../../components/TablePagination'
import FilterPanel from '../../components/FilterPanel'
import { ProjectSelect } from '../../components/SearchableSelect'
import { useAcademic } from '../../context/AcademicContext'
import { getUserRole } from '../../auth/auth'
import { studentProfileApi } from '../../api/apiEndpoints'
import { call, list, record, requireId, dateOnly } from '../../services/scopedModulesService'
import { loadExaminationData } from '../../services/examinationWorkspaceService'
import useScopedModule from '../../services/useScopedModule'
import './examination-setup/ExaminationSetup.css'
import './exam-timetable/ExamModule.css'
import './LiveExaminationWorkspace.css'

const setupTabs = [['Examination List','examination-list'], ['Create Examination','create-examination'], ['Exam Type','exam-type'], ['Exam Schedule','exam-schedule'], ['Exam Rules','exam-rules']]
const timetableTabs = [['Exam Timetable','/exam/timetable'], ['Schedule List','/exam/schedules'], ['Department Schedule','/exam/department-schedule'], ['Student Schedule','/exam/student-schedule'], ['Hall Allocation','/exam/hall-allocation'], ['Completed Exams','/examination/completed-exams']]
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
  const title = timetable ? screen === 'halls' ? 'Hall Allocation' : screen === 'completed' ? 'Completed Exams' : screen === 'department' ? 'Department Exam Schedule' : screen === 'student' ? 'Student Exam Schedule' : 'Exam Timetable' : 'Examination Setup'
  const idKey = ids[collection]
  const lookup = (keys, fallback = []) => { for (const k of keys) if (Array.isArray(data.lookups[k])) return data.lookups[k].map(record); return fallback }
  const courses = lookup(['courses'], academic.activeCourses || academic.courses || [])
  const branches = lookup(['branches'], academic.activeBranches || academic.branches || [])
  const semesters = lookup(['semesters'], academic.activeSemesters || academic.semesters || [])
  const subjects = lookup(['subjects'])
  const sections = lookup(['sections'], academic.sections || [])
  const classrooms = lookup(['classrooms', 'rooms'])
  const selectedExam = data.examinations.find(exam => String(exam.examId) === String(editor?.examId))
  const examStart = dateOnly(selectedExam?.startDate), examEnd = dateOnly(selectedExam?.endDate)
  const displayDate = date => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})
  const dateHint = examStart && examEnd ? `Choose a date between ${displayDate(examStart)} and ${displayDate(examEnd)}.` : 'Select an examination to choose the exam date.'
  const openEditor = value => {setEditor(value);setFormError('');setFieldErrors({});clearSaveError()}
  const changeField = (key,value) => {
    setFormError('');clearSaveError()
    setFieldErrors(current=>({...current,[key]:'',...(key==='examId'?{examDate:''}:{})}))
    setEditor(current=>{
      const next={...current,[key]:value}
      if (key==='examId' && collection==='schedules') {
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
    ['examName','Examination Name'], ['examCode','Examination Code'], ['courseId','Course','select',courses,'courseId','courseName'], ['branchId','Branch','select',branches.filter(b => !editor?.courseId || String(b.courseId) === String(editor.courseId)),'branchId','branchName'], ['semesterId','Semester / Term','select',semesters.filter(s => (!editor?.courseId || !s.courseId || String(s.courseId) === String(editor.courseId)) && (!editor?.branchId || !s.branchId || String(s.branchId) === String(editor.branchId))),'semesterId','semesterName'], ['examTypeId','Exam Type','select',data.types,'examTypeId','name'], ['startDate','Start Date','date'], ['endDate','End Date','date'], ['description','Description','textarea',false],
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
    e.preventDefault(); setFormError(''); setFieldErrors({}); setNotice('')
    try {
      const body = Object.fromEntries(fields.map(([key,,type,options,,,required]) => [key, type === 'number' || type === 'select' ? editor[key] === '' || editor[key] == null ? null : Number(editor[key]) : editor[key] || (required === false || options === false ? null : '')]))
      body.status = editor.status == null ? true : active(editor.status)
      if (collection === 'examinations') { body.collegeId = requireId(scope.collegeId, 'college'); body.academicYearId = requireId(scope.academicYearId, 'academic year'); if (body.endDate < body.startDate) throw new Error('End date must not precede start date.') }
      if (collection === 'types') body.collegeId = requireId(scope.collegeId, 'college')
      if (collection === 'schedules') {
        if (!selectedExam) throw new Error('Select an examination before saving the schedule.')
        if (!examStart || !examEnd) throw new Error('This examination needs valid start and end dates before a schedule can be added.')
        if (!body.examDate || body.examDate<examStart || body.examDate>examEnd) {setFieldErrors({examDate:dateHint});return}
        if (body.endTime <= body.startTime) {setFieldErrors({endTime:'End time must be later than start time.'});return}
      }
      const path = pathFor(editor)
      if (blocked) throw new Error('Load this screen successfully before saving records.')
      if (collection !== 'types' && !scope.academicYearId) throw new Error('Select an active academic year before saving.')
      if (await mutate(() => call(path, { method: editor[idKey] ? 'PUT' : 'POST', body,query:{collegeId:scope.collegeId} }),{onError:showSaveError})) { setEditor(null); setNotice('Record saved successfully.') }
    } catch (error) { showSaveError(error) }
  }
  const remove = async () => {
    if (!deleteTarget) return
    if (await mutate(() => call(pathFor(deleteTarget), { method: 'DELETE',query:{collegeId:scope.collegeId} }))) { setDeleteTarget(null); setNotice('Record deleted successfully.') }
  }
  const columns = collection === 'examinations' ? [['examName','Examination'],['examCode','Code'],['examTypeName','Exam Type'],['semesterName','Semester'],['startDate','Start Date'],['endDate','End Date']] : collection === 'types' ? [['name','Exam Type'],['code','Code'],['description','Description']] : collection === 'rules' ? [['examName','Examination'],['ruleName','Rule'],['ruleValue','Value'],['description','Description']] : collection === 'halls' ? [['examName','Examination'],['subjectName','Subject'],['roomName','Hall'],['allocatedStudents','Students'],['seatStartNumber','First Seat'],['seatEndNumber','Last Seat']] : [['examName','Examination'],['subjectName','Subject'],['sectionName','Section'],['examDate','Date'],['startTime','Start'],['endTime','End'],['roomName','Hall']]
  const count = key => state.loading || !scope.enabled || !data.loaded?.includes(key) || data.resourceErrors?.[key] ? '—' : data[key].length
  const addLabel = collection === 'schedules' ? 'Schedule' : collection === 'halls' ? 'Allocation' : collection === 'types' ? 'Exam Type' : collection === 'rules' ? 'Rule' : 'Examination'
  return <DashboardLayout><main className="examination-setup examination-setup--connected">
    <header className="examination-setup__header"><div><h1>{title}</h1><p>{collection === 'types' ? 'Configure examination types used by examinations and schedules.' : collection === 'rules' ? 'Manage rules for the selected examination.' : collection === 'halls' ? 'Allocate examination halls and seats.' : 'Create and manage examination cycles and schedules.'}</p></div><div className="examination-setup__summary"><div><strong>{count('examinations')}</strong><small>Examinations</small></div><div><strong>{count('types')}</strong><small>Exam Types</small></div><div><strong>{count('schedules')}</strong><small>Schedules</small></div></div></header>
    <nav className="examination-setup__tabs" aria-label={title}>{(timetable ? timetableTabs : setupTabs.map(([label,slug]) => [label,`/examination-setup/${slug}`])).map(([label,url]) => <Link key={url} to={url} className={location.pathname === url ? 'active' : ''}>{label}</Link>)}</nav>
    {scope.enabled ? <ScopedModuleNotice state={state} data={data} resource={collection} onRetry={reload} /> : <p role="status" className="campus-notice">{academic.loading ? 'Loading college configuration…' : 'Select a college to view examination records.'}</p>}{notice && <p role="status" className="examination-setup__success">{notice}</p>}
    {scope.enabled && !scope.academicYearId && collection !== 'types' && <p role="status" className="campus-notice">No active academic year is available for this college. Existing records can be reviewed; an academic year is required to save examinations and schedules.</p>}
    <section className="examination-setup__card">
    <FilterPanel className="examination-setup__filter-panel" active={hasFilters} onClear={clearFilters} actions={!readonly && <button type="button" className="examination-setup__primary" disabled={state.loading || state.saving || blocked} onClick={() => openEditor({})}>Add {addLabel}</button>}>
      <label className="examination-setup__search"><FiSearch aria-hidden="true" /><input aria-label="Search records" placeholder="Search records…" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} /></label>
      <div className="examination-setup__filter-fields">
        {['rules','schedules','halls'].includes(collection) && <label><span>Examination</span><ProjectSelect value={examFilter} onChange={e=>{setExamFilter(e.target.value);setPage(1)}} aria-label="Filter examination"><option value="">All examinations</option>{data.examinations.map(row=><option key={row.examId} value={row.examId}>{row.examName}</option>)}</ProjectSelect></label>}
        <label><span>Status</span><ProjectSelect aria-label="Filter status" value={filters.status} onChange={e=>changeFilter('status',e.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></ProjectSelect></label>
        {hasHallFilter && <label><span>Hall</span><ProjectSelect aria-label="Filter hall" value={filters.hall} onChange={e=>changeFilter('hall',e.target.value)}><option value="">All halls</option>{hallOptions.map(([id,name])=><option key={id} value={id}>{name}</option>)}</ProjectSelect></label>}
        {dated && <><label><span>From date</span><input aria-label="From date" type="date" value={filters.from} max={filters.to || undefined} onChange={e=>changeFilter('from',e.target.value)} /></label><label><span>To date</span><input aria-label="To date" type="date" value={filters.to} min={filters.from || undefined} onChange={e=>changeFilter('to',e.target.value)} /></label></>}
      </div>
    </FilterPanel>
    {!scope.enabled ? <p className="examination-setup__empty">Select a college to continue.</p> : state.loading ? <p role="status">Loading records…</p> : blocked ? null : <div className="examination-setup__table-wrap"><table><thead><tr>{columns.map(([key,label]) => <th key={key}>{label}</th>)}<th>Status</th>{!readonly && <th>Actions</th>}</tr></thead><tbody>{filtered.slice((page-1)*10,page*10).map((r,index) => <tr key={r[idKey] ?? index}>{columns.map(([key]) => <td key={key}>{/Date$/.test(key) ? dateOnly(r[key]) : r[key] ?? '—'}</td>)}<td>{active(r.status) ? 'Active' : 'Inactive'}</td>{!readonly && <td><div className="examination-setup__actions"><button type="button" className="table-action-btn action-edit" title="Edit" aria-label="Edit" disabled={state.saving} onClick={() => openEditor({...r})}><FiEdit2 aria-hidden="true" /></button>{collection !== 'types' && <button type="button" className="table-action-btn action-delete" title="Delete" aria-label="Delete" disabled={state.saving} onClick={() => setDeleteTarget(r)}><FiTrash2 aria-hidden="true" /></button>}</div></td>}</tr>)}{!filtered.length && <tr><td colSpan={columns.length+2}>No matching institutional records.</td></tr>}</tbody></table></div>}
    {scope.enabled && !blocked && !state.loading && <TablePagination page={page} totalPages={Math.max(1,Math.ceil(filtered.length/10))} onPageChange={setPage} />}
    </section>
    {editor && !readonly && <div className="examination-setup__modal-backdrop"><section className="examination-setup__modal" role="dialog" aria-modal="true" aria-label={`Manage ${addLabel}`}><header><h2>{editor[idKey] ? 'Edit' : 'Add'} {addLabel}</h2><button type="button" aria-label="Close editor" onClick={() => setEditor(null)}>×</button></header><form className="examination-setup__form" onSubmit={save}>
      {fields.map(([key,label,type = 'text', options, optionKey, optionLabel, required]) => <label key={key}><span>{label}{options === false || required === false ? '' : ' *'}</span>{type === 'select' ? <ProjectSelect required={required !== false} value={editor[key] ?? ''} onChange={e => changeField(key,e.target.value)}><option value="">Select {label.toLowerCase()}</option>{options.map((o,index) => <option key={o[optionKey] ?? o.id ?? index} value={o[optionKey] ?? o.id}>{o[optionLabel] || o.name || o.classroomName || o.roomNumber || o.code || o.id}</option>)}</ProjectSelect> : type === 'textarea' ? <textarea value={editor[key] || ''} onChange={e => changeField(key,e.target.value)} /> : <input required={options !== false} type={type} aria-invalid={Boolean(fieldErrors[key])} aria-describedby={fieldErrors[key] || key === 'examDate' ? `exam-field-${key}-hint` : undefined} disabled={key === 'examDate' && collection === 'schedules' && (!examStart || !examEnd)} min={key === 'examDate' && collection === 'schedules' ? examStart : type === 'number' ? key === 'allocatedStudents' ? 0 : 1 : undefined} max={key === 'examDate' && collection === 'schedules' ? examEnd : undefined} value={type === 'date' ? dateOnly(editor[key]) : editor[key] ?? ''} onChange={e => changeField(key,e.target.value)} />}{(fieldErrors[key] || key === 'examDate' && collection === 'schedules') && <small id={`exam-field-${key}-hint`} className={fieldErrors[key] ? 'examination-setup__field-error' : 'examination-setup__field-hint'} role={fieldErrors[key] ? 'alert' : undefined}>{fieldErrors[key] || dateHint}</small>}</label>)}
      <label><span>Status</span><ProjectSelect value={editor.status == null || active(editor.status) ? 'active' : 'inactive'} onChange={e => setEditor(v => ({...v,status:e.target.value==='active'}))}><option value="active">Active</option><option value="inactive">Inactive</option></ProjectSelect></label>
      {formError && <p role="alert" className="examination-setup__form-feedback">{formError}</p>}<footer><button type="button" className="examination-setup__secondary" onClick={() => setEditor(null)}>Cancel</button><button className="examination-setup__primary" disabled={state.loading || state.saving || blocked} type="submit">{state.saving ? 'Saving…' : 'Save'}</button></footer>
    </form></section></div>}
    {deleteTarget && <section className="examination-setup__card" role="dialog" aria-label="Confirm deletion"><p>Delete this institutional record?</p><button className="examination-setup__secondary" disabled={state.saving} onClick={() => setDeleteTarget(null)}>Cancel</button><button className="examination-setup__primary" disabled={state.saving} onClick={remove}>Delete</button></section>}
  </main></DashboardLayout>
}
