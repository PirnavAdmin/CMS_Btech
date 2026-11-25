import { useEffect, useMemo, useRef, useState } from 'react'
import PlatformLogo from './PlatformLogo.jsx'
import { useLocation } from 'react-router-dom'
import { FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi'
import { navigationGroups, unavailableNavigationGroups, activeSidebarEntry } from '../config/sidebarNavigation.js'
import SidebarNavigation from './navigation/SidebarNavigation.jsx'
import { MODULE_REGISTRY } from '../config/moduleRegistry.js'
import { adminWorkspaceForModule, groupAdminWorkspaces } from '../config/adminWorkspaces.js'
import useSidebarAccess from '../hooks/useSidebarAccess.js'
import { getUserRole, getAccessToken } from '../auth/auth'
import { fetchCollegeLogo, getCollegeLogoUrl, isBackendCollegeLogo } from '../auth/collegeApi'
import { collegeLogoValue } from '../utils/collegeLogo'
import { useAcademic } from '../context/AcademicContext'
import './Sidebar.css'

function PlatformBrandMark({ platformMode }) {
  const fallback = <svg viewBox="0 0 36 36" focusable="false">
    <path d="M10 29V8h9.1c6.1 0 9.4 3.1 9.4 8s-3.3 8-9.4 8H15v5h-5Zm5-9h4c3.1 0 4.6-1.3 4.6-4s-1.5-4-4.6-4h-4v8Z" fill="currentColor" />
    <circle cx="27.5" cy="27.5" r="2.5" fill="currentColor" />
  </svg>
  return platformMode ? <PlatformLogo fallback={fallback} /> : fallback
}

export default function Sidebar({ open = false, onClose = () => {}, collapsed = false, onToggleCollapse = () => {}, platformMode = false }) {
  const userRole = getUserRole()
  const { pathname } = useLocation()
  const navigationRef = useRef(null)
  const { selectedCollegeId, selectedCollege, loading: collegeLoading = false, collegeAccess = null } = useAcademic()
  const [collegeBrandLogo, setCollegeBrandLogo] = useState('')
  const { status, access } = useSidebarAccess({ token: getAccessToken(), collegeId: selectedCollegeId, collegeLoading, providedAccess: collegeAccess })
  const normalizedRole = String(userRole || '').toLowerCase().replace(/[\s-]+/g, '_')
  const showCollegeBrand = status === 'ready' && ['admin', 'college_admin', 'collegeadmin'].includes(normalizedRole) && access?.isSuperAdmin !== true
  const collegeName = selectedCollege?.collegeName || selectedCollege?.name || selectedCollege?.CollegeName || 'College'
  const collegeCode = selectedCollege?.collegeCode || selectedCollege?.code || selectedCollege?.CollegeCode || ''
  const collegeLogoUrl = getCollegeLogoUrl(selectedCollegeId, collegeLogoValue(selectedCollege), [collegeCode, collegeName])
  const collegeInitial = collegeName.trim().charAt(0).toUpperCase() || 'C'


  useEffect(() => {
    setCollegeBrandLogo('')
    if (!showCollegeBrand || !selectedCollegeId || !collegeLogoUrl) return undefined
    let active = true
    let objectUrl = ''
    if (!isBackendCollegeLogo(collegeLogoUrl)) {
      setCollegeBrandLogo(collegeLogoUrl)
      return undefined
    }
    fetchCollegeLogo(collegeLogoUrl)
      .then(blob => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setCollegeBrandLogo(objectUrl)
      })
      .catch(() => {})
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [showCollegeBrand, selectedCollegeId, collegeLogoUrl])
  const groups = useMemo(() => {
    const modules = userRole === 'admin' ? MODULE_REGISTRY.map(entry => entry.id === 'academic_settings' ? { ...entry, navigation: true, label: 'Global Settings' } : entry) : MODULE_REGISTRY
    const source = status === 'error' || status === 'loading' ? unavailableNavigationGroups(userRole, modules) : navigationGroups({ role: userRole, access, selectedCollegeId, modules })
    if (userRole === 'admin' && access?.isSuperAdmin === true && status === 'ready') {
      const entries = new Map(source.flatMap(group => group.items).map(entry => [entry.id, entry]))
      const make = (sourceId, id, label, path) => {
        const entry = entries.get(sourceId) || modules.find(module => module.id === sourceId)
        return entry ? [{...entry, id, label, path, children: [], aliases: []}] : []
      }
      return [{id:'platform',label:'Platform',items:[
        ...make('dashboard','dashboard','Dashboard','/dashboard'),
        ...make('colleges','colleges','Organizations','/college-institution-management'),
        ...make('demo_requests','demo_requests','Demo Requests','/demo-requests'),
        ...make('subscriptions','subscriptions','Subscriptions','/subscriptions'),
        ...make('accounts_billing','accounts_billing','Accounts & Billing','/accounts-billing'),
        ...make('roles_permissions','roles_permissions','Permissions','/roles-designations'),
        ...make('academic_settings','academic_settings','Platform Settings','/settings'),
      ]}]
    }
    return userRole === 'admin' ? groupAdminWorkspaces(source) : source
  }, [status, userRole, access, selectedCollegeId])
  const activeId = useMemo(() => {
    const platformEntry = access?.isSuperAdmin === true
      ? MODULE_REGISTRY.find(entry => entry.scope === 'platform' && (pathname === entry.path || pathname.startsWith(`${entry.path}/`)))?.id
      : null
    const module = activeSidebarEntry(pathname, userRole) || platformEntry || (pathname === '/settings' || pathname.startsWith('/settings/') || pathname === '/global-settings' ? 'academic_settings' : null)
    if (access?.isSuperAdmin === true) return module
    const workspace = userRole === 'admin' && adminWorkspaceForModule(module)
    return workspace ? `workspace_${workspace.id}` : module
  }, [pathname, userRole, access])


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
    <aside className={`sidebar sidebar--module-icons ${platformMode ? 'sidebar--platform' : ''} ${open ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`} aria-label="Primary navigation">
      <div className="sidebar-brand">
        <span className="sidebar-brand__mark" aria-hidden="true">
          {showCollegeBrand
            ? collegeBrandLogo
              ? <img src={collegeBrandLogo} alt="" onError={() => setCollegeBrandLogo('')} />
              : <b className="sidebar-brand__initial">{collegeInitial}</b>
            : <PlatformBrandMark platformMode={platformMode} />}
        </span>
        <div className="sidebar-brand__copy">
          <strong title={showCollegeBrand ? collegeName : 'Pirnav Group of Institutions'}>{showCollegeBrand ? collegeName : 'Pirnav'}</strong>
          <span>{showCollegeBrand ? 'College Administration' : 'Group of Institutions'}</span>
        </div>
        <button className="sidebar-collapse" onClick={onToggleCollapse} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} title={collapsed ? 'Expand navigation' : 'Collapse navigation'}>{collapsed ? <FiChevronRight /> : <FiChevronLeft />}</button>
        <button className="sidebar-close" onClick={onClose} aria-label="Close navigation"><FiX /></button>
      </div>
      <nav ref={navigationRef} onScroll={rememberScrollPosition} className="sidebar-navigation">
        {status === 'loading' && <p className="sidebar-access-state" role="status">Loading navigation…</p>}
        {status === 'signed-out' && <p className="sidebar-access-state" role="status">Sign in to load navigation.</p>}
        {status === 'ready' && !selectedCollegeId && <p className="sidebar-access-state" role="status">Select a college for college-specific records.</p>}
        {status === 'ready' && !groups.length && <p className="sidebar-access-state" role="status">No navigation modules are available for your current access.</p>}
        <SidebarNavigation groups={groups} activeId={activeId} pathname={pathname} collapsed={collapsed} onToggleCollapse={onToggleCollapse} onNavigate={onClose} />
      </nav>
    </aside>
  </>
}
