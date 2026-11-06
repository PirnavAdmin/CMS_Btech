import {beforeEach,afterEach,test,expect,vi} from 'vitest'
import {render,screen,fireEvent,cleanup} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import FacultyAttendance from '../pages/portals/FacultyAttendance'
import {teachingService} from '../services/portals/teachingService'
vi.mock('../context/AcademicContext',()=>({useAcademic:()=>({selectedCollegeId:'7',selectedAcademicYearId:'4'})}))
const access=vi.hoisted(()=>({write:true}))
vi.mock('../auth/ScreenAccess',()=>({useScreenAccess:()=>({canAction:()=>access.write})}))
vi.mock('../services/portals/teachingService',()=>({teachingService:{getSnapshot:vi.fn(),getSessions:vi.fn(),getSessionHistory:vi.fn(),getSessionRoster:vi.fn(),getClassRoster:vi.fn(),saveAttendance:vi.fn(),reopenAttendance:vi.fn()}}))
beforeEach(()=>{vi.clearAllMocks();access.write=true;teachingService.getSnapshot.mockResolvedValue({assignments:[]})})
afterEach(cleanup)
test('faculty class attendance starts with live college records and exposes no mock controls',async()=>{
 render(<MemoryRouter><FacultyAttendance/></MemoryRouter>);await screen.findByText(/No teaching allocations found/);expect(teachingService.getSnapshot).toHaveBeenCalledTimes(1);expect(screen.queryByRole('button',{name:/mock students/i})).toBeNull();expect(screen.queryByText(/sample students/i)).toBeNull()
})
test('faculty live attendance failure retries the API without switching to sample records',async()=>{
 teachingService.getSnapshot.mockRejectedValueOnce(Error('College attendance offline')).mockResolvedValue({assignments:[]});render(<MemoryRouter><FacultyAttendance/></MemoryRouter>);await screen.findByText('College attendance offline');fireEvent.click(screen.getByRole('button',{name:'Retry college records'}));await screen.findByText(/No teaching allocations found/);expect(teachingService.getSnapshot).toHaveBeenCalledTimes(2);expect(screen.queryByRole('button',{name:/mock/i})).toBeNull()
})

test('assigned completed register loads actual marks and explicitly reopens for correction',async()=>{
 const assignment={id:'20',collegeId:7,academicYearId:4,branchId:3,semesterId:2,sectionId:5,subjectId:8,subjectName:'Programming'}
 const session={attendanceSessionId:40,sessionStatus:'COMPLETED'}
 teachingService.getSessions.mockResolvedValue([session]);teachingService.getSessionHistory.mockResolvedValue([]);teachingService.getSessionRoster.mockResolvedValue({students:[{studentId:10,studentName:'Assigned student',attendanceStatus:'PRESENT'}]});teachingService.reopenAttendance.mockImplementation(async()=>{teachingService.getSessions.mockResolvedValue([{...session,sessionStatus:'OPEN'}])})
 render(<MemoryRouter initialEntries={['/?assignment=20&date=2026-01-10']}><FacultyAttendance data={{assignments:[assignment],students:[],warnings:[]}}/></MemoryRouter>)
 await screen.findByText('Assigned student');fireEvent.click(screen.getByRole('button',{name:'Reopen for correction'}));expect(teachingService.reopenAttendance).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Confirm reopen'}));await screen.findByText('Assigned student');expect(teachingService.reopenAttendance).toHaveBeenCalledWith('20','2026-01-10','40')
})

test('class register loads live assigned students, requires review and retains marks on a failed submission',async()=>{
 const assignment={id:'20',collegeId:7,academicYearId:4,branchId:3,semesterId:2,sectionId:5,subjectId:8,subjectName:'Programming'}
 teachingService.getSessions.mockResolvedValue([]);teachingService.getSessionHistory.mockResolvedValue([]);teachingService.getClassRoster.mockResolvedValue([{studentId:10,name:'Live student'}]);teachingService.saveAttendance.mockRejectedValueOnce(Error('Mark offline')).mockResolvedValue({})
 render(<MemoryRouter initialEntries={['/?assignment=20&date=2026-01-10']}><FacultyAttendance data={{assignments:[assignment]}}/></MemoryRouter>);await screen.findByText('Live student');fireEvent.click(screen.getByRole('button',{name:'Mark All Present'}));fireEvent.click(screen.getByRole('button',{name:'Review & Submit Attendance'}));expect(teachingService.saveAttendance).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Confirm & Submit'}));await screen.findByText('Mark offline');fireEvent.click(screen.getByRole('button',{name:'Confirm & Submit'}));await screen.findByText(/submitted successfully/);expect(teachingService.saveAttendance).toHaveBeenLastCalledWith(expect.objectContaining({records:[{studentId:10,attendanceStatus:'PRESENT',remarks:null}]}))
})

test('readonly faculty can inspect live history but cannot reopen a completed register',async()=>{
 access.write=false;const assignment={id:'20',collegeId:7,academicYearId:4,branchId:3,semesterId:2,sectionId:5,subjectId:8,subjectName:'Programming'}
 const session={attendanceSessionId:40,attendanceDate:'2026-01-10',sessionStatus:'COMPLETED'}
 teachingService.getSessions.mockResolvedValue([session]);teachingService.getSessionHistory.mockResolvedValue([session]);teachingService.getSessionRoster.mockResolvedValue({students:[{studentId:10,studentName:'Assigned student',attendanceStatus:'PRESENT'}]})
 render(<MemoryRouter initialEntries={['/?assignment=20&date=2026-01-10']}><FacultyAttendance data={{assignments:[assignment]}}/></MemoryRouter>);await screen.findByText('Assigned student');expect(screen.queryByRole('button',{name:'Reopen for correction'})).toBeNull();expect(screen.queryByRole('button',{name:'Review & Submit Attendance'})).toBeNull();expect(teachingService.getSessionHistory).toHaveBeenCalledWith('20')
})
