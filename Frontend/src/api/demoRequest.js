export const demoModules = ['College Management', 'Academic Years', 'Courses', 'Departments', 'Branches', 'Semesters', 'Sections', 'Student Admission', 'Student Profile', 'Student Promotion', 'Attendance', 'Examinations', 'Results']
export const demoRoles = ['College Administrator', 'Principal', 'Director', 'Registrar', 'HOD', 'Faculty', 'IT Administrator', 'Management', 'Other']
export const demoTimes = ['10:00 AM – 11:00 AM', '11:00 AM – 12:00 PM', '2:00 PM – 3:00 PM', '3:00 PM – 4:00 PM', '4:00 PM – 5:00 PM']
export const demoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
export const emptyDemo = { fullName: '', email: '', mobile: '', institution: '', role: '', otherRole: '', city: '', state: '', studentCount: '', interestedModules: [], preferredDate: '', preferredTime: '', message: '', consent: false }
export function normalizeDemo(values) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, key === 'studentCount' ? (value === '' ? null : Number(value)) : key === 'otherRole' && values.role !== 'Other' ? '' : typeof value === 'string' ? value.trim() : value]))
}
export function validateDemo(v) {
  const errors = {}
  if (v.fullName.trim().length < 2 || !/\p{L}/u.test(v.fullName)) errors.fullName = 'Enter your full name (at least 2 characters).'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) errors.email = 'Enter a valid work or college email.'
  if (!/^[6-9]\d{9}$/.test(v.mobile)) errors.mobile = 'Enter a 10-digit Indian mobile number starting with 6–9.'
  if (!v.institution.trim()) errors.institution = 'Enter your institution name.'
  if (!demoRoles.includes(v.role)) errors.role = 'Select your role.'
  if (v.role === 'Other' && !v.otherRole.trim()) errors.otherRole = 'Enter your designation.'
  if (v.studentCount !== '' && (!Number.isInteger(Number(v.studentCount)) || Number(v.studentCount) < 1)) errors.studentCount = 'Enter a positive whole number.'
  if (v.preferredDate && (!/^\d{4}-\d{2}-\d{2}$/.test(v.preferredDate) || v.preferredDate < demoToday())) errors.preferredDate = 'Choose today or a future date.'
  if (!v.consent) errors.consent = 'Please agree to be contacted about your demo.'
  return errors
}
export async function submitDemoRequest(request) {
  // TODO: Replace mock demo request submission with backend API when available.
  // No HTTP request or browser persistence: the request exists only in this session.
  if (Object.keys(validateDemo({ ...request, studentCount: request.studentCount ?? '' })).length) throw new Error('Please check your details and try again.')
  await new Promise(resolve => setTimeout(resolve, 800))
  return { mock: true, reference: `DEMO-${demoToday().slice(0, 4)}-${crypto.randomUUID().slice(0, 8).toUpperCase()}` }
}
