import { NavLink } from 'react-router-dom'
import { getUserRole } from '../auth/auth'
import { ROLES } from '../auth/roles'

const links = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    roles: [
      ROLES.ADMIN,
      ROLES.FACULTY,
      ROLES.STUDENT,
    ],
  },
  {
    label: 'Users',
    to: '/users',
    roles: [ROLES.ADMIN],
  },
  {
    label: 'College / Institution',
    to: '/college-institution-management',
    roles: [ROLES.ADMIN],
  },
  {
    label: 'Academic Years',
    to: '/academic-year-management',
    roles: [ROLES.ADMIN],
  },
  {
    label: 'Departments',
    to: '/department-management',
    roles: [ROLES.ADMIN],
  },
  {
    label: 'Courses & Branches',
    to: '/course-branch-management',
    roles: [ROLES.ADMIN],
  },
  {
    label: 'Attendance',
    to: '/attendance',
    roles: [
      ROLES.ADMIN,
      ROLES.FACULTY,
    ],
  },
  {
    label: 'My Subjects',
    to: '/my-subjects',
    roles: [
      ROLES.FACULTY,
      ROLES.STUDENT,
    ],
  },
]

export default function Sidebar() {
  const userRole = getUserRole()

  const visibleLinks = links.filter((link) =>
    link.roles.includes(userRole)
  )

  return (
    <aside className="sidebar">
      <h2>BTech MS</h2>

      <nav>
        {visibleLinks.map(({ label, to }) => (
          <NavLink key={to} to={to}>
            {label}
          </NavLink>
        ))}
        {userRole === ROLES.ADMIN && (
          <details className="sidebar-group" open>
            <summary>Course Management</summary>
            <div>
              <NavLink to="/courses">Courses</NavLink>
              <NavLink to="/branches">Branches</NavLink>
            </div>
          </details>
        )}
      </nav>
    </aside>
  )
}
