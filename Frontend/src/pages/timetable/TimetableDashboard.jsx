import { useEffect, useMemo, useRef, useState } from 'react'
import { schedulingIssues, subjectRequirements, roomOptions } from '../../utils/timetablePlanner'
import { active, conflictsFor, conflictPairs, same, sameRoom, overlaps, DAYS } from '../../utils/timetableUtils'
import { academicLevel } from '../../services/timetable/timetableDomain'
import ExportMenu from '../../components/ExportMenu'
import WorkspaceDrawer from './WorkspaceDrawer'
import FacultyTimetable from './FacultyTimetable'

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
  const requirements = subjectRequirements(sources, scope, {})
  const missingAllocation = requirements.filter(item => !item.faculty.length)
  const missingWeekly = requirements.filter(item => !item.periodsPerWeek)
  const conflicts = entries.filter(row => same(row.sectionId, section.id)).some(row => conflictsFor(row, entries).length)
  const availableRooms = roomOptions(sources, entries).length
  const issues = []
  if (!requirements.length) issues.push('Subjects are not available for this semester.')
  if (missingAllocation.length) issues.push(`${missingAllocation.length} subject allocation${missingAllocation.length === 1 ? '' : 's'} missing.`)
  if (missingWeekly.length) issues.push(`${missingWeekly.length} weekly requirement${missingWeekly.length === 1 ? '' : 's'} not configured.`)
  if (!availableRooms) issues.push('Room configuration unavailable.')
  if (!table?.planning?.periods?.some(period => period.type !== 'break' && period.type !== 'lunch')) issues.push('Teaching periods are not configured.')
  if (conflicts) issues.push('Existing schedule conflicts need review.')
  return { ready: issues.length === 0, issues }
}

export default function TimetableDashboard({ tables, sources, entries, today, open }) {
  const [query, setQuery] = useState(''), [viewBy, setViewBy] = useState('department'), [viewId, setViewId] = useState(''), [projection, setProjection] = useState(null), [campusDay, setCampusDay] = useState(DAYS[0]), [campusPeriod, setCampusPeriod] = useState('')
  const searchRef = useRef(null)
  const activeSections = useMemo(() => sources.sections.filter(active), [sources.sections])
  const departments = useMemo(() => sources.departments.filter(active), [sources.departments])
  const rooms = useMemo(() => roomOptions(sources, entries), [sources, entries])
  const readinessRows = activeSections.map(section => ({ section, result: readiness(section, sources, entries, tables.find(table => same(table.sectionId, section.id))) }))
  const readyCount = readinessRows.filter(row => row.result.ready).length
  const scopedRequirements = activeSections.flatMap(section => subjectRequirements(sources, contextFor(section, sources), {}))
  const coveredRequirements = scopedRequirements.filter(item => item.faculty.length && item.periodsPerWeek > 0).length
  const configuredSections = new Set(tables.filter(table => table.planning?.periods?.some(period => !['break', 'lunch'].includes(String(period.type || '').toLowerCase()))).map(table => String(table.sectionId))).size
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

  const periods = useMemo(() => [...new Map(tables.flatMap(item => item.planning?.periods || []).filter(period => !['break', 'lunch'].includes(String(period.type || '').toLowerCase())).map(period => [`${String(period.startTime).slice(0, 5)}-${String(period.endTime).slice(0, 5)}`, period])).values()].sort((a, b) => String(a.startTime).localeCompare(String(b.startTime))), [tables])
  const activePeriod = periods.find(period => `${String(period.startTime).slice(0, 5)}-${String(period.endTime).slice(0, 5)}` === campusPeriod) || periods[0]
  const campusRows = activePeriod ? entries.filter(row => row.publicationStatus === 'published' && row.dayOfWeek === campusDay && overlaps(row, activePeriod)) : []
  const freeRooms = rooms.filter(room => !campusRows.some(row => sameRoom(row, room)))
  const scheduledFaculty = new Set(campusRows.map(row => String(row.facultyId)))
  const freeFaculty = sources.faculty.filter(row => active(row) && !scheduledFaculty.has(String(row.id)))
  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes()
  const currentClasses = today.filter(row => { const start = row.startTime.slice(0, 5).split(':').map(Number), end = row.endTime.slice(0, 5).split(':').map(Number); return start[0] * 60 + start[1] <= currentMinutes && end[0] * 60 + end[1] > currentMinutes })
  const nextClass = [...today].filter(row => row.startTime && row.startTime.slice(0, 5).split(':').map(Number).reduce((hours, minutes) => hours * 60 + minutes) > currentMinutes).sort((a, b) => a.startTime.localeCompare(b.startTime))[0]
  useEffect(() => {
    const onKeyDown = event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus() } }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  const optionsByView = { department: departments, branch: sources.branches.filter(active), semester: sources.semesters.filter(active), section: activeSections, faculty: sources.faculty.filter(active), subject: sources.subjects.filter(active), room: rooms.map(room => ({ id: room.value, name: room.name, ...room })) }
  const viewOptions = optionsByView[viewBy] || []
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const result = []
    for (const section of activeSections) {
      const branch = sources.branches.find(row => same(row.id, section.branchId))
      const semester = sources.semesters.find(row => same(row.id, section.semesterId))
      if ([section.name, branch?.name, semester?.name].some(value => String(value || '').toLowerCase().includes(q))) result.push({ kind: 'section', id: section.id, name: section.name, context: `${branch?.name || ''} · ${semester?.name || ''}` })
    }
    for (const row of sources.faculty.filter(active)) if ([row.name, row.employeeId].some(value => String(value || '').toLowerCase().includes(q))) result.push({ kind: 'faculty', id: row.id, name: row.name, context: row.employeeId || 'Faculty schedule' })
    for (const row of sources.subjects.filter(active)) if ([row.name, row.subjectCode].some(value => String(value || '').toLowerCase().includes(q))) result.push({ kind: 'subject', id: row.id, name: row.name, context: row.subjectCode || 'Subject schedule' })
    for (const room of rooms) if (room.name.toLowerCase().includes(q)) result.push({ kind: 'room', id: room.value, room, name: room.name, context: 'Room occupancy' })
    return result.slice(0, 12)
  }, [query, activeSections, sources, rooms])
  const filteredEntries = viewId ? entries.filter(row => {
    if (viewBy === 'department') { const branch = sources.branches.find(item => same(item.id, row.branchId)); return same(branch?.departmentId || sources.courses.find(item => same(item.id, row.courseId))?.departmentId, viewId) }
    if (viewBy === 'branch') return same(row.branchId, viewId)
    if (viewBy === 'semester') return same(row.semesterId, viewId)
    if (viewBy === 'section') return same(row.sectionId, viewId)
    if (viewBy === 'faculty') return same(row.facultyId, viewId)
    if (viewBy === 'subject') return same(row.subjectId, viewId)
    const room = rooms.find(item => item.value === viewId)
    return room && (room.roomId && row.roomId ? same(room.roomId, row.roomId) : room.classroom.toLowerCase() === String(row.classroom || '').toLowerCase())
  }) : []
  const chooseSearchResult = result => {
    setQuery('')
    if (result.kind === 'section') { const section = activeSections.find(row => same(row.id, result.id)); open(tables.find(table => same(table.sectionId, result.id)) || contextFor(section, sources)); return }
    setProjection(result)
  }
  const projectionRows = projection?.kind === 'subject' ? entries.filter(row => same(row.subjectId, projection.id)) : projection?.kind === 'room' ? entries.filter(row => projection.room.roomId && row.roomId ? same(row.roomId, projection.room.roomId) : String(row.classroom || '').toLowerCase() === projection.room.classroom.toLowerCase()) : []
  const sectionButton = section => {
    const table = tables.find(row => same(row.sectionId, section.id))
    const scope = contextFor(section, sources)
    const state = readiness(section, sources, entries, table)
    return <button className="tt-recent-table" key={section.id} onClick={() => open(table || scope)}>
      <strong>{section.name || `Section ${section.id}`}</strong>
      <span>{table ? `${table.entries.length} classes · ${table.publicationStatus === 'unavailable' ? 'Lifecycle status unavailable' : table.publicationStatus}` : `${state.ready ? 'Ready to configure' : 'Needs attention'} · No timetable yet`}</span>
      {!state.ready && <small>{state.issues.join(' ')}</small>}
    </button>
  }

  return <>
    <section className="tt-card tt-clean-step tt-command-center">
      <label className="tt-field tt-command-search"><span>Search section, faculty, subject or room <small>Ctrl/⌘ K</small></span><input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="e.g. Section A, Ravi Kumar, DBMS, Room 204" /></label>
      {query.trim() && <div className="tt-command-results" role="listbox" aria-label="Timetable search results">{searchResults.length ? searchResults.map((item, index) => <button key={`${item.kind}-${item.id}-${index}`} onClick={() => chooseSearchResult(item)}><strong>{item.name}</strong><span>{item.context}</span><small>{item.kind}</small></button>) : <p>No matching sections, faculty, subjects or rooms.</p>}</div>}
      <div className="tt-form-grid tt-view-by"><label className="tt-field"><span>View By</span><select value={viewBy} onChange={event => { setViewBy(event.target.value); setViewId('') }}>{Object.entries({ department: 'Department', branch: 'Branch', semester: 'Semester', section: 'Section', faculty: 'Faculty', subject: 'Subject', room: 'Room' }).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className="tt-field"><span>{viewBy[0].toUpperCase() + viewBy.slice(1)}</span><select value={viewId} onChange={event => setViewId(event.target.value)}><option value="">Select {viewBy}</option>{viewOptions.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label></div>
      {viewId && <div className="tt-projection-results"><strong>{filteredEntries.length} loaded timetable classes</strong>{['faculty'].includes(viewBy) && <button className="tt-button" onClick={() => setProjection({ kind: 'faculty', id: viewId })}>Open Faculty Schedule</button>}{['subject', 'room'].includes(viewBy) && <button className="tt-button" onClick={() => setProjection({ kind: viewBy, id: viewId, room: rooms.find(row => row.value === viewId) })}>Open {viewBy === 'subject' ? 'Subject Schedule' : 'Room Occupancy'}</button>}{viewBy === 'section' && <button className="tt-button" onClick={() => { const section = activeSections.find(row => same(row.id, viewId)); open(tables.find(table => same(table.sectionId, viewId)) || contextFor(section, sources)) }}>Open Section Timetable</button>}{filteredEntries.slice(0, 8).map(row => <span key={`${row.origin}-${row.id}`}>{row.dayOfWeek} · {row.startTime?.slice(0, 5)} · {row.subjectName} · {row.sectionName} · {row.classroom || 'Room unavailable'}</span>)}{filteredEntries.length > 8 && <small>Showing first 8 of {filteredEntries.length} loaded classes.</small>}{!filteredEntries.length && <small>No classes in the latest loaded timetable data.</small>}</div>}
    </section>
    <section className="tt-card tt-clean-step"><header className="tt-card-heading"><div><h2>Live campus · latest loaded schedules</h2><p>Availability is derived from published entries and configured periods.</p></div><div className="tt-actions"><label className="tt-field"><span>Day</span><select value={campusDay} onChange={event => setCampusDay(event.target.value)}>{DAYS.map(day => <option key={day} value={day}>{day}</option>)}</select></label><label className="tt-field"><span>Period</span><select value={activePeriod ? `${String(activePeriod.startTime).slice(0, 5)}-${String(activePeriod.endTime).slice(0, 5)}` : ''} onChange={event => setCampusPeriod(event.target.value)}>{periods.map(period => { const value = `${String(period.startTime).slice(0, 5)}-${String(period.endTime).slice(0, 5)}`; return <option key={value} value={value}>{period.name || 'Period'} · {value}</option> })}</select></label></div></header><div className="tt-live-summary"><article><strong>Today · {today.length}</strong><span>published classes</span></article><article><strong>{currentClasses.length ? currentClasses.map(row => row.subjectName).join(', ') : 'No current class'}</strong><span>current period</span></article><article><strong>{nextClass ? `${nextClass.subjectName} · ${nextClass.startTime.slice(0, 5)}` : 'No next class'}</strong><span>next scheduled today</span></article></div>{activePeriod ? <><p>{campusDay} · {String(activePeriod.startTime).slice(0, 5)}–{String(activePeriod.endTime).slice(0, 5)} · {campusRows.length} active classes · {freeRooms.length} unoccupied configured rooms · {freeFaculty.length} faculty not scheduled</p>{campusRows.slice(0, 10).map(row => <div className="tt-live-row" key={`${row.origin}-${row.id}`}><strong>{row.sectionName} · {row.subjectName}</strong><span>{row.facultyName || 'Faculty unavailable'} · {row.classroom || 'Room unavailable'}</span></div>)}{campusRows.length > 10 && <small>Showing first 10 of {campusRows.length} classes.</small>}{!campusRows.length && <p>No published classes in this period in the latest loaded data.</p>}</> : <p>Period availability is not available from the loaded timetable records.</p>}</section>
    <div className="tt-dashboard-stats">
      {[
        ['Sections', activeSections.length], ['Ready for generation', readyCount], ['Needs attention', activeSections.length - readyCount],
        ['Draft / Published', lifecycleAvailable ? `${tables.filter(row => row.publicationStatus === 'draft').length} / ${tables.filter(row => row.publicationStatus === 'published').length}` : 'Not Available'],
      ].map(([label, value]) => <div className="tt-card" key={label}><strong>{value}</strong><span>{label}</span></div>)}
    </div>
    <section className="tt-readiness-details" aria-label="Timetable readiness details"><article><strong>{sources.subjects.filter(active).length}</strong><span>Active subjects loaded</span></article><article><strong>{scopedRequirements.filter(item => !item.periodsPerWeek).length}</strong><span>Subject requirements missing</span></article><article><strong>{scopedRequirements.length ? `${coveredRequirements}/${scopedRequirements.length}` : 'Not Available'}</strong><span>Requirement and faculty coverage</span></article><article><strong>{rooms.length || 'Not Available'}</strong><span>Room references loaded</span></article><article><strong>{activeSections.length ? `${configuredSections}/${activeSections.length}` : 'Not Available'}</strong><span>Sections with period setup</span></article><article><strong>{detectedConflicts}</strong><span>Conflicting pairs in loaded entries</span></article></section>
    <section className="tt-card tt-clean-step">
      <header className="tt-card-heading"><div><h2>Academic structure</h2><p>Choose a section to open its schedule or start configuration.</p></div><div className="tt-actions"><ExportMenu rows={exportRows} columns={exportColumns} title="Timetable Schedule" filename="timetable-schedule" scope="All timetable classes" /><button className="tt-button tt-primary" onClick={() => open(null)}>Open Builder</button></div></header>
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
      <header className="tt-card-heading"><h2>Recent timetables</h2><span>{today.length} published classes today</span></header>
      {!tables.length ? <p>No timetable records yet. Select a section above to configure one.</p> : <div className="tt-recent-tables">{[...tables].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).map(table => <button className="tt-recent-table" key={`${table.origin}-${table.id}`} onClick={() => open(table)}><strong>{table.name}</strong><span>{name(sources.years, table.academicYearId)} · {name(sources.departments, table.departmentId)} · {name(sources.courses, table.courseId)}</span><small>{table.publicationStatus === 'unavailable' ? 'STATUS UNAVAILABLE' : table.publicationStatus.toUpperCase()} · {table.entries.length} classes{attention && ' · Review attention items'}</small></button>)}</div>}
    </section>
    {projection && <WorkspaceDrawer title={projection.kind === 'faculty' ? 'Faculty schedule' : projection.kind === 'subject' ? 'Subject schedule' : 'Room occupancy'} close={() => setProjection(null)}>{projection.kind === 'faculty' ? <FacultyTimetable facultyId={projection.id} sources={sources} entries={entries} tables={tables} /> : <div className="tt-clean-step"><h3>{projection.name}</h3><p>{projectionRows.length} loaded classes · latest loaded timetable data</p>{projectionRows.length ? <div className="tt-projection-results">{projectionRows.sort((a, b) => a.dayOfWeek.localeCompare(b.dayOfWeek) || a.startTime.localeCompare(b.startTime)).map(row => <article key={`${row.origin}-${row.id}`}><strong>{row.dayOfWeek} · {row.startTime?.slice(0, 5)}–{row.endTime?.slice(0, 5)}</strong><span>{row.subjectName} · {row.sectionName}</span><small>{row.facultyName || 'Faculty unavailable'} · {row.classroom || 'Room unavailable'}</small></article>)}</div> : <p>No matching timetable classes in the loaded data.</p>}</div>}</WorkspaceDrawer>}
  </>
}
