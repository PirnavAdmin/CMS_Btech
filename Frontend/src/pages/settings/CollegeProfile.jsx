import { campusApi } from '../../api/apiEndpoints.js'
import ViewDialog from '../../components/ViewDialog.jsx'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Building2, Pencil } from 'lucide-react'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import AsyncState from '../../components/AsyncState.jsx'
import { useAcademic } from '../../context/AcademicContext.jsx'
import { useScreenAccess } from '../../auth/ScreenAccess.jsx'
import { getCollegeById, unwrapCollegeRecord, getCollegeLogoUrl } from '../../auth/collegeApi.js'
import './CollegeProfile.css'

export default function CollegeProfile({ EditForm }) {
  const context = useAcademic()
  const { access, canAction, loading: accessLoading } = useScreenAccess()
  const isSuperAdmin = access?.isSuperAdmin === true
  const assignedId = isSuperAdmin ? context.selectedCollegeId : String(access?.primaryCollegeId ?? access?.collegeId ?? '')
  const [state, setState] = useState({ loading: true, row: null, error: '' })
  const [attempt, setAttempt] = useState(0)
  const [editing, setEditing] = useState(false)
  useEffect(() => {
    let active = true
    setEditing(false)
    if (accessLoading || context.loading) return
    if (!assignedId) { setState({ loading: false, row: null, error: 'Your account has no assigned college. Contact the platform administrator.' }); return }
    setState({ loading: true, row: null, error: '' })
    getCollegeById(assignedId).then(response => {
      const row = unwrapCollegeRecord(response?.data ?? response)
      if (String(row?.id ?? row?.collegeId ?? row?.CollegeId ?? '') !== String(assignedId)) throw new Error('The returned college does not match your authorized college.')
      if (active) setState({ loading: false, row, error: '' })
    }).catch(error => { if (active) setState({ loading: false, row: null, error: error.message || 'Unable to load college profile.' }) })
    return () => { active = false }
  }, [assignedId, attempt, accessLoading, context.loading])
  const responseMatchesAssignment = String(state.row?.id ?? state.row?.collegeId ?? state.row?.CollegeId ?? '') === String(assignedId)
  const record = responseMatchesAssignment ? state.row || {} : {}
  const row = { ...(record.addressDetails || record.addressInfo || {}), ...(record.contactDetails || record.contactInfo || {}), ...(record.administration || record.principalDetails || {}), ...(record.accreditationDetails || {}), ...record }
  const value = (...keys) => keys.map(key => row[key]).find(item =>
    ['string', 'number', 'boolean'].includes(typeof item) && String(item).trim() !== '')
  const sections = [
    ['College Identity', [['College Name', value('collegeName','name')], ['College Code',value('collegeCode','code')], ['College Type',value('collegeType','type')], ['University / Affiliation',value('universityName','university','affiliation')], ['Established Year',value('establishedYear','establishmentYear')], ['Accreditation',value('accreditation','accreditationStatus')]]],
    ['Address', [['Address',value('addressLine1','address')],['Address Line 2',value('addressLine2')],['City',value('city')],['District',value('district')],['State',value('state')],['PIN Code',value('pincode','pinCode')]]],
    ['Contact & Administration', [['Official Email',value('email','collegeEmail')],['Contact Number',value('contactNumber','contact','phoneNumber')],['Website',value('website')],['Principal / Authorized Contact',value('principalName','principal')],['Principal Email',value('principalEmail')],['Principal Contact',value('principalContact')]]],
  ]
  const name = value('collegeName','name') || 'College Profile'
  const metadata = [value('collegeCode', 'code'), value('universityName', 'university', 'affiliation')].filter(Boolean)
  const rawStatus = String(value('status', 'isActive') ?? '').trim().toLowerCase()
  const status = ['true', '1', 'active'].includes(rawStatus) ? 'Active'
    : ['false', '0', 'inactive', 'disabled'].includes(rawStatus) ? 'Inactive' : 'Status unavailable'
  const logoUrl = getCollegeLogoUrl(assignedId, value('logoPath', 'logoUrl', 'logo'))
  return <DashboardLayout><main className="college-profile-workspace">
    <div className="college-profile-heading">
      <PageHeader title="College Profile" />
      <Link className="erp-btn erp-btn--secondary" to="/settings"><ArrowLeft size={15} aria-hidden="true" /> Global Settings</Link>
    </div>
    {state.loading || accessLoading || context.loading || (!state.error && !responseMatchesAssignment) ? <AsyncState status="loading" title="Loading college profile…" /> : state.error ? <AsyncState status="error" message={state.error} onRetry={() => setAttempt(current => current + 1)} /> : <>
      <section className="college-profile-identity" aria-label="College overview">
        <div className="college-profile-logo" aria-hidden="true">
          <Building2 size={25} />
          {logoUrl && <img key={logoUrl} src={logoUrl} alt="" onError={event => { event.currentTarget.hidden = true }} />}
        </div>
        <div className="college-profile-summary">
          <h2>{name}</h2>
          <div className="college-profile-meta">
            {metadata.length > 0 && <span>{metadata.join(' · ')}</span>}
            <span className="college-profile-status" data-active={status === 'Active'}>{status}</span>
          </div>
        </div>
        {EditForm && canAction('/college-institution-management', 'edit') &&
          <button type="button" className="erp-btn erp-btn--primary" onClick={() => setEditing(true)}>
            <Pencil size={15} aria-hidden="true" /> Edit Profile
          </button>}
      </section>
      <div className="college-profile-sections">
        {sections.map(([heading, fields]) => {
          const savedFields = fields.filter(([, data]) => data != null)
          return <section key={heading}>
            <h3>{heading}</h3>
            {savedFields.length ? <dl>
              {savedFields.map(([label, data]) => <div key={label}><dt>{label}</dt><dd>{String(data)}</dd></div>)}
            </dl> : <p className="college-profile-empty">No details saved.</p>}
          </section>
        })}
      </div>
    </>}
    {editing && EditForm && <EditForm key={assignedId} editId={assignedId} onDismiss={() => setEditing(false)} onSaved={async () => { setEditing(false); setAttempt(current => current + 1); await context.refreshHierarchy?.() }} />}
  </main></DashboardLayout>
}

const campusFields = [
  ['name', 'Campus Name', 150], ['code', 'Campus Code', 50],
  ['campusType', 'Campus Type', 50], ['address', 'Address', 255],
  ['city', 'City', 100], ['district', 'District', 100], ['state', 'State', 100],
  ['postalCode', 'Postal Code', 20], ['email', 'Email', 150, 'email'],
  ['phoneNumber', 'Phone Number', 20, 'tel'],
]

function AddCampusDialog({ collegeId, isSuperAdmin, onClose, onSaved }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(event) {
    event.preventDefault()
    if (busy) return
    const data = new FormData(event.currentTarget)
    const fields = Object.fromEntries(campusFields.map(([key]) => [key, String(data.get(key) || '').trim() || null]))
    if (!fields.name || !fields.code) {
      setError('Enter the campus name and code.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await campusApi.create({ ...fields, ...(isSuperAdmin ? { collegeId: Number(collegeId) } : {}), isMainCampus: data.has('isMainCampus') })
      onSaved()
    } catch (reason) {
      setError(reason.status === 403 ? 'Your account does not have permission to add a campus.' : reason.message)
    } finally {
      setBusy(false)
    }
  }
  return <ViewDialog title="Add Campus" onClose={onClose} showExport={false} busy={busy}
    footerActions={<><button type="button" className="erp-btn erp-btn--secondary" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" form="campus-create-form" className="erp-btn erp-btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Save Campus'}</button></>}>
    <form id="campus-create-form" className="college-campus-form" onSubmit={save}>
      {error && <p role="alert">{error}</p>}
      {campusFields.map(([key, label, maxLength, type = 'text']) => <label key={key}>
        {label}<input name={key} type={type} maxLength={maxLength} required={key === 'name' || key === 'code'} />
      </label>)}
      <label className="college-campus-main"><input name="isMainCampus" type="checkbox" /> Main campus</label>
    </form>
  </ViewDialog>
}

export function CampusManagement() {
  const context = useAcademic()
  const { access, canAction } = useScreenAccess()
  const isSuperAdmin = access?.isSuperAdmin === true
  const collegeId = String(isSuperAdmin ? context.selectedCollegeId || '' : access?.primaryCollegeId ?? access?.collegeId ?? '')
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [addingFor, setAddingFor] = useState('')
  const [result, setResult] = useState(null)
  const requestKey = [collegeId, isSuperAdmin, page, revision].join(':')
  const current = result?.key === requestKey ? result : null
  useEffect(() => {
    if (!collegeId || context.loading || context.error) return
    let active = true
    campusApi.list({ collegeId, isSuperAdmin, pageNumber: page }).then(data => {
      if (active) setResult({ key: requestKey, ...data })
    }).catch(reason => {
      if (!active) return
      const error = reason.status === 403 ? 'Your account does not have permission to view campuses.'
        : reason.status === 404 ? 'The campus directory could not be found for the assigned college (HTTP 404).'
        : reason.message
      setResult({ key: requestKey, error })
    })
    return () => { active = false }
  }, [collegeId, isSuperAdmin, page, requestKey, context.loading, context.error])
  const canAdd = Boolean(collegeId && !context.loading && !context.error && canAction('/college-institution-management', 'edit'))
  const columns = ['Campus Name', 'Code', 'Type', 'Location', 'Contact', 'Status']
  return <DashboardLayout><main className="college-profile-workspace">
    <div className="college-profile-heading">
      <PageHeader title="Campus Management" subtitle={context.selectedCollege?.name || context.selectedCollege?.collegeName} />
      <Link className="erp-btn erp-btn--secondary" to="/settings"><ArrowLeft size={15} aria-hidden="true" /> Global Settings</Link>
    </div>
    <section className="college-profile-campus-boundary" aria-labelledby="campus-directory">
      <div className="college-profile-heading">
        <h2 id="campus-directory">Campus Directory</h2>
        {canAdd && <button type="button" className="erp-btn erp-btn--primary" onClick={() => setAddingFor(collegeId)}>Add Campus</button>}
      </div>
      {context.loading ? <AsyncState status="loading" title="Loading college context…" />
        : context.error ? <AsyncState status="error" message={context.error} onRetry={context.refreshHierarchy} />
        : !collegeId ? <p>Select an authorized college to view campuses.</p>
        : current?.error ? <AsyncState status="error" message={current.error} onRetry={() => setRevision(value => value + 1)} />
        : <div className="table-scroll">
          <table aria-labelledby="campus-directory">
            <thead><tr>{columns.map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody>
              {!current?.items.length && <tr><td colSpan={columns.length}>{current ? 'No campuses found.' : 'Loading campuses…'}</td></tr>}
              {current?.items.map(row => <tr key={row.campusId ?? row.id ?? row.code}>
                <td>{row.name ?? row.campusName ?? '—'}{row.isMainCampus === true && <small> · Main campus</small>}</td>
                <td>{row.code ?? row.campusCode ?? '—'}</td>
                <td>{row.campusType || '—'}</td>
                <td>{[row.city, row.state].filter(Boolean).join(', ') || row.address || '—'}</td>
                <td>{row.email || row.phoneNumber || '—'}</td>
                <td>{row.isActive == null ? row.status ?? '—' : row.isActive ? 'Active' : 'Inactive'}</td>
              </tr>)}
            </tbody>
          </table>
        </div>}
      {(page > 1 || current?.hasNext) && <div className="college-campus-pagination">
        <button type="button" className="erp-btn erp-btn--secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page}</span>
        <button type="button" className="erp-btn erp-btn--secondary" disabled={!current?.hasNext} onClick={() => setPage(page + 1)}>Next</button>
      </div>}
    </section>
    {canAdd && addingFor === collegeId && <AddCampusDialog collegeId={collegeId} isSuperAdmin={isSuperAdmin}
      onClose={() => setAddingFor('')} onSaved={() => { setAddingFor(''); setPage(1); setRevision(value => value + 1) }} />}
  </main></DashboardLayout>
}
