using BTech.DTOs.Fees;

namespace BTech.Repositories.Interfaces;
public interface IFeeCollectionRepository
{
    Task<FeeDashboardDto> GetDashboardAsync(FeeDashboardQuery q, long? collegeId, bool superAdmin);
    Task<PagedResult<FeePendingItemDto>> GetPendingAsync(FeePendingQuery q, long? collegeId, bool superAdmin);
    Task<FeePaymentDto> CreatePaymentAsync(FeePaymentCreateRequest r, long actorId, long? collegeId, bool superAdmin);
    Task<PagedResult<FeeHistoryItemDto>> GetHistoryAsync(FeeHistoryQuery q, long? collegeId, bool superAdmin);
    Task<PagedResult<FeeFineDto>> GetFinesAsync(FeeFineQuery q, long? collegeId, bool superAdmin);
    Task<FeeFineDto> CreateFineAsync(FineCreateRequest r, long actorId, long? collegeId, bool superAdmin);
    Task<FeeFineDto> WaiveFineAsync(long fineId, FineWaiveRequest r, long actorId, long? collegeId, bool superAdmin);
    Task<FeeReceiptDto?> GetReceiptAsync(long receiptId, long? collegeId, bool superAdmin);
    Task<FeeReceiptDto?> GetReceiptByPaymentAsync(long paymentId, long? collegeId, bool superAdmin);
}
