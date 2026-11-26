export const SYLLABUS_MAX_FILE_SIZE = 25 * 1024 * 1024
export const SYLLABUS_ALLOWED_EXTENSIONS = Object.freeze([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'txt', 'rtf',
  'odt', 'ods', 'odp', 'jpg', 'jpeg', 'png',
])
export const SYLLABUS_ACCEPT = SYLLABUS_ALLOWED_EXTENSIONS.map(extension => '.' + extension).join(',')

const extensionOf = name => String(name || '').split('.').pop()?.toLowerCase() || ''
export const formatFileSize = bytes => {
  const size = Number(bytes) || 0
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / (1024 * 1024)).toFixed(1) + ' MB'
}
export const fileIdentity = file => [
  String(file?.name || '').trim().toLowerCase(),
  Number(file?.size) || 0,
  Number(file?.lastModified) || 0,
].join('|')
export function validateSyllabusFile(file, maxSize = SYLLABUS_MAX_FILE_SIZE) {
  const extension = extensionOf(file?.name)
  if (!SYLLABUS_ALLOWED_EXTENSIONS.includes(extension)) return '.' + (extension || 'unknown') + ' files are not supported.'
  if (Number(file?.size) > maxSize) return 'Files must be ' + formatFileSize(maxSize) + ' or smaller.'
  return ''
}
export function classifySyllabusFile(file) {
  const extension = extensionOf(file?.name)
  if (extension === 'pdf') return 'PDF'
  if (['jpg', 'jpeg', 'png'].includes(extension)) return 'Image'
  if (['doc', 'docx', 'odt', 'rtf'].includes(extension)) return 'Document'
  if (['xls', 'xlsx', 'ods', 'csv'].includes(extension)) return 'Spreadsheet'
  if (['ppt', 'pptx', 'odp'].includes(extension)) return 'Presentation'
  return 'Text'
}
