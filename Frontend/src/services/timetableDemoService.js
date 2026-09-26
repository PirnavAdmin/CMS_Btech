import { demoAcademicData, defaultDemoSettings } from './timetableMockData.js'
import { demoEntryTimes, generateDemoTimetables } from '../utils/timetableDemoGenerator.js'
import { validateDemoEntry, validateDemoSchedules } from '../utils/timetableDemoValidator.js'

const STORAGE_KEY = 'pirnav_timetable_demo'
const clone = value => JSON.parse(JSON.stringify(value))
export const initialTimetableDemoState = () => ({
  settings: clone(defaultDemoSettings),
  subjectConfig: Object.fromEntries(demoAcademicData.subjects.map(subject => [subject.id, { selected: true, periodsPerWeek: subject.periodsPerWeek }])),
  allocations: clone(demoAcademicData.allocations),
  schedules: {},
  unscheduled: [],
})

export const timetableDemoService = {
  load() {
    if (typeof localStorage === 'undefined') return initialTimetableDemoState()
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialTimetableDemoState()
    try {
      const saved = JSON.parse(raw)
      const initial = initialTimetableDemoState()
      return {
        ...initial, ...saved,
        settings: { ...initial.settings, ...saved.settings },
        subjectConfig: { ...initial.subjectConfig, ...saved.subjectConfig },
        allocations: Array.isArray(saved.allocations) ? saved.allocations : initial.allocations,
        schedules: saved.schedules && typeof saved.schedules === 'object' ? saved.schedules : {},
        unscheduled: Array.isArray(saved.unscheduled) ? saved.unscheduled : [],
      }
    } catch {
      throw new Error('Demo data in browser storage is unreadable. Use More Actions → Reset Demo Data to restart.')
    }
  },
  save(state) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return state
  },
  reset() {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY)
    return initialTimetableDemoState()
  },
  generateAll(state, scope) { return this.save(generateDemoTimetables(state, scope)) },
  generateMissing(state, scope) { return this.save(generateDemoTimetables(state, scope, { missingOnly: true })) },
  saveEntry(state, entry) {
    const validation = validateDemoEntry(state, entry, entry.id)
    if (!validation.valid) return { state, validation }
    const schedules = { ...state.schedules }, current = schedules[entry.sectionId] || { sectionId: entry.sectionId, entries: [], publicationStatus: 'DRAFT' }
    const saved = { ...entry, ...demoEntryTimes(state.settings, entry.periodIndex, entry.duration || 1), generated: false }
    schedules[entry.sectionId] = { ...current, publicationStatus: 'DRAFT', entries: entry.id ? current.entries.map(row => row.id === entry.id ? saved : row) : [...current.entries, saved] }
    return { state: this.save({ ...state, schedules }), validation }
  },
  removeEntry(state, sectionId, entryId) {
    const schedules = { ...state.schedules }, current = schedules[sectionId]
    if (!current) return state
    schedules[sectionId] = { ...current, publicationStatus: 'DRAFT', entries: current.entries.filter(row => row.id !== entryId) }
    return this.save({ ...state, schedules })
  },
  validate(state, scope) { return validateDemoSchedules(state, scope) },
  publish(state, scope) {
    const result = this.validate(state, scope)
    if (!result.valid) return { state, validation: result }
    const schedules = { ...state.schedules }
    demoAcademicData.sections.filter(section => section.branchId === scope.branchId && section.semesterId === scope.semesterId).forEach(section => {
      if (schedules[section.id]) schedules[section.id] = { ...schedules[section.id], publicationStatus: 'PUBLISHED' }
    })
    return { state: this.save({ ...state, schedules }), validation: result }
  },
  moveToDraft(state, scope) {
    const schedules = { ...state.schedules }
    demoAcademicData.sections.filter(section => section.branchId === scope.branchId && section.semesterId === scope.semesterId).forEach(section => {
      if (schedules[section.id]) schedules[section.id] = { ...schedules[section.id], publicationStatus: 'DRAFT' }
    })
    return this.save({ ...state, schedules })
  },
  setFacultyAllocation(state, sectionId, subjectId, facultyId) {
    const allocations = state.allocations.filter(row => !(row.sectionId === sectionId && row.subjectId === subjectId))
    if (facultyId) allocations.push({ sectionId, subjectId, facultyId })
    const schedules = { ...state.schedules }
    if (schedules[sectionId]) schedules[sectionId] = { ...schedules[sectionId], publicationStatus: 'DRAFT' }
    return this.save({ ...state, allocations, schedules })
  },
}
