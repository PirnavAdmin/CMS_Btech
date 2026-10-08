import { useEffect, useId, useRef, useState } from 'react'
import { FiArrowLeft, FiArrowRight, FiCheck, FiEdit2, FiPlus, FiTrash2, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import SearchableSelect from '../../components/SearchableSelect'
import TablePagination from '../../components/TablePagination'
import EmptyState from '../../components/EmptyState'
import { cents, feeMoney, feeTotal, uid, validateFeeStructure } from './feeStructureService'
import '../admin-management/AddCollege.css'

function feeFieldLabel(label) {
  return typeof label === 'string' && label.endsWith(' *') ? <>{label.slice(0, -2)} <b className="required-mark">*</b></> : label
}
export function FeeField({ label, children, className = '' }) {
  return <label className={className || 'fs-field'}><span>{feeFieldLabel(label)}</span>{children}</label>
}
export function FeeInput({ label, value, onChange, className, ...props }) {
  return <FeeField label={label} className={className}><input value={value ?? ''} onChange={e => onChange(e.target.value)} {...props} /></FeeField>
}
export function FeeSelect({ label, value, options, onChange, className = '', displayLabel = label, ...props }) {
  const placeholder = options.find(option => typeof option === 'object' && option.id === '')?.name || 'Select an option'
  return <div className={className || 'fs-field'}><span className="fs-field-label">{feeFieldLabel(displayLabel)}</span><SearchableSelect label={label} value={value} options={options} placeholder={placeholder} onChange={onChange} {...props} /></div>
}
function WizardInput(props) {
  return <FeeInput {...props} className="ac-field" />
}
function WizardSelect(props) {
  return <FeeSelect {...props} className="ac-field" />
}
export function FeeBadge({ value }) {
  return <span className={`fs-badge fm-badge ${String(value).toLowerCase().replaceAll(' ', '-')}`}>{value}</span>
}
export function financialLedgerRows(assignment, ledger, concessions) {
  const entries = [
    { id: assignment.id, date: assignment.at, reference: assignment.structure.name, description: 'Original fee assignment', debit: ledger.total, credit: 0, order: 0 },
    ...ledger.payments.map(p => ({ id: p.id, date: p.date, reference: p.receipt, description: `Payment · ${p.mode}`, debit: 0, credit: cents(p.amount), order: 2 })),
    ...concessions.filter(c => c.status === 'Approved').map(c => ({ id: c.id, date: c.updatedAt, reference: c.id, description: c.reason, debit: 0, credit: c.amount, order: 1 })),
    ...ledger.refunds.map(r => ({ id: r.id, date: r.updatedAt, reference: r.id, description: `Refund · ${r.reason}`, debit: r.amount, credit: 0, order: 3 })),
  ].sort((a, b) => String(a.date).slice(0, 10).localeCompare(String(b.date).slice(0, 10)) || a.order - b.order)
  return entries.reduce((rows, r) => [...rows, { ...r, balance: (rows.at(-1)?.balance || 0) + r.debit - r.credit }], [])
}
export function FeeStats({ items }) {
  return <div className="fs-kpis fm-stats">{items.map(([label, value]) => <article key={label}><div><span>{label}</span><strong>{value}</strong></div></article>)}</div>
}
export function FeeTable({ columns, rows, empty = 'No records found.', pageSize = 8, rowKey = row => row.id, caption }) {
  const [page, setPage] = useState(1)
  const signature = rows.map(rowKey).join('|')
  useEffect(() => setPage(1), [signature])
  const pages = Math.max(1, Math.ceil(rows.length / pageSize)), current = Math.min(page, pages)
  return <>{rows.length ? <><div className="fs-table fm-table"><table>{caption && <caption className="fm-sr-only">{caption}</caption>}<thead><tr>{columns.map((c, i) => <th key={i} scope="col" className={c.align === 'right' ? 'fm-number' : undefined}>{c.label}</th>)}</tr></thead><tbody>{rows.slice((current - 1) * pageSize, current * pageSize).map((row, n) => <tr key={rowKey(row) ?? n}>{columns.map((c, i) => <td key={i} className={c.align === 'right' ? 'fm-number' : undefined}>{c.render ? c.render(row) : row[c.key] ?? '—'}</td>)}</tr>)}</tbody></table></div>{pages > 1 && <TablePagination currentPage={current} totalPages={pages} onPageChange={setPage} />}</> : <EmptyState title={empty} />}</>
}
export function FeeDialog({ title, close, children, footer, wide = false }) {
  const ref = useRef(null), titleId = useId()
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => { document.body.style.overflow = overflow; previous?.focus() }
  }, [])
  const keydown = e => {
    if (e.key === 'Escape') { e.stopPropagation(); close() }
    if (e.key !== 'Tab') return
    const elements = [...ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(el => el.getClientRects().length)
    const first = elements[0], last = elements.at(-1)
    if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last?.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
  }
  return <div className="fs-overlay fm-overlay"><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={keydown} className={`fs-editor fm-dialog ${wide ? 'fm-wide' : ''}`}><header><h2 id={titleId}>{title}</h2><button type="button" aria-label="Close dialog" onClick={close}><FiX /></button></header>{children}{footer && <footer>{footer}</footer>}</section></div>
}
export function FeeReview({ value: s, section = 'all', showLateRules = true, showTotals = true }) {
  return <>
    {['all', 'overview'].includes(section) && <><dl className="fs-preview">{[['Structure', s.name], ['Academic year', s.academicYearName], ['Program / Course', s.courseName], ['Branch', s.branchName], ['Batch', s.batch], ['Category / Quota', s.applicableTo === 'All Students' ? 'All Students' : s.category], ['Fee cycle', s.cycle], ['Semester', s.semesterName || 'All'], ['Version', s.version]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl>{showTotals && <FeeStats items={[[ 'Subtotal', feeMoney(s.components.reduce((a, c) => a + Number(c.amount || 0), 0))], ['Structure concession', feeMoney(s.discount)], ['Total fee', feeMoney(feeTotal(s))]]} />}</>}
    {['all', 'components'].includes(section) && <FeeTable rows={s.components} rowKey={r => r.masterId} columns={[{ label: 'Component', key: 'name' }, { label: 'Frequency', key: 'frequency' }, { label: 'Mandatory', render: r => r.mandatory ? 'Yes' : 'No' }, { label: 'Refundable', render: r => r.refundable ? 'Yes' : 'No' }, { label: 'Amount', align: 'right', render: r => feeMoney(r.amount) }]} />}
    {['all', 'schedule'].includes(section) && <><h3>Payment plan · {s.plan}</h3>{s.plan === 'Full Payment' ? <p>Due {s.dueDate || '—'}</p> : <FeeTable rows={s.installments} columns={[{ label: 'Installment', render: r => `Installment ${s.installments.indexOf(r) + 1}` }, { label: 'Due date', key: 'dueDate' }, { label: 'Amount', align: 'right', render: r => feeMoney(r.amount) }]} />}{showLateRules && <p className="fm-muted">Grace period: {s.grace || 0} days · Late fee: {s.penaltyType}{s.penaltyType !== 'None' && ` (${s.penaltyType === 'Percentage' ? `${s.penaltyValue}%` : feeMoney(s.penaltyValue)})`}{s.maximumPenalty !== '' && ` · Maximum ${feeMoney(s.maximumPenalty)}`}</p>}</>}
  </>
}

function academicFeeErrors(s) {
  return {
    name: !s.name.trim() ? 'Structure name is required.' : '',
    academicYearId: !s.academicYearId ? 'Select an academic year.' : '',
    courseId: !s.courseId ? 'Select a program / course.' : '',
    branchId: !s.branchId ? 'Select a branch.' : '',
    batch: !s.batch.trim() ? 'Batch is required.' : '',
    category: s.applicableTo === 'Selected Category' && !s.category ? 'Select a category / quota.' : '',
    semesterId: s.cycle === 'Semester-wise' && !s.semesterId ? 'Select a semester.' : '',
  }
}

export default function FeeStructureWizard({ value, masters, components, close, save }) {
  const [s, set] = useState(() => structuredClone(value)), [step, setStep] = useState(0), [error, setError] = useState(''), [touched, setTouched] = useState({}), [attempted, setAttempted] = useState(false), [componentForm, setComponentForm] = useState(null)
  const tabsRef = useRef(null)
  useEffect(() => { tabsRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }) }, [step])
  const steps = ['Academic Setup', 'Fee Components', 'Payment Plan', 'Review & Publish']
  const patch = change => { set(current => ({ ...current, ...change })); setError('') }
  const select = (key, nameKey, rows, id, reset = {}) => patch({ [key]: id, [nameKey]: rows.find(r => String(r.id) === String(id))?.name || '', ...reset })
  const branches = masters.branches.filter(b => String(b.courseId) === String(s.courseId))
  const semesters = masters.semesters.filter(r => (!r.courseId || String(r.courseId) === String(s.courseId)) && (!r.branchId || String(r.branchId) === String(s.branchId)) && (!r.academicYearId || String(r.academicYearId) === String(s.academicYearId)))
  const total = feeTotal(s), subtotal = s.components.reduce((sum, c) => sum + cents(c.amount), 0) / 100, allocated = s.installments.reduce((sum, i) => sum + cents(i.amount), 0)
  const updateComponent = (id, change) => patch({ components: s.components.map(c => c.masterId === id ? { ...c, ...change } : c) })
  const updateInstallment = (id, change) => patch({ installments: s.installments.map(i => i.id === id ? { ...i, ...change } : i) })
  const academicErrors = academicFeeErrors(s)
  const field = (key, control, wide = false) => {
    const issue = (attempted || touched[key]) && academicErrors[key]
    return <div className={`fw-field${wide ? ' fw-full' : ''}${issue ? ' fw-invalid' : ''}`} onBlurCapture={() => setTouched(t => ({ ...t, [key]: true }))}>{control}{issue && <small role="alert">{issue}</small>}</div>
  }
  const go = next => {
    const issue = next > step ? validateFeeStructure(s, next - 1) : ''
    setAttempted(Boolean(issue))
    setError(issue && !Object.values(academicErrors).some(Boolean) ? issue : '')
    if (!issue) { setStep(next); setAttempted(false) }
    else setStep(Object.values(academicErrors).some(Boolean) ? 0 : validateFeeStructure(s, 1) ? 1 : 2)
  }
  const submit = status => {
    const issue = status === 'Draft' ? (!s.name.trim() ? 'Structure name is required.' : '') : validateFeeStructure(s)
    if (issue) {
      if (status === 'Draft') { setTouched(t => ({ ...t, name: true })); setStep(0); setError('') }
      else { setAttempted(true); setError(Object.values(academicErrors).some(Boolean) ? '' : issue); if (Object.values(academicErrors).some(Boolean)) setStep(0) }
      return
    }
    try { save(s, status) } catch (e) { setError(e.message) }
  }
  const descriptions = ['Define which students this fee structure applies to.', 'Configure the charges included in this fee structure.', 'Define when and how students can pay this fee.', 'Review academic applicability, amounts and payment schedules before submitting.']
  return <div className="fw-page">
    <div className="fw-page-heading">
      <PageHeader title={`${s.id ? 'Edit' : 'Create'} Fee Structure`} subtitle="Configure academic applicability, fee components and payment schedules."><Link className="fw-back-link" to="/fees/structures"><FiArrowLeft /> Back</Link></PageHeader>
    </div>
    <div className="college-form-layout fw-workspace">
      <section className="college-form-main fw-form-surface" aria-label={steps[step]}>
        <nav ref={tabsRef} className="ac-tabs erp-tabs-bar" aria-label="Fee structure steps" role="tablist">{steps.map((label, i) => <button key={label} id={`fw-tab-${i}`} role="tab" aria-selected={step === i} aria-controls="fw-step-panel" className={step === i ? 'active' : i < step ? 'completed' : ''} onClick={() => go(i)}><span>{i < step ? <FiCheck aria-label="Completed" /> : i + 1}</span>{label}</button>)}</nav>
        <header className="fw-card-header">
          <div><h2>{steps[step]}</h2><p>{descriptions[step]}</p></div>
          {step === 1 && <button onClick={() => setComponentForm({ masterId: '', amount: '', semesterId: '', mandatory: true, refundable: false, recurring: true, frequency: 'Yearly' })}><FiPlus /> Add Fee Component</button>}
        </header>
        <div key={step} id="fw-step-panel" className="preview-body-container fw-form-body" role="tabpanel" aria-labelledby={`fw-tab-${step}`} tabIndex={0}>
          {error && <p role="alert" className="fw-inline-error">{error}</p>}
          {step === 0 && <><div className="ac-grid">
            {field('name', <WizardInput label="Structure Name *" value={s.name} onChange={name => patch({ name })} maxLength={160} aria-invalid={Boolean((attempted || touched.name) && academicErrors.name)} />, true)}
            {field('academicYearId', <WizardSelect label="Academic Year *" value={s.academicYearId} options={masters.years} onChange={id => select('academicYearId', 'academicYearName', masters.years, id, { semesterId: '', semesterName: '' })} error={Boolean((attempted || touched.academicYearId) && academicErrors.academicYearId)} />)}
            {field('courseId', <WizardSelect label="Program / Course *" value={s.courseId} options={masters.courses} onChange={id => select('courseId', 'courseName', masters.courses, id, { branchId: '', branchName: '', semesterId: '', semesterName: '' })} error={Boolean((attempted || touched.courseId) && academicErrors.courseId)} />)}
            {field('branchId', <WizardSelect label="Branch *" value={s.branchId} options={branches} onChange={id => select('branchId', 'branchName', branches, id, { semesterId: '', semesterName: '' })} disabled={!s.courseId} error={Boolean((attempted || touched.branchId) && academicErrors.branchId)} />)}
            {field('batch', <WizardInput label="Batch *" list="fm-existing-batches" placeholder="Choose or enter an intake batch" value={s.batch} onChange={batch => patch({ batch })} maxLength={40} aria-invalid={Boolean((attempted || touched.batch) && academicErrors.batch)} />)}
            <WizardSelect label="Applicable To" value={s.applicableTo} options={['All Students', 'Selected Category']} onChange={applicableTo => patch({ applicableTo })} />
            <WizardSelect label="Fee Cycle" value={s.cycle} options={['Yearly', 'Semester-wise']} onChange={cycle => patch({ cycle, semesterId: '', semesterName: '' })} />
            {s.cycle === 'Semester-wise' && field('semesterId', <WizardSelect label="Semester *" value={s.semesterId} options={semesters} onChange={id => select('semesterId', 'semesterName', semesters, id)} error={Boolean((attempted || touched.semesterId) && academicErrors.semesterId)} />)}
            {s.applicableTo === 'Selected Category' && field('category', <WizardSelect label="Admission Category / Quota *" value={s.category} options={masters.categories} onChange={category => patch({ category })} error={Boolean((attempted || touched.category) && academicErrors.category)} />)}
          </div><datalist id="fm-existing-batches">{masters.batches.map(b => <option key={b} value={b} />)}</datalist></>}
          {step === 1 && <>
            <FeeTable rows={s.components} rowKey={c => c.masterId} empty="No components configured. Add an active fee component to begin." columns={[
              { label: 'Fee Component', key: 'name' }, { label: 'Category', key: 'category' }, { label: 'Frequency', key: 'frequency' },
              { label: 'Amount', render: c => <input aria-label={`${c.name} amount`} type="number" min="0.01" step="0.01" value={c.amount} onChange={e => updateComponent(c.masterId, { amount: e.target.value })} /> },
              { label: 'Mandatory', render: c => c.mandatory ? 'Yes' : 'No' },
              { label: 'Actions', render: c => <div className="fm-actions"><button aria-label={`Edit ${c.name}`} onClick={() => setComponentForm({ ...c, editing: true })}><FiEdit2 /></button><button aria-label={`Remove ${c.name}`} onClick={() => patch({ components: s.components.filter(r => r.masterId !== c.masterId) })}><FiTrash2 /></button></div> },
            ]} />
            <div className="fw-component-totals"><WizardInput label="Structure concession (₹)" type="number" min="0" step="0.01" value={s.discount} onChange={discount => patch({ discount })} /><dl><div><dt>Subtotal</dt><dd>{feeMoney(subtotal)}</dd></div><div><dt>Fee Total</dt><dd>{feeMoney(total)}</dd></div></dl></div>
          </>}
          {step === 2 && <>
            <div className="fw-payment-choice" aria-label="Payment plan">{[['Full Payment', 'Full Payment'], ['Installment Plan', 'Installments']].map(([plan, label]) => <button key={plan} aria-pressed={s.plan === plan} onClick={() => patch({ plan })}>{label}</button>)}</div>
            {s.plan === 'Full Payment' ? <div className="ac-grid"><WizardInput label="Due Date *" type="date" value={s.dueDate} onChange={dueDate => patch({ dueDate })} /></div> : <>
              <FeeTable rows={s.installments} empty="Add installments to configure the payment schedule." columns={[
                { label: 'Installment', render: i => s.installments.indexOf(i) + 1 },
                { label: 'Due Date', render: i => <input aria-label={`Installment ${s.installments.indexOf(i) + 1} due date`} type="date" value={i.dueDate} onChange={e => updateInstallment(i.id, { dueDate: e.target.value })} /> },
                { label: 'Amount', render: i => <input aria-label={`Installment ${s.installments.indexOf(i) + 1} amount`} type="number" min="0.01" step="0.01" value={i.amount} onChange={e => updateInstallment(i.id, { amount: e.target.value })} /> },
                { label: '%', render: i => `${total > 0 ? (Number(i.amount || 0) / total * 100).toFixed(2) : '0.00'}%` },
                { label: 'Actions', render: i => <button aria-label={`Remove installment ${s.installments.indexOf(i) + 1}`} onClick={() => patch({ installments: s.installments.filter(r => r.id !== i.id) })}><FiTrash2 /></button> },
              ]} />
              <button className="fw-add-installment" onClick={() => patch({ installments: [...s.installments, { id: uid('IN'), dueDate: '', amount: '' }] })}><FiPlus /> Add Installment</button>
              <dl className="fw-allocation"><div><dt>Allocated</dt><dd>{feeMoney(allocated / 100)}</dd></div><div><dt>Fee Total</dt><dd>{feeMoney(total)}</dd></div><div><dt>Remaining</dt><dd>{feeMoney(total - allocated / 100)}</dd></div></dl>
              {s.installments.length > 0 && allocated === cents(total) ? <p className="fw-balanced" role="status"><FiCheck /> Installments are balanced.</p> : (attempted || s.installments.some(i => i.amount !== '')) && <p className="fw-inline-error" role="status">Installments must total {feeMoney(total)}. Remaining: {feeMoney(total - allocated / 100)}.</p>}
            </>}
            <h3>Late Fee Rules</h3><div className="ac-grid"><WizardInput label="Grace Period (days)" type="number" min="0" max="365" step="1" value={s.grace} onChange={grace => patch({ grace })} /><WizardSelect label="Penalty Type" value={s.penaltyType} options={['None', 'Fixed Amount', 'Percentage']} onChange={penaltyType => patch({ penaltyType })} />{s.penaltyType !== 'None' && <><WizardInput label="Penalty Value" type="number" min="0" step="0.01" value={s.penaltyValue} onChange={penaltyValue => patch({ penaltyValue })} /><WizardInput label="Maximum Penalty (optional)" type="number" min="0" step="0.01" value={s.maximumPenalty} onChange={maximumPenalty => patch({ maximumPenalty })} /></>}</div>
            <p className="fm-muted">Penalty is calculated once against the overdue balance after grace, separately from the fee total.</p>
          </>}
          {step === 3 && <div className="fw-review">
            <section><header><h2>Academic Details</h2><button onClick={() => go(0)}>Edit</button></header><FeeReview value={s} section="overview" showTotals={false} /></section>
            <section><header><h2>Fee Components</h2><button onClick={() => go(1)}>Edit</button></header><FeeReview value={s} section="components" /></section>
            <section><header><h2>Payment Schedule</h2><button onClick={() => go(2)}>Edit</button></header><FeeReview value={s} section="schedule" showLateRules={false} /></section>
            <section><header><h2>Late Fee Rules</h2><button onClick={() => go(2)}>Edit</button></header><p>{s.grace} grace days · {s.penaltyType}{s.penaltyType !== 'None' && ` · ${s.penaltyValue}${s.penaltyType === 'Percentage' ? '%' : ' INR'}`}{s.maximumPenalty !== '' && ` · Maximum ${feeMoney(s.maximumPenalty)}`}</p></section>
            <p className="fm-muted">Submit for approval. Approve and publish from Fee Structures before assigning students.</p>
          </div>}
        </div>
        <footer className="ac-actions ac-next-actions fw-actions"><button className="ac-secondary" onClick={step ? () => go(step - 1) : close}>{step ? <><FiArrowLeft /> Previous</> : 'Cancel'}</button><div><button className="ac-secondary" onClick={() => submit('Draft')}>Save Draft</button>{step < 3 ? <button className="ac-primary" onClick={() => go(step + 1)}>{step === 2 ? 'Review' : 'Save & Next'} <FiArrowRight /></button> : <button className="ac-primary" onClick={() => submit('Pending Approval')}>Submit for Approval</button>}</div></footer>
      </section>
      <FeeStructurePreview value={s} masters={masters} attempted={attempted} />
    </div>
    {componentForm && <ComponentEditor value={componentForm} components={components.filter(c => (c.status === 'Active' || c.id === componentForm.masterId) && (c.id === componentForm.masterId || !s.components.some(r => r.masterId === c.id)))} semesters={semesters} close={() => setComponentForm(null)} save={component => { if (componentForm.editing) updateComponent(component.masterId, component); else patch({ components: [...s.components, component] }); setComponentForm(null) }} />}
  </div>
}
function feePreviewStatus(s, attempted) {
  if (s.status && s.status !== 'Draft') return s.status
  if (!validateFeeStructure(s)) return 'Ready for Review'
  return attempted ? 'Incomplete' : 'Draft'
}
function FeeStructurePreview({ value: s, masters, attempted }) {
  const subtotal = s.components.reduce((sum, c) => sum + cents(c.amount), 0) / 100
  const status = feePreviewStatus(s, attempted)
  const masterName = (rows, id, name) => rows.find(row => String(row.id) === String(id))?.name || name || '—'
  const dateLabel = value => {
    if (!value) return '—'
    const date = new Date(`${value}T00:00:00`)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  const lateFeeConfigured = Number(s.grace) > 0 || s.penaltyType !== 'None' || s.maximumPenalty !== ''
  return <aside className="college-live-preview fw-live-preview" aria-label="Live preview">
    <header className="preview-top-bar"><span className="preview-live-tag"><span className="live-dot" /> LIVE PREVIEW</span><span className="preview-sync-hint">Real-time sync</span></header>
    <div className="preview-body-container fw-preview-body" role="region" aria-label="Fee structure preview details" tabIndex={0}>
      <section aria-label="Structure"><h4>Structure</h4><h3>{s.name || 'Untitled Fee Structure'}</h3><p>{masterName(masters.years, s.academicYearId, s.academicYearName)}</p><FeeBadge value={s.status || 'Draft'} /></section>
      <section aria-label="Academic applicability"><h4>Academic Details</h4><dl className="fw-preview-details">
        <div><dt>Academic Year</dt><dd>{masterName(masters.years, s.academicYearId, s.academicYearName)}</dd></div>
        <div><dt>Program / Course</dt><dd>{masterName(masters.courses, s.courseId, s.courseName)}</dd></div>
        <div><dt>Branch</dt><dd>{masterName(masters.branches, s.branchId, s.branchName)}</dd></div>
        <div><dt>Batch</dt><dd>{s.batch || '—'}</dd></div>
        <div><dt>Applicable To</dt><dd>{s.applicableTo === 'Selected Category' ? s.category || '—' : s.applicableTo}</dd></div>
        {s.cycle === 'Semester-wise' && <div><dt>Semester</dt><dd>{masterName(masters.semesters, s.semesterId, s.semesterName)}</dd></div>}
        <div><dt>Fee Cycle</dt><dd>{s.cycle}</dd></div>
      </dl></section>
      <section aria-label="Configured fee components"><h4>Fee Components</h4><p className="fw-placeholder">{s.components.length} components configured</p>
        {s.components.map(c => <div key={c.masterId} className="fw-preview-component">
          <div className="fw-preview-row"><span>{c.name}</span><strong>{feeMoney(c.amount || 0)}</strong></div>
          <small>{[c.category, c.frequency, c.mandatory ? 'Mandatory' : 'Optional', c.refundable ? 'Refundable' : 'Non-refundable', c.recurring ? 'Recurring' : 'Non-recurring', c.semesterId && `Semester: ${masterName(masters.semesters, c.semesterId)}`].filter(Boolean).join(' · ')}</small>
        </div>)}
        <div className="fw-preview-row"><span>Base Fee</span><strong>{feeMoney(subtotal)}</strong></div>
      </section>
      <section aria-label="Concessions and adjustments"><h4>Concessions / Adjustments</h4>{Number(s.discount) > 0 ? <div className="fw-preview-row"><span>Structure concession</span><strong>{feeMoney(s.discount)}</strong></div> : <p className="fw-placeholder">No concessions configured</p>}</section>
      <section aria-label="Configured payment plan"><h4>Payment Plan</h4>{s.plan === 'Full Payment' ? <dl className="fw-preview-details"><div><dt>Payment Type</dt><dd>Full Payment</dd></div><div><dt>Due Date</dt><dd>{dateLabel(s.dueDate)}</dd></div></dl> : <>
        <p>{s.installments.length ? `${s.installments.length} Installments` : 'Installments · Not configured'}</p>
        {s.installments.map((i, n) => <div key={i.id} className="fw-preview-installment"><div className="fw-preview-row"><span>Installment {n + 1}</span><strong>{feeMoney(i.amount || 0)}</strong></div><small>{dateLabel(i.dueDate)}</small></div>)}
      </>}</section>
      <section aria-label="Configured late fee rules"><h4>Late Fee Rules</h4>{lateFeeConfigured ? <dl className="fw-preview-details"><div><dt>Grace Period</dt><dd>{s.grace || 0} days</dd></div><div><dt>Penalty Type</dt><dd>{s.penaltyType}</dd></div>{s.penaltyType !== 'None' && <div><dt>Penalty Value</dt><dd>{s.penaltyType === 'Percentage' ? `${s.penaltyValue || 0}%` : feeMoney(s.penaltyValue || 0)}</dd></div>}{s.maximumPenalty !== '' && <div><dt>Maximum Penalty</dt><dd>{feeMoney(s.maximumPenalty)}</dd></div>}</dl> : <p className="fw-placeholder">Not configured</p>}</section>
      <section aria-label="Fee summary"><h4>Summary</h4><div className="fw-preview-row"><span>Original Fee</span><strong>{feeMoney(subtotal)}</strong></div><div className="fw-preview-row"><span>Concession</span><strong>{feeMoney(s.discount || 0)}</strong></div><div className="fw-preview-total"><span>Net Payable</span><strong>{feeMoney(feeTotal(s))}</strong></div></section>
      <section aria-label="Configuration status"><h4>Status</h4><FeeBadge value={status} /><p className="fw-placeholder">{status === 'Ready for Review' ? 'Ready to review and submit for approval.' : 'Approval and publishing remain separate workflow steps.'}</p></section>
    </div>
  </aside>
}
function ComponentEditor({ value, components, semesters, close, save }) {
  const [form, setForm] = useState(value), [error, setError] = useState('')
  const select = masterId => { const c = components.find(c => c.id === masterId); setForm(f => ({ ...f, ...c, masterId, recurring: c.frequency !== 'One Time' })); setError('') }
  const submit = () => {
    if (!form.masterId || !Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0 || Number(form.amount) > 100000000 || Math.abs(Number(form.amount) * 100 - cents(form.amount)) >= 0.00001) { setError('Select a component and enter a positive amount with at most two decimal places.'); return }
    const { editing: _editing, ...component } = form
    save(component)
  }
  return <FeeDialog title={value.editing ? 'Edit Fee Component' : 'Add Fee Component'} close={close} footer={<><button onClick={close}>Cancel</button><button className="primary" onClick={submit}>{value.editing ? 'Update Component' : 'Add Component'}</button></>}><div className="fs-editor-body fw-component-editor">{error && <p className="fw-inline-error" role="alert">{error}</p>}<div className="fw-form-grid"><FeeSelect label="Fee Component *" value={form.masterId} options={components} disabled={value.editing} onChange={select} /><FeeInput label="Amount *" type="number" min="0.01" step="0.01" value={form.amount} onChange={amount => setForm(f => ({ ...f, amount }))} /><FeeSelect label="Frequency" value={form.frequency} options={['One Time', 'Yearly', 'Semester-wise', 'Monthly']} onChange={frequency => setForm(f => ({ ...f, frequency }))} /><FeeSelect label="Applicable Semester" value={form.semesterId} options={[{ id: '', name: 'All semesters' }, ...semesters]} onChange={semesterId => setForm(f => ({ ...f, semesterId }))} />{['mandatory', 'refundable', 'recurring'].map(key => <label className="fm-checks" key={key}><input type="checkbox" checked={Boolean(form[key])} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />{key[0].toUpperCase() + key.slice(1)}</label>)}</div></div></FeeDialog>
}
