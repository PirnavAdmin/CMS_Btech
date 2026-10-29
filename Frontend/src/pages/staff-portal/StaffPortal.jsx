import { useParams } from 'react-router-dom'
import StaffPortalLayout, { STAFF_NAVIGATION } from './StaffPortalLayout.jsx'
import StaffDashboard from './StaffDashboard.jsx'
import StaffProfile from './StaffProfile.jsx'
import StaffAttendance from './StaffAttendance.jsx'
import StaffLeave from './StaffLeave.jsx'
import StaffDutyRoster from './StaffDutyRoster.jsx'
import StaffTasks from './StaffTasks.jsx'
import StaffNotices from './StaffNotices.jsx'
import StaffMeetings from './StaffMeetings.jsx'
import StaffDocuments from './StaffDocuments.jsx'

export default function StaffPortal() {
  const { screen = 'dashboard' } = useParams()

  // Normalize aliases: 'profile' -> 'my-profile', 'attendance' -> 'my-attendance'
  const normalizedKey =
    screen === 'profile'
      ? 'my-profile'
      : screen === 'attendance'
      ? 'my-attendance'
      : screen

  // Match the navigation item
  const currentNav =
    STAFF_NAVIGATION.find(item => item.key === normalizedKey) || STAFF_NAVIGATION[0]

  return (
    <StaffPortalLayout
      currentScreen={currentNav.key}
      title={currentNav.label}
      subtitle={currentNav.desc}
    >
      {currentNav.key === 'dashboard' && <StaffDashboard />}
      {currentNav.key === 'my-profile' && <StaffProfile />}
      {currentNav.key === 'my-attendance' && <StaffAttendance />}
      {currentNav.key === 'leave' && <StaffLeave />}
      {currentNav.key === 'duty-roster' && <StaffDutyRoster />}
      {currentNav.key === 'tasks' && <StaffTasks />}
      {currentNav.key === 'notices' && <StaffNotices />}
      {currentNav.key === 'meetings-events' && <StaffMeetings />}
      {currentNav.key === 'documents' && <StaffDocuments />}
      {!['dashboard', 'my-profile', 'my-attendance', 'leave', 'duty-roster', 'tasks', 'notices', 'meetings-events', 'documents'].includes(currentNav.key) && (
        <div className="sp-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>
            {currentNav.label}
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 20px' }}>
            This screen will be built in the next step per instructions. Screens 1, 2 & 3 are ready for review.
          </p>
          <a
            href="/staff-portal/dashboard"
            className="sp-btn-primary"
            style={{ display: 'inline-flex' }}
          >
            Back to Dashboard
          </a>
        </div>
      )}
    </StaffPortalLayout>
  )
}
