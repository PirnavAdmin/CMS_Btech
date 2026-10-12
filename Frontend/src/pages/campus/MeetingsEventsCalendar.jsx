import { useMemo, useState } from 'react'
import { FiCalendar, FiChevronDown, FiChevronLeft, FiChevronRight, FiClock, FiMapPin, FiPlus, FiUsers } from 'react-icons/fi'
import FilterPanel from '../../components/FilterPanel'
import './MeetingsEventsCalendar.css'

function CalendarFilterSelect({ children, ...props }) {
  return <span className="mew-calendar-select"><select {...props}>{children}</select><FiChevronDown aria-hidden="true" /></span>
}
const asDate = value => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
const dayKey = value => {
  const date = value instanceof Date ? value : asDate(value)
  return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : ''
}
const localDateInput = date => dayKey(date)
const sameDay = (left, right) => dayKey(left) === dayKey(right)
const formatTime = value => asDate(value)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Time TBA'
const formatDate = value => asDate(value)?.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) || 'Date TBA'

export default function MeetingsEventsCalendar({ meetings, events, onCreateMeeting, onCreateEvent, onEditMeeting, onEditEvent }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [view, setView] = useState('month')
  const [kind, setKind] = useState('all')
  const [department, setDepartment] = useState('all')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [details, setDetails] = useState(null)
  const today = new Date()
  const items = useMemo(() => [
    ...meetings.map(item => ({ ...item, kind: 'meeting', startAt: item.start, endAt: item.end })),
    ...events.map(item => ({ ...item, kind: 'event', startAt: item.start, endAt: item.end })),
  ].filter(item => kind === 'all' || item.kind === kind)
    .filter(item => department === 'all' || item.department === department)
    .filter(item => category === 'all' || item.category === category)
    .filter(item => status === 'all' || item.status === status)
    .filter(item => asDate(item.startAt))
    .sort((a, b) => asDate(a.startAt) - asDate(b.startAt)), [meetings, events, kind, department, category, status])
  const departments = [...new Set(items.map(item => item.department).filter(Boolean))].sort()
  const categories = [...new Set(items.map(item => item.category).filter(Boolean))].sort()
  const statuses = [...new Set(items.map(item => item.status).filter(Boolean))].sort()
  const selectedItems = items.filter(item => {
    const start = asDate(item.startAt)
    const end = asDate(item.endAt) || start
    const selected = dayKey(selectedDate)
    return dayKey(start) <= selected && dayKey(end) >= selected
  })
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  const calendarStart = new Date(monthStart)
  calendarStart.setDate(monthStart.getDate() - monthStart.getDay())
  const monthDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart)
    date.setDate(calendarStart.getDate() + index)
    return date
  })
  const shift = amount => setSelectedDate(current => {
    const next = new Date(current)
    if (view === 'month') next.setMonth(next.getMonth() + amount)
    else if (view === 'week') next.setDate(next.getDate() + amount * 7)
    else next.setDate(next.getDate() + amount)
    return next
  })
  const chooseToday = () => setSelectedDate(new Date())
  const setDate = value => { const next = asDate(`${value}T12:00:00`); if (next) setSelectedDate(next) }
  const periodHeading = view === 'month'
    ? selectedDate.toLocaleDateString([], { month: 'long', year: 'numeric' })
    : view === 'week'
      ? `${formatDate(monthDays.find(date => dayKey(date) === dayKey(selectedDate)) || selectedDate)} · Week`
      : formatDate(selectedDate)
  const daysToShow = view === 'week' ? monthDays.filter(date => {
    const start = new Date(selectedDate)
    start.setDate(start.getDate() - start.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return date >= start && date <= end
  }) : [selectedDate]
  const openItem = item => setDetails(item)
  const activeFilters = kind !== 'all' || department !== 'all' || category !== 'all' || status !== 'all' || dayKey(selectedDate) !== dayKey(today)
  const clearFilters = () => { setKind('all'); setDepartment('all'); setCategory('all'); setStatus('all'); setSelectedDate(new Date()) }

  return <section className="mew-calendar" aria-label="Meetings and events calendar">
    <div className="mew-calendar__toolbar">
      <div className="mew-calendar__period">
        <button type="button" aria-label="Previous period" onClick={() => shift(-1)}><FiChevronLeft /></button>
        <button type="button" aria-label="Next period" onClick={() => shift(1)}><FiChevronRight /></button>
        <button type="button" className="mew-calendar__today" onClick={chooseToday}>Today</button>
        <h2>{periodHeading}</h2>
      </div>
    </div>
    <FilterPanel className="mew-calendar__filters" toggleClassName="mew-calendar__filter-toggle" active={activeFilters} onClear={clearFilters}>
      <div className="mew-calendar__filter-label">Calendar filters</div>
      <label className="mew-calendar__date">Jump to date <input type="date" value={localDateInput(selectedDate)} onChange={event => setDate(event.target.value)} /></label>
      <label className="mew-calendar__date">Type <CalendarFilterSelect value={kind} onChange={event => setKind(event.target.value)}><option value="all">Meetings & events</option><option value="meeting">Meetings</option><option value="event">Events</option></CalendarFilterSelect></label>
      <label className="mew-calendar__date">Department <CalendarFilterSelect value={department} onChange={event => setDepartment(event.target.value)}><option value="all">All departments</option>{departments.map(name => <option key={name}>{name}</option>)}</CalendarFilterSelect></label>
      <label className="mew-calendar__date">Category <CalendarFilterSelect value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(name => <option key={name}>{name}</option>)}</CalendarFilterSelect></label>
      <label className="mew-calendar__date">Status <CalendarFilterSelect value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option>{statuses.map(name => <option key={name}>{name}</option>)}</CalendarFilterSelect></label>
    </FilterPanel>
    <div className="mew-calendar__quick-actions"><span><i className="mew-calendar__legend-dot meeting" /> Meeting <i className="mew-calendar__legend-dot event" /> Event</span><div className="mew-calendar__views" role="group" aria-label="Calendar view">{['month', 'week', 'day', 'agenda'].map(option => <button key={option} type="button" className={view === option ? 'active' : ''} onClick={() => setView(option)}>{option[0].toUpperCase() + option.slice(1)}</button>)}</div><div className="mew-calendar__quick-actions-right"><div className="mew-calendar__create-actions"><button type="button" className="mew-action-meeting" onClick={onCreateMeeting}><FiPlus /> Create meeting</button><button type="button" className="mew-action-event" onClick={onCreateEvent}><FiPlus /> Create event</button></div></div></div>
    <div className="mew-calendar__layout">
      <div className="mew-calendar__main">
        {view === 'month' && <div className="mew-calendar__month-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="mew-calendar__weekday">{day}</div>)}
          {monthDays.map(date => {
            const dayItems = items.filter(item => {
              const start = asDate(item.startAt); const end = asDate(item.endAt) || start
              return dayKey(start) <= dayKey(date) && dayKey(end) >= dayKey(date)
            })
            return <button type="button" key={dayKey(date)} className={`mew-calendar__day${date.getMonth() === selectedDate.getMonth() ? '' : ' outside'}${sameDay(date, selectedDate) ? ' selected' : ''}${sameDay(date, today) ? ' today' : ''}`} onClick={() => setSelectedDate(date)}>
              <span className="mew-calendar__day-number">{date.getDate()}</span>
              <span className="mew-calendar__day-items">{dayItems.slice(0, 3).map(item => <span key={`${item.kind}-${item.id}`} className={`mew-calendar__event ${item.kind}`}><b>{formatTime(item.startAt)}</b> {item.title}</span>)}{dayItems.length > 3 && <small>+{dayItems.length - 3} more</small>}</span>
            </button>
          })}
        </div>}
        {(view === 'week' || view === 'day') && <div className={`mew-calendar__time-grid ${view}`}>
          {daysToShow.map(date => <div key={dayKey(date)} className="mew-calendar__time-day"><button type="button" className={sameDay(date, selectedDate) ? 'selected' : ''} onClick={() => setSelectedDate(date)}>{date.toLocaleDateString([], { weekday: 'short', day: 'numeric' })}</button>
            {Array.from({ length: 14 }, (_, index) => index + 7).map(hour => <div className="mew-calendar__hour" key={hour}><span>{String(hour).padStart(2, '0')}:00</span><div>{items.filter(item => sameDay(item.startAt, date) && asDate(item.startAt).getHours() === hour).map(item => <button type="button" key={`${item.kind}-${item.id}`} className={`mew-calendar__timed-event ${item.kind}`} onClick={() => openItem(item)}><strong>{item.title}</strong><span>{formatTime(item.startAt)}–{formatTime(item.endAt)} · {item.venue}</span></button>)}</div></div>)}
          </div>)}
        </div>}
        {view === 'agenda' && <div className="mew-calendar__agenda">{items.filter(item => dayKey(item.startAt) >= dayKey(selectedDate)).map(item => <CalendarItem key={`${item.kind}-${item.id}`} item={item} onClick={() => openItem(item)} />)}{!items.some(item => dayKey(item.startAt) >= dayKey(selectedDate)) && <p className="mew-calendar__empty">No upcoming activities match these filters.</p>}</div>}
      </div>
      <aside className="mew-calendar__daily"><header><div><small>DAILY SCHEDULE</small><h3>{selectedDate.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</h3></div><FiCalendar /></header><div className="mew-calendar__daily-list">{selectedItems.length ? selectedItems.map(item => <CalendarItem key={`${item.kind}-${item.id}`} item={item} onClick={() => openItem(item)} />) : <p className="mew-calendar__empty">No meetings or events scheduled for this day.</p>}</div><footer><strong>{selectedItems.length}</strong> activities</footer></aside>
    </div>
    {details && <div className="mew-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setDetails(null) }}><section className="mew-modal mew-calendar__details" role="dialog" aria-modal="true" aria-labelledby="mew-calendar-details-title"><header className="mew-modal-header"><div><span className="mew-calendar__kind">{details.kind} · {details.category || 'General'}</span><h2 id="mew-calendar-details-title">{details.title}</h2></div><button type="button" className="mew-modal-close" aria-label="Close details" onClick={() => setDetails(null)}>×</button></header><div className="mew-modal-body"><p>{details.description || details.agenda || 'No description has been added.'}</p><dl><div><dt>Date</dt><dd>{formatDate(details.startAt)}</dd></div><div><dt>Time</dt><dd>{formatTime(details.startAt)}–{formatTime(details.endAt)}</dd></div><div><dt>Venue</dt><dd>{details.venue || 'Not set'}</dd></div><div><dt>Department</dt><dd>{details.department || 'Not set'}</dd></div><div><dt>Organizer</dt><dd>{details.organizer || 'Not set'}</dd></div><div><dt>Status</dt><dd>{details.status || 'Scheduled'}</dd></div></dl></div><footer className="mew-modal-footer"><button type="button" className="grm-button" onClick={() => setDetails(null)}>Close</button><button type="button" className="grm-button grm-button--primary" onClick={() => { const item = details; setDetails(null); if (item.kind === 'meeting') onEditMeeting(item); else onEditEvent(item) }}>Edit activity</button></footer></section></div>}
  </section>
}

function CalendarItem({ item, onClick }) {
  return <article className={`mew-calendar__agenda-item ${item.kind}`}><div className="mew-calendar__agenda-date"><strong>{formatTime(item.startAt)}</strong><span>{formatDate(item.startAt)}</span></div><div className="mew-calendar__agenda-content"><span className="mew-calendar__kind">{item.kind}</span><h4>{item.title}</h4><p><FiClock /> {formatTime(item.startAt)}–{formatTime(item.endAt)} <FiMapPin /> {item.venue || 'Venue not set'}</p><small><FiUsers /> {item.department || item.organizer || 'Organizer not set'} · {item.status}</small></div><button type="button" onClick={onClick}>View details</button></article>
}
