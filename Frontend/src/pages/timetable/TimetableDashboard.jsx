import { schedulingIssues } from '../../utils/timetablePlanner'
import { conflictsFor, same } from '../../utils/timetableUtils'
import ExportMenu from '../../components/ExportMenu'

export default function TimetableDashboard({ tables, sources, entries, today, open }) {
  const attention = tables.filter(table => schedulingIssues(sources, table, table.planning, table.entries).length || entries.some(row => same(row.timetableId, table.id) && conflictsFor(row, entries).length)).length
  const exportRows = entries.map(row => {
    const table = tables.find(item => same(item.id, row.timetableId))
    return {
      ...row,
      timetableName: table?.name || row.timetableName || 'Backend timetable',
      academicYear: sources.years.find(item => same(item.id, table?.academicYearId || row.academicYearId))?.name || '',
      course: sources.courses.find(item => same(item.id, table?.courseId || row.courseId))?.name || '',
      branch: sources.branches.find(item => same(item.id, table?.branchId || row.branchId))?.name || '',
      semester: sources.semesters.find(item => same(item.id, table?.semesterId || row.semesterId))?.name || '',
      status: table?.publicationStatus || row.publicationStatus || 'unknown',
    }
  })
  const exportColumns = [
    { key: 'timetableName', label: 'Timetable' }, { key: 'academicYear', label: 'Academic Year' },
    { key: 'course', label: 'Course' }, { key: 'branch', label: 'Branch' }, { key: 'semester', label: 'Semester' },
    { key: 'sectionName', label: 'Section' }, { key: 'dayOfWeek', label: 'Day' },
    { key: 'startTime', label: 'Start Time' }, { key: 'endTime', label: 'End Time' },
    { key: 'subjectCode', label: 'Subject Code' }, { key: 'subjectName', label: 'Subject' },
    { key: 'facultyName', label: 'Faculty' }, { key: 'classroom', label: 'Room' }, { key: 'status', label: 'Status' },
  ]
  return <>
    <div className="tt-dashboard-stats">{[['Draft', tables.filter(row => row.publicationStatus === 'draft').length], ['Published', tables.filter(row => row.publicationStatus === 'published').length], ['Today classes', today], ['Needs Attention', attention]].map(([label, count]) => <div className="tt-card" key={label}><strong>{count}</strong><span>{label}</span></div>)}</div>
    <section className="tt-card tt-clean-step">
      <header className="tt-card-heading">
        <h2>Recent timetables</h2>
        <div className="tt-actions">
          <ExportMenu rows={exportRows} columns={exportColumns} title="Timetable Schedule" filename="timetable-schedule" scope="All timetable classes" />
          <button className="tt-button tt-primary" onClick={() => open(null)}>Open Builder</button>
        </div>
      </header>
      {!tables.length ? <p>No timetables yet. Select academic context in the Builder to begin.</p> : <div className="tt-recent-tables">{[...tables].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).map(table => <button className="tt-recent-table" key={`${table.origin}-${table.id}`} onClick={() => open(table)}><strong>{table.name}</strong><span>{sources.years.find(row => same(row.id, table.academicYearId))?.name} · {sources.departments.find(row => same(row.id, table.departmentId))?.name} · {sources.courses.find(row => same(row.id, table.courseId))?.name}</span><small>{table.publicationStatus.toUpperCase()} · {table.entries.length} classes</small></button>)}</div>}
    </section>
  </>
}
