using BTech.DTOs.Fees;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations;

public sealed class FeeCollectionService : IFeeCollectionService
{
    private readonly IFeeCollectionRepository _repo;
    public FeeCollectionService(IFeeCollectionRepository repo) => _repo = repo;

    public Task<FeeDashboardDto> GetDashboardAsync(FeeDashboardQuery q,long? c,bool s) => _repo.GetDashboardAsync(q,c,s);
    public async Task<PagedResult<FeePendingItemDto>> GetPendingAsync(FeePendingQuery q,long? c,bool s)
    {
        Normalize(q);
        return await _repo.GetPendingAsync(q,c,s);
    }
    public async Task<FeePaymentDto> CreatePaymentAsync(FeePaymentCreateRequest r,long actor,long? c,bool s)
    {
        if (actor<=0) throw new UnauthorizedAccessException("Invalid authenticated user.");
        r.PaymentMode=r.PaymentMode.Trim().ToUpperInvariant();
        if (!new[]{"CASH","UPI","CARD","BANK_TRANSFER","CHEQUE"}.Contains(r.PaymentMode))
            throw new ArgumentException("Invalid payment mode.");
        if (r.FeeAmount<=0) throw new ArgumentException("FeeAmount must be greater than zero.");
        if (r.FineAmount<0) throw new ArgumentException("FineAmount cannot be negative.");
        if (r.FineAmount>0 && r.FineId is null) throw new ArgumentException("FineId is required when FineAmount is greater than zero.");
        if (r.PaymentMode!="CASH" && string.IsNullOrWhiteSpace(r.TransactionReference))
            throw new ArgumentException("TransactionReference is required for non-cash payments.");
        return await _repo.CreatePaymentAsync(r,actor,c,s);
    }
    public Task<PagedResult<FeeHistoryItemDto>> GetHistoryAsync(FeeHistoryQuery q,long? c,bool s)
    { Normalize(q); return _repo.GetHistoryAsync(q,c,s); }
    public Task<PagedResult<FeeFineDto>> GetFinesAsync(FeeFineQuery q,long? c,bool s)
    { Normalize(q); return _repo.GetFinesAsync(q,c,s); }
    public async Task<FeeFineDto> CreateFineAsync(FineCreateRequest r,long actor,long? c,bool s)
    {
        if (actor<=0) throw new UnauthorizedAccessException("Invalid authenticated user.");
        r.FineType=r.FineType.Trim().ToUpperInvariant();
        if (r.FineType!="LATE_PAYMENT" && r.FineType!="OTHER") throw new ArgumentException("Invalid fine type.");
        if (r.Amount<=0) throw new ArgumentException("Amount must be greater than zero.");
        return await _repo.CreateFineAsync(r,actor,c,s);
    }
    public async Task<FeeFineDto> WaiveFineAsync(long id,FineWaiveRequest r,long actor,long? c,bool s)
    {
        if(id<=0) throw new ArgumentException("Invalid fine id.");
        if(actor<=0) throw new UnauthorizedAccessException("Invalid authenticated user.");
        if(r.WaivedAmount<=0) throw new ArgumentException("WaivedAmount must be greater than zero.");
        return await _repo.WaiveFineAsync(id,r,actor,c,s);
    }
    public Task<FeeReceiptDto?> GetReceiptAsync(long id,long? c,bool s) => _repo.GetReceiptAsync(id,c,s);
    public Task<FeeReceiptDto?> GetReceiptByPaymentAsync(long id,long? c,bool s) => _repo.GetReceiptByPaymentAsync(id,c,s);

    static void Normalize(FeePendingQuery q){ q.Page=Math.Max(1,q.Page); q.PageSize=Math.Clamp(q.PageSize,1,100); q.Search=q.Search?.Trim(); }
    static void Normalize(FeeHistoryQuery q){ q.Page=Math.Max(1,q.Page); q.PageSize=Math.Clamp(q.PageSize,1,100); q.Search=q.Search?.Trim(); q.PaymentMode=q.PaymentMode?.Trim().ToUpperInvariant(); }
    static void Normalize(FeeFineQuery q){ q.Page=Math.Max(1,q.Page); q.PageSize=Math.Clamp(q.PageSize,1,100); q.Status=q.Status?.Trim().ToUpperInvariant(); }
}
