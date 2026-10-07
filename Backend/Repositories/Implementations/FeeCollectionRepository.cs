using System.Data;
using BTech.Data;
using BTech.DTOs.Fees;
using BTech.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace BTech.Repositories.Implementations;

public sealed class FeeCollectionRepository : IFeeCollectionRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<FeeCollectionRepository> _logger;
    public FeeCollectionRepository(ApplicationDbContext context,ILogger<FeeCollectionRepository> logger){_context=context;_logger=logger;}

    private async Task<T> Db<T>(Func<IDbConnection,Task<T>> action)
    {
        var cn=_context.Database.GetDbConnection();
        var close=cn.State!=ConnectionState.Open;
        if(close) await cn.OpenAsync();
        try{return await action(cn);}
        catch(MySqlException ex) when(ex.SqlState=="45000"){throw new ArgumentException(ex.Message,ex);}
        finally{if(close) await cn.CloseAsync();}
    }

    public Task<FeeDashboardDto> GetDashboardAsync(FeeDashboardQuery q,long? c,bool s)=>Db(async cn=>{
        using var m=await cn.QueryMultipleAsync("sp_fc_dashboard",new{
            p_college_id=c,p_super_admin=s?1:0,p_academic_year_id=q.AcademicYearId,p_course_id=q.CourseId,
            p_branch_id=q.BranchId,p_semester_id=q.SemesterId,p_from_date=q.FromDate,p_to_date=q.ToDate
        },commandType:CommandType.StoredProcedure);
        var d=await m.ReadFirstAsync<FeeDashboardDto>();
        d.CollectionTrend=(await m.ReadAsync<FeeCollectionTrendDto>()).AsList();
        d.ByCategory=(await m.ReadAsync<FeeCategoryCollectionDto>()).AsList();
        d.ByPaymentMode=(await m.ReadAsync<PaymentModeSummaryDto>()).AsList();
        return d;
    });

    public Task<PagedResult<FeePendingItemDto>> GetPendingAsync(FeePendingQuery q,long? c,bool s)=>Db(async cn=>{
        var p=new DynamicParameters(new{
            p_college_id=c,p_super_admin=s?1:0,p_student_id=q.StudentId,p_academic_year_id=q.AcademicYearId,
            p_course_id=q.CourseId,p_branch_id=q.BranchId,p_semester_id=q.SemesterId,p_overdue_only=q.OverdueOnly?1:0,
            p_search=q.Search,p_due_from=q.DueFrom,p_due_to=q.DueTo,p_offset=(q.Page-1)*q.PageSize,p_limit=q.PageSize
        });
        using var m=await cn.QueryMultipleAsync("sp_fc_pending",p,commandType:CommandType.StoredProcedure);
        var items=(await m.ReadAsync<FeePendingItemDto>()).AsList(); var total=await m.ReadFirstAsync<long>();
        return new PagedResult<FeePendingItemDto>{Items=items,Page=q.Page,PageSize=q.PageSize,TotalCount=total};
    });

    public Task<FeePaymentDto> CreatePaymentAsync(FeePaymentCreateRequest r,long actor,long? c,bool s)=>Db(async cn=>{
        using var m=await cn.QueryMultipleAsync("sp_fc_payment_create",new{
            p_student_fee_id=r.StudentFeeId,p_fee_amount=r.FeeAmount,p_fine_amount=r.FineAmount,p_fine_id=r.FineId,
            p_payment_mode=r.PaymentMode,p_transaction_reference=r.TransactionReference,p_remarks=r.Remarks,
            p_payment_date=r.PaymentDate,p_actor_id=actor,p_college_id=c,p_super_admin=s?1:0
        },commandType:CommandType.StoredProcedure);
        return await m.ReadFirstAsync<FeePaymentDto>();
    });

    public Task<PagedResult<FeeHistoryItemDto>> GetHistoryAsync(FeeHistoryQuery q,long? c,bool s)=>Db(async cn=>{
        using var m=await cn.QueryMultipleAsync("sp_fc_history",new{
            p_college_id=c,p_super_admin=s?1:0,p_student_id=q.StudentId,p_payment_id=q.PaymentId,p_search=q.Search,
            p_payment_mode=q.PaymentMode,p_from_date=q.FromDate,p_to_date=q.ToDate,p_offset=(q.Page-1)*q.PageSize,p_limit=q.PageSize
        },commandType:CommandType.StoredProcedure);
        var items=(await m.ReadAsync<FeeHistoryItemDto>()).AsList(); var total=await m.ReadFirstAsync<long>();
        return new PagedResult<FeeHistoryItemDto>{Items=items,Page=q.Page,PageSize=q.PageSize,TotalCount=total};
    });

    public Task<PagedResult<FeeFineDto>> GetFinesAsync(FeeFineQuery q,long? c,bool s)=>Db(async cn=>{
        using var m=await cn.QueryMultipleAsync("sp_fc_fines",new{
            p_college_id=c,p_super_admin=s?1:0,p_student_id=q.StudentId,p_student_fee_id=q.StudentFeeId,p_status=q.Status,
            p_pending_only=q.PendingOnly?1:0,p_offset=(q.Page-1)*q.PageSize,p_limit=q.PageSize
        },commandType:CommandType.StoredProcedure);
        var items=(await m.ReadAsync<FeeFineDto>()).AsList(); var total=await m.ReadFirstAsync<long>();
        return new PagedResult<FeeFineDto>{Items=items,Page=q.Page,PageSize=q.PageSize,TotalCount=total};
    });

    public Task<FeeFineDto> CreateFineAsync(FineCreateRequest r,long actor,long? c,bool s)=>Db(async cn=>{
        return await cn.QueryFirstAsync<FeeFineDto>("sp_fc_fine_create",new{
            p_student_fee_id=r.StudentFeeId,p_fine_type=r.FineType,p_reason=r.Reason,p_amount=r.Amount,
            p_assessed_on=r.AssessedOn,p_actor_id=actor,p_college_id=c,p_super_admin=s?1:0
        },commandType:CommandType.StoredProcedure);
    });

    public Task<FeeFineDto> WaiveFineAsync(long id,FineWaiveRequest r,long actor,long? c,bool s)=>Db(async cn=>{
        return await cn.QueryFirstAsync<FeeFineDto>("sp_fc_fine_waive",new{
            p_fine_id=id,p_waived_amount=r.WaivedAmount,p_reason=r.Reason,p_actor_id=actor,p_college_id=c,p_super_admin=s?1:0
        },commandType:CommandType.StoredProcedure);
    });

    public Task<FeeReceiptDto?> GetReceiptAsync(long id,long? c,bool s)=>Db(cn=>cn.QueryFirstOrDefaultAsync<FeeReceiptDto>("sp_fc_receipt_get",new{p_receipt_id=id,p_payment_id=(long?)null,p_college_id=c,p_super_admin=s?1:0},commandType:CommandType.StoredProcedure));
    public Task<FeeReceiptDto?> GetReceiptByPaymentAsync(long id,long? c,bool s)=>Db(cn=>cn.QueryFirstOrDefaultAsync<FeeReceiptDto>("sp_fc_receipt_get",new{p_receipt_id=(long?)null,p_payment_id=id,p_college_id=c,p_super_admin=s?1:0},commandType:CommandType.StoredProcedure));
}
