import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FiAlertCircle, FiArrowLeft, FiArrowRight, FiBookOpen, FiCamera, FiCheck, FiCheckCircle,
  FiChevronRight, FiClock, FiEdit2, FiEye, FiFileText, FiFilter, FiGrid,
  FiHome, FiInbox, FiPhone, FiPlus, FiRefreshCw, FiSave, FiSearch, FiShield,
  FiTrash2, FiUploadCloud, FiUser, FiUsers, FiX,
} from 'react-icons/fi'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import './StudentAdmission.css'

const KEY = 'pirnav-student-admissions-v1'
const CLEAN_START_KEY = 'pirnav-student-admissions-mock-cleared-v1'
if (typeof window !== 'undefined' && !localStorage.getItem(CLEAN_START_KEY)) {
  localStorage.removeItem(KEY)
  localStorage.setItem(CLEAN_START_KEY, 'true')
}
const STEPS = ['Basic Information', 'Contact & Address', 'Parent / Guardian', 'Academic Information', 'Previous Education', 'Admission Details', 'Fees', 'Documents Upload', 'Review & Submit']
const STEP_ICONS = [FiUser, FiPhone, FiUsers, FiBookOpen, FiFileText, FiHome, FiInbox, FiUploadCloud, FiCheckCircle]
const STATUS = { DRAFT: 'Draft', SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review', VERIFIED: 'Verified', APPROVED: 'Approved', CORRECTION_REQUIRED: 'Correction Required', REJECTED: 'Rejected' }
const YEARS = ['2026-27', '2025-26']
const SEMESTERS = Array.from({ length: 8 }, (_, index) => `Semester ${index + 1}`)
const SECTIONS = ['A', 'B', 'C']
const ACADEMICS = {
  'B.Tech': {
    'Computer Science & Engineering': ['CSE', 'Artificial Intelligence & ML', 'Data Science'],
    'Electronics & Communication Engineering': ['ECE'],
    'Electrical & Electronics Engineering': ['EEE'],
    'Mechanical Engineering': ['Mechanical Engineering'],
    'Civil Engineering': ['Civil Engineering'],
  },
}
const FILTERS = [
  ['status', 'Admission Status'], ['academicYear', 'Academic Year'], ['course', 'Course'],
  ['department', 'Department'], ['branch', 'Branch'], ['semester', 'Semester'],
  ['admissionType', 'Admission Type'], ['quota', 'Quota'], ['feeStatus', 'Fee Status'],
]
const DETAIL_TABS = [
  ['overview', 'Overview', FiGrid], ['personal', 'Personal & Contact', FiUser],
  ['academic', 'Academic', FiBookOpen], ['education', 'Previous Education', FiFileText],
  ['services', 'Admission & Services', FiHome], ['fees', 'Fees', FiInbox], ['documents', 'Documents', FiFileText], ['activity', 'Activity', FiClock],
]
const DOCUMENTS = [['aadhaarCard','Aadhaar Card',true],['tenthMemo','10th / SSC Marks Memo',true],['qualifyingMemo','Intermediate / Diploma Marks Memo',true],['transferCertificate','Transfer Certificate',true],['casteCertificate','Caste Certificate',false],['incomeCertificate','Income Certificate',false]]
const blankAddress = () => ({ line1: '', line2: '', town: '', city: '', district: '', state: '', country: 'India', pincode: '' })
const empty = () => ({
  id: crypto.randomUUID(), status: 'DRAFT', createdAt: new Date().toISOString(), remarks: '',
  application: { number: `REG-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`, date: new Date().toISOString().slice(0, 10), registrationNumber: '', admissionNumber: '', admissionDate: '' },
  personal: { firstName: '', middleName: '', lastName: '', gender: '', dob: '', photo: '', bloodGroup: '', nationality: 'Indian', aadhaar: '' },
  contact: { mobile: '', alternateMobile: '', email: '', alternateEmail: '', sameAddress: true, permanentAddress: blankAddress(), currentAddress: blankAddress() },
  parents: { father: { name: '', mobile: '', email: '', occupation: '', qualification: '', income: '' }, mother: { name: '', mobile: '' }, guardian: { name: '', relationship: '', relationshipOther: '', mobile: '' }, primaryContact: 'Father', emergencyMobile: '' },
  academic: { academicYear: '', admissionType: '', course: '', department: '', branch: '', semester: '', section: '', regulation: 'R26', quota: '', quotaOther: '', entryType: 'Regular' },
  previousEducation: { tenth: { board: '', institution: '', rollNumber: '', passingYear: '', score: '' }, intermediate: { qualification: 'Intermediate / 12th', board: '', institution: '', passingYear: '', stream: '', score: '' } },
  admission: { college: 'Pirnav Engineering College', batch: '2026-30', scholarship: 'No', scholarshipType: '', hostel: 'No', hostelPreference: '', transport: 'No', transportRoute: '' },
  fees: { tuitionFee: '', admissionFee: '', scholarshipAmount: '', hostelFee: '', transportFee: '', totalFee: '', paymentStatus: 'Pending' },
  documents: Object.fromEntries(DOCUMENTS.map(([key]) => [key, null])),
  activity: [{ label: 'Application created', date: new Date().toISOString() }],
})

<<<<<<< HEAD
const merge = row => {
  const base = empty()
  return {
    ...base, ...row,
    application: { ...base.application, ...row.application, registrationNumber: row.application?.number || row.application?.registrationNumber || '' }, personal: { ...base.personal, ...row.personal },
    contact: { ...base.contact, ...row.contact, permanentAddress: { ...base.contact.permanentAddress, ...row.contact?.permanentAddress }, currentAddress: { ...base.contact.currentAddress, ...row.contact?.currentAddress } },
    parents: { ...base.parents, ...row.parents, father: { ...base.parents.father, ...row.parents?.father }, mother: { ...base.parents.mother, ...row.parents?.mother }, guardian: { ...base.parents.guardian, ...row.parents?.guardian } },
    academic: { ...base.academic, ...row.academic },
    previousEducation: { ...base.previousEducation, ...row.previousEducation, tenth: { ...base.previousEducation.tenth, ...row.previousEducation?.tenth }, intermediate: { ...base.previousEducation.intermediate, ...row.previousEducation?.intermediate } },
    admission: { ...base.admission, ...row.admission, scholarship: row.admission?.scholarship === true ? 'Yes' : row.admission?.scholarship || 'No', hostel: row.admission?.hostel === true ? 'Yes' : row.admission?.hostel || 'No', transport: row.admission?.transport === true ? 'Yes' : row.admission?.transport || 'No' },
    fees: { ...base.fees, ...row.fees }, documents: { ...base.documents, ...row.documents }, activity: Array.isArray(row.activity) ? row.activity : base.activity,
  }
}
const load = () => { try { return (JSON.parse(localStorage.getItem(KEY)) || []).map(merge) } catch { return [] } }
const save = row => { const next = { ...row, updatedAt: new Date().toISOString() }; localStorage.setItem(KEY, JSON.stringify([next, ...load().filter(item => item.id !== next.id)])); window.dispatchEvent(new Event('student-admissions-updated')); return next }
const get = id => load().find(item => String(item.id) === String(id))
const read = (object, path) => path.split('.').reduce((value, key) => value?.[key], object)
const setPath = (object, path, value) => { const clone = structuredClone(object); const keys = path.split('.'); let cursor = clone; keys.slice(0, -1).forEach(key => { cursor = cursor[key] }); cursor[keys.at(-1)] = value; return clone }
const text = value => String(value ?? '').trim()
const studentName = student => [student.personal.firstName, student.personal.middleName, student.personal.lastName].filter(Boolean).join(' ') || 'Unnamed student'
const display = value => text(value) || '—'
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0))
const dateTime = value => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const quota = student => student.academic.quota === 'Other' ? student.academic.quotaOther : student.academic.quota
=======
function List(){
  const nav=useNavigate()
  const [rows,setRows]=useState(load)
  const [query,setQuery]=useState('')
  const [filtersOpen,setFiltersOpen]=useState(false)
  const [status,setStatus]=useState('')
  const [academicYear,setAcademicYear]=useState('')
  const [course,setCourse]=useState('')
  const [preset,setPreset]=useState('') // '' | 'pending' | 'approved' | 'rejected' — driven by the stat cards

  const matchesStatus=x=>{
    if(preset==='pending')return['SUBMITTED','UNDER_REVIEW'].includes(x.status)
    if(preset==='approved')return['APPROVED','ADMITTED'].includes(x.status)
    if(preset==='rejected')return x.status==='REJECTED'
    return !status||x.status===status
  }

  const shown=useMemo(()=>rows.filter(x=>
    (!query||[name(x),x.application.number,x.application.admissionNumber,x.contact.mobile,x.contact.email].join(' ').toLowerCase().includes(query.toLowerCase()))
    &&matchesStatus(x)
    &&(!academicYear||x.academic.academicYear===academicYear)
    &&(!course||x.academic.course===course)
  ),[rows,query,status,preset,academicYear,course])

  const stats=[
    ['Total Applications',rows.length,''],
    ['Pending Verification',rows.filter(x=>['SUBMITTED','UNDER_REVIEW'].includes(x.status)).length,'pending'],
    ['Approved Admissions',rows.filter(x=>['APPROVED','ADMITTED'].includes(x.status)).length,'approved'],
    ['Rejected Applications',rows.filter(x=>x.status==='REJECTED').length,'rejected'],
  ]

  const togglePreset=key=>{setStatus('');setPreset(current=>current===key?'':key)}
  const changeStatus=value=>{setPreset('');setStatus(value)}
  const activeFilterCount=[preset||status,academicYear,course].filter(Boolean).length
  const clearFilters=()=>{setStatus('');setPreset('');setAcademicYear('');setCourse('')}

  return <>
    <header className="sa-page-header"><div><span>Student Management</span><h1>Student Admissions</h1><p>Manage applications, verification and student admissions</p></div><Button primary onClick={()=>nav('/student-management/admissions/new')}><FiPlus/> New Admission</Button></header>

    <section className="sa-stats">
      {stats.map(([label,value,key])=>
        <article
          key={label}
          className={key&&preset===key?'sa-stat-active':''}
          onClick={key?()=>togglePreset(key):undefined}
          role={key?'button':undefined}
          tabIndex={key?0:undefined}
          aria-pressed={key?preset===key:undefined}
          onKeyDown={key?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();togglePreset(key)}}:undefined}
        ><span>{label}</span><strong>{value}</strong></article>
      )}
    </section>

    <section className="sa-directory">
      <header><div><h2>Admission Directory</h2><span>{shown.length} records</span></div><Button onClick={()=>setRows(load())}><FiRefreshCw/> Refresh</Button></header>

      <div className="sa-toolbar">
<label className="sa-search"><FiSearch/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, application, admission, mobile or email..." autoComplete="off"/></label>        <Button onClick={()=>setFiltersOpen(!filtersOpen)}><FiFilter/> Filters{activeFilterCount>0?` (${activeFilterCount})`:''}</Button>
        {(activeFilterCount>0||query)&&<Button onClick={()=>{clearFilters();setQuery('')}}><FiX/> Clear</Button>}
      </div>

      {filtersOpen&&<div className="sa-filter-grid">
        <label><span>Admission Status</span><select value={status} onChange={e=>changeStatus(e.target.value)}><option value="">All</option>{Object.entries(STATUS).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
        <label><span>Academic Year</span><select value={academicYear} onChange={e=>setAcademicYear(e.target.value)}><option value="">All</option>{YEARS.map(year=><option key={year}>{year}</option>)}</select></label>
        <label><span>Course</span><select value={course} onChange={e=>setCourse(e.target.value)}><option value="">All</option>{Object.keys(ACADEMICS).map(courseName=><option key={courseName}>{courseName}</option>)}</select></label>
      </div>}

      <div className="sa-table-wrap"><table><thead><tr><th>Application No.</th><th>Admission No.</th><th>Student</th><th>Course / Branch</th><th>Semester</th><th>Academic Year</th><th>Status</th><th>Actions</th></tr></thead><tbody>{shown.map(x=><tr key={x.id}><td><strong>{x.application.number}</strong></td><td>{x.application.admissionNumber||'Not assigned'}</td><td><strong>{name(x)}</strong><small>{x.contact.email||x.contact.mobile||'Contact pending'}</small></td><td><strong>{x.academic.course||'Not selected'}</strong><small>{x.academic.branch||'Branch pending'}</small></td><td>{x.academic.semester||'—'}</td><td>{x.academic.academicYear||'—'}</td><td><Badge value={x.status}/></td><td><div className="sa-icon-actions"><button title="View" onClick={()=>nav(`/student-management/admissions/${x.id}`)}><FiEye/></button><button title="Edit" onClick={()=>nav(`/student-management/admissions/${x.id}/edit`)}><FiEdit2/></button>{['VERIFIED','UNDER_REVIEW'].includes(x.status)&&<button title="Approval" onClick={()=>nav(`/student-management/admissions/${x.id}/approval`)}><FiShield/></button>}</div></td></tr>)}</tbody></table></div>

      {!shown.length&&<div className="sa-empty"><FiFileText/><h3>{rows.length?'No admissions match your search.':'No student admissions found.'}</h3><p>Create a new admission to get started.</p></div>}
    </section>
  </>
}
>>>>>>> 0bae379117723c992ac0e5b12eca131a36347dd0

const validAadhaar = value => {
  const digits = text(value).replace(/\D/g, '')
  if (!/^\d{12}$/.test(digits) || /^(\d)\1{11}$/.test(digits)) return false
  const d = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]]
  const p = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]]
  return [...digits].reverse().reduce((checksum, digit, index) => d[checksum][p[index % 8][Number(digit)]], 0) === 0
}
const validDob = value => {
  if (!text(value)) return true
  const dob = new Date(`${value}T00:00:00`)
  if (Number.isNaN(dob.getTime())) return false
  return dob < new Date()
}
const REQUIRED = ['personal.firstName','personal.lastName','personal.gender','personal.dob','personal.aadhaar','contact.mobile','contact.email','contact.currentAddress.line1','contact.currentAddress.town','contact.currentAddress.city','contact.currentAddress.district','contact.currentAddress.state','contact.currentAddress.pincode','parents.father.name','parents.father.mobile','parents.emergencyMobile','academic.academicYear','academic.admissionType','academic.course','academic.department','academic.branch','academic.semester','academic.quota','previousEducation.tenth.board','previousEducation.tenth.institution','previousEducation.tenth.passingYear','previousEducation.tenth.score','previousEducation.intermediate.board','previousEducation.intermediate.institution','previousEducation.intermediate.passingYear','previousEducation.intermediate.stream','previousEducation.intermediate.score']
const requiredPaths = new Set(REQUIRED)
const validate = data => {
  const errors = {}
  REQUIRED.forEach(path => { if (!text(read(data, path))) errors[path] = 'This field is required.' })
  if (data.personal.dob && !validDob(data.personal.dob)) errors['personal.dob'] = 'Date of birth must be in the past.'
  if (data.academic.quota === 'Other' && !text(data.academic.quotaOther)) errors['academic.quotaOther'] = 'Enter the quota name.'
  if (data.parents.guardian.relationship === 'Other' && !text(data.parents.guardian.relationshipOther)) errors['parents.guardian.relationshipOther'] = 'Enter the relationship.'
  DOCUMENTS.forEach(([key,,required]) => { if ((required || data.admission.scholarship === 'Yes') && !data.documents?.[key]) errors[`documents.${key}`] = 'Upload this required document.' })
  if (!data.contact.sameAddress) ['line1','town','city','district','state','pincode'].forEach(key => { if (!text(data.contact.permanentAddress[key])) errors[`contact.permanentAddress.${key}`] = 'This field is required.' })
  if (data.personal.aadhaar && !validAadhaar(data.personal.aadhaar)) errors['personal.aadhaar'] = 'Enter a valid Aadhaar number with a correct checksum.'
  ;['contact.mobile','contact.alternateMobile','parents.father.mobile','parents.mother.mobile','parents.guardian.mobile','parents.emergencyMobile'].forEach(path => { if (read(data, path) && !/^[6-9]\d{9}$/.test(read(data, path))) errors[path] = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.' })
  if (data.contact.email && !/^\S+@\S+\.\S+$/.test(data.contact.email)) errors['contact.email'] = 'Enter a valid email address.'
  if (data.contact.alternateEmail && !/^\S+@\S+\.\S+$/.test(data.contact.alternateEmail)) errors['contact.alternateEmail'] = 'Enter a valid email address.'
  if (data.parents.father.email && !/^\S+@\S+\.\S+$/.test(data.parents.father.email)) errors['parents.father.email'] = 'Enter a valid email address.'
  ;['permanentAddress','currentAddress'].forEach(section => { if (section === 'permanentAddress' && data.contact.sameAddress) return; const item = data.contact[section]; if (item.pincode && !/^\d{6}$/.test(item.pincode)) errors[`contact.${section}.pincode`] = 'Enter a valid 6-digit PIN code.'; if (item.line1 && item.line1.length < 5) errors[`contact.${section}.line1`] = 'Enter a complete address.' })
  return errors
}

function Badge({ value }) { return <span className={`sa-badge status-${String(value).toLowerCase()}`}><i />{STATUS[value] || value}</span> }
function Button({ primary = false, danger = false, children, ...props }) { return <button className={danger ? 'sa-danger' : primary ? 'sa-primary' : 'sa-secondary'} {...props}>{children}</button> }
function Toast({ message, tone = 'success', onClose }) { if (!message) return null; return <div className={`sa-toast tone-${tone}`} role="status"><FiCheckCircle /><span>{message}</span><button onClick={onClose} aria-label="Dismiss notification"><FiX /></button></div> }
function ConfirmDialog({ title, children, confirmLabel, tone = 'primary', onCancel, onConfirm }) { return <div className="sa-overlay" onMouseDown={event => event.target === event.currentTarget && onCancel()}><section className="sa-dialog" role="dialog" aria-modal="true" aria-labelledby="sa-confirm-title"><button className="sa-dialog-close" onClick={onCancel} aria-label="Close"><FiX /></button><div className={`sa-dialog-icon tone-${tone}`}><FiShield /></div><h2 id="sa-confirm-title">{title}</h2><div className="sa-dialog-copy">{children}</div><footer><Button onClick={onCancel}>Cancel</Button><Button primary={tone !== 'danger'} danger={tone === 'danger'} onClick={onConfirm}>{confirmLabel}</Button></footer></section></div> }
function Section({ title, icon: Icon = FiFileText, hint, children, className = '' }) { return <section className={`sa-form-section ${className}`}><header><span><Icon /></span><div><h2>{title}</h2>{hint && <p>{hint}</p>}</div></header><div className="sa-form-grid">{children}</div></section> }

function Field({ data, path, label, update, options, type = 'text', readOnly = false, error, placeholder, disabled = false, required = requiredPaths.has(path) }) {
  const value = read(data, path) ?? ''
  const numeric = /mobile|pincode|aadhaar/.test(path)
  const maxLength = path.endsWith('aadhaar') ? 12 : path.includes('pincode') ? 6 : path.includes('mobile') ? 10 : undefined
  const id = `sa-${path.replaceAll('.', '-')}`
  const change = event => update(path, numeric ? event.target.value.replace(/\D/g, '') : event.target.value)
  return <label className={`sa-field ${error ? 'invalid' : ''}`} htmlFor={id}><span>{label}{required && <b> *</b>}</span>{options ? <select id={id} value={value} disabled={disabled || readOnly} onChange={change} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}><option value="">{placeholder || 'Select'}</option>{options.map(option => <option key={option}>{option}</option>)}</select> : <input id={id} type={type} value={value} readOnly={readOnly} disabled={disabled} inputMode={numeric ? 'numeric' : undefined} maxLength={maxLength} placeholder={placeholder} onChange={change} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />}{error && <small id={`${id}-error`} role="alert">{error}</small>}</label>
}
function AddressFields({ data, prefix, update, errors }) { return [['line1','Address Line 1'],['line2','Address Line 2'],['town','Village / Town'],['city','City'],['district','District'],['state','State'],['country','Country'],['pincode','PIN Code']].map(([key,label]) => <Field key={key} data={data} path={`${prefix}.${key}`} label={label} update={update} error={errors[`${prefix}.${key}`]} />) }
function Breadcrumb({ tail }) { return <div className="sa-breadcrumb"><span>Student Management</span><FiChevronRight /><span>Admissions</span>{tail && <><FiChevronRight /><strong>{tail}</strong></>}</div> }

function AdmissionFilters({ rows, query, setQuery, filters, setFilters, open, setOpen }) {
  const options = key => [...new Set(rows.map(item => key === 'status' ? item.status : key === 'feeStatus' ? item.fees.paymentStatus : key === 'quota' ? quota(item) : item.academic[key]).filter(Boolean))].sort()
  const active = Object.entries(filters).filter(([,value]) => value)
  const clear = () => setFilters(Object.fromEntries(FILTERS.map(([key]) => [key, ''])))
  return <><div className="sa-toolbar"><label className="sa-search"><FiSearch /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, application, admission, registration, mobile or email" /></label><div className="sa-filter-actions"><Button onClick={() => setOpen(!open)}><FiFilter /> Filters {active.length > 0 && <b>{active.length}</b>}</Button>{active.length > 0 && <button className="sa-clear" onClick={clear}>Clear filters</button>}</div></div>{open && <div className="sa-filter-grid">{FILTERS.map(([key,label]) => <label key={key}><span>{label}</span><select value={filters[key]} onChange={event => setFilters(current => ({ ...current, [key]: event.target.value }))}><option value="">All {label}</option>{options(key).map(value => <option value={value} key={value}>{key === 'status' ? STATUS[value] : value}</option>)}</select></label>)}</div>}{active.length > 0 && <div className="sa-filter-chips">{active.map(([key,value]) => <button key={key} onClick={() => setFilters(current => ({ ...current, [key]: '' }))}>{FILTERS.find(item => item[0] === key)?.[1]}: {key === 'status' ? STATUS[value] : value} <FiX /></button>)}</div>}</>
}
function EmptyState({ hasRows, filtered, onCreate, onClear }) {
  return <div className="sa-empty"><span><FiInbox /></span><h3>{hasRows && filtered ? 'No applications match the selected filters.' : 'No admission applications found'}</h3><p>{hasRows && filtered ? 'Adjust or clear the active filters to view applications.' : 'Create a new admission application to begin student enrollment.'}</p>{hasRows && filtered ? <Button onClick={onClear}>Clear Filters</Button> : <Button primary onClick={onCreate}><FiPlus /> New Admission</Button>}</div>
}

function AdmissionList() {
  const navigate = useNavigate()
  const [rows, setRows] = useState(load)
  const [query, setQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const initialFilters = Object.fromEntries(FILTERS.map(([key]) => [key, '']))
  const [filters, setFilters] = useState(initialFilters)
  const shown = useMemo(() => rows.filter(item => {
    const needle = [studentName(item),item.application.number,item.application.admissionNumber,item.application.registrationNumber,item.contact.mobile,item.contact.email].join(' ').toLowerCase()
    const values = { status: item.status, academicYear: item.academic.academicYear, course: item.academic.course, department: item.academic.department, branch: item.academic.branch, semester: item.academic.semester, admissionType: item.academic.admissionType, quota: quota(item), feeStatus: item.fees.paymentStatus }
    return needle.includes(query.trim().toLowerCase()) && Object.entries(filters).every(([key,value]) => !value || values[key] === value)
  }), [rows, query, filters])
  const clear = () => { setQuery(''); setFilters(initialFilters) }
  return <><Breadcrumb /><header className="sa-page-header"><div><h1>Student Admissions</h1><p>Manage student applications, verification, approval and enrollment</p></div><div><Button onClick={() => setRows(load())}><FiRefreshCw /> Refresh</Button><Button primary onClick={() => navigate('/student-management/admissions/new')}><FiPlus /> New Admission</Button></div></header><section className="sa-directory"><header><div><h2>Admission Directory</h2><span>{shown.length} of {rows.length} applications</span></div></header><AdmissionFilters {...{ rows, query, setQuery, filters, setFilters }} open={filtersOpen} setOpen={setFiltersOpen} /><div className="sa-table-wrap"><table><thead><tr><th>Application</th><th>Student</th><th>Academic Placement</th><th>Admission Type</th><th>Academic Year</th><th>Fee Status</th><th>Application Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{shown.map(item => <tr key={item.id}><td><strong>{item.application.number}</strong><small>{item.application.admissionNumber || 'Admission pending'}</small></td><td><div className="sa-student"><i>{studentName(item).split(' ').map(part => part[0]).slice(0,2).join('')}</i><span><strong>{studentName(item)}</strong><small>{item.contact.email || item.contact.mobile || 'Contact pending'}</small></span></div></td><td><strong>{display(item.academic.course)}</strong><small>{display(item.academic.branch)} · {display(item.academic.semester)}</small></td><td>{display(item.academic.admissionType)}</td><td>{display(item.academic.academicYear)}</td><td><span className={`sa-fee-status fee-${item.fees.paymentStatus.toLowerCase().replaceAll(' ','-')}`}>{item.fees.paymentStatus}</span></td><td><Badge value={item.status} /></td><td><span className="sa-updated">{dateTime(item.updatedAt || item.createdAt)}</span></td><td><div className="sa-icon-actions"><button title={item.status === 'APPROVED' ? 'View Student Record' : 'View Application'} aria-label="View application" onClick={() => navigate(`/student-management/admissions/${item.id}`)}><FiEye /></button>{['DRAFT','CORRECTION_REQUIRED'].includes(item.status) && <button title="Edit Application" aria-label="Edit application" onClick={() => navigate(`/student-management/admissions/${item.id}/edit`)}><FiEdit2 /></button>}{['SUBMITTED','UNDER_REVIEW','VERIFIED'].includes(item.status) && <button title={item.status === 'SUBMITTED' ? 'Start Review' : item.status === 'VERIFIED' ? 'Approve or Reject' : 'Continue Review'} aria-label="Review application" onClick={() => navigate(`/student-management/admissions/${item.id}/approval`)}><FiShield /></button>}</div></td></tr>)}</tbody></table></div>{shown.length === 0 && <EmptyState hasRows={rows.length > 0} filtered={Boolean(query || Object.values(filters).some(Boolean))} onCreate={() => navigate('/student-management/admissions/new')} onClear={clear} />}</section></>
}

function PhotoUpload({ data, update, notify }) {
  const upload = event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return notify('Upload a JPG, PNG or WebP student photo.', 'error'); if (file.size > 1024 * 1024) return notify('Student photo must be 1 MB or smaller.', 'error'); const reader = new FileReader(); reader.onload = () => update('personal.photo', reader.result); reader.onerror = () => notify('Unable to read the selected photo.', 'error'); reader.readAsDataURL(file) }
  const initials = [data.personal.firstName?.[0],data.personal.lastName?.[0]].filter(Boolean).join('').toUpperCase()
  return <div className="sa-photo-upload"><div className="sa-photo-preview">{data.personal.photo ? <img src={data.personal.photo} alt="Student live preview" /> : initials || <FiUser />}</div><div><strong>Student Photo</strong><span>JPG, PNG or WebP · Maximum 1 MB</span><label className="sa-photo-button"><FiCamera />{data.personal.photo ? 'Change Photo' : 'Upload Photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} /></label>{data.personal.photo && <button type="button" className="sa-photo-remove" onClick={() => update('personal.photo', '')}><FiTrash2 /> Remove</button>}</div></div>
}
function DocumentsUpload({ data, update, errors, notify }) {
  const upload = (key, event) => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (!['application/pdf','image/jpeg','image/png'].includes(file.type)) return notify('Only PDF, JPG and PNG documents are allowed.', 'error'); if (file.size > 500 * 1024) return notify('Each document must be 500 KB or smaller.', 'error'); const reader = new FileReader(); reader.onload = () => update(`documents.${key}`, { name: file.name, type: file.type, size: file.size, data: reader.result, uploadedAt: new Date().toISOString() }); reader.onerror = () => notify('Unable to read the selected document.', 'error'); reader.readAsDataURL(file) }
  return <section className="sa-documents"><header><div><h2>Supporting Documents</h2><p>Upload clear, readable documents. PDF, JPG or PNG · Maximum 500 KB each.</p></div><span>{Object.values(data.documents || {}).filter(Boolean).length}/{DOCUMENTS.length} uploaded</span></header><div className="sa-document-grid">{DOCUMENTS.map(([key,label,required]) => { const document = data.documents?.[key], mandatory = required || data.admission.scholarship === 'Yes'; return <article className={`${document ? 'uploaded' : ''} ${errors[`documents.${key}`] ? 'invalid' : ''}`} key={key}><div className="sa-document-icon">{document ? <FiCheckCircle /> : <FiFileText />}</div><div className="sa-document-copy"><strong>{label}{mandatory && <b> *</b>}</strong>{document ? <><span title={document.name}>{document.name}</span><small>{Math.ceil(document.size / 1024)} KB · Uploaded</small></> : <span>{mandatory ? 'Required document' : 'Optional document'}</span>}{errors[`documents.${key}`] && <small className="error">{errors[`documents.${key}`]}</small>}</div><div className="sa-document-actions">{document?.data && <a href={document.data} target="_blank" rel="noreferrer">Preview</a>}<label><FiUploadCloud /> {document ? 'Replace' : 'Upload'}<input type="file" accept="application/pdf,image/jpeg,image/png" onChange={event => upload(key,event)} /></label>{document && <button type="button" onClick={() => update(`documents.${key}`, null)} aria-label={`Remove ${label}`}><FiTrash2 /></button>}</div></article>})}</div></section>
}
function WizardStepper({ step, setStep }) { const navRef = useRef(null), activeRef = useRef(null); useEffect(() => { const nav = navRef.current, active = activeRef.current; if (nav && active && typeof nav.scrollTo === 'function') nav.scrollTo({ left: Math.max(0, active.offsetLeft - 8), behavior: 'smooth' }) }, [step]); return <nav ref={navRef} className="sa-stepper" aria-label="Admission form steps">{STEPS.map((label,index) => { const Icon = STEP_ICONS[index]; return <button ref={index === step ? activeRef : null} key={label} type="button" className={index === step ? 'active' : index < step ? 'complete' : ''} onClick={() => index <= step && setStep(index)} aria-disabled={index > step} aria-current={index === step ? 'step' : undefined}><i>{index < step ? <FiCheck /> : <Icon />}</i><span><small>Step {index + 1}</small>{label}</span></button> })}</nav> }
function FeeSummary({ data }) { const rows = [['Tuition Fee',data.fees.tuitionFee],['Admission Fee',data.fees.admissionFee],['Hostel Fee',data.fees.hostelFee],['Transport Fee',data.fees.transportFee],['Scholarship',data.fees.scholarshipAmount,true]]; return <aside className="sa-fee-summary"><header><FiInbox /><div><h3>Fee Summary</h3><p>Calculated automatically</p></div></header><dl>{rows.map(([label,value,deduction]) => <div key={label} className={deduction ? 'deduction' : ''}><dt>{label}</dt><dd>{deduction ? '−' : ''}{money(value)}</dd></div>)}</dl><footer><span>Net Payable</span><strong>{money(data.fees.totalFee)}</strong></footer></aside> }
function ReviewSection({ title, step, edit, items }) { const visible = items.filter(([,value,optional]) => !optional || text(value)); return <section className="sa-review-section"><header><h2>{title}</h2>{edit && <button type="button" onClick={() => edit(step)}><FiEdit2 /> Edit</button>}</header><dl>{visible.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{display(value)}</dd></div>)}</dl></section> }
function CoreReview({ data, edit }) {
  const address = value => [value.line1,value.line2,value.town,value.city,value.district,value.state,value.country,value.pincode].filter(Boolean).join(', ')
  return <div className="sa-full-review"><ReviewSection title="Student Information" step={0} edit={edit} items={[['Student',studentName(data)],['Gender',data.personal.gender],['Date of Birth',data.personal.dob],['Blood Group',data.personal.bloodGroup,true],['Nationality',data.personal.nationality],['Aadhaar Number',data.personal.aadhaar]]} /><ReviewSection title="Contact Information" step={1} edit={edit} items={[['Student Mobile',data.contact.mobile],['Alternate Mobile',data.contact.alternateMobile,true],['Student Email',data.contact.email],['Alternate Email',data.contact.alternateEmail,true],['Current Address',address(data.contact.currentAddress)],['Permanent Address',data.contact.sameAddress ? 'Same as current address' : address(data.contact.permanentAddress)]]} /><ReviewSection title="Parent / Guardian" step={2} edit={edit} items={[['Father Name',data.parents.father.name],['Father Mobile',data.parents.father.mobile],['Father Email',data.parents.father.email,true],['Father Occupation',data.parents.father.occupation,true],['Father Qualification',data.parents.father.qualification,true],['Annual Income',data.parents.father.income,true],['Mother Name',data.parents.mother.name,true],['Mother Mobile',data.parents.mother.mobile,true],['Guardian Name',data.parents.guardian.name,true],['Guardian Relationship',data.parents.guardian.relationship === 'Other' ? data.parents.guardian.relationshipOther : data.parents.guardian.relationship,true],['Guardian Mobile',data.parents.guardian.mobile,true],['Primary Contact',data.parents.primaryContact],['Emergency Contact',data.parents.emergencyMobile]]} /><ReviewSection title="Academic Placement" step={3} edit={edit} items={[['Academic Year',data.academic.academicYear],['Admission Type',data.academic.admissionType],['Course',data.academic.course],['Department',data.academic.department],['Branch',data.academic.branch],['Semester',data.academic.semester],['Section',data.academic.section,true],['Regulation',data.academic.regulation],['Quota',quota(data)],['Entry Type',data.academic.entryType]]} /><ReviewSection title="Previous Education" step={4} edit={edit} items={[['10th Board',data.previousEducation.tenth.board],['School Name',data.previousEducation.tenth.institution],['10th Roll Number',data.previousEducation.tenth.rollNumber,true],['10th Passing Year',data.previousEducation.tenth.passingYear],['10th Score',data.previousEducation.tenth.score],['Qualification',data.previousEducation.intermediate.qualification],['Board / University',data.previousEducation.intermediate.board],['College Name',data.previousEducation.intermediate.institution],['Passing Year',data.previousEducation.intermediate.passingYear],['Stream',data.previousEducation.intermediate.stream],['Score',data.previousEducation.intermediate.score]]} /><ReviewSection title="Admission & Services" step={5} edit={edit} items={[['Application Number',data.application.number],['Application Date',data.application.date],['Registration Number',data.application.registrationNumber,true],['Admission Number',data.application.admissionNumber,true],['Admission Date',data.application.admissionDate,true],['College',data.admission.college],['Batch',data.admission.batch],['Scholarship',data.admission.scholarship],['Scholarship Type',data.admission.scholarshipType,true],['Hostel',data.admission.hostel],['Hostel Preference',data.admission.hostelPreference,true],['Transportation',data.admission.transport],['Transport Route',data.admission.transportRoute,true]]} /><ReviewSection title="Fee Summary" step={6} edit={edit} items={[['Tuition Fee',money(data.fees.tuitionFee)],['Admission Fee',money(data.fees.admissionFee)],['Scholarship Amount',money(data.fees.scholarshipAmount)],['Hostel Fee',money(data.fees.hostelFee)],['Transportation Fee',money(data.fees.transportFee)],['Net Total Fee',money(data.fees.totalFee)],['Payment Status',data.fees.paymentStatus]]} /></div>
}
function DocumentReview({ data, edit }) { return <div className="sa-full-review sa-document-review"><ReviewSection title="Uploaded Documents" step={7} edit={edit} items={DOCUMENTS.map(([key,label,required]) => [label,data.documents?.[key]?.name,!required && data.admission.scholarship !== 'Yes'])} /></div> }
function FullReview({ data, edit }) { return <><CoreReview data={data} edit={edit} /><DocumentReview data={data} edit={edit} /></> }

function AdmissionForm() {
  const { id } = useParams(); const navigate = useNavigate(); const [data, setData] = useState(() => id ? get(id) || empty() : empty())
  const [step, setStep] = useState(0); const [errors, setErrors] = useState({}); const [declared, setDeclared] = useState(false); const [toast, setToast] = useState(null); const [pinStatus, setPinStatus] = useState({}); const [confirmSubmit, setConfirmSubmit] = useState(false); const [submitting, setSubmitting] = useState(false)
  const toastTimer = useRef(null)
  const notify = (message, tone = 'success') => { window.clearTimeout(toastTimer.current); setToast({ message, tone }); toastTimer.current = window.setTimeout(() => setToast(null), 2600) }
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])
  const update = (path, value) => { setData(current => { let next = setPath(current, path, value); if (path === 'contact.sameAddress' && value) next.contact.permanentAddress = { ...next.contact.currentAddress }; if (path.startsWith('contact.currentAddress.') && next.contact.sameAddress) next.contact.permanentAddress = { ...next.contact.currentAddress }; if (path === 'academic.course') Object.assign(next.academic, { department: '', branch: '' }); if (path === 'academic.department') next.academic.branch = ''; if (path === 'academic.quota' && value !== 'Other') next.academic.quotaOther = ''; if (path === 'parents.guardian.relationship' && value !== 'Other') next.parents.guardian.relationshipOther = ''; if (path === 'admission.scholarship' && value === 'No') { next.admission.scholarshipType = ''; next.fees.scholarshipAmount = '' } if (path === 'admission.hostel' && value === 'No') { next.admission.hostelPreference = ''; next.fees.hostelFee = '' } if (path === 'admission.transport' && value === 'No') { next.admission.transportRoute = ''; next.fees.transportFee = '' } const total = ['tuitionFee','admissionFee','hostelFee','transportFee'].reduce((sum,key) => sum + Number(next.fees[key] || 0), 0) - Number(next.fees.scholarshipAmount || 0); next.fees.totalFee = String(Math.max(0,total)); return next }); setErrors(current => ({ ...current, [path]: '' })) }
  const currentPincode = data.contact.currentAddress.pincode, permanentPincode = data.contact.permanentAddress.pincode, sameAddress = data.contact.sameAddress
  useEffect(() => {
    const targets = [['contact.currentAddress','current',currentPincode], ...(!sameAddress ? [['contact.permanentAddress','permanent',permanentPincode]] : [])]
    const controllers = targets.map(([prefix,key,pin]) => { if (!/^\d{6}$/.test(pin)) return null; const controller = new AbortController(); queueMicrotask(() => setPinStatus(current => ({ ...current, [key]: 'Fetching location...' }))); fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: controller.signal }).then(response => response.json()).then(([result]) => { const office = result?.PostOffice?.[0]; if (!office) throw new Error('Not found'); setData(current => { let next = setPath(current, `${prefix}.town`, office.Name || ''); next = setPath(next, `${prefix}.city`, office.Block || office.District || ''); next = setPath(next, `${prefix}.district`, office.District || ''); next = setPath(next, `${prefix}.state`, office.State || ''); next = setPath(next, `${prefix}.country`, office.Country || 'India'); if (prefix.endsWith('currentAddress') && next.contact.sameAddress) next.contact.permanentAddress = { ...next.contact.currentAddress }; return next }); setPinStatus(current => ({ ...current, [key]: 'Address details filled' })) }).catch(error => { if (error.name !== 'AbortError') setPinStatus(current => ({ ...current, [key]: 'PIN code not found — enter manually' })) }); return controller })
    return () => controllers.forEach(controller => controller?.abort())
  }, [currentPincode, permanentPincode, sameAddress])
  const allErrors = validate(data), course = ACADEMICS[data.academic.course] || {}
  const field = (path,label,options,type,readOnly,placeholder,disabled) => <Field {...{ data,path,label,options,type,readOnly,placeholder,disabled,update }} error={errors[path]} />
  const screens = [
    <Section key="identity" title="Student Identity" icon={FiUser} hint="Core identity and government identification details"><PhotoUpload data={data} update={update} notify={notify} />{field('personal.firstName','First Name')}{field('personal.middleName','Middle Name')}{field('personal.lastName','Last Name')}{field('personal.gender','Gender',['Female','Male','Non-binary'])}{field('personal.dob','Date of Birth',null,'date')}{field('personal.bloodGroup','Blood Group',['A+','A-','B+','B-','AB+','AB-','O+','O-'])}{field('personal.nationality','Nationality')}{field('personal.aadhaar','Aadhaar Number')}</Section>,
    <><Section title="Contact Information" icon={FiPhone}>{field('contact.mobile','Student Mobile')}{field('contact.alternateMobile','Alternate Mobile')}{field('contact.email','Student Email',null,'email')}{field('contact.alternateEmail','Alternate Email',null,'email')}</Section><Section title="Current Address" icon={FiHome}><AddressFields data={data} prefix="contact.currentAddress" update={update} errors={errors} />{pinStatus.current && <p className={`sa-pincode-status ${pinStatus.current.includes('filled') ? 'success' : ''}`}>{pinStatus.current}</p>}</Section><Section title="Permanent Address" icon={FiHome}><label className="sa-check sa-span-all"><input type="checkbox" checked={data.contact.sameAddress} onChange={event => update('contact.sameAddress', event.target.checked)} /><span>Permanent address same as current address</span></label>{!data.contact.sameAddress && <><AddressFields data={data} prefix="contact.permanentAddress" update={update} errors={errors} />{pinStatus.permanent && <p className={`sa-pincode-status ${pinStatus.permanent.includes('filled') ? 'success' : ''}`}>{pinStatus.permanent}</p>}</>}</Section></>,
    <><div className="sa-rule-note"><FiAlertCircle /><span>Father details are mandatory. Guardian information may be added when applicable.</span></div><Section title="Father Details" icon={FiUser}>{field('parents.father.name','Father Name')}{field('parents.father.mobile','Father Mobile')}{field('parents.father.email','Father Email',null,'email')}{field('parents.father.occupation','Occupation')}{field('parents.father.qualification','Qualification')}{field('parents.father.income','Annual Income',null,'number')}</Section><Section title="Mother Details" icon={FiUser}>{field('parents.mother.name','Mother Name')}{field('parents.mother.mobile','Mother Mobile')}</Section><Section title="Guardian Details" icon={FiUsers}>{field('parents.guardian.name','Guardian Name')}{field('parents.guardian.relationship','Relationship',['Mother','Brother','Sister','Grandfather','Grandmother','Uncle','Aunt','Legal Guardian','Other'])}{data.parents.guardian.relationship === 'Other' && field('parents.guardian.relationshipOther','Specify Relationship')}{field('parents.guardian.mobile','Guardian Mobile')}</Section><Section title="Emergency Information" icon={FiPhone}>{field('parents.primaryContact','Primary Contact',['Father','Mother','Guardian'])}{field('parents.emergencyMobile','Emergency Contact Number')}</Section></>,
    <Section key="academic" title="Academic Placement" icon={FiBookOpen} hint="Course, department and branch selections are dependent">{field('academic.academicYear','Academic Year',YEARS)}{field('academic.admissionType','Admission Type',['Counseling','Management','Spot Admission','Lateral Entry','Transfer'])}{field('academic.course','Course',Object.keys(ACADEMICS))}{field('academic.department','Department',Object.keys(course),null,false,data.academic.course ? 'Select department' : 'Select course first',!data.academic.course)}{field('academic.branch','Branch',course[data.academic.department] || [],null,false,data.academic.department ? 'Select branch' : 'Select department first',!data.academic.department)}{field('academic.semester','Semester',SEMESTERS)}{field('academic.section','Section',SECTIONS)}{field('academic.regulation','Regulation')}{field('academic.quota','Quota',['Convener','Management','NRI','Sports','NCC','Other'])}{data.academic.quota === 'Other' && field('academic.quotaOther','Specify Quota')}{field('academic.entryType','Entry Type',['Regular','Lateral Entry','Transfer'])}</Section>,
    <><Section title="10th / SSC" icon={FiBookOpen}>{field('previousEducation.tenth.board','Board')}{field('previousEducation.tenth.institution','School Name')}{field('previousEducation.tenth.rollNumber','Roll Number')}{field('previousEducation.tenth.passingYear','Year of Passing',null,'number')}{field('previousEducation.tenth.score','Percentage / CGPA',null,'number')}</Section><Section title="Intermediate / Diploma" icon={FiBookOpen}>{field('previousEducation.intermediate.qualification','Qualification',['Intermediate / 12th','Diploma','Equivalent'])}{field('previousEducation.intermediate.board','Board / University')}{field('previousEducation.intermediate.institution','College Name')}{field('previousEducation.intermediate.passingYear','Year of Passing',null,'number')}{field('previousEducation.intermediate.stream','Stream',['MPC','PCM','Diploma','Equivalent'])}{field('previousEducation.intermediate.score','Percentage / CGPA',null,'number')}</Section></>,
    <><Section title="Application Information" icon={FiFileText} hint="System references remain readable and protected">{field('application.number','Application Number',null,'text',true)}{field('application.date','Application Date',null,'date',true)}{field('admission.college','College',null,'text',true)}{field('admission.batch','Batch')}</Section><Section title="Student Services" icon={FiHome}>{field('admission.scholarship','Scholarship Required',['No','Yes'])}{data.admission.scholarship === 'Yes' && field('admission.scholarshipType','Scholarship Type')}{field('admission.hostel','Hostel Required',['No','Yes'])}{data.admission.hostel === 'Yes' && field('admission.hostelPreference','Hostel Preference',['Boys Hostel','Girls Hostel'])}{field('admission.transport','Transportation Required',['No','Yes'])}{data.admission.transport === 'Yes' && field('admission.transportRoute','Transport Route')}</Section></>,
    <div key="fees" className="sa-fee-layout"><Section title="Fee Details" icon={FiInbox}>{field('fees.tuitionFee','Tuition Fee',null,'number')}{field('fees.admissionFee','Admission Fee',null,'number')}{data.admission.scholarship === 'Yes' && field('fees.scholarshipAmount','Scholarship Amount',null,'number')}{data.admission.hostel === 'Yes' && field('fees.hostelFee','Hostel Fee',null,'number')}{data.admission.transport === 'Yes' && field('fees.transportFee','Transportation Fee',null,'number')}{field('fees.paymentStatus','Payment Status',['Pending','Partially Paid','Paid'])}</Section><FeeSummary data={data} /></div>,
    <DocumentsUpload key="documents" data={data} update={update} errors={errors} notify={notify} />,
    <FullReview key="review" data={data} edit={setStep} />,
  ]
  const focusFirst = () => window.setTimeout(() => document.querySelector('.student-admission .sa-field.invalid :is(input,select)')?.focus({ preventScroll: false }), 0)
  const persistDraft = () => { const activity = data.status === 'DRAFT' ? [...data.activity, { label: 'Draft saved', date: new Date().toISOString() }] : data.activity; const saved = save({ ...data, activity }); setData(saved); notify('Admission draft saved successfully') }
  const nextStep = () => { const prefixes = [['personal.'],['contact.'],['parents.'],['academic.'],['previousEducation.'],['application.','admission.'],['fees.'],['documents.'],[]][step]; const relevant = Object.fromEntries(Object.entries(allErrors).filter(([path]) => prefixes.some(prefix => path.startsWith(prefix)))); setErrors(relevant); if (Object.keys(relevant).length) { notify('Correct the highlighted fields before continuing.', 'error'); focusFirst(); return } save(data); setStep(current => current + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const requestSubmit = () => { setErrors(allErrors); if (Object.keys(allErrors).length) { notify('Complete all required fields before submission.', 'error'); focusFirst(); return } if (!declared) { notify('Confirm the declaration before submitting.', 'error'); return } setConfirmSubmit(true) }
  const submit = () => { if (submitting) return; setSubmitting(true); save({ ...data, status: 'SUBMITTED', activity: [...data.activity, { label: 'Application submitted', date: new Date().toISOString() }] }); setConfirmSubmit(false); notify('Admission application submitted successfully'); window.setTimeout(() => navigate('/student-management/admissions'), 700) }
  return <><Breadcrumb tail={id ? 'Edit Admission' : 'New Admission'} /><header className="sa-page-header sa-wizard-header"><div><h1>{id ? 'Edit Student Admission' : 'New Student Admission'}</h1><p>Application reference <strong>{data.application.number}</strong></p></div><div><Badge value={data.status} /><Button onClick={() => navigate('/student-management/admissions')}>Cancel</Button></div></header><Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} /><WizardStepper step={step} setStep={setStep} /><form className="sa-wizard-card" onSubmit={event => event.preventDefault()}><header className="sa-step-heading"><div><small>Step {step + 1} of {STEPS.length}</small><h2>{STEPS[step]}</h2></div><span>{Math.round(((step + 1) / STEPS.length) * 100)}% complete</span></header>{screens[step]}{step === STEPS.length - 1 && <label className="sa-declaration"><input type="checkbox" checked={declared} onChange={event => setDeclared(event.target.checked)} /><span><strong>Application Declaration</strong>I confirm that the information entered above is correct.</span></label>}<footer className="sa-wizard-actions"><Button disabled={!step || submitting} onClick={() => setStep(current => current - 1)}><FiArrowLeft /> Previous</Button><span /><Button disabled={submitting} onClick={persistDraft}><FiSave /> Save Draft</Button>{step < STEPS.length - 1 ? <Button primary onClick={nextStep}>Save & Continue <FiArrowRight /></Button> : <Button primary disabled={!declared || submitting} onClick={requestSubmit}>{submitting ? 'Submitting...' : 'Submit Application'}</Button>}</footer></form>{confirmSubmit && <ConfirmDialog title="Submit Admission Application?" confirmLabel="Submit Application" onCancel={() => setConfirmSubmit(false)} onConfirm={submit}><p>After submission, the application will move to the admission review process.</p><dl><div><dt>Student</dt><dd>{studentName(data)}</dd></div><div><dt>Application</dt><dd>{data.application.number}</dd></div></dl></ConfirmDialog>}</>
}

function InfoGrid({ title, items }) { const normalized = items.filter(([label]) => label !== 'Registration Number').map(([label,value]) => [label === 'Application Number' ? 'Registration Number' : label,value]); return <section className="sa-detail-panel"><header><h2>{title}</h2></header><dl>{normalized.filter(([,value]) => text(value)).map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{display(value)}</dd></div>)}</dl></section> }
function DocumentDetails({ data }) { return <section className="sa-detail-panel"><header><h2>Uploaded Documents</h2><p>Documents submitted with the admission application</p></header><div className="sa-document-detail-list">{DOCUMENTS.map(([key,label]) => { const document = data.documents?.[key]; return <article key={key}><FiFileText /><div><strong>{label}</strong><span>{document?.name || 'Not uploaded'}</span></div>{document?.data && <a href={document.data} target="_blank" rel="noreferrer">Preview</a>}</article>})}</div></section> }
function Timeline({ activity }) { return <section className="sa-detail-panel"><header><h2>Admission Activity</h2><p>Complete application history</p></header><ol className="sa-timeline">{[...activity].reverse().map((item,index) => <li key={`${item.date}-${index}`}><i>{index === 0 ? <FiCheck /> : ''}</i><div><strong>{item.label}</strong>{item.remarks && <p>{item.remarks}</p>}<span>{dateTime(item.date)}</span></div></li>)}</ol></section> }
function DetailContent({ data, tab }) {
  const address = value => [value.line1,value.line2,value.town,value.city,value.district,value.state,value.country,value.pincode].filter(Boolean).join(', ')
  if (tab === 'personal') return <><InfoGrid title="Personal Information" items={[['Student Name',studentName(data)],['Gender',data.personal.gender],['Date of Birth',data.personal.dob],['Blood Group',data.personal.bloodGroup],['Nationality',data.personal.nationality],['Aadhaar Number',data.personal.aadhaar]]} /><InfoGrid title="Contact & Address" items={[['Student Mobile',data.contact.mobile],['Alternate Mobile',data.contact.alternateMobile],['Student Email',data.contact.email],['Alternate Email',data.contact.alternateEmail],['Current Address',address(data.contact.currentAddress)],['Permanent Address',data.contact.sameAddress ? 'Same as current address' : address(data.contact.permanentAddress)]]} /><InfoGrid title="Parent / Guardian" items={[['Father Name',data.parents.father.name],['Father Mobile',data.parents.father.mobile],['Father Email',data.parents.father.email],['Mother Name',data.parents.mother.name],['Guardian Name',data.parents.guardian.name],['Guardian Mobile',data.parents.guardian.mobile],['Emergency Contact',data.parents.emergencyMobile]]} /></>
  if (tab === 'academic') return <InfoGrid title="Academic Placement" items={[['Academic Year',data.academic.academicYear],['Admission Type',data.academic.admissionType],['Course',data.academic.course],['Department',data.academic.department],['Branch',data.academic.branch],['Semester',data.academic.semester],['Section',data.academic.section],['Regulation',data.academic.regulation],['Quota',quota(data)],['Entry Type',data.academic.entryType]]} />
  if (tab === 'education') return <><InfoGrid title="10th / SSC" items={[['Board',data.previousEducation.tenth.board],['School',data.previousEducation.tenth.institution],['Roll Number',data.previousEducation.tenth.rollNumber],['Passing Year',data.previousEducation.tenth.passingYear],['Score',data.previousEducation.tenth.score]]} /><InfoGrid title="Intermediate / Diploma" items={[['Qualification',data.previousEducation.intermediate.qualification],['Board / University',data.previousEducation.intermediate.board],['College',data.previousEducation.intermediate.institution],['Passing Year',data.previousEducation.intermediate.passingYear],['Stream',data.previousEducation.intermediate.stream],['Score',data.previousEducation.intermediate.score]]} /></>
  if (tab === 'services') return <InfoGrid title="Admission & Services" items={[['Application Number',data.application.number],['Application Date',data.application.date],['Admission Number',data.application.admissionNumber],['Admission Date',data.application.admissionDate],['College',data.admission.college],['Batch',data.admission.batch],['Scholarship',data.admission.scholarship],['Scholarship Type',data.admission.scholarshipType],['Hostel',data.admission.hostel],['Hostel Preference',data.admission.hostelPreference],['Transportation',data.admission.transport],['Transport Route',data.admission.transportRoute]]} />
  if (tab === 'fees') return <div className="sa-fee-layout"><InfoGrid title="Fee Record" items={[['Tuition Fee',money(data.fees.tuitionFee)],['Admission Fee',money(data.fees.admissionFee)],['Scholarship Amount',money(data.fees.scholarshipAmount)],['Hostel Fee',money(data.fees.hostelFee)],['Transportation Fee',money(data.fees.transportFee)],['Net Payable',money(data.fees.totalFee)],['Payment Status',data.fees.paymentStatus]]} /><FeeSummary data={data} /></div>
  if (tab === 'documents') return <DocumentDetails data={data} />
  if (tab === 'activity') return <Timeline activity={data.activity} />
  return <InfoGrid title="Application Overview" items={[['Application Number',data.application.number],['Application Date',data.application.date],['Admission Number',data.application.admissionNumber],['Admission Date',data.application.admissionDate],['Academic Year',data.academic.academicYear],['Admission Type',data.academic.admissionType],['Course',data.academic.course],['Department',data.academic.department],['Branch',data.academic.branch],['Semester',data.academic.semester],['Section',data.academic.section],['Fee Status',data.fees.paymentStatus],['Admission Status',STATUS[data.status]]]} />
}
function StudentHeader({ data }) { return <section className="sa-profile-header"><div className="sa-profile-avatar">{studentName(data).split(' ').map(part => part[0]).slice(0,2).join('')}</div><div><span>{data.application.number}</span><h1>{studentName(data)}</h1><p>{display(data.academic.course)} · {display(data.academic.branch)} · {display(data.academic.academicYear)}</p></div><Badge value={data.status} />{data.status === 'APPROVED' && <dl><div><dt>Admission Number</dt><dd>{data.application.admissionNumber}</dd></div><div><dt>Admission Date</dt><dd>{data.application.admissionDate}</dd></div></dl>}</section> }

function AdmissionDetails({ approval = false }) {
  const { id } = useParams(); const navigate = useNavigate(); const [data, setData] = useState(() => get(id)); const [tab, setTab] = useState('overview'); const [remarks, setRemarks] = useState(''); const [toast, setToast] = useState(null); const [confirmApproval, setConfirmApproval] = useState(false); const [reviewed, setReviewed] = useState(false)
  if (!data) return <section className="sa-empty"><FiAlertCircle /><h2>Admission not found</h2><Button onClick={() => navigate('/student-management/admissions')}>Back to Admissions</Button></section>
  const transition = status => { if (['CORRECTION_REQUIRED','REJECTED'].includes(status) && !text(remarks)) { setToast({ message: 'Admission officer remarks are required for this decision.', tone: 'error' }); return } const next = { ...data, status, remarks, application: status === 'APPROVED' ? { ...data.application, admissionNumber: data.application.admissionNumber || `PEC-26-${String(Date.now()).slice(-5)}`, admissionDate: data.application.admissionDate || new Date().toISOString().slice(0,10) } : data.application, activity: [...data.activity, { label: STATUS[status], remarks, date: new Date().toISOString() }] }; setData(save(next)); setRemarks(''); setToast({ message: `${STATUS[status]} saved successfully`, tone: 'success' }); setConfirmApproval(false) }
  if (approval) return <><Breadcrumb tail="Admission Review" /><button className="sa-back" onClick={() => navigate('/student-management/admissions')}><FiArrowLeft /> Back to Admissions</button><header className="sa-review-header"><div><span>Admission Officer Workspace</span><h1>Admission Review</h1><p>{studentName(data)} · {data.application.number} · {display(data.academic.course)} / {display(data.academic.branch)}</p></div><Badge value={data.status} /></header><Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} /><FullReview data={data} /><section className="sa-approval"><header><div><h2>Review Decision</h2><p>Complete the application review before recording a workflow decision.</p></div><Badge value={data.status} /></header><label className="sa-review-confirm"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} /><span>I have reviewed all admission sections and supporting information.</span></label><label className="sa-remarks"><span>Admission Officer Remarks</span><textarea maxLength="500" value={remarks} onChange={event => setRemarks(event.target.value)} placeholder="Add verification, correction or decision remarks..." /><small>{remarks.length}/500</small></label><footer>{data.status === 'SUBMITTED' && <Button primary disabled={!reviewed} onClick={() => transition('UNDER_REVIEW')}>Start Review</Button>}{data.status === 'UNDER_REVIEW' && <><Button disabled={!reviewed || !remarks.trim()} onClick={() => transition('CORRECTION_REQUIRED')}>Request Correction</Button><Button primary disabled={!reviewed} onClick={() => transition('VERIFIED')}>Verify Application</Button></>}{data.status === 'VERIFIED' && <><Button danger disabled={!reviewed || !remarks.trim()} onClick={() => transition('REJECTED')}>Reject</Button><Button primary disabled={!reviewed} onClick={() => setConfirmApproval(true)}>Approve Admission</Button></>}{data.status === 'APPROVED' && <span className="sa-approved-note"><FiCheckCircle /> Admission approved as {data.application.admissionNumber}</span>}</footer></section>{confirmApproval && <ConfirmDialog title="Approve Student Admission?" confirmLabel="Approve Admission" onCancel={() => setConfirmApproval(false)} onConfirm={() => transition('APPROVED')}><p>This will mark the student admission as approved and generate an admission number.</p><dl><div><dt>Student</dt><dd>{studentName(data)}</dd></div><div><dt>Course / Branch</dt><dd>{data.academic.course} · {data.academic.branch}</dd></div><div><dt>Academic Year</dt><dd>{data.academic.academicYear}</dd></div><div><dt>Fee Status</dt><dd>{data.fees.paymentStatus}</dd></div></dl></ConfirmDialog>}</>
  return <><Breadcrumb tail="Admission Details" /><button className="sa-back" onClick={() => navigate('/student-management/admissions')}><FiArrowLeft /> Back to Admissions</button><StudentHeader data={data} /><nav className="sa-tabs">{DETAIL_TABS.map(([value,label,Icon]) => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}><Icon /> {label}</button>)}</nav><DetailContent data={data} tab={tab} /></>
}

export default function StudentAdmission() {
  const { pathname } = useLocation()
  let screen = <AdmissionList />
  if (pathname.endsWith('/new') || pathname.endsWith('/edit')) screen = <AdmissionForm />
  else if (pathname.endsWith('/approval')) screen = <AdmissionDetails approval />
  else if (/\/admissions\/[^/]+$/.test(pathname)) screen = <AdmissionDetails />
  return <DashboardLayout><main className="student-admission">{screen}</main></DashboardLayout>
}
