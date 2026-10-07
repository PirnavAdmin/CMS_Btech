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
import studentService from '../../../services/studentService'
import './StudentMarks.css'

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

export default function StudentMarks() {
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

  const studentOptions = useMemo(() => [...students].sort((left, right) => getStudentName(left).localeCompare(getStudentName(right))), [students])
  const selectedStudent = studentOptions.find(student => getStudentId(student) === selectedStudentId)
  const studentRows = useMemo(() => {
    if (!selectedStudent) return []
    return resultSheets.flatMap((sheet, index) => (Array.isArray(sheet.records) ? sheet.records : [])
      .filter(record => matchesStudent(record, selectedStudent))
      .map(record => resultRow(sheet, record, selectedStudent, index)))
  }, [resultSheets, selectedStudent])

  const optionsFor = key => [...new Set(studentRows.map(row => clean(row[key])).filter(Boolean))].sort((left, right) => left.localeCompare(right))
  const filteredRows = useMemo(() => studentRows.filter(row => {
    const search = query.trim().toLowerCase()
    const matchesSearch = !search || `${row.subjectCode} ${row.subjectName} ${row.examType} ${row.assessmentType}`.toLowerCase().includes(search)
    return matchesSearch
      && (!academicYear || row.academicYear === academicYear)
      && (!course || row.course === course)
      && (!branch || row.branch === branch)
      && (!semester || row.semester === semester)
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
            <label><span>Student Name</span><select value={selectedStudentId} onChange={event => selectStudent(event.target.value)} disabled={loading || !studentOptions.length}><option value="">{loading ? 'Loading studentsâ€¦' : 'Select a student'}</option>{studentOptions.map(student => <option key={getStudentId(student)} value={getStudentId(student)}>{getStudentName(student)}{getRegistrationNumber(student) ? ` Â· ${getRegistrationNumber(student)}` : ''}</option>)}</select></label>
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
