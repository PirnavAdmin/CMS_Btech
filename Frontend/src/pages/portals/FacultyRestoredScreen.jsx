import { useState } from 'react'
import PortalLayout from '../../layouts/PortalLayout.jsx'
import { FacultyAttendancePage } from './FacultyAttendance.jsx'
import { FacultySelfAttendancePage } from './FacultySelfAttendance.jsx'
import TeachingMarks from './TeachingMarks.jsx'
import TeachingLeave from './TeachingLeave.jsx'
import FacultyCampusPage from './FacultyCampusPage.jsx'
import { usePortalData } from '../../hooks/usePortalData.js'
import { teachingService } from '../../services/portals/teachingService.js'
import './teaching-portal.css'
import './faculty-restored.css'

export default function FacultyRestoredScreen({ screen }) {
  const [summaryTarget, setSummaryTarget] = useState(null)
  if (screen === 'attendance') return <FacultyAttendancePage />
  if (screen === 'my-attendance') return <FacultySelfAttendancePage />
  if (['events', 'meetings', 'placements'].includes(screen)) return <FacultyCampusPage key={screen === 'meetings' ? 'events' : screen} screen={screen === 'meetings' ? 'events' : screen} />
  const isLeave = screen === 'leave', title = isLeave ? 'Leave Management' : 'Marks Entry'
  return <PortalLayout title={title}><main className={`portal-page tf-page restored-faculty-page${isLeave ? ' tl-page' : ''}`}><header className="tf-heading"><div><p className="portal-eyebrow">DIGITAL CAMPUS / TEACHING FACULTY</p><h1>{title}</h1><p>{isLeave ? 'Review your balance, apply for leave and track requests.' : 'Select your subject and assessment, enter marks and review your class roster.'}</p></div>{isLeave && <div className="tl-summary-anchor" ref={setSummaryTarget} />}</header>{isLeave ? <TeachingLeave summaryTarget={summaryTarget} /> : <RestoredMarks />}</main></PortalLayout>
}

function RestoredMarks() {
  const { data } = usePortalData(teachingService)
  return <TeachingMarks data={data || { assignments: [], students: [] }} />
}
