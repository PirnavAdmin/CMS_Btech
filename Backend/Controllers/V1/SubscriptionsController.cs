using BTech.Data;
using BTech.DTOs.Subscriptions;
using BTech.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BTech.Controllers.V1;

[ApiController]
[Authorize(Roles = "SUPER_ADMIN")]
[Route("api/v1/subscriptions")]
public sealed class SubscriptionsController(ApplicationDbContext db) : ControllerBase
{
    private static readonly string[] BillingCycles = ["Monthly", "Quarterly", "Half-yearly", "Yearly"];
    private static readonly string[] Statuses = ["Active", "Trial", "Suspended", "Cancelled"];

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var rows = await (from subscription in db.OrganizationSubscriptions.AsNoTracking()
                          join organization in db.Colleges.AsNoTracking().Where(item => item.DeletedAt == null)
                              on subscription.OrganizationId equals organization.CollegeId
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
                         where subscription.SubscriptionId == id
                         select new { Subscription = subscription, organization.CollegeName })
            .FirstOrDefaultAsync();

        return row == null
            ? NotFound(new { success = false, message = "Subscription was not found." })
            : Ok(new { success = true, data = ToRecord(row.Subscription, row.CollegeName) });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveSubscriptionDto request)
    {
        var validation = await Validate(request);
        if (validation != null) return validation;

        var organization = await db.Colleges.AsNoTracking()
            .FirstAsync(item => item.CollegeId == request.OrganizationId);
        var subscription = new OrganizationSubscription();
        Apply(subscription, request);
        db.OrganizationSubscriptions.Add(subscription);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = subscription.SubscriptionId },
            new { success = true, data = ToRecord(subscription, organization.CollegeName) });
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] SaveSubscriptionDto request)
    {
        var subscription = await db.OrganizationSubscriptions
            .FirstOrDefaultAsync(item => item.SubscriptionId == id);
        if (subscription == null)
            return NotFound(new { success = false, message = "Subscription was not found." });

        var validation = await Validate(request);
        if (validation != null) return validation;

        var organization = await db.Colleges.AsNoTracking()
            .FirstAsync(item => item.CollegeId == request.OrganizationId);
        Apply(subscription, request);
        subscription.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new { success = true, data = ToRecord(subscription, organization.CollegeName) });
    }

    private async Task<IActionResult?> Validate(SaveSubscriptionDto request)
    {
        if (request.StartDate is not DateOnly startDate || request.EndDate is not DateOnly endDate || startDate > endDate)
            return BadRequest(new { success = false, message = "End date must be on or after the start date." });

        var cycle = request.BillingCycle.Trim();
        if (!BillingCycles.Contains(cycle, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { success = false, message = "Select a valid billing cycle." });

        var status = request.Status.Trim();
        if (!Statuses.Contains(status, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { success = false, message = "Select a valid subscription status." });

        var organizationExists = await db.Colleges.AnyAsync(organization =>
            organization.CollegeId == request.OrganizationId && organization.DeletedAt == null);
        if (!organizationExists)
            return BadRequest(new { success = false, message = "Select an active organization." });

        return null;
    }

    private static void Apply(OrganizationSubscription target, SaveSubscriptionDto request)
    {
        target.OrganizationId = request.OrganizationId;
        target.PlanName = request.PlanName.Trim();
        target.BillingCycle = BillingCycles.First(value =>
            value.Equals(request.BillingCycle.Trim(), StringComparison.OrdinalIgnoreCase));
        target.Price = decimal.Round(request.Price, 2);
        target.MaximumUsers = request.MaximumUsers;
        target.Status = Statuses.First(value =>
            value.Equals(request.Status.Trim(), StringComparison.OrdinalIgnoreCase));
        target.StartDate = request.StartDate!.Value;
        target.EndDate = request.EndDate!.Value;
    }

    private static object ToRecord(OrganizationSubscription subscription, string organizationName) => new
    {
        subscriptionId = subscription.SubscriptionId,
        organizationId = subscription.OrganizationId,
        organizationName,
        subscription.PlanName,
        subscription.BillingCycle,
        subscription.Price,
        maximumUsers = subscription.MaximumUsers,
        subscription.Status,
        startDate = subscription.StartDate,
        endDate = subscription.EndDate,
        createdAt = subscription.CreatedAt,
        updatedAt = subscription.UpdatedAt,
    };
}
