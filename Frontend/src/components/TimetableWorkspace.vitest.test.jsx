import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import TimetableManagement from '../pages/timetable/TimetableManagement'
import { loadBackendWorkflow, backendWorkflow } from '../services/timetable/timetableBackendWorkflow'
const fixture=vi.hoisted(()=>({edit:true,scope:{selectedCollegeId:'7',selectedAcademicYearId:'1',loading:false}}))
vi.mock('../layouts/DashboardLayout',()=>({default:({children})=>children}))
vi.mock('../auth/ScreenAccess',()=>({useScreenAccess:()=>({canAction:()=>fixture.edit})}))
vi.mock('../auth/auth',()=>({getUserRole:()=> 'admin'}))
vi.mock('../context/AcademicContext',()=>({useAcademic:()=>fixture.scope}))
vi.mock('../utils/collegeScope.js',async original=>({...await original(),selectedCollegeId:()=> '7'}))
vi.mock('../services/timetable/timetableBackendWorkflow',()=>({loadBackendWorkflow:vi.fn(),backendWorkflow:{saveEntry:vi.fn(async()=>({id:21}))}}))
const data={tables:[],backend:[],sources:{years:[],departments:[],courses:[],branches:[],semesters:[],sections:[],subjects:[],faculty:[],allocations:[],rooms:[],periods:[]}}
beforeEach(()=>{vi.clearAllMocks();fixture.edit=true;loadBackendWorkflow.mockResolvedValue(data)})
afterEach(cleanup)
test('timetable load errors provide retry and do not fabricate schedules',async()=>{loadBackendWorkflow.mockRejectedValueOnce(new Error('Timetable offline'));render(<TimetableManagement/>);await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Retry timetable'}));await screen.findByRole('button',{name:'Timetable Builder'});expect(loadBackendWorkflow).toHaveBeenCalledTimes(2)})
test('readonly timetable access does not open a create workspace',async()=>{fixture.edit=false;render(<TimetableManagement/>);fireEvent.click(await screen.findByRole('button',{name:'Timetable Builder'}));expect(screen.queryByRole('button',{name:'Create New Timetable Period'})).toBeNull()})

test('acknowledged timetable entry save blocks another write until refresh-only retry succeeds',async()=>{
 const context={academicYearId:'1',courseId:'2',departmentId:'8',branchId:'3',level:'1',semesterId:'4',sectionId:'5'};
 const entry={...context,id:'21',timetableId:'11',subjectId:'6',facultyId:'7',dayOfWeek:'MONDAY',startTime:'09:00',endTime:'10:00',classroom:'Room 1',entryType:'Theory'};
 const planning={calendar:{startDate:'2026-09-01',endDate:'2026-12-15',workingDays:['MONDAY'],reviewed:true,holidays:[]},periods:[{id:'p1',name:'P1',type:'class',startTime:'09:00',endTime:'10:00'}],rooms:['text:room 1'],requirements:{}};
 const table={...context,id:'11',name:'Engineering Schedule',origin:'backend',publicationStatus:'draft',revision:1,entries:[entry],planning};
 const live={tables:[table],backend:[entry],sources:{...data.sources,years:[{id:'1',name:'2026'}],departments:[{id:'8',name:'Engineering'}],courses:[{id:'2',name:'B.Tech',departmentId:'8'}],branches:[{id:'3',name:'CSE',courseId:'2',departmentId:'8'}],semesters:[{id:'4',name:'Semester 1',semesterNumber:1,academicYearId:'1',courseId:'2',branchId:'3'}],sections:[{...context,id:'5',name:'Section A',room:'Room 1'}],subjects:[{...context,id:'6',name:'Programming',subjectName:'Programming',subjectType:'Theory'}],faculty:[{id:'7',name:'Faculty One'}],allocations:[{...context,id:'9',subjectId:'6',facultyId:'7',periodsPerWeek:1}]}};
 loadBackendWorkflow.mockResolvedValue(live);render(<TimetableManagement/>);fireEvent.click(await screen.findByRole('button',{name:/Engineering Schedule.*DRAFT/i}));fireEvent.click(screen.getAllByRole('button',{name:/Programming.*09:00/i})[0]);const dialog=screen.getByRole('dialog');loadBackendWorkflow.mockRejectedValueOnce(new Error('Refresh unavailable')).mockResolvedValue(live);fireEvent.submit(within(dialog).getByRole('button',{name:'Save Draft Entry'}).closest('form'));await screen.findByRole('button',{name:'Retry saved timetable refresh'});expect(backendWorkflow.saveEntry).toHaveBeenCalledTimes(1);fireEvent.click(screen.getByRole('button',{name:'Retry saved timetable refresh'}));await waitFor(()=>expect(screen.queryByRole('button',{name:'Retry saved timetable refresh'})).toBeNull());expect(backendWorkflow.saveEntry).toHaveBeenCalledTimes(1)
})
