export const facultyNavigation = [
  ['dashboard', 'Dashboard'],
  ['students', 'My Students'],
  ['subjects', 'My Subjects'],
  ['timetable', 'My Timetable'],
  ['materials', 'Study Materials'],
  ['leave', 'Leave Management'],
  ['exams', 'Exams'],
  ['electives', 'Elective Approvals'],
  ['documents', 'Documents'],
  ['meetings', 'Meetings & Events'],
]
export const studentNavigation = [ ['dashboard', 'Dashboard'], ['profile', 'My Profile'], ['subjects', 'My Subjects'], ['attendance', 'My Attendance'], ['results', 'My Results'], ['timetable', 'My Timetable'], ['materials', 'Study Materials'], ['fees', 'Fee Details'], ['notifications', 'Notifications'] ]
export const portalHome = role => role === 'faculty' ? '/faculty-portal/dashboard' : role === 'student' ? '/student-portal/dashboard' : '/dashboard'
