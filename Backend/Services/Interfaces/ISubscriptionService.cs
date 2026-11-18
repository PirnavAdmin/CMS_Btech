using BTech.DTOs.Subscriptions;
namespace BTech.Services.Interfaces;
public interface ISubscriptionService
{
    Task<SubscriptionRecord> UpdateAsync(long id, SaveSubscriptionDto request, long actorId, string traceId, CancellationToken cancellationToken);
    Task DeleteAsync(long id, long actorId, string traceId, CancellationToken cancellationToken);
}
