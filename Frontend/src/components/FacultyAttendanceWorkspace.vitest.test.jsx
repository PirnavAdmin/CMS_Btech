import {beforeEach,afterEach,test,expect,vi} from 'vitest'
import {render,screen,fireEvent,waitFor,within,cleanup} from '@testing-library/react'
import {FacultyDailyAttendance} from '../pages/faculty/FacultyManagement'
import facultyService from '../services/facultyService'
import {localAttendanceDate} from '../utils/facultyAttendance'
const fixture=vi.hoisted(()=>({edit:true,college:'7',faculty:[{id:'9',fullName:'Faculty One',employeeId:'EMP000009',collegeId:7,employeeCategory:'Teaching',department:'Engineering',status:'Working'}]}))
vi.mock('../auth/ScreenAccess',()=>({useScreenAccess:()=>({canAction:()=>fixture.edit})}))
vi.mock('../context/AcademicContext',()=>({useAcademic:()=>({selectedCollegeId:fixture.college,selectedAcademicYearId:'1'})}))
vi.mock('../hooks/useCollegeState',async()=>({default:(await import('react')).useState}))
vi.mock('../components/ExportMenu',()=>({default:({rows=[],title})=><output aria-label={title+' export'}>{JSON.stringify(rows)}</output>}))
vi.mock('../components/SearchableSelect',()=>({ProjectSelect:props=><select {...props}/>,default:({label,value,options=[],onChange})=><label>{label}<select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>{options.map(row=><option key={row.value??row} value={row.value??row}>{row.label??row}</option>)}</select></label>}))
vi.mock('../services/facultyService',async original=>({...await original(),default:{getAttendance:vi.fn(),getDailyAttendance:vi.fn(),getAttendanceDetails:vi.fn(),createAttendance:vi.fn(),updateAttendance:vi.fn(),checkIn:vi.fn(),checkOut:vi.fn(),bulkAttendance:vi.fn()}}))
const date=localAttendanceDate(new Date()),record={attendanceId:51,facultyId:9,attendanceDate:date,status:'Present',checkIn:'09:12',checkOut:'17:04',workingMinutes:472}
beforeEach(()=>{vi.clearAllMocks();fixture.edit=true;fixture.college='7';facultyService.getAttendance.mockResolvedValue([record]);facultyService.getDailyAttendance.mockResolvedValue([]);facultyService.getAttendanceDetails.mockResolvedValue(record);facultyService.updateAttendance.mockResolvedValue({});facultyService.checkIn.mockResolvedValue({});facultyService.checkOut.mockResolvedValue({});facultyService.bulkAttendance.mockResolvedValue({})})
afterEach(cleanup)
function mount(){return render(<FacultyDailyAttendance faculty={fixture.faculty} onNotify={vi.fn()}/>)}
test('faculty daily register displays actual check-in/out and filters to current employees',async()=>{
 facultyService.getAttendance.mockResolvedValue([record,{...record,attendanceId:99,facultyId:88,checkIn:'08:00'}]);mount();await screen.findByText('9:12 AM');expect(screen.getByText('5:04 PM')).toBeTruthy();expect(screen.queryByText('8:00 AM')).toBeNull();expect(screen.getByLabelText('Attendance export').textContent).toContain('9:12 AM')
})
test('faculty attendance read failure offers retry with no fallback records',async()=>{
 facultyService.getAttendance.mockRejectedValueOnce(Error('Faculty attendance offline')).mockResolvedValue([record]);mount();await screen.findByText('Faculty attendance offline');fireEvent.click(screen.getByRole('button',{name:'Retry attendance'}));await screen.findByText('9:12 AM')
})
test('faculty weekly report and filtered export contain real recorded totals',async()=>{
 mount();await screen.findByText('9:12 AM');fireEvent.click(screen.getByRole('button',{name:'Reports',exact:true}));fireEvent.click(screen.getByRole('button',{name:'Weekly',exact:true}));await waitFor(()=>expect(screen.getByLabelText('Weekly Report export').textContent).toContain('Faculty One'));expect(screen.getByLabelText('Weekly Report export').textContent).toContain('present');fireEvent.click(screen.getByRole('button',{name:'Monthly',exact:true}));await waitFor(()=>expect(screen.getByLabelText('Monthly Report export').textContent).toContain('Faculty One'))
})
test('readonly faculty attendance hides edit and bulk mutations',async()=>{
 fixture.edit=false;mount();await screen.findByText('9:12 AM');expect(screen.queryByRole('button',{name:/Edit attendance for/})).toBeNull();expect(screen.queryByRole('button',{name:'Mark Present'})).toBeNull();expect(facultyService.createAttendance).not.toHaveBeenCalled()
})
test('faculty saved attendance read failure requires refresh-only recovery',async()=>{
 mount();await screen.findByText('9:12 AM');fireEvent.click(screen.getByRole('button',{name:/Edit attendance for/}));const dialog=await screen.findByRole('dialog',{name:'Edit Faculty Attendance'});facultyService.getAttendance.mockRejectedValueOnce(Error('Refresh offline')).mockRejectedValueOnce(Error('Refresh offline')).mockResolvedValue([record]);fireEvent.submit(within(dialog).getByRole('button',{name:'Save Attendance'}).closest('form'));await screen.findByRole('button',{name:'Retry saved attendance refresh'});expect(facultyService.updateAttendance).toHaveBeenCalledTimes(1);fireEvent.click(screen.getByRole('button',{name:'Retry saved attendance refresh'}));await waitFor(()=>expect(screen.queryByRole('button',{name:'Retry saved attendance refresh'})).toBeNull());expect(facultyService.updateAttendance).toHaveBeenCalledTimes(1)
})

test('faculty bulk attendance requires confirmation and cancellation writes nothing',async()=>{
 mount();await screen.findByText('9:12 AM');fireEvent.click(screen.getByRole('checkbox',{name:'Select Faculty One'}));fireEvent.click(screen.getByRole('button',{name:'Mark Absent'}));const dialog=screen.getByRole('dialog',{name:'Mark Absent attendance?'});fireEvent.click(within(dialog).getByRole('button',{name:'Cancel'}));expect(facultyService.bulkAttendance).not.toHaveBeenCalled()
})
test('faculty bulk rejection preserves confirmation and retries the supported transaction',async()=>{
 facultyService.bulkAttendance.mockRejectedValueOnce(Error('Bulk rejected')).mockResolvedValue({});mount();await screen.findByText('9:12 AM');fireEvent.click(screen.getByRole('checkbox',{name:'Select Faculty One'}));fireEvent.click(screen.getByRole('button',{name:'Mark Absent'}));const dialog=screen.getByRole('dialog',{name:'Mark Absent attendance?'});fireEvent.click(within(dialog).getByRole('button',{name:'Continue'}));await within(dialog).findByText('Bulk rejected');expect(screen.getByRole('dialog')).toBeTruthy();fireEvent.click(within(dialog).getByRole('button',{name:'Continue'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(facultyService.bulkAttendance).toHaveBeenCalledTimes(2);expect(facultyService.bulkAttendance).toHaveBeenLastCalledWith({facultyIds:[9],attendanceDate:date,status:'Absent',remarks:null})
})
