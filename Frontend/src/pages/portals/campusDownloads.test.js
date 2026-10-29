import test from 'node:test'
import assert from 'node:assert/strict'
import { eventCalendar, mentoringCsv } from './campusDownloads.js'
import { facultyNavigation, facultySidebarKeys } from '../../components/portals/portalNavigation.js'
import { restoredFacultyScreens } from '../../features/faculty/routeConfig.js'
import { canViewScreen } from '../../auth/screenPermissions.js'
test('meeting links and the legacy events URL reach the restored faculty workspace', () => {
  for (const screen of ['meetings', 'events', 'placements']) {
    assert.ok(restoredFacultyScreens.includes(screen))
    assert.equal(canViewScreen(`/faculty-portal/${screen}`, 'faculty', {}), true)
    assert.equal(canViewScreen(`/faculty-portal/${screen}`, 'student', {}), false)
  }
  for (const key of ['meetings', 'placements']) {
    assert.ok(facultySidebarKeys.has(key), `${key} must be visible in the teaching sidebar`)
    assert.ok(facultyNavigation.some(([screen]) => screen === key))
  }
  assert.equal(facultyNavigation.filter(([key]) => ['meetings', 'events'].includes(key)).length, 1)
})
test('calendar download preserves local event time and escapes text', () => {
  const text = eventCalendar({id:'e1', date:'2026-11-02',time:'03:30 PM', title:'Meeting, review',venue:'Hall',description:'Task; one'})
  assert.match(text, /DTSTART;TZID=Asia\/Kolkata:20261102T153000/)
  assert.ok(text.includes('SUMMARY:Meeting\\, review'))
  assert.ok(text.endsWith('END:VCALENDAR'))
})
test('mentoring CSV exports saved status and escapes spreadsheet formulas', () => {
  const csv = mentoringCsv([{id:'1',roll:'R1',name:'=bad',branch:'CSE',cgpa:'8'}], {'1':{status:'Resume review',note:'Needs practice'}})
  assert.ok(csv.includes('"\'=bad"'))
  assert.ok(csv.includes('Resume review'))
  assert.ok(csv.includes('Needs practice'))
})
