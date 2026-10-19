import { timetableManagementApi } from './apiEndpoints'

// Routes and request fields verified against timetable-current-openapi.json.
// Responses remain unmodified: Swagger does not describe their schemas.
export const timetableOperations = {
  periods: ['get', '/periods', ['academicYearId']],
  createPeriod: ['post', '/periods', 'PeriodConfigurationRequest'],
  automaticPeriods: ['post', '/periods/automatic', 'AutomaticPeriodSetupRequest'],
  updatePeriod: ['put', '/periods/{periodId}', 'PeriodConfigurationRequest'],
  deletePeriod: ['remove', '/periods/{periodId}'],
  reorderPeriods: ['put', '/periods/reorder', 'PeriodReorderRequest'],
  calendar: ['get', '/calendar', ['academicYearId']],
  saveCalendar: ['put', '/calendar', 'CalendarConfigurationRequest'],
  classrooms: ['get', '/classrooms', ['collegeId', 'activeOnly']],
  createClassroom: ['post', '/classrooms', 'ClassroomRequest'],
  updateClassroom: ['put', '/classrooms/{classroomId}', 'ClassroomRequest'],
  timetables: ['get', '/timetables', ['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId', 'status']],
  createTimetable: ['post', '/timetables', 'CreateAdvancedTimetableRequest'],
  timetable: ['get', '/timetables/{timetableId}'],
  updateTimetable: ['put', '/timetables/{timetableId}', 'UpdateAdvancedTimetableRequest'],
  syncPeriods: ['post', '/timetables/{timetableId}/sync-periods'],
  requirements: ['get', '/timetables/{timetableId}/requirements'],
  saveRequirements: ['put', '/timetables/{timetableId}/requirements', 'SaveTimetableRequirementsRequest'],
  generate: ['post', '/timetables/{timetableId}/generate', 'GenerateTimetableRequest'],
  status: ['get', '/timetables/{timetableId}/status'],
  regenerate: ['post', '/timetables/{timetableId}/regenerate', 'GenerateTimetableRequest'],
  roomAvailability: ['get', '/timetables/{timetableId}/rooms/availability', ['timetableSlotId', 'dayOfWeek']],
  generateMissing: ['post', '/timetables/{timetableId}/generate-missing', 'GenerateTimetableRequest'],
  entries: ['get', '/timetables/{timetableId}/entries', ['facultyId', 'dayOfWeek']],
  createEntry: ['post', '/timetables/{timetableId}/entries', 'ManualTimetableEntryRequest'],
  updateEntry: ['put', '/timetables/{timetableId}/entries/{entryId}', 'ManualTimetableEntryRequest'],
  deleteEntry: ['remove', '/timetables/{timetableId}/entries/{entryId}'],
  moveEntry: ['put', '/timetables/{timetableId}/entries/{entryId}/move', 'MoveTimetableEntryRequest'],
  validate: ['post', '/timetables/{timetableId}/validate'],
  validateGlobal: ['post', '/timetables/{timetableId}/validate-global'],
  publish: ['post', '/timetables/{timetableId}/publish'],
  reopen: ['post', '/timetables/{timetableId}/reopen'],
  faculty: ['get', '/views/faculty/{facultyId}', ['academicYearId', 'date']],
  student: ['get', '/views/student/{studentId}', ['academicYearId', 'date']],
  classroom: ['get', '/views/classroom/{classroomId}', ['academicYearId', 'date']],
  section: ['get', '/views/section/{sectionId}', ['academicYearId', 'date']],
  occurrences: ['get', '/occurrences', ['date', 'sectionId', 'facultyId', 'classroomId']],
}

export function createTimetableLifecycleApi(client) {
  return Object.fromEntries(Object.entries(timetableOperations).map(([name, [method, template, fields]]) => [name, (ids = {}, payload) => {
    const path = template.replace(/\{(\w+)\}/g, (_, field) => {
      const value = Number(ids[field])
      if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`A valid backend ${field} is required.`)
      return String(value)
    })
    if (method === 'get') {
      const query = Object.fromEntries((fields || []).filter(field => ids[field] !== undefined && ids[field] !== null && ids[field] !== '').map(field => [field, ids[field]]))
      return client.get(path, query)
    }
    return client[method](path, fields ? payload : undefined)
  }]))
}

export const timetableLifecycleApi = createTimetableLifecycleApi(timetableManagementApi)
