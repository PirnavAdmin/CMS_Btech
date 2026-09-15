import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiBriefcase, FiCheckCircle, FiEdit2, FiEye, FiPlus, FiSearch, FiUser, FiUsers, FiClock, FiBookOpen, FiMapPin, FiX, FiTrash2 } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import ExportMenu from '../../components/ExportMenu'
import FilterPanel from '../../components/FilterPanel'
import StatusBadge from '../../components/StatusBadge'
import TablePagination from '../../components/TablePagination'
import SearchableSelect from '../../components/SearchableSelect'
import './FacultyManagement.css'

const PAGE_SIZE = 5
const WORKLOAD_LIMITS = { under: 12, normal: 20 }
const departments = ['Computer Science & Engineering', 'Electronics & Communication', 'Electrical & Electronics', 'Mechanical Engineering', 'Civil Engineering']
const seed = [['FAC001','Dr. Anitha Sharma','Professor','Ph.D','14 Years','9876543210','anitha.sharma@pirnav.edu.in','Permanent','Working'],['FAC002','Dr. Rakesh Kumar','Associate Professor','Ph.D','11 Years','9876543211','rakesh.kumar@pirnav.edu.in','Permanent','Working'],['FAC003','Prof. Meera Nair','Assistant Professor','M.Tech','8 Years','9876543212','meera.nair@pirnav.edu.in','Permanent','Working'],['FAC004','Dr. Vikram Rao','Professor','Ph.D','18 Years','9876543213','vikram.rao@pirnav.edu.in','Permanent','On Leave'],['FAC005','Ms. Priya Menon','Assistant Professor','M.Tech','6 Years','9876543214','priya.menon@pirnav.edu.in','Contract','Working'],['FAC006','Mr. Arjun Reddy','Senior Lecturer','M.Tech','10 Years','9876543215','arjun.reddy@pirnav.edu.in','Permanent','Working'],['FAC007','Dr. Sneha Iyer','Associate Professor','Ph.D','12 Years','9876543216','sneha.iyer@pirnav.edu.in','Permanent','Working'],['FAC008','Mr. Karthik Bose','Lab Instructor','M.Sc','5 Years','9876543217','karthik.bose@pirnav.edu.in','Contract','Resigned'],['FAC009','Ms. Divya Joseph','Assistant Professor','M.Tech','7 Years','9876543218','divya.joseph@pirnav.edu.in','Permanent','Working'],['FAC010','Dr. Nitin Kapoor','Professor','Ph.D','20 Years','9876543219','nitin.kapoor@pirnav.edu.in','Permanent','Working'],['FAC011','Ms. Farah Khan','Visiting Faculty','MCA','4 Years','9876543220','farah.khan@pirnav.edu.in','Visiting','Working'],['FAC012','Mr. Suresh Patil','Lecturer','M.Tech','9 Years','9876543221','suresh.patil@pirnav.edu.in','Permanent','Retired']].map((row, index) => ({ id: `faculty-${index + 1}`, employeeId: row[0], fullName: row[1], designation: row[2], qualification: row[3], experience: row[4], mobile: row[5], email: row[6], employmentType: row[7], employmentStatus: row[8], department: departments[index % departments.length] }))
const statuses = ['Working', 'On Leave', 'Resigned', 'Retired']
const designations = ['Professor', 'Associate Professor', 'Assistant Professor', 'Senior Lecturer', 'Lecturer', 'Lab Instructor', 'Visiting Faculty']
const employmentTypes = ['Permanent', 'Contract', 'Visiting', 'Guest']
// Local configuration, intentionally independent of backend master data.
const assignmentOptions = {
  academicYear: ['2026-27', '2027-28', '2028-29'], course: ['B.Tech'], branch: departments,
  semester: Array.from({ length: 8 }, (_, i) => 'Semester ' + (i + 1)),
  section: ['Section A', 'Section B', 'Section C'],
  assignmentType: ['Subject Faculty', 'Lab Faculty', 'Class Advisor', 'Mentor', 'Project Guide'],
}
const sections = [
  { title: 'Personal Details', heading: 'Personal Information', icon: FiUser, description: 'Identity, photograph and primary contact information.', fields: [
    ['employeeId', 'Employee ID', 'readonly'], ['fullName', 'Faculty Full Name', 'text', true],
    ['gender', 'Gender', ['Male', 'Female', 'Other'], true], ['dob', 'Date of Birth', 'date', true],
    ['mobile', 'Mobile Number', 'tel', true], ['email', 'Email', 'email', true],
  ] },
  { title: 'Employment', heading: 'Employment Information', icon: FiBriefcase, description: 'Faculty designation, department and employment information.', fields: [
    ['department', 'Department', departments, true], ['designation', 'Designation', designations, true],
    ['employmentType', 'Employment Type', employmentTypes, true], ['employmentStatus', 'Employment Status', statuses, true],
    ['joiningDate', 'Date of Joining', 'date', true], ['employeeCategory', 'Employee Category', ['Teaching', 'Technical', 'Visiting']],
    ['experience', 'Total Experience', 'number'],
  ] },
  { title: 'Academic Details', heading: 'Academic Information', icon: FiBookOpen, description: 'Qualifications, specialization and professional experience.', fields: [
    ['qualification', 'Highest Qualification', ['Ph.D', 'M.Tech', 'M.E', 'MCA', 'M.Sc', 'B.Tech', 'Other'], true],
    ['specialization', 'Specialization', 'text'], ['university', 'University / Institution', 'text'],
    ['passingYear', 'Year of Passing', 'number'], ['teachingExperience', 'Teaching Experience', 'number'], ['industryExperience', 'Industry Experience', 'number'],
  ] },
  { title: 'Contact', heading: 'Contact Information', icon: FiMapPin, description: 'Address and emergency contacts. These details are optional.', fields: [
    ['alternateMobile', 'Alternate Mobile', 'tel'], ['personalEmail', 'Personal Email', 'email'],
    ['address', 'Address', 'textarea'], ['city', 'City', 'text'], ['state', 'State', 'text'], ['pincode', 'Pincode', 'text'],
    ['emergencyName', 'Emergency Contact Name', 'text'], ['emergencyMobile', 'Emergency Contact Number', 'tel'], ['relationship', 'Relationship', 'text'],
  ] },
]
const experienceKeys = ['experience', 'teachingExperience', 'industryExperience']
const today = () => {
  const date = new Date()
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}
const years = value => value === '' || value == null ? '—' : (parseFloat(value) || 0) + ' Years'
const normalize = row => ({ ...Object.fromEntries(sections.flatMap(s => s.fields.map(([key]) => [key, '']))), photo: '', assignments: [], ...row, experience: row.experience == null ? '' : String(parseFloat(row.experience) || 0) })
const clean = data => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]))
const workload = row => {
  const assignments = row.assignments || []
  const hours = assignments.reduce((sum, item) => sum + Number(item.weeklyHours || 0), 0)
  const subjects = new Set(assignments.filter(a => a.subjectCode).map(a => a.subjectCode.toUpperCase())).size
  return { hours, subjects, status: hours === 0 ? 'Unassigned' : hours <= WORKLOAD_LIMITS.under ? 'Under Load' : hours <= WORKLOAD_LIMITS.normal ? 'Normal Load' : 'Over Load' }
}
const exportColumns = [['employeeId', 'Employee ID'], ['fullName', 'Faculty Name'], ['department', 'Department'], ['designation', 'Designation'], ['qualification', 'Qualification'], ['experience', 'Experience'], ['mobile', 'Mobile'], ['email', 'Email'], ['employmentType', 'Employment Type'], ['employmentStatus', 'Employment Status']].map(([value, label]) => ({ label, value: value === 'experience' ? row => years(row.experience) : value }))

function validateFaculty(data, rows) {
  const errors = {}
  sections.forEach(section => section.fields.forEach(([key, label, type, required]) => {
    if (required && !String(data[key] ?? '').trim()) errors[key] = label + ' is required.'
    if (data[key] && Array.isArray(type) && !type.includes(data[key])) errors[key] = 'Select a valid ' + label.toLowerCase() + '.'
  }))
  if (!data.employeeId || rows.some(row => row.id !== data.id && row.employeeId === data.employeeId)) errors.employeeId = 'Employee ID must be unique.'
  if (!data.fullName?.trim()) errors.fullName = 'Faculty full name is required.'
  for (const key of ['email', 'personalEmail']) if (data[key] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data[key].trim())) errors[key] = 'Enter a valid email address.'
  if (rows.some(row => row.id !== data.id && row.email.trim().toLowerCase() === data.email?.trim().toLowerCase())) errors.email = 'A faculty member with this email already exists.'
  for (const key of ['mobile', 'alternateMobile', 'emergencyMobile']) if (data[key] && !/^\d{10}$/.test(data[key])) errors[key] = 'Enter exactly 10 numeric digits.'
  for (const key of ['dob', 'joiningDate']) if (data[key] && (!/^\d{4}-\d{2}-\d{2}$/.test(data[key]) || !Number.isFinite(Date.parse(data[key])) || data[key] > today())) errors[key] = 'Enter a valid date that is not in the future.'
  if (data.dob && data.joiningDate && data.joiningDate <= data.dob) errors.joiningDate = 'Joining date must be after date of birth.'
  for (const key of experienceKeys) if (data[key] !== '' && (!Number.isFinite(Number(data[key])) || Number(data[key]) < 0 || Number(data[key]) > 80)) errors[key] = 'Enter experience between 0 and 80 years.'
  if (data.passingYear && (!/^\d{4}$/.test(data.passingYear) || Number(data.passingYear) < 1950 || Number(data.passingYear) > new Date().getFullYear())) errors.passingYear = 'Enter a four-digit year from 1950 to the current year.'
  if (data.pincode && !/^\d{6}$/.test(data.pincode)) errors.pincode = 'Enter a 6-digit pincode.'
  return errors
}

function Avatar({ faculty, large = false }) {
  const initials = (faculty.fullName || '').replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, '').split(/\s+/).filter(Boolean).map(part => part[0]).filter((_, i, all) => i === 0 || i === all.length - 1).join('').slice(0, 2) || 'FM'
  return <span className={'fm-avatar ' + (large ? 'fm-avatar-large' : '')}>{faculty.photo ? <img src={faculty.photo} alt={(faculty.fullName || 'Faculty') + ' profile'} /> : initials}</span>
}
function EmptyState({ title, description, action, onAction }) {
  return <div className="fm-empty"><FiUsers aria-hidden="true" /><h3>{title}</h3>{description && <p>{description}</p>}{action && <button type="button" className="fm-button secondary" onClick={onAction}>{action}</button>}</div>
}
function FacultyAttendanceScreen({ faculty }) {
  const working = faculty.filter(item => item.employmentStatus === 'Working')
  return <><header className="faculty-page-header"><div><p className="fm-eyebrow">FACULTY OPERATIONS</p><h1>Faculty Attendance</h1><p>Record and review daily faculty attendance separately from employment status.</p></div></header><section className="faculty-directory"><header className="fm-section-bar"><div><p className="fm-eyebrow">DAILY ATTENDANCE</p><p className="fm-muted">{working.length} working faculty</p></div></header><div className="faculty-table-wrap"><table><thead><tr><th>Employee ID</th><th>Faculty</th><th>Department</th><th>Designation</th><th>Attendance Status</th><th>Check In</th><th>Check Out</th></tr></thead><tbody>{working.map(item => <tr key={item.id}><td>{item.employeeId}</td><td><strong>{item.fullName}</strong></td><td>{item.department}</td><td>{item.designation}</td><td><StatusBadge value="Present" /></td><td>08:45</td><td>—</td></tr>)}</tbody></table></div></section></>
}
function ProfileSections({ data }) {
  return <div className="fm-profile-sections">{sections.map(section => {
    const fields = section.fields.filter(([key, , , required]) => required || key === 'employeeId' || (data[key] !== '' && data[key] != null))
    return <section className="fm-panel" key={section.title}><h2><section.icon />{section.heading}</h2>{fields.length ? <dl className="fm-info-grid">{fields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{experienceKeys.includes(key) ? years(data[key]) : data[key] || '—'}</dd></div>)}</dl> : <p className="fm-muted">No optional contact information provided.</p>}</section>
  })}</div>
}
function Field({ field, data, errors, update, native = false }) {
  const [key, label, type, required] = field
  const id = 'fm-' + key
  const props = { id, value: data[key] ?? '', onChange: event => update(key, event.target.value), 'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? id + '-error' : undefined, required: Boolean(required) }
  return <div className={'fm-field ' + (type === 'textarea' ? 'fm-wide' : '')}><label htmlFor={Array.isArray(type) && !native ? undefined : id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
    {Array.isArray(type) ? native ? <select {...props}><option value="">Select {label.toLowerCase()}</option>{type.map(value => <option key={value}>{value}</option>)}</select> : <SearchableSelect label={label} value={data[key] || ''} options={type} onChange={value => update(key, value)} required={required} error={Boolean(errors[key])} placeholder={'Select ' + label.toLowerCase()} /> : type === 'textarea' ? <textarea {...props} rows={2} /> : <input {...props} type={type === 'readonly' ? 'text' : type} readOnly={type === 'readonly'} max={type === 'date' ? today() : key === 'passingYear' ? new Date().getFullYear() : key === 'weeklyHours' ? 60 : type === 'number' ? 80 : undefined} min={key === 'passingYear' ? 1950 : type === 'number' ? 0 : undefined} step={key === 'passingYear' ? 1 : type === 'number' ? 0.5 : undefined} inputMode={type === 'tel' || key === 'pincode' ? 'numeric' : undefined} />}
    {errors[key] && <small id={id + '-error'} className="fm-error">{errors[key]}</small>}
  </div>
}
function FacultyForm({ initial, faculty, onSave, onCancel }) {
  const [data, setData] = useState(() => normalize(initial))
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState({})
  const [photoBusy, setPhotoBusy] = useState(false)
  const readerRef = useRef(null)
  const formRef = useRef(null)
  useEffect(() => () => readerRef.current?.abort(), [])
  const update = (key, value) => { setData(old => ({ ...old, [key]: value })); setErrors(old => ({ ...old, [key]: undefined })) }
  const focusError = () => requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus())
  const next = event => {
    event.preventDefault()
    const checked = validateFaculty(clean(data), faculty)
    if (step < 4) {
      const keys = sections[step].fields.map(([key]) => key)
      const currentErrors = Object.fromEntries(Object.entries(checked).filter(([key]) => keys.includes(key)))
      setErrors(currentErrors)
      if (Object.keys(currentErrors).length) { focusError(); return }
      setStep(step + 1)
    } else {
      setErrors(checked)
      if (Object.keys(checked).length) { setStep(sections.findIndex(section => section.fields.some(([key]) => checked[key]))); focusError(); return }
      onSave(clean(data))
    }
  }
  const photo = event => {
    const file = event.target.files?.[0]
    if (!file) return
    readerRef.current?.abort()
    if (!file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) { setErrors(old => ({ ...old, photo: 'Choose an image smaller than 3 MB.' })); return }
    const reader = new FileReader()
    readerRef.current = reader
    setPhotoBusy(true)
    reader.onload = () => { update('photo', reader.result); setPhotoBusy(false) }
    reader.onerror = () => { setErrors(old => ({ ...old, photo: 'Could not read this image. Please choose another.' })); setPhotoBusy(false) }
    reader.onabort = () => setPhotoBusy(false)
    reader.readAsDataURL(file)
  }
  const section = sections[step]
  return <form className="fm-panel fm-form" ref={formRef} onSubmit={next} noValidate>
    <ol className="fm-stepper">{[...sections.map(s => s.title), 'Preview'].map((title, index) => <li key={title} className={step === index ? 'active' : step > index ? 'complete' : ''} aria-current={step === index ? 'step' : undefined}><span>{step > index ? <FiCheckCircle /> : index + 1}</span>{title}</li>)}</ol>
    <div className="fm-section-heading"><h2>{section ? <section.icon /> : <FiCheckCircle />}{section?.title || 'Faculty Profile Preview'}</h2><p>{section?.description || 'Review the details below before saving this faculty record.'}</p></div>
    {step === 0 && <div className="fm-photo-picker"><Avatar faculty={data} large /><div><label htmlFor="fm-photo">Profile Photo</label><input id="fm-photo" type="file" accept="image/*" onChange={photo} /><small className="fm-muted">Local preview · Maximum 3 MB</small>{errors.photo && <small className="fm-error" role="alert">{errors.photo}</small>}</div></div>}
    {section ? <div className="fm-form-grid">{section.fields.map(field => <Field key={field[0]} field={field} data={data} errors={errors} update={update} />)}</div> : <><div className="fm-identity"><Avatar faculty={data} large /><div><h2>{data.fullName}</h2><p>{data.employeeId} · {data.designation}</p></div></div><ProfileSections data={data} /></>}
    {step === 0 && faculty.some(row => row.id !== data.id && row.mobile === data.mobile) && <p className="fm-warning">Another faculty member uses this mobile number. Please verify it before saving.</p>}
    <footer className="fm-form-footer"><button type="button" className="fm-button secondary" onClick={onCancel}>Cancel</button><span className="fm-muted">Step {step + 1} of 5</span><div className="fm-actions">{step > 0 && <button type="button" className="fm-button secondary" onClick={() => { setErrors({}); setStep(step - 1) }}>Previous</button>}<button type="submit" className="fm-button" disabled={photoBusy}>{step === 4 ? <><FiCheckCircle /> Save Faculty</> : 'Next'}</button></div></footer>
  </form>
}
function AssignmentList({ faculty, onRemove }) {
  const [pending, setPending] = useState(null)
  return <div className="fm-assignment-list">{(faculty.assignments || []).map(item => <article key={item.id} className="fm-assignment-card"><div><strong>{item.subjectCode ? item.subjectCode + ' · ' + item.subjectName : item.assignmentType}</strong><p>{item.academicYear} · {item.course} · {item.branch}</p><p>{item.semester} · {item.section} · {item.assignmentType}</p></div><div className="fm-assignment-end"><strong>{item.weeklyHours} Hrs / Week</strong>{onRemove && (pending === item.id ? <div className="fm-confirm" role="group" aria-label="Confirm assignment removal"><span>Remove assignment?</span><button type="button" className="fm-button danger" onClick={() => { onRemove(item.id); setPending(null) }}>Remove</button><button type="button" className="fm-button secondary" onClick={() => setPending(null)}>Keep</button></div> : <button type="button" className="fm-icon-button" title="Remove assignment" aria-label={'Remove ' + (item.subjectName || item.assignmentType)} onClick={() => setPending(item.id)}><FiTrash2 /></button>)}</div></article>)}</div>
}
function AssignmentDialog({ faculty, onClose, onAdd, onRemove, toast }) {
  const dialog = useRef(null)
  const [data, setData] = useState({ academicYear: '2026-27', course: 'B.Tech', branch: faculty.department, semester: '', section: '', assignmentType: 'Subject Faculty', subjectCode: '', subjectName: '', weeklyHours: '' })
  const [errors, setErrors] = useState({})
  const [acknowledged, setAcknowledged] = useState(false)
  const load = workload(faculty)
  const inactive = ['Resigned', 'Retired'].includes(faculty.employmentStatus)
  const subjectRequired = ['Subject Faculty', 'Lab Faculty'].includes(data.assignmentType)
  useEffect(() => {
    const returnTo = document.activeElement
    const element = dialog.current
    element.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { element.close(); document.body.style.overflow = overflow; returnTo?.focus() }
  }, [])
  const add = event => {
    event.preventDefault()
    if (inactive) return
    const item = { ...clean(data), subjectCode: data.subjectCode.trim().toUpperCase() }
    const issues = {}
    Object.entries(assignmentOptions).forEach(([key, options]) => { if (!options.includes(item[key])) issues[key] = 'Select a valid option.' })
    if ((subjectRequired || item.subjectName) && !item.subjectCode) issues.subjectCode = 'Subject code is required.'
    if ((subjectRequired || item.subjectCode) && !item.subjectName) issues.subjectName = 'Subject name is required.'
    if (!item.weeklyHours || !Number.isFinite(Number(item.weeklyHours)) || Number(item.weeklyHours) <= 0 || Number(item.weeklyHours) > 60) issues.weeklyHours = 'Enter weekly hours greater than 0 and at most 60.'
    const keys = [...Object.keys(assignmentOptions), 'subjectCode']
    if ((faculty.assignments || []).some(existing => keys.every(key => String(existing[key] || '').trim().toLowerCase() === String(item[key] || '').trim().toLowerCase()))) issues.duplicate = item.assignmentType === 'Class Advisor' ? 'This section already has a Class Advisor for the selected academic mapping.' : 'This academic assignment already exists for this faculty.'
    if (faculty.employmentStatus === 'On Leave' && !acknowledged) issues.leave = 'Acknowledge the leave warning before assigning work.'
    setErrors(issues)
    if (Object.keys(issues).length) { requestAnimationFrame(() => dialog.current?.querySelector('[aria-invalid="true"]')?.focus()); return }
    onAdd({ ...item, weeklyHours: Number(item.weeklyHours), id: crypto.randomUUID() })
    setData(old => ({ ...old, subjectCode: '', subjectName: '', weeklyHours: '' }))
    setAcknowledged(false)
  }
  const fields = Object.entries(assignmentOptions).map(([key, options]) => [key, ({ academicYear: 'Academic Year', course: 'Course', branch: 'Branch', semester: 'Semester', section: 'Section', assignmentType: 'Assignment Type' })[key], options, true])
  return <dialog className="fm-modal" ref={dialog} onCancel={event => { event.preventDefault(); onClose() }} aria-labelledby="fm-assignment-title"><header className="fm-modal-header"><div><p className="fm-eyebrow">ACADEMIC RESPONSIBILITIES</p><h2 id="fm-assignment-title">Academic Assignment</h2></div><button type="button" className="fm-icon-button" title="Close academic assignment" aria-label="Close academic assignment" onClick={onClose}><FiX /></button></header><div className="fm-modal-body"><div className="fm-identity"><Avatar faculty={faculty} /><div><strong>{faculty.fullName}</strong><p>{faculty.employeeId} · {faculty.department} · {faculty.designation}</p></div><StatusBadge value={faculty.employmentStatus} /></div><div className="fm-load-strip"><span>{load.subjects} Subjects</span><strong>{load.hours} Hrs / Week</strong><span className="fm-load-status">{load.status}</span></div>
    {inactive ? <p className="fm-warning">Academic assignments cannot be added for inactive faculty.</p> : <form onSubmit={add} noValidate>{faculty.employmentStatus === 'On Leave' && <div className="fm-warning"><strong>This faculty member is on leave.</strong><label className="fm-checkbox"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />I have reviewed their availability and want to assign new academic work.</label>{errors.leave && <small className="fm-error" role="alert">{errors.leave}</small>}</div>}<div className="fm-form-grid">{[...fields, ['subjectCode', 'Subject Code', 'text', subjectRequired], ['subjectName', 'Subject Name', 'text', subjectRequired], ['weeklyHours', 'Weekly Hours', 'number', true]].map(field => <Field key={field[0]} native field={field} data={data} errors={errors} update={(key, value) => { setData(old => ({ ...old, [key]: value })); setErrors(old => ({ ...old, [key]: undefined, duplicate: undefined })) }} />)}</div>{errors.duplicate && <p className="fm-error" role="alert">{errors.duplicate}</p>}<div className="fm-assignment-submit"><button type="submit" className="fm-button"><FiPlus /> Add Assignment</button></div></form>}
    <section className="fm-current-assignments"><h2>Current Assignments <span className="fm-muted">({faculty.assignments?.length || 0})</span></h2>{faculty.assignments?.length ? <AssignmentList faculty={faculty} onRemove={onRemove} /> : <EmptyState title="No academic responsibilities assigned." description={inactive ? 'Historical assignments will remain visible here.' : 'Complete the form above to assign academic work.'} />}</section></div><div className={'fm-toast ' + (toast ? 'visible' : '')} role="status" aria-live="polite">{toast && <><FiCheckCircle />{toast}</>}</div></dialog>
}

export default function FacultyManagement() {
  const location = useLocation()
  const navigate = useNavigate()
  const [faculty, setFaculty] = useState(() => seed.map(normalize))
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ department: '', designation: '', employmentType: '', employmentStatus: '' })
  const [page, setPage] = useState(1)
  const [assignmentId, setAssignmentId] = useState(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  useEffect(() => () => clearTimeout(toastTimer.current), [])
  const notify = message => {
    clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(''), 2800)
  }
  const path = location.pathname.replace(/\/$/, '')
  const editId = path.match(/^\/faculty\/([^/]+)\/edit$/)?.[1]
  const detailId = path !== '/faculty/new' ? path.match(/^\/faculty\/([^/]+)$/)?.[1] : null
  const selected = faculty.find(item => item.id === (editId || detailId))
  const assignedFaculty = faculty.find(item => item.id === assignmentId)
  const filtered = useMemo(() => faculty.filter(item => [item.fullName, item.employeeId, item.email, item.mobile, item.department, item.designation].join(' ').toLowerCase().includes(query.trim().toLowerCase()) && Object.entries(filters).every(([key, value]) => !value || item[key] === value)), [faculty, query, filters])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const active = Boolean(query || Object.values(filters).some(Boolean))
  const clear = () => { setQuery(''); setFilters({ department: '', designation: '', employmentType: '', employmentStatus: '' }); setPage(1) }
  const back = () => navigate('/faculty')
  const addFaculty = () => navigate('/faculty/new')
  const nextId = 'FAC' + String(Math.max(0, ...faculty.map(item => Number(item.employeeId.replace(/^FAC/, '')) || 0)) + 1).padStart(3, '0')
  const save = data => {
    setFaculty(rows => data.id ? rows.map(row => row.id === data.id ? { ...row, ...data, id: row.id, assignments: row.assignments } : row) : [{ ...data, id: crypto.randomUUID() }, ...rows])
    notify(data.id ? 'Faculty updated successfully' : 'Faculty created successfully')
    clear()
    back()
  }
  const changeAssignments = (transform, message) => {
    setFaculty(rows => rows.map(row => row.id === assignmentId ? { ...row, assignments: transform(row.assignments || []) } : row))
    notify(message)
  }
  // Explicit local scope prevents ExportMenu's faculty filename alias using a server endpoint.
  const directoryActions = <><ExportMenu rows={filtered} columns={exportColumns} screen="faculty-local-directory" filename="faculty-roster" title="Faculty Directory" /><button className="fm-button" type="button" onClick={addFaculty}><FiPlus /> Add Faculty</button></>
  let content
  if (path === '/faculty/advisors' || path === '/faculty/subjects') return <Navigate to="/faculty" replace />
  if (path === '/faculty/attendance') content = <FacultyAttendanceScreen faculty={faculty} />
  else if (((editId || detailId) && !selected) || (!['/faculty', '/faculty/new'].includes(path) && !editId && !detailId)) {
    content = <section className="fm-panel"><EmptyState title="Faculty record not found" action="Back to Faculty Directory" onAction={back} /></section>
  } else if (path === '/faculty/new' || editId) {
    content = <><header className="faculty-page-header"><div><p className="fm-eyebrow">ACADEMIC RESOURCES</p><h1>{editId ? 'Edit Faculty' : 'Add Faculty'}</h1><p>Faculty registration and employment record</p></div><button type="button" className="fm-button secondary" onClick={back}><FiArrowLeft /> Back</button></header><FacultyForm key={location.key} initial={selected || { employeeId: nextId, employmentType: 'Permanent', employmentStatus: 'Working', employeeCategory: 'Teaching' }} faculty={faculty} onSave={save} onCancel={back} /></>
  } else if (selected) {
    const load = workload(selected)
    content = <><header className="fm-panel fm-profile-header"><div className="fm-identity"><Avatar faculty={selected} large /><div><p className="fm-eyebrow">FACULTY PROFILE · {selected.employeeId}</p><h1>{selected.fullName}</h1><p>{selected.designation} · {selected.department}</p><StatusBadge value={selected.employmentStatus} /></div></div><div className="fm-actions"><button type="button" className="fm-button secondary" onClick={() => navigate('/faculty/' + selected.id + '/edit')}><FiEdit2 /> Edit</button><button type="button" className="fm-button" onClick={() => setAssignmentId(selected.id)}><FiBriefcase /> Academic Assignment</button><button type="button" className="fm-button secondary" onClick={back}><FiArrowLeft /> Back</button></div></header><div className="faculty-summary">{[['Total Experience', years(selected.experience)], ['Employment Type', selected.employmentType], ['Qualification', selected.qualification], ['Assigned Subjects', load.subjects + ' Subjects'], ['Weekly Workload', load.hours + ' Hrs / Week']].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value || '—'}</strong></div>)}</div><ProfileSections data={selected} /><section className="fm-panel"><div className="fm-section-bar"><h2><FiBriefcase /> Current Academic Responsibilities</h2><span className="fm-load-status">{load.status}</span></div>{selected.assignments?.length ? <AssignmentList faculty={selected} /> : <EmptyState title="No academic responsibilities assigned." action="Assign Academic Work" onAction={() => setAssignmentId(selected.id)} />}</section></>
  } else {
    const summary = [[FiUsers, 'Total Faculty', faculty.length], [FiCheckCircle, 'Working', faculty.filter(row => row.employmentStatus === 'Working').length], [FiClock, 'On Leave', faculty.filter(row => row.employmentStatus === 'On Leave').length], [FiBriefcase, 'Permanent', faculty.filter(row => row.employmentType === 'Permanent').length], [FiBookOpen, 'Academic Load', faculty.filter(row => row.assignments?.length).length + ' / ' + faculty.length]]
    content = <><header className="faculty-page-header"><div><p className="fm-eyebrow">ACADEMIC RESOURCES</p><h1>Faculty Management</h1><p>Manage faculty profiles, employment records, academic responsibilities and workload.</p></div><div className="fm-actions">{directoryActions}</div></header><div className="faculty-summary">{summary.map(([Icon, label, value]) => <div key={label}><Icon aria-hidden="true" /><span><small>{label}</small><strong>{value}</strong>{label === 'Academic Load' && <small>Assigned / Total</small>}</span></div>)}</div><section className="faculty-directory"><header className="fm-section-bar"><div><p className="fm-eyebrow">FACULTY DIRECTORY</p><p className="fm-muted">{filtered.length} faculty records</p></div><div className="fm-actions">{directoryActions}</div></header><FilterPanel active={active} onClear={clear}><div className="faculty-filters"><label className="faculty-search"><FiSearch /><input aria-label="Search faculty" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="Search faculty by name, employee ID, email or mobile" /></label>{[['department', 'Department', departments], ['designation', 'Designation', designations], ['employmentType', 'Employment Type', employmentTypes], ['employmentStatus', 'Employment Status', statuses]].map(([key, label, options]) => <SearchableSelect key={key} label={label} value={filters[key]} options={options} placeholder={label} onChange={value => { setFilters(old => ({ ...old, [key]: value })); setPage(1) }} />)}</div></FilterPanel>{filtered.length ? <><div className="faculty-table-wrap"><table><caption className="fm-sr-only">Faculty directory and academic workload</caption><thead><tr>{['Employee', 'Faculty', 'Department', 'Designation', 'Experience', 'Employment', 'Workload', 'Status', 'Actions'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(item => { const load = workload(item); return <tr key={item.id}><td><span className="fm-employee-id">{item.employeeId}</span></td><td><div className="fm-identity"><Avatar faculty={item} /><div><strong>{item.fullName}</strong><small>{item.email}</small></div></div></td><td className="fm-department">{item.department}</td><td>{item.designation}</td><td>{years(item.experience)}</td><td>{item.employmentType}</td><td><strong>{item.assignments?.length ? load.subjects + ' Subjects' : 'Not Assigned'}</strong><small>{load.hours} Hrs / Week · {load.status}</small></td><td><StatusBadge value={item.employmentStatus} /></td><td><div className="fm-actions">{[[FiEye, 'View faculty', () => navigate('/faculty/' + item.id)], [FiEdit2, 'Edit faculty', () => navigate('/faculty/' + item.id + '/edit')], [FiBriefcase, 'Academic Assignment', () => setAssignmentId(item.id)]].map(([Icon, label, action]) => <button type="button" className="fm-icon-button" title={label} aria-label={label + ': ' + item.fullName} key={label} onClick={action}><Icon /></button>)}</div></td></tr> })}</tbody></table></div><TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} /></> : <EmptyState title={faculty.length ? 'No faculty found' : 'No faculty records available'} description={faculty.length ? 'Try changing your search or filters.' : 'Add faculty members to start managing academic resources.'} action={faculty.length ? 'Clear Filters' : 'Add Faculty'} onAction={faculty.length ? clear : addFaculty} />}</section></>
  }
  return <DashboardLayout><main className="faculty-management">{content}{assignedFaculty && <AssignmentDialog key={assignedFaculty.id} faculty={assignedFaculty} toast={toast} onClose={() => setAssignmentId(null)} onAdd={item => changeAssignments(rows => [...rows, item], 'Academic assignment added')} onRemove={id => changeAssignments(rows => rows.filter(row => row.id !== id), 'Assignment removed')} />}<div className={'fm-toast ' + (toast && !assignedFaculty ? 'visible' : '')} role="status" aria-live="polite">{toast && !assignedFaculty && <><FiCheckCircle />{toast}</>}</div></main></DashboardLayout>
}
