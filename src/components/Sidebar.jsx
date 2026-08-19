import { NavLink } from 'react-router-dom'
const links = [['Dashboard', '/dashboard'], ['Users', '/users'], ['Attendance', '/attendance'], ['My Subjects', '/my-subjects']]
export default function Sidebar() { return <aside className="sidebar"><h2>BTech MS</h2><nav>{links.map(([label, to]) => <NavLink key={to} to={to}>{label}</NavLink>)}</nav></aside> }
