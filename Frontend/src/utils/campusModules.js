const field = (key, label, type = 'text', required = true, options) => ({ key, label, type, required, options })
const area = (key, label, columns, fields = [], description = '') => ({ key, label, columns, fields, description })
export const campusModules = {
  library: {
    title: 'Library', subtitle: 'Catalog, physical copies and circulation in one workspace.',
    areas: [
      area('catalog', 'Book Catalog', ['Title', 'ISBN', 'Author', 'Category'], [field('title', 'Title'), field('isbn', 'ISBN'), field('author', 'Author'), field('category', 'Category'), field('publisher', 'Publisher', 'text', false), field('edition', 'Edition', 'text', false), field('subject', 'Subject', 'text', false), field('language', 'Language', 'text', false)]),
      area('copies', 'Book Copies', ['Accession number', 'Book title', 'Barcode', 'Shelf', 'Condition'], [field('accession', 'Accession number'), field('title', 'Book title'), field('barcode', 'Barcode'), field('shelf', 'Shelf / Location'), field('condition', 'Condition', 'select', true, ['Good', 'Worn', 'Damaged'])]),
      area('circulation', 'Issue & Return', ['Borrower', 'Book', 'Accession number', 'Issue date', 'Due date', 'Status'], [], 'Issue and return records will appear when circulation is connected. Borrower eligibility, copy availability and configured loan rules must be verified before issuing a book.'),
      area('borrowers', 'Borrowers', ['Name', 'Student / Faculty ID', 'Type', 'Active loans', 'Status']),
      area('reservations', 'Reservations', ['Borrower', 'Book', 'Requested on', 'Queue position', 'Status']),
      area('fines', 'Fines', ['Borrower', 'Accession number', 'Overdue days', 'Fine', 'Payment status'], [], 'Fines follow the institution’s configured library rules. No fines are calculated in this workspace.'),
      area('reports', 'Reports', ['Report', 'Period', 'Generated on', 'Status']),
    ],
  },
  'meetings-events': {
    title: 'Meetings/Events', subtitle: 'Plan campus meetings, coordinate events and track participation.',
    areas: [
      area('meetings', 'Meetings', ['Title', 'Starts at', 'Ends at', 'Venue'], [field('title', 'Title'), field('start', 'Starts at', 'datetime-local'), field('end', 'Ends at', 'datetime-local'), field('venue', 'Venue'), field('organizer', 'Organizer'), field('audience', 'Audience', 'select', true, ['Faculty', 'Students', 'Faculty and students']), field('agenda', 'Agenda', 'textarea')]),
      area('events', 'Events', ['Title', 'Starts at', 'Ends at', 'Venue'], [field('title', 'Title'), field('start', 'Starts at', 'datetime-local'), field('end', 'Ends at', 'datetime-local'), field('venue', 'Venue'), field('organizer', 'Organizer'), field('capacity', 'Capacity', 'number'), field('deadline', 'Registration deadline', 'datetime-local'), field('description', 'Description', 'textarea')]),
      area('registrations', 'Registrations', ['Event', 'Participant', 'Registration date', 'Status']),
      area('attendance', 'Attendance', ['Meeting / Event', 'Participant', 'Check-in', 'Attendance']),
      area('minutes', 'Minutes & Actions', ['Meeting title', 'Owner', 'Due date', 'Action item'], [field('title', 'Meeting title'), field('owner', 'Owner'), field('due', 'Due date', 'date'), field('action', 'Action item', 'textarea'), field('minutes', 'Minutes', 'textarea', false)]),
    ],
  },
  placement: {
    title: 'Placement', subtitle: 'Coordinate employers, recruitment drives and student opportunities.',
    areas: [
      area('drives', 'Recruitment Drives', ['Title', 'Company', 'Role', 'Drive date'], [field('title', 'Title'), field('company', 'Company'), field('role', 'Role'), field('date', 'Drive date', 'date'), field('deadline', 'Application deadline', 'date'), field('venue', 'Venue / Mode'), field('eligibility', 'Eligibility criteria', 'textarea'), field('description', 'Job description', 'textarea')]),
      area('companies', 'Companies', ['Company', 'Industry', 'Contact name', 'Contact email'], [field('company', 'Company'), field('industry', 'Industry'), field('contact', 'Contact name'), field('email', 'Contact email', 'email'), field('website', 'Website', 'url', false)]),
      area('applications', 'Applications', ['Student', 'Company', 'Role', 'Applied on', 'Status'], [], 'Applications will appear once recruitment services are connected. Eligibility must be checked against the drive’s approved criteria.'),
      area('interviews', 'Interviews', ['Company', 'Role', 'Round', 'Starts at'], [field('company', 'Company'), field('role', 'Role'), field('round', 'Round'), field('start', 'Starts at', 'datetime-local'), field('end', 'Ends at', 'datetime-local'), field('venue', 'Venue / Meeting link')]),
      area('offers', 'Offers', ['Student', 'Company', 'Role', 'Offer date', 'Status']),
      area('reports', 'Reports', ['Program', 'Eligible students', 'Applicants', 'Placed', 'Placement rate']),
    ],
  },
  results: {
    title: 'Official Results', subtitle: 'Published semester results, student statements and academic records.',
    areas: [
      area('semester', 'Semester Results', ['Student', 'Roll number', 'Semester', 'Total marks', 'Percentage', 'Credits', 'SGPA', 'CGPA', 'Result status']),
      area('student', 'Student Results', ['Subject', 'Subject code', 'Marks', 'Credits', 'Grade', 'Pass / Fail']),
      area('backlogs', 'Backlogs', ['Student', 'Roll number', 'Subject', 'Semester', 'Attempts', 'Status']),
      area('memos', 'Marks Memos', ['Student', 'Roll number', 'Semester', 'Published on', 'Memo number']),
    ],
  },
}

export function validateCampusDraft(area, values) {
  for (const field of area.fields) {
    const value = String(values[field.key] || '').trim()
    if (field.required && !value) return `${field.label} is required.`
    if (field.type === 'number' && value && (!Number.isInteger(Number(value)) || Number(value) < 1)) return `${field.label} must be a positive whole number.`
  }
  if (values.start && values.end && values.end <= values.start) return 'End time must be after start time.'
  if (values.deadline && (values.start || values.date) && values.deadline > (values.start || values.date)) return 'Registration or application deadline must not be after the event or drive starts.'
  if (values.isbn) {
    const isbn = values.isbn.replace(/[-\s]/g, '')
    const valid10 = /^\d{9}[\dX]$/i.test(isbn) && [...isbn.toUpperCase()].reduce((sum, digit, index) => sum + (digit === 'X' ? 10 : Number(digit)) * (10 - index), 0) % 11 === 0
    const valid13 = /^\d{13}$/.test(isbn) && [...isbn].reduce((sum, digit, index) => sum + Number(digit) * (index % 2 ? 3 : 1), 0) % 10 === 0
    if (!valid10 && !valid13) return 'Enter a valid ISBN-10 or ISBN-13, including its check digit.'
  }
  return ''
}
