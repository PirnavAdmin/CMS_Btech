import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ApiAssignmentDialog } from '../pages/faculty/FacultyManagement'
import facultyService from '../services/facultyService'
const fixture=vi.hoisted(()=>({edit:true,faculty:{id:'9',collegeId:7,fullName:'Faculty One',assignments:[]}}))
vi.mock('../auth/ScreenAccess',()=>({useScreenAccess:()=>({canAction:()=>fixture.edit})}))
vi.mock('../context/AcademicContext',()=>({useAcademic:()=>({selectedAcademicYearId:'1'})}))
vi.mock('../components/SearchableSelect',()=>({default:()=>null,ProjectSelect:props=><select {...props}/>}))
vi.mock('../services/facultyService',async original=>({...await original(),default:{createSubjectAllocation:vi.fn(),updateSubjectAllocation:vi.fn(),deleteSubjectAllocation:vi.fn()}}))
vi.mock('../api/apiEndpoints',async original=>({...await original(),academicYearApi:{getAll:async()=>[{academicYearId:1,academicYearName:'2026-2027',collegeId:7}]},courseApi:{getAll:async()=>[{courseId:2,courseName:'B.Tech',collegeId:7},{courseId:12,courseName:'Other course',collegeId:7}]},branchApi:{getAll:async()=>[{branchId:3,branchName:'CSE',courseId:2,collegeId:7}]},facultyMasterApi:{getSemesters:async()=>[{semesterId:4,semesterName:'Semester 1',branchId:3,courseId:2,academicYearId:1}],getSubjects:async()=>[{subjectId:6,subjectName:'Programming',courseId:2,branchId:3,semesterId:4}]},sectionApi:{getAll:async()=>[{sectionId:5,sectionName:'A',semesterId:4,branchId:3}]}}))
beforeEach(()=>{vi.clearAllMocks();fixture.edit=true;fixture.faculty.assignments=[];facultyService.createSubjectAllocation.mockResolvedValue({id:41});facultyService.updateSubjectAllocation.mockResolvedValue({});facultyService.deleteSubjectAllocation.mockResolvedValue({})})
afterEach(cleanup)
const choose=(label,value)=>fireEvent.change(screen.getByLabelText(label),{target:{value}})
async function fill(){await screen.findByRole('option',{name:'B.Tech'});for(const [label,value] of [['Course','2'],['Branch','3'],['Semester','4'],['Section','5'],['Subject','6']])choose(label,value)}
function submit(){fireEvent.submit(screen.getByRole('button',{name:/Add Allocation|Update Assignment/}).closest('form'))}
test('create acknowledgement followed by failed refresh retries only refresh',async()=>{
 const changed=vi.fn().mockRejectedValueOnce(new Error('Refresh offline')).mockResolvedValue();render(<ApiAssignmentDialog faculty={fixture.faculty} onClose={()=>{}} onChanged={changed}/>);await fill();submit();await screen.findByText('Refresh offline');submit();await waitFor(()=>expect(changed).toHaveBeenCalledTimes(2));expect(facultyService.createSubjectAllocation).toHaveBeenCalledTimes(1);expect(facultyService.updateSubjectAllocation).not.toHaveBeenCalled()
})
test('update uses real identity and parent change clears invalid descendants',async()=>{
 fixture.faculty.assignments=[{id:41,academicYearId:'1',courseId:'2',branchId:'3',semesterId:'4',sectionId:'5',subjectId:'6',assignmentType:'Subject Faculty',weeklyHours:3}];render(<ApiAssignmentDialog faculty={fixture.faculty} onClose={()=>{}} onChanged={vi.fn()}/>);await screen.findByRole('option',{name:'B.Tech'});fireEvent.click(screen.getByTitle('Edit allocation'));submit();await waitFor(()=>expect(facultyService.updateSubjectAllocation).toHaveBeenCalledWith(41,expect.objectContaining({facultyId:'9',subjectId:'6'})));await fill();choose('Course','12');for(const label of ['Branch','Semester','Section','Subject'])expect(screen.getByLabelText(label).value).toBe('')
})
test('acknowledged deletion retries refresh without repeating delete',async()=>{
 fixture.faculty.assignments=[{id:41,subjectName:'Programming'}];const changed=vi.fn().mockRejectedValueOnce(new Error('Refresh failed')).mockResolvedValue();render(<ApiAssignmentDialog faculty={fixture.faculty} onClose={()=>{}} onChanged={changed}/>);fireEvent.click(screen.getByTitle('Remove allocation'));fireEvent.click(screen.getByRole('button',{name:'Delete',exact:true}));await screen.findByText('Refresh failed');fireEvent.click(screen.getByRole('button',{name:'Delete',exact:true}));await waitFor(()=>expect(changed).toHaveBeenCalledTimes(2));expect(facultyService.deleteSubjectAllocation).toHaveBeenCalledTimes(1)
})
test('failed delete preserves allocation and readonly hides mutations',async()=>{
 fixture.edit=false;fixture.faculty.assignments=[{id:41,subjectName:'Programming'}];render(<ApiAssignmentDialog faculty={fixture.faculty} onClose={()=>{}} onChanged={vi.fn()}/>);await screen.findByText('Programming');expect(screen.queryByRole('button',{name:'Remove allocation'})).toBeNull();expect(screen.queryByRole('button',{name:'Add Allocation'})).toBeNull()
})
test('missing create identity blocks blind repeat creation',async()=>{
 facultyService.createSubjectAllocation.mockResolvedValue({});render(<ApiAssignmentDialog faculty={fixture.faculty} onClose={()=>{}} onChanged={vi.fn()}/>);await fill();submit();await screen.findByText(/saved without an identity/);submit();await screen.findByText(/Verify the saved allocation/);expect(facultyService.createSubjectAllocation).toHaveBeenCalledTimes(1)
})

test('failed allocation delete retains the record and allows an explicit retry',async()=>{
 fixture.faculty.assignments=[{id:41,subjectName:'Programming'}];facultyService.deleteSubjectAllocation.mockRejectedValueOnce(new Error('Delete denied')).mockResolvedValue({});render(<ApiAssignmentDialog faculty={fixture.faculty} onClose={()=>{}} onChanged={vi.fn()}/>);fireEvent.click(screen.getByTitle('Remove allocation'));fireEvent.click(screen.getByRole('button',{name:'Delete',exact:true}));await screen.findByText('Delete denied');expect(screen.getByText('Programming')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Delete',exact:true}));await waitFor(()=>expect(facultyService.deleteSubjectAllocation).toHaveBeenCalledTimes(2))
})
test('identical existing allocation blocks a duplicate create',async()=>{
 fixture.faculty.assignments=[{id:41,academicYearId:'1',courseId:'2',branchId:'3',semesterId:'4',sectionId:'5',subjectId:'6',assignmentType:'Subject Faculty'}];render(<ApiAssignmentDialog faculty={fixture.faculty} onClose={()=>{}} onChanged={vi.fn()}/>);await fill();submit();await screen.findByText('This faculty allocation already exists. Edit the existing allocation.');expect(facultyService.createSubjectAllocation).not.toHaveBeenCalled()
})
