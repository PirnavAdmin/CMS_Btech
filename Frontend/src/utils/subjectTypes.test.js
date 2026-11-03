import test from 'node:test'
import assert from 'node:assert/strict'
import { subjectTypeOptions } from './subjectTypes.js'

test('subject type options collapse casing and whitespace duplicates', () => {
  const options = subjectTypeOptions([
    { subjectType: 'Theory' },
    { subjectType: 'THEORY' },
    { subjectType: ' theory ' },
    { subjectType: 'Practical' },
  ])
  assert.deepEqual(options, [
    { value: 'Theory', label: 'Theory' },
    { value: 'Practical', label: 'Practical' },
  ])
})
