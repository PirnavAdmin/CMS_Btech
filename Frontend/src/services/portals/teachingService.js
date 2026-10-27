import { API_BASE_URL, profileApi } from '../../api/apiEndpoints.js'
import { getAccessToken, getAuthStorage, getUserCollegeId, getUserRole } from '../../auth/auth.js'
import { createTeachingService } from './teachingContract.js'
import { createTeachingTransport } from './teachingTransport.js'

const request = createTeachingTransport({
  fetchResponse: (...args) => fetch(...args),
  baseUrl: API_BASE_URL,
  getToken: getAccessToken,
  authorize: () => { if (getUserRole() !== 'faculty') throw new Error('This workspace is available to faculty accounts only.') },
  report: details => { if (import.meta.env.DEV) console.warn('Faculty data request unavailable', details) },
})
export const teachingService = createTeachingService({ request, getProfile: () => profileApi.getProfile(), collegeId: getUserCollegeId, getIdentity: () => getAuthStorage()?.getItem('btech-user-id') || '' })
