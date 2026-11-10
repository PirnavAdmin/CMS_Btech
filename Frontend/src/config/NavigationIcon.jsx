import ModuleIcon from './ModuleIcon.jsx'
import dashboard from '../assets/inter-reference/dashboard.png'
import students from '../assets/inter-reference/total-students.png'
import faculty from '../assets/inter-reference/teaching-staff.png'
import attendance from '../assets/inter-reference/mark-attendance.png'
import fees from '../assets/inter-reference/fee-management.png'
import subjects from '../assets/inter-reference/subjects.png'
import timetable from '../assets/inter-reference/timetable.png'
import examinations from '../assets/inter-reference/create-exam.png'
import certificates from '../assets/inter-reference/certificates.png'
import sprite from '../assets/inter-reference/management-icons-sprite.png'

// These are the actual active CMS Inter sidebar illustrations, not generated substitutes.
const pictures = { workspace_dashboard: dashboard, dashboard, workspace_students: students, student_profiles: students, workspace_faculty: faculty, faculty_directory: faculty, workspace_attendance: attendance, student_attendance: attendance, workspace_fees: fees, fee_management: fees, fee_structures: fees, workspace_subjects: subjects, subjects, timetable, workspace_exams: examinations, examinations, workspace_certificates: certificates }
const positions = {
  workspace_academic_structure: '100% 100%', academic_structure: '100% 100%',
  workspace_academic: '0% 0%', departments: '0% 0%',
  faculty_attendance: '50% 0%', faculty_leaves: '100% 0%', faculty_payroll: '0% 100%',
  student_admissions: '50% 100%', courses: '100% 100%',
  // Curriculum submodules use the same illustrated sidebar language as the
  // rest of the management navigation instead of falling back to plain icons.
  credits: '0% 100%', electives: '100% 100%',
  marks: '50% 0%', results: '50% 100%',
  administration: '100% 0%', user_access: '100% 0%', roles_permissions: '100% 100%',
  campus: '0% 0%', library: '0% 0%', meetings_events: '50% 0%', placement: '50% 100%',
  settings: '0% 100%', academic_settings: '0% 100%',
  // Admin navigation renders parent workspace IDs, so map those IDs too.
  workspace_administration: '100% 0%', workspace_campus: '0% 0%', workspace_settings: '0% 100%',
  workspace_student_fees: '50% 0%'
}
export default function NavigationIcon({ moduleId, icon }) {
  if (pictures[moduleId]) return <img className="reference-nav-icon" src={pictures[moduleId]} alt="" aria-hidden="true" />
  if (positions[moduleId]) return <span className="reference-nav-icon reference-nav-icon--sprite" aria-hidden="true" style={{ backgroundImage: `url(${sprite})`, backgroundPosition: positions[moduleId] }} />
  return <ModuleIcon icon={icon} />
}
