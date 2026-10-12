// Pages and helpers in this module retain their own isolated scopes.
import * as external0 from "react";
import * as external1 from "react-router-dom";
import * as external3 from "react-icons/fi";
import { gradeResultModelModule, gradeScreensModule } from "../../../components/components.jsx";
import { DashboardLayoutModule, PageHeaderModule, FilterPanelModule, ExportMenuModule, TablePaginationModule, AcademicContextModule } from "../../../components/components.jsx";
import { resultsServiceModule } from "../../../API/apiendpoints.jsx";

export const GradeResultManagementModule = (() => {
const { Navigate } = external1;
/* Imports for isolated regression tests:
import { Navigate } from 'react-router-dom'
import './GradeResultManagement.css'
*/
// #region pages/examinations/grade-result-management/GradeResultManagement.jsx
/* export default */ function GradeResultManagement() {
  return <Navigate to="/grade-result-management/grade-configuration" replace />
}
// #endregion pages/examinations/grade-result-management/GradeResultManagement.jsx
return {
  get default() { return GradeResultManagement; }
};
})();

export const GradePolicyLabModule = (() => {
const { useState } = external0;
const { FiCheckCircle } = external3;
const { FiInfo } = external3;
const { FiTrendingUp } = external3;
const { gradeFor } = gradeResultModelModule;
const { validateBands } = gradeResultModelModule;
/* Imports for isolated regression tests:
import { useState } from 'react'
import { FiCheckCircle, FiInfo, FiTrendingUp } from 'react-icons/fi'
import { gradeFor, validateBands } from './gradeResultModel'
import './GradePolicyLab.css'
*/
// #region pages/examinations/grade-result-management/GradePolicyLab.jsx
const format = value => Number(value.toFixed(2)).toString()
/* export default */ function GradePolicyLab({ bands, savedBands }) {
  const [score, setScore] = useState('75')
  const [maximum, setMaximum] = useState('100')
  const issue = validateBands(bands)
  const valid = score.trim() !== '' && maximum.trim() !== '' && Number.isFinite(Number(score)) && Number.isFinite(Number(maximum)) && Number(maximum) > 0 && Number(score) >= 0 && Number(score) <= Number(maximum)
  const percentage = valid ? Number(score) / Number(maximum) * 100 : null
  const grade = !issue && valid ? gradeFor(percentage, bands) : null
  const sorted = issue ? [] : [...bands].sort((a, b) => Number(a.min) - Number(b.min))
  const next = grade ? sorted.find(band => Number(band.min) >= Number(grade.max) && Number(band.points) > Number(grade.points)) : null
  const passBand = sorted.find(band => band.pass)
  const savedGrade = valid && !validateBands(savedBands) ? gradeFor(percentage, savedBands) : null
  const unsaved = JSON.stringify(bands) !== JSON.stringify(savedBands)
  return <section className="grm-policy-lab">
    <div className="grm-lab-header"><div><small>POLICY PREVIEW</small><h3>Grade policy lab</h3><p>Test a score and understand exactly how your grading rules apply.</p></div><span className="grm-lab-state"><FiCheckCircle />{unsaved ? 'Editor changes pending' : 'Saved policy in sync'}</span></div>
    <div className="grm-policy-layout"><section className="grm-lab-section"><div className="grm-lab-heading"><span>01</span><div><h4>Test student marks</h4><p>Percentage = obtained marks / maximum marks x 100</p></div></div>
      <div className="grm-simulator-inputs"><label>Marks obtained<input type="number" min="0" max={Number(maximum) > 0 ? maximum : undefined} step="any" value={score} onChange={event => setScore(event.target.value)} /></label><label>Maximum marks<input type="number" min="0.01" step="any" value={maximum} onChange={event => setMaximum(event.target.value)} /></label></div>
      <div className="grm-lab-examples"><span>Try a score:</span>{[40, 75, 90, 100].map(value => <button key={value} type="button" disabled={!(Number(maximum) > 0)} onClick={() => setScore(String(Number(maximum) * value / 100))}>{value}%</button>)}</div>
      <div className="grm-simulator-output grm-lab-result" role="status" aria-live="polite">{issue ? <p>Complete a valid policy to calculate the grade.</p> : !valid ? <p>Enter marks between zero and the maximum. Maximum marks must be positive.</p> : <><div className="grm-lab-grade"><small>GRADE</small><strong>{grade?.grade || '-'}</strong></div><div><b>{percentage.toFixed(2)}%</b><span>{format(Number(score))} out of {format(Number(maximum))} marks</span><span>{grade?.pass ? 'Passed' : 'Failed'} / {grade?.points ?? '-'} grade points</span></div></>}</div>
      {grade && <div className="grm-lab-guidance"><div><FiInfo /><span>Matched band: <strong>{grade.grade}</strong> / {grade.min}% to {grade.max}%{Number(grade.max) === 100 ? ' inclusive' : ', upper limit excluded'}.</span></div>{next ? <div><FiTrendingUp /><span>Reach <strong>{next.grade}</strong> at {format(Number(next.min) / 100 * Number(maximum))} marks: <strong>{format(Math.max(0, Number(next.min) / 100 * Number(maximum) - Number(score)))} more marks</strong>.</span></div> : <div><FiCheckCircle /><span>No higher grade-point band remains above this score.</span></div>}</div>}
      {unsaved && savedGrade && <div className="grm-lab-comparison"><span>Saved policy at this score</span><strong>{savedGrade.grade} / {savedGrade.points} points / {savedGrade.pass ? 'Passed' : 'Failed'}</strong><small>Save your edited policy to use it in Result Generation.</small></div>}
    </section><section className="grm-lab-section"><div className="grm-lab-heading"><span>02</span><div><h4>Understand grade ranges</h4><p>{issue ? 'Resolve policy issues to view coverage.' : `${bands.length} bands / full coverage${passBand ? ` / passing begins at ${passBand.min}%` : ' / no passing bands'}`}</p></div></div>
      {issue ? <p className="grm-policy-issue">{issue}</p> : <><div className="grm-policy-scale" aria-label="Grade percentage bands">{sorted.map(band => <div key={band.grade} style={{ flexGrow: Number(band.max) - Number(band.min) }} className={`${band.pass ? 'is-pass' : 'is-fail'} ${grade?.grade === band.grade ? 'is-current' : ''}`} title={`${band.grade}: ${band.min}% to ${band.max}%`}><span>{band.grade}</span></div>)}</div><div className="grm-scale-labels"><span>0%</span><span>50%</span><span>100%</span></div><div className="grm-lab-ranges"><div className="grm-lab-range-head"><span>Grade</span><span>Percentage range</span><span>Points</span></div>{sorted.map(band => <div key={band.grade} className={`grm-lab-range-row ${grade?.grade === band.grade ? 'is-current' : ''}`}><span>{band.grade}{grade?.grade === band.grade && <small>Current</small>}</span><span>{band.min}% &le; score {Number(band.max) === 100 ? '\u2264' : '<'} {band.max}%</span><strong>{band.points}</strong></div>)}</div></>}
    </section></div><div className="grm-lab-footnote"><FiInfo /><span>Simulator uses current editor values. Result Generation uses the saved local policy. Preview does not change official results.</span></div>
  </section>
}
// #endregion pages/examinations/grade-result-management/GradePolicyLab.jsx
return {
  get default() { return GradePolicyLab; }
};
})();

export const ResultInsightsModule = (() => {
const { resultAnalytics } = gradeResultModelModule;
const { resultIssues } = gradeResultModelModule;
const { summarize } = gradeResultModelModule;
const { weightedGpa } = gradeResultModelModule;
/* Imports for isolated regression tests:
import { resultAnalytics, resultIssues, summarize, weightedGpa } from './gradeResultModel'
*/
// #region pages/examinations/grade-result-management/ResultInsights.jsx
/* export */ function ResultInsights({ rows, title = 'Performance insights' }) {
  const stats = resultAnalytics(rows)
  return <section className="grm-insights" aria-label={title}>
    <div className="grm-insights-heading"><h3>{title}</h3><span>{rows.length} assessment records in this view</span></div>
    <div className="grm-insight-metrics">{[['Pass rate', stats.passRate === null ? '-' : `${stats.passRate.toFixed(1)}%`], ['Average score', stats.average === null ? '-' : `${stats.average.toFixed(1)}%`], ['Highest score', stats.highest === null ? '-' : `${stats.highest.toFixed(1)}%`], ['Pending', stats.pending]].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
    <div className="grm-insight-grid"><div><h4>Grade distribution</h4>{stats.distribution.length ? stats.distribution.map(({ grade, count }) => <div className="grm-grade-bar" key={grade}><span>{grade}</span><div role="img" aria-label={`${grade}: ${count} of ${rows.length} assessments`}><i style={{ width: `${count / rows.length * 100}%` }} /></div><strong>{count}</strong></div>) : <p>No grades in the current view.</p>}</div><div><h4>Data readiness</h4><div className="grm-readiness"><strong>{rows.length - stats.issues}<small>complete records</small></strong><strong>{stats.issues}<small>need review</small></strong></div><p>Readiness checks student/subject IDs, marks, maximum marks and credits. Pass rate uses completed assessments only; averages exclude invalid scores.</p></div></div>
  </section>
}

/* export */ function ResultQuality({ rows }) {
  const issues = rows.map(row => ({ row, issues: resultIssues(row) })).filter(item => item.issues.length)
  if (!issues.length) return null
  const counts = new Map()
  issues.forEach(item => item.issues.forEach(issue => counts.set(issue, (counts.get(issue) || 0) + 1)))
  return <details className="grm-quality"><summary>Data quality review: {issues.length} assessment records need attention</summary><div className="grm-quality-content"><div className="grm-quality-tags">{[...counts].map(([label, count]) => <span key={label}>{label} <strong>{count}</strong></span>)}</div><ul>{issues.slice(0, 8).map(({ row, issues: labels }) => <li key={row.id}><strong>{row.studentName || row.studentId || 'Unknown student'} / {row.subjectCode || 'Unknown subject'}</strong><span>{labels.join(' · ')}</span></li>)}</ul>{issues.length > 8 && <p>Showing the first 8 of {issues.length} records requiring review.</p>}<p>Correct source records in Marks Management. These reports do not modify stored marks.</p></div></details>
}

/* export */ function PreviewComparison({ before, after }) {
  const changed = after.filter((row, index) => row.grade !== before[index]?.grade || row.status !== before[index]?.status)
  const incomplete = after.filter(row => row.status === 'Incomplete').length
  return <div className="grm-preview-review"><div><small>Preview impact</small><strong>{changed.length} grade/result changes</strong><span>{incomplete} incomplete assessments</span></div><details><summary>Compare saved results with preview</summary><div className="grm-table-scroll"><table className="erp-table"><thead><tr><th>Student / Subject</th><th>Saved grade</th><th>Preview grade</th><th>Saved result</th><th>Preview result</th></tr></thead><tbody>{after.slice(0, 10).map((row, index) => <tr key={row.id}><td>{row.studentName || row.studentId} / {row.subjectCode}</td><td>{before[index]?.grade || '-'}</td><td>{row.grade}</td><td>{before[index]?.status || '-'}</td><td>{row.status}</td></tr>)}</tbody></table></div><p>Comparison shows the first 10 assessments. Export the preview for all calculated records.</p></details></div>
}

/* export */ function StudentSemesterSummary({ rows }) {
  const groups = summarize(rows, 'semester')
  return <section className="grm-semester-overview"><h3>Semester performance</h3><div className="grm-table-scroll"><table className="erp-table"><thead><tr><th>Semester</th><th>Assessments</th><th>Passed</th><th>Failed</th><th>Pending</th><th>Weighted GPA</th></tr></thead><tbody>{groups.map(group => { const records = rows.filter(row => (row.semester || 'Unassigned') === group.group); const gpa = weightedGpa(records); return <tr key={group.group}><td>{group.group}</td><td>{group.subjects}</td><td>{group.passed}</td><td>{group.failed}</td><td>{group.pending}</td><td>{gpa === null ? '-' : gpa.toFixed(2)}</td></tr> })}</tbody></table></div><p>GPA uses available assessments, including repeat attempts. This is an informational calculation.</p></section>
}
// #endregion pages/examinations/grade-result-management/ResultInsights.jsx
return {
  get ResultInsights() { return ResultInsights; },
  get ResultQuality() { return ResultQuality; },
  get PreviewComparison() { return PreviewComparison; },
  get StudentSemesterSummary() { return StudentSemesterSummary; }
};
})();

export const GradeResultWorkspaceModule = (() => {
const { useEffect } = external0;
const { useMemo } = external0;
const { useRef } = external0;
const { useState } = external0;
const { NavLink } = external1;
const { FiAlertCircle } = external3;
const { FiAward } = external3;
const { FiChevronDown } = external3;
const { FiCpu } = external3;
const { FiDatabase } = external3;
const { FiFileText } = external3;
const { FiPercent } = external3;
const { FiPlus } = external3;
const { FiRotateCcw } = external3;
const { FiSearch } = external3;
const { FiTrash2 } = external3;
const { default: DashboardLayout } = DashboardLayoutModule;
const { default: PageHeader } = PageHeaderModule;
const { default: FilterPanel } = FilterPanelModule;
const { default: ExportMenu } = ExportMenuModule;
const { default: TablePagination } = TablePaginationModule;
const { useAcademic } = AcademicContextModule;
const { default: resultsService } = resultsServiceModule;
const { gradeScreens } = gradeScreensModule;
const { academicDivision } = gradeResultModelModule;
const { backlogRows } = gradeResultModelModule;
const { defaultBands } = gradeResultModelModule;
const { flattenResults } = gradeResultModelModule;
const { gradeFor } = gradeResultModelModule;
const { gradingPresets } = gradeResultModelModule;
const { summarize } = gradeResultModelModule;
const { validateBands } = gradeResultModelModule;
const { weightedGpa } = gradeResultModelModule;
const { sortResultRows } = gradeResultModelModule;
const { default: GradePolicyLab } = GradePolicyLabModule;
const { PreviewComparison } = ResultInsightsModule;
const { ResultInsights } = ResultInsightsModule;
const { ResultQuality } = ResultInsightsModule;
const { StudentSemesterSummary } = ResultInsightsModule;
/* Imports for isolated regression tests:
import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { FiAlertCircle, FiAward, FiChevronDown, FiCpu, FiDatabase, FiFileText, FiPercent, FiPlus, FiRotateCcw, FiSearch, FiTrash2 } from 'react-icons/fi'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import FilterPanel from '../../../components/FilterPanel'
import ExportMenu from '../../../components/ExportMenu'
import TablePagination from '../../../components/TablePagination'
import { useAcademic } from '../../../context/AcademicContext'
import resultsService from '../../../services/resultsService'
import { gradeScreens } from './gradeScreens'
import { academicDivision, backlogRows, defaultBands, flattenResults, gradeFor, gradingPresets, summarize, validateBands, weightedGpa } from './gradeResultModel'
import { sortResultRows } from './gradeResultModel'
import GradePolicyLab from './GradePolicyLab'
import { PreviewComparison, ResultInsights, ResultQuality, StudentSemesterSummary } from './ResultInsights'
import './GradeResultWorkspace.css'
*/
// #region pages/examinations/grade-result-management/GradeResultWorkspace.jsx
const resultColumns = [['studentName', 'Student'], ['registrationNumber', 'Registration No.'], ['semester', 'Semester'], ['department', 'Department'], ['subjectCode', 'Subject Code'], ['subjectName', 'Subject'], ['examType', 'Examination'], ['totalMarks', 'Marks'], ['maximumMarks', 'Maximum'], ['percentage', 'Score %'], ['grade', 'Grade'], ['gradePoint', 'Points'], ['status', 'Result']].map(([key, label]) => ({ key, label }))
const summaryColumns = [['group', 'Group'], ['students', 'Students'], ['subjects', 'Assessments'], ['passed', 'Passed'], ['failed', 'Failed'], ['pending', 'Pending'], ['passRate', 'Assessment Pass Rate']].map(([key, label]) => ({ key, label }))
const readBands = key => { try { const saved = JSON.parse(localStorage.getItem(key) || 'null'); return Array.isArray(saved) && !validateBands(saved) ? saved : defaultBands.map(band => ({ ...band })) } catch { return defaultBands.map(band => ({ ...band })) } }

function LocalGradeResultWorkspace({ screen }) {
  const academic = useAcademic()
  const scope = `${academic.selectedCollegeId || 'none'}:${academic.selectedAcademicYearId || 'none'}`
  return <DashboardLayout><Workspace key={`${scope}:${screen}`} screen={screen} academic={academic} scope={scope} /></DashboardLayout>
}

function Workspace({ screen, academic, scope }) {
  const resultScreens = gradeScreens.filter(item => ['student-result', 'semester-result', 'department-result'].includes(item.slug))
  const resultSelected = resultScreens.some(item => item.slug === screen)
  const definition = gradeScreens.find(item => item.slug === screen)
  const policyKey = `cms-grade-policy:${scope}`
  const [bands, setBands] = useState(() => readBands(policyKey))
  const [savedBands, setSavedBands] = useState(() => readBands(policyKey))
  const [sheets, setSheets] = useState([])
  const [loading, setLoading] = useState(screen !== 'grade-configuration' && Boolean(academic.selectedCollegeId))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [semester, setSemester] = useState('')
  const [department, setDepartment] = useState('')
  const [exam, setExam] = useState('')
  const [student, setStudent] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [preview, setPreview] = useState(false)
  const [sort, setSort] = useState('default')
  const [pageSize, setPageSize] = useState(10)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const dropdownButtonRef = useRef(null)
  const dropdownMenuRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [dropdownOpen])

  const handleResultsMenuKeyDown = event => {
    if (event.key === 'Escape') {
      setDropdownOpen(false)
      dropdownButtonRef.current?.focus()
      return
    }
    const links = [...(dropdownMenuRef.current?.querySelectorAll('a') || [])]
    if (!links.length) return
    const currentIndex = links.indexOf(document.activeElement)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!dropdownOpen) setDropdownOpen(true)
      requestAnimationFrame(() => links[Math.min(currentIndex + 1, links.length - 1)]?.focus())
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      links[Math.max(currentIndex < 0 ? links.length - 1 : currentIndex - 1, 0)]?.focus()
    } else if (event.key === 'Home') {
      event.preventDefault()
      links[0]?.focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      links[links.length - 1]?.focus()
    }
  }

  const { selectedCollegeId, selectedAcademicYearId, scopeRecords } = academic
  const configuration = screen === 'grade-configuration'

  useEffect(() => {
    if (configuration || !selectedCollegeId) return
    let current = true
    resultsService.getResults({ collegeId: selectedCollegeId, academicYearId: selectedAcademicYearId || undefined })
      .then(data => { if (current) setSheets(Array.isArray(data) ? data : []) })
      .catch(() => { if (current) { setSheets([]); setError('Unable to load results. Retry or check your API connection.') } })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [configuration, selectedCollegeId, selectedAcademicYearId])

  const rows = useMemo(() => {
    // Use the existing hierarchy resolver as well as request filters to enforce college isolation.
    const scoped = scopeRecords(sheets)
    return flattenResults(scoped).filter(row => !selectedAcademicYearId || String(row.academicYearId) === String(selectedAcademicYearId))
  }, [sheets, scopeRecords, selectedAcademicYearId])

  const options = key => [...new Set(rows.map(row => row[key]).filter(Boolean))].sort()
  const students = [...new Map(rows.filter(row => row.studentId).map(row => [row.studentId, { id: row.studentId, name: `${row.studentName || row.studentId}${row.registrationNumber ? ` (${row.registrationNumber})` : ''}` }])).values()]
  const studentMode = screen === 'student-result' || screen === 'consolidated-marks-memo'
  const baseRows = screen === 'backlog-report' ? backlogRows(rows) : rows
  const filtered = baseRows.filter(row => (!semester || row.semester === semester) && (!department || row.department === department) && (!exam || row.examType === exam) && (!status || row.status.toLowerCase() === status.toLowerCase()) && (!studentMode || student && row.studentId === student) && (!query || Object.values(row).some(value => String(value ?? '').toLowerCase().includes(query.toLowerCase()))))
  const generated = preview ? filtered.map(row => {
    const valid = row.percentage !== null && row.totalMarks >= 0 && row.totalMarks <= row.maximumMarks
    const band = valid ? gradeFor(row.percentage, savedBands) : null
    return { ...row, grade: band?.grade || '-', gradePoint: band ? Number(band.points) : null, status: band ? band.pass ? 'Passed' : 'Failed' : 'Incomplete' }
  }) : []

  let report = filtered
  let columns = resultColumns
  if (screen === 'semester-result' || screen === 'department-result') { report = summarize(filtered, screen === 'semester-result' ? 'semester' : 'department'); columns = summaryColumns.map(column => column.key === 'group' ? { ...column, label: screen === 'semester-result' ? 'Semester' : 'Department' } : column) }
  if (screen === 'consolidated-marks-memo') columns = [...resultColumns, { key: 'credits', label: 'Credits' }]
  if (screen === 'backlog-report') columns = [...resultColumns, { key: 'examDate', label: 'Attempt Date' }]
  if (screen === 'result-generation') report = generated
  report = sortResultRows(report, sort)
  const pages = Math.max(1, Math.ceil(report.length / pageSize))
  const currentPage = Math.min(page, pages)
  const visible = report.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const gpa = weightedGpa(filtered)
  const analyticsRows = screen === 'result-generation' ? generated : filtered
  const selectedStudent = students.find(item => item.id === student)
  const clear = () => { setQuery(''); setSemester(''); setDepartment(''); setExam(''); setStatus(''); setPage(1); setPreview(false) }
  const updateFilter = setter => event => { setter(event.target.value); setPage(1); setPreview(false) }

  const savePolicy = event => {
    event.preventDefault()
    const problem = validateBands(bands)
    if (problem) { setError(problem); return }
    if (!selectedCollegeId) { setError('Select a college before saving a policy.'); return }
    const normalized = bands.map(band => ({ ...band, grade: band.grade.trim().toUpperCase(), min: Number(band.min), max: Number(band.max), points: Number(band.points) }))
    try {
      localStorage.setItem(policyKey, JSON.stringify(normalized))
      setSavedBands(normalized)
      setError('')
      setNotice('Grade policy saved locally for this college and academic year.')
    } catch {
      setError('Unable to save the grade policy in browser storage.')
    }
  }

  const handleSeedSample = () => {
    setLoading(true)
    setError('')
    const seeded = resultsService.seedSampleResults(selectedCollegeId || '1', selectedAcademicYearId || '1')
    setSheets(seeded)
    setNotice('Sample B.Tech results loaded. Explore Result Generation, Semester / Department reports, and Backlogs.')
    setLoading(false)
  }

  const handleClearLocal = () => {
    resultsService.clearLocalResults()
    setSheets([])
    setNotice('Sample B.Tech results cleared.')
  }

  return <section className={`grm grm--${screen}`}>
    <PageHeader
      title={definition.label}
      subtitle={configuration ? 'Grade Management' : 'Official Results'}
      compactSummary={[
        { label: 'Available results', value: rows.length },
        { label: 'Students', value: students.length },
        { label: 'Grade bands', value: savedBands.length },
        { label: 'Scope', value: academic.selectedAcademicYear?.name || 'Selected college' },
      ]}
      breadcrumb={[{ label: 'Grades System and Results', link: configuration ? '/grade-result-management/grade-configuration' : '/results' }, definition.label]}
    />

    {configuration && <nav className="grm-nav grm-nav--grade" aria-label="Grade management tools">
      <NavLink to="/grade-result-management/grade-configuration" end>
        <FiAward aria-hidden="true" />
        <span>Grade Management</span>
      </NavLink>
      <NavLink to="/grade-result-management/cgpa-calculator">
        <FiPercent aria-hidden="true" />
        <span>CGPA Calculator</span>
      </NavLink>
    </nav>}

    {!configuration && <nav className="grm-nav grm-nav--compact" aria-label="Official results screens">
      {gradeScreens.filter(item => item.slug === 'result-generation').map(item => (
        <NavLink key={item.slug} to="/results" end>
          <FiCpu aria-hidden="true" />
          <span>{item.label}</span>
        </NavLink>
      ))}
      <div className={`grm-results-dropdown${resultSelected ? ' is-active' : ''}`} ref={dropdownRef} onKeyDown={handleResultsMenuKeyDown}>
        <button
          type="button"
          ref={dropdownButtonRef}
          className={`grm-dropdown-btn${resultSelected ? ' is-active' : ''}`}
          onClick={() => setDropdownOpen(prev => !prev)}
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
          aria-controls="official-results-views"
          aria-label="Choose a results view"
        >
          <span>Results</span>
          <FiChevronDown className={`grm-results-dropdown__arrow${dropdownOpen ? ' is-open' : ''}`} aria-hidden="true" />
        </button>
        {dropdownOpen && (
          <div className="grm-results-dropdown__menu" id="official-results-views" ref={dropdownMenuRef} role="menu" aria-label="Result views">
            {resultScreens.map(item => (
              <NavLink
                key={item.slug}
                to={'/results/' + item.slug}
                role="menuitem"
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setDropdownOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
      {gradeScreens.filter(item => ['consolidated-marks-memo', 'backlog-report'].includes(item.slug)).map(item => (
        <NavLink key={item.slug} to={'/results/' + item.slug}>
          {item.slug === 'consolidated-marks-memo' ? <FiFileText aria-hidden="true" /> : <FiAlertCircle aria-hidden="true" />}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>}

    {!selectedCollegeId && <p className="grm-notice">Select a college in the sidebar to continue.</p>}
    {error && <p className="grm-error" role="alert">{error}</p>}
    {notice && <p className="grm-notice" role="status">{notice}</p>}

    {configuration && <GradePolicyLab bands={bands} savedBands={savedBands} />}
    {!configuration && !loading && !error && analyticsRows.length > 0 && <><ResultInsights rows={analyticsRows} title={studentMode ? 'Student performance insights' : 'Result analytics'} /><ResultQuality rows={filtered} /></>}

    {configuration ? <article className="erp-card grm-card">
      <header className="erp-card-header">
        <div>
          <h2 className="erp-card-title">Grading policy</h2>
          <p className="erp-card-subtitle">Local preview policy. Ranges include the minimum and exclude the maximum, except 100%. Official backend grading is unchanged.</p>
        </div>
        <div className="grm-policy-presets">
          <span className="grm-preset-label">Presets:</span>
          {gradingPresets.map(preset => (
            <button
              key={preset.id}
              type="button"
              className="grm-button grm-button--preset"
              onClick={() => {
                setBands(preset.bands.map(b => ({ ...b })))
                setNotice(`${preset.label} loaded. Click "Save local policy" to apply.`)
                setError('')
              }}
              title={preset.description}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </header>
      <form onSubmit={savePolicy}>
        <div className="grm-table-scroll">
          <table className="erp-table">
            <thead><tr>{['Grade', 'Minimum %', 'Maximum %', 'Grade Points', 'Passing Grade', 'Action'].map(label => <th key={label}>{label}</th>)}</tr></thead>
            <tbody>
              {bands.map((band, index) => <tr key={index}>
                {['grade', 'min', 'max', 'points'].map(field => <td key={field}>
                  <input
                    className="grm-band-input"
                    aria-label={`${field} for band ${index + 1}`}
                    required
                    type={field === 'grade' ? 'text' : 'number'}
                    min={field === 'grade' ? undefined : 0}
                    max={field === 'points' ? 10 : field === 'grade' ? undefined : 100}
                    step="any"
                    value={band[field]}
                    onChange={event => setBands(bands.map((item, i) => i === index ? { ...item, [field]: event.target.value } : item))}
                  />
                </td>)}
                <td><input type="checkbox" aria-label={`Passing grade ${index + 1}`} checked={band.pass} onChange={event => setBands(bands.map((item, i) => i === index ? { ...item, pass: event.target.checked } : item))} /></td>
                <td><button className="grm-button" type="button" aria-label={`Remove band ${index + 1}`} onClick={() => setBands(bands.filter((_, i) => i !== index))}><FiTrash2 /></button></td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <footer className="grm-footer">
          <button type="button" className="grm-button" onClick={() => setBands([...bands, { grade: '', min: '', max: '', points: '', pass: true }])}><FiPlus />Add band</button>
          <button className="grm-button grm-button--primary" disabled={!selectedCollegeId}>Save local policy</button>
        </footer>
      </form>
    </article> : <article className="erp-card grm-card">
      <header className="erp-card-header">
        <div>
          <h2 className="erp-card-title">{screen === 'consolidated-marks-memo' ? 'Consolidated academic record' : definition.label + ' records'}</h2>
          <p className="erp-card-subtitle">{screen === 'result-generation' ? 'Calculate a preview from saved marks using your local grade policy. This does not publish or overwrite results.' : screen === 'backlog-report' ? 'Failed subjects from the latest available dated attempt in each assessment. Undated records cannot confirm attempt order; records without student or subject identifiers are excluded.' : 'View results for the selected college and academic year.'}</p>
        </div>
      </header>

      {studentMode && <div className="grm-student-picker">
        <label>Student<select value={student} onChange={updateFilter(setStudent)}><option value="">Select a student</option>{students.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {selectedStudent && <strong>{selectedStudent.name}</strong>}
      </div>}

      <FilterPanel
        className="grm-filters"
        active={Boolean(query || semester || department || exam || status)}
        onClear={clear}
        actions={<ExportMenu rows={report} columns={columns} filename={`${screen}.csv`} title={definition.label} loading={loading} />}
      >
        <label className="grm-search"><FiSearch /><input aria-label="Search result records" placeholder="Search student, registration or subject" value={query} onChange={updateFilter(setQuery)} /></label>
        {[['Semester', semester, setSemester, options('semester')], ['Department', department, setDepartment, options('department')], ['Examination', exam, setExam, options('examType')], ['Result', status, setStatus, ['Passed', 'Failed', 'Pending']]].map(([label, value, setter, values]) => <label className="grm-filter" key={label}>{label}<select value={value} onChange={updateFilter(setter)}><option value="">All {label.toLowerCase()}s</option>{values.map(item => <option key={item}>{item}</option>)}</select></label>)}
      </FilterPanel>

      {screen === 'result-generation' && <div className="grm-generation"><span>{filtered.length} assessment records / {savedBands.length} grade bands</span><button className="grm-button grm-button--primary" disabled={loading || !filtered.length || !!error} onClick={() => { setPreview(true); setPage(1) }}>Generate preview</button></div>}
      {screen === 'result-generation' && preview && !loading && <PreviewComparison before={filtered} after={generated} />}
      {studentMode && student && filtered.length > 0 && !loading && <StudentSemesterSummary rows={filtered} />}

      {screen === 'consolidated-marks-memo' && student && <div className="grm-memo">
        <div><small>Student</small><strong>{selectedStudent?.name}</strong></div>
        <div><small>Total Assessments</small><strong>{filtered.length}</strong></div>
        <div><small>Cumulative Credits</small><strong>{filtered.reduce((sum, r) => sum + (r.credits || 0), 0)}</strong></div>
        <div><small>Weighted GPA</small><strong>{gpa === null ? 'Unavailable' : gpa.toFixed(2)}</strong></div>
        {gpa !== null && <div><small>Division Classification</small><strong>{academicDivision(gpa)?.division || '—'}</strong></div>}
        <p>Informational cumulative memo from available assessment records. Credit weighting requires grade points and credits on every record; this is not an official CGPA.</p>
      </div>}

      <div className="grm-register-tools">
        <div className="grm-tool-left">
          <span>{report.length} records / {Math.min((currentPage - 1) * pageSize + 1, report.length)}-{Math.min(currentPage * pageSize, report.length)} shown</span>
          {resultsService.hasLocalResults() && (
            <span className="grm-sample-badge">
              Sample B.Tech Data · <button type="button" onClick={handleClearLocal}>Clear</button>
            </span>
          )}
        </div>
        <div>
          <label>Sort by<select value={sort} onChange={event => { setSort(event.target.value); setPage(1) }}><option value="default">Default order</option><option value="name">Name A-Z</option>{screen !== 'semester-result' && screen !== 'department-result' && <><option value="score-desc">Highest score</option><option value="score-asc">Lowest score</option></>}</select></label>
          <label>Rows<select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1) }}>{[10, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}</select></label>
        </div>
      </div>

      {loading ? <p className="grm-empty" role="status">Loading results...</p> : <><div className="grm-table-scroll"><table className="erp-table grm-table"><thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{visible.map((row, index) => <tr key={row.id || row.group || index}>{columns.map(column => <td key={column.key}>{column.key === 'status' ? <span className={`grm-badge grm-badge--${row.status.toLowerCase()}`}>{row.status}</span> : column.key === 'percentage' ? row.percentage === null ? '-' : row.percentage.toFixed(2) : row[column.key] ?? '-'}</td>)}</tr>)}</tbody></table></div>{!report.length && <div className="grm-empty">
        <h3>{error ? 'Results could not be loaded' : studentMode && !student ? 'Select a student' : screen === 'result-generation' && !preview ? 'Ready to generate a preview' : 'No records found'}</h3>
        <p>{error ? 'Check your API connection and reopen this screen.' : 'Records appear here when matching results are available.'}</p>
        {!loading && !report.length && (
          <div className="grm-empty-actions">
            <button type="button" className="grm-button grm-button--primary" onClick={handleSeedSample}>
              <FiDatabase aria-hidden="true" /> Load Sample B.Tech Results
            </button>
            {resultsService.hasLocalResults() && (
              <button type="button" className="grm-button grm-button--secondary" onClick={handleClearLocal}>
                <FiRotateCcw aria-hidden="true" /> Clear Sample Data
              </button>
            )}
          </div>
        )}
      </div>}<TablePagination page={currentPage} totalPages={pages} onPageChange={setPage} /></>}
    </article>}
  </section>
}

/* export default */ function GradeResultWorkspace(props) { return <LocalGradeResultWorkspace {...props} /> }
// #endregion pages/examinations/grade-result-management/GradeResultWorkspace.jsx
return {
  get default() { return GradeResultWorkspace; }
};
})();

export const GradeConfigurationModule = (() => {
const { default: GradeResultWorkspace } = GradeResultWorkspaceModule;
/* Imports for isolated regression tests:
import GradeResultWorkspace from './GradeResultWorkspace'
import './GradeConfiguration.css'
*/
// #region pages/examinations/grade-result-management/GradeConfiguration.jsx
/* export default */ function GradeConfiguration() {
  return <GradeResultWorkspace screen="grade-configuration" />
}
// #endregion pages/examinations/grade-result-management/GradeConfiguration.jsx
return {
  get default() { return GradeConfiguration; }
};
})();

export const CGPACalculatorModule = (() => {
const { useEffect } = external0;
const { useMemo } = external0;
const { useState } = external0;
const { FiAward } = external3;
const { FiCheck } = external3;
const { FiPercent } = external3;
const { FiPlus } = external3;
const { FiRotateCcw } = external3;
const { FiTarget } = external3;
const { FiTrash2 } = external3;
const { FiUserCheck } = external3;
const { academicDivision } = gradeResultModelModule;
const { cgpaToPercentage } = gradeResultModelModule;
const { default: resultsService } = resultsServiceModule;
const { default: ExportMenu } = ExportMenuModule;
/* Imports for isolated regression tests:
import { useEffect, useMemo, useState } from 'react'
import { FiAward, FiCheck, FiPercent, FiPlus, FiRotateCcw, FiTarget, FiTrash2, FiUserCheck } from 'react-icons/fi'
import { academicDivision, cgpaToPercentage } from './gradeResultModel'
import resultsService from '../../../services/resultsService'
import ExportMenu from '../../../components/ExportMenu'
import './CGPACalculator.css'
*/
// #region pages/examinations/grade-result-management/CGPACalculator.jsx
const newSemester = number => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  semester: `Semester ${number}`,
  sgpa: '',
  credits: '',
})

function readRows(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
    if (Array.isArray(saved) && saved.length && saved.every(row => row && typeof row === 'object')) return saved
  } catch { /* Start with an empty calculator if saved data is malformed. */ }
  return [newSemester(1)]
}

/* export default */ function CGPACalculator({ storageKey }) {
  const [rows, setRows] = useState(() => readRows(storageKey))
  const [savedAt, setSavedAt] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  const [resetConfirm, setResetConfirm] = useState(false)
  const [formulaType, setFormulaType] = useState('aicte') // 'aicte' or 'cbse'
  const [targetGoalOpen, setTargetGoalOpen] = useState(false)
  const [targetCgpa, setTargetCgpa] = useState('8.50')
  const [targetCredits, setTargetCredits] = useState('22')
  const [availableStudents, setAvailableStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(rows))
    } catch { /* storage full or private mode */ }
  }, [rows, storageKey])

  // Load available student records from resultsService for optional quick-import
  useEffect(() => {
    let active = true
    resultsService.getResults().then(sheets => {
      if (!active || !Array.isArray(sheets)) return
      const map = new Map()
      sheets.forEach(sheet => {
        const records = Array.isArray(sheet.records) ? sheet.records : [sheet]
        records.forEach(rec => {
          const id = rec.studentId || rec.id
          const name = rec.studentName || rec.name || id
          const roll = rec.registrationNumber || rec.rollNumber || ''
          if (id && !map.has(id)) {
            map.set(id, { id, name: `${name}${roll ? ` (${roll})` : ''}` })
          }
        })
      })
      setAvailableStudents([...map.values()])
    }).catch(() => {})
    return () => { active = false }
  }, [])

  const duplicateSemester = useMemo(() => {
    const names = rows.map(row => row.semester.trim().toLowerCase()).filter(Boolean)
    return new Set(names).size !== names.length
  }, [rows])

  const invalidRow = rows.find(row => {
    const sgpa = Number(row.sgpa)
    const credits = Number(row.credits)
    return !row.semester.trim() || row.sgpa === '' || row.credits === '' || !Number.isFinite(sgpa) || sgpa < 0 || sgpa > 10 || !Number.isFinite(credits) || credits <= 0
  })

  const totalCredits = rows.reduce((total, row) => total + (Number(row.credits) || 0), 0)
  const weightedPoints = rows.reduce((total, row) => total + (Number(row.sgpa) || 0) * (Number(row.credits) || 0), 0)
  const cgpa = !invalidRow && !duplicateSemester && totalCredits > 0 ? weightedPoints / totalCredits : null

  const percentageAicte = cgpa !== null ? cgpaToPercentage(cgpa, 'aicte') : null
  const percentageCbse = cgpa !== null ? cgpaToPercentage(cgpa, 'cbse') : null
  const activePercentage = formulaType === 'aicte' ? percentageAicte : percentageCbse
  const divisionInfo = cgpa !== null ? academicDivision(cgpa) : null

  // Target Goal Calculation (What-If analysis)
  const targetRequiredSgpa = useMemo(() => {
    const target = Number(targetCgpa)
    const upcomingCr = Number(targetCredits)
    if (cgpa === null || !Number.isFinite(target) || target <= 0 || target > 10 || !Number.isFinite(upcomingCr) || upcomingCr <= 0) {
      return null
    }
    const neededPoints = (target * (totalCredits + upcomingCr)) - weightedPoints
    const reqSgpa = neededPoints / upcomingCr
    return reqSgpa
  }, [cgpa, targetCgpa, targetCredits, totalCredits, weightedPoints])

  const touchSaveState = () => {
    setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  }

  const update = (id, field, value) => {
    setRows(current => current.map(row => row.id === id ? { ...row, [field]: value } : row))
    touchSaveState()
  }

  const add = () => {
    setRows(current => [...current, newSemester(current.length + 1)])
    setResetConfirm(false)
    touchSaveState()
  }

  const removeRow = id => {
    if (rows.length <= 1) return
    setRows(current => current.filter(item => item.id !== id))
    touchSaveState()
  }

  const reset = () => {
    if (!resetConfirm) { setResetConfirm(true); return }
    setRows([newSemester(1)])
    setSelectedStudentId('')
    setResetConfirm(false)
    touchSaveState()
  }

  const applyTemplate = (count) => {
    const templateRows = Array.from({ length: count }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      semester: `Semester ${i + 1}`,
      sgpa: '',
      credits: '21',
    }))
    setRows(templateRows)
    setResetConfirm(false)
    touchSaveState()
  }

  const handleStudentImport = async (studentId) => {
    setSelectedStudentId(studentId)
    if (!studentId) return
    try {
      const allSheets = await resultsService.getResults()
      const studentRecords = allSheets.flatMap(sheet => {
        const records = Array.isArray(sheet.records) ? sheet.records : [sheet]
        return records
          .filter(r => String(r.studentId || r.id) === String(studentId))
          .map(r => ({
            ...r,
            semester: r.semesterName || sheet.semesterName || sheet.semester || 'Semester 1',
            credits: Number(r.credits ?? sheet.credits ?? 3),
            gradePoint: Number(r.gradePoint ?? 0),
          }))
      })

      if (!studentRecords.length) return

      // Group records by semester
      const semMap = new Map()
      studentRecords.forEach(r => {
        const sem = r.semester || 'Semester 1'
        if (!semMap.has(sem)) semMap.set(sem, [])
        semMap.get(sem).push(r)
      })

      const imported = [...semMap.entries()].map(([sem, recs], idx) => {
        const credits = recs.reduce((sum, r) => sum + (r.credits || 0), 0)
        const pts = recs.reduce((sum, r) => sum + ((r.gradePoint || 0) * (r.credits || 0)), 0)
        const sgpa = credits > 0 ? (pts / credits).toFixed(2) : ''
        return {
          id: `${Date.now()}-${idx}`,
          semester: sem,
          sgpa: String(sgpa),
          credits: String(credits || 20),
        }
      })

      if (imported.length > 0) {
        setRows(imported)
        touchSaveState()
      }
    } catch (e) {
      console.warn('Student import error:', e)
    }
  }

  let runningCredits = 0
  let runningPoints = 0
  const exportRows = rows.filter(row => row.semester.trim() && row.sgpa !== '' && row.credits !== '' && Number.isFinite(Number(row.sgpa)) && Number(row.sgpa) >= 0 && Number(row.sgpa) <= 10 && Number.isFinite(Number(row.credits)) && Number(row.credits) > 0).map(row => {
    const semesterCredits = Number(row.credits)
    const semesterPoints = Number(row.sgpa) * semesterCredits
    runningCredits += semesterCredits
    runningPoints += semesterPoints
    return {
      semester: row.semester,
      sgpa: Number(row.sgpa).toFixed(2),
      credits: semesterCredits,
      weightedPoints: semesterPoints.toFixed(2),
      cumulativeCgpa: (runningPoints / runningCredits).toFixed(2),
      percentage: formulaType === 'aicte' ? cgpaToPercentage(runningPoints / runningCredits, 'aicte') : cgpaToPercentage(runningPoints / runningCredits, 'cbse'),
      division: academicDivision(runningPoints / runningCredits)?.division || '',
    }
  })
  const exportColumns = [
    { key: 'semester', label: 'Semester' },
    { key: 'sgpa', label: 'SGPA' },
    { key: 'credits', label: 'Credits Earned' },
    { key: 'weightedPoints', label: 'SGPA × Credits' },
    { key: 'cumulativeCgpa', label: 'Cumulative CGPA' },
    { key: 'percentage', label: `${formulaType.toUpperCase()} Equivalent %` },
    { key: 'division', label: 'Division' },
  ]
  const exportSummary = cgpa === null ? [] : [{
    semester: 'OVERALL CGPA', sgpa: cgpa.toFixed(2), credits: totalCredits,
    weightedPoints: weightedPoints.toFixed(2), cumulativeCgpa: cgpa.toFixed(2),
    percentage: activePercentage?.toFixed(2) || '', division: divisionInfo?.division || '',
  }]

  return <section className="grm-cgpa" aria-labelledby="grm-cgpa-title">
    <header className="grm-cgpa__header">
      <div>
        <span className="grm-cgpa__eyebrow">ACADEMIC PERFORMANCE & DEGREE AUDIT</span>
        <h3 id="grm-cgpa-title">CGPA Calculator & Academic Auditor</h3>
        <p>Calculate cumulative grade point average, AICTE percentage equivalencies, and division honours.</p>
      </div>
      <div className="grm-cgpa__header-right">
        {savedAt && <span className="grm-cgpa__save-state" role="status">Saved on this device · {savedAt}</span>}
        <div className="grm-cgpa__header-btns"><ExportMenu rows={[...exportRows, ...exportSummary]} columns={exportColumns} filename="cgpa-calculation.csv" title="CGPA Calculation" scope="Semester breakdown" /></div>
      </div>
    </header>

    {/* Quick Templates & Student Auto-fill */}
    <div className="grm-cgpa__top-toolbar">
      <div className="grm-cgpa__templates">
        <span className="grm-cgpa__toolbar-label">Quick Templates:</span>
        <button type="button" className="grm-cgpa__tag-btn" onClick={() => applyTemplate(4)}>4 Semesters (2 Yrs)</button>
        <button type="button" className="grm-cgpa__tag-btn" onClick={() => applyTemplate(8)}>8 Semesters (4 Yrs B.Tech)</button>
      </div>

      {availableStudents.length > 0 && (
        <div className="grm-cgpa__student-import">
          <label htmlFor="cgpa-student-select"><FiUserCheck aria-hidden="true" /> Auto-fill from student:</label>
          <select
            id="cgpa-student-select"
            value={selectedStudentId}
            onChange={e => handleStudentImport(e.target.value)}
          >
            <option value="">Choose student record...</option>
            {availableStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}
    </div>

    <div className="grm-cgpa__formula">
      <div className="grm-cgpa__formula-text">
        <strong>Formula: CGPA = Σ (SGPA × Semester Credits) ÷ Σ Semester Credits</strong>
        <span>Official UGC / AICTE weighted grading standard. Enter completed semester grades below.</span>
      </div>
      <div className="grm-cgpa__percentage-toggle">
        <span className="grm-cgpa__toggle-label"><FiPercent aria-hidden="true" /> Formula:</span>
        <button
          type="button"
          className={`grm-cgpa__toggle-btn ${formulaType === 'aicte' ? 'is-active' : ''}`}
          onClick={() => setFormulaType('aicte')}
          title="AICTE Formula: (CGPA - 0.75) × 10"
        >
          AICTE (CGPA - 0.75)×10
        </button>
        <button
          type="button"
          className={`grm-cgpa__toggle-btn ${formulaType === 'cbse' ? 'is-active' : ''}`}
          onClick={() => setFormulaType('cbse')}
          title="Standard 9.5x Formula: CGPA × 9.5"
        >
          CBSE / 9.5×
        </button>
      </div>
    </div>

    <div className="grm-cgpa__table-wrap">
      <table className="grm-cgpa__table">
        <thead>
          <tr>
            <th scope="col" style={{ width: '30%' }}>Semester</th>
            <th scope="col" style={{ width: '22%' }}>SGPA (0–10)</th>
            <th scope="col" style={{ width: '22%' }}>Credits Earned</th>
            <th scope="col" style={{ width: '18%' }}>Weighted Points</th>
            <th scope="col" style={{ width: '8%', textAlign: 'center' }}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rowSgpa = Number(row.sgpa)
            const rowCredits = Number(row.credits)
            const rowPoints = Number.isFinite(rowSgpa) && Number.isFinite(rowCredits) && rowSgpa >= 0 && rowCredits > 0
              ? (rowSgpa * rowCredits).toFixed(2)
              : '—'

            return (
              <tr key={row.id}>
                <td>
                  <label className="sr-only" htmlFor={`cgpa-semester-${row.id}`}>Semester name, row {index + 1}</label>
                  <input
                    id={`cgpa-semester-${row.id}`}
                    value={row.semester}
                    maxLength={40}
                    placeholder={`Semester ${index + 1}`}
                    onChange={event => update(row.id, 'semester', event.target.value)}
                  />
                </td>
                <td>
                  <label className="sr-only" htmlFor={`cgpa-sgpa-${row.id}`}>SGPA for {row.semester || `row ${index + 1}`}</label>
                  <input
                    id={`cgpa-sgpa-${row.id}`}
                    type="number"
                    min="0"
                    max="10"
                    step="0.01"
                    inputMode="decimal"
                    value={row.sgpa}
                    placeholder="e.g. 8.25"
                    onChange={event => update(row.id, 'sgpa', event.target.value)}
                  />
                </td>
                <td>
                  <label className="sr-only" htmlFor={`cgpa-credits-${row.id}`}>Credits earned for {row.semester || `row ${index + 1}`}</label>
                  <input
                    id={`cgpa-credits-${row.id}`}
                    type="number"
                    min="0.01"
                    step="0.5"
                    inputMode="decimal"
                    value={row.credits}
                    placeholder="e.g. 22"
                    onChange={event => update(row.id, 'credits', event.target.value)}
                  />
                </td>
                <td className="grm-cgpa__points-cell">
                  <span>{rowPoints}</span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    className="grm-cgpa__remove"
                    type="button"
                    aria-label={`Remove ${row.semester || `semester row ${index + 1}`}`}
                    disabled={rows.length === 1}
                    onClick={() => removeRow(row.id)}
                  >
                    <FiTrash2 aria-hidden="true" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>

    <div className="grm-cgpa__actions">
      <button className="grm-cgpa__secondary" type="button" onClick={add}>
        <FiPlus aria-hidden="true" /> Add Semester
      </button>
      <button className="grm-cgpa__reset" type="button" onClick={reset}>
        <FiRotateCcw aria-hidden="true" /> {resetConfirm ? 'Confirm Clear' : 'Clear Calculator'}
      </button>
    </div>

    {/* Primary CGPA Result Display */}
    <div className="grm-cgpa__result" aria-live="polite">
      <div className="grm-cgpa__score">
        <span>Calculated CGPA</span>
        <strong>{cgpa === null ? '—' : cgpa.toFixed(2)}</strong>
        <small>Scale: 10.00</small>
      </div>

      <div className="grm-cgpa__metric grm-cgpa__metric--highlight">
        <span>Equivalent Marks %</span>
        <strong>{activePercentage !== null ? `${activePercentage.toFixed(2)}%` : '—'}</strong>
        <small>{formulaType === 'aicte' ? 'AICTE Formula' : '9.5x Scale'}</small>
      </div>

      <div className="grm-cgpa__metric">
        <span>Academic Division</span>
        {divisionInfo ? (
          <span className="grm-cgpa__division-badge" style={{ color: divisionInfo.color, background: divisionInfo.bg }}>
            <FiAward aria-hidden="true" /> {divisionInfo.division}
          </span>
        ) : (
          <strong>—</strong>
        )}
      </div>

      <div className="grm-cgpa__metric">
        <span>Total Credits Earned</span>
        <strong>{totalCredits ? Number(totalCredits.toFixed(2)) : '—'}</strong>
        <small>{rows.filter(r => r.semester.trim() && r.sgpa !== '' && r.credits !== '').length} Semesters</small>
      </div>

      <div className="grm-cgpa__metric">
        <span>Weighted Grade Points</span>
        <strong>{totalCredits ? weightedPoints.toFixed(2) : '—'}</strong>
        <small>Σ (SGPA × Cr)</small>
      </div>
    </div>

    <p className={`grm-cgpa__hint${duplicateSemester || invalidRow ? ' is-error' : ''}`} role={duplicateSemester || invalidRow ? 'alert' : undefined}>
      {duplicateSemester
        ? 'Duplicate semester detected. Ensure each completed semester has a unique label.'
        : invalidRow
          ? 'Enter valid semester details: SGPA must be between 0.00 and 10.00, and credits must be a positive number.'
          : 'Planning and academic verification calculation. Official degree class depends on autonomous regulations and backlog clearance.'}
    </p>

    {/* Advanced Target Goal Planner (What-If Analysis) */}
    <div className="grm-cgpa__planner-box">
      <button
        type="button"
        className="grm-cgpa__planner-toggle"
        onClick={() => setTargetGoalOpen(open => !open)}
        aria-expanded={targetGoalOpen}
      >
        <span className="grm-cgpa__planner-title">
          <FiTarget aria-hidden="true" /> Target CGPA Goal Planner (What-If Analysis)
        </span>
        <span className="grm-cgpa__planner-badge">
          {targetGoalOpen ? 'Collapse Planner' : 'Plan Next Semester SGPA'}
        </span>
      </button>

      {targetGoalOpen && (
        <div className="grm-cgpa__planner-content">
          <p className="grm-cgpa__planner-desc">
            Determine the exact SGPA needed in upcoming semesters to achieve your target graduation CGPA.
          </p>

          <div className="grm-cgpa__planner-inputs">
            <label>
              <span>Target Desired CGPA:</span>
              <input
                type="number"
                min="1"
                max="10"
                step="0.01"
                value={targetCgpa}
                onChange={e => setTargetCgpa(e.target.value)}
                placeholder="e.g. 8.50"
              />
            </label>

            <label>
              <span>Upcoming Semester Credits:</span>
              <input
                type="number"
                min="1"
                max="40"
                step="0.5"
                value={targetCredits}
                onChange={e => setTargetCredits(e.target.value)}
                placeholder="e.g. 22"
              />
            </label>
          </div>

          <div className="grm-cgpa__planner-result">
            {cgpa === null ? (
              <p className="grm-cgpa__planner-note">Complete current semester rows above with valid SGPAs and credits to run goal planning.</p>
            ) : targetRequiredSgpa === null ? (
              <p className="grm-cgpa__planner-note">Enter a valid target CGPA (1-10) and positive upcoming credits.</p>
            ) : targetRequiredSgpa > 10 ? (
              <div className="grm-cgpa__planner-alert is-warning">
                <strong>Target unreachable in 1 semester (Required SGPA: {targetRequiredSgpa.toFixed(2)} &gt; 10.00)</strong>
                <p>The gap between current performance ({cgpa.toFixed(2)}) and target ({Number(targetCgpa).toFixed(2)}) cannot be bridged with only {targetCredits} credits. Consider extending your goal across multiple semesters.</p>
              </div>
            ) : targetRequiredSgpa <= 0 ? (
              <div className="grm-cgpa__planner-alert is-success">
                <strong><FiCheck aria-hidden="true" /> Target Already Secured!</strong>
                <p>Your current performance ({cgpa.toFixed(2)}) already exceeds target {Number(targetCgpa).toFixed(2)}. Any passing grade (&ge; 5.0) in upcoming {targetCredits} credits will maintain your goal.</p>
              </div>
            ) : (
              <div className="grm-cgpa__planner-alert is-achievable">
                <div className="grm-cgpa__planner-req">
                  <span>Required SGPA in Next Semester:</span>
                  <strong>{targetRequiredSgpa.toFixed(2)}</strong>
                  <small>out of 10.00</small>
                </div>
                <p>Scoring an SGPA of <strong>{targetRequiredSgpa.toFixed(2)}</strong> across {targetCredits} credits will lift your cumulative performance from {cgpa.toFixed(2)} to <strong>{Number(targetCgpa).toFixed(2)} CGPA</strong>.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </section>
}
// #endregion pages/examinations/grade-result-management/CGPACalculator.jsx
return {
  get default() { return CGPACalculator; }
};
})();

export const CGPACalculatorPageModule = (() => {
const { default: DashboardLayout } = DashboardLayoutModule;
const { default: PageHeader } = PageHeaderModule;
const { NavLink } = external1;
const { FiAward } = external3;
const { FiPercent } = external3;
const { useAcademic } = AcademicContextModule;
const { default: CGPACalculator } = CGPACalculatorModule;
/* Imports for isolated regression tests:
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import { NavLink } from 'react-router-dom'
import { FiAward, FiPercent } from 'react-icons/fi'
import { useAcademic } from '../../../context/AcademicContext'
import CGPACalculator from './CGPACalculator'
*/
// #region pages/examinations/grade-result-management/CGPACalculatorPage.jsx
/* export default */ function CGPACalculatorPage() {
  const { selectedCollegeId, selectedAcademicYearId } = useAcademic()
  const scope = `${selectedCollegeId || 'none'}:${selectedAcademicYearId || 'none'}`
  return <DashboardLayout><div className="grm grm--cgpa-page">
    <PageHeader title="CGPA Calculator" subtitle="Calculate a credit-weighted cumulative GPA across completed semesters." breadcrumb={[{ label: 'Grades System and Results', link: '/grade-result-management/grade-configuration' }, 'CGPA Calculator']} />
    <nav className="grm-nav grm-nav--grade" aria-label="Grade management tools">
      <NavLink to="/grade-result-management/grade-configuration">
        <FiAward aria-hidden="true" />
        <span>Grade Management</span>
      </NavLink>
      <NavLink to="/grade-result-management/cgpa-calculator" end>
        <FiPercent aria-hidden="true" />
        <span>CGPA Calculator</span>
      </NavLink>
    </nav>
    <CGPACalculator key={scope} storageKey={`cms-cgpa:${scope}`} />
  </div></DashboardLayout>
}
// #endregion pages/examinations/grade-result-management/CGPACalculatorPage.jsx
return {
  get default() { return CGPACalculatorPage; }
};
})();

export const ResultGenerationModule = (() => {
const { default: GradeResultWorkspace } = GradeResultWorkspaceModule;
/* Imports for isolated regression tests:
import GradeResultWorkspace from './GradeResultWorkspace'
import './ResultGeneration.css'
*/
// #region pages/examinations/grade-result-management/ResultGeneration.jsx
/* export default */ function ResultGeneration() {
  return <GradeResultWorkspace screen="result-generation" />
}
// #endregion pages/examinations/grade-result-management/ResultGeneration.jsx
return {
  get default() { return ResultGeneration; }
};
})();

export const SemesterResultModule = (() => {
const { default: GradeResultWorkspace } = GradeResultWorkspaceModule;
/* Imports for isolated regression tests:
import GradeResultWorkspace from './GradeResultWorkspace'
import './SemesterResult.css'
*/
// #region pages/examinations/grade-result-management/SemesterResult.jsx
/* export default */ function SemesterResult() {
  return <GradeResultWorkspace screen="semester-result" />
}
// #endregion pages/examinations/grade-result-management/SemesterResult.jsx
return {
  get default() { return SemesterResult; }
};
})();

export const DepartmentResultModule = (() => {
const { default: GradeResultWorkspace } = GradeResultWorkspaceModule;
/* Imports for isolated regression tests:
import GradeResultWorkspace from './GradeResultWorkspace'
import './DepartmentResult.css'
*/
// #region pages/examinations/grade-result-management/DepartmentResult.jsx
/* export default */ function DepartmentResult() {
  return <GradeResultWorkspace screen="department-result" />
}
// #endregion pages/examinations/grade-result-management/DepartmentResult.jsx
return {
  get default() { return DepartmentResult; }
};
})();

export const ConsolidatedMarksMemoModule = (() => {
const { default: GradeResultWorkspace } = GradeResultWorkspaceModule;
/* Imports for isolated regression tests:
import GradeResultWorkspace from './GradeResultWorkspace'
import './ConsolidatedMarksMemo.css'
*/
// #region pages/examinations/grade-result-management/ConsolidatedMarksMemo.jsx
/* export default */ function ConsolidatedMarksMemo() {
  return <GradeResultWorkspace screen="consolidated-marks-memo" />
}
// #endregion pages/examinations/grade-result-management/ConsolidatedMarksMemo.jsx
return {
  get default() { return ConsolidatedMarksMemo; }
};
})();

export const BacklogReportModule = (() => {
const { default: GradeResultWorkspace } = GradeResultWorkspaceModule;
/* Imports for isolated regression tests:
import GradeResultWorkspace from './GradeResultWorkspace'
import './BacklogReport.css'
*/
// #region pages/examinations/grade-result-management/BacklogReport.jsx
/* export default */ function BacklogReport() {
  return <GradeResultWorkspace screen="backlog-report" />
}
// #endregion pages/examinations/grade-result-management/BacklogReport.jsx
return {
  get default() { return BacklogReport; }
};
})();

export const StudentResultModule = (() => {
const { default: GradeResultWorkspace } = GradeResultWorkspaceModule;
/* Imports for isolated regression tests:
import GradeResultWorkspace from './GradeResultWorkspace'
import './StudentResult.css'
*/
// #region pages/examinations/grade-result-management/StudentResult.jsx
/* export default */ function StudentResult() {
  return <GradeResultWorkspace screen="student-result" />
}
// #endregion pages/examinations/grade-result-management/StudentResult.jsx
return {
  get default() { return StudentResult; }
};
})();

export const GradeResultManagement = GradeResultManagementModule.default;
export const GradePolicyLab = GradePolicyLabModule.default;
export const ResultInsights = ResultInsightsModule.default;
export const GradeResultWorkspace = GradeResultWorkspaceModule.default;
export const GradeConfiguration = GradeConfigurationModule.default;
export const CGPACalculator = CGPACalculatorModule.default;
export const CGPACalculatorPage = CGPACalculatorPageModule.default;
export const ResultGeneration = ResultGenerationModule.default;
export const SemesterResult = SemesterResultModule.default;
export const DepartmentResult = DepartmentResultModule.default;
export const ConsolidatedMarksMemo = ConsolidatedMarksMemoModule.default;
export const BacklogReport = BacklogReportModule.default;
export const StudentResult = StudentResultModule.default;
