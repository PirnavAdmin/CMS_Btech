import { useEffect, useRef, useState } from 'react'
import { FiPlus, FiSearch, FiBriefcase } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import PageHeader from '../../components/PageHeader'
import ViewDialog from '../../components/ViewDialog'
import FilterPanel from '../../components/FilterPanel'
import ExportMenu from '../../components/ExportMenu'
import TablePagination from '../../components/TablePagination'
import ScopedModuleNotice from '../../components/ScopedModuleNotice'
import { ProjectSelect } from '../../components/SearchableSelect'
import { useAcademic } from '../../context/AcademicContext'
import { useScreenAccess } from '../../auth/ScreenAccess'
import useScopedModule from '../../services/useScopedModule'
import * as api from '../../services/scopedModulesService'
import {
  applicationTransitions, driveTransitions, offerTransitions, placementDate,
  placementDateLabel, placementLocalInput, placementMoney, placementUtc, validatePlacementForm,
} from '../../utils/placementWorkflow'
import './PlacementWorkspace.css'

const route = '/placement'
const empty = { companies: [], drives: [], applications: [], interviews: [], offers: [], students: [], rules: [], eligibility: [], relatedErrors: {} }
const tabs = [
  ['drives', 'Recruitment Drives'], ['companies', 'Companies'], ['applications', 'Applications'],
  ['interviews', 'Interviews'], ['offers', 'Offers & Placements'],
]
const singular = { drives: 'drive', companies: 'company', applications: 'application', interviews: 'interview', offers: 'offer' }
const headings = {
  drives: [['title', 'Drive / Job Title'], ['company', 'Company'], ['branches', 'Eligible Branches'], ['driveStartAt', 'Drive Date'], ['package', 'Package / CTC'], ['applicantsCount', 'Applications'], ['status', 'Status']],
  companies: [['name', 'Company Name'], ['industry', 'Industry'], ['contactPerson', 'Contact Person'], ['contactEmail', 'Email'], ['contactPhone', 'Phone'], ['totalDrives', 'Total Drives'], ['status', 'Status']],
  applications: [['studentName', 'Student Name'], ['rollNumber', 'Roll / Registration No.'], ['branch', 'Branch'], ['semesterBatch', 'Semester / Batch'], ['companyName', 'Company'], ['role', 'Job Role'], ['eligibilityLabel', 'Eligibility'], ['status', 'Application Status']],
  interviews: [['studentName', 'Student'], ['companyName', 'Company'], ['role', 'Job Role'], ['roundName', 'Interview Round'], ['scheduledAt', 'Date & Time'], ['modeVenue', 'Mode / Venue'], ['status', 'Status']],
  offers: [['studentName', 'Student'], ['companyName', 'Company'], ['role', 'Job Role'], ['package', 'Offered CTC'], ['offerDate', 'Offer Date'], ['offerStatus', 'Offer Status'], ['joiningDate', 'Joining Date'], ['placementStatus', 'Placement Status']],
}
const clean = value => value == null || value === '' ? '—' : String(value)
const status = value => api.statusCode(value)
const label = value => api.statusLabel(value)
const numeric = value => value === '' || value == null ? null : Number(value)
const finalApplication = row => ['SELECTED', 'REJECTED', 'WITHDRAWN'].includes(status(row.applicationStatus || row.status))

export default function PlacementWorkspace() {
  const academic = useAcademic()
  return <PlacementContent key={`${academic.selectedCollegeId}:${academic.selectedAcademicYearId}`} academic={academic} />
}

function PlacementContent({ academic }) {
  const { selectedCollegeId: collegeId, selectedAcademicYearId: academicYearId } = academic
  const scope = { collegeId, academicYearId, enabled: Boolean(collegeId) }
  const { data, state, reload, mutate } = useScopedModule(api.loadPlacements, scope, empty)
  const { canAction } = useScreenAccess()
  const [tab, setTab] = useState('drives')
  const [filters, setFilters] = useState({ query: '', companyId: '', driveId: '', branchId: '', date: '', round: '', batch: '', eligibility: '', status: '' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState('')
  const canCreate = canAction(route, 'create')
  const canEdit = canAction(route, 'edit')
  const canDelete = canAction(route, 'delete')
  const ready = key => !state.loading && !state.waitingForContext && !state.error && !data.resourceErrors?.[key]
  const branches = academic.branches || []
  const branchName = id => branches.find(row => String(row.branchId || row.id) === String(id))?.branchName || branches.find(row => String(row.branchId || row.id) === String(id))?.name || (id ? `Branch ${id}` : '')
  const rows = data[tab].map(row => ({
    ...row,
    branches: data.relatedErrors?.[`rules-${row.id}`] ? 'Unavailable' : [...new Set((row.eligibleBranches || []).map(branchName))].join(', '),
    branch: branchName(row.branchId),
    semesterBatch: [row.semesterId ? academic.semesters?.find(item => String(item.semesterId || item.id) === String(row.semesterId))?.semesterName || `Semester ${row.semesterId}` : '', row.batch].filter(Boolean).join(' / '),
    package: placementMoney(tab === 'offers' ? row.offeredCtc : row.ctcMax ?? row.ctcMin, row.currencyCode || 'INR'),
    totalDrives: ready('drives') ? data.drives.filter(drive => String(drive.companyId) === String(row.companyId)).length : null,
    eligibilityLabel: data.relatedErrors?.[`eligibility-${row.driveId}`] ? 'Unavailable' : row.eligibilityStatus ? label(row.eligibilityStatus) : 'Not evaluated',
    modeVenue: [row.interviewMode && label(row.interviewMode), row.venue || row.meetingUrl].filter(Boolean).join(' · '),
    joiningDate: row.joinedAt || row.expectedJoiningDate,
    placementStatus: row.joinedAt ? 'Joined' : label(row.selectionStatus),
  }))
  const filtered = rows.filter(row => {
    const rowDate = row.driveStartAt || row.scheduledAt || row.offerDate || row.appliedAt
    return (!filters.query || [row.title, row.role, row.name, row.company, row.companyName, row.studentName, row.rollNumber, row.industry, row.contactPerson].some(value => String(value || '').toLowerCase().includes(filters.query.toLowerCase()))) &&
      (!filters.companyId || String(row.companyId) === filters.companyId) && (!filters.driveId || String(row.driveId) === filters.driveId) &&
      (!filters.branchId || String(row.branchId) === filters.branchId || row.eligibleBranches?.some(id => String(id) === filters.branchId)) &&
      (!filters.date || placementLocalInput(rowDate).slice(0, 10) === filters.date) && (!filters.round || row.roundName === filters.round) &&
      (!filters.batch || String(row.batch) === filters.batch) && (!filters.eligibility || row.eligibilityStatus === filters.eligibility) &&
      (!filters.status || String(tab === 'offers' ? row.offerStatus : row.status) === filters.status)
  })
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pages)
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const changeFilter = (key, value) => { setFilters(current => ({ ...current, [key]: value })); setPage(1) }
  const clearFilters = () => { setFilters({ query: '', companyId: '', driveId: '', branchId: '', date: '', round: '', batch: '', eligibility: '', status: '' }); setPage(1) }
  const switchTab = next => { setTab(next); clearFilters() }
  const newRecord = (type, form = {}) => {
    if (!canCreate) return
    setDialog({ mode: 'edit', type, form })
  }
  const openEdit = (type, row) => {
    if (!canEdit) return
    setDialog({ mode: 'edit', type, old: row, form: row })
  }
  const run = async (action, message) => {
    let result
    const success = await mutate(async () => { result = await action() }, { onError: error => { throw error } })
    if (!success) throw new Error('The data is still loading. Please retry.')
    setNotice(message)
    return result
  }
  const saveRecord = async (type, form, old) => {
    if (!canAction(route, old ? 'edit' : 'create')) throw new Error('You do not have permission to save this record.')
    const result = await run(() => api.savePlacement(type, form, Boolean(old), scope, data), 'Record saved.')
    if (type === 'company' && !old && dialog.returnTo && result?.companyId) {
      setDialog({ ...dialog.returnTo, form: { ...dialog.returnTo.form, companyId: String(result.companyId) } })
    } else if (type === 'drive' && !old && result?.driveId) {
      setDialog({ mode: 'rules', row: { ...result, id: String(result.driveId), title: result.driveName } })
    } else setDialog(null)
  }
  const openAction = (operation, row, type = singular[tab]) => setDialog({ mode: 'action', operation, row, type })
  const actionsFor = row => {
    const options = []
    if (canEdit && (tab === 'companies' || tab === 'drives' || (tab === 'applications' && !finalApplication(row)) || (tab === 'interviews' && row.interviewStatus === 'SCHEDULED'))) options.push(['edit', 'Edit'])
    if (tab === 'drives') {
      options.push(['rules', 'Eligibility rules'], ['applications', 'Student applications'])
      if (canEdit) options.push(['evaluate', 'Verify eligibility'])
      if (canEdit && driveTransitions[status(row.driveStatus)]?.length) options.push(['status', 'Update status'])
      if (canDelete && status(row.driveStatus) === 'DRAFT' && row.applicantsCount === 0) options.push(['delete', 'Delete draft'])
    }
    if (tab === 'companies' && canDelete) options.push(['delete', 'Delete company'])
    if (tab === 'applications') {
      if (canEdit && applicationTransitions[status(row.applicationStatus)]?.length && !data.offers.some(offer => String(offer.applicationId) === String(row.applicationId))) options.push(['status', 'Update / shortlist'])
      if (canCreate && ['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'IN_PROGRESS', 'ON_HOLD'].includes(status(row.applicationStatus))) options.push(['schedule', 'Schedule interview'])
      if (canEdit && !finalApplication(row)) options.push(['selection', 'Selection decision'])
    }
    if (tab === 'interviews' && canEdit) {
      if (['SCHEDULED', 'COMPLETED'].includes(row.interviewStatus)) options.push(['result', 'Record result'])
      if (row.interviewStatus === 'SCHEDULED') options.push(['status', 'Cancel / no-show'])
    }
    if (tab === 'offers' && canEdit && row.selectionStatus === 'SELECTED' && !row.joinedAt) {
      if (offerTransitions[row.offerStatus]?.length) options.push(['offer', 'Manage offer'])
      if (row.offerStatus === 'ACCEPTED') options.push(['join', 'Record joining'])
    }
    return options
  }
  const chooseAction = (action, row) => {
    const type = singular[tab]
    if (action === 'edit') return openEdit(type, row)
    if (action === 'rules' || action === 'evaluate') return setDialog({ mode: action, row })
    if (action === 'applications') { setTab('applications'); clearFilters(); changeFilter('driveId', String(row.id)); return }
    if (action === 'schedule') return newRecord('interview', { applicationId: row.id })
    openAction(action, row, type)
  }
  const count = (resource, value) => ready(resource) ? value : '—'
  const selectedStudents = new Set(data.offers.filter(row => row.selectionStatus === 'SELECTED').map(row => String(row.studentId)))
  const exportColumns = headings[tab].map(([key, title]) => ({ key, label: title }))
  const exportRows = filtered.map(row => ({ ...row,
    driveStartAt: placementDateLabel(row.driveStartAt), scheduledAt: placementDateLabel(row.scheduledAt),
    offerDate: placementDateLabel(row.offerDate), joiningDate: placementDateLabel(row.joiningDate),
  }))
  return <DashboardLayout>
    <div className="placement-workspace">
      <PageHeader title="Training & Placements" subtitle="Manage recruitment drives, recruiters, student applications and placement outcomes."
        compactSummary={[
          { label: 'Active Drives', value: count('drives', data.drives.filter(row => ['PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING'].includes(status(row.driveStatus))).length) },
          { label: 'Partner Companies', value: count('companies', data.companies.length) },
          { label: 'Student Applications', value: count('applications', data.applications.length) },
          { label: 'Students Placed', value: count('offers', selectedStudents.size) },
        ]}
        secondaryActions={canCreate && tab !== 'drives' && <button disabled={!ready(tab) || !ready('applications') && ['interviews', 'offers'].includes(tab)} onClick={() => newRecord(singular[tab])}><FiPlus />{({ companies: 'Add Company', applications: 'Add Application', interviews: 'Schedule Interview', offers: 'Record Selection' })[tab]}</button>}
        primaryAction={canCreate && <button className="placement-primary" disabled={!ready('companies') || !academicYearId} onClick={() => newRecord('drive')}><FiPlus /> New Drive</button>} />
      <ScopedModuleNotice state={state} data={data} resource={tab} onRetry={reload} showRelated={false} />
      {notice && <p className="placement-notice" role="status">{notice}</p>}
      <nav className="placement-tabs" aria-label="Placement views">
        {tabs.map(([key, title]) => <button key={key} aria-current={key === tab ? 'page' : undefined} onClick={() => switchTab(key)}>{title}</button>)}
      </nav>
      <section className="placement-panel" aria-label={tabs.find(([key]) => key === tab)[1]}>
        <FilterPanel className="placement-filters" active={Object.entries(filters).some(([key, value]) => key !== 'query' && Boolean(value))} onClear={clearFilters}
          search={<label className="placement-search"><FiSearch aria-hidden="true" /><input aria-label="Search placement records" placeholder="Search name, role, company or registration number" value={filters.query} onChange={event => changeFilter('query', event.target.value)} /></label>}
          filters={<>
            {tab !== 'companies' && <FilterSelect name="Company" value={filters.companyId} options={data.companies.map(row => ({ value: row.id, label: row.name }))} onChange={value => changeFilter('companyId', value)} />}
            {tab === 'applications' && <FilterSelect name="Drive" value={filters.driveId} options={data.drives.map(row => ({ value: row.id, label: row.title }))} onChange={value => changeFilter('driveId', value)} />}
            {['drives', 'applications'].includes(tab) && <FilterSelect name="Branch" value={filters.branchId} options={branches.map(row => ({ value: String(row.branchId || row.id), label: row.branchName || row.name }))} onChange={value => changeFilter('branchId', value)} />}
            {['drives', 'interviews'].includes(tab) && <label>Date<input type="date" value={filters.date} onChange={event => changeFilter('date', event.target.value)} /></label>}
            {tab === 'applications' && <FilterSelect name="Eligibility" value={filters.eligibility} options={['ELIGIBLE', 'NOT_ELIGIBLE', 'PENDING']} onChange={value => changeFilter('eligibility', value)} />}
            {tab === 'interviews' && <FilterSelect name="Round" value={filters.round} options={[...new Set(rows.map(row => row.roundName).filter(Boolean))]} onChange={value => changeFilter('round', value)} />}
            {tab === 'offers' && <FilterSelect name="Batch" value={filters.batch} options={[...new Set(rows.map(row => String(row.batch)).filter(Boolean))]} onChange={value => changeFilter('batch', value)} />}
            <FilterSelect name={tab === 'offers' ? 'Offer Status' : 'Status'} value={filters.status} options={[...new Set(rows.map(row => tab === 'offers' ? row.offerStatus : row.status).filter(Boolean))]} onChange={value => changeFilter('status', value)} />
          </>}
          actions={canAction(route, 'export') && <ExportMenu rows={ready(tab) ? exportRows : []} columns={exportColumns} title={tabs.find(([key]) => key === tab)[1]} filename={`placements-${tab}`} />} />
        <div className="placement-table-scroll"><table className="placement-table">
          <thead><tr>{headings[tab].map(([key, title]) => <th key={key} scope="col">{title}</th>)}<th scope="col">Actions</th></tr></thead>
          <tbody>{ready(tab) && visible.map(row => <tr key={row.id}>
            {headings[tab].map(([key]) => <td key={key}>{key === 'title' ? <><strong>{row.title}</strong><small>{row.role}</small></> : ['driveStartAt', 'scheduledAt', 'offerDate', 'joiningDate'].includes(key) ? <>{placementDateLabel(row[key])}{key === 'joiningDate' && !row.joinedAt && row.expectedJoiningDate && <small>Expected</small>}</> : key === 'offerStatus' ? label(row[key]) : clean(row[key])}</td>)}
            <td><div className="placement-row-actions"><button onClick={() => setDialog({ mode: 'view', type: singular[tab], row })}>View</button>
              {actionsFor(row).length > 0 && <select aria-label={`Actions for ${row.title || row.name || row.studentName || row.id}`} value="" onChange={event => chooseAction(event.target.value, row)}><option value="">More actions</option>{actionsFor(row).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select>}
            </div></td>
          </tr>)}</tbody>
        </table></div>
        {(!ready(tab) || !filtered.length) && <div className="placement-empty" role={data.resourceErrors?.[tab]?.status === 403 ? 'alert' : 'status'}>
          <FiBriefcase aria-hidden="true" />
          <p>{state.waitingForContext ? 'Select a college to load placements.' : state.loading ? 'Loading placement records…' : !ready(tab) ? data.resourceErrors?.[tab]?.status === 403 ? 'You do not have access to these records.' : 'Unable to load records. Please retry.' : rows.length ? 'No records match the selected filters.' : 'No records yet.'}</p>
          {!ready(tab) && !state.loading && !state.waitingForContext && <button onClick={() => reload().catch(() => {})}>Retry</button>}
        </div>}
        <footer className="placement-pagination">
          <span>{ready(tab) ? `${filtered.length} matching records` : 'Records unavailable'}</span>
          <label>Rows per page<select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1) }}>{[10, 25, 50].map(value => <option key={value}>{value}</option>)}</select></label>
          <TablePagination page={currentPage} totalPages={pages} onPageChange={setPage} />
        </footer>
      </section>
      {dialog?.mode === 'edit' && <PlacementEditor key={`${dialog.type}:${dialog.old?.id || 'new'}`} dialog={dialog} data={data} busy={state.saving} onSave={saveRecord}
        onAddCompany={canCreate && dialog.type === 'drive' ? form => setDialog({ mode: 'edit', type: 'company', form: {}, returnTo: { ...dialog, form, localDates: true } }) : undefined}
        onClose={() => setDialog(dialog.returnTo || null)} />}
      {dialog?.mode === 'view' && <PlacementDetails dialog={dialog} data={data} scope={scope} canEdit={canEdit} onEdit={() => openEdit(dialog.type, dialog.row)} onClose={() => setDialog(null)} />}
      {dialog?.mode === 'rules' && <EligibilityRules drive={dialog.row} data={data} academic={academic} scope={scope} run={run} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} busy={state.saving} onClose={() => setDialog(null)} />}
      {dialog?.mode === 'evaluate' && <EligibilityReview drive={dialog.row} data={data} scope={scope} run={run} canEdit={canEdit} busy={state.saving} onClose={() => setDialog(null)} />}
      {dialog?.mode === 'action' && <PlacementAction dialog={dialog} data={data} scope={scope} run={run} allowed={dialog.operation === 'delete' ? canDelete : canEdit} busy={state.saving} onClose={() => setDialog(null)} />}
    </div>
  </DashboardLayout>
}

function FilterSelect({ name, value, options, onChange }) {
  return <label>{name}<select value={value} onChange={event => onChange(event.target.value)}><option value="">All</option>{options.map(item => <option key={item.value ?? item} value={item.value ?? item}>{item.label ?? label(item)}</option>)}</select></label>
}

function PlacementForm({ title, busy, onClose, onSubmit, children, submitLabel = 'Save', footer = null }) {
  const lock = useRef(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const formId = 'placement-mutation-form'
  const submit = async event => {
    event.preventDefault()
    if (lock.current) return
    lock.current = true; setPending(true); setError('')
    try { await onSubmit() } catch (failure) { setError(failure.message || 'Unable to save. Please retry.') }
    finally { lock.current = false; setPending(false) }
  }
  const saving = busy || pending
  return <ViewDialog title={title} maxWidth="820px" className="placement-dialog" showExport={false} busy={saving} onClose={onClose}
    footerContent={<><button disabled={saving} onClick={onClose}>Cancel</button>{footer}<button className="placement-primary" type="submit" form={formId} disabled={saving}>{saving ? 'Saving…' : submitLabel}</button></>}>
    <form id={formId} className="placement-form" onSubmit={submit}><fieldset disabled={saving}>{children}</fieldset>{error && <p className="placement-error" role="alert">{error}</p>}</form>
  </ViewDialog>
}

function Field({ name, title, form, setForm, errors = {}, type = 'text', ...props }) {
  const id = `placement-field-${name}`
  return <label htmlFor={id}>{title}<input {...props} id={id} type={type} value={form[name] ?? ''} onChange={event => setForm(current => ({ ...current, [name]: event.target.value }))} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${id}-error` : undefined} />{errors[name] && <small id={`${id}-error`} className="placement-error" role="alert">{errors[name]}</small>}</label>
}

function Choice({ name, title, form, setForm, options, disabled, required, searchable = false }) {
  return <label>{title}<ProjectSelect forceCustom={searchable} aria-label={title} required={required} disabled={disabled} value={form[name] ?? ''} onChange={event => setForm(current => ({ ...current, [name]: event.target.value }))}>
    <option value="">Select {title.replace(' *', '').toLowerCase()}</option>{options.map(item => <option key={item.value ?? item} value={item.value ?? item}>{item.label ?? label(item)}</option>)}
  </ProjectSelect></label>
}

function PlacementEditor({ dialog, data, busy, onSave, onClose, onAddCompany }) {
  const { type, old } = dialog
  const [form, setForm] = useState(() => {
    const row = dialog.form
    return { ...row,
      driveStartAt: dialog.localDates ? row.driveStartAt : placementLocalInput(row.driveStartAt), driveEndAt: dialog.localDates ? row.driveEndAt : placementLocalInput(row.driveEndAt),
      applicationOpenAt: dialog.localDates ? row.applicationOpenAt : placementLocalInput(row.applicationOpenAt), applicationCloseAt: dialog.localDates ? row.applicationCloseAt : placementLocalInput(row.applicationCloseAt),
      scheduledAt: placementLocalInput(row.scheduledAt), expectedJoiningDate: placementLocalInput(row.expectedJoiningDate),
      roundName: row.roundName || '', interviewRoundType: row.roundType || '',
    }
  })
  const [errors, setErrors] = useState({})
  const field = (name, title, props = {}) => <Field {...props} name={name} title={title} form={form} setForm={setForm} errors={errors} />
  const choice = (name, title, options, props = {}) => <Choice {...props} name={name} title={title} options={options} form={form} setForm={setForm} />
  const selectedApplication = data.applications.find(row => String(row.id) === String(form.applicationId))
  const eligible = data.eligibility.find(row => String(row.driveId) === String(form.driveId) && String(row.studentId) === String(form.studentId))
  const submit = async () => {
    const found = validatePlacementForm(type, form, data, Boolean(old))
    if (!old && type === 'application' && eligible?.eligibilityStatus !== 'ELIGIBLE') found.studentId = 'Verify eligibility before submitting an application.'
    setErrors(found)
    if (Object.keys(found).length) throw new Error(Object.values(found)[0])
    const payload = { ...form }
    const dates = type === 'drive' ? ['driveStartAt', 'driveEndAt', 'applicationOpenAt', 'applicationCloseAt'] : type === 'interview' ? ['scheduledAt'] : type === 'offer' ? ['expectedJoiningDate'] : []
    dates.forEach(key => { payload[key] = placementUtc(form[key]) })
    await onSave(type, payload, old)
  }
  const title = `${old ? 'Edit' : type === 'offer' ? 'Record' : type === 'drive' ? 'New' : 'Add'} ${({ company: 'Company', drive: 'Recruitment Drive', application: 'Student Application', interview: 'Interview', offer: 'Selection Decision' })[type]}`
  return <PlacementForm title={title} busy={busy} onClose={onClose} onSubmit={submit} submitLabel={old ? 'Save Changes' : type === 'drive' ? 'Create Drive' : 'Save'}>
    {type === 'company' && <>
      {field('name', 'Company Name *', { required: true, maxLength: 200 })}{field('industry', 'Industry')}
      {field('contactPerson', 'Contact Person')}{field('contactEmail', 'Email', { type: 'email' })}
      {field('contactPhone', 'Phone', { type: 'tel' })}{field('website', 'Website', { type: 'url' })}
      {field('hq', 'Address')}{choice('status', 'Status *', ['Active', 'Inactive'], { required: true })}
    </>}
    {type === 'drive' && <>
      <div className="placement-company-field">{choice('companyId', 'Company *', data.companies.filter(row => row.status !== 'Inactive' || String(row.id) === String(form.companyId)).map(row => ({ value: row.id, label: row.name })), { required: true, searchable: true })}
        {onAddCompany && <button type="button" onClick={() => onAddCompany(form)}>Add Company</button>}
      </div>
      {field('title', 'Drive Title *', { required: true, maxLength: 200 })}
      {field('role', 'Job Role *', { required: true, maxLength: 150 })}{choice('employmentType', 'Job Type *', ['FULL_TIME', 'INTERNSHIP', 'CONTRACT', 'APPRENTICESHIP'], { required: true })}
      {field('driveStartAt', 'Drive Start *', { type: 'datetime-local', required: true })}{field('driveEndAt', 'Drive End', { type: 'datetime-local', min: form.driveStartAt })}
      {field('applicationOpenAt', 'Applications Open', { type: 'datetime-local', max: form.driveStartAt })}{field('applicationCloseAt', 'Application Deadline', { type: 'datetime-local', min: form.applicationOpenAt, max: form.driveEndAt || form.driveStartAt })}
      {field('ctcMin', 'Minimum Annual CTC (₹)', { type: 'number', min: 0, step: '.01' })}{field('ctcMax', 'Maximum Annual CTC (₹)', { type: 'number', min: form.ctcMin || 0, step: '.01' })}
      {field('monthlyStipend', 'Monthly Stipend (₹)', { type: 'number', min: 0, step: '.01' })}{field('vacancies', 'Vacancies', { type: 'number', min: 1, step: 1 })}
      {choice('driveType', 'Recruitment Mode *', ['ON_CAMPUS', 'OFF_CAMPUS', 'POOLED', 'VIRTUAL'], { required: true })}{field('venue', 'Venue', { maxLength: 250 })}
      {field('jobLocation', 'Job Location', { maxLength: 250 })}{field('meetingUrl', 'Meeting URL', { type: 'url', required: form.driveType === 'VIRTUAL' })}
      {old && field('driveCode', 'Drive Code', { required: true, maxLength: 50 })}
      <label className="placement-full">Job Description<textarea rows={3} maxLength={10000} value={form.description || ''} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} /></label>
      <p className="placement-hint placement-full">{old ? 'Manage course, branch and academic criteria in Eligibility rules.' : 'The drive is saved as a draft. Configure eligibility rules next.'}</p>
    </>}
    {type === 'application' && <>
      {choice('driveId', 'Drive *', data.drives.map(row => ({ value: row.id, label: `${row.title} · ${row.company || row.companyId}` })), { required: true, disabled: Boolean(old), searchable: true })}
      {choice('studentId', 'Student *', data.students.map(row => ({ value: String(row.studentId || row.id), label: `${row.fullName || row.studentName || row.name} · ${row.rollNumber || row.admissionNumber || row.studentCode || row.studentId}` })), { required: true, disabled: Boolean(old), searchable: true })}
      {!old && <p className="placement-hint placement-full">Eligibility — {data.relatedErrors?.[`eligibility-${form.driveId}`] ? 'Unavailable' : eligible ? `${label(eligible.eligibilityStatus)}. ${eligible.reason || ''}` : 'Not evaluated'}</p>}
      {field('resumeUrl', 'Resume Document Path', { maxLength: 1000 })}
      <label className="placement-full">Cover Letter<textarea rows={3} value={form.coverLetter || ''} onChange={event => setForm(current => ({ ...current, coverLetter: event.target.value }))} /></label>
      {field('remarks', 'Remarks', { maxLength: 2000 })}
    </>}
    {type === 'interview' && <>
      {choice('applicationId', 'Application *', data.applications.filter(row => !finalApplication(row) || row.id === form.applicationId).map(row => ({ value: row.id, label: `${row.studentName || row.studentId} · ${row.role} · ${row.companyName || row.companyId}` })), { required: true, disabled: Boolean(old), searchable: true })}
      {field('roundNumber', 'Round Number *', { type: 'number', min: 1, step: 1, required: true, disabled: Boolean(old) })}
      {field('roundName', 'Round Name *', { required: true, maxLength: 150 })}{choice('interviewRoundType', 'Round Type *', ['APTITUDE', 'CODING', 'GROUP_DISCUSSION', 'TECHNICAL', 'HR', 'MANAGERIAL', 'OTHER'], { required: true })}
      {field('scheduledAt', 'Date & Time *', { type: 'datetime-local', required: true })}{choice('interviewMode', 'Interview Mode *', ['ONLINE', 'OFFLINE', 'TELEPHONE'], { required: true })}
      {field('venue', 'Venue', { required: form.interviewMode === 'OFFLINE', maxLength: 250 })}{field('meetingUrl', 'Meeting URL', { type: 'url', required: form.interviewMode === 'ONLINE' })}
      {field('interviewerName', 'Interviewer', { maxLength: 150 })}
      {selectedApplication && <p className="placement-hint placement-full">{selectedApplication.studentName} · {selectedApplication.role} · {selectedApplication.status}</p>}
    </>}
    {type === 'offer' && <>
      {choice('applicationId', 'Application *', data.applications.filter(row => !finalApplication(row)).map(row => ({ value: row.id, label: `${row.studentName || row.studentId} · ${row.companyName || row.companyId} · ${row.role}` })), { required: true, searchable: true })}
      {choice('selectionStatus', 'Selection Decision *', ['SELECTED', 'REJECTED', 'ON_HOLD'], { required: true })}
      {field('role', 'Offered Job Title', { maxLength: 150 })}{field('offeredCtc', 'Offered Annual CTC (₹)', { type: 'number', min: 0, step: '.01' })}
      {field('monthlyStipend', 'Monthly Stipend (₹)', { type: 'number', min: 0, step: '.01' })}{field('location', 'Job Location', { maxLength: 250 })}
      {field('expectedJoiningDate', 'Expected Joining Date', { type: 'datetime-local' })}{field('remarks', 'Remarks', { maxLength: 2000 })}
    </>}
  </PlacementForm>
}

function recordFields(record) {
  return Object.entries(record || {}).filter(([, value]) => value !== null && value !== undefined && value !== '').map(([key, value]) => [
    key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, first => first.toUpperCase()),
    typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
  ])
}

function PlacementDetails({ dialog, data, scope, canEdit, onEdit, onClose }) {
  const { type, row } = dialog
  const [details, setDetails] = useState(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState(null)
  const [historyError, setHistoryError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    const collection = { company: 'companies', drive: 'drives', application: 'applications', interview: 'interviews', offer: 'selections' }[type]
    api.call(`placements/${collection}/${api.requireId(row.id)}`, { query: { collegeId: scope.collegeId } }).then(result => {
      if (active) setDetails(api.record(api.unwrap(result)))
    }).catch(failure => { if (active) setError(failure.message) })
    if (type === 'application') {
      api.list(`placements/applications/${row.id}/interviews`, { collegeId: scope.collegeId }).then(result => {
        if (active) setHistory(result)
      }).catch(failure => { if (active) setHistoryError(failure.message) })
    }
    return () => { active = false }
  }, [type, row.id, scope.collegeId, attempt])
  const selection = type === 'application' && data.offers.find(offer => String(offer.applicationId) === String(row.id))
  const editable = type === 'company' || type === 'drive' || (type === 'application' && !finalApplication(row)) || (type === 'interview' && row.interviewStatus === 'SCHEDULED')
  return <ViewDialog title={`${label(type)} Details`} maxWidth="820px" className="placement-dialog" showExport={false} onClose={onClose}
    footerActions={canEdit && editable && <button className="placement-primary" onClick={onEdit}>Edit</button>}>
    {error ? <p className="placement-error" role="alert">{error} <button onClick={() => { setError(''); setDetails(null); setAttempt(attempt + 1) }}>Retry</button></p> : !details ? <p role="status">Loading details…</p> : <dl className="placement-details">
      {recordFields(details).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}
    </dl>}
    {type === 'application' && <section className="placement-history">
      <h3>Interview History</h3>
      {historyError ? <p role="alert" className="placement-error">{historyError}</p> : history === null ? <p role="status">Loading interview history…</p> : history.length ? history.map(round => <article key={round.interviewId}>
        <strong>{round.roundNumber}. {round.roundName}</strong><span>{placementDateLabel(round.scheduledAt)}</span>
        <span>{label(round.interviewStatus)} · {label(round.interviewResult)}</span><p>{round.feedback}</p>
      </article>) : <p>No interview rounds recorded.</p>}
      {selection && <><h3>Selection / Offer</h3><dl className="placement-details">{recordFields(selection).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></>}
    </section>}
  </ViewDialog>
}

const blankRule = {
  ruleName: '', courseId: '', branchId: '', graduationYear: '', minCgpa: '', minPercentage: '',
  minTenthPercentage: '', minTwelfthPercentage: '', maxActiveBacklogs: '', maxEducationGapYears: '',
  allowAlreadyPlaced: false, description: '', status: true,
}

function EligibilityRules({ drive, data, academic, scope, run, canCreate, canEdit, canDelete, busy, onClose }) {
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [pending, setPending] = useState(false)
  const lock = useRef(false)
  const rules = data.rules.filter(row => String(row.driveId) === String(drive.id))
  const lookupError = data.relatedErrors?.[`rules-${drive.id}`]
  const setForm = updater => setEditing(current => {
    const next = updater(current)
    return next.courseId !== current.courseId ? { ...next, branchId: '' } : next
  })
  const field = (name, title, props = {}) => <Field {...props} name={name} title={title} form={editing} setForm={setForm} />
  const save = async event => {
    event.preventDefault()
    if (lock.current || !editing || !(editing.eligibilityRuleId ? canEdit : canCreate)) return
    lock.current = true; setPending(true); setError('')
    try {
      const body = {
        ruleName: editing.ruleName.trim(),
        allowAlreadyPlaced: Boolean(editing.allowAlreadyPlaced),
        description: editing.description || null,
        status: Boolean(editing.status),
      }
      ;['courseId', 'branchId', 'graduationYear', 'minCgpa', 'minPercentage', 'minTenthPercentage', 'minTwelfthPercentage', 'maxActiveBacklogs', 'maxEducationGapYears'].forEach(key => { body[key] = numeric(editing[key]) })
      const path = `placements/drives/${drive.id}/eligibility-rules${editing.eligibilityRuleId ? `/${editing.eligibilityRuleId}` : ''}`
      await run(() => api.call(path, { method: editing.eligibilityRuleId ? 'PUT' : 'POST', query: { collegeId: scope.collegeId }, body }), 'Eligibility rule saved.')
      setEditing(null)
    } catch (failure) { setError(failure.message) }
    finally { lock.current = false; setPending(false) }
  }
  const remove = async () => {
    if (!canDelete || lock.current) return
    lock.current = true; setPending(true); setError('')
    try {
      await run(() => api.call(`placements/drives/${drive.id}/eligibility-rules/${deleting.eligibilityRuleId}`, { method: 'DELETE', query: { collegeId: scope.collegeId } }), 'Eligibility rule removed.')
      setDeleting(null)
    } catch (failure) { setError(failure.message) }
    finally { lock.current = false; setPending(false) }
  }
  return <ViewDialog title={`Eligibility Rules · ${drive.title}`} maxWidth="820px" className="placement-dialog" showExport={false} busy={busy || pending} onClose={onClose}
    footerContent={<><button disabled={pending || busy} onClick={onClose}>Done</button>{editing && <button className="placement-primary" type="submit" form="placement-rule-form" disabled={pending || busy}>{pending || busy ? 'Saving…' : 'Save Rule'}</button>}</>}>
    {lookupError && <p role="alert" className="placement-error">Eligibility rules could not be loaded. {lookupError.message}</p>}
    {deleting ? <div><p>Remove eligibility rule “{deleting.ruleName}”?</p><button disabled={pending || busy} onClick={() => setDeleting(null)}>Keep Rule</button> <button disabled={pending || busy} onClick={remove}>Remove Rule</button></div> : <>
      <div className="placement-table-scroll"><table className="placement-table placement-rule-table"><thead><tr><th>Rule</th><th>Course / Branch</th><th>Minimum</th><th>Backlogs</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {rules.map(rule => <tr key={rule.eligibilityRuleId}><td>{rule.ruleName}</td><td>{clean(rule.courseId)} / {clean(rule.branchId)}</td><td>CGPA {clean(rule.minCgpa)} · {clean(rule.minPercentage)}%</td><td>{clean(rule.maxActiveBacklogs)}</td><td>{rule.status ? 'Active' : 'Inactive'}</td><td><div className="placement-row-actions">{canEdit && <button onClick={() => { setError(''); setEditing({ ...rule, allowAlreadyPlaced: Boolean(rule.allowAlreadyPlaced), status: Boolean(rule.status) }) }}>Edit</button>}{canDelete && <button onClick={() => setDeleting(rule)}>Remove</button>}</div></td></tr>)}
        {!rules.length && <tr><td colSpan={6}>No eligibility rules saved.</td></tr>}
      </tbody></table></div>
      {!editing && canCreate && <button onClick={() => { setError(''); setEditing({ ...blankRule }) }}><FiPlus /> Add Rule</button>}
      {editing && <form id="placement-rule-form" className="placement-form" onSubmit={save}><fieldset disabled={busy || pending}>
        {field('ruleName', 'Rule Name *', { required: true, maxLength: 150 })}
        <Choice name="courseId" title="Eligible Course" form={editing} setForm={setForm} options={(academic.courses || []).map(row => ({ value: String(row.courseId || row.id), label: row.courseName || row.name }))} />
        <Choice name="branchId" title="Eligible Branch" form={editing} setForm={setForm} options={(academic.branches || []).filter(row => !editing.courseId || String(row.courseId) === String(editing.courseId)).map(row => ({ value: String(row.branchId || row.id), label: row.branchName || row.name }))} />
        {field('graduationYear', 'Passing Year', { type: 'number', min: 1900, max: 9999, step: 1 })}
        {field('minCgpa', 'Minimum CGPA', { type: 'number', min: 0, max: 10, step: '.01' })}{field('minPercentage', 'Minimum Percentage', { type: 'number', min: 0, max: 100, step: '.01' })}
        {field('minTenthPercentage', 'Minimum Class 10 Percentage', { type: 'number', min: 0, max: 100, step: '.01' })}{field('minTwelfthPercentage', 'Minimum Class 12 Percentage', { type: 'number', min: 0, max: 100, step: '.01' })}
        {field('maxActiveBacklogs', 'Maximum Active Backlogs', { type: 'number', min: 0, step: 1 })}{field('maxEducationGapYears', 'Maximum Education Gap (Years)', { type: 'number', min: 0, step: 1 })}
        <label className="placement-checkbox"><input type="checkbox" checked={editing.allowAlreadyPlaced} onChange={event => setEditing(current => ({ ...current, allowAlreadyPlaced: event.target.checked }))} />Allow already placed students</label>
        <label className="placement-checkbox"><input type="checkbox" checked={editing.status} onChange={event => setEditing(current => ({ ...current, status: event.target.checked }))} />Active rule</label>
        <label className="placement-full">Description<textarea rows={2} maxLength={1000} value={editing.description || ''} onChange={event => setEditing(current => ({ ...current, description: event.target.value }))} /></label>
        <button type="button" onClick={() => setEditing(null)}>Cancel Rule Edit</button>
      </fieldset></form>}
    </>}
    {error && <p role="alert" className="placement-error">{error}</p>}
  </ViewDialog>
}

function EligibilityReview({ drive, data, scope, run, canEdit, busy, onClose }) {
  const [form, setForm] = useState({ studentId: '' })
  const selected = data.eligibility.find(row => String(row.driveId) === String(drive.id) && String(row.studentId) === String(form.studentId))
  const field = (name, title, props) => <Field {...props} name={name} title={title} form={form} setForm={setForm} />
  const submit = async () => {
    if (!canEdit) throw new Error('You do not have permission to evaluate eligibility.')
    if (!form.studentId) throw new Error('Select a saved student.')
    const body = { studentId: api.requireId(form.studentId, 'student') }
    ;['studentCgpa', 'studentPercentage', 'tenthPercentage', 'twelfthPercentage', 'activeBacklogs', 'educationGapYears', 'graduationYear'].forEach(key => { body[key] = numeric(form[key]) })
    await run(() => api.call(`placements/drives/${drive.id}/eligibility/evaluate`, { method: 'POST', query: { collegeId: scope.collegeId }, body }), 'Eligibility evaluated.')
  }
  return <PlacementForm title={`Verify Eligibility · ${drive.title}`} busy={busy} onClose={onClose} onSubmit={submit} submitLabel="Evaluate Eligibility"
    footer={!canEdit && <span>View access only</span>}>
    <Choice name="studentId" title="Student *" searchable required form={form} setForm={setForm} options={data.students.map(row => ({ value: String(row.studentId || row.id), label: `${row.fullName || row.studentName || row.name} · ${row.rollNumber || row.admissionNumber || row.studentCode || row.studentId}` }))} />
    <p className="placement-hint">Enter verified academic values. Leave unavailable values blank.</p>
    {canEdit && <>
      {field('studentCgpa', 'CGPA', { type: 'number', min: 0, max: 10, step: '.01' })}{field('studentPercentage', 'Percentage', { type: 'number', min: 0, max: 100, step: '.01' })}
      {field('tenthPercentage', 'Class 10 Percentage', { type: 'number', min: 0, max: 100, step: '.01' })}{field('twelfthPercentage', 'Class 12 Percentage', { type: 'number', min: 0, max: 100, step: '.01' })}
      {field('activeBacklogs', 'Active Backlogs', { type: 'number', min: 0, step: 1 })}{field('educationGapYears', 'Education Gap (Years)', { type: 'number', min: 0, step: 1 })}
      {field('graduationYear', 'Passing Year', { type: 'number', min: 1900, max: 9999, step: 1 })}
    </>}
    <div className="placement-full" role="status">{data.relatedErrors?.[`eligibility-${drive.id}`] ? 'Eligibility records are unavailable.' : selected ? <><strong>{label(selected.eligibilityStatus)}</strong><p>{selected.reason}</p></> : 'Eligibility has not been evaluated for this student.'}</div>
  </PlacementForm>
}

function PlacementAction({ dialog, data, scope, run, allowed, busy, onClose }) {
  const { operation, type, row } = dialog
  const [form, setForm] = useState({ status: '', reason: '', interviewResult: '', completedAt: placementLocalInput(new Date().toISOString()), selectionStatus: '', offerStatus: '' })
  const field = (name, title, props = {}) => <Field {...props} name={name} title={title} form={form} setForm={setForm} />
  const choice = (name, title, options) => <Choice name={name} title={title} options={options} form={form} setForm={setForm} required />
  const transitions = type === 'drive' ? driveTransitions[status(row.driveStatus)] || [] : type === 'application' ? applicationTransitions[status(row.applicationStatus)] || [] : ['CANCELLED', 'NO_SHOW']
  const submit = async () => {
    if (!allowed) throw new Error('You do not have permission to perform this action.')
    const query = { collegeId: scope.collegeId }
    let endpoint, body, method = 'PATCH'
    if (operation === 'delete') {
      endpoint = `placements/${type === 'company' ? 'companies' : 'drives'}/${row.id}`
      method = 'DELETE'
    } else if (operation === 'status') {
      if (!transitions.includes(form.status)) throw new Error('Select a valid next status.')
      if (form.status === 'WITHDRAWN' && !form.reason.trim()) throw new Error('Enter the withdrawal reason.')
      endpoint = `placements/${({ drive: 'drives', application: 'applications', interview: 'interviews' })[type]}/${row.id}/status`
      body = { status: form.status, reason: form.reason || null }
    } else if (operation === 'result') {
      if (!form.interviewResult) throw new Error('Select the interview result.')
      const completedAt = placementUtc(form.completedAt)
      if (!completedAt || new Date(completedAt) > new Date() || new Date(completedAt) < placementDate(row.scheduledAt)) throw new Error('Completion must be after the scheduled time and on or before now.')
      if (form.score && (!form.maxScore || Number(form.score) > Number(form.maxScore))) throw new Error('Score must be within the maximum score.')
      endpoint = `placements/interviews/${row.id}/result`
      body = { interviewResult: form.interviewResult, completedAt, score: numeric(form.score), maxScore: numeric(form.maxScore), feedback: form.feedback || null }
    } else if (operation === 'selection') {
      if (!form.selectionStatus) throw new Error('Select a decision.')
      await run(() => api.savePlacement('offer', { ...form, applicationId: row.id, expectedJoiningDate: placementUtc(form.expectedJoiningDate) }, false, scope, data), 'Selection decision recorded.')
      onClose(); return
    } else if (operation === 'offer') {
      if (!offerTransitions[row.offerStatus]?.includes(form.offerStatus)) throw new Error('Select a valid offer status.')
      endpoint = `placements/selections/${row.id}/offer`
      body = { offerStatus: form.offerStatus, expectedJoiningDate: placementUtc(form.expectedJoiningDate) }
      if (form.offerStatus === 'ISSUED') {
        body.offerLetterPath = form.offerLetterPath || null
        body.offerExpiresAt = placementUtc(form.offerExpiresAt)
      }
    } else if (operation === 'join') endpoint = `placements/selections/${row.id}/joined`
    else throw new Error('This operation is unavailable.')
    await run(() => api.call(endpoint, { method, body, query }), operation === 'delete' ? 'Record removed.' : 'Record updated.')
    onClose()
  }
  const title = ({ delete: 'Delete Record', status: 'Update Status', result: 'Record Interview Result', selection: 'Record Selection Decision', offer: 'Manage Offer', join: 'Record Joining' })[operation]
  return <PlacementForm title={title} busy={busy} onSubmit={submit} onClose={onClose} submitLabel={operation === 'delete' ? 'Delete' : operation === 'join' ? 'Confirm Joined' : 'Save'}>
    <p className="placement-full">{row.title || row.name || row.studentName || `Record ${row.id}`} {row.role && `· ${row.role}`}</p>
    {operation === 'delete' && <p className="placement-full">Delete this record?</p>}
    {operation === 'join' && <p className="placement-full">Confirm that this student has joined the company. The joining date is recorded by the server.</p>}
    {operation === 'status' && <>{choice('status', 'Next Status *', transitions)}{field('reason', 'Reason', { required: form.status === 'WITHDRAWN', maxLength: 1000 })}</>}
    {operation === 'result' && <>
      {choice('interviewResult', 'Interview Result *', ['PASSED', 'FAILED', 'ON_HOLD'])}{field('completedAt', 'Completed At *', { type: 'datetime-local', required: true })}
      {field('score', 'Score', { type: 'number', min: 0, step: '.01' })}{field('maxScore', 'Maximum Score', { type: 'number', min: '.01', step: '.01' })}
      <label className="placement-full">Feedback<textarea rows={3} maxLength={10000} value={form.feedback || ''} onChange={event => setForm(current => ({ ...current, feedback: event.target.value }))} /></label>
    </>}
    {operation === 'selection' && <>
      {choice('selectionStatus', 'Decision *', ['SELECTED', 'REJECTED', 'ON_HOLD'])}{field('role', 'Offered Job Title', { maxLength: 150 })}
      {field('offeredCtc', 'Offered Annual CTC (₹)', { type: 'number', min: 0, step: '.01' })}{field('location', 'Job Location', { maxLength: 250 })}
      {field('expectedJoiningDate', 'Expected Joining Date', { type: 'datetime-local' })}{field('remarks', 'Remarks', { maxLength: 2000 })}
    </>}
    {operation === 'offer' && <>
      {choice('offerStatus', 'Offer Status *', offerTransitions[row.offerStatus] || [])}
      {form.offerStatus === 'ISSUED' && <>{field('offerLetterPath', 'Offer Letter Document Path', { maxLength: 1000 })}{field('offerExpiresAt', 'Offer Expiry', { type: 'datetime-local' })}</>}
      {field('expectedJoiningDate', 'Expected Joining Date', { type: 'datetime-local' })}
    </>}
  </PlacementForm>
}
