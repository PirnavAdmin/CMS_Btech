import { campusApi } from '../../api/apiEndpoints.js'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CollegeProfile, { CampusManagement } from './CollegeProfile.jsx'
import { getCollegeById } from '../../auth/collegeApi.js'
const fixture = vi.hoisted(() => ({ access: { collegeId: 7, primaryCollegeId: 7, isCollegeAdmin: true }, refresh: vi.fn() }))
vi.mock('../../layouts/DashboardLayout.jsx', () => ({default:({children})=>children}))
vi.mock('../../context/AcademicContext.jsx', () => ({useAcademic:()=>({selectedCollegeId:'8',selectedCollege:{id:8,name:'Other College'},loading:false,refreshHierarchy:fixture.refresh})}))
vi.mock('../../auth/ScreenAccess.jsx', () => ({useScreenAccess:()=>({access:fixture.access,loading:false,canAction:()=>true})}))
vi.mock('../../auth/collegeApi.js', () => ({getCollegeById:vi.fn(),unwrapCollegeRecord:row=>row,getCollegeLogoUrl:()=>''}))
beforeEach(()=>{vi.clearAllMocks();fixture.access={collegeId:7,primaryCollegeId:7,isCollegeAdmin:true};getCollegeById.mockResolvedValue({data:{id:7,collegeName:'Assigned College',collegeCode:'AC',status:1,email:'office@example.edu'}})})
afterEach(cleanup)
test('profile loads authoritative assigned college instead of working preference',async()=>{render(<MemoryRouter><CollegeProfile /></MemoryRouter>);await screen.findByRole('heading',{name:'Assigned College'});expect(getCollegeById).toHaveBeenCalledWith('7');expect(screen.queryByText('Other College')).toBeNull();expect(screen.queryByText('Add College')).toBeNull()})
test('mismatched profile response is never displayed',async()=>{getCollegeById.mockResolvedValue({data:{id:8,name:'Unauthorized College'}});render(<MemoryRouter><CollegeProfile /></MemoryRouter>);expect(await screen.findByText(/does not match your authorized college/)).toBeTruthy();expect(screen.queryByText('Unauthorized College')).toBeNull()})
test('edit reuses existing form for assigned ID and refreshes after confirmed save',async()=>{const Form=({editId,onSaved})=><button onClick={onSaved}>Save profile {editId}</button>;render(<MemoryRouter><CollegeProfile EditForm={Form}/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'Edit Profile'}));fireEvent.click(screen.getByRole('button',{name:'Save profile 7'}));await waitFor(()=>expect(fixture.refresh).toHaveBeenCalledOnce());expect(getCollegeById).toHaveBeenCalledTimes(2)})
test('missing authoritative assignment fails closed without requesting a profile',async()=>{fixture.access={isCollegeAdmin:true};render(<MemoryRouter><CollegeProfile /></MemoryRouter>);expect(await screen.findByText(/no assigned college/)).toBeTruthy();expect(getCollegeById).not.toHaveBeenCalled()})

vi.mock('../../api/apiEndpoints.js', () => ({ campusApi: { list: vi.fn(), create: vi.fn() } }))
test('campus directory loads assigned records and opens Add Campus', async () => {
  campusApi.list.mockResolvedValue({ items: [{ id: 1, name: 'Main Campus', code: 'MAIN' }], hasNext: false })
  render(<MemoryRouter><CampusManagement /></MemoryRouter>)
  expect(await screen.findByText('Main Campus')).toBeTruthy()
  expect(campusApi.list).toHaveBeenCalledWith({ collegeId: '7', isSuperAdmin: false, pageNumber: 1 })
  fireEvent.click(screen.getByRole('button', { name: 'Add Campus' }))
  expect(screen.getByLabelText('Campus Name')).toBeTruthy()
})