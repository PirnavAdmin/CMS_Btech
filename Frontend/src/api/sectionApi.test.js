import { readFile } from 'node:fs/promises'
import test from 'node:test'
import assert from 'node:assert/strict'

const source = (await readFile(new URL('./apiEndpoints.js', import.meta.url), 'utf8')).replace(/^\uFEFF/, '').replace(/^import .*$/gm, '').replaceAll('import.meta.env', '({ DEV: false, VITE_API_BASE_URL: "https://example.test" })')
const { sectionApi } = await import(`data:text/javascript;base64,${Buffer.from(`const getAccessToken = () => 'test'; const collegeRequest = (url, options) => ({ url, options });\n${source}`).toString('base64')}`)
const section = { collegeId: 1, academicYearId: 2, courseId: 3, branchId: 4, semesterId: 5, name: 'Section A', code: 'CSE-A', capacity: 60 }

test('section creation sends an explicit numeric department ID', async () => {
  const previous = globalThis.fetch
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.method, 'POST')
      assert.equal(JSON.parse(options.body).departmentId, 7)
      return Response.json({ data: { sectionId: 9 } })
    }
    assert.equal((await sectionApi.create({ ...section, departmentId: '7' })).id, 9)
  } finally { globalThis.fetch = previous }
})

for (const departmentId of [undefined, null, '', 0]) {
  test('section saves without department: ' + String(departmentId), async () => {
    const previous = globalThis.fetch
    let calls = 0
    try {
      globalThis.fetch = async (url, options) => {
        calls++
        assert.equal(options.method, 'POST')
        const body = JSON.parse(options.body)
        assert.equal(body.departmentId, null)
        assert.equal(body.courseId, 3)
        assert.equal(body.branchId, 4)
        return Response.json({ data: { sectionId: 10 } })
      }
      assert.equal((await sectionApi.create({ ...section, departmentId })).id, 10)
      assert.equal(calls, 1)
    } finally { globalThis.fetch = previous }
  })
}
