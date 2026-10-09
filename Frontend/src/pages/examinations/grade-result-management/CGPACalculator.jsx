import { useEffect, useMemo, useState } from 'react'
import { FiAward, FiCheck, FiDownload, FiPercent, FiPlus, FiRotateCcw, FiTarget, FiTrash2, FiUserCheck } from 'react-icons/fi'
import { academicDivision, cgpaToPercentage } from './gradeResultModel'
import resultsService from '../../../services/resultsService'
import './CGPACalculator.css'

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

export default function CGPACalculator({ storageKey }) {
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

  const exportCsv = () => {
    const headers = ['Semester', 'SGPA', 'Credits', 'Weighted Points']
    const dataRows = rows.map(r => {
      const sgpa = Number(r.sgpa) || 0
      const cr = Number(r.credits) || 0
      return [r.semester, r.sgpa, r.credits, (sgpa * cr).toFixed(2)]
    })
    const summaryRow = ['OVERALL CGPA', cgpa !== null ? cgpa.toFixed(2) : 'N/A', totalCredits.toFixed(2), weightedPoints.toFixed(2)]
    const csvContent = [
      headers.join(','),
      ...dataRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')),
      summaryRow.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `CGPA_Calculation_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return <section className="grm-cgpa" aria-labelledby="grm-cgpa-title">
    <header className="grm-cgpa__header">
      <div>
        <span className="grm-cgpa__eyebrow">ACADEMIC PERFORMANCE & DEGREE AUDIT</span>
        <h3 id="grm-cgpa-title">CGPA Calculator & Academic Auditor</h3>
        <p>Calculate cumulative grade point average, AICTE percentage equivalencies, and division honours.</p>
      </div>
      <div className="grm-cgpa__header-right">
        {savedAt && <span className="grm-cgpa__save-state" role="status">Saved on this device · {savedAt}</span>}
        <div className="grm-cgpa__header-btns">
          <button type="button" className="grm-cgpa__tool-btn" onClick={exportCsv} title="Export calculation to CSV">
            <FiDownload aria-hidden="true" /> Export CSV
          </button>
        </div>
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
