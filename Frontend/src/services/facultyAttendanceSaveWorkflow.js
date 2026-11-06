export function createFacultyAttendanceWriter(api){
 const progress=new Map(),locks=new Set()
 return async({facultyId,date,id,payload,status,remarks})=>{
  if(!Number.isSafeInteger(Number(facultyId)) || Number(facultyId)<=0)throw Error('Select an employee with a valid backend identity.')
  const key=String(facultyId)+':'+date
  if(locks.has(key))throw Error('This attendance record is already being saved.')
  const state=progress.get(key)||{id};if(!state.id && id)state.id=id;progress.set(key,state);locks.add(key)
  try{
   if(!state.id && state.uncertain)throw Error('Verify this date in the register before another creation; the previous response had no confirmed identity.')
   const base={...payload,facultyId,status,remarks:remarks || null};const signature=JSON.stringify(base)
   if(state.base!==signature){
    if(state.id)await api.updateAttendance(state.id,base)
    else{state.uncertain=true;let created;try{created=await api.createAttendance({facultyId,attendanceDate:date,status,remarks:remarks || null,checkIn:payload.checkIn,checkOut:payload.checkOut})}catch(reason){if(Number(reason.status)>=400 && Number(reason.status)<500)state.uncertain=false;throw reason};state.id=created?.attendanceId ?? created?.id;if(!state.id)throw Error('Attendance saved without an identity. Refresh this date before updating check-in/out.')}
    state.base=signature
   }
   if(payload.checkIn && state.checkIn!==payload.checkIn){await api.checkIn(state.id,{checkIn:payload.checkIn});state.checkIn=payload.checkIn}
   if(payload.checkOut && state.checkOut!==payload.checkOut){await api.checkOut(state.id,{checkOut:payload.checkOut});state.checkOut=payload.checkOut}
   return {attendanceId:state.id}
  }finally{locks.delete(key)}
 }
}
