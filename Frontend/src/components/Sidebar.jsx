import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
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
  const { pathname } = useLocation()
  const isCoursePage = pathname.startsWith('/courses') || pathname.startsWith('/branches')
  const [courseMenuOpen, setCourseMenuOpen] = useState(false)

  const visibleLinks = links.filter((link) =>
    link.roles.includes(userRole)
  )

  return (
    <aside className="sidebar">
      <div className="sidebar-brand" aria-label="CMS BTech">
        <span className="sidebar-brand__mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" role="img">
            <path d="M3 11.5 16 5l13 6.5L16 18 3 11.5Z" />
            <path d="M8 15.2V21c0 2.4 3.6 4.5 8 4.5s8-2.1 8-4.5v-5.8L16 19l-8-3.8Z" />
            <path d="M28.7 12v8" />
          </svg>
        </span>
        <span className="sidebar-brand__copy">
          <strong>CMS–BTech</strong>
          <small>College Management</small>
        </span>
      </div>

      <nav>
        {visibleLinks.map(({ label, to }) => (
          <NavLink key={to} to={to} onClick={() => setCourseMenuOpen(false)}>
            {label}
          </NavLink>
        ))}
        {userRole === ROLES.ADMIN && (
          <details
            className="sidebar-group"
            open={isCoursePage || courseMenuOpen}
            onToggle={(event) => setCourseMenuOpen(event.currentTarget.open)}
          >
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
