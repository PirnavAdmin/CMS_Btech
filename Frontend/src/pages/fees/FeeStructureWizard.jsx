import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { FiAlertTriangle, FiArrowLeft, FiCheck, FiPlus, FiTrash2, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import SearchableSelect from '../../components/SearchableSelect'
import TablePagination from '../../components/TablePagination'
import EmptyState from '../../components/EmptyState'
import { academicFeeComponent, cents, checkDuplicateStructure, DEFAULT_FEE_HEADS, feeMoney, feeTotal, rupees, studentMatchesFee, uid, validateFeeStructure } from './feeStructureService'
import '../admin-management/AddCollege.css'
import './FeeStructure.css'

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
    {['all', 'components'].includes(section) && <FeeTable rows={s.components} rowKey={r => r.masterId} columns={[{ label: 'Fee Head', key: 'name' }, { label: 'Frequency', key: 'frequency' }, { label: 'Mandatory', render: r => r.mandatory ? 'Yes' : 'No' }, { label: 'Refundable', render: r => r.refundable ? 'Yes' : 'No' }, { label: 'Amount', align: 'right', render: r => feeMoney(r.amount) }]} />}
    {['all', 'schedule'].includes(section) && <><h3>Payment plan · {s.plan}</h3>{s.plan === 'Full Payment' ? <p>Due {s.dueDate || '—'}</p> : <FeeTable rows={s.installments} columns={[{ label: 'Installment', render: r => `Installment ${s.installments.indexOf(r) + 1}` }, { label: 'Due date', key: 'dueDate' }, { label: 'Amount', align: 'right', render: r => feeMoney(r.amount) }]} />}{showLateRules && <p className="fm-muted">Grace period: {s.grace || 0} days · Late fee: {s.penaltyType}{s.penaltyType !== 'None' && ` (${s.penaltyType === 'Percentage' ? `${s.penaltyValue}%` : feeMoney(s.penaltyValue)})`}{s.maximumPenalty !== '' && ` · Maximum ${feeMoney(s.maximumPenalty)}`}</p>}</>}
  </>
}

function academicFeeErrors(s) {
  return {
    name: !s.name?.trim() ? 'Structure name is required.' : '',
    academicYearId: !s.academicYearId ? 'Select an academic year.' : '',
    courseId: !s.courseId ? 'Select a program / course.' : '',
    branchId: !s.branchId ? 'Select a branch.' : '',
    batch: !s.batch?.trim() ? 'Batch is required.' : '',
    category: s.applicableTo === 'Selected Category' && !s.category ? 'Select a category / quota.' : '',
    semesterId: s.cycle === 'Semester-wise' && !s.semesterId ? 'Select a semester.' : '',
  }
}

export default function FeeStructureWizard({ value, masters, components = [], existingStructures = [], students = [], close, save }) {
  const [s, set] = useState(() => {
    const cloned = structuredClone(value)
    // If brand new structure without any components, prefill standard default fee heads
    if (!cloned.id && (!cloned.components || cloned.components.length === 0)) {
      cloned.components = [
        { masterId: 'fh-tuition', name: 'Tuition Fee', category: 'Academic', frequency: 'Yearly', mandatory: true, refundable: false, recurring: true, amount: '85000' },
        { masterId: 'fh-university', name: 'University Fee', category: 'University', frequency: 'Yearly', mandatory: true, refundable: false, recurring: true, amount: '5000' },
        { masterId: 'fh-lab', name: 'Laboratory Fee', category: 'Academic', frequency: 'Yearly', mandatory: true, refundable: false, recurring: true, amount: '6000' },
        { masterId: 'fh-library', name: 'Library Fee', category: 'Academic', frequency: 'Yearly', mandatory: true, refundable: false, recurring: true, amount: '2000' },
        { masterId: 'fh-exam', name: 'Examination Fee', category: 'Examination', frequency: 'Semester-wise', mandatory: true, refundable: false, recurring: true, amount: '3000' },
      ]
    }
    return cloned
  })

  const [error, setError] = useState('')
  const [touched, setTouched] = useState({})
  const [attempted, setAttempted] = useState(false)
  const [componentId, setComponentId] = useState('')

  const patch = change => { set(current => ({ ...current, ...change })); setError('') }
  const select = (key, nameKey, rows, id, reset = {}) => patch({ [key]: id, [nameKey]: rows.find(r => String(r.id) === String(id))?.name || '', ...reset })

  const branches = masters.branches.filter(b => !s.courseId || String(b.courseId) === String(s.courseId))
  const semesters = masters.semesters.filter(r => (!r.courseId || String(r.courseId) === String(s.courseId)) && (!r.branchId || String(r.branchId) === String(s.branchId)) && (!r.academicYearId || String(r.academicYearId) === String(s.academicYearId)))
  const batches = masters.batchScopes ? [...new Set(masters.batchScopes.filter(r => (!s.courseId || String(r.courseId) === String(s.courseId)) && (!s.branchId || String(r.branchId) === String(s.branchId)) && (!r.academicYearId || String(r.academicYearId) === String(s.academicYearId))).map(r => r.batch).filter(Boolean))] : masters.batches

  const total = feeTotal(s)
  const subtotal = s.components.reduce((sum, c) => sum + cents(c.amount), 0) / 100
  const mandatorySubtotal = s.components.filter(c => c.mandatory !== false).reduce((sum, c) => sum + cents(c.amount), 0) / 100
  const optionalSubtotal = s.components.filter(c => c.mandatory === false).reduce((sum, c) => sum + cents(c.amount), 0) / 100
  const allocated = s.installments.reduce((sum, i) => sum + cents(i.amount), 0)

  const mappedValue = {
    ...s,
    ...Object.fromEntries([['years', 'academicYear'], ['courses', 'course'], ['branches', 'branch'], ['semesters', 'semester']].map(([rows, key]) => [`${key}Name`, masters[rows].find(row => String(row.id) === String(s[`${key}Id`]))?.name || s[`${key}Name`] || '']))
  }

  // Combine state components and default heads
  const masterPool = useMemo(() => {
    const list = [...components]
    for (const head of DEFAULT_FEE_HEADS) {
      if (!list.some(c => c.id === head.id || c.name.toLowerCase() === head.name.toLowerCase())) {
        list.push(head)
      }
    }
    return list
  }, [components])

  const availableComponents = masterPool.filter(c => c.status === 'Active' && academicFeeComponent(c) && !s.components.some(row => row.masterId === c.id))

  const updateComponent = (id, change) => patch({ components: s.components.map(c => c.masterId === id ? { ...c, ...change } : c) })
  const addComponent = () => {
    const master = availableComponents.find(c => String(c.id) === String(componentId))
    if (!master) { setError('Select an active academic fee head.'); return }
    patch({
      components: [
        ...s.components,
        {
          masterId: master.id,
          name: master.name,
          category: master.category,
          frequency: master.frequency || (s.cycle === 'Semester-wise' ? 'Semester-wise' : 'Yearly'),
          mandatory: master.mandatory ?? true,
          refundable: master.refundable ?? false,
          recurring: master.recurring ?? true,
          amount: ''
        }
      ]
    })
    setComponentId('')
  }

  const updateCycle = cycle => patch({ cycle, semesterId: '', semesterName: '', components: s.components.map(c => c.masterId === 'structure-total-fee' ? { ...c, frequency: cycle } : c) })
  const updateInstallment = (id, change) => patch({ installments: s.installments.map(i => i.id === id ? { ...i, ...change } : i) })

  // Duplicate structure check
  const duplicateConflict = useMemo(() => {
    return checkDuplicateStructure(existingStructures, s)
  }, [existingStructures, s])

  // Calculated eligible students count
  const eligibleStudentsCount = useMemo(() => {
    if (!students || !students.length) return null
    return students.filter(student => studentMatchesFee(student, s)).length
  }, [students, s])

  const academicErrors = academicFeeErrors(s)
  const field = (key, control, wide = false) => {
    const issue = (attempted || touched[key]) && academicErrors[key]
    return <div className={`fw-field${wide ? ' fw-full' : ''}${issue ? ' fw-invalid' : ''}`} onBlurCapture={() => setTouched(t => ({ ...t, [key]: true }))}>{control}{issue && <small role="alert">{issue}</small>}</div>
  }

  const submit = status => {
    setAttempted(true)
    const issue = status === 'Draft' ? (s.name.trim() ? '' : 'Structure name is required to save a draft.') : validateFeeStructure(s)
    if (issue) {
      if (status === 'Draft') setTouched(t => ({ ...t, name: true }))
      setError(issue)
      return
    }
    try {
      save(mappedValue, status)
    } catch (e) {
      setError(e.message)
    }
  }

  // Quick helper: split installments evenly
  const splitInstallments = count => {
    const centsTotal = cents(total)
    const base = Math.floor(centsTotal / count)
    const rem = centsTotal % count
    const today = new Date()
    const newInstallments = Array.from({ length: count }, (_, idx) => {
      const d = new Date(today)
      d.setMonth(d.getMonth() + (idx * (12 / count)))
      const dateStr = d.toISOString().slice(0, 10)
      const share = rupees(base + (idx < rem ? 1 : 0))
      return { id: uid('IN'), dueDate: dateStr, amount: String(share) }
    })
    patch({ installments: newInstallments })
  }

  return (
    <div className="fw-page">
      <div className="fw-page-heading">
        <PageHeader title={`${s.id ? 'Edit' : 'Create'} Academic Fee Structure`} subtitle="Configure academic applicability, charges and payment schedules in one professional workspace.">
          <button type="button" className="fw-back-link" onClick={close}><FiArrowLeft /> Back to Fee Structures</button>
        </PageHeader>
      </div>

      <div className="college-form-layout fw-workspace">
        {/* LEFT PANEL: SINGLE EDITABLE CONFIGURATION CARD WITH THREE SECTIONS */}
        <section className="college-form-main fw-form-surface" aria-label="Academic fee structure configuration">
          <header className="fw-card-header">
            <div>
              <h2>Academic Fee Structure Configuration</h2>
              <p>Configure basic details, individual fee heads, and payment schedule on this screen.</p>
            </div>
            {s.id && <FeeBadge value={s.status} />}
          </header>

          <div className="fw-form-scrollable preview-body-container fw-form-body" tabIndex={0} role="region" aria-label="Structure configuration fields">
            {error && <p role="alert" className="fw-inline-error">{error}</p>}

            {/* DUPLICATE VALIDATION WARNING */}
            {duplicateConflict && (
              <div className="fw-duplicate-banner" role="alert">
                <FiAlertTriangle className="fw-warn-icon" aria-hidden="true" />
                <div>
                  <strong>Overlapping Fee Structure Warning</strong>
                  <p>An existing fee structure <b>"{duplicateConflict.name}"</b> ({duplicateConflict.status}) already matches this Academic Year, Course, Branch, Batch and Cycle. Review before saving.</p>
                </div>
              </div>
            )}

            {/* SECTION 1: BASIC DETAILS */}
            <div className="fw-form-section" id="section-basic-details">
              <div className="fw-section-header">
                <span className="fw-section-number">1</span>
                <div>
                  <h3>Basic Details</h3>
                  <p>Structure identification and academic applicability.</p>
                </div>
              </div>

              <div className="ac-grid">
                {field('name', <WizardInput label="Structure Name *" placeholder="e.g. B.Tech CSE Regular Fee 2026-27" value={s.name} onChange={name => patch({ name })} maxLength={160} aria-invalid={Boolean((attempted || touched.name) && academicErrors.name)} />, true)}
                {field('academicYearId', <WizardSelect label="Academic Year *" value={s.academicYearId} options={masters.years} onChange={id => select('academicYearId', 'academicYearName', masters.years, id, { semesterId: '', semesterName: '' })} error={Boolean((attempted || touched.academicYearId) && academicErrors.academicYearId)} />)}
                {field('courseId', <WizardSelect label="Course / Program *" value={s.courseId} options={masters.courses} onChange={id => select('courseId', 'courseName', masters.courses, id, { branchId: '', branchName: '', batch: '', semesterId: '', semesterName: '' })} error={Boolean((attempted || touched.courseId) && academicErrors.courseId)} />)}
                {field('branchId', <WizardSelect label="Branch *" value={s.branchId} options={branches} onChange={id => select('branchId', 'branchName', branches, id, { batch: '', semesterId: '', semesterName: '' })} disabled={!s.courseId} error={Boolean((attempted || touched.branchId) && academicErrors.branchId)} />)}
                {field('batch', <WizardInput label="Batch *" list="fm-existing-batches" placeholder="e.g. 2026-30" value={s.batch} onChange={batch => patch({ batch })} maxLength={40} aria-invalid={Boolean((attempted || touched.batch) && academicErrors.batch)} />)}
                <WizardSelect
                  label="Admission Category / Quota"
                  value={s.applicableTo === 'Selected Category' ? s.category : 'All Students'}
                  options={['All Students', ...masters.categories.filter(c => c && c !== 'All Students')]}
                  onChange={category => {
                    if (category === 'All Students') patch({ applicableTo: 'All Students', category: '' })
                    else patch({ applicableTo: 'Selected Category', category })
                  }}
                />
                <WizardSelect label="Fee Cycle" value={s.cycle} options={['Yearly', 'Semester-wise']} onChange={updateCycle} />
                {s.cycle === 'Semester-wise' && field('semesterId', <WizardSelect label="Semester *" value={s.semesterId} options={semesters} onChange={id => select('semesterId', 'semesterName', semesters, id)} error={Boolean((attempted || touched.semesterId) && academicErrors.semesterId)} />)}
                <WizardInput label="Effective From" type="date" value={s.effectiveFrom || ''} onChange={effectiveFrom => patch({ effectiveFrom })} />
              </div>
              <datalist id="fm-existing-batches">{batches.map(b => <option key={b} value={b} />)}</datalist>
            </div>

            {/* SECTION 2: FEE HEADS */}
            <div className="fw-form-section" id="section-fee-heads">
              <div className="fw-section-header">
                <span className="fw-section-number">2</span>
                <div>
                  <h3>Fee Heads</h3>
                  <p>Individual charges that form the total fee structure. Updates live.</p>
                </div>
                <Link to="/fees/components" className="fw-master-link" title="Open master fee heads directory">Fee Head Master →</Link>
              </div>

              <div className="fw-add-head-bar">
                <WizardSelect label="Add Configured Fee Head" value={componentId} options={availableComponents} onChange={setComponentId} />
                <button type="button" className="ac-secondary fw-add-head-btn" onClick={addComponent} disabled={!componentId}><FiPlus /> Add Fee Head</button>
              </div>

              <FeeTable
                rows={s.components}
                rowKey={c => c.masterId}
                empty="No fee heads added yet. Select an existing fee head above to add."
                columns={[
                  { label: 'Fee Head', render: c => <span className="fw-head-name">{c.name}</span> },
                  { label: 'Frequency', key: 'frequency' },
                  { label: 'Amount (₹)', render: c => <input aria-label={`${c.name} amount`} type="number" min="0.01" step="0.01" placeholder="₹ Amount" value={c.amount} onChange={e => updateComponent(c.masterId, { amount: e.target.value })} /> },
                  { label: 'Mandatory', render: c => <input aria-label={`${c.name} mandatory`} type="checkbox" checked={c.mandatory !== false} disabled={c.masterId === 'structure-total-fee'} onChange={e => updateComponent(c.masterId, { mandatory: e.target.checked })} /> },
                  { label: 'Action', render: c => <button type="button" aria-label={`Remove ${c.name}`} className="fm-remove-action" onClick={() => patch({ components: s.components.filter(row => row.masterId !== c.masterId) })}><FiTrash2 /></button> },
                ]}
              />

              <div className="fw-heads-total-row">
                <span>Total Fee Heads Sum:</span>
                <strong>{feeMoney(subtotal)}</strong>
              </div>

              <div className="fw-concession-row ac-grid" style={{ marginTop: '12px' }}>
                <WizardInput label="Structure Concession / Waiver (₹, optional)" type="number" min="0" step="0.01" placeholder="0.00" value={s.discount} onChange={discount => patch({ discount })} />
                <div className="fw-net-total-card">
                  <span>Net Structure Fee:</span>
                  <strong>{feeMoney(total)}</strong>
                </div>
              </div>
            </div>

            {/* SECTION 3: PAYMENT SCHEDULE */}
            <div className="fw-form-section" id="section-payment-schedule">
              <div className="fw-section-header">
                <span className="fw-section-number">3</span>
                <div>
                  <h3>Payment Schedule</h3>
                  <p>Choose full payment or configure installment amounts and due dates.</p>
                </div>
              </div>

              <div className="fw-payment-choice" aria-label="Payment plan choice">
                {[['Full Payment', 'Full Payment'], ['Installment Plan', 'Installments']].map(([plan, label]) => (
                  <button key={plan} type="button" aria-pressed={s.plan === plan} onClick={() => patch({ plan })}>{label}</button>
                ))}
              </div>

              {s.plan === 'Full Payment' ? (
                <div className="ac-grid">
                  <WizardInput label="Payment Due Date *" type="date" value={s.dueDate} onChange={dueDate => patch({ dueDate })} />
                  <div className="ac-field">
                    <span>Due Amount</span>
                    <input type="text" readOnly value={feeMoney(total)} aria-label="Full payment due amount" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="fw-installment-controls">
                    <button type="button" className="fw-add-installment ac-secondary" onClick={() => patch({ installments: [...s.installments, { id: uid('IN'), dueDate: '', amount: '' }] })}><FiPlus /> Add Installment</button>
                    {total > 0 && (
                      <div className="fw-split-helpers">
                        <span>Quick Split:</span>
                        <button type="button" onClick={() => splitInstallments(2)}>2 Installments (50/50)</button>
                        <button type="button" onClick={() => splitInstallments(4)}>4 Installments (Quarterly)</button>
                      </div>
                    )}
                  </div>

                  <FeeTable
                    rows={s.installments}
                    empty="Add installments to configure the payment schedule."
                    columns={[
                      { label: 'Installment', render: i => `Installment ${s.installments.indexOf(i) + 1}` },
                      { label: 'Due Date *', render: i => <input aria-label={`Installment ${s.installments.indexOf(i) + 1} due date`} type="date" value={i.dueDate} onChange={e => updateInstallment(i.id, { dueDate: e.target.value })} /> },
                      { label: 'Amount (₹) *', render: i => <input aria-label={`Installment ${s.installments.indexOf(i) + 1} amount`} type="number" min="0.01" step="0.01" placeholder="₹ Amount" value={i.amount} onChange={e => updateInstallment(i.id, { amount: e.target.value })} /> },
                      { label: '% of Total', render: i => `${total > 0 ? (Number(i.amount || 0) / total * 100).toFixed(2) : '0.00'}%` },
                      { label: 'Action', render: i => <button type="button" aria-label={`Remove installment ${s.installments.indexOf(i) + 1}`} className="fm-remove-action" onClick={() => patch({ installments: s.installments.filter(r => r.id !== i.id) })}><FiTrash2 /></button> },
                    ]}
                  />

                  <dl className="fw-allocation">
                    <div><dt>Allocated</dt><dd>{feeMoney(allocated / 100)}</dd></div>
                    <div><dt>Total Fee</dt><dd>{feeMoney(total)}</dd></div>
                    <div><dt>Remaining</dt><dd>{feeMoney(total - allocated / 100)}</dd></div>
                  </dl>

                  {s.installments.length > 0 && allocated === cents(total) ? (
                    <p className="fw-balanced" role="status"><FiCheck /> Installments are balanced with structure total.</p>
                  ) : (attempted || s.installments.some(i => i.amount !== '')) && (
                    <p className="fw-inline-error" role="status">Installments must equal {feeMoney(total)}. Remaining: {feeMoney(total - allocated / 100)}.</p>
                  )}
                </>
              )}

              <h4 style={{ margin: '16px 0 8px', fontSize: '13px', fontWeight: 650 }}>Late Fee / Grace Period Rules</h4>
              <div className="ac-grid">
                <WizardInput label="Grace Period (days)" type="number" min="0" max="365" step="1" value={s.grace} onChange={grace => patch({ grace })} />
                <WizardSelect label="Penalty Type" value={s.penaltyType} options={['None', 'Fixed Amount', 'Percentage']} onChange={penaltyType => patch({ penaltyType })} />
                {s.penaltyType !== 'None' && (
                  <>
                    <WizardInput label="Penalty Value *" type="number" min="0" step="0.01" value={s.penaltyValue} onChange={penaltyValue => patch({ penaltyValue })} />
                    <WizardInput label="Maximum Penalty (optional)" type="number" min="0" step="0.01" value={s.maximumPenalty} onChange={maximumPenalty => patch({ maximumPenalty })} />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* FIXED ACTION FOOTER */}
          <footer className="ac-actions ac-next-actions fw-actions">
            <button type="button" className="ac-secondary" onClick={close}>Cancel</button>
            <div>
              <button type="button" className="ac-secondary" onClick={() => submit('Draft')}>Save Draft</button>
              <button type="button" className="ac-primary" onClick={() => submit('Pending Approval')}>Submit for Approval</button>
            </div>
          </footer>
        </section>

        {/* RIGHT PANEL: PERSISTENT LIVE STRUCTURE SUMMARY */}
        <FeeStructurePreview
          value={s}
          masters={masters}
          attempted={attempted}
          duplicateConflict={duplicateConflict}
          eligibleCount={eligibleStudentsCount}
          baseFee={mandatorySubtotal}
          optionalFee={optionalSubtotal}
          total={total}
        />
      </div>
    </div>
  )
}

function feePreviewStatus(s, attempted) {
  if (s.status && s.status !== 'Draft') return s.status
  if (!validateFeeStructure(s)) return 'Ready for Review'
  return attempted ? 'Incomplete' : 'Draft'
}

function FeeStructurePreview({ value: s, masters, attempted, duplicateConflict, eligibleCount, baseFee, optionalFee, total }) {
  const status = feePreviewStatus(s, attempted)
  const masterName = (rows, id, name) => rows.find(row => String(row.id) === String(id))?.name || name || '—'
  const dateLabel = value => {
    if (!value) return '—'
    const date = new Date(`${value}T00:00:00`)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  const lateFeeConfigured = Number(s.grace) > 0 || s.penaltyType !== 'None' || s.maximumPenalty !== ''

  const resolvedTotal = total ?? feeTotal(s)
  const subtotal = s.components.reduce((sum, c) => sum + cents(c.amount), 0) / 100
  const resolvedBase = baseFee ?? (s.components.filter(c => c.mandatory !== false).reduce((sum, c) => sum + cents(c.amount), 0) / 100)
  const resolvedOptional = optionalFee ?? (s.components.filter(c => c.mandatory === false).reduce((sum, c) => sum + cents(c.amount), 0) / 100)

  return (
    <aside className="college-live-preview fw-live-preview" aria-label="Live Structure Summary">
      <header className="preview-top-bar">
        <span className="preview-live-tag"><span className="live-dot" /> LIVE STRUCTURE SUMMARY</span>
        <span className="preview-sync-hint">Real-time sync</span>
      </header>
      <div className="preview-body-container fw-preview-body" role="region" aria-label="Fee structure preview details" tabIndex={0}>
        {/* ACADEMIC FEE STRUCTURE */}
        <section className="preview-section-group" aria-label="Academic Fee Structure">
          <div className="preview-section-title">Academic Fee Structure</div>
          <h3 className="fw-preview-title">{s.name || 'Untitled Fee Structure'}</h3>
          <p className="fw-preview-subtitle">{masterName(masters.years, s.academicYearId, s.academicYearName) || 'Academic year unselected'}</p>
          <div className="fw-preview-badges">
            <FeeBadge value={s.status || 'Draft'} />
            {duplicateConflict && <span className="fs-badge fm-badge overdue">Overlap Warning</span>}
          </div>
        </section>

        {/* APPLICABILITY */}
        <section className="preview-section-group" aria-label="Fee Applicability">
          <div className="preview-section-title">Applicability</div>
          <dl className="fw-preview-details">
            <div><dt>Academic Year</dt><dd>{masterName(masters.years, s.academicYearId, s.academicYearName)}</dd></div>
            <div><dt>Course / Program</dt><dd>{masterName(masters.courses, s.courseId, s.courseName)}</dd></div>
            <div><dt>Branch</dt><dd>{masterName(masters.branches, s.branchId, s.branchName)}</dd></div>
            <div><dt>Batch</dt><dd>{s.batch || '—'}</dd></div>
            <div><dt>Category / Quota</dt><dd>{s.applicableTo === 'Selected Category' ? (s.category || '—') : 'All Students'}</dd></div>
            <div><dt>Fee Cycle</dt><dd>{s.cycle || 'Yearly'}</dd></div>
            {s.cycle === 'Semester-wise' && <div><dt>Semester</dt><dd>{masterName(masters.semesters, s.semesterId, s.semesterName)}</dd></div>}
            {s.effectiveFrom && <div><dt>Effective From</dt><dd>{dateLabel(s.effectiveFrom)}</dd></div>}
          </dl>
        </section>

        {/* FEE SUMMARY */}
        <section className="preview-section-group" aria-label="Fee Summary">
          <div className="preview-section-title">Fee Summary</div>
          <div className="fw-preview-row"><span>Base / Mandatory Fee</span><strong>{feeMoney(resolvedBase)}</strong></div>
          {resolvedOptional > 0 && <div className="fw-preview-row"><span>Optional Charges</span><strong>{feeMoney(resolvedOptional)}</strong></div>}
          {Number(s.discount) > 0 && <div className="fw-preview-row"><span>Structure Concession</span><strong>-{feeMoney(s.discount)}</strong></div>}
          <div className="fw-preview-total"><span>Total Fee</span><strong>{feeMoney(resolvedTotal)}</strong></div>

          {s.components.length > 0 && (
            <div className="fw-preview-heads-list">
              {s.components.map(c => (
                <div key={c.masterId} className="fw-preview-head-item">
                  <span>{c.name} {c.mandatory === false ? '(Optional)' : ''}</span>
                  <strong>{feeMoney(c.amount || 0)}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* PAYMENT */}
        <section className="preview-section-group" aria-label="Payment Schedule">
          <div className="preview-section-title">Payment</div>
          <dl className="fw-preview-details">
            <div><dt>Payment Type</dt><dd>{s.plan === 'Full Payment' ? 'Full Payment' : 'Installments'}</dd></div>
            <div><dt>Installments</dt><dd>{s.plan === 'Full Payment' ? '1 (Full)' : `${s.installments.length} Installments`}</dd></div>
            <div><dt>Next Due Date</dt><dd>{dateLabel(s.plan === 'Full Payment' ? s.dueDate : s.installments[0]?.dueDate)}</dd></div>
            {lateFeeConfigured && <div><dt>Grace / Penalty</dt><dd>{s.grace || 0}d · {s.penaltyType}</dd></div>}
          </dl>
        </section>

        {/* ELIGIBILITY */}
        <section className="preview-section-group" aria-label="Student Eligibility">
          <div className="preview-section-title">Eligibility</div>
          <div className="fw-preview-row">
            <span>Eligible Students</span>
            <strong className="fw-eligibility-count">{eligibleCount !== null ? `${eligibleCount} Students` : 'Scope not configured'}</strong>
          </div>
          <p className="fw-preview-hint">
            {eligibleCount !== null ? 'Calculated from live matching student records.' : 'Fill course, branch and batch to calculate.'}
          </p>
        </section>

        {/* STATUS */}
        <section className="preview-section-group" aria-label="Workflow Status">
          <div className="preview-section-title">Status</div>
          <div className="fw-preview-row">
            <span>Readiness</span>
            <FeeBadge value={status} />
          </div>
          <p className="fw-preview-hint">
            {status === 'Ready for Review' ? 'All required details entered. Ready to submit for approval.' : 'Draft configuration in progress.'}
          </p>
        </section>
      </div>
    </aside>
  )
}
