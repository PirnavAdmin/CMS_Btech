import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import { getUserRole } from '../../auth/auth'
import { showToast } from '../../utils/toast'
import { backendWorkflow, loadBackendWorkflow } from '../../services/timetable/timetableBackendWorkflow'
import { timetableService } from '../../services/timetableService'
import { loadLive, resolveMyFaculty, workflowAdapter, draftCapabilityEnabled, saveBackendEntry } from '../../services/timetable/timetableWorkflowService'
import { academicLevel, decorateEntries, tableEntries } from '../../services/timetable/timetableDomain'
import { same, publicationState, existingSlots, DAYS } from '../../utils/timetableUtils'
import { roomOptions, localDate, classesOnDate } from '../../utils/timetablePlanner'
import TimetableBuilder from './TimetableBuilder'
import TimetableDashboard from './TimetableDashboard'
import FacultyTimetable from './FacultyTimetable'
import WorkspaceDrawer from './WorkspaceDrawer'
import { TimetableSelect } from './TimetableComponents'
import './TimetableManagement.css'
import './TimetableWorkflow.css'

function backendTables(backend, sources) {
  const groups = new Map()
  for (const row of decorateEntries(backend, sources)) {
    if (!row.timetableId) continue
    const id = String(row.timetableId)
    if (!groups.has(id)) {
      const branch = sources.branches.find(item => same(item.id, row.branchId))
      const semester = sources.semesters.find(item => same(item.id, row.semesterId))
      const periods = existingSlots(backend, row.timetableId).map((slot, index) => ({ ...slot, name: `P${index + 1}`, type: 'class' }))
      groups.set(id, { ...row, id, name: row.timetableName || `${branch?.name || 'Timetable'} / ${row.sectionName}`, level: academicLevel(semester || {}), departmentId: branch?.departmentId || '', publicationStatus: publicationState(row), origin: 'backend', entries: [], planning: { periods, requirements: {}, rooms: roomOptions(sources, backend).map(room => room.value), calendar: { startDate: row.effectiveFrom?.slice(0, 10) || '', endDate: row.effectiveTo?.slice(0, 10) || '', workingDays: DAYS, holidays: [], reviewed: true } } })
    }
    groups.get(id).entries.push(row)
  }
  return [...groups.values()]
}

export default function TimetableManagement() {
  const role = getUserRole(), admin = role === 'admin'
  const [tab, setTab] = useState(admin ? 'dashboard' : 'faculty'), [data, setData] = useState(null)
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [initial, setInitial] = useState(null), [builderKey, setBuilderKey] = useState(0), [facultyId, setFacultyId] = useState(''), [facultyDrawer, setFacultyDrawer] = useState(''), [facultyError, setFacultyError] = useState('')
  const adapter = () => draftCapabilityEnabled ? workflowAdapter() : backendWorkflow
  const refresh = async () => {
    if (!draftCapabilityEnabled) { const live = await loadBackendWorkflow(); setData(live); return live }
    const live = await loadLive()
    const tables = draftCapabilityEnabled ? await workflowAdapter().list() : []
    setData({ ...live, tables })
    return live
  }
  useEffect(() => {
    if (!['admin', 'faculty'].includes(role)) return
    let cancelled = false
    Promise.resolve().then(refresh).then(async live => {
      if (role === 'faculty') {
        try { const id = await resolveMyFaculty(live.sources); if (!cancelled) setFacultyId(id) }
        catch (reason) { if (!cancelled) setFacultyError(reason.message) }
      }
    }).catch(reason => { if (!cancelled) { setError(reason.message); showToast(reason.message, 'error') } }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [role])
  const mutate = async (action, successMessage = 'Timetable saved.') => {
    setBusy(true); setError('')
    try { const result = await action(); await refresh(); showToast(successMessage, 'success'); return result || true }
    catch (reason) { try { await refresh() } catch { setData(null) }; setError(reason.message); showToast(reason.message, 'error'); throw reason }
    finally { setBusy(false) }
  }
  const run = async (action, successMessage) => { try { return await mutate(action, successMessage) } catch { return null } }
  const validate = async tables => {
    setBusy(true); setError('')
    try { const issues = await adapter().validate(tables); const blocking = issues.filter(issue => issue.blocking !== false).length; showToast(blocking ? `Validation found ${blocking} blocking issue(s).` : issues.length ? `Validation passed with ${issues.length} warning(s).` : 'Validation passed.', blocking ? 'warning' : issues.length ? 'warning' : 'success'); return issues }
    catch (reason) { setError(reason.message); showToast(reason.message, 'error'); return null }
    finally { setBusy(false) }
  }
  if (!['admin', 'faculty'].includes(role)) return <Navigate to="/unauthorized" replace />
  const sources = data?.sources
  const tables = data ? draftCapabilityEnabled ? [...data.tables, ...backendTables(data.backend, sources)] : data.tables : []
  const entries = data ? decorateEntries([...data.backend.map(row => ({ ...row, origin: 'backend' })), ...(draftCapabilityEnabled ? tableEntries(data.tables) : [])], sources) : []
  const published = entries.filter(row => publicationState(row) === 'published')
  const today = data ? classesOnDate(published, localDate(), row => tables.find(table => same(table.id, row.timetableId))?.planning.calendar) : []
  const open = table => { setInitial(table || null); setBuilderKey(value => value + 1); setTab('builder') }
  return <DashboardLayout><main className="tt-page tt-workflow"><header className="tt-page-header"><div><h1>{admin ? 'Timetable Management' : 'My Timetable'}</h1><p>{admin ? 'Plan, review and publish section timetables.' : 'Your published teaching schedule.'}</p></div></header>
    {admin && <nav className="tt-actions" aria-label="Timetable navigation">{[['dashboard', 'Timetable Dashboard'], ['builder', 'Timetable Builder'], ['faculty', 'Faculty My Timetable']].map(([value, label]) => <button className={`tt-button ${tab === value ? 'tt-primary' : ''}`} key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>)}</nav>}
    {error && <p className="tt-error" role="alert">{error}</p>}
    {loading ? <p role="status">Loading academic data and timetables...</p> : data && <>
      {admin && draftCapabilityEnabled && <p className="tt-adapter-note"><strong>Mock Mode:</strong> timetable drafts and publication state are stored only in this browser. Academic records and allocations use the backend; this is not institution-wide publication.</p>}
      {admin && tab === 'dashboard' && <TimetableDashboard tables={tables} sources={sources} entries={entries} today={today} open={open} />}
      {admin && tab === 'builder' && <><button className="tt-button" disabled={busy} onClick={() => open(null)}>Create New Timetable Period</button><TimetableBuilder mockMode={draftCapabilityEnabled} key={builderKey} sources={sources} entries={entries} tables={tables} initial={initial} busy={busy} enabled={true} refresh={refresh} faculty={setFacultyDrawer} generate={args => run(() => adapter().generate(args))} saveSetup={(tables, config) => run(() => adapter().saveSetup(tables, config))} save={(table, form) => mutate(() => draftCapabilityEnabled ? table.origin === 'backend' ? saveBackendEntry(table, form) : workflowAdapter().saveEntry(table, form) : backendWorkflow.saveEntry(table, form))} remove={(table, id) => mutate(() => draftCapabilityEnabled ? table.origin === 'backend' ? timetableService.remove(id) : workflowAdapter().removeEntry(table, id) : backendWorkflow.removeEntry(table, id))} validate={validate} publish={expected => run(() => adapter().publish(expected), draftCapabilityEnabled ? 'Mock Mode: timetable published in this browser only.' : 'Timetable published.')} reopen={table => run(() => adapter().reopen(table))} /></>}
      {tab === 'faculty' && <section className="tt-card">{admin && <div className="tt-clean-step"><TimetableSelect label="Faculty" value={facultyId} options={sources.faculty} onChange={setFacultyId} /></div>}{facultyError && <p className="tt-error" role="alert">{facultyError}</p>}{facultyId ? <FacultyTimetable key={facultyId} facultyId={facultyId} sources={sources} entries={entries} tables={tables} /> : !facultyError && <p className="tt-clean-step">Select a faculty member to view published classes.</p>}</section>}
      {facultyDrawer && <WorkspaceDrawer title="Faculty schedule" close={() => setFacultyDrawer('')}><FacultyTimetable facultyId={facultyDrawer} sources={sources} entries={entries} tables={tables} /></WorkspaceDrawer>}
    </>}
  </main></DashboardLayout>
}
