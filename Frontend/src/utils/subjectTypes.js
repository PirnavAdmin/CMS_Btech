const formatSubjectType = value => String(value ?? '').trim().toLowerCase().replace(/\b\w/g, character => character.toUpperCase())

const COMMON_SUBJECT_TYPES = ['Theory', 'Practical']

export function subjectTypeOptions() {
  const options = new Map()
  for (const subjectType of COMMON_SUBJECT_TYPES) {
    const label = formatSubjectType(subjectType)
    if (!label) continue
    const normalized = label.toLowerCase()
    if (!options.has(normalized)) options.set(normalized, { value: label, label })
  }
  return [...options.values()]
}
