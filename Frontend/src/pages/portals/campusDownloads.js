const csvCell = value => `"${String(value ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`
export function mentoringCsv(students, notes) {
  return [['Roll number', 'Student', 'Branch', 'CGPA', 'Preparation', 'Mentoring notes'], ...students.map(row => [row.roll, row.name, row.branch, row.cgpa, notes[row.id]?.status || 'Not started', notes[row.id]?.note || ''])].map(row => row.map(csvCell).join(',')).join('\r\n')
}
const ical = value => String(value || '').replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(';', '\\;').replaceAll(',', '\\,')
export function eventCalendar(event) {
  const date = event.date.replaceAll('-', '')
  const match = event.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!match) throw new Error('Invalid event time')
  const hour = Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0)
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Digital Campus//Faculty Workspace//EN', 'BEGIN:VEVENT', `UID:${event.id}@faculty.digitalcampus`, 'DTSTAMP:20261028T000000Z', `DTSTART;TZID=Asia/Kolkata:${date}T${String(hour).padStart(2, '0')}${match[2]}00`, `SUMMARY:${ical(event.title)}`, `LOCATION:${ical(event.venue)}`, `DESCRIPTION:${ical(event.description)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
}
export function downloadText(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
