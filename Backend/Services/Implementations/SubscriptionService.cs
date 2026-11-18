using BTech.DTOs.Subscriptions;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations;

public sealed class SubscriptionService(ISubscriptionRepository repository) : ISubscriptionService
{
    private static readonly string[] BillingCycles = ["Monthly", "Quarterly", "Half-yearly", "Yearly"];
    private static readonly string[] Statuses = ["Active", "Trial", "Suspended", "Cancelled"];

    public static string? Normalize(SaveSubscriptionDto request, bool requireLaterEndDate)
    {
        if (request.StartDate?.Year < 1000 || request.EndDate?.Year < 1000)
            return "Enter a valid subscription start and end date.";

        if (request.StartDate is not DateOnly startDate || request.EndDate is not DateOnly endDate ||
            endDate < startDate || (requireLaterEndDate && endDate == startDate))
            return requireLaterEndDate
                ? "End date must be later than the start date."
                : "End date must be on or after the start date.";

        if (string.IsNullOrWhiteSpace(request.PlanName))
            return "Enter a subscription plan name.";

        var cycle = BillingCycles.FirstOrDefault(value =>
            value.Equals((request.BillingCycle ?? "").Trim(), StringComparison.OrdinalIgnoreCase));
        if (cycle == null) return "Select a valid billing cycle.";

        var status = Statuses.FirstOrDefault(value =>
            value.Equals((request.Status ?? "").Trim(), StringComparison.OrdinalIgnoreCase));
        if (status == null) return "Select a valid subscription status.";

        if (request.Price < 0 || request.Price > 9999999999.99m) return "Price must be nonnegative and within the supported range.";
        if (request.MaximumUsers <= 0) return "Maximum users must be a positive integer.";
        request.BillingCycle = cycle;
        request.Status = status;
        return null;
    }

    public Task<SubscriptionRecord> UpdateAsync(long id, SaveSubscriptionDto request, long actorId,
        string traceId, CancellationToken cancellationToken) =>
        repository.UpdateAsync(id, request, actorId, traceId, cancellationToken);

    public Task DeleteAsync(long id, long actorId, string traceId, CancellationToken cancellationToken) =>
        repository.DeleteAsync(id, actorId, traceId, cancellationToken);
}
