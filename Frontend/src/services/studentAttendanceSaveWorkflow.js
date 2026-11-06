const identity = value => Number.isSafeInteger(Number(value)) && Number(value)>0
const statusValue = {Present:'PRESENT',Absent:'ABSENT',Late:'LATE',Excused:'LEAVE'}
// Only acknowledged identities and operation progress are retained; records remain API-owned.
export function createStudentAttendanceWriter(api,onRecorded=()=>{}) {
 const progress=new Map(),locks=new Set()
 return async session=>{
  for(const field of ['academicYearId','semesterId','sectionId','subjectId','facultyId'])if(!identity(session[field]))throw Error('Select a valid '+field+' before saving attendance.')
  if(session.collegeId!=null && !identity(session.collegeId))throw Error('Select a valid college before saving attendance.')
  if(!/^\d{4}-\d{2}-\d{2}$/.test(session.date || '') || (Number.isNaN(Date.parse(session.date+'T00:00:00Z')) || new Date(session.date+'T00:00:00Z').toISOString().slice(0,10)!==session.date))throw Error('Select a valid attendance date.')
  const records=session.records || []
  if(!records.length || records.some(row=>!identity(row.studentId)||!statusValue[row.status]))throw Error('Load and explicitly mark every student before saving attendance.')
  if(new Set(records.map(row=>String(row.studentId))).size!==records.length)throw Error('The attendance roster contains duplicate student identities.')
  const key=[session.collegeId,session.academicYearId,session.semesterId,session.sectionId,session.subjectId,session.date].join(':')
  if(locks.has(key))throw Error('Attendance for this class is already being saved.')
  const state=progress.get(key)||{};progress.set(key,state);locks.add(key)
  try {
   if(state.completed)throw Error('Attendance for this class has already been saved. Open the existing session for corrections.')
   if(!state.id){
    const existing=await api.list({...(session.collegeId?{collegeId:session.collegeId}:{}),academicYearId:session.academicYearId,semesterId:session.semesterId,sectionId:session.sectionId,subjectId:session.subjectId,fromDate:session.date,toDate:session.date})
    const match=existing.find(row=>String(row.subjectId)===String(session.subjectId)&&String(row.sectionId)===String(session.sectionId)&&String(row.attendanceDate || row.date).slice(0,10)===session.date&&String(row.sessionStatus).toUpperCase()!=='CANCELLED')
    if(match){if(match.facultyId && String(match.facultyId)!==String(session.facultyId))throw Error('An open session is assigned to another faculty member. Open the existing session to review it.');if(String(match.sessionStatus).toUpperCase()!=='OPEN')throw Error('Attendance for this section, date, and subject already exists. Open the existing session to make corrections.');state.id=match.attendanceSessionId || match.sessionId || match.id;state.saved=match}
    if(!state.id){
     if(state.uncertain)throw Error('Verify the previous session in the register before creating again; its identity was not confirmed.')
     state.uncertain=true
     let saved;try{saved=await api.create({academicYearId:Number(session.academicYearId),semesterId:Number(session.semesterId),sectionId:Number(session.sectionId),subjectId:Number(session.subjectId),facultyId:Number(session.facultyId),attendanceDate:session.date,remarks:session.remarks || null,...(session.collegeId?{collegeId:Number(session.collegeId)}:{})})
     }catch(reason){if(Number(reason.status)>=400 && Number(reason.status)<500)state.uncertain=false;throw reason}
     state.saved=saved;state.id=saved.attendanceSessionId || saved.sessionId || saved.id
     if(!identity(state.id))throw Error('Session was created, but the API response did not include attendanceSessionId. Verify the register before creating again.')
    }
   }
   if(!identity(state.id))throw Error('The saved session identity is unavailable. Verify the register before retrying.')
   const response=await api.getStudents(state.id),roster=Array.isArray(response.students)?response.students:[]
   if(!roster.length)throw Error('The session has no students in its backend roster. Check section assignments before retrying.')
   const marks=new Map(records.map(row=>[String(row.studentId),row]))
   if(roster.length!==marks.size || roster.some(row=>!marks.has(String(row.studentId ?? row.id))))throw Error('The backend roster changed. Reload and explicitly mark all assigned students before retrying.')
   const marked=await api.mark(state.id,{students:roster.map(row=>{const record=marks.get(String(row.studentId ?? row.id));return {studentId:Number(row.studentId ?? row.id),attendanceStatus:statusValue[record.status],remarks:record.remarks || null}}),markUnlistedAsAbsent:false,completeSession:true})
   const result={...state.saved,...marked,attendanceSessionId:state.id};state.completed=true;onRecorded(result);return result
  } finally{locks.delete(key)}
 }
}
