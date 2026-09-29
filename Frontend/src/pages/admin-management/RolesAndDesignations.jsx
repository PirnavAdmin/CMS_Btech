import { useState, useEffect, useMemo, Fragment } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import PageHeader from '../../components/PageHeader'
import ExportMenu from '../../components/ExportMenu'
import StatusBadge from '../../components/StatusBadge'
import { showSuccess, showError } from '../../utils/toast'
import facultyService, { normalizeFaculty } from '../../services/facultyService'
import academicService from '../../services/academicService'
import { roleApi } from '../../api/apiEndpoints'
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
  FiRotateCcw,
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

export const DEFAULT_SYSTEM_ROLES = [
  {
    id: '1',
    roleId: '1',
    name: 'Super Administrator',
    code: 'SUPER_ADMIN',
    category: 'Administrative',
    level: 'Level 1 (Highest Governance)',
    description: 'Complete unrestricted access across all college entities, master configurations, finance, and security settings.',
    status: 'Active',
    isSystem: true,
    userCount: 3,
    permissions: fullAccessPermissions(),
  },
  {
    id: '2',
    roleId: '2',
    name: 'Academic Dean / Director',
    code: 'ACADEMIC_DEAN',
    category: 'Academic',
    level: 'Level 2 (Executive Leadership)',
    description: 'Institution-wide academic curriculum planning, faculty workload oversight, course approvals, and student promotions.',
    status: 'Active',
    isSystem: true,
    userCount: 2,
    permissions: hodPresetPermissions(),
  },
  {
    id: '3',
    roleId: '3',
    name: 'Department Head (HOD)',
    code: 'HOD_ROLE',
    category: 'Academic',
    level: 'Level 3 (Department Leadership)',
    description: 'Departmental faculty management, subject-period timetables, syllabus coverage, and internal exam approvals.',
    status: 'Active',
    isSystem: true,
    userCount: 8,
    permissions: hodPresetPermissions(),
  },
  {
    id: '4',
    roleId: '4',
    name: 'Teaching Faculty / Professor',
    code: 'TEACHING_FACULTY',
    category: 'Academic',
    level: 'Level 4 (Academic Staff)',
    description: 'Subject-wise class attendance marking, internal assignment & lab evaluations, and student mentoring.',
    status: 'Active',
    isSystem: true,
    userCount: 45,
    permissions: facultyPresetPermissions(),
  },
  {
    id: '5',
    roleId: '5',
    name: 'Examination Controller',
    code: 'EXAM_CONTROLLER',
    category: 'Administrative',
    level: 'Level 2 (Executive Leadership)',
    description: 'Semester examination hall tickets, mid-term & end-term marks entry lock, and SGPA/CGPA result publishing.',
    status: 'Active',
    isSystem: false,
    userCount: 4,
    permissions: readOnlyPermissions(),
  },
  {
    id: '6',
    roleId: '6',
    name: 'Finance & Accounts Officer',
    code: 'FINANCE_OFFICER',
    category: 'Administrative',
    level: 'Level 3 (Department Leadership)',
    description: 'Student fee structure setup, dues tracking, challan verification, and staff payroll disbursal.',
    status: 'Active',
    isSystem: false,
    userCount: 5,
    permissions: readOnlyPermissions(),
  },
]

export const STANDARD_ROLE_TEMPLATES = [
  {
    name: 'Super Administrator',
    code: 'SUPER_ADMIN',
    category: 'Administrative',
    level: 'Level 1 (Highest Privileges)',
    description: 'Full unrestricted governance across all system configurations, security, faculty, and student records.',
    presetPerms: 'full',
  },
  {
    name: 'Academic Administrator',
    code: 'ACADEMIC_ADMIN',
    category: 'Academic',
    level: 'Level 2 (Executive Leadership)',
    description: 'Institution-wide academic curriculum planning, courses, branches, regulations, and semester approvals.',
    presetPerms: 'hod',
  },
  {
    name: 'Department Head (HOD)',
    code: 'HOD_ACCESS',
    category: 'Academic',
    level: 'Level 3 (Department Leadership)',
    description: 'Departmental faculty management, subject-period timetables, syllabus tracking, and internal exam approvals.',
    presetPerms: 'hod',
  },
  {
    name: 'Faculty Access',
    code: 'FACULTY_ACCESS',
    category: 'Academic',
    level: 'Level 4 (Academic Staff)',
    description: 'Subject teaching, daily student attendance marking, internal assignments & lab evaluations, and student mentoring.',
    presetPerms: 'faculty',
  },
  {
    name: 'Examination Controller',
    code: 'EXAM_CONTROLLER',
    category: 'Administrative',
    level: 'Level 2 (Executive Leadership)',
    description: 'Semester examination hall tickets, mid-term & end-term marks entry lock, and SGPA/CGPA result publishing.',
    presetPerms: 'read',
  },
  {
    name: 'Finance & Accounts Officer',
    code: 'FINANCE_OFFICER',
    category: 'Administrative',
    level: 'Level 3 (Department Leadership)',
    description: 'Student fee structure setup, dues tracking, fee receipts verification, and financial reporting.',
    presetPerms: 'read',
  },
  {
    name: 'Admissions Officer',
    code: 'ADMISSIONS_OFFICER',
    category: 'Administrative',
    level: 'Level 3 (Department Leadership)',
    description: 'Student enrollment, counseling, seat allocation, certificates verification, and branch allotting.',
    presetPerms: 'read',
  },
  {
    name: 'Training & Placement Officer (TPO)',
    code: 'TPO_OFFICER',
    category: 'Administrative',
    level: 'Level 3 (Department Leadership)',
    description: 'Campus placement drives, recruiter company relations, student placement eligibility, and internship records.',
    presetPerms: 'read',
  },
  {
    name: 'Librarian',
    code: 'LIBRARIAN',
    category: 'Administrative',
    level: 'Level 4 (Administrative Staff)',
    description: 'Library book cataloging, circulation, student issue/return records, and book overdue tracking.',
    presetPerms: 'read',
  },
  {
    name: 'Student Access',
    code: 'STUDENT_ACCESS',
    category: 'Student',
    level: 'Level 5 (End User)',
    description: 'Student self-service portal for viewing attendance, syllabus, internal marks, semester results, and dues.',
    presetPerms: 'read',
  },
]

export const generateCodeFromName = (name) => {
  if (!name) return ''
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export const validateRoleName = (name, currentRoleId, roleList = []) => {
  const trimmed = (name || '').trim()
  if (!trimmed) return 'Role Name is required.'
  if (trimmed.length < 3) return 'Role Name must be at least 3 characters long.'
  if (!/^[A-Za-z0-9\s&/\-_()]+$/.test(trimmed)) return 'Role Name can only contain letters, numbers, spaces, and & / - _ ( )'
  const duplicate = roleList.some((r) => String(r.id) !== String(currentRoleId) && (r.name || '').trim().toLowerCase() === trimmed.toLowerCase())
  if (duplicate) return 'A role with this name already exists.'
  return ''
}

export const validateRoleCode = (code, currentRoleId, roleList = []) => {
  const trimmed = (code || '').trim().toUpperCase()
  if (!trimmed) return 'Role Code is required.'
  if (trimmed.length < 2) return 'Role Code must be at least 2 characters long.'
  if (!/^[A-Z0-9_]+$/.test(trimmed)) return 'Role Code can only contain uppercase letters, numbers, and underscores.'
  const duplicate = roleList.some((r) => String(r.id) !== String(currentRoleId) && (r.code || '').trim().toUpperCase() === trimmed)
  if (duplicate) return 'A role with this code already exists.'
  return ''
}

export const validateDesTitle = (title, currentDesId, desList = []) => {
  const trimmed = (title || '').trim()
  if (!trimmed) return 'Designation Title is required.'
  if (trimmed.length < 3) return 'Designation Title must be at least 3 characters long.'
  const duplicate = desList.some((d) => String(d.id) !== String(currentDesId) && (d.title || '').trim().toLowerCase() === trimmed.toLowerCase())
  if (duplicate) return 'A designation with this title already exists.'
  return ''
}

export const validateDesCode = (code, currentDesId, desList = []) => {
  const trimmed = (code || '').trim().toUpperCase()
  if (!trimmed) return 'Designation Code is required.'
  if (trimmed.length < 2) return 'Designation Code must be at least 2 characters long.'
  if (!/^[A-Z0-9_]+$/.test(trimmed)) return 'Designation Code can only contain uppercase letters, numbers, and underscores.'
  const duplicate = desList.some((d) => String(d.id) !== String(currentDesId) && (d.code || '').trim().toUpperCase() === trimmed)
  if (duplicate) return 'A designation with this code already exists.'
  return ''
}

export const DEFAULT_DESIGNATIONS = [
  {
    id: '1',
    title: 'Professor & Head of Department (HOD)',
    code: 'PROF_HOD',
    category: 'Teaching',
    level: 'Band 1 (Leadership)',
    department: 'General / Shared',
    defaultRole: '3',
    status: 'Active',
  },
  {
    id: '2',
    title: 'Professor',
    code: 'PROF',
    category: 'Teaching',
    level: 'Band 2 (Senior Academic)',
    department: 'General / Shared',
    defaultRole: '4',
    status: 'Active',
  },
  {
    id: '3',
    title: 'Associate Professor',
    code: 'ASSOC_PROF',
    category: 'Teaching',
    level: 'Band 3 (Mid-level Academic)',
    department: 'General / Shared',
    defaultRole: '4',
    status: 'Active',
  },
  {
    id: '4',
    title: 'Assistant Professor',
    code: 'ASST_PROF',
    category: 'Teaching',
    level: 'Band 4 (Entry Academic)',
    department: 'General / Shared',
    defaultRole: '4',
    status: 'Active',
  },
  {
    id: '5',
    title: 'Lab Assistant / Instructor',
    code: 'LAB_ASST',
    category: 'Technical',
    level: 'Band 5 (Technical Staff)',
    department: 'General / Shared',
    defaultRole: '4',
    status: 'Active',
  },
  {
    id: '6',
    title: 'Administrative Officer',
    code: 'ADMIN_OFFICER',
    category: 'Administrative',
    level: 'Band 3 (Mid-level Academic)',
    department: 'General / Shared',
    defaultRole: '1',
    status: 'Active',
  },
]

export const DEFAULT_DEPARTMENTS = [
  { id: '1', name: 'Computer Science & Engineering', code: 'CSE' },
  { id: '2', name: 'Electronics & Communication', code: 'ECE' },
  { id: '3', name: 'Electrical & Electronics', code: 'EEE' },
  { id: '4', name: 'Mechanical Engineering', code: 'MECH' },
  { id: '5', name: 'Civil Engineering', code: 'CIVIL' },
  { id: '6', name: 'Information Technology', code: 'IT' },
  { id: '7', name: 'Administration', code: 'ADMIN' },
]

export const DEFAULT_STAFF_MEMBERS = [
  {
    id: '1',
    facultyId: '1',
    employeeId: 'EMP000001',
    fullName: 'Dr. Ramesh Sharma',
    email: 'ramesh.sharma@pirnav.edu',
    department: 'Computer Science & Engineering',
    departmentId: '1',
    designation: 'Professor & Head of Department (HOD)',
    employeeCategory: 'Teaching',
    status: 'Working',
  },
  {
    id: '2',
    facultyId: '2',
    employeeId: 'EMP000002',
    fullName: 'Dr. Priya Ananth',
    email: 'priya.ananth@pirnav.edu',
    department: 'Electronics & Communication',
    departmentId: '2',
    designation: 'Professor',
    employeeCategory: 'Teaching',
    status: 'Working',
  },
  {
    id: '3',
    facultyId: '3',
    employeeId: 'EMP000003',
    fullName: 'Dr. Suresh Kumar',
    email: 'suresh.kumar@pirnav.edu',
    department: 'Mechanical Engineering',
    departmentId: '3',
    designation: 'Associate Professor',
    employeeCategory: 'Teaching',
    status: 'Working',
  },
  {
    id: '4',
    facultyId: '4',
    employeeId: 'EMP000004',
    fullName: 'Ms. Anjali Verma',
    email: 'anjali.verma@pirnav.edu',
    department: 'Information Technology',
    departmentId: '4',
    designation: 'Assistant Professor',
    employeeCategory: 'Teaching',
    status: 'Working',
  },
  {
    id: '5',
    facultyId: '5',
    employeeId: 'EMP000005',
    fullName: 'Mr. Rajesh Patel',
    email: 'rajesh.patel@pirnav.edu',
    department: 'Computer Science & Engineering',
    departmentId: '1',
    designation: 'Lab Assistant / Instructor',
    employeeCategory: 'Technical',
    status: 'Working',
  },
  {
    id: '6',
    facultyId: '6',
    employeeId: 'EMP000006',
    fullName: 'Mr. Vikram Reddy',
    email: 'vikram.reddy@pirnav.edu',
    department: 'Administration',
    departmentId: '7',
    designation: 'Administrative Officer',
    employeeCategory: 'Administrative',
    status: 'Working',
  },
]

const STORAGE_KEY_ROLES = 'pirnav_erp_rbac_roles_clean_v1'
const STORAGE_KEY_DESIGNATIONS = 'pirnav_erp_rbac_designations_clean_v1'
const STORAGE_KEY_ASSIGNMENTS = 'pirnav_erp_rbac_assignments_clean_v1'

export default function RolesAndDesignations() {
  const [activeTab, setActiveTab] = useState('roles') // 'roles' | 'designations' | 'assignments'
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Real data state
  const [roles, setRoles] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROLES)
      const parsed = saved ? JSON.parse(saved) : []
      return Array.isArray(parsed) && parsed.length >= DEFAULT_SYSTEM_ROLES.length ? parsed : DEFAULT_SYSTEM_ROLES
    } catch {
      return DEFAULT_SYSTEM_ROLES
    }
  })

  const [designations, setDesignations] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DESIGNATIONS)
      const parsed = saved ? JSON.parse(saved) : []
      return Array.isArray(parsed) && parsed.length >= DEFAULT_DESIGNATIONS.length ? parsed : DEFAULT_DESIGNATIONS
    } catch {
      return DEFAULT_DESIGNATIONS
    }
  })

  const [assignments, setAssignments] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS)
      const parsed = saved ? JSON.parse(saved) : null
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return parsed
      }
      return {
        '1': { roleId: '3', designationId: '1', scope: 'Department: Computer Science & Engineering', scopeType: 'Department', scopeDepartmentName: 'Computer Science & Engineering' },
        '2': { roleId: '4', designationId: '2', scope: 'Department: Electronics & Communication', scopeType: 'Department', scopeDepartmentName: 'Electronics & Communication' },
        '3': { roleId: '4', designationId: '3', scope: 'Department: Mechanical Engineering', scopeType: 'Department', scopeDepartmentName: 'Mechanical Engineering' },
        '4': { roleId: '4', designationId: '4', scope: 'Department: Information Technology', scopeType: 'Department', scopeDepartmentName: 'Information Technology' },
        '5': { roleId: '4', designationId: '5', scope: 'Department: Computer Science & Engineering', scopeType: 'Department', scopeDepartmentName: 'Computer Science & Engineering' },
        '6': { roleId: '1', designationId: '6', scope: 'Institution-wide', scopeType: 'Institution-wide' },
      }
    } catch {
      return {}
    }
  })

  const [facultyList, setFacultyList] = useState(DEFAULT_STAFF_MEMBERS)
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS)
  const [isLoadingFaculty, setIsLoadingFaculty] = useState(false)
  const [rolesLoadError, setRolesLoadError] = useState('')

  // Modals state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [isSavingRole, setIsSavingRole] = useState(false)
  const [roleModalError, setRoleModalError] = useState('')
  const [isRoleCodeCustomized, setIsRoleCodeCustomized] = useState(false)
  const [roleFieldErrors, setRoleFieldErrors] = useState({})

  const [isDesModalOpen, setIsDesModalOpen] = useState(false)
  const [editingDesignation, setEditingDesignation] = useState(null)
  const [isDesCodeCustomized, setIsDesCodeCustomized] = useState(false)
  const [desFieldErrors, setDesFieldErrors] = useState({})

  const [isPermModalOpen, setIsPermModalOpen] = useState(false)
  const [editingPermissionsRole, setEditingPermissionsRole] = useState(null)
  const [isSavingPerms, setIsSavingPerms] = useState(false)
  const [permsModalError, setPermsModalError] = useState('')

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assigningStaff, setAssigningStaff] = useState(null)
  const [selectedStaffRole, setSelectedStaffRole] = useState('')
  const [selectedStaffDesignation, setSelectedStaffDesignation] = useState('')
  const [selectedStaffScopeType, setSelectedStaffScopeType] = useState('Department') // 'Institution-wide' | 'Department' | 'Self / Assigned Classes'
  const [selectedStaffScopeDept, setSelectedStaffScopeDept] = useState('')

  // Lavender Delete Confirmation Modal State
  const [deletingRole, setDeletingRole] = useState(null)
  const [isDeletingRole, setIsDeletingRole] = useState(false)
  const [roleDeleteError, setRoleDeleteError] = useState('')

  const [deletingDesignation, setDeletingDesignation] = useState(null)

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

  // Load real live faculty, departments, and roles from backend
  const loadRoles = async () => {
    setRolesLoadError('')
    try {
      const apiRoles = await roleApi.getAll()
      if (Array.isArray(apiRoles) && apiRoles.length > 0) {
        const normalized = apiRoles.map((r) => {
          const id = String(r.roleId ?? r.RoleId ?? r.id ?? r.Id ?? '')
          const name = r.roleName ?? r.RoleName ?? r.name ?? r.Name ?? ''
          const code = r.roleCode ?? r.RoleCode ?? r.code ?? r.Code ?? (name ? name.toUpperCase().replace(/\s+/g, '_') : '')
          let permissions = r.permissions ?? r.Permissions
          if (typeof permissions === 'string') {
            try { permissions = JSON.parse(permissions) } catch { permissions = null }
          }
          if (!permissions || typeof permissions !== 'object') {
            permissions = readOnlyPermissions()
          }
          return {
            id: id || `ROLE-${name.toUpperCase().replace(/\s+/g, '_')}`,
            roleId: id,
            name,
            code,
            category: r.category ?? r.Category ?? 'Academic',
            level: r.level ?? r.Level ?? 'Level 4 (Academic Staff)',
            description: r.description ?? r.Description ?? '',
            status: (r.status === 0 || r.status === 'Inactive' || r.status === false || r.isActive === false || r.IsActive === false) ? 'Inactive' : 'Active',
            isSystem: Boolean(r.isSystem ?? r.IsSystem),
            userCount: Number(r.userCount ?? r.UserCount ?? 0),
            permissions,
          }
        }).filter(r => r.name)

        if (normalized.length > 0) {
          setRoles(normalized)
          return
        }
      }
    } catch (err) {
      setRolesLoadError(err?.message || 'Failed to load roles from server.')
      console.warn('Backend roles API request failed:', err?.message || err)
    }
  }

  useEffect(() => {
    loadRoles()

    setIsLoadingFaculty(true)
    facultyService.list()
      .then((records) => {
        const normalized = (records || []).map(normalizeFaculty).filter(r => r.fullName)
        if (normalized.length > 0) {
          setFacultyList(normalized)
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingFaculty(false))

    academicService.getDepartments()
      .then((depts) => {
        if (Array.isArray(depts) && depts.length > 0) {
          setDepartments(depts)
        }
      })
      .catch(() => {})
  }, [])

  // Reset pagination on tab / search / filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, query, categoryFilter, pageSize])

  // Count helper: How many staff members have this role assigned
  const countStaffWithRole = (roleId) => {
    if (!roleId) return 0
    return facultyList.filter((staff) => {
      const assigned = assignments[staff.id]
      return String(assigned?.roleId) === String(roleId)
    }).length
  }

  // Count helper: How many staff members have this designation assigned
  const countStaffWithDesignation = (desId, desTitle) => {
    return facultyList.filter((staff) => {
      const assigned = assignments[staff.id]
      if (String(assigned?.designationId) === String(desId)) return true
      const staffDes = String(staff.designation || '').trim().toLowerCase()
      if (staffDes && desTitle && staffDes === desTitle.toLowerCase()) return true
      return false
    }).length
  }

  // ==========================================
  // 1. ROLES & PERMISSIONS HANDLERS
  // ==========================================
  const handleOpenCreateRole = () => {
    setRoleModalError('')
    setRoleFieldErrors({})
    setIsRoleCodeCustomized(false)
    setEditingRole({
      id: `ROLE-${String(Date.now()).slice(-4)}`,
      name: '',
      code: '',
      category: '',
      level: '',
      description: '',
      status: 'Active',
      isSystem: false,
      userCount: 0,
      permissions: readOnlyPermissions(),
    })
    setIsRoleModalOpen(true)
  }

  const handleOpenEditRole = (role) => {
    setRoleModalError('')
    setRoleFieldErrors({})
    setIsRoleCodeCustomized(true)
    setEditingRole({ ...role })
    setIsRoleModalOpen(true)
  }

  const handleRoleNameChange = (val) => {
    const nextName = val
    const autoCode = !isRoleCodeCustomized && !editingRole?.isSystem ? generateCodeFromName(nextName) : (editingRole?.code || '')
    setEditingRole((prev) => ({
      ...prev,
      name: nextName,
      code: autoCode,
    }))

    // Live validation
    const nameErr = validateRoleName(nextName, editingRole?.id, roles)
    const codeErr = validateRoleCode(autoCode, editingRole?.id, roles)
    setRoleFieldErrors((prev) => ({
      ...prev,
      name: nameErr,
      code: codeErr,
    }))
  }

  const handleRoleCodeChange = (val) => {
    const rawVal = val.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    setIsRoleCodeCustomized(true)
    setEditingRole((prev) => ({
      ...prev,
      code: rawVal,
    }))
    const codeErr = validateRoleCode(rawVal, editingRole?.id, roles)
    setRoleFieldErrors((prev) => ({ ...prev, code: codeErr }))
  }

  const handleResetRoleCodeToAuto = () => {
    const autoCode = generateCodeFromName(editingRole?.name || '')
    setIsRoleCodeCustomized(false)
    setEditingRole((prev) => ({
      ...prev,
      code: autoCode,
    }))
    const codeErr = validateRoleCode(autoCode, editingRole?.id, roles)
    setRoleFieldErrors((prev) => ({ ...prev, code: codeErr }))
  }

  const handleSelectRoleTemplate = (tmplName) => {
    if (!tmplName) return
    const tmpl = STANDARD_ROLE_TEMPLATES.find((t) => t.name === tmplName)
    if (!tmpl) return
    let perms = readOnlyPermissions()
    if (tmpl.presetPerms === 'full') perms = fullAccessPermissions()
    if (tmpl.presetPerms === 'hod') perms = hodPresetPermissions()
    if (tmpl.presetPerms === 'faculty') perms = facultyPresetPermissions()

    setIsRoleCodeCustomized(false)
    setEditingRole((prev) => ({
      ...prev,
      name: tmpl.name,
      code: tmpl.code,
      category: tmpl.category,
      level: tmpl.level,
      description: tmpl.description,
      status: 'Active',
      permissions: perms,
    }))
    setRoleFieldErrors({})
  }

  const handleSaveRole = async (e) => {
    e.preventDefault()
    setRoleModalError('')

    const nameErr = validateRoleName(editingRole.name, editingRole.id, roles)
    const codeErr = validateRoleCode(editingRole.code, editingRole.id, roles)
    const categoryErr = !editingRole.category ? 'Please select a category.' : ''
    const levelErr = !editingRole.level ? 'Please select a hierarchy level.' : ''
    const statusErr = !editingRole.status ? 'Please select a status.' : ''

    const newErrors = {
      name: nameErr,
      code: codeErr,
      category: categoryErr,
      level: levelErr,
      status: statusErr,
    }
    setRoleFieldErrors(newErrors)

    if (nameErr || codeErr || categoryErr || levelErr || statusErr) {
      const firstErr = nameErr || codeErr || categoryErr || levelErr || statusErr
      return showError(firstErr)
    }

    const normalizedCode = editingRole.code.trim().toUpperCase()
    const isBoolStatus = editingRole.status === 'Active' || editingRole.status === true || editingRole.status === 1
    const payload = {
      name: editingRole.name.trim(),
      roleName: editingRole.name.trim(),
      code: normalizedCode,
      roleCode: normalizedCode,
      category: editingRole.category,
      level: editingRole.level,
      description: editingRole.description || '',
      status: isBoolStatus,
      isActive: isBoolStatus,
      permissions: typeof editingRole.permissions === 'object' ? JSON.stringify(editingRole.permissions) : editingRole.permissions || '{}',
    }

    const isExistingNumeric = Number.isInteger(Number(editingRole.id)) && Number(editingRole.id) > 0
    let savedId = editingRole.id

    setIsSavingRole(true)
    try {
      if (isExistingNumeric) {
        await roleApi.update(editingRole.id, payload)
      } else {
        const created = await roleApi.create(payload)
        if (created?.roleId || created?.id || created?.data?.roleId || created?.data?.id) {
          savedId = String(created.roleId || created.id || created?.data?.roleId || created?.data?.id)
        }
      }

      // API succeeded -> Mutate state, notify, and close modal
      setRoles((current) => {
        const exists = current.some((r) => r.id === editingRole.id)
        const finalRole = { ...editingRole, id: savedId, roleId: savedId, code: normalizedCode }
        if (exists) {
          return current.map((r) => (r.id === editingRole.id ? finalRole : r))
        }
        return [...current, finalRole]
      })

      showSuccess(`Role "${editingRole.name}" saved successfully.`)
      setIsRoleModalOpen(false)
    } catch (err) {
      // API FAILED -> Keep modal open, do not mutate state, show proper error message, allow retry
      const errMsg = err?.message || 'Server failed to save role. Please check connection and retry.'
      setRoleModalError(errMsg)
      showError(errMsg)
    } finally {
      setIsSavingRole(false)
    }
  }

  const handleDeleteRole = (role) => {
    setRoleDeleteError('')
    if (role.isSystem) return showError('System default roles cannot be deleted.')
    const assignedStaffCount = countStaffWithRole(role.id)
    if (assignedStaffCount > 0) {
      return showError(`Cannot delete role "${role.name}" because it is currently assigned to ${assignedStaffCount} staff member(s). Reassign them first.`)
    }
    setDeletingRole(role)
  }

  const handleConfirmDeleteRole = async () => {
    if (!deletingRole) return
    if (deletingRole.isSystem) {
      setDeletingRole(null)
      return showError('System default roles cannot be deleted.')
    }

    const assignedStaffCount = countStaffWithRole(deletingRole.id)
    if (assignedStaffCount > 0) {
      setRoleDeleteError(`Cannot delete "${deletingRole.name}" because ${assignedStaffCount} staff member(s) are actively assigned to it.`)
      return showError(`Cannot delete "${deletingRole.name}" because it is currently assigned to ${assignedStaffCount} staff member(s).`)
    }

    const isNumeric = Number.isInteger(Number(deletingRole.id)) && Number(deletingRole.id) > 0
    setIsDeletingRole(true)
    try {
      if (isNumeric) {
        await roleApi.delete(deletingRole.id)
      }

      // API Succeeded -> Update state, show success, close modal
      setRoles((current) => current.filter((r) => r.id !== deletingRole.id))
      showSuccess(`Role "${deletingRole.name}" deleted successfully.`)
      setDeletingRole(null)
    } catch (err) {
      // API Failed -> Keep modal open, do not remove from UI, display error
      const errMsg = err?.message || 'Failed to delete role on server.'
      setRoleDeleteError(errMsg)
      showError(errMsg)
    } finally {
      setIsDeletingRole(false)
    }
  }

  // Permissions Matrix Handlers
  const handleOpenPermissions = (role) => {
    setPermsModalError('')
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
            // If Create, Edit, Delete, or Export is enabled, View must automatically be enabled
            ...(nextVal && actionId !== 'view' ? { view: true } : {}),
            // If View is disabled, all dependent permissions must automatically be disabled
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

  const handleSavePermissions = async () => {
    setPermsModalError('')
    const isBoolStatus = editingPermissionsRole.status === 'Active' || editingPermissionsRole.status === true || editingPermissionsRole.status === 1
    const payload = {
      name: editingPermissionsRole.name,
      roleName: editingPermissionsRole.name,
      code: editingPermissionsRole.code,
      roleCode: editingPermissionsRole.code,
      category: editingPermissionsRole.category,
      level: editingPermissionsRole.level,
      description: editingPermissionsRole.description || '',
      status: isBoolStatus,
      isActive: isBoolStatus,
      permissions: typeof editingPermissionsRole.permissions === 'object' ? JSON.stringify(editingPermissionsRole.permissions) : editingPermissionsRole.permissions || '{}',
    }
    const isExistingNumeric = Number.isInteger(Number(editingPermissionsRole.id)) && Number(editingPermissionsRole.id) > 0

    setIsSavingPerms(true)
    try {
      if (isExistingNumeric) {
        await roleApi.update(editingPermissionsRole.id, payload)
      } else {
        await roleApi.create(payload)
      }

      // API Succeeded -> Update state, notify, close modal
      setRoles((current) => current.map((r) => (r.id === editingPermissionsRole.id ? editingPermissionsRole : r)))
      showSuccess(`Access permissions updated for role "${editingPermissionsRole.name}".`)
      setIsPermModalOpen(false)
    } catch (err) {
      // API Failed -> Keep modal open, show error message, allow retry
      const errMsg = err?.message || 'Failed to save permissions on server. Please retry.'
      setPermsModalError(errMsg)
      showError(errMsg)
    } finally {
      setIsSavingPerms(false)
    }
  }

  // ==========================================
  // 2. DESIGNATIONS HANDLERS
  // ==========================================
  const handleOpenCreateDesignation = () => {
    setDesFieldErrors({})
    setIsDesCodeCustomized(false)
    setEditingDesignation({
      id: `DES-${String(Date.now()).slice(-4)}`,
      title: '',
      code: '',
      category: '',
      level: '',
      department: 'General / Shared',
      defaultRole: '',
      status: 'Active',
    })
    setIsDesModalOpen(true)
  }

  const handleOpenEditDesignation = (des) => {
    setDesFieldErrors({})
    setIsDesCodeCustomized(true)
    setEditingDesignation({ ...des })
    setIsDesModalOpen(true)
  }

  const handleDesTitleChange = (val) => {
    const nextTitle = val
    const autoCode = !isDesCodeCustomized ? generateCodeFromName(nextTitle) : (editingDesignation?.code || '')
    setEditingDesignation((prev) => ({
      ...prev,
      title: nextTitle,
      code: autoCode,
    }))

    const titleErr = validateDesTitle(nextTitle, editingDesignation?.id, designations)
    const codeErr = validateDesCode(autoCode, editingDesignation?.id, designations)
    setDesFieldErrors((prev) => ({
      ...prev,
      title: titleErr,
      code: codeErr,
    }))
  }

  const handleDesCodeChange = (val) => {
    const rawVal = val.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    setIsDesCodeCustomized(true)
    setEditingDesignation((prev) => ({
      ...prev,
      code: rawVal,
    }))
    const codeErr = validateDesCode(rawVal, editingDesignation?.id, designations)
    setDesFieldErrors((prev) => ({ ...prev, code: codeErr }))
  }

  const handleResetDesCodeToAuto = () => {
    const autoCode = generateCodeFromName(editingDesignation?.title || '')
    setIsDesCodeCustomized(false)
    setEditingDesignation((prev) => ({
      ...prev,
      code: autoCode,
    }))
    const codeErr = validateDesCode(autoCode, editingDesignation?.id, designations)
    setDesFieldErrors((prev) => ({ ...prev, code: codeErr }))
  }

  const handleSaveDesignation = (e) => {
    e.preventDefault()

    const titleErr = validateDesTitle(editingDesignation.title, editingDesignation.id, designations)
    const codeErr = validateDesCode(editingDesignation.code, editingDesignation.id, designations)
    const categoryErr = !editingDesignation.category ? 'Please select a staff category.' : ''
    const levelErr = !editingDesignation.level ? 'Please select a hierarchy level band.' : ''
    const statusErr = !editingDesignation.status ? 'Please select a status.' : ''

    const newErrors = {
      title: titleErr,
      code: codeErr,
      category: categoryErr,
      level: levelErr,
      status: statusErr,
    }
    setDesFieldErrors(newErrors)

    if (titleErr || codeErr || categoryErr || levelErr || statusErr) {
      const firstErr = titleErr || codeErr || categoryErr || levelErr || statusErr
      return showError(firstErr)
    }

    const normalizedCode = editingDesignation.code.trim().toUpperCase()

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
    const assignedStaffCount = countStaffWithDesignation(des.id, des.title)
    if (assignedStaffCount > 0) {
      return showError(`Cannot delete designation "${des.title}" because it is currently assigned to ${assignedStaffCount} staff member(s). Reassign them first.`)
    }
    setDeletingDesignation(des)
  }

  const handleConfirmDeleteDesignation = () => {
    if (!deletingDesignation) return
    const assignedStaffCount = countStaffWithDesignation(deletingDesignation.id, deletingDesignation.title)
    if (assignedStaffCount > 0) {
      return showError(`Cannot delete designation "${deletingDesignation.title}" because it is assigned to ${assignedStaffCount} staff member(s).`)
    }

    setDesignations((current) => current.filter((d) => d.id !== deletingDesignation.id))
    showSuccess(`Designation "${deletingDesignation.title}" deleted successfully.`)
    setDeletingDesignation(null)
  }

  // ==========================================
  // 3. STAFF ACCESS ASSIGNMENT HANDLERS
  // ==========================================
  const handleOpenAssignStaff = (staff) => {
    setAssigningStaff(staff)
    const assigned = assignments[staff.id]

    const staffDesText = String(staff.designation || '').trim().toLowerCase()
    const matchedDes = designations.find((d) =>
      (staffDesText && d.title.toLowerCase().includes(staffDesText)) ||
      (staffDesText && d.code.toLowerCase() === staffDesText)
    ) || designations[0]

    const initialDesId = assigned?.designationId || matchedDes?.id || (designations[0]?.id || '')
    const selectedDesObj = designations.find((d) => d.id === initialDesId) || matchedDes
    const initialRoleId = assigned?.roleId || selectedDesObj?.defaultRole || (roles[0]?.id || '')

    setSelectedStaffDesignation(initialDesId)
    setSelectedStaffRole(initialRoleId)

    // Scope resolution
    if (assigned?.scopeType) {
      setSelectedStaffScopeType(assigned.scopeType)
      setSelectedStaffScopeDept(assigned.scopeDepartmentId || assigned.scopeDepartmentName || staff.department || '')
    } else if (assigned?.scope?.startsWith('Department')) {
      setSelectedStaffScopeType('Department')
      setSelectedStaffScopeDept(assigned.scopeDepartmentId || staff.department || '')
    } else if (assigned?.scope === 'Institution-wide' || assigned?.scope === 'College-wide') {
      setSelectedStaffScopeType('Institution-wide')
      setSelectedStaffScopeDept('')
    } else if (assigned?.scope === 'Self / Assigned Classes') {
      setSelectedStaffScopeType('Self / Assigned Classes')
      setSelectedStaffScopeDept('')
    } else {
      setSelectedStaffScopeType('Department')
      setSelectedStaffScopeDept(staff.departmentId || staff.department || (departments[0]?.id || departments[0]?.name || ''))
    }

    setIsAssignModalOpen(true)
  }

  const handleDesignationSelect = (desId) => {
    setSelectedStaffDesignation(desId)
    const desObj = designations.find((d) => d.id === desId)
    if (desObj?.defaultRole && roles.some((r) => r.id === desObj.defaultRole)) {
      setSelectedStaffRole(desObj.defaultRole)
    }
  }

  const handleSaveStaffAssignment = (e) => {
    e.preventDefault()
    if (!assigningStaff) return
    if (!selectedStaffDesignation) return showError('Please select an official designation.')
    if (!selectedStaffRole) return showError('Please select a system access role.')
    if (!selectedStaffScopeType) return showError('Please select an access scope.')

    let formattedScope = selectedStaffScopeType
    let selectedDeptObj = null
    if (selectedStaffScopeType === 'Department') {
      selectedDeptObj = departments.find(d => String(d.id) === String(selectedStaffScopeDept) || d.name === selectedStaffScopeDept)
      const deptName = selectedDeptObj?.name || selectedStaffScopeDept || assigningStaff.department || 'Department'
      formattedScope = `Department: ${deptName}`
    }

    setAssignments((prev) => ({
      ...prev,
      [assigningStaff.id]: {
        roleId: selectedStaffRole,
        designationId: selectedStaffDesignation,
        scope: formattedScope,
        scopeType: selectedStaffScopeType,
        scopeDepartmentId: selectedDeptObj?.id || selectedStaffScopeDept || '',
        scopeDepartmentName: selectedDeptObj?.name || selectedStaffScopeDept || '',
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
  const exportColumns = activeTab === 'roles' ? [
    { label: 'System Access Role', value: 'name' },
    { label: 'Description', value: 'description' },
    { label: 'Role Code', value: 'code' },
    { label: 'Category', value: 'category' },
    { label: 'Hierarchy Level', value: 'level' },
    { label: 'Status', value: 'status' },
  ] : activeTab === 'designations' ? [
    { label: 'Designation', value: 'title' },
    { label: 'Code', value: 'code' },
    { label: 'Category', value: 'category' },
    { label: 'Level', value: 'level' },
    { label: 'Department', value: row => row.department || 'All Departments' },
    { label: 'Status', value: 'status' },
  ] : [
    { label: 'Staff Name', value: 'fullName' },
    { label: 'Email', value: 'email' },
    { label: 'Employee ID', value: 'employeeId' },
    { label: 'Department', value: 'department' },
    { label: 'Designation', value: row => row.currentDesignation?.title || 'Not Assigned' },
    { label: 'Role', value: row => row.currentRole?.name || 'Not Assigned' },
    { label: 'Scope', value: row => row.isExplicitlyAssigned ? row.scope : 'Default Scope' },
  ]
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

  // Correct ASSIGNED count: represents actual explicitly assigned staff records
  const assignedCount = useMemo(() => {
    return staffAssignmentRows.filter((s) => s.isExplicitlyAssigned || Boolean(s.currentRole)).length
  }, [staffAssignmentRows])

  const compactSummaryItems = useMemo(() => {
    return [
      { label: 'ROLES', value: roles.length, tone: 'default' },
      { label: 'DESIGNATIONS', value: designations.length, tone: 'default' },
      { label: 'ASSIGNED', value: assignedCount, tone: 'active' },
      { label: 'STAFF', value: facultyList.length, tone: 'default' },
    ]
  }, [roles.length, designations.length, assignedCount, facultyList.length])

  // Recommended role for currently selected designation in assignment modal
  const recommendedRoleForSelectedDes = useMemo(() => {
    const desObj = designations.find((d) => d.id === selectedStaffDesignation)
    if (!desObj?.defaultRole) return null
    return roles.find((r) => r.id === desObj.defaultRole) || null
  }, [designations, selectedStaffDesignation, roles])

  return (
    <DashboardLayout>
      <div className="rbac-page">
        {/* Page Header with Top-Right Compact Summary */}
        <PageHeader
          title="Roles & Designations Management"
          subtitle="Define organizational hierarchy, configure granular RBAC permission matrix across all modules, and govern staff access."
          compactSummary={compactSummaryItems}
        />

        {rolesLoadError && (
          <div className="rbac-load-error-strip" role="alert">
            <span>
              <FiAlertCircle /> Server Notice: {rolesLoadError}
            </span>
            <button type="button" onClick={loadRoles}>
              <FiRotateCcw /> Retry Server Sync
            </button>
          </div>
        )}

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
                <FiShield /> Roles & Permissions <span className="rbac-tab-count">{roles.length}</span>
              </button>
              <button
                type="button"
                className={`rbac-tab-btn ${activeTab === 'designations' ? 'is-active' : ''}`}
                onClick={() => { setActiveTab('designations'); setQuery(''); setCategoryFilter('') }}
              >
                <FiAward /> Designations <span className="rbac-tab-count">{designations.length}</span>
              </button>
              <button
                type="button"
                className={`rbac-tab-btn ${activeTab === 'assignments' ? 'is-active' : ''}`}
                onClick={() => { setActiveTab('assignments'); setQuery(''); setCategoryFilter('') }}
              >
                <FiUserCheck /> Staff Access <span className="rbac-tab-count">{staffAssignmentRows.length}</span>
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
                aria-label={activeTab === 'roles' ? 'Search system roles' : activeTab === 'designations' ? 'Search designations' : 'Search staff'}
                placeholder={activeTab === 'roles' ? 'Search system roles by name, code, description...' : activeTab === 'designations' ? 'Search designations by title, code...' : 'Search staff by name, employee ID, department...'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button type="button" className="rbac-clear-search" aria-label="Clear search" onClick={() => setQuery('')}>
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
                rows={activeDataset}
                columns={exportColumns}
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
                    <th style={{ minWidth: '240px' }}>System Access Role</th>
                    <th style={{ minWidth: '120px' }}>Role Code</th>
                    <th style={{ minWidth: '120px' }}>Category</th>
                    <th style={{ minWidth: '170px' }}>Hierarchy Level</th>
                    <th style={{ minWidth: '160px' }}>Permission Matrix</th>
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
                              title="Configure Permissions"
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
                          <p>Click "Create New Role" above to define system access profiles.</p>
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
                    <th style={{ minWidth: '240px' }}>Official Designation</th>
                    <th style={{ minWidth: '110px' }}>Code</th>
                    <th style={{ minWidth: '130px' }}>Category</th>
                    <th style={{ minWidth: '160px' }}>Hierarchy Band</th>
                    <th style={{ minWidth: '180px' }}>Applicable Department</th>
                    <th style={{ minWidth: '180px' }}>Default / Recommended Role</th>
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
                            <div className="rbac-role-preview-pill" title="Recommended system access role">
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
          {/* TAB 3: STAFF ACCESS ASSIGNMENTS TABLE */}
          {/* ============================================================== */}
          {activeTab === 'assignments' && (
            <div className="sa-table-wrap rbac-table-wrap">
              <table className="rbac-data-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '240px' }}>Academic Staff Member</th>
                    <th style={{ minWidth: '120px' }}>Employee ID</th>
                    <th style={{ minWidth: '170px' }}>Department</th>
                    <th style={{ minWidth: '160px' }}>Official Designation</th>
                    <th style={{ minWidth: '180px' }}>System Access Role</th>
                    <th style={{ minWidth: '160px' }}>Access Scope</th>
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
                          <FiUserCheck /> Assign Access
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
        {/* ============================================================== */}
        {/* MODAL 1: CREATE / EDIT ROLE */}
        {/* ============================================================== */}
        {isRoleModalOpen && editingRole && (
          <div className="rbac-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !isSavingRole && setIsRoleModalOpen(false)}>
            <div className="rbac-modal-window">
              <button type="button" className="rbac-modal-close" disabled={isSavingRole} onClick={() => setIsRoleModalOpen(false)}>
                <FiX />
              </button>

              <div className="rbac-modal-header">
                <span className="cm-eyebrow">SYSTEM ACCESS CONTROL</span>
                <h2>{editingRole.isSystem ? 'Edit System Role' : editingRole.id && !editingRole.id.startsWith('ROLE-') ? 'Edit Access Role' : 'Create Access Role'}</h2>
                <p>A Role represents system application access and permissions, distinct from employee job titles.</p>
              </div>

              {roleModalError && (
                <div className="rbac-modal-error-banner" role="alert">
                  <FiAlertCircle />
                  <span>{roleModalError}</span>
                </div>
              )}

              {!editingRole.isSystem && (
                <div className="rbac-template-banner">
                  <div className="rbac-template-header">
                    <FiShield />
                    <div>
                      <strong>Quick Select Standard Role Template</strong>
                      <p>Pick a predefined college access role to auto-populate settings, or customize from scratch.</p>
                    </div>
                  </div>
                  <select
                    className="rbac-template-select"
                    onChange={(e) => handleSelectRoleTemplate(e.target.value)}
                    defaultValue=""
                  >
                    <option value="">-- Choose Standard Role Preset (e.g. HOD, Faculty, Exam Controller) --</option>
                    {STANDARD_ROLE_TEMPLATES.map((tmpl) => (
                      <option key={tmpl.code} value={tmpl.name}>
                        {tmpl.name} ({tmpl.code}) • {tmpl.category} • {tmpl.level}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <form onSubmit={handleSaveRole}>
                <div className="rbac-modal-grid">
                  <div className={`sa-field ${roleFieldErrors.name ? 'has-error' : ''}`}>
                    <label>Role Name <b>*</b></label>
                    <input
                      type="text"
                      required
                      value={editingRole.name}
                      onChange={(e) => handleRoleNameChange(e.target.value)}
                      placeholder="e.g. Academic Administrator"
                    />
                    {roleFieldErrors.name && (
                      <span className="rbac-field-error">
                        <FiAlertCircle /> {roleFieldErrors.name}
                      </span>
                    )}
                  </div>

                  <div className={`sa-field ${roleFieldErrors.code ? 'has-error' : ''}`}>
                    <div className="rbac-field-label-row">
                      <label>Role Code <b>*</b></label>
                      {!editingRole.isSystem && (
                        <span className={`rbac-code-badge-hint ${isRoleCodeCustomized ? 'is-custom' : 'is-auto'}`}>
                          {isRoleCodeCustomized ? (
                            <>
                              Manual Edit Active •{' '}
                              <button type="button" onClick={handleResetRoleCodeToAuto}>
                                Reset to Auto
                              </button>
                            </>
                          ) : (
                            '✨ Auto-generating'
                          )}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={editingRole.code}
                      onChange={(e) => handleRoleCodeChange(e.target.value)}
                      placeholder="e.g. ACADEMIC_ADMIN"
                      disabled={editingRole.isSystem}
                    />
                    {roleFieldErrors.code && (
                      <span className="rbac-field-error">
                        <FiAlertCircle /> {roleFieldErrors.code}
                      </span>
                    )}
                    {!roleFieldErrors.code && (
                      <span className="rbac-field-tip">
                        Unique key used in backend authorizations (e.g. ACADEMIC_ADMIN).
                      </span>
                    )}
                  </div>

                  <div className={`sa-field ${roleFieldErrors.category ? 'has-error' : ''}`}>
                    <label>Category <b>*</b></label>
                    <select
                      required
                      value={editingRole.category}
                      onChange={(e) => {
                        setEditingRole({ ...editingRole, category: e.target.value })
                        setRoleFieldErrors((prev) => ({ ...prev, category: '' }))
                      }}
                    >
                      <option value="">Select Category</option>
                      <option value="Academic">Academic</option>
                      <option value="Administrative">Administrative</option>
                      <option value="System">System</option>
                      <option value="Student">Student</option>
                    </select>
                    {roleFieldErrors.category && (
                      <span className="rbac-field-error">
                        <FiAlertCircle /> {roleFieldErrors.category}
                      </span>
                    )}
                  </div>

                  <div className={`sa-field ${roleFieldErrors.level ? 'has-error' : ''}`}>
                    <label>Hierarchy Level <b>*</b></label>
                    <select
                      required
                      value={editingRole.level}
                      onChange={(e) => {
                        setEditingRole({ ...editingRole, level: e.target.value })
                        setRoleFieldErrors((prev) => ({ ...prev, level: '' }))
                      }}
                    >
                      <option value="">Select Hierarchy Level</option>
                      <option value="Level 1 (Highest Privileges)">Level 1 (Highest Privileges)</option>
                      <option value="Level 2 (Executive Leadership)">Level 2 (Executive Leadership)</option>
                      <option value="Level 3 (Department Leadership)">Level 3 (Department Leadership)</option>
                      <option value="Level 4 (Academic Staff)">Level 4 (Academic Staff)</option>
                      <option value="Level 4 (Administrative Staff)">Level 4 (Administrative Staff)</option>
                      <option value="Level 5 (End User)">Level 5 (End User)</option>
                    </select>
                    {roleFieldErrors.level && (
                      <span className="rbac-field-error">
                        <FiAlertCircle /> {roleFieldErrors.level}
                      </span>
                    )}
                  </div>

                  <div className="sa-field wide">
                    <label>Role Description</label>
                    <textarea
                      rows={3}
                      value={editingRole.description}
                      onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                      placeholder="Brief summary of duties and permissions for this access role..."
                    />
                  </div>

                  <div className={`sa-field ${roleFieldErrors.status ? 'has-error' : ''}`}>
                    <label>Status <b>*</b></label>
                    <select
                      required
                      value={editingRole.status}
                      onChange={(e) => {
                        setEditingRole({ ...editingRole, status: e.target.value })
                        setRoleFieldErrors((prev) => ({ ...prev, status: '' }))
                      }}
                    >
                      <option value="">Select Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    {roleFieldErrors.status && (
                      <span className="rbac-field-error">
                        <FiAlertCircle /> {roleFieldErrors.status}
                      </span>
                    )}
                  </div>
                </div>

                <footer className="rbac-modal-footer">
                  <button type="button" className="sa-secondary" disabled={isSavingRole} onClick={() => setIsRoleModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="sa-primary" disabled={isSavingRole}>
                    <FiCheck /> {isSavingRole ? 'Saving Role…' : 'Save Role Profile'}
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
                <span className="cm-eyebrow">ORGANIZATIONAL JOB TITLE</span>
                <h2>{editingDesignation.id && !editingDesignation.id.startsWith('DES-') ? 'Edit Designation' : 'Add Designation'}</h2>
                <p>A Designation is an employment job title. It can suggest a default access role that admins can override.</p>
              </div>

              <form onSubmit={handleSaveDesignation}>
                <div className="rbac-modal-grid">
                  <div className={`sa-field ${desFieldErrors.title ? 'has-error' : ''}`}>
                    <label>Designation Title <b>*</b></label>
                    <input
                      type="text"
                      required
                      value={editingDesignation.title}
                      onChange={(e) => handleDesTitleChange(e.target.value)}
                      placeholder="e.g. Associate Professor"
                    />
                    {desFieldErrors.title && (
                      <span className="rbac-field-error">
                        <FiAlertCircle /> {desFieldErrors.title}
                      </span>
                    )}
                  </div>

                  <div className={`sa-field ${desFieldErrors.code ? 'has-error' : ''}`}>
                    <div className="rbac-field-label-row">
                      <label>Designation Code <b>*</b></label>
                      <span className={`rbac-code-badge-hint ${isDesCodeCustomized ? 'is-custom' : 'is-auto'}`}>
                        {isDesCodeCustomized ? (
                          <>
                            Manual Edit Active •{' '}
                            <button type="button" onClick={handleResetDesCodeToAuto}>
                              Reset to Auto
                            </button>
                          </>
                        ) : (
                          '✨ Auto-generating'
                        )}
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      value={editingDesignation.code}
                      onChange={(e) => handleDesCodeChange(e.target.value)}
                      placeholder="e.g. ASSOC_PROF"
                    />
                    {desFieldErrors.code && (
                      <span className="rbac-field-error">
                        <FiAlertCircle /> {desFieldErrors.code}
                      </span>
                    )}
                    {!desFieldErrors.code && (
                      <span className="rbac-field-tip">
                        Designation identifier code (e.g. ASSOC_PROF).
                      </span>
                    )}
                  </div>

                  <div className={`sa-field ${desFieldErrors.category ? 'has-error' : ''}`}>
                    <label>Staff Category <b>*</b></label>
                    <select
                      required
                      value={editingDesignation.category}
                      onChange={(e) => {
                        setEditingDesignation({ ...editingDesignation, category: e.target.value })
                        setDesFieldErrors((prev) => ({ ...prev, category: '' }))
                      }}
                    >
                      <option value="">Select Staff Category</option>
                      <option value="Teaching">Teaching Faculty</option>
                      <option value="Non-Teaching">Non-Teaching / Administrative Staff</option>
                    </select>
                    {desFieldErrors.category && (
                      <span className="rbac-field-error">
                        <FiAlertCircle /> {desFieldErrors.category}
                      </span>
                    )}
                  </div>

                  <div className={`sa-field ${desFieldErrors.level ? 'has-error' : ''}`}>
                    <label>Hierarchy Level Band <b>*</b></label>
                    <select
                      required
                      value={editingDesignation.level}
                      onChange={(e) => {
                        setEditingDesignation({ ...editingDesignation, level: e.target.value })
                        setDesFieldErrors((prev) => ({ ...prev, level: '' }))
                      }}
                    >
                      <option value="">Select Hierarchy Level Band</option>
                      <option value="Band 1 (Executive)">Band 1 (Executive / Dean / Principal)</option>
                      <option value="Band 2 (Senior Academic)">Band 2 (Senior Academic / Professor / HOD)</option>
                      <option value="Band 3 (Faculty)">Band 3 (Faculty / Associate / Assistant Prof)</option>
                      <option value="Band 4 (Technical Support)">Band 4 (Technical Support / Lab Incharge)</option>
                      <option value="Band 4 (Administrative Support)">Band 4 (Administrative Support / Accounts)</option>
                      <option value="Band 5 (Auxiliary Support)">Band 5 (Auxiliary Support / Clerk)</option>
                    </select>
                    {desFieldErrors.level && (
                      <span className="rbac-field-error">
                        <FiAlertCircle /> {desFieldErrors.level}
                      </span>
                    )}
                  </div>

                  <div className="sa-field">
                    <label>Applicable Department</label>
                    <select
                      value={editingDesignation.department}
                      onChange={(e) => setEditingDesignation({ ...editingDesignation, department: e.target.value })}
                    >
                      <option value="General / Shared">General / All Departments</option>
                      {departments.map((dept) => (
                        <option key={dept.id || dept.name} value={dept.name}>
                          {dept.name} {dept.code ? `(${dept.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sa-field">
                    <label>Default / Recommended Role</label>
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
                    <small style={{ color: '#64748B', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      Recommended access profile. Can be overridden during staff access assignment.
                    </small>
                  </div>

                  <div className={`sa-field ${desFieldErrors.status ? 'has-error' : ''}`}>
                    <label>Status <b>*</b></label>
                    <select
                      required
                      value={editingDesignation.status}
                      onChange={(e) => {
                        setEditingDesignation({ ...editingDesignation, status: e.target.value })
                        setDesFieldErrors((prev) => ({ ...prev, status: '' }))
                      }}
                    >
                      <option value="">Select Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    {desFieldErrors.status && (
                      <span className="rbac-field-error">
                        <FiAlertCircle /> {desFieldErrors.status}
                      </span>
                    )}
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
        {/* MODAL 3: GRANULAR PERMISSIONS MATRIX */}
        {/* ============================================================== */}
        {isPermModalOpen && editingPermissionsRole && (
          <div className="rbac-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !isSavingPerms && setIsPermModalOpen(false)}>
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

                <button type="button" className="rbac-modal-close" disabled={isSavingPerms} onClick={() => setIsPermModalOpen(false)}>
                  <FiX />
                </button>
              </div>

              {permsModalError && (
                <div className="rbac-modal-error-banner" style={{ margin: '10px 16px 0' }} role="alert">
                  <FiAlertCircle />
                  <span>{permsModalError}</span>
                </div>
              )}

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
                  <button type="button" className="sa-secondary rbac-btn-cancel" disabled={isSavingPerms} onClick={() => setIsPermModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="sa-primary rbac-btn-save-matrix" disabled={isSavingPerms} onClick={handleSavePermissions}>
                    <FiCheck /> {isSavingPerms ? 'Saving Matrix…' : 'Save & Apply Permission Matrix'}
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
                <span className="cm-eyebrow">STAFF ACCESS GOVERNANCE</span>
                <h2>Staff Access Assignment</h2>
                <p>Authorize job designation, system access role, and departmental boundary for staff.</p>
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
                    <p>Please configure at least one Role and one Designation before assigning access to staff members.</p>
                  </div>
                </div>
              ) : null}

              <form onSubmit={handleSaveStaffAssignment}>
                <div className="rbac-modal-grid">
                  <div className="sa-field wide">
                    <label>Official Designation (Job Title) <b>*</b></label>
                    <select
                      required
                      value={selectedStaffDesignation}
                      onChange={(e) => handleDesignationSelect(e.target.value)}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ margin: 0 }}>System Access Role (Permissions) <b>*</b></label>
                      {recommendedRoleForSelectedDes && (
                        <span style={{ fontSize: '11px', color: '#756FB2', fontWeight: 600 }}>
                          Recommended: {recommendedRoleForSelectedDes.name}
                        </span>
                      )}
                    </div>
                    <select
                      required
                      value={selectedStaffRole}
                      onChange={(e) => setSelectedStaffRole(e.target.value)}
                    >
                      <option value="">Select System Access Role</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.category} • {r.code})
                        </option>
                      ))}
                    </select>
                    <small style={{ color: '#64748B', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      System roles grant granular module permissions regardless of employee title.
                    </small>
                  </div>

                  <div className="sa-field wide">
                    <label>Access Scope <b>*</b></label>
                    <div className="rbac-scope-toggle-grid">
                      <label className={`rbac-scope-option ${selectedStaffScopeType === 'Institution-wide' ? 'is-selected' : ''}`}>
                        <input
                          type="radio"
                          name="staffScopeType"
                          value="Institution-wide"
                          checked={selectedStaffScopeType === 'Institution-wide'}
                          onChange={() => setSelectedStaffScopeType('Institution-wide')}
                        />
                        <div className="rbac-scope-info">
                          <strong>Institution-wide Scope (Unrestricted)</strong>
                          <p>Permissions apply campus-wide across all departments, courses, and academic units.</p>
                        </div>
                      </label>

                      <label className={`rbac-scope-option ${selectedStaffScopeType === 'Department' ? 'is-selected' : ''}`}>
                        <input
                          type="radio"
                          name="staffScopeType"
                          value="Department"
                          checked={selectedStaffScopeType === 'Department'}
                          onChange={() => setSelectedStaffScopeType('Department')}
                        />
                        <div className="rbac-scope-info">
                          <strong>Department-scoped Access (Standard)</strong>
                          <p>Permissions apply strictly to records within the selected academic/administrative department.</p>
                          {selectedStaffScopeType === 'Department' && (
                            <div className="rbac-scope-dept-select-wrap" onClick={(e) => e.stopPropagation()}>
                              <label>Select Target Department:</label>
                              <select
                                value={selectedStaffScopeDept}
                                onChange={(e) => setSelectedStaffScopeDept(e.target.value)}
                              >
                                <option value="">Select Department</option>
                                {departments.map((dept) => (
                                  <option key={dept.id || dept.name} value={dept.id || dept.name}>
                                    {dept.name} {dept.code ? `(${dept.code})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </label>

                      <label className={`rbac-scope-option ${selectedStaffScopeType === 'Self / Assigned Classes' ? 'is-selected' : ''}`}>
                        <input
                          type="radio"
                          name="staffScopeType"
                          value="Self / Assigned Classes"
                          checked={selectedStaffScopeType === 'Self / Assigned Classes'}
                          onChange={() => setSelectedStaffScopeType('Self / Assigned Classes')}
                        />
                        <div className="rbac-scope-info">
                          <strong>Self / Assigned Classes Scope</strong>
                          <p>Permissions restricted solely to self-assigned subject classes, timetable slots, and student evaluations.</p>
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
                    <FiCheck /> Save Assignment
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 5: DELETE ROLE CONFIRMATION */}
        {/* ============================================================== */}
        {deletingRole && (
          <div className="rbac-modal-backdrop" onClick={() => !isDeletingRole && setDeletingRole(null)}>
            <div className="rbac-delete-modal-window" onClick={(e) => e.stopPropagation()}>
              <div className="rbac-delete-modal-header">
                <div className="rbac-delete-icon-badge">
                  <FiTrash2 />
                </div>
                <div className="rbac-delete-header-texts">
                  <h3>Delete Role Confirmation</h3>
                  <p>Security access role governance & privilege revocation.</p>
                </div>
                <button
                  type="button"
                  className="rbac-modal-close"
                  disabled={isDeletingRole}
                  onClick={() => setDeletingRole(null)}
                >
                  <FiX />
                </button>
              </div>

              {roleDeleteError && (
                <div className="rbac-modal-error-banner" style={{ margin: '12px 16px 0' }} role="alert">
                  <FiAlertCircle />
                  <span>{roleDeleteError}</span>
                </div>
              )}

              <div className="rbac-delete-modal-body">
                <div className="rbac-delete-target-card">
                  <div className="rbac-delete-target-info">
                    <strong>{deletingRole.name}</strong>
                    <span>{deletingRole.category} • {deletingRole.level}</span>
                  </div>
                  <span className="rbac-delete-code-tag">{deletingRole.code}</span>
                </div>

                <p className="rbac-delete-prompt-text">
                  Are you sure you want to permanently delete role <strong>"{deletingRole.name}"</strong>? This action will remove the access profile from the system.
                </p>

                {countStaffWithRole(deletingRole.id) > 0 && (
                  <div className="rbac-delete-warning-banner">
                    <FiAlertCircle />
                    <span>
                      Notice: <strong>{countStaffWithRole(deletingRole.id)} staff members</strong> currently have this role assigned. Deletion is blocked until they are reassigned.
                    </span>
                  </div>
                )}
              </div>

              <div className="rbac-delete-modal-footer">
                <button
                  type="button"
                  className="rbac-btn-cancel"
                  disabled={isDeletingRole}
                  onClick={() => setDeletingRole(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rbac-btn-delete-confirm"
                  disabled={isDeletingRole || countStaffWithRole(deletingRole.id) > 0}
                  onClick={handleConfirmDeleteRole}
                >
                  <FiTrash2 /> {isDeletingRole ? 'Deleting on Server…' : 'Confirm & Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 6: DELETE DESIGNATION CONFIRMATION */}
        {/* ============================================================== */}
        {deletingDesignation && (
          <div className="rbac-modal-backdrop" onClick={() => setDeletingDesignation(null)}>
            <div className="rbac-delete-modal-window" onClick={(e) => e.stopPropagation()}>
              <div className="rbac-delete-modal-header">
                <div className="rbac-delete-icon-badge">
                  <FiTrash2 />
                </div>
                <div className="rbac-delete-header-texts">
                  <h3>Delete Designation Confirmation</h3>
                  <p>Official institutional designation & hierarchy removal.</p>
                </div>
                <button
                  type="button"
                  className="rbac-modal-close"
                  onClick={() => setDeletingDesignation(null)}
                >
                  <FiX />
                </button>
              </div>

              <div className="rbac-delete-modal-body">
                <div className="rbac-delete-target-card">
                  <div className="rbac-delete-target-info">
                    <strong>{deletingDesignation.title}</strong>
                    <span>{deletingDesignation.category} • {deletingDesignation.level}</span>
                  </div>
                  <span className="rbac-delete-code-tag">{deletingDesignation.code}</span>
                </div>

                <p className="rbac-delete-prompt-text">
                  Are you sure you want to permanently delete designation <strong>"{deletingDesignation.title}"</strong>?
                </p>

                {countStaffWithDesignation(deletingDesignation.id, deletingDesignation.title) > 0 && (
                  <div className="rbac-delete-warning-banner">
                    <FiAlertCircle />
                    <span>
                      Notice: <strong>{countStaffWithDesignation(deletingDesignation.id, deletingDesignation.title)} staff members</strong> currently have this designation. Deletion is blocked until they are reassigned.
                    </span>
                  </div>
                )}
              </div>

              <div className="rbac-delete-modal-footer">
                <button
                  type="button"
                  className="rbac-btn-cancel"
                  onClick={() => setDeletingDesignation(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rbac-btn-delete-confirm"
                  disabled={countStaffWithDesignation(deletingDesignation.id, deletingDesignation.title) > 0}
                  onClick={handleConfirmDeleteDesignation}
                >
                  <FiTrash2 /> Confirm & Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
