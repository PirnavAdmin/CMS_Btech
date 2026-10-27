import { getAuthStorage, getUserRole, getUserCollegeId } from '../../auth/auth.js'
import { selectedCollegeId } from '../../utils/collegeScope.js'
import { isPortalPreview } from '../../auth/portalPreview.js'
import { createMockPortalService } from './mockService.js'

// Replace this factory with the agreed HTTP adapter when contracts are supplied.
// Mock mode is explicit, not an automatic fallback for failed HTTP requests.
export function portalService() {
  const storage = getAuthStorage()
  return createMockPortalService({
    storage: localStorage,
    collegeId: getUserCollegeId() || selectedCollegeId(),
    preview: isPortalPreview(),
    actor: { id: storage?.getItem('btech-user-id') || '', name: storage?.getItem('btech-user-name') || '', email: storage?.getItem('btech-user-email') || '', phone: storage?.getItem('btech-user-mobile') || '', employeeUserId: storage?.getItem('btech-user-employee-id') || '', role: getUserRole() },
  })
}
