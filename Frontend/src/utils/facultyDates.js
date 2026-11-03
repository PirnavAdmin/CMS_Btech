export function validFacultyDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function facultyDateErrors(data, today) {
  const errors = {}
  for (const key of ['dob', 'joiningDate']) {
    if (data[key] && (!validFacultyDate(data[key]) || data[key] > today)) errors[key] = 'Enter a valid date that is not in the future.'
  }
  if (validFacultyDate(data.dob) && validFacultyDate(data.joiningDate) && !errors.dob && !errors.joiningDate && data.joiningDate <= data.dob) {
    errors.joiningDate = `Joining date must be after the date of birth (${data.dob}). Check the birth year in Personal Details.`
  }
  return errors
}

export function joiningDateMinimum(dob) {
  if (!validFacultyDate(dob)) return undefined
  const date = new Date(`${dob}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}
