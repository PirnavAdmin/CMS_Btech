import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import { courseApi, departments } from './courseData'
import './CourseModule.css'

const emptyCourse = { code: '', name: '', shortName: '', type: 'Undergraduate', department: '', durationValue: 4, durationUnit: 'Years', semesters: 8, academicSystem: 'Semester', qualification: '', description: '', eligibility: '', status: 'Active' }
const requiredLabel = (text) => <span>{text} <span className="cm-required" aria-hidden="true">*</span></span>

export default function CourseFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [value, setValue] = useState(emptyCourse)
  const [initial, setInitial] = useState(emptyCourse)
  const [courses, setCourses] = useState([])
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { courseApi.getCourses().then((rows) => { setCourses(rows); if (id) { const row = rows.find((course) => course.id === id); if (row) { setValue(row); setInitial(row) } } }) }, [id])

  const validateField = (name, course = value) => {
    const text = String(course[name] ?? '').trim()
    if (name === 'code') {
      if (!text) return 'Course code is required.'
      if (!/^[A-Z][A-Z0-9-]{1,11}$/.test(text)) return 'Use 2–12 uppercase letters, numbers, or hyphens.'
      if (courses.some((row) => row.id !== id && row.code.toLowerCase() === text.toLowerCase())) return 'This course code already exists.'
    }
    if (name === 'name') {
      if (!text) return 'Course name is required.'
      if (text.length < 3) return 'Course name must contain at least 3 characters.'
      if (!/^[A-Za-z][A-Za-z0-9 .&(),'-]+$/.test(text)) return 'Enter a valid academic course name.'
    }
    if (name === 'type' && !text) return 'Course type is required.'
    if (name === 'department' && !text) return 'Department / School is required.'
    if (name === 'durationValue' && (!Number.isInteger(+course.durationValue) || +course.durationValue < 1 || +course.durationValue > 10)) return 'Duration must be a whole number from 1 to 10.'
    if (name === 'semesters' && (!Number.isInteger(+course.semesters) || +course.semesters < 1 || +course.semesters > 20)) return 'Total semesters must be between 1 and 20.'
    if (name === 'academicSystem' && !text) return 'Academic system is required.'
    if (name === 'qualification' && (!text || text.length < 3)) return text ? 'Enter the complete qualification name.' : 'Degree / Qualification is required.'
    if (name === 'status' && !text) return 'Status is required.'
    return ''
  }
  const requiredFields = ['code', 'name', 'type', 'department', 'durationValue', 'semesters', 'academicSystem', 'qualification', 'status']
  const validateAll = () => Object.fromEntries(requiredFields.map((name) => [name, validateField(name)]).filter(([, message]) => message))
  const update = ({ target: { name, value: inputValue } }) => {
    const clean = name === 'code' ? inputValue.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12) : inputValue
    const next = { ...value, [name]: clean }
    setValue(next)
    if (touched[name]) setErrors((current) => ({ ...current, [name]: validateField(name, next) }))
  }
  const blur = ({ target: { name } }) => { setTouched((current) => ({ ...current, [name]: true })); setErrors((current) => ({ ...current, [name]: validateField(name) })) }
  const props = (name) => ({ name, value: value[name], onChange: update, onBlur: blur, 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `${name}-error` : undefined })
  const error = (name) => errors[name] && <span id={`${name}-error`} className="cm-error" role="alert">{errors[name]}</span>
  const reset = () => { setValue(id ? initial : emptyCourse); setErrors({}); setTouched({}) }
  const save = async (addBranch = false) => {
    const nextErrors = validateAll()
    setTouched(Object.fromEntries(requiredFields.map((name) => [name, true])))
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setSaving(true)
    const saved = await courseApi.saveCourse({ ...value, code: value.code.trim(), name: value.name.trim(), durationValue: +value.durationValue, semesters: +value.semesters })
    navigate(addBranch ? `/branches/add?course=${saved.id}` : '/courses')
  }

  return <DashboardLayout><div className="cm-page">
    <header className="cm-header"><div><h1>{id ? 'Edit Course' : 'Add Course'}</h1><p>{id ? 'Update the selected academic course.' : 'Create an academic course and configure its branches.'}</p><p className="cm-required-note"><span className="cm-required">*</span> Required fields</p></div></header>
    <section className="cm-panel"><div className="cm-form-grid">
      <label className="cm-field">{requiredLabel('Course Code')}<input {...props('code')} required maxLength="12" placeholder="BTECH" autoComplete="off" />{error('code')}</label>
      <label className="cm-field">{requiredLabel('Course Name')}<input {...props('name')} required maxLength="100" placeholder="Bachelor of Technology" />{error('name')}</label>
      <label className="cm-field"><span>Short Name</span><input {...props('shortName')} maxLength="20" placeholder="B.Tech" /></label>
      <label className="cm-field">{requiredLabel('Degree / Qualification')}<input {...props('qualification')} required maxLength="100" placeholder="Bachelor of Technology" />{error('qualification')}</label>
      <label className="cm-field">{requiredLabel('Course Type')}<select {...props('type')} required>{['Undergraduate', 'Postgraduate', 'Diploma', 'Integrated', 'Certificate', 'Other'].map((item) => <option key={item}>{item}</option>)}</select>{error('type')}</label>
      <label className="cm-field">{requiredLabel('Department / School')}<select {...props('department')} required><option value="">Select department</option>{departments.map((item) => <option key={item}>{item}</option>)}</select>{error('department')}</label>
      <label className="cm-field">{requiredLabel('Duration')}<input {...props('durationValue')} required type="number" min="1" max="10" step="1" />{error('durationValue')}</label>
      <label className="cm-field">{requiredLabel('Duration Unit')}<select {...props('durationUnit')} required><option>Years</option><option>Months</option></select></label>
      <label className="cm-field">{requiredLabel('Total Semesters')}<input {...props('semesters')} required type="number" min="1" max="20" step="1" />{error('semesters')}</label>
      <label className="cm-field">{requiredLabel('Academic System')}<select {...props('academicSystem')} required><option>Semester</option><option>Annual</option><option>Trimester</option></select>{error('academicSystem')}</label>
      <label className="cm-field">{requiredLabel('Status')}<select {...props('status')} required><option>Active</option><option>Inactive</option></select>{error('status')}</label>
      <label className="cm-field wide"><span>Description</span><textarea {...props('description')} maxLength="1000" placeholder="Describe the course objectives and scope." /></label>
      <label className="cm-field wide"><span>Eligibility</span><textarea {...props('eligibility')} maxLength="500" placeholder="10+2 with Physics, Chemistry and Mathematics" /></label>
    </div><div className="cm-actions">
      <button type="button" className="cm-button secondary" onClick={() => navigate('/courses')}>Cancel</button>
      <button type="button" className="cm-button secondary" onClick={reset}>{id ? 'Reset Changes' : 'Reset'}</button>
      <button type="button" className="cm-button" disabled={saving} onClick={() => save(false)}>{saving ? 'Saving…' : id ? 'Update Course' : 'Save Course'}</button>
      {!id && <button type="button" className="cm-button" disabled={saving} onClick={() => save(true)}>Save & Add Branch</button>}
    </div></section>
  </div></DashboardLayout>
}
