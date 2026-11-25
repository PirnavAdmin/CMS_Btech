import collegeImage from '../../assets/inter-reference/college-configuration.png'
import yearImage from '../../assets/inter-reference/academic-year-configuration.png'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowRight, Hash, Image, Settings2, ClipboardList } from 'lucide-react'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import AcademicContextSelect from '../../components/AcademicContextSelect.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import AsyncState from '../../components/AsyncState.jsx'
import { useAcademic } from '../../context/AcademicContext.jsx'
import { useScreenAccess } from '../../auth/ScreenAccess.jsx'
import { demoRequestsApi, uploadPlatformLogo } from '../../api/apiEndpoints.js'
import './GlobalSettings.css'

export default function GlobalSettings() {
  const screenAccess = useScreenAccess()
  return <DashboardLayout><main className="configuration-workspace">
    {screenAccess.access?.isSuperAdmin === true
      ? <PlatformSettings />
      : <CollegeSettings screenAccess={screenAccess} />}
  </main></DashboardLayout>
}

function PlatformSettings() {
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  const saveLogo = async event => {
    event.preventDefault()
    if (!file || saving) return
    if (!/\.(png|jpe?g)$/i.test(file.name) || file.size > 2 * 1024 * 1024) {
      setNotice({ error: true, message: 'Choose a JPG, JPEG, or PNG file up to 2 MB.' })
      return
    }
    const form = event.currentTarget
    setSaving(true)
    setNotice(null)
    try {
      await uploadPlatformLogo(file)
      form.reset()
      setFile(null)
      setNotice({ message: 'Platform logo saved.' })
    } catch (error) {
      setNotice({ error: true, message: error.message || 'The platform logo could not be uploaded.' })
    } finally {
      setSaving(false)
    }
  }

  return <>
    <PageHeader title="Global Settings" />
    <div className="configuration-grid">
      <section className="configuration-card" aria-labelledby="platform-logo-heading">
        <header><Image aria-hidden="true" /><h2 id="platform-logo-heading">Upload Logo</h2></header>
        <p>Update the logo shown on the public landing page and in the platform sidebar.</p>
        <form onSubmit={saveLogo}>
          <footer>
            <input type="file" aria-label="Platform logo" accept=".png,.jpg,.jpeg" disabled={saving} onChange={event => { setFile(event.target.files[0] ?? null); setNotice(null) }} />
            <button className="erp-btn erp-btn--primary" type="submit" disabled={!file || saving}>{saving ? 'Uploading…' : 'Upload logo'}</button>
          </footer>
          <small>JPG, JPEG, or PNG up to 2 MB.</small>
          {notice && <p role={notice.error ? 'alert' : 'status'}>{notice.message}</p>}
        </form>
      </section>
      <DemoRequestRecipient />
    </div>
  </>
}

function DemoRequestRecipient() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    let active = true
    demoRequestsApi.getRecipient()
      .then(value => { if (active) setEmail(value) })
      .catch(error => { if (active) setNotice({ error: true, message: error.message || 'The recipient could not be loaded.' }) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const save = async event => {
    event.preventDefault()
    if (loading || saving) return
    setSaving(true)
    setNotice(null)
    try {
      setEmail(await demoRequestsApi.saveRecipient(email.trim()))
      setNotice({ message: 'Demo request recipient saved.' })
    } catch (error) {
      setNotice({ error: true, message: error.message || 'The recipient could not be saved.' })
    } finally {
      setSaving(false)
    }
  }

  return <section className="configuration-card" aria-labelledby="platform-demo-heading">
    <header><ClipboardList aria-hidden="true" /><h2 id="platform-demo-heading">Demo Request Information</h2></header>
    <p>New demo requests will be emailed to this address.</p>
    <form className="configuration-recipient" onSubmit={save} aria-busy={loading || saving}>
      <label htmlFor="demo-recipient-email">Recipient email</label>
      <input id="demo-recipient-email" type="email" value={email} maxLength={254} required disabled={loading || saving} onChange={event => { setEmail(event.target.value); setNotice(null) }} />
      <footer><button className="erp-btn erp-btn--primary" type="submit" disabled={loading || saving || !email.trim()}>{saving ? 'Saving…' : 'Save recipient'}</button></footer>
      {notice && <p role={notice.error ? 'alert' : 'status'}>{notice.message}</p>}
    </form>
  </section>
}

function CollegeSettings({ screenAccess }) {
  const { selectedCollegeId, selectedCollege, selectedAcademicYear, loading, error, refreshHierarchy } = useAcademic()
  const { canView, canAction, loading: accessLoading, error: accessError } = screenAccess
  return <>
    <PageHeader title="Global Settings" subtitle="College configuration and the working academic context." />
    <section className="configuration-context-card" aria-labelledby="working-context-heading">
      <header><Settings2 aria-hidden="true" /><h2 id="working-context-heading">Working Context</h2></header>
      {loading ? <AsyncState status="loading" title="Loading authorized academic context…" /> : error ? <AsyncState status="error" message={error} onRetry={refreshHierarchy} /> : <>
        <div className="configuration-context"><AcademicContextSelect kind="college" /><AcademicContextSelect kind="academicYear" activeOnly /></div>
        <p>Selected: {selectedCollege?.name || selectedCollege?.collegeName || 'No college'} · {selectedAcademicYear?.name || selectedAcademicYear?.academicYearName || 'No academic year'}</p>
        <small>Your working selection is saved in this browser. Changing it does not activate or deactivate an academic year.</small>
      </>}
    </section>
    {!loading && !error && !accessLoading && !accessError && !canView('/college-institution-management') && !canView('/academic-year-management') && <AsyncState status="empty" title="No configuration access" message="Your current permissions allow working-context selection only." />}
    <div className="configuration-grid">
      {canView('/college-institution-management') && <section className="configuration-card" aria-labelledby="college-configuration-heading"><header><img src={collegeImage} alt="" /><h2 id="college-configuration-heading">College Profile</h2></header><p>View and edit college details, affiliation, contact information, branding and status.</p><footer><Link className="erp-btn erp-btn--primary" to="/college-profile">View college profile <ArrowRight aria-hidden="true" /></Link></footer></section>}
      {canView('/college-institution-management') && <section className="configuration-card"><header><Settings2 aria-hidden="true" /><h2>Campus Management</h2></header><p>View campus availability for your assigned college.</p><footer><Link className="erp-btn erp-btn--primary" to="/campus-management">Manage campuses <ArrowRight aria-hidden="true" /></Link></footer></section>}
      {canView('/academic-year-management') && <section className="configuration-card" aria-labelledby="year-configuration-heading"><header><img src={yearImage} alt="" /><h2 id="year-configuration-heading">Academic Year Configuration</h2></header><p>View, edit and manage dates and activation for the selected college’s academic years.</p>{!loading && !selectedCollegeId && <small>Select a working college to configure academic years.</small>}<footer><Link className="erp-btn erp-btn--primary" to="/academic-year-management">Configure academic years <ArrowRight aria-hidden="true" /></Link>{selectedCollegeId && !loading && !error && canAction('/academic-year-management', 'create') && <Link className="erp-btn erp-btn--secondary" to="/academic-year-management?action=add">Add academic year</Link>}</footer></section>}
      {canView('/settings') && <section className="configuration-card" aria-labelledby="number-series-heading"><header><Hash aria-hidden="true" /><h2 id="number-series-heading">ID &amp; Number Series</h2></header><p>Configure automatic student admission numbers, teaching staff IDs, non-teaching staff IDs, examination codes, and other institutional numbering formats.</p><footer><Link className="erp-btn erp-btn--primary" to="/settings/number-series">Manage Number Series <ArrowRight aria-hidden="true" /></Link></footer></section>}
    </div>
  </>
}
