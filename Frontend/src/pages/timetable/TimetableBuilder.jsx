import { useLayoutEffect, useRef, useState } from 'react'
import { automaticPeriods, DEFAULT_PERIOD_SETUP } from '../../utils/timetablePeriods'
import { calendarBounds, roomOptions, planningErrors } from '../../utils/timetablePlanner'
import AcademicSetupStep from './AcademicSetupStep'
import PeriodSetupStep from './PeriodSetupStep'
import TimetableWorkspace from './TimetableWorkspace'

export default function TimetableBuilder({ step, setStep, contextFields, summary, scope, sources, entries, table, validScope, busy, setup, children, ...workspaceProps }) {
  const root = useRef(null)
  const [error, setError] = useState('')
  const [config, setConfig] = useState(() => table?.planning ? { ...table.planning, periodMode: table.planning.periodMode || 'manual' } : {
    calendar: { ...calendarBounds(sources, scope), workingDays: [], holidays: [], reviewed: false },
    periods: automaticPeriods(DEFAULT_PERIOD_SETUP).periods, automatic: { ...DEFAULT_PERIOD_SETUP }, periodMode: 'automatic', rooms: roomOptions(sources, entries).map(row => row.value), requirements: {},
  })
  const setupErrors = validScope ? [...planningErrors(config, sources, scope, entries), ...(config.periodMode === 'automatic' ? config.automaticErrors || [] : [])] : ['Complete Academic Setup first.']
  const setupDirty = Boolean(table?.planning && JSON.stringify(config) !== JSON.stringify({ ...table.planning, periodMode: table.planning.periodMode || 'manual' }))
  useLayoutEffect(() => {
    const fit = () => { if (root.current) root.current.style.height = `${Math.max(430, window.innerHeight - root.current.getBoundingClientRect().top - 16)}px` }
    fit(); window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  const continueSetup = async () => {
    setError('')
    try { await setup(table?.name || `${summary} Weekly`.slice(0, 150), config); setStep(3) }
    catch (reason) { setError(reason.message) }
  }
  return <section ref={root} className="tt-builder" aria-label="Timetable builder">
    <nav className="tt-stepper" aria-label="Timetable steps">{['Academic Setup', 'Period Setup', 'Generate & Manage'].map((title, index) => <button key={title} aria-current={step === index + 1 ? 'step' : undefined} className={step === index + 1 ? 'active' : ''} disabled={busy || (index === 1 && !validScope) || (index === 2 && (!table?.planning || setupDirty))} onClick={() => { setError(''); setStep(index + 1) }}><span>{index + 1}</span>{title}</button>)}</nav>
    {error && <p className="tt-error" role="alert">{error}</p>}
    {step === 1 && <AcademicSetupStep fields={contextFields} scope={scope} sources={sources} valid={validScope} busy={busy} existing={Boolean(table?.planning)} next={() => setStep(table?.planning ? 3 : 2)} />}
    {step === 2 && <PeriodSetupStep config={config} setConfig={setConfig} sources={sources} scope={scope} entries={entries} busy={busy} readOnly={table?.publicationStatus === 'published'} errors={setupErrors} back={() => setStep(1)} continueSetup={continueSetup} />}
    {step === 3 && table?.planning && <TimetableWorkspace {...workspaceProps} table={table} sources={sources} entries={entries} scope={scope} validScope={validScope} busy={busy} summary={summary} editSetup={() => setStep(2)}>{children}</TimetableWorkspace>}
  </section>
}
