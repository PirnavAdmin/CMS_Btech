import { useEffect, useMemo, useState } from 'react'
import {
  FiAward,
  FiBookOpen,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiHelpCircle,
  FiInfo,
  FiLayers,
  FiPercent,
  FiPlus,
  FiRotateCcw,
  FiSliders,
  FiTarget,
  FiTrash2,
  FiTrendingUp,
  FiUserCheck,
  FiX,
  FiZap,
} from 'react-icons/fi'
import { academicDivision, cgpaToPercentage } from './gradeResultModel'
import resultsService from '../../../services/resultsService'
import ExportMenu from '../../../components/ExportMenu'
import './CGPACalculator.css'

const TOTAL_DEGREE_CREDITS = 160 // Standard AICTE / Autonomous B.Tech Regulation

// Standard R20/R23 Autonomous Credit Distribution per Semester
const AUTONOMOUS_CREDITS = [19.5, 19.5, 21.5, 21.5, 22.0, 22.0, 20.0, 14.0]

const UGC_GRADES = [
  { grade: 'O', points: 10, label: 'Outstanding', minMarks: '90 - 100%' },
  { grade: 'A+', points: 9, label: 'Excellent', minMarks: '80 - 89%' },
  { grade: 'A', points: 8, label: 'Very Good', minMarks: '70 - 79%' },
  { grade: 'B+', points: 7, label: 'Good', minMarks: '60 - 69%' },
  { grade: 'B', points: 6, label: 'Above Average', minMarks: '55 - 59%' },
  { grade: 'C', points: 5, label: 'Average', minMarks: '50 - 54%' },
  { grade: 'P', points: 4, label: 'Pass', minMarks: '40 - 49%' },
  { grade: 'F', points: 0, label: 'Fail / Arrear', minMarks: '< 40%' },
]

const DEFAULT_SUBJECTS = [
  { id: 's1', code: 'CS301', name: 'Data Structures & Algorithms', credits: 4, grade: 'A+', points: 9 },
  { id: 's2', code: 'CS302', name: 'Computer Architecture & Org.', credits: 3, grade: 'A', points: 8 },
  { id: 's3', code: 'MA301', name: 'Discrete Mathematical Structures', credits: 4, grade: 'O', points: 10 },
  { id: 's4', code: 'CS303', name: 'Object Oriented Java Programming', credits: 3, grade: 'A', points: 8 },
  { id: 's5', code: 'EC304', name: 'Digital Electronics & Logic', credits: 3, grade: 'B+', points: 7 },
  { id: 's6', code: 'CS305P', name: 'Data Structures Laboratory', credits: 1.5, grade: 'O', points: 10 },
  { id: 's7', code: 'CS306P', name: 'Java Programming Laboratory', credits: 1.5, grade: 'A+', points: 9 },
  { id: 's8', code: 'HS301', name: 'Constitution & Professional Ethics', credits: 1, grade: 'A', points: 8 },
]

const newSemester = (number, customCredits = '') => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  semester: `Semester ${number}`,
  sgpa: '',
  credits: customCredits !== '' ? String(customCredits) : '',
})

function readRows(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
    if (Array.isArray(saved) && saved.length && saved.every(row => row && typeof row === 'object')) return saved
  } catch { /* Start fresh if corrupted */ }
  return [newSemester(1, 20)]
}

export default function CGPACalculator({ storageKey }) {
  const [rows, setRows] = useState(() => readRows(storageKey))
  const [savedAt, setSavedAt] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  const [resetConfirm, setResetConfirm] = useState(false)
  const [formulaType, setFormulaType] = useState('aicte') // 'aicte' or 'cbse'

  // Workspace View Swapper (Tabbed Navigation)
  // 'semesters' | 'trajectory' | 'audit' | 'simulator'
  const [activeTab, setActiveTab] = useState('semesters')

  // Advanced Goal Planner State
  const [targetCgpa, setTargetCgpa] = useState('8.50')
  const [targetRemainingSemesters, setTargetRemainingSemesters] = useState(4)
  const [creditsPerUpcomingSem, setCreditsPerUpcomingSem] = useState(20)

  // Quick Period & Student Import
  const [periodType, setPeriodType] = useState('semester')
  const [periodNumber, setPeriodNumber] = useState('1')
  const [availableStudents, setAvailableStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')

  // Subject-Wise Calculator Modal State
  const [subjectModalOpen, setSubjectModalOpen] = useState(false)
  const [activeSemesterRowId, setActiveSemesterRowId] = useState(null)
  const [modalSubjects, setModalSubjects] = useState(DEFAULT_SUBJECTS)

  // Grading Scale Guide Modal State
  const [gradeScaleOpen, setGradeScaleOpen] = useState(false)

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

  const touchSaveState = () => {
    setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  }

  const duplicateSemester = useMemo(() => {
    const names = rows.map(row => row.semester.trim().toLowerCase()).filter(Boolean)
    return new Set(names).size !== names.length
  }, [rows])

  const invalidRow = rows.find(row => {
    const sgpa = Number(row.sgpa)
    const credits = Number(row.credits)
    return !row.semester.trim() || row.sgpa === '' || row.credits === '' || !Number.isFinite(sgpa) || sgpa < 0 || sgpa > 10 || !Number.isFinite(credits) || credits <= 0
  })

  // Core Calculations
  const validRows = useMemo(() => {
    return rows.filter(r => {
      const s = Number(r.sgpa)
      const c = Number(r.credits)
      return r.semester.trim() && r.sgpa !== '' && r.credits !== '' && Number.isFinite(s) && s >= 0 && s <= 10 && Number.isFinite(c) && c > 0
    })
  }, [rows])

  const totalCredits = useMemo(() => {
    return rows.reduce((total, row) => total + (Number(row.credits) || 0), 0)
  }, [rows])

  const weightedPoints = useMemo(() => {
    return rows.reduce((total, row) => total + (Number(row.sgpa) || 0) * (Number(row.credits) || 0), 0)
  }, [rows])

  const cgpa = useMemo(() => {
    return !invalidRow && !duplicateSemester && totalCredits > 0 ? weightedPoints / totalCredits : null
  }, [invalidRow, duplicateSemester, totalCredits, weightedPoints])

  const percentageAicte = cgpa !== null ? cgpaToPercentage(cgpa, 'aicte') : null
  const percentageCbse = cgpa !== null ? cgpaToPercentage(cgpa, 'cbse') : null
  const activePercentage = formulaType === 'aicte' ? percentageAicte : percentageCbse
  const divisionInfo = cgpa !== null ? academicDivision(cgpa) : null

  // Progress toward 160-credit degree
  const degreeCreditPercent = Math.min(100, Math.round((totalCredits / TOTAL_DEGREE_CREDITS) * 100))
  const remainingDegreeCredits = Math.max(0, Number((TOTAL_DEGREE_CREDITS - totalCredits).toFixed(1)))

  // Running Cumulative CGPA progression by row
  const rowCumulativeStats = useMemo(() => {
    let accCredits = 0
    let accPoints = 0
    return rows.map(row => {
      const s = Number(row.sgpa)
      const c = Number(row.credits)
      if (Number.isFinite(s) && s >= 0 && Number.isFinite(c) && c > 0) {
        accCredits += c
        accPoints += s * c
        return {
          runningCredits: accCredits,
          runningPoints: accPoints,
          runningCgpa: (accPoints / accCredits).toFixed(2),
        }
      }
      return { runningCredits: null, runningPoints: null, runningCgpa: '—' }
    })
  }, [rows])

  // Analytics helper stats
  const analyticsStats = useMemo(() => {
    if (!validRows.length) return null
    const sgpaList = validRows.map(r => ({ sem: r.semester, sgpa: Number(r.sgpa), cr: Number(r.credits) }))
    const sorted = [...sgpaList].sort((a, b) => b.sgpa - a.sgpa)
    const peak = sorted[0]
    const lowest = sorted[sorted.length - 1]
    const avgCredits = (totalCredits / validRows.length).toFixed(1)
    const firstSemSgpa = sgpaList[0]?.sgpa || 0
    const lastSemSgpa = sgpaList[sgpaList.length - 1]?.sgpa || 0
    const trendDiff = Number((lastSemSgpa - firstSemSgpa).toFixed(2))
    return { peak, lowest, avgCredits, trendDiff }
  }, [validRows, totalCredits])

  // What-If Goal Analysis across remaining semesters
  const goalAnalysis = useMemo(() => {
    const target = Number(targetCgpa)
    const remSems = Math.max(1, Number(targetRemainingSemesters) || 1)
    const crPerSem = Math.max(1, Number(creditsPerUpcomingSem) || 20)
    const upcomingTotalCredits = remSems * crPerSem

    if (cgpa === null || !Number.isFinite(target) || target <= 0 || target > 10) {
      return null
    }

    const futureTotalCredits = totalCredits + upcomingTotalCredits
    const targetTotalPoints = target * futureTotalCredits
    const neededPoints = targetTotalPoints - weightedPoints
    const requiredAvgSgpa = neededPoints / upcomingTotalCredits

    return {
      target,
      remSems,
      crPerSem,
      upcomingTotalCredits,
      requiredAvgSgpa,
      isImpossible: requiredAvgSgpa > 10.0,
      isAlreadySecured: requiredAvgSgpa <= 5.0,
      isEasy: requiredAvgSgpa > 5.0 && requiredAvgSgpa <= 7.5,
      isModerate: requiredAvgSgpa > 7.5 && requiredAvgSgpa <= 8.5,
      isChallenging: requiredAvgSgpa > 8.5 && requiredAvgSgpa <= 9.8,
    }
  }, [cgpa, targetCgpa, targetRemainingSemesters, creditsPerUpcomingSem, totalCredits, weightedPoints])

  // Row Management
  const update = (id, field, value) => {
    setRows(current => current.map(row => row.id === id ? { ...row, [field]: value } : row))
    touchSaveState()
  }

  const add = (customCredits = '') => {
    setRows(current => {
      const numbers = current.map(row => Number(/^Semester (\d+)$/i.exec(row.semester.trim())?.[1]) || 0)
      const nextNum = Math.max(current.length, ...numbers) + 1
      const defaultCr = customCredits !== '' ? customCredits : AUTONOMOUS_CREDITS[nextNum - 1] || 20
      return [...current, newSemester(nextNum, defaultCr)]
    })
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
    setRows([newSemester(1, 20)])
    setSelectedStudentId('')
    setResetConfirm(false)
    touchSaveState()
  }

  // Preset Loaders
  const loadAutonomousPreset = () => {
    setRows(AUTONOMOUS_CREDITS.map((credits, idx) => ({
      id: `auto-${idx + 1}-${Date.now()}`,
      semester: `Semester ${idx + 1}`,
      sgpa: '',
      credits: String(credits),
    })))
    touchSaveState()
  }

  const loadUniform8Preset = () => {
    setRows(Array.from({ length: 8 }, (_, i) => ({
      id: `uniform-${i + 1}-${Date.now()}`,
      semester: `Semester ${i + 1}`,
      sgpa: '',
      credits: '20',
    })))
    touchSaveState()
  }

  const loadTopperSample = () => {
    const sample = [
      { sem: 'Semester 1', sgpa: '8.80', cr: '19.5' },
      { sem: 'Semester 2', sgpa: '9.10', cr: '19.5' },
      { sem: 'Semester 3', sgpa: '8.95', cr: '21.5' },
      { sem: 'Semester 4', sgpa: '9.05', cr: '21.5' },
      { sem: 'Semester 5', sgpa: '8.75', cr: '22.0' },
      { sem: 'Semester 6', sgpa: '8.85', cr: '22.0' },
    ]
    setRows(sample.map((s, idx) => ({
      id: `topper-${idx + 1}-${Date.now()}`,
      semester: s.sem,
      sgpa: s.sgpa,
      credits: s.cr,
    })))
    touchSaveState()
  }

  const loadDistinctionSample = () => {
    const sample = [
      { sem: 'Semester 1', sgpa: '7.60', cr: '19.5' },
      { sem: 'Semester 2', sgpa: '7.80', cr: '19.5' },
      { sem: 'Semester 3', sgpa: '8.10', cr: '21.5' },
      { sem: 'Semester 4', sgpa: '7.70', cr: '21.5' },
      { sem: 'Semester 5', sgpa: '7.90', cr: '22.0' },
      { sem: 'Semester 6', sgpa: '7.85', cr: '22.0' },
    ]
    setRows(sample.map((s, idx) => ({
      id: `distinction-${idx + 1}-${Date.now()}`,
      semester: s.sem,
      sgpa: s.sgpa,
      credits: s.cr,
    })))
    touchSaveState()
  }

  const applyTemplate = (count, start = 1) => {
    setRows(current => Array.from({ length: count }, (_, i) => {
      const semester = `Semester ${start + i}`
      return current.find(row => row.semester.trim().toLowerCase() === semester.toLowerCase())
        || newSemester(start + i, AUTONOMOUS_CREDITS[start + i - 1] || 20)
    }))
    setSelectedStudentId('')
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

  // Subject Modal Handlers
  const openSubjectModal = (row) => {
    setActiveSemesterRowId(row.id)
    setSubjectModalOpen(true)
  }

  const updateModalSubject = (subId, field, val) => {
    setModalSubjects(subs => subs.map(s => {
      if (s.id !== subId) return s
      const updated = { ...s, [field]: val }
      if (field === 'grade') {
        const match = UGC_GRADES.find(g => g.grade === val)
        updated.points = match ? match.points : 0
      }
      return updated
    }))
  }

  const addModalSubject = () => {
    const nextNum = modalSubjects.length + 1
    setModalSubjects(subs => [
      ...subs,
      {
        id: `sub-${Date.now()}`,
        code: `CS${300 + nextNum}`,
        name: `Course Subject ${nextNum}`,
        credits: 3,
        grade: 'A',
        points: 8,
      },
    ])
  }

  const removeModalSubject = (subId) => {
    if (modalSubjects.length <= 1) return
    setModalSubjects(subs => subs.filter(s => s.id !== subId))
  }

  const computedModalStats = useMemo(() => {
    const totalCr = modalSubjects.reduce((acc, s) => acc + (Number(s.credits) || 0), 0)
    const totalPts = modalSubjects.reduce((acc, s) => acc + ((Number(s.credits) || 0) * (Number(s.points) || 0)), 0)
    const sgpa = totalCr > 0 ? (totalPts / totalCr).toFixed(2) : '0.00'
    return { totalCr, totalPts, sgpa }
  }, [modalSubjects])

  const applyModalSgpa = () => {
    if (!activeSemesterRowId) return
    update(activeSemesterRowId, 'sgpa', computedModalStats.sgpa)
    update(activeSemesterRowId, 'credits', String(computedModalStats.totalCr))
    setSubjectModalOpen(false)
  }

  // Export dataset preparation
  let runningCredits = 0
  let runningPoints = 0
  const exportRows = validRows.map(row => {
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

  return (
    <section className="grm-cgpa" aria-labelledby="grm-cgpa-title">
      {/* Header */}
      <header className="grm-cgpa__header">
        <span className="grm-cgpa__eyebrow">ACADEMIC PERFORMANCE & DEGREE AUDIT</span>
        <div className="grm-cgpa__header-copy">
          <h3 id="grm-cgpa-title">CGPA Calculator & Academic Auditor</h3>
          <p>Autonomous B.Tech credit-weighted grading, AICTE percentage conversion, and degree honours auditor.</p>
        </div>
        <div className="grm-cgpa__header-right">
          {savedAt && <span className="grm-cgpa__save-state" role="status">Saved on this device · {savedAt}</span>}
          <div className="grm-cgpa__header-btns">
            <button
              type="button"
              className="grm-cgpa__tool-btn"
              onClick={() => setGradeScaleOpen(true)}
              title="View UGC / AICTE 10-Point Grade Reference Chart"
            >
              <FiHelpCircle aria-hidden="true" /> Grade Scale Guide
            </button>
            <ExportMenu
              rows={[...exportRows, ...exportSummary]}
              columns={exportColumns}
              filename="cgpa-calculation.csv"
              title="CGPA Calculation"
              scope="Semester breakdown"
            />
          </div>
        </div>
      </header>

      {/* 1. COMPACT EXECUTIVE KPI PERFORMANCE SUMMARY CARDS */}
      <div className="grm-cgpa__kpi-grid">
        {/* Card 1: Cumulative CGPA */}
        <div className="grm-cgpa__kpi-card grm-cgpa__kpi-card--primary">
          <div className="grm-cgpa__kpi-header">
            <span className="grm-cgpa__kpi-title">Cumulative CGPA</span>
            <span className="grm-cgpa__kpi-badge">Scale 10.00</span>
          </div>
          <div className="grm-cgpa__kpi-value-row">
            <strong className="grm-cgpa__kpi-score">{cgpa !== null ? cgpa.toFixed(2) : '—'}</strong>
            {divisionInfo && (
              <span className="grm-cgpa__division-pill" style={{ background: divisionInfo.bg, color: divisionInfo.color }}>
                <FiAward aria-hidden="true" /> {divisionInfo.division}
              </span>
            )}
          </div>
          <div className="grm-cgpa__kpi-foot">
            <span>{validRows.length} of 8 Semesters Calculated</span>
            <small>Weighted by Earned Credits</small>
          </div>
        </div>

        {/* Card 2: Percentage Equivalency */}
        <div className="grm-cgpa__kpi-card">
          <div className="grm-cgpa__kpi-header">
            <span className="grm-cgpa__kpi-title">Equivalent Marks</span>
            <div className="grm-cgpa__kpi-toggle" role="group" aria-label="Formula toggle">
              <button
                type="button"
                className={`grm-cgpa__kpi-toggle-btn ${formulaType === 'aicte' ? 'is-active' : ''}`}
                onClick={() => setFormulaType('aicte')}
              >
                AICTE
              </button>
              <button
                type="button"
                className={`grm-cgpa__kpi-toggle-btn ${formulaType === 'cbse' ? 'is-active' : ''}`}
                onClick={() => setFormulaType('cbse')}
              >
                9.5×
              </button>
            </div>
          </div>
          <div className="grm-cgpa__kpi-value-row">
            <strong className="grm-cgpa__kpi-percent">
              {activePercentage !== null ? `${activePercentage.toFixed(2)}%` : '—'}
            </strong>
          </div>
          <div className="grm-cgpa__kpi-foot">
            <span>{formulaType === 'aicte' ? '(CGPA − 0.75) × 10' : 'CGPA × 9.5'}</span>
            <small>UGC Approved</small>
          </div>
        </div>

        {/* Card 3: Degree Credits Progress */}
        <div className="grm-cgpa__kpi-card">
          <div className="grm-cgpa__kpi-header">
            <span className="grm-cgpa__kpi-title">Degree Credit Progress</span>
            <span className="grm-cgpa__kpi-badge">{degreeCreditPercent}% Complete</span>
          </div>
          <div className="grm-cgpa__kpi-value-row">
            <strong className="grm-cgpa__kpi-credits">
              {totalCredits ? Number(totalCredits.toFixed(1)) : 0} <span className="grm-cgpa__kpi-unit">/ {TOTAL_DEGREE_CREDITS} Cr</span>
            </strong>
          </div>
          <div className="grm-cgpa__kpi-progress">
            <div className="grm-cgpa__kpi-bar" style={{ width: `${degreeCreditPercent}%` }} />
          </div>
          <div className="grm-cgpa__kpi-foot">
            <span>{remainingDegreeCredits > 0 ? `${remainingDegreeCredits} Cr Remaining` : 'Requirement Met'}</span>
            <small>AICTE 160-Cr</small>
          </div>
        </div>

        {/* Card 4: Honours & Academic Standing */}
        <div className="grm-cgpa__kpi-card">
          <div className="grm-cgpa__kpi-header">
            <span className="grm-cgpa__kpi-title">Honours & Standing</span>
            <span className="grm-cgpa__kpi-badge">R20/R23</span>
          </div>
          <div className="grm-cgpa__kpi-value-row">
            <strong className="grm-cgpa__kpi-status" style={{ color: (cgpa && cgpa >= 7.5) ? '#166534' : (cgpa && cgpa >= 6.5) ? '#1e40af' : '#64748b' }}>
              {cgpa === null
                ? 'Pending Evaluation'
                : cgpa >= 7.5
                  ? 'B.Tech Honours Eligible'
                  : cgpa >= 6.5
                    ? 'First Class Standing'
                    : 'Regular Standing'}
            </strong>
          </div>
          <div className="grm-cgpa__kpi-foot">
            <span>Honours Cutoff: CGPA ≥ 7.50 with 0 Backlogs</span>
            <small>{validRows.length >= 8 ? 'Final' : 'In-Progress'}</small>
          </div>
        </div>
      </div>

      {/* 2. WORKSPACE TABBED SUB-NAVIGATION (Swaps between screens without excessive scrolling) */}
      <nav className="grm-cgpa-tabs" role="tablist" aria-label="CGPA workspace tools">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'semesters'}
          className={`grm-cgpa-tab ${activeTab === 'semesters' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('semesters')}
        >
          <FiLayers aria-hidden="true" />
          <span>Semesters & Calculator</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'trajectory'}
          className={`grm-cgpa-tab ${activeTab === 'trajectory' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('trajectory')}
        >
          <FiTrendingUp aria-hidden="true" />
          <span>Performance Trajectory</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'audit'}
          className={`grm-cgpa-tab ${activeTab === 'audit' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <FiAward aria-hidden="true" />
          <span>Degree & Honours Audit</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'simulator'}
          className={`grm-cgpa-tab ${activeTab === 'simulator' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          <FiTarget aria-hidden="true" />
          <span>Goal Simulator (What-If)</span>
        </button>
      </nav>

      {/* =========================================================================
         TAB 1: SEMESTERS TABLE & CALCULATOR
         ========================================================================= */}
      {activeTab === 'semesters' && (
        <div className="grm-cgpa-tab-pane">
          {/* Quick Regulation Presets Bar */}
          <div className="grm-cgpa__presets-bar">
            <div className="grm-cgpa__presets-left">
              <span className="grm-cgpa__presets-label">
                <FiZap aria-hidden="true" /> Quick Presets:
              </span>
              <button
                type="button"
                className="grm-cgpa__preset-chip"
                onClick={loadAutonomousPreset}
                title="Populate standard 160-credit B.Tech credit structure across 8 semesters"
              >
                ⚡ B.Tech 160-Cr Model (R20/R23)
              </button>
              <button
                type="button"
                className="grm-cgpa__preset-chip"
                onClick={loadUniform8Preset}
                title="Populate 8 Semesters with 20 credits per semester"
              >
                ⚡ Uniform 8 Sems (20 Cr/Sem)
              </button>
              <button
                type="button"
                className="grm-cgpa__preset-chip grm-cgpa__preset-chip--highlight"
                onClick={loadTopperSample}
                title="Load sample High Achiever (8.92 CGPA) profile to preview analytics"
              >
                ⭐ Load Topper Profile (8.92)
              </button>
              <button
                type="button"
                className="grm-cgpa__preset-chip"
                onClick={loadDistinctionSample}
                title="Load sample First Class with Distinction (7.82 CGPA) profile"
              >
                🎯 Load Distinction Profile (7.82)
              </button>
            </div>

            {availableStudents.length > 0 && (
              <div className="grm-cgpa__presets-right">
                <label htmlFor="cgpa-student-select">
                  <FiUserCheck aria-hidden="true" /> Auto-fill from student:
                </label>
                <select
                  id="cgpa-student-select"
                  value={selectedStudentId}
                  onChange={e => handleStudentImport(e.target.value)}
                >
                  <option value="">Select student record...</option>
                  {availableStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Period Selector Box */}
          <div className="grm-cgpa__period-panel">
            <div className="grm-cgpa__period-heading">
              <div>
                <h4>Choose your calculation period</h4>
                <p>Review a single semester, an academic year, or the entire 4-year B.Tech course.</p>
              </div>
              <span className="grm-cgpa__period-badge">
                <FiLayers aria-hidden="true" /> {rows.length} {rows.length === 1 ? 'semester' : 'semesters'} active
              </span>
            </div>

            <div className="grm-cgpa__period-modes" role="group" aria-label="Calculation period">
              {[
                { value: 'semester', title: 'Single semester', description: 'Individual semester performance', icon: FiBookOpen },
                { value: 'year', title: 'Academic year', description: 'Two semesters, one yearly CGPA', icon: FiCalendar },
                { value: 'course', title: 'Full course', description: 'Combined CGPA across your course', icon: FiAward },
              ].map(({ value, title, description, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  className={`grm-cgpa__period-mode ${periodType === value ? 'is-selected' : ''}`}
                  aria-pressed={periodType === value}
                  onClick={() => { setPeriodType(value); setPeriodNumber(value === 'course' ? '8' : '1') }}
                >
                  <Icon aria-hidden="true" />
                  <span>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </span>
                  {periodType === value && <FiCheck className="grm-cgpa__period-check" aria-hidden="true" />}
                </button>
              ))}
            </div>

            <div className="grm-cgpa__period-controls">
              <label className="grm-cgpa__period-field">
                <span>{periodType === 'semester' ? 'Select semester' : periodType === 'year' ? 'Select academic year' : 'Select course duration'}</span>
                <select value={periodNumber} onChange={event => setPeriodNumber(event.target.value)}>
                  {periodType === 'course' ? (
                    <>
                      <option value="4">2 years / 4 semesters</option>
                      <option value="6">3 years / 6 semesters</option>
                      <option value="8">4 years / 8 semesters (B.Tech Full Course)</option>
                    </>
                  ) : Array.from({ length: periodType === 'semester' ? 8 : 4 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {periodType === 'semester' ? `Semester ${i + 1}` : `Year ${i + 1} (Semesters ${i * 2 + 1} & ${i * 2 + 2})`}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grm-cgpa__period-preview">
                <strong>{periodType === 'semester' ? `Semester ${periodNumber}` : periodType === 'year' ? `Year ${periodNumber}` : `${Number(periodNumber) / 2}-year course`}</strong>
                <span>{periodType === 'semester' ? '1 semester · SGPA' : periodType === 'year' ? `Semesters ${Number(periodNumber) * 2 - 1} & ${Number(periodNumber) * 2} · Weighted CGPA` : `Semesters 1–${periodNumber} · Weighted CGPA`}</span>
              </div>

              <button
                type="button"
                className="grm-cgpa__apply-period"
                onClick={() => applyTemplate(
                  periodType === 'semester' ? 1 : periodType === 'year' ? 2 : Number(periodNumber),
                  periodType === 'semester' ? Number(periodNumber) : periodType === 'year' ? Number(periodNumber) * 2 - 1 : 1
                )}
              >
                Apply Selection <FiCheck aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Interactive Semesters Table */}
          <div className="grm-cgpa__table-section">
            <div className="grm-cgpa__table-header">
              <div>
                <h4>Semester Grade Point & Credit Records</h4>
                <p>Enter earned SGPA and credits for each semester. Click <strong>Subject Calc</strong> to auto-calculate SGPA from subjects.</p>
              </div>
              <div className="grm-cgpa__table-actions-top">
                <button type="button" className="grm-cgpa__btn-sm" onClick={() => add()}>
                  <FiPlus aria-hidden="true" /> Add Next Semester
                </button>
                <button type="button" className="grm-cgpa__btn-sm grm-cgpa__btn-sm--ghost" onClick={loadAutonomousPreset}>
                  <FiSliders aria-hidden="true" /> Reset to 8 Sems
                </button>
              </div>
            </div>

            <div className="grm-cgpa__table-wrap">
              <table className="grm-cgpa__table">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '22%' }}>Semester</th>
                    <th scope="col" style={{ width: '18%' }}>SGPA (0–10)</th>
                    <th scope="col" style={{ width: '16%' }}>Earned Credits</th>
                    <th scope="col" style={{ width: '16%' }}>Weighted Points</th>
                    <th scope="col" style={{ width: '16%' }}>Milestone CGPA</th>
                    <th scope="col" style={{ width: '12%', textAlign: 'center' }}>Subject Calc & Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const rowSgpa = Number(row.sgpa)
                    const rowCredits = Number(row.credits)
                    const rowPoints = Number.isFinite(rowSgpa) && Number.isFinite(rowCredits) && rowSgpa >= 0 && rowCredits > 0
                      ? (rowSgpa * rowCredits).toFixed(2)
                      : '—'
                    const milestone = rowCumulativeStats[index]

                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="grm-cgpa__sem-cell">
                            <span className="grm-cgpa__sem-badge">{index + 1}</span>
                            <input
                              id={`cgpa-semester-${row.id}`}
                              value={row.semester}
                              maxLength={40}
                              placeholder={`Semester ${index + 1}`}
                              onChange={event => update(row.id, 'semester', event.target.value)}
                            />
                          </div>
                        </td>
                        <td>
                          <div className="grm-cgpa__sgpa-cell">
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
                            {Number.isFinite(rowSgpa) && rowSgpa > 0 && (
                              <span className={`grm-cgpa__sgpa-pill is-${rowSgpa >= 8.5 ? 'outstanding' : rowSgpa >= 7.5 ? 'distinction' : rowSgpa >= 6.5 ? 'first' : rowSgpa >= 5 ? 'pass' : 'fail'}`}>
                                {rowSgpa >= 8.5 ? 'O' : rowSgpa >= 7.5 ? 'A+' : rowSgpa >= 6.5 ? 'A' : rowSgpa >= 5 ? 'B' : 'F'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <input
                            id={`cgpa-credits-${row.id}`}
                            type="number"
                            min="0.01"
                            step="0.5"
                            inputMode="decimal"
                            value={row.credits}
                            placeholder="e.g. 21.5"
                            onChange={event => update(row.id, 'credits', event.target.value)}
                          />
                        </td>
                        <td className="grm-cgpa__points-cell">
                          <span>{rowPoints}</span>
                        </td>
                        <td>
                          <span className="grm-cgpa__milestone-badge">
                            {milestone && milestone.runningCgpa !== '—' ? `${milestone.runningCgpa} CGPA` : '—'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="grm-cgpa__row-btns">
                            <button
                              type="button"
                              className="grm-cgpa__btn-calc"
                              onClick={() => openSubjectModal(row)}
                              title="Calculate SGPA from subject-wise course grades"
                            >
                              <FiEdit3 aria-hidden="true" />
                            </button>
                            <button
                              className="grm-cgpa__remove"
                              type="button"
                              aria-label={`Remove ${row.semester || `semester row ${index + 1}`}`}
                              disabled={rows.length === 1}
                              onClick={() => removeRow(row.id)}
                              title="Remove Semester Row"
                            >
                              <FiTrash2 aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td><strong>Totals / Cumulative</strong></td>
                    <td>
                      <strong style={{ color: 'var(--brand)' }}>
                        {cgpa !== null ? `${cgpa.toFixed(2)} CGPA` : '—'}
                      </strong>
                    </td>
                    <td>
                      <strong>{totalCredits ? Number(totalCredits.toFixed(1)) : 0} Credits</strong>
                    </td>
                    <td className="grm-cgpa__points-cell">
                      <strong>{totalCredits ? weightedPoints.toFixed(2) : '—'}</strong>
                    </td>
                    <td colSpan="2">
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {activePercentage !== null ? `Equivalent: ${activePercentage.toFixed(2)}%` : ''}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grm-cgpa__table-footer">
              <div className="grm-cgpa__actions-left">
                <button className="grm-cgpa__secondary" type="button" onClick={() => add()}>
                  <FiPlus aria-hidden="true" /> Add Semester
                </button>
                <button className="grm-cgpa__secondary" type="button" onClick={loadAutonomousPreset}>
                  <FiLayers aria-hidden="true" /> Fill 8 Semesters
                </button>
              </div>
              <button className="grm-cgpa__reset" type="button" onClick={reset}>
                <FiRotateCcw aria-hidden="true" /> {resetConfirm ? 'Confirm Clear All' : 'Clear Calculator'}
              </button>
            </div>

            <p className={`grm-cgpa__hint${duplicateSemester || invalidRow ? ' is-error' : ''}`} role={duplicateSemester || invalidRow ? 'alert' : undefined}>
              {duplicateSemester
                ? '⚠️ Duplicate semester detected. Ensure each completed semester has a unique label.'
                : invalidRow
                  ? '⚠️ Enter valid semester details: SGPA must be between 0.00 and 10.00, and credits must be a positive number.'
                  : 'Official UGC / AICTE Autonomous grading standard. Degree classification requires 160 total credits and no active backlogs.'}
            </p>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 2: VISUAL PERFORMANCE TRAJECTORY & ANALYTICS
         ========================================================================= */}
      {activeTab === 'trajectory' && (
        <div className="grm-cgpa-tab-pane">
          <div className="grm-cgpa__chart-card">
            <div className="grm-cgpa__chart-header">
              <div>
                <h4>
                  <FiTrendingUp aria-hidden="true" /> Semester Performance Trajectory & CGPA Progression
                </h4>
                <p>Visual breakdown of SGPA performance by semester against cumulative CGPA trend and honours cutoff (7.50).</p>
              </div>
              <div className="grm-cgpa__chart-legend">
                <span className="grm-cgpa__legend-item"><span className="grm-cgpa__legend-color is-sgpa" /> Semester SGPA (Bar)</span>
                <span className="grm-cgpa__legend-item"><span className="grm-cgpa__legend-color is-cgpa" /> Cumulative CGPA (Line)</span>
                <span className="grm-cgpa__legend-item"><span className="grm-cgpa__legend-color is-cutoff" /> 7.50 Distinction Cutoff</span>
              </div>
            </div>

            {validRows.length === 0 ? (
              <div className="grm-cgpa__chart-empty">
                <FiLayers aria-hidden="true" />
                <p>No valid semester SGPAs entered yet. Go to <strong>Semesters & Calculator</strong> tab or load a preset to view trajectory.</p>
                <button type="button" className="grm-cgpa__btn-sm" onClick={() => { loadTopperSample(); setActiveTab('trajectory'); }}>
                  ⚡ Load Sample Data Now
                </button>
              </div>
            ) : (
              <div className="grm-cgpa__chart-canvas-wrap">
                <svg className="grm-cgpa__svg-chart" viewBox="0 0 800 240" preserveAspectRatio="none">
                  {/* Grid Lines for 0, 2.5, 5.0, 7.5, 10.0 */}
                  <line x1="40" y1="20" x2="780" y2="20" stroke="#e2e8f0" strokeDasharray="3 3" />
                  <text x="32" y="24" textAnchor="end" fontSize="10" fill="#94a3b8">10.0</text>

                  <line x1="40" y1="65" x2="780" y2="65" stroke="#fed7aa" strokeWidth="1.5" strokeDasharray="4 4" />
                  <text x="32" y="69" textAnchor="end" fontSize="10" fill="#ea580c" fontWeight="600">7.5</text>

                  <line x1="40" y1="110" x2="780" y2="110" stroke="#e2e8f0" strokeDasharray="3 3" />
                  <text x="32" y="114" textAnchor="end" fontSize="10" fill="#94a3b8">5.0</text>

                  <line x1="40" y1="200" x2="780" y2="200" stroke="#cbd5e1" strokeWidth="1" />
                  <text x="32" y="204" textAnchor="end" fontSize="10" fill="#94a3b8">0.0</text>

                  {/* Render Bars and Lines for valid rows */}
                  {(() => {
                    const count = validRows.length
                    const step = (740) / Math.max(1, count)
                    const barWidth = Math.min(48, Math.max(22, step * 0.45))

                    // Points for Cumulative Line
                    const linePoints = validRows.map((_, i) => {
                      const stat = rowCumulativeStats[i]
                      const cVal = stat && stat.runningCgpa !== '—' ? Number(stat.runningCgpa) : 0
                      const cx = 50 + i * step + step / 2
                      const cy = 200 - (cVal / 10) * 180
                      return { cx, cy, cVal }
                    })

                    const polylineStr = linePoints.map(p => `${p.cx},${p.cy}`).join(' ')

                    return (
                      <>
                        {/* SGPA Column Bars */}
                        {validRows.map((row, i) => {
                          const sVal = Number(row.sgpa) || 0
                          const barHeight = Math.max(4, (sVal / 10) * 180)
                          const bx = 50 + i * step + step / 2 - barWidth / 2
                          const by = 200 - barHeight
                          const barColor = sVal >= 8.5 ? '#4f46e5' : sVal >= 7.5 ? '#10b981' : sVal >= 6.5 ? '#0284c7' : sVal >= 5.0 ? '#f59e0b' : '#ef4444'

                          return (
                            <g key={row.id}>
                              <rect
                                x={bx}
                                y={by}
                                width={barWidth}
                                height={barHeight}
                                rx="5"
                                fill={barColor}
                                opacity="0.85"
                              />
                              <text
                                x={bx + barWidth / 2}
                                y={by - 6}
                                textAnchor="middle"
                                fontSize="11"
                                fontWeight="700"
                                fill={barColor}
                              >
                                {sVal.toFixed(2)}
                              </text>
                              <text
                                x={bx + barWidth / 2}
                                y={220}
                                textAnchor="middle"
                                fontSize="11"
                                fontWeight="600"
                                fill="#475569"
                              >
                                Sem {i + 1}
                              </text>
                            </g>
                          )
                        })}

                        {/* Polyline for Cumulative CGPA */}
                        {linePoints.length > 1 && (
                          <polyline
                            fill="none"
                            stroke="#0f172a"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={polylineStr}
                          />
                        )}

                        {/* Line Nodes / Dots */}
                        {linePoints.map((pt, idx) => (
                          <g key={idx}>
                            <circle cx={pt.cx} cy={pt.cy} r="5" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
                            <text
                              x={pt.cx}
                              y={pt.cy - 10}
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="700"
                              fill="#0f172a"
                            >
                              {pt.cVal.toFixed(2)}
                            </text>
                          </g>
                        ))}
                      </>
                    )
                  })()}
                </svg>
              </div>
            )}
          </div>

          {/* Performance Milestone Insights */}
          {analyticsStats && (
            <div className="grm-cgpa__analytics-insights">
              <div className="grm-cgpa__insight-card">
                <span className="grm-cgpa__insight-label">Peak Performance Semester</span>
                <strong>{analyticsStats.peak.sem} ({analyticsStats.peak.sgpa.toFixed(2)} SGPA)</strong>
                <small>Highest scored semester record</small>
              </div>
              <div className="grm-cgpa__insight-card">
                <span className="grm-cgpa__insight-label">Lowest Semester Standing</span>
                <strong>{analyticsStats.lowest.sem} ({analyticsStats.lowest.sgpa.toFixed(2)} SGPA)</strong>
                <small>Requires focus or grade improvement</small>
              </div>
              <div className="grm-cgpa__insight-card">
                <span className="grm-cgpa__insight-label">Average Credits / Semester</span>
                <strong>{analyticsStats.avgCredits} Credits</strong>
                <small>Standard B.Tech semester load</small>
              </div>
              <div className="grm-cgpa__insight-card">
                <span className="grm-cgpa__insight-label">Overall Academic Momentum</span>
                <strong style={{ color: analyticsStats.trendDiff >= 0 ? '#166534' : '#b45309' }}>
                  {analyticsStats.trendDiff >= 0 ? `+${analyticsStats.trendDiff} Upward ↗` : `${analyticsStats.trendDiff} Dip ↘`}
                </strong>
                <small>Compared from Sem 1 to current</small>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
         TAB 3: DEGREE AUDIT & HONOURS CLEARANCE
         ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="grm-cgpa-tab-pane">
          <div className="grm-cgpa__audit-panel">
            <div className="grm-cgpa__audit-header">
              <h4>
                <FiAward aria-hidden="true" /> Degree Clearance & Honours Standing Audit
              </h4>
              <span className="grm-cgpa__audit-reg">AICTE B.Tech 160-Credit Model Regulation</span>
            </div>

            <div className="grm-cgpa__audit-grid">
              <div className="grm-cgpa__audit-card">
                <div className="grm-cgpa__audit-icon is-blue"><FiBookOpen /></div>
                <div className="grm-cgpa__audit-info">
                  <strong>Credit Audit Status</strong>
                  <span>{totalCredits >= TOTAL_DEGREE_CREDITS ? 'Degree Credits Complete' : `${remainingDegreeCredits} Credits Remaining`}</span>
                  <small>{totalCredits} / {TOTAL_DEGREE_CREDITS} Total Program Credits</small>
                </div>
              </div>

              <div className="grm-cgpa__audit-card">
                <div className={`grm-cgpa__audit-icon is-${(cgpa && cgpa >= 7.5) ? 'green' : 'amber'}`}>
                  <FiCheckCircle />
                </div>
                <div className="grm-cgpa__audit-info">
                  <strong>Honours Degree Clearance</strong>
                  <span>{(cgpa && cgpa >= 7.5) ? 'Qualifies for B.Tech (Honours)' : 'Standard Degree Stream'}</span>
                  <small>Honours standard requires CGPA ≥ 7.50 without backlogs</small>
                </div>
              </div>

              <div className="grm-cgpa__audit-card">
                <div className="grm-cgpa__audit-icon is-purple"><FiAward /></div>
                <div className="grm-cgpa__audit-info">
                  <strong>Academic Division Class</strong>
                  <span>{divisionInfo ? divisionInfo.division : 'Awaiting Full Data'}</span>
                  <small>{activePercentage ? `${activePercentage.toFixed(2)}% Marks Equivalent` : 'UGC / AICTE Conversion'}</small>
                </div>
              </div>

              <div className="grm-cgpa__audit-card">
                <div className="grm-cgpa__audit-icon is-teal"><FiClock /></div>
                <div className="grm-cgpa__audit-info">
                  <strong>Pacing & Regularity</strong>
                  <span>{validRows.length ? `${validRows.length} Semesters Recorded` : '0 Recorded'}</span>
                  <small>Standard completion pace: 8 full semesters</small>
                </div>
              </div>
            </div>

            {/* Formal Criteria Table */}
            <div className="grm-cgpa__criteria-table-wrap">
              <table className="grm-cgpa__criteria-table">
                <thead>
                  <tr>
                    <th>Autonomous Degree Requirement</th>
                    <th>Required Benchmark</th>
                    <th>Current Status</th>
                    <th>Clearance Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Degree Credit Accumulation</strong></td>
                    <td>160 Total Earned Credits</td>
                    <td>{totalCredits} Credits Accumulated</td>
                    <td>
                      <span className={`grm-status-pill ${totalCredits >= TOTAL_DEGREE_CREDITS ? 'is-pass' : 'is-pending'}`}>
                        {totalCredits >= TOTAL_DEGREE_CREDITS ? '✓ Requirement Met' : 'In Progress'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>B.Tech Degree Passing Threshold</strong></td>
                    <td>CGPA ≥ 5.00</td>
                    <td>{cgpa !== null ? `${cgpa.toFixed(2)} CGPA` : '—'}</td>
                    <td>
                      <span className={`grm-status-pill ${cgpa && cgpa >= 5.0 ? 'is-pass' : 'is-pending'}`}>
                        {cgpa && cgpa >= 5.0 ? '✓ Satisfied' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>B.Tech Honours Eligibility</strong></td>
                    <td>CGPA ≥ 7.50 (Zero Backlogs)</td>
                    <td>{cgpa !== null ? `${cgpa.toFixed(2)} CGPA` : '—'}</td>
                    <td>
                      <span className={`grm-status-pill ${cgpa && cgpa >= 7.5 ? 'is-pass' : 'is-amber'}`}>
                        {cgpa && cgpa >= 7.5 ? '✓ Honours Qualified' : 'Standard Degree'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Backlog / Regularity Record</strong></td>
                    <td>All Sems ≥ 5.00 SGPA</td>
                    <td>{validRows.some(r => Number(r.sgpa) < 5.0) ? 'Remedial Semester Detected' : 'Clear Continuous Stream'}</td>
                    <td>
                      <span className={`grm-status-pill ${!validRows.some(r => Number(r.sgpa) < 5.0) ? 'is-pass' : 'is-fail'}`}>
                        {!validRows.some(r => Number(r.sgpa) < 5.0) ? '✓ Regular Standing' : 'Attention Needed'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 4: WHAT-IF GRADUATION GOAL SIMULATOR
         ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="grm-cgpa-tab-pane">
          <div className="grm-cgpa__planner-box">
            <div className="grm-cgpa__planner-banner">
              <div>
                <h4 className="grm-cgpa__planner-title">
                  <FiTarget aria-hidden="true" /> Graduation Target Goal Simulator (What-If Analysis)
                </h4>
                <p className="grm-cgpa__planner-desc">
                  Calculate the exact average SGPA required in upcoming semesters to achieve your target graduation CGPA.
                </p>
              </div>
              <span className="grm-cgpa__planner-badge">Interactive Simulator</span>
            </div>

            <div className="grm-cgpa__planner-content">
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
                  <span>Remaining Semesters:</span>
                  <select
                    value={targetRemainingSemesters}
                    onChange={e => setTargetRemainingSemesters(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map(n => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'Upcoming Semester' : 'Upcoming Semesters'}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Avg. Credits per Semester:</span>
                  <input
                    type="number"
                    min="10"
                    max="30"
                    step="0.5"
                    value={creditsPerUpcomingSem}
                    onChange={e => setCreditsPerUpcomingSem(Number(e.target.value))}
                    placeholder="e.g. 20"
                  />
                </label>
              </div>

              <div className="grm-cgpa__planner-result">
                {cgpa === null ? (
                  <p className="grm-cgpa__planner-note">Complete current semester rows with valid SGPAs and credits to simulate your graduation goal.</p>
                ) : !goalAnalysis ? (
                  <p className="grm-cgpa__planner-note">Enter a valid target CGPA (1-10).</p>
                ) : goalAnalysis.isImpossible ? (
                  <div className="grm-cgpa__planner-alert is-warning">
                    <strong>⚠️ Target Unreachable in {goalAnalysis.remSems} Semesters (Required SGPA: {goalAnalysis.requiredAvgSgpa.toFixed(2)} &gt; 10.00)</strong>
                    <p>
                      The gap between your current performance ({cgpa.toFixed(2)}) and target ({goalAnalysis.target.toFixed(2)}) cannot be bridged with only {goalAnalysis.upcomingTotalCredits} credits. Consider extending your goal across more semesters or earning additional honors/minor credits.
                    </p>
                  </div>
                ) : goalAnalysis.isAlreadySecured ? (
                  <div className="grm-cgpa__planner-alert is-success">
                    <strong><FiCheck aria-hidden="true" /> Target Already Secured!</strong>
                    <p>
                      Your current cumulative CGPA of <strong>{cgpa.toFixed(2)}</strong> already meets or exceeds target {goalAnalysis.target.toFixed(2)}. Maintaining passing grades (&ge; 5.0 SGPA) across the remaining {goalAnalysis.upcomingTotalCredits} credits will successfully achieve your graduation goal.
                    </p>
                  </div>
                ) : (
                  <div className="grm-cgpa__planner-alert is-achievable">
                    <div className="grm-cgpa__planner-req">
                      <span>Required Average SGPA in each of the next {goalAnalysis.remSems} semesters:</span>
                      <strong>{goalAnalysis.requiredAvgSgpa.toFixed(2)}</strong>
                      <small>out of 10.00</small>
                    </div>
                    <div className="grm-cgpa__planner-advice">
                      <span className={`grm-cgpa__feasibility-pill ${goalAnalysis.isEasy ? 'is-easy' : goalAnalysis.isModerate ? 'is-moderate' : 'is-hard'}`}>
                        {goalAnalysis.isEasy ? '✨ Easily Achievable' : goalAnalysis.isModerate ? '⚡ Moderate Challenge' : '🔥 High Performance Required'}
                      </span>
                      <p>
                        Scoring an average SGPA of <strong>{goalAnalysis.requiredAvgSgpa.toFixed(2)}</strong> across {goalAnalysis.upcomingTotalCredits} remaining credits will lift your cumulative performance from {cgpa.toFixed(2)} to exactly <strong>{goalAnalysis.target.toFixed(2)} CGPA</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. SUBJECT-WISE SGPA CALCULATOR MODAL */}
      {subjectModalOpen && (
        <div className="grm-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="sub-modal-title">
          <div className="grm-modal grm-modal--subject-calc">
            <div className="grm-modal__header">
              <div>
                <h3 id="sub-modal-title">
                  <FiBookOpen aria-hidden="true" /> Subject-Wise SGPA Calculator
                </h3>
                <p>Enter subjects, credits, and letter grades to calculate the exact semester SGPA.</p>
              </div>
              <button
                type="button"
                className="grm-modal__close"
                onClick={() => setSubjectModalOpen(false)}
                aria-label="Close subject calculator"
              >
                <FiX />
              </button>
            </div>

            <div className="grm-modal__body">
              <div className="grm-modal__table-wrap">
                <table className="grm-modal__table">
                  <thead>
                    <tr>
                      <th style={{ width: '18%' }}>Code</th>
                      <th style={{ width: '38%' }}>Subject Name</th>
                      <th style={{ width: '14%' }}>Credits</th>
                      <th style={{ width: '18%' }}>Letter Grade</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalSubjects.map((sub, idx) => (
                      <tr key={sub.id}>
                        <td>
                          <input
                            value={sub.code}
                            placeholder="CS301"
                            onChange={e => updateModalSubject(sub.id, 'code', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            value={sub.name}
                            placeholder="Course Name"
                            onChange={e => updateModalSubject(sub.id, 'name', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0.5"
                            max="8"
                            step="0.5"
                            value={sub.credits}
                            onChange={e => updateModalSubject(sub.id, 'credits', e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            value={sub.grade}
                            onChange={e => updateModalSubject(sub.id, 'grade', e.target.value)}
                          >
                            {UGC_GRADES.map(g => (
                              <option key={g.grade} value={g.grade}>
                                {g.grade} ({g.points} pts) - {g.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="grm-modal__pts-badge">
                            {((Number(sub.credits) || 0) * (Number(sub.points) || 0)).toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grm-modal__sub-actions">
                <button type="button" className="grm-btn-text" onClick={addModalSubject}>
                  <FiPlus /> Add Subject
                </button>
                <button type="button" className="grm-btn-text" onClick={() => setModalSubjects(DEFAULT_SUBJECTS)}>
                  <FiRotateCcw /> Load Standard Curriculum
                </button>
              </div>

              {/* Computed SGPA Banner */}
              <div className="grm-modal__result-strip">
                <div className="grm-modal__stat">
                  <span>Total Semester Credits</span>
                  <strong>{computedModalStats.totalCr.toFixed(1)}</strong>
                </div>
                <div className="grm-modal__stat">
                  <span>Total Grade Points</span>
                  <strong>{computedModalStats.totalPts.toFixed(1)}</strong>
                </div>
                <div className="grm-modal__stat is-highlight">
                  <span>Calculated SGPA</span>
                  <strong>{computedModalStats.sgpa}</strong>
                </div>
              </div>
            </div>

            <div className="grm-modal__footer">
              <button
                type="button"
                className="grm-modal__btn-secondary"
                onClick={() => setSubjectModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="grm-modal__btn-primary"
                onClick={applyModalSgpa}
              >
                <FiCheck /> Apply SGPA to Semester
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. UGC / AICTE 10-POINT GRADING SCALE GUIDE MODAL */}
      {gradeScaleOpen && (
        <div className="grm-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="scale-modal-title">
          <div className="grm-modal grm-modal--grade-guide">
            <div className="grm-modal__header">
              <div>
                <h3 id="scale-modal-title">
                  <FiHelpCircle aria-hidden="true" /> UGC / AICTE 10-Point Grading System Standard
                </h3>
                <p>Standard letter grading and credit weighting prescribed for autonomous B.Tech institutions.</p>
              </div>
              <button
                type="button"
                className="grm-modal__close"
                onClick={() => setGradeScaleOpen(false)}
                aria-label="Close grade guide"
              >
                <FiX />
              </button>
            </div>

            <div className="grm-modal__body">
              <div className="grm-guide-table-scroll" role="region" aria-label="Grade scale reference table" tabIndex={0}>
              <table className="grm-guide-table">
                <thead>
                  <tr>
                    <th>Letter Grade</th>
                    <th>Grade Points</th>
                    <th>Marks Range (%)</th>
                    <th>Qualitative Rating</th>
                    <th>Academic Classification</th>
                  </tr>
                </thead>
                <tbody>
                  {UGC_GRADES.map(g => (
                    <tr key={g.grade}>
                      <td><span className="grm-guide-pill">{g.grade}</span></td>
                      <td><strong>{g.points}</strong></td>
                      <td>{g.minMarks}</td>
                      <td>{g.label}</td>
                      <td>
                        {g.points >= 9
                          ? 'Outstanding Performance'
                          : g.points >= 8
                            ? 'First Class with Distinction'
                            : g.points >= 7
                              ? 'First Class Standing'
                              : g.points >= 5
                                ? 'Second Class / Passing'
                                : 'Academic Arrear / Remedial Required'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              <div className="grm-guide-notes">
                <p><strong>Note 1:</strong> SGPA = Σ (Credit × Grade Point) ÷ Σ Credits for the semester.</p>
                <p><strong>Note 2:</strong> CGPA = Σ (Semester Credits × SGPA) ÷ Total Cumulative Credits.</p>
                <p><strong>Note 3:</strong> AICTE Percentage Formula: Percentage (%) = (CGPA − 0.75) × 10.</p>
              </div>
            </div>

            <div className="grm-modal__footer">
              <button
                type="button"
                className="grm-modal__btn-primary"
                onClick={() => setGradeScaleOpen(false)}
              >
                Got It, Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
