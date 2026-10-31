using BTech.DTOs.Fees;
using System.Diagnostics.CodeAnalysis;

namespace BTech.Services.Fees;

public sealed class FeePlanException : Exception
{
    public int StatusCode { get; }
    public FeePlanException(int statusCode, string message) : base(message) => StatusCode = statusCode;
}

public static class FeePlanRules
{
    public static readonly string[] States = { "DRAFT", "SUBMITTED", "APPROVED", "PUBLISHED", "ARCHIVED" };
    public const decimal MaximumAmount = 9999999999.99m;
    public static string? Clean(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();
    public static bool Same(string? a, string? b) => string.Equals(Clean(a), Clean(b), StringComparison.OrdinalIgnoreCase);
    public static void Require([DoesNotReturnIf(false)] bool condition, string message, int status = 400)
    {
        if (!condition) throw new FeePlanException(status, message);
    }
    public static void Money(decimal amount, string field, bool positive = false) => Require(
        amount >= (positive ? 0.01m : 0m) && amount <= MaximumAmount && decimal.Round(amount, 2) == amount,
        $"{field} must be {(positive ? "positive" : "nonnegative")}, at most {MaximumAmount}, with at most two decimal places.");

    public static void ValidateScope(AdmissionFeePlanQuery q)
    {
        Require(q.CollegeId > 0 && q.AcademicYearId > 0 && q.CourseId > 0 && q.BranchId > 0 && q.SemesterId > 0,
            "collegeId, academicYearId, courseId, branchId and semesterId must be positive server IDs.");
        Require(Clean(q.Batch) is { Length: <= 50 }, "batch is required and must be at most 50 characters.");
        Require(q.Quota?.Length is not > 100 && q.StudentCategory?.Length is not > 100, "quota and studentCategory must be at most 100 characters.");
    }

    public static void Validate(AcademicFeePlanRequest p)
    {
        ValidateScope(Scope(p));
        Require(Clean(p.Code) is { Length: <= 80 } && Clean(p.Name) is { Length: <= 150 }, "Plan code and name are required (80/150 characters maximum).");
        Require(p.FeeCategoryId > 0, "feeCategoryId must identify an existing fee category.");
        p.Code = p.Code.Trim(); p.Name = p.Name.Trim(); p.Batch = p.Batch.Trim();
        p.Quota = Clean(p.Quota); p.StudentCategory = Clean(p.StudentCategory);
        p.Cycle = (Clean(p.Cycle) ?? "").ToUpperInvariant();
        p.PaymentMode = (Clean(p.PaymentMode) ?? "").ToUpperInvariant();
        p.CurrencyCode = (Clean(p.CurrencyCode) ?? "").ToUpperInvariant();
        Require(p.Cycle is "SEMESTER" or "ANNUAL" or "ONE_TIME", "cycle must be SEMESTER, ANNUAL or ONE_TIME.");
        Require(p.PaymentMode is "FULL_PAYMENT" or "INSTALLMENTS", "paymentMode must be FULL_PAYMENT or INSTALLMENTS.");
        Require(p.CurrencyCode.Length == 3 && p.CurrencyCode.All(c => c is >= 'A' and <= 'Z'), "currencyCode must contain three letters.");
        Require(p.EffectiveFrom.Year >= 1000 && p.EffectiveTo.Year >= 1000 && p.EffectiveTo.Date >= p.EffectiveFrom.Date,
            "Valid effectiveFrom and effectiveTo dates are required; effectiveTo cannot precede effectiveFrom.");
        p.EffectiveFrom = p.EffectiveFrom.Date; p.EffectiveTo = p.EffectiveTo.Date; p.DueDate = p.DueDate?.Date;
        Money(p.TotalAmount, "totalAmount", true);
        Require(p.Components is { Count: > 0 and <= 100 }, "Between 1 and 100 fee components are required.");
        var codes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var c in p.Components)
        {
            Require(c != null, "Fee components cannot be null.");
            Require(Clean(c!.Code) is { Length: <= 50 } && Clean(c.Name) is { Length: <= 150 }, "Every component needs a code and name (50/150 characters maximum).");
            c.Code = c.Code.Trim(); c.Name = c.Name.Trim();
            Require(codes.Add(c.Code), $"Duplicate component code: {c.Code}.");
            Money(c.Amount, $"Component {c.Code} amount");
        }
        Require(p.Components.Sum(c => c.Amount) == p.TotalAmount, "Component amounts must add up exactly to totalAmount.");
        Require(p.Installments != null && p.Installments.Count <= 100, "installments must be an array with at most 100 entries.");
        if (p.PaymentMode == "FULL_PAYMENT")
        {
            Require(p.DueDate.HasValue, "dueDate is required for FULL_PAYMENT.");
            Require(p.Installments.Count == 0 || (p.Installments.Count == 1 && p.Installments[0] != null &&
                p.Installments[0].Number == 1 && p.Installments[0].Amount == p.TotalAmount && p.Installments[0].DueDate.Date == p.DueDate),
                "FULL_PAYMENT accepts only one schedule entry equal to totalAmount and dueDate.");
            p.Installments = new() { new() { Number = 1, Amount = p.TotalAmount, DueDate = p.DueDate!.Value } };
        }
        else Require(p.Installments.Count >= 2, "INSTALLMENTS requires at least two installments.");
        DateTime? previousDate = null;
        for (var i = 0; i < p.Installments.Count; i++)
        {
            var row = p.Installments[i];
            Require(row != null, "Installments cannot be null.");
            Require(row!.Number == i + 1, "Installments must be numbered consecutively from 1 in schedule order.");
            Money(row.Amount, $"Installment {row.Number} amount", true);
            row.DueDate = row.DueDate.Date;
            Require(row.DueDate >= p.EffectiveFrom && row.DueDate <= p.EffectiveTo, "Every due date must lie within the effective date range.");
            Require(!previousDate.HasValue || row.DueDate >= previousDate, "Installment due dates must be in chronological order.");
            previousDate = row.DueDate;
        }
        Require(p.Installments.Sum(x => x.Amount) == p.TotalAmount, "Installment amounts must add up exactly to totalAmount.");
        if (p.PaymentMode == "INSTALLMENTS")
        {
            Require(!p.DueDate.HasValue || p.DueDate == p.Installments[^1].DueDate, "dueDate must equal the final installment due date.");
            p.DueDate = p.Installments[^1].DueDate;
        }
    }

    public static void Transition(string from, string to)
    {
        var allowed = (from, to) is ("DRAFT", "SUBMITTED") or ("SUBMITTED", "APPROVED")
            or ("SUBMITTED", "DRAFT") or ("APPROVED", "DRAFT") or ("APPROVED", "PUBLISHED")
            or ("PUBLISHED", "ARCHIVED") or ("DRAFT", "ARCHIVED") or ("APPROVED", "ARCHIVED");
        Require(allowed, $"Cannot change a fee plan from {from} to {to}.", 409);
    }
    public static AdmissionFeePlanQuery Scope(AcademicFeePlanRequest p) => new()
    { CollegeId = p.CollegeId, AcademicYearId = p.AcademicYearId, CourseId = p.CourseId, BranchId = p.BranchId,
      SemesterId = p.SemesterId, Batch = p.Batch, Quota = p.Quota, StudentCategory = p.StudentCategory };

    public static bool Matches(AcademicFeePlanRequest p, AdmissionFeePlanQuery q) =>
        p.CollegeId == q.CollegeId && p.AcademicYearId == q.AcademicYearId && p.CourseId == q.CourseId &&
        p.BranchId == q.BranchId && p.SemesterId == q.SemesterId && Same(p.Batch, q.Batch) &&
        (Clean(p.Quota) == null || Same(p.Quota, q.Quota)) &&
        (Clean(p.StudentCategory) == null || Same(p.StudentCategory, q.StudentCategory));

    public static bool Available(AcademicFeePlanDto p, AdmissionFeePlanQuery q, DateTime today) =>
        p.Status == "PUBLISHED" && p.EffectiveFrom.Date <= today.Date && p.EffectiveTo.Date >= today.Date && Matches(p, q);
}
