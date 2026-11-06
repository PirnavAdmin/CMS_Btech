import {afterEach,beforeEach,test,expect,vi} from 'vitest'
import {render,screen,fireEvent,cleanup,within,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import SelfAttendance from '../pages/portals/FacultySelfAttendance'
import facultyService from '../services/facultyService'
import {localAttendanceDate} from '../utils/facultyAttendance'
const fixture=vi.hoisted(()=>({edit:true,college:'7'}))
vi.mock('../context/AcademicContext',()=>({useAcademic:()=>({selectedCollegeId:fixture.college,selectedAcademicYearId:'1'})}))
vi.mock('../auth/ScreenAccess',()=>({useScreenAccess:()=>({canAction:()=>fixture.edit})}))
vi.mock('../services/portals/teachingService',()=>({teachingService:{getFacultyIdentity:vi.fn(async()=>({facultyId:9,collegeId:7}))}}))
vi.mock('../services/facultyService',()=>({default:{getAttendance:vi.fn(),checkIn:vi.fn(),checkOut:vi.fn(),createAttendance:vi.fn()}}))
const today=localAttendanceDate(new Date()),row={faculty_id:9,attendance_id:41,attendance_date:today,status:'PRESENT'}
beforeEach(()=>{vi.clearAllMocks();fixture.edit=true;fixture.college='7';facultyService.getAttendance.mockResolvedValue([row]);facultyService.checkIn.mockResolvedValue({});facultyService.checkOut.mockResolvedValue({})})
afterEach(cleanup)
const mount=()=>render(<MemoryRouter><SelfAttendance/></MemoryRouter>)
test('check-in uses the server clock and refreshes without another write',async()=>{
 mount();await screen.findByRole('button',{name:'View details'});fireEvent.click(screen.getByRole('button',{name:'Check in'}))
 facultyService.getAttendance.mockRejectedValueOnce(Error('Refresh offline')).mockResolvedValue([{...row,check_in:'09:12'}])
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Confirm'}));fireEvent.click(await screen.findByRole('button',{name:'Retry saved attendance refresh'}))
 await screen.findByText('Saved attendance refreshed.');expect(facultyService.checkIn).toHaveBeenCalledExactlyOnceWith(41,{});expect(facultyService.createAttendance).not.toHaveBeenCalled()
})
test('check-out failure offers a read retry and preserves the server record',async()=>{
 facultyService.getAttendance.mockResolvedValue([{...row,check_in:'09:12'}]);facultyService.checkOut.mockRejectedValueOnce(Error('Punch rejected'));mount();await screen.findByRole('button',{name:'View details'});fireEvent.click(screen.getByRole('button',{name:'Check out'}));fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Confirm'}));await screen.findByText(/Punch rejected/);fireEvent.click(screen.getByRole('button',{name:'Retry attendance'}));await waitFor(()=>expect(screen.getByRole('button',{name:'Check out'}).disabled).toBe(false));expect(facultyService.checkOut).toHaveBeenCalledExactlyOnceWith(41,{})
})
test('readonly history shows only the signed-in faculty and hides punch actions',async()=>{
 fixture.edit=false;facultyService.getAttendance.mockResolvedValue([{...row,status:'LOP'},{...row,faculty_id:99,attendance_id:42,remarks:'Other employee'}]);mount();await screen.findByRole('button',{name:'View details'});expect(screen.queryByText('Other employee')).toBeNull();expect(screen.queryByRole('button',{name:'Check in'})).toBeNull();expect(screen.getAllByText('Loss of Pay').length).toBeGreaterThan(0)
})

test('college switch rejects a foreign faculty mapping and removes prior records',async()=>{
 const view=mount();await screen.findByRole('button',{name:'View details'});fixture.college='8';view.rerender(<MemoryRouter><SelfAttendance/></MemoryRouter>);await screen.findByText(/does not belong to the working college/);expect(screen.queryByRole('button',{name:'View details'})).toBeNull();expect(facultyService.getAttendance).toHaveBeenCalledTimes(2)
})
