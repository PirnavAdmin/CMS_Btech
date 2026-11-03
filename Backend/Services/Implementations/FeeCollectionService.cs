using BTech.DTOs.Fees;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations;

public sealed class FeeCollectionService : IFeeCollectionService
{
    private readonly IFeeCollectionRepository _repo;
    private readonly ILogger<FeeCollectionService> _logger;
    public FeeCollectionService(IFeeCollectionRepository repo, ILogger<FeeCollectionService> logger)
    { _repo = repo; _logger = logger; }

    public Task<FeeDashboardDto> GetDashboardAsync(FeeDashboardQuery q,long? c,bool s) => _repo.GetDashboardAsync(q,c,s);
    public async Task<PagedResult<FeePendingItemDto>> GetPendingAsync(FeePendingQuery q,long? c,bool s)
    {
        Normalize(q);
        return await _repo.GetPendingAsync(q,c,s);
    }
    public async Task<FeePaymentDto> CreatePaymentAsync(FeePaymentCreateRequest r,long actor,long? c,bool s)
    {
        if (actor<=0) throw new UnauthorizedAccessException("Invalid authenticated user.");
        try
        {
            FeeCollectionValidation.Payment(r);
            _logger.LogInformation("Fee payment validation passed. StudentFeeId={StudentFeeId}, FeeAmount={FeeAmount}, FineAmount={FineAmount}, Mode={Mode}, Actor={Actor}",
                r.StudentFeeId, r.FeeAmount, r.FineAmount, r.PaymentMode, actor);
            var payment = await _repo.CreatePaymentAsync(r,actor,c,s);
            _logger.LogInformation("Fee payment and receipt issued. PaymentId={PaymentId}, ReceiptId={ReceiptId}, StudentFeeId={StudentFeeId}, Total={Total}, Actor={Actor}",
                payment.PaymentId, payment.ReceiptId, payment.StudentFeeId, payment.TotalAmount, actor);
            return payment;
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Fee payment rejected. StudentFeeId={StudentFeeId}, Actor={Actor}, Reason={Reason}", r.StudentFeeId, actor, ex.Message);
            throw;
        }
    }
    public Task<PagedResult<FeeHistoryItemDto>> GetHistoryAsync(FeeHistoryQuery q,long? c,bool s)
    { Normalize(q); if (q.PaymentMode is not null) q.PaymentMode = FeeCollectionValidation.Mode(q.PaymentMode); return _repo.GetHistoryAsync(q,c,s); }
    public Task<PagedResult<FeeFineDto>> GetFinesAsync(FeeFineQuery q,long? c,bool s)
    { Normalize(q); return _repo.GetFinesAsync(q,c,s); }
    public async Task<FeeFineDto> CreateFineAsync(FineCreateRequest r,long actor,long? c,bool s)
    {
        if (actor<=0) throw new UnauthorizedAccessException("Invalid authenticated user.");
        r.FineType=(r.FineType ?? "").Trim().ToUpperInvariant();
        if (r.FineType!="LATE_PAYMENT" && r.FineType!="OTHER") throw new ArgumentException("Invalid fine type.");
        FeeCollectionValidation.Money(r.Amount, nameof(r.Amount));
        if (r.StudentFeeId <= 0) throw new ArgumentException("StudentFeeId must be positive.");
        if (string.IsNullOrWhiteSpace(r.Reason) || r.Reason.Length > 500) throw new ArgumentException("A reason of up to 500 characters is required.");
        r.Reason = r.Reason.Trim();
        var fine = await _repo.CreateFineAsync(r,actor,c,s);
        _logger.LogInformation("Fee fine created. FineId={FineId}, StudentFeeId={StudentFeeId}, Amount={Amount}, Actor={Actor}", fine.FineId, r.StudentFeeId, fine.Amount, actor);
        return fine;
    }
    public async Task<FeeFineDto> WaiveFineAsync(long id,FineWaiveRequest r,long actor,long? c,bool s)
    {
        if(id<=0) throw new ArgumentException("Invalid fine id.");
        if(actor<=0) throw new UnauthorizedAccessException("Invalid authenticated user.");
        FeeCollectionValidation.Money(r.WaivedAmount, nameof(r.WaivedAmount));
        if (string.IsNullOrWhiteSpace(r.Reason) || r.Reason.Length > 500) throw new ArgumentException("A reason of up to 500 characters is required.");
        r.Reason = r.Reason.Trim();
        var fine = await _repo.WaiveFineAsync(id,r,actor,c,s);
        _logger.LogInformation("Fee fine waived. FineId={FineId}, WaivedAmount={WaivedAmount}, Remaining={Remaining}, Actor={Actor}", id, r.WaivedAmount, fine.PendingAmount, actor);
        return fine;
    }
    public async Task<FeeReceiptDto?> GetReceiptAsync(long id,long? c,bool s)
    {
        if (id <= 0) throw new ArgumentException("ReceiptId must be positive.");
        var receipt = await _repo.GetReceiptAsync(id,c,s);
        if (receipt is not null)
        {
            FeeCollectionValidation.Receipt(receipt);
            if (receipt.ReceiptId != id) throw new InvalidOperationException("Receipt ID does not match the requested receipt.");
        }
        _logger.LogInformation("Fee receipt lookup. ReceiptId={ReceiptId}, Found={Found}", id, receipt is not null);
        return receipt;
    }
    public async Task<FeeReceiptDto?> GetReceiptByPaymentAsync(long id,long? c,bool s)
    {
        if (id <= 0) throw new ArgumentException("PaymentId must be positive.");
        var receipt = await _repo.GetReceiptByPaymentAsync(id,c,s);
        if (receipt is not null)
        {
            FeeCollectionValidation.Receipt(receipt);
            if (receipt.PaymentId != id) throw new InvalidOperationException("Receipt does not belong to the requested payment.");
        }
        _logger.LogInformation("Fee receipt by payment lookup. PaymentId={PaymentId}, Found={Found}", id, receipt is not null);
        return receipt;
    }

    static void Normalize(FeePendingQuery q){ q.Page=Math.Max(1,q.Page); q.PageSize=Math.Clamp(q.PageSize,1,100); q.Search=q.Search?.Trim(); }
    static void Normalize(FeeHistoryQuery q){ q.Page=Math.Max(1,q.Page); q.PageSize=Math.Clamp(q.PageSize,1,100); q.Search=q.Search?.Trim(); q.PaymentMode=string.IsNullOrWhiteSpace(q.PaymentMode)?null:q.PaymentMode.Trim().ToUpperInvariant(); }
    static void Normalize(FeeFineQuery q){ q.Page=Math.Max(1,q.Page); q.PageSize=Math.Clamp(q.PageSize,1,100); q.Status=q.Status?.Trim().ToUpperInvariant(); }
}
