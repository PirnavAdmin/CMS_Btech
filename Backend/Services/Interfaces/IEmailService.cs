namespace BTech.Services
{
    public interface IEmailService
    {
        Task SendOtpEmailAsync(
            string recipientEmail,
            string otp,
            string purpose);

        Task SendEmailAsync(
            string recipientEmail,
            string subject,
            string body);
    }
}