using System.Data.Common;
using System.Text.Json;
using BTech.DTOs.Fees;
using BTech.Repositories.Implementations;
using Dapper;

namespace BTech.Services.Fees;

public sealed record FeeLedgerResult(long AssignmentId,IReadOnlyList<long> StudentFeeIds,int CreatedInstallments);

/// <summary>Materializes the immutable approved admission schedule in the caller's transaction.</summary>
public static class AdmissionFeeLedger
{
    public static async Task<FeeLedgerResult?> EnsureAsync(DbConnection c,DbTransaction tx,long admissionId,long studentId,long actor,string? trace=null)
    {
        var row=await c.QuerySingleOrDefaultAsync("""
            SELECT snap.snapshot_json,snap.college_id,snap.fee_structure_id,s.college_id AS student_college,
              a.IsApproved,a.AdmissionStatus
            FROM admission_fee_plan_snapshots snap
            JOIN studentadmissions a ON a.AdmissionId=snap.admission_id AND a.IsDeleted=0
            JOIN students s ON s.admission_id=a.AdmissionId AND s.student_id=@studentId AND s.deleted_at IS NULL
            WHERE snap.admission_id=@admissionId FOR UPDATE
            """,new{admissionId,studentId},tx);
        if(row is null)return null;
        if(Convert.ToInt32(row.IsApproved)!=1&&!string.Equals((string?)row.AdmissionStatus,"Approved",StringComparison.OrdinalIgnoreCase))
            throw new ContractException(409,"ADMISSION_APPROVAL_REQUIRED","Approve the admission before creating collectible fee installments.");
        var snapshot=JsonSerializer.Deserialize<AdmissionFeePlanSnapshot>((string)row.snapshot_json,AcademicFeePlanStore.Json)
            ?? throw new ContractException(409,"INVALID_FEE_SNAPSHOT","The admission fee snapshot is invalid.");
        var plan=snapshot.Plan;
        if((long)row.student_college!=(long)row.college_id||plan.CollegeId!=(long)row.college_id||plan.FeeStructureId!=(long)row.fee_structure_id)
            throw new ContractException(409,"FEE_SCOPE_MISMATCH","The approved student and fee snapshot must belong to the same college and plan.");
        var installments=plan.PaymentMode=="INSTALLMENTS"?plan.Installments:
            plan.DueDate.HasValue?new List<AcademicFeeInstallment>{new(){Number=1,Amount=plan.TotalAmount,DueDate=plan.DueDate.Value}}:new();
        if(installments.Count==0||installments.Any(x=>x.Number<=0||x.Amount<0||x.DueDate.Year<1000)||installments.Select(x=>x.Number).Distinct().Count()!=installments.Count||installments.Sum(x=>x.Amount)!=plan.TotalAmount)
            throw new ContractException(409,"INVALID_FEE_SCHEDULE","The saved fee schedule must have valid dates and amounts totaling the approved fee.");
        var existing=await c.QuerySingleOrDefaultAsync("SELECT fee_assignment_id,assigned_amount,concession_amount,status FROM fee_assignments WHERE student_id=@studentId AND fee_structure_id=@planId FOR UPDATE",new{studentId,planId=plan.FeeStructureId},tx);
        long assignment;var created=existing is null;
        if(existing is not null)
        {
            if((string)existing.status!="ACTIVE"||(decimal)existing.assigned_amount!=plan.TotalAmount||(decimal)existing.concession_amount!=0)
                throw new ContractException(409,"FEE_LEDGER_CONFLICT","An existing fee assignment differs from the immutable admission snapshot; no charges were overwritten.");
            assignment=(long)existing.fee_assignment_id;
        }
        else assignment=await c.ExecuteScalarAsync<long>("""
            INSERT INTO fee_assignments(assignment_code,student_id,fee_structure_id,assigned_amount,concession_amount,assigned_on,status,created_by)
            VALUES(@code,@studentId,@planId,@amount,0,UTC_DATE(),'ACTIVE',@actor); SELECT LAST_INSERT_ID();
            """,new{code=$"ADM-{admissionId}-P-{plan.FeeStructureId}",studentId,planId=plan.FeeStructureId,amount=plan.TotalAmount,actor},tx);
        var ids=new List<long>();var count=0;
        var saved=(await c.QueryAsync("SELECT student_fee_id,installment_number,amount,due_date,status FROM student_fees WHERE fee_assignment_id=@assignment FOR UPDATE",new{assignment},tx)).ToList();
        if(saved.Any(x=>!installments.Any(y=>y.Number==(int)x.installment_number)))
            throw new ContractException(409,"FEE_LEDGER_CONFLICT","Existing installments differ from the immutable fee schedule.");
        foreach(var due in installments.OrderBy(x=>x.Number))
        {
            var old=saved.SingleOrDefault(x=>(int)x.installment_number==due.Number);
            if(old is not null)
            {
                if((decimal)old.amount!=due.Amount||((DateTime)old.due_date).Date!=due.DueDate.Date||(string)old.status!="ACTIVE")
                    throw new ContractException(409,"FEE_LEDGER_CONFLICT","Existing installments or payments require review; the fee schedule was not overwritten.");
                ids.Add((long)old.student_fee_id);continue;
            }
            ids.Add(await c.ExecuteScalarAsync<long>("""
                INSERT INTO student_fees(fee_code,fee_assignment_id,installment_number,amount,due_date,status,created_by)
                VALUES(@code,@assignment,@number,@amount,@date,'ACTIVE',@actor); SELECT LAST_INSERT_ID();
                """,new{code=$"ADM-{admissionId}-P-{plan.FeeStructureId}-I-{due.Number}",assignment,number=due.Number,amount=due.Amount,date=due.DueDate.Date,actor},tx));
            count++;
        }
        if(created||count>0)await c.ExecuteAsync("""
            INSERT INTO backend_contract_audit(college_id,resource,record_id,action,actor_id,correlation_id)
            VALUES(@college,'admission-fee-ledger',@assignment,'MATERIALIZED',@actor,@trace)
            """,new{college=plan.CollegeId,assignment,actor,trace},tx);
        return new(assignment,ids,count);
    }
}
