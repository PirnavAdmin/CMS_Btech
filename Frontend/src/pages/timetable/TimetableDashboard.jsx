import { FiClock, FiUsers, FiCheckCircle, FiAlertTriangle, FiLayers, FiBookOpen, FiClipboard, FiUserCheck, FiHome, FiGrid } from 'react-icons/fi'
import { useMemo, useState } from 'react'
import { schedulingIssues, subjectRequirements, roomOptions, planningErrors, suitableRoom } from '../../utils/timetablePlanner'
import { active, conflictsFor, conflictPairs, same } from '../../utils/timetableUtils'
import { academicLevel, scopeSections } from '../../services/timetable/timetableDomain'
import ExportMenu from '../../components/ExportMenu'

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

export default function TimetableDashboard({ tables, sources, entries, today, open }) {
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
    { key: 'timetableName', label: 'Timetable' }, { key: 'academicYear', label: 'Academic Year' }, { key: 'course', label: 'Course' },
    { key: 'branch', label: 'Branch' }, { key: 'semester', label: 'Semester' }, { key: 'sectionName', label: 'Section' },
    { key: 'dayOfWeek', label: 'Day' }, { key: 'startTime', label: 'Start Time' }, { key: 'endTime', label: 'End Time' },
    { key: 'subjectCode', label: 'Subject Code' }, { key: 'subjectName', label: 'Subject' }, { key: 'facultyName', label: 'Faculty' }, { key: 'classroom', label: 'Room' }, { key: 'status', label: 'Status' },
  ]

  const sectionButton = section => {
    const row = readinessRows.find(item => same(item.section.id, section.id))
    const table = row?.table
    const scope = contextFor(section, sources)
    const state = row.result
    return <button className="tt-recent-table" key={section.id} onClick={() => open(table || scope)}>
      <strong>{section.name || `Section ${section.id}`}</strong>
      <span>{table ? `${table.entries.length} classes Ã‚Â· ${table.publicationStatus === 'unavailable' ? 'Lifecycle status unavailable' : table.publicationStatus}` : `${state.ready ? 'Ready to configure' : 'Needs attention'} Ã‚Â· No timetable yet`}</span>
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
              return <details key={semesterId} open><summary>{semester?.name || `Semester ${semesterId}`}</summary><div className="tt-recent-tables">{sections.filter(section => same(section.semesterId, semesterId)).map(sectionButton)}</div></details>
            }) : <p>No active sections.</p>}</div>
          })}
          {!branches.length && <p>No active branches.</p>}
        </details>
      })}</div>}
    </section>
    <section className="tt-card tt-clean-step">
      <header className="tt-card-heading"><h2><FiClock aria-hidden="true" />Recent timetables</h2><span>{today.length} published classes today</span></header>
      {!tables.length ? <p>No timetable records yet. Select a section above to configure one.</p> : <div className="tt-recent-tables">{[...tables].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).map(table => <button className="tt-recent-table" key={`${table.origin}-${table.id}`} onClick={() => open(table)}><strong>{table.name}</strong><span>{name(sources.years, table.academicYearId)} Ã‚Â· {name(sources.departments, table.departmentId)} Ã‚Â· {name(sources.courses, table.courseId)}</span><small>{table.publicationStatus === 'unavailable' ? 'STATUS UNAVAILABLE' : table.publicationStatus.toUpperCase()} Ã‚Â· {table.entries.length} classes{attention && ' Ã‚Â· Review attention items'}</small></button>)}</div>}
    </section>

  </div>
}
