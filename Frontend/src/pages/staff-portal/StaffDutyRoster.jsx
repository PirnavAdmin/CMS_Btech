import { useMemo, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiX, FiMapPin, FiUser, FiGrid, FiList } from 'react-icons/fi';
import './staff-duty-roster.css';

// ---------- static sample data (frontend only) ----------
const TODAY = '2026-10-27';
const WEEKLY_OFF = [0, 6];                              // same rule as Attendance and Leave
const HOLIDAYS = { '2026-11-11': 'Public holiday' };
const LEAVES = { '2026-10-19': 'Approved', '2026-11-02': 'Pending' };
const SHIFT = 'Morning shift · 08:30 AM – 04:30 PM';

// duties repeat by weekday (1 = Monday ... 5 = Friday)
const TEMPLATE = {
  1: [
    { title: 'Lab setup and chemical check', start: '08:30', end: '10:30', location: 'Chem Lab 102', incharge: 'Dr. K. V. Raman' },
    { title: 'Practical session assistance', start: '10:45', end: '12:45', location: 'Chem Lab 102', incharge: 'Dr. Meera Nair' },
    { title: 'Equipment inventory', start: '14:00', end: '16:00', location: 'Store Room', incharge: 'Mr. S. Prasad' },
  ],
  2: [
    { title: 'Lab setup and chemical check', start: '08:30', end: '10:30', location: 'Chem Lab 102', incharge: 'Dr. K. V. Raman' },
    { title: 'Practical session assistance', start: '10:45', end: '12:45', location: 'Chem Lab 104', incharge: 'Dr. Meera Nair' },
    { title: 'Glassware cleaning and storage', start: '14:00', end: '16:00', location: 'Chem Lab 102', incharge: 'Mr. S. Prasad' },
  ],
  3: [
    { title: 'Reagent preparation', start: '08:30', end: '10:30', location: 'Prep Room', incharge: 'Dr. K. V. Raman' },
    { title: 'Practical session assistance', start: '10:45', end: '12:45', location: 'Chem Lab 101', incharge: 'Dr. A. Rao' },
    { title: 'Lab safety audit', start: '14:00', end: '16:00', location: 'All Chemistry Labs', incharge: 'Safety Officer' },
  ],
  4: [
    { title: 'Lab setup and chemical check', start: '08:30', end: '10:30', location: 'Chem Lab 102', incharge: 'Dr. K. V. Raman' },
    { title: 'Practical session assistance', start: '10:45', end: '12:45', location: 'Chem Lab 102', incharge: 'Dr. Meera Nair' },
    { title: 'Waste disposal logging', start: '14:00', end: '15:30', location: 'Waste Store', incharge: 'Mr. S. Prasad' },
  ],
  5: [
    { title: 'Reagent preparation', start: '08:30', end: '10:30', location: 'Prep Room', incharge: 'Dr. K. V. Raman' },
    { title: 'Practical session assistance', start: '10:45', end: '12:45', location: 'Chem Lab 103', incharge: 'Dr. A. Rao' },
    { title: 'Weekly cleaning and lock-up', start: '14:00', end: '16:00', location: 'Chem Lab 102', incharge: 'Mr. S. Prasad' },
  ],
};

// ---------- helpers ----------
const pad = (n) => String(n).padStart(2, '0');
const toIso = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
const parse = (iso) => new Date(`${iso}T12:00:00`);
const addDays = (iso, n) => { const x = parse(iso); x.setDate(x.getDate() + n); return toIso(x); };
const mondayOf = (iso) => addDays(iso, -((parse(iso).getDay() + 6) % 7));
const t12 = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`; };
const range = (s, e) => `${t12(s)} – ${t12(e)}`;
const mins = (s, e) => { const [a, b] = s.split(':').map(Number); const [c, d] = e.split(':').map(Number); return c * 60 + d - (a * 60 + b); };
const shortDate = (iso) => parse(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const weekday = (iso) => parse(iso).toLocaleDateString('en-GB', { weekday: 'short' });

function dayInfo(iso) {
  if (LEAVES[iso]) return { kind: 'leave', label: LEAVES[iso] === 'Approved' ? 'On leave' : 'Leave requested (pending)' };
  if (HOLIDAYS[iso]) return { kind: 'holiday', label: HOLIDAYS[iso] };
  if (WEEKLY_OFF.includes(parse(iso).getDay())) return { kind: 'off', label: 'Weekly off' };
  return { kind: 'work', label: '' };
}

function dutiesFor(iso) {
  if (dayInfo(iso).kind !== 'work') return [];
  return TEMPLATE[parse(iso).getDay()].map((d, i) => ({
    ...d, id: `${iso}-${i}`, date: iso,
    status: iso < TODAY ? 'Completed' : iso > TODAY ? 'Upcoming' : i < 2 ? 'Completed' : 'In Progress',
  }));
}

export default function StaffDutyRoster() {
  const [layout, setLayout] = useState('grid'); // grid | list
  const [weekStart, setWeekStart] = useState(mondayOf(TODAY));
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(weekStart, i);
    return { iso, info: dayInfo(iso), duties: dutiesFor(iso) };
  }), [weekStart]);

  const all = days.flatMap((x) => x.duties);
  const hours = (all.reduce((a, x) => a + mins(x.start, x.end), 0) / 60).toFixed(1);
  const offDays = days.filter((x) => x.info.kind !== 'work').length;
  const weekLabel = `${shortDate(weekStart)} – ${shortDate(addDays(weekStart, 6))} ${parse(addDays(weekStart, 6)).getFullYear()}`;
  const isThisWeek = weekStart === mondayOf(TODAY);

  return (
    <div className="dr-root">
      <div className="dr-head">
        <div>
          <p className="dr-eyebrow">DIGITAL CAMPUS / NON-TEACHING STAFF</p>
          <h1>Duty Roster</h1>
          <p className="dr-sub">See your weekly shifts and assigned duties. {SHIFT}</p>
        </div>
      </div>

      <div className="dr-toolbar">
        <div className="dr-week">
          <button aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}><FiChevronLeft /></button>
          <strong>{weekLabel}</strong>
          <button aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))}><FiChevronRight /></button>
          {!isThisWeek && <button className="dr-today" onClick={() => setWeekStart(mondayOf(TODAY))}>This week</button>}
        </div>
        <div className="dr-toggle" role="group" aria-label="Layout">
          <button className={layout === 'grid' ? 'on' : ''} onClick={() => setLayout('grid')}><FiGrid /> Week grid</button>
          <button className={layout === 'list' ? 'on' : ''} onClick={() => setLayout('list')}><FiList /> List</button>
        </div>
      </div>

          <div className="dr-stats">
            <div className="dr-card"><span>Duties this week</span><strong>{all.length}</strong></div>
            <div className="dr-card"><span>Scheduled hours</span><strong>{hours} h</strong></div>
            <div className="dr-card"><span>Days off / leave</span><strong>{offDays}</strong></div>
          </div>
          <div className={`dr-days ${layout}`}>
            {days.map(({ iso, info, duties }) => (
              <section key={iso} className={`dr-day ${iso === TODAY ? 'today' : ''}`} aria-label={`${weekday(iso)} ${shortDate(iso)}`}>
                <header>
                  <strong>{weekday(iso)}</strong><span>{shortDate(iso)}</span>
                  {iso === TODAY && <em>Today</em>}
                </header>
                {info.kind !== 'work' ? (
                  <p className={`dr-off ${info.kind}`}>{info.label}</p>
                ) : duties.length === 0 ? (
                  <p className="dr-off">No duties</p>
                ) : duties.map((x) => (
                  <button key={x.id} className={`dr-duty ${x.status.replace(' ', '').toLowerCase()}`} onClick={() => setDetail(x)}>
                    <small>{range(x.start, x.end)}</small>
                    <b>{x.title}</b>
                    <span><FiMapPin aria-hidden="true" /> {x.location}</span>
                    <i>{x.status}</i>
                  </button>
                ))}
              </section>
            ))}
          </div>
      {detail && (
        <div className="dr-overlay" onClick={() => setDetail(null)}>
          <div className="dr-dialog" role="dialog" aria-modal="true" aria-label="Duty details" onClick={(e) => e.stopPropagation()}>
            <div className="dr-dlg-head"><h2>{detail.title}</h2><button aria-label="Close" onClick={() => setDetail(null)}><FiX /></button></div>
            <p>{weekday(detail.date)}, {shortDate(detail.date)} · {range(detail.start, detail.end)}</p>
            <p className="dr-muted"><FiMapPin aria-hidden="true" /> {detail.location}</p>
            <p className="dr-muted"><FiUser aria-hidden="true" /> In-charge: {detail.incharge}</p>
            <p><span className={`dr-chip ${detail.status.replace(' ', '').toLowerCase()}`}>{detail.status}</span></p>
            <div className="dr-actions">
              <button onClick={() => setDetail(null)}>Close</button>
              {detail.status === 'Upcoming' && (
                <button className="dr-primary" onClick={() => { setDetail(null); showToast('Swap request sent to your in-charge (demo)'); }}>Request swap</button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="dr-toast" role="status">{toast}</div>}
    </div>
  );
}
