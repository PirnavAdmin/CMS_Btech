export const facultyNavigation = [
  ['dashboard', 'Dashboard'],
  ['students', 'My Students'],
  ['subjects', 'My Subjects'],
  ['attendance', 'Student Attendance'],
  ['my-attendance', 'My Attendance'],
  ['marks', 'Marks Entry'],
  ['timetable', 'My Timetable'],
  ['materials', 'Study Materials'],
  ['leave', 'Leave Management'],
  ['meetings', 'Meetings & Events'],
  ['placements', 'Placement Coordination'],
  ['exams', 'Exams'],
  ['electives', 'Elective Approvals'],
  ['documents', 'Documents'],
  ['notifications', 'Notifications'],
  ['profile', 'My Profile'],
]

export const studentNavigation = [
  ['dashboard', 'Dashboard'],
  ['profile', 'My Profile'],
  ['subjects', 'My Subjects'],
  ['attendance', 'My Attendance'],
  ['results', 'My Results'],
  ['timetable', 'My Timetable'],
  ['materials', 'Study Materials'],
  ['fees', 'Fee Details'],
  ['notifications', 'Notifications'],
]

export const portalHome = (role, isNonTeaching = false) => {
  if (isNonTeaching || role === 'staff') return '/staff-portal/dashboard'
  return role === 'faculty' ? '/faculty-portal/dashboard' : role === 'student' ? '/student-portal/dashboard' : '/dashboard'
}
// Visible teaching workspace entries; account actions remain in the navbar.
export const facultySidebarKeys = new Set(['dashboard', 'students', 'subjects', 'attendance', 'my-attendance', 'marks', 'timetable', 'materials', 'leave', 'meetings', 'placements'])
