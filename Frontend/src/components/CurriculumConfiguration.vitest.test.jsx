import { beforeEach, afterEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within, cleanup, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CreditsManagement from '../pages/credits-management/CreditsManagement'
import ElectiveManagement from '../pages/elective-management/ElectiveManagement'
import { creditManagementApi, electiveManagementApi, studentApi } from '../api/apiEndpoints'
const fixture = vi.hoisted(() => ({ edit:true, year:'1', scope:rows=>rows.filter(row=>!row.collegeId || row.collegeId===7) }))
vi.mock('../layouts/DashboardLayout',()=>({default:({children})=>children}))
vi.mock('../auth/ScreenAccess',()=>({useScreenAccess:()=>({canAction:()=>fixture.edit})}))
vi.mock('../context/AcademicContext',()=>({useAcademic:()=>({selectedCollegeId:'7',selectedAcademicYearId:fixture.year,selectedAcademicYear:{id:'1',name:'2026-2027'},activeAcademicYears:[],scopeRecords:fixture.scope})}))
vi.mock('../hooks/useCollegeState',async()=>({default:(await import('react')).useState}))
vi.mock('../components/ExportMenu',()=>({default:()=> <button>Export</button>}))
vi.mock('../components/SearchableSelect',()=>({ProjectSelect:props=><select {...props}/>,default:({label,value,options=[],onChange,disabled})=><select aria-label={label} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}><option value="">Select</option>{options.filter(option=>option?.value!==''&&option?.id!=='').map(option=><option key={option.id??option.value??option} value={option.id??option.value??option}>{option.label??option.name??option}</option>)}</select>}))
const subject={id:5,subjectId:5,academicYearId:1,courseId:2,branchId:3,semesterId:4,collegeId:7,subjectCode:'CS101',subjectName:'Programming',credits:3,subjectType:'Theory',electiveType:'Elective',status:'Active'}
const years=[{id:1,academicYearId:1,name:'2026-2027',academicYearName:'2026-2027',status:'Active'}], courses=[{id:2,courseId:2,name:'B.Tech',courseName:'B.Tech',collegeId:7}], branches=[{id:3,branchId:3,courseId:2,name:'CSE',branchName:'CSE',collegeId:7}], semesters=[{id:4,semesterId:4,courseId:2,branchId:3,academicYearId:1,semesterNumber:1,name:'Semester 1',semesterName:'Semester 1',collegeId:7}]
vi.mock('../services/subjectService',()=>({default:{getSubjects:vi.fn(async()=>[subject])}}))
vi.mock('../services/academicService',()=>({default:{getCourses:vi.fn(async()=>courses),getBranches:vi.fn(async()=>branches),getSemesters:vi.fn(async()=>semesters),getAcademicYears:vi.fn(async()=>years),getDepartments:vi.fn(async()=>[])}}))
vi.mock('../api/apiEndpoints',async original=>({...await original(),
  creditManagementApi:{getRegistrations:vi.fn(async()=>[]),getConfigurations:vi.fn(async()=>[{id:9,subjectId:5,courseId:2,branchId:3,semesterId:4,credits:5,minimumCredits:2,maximumCredits:8,status:1}]),getDashboard:vi.fn(async()=>({})),getSummary:vi.fn(async()=>({})),updateConfiguration:vi.fn(async()=>({})),createConfiguration:vi.fn(),createRegistration:vi.fn(async()=>({id:42})),updateRegistration:vi.fn(async()=>({}))},studentApi:{getAll:vi.fn(async()=>[])},
  electiveManagementApi:{getGroups:vi.fn(async()=>[]),getApprovals:vi.fn(async()=>[]),getAllocations:vi.fn(async()=>[]),createGroup:vi.fn()},
  courseApi:{getAll:vi.fn(async()=>courses)},branchApi:{getAll:vi.fn(async()=>branches)},academicYearApi:{getAll:vi.fn(async()=>years)},departmentApi:{getAll:vi.fn(async()=>[])},facultyMasterApi:{getSemesters:vi.fn(async()=>semesters)},profileApi:{getProfile:vi.fn(async()=>null)},
}))
beforeEach(()=>{vi.clearAllMocks();fixture.edit=true;fixture.year='1';localStorage.clear();studentApi.getAll.mockResolvedValue([]);creditManagementApi.getConfigurations.mockResolvedValue([{id:9,subjectId:5,courseId:2,branchId:3,semesterId:4,credits:5,minimumCredits:2,maximumCredits:8,status:1}]);creditManagementApi.getRegistrations.mockResolvedValue([]);creditManagementApi.createRegistration.mockResolvedValue({id:42});creditManagementApi.updateRegistration.mockResolvedValue({})})
afterEach(cleanup)
test('credit configuration loads the existing backend configuration and updates its real ID',async()=>{
  render(<MemoryRouter><CreditsManagement/></MemoryRouter>)
  await waitFor(()=>expect(creditManagementApi.getConfigurations).toHaveBeenCalled())
  fireEvent.click(screen.getByRole('button',{name:'Filters'}))
  for(const [label,value]of[['Academic Year','1'],['Course','2'],['Branch','3'],['Academic Level','1st Year'],['Semester','semester:1']])fireEvent.change(screen.getByLabelText('Select '+label),{target:{value}})
  fireEvent.click(await screen.findByRole('button',{name:'Edit Credits'}))
  const dialog=await screen.findByRole('dialog',{name:'Edit Credit Configuration'})
  fireEvent.submit(dialog.querySelector('form'))
  await waitFor(()=>expect(creditManagementApi.updateConfiguration).toHaveBeenCalledWith(9,expect.objectContaining({subjectId:5,courseId:2,branchId:3,semesterId:4,credits:5,minimumCredits:2,maximumCredits:8})))
  expect(creditManagementApi.createConfiguration).not.toHaveBeenCalled()
})
test('elective group editor is a cancellable shared dialog retaining the directory',async()=>{
  render(<MemoryRouter><ElectiveManagement/></MemoryRouter>)
  fireEvent.click(screen.getByRole('button',{name:'Elective Groups'}))
  fireEvent.click(await screen.findByRole('button',{name:'Create Elective Group'}))
  const dialog=await screen.findByRole('dialog',{name:'Create Elective Group'})
  expect(within(dialog).getByRole('button',{name:'Create Group'})).toBeTruthy()
  fireEvent(dialog,new Event('cancel',{cancelable:true}));expect(screen.queryByRole('dialog')).toBeNull()
  expect(electiveManagementApi.createGroup).not.toHaveBeenCalled()
})

test('credit deactivation confirmation can cancel without writing',async()=>{
 render(<MemoryRouter><CreditsManagement/></MemoryRouter>);await waitFor(()=>expect(creditManagementApi.getConfigurations).toHaveBeenCalled());fireEvent.click(screen.getByRole('button',{name:'Filters'}));for(const [label,value]of[['Academic Year','1'],['Course','2'],['Branch','3'],['Academic Level','1st Year'],['Semester','semester:1']])fireEvent.change(screen.getByLabelText('Select '+label),{target:{value}});fireEvent.click(await screen.findByRole('button',{name:'Deactivate Credits'}));const dialog=screen.getByRole('dialog',{name:'Deactivate Credit Configuration'});fireEvent.click(within(dialog).getByRole('button',{name:'Cancel'}));expect(creditManagementApi.updateConfiguration).not.toHaveBeenCalled()
})
test('credit deactivation failure retains confirmation and retries the real ID',async()=>{
 creditManagementApi.updateConfiguration.mockRejectedValueOnce(new Error('Credit update denied')).mockResolvedValue({});render(<MemoryRouter><CreditsManagement/></MemoryRouter>);await waitFor(()=>expect(creditManagementApi.getConfigurations).toHaveBeenCalled());fireEvent.click(screen.getByRole('button',{name:'Filters'}));for(const [label,value]of[['Academic Year','1'],['Course','2'],['Branch','3'],['Academic Level','1st Year'],['Semester','semester:1']])fireEvent.change(screen.getByLabelText('Select '+label),{target:{value}});fireEvent.click(await screen.findByRole('button',{name:'Deactivate Credits'}));const dialog=screen.getByRole('dialog');fireEvent.click(within(dialog).getByRole('button',{name:'Confirm deactivation'}));await within(dialog).findByText('Credit update denied');fireEvent.click(within(dialog).getByRole('button',{name:'Confirm deactivation'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(creditManagementApi.updateConfiguration).toHaveBeenLastCalledWith(9,expect.objectContaining({status:0,subjectId:5}))
})

const creditStudent={studentId:9,collegeId:7,fullName:'Engineering Student',courseId:2,branchId:3,semesterId:4,academicYearId:1,studentCode:'BT009'}
async function mountRegistration(){studentApi.getAll.mockResolvedValue([creditStudent]);render(<MemoryRouter><CreditsManagement/></MemoryRouter>);await waitFor(()=>expect(studentApi.getAll).toHaveBeenCalled());fireEvent.click(screen.getByRole('button',{name:'Student Credit Registrations'}));fireEvent.click(screen.getByRole('button',{name:'Register Credit'}));await screen.findByRole('option',{name:/Engineering Student/});fireEvent.change(screen.getByLabelText('Credit student'),{target:{value:'9'}});fireEvent.change(screen.getByLabelText('Credit subject'),{target:{value:'5'}})}
test('student registration is reachable and does not fabricate a completed grade',async()=>{
 await mountRegistration();fireEvent.submit(screen.getByRole('dialog').querySelector('form'));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(creditManagementApi.getRegistrations).toHaveBeenCalledWith({status:1,academicYearId:'1'});expect(creditManagementApi.createRegistration).toHaveBeenCalledWith({studentId:9,subjectId:5,semesterId:4});expect(creditManagementApi.updateRegistration).toHaveBeenCalledWith(42,{registrationStatus:'REGISTERED',grade:null,gradePoints:null,isCompleted:false,status:1})
})
test('registration update failure retries the acknowledged ID without duplicate creation',async()=>{
 creditManagementApi.updateRegistration.mockRejectedValueOnce(new Error('Credit write failed')).mockResolvedValue({});await mountRegistration();fireEvent.submit(screen.getByRole('dialog').querySelector('form'));await screen.findByText('Credit write failed');fireEvent.submit(screen.getByRole('dialog').querySelector('form'));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(creditManagementApi.createRegistration).toHaveBeenCalledTimes(1);expect(creditManagementApi.updateRegistration).toHaveBeenCalledTimes(2)
})
test('missing registration identity blocks another create attempt',async()=>{
 creditManagementApi.createRegistration.mockResolvedValue({});await mountRegistration();fireEvent.submit(screen.getByRole('dialog').querySelector('form'));await screen.findByText(/response did not include its ID/);fireEvent.submit(screen.getByRole('dialog').querySelector('form'));await screen.findByText(/previous response did not include an identity/);expect(creditManagementApi.createRegistration).toHaveBeenCalledTimes(1)
})
test('credit registration drop uses confirmation and preserves the original registration',async()=>{
 studentApi.getAll.mockResolvedValue([creditStudent]);creditManagementApi.getRegistrations.mockResolvedValue([{id:42,studentId:9,subjectId:5,semesterId:4,registrationStatus:'REGISTERED',registeredCredits:5,status:1}]);render(<MemoryRouter><CreditsManagement/></MemoryRouter>);await waitFor(()=>expect(creditManagementApi.getRegistrations).toHaveBeenCalled());fireEvent.click(screen.getByRole('button',{name:'Student Credit Registrations'}));fireEvent.click(await screen.findByRole('button',{name:'Drop registration'}));fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Confirm drop'}));await waitFor(()=>expect(creditManagementApi.updateRegistration).toHaveBeenCalledWith('42',expect.objectContaining({registrationStatus:'DROPPED',isCompleted:false})))
})
test('readonly credits retain student registration browsing without mutation actions',async()=>{
 fixture.edit=false;render(<MemoryRouter><CreditsManagement/></MemoryRouter>);fireEvent.click(screen.getByRole('button',{name:'Student Credit Registrations'}));expect(screen.queryByRole('button',{name:'Register Credit'})).toBeNull()
})

test('credit registration details preserve actual marks and status while cancellation is read-only',async()=>{
 studentApi.getAll.mockResolvedValue([creditStudent]);creditManagementApi.getRegistrations.mockResolvedValue([{id:42,studentId:9,studentName:'Engineering Student',subjectId:5,semesterId:4,registrationStatus:'COMPLETED',registeredCredits:5,grade:'A',gradePoints:8,status:1}]);render(<MemoryRouter><CreditsManagement/></MemoryRouter>);await waitFor(()=>expect(creditManagementApi.getRegistrations).toHaveBeenCalled());fireEvent.click(screen.getByRole('button',{name:'Student Credit Registrations'}));fireEvent.click(await screen.findByRole('button',{name:'View registration'}));const dialog=screen.getByRole('dialog',{name:'Credit Registration Details'});expect(within(dialog).getByText('8')).toBeTruthy();fireEvent(dialog,new Event('cancel',{cancelable:true}));expect(creditManagementApi.updateRegistration).not.toHaveBeenCalled()
})

async function configurationRow(){render(<MemoryRouter><CreditsManagement/></MemoryRouter>);await waitFor(()=>expect(creditManagementApi.getConfigurations).toHaveBeenCalled());fireEvent.click(screen.getByRole('button',{name:'Filters'}));for(const [label,value]of[['Academic Year','1'],['Course','2'],['Branch','3'],['Academic Level','1st Year'],['Semester','semester:1']])fireEvent.change(screen.getByLabelText('Select '+label),{target:{value}})}
test('new credit configuration uses the existing engineering subject mapping',async()=>{
 creditManagementApi.getConfigurations.mockResolvedValueOnce([]);creditManagementApi.createConfiguration.mockResolvedValue({id:9});await configurationRow();fireEvent.click(await screen.findByRole('button',{name:'Configure Credits'}));fireEvent.submit(screen.getByRole('dialog').querySelector('form'));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(creditManagementApi.createConfiguration).toHaveBeenCalledWith(expect.objectContaining({subjectId:5,courseId:2,branchId:3,semesterId:4,credits:3,status:1}))
})
test('credit load failure offers retry instead of stale configurations',async()=>{
 creditManagementApi.getConfigurations.mockRejectedValueOnce(new Error('Configurations offline'));render(<MemoryRouter><CreditsManagement/></MemoryRouter>);await screen.findByRole('button',{name:'Retry credit data'});expect(screen.queryByRole('button',{name:'Edit Credits'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Retry credit data'}));await waitFor(()=>expect(creditManagementApi.getConfigurations).toHaveBeenCalledTimes(2))
})

test('existing registration completion updates its real ID and locks academic identity',async()=>{
 studentApi.getAll.mockResolvedValue([creditStudent]);creditManagementApi.getRegistrations.mockResolvedValue([{id:42,studentId:9,studentName:'Engineering Student',subjectId:5,semesterId:4,registrationStatus:'REGISTERED',registeredCredits:5,status:1}]);render(<MemoryRouter><CreditsManagement/></MemoryRouter>);await waitFor(()=>expect(creditManagementApi.getRegistrations).toHaveBeenCalled());fireEvent.click(screen.getByRole('button',{name:'Student Credit Registrations'}));fireEvent.click(await screen.findByRole('button',{name:'Edit registration'}));expect(screen.getByLabelText('Credit student').disabled).toBe(true);expect(screen.getByLabelText('Credit subject').disabled).toBe(true);fireEvent.change(screen.getByLabelText('Registration status'),{target:{value:'COMPLETED'}});fireEvent.change(screen.getByLabelText('Credit grade'),{target:{value:'A'}});fireEvent.submit(screen.getByRole('dialog').querySelector('form'));await waitFor(()=>expect(creditManagementApi.updateRegistration).toHaveBeenCalledWith('42',{registrationStatus:'COMPLETED',grade:'A',gradePoints:8,isCompleted:true,status:1}));expect(creditManagementApi.createRegistration).not.toHaveBeenCalled()
})

test('completed registration rejects a missing grade and preserves the form',async()=>{
 await mountRegistration();fireEvent.change(screen.getByLabelText('Registration status'),{target:{value:'COMPLETED'}});fireEvent.submit(screen.getByRole('dialog').querySelector('form'));await screen.findByText('Please select a valid grade.');expect(creditManagementApi.createRegistration).not.toHaveBeenCalled();expect(screen.getByRole('dialog')).toBeTruthy()
})
test('configuration credit limits reject reversed ranges without sending an update',async()=>{
 await configurationRow();fireEvent.click(await screen.findByRole('button',{name:'Edit Credits'}));fireEvent.change(screen.getByLabelText('Minimum Credits'),{target:{value:'9'}});fireEvent.change(screen.getByLabelText('Maximum Credits'),{target:{value:'2'}});fireEvent.submit(screen.getByRole('dialog').querySelector('form'));await screen.findByText('Maximum credits must be at least minimum credits.');expect(creditManagementApi.updateConfiguration).not.toHaveBeenCalled()
})
test('failed drop keeps confirmation and the current registration for retry',async()=>{
 studentApi.getAll.mockResolvedValue([creditStudent]);creditManagementApi.getRegistrations.mockResolvedValue([{id:42,studentId:9,subjectId:5,semesterId:4,registrationStatus:'REGISTERED',registeredCredits:5,status:1}]);creditManagementApi.updateRegistration.mockRejectedValueOnce(new Error('Drop denied')).mockResolvedValue({});render(<MemoryRouter><CreditsManagement/></MemoryRouter>);await waitFor(()=>expect(creditManagementApi.getRegistrations).toHaveBeenCalled());fireEvent.click(screen.getByRole('button',{name:'Student Credit Registrations'}));fireEvent.click(await screen.findByRole('button',{name:'Drop registration'}));const dialog=screen.getByRole('dialog');fireEvent.click(within(dialog).getByRole('button',{name:'Confirm drop'}));await screen.findByText('Drop denied');expect(screen.getByRole('dialog')).toBeTruthy();fireEvent.click(within(dialog).getByRole('button',{name:'Confirm drop'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(creditManagementApi.updateRegistration).toHaveBeenCalledTimes(2)
})


test('credit summary failure offers a read-only retry using the selected academic year',async()=>{
 studentApi.getAll.mockResolvedValue([{id:8,studentId:8,firstName:'Asha',collegeId:7,academicYearId:1,courseId:2,branchId:3,semesterId:4}])
 creditManagementApi.getSummary.mockRejectedValueOnce(new Error('Summary temporarily unavailable')).mockResolvedValue({registeredCredits:5,completedCredits:3})
 render(<MemoryRouter><CreditsManagement/></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:'Student Credit Registrations'}))
 fireEvent.click(screen.getByRole('button',{name:'Filters'}))
 await waitFor(()=>expect(screen.getByLabelText('Student').options.length).toBe(2))
 fireEvent.change(screen.getByLabelText('Student'),{target:{value:'8'}})
 fireEvent.click(await screen.findByRole('button',{name:'Retry credit summary'}))
 await waitFor(()=>expect(screen.queryByRole('button',{name:'Retry credit summary'})).toBeNull())
 expect(creditManagementApi.getSummary).toHaveBeenLastCalledWith({studentId:8,academicYearId:'1'})
 expect(creditManagementApi.createRegistration).not.toHaveBeenCalled()
})


test('Completed registrations reject a failing grade before creating a backend record',async()=>{
 await mountRegistration()
 fireEvent.change(screen.getByLabelText('Registration status'),{target:{value:'COMPLETED'}})
 fireEvent.change(screen.getByLabelText('Credit grade'),{target:{value:'F'}})
 fireEvent.submit(screen.getByRole('dialog').querySelector('form'))
 expect(await screen.findByText('A failing grade must use Failed registration status.')).toBeTruthy()
 expect(creditManagementApi.createRegistration).not.toHaveBeenCalled()
})

test('credit context switch rejects a late response from the previous working year',async()=>{
 let resolveOld;creditManagementApi.getRegistrations.mockImplementationOnce(()=>new Promise(resolve=>{resolveOld=resolve})).mockResolvedValue([])
 const view=render(<MemoryRouter><CreditsManagement/></MemoryRouter>);await waitFor(()=>expect(creditManagementApi.getRegistrations).toHaveBeenCalledTimes(1));fixture.year='2';view.rerender(<MemoryRouter><CreditsManagement/></MemoryRouter>);await waitFor(()=>expect(creditManagementApi.getRegistrations).toHaveBeenCalledWith({status:1,academicYearId:'2'}));fireEvent.click(screen.getByRole('button',{name:'Student Credit Registrations'}));await act(async()=>resolveOld([{id:99,studentId:9,studentName:'Stale student',subjectId:5,registrationStatus:'REGISTERED',registeredCredits:5}]));expect(screen.queryByText('Stale student')).toBeNull()
})
