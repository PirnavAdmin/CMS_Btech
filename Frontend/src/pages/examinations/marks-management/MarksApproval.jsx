import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiCheck, FiEye, FiSearch, FiX } from 'react-icons/fi'
import { marksApi, facultyApi, facultySubjectAllocationApi, subjectApi } from '../../../api/apiEndpoints'
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
import { getUserRole } from '../../../auth/auth'
import { marksWorkflowPayload } from './marksWorkflow'
import { showError, showSuccess } from '../../../utils/toast'
import eventBus, { ERP_EVENTS } from '../../../services/eventBus'
import './MarksApproval.css'

const PAGE_SIZE = 10
const DASH = '—'
const FILTER_KEYS = ['academicYear', 'course', 'branch', 'semester', 'section', 'subject', 'exam', 'faculty']
const FILTER_LABELS = {
  academicYear: 'Academic Year',
  course: 'Course',
  branch: 'Branch',
  semester: 'Semester',
  section: 'Section',
  subject: 'Subject',
  exam: 'Exam',
  faculty: 'Faculty',
}
const approvalColumns = [
  ['subject', 'Subject'],
  ['subjectCode', 'Subject Code'],
  ['faculty', 'Faculty'],
  ['course', 'Course'],
  ['branch', 'Branch'],
  ['semesterSection', 'Semester / Section'],
  ['exam', 'Exam'],
  ['totalStudents', 'Students'],
  ['averageMaximum', 'Average / Maximum Marks'],
  ['submittedAtLabel', 'Submitted On'],
  ['status', 'Status'],
].map(([key, label]) => ({ key, value: key, label }))

const clean = value => String(value ?? '').trim()
const norm = value => clean(value).toLowerCase().replace(/[_-]+/g, ' ')
const pick = (record, ...keys) => {
  for (const key of keys) {
    const value = record?.[key]
    if (value !== undefined && value !== null && clean(value) !== '') return value
  }
  return undefined
}
const toId = value => value === undefined || value === null || clean(value) === '' ? '' : String(value)
const sameId = (left, right) => toId(left) !== '' && toId(right) !== '' && toId(left) === toId(right)
const number = value => value !== undefined && value !== null && clean(value) !== '' && Number.isFinite(Number(value)) ? Number(value) : null
const text = value => value === undefined || value === null || clean(value) === '' ? DASH : String(value)
const numberLabel = value => value === null || value === undefined ? DASH : Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })
const findById = (records, id, idKeys = ['id']) => {
  if (!toId(id)) return null
  return (records || []).find(record => idKeys.some(key => sameId(record?.[key], id))) || null
}
const relationId = (record, ...keys) => toId(pick(record, ...keys))
const entityName = (record, ...keys) => pick(record, ...keys)
const withSemesterPrefix = value => {
  const label = clean(value)
  if (!label) return ''
  return /^semester\b/i.test(label) ? label : 'Semester ' + label
}
const dateTimeLabel = value => {
  if (!value) return DASH
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return String(value)
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date)
}
const dateLabel = value => {
  if (!value) return DASH
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return String(value)
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}
const normalizeStatus = value => {
  const status = norm(value).toUpperCase()
  if (status === 'SUBMITTED' || status === 'PENDING') return 'Pending'
  if (status === 'APPROVED' || status === 'PUBLISHED') return 'Approved'
  if (status === 'REJECTED') return 'Rejected'
  return ''
}
const marksStatus = row => normalizeStatus(pick(row, 'workflowStatus', 'status'))

function entityLabel(records, id, directName, idKeys, nameKeys, format = value => value) {
  const direct = clean(directName)
  const entity = findById(records, id, idKeys)
  const resolved = entityName(entity, ...nameKeys)
  if (resolved !== undefined) return String(format(resolved))
  if (direct && !/^\d+$/.test(direct)) return String(format(direct))
  return ''
}

function getAcademicRelation(mark, section, allocation, subject, academic) {
  const courseId = relationId(mark, 'courseId') ||
    relationId(section, 'courseId') || relationId(allocation, 'courseId') || relationId(subject, 'courseId')
  const branchId = relationId(mark, 'branchId') ||
    relationId(section, 'branchId') || relationId(allocation, 'branchId') || relationId(subject, 'branchId')
  const semesterId = relationId(mark, 'semesterId') ||
    relationId(section, 'semesterId') || relationId(allocation, 'semesterId') || relationId(subject, 'semesterId')
  const academicYearId = relationId(mark, 'academicYearId', 'yearId') ||
    relationId(section, 'academicYearId', 'yearId') || relationId(allocation, 'academicYearId', 'yearId') ||
    relationId(subject, 'academicYearId', 'yearId')

  const course = entityLabel(academic.courses, courseId,
    pick(mark, 'courseName', 'course') || pick(section, 'courseName', 'course') ||
    pick(allocation, 'courseName', 'course') || pick(subject, 'courseName', 'course'),
    ['id', 'courseId'], ['courseName', 'name', 'label', 'title'])
  const branch = entityLabel(academic.branches, branchId,
    pick(mark, 'branchName', 'branch') || pick(section, 'branchName', 'branch') ||
    pick(allocation, 'branchName', 'branch') || pick(subject, 'branchName', 'branch'),
    ['id', 'branchId'], ['branchName', 'name', 'label', 'title', 'branchCode'])
  const semesterRaw = pick(mark, 'semesterName', 'semester') || pick(section, 'semesterName', 'semesterNumber', 'semester') ||
    pick(allocation, 'semesterName', 'semesterNumber', 'semester') || pick(subject, 'semesterName', 'semesterNumber', 'semester')
  const semester = entityLabel(academic.semesters, semesterId, semesterRaw,
    ['id', 'semesterId', 'semesterNumber'], ['semesterName', 'name', 'label', 'title', 'semesterNumber'],
    withSemesterPrefix)
  const academicYear = entityLabel(academic.academicYears, academicYearId,
    pick(mark, 'academicYearName', 'academicYear') || pick(section, 'academicYearName', 'academicYear') ||
    pick(allocation, 'academicYearName', 'academicYear') || pick(subject, 'academicYearName', 'academicYear'),
    ['id', 'academicYearId'], ['academicYearName', 'name', 'label', 'title', 'yearName'])

  return { courseId, branchId, semesterId, academicYearId, course, branch, semester, academicYear }
}

function findFacultyAllocation(mark, relation, allocations) {
  const subjectId = relationId(mark, 'subjectId')
  const sectionId = relationId(mark, 'sectionId')
  const relevant = (allocations || []).filter(allocation => {
    const allocationSubjectId = relationId(allocation, 'subjectId')
    if (!subjectId || !allocationSubjectId || allocationSubjectId !== subjectId) return false
    const checks = [
      [sectionId, relationId(allocation, 'sectionId')],
      [relation.academicYearId, relationId(allocation, 'academicYearId', 'yearId')],
      [relation.semesterId, relationId(allocation, 'semesterId')],
      [relation.branchId, relationId(allocation, 'branchId')],
      [relation.courseId, relationId(allocation, 'courseId')],
    ]
    return checks.every(([expected, actual]) => !expected || !actual || expected === actual)
  })
  if (!relevant.length) return null

  const scored = relevant.map(allocation => {
    const checks = [
      [sectionId, relationId(allocation, 'sectionId')],
      [relation.academicYearId, relationId(allocation, 'academicYearId', 'yearId')],
      [relation.semesterId, relationId(allocation, 'semesterId')],
      [relation.branchId, relationId(allocation, 'branchId')],
      [relation.courseId, relationId(allocation, 'courseId')],
    ]
    return { allocation, score: checks.reduce((total, [expected, actual]) => total + (expected && actual && expected === actual ? 1 : 0), 0) }
  })
  const maxScore = Math.max(...scored.map(item => item.score))
  const best = scored.filter(item => item.score === maxScore).map(item => item.allocation)
  const facultyIds = [...new Set(best.map(item => relationId(item, 'facultyId')).filter(Boolean))]
  return facultyIds.length === 1 ? best.find(item => relationId(item, 'facultyId') === facultyIds[0]) : null
}

function actorLabel(value) {
  if (value === undefined || value === null || clean(value) === '') return DASH
  const id = String(value)
  const user = currentUser()
  return id === user.id ? user.name || ('User #' + id) : 'User #' + id
}

function currentUser() {
  try {
    const storage = window.localStorage
    const session = window.sessionStorage
    return {
      id: storage.getItem('btech-user-id') || session.getItem('btech-user-id') || '',
      name: storage.getItem('btech-user-name') || session.getItem('btech-user-name') || '',
    }
  } catch {
    return { id: '', name: '' }
  }
}

function getWorkflowAction(entry) {
  const fromStatus = clean(pick(entry, 'fromStatus')).toUpperCase()
  const toStatus = clean(pick(entry, 'toStatus')).toUpperCase()
  if (toStatus === 'SUBMITTED' && fromStatus === 'REJECTED') return 'Resubmitted'
  if (toStatus === 'SUBMITTED') return 'Submitted'
  if (toStatus === 'APPROVED') return 'Approved'
  if (toStatus === 'REJECTED') return 'Rejected'
  return toStatus || fromStatus || 'Updated'
}

function getResult(row) {
  const explicit = pick(row, 'resultStatus', 'result')
  if (explicit !== undefined && clean(explicit)) return String(explicit)
  const grade = clean(pick(row, 'grade')).toUpperCase()
  if (grade) return ['F', 'FAIL', 'FAILED'].includes(grade) ? 'Fail' : 'Pass'
  const obtained = number(pick(row, 'marksObtained'))
  const passing = number(pick(row, 'passingMarks', 'minimumPassingMarks'))
  if (obtained !== null && passing !== null) return obtained >= passing ? 'Pass' : 'Fail'
  return DASH
}

function getAttendance(row) {
  const direct = pick(row, 'attendanceStatus', 'attendance', 'presence')
  if (direct === true) return 'Present'
  if (direct === false) return 'Absent'
  if (direct !== undefined) return String(direct)
  const isAbsent = pick(row, 'isAbsent', 'absent')
  if (isAbsent === true || String(isAbsent).toLowerCase() === 'true') return 'Absent'
  const marks = clean(pick(row, 'marksObtained')).toUpperCase()
  return ['AB', 'ABSENT'].includes(marks) ? 'Absent' : DASH
}

function getStudentRow(mark, index) {
  const obtainedRaw = pick(mark, 'marksObtained')
  const obtained = number(obtainedRaw)
  const maximum = number(pick(mark, 'maxMarks', 'maximumMarks'))
  const percentage = number(pick(mark, 'percentage')) ??
    (obtained !== null && maximum > 0 ? obtained / maximum * 100 : null)
  return {
    id: toId(pick(mark, 'markId')) || String(index),
    raw: mark,
    rollNumber: text(pick(mark, 'studentCode', 'rollNumber', 'registrationNumber')),
    studentName: text(pick(mark, 'studentName', 'name')),
    marksObtained: obtainedRaw === undefined ? DASH : String(obtainedRaw),
    maximumMarks: maximum === null ? text(pick(mark, 'maxMarks', 'maximumMarks')) : numberLabel(maximum),
    percentage: percentage === null ? DASH : numberLabel(percentage) + '%',
    attendance: getAttendance(mark),
    result: getResult(mark),
    remarks: text(pick(mark, 'remarks')),
    grade: pick(mark, 'grade'),
  }
}

function groupMarkRows(markRows, academic, subjects, allocations, faculty) {
  const groups = new Map()
  for (const mark of markRows || []) {
    const status = marksStatus(mark)
    if (!status) continue

    const examId = relationId(mark, 'examId')
    const subjectId = relationId(mark, 'subjectId')
    const sectionId = relationId(mark, 'sectionId')
    const key = [examId, subjectId, sectionId, status].join('|')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(mark)
  }

  return [...groups.entries()].map(([key, rawMarks]) => {
    const mark = rawMarks[0]
    const subjectId = relationId(mark, 'subjectId')
    const sectionId = relationId(mark, 'sectionId')
    const section = findById(academic.sections, sectionId, ['id', 'sectionId'])
    const subject = findById(subjects, subjectId, ['id', 'subjectId'])
    const preliminaryRelation = getAcademicRelation(mark, section, null, subject, academic)
    const allocation = findFacultyAllocation(mark, preliminaryRelation, allocations)
    const relation = getAcademicRelation(mark, section, allocation, subject, academic)
    const facultyId = relationId(mark, 'facultyId', 'assignedFacultyId') ||
      relationId(allocation, 'facultyId')
    const facultyRecord = findById(faculty, facultyId, ['id', 'facultyId'])
    const facultyName = pick(mark, 'facultyName') ||
      entityName(facultyRecord, 'facultyName', 'fullName', 'name', 'displayName') ||
      pick(allocation, 'facultyName', 'fullName') || ''
    const subjectName = pick(mark, 'subjectName') ||
      entityName(subject, 'subjectName', 'name', 'title') || ''
    const subjectCode = pick(mark, 'subjectCode') ||
      entityName(subject, 'subjectCode', 'code') || ''
    const sectionName = pick(mark, 'sectionName') ||
      entityName(section, 'sectionName', 'name', 'label') || ''
    const rawDates = rawMarks.map(row => pick(row, 'submittedAt', 'enteredAt')).filter(Boolean)
    const submittedAt = rawDates.length ? rawDates.sort((left, right) => new Date(left) - new Date(right)).at(-1) : ''
    const studentRows = rawMarks.map(getStudentRow)
    const numericMarks = studentRows.map(row => number(pick(row.raw, 'marksObtained'))).filter(value => value !== null)
    const maxima = rawMarks.map(row => number(pick(row, 'maxMarks', 'maximumMarks'))).filter(value => value !== null)
    const maximumMarks = maxima.length ? Math.max(...maxima) : null
    const average = numericMarks.length ? numericMarks.reduce((total, value) => total + value, 0) / numericMarks.length : null
    const outcomes = studentRows.map(row => row.result.toLowerCase())
    const knownOutcomes = outcomes.filter(value => value !== DASH.toLowerCase())
    const attendance = studentRows.map(row => row.attendance.toLowerCase())
    const knownAttendance = attendance.filter(value => value !== DASH.toLowerCase())
    const enteredCount = studentRows.filter(row => pick(row.raw, 'marksObtained') !== undefined).length
    const enteredBy = [...new Set(rawMarks.map(row => toId(pick(row, 'enteredBy'))).filter(Boolean))]
    const examName = pick(mark, 'examName', 'examCode') || ''
    return {
      id: key,
      rawMarks,
      examId,
      subjectId,
      sectionId,
      facultyId,
      academicYearId: relation.academicYearId,
      courseId: relation.courseId,
      branchId: relation.branchId,
      semesterId: relation.semesterId,
      subject: subjectName,
      subjectCode,
      faculty: clean(facultyName),
      academicYear: relation.academicYear,
      course: relation.course,
      branch: relation.branch,
      semester: relation.semester,
      section: sectionName,
      exam: examName,
      examType: pick(mark, 'examType') || '',
      examCode: pick(mark, 'examCode') || '',
      assessmentType: pick(mark, 'assessmentType') || '',
      examDate: pick(mark, 'examDate', 'examinationDate') || '',
      maximumMarks,
      passingMarks: pick(mark, 'passingMarks', 'minimumPassingMarks'),
      submittedAt,
      submittedAtLabel: dateTimeLabel(submittedAt),
      enteredBy,
      status,
      students: studentRows,
      totalStudents: rawMarks.length,
      enteredCount,
      pendingCount: Math.max(0, rawMarks.length - enteredCount),
      average,
      averageMaximum: (average === null ? DASH : numberLabel(average)) + ' / ' + (maximumMarks === null ? DASH : numberLabel(maximumMarks)),
      highest: numericMarks.length ? Math.max(...numericMarks) : null,
      lowest: numericMarks.length ? Math.min(...numericMarks) : null,
      passed: knownOutcomes.length ? outcomes.filter(value => value.includes('pass') && !value.includes('fail')).length : null,
      failed: knownOutcomes.length ? outcomes.filter(value => value.includes('fail')).length : null,
      absent: knownAttendance.length ? attendance.filter(value => value.includes('absent')).length : null,
      semesterSection: [relation.semester, sectionName].filter(Boolean).join(' / ') || DASH,
      searchText: [subjectName, subjectCode, facultyName, relation.branch, examName].map(clean).join(' ').toLowerCase(),
    }
  })
}

const approverRoles = new Set(['admin', 'college_admin', 'super_admin', 'hod', 'department_head', 'exam_cell', 'examcell', 'exam_officer', 'exam_office'])

function decisionResultCount(result, action) {
  const ids = result?.processedMarkIds
  if (Array.isArray(ids)) return ids.length
  if (action === 'approve') return Number(result?.processedCount) || 0
  return Number(result?.rejectedCount) || 0
}

function DecisionDialog({ kind, batch, onCancel, onConfirm, busy }) {
  const [remarks, setRemarks] = useState('')
  const reject = kind === 'reject'

  const submit = event => {
    event.preventDefault()
    if (reject && !remarks.trim()) return
    onConfirm(remarks.trim())
  }

  return (
    <div
      className="marks-approval-dialog-backdrop"
      role="presentation"
      onMouseDown={event => event.target === event.currentTarget && !busy && onCancel()}
    >
      <section className="marks-approval-decision" role="alertdialog" aria-modal="true" aria-labelledby="marks-approval-decision-title">
        <button className="marks-approval-decision__close" type="button" aria-label="Close" onClick={onCancel} disabled={busy}><FiX /></button>
        <div className={'marks-approval-decision__icon ' + (reject ? 'is-reject' : '')} aria-hidden="true">{reject ? <FiX /> : <FiCheck />}</div>
        <h2 id="marks-approval-decision-title">{reject ? 'Reject Marks' : 'Approve Marks'}</h2>
        <p>{reject ? 'Review this submission and provide a reason for rejection.' : 'Confirm the submitted marks after review.'}</p>
        <dl>
          <div><dt>Subject</dt><dd>{text(batch.subject)}</dd></div>
          <div><dt>Subject Code</dt><dd>{text(batch.subjectCode)}</dd></div>
          <div><dt>Faculty</dt><dd>{text(batch.faculty)}</dd></div>
          <div><dt>Exam</dt><dd>{text(batch.exam)}</dd></div>
          <div><dt>Students</dt><dd>{batch.totalStudents}</dd></div>
        </dl>
        <form onSubmit={submit}>
          <label>
            {reject ? 'Rejection Reason *' : 'Approval Remarks (optional)'}
            <textarea
              rows="3"
              maxLength={500}
              value={remarks}
              onChange={event => setRemarks(event.target.value)}
              required={reject}
              placeholder={reject ? 'Explain what needs correction' : 'Add a note to the approval history'}
            />
          </label>
          <footer>
            <button className="erp-btn erp-btn--secondary" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
            <button className={'erp-btn ' + (reject ? 'erp-btn--danger' : 'erp-btn--primary')} type="submit" disabled={busy || (reject && !remarks.trim())}>
              {busy ? (reject ? 'Rejecting marks…' : 'Approving marks…') : (reject ? 'Reject Marks' : 'Approve Marks')}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

function makeOptions(masterRecords, batches, idKeys, nameKeys, batchIdKey, batchNameKey, codeKeys = []) {
  const options = []
  for (const record of masterRecords || []) {
    const id = toId(pick(record, ...idKeys))
    const label = clean(pick(record, ...nameKeys))
    if (!label) continue
    options.push({ value: id || label, label, code: clean(pick(record, ...codeKeys)) })
  }
  for (const batch of batches || []) {
    const label = clean(batch[batchNameKey])
    if (!label || label === DASH) continue
    options.push({
      value: toId(batch[batchIdKey]) || label,
      label,
      code: batchNameKey === 'subject' ? clean(batch.subjectCode) : batchNameKey === 'exam' ? clean(batch.examCode) : '',
    })
  }
  const unique = new Map()
  options.forEach(option => {
    const key = toId(option.value) || norm(option.label)
    if (!unique.has(key)) unique.set(key, option)
  })
  return [...unique.values()].sort((left, right) => left.label.localeCompare(right.label, undefined, { numeric: true }))
}

function actorFromHistory(history, target) {
  const events = (history || []).filter(entry => clean(pick(entry, 'toStatus')).toUpperCase() === target)
  if (!events.length) return null
  return events.sort((left, right) => new Date(pick(right, 'actionAt')) - new Date(pick(left, 'actionAt')))[0]
}

export default function MarksApproval() {
  const academic = useAcademic()
  const role = getUserRole() || ''
  const canDecide = approverRoles.has(role)
  const forbidden = role === 'student'
  const historyRequest = useRef(0)

  const [markRows, setMarkRows] = useState([])
  const [subjects, setSubjects] = useState([])
  const [allocations, setAllocations] = useState([])
  const [faculty, setFaculty] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [filters, setFilters] = useState({
    academicYear: '', course: '', branch: '', semester: '', section: '', subject: '', exam: '', faculty: '',
  })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [decision, setDecision] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (forbidden) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError('')
    const [marksResponse, subjectsResponse, allocationResponse, facultyResponse] = await Promise.allSettled([
      marksApi.list(),
      subjectApi.list(),
      facultySubjectAllocationApi.getAll(),
      facultyApi.getAll(),
    ])
    if (marksResponse.status === 'rejected') {
      const error = marksResponse.reason
      setLoadError(error?.message || 'Submitted marks could not be loaded. Please retry.')
      setMarkRows([])
      showError(error)
    } else {
      setMarkRows(Array.isArray(marksResponse.value) ? marksResponse.value : [])
      if (subjectsResponse.status === 'fulfilled') setSubjects(Array.isArray(subjectsResponse.value) ? subjectsResponse.value : [])
      if (allocationResponse.status === 'fulfilled') setAllocations(Array.isArray(allocationResponse.value) ? allocationResponse.value : [])
      if (facultyResponse.status === 'fulfilled') setFaculty(Array.isArray(facultyResponse.value) ? facultyResponse.value : [])
    }
    setLoading(false)
  }, [forbidden])

  useEffect(() => {
    load()
    const refresh = () => load()
    const unsubscribe = ERP_EVENTS.RESULTS_RECORDED ? eventBus.subscribe(ERP_EVENTS.RESULTS_RECORDED, refresh) : () => {}
    window.addEventListener('focus', refresh)
    return () => {
      unsubscribe?.()
      window.removeEventListener('focus', refresh)
    }
  }, [load])

  const academicCatalog = useMemo(() => ({
    academicYears: academic.academicYears,
    courses: academic.courses,
    branches: academic.branches,
    semesters: academic.semesters,
    sections: academic.sections,
  }), [academic.academicYears, academic.courses, academic.branches, academic.semesters, academic.sections])

  const batches = useMemo(
    () => groupMarkRows(markRows, academicCatalog, subjects, allocations, faculty),
    [markRows, academicCatalog, subjects, allocations, faculty],
  )

  const optionSets = useMemo(() => ({
    academicYear: makeOptions(academic.academicYears, batches, ['id', 'academicYearId'], ['academicYearName', 'name', 'label', 'title', 'yearName'], 'academicYearId', 'academicYear'),
    course: makeOptions(academic.courses, batches, ['id', 'courseId'], ['courseName', 'name', 'label', 'title'], 'courseId', 'course'),
    branch: makeOptions(academic.branches, batches, ['id', 'branchId'], ['branchName', 'name', 'label', 'title', 'branchCode'], 'branchId', 'branch', ['branchCode', 'code']),
    semester: makeOptions(academic.semesters, batches, ['id', 'semesterId', 'semesterNumber'], ['semesterName', 'name', 'label', 'title', 'semesterNumber'], 'semesterId', 'semester'),
    section: makeOptions(academic.sections, batches, ['id', 'sectionId'], ['sectionName', 'name', 'label', 'title'], 'sectionId', 'section'),
    subject: makeOptions(subjects, batches, ['id', 'subjectId'], ['subjectName', 'name', 'label', 'title'], 'subjectId', 'subject', ['subjectCode', 'code']),
    exam: makeOptions([], batches, ['examId'], ['exam'], 'examId', 'exam', ['examCode']),
    faculty: makeOptions(faculty, batches, ['id', 'facultyId'], ['facultyName', 'fullName', 'name', 'displayName'], 'facultyId', 'faculty'),
  }), [academic.academicYears, academic.courses, academic.branches, academic.semesters, academic.sections, subjects, faculty, batches])

  const scopedRows = useMemo(() => {
    return batches.filter(batch => FILTER_KEYS.every(key => {
      const value = filters[key]
      if (!value) return true
      const fieldKey = key === 'exam' ? 'examId' : key === 'academicYear' ? 'academicYearId' : key + 'Id'
      const actual = batch[fieldKey] || batch[key]
      return toId(actual) === toId(value)
    }))
  }, [batches, filters])

  const rows = useMemo(() => scopedRows.filter(batch => {
    const statusMatches = statusFilter === 'All' || batch.status === statusFilter
    const query = norm(search)
    return statusMatches && (!query || batch.searchText.includes(query))
  }), [scopedRows, statusFilter, search])

  const counts = useMemo(() => ({
    total: scopedRows.length,
    pending: scopedRows.filter(row => row.status === 'Pending').length,
    approved: scopedRows.filter(row => row.status === 'Approved').length,
    rejected: scopedRows.filter(row => row.status === 'Rejected').length,
  }), [scopedRows])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const activePage = Math.min(page, pageCount)
  const visibleRows = rows.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE)

  const setField = (key, value) => {
    setFilters(current => ({ ...current, [key]: value }))
    setPage(1)
  }

  const closeDetails = () => {
    historyRequest.current += 1
    setSelected(null)
  }

  const openDetails = async batch => {
    const requestId = ++historyRequest.current
    setSelected({ ...batch, history: [], historyLoading: canDecide, historyError: '' })
    if (!canDecide || !batch.rawMarks.length) return

    const responses = await Promise.allSettled(
      batch.rawMarks.map(mark => marksApi.approvalHistory(pick(mark, 'markId'))),
    )
    if (requestId !== historyRequest.current) return
    const events = responses.flatMap((response, index) => {
      if (response.status !== 'fulfilled' || !Array.isArray(response.value)) return []
      return response.value.map(entry => ({ ...entry, __sourceMarkId: pick(batch.rawMarks[index], 'markId') }))
    })
    const grouped = new Map()
    events.forEach(entry => {
      const timestamp = pick(entry, 'actionAt')
      const key = [
        pick(entry, 'fromStatus'), pick(entry, 'toStatus'), pick(entry, 'actionBy'),
        timestamp ? new Date(timestamp).toISOString() : '', pick(entry, 'remarks'),
      ].map(value => clean(value)).join('|')
      const current = grouped.get(key)
      if (current) current.markCount += 1
      else grouped.set(key, { ...entry, markCount: 1 })
    })
    const history = [...grouped.values()].sort((left, right) => new Date(pick(left, 'actionAt')) - new Date(pick(right, 'actionAt')))
    const anyFailed = responses.some(response => response.status === 'rejected')
    setSelected(current => current?.id === batch.id
      ? { ...current, history, historyLoading: false, historyError: anyFailed && !history.length ? 'Approval history is unavailable.' : '' }
      : current)
  }

  const confirmDecision = async remarks => {
    if (!selected || !canDecide || selected.status !== 'Pending') return
    setBusy(true)
    const action = decision
    try {
      const payload = marksWorkflowPayload(action, selected.rawMarks, remarks)
      const sectionId = Number(selected.sectionId)
      const subjectId = Number(selected.subjectId)
      if (Number.isSafeInteger(sectionId) && sectionId > 0) payload.sectionId = sectionId
      if (Number.isSafeInteger(subjectId) && subjectId > 0) payload.subjectId = subjectId

      const response = await marksApi.workflow(action, payload)
      const completed = decisionResultCount(response, action)
      if (completed !== payload.markIds.length) {
        const details = Array.isArray(response?.errors)
          ? response.errors.map(error => error?.message || error?.errorCode).filter(Boolean).join(' ')
          : ''
        showError(details || 'The server processed ' + completed + ' of ' + payload.markIds.length + ' marks. The list has been refreshed.')
        setDecision('')
        closeDetails()
        await load()
        return
      }

      showSuccess(action === 'approve' ? 'Marks approved successfully.' : 'Marks rejected successfully.')
      setDecision('')
      closeDetails()
      await load()
    } catch (error) {
      showError(error)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const statusTag = status => <StatusBadge value={status} />
  const detailHistory = selected?.history || []
  const approvedEvent = actorFromHistory(detailHistory, 'APPROVED')
  const rejectedEvent = actorFromHistory(detailHistory, 'REJECTED')
  const submittedEvent = detailHistory.filter(entry => clean(pick(entry, 'toStatus')).toUpperCase() === 'SUBMITTED')
    .sort((left, right) => new Date(pick(right, 'actionAt')) - new Date(pick(left, 'actionAt')))[0]
  const submittedBy = selected?.enteredBy?.length
    ? [...new Set(selected.enteredBy.map(actorLabel))].join(', ')
    : actorLabel(pick(submittedEvent, 'actionBy'))
  const approvalRemarks = approvedEvent ? text(pick(approvedEvent, 'remarks')) : DASH
  const rejectionReason = rejectedEvent ? text(pick(rejectedEvent, 'remarks')) : DASH

  const detailFields = selected ? [
    ['Academic Year', text(selected.academicYear)],
    ['Course', text(selected.course)],
    ['Branch', text(selected.branch)],
    ['Semester', text(selected.semester)],
    ['Section', text(selected.section)],
    ['Subject', text(selected.subject)],
    ['Subject Code', text(selected.subjectCode)],
    ['Faculty', text(selected.faculty)],
    ['Exam', text(selected.exam)],
    ['Exam Type', text(selected.examType)],
    ['Assessment Type', text(selected.assessmentType)],
    ['Maximum Marks', selected.maximumMarks === null ? DASH : numberLabel(selected.maximumMarks)],
    ['Passing Marks', text(selected.passingMarks)],
    ['Exam Date', dateLabel(selected.examDate)],
    ['Submitted By', submittedBy],
    ['Submitted On', dateTimeLabel(pick(submittedEvent, 'actionAt') || selected.submittedAt)],
    ['Current Status', statusTag(selected.status)],
    ...(selected.status === 'Approved' ? [
      ['Approved By', actorLabel(pick(approvedEvent, 'actionBy'))],
      ['Approved On', dateTimeLabel(pick(approvedEvent, 'actionAt'))],
      ['Approval Remarks', approvalRemarks],
    ] : []),
    ...(selected.status === 'Rejected' ? [
      ['Rejected By', actorLabel(pick(rejectedEvent, 'actionBy'))],
      ['Rejected On', dateTimeLabel(pick(rejectedEvent, 'actionAt'))],
      ['Rejection Reason', rejectionReason],
    ] : []),
  ] : []

  const filterFields = FILTER_KEYS.map(key => (
    <div className="marks-approval-filter" key={key}>
      <span className="marks-approval-filter-label">{FILTER_LABELS[key]}</span>
      <SearchableSelect
        label={FILTER_LABELS[key]}
        value={filters[key]}
        options={optionSets[key]}
        onChange={value => setField(key, value)}
        placeholder={'All ' + FILTER_LABELS[key].toLowerCase() + 's'}
        searchPlaceholder={'Search ' + FILTER_LABELS[key].toLowerCase()}
      />
    </div>
  ))

  const exportRows = rows.map(row => ({
    ...row,
    averageMaximum: row.averageMaximum,
    submittedAtLabel: row.submittedAtLabel,
  }))

  return (
    <DashboardLayout>
      <section className="marks-management-marks-approval">
        <PageHeader
          className="marks-module-page-header"
          title="Marks Approval"
          subtitle="Review, verify, and resolve submitted marks with a complete approval history."
          breadcrumb={[{ label: 'Marks Management', link: '/marks-management' }, 'Marks Approval']}
          compactSummary={!forbidden ? [
            { label: 'Submissions', value: counts.total, tone: 'warning' },
            { label: 'Pending', value: counts.pending, tone: 'upcoming' },
            { label: 'Approved', value: counts.approved, tone: 'active' },
            { label: 'Rejected', value: counts.rejected, tone: 'danger' },
          ] : undefined}
        />
        <MarksModuleNav />

        {forbidden ? (
          <article className="erp-card marks-approval-forbidden">
            <EmptyState title="Access restricted" description="Students cannot access Marks Approval." />
          </article>
        ) : (
          <>
            <article className="erp-card marks-approval-filter-card">
              <div>
                <FilterPanel
                  className="marks-approval-filter-panel"
                  active={Boolean(Object.values(filters).some(Boolean) || statusFilter !== 'All' || search)}
                  hideClear
                  leadingActions={
                    <ExportMenu
                      rows={exportRows}
                      columns={approvalColumns}
                      title="Marks Approval"
                      filename="marks-approval-submissions"
                      scope="Filtered submissions"
                      allowEmpty
                    />
                  }
                >
                  <div className="marks-approval-filter-layout">
                    <label className="marks-approval-filter-search">
                      <FiSearch aria-hidden="true" />
                      <input
                        type="search"
                        aria-label="Search marks submissions"
                        placeholder="Search subject, code, faculty, branch or exam"
                        value={search}
                        onChange={event => { setSearch(event.target.value); setPage(1) }}
                      />
                    </label>
                    <div className="marks-approval-dropdown-grid">
                      {filterFields}
                      <label className="marks-approval-filter marks-approval-status-filter">
                        <span className="marks-approval-filter-label">Approval Status</span>
                        <select value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1) }}>
                          <option>All</option>
                          <option>Pending</option>
                          <option>Approved</option>
                          <option>Rejected</option>
                        </select>
                      </label>
                    </div>
                  </div>
                </FilterPanel>
              </div>
            </article>

            <article className="erp-card marks-approval-table-card">
              <header className="erp-card-header">
                <div>
                  <h2 className="erp-card-title">Submitted Marks</h2>
                  <p className="erp-card-subtitle">{rows.length} submission{rows.length === 1 ? '' : 's'} match the current filters.</p>
                </div>
              </header>

              {loadError && (
                <div className="marks-approval-error" role="alert">
                  <span>{loadError}</span>
                  <button type="button" className="erp-btn erp-btn--secondary" onClick={load} disabled={loading}>Retry</button>
                </div>
              )}

              {loading ? (
                <p className="marks-approval-loading" role="status">Loading submitted marks…</p>
              ) : !rows.length ? (
                <EmptyState
                  title={statusFilter === 'Pending' ? 'No pending marks submissions found.' : 'No marks submissions found.'}
                  description="Try changing the filters or search terms."
                />
              ) : (
                <>
                  <div className="marks-approval-table-wrap">
                    <table className="erp-table marks-approval-table">
                      <thead>
                        <tr>
                          {['Subject', 'Subject Code', 'Faculty', 'Course', 'Branch', 'Semester / Section', 'Exam', 'Students', 'Average / Maximum', 'Submitted On', 'Status', 'Action'].map(column => (
                            <th key={column}>{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRows.map(batch => (
                          <tr key={batch.id}>
                            <td>{text(batch.subject)}</td>
                            <td>{text(batch.subjectCode)}</td>
                            <td>{text(batch.faculty)}</td>
                            <td>{text(batch.course)}</td>
                            <td>{text(batch.branch)}</td>
                            <td>{batch.semesterSection}</td>
                            <td>{text(batch.exam)}</td>
                            <td>{batch.totalStudents}</td>
                            <td>{batch.averageMaximum}</td>
                            <td>{batch.submittedAtLabel}</td>
                            <td>{statusTag(batch.status)}</td>
                            <td>
                              <button type="button" className="marks-approval-view-btn" onClick={() => openDetails(batch)}>
                                <FiEye aria-hidden="true" /> View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="marks-approval-pagination">
                    <span>Showing {rows.length ? (activePage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(activePage * PAGE_SIZE, rows.length)} of {rows.length}</span>
                    {rows.length > PAGE_SIZE && (
                      <TablePagination currentPage={activePage} totalPages={pageCount} onPageChange={setPage} />
                    )}
                  </div>
                </>
              )}
            </article>

            {selected && (
              <ViewDialog
                title="Marks Approval Details"
                subtitle={[selected.subject, selected.subjectCode].filter(Boolean).join(' · ')}
                onClose={closeDetails}
                maxWidth="1180px"
                footerActions={canDecide && selected.status === 'Pending' ? (
                  <>
                    <button className="erp-btn erp-btn--danger" type="button" onClick={() => setDecision('reject')} disabled={busy}>Reject</button>
                    <button className="erp-btn erp-btn--primary" type="button" onClick={() => setDecision('approve')} disabled={busy}>Approve</button>
                  </>
                ) : null}
              >
                <dl className="marks-approval-details-grid">
                  {detailFields.map(([name, value]) => (
                    <div key={name}><dt>{name}</dt><dd>{value}</dd></div>
                  ))}
                </dl>

                {selected.status === 'Rejected' && (
                  <p className="marks-approval-rejection-note"><strong>Rejection reason:</strong> {rejectionReason}</p>
                )}

                <div className="marks-approval-detail-summary">
                  {[
                    ['Total Students', selected.totalStudents],
                    ['Marks Entered', selected.enteredCount],
                    ['Pending Marks', selected.pendingCount],
                    ['Average Marks', selected.average === null ? DASH : numberLabel(selected.average)],
                    ['Highest Marks', selected.highest === null ? DASH : numberLabel(selected.highest)],
                    ['Lowest Marks', selected.lowest === null ? DASH : numberLabel(selected.lowest)],
                    ['Passed', selected.passed === null ? DASH : selected.passed],
                    ['Failed', selected.failed === null ? DASH : selected.failed],
                    ['Absent', selected.absent === null ? DASH : selected.absent],
                  ].map(([name, value]) => (
                    <div key={name}><small>{name}</small><strong>{value}</strong></div>
                  ))}
                </div>

                <h3 className="marks-approval-section-title">Student Marks Review</h3>
                {selected.students.length ? (
                  <div className="marks-approval-students-wrap">
                    <table className="erp-table marks-approval-students">
                      <thead>
                        <tr>{['S.No', 'Roll Number', 'Student Name', 'Marks Obtained', 'Maximum Marks', 'Percentage', 'Attendance Status', 'Result', 'Remarks'].map(column => <th key={column}>{column}</th>)}</tr>
                      </thead>
                      <tbody>
                        {selected.students.map((student, index) => (
                          <tr key={student.id}>
                            <td>{index + 1}</td>
                            <td>{student.rollNumber}</td>
                            <td>{student.studentName}</td>
                            <td>{student.marksObtained}</td>
                            <td>{student.maximumMarks}</td>
                            <td>{student.percentage}</td>
                            <td>{student.attendance}</td>
                            <td>{student.result}</td>
                            <td>{student.remarks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState title="Student marks are unavailable" description="No student marks were returned for this submission." />
                )}

                <h3 className="marks-approval-section-title">Approval History</h3>
                {selected.historyLoading ? (
                  <p className="marks-approval-loading" role="status">Loading approval history…</p>
                ) : selected.historyError ? (
                  <p className="marks-approval-history-empty">{selected.historyError}</p>
                ) : detailHistory.length ? (
                  <ol className="marks-approval-history">
                    {detailHistory.map((entry, index) => (
                      <li key={pick(entry, 'historyId') || index}>
                        <span className="marks-approval-history__dot" aria-hidden="true" />
                        <div>
                          <div className="marks-approval-history__head">
                            <strong>{getWorkflowAction(entry)}{entry.markCount > 1 ? ' · ' + entry.markCount + ' marks' : ''}</strong>
                            <time>{dateTimeLabel(pick(entry, 'actionAt'))}</time>
                          </div>
                          <p>{actorLabel(pick(entry, 'actionBy'))}{pick(entry, 'remarks') ? ' · ' + pick(entry, 'remarks') : ''}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="marks-approval-history-empty">No approval history is available from the backend.</p>
                )}
              </ViewDialog>
            )}

            {decision && selected && (
              <DecisionDialog
                key={decision + selected.id}
                kind={decision}
                batch={selected}
                onCancel={() => setDecision('')}
                onConfirm={confirmDecision}
                busy={busy}
              />
            )}
          </>
        )}
      </section>
    </DashboardLayout>
  )
}
