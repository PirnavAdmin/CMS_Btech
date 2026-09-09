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
  if (v.fullName.trim().length < 2 || !/^\p{L}[\p{L}\p{M} .?'-]*$/u.test(v.fullName.trim())) errors.fullName = 'Enter your full name (at least 2 characters).'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) errors.email = 'Enter a valid work or college email.'
  if (!/^[6-9]\d{9}$/.test(v.mobile.trim())) errors.mobile = 'Enter a 10-digit Indian mobile number starting with 6–9.'
  if (!v.institution.trim()) errors.institution = 'Enter your organization or college name.'
  if (!demoRoles.includes(v.role)) errors.role = 'Select your role.'
  if (v.role === 'Other' && !v.otherRole.trim()) errors.otherRole = 'Enter your designation.'
  if (v.studentCount !== '' && (!Number.isInteger(Number(v.studentCount)) || Number(v.studentCount) < 1)) errors.studentCount = 'Enter a positive whole number.'
  if (v.preferredDate && (!/^\d{4}-\d{2}-\d{2}$/.test(v.preferredDate) || v.preferredDate < demoToday())) errors.preferredDate = 'Choose today or a future date.'
  if (!v.consent) errors.consent = 'Please agree to be contacted about your demo.'
  return errors
}
export async function submitDemoRequest(request) {
  if (Object.keys(validateDemo({ ...request, studentCount: request.studentCount ?? '' })).length) throw new Error('Please check your details and try again.')
  const values = normalizeDemo(request)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const response = await fetch(demoRequestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'ngrok-skip-browser-warning': 'true' },
      signal: controller.signal,
      body: JSON.stringify({
        fullName: values.fullName,
        email: values.email,
        mobile: values.mobile,
        institutionName: values.institution,
        role: values.role === 'Other' ? values.otherRole : values.role,
        city: values.city || null,
        state: values.state || null,
        numberOfStudents: values.studentCount,
        agreeToContact: values.consent,
      }),
    })
    const text = await response.text()
    let body = null
    try { body = text ? JSON.parse(text) : null } catch { /* Reject unexpected proxy or HTML responses below. */ }
    if (!response.ok || body?.success === false || body?.isSuccess === false) {
      const errors = body?.errors
      const details = errors && typeof errors === 'object' ? Object.values(errors).flat().filter(value => typeof value === 'string').join(' ') : ''
      throw new Error(details || body?.message || body?.detail || body?.title || 'Unable to submit your demo request. Please try again.')
    }
    if (response.status !== 204 && (!body || typeof body !== 'object')) throw new Error('Your request could not be confirmed. Please try again later.')
    const data = body?.data ?? body
    return { success: true, reference: data?.reference || data?.requestId || data?.id }
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The request timed out. Please try again shortly.')
    if (error instanceof TypeError) throw new Error('Unable to connect. Please check your connection and try again.')
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
const demoRequestUrl = `${import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://abreast-curling-tutor.ngrok-free.dev').trim().replace(/\/+$/, '')}/api/v1/demo-requests`
