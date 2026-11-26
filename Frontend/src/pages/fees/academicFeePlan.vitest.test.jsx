import React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { FeeStructureWizard, FeeStructure } from './FeeManagement'
import { academicFeePlanApi, feeConfigurationApi, facilityFeePlanApi } from '../../api/apiEndpoints'
import { getSemesters } from '../../auth/collegeApi'
import { newFeeStructure } from '../../services/feeStructureService'
const access=vi.hoisted(()=>({write:true,scope:rows=>rows}))
vi.mock('../../auth/ScreenAccess',()=>({useScreenAccess:()=>({canAction:()=>access.write})}))
vi.mock('../../auth/collegeApi',()=>({getSemesters:vi.fn(async()=>[])}))
vi.mock('../../context/AcademicContext',()=>({useAcademic:()=>({loading:false,error:null,selectedCollegeId:'9',academicYears:[],scopeRecords:access.scope})}))
vi.mock('../../api/apiEndpoints',async original=>({...await original(),branchApi:{getByCourse:vi.fn(async()=>[]),getAll:vi.fn(async()=>[])},courseApi:{getAll:vi.fn(async()=>[])},departmentApi:{getAll:vi.fn(async()=>[])},feeConfigurationApi:{categories:vi.fn(),createCategory:vi.fn()},facilityFeePlanApi:{list:vi.fn(async()=>[]),save:vi.fn()},academicFeePlanApi:{list:vi.fn(),create:vi.fn(),submit:vi.fn()}}))
vi.mock('../../components/SearchableSelect',()=>({default:({label,value,options,onChange,disabled})=><select aria-label={label} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}>{options.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select>,ProjectSelect:()=>null}))
const masters={years:[{id:'1',name:'2026-27'}],courses:[{id:'2',name:'B.Tech',durationYears:4},{id:'3',name:'M.Tech'}],branches:[{id:'4',courseId:'2',name:'CSE'},{id:'5',courseId:'3',name:'ECE'},{id:'7',courseId:'2',name:'IT'}],semesters:[{id:'6',courseId:'2',branchId:'4',academicYearId:'1',name:'Semester 3'}],batchScopes:[{courseId:'2',branchId:'4',academicYearId:'1',batch:'2025-2029'}]}
const types=[{id:8,code:'TUITION',name:'Tuition Fee'},{id:9,code:'LIBRARY',name:'Library Fee'}]
const students=[{collegeId:9,academicYearId:1,courseId:2,branchId:4,batch:'2025-2029',admissionQuota:'Management',studentCategory:'General'}]
const semester = (overrides = {}) => ({collegeId:9,academicYearId:1,courseId:2,branchId:4,semesterId:310,semesterName:'Semester 1',status:1,isArchived:0,...overrides})
beforeEach(()=>{vi.clearAllMocks();getSemesters.mockResolvedValue({data:{success:true,data:[semester(),semester({semesterId:311,semesterName:'Inactive semester',status:0}),semester({semesterId:312,semesterName:'Archived semester',isArchived:1})]}});access.write=true;feeConfigurationApi.categories.mockResolvedValue(types);academicFeePlanApi.list.mockResolvedValue([]);academicFeePlanApi.create.mockImplementation(async body=>({...body,feeStructureId:101,revision:1,status:'DRAFT'}));academicFeePlanApi.submit.mockImplementation(async id=>({feeStructureId:id,revision:2,status:'SUBMITTED'}))})
afterEach(cleanup)
const choose=(label,value)=>fireEvent.change(screen.getByLabelText(label),{target:{value}})
function mount(props={}){return render(<MemoryRouter><FeeStructureWizard value={newFeeStructure('1')} masters={masters} students={students} collegeId="9" close={vi.fn()} save={vi.fn()} {...props}/></MemoryRouter>)}
async function scope(){await waitFor(()=>expect(screen.getByLabelText('Course *').disabled).toBe(false));choose('Course *','2');await waitFor(()=>expect(screen.getByLabelText('Branch *').disabled).toBe(false));choose('Branch *','4');await waitFor(()=>expect(screen.getByLabelText('Admission Batch *').disabled).toBe(false));await waitFor(()=>expect(screen.getByLabelText('Admission Batch *').value).toBe('2026-2030'));choose('Admission Batch *','2025-2029');await waitFor(()=>expect(screen.getByLabelText('Fee Plan Name *').value).toContain('2026-27'))}
async function breakdown({annual=false}={}){await scope();if(annual) choose('Fee Applicability Period *','Yearly');else {await screen.findByRole('option',{name:'Semester 1'});choose('Applicable Semester *','310')} fireEvent.click(screen.getByRole('button',{name:/Continue/}));await waitFor(()=>expect(screen.getByLabelText('Fee Type').closest('section').hidden).toBe(false));choose('Admission Quota','Management');choose('Student Category','General');}
function component(id,name,amount){choose('Fee Type',String(id));fireEvent.click(screen.getByRole('button',{name:'Add Component'}));choose(name+' amount',amount)}
async function schedule(){fireEvent.click(screen.getByRole('button',{name:/Continue/}));await waitFor(()=>expect(screen.getByLabelText('Effective From *').closest('section').hidden).toBe(false));choose('Due Date *','2026-07-01');choose('Effective From *','2026-06-01');choose('Effective To *','2027-05-31')}


test('four-step workflow uses eligible semester IDs and has no copy-default controls',async()=>{mount();await breakdown();expect(screen.getAllByRole('tab')).toHaveLength(4);expect(screen.getByLabelText('Applicable Semester *').value).toBe('310');expect(screen.queryByText('Inactive semester')).toBeNull();expect(screen.queryByText('Archived semester')).toBeNull();expect(getSemesters).toHaveBeenCalledWith({collegeId:9,academicYearId:1,courseId:2,branchId:4,status:1});expect(screen.queryByText('Copy Default')).toBeNull();expect(screen.getByLabelText('Admission Quota').textContent).not.toContain('All quotas')});
test('branch selection automatically selects its calculated admission batch',async()=>{mount({masters:{...masters,batchScopes:[]},students:[]});await waitFor(()=>expect(screen.getByLabelText('Course *').disabled).toBe(false));choose('Course *','2');await waitFor(()=>expect(screen.getByLabelText('Branch *').disabled).toBe(false));choose('Branch *','4');await waitFor(()=>expect(screen.getByLabelText('Admission Batch *').value).toBe('2026-2030'))});
test('academic dependencies clear branch and batch',async()=>{mount();await scope();choose('Course *','3');expect(screen.getByLabelText('Branch *').value).toBe('');expect(screen.getByLabelText('Admission Batch *').value).toBe('')});
test('duplicates components are blocked and totals use exact amounts',async()=>{mount();await breakdown();component(8,'Tuition Fee','5000');component(9,'Library Fee','500');expect(within(screen.getByRole('table',{name:'Fee components'})).getByText('₹5,500.00')).toBeTruthy();choose('Fee Type','8');fireEvent.click(screen.getByRole('button',{name:'Add Component'}));expect(await screen.findByText('This fee type is already in the breakdown.')).toBeTruthy()});
test('duplicate combinations block progression without errors in total cells',async()=>{mount();await breakdown();component(8,'Tuition Fee','5000');fireEvent.click(screen.getByRole('button',{name:'Add Quota Fee'}));choose('Admission Quota','Management');choose('Student Category','General');expect(screen.getByRole('alert').textContent).toContain('already');component(9,'Library Fee','500');fireEvent.click(screen.getByRole('button',{name:/Continue/}));expect(academicFeePlanApi.create).not.toHaveBeenCalled()});
test('semester draft saves scoped IDs and refreshes list only after confirmed persistence',async()=>{const save=vi.fn();mount({save});await breakdown();component(8,'Tuition Fee','5000');await schedule();fireEvent.click(screen.getByRole('button',{name:'Save Draft'}));await waitFor(()=>expect(save).toHaveBeenCalledOnce());expect(academicFeePlanApi.create.mock.calls[0][0]).toMatchObject({collegeId:9,academicYearId:1,courseId:2,branchId:4,semesterId:310,cycle:'SEMESTER',quota:'Management',studentCategory:'General',totalAmount:'5000.00',components:[{code:'TUITION',name:'Tuition Fee',amount:'5000.00'}]})});
test('college 128 semester draft preserves the configured installment amounts and dates', async () => {
  const scopedMasters = {
    years: [{ id: '77', name: '2026-27' }],
    courses: [{ id: '46', name: 'Bachelor of Technology', durationYears: 4 }],
    branches: [{ id: '47', courseId: '46', name: 'Computer Science and Engineering' }],
  }
  getSemesters.mockResolvedValue({ data: { success: true, data: [
    semester({ collegeId: 128, academicYearId: 77, courseId: 46, branchId: 47 }),
  ] } })
  mount({ collegeId: '128', masters: scopedMasters, students: [], value: newFeeStructure('77') })
  choose('Course *', '46')
  await waitFor(() => expect(screen.getByLabelText('Branch *').disabled).toBe(false))
  choose('Branch *', '47')
  choose('Admission Batch *', '2026-2030')
  await screen.findByRole('option', { name: 'Semester 1' })
  choose('Applicable Semester *', '310')
  fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
  const quota = screen.getByLabelText('Admission Quota')
  const government = Array.from(quota.options).find(option => /government|convener/i.test(option.value))
  choose('Admission Quota', government.value)
  choose('Student Category', 'General')
  component(8, 'Tuition Fee', '10000')
  await schedule()
  fireEvent.click(screen.getByRole('radio', { name: 'Pay in Installments' }))
  choose('Payment 1 due date', '2026-12-20')
  choose('Payment 1 amount', '5000')
  fireEvent.click(screen.getByRole('button', { name: /Add Installment/ }))
  choose('Payment 2 due date', '2027-01-20')
  choose('Payment 2 amount', '5000')
  fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }))
  await waitFor(() => expect(academicFeePlanApi.create).toHaveBeenCalledWith(expect.objectContaining({
    collegeId: 128, academicYearId: 77, courseId: 46, branchId: 47, semesterId: 310,
    cycle: 'SEMESTER', batch: '2026-2030', totalAmount: '10000.00',
    installments: [
      { number: 1, dueDate: '2026-12-20', amount: '5000.00' },
      { number: 2, dueDate: '2027-01-20', amount: '5000.00' },
    ],
  })))
})

test('switching the working college resets the scope and reloads the fee lookups', async () => {
  const secondMasters = {
    years: [{ id: '77', name: '2026-27' }],
    courses: [{ id: '46', name: 'College 128 program', durationYears: 4 }],
    branches: [{ id: '47', courseId: '46', name: 'College 128 branch' }],
  }
  const wizard = (collegeId, lookup, year) => <MemoryRouter>
    <FeeStructureWizard key={collegeId} collegeId={collegeId} masters={lookup} value={newFeeStructure(year)} close={vi.fn()} save={vi.fn()} />
  </MemoryRouter>
  const { rerender } = render(wizard('9', masters, '1'))
  await scope()
  await screen.findByRole('option', { name: 'Semester 1' })
  choose('Applicable Semester *', '310')
  getSemesters.mockResolvedValue({ data: { data: [semester({
    collegeId: 128, academicYearId: 77, courseId: 46, branchId: 47, semesterId: 410, semesterName: 'College 128 semester',
  })] } })
  rerender(wizard('128', secondMasters, '77'))
  expect(screen.getByLabelText('Course *').value).toBe('')
  expect(screen.getByLabelText('Branch *').value).toBe('')
  expect(screen.getByLabelText('Applicable Semester *').value).toBe('')
  expect(screen.getByLabelText('Academic Year *').value).toBe('77')
  choose('Course *', '46')
  await waitFor(() => expect(screen.getByLabelText('Branch *').disabled).toBe(false))
  choose('Branch *', '47')
  await screen.findByRole('option', { name: 'College 128 semester' })
  expect(screen.queryByRole('option', { name: 'Semester 1' })).toBeNull()
  expect(feeConfigurationApi.categories).toHaveBeenCalledTimes(2)
  expect(academicFeePlanApi.list).toHaveBeenLastCalledWith('128', expect.any(Object))
  expect(getSemesters).toHaveBeenLastCalledWith({ collegeId: 128, academicYearId: 77, courseId: 46, branchId: 47, status: 1 })
})

test('approval retry uses the saved draft and displays a validation message with its reference', async () => {
  const message = 'The fee plan cannot be submitted for this academic year.'
  academicFeePlanApi.submit.mockRejectedValueOnce(Object.assign(new Error(message), { status: 400, correlationId: 'fee-test-42' }))
  mount()
  await breakdown()
  component(8, 'Tuition Fee', '5000')
  await schedule()
  fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Submit for Approval' }))
  expect(await screen.findByText(message + ' Reference: fee-test-42.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Submit for Approval' }))
  await waitFor(() => expect(academicFeePlanApi.submit).toHaveBeenCalledTimes(2))
  expect(academicFeePlanApi.create).toHaveBeenCalledOnce()
})

test('different quotas persist distinct fee types and totals',async()=>{const records=[...students,{...students[0],admissionQuota:'Regular'}];mount({students:records});await breakdown();component(8,'Tuition Fee','5000');fireEvent.click(screen.getByRole('button',{name:'Add Quota Fee'}));choose('Admission Quota','Regular');choose('Student Category','General');component(9,'Library Fee','700');await schedule();fireEvent.click(screen.getByRole('button',{name:'Save Draft'}));await waitFor(()=>expect(academicFeePlanApi.create).toHaveBeenCalledTimes(2));expect(academicFeePlanApi.create.mock.calls[1][0]).toMatchObject({feeCategoryId:9,quota:'Regular',totalAmount:'700.00',components:[{code:'LIBRARY',name:'Library Fee',amount:'700.00'}]})});
test('failed backend write retains form and does not refresh directory',async()=>{const save=vi.fn();academicFeePlanApi.create.mockRejectedValueOnce(new Error('Write rejected'));mount({save});await breakdown();component(8,'Tuition Fee','5000');await schedule();fireEvent.click(screen.getByRole('button',{name:'Save Draft'}));expect(await screen.findByText('Write rejected')).toBeTruthy();expect(save).not.toHaveBeenCalled()});
test('review precedes submission and uses real submit transition',async()=>{mount();await breakdown();component(8,'Tuition Fee','5000');await schedule();expect(screen.queryByRole('button',{name:'Submit for Approval'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:/Continue/}));fireEvent.click(screen.getByRole('button',{name:'Submit for Approval'}));await waitFor(()=>expect(academicFeePlanApi.submit).toHaveBeenCalledWith(101,'9',1))});
test('unavailable existing records block unsafe duplicate creation',async()=>{academicFeePlanApi.list.mockRejectedValue(new Error('Offline'));mount();await scope();choose('Fee Applicability Period *','Yearly');fireEvent.click(screen.getByRole('button',{name:/Continue/}));expect(await screen.findByText(/Existing fee plans are still loading/)).toBeTruthy();expect(academicFeePlanApi.create).not.toHaveBeenCalled()});
test('annual draft saves without a semester',async()=>{getSemesters.mockResolvedValue({data:{data:[]}});mount();await breakdown({annual:true});component(8,'Tuition Fee','5000');await schedule();fireEvent.click(screen.getByRole('button',{name:'Save Draft'}));await waitFor(()=>expect(academicFeePlanApi.create).toHaveBeenCalledWith(expect.objectContaining({cycle:'ANNUAL',semesterId:null})))})
test('semester selection is required and changing branch clears it',async()=>{mount();await scope();await screen.findByRole('option',{name:'Semester 1'});fireEvent.click(screen.getByRole('button',{name:/Continue/}));expect(await screen.findByText('Select an applicable semester.')).toBeTruthy();choose('Applicable Semester *','310');choose('Branch *','7');expect(screen.getByLabelText('Applicable Semester *').value).toBe('');expect(await screen.findByText(/No active semesters are available for this course/)).toBeTruthy();expect(academicFeePlanApi.create).not.toHaveBeenCalled()});

test('quota selection is required when saved quotas exist',async()=>{mount();await scope();choose('Fee Applicability Period *','Yearly');fireEvent.click(screen.getByRole('button',{name:/Continue/}));await waitFor(()=>expect(screen.getByLabelText('Fee Type').closest('section').hidden).toBe(false));component(8,'Tuition Fee','500');fireEvent.click(screen.getByRole('button',{name:/Continue/}));expect(await screen.findByText('Select an existing admission quota for each fee breakdown.')).toBeTruthy()});
test('academic fee selector excludes facility fee domains',async()=>{feeConfigurationApi.categories.mockResolvedValueOnce([...types,{id:10,name:'Accommodation',domain:'Hostel'},{id:11,name:'Bus',domain:'Transport'}]);mount();await breakdown();expect(screen.getByLabelText('Fee Type').textContent).not.toContain('Accommodation');expect(screen.getByLabelText('Fee Type').textContent).not.toContain('Bus')});
test('zero component is allowed while negative amounts are rejected',async()=>{mount();await breakdown();component(8,'Tuition Fee','500');component(9,'Library Fee','-1');fireEvent.click(screen.getByRole('button',{name:/Continue/}));expect(await screen.findByText(/Enter nonnegative fee amounts/)).toBeTruthy();choose('Library Fee amount','0');fireEvent.click(screen.getByRole('button',{name:/Continue/}));await waitFor(()=>expect(screen.getByLabelText('Due Date *').closest('section').hidden).toBe(false))});
test('installment totals must equal the configured academic fee',async()=>{mount();await breakdown();component(8,'Tuition Fee','5000');await schedule();fireEvent.click(screen.getByRole('radio',{name:'Pay in Installments'}));choose('Payment 1 due date','2026-07-01');choose('Payment 1 amount','3000');fireEvent.click(screen.getByRole('button',{name:/Add Installment/}));choose('Payment 2 due date','2026-08-01');choose('Payment 2 amount','1000');fireEvent.click(screen.getByRole('button',{name:'Save Draft'}));expect(await screen.findByText(/must total/)).toBeTruthy();expect(academicFeePlanApi.create).not.toHaveBeenCalled();choose('Payment 2 amount','2000');fireEvent.click(screen.getByRole('button',{name:'Save Draft'}));await waitFor(()=>expect(academicFeePlanApi.create).toHaveBeenCalledOnce())});
