import { useCallback, useEffect, useState } from 'react'
import { roleApi } from '../api/apiEndpoints.js'
import { getAuthStorage, getUserRole } from './auth.js'
import { isPortalPreview } from './portalPreview.js'
import { canViewScreen, requireAssignedPermissions } from './screenPermissions.js'

const roleAliases = {
  faculty: ['faculty', 'teaching_faculty'],
  staff: ['staff', 'non_teaching', 'non_teaching_staff'],
  student: ['student'],
  admin: ['admin', 'college_admin', 'super_admin'],
}

const permissionRequests = new Map()

function roleNames(role) {
  const normalized = String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  return [...new Set([normalized, ...(roleAliases[normalized] || [])].filter(Boolean))]
}

function identityKey(role) {
  const storage = getAuthStorage()
  let userId = '', collegeId = ''
  try {
    userId = storage?.getItem('btech-user-id') || ''
    collegeId = storage?.getItem('btech-user-college-id') || ''
  } catch { /* Storage can be unavailable in restricted browser contexts. */ }
  return `${role}:${userId}:${collegeId}`
}

function loadPermissions(role, key) {
  let request = permissionRequests.get(key)
  if (!request) {
    request = roleApi.getAll().then(rows => requireAssignedPermissions(rows, roleNames(role)))
    permissionRequests.set(key, request)
    request.catch(() => permissionRequests.delete(key))
  }
  return request
}

export function useScreenAccess() {
  const role = getUserRole()
  const key = identityKey(role)
  const preview = isPortalPreview()
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading] = useState(Boolean(role && role !== 'admin' && !preview))
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    if (!role || role === 'admin' || preview) {
      setPermissions({})
      setError(null)
      setLoading(false)
      return () => { active = false }
    }

    setLoading(true)
    loadPermissions(role, key)
      .then(next => {
        if (active) {
          setPermissions(next)
          setError(null)
        }
      })
      .catch(reason => {
        if (active) {
          setPermissions({})
          setError(reason instanceof Error ? reason : new Error(String(reason)))
        }
      })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [key, preview, role])

  const canView = useCallback(path => canViewScreen(String(path || ''), role, permissions), [permissions, role])
  return { canView, permissions, loading, error }
}
