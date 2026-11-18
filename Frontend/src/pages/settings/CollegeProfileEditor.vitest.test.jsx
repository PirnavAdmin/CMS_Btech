import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import CollegeProfileEditor from './CollegeProfileEditor.jsx'

const fixture = vi.hoisted(() => ({
  access: { isCollegeAdmin: true, isSuperAdmin: false, primaryCollegeId: 7, collegeId: 7 },
  canEdit: true,
}))

vi.mock('../../components/ViewDialog.jsx', () => ({
  default: ({ title, subtitle, children, footerContent }) => <div role="dialog" aria-label={title}>
    <h1>{title}</h1><p>{subtitle}</p>{children}<footer>{footerContent}</footer>
  </div>,
}))
vi.mock('../../auth/ScreenAccess.jsx', () => ({
  useScreenAccess: () => ({ access: fixture.access, canAction: () => fixture.canEdit }),
}))
vi.mock('../../auth/collegeApi.js', () => ({
  fetchCollegeLogo: vi.fn(),
  getCollegeLogoUrl: (_id, logo) => logo ? '/college-logo' : '',
  isValidWebsite: value => /^https?:\/\//i.test(value),
  normalizeWebsite: value => value && !/^https?:\/\//i.test(value) ? 'https://' + value : value,
  updateCollegeProfile: vi.fn().mockResolvedValue({}),
  uploadCollegeLogo: vi.fn().mockResolvedValue({}),
}))
vi.mock('../../api/apiEndpoints.js', () => ({ lookupIndianPostOffices: vi.fn().mockResolvedValue([]) }))
vi.mock('../../utils/toast.js', () => ({ showSuccess: vi.fn() }))

import { updateCollegeProfile, uploadCollegeLogo } from '../../auth/collegeApi.js'

const profile = {
  id: 7,
  collegeName: 'Assigned College',
  collegeCode: 'AC-7',
  collegeType: 'Engineering',
  universityName: 'State University',
  email: 'office@example.edu',
  mobile: '9876543210',
  alternateContactNumber: '9876501234',
  principal: 'Dr. Principal',
  principalEmail: 'principal@example.edu',
  principalContact: '9876512345',
  accreditationStatus: 'Accredited',
  accreditationBody: 'NAAC',
  accreditationGrade: 'A',
  accreditationNumber: 'ACR-25',
  validFrom: '2020-01-01',
  validUntil: '2025-12-31',
  addressLine1: 'Main Road',
  addressLine2: 'Near Central Park',
  country: 'India',
  state: 'Telangana',
  district: 'Medchal',
  city: 'Madhapur',
  pincode: '500081',
  area: 'Madhapur Post Office',
  website: 'https://college.example',
  establishedYear: 2001,
  affiliationNumber: 'UNSUPPORTED',
  aicteApprovalDetails: 'UNSUPPORTED',
  authorizedContactPerson: 'UNSUPPORTED',
}

beforeEach(() => {
  vi.clearAllMocks()
  fixture.access = { isCollegeAdmin: true, isSuperAdmin: false, primaryCollegeId: 7, collegeId: 7 }
  fixture.canEdit = true
  if (!URL.createObjectURL) Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:logo-preview' })
  if (!URL.revokeObjectURL) Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => {} })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:logo-preview')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }))

test('College Admin can review five steps and save only changed, API-supported profile fields', async () => {
  const { container } = render(<CollegeProfileEditor editId="7" profile={profile} onDismiss={vi.fn()} />)
  fireEvent.change(screen.getByLabelText(/College Name/), { target: { value: 'Updated College' } })
  expect(container.querySelectorAll('.college-profile-editor__step')).toHaveLength(5)

  next()
  expect(screen.getByRole('heading', { name: 'Accreditation record' })).toBeTruthy()
  expect(screen.queryByLabelText(/AICTE/)).toBeNull()
  expect(screen.queryByLabelText(/Affiliation Number/)).toBeNull()
  next()
  expect(screen.getByRole('heading', { name: 'Campus address' })).toBeTruthy()
  next()
  expect(screen.getByRole('heading', { name: 'College administration' })).toBeTruthy()
  next()
  expect(screen.getByRole('heading', { name: 'Review college profile' })).toBeTruthy()
  expect(screen.queryByText('UNSUPPORTED')).toBeNull()
  for (const value of [
    'Updated College', 'AC-7', 'Engineering', 'State University', 'Accredited', 'NAAC',
    'A', 'ACR-25', '2020-01-01', '2025-12-31', 'Main Road', 'Near Central Park',
    'India', 'Telangana', 'Medchal', 'Madhapur', '500081', 'Madhapur Post Office',
    'office@example.edu', '9876543210', '9876501234', 'https://college.example',
    'Dr. Principal', 'principal@example.edu', '9876512345',
  ]) expect(screen.getByText(value)).toBeTruthy()
  expect(screen.getByText('All required fields are filled.')).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Edit Address & Contact' }))
  expect(screen.getByLabelText(/Address Line 1/).value).toBe('Main Road')
  fireEvent.click(screen.getByRole('button', { name: 'Review & Save, incomplete' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

  await waitFor(() => expect(updateCollegeProfile).toHaveBeenCalledOnce())
  expect(updateCollegeProfile).toHaveBeenCalledWith('7', { CollegeName: 'Updated College' })
  expect(uploadCollegeLogo).not.toHaveBeenCalled()
})

test('College Name validation keeps the wizard on the current step', () => {
  render(<CollegeProfileEditor editId="7" profile={profile} />)
  fireEvent.change(screen.getByLabelText(/College Name/), { target: { value: ' ' } })
  next()
  expect(screen.getByRole('alert').textContent).toBe('College name is required.')
  expect(screen.getByRole('heading', { name: 'College Identity' })).toBeTruthy()
})

test('logo selection previews the file and uploads it through the existing endpoint', async () => {
  render(<CollegeProfileEditor editId="7" profile={profile} />)
  const file = new File(['logo'], 'college.png', { type: 'image/png' })
  fireEvent.change(screen.getByLabelText('Upload college logo'), { target: { files: [file] } })
  expect(screen.getByAltText('College logo preview').getAttribute('src')).toBe('blob:logo-preview')

  for (let index = 0; index < 4; index += 1) next()
  expect(screen.getByRole('heading', { name: 'Review college profile' })).toBeTruthy()
  expect(screen.getByText('college.png')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
  await waitFor(() => expect(uploadCollegeLogo).toHaveBeenCalledWith('7', file))
  expect(updateCollegeProfile).not.toHaveBeenCalled()
})

test('editing controls stay locked without the granted college edit permission', () => {
  fixture.canEdit = false
  render(<CollegeProfileEditor editId="7" profile={profile} />)
  expect(screen.getByLabelText(/College Name/).readOnly).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Review & Save, incomplete' }))
  expect(screen.getByRole('button', { name: 'Save Changes' }).disabled).toBe(true)
})
