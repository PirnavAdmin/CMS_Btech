import React, { useState } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import { ICON_REGISTRY, getModuleIcon } from './iconRegistry.js'
import ModuleIcon from './ModuleIcon.jsx'
import { MODULE_REGISTRY } from './moduleRegistry.js'
import { authAccessApi } from '../api/apiEndpoints'
const session = vi.hoisted(() => ({ role: 'admin', token: 'test-token', academic: { selectedCollege: { id: '7', name: 'Test College' }, selectedCollegeId: '7', colleges: [], loading: false } }))
vi.mock('../auth/auth', async original => ({ ...await original(), getUserRole: () => session.role, getAccessToken: () => session.token }))
vi.mock('../context/AcademicContext', () => ({ useAcademic: () => session.academic }))
vi.mock('../api/apiEndpoints', () => ({ authAccessApi: { get: vi.fn() } }))
vi.mock('../auth/collegeApi', () => ({ collegeLogoValue: () => '', cacheCollegeLogo: vi.fn(), fetchCollegeLogo: vi.fn(), getCollegeById: vi.fn(async () => ({})), getCollegeLogoEndpoint: () => '', getCollegeLogoUrl: () => '', getColleges: vi.fn(async () => []), isBackendCollegeLogo: () => false, readCachedCollegeLogo: () => '', unwrapCollegeRecord: value => value }))
afterEach(() => { cleanup(); document.documentElement.removeAttribute('data-theme') })
beforeEach(() => { vi.clearAllMocks(); session.role = 'admin'; session.token = 'test-token'; session.academic = { selectedCollege: { id: '7', name: 'Test College' }, selectedCollegeId: '7', colleges: [], loading: false }; authAccessApi.get.mockReset().mockResolvedValue({ isSuperAdmin: true, collegeId: 7, permissions: {} }); sessionStorage.clear() })
function mount(props = {}, path = '/fees/structures/create') {
 return render(<MemoryRouter initialEntries={[path]}><Sidebar {...props} /></MemoryRouter>)
}
test('every registry icon renders from static imports; major sidebar modules have distinct glyphs', () => {
 for (const module of MODULE_REGISTRY) {
  expect(ICON_REGISTRY[module.icon], module.icon).toBeTruthy()
  expect(renderToStaticMarkup(<ModuleIcon moduleId={module.id} />)).toContain('<svg')
 }
 const major = MODULE_REGISTRY.filter(module => module.navigation)
 expect(new Set(major.map(module => module.icon)).size).toBe(major.length)
 expect(getModuleIcon('unknown')).toBe(ICON_REGISTRY['circle-help'])
 const { container } = render(<ModuleIcon moduleId="colleges" />)
 const icon = container.querySelector('svg')
 expect(icon.getAttribute('aria-hidden')).toBe('true'); expect(icon.getAttribute('width')).toBe('20'); expect(icon.getAttribute('stroke-width')).toBe('1.8')
 expect(icon.getAttribute('stroke')).toBe('currentColor')
})
test('an explicitly labeled standalone icon is accessible', () => {
 render(<ModuleIcon moduleId="colleges" label="Colleges" />)
 expect(screen.getByRole('img', { name: 'Colleges' }).getAttribute('aria-hidden')).toBeNull()
})
test.each(['light', 'dark'])('sidebar keeps links, fee active states and consistent icons in %s theme', async theme => {
 document.documentElement.dataset.theme = theme
 const { container } = mount()
 await waitFor(() => expect(authAccessApi.get).toHaveBeenCalled())
 const colleges = await screen.findByRole('link', { name: 'Colleges' })
 expect(colleges.getAttribute('href')).toBe('/college-institution-management')
 expect(colleges.querySelector('svg').classList.contains('lucide-landmark')).toBe(true)
 expect(screen.getByRole('link', { name: 'Fee Structure' }).classList.contains('active')).toBe(true)
 expect(screen.getByRole('link', { name: 'Fee Management' }).classList.contains('active')).toBe(false)
 for (const link of container.querySelectorAll('.sidebar-link')) {
  expect(link.querySelector('svg').getAttribute('width')).toBe('20')
  expect(link.querySelector('svg').getAttribute('stroke-width')).toBe('1.8')
 }
 expect(screen.queryByRole('link', { name: 'Academic Levels' })).toBeNull()
 expect(screen.queryByRole('link', { name: 'Fee Reports' })).toBeNull()
})
test('existing access matrix still filters modules and does not grant denied subjects', async () => {
 authAccessApi.get.mockResolvedValue({ isSuperAdmin: false, permissions: { fees: { view: true }, subjects: { view: false } } })
 mount({}, '/fees/collection')
 await screen.findByRole('link', { name: 'Fee Management' });
 expect(screen.queryByRole('link', { name: 'Subject Management' })).toBeNull()
 expect(screen.getByRole('link', { name: 'Fee Management' }).classList.contains('active')).toBe(true)
 expect(screen.getByRole('link', { name: 'Fee Structure' }).classList.contains('active')).toBe(false)
})
test('existing disclosure, collapse and mobile close callbacks survive icon changes', async () => {
 const onClose = vi.fn(), onToggleCollapse = vi.fn()
 const { container, rerender } = mount({ open: true, onClose, onToggleCollapse })
 await screen.findByRole('link', { name: 'Colleges' })
 expect(container.querySelector('aside').classList.contains('is-open')).toBe(true)
 fireEvent.click(screen.getByRole('button', { name: 'Exam Management' }))
 expect(screen.getByRole('button', { name: 'Exam Management' }).getAttribute('aria-expanded')).toBe('true')
 expect(screen.getByRole('link', { name: 'Examination Setup' }).getAttribute('href')).toBe('/examination-setup')
 fireEvent.click(screen.getByRole('link', { name: 'Colleges' })); expect(onClose).toHaveBeenCalled()
 rerender(<MemoryRouter><Sidebar collapsed onClose={onClose} onToggleCollapse={onToggleCollapse} /></MemoryRouter>)
 expect(container.querySelector('aside').classList.contains('is-collapsed')).toBe(true)
 fireEvent.click(screen.getByRole('button', { name: 'Expand navigation' })); expect(onToggleCollapse).toHaveBeenCalled()
 expect(screen.getByRole('link', { name: 'Colleges' }).getAttribute('title')).toBe('Colleges')
})

function deferred() { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
const sidebarTree = props => <MemoryRouter initialEntries={['/fees/collection']}><Sidebar {...props} /></MemoryRouter>

test('pending permissions keep the role navigation visible until scoped links are ready', async () => {
 const request = deferred(); authAccessApi.get.mockReturnValueOnce(request.promise);
 mount(); expect(screen.getByText('Loading navigation…')).toBeTruthy(); expect(screen.getByRole('link', { name: 'Colleges' })).toBeTruthy();
 expect(document.querySelectorAll('.sidebar-section-label').length).toBeGreaterThan(0);
 await act(async () => request.resolve({ collegeId: 7, permissions: { fees: { view: true } } }));
 expect(screen.getByRole('link', { name: 'Fee Management' })).toBeTruthy();
 expect([...document.querySelectorAll('.sidebar-section-label')].map(node => node.textContent)).toEqual(['Finance']);
})
test('failed access preserves navigation without a sidebar error or retry button', async () => {
 authAccessApi.get.mockRejectedValueOnce(new Error('Unavailable'));
 mount(); await waitFor(() => expect(screen.queryByText('Loading navigation…')).toBeNull());
 expect(screen.getByRole('link', { name: 'Colleges' })).toBeTruthy();
 expect(screen.queryByText(/Service unavailable/)).toBeNull();
 expect(screen.queryByRole('button', { name: 'Retry connection' })).toBeNull();
})
test('college changes immediately hide the old permission matrix and reload the selected scope', async () => {
 authAccessApi.get.mockResolvedValueOnce({ collegeId: 7, permissions: { fees: { view: true } } });
 const { rerender } = render(sidebarTree()); await screen.findByRole('link', { name: 'Fee Management' });
 const next = deferred(); authAccessApi.get.mockReturnValueOnce(next.promise);
 session.academic = { ...session.academic, selectedCollege: { id: '8', name: 'Next College' }, selectedCollegeId: '8' };
 rerender(sidebarTree()); expect(screen.getByRole('link', { name: 'Fee Management' })).toBeTruthy(); expect(screen.getByText('Loading navigation…')).toBeTruthy();
 await waitFor(() => expect(authAccessApi.get).toHaveBeenLastCalledWith('8'));
 await act(async () => next.resolve({ collegeId: 8, permissions: { rooms: { view: true } } }));
 expect(screen.getByRole('link', { name: 'Rooms & Classrooms' })).toBeTruthy(); expect(screen.queryByRole('link', { name: 'Fee Management' })).toBeNull();
})
test('late responses from a previous college cannot overwrite the current navigation', async () => {
 const old = deferred(), next = deferred(); authAccessApi.get.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
 const { rerender } = render(sidebarTree());
 session.academic = { ...session.academic, selectedCollegeId: '8', selectedCollege: { id: '8', name: 'Next College' } };
 rerender(sidebarTree());
 await act(async () => next.resolve({ collegeId: 8, permissions: { rooms: { view: true } } }));
 await act(async () => old.resolve({ collegeId: 7, isSuperAdmin: true, permissions: {} }));
 expect(screen.getByRole('link', { name: 'Rooms & Classrooms' })).toBeTruthy(); expect(screen.queryByRole('link', { name: 'Colleges' })).toBeNull();
})
test('a mismatched college response is rejected even if it claims Super Admin', async () => {
 authAccessApi.get.mockResolvedValueOnce({ collegeId: 99, isSuperAdmin: true, permissions: {} });
 mount(); await waitFor(() => expect(screen.queryByText('Loading navigation…')).toBeNull()); expect(screen.queryByText(/Service unavailable/)).toBeNull();
})
test('context loading delays requests; an empty college selection is a setup hint rather than permission denial', async () => {
 session.academic.loading = true;
 const { rerender } = render(sidebarTree()); expect(authAccessApi.get).not.toHaveBeenCalled();
 session.academic = { ...session.academic, loading: false, selectedCollegeId: '', selectedCollege: null };
 rerender(sidebarTree()); await screen.findByRole('link', { name: 'Rooms & Classrooms' });
 expect(authAccessApi.get).toHaveBeenCalledWith(undefined); expect(screen.getByText('Select a college for college-specific records.')).toBeTruthy();
})
test('changing login token clears old navigation without changing authentication behavior', async () => {
 const { rerender } = render(sidebarTree()); await screen.findByRole('link', { name: 'Colleges' });
 session.token = '';
 rerender(sidebarTree()); expect(screen.queryByRole('link', { name: 'Colleges' })).toBeNull(); expect(screen.getByText('Sign in to load navigation.')).toBeTruthy();
})
test('an explicitly permitted faculty user keeps the existing Academics links and destinations', async () => {
 session.role = 'faculty'; authAccessApi.get.mockResolvedValueOnce({ collegeId: 7, permissions: { subjects: { view: true }, timetable: { view: true }, student_attendance: { view: true } } });
 mount(); await screen.findByRole('link', { name: 'My Subjects' });
 expect(screen.getByRole('link', { name: 'My Timetable' }).getAttribute('href')).toBe('/timetable');
 expect(screen.getByRole('link', { name: 'Record Attendance' }).getAttribute('href')).toBe('/student-management/attendance/take');
 expect(screen.queryByRole('link', { name: 'Colleges' })).toBeNull();
})
function HistoryControls() { const navigate = useNavigate(); return <><button onClick={() => navigate('/results/student-result')}>Open result</button><button onClick={() => navigate('/results/backlog-report')}>Open backlog</button><button onClick={() => navigate(-1)}>Go back</button></> }
test('history navigation and new deep links expand the active parent after manual closure', async () => {
 render(<MemoryRouter initialEntries={['/courses']}><Sidebar /><HistoryControls /></MemoryRouter>);
 await screen.findByRole('link', { name: 'Colleges' }); fireEvent.click(screen.getByRole('button', { name: 'Open result' }));
 expect(screen.getByRole('button', { name: 'Grades System and Results' }).getAttribute('aria-expanded')).toBe('true');
 expect(screen.getByRole('link', { name: 'Official Results' }).getAttribute('aria-current')).toBe('page');
 fireEvent.click(screen.getByRole('button', { name: 'Grades System and Results' }));
 expect(screen.queryByRole('link', { name: 'Official Results' })).toBeNull();
 fireEvent.click(screen.getByRole('button', { name: 'Open backlog' }));
 expect(screen.getByRole('link', { name: 'Official Results' })).toBeTruthy();
 fireEvent.click(screen.getByRole('button', { name: 'Go back' })); expect(screen.getByRole('link', { name: 'Official Results' })).toBeTruthy();
})
function CollapsibleSidebar() { const [collapsed, setCollapsed] = useState(true); return <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(value => !value)} /> }
test('clicking a collapsed parent expands the sidebar and its submenu together', async () => {
 const { container } = render(<MemoryRouter initialEntries={['/exam/hall-allocation']}><CollapsibleSidebar /></MemoryRouter>);
 await screen.findByRole('button', { name: 'Exam Management' }); expect(container.querySelector('aside').classList.contains('is-collapsed')).toBe(true);
 fireEvent.click(screen.getByRole('button', { name: 'Exam Management' }));
 expect(container.querySelector('aside').classList.contains('is-collapsed')).toBe(false);
 expect(screen.getByRole('link', { name: 'Exam Timetable' }).getAttribute('aria-current')).toBe('page');
})
test('sidebar scroll position is restored and saved through registry rendering', async () => {
 sessionStorage.setItem('pirnav-sidebar-scroll', '65'); const { container } = mount();
 await screen.findByRole('link', { name: 'Colleges' }); const nav = container.querySelector('nav'); expect(nav.scrollTop).toBe(65);
 fireEvent.scroll(nav, { target: { scrollTop: 105 } }); expect(sessionStorage.getItem('pirnav-sidebar-scroll')).toBe('105');
})
