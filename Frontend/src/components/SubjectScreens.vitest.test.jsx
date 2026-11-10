import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SubjectManagement, { SubjectDetailsPage } from '../pages/subject-management/SubjectManagement'
import subjectService from '../services/subjectService'
const fixture = vi.hoisted(() => ({ edit: true, scope: rows => rows.filter(row => !row.collegeId || row.collegeId === 7) }))
vi.mock('../layouts/DashboardLayout', () => ({ default: ({ children }) => children }))
vi.mock('../auth/ScreenAccess', () => ({ useScreenAccess: () => ({ canAction: () => fixture.edit }) }))
vi.mock('../context/AcademicContext', () => ({ useAcademic: () => ({ selectedCollegeId: '7', selectedAcademicYearId: '1', selectedAcademicYear: { name: '2026-2027' }, scopeRecords: fixture.scope }) }))
vi.mock('../components/ExportMenu', () => ({ default: () => <button>Export</button> }))
vi.mock('../components/SearchableSelect', () => ({ default: ({ label, value, options = [], onChange, disabled }) => <label>{label}<select aria-label={label} disabled={disabled} value={value} onChange={event => onChange(event.target.value)}><option value="">Select {label}</option>{options.map(option => <option key={option.id ?? option.value ?? option} value={option.id ?? option.value ?? option}>{option.name ?? option.label ?? option.semesterName ?? option}</option>)}</select></label> }))
vi.mock('../services/academicService', () => ({ isRecordActive: row => row.status !== 'Inactive', default: {
  getAcademicYears: vi.fn(async () => [{ id: '1', name: '2026-2027', status: 'Active' }]),
  getCourses: vi.fn(async () => [{ id: '2', collegeId: 7, name: 'B.Tech', status: 'Active' }]),
  getBranches: vi.fn(async () => [{ id: '3', collegeId: 7, courseId: '2', name: 'CSE' }]),
  getSemesters: vi.fn(async () => [{ id: '4', collegeId: 7, courseId: '2', branchId: '3', academicYearId: '1', name: 'Semester 1', semesterNumber: 1 }]),
} }))
vi.mock('../services/subjectService', () => ({ default: { getSubjects: vi.fn(), getSubject: vi.fn(), createSubject: vi.fn(), updateSubject: vi.fn(), updateSubjectStatus: vi.fn(),deleteSubject:vi.fn(async()=>({})),getSubjectDependencies:vi.fn(async()=>[]) } }))
const subject = { id: '5', collegeId: 7, academicYearId: '1', courseId: '2', branchId: '3', semesterId: '4', subjectCode: 'CS101', subjectName: 'Programming', subjectType: 'Theory', electiveType: 'Core Subject', credits: 4, status: 'Active', lectureHours: 3, internalMarks: 30, externalMarks: 70 }
beforeEach(() => { vi.clearAllMocks(); fixture.edit = true; subjectService.getSubjects.mockResolvedValue([subject]); subjectService.getSubject.mockResolvedValue(subject) })
afterEach(cleanup)
const mount = (path = '/subject-management') => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/subject-management" element={<SubjectManagement />} /><Route path="/subject-management/:id" element={<SubjectDetailsPage />} /></Routes></MemoryRouter>)
test('subject list opens details above the directory and cancels cleanly', async () => {
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'View CS101' }))
  const dialog = await screen.findByRole('dialog', { name: 'Programming' })
  expect(screen.getByRole('table')).toBeTruthy()
  expect(within(dialog).getByText('Academic Mapping')).toBeTruthy()
  fireEvent(dialog, new Event('cancel', { cancelable: true })); expect(screen.queryByRole('dialog')).toBeNull()
})
test('add subject validates mapping before leaving the first step and retains the directory', async () => {
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Add Subject' }))
  const dialog = await screen.findByRole('dialog', { name: 'Add Subject' })
  fireEvent.click(within(dialog).getByRole('button', { name: /Continue/ }))
  expect(within(dialog).getByRole('alert')).toBeTruthy(); expect(subjectService.createSubject).not.toHaveBeenCalled()
  expect(screen.getByRole('table')).toBeTruthy()
  fireEvent(dialog, new Event('cancel', { cancelable: true })); expect(screen.queryByRole('dialog')).toBeNull()
})
test('read-only subject access hides add/edit/status actions', async () => {
  fixture.edit = false; mount(); await screen.findByRole('button', { name: 'View CS101' })
  expect(screen.queryByRole('button', { name: 'Add Subject' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Edit CS101' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Deactivate CS101' })).toBeNull()
})
test('existing direct subject URLs resolve to a shared detail dialog', async () => {
  mount('/subject-management/5'); const dialog = await screen.findByRole('dialog', { name: 'Programming' })
  expect(within(dialog).getByText('Academic Configuration')).toBeTruthy()
})

test('subject creation preserves engineering fields and uses the existing create service', async () => {
  subjectService.createSubject.mockResolvedValue({id:'6'})
  mount(); fireEvent.click(await screen.findByRole('button',{name:'Add Subject'}))
  const dialog=await screen.findByRole('dialog',{name:'Add Subject'}), form=within(dialog)
  await waitFor(()=>expect(form.getByLabelText('Course').options.length).toBeGreaterThan(1))
  for(const [label,value] of [['Course','2'],['Branch','3'],['Academic Level','1st Year'],['Semester','4']]) fireEvent.change(form.getByLabelText(label),{target:{value}})
  fireEvent.click(form.getByRole('button',{name:/Continue/}))
  fireEvent.change(form.getByLabelText(/Subject Name/),{target:{value:'Algorithms'}})
  fireEvent.change(form.getByLabelText(/Subject Code/),{target:{value:'CS102'}})
  fireEvent.click(form.getByRole('checkbox',{name:'Is Elective'}))
  fireEvent.click(form.getByRole('button',{name:/Continue/}))
  fireEvent.change(form.getByLabelText('Credits'),{target:{value:'4'}})
  fireEvent.submit(dialog.querySelector('form'))
  await waitFor(()=>expect(subjectService.createSubject).toHaveBeenCalledWith(expect.objectContaining({academicYearId:'1',courseId:'2',branchId:'3',semesterId:'4',subjectCode:'CS102',subjectName:'Algorithms',credits:'4',electiveType:'Elective'})))
  await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
})

test('subject status deactivation requires confirmation and propagates through the status service',async()=>{
  subjectService.updateSubjectStatus.mockResolvedValue({})
  mount();fireEvent.click(await screen.findByRole('button',{name:'Deactivate CS101'}))
  const dialog=await screen.findByRole('dialog',{name:'Deactivate Subject?'})
  expect(subjectService.updateSubjectStatus).not.toHaveBeenCalled()
  fireEvent.click(within(dialog).getByRole('button',{name:'Confirm Deactivate'}))
  await waitFor(()=>expect(subjectService.updateSubjectStatus).toHaveBeenCalledWith('5','Inactive'))
})

test('subject editing preserves the record and engineering fields across API failure and retry',async()=>{
 subjectService.updateSubject.mockRejectedValueOnce(new Error('Subject update denied')).mockResolvedValue({});mount();fireEvent.click(await screen.findByRole('button',{name:'Edit CS101'}));const dialog=await screen.findByRole('dialog',{name:'Edit Subject'}),form=within(dialog);await waitFor(()=>expect(form.getByLabelText('Course').options.length).toBeGreaterThan(1));fireEvent.click(form.getByRole('button',{name:/Continue/}));fireEvent.change(form.getByLabelText(/Subject Name/),{target:{value:'Updated Programming'}});fireEvent.click(form.getByRole('button',{name:/Continue/}));fireEvent.click(form.getByRole('button',{name:'Update Subject'}));await form.findByText('Subject update denied');fireEvent.click(form.getByRole('button',{name:'Update Subject'}));await waitFor(()=>expect(subjectService.updateSubject).toHaveBeenCalledTimes(2));expect(subjectService.updateSubject).toHaveBeenLastCalledWith('5',expect.objectContaining({subjectName:'Updated Programming',credits:4,lectureHours:3,internalMarks:30,externalMarks:70}));expect(subjectService.createSubject).not.toHaveBeenCalled()
})
test('inactive subject activation calls the existing status service with its real ID',async()=>{
 subjectService.getSubjects.mockResolvedValue([{...subject,status:'Inactive'}]);subjectService.updateSubjectStatus.mockResolvedValue({});mount();fireEvent.click(await screen.findByRole('button',{name:'Activate CS101'}));await waitFor(()=>expect(subjectService.updateSubjectStatus).toHaveBeenCalledWith('5','Active'))
})

test('subject deletion checks dependencies and calls the existing delete service only after confirmation',async()=>{
 subjectService.getSubjectDependencies.mockResolvedValue([]);mount();fireEvent.click(await screen.findByRole('button',{name:'Delete CS101'}));const dialog=await screen.findByRole('dialog',{name:'Delete Subject?'});await waitFor(()=>expect(within(dialog).getByRole('button',{name:'Confirm delete'}).disabled).toBe(false));expect(subjectService.deleteSubject).not.toHaveBeenCalled();fireEvent.click(within(dialog).getByRole('button',{name:'Confirm delete'}));await waitFor(()=>expect(subjectService.deleteSubject).toHaveBeenCalledWith('5'))
})
test('subject dependencies block deletion without losing records',async()=>{
 subjectService.getSubjectDependencies.mockResolvedValue([{totalCount:2}]);mount();fireEvent.click(await screen.findByRole('button',{name:'Delete CS101'}));const dialog=await screen.findByRole('dialog');await within(dialog).findByText('This subject has dependent records and cannot be deleted.');expect(within(dialog).getByRole('button',{name:'Confirm delete'}).disabled).toBe(true);expect(subjectService.deleteSubject).not.toHaveBeenCalled()
})

test('subject creation without backend identity blocks repeated creation and avoids success',async()=>{
 subjectService.createSubject.mockResolvedValue({});mount();fireEvent.click(await screen.findByRole('button',{name:'Add Subject'}));const dialog=screen.getByRole('dialog'),form=within(dialog);await waitFor(()=>expect(form.getByLabelText('Course').options.length).toBeGreaterThan(1));for(const [label,value]of[['Course','2'],['Branch','3'],['Academic Level','1st Year'],['Semester','4']])fireEvent.change(form.getByLabelText(label),{target:{value}});fireEvent.click(form.getByRole('button',{name:/Continue/}));fireEvent.change(form.getByLabelText(/Subject Name/),{target:{value:'Algorithms'}});fireEvent.change(form.getByLabelText(/Subject Code/),{target:{value:'CS102'}});fireEvent.click(form.getByRole('button',{name:/Continue/}));fireEvent.click(form.getByRole('button',{name:'Create Subject'}));await form.findByText('The server did not return a subject identity. Verify the directory before creating again.');fireEvent.click(form.getByRole('button',{name:'Create Subject'}));await form.findByText('Verify the previous subject creation in the directory before another submission.');expect(subjectService.createSubject).toHaveBeenCalledTimes(1)
})


test('elective edit entry uses the full engineering editor and cancellation returns to electives', async () => {
  render(<MemoryRouter initialEntries={[{pathname:'/subject-management',state:{subjectAction:{mode:'edit',id:'5',returnTo:'/elective-management'}}}]}><Routes><Route path="/subject-management" element={<SubjectManagement/>}/><Route path="/elective-management" element={<p>Elective directory returned</p>}/></Routes></MemoryRouter>)
  const dialog=await screen.findByRole('dialog',{name:'Edit Subject'})
  fireEvent.click(within(dialog).getByRole('button',{name:/Hours & Marks/}))
  expect(within(dialog).getByLabelText(/Lecture Hours/i).value).toBe('3')
  expect(within(dialog).getByLabelText(/Internal Marks/i).value).toBe('30')
  fireEvent(dialog,new Event('cancel',{cancelable:true}))
  expect(await screen.findByText('Elective directory returned')).toBeTruthy()
  expect(subjectService.updateSubject).not.toHaveBeenCalled()
})

test('direct subject details error offers a real API retry',async()=>{
 subjectService.getSubject.mockRejectedValueOnce(Error('Details offline')).mockResolvedValue(subject);mount('/subject-management/5');await screen.findByText('Details offline');fireEvent.click(screen.getByRole('button',{name:'Retry details'}));expect(await screen.findByRole('dialog',{name:'Programming'})).toBeTruthy();expect(subjectService.getSubject).toHaveBeenCalledTimes(2)
})
test('subject dependency request failure blocks deletion until explicit retry',async()=>{
 subjectService.getSubjectDependencies.mockRejectedValueOnce(Error('Dependency service offline')).mockResolvedValue([]);mount();fireEvent.click(await screen.findByRole('button',{name:'Delete CS101'}));await screen.findByText('Dependency service offline');expect(subjectService.deleteSubject).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:/Retry dependency check/}));await waitFor(()=>expect(subjectService.getSubjectDependencies).toHaveBeenCalledTimes(2))
})
