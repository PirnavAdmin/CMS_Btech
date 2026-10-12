import * as mergeDependency4 from "react-icons/fi";
import { ExportMenuModule as mergeDependency5 } from "../../../components/components.jsx";
import { AcademicContextModule as mergeDependency6 } from "../../../components/components.jsx";
import * as mergeDependency3 from "react-icons/fi";
import { AcademicContextModule as mergeDependency2 } from "../../../components/components.jsx";
// Pages and helpers in this module retain their own isolated scopes.
import * as external0 from "react";
import * as external1 from "react-router-dom";
import * as external3 from "react-icons/fi";
import { ModuleAvailabilityModule, DashboardLayoutModule } from "../../../components/components.jsx";

export const ExaminationSetupModule = (() => {
const { FiChevronDown: FiChevronDown } = mergeDependency4;
const { FiChevronUp: FiChevronUp } = mergeDependency4;
const { default: ExportMenu } = mergeDependency5;
const { useAcademic: useAcademic } = mergeDependency6;
const { default: ModuleAvailability } = ModuleAvailabilityModule;
const { useEffect } = external0;
const { useMemo } = external0;
const { useState } = external0;
const { Link } = external1;
const { useLocation } = external1;
const { useNavigate } = external1;
const { FiEdit2 } = external3;
const { FiFilter } = external3;
const { FiPlus } = external3;
const { FiPower } = external3;
const { FiSearch } = external3;
const { FiTrash2 } = external3;
const { default: DashboardLayout } = DashboardLayoutModule;
/* Imports for isolated regression tests:
import ModuleAvailability from '../../../components/ModuleAvailability'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiEdit2, FiFilter, FiPlus, FiPower, FiSearch, FiTrash2 } from 'react-icons/fi'
import DashboardLayout from '../../../layouts/DashboardLayout'
import './ExaminationSetup.css'
*/
// #region pages/examinations/examination-setup/ExaminationSetup.jsx
const tabs = [['Examination List', '/examination-setup/examination-list'], ['Create Examination', '/examination-setup/create-examination'], ['Exam Type', '/examination-setup/exam-type'], ['Exam Schedule', '/examination-setup/exam-schedule'], ['Exam Rules', '/examination-setup/exam-rules']]
const storageKey = 'cms-examination-setup-demo-v1'
const seeds = {
  examinations: [
    { id: 'ex-2026-mid', name: 'Mid Semester Examination', academicYear: '2026-27', examType: 'Mid Semester', term: 'Semester 1', startDate: '2026-10-19', endDate: '2026-10-30', description: 'Mid semester assessment for Semester 1.', status: 'Scheduled' },
    { id: 'ex-2026-prac', name: 'Practical Assessment', academicYear: '2026-27', examType: 'Practical', term: 'Semester 1', startDate: '2026-11-02', endDate: '2026-11-07', description: 'Laboratory practical assessment.', status: 'Draft' },
    { id: 'ex-2025-end', name: 'End Semester Examination', academicYear: '2025-26', examType: 'End Semester', term: 'Semester 2', startDate: '2026-04-06', endDate: '2026-04-24', description: 'End semester examinations.', status: 'Completed' },
  ],
  types: [
    { id: 'type-mid', name: 'Mid Semester', code: 'MID', description: 'Mid term written assessment', status: 'Active' },
    { id: 'type-end', name: 'End Semester', code: 'END', description: 'End term examination', status: 'Active' },
    { id: 'type-practical', name: 'Practical', code: 'PRAC', description: 'Laboratory and practical assessment', status: 'Active' },
  ],
  schedules: [
    { id: 'sch-1', examination: 'Mid Semester Examination', subject: 'Data Structures', date: '2026-10-19', startTime: '09:30', endTime: '12:30', room: 'Exam Hall A', status: 'Scheduled' },
    { id: 'sch-2', examination: 'Mid Semester Examination', subject: 'Database Systems', date: '2026-10-21', startTime: '13:30', endTime: '16:30', room: 'Block B · 204', status: 'Scheduled' },
  ],
  rules: [
    { id: 'rule-1', name: 'Standard Written Exam', description: 'Standard rules for written examinations.', examType: 'End Semester', passingMarks: '40', attendance: '75', attempts: '3', status: 'Active' },
    { id: 'rule-2', name: 'Practical Assessment Rule', description: 'Practical assessment and viva requirements.', examType: 'Practical', passingMarks: '50', attendance: '80', attempts: '2', status: 'Active' },
  ],
}
const readData = () => { try { const value = JSON.parse(localStorage.getItem(storageKey)); return value ? { ...seeds, ...value } : seeds } catch { return seeds } }
const statusClass = status => String(status || '').toLowerCase().replace(/\s+/g, '-')
const dateText = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const initialForm = { name: '', academicYear: '', course: '', branch: '', examCategory: '', examType: '', term: '', startDate: '', endDate: '', description: '', status: 'Draft' }
const recordId = record => String(record?.id ?? record?.courseId ?? record?.branchId ?? '')
const courseLabel = record => record?.courseName || record?.name || record?.course || record?.title || ''
const branchLabel = record => record?.branchName || record?.name || record?.branch || record?.title || ''

function LocalExaminationSetup() {
  const { pathname, state: routeState } = useLocation()
  const navigate = useNavigate()
  const { courses, branches } = useAcademic()
  const activePath = tabs.some(([, path]) => path === pathname) ? pathname : tabs[0][1]
  const activeTab = tabs.find(([, path]) => path === activePath)?.[0]
  const [data, setData] = useState(readData)
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ status: '', year: '', course: '', branch: '', term: '', examination: '', examType: '' })
  const [form, setForm] = useState(initialForm)
  const [editing, setEditing] = useState(null)
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')

  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(data)) } catch { /* Demo data remains available for this session. */ } }, [data])
  useEffect(() => {
    setQuery(''); setShowFilters(false); setShowEntryForm(false)
    if (activePath === tabs[1][1] && routeState?.exam) { setEditing(routeState.exam.id); setForm({ ...initialForm, ...routeState.exam }); setErrors({}) }
    else if (activePath === tabs[1][1]) { setEditing(null); setForm(initialForm); setErrors({}); setMessage('') }
    if ([tabs[2][1], tabs[3][1], tabs[4][1]].includes(activePath)) { setEditing(null); setForm({}); setErrors({}); setMessage('') }
  }, [activePath, routeState])

  const change = (key, value) => { setForm(current => ({ ...current, [key]: value })); setErrors(current => ({ ...current, [key]: '' })); setMessage('') }
  const changeCourse = courseId => { const course = courses.find(item => recordId(item) === String(courseId)); setForm(current => ({ ...current, courseId, course: courseLabel(course), branchId: '', branch: '' })); setErrors(current => ({ ...current, course: '', branch: '' })); setMessage('') }
  const changeBranch = branchId => { const branch = branches.find(item => recordId(item) === String(branchId)); setForm(current => ({ ...current, branchId, branch: branchLabel(branch) })); setErrors(current => ({ ...current, branch: '' })); setMessage('') }
  const save = (event, collection, required, kind) => {
    event.preventDefault()
    const next = Object.fromEntries(required.filter(key => !String(form[key] || '').trim()).map(key => [key, 'This field is required.']))
    if (kind === 'examination' && form.startDate && form.endDate && form.endDate < form.startDate) next.endDate = 'End date must be on or after the start date.'
    if (kind === 'schedule' && form.startTime && form.endTime && form.endTime <= form.startTime) next.endTime = 'End time must be later than start time.'
    if (kind === 'rule' && form.passingMarks && Number(form.passingMarks) < 0) next.passingMarks = 'Enter a non-negative value.'
    if (kind === 'rule' && form.attendance && (Number(form.attendance) < 0 || Number(form.attendance) > 100)) next.attendance = 'Enter a percentage from 0 to 100.'
    if (kind === 'rule' && form.attempts && Number(form.attempts) < 1) next.attempts = 'At least one attempt is required.'
    setErrors(next)
    if (Object.keys(next).length) return
    const item = { ...form, status: form.status || (kind === 'examination' ? 'Draft' : 'Active'), id: editing || `${kind}-${Date.now()}` }
    setData(current => ({ ...current, [collection]: editing ? current[collection].map(row => row.id === editing ? item : row) : [item, ...current[collection]] }))
    setMessage(`${kind === 'examination' ? 'Examination' : kind === 'type' ? 'Exam type' : kind === 'schedule' ? 'Schedule' : 'Rule'} ${editing ? 'updated' : 'added'} successfully.`)
    setForm(kind === 'examination' ? initialForm : {})
    setEditing(null)
    setShowEntryForm(false)
  }
  const editExam = exam => navigate('/examination-setup/create-examination', { state: { exam } })
  const remove = (collection, id) => setData(current => ({ ...current, [collection]: current[collection].filter(row => row.id !== id) }))
  const toggleStatus = (collection, id) => setData(current => ({ ...current, [collection]: current[collection].map(row => row.id === id ? { ...row, status: row.status === 'Inactive' ? 'Active' : 'Inactive' } : row) }))
  const types = [...new Map([...data.types.filter(row => row?.name), ...data.examinations.filter(row => row?.examType).map(row => ({ id: `historical-${row.examType}`, name: row.examType }))].map(row => [row.name, row])).values()]
  const selectedCourseId = form.courseId || recordId(courses.find(item => courseLabel(item) === form.course))
  const availableBranches = branches.filter(item => !item.courseId || String(item.courseId) === String(selectedCourseId))
  const years = [...new Set(data.examinations.map(row => row.academicYear))]
  const examOptions = field => [...new Set(data.examinations.map(row => row[field] || row[`${field}Name`]).filter(Boolean))]
  const filteredExams = useMemo(() => data.examinations.filter(row => `${row.name} ${row.academicYear} ${row.course} ${row.courseName} ${row.branch} ${row.branchName} ${row.examCategory} ${row.examType} ${row.term}`.toLowerCase().includes(query.toLowerCase()) && (!filters.status || row.status === filters.status) && (!filters.year || row.academicYear === filters.year) && (!filters.course || (row.course || row.courseName) === filters.course) && (!filters.branch || (row.branch || row.branchName) === filters.branch) && (!filters.term || row.term === filters.term) && (!filters.examType || (['Regular', 'Supply'].includes(filters.examType) ? row.examCategory === filters.examType || (filters.examType === 'Supply' && row.examCategory === 'Supplementary') : row.examType === filters.examType))), [data.examinations, query, filters])
  const examinationColumns = [{ label: 'Examination Name', value: row => row.name }, { label: 'Academic Year', value: row => row.academicYear }, { label: 'Course', value: row => row.course || row.courseName }, { label: 'Branch', value: row => row.branch || row.branchName }, { label: 'Exam Category', value: row => row.examCategory }, { label: 'Semester / Term', value: row => row.term }, { label: 'Start Date', value: row => row.startDate }, { label: 'End Date', value: row => row.endDate }, { label: 'Status', value: row => row.status }]
  const filteredTypes = data.types.filter(row => `${row.name} ${row.code} ${row.description}`.toLowerCase().includes(query.toLowerCase()))
  const filteredSchedules = data.schedules.filter(row => `${row.examination} ${row.subject} ${row.room}`.toLowerCase().includes(query.toLowerCase()) && (!filters.status || row.status === filters.status) && (!filters.examination || row.examination === filters.examination))
  const filteredRules = data.rules.filter(row => `${row.name} ${row.description} ${row.examType}`.toLowerCase().includes(query.toLowerCase()) && (!filters.status || row.status === filters.status) && (!filters.examType || row.examType === filters.examType))
  const collectionInfo = activePath === tabs[2][1] ? { name: 'types', title: 'Exam Type', fields: [['name', 'Exam Type Name', 'text'], ['code', 'Type Code', 'text'], ['description', 'Description', 'textarea'], ['status', 'Status', 'status']], required: ['name', 'code'], kind: 'type' }
    : activePath === tabs[3][1] ? { name: 'schedules', title: 'Exam Schedule', fields: [['examination', 'Examination', 'select-exam'], ['subject', 'Subject', 'text'], ['date', 'Date', 'date'], ['startTime', 'Start Time', 'time'], ['endTime', 'End Time', 'time'], ['room', 'Room / Hall', 'text'], ['status', 'Status', 'status']], required: ['examination', 'subject', 'date', 'startTime', 'endTime', 'room'], kind: 'schedule' }
      : { name: 'rules', title: 'Exam Rules', fields: [['name', 'Rule Name', 'text'], ['description', 'Description', 'textarea'], ['examType', 'Exam Type', 'select-type'], ['passingMarks', 'Passing Marks', 'number'], ['attendance', 'Minimum Attendance (%)', 'number'], ['attempts', 'Attempts', 'number'], ['status', 'Status', 'status']], required: ['name', 'description', 'examType', 'passingMarks', 'attendance', 'attempts'], kind: 'rule' }

  const field = ([key, label, type]) => <label className={type === 'textarea' ? 'wide' : ''} key={key}><span>{label}{collectionInfo.required.includes(key) && <b> *</b>}</span>{type === 'textarea' ? <textarea rows="3" value={form[key] || ''} aria-invalid={Boolean(errors[key])} onChange={event => change(key, event.target.value)} /> : type === 'status' ? <select value={form[key] || 'Active'} onChange={event => change(key, event.target.value)}><option>Active</option><option>Inactive</option></select> : type === 'select-exam' ? <select value={form[key] || ''} onChange={event => change(key, event.target.value)}><option value="">Select examination</option>{data.examinations.map(row => <option key={row.id}>{row.name}</option>)}</select> : type === 'select-type' ? <select value={form[key] || ''} onChange={event => change(key, event.target.value)}><option value="">Select exam type</option>{data.types.map(row => <option key={row.id}>{row.name}</option>)}</select> : <input type={type} min={type === 'number' ? 0 : undefined} value={form[key] || ''} aria-invalid={Boolean(errors[key])} onChange={event => change(key, event.target.value)} />}{errors[key] && <small className="examination-setup__field-error">{errors[key]}</small>}</label>

  const actions = (row, collection) => <div className="examination-setup__actions"><button type="button" title="Edit" aria-label="Edit" onClick={() => { setForm({ ...row }); setEditing(row.id); setShowEntryForm(true); setMessage('') }}><FiEdit2 /></button><button type="button" title={row.status === 'Inactive' ? 'Activate' : 'Deactivate'} aria-label={row.status === 'Inactive' ? 'Activate' : 'Deactivate'} onClick={() => toggleStatus(collection, row.id)}><FiPower /></button><button type="button" title="Delete" aria-label="Delete" onClick={() => remove(collection, row.id)}><FiTrash2 /></button></div>

  return <DashboardLayout><main className="examination-setup">
    <header className="examination-setup__header"><div><h1>Examination Setup</h1><p>Configure examinations, types, schedules and rules.</p></div><div className="examination-setup__summary">{[['Examinations', data.examinations.length], ['Exam Types', data.types.length], ['Schedules', data.schedules.length]].map(([label, value]) => <div key={label}><strong>{value}</strong><small>{label}</small></div>)}</div></header>
    <section className="examination-setup__card">
      <header className="examination-setup__card-header"><div><p>{activeTab.toUpperCase()}</p><h2>{activeTab === 'Examination List' ? 'Search and manage examination cycles.' : activeTab === 'Create Examination' ? 'Enter examination details and academic period.' : `Manage ${activeTab.toLowerCase()} records.`}</h2></div>{activePath !== tabs[1][1] && activePath !== tabs[0][1] && <div className="examination-setup__header-actions"><button type="button" className="examination-setup__filter-button" aria-expanded={showFilters} onClick={() => setShowFilters(value => !value)}><FiFilter /> Filters</button><button type="button" className="examination-setup__primary" onClick={() => { setForm({}); setEditing(null); setShowEntryForm(true); setMessage('') }}><FiPlus /> Add {activeTab === 'Exam Type' ? 'Exam Type' : activeTab === 'Exam Schedule' ? 'Schedule' : 'Rule'}</button></div>}</header>
      <nav className="examination-setup__tabs" aria-label="Examination setup sections">{tabs.filter(([, path]) => path !== tabs[1][1] && path !== tabs[2][1] && path !== tabs[3][1] && path !== tabs[4][1]).map(([label, path]) => <Link key={path} to={path} className={activePath === path ? 'active' : ''} aria-current={activePath === path ? 'page' : undefined}>{label}</Link>)}</nav>

      {activePath === tabs[1][1] ? <div className="examination-setup__form-wrap"><form className="examination-setup__form" onSubmit={event => save(event, 'examinations', ['name', 'academicYear', 'examType', 'term', 'startDate', 'endDate'], 'examination')} noValidate>
        <label><span>Examination Name <b>*</b></span><input value={form.name} aria-invalid={Boolean(errors.name)} onChange={event => change('name', event.target.value)} />{errors.name && <small className="examination-setup__field-error">{errors.name}</small>}</label>
        <label><span>Academic Year <b>*</b></span><select value={form.academicYear} onChange={event => change('academicYear', event.target.value)}><option value="">Select academic year</option>{['2025-26', '2026-27', '2027-28'].map(year => <option key={year}>{year}</option>)}</select>{errors.academicYear && <small className="examination-setup__field-error">{errors.academicYear}</small>}</label>
        <label><span>Course</span><select value={selectedCourseId} onChange={event => changeCourse(event.target.value)}><option value="">Select course</option>{courses.map(course => <option key={recordId(course)} value={recordId(course)}>{courseLabel(course)}</option>)}</select></label>
        <label><span>Branch</span><select value={form.branchId || recordId(branches.find(item => branchLabel(item) === form.branch))} onChange={event => changeBranch(event.target.value)} disabled={!selectedCourseId}><option value="">{selectedCourseId ? 'Select branch' : 'Select course first'}</option>{availableBranches.map(branch => <option key={recordId(branch)} value={recordId(branch)}>{branchLabel(branch)}</option>)}</select></label>
        <label><span>Exam Category <b>*</b></span><select value={form.examCategory || ''} onChange={event => change('examCategory', event.target.value)}><option value="">Select exam category</option><option>Regular</option><option>Supplementary</option></select>{errors.examCategory && <small className="examination-setup__field-error">{errors.examCategory}</small>}</label>
        <label><span>Exam Type <b>*</b></span><select value={form.examType} onChange={event => change('examType', event.target.value)}><option value="">Select exam type</option>{types.map(row => <option key={row.id || row.name}>{row.name}</option>)}</select>{errors.examType && <small className="examination-setup__field-error">{errors.examType}</small>}</label>
        <label><span>Semester / Term <b>*</b></span><select value={form.term} onChange={event => change('term', event.target.value)}><option value="">Select semester / term</option>{['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8', 'Annual'].map(term => <option key={term}>{term}</option>)}</select>{errors.term && <small className="examination-setup__field-error">{errors.term}</small>}</label>
        <label><span>Start Date <b>*</b></span><input type="date" value={form.startDate} aria-invalid={Boolean(errors.startDate)} onChange={event => change('startDate', event.target.value)} />{errors.startDate && <small className="examination-setup__field-error">{errors.startDate}</small>}</label>
        <label><span>End Date <b>*</b></span><input type="date" value={form.endDate} aria-invalid={Boolean(errors.endDate)} onChange={event => change('endDate', event.target.value)} />{errors.endDate && <small className="examination-setup__field-error">{errors.endDate}</small>}</label>
        <label><span>Status</span><select value={form.status} onChange={event => change('status', event.target.value)}><option>Draft</option><option>Scheduled</option><option>Completed</option><option>Cancelled</option></select></label>
        <footer><button type="button" className="examination-setup__secondary" onClick={() => navigate('/examination-setup/examination-list')}>Cancel</button><button className="examination-setup__primary" type="submit">{editing ? 'Save Changes' : 'Save Examination'}</button></footer>
      </form></div> : <>
        <div className={`examination-setup__toolbar${activePath === tabs[0][1] ? ' examination-setup__toolbar--list' : ''}`}><label className="examination-setup__search"><FiSearch /><input aria-label={`Search ${activeTab.toLowerCase()}`} placeholder={activePath === tabs[0][1] ? 'Search examination, course or branch...' : `Search ${activeTab.toLowerCase()}...`} value={query} onChange={event => setQuery(event.target.value)} /></label>{activePath === tabs[0][1] && <div className="examination-setup__toolbar-actions"><button type="button" className="examination-setup__filter-button" aria-expanded={showFilters} onClick={() => setShowFilters(value => !value)}><FiFilter /> Filters {showFilters ? <FiChevronUp /> : <FiChevronDown />}</button><ExportMenu rows={filteredExams} columns={examinationColumns} title="Examination List" filename="examinations" scope="All matching examinations" allowEmpty /><button type="button" className="examination-setup__primary" onClick={() => { setForm(initialForm); setEditing(null); setErrors({}); setShowEntryForm(true); setMessage('') }}><FiPlus /> Create Examination</button></div>}</div>
        {showFilters && <div className={`examination-setup__filters${activePath === tabs[0][1] ? ' examination-setup__filters--list' : ''}`}>
          {activePath === tabs[0][1] && <><label>Academic Year<select value={filters.year} onChange={event => setFilters(current => ({ ...current, year: event.target.value }))}><option value="">All academic years</option>{years.map(year => <option key={year}>{year}</option>)}</select></label><label>Course<select value={filters.course} onChange={event => setFilters(current => ({ ...current, course: event.target.value, branch: '' }))}><option value="">All courses</option>{examOptions('course').map(value => <option key={value}>{value}</option>)}</select></label><label>Branch<select value={filters.branch} onChange={event => setFilters(current => ({ ...current, branch: event.target.value }))}><option value="">All branches</option>{examOptions('branch').map(value => <option key={value}>{value}</option>)}</select></label><label>Semester / Term<select value={filters.term} onChange={event => setFilters(current => ({ ...current, term: event.target.value }))}><option value="">All semesters</option>{examOptions('term').map(value => <option key={value}>{value}</option>)}</select></label><label>Exam Type<select value={filters.examType} onChange={event => setFilters(current => ({ ...current, examType: event.target.value }))}><option value="">All exam types</option>{examOptions('examType').filter(value => !['Regular', 'Supply'].includes(value)).map(value => <option key={value}>{value}</option>)}<option>Regular</option><option>Supply</option></select></label><label>Status<select value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}><option value="">All statuses</option>{['Draft', 'Scheduled', 'Completed', 'Cancelled'].map(value => <option key={value}>{value}</option>)}</select></label></>}
          {activePath === tabs[2][1] && <label>Status<select value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}><option value="">All Statuses</option><option>Active</option><option>Inactive</option></select></label>}
          {activePath === tabs[3][1] && <><label>Examination<select value={filters.examination} onChange={event => setFilters(current => ({ ...current, examination: event.target.value }))}><option value="">All Examinations</option>{data.examinations.map(row => <option key={row.id}>{row.name}</option>)}</select></label><label>Status<select value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}><option value="">All Statuses</option><option>Scheduled</option><option>Completed</option><option>Cancelled</option><option>Active</option><option>Inactive</option></select></label></>}
          {activePath === tabs[4][1] && <><label>Exam Type<select value={filters.examType} onChange={event => setFilters(current => ({ ...current, examType: event.target.value }))}><option value="">All Exam Types</option>{data.types.map(row => <option key={row.id}>{row.name}</option>)}</select></label><label>Status<select value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}><option value="">All Statuses</option><option>Active</option><option>Inactive</option></select></label></>}
          <button type="button" onClick={() => { setQuery(''); setFilters({ status: '', year: '', course: '', branch: '', term: '', examination: '', examType: '' }) }}>Clear Filters</button>
        </div>}
        {activePath === tabs[0][1] && <><p className="examination-setup__count">Showing {filteredExams.length} examination{filteredExams.length === 1 ? '' : 's'}</p><div className="examination-setup__table-wrap"><table><thead><tr><th>Examination Name</th><th>Academic Year</th><th>Course</th><th>Branch</th><th>Exam Category</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filteredExams.length ? filteredExams.map(row => <tr key={row.id}><td><strong>{row.name}</strong><small className="examination-setup__subtext">{row.term}</small></td><td>{row.academicYear}</td><td>{row.course || row.courseName || '—'}</td><td>{row.branch || row.branchName || '—'}</td><td>{row.examCategory || '—'}</td><td>{dateText(row.startDate)}</td><td>{dateText(row.endDate)}</td><td><span className={`examination-setup__status ${statusClass(row.status)}`}>{row.status}</span></td><td><div className="examination-setup__actions"><button title="Edit examination" aria-label="Edit examination" onClick={() => editExam(row)}><FiEdit2 /></button><button title="Delete examination" aria-label="Delete examination" onClick={() => remove('examinations', row.id)}><FiTrash2 /></button></div></td></tr>) : <tr><td colSpan="9" className="examination-setup__empty">No examinations match your search and filters.</td></tr>}</tbody></table></div></>}
        {activePath === tabs[2][1] && <DataTable headers={['Exam Type', 'Code', 'Description', 'Status', 'Actions']} rows={filteredTypes.filter(row => !filters.status || row.status === filters.status)} columns={['name', 'code', 'description']} actions={actions} collection="types" />}
        {activePath === tabs[3][1] && <DataTable headers={['Examination', 'Subject', 'Date', 'Start Time', 'End Time', 'Room / Hall', 'Status', 'Actions']} rows={filteredSchedules} columns={['examination', 'subject', 'date', 'startTime', 'endTime', 'room', 'status']} actions={actions} collection="schedules" />}
        {activePath === tabs[4][1] && <DataTable headers={['Rule Name', 'Description', 'Exam Type', 'Passing Marks', 'Min. Attendance', 'Attempts', 'Status', 'Actions']} rows={filteredRules} columns={['name', 'description', 'examType', 'passingMarks', 'attendance', 'attempts', 'status']} actions={actions} collection="rules" />}
        {activePath === tabs[0][1] && showEntryForm && <div className="examination-setup__modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) { setShowEntryForm(false); setErrors({}) } }}><section className="examination-setup__modal" role="dialog" aria-modal="true" aria-labelledby="examination-create-title"><header><div><h2 id="examination-create-title">Create Examination</h2><p>Enter examination details and academic period.</p></div><button type="button" aria-label="Close" onClick={() => { setShowEntryForm(false); setErrors({}) }}>×</button></header><form className="examination-setup__form" onSubmit={event => save(event, 'examinations', ['name', 'academicYear', 'examCategory', 'examType', 'term', 'startDate', 'endDate'], 'examination')} noValidate>
          <label><span>Examination Name <b>*</b></span><input value={form.name || ''} aria-invalid={Boolean(errors.name)} onChange={event => change('name', event.target.value)} />{errors.name && <small className="examination-setup__field-error">{errors.name}</small>}</label>
          <label><span>Academic Year <b>*</b></span><select value={form.academicYear || ''} onChange={event => change('academicYear', event.target.value)}><option value="">Select academic year</option>{['2025-26', '2026-27', '2027-28'].map(year => <option key={year}>{year}</option>)}</select>{errors.academicYear && <small className="examination-setup__field-error">{errors.academicYear}</small>}</label>
          <label><span>Course</span><select value={selectedCourseId} onChange={event => changeCourse(event.target.value)}><option value="">Select course</option>{courses.map(course => <option key={recordId(course)} value={recordId(course)}>{courseLabel(course)}</option>)}</select></label>
          <label><span>Branch</span><select value={form.branchId || recordId(branches.find(item => branchLabel(item) === form.branch))} onChange={event => changeBranch(event.target.value)} disabled={!selectedCourseId}><option value="">{selectedCourseId ? 'Select branch' : 'Select course first'}</option>{availableBranches.map(branch => <option key={recordId(branch)} value={recordId(branch)}>{branchLabel(branch)}</option>)}</select></label>
          <label><span>Exam Category <b>*</b></span><select value={form.examCategory || ''} onChange={event => change('examCategory', event.target.value)}><option value="">Select exam category</option><option>Regular</option><option>Supplementary</option></select>{errors.examCategory && <small className="examination-setup__field-error">{errors.examCategory}</small>}</label>
          <label><span>Exam Type <b>*</b></span><select value={form.examType || ''} onChange={event => change('examType', event.target.value)}><option value="">Select exam type</option>{types.map(row => <option key={row.id || row.name}>{row.name}</option>)}</select>{errors.examType && <small className="examination-setup__field-error">{errors.examType}</small>}</label>
          <label><span>Semester / Term <b>*</b></span><select value={form.term || ''} onChange={event => change('term', event.target.value)}><option value="">Select semester / term</option>{['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8', 'Annual'].map(term => <option key={term}>{term}</option>)}</select>{errors.term && <small className="examination-setup__field-error">{errors.term}</small>}</label>
          <label><span>Start Date <b>*</b></span><input type="date" value={form.startDate || ''} aria-invalid={Boolean(errors.startDate)} onChange={event => change('startDate', event.target.value)} />{errors.startDate && <small className="examination-setup__field-error">{errors.startDate}</small>}</label>
          <label><span>End Date <b>*</b></span><input type="date" value={form.endDate || ''} aria-invalid={Boolean(errors.endDate)} onChange={event => change('endDate', event.target.value)} />{errors.endDate && <small className="examination-setup__field-error">{errors.endDate}</small>}</label>
          <label><span>Status</span><select value={form.status || 'Draft'} onChange={event => change('status', event.target.value)}><option>Draft</option><option>Scheduled</option><option>Completed</option><option>Cancelled</option></select></label>
          <footer><button type="button" className="examination-setup__secondary" onClick={() => { setShowEntryForm(false); setErrors({}) }}>Cancel</button><button className="examination-setup__primary" type="submit">Create Examination</button></footer>
        </form></section></div>}
        {message && <p className="examination-setup__success" role="status">{message}</p>}
        {activePath !== tabs[0][1] && showEntryForm && <div className="examination-setup__inline-form"><h3>{editing ? `Edit ${collectionInfo.title}` : `Add ${collectionInfo.title}`}</h3><form className="examination-setup__form" onSubmit={event => save(event, collectionInfo.name, collectionInfo.required, collectionInfo.kind)} noValidate>{collectionInfo.fields.map(field)}<footer><button type="button" className="examination-setup__secondary" onClick={() => { setForm({}); setErrors({}); setEditing(null); setShowEntryForm(false) }}>Cancel</button><button className="examination-setup__primary" type="submit">{editing ? 'Save Changes' : `Add ${collectionInfo.title}`}</button></footer></form></div>}
      </>}
    </section>
  </main></DashboardLayout>
}

function DataTable({ headers, rows, columns, actions, collection }) {
  return <><p className="examination-setup__count">Showing {rows.length} record{rows.length === 1 ? '' : 's'}</p><div className="examination-setup__table-wrap"><table><thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map(row => <tr key={row.id}>{columns.map(key => <td key={key}>{key === 'date' ? dateText(row[key]) : key === 'status' ? <span className={`examination-setup__status ${statusClass(row[key])}`}>{row[key]}</span> : row[key] || '—'}</td>)}<td>{actions(row, collection)}</td></tr>) : <tr><td className="examination-setup__empty" colSpan={headers.length}>No records found.</td></tr>}</tbody></table></div></>
}

/* export default */ function ExaminationSetup(props) { return <ModuleAvailability title="Examination Management" dependency="Exam configuration, academic scope and lifecycle APIs are required before examinations can be created or published."><LocalExaminationSetup {...props} /></ModuleAvailability> }

// #endregion pages/examinations/examination-setup/ExaminationSetup.jsx
return {
  get default() { return ExaminationSetup; }
};
})();

export const ExaminationListModule = (() => {

/* Imports for isolated regression tests:

*/
// #region pages/examinations/examination-setup/ExaminationList.jsx
/* export { default } from './ExaminationSetup' */
// #endregion pages/examinations/examination-setup/ExaminationList.jsx
return {
  get default() { return ExaminationSetupModule.default; }
};
})();

export const CreateExaminationModule = (() => {
const { useAcademic: useAcademic } = mergeDependency2;
const { useEffect } = external0;
const { useState } = external0;
const { Link } = external1;
const { useLocation } = external1;
const { useNavigate } = external1;
const { default: DashboardLayout } = DashboardLayoutModule;
/* Imports for isolated regression tests:
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import './ExaminationSetup.css'
*/
// #region pages/examinations/examination-setup/CreateExamination.jsx
const tabs = [['Examination List', '/examination-setup/examination-list'], ['Create Examination', '/examination-setup/create-examination'], ['Exam Type', '/examination-setup/exam-type'], ['Exam Schedule', '/examination-setup/exam-schedule'], ['Exam Rules', '/examination-setup/exam-rules']]
const key = 'cms-examination-setup-demo-v1'
const blank = { name: '', academicYear: '', course: '', branch: '', examCategory: '', examType: '', term: '', startDate: '', endDate: '', description: '', status: 'Draft' }
const recordId = record => String(record?.id ?? record?.courseId ?? record?.branchId ?? '')
const courseLabel = record => record?.courseName || record?.name || record?.course || record?.title || ''
const branchLabel = record => record?.branchName || record?.name || record?.branch || record?.title || ''
const load = () => { try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} } }

/* export default */ function CreateExamination() {
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

// #endregion pages/examinations/examination-setup/CreateExamination.jsx
return {
  get default() { return CreateExamination; }
};
})();

export const ExamTypeModule = (() => {
const { useMemo } = external0;
const { useState } = external0;
const { Link } = external1;
const { useLocation } = external1;
const { FiEdit2 } = external3;
const { FiFilter } = external3;
const { FiPlus } = external3;
const { FiPower } = external3;
const { FiSearch } = external3;
const { FiTrash2 } = external3;
const { default: DashboardLayout } = DashboardLayoutModule;
/* Imports for isolated regression tests:
import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FiEdit2, FiFilter, FiPlus, FiPower, FiSearch, FiTrash2 } from 'react-icons/fi'
import DashboardLayout from '../../../layouts/DashboardLayout'
import './ExaminationSetup.css'
*/
// #region pages/examinations/examination-setup/ExamType.jsx
const tabs = [['Examination List', '/examination-setup/examination-list'], ['Create Examination', '/examination-setup/create-examination'], ['Exam Type', '/examination-setup/exam-type'], ['Exam Schedule', '/examination-setup/exam-schedule'], ['Exam Rules', '/examination-setup/exam-rules']]
const key = 'cms-examination-setup-demo-v1'
const seeds = [{ id: 'type-mid', name: 'Mid Semester', code: 'MID', description: 'Mid term written assessment', status: 'Active' }, { id: 'type-end', name: 'End Semester', code: 'END', description: 'End term examination', status: 'Active' }, { id: 'type-practical', name: 'Practical', code: 'PRAC', description: 'Laboratory and practical assessment', status: 'Active' }]
const load = () => { try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} } }

/* export default */ function ExamType() {
  const location = useLocation()
  const [rows, setRows] = useState(() => load().types || seeds)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', code: '', description: '', status: '' })
  const [error, setError] = useState('')
  const visible = useMemo(() => rows.filter(row => `${row.name} ${row.code} ${row.description}`.toLowerCase().includes(query.toLowerCase()) && (!status || row.status === status)), [rows, query, status])
  const persist = next => { setRows(next); try { localStorage.setItem(key, JSON.stringify({ ...load(), types: next })) } catch { /* Keep the edited rows for this session. */ } }
  const edit = row => { setForm({ ...row }); setEditing(row.id); setShowForm(true); setError('') }
  const save = event => { event.preventDefault(); if (!form.name.trim() || !form.code.trim() || !form.status) { setError('Complete the exam type name, type code, and status.'); return } const row = { ...form, name: form.name.trim(), code: form.code.trim().toUpperCase(), id: editing || `type-${Date.now()}` }; persist(editing ? rows.map(item => item.id === editing ? row : item) : [row, ...rows]); setShowForm(false); setEditing(null); setForm({ name: '', code: '', description: '', status: '' }); setError('') }
  const toggle = id => persist(rows.map(row => row.id === id ? { ...row, status: row.status === 'Active' ? 'Inactive' : 'Active' } : row))

  return <DashboardLayout><main className="examination-setup"><header className="examination-setup__header"><div><h1>Examination Setup</h1><p>Configure examination types used by examinations and schedules.</p></div></header><section className="examination-setup__card">
    <header className="examination-setup__card-header"><div><p>EXAM TYPE</p><h2>Search and manage examination types.</h2></div><div className="examination-setup__header-actions"><button type="button" className="erp-btn erp-btn--secondary examination-setup__filter-button" aria-expanded={showFilters} onClick={() => setShowFilters(value => !value)}><FiFilter /> Filters</button><button type="button" className="erp-btn erp-btn--primary examination-setup__primary" onClick={() => { setForm({ name: '', code: '', description: '', status: '' }); setEditing(null); setShowForm(true); setError('') }}><FiPlus /> Add Exam Type</button></div></header>
    <nav className="examination-setup__tabs" aria-label="Examination setup sections">{tabs.filter(([, path]) => path !== '/examination-setup/create-examination' && path !== '/examination-setup/exam-type' && path !== '/examination-setup/exam-schedule' && path !== '/examination-setup/exam-rules').map(([label, path]) => <Link key={path} to={path} className={path === location.pathname ? 'active' : ''}>{label}</Link>)}</nav>
    <div className="examination-setup__toolbar"><label className="examination-setup__search"><FiSearch /><input aria-label="Search exam types" placeholder="Search exam type or code..." value={query} onChange={event => setQuery(event.target.value)} /></label></div>
    {showFilters && <div className="examination-setup__filters"><label>Status<select value={status} onChange={event => setStatus(event.target.value)}><option value="">All Statuses</option><option>Active</option><option>Inactive</option></select></label><button type="button" onClick={() => { setStatus(''); setQuery('') }}>Clear Filters</button></div>}
    <p className="examination-setup__count">Showing {visible.length} exam type{visible.length === 1 ? '' : 's'}</p><div className="examination-setup__table-wrap"><table><thead><tr><th>Exam Type</th><th>Code</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.length ? visible.map(row => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.code}</td><td>{row.description || '—'}</td><td><span className={`examination-setup__status ${row.status.toLowerCase()}`}>{row.status}</span></td><td><div className="examination-setup__actions"><button type="button" title="Edit exam type" aria-label="Edit exam type" onClick={() => edit(row)}><FiEdit2 /></button><button type="button" title={row.status === 'Active' ? 'Deactivate' : 'Activate'} aria-label={row.status === 'Active' ? 'Deactivate' : 'Activate'} onClick={() => toggle(row.id)}><FiPower /></button><button type="button" title="Delete exam type" aria-label="Delete exam type" onClick={() => persist(rows.filter(item => item.id !== row.id))}><FiTrash2 /></button></div></td></tr>) : <tr><td colSpan="5" className="examination-setup__empty">No exam types match your search and filters.</td></tr>}</tbody></table></div>
    {showForm && <div className="examination-setup__modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) { setShowForm(false); setEditing(null); setError('') } }}><section className="examination-setup__modal" role="dialog" aria-modal="true" aria-labelledby="exam-type-modal-title"><header><div><h2 id="exam-type-modal-title">{editing ? 'Edit Exam Type' : 'Add Exam Type'}</h2><p>Enter the examination type details.</p></div><button type="button" aria-label="Close" onClick={() => { setShowForm(false); setEditing(null); setError('') }}>×</button></header><form className="examination-setup__form" onSubmit={save} noValidate><label><span>Exam Type Name <b>*</b></span><input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></label><label><span>Type Code <b>*</b></span><input value={form.code} onChange={event => setForm(current => ({ ...current, code: event.target.value }))} /></label><label className="wide"><span>Description</span><textarea rows="3" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} /></label><label><span>Status <b>*</b></span><select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))}><option value="">Select status</option><option>Active</option><option>Inactive</option></select></label>{error && <p className="examination-setup__error wide" role="alert">{error}</p>}<footer><button className="examination-setup__secondary" type="button" onClick={() => { setShowForm(false); setEditing(null); setError('') }}>Cancel</button><button className="examination-setup__primary" type="submit">{editing ? 'Save Changes' : 'Add Exam Type'}</button></footer></form></section></div>}
  </section></main></DashboardLayout>
}

// #endregion pages/examinations/examination-setup/ExamType.jsx
return {
  get default() { return ExamType; }
};
})();

export const ExamScheduleModule = (() => {
const { FiChevronDown: FiChevronDown } = mergeDependency3;
const { FiChevronUp: FiChevronUp } = mergeDependency3;
const { useEffect } = external0;
const { useMemo } = external0;
const { useRef } = external0;
const { useState } = external0;
const { Link } = external1;
const { useLocation } = external1;
const { FiEdit2 } = external3;
const { FiFilter } = external3;
const { FiPlus } = external3;
const { FiPower } = external3;
const { FiSearch } = external3;
const { FiTrash2 } = external3;
const { FiX } = external3;
const { default: DashboardLayout } = DashboardLayoutModule;
/* Imports for isolated regression tests:
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FiEdit2, FiFilter, FiPlus, FiPower, FiSearch, FiTrash2, FiX } from 'react-icons/fi'
import DashboardLayout from '../../../layouts/DashboardLayout'
import './ExaminationSetup.css'
*/
// #region pages/examinations/examination-setup/ExamSchedule.jsx
const tabs = [['Examination List', '/examination-setup/examination-list'], ['Create Examination', '/examination-setup/create-examination'], ['Exam Type', '/examination-setup/exam-type'], ['Exam Schedule', '/examination-setup/exam-schedule'], ['Exam Rules', '/examination-setup/exam-rules']]
const key = 'cms-examination-setup-demo-v1'
const seeds = [{ id: 'sch-1', examination: 'Mid Semester Examination', subject: 'Data Structures', date: '2026-10-19', startTime: '09:30', endTime: '12:30', room: 'Exam Hall A', status: 'Scheduled' }, { id: 'sch-2', examination: 'Mid Semester Examination', subject: 'Database Systems', date: '2026-10-21', startTime: '13:30', endTime: '16:30', room: 'Block B · 204', status: 'Scheduled' }]
const load = () => { try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} } }
const dateText = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

/* export default */ function ExamSchedule() {
  const location = useLocation()
  const [rows, setRows] = useState(() => load().schedules || seeds)
  const [exams] = useState(() => load().examinations || [{ id: 1, name: 'Mid Semester Examination' }, { id: 2, name: 'Practical Assessment' }, { id: 3, name: 'End Semester Examination' }])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [examFilter, setExamFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const formRef = useRef(null)
  const blank = { examination: '', subject: '', date: '', startTime: '', endTime: '', room: '', status: 'Scheduled' }
  const [form, setForm] = useState(blank)
  const visible = useMemo(() => rows.filter(row => `${row.examination} ${row.subject} ${row.room}`.toLowerCase().includes(query.toLowerCase()) && (!statusFilter || row.status === statusFilter) && (!examFilter || row.examination === examFilter)), [rows, query, statusFilter, examFilter])
  const persist = next => { setRows(next); try { localStorage.setItem(key, JSON.stringify({ ...load(), schedules: next })) } catch { /* Keep the edited rows for this session. */ } }
  const save = event => { event.preventDefault(); const required = ['examination', 'subject', 'date', 'startTime', 'endTime', 'room']; const missing = required.find(name => !String(form[name] || '').trim()); if (missing) { setError('Complete all required schedule fields.'); return } if (form.endTime <= form.startTime) { setError('End time must be later than start time.'); return } const row = { ...form, id: editing || `sch-${Date.now()}` }; persist(editing ? rows.map(item => item.id === editing ? row : item) : [row, ...rows]); setForm(blank); setEditing(null); setShowForm(false); setError('') }
  const edit = row => { setForm({ ...row }); setEditing(row.id); setShowForm(true); setError('') }
  const openAddForm = () => { setForm(blank); setEditing(null); setError(''); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditing(null); setError('') }
  useEffect(() => {
    if (!showForm) return undefined
    const onKeyDown = event => { if (event.key === 'Escape') closeForm() }
    window.addEventListener('keydown', onKeyDown)
    formRef.current?.focus()
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showForm])

  return <DashboardLayout><main className="examination-setup"><header className="examination-setup__header"><div><h1>Examination Setup</h1><p>Plan examination dates, sessions and venues.</p></div></header><section className="examination-setup__card">
    <header className="examination-setup__card-header"><div><p>EXAM SCHEDULE</p><h2>Search and manage examination schedules.</h2></div><div className="examination-setup__header-actions"><button type="button" className="examination-setup__primary" onClick={openAddForm}><FiPlus /> Add Schedule</button></div></header>
    <nav className="examination-setup__tabs" aria-label="Examination setup sections">{tabs.filter(([, path]) => path !== '/examination-setup/create-examination' && path !== '/examination-setup/exam-type' && path !== '/examination-setup/exam-schedule' && path !== '/examination-setup/exam-rules').map(([label, path]) => <Link key={path} to={path} className={path === location.pathname ? 'active' : ''}>{label}</Link>)}</nav>
    <div className="examination-setup__toolbar"><label className="examination-setup__search"><FiSearch /><input aria-label="Search schedules" placeholder="Search exam, subject or room..." value={query} onChange={event => setQuery(event.target.value)} /></label><button type="button" className="examination-setup__filter-button" aria-expanded={showFilters} onClick={() => setShowFilters(value => !value)}><FiFilter /> Filters {showFilters ? <FiChevronUp /> : <FiChevronDown />}</button></div>
    {showFilters && <div className="examination-setup__filters"><label>Examination<select value={examFilter} onChange={event => setExamFilter(event.target.value)}><option value="">All Examinations</option>{exams.map(row => <option key={row.id}>{row.name}</option>)}</select></label><label>Status<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">All Statuses</option><option>Scheduled</option><option>Completed</option><option>Cancelled</option></select></label><button type="button" onClick={() => { setQuery(''); setExamFilter(''); setStatusFilter('') }}>Clear Filters</button></div>}
    <p className="examination-setup__count">Showing {visible.length} schedule{visible.length === 1 ? '' : 's'}</p><div className="examination-setup__table-wrap"><table><thead><tr><th>Examination</th><th>Subject</th><th>Date</th><th>Start Time</th><th>End Time</th><th>Room / Hall</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.length ? visible.map(row => <tr key={row.id}><td>{row.examination}</td><td><strong>{row.subject}</strong></td><td>{dateText(row.date)}</td><td>{row.startTime}</td><td>{row.endTime}</td><td>{row.room}</td><td><span className={`examination-setup__status ${row.status.toLowerCase()}`}>{row.status}</span></td><td><div className="examination-setup__actions"><button type="button" aria-label="Edit schedule" title="Edit schedule" onClick={() => edit(row)}><FiEdit2 /></button><button type="button" aria-label="Toggle schedule status" title="Toggle status" onClick={() => persist(rows.map(item => item.id === row.id ? { ...item, status: item.status === 'Cancelled' ? 'Scheduled' : 'Cancelled' } : item))}><FiPower /></button><button type="button" aria-label="Delete schedule" title="Delete schedule" onClick={() => persist(rows.filter(item => item.id !== row.id))}><FiTrash2 /></button></div></td></tr>) : <tr><td colSpan="8" className="examination-setup__empty">No schedules match your search and filters.</td></tr>}</tbody></table></div>
    {showForm && <div className="examination-setup__modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeForm() }}><section className="examination-setup__modal" role="dialog" aria-modal="true" aria-labelledby="examination-setup-schedule-modal-title" tabIndex={-1} ref={formRef}><header><div><h2 id="examination-setup-schedule-modal-title">{editing ? 'Edit Schedule' : 'Add Schedule'}</h2><p>Enter examination session and venue details.</p></div><button type="button" aria-label="Close" onClick={closeForm}><FiX /></button></header><form className="examination-setup__form" onSubmit={save} noValidate><label><span>Examination <b>*</b></span><select value={form.examination} onChange={event => setForm(current => ({ ...current, examination: event.target.value }))}><option value="">Select examination</option>{exams.map(row => <option key={row.id}>{row.name}</option>)}</select></label><label><span>Subject <b>*</b></span><input value={form.subject} onChange={event => setForm(current => ({ ...current, subject: event.target.value }))} /></label><label><span>Date <b>*</b></span><input type="date" value={form.date} onChange={event => setForm(current => ({ ...current, date: event.target.value }))} /></label><label><span>Start Time <b>*</b></span><input type="time" value={form.startTime} onChange={event => setForm(current => ({ ...current, startTime: event.target.value }))} /></label><label><span>End Time <b>*</b></span><input type="time" value={form.endTime} onChange={event => setForm(current => ({ ...current, endTime: event.target.value }))} /></label><label><span>Room / Hall <b>*</b></span><input value={form.room} onChange={event => setForm(current => ({ ...current, room: event.target.value }))} /></label><label><span>Status</span><select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))}><option>Scheduled</option><option>Completed</option><option>Cancelled</option></select></label>{error && <p className="examination-setup__error wide" role="alert">{error}</p>}<footer><button type="button" className="examination-setup__secondary" onClick={closeForm}>Cancel</button><button type="submit" className="examination-setup__primary">{editing ? 'Save Changes' : 'Add Schedule'}</button></footer></form></section></div>}
  </section></main></DashboardLayout>
}

// #endregion pages/examinations/examination-setup/ExamSchedule.jsx
return {
  get default() { return ExamSchedule; }
};
})();

export const ExamRulesModule = (() => {
const { useMemo } = external0;
const { useState } = external0;
const { Link } = external1;
const { useLocation } = external1;
const { FiEdit2 } = external3;
const { FiFilter } = external3;
const { FiPlus } = external3;
const { FiPower } = external3;
const { FiSearch } = external3;
const { FiTrash2 } = external3;
const { default: DashboardLayout } = DashboardLayoutModule;
/* Imports for isolated regression tests:
import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FiEdit2, FiFilter, FiPlus, FiPower, FiSearch, FiTrash2 } from 'react-icons/fi'
import DashboardLayout from '../../../layouts/DashboardLayout'
import './ExaminationSetup.css'
*/
// #region pages/examinations/examination-setup/ExamRules.jsx
const tabs = [['Examination List', '/examination-setup/examination-list'], ['Create Examination', '/examination-setup/create-examination'], ['Exam Type', '/examination-setup/exam-type'], ['Exam Schedule', '/examination-setup/exam-schedule'], ['Exam Rules', '/examination-setup/exam-rules']]
const key = 'cms-examination-setup-demo-v1'
const seeds = [{ id: 'rule-1', name: 'Standard Written Exam', description: 'Standard rules for written examinations.', examType: 'End Semester', passingMarks: '40', attendance: '75', attempts: '3', status: 'Active' }, { id: 'rule-2', name: 'Practical Assessment Rule', description: 'Practical assessment and viva requirements.', examType: 'Practical', passingMarks: '50', attendance: '80', attempts: '2', status: 'Active' }]
const load = () => { try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} } }

/* export default */ function ExamRules() {
  const location = useLocation()
  const [rows, setRows] = useState(() => load().rules || seeds)
  const [types] = useState(() => load().types || [{ id: 'type-mid', name: 'Mid Semester' }, { id: 'type-end', name: 'End Semester' }, { id: 'type-practical', name: 'Practical' }])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const blank = { name: '', description: '', examType: '', passingMarks: '', attendance: '', attempts: '', status: '' }
  const [form, setForm] = useState(blank)
  const visible = useMemo(() => rows.filter(row => `${row.name} ${row.description} ${row.examType}`.toLowerCase().includes(query.toLowerCase()) && (!statusFilter || row.status === statusFilter) && (!typeFilter || row.examType === typeFilter)), [rows, query, statusFilter, typeFilter])
  const persist = next => { setRows(next); try { localStorage.setItem(key, JSON.stringify({ ...load(), rules: next })) } catch { /* Keep the edited rows for this session. */ } }
  const save = event => { event.preventDefault(); const missing = ['name', 'description', 'examType', 'passingMarks', 'attendance', 'attempts', 'status'].some(name => !String(form[name] || '').trim()); if (missing) { setError('Complete all required rule fields.'); return } if (Number(form.passingMarks) < 0 || Number(form.attendance) < 0 || Number(form.attendance) > 100 || Number(form.attempts) < 1) { setError('Enter valid marks, attendance (0–100), and at least one attempt.'); return } const row = { ...form, id: editing || `rule-${Date.now()}` }; persist(editing ? rows.map(item => item.id === editing ? row : item) : [row, ...rows]); setForm(blank); setShowForm(false); setEditing(null); setError('') }
  const edit = row => { setForm({ ...row }); setEditing(row.id); setShowForm(true); setError('') }

  return <DashboardLayout><main className="examination-setup"><header className="examination-setup__header"><div><h1>Examination Setup</h1><p>Define the assessment requirements and eligibility rules.</p></div></header><section className="examination-setup__card">
    <header className="examination-setup__card-header"><div><p>EXAM RULES</p><h2>Search and manage examination rules.</h2></div><div className="examination-setup__header-actions"><button type="button" className="examination-setup__filter-button" aria-expanded={showFilters} onClick={() => setShowFilters(value => !value)}><FiFilter /> Filters</button><button type="button" className="examination-setup__primary" onClick={() => { setForm(blank); setEditing(null); setShowForm(value => !value); setError('') }}><FiPlus /> Add Rule</button></div></header>
    <nav className="examination-setup__tabs" aria-label="Examination setup sections">{tabs.filter(([, path]) => path !== '/examination-setup/create-examination' && path !== '/examination-setup/exam-type' && path !== '/examination-setup/exam-schedule' && path !== '/examination-setup/exam-rules').map(([label, path]) => <Link key={path} to={path} className={path === location.pathname ? 'active' : ''}>{label}</Link>)}</nav>
    <div className="examination-setup__toolbar"><label className="examination-setup__search"><FiSearch /><input aria-label="Search exam rules" placeholder="Search rule or exam type..." value={query} onChange={event => setQuery(event.target.value)} /></label></div>
    {showFilters && <div className="examination-setup__filters"><label>Exam Type<select value={typeFilter} onChange={event => setTypeFilter(event.target.value)}><option value="">All Exam Types</option>{types.map(row => <option key={row.id}>{row.name}</option>)}</select></label><label>Status<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">All Statuses</option><option>Active</option><option>Inactive</option></select></label><button type="button" onClick={() => { setQuery(''); setTypeFilter(''); setStatusFilter('') }}>Clear Filters</button></div>}
    <p className="examination-setup__count">Showing {visible.length} rule{visible.length === 1 ? '' : 's'}</p><div className="examination-setup__table-wrap"><table><thead><tr><th>Rule Name</th><th>Description</th><th>Exam Type</th><th>Passing Marks</th><th>Minimum Attendance</th><th>Attempts</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.length ? visible.map(row => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.description}</td><td>{row.examType}</td><td>{row.passingMarks}</td><td>{row.attendance}%</td><td>{row.attempts}</td><td><span className={`examination-setup__status ${row.status.toLowerCase()}`}>{row.status}</span></td><td><div className="examination-setup__actions"><button type="button" aria-label="Edit rule" title="Edit rule" onClick={() => edit(row)}><FiEdit2 /></button><button type="button" aria-label="Toggle rule status" title="Toggle status" onClick={() => persist(rows.map(item => item.id === row.id ? { ...item, status: item.status === 'Active' ? 'Inactive' : 'Active' } : item))}><FiPower /></button><button type="button" aria-label="Delete rule" title="Delete rule" onClick={() => persist(rows.filter(item => item.id !== row.id))}><FiTrash2 /></button></div></td></tr>) : <tr><td colSpan="8" className="examination-setup__empty">No rules match your search and filters.</td></tr>}</tbody></table></div>
    {showForm && <div className="examination-setup__modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) { setShowForm(false); setEditing(null); setError('') } }}><section className="examination-setup__modal" role="dialog" aria-modal="true" aria-labelledby="exam-rule-modal-title"><header><div><h2 id="exam-rule-modal-title">{editing ? 'Edit Exam Rule' : 'Add Exam Rule'}</h2><p>Set the requirements and eligibility rules for this exam.</p></div><button type="button" aria-label="Close" onClick={() => { setShowForm(false); setEditing(null); setError('') }}>×</button></header><form className="examination-setup__form" onSubmit={save} noValidate><label><span>Rule Name <b>*</b></span><input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></label><label><span>Exam Type <b>*</b></span><select value={form.examType} onChange={event => setForm(current => ({ ...current, examType: event.target.value }))}><option value="">Select exam type</option>{types.map(row => <option key={row.id}>{row.name}</option>)}</select></label><label className="wide"><span>Description <b>*</b></span><textarea rows="3" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} /></label><label><span>Passing Marks <b>*</b></span><input type="number" min="0" value={form.passingMarks} onChange={event => setForm(current => ({ ...current, passingMarks: event.target.value }))} /></label><label><span>Minimum Attendance (%) <b>*</b></span><input type="number" min="0" max="100" value={form.attendance} onChange={event => setForm(current => ({ ...current, attendance: event.target.value }))} /></label><label><span>Attempts <b>*</b></span><input type="number" min="1" value={form.attempts} onChange={event => setForm(current => ({ ...current, attempts: event.target.value }))} /></label><label><span>Status <b>*</b></span><select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))}><option value="">Select status</option><option>Active</option><option>Inactive</option></select></label>{error && <p className="examination-setup__error wide" role="alert">{error}</p>}<footer><button type="button" className="examination-setup__secondary" onClick={() => { setShowForm(false); setEditing(null); setError('') }}>Cancel</button><button type="submit" className="examination-setup__primary">{editing ? 'Save Changes' : 'Add Rule'}</button></footer></form></section></div>}
  </section></main></DashboardLayout>
}

// #endregion pages/examinations/examination-setup/ExamRules.jsx
return {
  get default() { return ExamRules; }
};
})();

export const ExaminationSetup = ExaminationSetupModule.default;
export const ExaminationList = ExaminationListModule.default;
export const CreateExamination = CreateExaminationModule.default;
export const ExamType = ExamTypeModule.default;
export const ExamSchedule = ExamScheduleModule.default;
export const ExamRules = ExamRulesModule.default;
