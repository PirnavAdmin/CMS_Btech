import { selectedCollegeId } from './collegeScope.js'
const resources = /\/api\/(?:v1\/)?(?:departments|courses|branches|semester|semesters|sections|section-assignments|course-structures|students|student-[\w-]+|faculty(?:-[\w-]+)?|subjects|credits|credit-[\w-]+|elective[\w-]*|results|attendance[\w-]*|promotions|rooms|classrooms|timetable[\w-]*|fee-structures|hostel-fees|transport-fees)(?:\/|\?|$)/i
export function collegeRequest(url, options = {}, collegeId = selectedCollegeId()) {
  if (!collegeId || !resources.test(url)) return { url, options }
  const [path, query = ''] = url.split('?'), params = new URLSearchParams(query)
  params.set('collegeId', collegeId)
  let scopedOptions = options
  if (typeof options.body === 'string' && ['POST', 'PUT', 'PATCH'].includes(String(options.method).toUpperCase())) {
    try {
      const body = JSON.parse(options.body)
      if (body && typeof body === 'object' && !Array.isArray(body)) scopedOptions = { ...options, body: JSON.stringify({ ...body, collegeId: body.collegeId || collegeId }) }
    } catch { /* Preserve non-JSON bodies. */ }
  }
  return { url: path + '?' + params, options: scopedOptions }
}
