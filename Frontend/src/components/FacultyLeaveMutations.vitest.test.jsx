import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { FacultyLeaveManagement } from '../pages/faculty/FacultyManagement'
import { facultyLeaveApi } from '../api/apiEndpoints'
const fixture=vi.hoisted(()=>({edit:true, scope:rows=>rows, members:[{id:'9',collegeId:7,fullName:'Faculty One',employeeId:'EMP000009',employeeCategory:'Teaching'}]}))
vi.mock('../layouts/DashboardLayout',()=>({default:({children})=>children}))
vi.mock('../auth/ScreenAccess',()=>({useScreenAccess:()=>({canAction:()=>fixture.edit})}))
vi.mock('../context/AcademicContext',()=>({useAcademic:()=>({selectedCollegeId:'7',scopeRecords:fixture.scope})}))
vi.mock('../components/ExportMenu',()=>({default:()=>null}))
vi.mock('../services/facultyService',async original=>({...await original(),default:{list:async()=>fixture.members}}))
vi.mock('../api/apiEndpoints',async original=>({...await original(),academicYearApi:{getAll:async()=>[]},facultyLeaveApi:{getRequests:vi.fn(),getHistory:vi.fn(),getBalances:vi.fn(),getTypes:vi.fn(),getPolicies:vi.fn(),approve:vi.fn(),reject:vi.fn()}}))
beforeEach(()=>{vi.clearAllMocks();fixture.edit=true;facultyLeaveApi.getRequests.mockResolvedValue([{id:'31',facultyId:9,status:'Pending',leaveTypeId:'1',leaveTypeName:'Casual Leave',fromDate:'2026-11-02',toDate:'2026-11-02',days:1}]);for(const key of ['getHistory','getBalances','getTypes','getPolicies'])facultyLeaveApi[key].mockResolvedValue([])})
afterEach(cleanup)
test('failed leave approval stays pending and can retry without fabricated history',async()=>{
 facultyLeaveApi.approve.mockRejectedValueOnce(new Error('Approval denied')).mockResolvedValue({})
 render(<FacultyLeaveManagement/>);await screen.findByText('Faculty One');fireEvent.click(screen.getByRole('button',{name:'Approve leave request'}));const dialog=screen.getByRole('dialog');fireEvent.click(within(dialog).getByRole('button',{name:'Confirm'}));await waitFor(()=>expect(facultyLeaveApi.approve).toHaveBeenCalledTimes(1));expect(screen.getByRole('dialog')).toBeTruthy();expect(facultyLeaveApi.approve).toHaveBeenCalledWith('31');expect(screen.getByText('Faculty One')).toBeTruthy();fireEvent.click(within(dialog).getByRole('button',{name:'Confirm'}));await screen.findByText('Leave request approved.');expect(facultyLeaveApi.approve).toHaveBeenCalledTimes(2)
})
test('missing backend leave balances are unavailable instead of default twelve days',async()=>{
 render(<FacultyLeaveManagement/>);await screen.findByText('Faculty One');fireEvent.click(screen.getByRole('button',{name:'Leave Balances'}));expect(screen.getAllByText('Not provided').length).toBeGreaterThanOrEqual(4)
})
