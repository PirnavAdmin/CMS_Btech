const formatSubjectType = value => String(value ?? '').trim().toLowerCase().replace(/\b\w/g, character => character.toUpperCase())

export function subjectTypeOptions(subjects) {
  const options = new Map()
  for (const subjectType of [...subjects.map(subject => subject.subjectType), 'Practical']) {
    const label = formatSubjectType(subjectType)
    if (!label) continue
    const normalized = label.toLowerCase()
    if (!options.has(normalized)) options.set(normalized, { value: label, label })
  }
  return [...options.values()]
}
