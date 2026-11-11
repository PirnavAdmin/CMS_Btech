import { describe, expect, it } from 'vitest'
import { localDay, validateActivity } from '../utils/meetingSchedule'

describe('meeting and event scheduling', () => {
  const form = { title: 'Academic Council', start: '2026-11-11T09:00', end: '2026-11-11T10:00' }
  it('requires scheduling fields and rejects equal, reversed and invalid times', () => {
    expect(validateActivity(form, 'meeting')).toEqual({})
    expect(validateActivity({}, 'meeting')).toMatchObject({ title: expect.any(String), start: expect.any(String), end: expect.any(String) })
    expect(validateActivity({ ...form, end: form.start }, 'meeting').end).toBeTruthy()
    expect(validateActivity({ ...form, end: '2026-11-11T08:00' }, 'meeting').end).toBeTruthy()
    expect(validateActivity({ ...form, start: 'invalid' }, 'meeting').start).toBeTruthy()
  })
  it('restricts meetings to one date while allowing events across dates', () => {
    const overnight = { ...form, end: '2026-11-12T10:00' }
    expect(validateActivity(overnight, 'meeting').end).toBeTruthy()
    expect(validateActivity(overnight, 'event')).toEqual({})
  })
  it('validates optional capacity and registration deadline', () => {
    expect(validateActivity({ ...form, capacity: '1.5', deadline: '2026-11-11T09:01' }, 'event')).toMatchObject({ capacity: expect.any(String), deadline: expect.any(String) })
    expect(validateActivity({ ...form, capacity: '1', deadline: form.start }, 'event')).toEqual({})
    expect(validateActivity({ ...form, capacity: '-2' }, 'event').capacity).toBeTruthy()
  })
  it('keeps calendar selections in local calendar dates', () => {
    expect(localDay(new Date(2026, 0, 1, 0, 1))).toBe('2026-01-01')
    expect(localDay('invalid')).toBe('')
  })
})

