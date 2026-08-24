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
    label: 'Section Management',
    to: '/section-management',
    roles: [ROLES.ADMIN],
  },
  {
    label: 'Semester Management',
    to: '/semester-management',
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
            <path d="M4 12 16 5l12 7H4Z" />
            <path d="M7 14v10M12 14v10M20 14v10M25 14v10" />
            <path d="M4 25h24M2.5 28h27" />
            <path d="M15 9h2" />
          </svg>
        </span>
        <span className="sidebar-brand__copy">
          <strong>CMS–BTech</strong>
          <small>College Management</small>
        </span>
      </div>

      <nav>
        {visibleLinks.flatMap(({ label, to }) => [
          <NavLink key={to} to={to} onClick={() => setCourseMenuOpen(false)}>
            {label}
          </NavLink>,
          to === '/department-management' && userRole === ROLES.ADMIN ? (
            <details
              key="course-management"
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
          ) : null,
        ])}
      </nav>
    </aside>
  )
}
