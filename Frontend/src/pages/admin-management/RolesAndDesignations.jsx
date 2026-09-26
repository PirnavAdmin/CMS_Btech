import { useState, useEffect, useMemo, Fragment } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import PageHeader from '../../components/PageHeader'
import ExportMenu from '../../components/ExportMenu'
import StatusBadge from '../../components/StatusBadge'
import { showSuccess, showError } from '../../utils/toast'
import facultyService, { normalizeFaculty } from '../../services/facultyService'
import {
  FiShield,
  FiAward,
  FiUsers,
  FiKey,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiCheck,
  FiX,
  FiSliders,
  FiUserCheck,
  FiChevronLeft,
  FiChevronRight,
  FiInfo,
  FiAlertCircle,
} from 'react-icons/fi'
import './RolesAndDesignations.css'

// ==========================================
// SYSTEM MODULES & PERMISSION SCHEMAS
// ==========================================
export const SYSTEM_MODULES = [
  { id: 'colleges', name: 'Colleges & Institutions', description: 'Manage campus details, leadership & accreditation', category: 'Administration' },
  { id: 'departments', name: 'Departments & Leadership', description: 'Department HODs, academic streams & allocations', category: 'Administration' },
  { id: 'academic_years', name: 'Academic Years', description: 'Configure academic batches, terms & calendars', category: 'Administration' },
  { id: 'courses', name: 'Courses & Degrees', description: 'B.Tech / M.Tech degree programs & curricula', category: 'Academic Structure' },
  { id: 'branches', name: 'Branches / Streams', description: 'CSE, ECE, EEE, Mechanical & other specializations', category: 'Academic Structure' },
  { id: 'semesters', name: 'Semesters Management', description: 'Semester terms, session schedules & durations', category: 'Academic Structure' },
  { id: 'sections', name: 'Sections & Allocations', description: 'Student class sections, batches & capacities', category: 'Academic Structure' },
  { id: 'subjects', name: 'Subject Management', description: 'Core theory & lab subjects syllabus and codes', category: 'Curriculum' },
  { id: 'timetable', name: 'Timetable Scheduling', description: 'Weekly faculty-subject class periods & classrooms', category: 'Curriculum' },
  { id: 'credits', name: 'Credits & Syllabus', description: 'Credit points weightage, passing marks & units', category: 'Curriculum' },
  { id: 'electives', name: 'Elective Selection', description: 'Professional & open electives student allotments', category: 'Curriculum' },
  { id: 'faculty_directory', name: 'Faculty Directory', description: 'Faculty staff profiles, credentials & contact details', category: 'Staff & HR' },
  { id: 'faculty_attendance', name: 'Faculty Attendance', description: 'Daily biometric attendance & duty logs', category: 'Staff & HR' },
  { id: 'faculty_leaves', name: 'Faculty Leaves', description: 'Staff leave applications, approval & balance tracking', category: 'Staff & HR' },
  { id: 'faculty_payroll', name: 'Faculty Payroll', description: 'Salary slips, allowances, deductions & disbursal', category: 'Staff & HR' },
  { id: 'student_admissions', name: 'Student Admissions', description: 'New student admissions, document verification & enrollment', category: 'Students' },
  { id: 'student_profiles', name: 'Student Profiles', description: 'Student biodata, parent contact & academic records', category: 'Students' },
  { id: 'student_attendance', name: 'Student Attendance', description: 'Period-wise attendance marking & percentage tracking', category: 'Students' },
  { id: 'student_promotions', name: 'Student Promotions', description: 'Yearly/semester promotion, detention & batch upgrades', category: 'Students' },
  { id: 'marks', name: 'Marks & Internal Assessment', description: 'Mid exam marks, lab internals & assignment grading', category: 'Exams & Results' },
  { id: 'results', name: 'Semester Results & Grading', description: 'Final SGPA/CGPA generation, grade cards & publishing', category: 'Exams & Results' },
  { id: 'fees', name: 'Fee Structures & Collections', description: 'Tuition fees, dues, challans & payment receipts', category: 'Finance' },
  { id: 'roles_permissions', name: 'Roles & Access Control', description: 'Manage RBAC permissions matrix and security policies', category: 'System Settings' },
  { id: 'academic_settings', name: 'Academic Context Settings', description: 'Active academic year, college selection & global rules', category: 'System Settings' },
]

export const PERMISSION_ACTIONS = [
  { id: 'view', label: 'View', icon: '👁️', desc: 'Read / View records' },
  { id: 'create', label: 'Create', icon: '➕', desc: 'Add new records' },
  { id: 'edit', label: 'Edit', icon: '✏️', desc: 'Modify existing data' },
  { id: 'delete', label: 'Delete', icon: '🗑️', desc: 'Remove records' },
  { id: 'export', label: 'Export', icon: '📤', desc: 'Download Excel/PDF' },
]

export const fullAccessPermissions = () => {
  const perms = {}
  SYSTEM_MODULES.forEach((mod) => {
    perms[mod.id] = { view: true, create: true, edit: true, delete: true, export: true }
  })
  return perms
}

export const readOnlyPermissions = () => {
  const perms = {}
  SYSTEM_MODULES.forEach((mod) => {
    perms[mod.id] = { view: true, create: false, edit: false, delete: false, export: true }
  })
  return perms
}

export const hodPresetPermissions = () => {
  const perms = {}
  SYSTEM_MODULES.forEach((mod) => {
    const isAcademic = [
      'departments',
      'courses',
      'branches',
      'semesters',
      'sections',
      'subjects',
      'timetable',
      'electives',
      'faculty_directory',
      'faculty_attendance',
      'student_profiles',
      'student_attendance',
      'marks',
      'results',
    ].includes(mod.id)
    perms[mod.id] = {
      view: true,
      create: isAcademic,
      edit: isAcademic,
      delete: false,
      export: true,
    }
  })
  return perms
}

export const facultyPresetPermissions = () => {
  const perms = {}
  SYSTEM_MODULES.forEach((mod) => {
    const isTeaching = ['subjects', 'timetable', 'student_attendance', 'marks'].includes(mod.id)
    const isViewable = ['courses', 'branches', 'semesters', 'sections', 'faculty_leaves', 'student_profiles', 'results'].includes(mod.id)
    perms[mod.id] = {
      view: isTeaching || isViewable,
      create: isTeaching,
      edit: isTeaching,
      delete: false,
      export: isTeaching,
    }
  })
  return perms
}

const STORAGE_KEY_ROLES = 'pirnav_erp_rbac_roles_clean_v1'
const STORAGE_KEY_DESIGNATIONS = 'pirnav_erp_rbac_designations_clean_v1'
const STORAGE_KEY_ASSIGNMENTS = 'pirnav_erp_rbac_assignments_clean_v1'

export default function RolesAndDesignations() {
  const [activeTab, setActiveTab] = useState('roles') // 'roles' | 'designations' | 'assignments'
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Real data state (Starts completely clean with 0 mock records)
  const [roles, setRoles] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROLES)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [designations, setDesignations] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DESIGNATIONS)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [assignments, setAssignments] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const [facultyList, setFacultyList] = useState([])
  const [isLoadingFaculty, setIsLoadingFaculty] = useState(true)

  // Modals state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState(null)

  const [isDesModalOpen, setIsDesModalOpen] = useState(false)
  const [editingDesignation, setEditingDesignation] = useState(null)

  const [isPermModalOpen, setIsPermModalOpen] = useState(false)
  const [editingPermissionsRole, setEditingPermissionsRole] = useState(null)

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assigningStaff, setAssigningStaff] = useState(null)
  const [selectedStaffRole, setSelectedStaffRole] = useState('')
  const [selectedStaffDesignation, setSelectedStaffDesignation] = useState('')
  const [selectedStaffScope, setSelectedStaffScope] = useState('Department-scoped')

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ROLES, JSON.stringify(roles))
  }, [roles])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DESIGNATIONS, JSON.stringify(designations))
  }, [designations])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(assignments))
  }, [assignments])

  // Load real live faculty from backend
  useEffect(() => {
    setIsLoadingFaculty(true)
    facultyService.list()
      .then((records) => setFacultyList(records.map(normalizeFaculty)))
      .catch(() => setFacultyList([]))
      .finally(() => setIsLoadingFaculty(false))
  }, [])

  // Reset pagination on tab / search / filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, query, categoryFilter, pageSize])

  // ==========================================
  // STATS & COUNTS
  // ==========================================
  const totalRoles = roles.length
  const totalDesignations = designations.length
  const activeTeachingDesignations = designations.filter((d) => d.category === 'Teaching' && d.status === 'Active').length
  const staffCount = facultyList.length

  // ==========================================
  // ROLES HANDLERS
  // ==========================================
  const handleOpenCreateRole = () => {
    setEditingRole({
      id: `ROLE-${String(Date.now()).slice(-4)}`,
      name: '',
      code: '',
      category: '',
      level: '',
      description: '',
      status: '', // Not default to Active, user explicitly selects!
      isSystem: false,
      userCount: 0,
      permissions: readOnlyPermissions(),
    })
    setIsRoleModalOpen(true)
  }

  const handleOpenEditRole = (role) => {
    setEditingRole({ ...role })
    setIsRoleModalOpen(true)
  }

  const handleSaveRole = (e) => {
    e.preventDefault()
    if (!editingRole.name.trim()) return showError('Please enter a role name.')
    if (!editingRole.code.trim()) return showError('Please enter a role code.')
    if (!editingRole.category) return showError('Please select a category.')
    if (!editingRole.level) return showError('Please select a hierarchy level.')
    if (!editingRole.status) return showError('Please select a status (Active / Inactive).')

    const normalizedCode = editingRole.code.trim().toUpperCase()
    const isDuplicate = roles.some((r) => r.id !== editingRole.id && r.code.toUpperCase() === normalizedCode)
    if (isDuplicate) return showError('A role with this code already exists.')

    setRoles((current) => {
      const exists = current.some((r) => r.id === editingRole.id)
      if (exists) {
        return current.map((r) => (r.id === editingRole.id ? { ...editingRole, code: normalizedCode } : r))
      }
      return [...current, { ...editingRole, code: normalizedCode }]
    })

    showSuccess(`Role "${editingRole.name}" saved successfully.`)
    setIsRoleModalOpen(false)
  }

  const handleDeleteRole = (role) => {
    if (role.isSystem) return showError('System default roles cannot be deleted.')
    if (window.confirm(`Are you sure you want to delete role "${role.name}"?`)) {
      setRoles((current) => current.filter((r) => r.id !== role.id))
      showSuccess(`Role "${role.name}" deleted.`)
    }
  }

  // Permissions Matrix Handlers
  const handleOpenPermissions = (role) => {
    setEditingPermissionsRole(JSON.parse(JSON.stringify(role)))
    setIsPermModalOpen(true)
  }

  const handleTogglePermission = (moduleId, actionId) => {
    setEditingPermissionsRole((prev) => {
      const currentMod = prev.permissions?.[moduleId] || { view: false, create: false, edit: false, delete: false, export: false }
      const nextVal = !currentMod[actionId]
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [moduleId]: {
            ...currentMod,
            [actionId]: nextVal,
            ...(nextVal && actionId !== 'view' ? { view: true } : {}),
            ...(!nextVal && actionId === 'view' ? { create: false, edit: false, delete: false, export: false } : {}),
          },
        },
      }
    })
  }

  const handleToggleRowAll = (moduleId) => {
    setEditingPermissionsRole((prev) => {
      const currentMod = prev.permissions?.[moduleId] || { view: false, create: false, edit: false, delete: false, export: false }
      const allActive = PERMISSION_ACTIONS.every((act) => currentMod[act.id])
      const nextVal = !allActive
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [moduleId]: {
            view: nextVal,
            create: nextVal,
            edit: nextVal,
            delete: nextVal,
            export: nextVal,
          },
        },
      }
    })
  }

  const handleToggleCategoryAll = (category) => {
    setEditingPermissionsRole((prev) => {
      const categoryModules = SYSTEM_MODULES.filter((m) => m.category === category)
      const allCategoryActive = categoryModules.every((mod) => {
        const modPerm = prev.permissions?.[mod.id] || {}
        return PERMISSION_ACTIONS.every((act) => modPerm[act.id])
      })
      const nextVal = !allCategoryActive
      const updated = { ...prev.permissions }
      categoryModules.forEach((mod) => {
        updated[mod.id] = {
          view: nextVal,
          create: nextVal,
          edit: nextVal,
          delete: nextVal,
          export: nextVal,
        }
      })
      return {
        ...prev,
        permissions: updated,
      }
    })
  }

  const handleApplyPreset = (presetName) => {
    if (!editingPermissionsRole) return
    let newPerms = {}
    if (presetName === 'full') newPerms = fullAccessPermissions()
    if (presetName === 'read') newPerms = readOnlyPermissions()
    if (presetName === 'hod') newPerms = hodPresetPermissions()
    if (presetName === 'faculty') newPerms = facultyPresetPermissions()

    setEditingPermissionsRole((prev) => ({
      ...prev,
      permissions: newPerms,
    }))
    showSuccess(`Applied "${presetName.toUpperCase()}" permissions preset.`)
  }

  const handleSavePermissions = () => {
    setRoles((current) => current.map((r) => (r.id === editingPermissionsRole.id ? editingPermissionsRole : r)))
    showSuccess(`Access permissions updated for role "${editingPermissionsRole.name}".`)
    setIsPermModalOpen(false)
  }

  // ==========================================
  // DESIGNATIONS HANDLERS
  // ==========================================
  const handleOpenCreateDesignation = () => {
    setEditingDesignation({
      id: `DES-${String(Date.now()).slice(-4)}`,
      title: '',
      code: '',
      category: '',
      level: '',
      department: '',
      defaultRole: '',
      status: '', // Not default to Active!
    })
    setIsDesModalOpen(true)
  }

  const handleOpenEditDesignation = (des) => {
    setEditingDesignation({ ...des })
    setIsDesModalOpen(true)
  }

  const handleSaveDesignation = (e) => {
    e.preventDefault()
    if (!editingDesignation.title.trim()) return showError('Please enter a designation title.')
    if (!editingDesignation.code.trim()) return showError('Please enter a designation code.')
    if (!editingDesignation.category) return showError('Please select a staff category.')
    if (!editingDesignation.level) return showError('Please select a hierarchy level band.')
    if (!editingDesignation.status) return showError('Please select a status (Active / Inactive).')

    const normalizedCode = editingDesignation.code.trim().toUpperCase()
    const isDuplicate = designations.some((d) => d.id !== editingDesignation.id && d.code.toUpperCase() === normalizedCode)
    if (isDuplicate) return showError('A designation with this code already exists.')

    setDesignations((current) => {
      const exists = current.some((d) => d.id === editingDesignation.id)
      if (exists) {
        return current.map((d) => (d.id === editingDesignation.id ? { ...editingDesignation, code: normalizedCode } : d))
      }
      return [...current, { ...editingDesignation, code: normalizedCode }]
    })

    showSuccess(`Designation "${editingDesignation.title}" saved successfully.`)
    setIsDesModalOpen(false)
  }

  const handleDeleteDesignation = (des) => {
    if (window.confirm(`Are you sure you want to delete designation "${des.title}"?`)) {
      setDesignations((current) => current.filter((d) => d.id !== des.id))
      showSuccess(`Designation "${des.title}" deleted.`)
    }
  }

  // ==========================================
  // STAFF ASSIGNMENT HANDLERS
  // ==========================================
  const handleOpenAssignStaff = (staff) => {
    setAssigningStaff(staff)
    const assigned = assignments[staff.id]
    setSelectedStaffRole(assigned?.roleId || '')
    setSelectedStaffDesignation(assigned?.designationId || '')
    setSelectedStaffScope(assigned?.scope || 'Department-scoped')
    setIsAssignModalOpen(true)
  }

  const handleSaveStaffAssignment = (e) => {
    e.preventDefault()
    if (!assigningStaff) return
    if (!selectedStaffDesignation) return showError('Please select an official designation.')
    if (!selectedStaffRole) return showError('Please select a system role & permissions profile.')
    if (!selectedStaffScope) return showError('Please select an access security scope.')

    setAssignments((prev) => ({
      ...prev,
      [assigningStaff.id]: {
        roleId: selectedStaffRole,
        designationId: selectedStaffDesignation,
        scope: selectedStaffScope,
        updatedAt: new Date().toISOString(),
      },
    }))

    const assignedRole = roles.find((r) => r.id === selectedStaffRole)
    const assignedDes = designations.find((d) => d.id === selectedStaffDesignation)
    showSuccess(`Updated access for ${assigningStaff.fullName} to "${assignedRole?.name || 'Assigned Role'}" (${assignedDes?.title || ''}).`)
    setIsAssignModalOpen(false)
  }

  // ==========================================
  // FILTERED DATA & PAGINATION
  // ==========================================
  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      const matchesQuery = `${role.name} ${role.code} ${role.description} ${role.category}`.toLowerCase().includes(query.toLowerCase())
      const matchesCategory = !categoryFilter || role.category === categoryFilter
      return matchesQuery && matchesCategory
    })
  }, [roles, query, categoryFilter])

  const filteredDesignations = useMemo(() => {
    return designations.filter((des) => {
      const matchesQuery = `${des.title} ${des.code} ${des.department} ${des.category}`.toLowerCase().includes(query.toLowerCase())
      const matchesCategory = !categoryFilter || des.category === categoryFilter
      return matchesQuery && matchesCategory
    })
  }, [designations, query, categoryFilter])

  const staffAssignmentRows = useMemo(() => {
    return facultyList.map((staff) => {
      const assigned = assignments[staff.id]
      const currentRole = roles.find((r) => r.id === assigned?.roleId) || null
      const currentDesignation = designations.find((d) => d.id === assigned?.designationId) || (staff.designation ? { title: staff.designation } : null)

      return {
        ...staff,
        currentRole,
        currentDesignation,
        scope: assigned?.scope || 'Department-scoped',
        isExplicitlyAssigned: Boolean(assigned),
      }
    }).filter((s) => {
      const matchesQuery = `${s.fullName} ${s.employeeId} ${s.department} ${s.currentRole?.name || ''} ${s.currentDesignation?.title || ''}`.toLowerCase().includes(query.toLowerCase())
      return matchesQuery
    })
  }, [facultyList, assignments, roles, designations, query])

  // Paginated Slices
  const activeDataset = activeTab === 'roles' ? filteredRoles : activeTab === 'designations' ? filteredDesignations : staffAssignmentRows
  const totalItems = activeDataset.length
  const totalPages = Math.ceil(totalItems / pageSize) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return activeDataset.slice(start, start + pageSize)
  }, [activeDataset, currentPage, pageSize])

  // Group modules for permission modal
  const moduleCategories = useMemo(() => {
    const groups = {}
    SYSTEM_MODULES.forEach((mod) => {
      if (!groups[mod.category]) groups[mod.category] = []
      groups[mod.category].push(mod)
    })
    return Object.entries(groups)
  }, [])

  // Active permissions count in modal
  const totalPossiblePerms = useMemo(() => {
    return SYSTEM_MODULES.length * PERMISSION_ACTIONS.length
  }, [])

  const grantedPermsCount = useMemo(() => {
    if (!editingPermissionsRole?.permissions) return 0
    return Object.values(editingPermissionsRole.permissions).reduce((acc, p) => acc + Object.values(p || {}).filter(Boolean).length, 0)
  }, [editingPermissionsRole])

  const assignedCount = useMemo(() => {
    return staffAssignmentRows.filter(
      (s) => (s.roleName && s.roleName !== 'No Role Assigned') || (s.designationTitle && s.designationTitle !== 'Unassigned')
    ).length
  }, [staffAssignmentRows])

  const compactSummaryItems = useMemo(() => {
    return [
      { label: 'ROLES', value: roles.length, tone: 'default' },
      { label: 'DESIGNATIONS', value: designations.length, tone: 'default' },
      { label: 'ASSIGNED', value: assignedCount, tone: 'active' },
      { label: 'STAFF', value: staffCount, tone: 'default' },
    ]
  }, [roles.length, designations.length, assignedCount, staffCount])

  return (
    <DashboardLayout>
      <div className="rbac-page">
        {/* Page Header with Top-Right Compact Summary */}
        <PageHeader
          title="Roles & Designations Management"
          subtitle="Define organizational hierarchy, configure granular RBAC permission matrix across all modules, and govern staff access."
          compactSummary={compactSummaryItems}
        />

        {/* Main Card Container */}
        <div className="sa-directory rbac-main-card">
          {/* Tabs Navigation Header */}
          <div className="rbac-tabs-bar">
            <div className="rbac-tabs-list">
              <button
                type="button"
                className={`rbac-tab-btn ${activeTab === 'roles' ? 'is-active' : ''}`}
                onClick={() => { setActiveTab('roles'); setQuery(''); setCategoryFilter('') }}
              >
                <FiShield /> System Roles & Permissions <span className="rbac-tab-count">{roles.length}</span>
              </button>
              <button
                type="button"
                className={`rbac-tab-btn ${activeTab === 'designations' ? 'is-active' : ''}`}
                onClick={() => { setActiveTab('designations'); setQuery(''); setCategoryFilter('') }}
              >
                <FiAward /> Designation Directory <span className="rbac-tab-count">{designations.length}</span>
              </button>
              <button
                type="button"
                className={`rbac-tab-btn ${activeTab === 'assignments' ? 'is-active' : ''}`}
                onClick={() => { setActiveTab('assignments'); setQuery(''); setCategoryFilter('') }}
              >
                <FiUserCheck /> Staff Role & Access Mapping <span className="rbac-tab-count">{staffAssignmentRows.length}</span>
              </button>
            </div>

            <div className="rbac-header-actions">
              {activeTab === 'roles' && (
                <button type="button" className="sa-primary rbac-action-btn" onClick={handleOpenCreateRole}>
                  <FiPlus /> Create New Role
                </button>
              )}
              {activeTab === 'designations' && (
                <button type="button" className="sa-primary rbac-action-btn" onClick={handleOpenCreateDesignation}>
                  <FiPlus /> Add Designation
                </button>
              )}
            </div>
          </div>

          {/* Controls Toolbar */}
          <div className="sa-toolbar rbac-toolbar">
            <div className="sa-search rbac-search">
              <FiSearch aria-hidden="true" />
              <input
                type="search"
                placeholder={activeTab === 'roles' ? 'Search roles by name, code, description...' : activeTab === 'designations' ? 'Search designations by title, code...' : 'Search staff by name, employee ID, department...'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button type="button" className="rbac-clear-search" onClick={() => setQuery('')}>
                  <FiX />
                </button>
              )}
            </div>

            {activeTab !== 'assignments' && (
              <select
                className="rbac-filter-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">Select Category / All</option>
                {activeTab === 'roles' ? (
                  <>
                    <option value="Academic">Academic</option>
                    <option value="Administrative">Administrative</option>
                    <option value="System">System</option>
                    <option value="Student">Student</option>
                  </>
                ) : (
                  <>
                    <option value="Teaching">Teaching</option>
                    <option value="Non-Teaching">Non-Teaching</option>
                  </>
                )}
              </select>
            )}

            <div className="rbac-toolbar-right">
              <ExportMenu
                data={activeTab === 'roles' ? filteredRoles : activeTab === 'designations' ? filteredDesignations : staffAssignmentRows}
                filename={`export_${activeTab}_${new Date().toISOString().slice(0, 10)}`}
                title={`${activeTab.toUpperCase()} Directory`}
              />
            </div>
          </div>

          {/* ============================================================== */}
          {/* TAB 1: ROLES & PERMISSIONS TABLE */}
          {/* ============================================================== */}
          {activeTab === 'roles' && (
            <div className="sa-table-wrap rbac-table-wrap">
              <table className="rbac-data-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '240px' }}>Role Profile & Identity</th>
                    <th style={{ minWidth: '120px' }}>Role Code</th>
                    <th style={{ minWidth: '120px' }}>Category</th>
                    <th style={{ minWidth: '170px' }}>Hierarchy Level</th>
                    <th style={{ minWidth: '150px' }}>Permissions Matrix</th>
                    <th style={{ minWidth: '90px' }}>Status</th>
                    <th style={{ textAlign: 'center', minWidth: '110px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((role) => {
                    const activePermCount = Object.values(role.permissions || {}).reduce((acc, p) => acc + Object.values(p || {}).filter(Boolean).length, 0)
                    return (
                      <tr key={role.id}>
                        <td>
                          <div className="rbac-profile-cell">
                            <div className="rbac-avatar-box is-role">
                              <FiShield />
                            </div>
                            <div className="rbac-profile-info">
                              <strong className="rbac-profile-title">{role.name}</strong>
                              <p className="rbac-profile-subtitle">{role.description || 'No description provided'}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="rbac-code-badge">{role.code}</span>
                        </td>
                        <td>
                          <span className={`rbac-tag rbac-tag--${role.category ? role.category.toLowerCase() : 'academic'}`}>
                            {role.category || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <span className="rbac-level-text">{role.level}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="rbac-perm-pill-btn"
                            onClick={() => handleOpenPermissions(role)}
                            title="Configure granular permissions matrix"
                          >
                            <FiSliders /> {activePermCount} Active Permissions
                          </button>
                        </td>
                        <td>
                          <StatusBadge status={role.status} />
                        </td>
                        <td>
                          <div className="rbac-table-row-actions">
                            <button
                              type="button"
                              onClick={() => handleOpenPermissions(role)}
                              title="Edit Permissions Matrix"
                              className="rbac-icon-btn is-matrix"
                            >
                              <FiKey />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditRole(role)}
                              title="Edit Role Details"
                              className="rbac-icon-btn is-edit"
                            >
                              <FiEdit2 />
                            </button>
                            {!role.isSystem && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRole(role)}
                                title="Delete Custom Role"
                                className="rbac-icon-btn is-delete"
                              >
                                <FiTrash2 />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {!paginatedData.length && (
                    <tr>
                      <td colSpan={7} className="rbac-empty-td">
                        <div className="sa-empty rbac-clean-empty">
                          <FiShield />
                          <h3>No Roles Created Yet</h3>
                          <p>Click "Create New Role" above to define administrator, department lead, faculty, or custom access profiles.</p>
                          <button type="button" className="sa-primary rbac-empty-create-btn" onClick={handleOpenCreateRole}>
                            <FiPlus /> Create New Role
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: DESIGNATIONS TABLE */}
          {/* ============================================================== */}
          {activeTab === 'designations' && (
            <div className="sa-table-wrap rbac-table-wrap">
              <table className="rbac-data-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '240px' }}>Designation Title</th>
                    <th style={{ minWidth: '110px' }}>Code</th>
                    <th style={{ minWidth: '130px' }}>Category</th>
                    <th style={{ minWidth: '160px' }}>Hierarchy Band</th>
                    <th style={{ minWidth: '180px' }}>Applicable Department</th>
                    <th style={{ minWidth: '180px' }}>Default Assigned Role</th>
                    <th style={{ minWidth: '90px' }}>Status</th>
                    <th style={{ textAlign: 'center', minWidth: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((des) => {
                    const mappedRole = roles.find((r) => r.id === des.defaultRole)
                    return (
                      <tr key={des.id}>
                        <td>
                          <div className="rbac-profile-cell">
                            <div className={`rbac-avatar-box ${des.category === 'Teaching' ? 'is-teaching' : 'is-nonteaching'}`}>
                              <FiAward />
                            </div>
                            <div className="rbac-profile-info">
                              <strong className="rbac-profile-title">{des.title}</strong>
                              <span className="rbac-profile-subtitle">{des.level}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="rbac-code-badge">{des.code}</span>
                        </td>
                        <td>
                          <span className={`rbac-tag ${des.category === 'Teaching' ? 'rbac-tag--teaching' : 'rbac-tag--nonteaching'}`}>
                            {des.category || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <span className="rbac-level-text">{des.level}</span>
                        </td>
                        <td>
                          <span className="rbac-dept-pill">{des.department || 'All Departments'}</span>
                        </td>
                        <td>
                          {mappedRole ? (
                            <div className="rbac-role-preview-pill">
                              <FiShield /> {mappedRole.name}
                            </div>
                          ) : (
                            <span className="rbac-unassigned-tag">None</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={des.status} />
                        </td>
                        <td>
                          <div className="rbac-table-row-actions">
                            <button
                              type="button"
                              onClick={() => handleOpenEditDesignation(des)}
                              title="Edit Designation"
                              className="rbac-icon-btn is-edit"
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDesignation(des)}
                              title="Delete Designation"
                              className="rbac-icon-btn is-delete"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {!paginatedData.length && (
                    <tr>
                      <td colSpan={8} className="rbac-empty-td">
                        <div className="sa-empty rbac-clean-empty">
                          <FiAward />
                          <h3>No Designations Created Yet</h3>
                          <p>Click "Add Designation" above to define official job titles and hierarchy levels.</p>
                          <button type="button" className="sa-primary rbac-empty-create-btn" onClick={handleOpenCreateDesignation}>
                            <FiPlus /> Add Designation
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: STAFF ROLE ASSIGNMENTS TABLE */}
          {/* ============================================================== */}
          {activeTab === 'assignments' && (
            <div className="sa-table-wrap rbac-table-wrap">
              <table className="rbac-data-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '240px' }}>Academic Staff Member</th>
                    <th style={{ minWidth: '120px' }}>Employee ID</th>
                    <th style={{ minWidth: '170px' }}>Department</th>
                    <th style={{ minWidth: '160px' }}>Assigned Designation</th>
                    <th style={{ minWidth: '180px' }}>Assigned Role & Access</th>
                    <th style={{ minWidth: '150px' }}>Access Scope</th>
                    <th style={{ textAlign: 'center', minWidth: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((staff) => (
                    <tr key={staff.id}>
                      <td>
                        <div className="sa-student rbac-staff-profile-cell">
                          <div className="sa-profile-avatar rbac-staff-avatar">
                            {(staff.fullName || 'ST').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="rbac-profile-info">
                            <strong className="rbac-profile-title">{staff.fullName}</strong>
                            <small className="rbac-profile-subtitle">{staff.email || 'No email registered'}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="rbac-code-badge">{staff.employeeId || 'N/A'}</span>
                      </td>
                      <td>
                        <span className="rbac-dept-name">{staff.department || 'Academic Department'}</span>
                      </td>
                      <td>
                        {staff.currentDesignation?.title ? (
                          <span className="rbac-tag rbac-tag--teaching">
                            {staff.currentDesignation.title}
                          </span>
                        ) : (
                          <span className="rbac-unassigned-tag">Not Assigned</span>
                        )}
                      </td>
                      <td>
                        {staff.currentRole ? (
                          <div className="rbac-role-pill-assigned">
                            <FiShield />
                            <strong>{staff.currentRole.name}</strong>
                          </div>
                        ) : (
                          <span className="rbac-unassigned-tag">Not Assigned</span>
                        )}
                      </td>
                      <td>
                        {staff.isExplicitlyAssigned ? (
                          <span className="rbac-scope-pill is-scoped">
                            {staff.scope}
                          </span>
                        ) : (
                          <span className="rbac-unassigned-tag">Default Scope</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="rbac-action-assign-btn"
                          onClick={() => handleOpenAssignStaff(staff)}
                        >
                          <FiUserCheck /> Assign Role
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!paginatedData.length && (
                    <tr>
                      <td colSpan={7} className="rbac-empty-td">
                        <div className="sa-empty rbac-clean-empty">
                          <FiUsers />
                          <h3>{isLoadingFaculty ? 'Loading Faculty Directory...' : 'No Staff Members Found'}</h3>
                          <p>{isLoadingFaculty ? 'Fetching active faculty records from backend...' : 'No faculty records matching filter criteria in directory.'}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ============================================================== */}
          {/* PAGINATION BAR */}
          {/* ============================================================== */}
          <div className="sa-pagination rbac-pagination">
            <div className="rbac-pagination-size">
              <span>Show</span>
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>entries (Showing {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems})</span>
            </div>

            <div className="rbac-pagination-controls">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                aria-label="Previous Page"
              >
                <FiChevronLeft />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                if (pg === 1 || pg === totalPages || (pg >= currentPage - 1 && pg <= currentPage + 1)) {
                  return (
                    <button
                      key={pg}
                      type="button"
                      className={currentPage === pg ? 'active' : ''}
                      onClick={() => setCurrentPage(pg)}
                    >
                      {pg}
                    </button>
                  )
                }
                if (pg === currentPage - 2 || pg === currentPage + 2) {
                  return <span key={pg} className="rbac-page-dots">...</span>
                }
                return null
              })}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                aria-label="Next Page"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* MODAL 1: CREATE / EDIT ROLE */}
        {/* ============================================================== */}
        {isRoleModalOpen && editingRole && (
          <div className="rbac-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setIsRoleModalOpen(false)}>
            <div className="rbac-modal-window">
              <button type="button" className="rbac-modal-close" onClick={() => setIsRoleModalOpen(false)}>
                <FiX />
              </button>

              <div className="rbac-modal-header">
                <span className="cm-eyebrow">ACCESS GOVERNANCE</span>
                <h2>{editingRole.isSystem ? 'Edit System Role' : editingRole.id ? 'Edit Access Role' : 'Create Access Role'}</h2>
                <p>Define role identity, administrative category, and hierarchy tier.</p>
              </div>

              <form onSubmit={handleSaveRole}>
                <div className="rbac-modal-grid">
                  <div className="sa-field">
                    <label>Role Name <b>*</b></label>
                    <input
                      type="text"
                      required
                      value={editingRole.name}
                      onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                      placeholder="e.g. Department Academic Head"
                    />
                  </div>

                  <div className="sa-field">
                    <label>Role Code <b>*</b></label>
                    <input
                      type="text"
                      required
                      value={editingRole.code}
                      onChange={(e) => setEditingRole({ ...editingRole, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. DEPT_HOD"
                      disabled={editingRole.isSystem}
                    />
                  </div>

                  <div className="sa-field">
                    <label>Category <b>*</b></label>
                    <select
                      required
                      value={editingRole.category}
                      onChange={(e) => setEditingRole({ ...editingRole, category: e.target.value })}
                    >
                      <option value="">Select Category</option>
                      <option value="Academic">Academic</option>
                      <option value="Administrative">Administrative</option>
                      <option value="System">System</option>
                      <option value="Student">Student</option>
                    </select>
                  </div>

                  <div className="sa-field">
                    <label>Hierarchy Level <b>*</b></label>
                    <select
                      required
                      value={editingRole.level}
                      onChange={(e) => setEditingRole({ ...editingRole, level: e.target.value })}
                    >
                      <option value="">Select Hierarchy Level</option>
                      <option value="Level 1 (Highest Privileges)">Level 1 (Highest Privileges)</option>
                      <option value="Level 2 (Executive Leadership)">Level 2 (Executive Leadership)</option>
                      <option value="Level 3 (Department Leadership)">Level 3 (Department Leadership)</option>
                      <option value="Level 4 (Academic Staff)">Level 4 (Academic Staff)</option>
                      <option value="Level 4 (Administrative Staff)">Level 4 (Administrative Staff)</option>
                      <option value="Level 5 (End User)">Level 5 (End User)</option>
                    </select>
                  </div>

                  <div className="sa-field wide">
                    <label>Role Description</label>
                    <textarea
                      rows={3}
                      value={editingRole.description}
                      onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                      placeholder="Brief summary of duties and access permissions for this role..."
                    />
                  </div>

                  <div className="sa-field">
                    <label>Status <b>*</b></label>
                    <select
                      required
                      value={editingRole.status}
                      onChange={(e) => setEditingRole({ ...editingRole, status: e.target.value })}
                    >
                      <option value="">Select Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <footer className="rbac-modal-footer">
                  <button type="button" className="sa-secondary" onClick={() => setIsRoleModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="sa-primary">
                    <FiCheck /> Save Role Profile
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 2: CREATE / EDIT DESIGNATION */}
        {/* ============================================================== */}
        {isDesModalOpen && editingDesignation && (
          <div className="rbac-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setIsDesModalOpen(false)}>
            <div className="rbac-modal-window">
              <button type="button" className="rbac-modal-close" onClick={() => setIsDesModalOpen(false)}>
                <FiX />
              </button>

              <div className="rbac-modal-header">
                <span className="cm-eyebrow">ORGANIZATIONAL HIERARCHY</span>
                <h2>{editingDesignation.id && editingDesignation.title ? 'Edit Designation' : 'Add Designation'}</h2>
                <p>Define official job designation, level band, and default system role mapping.</p>
              </div>

              <form onSubmit={handleSaveDesignation}>
                <div className="rbac-modal-grid">
                  <div className="sa-field">
                    <label>Designation Title <b>*</b></label>
                    <input
                      type="text"
                      required
                      value={editingDesignation.title}
                      onChange={(e) => setEditingDesignation({ ...editingDesignation, title: e.target.value })}
                      placeholder="e.g. Associate Professor"
                    />
                  </div>

                  <div className="sa-field">
                    <label>Designation Code <b>*</b></label>
                    <input
                      type="text"
                      required
                      value={editingDesignation.code}
                      onChange={(e) => setEditingDesignation({ ...editingDesignation, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. ASSOC_PROF"
                    />
                  </div>

                  <div className="sa-field">
                    <label>Staff Category <b>*</b></label>
                    <select
                      required
                      value={editingDesignation.category}
                      onChange={(e) => setEditingDesignation({ ...editingDesignation, category: e.target.value })}
                    >
                      <option value="">Select Staff Category</option>
                      <option value="Teaching">Teaching Faculty</option>
                      <option value="Non-Teaching">Non-Teaching / Administrative Staff</option>
                    </select>
                  </div>

                  <div className="sa-field">
                    <label>Hierarchy Level Band <b>*</b></label>
                    <select
                      required
                      value={editingDesignation.level}
                      onChange={(e) => setEditingDesignation({ ...editingDesignation, level: e.target.value })}
                    >
                      <option value="">Select Hierarchy Level Band</option>
                      <option value="Band 1 (Executive)">Band 1 (Executive / Dean / Principal)</option>
                      <option value="Band 2 (Senior Academic)">Band 2 (Senior Academic / Professor / HOD)</option>
                      <option value="Band 3 (Faculty)">Band 3 (Faculty / Associate / Assistant Prof)</option>
                      <option value="Band 4 (Technical Support)">Band 4 (Technical Support / Lab Incharge)</option>
                      <option value="Band 4 (Administrative Support)">Band 4 (Administrative Support / Accounts)</option>
                      <option value="Band 5 (Auxiliary Support)">Band 5 (Auxiliary Support / Clerk)</option>
                    </select>
                  </div>

                  <div className="sa-field">
                    <label>Applicable Department</label>
                    <input
                      type="text"
                      value={editingDesignation.department}
                      onChange={(e) => setEditingDesignation({ ...editingDesignation, department: e.target.value })}
                      placeholder="e.g. All Academic Departments"
                    />
                  </div>

                  <div className="sa-field">
                    <label>Default Mapped Role</label>
                    <select
                      value={editingDesignation.defaultRole}
                      onChange={(e) => setEditingDesignation({ ...editingDesignation, defaultRole: e.target.value })}
                    >
                      <option value="">Select Default Role (Optional)</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sa-field">
                    <label>Status <b>*</b></label>
                    <select
                      required
                      value={editingDesignation.status}
                      onChange={(e) => setEditingDesignation({ ...editingDesignation, status: e.target.value })}
                    >
                      <option value="">Select Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <footer className="rbac-modal-footer">
                  <button type="button" className="sa-secondary" onClick={() => setIsDesModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="sa-primary">
                    <FiCheck /> Save Designation
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 3: GRANULAR PERMISSIONS MATRIX (FULL-SIZED WINDOW) */}
        {/* ============================================================== */}
        {isPermModalOpen && editingPermissionsRole && (
          <div className="rbac-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setIsPermModalOpen(false)}>
            <div className="rbac-matrix-dialog">
              {/* Header Bar */}
              <div className="rbac-matrix-top-bar">
                <div className="rbac-matrix-title-group">
                  <span className="rbac-matrix-eyebrow">GRANULAR RBAC PERMISSIONS</span>
                  <div className="rbac-matrix-title-row">
                    <h2>Role: {editingPermissionsRole.name}</h2>
                    <span className="rbac-matrix-stats-badge">
                      <FiKey /> {grantedPermsCount} of {totalPossiblePerms} Actions Granted
                    </span>
                  </div>
                </div>

                <button type="button" className="rbac-modal-close" onClick={() => setIsPermModalOpen(false)}>
                  <FiX />
                </button>
              </div>

              {/* Sub-Header Toolbar: Presets & Legend */}
              <div className="rbac-matrix-sub-toolbar">
                <div className="rbac-presets-strip">
                  <span className="rbac-preset-caption">Quick Presets:</span>
                  <button type="button" className="rbac-preset-chip" onClick={() => handleApplyPreset('full')}>
                    Full Access
                  </button>
                  <button type="button" className="rbac-preset-chip" onClick={() => handleApplyPreset('hod')}>
                    HOD Lead
                  </button>
                  <button type="button" className="rbac-preset-chip" onClick={() => handleApplyPreset('faculty')}>
                    Teaching Faculty
                  </button>
                  <button type="button" className="rbac-preset-chip" onClick={() => handleApplyPreset('read')}>
                    Read Only
                  </button>
                </div>

                <div className="rbac-legend-strip">
                  <span><strong>👁️ View:</strong> Read</span>
                  <span><strong>➕ Create:</strong> Add</span>
                  <span><strong>✏️ Edit:</strong> Update</span>
                  <span><strong>🗑️ Delete:</strong> Remove</span>
                  <span><strong>📤 Export:</strong> Download</span>
                </div>
              </div>

              {/* Matrix Table Viewport */}
              <div className="rbac-matrix-viewport">
                <table className="rbac-matrix-grid-table">
                  <colgroup>
                    <col style={{ width: '36%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '14%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="th-mod-name">ERP Module & Scope Description</th>
                      <th className="th-action-col">👁️ VIEW</th>
                      <th className="th-action-col">➕ CREATE</th>
                      <th className="th-action-col">✏️ EDIT</th>
                      <th className="th-action-col">🗑️ DELETE</th>
                      <th className="th-action-col">📤 EXPORT</th>
                      <th className="th-toggle-col">⚡ MODULE QUICK ALL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moduleCategories.map(([category, modules]) => {
                      const allCatChecked = modules.every((mod) => {
                        const perm = editingPermissionsRole.permissions?.[mod.id] || {}
                        return PERMISSION_ACTIONS.every((act) => perm[act.id])
                      })

                      return (
                        <Fragment key={category}>
                          <tr className="rbac-cat-header-row">
                            <td colSpan={7}>
                              <div className="rbac-cat-banner">
                                <div className="rbac-cat-title">
                                  <strong>{category}</strong>
                                  <span>({modules.length} Modules in Category)</span>
                                </div>
                                <button
                                  type="button"
                                  className="rbac-cat-bulk-btn"
                                  onClick={() => handleToggleCategoryAll(category)}
                                >
                                  {allCatChecked ? '✖ Deselect All in Category' : '✔ Grant All in Category'}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {modules.map((mod) => {
                            const modPerm = editingPermissionsRole.permissions?.[mod.id] || {
                              view: false,
                              create: false,
                              edit: false,
                              delete: false,
                              export: false,
                            }
                            const isAllRowActive = PERMISSION_ACTIONS.every((act) => modPerm[act.id])

                            return (
                              <tr key={mod.id} className="rbac-mod-item-row">
                                <td className="rbac-mod-cell">
                                  <div className="rbac-mod-info-card">
                                    <strong className="rbac-mod-name-text">{mod.name}</strong>
                                    <p className="rbac-mod-desc-text">{mod.description}</p>
                                  </div>
                                </td>

                                {PERMISSION_ACTIONS.map((act) => {
                                  const isChecked = Boolean(modPerm[act.id])
                                  return (
                                    <td key={act.id} className="rbac-action-cell">
                                      <label className="rbac-custom-checkbox-wrapper" title={`${act.label} permission for ${mod.name}`}>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleTogglePermission(mod.id, act.id)}
                                        />
                                        <span className={`rbac-checkbox-custom-mark ${isChecked ? 'is-granted' : ''}`}>
                                          {isChecked ? <FiCheck /> : null}
                                        </span>
                                      </label>
                                    </td>
                                  )
                                })}

                                <td className="rbac-toggle-cell">
                                  <button
                                    type="button"
                                    className={`rbac-module-toggle-btn ${isAllRowActive ? 'is-all-granted' : ''}`}
                                    onClick={() => handleToggleRowAll(mod.id)}
                                  >
                                    {isAllRowActive ? 'All Granted' : 'Toggle All'}
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer Actions */}
              <footer className="rbac-matrix-footer">
                <div className="rbac-footer-summary">
                  <strong>{grantedPermsCount}</strong> active permissions assigned out of <strong>{totalPossiblePerms}</strong> total module actions.
                </div>
                <div className="rbac-footer-btn-group">
                  <button type="button" className="sa-secondary rbac-btn-cancel" onClick={() => setIsPermModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="sa-primary rbac-btn-save-matrix" onClick={handleSavePermissions}>
                    <FiCheck /> Save & Apply Permissions Matrix
                  </button>
                </div>
              </footer>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 4: ASSIGN ROLE & SCOPE TO STAFF */}
        {/* ============================================================== */}
        {isAssignModalOpen && assigningStaff && (
          <div className="rbac-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setIsAssignModalOpen(false)}>
            <div className="rbac-modal-window">
              <button type="button" className="rbac-modal-close" onClick={() => setIsAssignModalOpen(false)}>
                <FiX />
              </button>

              <div className="rbac-modal-header">
                <span className="cm-eyebrow">USER ACCESS GOVERNANCE</span>
                <h2>Assign System Role & Designation</h2>
                <p>Authorize member permissions and departmental security boundary.</p>
              </div>

              {/* Staff Member Preview Card */}
              <div className="rbac-staff-preview-box">
                <div className="sa-profile-avatar">
                  {(assigningStaff.fullName || 'ST').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <strong>{assigningStaff.fullName}</strong>
                  <p>{assigningStaff.email || 'No email registered'} • Emp ID: {assigningStaff.employeeId || 'N/A'}</p>
                  <small>Department: {assigningStaff.department || 'Not Assigned'}</small>
                </div>
              </div>

              {roles.length === 0 || designations.length === 0 ? (
                <div className="rbac-no-roles-notice">
                  <FiAlertCircle />
                  <div>
                    <strong>Prerequisites Missing</strong>
                    <p>Please create at least one Role and one Designation before assigning access to staff members.</p>
                  </div>
                </div>
              ) : null}

              <form onSubmit={handleSaveStaffAssignment}>
                <div className="rbac-modal-grid">
                  <div className="sa-field wide">
                    <label>Assigned Official Designation <b>*</b></label>
                    <select
                      required
                      value={selectedStaffDesignation}
                      onChange={(e) => setSelectedStaffDesignation(e.target.value)}
                    >
                      <option value="">Select Official Designation</option>
                      {designations.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} ({d.category} • {d.level})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sa-field wide">
                    <label>Assigned System Role & Permissions <b>*</b></label>
                    <select
                      required
                      value={selectedStaffRole}
                      onChange={(e) => setSelectedStaffRole(e.target.value)}
                    >
                      <option value="">Select System Role & Permissions</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.category} • {r.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sa-field wide">
                    <label>Access Security Scope <b>*</b></label>
                    <div className="rbac-scope-toggle-grid">
                      <label className={`rbac-scope-option ${selectedStaffScope === 'Department-scoped' ? 'is-selected' : ''}`}>
                        <input
                          type="radio"
                          name="staffScope"
                          value="Department-scoped"
                          checked={selectedStaffScope === 'Department-scoped'}
                          onChange={() => setSelectedStaffScope('Department-scoped')}
                        />
                        <div className="rbac-scope-info">
                          <strong>Department-scoped Access (Recommended)</strong>
                          <p>User can only view, edit, and manage records belonging to their assigned department.</p>
                        </div>
                      </label>

                      <label className={`rbac-scope-option ${selectedStaffScope === 'College-wide' ? 'is-selected' : ''}`}>
                        <input
                          type="radio"
                          name="staffScope"
                          value="College-wide"
                          checked={selectedStaffScope === 'College-wide'}
                          onChange={() => setSelectedStaffScope('College-wide')}
                        />
                        <div className="rbac-scope-info">
                          <strong>College-wide Access (Unrestricted)</strong>
                          <p>User has institutional permissions across all academic departments and branches.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <footer className="rbac-modal-footer">
                  <button type="button" className="sa-secondary" onClick={() => setIsAssignModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="sa-primary" disabled={roles.length === 0 || designations.length === 0}>
                    <FiCheck /> Confirm & Assign Access
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
