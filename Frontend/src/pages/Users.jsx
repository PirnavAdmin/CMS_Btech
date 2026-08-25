import DashboardLayout from '../layouts/DashboardLayout'

export default function Users() {
  return (
    <DashboardLayout><div className="erp-page"><header className="erp-page-heading"><div><p className="erp-eyebrow">Administration</p><h1>Users</h1><p>Manage student, faculty, and administrator accounts.</p></div></header><section className="erp-empty-state"><span aria-hidden="true">USR</span><h2>No user records</h2><p>User accounts will appear here.</p></section></div></DashboardLayout>
  )
}
