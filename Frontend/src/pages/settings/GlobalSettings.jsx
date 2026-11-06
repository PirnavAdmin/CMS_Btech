import collegeImage from '../../assets/inter-reference/college-configuration.png'
import yearImage from '../../assets/inter-reference/academic-year-configuration.png'
import { Link } from 'react-router-dom'
import { ArrowRight, Settings2 } from 'lucide-react'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import AcademicContextSelect from '../../components/AcademicContextSelect.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import AsyncState from '../../components/AsyncState.jsx'
import { useAcademic } from '../../context/AcademicContext.jsx'
import { useScreenAccess } from '../../auth/ScreenAccess.jsx'
import './GlobalSettings.css'

export default function GlobalSettings() {
  const { selectedCollege, selectedAcademicYear, loading, error, refreshHierarchy } = useAcademic()
  const { canView, canAction } = useScreenAccess()
  return <DashboardLayout><main className="configuration-workspace">
    <PageHeader title="Global Settings" subtitle="College configuration and the working academic context." />
    <section className="configuration-context-card" aria-label="Working academic context">
      <header><Settings2 aria-hidden="true" /><h2>Working context</h2></header>
      {loading ? <AsyncState status="loading" title="Loading authorized academic context…" /> : error ? <AsyncState status="error" message={error} onRetry={refreshHierarchy} /> : <>
        <div className="configuration-context"><AcademicContextSelect kind="college" /><AcademicContextSelect kind="academicYear" /></div>
        <p>Selected: {selectedCollege?.name || selectedCollege?.collegeName || 'No college'} · {selectedAcademicYear?.name || selectedAcademicYear?.academicYearName || 'No academic year'}</p>
        <small>Your working selection is saved in this browser. Changing it does not activate or deactivate an academic year.</small>
      </>}
    </section>
    {!canView('/college-institution-management') && !canView('/academic-year-management') && <AsyncState status="empty" title="No configuration access" message="Your current permissions allow working-context selection only." />}
    <div className="configuration-grid">
      {canView('/college-institution-management') && <section className="configuration-card"><header><img src={collegeImage} alt="" /><h2>College Configuration</h2></header><p>College details, affiliation, contact information, branding and status.</p><footer><Link className="erp-btn erp-btn--primary" to="/college-institution-management">Configure colleges <ArrowRight aria-hidden="true" /></Link>{canAction('/college-institution-management', 'create') && <Link className="erp-btn erp-btn--secondary" to="/college-institution-management/add">Add college</Link>}</footer></section>}
      {canView('/academic-year-management') && <section className="configuration-card"><header><img src={yearImage} alt="" /><h2>Academic Year Configuration</h2></header><p>Manage academic years, dates and supported activation workflows for the selected college.</p><footer><Link className="erp-btn erp-btn--primary" to="/academic-year-management">Configure academic years <ArrowRight aria-hidden="true" /></Link></footer></section>}
    </div>
  </main></DashboardLayout>
}
