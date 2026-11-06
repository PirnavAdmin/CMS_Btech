const positive=value=>Number.isSafeInteger(Number(value))&&Number(value)>0
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value
export async function updateAcademicFeeDraft(api,original,form,collegeId,{ revision = false, progress } = {}){
 if(!positive(original?.id)||!positive(original.backendRevision)||(revision ? !['Published','Archived'].includes(original.status) : original.status!=='Draft')||String(original.collegeId)!==String(collegeId))throw Error('Select a compatible saved plan in the working college.')
 const ids=Object.fromEntries(['academicYearId','courseId','branchId','semesterId','feeCategoryId'].map(key=>[key,Number(form[key])]))
 if(Object.values(ids).some(value=>!positive(value)))throw Error('Select valid academic mappings and a financial fee category.')
 const components=(form.components || []).map(row=>({code:String(row.code || row.masterId || row.id || '').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,50),name:String(row.name||'').trim(),amount:Number(row.amount)}))
 if(!components.length || components.some(row=>!row.code||!row.name||!Number.isFinite(row.amount)||row.amount<0))throw Error('Enter valid fee components and amounts.')
 const totalAmount=Number(components.reduce((sum,row)=>sum+row.amount,0).toFixed(2))
 if(!totalAmount)throw Error('The total fee must be greater than zero.')
 if(!validDate(form.effectiveFrom)||!validDate(form.effectiveTo)||form.effectiveFrom>form.effectiveTo)throw Error('Set valid fee plan effective dates.')
 const full=form.plan==='Full Payment', installments=(full?[{amount:totalAmount,dueDate:form.dueDate}]:form.installments||[]).map((row,index)=>({number:index+1,dueDate:row.dueDate,amount:Number(row.amount)}))
 if(!installments.length||installments.some(row=>!validDate(row.dueDate)||row.dueDate<form.effectiveFrom||row.dueDate>form.effectiveTo||!Number.isFinite(row.amount)||row.amount<=0)||Math.abs(installments.reduce((sum,row)=>sum+row.amount,0)-totalAmount)>0.001)throw Error('Payment dates must be within plan validity and installment amounts must equal the total fee.')
 const body={...ids,collegeId:Number(collegeId),code:original.code,name:form.name.trim(),batch:form.batch.trim(),quota:form.category ?? original.quota,studentCategory:original.studentCategory,cycle:form.cycle==='Semester-wise'?'SEMESTER':'ANNUAL',paymentMode:full?'FULL_PAYMENT':'INSTALLMENTS',currencyCode:'INR',effectiveFrom:form.effectiveFrom,effectiveTo:form.effectiveTo,dueDate:installments.at(-1).dueDate,totalAmount,components,installments,previousFeeStructureId: revision ? Number(original.id) : original.previousFeeStructureId ?? null, ...(revision ? {} : {expectedRevision:original.backendRevision})}
 if (progress?.saved) return progress.saved
 if (progress?.pending) throw Error("A save is already pending or unconfirmed. Refresh the fee directory before continuing.")
 if (progress) progress.pending = true
 let saved
 try {
   saved = revision ? await api.create(body) : await api.update(original.id, body)
 } catch (error) {
   if (progress && error.status >= 400 && error.status < 500 && error.status !== 408) progress.pending = false
   throw error
 }
 if(!positive(saved?.feeStructureId)||!positive(saved?.revision))throw Error('The server did not confirm the saved draft identity or revision. Refresh before retrying.')
 if (progress) { progress.pending = false; progress.saved = saved }
 return saved
}
