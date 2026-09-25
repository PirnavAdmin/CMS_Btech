import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { FiAward, FiBarChart2, FiBook, FiBookOpen, FiBriefcase, FiCalendar, FiCheckCircle, FiCheckSquare, FiChevronLeft, FiChevronRight, FiCreditCard, FiEdit3, FiFileText, FiGitBranch, FiGrid, FiHome, FiLayers, FiSliders, FiTrendingUp, FiUser, FiUserPlus, FiUsers, FiX } from 'react-icons/fi'
import { getUserRole } from '../auth/auth'
import { ROLES } from '../auth/roles'
import { useAcademic } from '../context/AcademicContext'
import { collegeLogoValue } from '../utils/collegeLogo'
import { cacheCollegeLogo, fetchCollegeLogo, getCollegeById, getCollegeLogoUrl, getColleges, isBackendCollegeLogo, readCachedCollegeLogo, unwrapCollegeRecord } from '../auth/collegeApi'

const academicLinks = [
  { label: 'Colleges', to: '/college-institution-management', icon: FiHome, tone: 'gold' },
  { label: 'Academic Years', to: '/academic-year-management', icon: FiCalendar, tone: 'green' },
  { label: 'Departments', to: '/department-management', icon: FiGrid, tone: 'cyan' },
  { label: 'Courses', to: '/courses', icon: FiBookOpen, tone: 'blue' },
  { label: 'Branches', to: '/branches', icon: FiGitBranch, tone: 'purple' },
  { label: 'Semesters', to: '/semester-management', icon: FiLayers, tone: 'orange' },
  { label: 'Sections', to: '/section-management', icon: FiUsers, tone: 'pink' },
]

const curriculumLinks = [
  { label: 'Timetable Management', to: '/timetable', icon: FiCalendar, tone: 'orange' },
  { label: 'Subject Management', to: '/subject-management', icon: FiBook, tone: 'blue' },
  { label: 'Credits Management', to: '/credits-management', icon: FiAward, tone: 'green' },
  { label: 'Elective Management', to: '/elective-management', icon: FiCheckCircle, tone: 'purple' },
]

function Item({ to, icon: Icon, children, onNavigate, tone = 'blue', activeWhen }) {
  const location = useLocation()
  return <NavLink to={to} onClick={onNavigate} className={({ isActive }) => `sidebar-link sidebar-link--${tone} ${(activeWhen ? activeWhen(location.pathname) : isActive) ? 'active' : ''}`}><Icon aria-hidden="true" /><span>{children}</span></NavLink>
}

export default function Sidebar({ open = false, onClose = () => {}, collapsed = false, onToggleCollapse = () => {} }) {
  const userRole = getUserRole()
  const { pathname } = useLocation()
  const navigationRef = useRef(null)
  const { selectedCollege, selectedCollegeId, colleges = [] } = useAcademic()

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
          if (logoValue) cacheCollegeLogo(targetCollegeId, logoValue, [record.code, record.collegeCode, record.name, record.collegeName])
        } catch { /* The logo endpoint below remains the fallback. */ }
      }
      // Always prefer the current academic-context college and its uploaded
      // asset. A fixed institution ID would show a stale logo after an admin
      // changes the selected college or uploads a replacement.
      const logoUrl = getCollegeLogoUrl(targetCollegeId, logoValue, [record?.code, record?.collegeCode, collegeDisplayName])
      if (!logoUrl) {
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
        objectUrl = URL.createObjectURL(blob)
        if (active) setCollegeLogo(objectUrl)
      } catch {
        // Some deployments permit the browser to render the image endpoint but
        // reject the authenticated blob request. Keep the direct image URL as
        // a final fallback instead of reverting to the placeholder mark.
        if (active) setCollegeLogo(logoUrl)
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

  const brandNameLength = String(collegeDisplayName || '').trim().length
  const brandStyle = (() => {
    if (brandNameLength > 45) return { fontSize: '0.66rem', lineHeight: '1.14' }
    if (brandNameLength > 32) return { fontSize: '0.72rem', lineHeight: '1.16' }
    if (brandNameLength > 20) return { fontSize: '0.78rem', lineHeight: '1.18' }
    return { fontSize: '0.86rem', lineHeight: '1.2' }
  })()

  return <>
    <button className={`sidebar-scrim ${open ? 'is-visible' : ''}`} onClick={onClose} aria-label="Close navigation" tabIndex={open ? 0 : -1} />
    <aside className={`sidebar ${open ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`} aria-label="Primary navigation">
      <div className="sidebar-brand">
        <span className="sidebar-brand__mark" aria-hidden="true">{collegeLogo ? <img src={collegeLogo} alt="" onError={() => setCollegeLogo('')} /> : <svg viewBox="0 0 32 32"><path d="M4 12 16 5l12 7H4Z"/><path d="M7 14v10M12 14v10M20 14v10M25 14v10"/><path d="M4 25h24M2.5 28h27"/></svg>}</span>
        <span className="sidebar-brand__copy"><strong title={collegeDisplayName} style={brandStyle}>{collegeDisplayName}</strong><small>Digital Campus</small></span>
        <button className="sidebar-collapse" onClick={onToggleCollapse} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} title={collapsed ? 'Expand navigation' : 'Collapse navigation'}>{collapsed ? <FiChevronRight /> : <FiChevronLeft />}</button>
        <button className="sidebar-close" onClick={onClose} aria-label="Close navigation"><FiX /></button>
      </div>
      <nav ref={navigationRef} onScroll={rememberScrollPosition} className="sidebar-navigation">
        <p className="sidebar-section-label">Overview</p>
        <Item to="/dashboard" icon={FiHome} tone="blue" onNavigate={onClose}>Dashboard</Item>
        {userRole === ROLES.ADMIN && <>
          <p className="sidebar-section-label">Academic Management</p>
          {academicLinks.map(link => <Item {...link} key={link.to} onNavigate={onClose}>{link.label}</Item>)}
          <p className="sidebar-section-label">Student Management</p>
          <Item to="/student-management/admissions" icon={FiUserPlus} tone="orange" onNavigate={onClose}>Student Admissions</Item>
          <Item to="/student-management/profiles" icon={FiUser} tone="cyan" onNavigate={onClose}>Student Profiles</Item>
          <Item to="/student-management/attendance" icon={FiCheckSquare} tone="green" onNavigate={onClose}>Student Attendance</Item>
          <Item to="/student-management/promotions" icon={FiTrendingUp} tone="green" onNavigate={onClose}>Student Promotions</Item>
          <p className="sidebar-section-label">Faculty Management</p>
          <Item to="/faculty" icon={FiBriefcase} tone="cyan" onNavigate={onClose} activeWhen={pathname => !['attendance', 'leave-management', 'payroll', 'advisors', 'subjects'].includes(pathname.split('/')[2]) && pathname.startsWith('/faculty')}>Faculty Directory</Item>
          <Item to="/faculty/attendance" icon={FiCheckSquare} tone="green" onNavigate={onClose} activeWhen={pathname => pathname === '/faculty/attendance' || pathname.startsWith('/faculty/attendance/')}>Faculty Attendance</Item>
          <Item to="/faculty/leave-management" icon={FiCalendar} tone="orange" onNavigate={onClose}>Leave Management</Item>
          <Item to="/faculty/payroll" icon={FiCreditCard} tone="gold" onNavigate={onClose}>Faculty Payroll</Item>
          <p className="sidebar-section-label">Curriculum & Subjects</p>
          {curriculumLinks.map(link => <Item {...link} key={link.to} onNavigate={onClose}>{link.label}</Item>)}
          <p className="sidebar-section-label">Campus Operations</p>
          <Item to="/marks" icon={FiEdit3} tone="orange" onNavigate={onClose}>Marks</Item>
          <Item to="/results" icon={FiBarChart2} tone="purple" onNavigate={onClose}>Results</Item>
          <p className="sidebar-section-label">Finance</p>
          <Item to="/fees" icon={FiCreditCard} tone="gold" onNavigate={onClose}>Fee Structure</Item>
          <p className="sidebar-section-label">Settings</p>
          <Item to="/settings" icon={FiSliders} tone="blue" onNavigate={onClose}>Academic Context</Item>
        </>}
        {[ROLES.FACULTY, ROLES.STUDENT].includes(userRole) && <><p className="sidebar-section-label">Academics</p><Item to="/my-subjects" icon={FiBookOpen} tone="blue" onNavigate={onClose}>My Subjects</Item>{userRole===ROLES.FACULTY&&<><Item to="/student-management/attendance/take" icon={FiCheckSquare} tone="green" onNavigate={onClose}>Record Attendance</Item><Item to="/marks/entry" icon={FiEdit3} tone="orange" onNavigate={onClose}>Enter Marks</Item></>}</>}
      </nav>
    </aside>
  </>
}
