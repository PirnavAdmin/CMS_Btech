import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MarksEntry } from '../pages/examinations/marks-management/MarksManagement'
const fixture=vi.hoisted(()=>({edit:true,scope:{academicYears:[],courses:[],branches:[],semesters:[],sections:[]}}))
vi.mock('../layouts/DashboardLayout',()=>({default:({children})=>children}))
vi.mock('../auth/ScreenAccess',()=>({useScreenAccess:()=>({canAction:()=>fixture.edit})}))
vi.mock('../context/AcademicContext',()=>({useAcademic:()=>fixture.scope}))
vi.mock('../components/ExportMenu',()=>({default:()=>null}))
vi.mock('../services/facultyService',()=>({default:{list:async()=>[]}}))
vi.mock('../services/studentService',()=>({default:{getAllProfiles:async()=>[]}}))
vi.mock('../services/subjectService',()=>({default:{getSubjects:async()=>[]}}))
vi.mock('../auth/collegeApi',()=>({fetchExams:async()=>({items:[]}),fetchExamTypes:async()=>({items:[]})}))
vi.mock('../api/apiEndpoints',async original=>({...await original(),marksApi:{list:async()=>[],summaryReport:async()=>({})},sectionAssignmentApi:{listBySection:async()=>[]}}))
afterEach(cleanup)
beforeEach(()=>{fixture.edit=true;delete fixture.scope.selectedCollegeId;delete fixture.scope.selectedAcademicYearId})
test('marks assessment opens a shared native dialog and cancellation returns to directory',async()=>{render(<MemoryRouter><MarksEntry/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'Add Marks'}));const dialog=screen.getByRole('dialog',{name:'Add Marks Assessment'});expect(within(dialog).getByRole('button',{name:'Confirm'})).toBeTruthy();fireEvent(dialog,new Event('cancel',{cancelable:true}));expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByRole('heading',{name:'Marks Records'})).toBeTruthy()})
test('readonly marks access hides create control',async()=>{fixture.edit=false;render(<MemoryRouter><MarksEntry/></MemoryRouter>);await screen.findByRole('heading',{name:'Marks Records'});expect(screen.queryByRole('button',{name:'Add Marks'})).toBeNull()})
test('switching working academic year closes the previous marks draft', async () => {
  const view = render(<MemoryRouter><MarksEntry /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: 'Add Marks' }))
  expect(screen.getByRole('dialog', { name: 'Add Marks Assessment' })).toBeTruthy()
  fixture.scope.selectedAcademicYearId = 12
  view.rerender(<MemoryRouter><MarksEntry /></MemoryRouter>)
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(await screen.findByRole('heading', { name: 'Marks Records' })).toBeTruthy()
})
test('marks submission requires a working academic scope', async () => {
  render(<MemoryRouter><MarksEntry /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: 'Add Marks' }))
  const dialog = screen.getByRole('dialog', { name: 'Add Marks Assessment' })
  fireEvent.submit(dialog.querySelector('form'))
  expect(await within(dialog).findByText('Select a working college and academic year before saving marks.')).toBeTruthy()
})

test('marks workflow exposes four views and opens upload from the entry toolbar', async () => {
  render(<MemoryRouter initialEntries={['/marks-management/marks-entry']}><MarksEntry /></MemoryRouter>)
  const navigation = screen.getByRole('navigation', { name: 'Marks management workflows' })
  expect(within(navigation).getAllByRole('link').map(link => link.textContent)).toEqual([
    'Marks Entry', 'Submitted Marks', 'Marks Approval', 'Publish Results',
  ])
  fireEvent.click(screen.getByRole('button', { name: 'Upload Marks' }))
  const dialog = screen.getByRole('dialog', { name: 'Upload Marks' })
  expect(within(dialog).getByRole('button', { name: 'Download CSV template' })).toBeTruthy()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('section entry waits for the roster and scheduled marks maximum', async () => {
  render(<MemoryRouter><MarksEntry /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: 'Add Marks' }))
  const dialog = within(screen.getByRole('dialog', { name: 'Add Marks Assessment' }))
  fireEvent.click(dialog.getByRole('checkbox', { name: 'Enter marks for a section' }))
  expect(dialog.getByText(/select a section, examination and scheduled subject/i)).toBeTruthy()
  expect(dialog.getByRole('button', { name: 'Save Drafts' }).disabled).toBe(true)
  expect(dialog.getByRole('button', { name: 'Submit Section Marks' }).disabled).toBe(true)
})
