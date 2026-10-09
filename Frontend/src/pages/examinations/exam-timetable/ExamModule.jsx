import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays, ClipboardList, Plus, Printer, RefreshCw, Search, Users, Building2, Clock3, CheckCircle2, AlertTriangle, X, Filter as FilterIcon, ChevronDown } from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import { getAuthStorage, getUserRole } from '../../../auth/auth'
import roomService from '../../../services/roomService'
import studentService from '../../../services/studentService'
import facultyService from '../../../services/facultyService'
import academicService from '../../../services/academicService'
import { subjectService } from '../../../services/subjectService'
import { createExam, createHallAllocation, deleteExam, deleteHallAllocation, examMaster, getAvailableHalls, getExams, getExamSessions, getExamTypes, getHallAllocations, getHalls, getInvigilationRules, getInvigilations, getStudents, getSubjects, replaceHalls, saveExamSessions, saveExamTypes, saveInvigilationRules, saveInvigilations, updateExam, updateHallAllocation, upsertStudents, validateExam } from '../../../services/examService'
import './ExamModule.css'

const routeInfo = {
  create: ['Create Exam Timetable', 'Create and manage examination schedules for departments, batches, semesters and subjects.'],
  department: ['Department Exam Schedule', 'View and manage examination schedules for your department.'],
  list: ['Exam Schedule List', 'View, search, filter and manage all examination schedules.'],
  timetable: ['Exam Timetable', 'View examination timetable by academic year, department, batch and semester.'],
  halls: ['Hall Allocation', 'Assign examination halls and students for scheduled examinations.'],
  configuration: ['Exam Configuration', 'Manage examination types and department invigilation rules.'],
  student: ['Exam Schedule', 'View your upcoming and completed examination schedules.'],
}
const dateLabel = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const dayLabel = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long' }) : ''
const timeLabel = (value) => value ? new Date(`2000-01-01T${value}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'
const addMinutesToTime = (value,minutes) => { const [hours,mins]=String(value||'09:00').split(':').map(Number);const total=(hours*60+mins+Number(minutes||0))%1440;return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}` }
const today = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}` }
const getStatus = (exam) => exam.status === 'Cancelled' ? 'Cancelled' : exam.status === 'Draft' ? 'Draft' : exam.status === 'Published' && exam.examDate > today() ? 'Published' : !exam.examDate ? 'Scheduled' : exam.examDate < today() ? 'Completed' : exam.examDate === today() ? 'Ongoing' : 'Upcoming'
const exportTimetable = (rows) => { const columns=['examDate','session','startTime','endTime','subjectCode','subjectName','examType','department','branch','batch','semester','section','hallId','status'];const csv=[columns.join(','),...rows.map((row)=>columns.map((key)=>`"${String(row[key]??'').replaceAll('"','""')}"`).join(','))].join('\r\n');const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));link.download='exam-timetable.csv';link.click();URL.revokeObjectURL(link.href) }
const initialFilters = { academicYear: '', examType: '', department: '', course: '', branch: '', batch: '', semester: '', section: '', session: '', status: '', from: '', to: '' }
const normalizeText = (value) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
const semesterOptions = (rows) => {
  const roman=['I','II','III','IV','V','VI','VII','VIII']
  const values=(Array.isArray(rows)?rows:[]).map((row)=>{const label=typeof row==='string'?row:row.semesterName||row.name||row.semesterNumber||row.semester||'';const number=Number(String(row?.semesterNumber??label).match(/\d+/)?.[0]);return number>0&&number<=8?roman[number-1]:String(label).replace(/semester/ig,'').trim()}).filter(Boolean)
  return [...new Set(values)]
}
const optionName = (row, keys) => { if(typeof row==='string'||typeof row==='number')return String(row);for(const key of keys){if(row?.[key]!=null&&String(row[key]).trim())return String(row[key]).trim()}return '' }
function getBranchesForDepartment(branch) { return ({CSE:'Computer Science',ECE:'Electronics & Communication',EEE:'Electrical Engineering',Mechanical:'Mechanical Engineering',Civil:'Civil Engineering'})[branch] || '' }
function getAssignedInvigilator(exam, hallId = exam?.hallId) {
  const matchesHall = (item) => !hallId || !item.hallId || String(item.hallId) === String(hallId)
  const generatedNames = getInvigilations().filter((item)=>item.examId===exam?.id&&matchesHall(item)).map((item)=>item.facultyName||item.name||item.faculty).filter(Boolean)
  if (generatedNames.length) return [...new Set(generatedNames)].join(', ')
  const allocatedNames = getHallAllocations().filter((item)=>item.examId===exam?.id&&matchesHall(item)).map((item)=>item.invigilator).filter(Boolean)
  if (allocatedNames.length) return [...new Set(allocatedNames)].join(', ')
  return (!hallId||String(hallId)===String(exam?.hallId))?exam?.invigilator||'Unassigned':'Unassigned'
}
function getHallRollRange(exam, allocation, scheduled) {
  if (allocation?.studentFrom && allocation?.studentTo) return `${allocation.studentFrom} – ${allocation.studentTo}`
  if (scheduled && exam?.rollNoFrom && exam?.rollNoTo) return `${exam.rollNoFrom} – ${exam.rollNoTo}`
  return '—'
}
function parseRollNumberRange(from, to) {
  const first=String(from||'').trim().match(/^(.*?)(\d+)$/)
  const last=String(to||'').trim().match(/^(.*?)(\d+)$/)
  if(!first||!last||normalizeText(first[1])!==normalizeText(last[1]))return null
  const start=Number(first[2]),end=Number(last[2])
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||end<start)return null
  const width=Math.max(first[2].length,last[2].length)
  return{prefix:first[1],start,end,width,count:end-start+1,format:(number)=>`${first[1]}${String(number).padStart(width,'0')}`}
}
function getAllocatedRangePositions(allocations, range) {
  const positions=new Set()
  if(!range)return positions
  for(const allocation of allocations){
    const first=String(allocation.studentFrom||'').match(/^(.*?)(\d+)$/)
    const last=String(allocation.studentTo||'').match(/^(.*?)(\d+)$/)
    if(!first||!last||normalizeText(first[1])!==normalizeText(range.prefix)||normalizeText(last[1])!==normalizeText(range.prefix))continue
    const low=Math.max(range.start,Number(first[2])),high=Math.min(range.end,Number(last[2]))
    for(let number=low;number<=high;number++)positions.add(number-range.start+1)
  }
  return positions
}

function Status({ value }) { return <span className={`exm-status exm-status--${String(value).toLowerCase().replaceAll(' ', '-')}`}>{value}</span> }
function Field({ label, children, required }) { return <label className="exm-field"><span>{label}{required && <b> *</b>}</span>{children}</label> }
function Empty({ children = 'No examination schedules found.' }) { return <div className="exm-empty"><ClipboardList size={28}/><strong>{children}</strong><span>Try changing your filters or create a new schedule.</span></div> }
function Notice({ children, onClose }) { return <div className="exm-notice" role="status"><CheckCircle2 size={18}/><span>{children}</span>{onClose && <button onClick={onClose} aria-label="Close"><X size={16}/></button>}</div> }

export default function ExamModule({ screen }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [exams, setExams] = useState(getExams)
  const [halls, setHalls] = useState(getHalls)
  const [allocations, setAllocations] = useState(getHallAllocations)
  const [students, setStudents] = useState(getStudents)
  const [invigilators, setInvigilators] = useState(examMaster.faculty)
  const [facultyDirectory, setFacultyDirectory] = useState(examMaster.facultyDirectory)
  const [masterOptions, setMasterOptions] = useState(() => ({
    academicYears:examMaster.academicYears,
    departments:examMaster.departments,
    courses:examMaster.courses,
    branches:examMaster.branches.map((code)=>({id:code,value:code,label:code,code,department:getBranchesForDepartment(code)})),
    batches:[...new Set([...examMaster.batches,...getExams().map((exam)=>exam.batch).filter(Boolean),...getStudents().map((student)=>student.batch).filter(Boolean)])],
    semesters:examMaster.semesters,
    sections:examMaster.sections,
    subjects:examMaster.subjects,
    faculty:examMaster.faculty,
    sessions:getExamSessions().filter((item)=>item.enabled),
  }))
  const [masterDataRefresh, setMasterDataRefresh] = useState(0)
  const [masterDataLoading, setMasterDataLoading] = useState(false)
  const [notice, setNotice] = useState(() => location.state?.notice || '')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(initialFilters)
  const [draftFilters, setDraftFilters] = useState(initialFilters)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sort, setSort] = useState({ key: 'examDate', direction: 'asc' })
  const [confirm, setConfirm] = useState(null)
  const [details, setDetails] = useState(null)
  const [view, setView] = useState('table')
  const [selectedExam, setSelectedExam] = useState('')
  const [selectedHall, setSelectedHall] = useState('')
  const [invigilator, setInvigilator] = useState('')
  const [studentRange, setStudentRange] = useState({ from: 1, to: 40 })
  const query = new URLSearchParams(location.search)
  const editingExam = query.get('edit') ? exams.find((e) => e.id === query.get('edit')) : null
  const duplicateTemplate = query.get('duplicate') ? exams.find((e) => e.id === query.get('duplicate')) : null

  const reload = () => { setExams(getExams()); setHalls(getHalls()); setAllocations(getHallAllocations()); setStudents(getStudents()) }
  useEffect(() => { const handler = () => reload(); window.addEventListener('exam-data-updated', handler); return () => window.removeEventListener('exam-data-updated', handler) }, [])
  useEffect(() => {
    let active=true
    const tasks=[academicService.getAcademicYears(),academicService.getDepartments(),academicService.getCourses(),academicService.getBranches(),academicService.getSemesters(),academicService.getSections(),subjectService.getSubjects({liveOnly:true}),studentService.getAllProfiles({forceRefresh:true}),facultyService.list()]
    Promise.allSettled(tasks).then((results)=>{
      if(!active)return
      const rows=(index)=>results[index]?.status==='fulfilled'&&Array.isArray(results[index].value)?results[index].value:[]
      const years=rows(0),departments=rows(1),courses=rows(2),branches=rows(3),semesters=rows(4),sections=rows(5),subjects=rows(6),profiles=rows(7),facultyRows=rows(8)
      const labels=(items,keys)=>items.map((item)=>optionName(item,keys)).filter(Boolean)
      const merged=(current,incoming)=>[...new Set([...incoming,...current].filter(Boolean))]
      const departmentLabels=merged(examMaster.departments,labels(departments,['departmentName','name']))
      const courseLabels=merged(examMaster.courses,labels(courses,['courseName','name']))
      const branchOptions=[...branches.map((item)=>{const department=departments.find((row)=>String(row.id??row.departmentId)===String(item.departmentId));return{id:String(item.id??item.branchId??''),value:String(item.code||item.branchCode||item.name||item.branchName||''),label:String(item.name||item.branchName||item.code||item.branchCode||''),code:String(item.code||item.branchCode||''),departmentId:item.departmentId,courseId:item.courseId,department:optionName(department,['departmentName','name'])||departmentLabels.find((name)=>normalizeText(name)===normalizeText(item.departmentName))||''}}).filter((item)=>item.value),...examMaster.branches.map((code)=>({id:code,value:code,label:code,code,department:getBranchesForDepartment(code)}))]
      const uniqueBranches=[...new Map(branchOptions.map((item)=>[normalizeText(item.value),item])).values()]
      const semesterLabels=merged(examMaster.semesters,semesterOptions(semesters))
      const profileData=profiles.map((profile)=>{const academic=profile.academic||{};return{...profile,academic,batch:academic.batchName||academic.batch||profile.batchName||profile.batch||'',section:academic.sectionName||(typeof academic.section==='string'?academic.section:academic.section?.name)||profile.section||''}})
      const batchLabels=merged([...examMaster.batches,...getExams().map((exam)=>exam.batch)],profileData.map((profile)=>profile.batch))
      const sectionLabels=merged(examMaster.sections,[...labels(sections,['sectionName','name','sectionCode','code']),...profileData.map((profile)=>profile.section),...getExams().map((exam)=>exam.section)])
      const resolve=(collection,id,keys)=>collection.find((item)=>String(item.id??item.departmentId??item.courseId??item.branchId??item.semesterId)===String(id))?optionName(collection.find((item)=>String(item.id??item.departmentId??item.courseId??item.branchId??item.semesterId)===String(id)),keys):''
      const subjectOptions=subjects.map((subject)=>{
        const branch=uniqueBranches.find((item)=>String(item.id)===String(subject.branchId)||normalizeText(item.value)===normalizeText(subject.branch)||normalizeText(item.label)===normalizeText(subject.branchName))
        const course=resolve(courses,subject.courseId,['courseName','name'])
        const department=resolve(departments,subject.departmentId,['departmentName','name'])
        return{...subject,code:subject.subjectCode||subject.code||'',name:subject.subjectName||subject.name||'',branch:branch?.value||subject.branch||subject.branchCode||'',semester:semesterOptions([subject.semesterName||subject.semester||subject.semesterNumber||subject.semesterId])[0]||'',course:course||subject.course||subject.courseName||'',department:department||subject.department||subject.departmentName||'',type:subject.subjectType||subject.type||'Theory',credits:subject.credits||0,faculty:subject.facultyName||subject.faculty||subject.facultyNames?.[0]||''}
      }).filter((item)=>item.code&&item.name)
      const allSubjects=[...new Map([...examMaster.subjects,...subjectOptions].map((item)=>[String(item.code||item.subjectCode),item])).values()]
      const facultyNames=merged(examMaster.faculty,facultyRows.map((person)=>typeof person==='string'?person:person.fullName||person.facultyName||person.name))
      if(facultyRows.length){setInvigilators(facultyNames);setFacultyDirectory(facultyRows.map((person,index)=>({id:String(person.facultyId||person.id||facultyNames[index]),name:person.fullName||person.facultyName||person.name,department:person.departmentName||person.department?.name||person.department||'',active:!['inactive','disabled'].includes(String(person.status||'active').toLowerCase()),eligible:person.invigilationEligible!==false,onLeave:!!person.onLeave,maxDailyAssignments:Number(person.maxDailyAssignments||person.maxInvigilationPerDay||2)})).filter((person)=>person.name))}
      setMasterOptions({academicYears:merged(examMaster.academicYears,labels(years,['academicYearName','name'])),departments:departmentLabels,courses:courseLabels,branches:uniqueBranches,batches:batchLabels,semesters:semesterLabels,sections:sectionLabels,subjects:allSubjects,faculty:facultyNames,sessions:getExamSessions().filter((item)=>item.enabled)})
    })
    return()=>{active=false}
  },[])
  useEffect(() => {
    if (screen !== 'halls') return undefined
    let active = true
    setMasterDataLoading(true)
    const loadRooms = () => roomService.getRooms().then((rooms) => rooms?.length ? rooms : roomService.getStoredRooms()).catch(() => roomService.getStoredRooms())
    Promise.all([loadRooms(), facultyService.list().catch(() => [])]).then(([rooms, faculty]) => {
      if (!active) return
      const liveHalls = (Array.isArray(rooms) ? rooms : []).filter((room) => !['inactive','maintenance','unavailable'].includes(String(room.status || '').toLowerCase())).map((room) => ({ id:String(room.id || room.classroomId || room.roomNumber), name:String(room.roomNumber || room.roomName || room.name || room.id), building:room.buildingBlock || room.building || 'Academic Block', floor:room.floor || 'Ground Floor', capacity:Number(room.capacity || 0), roomType:room.roomType || 'Lecture Hall' })).filter((room) => room.id && room.name && room.capacity > 0)
      if (liveHalls.length) replaceHalls(liveHalls)
      const names = (Array.isArray(faculty) ? faculty : []).map((person) => person.fullName || person.facultyName || person.name).filter(Boolean)
      if (names.length) {
        setInvigilators([...new Set(names)])
        setFacultyDirectory(faculty.map((person,index)=>({ id:String(person.facultyId||person.id||names[index]), name:person.fullName||person.facultyName||person.name, department:person.departmentName||person.department?.name||person.department||'', active:!['inactive','disabled'].includes(String(person.status||'active').toLowerCase()), eligible:person.invigilationEligible!==false, onLeave:!!person.onLeave||String(person.availability||'').toLowerCase()==='leave', maxDailyAssignments:Number(person.maxDailyAssignments||person.maxInvigilationPerDay||2) })))
      }
      reload()
    }).finally(() => { if (active) setMasterDataLoading(false) })
    return () => { active = false }
  }, [screen, masterDataRefresh])
  useEffect(() => { setPage(1) }, [search, filters])
  const student = screen === 'student' ? resolveStudent(students) : null
  const adminReview = screen === 'student' && getUserRole() === 'admin'
  const scopedExams = screen === 'student' ? (adminReview ? exams.filter((e) => e.status !== 'Draft') : exams.filter((e) => e.status === 'Published' && student && e.department === student.department && e.course === student.course && e.branch === student.branch && e.batch === student.batch && e.semester === student.semester && e.section === student.section)) : exams
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    return scopedExams.filter((e) => {
      const values = [e.id, e.examCode, e.subjectCode, e.subjectName, e.department, e.branch, e.batch, e.faculty]
      return (!term || values.some((v) => String(v || '').toLowerCase().includes(term)))
        && (!filters.academicYear || e.academicYear === filters.academicYear) && (!filters.examType || e.examType === filters.examType)
        && (!filters.department || e.department === filters.department) && (!filters.course || e.course === filters.course) && (!filters.branch || e.branch === filters.branch)
        && (!filters.batch || e.batch === filters.batch) && (!filters.semester || e.semester === filters.semester)
        && (!filters.section || e.section === filters.section) && (!filters.session || e.session === filters.session)
        && (!filters.status || getStatus(e) === filters.status || e.status === filters.status)
        && (!filters.from || e.examDate >= filters.from) && (!filters.to || e.examDate <= filters.to)
    })
  }, [scopedExams, search, filters])
  const sorted = [...filtered].sort((a, b) => String(a[sort.key] || '').localeCompare(String(b[sort.key] || '')) * (sort.direction === 'asc' ? 1 : -1))
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize)
  const metrics = { total: filtered.length, upcoming: filtered.filter((e) => ['Upcoming', 'Scheduled','Published'].includes(getStatus(e))).length, completed: filtered.filter((e) => getStatus(e) === 'Completed').length, pending: filtered.filter((e) => e.status === 'Draft').length, theory: filtered.filter((e) => e.subjectType === 'Theory').length, practical: filtered.filter((e) => e.subjectType === 'Practical').length }
  const selectFilter = (key, value) => setDraftFilters((prev) => ({ ...prev, [key]: value, ...(key === 'department' ? { course: '', branch: '' } : {}), ...(key === 'course' ? { branch: '' } : {}), ...(key === 'batch' ? { semester: '' } : {}) }))
  const resetFilters = () => { setDraftFilters(initialFilters); setFilters(initialFilters) }
  const goBack = () => { if (window.history.length > 1) navigate(-1); else navigate('/exam/timetable') }
  const doDelete = (id) => { deleteExam(id); setConfirm(null); setNotice('Examination schedule deleted.'); reload() }
  const updateStatus = (exam, status) => { try { updateExam(exam.id, { status }); setNotice(`Exam ${status.toLowerCase()}.`); setError(''); reload() } catch (e) { setError(e.message) } }

  return <DashboardLayout><main className="exam-module">
    <PageHeader title={routeInfo[screen][0]} subtitle={routeInfo[screen][1]} breadcrumb={['Examinations & Results', routeInfo[screen][0]]}>
      <div className="exm-header-actions"><button className="exm-button" onClick={goBack}><ArrowLeft size={16}/> Back</button>{['list','department','timetable'].includes(screen) && <button className="exm-button exm-button--primary" onClick={() => navigate('/exam/create')}><Plus size={16}/> Create Exam</button>}</div>
    </PageHeader>
    <nav className="exm-nav" aria-label="Exam management">{screen!=='student'&&<><Link className={screen==='timetable'?'active':''} to="/exam/timetable">Timetable</Link><Link className={screen==='list'?'active':''} to="/exam/schedules">Schedule list</Link><Link className={screen==='halls'?'active':''} to="/exam/hall-allocation">Hall allocation</Link></>}<Link className={screen==='student'?'active':''} to="/exam/student-schedule">Exam Schedule</Link></nav>
    {notice && <Notice onClose={() => setNotice('')}>{notice}</Notice>}{error && <div className="exm-error" role="alert"><AlertTriangle size={18}/>{error}<button onClick={() => setError('')}><X size={15}/></button></div>}
    {screen === 'create' && <CreateForm key={editingExam?.id || duplicateTemplate?.id || 'new'} exam={editingExam || duplicateTemplate} isEdit={!!editingExam} masterOptions={masterOptions} onSaved={(message) => { reload(); setNotice(message); setError(''); if (!editingExam) navigate('/exam/schedules', { state: { notice: message } }) }} onError={setError} onCancel={() => navigate('/exam/schedules')} />}
    {['list','department','timetable','student'].includes(screen) && <>
      {screen === 'student' && <ExamNoticeBoardHeader exams={scopedExams.filter((e) => e.status !== 'Draft')} student={student} adminReview={adminReview} />}
      {screen !== 'timetable' && screen !== 'student' && <Summary metrics={metrics} />}
      <FilterPanel filters={draftFilters} activeFilters={filters} masterOptions={masterOptions} open={filtersOpen} onToggle={() => setFiltersOpen((open) => !open)} onChange={selectFilter} onApply={() => { setFilters({ ...draftFilters }); setFiltersOpen(false) }} onReset={() => { resetFilters(); setFiltersOpen(false) }} search={search} onSearch={setSearch} showSearch={screen === 'list' || screen === 'student'} />
      {screen === 'timetable' && <div className="exm-toolbar"><div className="exm-view-toggle">{[['table','Table'],['calendar','Day-wise'],['semester','Semester-wise'],['department','Department-wise'],['batch','Batch-wise']].map(([key,label])=><button key={key} className={view===key?'active':''} onClick={()=>setView(key)}>{label}</button>)}</div><div className="exm-toolbar__actions"><button className="exm-button" onClick={()=>window.print()}><Printer size={15}/>Print timetable</button><button className="exm-button" onClick={()=>exportTimetable(sorted)}><ClipboardList size={15}/>Export timetable</button></div></div>}
      {screen === 'list' && <div className="exm-toolbar"><span>{filtered.length} schedules</span></div>}
      {screen === 'student' && <StudentSchedule exams={filtered} halls={halls} allocations={allocations} student={student} adminReview={adminReview} />}
      {screen === 'timetable' && view !== 'table' ? <DateGroups exams={filtered} groupBy={view} /> : screen !== 'student' && <ExamTable rows={pageRows} sortable={screen === 'list'} sort={sort} onSort={(key) => setSort((s) => ({ key, direction: s.key === key && s.direction === 'asc' ? 'desc' : 'asc' }))} onView={setDetails} onEdit={(id) => navigate(`/exam/create?edit=${id}`)} onDelete={(e) => setConfirm(e)} onStatus={updateStatus} mode={screen} halls={halls} />}
      {(['list','department'].includes(screen) || (screen === 'timetable' && view === 'table')) && <div className="exm-pagination"><span>Showing {sorted.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}</span><label>Rows <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}><option>10</option><option>25</option><option>50</option></select></label><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><b>{page} / {pages}</b><button disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div>}
      {screen !== 'student' && !filtered.length && <Empty />}
    </>}
    {screen === 'halls' && <HallManager exams={exams} halls={halls} allocations={allocations} students={students} faculty={invigilators} facultyDirectory={facultyDirectory} dataLoading={masterDataLoading} selectedExam={selectedExam} setSelectedExam={setSelectedExam} selectedHall={selectedHall} setSelectedHall={setSelectedHall} invigilator={invigilator} setInvigilator={setInvigilator} studentRange={studentRange} setStudentRange={setStudentRange} onError={setError} onNotice={setNotice} onReload={reload} onRefreshMasterData={() => setMasterDataRefresh((value) => value + 1)} />}
    {screen === 'configuration' && <ExamConfiguration departments={masterOptions.departments} onNotice={setNotice} onError={setError} />}
    {confirm && <div className="exm-overlay" role="presentation"><div className="exm-dialog" role="dialog" aria-modal="true"><h3>Delete examination schedule?</h3><p>Are you sure you want to delete this examination schedule?</p><div><button className="exm-button" onClick={() => setConfirm(null)}>Cancel</button><button className="exm-button exm-button--danger" onClick={() => doDelete(confirm.id)}>Delete</button></div></div></div>}
    {details && <div className="exm-overlay" role="presentation" onMouseDown={(e)=>{if(e.target===e.currentTarget)setDetails(null)}}><div className="exm-dialog exm-detail-dialog" role="dialog" aria-modal="true"><div className="exm-detail-heading"><div><small>{details.id}</small><h3>{details.subjectName}</h3></div><button className="exm-button" onClick={()=>setDetails(null)} aria-label="Close details"><X size={16}/></button></div><div className="exm-detail-grid">{[['Exam',details.examName],['Type',details.examType],['Department',details.department],['Course / Branch',`${details.course} · ${details.branch}`],['Batch / Semester',`${details.batch} · ${details.semester}`],['Section',details.section],['Subject Code',details.subjectCode],['Faculty',details.faculty],['Date',`${dateLabel(details.examDate)} · ${dayLabel(details.examDate)}`],['Time',`${timeLabel(details.startTime)} – ${timeLabel(details.endTime)} · ${details.session}`],['Hall',halls.find((h)=>h.id===details.hallId)?.name||'Not assigned'],['Status',getStatus(details)]].map(([label,value])=><div key={label}><small>{label}</small><strong>{value||'—'}</strong></div>)}</div><div className="exm-dialog__footer"><button className="exm-button" onClick={()=>setDetails(null)}>Close</button></div></div></div>}
  </main></DashboardLayout>
}

function Summary({ metrics }) {
  const cards = [['Total Exams', metrics.total, ClipboardList], ['Upcoming Exams', metrics.upcoming, CalendarDays], ['Completed Exams', metrics.completed, CheckCircle2], ['Pending Exams', metrics.pending, Clock3], ['Theory Exams', metrics.theory, ClipboardList], ['Practical Exams', metrics.practical, Building2]]
  return <div className="exm-summary">{cards.map(([title, value, Icon]) => <article className="exm-summary__card" key={title}><span><Icon size={19}/></span><div><small>{title}</small><strong>{value}</strong></div></article>)}</div>
}
function ExamConfiguration({ departments = examMaster.departments, onNotice, onError }) {
  const [types, setTypes] = useState(getExamTypes)
  const [rules, setRules] = useState(getInvigilationRules)
  const [sessions, setSessions] = useState(getExamSessions)
  const [newType, setNewType] = useState('')
  const [newDepartment, setNewDepartment] = useState('')
  const [newAllowed, setNewAllowed] = useState('')
  const saveTypes = (next) => { setTypes(next); try { saveExamTypes(next); onError(''); onNotice('Examination type settings saved.') } catch (error) { onError(error.message) } }
  const saveRules = (next) => { setRules(next); try { saveInvigilationRules(next); onError(''); onNotice('Invigilation department mappings saved.') } catch (error) { onError(error.message) } }
  const saveSessions = (next) => { setSessions(next); try { saveExamSessions(next); onError(''); onNotice('Exam session settings saved.') } catch (error) { onError(error.message) } }
  const addType = () => { const name=newType.trim(); if (!name || types.some((item)=>item.name.toLowerCase()===name.toLowerCase())) { onError('Enter a unique examination type.'); return } saveTypes([...types,{name,durationMinutes:180,maxMarks:100,subjectTypes:['Theory'],hallRequired:true,invigilatorRequired:true,examinerRequired:false,enabled:true,applicableSemesters:examMaster.semesters,studentCategories:['Regular']}]);setNewType('') }
  const addRule = () => { if (!newDepartment || !newAllowed || newDepartment===newAllowed) { onError('Choose two different departments for this mapping.'); return } const existing=rules.find((rule)=>rule.examDepartment===newDepartment); const next=existing?rules.map((rule)=>rule===existing?{...rule,allowedDepartments:[...new Set([...rule.allowedDepartments,newAllowed])]}:rule):[...rules,{examDepartment:newDepartment,allowedDepartments:[newAllowed],enabled:true}];saveRules(next);setNewAllowed('') }
  return <>
    <section className="exm-panel exm-config-panel"><div className="exm-form__heading"><div><h2>Examination types</h2><p>Manage enabled types and the default requirements applied when creating an exam.</p></div></div><div className="exm-config-add"><Field label="New examination type"><input value={newType} onChange={(e)=>setNewType(e.target.value)} placeholder="e.g. Special Assessment" /></Field><button className="exm-button exm-button--primary" onClick={addType}>Add type</button></div><div className="exm-config-table-wrap"><table className="exm-table"><thead><tr>{['Type','Duration (min)','Maximum marks','Subject types','Hall','Invigilator','Examiner','Enabled',''].map((label)=><th key={label}>{label}</th>)}</tr></thead><tbody>{types.map((type,index)=><tr key={`${type.name}-${index}`}><td><input aria-label="Type name" value={type.name} onChange={(e)=>setTypes((current)=>current.map((item,i)=>i===index?{...item,name:e.target.value}:item))}/></td><td><input type="number" min="1" value={type.durationMinutes} onChange={(e)=>setTypes((current)=>current.map((item,i)=>i===index?{...item,durationMinutes:Number(e.target.value)}:item))}/></td><td><input type="number" min="0" value={type.maxMarks} onChange={(e)=>setTypes((current)=>current.map((item,i)=>i===index?{...item,maxMarks:Number(e.target.value)}:item))}/></td><td><input value={(type.subjectTypes||[]).join(', ')} onChange={(e)=>setTypes((current)=>current.map((item,i)=>i===index?{...item,subjectTypes:e.target.value.split(',').map((value)=>value.trim()).filter(Boolean)}:item))}/></td>{['hallRequired','invigilatorRequired','examinerRequired','enabled'].map((key)=><td key={key}><input type="checkbox" checked={!!type[key]} onChange={(e)=>setTypes((current)=>current.map((item,i)=>i===index?{...item,[key]:e.target.checked}:item))}/></td>)}<td><button className="exm-button" onClick={()=>saveTypes(types)}>Save</button><button className="exm-link-danger" onClick={()=>saveTypes(types.filter((_,i)=>i!==index))}>Delete</button></td></tr>)}</tbody></table></div><div className="exm-config-footer"><button className="exm-button exm-button--primary" onClick={()=>saveTypes(types)}>Save all type settings</button></div></section>
    <section className="exm-panel exm-config-panel"><div className="exm-form__heading"><div><h2>Exam session times</h2><p>Session values populate the exam form and provide the default schedule duration.</p></div></div><div className="exm-config-table-wrap"><table className="exm-table"><thead><tr><th>Code</th><th>Session</th><th>Start</th><th>End</th><th>Enabled</th><th></th></tr></thead><tbody>{sessions.map((session,index)=><tr key={`${session.code}-${index}`}><td><input value={session.code} onChange={(e)=>setSessions((current)=>current.map((item,i)=>i===index?{...item,code:e.target.value}:item))}/></td><td><input value={session.label} onChange={(e)=>setSessions((current)=>current.map((item,i)=>i===index?{...item,label:e.target.value}:item))}/></td><td><input type="time" value={session.startTime} onChange={(e)=>setSessions((current)=>current.map((item,i)=>i===index?{...item,startTime:e.target.value}:item))}/></td><td><input type="time" value={session.endTime} onChange={(e)=>setSessions((current)=>current.map((item,i)=>i===index?{...item,endTime:e.target.value}:item))}/></td><td><input type="checkbox" checked={session.enabled} onChange={(e)=>setSessions((current)=>current.map((item,i)=>i===index?{...item,enabled:e.target.checked}:item))}/></td><td><button className="exm-button" onClick={()=>saveSessions(sessions)}>Save</button></td></tr>)}</tbody></table></div><div className="exm-config-footer"><button className="exm-button exm-button--primary" onClick={()=>saveSessions(sessions)}>Save session settings</button></div></section>
    <section className="exm-panel exm-config-panel"><div className="exm-form__heading"><div><h2>Invigilation department mapping</h2><p>Invigilators are selected from enabled departments outside the exam department.</p></div></div><div className="exm-config-add exm-config-add--mapping"><Field label="Exam department"><select value={newDepartment} onChange={(e)=>setNewDepartment(e.target.value)}><option value="">Choose department</option>{departments.map((name)=><option key={name}>{name}</option>)}</select></Field><Field label="Allowed invigilator department"><select value={newAllowed} onChange={(e)=>setNewAllowed(e.target.value)}><option value="">Choose department</option>{departments.filter((name)=>name!==newDepartment).map((name)=><option key={name}>{name}</option>)}</select></Field><button className="exm-button exm-button--primary" onClick={addRule}>Add mapping</button></div><div className="exm-config-rules">{rules.map((rule,index)=><article key={`${rule.examDepartment}-${index}`}><div><strong>{rule.examDepartment}</strong><span>Exam department</span></div><b aria-hidden="true">→</b><div className="exm-config-allowed">{rule.allowedDepartments.map((department)=><span key={department}>{department}<button aria-label={`Remove ${department}`} onClick={()=>saveRules(rules.map((item,i)=>i===index?{...item,allowedDepartments:item.allowedDepartments.filter((name)=>name!==department)}:item))}>×</button></span>)}{!rule.allowedDepartments.length&&<small>No eligible departments configured</small>}</div><label className="exm-config-enabled"><input type="checkbox" checked={!!rule.enabled} onChange={(e)=>saveRules(rules.map((item,i)=>i===index?{...item,enabled:e.target.checked}:item))}/>Enabled</label><button className="exm-link-danger" onClick={()=>saveRules(rules.filter((_,i)=>i!==index))}>Delete</button></article>)}</div></section>
  </>
}
function TimetableGenerator({ exams, masterOptions, onClose, onError, onSaved }) {
  const [scope,setScope]=useState({academicYear:'2026-2027',examType:'End Semester',department:'',branch:'',batch:'',semester:'',section:'',startDate:'',session:'FN'})
  const [rows,setRows]=useState([])
  const [skipped,setSkipped]=useState(0)
  const examType=getExamTypes().find((item)=>item.name===scope.examType)
  const session=getExamSessions().find((item)=>item.code===scope.session&&item.enabled)
  const choose=(key,value)=>setScope((current)=>({...current,[key]:value,...(key==='department'?{branch:''}:{})}))
  const generate=()=>{
    onError('')
    if(!scope.department||!scope.branch||!scope.batch||!scope.semester||!scope.section||!scope.startDate||!session){onError('Complete the department, branch, batch, semester, section, start date and session before generating.');return}
    const subjects=masterOptions.subjects.filter((subject)=>(!subject.branch||normalizeText(subject.branch)===normalizeText(scope.branch))&&(!subject.semester||normalizeText(subject.semester)===normalizeText(scope.semester))&&(!examType?.subjectTypes?.length||examType.subjectTypes.includes(subject.type)))
    if(!subjects.length){onError('No eligible subjects were found for this branch, semester and examination type.');return}
    const generated=[];let rejected=0;let dayOffset=0
    for(const subject of subjects){let candidate=null;let attempts=0
      while(!candidate&&attempts<60){const date=new Date(`${scope.startDate}T00:00:00`);date.setDate(date.getDate()+dayOffset++);attempts++;if([0,6].includes(date.getDay()))continue;const examDate=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;const startTime=session.startTime;const endTime=addMinutesToTime(startTime,examType?.durationMinutes||180);const hall=getAvailableHalls(examDate,scope.session).find((item)=>!examType?.hallRequired||item.capacity>0);const proposal={academicYear:scope.academicYear,examType:scope.examType,examName:`B.Tech ${scope.examType} Examination`,examCode:`${scope.examType.replace(/[^A-Za-z0-9]/g,'').toUpperCase()}-${scope.academicYear.slice(0,4)}`,department:scope.department,course:'B.Tech',branch:scope.branch,batch:scope.batch,semester:scope.semester,section:scope.section,subjectCode:subject.code,subjectName:subject.name,subjectType:subject.type,credits:subject.credits||0,faculty:subject.faculty||examMaster.faculty[0],examDate,startTime,endTime,session:scope.session,hallId:examType?.hallRequired?(hall?.id||''):'',maxMarks:examType?.maxMarks||100,status:'Draft'};if(examType?.hallRequired&&!hall){continue}const conflicts=validateExam(proposal,[...getExams(),...generated]);if(!conflicts.length)candidate=proposal
      }
      if(candidate)generated.push(candidate);else rejected++
    }
    setRows(generated);setSkipped(rejected)
    if(!generated.length)onError('No conflict-free timetable entries could be generated. Review existing schedules, hall availability and examination rules.')
  }
  const commit=(status)=>{if(!rows.length)return;try{rows.forEach((row)=>createExam({...row,status}));onSaved(`${rows.length} examination${rows.length===1?'':'s'} ${status==='Published'?'published':'saved as drafts'}${skipped?`; ${skipped} subject${skipped===1?'':'s'} skipped due to conflicts or unavailable halls`:''}.`)}catch(error){onError(error.message)}}
  const branches=masterOptions.branches.filter((item)=>!scope.department||!item.department||normalizeText(item.department)===normalizeText(scope.department)).map((item)=>item.value)
  return <section className="exm-panel exm-generator"><div className="exm-form__heading"><div><h2>Generate timetable</h2><p>Creates weekday schedules as drafts. Review the generated dates before publishing.</p></div><button className="exm-button" onClick={onClose} aria-label="Close timetable generator">Close</button></div><div className="exm-form-grid"><Field label="Academic Year"><select value={scope.academicYear} onChange={(e)=>choose('academicYear',e.target.value)}>{masterOptions.academicYears.map((year)=><option key={year}>{year}</option>)}</select></Field><Field label="Exam Type"><select value={scope.examType} onChange={(e)=>choose('examType',e.target.value)}>{getExamTypes().filter((type)=>type.enabled).map((type)=><option key={type.name}>{type.name}</option>)}</select></Field><Field label="Department"><select value={scope.department} onChange={(e)=>choose('department',e.target.value)}><option value="">Select department</option>{masterOptions.departments.map((name)=><option key={name}>{name}</option>)}</select></Field><Field label="Branch"><select value={scope.branch} onChange={(e)=>choose('branch',e.target.value)}><option value="">Select branch</option>{branches.map((branch)=><option key={branch}>{branch}</option>)}</select></Field><Field label="Batch"><select value={scope.batch} onChange={(e)=>choose('batch',e.target.value)}><option value="">Select batch</option>{masterOptions.batches.map((batch)=><option key={batch}>{batch}</option>)}</select></Field><Field label="Semester"><select value={scope.semester} onChange={(e)=>choose('semester',e.target.value)}><option value="">Select semester</option>{masterOptions.semesters.filter((semester)=>!examType?.applicableSemesters?.length||examType.applicableSemesters.includes(semester)).map((semester)=><option key={semester}>{semester}</option>)}</select></Field><Field label="Section"><select value={scope.section} onChange={(e)=>choose('section',e.target.value)}><option value="">Select section</option>{masterOptions.sections.map((section)=><option key={section}>{section}</option>)}</select></Field><Field label="Start date"><input type="date" min={today()} value={scope.startDate} onChange={(e)=>choose('startDate',e.target.value)}/></Field><Field label="Session"><select value={scope.session} onChange={(e)=>choose('session',e.target.value)}>{masterOptions.sessions.map((item)=><option key={item.code} value={item.code}>{item.code} - {item.label}</option>)}</select></Field></div><div className="exm-toolbar__actions"><button className="exm-button exm-button--primary" onClick={generate}>Generate timetable</button></div>{rows.length>0&&<><div className="exm-generator-summary">{rows.length} schedules ready for review {skipped>0&&<span> · {skipped} subjects skipped</span>}</div><div className="exm-config-table-wrap"><table className="exm-table"><thead><tr>{['Date','Day','Session','Subject','Type','Hall','Status'].map((label)=><th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((row)=><tr key={`${row.subjectCode}-${row.examDate}`}><td>{dateLabel(row.examDate)}</td><td>{dayLabel(row.examDate)}</td><td>{row.session} · {timeLabel(row.startTime)} - {timeLabel(row.endTime)}</td><td>{row.subjectCode} · {row.subjectName}</td><td>{row.subjectType}</td><td>{getHalls().find((hall)=>hall.id===row.hallId)?.name||'Not required'}</td><td><Status value="Draft"/></td></tr>)}</tbody></table></div><div className="exm-generator-actions"><button className="exm-button" onClick={()=>commit('Draft')}>Save as drafts</button><button className="exm-button exm-button--primary" onClick={()=>commit('Published')}>Approve &amp; publish</button></div></>}</section>
}
function FilterPanel({ filters, activeFilters, masterOptions, open, onToggle, onChange, onApply, onReset, search, onSearch, showSearch }) {
  const activeCount = Object.values(activeFilters).filter(Boolean).length
  return <div className="exm-filter-control"><div className="exm-filter-toolbar">{showSearch && <label className="exm-search"><Search size={18}/><input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search ID, subject, department, branch, batch or faculty" /></label>}<div className="exm-filter-toolbar__actions"><button className={`exm-button exm-filter-trigger ${open ? 'is-open' : ''}`} aria-expanded={open} onClick={onToggle}><FilterIcon size={18}/> Filters{activeCount > 0 && <span className="exm-filter-count">{activeCount}</span>}<ChevronDown size={17}/></button></div></div>{open && <section className="exm-panel exm-filters"><div className="exm-filter-grid">
    <Field label="Academic Year"><select value={filters.academicYear} onChange={(e) => onChange('academicYear', e.target.value)}><option value="">All academic years</option>{masterOptions.academicYears.map((x) => <option key={x}>{x}</option>)}</select></Field>
    <Field label="Exam Type"><select value={filters.examType} onChange={(e) => onChange('examType', e.target.value)}><option value="">All exam types</option>{getExamTypes().filter((type) => type.enabled).map((type) => <option key={type.name}>{type.name}</option>)}</select></Field>
    <Field label="Department"><select value={filters.department} onChange={(e) => onChange('department', e.target.value)}><option value="">All departments</option>{masterOptions.departments.map((x) => <option key={x}>{x}</option>)}</select></Field>
    <Field label="Course"><select value={filters.course} onChange={(e) => onChange('course', e.target.value)}><option value="">All courses</option>{masterOptions.courses.map((x) => <option key={x}>{x}</option>)}</select></Field>
    <Field label="Branch"><select value={filters.branch} onChange={(e) => onChange('branch', e.target.value)}><option value="">All branches</option>{masterOptions.branches.filter((item) => !filters.department || !item.department || normalizeText(item.department)===normalizeText(filters.department)).map((item) => <option key={item.id||item.value} value={item.value}>{item.label}</option>)}</select></Field>
    <Field label="Batch"><select value={filters.batch} onChange={(e) => onChange('batch', e.target.value)}><option value="">All batches</option>{masterOptions.batches.map((x) => <option key={x}>{x}</option>)}</select></Field>
    <Field label="Semester"><select value={filters.semester} onChange={(e) => onChange('semester', e.target.value)}><option value="">All semesters</option>{masterOptions.semesters.map((x) => <option key={x}>{x}</option>)}</select></Field>
    <Field label="Section"><select value={filters.section} onChange={(e) => onChange('section', e.target.value)}><option value="">All sections</option>{masterOptions.sections.map((x) => <option key={x}>{x}</option>)}</select></Field>
    <Field label="Session"><select value={filters.session} onChange={(e) => onChange('session', e.target.value)}><option value="">All sessions</option>{masterOptions.sessions.map((item)=><option key={item.code} value={item.code}>{item.code} - {item.label}</option>)}</select></Field>
    <Field label="Status"><select value={filters.status} onChange={(e) => onChange('status', e.target.value)}><option value="">All statuses</option>{['Upcoming','Ongoing','Completed','Cancelled','Draft'].map((x) => <option key={x}>{x}</option>)}</select></Field>
    <Field label="From"><input type="date" value={filters.from} onChange={(e) => onChange('from', e.target.value)} /></Field><Field label="To"><input type="date" value={filters.to} onChange={(e) => onChange('to', e.target.value)} /></Field>
    <div className="exm-filter-actions"><button className="exm-button exm-button--primary" onClick={onApply}>Apply filters</button><button className="exm-button" onClick={onReset}>Reset</button></div>
  </div></section>}</div>
}
function ExamTable({ rows, sortable, sort, onSort, onView, onEdit, onDelete, onStatus, mode, halls }) {
  const headers = mode === 'timetable' ? [['examDate','Date'],['day','Day'],['session','Session'],['time','Time'],['subjectCode','Subject Code'],['subjectName','Subject Name'],['subjectType','Type'],['credits','Credits'],['examType','Exam Type'],['hallId','Hall'],['invigilator','Invigilator'],['status','Status']] : mode === 'department' ? [['id','Exam ID'],['examDate','Exam Date'],['day','Day'],['session','Session'],['subjectCode','Subject Code'],['subjectName','Subject'],['course','Course'],['branch','Branch'],['batch','Batch'],['semester','Semester'],['section','Section'],['invigilator','Invigilator'],['examType','Exam Type'],['status','Status']] : [['index','#'],['id','Exam ID'],['examName','Exam Name'],['examType','Exam Type'],['department','Department'],['course','Course'],['branch','Branch'],['batch','Batch'],['semester','Sem'],['subjectCode','Subject Code'],['subjectName','Subject'],['examDate','Exam Date'],['session','Session'],['startTime','Start'],['endTime','End'],['hallId','Hall'],['status','Status']]
  const val = (e, k, i) => k === 'index' ? i + 1 : k === 'day' ? dayLabel(e.examDate) : k === 'time' ? `${timeLabel(e.startTime)} - ${timeLabel(e.endTime)}` : k === 'examDate' ? dateLabel(e.examDate) : k === 'startTime' || k === 'endTime' ? timeLabel(e[k]) : k === 'hallId' ? halls.find((h) => h.id === e.hallId)?.name || e.hallId || '—' : k === 'invigilator' ? getAssignedInvigilator(e) : k === 'status' ? <Status value={getStatus(e)}/> : e[k] || '—'
  return <div className="exm-panel exm-table-wrap"><table className="exm-table"><thead><tr>{headers.map(([key,label]) => <th key={key} onClick={() => sortable && onSort(key)} className={sortable ? 'is-sortable' : ''}>{label}{sortable && sort.key === key ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}</th>)}{mode !== 'timetable' && <th>Actions</th>}</tr></thead><tbody>{rows.map((e,i) => <tr key={e.id}>{headers.map(([k]) => <td key={k}>{val(e,k,i)}</td>)}{mode !== 'timetable' && <td><div className="exm-row-actions"><button title="View" onClick={() => onView(e)}>View</button><button title="Edit" onClick={() => onEdit(e.id)}>Edit</button>{e.status !== 'Published' && e.status !== 'Cancelled' ? <button onClick={() => onStatus(e,'Published')}>Publish</button> : <button onClick={() => onStatus(e,'Cancelled')}>Cancel</button>}<button className="danger" onClick={() => onDelete(e)}>Delete</button></div></td>}</tr>)}</tbody></table>{!rows.length && <Empty />}</div>
}
function DateGroups({ exams, groupBy='calendar' }) { const keyFor=(exam)=>groupBy==='calendar'?exam.examDate:exam[groupBy]||'Unassigned';const groups=exams.reduce((result,exam)=>((result[keyFor(exam)]||=[]).push(exam),result),{});return <div className="exm-date-groups">{Object.keys(groups).sort().map((key)=><section className="exm-panel exm-date-group" key={key}><div className="exm-date-group__title"><CalendarDays size={18}/><div><strong>{groupBy==='calendar'?dayLabel(key):key}</strong><span>{groupBy==='calendar'?dateLabel(key):`${groups[key].length} scheduled examinations`}</span></div></div>{groups[key].map((exam)=><article key={exam.id}><time>{dateLabel(exam.examDate)} · {timeLabel(exam.startTime)} – {timeLabel(exam.endTime)}</time><div><strong>{exam.subjectCode} · {exam.subjectName}</strong><span>{exam.examType} · {exam.session} · {exam.hallId||'Hall pending'}</span></div><Status value={getStatus(exam)}/></article>)}</section>)}{!exams.length&&<Empty/>}</div> }

function CreateForm({ exam, isEdit, masterOptions, onSaved, onError, onCancel }) {
  const [form, setForm] = useState(() => ({ academicYear:'2026-2027', examType:'End Semester', examName:'', examCode:'', department:'', course:'B.Tech', branch:'', batch:'', semester:'', section:'', subjectCode:'', subjectName:'', subjectType:'Theory', credits:'', faculty:'', invigilator:'', maxMarks:100, hallRequired:true, invigilatorRequired:true, examinerRequired:false, examDate:'', startTime:'09:00', endTime:'12:00', session:'FN', hallId:'', rollNoFrom:'', rollNoTo:'', status:'Scheduled', ...(exam ? { ...exam, ...(isEdit ? {} : { id:undefined, examDate:'', hallId:'', status:'Scheduled' }) } : {}) }))
  const [saved, setSaved] = useState(false)
  const set = (key, value) => setForm((prev) => {
    const next={...prev,[key]:value,...(key==='branch'||key==='semester'?{subjectCode:'',subjectName:'',credits:''}:{})}
    if(key==='examType'){const config=getExamTypes().find((type)=>type.name===value);if(config){next.maxMarks=config.maxMarks;next.hallRequired=config.hallRequired;next.invigilatorRequired=config.invigilatorRequired;next.examinerRequired=config.examinerRequired;next.endTime=addMinutesToTime(prev.startTime,config.durationMinutes);if(config.subjectTypes?.length&&!config.subjectTypes.includes(prev.subjectType)){next.subjectCode='';next.subjectName='';next.subjectType=config.subjectTypes[0]}}}
    if(key==='session'){const session=getExamSessions().find((item)=>item.code===value);if(session){next.startTime=session.startTime;next.endTime=session.endTime}}
    if(key==='startTime'){const config=getExamTypes().find((type)=>type.name===prev.examType);if(config?.durationMinutes)next.endTime=addMinutesToTime(value,config.durationMinutes)}
    return next
  })
  const examTypeConfig = getExamTypes().find((type)=>type.name===form.examType)
  // Subject choices are scoped to the selected branch and semester. Exam type
  // requirements must not hide otherwise valid subjects from this picker.
  const subjects = [...new Map([
    ...getSubjects(form.branch, form.semester),
    ...masterOptions.subjects.filter((subject)=>(!subject.branch||normalizeText(subject.branch)===normalizeText(form.branch))&&(!subject.semester||normalizeText(subject.semester)===normalizeText(form.semester)))
  ].map((subject)=>[String(subject.code||subject.subjectCode),subject])).values()]
  const branches = masterOptions.branches.filter((item)=>!form.department||!item.department||normalizeText(item.department)===normalizeText(form.department))
  const available = getAvailableHalls(form.examDate, form.session, exam?.id)
  const selectedHall = getHalls().find((h) => h.id === form.hallId)
  const duration = form.startTime && form.endTime ? Math.max(0, (new Date(`2000-01-01T${form.endTime}`)-new Date(`2000-01-01T${form.startTime}`))/60000) : 0
  const handleSubmit = (e, status) => {
    e.preventDefault(); onError('')
    if (!!form.rollNoFrom !== !!form.rollNoTo) { onError('Enter both the first and last roll number, or leave both blank.'); return }
    const rollRange=form.rollNoFrom&&form.rollNoTo?parseRollNumberRange(form.rollNoFrom,form.rollNoTo):null
    if (form.rollNoFrom && !rollRange) { onError('Use a roll number range with the same prefix and numeric endings, such as 23CS001 to 23CS060.'); return }
    const selectedHallRecord=getHalls().find((hall)=>hall.id===form.hallId)
    if (form.hallId && !selectedHallRecord) { onError('Select a valid examination hall.'); return }
    if (form.hallId && !getAvailableHalls(form.examDate,form.session,exam?.id).some((hall)=>hall.id===form.hallId)) { onError('The selected hall is already assigned during this date and session. Choose another hall.'); return }
    if (rollRange && form.hallId && rollRange.count > Number(selectedHallRecord?.capacity||0)) { onError(`${selectedHallRecord.name} has ${selectedHallRecord.capacity} seats. Reduce the roll number range or use Hall Allocation to distribute students across halls.`); return }
    try {
      const payload={...form,credits:Number(form.credits)||0,maxMarks:Number(form.maxMarks)||0,status}
      const existingAllocations=isEdit?getHallAllocations().filter((allocation)=>allocation.examId===exam.id):[]
      const rosterAllocations=existingAllocations.filter((allocation)=>(allocation.studentIds||[]).length>0)
      if (isEdit && rosterAllocations.length && form.hallId!==exam.hallId) { onError('This exam already has student allocations. Update or remove those allocations from Hall Allocation before changing its scheduled hall.'); return }
      const savedExam=isEdit?updateExam(exam.id,payload):createExam(payload)
      const rangeAllocation=existingAllocations.find((allocation)=>allocation.hallId===form.hallId&&!(allocation.studentIds||[]).length)
      if (rollRange && form.hallId && !rosterAllocations.length) {
        const allocationData={examId:savedExam.id,examDate:form.examDate,session:form.session,hallId:form.hallId,studentCount:rollRange.count,studentIds:[],studentFrom:form.rollNoFrom,studentTo:form.rollNoTo,invigilator:form.invigilator||''}
        if (rangeAllocation) updateHallAllocation(rangeAllocation.id,allocationData)
        else { existingAllocations.filter((allocation)=>(allocation.studentIds||[]).length===0).forEach((allocation)=>deleteHallAllocation(allocation.id));createHallAllocation(allocationData) }
      } else if (!rollRange) existingAllocations.filter((allocation)=>(allocation.studentIds||[]).length===0).forEach((allocation)=>deleteHallAllocation(allocation.id))
      if (isEdit && rosterAllocations.length && form.invigilator!==exam.invigilator) rosterAllocations.forEach((allocation)=>updateHallAllocation(allocation.id,{invigilator:form.invigilator||''}))
      setSaved(true)
      onSaved(isEdit ? 'Exam timetable and hall allocation updated successfully.' : status === 'Draft' ? 'Exam timetable and hall allocation saved as draft.' : 'Exam timetable and hall allocation created successfully.')
    } catch (err) { onError(err.message) }
  }
  return <form className="exm-panel exm-form" onSubmit={(e) => handleSubmit(e, 'Scheduled')}>
    <div className="exm-form__heading"><div><h2>{isEdit ? `Edit ${exam.id}` : 'Examination details'}</h2><p>Fields marked with * are required. Conflicts are checked before saving.</p></div><Status value={form.status}/></div>
    <fieldset><legend>Examination details</legend><div className="exm-form-grid">
      <Field label="Academic Year" required><select value={form.academicYear} onChange={(e)=>set('academicYear',e.target.value)}>{masterOptions.academicYears.map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Exam Type" required><select value={form.examType} onChange={(e)=>set('examType',e.target.value)}>{getExamTypes().filter((type)=>type.enabled).map((type)=><option key={type.name}>{type.name}</option>)}</select></Field>
      <Field label="Exam Name" required><input value={form.examName} onChange={(e)=>set('examName',e.target.value)} placeholder="e.g. B.Tech End Semester Examination" required /></Field>
      <Field label="Exam Code"><input value={form.examCode} onChange={(e)=>set('examCode',e.target.value)} placeholder="e.g. ESE-2026-01" /></Field>
      <Field label="Department" required><select required value={form.department} onChange={(e)=>{set('department',e.target.value);set('branch','')}}><option value="">Select department</option>{masterOptions.departments.map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Course" required><select value={form.course} onChange={(e)=>set('course',e.target.value)}>{masterOptions.courses.map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Branch" required><select required value={form.branch} onChange={(e)=>set('branch',e.target.value)}><option value="">Select branch</option>{branches.map(item=><option key={item.id||item.value} value={item.value}>{item.label}</option>)}</select></Field>
      <Field label="Batch" required><select required value={form.batch} onChange={(e)=>set('batch',e.target.value)}><option value="">Select batch</option>{masterOptions.batches.map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Semester" required><select required value={form.semester} onChange={(e)=>set('semester',e.target.value)}><option value="">Select semester</option>{masterOptions.semesters.filter((semester)=>!examTypeConfig?.applicableSemesters?.length||examTypeConfig.applicableSemesters.includes(semester)).map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Section" required><select required value={form.section} onChange={(e)=>set('section',e.target.value)}><option value="">Select section</option>{masterOptions.sections.map(x=><option key={x}>{x}</option>)}</select></Field>
    </div></fieldset>
    <fieldset><legend>Subject details</legend><div className="exm-form-grid">
      <Field label="Subject" required><select required disabled={!form.branch||!form.semester||!subjects.length} value={form.subjectCode} onChange={(e)=>{const s=subjects.find(x=>x.code===e.target.value);setForm((p)=>({...p,subjectCode:s?.code||'',subjectName:s?.name||'',subjectType:s?.type||'Theory',credits:s?.credits||'',faculty:s?.faculty||p.faculty}))}}><option value="">{!form.branch||!form.semester?'Select branch and semester first':subjects.length?'Select a subject':'No subjects available for this branch and semester'}</option>{subjects.map(s=><option key={s.code} value={s.code}>{s.code} · {s.name}</option>)}</select></Field>
      <Field label="Subject Name" required><input required value={form.subjectName} onChange={(e)=>set('subjectName',e.target.value)} /></Field>
      <Field label="Subject Type"><select value={form.subjectType} onChange={(e)=>set('subjectType',e.target.value)}>{examMaster.subjectTypes.map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Credits"><input type="number" min="0" step="1" value={form.credits} onChange={(e)=>set('credits',e.target.value)} /></Field>
      <Field label="Faculty" required><select required value={form.faculty} onChange={(e)=>set('faculty',e.target.value)}><option value="">Select faculty</option>{masterOptions.faculty.map(x=><option key={x}>{x}</option>)}</select></Field>
    </div></fieldset>
    <fieldset><legend>Exam schedule</legend><div className="exm-form-grid">
      <Field label="Exam Date" required><input required type="date" min={today()} value={form.examDate} onChange={(e)=>set('examDate',e.target.value)} /></Field>
      <Field label="Day"><input readOnly value={dayLabel(form.examDate)} placeholder="Calculated from date" /></Field>
      <Field label="Start Time" required><input required type="time" value={form.startTime} onChange={(e)=>set('startTime',e.target.value)} /></Field>
      <Field label="End Time" required><input required type="time" min={form.startTime} value={form.endTime} onChange={(e)=>set('endTime',e.target.value)} /></Field>
      <Field label="Duration"><input readOnly value={duration ? `${Math.floor(duration/60)}h ${duration%60}m` : ''} /></Field>
      <Field label="Maximum Marks"><input type="number" min="0" value={form.maxMarks} onChange={(e)=>set('maxMarks',e.target.value)}/></Field>
      <Field label="Roll No. From"><input value={form.rollNoFrom} onChange={(e)=>set('rollNoFrom',e.target.value.trim())} placeholder="e.g. 23CS001" /></Field>
      <Field label="Roll No. To"><input value={form.rollNoTo} onChange={(e)=>set('rollNoTo',e.target.value.trim())} placeholder="e.g. 23CS060" /></Field>
      <Field label="Session" required><select value={form.session} onChange={(e)=>set('session',e.target.value)}>{getExamSessions().filter((item)=>item.enabled).map((item)=><option key={item.code} value={item.code}>{item.code} - {item.label}</option>)}</select></Field>
      <Field label="Hall required"><input type="checkbox" checked={!!form.hallRequired} onChange={(e)=>set('hallRequired',e.target.checked)}/></Field>
      <Field label="Invigilator required"><input type="checkbox" checked={!!form.invigilatorRequired} onChange={(e)=>set('invigilatorRequired',e.target.checked)}/></Field>
      <Field label="Examiner required"><input type="checkbox" checked={!!form.examinerRequired} onChange={(e)=>set('examinerRequired',e.target.checked)}/></Field>
    </div></fieldset>
    <fieldset><legend>Examination hall</legend><div className="exm-form-grid">
      <Field label="Hall" required={!!examTypeConfig?.hallRequired}><select required={!!examTypeConfig?.hallRequired} value={form.hallId} onChange={(e)=>set('hallId',e.target.value)}><option value="">Select available hall</option>{available.map(h=><option key={h.id} value={h.id}>{h.name} · {h.building}</option>)}</select></Field>
      <Field label="Invigilator"><select value={form.invigilator||''} onChange={(e)=>set('invigilator',e.target.value)}><option value="">Select invigilator</option>{masterOptions.faculty.map(name=><option key={name}>{name}</option>)}</select></Field>
      <Field label="Building"><input readOnly value={selectedHall?.building||''}/></Field><Field label="Floor"><input readOnly value={selectedHall?.floor||''}/></Field><Field label="Capacity"><input readOnly value={selectedHall?.capacity||''}/></Field>
    </div>{form.examDate && form.session && !available.length && <p className="exm-inline-warning"><AlertTriangle size={16}/> No halls are available for this date and session.</p>}</fieldset>
    <div className="exm-form__actions"><button type="button" className="exm-button" onClick={()=>setForm({academicYear:'2026-2027',examType:'End Semester',examName:'',examCode:'',department:'',course:'B.Tech',branch:'',batch:'',semester:'',section:'',subjectCode:'',subjectName:'',subjectType:'Theory',credits:'',faculty:'',maxMarks:100,hallRequired:true,invigilatorRequired:true,examinerRequired:false,examDate:'',startTime:'09:00',endTime:'12:00',session:'FN',hallId:'',rollNoFrom:'',rollNoTo:'',status:'Scheduled'})}>Reset</button><button type="button" className="exm-button" onClick={onCancel}>Cancel</button><button type="button" className="exm-button" onClick={(e)=>handleSubmit(e,'Draft')}>Save Draft</button><button type="submit" className="exm-button exm-button--primary" disabled={saved}>{isEdit?'Update Schedule':'Create Schedule'}</button></div>
  </form>
}
function resolveStudent(students) {
  const auth = getAuthStorage()
  const id = auth?.getItem('btech-user-id') || ''
  const exact = students.find((s) => [s.id, s.registerNumber].some((v) => String(v) === String(id)))
  return exact || { id, name: auth?.getItem('btech-user-name') || 'Student', registerNumber: id || '—', department:'', course:'', branch:'', batch:'', semester:'', section:'' }
}
function ExamNoticeBoardHeader({ exams, student, adminReview }) {
  const nextExam = exams.filter((e) => ['Upcoming','Published'].includes(getStatus(e))).sort((a,b) => a.examDate.localeCompare(b.examDate))[0]
  return <section className="exm-notice-board__header"><div className="exm-notice-board__identity"><div className="exm-notice-board__seal"><Building2 size={24}/></div><div><span>EXAMINATION CELL · {adminReview ? 'ADMIN REVIEW' : 'STUDENT COPY'}</span><h2>Examination Notice Board</h2><p>{adminReview ? 'Published timetable with hall and seating review' : 'Your published examination timetable and hall allocation'}</p></div></div><div className="exm-notice-board__meta"><div><small>Academic Year</small><strong>{nextExam?.academicYear || exams[0]?.academicYear || '—'}</strong></div><div><small>Examinations</small><strong>{exams.length}</strong></div><button className="exm-button exm-button--primary exm-notice-print" onClick={() => window.print()}><Printer size={16}/> Print</button></div>{!adminReview && <div className="exm-notice-board__student"><span><small>Student</small><strong>{student.name}</strong></span><span><small>Roll / Register No.</small><strong>{student.registerNumber}</strong></span><span><small>Course · Branch</small><strong>{student.course || '—'}{student.branch ? ` · ${student.branch}` : ''}</strong></span><span><small>Batch · Semester · Section</small><strong>{student.batch || '—'} · {student.semester || '—'} · {student.section || '—'}</strong></span></div>}</section>
}
function RollNumberCell({ exam, allocation, adminReview, student, ownSeat }) {
  const allocationRange = allocation?.studentFrom && allocation?.studentTo ? `${allocation.studentFrom} – ${allocation.studentTo}` : ''
  const examRange = exam.rollNoFrom && exam.rollNoTo ? `${exam.rollNoFrom} – ${exam.rollNoTo}` : ''
  if (allocationRange) return <td><strong>{allocationRange}</strong><span>Allocated roll range</span></td>
  if (examRange) return <td><strong>{examRange}</strong><span>Exam roll range</span></td>
  return <td><strong>{adminReview ? 'Pending' : student.registerNumber}</strong><span>{adminReview ? 'Assigned roll range' : ownSeat ? `Seat ${ownSeat}` : 'Seat assignment pending'}</span></td>
}
function StudentSchedule({ exams, halls, allocations, student, adminReview }) {
  const [status, setStatus] = useState('All')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const rows = exams.filter((e)=>status==='All'||(status==='Upcoming'&&['Upcoming','Published'].includes(getStatus(e)))||(status==='Completed'&&getStatus(e)==='Completed')||(status==='Cancelled'&&getStatus(e)==='Cancelled')).sort((a,b)=>a.examDate.localeCompare(b.examDate))
  const entries = rows.flatMap((exam) => {
    const matches = allocations.filter((a) => a.examId === exam.id && (!adminReview ? (a.studentIds || []).includes(student.id) : true))
    const allocationRows = matches.length ? matches : [null]
    return allocationRows.map((allocation) => {
      const hall = halls.find((h) => h.id === (allocation?.hallId || exam.hallId))
      const studentIndex = allocation && !adminReview ? (allocation.studentIds || []).indexOf(student.id) : -1
      const ownSeat = studentIndex >= 0 ? studentIndex + 1 : null
      return { exam, allocation, hall, ownSeat }
    })
  })
  useEffect(() => setPage(1), [status, entries.length])
  const pages = Math.max(1, Math.ceil(entries.length / pageSize))
  const pageEntries = entries.slice((page - 1) * pageSize, page * pageSize)
  return <section className="exm-notice-board exm-panel"><div className="exm-student-toolbar"><div>{['All','Upcoming','Completed','Cancelled'].map((s)=><button key={s} className={status===s?'active':''} onClick={()=>{setStatus(s);setPage(1)}}>{s}</button>)}</div><span>{entries.length} timetable {entries.length===1?'entry':'entries'}</span></div><div className="exm-notice-table-wrap"><table className="exm-notice-table"><thead><tr>{['Date & Day','Session / Time','Subject','Section','Hall','Building / Floor','Seats','Roll No. / Range','Invigilator','Status'].map((x)=><th key={x}>{x}</th>)}</tr></thead><tbody>{pageEntries.map(({exam,allocation,hall,ownSeat},i)=><tr key={`${exam.id}-${allocation?.id||i}`}><td><strong>{dateLabel(exam.examDate)}</strong><span>{dayLabel(exam.examDate)}</span></td><td><strong>{exam.session}</strong><span>{timeLabel(exam.startTime)} – {timeLabel(exam.endTime)}</span></td><td><strong>{exam.subjectCode}</strong><span>{exam.subjectName}</span><small>{exam.examType}</small></td><td>{exam.section || '—'}</td><td><strong>{hall?.name || 'To be assigned'}</strong><span>{exam.hallId && hall ? `Hall ${hall.name}` : 'Hall allocation pending'}</span></td><td><strong>{hall?.building || '—'}</strong><span>{hall ? `Block / Floor ${hall.floor}` : '—'}</span></td><td><strong>{allocation ? `${allocation.studentCount} / ${hall?.capacity || '—'}` : `— / ${hall?.capacity || '—'}`}</strong><span>{allocation ? 'Students / capacity' : 'Allocated / capacity'}</span></td><RollNumberCell exam={exam} allocation={allocation} adminReview={adminReview} student={student} ownSeat={ownSeat}/><td>{getAssignedInvigilator(exam, allocation?.hallId || hall?.id)}</td><td><Status value={getStatus(exam)}/></td></tr>)}</tbody></table>{!entries.length&&<Empty>No published examination schedules match this selection.</Empty>}</div>{entries.length>0&&<div className="exm-pagination"><span>Showing {(page-1)*pageSize+1}–{Math.min(page*pageSize,entries.length)} of {entries.length}</span><label>Rows <select value={pageSize} onChange={(e)=>{setPageSize(Number(e.target.value));setPage(1)}}><option>10</option><option>25</option><option>50</option></select></label><button disabled={page<=1} onClick={()=>setPage(page-1)}>Previous</button><b>{page} / {pages}</b><button disabled={page>=pages} onClick={()=>setPage(page+1)}>Next</button></div>}</section>
}
function HallManager({ exams, halls, allocations, students, faculty, facultyDirectory, dataLoading, selectedExam, setSelectedExam, selectedHall, setSelectedHall, invigilator, setInvigilator, studentRange, setStudentRange, onError, onNotice, onReload, onRefreshMasterData }) {
  const [hallPage, setHallPage] = useState(1)
  const [hallPageSize, setHallPageSize] = useState(10)
  const [activeHall, setActiveHall] = useState(null)
  const [pendingHallDelete, setPendingHallDelete] = useState(null)
  const [hallDialogMode, setHallDialogMode] = useState('view')
  const [hallForm, setHallForm] = useState({ studentFrom:'', studentTo:'', invigilator:'' })
  const [remoteStudents, setRemoteStudents] = useState(null)
  const [rosterLoading, setRosterLoading] = useState(false)
  const [rosterRefresh, setRosterRefresh] = useState(0)
  const [generatedInvigilations, setGeneratedInvigilations] = useState(() => getInvigilations().filter((item)=>item.examId===selectedExam))
  const exam = exams.find((e)=>e.id===selectedExam)
  const rollRange = parseRollNumberRange(exam?.rollNoFrom,exam?.rollNoTo)
  const fallbackStudents = exam ? students.filter((s)=>s.department===exam.department&&s.course===exam.course&&s.branch===exam.branch&&s.batch===exam.batch&&s.semester===exam.semester&&s.section===exam.section) : []
  const examStudents = remoteStudents || fallbackStudents
  const studentLimit = examStudents.length || rollRange?.count || 0
  useEffect(() => {
    if (!exam) { setRemoteStudents(null); setRosterLoading(false); return undefined }
    let active = true
    setRemoteStudents(null)
    setRosterLoading(true)
    studentService.getStudentsByScope({ academicYear:exam.academicYear, course:exam.course, branch:exam.branch, semester:exam.semester, section:exam.section, forceRefresh:true }).then((records) => {
      if (!active) return
      const mapped = (Array.isArray(records) ? records : []).map((record) => {
        const academic = record.academic || {}
        const sectionValue = academic.sectionName || (typeof academic.section === 'string' ? academic.section : academic.section?.name || academic.section?.code) || academic.sectionCode || ''
        const rawBatch = academic.batch || academic.batchName || record.batch || record.batchName || ''
        const id = String(record.studentId || record.id || '')
        return { id, name:record.fullName || record.studentName || record.name || 'Student', registerNumber:record.registrationNumber || record.rollNumber || record.application?.registrationNumber || record.application?.admissionNumber || id, department:academic.department || academic.departmentName || exam.department, course:academic.course || academic.courseName || exam.course, branch:academic.branch || academic.branchName || exam.branch, batch:rawBatch || exam.batch, semester:academic.semester || academic.semesterName || exam.semester, section:sectionValue || exam.section }
      }).filter((student) => student.id && (!student.batch || String(student.batch).toLowerCase() === String(exam.batch).toLowerCase()))
      if (mapped.length) { setRemoteStudents(mapped); upsertStudents(mapped) }
    }).catch(() => {}).finally(() => { if (active) setRosterLoading(false) })
    return () => { active = false }
  }, [exam?.id, rosterRefresh])
  useEffect(() => { if (exam) setStudentRange((range) => { const limit=examStudents.length||rollRange?.count||40;const from=Math.min(limit,Math.max(1,Number(range.from)||1));return{from,to:Math.min(limit,Math.max(from,Number(range.to)||Math.min(40,limit)))}}) }, [exam?.id, examStudents.length, rollRange?.count])
  useEffect(() => setGeneratedInvigilations(getInvigilations().filter((item)=>item.examId===selectedExam)), [selectedExam, allocations.length])
  const current = allocations.filter((a)=>a.examId===selectedExam)
  const allocated = current.reduce((n,a)=>n+Number(a.studentCount||0),0)
  const occupied = [...allocations.filter((a)=>a.examId!==selectedExam&&a.examDate===exam?.examDate&&a.session===exam?.session).map((a)=>a.hallId), ...exams.filter((e)=>e.id!==selectedExam&&e.examDate===exam?.examDate&&e.session===exam?.session&&e.status!=='Cancelled').map((e)=>e.hallId)].filter(Boolean)
  // The table is an allocation list, so keep unallocated master halls out of it.
  // A hall selected while creating the exam is still included until a student
  // allocation is added for it.
  const allocationHallIds = new Set([...current.map((allocation)=>allocation.hallId), exam?.hallId].filter(Boolean))
  const assignments = halls.filter((hall)=>allocationHallIds.has(hall.id)).map((hall)=>({hall, allocation:current.find((a)=>a.hallId===hall.id), scheduled:hall.id===exam?.hallId}))
  const availableSeats = Math.max(0, halls.filter((h)=>!occupied.includes(h.id)).reduce((n,h)=>n+h.capacity,0)-allocated)
  const availableHalls = halls.filter((h)=>!occupied.includes(h.id)&&h.capacity>Number(current.find((a)=>a.hallId===h.id)?.studentCount||0)).sort((a,b)=>Number(b.id===exam?.hallId)-Number(a.id===exam?.hallId))
  const assignedIds = new Set(current.flatMap((a)=>a.studentIds||[]))
  const remainingStudents = examStudents.filter((s)=>!assignedIds.has(s.id))
  const allocate = (rows) => { let offset=0; for (const hall of availableHalls) { if (offset>=rows.length) break; const existing=current.find((a)=>a.hallId===hall.id);const capacityLeft=hall.capacity-Number(existing?.studentCount||0);const chunk=rows.slice(offset,offset+capacityLeft);if(!chunk.length)continue;createHallAllocation({examId:exam.id,examDate:exam.examDate,session:exam.session,hallId:hall.id,studentCount:chunk.length,studentIds:chunk.map((s)=>s.id),studentFrom:chunk[0]?.registerNumber,studentTo:chunk.at(-1)?.registerNumber,invigilator:existing?.invigilator||''});offset+=chunk.length } return rows.length-offset }
  const auto = () => {
    if (!exam) { onError('Select an examination first.'); return }
    if (!examStudents.length) {
      if (!rollRange) { onError('No matching student roster is available. Add a valid roll number range to this exam or refresh the student data.'); return }
      const alreadyAssigned=getAllocatedRangePositions(current,rollRange)
      const pending=Array.from({length:rollRange.count},(_,index)=>index+1).filter((position)=>!alreadyAssigned.has(position))
      if (!pending.length) { onError(''); onNotice('All roll numbers in this examination range have already been allocated.'); return }
      try {
        let offset=0
        for (const hall of availableHalls) {
          const capacity=hall.capacity-Number(current.find((allocation)=>allocation.hallId===hall.id)?.studentCount||0)
          const chunk=pending.slice(offset,offset+capacity)
          if (!chunk.length) continue
          createHallAllocation({examId:exam.id,examDate:exam.examDate,session:exam.session,hallId:hall.id,studentCount:chunk.length,studentIds:[],studentFrom:rollRange.format(rollRange.start+chunk[0]-1),studentTo:rollRange.format(rollRange.start+chunk.at(-1)-1),invigilator:current.find((allocation)=>allocation.hallId===hall.id)?.invigilator||''})
          offset+=chunk.length
        }
        const remaining=pending.length-offset
        onNotice(remaining?`Allocation completed. ${remaining} roll numbers remain because available hall capacity is insufficient.`:'All roll numbers were allocated successfully.')
        onError(''); onReload()
      } catch(error) { onError(error.message) }
      return
    }
    if (!remainingStudents.length) { onError(''); onNotice(`All ${examStudents.length} eligible students have already been allocated.`); return }
    try { const remaining=allocate(remainingStudents); onNotice(remaining?`Allocation completed. ${remaining} students remain because available hall capacity is insufficient.`:'All eligible students were allocated successfully.');onError('');onReload() } catch(error){onError(error.message)}
  }
  const manual = () => {
    if (!exam || !selectedHall) { onError('Select an examination and an available hall.'); return }
    const hall = halls.find((h) => h.id === selectedHall)
    const start = Number(studentRange.from)
    const end = Number(studentRange.to)
    const count = end - start + 1
    if (!hall) { onError('The selected hall is no longer available. Refresh the hall list and choose another.'); return }
    if (occupied.includes(hall.id)) { onError(`${hall.name} is already assigned to another exam during this session.`); return }
    const limit=examStudents.length||rollRange?.count||0
    if (!Number.isInteger(start) || !Number.isInteger(end) || !limit || start < 1 || end > limit || count < 1) { onError(rollRange?`Choose a valid student range from 1 to ${limit}.`:'No matching student roster or valid exam roll number range is available. Add a roll number range in Create Exam or refresh student data.'); return }
    const existingCount = Number(current.find((a) => a.hallId === hall.id)?.studentCount || 0)
    if (count > hall.capacity - existingCount) { onError(`${hall.name} has ${hall.capacity - existingCount} seats available. Reduce the selected student range.`); return }
    const chunk = examStudents.length?examStudents.slice(start-1,end):[]
    const assignedPositions=getAllocatedRangePositions(current,rollRange)
    if (!examStudents.length && Array.from({length:count},(_,index)=>start+index).some((position)=>assignedPositions.has(position))) { onError('Part of this roll number range has already been assigned. Choose an unallocated range.'); return }
    if (chunk.some((student)=>assignedIds.has(student.id))) { onError('Part of this student range has already been assigned. Choose an unallocated range.'); return }
    const studentFrom=examStudents.length?chunk[0]?.registerNumber:rollRange.format(rollRange.start+start-1)
    const studentTo=examStudents.length?chunk.at(-1)?.registerNumber:rollRange.format(rollRange.start+end-1)
    try {
      createHallAllocation({ examId:exam.id, examDate:exam.examDate, session:exam.session, hallId:hall.id, studentCount:count, studentIds:chunk.map((s)=>s.id), studentFrom, studentTo, invigilator })
      const nextAssigned = new Set([...assignedIds, ...chunk.map((s)=>s.id)])
      const nextPosition=examStudents.length?examStudents.findIndex((student)=>!nextAssigned.has(student.id))+1:Array.from({length:limit},(_,index)=>index+1).find((position)=>!assignedPositions.has(position)&&!(position>=start&&position<=end))||0
      const remainingCapacity=hall.capacity-existingCount-count
      setSelectedHall(remainingCapacity>0?hall.id:'')
      if (nextPosition>0) setStudentRange({from:nextPosition,to:Math.min(limit,nextPosition+Math.max(1,remainingCapacity)-1)})
      onNotice(`${studentFrom}–${studentTo} allocated to ${hall.name}.`)
      onError('')
      onReload()
    } catch (e) { onError(e.message) }
  }
  const generateInvigilation = () => {
    if (!exam) { onError('Select an examination first.'); return }
    const rule=getInvigilationRules().find((item)=>item.examDepartment===exam.department&&item.enabled)
    if (!rule?.allowedDepartments?.length) { onError(`Unable to automatically allocate invigilators. Configure an enabled department mapping for ${exam.department}.`); return }
    const hallIds=[...new Set([...current.map((item)=>item.hallId),exam.hallId,selectedHall].filter(Boolean))]
    if (!hallIds.length) { onError('Allocate students to at least one hall before generating invigilation.'); return }
    const existing=getInvigilations().filter((item)=>item.examId!==exam.id)
    const eligible=facultyDirectory.filter((person)=>person.active!==false&&person.eligible!==false&&!person.onLeave&&rule.allowedDepartments.includes(person.department))
    const assigned=[]
    for (const hallId of hallIds) {
      const candidate=eligible.filter((person)=>!assigned.some((item)=>item.facultyId===person.id)&&!existing.some((item)=>item.facultyId===person.id&&item.examDate===exam.examDate&&item.startTime<exam.endTime&&item.endTime>exam.startTime)&&existing.filter((item)=>item.facultyId===person.id&&item.examDate===exam.examDate).length<Number(person.maxDailyAssignments||2)).sort((a,b)=>existing.filter((item)=>item.facultyId===a.id).length-existing.filter((item)=>item.facultyId===b.id).length)[0]
      if (!candidate) { onError('Unable to automatically allocate invigilators. Please review faculty availability or invigilation department mappings.'); return }
      assigned.push({examId:exam.id,hallId,facultyId:candidate.id,facultyName:candidate.name,department:candidate.department,examDate:exam.examDate,startTime:exam.startTime,endTime:exam.endTime,status:'Generated'})
    }
    try { saveInvigilations([...existing,...assigned]);setGeneratedInvigilations(assigned);onError('');onNotice(`${assigned.length} invigilator${assigned.length===1?'':'s'} generated using the configured department mapping.`) } catch(error) { onError(error.message) }
  }
  const updateInvigilator = (hallId, facultyId) => {
    const person=facultyDirectory.find((item)=>item.id===facultyId)
    if(!person||person.active===false||person.eligible===false||person.onLeave){onError('Choose an active, eligible faculty member who is not on leave.');return}
    if(generatedInvigilations.some((item)=>item.hallId!==hallId&&item.facultyId===facultyId)){onError('This faculty member is already assigned to another hall for this examination.');return}
    const conflicts=getInvigilations().filter((item)=>item.examId!==exam?.id&&item.facultyId===facultyId&&item.examDate===exam?.examDate&&item.startTime<exam.endTime&&item.endTime>exam.startTime)
    if(conflicts.length){onError('Invigilation conflict: this faculty member is already assigned during this examination time.');return}
    if(getInvigilations().filter((item)=>item.examId!==exam?.id&&item.facultyId===facultyId&&item.examDate===exam?.examDate).length>=Number(person.maxDailyAssignments||2)){onError('This faculty member has reached the maximum daily invigilation workload.');return}
    const next=generatedInvigilations.map((item)=>item.hallId===hallId?{...item,facultyId:person?.id||'',facultyName:person?.name||'',department:person?.department||'',status:'Reviewed'}:item)
    try { const all=getInvigilations().filter((item)=>item.examId!==exam?.id);saveInvigilations([...all,...next]);setGeneratedInvigilations(next);onNotice('Invigilation assignment updated.') } catch(error) { onError(error.message) }
  }
  const unassignScheduledHall = (hallId) => {
    if(!exam)return
    try { updateExam(exam.id,{hallId:exam.hallId===hallId?'':exam.hallId});setSelectedHall((currentHall)=>currentHall===hallId?'':currentHall);onError('');onNotice('Scheduled examination hall unassigned.');onReload() } catch(error) { onError(error.message) }
  }
  const removeHallAllocation = (allocation) => {
    try { deleteHallAllocation(allocation.id);const nextInvigilations=getInvigilations().filter((item)=>item.examId!==allocation.examId||item.hallId!==allocation.hallId);saveInvigilations(nextInvigilations);setGeneratedInvigilations(nextInvigilations.filter((item)=>item.examId===selectedExam));onError('');onNotice('Student allocation and hall invigilation assignment removed.');onReload() } catch(error) { onError(error.message) }
  }
  const openHallDialog = (hall, allocation, mode) => {
    setActiveHall({ hall, allocation })
    setHallDialogMode(mode)
    setHallForm({ studentFrom:allocation?.studentFrom||(hall.id===exam?.hallId?exam?.rollNoFrom:'')||'', studentTo:allocation?.studentTo||(hall.id===exam?.hallId?exam?.rollNoTo:'')||'', invigilator:allocation?.invigilator||getAssignedInvigilator(exam,hall.id)||'' })
    onError('')
  }
  const saveHallDetails = () => {
    if (!exam||!activeHall) return
    const { hall, allocation }=activeHall
    const range=hallForm.studentFrom||hallForm.studentTo?parseRollNumberRange(hallForm.studentFrom,hallForm.studentTo):null
    if (!!hallForm.studentFrom!==!!hallForm.studentTo||((hallForm.studentFrom||hallForm.studentTo)&&!range)) { onError('Enter a valid roll number range with matching prefix and numeric endings.');return }
    const existingCount=Number(allocation?.studentCount||0)
    if (range&&range.count>hall.capacity) { onError(`${hall.name} has ${hall.capacity} seats. Reduce the roll number range.`);return }
    const assignedToOtherHall=current.filter((item)=>item.hallId!==hall.id)
    if (range&&getAllocatedRangePositions(assignedToOtherHall,range).size) { onError('This roll number range overlaps with students already assigned to another hall.');return }
    if (allocation?.studentIds?.length&&range&&range.count!==existingCount) { onError('The student roster allocation controls the count and range. You can still update the invigilator here.');return }
    try {
      if (allocation) {
        if (!allocation.studentIds?.length) {
          if (range) updateHallAllocation(allocation.id,{studentCount:range.count,studentFrom:hallForm.studentFrom,studentTo:hallForm.studentTo,invigilator:hallForm.invigilator||''})
          else deleteHallAllocation(allocation.id)
        } else updateHallAllocation(allocation.id,{invigilator:hallForm.invigilator||''})
      } else if (range) {
        createHallAllocation({examId:exam.id,examDate:exam.examDate,session:exam.session,hallId:hall.id,studentCount:range.count,studentIds:[],studentFrom:hallForm.studentFrom,studentTo:hallForm.studentTo,invigilator:hallForm.invigilator||''})
      }
      if (hall.id===exam.hallId) updateExam(exam.id,{rollNoFrom:hallForm.studentFrom,rollNoTo:hallForm.studentTo,invigilator:hallForm.invigilator||''})
      onError('');onNotice('Hall allocation details updated.');setActiveHall(null);onReload()
    } catch(error) { onError(error.message) }
  }
  const assignedCapacity = current.reduce((n,a)=>n+(halls.find((h)=>h.id===a.hallId)?.capacity||0),0)
  const totalStudents=examStudents.length||rollRange?.count||0
  const remainingCount=examStudents.length?remainingStudents.length:rollRange?Math.max(0,rollRange.count-getAllocatedRangePositions(current,rollRange).size):0
  const summary=[['Total Students',totalStudents],['Total Halls',halls.length],['Allocated Students',allocated],['Remaining Students',remainingCount],['Available Seats',availableSeats],['Capacity Utilization',assignedCapacity?`${Math.min(100,Math.round(allocated/assignedCapacity*100))}%`:'0%']]
  const hallPages=Math.max(1,Math.ceil(assignments.length/hallPageSize))
  const visibleHalls=assignments.slice((hallPage-1)*hallPageSize,hallPage*hallPageSize)
  return <>
    <section className="exm-panel exm-selection"><div className="exm-form-grid"><Field label="Examination"><select value={selectedExam} onChange={(e)=>{const nextExam=exams.find((item)=>item.id===e.target.value);const nextLimit=students.filter((s)=>s.department===nextExam?.department&&s.course===nextExam?.course&&s.branch===nextExam?.branch&&s.batch===nextExam?.batch&&s.semester===nextExam?.semester&&s.section===nextExam?.section).length||parseRollNumberRange(nextExam?.rollNoFrom,nextExam?.rollNoTo)?.count||40;setSelectedExam(e.target.value);setHallPage(1);setSelectedHall(nextExam?.hallId||'');setStudentRange({from:1,to:Math.min(40,nextLimit)});onError('')}}><option value="">Select examination</option>{exams.filter((e)=>e.status!=='Cancelled').map((e)=><option key={e.id} value={e.id}>{e.id} · {e.subjectCode} · {e.subjectName} · {dateLabel(e.examDate)}</option>)}</select></Field>{exam&&<><Field label="Subject"><input readOnly value={`${exam.subjectCode} · ${exam.subjectName}`}/></Field><Field label="Date & Time"><input readOnly value={`${dateLabel(exam.examDate)} · ${timeLabel(exam.startTime)}–${timeLabel(exam.endTime)}`}/></Field><Field label="Session"><input readOnly value={exam.session}/></Field></>}</div></section>
    {exam&&<><div className="exm-summary exm-summary--allocation">{summary.map(([t,v])=><article className="exm-summary__card" key={t}><span><Users size={18}/></span><div><small>{t}</small><strong>{v}</strong></div></article>)}</div>
    <section className="exm-panel exm-table-wrap"><table className="exm-table"><thead><tr>{['Hall No','Building','Floor','Capacity','Allocated Students','Available Seats','Roll No. Range','Invigilator','Status','Actions'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{visibleHalls.map(({hall,allocation,scheduled})=>{const conflict=occupied.includes(hall.id);const count=Number(allocation?.studentCount??(scheduled?rollRange?.count:0)??0);const state=conflict?'Conflict':count>=hall.capacity&&count>0?'Full':scheduled||allocation?'Assigned':'Available';const assignedInvigilator=getAssignedInvigilator(exam,hall.id);return <tr key={hall.id}><td>{hall.name}{scheduled&&<small className="exm-hall-linked-exam">{exam.id} · {exam.subjectCode}</small>}</td><td>{hall.building||'—'}</td><td>{hall.floor||'—'}</td><td>{hall.capacity}</td><td>{count}</td><td>{conflict?0:Math.max(0,hall.capacity-count)}</td><td>{getHallRollRange(exam,allocation,scheduled)}</td><td>{assignedInvigilator==='Unassigned'?'—':assignedInvigilator}</td><td><Status value={state}/></td><td><div className="exm-row-actions"><button onClick={()=>openHallDialog(hall,allocation,'view')}>View</button><button onClick={()=>openHallDialog(hall,allocation,'edit')}>Edit</button><button className="danger" disabled={!allocation&&!scheduled} title={!allocation&&!scheduled?'No assignment to delete':'Delete hall assignment'} onClick={()=>setPendingHallDelete({hall,allocation})}>Delete</button></div></td></tr>})}{!visibleHalls.length&&<tr><td colSpan="10"><Empty>No hall allocation yet. Hall details from Create Exam will appear here, or allocate students to a hall.</Empty></td></tr>}</tbody></table><div className="exm-pagination"><span>Showing {assignments.length?(hallPage-1)*hallPageSize+1:0}–{Math.min(hallPage*hallPageSize,assignments.length)} of {assignments.length} halls</span><label>Rows <select value={hallPageSize} onChange={(e)=>{setHallPageSize(Number(e.target.value));setHallPage(1)}}><option>10</option><option>25</option><option>50</option></select></label><button disabled={hallPage<=1} onClick={()=>setHallPage(hallPage-1)}>Previous</button><b>{hallPage} / {hallPages}</b><button disabled={hallPage>=hallPages} onClick={()=>setHallPage(hallPage+1)}>Next</button></div></section></>}
    {!exam&&<Empty>Select an examination to view students and hall availability</Empty>}
    {pendingHallDelete&&<div className="exm-overlay" role="presentation"><div className="exm-dialog" role="dialog" aria-modal="true" aria-labelledby="hall-delete-title"><h3 id="hall-delete-title">Remove hall assignment?</h3><p>{pendingHallDelete.allocation?`Remove the student allocation and invigilation assignment for ${pendingHallDelete.hall.name}?`:`Unassign ${pendingHallDelete.hall.name} from this examination?`}</p><div><button className="exm-button" onClick={()=>setPendingHallDelete(null)}>Cancel</button><button className="exm-button exm-button--danger" onClick={()=>{if(pendingHallDelete.allocation)removeHallAllocation(pendingHallDelete.allocation);else unassignScheduledHall(pendingHallDelete.hall.id);setPendingHallDelete(null)}}>Delete</button></div></div></div>}
    {activeHall&&exam&&<div className="exm-overlay" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget){setActiveHall(null);onError('')}}}><div className="exm-dialog exm-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="hall-allocation-dialog-title"><div className="exm-detail-heading"><div><small>{exam.id} · {activeHall.hall.name}</small><h3 id="hall-allocation-dialog-title">{hallDialogMode==='view'?'Hall allocation details':'Edit hall allocation'}</h3></div><button className="exm-button" onClick={()=>setActiveHall(null)} aria-label="Close details"><X size={16}/></button></div>{hallDialogMode==='view'?<div className="exm-detail-grid">{[['Exam',exam.subjectName],['Building / Floor',`${activeHall.hall.building||'—'} · ${activeHall.hall.floor||'—'}`],['Allocated Students',Number(activeHall.allocation?.studentCount??(activeHall.hall.id===exam.hallId?rollRange?.count:0)??0)],['Available Seats',Math.max(0,activeHall.hall.capacity-Number(activeHall.allocation?.studentCount??(activeHall.hall.id===exam.hallId?rollRange?.count:0)??0))],['Roll No. Range',getHallRollRange(exam,activeHall.allocation,activeHall.hall.id===exam.hallId)],['Invigilator',getAssignedInvigilator(exam,activeHall.hall.id)],['Status',activeHall.allocation||activeHall.hall.id===exam.hallId?'Assigned':'Available']].map(([label,value])=><div key={label}><small>{label}</small><strong>{value||'—'}</strong></div>)}</div>:<div className="exm-detail-grid exm-hall-edit-grid"><Field label="Roll No. From"><input value={hallForm.studentFrom} disabled={!!activeHall.allocation?.studentIds?.length} onChange={(event)=>setHallForm({...hallForm,studentFrom:event.target.value.trim()})} placeholder="e.g. 23CS001"/></Field><Field label="Roll No. To"><input value={hallForm.studentTo} disabled={!!activeHall.allocation?.studentIds?.length} onChange={(event)=>setHallForm({...hallForm,studentTo:event.target.value.trim()})} placeholder="e.g. 23CS060"/></Field><Field label="Invigilator"><select value={hallForm.invigilator} onChange={(event)=>setHallForm({...hallForm,invigilator:event.target.value})}><option value="">Select invigilator</option>{faculty.map((name)=><option key={name} value={name}>{name}</option>)}{hallForm.invigilator&&!faculty.includes(hallForm.invigilator)&&<option value={hallForm.invigilator}>{hallForm.invigilator}</option>}</select></Field></div>}<div className="exm-dialog__footer">{hallDialogMode==='view'?<button className="exm-button" onClick={()=>setHallDialogMode('edit')}>Edit</button>:<><button className="exm-button" onClick={()=>setActiveHall(null)}>Cancel</button><button className="exm-button exm-button--primary" onClick={saveHallDetails}>Save changes</button></>}</div></div></div>}
  </>
}
