import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import PayrollWorkspace from '../pages/faculty/PayrollWorkspace'
import { facultyPayrollApi } from '../api/apiEndpoints'
const scope=vi.hoisted(()=>({selectedCollegeId:'7',scopeRecords:rows=>rows.filter(row=>row.collegeId===7)}))
vi.mock('../layouts/DashboardLayout',()=>({default:({children})=>children}))
vi.mock('../context/AcademicContext',()=>({useAcademic:()=>scope}))
vi.mock('../auth/ScreenAccess',()=>({useScreenAccess:()=>({canAction:()=>true})}))
vi.mock('../services/facultyService',()=>({default:{list:async()=>[{id:9,collegeId:7,facultyCode:'FAC009'},{id:10,collegeId:8,facultyCode:'FAC010'}]}}))
vi.mock('../api/apiEndpoints',()=>({facultyPayrollApi:{getAll:vi.fn(),getSalaryRecords:vi.fn(),getPayslips:vi.fn(),hold:vi.fn(),export:vi.fn()}}))
beforeEach(()=>{vi.clearAllMocks();facultyPayrollApi.getAll.mockResolvedValue([{id:9,payrollId:21,employeeId:'FAC009',fullName:'Faculty One',grossSalary:null,netSalary:null,status:'Draft'},{id:10,payrollId:22,employeeId:'FAC010',fullName:'Other College',netSalary:50000}])})
afterEach(cleanup)
test('payroll uses server values and excludes other college records without invented salary',async()=>{
 render(<PayrollWorkspace/>);await screen.findByText('Faculty One');expect(screen.queryByText('Other College')).toBeNull();expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(1);expect(screen.getByText(/Salary configuration, processing/)).toBeTruthy();expect(screen.queryByRole('button',{name:/Process payroll/})).toBeNull()
})
test('failed hold retains dialog and reason; retry uses actual payroll identity',async()=>{
 facultyPayrollApi.hold.mockRejectedValueOnce(new Error('Hold denied')).mockResolvedValue({})
 render(<PayrollWorkspace/>);await screen.findByText('Faculty One');fireEvent.click(screen.getByRole('button',{name:'Place hold'}));let dialog=screen.getByRole('dialog');fireEvent.change(within(dialog).getByLabelText('Hold reason'),{target:{value:'Verify payroll'}});fireEvent.submit(within(dialog).getByRole('button',{name:'Confirm hold'}).closest('form'));await within(dialog).findByText('Hold denied');expect(within(dialog).getByLabelText('Hold reason').value).toBe('Verify payroll');fireEvent.submit(within(dialog).getByRole('button',{name:'Confirm hold'}).closest('form'));await screen.findByText('Payroll placed on hold.');expect(facultyPayrollApi.hold).toHaveBeenLastCalledWith(21,'Verify payroll')
})
test('payroll failure provides retry without fallback records',async()=>{
 facultyPayrollApi.getAll.mockRejectedValueOnce(new Error('Payroll offline'));render(<PayrollWorkspace/>);await screen.findByRole('alert');expect(screen.queryByText('Faculty One')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Retry payroll'}));await screen.findByText('Faculty One')
})
