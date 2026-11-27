export const facultyNavigation = [
  ['dashboard', 'Dashboard'],
  ['students', 'My Students'],
  ['subjects', 'My Subjects'],
  ['syllabus', 'Syllabus Library'],
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
  ['subjects', 'My Academics'],
  ['timetable', 'My Timetable'],
  ['assignments', 'Assignments'],
  ['exams', 'Examinations'],
  ['materials', 'Study Materials'],
  ['attendance', 'Attendance'],
  ['results', 'Grades & Reports'],
  ['notifications', 'Announcements'],
  ['fees', 'Fee Management'],
  ['library', 'Library'],
  ['messages', 'Messages'],
  ['profile', 'My Profile'],
  ['settings', 'Settings'],
]

export const portalHome = (role, isNonTeaching = false) => {
  if (isNonTeaching || role === 'staff') return '/staff-portal/dashboard'
  return role === 'faculty' ? '/faculty-portal/dashboard' : role === 'student' ? '/student-portal/dashboard' : '/dashboard'
}
// Visible teaching workspace entries; account actions remain in the navbar.
export const facultySidebarKeys = new Set(['dashboard', 'students', 'subjects', 'syllabus', 'attendance', 'my-attendance', 'marks', 'timetable', 'materials', 'leave', 'meetings', 'placements'])
