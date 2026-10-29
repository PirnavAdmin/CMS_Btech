export const facultyRoutes = [
  { path: '/faculty-portal/events', screen: 'events', title: 'Campus Events', phase: 'D' },
  { path: '/faculty-portal/placements', screen: 'placements', title: 'Placement Coordination', phase: 'D' },
  { path: '/faculty-portal/dashboard', screen: 'dashboard', title: 'Dashboard', phase: 'A' },
  { path: '/faculty-portal/students', screen: 'students', title: 'My Students', phase: 'B' },
  { path: '/faculty-portal/subjects', screen: 'subjects', title: 'My Subjects', phase: 'B' },
  { path: '/faculty-portal/attendance', screen: 'attendance', title: 'Attendance Management', phase: 'C' },
  { path: '/faculty-portal/my-attendance', screen: 'my-attendance', title: 'My Attendance', phase: 'C' },
  { path: '/faculty-portal/marks', screen: 'marks', title: 'Marks Entry', phase: 'C' },
  { path: '/faculty-portal/timetable', screen: 'timetable', title: 'My Timetable', phase: 'B' },
  { path: '/faculty-portal/exams', screen: 'exams', title: 'Exams', phase: 'D' },
  { path: '/faculty-portal/electives', screen: 'electives', title: 'Elective Approvals', phase: 'D' },
  { path: '/faculty-portal/documents', screen: 'documents', title: 'Documents', phase: 'D' },
  { path: '/faculty-portal/meetings', screen: 'meetings', title: 'Meetings & Events', phase: 'D' },
  { path: '/faculty-portal/profile', screen: 'profile', title: 'My Profile', phase: 'D' },
  { path: '/faculty-portal/notifications', screen: 'notifications', title: 'Notifications', phase: 'E' },
  { path: '/faculty-portal/materials', screen: 'materials', title: 'Study Materials', phase: 'E' },
  { path: '/faculty-portal/leave', screen: 'leave', title: 'Leave Management', phase: 'E' },
]

export const facultyRouteByPath = Object.fromEntries(
  facultyRoutes.map(route => [route.path, route]),
)

// Keep the established teaching workflows active when the generic workspace evolves.
export const restoredFacultyScreens = ['attendance', 'my-attendance', 'marks', 'leave', 'events', 'meetings', 'placements']
