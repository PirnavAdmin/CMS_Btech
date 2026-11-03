namespace BTech.Services.Interfaces
{
    /// <summary>
    /// Issues single-use, time-limited account setup links and completes first-time password setup.
    /// </summary>
    public interface IAccountSetupService
    {
        Task SendSetupLinkAsync(long userId, string accountType);

        Task<(bool Success, string Message)> CompleteSetupAsync(
            string loginId,
            string token,
            string newPassword,
            string confirmNewPassword);
    }
}
