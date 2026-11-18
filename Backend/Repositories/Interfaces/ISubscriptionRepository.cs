using BTech.DTOs.Subscriptions;
namespace BTech.Repositories.Interfaces;
public interface ISubscriptionRepository
{
    Task<SubscriptionRecord> UpdateAsync(long id, SaveSubscriptionDto request, long actorId, string traceId, CancellationToken cancellationToken);
    Task DeleteAsync(long id, long actorId, string traceId, CancellationToken cancellationToken);
}
