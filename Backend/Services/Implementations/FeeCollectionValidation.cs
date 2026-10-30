using BTech.DTOs.Fees;

namespace BTech.Services.Implementations;

internal static class FeeCollectionValidation
{
    internal const decimal MaximumAmount = 9999999999.99m; // MySQL DECIMAL(12,2)
    private static readonly HashSet<string> Modes = new(StringComparer.Ordinal)
        { "CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE" };

    internal static void Money(decimal value, string field, bool allowZero = false)
    {
        if (value < 0 || (!allowZero && value == 0) || value > MaximumAmount)
            throw new ArgumentException($"{field} must be {(allowZero ? "zero or greater" : "greater than zero")} and at most {MaximumAmount}.");
        if (decimal.Round(value, 2) != value)
            throw new ArgumentException($"{field} must have at most two decimal places.");
    }

    internal static string Mode(string? value)
    {
        var mode = value?.Trim().ToUpperInvariant() ?? string.Empty;
        if (!Modes.Contains(mode)) throw new ArgumentException("PaymentMode must be CASH, UPI, CARD, BANK_TRANSFER or CHEQUE.");
        return mode;
    }

    internal static void Payment(FeePaymentCreateRequest r)
    {
        if (r.StudentFeeId <= 0) throw new ArgumentException("StudentFeeId must be positive.");
        Money(r.FeeAmount, nameof(r.FeeAmount));
        Money(r.FineAmount, nameof(r.FineAmount), true);
        Money(r.FeeAmount + r.FineAmount, "TotalAmount");
        if (r.FineAmount > 0 && (!r.FineId.HasValue || r.FineId.Value <= 0))
            throw new ArgumentException("A positive FineId is required when FineAmount is greater than zero.");
        if (r.FineAmount == 0 && r.FineId.HasValue)
            throw new ArgumentException("FineId must be omitted when FineAmount is zero.");
        r.PaymentMode = Mode(r.PaymentMode);
        r.TransactionReference = string.IsNullOrWhiteSpace(r.TransactionReference) ? null : r.TransactionReference.Trim();
        if (r.PaymentMode != "CASH" && r.TransactionReference is null)
            throw new ArgumentException("TransactionReference is required for non-cash payments.");
        if (r.TransactionReference?.Length > 150) throw new ArgumentException("TransactionReference cannot exceed 150 characters.");
        if (r.Remarks?.Length > 500) throw new ArgumentException("Remarks cannot exceed 500 characters.");
        if (r.PaymentDate.HasValue && r.PaymentDate.Value.Year < 1000)
            throw new ArgumentException("PaymentDate must be a valid MySQL date (year 1000 or later).");
    }

    internal static void Receipt(FeeReceiptDto r)
    {
        if (r.ReceiptId <= 0 || r.PaymentId <= 0 || string.IsNullOrWhiteSpace(r.ReceiptNumber)
            || string.IsNullOrWhiteSpace(r.PaymentCode) || r.StudentId <= 0)
            throw new InvalidOperationException("Receipt identity is inconsistent. Check the receipt records.");
        if (r.FeeAmount < 0 || r.FineAmount < 0 || r.TotalAmount <= 0
            || r.TotalAmount != r.FeeAmount + r.FineAmount || r.TotalAmount > MaximumAmount
            || decimal.Round(r.TotalAmount, 2) != r.TotalAmount)
            throw new InvalidOperationException("Receipt amounts are inconsistent with its payment.");
        if (!Modes.Contains(r.PaymentMode) || (r.PaymentMode != "CASH" && string.IsNullOrWhiteSpace(r.TransactionReference)))
            throw new InvalidOperationException("Receipt payment mode or transaction reference is invalid.");
    }
}
