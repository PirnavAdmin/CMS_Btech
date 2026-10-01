// Keep form defaults useful for inputs without presenting them as entered details.
export const admissionPreview = (data, defaults) => {
  const edited = data.previewEditedFields
  if (!edited) return data // Existing records predate field tracking.
  const project = (value, base, path = '') => {
    if (Array.isArray(value)) return value
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [
        key, project(item, base?.[key], path ? `${path}.${key}` : key),
      ]))
    }
    if (edited[path] || (path === 'academic.academicYear' && edited['academic.academicYearId'])
      || (path === 'admission.college' && edited['admission.collegeId'])) return value
    if (['fees.hostelFee', 'fees.transportFee', 'fees.scholarshipAmount'].includes(path) && Number(value) === 0) return ''
    if (['application.number', 'application.registrationNumber', 'application.date', 'application.registrationDate',
      'academic.academicYear', 'academic.academicYearId', 'admission.college', 'admission.collegeId'].includes(path)) return ''
    return value === base ? '' : value
  }
  return project(data, defaults)
}
