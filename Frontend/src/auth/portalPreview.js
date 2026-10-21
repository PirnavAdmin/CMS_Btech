import { signIn, getAuthStorage } from './auth.js'

export const portalPreviewEnabled = import.meta.env.DEV && import.meta.env.VITE_PORTAL_PREVIEW === 'true'
export const isPortalPreview = () => portalPreviewEnabled && getAuthStorage()?.getItem('cms-portal-preview') === 'true'

export function signInPortalPreview(role) {
  if (!portalPreviewEnabled) throw new Error('Portal preview is only available when explicitly enabled in development.')
  const users = { admin: ['admin-1', 'Dr. Rajesh Kumar'], faculty: ['faculty-1', 'Dr. Ananya Rao'], student: ['student-1', 'Aarav Reddy'] }
  if (!users[role]) throw new Error('Choose a valid preview role.')
  const [id, name] = users[role]
  signIn(role, '', '', false, { id, name, collegeId: 'preview-college' })
  getAuthStorage().setItem('cms-portal-preview', 'true')
}
