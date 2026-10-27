import test from 'node:test'
import assert from 'node:assert/strict'
import { facultyService, setSimulateError } from '../../services/facultyService.js'

test('dashboard summary derives KPIs and supporting content from faculty mock data', async () => {
  const snapshot = await facultyService.getDashboardSnapshot()

  assert.deepEqual(snapshot.kpis, {
    myStudents: 182,
    mySubjects: 3,
    assignedSections: 3,
    todaysClasses: 3,
  })
  assert.equal(snapshot.todayClasses.length, snapshot.kpis.todaysClasses)
  assert.ok(snapshot.pendingActions.length > 0)
  assert.ok(snapshot.shortageAlerts.length > 0)
})

test('dashboard mock service reports failures so the page can offer retry', async () => {
  setSimulateError(true)
  try {
    await assert.rejects(facultyService.getDashboardSnapshot(), /local faculty preview data/)
  } finally {
    setSimulateError(false)
  }
})
