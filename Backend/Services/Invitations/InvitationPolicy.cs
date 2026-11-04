namespace BTech.Services.Invitations;

public static class InvitationPolicy
{
    public const int CooldownSeconds = 60;
    public const int SendingLeaseSeconds = 300;
    public static int RetryAfter(DateTime issuedAt, string status, DateTime now)
    {
        var ready = issuedAt.AddSeconds(status == "sending" ? SendingLeaseSeconds : CooldownSeconds);
        return Math.Max(0, (int)Math.Ceiling((ready - now).TotalSeconds));
    }
}
