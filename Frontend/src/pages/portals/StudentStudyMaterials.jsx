import { useState } from 'react'
import { FiBookOpen, FiCalendar, FiFileText, FiPlayCircle, FiSearch, FiVideo } from 'react-icons/fi'
import './student-study-materials.css'

const tabs = [
  { id: 'resources', label: 'Study Resources', icon: FiBookOpen, empty: 'Subject notes, PDFs and faculty learning resources will appear here.' },
  { id: 'ebooks', label: 'E-Books', icon: FiFileText, empty: 'Subject e-books and digital textbooks will appear here.' },
  { id: 'reference', label: 'Reference Materials', icon: FiCalendar, empty: 'Question banks, practice papers and reference documents will appear here.' },
]

const columns = ['#', 'Subject', 'Subject Code', 'Material Title', 'Material Type', 'Description', 'Uploaded By', 'Upload Date', 'File Format', 'Action']

function Metric({ icon: Icon, title, tone }) {
  return <article className={`ssm-metric ssm-metric--${tone}`}><span className="ssm-metric-icon"><Icon aria-hidden="true" /></span><span><small>{title}</small><strong aria-label={`${title} unavailable`}>—</strong><em>Data unavailable</em></span></article>
}

export default function StudentStudyMaterials() {
  const [tab, setTab] = useState('resources')
  const activeTab = tabs.find(item => item.id === tab) || tabs[0]
  return <main className="portal-page student-dashboard student-study-materials">
    <header className="ssm-heading"><span className="ssm-heading-icon"><FiBookOpen aria-hidden="true" /></span><div><h1>Study Materials</h1><p>Access your subject-wise notes, textbooks, video lectures and learning resources.</p></div></header>

    <div className="ssm-toolbar">
      <label className="ssm-search"><FiSearch aria-hidden="true" /><span className="ssm-sr-only">Search study materials</span><input type="search" placeholder="Search by Subject, Material Title or Subject Code" disabled /></label>
      <label><span className="ssm-sr-only">Academic year</span><select disabled defaultValue=""><option value="">Academic Year</option></select></label>
      <label><span className="ssm-sr-only">Semester</span><select disabled defaultValue=""><option value="">Semester</option></select></label>
      <label><span className="ssm-sr-only">Subject</span><select disabled defaultValue=""><option value="">All Subjects</option></select></label>
      <label><span className="ssm-sr-only">Material type</span><select disabled defaultValue=""><option value="">All Types</option></select></label>
      <button className="ssm-search-button" type="button" disabled><FiSearch aria-hidden="true" /> Search</button>
      <button className="ssm-clear-button" type="button" disabled>Clear</button>
    </div>

    <section className="ssm-metrics" aria-label="Study material summary">
      <Metric icon={FiFileText} title="Total Resources" tone="blue" />
      <Metric icon={FiPlayCircle} title="Video Lectures" tone="purple" />
      <Metric icon={FiBookOpen} title="Notes & PDFs" tone="green" />
      <Metric icon={FiCalendar} title="Reference Materials" tone="orange" />
    </section>

    <nav className="ssm-tabs" role="tablist" aria-label="Study material categories">
      {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}><Icon aria-hidden="true" />{label}</button>)}
    </nav>

    <section className="ssm-panel" role="tabpanel" aria-label={activeTab.label}>
      <div className="ssm-table-scroll"><table><thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody><tr><td colSpan={columns.length}>
        <div className="ssm-empty" role="status"><span className="ssm-empty-icon"><FiVideo aria-hidden="true" /></span><strong>Study materials are not connected yet</strong><p>{activeTab.empty}</p><small>The student portal has no student-scoped study-materials API configured. Files and counts will load here when the college service is available.</small></div>
      </td></tr></tbody></table></div>
      <footer className="ssm-table-footer"><span>Material records unavailable</span><div><button type="button" disabled>Previous</button><button type="button" disabled>Next</button></div></footer>
    </section>

    <aside className="ssm-information"><span className="ssm-info-icon" aria-hidden="true">i</span><div><strong>Important Information</strong><ul><li>Study materials are provided by authorized faculty.</li><li>Materials are organized subject-wise and semester-wise.</li><li>Use downloaded materials for academic purposes.</li><li>Contact the respective faculty if any material is missing.</li></ul></div></aside>
  </main>
}
