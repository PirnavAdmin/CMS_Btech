import { FiBookOpen, FiCalendar, FiCheckCircle, FiClock, FiFileText, FiSearch } from 'react-icons/fi'
import './student-assignments.css'

const summary = [
  { label: 'Total Assignments', value: '—', icon: FiFileText, tone: 'blue' },
  { label: 'Pending', value: '—', icon: FiClock, tone: 'purple' },
  { label: 'Submitted', value: '—', icon: FiCheckCircle, tone: 'green' },
  { label: 'Due This Week', value: '—', icon: FiCalendar, tone: 'orange' },
]

const columns = ['#', 'Subject', 'Assignment Title', 'Description', 'Assigned Date', 'Due Date', 'Max Marks', 'Status', 'Action']

export default function StudentAssignments() {
  return <main className="portal-page student-dashboard student-assignments">
    <header className="sa-heading">
      <span className="sa-heading-icon"><FiFileText aria-hidden="true" /></span>
      <div><h1>Assignments</h1><p>View and manage your subject-wise assignments</p></div>
    </header>

    <div className="sa-filters">
      <label className="sa-search"><FiSearch aria-hidden="true" /><span className="sr-only">Search assignments</span><input type="search" placeholder="Search by Subject or Assignment Title..." disabled /></label>
      <label className="sa-subject"><span className="sr-only">Filter by subject</span><FiBookOpen aria-hidden="true" /><select defaultValue="" disabled><option value="">All Subjects</option></select></label>
      <button type="button" className="sa-primary" disabled><FiSearch aria-hidden="true" /> Search</button>
      <button type="button" className="sa-clear" disabled>Clear</button>
    </div>

    <section className="sa-summary" aria-label="Assignment summary">
      {summary.map(({ label, value, icon: Icon, tone }) => <article className={`sa-summary-card sa-${tone}`} key={label}>
        <span className="sa-summary-icon"><Icon aria-hidden="true" /></span><span><small>{label}</small><strong>{value}</strong></span>
      </article>)}
    </section>

    <div className="sa-tabs" role="tablist" aria-label="Assignment views">
      <button type="button" role="tab" aria-selected="true"><FiFileText aria-hidden="true" /> My Assignments</button>
      <button type="button" role="tab" aria-selected="false" disabled><FiCheckCircle aria-hidden="true" /> Submitted Assignments</button>
    </div>

    <section className="sa-table-card" aria-label="My assignments">
      <div className="sa-table-scroll"><table>
        <thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead>
        <tbody><tr><td colSpan={columns.length}>
          <div className="sa-empty" role="status">
            <span className="sa-empty-icon"><FiFileText aria-hidden="true" /></span>
            <strong>Assignment data is not connected yet</strong>
            <p>Your assignments will appear here when the college assignment service is available.</p>
          </div>
        </td></tr></tbody>
      </table></div>
      <footer className="sa-pagination"><span>Assignment records are unavailable</span><nav aria-label="Assignment pages"><button type="button" disabled>Previous</button><button type="button" disabled>Next</button></nav></footer>
    </section>

    <aside className="sa-notes"><FiCheckCircle aria-hidden="true" /><div><strong>Important Notes</strong><ul><li>Assignment details and submission status are provided by your college.</li><li>Submission and download actions will be available when the assignment service is connected.</li></ul></div></aside>
  </main>
}
