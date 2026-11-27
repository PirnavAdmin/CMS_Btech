// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import SyllabusManagement from './SyllabusManagement.jsx'

const mocks = vi.hoisted(() => ({
  academic: {},
  permissions: new Set(),
  list: vi.fn(),
  subjects: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  upload: vi.fn(),
}))

vi.mock('../../layouts/DashboardLayout.jsx', () => ({ default: ({ children }) => children }))
vi.mock('../../context/AcademicContext.jsx', () => ({ useAcademic: () => mocks.academic }))
vi.mock('../../auth/ScreenAccess.jsx', () => ({ useScreenAccess: () => ({ canAction: (_, action) => mocks.permissions.has(action) }) }))
vi.mock('../../api/apiEndpoints.js', () => ({ subjectApi: { list: mocks.subjects } }))
vi.mock('../../services/syllabusApi.js', () => ({ syllabusApi: { list: mocks.list, create: mocks.create, update: mocks.update, uploadDocument: mocks.upload } }))
vi.mock('../../utils/toast.js', () => ({ showSuccess: vi.fn(), showError: vi.fn() }))

const combinations = [
  { program: 'B.Tech', courseId: 1, departmentId: 10, branchId: 101, count: 8 },
  { program: 'B.Tech', courseId: 1, departmentId: 10, branchId: 102, count: 8 },
  { program: 'B.Tech', courseId: 2, departmentId: 20, branchId: 201, count: 8 },
  { program: 'Degree', courseId: 3, departmentId: 30, branchId: 301, count: 6 },
]
const firstSemester = branchId => branchId * 10 + 1
const subject = { id: 91, subjectName: 'Algorithms', subjectCode: 'ALG', branchId: 101, semesterId: firstSemester(101), credits: 3 }
const nextSubject = { ...subject, id: 92, subjectName: 'Data Structures', subjectCode: 'DS', semesterId: firstSemester(101) + 1 }
const syllabus = { regulationId: 'R20', subjectId: 91, syllabusId: 800, academicYearId: 50, effectiveAcademicYearId: 50, courseId: 1, departmentId: 10, branchId: 101, semesterId: firstSemester(101), title: 'Existing syllabus', category: 'Subject-wise Syllabus', version: '1.0', status: 'Published', documents: [] }
const renderPage = () => render(<MemoryRouter><SyllabusManagement /></MemoryRouter>)
const select = (label, id) => fireEvent.change(within(screen.getByRole('form', { name: 'Filter and manage syllabus' })).getByRole('combobox', { name: label, exact: true }), { target: { value: String(id) } })
const apply = () => fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }))

beforeEach(() => {
  vi.resetAllMocks()
  mocks.permissions = new Set(['create', 'edit', 'export'])
  mocks.academic = {
    selectedCollegeId: '7',
    selectedAcademicYearId: '50',
    academicYears: [{ id: 50, name: '2026–27' }, { id: 51, name: '2027–28' }],
    activeCourses: [
      { id: 1, name: 'B.Tech Computing' },
      { id: 2, name: 'B.Tech Electrical' },
      { id: 3, name: 'Bachelor of Science' },
    ],
    activeDepartments: [{ id: 10, name: 'Computing' }, { id: 20, name: 'Electrical' }, { id: 30, name: 'Science' }],
    activeBranches: combinations.map(({ branchId, courseId, departmentId }) => ({ id: branchId, name: 'Branch ' + branchId, courseId, departmentId })),
    activeSemesters: combinations.flatMap(({ branchId, courseId, departmentId, count }) =>
      Array.from({ length: branchId === 301 ? count - 1 : count }, (_, i) => ({ id: firstSemester(branchId) + i, semesterNumber: i + 1, academicYearId: 50, branchId, courseId, departmentId, regulationId: 'R20' })),
    ),
  }
  mocks.list.mockImplementation(async params => !params.branchId || String(params.branchId) === '101' ? [syllabus] : [])
  mocks.subjects.mockResolvedValue([subject, nextSubject])
  mocks.upload.mockReturnValue({ promise: Promise.resolve({ documentId: 900 }), cancel: vi.fn() })
})

afterEach(cleanup)

describe('syllabus filters and subject workspace', () => {
  test.each(combinations)('applies $program branch $branchId with $count semester options', async ({ program, courseId, departmentId, branchId, count }) => {
    renderPage()
    await screen.findByRole('table')
    const requestCount = mocks.list.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: program, exact: true }))
    select('Department', departmentId)
    select('Branch', branchId)
    const semester = screen.getByRole('combobox', { name: 'Semester' })
    expect(within(semester).getAllByRole('option')).toHaveLength(count + 1)
    if (branchId === 301) expect(within(semester).getByRole('option', { name: /Semester 6.*not configured/ }).disabled).toBe(true)
    select('Semester', firstSemester(branchId))
    expect(screen.queryByRole('combobox', { name: 'Regulation' })).toBeNull()
    expect(mocks.list).toHaveBeenCalledTimes(requestCount)
    apply()
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({
      collegeId: '7', courseId: String(courseId), departmentId: String(departmentId), branchId: String(branchId), semesterId: String(firstSemester(branchId)),
    })))
    await waitFor(() => expect(mocks.subjects).toHaveBeenLastCalledWith(expect.objectContaining({ branchId: String(branchId), semesterId: String(firstSemester(branchId)) })))
  })

  test('only replaces applied subjects after Apply and clears stale rows while loading', async () => {
    let finish
    mocks.subjects.mockImplementation(async params => params.branchId === '102' ? new Promise(resolve => { finish = resolve }) : [subject])
    renderPage()
    await screen.findByRole('table')
    select('Branch', 102)
    expect(screen.getByRole('combobox', { name: 'Semester' }).value).toBe('')
    expect(screen.getByRole('button', { name: 'Apply Filters' }).disabled).toBe(true)
    expect(screen.getByText('Algorithms')).toBeTruthy()
    select('Semester', firstSemester(102))
    apply()
    expect(screen.queryByText('Algorithms')).toBeNull()
    await waitFor(() => expect(finish).toBeTypeOf('function'))
    finish([])
    expect(await screen.findByText(/No subjects are mapped/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect((await screen.findByRole('table')).textContent).toContain('Algorithms')
  })

  test('uses scoped real rows, exact column order, and permission-based actions', async () => {
    mocks.permissions.clear()
    renderPage()
    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('columnheader').slice(1).map(th => th.textContent)).toEqual([
      'S.No', 'Subject Code', 'Subject Name', 'Credits', 'Syllabus Status', 'Syllabus Document', 'Actions',
    ])
    expect(within(table).getByText('Published')).toBeTruthy()
    expect(within(table).getByRole('button', { name: 'Create/Edit Syllabus' }).disabled).toBe(true)
    expect(within(table).getByRole('button', { name: 'Upload Syllabus' }).disabled).toBe(true)
    expect(screen.queryByLabelText('Semester cards')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Syllabus Documents (0)' }))
    expect(screen.getByText('No syllabus files yet')).toBeTruthy()
  })

  test('edits an existing subject syllabus and uploads separately without editing it', async () => {
    mocks.update.mockResolvedValue({})
    renderPage()
    const table = await screen.findByRole('table')
    fireEvent.click(within(table).getByRole('button', { name: 'Create/Edit Syllabus' }))
    const draft = screen.getByRole('dialog', { name: 'Edit syllabus details' })
    await within(draft).findByRole('option', { name: /Algorithms/ })
    expect(within(draft).getByRole('textbox', { name: 'Subject Code' }).readOnly).toBe(true)
    fireEvent.click(within(draft).getByRole('button', { name: 'Add Unit' }))
    fireEvent.change(within(draft).getByRole('textbox', { name: 'Unit Title' }), { target: { value: 'Trees and graphs' } })
    fireEvent.click(within(draft).getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('800', expect.objectContaining({ subjectId: 91, description: expect.stringContaining('Trees and graphs') })))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    mocks.update.mockClear()
    fireEvent.click(within(await screen.findByRole('table')).getByRole('button', { name: 'Upload Syllabus' }))
    const upload = screen.getByRole('dialog', { name: 'Upload Syllabus' })
    fireEvent.change(within(upload).getByLabelText('Choose syllabus documents'), { target: { files: [new File(['test'], 'lecture.pdf', { type: 'application/pdf' })] } })
    fireEvent.click(within(upload).getByRole('button', { name: 'Upload Syllabus', exact: true }))
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith('800', expect.objectContaining({ name: 'lecture.pdf' }), expect.any(Function), undefined, '7'))
    expect(mocks.update).not.toHaveBeenCalled()
    await waitFor(() => expect(mocks.list.mock.calls.filter(([params]) => !params.semesterId).length).toBeGreaterThan(1))
  })

  test('requires explicit mapping confirmation for multiple files in a batch', async () => {
    mocks.create.mockResolvedValue({ syllabusId: 901 })
    mocks.list.mockResolvedValue([])
    renderPage()
    const table = await screen.findByRole('table')
    fireEvent.click(within(table).getByRole('checkbox', { name: 'Select all subjects' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bulk Upload', exact: true }))
    const batch = screen.getByRole('dialog', { name: 'Upload Syllabus (Batch)' })
    fireEvent.change(within(batch).getByLabelText('Document for ALG'), { target: { files: ['notes.pdf', 'examples.pdf'].map(name => new File(['test'], name, { type: 'application/pdf' })) } })
    const submit = within(batch).getByRole('button', { name: 'Upload Syllabus (Batch)' })
    expect(submit.disabled).toBe(true)
    fireEvent.click(within(batch).getByRole('checkbox', { name: /confirm each file/i }))
    fireEvent.click(submit)
    await within(batch).findByText('Completed')
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ subjectId: 91, semesterId: firstSemester(101), description: 'Syllabus document notes' }))
    expect(mocks.upload).toHaveBeenCalledTimes(2)
  })


  test('counts academic-year mappings and documents without counting duplicate versions', async () => {
    const firstMapping = { courseId: 1, branchId: 101, academicYearId: 50, semesterId: firstSemester(101), status: 1 }
    const otherMapping = { ...firstMapping, branchId: 102, semesterId: firstSemester(102) }
    mocks.subjects.mockResolvedValue([{ ...subject, mappings: [firstMapping, firstMapping, otherMapping, { ...otherMapping, academicYearId: 51 }, { ...otherMapping, semesterId: 1022, status: 0 }] }, nextSubject])
    mocks.list.mockImplementation(async params => params.semesterId ? [syllabus] : [
      { ...syllabus, documents: [{ documentId: 810, fileName: 'first.pdf' }] },
      { ...syllabus, syllabusId: 811, documents: [{ documentId: 810, fileName: 'first.pdf' }] },
      { ...syllabus, syllabusId: 812, branchId: 102, semesterId: firstSemester(102), description: 'Syllabus document notes', documents: [{ documentId: 813 }] },
      { ...syllabus, syllabusId: 814, academicYearId: 51, documents: [{ documentId: 815 }] },
    ])
    renderPage()
    const summary = await screen.findByRole('region', { name: 'Academic year syllabus summary' })
    const count = label => within(summary).getByText(label, { exact: true }).nextElementSibling.textContent
    await waitFor(() => expect(count('Syllabus Created')).toBe('1'))
    expect(count('Programs')).toBe('3')
    expect(count('Departments')).toBe('3')
    expect(count('Branches / Groups')).toBe('4')
    expect(count('Semesters')).toBe('29')
    expect(count('Subjects')).toBe('3')
    expect(count('Uploaded Documents')).toBe('2')
    expect(count('Pending')).toBe('2')
    expect(mocks.subjects).toHaveBeenCalledWith({ collegeId: '7', academicYearId: '50' })
    expect(mocks.list).toHaveBeenCalledWith({ collegeId: '7', academicYearId: '50' })
    fireEvent.click(screen.getByRole('button', { name: 'Common Syllabus' }))
    const common = screen.getByRole('dialog', { name: 'Common Syllabus' })
    expect(within(common).getByText(/Branch 102/)).toBeTruthy()
    expect(within(common).getAllByRole('button', { name: 'Open mapping' })).toHaveLength(2)
  })

  test('marks failed overview counts unavailable while scoped syllabus rows remain usable', async () => {
    mocks.list.mockImplementation(async params => {
      if (!params.semesterId) throw new Error('Year summary unavailable.')
      return [syllabus]
    })
    renderPage()
    expect(await screen.findByText('Year summary unavailable.')).toBeTruthy()
    const summary = screen.getByRole('region', { name: 'Academic year syllabus summary' })
    const count = label => within(summary).getByText(label, { exact: true }).nextElementSibling
    expect(count('Syllabus Created').getAttribute('aria-label')).toBe('Unavailable')
    expect(count('Uploaded Documents').getAttribute('aria-label')).toBe('Unavailable')
    expect(within(await screen.findByRole('table')).getByText('Published')).toBeTruthy()
  })

  test('shows permission errors and disables writes when syllabus records cannot be loaded', async () => {
    mocks.list.mockRejectedValue(Object.assign(new Error('Access denied for this college.'), { status: 403 }))
    renderPage()
    await within(screen.getByRole('region', { name: 'Semester subject workspace' })).findByText('Access denied for this college.', { exact: false })
    const table = await screen.findByRole('table')
    expect(within(table).getByRole('button', { name: 'Create/Edit Syllabus' }).disabled).toBe(true)
    expect(within(table).getByRole('button', { name: 'Upload Syllabus' }).disabled).toBe(true)
  })
})
