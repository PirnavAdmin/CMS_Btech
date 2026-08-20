import DashboardLayout from '../../layouts/DashboardLayout'

export default function Settings() {
  return <DashboardLayout><div className="settings-page">
    <header><h1>Settings</h1><p>Manage your account preferences.</p></header>
    <section className="settings-card"><h2>Account Preferences</h2><p>Additional notification, appearance, and security preferences can be configured here when their backend services are available.</p></section>
  </div></DashboardLayout>
}
