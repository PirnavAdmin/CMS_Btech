import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Award as FiAward, Book as FiBook, BookOpen as FiBookOpen, Briefcase as FiBriefcase, Calendar as FiCalendar, CheckCircle as FiCheckCircle, CheckSquare as FiCheckSquare, ChevronDown as FiChevronDown, ChevronLeft as FiChevronLeft, ChevronRight as FiChevronRight, CreditCard as FiCreditCard, Edit3 as FiEdit3, FileText as FiFileText, GitBranch as FiGitBranch, Grid as FiGrid, Home as FiHome, Layers as FiLayers, Shield as FiShield, TrendingUp as FiTrendingUp, User as FiUser, UserPlus as FiUserPlus, Users as FiUsers, X as FiX } from 'lucide-react'
import { getUserRole, getAccessToken } from '../auth/auth'
import { authAccessApi } from '../api/apiEndpoints'
import { useEffect as useReactEffect, useState as useReactState } from 'react'
import { ROLES } from '../auth/roles'
import { useAcademic } from '../context/AcademicContext'
import './Sidebar.css'
import { isFeeRoute } from '../utils/feeNavigation'
import { collegeLogoValue } from '../utils/collegeLogo'
import { cacheCollegeLogo, fetchCollegeLogo, getCollegeById, getCollegeLogoEndpoint, getCollegeLogoUrl, getColleges, isBackendCollegeLogo, readCachedCollegeLogo, unwrapCollegeRecord } from '../auth/collegeApi'

const failedLogoUrls = new Set()

const academicLinks = [
  { label: 'Colleges', to: '/college-institution-management', icon: FiHome, tone: 'gold', module: 'colleges' },
  { label: 'Academic Years', to: '/academic-year-management', icon: FiCalendar, tone: 'green', module: 'academic_years' },
  { label: 'Departments', to: '/department-management', icon: FiGrid, tone: 'cyan', module: 'departments' },
  { label: 'Courses', to: '/courses', icon: FiBookOpen, tone: 'blue', module: 'courses' },
  { label: 'Branches', to: '/branches', icon: FiGitBranch, tone: 'purple', module: 'branches' },
  { label: 'Semesters', to: '/semester-management', icon: FiLayers, tone: 'orange', module: 'semesters' },
  { label: 'Sections', to: '/section-management', icon: FiUsers, tone: 'pink', module: 'sections' },
  { label: 'Rooms & Classrooms', to: '/rooms-management', icon: FiGrid, tone: 'cyan', module: 'rooms' },
]

const curriculumLinks = [
  { label: 'Subject Management', to: '/subject-management', icon: FiBook, tone: 'blue', module: 'subjects' },
  { label: 'Credits Management', to: '/credits-management', icon: FiAward, tone: 'green', module: 'credits' },
  { label: 'Elective Management', to: '/elective-management', icon: FiCheckCircle, tone: 'purple', module: 'electives' },
  { label: 'Timetable Management', to: '/timetable', icon: FiCalendar, tone: 'orange', module: 'timetable' },
]

function Item({ to, icon: Icon, children, onNavigate, tone = 'blue', activeWhen }) {
  const location = useLocation()
  return <NavLink to={to} onClick={onNavigate} title={typeof children === 'string' ? children : undefined} className={({ isActive }) => `sidebar-link sidebar-link--${tone} ${(activeWhen ? activeWhen(location.pathname) : isActive) ? 'active' : ''}`}><Icon aria-hidden="true" /><span>{children}</span></NavLink>
}

export default function Sidebar({ open = false, onClose = () => {}, collapsed = false, onToggleCollapse = () => {} }) {
  const userRole = getUserRole()
  const { pathname } = useLocation()
  const navigationRef = useRef(null)
  const [accessMatrix, setAccessMatrix] = useReactState(null)
  const [isSuperAdmin, setIsSuperAdmin] = useReactState(false)
  const { selectedCollege, selectedCollegeId, colleges = [] } = useAcademic()
  useReactEffect(() => {
    let active = true
    const token = getAccessToken()
    if (!token) { setAccessMatrix(null); setIsSuperAdmin(false); return undefined }
    authAccessApi.get()
      .then(access => { if (active) { setAccessMatrix(access?.permissions || null); setIsSuperAdmin(access?.isSuperAdmin === true) } })
      .catch(() => { if (active) { setAccessMatrix(null); setIsSuperAdmin(false) } })
    return () => { active = false }
  }, [])
  const canView = module => isSuperAdmin || (accessMatrix ? Boolean(accessMatrix[module]?.view) : userRole === ROLES.ADMIN)

  const collegeDisplayName = selectedCollege?.name || selectedCollege?.collegeName || 'Pirnav Engineering College'
  const matchingCollege = colleges.find(college => {
    const name = String(college?.name || college?.collegeName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const current = String(collegeDisplayName).toLowerCase().replace(/[^a-z0-9]/g, '')
    return name && current && (name === current || name.includes(current) || current.includes(name))
  }) || (String(collegeDisplayName).toLowerCase().includes('btech') ? colleges.find(college => /btech.*college.*engineering/i.test(String(college?.name || college?.collegeName || ''))) : null)
  const selectedCollegeHasId = Boolean(selectedCollege?.id ?? selectedCollege?.collegeId ?? selectedCollege?.CollegeId ?? selectedCollegeId)
  const activeCollege = selectedCollegeHasId ? selectedCollege : (matchingCollege || selectedCollege)
  const collegeId = activeCollege?.id ?? activeCollege?.collegeId ?? activeCollege?.CollegeId ?? selectedCollegeId
  const [collegeLogo, setCollegeLogo] = useState('')
  const examRoutesActive = pathname.startsWith('/examination-setup') || pathname.startsWith('/exam-timetable') || pathname.startsWith('/examination/completed-exams')
  const [examManagementOpen, setExamManagementOpen] = useState(examRoutesActive)
  const gradeResultsActive = pathname.startsWith('/grade-result-management') || pathname.startsWith('/results')
  const [gradeResultsOpen, setGradeResultsOpen] = useState(gradeResultsActive)
  const feeRoutesActive = isFeeRoute(pathname)

  useEffect(() => {
    if (examRoutesActive) setExamManagementOpen(true)
  }, [examRoutesActive])

  useEffect(() => {
    if (gradeResultsActive) setGradeResultsOpen(true)
  }, [gradeResultsActive])

  useEffect(() => {
    let active = true
    let objectUrl = ''
    const loadLogo = async () => {
      // The context list can omit logo fields. Load the selected college detail
      // once so the same uploaded asset used in College Management is available
      // in the persistent sidebar too.
      let record = activeCollege || {}
      let targetCollegeId = collegeId
      let logoValue = collegeLogoValue(record)
        || readCachedCollegeLogo(collegeId)
        || readCachedCollegeLogo(record?.code || record?.collegeCode)
        || readCachedCollegeLogo(collegeDisplayName)
      if (!logoValue) {
        try {
          const response = await getColleges()
          const raw = response?.data ?? response
          const list = Array.isArray(raw) ? raw : raw?.colleges || raw?.items || raw?.records || raw?.data || []
          const requested = String(collegeDisplayName).toLowerCase().replace(/[^a-z0-9]/g, '')
          const listMatch = list.map(unwrapCollegeRecord).find(item => {
            const name = String(item?.name || item?.collegeName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
            const code = String(item?.code || item?.collegeCode || '').toLowerCase()
            return (name && requested && (name === requested || name.includes(requested) || requested.includes(name)))
          })
          if (listMatch) {
            record = listMatch
            targetCollegeId = record.id ?? record.collegeId ?? record.CollegeId ?? targetCollegeId
            logoValue = collegeLogoValue(record)
          }
        } catch { /* The logo endpoint below remains the fallback. */ }
      }
      if (!logoValue && targetCollegeId) {
        try {
          const response = await getCollegeById(targetCollegeId)
          record = unwrapCollegeRecord(response?.data ?? response)
          targetCollegeId = record.id ?? record.collegeId ?? record.CollegeId ?? targetCollegeId
          logoValue = collegeLogoValue(record)
          if (logoValue) {
            cacheCollegeLogo(targetCollegeId, logoValue, [record.code, record.collegeCode, record.name, record.collegeName])
          } else if (targetCollegeId) {
            const endpoint = getCollegeLogoEndpoint(targetCollegeId)
            if (endpoint) failedLogoUrls.add(endpoint)
          }
        } catch { /* The logo endpoint below remains the fallback. */ }
      }
      if (!logoValue) {
        if (active) setCollegeLogo('')
        return
      }

      // Always prefer the current academic-context college and its uploaded
      // asset. A fixed institution ID would show a stale logo after an admin
      // changes the selected college or uploads a replacement.
      const logoUrl = getCollegeLogoUrl(targetCollegeId, logoValue, [record?.code, record?.collegeCode, collegeDisplayName])
      if (!logoUrl || failedLogoUrls.has(logoUrl)) {
        if (active) setCollegeLogo('')
        return
      }
      if (!isBackendCollegeLogo(logoUrl)) {
        if (active) setCollegeLogo(logoUrl)
        return
      }
      if (active) setCollegeLogo('')
      try {
        const blob = await fetchCollegeLogo(logoUrl)
        if (blob) {
          objectUrl = URL.createObjectURL(blob)
          if (active) setCollegeLogo(objectUrl)
        } else {
          failedLogoUrls.add(logoUrl)
          if (active) setCollegeLogo('')
        }
      } catch {
        failedLogoUrls.add(logoUrl)
        if (active) setCollegeLogo('')
      }
    }
    loadLogo()
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [collegeId, collegeDisplayName, activeCollege, colleges])

  useEffect(() => {
    const navigation = navigationRef.current
    if (!navigation) return
    navigation.scrollTop = Number(sessionStorage.getItem('pirnav-sidebar-scroll') || 0)
  }, [])

  const rememberScrollPosition = (event) => {
    sessionStorage.setItem('pirnav-sidebar-scroll', String(event.currentTarget.scrollTop))
  }

  return <>
    <button className={`sidebar-scrim ${open ? 'is-visible' : ''}`} onClick={onClose} aria-label="Close navigation" tabIndex={open ? 0 : -1} />
    <aside className={`sidebar ${open ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`} aria-label="Primary navigation">
      <div className="sidebar-brand">
        <span className="sidebar-brand__mark" aria-hidden="true">
          {collegeLogo ? <img src={collegeLogo} alt="" onError={() => setCollegeLogo('')} /> : <svg viewBox="0 0 32 32"><path d="M4 12 16 5l12 7H4Z"/><path d="M7 14v10M12 14v10M20 14v10M25 14v10"/><path d="M4 25h24M2.5 28h27"/></svg>}
        </span>
        <div className="sidebar-brand__copy">
          <strong title={collegeDisplayName}>{collegeDisplayName}</strong>
          <span className="sidebar-brand__subtitle">Digital Campus</span>
        </div>
        <button className="sidebar-collapse" onClick={onToggleCollapse} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} title={collapsed ? 'Expand navigation' : 'Collapse navigation'}>{collapsed ? <FiChevronRight /> : <FiChevronLeft />}</button>
        <button className="sidebar-close" onClick={onClose} aria-label="Close navigation"><FiX /></button>
      </div>
      <nav ref={navigationRef} onScroll={rememberScrollPosition} className="sidebar-navigation">
        <p className="sidebar-section-label">Overview</p>
        {canView('dashboard') && <Item to="/dashboard" icon={FiHome} tone="blue" onNavigate={onClose}>Overview</Item>}
        {userRole === ROLES.ADMIN && <>
          <p className="sidebar-section-label">College & Academic Setup</p>
          {academicLinks.filter(link => canView(link.module)).map(link => <Item {...link} key={link.to} onNavigate={onClose}>{link.label}</Item>)}
          {/* Academic Levels has no standalone route or backed screen in this project yet. */}
          <p className="sidebar-section-label">Finance</p>
          {canView('fees') && <Item to="/fees/structures" icon={FiLayers} tone="gold" onNavigate={onClose} activeWhen={path => path.startsWith('/fees/structures') || path === '/fees/components'}>Fee Structure</Item>}
          {canView('fees') && <Item to="/fees/overview" icon={FiCreditCard} tone="gold" onNavigate={onClose} activeWhen={path => feeRoutesActive && !path.startsWith('/fees/structures') && path !== '/fees/components'}>Fee Management</Item>}
          <p className="sidebar-section-label">Faculty Management</p>
          {canView('faculty_directory') && <Item to="/faculty" icon={FiBriefcase} tone="cyan" onNavigate={onClose} activeWhen={pathname => !['attendance', 'leave-management', 'payroll', 'advisors', 'subjects'].includes(pathname.split('/')[2]) && pathname.startsWith('/faculty')}>Faculty Directory</Item>}
          {canView('faculty_attendance') && <Item to="/faculty/attendance" icon={FiCheckSquare} tone="green" onNavigate={onClose} activeWhen={pathname => pathname === '/faculty/attendance' || pathname.startsWith('/faculty/attendance/')}>Faculty Attendance</Item>}
          {canView('faculty_leaves') && <Item to="/faculty/leave-management" icon={FiCalendar} tone="orange" onNavigate={onClose}>Leave Management</Item>}
          {canView('faculty_payroll') && <Item to="/faculty/payroll" icon={FiCreditCard} tone="gold" onNavigate={onClose}>Faculty Payroll</Item>}
          <p className="sidebar-section-label">Student Management</p>
          {canView('student_admissions') && <Item to="/student-management/admissions" icon={FiUserPlus} tone="orange" onNavigate={onClose}>Student Admissions</Item>}
          {canView('student_profiles') && <Item to="/student-management/profiles" icon={FiUser} tone="cyan" onNavigate={onClose}>Student Profiles</Item>}
          {canView('student_attendance') && <Item to="/student-management/attendance" icon={FiCheckSquare} tone="green" onNavigate={onClose}>Student Attendance</Item>}
          {canView('student_promotions') && <Item to="/student-management/promotions" icon={FiTrendingUp} tone="green" onNavigate={onClose}>Student Promotions</Item>}
          <p className="sidebar-section-label">Curriculum & Scheduling</p>
          {curriculumLinks.filter(link => canView(link.module)).map(link => <Item {...link} key={link.to} onNavigate={onClose}>{link.label}</Item>)}
          <p className="sidebar-section-label">Examinations & Results</p>
          {canView('examinations') && <>
          <button type="button" className={`sidebar-link sidebar-link--blue sidebar-disclosure sidebar-exam-parent ${examRoutesActive ? 'is-module-active' : ''}`} title="Exam Management" aria-label="Exam Management" onClick={() => { if (collapsed) onToggleCollapse(); setExamManagementOpen(open => !open) }} aria-expanded={!collapsed && examManagementOpen} aria-controls="exam-management-links">
            <FiFileText aria-hidden="true" /><span>Exam Management</span><FiChevronDown className="sidebar-disclosure__chevron" aria-hidden="true" />
          </button>
          {!collapsed && examManagementOpen && <div className="sidebar-submenu sidebar-exam-submenu" id="exam-management-links">
            <Item to="/examination-setup" icon={FiFileText} tone="blue" onNavigate={onClose} activeWhen={pathname => pathname.startsWith('/examination-setup')}>Examination Setup</Item>
            <Item to="/exam-timetable" icon={FiCalendar} tone="orange" onNavigate={onClose} activeWhen={pathname => pathname.startsWith('/exam-timetable')}>Exam Timetable</Item>
          </div>}
          </>}
          {canView('marks') && <Item to="/marks-management/marks-entry" icon={FiEdit3} tone="green" onNavigate={onClose} activeWhen={pathname => pathname.startsWith('/marks-management')}>Marks Management</Item>}
          {canView('results') && <>
          <button type="button" className={`sidebar-link sidebar-link--purple sidebar-disclosure sidebar-grade-parent ${gradeResultsActive ? 'is-module-active' : ''}`} title="Grades System and Results" aria-label="Grades System and Results" onClick={() => { if (collapsed) onToggleCollapse(); setGradeResultsOpen(open => !open) }} aria-expanded={!collapsed && gradeResultsOpen} aria-controls="grade-results-links">
            <FiAward aria-hidden="true" /><span>Grades System and Results</span><FiChevronDown className="sidebar-disclosure__chevron" aria-hidden="true" />
          </button>
          {!collapsed && gradeResultsOpen && <div className="sidebar-submenu sidebar-grade-submenu" id="grade-results-links">
            <Item to="/grade-result-management/grade-configuration" icon={FiAward} tone="purple" onNavigate={onClose} activeWhen={pathname => pathname.startsWith('/grade-result-management')}>Grade Management</Item>
            <Item to="/results" icon={FiFileText} tone="blue" onNavigate={onClose} activeWhen={pathname => pathname.startsWith('/results')}>Official Results</Item>
          </div>}
          </>}
        </>}
        {[ROLES.FACULTY, ROLES.STUDENT].includes(userRole) && <><p className="sidebar-section-label">Academics</p><Item to="/my-subjects" icon={FiBookOpen} tone="blue" onNavigate={onClose}>My Subjects</Item>{userRole===ROLES.FACULTY&&<><Item to="/timetable" icon={FiCalendar} tone="orange" onNavigate={onClose}>My Timetable</Item><Item to="/student-management/attendance/take" icon={FiCheckSquare} tone="green" onNavigate={onClose}>Record Attendance</Item></>}</>}
        {(userRole === ROLES.ADMIN || [ROLES.FACULTY, ROLES.STUDENT, ROLES.STAFF].includes(userRole)) && <>
          <p className="sidebar-section-label">Campus Services</p>
          {canView('library') && <Item to="/library" icon={FiBookOpen} tone="blue" onNavigate={onClose}>Library</Item>}
          {canView('meetings_events') && <Item to="/meetings-events" icon={FiCalendar} tone="orange" onNavigate={onClose}>Meetings / Events</Item>}
          {canView('placement') && <Item to="/placement" icon={FiBriefcase} tone="green" onNavigate={onClose}>Placement</Item>}
        </>}
        {userRole === ROLES.ADMIN && <>
          <p className="sidebar-section-label">Settings & Access</p>
          {canView('roles_permissions') && <Item to="/user-access" icon={FiUsers} tone="blue" onNavigate={onClose}>User Access Management</Item>}
          {canView('roles_permissions') && <Item to="/roles-designations" icon={FiShield} tone="purple" onNavigate={onClose}>Roles & Designations</Item>}
        </>}
      </nav>
    </aside>
  </>
}
