import React from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { FeeStructureWizard } from './FeeManagement'
import { academicFeePlanApi } from '../../api/apiEndpoints'
import { newFeeStructure } from '../../services/feeStructureService'
vi.mock('../../context/AcademicContext', () => ({ useAcademic: () => ({ loading: false, error: null }) }))
vi.mock('../../api/apiEndpoints', async importOriginal => ({ ...await importOriginal(), feeConfigurationApi: { categories: vi.fn(async () => [{ id: 8, name: 'Academic charges' }]) }, academicFeePlanApi: { list: vi.fn(async () => []), create: vi.fn(async body => ({ ...body, feeStructureId: 101, revision: 1, status: 'DRAFT' })) } }))
// Native controls make the dependency behavior independent of dropdown presentation.
vi.mock('../../components/SearchableSelect', () => ({ default: ({ label, value, options, onChange, disabled }) => <select aria-label={label} value={value} disabled={disabled} onChange={e => onChange(e.target.value)}>{options.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select>, ProjectSelect: () => null }))
afterEach(cleanup)
const masters = { years: [{ id: '1', name: '2026-27' }], courses: [{ id: '2', name: 'B.Tech' }, { id: '3', name: 'M.Tech' }], branches: [{ id: '4', courseId: '2', name: 'CSE' }, { id: '5', courseId: '3', name: 'ECE' }], semesters: [{ id: '6', courseId: '2', branchId: '4', name: 'Semester 3' }], batchScopes: [{ courseId: '2', branchId: '4', batch: '2025-2029' }] }
function mount() { return render(<FeeStructureWizard value={newFeeStructure('1')} masters={masters} collegeId="9" close={() => {}} save={() => {}} />) }
const choose = (name, value) => fireEvent.change(screen.getByLabelText(name), { target: { value } })
async function openBreakdown() {
 choose('Course *', '2'); choose('Branch *', '4');
 await waitFor(() => expect(screen.getByLabelText('Admission Batch *').disabled).toBe(false));
 choose('Admission Batch *', '2025-2029'); choose('Applicable Semester *', '6');
 fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
}
test('academic dependencies use stored cohorts, clear stale children and suggest editable names', async () => {
 mount(); await waitFor(() => expect(screen.getByLabelText('Course *').disabled).toBe(false));
 choose('Course *', '2'); choose('Branch *', '4');
 await waitFor(() => expect(screen.getByLabelText('Admission Batch *').disabled).toBe(false));
 expect(screen.getByLabelText('Admission Batch *').textContent).toContain('2025-2029');
 expect(screen.getByLabelText('Admission Batch *').textContent).not.toContain('2026-2030');
 choose('Admission Batch *', '2025-2029'); choose('Applicable Semester *', '6');
 await waitFor(() => expect(screen.getByLabelText('Fee Plan Name *').value).toContain('Semester 3'));
 choose('Fee Plan Name *', 'Custom plan'); choose('Course *', '3');
 expect(screen.getByLabelText('Branch *').value).toBe(''); expect(screen.getByLabelText('Admission Batch *').value).toBe('');
 expect(screen.getByLabelText('Applicable Semester *').value).toBe(''); expect(screen.getByLabelText('Fee Plan Name *').value).toBe('Custom plan');
 expect(screen.getByLabelText('Branch *').textContent).not.toContain('CSE');
 expect(screen.getByLabelText('Fee Applicability Period *').textContent).not.toContain('Annual');
})
test('copied combinations expose duplicate validation and financial category is in breakdown', async () => {
 mount(); await waitFor(() => expect(screen.getByLabelText('Course *').disabled).toBe(false));
 await openBreakdown();
 fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
 expect(screen.getAllByText(/Duplicate quota and category/).length).toBe(2);
 const category = screen.getByLabelText('Financial Fee Category *');
 expect(category.closest('[role="tabpanel"]').hidden).toBe(false);
 expect(category.closest('[role="tabpanel"]').id).toContain('breakdown');
 fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[1]);
 expect(screen.queryByText(/Duplicate quota and category/)).toBeNull();
})

test('complete draft sends existing semester DTO and separate payment model', async () => {
 mount(); await waitFor(() => expect(screen.getByLabelText('Course *').disabled).toBe(false));
 choose('Course *', '2'); choose('Branch *', '4');
 await waitFor(() => expect(screen.getByLabelText('Admission Batch *').disabled).toBe(false));
 choose('Admission Batch *', '2025-2029'); choose('Applicable Semester *', '6');
 fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
 choose('Admission Quota', '__other__'); choose('Specify Admission Quota *', 'Industry Sponsored');
 choose('Financial Fee Category *', '8');
 fireEvent.click(screen.getByRole('button', { name: /Add Fee Head/ }));
 choose('Fee head 1 type', '__other__'); choose('Fee head 1 custom name', 'Tuition Fee'); choose('Fee head 1 amount', '5000');
 fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
 choose('Due Date *', '2026-07-01'); choose('Effective From *', '2026-06-01'); choose('Effective To *', '2027-05-31');
 fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
 await waitFor(() => expect(academicFeePlanApi.create).toHaveBeenCalled());
 const body = academicFeePlanApi.create.mock.calls.at(-1)[0];
 expect(body).toMatchObject({ collegeId: 9, academicYearId: 1, courseId: 2, branchId: 4, semesterId: 6, feeCategoryId: 8, batch: '2025-2029', quota: 'Industry Sponsored', cycle: 'SEMESTER', paymentMode: 'FULL_PAYMENT', totalAmount: '5000.00', components: [{ name: 'Tuition Fee', amount: '5000.00' }], installments: [{ number: 1, dueDate: '2026-07-01', amount: '5000.00' }] });
 expect(body).not.toHaveProperty('admissionType'); expect(body).not.toHaveProperty('yearOfStudy');
})

test('quota dropdown supports manual Others and adds one independent row per click', async () => {
 mount(); await waitFor(() => expect(screen.getByLabelText('Course *').disabled).toBe(false));
 await openBreakdown();
 const quota = screen.getByLabelText('Admission Quota');
 for (const name of ['Government / Convener', 'Management', 'NRI', 'NRI Sponsored', 'Institutional', 'Others (enter manually)']) expect(quota.textContent).toContain(name);
 choose('Admission Quota', '__other__'); choose('Specify Admission Quota *', 'Industry Sponsored');
 fireEvent.click(screen.getByRole('button', { name: 'Add Quota / Category' }));
 expect(screen.getAllByLabelText('Admission Quota').length).toBe(2);
 expect(screen.getAllByLabelText('Admission Quota')[0].value).toBe('__other__');
 expect(screen.getAllByLabelText('Admission Quota')[1].value).toBe('');
 expect(screen.getByLabelText('Specify Admission Quota *').value).toBe('Industry Sponsored');
 fireEvent.change(screen.getAllByLabelText('Admission Quota')[1], { target: { value: 'Management' } });
 fireEvent.click(screen.getByRole('button', { name: 'Add Quota / Category' }));
 expect(screen.getAllByLabelText('Admission Quota').length).toBe(3);
 expect(screen.getAllByLabelText('Admission Quota')[1].value).toBe('Management');
 fireEvent.change(screen.getAllByLabelText('Admission Quota')[0], { target: { value: 'NRI' } });
 expect(screen.queryByLabelText('Specify Admission Quota *')).toBeNull();
})

test('Fee Breakdown retains independent quota fee heads, copy and totals without live preview', async () => {
 mount(); await waitFor(() => expect(screen.getByLabelText('Course *').disabled).toBe(false));
 expect(screen.queryByRole('button', { name: 'Add Quota / Category' })).toBeNull();
 await openBreakdown();
 choose('Financial Fee Category *', '8'); choose('Admission Quota', 'Management');
 fireEvent.click(screen.getByRole('button', { name: 'Add Fee Head' }));
 choose('Fee head 1 type', '__other__'); choose('Fee head 1 custom name', 'Tuition Fee'); choose('Fee head 1 amount', '5000');
 fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
 let cards = screen.getAllByRole('group', { name: /Quota fee configuration/ });
 fireEvent.change(within(cards[1]).getByLabelText('Admission Quota'), { target: { value: 'NRI' } });
 fireEvent.change(within(cards[1]).getByLabelText('Fee head 1 amount'), { target: { value: '8000' } });
 expect(within(cards[0]).getByLabelText('Fee head 1 amount').value).toBe('5000');
 expect(within(cards[1]).getByLabelText('Fee head 1 amount').value).toBe('8000');
 expect(screen.queryByLabelText('Preview configuration')).toBeNull();
 expect(screen.queryByRole('complementary', { name: 'Live Preview' })).toBeNull();
 fireEvent.click(within(cards[1]).getByRole('button', { name: 'Add Fee Head' }));
 expect(within(cards[0]).queryByLabelText('Fee head 2 type')).toBeNull();
 expect(within(cards[1]).getByLabelText('Fee head 2 type')).toBeTruthy();
 fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
 expect(screen.getByRole('tab', { name: /Fee Breakdown/ }).getAttribute('aria-selected')).toBe('true');
 fireEvent.click(screen.getByRole('button', { name: 'Add Quota / Category' }));
 cards = screen.getAllByRole('group', { name: /Quota fee configuration/ });
 expect(within(cards[2]).queryByLabelText('Fee head 1 type')).toBeNull();
 fireEvent.click(within(cards[2]).getByRole('button', { name: 'Remove' }));
 fireEvent.click(within(cards[1]).getByRole('button', { name: 'Remove fee head 2' }));
 fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
 choose('Due Date *', '2026-07-01'); choose('Effective From *', '2026-06-01'); choose('Effective To *', '2027-05-31');
 academicFeePlanApi.create.mockClear();
 fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
 await waitFor(() => expect(academicFeePlanApi.create).toHaveBeenCalledTimes(2));
 const bodies = academicFeePlanApi.create.mock.calls.map(([body]) => body);
 expect(bodies[0]).toMatchObject({ quota: 'Management', totalAmount: '5000.00', components: [{ name: 'Tuition Fee', amount: '5000.00' }] });
 expect(bodies[1]).toMatchObject({ quota: 'NRI', totalAmount: '8000.00', components: [{ name: 'Tuition Fee', amount: '8000.00' }] });
})
