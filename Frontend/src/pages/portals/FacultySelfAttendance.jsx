import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import PortalLayout from '../../layouts/PortalLayout.jsx'
import PageHeader from '../../components/PageHeader'
import FilterPanel from '../../components/FilterPanel'
import ExportMenu from '../../components/ExportMenu'
import TablePagination from '../../components/TablePagination'
import ViewDialog from '../../components/ViewDialog'
import StatusBadge from '../../components/StatusBadge'
import { useAcademic } from '../../context/AcademicContext'
import { useScreenAccess } from '../../auth/ScreenAccess'
import facultyService from '../../services/facultyService'
import { teachingService } from '../../services/portals/teachingService'
import { localAttendanceDate, normalizeAttendanceRow, attendanceStatusLabel } from '../../utils/facultyAttendance'
import { formatTime12 } from './facultySelfAttendanceCalculations'
import './faculty-self-attendance.css'

const route='/faculty-portal/my-attendance'
const day=value=>String(value || '').slice(0,10)
const normalize=row=>normalizeAttendanceRow({...row,facultyId:row.facultyId ?? row.faculty_id,attendanceId:row.attendanceId ?? row.attendance_id,attendanceDate:row.attendanceDate ?? row.attendance_date,checkIn:row.checkIn ?? row.check_in,checkOut:row.checkOut ?? row.check_out})
const columns=[{label:'Date',value:'date'},{label:'Status',value:row=>attendanceStatusLabel(row.status)},{label:'Check in',value:row=>formatTime12(row.checkIn)},{label:'Check out',value:row=>formatTime12(row.checkOut)},{label:'Remarks',value:'remarks'}]

export function FacultySelfAttendancePage(){
  return <PortalLayout role="faculty" screen="my-attendance"><FacultySelfAttendance/></PortalLayout>
}

export default function FacultySelfAttendance(){
  const {selectedCollegeId,selectedAcademicYearId,selectedAcademicYear}=useAcademic()
  return <SelfAttendance key={String(selectedCollegeId)+':'+String(selectedAcademicYearId)} collegeId={selectedCollegeId} year={selectedAcademicYear}/>
}

function SelfAttendance({collegeId,year}){
  const {canAction}=useScreenAccess(), canEdit=canAction(route,'edit'),canCreate=canAction(route,'create')
  const [today]=useState(()=>localAttendanceDate(new Date()))
  const yearStart=day(year?.startDate),yearEnd=day(year?.endDate)
  const [from,setFrom]=useState(yearStart || today.slice(0,7)+'-01'),[to,setTo]=useState(yearEnd && yearEnd<today ? yearEnd : today)
  const [status,setStatus]=useState(''),[page,setPage]=useState(1),[detail,setDetail]=useState(null)
  const [records,setRecords]=useState([]),[todayRecord,setTodayRecord]=useState(null),[identity,setIdentity]=useState(null)
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[confirm,setConfirm]=useState('')
  const [attempt,setAttempt]=useState(0),[pending,setPending]=useState(false)
  const live=useRef(false), lock=useRef(false),createProgress=useRef(null),acknowledged=useRef('')
  useLayoutEffect(()=>{live.current=true;return()=>{live.current=false}},[])
  const todayInYear=(!yearStart||today>=yearStart)&&(!yearEnd||today<=yearEnd)
  const rangeError=from && to && from>to
  useEffect(()=>{
    let current=true
    const load=async()=>{
      setLoading(true);setError('')
      try{
        if(rangeError)throw new Error('End date must be on or after start date.')
        const person=await teachingService.getFacultyIdentity()
        if(!current)return
        if(collegeId && String(person.collegeId)!==String(collegeId))throw new Error('This faculty account does not belong to the working college.')
        const facultyId=person.facultyId
        const own=rows=>rows.map(normalize).filter(row=>row.facultyId===String(facultyId))
        const [history,daily]=await Promise.all([facultyService.getAttendance({facultyId,fromDate:from || yearStart || undefined,toDate:to || yearEnd || undefined}),todayInYear?facultyService.getAttendance({facultyId,fromDate:today,toDate:today}):[]])
        if(!current)return
        const ownToday=own(daily).find(row=>row.date===today) || null
        setRecords(own(history).filter(row=>(!from||row.date>=from)&&(!to||row.date<=to)&&(!yearStart||row.date>=yearStart)&&(!yearEnd||row.date<=yearEnd)))
        setTodayRecord(ownToday);setIdentity(person)
        if(ownToday?.attendanceId)createProgress.current=ownToday.attendanceId
        if(acknowledged.current){acknowledged.current='';setPending(false);setNotice('Saved attendance refreshed.')}
      }catch(reason){if(current){setRecords([]);setTodayRecord(null);setIdentity(null);setError(reason.message || 'Unable to load attendance.')}}
      finally{if(current)setLoading(false)}
    }
    load()
    return()=>{current=false}
  },[attempt,collegeId,from,to,today,todayInYear,rangeError,yearStart,yearEnd])
  const canPunch=canEdit && todayInYear && !loading && !busy && !pending && !error && identity
  const leaveDay=['On Leave','LOP'].includes(todayRecord?.status)
  const punch=async()=>{
    if(!canPunch || lock.current || leaveDay || !confirm)return
    const action=confirm
    if(action==='in' && todayRecord?.checkIn || action==='out' && (!todayRecord?.checkIn || todayRecord.checkOut))return
    lock.current=true;setBusy(true);setError('');setNotice('')
    try{
      let id=todayRecord?.attendanceId || createProgress.current
      if(!id){
        if(action!=='in'||!canCreate)throw new Error('An attendance record is required for check-in.')
        createProgress.current='unconfirmed'
        const created=await facultyService.createAttendance({facultyId:identity.facultyId,attendanceDate:today,status:'PRESENT'})
        id=created.attendanceId ?? created.attendance_id ?? created.id
        if(!id)throw new Error('The attendance record identity was not returned. Refresh before retrying.')
        createProgress.current=id
      }
      if(!live.current)return
      if(id==='unconfirmed')throw new Error('Verify the previous attendance record in the register before retrying.')
      if(action==='in')await facultyService.checkIn(id,{})
      else await facultyService.checkOut(id,{})
      if(!live.current)return
      acknowledged.current=action;setPending(true);setConfirm('');setAttempt(value=>value+1)
    }catch(reason){if(live.current){if(createProgress.current==='unconfirmed' && reason.status>=400 && reason.status<500)createProgress.current=null;setError(reason.message || 'Unable to record attendance.');setConfirm('')}}
    finally{lock.current=false;if(live.current)setBusy(false)}
  }
  const filtered=records.filter(row=>!status||row.status===status)
  const totalPages=Math.max(1,Math.ceil(filtered.length/10)), current=Math.min(page,totalPages)
  return <main className="fsa-page"><PageHeader title="My Attendance" subtitle="Review your recorded attendance, check-in and check-out times, and leave status." compactSummary={[{label:'Today',value:loading?'Loading':error?'Unavailable':attendanceStatusLabel(todayRecord?.status || 'Not marked')},{label:'Check in',value:formatTime12(todayRecord?.checkIn)},{label:'Check out',value:formatTime12(todayRecord?.checkOut)}]}/>
    <section className="erp-card">
      <div className="erp-card-header"><div><h2 className="erp-card-title">Daily attendance</h2><p>{today}</p></div>{canEdit && <div><button type="button" className="erp-btn erp-btn--primary" disabled={!canPunch||leaveDay||Boolean(todayRecord?.checkIn)||(!todayRecord?.attendanceId&&!canCreate)} onClick={()=>setConfirm('in')}>Check in</button> <button type="button" className="erp-btn erp-btn--secondary" disabled={!canPunch||leaveDay||!todayRecord?.checkIn||Boolean(todayRecord?.checkOut)} onClick={()=>setConfirm('out')}>Check out</button></div>}</div>
      {loading && <p role="status">Loading attendance…</p>}{notice && <p role="status">{notice}</p>}{error && <p role="alert">{error} <button type="button" onClick={()=>setAttempt(value=>value+1)}>{pending?'Retry saved attendance refresh':'Retry attendance'}</button></p>}
    </section>
    <section className="erp-card"><FilterPanel actions={<ExportMenu rows={filtered} columns={columns} title="My Attendance History" filename="my-attendance" loading={loading||Boolean(error)}/>} filters={<><label>From date<input type="date" value={from} onChange={event=>{setFrom(event.target.value);setPage(1)}}/></label><label>To date<input type="date" value={to} onChange={event=>{setTo(event.target.value);setPage(1)}}/></label><label>Status<select value={status} onChange={event=>{setStatus(event.target.value);setPage(1)}}><option value="">All statuses</option>{[...new Set(records.map(row=>row.status))].filter(Boolean).map(value=><option key={value} value={value}>{attendanceStatusLabel(value)}</option>)}</select></label></>} active={Boolean(status)} onClear={()=>{setStatus('');setFrom(yearStart || today.slice(0,7)+'-01');setTo(yearEnd && yearEnd<today?yearEnd:today);setPage(1)}}/>
    <div className="erp-table-responsive"><table className="erp-table"><caption>Attendance history</caption><thead><tr>{columns.map(column=><th key={column.label} scope="col">{column.label}</th>)}<th scope="col">Details</th></tr></thead><tbody>{filtered.slice((current-1)*10,current*10).map(row=><tr key={row.id || row.date}><td>{row.date}</td><td><StatusBadge value={attendanceStatusLabel(row.status)}/></td><td>{formatTime12(row.checkIn)}</td><td>{formatTime12(row.checkOut)}</td><td>{row.remarks}</td><td><button type="button" onClick={()=>setDetail(row)}>View details</button></td></tr>)}</tbody></table></div>
    {!loading && !error && !filtered.length && <p>No attendance records for this period.</p>}<TablePagination currentPage={current} totalPages={totalPages} onPageChange={setPage}/></section>
    {confirm && <ViewDialog title={confirm==='in'?'Confirm check-in':'Confirm check-out'} onClose={()=>setConfirm('')} busy={busy} showExport={false} hideFooter><p>The server records the time when you confirm.</p><button type="button" disabled={busy} onClick={punch}>{busy?'Saving…':'Confirm'}</button></ViewDialog>}
    {detail && <ViewDialog title="Attendance details" onClose={()=>setDetail(null)} showExport={false}><dl>{columns.map(column=><div key={column.label}><dt>{column.label}</dt><dd>{typeof column.value==='function'?column.value(detail):detail[column.value]}</dd></div>)}</dl></ViewDialog>}
  </main>
}
