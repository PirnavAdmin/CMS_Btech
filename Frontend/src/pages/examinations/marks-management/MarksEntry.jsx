import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  FiAward,
  FiBookOpen,
  FiCheckCircle,
  FiEdit2,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiX,
  FiXCircle,
} from 'react-icons/fi'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import EmptyState from '../../../components/EmptyState'
import ExportMenu from '../../../components/ExportMenu'
import FilterPanel from '../../../components/FilterPanel'
import TablePagination from '../../../components/TablePagination'
import MarksModuleNav from './MarksModuleNav'
import { useAcademic } from '../../../context/AcademicContext'
import facultyService from '../../../services/facultyService'
import studentService from '../../../services/studentService'
import subjectService from '../../../services/subjectService'
import { collegeStorageKey } from '../../../utils/collegeScope'
import './MarksEntry.css'

const columns = [
  { key: 'academicYear', label: 'Academic Year' },
  { key: 'course', label: 'Course' },
  { key: 'branch', label: 'Branch' },
  { key: 'semester', label: 'Semester' },
  { key: 'section', label: 'Section' },
  { key: 'registrationNumber', label: 'Registration Number' },
  { key: 'studentName', label: 'Student Name' },
  { key: 'subjectName', label: 'Subject' },
  { key: 'facultyName', label: 'Faculty Name' },
  { key: 'subjectCode', label: 'Subject Code' },
  { key: 'examType', label: 'Exam Type' },
  { key: 'assessmentType', label: 'Assessment Type' },
  { key: 'examDate', label: 'Exam Date' },
  { key: 'maximumMarks', label: 'Maximum Marks' },
  { key: 'passingMarks', label: 'Passing Marks' },
  { key: 'studentMarks', label: 'Student Marks' },
  { key: 'examStatus', label: 'Exam Status' },
  { key: 'percentage', label: 'Percentage' },
]

const PAGE_SIZE = 10

const initialAssessment = {
  academicYear: '',
  course: '',
  branch: '',
  semester: '',
  section: '',
  registrationNumber: '',
  studentName: '',
  subject: '',
  facultyName: '',
  subjectCode: '',
  examType: '',
  assessmentType: '',
  examDate: '',
  maximumMarks: '',
  passingMarks: '',
  studentMarks: '',
}

const fieldOptions = {
  examType: [
    'End Semester Regular Exam',
    'Supplementary Exam',
    'Improvement Exam',
  ],
  assessmentType: ['Internal', 'External'],
}

const entityLabel = (item, keys) =>
  keys
    .map(key => item?.[key])
    .find(
      value =>
        value !== undefined &&
        value !== null &&
        String(value).trim()
    )

const normalized = value =>
  String(value ?? '').trim().toLowerCase()

const semesterNumber = value =>
  String(value ?? '').match(/\d+/)?.[0] || ''

const uniqueValues = values => {
  const unique = new Map()

  values.forEach(value => {
    const label = String(value ?? '').trim()
    const key = normalized(label)

    if (key && !unique.has(key)) {
      unique.set(key, label)
    }
  })

  return [...unique.values()]
}

const getMarksSummary = ({
  studentMarks,
  maximumMarks,
  passingMarks,
}) => {
  const marks =
    studentMarks === '' || studentMarks == null
      ? NaN
      : Number(studentMarks)

  const maximum =
    maximumMarks === '' || maximumMarks == null
      ? NaN
      : Number(maximumMarks)

  const passing =
    passingMarks === '' || passingMarks == null
      ? NaN
      : Number(passingMarks)

  const percentage =
    Number.isFinite(marks) &&
      Number.isFinite(maximum) &&
      maximum > 0
      ? `${((marks / maximum) * 100).toFixed(2)}%`
      : ''

  const examStatus =
    Number.isFinite(marks) &&
      Number.isFinite(maximum) &&
      maximum > 0 &&
      Number.isFinite(passing) &&
      marks >= 0 &&
      marks <= maximum &&
      passing >= 0 &&
      passing <= maximum
      ? marks >= passing
        ? 'Pass'
        : 'Fail'
      : ''

  return {
    percentage,
    examStatus,
  }
}

const LEGACY_DRAFTS_KEY = collegeStorageKey(
  'marks-entry-assessment-drafts-v1'
)

const DRAFTS_KEY = collegeStorageKey(
  'marks-entry-assessment-drafts-v2'
)

const readDrafts = () => {
  try {
    const value = JSON.parse(
      localStorage.getItem(DRAFTS_KEY) || '[]'
    )

    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export default function MarksEntry() {
  const {
    academicYears = [],
    courses: academicCourses = [],
    branches = [],
    semesters = [],
    sections = [],
  } = useAcademic()

  const [draftRows, setDraftRows] = useState(readDrafts)
  const [subjects, setSubjects] = useState([])
  const [students, setStudents] = useState([])
  const [facultyMembers, setFacultyMembers] = useState([])
  const [activeSuggestion, setActiveSuggestion] = useState('')
  const [query, setQuery] = useState('')

  const [filters, setFilters] = useState({
    academicYear: '',
    course: '',
    branch: '',
    semester: '',
    section: '',
    subject: '',
    examType: '',
    assessmentType: '',
  })

  const [page, setPage] = useState(1)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [deletingRow, setDeletingRow] = useState(null)
  const [assessment, setAssessment] =
    useState(initialAssessment)

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_DRAFTS_KEY)
    } catch {
      // Ignore unavailable storage
    }
  }, [])

  useEffect(() => {
    subjectService
      .getSubjects({ liveOnly: true })
      .then(data =>
        setSubjects(Array.isArray(data) ? data : [])
      )
      .catch(() => setSubjects([]))
  }, [])

  useEffect(() => {
    studentService
      .getAllProfiles()
      .then(data =>
        setStudents(Array.isArray(data) ? data : [])
      )
      .catch(() => setStudents([]))
  }, [])

  useEffect(() => {
    facultyService
      .list()
      .then(data =>
        setFacultyMembers(Array.isArray(data) ? data : [])
      )
      .catch(() => setFacultyMembers([]))
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFTS_KEY,
        JSON.stringify(draftRows)
      )
    } catch {
      // Keep current session drafts if storage is unavailable
    }
  }, [draftRows])

  const allRows = draftRows

  const summaryStats = useMemo(() => {
    const results = allRows.map(row => {
      const summary = getMarksSummary(row)
      const percentage = Number.parseFloat(
        row.percentage || summary.percentage
      )

      return {
        status: row.examStatus || summary.examStatus,
        percentage,
      }
    })
    const scoredRows = results.filter(row =>
      Number.isFinite(row.percentage)
    )
    const passedCount = results.filter(
      row => row.status === 'Pass'
    ).length
    const failedCount = results.filter(
      row => row.status === 'Fail'
    ).length
    const passRate = allRows.length
      ? ((passedCount / allRows.length) * 100).toFixed(1)
      : '0.0'
    const average = scoredRows.length
      ? scoredRows.reduce(
        (total, row) => total + row.percentage,
        0
      ) / scoredRows.length
      : 0

    return [
      {
        label: 'Total Records',
        value: allRows.length,
        detail: 'Submitted marks',
        icon: FiBookOpen,
        tone: 'blue',
      },
      {
        label: 'Passed Students',
        value: passedCount,
        detail: `${passRate}% pass rate`,
        icon: FiCheckCircle,
        tone: 'green',
      },
      {
        label: 'Failed Students',
        value: failedCount,
        detail: 'Needs attention',
        icon: FiXCircle,
        tone: 'red',
      },
      {
        label: 'Average Score',
        value: `${average.toFixed(1)}%`,
        detail: 'Across scored records',
        icon: FiAward,
        tone: 'purple',
      },
    ]
  }, [allRows])

  const academicOptions = useMemo(
    () => ({
      academicYear: academicYears
        .map(item =>
          entityLabel(item, [
            'academicYearName',
            'name',
            'academicYear',
            'yearName',
          ])
        )
        .filter(Boolean),

      course: academicCourses
        .map(item =>
          entityLabel(item, [
            'courseName',
            'name',
            'course',
            'programName',
            'title',
          ])
        )
        .filter(Boolean),

      branch: branches
        .map(item =>
          entityLabel(item, [
            'branchName',
            'name',
            'branch',
            'title',
          ])
        )
        .filter(Boolean),

      semester: semesters
        .map(item =>
          entityLabel(item, [
            'semesterName',
            'name',
            'semesterNumber',
            'semester',
          ])
        )
        .filter(Boolean),

      section: sections
        .map(item =>
          entityLabel(item, [
            'sectionName',
            'name',
            'section',
            'code',
          ])
        )
        .filter(Boolean),

      registrationNumber: students
        .map(
          item =>
            item.registrationNumber ||
            item.application?.registrationNumber ||
            item.application?.number ||
            item.academic?.registrationNumber ||
            item.academic?.rollNumber
        )
        .filter(Boolean),

      studentName: students
        .map(
          item =>
            item.fullName ||
            item.personal?.fullName ||
            item.name ||
            item.studentName
        )
        .filter(Boolean),

      facultyName: facultyMembers
        .map(item =>
          entityLabel(item, [
            'fullName',
            'facultyName',
            'name',
          ])
        )
        .filter(Boolean),

      subject: [],

      subjectCode: [],

      examType: [
        ...fieldOptions.examType,
        ...subjects
          .map(item => item.examType)
          .filter(Boolean),
      ],

      assessmentType: [
        ...fieldOptions.assessmentType,
        ...subjects
          .map(item => item.assessmentType)
          .filter(Boolean),
      ],

      examDate: subjects
        .map(
          item =>
            item.examDate ||
            item.lastExamDate
        )
        .filter(Boolean),

      maximumMarks: subjects
        .flatMap(item => [
          item.internalMarks,
          item.externalMarks,
          item.maximumMarks,
          item.maxMarks,
        ])
        .filter(
          value =>
            value !== '' &&
            value != null
        ),

      passingMarks: subjects
        .flatMap(item => [
          item.passingMarks,
          item.internalPassingMarks,
          item.externalPassingMarks,
          item.minimumPassingMarks,
          item.minPassingMarks,
        ])
        .filter(
          value =>
            value !== '' &&
            value != null
        ),
    }),
    [
      academicYears,
      academicCourses,
      branches,
      semesters,
      sections,
      subjects,
      students,
      facultyMembers,
    ]
  )

  const filterOptions = useMemo(
    () => ({
      academicYear: uniqueValues([
        ...academicOptions.academicYear,
        ...allRows.map(row => row.academicYear),
      ]),

      course: uniqueValues([
        ...academicOptions.course,
        ...allRows.map(row => row.course),
      ]),

      branch: uniqueValues([
        ...academicOptions.branch,
        ...allRows.map(row => row.branch),
      ]),

      semester: uniqueValues([
        ...academicOptions.semester,
        ...allRows.map(row => row.semester),
      ]),

      section: uniqueValues([
        ...academicOptions.section,
        ...allRows.map(row => row.section),
      ]),

      subject: uniqueValues([
        ...subjects.map(item =>
          entityLabel(item, [
            'subjectName',
            'name',
          ])
        ),
        ...allRows.map(
          row =>
            row.subjectName ||
            row.subject
        ),
      ]),

      examType: uniqueValues([
        ...fieldOptions.examType,
        ...subjects.map(
          item => item.examType
        ),
        ...allRows.map(
          row => row.examType
        ),
      ]),

      assessmentType: uniqueValues([
        ...fieldOptions.assessmentType,
        ...subjects.map(
          item => item.assessmentType
        ),
        ...allRows.map(
          row => row.assessmentType
        ),
      ]),
    }),
    [
      academicOptions,
      allRows,
      subjects,
    ]
  )

  const filtered = useMemo(
    () =>
      allRows.filter(row => {
        const searchText = [
          row.studentName,
          row.registrationNumber,
          row.subjectCode,
          row.subjectName || row.subject,
          row.facultyName || row.faculty?.fullName || row.faculty?.facultyName || row.faculty?.name || row.faculty,
          row.examType,
          row.course,
          row.branch,
          row.semester,
          row.section,
          row.academicYear,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        const rowValues = {
          academicYear:
            row.academicYear,

          course: row.course,

          branch: row.branch,

          semester: row.semester,

          section: row.section,

          subject:
            row.subjectName ||
            row.subject,

          examType: row.examType,

          assessmentType:
            row.assessmentType,
        }

        return (
          (!query ||
            searchText.includes(
              query.toLowerCase()
            )) &&
          Object.entries(filters).every(
            ([key, value]) =>
              !value ||
              normalized(
                rowValues[key]
              ) === normalized(value)
          )
        )
      }),
    [
      allRows,
      query,
      filters,
    ]
  )

  const visible = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  )

  const setFilter = (
    key,
    value
  ) => {
    setFilters(current => ({
      ...current,
      [key]: value,
    }))

    setPage(1)
  }

  const clearFilters = () => {
    setQuery('')

    setFilters({
      academicYear: '',
      course: '',
      branch: '',
      semester: '',
      section: '',
      subject: '',
      examType: '',
      assessmentType: '',
    })

    setPage(1)
  }

  const hasFilters = Boolean(
    query ||
    Object.values(filters).some(Boolean)
  )

  const eligibleSubjects = useMemo(
    () =>
      subjects.filter(subject => {
        const selectedBranch =
          branches.find(
            item =>
              normalized(
                entityLabel(item, [
                  'name',
                  'branchName',
                  'branch',
                ])
              ) ===
              normalized(
                assessment.branch
              ) ||
              normalized(item.id) ===
              normalized(
                assessment.branch
              )
          )

        const selectedSemester =
          semesters.find(
            item =>
              normalized(
                entityLabel(item, [
                  'semesterName',
                  'name',
                  'semesterNumber',
                ])
              ) ===
              normalized(
                assessment.semester
              ) ||
              normalized(item.id) ===
              normalized(
                assessment.semester
              ) ||
              semesterNumber(
                entityLabel(item, [
                  'semesterName',
                  'name',
                  'semesterNumber',
                ])
              ) ===
              semesterNumber(
                assessment.semester
              )
          )

        const subjectBranchId =
          subject.branchId ??
          subject.branchID

        const subjectBranchName =
          subject.branchName ||
          (typeof subject.branch ===
            'string'
            ? subject.branch
            : '')

        const subjectSemesterId =
          subject.semesterId ??
          subject.semesterID

        const subjectSemesterName =
          subject.semesterName ||
          (typeof subject.semester ===
            'string'
            ? subject.semester
            : '')

        const branchMatches =
          !assessment.branch ||
          (selectedBranch &&
            subjectBranchId != null
            ? normalized(
              subjectBranchId
            ) ===
            normalized(
              selectedBranch.id ??
              selectedBranch.branchId
            )
            : normalized(
              subjectBranchName
            ) ===
            normalized(
              assessment.branch
            ))

        const semesterMatches =
          !assessment.semester ||
          (selectedSemester &&
            subjectSemesterId != null
            ? normalized(
              subjectSemesterId
            ) ===
            normalized(
              selectedSemester.id ??
              selectedSemester.semesterId
            )
            : semesterNumber(
              subjectSemesterName ||
              subjectSemesterId
            ) ===
            semesterNumber(
              assessment.semester
            ))

        return (
          branchMatches &&
          semesterMatches
        )
      }),
    [
      subjects,
      branches,
      semesters,
      assessment.branch,
      assessment.semester,
    ]
  )

  const suggestionOptions = {
    ...academicOptions,

    subject: eligibleSubjects
      .map(item =>
        entityLabel(item, [
          'subjectName',
          'name',
        ])
      )
      .filter(Boolean),

    subjectCode: eligibleSubjects
      .map(item => item.subjectCode)
      .filter(Boolean),
  }

  const savedAssessmentOptions = useMemo(() => ({
    academicYear: allRows.map(row => row.academicYear),
    course: allRows.map(row => row.course),
    branch: allRows.map(row => row.branch),
    semester: allRows.map(row => row.semester),
    section: allRows.map(row => row.section),
    registrationNumber: allRows.map(row => row.registrationNumber),
    studentName: allRows.map(row => row.studentName),
    subject: allRows.map(row => row.subjectName || row.subject),
    facultyName: allRows.map(row => row.facultyName || row.faculty?.fullName || row.faculty?.facultyName || row.faculty?.name || row.faculty),
    subjectCode: allRows.map(row => row.subjectCode),
    examType: allRows.map(row => row.examType),
    assessmentType: allRows.map(row => row.assessmentType),
    examDate: allRows.map(row => row.examDate),
    maximumMarks: allRows.flatMap(row => [row.maximumMarks, row.maxExternal]),
    passingMarks: allRows.map(row => row.passingMarks),
    studentMarks: allRows.map(row => row.studentMarks),
  }), [allRows])

  const updateAssessment = (
    key,
    value
  ) => {
    const matchedSubject =
      key === 'subject'
        ? eligibleSubjects.find(
          row =>
            normalized(
              row.subjectName ||
              row.subject
            ) ===
            normalized(value)
        )
        : null

    const matchedSavedSubject =
      key === 'subject'
        ? allRows.find(row => {
          const sameSubject = normalized(
            row.subjectName || row.subject
          ) === normalized(value)
          const sameBranch =
            !assessment.branch ||
            normalized(row.branch) === normalized(assessment.branch)
          const sameSemester =
            !assessment.semester ||
            semesterNumber(row.semester) ===
              semesterNumber(assessment.semester)

          return sameSubject && sameBranch && sameSemester
        })
        : null

    const matchedStudent = [
      'registrationNumber',
      'studentName',
    ].includes(key)
      ? students.find(student =>
        normalized(
          key ===
            'registrationNumber'
            ? student.registrationNumber
            : student.fullName ||
            student.personal
              ?.fullName ||
            student.name ||
            student.studentName
        ) === normalized(value)
      )
      : null

    setAssessment(current => ({
      ...current,

      [key]: value,

      ...(key === 'subject'
        ? {
          subjectCode:
            matchedSubject?.subjectCode ||
            matchedSavedSubject?.subjectCode ||
            '',
        }
        : {}),

      ...(key ===
        'registrationNumber' &&
        matchedStudent
        ? {
          studentName:
            matchedStudent.fullName ||
            matchedStudent.personal
              ?.fullName ||
            matchedStudent.name ||
            matchedStudent.studentName ||
            '',
        }
        : {}),

      ...(key === 'studentName' &&
        matchedStudent
        ? {
          registrationNumber:
            matchedStudent.registrationNumber ||
            matchedStudent.application
              ?.registrationNumber ||
            matchedStudent.application
              ?.number ||
            matchedStudent.academic
              ?.registrationNumber ||
            matchedStudent.academic
              ?.rollNumber ||
            '',
        }
        : {}),

      ...(['branch', 'semester'].includes(
        key
      )
        ? {
          subject: '',
          subjectCode: '',
        }
        : {}),
    }))
  }

  const submitAssessment = event => {
    event.preventDefault()

    const {
      percentage,
      examStatus,
    } = getMarksSummary(assessment)

    const record = {
      ...assessment,

      id:
        editingId ||
        `draft-${Date.now()}`,

      subjectName:
        assessment.subject,

      percentage,

      examStatus,

      totalStudents: 0,

      passedCount: 0,

      failedCount: 0,

      status: 'Draft',
    }

    setDraftRows(current =>
      editingId
        ? current.map(row =>
          row.id === editingId
            ? {
              ...row,
              ...record,
            }
            : row
        )
        : [record, ...current]
    )

    setShowAddForm(false)
    setEditingId('')
    setAssessment(initialAssessment)
    setPage(1)
  }

  const editAssessment = row => {
    setEditingId(row.id)

    setAssessment({
      ...initialAssessment,
      ...row,
      subject:
        row.subject ||
        row.subjectName ||
        '',
    })

    setActiveSuggestion('')
    setShowAddForm(true)
  }

  const deleteAssessment = row => {
    setDeletingRow(row)
  }

  const confirmDeleteAssessment = () => {
    if (!deletingRow) return

    const deletedId =
      deletingRow.id

    setDraftRows(current =>
      current.filter(
        item => item.id !== deletedId
      )
    )

    setDeletingRow(null)
    setPage(1)
  }

  return (
    <DashboardLayout>
      <section className="marks-management-marks-entry">
        <PageHeader
          title="Marks Entry"
          breadcrumb={[
            {
              label: 'Marks Management',
              link: '/marks-management',
            },
            'Marks Entry',
          ]}
        />

        <MarksModuleNav />

        <section
          className="marks-entry-summary"
          aria-label="Marks summary"
        >
          {summaryStats.map(
            ({ label, value, detail, icon: Icon, tone }) => (
              <article
                className={`marks-entry-summary__card marks-entry-summary__card--${tone}`}
                key={label}
              >
                <span className="marks-entry-summary__icon">
                  <Icon aria-hidden="true" />
                </span>
                <div className="marks-entry-summary__content">
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>{detail}</small>
                </div>
              </article>
            )
          )}
        </section>

        <article className="erp-card marks-entry-card">
          <header className="erp-card-header marks-entry-card__header">
            <div>
              <h2 className="erp-card-title">
                Marks Records
              </h2>

              <p className="erp-card-subtitle">
                Review and manage submitted marks with compact, high-density records.
              </p>
            </div>
          </header>

          {deletingRow &&
            createPortal(
              <div
                className="marks-entry-delete-backdrop"
                onMouseDown={() =>
                  setDeletingRow(null)
                }
              >
                <section
                  className="marks-entry-delete-modal"
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="marks-entry-delete-title"
                  aria-describedby="marks-entry-delete-description"
                  onMouseDown={event =>
                    event.stopPropagation()
                  }
                >
                  <header className="marks-entry-delete-modal__header">
                    <span className="marks-entry-delete-modal__icon">
                      <FiTrash2 aria-hidden="true" />
                    </span>

                    <div>
                      <h2 id="marks-entry-delete-title">
                        Delete Marks Confirmation
                      </h2>

                      <p>
                        Marks record deletion
                        confirmation.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="marks-entry-delete-modal__close"
                      onClick={() =>
                        setDeletingRow(null)
                      }
                      aria-label="Close confirmation"
                    >
                      <FiX aria-hidden="true" />
                    </button>
                  </header>

                  <div className="marks-entry-delete-modal__body">
                    <div className="marks-entry-delete-record">
                      <span className="marks-entry-delete-record__badge">
                        MARKS
                      </span>

                      <div>
                        <strong>
                          {deletingRow.studentName ||
                            deletingRow.registrationNumber ||
                            'Student marks'}
                        </strong>

                        <p>
                          {[
                            deletingRow.subjectName ||
                            deletingRow.subject,
                            deletingRow.subjectCode,
                            deletingRow.examType,
                            deletingRow.course,
                            deletingRow.branch,
                            deletingRow.section,
                          ]
                            .filter(Boolean)
                            .join(' | ') ||
                            'Marks entry record'}
                        </p>
                      </div>
                    </div>

                    <p
                      id="marks-entry-delete-description"
                      className="marks-entry-delete-modal__message"
                    >
                      Are you sure you want
                      to permanently delete
                      this marks record? This
                      action cannot be undone.
                    </p>
                  </div>

                  <footer className="marks-entry-delete-modal__footer">
                    <button
                      type="button"
                      className="marks-entry-delete-modal__cancel"
                      onClick={() =>
                        setDeletingRow(null)
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="marks-entry-delete-modal__confirm"
                      onClick={
                        confirmDeleteAssessment
                      }
                    >
                      <FiTrash2 aria-hidden="true" />
                      Confirm &amp; Delete Marks
                    </button>
                  </footer>
                </section>
              </div>,
              document.body
            )}

          <FilterPanel
            active={hasFilters}
            onClear={clearFilters}
            className="marks-entry-filters"
            actions={
              <div className="marks-entry-card__actions">
                <ExportMenu
                  rows={filtered}
                  columns={columns}
                  title="Marks Entry Records"
                  filename="marks-entry-records"
                  scope="All matching marks"
                  allowEmpty
                  printLabel="Save as PDF"
                />

                <button
                  type="button"
                  className="erp-btn erp-btn--primary"
                  onClick={() => {
                    setEditingId('')
                    setAssessment(
                      initialAssessment
                    )
                    setShowAddForm(true)
                  }}
                >
                  <FiPlus />
                  Add Marks
                </button>
              </div>
            }
          >
            <div className="marks-entry-search-wrap">
              <label className="marks-entry-search">
                <FiSearch aria-hidden="true" />

                <input
                  aria-label="Search marks records"
                  placeholder="Search student, reg number, subject, exam or class"
                  value={query}
                  onChange={event => {
                    setQuery(
                      event.target.value
                    )
                    setPage(1)
                  }}
                />
              </label>
            </div>

            {[
              [
                'academicYear',
                'Academic Year',
                'All academic years',
              ],
              [
                'course',
                'Course',
                'All courses',
              ],
              [
                'branch',
                'Branch',
                'All branches',
              ],
              [
                'semester',
                'Semester',
                'All semesters',
              ],
              [
                'section',
                'Section',
                'All sections',
              ],
              [
                'subject',
                'Subject',
                'All subjects',
              ],
              [
                'examType',
                'Exam Type',
                'All exam types',
              ],
              [
                'assessmentType',
                'Assessment Type',
                'All assessment types',
              ],
            ].map(
              ([
                key,
                label,
                placeholder,
              ]) => (
                <label
                  className="marks-entry-filter"
                  key={key}
                >
                  <span>{label}</span>

                  <select
                    aria-label={`Filter by ${label}`}
                    value={filters[key]}
                    onChange={event =>
                      setFilter(
                        key,
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      {placeholder}
                    </option>

                    {filterOptions[key].map(
                      value => (
                        <option
                          key={value}
                          value={value}
                        >
                          {value}
                        </option>
                      )
                    )}
                  </select>
                </label>
              )
            )}
          </FilterPanel>

          {showAddForm &&
            createPortal(
              <div
                className={`marks-entry-modal${localStorage.getItem(
                  'pirnav-sidebar-collapsed'
                ) === 'true'
                    ? ' sidebar-collapsed'
                    : ''
                  }`}
                onMouseDown={() =>
                  setShowAddForm(false)
                }
              >
                <form
                  className="marks-entry-form"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="marks-entry-form-title"
                  onMouseDown={event =>
                    event.stopPropagation()
                  }
                  onSubmit={
                    submitAssessment
                  }
                >
                  <div className="marks-entry-form__heading">
                    <div>
                      <h3 id="marks-entry-form-title">
                        {editingId
                          ? 'Edit Marks Assessment'
                          : 'Add Marks Assessment'}
                      </h3>

                      <p>
                        Enter the assessment
                        details. Existing
                        values are available
                        as suggestions.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="marks-entry-form__close"
                      onClick={() => {
                        setShowAddForm(false)
                        setEditingId('')
                      }}
                      aria-label="Close form"
                    >
                      &times;
                    </button>
                  </div>

                  <div className="marks-entry-form__body">
                    <div className="marks-entry-form__grid">
                      {[
                        [
                          'academicYear',
                          'Academic Year',
                        ],
                        [
                          'course',
                          'Course',
                        ],
                        [
                          'branch',
                          'Branch',
                        ],
                        [
                          'semester',
                          'Semester',
                        ],
                        [
                          'section',
                          'Section',
                        ],
                        [
                          'registrationNumber',
                          'Registration Number',
                        ],
                        [
                          'studentName',
                          'Student Name',
                        ],
                        [
                          'subject',
                          'Subject',
                        ],
                        [
                          'facultyName',
                          'Faculty Name',
                        ],
                        [
                          'subjectCode',
                          'Subject Code',
                        ],
                        [
                          'examType',
                          'Exam Type',
                        ],
                        [
                          'assessmentType',
                          'Assessment Type',
                        ],
                        [
                          'examDate',
                          'Exam Date',
                        ],
                        [
                          'maximumMarks',
                          'Maximum Marks',
                        ],
                        [
                          'passingMarks',
                          'Passing Marks',
                        ],
                        [
                          'studentMarks',
                          'Student Marks',
                        ],
                        [
                          'examStatus',
                          'Exam Status',
                        ],
                        [
                          'percentage',
                          'Percentage',
                        ],
                      ].map(
                        ([key, label]) => {
                          const suggestions =
                            uniqueValues([
                              ...(fieldOptions[
                                key
                              ] || []),
                              ...(suggestionOptions[
                                key
                              ] || []),
                              ...(savedAssessmentOptions[
                                key
                              ] || []),
                            ])

                          const matches =
                            suggestions.filter(
                              value =>
                                !assessment[
                                key
                                ] ||
                                normalized(
                                  value
                                ).includes(
                                  normalized(
                                    assessment[
                                    key
                                    ]
                                  )
                                )
                            )

                          const summary =
                            getMarksSummary(
                              assessment
                            )

                          const isDerived =
                            key ===
                            'examStatus' ||
                            key ===
                            'percentage'

                          const fieldValue =
                            key ===
                              'examStatus'
                              ? summary.examStatus
                              : key ===
                                'percentage'
                                ? summary.percentage
                                : assessment[
                                key
                                ]

                          return (
                            <label
                              className="marks-entry-form__field"
                              key={key}
                            >
                              <span>
                                {label}
                              </span>

                              <div
                                className={`marks-entry-input-combo${key ===
                                    'examDate'
                                    ? ' marks-entry-input-combo--datetime'
                                    : ''
                                  }`}
                              >
                                <input
                                  type={
                                    [
                                      'maximumMarks',
                                      'passingMarks',
                                      'studentMarks',
                                    ].includes(
                                      key
                                    )
                                      ? 'number'
                                      : key ===
                                        'examDate'
                                        ? 'datetime-local'
                                        : 'text'
                                  }
                                  value={
                                    fieldValue ??
                                    ''
                                  }
                                  min={
                                    key ===
                                      'maximumMarks'
                                      ? 1
                                      : [
                                        'passingMarks',
                                        'studentMarks',
                                      ].includes(
                                        key
                                      )
                                        ? 0
                                        : undefined
                                  }
                                  max={
                                    key ===
                                      'passingMarks' ||
                                      key ===
                                      'studentMarks'
                                      ? assessment.maximumMarks ||
                                      undefined
                                      : undefined
                                  }
                                  step={
                                    [
                                      'maximumMarks',
                                      'passingMarks',
                                      'studentMarks',
                                    ].includes(
                                      key
                                    )
                                      ? 'any'
                                      : undefined
                                  }
                                  readOnly={
                                    isDerived
                                  }
                                  required={
                                    !isDerived
                                  }
                                  autoComplete="off"
                                  role={
                                    isDerived
                                      ? undefined
                                      : 'combobox'
                                  }
                                  aria-autocomplete={
                                    isDerived
                                      ? undefined
                                      : 'list'
                                  }
                                  aria-expanded={
                                    !isDerived &&
                                    activeSuggestion ===
                                    key &&
                                    matches.length >
                                    0
                                  }
                                  onFocus={() =>
                                    !isDerived &&
                                    setActiveSuggestion(
                                      key
                                    )
                                  }
                                  onClick={() =>
                                    !isDerived &&
                                    setActiveSuggestion(
                                      key
                                    )
                                  }
                                  onBlur={() =>
                                    window.setTimeout(
                                      () =>
                                        setActiveSuggestion(
                                          current =>
                                            current ===
                                              key
                                              ? ''
                                              : current
                                        ),
                                      120
                                    )
                                  }
                                  onChange={event => {
                                    updateAssessment(
                                      key,
                                      event.target
                                        .value
                                    )
                                    setActiveSuggestion(
                                      key
                                    )
                                  }}
                                />

                                {!isDerived &&
                                  activeSuggestion ===
                                  key &&
                                  matches.length >
                                  0 && (
                                    <div
                                      className="marks-entry-suggestions"
                                      role="listbox"
                                    >
                                      {matches.map(
                                        value => (
                                          <button
                                            type="button"
                                            role="option"
                                            key={value}
                                            onMouseDown={event =>
                                              event.preventDefault()
                                            }
                                            onClick={() => {
                                              updateAssessment(
                                                key,
                                                String(
                                                  value
                                                )
                                              )
                                              setActiveSuggestion(
                                                ''
                                              )
                                            }}
                                          >
                                            {value}
                                          </button>
                                        )
                                      )}
                                    </div>
                                  )}
                              </div>
                            </label>
                          )
                        }
                      )}
                    </div>

                    <aside className="marks-entry-form__preview">
                      <div className="marks-entry-form__preview-head">
                        <span className="marks-entry-live-dot" />

                        Live Preview

                        <small>
                          Updates as you type
                        </small>
                      </div>

                      <h4>
                        {assessment.subject ||
                          'New Assessment'}
                      </h4>

                      <dl>
                        {[
                          [
                            'Academic Year',
                            assessment.academicYear,
                          ],
                          [
                            'Course / Branch',
                            [
                              assessment.course,
                              assessment.branch,
                            ]
                              .filter(Boolean)
                              .join(' / '),
                          ],
                          [
                            'Semester',
                            assessment.semester,
                          ],
                          [
                            'Section',
                            assessment.section,
                          ],
                          [
                            'Registration Number',
                            assessment.registrationNumber,
                          ],
                          [
                            'Student Name',
                            assessment.studentName,
                          ],
                          [
                            'Faculty Name',
                            assessment.facultyName,
                          ],
                          [
                            'Subject Code',
                            assessment.subjectCode,
                          ],
                          [
                            'Exam',
                            assessment.examType,
                          ],
                          [
                            'Assessment',
                            assessment.assessmentType,
                          ],
                          [
                            'Exam Date',
                            assessment.examDate,
                          ],
                          [
                            'Maximum / Passing',
                            `${assessment.maximumMarks} / ${assessment.passingMarks}`,
                          ],
                        ].map(
                          ([label, value]) => (
                            <div key={label}>
                              <dt>{label}</dt>
                              <dd>
                                {value || '—'}
                              </dd>
                            </div>
                          )
                        )}
                      </dl>
                    </aside>
                  </div>

                  <div className="marks-entry-form__footer">
                    <button
                      type="submit"
                      className="erp-btn erp-btn--primary"
                    >
                      {editingId
                        ? 'Save Changes'
                        : 'Confirm'}
                    </button>
                  </div>
                </form>
              </div>,
              document.body
            )}

          <div className="marks-entry-table-wrap">
            <table className="erp-table marks-entry-records-table">
              <colgroup>
                <col className="marks-entry-col-student" />
                <col className="marks-entry-col-academic" />
                <col className="marks-entry-col-subject" />
                <col className="marks-entry-col-faculty" />
                <col className="marks-entry-col-exam" />
                <col className="marks-entry-col-score" />
                <col className="marks-entry-col-result" />
                <col className="marks-entry-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  {[
                    'Student Details',
                    'Class & Academic',
                    'Subject',
                    'Faculty Name',
                    'Exam & Assessment',
                    'Marks Scored',
                    'Result & %',
                    'Actions',
                  ].map(label => (
                    <th key={label}>
                      {label}
                    </th>
                  ))}

                </tr>
              </thead>

              <tbody>
                {visible.map((row, index) => {
                  const summary = getMarksSummary(row)
                  const result = row.examStatus || summary.examStatus
                  const resultClass = result === 'Pass'
                    ? 'is-pass'
                    : result === 'Fail'
                      ? 'is-fail'
                      : 'is-pending'
                  const percentage = row.percentage || summary.percentage
                  const studentName = row.studentName || row.registrationNumber || 'Student'
                  const score = row.studentMarks !== '' && row.studentMarks != null
                    ? row.studentMarks
                    : '—'
                  const maximum = row.maximumMarks || row.maxExternal || '—'
                  const examDate = row.examDate
                    ? String(row.examDate).replace('T', ' ').slice(0, 16)
                    : ''

                  return (
                    <tr key={row.id || row.registrationNumber || index}>
                      <td className="marks-entry-student-cell">
                        <div className="marks-entry-student-layout">
                          <span className="marks-entry-student-avatar" aria-hidden="true">
                            {studentName.trim().charAt(0).toUpperCase()}
                          </span>
                          <span className="marks-entry-student-copy">
                            <strong>{studentName}</strong>
                            <small>{row.registrationNumber || '—'}</small>
                          </span>
                        </div>
                      </td>

                      <td
                        className="marks-entry-academic-cell"
                        title={[
                          ['Course', row.course],
                          ['Branch', row.branch],
                          ['Semester', row.semester],
                          ['Section', row.section],
                          ['Academic Year', row.academicYear],
                        ]
                          .filter(([, value]) => value)
                          .map(([label, value]) => `${label}: ${value}`)
                          .join('\n') || 'Academic details unavailable'}
                      >
                        <div className="marks-entry-academic-copy">
                          <strong>{[row.course, row.branch].filter(Boolean).join(' · ') || '—'}</strong>
                          <span>
                            {[row.semester, row.section].filter(Boolean).join(' · ')}
                            {[row.semester, row.section].some(Boolean) && row.academicYear ? '  ' : ''}
                            {row.academicYear}
                          </span>
                          <div className="marks-entry-academic-lines">
                            {[
                              ['Course', row.course],
                              ['Branch', row.branch],
                              [
                                'Academic details',
                                [row.semester, row.section, row.academicYear]
                                  .filter(Boolean)
                                  .join(' · '),
                              ],
                            ].map(([label, value]) => (
                            <span key={label}>{value || '—'}</span>
                            ))}
                          </div>
                        </div>
                      </td>

                      <td className="marks-entry-subject-cell">
                        <div className="marks-entry-subject-copy">
                          <strong>{row.subjectName || row.subject || '—'}</strong>
                          {row.subjectCode && <span>{row.subjectCode}</span>}
                        </div>
                      </td>

                      <td className="marks-entry-faculty-cell">
                        <strong>{row.facultyName || row.faculty?.fullName || row.faculty?.facultyName || row.faculty?.name || row.faculty || '—'}</strong>
                      </td>

                      <td className="marks-entry-exam-cell">
                        <div className="marks-entry-exam-copy">
                          <span className="marks-entry-exam-pill">{row.examType || 'Exam not set'}</span>
                          {row.assessmentType && (
                            <span className="marks-entry-assessment-pill">{row.assessmentType}</span>
                          )}
                          {examDate && <small>{examDate}</small>}
                        </div>
                      </td>

                      <td className="marks-entry-score-cell">
                        <div className="marks-entry-score-copy">
                          <strong>{score}</strong>
                          <span>/ {maximum}</span>
                          {row.passingMarks != null && row.passingMarks !== '' && (
                            <small>Min: {row.passingMarks}</small>
                          )}
                        </div>
                      </td>

                      <td className="marks-entry-result-cell">
                        <div className="marks-entry-result-copy">
                          <span className={'marks-entry-result-pill ' + resultClass}>
                            <i aria-hidden="true" />
                            {result || 'Pending'}
                          </span>
                          {percentage && <strong>{percentage}</strong>}
                        </div>
                      </td>

                      <td className="marks-entry-actions-cell">
                        <div className="marks-entry-row-actions">
                          <button
                            type="button"
                            className="table-action-btn marks-entry-row-action marks-entry-row-action--edit"
                            title="Edit marks"
                            aria-label={'Edit marks for ' + studentName}
                            onClick={() => editAssessment(row)}
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="table-action-btn marks-entry-row-action marks-entry-row-action--delete"
                            title="Delete marks"
                            aria-label={'Delete marks for ' + studentName}
                            onClick={() => deleteAssessment(row)}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <EmptyState
                title={
                  hasFilters
                    ? 'No matching marks records'
                    : 'No marks have been entered yet'
                }
                description={
                  hasFilters
                    ? 'Adjust or clear the filters to see more records.'
                    : 'Add marks to create the first result sheet.'
                }
              />
            )}
          </div>

          {filtered.length > PAGE_SIZE && (
            <TablePagination
              currentPage={page}
              totalPages={Math.ceil(
                filtered.length / PAGE_SIZE
              )}
              onPageChange={setPage}
            />
          )}
        </article>
      </section>
    </DashboardLayout>
  )
}
