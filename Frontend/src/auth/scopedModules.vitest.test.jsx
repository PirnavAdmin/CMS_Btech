import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const transport = vi.hoisted(() => vi.fn())
const roleState = vi.hoisted(() => ({role:'admin'}))
vi.mock('../auth/ScreenAccess', () => ({ useScreenAccess: () => ({ canAction: (_path, action) => actionState.allowed && !actionState.denied.includes(action) && roleState.role !== 'student' }) }))
const actionState = vi.hoisted(() => ({allowed:true, denied:[]}))
const myProfile = vi.hoisted(() => vi.fn())
const academic = vi.hoisted(() => ({ selectedCollegeId: 1, selectedAcademicYearId: 10, courses: [], branches: [], semesters: [], sections: [], scopeRecords: rows => rows.filter(row => String(row.collegeId) === String(academic.selectedCollegeId)) }))
vi.mock('../api/apiEndpoints', () => ({ API_BASE_URL: '', authenticatedRequest: transport, studentProfileApi: {getMyProfile:myProfile} }))
vi.mock('../context/AcademicContext', () => ({ useAcademic: () => academic }))
vi.mock('../layouts/DashboardLayout', () => ({ default: ({children}) => <div>{children}</div> }))
vi.mock('../auth/auth', () => ({ getUserRole: () => roleState.role, getUserCollegeId: () => '' }))
vi.mock('../components/SearchableSelect', async importOriginal => ({ ...await importOriginal(), ProjectSelect: props => <select {...props} /> }))
vi.mock('../services/academicService',()=>({default:{getDepartments:async()=>[]}}))
vi.mock('../services/roomService',()=>({default:{getRooms:async()=>[]}}))
import * as api from '../services/scopedModulesService'
import useScopedModule from '../services/useScopedModule'
import LiveExaminationWorkspace from '../pages/examinations/LiveExaminationWorkspace'
import { GradeConfiguration, CGPACalculatorPage } from '../pages/examinations/grade-result-management/GradeResultManagement'
import { loadExaminationData, scheduleConflict } from '../services/examinationWorkspaceService'
import { LibraryWorkspace, MeetingsEventsWorkspace, PlacementWorkspace } from '../pages/campus/CampusWorkspace'

const response = data => ({ success: true, data })
const scope = { collegeId: 1, academicYearId: 10 }
const urlPath = url => new URL(url, 'http://localhost').pathname
beforeEach(() => { transport.mockReset(); myProfile.mockReset(); actionState.allowed=true; actionState.denied=[]; roleState.role='admin'; academic.selectedCollegeId=1; academic.selectedAcademicYearId=10 })
afterEach(()=>{cleanup();delete academic.loading})

describe('scoped module API contracts', () => {
  it('detects hall and section schedule overlaps while allowing adjacent times and edits', () => {
    const entry = { examDate: '2026-11-05', startTime: '09:00', endTime: '10:00', classroomId: 2, sectionId: 3 }
    const existing = { ...entry, scheduleId: 9, startTime: '09:30:00', endTime: '10:30:00', status: true }
    expect(scheduleConflict(entry, [existing])).toContain('overlaps')
    expect(scheduleConflict(entry, [{ ...existing, classroomId: 5 }])).toContain('overlaps')
    expect(scheduleConflict(entry, [{ ...existing, startTime: '10:00:00' }])).toBe('')
    expect(scheduleConflict(entry, [existing], 9)).toBe('')
    expect(scheduleConflict(entry, [{ ...existing, status: false }])).toBe('')
    expect(scheduleConflict(entry, [{ ...existing, examDate: '2026-11-06' }])).toBe('')
  })
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
  it('limits result review to approved candidates for the selected exam and college', async () => {
    const exam = { ...scope, examId: 7 }
    const candidate = { collegeId: 1, examId: 7, studentId: 5, workflowStatus: 'APPROVED' }
    transport.mockResolvedValueOnce(response([
      candidate, { ...candidate, subjectId: 21 }, { ...candidate, studentId: 6, collegeId: 2 },
      { ...candidate, studentId: 8, workflowStatus: 'DRAFT' },
    ])).mockResolvedValueOnce(response({ studentId: 5, examId: 7, sgpa: 8, subjects: [] }))
      .mockResolvedValueOnce(response({ studentId: 5, examId: 7, isValid: false, validations: [{ rule: 'Grade' }] }))
    expect((await api.loadResultCandidates(scope, exam)).map(row => row.studentId)).toEqual([5])
    expect(transport.mock.calls[0][0]).toContain('workflowStatus=APPROVED')
    await expect(api.reviewExamResult(scope, exam, candidate)).resolves.toMatchObject({ result: { sgpa: 8 }, validation: { isValid: false } })
    for (const [url, options] of transport.mock.calls.slice(1)) {
      expect(url).toMatch(/results\/(calculate|validate)$/)
      expect(JSON.parse(options.body)).toEqual({ studentId: 5, examId: 7 })
    }
    await expect(api.reviewExamResult(scope, exam, { ...candidate, collegeId: 2 })).rejects.toThrow('eligible student')
    expect(transport).toHaveBeenCalledTimes(3)
  })
  it('does not validate or preview a mismatched result response', async () => {
    transport.mockResolvedValue(response({ examId: 7, studentId: 99, subjects: [] }))
    await expect(api.reviewExamResult(scope, { ...scope, examId: 7 }, {
      collegeId: 1, examId: 7, studentId: 5, workflowStatus: 'APPROVED',
    })).rejects.toThrow('selected student and examination')
    expect(transport).toHaveBeenCalledOnce()
  })
  it('limits student result history to the current academic scope and requested identity', async () => {
    transport.mockResolvedValue(response([
      { studentId: 5, examId: 7, sgpa: 0 }, { studentId: 6, examId: 7 }, { studentId: 5, examId: 8 },
    ]))
    await expect(api.loadStudentResultHistory(scope, [{ ...scope, examId: 7 }, { ...scope, academicYearId: 99, examId: 8 }], 5))
      .resolves.toEqual([{ studentId: 5, examId: 7, sgpa: 0 }])
    expect(transport.mock.calls[0][0]).toContain('/results/student/5')
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
    expect(transport.mock.calls[0][1].method).toBe('PUT')
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
    fireEvent.change(screen.getByPlaceholderText('Search title, author, ISBN or accession'),{target:{value:'not matching anything'}})
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
  it('saves restored meeting schedule fields and refreshes the saved list', async () => {
    let created = false
    transport.mockImplementation((url, options) => {
      const endpoint = urlPath(url)
      if (endpoint === '/api/v1/meeting-event-validation/schedules/validate') return Promise.resolve(response({ isValid: true, issues: [] }))
      if (endpoint === '/api/v1/meetings' && options.method === 'POST') { created = true; return Promise.resolve(response({ meetingId: 7 })) }
      return Promise.resolve(response(endpoint === '/api/v1/meetings' && created ? [{ meetingId: 7, collegeId: 1, title: 'Saved Council', meetingDate: '2026-11-11', startTime: '09:00:00', endTime: '10:00:00', status: 'SCHEDULED' }] : []))
    })
    render(<MemoryRouter><MeetingsEventsWorkspace /></MemoryRouter>)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create' }).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    fireEvent.click(screen.getByRole('button', { name: 'Meeting', exact: true }))
    fireEvent.change(screen.getByLabelText('Meeting Title *'), { target: { value: 'Saved Council' } })
    fireEvent.change(screen.getByLabelText('Start Date & Time *'), { target: { value: '2026-11-11T09:00' } })
    fireEvent.change(screen.getByLabelText('End Date & Time *'), { target: { value: '2026-11-11T10:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Meeting' }))
    await waitFor(() => expect(created).toBe(true))
    const request = transport.mock.calls.find(([url, options]) => urlPath(url) === '/api/v1/meetings' && options.method === 'POST')
    expect(JSON.parse(request[1].body)).toMatchObject({ meetingDate: '2026-11-11', startTime: '09:00:00', endTime: '10:00:00', title: 'Saved Council' })
    await screen.findByText('Record saved.')
    fireEvent.click(screen.getByRole('button', { name: 'Meetings', exact: true }))
    await screen.findByText('Saved Council')
  })
  it('preserves event IDs, settings and local dates in update requests', async () => {
    transport.mockResolvedValue(response({}))
    await api.saveMeetingEvent('event', { title: 'Workshop', category: 'WORKSHOP', start: '2026-11-11T09:00', end: '2026-11-12T10:00', departmentId: '3', organizerUserId: '9', capacity: 40, deadline: '2026-11-10T12:00', status: 'PUBLISHED', registrationFee: 75, certificateEnabled: true }, { id: '7', eventCode: 'EVT-7', bannerPath: '/banner.png' }, scope)
    const [url, options] = transport.mock.calls[0]
    expect(urlPath(url)).toBe('/api/v1/events/7')
    expect(options.method).toBe('PUT')
    expect(JSON.parse(options.body)).toMatchObject({ departmentId: 3, organizerUserId: 9, eventCode: 'EVT-7', startAt: '2026-11-11T09:00', endAt: '2026-11-12T10:00', bannerPath: '/banner.png', status: 'PUBLISHED', maxParticipants: 40, registrationFee: 75, certificateEnabled: true })
  })
  it('keeps a meeting conflict in the popup without posting the meeting', async () => {
    transport.mockImplementation(url => Promise.resolve(response(urlPath(url).endsWith('/schedules/validate') ? { isValid: false, issues: [{ message: 'Venue is already booked.' }] } : [])))
    render(<MemoryRouter><MeetingsEventsWorkspace /></MemoryRouter>)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create' }).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    fireEvent.click(screen.getByRole('button', { name: 'Meeting', exact: true }))
    fireEvent.change(screen.getByLabelText('Meeting Title *'), { target: { value: 'Conflicting Meeting' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Meeting' }))
    await screen.findByText('Venue is already booked.')
    expect(screen.getByRole('dialog', { name: 'Create Meeting' })).toBeTruthy()
    expect(transport.mock.calls.some(([url, options]) => urlPath(url) === '/api/v1/meetings' && options.method === 'POST')).toBe(false)
  })
  it('counts event occupancy from actual registrations and marks failed counts unavailable', async () => {
    transport.mockImplementation(url => Promise.resolve(response(urlPath(url) === '/api/v1/events' ? [{ eventId: 8, academicYearId: 10, eventName: 'Workshop', startAt: '2026-11-11T09:00', endAt: '2026-11-11T10:00' }] : urlPath(url).endsWith('/registrations') ? [{ registrationId: 1, status: 'REGISTERED' }, { registrationId: 2, status: 'CANCELLED' }] : [])))
    expect((await api.loadMeetingsEvents(scope)).events[0].registeredCount).toBe(1)
    transport.mockImplementation(url => urlPath(url).endsWith('/registrations') ? Promise.reject(new Error('Unavailable')) : Promise.resolve(response(urlPath(url) === '/api/v1/events' ? [{ eventId: 8, academicYearId: 10, eventName: 'Workshop' }] : [])))
    expect((await api.loadMeetingsEvents(scope)).events[0].registeredCount).toBeNull()
  })
})

function examTransport(url, options) {
  const path=urlPath(url)
  if (options.method !== 'GET') return Promise.resolve(response({}))
  if(path==='/api/v1/exams')return Promise.resolve(response([{examId:7,collegeId:1,academicYearId:10,courseId:3,branchId:4,semesterId:5,examTypeId:2,examCode:'MID',status:true,examName:'Mid Term',startDate:'2026-11-01',endDate:'2026-11-10'}]))
  if(path==='/api/v1/exam-types')return Promise.resolve(response([{examTypeId:2,collegeId:1,name:'Mid Semester',code:'MID',status:'Active'}]))
  if(path==='/api/v1/exams/lookups')return Promise.resolve(response({courses:[{id:3,name:'B.Tech'}],branches:[{id:4,name:'CSE',courseId:3}],semesters:[{id:5,name:'Semester 1',courseId:3,branchId:4}],subjects:[{id:6,name:'Math'}],sections:[],classrooms:[{id:8,name:'Hall A'}]}))
  if(path.endsWith('/schedules'))return Promise.resolve(response([{examScheduleId:9,subjectName:'Math',examDate:'2026-11-05',startTime:'09:00:00',endTime:'12:00:00',classroomName:'Hall A',status:'Active'}]))
  if(path.endsWith('/rules'))return Promise.resolve(response([{examRuleId:10,ruleName:'Passing',ruleCode:'PASS',ruleValue:'40'}]))
  return Promise.resolve(response([]))
}
describe('examination screens and async state',()=>{
  it('creates an examination and updates its active status through the existing routes', async () => {
    const writes = []
    transport.mockImplementation((url, options) => {
      if (options.method !== 'GET') { writes.push({ path: urlPath(url), method: options.method, body: JSON.parse(options.body) }); return Promise.resolve(response({ examId: 9 })) }
      return examTransport(url, options)
    })
    render(<MemoryRouter><LiveExaminationWorkspace /></MemoryRouter>)
    await screen.findByRole('cell', { name: 'Mid Term' })
    fireEvent.click(screen.getByRole('button', { name: 'Add Examination' }))
    let dialog = screen.getByRole('dialog', { name: 'Manage Examination' })
    const set = (label, value) => fireEvent.change(within(dialog).getByLabelText(label), { target: { value } })
    set('Examination Name *', 'Final Examination'); set('Examination Code *', 'FIN')
    set('Course *', '3'); set('Branch *', '4'); set('Semester / Term *', '5'); set('Exam Type *', '2')
    set('Start Date *', '2026-12-01'); set('End Date *', '2026-12-10')
    fireEvent.submit(dialog.querySelector('form'))
    await screen.findByText('Record saved successfully.')
    expect(writes[0]).toMatchObject({ path: '/api/v1/exams', method: 'POST', body: { collegeId: 1, academicYearId: 10, courseId: 3, branchId: 4, semesterId: 5, examTypeId: 2, examCode: 'FIN', status: true } })
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    dialog = screen.getByRole('dialog', { name: 'Manage Examination' })
    set('Status', 'inactive')
    fireEvent.submit(dialog.querySelector('form'))
    await waitFor(() => expect(writes).toHaveLength(2))
    expect(writes[1]).toMatchObject({ path: '/api/v1/exams/7', method: 'PUT', body: { status: false } })
  })

  it('creates types and rules with verified college and examination identities', async () => {
    const writes = []
    transport.mockImplementation((url, options) => {
      if (options.method === 'POST') { writes.push([urlPath(url), JSON.parse(options.body)]); return Promise.resolve(response({ id: 20 })) }
      return examTransport(url, options)
    })
    const mounted = render(<MemoryRouter><LiveExaminationWorkspace screen="exam-type" /></MemoryRouter>)
    await screen.findByRole('cell', { name: 'Mid Semester' })
    fireEvent.click(screen.getByRole('button', { name: 'Add Exam Type' }))
    let dialog = screen.getByRole('dialog', { name: 'Manage Exam Type' })
    fireEvent.change(within(dialog).getByLabelText('Exam Type Name *'), { target: { value: 'Final' } })
    fireEvent.change(within(dialog).getByLabelText('Type Code *'), { target: { value: 'FIN' } })
    fireEvent.submit(dialog.querySelector('form'))
    await screen.findByText('Record saved successfully.')
    expect(writes[0]).toEqual(['/api/v1/exam-types', expect.objectContaining({ collegeId: 1, name: 'Final', code: 'FIN', status: true })])
    mounted.unmount()
    render(<MemoryRouter><LiveExaminationWorkspace screen="exam-rules" /></MemoryRouter>)
    await screen.findByRole('cell', { name: 'Passing' })
    fireEvent.click(screen.getByRole('button', { name: 'Add Rule' }))
    dialog = screen.getByRole('dialog', { name: 'Manage Rule' })
    for (const [label, value] of [['Examination *','7'],['Rule Code *','PASS'],['Rule Name *','Passing rule'],['Rule Value *','40']]) fireEvent.change(within(dialog).getByLabelText(label), { target: { value } })
    fireEvent.submit(dialog.querySelector('form'))
    await waitFor(() => expect(writes).toHaveLength(2))
    expect(writes[1]).toEqual(['/api/v1/exams/7/rules', expect.objectContaining({ examId: 7, ruleCode: 'PASS', ruleValue: '40' })])
  })

  it('honors create, edit and delete permissions separately', async () => {
    actionState.denied = ['edit','delete']
    transport.mockImplementation(examTransport)
    render(<MemoryRouter><LiveExaminationWorkspace /></MemoryRouter>)
    await screen.findByRole('cell', { name: 'Mid Term' })
    expect(screen.getByRole('button', { name: 'Add Examination' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
  })
  it('keeps record details available without mutation permission and closes without a write',async()=>{
    actionState.allowed=false
    transport.mockImplementation(examTransport)
    render(<MemoryRouter><LiveExaminationWorkspace screen="exam-type" /></MemoryRouter>)
    await screen.findByText('Mid Semester')
    expect(screen.queryByRole('button',{name:'Add Exam Type'})).toBeNull()
    expect(screen.queryByRole('button',{name:'Edit'})).toBeNull()
    fireEvent.click(screen.getByRole('button',{name:'View details'}))
    const dialog=screen.getByRole('dialog',{name:'Exam Type Details'})
    expect(within(dialog).getByText('MID')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button',{name:'Close details'}))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(transport.mock.calls.every(([,options])=>!options.method || options.method==='GET')).toBe(true)
  })
  it('cancels an examination editor without creating a record',async()=>{
    transport.mockImplementation(examTransport)
    render(<MemoryRouter><LiveExaminationWorkspace screen="exam-type" /></MemoryRouter>)
    await screen.findByText('Mid Semester')
    fireEvent.click(screen.getByRole('button',{name:'Add Exam Type'}))
    const dialog=screen.getByRole('dialog',{name:'Manage Exam Type'})
    fireEvent.change(within(dialog).getByLabelText('Exam Type Name *'),{target:{value:'Unsaved draft'}})
    fireEvent.click(within(dialog).getByRole('button',{name:'Cancel'}))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(transport.mock.calls.every(([,options])=>!options.method || options.method==='GET')).toBe(true)
  })

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
    await form.findByRole('option',{name:'Math'})
    expect(transport.mock.calls.some(([url])=>url.includes('courseId=3&branchId=4&semesterId=5'))).toBe(true)
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
    await form.findByRole('option',{name:'Math'})
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

describe('merged grades and results workspace', () => {
  it('shows a scoped saved grade scale and recovers after a backend error', async () => {
    transport.mockRejectedValueOnce(Object.assign(new Error('Service unavailable'), { status: 500 }))
    transport.mockResolvedValueOnce(response([
      { id: 21, data: { ...scope, collegeId: 2, bands: [{ grade: 'OTHER', min: 0, max: 100, points: 9, pass: true }] } },
      { id: 22, data: { ...scope, bands: [{ grade: 'LOCAL', min: 0, max: 100, points: 8, pass: true }] } },
    ]))
    render(<MemoryRouter initialEntries={['/grade-result-management/grade-configuration']}><GradeConfiguration /></MemoryRouter>)
    expect((await screen.findByRole('alert')).textContent).toContain('grade scale service')
    expect(screen.queryByRole('button', { name: 'Manage Preview Scale' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('cell', { name: 'LOCAL' })).toBeTruthy()
    expect(screen.queryByRole('cell', { name: 'OTHER' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Grade Scale' }).getAttribute('aria-current')).toBe('page')
  })

  it('shows official GPA including a zero value for the selected student', async () => {
    transport.mockImplementation(async url => {
      switch (urlPath(url)) {
        case '/api/v1/exams': return response([{ ...scope, examId: 7, examName: 'Mid Term', semesterId: 3, semesterName: 'Semester 1' }])
        case '/api/v1/student-profiles': return response([{ studentId: 5, collegeId: 1, fullName: 'Asha' }])
        case '/api/v1/results/student/5': return response([{ examId: 7, studentId: 5, sgpa: 0, cgpa: 6.25, resultStatus: 'FAIL', subjects: [{ resultId: 1, subjectId: 2, credits: 4, marksObtained: 0, maximumMarks: 100, grade: 'F', gradePoint: 0 }] }])
        case '/api/v1/results/student/5/backlogs': return response([])
        default: throw new Error('Unexpected request')
      }
    })
    render(<MemoryRouter initialEntries={['/grade-result-management/cgpa-calculator']}><CGPACalculatorPage /></MemoryRouter>)
    await screen.findByRole('option', { name: 'Asha' })
    fireEvent.change(screen.getByRole('combobox', { name: 'Student' }), { target: { value: '5' } })
    expect(screen.getByRole('cell', { name: '6.25' })).toBeTruthy()
    expect(screen.getByRole('cell', { name: '0', exact: true })).toBeTruthy()
    expect(screen.getByRole('cell', { name: 'Mid Term' })).toBeTruthy()
  })
})

describe('library circulation and inventory', () => {
  const book = { bookId: 2, collegeId: 1, categoryId: 5, categoryName: 'Science', title: 'Circuit Design', author: 'Author', accessionNo: 'ACC-2', totalCopies: 2, availableCopies: 2, status: true }
  const borrower = { studentId: 7, collegeId: 1, fullName: 'Student Seven', rollNumber: 'R-7' }
  const category = { categoryId: 5, collegeId: 1, categoryName: 'Science', status: true }
  const resources = { books: [book], categories: [category], issues: [], fines: [] }

  it('validates duplicate catalog records and updates stock without creating a title', async () => {
    transport.mockImplementation((url, request) => {
      const path = urlPath(url)
      if (request?.method === 'PUT') return Promise.resolve(response(book))
      return Promise.resolve(response(resources[path.split('/').at(-1)] || []))
    })
    render(<MemoryRouter><LibraryWorkspace /></MemoryRouter>)
    await screen.findByText('Circuit Design')
    fireEvent.click(screen.getByRole('button', { name: /Add Book/ }))
    let dialog = within(screen.getByRole('dialog', { name: 'Add Book' }))
    for (const [label, value] of [['Book Title', 'Circuit Design'], ['Author', 'Author'], ['Accession Number', 'ACC-2'], ['Category', '5'], ['Number of Copies', '3']]) {
      fireEvent.change(dialog.getByLabelText(label), { target: { value } })
    }
    fireEvent.click(dialog.getByRole('button', { name: 'Save Book' }))
    expect((await dialog.findByRole('alert')).textContent).toContain('A matching catalog record already exists')
    expect(transport.mock.calls.some(([, request]) => request?.method === 'POST')).toBe(false)
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }))
    fireEvent.change(screen.getByLabelText('Actions for Circuit Design'), { target: { value: 'copies' } })
    dialog = within(screen.getByRole('dialog', { name: 'Manage Copies' }))
    fireEvent.change(dialog.getByLabelText('Number of Copies'), { target: { value: '3' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Save Stock' }))
    await screen.findByText('Copy stock updated.')
    const write = transport.mock.calls.find(([, request]) => request?.method === 'PUT')
    expect(urlPath(write[0])).toBe('/api/v1/library/books/2')
    expect(JSON.parse(write[1].body)).toMatchObject({ collegeId: 1, totalCopies: 3 })
  })

  it('confirms issue and return using server IDs and refreshes the catalog count', async () => {
    let issued = false
    const loan = { issueId: 11, collegeId: 1, bookId: 2, studentId: 7, status: 'ISSUED', issueDate: '2020-01-01', dueDate: '2020-01-20' }
    transport.mockImplementation((url, request) => {
      const path = urlPath(url)
      if (request?.method === 'POST') {
        issued = path.endsWith('/issues')
        return Promise.resolve(response(loan))
      }
      if (path.endsWith('/students')) return Promise.resolve(response([borrower, { ...borrower, studentId: 99, collegeId: 2, fullName: 'Foreign Student' }]))
      if (path.endsWith('/issues')) return Promise.resolve(response(issued ? [loan] : []))
      if (path.endsWith('/books')) return Promise.resolve(response([{ ...book, availableCopies: issued ? 1 : 2 }]))
      return Promise.resolve(response(resources[path.split('/').at(-1)] || []))
    })
    render(<MemoryRouter><LibraryWorkspace /></MemoryRouter>)
    await screen.findByText('Circuit Design')
    fireEvent.change(screen.getByLabelText('Actions for Circuit Design'), { target: { value: 'issue' } })
    const issue = within(screen.getByRole('dialog', { name: 'Issue Book' }))
    expect(issue.queryByRole('option', { name: /Foreign Student/ })).toBeNull()
    fireEvent.change(issue.getByLabelText('Borrower'), { target: { value: '7' } })
    fireEvent.change(issue.getByLabelText('Issue Date'), { target: { value: '2020-01-01' } })
    fireEvent.change(issue.getByLabelText('Due Date'), { target: { value: '2020-01-20' } })
    fireEvent.click(issue.getByRole('button', { name: 'Review Issue' }))
    expect(transport.mock.calls.some(([, request]) => request?.method === 'POST')).toBe(false)
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Confirm Issue' })).getByRole('button', { name: 'Confirm Issue' }))
    await screen.findByText('Book issued.')
    const issueWrite = transport.mock.calls.find(([url, request]) => urlPath(url).endsWith('/issues') && request?.method === 'POST')
    expect(JSON.parse(issueWrite[1].body)).toMatchObject({ collegeId: 1, bookId: 2, studentId: 7 })
    expect(within(screen.getByRole('row', { name: /Circuit Design/ })).getAllByRole('cell')[4].textContent).toBe('1')
    fireEvent.click(screen.getByRole('button', { name: 'Issue & Return' }))
    fireEvent.click(screen.getByRole('button', { name: 'Return / Renew' }))
    fireEvent.click(screen.getByRole('button', { name: 'Return' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Confirm Return' })).getByRole('button', { name: 'Confirm Return' }))
    await screen.findByText('Book returned.')
    expect(transport.mock.calls.some(([url, request]) => urlPath(url).endsWith('/issues/11/return') && request?.method === 'POST')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Books' }))
    expect(within(screen.getByRole('row', { name: /Circuit Design/ })).getAllByRole('cell')[4].textContent).toBe('2')
  })
})
