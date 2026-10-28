import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  FiAlertCircle, FiArrowDown, FiArrowRight, FiCheck, FiCheckCircle, FiDownload,
  FiEdit2, FiFileText, FiGrid, FiSearch, FiTrash2, FiUpload, FiX,
} from 'react-icons/fi'
import PortalLayout from '../../layouts/PortalLayout.jsx'
import { PortalDialog, Status } from '../../components/portals/PortalUI.jsx'
import FacultyCardSkeleton from './components/FacultyCardSkeleton.jsx'
import FacultyEmptyState from './components/FacultyEmptyState.jsx'
import { facultyRouteByPath } from './routeConfig.js'
import { facultyService } from './services/facultyService.js'
import { buildAttendanceRecords, calculateLeaveDays, getAttendanceCounts, hasLeaveOverlap, validateMarks } from './domain/validation.js'
import './workspace.css'

const today = () => new Date().toISOString().slice(0, 10)
const safeText = value => String(value ?? '')
const studentPageSize = 5
const routes = Object.values(facultyRouteByPath)
const titleFor = screen => routes.find(route => route.screen === screen)?.title || 'Faculty workspace'

function downloadFixtureDetails(record) {
  const contents = [
    'Digital Campus faculty portal preview',
    'The original uploaded file is not included in local fixture data.',
    '',
    ...Object.entries(record).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : safeText(value)}`),
  ].join('\r\n')
  const filename = `${safeText(record.fileName || record.title || 'faculty-document').replace(/[^\w.-]+/g, '-')}.preview.txt`
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/plain;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function loadScreen(screen) {
  switch (screen) {
    case 'students': {
      const [students, sections] = await Promise.all([
        facultyService.getStudents({ page: 1, pageSize: 1000 }),
        facultyService.getSections(),
      ])
      return { students: students.items, sections }
    }
    case 'subjects': {
      const [subjectData, students] = await Promise.all([
        facultyService.getSubjects(),
        facultyService.getStudents({ page: 1, pageSize: 1000 }),
      ])
      return { ...subjectData, students: students.items }
    }
    case 'my-attendance': return { myAttendance: await facultyService.getMyAttendance() }
    case 'timetable': return facultyService.getTimetable()
    case 'attendance': {
      const [sessions, students, sections, assignments, myAttendance, shortageAlerts] = await Promise.all([
        facultyService.getAttendanceSessions(),
        facultyService.getStudents({ page: 1, pageSize: 1000 }),
        facultyService.getSections(),
        facultyService.getSubjects(),
        facultyService.getMyAttendance(),
        facultyService.getAttendanceShortageAlerts(),
      ])
      return { sessions, students: students.items, sections, assignments: assignments.allocations, myAttendance, shortageAlerts }
    }
    case 'marks': {
      const [assessments, students] = await Promise.all([
        facultyService.getMarksAssessments(),
        facultyService.getStudents({ page: 1, pageSize: 1000 }),
      ])
      return { assessments, students: students.items }
    }
    case 'exams': return facultyService.getExams()
    case 'electives': return facultyService.getElectives()
    case 'materials': {
      const [materials, allocations] = await Promise.all([
        facultyService.getStudyMaterials(),
        facultyService.getSubjects(),
      ])
      return { materials, allocations: allocations.allocations }
    }
    case 'leave': return facultyService.getLeaveData()
    case 'documents': return facultyService.getDocuments()
    case 'meetings': return facultyService.getMeetingsAndEvents()
    case 'profile': return facultyService.getProfile()
    case 'notifications': return facultyService.getNotifications()
    default: return null
  }
}

function FeatureTable({ columns, rows, empty = 'No records available' }) {
  if (!rows.length) return <FacultyEmptyState title={empty} />
  return <div className="fw-table-scroll"><table className="fw-table"><thead><tr>{columns.map(column => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>
    {rows.map((row, index) => <tr key={row.id || row.rollNumber || index}>{columns.map(column => <td key={column.key} data-label={typeof column.label === 'string' ? column.label : column.key}>{column.render ? column.render(row) : row[column.key] ?? '—'}</td>)}</tr>)}
  </tbody></table></div>
}

function SectionSelect({ sections, value, onChange, label = 'Class section' }) {
  return <label className="fw-field"><span>{label}</span><select value={value} onChange={event => onChange(event.target.value)}><option value="">All assigned sections</option>{sections.map(row => <option key={row.id} value={row.id}>{row.shortName || row.name}</option>)}</select></label>
}

function Tabs({ items, value, onChange }) {
  return <div className="fw-tabs" role="tablist">{items.map(tab => <button key={tab} type="button" role="tab" aria-selected={value === tab} className={value === tab ? 'is-active' : ''} onClick={() => onChange(tab)}>{tab}</button>)}</div>
}

function StudentsScreen({ data, searchParams, setSearchParams }) {
  const search = searchParams.get('q') || '', sectionId = searchParams.get('section') || ''
  const [queryState, setQueryState] = useState({ source: search, value: search })
  const query = queryState.source === search ? queryState.value : search
  const searchTimer = useRef(null)
  const courseId = searchParams.get('course') || ''
  const branchId = searchParams.get('branch') || ''
  const semesterId = searchParams.get('semester') || ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const [sort, setSort] = useState('rollNumber')
  const [ascending, setAscending] = useState(true)
  const [student, setStudent] = useState(null)
  const [tab, setTab] = useState('Overview')
  const sections = data.sections.filter(row => data.students.some(item => item.sectionId === row.id))
  const filtered = useMemo(() => data.students.filter(row => (!sectionId || row.sectionId === sectionId)
    && (!courseId || row.courseId === courseId || sections.find(section => section.id === row.sectionId)?.courseId === courseId)
    && (!branchId || row.branchId === branchId || sections.find(section => section.id === row.sectionId)?.branchId === branchId)
    && (!semesterId || String(row.semester) === semesterId || String(sections.find(section => section.id === row.sectionId)?.semesterId) === semesterId)
    && `${row.name} ${row.rollNumber} ${row.email}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => safeText(a[sort]).localeCompare(safeText(b[sort])) * (ascending ? 1 : -1)), [data.students, sections, sectionId, courseId, branchId, semesterId, search, sort, ascending])
  const pages = Math.max(1, Math.ceil(filtered.length / studentPageSize))
  const rows = filtered.slice((page - 1) * studentPageSize, page * studentPageSize)
  const activeStudents = filtered.filter(row => String(row.status).toLowerCase() === 'active').length
  const attendanceWatch = filtered.filter(row => Number(row.overallAttendance) < 75).length
  const cgpaValues = filtered.map(row => Number(row.cgpa)).filter(Number.isFinite)
  const averageCgpa = cgpaValues.length ? (cgpaValues.reduce((total, value) => total + value, 0) / cgpaValues.length).toFixed(2) : '—'
  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page')
    setSearchParams(next, { replace: true })
  }
  useEffect(() => () => clearTimeout(searchTimer.current), [])
  useEffect(() => {
    if (!student) return undefined
    const previousFocus = document.activeElement
    const dialog = document.querySelector('.fw-drawer')
    const closeButton = dialog?.querySelector('button[aria-label="Close student details"]')
    closeButton?.focus()
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        setStudent(null)
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const focusable = [...dialog.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus?.()
    }
  }, [student])
  const changeQuery = value => {
    setQueryState({ source: search, value })
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setFilter('q', value), 250)
  }
  const changeSort = key => {
    if (sort === key) setAscending(value => !value)
    else {
      setSort(key)
      setAscending(true)
    }
  }
  const unique = key => [...new Map(sections.map(row => [String(row[key]), { value: row[key], label: row[`${key.replace('Id', '')}Name`] || row[key] }])).values()]
  const exportRows = () => {
    const csv = [['Roll number', 'Student', 'Section', 'Email'], ...filtered.map(row => [row.rollNumber, row.name, row.sectionName, row.email])]
      .map(row => row.map(cell => `"${safeText(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = 'faculty-students.csv'; anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const columns = [
    { key: 'rollNumber', label: <button type="button" className={`fw-sort${sort === 'rollNumber' ? ' is-active' : ''}`} aria-label={`Sort by roll number${sort === 'rollNumber' ? ascending ? ', ascending' : ', descending' : ''}`} aria-pressed={sort === 'rollNumber'} onClick={() => changeSort('rollNumber')}>Roll number <FiArrowDown className={sort === 'rollNumber' && ascending ? 'is-ascending' : ''} /></button>, render: row => <span className="fw-student-roll">{row.rollNumber}</span> },
    { key: 'name', label: <button type="button" className={`fw-sort${sort === 'name' ? ' is-active' : ''}`} aria-label={`Sort by student${sort === 'name' ? ascending ? ', ascending' : ', descending' : ''}`} aria-pressed={sort === 'name'} onClick={() => changeSort('name')}>Student <FiArrowDown className={sort === 'name' && ascending ? 'is-ascending' : ''} /></button>, render: row => <button type="button" className="fw-link-button fw-student-identity-button" aria-label={`Open details for ${row.name}`} onClick={() => { setStudent(row); setTab('Overview') }}><span className="fw-student-avatar" aria-hidden="true">{safeText(row.name).trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase()}</span><span className="fw-student-identity"><strong>{row.name}</strong><small>{row.email}</small></span><FiArrowRight aria-hidden="true" /></button> },
    { key: 'sectionName', label: 'Section' },
    { key: 'overallAttendance', label: 'Attendance', render: row => { const attendance = Math.min(100, Math.max(0, Number(row.overallAttendance) || 0)); return <div className={`fw-student-attendance${attendance < 75 ? ' is-at-risk' : ''}`}><div><strong>{attendance}%</strong><small>{attendance < 75 ? 'Needs attention' : 'On track'}</small></div><span className="fw-student-attendance__track" role="progressbar" aria-label={`${row.name} attendance`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={attendance}><i style={{ width: `${attendance}%` }} /></span></div> } },
    { key: 'cgpa', label: 'CGPA' },
    { key: 'status', label: 'Status', render: row => <Status>{row.status}</Status> },
  ]
  return <>
    <FeatureHeading eyebrow="CLASS DIRECTORY" title="My Students" subtitle="Browse and support students in your teaching sections." />
    <section className="fw-student-overview" aria-label="Student overview">
      {[
        ['Students found', filtered.length, 'Matching current filters', 'is-primary'],
        ['Active enrollment', activeStudents, 'Currently active students', ''],
        ['Attendance watch', attendanceWatch, 'Below 75% attendance', attendanceWatch ? 'is-warning' : ''],
        ['Average CGPA', averageCgpa, 'Across matched students', ''],
      ].map(([label, value, detail, tone]) => <article key={label} className={tone}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}
    </section>
    <section className="fw-card fw-student-directory-card">
      <div className="fw-student-directory-heading"><div><h2>Student directory</h2><p>Filter the roster or open a student profile for more details.</p></div><span>{filtered.length} of {data.students.length} students</span></div>
      <div className="fw-student-directory-toolbar">
        <label className="fw-search"><FiSearch aria-hidden="true" /><input value={query} onChange={event => changeQuery(event.target.value)} placeholder="Search name, roll number or email" aria-label="Search students" /></label>
        <button type="button" className="fw-button fw-student-export" onClick={exportRows}><FiDownload /> Export CSV</button>
      </div>
      <div className="fw-student-filters">
        <div className="fw-student-filter-heading"><div><h3>Refine directory</h3><p>Choose a course, branch, semester, or section.</p></div></div>
        <div className="fw-student-filter-grid">
        <label className="fw-field"><span>Course</span><select value={courseId} onChange={event => setFilter('course', event.target.value)}><option value="">All courses</option>{unique('courseId').map(row => <option key={row.value} value={row.value}>{row.label}</option>)}</select></label>
        <label className="fw-field"><span>Branch</span><select value={branchId} onChange={event => setFilter('branch', event.target.value)}><option value="">All branches</option>{unique('branchId').map(row => <option key={row.value} value={row.value}>{row.label}</option>)}</select></label>
        <label className="fw-field"><span>Semester</span><select value={semesterId} onChange={event => setFilter('semester', event.target.value)}><option value="">All semesters</option>{unique('semesterId').map(row => <option key={row.value} value={row.value}>{row.label}</option>)}</select></label>
        <SectionSelect sections={sections.filter(row => (!courseId || row.courseId === courseId) && (!branchId || row.branchId === branchId) && (!semesterId || String(row.semesterId) === semesterId))} value={sectionId} onChange={value => setFilter('section', value)} />
        </div>
      </div>
      <div className="fw-student-results"><div><strong>{filtered.length}</strong><span>students found</span></div><div className="fw-chip-list">{[['course', courseId, 'Course'], ['branch', branchId, 'Branch'], ['semester', semesterId, 'Semester'], ['section', sectionId, 'Section']].filter(([, value]) => value).map(([key, value, label]) => <button type="button" key={key} className="fw-chip" aria-label={`Remove ${label} filter`} onClick={() => setFilter(key, '')}>{key === 'section' ? sections.find(row => row.id === value)?.shortName || label : unique(`${key}Id`).find(row => String(row.value) === value)?.label || `${label} ${value}`} <FiX /></button>)}</div></div>
      <div className="fw-student-table"><FeatureTable columns={columns} rows={rows} empty="No students match these filters" /></div>
      <Pager page={Math.min(page, pages)} pages={pages} total={filtered.length} pageSize={studentPageSize} onChange={next => { const params = new URLSearchParams(searchParams); params.set('page', String(next)); setSearchParams(params, { replace: true }) }} />
    </section>
    {student && <div className="fw-drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setStudent(null) }}><aside className="fw-drawer" role="dialog" aria-modal="true" aria-label={`Student details for ${student.name}`}>
      <header><div><small>{student.rollNumber}</small><h2>{student.name}</h2></div><button className="fw-icon-button" onClick={() => setStudent(null)} aria-label="Close student details"><FiX /></button></header>
      <Tabs items={['Overview', 'Academic', 'Attendance', 'Marks', 'Credits', 'Electives', 'Documents']} value={tab} onChange={setTab} />
      <StudentDetails student={student} tab={tab} />
    </aside></div>}
  </>
}

function StudentDetails({ student, tab }) {
  if (tab === 'Attendance') return <div className="fw-detail-list"><h3>Subject-wise attendance</h3>{Object.entries(student.subjectAttendance).map(([code, value]) => <div key={code}><span>{code}</span><strong className={value < 75 ? 'fw-risk-text' : ''}>{value}%</strong><progress max="100" value={value} /></div>)}<h3>Monthly attendance</h3><div className="fw-monthly-chart" role="img" aria-label="Monthly attendance percentage from May to October">{student.monthlyAttendance.map(row => <div key={row.month}><span>{row.percentage}%</span><i style={{ '--month-height': `${row.percentage}%` }} /><small>{row.month}</small></div>)}</div></div>
  if (tab === 'Marks') return <div className="fw-detail-list"><h3>Assessment marks</h3>{Object.entries(student.marks).map(([assessment, value]) => <div key={assessment}><span>{assessment.replace('_', ' ')}</span><strong>{value}</strong></div>)}</div>
  if (tab === 'Credits') return <DetailPairs rows={[['Credits earned', student.creditsEarned], ['Credits required', student.totalCreditsRequired], ['CGPA', student.cgpa]]} />
  if (tab === 'Electives') return <div className="fw-detail-list"><h3>Selected electives</h3>{student.electives.map(item => <p key={item}>{item}</p>)}</div>
  if (tab === 'Documents') return <FeatureTable columns={[{ key: 'name', label: 'Document' }, { key: 'type', label: 'Type' }, { key: 'verified', label: 'Review', render: row => row.verified ? 'Verified' : 'Pending' }]} rows={student.documents} empty="No documents available" />
  if (tab === 'Academic') return <DetailPairs rows={[['Course', 'B.Tech'], ['Branch', student.branch], ['Semester', student.semesterName], ['Section', student.sectionName], ['Academic year', student.academicYear], ['Admission type', student.category]]} />
  return <DetailPairs rows={[['Email', student.email], ['Phone', student.phone], ['Guardian', student.guardianName], ['Blood group', student.bloodGroup], ['Enrollment status', student.status]]} />
}

function SubjectsScreen({ data }) {
  const [view, setView] = useState('Cards')
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('Overview')
  const usedHours = data.workload.totalHoursPerWeek
  const percent = Math.min(100, Math.round(usedHours / data.workload.capacityHoursPerWeek * 100))
  const columns = [
    { key: 'subjectCode', label: 'Code' }, { key: 'subjectName', label: 'Subject' },
    { key: 'credits', label: 'Credits', render: row => data.subjects.find(subject => subject.id === row.subjectId)?.credits ?? '—' },
    { key: 'semesterName', label: 'Semester' }, { key: 'sectionName', label: 'Section' },
    { key: 'periodsPerWeek', label: 'Periods / week' },
    { key: 'action', label: 'Details', render: row => <button className="fw-button fw-button-small" onClick={() => setSelected(row.subjectId)}>Open</button> },
  ]
  const subject = data.subjects.find(row => row.id === selected)
  const allocations = subject ? data.allocations.filter(row => row.subjectId === subject.id) : []
  return <>
    <FeatureHeading eyebrow="TEACHING ASSIGNMENTS" title="My Subjects" subtitle="Review allocated courses, sections and weekly workload." />
    <section className="fw-workload-card"><div><p className="fw-eyebrow">WEEKLY WORKLOAD</p><strong>{usedHours} <small>/ {data.workload.capacityHoursPerWeek} hours</small></strong><p>{percent}% of teaching capacity allocated</p></div><progress max="100" value={percent} aria-label={`${percent}% teaching capacity allocated`} /></section>
    <section className="fw-card"><div className="fw-card-heading"><div><h2>Allocated subjects</h2><p>{data.subjects.length} subjects · {data.allocations.length} class allocations</p></div><Tabs items={['Cards', 'Table']} value={view} onChange={setView} /></div>
      {view === 'Table' ? <FeatureTable columns={columns} rows={data.allocations} empty="No teaching allocations" /> : <div className="fw-subject-grid">{data.subjects.map(subjectRow => <button className="fw-subject-card" key={subjectRow.id} onClick={() => { setSelected(subjectRow.id); setTab('Overview') }}><span className="fw-subject-code">{subjectRow.code}</span><h3>{subjectRow.name}</h3><p>{subjectRow.type}</p><div><span>{subjectRow.credits} credits</span><span>{subjectRow.totalHoursPerWeek} hours / week</span></div><small>{subjectRow.sections.length} assigned sections <FiArrowRight /></small></button>)}</div>}
    </section>
    {subject && <PortalDialog title={subject.name} onClose={() => setSelected(null)}><Tabs items={['Overview', 'Sections', 'Students', 'Attendance summary', 'Marks report']} value={tab} onChange={setTab} />
      {tab === 'Overview' && <DetailPairs rows={[['Course code', subject.code], ['Credits', subject.credits], ['Course type', subject.type], ['Semester', subject.semesterName], ['Description', subject.description]]} />}
      {tab === 'Sections' && <FeatureTable columns={[{ key: 'sectionName', label: 'Section' }, { key: 'classroomName', label: 'Room' }, { key: 'studentCount', label: 'Students' }, { key: 'periodsPerWeek', label: 'Periods/week' }]} rows={allocations} />}
      {tab === 'Students' && <FeatureTable columns={[{ key: 'rollNumber', label: 'Roll number' }, { key: 'name', label: 'Student' }, { key: 'sectionName', label: 'Section' }]} rows={data.students.filter(student => subject.sections.includes(student.sectionId))} empty="No students are assigned to this subject's sections." />}
      {tab === 'Attendance summary' && <><div className="fw-detail-list"><h3>Section attendance</h3>{allocations.map(allocation => { const sectionStudents = data.students.filter(student => student.sectionId === allocation.sectionId); const average = sectionStudents.length ? Math.round(sectionStudents.reduce((sum, student) => sum + Number(student.subjectAttendance[subject.code] || 0), 0) / sectionStudents.length) : 0; return <div key={allocation.id}><span>{allocation.sectionName} · {sectionStudents.length} students</span><strong>{average || '—'}%</strong></div> })}</div><FeatureTable columns={[{ key: 'rollNumber', label: 'Roll number' }, { key: 'name', label: 'Student' }, { key: 'attendance', label: 'Attendance', render: student => `${student.subjectAttendance[subject.code] ?? '—'}%` }]} rows={data.students.filter(student => subject.sections.includes(student.sectionId))} empty="No subject attendance records" /></>}
      {tab === 'Marks report' && <FeatureTable columns={[{ key: 'rollNumber', label: 'Roll number' }, { key: 'name', label: 'Student' }, { key: 'score', label: 'Mid-term marks', render: student => student.marks[`${subject.code}_Mid1`] ?? '—' }]} rows={data.students.filter(student => subject.sections.includes(student.sectionId)).sort((a, b) => Number(b.marks[`${subject.code}_Mid1`] || 0) - Number(a.marks[`${subject.code}_Mid1`] || 0))} empty="No subject marks entered" />}
    </PortalDialog>}
  </>
}

function TimetableScreen({ data }) {
  const [mode, setMode] = useState('Week')
  const [day, setDay] = useState(new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()))
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const entries = mode === 'Day' ? data.weekly.filter(row => row.day === day) : data.weekly
  const todayRows = data.today
  const teachingDays = new Set(data.weekly.map(row => row.day)).size
  const assignedSections = new Set(data.weekly.map(row => row.sectionId || row.sectionName).filter(Boolean)).size
  return <>
    <FeatureHeading eyebrow="TEACHING SCHEDULE" title="My Timetable" subtitle="Plan your week and jump directly into attendance." actions={<button className="fw-button" onClick={() => window.print()}><FiFileText /> Print timetable</button>} />
    <section className="fw-timetable-overview" aria-label="Weekly schedule overview">
      {[
        ['Classes this week', data.weekly.length, 'Across your teaching schedule'],
        ['Teaching days', teachingDays, 'Days with scheduled classes'],
        ["Today's classes", todayRows.length, 'Classes scheduled for today'],
        ['Assigned sections', assignedSections, 'Sections on your timetable'],
      ].map(([label, value, detail], index) => <article key={label} className={index === 0 ? 'is-primary' : ''}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}
    </section>
    <section className="fw-card">
      <div className="fw-card-heading"><div><h2>Class schedule</h2><p>Rooms and sections are shown on each class.</p></div><Tabs items={['Week', 'Day', 'Agenda']} value={mode} onChange={setMode} /></div>
      {mode === 'Day' && <div className="fw-day-picker">{weekdays.map(name => <button key={name} className={day === name ? 'is-active' : ''} onClick={() => setDay(name)}>{name.slice(0, 3)}</button>)}</div>}
      {mode === 'Week' ? <div className="fw-week-grid">{weekdays.map(weekday => {
        const dayEntries = data.weekly.filter(row => row.day === weekday)
        return <section key={weekday} className={dayEntries.length ? '' : 'is-empty'}>
          <header className="fw-weekday-heading"><h3>{weekday}</h3><span>{dayEntries.length} {dayEntries.length === 1 ? 'class' : 'classes'}</span></header>
          {dayEntries.length ? <div className="fw-weekday-classes">{dayEntries.map(row => <TimetableCard key={row.id} row={row} />)}</div> : <p className="fw-weekday-empty">No classes scheduled</p>}
        </section>
      })}</div>
        : <div className="fw-agenda">{entries.length ? entries.map(row => <TimetableCard key={row.id} row={row} />) : <FacultyEmptyState title={`No classes on ${day}`} />}</div>}
    </section>
    {todayRows.length > 0 && <section className="fw-card"><div className="fw-card-heading"><div><p className="fw-eyebrow">TODAY AT A GLANCE</p><h2>Today's teaching blocks</h2></div></div><div className="fw-agenda">{todayRows.map(row => <TimetableCard key={row.id} row={row} />)}</div></section>}
  </>
}

function TimetableCard({ row }) {
  const subjectKey = row.subjectId || row.subjectCode || ''
  const colorIndex = [...subjectKey].reduce((total, character) => total + character.charCodeAt(0), 0) % 4
  return <article className={`fw-timetable-item subject-color-${colorIndex}${row.isNow ? ' is-now' : ''}${row.isNext ? ' is-next' : ''}`}>
    <div className="fw-timetable-item__time"><span className="fw-timetable-time">{row.slotTime || `${row.startTime}–${row.endTime}`}</span>{row.isNow && <span className="fw-timetable-state">In progress</span>}{row.isNext && <span className="fw-timetable-state">Up next</span>}</div>
    <div className="fw-timetable-item__details"><strong>{row.subjectName}</strong><small><span>{row.sectionName}</span><span>{row.room || 'Room to be confirmed'}</span></small><span className="fw-subject-code">{row.subjectCode} · {row.type}</span></div>
    <Link to="/faculty-portal/attendance" aria-label={`Mark attendance for ${row.subjectName}`}><FiCheckCircle /><span>Attendance</span><FiArrowRight aria-hidden="true" /></Link>
  </article>
}

function MyAttendanceSummary({ data }) {
  const attendance = data.myAttendance
  const dailyLog = attendance.dailyLog || []
  const [monthName, yearText] = String(attendance.currentMonth).split(' ')
  const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(monthName)
  const calendarYear = Number(yearText) || new Date().getFullYear()
  const calendarMonth = monthIndex >= 0 ? monthIndex : new Date().getMonth()
  const firstWeekday = new Date(calendarYear, calendarMonth, 1).getDay()
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
  const entriesByDay = new Map(dailyLog.map(row => [Number(row.date.slice(-2)), row]))
  const attendancePercentage = Math.min(100, Math.max(0, Number(attendance.attendancePercentage) || 0))
  const metrics = [
    ['Working days', attendance.workingDays, 'Scheduled this month'],
    ['Present', attendance.presentDays, 'Days attended'],
    ['On leave', attendance.onLeaveDays, 'Approved leave days'],
    ['Late arrivals', attendance.lateArrivals, 'Recorded check-ins'],
  ]
  const calendarDays = Array.from({ length: daysInMonth }, (_, index) => index + 1)

  return <>
    <section className="fw-card fw-attendance-summary">
      <div className="fw-card-heading">
        <div><p className="fw-eyebrow">MONTHLY OVERVIEW</p><h2>{attendance.currentMonth}</h2><p>Your attendance at a glance</p></div>
        <span className="fw-attendance-record-count">{dailyLog.length} daily records</span>
      </div>
      <div className="fw-attendance-overview">
        <div><span>Attendance rate</span><strong>{attendancePercentage.toFixed(1)}<small>%</small></strong><p>{attendance.presentDays} of {attendance.workingDays} working days attended</p></div>
        <div className="fw-attendance-progress" role="progressbar" aria-label="Monthly attendance rate" aria-valuemin="0" aria-valuemax="100" aria-valuenow={attendancePercentage}>
          <span style={{ width: `${attendancePercentage}%` }} />
        </div>
      </div>
      <div className="fw-leave-balance-grid fw-attendance-metrics">{metrics.map(([label, value, detail]) => <article key={label}><span>{label}</span><strong>{value ?? '—'}</strong><small>{detail}</small></article>)}</div>
    </section>

    <section className="fw-card fw-attendance-calendar-card">
      <div className="fw-card-heading"><div><h2>Attendance calendar</h2><p>Daily status for {attendance.currentMonth}</p></div>
        <div className="fw-attendance-legend" aria-label="Calendar legend"><span><i className="is-present" />Present</span><span><i className="is-leave" />Leave</span><span><i className="is-holiday" />Holiday</span></div>
      </div>
      <div className="fw-calendar-grid" role="group" aria-label={`${attendance.currentMonth} attendance calendar`}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day} className="is-weekday" aria-hidden="true">{day}</span>)}
        {Array.from({ length: firstWeekday }, (_, index) => <span key={`spacer-${index}`} className="is-placeholder" aria-hidden="true" />)}
        {calendarDays.map(day => {
          const log = entriesByDay.get(day)
          const statusClass = log?.status === 'Present' ? 'is-present' : /leave/i.test(log?.status || '') ? 'is-leave' : log?.status === 'Holiday' ? 'is-holiday' : ''
          const date = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const details = log ? [log.status, log.inTime && `In ${log.inTime}`, log.outTime && `Out ${log.outTime}`, log.remark].filter(Boolean).join(' · ') : 'No attendance entry'
          return <span key={day} className={statusClass} title={`${date}: ${details}`} aria-label={`${date}: ${details}`}>{day}</span>
        })}
      </div>
    </section>

    <section className="fw-card fw-attendance-records">
      <div className="fw-card-heading"><div><h2>Daily records</h2><p>Check-in, check-out, and status details</p></div><span className="fw-attendance-record-count">{dailyLog.length} records</span></div>
      <FeatureTable columns={[{ key: 'date', label: 'Date' }, { key: 'status', label: 'Status', render: row => <Status>{row.status}</Status> }, { key: 'inTime', label: 'In time' }, { key: 'outTime', label: 'Out time' }, { key: 'remark', label: 'Notes', render: row => row.remark || (row.late ? 'Late check-in' : '—') }]} rows={dailyLog} empty="No attendance records for this month" />
    </section>
  </>
}

function MyAttendanceScreen({ data }) {
  return <>
    <FeatureHeading eyebrow="PERSONAL ATTENDANCE" title="My Attendance" subtitle="Review your faculty attendance summary and daily records." />
    <MyAttendanceSummary data={data} />
  </>
}

export function AttendanceScreen({ data, action }) {
  const [tab, setTab] = useState('Mark Attendance')
  const [sectionId, setSectionId] = useState(data.sections[0]?.id || '')
  const [attendancePage, setAttendancePage] = useState(1)
  const [assignmentId, setAssignmentId] = useState(data.assignments.find(row => row.sectionId === data.sections[0]?.id)?.id || '')
  const [date, setDate] = useState(today())
  const [statuses, setStatuses] = useState({})
  const [editingSessionId, setEditingSessionId] = useState('')
  const [selected, setSelected] = useState(0)
  const [message, setMessage] = useState('')
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [selectedAlerts, setSelectedAlerts] = useState([])
  const section = data.sections.find(row => row.id === sectionId)
  const sectionAssignments = data.assignments.filter(row => row.sectionId === sectionId)
  const assignment = sectionAssignments.find(row => row.id === assignmentId) || sectionAssignments[0]
  const roster = data.students.filter(row => row.sectionId === sectionId)
  const attendancePageSize = 5
  const attendancePages = Math.max(1, Math.ceil(roster.length / attendancePageSize))
  const currentAttendancePage = Math.min(attendancePage, attendancePages)
  const visibleRoster = roster.slice((currentAttendancePage - 1) * attendancePageSize, currentAttendancePage * attendancePageSize)
  useEffect(() => {
    setAttendancePage(1)
    setSelected(0)
  }, [sectionId])
  const existingSession = data.sessions.find(row => row.sectionId === sectionId && row.subjectId === assignment?.subjectId && row.date === date)
  const attendanceCounts = getAttendanceCounts(statuses, roster.length)
  useEffect(() => {
    const warn = event => { if (Object.keys(statuses).length) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [statuses])
  useEffect(() => {
    if (tab !== 'Mark Attendance') return undefined
    const keydown = event => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
      const status = { p: 'PRESENT', a: 'ABSENT', l: 'LATE' }[event.key.toLowerCase()]
      if (status && roster[selected]) {
        event.preventDefault()
        setStatuses(current => ({ ...current, [roster[selected].id]: status }))
      } else if (event.key === 'ArrowDown') {
        const next = Math.min(selected + 1, roster.length - 1)
        setSelected(next)
        setAttendancePage(Math.floor(next / attendancePageSize) + 1)
      } else if (event.key === 'ArrowUp') {
        const next = Math.max(selected - 1, 0)
        setSelected(next)
        setAttendancePage(Math.floor(next / attendancePageSize) + 1)
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [tab, roster, selected, attendancePageSize])
  const loadExistingSession = () => {
    if (!existingSession) return
    let remainingPresent = existingSession.presentCount
    let remainingAbsent = existingSession.absentCount
    let remainingLate = existingSession.lateCount
    const nextStatuses = Object.fromEntries(roster.map(row => {
      const status = existingSession.records?.find(record => record.studentId === row.id)?.status
        || (remainingPresent > 0 ? 'PRESENT' : remainingAbsent > 0 ? 'ABSENT' : 'LATE')
      if (status === 'PRESENT') remainingPresent = Math.max(0, remainingPresent - 1)
      else if (status === 'ABSENT') remainingAbsent = Math.max(0, remainingAbsent - 1)
      else if (status === 'LATE') remainingLate = Math.max(0, remainingLate - 1)
      return [row.id, status]
    }))
    setStatuses(nextStatuses)
    setEditingSessionId(existingSession.id)
  }
  const save = async () => {
    if (!window.confirm('Submit attendance for this class?')) return
    const records = buildAttendanceRecords(roster, statuses)
    if (!records) return
    const saved = await action(() => facultyService.saveAttendance({
      sessionId: editingSessionId,
      date, subjectId: assignment?.subjectId,
      subjectCode: assignment?.subjectCode,
      subjectName: assignment?.subjectName,
      sectionId, sectionName: section?.name || section?.shortName, records,
    }), 'Attendance saved to the local preview.')
    if (saved) {
      setStatuses({})
      setEditingSessionId('')
    }
  }
  const toggleAlert = id => setSelectedAlerts(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  return <>
    <FeatureHeading eyebrow="CLASS REGISTER" title="Attendance Management" subtitle="Record, review and monitor attendance for your assigned classes." />
    <Tabs items={['Mark Attendance', 'Daily View', 'Class Summary', 'Shortage & Notifications', 'My Attendance']} value={tab} onChange={value => { if (Object.keys(statuses).length && !window.confirm('Discard unsaved attendance changes?')) return; setStatuses({}); setEditingSessionId(''); setTab(value) }} />
    {tab === 'Mark Attendance' && <section className="fw-card">
      <div className="fw-attendance-class-heading"><div><p className="fw-eyebrow">LIVE CLASS REGISTER</p><h2>{section?.shortName || section?.name || 'Choose a section'}</h2><p>{assignment ? `${assignment.subjectCode} · ${assignment.subjectName}` : 'Select a subject to begin taking attendance'} · {date}</p></div><span>{roster.length} students on roster</span></div>
      <div className="fw-attendance-class-metrics" aria-label="Current attendance totals">
        {[
          ['Present', attendanceCounts.present, 'is-present'],
          ['Absent', attendanceCounts.absent, 'is-absent'],
          ['Late', attendanceCounts.late, 'is-late'],
          ['Not marked', Math.max(0, roster.length - attendanceCounts.marked), ''],
        ].map(([label, value, tone]) => <article key={label} className={tone}><span>{label}</span><strong>{value}</strong></article>)}
      </div>
      <div className="fw-toolbar"><SectionSelect sections={data.sections} value={sectionId} onChange={value => { if (!Object.keys(statuses).length || window.confirm('Change section and discard unsaved changes?')) { setSectionId(value); setAssignmentId(data.assignments.find(row => row.sectionId === value)?.id || ''); setStatuses({}); setEditingSessionId('') } }} /><label className="fw-field"><span>Subject</span><select value={assignment?.id || ''} onChange={event => { if (!Object.keys(statuses).length || window.confirm('Change subject and discard unsaved changes?')) { setAssignmentId(event.target.value); setStatuses({}); setEditingSessionId('') } }}>{sectionAssignments.map(row => <option key={row.id} value={row.id}>{row.subjectCode} · {row.subjectName}</option>)}</select></label><label className="fw-field"><span>Class date</span><input type="date" value={date} onChange={event => { if (!Object.keys(statuses).length || window.confirm('Change date and discard unsaved changes?')) { setDate(event.target.value); setStatuses({}); setEditingSessionId('') } }} /></label>{existingSession && <button className="fw-button" onClick={loadExistingSession}><FiEdit2 /> {editingSessionId ? 'Editing existing session' : 'Edit existing session'}</button>}<button className="fw-button" onClick={() => setStatuses(Object.fromEntries(roster.map(row => [row.id, 'PRESENT'])))}><FiCheck /> Mark all present</button></div>
      <div className="fw-counter-row"><small>Keyboard: P present · A absent · L late · ↑/↓ move</small></div>
      <FeatureTable columns={[
        { key: 'rollNumber', label: 'Roll number', render: row => <button className="fw-link-button" aria-current={selected === row.index ? 'true' : undefined} onClick={() => setSelected(row.index)}>{row.rollNumber}</button> }, { key: 'name', label: 'Student' },
        { key: 'attendance', label: 'Mark status', render: row => <div className="fw-status-toggle">{[['PRESENT', 'P'], ['ABSENT', 'A'], ['LATE', 'L']].map(([value, short]) => <button key={value} type="button" className={statuses[row.id] === value ? `is-${value.toLowerCase()}` : ''} onClick={() => setStatuses(current => ({ ...current, [row.id]: value }))} aria-label={`${row.name}: ${value.toLowerCase()}`} aria-pressed={statuses[row.id] === value}>{short}</button>)}</div> },
      ]} rows={visibleRoster.map((row, index) => ({ ...row, index: (currentAttendancePage - 1) * attendancePageSize + index }))} empty="Select an assigned section to load its roster" />
      {roster.length > 0 && <Pager page={currentAttendancePage} pages={attendancePages} total={roster.length} pageSize={attendancePageSize} onChange={next => { setAttendancePage(next); setSelected((next - 1) * attendancePageSize) }} />}
      <div className="fw-footer-actions"><span>{attendanceCounts.marked} of {roster.length} students marked{!attendanceCounts.complete ? ' · mark every student before submitting' : ''}</span><button className="fw-button fw-button-primary" onClick={save} disabled={!roster.length || !attendanceCounts.complete}><FiCheckCircle /> Submit attendance</button></div>
    </section>}
    {tab === 'Daily View' && <section className="fw-card"><label className="fw-field fw-inline-field"><span>Class date</span><input type="date" value={date} onChange={event => setDate(event.target.value)} /></label><FeatureTable columns={[{ key: 'subjectName', label: 'Subject' }, { key: 'sectionName', label: 'Section' }, { key: 'date', label: 'Date' }, { key: 'presentCount', label: 'Present' }, { key: 'absentCount', label: 'Absent' }, { key: 'lateCount', label: 'Late' }, { key: 'status', label: 'Status', render: row => <Status>{row.status}</Status> }]} rows={data.sessions.filter(row => row.date === date)} empty="No class attendance sessions for this date" /></section>}
    {tab === 'Class Summary' && <section className="fw-card"><div className="fw-card-heading"><h2>Attendance by student</h2><SectionSelect sections={data.sections} value={sectionId} onChange={setSectionId} /></div>{(() => { const bands = [{ label: 'Below 75%', min: 0, max: 74 }, { label: '75–84%', min: 75, max: 84 }, { label: '85–94%', min: 85, max: 94 }, { label: '95–100%', min: 95, max: 100 }].map(band => ({ ...band, count: roster.filter(row => row.overallAttendance >= band.min && row.overallAttendance <= band.max).length })); const maxCount = Math.max(1, ...bands.map(row => row.count)); return <><h3>Attendance distribution</h3><div className="fw-histogram" role="img" aria-label={`Attendance distribution: ${bands.map(row => `${row.label}, ${row.count}`).join('; ')}`}>{bands.map(row => <span key={row.label} style={{ '--bar-height': `${Math.max(4, row.count / maxCount * 100)}%` }} title={`${row.label}: ${row.count} students`} />)}</div><div className="fw-chart-labels">{bands.map(row => <span key={row.label}>{row.label} · {row.count}</span>)}</div></> })()}<div className="fw-progress-list">{roster.slice(0, 40).map(row => <div key={row.id}><span>{row.rollNumber} · {row.name}</span><progress max="100" value={row.overallAttendance} /><b className={row.overallAttendance < 75 ? 'fw-risk-text' : ''}>{row.overallAttendance}%</b></div>)}</div><p className="fw-muted">Students below 75% are highlighted. Showing up to 40 students per view.</p></section>}
    {tab === 'Shortage & Notifications' && <section className="fw-card"><FeatureTable columns={[{ key: 'select', label: '', render: row => <input aria-label={`Select ${row.name}`} type="checkbox" checked={selectedAlerts.includes(row.id)} onChange={() => toggleAlert(row.id)} /> }, { key: 'rollNumber', label: 'Roll number' }, { key: 'name', label: 'Student' }, { key: 'sectionName', label: 'Section' }, { key: 'subjectName', label: 'Subject' }, { key: 'attendancePct', label: 'Attendance', render: row => <b className="fw-risk-text">{row.attendancePct}%</b> }]} rows={data.shortageAlerts} empty="No students are below the attendance threshold" /><div className="fw-footer-actions"><span>{selectedAlerts.length} selected</span><button className="fw-button fw-button-primary" onClick={() => setNotificationOpen(true)} disabled={!selectedAlerts.length}>Send notification</button></div></section>}
    {tab === 'My Attendance' && <MyAttendanceSummary data={data} />}
    {notificationOpen && <PortalDialog title="Send attendance notification" onClose={() => setNotificationOpen(false)}><p>Preview: A reminder has been sent to selected students regarding attendance below the required level.</p><label className="fw-field"><span>Message</span><textarea rows="4" value={message} onChange={event => setMessage(event.target.value)} placeholder="Write a reminder for the selected students" /></label><div className="fw-dialog-actions"><button className="fw-button fw-button-primary" onClick={async () => { await action(() => facultyService.sendAttendanceNotification(selectedAlerts, message), 'Notification sent to selected students.'); setNotificationOpen(false); setMessage('') }}>Send notification</button></div></PortalDialog>}
  </>
}

function MarksScreen({ data, action }) {
  const [assessmentId, setAssessmentId] = useState(data.assessments[0]?.id || '')
  const assessment = data.assessments.find(row => row.id === assessmentId)
  const [values, setValues] = useState({})
  const [absent, setAbsent] = useState({})
  const [report, setReport] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkRows, setBulkRows] = useState([])
  const [bulkError, setBulkError] = useState('')
  const [editModal, setEditModal] = useState(false)
  const [reason, setReason] = useState('')
  const roster = data.students.filter(row => !assessment || row.sectionId === assessment.sectionId)
  const locked = assessment?.status === 'Approved'
  const marks = roster.map(student => ({ student, value: values[student.id] ?? assessment?.enteredMarks?.find(row => row.student.id === student.id)?.value ?? student.marks?.[`${assessment?.subjectCode}_Mid1`] ?? '' }))
  const isAbsent = studentId => absent[studentId] ?? assessment?.enteredMarks?.find(row => row.student.id === studentId)?.absent ?? false
  const scores = marks.filter(row => row.value !== '' && !isAbsent(row.student.id)).map(row => Number(row.value)).filter(value => Number.isFinite(value) && value >= 0)
  const average = scores.length ? (scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(1) : '—'
  const passPercentage = scores.length && assessment?.maxMarks
    ? Math.round(scores.filter(score => score >= assessment.maxMarks * 0.4).length / scores.length * 100)
    : 0
  const invalid = marks.some(row => !isAbsent(row.student.id) && !validateMarks(row.value, assessment?.maxMarks))
  const histogram = [0, 0, 0, 0, 0, 0]
  scores.forEach(score => { histogram[Math.min(5, Math.floor(score / Math.max(1, assessment?.maxMarks || 1) * 6))] += 1 })
  const tallestBin = Math.max(1, ...histogram)
  const parseBulkFile = async file => {
    setBulkError('')
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Choose a spreadsheet smaller than 10 MB.')
      if (!/\.(csv|xlsx)$/i.test(file.name)) throw new Error('Choose a CSV or XLSX file.')
      let matrix
      if (/\.csv$/i.test(file.name)) {
        const text = await file.text()
        matrix = text.split(/\r?\n/).filter(Boolean).map(line => {
          const cells = []
          let cell = '', quoted = false
          for (let index = 0; index < line.length; index += 1) {
            const char = line[index]
            if (char === '"' && line[index + 1] === '"' && quoted) { cell += '"'; index += 1 }
            else if (char === '"') quoted = !quoted
            else if (char === ',' && !quoted) { cells.push(cell.trim()); cell = '' }
            else cell += char
          }
          cells.push(cell.trim())
          return cells
        })
      } else {
        const { default: readXlsxFile } = await import('read-excel-file/browser')
        matrix = await readXlsxFile(file)
      }
      if (matrix.length < 2) throw new Error('The spreadsheet needs a header row and at least one student row.')
      const headers = matrix[0].map(value => safeText(value).trim().toLowerCase().replace(/[\s_-]+/g, ''))
      const rollIndex = headers.findIndex(value => ['rollnumber', 'rollno', 'registrationnumber'].includes(value))
      const markIndex = headers.findIndex(value => ['marks', 'score', 'mark'].includes(value))
      const absentIndex = headers.findIndex(value => value === 'absent')
      if (rollIndex < 0 || markIndex < 0) throw new Error('Include Roll Number and Marks columns in the first row.')
      const seenRollNumbers = new Set()
      const parsed = matrix.slice(1).map((row, index) => ({ row, number: index + 2 }))
        .filter(({ row }) => row.some(value => safeText(value).trim())).map(({ row, number }) => {
        const rollNumber = safeText(row[rollIndex]).trim()
        const value = safeText(row[markIndex]).trim()
        const isAbsent = absentIndex >= 0 && ['yes', 'true', '1', 'absent'].includes(safeText(row[absentIndex]).trim().toLowerCase())
        const student = roster.find(item => item.rollNumber.toLowerCase() === rollNumber.toLowerCase())
        const duplicate = seenRollNumbers.has(rollNumber.toLowerCase())
        if (rollNumber) seenRollNumbers.add(rollNumber.toLowerCase())
        const issue = !rollNumber ? 'Roll number is required' : !student ? 'Student roll number is not in this section' : duplicate ? 'Duplicate roll number' : !isAbsent && !validateMarks(value, assessment?.maxMarks) ? `Enter marks from 0 to ${assessment?.maxMarks}` : ''
        return { row: number, rollNumber, value, isAbsent, student, issue }
      })
      setBulkRows(parsed)
    } catch (reason) {
      setBulkRows([])
      setBulkError(reason instanceof Error ? reason.message : String(reason))
    }
  }
  const downloadTemplate = () => {
    const content = ['Roll Number,Marks,Absent', ...roster.map(student => `${student.rollNumber},,`)].join('\r\n')
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = 'faculty-marks-template.csv'; anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <>
    <FeatureHeading eyebrow="ASSESSMENT WORKSPACE" title="Marks Entry" subtitle="Enter, review and report assessment marks for your assigned classes." actions={<><button className="fw-button" onClick={() => setBulkOpen(!bulkOpen)}><FiUpload /> Bulk upload</button><button className="fw-button" onClick={() => setReport(!report)}><FiGrid /> {report ? 'Hide report' : 'Subject report'}</button></>} />
    <section className="fw-marks-overview" aria-label="Assessment overview">
      {[
        ['Assessment', assessment?.name || 'No assessment selected', `${assessment?.subjectCode || '—'} · ${assessment?.sectionName || '—'}`, 'is-primary'],
        ['Class roster', roster.length, 'Students in this assessment', ''],
        ['Scores entered', scores.length, `${Math.max(0, roster.length - scores.length - marks.filter(row => isAbsent(row.student.id)).length)} remaining`, ''],
        ['Class average', average, assessment ? `Out of ${assessment.maxMarks}` : 'No maximum marks set', ''],
      ].map(([label, value, detail, tone]) => <article key={label} className={tone}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}
    </section>
    <section className="fw-card">
      <div className="fw-toolbar"><label className="fw-field"><span>Exam / assessment</span><select value={assessmentId} onChange={event => { setAssessmentId(event.target.value); setValues({}); setAbsent({}) }}>{data.assessments.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>{assessment && <div className="fw-assessment-meta"><span>{assessment.subjectCode} · {assessment.sectionName}</span><span>Max marks: {assessment.maxMarks}</span><Status>{assessment.status}</Status></div>}</div>
      {assessment?.status === 'Rejected' && <p className="fw-remark-banner"><FiAlertCircle /> {assessment.remarks}</p>}
      <div className="fw-footer-actions"><span>{locked ? 'Approved marks are locked' : `Enter a score from 0 to ${assessment?.maxMarks}. Tab/Enter advances the grid.`}</span><button className="fw-button" disabled={locked} onClick={() => setEditModal(true)}><FiEdit2 /> Request edit</button></div>
      <div className="fw-table-scroll"><table className="fw-table fw-marks-table"><thead><tr><th>Roll number</th><th>Student</th><th>Marks / {assessment?.maxMarks}</th><th>Absent</th></tr></thead><tbody>{marks.map(({ student, value }) => <tr key={student.id}><td>{student.rollNumber}</td><td>{student.name}</td><td><input aria-label={`Marks for ${student.name}`} type="number" min="0" max={assessment?.maxMarks} value={value} disabled={locked || isAbsent(student.id)} className={value !== '' && !validateMarks(value, assessment?.maxMarks) ? 'has-error' : ''} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.closest('tr')?.nextElementSibling?.querySelector('input[type="number"]')?.focus() } }} onChange={event => setValues(current => ({ ...current, [student.id]: event.target.value }))} /></td><td><input type="checkbox" aria-label={`${student.name} absent`} checked={isAbsent(student.id)} disabled={locked} onChange={event => setAbsent(current => ({ ...current, [student.id]: event.target.checked }))} /></td></tr>)}</tbody></table></div>
      {invalid && <p className="fw-risk-text" role="alert">Marks must be between 0 and {assessment?.maxMarks}.</p>}
      <div className="fw-footer-actions"><span>{scores.length} entered · {marks.filter(row => isAbsent(row.student.id)).length} absent · Total {scores.reduce((total, score) => total + score, 0)}</span><div className="fw-inline-actions"><button disabled={locked || invalid} className="fw-button" onClick={() => action(() => facultyService.updateAssessmentMarks(assessmentId, marks.map(row => ({ ...row, absent: isAbsent(row.student.id) })), 'Draft'), 'Marks saved as a draft.')}>Save draft</button><button disabled={locked || invalid} className="fw-button fw-button-primary" onClick={() => action(() => facultyService.updateAssessmentMarks(assessmentId, marks.map(row => ({ ...row, absent: isAbsent(row.student.id) })), 'Submitted'), 'Marks submitted for review.')}>Submit marks</button></div></div>
    </section>
    {bulkOpen && <section className="fw-card"><div className="fw-card-heading"><div><h2>Bulk marks upload</h2><p>Upload .csv or .xlsx with Roll Number and Marks columns. Maximum marks: {assessment?.maxMarks}.</p></div><button className="fw-button" onClick={downloadTemplate}><FiDownload /> Download CSV template</button></div><label className="fw-file-drop" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const file = event.dataTransfer.files?.[0]; if (file) parseBulkFile(file) }}><FiUpload /><span>Choose or drop a CSV / XLSX file</span><input type="file" accept=".csv,.xlsx" onChange={event => { const file = event.target.files?.[0]; if (file) parseBulkFile(file) }} /></label>{bulkError && <p className="fw-risk-text" role="alert">{bulkError}</p>}{bulkRows.length > 0 && <><FeatureTable columns={[{ key: 'row', label: 'Row' }, { key: 'rollNumber', label: 'Roll number' }, { key: 'value', label: 'Marks' }, { key: 'issue', label: 'Validation', render: row => row.issue || 'Valid' }]} rows={bulkRows} /><div className="fw-footer-actions"><span>{bulkRows.filter(row => row.issue).length} rows need correction</span><button className="fw-button fw-button-primary" disabled={bulkRows.some(row => row.issue) || locked} onClick={() => { setValues(current => ({ ...current, ...Object.fromEntries(bulkRows.map(row => [row.student.id, row.isAbsent ? '' : row.value])) })); setAbsent(current => ({ ...current, ...Object.fromEntries(bulkRows.map(row => [row.student.id, row.isAbsent])) })); setBulkOpen(false) }}>Apply preview</button></div></>}</section>}
    {report && assessment && <section className="fw-card"><h2>Subject marks report</h2><div className="fw-leave-balance-grid"><article><span>Pass percentage</span><strong>{passPercentage}%</strong></article><article><span>Average</span><strong>{average}</strong></article><article><span>Evaluated</span><strong>{scores.length}/{roster.length}</strong></article></div><h3>Score distribution</h3><div className="fw-histogram">{histogram.map((count, index) => <span key={index} style={{ '--bar-height': `${Math.max(4, count / tallestBin * 100)}%` }} title={`${count} students · bin ${index + 1}`} />)}</div><h3>Top scores</h3><FeatureTable columns={[{ key: 'rollNumber', label: 'Roll number' }, { key: 'name', label: 'Student' }, { key: 'score', label: 'Score' }]} rows={marks.filter(row => row.value !== '' && !isAbsent(row.student.id)).sort((a, b) => Number(b.value) - Number(a.value)).slice(0, 5).map(row => ({ ...row.student, score: row.value }))} empty="No marks entered yet" /></section>}
    {editModal && <PortalDialog title="Request marks edit" onClose={() => setEditModal(false)}><p>Provide a reason for requesting access to edit this assessment.</p><label className="fw-field"><span>Reason</span><textarea rows="3" value={reason} onChange={event => setReason(event.target.value)} required /></label><div className="fw-dialog-actions"><button className="fw-button" onClick={() => setEditModal(false)}>Cancel</button><button className="fw-button fw-button-primary" disabled={!reason.trim()} onClick={async () => { const saved = await action(() => facultyService.requestMarksEdit(assessmentId, reason), 'Marks edit request submitted.'); if (saved) { setEditModal(false); setReason('') } }}>Submit request</button></div></PortalDialog>}
  </>
}

function ExamsScreen({ data }) {
  const [tab, setTab] = useState('Exam list')
  return <><FeatureHeading eyebrow="EXAMINATION OFFICE" title="Exams" subtitle="View department exam schedules, rules and invigilation assignments." /><Tabs items={['Exam list', 'Exam schedule', 'Exam rules', 'Department timetable', 'Halls & duties', 'Results overview']} value={tab} onChange={setTab} />
    <section className="fw-card">
      {tab === 'Exam list' && <FeatureTable columns={[{ key: 'name', label: 'Examination' }, { key: 'type', label: 'Type' }, { key: 'startDate', label: 'Starts' }, { key: 'endDate', label: 'Ends' }, { key: 'semester', label: 'Semester' }, { key: 'status', label: 'Status', render: row => <Status>{row.status}</Status> }]} rows={data.exams} empty="No exams scheduled" />}
      {['Exam schedule', 'Department timetable'].includes(tab) && <FeatureTable columns={[{ key: 'date', label: 'Date' }, { key: 'time', label: 'Time' }, { key: 'subjectCode', label: 'Code' }, { key: 'subjectName', label: 'Subject' }, { key: 'semester', label: 'Semester' }, { key: 'room', label: 'Halls' }, { key: 'invigilator', label: 'Invigilators' }]} rows={data.schedule} empty="No exam schedule is published" />}
      {tab === 'Exam rules' && <ol className="fw-rule-list">{data.rules.map(rule => <li key={rule}>{rule}</li>)}</ol>}
      {tab === 'Halls & duties' && <FeatureTable columns={[{ key: 'date', label: 'Date' }, { key: 'session', label: 'Session' }, { key: 'hallNumber', label: 'Hall' }, { key: 'subject', label: 'Subject' }, { key: 'reportingTime', label: 'Report by' }, { key: 'status', label: 'Status' }]} rows={data.invigilationDuties} empty="No invigilation duties" />}
      {tab === 'Results overview' && <><div className="fw-leave-balance-grid"><article><span>Published examination</span><strong className="fw-category-title">{data.results.examName}</strong><small>Published {data.results.publishedOn}</small></article><article><span>Pass percentage</span><strong>{data.results.passPercentage}%</strong></article><article><span>Students passed</span><strong>{data.results.studentsPassed}<small> / {data.results.studentsAppeared}</small></strong></article><article><span>Backlog entries</span><strong>{data.results.backlogCount}</strong></article></div><h3>Top performers</h3><FeatureTable columns={[{ key: 'rollNumber', label: 'Roll number' }, { key: 'name', label: 'Student' }, { key: 'cgpa', label: 'CGPA' }, { key: 'result', label: 'Result' }]} rows={data.results.toppers} empty="No published topper records" /><h3>Backlog overview</h3><FeatureTable columns={[{ key: 'rollNumber', label: 'Roll number' }, { key: 'name', label: 'Student' }, { key: 'subjectCode', label: 'Subject code' }, { key: 'subjectName', label: 'Subject' }, { key: 'attempts', label: 'Attempts' }]} rows={data.results.backlogs} empty="No backlog records" /><p className="fw-muted">Read-only local result preview. Student marks and results cannot be edited from this screen.</p></>}
    </section>
  </>
}

function ElectivesScreen({ data, action }) {
  const [remarks, setRemarks] = useState({})
  const [selected, setSelected] = useState([])
  const [rows, setRows] = useState(data)
  const pending = rows.filter(row => row.status === 'Pending')
  const decide = async (id, status) => {
    const previous = rows
    setRows(current => current.map(row => row.id === id ? { ...row, status } : row))
    const ok = await action(() => facultyService.updateElectiveApproval(id, status, remarks[id] || ''), `${status} selection updated.`)
    if (!ok) setRows(previous)
  }
  const decideSelected = async status => {
    const previous = rows
    const selectedRows = rows.filter(row => selected.includes(row.id) && row.status === 'Pending')
    setRows(current => current.map(row => selected.includes(row.id) ? { ...row, status } : row))
    const ok = await action(() => facultyService.updateElectiveApprovals(selectedRows.map(row => ({
      id: row.id,
      status,
      remarks: remarks[row.id] || row.remarks || (status === 'Approved' ? 'Approved in bulk' : 'Rejected in bulk'),
    }))), `Selected requests ${status.toLowerCase()}.`)
    if (!ok) setRows(previous)
    else setSelected([])
  }
  return <><FeatureHeading eyebrow="STUDENT CHOICES" title="Elective Approvals" subtitle="Review requests and record an approval decision with a remark." /><section className="fw-card">
    <div className="fw-footer-actions"><span>{pending.length} pending requests</span><div className="fw-inline-actions"><button className="fw-button" disabled={!selected.length} onClick={() => decideSelected('Approved')}>Approve selected</button><button className="fw-button" disabled={!selected.length} onClick={() => decideSelected('Rejected')}>Reject selected</button></div></div>
    <FeatureTable columns={[{ key: 'select', label: '', render: row => row.status === 'Pending' && <input type="checkbox" aria-label={`Select ${row.studentName}`} checked={selected.includes(row.id)} onChange={() => setSelected(current => current.includes(row.id) ? current.filter(id => id !== row.id) : [...current, row.id])} /> }, { key: 'studentName', label: 'Student' }, { key: 'rollNumber', label: 'Roll number' }, { key: 'electiveName', label: 'Elective' }, { key: 'cgpa', label: 'CGPA' }, { key: 'prerequisiteStatus', label: 'Prerequisite' }, { key: 'status', label: 'Status', render: row => <Status>{row.status}</Status> }, { key: 'remarks', label: 'Remark', render: row => <input aria-label={`Remark for ${row.studentName}`} value={remarks[row.id] ?? row.remarks} disabled={row.status !== 'Pending'} onChange={event => setRemarks(current => ({ ...current, [row.id]: event.target.value }))} /> }, { key: 'actions', label: 'Decision', render: row => row.status === 'Pending' ? <div className="fw-inline-actions"><button className="fw-button fw-button-small" onClick={() => decide(row.id, 'Approved')}>Approve</button><button className="fw-button fw-button-small" onClick={() => decide(row.id, 'Rejected')}>Reject</button></div> : '—' }]} rows={rows} empty="No elective approval requests" />
  </section></>
}

function MaterialsScreen({ data, action }) {
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('')
  const [type, setType] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [rows, setRows] = useState(data.materials)
  const [uploadSubject, setUploadSubject] = useState(data.allocations[0]?.subjectId || '')
  const [visibleSections, setVisibleSections] = useState(data.allocations.filter(row => row.subjectId === (data.allocations[0]?.subjectId || '')).map(row => row.sectionId))
  const [uploadProgress, setUploadProgress] = useState(0)
  const [fileError, setFileError] = useState('')
  const [viewMaterial, setViewMaterial] = useState(null)
  const [editMaterial, setEditMaterial] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editSections, setEditSections] = useState([])
  const [editError, setEditError] = useState('')
  const allowedFile = candidate => candidate.size <= 10 * 1024 * 1024 && /\.(pdf|pptx?|docx?|xlsx?|zip)$/i.test(candidate.name)
  const uploadAllocations = data.allocations.filter(row => row.subjectId === uploadSubject)
  const filtered = rows.filter(row => (!subject || row.subjectId === subject) && (!type || row.type === type) && `${row.title} ${row.subjectName} ${row.unitTitle}`.toLowerCase().includes(search.toLowerCase()))
  const materialSubjects = new Set(filtered.map(row => row.subjectId)).size
  const materialSections = new Set(filtered.flatMap(row => row.visibleSections || [])).size
  const materialDownloads = filtered.reduce((total, row) => total + (Number(row.downloadsCount) || 0), 0)
  const selectUploadFile = candidate => {
    setFile(candidate || null)
    setFileError(candidate && !allowedFile(candidate) ? 'Choose a supported file smaller than 10 MB.' : '')
    setUploadProgress(0)
  }
  const upload = async event => {
    event.preventDefault()
    if (!file || !allowedFile(file) || !title.trim() || !uploadSubject || !visibleSections.length) return
    try {
      await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onprogress = event => {
          if (event.lengthComputable) setUploadProgress(Math.min(90, Math.round(event.loaded / event.total * 90)))
        }
        reader.onload = () => resolve()
        reader.onerror = () => reject(reader.error || new Error('The selected file could not be read.'))
        reader.readAsArrayBuffer(file)
      })
      setUploadProgress(100)
      const allocation = uploadAllocations[0]
      const created = await action(() => facultyService.uploadStudyMaterial({
        title: title.trim(), fileName: file.name, fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        subjectId: allocation.subjectId, subjectName: allocation.subjectName, subjectCode: allocation.subjectCode,
        unit: 1, unitTitle: 'New teaching material', type: file.name.split('.').pop().toUpperCase(),
        visibleSections, downloadsCount: 0,
      }), 'Material metadata saved to the local preview. The original file is not retained.')
      if (created) {
        setUploadOpen(false)
        setTitle('')
        setFile(null)
        setUploadProgress(0)
      }
    } catch (reason) {
      setFileError(reason instanceof Error ? reason.message : String(reason))
    }
  }
  const beginEdit = row => {
    setEditMaterial(row)
    setEditTitle(row.title)
    setEditSections(row.visibleSections)
    setEditError('')
  }
  const saveEdit = async event => {
    event.preventDefault()
    if (!editMaterial || !editTitle.trim() || !editSections.length) return
    const updated = await action(() => facultyService.updateStudyMaterial(editMaterial.id, { title: editTitle.trim(), visibleSections: editSections }), 'Study material updated.')
    if (updated) {
      setRows(current => current.map(row => row.id === updated.id ? updated : row))
      setEditMaterial(null)
    } else {
      setEditError('The material could not be updated. Retry the save.')
    }
  }
  return <><FeatureHeading eyebrow="LEARNING RESOURCES" title="Study Materials" subtitle="Organize and share teaching resources with your assigned classes." actions={<button className="fw-button fw-button-primary" onClick={() => setUploadOpen(true)}><FiUpload /> Upload material</button>} />
    <section className="fw-material-overview" aria-label="Study material overview">
      {[
        ['Resources shown', filtered.length, 'Matches the current filters'],
        ['Subjects covered', materialSubjects, 'With shared learning resources'],
        ['Sections reached', materialSections, 'Assigned class sections'],
        ['Total downloads', materialDownloads, 'Across the displayed resources'],
      ].map(([label, value, detail], index) => <article key={label} className={index === 0 ? 'is-primary' : ''}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}
    </section>
    <section className="fw-card"><div className="fw-toolbar"><label className="fw-search"><FiSearch /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search material, unit or subject" /></label><label className="fw-field"><span>Subject</span><select value={subject} onChange={event => setSubject(event.target.value)}><option value="">All subjects</option>{data.allocations.map(row => <option key={row.id} value={row.subjectId}>{row.subjectCode} · {row.subjectName}</option>)}</select></label><label className="fw-field"><span>Type</span><select value={type} onChange={event => setType(event.target.value)}><option value="">All types</option>{[...new Set(rows.map(row => row.type))].map(item => <option key={item}>{item}</option>)}</select></label></div>
      <FeatureTable columns={[{ key: 'title', label: 'Material' }, { key: 'subjectName', label: 'Subject' }, { key: 'unitTitle', label: 'Unit' }, { key: 'type', label: 'Type' }, { key: 'visibleSections', label: 'Visible to', render: row => row.visibleSections.map(id => data.allocations.find(item => item.sectionId === id)?.sectionName || id).join(', ') }, { key: 'downloadsCount', label: 'Downloads' }, { key: 'actions', label: 'Actions', render: row => <div className="fw-inline-actions"><button className="fw-icon-button" aria-label={`View ${row.title}`} onClick={() => setViewMaterial(row)}><FiFileText /></button><button className="fw-icon-button" aria-label={`Edit ${row.title}`} onClick={() => beginEdit(row)}><FiEdit2 /></button><button className="fw-icon-button" aria-label={`Delete ${row.title}`} onClick={async () => { if (!window.confirm(`Delete ${row.title}?`)) return; const ok = await action(() => facultyService.deleteStudyMaterial(row.id), 'Material removed.'); if (ok) setRows(current => current.filter(item => item.id !== row.id)) }}><FiTrash2 /></button></div> }]} rows={filtered} empty="No materials match your search" />
    </section>
    {uploadOpen && <PortalDialog title="Upload study material" onClose={() => setUploadOpen(false)}><form className="fw-form" onSubmit={upload}><label className="fw-field"><span>Material title</span><input required value={title} onChange={event => setTitle(event.target.value)} /></label><label className="fw-field"><span>Subject</span><select value={uploadSubject} onChange={event => { setUploadSubject(event.target.value); setVisibleSections(data.allocations.filter(row => row.subjectId === event.target.value).map(row => row.sectionId)) }}>{[...new Map(data.allocations.map(row => [row.subjectId, row])).values()].map(row => <option key={row.subjectId} value={row.subjectId}>{row.subjectCode} · {row.subjectName}</option>)}</select></label><label className="fw-file-drop"><FiUpload /><span>{file?.name || 'Choose a PDF, office document or ZIP (max 10 MB)'}</span><input type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.zip" onChange={event => selectUploadFile(event.target.files?.[0])} /></label>{fileError && <p className="fw-risk-text" role="alert">{fileError}</p>}<label className="fw-field"><span>Visible sections</span><select multiple value={visibleSections} onChange={event => setVisibleSections([...event.target.selectedOptions].map(option => option.value))}>{uploadAllocations.map(row => <option key={row.sectionId} value={row.sectionId}>{row.sectionName}</option>)}</select></label>{uploadProgress > 0 && <label className="fw-field"><span>Reading file locally · {uploadProgress}%</span><progress max="100" value={uploadProgress} /></label>}<p className="fw-muted">The selected file is read locally for preview; only fixture metadata is saved.</p><div className="fw-dialog-actions"><button className="fw-button fw-button-primary" disabled={!file || !!fileError || !visibleSections.length || !title.trim()}>Upload</button></div></form></PortalDialog>}
    {viewMaterial && <PortalDialog title={viewMaterial.title} onClose={() => setViewMaterial(null)}><DetailPairs rows={[['Subject', viewMaterial.subjectName], ['Unit', viewMaterial.unitTitle], ['Type', viewMaterial.type], ['File', viewMaterial.fileName], ['File size', viewMaterial.fileSize], ['Downloads', viewMaterial.downloadsCount], ['Sections', viewMaterial.visibleSections.map(id => data.allocations.find(item => item.sectionId === id)?.sectionName || id).join(', ') || 'None']]} /><p className="fw-muted">Original file content is not included in local fixture data. Download a metadata preview instead.</p><button className="fw-button" onClick={() => downloadFixtureDetails(viewMaterial)}><FiDownload /> Download fixture details</button></PortalDialog>}
    {editMaterial && <PortalDialog title="Edit study material" onClose={() => setEditMaterial(null)}><form className="fw-form" onSubmit={saveEdit}><label className="fw-field"><span>Title</span><input required value={editTitle} onChange={event => setEditTitle(event.target.value)} /></label><label className="fw-field"><span>Visible sections</span><select multiple value={editSections} onChange={event => setEditSections([...event.target.selectedOptions].map(option => option.value))}>{data.allocations.filter(row => row.subjectId === editMaterial.subjectId).map(row => <option key={row.sectionId} value={row.sectionId}>{row.sectionName}</option>)}</select></label>{editError && <p className="fw-risk-text" role="alert">{editError}</p>}<div className="fw-dialog-actions"><button className="fw-button" type="button" onClick={() => setEditMaterial(null)}>Cancel</button><button className="fw-button fw-button-primary" disabled={!editTitle.trim() || !editSections.length}>Save changes</button></div></form></PortalDialog>}
  </>
}

function LeaveScreen({ data, action }) {
  const [form, setForm] = useState({ leaveType: 'Casual Leave (CL)', fromDate: '', toDate: '', reason: '', isHalfDay: false, attachmentName: '' })
  const [attachmentError, setAttachmentError] = useState('')
  const [history, setHistory] = useState(data.history)
  const overlap = hasLeaveOverlap(form.fromDate, form.toDate, history)
  const days = calculateLeaveDays(form.fromDate, form.toDate, form.isHalfDay)
  const balance = data.balances.find(row => row.type === form.leaveType)
  const exceedsBalance = days > (balance?.available || 0)
  const pendingRequests = history.filter(row => row.status === 'Pending').length
  const approvedRequests = history.filter(row => row.status === 'Approved')
  const approvedDays = approvedRequests.reduce((total, row) => total + (Number(row.daysCount) || 0), 0)
  const submit = async event => {
    event.preventDefault()
    if (!days || overlap || exceedsBalance || attachmentError) return
    const created = await action(() => facultyService.applyLeave({ ...form, daysCount: days }), 'Leave request submitted to local preview.')
    if (created) {
      setHistory(current => [created, ...current])
      setForm(current => ({ ...current, fromDate: '', toDate: '', reason: '' }))
    }
  }
  return <><FeatureHeading eyebrow="TIME OFF" title="Leave Management" subtitle="Review your balance and manage leave requests." />
    <section className="fw-leave-overview" aria-label="Leave request overview">
      {[
        ['Leave categories', data.balances.length, 'Balances available to you'],
        ['Pending requests', pendingRequests, 'Awaiting a decision'],
        ['Approved days', approvedDays, 'Across approved requests'],
        ['Request history', history.length, 'Submitted leave requests'],
      ].map(([label, value, detail], index) => <article key={label} className={index === 1 && pendingRequests ? 'is-warning' : index === 0 ? 'is-primary' : ''}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}
    </section>
    <section className="fw-leave-balance-grid">{data.balances.map(row => <article key={row.code}><span>{row.code} · {row.type}</span><strong>{row.available}<small> / {row.totalAllocated} available</small></strong><progress max={row.totalAllocated} value={row.available} /></article>)}</section>
    <div className="fw-two-column"><section className="fw-card"><div className="fw-card-heading"><h2>Apply for leave</h2></div><form className="fw-form" onSubmit={submit}><label className="fw-field"><span>Leave type</span><select value={form.leaveType} onChange={event => setForm({ ...form, leaveType: event.target.value })}>{data.balances.map(row => <option key={row.code}>{row.type}</option>)}</select></label><div className="fw-form-row"><label className="fw-field"><span>From</span><input required type="date" value={form.fromDate} onChange={event => setForm({ ...form, fromDate: event.target.value })} /></label><label className="fw-field"><span>To</span><input required type="date" value={form.toDate} min={form.fromDate} onChange={event => setForm({ ...form, toDate: event.target.value })} /></label></div><label className="fw-checkbox"><input type="checkbox" checked={form.isHalfDay} onChange={event => setForm({ ...form, isHalfDay: event.target.checked })} /> Half-day</label><p className="fw-muted">Calculated duration: {days || '—'} working day(s)</p>{form.isHalfDay && form.fromDate !== form.toDate && form.toDate && <p className="fw-risk-text" role="alert">Half-day leave must be for a single date.</p>}{overlap && <p className="fw-risk-text" role="alert">Dates overlap with an existing leave request.</p>}{exceedsBalance && <p className="fw-risk-text" role="alert">Requested duration exceeds your {balance?.code} balance of {balance?.available} day(s).</p>}<label className="fw-field"><span>Reason</span><textarea required minLength="10" rows="3" value={form.reason} onChange={event => setForm({ ...form, reason: event.target.value })} /></label><label className="fw-field"><span>Supporting document (optional)</span><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={event => { const file = event.target.files?.[0]; const valid = !file || (file.size <= 10 * 1024 * 1024 && /\.(pdf|jpe?g|png)$/i.test(file.name)); setAttachmentError(valid ? '' : 'Choose a PDF or image smaller than 10 MB.'); if (valid) setForm({ ...form, attachmentName: file?.name || '' }) }} /></label>{attachmentError && <p className="fw-risk-text" role="alert">{attachmentError}</p>}{form.attachmentName && <small className="fw-muted">{form.attachmentName} · local preview only</small>}<button className="fw-button fw-button-primary" disabled={overlap || exceedsBalance || !days || !!attachmentError}>Submit request</button></form></section>
      <section className="fw-card"><div className="fw-card-heading"><h2>Request history</h2></div><div className="fw-timeline">{history.map(row => <article key={row.id}><i /><div><strong>{row.leaveType} · {row.daysCount} day(s)</strong><small>{row.fromDate} — {row.toDate} · Applied {row.appliedOn}</small><Status>{row.status}</Status>{row.approvalRemarks && <p>{row.approvalRemarks}</p>}</div>{row.status === 'Pending' && <button className="fw-icon-button" aria-label="Cancel pending leave" onClick={async () => { if (!window.confirm('Cancel this pending leave request?')) return; const ok = await action(() => facultyService.cancelLeave(row.id), 'Pending leave cancelled.'); if (ok) setHistory(current => current.filter(item => item.id !== row.id)) }}><FiX /></button>}</article>)}</div></section></div>
  </>
}

function DocumentsScreen({ data, action }) {
  const [rows, setRows] = useState(data)
  const [fileError, setFileError] = useState('')
  const [selectedDocument, setSelectedDocument] = useState(null)
  const upload = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    const valid = file.size <= 10 * 1024 * 1024 && /\.(pdf|jpe?g|png|docx?)$/i.test(file.name)
    if (!valid) {
      setFileError('Choose a PDF, image or Word document smaller than 10 MB.')
      event.target.value = ''
      return
    }
    setFileError('')
    const created = await action(() => facultyService.uploadDocument({ title: file.name.replace(/\.[^.]+$/, ''), category: 'Faculty uploads', fileName: file.name, fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`, validUntil: 'Not specified' }), 'Document uploaded to local preview.')
    if (created) setRows(current => [created, ...current])
  }
  return <><FeatureHeading eyebrow="FACULTY RECORDS" title="Documents" subtitle="View and organize your employment, qualification and certification records." actions={<label className="fw-button fw-button-primary"><FiUpload /> Upload document<input hidden type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={upload} /></label>} />
    {fileError && <p className="fw-inline-error" role="alert">{fileError}</p>}
    <section className="fw-leave-balance-grid">{[...new Set(rows.map(row => row.category))].map(category => <article key={category}><span>Category</span><strong className="fw-category-title">{category}</strong><small>{rows.filter(row => row.category === category).length} documents</small></article>)}</section>
    <section className="fw-card"><FeatureTable columns={[{ key: 'title', label: 'Document' }, { key: 'category', label: 'Category' }, { key: 'fileName', label: 'File' }, { key: 'uploadedOn', label: 'Uploaded' }, { key: 'validUntil', label: 'Valid until' }, { key: 'status', label: 'Status', render: row => <Status>{row.status}</Status> }, { key: 'action', label: 'Action', render: row => <button className="fw-button fw-button-small" onClick={() => setSelectedDocument(row)}>View / download</button> }]} rows={rows} empty="No faculty documents on record" /></section>
    <section className="fw-card"><h2>Expired documents</h2><FeatureTable columns={[{ key: 'title', label: 'Document' }, { key: 'fileName', label: 'File' }, { key: 'validUntil', label: 'Expired on' }, { key: 'status', label: 'Status' }]} rows={rows.filter(row => row.status === 'Expired')} empty="No expired documents" /></section>
    {selectedDocument && <PortalDialog title={selectedDocument.title} onClose={() => setSelectedDocument(null)}><DetailPairs rows={[['Category', selectedDocument.category], ['File', selectedDocument.fileName], ['Size', selectedDocument.fileSize], ['Uploaded', selectedDocument.uploadedOn], ['Valid until', selectedDocument.validUntil], ['Status', selectedDocument.status]]} /><p className="fw-muted">Original file content is not included in local fixture data. Download a metadata preview instead.</p><button className="fw-button" onClick={() => downloadFixtureDetails(selectedDocument)}><FiDownload /> Download fixture details</button></PortalDialog>}
  </>
}

function MeetingsScreen({ data, action }) {
  const [tab, setTab] = useState('Meetings')
  const [selected, setSelected] = useState(null)
  const [minutes, setMinutes] = useState('')
  const [meetings, setMeetings] = useState(data.meetings)
  const [events, setEvents] = useState(data.events)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventTab, setEventTab] = useState('Overview')
  const saveMinutes = async () => {
    const saved = await action(() => facultyService.updateMeetingMinutes(selected.id, minutes), 'Meeting minutes saved locally.')
    if (saved) {
      setMeetings(current => current.map(row => row.id === selected.id ? { ...row, minutes } : row))
      setSelected(current => ({ ...current, minutes }))
    }
  }
  const register = async event => {
    const ok = await action(() => facultyService.registerForEvent(event.id), 'Registered for event.')
    if (ok) {
      const updated = { ...event, registered: true, registrationsCount: event.registrationsCount + 1 }
      setEvents(current => current.map(item => item.id === event.id ? updated : item))
      setSelectedEvent(current => current?.id === event.id ? updated : current)
    }
  }
  return <>
    <FeatureHeading eyebrow="CAMPUS CALENDAR" title="Meetings & Events" subtitle="Review invitations, event schedules and meeting documents." />
    <Tabs items={['Meetings', 'Events']} value={tab} onChange={setTab} />
    {tab === 'Meetings' && <section className="fw-card">
      <FeatureTable columns={[
        { key: 'date', label: 'Date' }, { key: 'title', label: 'Meeting' }, { key: 'organizer', label: 'Organizer' },
        { key: 'time', label: 'Time' }, { key: 'venue', label: 'Venue' },
        { key: 'myAttendance', label: 'My response', render: row => <Status>{row.myAttendance}</Status> },
        { key: 'action', label: 'Details', render: row => <button className="fw-button fw-button-small" onClick={() => { setSelected(row); setMinutes(row.minutes || '') }}>View details</button> },
      ]} rows={meetings} empty="No meetings scheduled" />
    </section>}
    {tab === 'Events' && <>
      <section className="fw-leave-balance-grid">
        <article><span>Upcoming events</span><strong>{events.filter(row => row.status !== 'Completed').length}</strong></article>
        <article><span>Open registrations</span><strong>{events.filter(row => !row.registered).length}</strong></article>
        <article><span>Registrations</span><strong>{events.reduce((total, row) => total + row.registrationsCount, 0)}</strong></article>
      </section>
      <section className="fw-card"><FeatureTable columns={[
        { key: 'title', label: 'Event' }, { key: 'date', label: 'Date' }, { key: 'location', label: 'Location' },
        { key: 'role', label: 'Faculty role' }, { key: 'registrationsCount', label: 'Registrations' },
        { key: 'status', label: 'Status' },
        { key: 'details', label: 'Details', render: row => <button className="fw-button fw-button-small" onClick={() => { setSelectedEvent(row); setEventTab('Overview') }}>View</button> },
        { key: 'action', label: 'Registration', render: row => <button disabled={row.registered} className="fw-button fw-button-small" onClick={() => register(row)}>{row.registered ? 'Registered' : 'Register'}</button> },
      ]} rows={events} empty="No upcoming events" /></section>
    </>}
    {selected && <PortalDialog title={selected.title} onClose={() => setSelected(null)}>
      <DetailPairs rows={[
        ['Organizer', selected.organizer], ['Date / time', `${selected.date} · ${selected.time}`], ['Venue', selected.venue],
        ['My attendance', selected.myAttendance], ['Agenda', selected.agenda], ['Documents', selected.documents?.join(', ') || 'None'],
      ]} />
      <h3>Participants ({selected.participantsCount})</h3>
      <FeatureTable columns={[{ key: 'name', label: 'Participant' }]} rows={(selected.participants || []).map((name, index) => ({ id: `${selected.id}-participant-${index}`, name }))} empty="Participant list unavailable" />
      <label className="fw-field"><span>Meeting minutes</span><textarea rows="4" value={minutes} onChange={event => setMinutes(event.target.value)} placeholder="Minutes are stored in this local session" /></label>
      <div className="fw-dialog-actions"><button className="fw-button" onClick={async () => {
        const ok = await action(() => facultyService.updateMeetingAttendance(selected.id, 'Confirmed'), 'Meeting attendance confirmed.')
        if (ok) {
          setMeetings(current => current.map(row => row.id === selected.id ? { ...row, myAttendance: 'Confirmed' } : row))
          setSelected(current => ({ ...current, myAttendance: 'Confirmed' }))
        }
      }}>Confirm attendance</button><button className="fw-button fw-button-primary" onClick={saveMinutes}>Save minutes</button></div>
    </PortalDialog>}
    {selectedEvent && <PortalDialog title={selectedEvent.title} onClose={() => setSelectedEvent(null)}>
      <Tabs items={['Overview', 'Schedule', 'Participants', 'Gallery']} value={eventTab} onChange={setEventTab} />
      {eventTab === 'Overview' && <><DetailPairs rows={[['Dates', selectedEvent.date], ['Location', selectedEvent.location], ['Faculty role', selectedEvent.role], ['Registrations', selectedEvent.registrationsCount], ['Status', selectedEvent.status]]} /><p>{selectedEvent.description}</p><button disabled={selectedEvent.registered} className="fw-button fw-button-primary" onClick={() => register(selectedEvent)}>{selectedEvent.registered ? 'Registered' : 'Register for event'}</button></>}
      {eventTab === 'Schedule' && <FeatureTable columns={[{ key: 'time', label: 'Time' }, { key: 'activity', label: 'Activity' }, { key: 'venue', label: 'Venue' }]} rows={selectedEvent.schedule.map((row, index) => ({ ...row, id: `${selectedEvent.id}-slot-${index}` }))} empty="No event schedule published" />}
      {eventTab === 'Participants' && <FeatureTable columns={[{ key: 'name', label: 'Participant' }, { key: 'role', label: 'Registration' }]} rows={selectedEvent.participants.map((name, index) => ({ id: `${selectedEvent.id}-attendee-${index}`, name, role: 'Registered' }))} empty="No participants registered" />}
      {eventTab === 'Gallery' && <div className="fw-subject-grid">{selectedEvent.gallery.map((caption, index) => <article className="fw-subject-card" key={`${selectedEvent.id}-gallery-${index}`}><span className="fw-subject-code">Event gallery · {index + 1}</span><h3>{caption}</h3><p>Gallery preview item</p></article>)}</div>}
    </PortalDialog>}
  </>
}

function ProfileScreen({ data, action }) {
  const [form, setForm] = useState({ fullName: data.fullName, mobile: data.mobile, alternatePhone: data.alternatePhone, address: data.address.city, bio: data.bio })
  const [photo, setPhoto] = useState(null)
  const update = key => event => setForm(current => ({ ...current, [key]: event.target.value }))
  const updatePhoto = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    const saved = await action(() => facultyService.updateProfile({ avatarFileName: file.name }), 'Profile photo selected for the local preview.')
    if (saved) setPhoto(file)
  }
  return <><FeatureHeading eyebrow="FACULTY ACCOUNT" title="My Profile" subtitle="Review your faculty information and update editable contact details." />
    <section className="fw-profile-hero"><span className="fw-profile-avatar">{data.fullName.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><div><h2>{data.fullName}</h2><p>{data.designation} · {data.department}</p><Status>{data.status}</Status>{photo && <small className="fw-muted">{photo.name} selected</small>}</div><label className="fw-button"><FiUpload /> Update photo<input hidden type="file" accept="image/*" onChange={updatePhoto} /></label></section>
    {photo && <p className="fw-success-note">Selected profile photo: {photo.name} (local preview only).</p>}
    <div className="fw-two-column"><section className="fw-card"><h2>Personal & professional details</h2><form className="fw-form" onSubmit={async event => { event.preventDefault(); const updated = await action(() => facultyService.updateProfile({ ...form, address: { ...data.address, city: form.address } }), 'Profile details updated locally.'); if (updated?.fullName) window.dispatchEvent(new CustomEvent('btech-profile-updated', { detail: { fullName: updated.fullName } })) }}><label className="fw-field"><span>Full name</span><input value={form.fullName} onChange={update('fullName')} /></label><label className="fw-field"><span>Email</span><input value={data.email} disabled /></label><label className="fw-field"><span>Mobile</span><input value={form.mobile} onChange={update('mobile')} /></label><label className="fw-field"><span>City</span><input value={form.address} onChange={update('address')} /></label><label className="fw-field"><span>Qualification (read-only)</span><textarea value={data.qualification} readOnly rows="2" /></label><label className="fw-field"><span>Designation (read-only)</span><input value={data.designation} readOnly /></label><label className="fw-field"><span>About</span><textarea rows="3" value={form.bio} onChange={update('bio')} /></label><button className="fw-button fw-button-primary">Save profile</button></form></section><section className="fw-card"><h2>Employment details</h2><DetailPairs rows={[['Faculty ID', data.facultyId], ['Employee ID', data.employeeId], ['Date joined', data.dateOfJoining], ['Experience', `${data.experienceYears} years`], ['Specialization', data.specialization], ['Cabin', data.cabinRoom], ['Consultation hours', data.consultationHours]]} /><h3>Status history</h3><div className="fw-timeline"><article><i /><div><strong>Active faculty</strong><small>Current employment status · {data.dateOfJoining}</small></div></article></div><p className="fw-muted">Documents are available in the Documents workspace.</p></section></div>
  </>
}

function NotificationsScreen({ data, action, reload }) {
  return <><FeatureHeading eyebrow="CAMPUS UPDATES" title="Notifications" subtitle="Review academic announcements and reminders." actions={<button className="fw-button" onClick={() => action(() => facultyService.markAllNotificationsRead(), 'Notifications marked as read.', reload)}>Mark all read</button>} /><section className="fw-card"><div className="fw-notifications">{data.map(row => <article key={row.id} className={!row.read ? 'is-unread' : ''}><span className="fw-notification-icon"><FiAlertCircle /></span><div><div className="fw-card-heading"><h2>{row.title}</h2><Status>{row.priority}</Status></div><p>{row.message}</p><small>{row.sender} · {row.date} · {row.timestamp}</small></div>{!row.read && <button className="fw-button fw-button-small" onClick={() => action(() => facultyService.markNotificationRead(row.id), 'Notification marked as read.', reload)}>Mark read</button>}</article>)}</div>{!data.length && <FacultyEmptyState title="You're all caught up" description="New campus announcements will appear here." />}</section></>
}

function FeatureHeading({ eyebrow, title, subtitle, actions }) {
  return <header className="fw-heading"><div><p className="portal-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{subtitle}</p></div>{actions && <div className="fw-heading-actions">{actions}</div>}</header>
}

function DetailPairs({ rows }) {
  return <dl className="fw-detail-pairs">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl>
}

function Pager({ page, pages, total, pageSize: pageLimit, onChange }) {
  const first = total ? (page - 1) * (pageLimit || Math.ceil(total / pages)) + 1 : 0
  const last = total ? Math.min(total, page * (pageLimit || Math.ceil(total / pages))) : 0
  return <footer className="fw-pager"><span>{total ? `Page ${page} of ${pages} · showing ${first}-${last} of ${total} records${pageLimit ? ` (${pageLimit} per page)` : ''}` : '0 records'}</span><div><button disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button><button disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button></div></footer>
}

function UnavailableScreen({ screen }) {
  const title = screen === '403' ? 'Access denied' : screen === 'session-expired' ? 'Session expired' : 'Page not found'
  const description = screen === '403' ? 'Your account does not have permission to view this faculty workspace.' : screen === 'session-expired' ? 'Sign in again to continue to your teaching workspace.' : 'The requested faculty page could not be found.'
  return <section className="fw-card"><FacultyEmptyState icon={FiAlertCircle} title={title} description={description} actionLabel="Return to dashboard" actionLink="/faculty-portal/dashboard" /></section>
}

export default function FacultyWorkspacePage() {
  const { screen = 'dashboard' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loadResult, setLoadResult] = useState({ key: '', data: null, error: '' })
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const requestKey = `${screen}:${refreshKey}`
  const data = loadResult.key === requestKey ? loadResult.data : null
  const loading = loadResult.key !== requestKey
  const error = actionError || (loadResult.key === requestKey ? loadResult.error : '')
  const reload = useCallback(() => {
    setActionError('')
    setNotice('')
    setRefreshKey(value => value + 1)
  }, [])
  useEffect(() => {
    let active = true
    loadScreen(screen)
      .then(result => { if (active) setLoadResult({ key: requestKey, data: result, error: '' }) })
      .catch(reason => { if (active) setLoadResult({ key: requestKey, data: null, error: reason instanceof Error ? reason.message : String(reason) }) })
    return () => { active = false }
  }, [screen, refreshKey, requestKey])
  const runAction = async (operation, success, after) => {
    setNotice('')
    setActionError('')
    try {
      const result = await operation()
      setNotice(success)
      if (after) await after()
      else setRefreshKey(value => value + 1)
      return result
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason)
      setActionError(message)
      return false
    }
  }
  const title = titleFor(screen)
  if (['403', '404', 'session-expired'].includes(screen)) return <PortalLayout title={title}><main className="portal-page fw-page"><UnavailableScreen screen={screen} /></main></PortalLayout>
  if (!routes.some(route => route.screen === screen) || screen === 'dashboard') return <PortalLayout title="Page not found"><main className="portal-page fw-page"><UnavailableScreen screen="404" /></main></PortalLayout>
  return <PortalLayout title={title}><main className="portal-page fw-page">
    {loading && !data ? <section className="fw-card" aria-busy="true"><FacultyCardSkeleton count={4} height="110px" /></section> : error && !data ? <section className="fw-error-card" role="alert"><FiAlertCircle /><div><h2>Could not load {title.toLowerCase()}</h2><p>{error}</p><button className="fw-button fw-button-primary" onClick={reload}>Retry</button></div></section> : <>
      {error && <p className="fw-inline-error" role="alert">{error}</p>}
      {notice && <p className="fw-inline-success" role="status"><FiCheckCircle />{notice}</p>}
      {screen === 'students' && <StudentsScreen data={data} searchParams={searchParams} setSearchParams={setSearchParams} />}
      {screen === 'subjects' && <SubjectsScreen data={data} />}
      {screen === 'timetable' && <TimetableScreen data={data} />}
      {screen === 'attendance' && <AttendanceScreen data={data} action={runAction} />}
      {screen === 'my-attendance' && <MyAttendanceScreen data={data} />}
      {screen === 'marks' && <MarksScreen data={data} action={runAction} />}
      {screen === 'exams' && <ExamsScreen data={data} />}
      {screen === 'electives' && <ElectivesScreen data={data} action={runAction} />}
      {screen === 'materials' && <MaterialsScreen data={data} action={runAction} />}
      {screen === 'leave' && <LeaveScreen data={data} action={runAction} />}
      {screen === 'documents' && <DocumentsScreen data={data} action={runAction} />}
      {screen === 'meetings' && <MeetingsScreen data={data} action={runAction} />}
      {screen === 'profile' && <ProfileScreen data={data} action={runAction} />}
      {screen === 'notifications' && <NotificationsScreen data={data} action={runAction} reload={reload} />}
    </>}
  </main></PortalLayout>
}
