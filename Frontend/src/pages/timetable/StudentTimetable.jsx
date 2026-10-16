import { useEffect, useState } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import { profileApi } from '../../api/apiEndpoints'
import { backendTimetableService } from '../../services/backendTimetableService'
import { localDate } from '../../utils/timetablePlanner'
import { normalizeEntry, publicationState } from '../../utils/timetableUtils'
import TimetableGrid from './TimetableGrid'
import './TimetableManagement.css'
import './TimetableWorkflow.css'

export default function StudentTimetable() {
  const [date, setDate] = useState(localDate())
  const [state, setState] = useState({ loading: true, rows: [], error: '' })
  useEffect(() => {
    let current = true
    Promise.resolve().then(async () => {
      if (current) setState({ loading: true, rows: [], error: '' })
      const profile = await profileApi.getProfile()
      if (!profile.studentId) throw new Error('Your profile does not supply a student mapping. Ask the administrator to link your student account.')
      const rows = await backendTimetableService.view('student', profile.studentId, { date })
      if (rows.some(row => publicationState(row) === 'unavailable')) throw new Error('Publication status is missing from the student timetable response. Official classes cannot be confirmed.')
      if (current) setState({ loading: false, rows: rows.filter(row => publicationState(row) === 'published').map(row => normalizeEntry({ ...row, classroom: row.classroomName ?? row.classroom, roomId: row.classroomId ?? row.roomId })), error: '' })
    }).catch(error => { if (current) setState({ loading: false, rows: [], error: error.message }) })
    return () => { current = false }
  }, [date])
  return <DashboardLayout><main className="tt-page tt-workflow"><header className="tt-page-header"><div><h1>My Timetable</h1><p>Your official class schedule. Drafts are excluded.</p></div></header><section className="tt-card tt-clean-step"><label className="tt-field"><span>Schedule date</span><input type="date" value={date} onChange={event => { if (event.target.value) setDate(event.target.value) }} /></label>{state.loading ? <p role="status">Loading published timetable…</p> : state.error ? <p className="tt-error" role="alert">{state.error}</p> : <TimetableGrid rows={state.rows} editable={false} />}</section></main></DashboardLayout>
}
