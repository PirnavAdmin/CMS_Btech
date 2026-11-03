import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Branch } from '../pages/courseManagement/Course.jsx'

const state = vi.hoisted(() => ({ years:4, count:8, semesters:[], branch:null }))
vi.mock('../layouts/DashboardLayout', () => ({ default: ({children}) => <>{children}</> }))
vi.mock('../hooks/useToastState', async () => ({ default:(await import('react')).useState }))
vi.mock('../context/AcademicContext', () => ({ useAcademic:() => ({ selectedCollegeId:'1', selectedAcademicYearId:'1', scopeRecords:rows => rows }) }))
vi.mock('../components/SearchableSelect', () => ({ ProjectSelect: props => <select {...props}/>, default:({label,value,options,onChange}) => <select aria-label={label} value={value} onChange={event => onChange(event.target.value)}><option value="">Select</option>{options.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select> }))
vi.mock('../api/apiEndpoints', async original => {
  const actual = await original()
  return { ...actual,
    courseApi:{getAll:async () => [{courseId:10,collegeId:1,courseName:'Configured Course',durationYears:state.years,totalSemesters:state.count,status:1,academicSystem:'Semester'}]},
    academicYearApi:{getAll:async () => []},
    branchApi:{getAll:async () => [],create:vi.fn(async payload => { state.branch={...payload,branchId:7}; return state.branch }), update:vi.fn(async (_id,payload) => ({...state.branch,...payload})), getById:async () => state.branch},
  }
})
vi.mock('../auth/collegeApi', async original => ({ ...await original(),
  getSemesters:vi.fn(async () => ({data:{data:state.semesters}})),
  createSemester:vi.fn(async payload => { expect(state.branch?.branchId).toBe(7); const row={...payload,semesterId:100+payload.semesterNumber}; state.semesters.push(row); return {data:{data:row}} }),
}))
import { branchApi } from '../api/apiEndpoints'
import { createSemester } from '../auth/collegeApi'
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); localStorage.setItem('pirnav_academic_context',JSON.stringify({collegeId:'1'})); state.branch=null; state.semesters=[] })
afterEach(cleanup)

test.each([[4,8],[2,4],[3,9]])('branch save establishes the configured %s-year/%s-semester structure', async (years,count) => {
  state.years=years; state.count=count
  render(<MemoryRouter initialEntries={['/branches/add']}><Routes><Route path="/branches/add" element={<Branch mode="form"/>}/><Route path="/semester-management" element={<h1>Saved semesters</h1>}/></Routes></MemoryRouter>)
  await screen.findByRole('option',{name:'Configured Course'})
  fireEvent.change(screen.getByRole('combobox',{name:'Course Name'}),{target:{value:'10'}})
  fireEvent.change(screen.getByLabelText(/Branch Name/),{target:{value:'Computer Science'}})
  fireEvent.change(screen.getByLabelText(/Branch Code/),{target:{value:'CSE'}})
  fireEvent.change(screen.getByLabelText(/Branch Type/),{target:{value:'Core'}})
  fireEvent.click(screen.getByRole('button',{name:'Next'}))
  fireEvent.change(screen.getByLabelText(/Approved Intake/),{target:{value:'60'}})
  fireEvent.change(screen.getByLabelText(/^Status/),{target:{value:'Active'}})
  expect(createSemester).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'Create Branch'}))
  await screen.findByRole('heading',{name:'Saved semesters'})
  expect(branchApi.create).toHaveBeenCalledTimes(1)
  expect(createSemester).toHaveBeenCalledTimes(count)
  expect(state.semesters.at(-1).yearNumber).toBe(years)
})

test('editing a saved branch never regenerates its semesters', async () => {
  state.years=2; state.count=4
  state.branch={branchId:7,courseId:10,branchName:'Computer Science',branchCode:'CSE',branchType:'Core',intakeCapacity:60,status:1,duration:2,totalSemesters:4}
  state.semesters=[{semesterId:44,courseId:10,branchId:7,semesterNumber:1,yearNumber:1}]
  render(<MemoryRouter initialEntries={['/branches/7/edit']}><Routes><Route path="/branches/:id/edit" element={<Branch mode="form"/>}/><Route path="/branches" element={<h1>Saved branches</h1>}/></Routes></MemoryRouter>)
  await waitFor(() => expect(screen.getByLabelText(/Branch Name/).value).toBe('Computer Science'))
  fireEvent.click(screen.getByRole('button',{name:'Next'}))
  fireEvent.click(screen.getByRole('button',{name:'Update Branch'}))
  await screen.findByRole('heading',{name:'Saved branches'})
  expect(branchApi.update).toHaveBeenCalledTimes(1)
  expect(createSemester).not.toHaveBeenCalled()
  expect(state.semesters[0].semesterId).toBe(44)
})
