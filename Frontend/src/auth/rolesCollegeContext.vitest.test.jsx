import React, { useState } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AcademicProvider, useAcademic } from '../context/AcademicContext.jsx'
import { useScreenAccess } from './ScreenAccess.jsx'
import ProtectedRoute from '../components/ProtectedRoute.jsx'
import PortalRoute from '../components/portals/PortalRoute.jsx'
import { authAccessApi, roleApi } from '../api/apiEndpoints.js'
import academicService from '../services/academicService.js'
import eventBus, { ERP_EVENTS } from '../services/eventBus.js'

const session = vi.hoisted(() => ({ role: 'admin', token: 'account-1', assigned: '7', authenticated: true }))
vi.mock('./auth.js', async original => ({ ...await original(), getAccessToken: () => session.token, getUserRole: () => session.role, getUserCollegeId: () => session.assigned, isAuthenticated: () => session.authenticated }))
vi.mock('../api/apiEndpoints.js', async original => ({ ...await original(), authAccessApi: { get: vi.fn() }, roleApi: { getAll: vi.fn() } }))
vi.mock('../services/academicService.js', () => ({ filterActiveOnly: rows => (rows || []).filter(row => row.status !== 'Inactive'), default: { getColleges: vi.fn(), getAcademicYears: vi.fn(), getDepartments: vi.fn(), getCourses: vi.fn(), getBranches: vi.fn(), getSemesters: vi.fn(), getSections: vi.fn(), clearCache: vi.fn(), resolveHierarchyNames: vi.fn() } }))
afterEach(cleanup)
let generation = 0
const college = () => JSON.parse(localStorage.getItem('pirnav_academic_context') || '{}').collegeId || '7'
const write = (collegeId, academicYearId = '') => localStorage.setItem('pirnav_academic_context', JSON.stringify({ collegeId, academicYearId }))
const access = (collegeId = 7, permissions = { fees: { view: true, create: false }, rooms: { view: false } }) => ({ collegeId: Number(collegeId), primaryCollegeId: 7, isCollegeAdmin: true, isSuperAdmin: false, mappedCollegeIds: [8], permissions })
beforeEach(() => {
 vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); session.role = 'admin'; session.assigned = '7'; session.authenticated = true; session.token = 'account-' + (++generation)
 authAccessApi.get.mockReset().mockImplementation(async id => access(id || 7))
 academicService.getColleges.mockReset().mockResolvedValue(['7','8','9'].map(id => ({ id, name: 'College ' + id, status: 'Active' })))
 academicService.getAcademicYears.mockReset().mockImplementation(async () => [{ id: college() + '1', collegeId: college(), name: 'Year ' + college(), status: 'Active', isCurrent: true }])
 academicService.getDepartments.mockReset().mockImplementation(async () => [{ id: college() + '2', collegeId: college(), name: 'Department ' + college() }])
 for (const key of ['getCourses','getBranches','getSemesters','getSections']) academicService[key].mockReset().mockResolvedValue([])
})
function ContextProbe() {
 const context = useAcademic(), [error, setError] = useState('')
 const change = (id, year = context.selectedAcademicYearId) => context.applyAcademicContext(id, year).catch(reason => setError(reason.message))
 return <><output data-testid="scope">{JSON.stringify({ loading: context.loading, college: context.selectedCollegeId, selected: context.selectedCollege?.id, year: context.selectedAcademicYearId, options: context.activeColleges.map(row => row.id), departments: context.departments.map(row => row.id), years: context.academicYears.map(row => row.id), error: context.error })}</output><button onClick={() => change('8')}>Choose mapped college</button><button onClick={() => change('9')}>Choose unrelated college</button><button onClick={() => change(context.selectedCollegeId, 'unknown-year')}>Choose invalid year</button>{error && <p role="alert">{error}</p>}</>
}
const scope = () => JSON.parse(screen.getByTestId('scope').textContent)
const mountContext = () => render(<AcademicProvider><ContextProbe /></AcademicProvider>)
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }

test('College Admin options contain only server-confirmed primary and mapped colleges', async () => {
 write('7'); mountContext(); await waitFor(() => expect(scope().loading).toBe(false))
 expect(scope().options).toEqual(['7','8']); expect(scope().selected).toBe('7'); expect(scope().departments).toEqual(['72'])
 expect(scope().years).toEqual(['71'])
 fireEvent.click(screen.getByRole('button', { name: 'Choose unrelated college' }));
 await screen.findByRole('alert'); expect(scope().college).toBe('7'); expect(authAccessApi.get).not.toHaveBeenCalledWith('9')
})
test('a normalized admin label cannot make unrelated stored colleges authorized', async () => {
 write('9'); mountContext(); await waitFor(() => expect(scope().loading).toBe(false))
 expect(scope().college).toBe('7'); expect(college()).toBe('7'); expect(scope().options).not.toContain('9')
})

test('administrator routing validates stored college before evaluating its module permission', async () => {
 write('9')
 render(<MemoryRouter initialEntries={['/fees/structures']}><Routes><Route element={<PortalRoute roles={['admin']} permissionCheckedByChild />}><Route element={<AcademicProvider><ProtectedRoute allowedRoles={['admin']} /></AcademicProvider>}><Route path="/fees/structures" element={<p>Authorized college fee list</p>} /></Route></Route><Route path="/unauthorized" element={<p>Access denied</p>} /></Routes></MemoryRouter>)
 await screen.findByText('Authorized college fee list'); expect(college()).toBe('7'); expect(authAccessApi.get).not.toHaveBeenCalledWith('9')
})
test('only a server-confirmed Super Admin can select all available colleges', async () => {
 authAccessApi.get.mockImplementation(async id => ({ ...access(id || 7), isSuperAdmin: true }))
 write('9'); mountContext(); await waitFor(() => expect(scope().loading).toBe(false)); expect(scope().options).toEqual(['7','8','9']); expect(scope().college).toBe('9')
})
test('mapped college switching clears stale records immediately and loads its own year/options', async () => {
 write('7'); mountContext(); await waitFor(() => expect(scope().loading).toBe(false))
 const years = deferred(); academicService.getAcademicYears.mockImplementationOnce(() => years.promise)
 fireEvent.click(screen.getByRole('button', { name: 'Choose mapped college' }));
 await waitFor(() => expect(scope().college).toBe('8')); expect(scope().departments).toEqual([]); expect(scope().years).toEqual([]); expect(scope().year).toBe('')
 await act(async () => years.resolve([{ id: '81', collegeId: 8, name: 'Year 8', isCurrent: true, status: 'Active' }]))
 await waitFor(() => expect(scope().loading).toBe(false)); expect(scope().departments).toEqual(['82']); expect(scope().year).toBe('81')
})
test('an invalid academic year is rejected without changing persisted scope', async () => {
 write('7'); mountContext(); await waitFor(() => expect(scope().loading).toBe(false))
 fireEvent.click(screen.getByRole('button', { name: 'Choose invalid year' })); await screen.findByRole('alert'); expect(scope().year).toBe('71'); expect(college()).toBe('7')
})
test('fully unmapped year DTOs from the scoped endpoint are retained', async () => {
 academicService.getAcademicYears.mockResolvedValue([{ id: '71', name: 'Year 7', status: 'Active', isCurrent: true }])
 write('7'); mountContext(); await waitFor(() => expect(scope().loading).toBe(false)); expect(scope().years).toEqual(['71'])
})
test('non-admin employees retain only their assigned college even with forged stored context', async () => {
 session.role = 'staff'; authAccessApi.get.mockImplementation(async () => ({ ...access(7), isCollegeAdmin: false }))
 write('9'); mountContext(); await waitFor(() => expect(scope().loading).toBe(false)); expect(scope().options).toEqual(['7']); expect(scope().college).toBe('7')
})
function AccessProbe({ name = 'access' }) { const current = useScreenAccess(); return <output data-testid={name}>{JSON.stringify({ loading: current.loading, fees: current.canView('/fees/structures'), rooms: current.canView('/rooms-management'), create: current.canAction('/fees/structures/create', 'create'), college: current.collegeId })}</output> }
const state = name => JSON.parse(screen.getByTestId(name || 'access').textContent)
test('concurrent access consumers share the signed-in account request, never the roles catalogue', async () => {
 const pending = deferred(); authAccessApi.get.mockReturnValueOnce(pending.promise); write('7')
 render(<><AccessProbe name="first" /><AccessProbe name="second" /></>)
 await waitFor(() => expect(authAccessApi.get).toHaveBeenCalledTimes(1)); expect(state('first').fees).toBe(false)
 await act(async () => pending.resolve(access(7))); expect(state('first').fees).toBe(true); expect(state('second').fees).toBe(true); expect(state('first').create).toBe(false); expect(roleApi.getAll).not.toHaveBeenCalled()
})
test('a consumer outside AcademicProvider follows college events and ignores old access', async () => {
 write('7'); render(<AccessProbe />); await waitFor(() => expect(state().fees).toBe(true))
 const pending = deferred(); authAccessApi.get.mockReturnValueOnce(pending.promise)
 act(() => { write('8'); eventBus.emit(ERP_EVENTS.ACADEMIC_UPDATED, { collegeId: '8' }) })
 expect(state().fees).toBe(false); await act(async () => pending.resolve(access(8, { rooms: { view: true } })))
 expect(state().rooms).toBe(true); expect(state().fees).toBe(false)
})
function guarded(path, child) { return render(<MemoryRouter initialEntries={[path]}><Routes><Route element={<ProtectedRoute allowedRoles={['admin']} />}><Route path="/fees/structures" element={child || <p>Fee list</p>} /><Route path="/fees/structures/create" element={<p>Create fee form</p>} /></Route><Route path="/unauthorized" element={<p>Access denied</p>} /><Route path="/login" element={<p>Sign in</p>} /></Routes></MemoryRouter>) }
test('direct URLs cannot bypass missing view permissions', async () => {
 write('7'); authAccessApi.get.mockResolvedValue(access(7, {})); guarded('/fees/structures'); await screen.findByText('Access denied'); expect(screen.queryByText('Fee list')).toBeNull()
})
test('create deep links require create separately from view', async () => {
 write('7'); guarded('/fees/structures/create'); await screen.findByText('Access denied'); expect(screen.queryByText('Create fee form')).toBeNull()
})
test('authorized direct URLs render without changing the route', async () => {
 write('7'); guarded('/fees/structures'); await screen.findByText('Fee list'); expect(screen.queryByText('Access denied')).toBeNull()
})
test('unauthenticated route guards preserve the login redirect', async () => {
 session.authenticated = false; session.token = ''; guarded('/fees/structures'); await screen.findByText('Sign in'); expect(authAccessApi.get).not.toHaveBeenCalled()
})

test('failed account access can be retried without opening the protected screen', async () => {
 write('7'); authAccessApi.get.mockRejectedValueOnce(new Error('Unavailable')); guarded('/fees/structures')
 const retry = await screen.findByRole('button', { name: 'Retry account access' }); expect(screen.queryByText('Fee list')).toBeNull()
 fireEvent.click(retry); await screen.findByText('Fee list'); expect(authAccessApi.get).toHaveBeenCalledTimes(2)
})

test('own-profile completion stays available when shared module access is unavailable', async () => {
 write('7'); authAccessApi.get.mockRejectedValue(new Error('Unavailable'))
 render(<MemoryRouter initialEntries={['/my-profile']}><Routes><Route element={<ProtectedRoute allowedRoles={['admin']} />}><Route path="/my-profile" element={<p>Complete your profile</p>} /></Route></Routes></MemoryRouter>)
 await screen.findByText('Complete your profile'); expect(screen.queryByText('Access denied')).toBeNull()
})

test('a same-account change in another tab reloads college access', async () => {
 write('7'); render(<AccessProbe />); await waitFor(() => expect(state().fees).toBe(true))
 authAccessApi.get.mockImplementation(async id => access(id, { rooms: { view: true } }))
 act(() => { write('8'); window.dispatchEvent(new StorageEvent('storage', { key: 'pirnav_academic_context' })) })
 expect(state().fees).toBe(false); await waitFor(() => expect(state().rooms).toBe(true)); expect(state().college).toBe('8')
})
