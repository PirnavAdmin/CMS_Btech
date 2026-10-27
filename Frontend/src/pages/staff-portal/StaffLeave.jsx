import { useMemo, useState } from 'react';
import { FiPlus, FiX, FiSearch, FiPaperclip, FiAlertTriangle } from 'react-icons/fi';
import './staff-leave.css';

// ---------- static sample data (frontend only) ----------
const TODAY = '2026-10-27';
const HOLIDAYS = ['2026-11-11'];               // add more ISO dates here
const WEEKLY_OFF = [0, 6];                      // 0 = Sunday, 6 = Saturday (single source of truth)
const TOTALS = { Casual: 12, Sick: 10, Earned: 15 };

const INITIAL_REQUESTS = [
  { id: 1, type: 'Casual', applied: '2026-10-15', from: '2026-10-19', to: '2026-10-19', days: 1, reason: 'Family function', status: 'Approved', remarks: 'Approved by HOD' },
  { id: 2, type: 'Casual', applied: '2026-10-01', from: '2026-10-05', to: '2026-10-05', days: 1, reason: 'Personal work', status: 'Rejected', remarks: 'Lab inspection scheduled that day' },
  { id: 3, type: 'Sick', applied: '2026-10-12', from: '2026-10-12', to: '2026-10-12', days: 1, reason: 'Fever', status: 'Cancelled', remarks: 'Cancelled by staff' },
  { id: 4, type: 'Casual', applied: '2026-10-25', from: '2026-11-02', to: '2026-11-02', days: 1, reason: 'Bank work', status: 'Pending', remarks: '' },
  { id: 5, type: 'Sick', applied: '2026-09-13', from: '2026-09-14', to: '2026-09-15', days: 2, reason: 'Viral fever', status: 'Approved', remarks: 'Get well soon' },
  { id: 6, type: 'Casual', applied: '2026-08-30', from: '2026-09-04', to: '2026-09-04', days: 1, reason: 'Travel', status: 'Approved', remarks: '' },
  { id: 7, type: 'Casual', applied: '2026-08-05', from: '2026-08-10', to: '2026-08-12', days: 3, reason: 'Sister wedding', status: 'Approved', remarks: 'Approved by HOD' },
  { id: 8, type: 'Sick', applied: '2026-07-05', from: '2026-07-06', to: '2026-07-08', days: 3, reason: 'Dental surgery', status: 'Approved', remarks: 'Certificate attached' },
  { id: 9, type: 'Earned', applied: '2026-03-20', from: '2026-04-06', to: '2026-04-10', days: 5, reason: 'Annual vacation', status: 'Approved', remarks: '' },
  { id: 10, type: 'Earned', applied: '2026-01-20', from: '2026-02-02', to: '2026-02-06', days: 5, reason: 'Home visit', status: 'Approved', remarks: '' },
  { id: 11, type: 'Earned', applied: '2026-03-01', from: '2026-03-09', to: '2026-03-10', days: 2, reason: 'Personal', status: 'Approved', remarks: '' },
  { id: 12, type: 'Casual', applied: '2025-12-10', from: '2025-12-22', to: '2025-12-22', days: 1, reason: 'Personal', status: 'Approved', remarks: '' },
];

// ---------- helpers ----------
const d = (iso) => new Date(`${iso}T12:00:00`);
const fmt = (iso) => d(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const isOff = (date) => WEEKLY_OFF.includes(date.getDay()) || HOLIDAYS.includes(date.toISOString().slice(0, 10));

function countDays(from, to, half) {
  if (!from || !to || d(to) < d(from)) return 0;
  let n = 0;
  for (let c = d(from); c <= d(to); c.setDate(c.getDate() + 1)) {
    const iso = `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}-${String(c.getDate()).padStart(2, '0')}`;
    if (!WEEKLY_OFF.includes(c.getDay()) && !HOLIDAYS.includes(iso)) n += 1;
  }
  return half && from === to && n === 1 ? 0.5 : n;
}

const EMPTY_FORM = { type: 'Casual', from: '', to: '', half: false, reason: '', file: '' };

export default function StaffLeave() {
  const [view, setView] = useState('normal'); // normal | loading | empty | error
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [fStatus, setFStatus] = useState('All');
  const [fYear, setFYear] = useState('2026');
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null);
  const [cancelId, setCancelId] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  // balances computed from the requests
  const balances = useMemo(() => Object.keys(TOTALS).map((type) => {
    const sum = (s) => requests.filter((r) => r.type === type && r.status === s && r.from.startsWith('2026')).reduce((a, r) => a + r.days, 0);
    const used = sum('Approved'); const pending = sum('Pending');
    return { type, total: TOTALS[type], used, pending, left: TOTALS[type] - used - pending };
  }), [requests]);

  const days = countDays(form.from, form.to, form.half);

  const visible = requests
    .filter((r) => (view === 'empty' ? false : true))
    .filter((r) => fStatus === 'All' || r.status === fStatus)
    .filter((r) => r.from.startsWith(fYear))
    .filter((r) => r.reason.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.applied.localeCompare(a.applied));

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function validate() {
    const e = {};
    const bal = balances.find((b) => b.type === form.type);
    if (!form.from) e.from = 'Select a start date';
    if (!form.to) e.to = 'Select an end date';
    if (form.from && form.to && d(form.to) < d(form.from)) e.to = 'End date cannot be before start date';
    if (!e.from && !e.to && days === 0) e.to = 'Selected dates are weekly off or holidays';
    if (!e.to && days > bal.left) e.to = `Only ${bal.left} day(s) of ${form.type} leave left`;
    if (!e.from && !e.to && requests.some((r) => ['Pending', 'Approved'].includes(r.status) && form.from <= r.to && form.to >= r.from))
      e.from = 'Overlaps an existing pending or approved request';
    if (form.reason.trim().length < 5) e.reason = 'Enter a reason (at least 5 characters)';
    if (form.type === 'Sick' && days > 2 && !form.file) e.file = 'Medical certificate required for sick leave over 2 days';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setRequests((rs) => [{ id: Date.now(), type: form.type, applied: TODAY, from: form.from, to: form.to, days, reason: form.reason.trim(), status: 'Pending', remarks: '' }, ...rs]);
    setShowForm(false); setForm(EMPTY_FORM); setErrors({});
    showToast('Leave request submitted (Pending)');
  }

  function confirmCancel() {
    setRequests((rs) => rs.map((r) => (r.id === cancelId ? { ...r, status: 'Cancelled', remarks: 'Cancelled by staff' } : r)));
    setCancelId(null); showToast('Leave request cancelled');
  }

  const steps = (r) => {
    const final = r.status === 'Pending' ? 'Decision pending' : r.status;
    return [
      { label: 'Applied', note: fmt(r.applied), done: true },
      { label: 'Under review', note: 'Reporting officer', done: r.status !== 'Cancelled' },
      { label: final, note: r.remarks || '', done: r.status !== 'Pending' },
    ];
  };

  return (
    <div className="sl-root">
      <div className="sl-head">
        <div>
          <p className="sl-eyebrow">DIGITAL CAMPUS / NON-TEACHING STAFF</p>
          <h1>Leave Management</h1>
          <p className="sl-sub">Check your leave balance, apply for leave and track your requests.</p>
        </div>
        <div className="sl-states" role="group" aria-label="Preview state">
          <span>PREVIEW STATE:</span>
          {['normal', 'loading', 'empty', 'error'].map((s) => (
            <button key={s} className={view === s ? 'on' : ''} onClick={() => setView(s)}>{s[0].toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
      </div>

      {view === 'error' && (
        <div className="sl-error" role="alert">
          <FiAlertTriangle /> Unable to load leave data.
          <button onClick={() => setView('normal')}>Retry</button>
        </div>
      )}

      {view === 'loading' && (
        <>
          <div className="sl-grid">{[1, 2, 3].map((i) => <div key={i} className="sl-card sl-skel" style={{ height: 120 }} />)}</div>
          <div className="sl-card sl-skel" style={{ height: 300, marginTop: 16 }} />
        </>
      )}

      {(view === 'normal' || view === 'empty') && (
        <>
          <div className="sl-grid">
            {balances.map((b) => (
              <div className="sl-card" key={b.type}>
                <div className="sl-bal-top"><strong>{b.type} Leave</strong><span className="sl-left">{b.left} left</span></div>
                <div className="sl-bar" aria-hidden="true">
                  <i className="used" style={{ width: `${(b.used / b.total) * 100}%` }} />
                  <i className="pend" style={{ width: `${(b.pending / b.total) * 100}%` }} />
                </div>
                <p className="sl-muted">Used {b.used} · Pending {b.pending} · Total {b.total}</p>
              </div>
            ))}
          </div>

          <div className="sl-card" style={{ marginTop: 16 }}>
            <div className="sl-toolbar">
              <h2>Leave history</h2>
              <div className="sl-filters">
                <label className="sl-search"><FiSearch aria-hidden="true" />
                  <input placeholder="Search reason" aria-label="Search reason" value={q} onChange={(e) => setQ(e.target.value)} />
                </label>
                <select aria-label="Status" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                  {['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
                </select>
                <select aria-label="Year" value={fYear} onChange={(e) => setFYear(e.target.value)}>
                  <option>2026</option><option>2025</option>
                </select>
                <button className="sl-primary" onClick={() => setShowForm(true)}><FiPlus /> Apply Leave</button>
              </div>
            </div>

            {visible.length === 0 ? (
              <p className="sl-empty">No leave requests found.</p>
            ) : (
              <div className="sl-table-wrap">
                <table className="sl-table">
                  <thead><tr><th>Applied</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Remarks</th><th /></tr></thead>
                  <tbody>
                    {visible.map((r) => (
                      <tr key={r.id} onClick={() => setDetail(r)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setDetail(r)}>
                        <td>{fmt(r.applied)}</td><td>{r.type}</td><td>{fmt(r.from)}</td><td>{fmt(r.to)}</td><td>{r.days}</td>
                        <td><span className={`sl-chip ${r.status.toLowerCase()}`}>{r.status}</span></td>
                        <td className="sl-muted">{r.remarks || '-'}</td>
                        <td>{r.status === 'Pending' && <button className="sl-link" onClick={(e) => { e.stopPropagation(); setCancelId(r.id); }}>Cancel</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showForm && (
        <div className="sl-overlay" onClick={() => setShowForm(false)}>
          <form className="sl-dialog" role="dialog" aria-modal="true" aria-label="Apply leave" onClick={(e) => e.stopPropagation()} onSubmit={submit} noValidate>
            <div className="sl-dlg-head"><h2>Apply Leave</h2><button type="button" aria-label="Close" onClick={() => setShowForm(false)}><FiX /></button></div>
            <label>Leave type
              <select value={form.type} onChange={(e) => set('type', e.target.value)}>{Object.keys(TOTALS).map((t) => <option key={t}>{t}</option>)}</select>
            </label>
            <div className="sl-two">
              <label>From<input type="date" value={form.from} onChange={(e) => set('from', e.target.value)} />{errors.from && <em>{errors.from}</em>}</label>
              <label>To<input type="date" value={form.to} min={form.from} onChange={(e) => set('to', e.target.value)} />{errors.to && <em>{errors.to}</em>}</label>
            </div>
            <label className="sl-check"><input type="checkbox" checked={form.half} onChange={(e) => set('half', e.target.checked)} /> Half day (only when From and To are the same day)</label>
            <p className="sl-days">Number of days: <strong>{days}</strong> <span className="sl-muted">(weekly offs and holidays skipped)</span></p>
            <label>Reason<textarea rows="3" value={form.reason} onChange={(e) => set('reason', e.target.value)} />{errors.reason && <em>{errors.reason}</em>}</label>
            <label>Attachment (optional)
              <span className="sl-file"><FiPaperclip /> {form.file || 'Choose file'}
                <input type="file" onChange={(e) => set('file', e.target.files[0]?.name || '')} />
              </span>
              {errors.file && <em>{errors.file}</em>}
            </label>
            <div className="sl-actions">
              <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="sl-primary">Submit request</button>
            </div>
          </form>
        </div>
      )}

      {detail && (
        <div className="sl-overlay" onClick={() => setDetail(null)}>
          <div className="sl-dialog" role="dialog" aria-modal="true" aria-label="Leave details" onClick={(e) => e.stopPropagation()}>
            <div className="sl-dlg-head"><h2>{detail.type} leave · {detail.days} day(s)</h2><button aria-label="Close" onClick={() => setDetail(null)}><FiX /></button></div>
            <p>{fmt(detail.from)} to {fmt(detail.to)}</p>
            <p className="sl-muted">Reason: {detail.reason}</p>
            <ol className="sl-timeline">
              {steps(detail).map((s) => (
                <li key={s.label} className={s.done ? 'done' : ''}><strong>{s.label}</strong><span className="sl-muted">{s.note}</span></li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {cancelId && (
        <div className="sl-overlay" onClick={() => setCancelId(null)}>
          <div className="sl-dialog sl-small" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Cancel this request?</h2>
            <p className="sl-muted">The days will be returned to your balance.</p>
            <div className="sl-actions">
              <button onClick={() => setCancelId(null)}>Keep request</button>
              <button className="sl-danger" onClick={confirmCancel}>Yes, cancel</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="sl-toast" role="status">{toast}</div>}
    </div>
  );
}