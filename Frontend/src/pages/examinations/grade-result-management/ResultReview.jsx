import { useEffect, useState } from 'react'
import { ProjectSelect } from '../../../components/SearchableSelect'
import ViewDialog from '../../../components/ViewDialog'
import { loadResultCandidates, loadResultExaminations, loadStudentResultHistory, reviewExamResult } from '../../../services/scopedModulesService'

export default function ResultReview({ collegeId, academicYearId, onReviewed, initialExamId = '', initialStudentId = '' }) {
  const [examId, setExamId] = useState(String(initialExamId))
  const [studentId, setStudentId] = useState(initialExamId ? String(initialStudentId) : '')
  const [exams, setExams] = useState(null)
  const [roster, setRoster] = useState(null)
  const [examError, setExamError] = useState('')
  const [rosterError, setRosterError] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [review, setReview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState(null)
  const [historyError, setHistoryError] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [examAttempt, setExamAttempt] = useState(0)
  const [rosterAttempt, setRosterAttempt] = useState(0)
  const exam = exams?.find(row => String(row.examId) === examId)
  const candidate = roster?.find(row => String(row.studentId) === studentId)

  useEffect(() => {
    let active = true
    loadResultExaminations({ collegeId, academicYearId }).then(rows => {
      if (active) setExams(rows)
    }).catch(error => { if (active) setExamError(error.message) })
    return () => { active = false }
  }, [collegeId, academicYearId, examAttempt])

  useEffect(() => {
    if (!exam) return
    let active = true
    loadResultCandidates({ collegeId, academicYearId }, exam).then(rows => {
      if (active) setRoster(rows)
    }).catch(error => { if (active) setRosterError(error.message) })
    return () => { active = false }
  }, [collegeId, academicYearId, exam, rosterAttempt])

  useEffect(() => {
    if (!review || !exams) return
    let active = true
    loadStudentResultHistory({ collegeId, academicYearId }, exams, review.result.studentId)
      .then(rows => { if (active) setHistory(rows) })
      .catch(error => { if (active) setHistoryError(error.message) })
      .finally(() => { if (active) setHistoryLoading(false) })
    return () => { active = false }
  }, [collegeId, academicYearId, exams, review])

  const openReview = async event => {
    event.preventDefault()
    if (busy || !exam || !candidate) return
    setBusy(true)
    setHistory(null)
    setHistoryLoading(true)
    setHistoryError('')
    setReviewError('')
    try {
      setReview(await reviewExamResult({ collegeId, academicYearId }, exam, candidate))
      onReviewed?.()
    } catch (error) {
      setReviewError(error.status === 404 ? 'Approved marks were found, but the server has no calculated result for this student and exam. Ask the examination team to check result generation.' : error.message)
    } finally {
      setBusy(false)
    }
  }

  return <section className="erp-card res-card">
    <div className="res-review-heading"><div>
      <h3 className="res-card-title">Examination Result Review</h3>
      <p className="res-card-subtitle">Select an examination and a student with approved marks. Review the result and validation returned by the server.</p>
    </div><a className="res-btn res-btn--outline res-review-grade-link" href="/grade-result-management/grade-configuration">View Grade Scale</a></div>
    <form className="res-review-form" onSubmit={openReview}>
      <label className="res-review-field">Examination
        <ProjectSelect value={exam ? examId : ''} disabled={busy || !exams?.length} onChange={event => {
          setExamId(event.target.value); setStudentId(''); setRoster(null); setRosterError(''); setReviewError('')
        }}>
          <option value="">Select examination</option>
          {exams?.map(row => <option key={row.examId} value={row.examId}>{row.examName}</option>)}
        </ProjectSelect>
      </label>
      <label className="res-review-field">Student
        <ProjectSelect value={candidate ? studentId : ''} disabled={busy || !roster?.length} onChange={event => { setStudentId(event.target.value); setReviewError('') }}>
          <option value="">Select student</option>
          {roster?.map(row => <option key={row.studentId} value={row.studentId}>{row.studentName || row.studentCode || row.studentId}</option>)}
        </ProjectSelect>
      </label>
      <button className="res-btn res-btn--primary" type="submit" disabled={!candidate || busy}>{busy ? 'Checking result…' : reviewError ? 'Retry review' : 'Review result'}</button>
    </form>
    {examError && <p role="alert">{examError} <button type="button" onClick={() => { setExamError(''); setExamAttempt(value => value + 1) }}>Retry examinations</button></p>}
    {rosterError && <p role="alert">{rosterError} <button type="button" onClick={() => { setRosterError(''); setRosterAttempt(value => value + 1) }}>Retry students</button></p>}
    {exams?.length > 0 && examId && !exam && <p role="status">The linked examination is outside the selected college or academic year. Select an available examination to continue.</p>}
    {roster?.length > 0 && studentId && !candidate && <p role="status">The linked student has no approved marks for this examination. Select a student with approved marks.</p>}
    {reviewError && <p role="alert">{reviewError}</p>}
    {!exams && !examError && <p role="status">Loading examinations…</p>}
    {exams?.length === 0 && <div className="res-review-empty" role="status"><strong>No examinations found for this academic year</strong><span>Set up an examination first, then approved marks and calculated results will appear here.</span><a href="/examination-setup">Go to Examination Setup</a><a href="/grade-result-management/grade-configuration">View Grade Scale</a></div>}
    {exam && !roster && !rosterError && <p role="status">Loading students with approved marks…</p>}
    {roster?.length === 0 && <p role="status">No approved marks for this examination.</p>}
    {review && <ViewDialog title="Examination Result Review" subtitle={candidate?.studentName} onClose={() => setReview(null)} showExport={false}>
      <p>{review.validation.isValid ? 'Server validation passed.' : 'Server validation found issues.'}</p>
      <p>Result {review.result.resultStatus || '—'} · Grade {review.result.overallGrade ?? '—'} · SGPA {review.result.sgpa ?? '—'} · CGPA {review.result.cgpa ?? '—'}</p>
      <div className="res-table-wrapper"><table className="erp-table">
        <thead><tr><th>Subject</th><th>Credits</th><th>Marks</th><th>Grade</th><th>Grade points</th><th>Status</th></tr></thead>
        <tbody>{review.result.subjects.map(subject => <tr key={subject.resultId || subject.examScheduleId}>
          <td>{subject.subjectName || subject.subjectCode}</td><td>{subject.credits ?? '—'}</td>
          <td>{subject.isAbsent ? 'Absent' : `${subject.marksObtained ?? '—'} / ${subject.maximumMarks ?? '—'}`}</td>
          <td>{subject.grade ?? '—'}</td><td>{subject.gradePoint ?? '—'}</td><td>{subject.resultStatus || '—'}</td>
        </tr>)}</tbody>
      </table></div>
      <ul>{review.validation.validations.map((row, index) => <li key={`${row.rule}:${index}`}>{row.rule} · {row.isValid ? 'Passed' : 'Issue'} · {row.message}</li>)}</ul>
      <h3>Calculated Result History</h3>
      {historyLoading && <p role="status">Loading result history…</p>}
      {historyError && <p role="alert">{historyError} <button type="button" onClick={() => { setHistoryLoading(true); setHistoryError(''); setReview(current => ({ ...current })) }}>Retry history</button></p>}
      {history?.length === 0 && <p>No calculated results for this academic year.</p>}
      {history?.length > 0 && <div className="res-table-wrapper"><table className="erp-table">
        <thead><tr><th>Examination</th><th>Marks</th><th>SGPA</th><th>CGPA</th><th>Status</th></tr></thead>
        <tbody>{history.map(row => <tr key={row.examId}>
          <td>{exams.find(item => String(item.examId) === String(row.examId))?.examName || row.examId}</td>
          <td>{row.totalMarksObtained ?? '—'} / {row.totalMaximumMarks ?? '—'}</td><td>{row.sgpa ?? '—'}</td><td>{row.cgpa ?? '—'}</td><td>{row.resultStatus || '—'}</td>
        </tr>)}</tbody>
      </table></div>}
    </ViewDialog>}
  </section>
}
