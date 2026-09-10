import { useMemo, useState } from 'react'
import { FiCheckCircle, FiSearch } from 'react-icons/fi'
import StatusBadge from '../../components/StatusBadge'
import { FacultyHeader } from './FacultyShared'

export default function SectionAdvisorAssignment({ faculty, sections, advisors, onAssign }) {
  const [yearId, setYearId] = useState('ay-2026')
  const [courseId, setCourseId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [semesterId, setSemesterId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [query, setQuery] = useState('')
  const years = [{ id: 'ay-2026', name: '2026 - 2027' }, { id: 'ay-2025', name: '2025 - 2026' }]
  const courses = [{ id: 'course-btech', name: 'B.Tech' }]
  const branches = [{ id: 'branch-cse', name: 'Computer Science & Engineering' }]
  const semesters = [1, 2, 3, 4, 5, 6].map((number) => ({ id: `sem-${number}`, name: `Semester ${number}` }))
  const visibleSections = sections.filter((row) => (!yearId || row.academicYearId === yearId) && (!courseId || row.courseId === courseId) && (!branchId || row.branchId === branchId) && (!semesterId || row.semesterId === semesterId))
  const selected = visibleSections.find((row) => row.id === sectionId)
  const current = advisors.find((row) => row.sectionId === sectionId)
  const candidates = useMemo(() => faculty.filter((row) => row.employmentStatus === 'Working' && `${row.fullName} ${row.employeeId} ${row.department.name}`.toLowerCase().includes(query.toLowerCase())), [faculty, query])
  const assignFaculty = (facultyId) => {
    const targetSectionId = sectionId || visibleSections[0]?.id
    if (!targetSectionId) return
    if (!sectionId) setSectionId(targetSectionId)
    const existing = advisors.find((row) => row.sectionId === targetSectionId)
    onAssign({ id: existing?.id, sectionId: targetSectionId, facultyId, academicYearId: yearId })
  }
  const resetFrom = (setter) => (event) => { setter(event.target.value); setSectionId('') }
  return <><FacultyHeader title="Class Advisor Allocation" subtitle="Assign and manage faculty advisors for academic sections." /><section className="faculty-directory erp-section"><div className="faculty-toolbar advisor-filters"><select value={yearId} onChange={resetFrom(setYearId)}><option value="">Academic Year</option>{years.map((row) => <option value={row.id} key={row.id}>{row.name}</option>)}</select><select value={courseId} onChange={(event) => { setCourseId(event.target.value); setBranchId(''); setSemesterId(''); setSectionId('') }}><option value="">Course</option>{courses.map((row) => <option value={row.id} key={row.id}>{row.name}</option>)}</select><select value={branchId} onChange={(event) => { setBranchId(event.target.value); setSemesterId(''); setSectionId('') }}><option value="">Branch</option>{branches.map((row) => <option value={row.id} key={row.id}>{row.name}</option>)}</select><select value={semesterId} onChange={(event) => { setSemesterId(event.target.value); setSectionId('') }}><option value="">Semester</option>{semesters.map((row) => <option value={row.id} key={row.id}>{row.name}</option>)}</select><select value={sectionId} onChange={(event) => setSectionId(event.target.value)}><option value="">Section</option>{visibleSections.map((row) => <option value={row.id} key={row.id}>{row.name}</option>)}</select></div>{selected && <div className="advisor-selection"><div><small>Selected Section</small><strong>{selected.name}</strong><span>{selected.code} · {semesters.find((row) => row.id === selected.semesterId)?.name}</span></div><div><small>Current Advisor</small><strong>{current?.faculty?.fullName || 'Unassigned'}</strong></div></div>}<div className="faculty-toolbar"><label className="faculty-search"><FiSearch /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search active faculty by name, ID or department" /></label></div><div className="faculty-table-wrap"><table className="erp-table faculty-table"><thead><tr><th>Employee ID</th><th>Faculty Name</th><th>Department</th><th>Designation</th><th>Current Advisor Load</th><th>Action</th></tr></thead><tbody>{candidates.map((row) => <tr key={row.id}><td>{row.employeeId}</td><td>{row.fullName}</td><td>{row.department.name}</td><td>{row.designation}</td><td>{advisors.filter((item) => item.facultyId === row.id).length} sections</td><td><button className="cm-button" type="button" onClick={() => assignFaculty(row.id)}><FiCheckCircle /> {current?.facultyId === row.id ? 'Assigned' : current ? 'Change Advisor' : 'Assign Advisor'}</button></td></tr>)}</tbody></table></div></section></>
}
