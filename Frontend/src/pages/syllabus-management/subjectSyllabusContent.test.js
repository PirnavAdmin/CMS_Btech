import assert from 'node:assert/strict'
import test from 'node:test'
import { hasSubjectContent, readSubjectContent, serializeSubjectContent, validateSubjectContent, UPLOAD_ONLY_HEADER } from './subjectSyllabusContent.js'

test('round-trips syllabus sections and ordered units without changing the API shape', () => {
  const content = {
    description: 'An overview\nUnit 5\nTopics:',
    objectives: 'Practice',
    prerequisites: 'Intro',
    hours: '12.5',
    textbooks: 'Textbook',
    resources: 'Course website',
    units: [{ title: 'Trees', topics: 'Insertion\nTraversal', hours: '4' }, { title: 'Graphs', outcomes: 'Compare paths' }],
    outcomes: [{ code: 'CO1', description: 'Explain trees' }],
  }
  const saved = serializeSubjectContent(content)
  assert.deepEqual(readSubjectContent(saved), content)
  assert.ok(hasSubjectContent(saved))
  assert.equal(validateSubjectContent(content), '')
})

test('keeps uploads and legacy descriptions distinct and validates backend length', () => {
  assert.equal(hasSubjectContent(UPLOAD_ONLY_HEADER), false)
  assert.equal(hasSubjectContent(UPLOAD_ONLY_HEADER + '\nCourse outline'), false)
  assert.deepEqual(readSubjectContent(UPLOAD_ONLY_HEADER + '\nCourse outline'), { units: [], outcomes: [], description: 'Course outline' })
  assert.equal(readSubjectContent('Legacy description').description, 'Legacy description')
  assert.match(validateSubjectContent({ units: [{ title: '' }], outcomes: [] }), /title/)
  assert.match(validateSubjectContent({ units: [], outcomes: [], hours: '-1' }), /non-negative/)
  assert.match(validateSubjectContent({ units: [], outcomes: [], description: 'x'.repeat(8000) }), /server limit/)
})
