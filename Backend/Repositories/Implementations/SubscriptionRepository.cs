using System.Data;
using BTech.DTOs.Subscriptions;
using BTech.Repositories.Interfaces;
using Dapper;
using MySqlConnector;

namespace BTech.Repositories.Implementations;

public sealed class SubscriptionRepository(IConfiguration configuration) : ISubscriptionRepository
{
    public Task<SubscriptionRecord> UpdateAsync(long id, SaveSubscriptionDto request,
        long actorId, string traceId, CancellationToken cancellationToken) =>
        ExecuteAsync("sp_cms_subscription_update", new
        {
            p_id = id,
            p_organization_id = request.OrganizationId,
            p_plan_name = request.PlanName.Trim(),
            p_cycle = request.BillingCycle,
            p_price = decimal.Round(request.Price, 2),
            p_maximum_users = request.MaximumUsers,
            p_status = request.Status,
            p_start_date = request.StartDate!.Value.ToDateTime(TimeOnly.MinValue),
            p_end_date = request.EndDate!.Value.ToDateTime(TimeOnly.MinValue),
            p_actor_id = actorId,
            p_trace_id = traceId,
        }, (db, command) => db.QuerySingleAsync<SubscriptionRecord>(command), cancellationToken);

    public Task DeleteAsync(long id, long actorId, string traceId, CancellationToken cancellationToken) =>
        ExecuteAsync("sp_cms_subscription_delete", new
        {
            p_id = id,
            p_actor_id = actorId,
            p_trace_id = traceId,
        }, (db, command) => db.ExecuteAsync(command), cancellationToken);

    private async Task<T> ExecuteAsync<T>(string procedure, object parameters,
        Func<MySqlConnection, CommandDefinition, Task<T>> execute, CancellationToken cancellationToken)
    {
        await using var db = new MySqlConnection(configuration.GetConnectionString("DefaultConnection"));
        await db.OpenAsync(cancellationToken);
        await using var transaction = await db.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        var command = new CommandDefinition(procedure, parameters, transaction,
            commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
        var result = await execute(db, command);
        await transaction.CommitAsync(cancellationToken);
        return result;
    }
}
