export const localDay = value => {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function validateActivity(form, kind) {
  const errors = {}
  if (!form.title?.trim()) errors.title = 'Enter a title.'
  if (!form.start || !Number.isFinite(new Date(form.start).getTime())) errors.start = 'Select a start date and time.'
  if (!form.end || !Number.isFinite(new Date(form.end).getTime())) errors.end = 'Select an end date and time.'
  if (!errors.start && !errors.end && new Date(form.end) <= new Date(form.start)) errors.end = 'End must be after start.'
  if (kind === 'meeting' && form.start?.slice(0, 10) !== form.end?.slice(0, 10)) errors.end = 'Meetings must end on the same date.'
  if (kind === 'event' && form.capacity && (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 1)) errors.capacity = 'Enter a positive whole number.'
  if (kind === 'event' && form.deadline && (!Number.isFinite(new Date(form.deadline).getTime()) || new Date(form.deadline) > new Date(form.start))) errors.deadline = 'Registration must close before the event starts.'
  return errors
}
