using System.Globalization;
using System.Security.Claims;
using BTech.Data;
using BTech.DTOs.Subscriptions;
using BTech.Models;
using BTech.Services.Implementations;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace BTech.Controllers.V1;

[ApiController]
[Authorize(Roles = "SUPER_ADMIN")]
[Route("api/v1/subscriptions")]
public sealed class SubscriptionsController(ApplicationDbContext db, ISubscriptionService subscriptions,
    ILogger<SubscriptionsController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var rows = await (from subscription in db.OrganizationSubscriptions.AsNoTracking()
                          join organization in db.Colleges.AsNoTracking().Where(item => item.DeletedAt == null)
                              on subscription.OrganizationId equals organization.CollegeId
                          where subscription.DeletedAt == null
                          orderby subscription.CreatedAt descending
                          select new { Subscription = subscription, organization.CollegeName })
            .ToListAsync();

        return Ok(new { success = true, data = rows.Select(row => ToRecord(row.Subscription, row.CollegeName)) });
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var row = await (from subscription in db.OrganizationSubscriptions.AsNoTracking()
                         join organization in db.Colleges.AsNoTracking().Where(item => item.DeletedAt == null)
                             on subscription.OrganizationId equals organization.CollegeId
                         where subscription.SubscriptionId == id && subscription.DeletedAt == null
                         select new { Subscription = subscription, organization.CollegeName })
            .FirstOrDefaultAsync();

        return row == null
            ? NotFound(new { success = false, message = "Subscription was not found." })
            : Ok(new { success = true, data = ToRecord(row.Subscription, row.CollegeName) });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveSubscriptionDto request)
    {
        if (SubscriptionService.Normalize(request, requireLaterEndDate: false) is { } error)
            return BadRequest(new { success = false, message = error });

        var organizationName = await db.Colleges.AsNoTracking()
            .Where(item => item.CollegeId == request.OrganizationId && item.DeletedAt == null)
            .Select(item => item.CollegeName)
            .FirstOrDefaultAsync();
        if (organizationName == null)
            return BadRequest(new { success = false, message = "Select an active organization." });

        var subscription = new OrganizationSubscription
        {
            OrganizationId = request.OrganizationId,
            PlanName = request.PlanName.Trim(),
            BillingCycle = request.BillingCycle,
            Price = decimal.Round(request.Price, 2),
            MaximumUsers = request.MaximumUsers,
            Status = request.Status,
            StartDate = request.StartDate!.Value,
            EndDate = request.EndDate!.Value,
        };
        db.OrganizationSubscriptions.Add(subscription);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = subscription.SubscriptionId },
            new { success = true, data = ToRecord(subscription, organizationName) });
    }

    [HttpPut("{id:long}")]
    public Task<IActionResult> Update(long id, [FromBody] SaveSubscriptionDto request, CancellationToken cancellationToken) =>
        ExecuteMutation(id, async actorId =>
        {
            if (SubscriptionService.Normalize(request, requireLaterEndDate: true) is { } error)
                return BadRequest(new { success = false, message = error });

            var updated = await subscriptions.UpdateAsync(id, request, actorId, HttpContext.TraceIdentifier, cancellationToken);
            return Ok(new { success = true, data = updated });
        });

    [HttpDelete("{id:long}")]
    public Task<IActionResult> Delete(long id, CancellationToken cancellationToken) =>
        ExecuteMutation(id, async actorId =>
        {
            await subscriptions.DeleteAsync(id, actorId, HttpContext.TraceIdentifier, cancellationToken);
            return NoContent();
        });

    private async Task<IActionResult> ExecuteMutation(long id, Func<long, Task<IActionResult>> execute)
    {
        if (!long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"),
                out var actorId) || actorId <= 0)
            return Unauthorized();
        if (id <= 0)
            return BadRequest(new { success = false, message = "Enter a valid subscription ID." });

        try
        {
            return await execute(actorId);
        }
        catch (MySqlException exception) when (exception.Number is 60001 or 60002 or 60003 or 60004 or 60005)
        {
            return exception.Number switch
            {
                60001 => NotFound(new { success = false, message = "Subscription was not found." }),
                60002 => BadRequest(new { success = false, message = "The subscription must stay with its current organization." }),
                60003 => Conflict(new { success = false, message = "A subscription for this plan and term already exists for the organization." }),
                60004 => Conflict(new { success = false, message = "Only cancelled subscriptions whose term has ended can be deleted." }),
                _ => Conflict(new { success = false, message = "This subscription has a billing dependency that must be reviewed before deletion." }),
            };
        }
        catch (Exception exception) when (!HttpContext.RequestAborted.IsCancellationRequested)
        {
            logger.LogError(exception, "Subscription mutation failed. SubscriptionId={SubscriptionId}, TraceId={TraceId}",
                id, HttpContext.TraceIdentifier);
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                message = "The subscription change could not be completed.",
                correlationId = HttpContext.TraceIdentifier,
            });
        }
    }

    private static SubscriptionRecord ToRecord(OrganizationSubscription subscription, string organizationName) => new(
        subscription.SubscriptionId,
        subscription.OrganizationId,
        organizationName,
        subscription.PlanName,
        subscription.BillingCycle,
        subscription.Price,
        subscription.MaximumUsers,
        subscription.Status,
        subscription.StartDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        subscription.EndDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        subscription.CreatedAt,
        subscription.UpdatedAt);
}
