import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  FiAlertCircle,
  FiAward,
  FiBookOpen,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEdit3,
  FiFilter,
  FiHelpCircle,
  FiLayers,
  FiRefreshCw,
  FiSearch,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
  FiZap
} from 'react-icons/fi'
import { getAuthStorage } from '../../auth/auth.js'
import { teachingService as service } from '../../services/portals/teachingService.js'
import { Feedback, PortalDialog } from '../../components/portals/PortalUI.jsx'
import './teaching-marks.css'

const same = (a, b) => String(a) === String(b)
const valid = (value, max) =>
  value !== '' && value != null && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= max

const getGradeBadge = (marks, max) => {
  if (marks === '' || marks == null || !max || isNaN(marks)) return null
  const pct = (Number(marks) / max) * 100
  if (pct >= 90) return { label: 'O', text: 'Outstanding', className: 'tm-grade-o' }
  if (pct >= 80) return { label: 'A+', text: 'Excellent', className: 'tm-grade-aplus' }
  if (pct >= 70) return { label: 'A', text: 'Very Good', className: 'tm-grade-a' }
  if (pct >= 60) return { label: 'B+', text: 'Good', className: 'tm-grade-bplus' }
  if (pct >= 50) return { label: 'B', text: 'Average', className: 'tm-grade-b' }
  if (pct >= 40) return { label: 'C', text: 'Pass', className: 'tm-grade-c' }
  return { label: 'F', text: 'Needs Improvement', className: 'tm-grade-f' }
}

const mockData = {
  assignments: [
    {
      id: 'demo-class',
      sectionId: 'demo-section',
      academicYearId: 'demo-year',
      academicYearName: '2026-2027',
      branchId: 'demo-program',
      branchName: 'Computer Science and Engineering',
      semesterId: 'demo-semester',
      semesterName: 'Semester 1',
      subjectName: 'Electrical Circuits',
      subjectCode: 'EE101',
      sectionName: 'Section A'
    }
  ],
  students: [
    'Aisha Khan',
    'Ben Miller',
    'Chloe Chen',
    'David Lee',
    'Priya Reddy',
    'Arjun Kumar',
    'Meera Rao',
    'Sai Teja'
  ].map((name, index) => ({
    id: 'demo-student-' + index,
    sectionId: 'demo-section',
    rollNumber: '26CSE' + String(index + 1).padStart(3, '0'),
    name,
    attendancePercentage: [94, 88, 95, 78, 92, 86, 97, 90][index]
  }))
}

mockData.assignments.push(
  ...[
    ['demo-ds', 'Data Structures', 'CS201'],
    ['demo-lab-course', 'Programming Laboratory', 'CS102L']
  ].map(([id, subjectName, subjectCode]) => ({ ...mockData.assignments[0], id, subjectName, subjectCode }))
)

const mockExams = [
  { examId: 'demo-mid1', examName: 'Mid Exam I' },
  { examId: 'demo-mid2', examName: 'Mid Exam II' },
  { examId: 'demo-theory', examName: 'Theory Examination' },
  { examId: 'demo-practical', examName: 'Practical Examination' },
  { examId: 'demo-lab', examName: 'Lab Examination' },
  { examId: 'demo-final', examName: 'Semester Examination' }
]

const mockEntries = Object.fromEntries(
  mockData.students.map((row, index) => [
    row.id,
    {
      theory: String([25, 29, 28, 22, 24, 27, 26, 23][index]),
      practical: index === 2 ? '' : String([18, 20, 17, 15, 19, 16, 18, 17][index])
    }
  ])
)

const initialEntries = exam =>
  Object.fromEntries(
    mockData.students.map((row, index) => [
      row.id,
      {
        marks: /practical|lab/.test(exam)
          ? mockEntries[row.id].practical
          : index === 2
          ? ''
          : mockEntries[row.id].theory
      }
    ])
  )

export default function TeachingMarks({ data }) {
  const [demo, setDemo] = useState(true)

  return (
    <div className="tm-wrapper">
      <div className={`tm-mode-bar ${demo ? 'is-demo' : 'is-live'}`}>
        <div className="tm-mode-info">
          <span className="tm-mode-pill">{demo ? 'MOCK WORKSPACE' : 'LIVE COLLEGE SYSTEM'}</span>
          <p>
            {demo
              ? 'Sample students and assessments loaded. You can enter, edit, and test marks calculation freely.'
              : 'Official college records workspace. Evaluation records are synced with the examination cell.'}
          </p>
        </div>
        <button
          type="button"
          className="tm-btn-switch-mode"
          onClick={() => setDemo(value => !value)}
        >
          {demo ? 'Switch to College records' : 'Switch to Demo Workspace'}
        </button>
      </div>

      <MarksWorkspace key={demo ? 'demo' : 'live'} data={demo ? mockData : data} demo={demo} />
    </div>
  )
}

function MarksWorkspace({ data, demo }) {
  const [params] = useSearchParams()
  const [year, setYear] = useState('')
  const [program, setProgram] = useState('')
  const [semester, setSemester] = useState('')
  const [allocation, setAllocation] = useState(demo ? 'demo-class' : params.get('assignment') || '')
  const [exam, setExam] = useState('')
  const [examLoading, setExamLoading] = useState(false)
  const [examError, setExamError] = useState('')
  const [examAttempt, setExamAttempt] = useState(0)
  const [exams, setExams] = useState([])
  const [entries, setEntries] = useState({})
  const [recorded, setRecorded] = useState({})
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [recordsLoaded, setRecordsLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [theoryMax, setTheoryMax] = useState(30)

  const a = data.assignments.find(row => same(row.id, allocation))
  const students = data.students.filter(row => a && same(row.sectionId, a.sectionId))
  const assignments = data.assignments.filter(
    row =>
      (!year || same(row.academicYearId, year)) &&
      (!program || same(row.branchId, program)) &&
      (!semester || same(row.semesterId, semester))
  )

  const options = (key, label) =>
    [...new Map(data.assignments.map(row => [String(row[key]), { value: row[key], label: row[label] || row[key] }])).values()].filter(
      row => row.value != null
    )

  const draftKey = `faculty-marks-single-v2:${demo ? 'demo' : 'live'}:${getAuthStorage()?.getItem(
    'btech-user-college-id'
  )}:${getAuthStorage()?.getItem('btech-user-id')}:${allocation}:${exam}`

  useEffect(() => {
    let active = true
    setExam('')
    setExams([])
    setExamError('')
    setNotice('')
    setExamLoading(false)

    if (demo && a) {
      setExams(mockExams)
      setExam(mockExams[0].examId)
      return
    }

    if (a) {
      setExamLoading(true)
      service
        .getExams(allocation)
        .then(rows => {
          if (active) {
            setExams(rows)
            if (rows.length) setExam(rows[0].examId)
          }
        })
        .catch(e => {
          if (active) setExamError(e.message)
        })
        .finally(() => {
          if (active) setExamLoading(false)
        })
    }
    return () => {
      active = false
    }
  }, [allocation, a, examAttempt, demo])

  useEffect(() => {
    let active = true
    setEntries(demo ? initialEntries(exam) : {})
    setRecorded({})
    setNotice('')
    setError('')
    setRecordsLoaded(false)
    setLoading(false)

    if (!exam) return

    setTheoryMax(/practical|lab/.test(exam) ? 20 : /final/.test(exam) ? 100 : 30)

    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || 'null')
      if (draft) {
        setEntries(draft.entries || {})
        if (draft.theoryMax) setTheoryMax(draft.theoryMax)
      }
    } catch {
      setError('The saved draft could not be read.')
    }

    if (demo) {
      try {
        setRecorded(JSON.parse(localStorage.getItem(draftKey + ':submitted') || '{}'))
        setRecordsLoaded(true)
      } catch {
        setError('The local submission could not be read.')
      }
      return
    }

    setLoading(true)
    service
      .getMarks(allocation, exam)
      .then(rows => {
        if (active) {
          setRecorded(Object.fromEntries(rows.map(row => [String(row.studentId), row])))
          setRecordsLoaded(true)
        }
      })
      .catch(e => {
        if (active) setError(e.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [allocation, exam, draftKey, demo])

  const complete = row => valid(entries[row.id]?.marks, theoryMax)
  const invalid = row =>
    entries[row.id]?.marks != null && entries[row.id]?.marks !== '' && !valid(entries[row.id].marks, theoryMax)

  // Real-time Class Performance Metrics
  const evaluatedStudents = useMemo(
    () => students.filter(row => complete(row) || recorded[row.id]),
    [students, entries, recorded, theoryMax]
  )
  const evaluatedCount = evaluatedStudents.length
  const totalMarksSum = useMemo(() => {
    return evaluatedStudents.reduce((sum, row) => {
      const val = recorded[row.id]?.marksObtained ?? entries[row.id]?.marks
      return sum + Number(val || 0)
    }, 0)
  }, [evaluatedStudents, recorded, entries])

  const classAvg = evaluatedCount ? (totalMarksSum / evaluatedCount).toFixed(1) : '—'
  const highestMark = evaluatedCount
    ? Math.max(
        ...evaluatedStudents.map(row =>
          Number(recorded[row.id]?.marksObtained ?? entries[row.id]?.marks ?? 0)
        )
      )
    : '—'

  const passRate = useMemo(() => {
    if (!evaluatedCount || !theoryMax) return '—'
    const passThreshold = theoryMax * 0.4
    const passed = evaluatedStudents.filter(row => {
      const val = Number(recorded[row.id]?.marksObtained ?? entries[row.id]?.marks ?? 0)
      return val >= passThreshold
    }).length
    return `${Math.round((passed / evaluatedCount) * 100)}%`
  }, [evaluatedStudents, evaluatedCount, theoryMax, recorded, entries])

  const maxValid = Number.isFinite(theoryMax) && theoryMax > 0

  const update = (id, key, value) => {
    setEntries(old => ({ ...old, [id]: { ...old[id], [key]: value } }))
    setRecorded(old => {
      const next = { ...old }
      delete next[id]
      return next
    })
    setNotice('')
  }

  const reset = setter => event => {
    setter(event.target.value)
    setAllocation('')
    setExam('')
  }

  const autofillPassing = () => {
    if (!theoryMax) return
    const target = Math.round(theoryMax * 0.75)
    setEntries(old => {
      const next = { ...old }
      students.forEach(row => {
        if (!recorded[row.id] && (!next[row.id] || !next[row.id].marks)) {
          next[row.id] = { ...next[row.id], marks: String(target) }
        }
      })
      return next
    })
    setNotice(`Auto-filled 75% score (${target} marks) for uncompleted students.`)
  }

  const submit = async () => {
    setBusy(true)
    setError('')
    let saved = 0
    try {
      for (const row of students) {
        if (recorded[row.id]) continue
        if (!demo)
          await service.saveMark({
            allocationId: allocation,
            examId: exam,
            studentId: row.id,
            marksObtained: Number(entries[row.id].marks),
            maxMarks: theoryMax
          })
        saved++
        setRecorded(old => ({
          ...old,
          [row.id]: { marksObtained: Number(entries[row.id].marks), maxMarks: theoryMax }
        }))
      }
      if (demo) {
        const savedRows = Object.fromEntries(
          students.map(row => [
            row.id,
            recorded[row.id] || { marksObtained: Number(entries[row.id].marks), maxMarks: theoryMax }
          ])
        )
        localStorage.setItem(draftKey + ':submitted', JSON.stringify(savedRows))
        localStorage.setItem(draftKey, JSON.stringify({ entries, theoryMax }))
      }
      setNotice(
        demo
          ? 'Mock marks submitted locally. No college records were updated.'
          : 'Marks saved to the college system. Result approval and publication remain with the administration.'
      )
      setConfirm(false)
    } catch (e) {
      setError(`${saved} student records saved in this attempt. ${e.message} Retry to save the remaining records.`)
    } finally {
      setBusy(false)
    }
  }

  const filteredStudents = useMemo(() => {
    return students.filter(row =>
      `${row.name} ${row.rollNumber}`.toLowerCase().includes(search.toLowerCase())
    )
  }, [students, search])

  return (
    <div className="tm-workspace">
      <Feedback error={error} notice={notice} />

      {/* Top Academic & Course Configuration Card */}
      <section className="portal-card tm-config-card">
        <div className="tm-config-header">
          <div className="tm-header-title">
            <span className="tm-eyebrow">ACADEMIC ALLOCATION</span>
            <h2>Select Subject & Examination</h2>
          </div>
          {a && (
            <div className="tm-current-subject-pill">
              <span className="subject-dot" />
              <strong>{a.subjectName}</strong>
              <small>({a.subjectCode}) · {a.sectionName}</small>
            </div>
          )}
        </div>

        <fieldset disabled={busy} className="tm-fieldset">
          <div className="tm-config-grid">
            <label className="tm-field">
              <span className="tm-field-label">Subject & Section</span>
              <select
                aria-label="Table subject"
                value={allocation}
                onChange={e => setAllocation(e.target.value)}
              >
                <option value="">Select assigned subject</option>
                {assignments.map(row => (
                  <option key={row.id} value={row.id}>
                    {row.subjectName} ({row.subjectCode}) - {row.sectionName}
                  </option>
                ))}
              </select>
            </label>

            <label className="tm-field">
              <span className="tm-field-label">Academic Year</span>
              <select value={year} onChange={reset(setYear)}>
                <option value="">All assigned years</option>
                {options('academicYearId', 'academicYearName').map(row => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="tm-field">
              <span className="tm-field-label">Department / Program</span>
              <select value={program} onChange={reset(setProgram)}>
                <option value="">All assigned programs</option>
                {options('branchId', 'branchName').map(row => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="tm-field">
              <span className="tm-field-label">Semester</span>
              <select value={semester} onChange={reset(setSemester)}>
                <option value="">All assigned semesters</option>
                {options('semesterId', 'semesterName').map(row => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="tm-field tm-field-maxmarks">
              <span className="tm-field-label">Maximum Marks</span>
              <div className="tm-max-input-wrap">
                <input
                  type="number"
                  min="1"
                  max="100"
                  disabled={Object.keys(recorded).length > 0}
                  value={theoryMax}
                  onChange={e => setTheoryMax(Number(e.target.value))}
                />
                <span className="tm-max-unit">Pts</span>
              </div>
            </label>
          </div>

          {/* Assessment Type Tabs */}
          {a && exams.length > 0 && (
            <div className="tm-exam-selector-wrap">
              <span className="tm-exam-label">Available Assessments:</span>
              <div className="tm-exam-tabs" role="tablist">
                {exams.map(row => {
                  const isActive = same(row.examId, exam)
                  return (
                    <button
                      key={row.examId}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`tm-exam-tab ${isActive ? 'is-active' : ''}`}
                      onClick={() => setExam(row.examId)}
                    >
                      <FiEdit3 aria-hidden="true" />
                      <span>{row.examName}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {a && !examLoading && (examError || !exams.length) && (
            <div className="tm-assessment-notice" role={examError ? 'alert' : 'status'}>
              <span>
                {examError
                  ? `Unable to load assessments: ${examError}`
                  : 'No matching examinations were returned for this course. Contact the examination branch.'}
              </span>
              <button
                type="button"
                className="tm-btn-retry"
                disabled={busy}
                onClick={() => setExamAttempt(value => value + 1)}
              >
                <FiRefreshCw /> Retry assessments
              </button>
            </div>
          )}
        </fieldset>
      </section>

      {/* Real-time Evaluation Analytics Cards */}
      <section className="tm-analytics-grid" aria-label="Evaluation metrics">
        <article className="tm-stat-card theme-blue">
          <div className="stat-icon">
            <FiUsers />
          </div>
          <div className="stat-content">
            <small>Class Strength</small>
            <strong>{students.length}</strong>
            <span>Enrolled students</span>
          </div>
        </article>

        <article className="tm-stat-card theme-emerald">
          <div className="stat-icon">
            <FiCheckCircle />
          </div>
          <div className="stat-content">
            <small>Evaluated</small>
            <strong>
              {evaluatedCount} <span className="stat-denominator">/ {students.length}</span>
            </strong>
            <div className="stat-progress-bar">
              <div
                className="stat-progress-fill"
                style={{ width: `${students.length ? (evaluatedCount / students.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </article>

        <article className="tm-stat-card theme-indigo">
          <div className="stat-icon">
            <FiTrendingUp />
          </div>
          <div className="stat-content">
            <small>Class Average</small>
            <strong>
              {classAvg} <span className="stat-denominator">/ {theoryMax}</span>
            </strong>
            <span>Based on evaluated rows</span>
          </div>
        </article>

        <article className="tm-stat-card theme-amber">
          <div className="stat-icon">
            <FiAward />
          </div>
          <div className="stat-content">
            <small>Highest Score</small>
            <strong>
              {highestMark} <span className="stat-denominator">/ {theoryMax}</span>
            </strong>
            <span>Pass Rate: {passRate}</span>
          </div>
        </article>
      </section>

      {/* Student Roster & Evaluation Table Card */}
      <section className="portal-card tm-roster-card">
        <header className="tm-roster-header">
          <div>
            <div className="tm-roster-title-wrap">
              <h2>Student Roster &amp; Evaluation</h2>
              <span className="tm-status-count-badge">
                {evaluatedCount} of {students.length} evaluated
              </span>
            </div>
            <p>
              {a
                ? `${a.subjectName} (${a.subjectCode}) · ${a.sectionName} · Assessment: ${
                    exams.find(r => same(r.examId, exam))?.examName || 'Select an assessment'
                  }`
                : 'Select an assigned course and examination above to begin marks entry.'}
            </p>
          </div>

          <div className="tm-roster-actions">
            <div className="tm-search-box">
              <FiSearch aria-hidden="true" />
              <input
                type="search"
                aria-label="Search student roster"
                placeholder="Search name or roll number..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {demo && (
              <button
                type="button"
                className="tm-btn-subtle"
                onClick={autofillPassing}
                disabled={!exam || busy || loading}
                title="Fill 75% marks for uncompleted students for quick testing"
              >
                <FiZap /> Quick Fill (75%)
              </button>
            )}
          </div>
        </header>

        <div className="tm-table-container">
          <table className="tm-table">
            <thead>
              <tr>
                <th style={{ width: '150px' }}>Roll Number</th>
                <th>Student Name</th>
                <th style={{ width: '130px' }}>Attendance</th>
                <th style={{ width: '220px' }}>
                  {exams.find(row => same(row.examId, exam))?.examName || 'Assessment Marks'}
                  <span className="tm-th-sub">Max: {theoryMax}</span>
                </th>
                <th style={{ width: '110px' }}>Grade</th>
                <th style={{ width: '120px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {!exam || loading || !students.length ? (
                <tr>
                  <td colSpan="6" className="tm-empty-row">
                    <div className="tm-empty-content">
                      <FiBookOpen className="tm-empty-icon" />
                      <strong>
                        {loading
                          ? 'Loading assessment records...'
                          : !exam
                          ? 'Please select an assessment tab above to start entering marks.'
                          : 'No enrolled students found for this section.'}
                      </strong>
                      <p>
                        {loading
                          ? 'Fetching student evaluation register from college system'
                          : 'Select your assigned class and mid/semester exam to view the full student roster.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map(row => {
                  const entry = entries[row.id] || {}
                  const bad = invalid(row)
                  const done = complete(row)
                  const saved = recorded[row.id]
                  const markVal = saved?.marksObtained ?? entry.marks
                  const grade = getGradeBadge(markVal, theoryMax)
                  const initials = row.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(w => w[0])
                    .join('')

                  return (
                    <tr key={row.id} className={bad ? 'is-invalid-row' : done ? 'is-completed-row' : ''}>
                      <td>
                        <span className="tm-roll-badge">{row.rollNumber}</span>
                      </td>
                      <td>
                        <div className="tm-student-cell">
                          <span className="tm-student-avatar">{initials}</span>
                          <strong className="tm-student-name">{row.name}</strong>
                        </div>
                      </td>
                      <td>
                        {row.attendancePercentage != null ? (
                          <span
                            className={`tm-attendance-badge ${
                              row.attendancePercentage >= 75
                                ? 'is-good'
                                : row.attendancePercentage >= 65
                                ? 'is-warning'
                                : 'is-danger'
                            }`}
                          >
                            {row.attendancePercentage}%
                          </span>
                        ) : (
                          <span className="tm-attendance-badge is-unknown">—</span>
                        )}
                      </td>
                      <td>
                        <div className="tm-marks-input-group">
                          <input
                            aria-label={`${row.name} assessment marks`}
                            aria-invalid={bad}
                            disabled={busy || loading || !!saved}
                            type="number"
                            min="0"
                            max={theoryMax}
                            step="0.01"
                            placeholder="0"
                            value={markVal ?? ''}
                            onChange={e => update(row.id, 'marks', e.target.value)}
                            className="tm-score-input"
                          />
                          <span className="tm-marks-max-tag">/ {theoryMax}</span>
                          {bad && <span className="tm-error-chip">0 – {theoryMax}</span>}
                        </div>
                      </td>
                      <td>
                        {grade ? (
                          <span className={`tm-grade-pill ${grade.className}`} title={grade.text}>
                            {grade.label}
                          </span>
                        ) : (
                          <span className="tm-grade-none">—</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`tm-status-pill ${
                            bad ? 'is-invalid' : saved ? 'is-saved' : done ? 'is-ready' : 'is-pending'
                          }`}
                        >
                          {bad ? 'Invalid' : saved ? 'Saved' : done ? 'Ready' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <footer className="tm-roster-footer">
          <div className="tm-footer-meta">
            <span className="tm-evaluation-indicator">
              <strong>{evaluatedCount}</strong> of <strong>{students.length}</strong> students evaluated
            </span>
            <span className="tm-footer-hint">
              {demo
                ? 'Mock Mode: Marks are stored locally in your browser session.'
                : 'All evaluation submissions are logged with your faculty credentials.'}
            </span>
          </div>

          <div className="tm-footer-btn-group">
            {demo && (
              <button
                type="button"
                className="tm-btn-secondary"
                disabled={busy || !exam}
                onClick={() => {
                  try {
                    localStorage.removeItem(draftKey)
                    localStorage.removeItem(draftKey + ':submitted')
                    setEntries(initialEntries(exam))
                    setRecorded({})
                    setTheoryMax(/practical|lab/.test(exam) ? 20 : /final/.test(exam) ? 100 : 30)
                    setNotice('Mock marks reset successfully.')
                    setError('')
                  } catch {
                    setError('Local mock data could not be reset.')
                  }
                }}
              >
                <FiRefreshCw /> Reset
              </button>
            )}

            <button
              type="button"
              className="tm-btn-secondary"
              disabled={!exam || busy || loading}
              onClick={() => {
                try {
                  localStorage.setItem(draftKey, JSON.stringify({ entries, theoryMax }))
                  setNotice('Draft marks saved locally in this browser.')
                  setError('')
                } catch {
                  setError('Draft could not be saved.')
                }
              }}
            >
              Save Draft
            </button>

            <button
              type="button"
              className="tm-btn-primary"
              disabled={
                busy ||
                loading ||
                !exam ||
                !students.length ||
                !maxValid ||
                !recordsLoaded ||
                students.some(row => !recorded[row.id] && !complete(row)) ||
                students.every(row => recorded[row.id])
              }
              onClick={() => setConfirm(true)}
            >
              <FiCheck /> Submit Final Marks
            </button>
          </div>
        </footer>
      </section>

      {/* Confirmation Modal */}
      {confirm && (
        <PortalDialog
          title="Submit Class Marks?"
          onClose={() => {
            if (!busy) setConfirm(false)
          }}
        >
          <div className="tm-confirm-body">
            <p>
              Submit final marks for <strong>{students.length}</strong> enrolled students in{' '}
              <strong>{a?.subjectName}</strong> ({a?.sectionName})?
            </p>
            <div className="tm-confirm-summary">
              <div>
                <small>Assessment</small>
                <strong>{exams.find(r => same(r.examId, exam))?.examName}</strong>
              </div>
              <div>
                <small>Max Marks</small>
                <strong>{theoryMax} Pts</strong>
              </div>
              <div>
                <small>Class Average</small>
                <strong>{classAvg} / {theoryMax}</strong>
              </div>
            </div>
            <p className="tm-confirm-disclaimer">
              {demo
                ? 'This is a local demonstration. Data will be saved in your test workspace.'
                : 'Once submitted, final marks are dispatched to the college examination controller for moderation.'}
            </p>
            <Feedback error={error} />
            <div className="portal-actions">
              <button disabled={busy} onClick={() => setConfirm(false)}>
                Cancel
              </button>
              <button className="primary" disabled={busy} onClick={submit}>
                {busy ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </PortalDialog>
      )}
    </div>
  )
}
