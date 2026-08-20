import { getUserRole } from '../../auth/auth'

const PROFILE_KEY = 'btech-user-profile'

const defaultProfile = () => ({
  id: 'DEMO_USER',
  fullName: 'Demo User',
  email: 'demo.user@btech.edu',
  mobile: '9876543210',
  role: getUserRole() || 'student',
  identifier: 'BT-DEMO-001',
  department: 'Department of Technology',
  designation: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  city: '',
  district: '',
  state: '',
  postalCode: '',
  bio: '',
  updatedAt: new Date().toISOString(),
})

export const profileApi = {
  getProfile: async () => {
    const stored = localStorage.getItem(PROFILE_KEY)
    return stored ? { ...defaultProfile(), ...JSON.parse(stored) } : defaultProfile()
  },
  updateProfile: async (profile) => {
    const saved = { ...profile, role: getUserRole() || profile.role, updatedAt: new Date().toISOString() }
    localStorage.setItem(PROFILE_KEY, JSON.stringify(saved))
    return saved
  },
}

export async function lookupIndianPincode(pincode) {
  let response
  try {
    response = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pincode)}`)
  } catch {
    throw new Error('PIN-code lookup is unavailable. Enter the address manually.')
  }
  if (!response.ok) throw new Error('Unable to verify this PIN code.')
  const [result] = await response.json()
  const offices = result?.PostOffice
  if (result?.Status !== 'Success' || !offices?.length) throw new Error('No Indian postal location was found for this PIN code.')
  const primary = offices[0]
  return { city: primary.Block || primary.Name || '', district: primary.District || '', state: primary.State || '' }
}
