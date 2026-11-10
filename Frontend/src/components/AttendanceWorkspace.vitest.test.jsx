import {afterEach,beforeEach,test,expect,vi} from 'vitest'
import {render,screen,fireEvent,waitFor,cleanup,act,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import Attendance from '../pages/attendance/Attendance'
import attendanceService from '../services/attendanceService'
const fixture=vi.hoisted(()=>({edit:true,year:'1',scope:rows=>rows.filter(row=>!row.collegeId || row.collegeId===7),courses:[{id:2,name:'B.Tech'}],branches:[{id:3,name:'CSE',courseId:2}],semesters:[{id:4,semesterName:'Semester 1',courseId:2,branchId:3,academicYearId:1}],sections:[{id:5,name:'A',semesterId:4,branchId:3}],branchesFor:()=>fixture.branches,semestersFor:()=>fixture.semesters,sectionsFor:()=>fixture.sections}))
vi.mock('../layouts/DashboardLayout',()=>({default:({children})=>children}))
vi.mock('../hooks/useCollegeState',async()=>({default:(await import('react')).useState}))
vi.mock('../auth/ScreenAccess',()=>({useScreenAccess:()=>({canAction:()=>fixture.edit})}))
vi.mock('../context/AcademicContext',()=>({useAcademic:()=>({selectedCollegeId:'7',selectedAcademicYearId:fixture.year,selectedAcademicYear:{id:fixture.year,name:'2026'},scopeRecords:fixture.scope,activeDepartments:[],activeCourses:fixture.courses,getBranchesForCourse:fixture.branchesFor,getSemestersForCourse:fixture.semestersFor,getSectionsForScope:fixture.sectionsFor})}))
vi.mock('../components/SearchableSelect',()=>({ProjectSelect:props=><select {...props}/>}))
vi.mock('../components/ExportMenu',()=>({default:({rows=[],title})=><output aria-label={title+' export'}>{JSON.stringify(rows)}</output>}))
vi.mock('../services/attendanceService',()=>({default:{getSessions:vi.fn(),getSessionStudents:vi.fn(),getStudentsForAttendance:vi.fn(),recordAttendance:vi.fn()}}))
vi.mock('../services/studentService',()=>({default:{getAllProfiles:vi.fn(async()=>[])}}))
vi.mock('../services/facultyService',()=>({default:{list:vi.fn(async()=>[{id:9,branchId:3,fullName:'Faculty One',status:'Active'}]),getSubjectAllocations:vi.fn(async()=>[])}}))
vi.mock('../services/subjectService',()=>({default:{getSubjects:vi.fn(async()=>[])}}))
vi.mock('../api/apiEndpoints',async original=>({...await original(),facultyMasterApi:{getSubjects:vi.fn(async()=>[{id:6,subjectName:'Programming',courseId:2,branchId:3,semesterId:4,academicYearId:1}]),getSemesters:vi.fn(async()=>fixture.semesters)}}))
const row={id:41,sessionId:41,collegeId:7,academicYearId:1,courseId:2,branchId:3,semesterId:4,sectionId:5,subjectId:6,date:'2026-11-05',subject:'Programming',faculty:'Faculty One',course:'B.Tech',branch:'CSE',semester:'Semester 1',section:'A',sessionStatus:'COMPLETED',totalStudents:2,presentCount:1,absentCount:1}
beforeEach(()=>{vi.clearAllMocks();fixture.edit=true;fixture.year='1';attendanceService.getSessions.mockResolvedValue([row]);attendanceService.getSessionStudents.mockResolvedValue([{studentId:11,name:'Asha',status:'Present'},{studentId:12,name:'Bina',status:'Absent'}]);attendanceService.getStudentsForAttendance.mockResolvedValue([])})
afterEach(cleanup)
const mount=(path='/student-management/attendance')=>render(<MemoryRouter initialEntries={[path]}><Attendance/></MemoryRouter>)
test('student register loads real scope, filters dates/status and exports the same matching rows',async()=>{
 mount();await screen.findByRole('button',{name:'View session details'});expect(attendanceService.getSessions).toHaveBeenCalledWith({collegeId:'7',academicYearId:'1'});fireEvent.click(screen.getByRole('button',{name:/Filters/}));fireEvent.change(screen.getByLabelText('Attendance from date'),{target:{value:'2026-11-06'}});expect(screen.queryByRole('button',{name:'View session details'})).toBeNull();expect(screen.getByLabelText('Attendance Register export').textContent).toBe('[]');fireEvent.change(screen.getByLabelText('Attendance from date'),{target:{value:'2026-11-01'}});fireEvent.change(screen.getByLabelText('Session status'),{target:{value:'OPEN'}});expect(screen.queryByRole('button',{name:'View session details'})).toBeNull()
})
test('student attendance read errors clear stale rows and offer retry',async()=>{
 attendanceService.getSessions.mockRejectedValueOnce(Error('Attendance offline')).mockResolvedValue([row]);mount();await screen.findByText('Attendance offline');expect(screen.queryByRole('button',{name:'View session details'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Retry attendance'}));await screen.findByRole('button',{name:'View session details'})
})
test('student attendance report details are loaded from the session API with failure retry',async()=>{
 attendanceService.getSessionStudents.mockRejectedValueOnce(Error('Report unavailable')).mockResolvedValue([{studentId:11,name:'Asha',status:'Present'}]);mount();await screen.findByRole('button',{name:'View session details'});fireEvent.click(screen.getByRole('button',{name:'Reports',exact:true}));await screen.findByText('Report unavailable');fireEvent.click(screen.getByRole('button',{name:'Retry attendance reports'}));fireEvent.click(screen.getByRole('tab',{name:'Student Report'}));await screen.findByRole('button',{name:'View Student Report'});expect(attendanceService.getSessionStudents).toHaveBeenCalledWith(41);fireEvent.click(screen.getByRole('button',{name:'View Student Report'}));const dialog=screen.getByRole('dialog');fireEvent(dialog,new Event('cancel',{cancelable:true}));expect(screen.queryByRole('dialog')).toBeNull()
})
test('weekly and monthly reports derive recorded totals and preserve filters',async()=>{
 mount();await screen.findByRole('button',{name:'View session details'});fireEvent.click(screen.getByRole('button',{name:'Reports',exact:true}));fireEvent.click(screen.getByRole('tab',{name:'Weekly'}));expect(screen.getByLabelText('Attendance Report export').textContent).toContain('Week of 2026-11-02');fireEvent.click(screen.getByRole('tab',{name:'Monthly'}));expect(screen.getByLabelText('Attendance Report export').textContent).toContain('2026-11');expect(screen.getByLabelText('Attendance Report export').textContent).toContain('50')
})
test('readonly direct take route cannot open a marking dialog',async()=>{
 fixture.edit=false;mount('/student-management/attendance/take');await screen.findByRole('button',{name:'View session details'});expect(screen.queryByRole('button',{name:'Record Attendance'})).toBeNull();expect(screen.queryByRole('dialog')).toBeNull();expect(attendanceService.recordAttendance).not.toHaveBeenCalled()
})
test('marking dialog cancellation never creates a session',async()=>{
 mount();await screen.findByRole('button',{name:'View session details'});fireEvent.click(screen.getByRole('button',{name:'Record Attendance'}));const dialog=screen.getByRole('dialog',{name:'Record Student Attendance'});fireEvent(dialog,new Event('cancel',{cancelable:true}));expect(screen.queryByRole('dialog')).toBeNull();expect(attendanceService.recordAttendance).not.toHaveBeenCalled()
})
test('working year change ignores a late response from the previous attendance scope',async()=>{
 let old;attendanceService.getSessions.mockImplementationOnce(()=>new Promise(resolve=>{old=resolve})).mockResolvedValue([]);const view=mount();await waitFor(()=>expect(attendanceService.getSessions).toHaveBeenCalledTimes(1));fixture.year='2';view.rerender(<MemoryRouter><Attendance/></MemoryRouter>);await waitFor(()=>expect(attendanceService.getSessions).toHaveBeenCalledWith({collegeId:'7',academicYearId:'2'}));await act(async()=>old([row]));expect(screen.queryByRole('button',{name:'View session details'})).toBeNull()
})

test('student marking uses scoped roster and retries an acknowledged save as a read only',async()=>{
 attendanceService.getStudentsForAttendance.mockResolvedValue([{id:11,studentId:11,name:'Assigned Student',status:''}]);attendanceService.recordAttendance.mockResolvedValue({attendanceSessionId:41})
 mount();await screen.findByRole('button',{name:'View session details'});fireEvent.click(screen.getByRole('button',{name:'Record Attendance'}))
 const dialog=within(screen.getByRole('dialog',{name:'Record Student Attendance'}))
 for(const [name,value] of [['course','2'],['branch','3'],['semester','4'],['section','5']])fireEvent.change(dialog.getByLabelText('Attendance '+name),{target:{value}})
 await dialog.findByText('Assigned Student');fireEvent.change(dialog.getByLabelText('Attendance subject'),{target:{value:'6'}});fireEvent.change(dialog.getByLabelText('Attendance faculty'),{target:{value:'9'}})
 fireEvent.click(dialog.getByRole('button',{name:'Mark All Present'}));attendanceService.getSessions.mockRejectedValueOnce(Error('Refresh offline')).mockResolvedValue([row])
 fireEvent.click(dialog.getByRole('button',{name:'Save & Publish Attendance'}));await dialog.findByText('Refresh offline')
 expect(attendanceService.recordAttendance).toHaveBeenCalledWith(expect.objectContaining({subjectId:6,sectionId:5,facultyId:9,records:[expect.objectContaining({studentId:11,status:'Present'})]}))
 fireEvent.click(dialog.getByRole('button',{name:'Retry saved attendance refresh'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(attendanceService.recordAttendance).toHaveBeenCalledTimes(1)
})

test('daily report groups actual sessions and student export uses the selected identity',async()=>{
 mount();await screen.findByRole('button',{name:'View session details'});fireEvent.click(screen.getByRole('button',{name:'Reports',exact:true}));fireEvent.click(screen.getByRole('tab',{name:'Daily'}));expect(screen.getByLabelText('Attendance Report export').textContent).toContain('2026-11-05');fireEvent.click(screen.getByRole('tab',{name:'Student Report'}));await screen.findByRole('option',{name:/Asha/});fireEvent.change(screen.getByLabelText('Student'),{target:{value:'11'}});expect(screen.getByLabelText('Attendance Report export').textContent).toContain('Asha');expect(screen.getByLabelText('Attendance Report export').textContent).not.toContain('Bina')
})
