import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import PageHeader from '../../components/PageHeader'
import { ProjectSelect } from '../../components/SearchableSelect'
import ViewDialog from '../../components/ViewDialog'
import CompactSummary from '../../components/CompactSummary'
import FilterPanel from '../../components/FilterPanel'
import ExportMenu from '../../components/ExportMenu'
import { FiAlertCircle, FiBookOpen, FiChevronLeft, FiChevronRight, FiClipboard, FiEdit2, FiEye, FiMapPin, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi'
import { useAcademic } from '../../context/AcademicContext'
import { useScreenAccess } from '../../auth/ScreenAccess'
import { call, list, record, requireId, rows, unwrap, dateOnly } from '../../services/scopedModulesService'
import { predefinedExamTypes, ensureExamTypeId } from '../../services/examinationWorkspaceService'
import { showSuccess } from '../../utils/toast'
import './UnifiedExamManagement.css'

const emptySubject = () => ({ key: crypto.randomUUID(), subjectId: '', faculty: '', maximumMarks: 100, passingMarks: 40, examDate: '', startTime: '', endTime: '', duration: '' })
const day = () => new Date().toISOString().slice(0, 10)
const examStatusLabel = exam => {
  const value = exam?.status
  if (value === true || value === 1 || value === '1') return 'Active'
  if (value === false || value === 0 || value === '0' || value == null || value === '') return 'Draft'
  const normalized = String(value).toLowerCase()
  return ({ active: 'Active', scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled', canceled: 'Cancelled', draft: 'Draft', published: 'Published' })[normalized] || String(value)
}

export default function UnifiedExamManagement() {
  const academic = useAcademic()
  const { canAction } = useScreenAccess()
  const canCreate = canAction('/examination-setup/examination-list', 'create')
  const canEdit = canAction('/examination-setup/examination-list', 'edit')
  const canDelete = canAction('/examination-setup/examination-list', 'delete')
  const [lookups, setLookups] = useState({ examTypes: [], courses: [], branches: [], semesters: [], sections: [], subjects: [], classrooms: [], academicYears: [] })
  const [exams, setExams] = useState([])
  const [schedules, setSchedules] = useState([])
  const [allocations, setAllocations] = useState([])
  const [roomExamAllocations, setRoomExamAllocations] = useState([])
  const [roomBuildings, setRoomBuildings] = useState([])
  const [roomAvailability, setRoomAvailability] = useState([])
  const [roomAvailabilityLoading, setRoomAvailabilityLoading] = useState(false)
  const [faculty, setFaculty] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [showExamForm, setShowExamForm] = useState(false)
  const [editingExam, setEditingExam] = useState(null)
  const [removedScheduleIds, setRemovedScheduleIds] = useState([])
  const [viewingExam, setViewingExam] = useState(null)
  const [confirmCreate, setConfirmCreate] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [relatedLoadErrors, setRelatedLoadErrors] = useState([])
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [examTypeFilter, setExamTypeFilter] = useState('all')
  const [academicYearFilter, setAcademicYearFilter] = useState('all')
  const [filterDraft, setFilterDraft] = useState({ examType: 'all', academicYear: 'all', status: 'all' })
  const [examPage, setExamPage] = useState(1)
  const [draft, setDraft] = useState(() => initialDraft(academic))
  const [subjects, setSubjects] = useState([])
  const [editingSubject, setEditingSubject] = useState(null)
  const [roomExam, setRoomExam] = useState(null)
  const [roomForm, setRoomForm] = useState({ scheduleId: '', buildingId: '', classroomId: '', students: '', invigilatorFacultyId: '' })
  const [editingAllocation, setEditingAllocation] = useState(null)
  const [roomError, setRoomError] = useState('')
  const [roomNotice, setRoomNotice] = useState('')
  const [roomSaving, setRoomSaving] = useState(false)

  const reload = useCallback(async () => {
    if (!academic.selectedCollegeId) { setLoading(false); setLoadError('Select a college to load examination records.'); return }
    setLoading(true)
    setRelatedLoadErrors([])
    const relatedFailures = []
    const related = async (label, load, fallback) => {
      try { return await load() } catch (error) {
        console.error('[Exam Management] Related request failed', { resource: label, requestPath: error.requestPath, status: error.status, message: error.message })
        relatedFailures.push(label)
        return fallback
      }
    }
    let requestStage = 'examination lookups, examinations, and examination types'
    let collegeId = academic.selectedCollegeId
    let academicYearId = academic.selectedAcademicYearId || undefined
    try {
      collegeId = requireId(academic.selectedCollegeId, 'college')
      academicYearId = academic.selectedAcademicYearId ? requireId(academic.selectedAcademicYearId, 'academic year') : undefined
      const [lookupResponse, examRows, typeRows] = await Promise.all([
        related('Academic lookups', () => call('exams/lookups', { query: { collegeId, academicYearId } }), { data: {} }),
        list('exams', { collegeId, academicYearId }),
        related('Examination types', () => list('exam-types', { collegeId }), []),
      ])
      const lookupData = record(unwrap(lookupResponse) || {})
      const examTypes = typeRows.map(record)
      setLookups({ ...lookupData, examTypes, courses: (lookupData.courses || []).map(record), branches: (lookupData.branches || []).map(record), semesters: (lookupData.semesters || []).map(record), sections: (lookupData.sections || []).map(record), subjects: (lookupData.subjects || []).map(record), classrooms: (lookupData.classrooms || []).map(record), academicYears: (lookupData.academicYears || []).map(record) })
      const normalizedExams = examRows.map(record)
      setExams(normalizedExams)
      // Load each examination's saved timetable from the same existing child
      // endpoint used when schedules are created. The global schedule view
      // does not consistently include the parent exam ID, so filtering it by
      // examId could hide valid subjects and disable the Allocate Rooms action.
      const subjectLookup = (lookupData.subjects || []).map(record)
      requestStage = 'saved subject timetables'
      const scheduleGroups = await Promise.all(normalizedExams.map(async exam => {
        const examId = exam.examId ?? exam.id
        if (!examId) return []
        const examSchedules = await related('Subject timetable for ' + (exam.examName || examId), () => list(`exams/${requireId(examId, 'examination')}/schedules`, { collegeId }), [])
        return examSchedules.map(schedule => {
          const scheduleId = schedule.scheduleId ?? schedule.examScheduleId ?? schedule.id
          const subjectId = schedule.subjectId ?? schedule.subject?.subjectId ?? schedule.subject?.id
          const subject = subjectLookup.find(item => String(item.subjectId ?? item.id) === String(subjectId))
          return {
            ...schedule,
            scheduleId,
            examScheduleId: schedule.examScheduleId ?? scheduleId,
            examId: schedule.examId ?? schedule.examinationId ?? examId,
            subjectName: schedule.subjectName || schedule.subject?.subjectName || schedule.subject?.name || subject?.subjectName || subject?.name || 'Subject',
            subjectCode: schedule.subjectCode || schedule.subject?.subjectCode || schedule.subject?.code || subject?.subjectCode || subject?.code || '',
            examDate: schedule.examDate ?? schedule.scheduledDate ?? schedule.date,
            startTime: schedule.startTime ?? schedule.examStartTime ?? '',
            endTime: schedule.endTime ?? schedule.examEndTime ?? '',
          }
        })
      }))
      setSchedules(scheduleGroups.flat())
      requestStage = 'room allocation records'
      const hallRows = await related('Room allocations', () => list('exam-schedules/hall-allocations', { collegeId }), [])
      setAllocations(hallRows.map(record))
      const facultyRows = await related('Faculty directory', async () => {
        const facultyRows = []
        let facultyPage = 1
        let facultyPageCount = 1
        do {
          requestStage = `faculty directory (page ${facultyPage})`
          const facultyResponse = await call('faculty', { query: { collegeId, status: 1, pageNumber: facultyPage, pageSize: 100 } })
          facultyRows.push(...rows(facultyResponse))
          facultyPageCount = Number(facultyResponse?.pagination?.totalPages || 1)
          facultyPage += 1
        } while (facultyPage <= facultyPageCount)
        return facultyRows
        }, [])
      setFaculty(facultyRows.map(record))
      setRelatedLoadErrors(relatedFailures)
      setLoadError('')
      if (!draft.academicYearId && academicYearId) setDraft(value => ({ ...value, academicYearId: String(academicYearId) }))
    } catch (requestError) {
      const message = requestError?.backendMessage || requestError?.message || String(requestError || 'Unknown request error')
      console.error('[Exam Management] Data request failed', { stage: requestStage, requestPath: requestError?.requestPath || null, collegeId, academicYearId, status: requestError?.status ?? requestError?.response?.status, backendMessage: requestError?.backendMessage || null, correlationId: requestError?.correlationId || null, validationErrors: requestError?.validationErrors || null, response: requestError?.response?.data ?? requestError?.data ?? null, error: requestError })
      setLoadError(`${requestError?.requestPath ? `${requestError.requestPath} failed. ` : `Unable to load ${requestStage}. `}${message}`)
    }
    finally { setLoading(false) }
  }, [academic.selectedCollegeId, academic.selectedAcademicYearId])

  useEffect(() => { reload() }, [reload])
  useEffect(() => { setDraft(value => ({ ...value, academicYearId: academic.selectedAcademicYearId ? String(academic.selectedAcademicYearId) : '' })) }, [academic.selectedAcademicYearId])

  const loadExamAllocations = useCallback(async examId => {
    if (!examId) { setRoomExamAllocations([]); return [] }
    const allocationRows = (await list(`exam-schedules/examinations/${examId}/hall-allocations`)).map(allocation => ({
      ...allocation,
      examScheduleId: allocation.examScheduleId ?? allocation.scheduleId,
      classroomId: allocation.classroomId ?? allocation.roomId,
      examDate: allocation.examDate ?? allocation.schedule?.examDate,
      startTime: allocation.startTime ?? allocation.schedule?.startTime,
      endTime: allocation.endTime ?? allocation.schedule?.endTime,
      buildingName: allocation.buildingName || allocation.building?.buildingName || allocation.building?.name,
      roomNumber: allocation.roomNumber || allocation.classroomNumber || allocation.classroom?.roomNumber || allocation.roomCode,
      classroomName: allocation.classroomName || allocation.roomName || allocation.classroom?.roomName || allocation.classroom?.name,
      classroomCapacity: allocation.classroomCapacity ?? allocation.roomCapacity ?? allocation.capacity ?? allocation.classroom?.capacity,
      allocatedStudents: allocation.allocatedStudents ?? allocation.studentCount,
      invigilatorName: allocation.invigilatorName || allocation.facultyName || allocation.invigilator?.fullName || allocation.invigilator?.name,
    }))
    setRoomExamAllocations(allocationRows)
    return allocationRows
  }, [])

  useEffect(() => {
    let current = true
    if (!roomExam?.examId) { setRoomExamAllocations([]); return undefined }
    loadExamAllocations(roomExam.examId).catch(requestError => {
      if (current) setRoomError(requestError.message || 'Unable to load saved room allocations.')
    })
    list('exam-schedules/buildings').then(buildings => {
      if (current) setRoomBuildings(buildings.map(building => ({
        ...building,
        buildingId: building.buildingId ?? building.id,
        buildingName: building.buildingName || building.name || building.blockName || building.buildingCode || 'Building',
      })))
    }).catch(requestError => {
      if (current) setRoomError(requestError.message || 'Unable to load buildings from the Room Master.')
    })
    return () => { current = false }
  }, [roomExam?.examId, loadExamAllocations])

  useEffect(() => {
    let current = true
    if (!roomExam?.examId || !roomForm.scheduleId) { setRoomAvailability([]); setRoomAvailabilityLoading(false); return undefined }
    setRoomAvailabilityLoading(true)
    call('exam-schedules/available-rooms', { query: {
      examScheduleId: roomForm.scheduleId,
      buildingId: roomForm.buildingId || undefined,
      excludeAllocationId: editingAllocation?.examHallAllocationId,
    } }).then(response => {
      if (current) setRoomAvailability(rows(response).map(room => {
        const availableValue = room.isAvailable ?? room.available ?? room.roomAvailable
        const availabilityLabel = String(room.roomStatus ?? room.status ?? '').toLowerCase()
        return {
          ...room,
          classroomId: room.classroomId ?? room.roomId ?? room.id,
          roomName: room.roomName || room.classroomName || room.name || room.roomNumber || 'Room',
          roomNumber: room.roomNumber || room.classroomNumber || room.roomCode || '',
          capacity: room.capacity ?? room.roomCapacity ?? room.classroomCapacity,
          isAvailable: availableValue != null
            ? availableValue === true || availableValue === 1 || String(availableValue).toLowerCase() === 'true' || String(availableValue) === '1'
            : ['available', 'free', 'vacant'].includes(availabilityLabel),
        }
      }))
    }).catch(requestError => {
      if (current) {
        setRoomAvailability([])
        setRoomError(requestError.message || 'Unable to check room availability.')
      }
    }).finally(() => { if (current) setRoomAvailabilityLoading(false) })
    return () => { current = false }
  }, [roomExam?.examId, roomForm.scheduleId, roomForm.buildingId, editingAllocation?.examHallAllocationId])

  const filteredExams = useMemo(() => exams.filter(exam => {
    const matchesQuery = `${exam.examName} ${exam.examCode} ${exam.branchName || ''} ${exam.semesterName || ''}`.toLowerCase().includes(query.toLowerCase())
    const matchesStatus = statusFilter === 'all' || examStatusLabel(exam).toLowerCase() === statusFilter
    const matchesType = examTypeFilter === 'all' || String(exam.examTypeId) === examTypeFilter
    const matchesYear = academicYearFilter === 'all' || String(exam.academicYearId) === academicYearFilter
    return matchesQuery && matchesStatus && matchesType && matchesYear
  }), [exams, query, statusFilter, examTypeFilter, academicYearFilter])
  const examPageSize = 8
  const examPageCount = Math.max(1, Math.ceil(filteredExams.length / examPageSize))
  const visibleExams = filteredExams.slice((examPage - 1) * examPageSize, examPage * examPageSize)
  const upcoming = exams.filter(exam => dateOnly(exam.startDate) >= day()).length
  const roomCount = allocations.filter(row => row.status !== false && row.status !== 0).length
  const appliedFilterCount = [statusFilter, examTypeFilter, academicYearFilter].filter(value => value !== 'all').length
  const summaryValue = value => loadError ? '—' : loading ? '…' : value
  const examExportColumns = [
    { label: 'Exam Name', value: row => row.examName },
    { label: 'Exam Code', value: row => row.examCode },
    { label: 'Department', value: row => row.branchName || '' },
    { label: 'Semester', value: row => row.semesterName || '' },
    { label: 'Subjects', value: row => schedules.filter(schedule => String(schedule.examId) === String(row.examId)).length },
    { label: 'Start Date', value: row => dateOnly(row.startDate) },
    { label: 'End Date', value: row => dateOnly(row.endDate) },
    { label: 'Status', value: row => examStatusLabel(row) },
  ]
  const examinationSummary = [
    { label: 'Total Examinations', value: summaryValue(exams.length) },
    { label: 'Upcoming Examinations', value: summaryValue(upcoming), tone: 'upcoming' },
    { label: 'Subjects Scheduled', value: summaryValue(schedules.length) },
    { label: 'Rooms Allocated', value: summaryValue(roomCount), tone: 'active' },
  ]
  const examSubjects = schedules.filter(row => String(row.examId ?? row.examinationId) === String(roomExam?.examId ?? roomExam?.id))
  const selectedRoomSchedule = examSubjects.find(row => String(row.scheduleId ?? row.examScheduleId) === String(roomForm.scheduleId))
  const roomAllocations = roomExamAllocations
  const availableRooms = roomAvailability.filter(room => room.isAvailable)
  const occupiedRooms = roomAvailability.filter(room => !room.isAvailable)
  const filteredBranches = lookups.branches.filter(row => !draft.courseId || String(row.courseId) === String(draft.courseId))
  const filteredSemesters = lookups.semesters.filter(row => (!draft.courseId || !row.courseId || String(row.courseId) === String(draft.courseId)) && (!draft.branchId || !row.branchId || String(row.branchId) === String(draft.branchId)))
  const filteredSections = lookups.sections.filter(row => (!draft.courseId || !row.courseId || String(row.courseId) === String(draft.courseId)) && (!draft.branchId || !row.branchId || String(row.branchId) === String(draft.branchId)) && (!draft.semesterId || !row.semesterId || String(row.semesterId) === String(draft.semesterId)))
  const filteredSubjects = lookups.subjects.filter(row => (!draft.courseId || !row.courseId || String(row.courseId) === String(draft.courseId)) && (!draft.branchId || !row.branchId || String(row.branchId) === String(draft.branchId)) && (!draft.semesterId || !row.semesterId || String(row.semesterId) === String(draft.semesterId)))
  const examTypeOptions = [
    ...predefinedExamTypes.filter(name => name !== 'Others').map(name => {
      const found = lookups.examTypes.find(row => String(row.name || '').trim().toLowerCase() === name.toLowerCase())
      return { value: found ? String(found.examTypeId ?? found.id) : `__predefined__:${name}`, label: name }
    }),
    ...lookups.examTypes.filter(row => !predefinedExamTypes.some(name => name.toLowerCase() === String(row.name || '').trim().toLowerCase())).map(row => ({ value: String(row.examTypeId ?? row.id), label: row.name })),
    { value: '__others__', label: 'Others' },
  ]

  useEffect(() => { setExamPage(1) }, [query, statusFilter, examTypeFilter, academicYearFilter])

  function applyFilters() {
    setStatusFilter(filterDraft.status)
    setExamTypeFilter(filterDraft.examType)
    setAcademicYearFilter(filterDraft.academicYear)
  }

  function clearFilters() {
    const cleared = { status: 'all', examType: 'all', academicYear: 'all' }
    setQuery('')
    setFilterDraft(cleared)
    setStatusFilter(cleared.status)
    setExamTypeFilter(cleared.examType)
    setAcademicYearFilter(cleared.academicYear)
  }

  function openNewExam() {
    setEditingExam(null)
    setRemovedScheduleIds([])
    setDraft(initialDraft(academic))
    setSubjects([])
    setEditingSubject(null)
    setFieldErrors({})
    setError('')
    setConfirmError('')
    setConfirmCreate(false)
    setShowExamForm(true)
  }

  function openEditExam(exam) {
    const savedSchedules = schedules.filter(row => String(row.examId ?? row.examinationId) === String(exam.examId))
    setEditingExam(exam)
    setRemovedScheduleIds([])
    setDraft({
      ...initialDraft(academic),
      examName: exam.examName || '',
      examCode: exam.examCode || '',
      academicYearId: String(exam.academicYearId ?? ''),
      examTypeId: String(exam.examTypeId ?? ''),
      courseId: String(exam.courseId ?? ''),
      branchId: String(exam.branchId ?? ''),
      year: String(exam.year ?? ''),
      semesterId: String(exam.semesterId ?? ''),
      sectionId: String(exam.sectionId ?? ''),
      startDate: dateOnly(exam.startDate),
      endDate: dateOnly(exam.endDate),
    })
    setSubjects(savedSchedules.map(row => ({
      key: String(row.scheduleId ?? row.examScheduleId),
      scheduleId: row.scheduleId ?? row.examScheduleId,
      subjectId: String(row.subjectId ?? ''),
      subjectName: row.subjectName || '',
      subjectCode: row.subjectCode || '',
      faculty: String(row.instructions || '').replace(/^Faculty:\s*/i, ''),
      maximumMarks: row.maximumMarks ?? 100,
      passingMarks: row.passingMarks ?? 40,
      examDate: dateOnly(row.examDate),
      startTime: row.startTime || '',
      endTime: row.endTime || '',
      duration: row.duration ?? '',
    })))
    setFieldErrors({})
    setError('')
    setConfirmError('')
    setConfirmCreate(false)
    setShowExamForm(true)
  }

  function setDetail(key, value) {
    setDraft(current => ({ ...current, [key]: value, ...(key === 'courseId' ? { branchId: '', semesterId: '', sectionId: '' } : {}), ...(key === 'branchId' ? { semesterId: '', sectionId: '' } : {}), ...(key === 'semesterId' ? { sectionId: '' } : {}) }))
    setFieldErrors(current => {
      const next = { ...current }
      delete next[key]
      if (key === 'startDate' || key === 'endDate') { delete next.startDate; delete next.endDate }
      if (key === 'courseId') { delete next.branchId; delete next.semesterId; delete next.sectionId }
      if (key === 'branchId') { delete next.semesterId; delete next.sectionId }
      if (key === 'semesterId') delete next.sectionId
      return next
    })
    setConfirmError('')
    if (['courseId', 'branchId', 'semesterId'].includes(key)) {
      setRemovedScheduleIds(ids => [...new Set([...ids, ...subjects.map(subject => subject.scheduleId).filter(Boolean)])])
      setSubjects([])
    }
  }
  function openSubject(subject = emptySubject()) { setEditingSubject({ ...subject, key: subject.key || crypto.randomUUID() }) }
  function removeSubject(subject) {
    if (subject.scheduleId) setRemovedScheduleIds(ids => ids.includes(subject.scheduleId) ? ids : [...ids, subject.scheduleId])
    setSubjects(items => items.filter(item => item.key !== subject.key))
    setFieldErrors(errors => Object.fromEntries(Object.entries(errors).filter(([key]) => key !== 'subjects' && !key.startsWith('subject.'))))
  }
  function saveSubject(event) {
    event.preventDefault()
    const selected = filteredSubjects.find(row => String(row.id ?? row.subjectId) === String(editingSubject.subjectId))
    if (!selected) { setError('Select a subject from the available subject list.'); return }
    if (!editingSubject.examDate || !editingSubject.startTime || !editingSubject.endTime || editingSubject.endTime <= editingSubject.startTime) { setError('Enter a valid exam date, start time and later end time.'); return }
    if (dateOnly(editingSubject.examDate) < draft.startDate || dateOnly(editingSubject.examDate) > draft.endDate) { setError('Subject exam date must fall within the examination period.'); return }
    if (subjects.some(row => String(row.subjectId) === String(editingSubject.subjectId) && row.key !== editingSubject.key)) { setError('This subject is already added to the examination.'); return }
    const duration = Math.max(1, Math.round((new Date(`1970-01-01T${editingSubject.endTime}:00`) - new Date(`1970-01-01T${editingSubject.startTime}:00`)) / 60000))
    setSubjects(current => current.some(row => row.key === editingSubject.key) ? current.map(row => row.key === editingSubject.key ? { ...editingSubject, duration, subjectName: selected.name || selected.subjectName, subjectCode: selected.code || selected.subjectCode } : row) : [...current, { ...editingSubject, duration, subjectName: selected.name || selected.subjectName, subjectCode: selected.code || selected.subjectCode }])
    setFieldErrors(current => Object.fromEntries(Object.entries(current).filter(([key]) => key !== 'subjects' && !key.startsWith('subject.'))))
    setEditingSubject(null); setError(''); setConfirmError('')
  }

  function openCreateConfirmation(event) {
    event.preventDefault()
    if (savingRef.current) return
    const nextErrors = {}
    const required = [
      ['examName', 'Enter an examination name.'],
      ['examCode', 'Enter an examination code.'],
      ['academicYearId', 'Select an academic year.'],
      ['examTypeId', 'Select an examination type.'],
      ['courseId', 'Select a course.'],
      ['branchId', 'Select a department / branch.'],
      ['semesterId', 'Select a semester.'],
      ['startDate', 'Select an examination start date.'],
      ['endDate', 'Select an examination end date.'],
    ]
    required.forEach(([key, message]) => { if (!String(draft[key] ?? '').trim()) nextErrors[key] = message })
    if (draft.examTypeId === '__others__' && !String(draft.customExamTypeName || '').trim()) nextErrors.customExamTypeName = 'Enter the custom examination type.'
    const hasOption = (options, value, keys) => options.some(option => keys.some(key => String(option[key]) === String(value)))
    if (draft.academicYearId && !hasOption(lookups.academicYears, draft.academicYearId, ['id', 'academicYearId'])) nextErrors.academicYearId = 'Choose an academic year from the list.'
    if (draft.courseId && !hasOption(lookups.courses, draft.courseId, ['id', 'courseId'])) nextErrors.courseId = 'Choose a course from the list.'
    if (draft.branchId && !hasOption(filteredBranches, draft.branchId, ['id', 'branchId'])) nextErrors.branchId = 'Choose a department that belongs to the selected course.'
    if (draft.semesterId && !hasOption(filteredSemesters, draft.semesterId, ['id', 'semesterId'])) nextErrors.semesterId = 'Choose a semester that belongs to the selected course and department.'
    if (draft.examTypeId && !examTypeOptions.some(option => option.value === draft.examTypeId)) nextErrors.examTypeId = 'Choose an examination type from the list.'
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) nextErrors.endDate = 'End date must be on or after the start date.'
    if (!subjects.length) nextErrors.subjects = 'Add at least one subject and timetable entry.'
    subjects.forEach((subject, index) => {
      let message = ''
      if (!subject.subjectId) message = 'Select a subject.'
      else if (!subject.examDate || !subject.startTime || !subject.endTime) message = 'Add the subject exam date, start time and end time.'
      else if (subject.endTime <= subject.startTime) message = 'End time must be later than start time.'
      else if ((draft.startDate && dateOnly(subject.examDate) < draft.startDate) || (draft.endDate && dateOnly(subject.examDate) > draft.endDate)) message = 'Subject date must be within the examination period.'
      else if (Number(subject.maximumMarks) < 1 || Number(subject.passingMarks) < 0 || Number(subject.passingMarks) > Number(subject.maximumMarks)) message = 'Check the subject maximum and passing marks.'
      if (message) nextErrors[`subject.${index}`] = `${subject.subjectName || `Subject ${index + 1}`}: ${message}`
    })
    setFieldErrors(nextErrors)
    setConfirmError('')
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => document.querySelector('.uem-exam-form [aria-invalid="true"]')?.focus())
      return
    }
    setConfirmCreate(true)
  }

  async function saveExam(event, status) {
    event.preventDefault(); if (savingRef.current || saving) return
    savingRef.current = true
    setSaving(true); setError(''); setNotice(''); setConfirmError('')
    let savedExamId
    try {
      if (!draft.examName.trim() || !draft.examCode.trim()) throw new Error('Enter an examination name and code.')
      if (!draft.startDate || !draft.endDate || draft.endDate < draft.startDate) throw new Error('Enter a valid examination date range.')
      if (status && !subjects.length) throw new Error('Add at least one subject and timetable entry before creating the examination.')
      const typeChoice = String(draft.examTypeId || '')
      if (typeChoice === '__others__' && !String(draft.customExamTypeName || '').trim()) throw new Error('Enter a custom examination type.')
      const typeName = typeChoice === '__others__' ? draft.customExamTypeName : typeChoice.startsWith('__predefined__:') ? typeChoice.slice('__predefined__:'.length) : null
      const examTypeId = typeName ? await ensureExamTypeId(academic.selectedCollegeId, typeName) : requireId(typeChoice, 'exam type')
      const examPayload = { collegeId: requireId(academic.selectedCollegeId, 'college'), academicYearId: requireId(draft.academicYearId, 'academic year'), courseId: requireId(draft.courseId, 'course'), branchId: requireId(draft.branchId, 'department'), semesterId: requireId(draft.semesterId, 'semester'), examTypeId, examCode: draft.examCode.trim(), examName: draft.examName.trim(), startDate: draft.startDate, endDate: draft.endDate, status }
      const isEditing = Boolean(editingExam?.examId)
      const created = unwrap(await call(isEditing ? `exams/${requireId(editingExam.examId, 'examination')}` : 'exams', { method: isEditing ? 'PUT' : 'POST', body: examPayload }))
      savedExamId = isEditing ? editingExam.examId : created?.examId ?? created?.data?.examId
      if (!savedExamId) throw new Error('Examination was created, but the server did not return its ID.')
      for (const subject of subjects) {
        const scheduleBody = { subjectId: requireId(subject.subjectId, 'subject'), sectionId: draft.sectionId ? Number(draft.sectionId) : null, examDate: subject.examDate, startTime: subject.startTime, endTime: subject.endTime, instructions: subject.faculty ? `Faculty: ${subject.faculty}` : null, status }
        const scheduleUrl = `exams/${savedExamId}/schedules${subject.scheduleId ? `/${requireId(subject.scheduleId, 'schedule')}` : ''}`
        await call(scheduleUrl, { method: subject.scheduleId ? 'PUT' : 'POST', body: scheduleBody })
      }
      for (const scheduleId of removedScheduleIds) await call(`exams/${savedExamId}/schedules/${requireId(scheduleId, 'schedule')}`, { method: 'DELETE' })
      if (status) {
        setConfirmCreate(false)
        showSuccess(isEditing ? 'Examination updated successfully' : 'Examination created successfully')
      } else setNotice('Examination saved as draft.')
      setDraft(initialDraft(academic)); setSubjects([]); setEditingExam(null); setRemovedScheduleIds([]); setShowExamForm(false); await reload()
      setFieldErrors({})
    } catch (requestError) {
      const message = savedExamId ? `The examination was saved, but a subject schedule could not be saved: ${requestError.message}` : requestError.message || 'Unable to save the examination.'
      if (status) setConfirmError(message)
      else setError(message)
    } finally { savingRef.current = false; setSaving(false) }
  }
  function resetForm() { setDraft(initialDraft(academic)); setSubjects([]); setEditingSubject(null); setError(''); setConfirmError(''); setFieldErrors({}) }

  const summaryCourse = lookups.courses.find(row => String(row.id ?? row.courseId) === String(draft.courseId))
  const summaryBranch = lookups.branches.find(row => String(row.id ?? row.branchId) === String(draft.branchId))
  const summarySemester = lookups.semesters.find(row => String(row.id ?? row.semesterId) === String(draft.semesterId))
  const summaryAcademicYear = lookups.academicYears.find(row => String(row.id ?? row.academicYearId) === String(draft.academicYearId))
  const summaryExamType = examTypeOptions.find(option => option.value === draft.examTypeId)?.label
  async function deleteExam(exam) {
    if (!canDelete || !window.confirm(`Delete ${exam.examName}?`)) return
    try { await call(`exams/${exam.examId}`, { method: 'DELETE', query: { collegeId: academic.selectedCollegeId } }); setNotice('Examination deleted.'); await reload() }
    catch (requestError) { setError(requestError.message || 'Unable to delete examination.') }
  }
  async function allocateRoom(event) {
    event.preventDefault(); if (!roomExam || roomSaving) return
    setRoomSaving(true); setRoomError(''); setRoomNotice('')
    try {
      const schedule = examSubjects.find(row => String(row.scheduleId ?? row.examScheduleId) === String(roomForm.scheduleId))
      if (!schedule) throw new Error('Select a scheduled subject.')
      const room = roomAvailability.find(row => String(row.classroomId) === String(roomForm.classroomId))
      if (!room) throw new Error('Select a room.')
      if (!room.isAvailable) throw new Error('This room is no longer available for the selected date and time. Refresh the room list and choose another room.')
      if (Number(roomForm.students) < 1) throw new Error('Enter at least one student for this room.')
      if (room.capacity != null && Number(roomForm.students) > Number(room.capacity)) throw new Error('The selected room capacity is insufficient.')
      if (roomAllocations.some(row => String(row.examScheduleId) === String(roomForm.scheduleId) && String(row.classroomId) === String(roomForm.classroomId) && String(row.examHallAllocationId) !== String(editingAllocation?.examHallAllocationId))) throw new Error('This room is already allocated to the selected subject. Choose another room.')
      const body = { examScheduleId: Number(roomForm.scheduleId), classroomId: Number(roomForm.classroomId), allocatedStudents: Number(roomForm.students), invigilatorFacultyId: roomForm.invigilatorFacultyId ? Number(roomForm.invigilatorFacultyId) : null, status: true }
      const url = editingAllocation ? `exam-schedules/hall-allocations/${editingAllocation.examHallAllocationId}` : 'exam-schedules/hall-allocations'
      await call(url, { method: editingAllocation ? 'PUT' : 'POST', body })
      const wasEditing = Boolean(editingAllocation)
      setEditingAllocation(null)
      setRoomForm(value => ({ ...value, classroomId: '', students: '', invigilatorFacultyId: '' }))
      setRoomError('')
      setRoomNotice(wasEditing ? 'Room allocation updated.' : 'Room allocated successfully.')
      setNotice(wasEditing ? 'Room allocation updated.' : 'Room allocated.')
      await Promise.all([reload(), loadExamAllocations(roomExam.examId)])
    } catch (requestError) { setRoomNotice(''); setRoomError(requestError.message || 'Unable to allocate this room.') }
    finally { setRoomSaving(false) }
  }

  async function removeAllocation(allocation) {
    if (!window.confirm('Remove this room allocation?')) return
    try { await call(`exam-schedules/hall-allocations/${allocation.examHallAllocationId}`, { method: 'DELETE' }); setRoomError(''); setRoomNotice('Room allocation removed.'); setNotice('Room allocation removed.'); await Promise.all([reload(), loadExamAllocations(roomExam.examId)]) }
    catch (requestError) { setRoomError(requestError.message || 'Unable to remove this room allocation.') }
  }

  function editAllocation(allocation) {
    setEditingAllocation(allocation)
    setRoomForm({ scheduleId: String(allocation.examScheduleId), buildingId: String(allocation.buildingId || ''), classroomId: String(allocation.classroomId), students: String(allocation.allocatedStudents ?? ''), invigilatorFacultyId: allocation.invigilatorFacultyId ? String(allocation.invigilatorFacultyId) : '' })
    setRoomError(''); setRoomNotice('')
  }

  return <DashboardLayout><main className="uem-page">
    <PageHeader title="Exam Management" subtitle="Search and manage examination schedules and room allocations." compactSummary={<CompactSummary label="Examination summary" items={examinationSummary} />} />
    {error && <p className="uem-alert" role="alert">{error}</p>}{notice && <p className="uem-success" role="status">{notice}</p>}
    {showExamForm && <ViewDialog title={editingExam ? 'Edit Examination' : 'Create Examination'} subtitle="Enter examination information and schedule its subjects." onClose={() => { if (!saving && !confirmCreate) setShowExamForm(false) }} showExport={false} busy={saving} maxWidth="860px" className="uem-exam-dialog" footerContent={<><button type="button" className="erp-btn erp-btn--secondary" onClick={() => { setConfirmCreate(false); setShowExamForm(false) }} disabled={saving}>Cancel</button><button type="button" className="erp-btn erp-btn--secondary" disabled={saving} onClick={event => saveExam(event, false)}>Save as Draft</button><button type="submit" form="uem-exam-form" className="erp-btn erp-btn--primary" disabled={saving || !(editingExam ? canEdit : canCreate)}>{editingExam ? 'Save Changes' : 'Create Examination'}</button></>}>
    <form id="uem-exam-form" className="uem-exam-form" noValidate onSubmit={openCreateConfirmation}>
      <section className="uem-form-section">
        <div className="uem-form-section__heading"><div><h2>Examination Information</h2><p>Set the examination identity and academic context.</p></div></div>
        <div className="uem-grid">
          <label className="uem-field"><span>Examination Name <b>*</b></span><input required aria-invalid={Boolean(fieldErrors.examName)} aria-describedby={fieldErrors.examName ? 'uem-error-examName' : undefined} value={draft.examName} onChange={e => setDetail('examName', e.target.value)} placeholder="Enter examination name" />{fieldErrors.examName && <small id="uem-error-examName" className="uem-field-error" role="alert">{fieldErrors.examName}</small>}</label>
          <label className="uem-field"><span>Examination Code <b>*</b></span><input required aria-invalid={Boolean(fieldErrors.examCode)} aria-describedby={fieldErrors.examCode ? 'uem-error-examCode' : undefined} value={draft.examCode} onChange={e => setDetail('examCode', e.target.value)} placeholder="Auto-generated code" />{fieldErrors.examCode && <small id="uem-error-examCode" className="uem-field-error" role="alert">{fieldErrors.examCode}</small>}</label>
          <label className="uem-field"><span>Academic Year <b>*</b></span><select required aria-invalid={Boolean(fieldErrors.academicYearId)} aria-describedby={fieldErrors.academicYearId ? 'uem-error-academicYearId' : undefined} value={draft.academicYearId} onChange={e => setDetail('academicYearId', e.target.value)}><option value="">Select academic year</option>{lookups.academicYears.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select>{fieldErrors.academicYearId && <small id="uem-error-academicYearId" className="uem-field-error" role="alert">{fieldErrors.academicYearId}</small>}</label>
          <label className="uem-field"><span>Examination Type <b>*</b></span><select required aria-invalid={Boolean(fieldErrors.examTypeId)} aria-describedby={fieldErrors.examTypeId ? 'uem-error-examTypeId' : undefined} value={draft.examTypeId} onChange={e => setDetail('examTypeId', e.target.value)}><option value="">Select examination type</option>{examTypeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{fieldErrors.examTypeId && <small id="uem-error-examTypeId" className="uem-field-error" role="alert">{fieldErrors.examTypeId}</small>}</label>
          {draft.examTypeId === '__others__' && <label className="uem-field"><span>Custom Examination Type <b>*</b></span><input required aria-invalid={Boolean(fieldErrors.customExamTypeName)} aria-describedby={fieldErrors.customExamTypeName ? 'uem-error-customExamTypeName' : undefined} placeholder="Enter new examination type" value={draft.customExamTypeName || ''} onChange={e => setDetail('customExamTypeName', e.target.value)} />{fieldErrors.customExamTypeName && <small id="uem-error-customExamTypeName" className="uem-field-error" role="alert">{fieldErrors.customExamTypeName}</small>}</label>}
        </div>
      </section>
      <section className="uem-form-section">
        <div className="uem-form-section__heading"><div><h2>Academic Information</h2><p>Choose the department, course and student group.</p></div></div>
        <div className="uem-grid">
          <label className="uem-field"><span>Department <b>*</b></span><select required aria-invalid={Boolean(fieldErrors.branchId)} aria-describedby={fieldErrors.branchId ? 'uem-error-branchId' : undefined} value={draft.branchId} onChange={e => setDetail('branchId', e.target.value)}><option value="">Select department</option>{filteredBranches.map(row => <option key={row.id ?? row.branchId} value={row.id ?? row.branchId}>{row.name || row.branchName}</option>)}</select>{fieldErrors.branchId && <small id="uem-error-branchId" className="uem-field-error" role="alert">{fieldErrors.branchId}</small>}</label>
          <label className="uem-field"><span>Course <b>*</b></span><select required aria-invalid={Boolean(fieldErrors.courseId)} aria-describedby={fieldErrors.courseId ? 'uem-error-courseId' : undefined} value={draft.courseId} onChange={e => setDetail('courseId', e.target.value)}><option value="">Select course</option>{lookups.courses.map(row => <option key={row.id ?? row.courseId} value={row.id ?? row.courseId}>{row.name || row.courseName}</option>)}</select>{fieldErrors.courseId && <small id="uem-error-courseId" className="uem-field-error" role="alert">{fieldErrors.courseId}</small>}</label>
          <label className="uem-field"><span>Year</span><select value={draft.year} onChange={e => setDetail('year', e.target.value)}><option value="">Select year</option>{[1,2,3,4].map(year => <option key={year} value={year}>{year}{year===1?'st':year===2?'nd':year===3?'rd':'th'} Year</option>)}</select></label>
          <label className="uem-field"><span>Semester <b>*</b></span><select required aria-invalid={Boolean(fieldErrors.semesterId)} aria-describedby={fieldErrors.semesterId ? 'uem-error-semesterId' : undefined} value={draft.semesterId} onChange={e => setDetail('semesterId', e.target.value)}><option value="">Select semester</option>{filteredSemesters.map(row => <option key={row.id ?? row.semesterId} value={row.id ?? row.semesterId}>{row.name || row.semesterName}</option>)}</select>{fieldErrors.semesterId && <small id="uem-error-semesterId" className="uem-field-error" role="alert">{fieldErrors.semesterId}</small>}</label>
          <label className="uem-field"><span>Section</span><select value={draft.sectionId} onChange={e => setDetail('sectionId', e.target.value)}><option value="">Select section</option>{filteredSections.map(row => <option key={row.id ?? row.sectionId} value={row.id ?? row.sectionId}>{row.name || row.sectionName}</option>)}</select></label>
        </div>
      </section>
      <section className="uem-form-section">
        <div className="uem-form-section__heading"><div><h2>Examination Schedule</h2><p>Define the overall examination date range.</p></div></div>
        <div className="uem-grid uem-grid--schedule">
          <label className="uem-field"><span>Examination Start Date <b>*</b></span><input required type="date" aria-invalid={Boolean(fieldErrors.startDate)} aria-describedby={fieldErrors.startDate ? 'uem-error-startDate' : undefined} value={draft.startDate} onChange={e => setDetail('startDate', e.target.value)} />{fieldErrors.startDate && <small id="uem-error-startDate" className="uem-field-error" role="alert">{fieldErrors.startDate}</small>}</label>
          <label className="uem-field"><span>Examination End Date <b>*</b></span><input required type="date" min={draft.startDate || undefined} aria-invalid={Boolean(fieldErrors.endDate)} aria-describedby={fieldErrors.endDate ? 'uem-error-endDate' : undefined} value={draft.endDate} onChange={e => setDetail('endDate', e.target.value)} />{fieldErrors.endDate && <small id="uem-error-endDate" className="uem-field-error" role="alert">{fieldErrors.endDate}</small>}</label>
        </div>
      </section>
      <section className="uem-subject-section">
        <div className="uem-section-heading"><div className="uem-form-section__heading"><div><h2>Allocate Subjects &amp; Set Timetable</h2><p>Add subjects with an individual exam date and time.</p></div></div><button className="erp-btn erp-btn--secondary" type="button" onClick={() => openSubject()} disabled={!draft.courseId || !draft.semesterId}><FiPlus aria-hidden="true" />Add Subject</button></div>
        {fieldErrors.subjects && <p className="uem-field-error uem-subject-error" role="alert">{fieldErrors.subjects}</p>}
        <div className="uem-table-wrap uem-subject-table-wrap"><table><thead><tr><th>Subject</th><th>Code</th><th>Faculty</th><th>Max Marks</th><th>Pass Marks</th><th>Exam Date</th><th>Time</th><th>Duration</th><th>Actions</th></tr></thead><tbody>{subjects.map((row, index) => <Fragment key={row.key}><tr className={fieldErrors[`subject.${index}`] ? 'uem-invalid-row' : ''}><td data-label="Subject">{row.subjectName}</td><td data-label="Code">{row.subjectCode}</td><td data-label="Faculty">{row.faculty || '—'}</td><td data-label="Max Marks">{row.maximumMarks}</td><td data-label="Pass Marks">{row.passingMarks}</td><td data-label="Exam Date">{dateOnly(row.examDate)}</td><td data-label="Time">{row.startTime}–{row.endTime}</td><td data-label="Duration">{row.duration} min</td><td data-label="Actions"><div className="uem-row-actions"><button className="uem-icon-button" type="button" title="Edit subject" aria-label="Edit subject" onClick={() => openSubject(row)}><FiEdit2 /></button><button className="uem-icon-button uem-icon-button--danger" type="button" title="Remove subject" aria-label="Remove subject" onClick={() => removeSubject(row)}><FiTrash2 /></button></div></td></tr>{fieldErrors[`subject.${index}`] && <tr><td colSpan="9" className="uem-field-error uem-subject-row-error" role="alert">{fieldErrors[`subject.${index}`]}</td></tr>}</Fragment>)}{!subjects.length && <tr><td colSpan="9" className="uem-empty"><span className="uem-empty-icon"><FiBookOpen /></span><strong>No subjects added yet</strong><span>Add subjects to build this examination’s timetable.</span></td></tr>}</tbody></table></div>
      </section>
      <div className="uem-form-reset-row"><button type="button" className="uem-text-button" onClick={resetForm} disabled={saving}>Reset all fields</button></div>
    </form>
    </ViewDialog>}
    {confirmCreate && <ViewDialog title={editingExam ? 'Confirm Examination Update' : 'Confirm Examination Creation'} icon={FiClipboard} subtitle="Review these details before saving the examination." onClose={() => { if (!savingRef.current) { setConfirmCreate(false); setConfirmError('') } }} showExport={false} busy={saving} maxWidth="620px" className="uem-confirm-dialog" footerContent={<><button className="uem-secondary" type="button" onClick={() => { setConfirmCreate(false); setConfirmError('') }} disabled={saving}>Cancel</button><button className="uem-primary" type="submit" form="uem-confirm-exam-form" disabled={saving}>{saving ? 'Saving…' : editingExam ? 'Confirm & Save' : 'Confirm & Create'}</button></>}>
      <form id="uem-confirm-exam-form" className="uem-confirm-content" onSubmit={event => saveExam(event, editingExam ? Boolean(editingExam.status) : true)}>
        <p className="uem-confirm-message" id="uem-confirm-description">{editingExam ? 'Are you sure you want to save these examination changes?' : 'Are you sure you want to create this examination?'}</p>
        {confirmError && <p className="uem-alert" role="alert">{confirmError}</p>}
        <dl className="uem-confirm-summary" aria-describedby="uem-confirm-description">
          <div><dt>Examination Name</dt><dd>{draft.examName}</dd></div>
          <div><dt>Academic Year</dt><dd>{summaryAcademicYear?.name || '—'}</dd></div>
          <div><dt>Course / Branch</dt><dd>{summaryCourse?.name || summaryCourse?.courseName || '—'} / {summaryBranch?.name || summaryBranch?.branchName || '—'}</dd></div>
          <div><dt>Semester</dt><dd>{summarySemester?.name || summarySemester?.semesterName || '—'}</dd></div>
          <div><dt>Examination Type</dt><dd>{draft.examTypeId === '__others__' ? draft.customExamTypeName : summaryExamType || '—'}</dd></div>
          <div><dt>Examination Start Date</dt><dd>{draft.startDate || '—'}</dd></div>
          <div><dt>Examination End Date</dt><dd>{draft.endDate || '—'}</dd></div>
          <div><dt>Total Subjects Added</dt><dd>{subjects.length}</dd></div>
        </dl>
      </form>
    </ViewDialog>}
    <section className="uem-directory-card uem-list">
      <header className="uem-directory-header"><div><h2>All Examinations</h2><p>{loadError ? 'Records unavailable' : loading ? 'Loading examination records…' : `${filteredExams.length} records`}</p></div><div className="uem-directory-actions"><ExportMenu rows={filteredExams} columns={examExportColumns} title="Examinations" filename="examinations" loading={loading || Boolean(loadError)} /><button type="button" className="uem-primary uem-header-create" onClick={openNewExam} disabled={!canCreate}><FiPlus aria-hidden="true" />Create Examination</button></div></header>
      <FilterPanel className="uem-directory-filter-panel" active={appliedFilterCount > 0} activeCount={appliedFilterCount} hideClear search={<label className="uem-search"><FiSearch aria-hidden="true" /><input aria-label="Search examinations" placeholder="Search by name, code, department" value={query} onChange={e => setQuery(e.target.value)} /></label>} filters={<div className="uem-filter-fields">
        <label>Examination Type<select aria-label="Filter by exam type" value={filterDraft.examType} onChange={e => setFilterDraft(value => ({ ...value, examType: e.target.value }))}><option value="all">All examination types</option>{lookups.examTypes.map(type => <option key={type.examTypeId ?? type.id} value={type.examTypeId ?? type.id}>{type.name}</option>)}</select></label>
        <label>Academic Year<select aria-label="Filter by academic year" value={filterDraft.academicYear} onChange={e => setFilterDraft(value => ({ ...value, academicYear: e.target.value }))}><option value="all">All academic years</option>{lookups.academicYears.map(year => <option key={year.id ?? year.academicYearId} value={year.id ?? year.academicYearId}>{year.name || year.academicYearName}</option>)}</select></label>
        <label>Status<select aria-label="Filter by status" value={filterDraft.status} onChange={e => setFilterDraft(value => ({ ...value, status: e.target.value }))}><option value="all">All statuses</option><option value="active">Active</option><option value="scheduled">Scheduled</option><option value="draft">Draft</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="published">Published</option></select></label>
        <div className="uem-filter-actions"><button type="button" className="uem-primary" onClick={applyFilters}>Apply Filters</button><button type="button" className="uem-secondary" onClick={clearFilters}>Clear Filters</button></div>
      </div>} />
      {!loadError && relatedLoadErrors.length > 0 && <div className="uem-load-error" role="alert"><div><strong>Some examination information could not be loaded</strong><p>{relatedLoadErrors.join(', ')}. Saved examinations remain available; retry before editing these details.</p></div><button type="button" className="uem-load-error__retry" disabled={loading} onClick={reload}>Retry related information</button></div>}
      {loadError ? <div className="uem-load-error" role="alert"><FiAlertCircle className="uem-load-error__icon" aria-hidden="true" /><div className="uem-load-error__copy"><strong>Unable to load examinations</strong><p>We couldn't fetch examination records. Please try again.</p></div><button type="button" className="uem-load-error__retry" onClick={reload} disabled={loading}>{loading ? 'Retrying…' : 'Retry'}</button></div> : <>
      <div className="uem-table-wrap uem-exam-table-wrap"><table><thead><tr><th>Exam Name</th><th>Department</th><th>Semester</th><th>Subjects</th><th>Start Date</th><th>End Date</th><th>Room Allocation</th><th>Status</th><th>Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="9" className="uem-empty">Loading examinations…</td></tr> : visibleExams.map(exam => {
        const examSchedules = schedules.filter(row => String(row.examId) === String(exam.examId))
        const examAllocations = allocations.filter(allocation => examSchedules.some(schedule => String(schedule.scheduleId ?? schedule.examScheduleId) === String(allocation.examScheduleId)) && allocation.status !== false && allocation.status !== 0)
        const allSessionsCovered = examSchedules.length > 0 && examSchedules.every(schedule => {
          const sectionId = String(schedule.sectionId || exam.sectionId || '')
          const expectedStudents = Number(lookups.sections.find(section => String(section.id ?? section.sectionId) === sectionId)?.capacity || 0)
          const scheduledAllocations = examAllocations.filter(allocation => String(allocation.examScheduleId) === String(schedule.scheduleId ?? schedule.examScheduleId))
          return expectedStudents > 0 && scheduledAllocations.reduce((total, allocation) => total + Number(allocation.allocatedStudents || 0), 0) >= expectedStudents
        })
        const roomStatus = !examAllocations.length ? 'Not Allocated' : allSessionsCovered ? 'Fully Allocated' : 'Partially Allocated'
        const statusLabel = examStatusLabel(exam)
        return <tr key={exam.examId}><td data-label="Exam Name" className="uem-exam-name-cell"><strong>{exam.examName}</strong><small>{exam.examCode}</small></td><td data-label="Department">{exam.branchName || '—'}</td><td data-label="Semester">{exam.semesterName || '—'}</td><td data-label="Subjects"><span className="uem-count-chip">{examSchedules.length}</span></td><td data-label="Start Date">{dateOnly(exam.startDate)}</td><td data-label="End Date">{dateOnly(exam.endDate)}</td><td data-label="Room Allocation"><span className={`uem-status ${roomStatus.toLowerCase().replaceAll(' ', '-')}`}>{roomStatus}</span></td><td data-label="Status"><span className={`uem-status ${['active', 'scheduled'].includes(statusLabel.toLowerCase()) ? 'uem-status--active' : statusLabel.toLowerCase() === 'draft' ? 'uem-status--draft' : ''}`}>{statusLabel}</span></td><td data-label="Actions"><div className="uem-row-actions"><button className="uem-icon-button" type="button" title="View examination" aria-label="View examination" onClick={() => setViewingExam(exam)}><FiEye /></button><button className="uem-icon-button" type="button" title="Edit examination" aria-label="Edit examination" onClick={() => openEditExam(exam)} disabled={!canEdit}><FiEdit2 /></button><button className="uem-icon-button uem-icon-button--allocate" type="button" title={!examSchedules.length ? 'Add and save a subject timetable before allocating rooms' : 'Allocate rooms'} aria-label="Allocate rooms" onClick={() => { setRoomExam(exam); setEditingAllocation(null); setRoomError(''); setRoomNotice(''); setRoomForm({ scheduleId: '', buildingId: '', classroomId: '', students: '', invigilatorFacultyId: '' }) }} disabled={!examSchedules.length}><FiMapPin /></button><button className="uem-icon-button uem-icon-button--danger" type="button" title="Delete examination" aria-label="Delete examination" onClick={() => deleteExam(exam)} disabled={!canDelete}><FiTrash2 /></button></div></td></tr>
      })}{!loading && !filteredExams.length && <tr><td colSpan="9" className="uem-empty"><span className="uem-empty-icon"><FiClipboard /></span><strong>No matching examinations</strong><span>Adjust your filters or create an examination.</span></td></tr>}</tbody></table></div>
      <div className="uem-pagination"><span>Showing {filteredExams.length ? (examPage - 1) * examPageSize + 1 : 0}–{Math.min(examPage * examPageSize, filteredExams.length)} of {filteredExams.length} examinations</span><div><button type="button" aria-label="Previous page" onClick={() => setExamPage(page => Math.max(1, page - 1))} disabled={examPage <= 1}><FiChevronLeft />Previous</button><span>Page <strong>{examPage}</strong> of <strong>{examPageCount}</strong></span><button type="button" aria-label="Next page" onClick={() => setExamPage(page => Math.min(examPageCount, page + 1))} disabled={examPage >= examPageCount}>Next<FiChevronRight /></button></div></div>
      </>}
    </section>
    {editingSubject && <ViewDialog title="Subject & Timetable" subtitle="Set subject and session details" onClose={()=>setEditingSubject(null)} hideFooter showExport={false}><form className="uem-grid uem-subject-form" onSubmit={saveSubject}>
      <label>Subject Name<select required value={editingSubject.subjectId} onChange={e=>{const found=filteredSubjects.find(row=>String(row.id ?? row.subjectId)===e.target.value);setEditingSubject(v=>({...v,subjectId:e.target.value,subjectName:found?.name,subjectCode:found?.code}))}}><option value="">Select subject</option>{filteredSubjects.map(row=><option key={row.id ?? row.subjectId} value={row.id ?? row.subjectId}>{row.name || row.subjectName}</option>)}</select></label>
      <label>Subject Code<input readOnly value={editingSubject.subjectCode || filteredSubjects.find(row=>String(row.id ?? row.subjectId)===String(editingSubject.subjectId))?.code || ''}/></label>
      <label>Faculty<ProjectSelect value={editingSubject.faculty} onChange={e=>setEditingSubject(v=>({...v,faculty:e.target.value}))}><option value="">Select faculty</option>{faculty.map(person => { const name = person.fullName || person.facultyName || person.name || ''; return <option key={person.facultyId ?? person.id} value={name}>{name}{person.employeeId || person.facultyCode ? ` · ${person.employeeId || person.facultyCode}` : ''}</option> })}</ProjectSelect></label>
      <label>Maximum Marks<input type="number" min="1" value={editingSubject.maximumMarks} onChange={e=>setEditingSubject(v=>({...v,maximumMarks:e.target.value}))}/></label>
      <label>Passing Marks<input type="number" min="0" max={editingSubject.maximumMarks} value={editingSubject.passingMarks} onChange={e=>setEditingSubject(v=>({...v,passingMarks:e.target.value}))}/></label>
      <label>Exam Date<input required type="date" min={draft.startDate} max={draft.endDate} value={editingSubject.examDate} onChange={e=>setEditingSubject(v=>({...v,examDate:e.target.value}))}/></label>
      <label>Start Time<input required type="time" value={editingSubject.startTime} onChange={e=>setEditingSubject(v=>({...v,startTime:e.target.value}))}/></label><label>End Time<input required type="time" value={editingSubject.endTime} onChange={e=>setEditingSubject(v=>({...v,endTime:e.target.value}))}/></label>
      <label>Duration (minutes)<input readOnly value={editingSubject.startTime && editingSubject.endTime ? Math.max(0,(new Date(`1970-01-01T${editingSubject.endTime}:00`)-new Date(`1970-01-01T${editingSubject.startTime}:00`))/60000) : ''}/></label>
      <footer><button className="uem-primary" type="submit">Save Subject</button></footer>
    </form></ViewDialog>}
    {roomExam && <ViewDialog title="Allocate Examination Rooms" subtitle={roomExam.examName} onClose={() => { setRoomExam(null); setEditingAllocation(null); setRoomError(''); setRoomNotice('') }} showExport={false} busy={roomSaving} maxWidth="90vw" className="uem-room-dialog" footerContent={<><button className="uem-secondary" type="button" onClick={() => { setRoomExam(null); setEditingAllocation(null); setRoomError(''); setRoomNotice('') }} disabled={roomSaving}>Cancel</button><button className="uem-primary" type="submit" form="room-allocation-form" disabled={roomSaving || !roomForm.scheduleId}>{roomSaving ? 'Saving…' : editingAllocation ? 'Update Allocation' : 'Allocate Room'}</button></>}>
      <div className="uem-room-workspace">
        <dl className="uem-exam-meta"><div><dt>Examination</dt><dd>{roomExam.examName}</dd></div><div><dt>Exam Type</dt><dd>{roomExam.examTypeName || lookups.examTypes.find(row => String(row.examTypeId ?? row.id) === String(roomExam.examTypeId))?.name || '—'}</dd></div><div><dt>Department</dt><dd>{roomExam.branchName || '—'}</dd></div><div><dt>Semester</dt><dd>{roomExam.semesterName || '—'}</dd></div><div><dt>Examination Dates</dt><dd>{dateOnly(roomExam.startDate)} – {dateOnly(roomExam.endDate)}</dd></div></dl>
        {roomError && <p className="uem-alert" role="alert">{roomError}</p>}
        {roomNotice && <p className="uem-success" role="status">{roomNotice}</p>}
        {!examSubjects.length && <p className="uem-alert" role="status">This examination has no saved subject timetable entries yet. Add subject schedules before allocating rooms.</p>}
        <form id="room-allocation-form" className="uem-grid uem-room-form" onSubmit={allocateRoom}>
          <label>Select Subject<select required value={roomForm.scheduleId} onChange={e => setRoomForm(value => ({ ...value, scheduleId: e.target.value, classroomId: '' }))}><option value="">Select scheduled subject</option>{examSubjects.map(row => <option key={row.scheduleId ?? row.examScheduleId} value={row.scheduleId ?? row.examScheduleId}>{row.subjectName} ({row.subjectCode}) · {dateOnly(row.examDate)} · {row.startTime}–{row.endTime}</option>)}</select></label>
          <label>Exam Date<input readOnly value={dateOnly(selectedRoomSchedule?.examDate)}/></label>
          <label>Start Time<input readOnly value={selectedRoomSchedule?.startTime || ''}/></label><label>End Time<input readOnly value={selectedRoomSchedule?.endTime || ''}/></label>
          <label>Building<select value={roomForm.buildingId} onChange={e => setRoomForm(value => ({ ...value, buildingId: e.target.value, classroomId: '' }))} disabled={!roomForm.scheduleId}><option value="">All buildings</option>{roomBuildings.map(building => <option key={building.buildingId} value={building.buildingId}>{building.buildingName}</option>)}</select></label>
          <label>Room / Hall<select required value={roomForm.classroomId} onChange={e => setRoomForm(value => ({ ...value, classroomId: e.target.value }))} disabled={!roomForm.scheduleId || roomAvailabilityLoading}><option value="">{roomAvailabilityLoading ? 'Checking room availability…' : 'Choose an available room'}</option>{availableRooms.map(room => <option key={room.classroomId} value={room.classroomId}>{room.roomNumber} · {room.roomName} · capacity {room.capacity ?? 'not set'}</option>)}</select><small>{roomForm.scheduleId ? `${availableRooms.length} available room(s) for this session.` : 'Select a subject to check room availability.'}</small></label>
          <label>Room Capacity<input readOnly value={roomAvailability.find(room => String(room.classroomId) === String(roomForm.classroomId))?.capacity ?? ''}/></label>
          <label>Number of Students<input required type="number" min="1" max={roomAvailability.find(room => String(room.classroomId) === String(roomForm.classroomId))?.capacity || undefined} value={roomForm.students} onChange={e => setRoomForm(value => ({ ...value, students: e.target.value }))}/></label>
          <label>Invigilator<select value={roomForm.invigilatorFacultyId} onChange={e => setRoomForm(value => ({ ...value, invigilatorFacultyId: e.target.value }))}><option value="">Select invigilator</option>{faculty.map(person => <option key={person.facultyId ?? person.id} value={person.facultyId ?? person.id}>{person.fullName || person.facultyName || person.name}{person.employeeId || person.facultyCode ? ` · ${person.employeeId || person.facultyCode}` : ''}</option>)}</select></label>
        </form>
        {selectedRoomSchedule && <div className="uem-room-status-list"><p>Allocated students for this subject: {roomAllocations.filter(row => String(row.examScheduleId) === String(roomForm.scheduleId) && String(row.examHallAllocationId) !== String(editingAllocation?.examHallAllocationId)).reduce((total, row) => total + Number(row.allocatedStudents || 0), 0)}. You can add multiple halls; capacity is checked by the server.</p><p><strong>Occupied or unavailable:</strong> {occupiedRooms.length ? occupiedRooms.map(room => `${room.roomName} (${room.conflictExamName ? `${room.conflictExamName}, ${room.conflictStartTime}–${room.conflictEndTime}` : room.unavailableReason || room.roomStatus})`).join(' · ') : 'None for this session.'}</p></div>}
        <section className="uem-allocation-list"><h3>Allocated Rooms</h3><div className="uem-table-wrap uem-room-table-wrap"><table><thead><tr><th>Subject</th><th>Exam Date</th><th>Time</th><th>Building</th><th>Room / Hall</th><th>Capacity</th><th>Students</th><th>Invigilator</th><th>Actions</th></tr></thead><tbody>{roomAllocations.map(allocation => <tr key={allocation.examHallAllocationId}><td data-label="Subject">{allocation.subjectName || allocation.subject?.subjectName || allocation.subject?.name || '—'}</td><td data-label="Exam Date">{dateOnly(allocation.examDate)}</td><td data-label="Time">{allocation.startTime}–{allocation.endTime}</td><td data-label="Building">{allocation.buildingName || allocation.buildingBlock || '—'}</td><td data-label="Room / Hall">{allocation.roomNumber ? `${allocation.roomNumber} · ` : ''}{allocation.classroomName || allocation.roomName || '—'}</td><td data-label="Capacity">{allocation.classroomCapacity ?? '—'}</td><td data-label="Students">{allocation.allocatedStudents}</td><td data-label="Invigilator">{allocation.invigilatorName || '—'}</td><td data-label="Actions"><div className="uem-row-actions"><button type="button" onClick={() => editAllocation(allocation)}>Edit</button><button type="button" onClick={() => removeAllocation(allocation)}>Remove</button></div></td></tr>)}{!roomAllocations.length && <tr><td colSpan="9" className="uem-empty">No rooms allocated for this examination yet.</td></tr>}</tbody></table></div></section>
      </div>
    </ViewDialog>}
    {viewingExam && <ViewDialog title={viewingExam.examName || 'Examination details'} subtitle={viewingExam.examCode || ''} icon={FiEye} onClose={() => setViewingExam(null)} showExport={false} maxWidth="780px" className="uem-view-dialog" footerContent={<button type="button" className="uem-secondary" onClick={() => setViewingExam(null)}>Close</button>}>
      <dl className="uem-view-meta"><div><dt>Academic Year</dt><dd>{lookups.academicYears.find(row => String(row.id ?? row.academicYearId) === String(viewingExam.academicYearId))?.name || '—'}</dd></div><div><dt>Examination Type</dt><dd>{lookups.examTypes.find(row => String(row.examTypeId ?? row.id) === String(viewingExam.examTypeId))?.name || '—'}</dd></div><div><dt>Department</dt><dd>{viewingExam.branchName || '—'}</dd></div><div><dt>Semester</dt><dd>{viewingExam.semesterName || '—'}</dd></div><div><dt>Period</dt><dd>{dateOnly(viewingExam.startDate)} – {dateOnly(viewingExam.endDate)}</dd></div><div><dt>Status</dt><dd>{viewingExam.status ? 'Active' : 'Draft'}</dd></div></dl>
      <section className="uem-view-schedules"><h3>Subject timetable</h3><div className="uem-table-wrap"><table><thead><tr><th>Subject</th><th>Code</th><th>Date</th><th>Time</th></tr></thead><tbody>{schedules.filter(row => String(row.examId ?? row.examinationId) === String(viewingExam.examId)).map(row => <tr key={row.scheduleId ?? row.examScheduleId}><td>{row.subjectName || '—'}</td><td>{row.subjectCode || '—'}</td><td>{dateOnly(row.examDate)}</td><td>{row.startTime}–{row.endTime}</td></tr>)}{!schedules.some(row => String(row.examId ?? row.examinationId) === String(viewingExam.examId)) && <tr><td colSpan="4" className="uem-empty">No saved subject timetable entries.</td></tr>}</tbody></table></div></section>
    </ViewDialog>}
  </main></DashboardLayout>
}

function initialDraft(academic) { return { examName:'', examCode:`EX-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`, academicYearId:academic.selectedAcademicYearId ? String(academic.selectedAcademicYearId) : '', examTypeId:'', customExamTypeName:'', branchId:'', courseId:'', year:'', semesterId:'', sectionId:'', startDate:'', endDate:'' } }
