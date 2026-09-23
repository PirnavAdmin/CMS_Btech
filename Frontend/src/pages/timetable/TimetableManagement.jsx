import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiCheckCircle, FiClock, FiEdit3, FiPlus, FiRefreshCw } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import ExportMenu from '../../components/ExportMenu'
import EmptyState from '../../components/EmptyState'
import FilterPanel from '../../components/FilterPanel'
import { getAcademicLevelFromSemester, getSemestersForAcademicLevel } from '../subject-management/SubjectManagement'
import { timetableService, localTimetableService, localEntries } from '../../services/timetableService'
import eventBus, { ERP_EVENTS } from '../../services/eventBus'
import { key, same, active, completeScope, matchesScope, normalizeEntry, conflictPairs, publicationState } from '../../utils/timetableUtils'
import { calendarBounds, classesOnDate, localDate, roomOptions, schedulingIssues, weekday, workingDate } from '../../utils/timetablePlanner'
import { showError, showSuccess } from '../../utils/toast'
import { getDefaultAcademicYear } from '../../utils/academicYearUtils'
import { TimetableSelect, WeeklyGrid, ScheduleDialog } from './TimetableComponents'
import { SchedulingIssues } from './TimetablePlanner'
import TimetableBuilder from './TimetableBuilder'
import './TimetableManagement.css'

const TABS = { dashboard: 'Timetable Dashboard', create: 'Create & Manage Timetable', faculty: 'Faculty Timetable', student: 'Student Timetable', classroom: 'Classroom Timetable' }
const EMPTY_SCOPE = { academicYearId: '', courseId: '', branchId: '', level: '', semesterId: '', sectionId: '' }
const EMPTY_SOURCES = { years: [], courses: [], branches: [], semesters: [], sections: [], subjects: [], faculty: [], allocations: [] }
const nameOf = (list, id) => list.find(row => same(row.id, id))?.name || 'Unavailable'
const loadData = async () => {
  const [sources, backend, tables] = await Promise.all([timetableService.getSources(), timetableService.list(), localTimetableService.list()])
  return { sources, backend, tables }
}
const loadStudents = () => timetableService.getStudents()
function useResource(loader, version) {
  const [state, setState] = useState({ version: -1, data: null, error: '' })
  useEffect(() => {
    let current = true
    Promise.resolve().then(loader).then(data => { if (current) setState({ version, data, error: '' }) }).catch(error => { if (current) setState({ version, data: null, error: error.message || 'Unable to load timetable data.' }) })
    return () => { current = false }
  }, [loader, version])
  return state.version === version ? { ...state, loading: false } : { data: null, error: '', loading: true }
}

export default function TimetableManagement() {
  const [params, setParams] = useSearchParams()
  const tab = ['edit', 'publish'].includes(params.get('view')) ? 'create' : Object.hasOwn(TABS, params.get('view')) ? params.get('view') : 'dashboard'
  const [storedScope, updateScope] = useState(EMPTY_SCOPE), [version, setVersion] = useState(0)
  const [tableId, setTableId] = useState(''), [facultyId, setFacultyId] = useState(''), [studentId, setStudentId] = useState(''), [room, setRoom] = useState('')
  const [search, setSearch] = useState(''), [dialog, setDialog] = useState(null), [busy, setBusy] = useState(false)
  const [date, setDate] = useState('')
  const [builderStep, setBuilderStep] = useState(1)
  const state = useResource(loadData, version), studentState = useResource(loadStudents, version)
  const sources = state.data?.sources || EMPTY_SOURCES, tables = state.data?.tables || []
  const defaultAcademicYearId = key(getDefaultAcademicYear(sources.years)?.id)
  const scope = { ...(['faculty', 'classroom'].includes(tab) ? EMPTY_SCOPE : storedScope), academicYearId: storedScope.academicYearId || defaultAcademicYearId }
  const setScope = next => updateScope(current => typeof next === 'function' ? next({ ...current, academicYearId: current.academicYearId || defaultAcademicYearId }) : next)
  const backend = (state.data?.backend || []).map(row => ({ ...normalizeEntry(row, sources.sections), origin: 'backend' }))
  const entries = [...localEntries(tables), ...backend]
  const refresh = () => { setDialog(null); setVersion(value => value + 1) }
  useEffect(() => {
    const update = () => { setDialog(null); setVersion(value => value + 1) }
    const onStorage = event => { if (!event.key || event.key.startsWith('pirnav-timetables-v1:')) update() }
    window.addEventListener('storage', onStorage)
    const unsub = [ERP_EVENTS.ACADEMIC_UPDATED, ERP_EVENTS.STUDENT_UPDATED, ERP_EVENTS.PROMOTION_EXECUTED].map(event => eventBus.subscribe(event, update))
    return () => { window.removeEventListener('storage', onStorage); unsub.forEach(fn => fn()) }
  }, [])
  const changeScope = (field, value) => {
    setBuilderStep(1)
    const fields = Object.keys(EMPTY_SCOPE), index = fields.indexOf(field)
    setScope(old => ({ ...old, [field]: value, ...Object.fromEntries(fields.slice(index + 1).map(field => [field, ''])) }))
    setTableId(''); setFacultyId(''); setRoom(''); setSearch(''); setDialog(null)
  }
  const clear = () => { setScope({ ...EMPTY_SCOPE, academicYearId: defaultAcademicYearId }); setTableId(''); setFacultyId(''); setRoom(''); setSearch(''); setDialog(null) }
  const changeTab = view => { setParams({ view }); setSearch(''); setDate(''); setDialog(null) }
  const semesters = sources.semesters.filter(row => active(row) && (!scope.courseId || !row.courseId || same(row.courseId, scope.courseId)) && (!scope.branchId || !row.branchId || same(row.branchId, scope.branchId)) && (!scope.academicYearId || !row.academicYearId || same(row.academicYearId, scope.academicYearId)))
  const levels = [...new Set(semesters.map(getAcademicLevelFromSemester).filter(Boolean))]
  const sections = sources.sections.filter(row => active(row) && matchesScope(row, scope))
  const validScope = completeScope(scope) && sections.some(row => same(row.id, scope.sectionId)) && sources.years.some(row => same(row.id, scope.academicYearId)) && sources.courses.some(row => same(row.id, scope.courseId)) && sources.branches.some(row => same(row.id, scope.branchId) && same(row.courseId, scope.courseId)) && getSemestersForAcademicLevel(semesters, scope.level).some(row => same(row.id, scope.semesterId))
  const filteredTables = tables.filter(row => matchesScope(row, scope) && (!scope.sectionId || same(row.sectionId, scope.sectionId)))
  const selectedTable = filteredTables.find(row => same(row.id, tableId)) || (completeScope(scope) && filteredTables.length === 1 ? filteredTables[0] : null)
  const students = studentState.data || [], selectedStudent = students.find(row => same(row.studentId, studentId))
  const enrich = row => ({ ...row, subjectName: nameOf(sources.subjects, row.subjectId), subjectCode: sources.subjects.find(subject => same(subject.id, row.subjectId))?.subjectCode || '', facultyName: nameOf(sources.faculty, row.facultyId), sectionName: nameOf(sources.sections, row.sectionId), courseName: nameOf(sources.courses, row.courseId), branchName: nameOf(sources.branches, row.branchId), academicYearName: nameOf(sources.years, row.academicYearId), semesterName: nameOf(sources.semesters, row.semesterId) })
  const scopedEntries = entries.filter(row => active(row) && matchesScope(row, scope) && (!scope.sectionId || same(row.sectionId, scope.sectionId)))
  const published = entries.filter(row => active(row) && publicationState(row) === 'published')
  const rooms = roomOptions(sources, published)
  let visible = scopedEntries
  if (tab === 'create') visible = selectedTable ? localEntries([selectedTable]) : []
  if (tab === 'faculty') visible = facultyId ? published.filter(row => same(row.facultyId, facultyId) && matchesScope(row, scope) && (!scope.sectionId || same(row.sectionId, scope.sectionId))) : []
  if (tab === 'classroom') {
    const selectedRoom = rooms.find(item => item.value === room)
    visible = selectedRoom ? published.filter(row => (selectedRoom.roomId && row.roomId ? same(row.roomId, selectedRoom.roomId) : row.classroom.trim().toLowerCase() === selectedRoom.classroom.trim().toLowerCase()) && matchesScope(row, scope) && (!scope.sectionId || same(row.sectionId, scope.sectionId))) : []
  }
  if (tab === 'student') visible = selectedStudent && completeScope(selectedStudent) ? published.filter(row => matchesScope(row, selectedStudent) && same(row.sectionId, selectedStudent.sectionId)) : []
  const calendarFor = row => {
    const table = tables.find(table => same(table.id, row.timetableId))
    if (!table?.planning?.calendar) return null
    const calendar = table.planning.calendar, bounds = calendarBounds(sources, table)
    return { ...calendar, startDate: [calendar.startDate, bounds.startDate].filter(Boolean).sort().at(-1), endDate: [calendar.endDate, bounds.endDate].filter(Boolean).sort()[0] }
  }
  const dateNotes = date ? [...new Set(visible.map(row => workingDate(date, calendarFor(row)).reason).filter(Boolean))] : []
  if (date) visible = classesOnDate(visible, date, calendarFor)
  visible = visible.map(enrich).filter(row => !search.trim() || [row.subjectName, row.subjectCode, row.facultyName, row.classroom, row.sectionName, row.dayOfWeek].some(value => key(value).toLowerCase().includes(search.trim().toLowerCase())))
  const gridTables = tab === 'create' ? selectedTable ? [selectedTable] : [] : tables.filter(table => visible.some(row => same(row.timetableId, table.id)))
  const gridPeriods = gridTables.flatMap(table => table.planning?.periods || [])
  const gridDays = date ? [weekday(date)] : [...new Set(gridTables.flatMap(table => table.planning?.calendar?.workingDays || []))]
  const scopeConflicts = conflictPairs(entries.map(enrich)).filter(conflict => scopedEntries.some(row => same(row.id, conflict.entryId) || same(row.id, conflict.id)))
  const todaysClasses = classesOnDate(scopedEntries.filter(row => publicationState(row) === 'published'), localDate(), calendarFor).map(enrich)
  const allIssues = filteredTables.flatMap(table => schedulingIssues(sources, table, table.planning, table.entries).map(issue => ({ ...issue, subjectName: `${table.name} · ${issue.subjectName}` })))
  const action = async (operation, success) => {
    setBusy(true)
    try { const result = await operation(); showSuccess(typeof success === 'function' ? success(result) : success); refresh(); return result }
    catch (error) { showError(error.message); throw error }
    finally { setBusy(false) }
  }
  const buttonAction = (operation, success) => action(operation, success).catch(() => {})
  const openTable = (table, view = 'create') => {
    const semester = sources.semesters.find(row => same(row.id, table.semesterId))
    setScope({ ...EMPTY_SCOPE, ...Object.fromEntries(Object.keys(EMPTY_SCOPE).filter(field => field !== 'level').map(field => [field, key(table[field])])), level: getAcademicLevelFromSemester(semester) })
    setTableId(key(table.id)); setBuilderStep(table.planning ? 3 : 2); changeTab(view)
  }
  const inspect = row => setDialog({ initial: row, table: tables.find(table => same(table.id, row.timetableId)) || row, readOnly: tab !== 'create' || row.origin === 'backend' || row.publicationStatus === 'published' })
  const canEdit = Boolean(selectedTable && selectedTable.publicationStatus === 'draft' && validScope && tab === 'create' && !date)
  const exportColumns = [['Timetable', 'timetableName'], ['Academic Year', 'academicYearName'], ['Course', 'courseName'], ['Branch', 'branchName'], ['Semester', 'semesterName'], ['Section', 'sectionName'], ['Day', 'dayOfWeek'], ['Start Time', 'startTime'], ['End Time', 'endTime'], ['Subject Code', 'subjectCode'], ['Subject', 'subjectName'], ['Faculty', 'facultyName'], ['Classroom / Lab', 'classroom'], ['Publication', row => publicationState(row)]].map(([label, value]) => ({ label, value }))
  const viewScope = tab === 'student' && selectedStudent ? `Student: ${selectedStudent.name} · ${selectedStudent.enrollmentNo} · Published timetable` : Object.entries(scope).filter(([, value]) => value).map(([field, value]) => field === 'level' ? value : nameOf(sources[{ academicYearId: 'years', courseId: 'courses', branchId: 'branches', semesterId: 'semesters', sectionId: 'sections' }[field]], value)).join(' / ') || 'All academic contexts'
  const academicContextFields = <section className="tt-filters" aria-label="Academic context">{[
    ['academicYearId', 'Academic Year', sources.years, false], ['courseId', 'Course', sources.courses.filter(active), !scope.academicYearId], ['branchId', 'Branch', sources.branches.filter(row => active(row) && same(row.courseId, scope.courseId)), !scope.courseId], ['level', 'Academic Level', levels, !scope.branchId], ['semesterId', 'Semester', getSemestersForAcademicLevel(semesters, scope.level), !scope.level], ['sectionId', 'Section', sections, !scope.semesterId],
  ].map(([field, label, options, disabled]) => <TimetableSelect key={field} required={tab === 'create'} label={label} value={scope[field]} options={options} disabled={disabled || busy} onChange={value => changeScope(field, value)} />)}</section>

  const schedule = <section className="tt-card tt-schedule"><div className="tt-card-heading"><div><h2>{date ? 'Schedule for Date' : 'Weekly Schedule'}</h2><p>{viewScope} · {visible.length} matching classes</p></div><div className="tt-actions"><label className="tt-field"><span>View Date (optional)</span><input type="date" aria-label="View Date" value={date} onChange={event => setDate(event.target.value)} /></label>{date && <button className="tt-button" onClick={() => setDate('')}>Weekly Template</button>}<label className="tt-search"><span className="tt-sr-only">Search schedule</span><input aria-label="Search schedule" value={search} placeholder="Search subject, faculty, room or day" onChange={event => setSearch(event.target.value)} /></label></div></div>{dateNotes.length > 0 && <p className="tt-notice">{dateNotes.join(' · ')}. These classes are excluded from this date.</p>}<WeeklyGrid rows={visible} periods={gridPeriods} workingDays={gridDays} editable={canEdit} add={initial => setDialog({ initial, table: selectedTable })} inspect={inspect} occupancy={tab === 'classroom' && Boolean(room)} /></section>

  return <DashboardLayout><main className={`tt-page ${tab === 'create' ? 'tt-page-workspace' : ''}`}>
    <header className="tt-page-header"><div><span className="tt-eyebrow">Academic scheduling</span><h1>Timetable Management</h1><p>Generate, review and manage conflict-checked weekly schedules.</p></div><div className="tt-actions"><button className="tt-button" disabled={state.loading || busy} onClick={refresh}><FiRefreshCw /> Refresh</button><ExportMenu rows={visible} columns={exportColumns} filename={`timetable-${tab}`} title={TABS[tab]} loading={state.loading || busy} unavailable={state.error || (tab === 'student' && (studentState.error || studentState.loading)) ? 'Load the schedule before exporting.' : ''} scope={`${viewScope}${date ? ` · ${date}` : ' · Weekly template'}${search ? ` · Search: ${search}` : ''}`} /></div></header>
    <p className="tt-storage-note">Saved for this account in this browser | Includes backend classes in conflict checks</p>
    <nav className="tt-tabs" aria-label="Timetable views">{Object.entries(TABS).map(([view, title]) => <button key={view} className={tab === view ? 'active' : ''} aria-current={tab === view ? 'page' : undefined} onClick={() => changeTab(view)}>{title}</button>)}</nav>
    {state.loading ? <div className="tt-loading" role="status"><FiClock /> Loading academic data and schedules…</div> : state.error ? <div className="tt-error" role="alert"><p>{state.error}</p><button className="tt-button" onClick={refresh}>Retry</button></div> : <>
      {tab === 'dashboard' && <FilterPanel showClearWhenOpen onClear={clear}><span>Academic context</span>{academicContextFields}</FilterPanel>}
      {tab === 'dashboard' && <>
        <section className="tt-kpis">{[[FiEdit3, 'Draft', filteredTables.filter(row => row.publicationStatus === 'draft').length], [FiCheckCircle, 'Published Locally', filteredTables.filter(row => row.publicationStatus === 'published').length], [FiClock, "Today's Classes", todaysClasses.length], [FiClock, 'Conflict Warnings', scopeConflicts.length]].map(([Icon, label, value]) => <article key={label}><span><Icon /></span><div><small>{label}</small><strong>{value}</strong></div></article>)}</section>
        <section className="tt-card"><div className="tt-card-heading"><h2>Section timetables / recent drafts</h2><button className="tt-button tt-primary" onClick={() => changeTab('create')}><FiPlus /> Create & Manage Timetable</button></div>{!filteredTables.length ? <EmptyState title="No local timetables yet" message="Choose Create & Manage Timetable to generate your first draft." /> : <div className="tt-list">{[...filteredTables].sort((a, b) => key(b.updatedAt).localeCompare(key(a.updatedAt))).map(table => <button key={table.id} onClick={() => openTable(table)}><strong>{table.name}</strong><span>{nameOf(sources.sections, table.sectionId)} · {table.entries.length} classes</span><em>{table.publicationStatus === 'published' ? 'Published locally' : 'Draft'}</em></button>)}</div>}</section>
        <section className="tt-card"><div className="tt-card-heading"><div><h2>Today's Schedule</h2><p>{localDate()} · Published classes with a reviewed working calendar.</p></div></div><div className="tt-list">{todaysClasses.length ? todaysClasses.map(row => <button key={row.id} onClick={() => inspect(row)}><strong>{row.startTime}–{row.endTime} · {row.subjectName}</strong><span>{row.facultyName} · {row.sectionName} · {row.classroom}</span></button>) : <p>No confirmed classes today.</p>}</div></section><SchedulingIssues issues={allIssues} />
      </>}
      {tab === 'create' && <TimetableBuilder key={`${Object.values(scope).join(':')}:${selectedTable?.id || 'new'}:${selectedTable?.revision || 0}`} scope={scope} sources={sources} entries={entries} table={selectedTable} validScope={validScope} busy={busy} summary={viewScope} contextFields={academicContextFields} step={builderStep} setStep={setBuilderStep} conflicts={scopeConflicts}
        setup={(name, config) => action(() => localTimetableService.setup(scope, name, config, { tableId: selectedTable?.id, revision: selectedTable?.revision }), 'Timetable setup saved').then(table => { setTableId(table.id); return table })}
        generate={(name, config, options) => action(() => localTimetableService.generate(scope, name, config, options), result => `Timetable generated successfully: ${result.added} classes added${result.issues.length ? `; ${result.issues.length} issues need review` : ''}`).then(table => { setTableId(table.id); return table })}
        savePlanning={config => action(() => localTimetableService.savePlanning(selectedTable.id, selectedTable.revision, config), 'Planning settings saved')}
        validate={async () => { setBusy(true); try { return await localTimetableService.validate(selectedTable.id, selectedTable.revision) } finally { setBusy(false) } }}
        publish={() => action(() => localTimetableService.publish(selectedTable.id, selectedTable.revision), 'Timetable published successfully')}
        reopen={() => buttonAction(() => localTimetableService.reopen(selectedTable.id, selectedTable.revision), 'Timetable moved to Draft')}
        add={initial => setDialog({ initial, table: selectedTable })}>{schedule}</TimetableBuilder>}
      {tab === 'faculty' && <section className="tt-card tt-view-filter"><h2>Faculty Timetable</h2><div className="tt-view-selectors"><TimetableSelect label="Faculty" value={facultyId} options={sources.faculty.filter(active)} onChange={setFacultyId} /><TimetableSelect label="Academic Year" value={scope.academicYearId} options={sources.years} onChange={value => changeScope('academicYearId', value)} /></div></section>}
      {tab === 'classroom' && <section className="tt-card tt-view-filter"><h2>Classroom Timetable</h2><div className="tt-view-selectors"><TimetableSelect label="Classroom / Lab" value={room} options={rooms} onChange={setRoom} /><TimetableSelect label="Academic Year" value={scope.academicYearId} options={sources.years} onChange={value => changeScope('academicYearId', value)} /></div><p>Occupied periods show published classes. Empty displayed periods have no matching published booking.</p></section>}
      {tab === 'student' && <section className="tt-card tt-view-filter"><h2>Student Timetable</h2>{studentState.loading ? <p role="status">Loading admitted students…</p> : studentState.error ? <div className="tt-error" role="alert">{studentState.error}<button className="tt-button" onClick={refresh}>Retry students</button></div> : <><TimetableSelect label="Student" value={studentId} options={students.map(row => ({ ...row, id: row.studentId, name: `${row.name} · ${row.enrollmentNo || 'No roll number'}` }))} onChange={setStudentId} />{selectedStudent && <p>{selectedStudent.name} · {nameOf(sources.years, selectedStudent.academicYearId)} · {nameOf(sources.courses, selectedStudent.courseId)} · {nameOf(sources.branches, selectedStudent.branchId)} · {nameOf(sources.semesters, selectedStudent.semesterId)} · {nameOf(sources.sections, selectedStudent.sectionId)}</p>}{selectedStudent && !completeScope(selectedStudent) && <p className="tt-notice">This student's current academic / section mapping is incomplete. Update the student profile first.</p>}</>}</section>}
      {scopeConflicts.length > 0 && tab === 'dashboard' && <div className="tt-error" role="alert"><strong>Scheduling conflicts require review</strong>{scopeConflicts.map((row, index) => <p key={index}>{row.message}</p>)}</div>}
      {tab !== 'create' && schedule}

      {tab === 'dashboard' && backend.some(row => publicationState(row) === 'unavailable') && <p className="tt-hint">Backend entry status does not confirm publication. These entries appear in dashboard and conflict checks, and are excluded from published and date-specific views until publication and calendar data are available.</p>}
    </>}
    {dialog && !state.loading && !state.error && <ScheduleDialog key={`${dialog.table.id}-${dialog.initial.id || 'new'}`} initial={dialog.initial} table={dialog.table} sources={sources} entries={entries.map(enrich)} readOnly={dialog.readOnly} close={() => setDialog(null)} save={form => action(() => localTimetableService.saveEntry(dialog.table.id, dialog.table.revision, form), 'Schedule updated successfully')} remove={id => action(() => localTimetableService.removeEntry(dialog.table.id, dialog.table.revision, id), 'Class removed from draft')} />}
  </main></DashboardLayout>
}
