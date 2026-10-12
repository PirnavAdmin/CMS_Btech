// Pages and helpers in this module retain their own isolated scopes.
import * as external0 from "react";
import * as external1 from "react-router-dom";
import * as external2 from "react-dom";
import * as external3 from "react-icons/fi";
import { DashboardLayoutModule, PageHeaderModule, FilterPanelModule, ExportMenuModule, TablePaginationModule, EmptyStateModule, AcademicContextModule, StatusBadgeModule, ViewDialogModule, SearchableSelectModule } from "../../../components/components.jsx";
import { subjectServiceModule, studentServiceModule, collegeScopeModule, resultsServiceModule, academicServiceModule, examServiceModule, facultyServiceModule, authModule, eventBusModule } from "../../../API/apiendpoints.jsx";
import { toastModule } from "../../../components/components.jsx";

export const MarksManagementModule = (() => {
const { Navigate } = external1;
/* Imports for isolated regression tests:
import { Navigate } from 'react-router-dom'
*/
// #region pages/examinations/marks-management/MarksManagement.jsx
/* export default */ function MarksManagement() {
  return <Navigate to="/marks-management/marks-entry" replace />
}
// #endregion pages/examinations/marks-management/MarksManagement.jsx
return {
  get default() { return MarksManagement; }
};
})();

export const MarksModuleNavModule = (() => {
const { NavLink } = external1;
/* Imports for isolated regression tests:
import { NavLink } from 'react-router-dom'
import './MarksModuleNav.css'
*/
// #region pages/examinations/marks-management/MarksModuleNav.jsx
const modules = [
  ['Marks Entry', '/marks-management/marks-entry'],
  ['Bulk Marks Upload', '/marks-management/bulk-marks-upload'],
  ['Student Marks', '/marks-management/student-marks'],
  ['Subject Marks Report', '/marks-management/subject-marks-report'],
  ['Marks Approval', '/marks-management/marks-approval'],
]

/* export default */ function MarksModuleNav() {
  return <nav className="marks-module-nav" aria-label="Marks management modules">
    {modules.map(([label, to]) => <NavLink key={to} to={to} className={({ isActive }) => `marks-module-nav__link${isActive ? ' active' : ''}`}>{label}</NavLink>)}
  </nav>
}
// #endregion pages/examinations/marks-management/MarksModuleNav.jsx
return {
  get default() { return MarksModuleNav; }
};
})();

export const MarksEntryModule = (() => {
const { useEffect } = external0;
const { useMemo } = external0;
const { useState } = external0;
const { createPortal } = external2;
const { FiEdit2 } = external3;
const { FiPlus } = external3;
const { FiSearch } = external3;
const { FiTrash2 } = external3;
const { default: DashboardLayout } = DashboardLayoutModule;
const { default: PageHeader } = PageHeaderModule;
const { default: MarksModuleNav } = MarksModuleNavModule;
const { default: FilterPanel } = FilterPanelModule;
const { default: ExportMenu } = ExportMenuModule;
const { default: TablePagination } = TablePaginationModule;
const { default: EmptyState } = EmptyStateModule;
const { useAcademic } = AcademicContextModule;
const { default: subjectService } = subjectServiceModule;
const { default: studentService } = studentServiceModule;
const { collegeStorageKey } = collegeScopeModule;
/* Imports for isolated regression tests:
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
*/
// #region pages/examinations/marks-management/MarksEntry.jsx
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

/* export default */ function MarksEntry() {
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
// #endregion pages/examinations/marks-management/MarksEntry.jsx
return {
  get default() { return MarksEntry; }
};
})();

export const BulkMarksUploadModule = (() => {
const { useMemo } = external0;
const { useState } = external0;
const { FiFileText } = external3;
const { FiSearch } = external3;
const { FiUploadCloud } = external3;
const { FiX } = external3;
const { default: DashboardLayout } = DashboardLayoutModule;
const { default: PageHeader } = PageHeaderModule;
const { default: MarksModuleNav } = MarksModuleNavModule;
const { default: FilterPanel } = FilterPanelModule;
const { default: ExportMenu } = ExportMenuModule;
const { default: TablePagination } = TablePaginationModule;
const { default: EmptyState } = EmptyStateModule;
/* Imports for isolated regression tests:
import { useMemo, useState } from 'react'
import { FiFileText, FiSearch, FiUploadCloud, FiX } from 'react-icons/fi'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import MarksModuleNav from './MarksModuleNav'
import FilterPanel from '../../../components/FilterPanel'
import ExportMenu from '../../../components/ExportMenu'
import TablePagination from '../../../components/TablePagination'
import EmptyState from '../../../components/EmptyState'
import './BulkMarksUpload.css'
*/
// #region pages/examinations/marks-management/BulkMarksUpload.jsx
const PAGE_SIZE = 10
const normalized = value => String(value ?? '').trim().toLowerCase()

const countDelimiter = (line, delimiter) => {
  let count = 0
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') {
      if (quoted && line[index + 1] === '"') index += 1
      else quoted = !quoted
    } else if (!quoted && line[index] === delimiter) count += 1
  }
  return count
}

const parseDelimitedFile = (text, filename) => {
  const source = text.replace(/^\uFEFF/, '')
  if (!source.trim()) throw new Error('The selected file is empty.')

  const extension = filename.split('.').pop()?.toLowerCase()
  const sample = source.split(/\r?\n/, 1)[0]
  const delimiter = extension === 'tsv'
    ? '\t'
    : [',', '\t', ';'].sort((left, right) => countDelimiter(sample, right) - countDelimiter(sample, left))[0]
  const matrix = []
  let record = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"'
        index += 1
      } else quoted = !quoted
    } else if (!quoted && character === delimiter) {
      record.push(cell)
      cell = ''
    } else if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && source[index + 1] === '\n') index += 1
      record.push(cell)
      matrix.push(record)
      record = []
      cell = ''
    } else cell += character
  }
  if (cell.length || record.length) {
    record.push(cell)
    matrix.push(record)
  }

  const nonEmptyRows = matrix.filter(row => row.some(value => String(value).trim()))
  if (!nonEmptyRows.length) throw new Error('The selected file does not contain a header row.')

  const headerRow = nonEmptyRows[0]
  const usedKeys = new Map()
  const columns = headerRow.map((value, index) => {
    const label = String(value).trim() || `Column ${index + 1}`
    const base = label.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `column_${index + 1}`
    const occurrence = (usedKeys.get(base) || 0) + 1
    usedKeys.set(base, occurrence)
    const key = `field_${index}_${base}${occurrence > 1 ? `_${occurrence}` : ''}`
    return { key, value: key, label }
  })

  const rows = nonEmptyRows.slice(1).map((values, index) => ({
    __bulkRowId: `upload-row-${index}`,
    ...Object.fromEntries(columns.map((column, columnIndex) => [column.key, String(values[columnIndex] ?? '').trim()])),
  }))
  return { columns, rows }
}

/* export default */ function BulkMarksUpload() {
  const [fileName, setFileName] = useState('')
  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [fileError, setFileError] = useState('')
  const [reading, setReading] = useState(false)
  const [query, setQuery] = useState('')
  const [filterColumn, setFilterColumn] = useState('')
  const [filterValue, setFilterValue] = useState('')
  const [page, setPage] = useState(1)

  const filteredRows = useMemo(() => rows.filter(row => {
    const searchText = query.trim().toLowerCase()
    const searchMatches = !searchText || columns.some(column => normalized(row[column.key]).includes(searchText))
    const valueText = filterValue.trim().toLowerCase()
    const filterColumns = filterColumn ? columns.filter(column => column.key === filterColumn) : columns
    const valueMatches = !valueText || filterColumns.some(column => normalized(row[column.key]).includes(valueText))
    return searchMatches && valueMatches
  }), [rows, columns, query, filterColumn, filterValue])
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasFilters = Boolean(query || filterColumn || filterValue)

  const uploadFile = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setFileError('')
    setReading(true)
    try {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (!['csv', 'tsv', 'txt'].includes(extension)) throw new Error('Choose a CSV, TSV, or TXT file. Excel workbooks are not supported yet; save the sheet as CSV first.')
      const parsed = parseDelimitedFile(await file.text(), file.name)
      setColumns(parsed.columns)
      setRows(parsed.rows)
      setFileName(file.name)
      setQuery('')
      setFilterColumn('')
      setFilterValue('')
      setPage(1)
    } catch (error) {
      setFileError(error.message || 'Could not read this file. Check that it is a valid CSV or TSV.')
    } finally {
      setReading(false)
    }
  }

  const clearPreview = () => {
    setFileName('')
    setColumns([])
    setRows([])
    setQuery('')
    setFilterColumn('')
    setFilterValue('')
    setPage(1)
    setFileError('')
  }
  const clearFilters = () => {
    setQuery('')
    setFilterColumn('')
    setFilterValue('')
    setPage(1)
  }

  return (
    <DashboardLayout>
      <section className="marks-management-bulk-marks-upload">
        <PageHeader title="Bulk Marks Upload" breadcrumb={[{ label: 'Marks Management', link: '/marks-management' }, 'Bulk Marks Upload']} />
        <MarksModuleNav />

        <article className="erp-card bulk-marks-upload-card">
          <header className="erp-card-header bulk-marks-upload-card__header">
            <div>
              <h2 className="erp-card-title">Upload Marks File</h2>
              <p className="erp-card-subtitle">Upload a CSV, TSV, or TXT file to preview its rows before importing.</p>
            </div>
            {fileName && <button type="button" className="erp-btn erp-btn--secondary bulk-marks-upload-clear" onClick={clearPreview}><FiX /> Clear file</button>}
          </header>

          <label className={`bulk-marks-upload-dropzone${reading ? ' is-reading' : ''}`}>
            <input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" onChange={uploadFile} disabled={reading} />
            <span className="bulk-marks-upload-dropzone__icon"><FiUploadCloud /></span>
            <span className="bulk-marks-upload-dropzone__text"><strong>{reading ? 'Reading file…' : fileName || 'Choose a marks file'}</strong><small>{reading ? 'Parsing rows and columns' : 'CSV / TSV / TXT · First row should contain column headings'}</small></span>
            <span className="erp-btn erp-btn--primary bulk-marks-upload-browse">Browse files</span>
          </label>
          {fileError && <p className="bulk-marks-upload-error" role="alert">{fileError}</p>}
          {fileName && !fileError && <p className="bulk-marks-upload-status" role="status"><FiFileText /> Loaded {rows.length} data {rows.length === 1 ? 'row' : 'rows'} and {columns.length} columns from {fileName}.</p>}
        </article>

        <article className="erp-card bulk-marks-preview-card">
          <header className="erp-card-header bulk-marks-preview-card__header">
            <div><h2 className="erp-card-title">Uploaded Data</h2><p className="erp-card-subtitle">{fileName ? `${filteredRows.length} of ${rows.length} rows shown` : 'Upload a file to preview its data in a table.'}</p></div>
          </header>

          <FilterPanel
            active={hasFilters}
            onClear={clearFilters}
            className="bulk-marks-preview-filters"
            actions={<ExportMenu rows={filteredRows} columns={columns} title="Bulk Marks Upload" filename="bulk-marks-upload" scope="All matching rows" allowEmpty />}
          >
            <div className="bulk-marks-search-wrap"><label className="bulk-marks-search"><FiSearch aria-hidden="true" /><input type="search" aria-label="Search uploaded marks" placeholder="Search uploaded data" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} /></label></div>
            <label className="bulk-marks-filter"><span>Column</span><select value={filterColumn} onChange={event => { setFilterColumn(event.target.value); setPage(1) }}><option value="">All columns</option>{columns.map(column => <option key={column.key} value={column.key}>{column.label}</option>)}</select></label>
            <label className="bulk-marks-filter"><span>Value contains</span><input type="search" placeholder="Enter a value" value={filterValue} onChange={event => { setFilterValue(event.target.value); setPage(1) }} /></label>
          </FilterPanel>

          {columns.length > 0 && (
            <div className="bulk-marks-table-wrap">
              <table className="erp-table bulk-marks-table">
                <thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead>
                <tbody>{visibleRows.map(row => <tr key={row.__bulkRowId}>{columns.map(column => <td key={column.key}>{row[column.key] || '—'}</td>)}</tr>)}</tbody>
              </table>
              {filteredRows.length === 0 && <EmptyState title="No matching rows" description="Adjust or clear the filters to see more uploaded data." />}
            </div>
          )}
          {columns.length === 0 && <EmptyState title="No file uploaded" description="Choose a CSV, TSV, or TXT file above to display its contents here." />}
          {filteredRows.length > PAGE_SIZE && <TablePagination currentPage={page} totalPages={Math.ceil(filteredRows.length / PAGE_SIZE)} onPageChange={setPage} />}
        </article>
      </section>
    </DashboardLayout>
  )
}
// #endregion pages/examinations/marks-management/BulkMarksUpload.jsx
return {
  get default() { return BulkMarksUpload; }
};
})();

export const EditMarksModule = (() => {
const { Link } = external1;
const { default: DashboardLayout } = DashboardLayoutModule;
const { default: PageHeader } = PageHeaderModule;
const { default: MarksModuleNav } = MarksModuleNavModule;
/* Imports for isolated regression tests:
import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import MarksModuleNav from './MarksModuleNav'
import './EditMarks.css'
*/
// #region pages/examinations/marks-management/EditMarks.jsx
/* export default */ function EditMarks() {
  return (
    <DashboardLayout>
      <section className="marks-management-edit-marks">
        <PageHeader title="Edit Marks" breadcrumb={[{ label: "Marks Management", link: '/marks-management' }, "Edit Marks"]} />
        <MarksModuleNav />
        <div className="marks-management-edit-marks__content">
          <h2>Edit Marks</h2>
          <p>This screen is ready for implementation.</p>
          <Link to="/marks-management">Back to Marks Management</Link>
        </div>
      </section>
    </DashboardLayout>
  )
}
// #endregion pages/examinations/marks-management/EditMarks.jsx
return {
  get default() { return EditMarks; }
};
})();

export const StudentMarksModule = (() => {
const { useEffect } = external0;
const { useMemo } = external0;
const { useState } = external0;
const { FiSearch } = external3;
const { FiUser } = external3;
const { default: DashboardLayout } = DashboardLayoutModule;
const { default: PageHeader } = PageHeaderModule;
const { default: MarksModuleNav } = MarksModuleNavModule;
const { default: FilterPanel } = FilterPanelModule;
const { default: ExportMenu } = ExportMenuModule;
const { default: TablePagination } = TablePaginationModule;
const { default: EmptyState } = EmptyStateModule;
const { default: resultsService } = resultsServiceModule;
const { default: academicService } = academicServiceModule;
const { getExamTypes } = examServiceModule;
const { default: studentService } = studentServiceModule;
/* Imports for isolated regression tests:
import { useEffect, useMemo, useState } from 'react'
import { FiSearch, FiUser } from 'react-icons/fi'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import MarksModuleNav from './MarksModuleNav'
import FilterPanel from '../../../components/FilterPanel'
import ExportMenu from '../../../components/ExportMenu'
import TablePagination from '../../../components/TablePagination'
import EmptyState from '../../../components/EmptyState'
import resultsService from '../../../services/resultsService'
import academicService from '../../../services/academicService'
import { getExamTypes } from '../../../services/examService'
import studentService from '../../../services/studentService'
import './StudentMarks.css'
*/
// #region pages/examinations/marks-management/StudentMarks.jsx
const PAGE_SIZE = 10
const clean = value => String(value ?? '').trim()
const normalized = value => clean(value).toLowerCase()
const firstValue = (...values) => values.find(value => value !== undefined && value !== null && clean(value) !== '')
const displayValue = value => {
  if (value && typeof value === 'object') return firstValue(value.name, value.label, value.title, value.value, value.semesterName, '')
  return value
}
const getStudentId = student => clean(firstValue(student?.studentId, student?.id))
const getStudentName = student => clean(firstValue(student?.fullName, student?.personal?.fullName, student?.studentName, student?.name, 'Student'))
const getRegistrationNumber = student => clean(firstValue(student?.registrationNumber, student?.application?.registrationNumber, student?.application?.number, student?.academic?.registrationNumber, student?.academic?.rollNumber, student?.rollNumber, ''))

const columns = [
  ['studentName', 'Student Name'], ['registrationNumber', 'Registration Number'], ['academicYear', 'Academic Year'], ['course', 'Course'], ['branch', 'Branch'], ['semester', 'Semester'], ['section', 'Section'],
  ['subjectCode', 'Subject Code'], ['subjectName', 'Subject'], ['examType', 'Exam Type'], ['assessmentType', 'Assessment Type'], ['examDate', 'Exam Date'],
  ['maxInternal', 'Max Internal'], ['internalMarks', 'Internal Marks'], ['maxExternal', 'Max External'], ['externalMarks', 'External Marks'],
  ['maximumMarks', 'Maximum Marks'], ['passingMarks', 'Passing Marks'], ['totalMarks', 'Total Marks'], ['grade', 'Grade'], ['gradePoint', 'Grade Point'], ['status', 'Result'],
].map(([key, label]) => ({ key, value: key, label }))
const matchesStudent = (record, student) => {
  const selectedId = getStudentId(student)
  const resultIds = [record.studentId, record.studentProfileId, record.student?.studentId, record.student?.id, record.profileId].map(normalized).filter(Boolean)
  if (selectedId && resultIds.includes(normalized(selectedId))) return true

  const selectedRegistration = normalized(getRegistrationNumber(student))
  const resultRegistration = normalized(firstValue(record.registrationNumber, record.rollNumber, record.enrollmentNo, record.admissionNumber, record.student?.registrationNumber, record.student?.rollNumber, ''))
  if (selectedRegistration && resultRegistration) return selectedRegistration === resultRegistration

  const hasStrongId = Boolean(selectedId || resultIds.length || selectedRegistration || resultRegistration)
  return !hasStrongId && normalized(firstValue(record.studentName, record.name, record.student?.name, '')) === normalized(getStudentName(student))
}

const resultRow = (sheet, record, student, index) => {
  const maxInternal = firstValue(sheet.maxInternal, sheet.maximumInternalMarks, sheet.internalMaxMarks, record.maxInternal, '')
  const maxExternal = firstValue(sheet.maxExternal, sheet.maximumExternalMarks, sheet.externalMaxMarks, record.maxExternal, '')
  const totalMaximum = maxInternal !== '' && maxExternal !== '' && Number.isFinite(Number(maxInternal)) && Number.isFinite(Number(maxExternal))
    ? Number(maxInternal) + Number(maxExternal)
    : ''
  const internalMarks = firstValue(record.internalMarks, record.internal, record.internalScore, '')
  const externalMarks = firstValue(record.externalMarks, record.external, record.externalScore, '')
  const totalMarks = firstValue(record.totalMarks, record.marksObtained, record.obtainedMarks,
    internalMarks !== '' && externalMarks !== '' ? Number(internalMarks) + Number(externalMarks) : '', '')
  const sheetId = firstValue(sheet.id, sheet.resultId, sheet.resultSheetId, sheet.subjectCode, `exam-${index}`)

  return {
    id: `${sheetId}-${getStudentId(student)}-${index}`,
    studentName: getStudentName(student),
    registrationNumber: getRegistrationNumber(student),
    academicYear: displayValue(firstValue(sheet.academicYear, sheet.academicYearName, student.academic?.academicYear, '')),
    course: displayValue(firstValue(sheet.course, sheet.courseName, student.academic?.course, '')),
    branch: displayValue(firstValue(sheet.branch, sheet.branchName, student.academic?.branch, '')),
    semester: displayValue(firstValue(sheet.semester, sheet.semesterName, student.academic?.semester, '')),
    section: displayValue(firstValue(sheet.section, sheet.sectionName, student.academic?.section, '')),
    subjectCode: firstValue(sheet.subjectCode, record.subjectCode, ''),
    subjectName: firstValue(sheet.subjectName, sheet.subject, record.subjectName, record.subject, ''),
    examType: firstValue(sheet.examType, sheet.examName, sheet.examinationName, record.examType, ''),
    assessmentType: firstValue(sheet.assessmentType, record.assessmentType, ''),
    examDate: firstValue(sheet.examDate, sheet.examinationDate, sheet.date, record.examDate, ''),
    maxInternal,
    internalMarks,
    maxExternal,
    externalMarks,
    maximumMarks: firstValue(sheet.maximumMarks, sheet.maxMarks, record.maximumMarks, totalMaximum, ''),
    passingMarks: firstValue(sheet.passingMarks, sheet.minimumPassingMarks, record.passingMarks, ''),
    totalMarks,
    grade: firstValue(record.grade, record.resultGrade, ''),
    gradePoint: firstValue(record.gradePoint, record.points, ''),
    status: firstValue(record.status, record.resultStatus, ''),
  }
}

/* export default */ function StudentMarks() {
  const [students, setStudents] = useState([])
  const [resultSheets, setResultSheets] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [course, setCourse] = useState('')
  const [branch, setBranch] = useState('')
  const [semester, setSemester] = useState('')
  const [examType, setExamType] = useState('')
  const [page, setPage] = useState(1)
  const [studentSearch, setStudentSearch] = useState('')
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false)
  const [lookupOptions, setLookupOptions] = useState({ academicYears: [], courses: [], branches: [], examTypes: [] })

  useEffect(() => {
    let active = true
    Promise.allSettled([studentService.getAllProfiles(), resultsService.getResults()]).then(([studentsResult, sheetsResult]) => {
      if (!active) return
      if (studentsResult.status === 'fulfilled') setStudents(Array.isArray(studentsResult.value) ? studentsResult.value : [])
      if (sheetsResult.status === 'fulfilled') setResultSheets(Array.isArray(sheetsResult.value) ? sheetsResult.value : [])
      const errors = [studentsResult, sheetsResult].filter(result => result.status === 'rejected')
      if (errors.length) setLoadError(errors.map(result => result.reason?.message).filter(Boolean).join(' ') || 'Some marks data could not be loaded.')
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    Promise.allSettled([
      academicService.getAcademicYears(false),
      academicService.getCourses({}, false),
      academicService.getBranches(null, false),
      Promise.resolve(getExamTypes()),
    ]).then(([years, courses, branches, exams]) => {
      if (!active) return
      setLookupOptions({
        academicYears: years.status === 'fulfilled' && Array.isArray(years.value) ? years.value : [],
        courses: courses.status === 'fulfilled' && Array.isArray(courses.value) ? courses.value : [],
        branches: branches.status === 'fulfilled' && Array.isArray(branches.value) ? branches.value : [],
        examTypes: exams.status === 'fulfilled' && Array.isArray(exams.value) ? exams.value : [],
      })
    })
    return () => { active = false }
  }, [])

  const studentOptions = useMemo(() => [...students].sort((left, right) => getStudentName(left).localeCompare(getStudentName(right))), [students])
  const selectedStudent = studentOptions.find(student => getStudentId(student) === selectedStudentId)
  const matchingStudents = studentOptions.filter(student => (getStudentName(student) + ' ' + getRegistrationNumber(student)).toLowerCase().includes(studentSearch.trim().toLowerCase()))
  const studentRows = useMemo(() => {
    if (!selectedStudent) return []
    return resultSheets.flatMap((sheet, index) => (Array.isArray(sheet.records) ? sheet.records : [])
      .filter(record => matchesStudent(record, selectedStudent))
      .map(record => resultRow(sheet, record, selectedStudent, index)))
  }, [resultSheets, selectedStudent])

  const optionsFor = key => {
    if (key === 'semester') return Array.from({ length: 8 }, (_, index) => 'Semester ' + (index + 1))
    const values = studentRows.map(row => row[key])
    const add = value => { const label = clean(displayValue(value)); if (label) values.push(label) }
    if (key === 'academicYear') {
      lookupOptions.academicYears.forEach(item => add(firstValue(item.name, item.academicYearName, item.label)))
      students.forEach(student => add(firstValue(student.academic?.academicYear, student.academicYear)))
      resultSheets.forEach(sheet => add(firstValue(sheet.academicYear, sheet.academicYearName)))
    }
    if (key === 'course') {
      lookupOptions.courses.forEach(item => add(firstValue(item.name, item.courseName, item.label)))
      students.forEach(student => add(firstValue(student.academic?.course, student.academic?.courseName, student.course)))
      resultSheets.forEach(sheet => add(firstValue(sheet.course, sheet.courseName)))
    }
    if (key === 'branch') {
      lookupOptions.branches.forEach(item => add(firstValue(item.name, item.branchName, item.label)))
      students.forEach(student => add(firstValue(student.academic?.branch, student.academic?.branchName, student.branch)))
      resultSheets.forEach(sheet => add(firstValue(sheet.branch, sheet.branchName)))
    }
    if (key === 'examType') {
      lookupOptions.examTypes.forEach(item => add(firstValue(item.name, item.examType, item.examTypeName, item.label, item)))
      resultSheets.forEach(sheet => {
      add(firstValue(sheet.examType, sheet.examName, sheet.examinationName))
      ;(Array.isArray(sheet.records) ? sheet.records : []).forEach(record => add(firstValue(record.examType, record.assessmentType)))
      })
    }
    return [...new Set(values.map(value => clean(displayValue(value))).filter(Boolean))].sort((left, right) => left.localeCompare(right))
  }
  const filteredRows = useMemo(() => studentRows.filter(row => {
    const search = query.trim().toLowerCase()
    const matchesSearch = !search || `${row.subjectCode} ${row.subjectName} ${row.examType} ${row.assessmentType}`.toLowerCase().includes(search)
    return matchesSearch
      && (!academicYear || row.academicYear === academicYear)
      && (!course || row.course === course)
      && (!branch || row.branch === branch)
      && (!semester || clean(row.semester).toLowerCase().replace(/^semester\s*/, '') === semester.toLowerCase().replace(/^semester\s*/, ''))
      && (!examType || row.examType === examType)
  }), [studentRows, query, academicYear, course, branch, semester, examType])
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasFilters = Boolean(query || academicYear || course || branch || semester || examType)

  const selectStudent = value => {
    setSelectedStudentId(value)
    setAcademicYear('')
    setCourse('')
    setBranch('')
    setSemester('')
    setExamType('')
    setQuery('')
    setPage(1)
  }
  const clearFilters = () => {
    setQuery('')
    setAcademicYear('')
    setCourse('')
    setBranch('')
    setSemester('')
    setExamType('')
    setPage(1)
  }

  return (
    <DashboardLayout>
      <section className="marks-management-student-marks">
        <PageHeader title="Student Marks" breadcrumb={[{ label: 'Marks Management', link: '/marks-management' }, 'Student Marks']} />
        <MarksModuleNav />

        <article className="erp-card student-marks-card">
          <header className="erp-card-header student-marks-card__header">
            <div><h2 className="erp-card-title">{selectedStudent ? `${getStudentName(selectedStudent)} â€” Marks` : 'Student Marks Records'}</h2><p className="erp-card-subtitle">{selectedStudent ? 'Showing this studentâ€™s details and examination marks.' : 'Select one student to view only their details and marks.'}</p></div>
            {selectedStudent && <div className="student-marks-header-actions"><span className="student-marks-count">{filteredRows.length} {filteredRows.length === 1 ? 'record' : 'records'}</span><button type="button" className="student-marks-back-button" onClick={() => selectStudent('')}>Change Student</button></div>}
          </header>

          {!selectedStudent && <div className="student-marks-student-picker">
            <FiUser aria-hidden="true" />
            <div className="student-marks-student-field"><label htmlFor="student-marks-student-search">Student Name</label><div className="student-marks-student-searchbox"><FiSearch aria-hidden="true" /><input id="student-marks-student-search" type="text" role="combobox" aria-autocomplete="list" aria-expanded={studentDropdownOpen} aria-controls="student-marks-student-options" placeholder={loading ? 'Loading students…' : 'Search or select a student'} value={studentDropdownOpen ? studentSearch : selectedStudent ? (getStudentName(selectedStudent) + (getRegistrationNumber(selectedStudent) ? ' · ' + getRegistrationNumber(selectedStudent) : '')) : studentSearch} disabled={loading || !studentOptions.length} onFocus={() => { setStudentSearch(''); setStudentDropdownOpen(true) }} onClick={() => { if (!studentDropdownOpen) { setStudentSearch(''); setStudentDropdownOpen(true) } }} onChange={event => { setStudentSearch(event.target.value); setStudentDropdownOpen(true) }} onKeyDown={event => { if (event.key === 'Escape') setStudentDropdownOpen(false); if (event.key === 'Enter' && matchingStudents.length) { event.preventDefault(); selectStudent(getStudentId(matchingStudents[0])); setStudentDropdownOpen(false) } }} /></div>{studentDropdownOpen && <ul className="student-marks-student-options" id="student-marks-student-options" role="listbox" aria-label="Students">{matchingStudents.length ? matchingStudents.map(student => <li key={getStudentId(student)} role="option" aria-selected={getStudentId(student) === selectedStudentId}><button type="button" onClick={() => { selectStudent(getStudentId(student)); setStudentDropdownOpen(false); setStudentSearch('') }}><strong>{getStudentName(student)}</strong>{getRegistrationNumber(student) && <span>{getRegistrationNumber(student)}</span>}</button></li>) : <li className="student-marks-student-empty">No students match this search.</li>}</ul>}</div>
          </div>}

          {selectedStudent && <div className="student-marks-profile">
            <div><small>Student</small><strong>{getStudentName(selectedStudent)}</strong></div>
            <div><small>Registration Number</small><strong>{getRegistrationNumber(selectedStudent) || 'â€”'}</strong></div>
            <div><small>Course / Branch</small><strong>{[displayValue(selectedStudent.academic?.course), displayValue(selectedStudent.academic?.branch)].filter(Boolean).join(' / ') || 'â€”'}</strong></div>
            <div><small>Semester / Section</small><strong>{[displayValue(selectedStudent.academic?.semester), displayValue(selectedStudent.academic?.section)].filter(Boolean).join(' / ') || 'â€”'}</strong></div>
          </div>}

          {loadError && <p className="student-marks-error" role="alert">{loadError}</p>}

          {selectedStudent && <FilterPanel
            active={hasFilters}
            onClear={clearFilters}
            className="student-marks-filters"
            actions={<ExportMenu rows={filteredRows} columns={columns} title="Student Marks" filename={`student-marks-${getRegistrationNumber(selectedStudent) || 'records'}`} scope="All matching marks" allowEmpty />}
          >
            <div className="student-marks-search-wrap"><label className="student-marks-search"><FiSearch aria-hidden="true" /><input type="search" aria-label="Search student marks" placeholder="Search subject or exam" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} /></label></div>
            <label className="student-marks-filter"><span>Academic Year</span><select value={academicYear} onChange={event => { setAcademicYear(event.target.value); setPage(1) }}><option value="">All academic years</option>{optionsFor('academicYear').map(value => <option key={value}>{value}</option>)}</select></label>
            <label className="student-marks-filter"><span>Course</span><select value={course} onChange={event => { setCourse(event.target.value); setPage(1) }}><option value="">All courses</option>{optionsFor('course').map(value => <option key={value}>{value}</option>)}</select></label>
            <label className="student-marks-filter"><span>Branch</span><select value={branch} onChange={event => { setBranch(event.target.value); setPage(1) }}><option value="">All branches</option>{optionsFor('branch').map(value => <option key={value}>{value}</option>)}</select></label>
            <label className="student-marks-filter"><span>Semester</span><select value={semester} onChange={event => { setSemester(event.target.value); setPage(1) }}><option value="">All semesters</option>{optionsFor('semester').map(value => <option key={value}>{value}</option>)}</select></label>
            <label className="student-marks-filter"><span>Exam Type</span><select value={examType} onChange={event => { setExamType(event.target.value); setPage(1) }}><option value="">All exam types</option>{optionsFor('examType').map(value => <option key={value}>{value}</option>)}</select></label>
          </FilterPanel>}

          {loading && <p className="student-marks-loading" role="status">Loading students and examination records...</p>}
          {selectedStudent && !loading && filteredRows.length === 0 && <EmptyState title={hasFilters ? 'No matching marks' : 'No examination marks found'} description={hasFilters ? 'Adjust or clear the filters to see more records.' : 'There are no published marks records for this student yet.'} />}
          {selectedStudent && !loading && filteredRows.length > 0 && (
            <div className="student-marks-table-wrap">
              <table className="erp-table student-marks-table">
                <thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead>
                <tbody>{visibleRows.map(row => <tr key={row.id}>{columns.map(column => <td key={column.key}>{clean(row[column.key]) || '—'}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
          {selectedStudent && filteredRows.length > PAGE_SIZE && <TablePagination currentPage={page} totalPages={Math.ceil(filteredRows.length / PAGE_SIZE)} onPageChange={setPage} />}
        </article>
      </section>
    </DashboardLayout>
  )
}
// #endregion pages/examinations/marks-management/StudentMarks.jsx
return {
  get default() { return StudentMarks; }
};
})();

export const SubjectMarksReportModule = (() => {
const { useEffect } = external0;
const { useMemo } = external0;
const { useRef } = external0;
const { useState } = external0;
const { FiBookOpen } = external3;
const { FiSearch } = external3;
const { default: DashboardLayout } = DashboardLayoutModule;
const { default: PageHeader } = PageHeaderModule;
const { default: MarksModuleNav } = MarksModuleNavModule;
const { default: FilterPanel } = FilterPanelModule;
const { default: ExportMenu } = ExportMenuModule;
const { default: TablePagination } = TablePaginationModule;
const { default: EmptyState } = EmptyStateModule;
const { default: resultsService } = resultsServiceModule;
const { default: academicService } = academicServiceModule;
const { getExamTypes } = examServiceModule;
const { default: studentService } = studentServiceModule;
const { default: subjectService } = subjectServiceModule;
/* Imports for isolated regression tests:
import { useEffect, useMemo, useRef, useState } from 'react'
import { FiBookOpen, FiSearch } from 'react-icons/fi'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import MarksModuleNav from './MarksModuleNav'
import FilterPanel from '../../../components/FilterPanel'
import ExportMenu from '../../../components/ExportMenu'
import TablePagination from '../../../components/TablePagination'
import EmptyState from '../../../components/EmptyState'
import resultsService from '../../../services/resultsService'
import academicService from '../../../services/academicService'
import { getExamTypes } from '../../../services/examService'
import studentService from '../../../services/studentService'
import subjectService from '../../../services/subjectService'
import './SubjectMarksReport.css'
*/
// #region pages/examinations/marks-management/SubjectMarksReport.jsx
const PAGE_SIZE = 10
const clean = value => String(value ?? '').trim()
const norm = value => clean(value).toLowerCase()
const first = (...values) => values.find(value => value !== undefined && value !== null && clean(value) !== '')
const display = value => value && typeof value === 'object' ? first(value.name, value.label, value.title, value.value, value.semesterName, '') : value
const getId = student => clean(first(student?.studentId, student?.id))
const getName = student => clean(first(student?.fullName, student?.personal?.fullName, student?.studentName, student?.name, 'Student'))
const getReg = student => clean(first(student?.registrationNumber, student?.application?.registrationNumber, student?.academic?.registrationNumber, student?.academic?.rollNumber, student?.rollNumber, ''))
const keyFor = (code, name) => norm(first(code, name, 'unknown'))
const columns = [['studentName','Student Name'],['registrationNumber','Registration Number'],['academicYear','Academic Year'],['course','Course'],['branch','Branch'],['semester','Semester'],['section','Section'],['subjectCode','Subject Code'],['subjectName','Subject'],['examType','Exam Type'],['assessmentType','Assessment Type'],['examDate','Exam Date'],['maxInternal','Max Internal'],['internalMarks','Internal Marks'],['maxExternal','Max External'],['externalMarks','External Marks'],['maximumMarks','Maximum Marks'],['passingMarks','Passing Marks'],['totalMarks','Total Marks'],['grade','Grade'],['gradePoint','Grade Point'],['status','Result']].map(([key,label]) => ({ key, value:key, label }))

/* export default */ function SubjectMarksReport() {
  const [students,setStudents] = useState([]), [sheets,setSheets] = useState([]), [subjectCatalog,setSubjectCatalog] = useState([]), [lookupOptions,setLookupOptions] = useState({ academicYears: [], courses: [], branches: [], examTypes: [] }), [loading,setLoading] = useState(true), [loadError,setLoadError] = useState('')
  const [subject,setSubject] = useState(''), [subjectQuery,setSubjectQuery] = useState(''), [subjectOpen,setSubjectOpen] = useState(false), [query,setQuery] = useState(''), [year,setYear] = useState(''), [course,setCourse] = useState(''), [branch,setBranch] = useState(''), [semester,setSemester] = useState(''), [exam,setExam] = useState(''), [page,setPage] = useState(1)
  useEffect(() => { let active=true; Promise.allSettled([studentService.getAllProfiles(),resultsService.getResults(),subjectService.getSubjects({liveOnly:true}),subjectService.getSubjects()]).then(([studentsResult,sheetsResult,liveSubjects,localSubjects]) => { if(!active)return; if(studentsResult.status==='fulfilled')setStudents(Array.isArray(studentsResult.value)?studentsResult.value:[]); if(sheetsResult.status==='fulfilled')setSheets(Array.isArray(sheetsResult.value)?sheetsResult.value:[]); const catalogs=[liveSubjects,localSubjects].filter(item=>item.status==='fulfilled').flatMap(item=>Array.isArray(item.value)?item.value:[]); setSubjectCatalog(catalogs); const errors=[studentsResult,sheetsResult].filter(item=>item.status==='rejected'&&!/record not found/i.test(item.reason?.message||'')); if(errors.length)setLoadError(errors.map(item=>item.reason?.message).filter(Boolean).join(' ')||'Some marks data could not be loaded.'); setLoading(false) }); return()=>{active=false} },[])
  useEffect(() => {
    let active = true
    Promise.allSettled([
      academicService.getAcademicYears(false),
      academicService.getCourses({}, false),
      academicService.getBranches(null, false),
      Promise.resolve(getExamTypes()),
    ]).then(([years, courses, branches, exams]) => {
      if (!active) return
      setLookupOptions({
        academicYears: years.status === 'fulfilled' && Array.isArray(years.value) ? years.value : [],
        courses: courses.status === 'fulfilled' && Array.isArray(courses.value) ? courses.value : [],
        branches: branches.status === 'fulfilled' && Array.isArray(branches.value) ? branches.value : [],
        examTypes: exams.status === 'fulfilled' && Array.isArray(exams.value) ? exams.value : [],
      })
    })
    return () => { active = false }
  }, [])
  const studentMap = useMemo(() => { const map=new Map(); students.forEach(s=>[getId(s),getReg(s)].filter(Boolean).forEach(id=>map.set(norm(id),s))); return map },[students])
  const subjects = useMemo(() => { const map=new Map(); [...subjectCatalog,...sheets].forEach(s=>{const code=clean(first(s.subjectCode,s.code,'')), name=clean(first(s.subjectName,s.subject,s.name,s.label,'')), key=keyFor(code,name); if(key!=='unknown'&&!map.has(key))map.set(key,{key,code,name})}); return [...map.values()].sort((a,b)=>(a.name||a.code).localeCompare(b.name||b.code)) },[subjectCatalog,sheets])
  const selected=subjects.find(s=>s.key===subject)
  const subjectPicker=useRef(null)
  const subjectLabel=s=>[s.code,s.name].filter(Boolean).join(' · ')
  const visibleSubjects=subjects.filter(s=>!subjectQuery.trim()||subjectLabel(s).toLowerCase().includes(subjectQuery.trim().toLowerCase()))
  useEffect(()=>{if(!subjectOpen)return undefined;const dismiss=e=>{if(!subjectPicker.current?.contains(e.target))setSubjectOpen(false)};document.addEventListener('pointerdown',dismiss);return()=>document.removeEventListener('pointerdown',dismiss)},[subjectOpen])
  const rows=useMemo(()=>{if(!selected)return[];return sheets.flatMap((sheet,si)=>{const code=clean(first(sheet.subjectCode,sheet.code,'')),name=clean(first(sheet.subjectName,sheet.subject,''));if(keyFor(code,name)!==selected.key)return[];return(Array.isArray(sheet.records)?sheet.records:[]).map((record,ri)=>{const student=studentMap.get(norm(first(record.studentId,record.studentProfileId,record.profileId,record.registrationNumber,record.rollNumber,record.student?.studentId,record.student?.id,'')))||record.student||{};const internal=first(record.internalMarks,record.internal,record.internalScore,''),external=first(record.externalMarks,record.external,record.externalScore,''),total=first(record.totalMarks,record.marksObtained,record.obtainedMarks,internal!==''&&external!==''?Number(internal)+Number(external):'');const maxInternal=first(sheet.maxInternal,sheet.maximumInternalMarks,sheet.internalMaxMarks,record.maxInternal,''),maxExternal=first(sheet.maxExternal,sheet.maximumExternalMarks,sheet.externalMaxMarks,record.maxExternal,'');return{id:String(first(record.studentId,record.id,record.registrationNumber,si+'-'+ri))+'-'+si+'-'+ri,studentName:getName(student)!=='Student'?getName(student):first(record.studentName,record.name,record.student?.name,'Student'),registrationNumber:getReg(student)||first(record.registrationNumber,record.rollNumber,record.enrollmentNo,''),academicYear:display(first(sheet.academicYear,sheet.academicYearName,student.academic?.academicYear,'')),course:display(first(sheet.course,sheet.courseName,student.academic?.course,'')),branch:display(first(sheet.branch,sheet.branchName,student.academic?.branch,'')),semester:display(first(sheet.semester,sheet.semesterName,student.academic?.semester,'')),section:display(first(sheet.section,sheet.sectionName,student.academic?.section,'')),subjectCode:code,subjectName:name,examType:first(sheet.examType,sheet.examName,sheet.examinationName,record.examType,''),assessmentType:first(sheet.assessmentType,record.assessmentType,''),examDate:first(sheet.examDate,sheet.examinationDate,sheet.date,record.examDate,''),maxInternal,internalMarks:internal,maxExternal,externalMarks:external,maximumMarks:first(sheet.maximumMarks,sheet.maxMarks,record.maximumMarks,maxInternal!==''&&maxExternal!==''?Number(maxInternal)+Number(maxExternal):''),passingMarks:first(sheet.passingMarks,sheet.minimumPassingMarks,record.passingMarks,''),totalMarks:total,grade:first(record.grade,record.resultGrade,''),gradePoint:first(record.gradePoint,record.points,''),status:first(record.status,record.resultStatus,'')}})})},[sheets,selected,studentMap])
  const optionsFor = key => {
    if (key === 'semester') return Array.from({ length: 8 }, (_, index) => 'Semester ' + (index + 1))
    const values = rows.map(row => row[key])
    const add = value => { const label = clean(display(value)); if (label) values.push(label) }
    if (key === 'academicYear') {
      lookupOptions.academicYears.forEach(item => add(first(item.name, item.academicYearName, item.label, '')))
      students.forEach(student => add(first(student.academic?.academicYear, student.academicYear, '')))
      sheets.forEach(sheet => add(first(sheet.academicYear, sheet.academicYearName, '')))
    }
    if (key === 'course') {
      lookupOptions.courses.forEach(item => add(first(item.name, item.courseName, item.label, '')))
      students.forEach(student => add(first(student.academic?.course, student.academic?.courseName, student.course, '')))
      sheets.forEach(sheet => add(first(sheet.course, sheet.courseName, '')))
    }
    if (key === 'branch') {
      lookupOptions.branches.forEach(item => add(first(item.name, item.branchName, item.label, '')))
      students.forEach(student => add(first(student.academic?.branch, student.academic?.branchName, student.branch, '')))
      sheets.forEach(sheet => add(first(sheet.branch, sheet.branchName, '')))
    }
    if (key === 'examType') {
      lookupOptions.examTypes.forEach(item => add(first(item.name, item.examType, item.examTypeName, item.label, item, '')))
      sheets.forEach(sheet => {
      add(first(sheet.examType, sheet.examName, sheet.examinationName, ''))
      ;(Array.isArray(sheet.records) ? sheet.records : []).forEach(record => add(first(record.examType, record.assessmentType, '')))
      })
    }
    return [...new Set(values.map(value => clean(display(value))).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  }
  const filtered=useMemo(()=>rows.filter(r=>{const q=query.trim().toLowerCase();return(!q||[r.studentName,r.registrationNumber,r.examType,r.assessmentType].join(' ').toLowerCase().includes(q))&&(!year||r.academicYear===year)&&(!course||r.course===course)&&(!branch||r.branch===branch)&&(!semester||clean(r.semester).toLowerCase().replace(/^semester\s*/,'')===semester.toLowerCase().replace(/^semester\s*/,''))&&(!exam||r.examType===exam)}),[rows,query,year,course,branch,semester,exam])
  const clear=()=>{setQuery('');setYear('');setCourse('');setBranch('');setSemester('');setExam('');setPage(1)}
  const numeric=filtered.map(r=>Number(r.totalMarks)).filter(Number.isFinite), avg=numeric.length?(numeric.reduce((a,b)=>a+b,0)/numeric.length).toFixed(1):'—', outcomes=filtered.map(r=>{const status=norm(r.status);if(status.includes('fail')||status.includes('not pass'))return false;if(status.includes('pass'))return true;const threshold=Number(r.passingMarks),marks=Number(r.totalMarks);return r.passingMarks!==''&&Number.isFinite(threshold)&&Number.isFinite(marks)?marks>=threshold:null}).filter(value=>value!==null), passed=outcomes.filter(Boolean).length, passRate=outcomes.length?Math.round(passed/outcomes.length*100)+'%':'—'
  const active=Boolean(query||year||course||branch||semester||exam), visible=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE)
  return <DashboardLayout><section className="marks-management-subject-marks-report"><PageHeader title="Subject Marks Report" breadcrumb={[{label:'Marks Management',link:'/marks-management'},'Subject Marks Report']}/><MarksModuleNav/><article className="erp-card subject-marks-report-card"><header className="erp-card-header subject-marks-report-card__header"><div><h2 className="erp-card-title">Subject Marks Report</h2><p className="erp-card-subtitle">Review and export student performance for a subject across examinations.</p></div>{selected&&<span className="subject-marks-report-count">{filtered.length} {filtered.length===1?'record':'records'}</span>}</header>
  <div className="subject-marks-report-picker" ref={subjectPicker}><FiBookOpen aria-hidden="true"/><div className="subject-marks-report-subject-field"><label htmlFor="subject-marks-subject-search">Subject</label><div className="subject-marks-report-subject-search"><FiSearch aria-hidden="true"/><input id="subject-marks-subject-search" type="text" role="combobox" aria-autocomplete="list" aria-expanded={subjectOpen} aria-controls="subject-marks-subject-options" placeholder={loading?'Loading subjects…':'Search or select a subject'} value={subjectOpen?subjectQuery:(selected?subjectLabel(selected):subjectQuery)} disabled={loading||!subjects.length} onFocus={()=>{setSubjectQuery('');setSubjectOpen(true)}} onClick={()=>{if(!subjectOpen){setSubjectQuery('');setSubjectOpen(true)}}} onChange={e=>{setSubjectQuery(e.target.value);setSubjectOpen(true)}} onKeyDown={e=>{if(e.key==='Escape')setSubjectOpen(false);if(e.key==='Enter'&&visibleSubjects.length){e.preventDefault();const choice=visibleSubjects[0];setSubject(choice.key);setSubjectQuery(subjectLabel(choice));setSubjectOpen(false);clear()}}}/></div>{subjectOpen&&<ul className="subject-marks-report-subject-options" id="subject-marks-subject-options" role="listbox" aria-label="Subjects">{visibleSubjects.length?visibleSubjects.map(s=><li key={s.key} role="option" aria-selected={s.key===subject}><button type="button" onClick={()=>{setSubject(s.key);setSubjectQuery(subjectLabel(s));setSubjectOpen(false);clear()}}>{s.code&&<strong>{s.code}</strong>}<span>{s.name||s.code}</span></button></li>):<li className="subject-marks-report-no-subjects">No subjects match this search.</li>}</ul>}</div></div>
  {selected&&<><div className="subject-marks-report-summary"><div><small>Subject</small><strong>{selected.name||selected.code}</strong></div><div><small>Students with marks</small><strong>{filtered.length}</strong></div><div><small>Average marks</small><strong>{avg}</strong></div><div><small>Pass rate</small><strong>{passRate}</strong></div></div>
  <FilterPanel active={active} onClear={clear} className="subject-marks-report-filters" actions={<ExportMenu rows={filtered} columns={columns} title="Subject Marks Report" filename={'subject-marks-'+(selected.code||selected.name||'report')} scope="All matching marks" allowEmpty/>}><div className="subject-marks-report-search-wrap"><label className="subject-marks-report-search"><FiSearch aria-hidden="true"/><input type="search" aria-label="Search subject marks" placeholder="Search student or exam" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/></label></div>
  <label className="subject-marks-report-filter"><span>Academic Year</span><select value={year} onChange={e=>{setYear(e.target.value);setPage(1)}}><option value="">All academic years</option>{optionsFor('academicYear').map(v=><option key={v}>{v}</option>)}</select></label><label className="subject-marks-report-filter"><span>Course</span><select value={course} onChange={e=>{setCourse(e.target.value);setPage(1)}}><option value="">All courses</option>{optionsFor('course').map(v=><option key={v}>{v}</option>)}</select></label><label className="subject-marks-report-filter"><span>Branch</span><select value={branch} onChange={e=>{setBranch(e.target.value);setPage(1)}}><option value="">All branches</option>{optionsFor('branch').map(v=><option key={v}>{v}</option>)}</select></label><label className="subject-marks-report-filter"><span>Semester</span><select value={semester} onChange={e=>{setSemester(e.target.value);setPage(1)}}><option value="">All semesters</option>{optionsFor('semester').map(v=><option key={v}>{v}</option>)}</select></label><label className="subject-marks-report-filter"><span>Exam Type</span><select value={exam} onChange={e=>{setExam(e.target.value);setPage(1)}}><option value="">All exam types</option>{optionsFor('examType').map(v=><option key={v}>{v}</option>)}</select></label></FilterPanel></>}
  {loadError&&<p className="subject-marks-report-error" role="alert">{loadError}</p>}{loading&&<p className="subject-marks-report-loading" role="status">Loading subjects and examination records...</p>}{!loading&&!selected&&!subjects.length&&<EmptyState title="No subject marks found" description="Published result sheets will appear here once they are available."/>}{selected&&!loading&&!filtered.length&&<EmptyState title={active?'No matching marks':'No examination marks found'} description={active?'Adjust or clear the filters to see more records.':'There are no published marks records for this subject yet.'}/>}
  {selected&&!loading&&filtered.length>0&&<div className="subject-marks-report-table-wrap"><table className="erp-table subject-marks-report-table"><thead><tr>{columns.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{visible.map(row=><tr key={row.id}>{columns.map(c=><td key={c.key}>{clean(row[c.key])||'—'}</td>)}</tr>)}</tbody></table></div>}{selected&&filtered.length>PAGE_SIZE&&<TablePagination currentPage={page} totalPages={Math.ceil(filtered.length/PAGE_SIZE)} onPageChange={setPage}/>}</article></section></DashboardLayout>
}
// #endregion pages/examinations/marks-management/SubjectMarksReport.jsx
return {
  get default() { return SubjectMarksReport; }
};
})();

export const MarksApprovalModule = (() => {
const { useCallback } = external0;
const { useEffect } = external0;
const { useMemo } = external0;
const { useState } = external0;
const { FiCheck } = external3;
const { FiEye } = external3;
const { FiSearch } = external3;
const { FiX } = external3;
const { default: DashboardLayout } = DashboardLayoutModule;
const { default: PageHeader } = PageHeaderModule;
const { default: MarksModuleNav } = MarksModuleNavModule;
const { default: FilterPanel } = FilterPanelModule;
const { default: ExportMenu } = ExportMenuModule;
const { default: StatusBadge } = StatusBadgeModule;
const { default: ViewDialog } = ViewDialogModule;
const { default: TablePagination } = TablePaginationModule;
const { default: EmptyState } = EmptyStateModule;
const { default: SearchableSelect } = SearchableSelectModule;
const { useAcademic } = AcademicContextModule;
const { default: resultsService } = resultsServiceModule;
const { default: subjectService } = subjectServiceModule;
const { default: facultyService } = facultyServiceModule;
const { getExamTypes } = examServiceModule;
const { default: studentService } = studentServiceModule;
const { getUserRole } = authModule;
const { collegeStorageKey } = collegeScopeModule;
const { showError } = toastModule;
const { showSuccess } = toastModule;
const { default: eventBus } = eventBusModule;
const { ERP_EVENTS } = eventBusModule;
/* Imports for isolated regression tests:
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiCheck, FiEye, FiSearch, FiX } from 'react-icons/fi'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import MarksModuleNav from './MarksModuleNav'
import FilterPanel from '../../../components/FilterPanel'
import ExportMenu from '../../../components/ExportMenu'
import StatusBadge from '../../../components/StatusBadge'
import ViewDialog from '../../../components/ViewDialog'
import TablePagination from '../../../components/TablePagination'
import EmptyState from '../../../components/EmptyState'
import SearchableSelect from '../../../components/SearchableSelect'
import { useAcademic } from '../../../context/AcademicContext'
import resultsService from '../../../services/resultsService'
import subjectService from '../../../services/subjectService'
import facultyService from '../../../services/facultyService'
import { getExamTypes } from '../../../services/examService'
import studentService from '../../../services/studentService'
import { getUserRole } from '../../../auth/auth'
import { collegeStorageKey } from '../../../utils/collegeScope'
import { showError, showSuccess } from '../../../utils/toast'
import eventBus, { ERP_EVENTS } from '../../../services/eventBus'
import './MarksApproval.css'
*/
// #region pages/examinations/marks-management/MarksApproval.jsx
const PAGE_SIZE = 10
const approvalColumns=[['subject','Subject'],['subjectCode','Subject Code'],['faculty','Faculty'],['course','Course'],['branch','Branch'],['semester','Semester'],['section','Section'],['exam','Exam'],['totalStudents','Students'],['average','Average Marks'],['submittedAt','Submitted On'],['status','Status']].map(([key,label])=>({key,value:key,label}))
const WORKFLOW_KEY = collegeStorageKey('marks-approval-workflow-v1')
const clean = value => String(value ?? '').trim()
const norm = value => clean(value).toLowerCase().replace(/[_-]+/g,' ')
const semesterNumber = value => { const text=norm(value); const digits=text.match(/\d+/)?.[0]; if(digits)return String(Number(digits)); const roman={i:'1',ii:'2',iii:'3',iv:'4',v:'5',vi:'6',vii:'7',viii:'8'}; return roman[text.replace(/^semester\s*/,'')]||text }
const first = (...values) => values.find(value => value !== undefined && value !== null && clean(value) !== '')
const label = value => value && typeof value === 'object' ? first(value.name,value.label,value.title,value.value,value.academicYearName,value.courseName,value.branchName,value.semesterName,value.sectionName,value.semesterNumber,value.subjectName,value.facultyName,value.fullName,value.examType,'') : value
const sameField = (key,left,right,batch) => key==='semester'?semesterNumber(left)===semesterNumber(right):key==='exam'?(norm(left)===norm(right)||norm(batch?.examType)===norm(right)):norm(left)===norm(right)
const options = (master, rows, keys) => { const values=[...(master||[]).map(item=>label(item)),...(rows||[]).map(row=>keys.map(key=>label(row?.[key])).find(value=>clean(value)))]; return [...new Map(values.map(value=>[norm(value),clean(value)]).filter(([key,value])=>key&&value)).values()].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})) }
const readWorkflow = () => { try { const value=JSON.parse(localStorage.getItem(WORKFLOW_KEY)||'{}'); return value&&typeof value==='object'?value:{} } catch { return {} } }
const writeWorkflow = value => { try { localStorage.setItem(WORKFLOW_KEY,JSON.stringify(value)); window.dispatchEvent(new CustomEvent('marks-approval-updated')) } catch { throw new Error('Approval status could not be saved in this browser.') } }
const getId = (sheet,index) => String(first(sheet.id,sheet.resultId,sheet.resultSheetId,sheet.approvalId,sheet.subjectCode+'-'+sheet.section+'-'+sheet.examType+'-'+index,'submission-'+index))
const getStatus = sheet => { const value=first(sheet.approvalStatus,sheet.approval?.status,sheet.approvalState,sheet.workflowStatus,sheet.reviewStatus,sheet.status); const key=norm(value); if(key==='submitted'||key==='under review')return 'Pending'; return ['pending','approved','rejected','published'].includes(key)?value:'Pending' }
const dateLabel = value => { if(!value)return '—'; const date=new Date(value); return Number.isNaN(date.valueOf())?String(value):new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric'}).format(date) }
const getRoll = student => first(student.rollNumber,student.registrationNumber,student.enrollmentNo,student.admissionNumber,student.studentCode,'')
const getStudentName = student => first(student.studentName,student.name,student.fullName,student.personal?.fullName,student.student?.name,'Student')
const marksValue = student => { const direct=first(student.totalMarks,student.marksObtained,student.obtainedMarks); if(direct!==undefined)return number(direct); const internal=first(student.internalMarks,student.internal,student.internalScore),external=first(student.externalMarks,student.external,student.externalScore); if(internal===undefined&&external===undefined)return null; return (number(internal)||0)+(number(external)||0) }
const number = value => value!==undefined&&value!==null&&clean(value)!==''&&Number.isFinite(Number(value))?Number(value):null
const combinedMaximum = sheet => { const direct=number(first(sheet.maximumMarks,sheet.maxMarks)); if(direct!==null)return direct; const internal=number(sheet.maxInternal),external=number(sheet.maxExternal); return internal!==null||external!==null?(internal||0)+(external||0):'' }
const groupRows = (sheet,index,workflow,studentIndex) => {
  const recordRows=Array.isArray(sheet.records)?sheet.records:[]
  const students=recordRows.map((record,ri)=>{const id=String(first(record.studentId,record.studentProfileId,record.profileId,''));const profile=studentIndex.get(norm(id))||{};const total=marksValue(record);const max=first(record.maximumMarks,combinedMaximum(sheet));const pct=number(max)&&number(total)!==null?Math.round(number(total)/number(max)*100):null;return {id:id||String(ri),rollNumber:first(getRoll(record),getRoll(profile),'—'),studentName:getStudentName(profile.studentId?profile:record),marksObtained:total,maximumMarks:max,percentage:pct===null?'—':pct+'%',grade:first(record.grade,record.resultGrade,'—'),result:first(record.resultStatus,record.status,record.grade==='F'?'Fail':'—')}})
  const totals=students.map(student=>number(student.marksObtained)).filter(value=>value!==null)
  const state=workflow[getId(sheet,index)]||{}
  const approvals=Array.isArray(state.history)?state.history:(Array.isArray(sheet.approvalHistory)?sheet.approvalHistory:[])
  const history=approvals.length?approvals:[{date:first(sheet.submittedAt,sheet.createdAt,sheet.createdDate),user:first(sheet.submittedBy,sheet.facultyName,sheet.faculty,'Faculty'),action:'Submitted',remarks:'—'}]
  const subject=first(sheet.subjectName,sheet.subject,sheet.courseSubject,'—'), subjectCode=first(sheet.subjectCode,sheet.code,'—')
  return { id:getId(sheet,index), source:sheet, subject,subjectCode,faculty:label(first(sheet.facultyName,sheet.faculty?.name,sheet.faculty,sheet.createdByName,'—')), academicYear:label(first(sheet.academicYear,sheet.academicYearName,sheet.yearName,'')), course:label(first(sheet.course,sheet.courseName,'')), branch:label(first(sheet.branch,sheet.branchName,sheet.department,'')), semester:label(first(sheet.semester,sheet.semesterName,'')), section:label(first(sheet.section,sheet.sectionName,'')), exam:first(sheet.examName,sheet.examinationName,sheet.examType,sheet.exam,'—'), examType:first(sheet.examType,sheet.examName,''), maximumMarks:first(combinedMaximum(sheet),'—'), passingMarks:first(sheet.passingMarks,sheet.minimumPassingMarks,'—'), submittedAt:first(sheet.submittedAt,sheet.submissionDate,sheet.createdAt,sheet.createdDate,''),status:state.status||getStatus(sheet), approvedBy:state.approvedBy||sheet.approvedBy||sheet.approval?.approvedBy||'', approvedAt:state.approvedAt||sheet.approvedAt||sheet.approval?.approvedAt||'', remarks:state.remarks||sheet.rejectionReason||sheet.approvalRemarks||'',history,students,totalStudents:students.length||Number(sheet.totalStudents)||0,average:totals.length?(totals.reduce((a,b)=>a+b,0)/totals.length):number(sheet.averageMarks),highest:totals.length?Math.max(...totals):number(sheet.highestMarks),lowest:totals.length?Math.min(...totals):number(sheet.lowestMarks),passed:students.filter(row=>norm(row.result).includes('pass')||(!row.result||row.result==='—')&&number(row.marksObtained)!==null&&number(row.marksObtained)>=number(sheet.passingMarks)).length,failed:students.filter(row=>norm(row.result).includes('fail')).length }
}
const approverRoles=new Set(['admin','college_admin','super_admin','hod','department_head','exam_cell','examcell','exam_officer','exam_office'])
const currentUser=()=>{try{return localStorage.getItem('btech-user-name')||sessionStorage.getItem('btech-user-name')||'Current user'}catch{return 'Current user'}}

function DecisionDialog({kind,batch,onCancel,onConfirm,busy}) {
  const [remarks,setRemarks]=useState('')
  const reject=kind==='reject'
  const submit=event=>{event.preventDefault();if(reject&&!remarks.trim())return;onConfirm(remarks.trim())}
  return <div className="marks-approval-dialog-backdrop" role="presentation" onMouseDown={event=>event.target===event.currentTarget&&!busy&&onCancel()}><section className="marks-approval-decision" role="alertdialog" aria-modal="true" aria-labelledby="marks-approval-decision-title"><button className="marks-approval-decision__close" type="button" aria-label="Close" onClick={onCancel} disabled={busy}><FiX/></button><div className={'marks-approval-decision__icon '+(reject?'is-reject':'')} aria-hidden="true">{reject?<FiX/>:<FiCheck/>}</div><h2 id="marks-approval-decision-title">{reject?'Reject Marks':'Approve Marks'}</h2><p>{reject?'Review this submission and provide a reason for rejection.':'Please confirm the submitted marks after review.'}</p><dl><div><dt>Subject</dt><dd>{batch.subject}</dd></div><div><dt>Subject Code</dt><dd>{batch.subjectCode}</dd></div><div><dt>Faculty</dt><dd>{batch.faculty}</dd></div><div><dt>Exam</dt><dd>{batch.exam}</dd></div><div><dt>Students</dt><dd>{batch.totalStudents}</dd></div></dl><form onSubmit={submit}><label>{reject?'Rejection Reason *':'Approval Remarks (optional)'}<textarea rows="3" value={remarks} onChange={event=>setRemarks(event.target.value)} required={reject} placeholder={reject?'Explain what needs correction':'Add a note for the approval history'}/></label><footer><button className="erp-btn erp-btn--secondary" type="button" onClick={onCancel} disabled={busy}>Cancel</button><button className={'erp-btn '+(reject?'erp-btn--danger':'erp-btn--primary')} type="submit" disabled={busy||(reject&&!remarks.trim())}>{busy?(reject?'Rejecting marks…':'Approving marks…'):(reject?'Reject Marks':'Confirm Approval')}</button></footer></form></section></div>
}

/* export default */ function MarksApproval() {
  const academic=useAcademic()
  const role=getUserRole()||''
  const facultyUser=role==='faculty'
  const canDecide=approverRoles.has(role)
  const forbidden=role==='student'
  const [sheets,setSheets]=useState([]),[students,setStudents]=useState([]),[subjectCatalog,setSubjectCatalog]=useState([]),[facultyCatalog,setFacultyCatalog]=useState([]),[examCatalog]=useState(()=>{try{return getExamTypes()}catch{return []}}),[workflow,setWorkflow]=useState(readWorkflow),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[search,setSearch]=useState(''),[statusFilter,setStatusFilter]=useState('All'),[appliedStatus,setAppliedStatus]=useState('All'),[filters,setFilters]=useState({academicYear:'',course:'',branch:'',semester:'',subject:'',exam:'',faculty:''}),[applied,setApplied]=useState(null),[page,setPage]=useState(1),[selected,setSelected]=useState(null),[decision,setDecision]=useState(''),[busy,setBusy]=useState(false)
  const load=useCallback(async()=>{if(forbidden){setLoading(false);return}setLoading(true);setLoadError('');try{const [resultResponse,profileResponse]=await Promise.allSettled([resultsService.getResults(),studentService.getAllProfiles()]);if(resultResponse.status==='rejected')throw resultResponse.reason;setSheets(Array.isArray(resultResponse.value)?resultResponse.value:[]);setStudents(profileResponse.status==='fulfilled'&&Array.isArray(profileResponse.value)?profileResponse.value:[]);if(profileResponse.status==='rejected')setLoadError('Student profile data is unavailable; student names may be incomplete.');setWorkflow(readWorkflow())}catch(error){setLoadError(error?.message||'Marks submissions could not be loaded. Please retry.');showError(error)}finally{setLoading(false)}},[forbidden])
  useEffect(()=>{load();const refresh=()=>load();const unsubscribe=eventBus.subscribe(ERP_EVENTS.RESULTS_RECORDED,refresh);const changed=()=>{setWorkflow(readWorkflow());load()};window.addEventListener('marks-approval-updated',changed);window.addEventListener('focus',refresh);return()=>{unsubscribe();window.removeEventListener('marks-approval-updated',changed);window.removeEventListener('focus',refresh)}},[load])
  useEffect(()=>{let active=true;Promise.allSettled([subjectService.getSubjects({liveOnly:true}),facultyService.list()]).then(([subjects,faculty])=>{if(!active)return;if(subjects.status==='fulfilled')setSubjectCatalog(Array.isArray(subjects.value)?subjects.value:[]);if(faculty.status==='fulfilled')setFacultyCatalog(Array.isArray(faculty.value)?faculty.value:[])});return()=>{active=false}},[])
  const studentIndex=useMemo(()=>{const map=new Map();students.forEach(s=>[s.studentId,s.id,s.registrationNumber,s.application?.registrationNumber,s.academic?.rollNumber].filter(Boolean).forEach(id=>map.set(norm(id),s)));return map},[students])
  const batches=useMemo(()=>sheets.map((sheet,index)=>groupRows(sheet,index,workflow,studentIndex)),[sheets,workflow,studentIndex])
  const masters={academicYear:academic.academicYears,course:academic.courses,branch:academic.branches,semester:academic.semesters,section:academic.sections}
  const subjectOptions=useMemo(()=>{const found=new Map();[...subjectCatalog,...batches.map(batch=>({subjectName:batch.subject,subjectCode:batch.subjectCode}))].forEach(item=>{const name=clean(first(item.subjectName,item.name,item.label,item.subject)),code=clean(first(item.subjectCode,item.code,''));if(name){const key=norm(name);if(!found.has(key))found.set(key,{value:name,label:name,code})}});return [...found.values()].sort((a,b)=>a.label.localeCompare(b.label))},[subjectCatalog,batches])
  const filterOptions={academicYear:options(masters.academicYear,batches,['academicYear']),course:options(masters.course,batches,['course']),branch:options(masters.branch,batches,['branch']),semester:Array.from({length:8},(_,index)=>'Semester '+(index+1)),subject:subjectOptions,exam:options(examCatalog,batches,['exam','examType']),faculty:options(facultyCatalog,batches,['faculty'])}
  const facultyName=currentUser()
  const inScope=useMemo(()=>batches.filter(batch=>!facultyUser||norm(batch.faculty)===norm(facultyName)),[batches,facultyUser,facultyName])
  const baseRows=useMemo(()=>inScope.filter(batch=>!applied||Object.entries(applied).every(([key,value])=>!value||sameField(key,batch[key],value,batch))),[inScope,applied])
  const rows=useMemo(()=>baseRows.filter(batch=>(appliedStatus==='All'||norm(batch.status)===norm(appliedStatus))&&(!search.trim()||[batch.subject,batch.subjectCode,batch.faculty].some(value=>norm(value).includes(norm(search))))),[baseRows,appliedStatus,search])
  const countRows=baseRows
  const counts={total:countRows.length,pending:countRows.filter(row=>norm(row.status)==='pending'||norm(row.status)==='submitted').length,approved:countRows.filter(row=>norm(row.status)==='approved').length,rejected:countRows.filter(row=>norm(row.status)==='rejected').length}
  const visible=rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE)
  const applyFilters=event=>{event.preventDefault();if(!filters.academicYear||!filters.course||!filters.branch||!filters.semester){showError('Select Academic Year, Course, Branch and Semester before applying filters.');return}setApplied({...filters});setAppliedStatus(statusFilter);setPage(1)}
  const resetFilters=()=>{const empty={academicYear:'',course:'',branch:'',semester:'',subject:'',exam:'',faculty:''};setFilters(empty);setApplied(null);setSearch('');setStatusFilter('All');setAppliedStatus('All');setPage(1)}
  const decisionFor=(batch,kind)=>{setSelected(batch);setDecision(kind)}
  const confirmDecision=remarks=>{if(!selected||!canDecide||norm(selected.status)!=='pending')return;setBusy(true);try{const now=new Date().toISOString(),action=decision==='approve'?'Approved':'Rejected',entry={date:now,user:currentUser(),action,remarks:remarks||'—'};const next={...workflow,[selected.id]:{status:action,history:[...selected.history,entry],...(decision==='approve'?{approvedBy:currentUser(),approvedAt:now,remarks}:{rejectionReason:remarks})}};writeWorkflow(next);setWorkflow(next);setDecision('');setSelected(current=>current?{...current,status:action,history:[...current.history,entry],...(decision==='approve'?{approvedBy:currentUser(),approvedAt:now,remarks}:{remarks})}:null);showSuccess(decision==='approve'?'Marks approved successfully.':'Marks rejected successfully.')}catch(error){showError(error)}finally{setBusy(false)}}
  const allOptions=(values,key)=>values.map(value=>typeof value==='object'?value:{value,label:key==='semester'&&/^\d+$/.test(semesterNumber(value))?'Semester '+semesterNumber(value):value})
  const setField=(key,value)=>setFilters(current=>({...current,[key]:value}))
  const formatAverage=batch=>batch.average===null?'—':Number(batch.average).toFixed(1)+' / '+batch.maximumMarks
  const statusTag=status=><StatusBadge value={status}/>
  const detailFields=selected?[['Subject',selected.subject],['Subject Code',selected.subjectCode],['Faculty',selected.faculty],['Course',selected.course],['Branch',selected.branch],['Academic Year',selected.academicYear],['Semester',selected.semester],['Section',selected.section||'—'],['Exam',selected.exam],['Maximum Marks',selected.maximumMarks],['Passing Marks',selected.passingMarks],['Submitted Date',dateLabel(selected.submittedAt)],['Current Status',statusTag(selected.status)],...(selected.approvedBy?[['Approved By',selected.approvedBy],['Approved Date',dateLabel(selected.approvedAt)]]:[]),...(norm(selected.status)==='rejected'?[['Rejection Reason',selected.remarks||'—']]:[])]:[]
  return <DashboardLayout><section className="marks-management-marks-approval"><PageHeader title="Marks Approval" breadcrumb={[{label:'Marks Management',link:'/marks-management'},'Marks Approval']}/><MarksModuleNav/><header className="marks-approval-intro"><h2>Marks Approval</h2><p>Review, verify and approve submitted student marks.</p></header>
    {forbidden?<article className="erp-card marks-approval-forbidden"><EmptyState title="Access restricted" description="Students cannot access Marks Approval."/></article>:<>
    <section className="marks-approval-summary" aria-label="Submission summary">{[['Total Submissions',counts.total,'total'],['Pending',counts.pending,'pending'],['Approved',counts.approved,'approved'],['Rejected',counts.rejected,'rejected']].map(([title,value,tone])=><article className={'erp-card marks-approval-stat marks-approval-stat--'+tone} key={title}><span>{title}</span><strong>{value}</strong></article>)}</section>
    <article className="erp-card marks-approval-filter-card"><form onSubmit={applyFilters}><FilterPanel className="marks-approval-filter-panel" active={Boolean(applied&&Object.values(applied).some(Boolean)||appliedStatus!=='All')} onClear={resetFilters} hideClear leadingActions={<ExportMenu rows={rows} columns={approvalColumns} title="Marks Approval" filename="marks-approval-submissions" scope="Filtered submissions" allowEmpty/>}>
      <div className="marks-approval-filter-layout"><label className="marks-approval-filter-search"><FiSearch aria-hidden="true"/><input type="search" aria-label="Search marks submissions" placeholder="Search subject, subject code or faculty" value={search} onChange={event=>{setSearch(event.target.value);setPage(1)}}/></label><div className="marks-approval-dropdown-grid">
      {['academicYear','course','branch','semester','subject','exam','faculty'].map(key=><div className="marks-approval-filter" key={key}><span className="marks-approval-filter-label">{{academicYear:'Academic Year *',course:'Course *',branch:'Branch *',semester:'Semester *',subject:'Subject',exam:'Exam',faculty:'Faculty'}[key]}</span><SearchableSelect label={{academicYear:'Academic Year *',course:'Course *',branch:'Branch *',semester:'Semester *',subject:'Subject',exam:'Exam',faculty:'Faculty'}[key]} value={filters[key]} options={allOptions(filterOptions[key],key)} onChange={value=>setField(key,value)} placeholder={'All '+({academicYear:'academic years',course:'courses',branch:'branches',semester:'semesters',subject:'subjects',exam:'exams',faculty:'faculty'}[key])} searchPlaceholder={'Search '+key}/></div>)}
      <label className="marks-approval-filter marks-approval-status-filter"><span>Status</span><select value={statusFilter} onChange={event=>{setStatusFilter(event.target.value);setPage(1)}}><option>All</option><option>Pending</option><option>Approved</option><option>Rejected</option></select></label><div className="marks-approval-filter-actions"><button className="erp-btn erp-btn--primary" type="submit">Apply Filters</button></div>
      </div></div>
    </FilterPanel></form></article>
    <article className="erp-card marks-approval-table-card"><header className="erp-card-header"><div><h2 className="erp-card-title">Submitted Marks</h2><p className="erp-card-subtitle">{rows.length} submission{rows.length===1?'':'s'} match the current filters.</p></div></header>
      {loadError&&<div className="marks-approval-error" role="alert"><span>{loadError}</span><button type="button" className="erp-btn erp-btn--secondary" onClick={load}>Retry</button></div>}
      {loading?<p className="marks-approval-loading" role="status">Loading submissions...</p>:!rows.length?<EmptyState title="No marks submissions found." description="Try changing your filters or check whether faculty have submitted marks."/>:<div className="marks-approval-table-wrap"><table className="erp-table marks-approval-table"><thead><tr>{['Subject','Subject Code','Faculty','Course','Branch','Semester','Section','Exam','Students','Average Marks','Submitted On','Status','Action'].map(col=><th key={col}>{col}</th>)}</tr></thead><tbody>{visible.map(batch=><tr key={batch.id}><td>{batch.subject}</td><td>{batch.subjectCode}</td><td>{batch.faculty}</td><td>{batch.course||'—'}</td><td>{batch.branch||'—'}</td><td>{batch.semester||'—'}</td><td>{batch.section||'—'}</td><td>{batch.exam}</td><td>{batch.totalStudents}</td><td>{formatAverage(batch)}</td><td>{dateLabel(batch.submittedAt)}</td><td>{statusTag(batch.status)}</td><td><button type="button" className="marks-approval-view-btn" onClick={()=>setSelected(batch)}><FiEye aria-hidden="true"/> View</button></td></tr>)}</tbody></table></div>}
      {!loading&&rows.length>PAGE_SIZE&&<TablePagination currentPage={page} totalPages={Math.ceil(rows.length/PAGE_SIZE)} onPageChange={setPage}/>}
    </article>
    {selected&&<ViewDialog title="Marks Approval Details" subtitle={selected.subject+' · '+selected.subjectCode} onClose={()=>setSelected(null)} maxWidth="1100px" footerActions={canDecide&&norm(selected.status)==='pending'?<><button className="erp-btn erp-btn--danger" type="button" onClick={()=>decisionFor(selected,'reject')}>Reject</button><button className="erp-btn erp-btn--primary" type="button" onClick={()=>decisionFor(selected,'approve')}>Approve</button></>:null}>
      <dl className="marks-approval-details-grid">{detailFields.map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
      <div className="marks-approval-detail-summary">{[['Total Students',selected.totalStudents],['Average Marks',selected.average===null?'—':Number(selected.average).toFixed(1)],['Highest Marks',selected.highest??'—'],['Lowest Marks',selected.lowest??'—'],['Passed',selected.passed],['Failed',selected.failed]].map(([name,value])=><div key={name}><small>{name}</small><strong>{value}</strong></div>)}</div>
      {norm(selected.status)==='rejected'&&<p className="marks-approval-rejection-note"><strong>Rejection reason:</strong> {selected.remarks||'—'} Faculty can correct marks from the existing Edit Marks screen and resubmit.</p>}
      <h3 className="marks-approval-section-title">Student Marks Review</h3>{selected.students.length?<div className="marks-approval-students-wrap"><table className="erp-table marks-approval-students"><thead><tr>{['Roll Number','Student Name','Marks Obtained','Maximum Marks','Percentage','Grade','Result'].map(col=><th key={col}>{col}</th>)}</tr></thead><tbody>{selected.students.map(row=><tr key={row.id}><td>{row.rollNumber}</td><td>{row.studentName}</td><td>{row.marksObtained??'—'}</td><td>{row.maximumMarks??selected.maximumMarks}</td><td>{row.percentage}</td><td>{row.grade}</td><td>{row.result}</td></tr>)}</tbody></table></div>:<EmptyState title="Student marks are unavailable" description="This submission does not include individual student records."/>}
      <h3 className="marks-approval-section-title">Approval History</h3><ol className="marks-approval-history">{selected.history.map((entry,index)=><li key={index}><span className="marks-approval-history__dot"/><div><div className="marks-approval-history__head"><strong>{first(entry.action,entry.status,'Updated')}</strong><time>{dateLabel(first(entry.date,entry.createdAt))}</time></div><p>{first(entry.user,entry.userName,entry.approvedBy,'—')} {entry.remarks&&entry.remarks!=='—'?'· '+entry.remarks:''}</p></div></li>)}</ol>
      <div className="marks-approval-workflow" aria-label="Marks status workflow"><span>Draft</span><i>→</i><span>Submitted</span><i>→</i><span className={norm(selected.status)==='pending'?'is-current':''}>Pending</span><i>→</i><span className={norm(selected.status)==='approved'?'is-current':''}>{norm(selected.status)==='approved'?'Approved':'Approved / Rejected'}</span><i>→</i><span>Published</span></div>
    </ViewDialog>}
    {decision&&selected&&<DecisionDialog key={decision+selected.id} kind={decision} batch={selected} onCancel={()=>setDecision('')} onConfirm={confirmDecision} busy={busy}/>}
    </>}
  </section></DashboardLayout>
}
// #endregion pages/examinations/marks-management/MarksApproval.jsx
return {
  get default() { return MarksApproval; }
};
})();

export const MarksManagement = MarksManagementModule.default;
export const MarksModuleNav = MarksModuleNavModule.default;
export const MarksEntry = MarksEntryModule.default;
export const BulkMarksUpload = BulkMarksUploadModule.default;
export const EditMarks = EditMarksModule.default;
export const StudentMarks = StudentMarksModule.default;
export const SubjectMarksReport = SubjectMarksReportModule.default;
export const MarksApproval = MarksApprovalModule.default;
