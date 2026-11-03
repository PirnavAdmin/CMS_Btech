import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const transport = vi.hoisted(() => vi.fn())
const roleState = vi.hoisted(() => ({role:'admin'}))
const myProfile = vi.hoisted(() => vi.fn())
const academic = vi.hoisted(() => ({ selectedCollegeId: 1, selectedAcademicYearId: 10, courses: [], branches: [], semesters: [], sections: [] }))
vi.mock('../api/apiEndpoints', () => ({ API_BASE_URL: '', authenticatedRequest: transport, studentProfileApi: {getMyProfile:myProfile} }))
vi.mock('../context/AcademicContext', () => ({ useAcademic: () => academic }))
vi.mock('../layouts/DashboardLayout', () => ({ default: ({children}) => <div>{children}</div> }))
vi.mock('../auth/auth', () => ({ getUserRole: () => roleState.role, getUserCollegeId: () => '' }))
vi.mock('../components/SearchableSelect', () => ({ ProjectSelect: props => <select {...props} /> }))
vi.mock('../services/academicService',()=>({default:{getDepartments:async()=>[]}}))
vi.mock('../services/roomService',()=>({default:{getRooms:async()=>[]}}))
import * as api from '../services/scopedModulesService'
import useScopedModule from '../services/useScopedModule'
import LiveExaminationWorkspace from '../pages/examinations/LiveExaminationWorkspace'
import { loadExaminationData } from '../services/examinationWorkspaceService'
import { LibraryWorkspace, MeetingsEventsWorkspace, PlacementWorkspace } from '../pages/campus/CampusWorkspace'

const response = data => ({ success: true, data })
const scope = { collegeId: 1, academicYearId: 10 }
const urlPath = url => new URL(url, 'http://localhost').pathname
beforeEach(() => { transport.mockReset(); myProfile.mockReset(); roleState.role='admin'; academic.selectedCollegeId=1; academic.selectedAcademicYearId=10 })
afterEach(()=>{cleanup();delete academic.loading})

describe('scoped module API contracts', () => {
  it('unwraps supplemental payloads while preserving server identity and publication status', () => {
    expect(api.rows(response([{ id: 8, status: 'Published', data: { id:'local', collegeId:1, records:[] } }]))).toEqual([{ id:8, status:'Published', collegeId:1, records:[], data:undefined }])
    expect(api.record({book_id:2, available_copies:3})).toEqual({bookId:2,availableCopies:3})
  })
  it('paginates lists and stops when an unpaginated endpoint repeats its response', async () => {
    const first=Array.from({length:100},(_,id)=>({id}))
    transport.mockResolvedValueOnce(response(first)).mockResolvedValueOnce(response([{id:100}]))
    expect(await api.list('library/books', {collegeId:1})).toHaveLength(101)
    expect(transport.mock.calls[1][0]).toContain('page=2')
    transport.mockReset();const unpaged=Array.from({length:140},(_,id)=>({id}));transport.mockResolvedValue(response(unpaged))
    expect(await api.list('grades')).toHaveLength(140)
    expect(transport).toHaveBeenCalledTimes(2)
  })
  it('accepts empty server results and never falls back to local results', async () => {
    localStorage.setItem('cms_local_results_sheets',JSON.stringify([{collegeId:1}]))
    transport.mockResolvedValue(response([]))
    expect(await api.loadOfficialResults(scope)).toEqual([])
    transport.mockRejectedValue(new Error('Offline'))
    await expect(api.loadOfficialResults(scope)).rejects.toThrow('Offline')
  })
  it('shows published records only for the selected college and academic year', async () => {
    transport.mockResolvedValue(response([
      {id:1,status:'Published',data:{...scope,records:[{studentId:1}]}},
      {id:2,status:'Draft',data:{...scope,records:[]}},
      {id:3,status:'Revoked',data:{...scope,records:[]}},
      {id:4,status:'Published',data:{collegeId:2,academicYearId:10,records:[]}},
      {id:5,status:'Published',data:{collegeId:1,academicYearId:11,records:[]}},
    ]))
    expect((await api.loadOfficialResults(scope)).map(r=>r.id)).toEqual([1])
  })
  it('shows only the signed-in student records in official result sheets',async()=>{
    roleState.role='student';myProfile.mockResolvedValue({studentId:7})
    transport.mockResolvedValue(response([{id:1,status:'Published',data:{...scope,records:[{studentId:7,grade:'A'},{studentId:8,grade:'B'}]}}]))
    const sheets=await api.loadOfficialResults(scope)
    expect(sheets[0].records).toEqual([{studentId:7,grade:'A'}])
  })
  it('saves an institutional policy by server id', async () => {
    transport.mockResolvedValue({success:true,id:11})
    const bands=[{grade:'O',min:0,max:100,points:10,pass:true}]
    await api.saveGradePolicy(scope,bands,{id:11})
    expect(transport.mock.calls[0][0]).toBe('/api/v1/grade-policies/11')
    expect(transport.mock.calls[0][1].method).toBe('PUT')
    expect(JSON.parse(transport.mock.calls[0][1].body)).toEqual({...scope,bands})
  })
  it('sends real library category and accession ids instead of generated copy data', async () => {
    transport.mockResolvedValue(response({book_id:2}))
    await api.saveBook({title:'Book',author:'Author',category:'Science',accessionNo:'ACC-1',rack:'A',totalCopies:3},null,scope,[{categoryId:5,categoryName:'Science'}])
    expect(urlPath(transport.mock.calls[0][0])).toBe('/api/v1/library/books')
    expect(JSON.parse(transport.mock.calls[0][1].body)).toMatchObject({collegeId:1,categoryId:5,accessionNo:'ACC-1',totalCopies:3,shelfLocation:'A'})
    await expect(api.saveBook({category:'Missing'},null,scope,[])).rejects.toThrow('category')
    expect(transport).toHaveBeenCalledTimes(1)
  })
  it('maps meeting datetimes and status without inventing organizer ids', async () => {
    transport.mockResolvedValue(response({}))
    await api.saveMeetingEvent('meeting',{title:'Council',start:'2026-11-04T09:00',end:'2026-11-04T10:30',status:'Upcoming'},null,scope)
    expect(JSON.parse(transport.mock.calls[0][1].body)).toMatchObject({meetingDate:'2026-11-04',startTime:'09:00:00',endTime:'10:30:00',status:'SCHEDULED',organizerId:null})
    await expect(api.saveMeetingEvent('meeting',{start:'2026-11-04T09:00',end:'2026-11-05T10:30'},null,scope)).rejects.toThrow('same date')
  })
  it('uses the selection API when creating an offer decision', async () => {
    transport.mockResolvedValue(response({}))
    await api.savePlacement('offer',{id:'9',applicationId:6,role:'Engineer',ctcNum:8,selectionStatus:'SELECTED'},false,scope,{applications:[{applicationId:6}],companies:[]})
    expect(urlPath(transport.mock.calls[0][0])).toBe('/api/v1/placements/applications/6/selection')
    expect(transport.mock.calls[0][1].method).toBe('POST')
    expect(JSON.parse(transport.mock.calls[0][1].body)).toMatchObject({offeredCtc:800000,currencyCode:'INR'})
  })
  it('uses the offer status API for an existing finalized selection',async()=>{
    transport.mockResolvedValue(response({}))
    await api.savePlacement('offer',{id:'9',status:'Accepted',applicationId:6},true,scope,{applications:[{applicationId:6}],offers:[{id:'9',status:'Issued'}]})
    expect(urlPath(transport.mock.calls[0][0])).toBe('/api/v1/placements/selections/9/offer')
    expect(transport.mock.calls[0][1].method).toBe('PATCH')
    expect(JSON.parse(transport.mock.calls[0][1].body).offerStatus).toBe('ACCEPTED')
  })
})

describe('campus screens with institutional data',()=>{
  it('keeps the library catalog usable when student lookup is denied and ISBN is null',async()=>{
    transport.mockImplementation(url=>urlPath(url)==='/api/v1/students'?Promise.reject(Object.assign(new Error('No student permission'),{status:403})):Promise.resolve(response(urlPath(url)==='/api/v1/library/books'?[{book_id:2,college_id:1,title:'Catalog Book',author:'Author',isbn:null,category_name:'Science',total_copies:2,available_copies:1}]:[])))
    render(<MemoryRouter><LibraryWorkspace /></MemoryRouter>)
    await screen.findAllByText('Catalog Book')
    fireEvent.change(screen.getByPlaceholderText('Search title, author, ISBN or subject...'),{target:{value:'not matching anything'}})
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('Some related information is unavailable')).toBeTruthy()
  })
  it('keeps placement drives when a related company directory cannot load',async()=>{
    transport.mockImplementation(url=>urlPath(url)==='/api/v1/placements/companies'?Promise.reject(Object.assign(new Error('No company permission'),{status:403})):Promise.resolve(response(urlPath(url)==='/api/v1/placements/drives'?[{driveId:3,companyId:2,collegeId:1,academicYearId:10,driveName:'Drive',jobTitle:'Campus Engineer',driveStartAt:'2026-11-05',driveStatus:'DRAFT',venue:null}]:[])))
    render(<MemoryRouter><PlacementWorkspace /></MemoryRouter>)
    await screen.findByText('Campus Engineer')
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('loads library snake_case book fields into the existing catalog',async()=>{
    transport.mockImplementation(url=>Promise.resolve(response(urlPath(url)==='/api/v1/library/books'?[{book_id:2,college_id:1,title:'Institutional Book',author:'Author',category_name:'Science',total_copies:2,available_copies:1}]:[])))
    render(<MemoryRouter><LibraryWorkspace /></MemoryRouter>)
    await screen.findAllByText('Institutional Book')
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('loads recruitment drives with server status and related company',async()=>{
    transport.mockImplementation(url=>Promise.resolve(response(urlPath(url)==='/api/v1/placements/companies'?[{companyId:2,collegeId:1,companyName:'Example Employer',status:'Active'}]:urlPath(url)==='/api/v1/placements/drives'?[{driveId:3,companyId:2,collegeId:1,academicYearId:10,driveName:'Graduate Drive',jobTitle:'Engineer',driveStartAt:'2026-11-05',driveStatus:'DRAFT'}]:[])))
    render(<MemoryRouter><PlacementWorkspace /></MemoryRouter>)
    await screen.findByText('Engineer')
    expect(screen.getByText('Example Employer')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('renders meetings and events without loading browser draft records',async()=>{
    localStorage.setItem('cms-meetings-events-data:1:10',JSON.stringify({meetings:[{id:'fake',title:'Local draft'}]}))
    transport.mockImplementation(url=>Promise.resolve(response(urlPath(url)==='/api/v1/meetings'?[{meetingId:7,collegeId:1,title:'Institutional Council',meetingDate:'2026-11-05',startTime:'09:00:00',endTime:'10:00:00',status:'SCHEDULED'}]:[])))
    render(<MemoryRouter><MeetingsEventsWorkspace /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button',{name:/^Meetings/}))
    await screen.findAllByText('Institutional Council')
    expect(screen.queryByText('Local draft')).toBeNull()
  })
})

function examTransport(url, options) {
  const path=urlPath(url)
  if (options.method !== 'GET') return Promise.resolve(response({}))
  if(path==='/api/v1/exams')return Promise.resolve(response([{examId:7,collegeId:1,academicYearId:10,examName:'Mid Term',startDate:'2026-11-01',endDate:'2026-11-10'}]))
  if(path==='/api/v1/exam-types')return Promise.resolve(response([{examTypeId:2,collegeId:1,name:'Mid Semester',code:'MID',status:'Active'}]))
  if(path==='/api/v1/exams/lookups')return Promise.resolve(response({courses:[{id:3,name:'B.Tech'}],branches:[{id:4,name:'CSE',courseId:3}],semesters:[{id:5,name:'Semester 1',courseId:3,branchId:4}],subjects:[{id:6,name:'Math'}],classrooms:[{id:8,name:'Hall A'}]}))
  if(path.endsWith('/schedules'))return Promise.resolve(response([{examScheduleId:9,subjectName:'Math',examDate:'2026-11-05',startTime:'09:00:00',endTime:'12:00:00',classroomName:'Hall A',status:'Active'}]))
  if(path.endsWith('/rules'))return Promise.resolve(response([{examRuleId:10,ruleName:'Passing',ruleCode:'PASS',ruleValue:'40'}]))
  return Promise.resolve(response([]))
}
describe('examination screens and async state',()=>{
  it('opens filters on demand and combines status/date filters with a working clear action',async()=>{
    transport.mockImplementation((url,options)=>urlPath(url).endsWith('/schedules')?Promise.resolve(response([
      {examScheduleId:1,subjectName:'Active Math',examDate:'2026-11-05',status:'Active'},
      {examScheduleId:2,subjectName:'Inactive Math',examDate:'2026-11-05',status:'Inactive'},
      {examScheduleId:3,subjectName:'Later Math',examDate:'2026-11-09',status:'Inactive'},
    ])):examTransport(url,options))
    render(<MemoryRouter><LiveExaminationWorkspace screen="timetable" timetable /></MemoryRouter>)
    await screen.findByRole('cell',{name:'Active Math'})
    expect(screen.queryByRole('button',{name:'Refresh'})).toBeNull()
    expect(screen.queryByLabelText('Filter examination')).toBeNull()
    fireEvent.click(screen.getByRole('button',{name:/^Filters/}))
    expect(screen.getByLabelText('Filter examination')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Filter status'),{target:{value:'inactive'}})
    fireEvent.change(screen.getByLabelText('From date'),{target:{value:'2026-11-04'}})
    fireEvent.change(screen.getByLabelText('To date'),{target:{value:'2026-11-06'}})
    expect(screen.getByRole('cell',{name:'Inactive Math'})).toBeTruthy()
    expect(screen.queryByRole('cell',{name:'Active Math'})).toBeNull()
    expect(screen.queryByRole('cell',{name:'Later Math'})).toBeNull()
    fireEvent.click(screen.getByRole('button',{name:'Clear Filters'}))
    expect(screen.getByRole('cell',{name:'Active Math'})).toBeTruthy()
    expect(screen.getByRole('cell',{name:'Later Math'})).toBeTruthy()
  })
  it('constrains schedule dates and stops out-of-range saves without blocking the list',async()=>{
    transport.mockImplementation(examTransport)
    render(<MemoryRouter><LiveExaminationWorkspace screen="timetable" timetable /></MemoryRouter>)
    await screen.findByRole('cell',{name:'Math'})
    fireEvent.click(screen.getByRole('button',{name:'Add Schedule'}))
    const dialog=screen.getByRole('dialog',{name:'Manage Schedule'})
    const form=within(dialog)
    const date=form.getByLabelText(/^Exam Date/)
    expect(date.disabled).toBe(true)
    fireEvent.change(form.getByLabelText('Examination *'),{target:{value:'7'}})
    fireEvent.change(form.getByLabelText('Subject *'),{target:{value:'6'}})
    expect(date.min).toBe('2026-11-01');expect(date.max).toBe('2026-11-10')
    fireEvent.change(date,{target:{value:'2026-11-20'}})
    fireEvent.change(form.getByLabelText('Start Time *'),{target:{value:'09:00'}})
    fireEvent.change(form.getByLabelText('End Time *'),{target:{value:'12:00'}})
    fireEvent.submit(dialog.querySelector('form'))
    expect(form.getByRole('alert').textContent).toContain('Choose a date between')
    expect(transport.mock.calls.some(([,options])=>options.method==='POST')).toBe(false)
    expect(screen.getByRole('cell',{name:'Math'})).toBeTruthy()
    expect(screen.getByRole('button',{name:'Add Schedule'}).disabled).toBe(false)
    expect(screen.queryByText('Records could not be loaded.')).toBeNull()
  })
  it('keeps a server date rejection in the editor and allows a corrected save',async()=>{
    let attempts=0
    transport.mockImplementation((url,options)=>{
      if(options.method==='POST') {
        attempts++
        return attempts===1 ? Promise.reject(Object.assign(new Error('examDate: Schedule date must fall inside the exam date range.'),{status:400})) : Promise.resolve(response({examScheduleId:11}))
      }
      return examTransport(url,options)
    })
    render(<MemoryRouter><LiveExaminationWorkspace screen="timetable" timetable /></MemoryRouter>)
    await screen.findByRole('cell',{name:'Math'})
    fireEvent.click(screen.getByRole('button',{name:'Add Schedule'}))
    const dialog=screen.getByRole('dialog',{name:'Manage Schedule'}), form=within(dialog)
    fireEvent.change(form.getByLabelText('Examination *'),{target:{value:'7'}})
    fireEvent.change(form.getByLabelText('Subject *'),{target:{value:'6'}})
    fireEvent.change(form.getByLabelText(/^Exam Date/),{target:{value:'2026-11-05'}})
    fireEvent.change(form.getByLabelText('Start Time *'),{target:{value:'09:00'}})
    fireEvent.change(form.getByLabelText('End Time *'),{target:{value:'12:00'}})
    fireEvent.click(form.getByRole('button',{name:'Save'}))
    await waitFor(()=>expect(form.getByRole('alert').textContent).toContain('Choose a date between'))
    expect(screen.queryByText(/examDate:/)).toBeNull()
    expect(screen.queryByText('Error details')).toBeNull()
    expect(screen.getByRole('cell',{name:'Math'})).toBeTruthy()
    expect(screen.getByRole('button',{name:'Add Schedule'}).disabled).toBe(false)
    fireEvent.change(form.getByLabelText(/^Exam Date/),{target:{value:'2026-11-06'}})
    await waitFor(()=>expect(form.getByRole('button',{name:'Save'}).disabled).toBe(false))
    fireEvent.click(form.getByRole('button',{name:'Save'}))
    await screen.findByText('Record saved successfully.')
    expect(attempts).toBe(2)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('loads Exam Type independently of denied examination and hall APIs',async()=>{
    transport.mockImplementation((url,options)=> urlPath(url)==='/api/v1/exam-types' ? examTransport(url,options) : Promise.reject(Object.assign(new Error('Cross-college access is not permitted. An active college assignment is required.'),{status:403})))
    render(<MemoryRouter><LiveExaminationWorkspace screen="exam-type" /></MemoryRouter>)
    await screen.findByText('Mid Semester')
    expect(transport.mock.calls.every(([url])=>urlPath(url)==='/api/v1/exam-types')).toBe(true)
    expect(screen.queryByLabelText('Filter examination')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('distinguishes denied records from an empty list and disables creation',async()=>{
    transport.mockRejectedValue(Object.assign(new Error('Cross-college access is not permitted. An active college assignment is required.'),{status:403}))
    render(<MemoryRouter><LiveExaminationWorkspace screen="exam-type" /></MemoryRouter>)
    await screen.findByRole('alert')
    expect(screen.getByRole('button',{name:'Add Exam Type'}).disabled).toBe(true)
    expect(screen.queryByText('No matching institutional records.')).toBeNull()
    expect(screen.getByText(/account needs an active assignment/)).toBeTruthy()
  })
  it('waits for academic context before making requests',async()=>{
    academic.loading=true
    const view=render(<MemoryRouter><LiveExaminationWorkspace screen="exam-type" /></MemoryRouter>)
    expect(transport).not.toHaveBeenCalled()
    expect(screen.getByRole('button',{name:'Add Exam Type'}).disabled).toBe(true)
    view.unmount();delete academic.loading
  })
  it('does not let a failed lookup discard an examination list',async()=>{
    transport.mockImplementation((url,options)=>urlPath(url).endsWith('/lookups')?Promise.reject(Object.assign(new Error('No lookup permission'),{status:403})):examTransport(url,options))
    const data=await loadExaminationData({...scope,area:'examinations'})
    expect(data.examinations[0].examName).toBe('Mid Term')
    expect(data.resourceErrors.lookups.status).toBe(403)
    expect(data.resourceErrors.examinations).toBeUndefined()
    expect(transport.mock.calls.some(([url])=>/hall-allocations|\/rules/.test(url))).toBe(false)
  })
  it('limits the student timetable to their academic assignment and section',async()=>{
    roleState.role='student'
    myProfile.mockResolvedValue({academic:{courseId:3,branchId:4,semesterId:5,sectionId:20}})
    transport.mockImplementation((url,options)=>{
      if(urlPath(url)==='/api/v1/exams')return Promise.resolve(response([{examId:7,collegeId:1,academicYearId:10,courseId:3,branchId:4,semesterId:5,examName:'Mid Term',status:'Active'}]))
      if(urlPath(url).endsWith('/schedules'))return Promise.resolve(response([{examScheduleId:9,sectionId:20,subjectName:'Student Math',status:'Active'},{examScheduleId:10,sectionId:21,subjectName:'Other Section Math',status:'Active'}]))
      return examTransport(url,options)
    })
    render(<MemoryRouter><LiveExaminationWorkspace screen="student" timetable /></MemoryRouter>)
    await screen.findByText('Student Math')
    expect(screen.queryByText('Other Section Math')).toBeNull()
    expect(screen.queryByRole('button',{name:'Add Schedule'})).toBeNull()
    expect(transport.mock.calls.some(([url])=>/hall-allocations|\/rules/.test(url))).toBe(false)
  })
  it('maps actual backend schedule and rule ids',async()=>{
    transport.mockImplementation(examTransport)
    const data=await loadExaminationData(scope)
    expect(data.schedules[0]).toMatchObject({scheduleId:9,examId:7,roomName:'Hall A'})
    expect(data.rules[0]).toMatchObject({ruleId:10,examId:7})
  })
  it('creates exam types with the documented name/code fields and college scope',async()=>{
    transport.mockImplementation(examTransport)
    render(<MemoryRouter><LiveExaminationWorkspace screen="exam-type" /></MemoryRouter>)
    await screen.findByText('Mid Semester')
    fireEvent.click(screen.getByRole('button',{name:'Add Exam Type'}))
    fireEvent.change(screen.getByLabelText('Exam Type Name *'),{target:{value:'End Semester'}})
    fireEvent.change(screen.getByLabelText('Type Code *'),{target:{value:'END'}})
    fireEvent.click(screen.getByRole('button',{name:'Save'}))
    await waitFor(()=>expect(transport.mock.calls.some(([,o])=>o.method==='POST')).toBe(true))
    const [url,options]=transport.mock.calls.find(([,o])=>o.method==='POST')
    expect(urlPath(url)).toBe('/api/v1/exam-types')
    expect(JSON.parse(options.body)).toMatchObject({name:'End Semester',code:'END',collegeId:1,status:true})
  })
  it('keeps a failed save visible and suppresses duplicate submissions',async()=>{
    const loader=vi.fn().mockResolvedValue([])
    const {result}=renderHook(()=>useScopedModule(loader,scope,[]))
    await waitFor(()=>expect(result.current.state.loading).toBe(false))
    let reject
    const write=vi.fn(()=>new Promise((_,r)=>{reject=r}))
    let pending
    act(()=>{pending=result.current.mutate(write)})
    await act(async()=>{expect(await result.current.mutate(write)).toBe(false)})
    await act(async()=>{reject(new Error('Conflict'));expect(await pending).toBe(false)})
    expect(result.current.state.saveError).toBe('Conflict')
    expect(result.current.state.error).toBe('')
    expect(write).toHaveBeenCalledTimes(1)
  })
  it('ignores stale loads after the college changes',async()=>{
    let finish
    const loader=vi.fn(({collegeId})=>collegeId===1?new Promise(r=>{finish=r}):Promise.resolve([{collegeId:2}]))
    const {result,rerender}=renderHook(({collegeId})=>useScopedModule(loader,{collegeId},[]),{initialProps:{collegeId:1}})
    rerender({collegeId:2})
    await waitFor(()=>expect(result.current.data).toEqual([{collegeId:2}]))
    await act(async()=>{finish([{collegeId:1}])})
    expect(result.current.data).toEqual([{collegeId:2}])
  })
})
