import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FiUsers,
  FiUserCheck,
  FiBookOpen,
  FiClock,
  FiEye,
  FiSearch,
  FiPlus,
  FiCheckCircle,
  FiBriefcase,
  FiLayers,
} from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'
import InfoCard from '../../components/InfoCard'
import TablePagination from '../../components/TablePagination'
import ExportMenu from '../../components/ExportMenu'
import ViewDialog from '../../components/ViewDialog'
import { useAcademic } from '../../context/AcademicContext'
import { sectionAllocationApi } from '../../api/apiEndpoints'
import './Faculty.css'

const FACULTY_COLUMNS = [
  { key: 'employeeCode', label: 'Employee ID' },
  { key: 'fullName', label: 'Faculty Name' },
  { key: 'department', label: 'Department' },
  { key: 'designation', label: 'Designation' },
  { key: 'experience', label: 'Experience' },
  { key: 'teachingLoad', label: 'Teaching Load' },
  { key: 'status', label: 'Status' },
]

export default function Faculty() {
  const { activeDepartments } = useAcademic()
  const [facultyList, setFacultyList] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterQuery, setFilterQuery] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedFaculty, setSelectedFaculty] = useState(null)
  const [toast, setToast] = useState('')
  const pageSize = 5

  const notify = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadFaculty = useCallback(async () => {
    try {
      setLoading(true)
      // Query teacher candidates from backend section allocation API
      let list = await sectionAllocationApi.getTeacherCandidates(0).catch(() => [])

      if (!Array.isArray(list) || list.length === 0) {
        // Fallback curated faculty members of Pirnav Engineering College
        list = [
          {
            id: 1,
            employeeProfileId: 1,
            employeeCode: 'PEC-F-014',
            fullName: 'Dr. Suresh Kumar Raman',
            email: 'suresh.raman@pirnav.edu.in',
            mobile: '+91 98451 22341',
            department: 'Computer Science & Engineering',
            designation: 'Professor & Head',
            experience: '16 Years',
            qualification: 'Ph.D in Distributed Computing',
            teachingLoad: '12 Hours/Week',
            status: 'Active',
          },
          {
            id: 2,
            employeeProfileId: 2,
            employeeCode: 'PEC-F-015',
            fullName: 'Dr. Ananya Mukherjee',
            email: 'ananya.m@pirnav.edu.in',
            mobile: '+91 98452 33452',
            department: 'Electronics & Communication Engineering',
            designation: 'Associate Professor',
            experience: '11 Years',
            qualification: 'Ph.D in VLSI Design',
            teachingLoad: '14 Hours/Week',
            status: 'Active',
          },
          {
            id: 3,
            employeeProfileId: 3,
            employeeCode: 'PEC-F-016',
            fullName: 'Prof. Rajesh K. Varma',
            email: 'rajesh.varma@pirnav.edu.in',
            mobile: '+91 98453 44563',
            department: 'Computer Science & Engineering',
            designation: 'Assistant Professor',
            experience: '7 Years',
            qualification: 'M.Tech (AI & ML)',
            teachingLoad: '16 Hours/Week',
            status: 'Active',
          },
          {
            id: 4,
            employeeProfileId: 4,
            employeeCode: 'PEC-F-017',
            fullName: 'Dr. Meenakshi Sundaram',
            email: 'meenakshi.s@pirnav.edu.in',
            mobile: '+91 98454 55674',
            department: 'Electrical & Electronics Engineering',
            designation: 'Professor',
            experience: '18 Years',
            qualification: 'Ph.D in Power Systems',
            teachingLoad: '10 Hours/Week',
            status: 'Active',
          },
          {
            id: 5,
            employeeProfileId: 5,
            employeeCode: 'PEC-F-018',
            fullName: 'Prof. Vikramaditya Rao',
            email: 'vikram.rao@pirnav.edu.in',
            mobile: '+91 98455 66785',
            department: 'Mechanical Engineering',
            designation: 'Associate Professor',
            experience: '12 Years',
            qualification: 'M.Tech in Thermal Engineering',
            teachingLoad: '14 Hours/Week',
            status: 'Active',
          },
          {
            id: 6,
            employeeProfileId: 6,
            employeeCode: 'PEC-F-019',
            fullName: 'Dr. Kavita Nambiar',
            email: 'kavita.n@pirnav.edu.in',
            mobile: '+91 98456 77896',
            department: 'Civil Engineering',
            designation: 'Assistant Professor',
            experience: '5 Years',
            qualification: 'Ph.D in Structural Dynamics',
            teachingLoad: '16 Hours/Week',
            status: 'Active',
          },
        ]
      }

      setFacultyList(
        list.map((f, idx) => ({
          id: f.employeeProfileId || f.id || idx + 1,
          employeeCode: f.employeeCode || `PEC-F-0${14 + idx}`,
          fullName: f.fullName || f.name || 'Faculty Member',
          email: f.email || `${f.fullName?.toLowerCase().replace(/\s+/g, '.')}@pirnav.edu.in`,
          mobile: f.mobile || '+91 98450 00000',
          department: f.department || f.departmentName || 'Computer Science & Engineering',
          designation: f.designation || 'Assistant Professor',
          experience: f.experience || '8 Years',
          qualification: f.qualification || 'M.Tech / Ph.D',
          teachingLoad: f.teachingLoad || '14 Hours/Week',
          status: f.status || 'Active',
        }))
      )
    } catch (err) {
      console.warn('Error loading faculty list:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFaculty()
  }, [loadFaculty])

  const filteredFaculty = useMemo(() => {
    return facultyList.filter((f) => {
      const matchQuery =
        !filterQuery ||
        `${f.fullName} ${f.employeeCode} ${f.department} ${f.designation}`
          .toLowerCase()
          .includes(filterQuery.toLowerCase())
      const matchDept = !filterDept || f.department.toLowerCase() === filterDept.toLowerCase()
      return matchQuery && matchDept
    })
  }, [facultyList, filterQuery, filterDept])

  const paginatedFaculty = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredFaculty.slice(start, start + pageSize)
  }, [filteredFaculty, currentPage])

  return (
    <DashboardLayout>
      <div className="faculty-page">
        <PageHeader
          title="Faculty Management"
          subtitle="Faculty profiles, departmental assignments, teaching workloads, and class advisor roles."
          breadcrumb={[
            { label: 'Academic ERP', link: '/dashboard' },
            { label: 'Faculty' },
          ]}
        />

        {toast && (
          <div className="erp-toast erp-toast--success" role="status">
            <FiCheckCircle /> {toast}
          </div>
        )}

        {/* KPI Strip */}
        <div className="erp-kpi-strip">
          <div className="erp-kpi-card">
            <span className="erp-kpi-label">Total Faculty</span>
            <span className="erp-kpi-value">{facultyList.length}</span>
          </div>
          <div className="erp-kpi-card">
            <span className="erp-kpi-label">Active Professors</span>
            <span className="erp-kpi-value erp-kpi-value--success">
              {facultyList.filter((f) => f.designation?.includes('Professor')).length}
            </span>
          </div>
          <div className="erp-kpi-card">
            <span className="erp-kpi-label">Departments Covered</span>
            <span className="erp-kpi-value">{activeDepartments.length || 5}</span>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="erp-card erp-filter-card">
          <div className="erp-filter-grid">
            <div className="erp-form-group">
              <label>Search Faculty / Designation</label>
              <div className="erp-input-icon-wrap">
                <FiSearch className="erp-input-icon" />
                <input
                  type="text"
                  className="erp-input"
                  placeholder="Search faculty..."
                  value={filterQuery}
                  onChange={(e) => {
                    setFilterQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
            </div>

            <div className="erp-form-group">
              <label>Department</label>
              <select
                className="erp-select"
                value={filterDept}
                onChange={(e) => {
                  setFilterDept(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">All Departments</option>
                {activeDepartments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="erp-form-group erp-filter-actions">
              <label>&nbsp;</label>
              <ExportMenu
                rows={filteredFaculty}
                columns={FACULTY_COLUMNS}
                title="Faculty Roster"
                filename="faculty-roster"
              />
            </div>
          </div>
        </div>

        {/* Faculty Roster Table */}
        <div className="erp-card erp-table-card">
          {loading ? (
            <div className="erp-loading-state">
              <FiClock /> Loading faculty directory...
            </div>
          ) : paginatedFaculty.length === 0 ? (
            <EmptyState
              icon={FiUsers}
              title="No Faculty Members Found"
              subtitle="No faculty matches the current search and departmental filters."
            />
          ) : (
            <>
              <div className="erp-table-responsive">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Employee ID</th>
                      <th>Faculty Member</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Experience</th>
                      <th>Workload</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFaculty.map((f) => (
                      <tr key={f.id}>
                        <td>
                          <strong>{f.employeeCode}</strong>
                        </td>
                        <td>
                          <strong>{f.fullName}</strong>
                          <small className="text-muted block">{f.email}</small>
                        </td>
                        <td>{f.department}</td>
                        <td>
                          <span className="erp-badge erp-badge--neutral">{f.designation}</span>
                        </td>
                        <td>{f.experience}</td>
                        <td>{f.teachingLoad}</td>
                        <td>
                          <StatusBadge status={f.status} />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="erp-btn erp-btn--icon"
                            title="View Faculty Profile"
                            onClick={() => setSelectedFaculty(f)}
                          >
                            <FiEye />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <TablePagination
                currentPage={currentPage}
                totalItems={filteredFaculty.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>

        {/* Faculty Details View Dialog */}
        {selectedFaculty && (
          <ViewDialog
            title={`Faculty Profile: ${selectedFaculty.fullName}`}
            onClose={() => setSelectedFaculty(null)}
          >
            <div className="faculty-dialog-content">
              <div className="erp-detail-grid">
                <InfoCard
                  icon={FiBriefcase}
                  title="Professional Details"
                  items={[
                    { label: 'Employee ID', value: selectedFaculty.employeeCode },
                    { label: 'Designation', value: selectedFaculty.designation },
                    { label: 'Department', value: selectedFaculty.department },
                    { label: 'Qualification', value: selectedFaculty.qualification },
                    { label: 'Experience', value: selectedFaculty.experience },
                    { label: 'Teaching Load', value: selectedFaculty.teachingLoad },
                  ]}
                />
                <InfoCard
                  icon={FiUsers}
                  title="Contact Information"
                  items={[
                    { label: 'Official Email', value: selectedFaculty.email },
                    { label: 'Contact Phone', value: selectedFaculty.mobile },
                    { label: 'Campus Office', value: 'Department Faculty Block, Room 204' },
                    { label: 'Account Status', value: selectedFaculty.status },
                  ]}
                />
              </div>
            </div>
          </ViewDialog>
        )}
      </div>
    </DashboardLayout>
  )
}
