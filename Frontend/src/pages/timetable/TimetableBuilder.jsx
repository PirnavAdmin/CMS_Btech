import { useState } from 'react'
import { TimetableSelect } from './TimetableComponents'
import PeriodSetupStep from './PeriodSetupStep'
import SubjectCoverage from './SubjectCoverage'
import TimetableWorkspace from './TimetableWorkspace'
import { dailyPeriods, DAILY_PERIOD_SETUP } from '../../utils/timetablePeriods'
import { calendarBounds, roomOptions, planningErrors } from '../../utils/timetablePlanner'
import { same, matchesScope } from '../../utils/timetableUtils'
import { contextOptions, changeContext, hierarchy, scopeSections } from '../../services/timetable/timetableDomain'

const labels = ['Academic Year', 'Department', 'Course', 'Branch', 'Academic Level', 'Semester']
const initialPlanning = (sources, scope, entries) => ({
  automatic: { ...DAILY_PERIOD_SETUP },
  periods: dailyPeriods(DAILY_PERIOD_SETUP).periods,
  calendar: { ...calendarBounds(sources, scope), startDate: '', endDate: '', workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'], reviewed: true, holidays: [] },
  rooms: roomOptions(sources, entries).map(row => row.value),
  requirements: {},
})
const editablePlanning = planning => {
  if (!planning?.calendar) return planning
  const startDate = String(planning.calendar.startDate || '').slice(0, 10)
  const endDate = String(planning.calendar.endDate || '').slice(0, 10)
  return startDate && endDate && startDate >= endDate
    ? { ...planning, calendar: { ...planning.calendar, startDate, endDate: '' } }
    : planning
}
export default function TimetableBuilder({ sources, entries, tables, initial, busy, enabled, refresh, faculty, generate, saveSetup, save, remove, validate, publish, reopen }) {
  const [scope, setScope] = useState(initial || Object.fromEntries(hierarchy.map(field => [field, ''])))
  const [origin, setOrigin] = useState(initial?.origin || 'local')
  const [step, setStep] = useState(initial ? 4 : 1)
  const [selected, setSelected] = useState(initial ? [String(initial.sectionId)] : [])
  const [activeSection, setActiveSection] = useState(initial?.sectionId || '')
  const [config, setConfig] = useState(editablePlanning(initial?.planning) || null)
  const options = contextOptions(sources, scope), sections = scopeSections(sources, scope)
  const currentTables = tables.filter(table => (table.origin || 'local') === origin && matchesScope(table, scope) && selected.some(id => same(id, table.sectionId)))
  const table = currentTables.find(row => same(row.sectionId, activeSection)) || currentTables[0]
  const change = (field, value) => {
    const next = changeContext(scope, field, value)
    setScope(next); setConfig(null); setOrigin('local')
    const all = scopeSections(sources, next).map(row => String(row.id))
    setSelected(all); setActiveSection(all[0] || '')
  }
  const setup = () => {
    const existing = tables.find(table => matchesScope(table, scope) && selected.some(id => same(id, table.sectionId)))
    if (existing) {
      const existingOrigin = existing.origin || 'local'
      setOrigin(existingOrigin); setConfig(editablePlanning(existing.planning) || initialPlanning(sources, scope, entries)); setActiveSection(existing.sectionId)
      setStep(existingOrigin === 'local' && existing.publicationStatus === 'draft' ? 2 : 4)
      return
    }
    setConfig(initialPlanning(sources, scope, entries))
    setStep(2)
  }
  const errors = config ? [...planningErrors(config, sources, { ...scope, sectionId: selected[0] }, entries), ...(config.automaticErrors || [])] : []
  const runGeneration = async replace => { const result = await generate({ scope: Object.fromEntries(hierarchy.map(field => [field, scope[field]])), selected, config, expected: currentTables, replace }); if (result) { setActiveSection(activeSection || selected[0]); setStep(4) }; return result }
  return <section className="tt-clean-builder" aria-label="Timetable Builder">
    <nav className="tt-stepper" aria-label="Builder steps">{['Academic Setup', 'Daily Schedule', 'Subjects & Faculty', 'Review & Publish'].map((label, index) => <button key={label} aria-current={step === index + 1 ? 'step' : undefined} className={step === index + 1 ? 'active' : ''} disabled={busy || (index > 0 && !config) || (index === 3 && !currentTables.length) || (currentTables.some(row => row.origin === 'backend' || row.publicationStatus === 'published') && [1, 2].includes(index))} onClick={() => setStep(index + 1)}><span>{index + 1}</span>{label}</button>)}</nav>
    {step === 1 && <section className="tt-card tt-clean-step"><h2>Academic setup</h2><div className="tt-form-grid">{hierarchy.map((field, index) => <TimetableSelect key={field} label={labels[index]} value={scope[field]} options={options[field]} disabled={busy || Boolean(index && !scope[hierarchy[index - 1]])} onChange={value => change(field, value)} />)}</div>
      {scope.semesterId && <><h3>Sections ({sections.length})</h3><div className="tt-checks">{sections.map(section => <label key={section.id}><input type="checkbox" checked={selected.some(id => same(id, section.id))} onChange={event => setSelected(old => event.target.checked ? [...old, String(section.id)] : old.filter(id => !same(id, section.id)))} />{section.name}</label>)}</div>{!sections.length && <p>No active sections match this academic context.</p>}</>}
      <button className="tt-button tt-primary" disabled={!selected.length || busy} onClick={setup}>Continue</button></section>}
    {step === 2 && config && <PeriodSetupStep config={config} setConfig={setConfig} sources={sources} scope={scope} entries={entries} busy={busy} errors={errors} back={() => setStep(1)} continueSetup={() => setStep(3)} />}
    {step === 3 && config && <><SubjectCoverage sources={sources} scope={scope} selected={selected} config={config} setConfig={setConfig} refresh={refresh} faculty={faculty} disabled={busy} /><div className="tt-actions"><button className="tt-button" onClick={() => setStep(2)}>Back</button><button className="tt-button tt-primary" disabled={busy || !enabled || errors.length > 0} onClick={async () => { if (currentTables.length) { const result = await saveSetup(currentTables, config); if (result) setStep(4) } else await runGeneration(false) }}>{currentTables.length ? 'Save Settings' : 'GENERATE ALL SELECTED SECTIONS'}</button></div></>}
    {step === 4 && table && <TimetableWorkspace table={table} tables={currentTables} sources={sources} entries={entries} busy={busy} section={setActiveSection} faculty={faculty} generate={() => runGeneration(false)} regenerate={() => runGeneration(true)} save={save} remove={remove} validate={validate} publish={publish} reopen={reopen} />}
  </section>
}
