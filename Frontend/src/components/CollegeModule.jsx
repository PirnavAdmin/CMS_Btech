import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { FiChevronLeft, FiChevronRight, FiFilter, FiPlus, FiSearch } from 'react-icons/fi'
import DashboardLayout from '../layouts/DashboardLayout'
import './CollegeModuleProject.css'

const sampleStudents = [
  { id: 'STU-1', roll: '26CS001', admission: 'PEC-26-001', name: 'Aarav Sharma' },
  { id: 'STU-2', roll: '26CS002', admission: 'PEC-26-002', name: 'Ananya Reddy' },
  { id: 'STU-3', roll: '26CS003', admission: 'PEC-26-003', name: 'Diya Patel' },
]

export default function CollegeModule({ config }) {
  const { pathname } = useLocation()
  const routePage = pathname.split('/').filter(Boolean)[1] || ''
  const defaultPages = { fees: 'students', attendance: 'register', marks: 'register', results: 'list', faculty: 'list' }
  const defaultPage = config.defaultPage || defaultPages[config.key]
  const page = routePage || defaultPage
  const visibleTabs = config.tabs.filter(([key]) => key)
  const [toast, setToast] = useState('')
  const [reference, setReference] = useState('')
  const active = config.tabs.find(([key]) => key === page)?.[1] || config.title
  const notify = message => { setToast(message); window.setTimeout(() => setToast(''), 2400) }
  const isForm = config.forms.includes(page)
  const primaryForm = config.forms[0]

  return <DashboardLayout><main className={`college-module ${config.key}-module`}>
    <div className="module-breadcrumb"><span>Digital Campus</span><i>/</i><strong>{config.title}</strong></div>
    <header className="module-heading"><div><span>Administration</span><h1>{config.title}</h1><p>{config.subtitle}</p></div>{!isForm && <NavLink className="module-primary-action" to={`/${config.key}/${primaryForm}`}><FiPlus /> {config.tabs.find(([key]) => key === primaryForm)?.[1]}</NavLink>}</header>
    <nav className="module-tabs">{visibleTabs.map(([key, label]) => <NavLink end key={key} to={key === defaultPage ? `/${config.key}` : `/${config.key}/${key}`}>{label}</NavLink>)}</nav>
    {toast && <div className="module-toast" role="status">{toast}</div>}
    {isForm && <section className="module-panel"><header><div><small>ADMIN WORKSPACE</small><h2>{active}</h2><p>Academic selections remain dependent and are validated before saving.</p></div></header><div className="module-form"><label>Academic Year<select><option>2026-27</option></select></label><label>Department<select><option>Computer Science & Engineering</option></select></label><label>Course<select><option>B.Tech</option></select></label><label>Branch<select><option>Computer Science & Engineering</option></select></label><label>Semester<select><option>Semester 3</option></select></label><label>Section<select><option>A</option></select></label><label className="wide">Reference / Name *<input value={reference} onChange={event => setReference(event.target.value)} placeholder={`Enter ${active.toLowerCase()} reference`} /></label><label className="wide">Remarks<textarea /></label></div><footer><button>Cancel</button><button className="primary" disabled={!reference} onClick={() => notify(`${active} saved successfully.`)}>Save</button></footer></section>}
    {!isForm && <section className="module-panel"><header className="module-directory-head"><div><h2>{active}</h2><p>Search, filter and manage {active.toLowerCase()} records.</p></div><strong>{sampleStudents.length} records</strong></header><div className="module-toolbar"><label className="module-search"><FiSearch/><input aria-label={`Search ${active}`} placeholder={`Search ${active.toLowerCase()}`} /></label><button><FiFilter/> Filters</button><button>Reset</button></div><div className="module-table"><table><thead><tr>{config.columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{sampleStudents.map((student, index) => <tr key={student.id}>{config.row(student, index)}</tr>)}</tbody></table></div><footer className="module-pagination"><span>Showing 1–{sampleStudents.length} of {sampleStudents.length}</span><div><button disabled aria-label="Previous page"><FiChevronLeft/></button><button className="active">1</button><button disabled aria-label="Next page"><FiChevronRight/></button></div></footer></section>}
  </main></DashboardLayout>
}
