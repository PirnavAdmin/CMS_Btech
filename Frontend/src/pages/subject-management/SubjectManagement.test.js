import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { transformWithOxc } from 'vite'

const source = readFileSync(new URL('./SubjectManagement.jsx', import.meta.url), 'utf8')
const editorSource = source.slice(source.indexOf('function Editor('), source.indexOf('function Details('))
const { code } = await transformWithOxc(editorSource, 'Editor.jsx', { jsx: { runtime: 'classic' } })
const factory = new Function('React', 'useState', 'key', 'getSemestersForAcademicLevel', 'entityName', 'formatSubjectType', 'Field', 'Input', 'Select', 'ELECTIVE_TYPES', `${code}; return Editor`)

function render(tab, { saving = false, complete = true } = {}) {
  const state = ['Year 1', tab, ''], updates = [], saves = []
  let index = 0
  const stub = () => null
  const Editor = factory({ createElement }, () => {
    const current = index++
    return [state[current], value => updates.push([current, value])]
  }, String, values => values, () => '', value => value, stub, stub, stub, ['None'])
  const tree = Editor({
    form: { academicYearId: complete ? '1' : '', courseId: '1', branchId: '1', semesterId: '1', subjectCode: 'SUB1', subjectName: 'Subject', credits: 3, electiveType: 'None' },
    masters: { courses: [], years: [] }, branches: [], semesters: [], levels: [], typeOptions: [],
    change: stub, close: stub, save: event => saves.push(event), saving,
  })
  const nodes = []
  const visit = node => {
    if (!node || typeof node !== 'object') return
    nodes.push(node)
    for (const child of [node.props?.children].flat(Infinity)) visit(child)
  }
  visit(tree)
  let prevented = false
  const submit = () => nodes.find(node => node.type === 'form').props.onSubmit({ preventDefault() { prevented = true } })
  return { nodes, updates, saves, submit, prevented: () => prevented }
}

test('submitting before Hours & Marks advances the wizard without saving', () => {
  for (const [tab, next] of [['mapping', 'info'], ['info', 'config']]) {
    const page = render(tab)
    page.submit()
    assert.equal(page.saves.length, 0)
    assert.equal(page.prevented(), true)
    assert.ok(page.updates.some(([index, value]) => index === 1 && value === next))
  }
})

test('incomplete mapping cannot advance through form submission', () => {
  const page = render('mapping', { complete: false })
  page.submit()
  assert.equal(page.saves.length, 0)
  assert.ok(!page.updates.some(([index]) => index === 1))
})

test('Continue and Save have distinct identities to prevent click reuse on the final step', () => {
  const info = render('info'), config = render('config')
  const next = info.nodes.find(node => node.type === 'button' && node.key === 'continue')
  const save = config.nodes.find(node => node.type === 'button' && node.key === 'save')
  assert.equal(next.props.type, 'button')
  assert.equal(save.props.type, 'submit')
  next.props.onClick()
  assert.equal(info.saves.length, 0)
  config.submit()
  assert.equal(config.saves.length, 1)
})

test('a pending save cannot submit again', () => {
  const page = render('config', { saving: true })
  page.submit()
  assert.equal(page.saves.length, 0)
})
