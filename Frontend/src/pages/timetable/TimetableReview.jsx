import { subjectRequirements } from '../../utils/timetablePlanner'
import { same } from '../../utils/timetableUtils'
import { validationCategory, decorateEntries } from '../../services/timetable/timetableDomain'
import TimetableGrid from './TimetableGrid'

export default function TimetableReview({ preview = false, tables, sources, issues, ready }) {
  const name = (kind, id) => sources[kind].find(row => same(row.id, id))?.name || 'Missing required data'
  return <div className="tt-clean-step">
    <h3>{ready ? 'Publication ready' : 'Publication requires validation and complete data'}</h3>
    <p>{preview ? 'Demo Mode: review this browser-only preview. It never publishes backend records.' : 'Review the saved weekly grid. Draft entries remain private until backend publication succeeds.'}</p>
    {tables.map(table => <section key={table.id} className="tt-review-section">
      <h3>{table.name}</h3>
      <dl className="tt-readiness-details">{[['Academic year', name('years', table.academicYearId)], ['Branch', name('branches', table.branchId)], ['Semester', name('semesters', table.semesterId)], ['Section', name('sections', table.sectionId)], ['Total scheduled periods', table.entries.reduce((sum, row) => sum + table.planning.periods.filter(period => !['break', 'lunch'].includes(period.type) && period.startTime >= row.startTime.slice(0, 5) && period.endTime <= row.endTime.slice(0, 5)).length, 0)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <div className="tt-table-wrap"><table><thead><tr><th>Subject</th><th>Assigned faculty</th><th>Required / allocated periods</th></tr></thead><tbody>{subjectRequirements(sources, table, table.planning.requirements).map(item => {
        const rows = table.entries.filter(row => same(row.subjectId, item.subject.id))
        const allocated = rows.reduce((sum, row) => sum + table.planning.periods.filter(period => !['break', 'lunch'].includes(period.type) && period.startTime >= row.startTime.slice(0, 5) && period.endTime <= row.endTime.slice(0, 5)).length, 0)
        return <tr key={item.subject.id}><td>{item.subject.name}</td><td>{[...new Set(rows.map(row => name('faculty', row.facultyId)))].join(', ') || 'Missing faculty assignment'}</td><td>{item.periodsPerWeek > 0 ? item.periodsPerWeek : 'Missing requirement'} / {allocated}</td></tr>
      })}</tbody></table></div>
      <details><summary>Weekly timetable preview</summary><TimetableGrid rows={decorateEntries(table.entries, sources)} periods={table.planning.periods} workingDays={table.planning.calendar.workingDays} editable={false} /></details>
    </section>)}
    <h3>Conflict summary</h3>
    {['Blocking Conflicts', 'Warnings', 'Missing Required Data'].map(category => <p key={category}>{category}: {issues.filter(issue => validationCategory(issue) === category).length}</p>)}
  </div>
}
