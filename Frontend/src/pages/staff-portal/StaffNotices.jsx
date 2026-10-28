import { useMemo, useState } from 'react';
import { FiSearch, FiX, FiPaperclip, FiAlertTriangle, FiBookmark, FiCheck } from 'react-icons/fi';
import './staff-notices.css';

// ---------- static sample data (frontend only) ----------
const INITIAL_NOTICES = [
  { id: 1, title: 'Diwali holidays and college reopening', dept: 'Administration', date: '2026-10-26', category: 'Holiday', priority: 'High', pinned: true, read: false,
    summary: 'College will remain closed for Diwali. Classes resume on 11 November.',
    body: 'All staff are informed that the college will remain closed from 7 November to 10 November for Diwali. Regular classes and lab duties resume on 11 November. Staff on essential duty must inform their in-charge before 5 November.', file: 'Diwali_Holiday_Circular.pdf' },
  { id: 2, title: 'Lab safety audit on 30 October', dept: 'Safety Cell', date: '2026-10-25', category: 'Safety', priority: 'High', pinned: false, read: false,
    summary: 'All lab staff must keep safety registers and equipment logs ready.',
    body: 'A safety audit of all Chemistry and Physics labs will be held on 30 October from 10:00 AM. Lab staff must keep safety registers, equipment logs and first-aid kits ready for inspection.', file: '' },
  { id: 3, title: 'Mid-semester exam duty chart released', dept: 'Examination Cell', date: '2026-10-24', category: 'Exam', priority: 'Normal', pinned: false, read: false,
    summary: 'Non-teaching staff duty chart for the mid-semester examinations is available.',
    body: 'The invigilation and hall support duty chart for the mid-semester examinations has been released. Staff should check their assigned halls and report 30 minutes before the exam begins.', file: 'Midsem_Duty_Chart.pdf' },
  { id: 4, title: 'Biometric attendance maintenance', dept: 'IT Department', date: '2026-10-22', category: 'Administrative', priority: 'Normal', pinned: false, read: true,
    summary: 'Biometric machines will be offline on 29 October from 2 PM to 4 PM.',
    body: 'The biometric attendance system will be under maintenance on 29 October from 2:00 PM to 4:00 PM. Please record your attendance manually in the register during this time.', file: '' },
  { id: 5, title: 'Staff training: first aid and fire safety', dept: 'HR Department', date: '2026-10-20', category: 'Event', priority: 'Info', pinned: false, read: true,
    summary: 'One-day training for all non-teaching staff on 5 November.',
    body: 'A one-day first aid and fire safety training is scheduled for 5 November at the Seminar Hall, 10:00 AM to 3:00 PM. Attendance is mandatory for all non-teaching staff.', file: '' },
  { id: 6, title: 'Revised working hours for lab staff', dept: 'Administration', date: '2026-10-15', category: 'Administrative', priority: 'Normal', pinned: false, read: true,
    summary: 'Morning shift hours are 08:30 AM to 04:30 PM from 1 November.',
    body: 'From 1 November, the morning shift for lab staff will run from 08:30 AM to 04:30 PM, with a lunch break from 01:00 PM to 01:45 PM.', file: 'Shift_Timings.pdf' },
  { id: 7, title: 'ID card renewal for non-teaching staff', dept: 'HR Department', date: '2026-10-10', category: 'Administrative', priority: 'Info', pinned: false, read: true,
    summary: 'Submit photographs to the HR office by 20 October.',
    body: 'Staff whose ID cards expire this year should submit two passport-size photographs to the HR office. Renewed cards will be issued within one week.', file: '' },
  { id: 8, title: 'Annual day volunteers needed', dept: 'Student Affairs', date: '2026-09-28', category: 'Event', priority: 'Info', pinned: false, read: true,
    summary: 'Staff interested in helping with Annual Day arrangements can register.',
    body: 'Staff who wish to volunteer for Annual Day arrangements may register with the Student Affairs office before 5 October.', file: '' },
];

const CATEGORIES = ['All', 'Academic', 'Administrative', 'Exam', 'Holiday', 'Safety', 'Event'];
const fmt = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default function StaffNotices() {
  const [view, setView] = useState('normal'); // normal | loading | empty | error
  const [notices, setNotices] = useState(INITIAL_NOTICES);
  const [tab, setTab] = useState('All');
  const [category, setCategory] = useState('All');
  const [priority, setPriority] = useState('All');
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const stats = {
    total: notices.length,
    unread: notices.filter((n) => !n.read).length,
    high: notices.filter((n) => n.priority === 'High').length,
  };

  const visible = useMemo(() => (view === 'empty' ? [] : notices)
    .filter((n) => tab === 'All' || !n.read)
    .filter((n) => category === 'All' || n.category === category)
    .filter((n) => priority === 'All' || n.priority === priority)
    .filter((n) => `${n.title} ${n.dept} ${n.summary}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date)),
  [notices, tab, category, priority, q, view]);

  const openNotice = (n) => {
    setNotices((ns) => ns.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setDetail({ ...n, read: true });
  };
  const markAll = () => { setNotices((ns) => ns.map((x) => ({ ...x, read: true }))); showToast('All notices marked as read'); };

  return (
    <div className="nt-root">
      <div className="nt-head">
        <div>
          <p className="nt-eyebrow">DIGITAL CAMPUS / NON-TEACHING STAFF</p>
          <h1>Notices</h1>
          <p className="nt-sub">College announcements and circulars for staff.</p>
        </div>
        <div className="nt-states" role="group" aria-label="Preview state">
          <span>PREVIEW STATE:</span>
          {['normal', 'loading', 'empty', 'error'].map((s) => (
            <button key={s} className={view === s ? 'on' : ''} onClick={() => setView(s)}>{s[0].toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
      </div>

      {view === 'error' && (
        <div className="nt-error" role="alert"><FiAlertTriangle /> Unable to load notices.<button onClick={() => setView('normal')}>Retry</button></div>
      )}

      {view === 'loading' && (
        <>
          <div className="nt-stats">{[1, 2, 3].map((i) => <div key={i} className="nt-card nt-skel" style={{ height: 80 }} />)}</div>
          {[1, 2, 3, 4].map((i) => <div key={i} className="nt-card nt-skel" style={{ height: 92, marginTop: 12 }} />)}
        </>
      )}

      {(view === 'normal' || view === 'empty') && (
        <>
          <div className="nt-stats">
            <div className="nt-card"><span>Total notices</span><strong>{view === 'empty' ? 0 : stats.total}</strong></div>
            <div className="nt-card"><span>Unread</span><strong className="un">{view === 'empty' ? 0 : stats.unread}</strong></div>
            <div className="nt-card"><span>High priority</span><strong className="hi">{view === 'empty' ? 0 : stats.high}</strong></div>
          </div>

          <div className="nt-toolbar">
            <div className="nt-tabs" role="tablist">
              {['All', 'Unread'].map((s) => (
                <button key={s} role="tab" aria-selected={tab === s} className={tab === s ? 'on' : ''} onClick={() => setTab(s)}>{s}</button>
              ))}
              <button className="nt-link" onClick={markAll} disabled={stats.unread === 0}><FiCheck /> Mark all as read</button>
            </div>
            <div className="nt-filters">
              <label className="nt-search"><FiSearch aria-hidden="true" />
                <input placeholder="Search notices" aria-label="Search notices" value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
              <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c === 'All' ? 'All categories' : c}</option>)}
              </select>
              <select aria-label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                {['All', 'High', 'Normal', 'Info'].map((p) => <option key={p} value={p}>{p === 'All' ? 'All priorities' : p}</option>)}
              </select>
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="nt-empty">{view === 'empty' ? 'No notices have been published yet.' : 'No notices match your filters.'}</p>
          ) : (
            <ul className="nt-list">
              {visible.map((n) => (
                <li key={n.id}>
                  <button className={`nt-item ${n.read ? '' : 'unread'}`} onClick={() => openNotice(n)}>
                    <div className="nt-top">
                      {n.pinned && <FiBookmark className="nt-pin" aria-label="Pinned" />}
                      <b>{n.title}</b>
                      <span className={`nt-chip pr-${n.priority.toLowerCase()}`}>{n.priority}</span>
                    </div>
                    <p>{n.summary}</p>
                    <div className="nt-meta">
                      <span>{n.dept}</span><span>{n.category}</span><span>{fmt(n.date)}</span>
                      {n.file && <span><FiPaperclip aria-hidden="true" /> Attachment</span>}
                      {!n.read && <em>New</em>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {detail && (
        <div className="nt-overlay" onClick={() => setDetail(null)}>
          <div className="nt-dialog" role="dialog" aria-modal="true" aria-label="Notice details" onClick={(e) => e.stopPropagation()}>
            <div className="nt-dlg-head"><h2>{detail.title}</h2><button aria-label="Close" onClick={() => setDetail(null)}><FiX /></button></div>
            <div className="nt-meta">
              <span className={`nt-chip pr-${detail.priority.toLowerCase()}`}>{detail.priority}</span>
              <span>{detail.dept}</span><span>{detail.category}</span><span>{fmt(detail.date)}</span>
            </div>
            <p className="nt-body">{detail.body}</p>
            {detail.file && (
              <button className="nt-file" onClick={() => showToast('Download is a demo only')}><FiPaperclip /> {detail.file}</button>
            )}
            <div className="nt-actions"><button onClick={() => setDetail(null)}>Close</button></div>
          </div>
        </div>
      )}

      {toast && <div className="nt-toast" role="status">{toast}</div>}
    </div>
  );
}