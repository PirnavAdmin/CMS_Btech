using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models;

[Table("organization_subscriptions")]
public sealed class OrganizationSubscription
{
    [Key]
    [Column("subscription_id")]
    public long SubscriptionId { get; set; }

    [Column("organization_id")]
    public long OrganizationId { get; set; }

    [Required]
    [MaxLength(120)]
    [Column("plan_name")]
    public string PlanName { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    [Column("billing_cycle")]
    public string BillingCycle { get; set; } = string.Empty;

    [Column("price", TypeName = "decimal(12,2)")]
    public decimal Price { get; set; }

    [Column("maximum_users")]
    public int MaximumUsers { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "Active";

    [Column("start_date", TypeName = "date")]
    public DateOnly StartDate { get; set; }

    [Column("end_date", TypeName = "date")]
    public DateOnly EndDate { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }
}
