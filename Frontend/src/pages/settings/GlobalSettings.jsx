import collegeImage from '../../assets/inter-reference/college-configuration.png'
import yearImage from '../../assets/inter-reference/academic-year-configuration.png'
import { Link } from 'react-router-dom'
import { ArrowRight, Hash, Settings2 } from 'lucide-react'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import AcademicContextSelect from '../../components/AcademicContextSelect.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import AsyncState from '../../components/AsyncState.jsx'
import { useAcademic } from '../../context/AcademicContext.jsx'
import { useScreenAccess } from '../../auth/ScreenAccess.jsx'
import './GlobalSettings.css'

export default function GlobalSettings() {
  const { selectedCollegeId, selectedCollege, selectedAcademicYear, loading, error, refreshHierarchy } = useAcademic()
  const { canView, canAction } = useScreenAccess()
  return <DashboardLayout><main className="configuration-workspace">
    <PageHeader title="Global Settings" subtitle="College configuration and the working academic context." />
    <section className="configuration-context-card" aria-labelledby="working-context-heading">
      <header><Settings2 aria-hidden="true" /><h2 id="working-context-heading">Working Context</h2></header>
      {loading ? <AsyncState status="loading" title="Loading authorized academic context…" /> : error ? <AsyncState status="error" message={error} onRetry={refreshHierarchy} /> : <>
        <div className="configuration-context"><AcademicContextSelect kind="college" /><AcademicContextSelect kind="academicYear" /></div>
        <p>Selected: {selectedCollege?.name || selectedCollege?.collegeName || 'No college'} · {selectedAcademicYear?.name || selectedAcademicYear?.academicYearName || 'No academic year'}</p>
        <small>Your working selection is saved in this browser. Changing it does not activate or deactivate an academic year.</small>
      </>}
    </section>
    {!canView('/college-institution-management') && !canView('/academic-year-management') && <AsyncState status="empty" title="No configuration access" message="Your current permissions allow working-context selection only." />}
    <div className="configuration-grid">
      {canView('/college-institution-management') && <section className="configuration-card" aria-labelledby="college-configuration-heading"><header><img src={collegeImage} alt="" /><h2 id="college-configuration-heading">College Configuration</h2></header><p>View and edit college details, affiliation, contact information, branding and status.</p><footer><Link className="erp-btn erp-btn--primary" to="/college-institution-management">Configure colleges <ArrowRight aria-hidden="true" /></Link>{canAction('/college-institution-management', 'create') && <Link className="erp-btn erp-btn--secondary" to="/college-institution-management/add">Add college</Link>}</footer></section>}
      {canView('/academic-year-management') && <section className="configuration-card" aria-labelledby="year-configuration-heading"><header><img src={yearImage} alt="" /><h2 id="year-configuration-heading">Academic Year Configuration</h2></header><p>View, edit and manage dates and activation for the selected college’s academic years.</p>{!loading && !selectedCollegeId && <small>Select a working college to configure academic years.</small>}<footer><Link className="erp-btn erp-btn--primary" to="/academic-year-management">Configure academic years <ArrowRight aria-hidden="true" /></Link>{selectedCollegeId && !loading && !error && canAction('/academic-year-management', 'create') && <Link className="erp-btn erp-btn--secondary" to="/academic-year-management?action=add">Add academic year</Link>}</footer></section>}
      {canView('/settings') && <section className="configuration-card" aria-labelledby="number-series-heading"><header><Hash aria-hidden="true" /><h2 id="number-series-heading">ID &amp; Number Series</h2></header><p>Configure automatic student admission numbers, teaching staff IDs, non-teaching staff IDs, examination codes, and other institutional numbering formats.</p><footer><Link className="erp-btn erp-btn--primary" to="/settings/number-series">Manage Number Series <ArrowRight aria-hidden="true" /></Link></footer></section>}
    </div>
  </main></DashboardLayout>
}
