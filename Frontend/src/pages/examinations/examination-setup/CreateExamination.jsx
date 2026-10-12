import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { useAcademic } from '../../../context/AcademicContext'
import './ExaminationSetup.css'

const tabs = [['Examination List', '/examination-setup/examination-list'], ['Create Examination', '/examination-setup/create-examination'], ['Exam Type', '/examination-setup/exam-type'], ['Exam Schedule', '/examination-setup/exam-schedule'], ['Exam Rules', '/examination-setup/exam-rules']]
const key = 'cms-examination-setup-demo-v1'
const blank = { name: '', academicYear: '', course: '', branch: '', examCategory: '', examType: '', term: '', startDate: '', endDate: '', description: '', status: 'Draft' }
const recordId = record => String(record?.id ?? record?.courseId ?? record?.branchId ?? '')
const courseLabel = record => record?.courseName || record?.name || record?.course || record?.title || ''
const branchLabel = record => record?.branchName || record?.name || record?.branch || record?.title || ''
const load = () => { try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} } }

export default function CreateExamination() {
  const location = useLocation()
  const navigate = useNavigate()
  const { courses, branches } = useAcademic()
  const existing = location.state?.exam
  const [form, setForm] = useState(() => ({ ...blank, ...(existing || {}) }))
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)
  useEffect(() => { setForm({ ...blank, ...(location.state?.exam || {}) }); setErrors({}); setSaved(false) }, [location.state])
  const change = (name, value) => { setForm(current => ({ ...current, [name]: value })); setErrors(current => ({ ...current, [name]: '' })); setSaved(false) }
  const selectedCourseId = form.courseId || recordId(courses.find(item => courseLabel(item) === form.course))
  const availableBranches = branches.filter(item => !item.courseId || String(item.courseId) === String(selectedCourseId))
  const changeCourse = courseId => { const course = courses.find(item => recordId(item) === String(courseId)); setForm(current => ({ ...current, courseId, course: courseLabel(course), branchId: '', branch: '' })); setSaved(false) }
  const changeBranch = branchId => { const branch = branches.find(item => recordId(item) === String(branchId)); setForm(current => ({ ...current, branchId, branch: branchLabel(branch) })); setSaved(false) }
  const submit = event => {
    event.preventDefault()
    const next = Object.fromEntries(['name', 'academicYear', 'examCategory', 'examType', 'term', 'startDate', 'endDate'].filter(name => !String(form[name] || '').trim()).map(name => [name, 'This field is required.']))
    if (form.startDate && form.endDate && form.endDate < form.startDate) next.endDate = 'End date must be on or after the start date.'
    setErrors(next)
    if (Object.keys(next).length) return
    const data = load()
    const row = { ...form, id: existing?.id || `ex-${Date.now()}` }
    const examinations = data.examinations || []
    data.examinations = existing ? examinations.map(item => item.id === existing.id ? row : item) : [row, ...examinations]
    try { localStorage.setItem(key, JSON.stringify(data)); setSaved(true) } catch { setSaved(false) }
  }

  return <DashboardLayout><main className="examination-setup">
    <header className="examination-setup__header"><div><h1>Examination Setup</h1><p>Create and manage examination cycles.</p></div></header>
    <section className="examination-setup__card"><header className="examination-setup__card-header"><div><p>CREATE EXAMINATION</p><h2>Enter examination details and academic period.</h2></div></header>
      <nav className="examination-setup__tabs" aria-label="Examination setup sections">{tabs.filter(([, path]) => path !== '/examination-setup/create-examination' && path !== '/examination-setup/exam-type' && path !== '/examination-setup/exam-schedule' && path !== '/examination-setup/exam-rules').map(([label, path]) => <Link key={path} to={path} className={path === location.pathname ? 'active' : ''}>{label}</Link>)}</nav>
      <div className="examination-setup__form-wrap"><form className="examination-setup__form" onSubmit={submit} noValidate>
        <label><span>Examination Name <b>*</b></span><input value={form.name} aria-invalid={Boolean(errors.name)} onChange={event => change('name', event.target.value)} />{errors.name && <small className="examination-setup__field-error">{errors.name}</small>}</label>
        <label><span>Academic Year <b>*</b></span><select value={form.academicYear} aria-invalid={Boolean(errors.academicYear)} onChange={event => change('academicYear', event.target.value)}><option value="">Select academic year</option>{['2025-26', '2026-27', '2027-28'].map(year => <option key={year}>{year}</option>)}</select>{errors.academicYear && <small className="examination-setup__field-error">{errors.academicYear}</small>}</label>
        <label><span>Course</span><select value={selectedCourseId} onChange={event => changeCourse(event.target.value)}><option value="">Select course</option>{courses.map(course => <option key={recordId(course)} value={recordId(course)}>{courseLabel(course)}</option>)}</select></label>
        <label><span>Branch</span><select value={form.branchId || recordId(branches.find(item => branchLabel(item) === form.branch))} onChange={event => changeBranch(event.target.value)} disabled={!selectedCourseId}><option value="">{selectedCourseId ? 'Select branch' : 'Select course first'}</option>{availableBranches.map(branch => <option key={recordId(branch)} value={recordId(branch)}>{branchLabel(branch)}</option>)}</select></label>
        <label><span>Exam Category <b>*</b></span><select value={form.examCategory || ''} aria-invalid={Boolean(errors.examCategory)} onChange={event => change('examCategory', event.target.value)}><option value="">Select exam category</option><option>Regular</option><option>Supplementary</option></select>{errors.examCategory && <small className="examination-setup__field-error">{errors.examCategory}</small>}</label>
        <label><span>Exam Type <b>*</b></span><select value={form.examType} aria-invalid={Boolean(errors.examType)} onChange={event => change('examType', event.target.value)}><option value="">Select exam type</option>{[...(load().types || [{ id: 'type-mid', name: 'Mid Semester' }, { id: 'type-end', name: 'End Semester' }, { id: 'type-practical', name: 'Practical' }]), ...(load().examinations || []).filter(exam => exam.examType).map(exam => ({ id: `previous-${exam.examType}`, name: exam.examType }))].filter((type, index, all) => type.name && all.findIndex(item => item.name === type.name) === index).map(type => <option key={type.id || type.name}>{type.name}</option>)}</select>{errors.examType && <small className="examination-setup__field-error">{errors.examType}</small>}</label>
        <label><span>Semester / Term <b>*</b></span><select value={form.term} aria-invalid={Boolean(errors.term)} onChange={event => change('term', event.target.value)}><option value="">Select semester / term</option>{['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8', 'Annual'].map(term => <option key={term}>{term}</option>)}</select>{errors.term && <small className="examination-setup__field-error">{errors.term}</small>}</label>
        <label><span>Start Date <b>*</b></span><input type="date" value={form.startDate} aria-invalid={Boolean(errors.startDate)} onChange={event => change('startDate', event.target.value)} />{errors.startDate && <small className="examination-setup__field-error">{errors.startDate}</small>}</label>
        <label><span>End Date <b>*</b></span><input type="date" value={form.endDate} aria-invalid={Boolean(errors.endDate)} onChange={event => change('endDate', event.target.value)} />{errors.endDate && <small className="examination-setup__field-error">{errors.endDate}</small>}</label>
        <label><span>Status</span><select value={form.status} onChange={event => change('status', event.target.value)}><option>Draft</option><option>Scheduled</option><option>Completed</option><option>Cancelled</option></select></label>
        {saved && <p className="examination-setup__success" role="status">Examination saved successfully.</p>}
        <footer><button type="button" className="examination-setup__secondary" onClick={() => navigate('/examination-setup/examination-list')}>Cancel</button><button className="examination-setup__primary" type="submit">{existing ? 'Save Changes' : 'Save Examination'}</button></footer>
      </form></div>
    </section>
  </main></DashboardLayout>
}




