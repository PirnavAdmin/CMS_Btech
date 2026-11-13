import { StrictMode } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SubjectManagement, { SubjectDetailsPage, subjectMappingRows } from '../pages/subject-management/SubjectManagement'
import subjectService from '../services/subjectService'
import academicService from '../services/academicService'
const fixture = vi.hoisted(() => ({ edit: true, scope: rows => rows.filter(row => !row.collegeId || String(row.collegeId) === '7') }))
vi.mock('../layouts/DashboardLayout', () => ({ default: ({ children }) => children }))
vi.mock('../auth/ScreenAccess', () => ({ useScreenAccess: () => ({ canAction: () => fixture.edit }) }))
vi.mock('../context/AcademicContext', () => ({ useAcademic: () => ({ selectedCollegeId: '7', selectedAcademicYearId: '1', selectedAcademicYear: { name: '2026-2027' }, scopeRecords: fixture.scope }) }))
vi.mock('../components/ExportMenu', () => ({ default: () => <button>Export</button> }))
vi.mock('../components/SearchableSelect', () => ({ default: ({ label, value, options = [], onChange, disabled }) => <label>{label}<select aria-label={label} disabled={disabled} value={value} onChange={event => onChange(event.target.value)}><option value="">Select {label}</option>{options.map(option => <option key={option.id ?? option.value ?? option} value={option.id ?? option.value ?? option}>{option.name ?? option.label ?? option.semesterName ?? option}</option>)}</select></label> }))
vi.mock('../services/academicService', () => ({ isRecordActive: row => !['inactive', '0', 'false'].includes(String(row.status ?? row.isActive ?? 'Active').toLowerCase()), default: {
  getAcademicYears: vi.fn(async () => [{ id: '1', name: '2026-2027', status: 'Active' }]),
  getCourses: vi.fn(async () => [{ id: '2', collegeId: 7, name: 'B.Tech', status: 'Active' }]),
  getBranches: vi.fn(async () => [{ id: '3', collegeId: 7, courseId: '2', name: 'CSE' }]),
  getSemesters: vi.fn(async () => [{ id: '4', collegeId: 7, courseId: '2', branchId: '3', academicYearId: '1', name: 'Semester 1', semesterNumber: 1 }]),
} }))
vi.mock('../auth/collegeApi', () => {
  const lookup = method => async (...args) => {
    const rows = await academicService[method](...args)
    if (rows.loadError) throw new Error('Lookup unavailable')
    return { data: { success: true, data: rows } }
  }
  return { getCourses: lookup('getCourses'), getBranches: lookup('getBranches'), getSemesters: lookup('getSemesters') }
})
vi.mock('../services/subjectService', () => ({ default: { getSubjects: vi.fn(), getSubject: vi.fn(), createSubject: vi.fn(), updateSubject: vi.fn(), updateSubjectStatus: vi.fn(),deleteSubject:vi.fn(async()=>({})),getSubjectDependencies:vi.fn(async()=>[]) } }))
const subject = { id: '5', collegeId: 7, academicYearId: '1', courseId: '2', branchId: '3', semesterId: '4', subjectCode: 'CS101', subjectName: 'Programming', subjectType: 'Theory', electiveType: 'Core Subject', credits: 4, status: 'Active', lectureHours: 3, internalMarks: 30, externalMarks: 70 }
beforeEach(() => { vi.clearAllMocks(); fixture.edit = true; subjectService.getSubjects.mockResolvedValue([subject]); subjectService.getSubject.mockResolvedValue(subject) })
afterEach(cleanup)
const mount = (path = '/subject-management', strict = false) => {
  const app = <MemoryRouter initialEntries={[path]}><Routes><Route path="/subject-management" element={<SubjectManagement />} /><Route path="/subject-management/:id" element={<SubjectDetailsPage />} /></Routes></MemoryRouter>
  return render(strict ? <StrictMode>{app}</StrictMode> : app)
}
const mappingSelections = [['Course', '2'], ['Branch', '3'], ['Academic Level', '1st Year'], ['Semester', '4']]
const chooseMapping = async form => {
  for (const [label, value] of mappingSelections) {
    const select = form.getByLabelText(label)
    await waitFor(() => expect(Array.from(select.options).some(option => option.value === value)).toBe(true))
    fireEvent.change(select, { target: { value } })
  }
}
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
  await chooseMapping(form)
  fireEvent.click(form.getByRole('button',{name:/Continue/}))

  fireEvent.change(form.getByLabelText(/Subject Name/),{target:{value:'Algorithms'}})
  fireEvent.change(form.getByLabelText(/Subject Code/),{target:{value:'CS102'}})
  fireEvent.click(form.getByRole('checkbox',{name:'Is Elective'}))
  fireEvent.change(form.getByLabelText('Credits'),{target:{value:'4'}})
  fireEvent.change(form.getByLabelText('Lecture Hours'),{target:{value:'3'}})
  fireEvent.change(form.getByLabelText('Practical Hours'),{target:{value:'2'}})
  fireEvent.change(form.getByLabelText('Internal Marks'),{target:{value:'40'}})
  fireEvent.change(form.getByLabelText('External Marks'),{target:{value:'60'}})

  // Automatic calculation checks on Step 2
  expect(form.getByText('5 hrs')).toBeTruthy()
  expect(form.getByText('100')).toBeTruthy()

  // Navigate to Step 3 (Review and Save)
  fireEvent.click(form.getByRole('button',{name:/Continue/}))
  expect(form.getByRole('heading', { name: 'Review and Save' })).toBeTruthy()
  expect(form.getByText('CS102')).toBeTruthy()
  expect(form.getByText('Algorithms')).toBeTruthy()
  expect(form.getByText('Yes (Elective)')).toBeTruthy()

  // Navigate back to Step 2 and verify data persistence
  fireEvent.click(form.getByRole('button',{name:/Previous/}))
  expect(form.getByLabelText(/Subject Name/).value).toBe('Algorithms')
  expect(form.getByLabelText(/Subject Code/).value).toBe('CS102')
  expect(form.getByLabelText('Credits').value).toBe('4')

  // Return to Review and Save
  fireEvent.click(form.getByRole('button',{name:/Continue/}))
  fireEvent.click(form.getByRole('button', { name: 'Save Subject' }))

  await waitFor(()=>expect(subjectService.createSubject).toHaveBeenCalledWith(expect.objectContaining({
    academicYearId:'1',
    courseId:'2',
    branchId:'3',
    semesterId:'4',
    subjectCode:'CS102',
    subjectName:'Algorithms',
    credits:'4',
    lectureHours:'3',
    practicalHours:'2',
    internalMarks:'40',
    externalMarks:'60',
    electiveType:'Elective'
  })))
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
 subjectService.updateSubject.mockRejectedValueOnce(new Error('Subject update denied')).mockResolvedValue({});mount();fireEvent.click(await screen.findByRole('button',{name:'Edit CS101'}));const dialog=await screen.findByRole('dialog',{name:'Edit Subject'}),form=within(dialog);await waitFor(()=>expect(form.getByLabelText('Semester').value).toBe('4'));fireEvent.click(form.getByRole('button',{name:/Continue/}));fireEvent.change(form.getByLabelText(/Subject Name/),{target:{value:'Updated Programming'}});fireEvent.click(form.getByRole('button',{name:/Continue/}));fireEvent.click(form.getByRole('button',{name:'Update Subject'}));await form.findByText('Subject update denied');fireEvent.click(form.getByRole('button',{name:'Update Subject'}));await waitFor(()=>expect(subjectService.updateSubject).toHaveBeenCalledTimes(2));expect(subjectService.updateSubject).toHaveBeenLastCalledWith('5',expect.objectContaining({subjectName:'Updated Programming',credits:4,lectureHours:3,internalMarks:30,externalMarks:70}));expect(subjectService.createSubject).not.toHaveBeenCalled()
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
 subjectService.createSubject.mockResolvedValue({});mount();fireEvent.click(await screen.findByRole('button',{name:'Add Subject'}));const dialog=screen.getByRole('dialog'),form=within(dialog);await waitFor(()=>expect(form.getByLabelText('Course').options.length).toBeGreaterThan(1));await chooseMapping(form);fireEvent.click(form.getByRole('button',{name:/Continue/}));fireEvent.change(form.getByLabelText(/Subject Name/),{target:{value:'Algorithms'}});fireEvent.change(form.getByLabelText(/Subject Code/),{target:{value:'CS102'}});fireEvent.click(form.getByRole('button',{name:/Continue/}));fireEvent.click(form.getByRole('button',{name:'Save Subject'}));await form.findByText('The server did not return a subject identity. Verify the directory before creating again.');fireEvent.click(form.getByRole('button',{name:'Save Subject'}));await form.findByText('Verify the previous subject creation in the directory before another submission.');expect(subjectService.createSubject).toHaveBeenCalledTimes(1)
})


test('elective edit entry uses the full engineering editor and cancellation returns to electives', async () => {
  render(<MemoryRouter initialEntries={[{pathname:'/subject-management',state:{subjectAction:{mode:'edit',id:'5',returnTo:'/elective-management'}}}]}><Routes><Route path="/subject-management" element={<SubjectManagement/>}/><Route path="/elective-management" element={<p>Elective directory returned</p>}/></Routes></MemoryRouter>)
  const dialog=await screen.findByRole('dialog',{name:'Edit Subject'})
  await waitFor(() => expect(within(dialog).getByLabelText('Semester').value).toBe('4'))
  fireEvent.click(within(dialog).getByRole('button',{name:/Subject Details/}))
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

test('multiple subject creation toggles mode, applies shared academic mapping, dynamically adds/removes subjects, and saves all entries', async () => {
  subjectService.createSubject
    .mockResolvedValueOnce({ id: '101' })
    .mockResolvedValueOnce({ id: '102' })

  mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Add Multiple Subjects' }))
  const dialog = await screen.findByRole('dialog', { name: 'Add Multiple Subjects' })
  const form = within(dialog)

  await waitFor(() => expect(form.getByLabelText('Course').options.length).toBeGreaterThan(1))
  await chooseMapping(form)
  fireEvent.click(form.getByRole('button', { name: /Continue/ }))

  expect(form.getByText('1 Subject Added')).toBeTruthy()
  const nameInputs = form.getAllByLabelText(/Subject Name/)
  const codeInputs = form.getAllByLabelText(/Subject Code/)
  const creditInputs = form.getAllByLabelText('Credits')
  fireEvent.change(nameInputs[0], { target: { value: 'Data Structures' } })
  fireEvent.change(codeInputs[0], { target: { value: 'CS201' } })
  fireEvent.change(creditInputs[0], { target: { value: '4' } })

  fireEvent.click(form.getByRole('button', { name: /Add Another Subject/ }))
  expect(form.getByText('2 Subjects Added')).toBeTruthy()

  const updatedNameInputs = form.getAllByLabelText(/Subject Name/)
  const updatedCodeInputs = form.getAllByLabelText(/Subject Code/)
  const updatedCreditInputs = form.getAllByLabelText('Credits')
  fireEvent.change(updatedNameInputs[1], { target: { value: 'Computer Networks' } })
  fireEvent.change(updatedCodeInputs[1], { target: { value: 'CS202' } })
  fireEvent.change(updatedCreditInputs[1], { target: { value: '3' } })

  fireEvent.click(form.getByRole('button', { name: /Add Another Subject/ }))
  expect(form.getByText('3 Subjects Added')).toBeTruthy()
  fireEvent.click(form.getByRole('button', { name: 'Remove Subject 3' }))
  expect(form.getByText('2 Subjects Added')).toBeTruthy()

  fireEvent.click(form.getByRole('button', { name: /Continue/ }))

  expect(form.getByRole('heading', { name: 'Review and Save' })).toBeTruthy()
  expect(form.getByText('CS201')).toBeTruthy()
  expect(form.getByText('Data Structures')).toBeTruthy()
  expect(form.getByText('CS202')).toBeTruthy()
  expect(form.getByText('Computer Networks')).toBeTruthy()

  fireEvent.click(form.getByRole('button', { name: 'Save All Subjects' }))

  await waitFor(() => {
    expect(subjectService.createSubject).toHaveBeenCalledTimes(2)
  })

  expect(subjectService.createSubject).toHaveBeenNthCalledWith(1, expect.objectContaining({
    academicYearId: '1',
    courseId: '2',
    branchId: '3',
    semesterId: '4',
    subjectCode: 'CS201',
    subjectName: 'Data Structures',
    credits: '4',
  }))

  expect(subjectService.createSubject).toHaveBeenNthCalledWith(2, expect.objectContaining({
    academicYearId: '1',
    courseId: '2',
    branchId: '3',
    semesterId: '4',
    subjectCode: 'CS202',
    subjectName: 'Computer Networks',
    credits: '3',
  }))

  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})

test('multiple subject creation validates duplicate codes within batch and against directory', async () => {
  mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Add Multiple Subjects' }))
  const dialog = await screen.findByRole('dialog', { name: 'Add Multiple Subjects' })
  const form = within(dialog)

  await waitFor(() => expect(form.getByLabelText('Course').options.length).toBeGreaterThan(1))
  await chooseMapping(form)
  fireEvent.click(form.getByRole('button', { name: /Continue/ }))

  fireEvent.click(form.getByRole('button', { name: /Continue/ }))
  expect(form.getByText('Subject Name is required.')).toBeTruthy()
  expect(form.getByText('Subject Code is required.')).toBeTruthy()

  fireEvent.change(form.getAllByLabelText(/Subject Name/)[0], { target: { value: 'Duplicate Directory Subject' } })
  fireEvent.change(form.getAllByLabelText(/Subject Code/)[0], { target: { value: 'CS101' } })
  fireEvent.click(form.getByRole('button', { name: /Continue/ }))
  expect(form.getByText(/already exists in the system/i)).toBeTruthy()

  fireEvent.change(form.getAllByLabelText(/Subject Code/)[0], { target: { value: 'CS201' } })
  fireEvent.click(form.getByRole('button', { name: /Add Another Subject/ }))
  fireEvent.change(form.getAllByLabelText(/Subject Name/)[1], { target: { value: 'Batch Duplicate Subject' } })
  fireEvent.change(form.getAllByLabelText(/Subject Code/)[1], { target: { value: 'CS201' } })
  fireEvent.click(form.getByRole('button', { name: /Continue/ }))
  expect(form.getByText(/Duplicate subject code 'CS201' in this batch/i)).toBeTruthy()

  expect(subjectService.createSubject).not.toHaveBeenCalled()
})

test('multiple subject creation handles partial failure and retries only failed subjects', async () => {
  subjectService.createSubject
    .mockResolvedValueOnce({ id: '201' })
    .mockRejectedValueOnce(new Error('Network error on Subject 2'))
    .mockResolvedValueOnce({ id: '202' })

  mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Add Multiple Subjects' }))
  const dialog = await screen.findByRole('dialog', { name: 'Add Multiple Subjects' })
  const form = within(dialog)

  await waitFor(() => expect(form.getByLabelText('Course').options.length).toBeGreaterThan(1))
  await chooseMapping(form)
  fireEvent.click(form.getByRole('button', { name: /Continue/ }))

  fireEvent.change(form.getAllByLabelText(/Subject Name/)[0], { target: { value: 'Math I' } })
  fireEvent.change(form.getAllByLabelText(/Subject Code/)[0], { target: { value: 'MA101' } })
  fireEvent.click(form.getByRole('button', { name: /Add Another Subject/ }))
  fireEvent.change(form.getAllByLabelText(/Subject Name/)[1], { target: { value: 'Physics I' } })
  fireEvent.change(form.getAllByLabelText(/Subject Code/)[1], { target: { value: 'PH101' } })
  fireEvent.click(form.getByRole('button', { name: /Continue/ }))
  fireEvent.click(form.getByRole('button', { name: 'Save All Subjects' }))

  await waitFor(() => {
    expect(form.getByText(/Partial Save Completed/i)).toBeTruthy()
  })
  expect(form.getByText(/Failed: Network error on Subject 2/i)).toBeTruthy()
  expect(form.getByRole('button', { name: 'Retry Failed Subjects' })).toBeTruthy()

  fireEvent.click(form.getByRole('button', { name: 'Retry Failed Subjects' }))

  await waitFor(() => {
    expect(subjectService.createSubject).toHaveBeenCalledTimes(3)
  })

  expect(subjectService.createSubject).toHaveBeenLastCalledWith(expect.objectContaining({
    subjectCode: 'PH101',
    subjectName: 'Physics I',
  }))

  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})

test('switching between Single and Multiple modes preserves entered data', async () => {
  mount('/subject-management', true)
  fireEvent.click(await screen.findByRole('button', { name: 'Add Subject' }))
  const dialog = await screen.findByRole('dialog', { name: 'Add Subject' })
  const form = within(dialog)

  await waitFor(() => expect(form.getByLabelText('Course').options.length).toBeGreaterThan(1))
  await chooseMapping(form)

  fireEvent.click(form.getByRole('radio', { name: 'Multiple Subjects' }))
  expect(form.getByText('1 Subject Added')).toBeTruthy()

  expect(form.getByLabelText('Course').value).toBe('2')
  expect(form.getByLabelText('Branch').value).toBe('3')

  fireEvent.click(form.getByRole('radio', { name: 'Single Subject' }))
  expect(form.getByLabelText('Course').value).toBe('2')
  expect(form.getByLabelText('Branch').value).toBe('3')
  expect(form.getByLabelText('Academic Level').value).toBe('1st Year')
  expect(form.getByLabelText('Semester').value).toBe('4')
  fireEvent.click(form.getByRole('button', { name: 'Cancel' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add Subject' }))
  await within(await screen.findByRole('dialog', { name: 'Add Subject' })).findByRole('option', { name: 'B.Tech' })
  expect(academicService.getCourses).toHaveBeenCalledWith({ collegeId: '7' })
  expect(academicService.getCourses).toHaveBeenCalledTimes(1)
  expect(academicService.getBranches).toHaveBeenCalledTimes(1)
  expect(academicService.getSemesters).toHaveBeenCalledTimes(1)
})

test('single subject wizard has exactly 3 steps, validates details, calculates totals, and persists data across navigation', async () => {
  subjectService.createSubject.mockResolvedValue({ id: '99' })
  mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Add Subject' }))
  const dialog = await screen.findByRole('dialog', { name: 'Add Subject' })
  const form = within(dialog)

  // Verify exactly 3 steps in stepper
  const stepButtons = form.getAllByRole('button', { name: /^[123]\s+/ })
  expect(stepButtons.length).toBe(3)
  expect(stepButtons[0].textContent).toContain('Academic Mapping')
  expect(stepButtons[1].textContent).toContain('Subject Details')
  expect(stepButtons[2].textContent).toContain('Review & Save')

  // Fill Step 1 Mapping
  await waitFor(() => expect(form.getByLabelText('Course').options.length).toBeGreaterThan(1))
  await chooseMapping(form)
  fireEvent.click(form.getByRole('button', { name: /Continue/ }))

  // On Step 2, test validation before proceeding
  fireEvent.click(form.getByRole('button', { name: /Continue/ }))
  expect(form.getByText('Subject Name is required.')).toBeTruthy()
  expect(form.getByText('Subject Code is required.')).toBeTruthy()

  // Fill merged details, workload hours, credits, and marks
  fireEvent.change(form.getByLabelText(/Subject Name/), { target: { value: 'Operating Systems' } })
  fireEvent.change(form.getByLabelText(/Subject Code/), { target: { value: 'CS301' } })
  fireEvent.change(form.getByLabelText('Credits'), { target: { value: '4' } })
  fireEvent.change(form.getByLabelText('Lecture Hours'), { target: { value: '3' } })
  fireEvent.change(form.getByLabelText('Tutorial Hours'), { target: { value: '1' } })
  fireEvent.change(form.getByLabelText('Practical Hours'), { target: { value: '2' } })
  fireEvent.change(form.getByLabelText('Internal Marks'), { target: { value: '30' } })
  fireEvent.change(form.getByLabelText('External Marks'), { target: { value: '70' } })
  fireEvent.change(form.getByLabelText(/Description/), { target: { value: 'Core OS course' } })

  // Verify live calculations: 3+1+2 = 6 hrs; 30+70 = 100 marks
  expect(form.getByText('6 hrs')).toBeTruthy()
  expect(form.getByText('100')).toBeTruthy()

  // Proceed to Step 3: Review and Save
  fireEvent.click(form.getByRole('button', { name: /Continue/ }))
  expect(form.getByRole('heading', { name: 'Review and Save' })).toBeTruthy()
  expect(form.getByText('Operating Systems')).toBeTruthy()
  expect(form.getByText('CS301')).toBeTruthy()
  expect(form.getByText('Core OS course')).toBeTruthy()
  expect(form.getByText('6 hrs')).toBeTruthy()

  // Navigate backward to Step 2 and verify data persistence
  fireEvent.click(form.getByRole('button', { name: /Previous/ }))
  expect(form.getByLabelText(/Subject Name/).value).toBe('Operating Systems')
  expect(form.getByLabelText(/Subject Code/).value).toBe('CS301')
  expect(form.getByLabelText('Credits').value).toBe('4')
  expect(form.getByLabelText('Lecture Hours').value).toBe('3')

  // Navigate backward to Step 1 and verify mapping persistence
  fireEvent.click(form.getByRole('button', { name: /Previous/ }))
  expect(form.getByLabelText('Course').value).toBe('2')
  expect(form.getByLabelText('Branch').value).toBe('3')

  // Jump directly to Review & Save
  fireEvent.click(form.getByRole('button', { name: /3\s+Review & Save/ }))
  expect(form.getByRole('heading', { name: 'Review and Save' })).toBeTruthy()

  // Save Subject
  expect(form.queryByRole('button', { name: /Continue/ })).toBeNull()
  fireEvent.click(form.getByRole('button', { name: 'Save Subject' }))

  await waitFor(() => {
    expect(subjectService.createSubject).toHaveBeenCalledWith(expect.objectContaining({
      academicYearId: '1',
      courseId: '2',
      branchId: '3',
      semesterId: '4',
      subjectName: 'Operating Systems',
      subjectCode: 'CS301',
      credits: '4',
      lectureHours: '3',
      tutorialHours: '1',
      practicalHours: '2',
      internalMarks: '30',
      externalMarks: '70',
      description: 'Core OS course',
    }))
  })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})


test('subject mapping reports failed lookups and retries instead of silently showing empty options', async () => {
  academicService.getCourses.mockResolvedValueOnce(Object.assign([], { loadError: true }))
  mount()
  await screen.findByRole('button', { name: 'Add Subject' })
  await waitFor(() => expect(academicService.getCourses).toHaveBeenCalled())
  fireEvent.click(screen.getByRole('button', { name: 'Add Subject' }))
  const dialog = await screen.findByRole('dialog', { name: 'Add Subject' })
  const form = within(dialog)
  expect(await form.findByText('Courses could not be loaded. Please retry.')).toBeTruthy()
  fireEvent.click(form.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect(form.getByLabelText('Course').options.length).toBeGreaterThan(1))
  expect(form.queryByText('Courses could not be loaded. Please retry.')).toBeNull()
})

test('a semester 502 preserves course options and retry only reloads semesters', async () => {
  academicService.getSemesters
    .mockRejectedValueOnce(Object.assign(new Error('Unavailable'), { response: { status: 502 } }))
    .mockResolvedValueOnce([
      { semesterId: 4, courseId: 2, branchId: 3, academicYearId: 1, semesterName: 'Semester 1', semesterNumber: 1, yearNumber: 2 },
      { semesterId: 5, courseId: 2, branchId: 3, academicYearId: 9, semesterName: 'Semester 3', semesterNumber: 3, yearNumber: 3 },
    ])
  mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Add Subject' }))
  const form = within(await screen.findByRole('dialog', { name: 'Add Subject' }))
  await form.findByRole('option', { name: 'B.Tech' })
  expect(academicService.getBranches).not.toHaveBeenCalled()
  expect(academicService.getSemesters).not.toHaveBeenCalled()
  fireEvent.change(form.getByLabelText('Course'), { target: { value: '2' } })
  await form.findByRole('option', { name: 'CSE' })
  expect(academicService.getSemesters).not.toHaveBeenCalled()
  fireEvent.change(form.getByLabelText('Branch'), { target: { value: '3' } })
  expect(await form.findByText('The semester service returned HTTP 502. Please retry.')).toBeTruthy()
  expect(form.getByLabelText('Course').value).toBe('2')
  fireEvent.click(form.getByRole('button', { name: 'Retry' }))
  await form.findByRole('option', { name: '2nd Year' })
  expect(form.queryByRole('option', { name: '3rd Year' })).toBeNull()
  fireEvent.change(form.getByLabelText('Academic Level'), { target: { value: '2nd Year' } })
  expect(form.getByRole('option', { name: 'Semester 1' }).value).toBe('4')
  expect(academicService.getCourses).toHaveBeenCalledTimes(1)
  expect(academicService.getBranches).toHaveBeenCalledTimes(1)
  expect(academicService.getSemesters).toHaveBeenCalledTimes(2)
})

test('subject lookup normalizes nested lists and PascalCase IDs without dropping scoped records', () => {
  const response = { data: { success: true, data: { $values: [
    { CourseId: 2, CourseName: 'B.Tech', Status: 1 },
    { CourseId: 3, CollegeId: 8, CourseName: 'Other college', Status: 1 },
    { CourseId: 4, CollegeId: 7, CourseName: 'Inactive', Status: 0 },
  ] } } }
  expect(subjectMappingRows(response, 'course', 7)).toEqual([
    expect.objectContaining({ id: 2, name: 'B.Tech', collegeId: '7', status: 1 }),
  ])
  expect(subjectMappingRows({ data: { semesters: [{ SemesterId: 4, CourseId: 2, BranchId: 3, SemesterNumber: 1, YearNumber: 2, SemesterName: 'Semester 1' }] } }, 'semester', 7)[0]).toMatchObject({ id: 4, courseId: 2, branchId: 3, semesterNumber: 1, yearNumber: 2 })
})

test('invalid successful lookup responses are errors instead of empty lists', () => {
  expect(() => subjectMappingRows({ data: { message: 'Unexpected response' } }, 'course', 7)).toThrow()
  expect(() => subjectMappingRows({ data: { data: [{}] } }, 'course', 7)).toThrow()
  expect(subjectMappingRows({ data: { data: [] } }, 'course', 7)).toEqual([])
})
