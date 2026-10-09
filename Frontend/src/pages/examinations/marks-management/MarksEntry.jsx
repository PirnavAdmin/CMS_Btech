import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiEdit2, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import MarksModuleNav from './MarksModuleNav'
import FilterPanel from '../../../components/FilterPanel'
import ExportMenu from '../../../components/ExportMenu'
import TablePagination from '../../../components/TablePagination'
import EmptyState from '../../../components/EmptyState'
import { useAcademic } from '../../../context/AcademicContext'
import subjectService from '../../../services/subjectService'
import studentService from '../../../services/studentService'
import { collegeStorageKey } from '../../../utils/collegeScope'
import './MarksEntry.css'

const columns = [
  { key: 'academicYear', label: 'Academic Year' }, { key: 'course', label: 'Course' },
  { key: 'branch', label: 'Branch' }, { key: 'semester', label: 'Semester' }, { key: 'section', label: 'Section' },
  { key: 'registrationNumber', label: 'Registration Number' }, { key: 'studentName', label: 'Student Name' },
  { key: 'subjectName', label: 'Subject' },
  { key: 'subjectCode', label: 'Subject Code' }, { key: 'examType', label: 'Exam Type' },
  { key: 'assessmentType', label: 'Assessment Type' }, { key: 'examDate', label: 'Exam Date' },
  { key: 'maximumMarks', label: 'Maximum Marks' }, { key: 'passingMarks', label: 'Passing Marks' },
  { key: 'studentMarks', label: 'Student Marks' }, { key: 'examStatus', label: 'Exam Status' },
  { key: 'percentage', label: 'Percentage' },
]
const PAGE_SIZE = 10
const initialAssessment = {
  academicYear: '', course: '', branch: '', semester: '', section: '', registrationNumber: '', studentName: '',
  subject: '', subjectCode: '', examType: '', assessmentType: '', examDate: '', maximumMarks: '', passingMarks: '',
}
const fieldOptions = {
  examType: ['End Semester Regular Exam', 'Supplementary Exam', 'Improvement Exam'],
  assessmentType: ['Internal', 'External'],
}
const entityLabel = (item, keys) => keys.map(key => item?.[key]).find(value => value !== undefined && value !== null && String(value).trim())
const normalized = value => String(value ?? '').trim().toLowerCase()
const semesterNumber = value => String(value ?? '').match(/\d+/)?.[0] || ''
const uniqueValues = values => {
  const unique = new Map()
  values.forEach(value => {
    const label = String(value ?? '').trim()
    const key = normalized(label)
    if (key && !unique.has(key)) unique.set(key, label)
  })
  return [...unique.values()]
}
const getMarksSummary = ({ studentMarks, maximumMarks, passingMarks }) => {
  const marks = studentMarks === '' || studentMarks == null ? NaN : Number(studentMarks)
  const maximum = maximumMarks === '' || maximumMarks == null ? NaN : Number(maximumMarks)
  const passing = passingMarks === '' || passingMarks == null ? NaN : Number(passingMarks)
  const percentage = Number.isFinite(marks) && Number.isFinite(maximum) && maximum > 0
    ? `${((marks / maximum) * 100).toFixed(2)}%`
    : ''
  const examStatus = Number.isFinite(marks) && Number.isFinite(maximum) && maximum > 0
    && Number.isFinite(passing) && marks >= 0 && marks <= maximum && passing >= 0 && passing <= maximum
    ? marks >= passing ? 'Pass' : 'Fail'
    : ''

  return { percentage, examStatus }
}
const LEGACY_DRAFTS_KEY = collegeStorageKey('marks-entry-assessment-drafts-v1')
const DRAFTS_KEY = collegeStorageKey('marks-entry-assessment-drafts-v2')
const readDrafts = () => { try { const value = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]'); return Array.isArray(value) ? value : [] } catch { return [] } }

export default function MarksEntry() {
  const { academicYears = [], courses: academicCourses = [], branches = [], semesters = [], sections = [] } = useAcademic()
  const [draftRows, setDraftRows] = useState(readDrafts)
  const [subjects, setSubjects] = useState([])
  const [students, setStudents] = useState([])
  const [activeSuggestion, setActiveSuggestion] = useState('')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({
    academicYear: '', course: '', branch: '', semester: '', section: '', subject: '', examType: '', assessmentType: '',
  })
  const [page, setPage] = useState(1)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [assessment, setAssessment] = useState(initialAssessment)

  useEffect(() => { try { localStorage.removeItem(LEGACY_DRAFTS_KEY) } catch { /* ignore unavailable storage */ } }, [])
  useEffect(() => { subjectService.getSubjects({ liveOnly: true }).then(data => setSubjects(Array.isArray(data) ? data : [])).catch(() => setSubjects([])) }, [])
  useEffect(() => { studentService.getAllProfiles().then(data => setStudents(Array.isArray(data) ? data : [])).catch(() => setStudents([])) }, [])
  useEffect(() => { try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(draftRows)) } catch { /* keep current session drafts if storage is unavailable */ } }, [draftRows])

  const allRows = draftRows
  const academicOptions = useMemo(() => ({
    academicYear: academicYears.map(item => entityLabel(item, ['academicYearName', 'name', 'academicYear', 'yearName'])).filter(Boolean),
    course: academicCourses.map(item => entityLabel(item, ['courseName', 'name', 'course', 'programName', 'title'])).filter(Boolean),
    branch: branches.map(item => entityLabel(item, ['branchName', 'name', 'branch', 'title'])).filter(Boolean),
    semester: semesters.map(item => entityLabel(item, ['semesterName', 'name', 'semesterNumber', 'semester'])).filter(Boolean),
    section: sections.map(item => entityLabel(item, ['sectionName', 'name', 'section', 'code'])).filter(Boolean),
    registrationNumber: students.map(item => item.registrationNumber || item.application?.registrationNumber || item.application?.number || item.academic?.registrationNumber || item.academic?.rollNumber).filter(Boolean),
    studentName: students.map(item => item.fullName || item.personal?.fullName || item.name || item.studentName).filter(Boolean),
    subject: [],
    subjectCode: [],
    examType: [...fieldOptions.examType, ...subjects.map(item => item.examType).filter(Boolean)],
    assessmentType: [...fieldOptions.assessmentType, ...subjects.map(item => item.assessmentType).filter(Boolean)],
    examDate: subjects.map(item => item.examDate || item.lastExamDate).filter(Boolean),
    maximumMarks: subjects.flatMap(item => [item.internalMarks, item.externalMarks, item.maximumMarks, item.maxMarks]).filter(value => value !== '' && value != null),
    passingMarks: subjects.flatMap(item => [item.passingMarks, item.internalPassingMarks, item.externalPassingMarks, item.minimumPassingMarks, item.minPassingMarks]).filter(value => value !== '' && value != null),
  }), [academicYears, academicCourses, branches, semesters, sections, subjects, students])
  const filterOptions = useMemo(() => ({
    academicYear: uniqueValues([...academicOptions.academicYear, ...allRows.map(row => row.academicYear)]),
    course: uniqueValues([...academicOptions.course, ...allRows.map(row => row.course)]),
    branch: uniqueValues([...academicOptions.branch, ...allRows.map(row => row.branch)]),
    semester: uniqueValues([...academicOptions.semester, ...allRows.map(row => row.semester)]),
    section: uniqueValues([...academicOptions.section, ...allRows.map(row => row.section)]),
    subject: uniqueValues([...subjects.map(item => entityLabel(item, ['subjectName', 'name'])), ...allRows.map(row => row.subjectName || row.subject)]),
    examType: uniqueValues([...fieldOptions.examType, ...subjects.map(item => item.examType), ...allRows.map(row => row.examType)]),
    assessmentType: uniqueValues([...fieldOptions.assessmentType, ...subjects.map(item => item.assessmentType), ...allRows.map(row => row.assessmentType)]),
  }), [academicOptions, allRows, subjects])
  const filtered = useMemo(() => allRows.filter(row => {
    const searchText = `${row.subjectCode || ''} ${row.subjectName || row.subject || ''} ${row.examType || ''} ${row.course || ''} ${row.branch || ''} ${row.section || ''}`.toLowerCase()
    const rowValues = {
      academicYear: row.academicYear,
      course: row.course,
      branch: row.branch,
      semester: row.semester,
      section: row.section,
      subject: row.subjectName || row.subject,
      examType: row.examType,
      assessmentType: row.assessmentType,
    }
    return (!query || searchText.includes(query.toLowerCase()))
      && Object.entries(filters).every(([key, value]) => !value || normalized(rowValues[key]) === normalized(value))
  }), [allRows, query, filters])
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const setFilter = (key, value) => {
    setFilters(current => ({ ...current, [key]: value }))
    setPage(1)
  }
  const clearFilters = () => {
    setQuery('')
    setFilters({ academicYear: '', course: '', branch: '', semester: '', section: '', subject: '', examType: '', assessmentType: '' })
    setPage(1)
  }
  const hasFilters = Boolean(query || Object.values(filters).some(Boolean))
  const eligibleSubjects = useMemo(() => subjects.filter(subject => {
    const selectedBranch = branches.find(item => normalized(entityLabel(item, ['name', 'branchName', 'branch'])) === normalized(assessment.branch) || normalized(item.id) === normalized(assessment.branch))
    const selectedSemester = semesters.find(item => normalized(entityLabel(item, ['semesterName', 'name', 'semesterNumber'])) === normalized(assessment.semester) || normalized(item.id) === normalized(assessment.semester) || semesterNumber(entityLabel(item, ['semesterName', 'name', 'semesterNumber'])) === semesterNumber(assessment.semester))
    const subjectBranchId = subject.branchId ?? subject.branchID
    const subjectBranchName = subject.branchName || (typeof subject.branch === 'string' ? subject.branch : '')
    const subjectSemesterId = subject.semesterId ?? subject.semesterID
    const subjectSemesterName = subject.semesterName || (typeof subject.semester === 'string' ? subject.semester : '')
    const branchMatches = !assessment.branch || (selectedBranch && subjectBranchId != null
      ? normalized(subjectBranchId) === normalized(selectedBranch.id ?? selectedBranch.branchId)
      : normalized(subjectBranchName) === normalized(assessment.branch))
    const semesterMatches = !assessment.semester || (selectedSemester && subjectSemesterId != null
      ? normalized(subjectSemesterId) === normalized(selectedSemester.id ?? selectedSemester.semesterId)
      : semesterNumber(subjectSemesterName || subjectSemesterId) === semesterNumber(assessment.semester))
    return branchMatches && semesterMatches
  }), [subjects, branches, semesters, assessment.branch, assessment.semester])
  const suggestionOptions = {
    ...academicOptions,
    subject: eligibleSubjects.map(item => entityLabel(item, ['subjectName', 'name'])).filter(Boolean),
    subjectCode: eligibleSubjects.map(item => item.subjectCode).filter(Boolean),
  }
  const updateAssessment = (key, value) => {
    const matchedSubject = key === 'subject' ? eligibleSubjects.find(row => normalized(row.subjectName || row.subject) === normalized(value)) : null
    const matchedStudent = ['registrationNumber', 'studentName'].includes(key) ? students.find(student => normalized(key === 'registrationNumber' ? student.registrationNumber : (student.fullName || student.personal?.fullName || student.name || student.studentName)) === normalized(value)) : null
    setAssessment(current => ({ ...current, [key]: value,
      ...(key === 'subject' ? { subjectCode: matchedSubject?.subjectCode || '' } : {}),
      ...(key === 'registrationNumber' && matchedStudent ? { studentName: matchedStudent.fullName || matchedStudent.personal?.fullName || matchedStudent.name || matchedStudent.studentName || '' } : {}),
      ...(key === 'studentName' && matchedStudent ? { registrationNumber: matchedStudent.registrationNumber || matchedStudent.application?.registrationNumber || matchedStudent.application?.number || matchedStudent.academic?.registrationNumber || matchedStudent.academic?.rollNumber || '' } : {}),
      ...(['branch', 'semester'].includes(key) ? { subject: '', subjectCode: '' } : {}) }))
  }
  const submitAssessment = event => {
    event.preventDefault()
    const { percentage, examStatus } = getMarksSummary(assessment)
    const record = {
      ...assessment,
      id: editingId || `draft-${Date.now()}`,
      subjectName: assessment.subject,
      percentage,
      examStatus,
      totalStudents: 0,
      passedCount: 0,
      failedCount: 0,
      status: 'Draft',
    }
    setDraftRows(current => editingId
      ? current.map(row => row.id === editingId ? { ...row, ...record } : row)
      : [record, ...current])
    setShowAddForm(false)
    setEditingId('')
    setAssessment(initialAssessment)
    setPage(1)
  }
  const editAssessment = row => {
    setEditingId(row.id)
    setAssessment({ ...initialAssessment, ...row, subject: row.subject || row.subjectName || '' })
    setActiveSuggestion('')
    setShowAddForm(true)
  }
  const deleteAssessment = row => {
    const label = row.subjectName || row.subject || row.subjectCode || 'this marks record'
    if (!window.confirm(`Delete ${label}?`)) return
    setDraftRows(current => current.filter(item => item.id !== row.id))
    setPage(1)
  }

  return (
    <DashboardLayout>
      <section className="marks-management-marks-entry">
        <PageHeader title="Marks Entry" breadcrumb={[{ label: 'Marks Management', link: '/marks-management' }, 'Marks Entry']} />
        <MarksModuleNav />
        <article className="erp-card marks-entry-card">
          <header className="erp-card-header marks-entry-card__header">
            <div><h2 className="erp-card-title">Marks Records</h2><p className="erp-card-subtitle">Review submitted marks by subject, exam and class.</p></div>
          </header>
          <FilterPanel active={hasFilters} onClear={clearFilters} className="marks-entry-filters" actions={<div className="marks-entry-card__actions"><ExportMenu rows={filtered} columns={columns} title="Marks Entry Records" filename="marks-entry-records" scope="All matching marks" allowEmpty printLabel="Save as PDF" /><button type="button" className="erp-btn erp-btn--primary" onClick={() => { setEditingId(''); setAssessment(initialAssessment); setShowAddForm(true) }}><FiPlus /> Add Marks</button></div>}>
            <div className="marks-entry-search-wrap"><label className="marks-entry-search"><FiSearch aria-hidden="true" /><input aria-label="Search marks records" placeholder="Search subject, exam, course or section" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} /></label></div>
            {[
              ['academicYear', 'Academic Year', 'All academic years'],
              ['course', 'Course', 'All courses'],
              ['branch', 'Branch', 'All branches'],
              ['semester', 'Semester', 'All semesters'],
              ['section', 'Section', 'All sections'],
              ['subject', 'Subject', 'All subjects'],
              ['examType', 'Exam Type', 'All exam types'],
              ['assessmentType', 'Assessment Type', 'All assessment types'],
            ].map(([key, label, placeholder]) => (
              <label className="marks-entry-filter" key={key}>
                <span>{label}</span>
                <select aria-label={`Filter by ${label}`} value={filters[key]} onChange={event => setFilter(key, event.target.value)}>
                  <option value="">{placeholder}</option>
                  {filterOptions[key].map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            ))}
          </FilterPanel>
          {showAddForm && createPortal(<div className={`marks-entry-modal${localStorage.getItem('pirnav-sidebar-collapsed') === 'true' ? ' sidebar-collapsed' : ''}`} onMouseDown={() => setShowAddForm(false)}>
            <form className="marks-entry-form" role="dialog" aria-modal="true" aria-labelledby="marks-entry-form-title" onMouseDown={event => event.stopPropagation()} onSubmit={submitAssessment}>
            <div className="marks-entry-form__heading"><div><h3 id="marks-entry-form-title">{editingId ? 'Edit Marks Assessment' : 'Add Marks Assessment'}</h3><p>Enter the assessment details. Existing values are available as suggestions.</p></div><button type="button" className="marks-entry-form__close" onClick={() => { setShowAddForm(false); setEditingId('') }} aria-label="Close form">&times;</button></div>
            <div className="marks-entry-form__body"><div className="marks-entry-form__grid">
              {[
                ['academicYear', 'Academic Year'], ['course', 'Course'], ['branch', 'Branch'], ['semester', 'Semester'], ['section', 'Section'], ['registrationNumber', 'Registration Number'], ['studentName', 'Student Name'],
                ['subject', 'Subject'], ['subjectCode', 'Subject Code'], ['examType', 'Exam Type'], ['assessmentType', 'Assessment Type'],
                ['examDate', 'Exam Date'], ['maximumMarks', 'Maximum Marks'], ['passingMarks', 'Passing Marks'],
                ['studentMarks', 'Student Marks'], ['examStatus', 'Exam Status'], ['percentage', 'Percentage'],
              ].map(([key, label]) => {
                const suggestions = uniqueValues([...(fieldOptions[key] || []), ...(suggestionOptions[key] || [])])
                const matches = suggestions.filter(value => !assessment[key] || normalized(value).includes(normalized(assessment[key])))
                const summary = getMarksSummary(assessment)
                const isDerived = key === 'examStatus' || key === 'percentage'
                const fieldValue = key === 'examStatus' ? summary.examStatus : key === 'percentage' ? summary.percentage : assessment[key]
                return <label className="marks-entry-form__field" key={key}>
                  <span>{label}</span>
                  <div className={`marks-entry-input-combo${key === 'examDate' ? ' marks-entry-input-combo--datetime' : ''}`}>
                    <input
                      type={['maximumMarks', 'passingMarks', 'studentMarks'].includes(key) ? 'number' : key === 'examDate' ? 'datetime-local' : 'text'}
                      value={fieldValue ?? ''}
                      min={key === 'maximumMarks' ? 1 : ['passingMarks', 'studentMarks'].includes(key) ? 0 : undefined}
                      max={key === 'passingMarks' || key === 'studentMarks' ? assessment.maximumMarks || undefined : undefined}
                      step={['maximumMarks', 'passingMarks', 'studentMarks'].includes(key) ? 'any' : undefined}
                      readOnly={isDerived}
                      required={!isDerived}
                      autoComplete="off"
                      role={isDerived ? undefined : 'combobox'}
                      aria-autocomplete={isDerived ? undefined : 'list'}
                      aria-expanded={!isDerived && activeSuggestion === key && matches.length > 0}
                      onFocus={() => !isDerived && setActiveSuggestion(key)}
                      onClick={() => !isDerived && setActiveSuggestion(key)}
                      onBlur={() => window.setTimeout(() => setActiveSuggestion(current => current === key ? '' : current), 120)}
                      onChange={event => { updateAssessment(key, event.target.value); setActiveSuggestion(key) }}
                    />
                    {!isDerived && activeSuggestion === key && matches.length > 0 && <div className="marks-entry-suggestions" role="listbox">{matches.map(value => <button type="button" role="option" key={value} onMouseDown={event => event.preventDefault()} onClick={() => { updateAssessment(key, String(value)); setActiveSuggestion('') }}>{value}</button>)}</div>}
                  </div>
                </label>
              })}
              </div><aside className="marks-entry-form__preview"><div className="marks-entry-form__preview-head"><span className="marks-entry-live-dot" /> Live Preview <small>Updates as you type</small></div><h4>{assessment.subject || 'New Assessment'}</h4><dl>{[['Academic Year', assessment.academicYear], ['Course / Branch', [assessment.course, assessment.branch].filter(Boolean).join(' / ')], ['Semester', assessment.semester], ['Section', assessment.section], ['Registration Number', assessment.registrationNumber], ['Student Name', assessment.studentName], ['Subject Code', assessment.subjectCode], ['Exam', assessment.examType], ['Assessment', assessment.assessmentType], ['Exam Date', assessment.examDate], ['Maximum / Passing', `${assessment.maximumMarks} / ${assessment.passingMarks}`]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl></aside></div>
            <div className="marks-entry-form__footer"><button type="submit" className="erp-btn erp-btn--primary">{editingId ? 'Save Changes' : 'Confirm'}</button></div>
            </form>
          </div>, document.body)}
          <div className="marks-entry-table-wrap">
            <table className="erp-table">
              <thead><tr>{['Academic Year', 'Course', 'Branch', 'Semester', 'Section', 'Registration Number', 'Student Name', 'Subject', 'Subject Code', 'Exam Type', 'Assessment Type', 'Exam Date', 'Max Marks', 'Pass Marks', 'Student Marks', 'Exam Status', 'Percentage'].map(label => <th key={label}>{label}</th>)}<th>Actions</th></tr></thead>
              <tbody>
                {visible.map((row, index) => {
                  const summary = getMarksSummary(row)
                  return <tr key={row.id || `${row.subjectCode}-${row.examType}-${index}`}>
                    <td>{row.academicYear || '—'}</td><td>{row.course || '—'}</td><td>{row.branch || '—'}</td>
                    <td>{row.semester || '—'}</td><td>{row.section || '—'}</td><td>{row.registrationNumber || '—'}</td><td>{row.studentName || '—'}</td><td>{row.subjectName || row.subject || '—'}</td>
                    <td>{row.subjectCode || '—'}</td><td>{row.examType || '—'}</td><td>{row.assessmentType || '—'}</td>
                    <td>{row.examDate || '—'}</td><td>{row.maximumMarks || row.maxExternal || '—'}</td><td>{row.passingMarks || '—'}</td>
                    <td>{row.studentMarks !== '' && row.studentMarks != null ? row.studentMarks : '—'}</td><td>{row.examStatus || summary.examStatus || '—'}</td><td>{row.percentage || summary.percentage || '—'}</td>
                    <td><div className="marks-entry-row-actions"><button type="button" className="marks-entry-row-action marks-entry-row-action--edit" title="Edit marks" aria-label={`Edit marks for ${row.subjectName || row.subject || row.subjectCode || 'record'}`} onClick={() => editAssessment(row)}><FiEdit2 /></button><button type="button" className="marks-entry-row-action marks-entry-row-action--delete" title="Delete marks" aria-label={`Delete marks for ${row.subjectName || row.subject || row.subjectCode || 'record'}`} onClick={() => deleteAssessment(row)}><FiTrash2 /></button></div></td>
                  </tr>
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <EmptyState title={hasFilters ? 'No matching marks records' : 'No marks have been entered yet'} description={hasFilters ? 'Adjust or clear the filters to see more records.' : 'Add marks to create the first result sheet.'} />}
          </div>
          {filtered.length > PAGE_SIZE && <TablePagination currentPage={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} onPageChange={setPage} />}
        </article>
      </section>
    </DashboardLayout>
  )
}
