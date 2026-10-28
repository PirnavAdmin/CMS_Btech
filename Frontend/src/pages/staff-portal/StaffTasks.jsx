import { useMemo, useState } from 'react';
import { FiSearch, FiX, FiCheckCircle, FiClock, FiUser } from 'react-icons/fi';
import './staff-tasks.css';

// ---------- static sample data (frontend only) ----------
const TODAY = '2026-10-27';
const INITIAL_TASKS = [
  { id: 1, title: 'Prepare reagents for Sem 3 practical', desc: 'Prepare 0.1 M NaOH and HCl solutions for 40 students before the 10:45 AM batch.', by: 'Dr. K. V. Raman', assigned: '2026-10-24', due: '2026-10-28', priority: 'High', status: 'In Progress' },
  { id: 2, title: 'Update chemical inventory register', desc: 'Record current stock of acids and bases and flag items below minimum level.', by: 'Mr. S. Prasad', assigned: '2026-10-22', due: '2026-10-27', priority: 'High', status: 'Pending' },
  { id: 3, title: 'Calibrate weighing balances', desc: 'Calibrate the three analytical balances in Chem Lab 102 and log the readings.', by: 'Dr. Meera Nair', assigned: '2026-10-23', due: '2026-10-30', priority: 'Normal', status: 'Pending' },
  { id: 4, title: 'Organise lab safety kits', desc: 'Check first-aid and spill kits in all labs and list missing items.', by: 'Safety Officer', assigned: '2026-10-26', due: '2026-11-03', priority: 'Normal', status: 'Pending' },
  { id: 5, title: 'Clean and store glassware', desc: 'Wash and store glassware used in last week practicals.', by: 'Mr. S. Prasad', assigned: '2026-10-19', due: '2026-10-21', priority: 'Normal', status: 'Completed', completedOn: '2026-10-21' },
  { id: 6, title: 'Submit lab consumables request', desc: 'Prepare and submit the monthly consumables request to the HOD.', by: 'Dr. K. V. Raman', assigned: '2026-10-12', due: '2026-10-15', priority: 'High', status: 'Completed', completedOn: '2026-10-14' },
  { id: 7, title: 'Label new chemical containers', desc: 'Label containers received in the latest stock delivery.', by: 'Dr. A. Rao', assigned: '2026-10-05', due: '2026-10-08', priority: 'Normal', status: 'Completed', completedOn: '2026-10-07' },
];

const fmt = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

function dueInfo(t) {
  if (t.status === 'Completed') return { text: `Completed on ${fmt(t.completedOn)}`, cls: 'done' };
  if (t.due < TODAY) return { text: `Overdue since ${fmt(t.due)}`, cls: 'late' };
  if (t.due === TODAY) return { text: 'Due today', cls: 'today' };
  return { text: `Due ${fmt(t.due)}`, cls: '' };
}

export default function StaffTasks() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [tab, setTab] = useState('All');
  const [fPriority, setFPriority] = useState('All');
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const open = tasks.filter((t) => t.status !== 'Completed');
  const stats = {
    pending: open.length,
    high: open.filter((t) => t.priority === 'High').length,
    due: open.filter((t) => t.due <= TODAY).length,
    done: tasks.length - open.length,
  };

  const visible = useMemo(() => tasks
    .filter((t) => tab === 'All' || t.status === tab)
    .filter((t) => fPriority === 'All' || t.priority === fPriority)
    .filter((t) => `${t.title} ${t.by}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.status === 'Completed') - (b.status === 'Completed') || a.due.localeCompare(b.due)),
  [tasks, tab, fPriority, q]);

  const update = (id, patch, msg) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setDetail((d) => (d && d.id === id ? { ...d, ...patch } : d));
    showToast(msg);
  };
  const start = (id) => update(id, { status: 'In Progress' }, 'Task started');
  const complete = (id) => update(id, { status: 'Completed', completedOn: TODAY }, 'Task marked as completed');

  return (
    <div className="tk-root">
      <div className="tk-head">
        <div>
          <p className="tk-eyebrow">DIGITAL CAMPUS / NON-TEACHING STAFF</p>
          <h1>My Tasks</h1>
          <p className="tk-sub">Work assigned to you by your HOD and in-charge. Start tasks and mark them completed.</p>
        </div>
      </div>

      <div className="tk-stats">
            <div className="tk-card"><span>Pending tasks</span><strong>{stats.pending}</strong></div>
            <div className="tk-card"><span>High priority</span><strong className="hi">{stats.high}</strong></div>
            <div className="tk-card"><span>Due today or overdue</span><strong>{stats.due}</strong></div>
            <div className="tk-card"><span>Completed</span><strong className="ok">{stats.done}</strong></div>
          </div>

          <div className="tk-toolbar">
            <div className="tk-tabs" role="tablist">
              {['All', 'Pending', 'In Progress', 'Completed'].map((s) => (
                <button key={s} role="tab" aria-selected={tab === s} className={tab === s ? 'on' : ''} onClick={() => setTab(s)}>{s}</button>
              ))}
            </div>
            <div className="tk-filters">
              <label className="tk-search"><FiSearch aria-hidden="true" />
                <input placeholder="Search task or assigned by" aria-label="Search tasks" value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
              <select aria-label="Priority" value={fPriority} onChange={(e) => setFPriority(e.target.value)}>
                {['All', 'High', 'Normal'].map((p) => <option key={p} value={p}>{p === 'All' ? 'All priorities' : `${p} priority`}</option>)}
              </select>
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="tk-empty">No tasks match your filters.</p>
          ) : (
            <ul className="tk-list">
              {visible.map((t) => {
                const info = dueInfo(t);
                return (
                  <li key={t.id} className={`tk-item ${t.status === 'Completed' ? 'is-done' : ''}`}>
                    <button className="tk-main" onClick={() => setDetail(t)}>
                      <b>{t.title}</b>
                      <span className="tk-meta"><FiUser aria-hidden="true" /> {t.by}</span>
                      <span className={`tk-due ${info.cls}`}><FiClock aria-hidden="true" /> {info.text}</span>
                    </button>
                    <div className="tk-side">
                      <span className={`tk-chip pr-${t.priority.toLowerCase()}`}>{t.priority}</span>
                      <span className={`tk-chip st-${t.status.replace(' ', '').toLowerCase()}`}>{t.status}</span>
                      {t.status === 'Pending' && <button className="tk-btn" onClick={() => start(t.id)}>Start</button>}
                      {t.status !== 'Completed' && <button className="tk-btn tk-primary" onClick={() => complete(t.id)}><FiCheckCircle /> Mark as completed</button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
      {detail && (
        <div className="tk-overlay" onClick={() => setDetail(null)}>
          <div className="tk-dialog" role="dialog" aria-modal="true" aria-label="Task details" onClick={(e) => e.stopPropagation()}>
            <div className="tk-dlg-head"><h2>{detail.title}</h2><button aria-label="Close" onClick={() => setDetail(null)}><FiX /></button></div>
            <p>{detail.desc}</p>
            <dl className="tk-dl">
              <dt>Assigned by</dt><dd>{detail.by}</dd>
              <dt>Assigned on</dt><dd>{fmt(detail.assigned)}</dd>
              <dt>Due date</dt><dd>{fmt(detail.due)}</dd>
              <dt>Priority</dt><dd>{detail.priority}</dd>
              <dt>Status</dt><dd>{detail.status}{detail.completedOn ? ` (${fmt(detail.completedOn)})` : ''}</dd>
            </dl>
            <div className="tk-actions">
              <button onClick={() => setDetail(null)}>Close</button>
              {detail.status === 'Pending' && <button onClick={() => start(detail.id)}>Start</button>}
              {detail.status !== 'Completed' && <button className="tk-primary" onClick={() => complete(detail.id)}>Mark as completed</button>}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="tk-toast" role="status">{toast}</div>}
    </div>
  );
}
