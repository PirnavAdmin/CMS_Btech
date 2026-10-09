import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, Navigate, NavLink, Route, Routes, useNavigate, useParams, useLocation } from 'react-router-dom'
import { FiCopy, FiEdit2, FiEye, FiInfo, FiMoreVertical, FiPlus, FiRefreshCw, FiTrash2 } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import PageHeader from '../../components/PageHeader'
import ExportMenu from '../../components/ExportMenu'
import EmptyState from '../../components/EmptyState'
import { useAcademic } from '../../context/AcademicContext'
import { studentProfilesApi } from '../../api/apiEndpoints'
import { getAuthStorage } from '../../auth/auth'
import { collegeField } from '../../utils/collegeScope'
import { printSingleRecord } from '../../utils/exportUtils'
import { showError, showSuccess } from '../../utils/toast'
import FeeStructureConfiguration from './FeeStructure'
import FeeStructureWizard, { FeeBadge, FeeDialog, FeeInput, FeeReview, FeeSelect, FeeStats, FeeTable, financialLedgerRows } from './FeeStructureWizard'
import ServerFeeCollection from './ServerFeeCollection'
import { assignFeeStructure, collectWorkspacePayment, emptyFeeWorkspace, feeLedger, feeMoney, feeToday, feeTotal, feeTransitions, newFeeStructure, readFeeWorkspace, rupees, saveFeeAdjustment, saveFeeComponent, saveWorkflowStructure, studentMatchesFee, transitionFeeAdjustment, transitionFeeStructure, writeFeeWorkspace } from './feeStructureService'
import './FeeStructure.css'
import { studentAccountOperations } from './feeNavigation'

const sections = [
  ['overview', 'Overview', ['overview']],
  ['structures', 'Fee Structures', ['structures', 'components']],
  ['students', 'Student Accounts', ['students', 'assignments', 'concessions', 'dues', 'ledger']],
  ['receipts', 'Collections', ['collection', 'receipts', 'refunds']],
  ['reports', 'Reports', ['reports']],
]
const secondarySections = {
  receipts: [['receipts', 'Recent Collections'], ['collection', 'Collect Fee'], ['refunds', 'Refund Requests']],
}
const options = (rows, type) => rows.map(r => ({ ...r, id: String(r[`${type}Id`] ?? r.id), name: r[`${type}Name`] || r.name || '', courseId: collegeField(r, 'course'), branchId: collegeField(r, 'branch') })).filter(r => r.id && r.name)
const unique = values => [...new Set(values.filter(Boolean))].sort()
const text = (...values) => values.find(v => typeof v === 'string' && v.trim()) || ''
function studentRecord(r) {
  let form = r.formData || {}
  if (typeof form === 'string') { try { form = JSON.parse(form) } catch { form = {} } }
  const academic = { ...form.academic, ...r.academicDetails, ...r.academicInformation, ...r.academic }, personal = { ...form.personal, ...r.personalInformation, ...r.personal }, admission = { ...form.admission, ...r.admission }
  const merged = { ...r, academic }, id = r.studentId ?? r.studentProfileId ?? r.header?.studentId ?? r.id
  return { id: String(id), name: text(r.studentName, r.fullName, r.name, r.header?.studentName, personal.fullName, personal.studentName, [personal.firstName, personal.lastName].filter(Boolean).join(' ')), code: text(r.studentCode, id ? String(id) : ''), roll: text(r.rollNumber, r.rollNo, r.summary?.rollNumber, academic.rollNumber, r.registrationNumber), application: text(r.applicationNumber, r.applicationNo, admission.applicationNumber, r.admissionNumber, r.summary?.admissionNumber), academicYearId: String(collegeField(merged, 'academicYear') || ''), courseId: String(collegeField(merged, 'course') || ''), branchId: String(collegeField(merged, 'branch') || ''), semesterId: String(collegeField(merged, 'semester') || ''), semesterNumber: academic.semesterNumber ?? r.semester ?? academic.semester, courseName: text(r.courseName, r.course, academic.courseName, academic.course), branchName: text(r.branchName, r.branch, academic.branchName, academic.branch), batch: text(r.batch, academic.batch, admission.batch), category: text(r.admissionQuota, r.quota, academic.quota, r.studentCategory, academic.studentCategory, r.admissionType, academic.entryType) }
}
const studentSearch = (student, query) => `${student.name} ${student.code} ${student.roll} ${student.application}`.toLowerCase().includes(query.toLowerCase().trim())
export default function FeeManagement() {
  return <Routes><Route path="legacy" element={<Navigate to="/fees/structures" replace />} /><Route path="*" element={<FeeWorkspace />} /></Routes>
}
function FeeWorkspace() {
  const academic = useAcademic(), navigate = useNavigate(), { pathname } = useLocation()
  const editingStructure = pathname.startsWith('/fees/structures/')
  const currentSection = pathname.split('/')[2] || 'overview'
  const primarySection = sections.find(([, , paths]) => paths.includes(currentSection))?.[0] || 'overview'
  const [state, setState] = useState(emptyFeeWorkspace), [workspaceCollege, setWorkspaceCollege] = useState(null), [storageError, setStorageError] = useState(''), [students, setStudents] = useState([]), [studentError, setStudentError] = useState(''), [loading, setLoading] = useState(true), [retry, setRetry] = useState(0)
  const [filter, setFilter] = useState({ academicYearId: academic.selectedAcademicYearId || '', courseId: '', branchId: '', batch: '', semesterId: '', category: '' })
  const [reportActions, setReportActions] = useState(null)
  const setStructureForm = value => navigate(value.id ? `/fees/structures/${value.id}/edit` : '/fees/structures/create', { state: { initialStructure: value, collegeId: academic.selectedCollegeId } })
  useEffect(() => { try { setState(readFeeWorkspace(academic.selectedCollegeId)); setWorkspaceCollege(academic.selectedCollegeId); setStorageError('') } catch (e) { setWorkspaceCollege(null); setStorageError(e.message) } }, [academic.selectedCollegeId])
  useEffect(() => setFilter(f => ({ ...f, academicYearId: academic.selectedAcademicYearId || '' })), [academic.selectedAcademicYearId])
  useEffect(() => {
    let active = true
    setLoading(true); setStudentError(''); setStudents([])
    const load = async () => {
      const rows = await studentProfilesApi.getAll({ collegeId: academic.selectedCollegeId })
      // Directory DTO omits batch and quota; reuse the existing profile preview
      // endpoint rather than inventing intake data. Bound concurrent requests.
      const scoped = academic.scopeRecords(rows), expanded = []
      for (let start = 0; start < scoped.length && active; start += 4) {
        const batch = await Promise.all(scoped.slice(start, start + 4).map(async row => {
          if (studentRecord(row).batch) return row
          const detail = await studentProfilesApi.preview(row.studentId ?? row.id)
          return { ...row, ...detail }
        }))
        expanded.push(...batch)
      }
      if (active) setStudents(expanded)
    }
    load().catch(e => { if (active) setStudentError(e.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [academic.selectedCollegeId, academic.scopeRecords, retry])
  const scopeRecords = academic.scopeRecords
  const normalizedStudents = useMemo(() => scopeRecords(students).map(studentRecord).filter(s => s.id !== 'undefined'), [students, scopeRecords])
  const masters = { years: options(academic.academicYears, 'academicYear'), courses: options(academic.courses, 'course'), branches: options(academic.branches, 'branch'), semesters: options(academic.semesters, 'semester'), batches: unique([...normalizedStudents.map(s => s.batch), ...state.structures.map(s => s.batch)]), batchScopes: [...normalizedStudents, ...state.structures].map(({ academicYearId, courseId, branchId, batch }) => ({ academicYearId, courseId, branchId, batch })), categories: unique(normalizedStudents.map(s => s.category)) }
  const enrichedStudents = normalizedStudents.map(s => {
    const semesterMatches = masters.semesters.filter(m => Number(m.semesterNumber) === Number(s.semesterNumber) && (!m.courseId || String(m.courseId) === s.courseId) && (!m.branchId || String(m.branchId) === s.branchId) && (!m.academicYearId || String(m.academicYearId) === s.academicYearId))
    return { ...s, semesterId: s.semesterId || (semesterMatches.length === 1 ? semesterMatches[0].id : ''), courseName: s.courseName || masters.courses.find(c => c.id === s.courseId)?.name || '', branchName: s.branchName || masters.branches.find(b => b.id === s.branchId)?.name || '' }
  })
  const actor = getAuthStorage()?.getItem('btech-user-name') || getAuthStorage()?.getItem('btech-user-id') || 'Administrator'
  const commit = next => { if (storageError) throw new Error(storageError); const saved = writeFeeWorkspace(next, academic.selectedCollegeId); setState(saved); showSuccess('Fee workspace saved.') }
  const action = fn => { try { fn() } catch (e) { showError(e.message) } }
  const matches = row => Object.entries(filter).every(([key, value]) => !value || String(row[key] || '') === String(value))
  const assignments = state.assignments.filter(a => matches({ ...a.structure, semesterId: a.student.semesterId, category: a.student.category })), ledgers = assignments.map(a => ({ ...a, ledger: feeLedger(state, a) }))
  const shared = { state, commit, action, actor, masters, filter, setFilter, assignments, ledgers }
  const createStructure = () => { const s = newFeeStructure(filter.academicYearId); s.academicYearName = masters.years.find(y => y.id === String(s.academicYearId))?.name || ''; setStructureForm(s) }
  const tools = primarySection === 'receipts' ? secondarySections.receipts : null
  const moduleName = sections.find(([path]) => path === primarySection)?.[1]
  const titles = { overview: ['Fee Management', 'Monitor collections, outstanding balances and student fee activity.'], structures: ['Fee Structures', 'Configure fee plans across academic programs, branches and batches.'], components: ['Fee Component Master', 'Define reusable fee components to select when building fee structures.'], students: ['Student Accounts', 'Find students and review their complete financial position.'], receipts: ['Collections', 'Process and track student fee payments.'], collection: ['Collect Fee', 'Find a student, review dues and record a payment.'], reports: ['Fee Reports & Analytics', 'Analyze collections, receivables and student financial performance.'] }
  titles.dues = ['Dues & Penalties', 'Review overdue balances and applicable penalties.']
  titles.ledger = ['Student Financial Profile', 'Review the student ledger, payments and outstanding dues.']
  const [title, subtitle] = titles[currentSection] || [moduleName || 'Fee Management', 'Manage institutional fees and student accounts.']
  const accountSection = primarySection === 'students'
  return <DashboardLayout><main className={`fs-page fm-page${accountSection ? ' fm-student-pages' : ''}${currentSection === 'structures' && !editingStructure ? ' fm-structures-page' : ''}`}>
    {studentAccountOperations.some(operation => operation.to === `/fees/${currentSection}`) && <Link className="fm-account-back" to="/fees/students">&#8592; Student Accounts</Link>}
    {['collection', 'refunds'].includes(currentSection) && <Link className="fm-account-back" to="/fees/receipts">&#8592; Collections</Link>}
    {!editingStructure && !['structures', 'students', 'assignments', 'concessions'].includes(currentSection) && <PageHeader title={title} subtitle={subtitle}>
      {currentSection === 'reports' && <div ref={setReportActions} />}
      {currentSection === 'overview' && <FeeSelect label="Academic Year" value={filter.academicYearId} options={[{ id: '', name: 'All years' }, ...masters.years]} onChange={academicYearId => setFilter(f => ({ ...f, academicYearId }))} />}
      {['overview', 'receipts'].includes(currentSection) && <Link className="fm-link-button primary" to="/fees/collection"><FiPlus /> Collect Fee</Link>}
      {tools && <details key={pathname} className="fm-module-tools"><summary>{moduleName} tools</summary><nav aria-label={`${moduleName} tools`}>{tools.map(([path, label]) => <NavLink key={path} to={`/fees/${path}`}>{label}</NavLink>)}</nav></details>}
      {currentSection === 'components' && <Link className="fm-link-button" to="/fees/structures">Back to Fee Structures</Link>}
    </PageHeader>}
    {storageError && <p role="alert" className="fm-error">{storageError} <button onClick={() => window.location.reload()}>Reload</button></p>}
    {!academic.selectedCollegeId ? <p className="fm-notice">Select a college in the header to manage its fees.</p> : editingStructure && (workspaceCollege !== academic.selectedCollegeId || storageError) ? !storageError && <p role="status">Loading fee configuration…</p> : <Routes>
      <Route index element={<Navigate to="/fees/overview" replace />} />
      <Route path="overview" element={<FinancialSource server={<ServerFeeCollection page="reports" academic={academic} overview academicYearId={filter.academicYearId} configuration={state} />} workspace={<><Filters {...shared} /><Overview {...shared} openLedger={id => navigate(`/fees/ledger/${id}`)} /></>} />} />
      <Route path="components" element={<><ComponentMaster {...shared} /></>} />
      <Route path="structures" element={storageError ? null : workspaceCollege !== academic.selectedCollegeId ? <p role="status">Loading fee configuration…</p> : <AcademicStructureWorkspace key={academic.selectedCollegeId} {...shared} create={createStructure} setForm={setStructureForm} />} />
      <Route path="structures/create" element={<StructureEditorRoute {...shared} collegeId={academic.selectedCollegeId} enrichedStudents={enrichedStudents} />} />
      {['hostel', 'transport'].map(type => <Route key={type} path={`structures/${type}`}>
        <Route path="create" element={<FeeStructureConfiguration key={`${academic.selectedCollegeId}:${type}:create`} embedded facilityType={type} />} />
        <Route path=":facilityId/edit" element={<FeeStructureConfiguration key={`${academic.selectedCollegeId}:${type}:edit`} embedded facilityType={type} />} />
      </Route>)}
      <Route path="structures/:structureId/edit" element={<StructureEditorRoute {...shared} collegeId={academic.selectedCollegeId} enrichedStudents={enrichedStudents} />} />
      <Route path="students" element={<><StudentAccounts {...shared} /></>} />
      <Route path="assignments" element={<Assignments {...shared} students={enrichedStudents.filter(matches)} loading={loading} error={studentError} retry={() => setRetry(n => n + 1)} />} />
      <Route path="collection" element={<FinancialSource server={<ServerFeeCollection page="collection" academic={academic} />} workspace={<><Filters {...shared} /><Collection {...shared} /></>} />} />
      <Route path="ledger/:assignmentId" element={<LedgerRoute {...shared} />} />
      <Route path="concessions" element={<Adjustments {...shared} kind="concessions" />} />
      <Route path="dues" element={<FinancialSource server={<ServerFeeCollection page="dues" academic={academic} />} workspace={<><Filters {...shared} /><Dues {...shared} /></>} />} />
      <Route path="refunds" element={<><Filters {...shared} /><Adjustments {...shared} kind="refunds" /></>} />
      <Route path="receipts" element={<FinancialSource server={<ServerFeeCollection page="receipts" academic={academic} />} workspace={<><Filters {...shared} /><Receipts {...shared} /></>} />} />
      <Route path="reports" element={<FinancialSource server={<ServerFeeCollection page="reports" academic={academic} configuration={state} reportHeaderSlot={reportActions} />} workspace={<><Filters {...shared} /><Reports {...shared} /></>} />} />
      <Route path="*" element={<Navigate to="/fees/overview" replace />} />
    </Routes>}
    {!editingStructure && ['components', 'students', 'assignments', 'concessions', 'refunds', 'ledger'].includes(currentSection) && <StorageNotice />}
  </main></DashboardLayout>
}
function StructureEditorRoute({ state, commit, actor, masters, filter, collegeId, enrichedStudents = [] }) {
  const { structureId } = useParams(), { state: routeState, key } = useLocation(), navigate = useNavigate()
  const value = structureId ? state.structures.find(s => s.id === structureId) : (routeState?.collegeId === collegeId && routeState.initialStructure) || { ...newFeeStructure(filter.academicYearId), academicYearName: masters.years.find(y => y.id === String(filter.academicYearId))?.name || '' }
  if (!value) return <p className="fm-error" role="alert">Fee structure not found. <Link to="/fees/structures">Back to Fee Structures</Link></p>
  if (value.id && (value.status !== 'Draft' || structureDraftAssigned(state, value.id))) return <p className="fm-error" role="alert">Only unassigned drafts can be edited. Create a revision from <Link to="/fees/structures">Fee Structures</Link>.</p>
  return <FeeStructureWizard key={`${collegeId}:${key}`} value={value} masters={masters} components={state.components} close={() => navigate('/fees/structures')} save={(form, status) => { commit(saveWorkflowStructure(state, form, status, actor)); navigate('/fees/structures') }} students={enrichedStudents} existingStructures={state.structures} />
}
function StorageNotice() { return <details className="fm-data-note"><summary>About saved configurations</summary><p>Fee configurations and assignments are saved on this device for the selected college. They do not post charges or payments to the institution's accounts.</p></details> }
function FinancialSource({ server, workspace }) {
  const [expanded, setExpanded] = useState(false)
  const debug = import.meta.env.DEV && new URLSearchParams(window.location.search).get('feeDebug') === 'true'
  return <>{server}{debug && <details className="fm-dev-tools" onToggle={e => setExpanded(e.currentTarget.open)}><summary>Development tools</summary>{expanded && <><StorageNotice />{workspace}</>}</details>}</>
}
function Filters({ masters, filter: f, setFilter, full = false, compact = false, inline = false, onClear, trailingFields, clearLabel = 'Clear filters' }) {
  const change = values => setFilter({ ...f, ...values })
  const clear = () => { setFilter({ academicYearId: '', courseId: '', branchId: '', batch: '', semesterId: '', category: '' }); onClear?.() }
  const fields = <><FeeSelect label="Academic Year" value={f.academicYearId} options={[{ id: '', name: 'All years' }, ...masters.years]} onChange={academicYearId => change({ academicYearId, semesterId: '' })} /><FeeSelect label="Course" value={f.courseId} options={[{ id: '', name: 'All courses' }, ...masters.courses]} onChange={courseId => change({ courseId, branchId: '', semesterId: '' })} /><FeeSelect label="Branch" value={f.branchId} options={[{ id: '', name: 'All branches' }, ...masters.branches.filter(b => !f.courseId || String(b.courseId) === f.courseId)]} onChange={branchId => change({ branchId, semesterId: '' })} />{!compact && <FeeSelect label="Batch" placeholder="All batches" value={f.batch} options={['', ...masters.batches]} onChange={batch => change({ batch })} />}{full && <><FeeSelect label="Semester" value={f.semesterId} options={[{ id: '', name: 'All semesters' }, ...masters.semesters.filter(s => (!f.courseId || String(s.courseId) === f.courseId) && (!f.branchId || !s.branchId || String(s.branchId) === f.branchId))]} onChange={semesterId => change({ semesterId })} /><FeeSelect label="Category / Quota" placeholder="All categories" value={f.category} options={['', ...masters.categories]} onChange={category => change({ category })} /></>}{trailingFields}<button onClick={clear}>{clearLabel}</button></>
  return compact || inline ? fields : <div className="fm-filters" role="group" aria-label="Academic filters">{fields}</div>
}
function Panel({ title, children, action }) { return <section className="fm-panel">{(title || action) && <header>{title && <h2>{title}</h2>}{action}</header>}{children}</section> }
function Overview({ state, ledgers, openLedger }) {
  const sums = ledgers.reduce((s, a) => { for (const k of ['total', 'paid', 'outstanding', 'overdue', 'concession']) s[k] += a.ledger[k]; return s }, { total: 0, paid: 0, outstanding: 0, overdue: 0, concession: 0 })
  const payments = state.payments.filter(p => ledgers.some(a => a.id === p.assignmentId)), dates = unique(payments.map(p => p.date)).slice(-7)
  const byBranch = Object.values(ledgers.reduce((all, a) => { const key = `${a.structure.courseName} / ${a.structure.branchName}`; all[key] ||= { id: key, name: key, paid: 0, total: 0 }; all[key].paid += a.ledger.paid; all[key].total += a.ledger.total - a.ledger.concession; return all }, {}))
  const due = ledgers.flatMap(a => a.ledger.cells.filter(c => c.balance > 0 && c.dueDate >= feeToday()).map(c => ({ ...c, id: `${a.id}:${c.id}`, student: a.student.name }))).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  return <><FeeStats items={[[ 'Total Fee Expected', feeMoney(rupees(sums.total - sums.concession))], ['Total Collected (net refunds)', feeMoney(rupees(sums.paid))], ['Outstanding Amount', feeMoney(rupees(sums.outstanding))], ['Overdue Amount', feeMoney(rupees(sums.overdue))], ['Collection Percentage', `${sums.total > sums.concession ? (sums.paid / (sums.total - sums.concession) * 100).toFixed(1) : '0.0'}%`]]} /><div className="fm-dashboard-grid"><Panel title="Recent Collections"><FeeTable rows={payments.slice(0, 5)} columns={[{ label: 'Receipt', key: 'receipt' }, { label: 'Student', render: p => ledgers.find(a => a.id === p.assignmentId)?.student.name }, { label: 'Date', key: 'date' }, { label: 'Amount', align: 'right', render: p => feeMoney(p.amount) }]} /></Panel><Panel title="Outstanding Fees"><FeeTable rows={ledgers.filter(a => a.ledger.outstanding > 0).sort((a, b) => b.ledger.outstanding - a.ledger.outstanding).slice(0, 5)} columns={[{ label: 'Student', render: a => <button className="fm-text-button" onClick={() => openLedger(a.id)}>{a.student.name}</button> }, { label: 'Batch', render: a => a.structure.batch }, { label: 'Outstanding', align: 'right', render: a => feeMoney(rupees(a.ledger.outstanding)) }]} /></Panel><Panel title="Upcoming Due Dates"><FeeTable rows={due.slice(0, 5)} columns={[{ label: 'Student', key: 'student' }, { label: 'Component', key: 'name' }, { label: 'Due date', key: 'dueDate' }, { label: 'Balance', align: 'right', render: r => feeMoney(rupees(r.balance)) }]} /></Panel><Panel title="Collection Trend"><div className="fm-chart">{dates.length ? dates.map(date => { const amount = payments.filter(p => p.date === date).reduce((sum, p) => sum + Number(p.amount), 0), max = Math.max(...dates.map(d => payments.filter(p => p.date === d).reduce((sum, p) => sum + Number(p.amount), 0))); return <div className="fs-bar" key={date}><span>{date}<strong>{feeMoney(amount)}</strong></span><i><em style={{ width: `${amount / max * 100}%` }} /></i></div> }) : <p className="fm-muted">Collections will appear here after the first workspace payment.</p>}</div></Panel></div><Panel title="Fee collection by Course / Branch"><FeeTable rows={byBranch} columns={[{ label: 'Course / Branch', key: 'name' }, { label: 'Expected', align: 'right', render: r => feeMoney(rupees(r.total)) }, { label: 'Collected (net)', align: 'right', render: r => feeMoney(rupees(r.paid)) }, { label: 'Collection', render: r => `${r.total ? (r.paid / r.total * 100).toFixed(1) : '0.0'}%` }]} /></Panel><p className="fm-muted">Open Reports → Server records for institution-wide server totals.</p></>
}
function ComponentMaster({ state, commit, action }) {
  const [form, setForm] = useState(null), [query, setQuery] = useState(''), [error, setError] = useState('')
  const blank = { name: '', code: '', category: 'Academic', description: '', frequency: 'Yearly', mandatory: true, refundable: false, status: 'Active' }
  return <><div className="fm-toolbar"><FeeInput label="Search components" value={query} onChange={setQuery} placeholder="Name or code" /><button className="primary" onClick={() => { setError(''); setForm(blank) }}><FiPlus /> Add Fee Component</button></div><Panel title="Fee Component Master"><FeeTable rows={state.components.filter(c => `${c.name} ${c.code}`.toLowerCase().includes(query.toLowerCase()))} empty="No fee components yet. Add reusable fee heads to begin." columns={[{ label: 'Component Name', key: 'name' }, { label: 'Code', key: 'code' }, { label: 'Category', key: 'category' }, { label: 'Frequency', key: 'frequency' }, { label: 'Refundable', render: c => c.refundable ? 'Yes' : 'No' }, { label: 'Mandatory', render: c => c.mandatory ? 'Yes' : 'No' }, { label: 'Status', render: c => <FeeBadge value={c.status} /> }, { label: 'Actions', render: c => <div className="fm-actions"><button aria-label={`Edit ${c.name}`} onClick={() => { setForm(c); setError('') }}><FiEdit2 /></button><button onClick={() => action(() => commit(saveFeeComponent(state, { ...c, status: c.status === 'Active' ? 'Inactive' : 'Active' })))}>{c.status === 'Active' ? 'Deactivate' : 'Activate'}</button></div> }]} /></Panel>
    {form && <FeeDialog title={`${form.id ? 'Edit' : 'Add'} Fee Component`} close={() => setForm(null)} footer={<><button onClick={() => setForm(null)}>Cancel</button><button className="primary" onClick={() => { try { commit(saveFeeComponent(state, form)); setForm(null) } catch (e) { setError(e.message) } }}>Save Component</button></>}><div className="fs-editor-body">{error && <p className="fm-error" role="alert">{error}</p>}<div className="fs-grid"><FeeInput label="Component Name *" value={form.name} onChange={name => setForm({ ...form, name })} maxLength={100} /><FeeInput label="Component Code *" value={form.code} onChange={code => setForm({ ...form, code })} maxLength={30} /><FeeSelect label="Category *" value={form.category} options={['Academic', 'Admission', 'University', 'Examination', 'Student Service', 'Hostel', 'Transport', 'Deposit', 'Other']} onChange={category => setForm({ ...form, category })} /><FeeSelect label="Frequency" value={form.frequency} options={['One Time', 'Yearly', 'Semester-wise', 'Monthly']} onChange={frequency => setForm({ ...form, frequency })} /><FeeInput label="Description" value={form.description} onChange={description => setForm({ ...form, description })} maxLength={500} /><FeeSelect label="Status" value={form.status} options={['Active', 'Inactive']} onChange={status => setForm({ ...form, status })} />{['mandatory', 'refundable'].map(key => <label className="fm-checks" key={key}><input type="checkbox" checked={form[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })} />{key === 'mandatory' ? 'Mandatory component' : 'Refundable component'}</label>)}</div><p className="fm-muted">Changes apply to future selections. Published structures and student assignments retain their original component details.</p></div></FeeDialog>}
  </>
}
function AcademicStructureWorkspace({ state, commit, action, actor, setForm, create }) {
  const [view, setView] = useState(null), [pending, setPending] = useState(null), [detailTab, setDetailTab] = useState('overview')
  const open = s => { setDetailTab('overview'); setView(s) }
  const copy = (s, revision = false) => setForm({ ...structuredClone(s), id: '', name: `${s.name} (${revision ? 'revision' : 'copy'})`, status: 'Draft', version: revision ? s.version + 1 : 1, parentId: s.id, audit: [] })
  const currentView = view && state.structures.find(s => s.id === view.id)
  const confirm = () => action(() => {
    commit(pending.next === 'Delete' ? deleteStructureDraft(state, pending.s.id) : transitionFeeStructure(state, pending.s.id, pending.next, actor))
    setPending(null)
  })
  const rowActions = s => <StructureRowActions name={s.name} actions={[
      ...(s.status !== 'Draft' ? [{ label: 'View', icon: FiEye, run: () => open(s) }] : []),
      ...(s.status === 'Draft' && !structureDraftAssigned(state, s.id) ? [{ label: 'Edit', icon: FiEdit2, run: () => setForm(s) }] : []),
      ...(s.status === 'Approved' ? [{ label: 'Publish', run: () => { open(s); setPending({ s, next: 'Published' }) } }] : []),
      { label: 'Duplicate', icon: FiCopy, run: () => copy(s) },
      ...(['Published', 'Archived'].includes(s.status) ? [{ label: 'Create Revision', run: () => copy(s, true) }] : []),
      ...(s.status === 'Published' ? [{ label: 'Archive', run: () => setPending({ s, next: 'Archived' }) }] : []),
      ...(s.status === 'Draft' && !structureDraftDeleteBlocked(state, s.id) ? [{ label: 'Delete', icon: FiTrash2, danger: true, run: () => setPending({ s, next: 'Delete' }) }] : []),
    ]} />
  return <><FeeStructureConfiguration embedded workflow={{ rows: state.structures, assignments: state.assignments, create, view: open, rowActions }} />
    {currentView && <FeeDialog wide title={currentView.name} close={() => setView(null)} footer={<><FeeBadge value={currentView.status} /><span />{feeTransitions[currentView.status].map(next => <button key={next} className={next === 'Published' || next === 'Approved' || next === 'Pending Approval' ? 'primary' : ''} onClick={() => setPending({ s: currentView, next })}>{structureTransitionLabel(next)}</button>)}</>}><FinanceTabs value={detailTab} onChange={setDetailTab} items={[['overview', 'Overview'], ['components', 'Fee Components'], ['schedule', 'Payment Schedule'], ['assignments', 'Student Assignment'], ['history', 'Revision History']]} /><div className="fs-editor-body">
      {['overview', 'components', 'schedule'].includes(detailTab) && <FeeReview value={currentView} section={detailTab} />}
      {detailTab === 'assignments' && <FeeTable rows={state.assignments.filter(a => a.structure.id === currentView.id)} columns={[{ label: 'Student', render: a => <Link to={`/fees/ledger/${a.id}`}>{a.student.name}</Link> }, { label: 'Roll No.', render: a => a.student.roll }, { label: 'Assigned Version', render: a => a.structure.version }]} />}
      {detailTab === 'history' && <><h3>Approval History · Version {currentView.version}</h3><FeeTable rows={currentView.audit.map((a, n) => ({ ...a, id: n }))} columns={[{ label: 'Status', key: 'status' }, { label: 'By', key: 'actor' }, { label: 'Date', render: a => new Date(a.at).toLocaleString('en-IN') }]} /><h3>Related Revisions</h3><FeeTable rows={state.structures.filter(s => s.id === currentView.parentId || s.parentId === currentView.id || (currentView.parentId && s.parentId === currentView.parentId))} columns={[{ label: 'Structure', key: 'name' }, { label: 'Version', key: 'version' }, { label: 'Status', key: 'status' }]} /></>}
    </div></FeeDialog>}
    {pending && <FeeDialog title={`${pending.next === 'Delete' ? 'Delete Draft' : structureTransitionLabel(pending.next)} · Confirm`} close={() => setPending(null)} footer={<><button onClick={() => setPending(null)}>Cancel</button><button className={pending.next === 'Delete' ? 'fm-delete-action' : 'primary'} onClick={confirm}>{pending.next === 'Delete' ? 'Delete Draft' : 'Confirm'}</button></>}><div className="fs-editor-body"><p>{pending.s.name} · {feeMoney(feeTotal(pending.s))}</p>{pending.next === 'Delete' ? <p>Delete this unassigned draft permanently? Drafts with student assignments or linked revisions cannot be deleted.</p> : <><p>Change status from <strong>{pending.s.status}</strong> to <strong>{pending.next}</strong>.</p><p className="fm-muted">Published structures are locked. Existing assignments retain a snapshot even after archival.</p></>}</div></FeeDialog>}
  </>
}
const structureTransitionLabel = next => ({ 'Pending Approval': 'Submit for Approval', Approved: 'Approve', Published: 'Publish', Archived: 'Archive', Draft: 'Return to Draft' })[next]
function structureDraftAssigned(state, id) {
  return state.assignments.some(a => a.structureId === id || a.structure?.id === id)
}
function structureDraftDeleteBlocked(state, id) {
  const s = state.structures.find(s => s.id === id)
  if (!s) return 'Fee structure not found.'
  if (s.status !== 'Draft') return 'Only drafts can be deleted.'
  if (structureDraftAssigned(state, id)) return 'Drafts with student assignments cannot be deleted.'
  if (state.structures.some(s => s.parentId === id)) return 'Drafts referenced by revisions cannot be deleted.'
  return ''
}
function deleteStructureDraft(state, id) {
  const reason = structureDraftDeleteBlocked(state, id)
  if (reason) throw new Error(reason)
  return { ...state, structures: state.structures.filter(s => s.id !== id) }
}
function StructureRowActions({ name, actions }) {
  const [position, setPosition] = useState(null), trigger = useRef(null), menu = useRef(null), id = useId()
  useEffect(() => {
    if (!position) return
    const dismiss = e => { if (!trigger.current?.contains(e.target) && !menu.current?.contains(e.target)) setPosition(null) }
    const keyboard = e => { if (e.key === 'Escape') { e.preventDefault(); setPosition(null); trigger.current?.focus() } }
    const close = () => setPosition(null)
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('focusin', dismiss)
    document.addEventListener('keydown', keyboard)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    menu.current?.querySelector('button')?.focus({ preventScroll: true })
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('focusin', dismiss); document.removeEventListener('keydown', keyboard); window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true) }
  }, [position])
  const toggle = () => {
    if (position) { setPosition(null); return }
    const rect = trigger.current.getBoundingClientRect(), height = actions.length * 36 + 10
    setPosition({ top: rect.bottom + height > window.innerHeight ? Math.max(8, rect.top - height - 4) : rect.bottom + 4, left: Math.max(8, Math.min(rect.right - 190, window.innerWidth - 198)) })
  }
  return <><button ref={trigger} className="fm-structure-more" aria-label={`Actions for ${name}`} aria-expanded={Boolean(position)} aria-controls={position ? id : undefined} onClick={toggle}><FiMoreVertical /></button>{position && createPortal(<div ref={menu} id={id} className="fm-structure-action-popover" role="group" aria-label={`Actions for ${name}`} style={position}>{actions.map(({ label, icon: Icon, run, danger }) => <button key={label} className={danger ? 'fm-delete-action' : ''} onClick={() => { setPosition(null); trigger.current?.focus(); run() }}>{Icon && <Icon />}{label}</button>)}</div>, document.body)}</>
}
function StudentAccounts(props) {
  const [query, setQuery] = useState(''), [status, setStatus] = useState('')
  const statusOf = a => a.ledger.overdue ? 'Overdue' : a.ledger.outstanding ? 'Outstanding' : 'Paid'
  return <><PageHeader title="Student Accounts" subtitle="Manage student fee balances, assignments, concessions and outstanding dues."><Link className="fm-link-button primary" to="/fees/assignments"><FiPlus /> Assign Fees</Link></PageHeader>
    <div className="fm-account-filters fm-account-list-toolbar" role="group" aria-label="Student account filters"><FeeInput className="fs-field" label="Search Students" value={query} onChange={setQuery} placeholder="Search name, roll or admission no." /><Filters {...props} inline clearLabel="Clear" onClear={() => { setQuery(''); setStatus('') }} trailingFields={<FeeSelect label="Status" placeholder="All statuses" value={status} onChange={setStatus} options={['', 'Paid', 'Outstanding', 'Overdue']} />} /></div>
    <section className="fm-account-operations" aria-labelledby="fm-account-operations-title">
      <h2 id="fm-account-operations-title">Account Operations</h2>
      <div className="fm-account-operation-grid">{studentAccountOperations.map(operation => <Link className="fm-account-operation" key={operation.to} to={operation.to}>
        <h3>{operation.label}</h3><p>{operation.description}</p><span>Open &#8594;</span>
      </Link>)}</div>
    </section>
    <Panel><FeeTable rows={props.ledgers.filter(a => studentSearch(a.student, query) && (!status || statusOf(a) === status))} columns={[
      { label: 'Student', render: a => <><Link to={`/fees/ledger/${a.id}`}>{a.student.name}</Link><small>{a.student.code}</small></> },
      { label: 'Roll No.', render: a => a.student.roll || '\u2014' },
      { label: 'Program / Branch', render: a => <>{a.student.courseName}<small>{a.student.branchName}</small></> },
      { label: 'Net Payable', align: 'right', render: a => feeMoney(rupees(a.ledger.total - a.ledger.concession)) },
      { label: 'Paid', align: 'right', render: a => feeMoney(rupees(a.ledger.paid)) },
      { label: 'Outstanding', align: 'right', render: a => feeMoney(rupees(a.ledger.outstanding)) },
      { label: 'Overdue', align: 'right', render: a => feeMoney(rupees(a.ledger.overdue)) },
      { label: 'Next Due', render: a => a.ledger.cells.filter(c => c.balance > 0).map(c => c.dueDate).sort()[0] || '—' },
      { label: 'Status', render: a => <FeeBadge value={statusOf(a)} /> },
      { label: 'Actions', render: a => <div className="fm-actions"><Link to={`/fees/ledger/${a.id}`}>View Ledger</Link><Link to="/fees/concessions" state={{ assignmentId: a.id }}>Apply Concession</Link><Link to={`/fees/ledger/${a.id}`}>View Dues</Link></div> },
    ]} /></Panel></>
}
function Assignments({ state, commit, action, students, loading, error, retry, filter, masters, setFilter }) {
  const [selected, setSelected] = useState([]), [structureId, setStructureId] = useState(''), [confirm, setConfirm] = useState(false), [query, setQuery] = useState('')
  const structures = state.structures.filter(s => s.status === 'Published' && (!filter.academicYearId || String(s.academicYearId) === String(filter.academicYearId)))
  const structure = structures.find(s => s.id === structureId), rows = students.filter(s => studentSearch(s, query)), eligible = rows.filter(s => structure && studentMatchesFee(s, structure) && !state.assignments.some(a => a.student.id === s.id && String(a.structure.academicYearId) === String(structure.academicYearId) && (a.structure.cycle === 'Yearly' || structure.cycle === 'Yearly' || String(a.structure.semesterId) === String(structure.semesterId))))
  const chosen = eligible.filter(s => selected.includes(s.id)), signature = eligible.map(s => s.id).join('|')
  useEffect(() => { setSelected([]); setConfirm(false) }, [structureId, signature])
  return <><PageHeader title="Fee Assignment" subtitle="Assign published fee structures to eligible students."><button className="primary" disabled={!chosen.length} onClick={() => setConfirm(true)}><FiPlus /> Assign Fees{chosen.length ? ` (${chosen.length})` : ''}</button></PageHeader>
    <div className="fm-account-filters" role="group" aria-label="Fee assignment filters"><Filters masters={masters} filter={filter} setFilter={setFilter} full inline /><FeeSelect label="Published Fee Structure" value={structureId} options={structures} onChange={setStructureId} /></div>
    <p className="fm-assignment-flow">Published Fee Structure → Eligible Students → Select Students → Assign → Student Account</p>
    <div className="fm-account-filters"><FeeInput label="Search students" placeholder="Student ID, name, roll or application number" value={query} onChange={setQuery} /></div>{loading ? <p role="status">Loading student records…</p> : error ? <p role="alert" className="fm-error">{error} <button onClick={retry}><FiRefreshCw /> Retry</button></p> : <Panel title="Eligible Students"><FeeTable rows={structure ? eligible : []} empty={structure ? 'No eligible students match the selected structure and filters.' : 'Select a published fee structure to see eligible students.'} columns={[
    { label: <input type="checkbox" aria-label="Select all eligible matching students" checked={eligible.length > 0 && chosen.length === eligible.length} disabled={!eligible.length} onChange={e => setSelected(e.target.checked ? eligible.map(s => s.id) : [])} />, render: s => <input aria-label={`Select ${s.name}`} type="checkbox" disabled={!eligible.some(e => e.id === s.id)} checked={chosen.some(c => c.id === s.id)} onChange={e => setSelected(e.target.checked ? [...selected, s.id] : selected.filter(id => id !== s.id))} /> },
    { label: 'Student ID', key: 'code' }, { label: 'Student Name', key: 'name' }, { label: 'Roll Number', key: 'roll' }, { label: 'Course', key: 'courseName' }, { label: 'Branch', key: 'branchName' }, { label: 'Batch', key: 'batch' }, { label: 'Category', key: 'category' }, { label: 'Current Fee Structure', render: s => state.assignments.filter(a => a.student.id === s.id && (!filter.academicYearId || String(a.structure.academicYearId) === String(filter.academicYearId))).map(a => <Link key={a.id} to={`/fees/ledger/${a.id}`}>{a.structure.name}</Link>) }, { label: 'Status', render: s => <FeeBadge value={eligible.some(e => e.id === s.id) ? 'Eligible' : 'Not eligible / assigned'} /> },
  ]} /></Panel>}<p className="fm-muted">Eligibility requires matching academic year, course, branch, batch, semester (when applicable) and quota. Missing student master data must be completed before assignment.</p>
    {confirm && structure && <FeeDialog title="Confirm Student Fee Assignment" close={() => setConfirm(false)} footer={<><button onClick={() => setConfirm(false)}>Cancel</button><button className="primary" disabled={!chosen.length} onClick={() => action(() => { commit(assignFeeStructure(state, structure.id, chosen)); setConfirm(false); setSelected([]) })}>Confirm Assignment</button></>}><div className="fs-editor-body"><dl className="fs-preview">{[['Selected Students', chosen.length], ['Fee Structure', structure.name], ['Total Fee / Student', feeMoney(feeTotal(structure))], ['Effective Academic Year', structure.academicYearName], ['Total Assignment', feeMoney(feeTotal(structure) * chosen.length)]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><p>{chosen.map(s => s.name).join(', ')}</p></div></FeeDialog>}
  </>
}

// Collection and the ledger use the same immutable allocation records.
function Collection(props) {
  const [query, setQuery] = useState(''), [id, setId] = useState('')
  const { assignments } = props, visible = assignments.filter(a => studentSearch(a.student, query)), assignment = visible.find(a => a.id === id)
  return <><div className="fm-toolbar"><FeeInput label="Search Student" value={query} onChange={setQuery} placeholder="Student ID, roll number, name or application number" /><FeeSelect label="Student Fee Account" value={id} options={visible.map(a => ({ id: a.id, name: `${a.student.name} · ${a.student.code} · ${a.structure.name}` }))} onChange={setId} /></div>{assignment ? <StudentLedger {...props} assignment={assignment} collectInitially /> : <Panel title="Select a Student"><p className="fm-muted fm-pad">Search and select an assigned student to view balances and collect a preview payment.</p></Panel>}</>
}
function LedgerRoute(props) {
  const { assignmentId } = useParams(), assignment = props.state.assignments.find(a => a.id === assignmentId)
  return <>{assignment ? <StudentLedger key={assignment.id} {...props} assignment={assignment} /> : <p className="fm-error">Fee assignment not found. <Link to="/fees/assignments">Return to assignments</Link></p>}</>
}
function FinanceTabs({ items, value, onChange }) {
  return <nav className="fm-detail-tabs" aria-label="Detail sections">{items.map(([id, label]) => <button key={id} aria-pressed={value === id} onClick={() => onChange(id)}>{label}</button>)}</nav>
}
export function StudentLedger({ state, assignment, commit, actor, collectInitially = false }) {
  const ledger = feeLedger(state, assignment), s = assignment.student
  const [collect, setCollect] = useState(collectInitially), [receipt, setReceipt] = useState(null), [tab, setTab] = useState('ledger')
  const concessions = state.concessions.filter(r => r.assignmentId === assignment.id), refunds = state.refunds.filter(r => r.assignmentId === assignment.id)
  const ledgerRows = financialLedgerRows(assignment, ledger, concessions)
  const adjustmentColumns = [{ label: 'Date', render: r => String(r.updatedAt || r.at).slice(0, 10) }, { label: 'Type', key: 'type' }, { label: 'Requested', render: r => r.unit === 'Percentage' ? `${r.value}%` : feeMoney(r.value) }, { label: 'Approved Amount', render: r => r.status === 'Approved' ? feeMoney(rupees(r.amount)) : '—' }, { label: 'Reason', key: 'reason' }, { label: 'Status', render: r => <FeeBadge value={r.status} /> }]
  return <><section className="fm-student-profile"><div><h2>{s.name || 'Student Financial Profile'}</h2><p>{s.code} · Roll {s.roll || '—'} · {s.courseName} / {s.branchName} · {assignment.structure.semesterName || 'Yearly'}</p></div><Link className="fm-link-button primary" to="/fees/collection" state={{ studentSearch: s.code, academicYearId: assignment.structure.academicYearId }}>Collect Fee</Link>{import.meta.env.DEV && new URLSearchParams(window.location.search).get('feeDebug') === 'true' && <button disabled={!ledger.outstanding} onClick={() => setCollect(true)}>Preview Payment</button>}</section>
    <div className="fm-account-snapshot"><FeeStats items={[[ 'Original Fee', feeMoney(rupees(ledger.total))], ['Concession', feeMoney(rupees(ledger.concession))], ['Net Payable', feeMoney(rupees(ledger.total - ledger.concession))], ['Paid (net refunds)', feeMoney(rupees(ledger.paid))], ['Outstanding', feeMoney(rupees(ledger.outstanding))], ['Overdue', feeMoney(rupees(ledger.overdue))]]} /></div>
    <p className="fm-notice">Device-local account. Posted institutional payments are available in Collections; they are not combined with this ledger.</p>
    <FinanceTabs value={tab} onChange={setTab} items={[['ledger', 'Ledger'], ['installments', 'Installments'], ['payments', 'Payments'], ['concessions', 'Concessions'], ['refunds', 'Refunds']]} />
    {tab === 'ledger' && <Panel title="Financial Ledger"><FeeTable rows={ledgerRows} columns={[{ label: 'Date', render: r => String(r.date).slice(0, 10) }, { label: 'Reference', key: 'reference' }, { label: 'Description', key: 'description' }, { label: 'Debit', align: 'right', render: r => r.debit ? feeMoney(rupees(r.debit)) : '—' }, { label: 'Credit', align: 'right', render: r => r.credit ? feeMoney(rupees(r.credit)) : '—' }, { label: 'Balance', align: 'right', render: r => feeMoney(rupees(r.balance)) }]} /><details className="fm-pad"><summary>Fee component breakdown</summary><FeeTable rows={aggregateCells(ledger.cells, 'componentId')} columns={balanceColumns('Component')} /></details></Panel>}
    {tab === 'installments' && <Panel title="Installment Schedule"><FeeTable rows={aggregateCells(ledger.cells, 'installmentId')} columns={[{ label: 'Due Date', key: 'dueDate' }, ...balanceColumns('Installment')]} /></Panel>}
    {tab === 'payments' && <Panel title="Payment History"><FeeTable rows={ledger.payments} columns={[{ label: 'Receipt No', key: 'receipt' }, { label: 'Date', key: 'date' }, { label: 'Mode', key: 'mode' }, { label: 'Transaction Reference', key: 'reference' }, { label: 'Amount', align: 'right', render: p => feeMoney(p.amount) }, { label: 'Collected By', key: 'actor' }, { label: 'Status', render: p => <FeeBadge value={ledger.refunds.some(r => r.paymentId === p.id) ? 'Refunded / Partially Refunded' : 'Recorded'} /> }, { label: 'Actions', render: p => <div className="fm-actions"><button onClick={() => setReceipt(p)}>View Receipt</button>{ledger.cells.some(c => c.refundable && Math.min(c.paid, (p.allocations[c.id] || 0) - ledger.refunds.filter(r => r.paymentId === p.id).reduce((sum, r) => sum + (r.allocations?.[c.id] || 0), 0)) > 0) && <Link to="/fees/refunds" state={{ assignmentId: assignment.id, paymentId: p.id }}>Request Refund</Link>}</div> }]} /></Panel>}
    {tab === 'concessions' && <Panel title="Concessions" action={<Link to="/fees/concessions" state={{ assignmentId: assignment.id }}>Apply Concession</Link>}><FeeTable rows={concessions} columns={adjustmentColumns} /></Panel>}
    {tab === 'refunds' && <Panel title="Refund Requests"><FeeTable rows={refunds} columns={adjustmentColumns} /></Panel>}
    {collect && <PaymentForm key={assignment.id} state={state} assignment={assignment} actor={actor} close={() => setCollect(false)} save={next => { commit(next); setCollect(false); setReceipt(next.payments[0]) }} />}
    {receipt && <WorkspaceReceipt state={state} payment={receipt} close={() => setReceipt(null)} />}
  </>
}
function aggregateCells(cells, key) {
  return Object.values(cells.reduce((all, c) => { all[c[key]] ||= { id: c[key], name: key === 'componentId' ? c.name : `Installment ${c.installment}`, dueDate: c.dueDate, amount: 0, paid: 0, concession: 0, balance: 0, overdue: false }; for (const n of ['amount', 'paid', 'concession', 'balance']) all[c[key]][n] += c[n]; all[c[key]].overdue ||= c.overdue; return all }, {})).map(c => ({ ...c, status: !c.balance ? 'Paid' : c.overdue ? 'Overdue' : c.paid ? 'Partially Paid' : 'Pending' }))
}
const balanceColumns = label => [{ label, key: 'name' }, { label: 'Amount', align: 'right', render: c => feeMoney(rupees(c.amount)) }, { label: 'Concession', render: c => feeMoney(rupees(c.concession)) }, { label: 'Paid', align: 'right', render: c => feeMoney(rupees(c.paid)) }, { label: 'Balance', align: 'right', render: c => feeMoney(rupees(c.balance)) }, { label: 'Status', render: c => <FeeBadge value={c.status} /> }]
function PaymentForm({ state, assignment, actor, close, save }) {
  const [f, set] = useState({ assignmentId: assignment.id, installmentId: '', componentId: '', amount: '', date: feeToday(), mode: 'Cash', reference: '', remarks: '' }), [error, setError] = useState('')
  const ledger = feeLedger(state, assignment), eligible = ledger.cells.filter(c => (!f.installmentId || c.installmentId === f.installmentId) && (!f.componentId || c.componentId === f.componentId)), max = rupees(eligible.reduce((sum, c) => sum + c.balance, 0))
  return <FeeDialog title="Collect Preview Payment" close={close} footer={<><button onClick={close}>Cancel</button><button className="primary" disabled={!max} onClick={() => { try { save(collectWorkspacePayment(state, f, actor)) } catch (e) { setError(e.message) } }}>Collect Payment</button></>}><div className="fs-editor-body">{error && <p role="alert" className="fm-error">{error}</p>}<p><strong>{assignment.student.name}</strong> · Payable for selection: <strong>{feeMoney(max)}</strong></p><div className="fs-grid"><FeeSelect label="Installment" value={f.installmentId} options={[{ id: '', name: 'All installments (oldest first)' }, ...aggregateCells(ledger.cells, 'installmentId')]} onChange={installmentId => set({ ...f, installmentId })} /><FeeSelect label="Fee Component" value={f.componentId} options={[{ id: '', name: 'All components' }, ...aggregateCells(ledger.cells, 'componentId')]} onChange={componentId => set({ ...f, componentId })} /><FeeInput label="Amount Being Paid *" type="number" min="0.01" step="0.01" max={max} value={f.amount} onChange={amount => set({ ...f, amount })} /><FeeSelect label="Payment Mode" value={f.mode} options={['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Online Gateway']} onChange={mode => set({ ...f, mode })} /><FeeInput label="Payment Date *" type="date" max={feeToday()} value={f.date} onChange={date => set({ ...f, date })} /><FeeInput label={`Transaction Reference${f.mode === 'Cash' ? '' : ' *'}`} value={f.reference} onChange={reference => set({ ...f, reference })} maxLength={150} /><FeeInput label="Remarks" value={f.remarks} onChange={remarks => set({ ...f, remarks })} maxLength={500} /></div><p className="fm-notice">This records a workspace preview only. Use Server records for actual fee collection.</p></div></FeeDialog>
}
function Adjustments({ state, commit, action, actor, assignments, kind, masters, filter, setFilter }) {
  const context = useLocation().state
  const refund = kind === 'refunds', [form, setForm] = useState(() => context?.assignmentId ? { assignmentId: context.assignmentId, type: kind === 'refunds' ? 'Refund' : 'Scholarship', unit: 'Amount', value: '', reason: '', reference: '', paymentId: context.paymentId || '' } : null), [error, setError] = useState(''), [confirm, setConfirm] = useState(null)
  const [status, setStatus] = useState('')
  const rows = state[kind].filter(r => assignments.some(a => a.id === r.assignmentId) && (refund || !status || r.status === status)), assignment = assignments.find(a => a.id === form?.assignmentId)
  const openForm = () => { setError(''); setForm({ assignmentId: '', type: refund ? 'Refund' : 'Scholarship', unit: 'Amount', value: '', reason: '', reference: '', paymentId: '' }) }
  const filteredOut = !refund && rows.length === 0 && (state[kind].length > 0 || Boolean(status || filter.courseId || filter.branchId || filter.batch || filter.semesterId || filter.category))
  const clearFilters = () => { setStatus(''); setFilter({ academicYearId: '', courseId: '', branchId: '', batch: '', semesterId: '', category: '' }) }
  return <>
    {refund ? <div className="fm-toolbar"><p className="fm-muted">Refunds reverse paid refundable components and reopen their balance. They do not cancel the underlying fee.</p><button className="primary" onClick={openForm}><FiPlus /> Request Refund</button></div> : <>
      <PageHeader title={<>Scholarships & Concessions <span className="fm-concession-help" tabIndex={0} role="img" aria-label="Approved concessions reduce the student's unpaid balance. Percentage is calculated against the assigned total." title="Approved concessions reduce the student's unpaid balance. Percentage is calculated against the assigned total."><FiInfo /></span></>} subtitle="Manage scholarships, waivers and approved fee reductions."><button className="primary" onClick={openForm}><FiPlus /> Add Concession</button></PageHeader>
      <div className="fm-account-filters" role="group" aria-label="Concession filters"><Filters masters={masters} filter={filter} setFilter={setFilter} inline onClear={() => setStatus('')} /><FeeSelect label="Status" value={status} options={[{ id: '', name: 'All statuses' }, 'Draft', 'Submitted', 'Approved', 'Rejected']} onChange={setStatus} /></div>
    </>}
    <Panel title={refund ? 'Refunds' : undefined}>{rows.length || refund ? <FeeTable rows={rows} columns={refund ? [
      { label: 'Student', render: r => assignments.find(a => a.id === r.assignmentId)?.student.name }, { label: 'Type', key: 'type' }, { label: 'Value', render: r => r.unit === 'Percentage' ? `${r.value}%` : feeMoney(r.value) }, { label: 'Reason / Reference', render: r => <>{r.reason}<small>{r.reference}</small></> }, { label: 'Academic Year', render: r => assignments.find(a => a.id === r.assignmentId)?.structure.academicYearName }, { label: 'Approved By', key: 'approvedBy' }, { label: 'Status', render: r => <FeeBadge value={r.status} /> }, { label: 'Actions', render: r => <div className="fm-actions">{(r.status === 'Draft' ? ['Submitted'] : r.status === 'Submitted' ? ['Approved', 'Rejected'] : []).map(status => <button key={status} onClick={() => setConfirm({ r, status })}>{status === 'Submitted' ? 'Submit' : status === 'Approved' ? 'Approve' : 'Reject'}</button>)}</div> },
    ] : [
      { label: 'Student', render: r => <Link to={`/fees/ledger/${r.assignmentId}`}>{assignments.find(a => a.id === r.assignmentId)?.student.name}</Link> },
      { label: 'Roll No.', render: r => assignments.find(a => a.id === r.assignmentId)?.student.roll || '—' },
      { label: 'Type', key: 'type' },
      { label: 'Scholarship / Concession', render: r => <>{r.reason}<small>{r.reference}</small></> },
      { label: 'Value', render: r => r.unit === 'Percentage' ? `${r.value}%` : feeMoney(r.value) },
      { label: 'Approved Amount', align: 'right', render: r => r.status === 'Approved' ? feeMoney(rupees(r.amount)) : '—' },
      { label: 'Effective Date', render: r => r.status === 'Approved' && r.updatedAt ? r.updatedAt.slice(0, 10) : '—' },
      { label: 'Approved By', key: 'approvedBy' },
      { label: 'Status', render: r => <FeeBadge value={r.status} /> },
      { label: 'Actions', render: r => <div className="fm-actions">{(r.status === 'Draft' ? ['Submitted'] : r.status === 'Submitted' ? ['Approved', 'Rejected'] : []).map(status => <button key={status} onClick={() => setConfirm({ r, status })}>{status === 'Submitted' ? 'Submit' : status === 'Approved' ? 'Approve' : 'Reject'}</button>)}</div> },
    ]} /> : <EmptyState className="fm-account-empty" title={filteredOut ? 'No matching records' : 'No scholarships or concessions found'} message={filteredOut ? 'Try changing or clearing the selected filters.' : 'No records match the selected academic filters.'} action={<button className={filteredOut ? '' : 'primary'} onClick={filteredOut ? clearFilters : openForm}>{!filteredOut && <FiPlus />}{filteredOut ? 'Clear Filters' : 'Add Concession'}</button>} />}</Panel>
    {form && <FeeDialog title={refund ? 'Request Refund' : 'Add Scholarship / Concession'} close={() => setForm(null)} footer={<><button onClick={() => setForm(null)}>Cancel</button><button className="primary" onClick={() => { try { commit(saveFeeAdjustment(state, kind, form)); setForm(null) } catch (e) { setError(e.message) } }}>Save Draft</button></>}><div className="fs-editor-body">{error && <p className="fm-error" role="alert">{error}</p>}<div className="fs-grid"><FeeSelect label="Student *" value={form.assignmentId} options={assignments.map(a => ({ id: a.id, name: `${a.student.name} · ${a.structure.academicYearName} · ${a.structure.name}` }))} onChange={assignmentId => setForm({ ...form, assignmentId, paymentId: '' })} />{refund ? <FeeSelect label="Original Payment *" value={form.paymentId} options={state.payments.filter(p => p.assignmentId === form.assignmentId).map(p => ({ id: p.id, name: `${p.receipt} · ${feeMoney(p.amount)}` }))} onChange={paymentId => setForm({ ...form, paymentId })} /> : <><FeeSelect label="Concession Type" value={form.type} options={['Scholarship', 'Merit Concession', 'Management Concession', 'Government Reimbursement', 'Other Discount']} onChange={type => setForm({ ...form, type })} /><FeeSelect label="Amount / Percentage" value={form.unit} options={['Amount', 'Percentage']} onChange={unit => setForm({ ...form, unit })} /></>}<FeeInput label={`${form.unit} *`} type="number" min="0.01" step="0.01" value={form.value} onChange={value => setForm({ ...form, value })} /><FeeInput label="Reason *" value={form.reason} onChange={reason => setForm({ ...form, reason })} maxLength={500} /><FeeInput label="Reference Number" value={form.reference} onChange={reference => setForm({ ...form, reference })} maxLength={150} /></div>{assignment && <p>Effective academic year: {assignment.structure.academicYearName} · Outstanding: {feeMoney(rupees(feeLedger(state, assignment).outstanding))}</p>}</div></FeeDialog>}
    {confirm && <FeeDialog title={`Confirm ${confirm.status}`} close={() => setConfirm(null)} footer={<><button onClick={() => setConfirm(null)}>Cancel</button><button className="primary" onClick={() => action(() => { commit(transitionFeeAdjustment(state, kind, confirm.r.id, confirm.status, actor)); setConfirm(null) })}>Confirm</button></>}><div className="fs-editor-body"><p>{confirm.r.type} · {confirm.r.unit === 'Percentage' ? `${confirm.r.value}%` : feeMoney(confirm.r.value)}</p><p>{confirm.r.reason}</p><p>Approved adjustments immediately update the workspace ledger. Approval checks the latest eligible balance.</p></div></FeeDialog>}
  </>
}
function Dues({ ledgers }) {
  const [overdueOnly, setOverdueOnly] = useState(false)
  return <><div className="fm-toolbar"><label className="fm-checks"><input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)} />Overdue only</label></div><Panel title="Dues & Penalties"><FeeTable rows={ledgers.filter(a => overdueOnly ? a.ledger.overdue > 0 : a.ledger.outstanding > 0)} columns={[{ label: 'Student', render: a => <Link to={`/fees/ledger/${a.id}`}>{a.student.name}</Link> }, { label: 'Structure', render: a => a.structure.name }, { label: 'Outstanding', align: 'right', render: a => feeMoney(rupees(a.ledger.outstanding)) }, { label: 'Overdue', render: a => feeMoney(rupees(a.ledger.overdue)) }, { label: 'Grace (days)', render: a => a.structure.grace }, { label: 'Suggested Penalty', render: a => feeMoney(rupees(a.ledger.penalty)) }, { label: 'Status', render: a => <FeeBadge value={a.ledger.overdue ? 'Overdue' : 'Pending'} /> }]} /></Panel><p className="fm-muted">Suggested penalties are separate from fee payable. Use the server fines workflow to assess or waive an actual penalty.</p></>
}
function Receipts({ state, assignments }) {
  const [query, setQuery] = useState(''), [receipt, setReceipt] = useState(null)
  const rows = state.payments.filter(p => assignments.some(a => a.id === p.assignmentId) && `${p.receipt} ${p.reference} ${assignments.find(a => a.id === p.assignmentId)?.student.name}`.toLowerCase().includes(query.toLowerCase()))
  return <><div className="fm-toolbar"><FeeInput label="Search Receipts" value={query} onChange={setQuery} /></div><Panel title="Preview Receipts"><FeeTable rows={rows} columns={[{ label: 'Receipt No', key: 'receipt' }, { label: 'Student', render: p => assignments.find(a => a.id === p.assignmentId)?.student.name }, { label: 'Date', key: 'date' }, { label: 'Mode', key: 'mode' }, { label: 'Amount', align: 'right', render: p => feeMoney(p.amount) }, { label: 'Collected By', key: 'actor' }, { label: 'Actions', render: p => <button onClick={() => setReceipt(p)}>View / Print</button> }]} /></Panel>{receipt && <WorkspaceReceipt state={state} payment={receipt} close={() => setReceipt(null)} />}</>
}
function WorkspaceReceipt({ state, payment: p, close }) {
  const a = state.assignments.find(a => a.id === p.assignmentId)
  const sections = [{ title: 'Preview receipt — not a server receipt', rows: [['Receipt No', p.receipt], ['Student', a.student.name], ['Student ID', a.student.code], ['Roll Number', a.student.roll], ['Academic Year', a.structure.academicYearName], ['Structure', a.structure.name], ['Payment Date', p.date], ['Payment Mode', p.mode], ['Transaction Reference', p.reference || '—'], ['Collected By', p.actor], ['Amount', feeMoney(p.amount)], ['Remarks', p.remarks || '—']] }]
  return <FeeDialog title={p.receipt} close={close} footer={<><button onClick={close}>Close</button><button className="primary" onClick={() => { try { printSingleRecord({ title: 'PREVIEW PAYMENT RECEIPT', sections }) } catch (e) { showError(e.message) } }}>Print / Save as PDF</button></>}><div className="fs-editor-body"><p className="fm-notice">Workspace preview · Not proof of an actual financial transaction.</p><dl className="fs-preview">{sections[0].rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v || '—'}</dd></div>)}</dl></div></FeeDialog>
}
function Reports({ ledgers, state }) {
  const [type, setType] = useState('Student balances')
  const balances = ledgers.map(a => ({ id: a.id, student: a.student.name, code: a.student.code, course: a.structure.courseName, branch: a.structure.branchName, batch: a.structure.batch, year: a.structure.academicYearName, expected: rupees(a.ledger.total - a.ledger.concession), paid: rupees(a.ledger.paid), outstanding: rupees(a.ledger.outstanding), overdue: rupees(a.ledger.overdue) }))
  const collections = state.payments.filter(p => ledgers.some(a => a.id === p.assignmentId)).map(p => ({ ...p, student: ledgers.find(a => a.id === p.assignmentId)?.student.name }))
  const rows = type === 'Collections' ? collections : type === 'Overdue students' ? balances.filter(a => a.overdue > 0) : balances
  const columns = type === 'Collections' ? [['Receipt', 'receipt'], ['Student', 'student'], ['Date', 'date'], ['Mode', 'mode'], ['Amount', 'amount'], ['Reference', 'reference']] : [['Student', 'student'], ['Student ID', 'code'], ['Course', 'course'], ['Branch', 'branch'], ['Batch', 'batch'], ['Academic Year', 'year'], ['Expected', 'expected'], ['Paid (net refunds)', 'paid'], ['Outstanding', 'outstanding'], ['Overdue', 'overdue']]
  return <><div className="fm-toolbar"><FeeSelect label="Report" value={type} options={['Student balances', 'Collections', 'Overdue students']} onChange={setType} /><ExportMenu rows={rows} columns={columns.map(([label, value]) => ({ label, value }))} filename={`workspace-fees-${type}`} title={`Workspace Preview — ${type}`} /></div><Panel title={type}><FeeTable rows={rows} columns={columns.map(([label, key]) => ({ label, key, ...(['amount', 'expected', 'paid', 'outstanding', 'overdue'].includes(key) ? { render: r => feeMoney(r[key]) } : {}) }))} /></Panel></>
}
