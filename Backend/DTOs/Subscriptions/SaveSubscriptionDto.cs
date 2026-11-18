using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Subscriptions;

public sealed class SaveSubscriptionDto
{
    [Range(1, long.MaxValue)]
    public long OrganizationId { get; set; }

    [Required]
    [StringLength(120, MinimumLength = 1)]
    public string PlanName { get; set; } = string.Empty;

    [Required]
    [StringLength(30)]
    public string BillingCycle { get; set; } = string.Empty;

    [Range(typeof(decimal), "0", "9999999999.99")]
    public decimal Price { get; set; }

    [Range(1, int.MaxValue)]
    public int MaximumUsers { get; set; }

    [Required]
    [StringLength(20)]
    public string Status { get; set; } = string.Empty;

    [Required]
    public DateOnly? StartDate { get; set; }

    [Required]
    public DateOnly? EndDate { get; set; }
}

public sealed record SubscriptionRecord(
    long SubscriptionId, long OrganizationId, string OrganizationName, string PlanName,
    string BillingCycle, decimal Price, int MaximumUsers, string Status,
    string StartDate, string EndDate, DateTime CreatedAt, DateTime? UpdatedAt);
