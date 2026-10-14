import { classificationOf, relationId } from './subjectDirectory.js'

export const mapApiSubject = subject => ({
  ...subject,
  id: subject.subjectId ?? subject.id,
  subjectId: subject.subjectId ?? subject.id,
  courseId: relationId(subject, 'course'),
  branchId: relationId(subject, 'branch'),
  semesterId: relationId(subject, 'semester'),
  academicYearId: relationId(subject, 'academicYear'),
  departmentId: relationId(subject, 'department'),
  electiveType: classificationOf(subject),
  course: subject.courseName ?? subject.course ?? '',
  branch: subject.branchName ?? subject.branch ?? '',
  semester: subject.semesterName ?? subject.semester ?? '',
  status: Number(subject.status) === 0 || String(subject.status).toLowerCase() === 'inactive' ? 'Inactive' : 'Active',
})

export const subjectApiPayload = subject => ({
  subjectCode: String(subject.subjectCode || '').trim(),
  subjectName: String(subject.subjectName || '').trim(),
  courseId: Number(subject.courseId),
  branchId: Number(subject.branchId),
  semesterId: Number(subject.semesterId),
  academicYearId: subject.academicYearId ? Number(subject.academicYearId) : null,
  credits: subject.credits === '' || subject.credits == null ? null : Number(subject.credits),
  subjectType: subject.subjectType || null,
  electiveType: subject.electiveType || null,
  description: subject.description || null,
  status: subject.status === 'Inactive' || Number(subject.status) === 0 ? 0 : 1,
})

// GET /api/v1/subjects supports Page/PageSize (live Swagger, 2026-09-28).
// Fetch every page so academic filters cannot silently omit later subjects.
export async function readSubjectPages(fetchPage) {
  const all = []
  let previousPage = ''
  for (let page = 1; ; page += 1) {
    const response = await fetchPage({ Page: page, PageSize: 500 })
    let current = response
    for (let depth = 0; depth < 5 && current && !Array.isArray(current); depth += 1) {
      current = current.items ?? current.records ?? current.results ?? current.rows ?? current.content ?? current.data
    }
    if (!Array.isArray(current)) throw new Error('The subject API returned an invalid subject list. Please retry.')
    const signature = JSON.stringify(current)
    if (current.length && signature === previousPage) throw new Error('The subject API repeated a page. The complete subject directory could not be loaded.')
    all.push(...current)
    if (current.length < 500) return all
    previousPage = signature
  }
}
