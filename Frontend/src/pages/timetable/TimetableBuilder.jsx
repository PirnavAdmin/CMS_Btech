import { useState } from 'react'
import { TimetableSelect } from './TimetableComponents'
import PeriodSetupStep from './PeriodSetupStep'
import SubjectCoverage from './SubjectCoverage'
import TimetableWorkspace from './TimetableWorkspace'
import WorkspaceDrawer from './WorkspaceDrawer'
import { dailyPeriods, DAILY_PERIOD_SETUP } from '../../utils/timetablePeriods'
import { roomOptions, planningErrors } from '../../utils/timetablePlanner'
import { same, matchesScope } from '../../utils/timetableUtils'
import { contextOptions, changeContext, hierarchy, scopeSections } from '../../services/timetable/timetableDomain'

const labels = ['Academic Year', 'Department', 'Course', 'Branch', 'Academic Level', 'Semester']
const initialPlanning = (sources, scope, entries) => ({
  automatic: { ...DAILY_PERIOD_SETUP },
  periods: sources.yearSettings?.[scope.academicYearId]?.periods?.length ? sources.yearSettings[scope.academicYearId].periods : dailyPeriods(DAILY_PERIOD_SETUP).periods,
  calendar: { ...(sources.yearSettings?.[scope.academicYearId]?.calendar || {}), startDate: '', endDate: '', workingDays: sources.yearSettings?.[scope.academicYearId]?.calendar?.workingDays?.length ? sources.yearSettings[scope.academicYearId].calendar.workingDays : ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'], reviewed: true, holidays: sources.yearSettings?.[scope.academicYearId]?.calendar?.holidays || [] },
  rooms: roomOptions(sources, entries).map(row => row.value),
  requirements: {},
})
const editablePlanning = planning => {
  if (!planning?.calendar) return planning
  const startDate = String(planning.calendar.startDate || '').slice(0, 10)
  const endDate = String(planning.calendar.endDate || '').slice(0, 10)
  return { ...planning, calendar: { ...planning.calendar, startDate, endDate } }
}
export default function TimetableBuilder({ mockMode = false, sources, entries, tables, initial, busy, enabled, refresh, faculty, generate, saveSetup, save, remove, validate, publish, reopen }) {
  const [scope, setScope] = useState(initial || Object.fromEntries(hierarchy.map(field => [field, ''])))
  const [origin, setOrigin] = useState(initial?.origin || (mockMode ? 'local' : 'backend'))
  const [step, setStep] = useState(initial?.id ? 4 : 1)
  const [selected, setSelected] = useState(initial?.sectionId ? [String(initial.sectionId)] : [])
  const [activeSection, setActiveSection] = useState(initial?.sectionId || '')
  const [config, setConfig] = useState(initial?.planning ? editablePlanning(initial.planning) : null)
  const [batchIds, setBatchIds] = useState(initial?.id ? [String(initial.id)] : [])
  const [impactOpen, setImpactOpen] = useState(false)
  const options = contextOptions(sources, scope), sections = scopeSections(sources, scope)
  const currentTables = tables.filter(table => (table.origin || 'local') === origin && matchesScope(table, scope) && selected.some(id => same(id, table.sectionId)) && (batchIds.length ? batchIds.some(id => same(id, table.id)) : table.publicationStatus === 'draft' && config && table.planning?.calendar?.startDate === config.calendar.startDate && table.planning?.calendar?.endDate === config.calendar.endDate))
  const table = currentTables.find(row => same(row.sectionId, activeSection)) || currentTables[0]
  const change = (field, value) => {
    const next = changeContext(scope, field, value)
    setScope(next); setConfig(null); setBatchIds([]); setOrigin(mockMode ? 'local' : 'backend')
    const all = scopeSections(sources, next).map(row => String(row.id))
    setSelected(all); setActiveSection(all[0] || '')
  }
  const setup = () => {
    const existing = initial?.id ? tables.find(table => same(table.id, initial.id)) : null
    if (existing && matchesScope(existing, scope) && selected.some(id => same(id, existing.sectionId))) {
      const existingOrigin = existing.origin || 'local'
      setOrigin(existingOrigin); setConfig(editablePlanning(existing.planning) || initialPlanning(sources, scope, entries)); setActiveSection(existing.sectionId)
      setStep(existing.publicationStatus === 'draft' ? 2 : 4)
      return
    }
    setConfig(initialPlanning(sources, scope, entries))
    setStep(2)
  }
  const errors = config ? [...planningErrors(config, sources, { ...scope, sectionId: selected[0] }, entries), ...(config.automaticErrors || [])] : []
  const runGeneration = async replace => { const result = await generate({ scope: Object.fromEntries(hierarchy.map(field => [field, scope[field]])), selected, config, expected: currentTables, replace }); if (result) { if (Array.isArray(result)) setBatchIds(result.filter(row => matchesScope(row, scope) && selected.some(id => same(id, row.sectionId)) && row.planning?.calendar?.startDate === config.calendar.startDate && row.planning?.calendar?.endDate === config.calendar.endDate).map(row => String(row.id))); setActiveSection(activeSection || selected[0]); setStep(4) }; return result }
  const applySetup = async () => { const result = await saveSetup(currentTables, config); if (result) { setImpactOpen(false); setStep(4) } }
  const setupChanged = currentTables.some(row => JSON.stringify(row.planning) !== JSON.stringify(config))
  const savedEntries = currentTables.flatMap(row => row.entries)
  return <section className="tt-clean-builder" aria-label="Timetable Builder">
    <nav className="tt-stepper" aria-label="Builder steps">{['Academic Setup', 'Daily Schedule', 'Subjects & Faculty', 'Review & Publish'].map((label, index) => <button key={label} aria-current={step === index + 1 ? 'step' : undefined} className={step === index + 1 ? 'active' : ''} disabled={busy || (index > 0 && !config) || (index === 3 && !currentTables.length) || (currentTables.some(row => row.publicationStatus === 'published') && [1, 2].includes(index))} onClick={() => setStep(index + 1)}><span>{index + 1}</span>{label}</button>)}</nav>
    {step === 1 && <section className="tt-card tt-clean-step"><h2>Academic setup</h2><div className="tt-form-grid">{hierarchy.map((field, index) => <TimetableSelect key={field} label={labels[index]} value={scope[field]} options={options[field]} disabled={busy || Boolean(index && !scope[hierarchy[index - 1]])} onChange={value => change(field, value)} />)}</div>
      {scope.semesterId && <><h3>Sections ({sections.length})</h3><div className="tt-checks">{sections.map(section => <label key={section.id}><input type="checkbox" checked={selected.some(id => same(id, section.id))} onChange={event => setSelected(old => event.target.checked ? [...old, String(section.id)] : old.filter(id => !same(id, section.id)))} />{section.name}</label>)}</div>{!sections.length && <p>No active sections match this academic context.</p>}</>}
      <button className="tt-button tt-primary" disabled={!selected.length || busy} onClick={setup}>Continue</button></section>}
    {step === 2 && config && <PeriodSetupStep config={config} setConfig={setConfig} sources={sources} scope={scope} entries={entries} busy={busy} errors={errors} back={() => setStep(1)} continueSetup={() => setStep(3)} />}
    {step === 3 && config && <><SubjectCoverage sources={sources} scope={scope} selected={selected} config={config} setConfig={setConfig} refresh={refresh} faculty={faculty} disabled={busy} /><div className="tt-actions"><button className="tt-button" onClick={() => setStep(2)}>Back</button><button className="tt-button tt-primary" disabled={busy || !enabled || errors.length > 0} onClick={async () => { if (currentTables.length) { if (setupChanged && savedEntries.length) setImpactOpen(true); else await applySetup() } else await runGeneration(false) }}>{currentTables.length ? 'Save Settings' : busy ? 'Generating Timetables…' : 'GENERATE ALL SELECTED SECTIONS'}</button></div>{busy && !currentTables.length && <p role="status">Generating coordinated section drafts and checking campus-wide conflicts…</p>}</>}
    {step === 4 && table && <TimetableWorkspace mockMode={mockMode} table={table} tables={currentTables} sources={sources} entries={entries} busy={busy} section={setActiveSection} faculty={faculty} generate={() => runGeneration(false)} regenerate={() => runGeneration(true)} save={save} remove={remove} validate={validate} publish={publish} reopen={reopen} />}
    {impactOpen && <WorkspaceDrawer modal title="Configuration change impact" busy={busy} close={() => setImpactOpen(false)}><div className="tt-clean-step"><p>Review the existing draft data before applying shared timing changes.</p><div className="tt-live-summary"><article><strong>{currentTables.length}</strong><span>affected sections</span></article><article><strong>{savedEntries.length}</strong><span>existing classes</span></article><article><strong>{new Set(savedEntries.map(row => String(row.facultyId)).filter(Boolean)).size}</strong><span>assigned faculty</span></article><article><strong>{new Set(savedEntries.map(row => row.roomId || row.classroom).filter(Boolean)).size}</strong><span>used rooms</span></article></div><p>Settings will be saved only if every existing class remains valid. No class will be regenerated or removed.</p><div className="tt-actions"><button className="tt-button" disabled={busy} onClick={() => setImpactOpen(false)}>Cancel</button><button className="tt-button tt-primary" disabled={busy} onClick={applySetup}>Review and Apply</button></div></div></WorkspaceDrawer>}
  </section>
}
