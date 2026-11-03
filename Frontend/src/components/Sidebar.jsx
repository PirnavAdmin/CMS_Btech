import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi'
import { navigationGroups, activeSidebarEntry } from '../config/sidebarNavigation.js'
import SidebarNavigation from './navigation/SidebarNavigation.jsx'
import useSidebarAccess from '../hooks/useSidebarAccess.js'
import { getUserRole, getAccessToken } from '../auth/auth'
import { useAcademic } from '../context/AcademicContext'
import './Sidebar.css'
import { collegeLogoValue } from '../utils/collegeLogo'
import { cacheCollegeLogo, fetchCollegeLogo, getCollegeById, getCollegeLogoEndpoint, getCollegeLogoUrl, getColleges, isBackendCollegeLogo, readCachedCollegeLogo, unwrapCollegeRecord } from '../auth/collegeApi'

const failedLogoUrls = new Set()

export default function Sidebar({ open = false, onClose = () => {}, collapsed = false, onToggleCollapse = () => {} }) {
  const userRole = getUserRole()
  const { pathname } = useLocation()
  const navigationRef = useRef(null)
  const { selectedCollege, selectedCollegeId, colleges = [], loading: collegeLoading = false, collegeAccess = null } = useAcademic()
  const { status, access, retry } = useSidebarAccess({ token: getAccessToken(), collegeId: selectedCollegeId, collegeLoading, providedAccess: collegeAccess })
  const groups = useMemo(() => navigationGroups({ role: userRole, access, selectedCollegeId }), [userRole, access, selectedCollegeId])
  const activeId = useMemo(() => activeSidebarEntry(pathname, userRole), [pathname, userRole])

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
    <aside className={`sidebar sidebar--module-icons ${open ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`} aria-label="Primary navigation">
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
        {status === 'loading' && <p className="sidebar-access-state" role="status">Loading navigation…</p>}
        {status === 'signed-out' && <p className="sidebar-access-state" role="status">Sign in to load navigation.</p>}
        {status === 'error' && <div className="sidebar-access-state" role="alert"><p>Navigation access could not be loaded.</p><button type="button" onClick={retry}>Retry navigation</button></div>}
        {status === 'ready' && !selectedCollegeId && <p className="sidebar-access-state" role="status">Select a college for college-specific records.</p>}
        {status === 'ready' && !groups.length && <p className="sidebar-access-state" role="status">No navigation modules are available for your current access.</p>}
        <SidebarNavigation groups={groups} activeId={activeId} pathname={pathname} collapsed={collapsed} onToggleCollapse={onToggleCollapse} onNavigate={onClose} />
      </nav>
    </aside>
  </>
}
