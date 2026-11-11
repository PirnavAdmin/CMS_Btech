import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const transport = vi.hoisted(() => vi.fn())
const access = vi.hoisted(() => ({ manage: true }))
const academic = vi.hoisted(() => ({
  selectedCollegeId: 1, selectedAcademicYearId: 10,
  courses: [{ courseId: 2, name: 'B.Tech' }], branches: [{ branchId: 5, courseId: 2, name: 'CSE' }], semesters: [],
}))
vi.mock('../api/apiEndpoints', () => ({ API_BASE_URL: '', authenticatedRequest: transport, studentProfileApi: {} }))
vi.mock('../auth/auth', () => ({ getUserRole: () => 'admin', getUserCollegeId: () => '' }))
vi.mock('../auth/ScreenAccess', () => ({ useScreenAccess: () => ({ canAction: (_path, action) => action === 'view' || access.manage }) }))
vi.mock('../context/AcademicContext', () => ({ useAcademic: () => academic }))
vi.mock('../layouts/DashboardLayout', () => ({ default: ({ children }) => <main>{children}</main> }))
vi.mock('../components/SearchableSelect', () => ({ ProjectSelect: ({ forceCustom: _forceCustom, ...props }) => <select {...props} /> }))

import PlacementWorkspace from '../pages/campus/PlacementWorkspace'
import * as api from '../services/scopedModulesService'
import { placementLocalInput, placementMoney, placementUtc, validatePlacementForm } from '../utils/placementWorkflow'

let server
const response = data => ({ success: true, data })
const pathOf = url => new URL(url, 'http://localhost').pathname
const scope = { collegeId: 1, academicYearId: 10 }
const payloads = endpoint => transport.mock.calls.filter(([url, options]) => pathOf(url) === endpoint && options.method !== 'GET').map(([, options]) => ({ method: options.method, body: options.body ? JSON.parse(options.body) : undefined }))

beforeEach(() => {
  access.manage = true
  academic.selectedCollegeId = 1
  transport.mockReset()
  server = {
    companies: [{ companyId: 2, collegeId: 1, companyName: 'Recruiter', industry: 'Technology', status: 'Active' }],
    drives: [{ driveId: 3, companyId: 2, collegeId: 1, academicYearId: 10, driveCode: 'DRV-3', driveName: 'Graduate Drive', jobTitle: 'Engineer', driveStartAt: '2099-11-10T09:00:00Z', driveEndAt: '2099-11-15T18:00:00Z', driveStatus: 'REGISTRATION_OPEN', employmentType: 'FULL_TIME', driveType: 'ON_CAMPUS' }],
    students: [{ studentId: 7, collegeId: 1, fullName: 'Asha', rollNumber: 'CSE007', courseId: 2, branchId: 5 }],
    applications: [], interviews: [], offers: [], rules: [], eligibility: [],
  }
  transport.mockImplementation(async (url, options) => {
    const path = pathOf(url)
    const method = options.method || 'GET'
    const body = options.body ? JSON.parse(options.body) : null
    if (method === 'GET') {
      if (path === '/api/v1/students') return response(server.students)
      for (const [collection, records] of Object.entries(server)) {
        const endpoint = collection === 'offers' ? 'selections' : collection
        if (path === `/api/v1/placements/${endpoint}`) return response(records)
      }
      const ruleMatch = path.match(/\/drives\/(\d+)\/eligibility-rules$/)
      if (ruleMatch) return response(server.rules.filter(row => String(row.driveId) === ruleMatch[1]))
      const eligibilityMatch = path.match(/\/drives\/(\d+)\/eligibility$/)
      if (eligibilityMatch) return response(server.eligibility.filter(row => String(row.driveId) === eligibilityMatch[1]))
      const applicationHistory = path.match(/\/applications\/(\d+)\/interviews$/)
      if (applicationHistory) return response(server.interviews.filter(row => String(row.applicationId) === applicationHistory[1]))
      const detailMatch = path.match(/\/placements\/(companies|drives|applications|interviews|selections)\/(\d+)$/)
      if (detailMatch) {
        const key = detailMatch[1] === 'selections' ? 'offers' : detailMatch[1]
        const id = ({ companies: 'companyId', drives: 'driveId', applications: 'applicationId', interviews: 'interviewId', offers: 'selectionId' })[key]
        return response(server[key].find(row => String(row[id]) === detailMatch[2]))
      }
      throw new Error(`Unexpected read ${path}`)
    }
    if (path === '/api/v1/placements/drives' && method === 'POST') {
      const row = { ...body, driveId: 4, collegeId: 1, driveStatus: 'DRAFT' }
      server.drives.push(row)
      return response(row)
    }
    if (path === '/api/v1/placements/companies' && method === 'POST') {
      const row = { ...body, companyId: 8, collegeId: body.collegeId }
      server.companies.push(row)
      return response(row)
    }
    if (/\/eligibility-rules$/.test(path) && method === 'POST') {
      server.rules.push({ ...body, driveId: Number(path.split('/')[5]), eligibilityRuleId: 8 })
      return response(server.rules.at(-1))
    }
    if (path === '/api/v1/placements/drives/3/eligibility/evaluate' && method === 'POST') {
      const row = { ...body, eligibilityId: 1, driveId: 3, eligibilityStatus: 'PENDING', reason: 'Academic values unavailable.' }
      server.eligibility = [row]
      return response(row)
    }
    if (path === '/api/v1/placements/applications/9/interviews' && method === 'POST') {
      const row = { ...body, interviewId: 11, applicationId: 9, interviewStatus: 'SCHEDULED', interviewResult: 'PENDING' }
      server.interviews.push(row)
      return response(row)
    }
    if (path === '/api/v1/placements/drives/3/applications' && method === 'POST') {
      server.applications.push({ ...body, applicationId: 9, driveId: 3, applicationStatus: 'APPLIED' })
      return response(server.applications.at(-1))
    }
    if (path === '/api/v1/placements/selections/12/offer' && method === 'PATCH') {
      Object.assign(server.offers[0], body)
      return response(server.offers[0])
    }
    if (path === '/api/v1/placements/selections/12/joined' && method === 'PATCH') {
      server.offers[0].joinedAt = '2026-11-11T09:00:00Z'
      return response(server.offers[0])
    }
    throw new Error(`Unexpected write ${method} ${path}`)
  })
})
afterEach(cleanup)

const show = () => render(<MemoryRouter><PlacementWorkspace /></MemoryRouter>)
const loaded = async () => { await screen.findByText('Engineer') }

describe('placement workspace', () => {
  it('shows five table tabs and replaces fabricated drive counts with saved applications', async () => {
    show(); await loaded()
    expect(screen.getByRole('heading', { name: 'Training & Placements' })).toBeTruthy()
    expect(within(screen.getByRole('navigation', { name: 'Placement views' })).getAllByRole('button')).toHaveLength(5)
    expect(screen.queryByText('Digital Campus')).toBeNull()
    expect(screen.queryByRole('button', { name: /grid/i })).toBeNull()
    expect(screen.getByText('Recruiter')).toBeTruthy()
    expect(screen.getByRole('table')).toBeTruthy()
    expect((await api.loadPlacements(scope)).drives[0].applicantsCount).toBe(0)
  })

  it('creates a real draft and continues to eligibility rules without repeating creation', async () => {
    show(); await loaded()
    fireEvent.click(screen.getByRole('button', { name: 'New Drive' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Company *' }), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Drive Title *'), { target: { value: 'Recurring Drive' } })
    fireEvent.change(screen.getByLabelText('Job Role *'), { target: { value: 'Analyst' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Job Type *' }), { target: { value: 'FULL_TIME' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Recruitment Mode *' }), { target: { value: 'ON_CAMPUS' } })
    fireEvent.change(screen.getByLabelText('Drive Start *'), { target: { value: '2099-11-11T09:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Drive' }))
    await screen.findByRole('dialog', { name: 'Eligibility Rules · Recurring Drive' })
    const [request] = payloads('/api/v1/placements/drives')
    expect(request.body).toMatchObject({ companyId: 2, academicYearId: 10, jobTitle: 'Analyst', driveName: 'Recurring Drive', driveStartAt: placementUtc('2099-11-11T09:00'), ctcMax: null })
    expect(request.body).not.toHaveProperty('eligibleBranches')
    expect(payloads('/api/v1/placements/drives')).toHaveLength(1)
    expect(server.drives).toHaveLength(2)
  })

  it('submits eligible saved students and refreshes their application', async () => {
    server.eligibility = [{ eligibilityId: 1, driveId: 3, studentId: 7, eligibilityStatus: 'ELIGIBLE', reason: 'Criteria matched.' }]
    show(); await loaded()
    fireEvent.click(screen.getByRole('button', { name: 'Applications', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: 'Add Application' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Drive *' }), { target: { value: '3' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Student *' }), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }))
    await screen.findByText('Asha')
    expect(payloads('/api/v1/placements/drives/3/applications')[0].body.studentId).toBe(7)
  })

  it('creates a company inside the drive workflow and preserves the unsaved drive form', async () => {
    show(); await loaded()
    fireEvent.click(screen.getByRole('button', { name: 'New Drive' }))
    fireEvent.change(screen.getByLabelText('Drive Title *'), { target: { value: 'Unsaved Drive' } })
    fireEvent.change(screen.getByLabelText('Drive Start *'), { target: { value: '2099-11-11T09:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Company' }))
    fireEvent.change(screen.getByLabelText('Company Name *'), { target: { value: 'New Recruiter' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Status *' }), { target: { value: 'Active' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }))
    await screen.findByRole('dialog', { name: 'New Recruitment Drive' })
    expect(screen.getByLabelText('Drive Title *').value).toBe('Unsaved Drive')
    expect(screen.getByLabelText('Drive Start *').value).toBe('2099-11-11T09:00')
    expect(screen.getByRole('combobox', { name: 'Company *' }).value).toBe('8')
    expect(payloads('/api/v1/placements/drives')).toHaveLength(0)
  })

  it('persists separate eligibility rules with zero backlogs and missing criteria as null', async () => {
    show(); await loaded()
    fireEvent.change(screen.getByRole('combobox', { name: 'Actions for Graduate Drive' }), { target: { value: 'rules' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Rule' }))
    fireEvent.change(screen.getByLabelText('Rule Name *'), { target: { value: 'Academic Criteria' } })
    fireEvent.change(screen.getByLabelText('Minimum CGPA'), { target: { value: '7.5' } })
    fireEvent.change(screen.getByLabelText('Maximum Active Backlogs'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Rule' }))
    await screen.findByRole('cell', { name: 'Academic Criteria' })
    expect(payloads('/api/v1/placements/drives/3/eligibility-rules')[0].body).toMatchObject({ minCgpa: 7.5, maxActiveBacklogs: 0, courseId: null, minPercentage: null })
  })

  it('uses the server eligibility result and leaves unavailable academic values blank', async () => {
    show(); await loaded()
    fireEvent.change(screen.getByRole('combobox', { name: 'Actions for Graduate Drive' }), { target: { value: 'evaluate' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Student *' }), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate Eligibility' }))
    await screen.findByText('Academic values unavailable.')
    expect(payloads('/api/v1/placements/drives/3/eligibility/evaluate')[0].body).toMatchObject({ studentId: 7, studentCgpa: null, activeBacklogs: null, graduationYear: null })
    expect(screen.getByLabelText('CGPA').value).toBe('')
  })

  it('restores interview scheduling and serializes local time into the UTC contract', async () => {
    server.applications = [{ applicationId: 9, studentId: 7, driveId: 3, applicationStatus: 'SHORTLISTED' }]
    show(); await loaded()
    fireEvent.click(screen.getByRole('button', { name: 'Interviews', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: 'Schedule Interview' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Application *' }), { target: { value: '9' } })
    fireEvent.change(screen.getByLabelText('Round Number *'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Round Name *'), { target: { value: 'Technical Round' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Round Type *' }), { target: { value: 'TECHNICAL' } })
    fireEvent.change(screen.getByLabelText('Date & Time *'), { target: { value: placementLocalInput('2099-11-11T10:00:00Z') } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Interview Mode *' }), { target: { value: 'OFFLINE' } })
    fireEvent.change(screen.getByLabelText('Venue'), { target: { value: 'Interview Room' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }))
    await screen.findByText('Technical Round')
    expect(payloads('/api/v1/placements/applications/9/interviews')[0]).toMatchObject({ method: 'POST', body: { scheduledAt: '2099-11-11T10:00:00.000Z', roundType: 'TECHNICAL', interviewMode: 'OFFLINE', roundNumber: 1 } })
  })

  it('keeps selected and joined outcomes separate and uses the joining endpoint', async () => {
    server.applications = [{ applicationId: 9, studentId: 7, driveId: 3, applicationStatus: 'SELECTED' }]
    server.offers = [{ selectionId: 12, applicationId: 9, selectionStatus: 'SELECTED', offerStatus: 'ACCEPTED', offeredJobTitle: 'Engineer' }]
    show(); await loaded()
    fireEvent.click(screen.getByRole('button', { name: 'Offers & Placements' }))
    expect(screen.queryByRole('cell', { name: 'Joined' })).toBeNull()
    fireEvent.change(screen.getByRole('combobox', { name: 'Actions for Asha' }), { target: { value: 'join' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Joined' }))
    await screen.findByRole('cell', { name: 'Joined' })
    expect(payloads('/api/v1/placements/selections/12/joined')[0].method).toBe('PATCH')
  })

  it('distinguishes a permission failure from an empty result and hides management actions', async () => {
    access.manage = false
    const previous = transport.getMockImplementation()
    transport.mockImplementation((url, options) => pathOf(url) === '/api/v1/placements/drives' ? Promise.reject(Object.assign(new Error('Denied'), { status: 403 })) : previous(url, options))
    show()
    await screen.findByText('You do not have access to these records.')
    expect(screen.queryByText('No records yet.')).toBeNull()
    expect(screen.queryByRole('button', { name: 'New Drive' })).toBeNull()
  })

  it('shows an accurate unavailable state when dependent application data fails', async () => {
    const previous = transport.getMockImplementation()
    transport.mockImplementation((url, options) => pathOf(url) === '/api/v1/placements/applications' ? Promise.reject(new Error('Unavailable')) : previous(url, options))
    const data = await api.loadPlacements(scope)
    expect(data.drives[0].applicantsCount).toBeNull()
    expect(data.resourceErrors.offers).toBeTruthy()
    expect(data.resourceErrors.interviews).toBeTruthy()
  })
})

describe('placement request contracts and validation', () => {
  it('creates companies in the selected college without an invented first-college restriction', async () => {
    transport.mockResolvedValue(response({ companyId: 8 }))
    await api.savePlacement('company', { name: 'Recruiter' }, false, { collegeId: 2 }, { companies: [] })
    expect(payloads('/api/v1/placements/companies')[0].body.collegeId).toBe(2)
    expect(transport).toHaveBeenCalledTimes(1)
  })
  it('uses PUT for selection decisions and preserves annual CTC without double conversion', async () => {
    transport.mockResolvedValue(response({ selectionId: 12 }))
    await api.savePlacement('offer', { applicationId: 9, selectionStatus: 'SELECTED', offeredCtc: '800000' }, false, scope, { applications: [{ applicationId: 9 }] })
    expect(payloads('/api/v1/placements/applications/9/selection')[0]).toMatchObject({ method: 'PUT', body: { offeredCtc: 800000, currencyCode: 'INR' } })
  })
  it('omits issue-only fields when accepting an offer', async () => {
    transport.mockResolvedValue(response({}))
    await api.savePlacement('offer', { id: 12, offerStatus: 'ACCEPTED', offerExpiresAt: '2099-11-11T00:00:00Z' }, true, scope, { offers: [{ id: 12, offerStatus: 'ISSUED' }] })
    const body = payloads('/api/v1/placements/selections/12/offer')[0].body
    expect(body.offerStatus).toBe('ACCEPTED')
    expect(body).not.toHaveProperty('offerExpiresAt')
    expect(body).not.toHaveProperty('offerLetterPath')
  })
  it('preserves zero values and validates dates, duplicate applications and rounds', () => {
    expect(placementMoney(0)).not.toBe('—')
    expect(placementMoney(null)).toBe('—')
    const local = placementLocalInput('2099-11-11T09:00:00Z')
    expect(placementUtc(local)).toBe('2099-11-11T09:00:00.000Z')
    expect(validatePlacementForm('drive', { title: 'Drive', role: 'Engineer', companyId: '2', driveStartAt: '2099-11-11T09:00', applicationCloseAt: '2099-11-12T09:00', ctcMin: 10, ctcMax: 5 })).toMatchObject({ applicationCloseAt: expect.any(String), ctcMax: expect.any(String) })
    expect(validatePlacementForm('application', { driveId: '3', studentId: '7' }, { applications: [{ driveId: 3, studentId: 7, status: 'Withdrawn' }] }).studentId).toBeTruthy()
    expect(validatePlacementForm('interview', { applicationId: 9, roundNumber: 1, roundName: 'Round', scheduledAt: '2099-11-11T09:00', interviewMode: 'OFFLINE', venue: 'Room' }, { interviews: [{ id: 4, applicationId: 9, roundNumber: 1 }] }).roundNumber).toBeTruthy()
  })
})
