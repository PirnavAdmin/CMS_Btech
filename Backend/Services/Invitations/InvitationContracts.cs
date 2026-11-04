namespace BTech.Services.Invitations;

public sealed record InvitationAccount(long UserId, long? CollegeId, string Email, string FullName="", string CollegeName="", string RoleName="");

public interface IAccountInvitationStore
{
    Task<InvitationAccount> ReserveAsync(long userId, string hash, string purpose,
        DateTime now, DateTime expiresAt, long? actor, string trace);
    Task<bool> FinishDeliveryAsync(InvitationAccount account, string hash, bool accepted,
        string? errorCode, DateTime now, long? actor, string trace);
    Task<(bool Success, string Message)> RedeemAsync(string email, string hash,
        string password, DateTime now, string trace);
}

public sealed class AccountInvitationDeliveryException : Exception
{
    public long UserId { get; }
    public long? CollegeId { get; }
    public string DeliveryStatus { get; }
    public bool SmtpAccepted { get; }
    public bool IsPasswordReset { get; }
    public bool AccountCreated { get; set; }
    public AccountInvitationDeliveryException(InvitationAccount account, string status, bool accepted, bool passwordReset=false)
        : base(accepted
            ? "SMTP accepted the email, but invitation activation could not be confirmed. The account is saved; retry the operation indicated by nextAction after checking server logs."
            : "The password link email could not be sent. The account is saved. Check the email configuration and retry the existing account; do not repeat onboarding.")
    { UserId=account.UserId;CollegeId=account.CollegeId;DeliveryStatus=status;SmtpAccepted=accepted;IsPasswordReset=passwordReset; }
}

// Deliberately contains only safe protocol metadata, not the provider's arbitrary
// text, credentials, message contents, token, or raw exception as InnerException.
public sealed class EmailDeliveryException(string phase, string errorType, string providerCode, int? statusCode)
    : Exception("The SMTP provider did not confirm message acceptance.")
{
    public string Phase { get; } = phase;
    public string ErrorType { get; } = errorType;
    public string ProviderCode { get; } = providerCode;
    public int? ProviderStatusCode { get; } = statusCode;
}
