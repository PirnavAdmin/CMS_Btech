export const CONTENT_LIMIT = 8000
export const UPLOAD_ONLY_HEADER = 'Syllabus document notes'
const CONTENT_HEADER = 'Subject syllabus content'

export const contentFields = [
  ['description', 'Syllabus Description'], ['objectives', 'Course Objectives'],
  ['prerequisites', 'Prerequisites'], ['hours', 'Total Teaching Hours'],
  ['textbooks', 'Textbooks'], ['references', 'Reference Books'],
  ['authors', 'Author Name'], ['publisher', 'Publisher'], ['edition', 'Edition'],
  ['resources', 'Online Learning Resources'],
]
export const unitFields = [
  ['title', 'Unit Title'], ['topics', 'Topics'], ['description', 'Detailed Description'],
  ['hours', 'Teaching Hours'], ['outcomes', 'Learning Outcomes'],
]
export const outcomeFields = [['code', 'Outcome Code'], ['description', 'Outcome Description']]

const fieldBlock = (values, fields) => fields.flatMap(([key, label]) => {
  const content = String(values[key] ?? '').trim()
  return content ? [label + ':', ...content.split(/\r?\n/).map(line => '  ' + line)] : []
})

export function serializeSubjectContent(content) {
  const units = (content.units || []).flatMap((unit, index) => ['Unit ' + (index + 1), ...fieldBlock(unit, unitFields)])
  const outcomes = (content.outcomes || []).flatMap((outcome, index) => ['Outcome ' + (index + 1), ...fieldBlock(outcome, outcomeFields)])
  return [CONTENT_HEADER, ...fieldBlock(content, contentFields), ...units, ...outcomes].join('\n')
}

export function readSubjectContent(description = '') {
  const lines = String(description).split(/\r?\n/)
  const content = { units: [], outcomes: [] }
  if (lines[0] === UPLOAD_ONLY_HEADER) return { ...content, description: lines.slice(1).join('\n') }
  if (lines[0] !== CONTENT_HEADER) return { ...content, description: String(description) }
  let item = content
  let fields = contentFields
  let key
  for (const line of lines.slice(1)) {
    if (/^Unit \d+$/.test(line) || /^Outcome \d+$/.test(line)) {
      const isUnit = line.startsWith('Unit')
      item = {}
      fields = isUnit ? unitFields : outcomeFields
      content[isUnit ? 'units' : 'outcomes'].push(item)
      key = undefined
    } else if (line.startsWith('  ') && key) {
      item[key] = key in item ? item[key] + '\n' + line.slice(2) : line.slice(2)
    } else {
      key = fields.find(([, label]) => line === label + ':')?.[0]
    }
  }
  return content
}

export function hasSubjectContent(description = '') {
  return !String(description).startsWith(UPLOAD_ONLY_HEADER + '\n') && description !== UPLOAD_ONLY_HEADER
}

export function validateSubjectContent(content) {
  if (content.units.some(unit => !unit.title?.trim())) return 'Enter a title for each unit.'
  if (content.outcomes.some(outcome => !outcome.code?.trim() || !outcome.description?.trim())) return 'Complete the code and description for each course outcome.'
  const hours = [content.hours, ...content.units.map(unit => unit.hours)].filter(value => String(value ?? '').trim())
  if (hours.some(value => !Number.isFinite(Number(value)) || Number(value) < 0)) return 'Teaching hours must be non-negative numbers.'
  if (serializeSubjectContent(content).length > CONTENT_LIMIT) return 'Syllabus content exceeds the server limit of 8,000 characters.'
  return ''
}
