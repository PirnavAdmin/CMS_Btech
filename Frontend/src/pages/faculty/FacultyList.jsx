import { useMemo, useState } from 'react'
import { FiBriefcase, FiEdit2, FiEye, FiPlus, FiSearch, FiToggleRight } from 'react-icons/fi'
import ExportMenu from '../../components/ExportMenu'
import StatusBadge from '../../components/StatusBadge'
import TablePagination from '../../components/TablePagination'
import { FacultyHeader } from './FacultyShared'
import { PAGE_SIZE } from './FacultyUtils'

const columns = ['employeeId', 'fullName', 'department', 'designation', 'qualification', 'experience', 'mobile', 'employmentStatus']
const employmentStatuses = ['Working', 'On Leave', 'Resigned', 'Retired']

export default function FacultyList({ faculty, onView, onEdit, onAdd, onStatus }) {
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('')
  const [designation, setDesignation] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  const [employmentStatus, setEmploymentStatus] = useState('')
  const [page, setPage] = useState(1)
  const departments = [...new Map(faculty.map((row) => [row.department.id, row.department])).values()]
  const designations = [...new Set(faculty.map((row) => row.designation))]
  const filtered = useMemo(() => faculty.filter((row) => {
    const haystack = [row.fullName, row.employeeId, row.email, row.mobile, row.department.name, row.designation].join(' ').toLowerCase()
    return (!query || haystack.includes(query.toLowerCase())) && (!department || row.department.id === department) && (!designation || row.designation === designation) && (!employmentType || row.employmentType === employmentType) && (!employmentStatus || row.employmentStatus === employmentStatus)
  }), [faculty, query, department, designation, employmentType, employmentStatus])
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const change = (setter) => (event) => { setter(event.target.value); setPage(1) }
  const working = faculty.filter((row) => row.employmentStatus === 'Working').length
  const onLeave = faculty.filter((row) => row.employmentStatus === 'On Leave').length
  const resigned = faculty.filter((row) => row.employmentStatus === 'Resigned').length
  return <>
    <FacultyHeader subtitle="Manage faculty records, academic assignments and employment status."><button className="cm-button" type="button" onClick={onAdd}><FiPlus /> Add Faculty</button></FacultyHeader>
    <div className="compact-summary faculty-summary"><span><small>Total Faculty</small><strong>{faculty.length}</strong></span><span><small>Working</small><strong>{working}</strong></span><span><small>On Leave</small><strong>{onLeave}</strong></span><span><small>Resigned</small><strong>{resigned}</strong></span></div>
    <section className="faculty-directory erp-section">
      <header className="faculty-directory__header"><div><span className="cm-eyebrow">Faculty Directory</span><p>{filtered.length} records</p></div><div className="erp-page-actions"><ExportMenu rows={filtered} columns={columns.map((key) => ({ key, label: key }))} title="Faculty Directory" filename="faculty-roster" /><button className="cm-button" type="button" onClick={onAdd}><FiPlus /> Add Faculty</button></div></header>
      <div className="faculty-toolbar"><label className="faculty-search"><FiSearch /><input value={query} onChange={change(setQuery)} placeholder="Search by faculty name, employee ID, email or mobile" aria-label="Search faculty" /></label><select value={department} onChange={change(setDepartment)} aria-label="Department"><option value="">Department</option>{departments.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><select value={designation} onChange={change(setDesignation)} aria-label="Designation"><option value="">Designation</option>{designations.map((item) => <option key={item}>{item}</option>)}</select><select value={employmentType} onChange={change(setEmploymentType)} aria-label="Employment type"><option value="">Employment Type</option>{['Permanent', 'Contract', 'Visiting', 'Guest'].map((item) => <option key={item}>{item}</option>)}</select><select value={employmentStatus} onChange={change(setEmploymentStatus)} aria-label="Employment status"><option value="">Employment Status</option>{employmentStatuses.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="faculty-table-wrap"><table className="erp-table faculty-table"><thead><tr><th>Employee ID</th><th>Faculty Name</th><th>Department</th><th>Designation</th><th>Qualification</th><th>Experience</th><th>Mobile</th><th>Employment Status</th><th>Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.employeeId}</strong></td><td><strong title={row.fullName}>{row.fullName}</strong><small>{row.email}</small></td><td title={row.department.name}>{row.department.name}</td><td>{row.designation}</td><td>{row.qualification}</td><td>{row.experience}</td><td>{row.mobile}</td><td><StatusBadge value={row.employmentStatus} /></td><td><div className="table-actions-group"><button className="table-action-btn action-view" title="View faculty" aria-label="View faculty" type="button" onClick={() => onView(row)}><FiEye /></button><button className="table-action-btn action-edit" title="Edit faculty" aria-label="Edit faculty" type="button" onClick={() => onEdit(row)}><FiEdit2 /></button><button className="table-action-btn action-assign" title="Class Advisor Allocation" aria-label="Class Advisor Allocation" type="button" onClick={() => window.location.assign('/faculty/advisors')}><FiBriefcase /></button><button className="table-action-btn action-deactivate" title="Change employment status" aria-label="Change employment status" type="button" onClick={() => onStatus(row, row.employmentStatus === 'Working' ? 'On Leave' : 'Working')}><FiToggleRight /></button></div></td></tr>)}</tbody></table></div><TablePagination currentPage={page} totalPages={Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))} onPageChange={setPage} />
    </section>
  </>
}
