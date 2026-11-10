import { useScreenAccess } from '../../auth/ScreenAccess'
import PageHeader from '../../components/PageHeader'
import ViewDialog from '../../components/ViewDialog'
import { Navigate } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import { useAcademic } from '../../context/AcademicContext'
import { selectedCollegeId as currentCollegeId } from '../../utils/collegeScope'
import { getUserRole } from '../../auth/auth'
import { showToast } from '../../utils/toast'
import { backendWorkflow, loadBackendWorkflow } from '../../services/timetable/timetableBackendWorkflow'
import { resolveMyFaculty, updateWeeklyRequirement } from '../../services/timetable/timetableWorkflowService'
import { academicLevel, decorateEntries, scopeSections, contextOptions, changeContext, hierarchy, publishedForFaculty, availableSlots } from '../../services/timetable/timetableDomain'
import { same, DAYS, active, conflictsFor, conflictPairs, matchesScope, overlaps, timeMinutes, key, eligibleSubjects, eligibleFaculty } from '../../utils/timetableUtils'
import { roomOptions, localDate, schedulingIssues, subjectRequirements, planningErrors, suitableRoom, weekday, entryPlanningErrors, WEEKDAYS } from '../../utils/timetablePlanner'
import { FiClock, FiUsers, FiCheckCircle, FiAlertTriangle, FiLayers, FiBookOpen, FiClipboard, FiUserCheck, FiHome, FiGrid, FiPlus } from 'react-icons/fi'
import { useMemo, useState, useEffect, useRef } from 'react'
import ExportMenu, { PrintDetailsButton } from '../../components/ExportMenu'
import { exportToExcelXml } from '../../utils/exportUtils'
import { dailyPeriods, DAILY_PERIOD_SETUP, isTeachingPeriod, periodLabel, periodType, periodSessions } from '../../utils/timetablePeriods'
import EmptyState from '../../components/EmptyState'
import SearchableSelect from '../../components/SearchableSelect'
import './TimetableManagement.css'

// TimetableManagement

export default function TimetableManagement() {
  const { canAction } = useScreenAccess()
  const canManage = canAction('/timetable','create') || canAction('/timetable','edit')
  const { selectedCollegeId, selectedAcademicYearId, currentAcademicYear, loading: contextLoading } = useAcademic()
  const activeAcademicYearId = selectedAcademicYearId || currentAcademicYear?.id || currentAcademicYear?.academicYearId
  const role = getUserRole(), admin = role === 'admin'
  const [tab, setTab] = useState(admin ? 'dashboard' : 'faculty'), [data, setData] = useState(null)
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [refreshPending, setRefreshPending] = useState(false)
  const mutationLock = useRef(false)
  const unsavedSetup = useRef(false)
  const loadRevision = useRef(0)
  const [reloadAttempt,setReloadAttempt] = useState(0)
  const [initial, setInitial] = useState(null), [builderKey, setBuilderKey] = useState(0), [facultyId, setFacultyId] = useState(''), [facultyDrawer, setFacultyDrawer] = useState(''), [facultyError, setFacultyError] = useState('')
  const refresh = async () => {
    const revision = ++loadRevision.current
    const collegeId = currentCollegeId()
    const live = await loadBackendWorkflow()
    if (revision === loadRevision.current && collegeId === currentCollegeId()) setData(live)
    return live
  }
  useEffect(() => {
    loadRevision.current += 1
    unsavedSetup.current = false
    setData(null); setError(''); setLoading(true); setRefreshPending(false)
    setTab(admin ? 'dashboard' : 'faculty'); setInitial(null); setBuilderKey(value => value + 1); setFacultyId(''); setFacultyDrawer(''); setFacultyError('')
    if (contextLoading) return
    if (!['admin', 'faculty'].includes(role)) return
    let cancelled = false
    Promise.resolve().then(refresh).then(async live => {
      if (role === 'faculty') {
        try { const id = await resolveMyFaculty(live.sources); if (!cancelled) setFacultyId(id) }
        catch (reason) { if (!cancelled) setFacultyError(reason.message) }
      }
    }).catch(reason => { if (!cancelled) { setError(reason.message); showToast(reason.message, 'error') } }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [role, selectedCollegeId, selectedAcademicYearId, contextLoading, reloadAttempt])
  const mutate = async (action, successMessage = 'Timetable saved.') => {
    if (!canManage) throw new Error('You do not have permission to change timetables.')
    if (mutationLock.current || refreshPending) throw new Error('Finish the pending timetable refresh before another change.')
    mutationLock.current=true;setBusy(true);setError('')
    let committed=false
    try {const result=await action();committed=true;await refresh();showToast(successMessage,'success');return result || true}
    catch(reason) {if(committed){setRefreshPending(true);reason.committed=true;setError('The timetable change was saved, but refresh failed. Retry refresh before another change. '+reason.message)}else{try{await refresh()}catch{setRefreshPending(true)}setError(reason.message);showToast(reason.message,'error')}throw reason}
    finally {mutationLock.current=false;setBusy(false)}
  }
  const retrySavedRefresh = async () => {
    if(mutationLock.current)return
    mutationLock.current=true;setBusy(true)
    try{await refresh();setRefreshPending(false);setError('')}catch(reason){setError('Saved timetable refresh failed. '+reason.message)}finally{mutationLock.current=false;setBusy(false)}
  }
  const run = async (action, successMessage) => { try { return await mutate(action, successMessage) } catch { return null } }
  const validate = async tables => {
    setBusy(true); setError('')
    try { const issues = await backendWorkflow.validate(tables); const blocking = issues.filter(issue => issue.blocking !== false).length; showToast(blocking ? `Validation found ${blocking} blocking issue(s).` : issues.length ? `Validation passed with ${issues.length} warning(s).` : 'Validation passed.', blocking ? 'warning' : issues.length ? 'warning' : 'success'); return issues }
    catch (reason) { setError(reason.message); showToast(reason.message, 'error'); return null }
    finally { setBusy(false) }
  }
  if (!['admin', 'faculty'].includes(role)) return <Navigate to="/unauthorized" replace />
  const sources = data?.sources
  const tables = data?.tables || []
  const entries = data ? decorateEntries(data.backend, sources) : []
  const leaveSetup = () => {
    if (unsavedSetup.current && !window.confirm('Discard unsaved timetable settings?')) return false
    unsavedSetup.current = false
    return true
  }
  const backToOverview = () => { if (leaveSetup()) setTab('dashboard') }
  const open = context => {
    if (!leaveSetup()) return
    if (!context?.id && !canManage) return
    setInitial(context)
    setBuilderKey(value => value + 1)
    setTab('builder')
  }
  return <DashboardLayout><main className="tt-page tt-workflow"><PageHeader title={admin ? 'Timetable Management' : 'My Timetable'} subtitle={admin ? 'Create, organize, and manage academic schedules.' : 'Your published teaching schedule.'} secondaryActions={admin && tab === 'builder' ? <><button type="button" className="tt-button" disabled={busy} onClick={backToOverview}>← Back</button>{canManage && initial?.id && !initial.configure && sources.sections.some(row => same(row.id, initial.sectionId)) && <button className="tt-button tt-primary" disabled={busy || refreshPending} onClick={() => open({ ...contextFor(sources.sections.find(row => same(row.id, initial?.sectionId)), sources), configure: true })}>Create New Timetable Period</button>}</> : null} />
    {error && <p className="tt-error" role="alert">{error}{refreshPending ? <button disabled={busy} onClick={retrySavedRefresh}>Retry saved timetable refresh</button> : <button disabled={busy} onClick={()=>setReloadAttempt(value=>value+1)}>Retry timetable</button>}</p>}
    {loading ? <p role="status">Loading academic data and timetables...</p> : data && <>
      {admin && <div hidden={tab !== 'dashboard'}><TimetableOverview key={activeAcademicYearId} academicYearId={activeAcademicYearId} tables={tables} sources={sources} open={open} canManage={canManage && !refreshPending} /></div>}
      {admin && tab === 'builder' && <><TimetableBuilder key={builderKey} defaultAcademicYearId={activeAcademicYearId} sources={sources} entries={entries} tables={tables} initial={initial} onBack={backToOverview} unsavedSetup={unsavedSetup} busy={busy || refreshPending} enabled={canManage && !refreshPending} refresh={refresh} faculty={setFacultyDrawer} generate={args => run(() => backendWorkflow.generate(args))} saveSetup={(tables, config) => run(() => backendWorkflow.saveSetup(tables, config))} save={(table, form) => mutate(() => backendWorkflow.saveEntry(table, form))} remove={(table, id) => mutate(() => backendWorkflow.removeEntry(table, id))} validate={validate} publish={expected => run(() => backendWorkflow.publish(expected), 'Timetable published.')} reopen={table => run(() => backendWorkflow.reopen(table))} /></>}
      {tab === 'faculty' && <section className="tt-card">{facultyError && <p className="tt-error" role="alert">{facultyError}</p>}{facultyId ? <FacultyTimetable key={facultyId} facultyId={facultyId} sources={sources} entries={entries} tables={tables} /> : !facultyError && <p className="tt-clean-step">Select a faculty member to view published classes.</p>}</section>}
      {facultyDrawer && <WorkspaceDrawer title="Faculty schedule" close={() => setFacultyDrawer('')}><FacultyTimetable facultyId={facultyDrawer} sources={sources} entries={entries} tables={tables} /></WorkspaceDrawer>}
    </>}
  </main></DashboardLayout>
}

// TimetableDashboard
const name = (rows, id) => rows.find(row => same(row.id, id))?.name || 'Unavailable'

function contextFor(section, sources) {
  const branch = sources.branches.find(row => same(row.id, section.branchId))
  const courseId = section.courseId || branch?.courseId || ''
  const course = sources.courses.find(row => same(row.id, courseId))
  const semester = sources.semesters.find(row => same(row.id, section.semesterId))
  return {
    academicYearId: section.academicYearId || semester?.academicYearId || '',
    departmentId: section.departmentId || branch?.departmentId || course?.departmentId || '',
    courseId, branchId: section.branchId || '', level: academicLevel(semester || {}), semesterId: section.semesterId || '', sectionId: section.id,
  }
}

function scheduleCoverage(table, sources, entries) {
  if (!table?.planning?.periods?.length) return null
  const requirements = subjectRequirements(sources, table, table.planning.requirements)
  if (!requirements.length || requirements.some(item => !Number.isInteger(item.periodsPerWeek) || item.periodsPerWeek <= 0)) return null
  const required = requirements.reduce((sum, item) => sum + item.periodsPerWeek, 0)
  const periods = table.planning.periods.filter(isTeachingPeriod)
  const valid = entries.filter(row => same(row.timetableId, table.id) && active(row)
    && !conflictsFor(row, entries).length && !entryPlanningErrors(row, table.planning, sources, table, entries).length)
  const assigned = requirements.reduce((sum, item) => {
    const count = valid.filter(row => same(row.subjectId, item.subject.id)).reduce((total, row) => total + periods.filter(period =>
      timeMinutes(period.startTime) >= timeMinutes(row.startTime) && timeMinutes(period.endTime) <= timeMinutes(row.endTime)).length, 0)
    return sum + Math.min(item.periodsPerWeek, count)
  }, 0)
  return Math.round(assigned / required * 100)
}

export function TimetableOverview({ academicYearId, tables, sources, open, canManage }) {
  const [selection, setSelection] = useState({})
  const fields = [
    ['courseId', 'Course', sources.courses],
    ['branchId', 'Branch', sources.branches],
    ['semesterId', 'Current Semester', sources.semesters],
    ['sectionId', 'Section', sources.sections],
  ]
  const contexts = sources.sections.filter(active).map(section => contextFor(section, sources))
    .filter(context => same(context.academicYearId, academicYearId) && scopeSections(sources, context).some(section => same(section.id, context.sectionId)))
  const context = contexts.find(row => fields.every(([field]) => same(row[field], selection[field])))
  const latest = context && tables.filter(table => matchesScope(table, context) && same(table.sectionId, context.sectionId))
    .sort((first, second) => String(second.updatedAt || second.planning?.calendar?.startDate || '').localeCompare(String(first.updatedAt || first.planning?.calendar?.startDate || '')))[0]
  const change = (index, value) => setSelection(previous => ({
    ...Object.fromEntries(fields.slice(0, index).map(([field]) => [field, previous[field]])),
    [fields[index][0]]: value,
  }))
  return <>
    <section className="tt-card tt-inter-context" aria-label="Timetable academic context">
      {fields.map(([field, label, rows], index) => {
        const ids = new Set(contexts.filter(row => fields.slice(0, index).every(([parent]) => same(row[parent], selection[parent]))).map(row => key(row[field])))
        return <TimetableSelect key={field} label={label} value={selection[field] || ''} options={rows.filter(row => ids.has(key(row.id)))} disabled={!academicYearId || Boolean(index && !selection[fields[index - 1][0]])} onChange={value => change(index, value)} />
      })}
    </section>
    <div className="tt-inter-cards">
      <article className="tt-inter-overview-card">
        <FiUsers size={24} aria-hidden="true" />
        <h2>Timetable Setup</h2>
        <p>Set working days, periods and subject requirements for the selected section.</p>
        <button type="button" className="tt-button tt-primary" disabled={!context || !canManage} onClick={() => open({ ...context, ...(latest?.publicationStatus === 'draft' ? latest : {}), configure: true })}>Configure timetable →</button>
      </article>
      <article className="tt-inter-overview-card">
        <FiBookOpen size={24} aria-hidden="true" />
        <h2>Generated Timetable</h2>
        <p>Open the latest saved timetable for your selected academic context.</p>
        <button type="button" className="tt-button tt-primary" disabled={!latest} onClick={() => open(latest)}>View timetable →</button>
        {context && !latest && <small role="status">No timetable exists for this context.</small>}
      </article>
    </div>
    <section className="tt-inter-guide" aria-label="Timetable workflow guide">
      <h2>Your scheduling workflow</h2><p>From daily structure to a published academic schedule.</p>
      <ol>{['Period Structure', 'Generate Timetable', 'Validate', 'Publish'].map((label, index) => <li key={label}><span>{index + 1}</span>{label}</li>)}</ol>
    </section>
  </>
}

function readiness(section, sources, entries, table) {
  const scope = contextFor(section, sources)
  const config = table?.planning
  const requirements = subjectRequirements(sources, scope, config?.requirements || {})
  const rooms = roomOptions(sources, entries)
  const issues = config ? [...planningErrors(config, sources, scope, entries), ...(config.automaticErrors || [])] : ['Save and review the timetable period settings before generation.']
  if (!scopeSections(sources, scope).some(row => same(row.id, section.id))) issues.push('Academic relationships are incomplete or changed. Review this section.')
  if (!requirements.length) issues.push('No active subjects match this section.')
  for (const item of requirements) {
    if (!item.faculty.length) issues.push(`${item.subject.name}: no allocated faculty available.`)
    if (!Number.isInteger(item.periodsPerWeek) || item.periodsPerWeek < 1) issues.push(`${item.subject.name}: weekly requirements are missing or ambiguous.`)
    if (!Number.isInteger(item.blockSize) || item.blockSize < 1 || item.periodsPerWeek % item.blockSize) issues.push(`${item.subject.name}: weekly periods must match the consecutive periods per session.`)
    if (!rooms.some(room => config?.rooms?.includes(room.value) && suitableRoom(item.subject, room))) issues.push(`${item.subject.name}: select a suitable classroom or lab.`)
  }
  if (!rooms.length) issues.push('Room references are unavailable.')
  if (entries.filter(row => same(row.sectionId, section.id)).some(row => conflictsFor(row, entries).length)) issues.push('Existing timetable conflicts need review.')
  return { ready: issues.length === 0, issues: [...new Set(issues)] }
}

export function TimetableDashboard({ tables, sources, entries, today, open }) {
  const [attentionOpen, setAttentionOpen] = useState(false)
  const activeSections = useMemo(() => sources.sections.filter(active), [sources.sections])
  const departments = useMemo(() => sources.departments.filter(active), [sources.departments])
  const rooms = useMemo(() => roomOptions(sources, entries), [sources, entries])
  const readinessRows = useMemo(() => activeSections.map(section => {
    const table = tables.filter(item => same(item.sectionId, section.id)).sort((a,b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0]
    return { section, table, result: readiness(section, sources, entries, table) }
  }), [activeSections, sources, entries, tables])
  const readyCount = readinessRows.filter(row => row.result.ready).length
  const scopedRequirements = activeSections.flatMap(section => subjectRequirements(sources, contextFor(section, sources), readinessRows.find(row => same(row.section.id, section.id))?.table?.planning?.requirements || {}))
  const coveredRequirements = scopedRequirements.filter(item => item.faculty.length && item.periodsPerWeek > 0).length
  const configuredSections = readinessRows.filter(row => row.table?.planning?.periods?.some(period => !['break', 'lunch'].includes(String(period.type || '').toLowerCase()))).length
  const detectedConflicts = conflictPairs(entries).length
  const attention = tables.filter(table => table.planning && schedulingIssues(sources, table, table.planning, table.entries).length || entries.some(row => same(row.timetableId, table.id) && conflictsFor(row, entries).length)).length
  const lifecycleAvailable = tables.some(table => table.publicationStatus === 'draft' || table.publicationStatus === 'published')
  const exportRows = entries.map(row => {
    const table = tables.find(item => same(item.id, row.timetableId))
    return { ...row, timetableName: table?.name || row.timetableName || 'Backend timetable', academicYear: name(sources.years, table?.academicYearId || row.academicYearId), course: name(sources.courses, table?.courseId || row.courseId), branch: name(sources.branches, table?.branchId || row.branchId), semester: name(sources.semesters, table?.semesterId || row.semesterId), status: table?.publicationStatus || row.publicationStatus || 'unavailable' }
  })
  const exportColumns = [
    { value: 'timetableName', label: 'Timetable' }, { value: 'academicYear', label: 'Academic Year' }, { value: 'course', label: 'Course' },
    { value: 'branch', label: 'Branch' }, { value: 'semester', label: 'Semester' }, { value: 'sectionName', label: 'Section' },
    { value: 'dayOfWeek', label: 'Day' }, { value: 'startTime', label: 'Start Time' }, { value: 'endTime', label: 'End Time' },
    { value: 'subjectCode', label: 'Subject Code' }, { value: 'subjectName', label: 'Subject' }, { value: 'facultyName', label: 'Faculty' }, { value: 'classroom', label: 'Room' }, { value: 'status', label: 'Status' },
  ]

  const sectionButton = section => {
    const row = readinessRows.find(item => same(item.section.id, section.id))
    const table = row?.table
    const scope = contextFor(section, sources)
    const state = row.result
    return <button className="tt-recent-table" key={section.id} onClick={() => open(table || scope)}>
      <strong>{section.name || `Section ${section.id}`}</strong>
      <span>{table ? `${table.entries.length} classes | ${table.publicationStatus === 'unavailable' ? 'Lifecycle status unavailable' : table.publicationStatus}` : `${state.ready ? 'Ready to configure' : 'Needs attention'} | No timetable yet`}</span>
      {!state.ready && <small>{state.issues.join(' ')}</small>}
    </button>
  }

  return <div className="tt-dashboard-panel">
    <div className="tt-dashboard-stats" aria-label="Timetable summary">
      {[
        ['Total Sections', activeSections.length, FiUsers], ['Ready for Generation', readyCount, FiCheckCircle],
        ['Needs Attention', activeSections.length - readyCount, FiAlertTriangle],
        ['Draft / Published', lifecycleAvailable ? `${tables.filter(row => row.publicationStatus === 'draft').length} / ${tables.filter(row => row.publicationStatus === 'published').length}` : 'Not Available', FiLayers],
      ].map(([label, value, Icon]) => label === 'Needs Attention' ? <button type="button" className="tt-card tt-attention-card" key={label} aria-expanded={attentionOpen} aria-controls="tt-attention-details" onClick={() => setAttentionOpen(value => !value)}><strong><Icon aria-hidden="true" />{value}</strong><span>{label}</span><small>Review section issues</small></button> : <div className="tt-card" key={label}><strong><Icon aria-hidden="true" />{value}</strong><span>{label}</span><small>{label === 'Ready for Generation' ? 'Saved prerequisites validated' : label === 'Draft / Published' ? 'Timetables by saved status' : 'Active sections'}</small></div>)}
    </div>
    <section className="tt-card tt-validation-panel" aria-label="Validation summary">
      <header><h2>Validation summary</h2><span>Based on the latest loaded data</span></header>
      <dl className="tt-readiness-details">
        {[
          ['Active Subjects Loaded', sources.subjects.filter(active).length, FiBookOpen, 'info'],
          ['Subject Requirements Missing', scopedRequirements.filter(item => !Number.isInteger(item.periodsPerWeek) || item.periodsPerWeek < 1).length, FiClipboard, scopedRequirements.some(item => !Number.isInteger(item.periodsPerWeek) || item.periodsPerWeek < 1) ? 'warning' : 'success'],
          ['Requirement and Faculty Coverage', `${coveredRequirements}/${scopedRequirements.length}`, FiUserCheck, coveredRequirements === scopedRequirements.length && scopedRequirements.length ? 'success' : 'warning'],
          ['Room References Loaded', rooms.length, FiHome, rooms.length ? 'info' : 'warning'],
          ['Sections with Period Setup', `${configuredSections}/${activeSections.length}`, FiGrid, configuredSections === activeSections.length && activeSections.length ? 'success' : 'warning'],
          ['Conflicting Pairs in Loaded Entries', detectedConflicts, FiAlertTriangle, detectedConflicts ? 'warning' : 'success'],
        ].map(([label, value, Icon, tone]) => <div key={label} className={`tt-validation-status tt-validation-status--${tone}`}><Icon aria-hidden="true" /><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      {!activeSections.length && <p>No active sections are available in the loaded academic data.</p>}
    </section>
    {attentionOpen && <section id="tt-attention-details" className="tt-card tt-clean-step" aria-label="Sections needing attention"><header className="tt-card-heading"><div><h2><FiAlertTriangle aria-hidden="true" />Sections needing attention</h2><p>Select a section to review its settings in the existing timetable workspace.</p></div><button className="tt-button" onClick={() => setAttentionOpen(false)}>Close details</button></header><div className="tt-recent-tables">{readinessRows.filter(row => !row.result.ready).map(row => sectionButton(row.section))}</div>{readyCount === activeSections.length && <p>{activeSections.length ? 'All loaded active sections satisfy the saved generation prerequisites.' : 'No active sections to validate.'}</p>}</section>}

    <section className="tt-card tt-clean-step">
      <header className="tt-card-heading"><div><h2><FiLayers aria-hidden="true" />Academic structure</h2><p>Choose a section to open its schedule or start configuration.</p></div><div className="tt-actions"><ExportMenu rows={exportRows} columns={exportColumns} title="Timetable Schedule" filename="timetable-schedule" scope="All timetable classes" /><button className="tt-button tt-primary" onClick={() => open(null)}>Open Builder</button></div></header>
      {!departments.length || !activeSections.length ? <p>Academic structure is not available from the loaded records.</p> : <div className="tt-structure-explorer">{departments.map(department => {
        const branches = sources.branches.filter(row => active(row) && same(row.departmentId ?? sources.courses.find(course => same(course.id, row.courseId))?.departmentId, department.id))
        return <details className="tt-structure-department" key={department.id}>
          <summary>{department.name} <small>{branches.length} branches</small></summary>
          {branches.map(branch => {
            const sections = activeSections.filter(section => same(section.branchId, branch.id))
            const semesterIds = [...new Set(sections.map(section => String(section.semesterId)).filter(Boolean))]
            return <div className="tt-structure-branch" key={branch.id}><h3>{branch.name}</h3>{semesterIds.length ? semesterIds.map(semesterId => {
              const semester = sources.semesters.find(row => same(row.id, semesterId))
              return <details key={semesterId} open><summary>{semester?.name || 'Saved semester unavailable'}</summary><div className="tt-recent-tables">{sections.filter(section => same(section.semesterId, semesterId)).map(sectionButton)}</div></details>
            }) : <p>No active sections.</p>}</div>
          })}
          {!branches.length && <p>No active branches.</p>}
        </details>
      })}</div>}
    </section>
    <section className="tt-card tt-clean-step">
      <header className="tt-card-heading"><h2><FiClock aria-hidden="true" />Recent timetables</h2><span>{today.length} published classes today</span></header>
      {!tables.length ? <p>No timetable records yet. Select a section above to configure one.</p> : <div className="tt-recent-tables">{[...tables].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).map(table => <button className="tt-recent-table" key={`${table.origin}-${table.id}`} onClick={() => open(table)}><strong>{table.name}</strong><span>{name(sources.years, table.academicYearId)} | {name(sources.departments, table.departmentId)} | {name(sources.courses, table.courseId)}</span><small>{table.publicationStatus === 'unavailable' ? 'STATUS UNAVAILABLE' : table.publicationStatus.toUpperCase()} | {table.entries.length} classes{attention && ' | Review attention items'}</small></button>)}</div>}
    </section>

  </div>
}

// TimetableBuilder
const labels = ['Academic Year', 'Course', 'Department', 'Branch', 'Academic Level', 'Semester']
const initialPlanning = (sources, scope, entries) => {
  const year = sources.years.find(row => same(row.id, scope.academicYearId))
  const yearCalendar = sources.yearSettings?.[scope.academicYearId]?.calendar || {}
  return {
    automatic: { ...DAILY_PERIOD_SETUP },
    periods: sources.yearSettings?.[scope.academicYearId]?.periods?.length ? sources.yearSettings[scope.academicYearId].periods : dailyPeriods(DAILY_PERIOD_SETUP).periods,
    calendar: {
      ...yearCalendar,
      startDate: String(yearCalendar.startDate || year?.startDate || '').slice(0, 10),
      endDate: String(yearCalendar.endDate || year?.endDate || '').slice(0, 10),
      workingDays: yearCalendar.workingDays?.length ? yearCalendar.workingDays : ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
      reviewed: true,
      holidays: yearCalendar.holidays || [],
    },
    rooms: roomOptions(sources, entries).map(row => row.value),
    requirements: {},
  }
}
const editablePlanning = planning => {
  if (!planning?.calendar) return planning
  const startDate = String(planning.calendar.startDate || '').slice(0, 10)
  const endDate = String(planning.calendar.endDate || '').slice(0, 10)
  return { ...planning, calendar: { ...planning.calendar, startDate, endDate } }
}
export function TimetableBuilder({ mockMode = false, defaultAcademicYearId = '', sources, entries, tables, initial, onBack, unsavedSetup, busy, enabled, refresh, faculty, generate, saveSetup, save, remove, validate, publish, reopen }) {
  const [scope, setScope] = useState(initial || { ...Object.fromEntries(hierarchy.map(field => [field, ''])), academicYearId: defaultAcademicYearId || '' })
  const [origin, setOrigin] = useState(initial?.origin || (mockMode ? 'local' : 'backend'))
  const [step, setStep] = useState(initial?.configure ? 2 : initial?.id ? 4 : 1)
  const [selected, setSelected] = useState(initial?.sectionId ? [String(initial.sectionId)] : [])
  const [activeSection, setActiveSection] = useState(initial?.sectionId || '')
  const [config, updateConfig] = useState(() => initial?.planning ? editablePlanning(initial.planning) : initial?.configure ? initialPlanning(sources, initial, entries) : null)
  const setConfig = next => {
    if (unsavedSetup) unsavedSetup.current = true
    updateConfig(next)
  }
  useEffect(() => {
    if (!unsavedSetup) return undefined
    const confirmUnload = event => {
      if (!unsavedSetup.current) return
      event.preventDefault()
      event.returnValue = true
    }
    window.addEventListener('beforeunload', confirmUnload)
    return () => window.removeEventListener('beforeunload', confirmUnload)
  }, [unsavedSetup])
  const [batchIds, setBatchIds] = useState(initial?.id ? [String(initial.id)] : [])
  const [impactOpen, setImpactOpen] = useState(false)
  const options = contextOptions(sources, scope), sections = scopeSections(sources, scope)
  const currentTables = tables.filter(table => (table.origin || 'local') === origin && matchesScope(table, scope) && selected.some(id => same(id, table.sectionId)) && (batchIds.length ? batchIds.some(id => same(id, table.id)) : table.publicationStatus === 'draft' && config && table.planning?.calendar?.startDate === config.calendar.startDate && table.planning?.calendar?.endDate === config.calendar.endDate))
  const table = currentTables.find(row => same(row.sectionId, activeSection)) || currentTables[0]
  const change = (field, value) => {
    const next = changeContext(scope, field, value)
    setScope(next); updateConfig(null); setBatchIds([]); setOrigin(mockMode ? 'local' : 'backend')
    const all = scopeSections(sources, next).map(row => String(row.id))
    setSelected(all); setActiveSection(all[0] || '')
  }
  const setup = () => {
    const existing = initial?.id ? tables.find(table => same(table.id, initial.id)) : null
    if (existing && matchesScope(existing, scope) && selected.some(id => same(id, existing.sectionId))) {
      const existingOrigin = existing.origin || 'local'
      setOrigin(existingOrigin); updateConfig(editablePlanning(existing.planning) || initialPlanning(sources, scope, entries)); setActiveSection(existing.sectionId)
      setStep(existing.publicationStatus === 'draft' ? 2 : 4)
      return
    }
    updateConfig(initialPlanning(sources, scope, entries))
    setStep(2)
  }
  const errors = config ? [...planningErrors(config, sources, { ...scope, sectionId: selected[0] }, entries), ...(config.automaticErrors || [])] : []
  const runGeneration = async replace => { const result = await generate({ scope: Object.fromEntries(hierarchy.map(field => [field, scope[field]])), selected, config, expected: currentTables, replace }); if (result) { if (unsavedSetup) unsavedSetup.current = false; if (Array.isArray(result)) setBatchIds(result.filter(row => matchesScope(row, scope) && selected.some(id => same(id, row.sectionId)) && row.planning?.calendar?.startDate === config.calendar.startDate && row.planning?.calendar?.endDate === config.calendar.endDate).map(row => String(row.id))); setActiveSection(activeSection || selected[0]); setStep(4) }; return result }
  const applySetup = async () => { const result = await saveSetup(currentTables, config); if (result) { if (unsavedSetup) unsavedSetup.current = false; setImpactOpen(false); setStep(4) } }
  const setupChanged = currentTables.some(row => JSON.stringify(row.planning) !== JSON.stringify(config))
  const savedEntries = currentTables.flatMap(row => row.entries)
  return <section className="tt-clean-builder" aria-label="Timetable Builder">
    <nav className="tt-stepper" aria-label="Builder steps">{['Academic Setup', 'Period Structure', 'Generate Timetable', 'Review & Publish'].map((label, index) => initial?.sectionId && index === 0 ? null : <button key={label} aria-current={step === index + 1 ? 'step' : undefined} className={step === index + 1 ? 'active' : ''} disabled={busy || (index > 0 && !config) || (index === 3 && !currentTables.length) || (currentTables.some(row => row.publicationStatus === 'published') && [1, 2].includes(index))} onClick={() => setStep(index + 1)}><span>{index + 1}</span>{label}</button>)}</nav>
    {step === 1 && <section className="tt-card tt-clean-step"><h2>Academic setup</h2><div className="tt-form-grid"><div className="tt-field"><span>Academic Year</span><div className="tt-readonly-value">{sources.years.find(row => same(row.id, scope.academicYearId))?.name || 'Active academic year unavailable'}</div></div>{hierarchy.slice(1).map((field, index) => <TimetableSelect key={field} label={labels[index + 1]} value={scope[field]} options={options[field]} disabled={busy || Boolean(index && !scope[hierarchy[index]])} onChange={value => change(field, value)} />)}</div>
      {scope.semesterId && <><h3>Sections ({sections.length})</h3><div className="tt-checks">{sections.map(section => <label key={section.id}><input type="checkbox" checked={selected.some(id => same(id, section.id))} onChange={event => setSelected(old => event.target.checked ? [...old, String(section.id)] : old.filter(id => !same(id, section.id)))} />{section.name}</label>)}</div>{!sections.length && <p>No active sections match this academic context.</p>}</>}
      <button className="tt-button tt-primary" disabled={!selected.length || busy} onClick={setup}>Continue</button></section>}
    {step === 2 && config && <PeriodSetupStep config={config} setConfig={setConfig} sources={sources} scope={scope} entries={entries} busy={busy} errors={errors} back={initial?.sectionId && onBack ? onBack : () => setStep(1)} continueSetup={() => setStep(3)} />}
    {step === 3 && config && <><SubjectCoverage sources={sources} scope={scope} selected={selected} config={config} setConfig={setConfig} refresh={refresh} faculty={faculty} disabled={busy} /><div className="tt-actions"><button className="tt-button" onClick={() => setStep(2)}>Back</button><button className="tt-button tt-primary" disabled={busy || !enabled || errors.length > 0} onClick={async () => { if (currentTables.length) { if (setupChanged && savedEntries.length) setImpactOpen(true); else await applySetup() } else await runGeneration(false) }}>{currentTables.length ? 'Save Settings' : busy ? 'Generating timetables…' : 'Generate Timetable'}</button></div>{busy && !currentTables.length && <p role="status">Generating coordinated section drafts and checking campus-wide conflicts...</p>}</>}
    {step === 4 && table && <TimetableWorkspace canManage={enabled} mockMode={mockMode} table={table} tables={currentTables} sources={sources} entries={entries} busy={busy} section={setActiveSection} faculty={faculty} generate={() => runGeneration(false)} regenerate={() => runGeneration(true)} save={save} remove={remove} validate={validate} publish={publish} reopen={reopen} />}
    {impactOpen && <WorkspaceDrawer modal title="Configuration change impact" busy={busy} close={() => setImpactOpen(false)}><div className="tt-clean-step"><p>Review the existing draft data before applying shared timing changes.</p><div className="tt-live-summary"><article><strong>{currentTables.length}</strong><span>affected sections</span></article><article><strong>{savedEntries.length}</strong><span>existing classes</span></article><article><strong>{new Set(savedEntries.map(row => String(row.facultyId)).filter(Boolean)).size}</strong><span>assigned faculty</span></article><article><strong>{new Set(savedEntries.map(row => row.roomId || row.classroom).filter(Boolean)).size}</strong><span>used rooms</span></article></div><p>Settings will be saved only if every existing class remains valid. No class will be regenerated or removed.</p><div className="tt-actions"><button className="tt-button" disabled={busy} onClick={() => setImpactOpen(false)}>Cancel</button><button className="tt-button tt-primary" disabled={busy} onClick={applySetup}>Review and Apply</button></div></div></WorkspaceDrawer>}
  </section>
}

// Related PeriodSetupStep component and its private helpers.

function PeriodSetupStep({ config, setConfig, sources, entries, busy, errors, back, continueSetup }) {
  const settings = config.automatic || DAILY_PERIOD_SETUP
  const rooms = roomOptions(sources, entries)
  const startDate = String(config.calendar.startDate || '').slice(0, 10)
  const endDate = String(config.calendar.endDate || '').slice(0, 10)
  const rebuild = (field, value) => setConfig(old => {
    const automatic = { ...old.automatic, [field]: value }
    const result = dailyPeriods(automatic, old.periods)
    return { ...old, automatic, periods: result.periods, automaticErrors: result.errors }
  })
  const calendar = (field, value) => setConfig(old => ({ ...old, calendar: { ...old.calendar, [field]: value, reviewed: true } }))
  return <section className="tt-card tt-clean-step" aria-label="Daily Schedule Setup">
    <h2>Period Structure</h2><p>Set the working days, teaching periods and breaks.</p>
    <fieldset className="tt-period-controls" disabled={busy}>
      <div className="tt-form-grid">{[['startTime', 'College Start Time', 'time'], ['periodsPerDay', 'Periods Per Day', 'number'], ['duration', 'Period Duration (minutes)', 'number'], ['breakDuration', 'Short Break (minutes, 0 to disable)', 'number'], ['breakAfter', 'Break after period', 'number'], ['lunchDuration', 'Lunch (minutes, 0 to disable)', 'number'], ['lunchAfter', 'Lunch after period', 'number']].map(([field, label, type]) => <label className="tt-field" key={field}><span>{label}</span><input type={type} min={field.includes('Duration') ? 0 : 1} step={1} value={settings[field]} onChange={event => rebuild(field, event.target.value)} /></label>)}</div>
      <h3>Working days</h3><div className="tt-checks">{WEEKDAYS.map(day => <label key={day}><input type="checkbox" checked={config.calendar.workingDays.includes(day)} onChange={event => calendar('workingDays', event.target.checked ? WEEKDAYS.filter(value => value === day || config.calendar.workingDays.includes(value)) : config.calendar.workingDays.filter(value => value !== day))} />{day.slice(0, 3)}</label>)}</div>
      <h3>Timetable Validity Period</h3>
      <p className="tt-hint">Validity is inherited from the selected academic year: {startDate || 'not configured'} to {endDate || 'not configured'}.</p>
      <details><summary>Available rooms ({config.rooms.length})</summary><div className="tt-checks">{rooms.map(room => <label key={room.value}><input type="checkbox" checked={config.rooms.includes(room.value)} onChange={event => setConfig(old => ({ ...old, rooms: event.target.checked ? [...old.rooms, room.value] : old.rooms.filter(value => value !== room.value) }))} />{room.name}</label>)}</div>{!rooms.length && <p>No room references were supplied by sections or existing timetable entries. Configure a section room in Section Management.</p>}</details>
    </fieldset>
    {config.periods.length > 0 && <section aria-label="Generated Period Structure">
      <h3>Generated Period Structure</h3>
      <ol className="tt-generated-periods">{config.periods.map((period, index) => <li key={periodKey(period)} data-kind={periodType(period)}>
        <strong>{periodLabel(period, index)}</strong><span>{period.startTime.slice(0, 5)} – {period.endTime.slice(0, 5)} · {timeMinutes(period.endTime) - timeMinutes(period.startTime)} min</span>
      </li>)}</ol>
    </section>}
    {errors.length > 0 && <div className="tt-error" role="alert">{errors.map(error => <p key={error}>{error}</p>)}</div>}
    <footer className="tt-actions"><button className="tt-button" onClick={back}>Back</button><button className="tt-button tt-primary" disabled={busy || Boolean(errors.length)} onClick={continueSetup}>Continue to Subjects</button></footer>
  </section>
}


// Related SubjectCoverage component and its private helpers.

export function WeeklyRequirement({ allocation, refresh, disabled }) {
  const [value, setValue] = useState(allocation.periodsPerWeek ?? '')
  const [busy, setBusy] = useState(false), [error,setError] = useState(''), [pending,setPending] = useState(false)
  const lock = useRef(false), acknowledged = useRef(false)
  return <form className="tt-weekly-requirement" onSubmit={async event => {
    event.preventDefault()
    if(disabled || lock.current)return
    if(!Number.isInteger(Number(value)) || Number(value)<1){setError('Weekly periods must be a positive whole number.');return}
    lock.current=true;setBusy(true);setError('')
    try {
      if(!acknowledged.current){await updateWeeklyRequirement(allocation,value);acknowledged.current=true;setPending(true)}
      await refresh();acknowledged.current=false;setPending(false);showToast('Weekly requirement saved.','success')
    } catch(reason){setError(reason.message || 'Unable to save weekly requirement.')}
    finally{lock.current=false;setBusy(false)}
  }}><input aria-label={'Weekly periods for '+(allocation.facultyName || allocation.facultyId)+', section '+allocation.sectionId} type="number" min="1" step="1" value={value} disabled={busy || disabled || pending} onChange={event=>setValue(event.target.value)}/><span>/ week</span><button className="tt-button" disabled={busy || disabled || (!pending && Number(value)===Number(allocation.periodsPerWeek))}>{pending?'Retry requirement refresh':'Save'}</button>{error && <p role="alert">{error}</p>}</form>
}

function SubjectCoverage({ sources, scope, selected, config, setConfig, refresh, faculty, disabled }) {
  const subjects = eligibleSubjects(sources.subjects, scope)
  const sections = sources.sections.filter(row => selected.some(id => same(id, row.id)))
  const change = (id, field, value) => setConfig(old => ({ ...old, requirements: { ...old.requirements, [id]: { ...old.requirements[id], [field]: value } } }))
  return <section className="tt-card tt-clean-step"><h2>Subjects & faculty coverage</h2><p>Select existing semester subjects. Weekly periods are saved to the existing faculty allocation.</p>
    {!subjects.length ? <p>No active subjects are mapped to this semester.</p> : <div className="tt-coverage-scroll"><table className="tt-coverage"><thead><tr><th>Subject</th><th>Periods per session</th>{sections.map(section => <th key={section.id}>{section.name}</th>)}</tr></thead><tbody>{subjects.map(subject => <tr key={subject.id}>
      <th><label><input type="checkbox" disabled={disabled} checked={config.requirements[key(subject.id)]?.selected !== false} onChange={event => change(key(subject.id), 'selected', event.target.checked)} /> {subject.name}</label></th>
      <td><input aria-label={`Consecutive periods for ${subject.name}`} type="number" min="1" step="1" disabled={disabled} value={config.requirements[key(subject.id)]?.blockSize || 1} onChange={event => change(key(subject.id), 'blockSize', event.target.value)} /></td>
      {sections.map(section => {
        const sectionScope = { ...scope, sectionId: section.id }
        const requirement = subjectRequirements(sources, sectionScope, {}) .find(item => same(item.subject.id, subject.id))
        const allocations = sources.allocations.filter(row => same(row.sectionId, section.id) && same(row.subjectId, subject.id) && (!row.academicYearId || same(row.academicYearId, scope.academicYearId)) && same(row.branchId, scope.branchId) && same(row.semesterId, scope.semesterId))
        return <td key={section.id}>{!requirement?.faculty.length ? <span className="tt-error">Faculty not assigned</span> : allocations.map(allocation => <div key={allocation.allocationId ?? allocation.id ?? allocation.facultyId}><button className="tt-text-button" onClick={() => faculty(allocation.facultyId)}>{sources.faculty.find(row => same(row.id, allocation.facultyId))?.name || 'Inactive faculty'}</button><WeeklyRequirement allocation={allocation} refresh={refresh} disabled={disabled} /></div>)}{requirement?.source === 'Not configured' && requirement?.faculty.length > 0 && <small>Set a consistent weekly requirement for this section.</small>}</td>
      })}
    </tr>)}</tbody></table></div>}
    <p className="tt-hint">Consecutive periods apply only when explicitly configured here; a session cannot cross Break or Lunch.</p>
  </section>
}

// TimetableWorkspace
export function TimetableWorkspace({ canManage = true, mockMode = false, table, tables, sources, entries, busy, section, faculty, generate, regenerate, save, remove, validate, publish, reopen }) {
  const [drawer, setDrawer] = useState(null), [issues, setIssues] = useState([]), [validatedRevision, setValidatedRevision] = useState(''), [highlight, setHighlight] = useState('')
  const rows = entries.filter(row => same(row.timetableId, table.id)), draft = canManage && table.publicationStatus === 'draft'
  const local = !mockMode || table.origin !== 'backend'
  const revisionKey = JSON.stringify(tables.map(row => [String(row.id), row.revision, row.entries, row.planning]).sort(([a], [b]) => a.localeCompare(b)))
  const validationCurrent = Boolean(validatedRevision) && validatedRevision === revisionKey
  const blockingIssues = issues.filter(issue => issue.blocking !== false)
  const canPublish = local && draft && validationCurrent && blockingIssues.length === 0
  const unscheduled = schedulingIssues(sources, table, table.planning, table.entries)
  const coverage = scheduleCoverage(table, sources, entries)
  const conflicts = rows.flatMap(row => conflictsFor(row, entries).map(item => ({ ...item, reason: item.message, sectionId: table.sectionId, entryId: row.id })))
  const review = async () => {
    setValidatedRevision('')
    const result = await validate(tables)
    if (result) {
      setIssues(result)
      setValidatedRevision(revisionKey)
      setDrawer({ kind: 'validation' })
    }
  }
  const categoryCounts = [
    ['Section conflicts', issue => /section conflict|section is already|section overlap/i.test(issue.reason)],
    ['Faculty conflicts', issue => /faculty conflict|faculty is already|faculty overlap/i.test(issue.reason)],
    ['Room conflicts', issue => /classroom|room conflict|room is already|room overlap/i.test(issue.reason)],
    ['Period conflicts', issue => /period|break|lunch|time range|overlap|invalid slot/i.test(issue.reason)],
    ['Subject requirements', issue => /requirement|weekly|allocation|unscheduled/i.test(issue.reason)],
  ].map(([label, matches]) => [label, issues.filter(matches).length])
  const drawerIssues = drawer?.kind === 'unscheduled' ? unscheduled : drawer?.kind === 'conflicts' ? conflicts : issues
  const focus = issue => { section(issue.sectionId || table.sectionId); setHighlight(issue.entryId || ''); setDrawer(null) }
  return <section className="tt-card tt-clean-workspace" data-print-scope>
    {tables.length > 1 && <nav className="tt-section-tabs" aria-label="Sections" data-no-print>{tables.map(item => {
      const missing = schedulingIssues(sources, item, item.planning, item.entries).length
      const count = entries.filter(row => same(row.timetableId, item.id)).filter(row => conflictsFor(row, entries).length).length
      return <button className={`tt-button ${item.id === table.id ? 'tt-primary' : ''}`} key={item.id} onClick={() => { section(item.sectionId); setHighlight('') }}><strong>{sources.sections.find(row => same(row.id, item.sectionId))?.name}</strong><small>{item.entries.length} classes | {missing} unscheduled | {count} conflicts</small></button>
    })}</nav>}
    <header className="tt-card-heading"><div><h2>{table.name}</h2><span className="tt-status">{table.publicationStatus === 'published' ? 'PUBLISHED' : !local ? 'STATUS UNAVAILABLE' : validationCurrent ? blockingIssues.length ? 'VALIDATION FAILED' : 'READY TO PUBLISH' : 'DRAFT · NEEDS VALIDATION'}</span><div className="tt-actions tt-workspace-counts"><span>{rows.length} Scheduled</span><button className="tt-button" onClick={() => { setDrawer({ kind: 'unscheduled' }) }}>{unscheduled.length} Unscheduled</button><button className="tt-button" onClick={() => { setDrawer({ kind: 'conflicts' }) }}>{conflicts.length} Conflicts</button></div></div><div className="tt-actions" data-no-print>
      <PrintDetailsButton title={table.name} />
      <ExportMenu rows={rows} columns={[
        { label: 'Day', value: 'dayOfWeek' }, { label: 'Start', value: 'startTime' }, { label: 'End', value: 'endTime' },
        { label: 'Subject', value: 'subjectName' }, { label: 'Faculty', value: 'facultyName' }, { label: 'Room', value: 'classroom' },
      ]} title={table.name} filename="timetable" reportType="excel" onDownload={exportToExcelXml} />
      {draft && local && <button className="tt-button" disabled={busy} onClick={generate}>Generate Missing</button>}
      {local && (draft || mockMode) && <details className="tt-more-actions"><summary className="tt-button">More Actions <span aria-hidden="true">⌄</span></summary>{draft ? <button className="tt-button" disabled={busy} onClick={() => setDrawer({ kind: 'regenerate' })}>Regenerate</button> : <button className="tt-button" disabled={busy} onClick={() => setDrawer({ kind: 'reopen' })}>Open as Draft</button>}</details>}
        <button className="tt-button" disabled={busy || !local} title={!local ? 'Validation is unavailable for backend timetables.' : undefined} onClick={review}>Validate</button>
        <button className="tt-button tt-primary" disabled={busy || !canPublish} title={!local ? 'Publishing requires a timetable lifecycle API.' : !draft ? 'This timetable is already published.' : !validationCurrent ? 'Validate this exact timetable revision before publishing.' : blockingIssues.length ? 'Resolve blocking validation issues before publishing.' : undefined} onClick={() => setDrawer({ kind: 'publish', revisions: tables.map(row => ({ id: row.id, revision: row.revision })) })}>Publish</button>
    </div></header>
    <p className="tt-workspace-coverage">Weekly coverage: {coverage == null ? 'Unavailable' : `${coverage}%`}</p>
    {!local && <p className="tt-notice">Backend entries use existing timetable and slot IDs. Publication status is not supplied by the entry API; publish and generation require a timetable lifecycle API.</p>}
    <p>Timetable Validity Period: {table.planning.calendar.startDate || 'Not configured'} – {table.planning.calendar.endDate || 'Not configured'}</p>
    <TimetableGrid rows={rows} periods={table.planning.periods} workingDays={table.planning.calendar.workingDays} editable={draft || (!local && table.publicationStatus === 'unavailable')} add={row => setDrawer({ kind: 'entry', initial: row })} inspect={row => setDrawer({ kind: 'entry', initial: row })} faculty={faculty} highlight={highlight} clearHighlight={() => setHighlight('')} />
    {drawer?.kind === 'entry' && <ScheduleDialog key={`${table.id}-${drawer.initial.id || 'new'}`} initial={drawer.initial} table={table} sources={sources} entries={entries} save={form => save(table, form)} remove={id => remove(table, id)} close={() => setDrawer(null)} readOnly={!canManage || table.publicationStatus === 'published'} />}
    {['validation', 'unscheduled', 'conflicts'].includes(drawer?.kind) && <WorkspaceDrawer title={drawer.kind === 'validation' ? 'Validation result' : drawer.kind === 'unscheduled' ? 'Unscheduled requirements' : 'Conflicts'} close={() => setDrawer(null)}><div className="tt-clean-step">{drawer.kind === 'validation' && <><h3>{blockingIssues.length ? 'VALIDATION FAILED' : 'READY TO PUBLISH'}</h3><div className="tt-validation-summary">{categoryCounts.map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}</div><p>{validationCurrent ? 'Checked against the current timetable revision and loaded campus schedule.' : 'Timetable changed after validation. Validate again before publishing.'}</p></>}{!drawerIssues.length ? <p>No issues found.</p> : drawerIssues.map((issue, index) => <button className="tt-issue" key={`${issue.tableId || ''}-${issue.entryId || ''}-${index}`} onClick={() => focus(issue)}><strong>{issue.blocking === false ? 'Warning · ' : ''}{sources.sections.find(row => same(row.id, issue.sectionId || table.sectionId))?.name || `Section ${issue.sectionId || table.sectionId}`} · {issue.subjectName || ''}</strong><span>{issue.reason}</span>{issue.entryId && <small>View Issue</small>}</button>)}</div></WorkspaceDrawer>}
    {['publish', 'regenerate', 'reopen'].includes(drawer?.kind) && <WorkspaceDrawer modal title={drawer.kind === 'publish' ? 'Publish timetable' : drawer.kind === 'regenerate' ? 'Regenerate selected sections?' : 'Open published timetable as draft?'} busy={busy} close={() => setDrawer(null)}><div className="tt-clean-step"><p>{table.name}</p>{drawer.kind === 'publish' ? <><p>Academic scope: {sources.years.find(row => same(row.id, table.academicYearId))?.name || 'Unavailable'} · {sources.branches.find(row => same(row.id, table.branchId))?.name || 'Unavailable'} · {tables.length} section(s)</p><p>Current status: {table.publicationStatus.toUpperCase()} · Validation: READY TO PUBLISH · Blocking conflicts: 0</p><p className="tt-notice">{mockMode ? "Mock Mode: this publishes only to this browser's timetable view." : 'This publishes the selected timetable period through the backend. Existing published timetables are retained.'}</p></> : <p>{drawer.kind === 'regenerate' ? 'Generated scheduling may be replaced across the selected sections. Manual additions, edits and moves will be preserved.' : 'This section will stop appearing in published faculty schedules until it is published again.'}</p>}<div className="tt-actions"><button className="tt-button" disabled={busy} onClick={() => setDrawer(null)}>Cancel</button><button className="tt-button tt-primary" disabled={busy || (drawer.kind === 'publish' && !canPublish)} onClick={async () => { const result = drawer.kind === 'publish' ? await publish(tables) : drawer.kind === 'regenerate' ? await regenerate() : await reopen(table); if (result) setDrawer(null) }}>Confirm {drawer.kind === 'publish' ? 'Publish Timetable' : drawer.kind === 'regenerate' ? 'Regenerate' : 'Open Draft'}</button></div></div></WorkspaceDrawer>}
  </section>
}

// FacultyTimetable
export function FacultyTimetable({ facultyId, sources, entries, tables, inspect }) {
  const [view, setView] = useState('today'), [date, setDate] = useState(localDate())
  const faculty = sources.faculty.find(row => same(row.id, facultyId))
  const weekStart = new Date(`${date}T12:00:00Z`)
  weekStart.setUTCDate(weekStart.getUTCDate() - (weekStart.getUTCDay() + 6) % 7)
  const weekDates = Number.isNaN(weekStart.getTime()) ? [] : Array.from({ length: 7 }, (_, index) => new Date(weekStart.getTime() + index * 86400000).toISOString().slice(0, 10))
  const rows = view === 'today' ? publishedForFaculty(facultyId, entries, tables, date) : [...new Map(weekDates.flatMap(day => publishedForFaculty(facultyId, entries, tables, day)).map(row => [`${row.timetableId}:${row.id}`, row])).values()]
  const branchNames = row => [sources.departments.find(item => same(item.id, sources.branches.find(branch => same(branch.id, row.branchId))?.departmentId))?.name, sources.branches.find(item => same(item.id, row.branchId))?.name, sources.semesters.find(item => same(item.id, row.semesterId))?.name, row.sectionName].filter(Boolean).join(' · ')
  const now = new Date(), nowMinutes = now.getHours() * 60 + now.getMinutes()
  const current = date === localDate() ? rows.filter(row => { const start = row.startTime.slice(0, 5).split(':').map(Number), end = row.endTime.slice(0, 5).split(':').map(Number); return start[0] * 60 + start[1] <= nowMinutes && end[0] * 60 + end[1] > nowMinutes }) : []
  const next = date === localDate() ? [...rows].filter(row => row.startTime.slice(0, 5).split(':').map(Number).reduce((hours, minutes) => hours * 60 + minutes) > nowMinutes).sort((a, b) => a.startTime.localeCompare(b.startTime))[0] : null
  return <section className="tt-clean-step"><h2>{faculty?.name || 'My Timetable'}</h2><p>{faculty?.employeeId ? `Employee ID: ${faculty.employeeId} · ` : ''}{sources.departments.find(row => same(row.id, faculty?.departmentId))?.name || 'Department unavailable'}</p><div className="tt-actions">{['today', 'week'].map(value => <button key={value} className={`tt-button ${view === value ? 'tt-primary' : ''}`} aria-pressed={view === value} onClick={() => setView(value)}>{value === 'today' ? 'Today' : 'Week'}</button>)}{<label className="tt-field"><span>Schedule date</span><input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>}</div><p>{rows.length} teaching sessions · {new Set(rows.map(row => row.sectionId)).size} sections</p>
    {view === 'today' && date === localDate() && <div className="tt-live-summary"><article><strong>{current.map(row => row.subjectName).join(', ') || 'No current class'}</strong><span>Current class</span></article><article><strong>{next ? `${next.subjectName} · ${next.startTime.slice(0, 5)}` : 'No upcoming class'}</strong><span>Next class</span></article></div>}
    {view === 'today' ? <div className="tt-faculty-agenda">{rows.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(row => <button className="tt-class" key={`${row.origin}-${row.id}`} onClick={() => inspect?.(row)}><strong>{row.startTime.slice(0, 5)}–{row.endTime.slice(0, 5)} · {row.subjectName}</strong><span>{branchNames(row)} · {row.classroom}</span></button>)}{!rows.length && <p>No published classes on this date. Holidays and non-working days are skipped.</p>}</div> : <TimetableGrid rows={rows} inspect={inspect} occupancy />}
    {view === 'today' && <small>{weekday(date)} · Published weekly templates</small>}
  </section>
}

// TimetableGrid

function TimetableCell({ row, inspect, faculty, highlight }) {
  return <article data-entry-id={row.id} className={`tt-class ${highlight === row.id ? 'tt-highlight' : ''}`}>
    <div className="tt-print-slot" aria-hidden="true"><strong>{row.subjectName || row.subjectCode}</strong><small>{row.facultyName}</small><small>{row.classroom}</small></div>
    <button className="tt-class-details" onClick={() => inspect?.(row)}><strong>{row.subjectCode || row.subjectName || 'Subject unavailable'}</strong>{row.subjectCode && row.subjectName && row.subjectName !== row.subjectCode && <span>{row.subjectName}</span>}<small>{row.startTime?.slice(0, 5)} - {row.endTime?.slice(0, 5)}</small><small>{row.classroom || 'Room not assigned'}</small>{row.sectionName && <small>{row.sectionName}</small>}</button>
    {faculty ? <button className="tt-faculty-link" onClick={() => faculty(row.facultyId)}>{row.facultyName}</button> : <small>{row.facultyName || 'Faculty not assigned'}</small>}
  </article>
}

const periodKey = slot => [slot.startTime, slot.endTime, periodType(slot)].join('|')

export function TimetableGrid({ rows, periods: configured = [], workingDays, editable = false, add, inspect, occupancy = false, faculty, highlight, clearHighlight }) {
  const days = [...new Set([...(workingDays?.length ? workingDays : DAYS), ...rows.map(row => row.dayOfWeek)])]
  const [selectedDay, setSelectedDay] = useState('MONDAY')
  const root = useRef(null)
  useEffect(() => {
    if (!highlight) return
    requestAnimationFrame(() => [...(root.current?.querySelectorAll('[data-entry-id]') || [])].find(element => element.dataset.entryId === String(highlight) && element.getClientRects().length)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }, [highlight, rows])
  const day = rows.find(row => row.id === highlight)?.dayOfWeek || (days.includes(selectedDay) ? selectedDay : days[0])
  const candidates = [...configured.map((row, index) => ({ ...row, name: periodLabel(row, index) })), ...rows.filter(row => !configured.some(period => isTeachingPeriod(period) && overlaps(period, row))).map(row => ({ startTime: row.startTime, endTime: row.endTime, type: 'class', name: 'Class' }))]
  const periods = [...new Map(candidates.map(row => [`${row.startTime.slice(0, 5)}|${row.endTime.slice(0, 5)}|${periodType(row)}`, row])).values()]
    .filter(row => isTeachingPeriod(row) || (!rows.some(entry => overlaps(row, entry)) && !configured.some(period => isTeachingPeriod(period) && overlaps(row, period))))
    .sort((a, b) => (timeMinutes(a.startTime) ?? 1440) - (timeMinutes(b.startTime) ?? 1440))
  if (!periods.length && !editable) return <EmptyState title="No scheduled classes for this selection" message="Choose a timetable or publish a draft for this academic context." />
  const slots = periods.length ? periods : [{ startTime: '', endTime: '', name: 'Period', type: 'class' }]
  const empty = (slot, day) => <button className="tt-empty-cell" aria-label={`Add class ${day} ${slot.name} ${slot.startTime.slice(0, 5)}`} onClick={() => add({ dayOfWeek: day, startTime: slot.startTime, endTime: slot.endTime, timetableSlotId: slot.id })}><FiPlus /><span>Add Slot</span></button>
  const card = row => <TimetableCell key={`${row.origin}-${row.id}`} row={row} inspect={inspect} occupancy={occupancy} faculty={faculty} highlight={highlight} />
  const agenda = [
    ...rows.filter(row => row.dayOfWeek === day).map(row => ({ startTime: row.startTime, id: `entry-${row.origin}-${row.id}`, content: card(row) })),
    ...slots.filter(slot => !isTeachingPeriod(slot) || (editable && !rows.some(row => row.dayOfWeek === day && overlaps(row, slot)))).map(slot => ({ startTime: slot.startTime, id: `period-${slot.id || slot.startTime}-${periodType(slot)}`, content: isTeachingPeriod(slot) ? <div className="tt-agenda-slot"><small>{slot.name} · {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}</small>{empty(slot, day)}</div> : <div className="tt-agenda-break"><strong>{slot.name}</strong><span>{slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}</span></div> })),
  ].sort((a, b) => timeMinutes(a.startTime) - timeMinutes(b.startTime))
  return <div ref={root} className="tt-grid-container">
    {!rows.length && <p className="tt-notice tt-grid-empty-note" role="status">{editable ? 'No classes have been scheduled yet. Add a class or use Generate Missing to fill this draft.' : 'No scheduled classes were returned for this timetable.'}</p>}
    <div className="tt-grid-scroll" tabIndex={0} role="region" aria-label="Weekly timetable grid"><table className="tt-week tt-inter-grid" style={{ '--tt-period-count': slots.length }}>
      <caption>Weekly timetable</caption>
      <thead><tr><th scope="col">Day</th>{slots.map(slot => <th scope="col" key={periodKey(slot)}>{slot.name}<small>{slot.startTime.slice(0, 5)} – {slot.endTime.slice(0, 5)}</small></th>)}</tr></thead>
      <tbody>{days.map(day => <tr key={day}>
        <th scope="row">{day.slice(0, 1) + day.slice(1).toLowerCase()}</th>
        {slots.map(slot => {
          if (!isTeachingPeriod(slot)) return <td key={periodKey(slot)} className="tt-inter-break" data-period-type={periodType(slot)}>{slot.name}<small>{slot.startTime.slice(0, 5)} – {slot.endTime.slice(0, 5)}</small></td>
          const matching = rows.filter(row => row.dayOfWeek === day && (overlaps(row, slot) || (!row.startTime && !slot.startTime)))
          return <td key={periodKey(slot)}>{matching.map(card)}{!matching.length && (editable ? empty(slot, day) : <span className="tt-empty-slot" aria-label={occupancy ? 'No published booking' : 'No class scheduled'}>—</span>)}</td>
        })}
      </tr>)}</tbody>
    </table></div>
    <div className="tt-day-view" data-no-print><div className="tt-day-tabs" role="group" aria-label="Schedule Day">{days.map(value => <button key={value} className={value === day ? 'active' : ''} aria-pressed={value === day} onClick={() => { setSelectedDay(value); clearHighlight?.() }}>{value.slice(0, 3)}</button>)}</div>{agenda.map(item => <div key={item.id}>{item.content}</div>)}{!rows.some(row => row.dayOfWeek === day) && <p>No classes for this day.</p>}</div>
  </div>
}

// TimetableComponents

function TimetableSelect({ label, value, options, onChange, disabled = false, required = false }) {
  return <div className="tt-field"><span>{label}{required && ' *'}</span><SearchableSelect label={label} value={value} options={options} onChange={onChange} disabled={disabled} required={required} placeholder={`Select ${label.toLowerCase()}`} /></div>
}

export function ScheduleDialog({ initial, table, sources, entries, save, remove, close, readOnly = false }) {
  const [form, setForm] = useState({ subjectId: '', facultyId: '', dayOfWeek: table.planning?.calendar.workingDays[0] || 'MONDAY', startTime: '', endTime: '', classroom: '', entryType: '', ...initial })
  const originalForm = useRef(form)
  const closeEditor = () => {
    if (readOnly || JSON.stringify(form) === JSON.stringify(originalForm.current) || window.confirm('Discard unsaved timetable entry changes?')) close()
  }
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirmRemove, setConfirmRemove] = useState(false)
  const [mode, setMode] = useState('edit')
  const subjects = eligibleSubjects(sources.subjects, table).filter(row => table.planning?.requirements?.[key(row.id)]?.selected !== false)
  const faculty = eligibleFaculty(sources.faculty, sources.allocations, form.subjectId, table)
  const conflicts = conflictsFor({ ...form, calendar: table.planning?.calendar, sectionId: table.sectionId }, entries)
  const suggestions = conflicts.length && table.planning ? availableSlots(form, table, sources, entries) : []
  const planErrors = entryPlanningErrors(form, table.planning, sources, table, entries)
  const requirement = subjectRequirements(sources, table, table.planning?.requirements).find(item => same(item.subject.id, form.subjectId))
  const sessions = periodSessions(table.planning?.periods || [], requirement?.blockSize || 1).map(block => ({ id: block[0].id, name: `${block.map(periodLabel).join(' + ')} | ${block[0].startTime.slice(0, 5)}-${block.at(-1).endTime.slice(0, 5)}`, startTime: block[0].startTime, endTime: block.at(-1).endTime }))
  const rooms = roomOptions(sources, entries).filter(room => !table.planning || table.planning.rooms.includes(room.value))
  const change = (field, value) => { setForm(old => ({ ...old, [field]: value, ...(field === 'subjectId' ? { facultyId: '' } : {}) })); setError(''); setConfirmRemove(false) }
  const execute = async action => { setBusy(true); setError(''); try { await action(); close() } catch (reason) { if(reason.committed) close(); else setError(reason.message || 'Unable to save this schedule.') } finally { setBusy(false) } }
  const label = (list, id) => list.find(row => same(row.id, id))?.name || 'Unavailable'
  const details = readOnly || mode === 'details'
  const title = details ? 'Schedule details' : mode === 'move' ? 'Move schedule' : form.id ? 'Edit schedule' : 'Add Class'
  return <WorkspaceDrawer title={title} subtitle={table.name || table.timetableName} busy={busy} close={closeEditor} className="tt-schedule-dialog">
    {details ? <div className="tt-dialog-body"><dl>{[['Subject', label(sources.subjects, form.subjectId)], ['Faculty', label(sources.faculty, form.facultyId)], ['Day', form.dayOfWeek], ['Period', sessions.find(session => session.startTime === form.startTime && session.endTime === form.endTime)?.name || 'Not supplied'], ['Time', `${form.startTime || 'Unavailable'} – ${form.endTime || 'Unavailable'}`], ['Classroom / Lab', form.classroom || 'Not assigned'], ['Source', table.publicationStatus === 'published' ? 'Published timetable' : 'Backend draft']].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>{readOnly ? <p>This schedule is read-only. Published periods preserve history; draft changes require timetable edit permission.</p> : <div className="tt-actions"><button className="tt-button tt-primary" onClick={() => setMode('edit')}>Edit</button><button className="tt-button" onClick={() => setMode('move')}>Move</button><button className="tt-button tt-danger" disabled={busy} onClick={() => confirmRemove ? execute(() => remove(form.id)) : setConfirmRemove(true)}>{confirmRemove ? 'Confirm removal' : 'Remove class'}</button></div>}{error && <p className="tt-error" role="alert">{error}</p>}</div> : <form onSubmit={event => { event.preventDefault(); if (!conflicts.length && !planErrors.length) execute(() => save(form)) }}>
      <div className="tt-dialog-body">{form.id && <p>To move this class, choose another day or teaching period. Every change is checked for conflicts before saving.</p>}<div className="tt-form-grid"><TimetableSelect label="Subject" value={form.subjectId} options={subjects.map(row => ({ ...row, name: `${row.subjectCode || ''} · ${row.name}` }))} onChange={value => { change('subjectId', value); setForm(old => ({ ...old, entryType: subjects.find(row => same(row.id, value))?.subjectType || '' })) }} disabled={busy || mode === 'move'} /><TimetableSelect label="Faculty" value={form.facultyId} options={faculty} onChange={value => change('facultyId', value)} disabled={busy || !form.subjectId || mode === 'move'} /><TimetableSelect label="Day" value={form.dayOfWeek} options={table.planning?.calendar.workingDays || [...DAYS, 'SUNDAY']} onChange={value => change('dayOfWeek', value)} disabled={busy} />
        {table.planning ? <TimetableSelect label="Classroom / Lab" value={rooms.find(room => form.roomId && room.roomId ? same(room.roomId, form.roomId) : room.classroom === form.classroom)?.value || ''} options={rooms} disabled={busy || mode === 'move'} onChange={value => { const room = rooms.find(row => row.value === value); setForm(old => ({ ...old, classroom: room?.classroom || '', roomId: room?.roomId || '' })) }} /> : <label className="tt-field"><span>Classroom / Lab</span><input required maxLength={120} value={form.classroom} disabled={busy} onChange={event => change('classroom', event.target.value)} /></label>}
        <TimetableSelect label="Period" value={sessions.find(session => session.startTime.slice(0, 5) === form.startTime.slice(0, 5) && session.endTime.slice(0, 5) === form.endTime.slice(0, 5))?.id || ''} options={sessions} disabled={busy} onChange={value => { const period = sessions.find(row => same(row.id, value)); if (period) setForm(old => ({ ...old, timetableSlotId: period.id, startTime: period.startTime, endTime: period.endTime })) }} />
        <label className="tt-field"><span>Subject Type</span><input value={subjects.find(row => same(row.id, form.subjectId))?.subjectType || form.entryType || 'Not supplied'} readOnly /></label></div>
        {!subjects.length && <p className="tt-notice">No active API subjects match this academic mapping. Local sample subjects cannot be used as backend subject IDs.</p>}
        {form.subjectId && !faculty.length && <p className="tt-notice">No active faculty allocation exists for this subject and academic context.</p>}

        {conflicts.length > 0 && <div className="tt-error" role="alert">{conflicts.map(row => <p key={key(row.id)}>{row.message}</p>)}</div>}
        {suggestions.length > 0 && <section><h3>Suggested available slots</h3>{suggestions.map(row => <button type="button" className="tt-button" key={`${row.dayOfWeek}-${row.startTime}`} onClick={() => setForm(row)}>{row.dayOfWeek} {row.startTime.slice(0, 5)} - {row.endTime.slice(0, 5)}</button>)}</section>}
        {form.id && mode !== 'move' && <button type="button" className="tt-button" onClick={() => setMode('move')}>Move class</button>}
        {planErrors.length > 0 && <div className="tt-planning-help">{planErrors.map(message => <p key={message}>{message}</p>)}</div>}
        {error && <p className="tt-error" role="alert">{error}</p>}
      </div><footer>{form.id && <button type="button" className="tt-button tt-danger" disabled={busy} onClick={() => confirmRemove ? execute(() => remove(form.id)) : setConfirmRemove(true)}>{confirmRemove ? 'Confirm removal' : 'Remove class'}</button>}<button type="button" className="tt-button" disabled={busy} onClick={closeEditor}>Cancel</button><button className="tt-button tt-primary" disabled={busy || Boolean(conflicts.length) || Boolean(planErrors.length) || !form.subjectId || !form.facultyId}>{busy ? 'Saving...' : 'Save Draft Entry'}</button></footer>
    </form>}
  </WorkspaceDrawer>
}

// WorkspaceDrawer
// Shared focus handling for timetable drawers and compact confirmations.
function WorkspaceDrawer({ title, subtitle, close, busy = false, modal = false, children, footer, className }) {
  return <ViewDialog title={title} subtitle={subtitle} onClose={close} busy={busy} showExport={false} hideFooter={!footer} footerActions={footer} maxWidth={modal ? '560px' : '1100px'} className={className}><div className="tt-drawer-content">{children}</div></ViewDialog>
}
