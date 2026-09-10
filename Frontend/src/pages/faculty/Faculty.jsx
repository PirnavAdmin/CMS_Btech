import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import { facultyDemoService } from './services/facultyDemoService'
import FacultyList from './FacultyList'
import FacultyDetails from './FacultyDetails'
import FacultyForm from './FacultyForm'
import SectionAdvisorAssignment from './SectionAdvisorAssignment'
import FacultySubjectAllocation from './FacultySubjectAllocation'
import FacultyAttendance from './FacultyAttendance'
import './Faculty.css'

export default function Faculty() {
  const location = useLocation()
  const navigate = useNavigate()
  const { id } = useParams()
  const [, refresh] = useState(0)
  useEffect(() => facultyDemoService.subscribe(() => refresh((value) => value + 1)), [])
  const path = location.pathname
  const state = facultyDemoService.getState()
  const editId = path.match(/^\/faculty\/([^/]+)\/edit$/)?.[1]
  const detailId = path.match(/^\/faculty\/([^/]+)$/)?.[1]
  const selectedId = id || editId || detailId
  const selected = facultyDemoService.getById(selectedId)
  const masters = facultyDemoService.masters
  const saveFaculty = (values, facultyId) => { if (facultyId) facultyDemoService.update(facultyId, values); else facultyDemoService.create(values); navigate(facultyId ? `/faculty/${facultyId}` : '/faculty') }
  let content
  if (path === '/faculty/new' || path === '/faculty/add') content = <FacultyForm masters={masters} onSave={(values) => saveFaculty(values)} onBack={() => navigate('/faculty')} />
  else if (editId) content = <FacultyForm faculty={selected} masters={masters} onSave={(values) => saveFaculty(values, selected.id)} onBack={() => navigate(`/faculty/${selected.id}`)} />
  else if (['/faculty/advisors', '/faculty/assignments', '/faculty/allocations'].includes(path)) content = <SectionAdvisorAssignment faculty={state.faculty} sections={masters.sections} advisors={facultyDemoService.getAdvisors()} masters={masters} onAssign={(values) => facultyDemoService.assignAdvisor(values)} />
  else if (['/faculty/subjects', '/faculty/subject-allocation'].includes(path)) content = <FacultySubjectAllocation faculty={state.faculty} masters={masters} allocations={facultyDemoService.getAllocations()} onCreate={(values) => facultyDemoService.createAllocation(values)} onUpdate={(allocationId, values) => facultyDemoService.updateAllocation(allocationId, values)} onStatus={(allocationId, status) => facultyDemoService.updateAllocationStatus(allocationId, status)} />
  else if (path === '/faculty/attendance') content = <FacultyAttendance faculty={state.faculty} attendance={state.attendance} onMark={(values) => facultyDemoService.markAttendance(values)} summary={(month) => facultyDemoService.attendanceSummary(month)} />
  else if (detailId || id) content = <FacultyDetails faculty={selected} masters={masters} allocations={facultyDemoService.getAllocations({ facultyId: selectedId })} workload={facultyDemoService.workload(selectedId)} onBack={() => navigate('/faculty')} onEdit={() => navigate(`/faculty/${selectedId}/edit`)} onStatus={(status) => facultyDemoService.updateStatus(selectedId, status)} />
  else content = <FacultyList faculty={state.faculty} advisors={facultyDemoService.getAdvisors()} onView={(row) => navigate(`/faculty/${row.id}`)} onEdit={(row) => navigate(`/faculty/${row.id}/edit`)} onAdd={() => navigate('/faculty/new')} onStatus={(row, status) => facultyDemoService.updateStatus(row.id, status)} />
  return <DashboardLayout>{content}</DashboardLayout>
}
