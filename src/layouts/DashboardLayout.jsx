import { useNavigate } from 'react-router-dom'
import { signOut } from '../auth/auth'
import Sidebar from '../components/Sidebar'

export default function DashboardLayout({ children }) {
  const navigate = useNavigate()
  const handleSignOut = () => { signOut(); navigate('/login', { replace: true }) }

  return <div className="dashboard-layout">
    <Sidebar />
    <main>
      <header className="dashboard-header"><span>BTech Management System</span><button onClick={handleSignOut}>Sign out</button></header>
      <section className="page-content">{children}</section>
    </main>
  </div>
}
