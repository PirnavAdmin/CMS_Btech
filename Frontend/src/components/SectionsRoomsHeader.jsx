import { NavLink } from 'react-router-dom'
import { FiGrid, FiUsers } from 'react-icons/fi'
import { useScreenAccess } from '../auth/ScreenAccess'
import PageHeader from './PageHeader'
import './SectionsRoomsHeader.css'

const tabs = [
  { id: 'rooms', label: 'Rooms & Classrooms', path: '/rooms-management', icon: FiGrid },
  { id: 'sections', label: 'Sections', path: '/section-management', icon: FiUsers },
]

export default function SectionsRoomsHeader({ view, compactSummary }) {
  const { canAction } = useScreenAccess()
  return <>
    <PageHeader
      title="Sections & Rooms"
      subtitle={view === 'sections'
        ? 'Manage student groups by course, branch, semester and academic year.'
        : 'Manage room capacity, facilities and section assignments.'}
      compactSummary={compactSummary}
    />
    <nav className="sections-rooms-navigation" aria-label="Sections and rooms views">
      {tabs.filter(tab => tab.id === view || canAction(tab.path, 'view')).map(({ id, label, path, icon: Icon }) => (
        <NavLink key={id} to={path}>
          <Icon aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  </>
}
