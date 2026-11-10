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
const positions = { workspace_academic_structure: '100% 100%', academic_structure: '100% 100%', workspace_academic: '0% 0%', departments: '0% 0%', faculty_attendance: '50% 0%', faculty_leaves: '100% 0%', faculty_payroll: '0% 100%', student_admissions: '50% 100%', courses: '100% 100%' }
export default function NavigationIcon({ moduleId, icon }) {
  if (pictures[moduleId]) return <img className="reference-nav-icon" src={pictures[moduleId]} alt="" aria-hidden="true" />
  if (positions[moduleId]) return <span className="reference-nav-icon reference-nav-icon--sprite" aria-hidden="true" style={{ backgroundImage: `url(${sprite})`, backgroundPosition: positions[moduleId] }} />
  return <ModuleIcon icon={icon} />
}
