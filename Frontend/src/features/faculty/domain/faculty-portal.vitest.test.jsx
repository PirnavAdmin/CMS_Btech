import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { AttendanceScreen } from '../FacultyWorkspacePage.jsx'
import { buildAttendanceRecords, calculateLeaveDays, getAttendanceCounts, hasLeaveOverlap, validateMarks } from './validation.js'

afterEach(cleanup)

const roster = [
  { id: 'std-1', rollNumber: '23CSE001', name: 'Aarav Sharma', sectionId: 'cse-3a' },
  { id: 'std-2', rollNumber: '23CSE002', name: 'Priya Patel', sectionId: 'cse-3a' },
  { id: 'std-3', rollNumber: '23CSE003', name: 'Rohan Reddy', sectionId: 'cse-3a' },
]

const attendanceData = {
  sessions: [],
  students: roster,
  sections: [{ id: 'cse-3a', name: 'CSE Semester 3 Section A', shortName: 'CSE-3A' }],
  assignments: [{
    id: 'alloc-cs301',
    sectionId: 'cse-3a',
    subjectId: 'sub-cs301',
    subjectCode: 'CS301',
    subjectName: 'Data Structures & Algorithms',
  }],
  myAttendance: { currentMonth: 'October 2026', attendancePercentage: 95, workingDays: 20, presentDays: 19, onLeaveDays: 1, lateArrivals: 0, dailyLog: [] },
  shortageAlerts: [],
}

describe('faculty attendance grid', () => {
  it('marks the complete roster present and updates its live counters', async () => {
    const user = userEvent.setup()
    const { container } = render(<AttendanceScreen data={attendanceData} action={operation => operation()} />)

    await user.click(screen.getByRole('button', { name: /mark all present/i }))
    const counters = container.querySelector('.fw-counter-row')
    expect(counters.textContent).toContain('Present 3')
    expect(counters.textContent).toContain('Absent 0')
    expect(counters.textContent).toContain('Late 0')
    expect(screen.getByRole('button', { name: /submit attendance/i }).disabled).toBe(false)
  })

  it('uses P, arrow navigation and A keyboard shortcuts for selected students', () => {
    render(<AttendanceScreen data={attendanceData} action={operation => operation()} />)

    fireEvent.keyDown(window, { key: 'p' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'a' })

    expect(screen.getByRole('button', { name: 'Aarav Sharma: present' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Priya Patel: absent' }).getAttribute('aria-pressed')).toBe('true')
  })
})

describe('faculty marks and leave validation', () => {
  it('validates marks against the configured maximum', () => {
    expect(validateMarks('', 30)).toBe(true)
    expect(validateMarks('0', 30)).toBe(true)
    expect(validateMarks('30', 30)).toBe(true)
    expect(validateMarks('31', 30)).toBe(false)
    expect(validateMarks('-1', 30)).toBe(false)
  })

  it('counts leave working days and rejects overlapping pending or approved leave', () => {
    expect(calculateLeaveDays('2026-10-26', '2026-10-30')).toBe(5)
    expect(calculateLeaveDays('2026-10-26', '2026-10-26', true)).toBe(0.5)
    const requests = [
      { status: 'Approved', fromDate: '2026-10-20', toDate: '2026-10-21' },
      { status: 'Pending', fromDate: '2026-10-28', toDate: '2026-10-29' },
      { status: 'Rejected', fromDate: '2026-11-02', toDate: '2026-11-03' },
    ]
    expect(hasLeaveOverlap('2026-10-21', '2026-10-22', requests)).toBe(true)
    expect(hasLeaveOverlap('2026-11-02', '2026-11-03', requests)).toBe(false)
  })

  it('requires a valid attendance status for every roster entry', () => {
    const partial = { 'std-1': 'PRESENT', 'std-2': 'ABSENT' }
    expect(getAttendanceCounts(partial, roster.length).complete).toBe(false)
    expect(buildAttendanceRecords(roster, partial)).toBeNull()
    const complete = { ...partial, 'std-3': 'LATE' }
    expect(getAttendanceCounts(complete, roster.length)).toMatchObject({ present: 1, absent: 1, late: 1, complete: true })
    expect(buildAttendanceRecords(roster, complete)[2].status).toBe('LATE')
  })
})
