import { useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import EmptyState from '../../components/EmptyState'
import { DAYS, overlaps, timeMinutes } from '../../utils/timetableUtils'
import { isTeachingPeriod, periodLabel, periodType } from '../../utils/timetablePeriods'

function TimetableCell({ row, inspect, occupancy }) {
  return <button data-entry-id={row.id} className={`tt-class ${row.origin === 'backend' ? 'tt-class-backend' : ''}`} title={`${row.subjectName} | ${row.startTime?.slice(0, 5)}-${row.endTime?.slice(0, 5)} | ${row.facultyName} | ${row.sectionName} | ${row.classroom}`} onClick={() => inspect(row)}>
    <strong>{row.subjectCode || row.subjectName || 'Subject unavailable'}</strong><span className="tt-cell-name">{row.subjectName}</span><small className="tt-cell-time">{row.startTime?.slice(0, 5)}–{row.endTime?.slice(0, 5)}</small><small>{row.facultyName}</small><small>{row.classroom || 'Room not assigned'}</small><em className="tt-cell-meta">{occupancy ? 'Occupied | ' : ''}{row.origin === 'backend' ? 'Backend entry' : row.publicationStatus === 'published' ? 'Published locally' : row.generated ? 'Generated draft' : 'Manual draft'}</em>
  </button>
}

export default function TimetableGrid({ rows, periods: configured = [], workingDays, editable = false, add, inspect, occupancy = false }) {
  const days = [...new Set([...(workingDays?.length ? workingDays : DAYS), ...rows.map(row => row.dayOfWeek)])]
  const [selectedDay, setSelectedDay] = useState('MONDAY')
  const day = days.includes(selectedDay) ? selectedDay : days[0]
  const candidates = [...configured.map((row, index) => ({ ...row, name: periodLabel(row, index) })), ...rows.filter(row => !configured.some(period => isTeachingPeriod(period) && overlaps(period, row))).map(row => ({ startTime: row.startTime, endTime: row.endTime, type: 'class', name: 'Class' }))]
  const periods = [...new Map(candidates.map(row => [`${row.startTime.slice(0, 5)}|${row.endTime.slice(0, 5)}|${periodType(row)}`, row])).values()]
    .filter(row => isTeachingPeriod(row) || (!rows.some(entry => overlaps(row, entry)) && !configured.some(period => isTeachingPeriod(period) && overlaps(row, period))))
    .sort((a, b) => (timeMinutes(a.startTime) ?? 1440) - (timeMinutes(b.startTime) ?? 1440))
  if (!periods.length && !editable) return <EmptyState title="No scheduled classes for this selection" message="Choose a timetable or publish a draft for this academic context." />
  const slots = periods.length ? periods : [{ startTime: '', endTime: '', name: 'Period', type: 'class' }]
  const empty = (slot, day) => <button className="tt-empty-cell" aria-label={`Add class ${day} ${slot.name} ${slot.startTime.slice(0, 5)}`} onClick={() => add({ dayOfWeek: day, startTime: slot.startTime, endTime: slot.endTime, timetableSlotId: slot.id })}><FiPlus /><span>Add class</span></button>
  const card = row => <TimetableCell key={`${row.origin}-${row.id}`} row={row} inspect={inspect} occupancy={occupancy} />
  const agenda = [
    ...rows.filter(row => row.dayOfWeek === day).map(row => ({ startTime: row.startTime, id: `entry-${row.origin}-${row.id}`, content: card(row) })),
    ...slots.filter(slot => !isTeachingPeriod(slot) || (editable && !rows.some(row => row.dayOfWeek === day && overlaps(row, slot)))).map(slot => ({ startTime: slot.startTime, id: `period-${slot.id || slot.startTime}-${periodType(slot)}`, content: isTeachingPeriod(slot) ? <div className="tt-agenda-slot"><small>{slot.name} · {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}</small>{empty(slot, day)}</div> : <div className="tt-agenda-break"><strong>{slot.name}</strong><span>{slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}</span></div> })),
  ].sort((a, b) => timeMinutes(a.startTime) - timeMinutes(b.startTime))
  return <>
    <div className="tt-grid-scroll"><table className="tt-week"><caption>Weekly timetable</caption><thead><tr><th>Period</th>{days.map(day => <th key={day}>{day.slice(0, 1) + day.slice(1).toLowerCase()}</th>)}</tr></thead><tbody>{slots.map(slot => <tr key={`${slot.startTime}-${slot.endTime}-${periodType(slot)}`} className={!isTeachingPeriod(slot) ? 'tt-break-row' : ''} data-period-type={periodType(slot)}>
      <th>{slot.name}<small>{slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}</small></th>
      {!isTeachingPeriod(slot) ? <td colSpan={days.length}>{slot.name} · No teaching</td> : days.map(day => {
        const matching = rows.filter(row => row.dayOfWeek === day && (overlaps(row, slot) || (!row.startTime && !slot.startTime)))
        return <td key={day}>{matching.map(card)}{!matching.length && (editable ? empty(slot, day) : occupancy ? <span className="tt-available">No published booking</span> : null)}</td>
      })}
    </tr>)}</tbody></table></div>
    <div className="tt-day-view"><div className="tt-day-tabs" role="group" aria-label="Schedule Day">{days.map(value => <button key={value} className={value === day ? 'active' : ''} aria-pressed={value === day} onClick={() => setSelectedDay(value)}>{value.slice(0, 3)}</button>)}</div>{agenda.map(item => <div key={item.id}>{item.content}</div>)}{!rows.some(row => row.dayOfWeek === day) && <p>No classes for this day.</p>}</div>
  </>
}
