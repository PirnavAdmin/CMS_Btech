import { useMemo, useState } from 'react';
import { FiSearch, FiX, FiClock, FiMapPin, FiUser, FiAlertTriangle } from 'react-icons/fi';
import './staff-meetings.css';

// ---------- static sample data (frontend only) ----------
const TODAY = '2026-10-27';
const INITIAL_ITEMS = [
  { id: 1, title: 'Lab staff coordination meeting', type: 'Meeting', date: '2026-10-28', start: '11:00', end: '12:00', venue: 'HOD Cabin, Chemistry', organizer: 'Dr. K. V. Raman', mandatory: false, status: 'Invited',
    agenda: ['Weekly lab schedule', 'Reagent stock status', 'Safety audit preparation'] },
  { id: 2, title: 'Lab safety audit briefing', type: 'Meeting', date: '2026-10-29', start: '15:00', end: '15:45', venue: 'Chem Lab 102', organizer: 'Safety Officer', mandatory: true, status: 'Accepted',
    agenda: ['Audit checklist walk-through', 'Register and log review', 'Assignment of responsibilities'] },
  { id: 3, title: 'First aid and fire safety training', type: 'Training', date: '2026-11-05', start: '10:00', end: '15:00', venue: 'Seminar Hall', organizer: 'HR Department', mandatory: true, status: 'Invited',
    agenda: ['First aid basics', 'Fire extinguisher demonstration', 'Evacuation drill'] },
  { id: 4, title: 'Annual Day planning meeting', type: 'Event', date: '2026-11-12', start: '14:00', end: '15:00', venue: 'Conference Room', organizer: 'Student Affairs', mandatory: false, status: 'Invited',
    agenda: ['Volunteer roles', 'Stage and hall arrangements', 'Budget overview'] },
  { id: 5, title: 'Non-teaching staff welfare meeting', type: 'Meeting', date: '2026-11-20', start: '11:30', end: '12:30', venue: 'Admin Block, Room 3', organizer: 'Principal Office', mandatory: false, status: 'Invited',
    agenda: ['Leave policy updates', 'Shift timing feedback', 'Open discussion'] },
  { id: 6, title: 'Monthly staff meeting', type: 'Meeting', date: '2026-10-20', start: '10:00', end: '11:00', venue: 'Conference Room', organizer: 'Principal Office', mandatory: true, status: 'Attended',
    agenda: ['October review', 'Upcoming examinations', 'Announcements'] },
  { id: 7, title: 'Fire drill and evacuation practice', type: 'Training', date: '2026-10-08', start: '11:00', end: '12:00', venue: 'Main Ground', organizer: 'Safety Cell', mandatory: true, status: 'Attended',
    agenda: ['Alarm response', 'Assembly point check'] },
  { id: 8, title: "Teachers' Day celebration", type: 'Event', date: '2026-09-05', start: '16:00', end: '17:30', venue: 'Auditorium', organizer: 'Student Affairs', mandatory: false, status: 'Missed',
    agenda: ['Cultural programme', 'Felicitation'] },
];

const pad = (n) => String(n).padStart(2, '0');
const parse = (iso) => new Date(`${iso}T12:00:00`);
const t12 = (h) => { const [a, b] = h.split(':').map(Number); return `${a % 12 || 12}:${pad(b)} ${a < 12 ? 'AM' : 'PM'}`; };
const dayNum = (iso) => parse(iso).getDate();
const mon = (iso) => parse(iso).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
const longDate = (iso) => parse(iso).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
const addDays = (iso, n) => { const x = parse(iso); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };

export default function StaffMeetings() {
  const [view, setView] = useState('normal'); // normal | loading | empty | error
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [tab, setTab] = useState('Upcoming');
  const [type, setType] = useState('All');
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };
  const isUpcoming = (m) => m.date >= TODAY;

  const upcoming = items.filter(isUpcoming);
  const stats = {
    upcoming: upcoming.length,
    week: upcoming.filter((m) => m.date <= addDays(TODAY, 7)).length,
    response: upcoming.filter((m) => m.status === 'Invited').length,
  };

  const visible = useMemo(() => (view === 'empty' ? [] : items)
    .filter((m) => (tab === 'Upcoming' ? isUpcoming(m) : !isUpcoming(m)))
    .filter((m) => type === 'All' || m.type === type)
    .filter((m) => `${m.title} ${m.venue} ${m.organizer}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (tab === 'Upcoming' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date))),
  [items, tab, type, q, view]);

  const respond = (id, status) => {
    setItems((ms) => ms.map((m) => (m.id === id ? { ...m, status } : m)));
    setDetail((d) => (d && d.id === id ? { ...d, status } : d));
    showToast(status === 'Accepted' ? 'You accepted the invitation' : 'You declined the invitation');
  };

  const actions = (m) => isUpcoming(m) && (
    <>
      {m.status !== 'Accepted' && <button className="me-btn me-primary" onClick={(e) => { e.stopPropagation(); respond(m.id, 'Accepted'); }}>Accept</button>}
      {m.status !== 'Declined' && (
        <button className="me-btn" disabled={m.mandatory} title={m.mandatory ? 'Mandatory: cannot be declined' : ''}
          onClick={(e) => { e.stopPropagation(); respond(m.id, 'Declined'); }}>Decline</button>
      )}
    </>
  );

  return (
    <div className="me-root">
      <div className="me-head">
        <div>
          <p className="me-eyebrow">DIGITAL CAMPUS / NON-TEACHING STAFF</p>
          <h1>Meetings and Events</h1>
          <p className="me-sub">Meetings, trainings and events you are invited to.</p>
        </div>
        <div className="me-states" role="group" aria-label="Preview state">
          <span>PREVIEW STATE:</span>
          {['normal', 'loading', 'empty', 'error'].map((s) => (
            <button key={s} className={view === s ? 'on' : ''} onClick={() => setView(s)}>{s[0].toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
      </div>

      {view === 'error' && (
        <div className="me-error" role="alert"><FiAlertTriangle /> Unable to load meetings and events.<button onClick={() => setView('normal')}>Retry</button></div>
      )}

      {view === 'loading' && (
        <>
          <div className="me-stats">{[1, 2, 3].map((i) => <div key={i} className="me-card me-skel" style={{ height: 80 }} />)}</div>
          {[1, 2, 3].map((i) => <div key={i} className="me-card me-skel" style={{ height: 96, marginTop: 12 }} />)}
        </>
      )}

      {(view === 'normal' || view === 'empty') && (
        <>
          <div className="me-stats">
            <div className="me-card"><span>Upcoming</span><strong>{view === 'empty' ? 0 : stats.upcoming}</strong></div>
            <div className="me-card"><span>Next 7 days</span><strong>{view === 'empty' ? 0 : stats.week}</strong></div>
            <div className="me-card"><span>Needs your response</span><strong className="wa">{view === 'empty' ? 0 : stats.response}</strong></div>
          </div>

          <div className="me-toolbar">
            <div className="me-tabs" role="tablist">
              {['Upcoming', 'Past'].map((s) => (
                <button key={s} role="tab" aria-selected={tab === s} className={tab === s ? 'on' : ''} onClick={() => setTab(s)}>{s}</button>
              ))}
            </div>
            <div className="me-filters">
              <label className="me-search"><FiSearch aria-hidden="true" />
                <input placeholder="Search title, venue or organizer" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
              <select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}>
                {['All', 'Meeting', 'Training', 'Event'].map((t) => <option key={t} value={t}>{t === 'All' ? 'All types' : t}</option>)}
              </select>
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="me-empty">{view === 'empty' ? 'No meetings or events yet.' : `No ${tab.toLowerCase()} items match your filters.`}</p>
          ) : (
            <ul className="me-list">
              {visible.map((m) => (
                <li key={m.id} className="me-item">
                  <button className="me-main" onClick={() => setDetail(m)}>
                    <div className="me-date"><b>{dayNum(m.date)}</b><span>{mon(m.date)}</span></div>
                    <div className="me-info">
                      <div className="me-top"><b>{m.title}</b><span className={`me-chip ty-${m.type.toLowerCase()}`}>{m.type}</span>{m.mandatory && <span className="me-chip mand">Mandatory</span>}</div>
                      <span><FiClock aria-hidden="true" /> {t12(m.start)} – {t12(m.end)}</span>
                      <span><FiMapPin aria-hidden="true" /> {m.venue}</span>
                      <span><FiUser aria-hidden="true" /> {m.organizer}</span>
                    </div>
                  </button>
                  <div className="me-side">
                    <span className={`me-chip st-${m.status.toLowerCase()}`}>{m.status}</span>
                    {actions(m)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {detail && (
        <div className="me-overlay" onClick={() => setDetail(null)}>
          <div className="me-dialog" role="dialog" aria-modal="true" aria-label="Meeting details" onClick={(e) => e.stopPropagation()}>
            <div className="me-dlg-head"><h2>{detail.title}</h2><button aria-label="Close" onClick={() => setDetail(null)}><FiX /></button></div>
            <div className="me-top"><span className={`me-chip ty-${detail.type.toLowerCase()}`}>{detail.type}</span>{detail.mandatory && <span className="me-chip mand">Mandatory</span>}<span className={`me-chip st-${detail.status.toLowerCase()}`}>{detail.status}</span></div>
            <p className="me-line"><FiClock aria-hidden="true" /> {longDate(detail.date)}, {t12(detail.start)} – {t12(detail.end)}</p>
            <p className="me-line"><FiMapPin aria-hidden="true" /> {detail.venue}</p>
            <p className="me-line"><FiUser aria-hidden="true" /> Organizer: {detail.organizer}</p>
            <h3>Agenda</h3>
            <ol className="me-agenda">{detail.agenda.map((a) => <li key={a}>{a}</li>)}</ol>
            <div className="me-actions"><button className="me-btn" onClick={() => setDetail(null)}>Close</button>{actions(detail)}</div>
          </div>
        </div>
      )}

      {toast && <div className="me-toast" role="status">{toast}</div>}
    </div>
  );
}