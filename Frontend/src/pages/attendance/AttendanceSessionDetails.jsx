import { useAcademic } from '../../context/AcademicContext'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import InfoCard from '../../components/InfoCard'
import StatusBadge from '../../components/StatusBadge'
import attendanceService from '../../services/attendanceService'
import { FiCalendar, FiArrowLeft } from 'react-icons/fi'
import './Attendance.css'

export default function AttendanceSessionDetails() {
  const { sessionId } = useParams()
  const { scopeRecords } = useAcademic()
  const [session, setSession] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([attendanceService.getSessions(), attendanceService.getSessionStudents(sessionId)])
      .then(([sessions, students]) => {
        const found = scopeRecords(sessions).find(item => String(item.id) === sessionId)
        if (!found) throw new Error('Attendance session not found.')
        if (active) { setSession(found); setRecords(students) }
      })
      .catch(cause => { if (active) setError(cause.message || 'Unable to load session details.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [sessionId, retry, scopeRecords])

  return <DashboardLayout>
    <section className="attendance-content">
      <header className="attendance-session-details-header">
        <h1>Session Details</h1>
        <Link className="erp-btn erp-btn--secondary attendance-session-back" to="/student-management/attendance"><FiArrowLeft aria-hidden="true" />Back</Link>
      </header>
      {loading ? <p role="status">Loading session details...</p> : error ? <div role="alert"><p>{error}</p><button type="button" className="erp-btn erp-btn--secondary" onClick={() => setRetry(value => value + 1)}>Retry</button></div> : session && <>
        <InfoCard icon={FiCalendar} title={session.subject || 'Attendance session'} items={[
          { label: 'Date', value: session.date }, { label: 'Faculty', value: session.faculty },
          { label: 'Academic Year', value: session.academicYear }, { label: 'Course', value: session.course },
          { label: 'Semester', value: session.semester }, { label: 'Section', value: session.section },
        ]} />
        <h2>Student Attendance ({records.length})</h2>
        <div className="erp-table-responsive"><table className="erp-table">
          <thead><tr><th>#</th><th>Roll No</th><th>Student Name</th><th>Status</th></tr></thead>
          <tbody>{records.length ? records.map((record, index) => <tr key={record.studentId || index}>
            <td>{index + 1}</td><td>{record.rollNumber || record.studentId}</td><td>{record.name}</td>
            <td><StatusBadge status={record.status === 'Present' ? 'Active' : record.status === 'Late' ? 'Warning' : 'Danger'} label={record.status} /></td>
          </tr>) : <tr><td colSpan={4}>No student attendance records are available for this session.</td></tr>}</tbody>
        </table></div>
      </>}
    </section>
  </DashboardLayout>
}
