import { useEffect, useMemo, useRef, useState } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import ViewDialog from '../../../components/ViewDialog'
import { useAcademic } from '../../../context/AcademicContext'
import { FiAward, FiDownload, FiFileText, FiInfo, FiPrinter, FiSearch, FiUser } from 'react-icons/fi'
import { list, loadGradePolicy, loadResultCandidates, loadResultExaminations, reviewExamResult } from '../../../services/scopedModulesService'
import { printEntityDetails } from '../../../utils/exportUtils'
import './StudentExaminationResults.css'

const idOf = row => row?.studentId ?? row?.id
const studentNameOf = row => row?.fullName || row?.studentName || row?.personal?.fullName || [row?.firstName, row?.lastName].filter(Boolean).join(' ') || ''
const rollOf = row => row?.rollNumber || row?.academic?.rollNumber || row?.registrationNumber || row?.studentCode || row?.admission?.admissionNumber || ''
const nullableValue = value => value === 0 ? '0' : value == null || value === '' ? '—' : value
const textOf = value => typeof value === 'object' && value !== null ? value.name || value.label || value.semesterName || value.branchName || '' : value || ''

export default function StudentExaminationResults() {
  const academic = useAcademic()
  const resultCardRef = useRef(null)
  const [students, setStudents] = useState([])
  const [exams, setExams] = useState([])
  const [yearId, setYearId] = useState(String(academic.selectedAcademicYearId || ''))
  const [examId, setExamId] = useState('')
  const [studentQuery, setStudentQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [examsLoading, setExamsLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [studentError, setStudentError] = useState('')
  const [examError, setExamError] = useState('')
  const [resultRecord, setResultRecord] = useState(null)
  const [backlogRows, setBacklogRows] = useState(null)
  const [gradeScaleOpen, setGradeScaleOpen] = useState(false)
  const [gradeScaleLoading, setGradeScaleLoading] = useState(false)
  const [gradeScaleError, setGradeScaleError] = useState('')
  const [gradePolicy, setGradePolicy] = useState(null)

  const scope = { collegeId: academic.selectedCollegeId, academicYearId: yearId }
  const selectedExam = exams.find(row => String(row.examId) === String(examId)) || null
  const suggestions = useMemo(() => {
    const query = studentQuery.trim().toLowerCase()
    if (!query || selectedStudent && `${studentNameOf(selectedStudent)} ${rollOf(selectedStudent)}`.toLowerCase() === query) return []
    return students.filter(student => `${studentNameOf(student)} ${rollOf(student)}`.toLowerCase().includes(query)).slice(0, 8)
  }, [students, studentQuery, selectedStudent])

  useEffect(() => {
    setYearId(String(academic.selectedAcademicYearId || ''))
    setResultRecord(null)
    setExamId('')
  }, [academic.selectedAcademicYearId, academic.selectedCollegeId])

  useEffect(() => {
    let current = true
    if (academic.loading || !academic.selectedCollegeId) {
      setStudents([])
      return undefined
    }
    setStudentsLoading(true)
    setStudentError('')
    list('student-profiles', { collegeId: academic.selectedCollegeId })
      .then(rows => {
        if (!current) return
        setStudents(rows.filter(row => String(row.collegeId ?? row.academic?.collegeId ?? row.admission?.collegeId) === String(academic.selectedCollegeId))
          .filter(row => Number(idOf(row)) > 0)
          .sort((left, right) => studentNameOf(left).localeCompare(studentNameOf(right))))
      })
      .catch(reason => { if (current) setStudentError(reason.message || 'Unable to load students.') })
      .finally(() => { if (current) setStudentsLoading(false) })
    return () => { current = false }
  }, [academic.loading, academic.selectedCollegeId])

  useEffect(() => {
    let current = true
    setResultRecord(null)
    setExamId('')
    if (!academic.selectedCollegeId || !yearId) {
      setExams([])
      setExamsLoading(false)
      return undefined
    }
    setExamsLoading(true)
    setExamError('')
    loadResultExaminations(scope)
      .then(rows => { if (current) setExams(rows) })
      .catch(reason => { if (current) { setExams([]); setExamError(reason.message || 'Unable to load examinations.') } })
      .finally(() => { if (current) setExamsLoading(false) })
    return () => { current = false }
  }, [academic.selectedCollegeId, yearId])

  const chooseStudent = student => {
    setSelectedStudent(student)
    setStudentQuery(`${studentNameOf(student)}${rollOf(student) ? ` · ${rollOf(student)}` : ''}`)
    setShowSuggestions(false)
    setResultRecord(null)
    setError('')
  }

  const searchResult = async event => {
    event.preventDefault()
    if (searching) return
    setError('')
    setResultRecord(null)
    setBacklogRows(null)
    if (!academic.selectedCollegeId || !yearId) { setError('Select an academic year.'); return }
    if (!selectedStudent) { setError('Choose a student from the search suggestions.'); return }
    if (!selectedExam) { setError('Select an examination.'); return }
    setSearching(true)
    try {
      const candidates = await loadResultCandidates(scope, selectedExam)
      const candidate = candidates.find(row => String(row.studentId) === String(idOf(selectedStudent)))
      if (!candidate) throw new Error('No approved marks were found for this student and examination.')
      const reviewed = await reviewExamResult(scope, selectedExam, candidate)
      setResultRecord({ ...reviewed, student: selectedStudent, exam: selectedExam })
      try {
        const backlogRecords = await list(`results/student/${idOf(selectedStudent)}/backlogs`)
        setBacklogRows(backlogRecords.filter(row => {
          const resultIds = new Set(reviewed.result.subjects.map(subject => String(subject.resultId)).filter(Boolean))
          return row.sourceResultId != null && resultIds.has(String(row.sourceResultId))
        }))
      } catch {
        setBacklogRows(null)
      }
    } catch (reason) {
      setError(reason.status === 404 ? 'Approved marks were found, but no calculated result exists for this student and examination.' : reason.message || 'Unable to load this examination result.')
    } finally { setSearching(false) }
  }

  const openGradeScale = async () => {
    setGradeScaleOpen(true)
    setGradeScaleError('')
    setGradePolicy(null)
    if (!academic.selectedCollegeId || !yearId) { setGradeScaleError('Select an academic year to view its grade scale.'); return }
    setGradeScaleLoading(true)
    try { setGradePolicy(await loadGradePolicy(scope)) }
    catch (reason) { setGradeScaleError(reason.message || 'Unable to load the grade scale.') }
    finally { setGradeScaleLoading(false) }
  }

  const printMemo = () => {
    try { printEntityDetails({ title: 'Student Examination Result Memo', element: resultCardRef.current }) }
    catch (reason) { setError(reason.message || 'Unable to open the print preview.') }
  }

  const result = resultRecord?.result
  const validation = resultRecord?.validation
  const student = resultRecord?.student
  const exam = resultRecord?.exam
  const academicYear = academic.academicYears?.find(row => String(row.id ?? row.academicYearId) === String(yearId))
  const branch = academic.activeBranches?.find(row => String(row.branchId ?? row.id) === String(exam?.branchId ?? student?.academic?.branchId))
  const semester = academic.activeSemesters?.find(row => String(row.semesterId ?? row.id) === String(exam?.semesterId ?? student?.academic?.semesterId))
  const resultSubjects = result?.subjects || []
  const backlogCount = result?.backlogCount ?? (backlogRows ? backlogRows.length : null)
  const percentage = result?.percentage ?? result?.percentageScore ?? result?.resultPercentage
  const rawStatus = String(result?.resultStatus || '').toLowerCase()
  const displayStatus = ({ pass: 'Passed', passed: 'Passed', fail: 'Failed', failed: 'Failed', absent: 'Absent' })[rawStatus] || result?.resultStatus || '—'
  const bands = Array.isArray(gradePolicy?.bands) ? [...gradePolicy.bands].sort((left, right) => Number(right.min) - Number(left.min)) : []

  return <DashboardLayout>
    <main className="student-exam-results">
      <PageHeader title="Grades & Results" subtitle="Search for a student to review official examination marks, grades, GPA and backlogs." />
      <section className="ser-search-card" aria-labelledby="ser-search-title">
        <div className="ser-search-heading"><span className="ser-search-icon"><FiSearch aria-hidden="true" /></span><div><h2 id="ser-search-title">Find a student result</h2><p>Choose the student and examination to view the official result record.</p></div></div>
        <form className="ser-search-form" onSubmit={searchResult}>
          <label className="ser-search-field ser-student-field"><span>Student Name / Roll Number</span><input role="combobox" aria-autocomplete="list" aria-expanded={Boolean(showSuggestions && suggestions.length)} aria-controls="ser-student-suggestions" aria-label="Student Name or Roll Number" autoComplete="off" placeholder="Search by name or roll number" value={studentQuery} onFocus={() => setShowSuggestions(true)} onChange={event => { setStudentQuery(event.target.value); setSelectedStudent(null); setResultRecord(null); setShowSuggestions(true); setError('') }} />
            {showSuggestions && suggestions.length > 0 && <div className="ser-suggestions" id="ser-student-suggestions" role="listbox">{suggestions.map(item => <button key={idOf(item)} type="button" role="option" aria-selected={String(idOf(item)) === String(idOf(selectedStudent))} onMouseDown={event => event.preventDefault()} onClick={() => chooseStudent(item)}><span><strong>{studentNameOf(item)}</strong><small>{rollOf(item) || 'No roll number'}</small></span><FiUser aria-hidden="true" /></button>)}</div>}
            {studentQuery && !selectedStudent && !studentsLoading && showSuggestions && !suggestions.length && <div className="ser-suggestions ser-no-suggestions" role="status">No matching student found.</div>}
          </label>
          <label className="ser-search-field"><span>Academic Year</span><select value={yearId} onChange={event => { setYearId(event.target.value); setResultRecord(null); setError('') }} disabled={!academic.academicYears?.length}><option value="">Select academic year</option>{academic.academicYears?.map(row => <option key={row.id ?? row.academicYearId} value={row.id ?? row.academicYearId}>{row.name || row.academicYearName || row.yearName}</option>)}</select></label>
          <label className="ser-search-field"><span>Examination</span><select value={examId} onChange={event => { setExamId(event.target.value); setResultRecord(null); setError('') }} disabled={examsLoading || !exams.length}><option value="">{examsLoading ? 'Loading examinations…' : 'Select examination'}</option>{exams.map(row => <option key={row.examId} value={row.examId}>{row.examName}</option>)}</select></label>
          <button className="ser-primary-button" type="submit" disabled={searching || studentsLoading || examsLoading || !selectedStudent || !selectedExam}><FiSearch aria-hidden="true" />{searching ? 'Searching…' : 'Search'}</button>
        </form>
        {(studentError || examError) && <p className="ser-error" role="alert">{studentError || examError}</p>}
        {studentsLoading && <p className="ser-loading" role="status">Loading student directory…</p>}
      </section>

      {error && <p className="ser-error" role="alert">{error}</p>}
      {searching && <div className="ser-loading-card" role="status"><span className="ser-spinner" />Loading official result and validation…</div>}
      {!resultRecord && !searching && <section className="ser-empty" aria-live="polite"><span><FiFileText aria-hidden="true" /></span><h2>Student results appear here</h2><p>Search by student name or roll number, choose an academic year and examination, then select Search.</p></section>}

      {resultRecord && <section className="ser-result-card" ref={resultCardRef} aria-labelledby="ser-result-heading">
        <header className="ser-result-header"><div><span className="ser-kicker">OFFICIAL EXAMINATION RESULT</span><h2 id="ser-result-heading">{studentNameOf(student) || 'Student Result'}</h2><p>{rollOf(student) || 'Roll number unavailable'} <span>·</span> {exam.examName}</p></div><button type="button" className="ser-grade-scale-button" onClick={openGradeScale}><FiInfo aria-hidden="true" />Grade scale</button></header>
        {!validation?.isValid && <p className="ser-validation-warning" role="status">The backend returned validation issues for this result. Review the official record before taking action.</p>}
        <div className="ser-student-meta">
          <div><small>Department / Branch</small><strong>{exam.branchName || textOf(branch?.branchName || branch?.name) || textOf(student.academic?.branchName) || '—'}</strong></div>
          <div><small>Semester</small><strong>{exam.semesterName || textOf(semester?.semesterName || semester?.name) || textOf(student.academic?.semesterName) || '—'}</strong></div>
          <div><small>Academic Year</small><strong>{academicYear?.name || academicYear?.academicYearName || '—'}</strong></div>
          <div><small>Examination</small><strong>{exam.examName || '—'}</strong></div>
        </div>
        <div className="ser-summary" aria-label="Result summary">
          <div><small>Maximum Marks</small><strong>{nullableValue(result.totalMaximumMarks ?? result.maximumMarks)}</strong></div>
          <div><small>Obtained Marks</small><strong>{nullableValue(result.totalMarksObtained ?? result.marksObtained)}</strong></div>
          <div><small>Percentage</small><strong>{percentage == null ? '—' : `${percentage}%`}</strong></div>
          <div><small>Overall Grade</small><strong>{nullableValue(result.overallGrade)}</strong></div>
          <div><small>SGPA</small><strong>{nullableValue(result.sgpa)}</strong></div>
          <div><small>CGPA</small><strong>{nullableValue(result.cgpa)}</strong></div>
          <div><small>Result</small><strong className={`ser-result-status ${displayStatus === 'Passed' ? 'is-pass' : ['Failed', 'Absent'].includes(displayStatus) ? 'is-fail' : ''}`}>{displayStatus}</strong></div>
          <div><small>Backlogs</small><strong>{backlogCount == null ? '—' : backlogCount}</strong></div>
        </div>
        <section className="ser-subject-section" aria-labelledby="ser-subject-heading">
          <div className="ser-section-title"><div><h3 id="ser-subject-heading">Subject-wise results</h3><p>Marks, maximums and grades returned by the examination result service.</p></div><span>{resultSubjects.length} subjects</span></div>
          <div className="ser-table-wrap"><table className="ser-table"><thead><tr><th>S.No</th><th>Subject</th><th>Subject Code</th><th>Internal</th><th>Practical</th><th>External</th><th>Total</th><th>Grade</th><th>Status</th></tr></thead><tbody>{resultSubjects.map((subject, index) => {
            const rawSubjectStatus = String(subject.resultStatus || '').toLowerCase()
            const status = subject.isAbsent ? 'Absent' : ({ pass: 'Passed', passed: 'Passed', fail: 'Failed', failed: 'Failed' })[rawSubjectStatus] || subject.resultStatus || '—'
            const failed = ['fail','failed','absent'].includes(String(status).toLowerCase())
            return <tr key={subject.resultId ?? subject.examScheduleId ?? `${subject.subjectCode}-${index}`} className={failed ? 'is-failed' : ''}>
              <td data-label="S.No">{index + 1}</td><td data-label="Subject">{subject.subjectName || '—'}</td><td data-label="Subject Code">{subject.subjectCode || '—'}</td>
              <td data-label="Internal">{nullableValue(subject.internalMarks)}</td><td data-label="Practical">{nullableValue(subject.practicalMarks)}</td><td data-label="External">{nullableValue(subject.externalMarks)}</td>
              <td data-label="Total">{subject.isAbsent ? 'Absent' : `${nullableValue(subject.marksObtained ?? subject.totalMarks)} / ${nullableValue(subject.maximumMarks)}`}</td><td data-label="Grade">{nullableValue(subject.grade)}</td><td data-label="Status"><span className={`ser-subject-status ${failed ? 'is-failed' : status === 'Passed' ? 'is-passed' : ''}`}>{status}</span></td>
            </tr>
          })}{!resultSubjects.length && <tr><td colSpan="9" className="ser-empty-table">No subject result details were returned for this examination.</td></tr>}</tbody></table></div>
        </section>
        {validation?.validations?.length > 0 && <details className="ser-validation-details"><summary>Result validation checks</summary><ul>{validation.validations.map((check, index) => <li key={`${check.rule || 'check'}-${index}`} className={check.isValid ? 'is-valid' : 'is-invalid'}><strong>{check.rule || `Check ${index + 1}`}</strong><span>{check.message || (check.isValid ? 'Passed' : 'Needs review')}</span></li>)}</ul></details>}
        <footer className="ser-result-actions" data-no-print>
          <button type="button" className="ser-primary-button" onClick={printMemo}><FiDownload aria-hidden="true" />Download Memo (PDF)</button>
          <button type="button" className="ser-secondary-button" onClick={() => window.print()}><FiPrinter aria-hidden="true" />Print Result</button>
        </footer>
      </section>}

      {gradeScaleOpen && <ViewDialog title="Grade Scale" subtitle={academicYear?.name ? `Configured scale · ${academicYear.name}` : 'Configured grade bands'} onClose={() => setGradeScaleOpen(false)} showExport={false} maxWidth="540px" className="ser-grade-dialog">
        {gradeScaleLoading && <p role="status">Loading configured grade scale…</p>}
        {gradeScaleError && <p className="ser-error" role="alert">{gradeScaleError}</p>}
        {!gradeScaleLoading && !gradeScaleError && !gradePolicy && <p className="ser-empty-scale">No grade scale is configured for this academic year.</p>}
        {bands.length > 0 && <div className="ser-table-wrap"><table className="ser-table ser-grade-table"><thead><tr><th>Grade</th><th>Minimum</th><th>Maximum</th><th>Grade Points</th><th>Outcome</th></tr></thead><tbody>{bands.map(band => <tr key={band.grade}><td>{band.grade}</td><td>{band.min}</td><td>{band.max}</td><td>{band.points}</td><td>{band.pass ? 'Pass' : 'Fail'}</td></tr>)}</tbody></table></div>}
      </ViewDialog>}
    </main>
  </DashboardLayout>
}
