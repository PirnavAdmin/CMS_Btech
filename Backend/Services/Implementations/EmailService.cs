using BTech.Models;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace BTech.Services
{
    public class EmailService : IEmailService
    {
        private readonly SmtpSettings _settings;

        public EmailService(IOptions<SmtpSettings> settings)
        {
            _settings = settings.Value;
        }

        // OTP EMAIL
        public async Task SendOtpEmailAsync(
            string recipientEmail,
            string otp,
            string purpose)
        {
            if (string.IsNullOrWhiteSpace(recipientEmail))
            {
                throw new ArgumentException(
                    "Recipient email is required.");
            }

            var message = new MimeMessage();

            message.From.Add(
                new MailboxAddress(
                    _settings.FromName,
                    _settings.FromEmail));

            message.To.Add(
                MailboxAddress.Parse(recipientEmail));

            message.Subject =
                "BTech College - OTP Verification";

            message.Body = new TextPart("plain")
            {
                Text =
                    $"Dear User,\n\n" +
                    $"Your OTP for {purpose} is:\n\n" +
                    $"{otp}\n\n" +
                    $"This OTP is valid for 5 minutes.\n\n" +
                    $"Please do not share this OTP with anyone.\n\n" +
                    $"Regards,\n" +
                    $"BTech College"
            };

            using var smtp = new SmtpClient();

            await smtp.ConnectAsync(
                _settings.Host,
                _settings.Port,
                SecureSocketOptions.StartTls);

            await smtp.AuthenticateAsync(
                _settings.Username,
                _settings.Password);

            await smtp.SendAsync(message);

            await smtp.DisconnectAsync(true);
        }

        // GENERAL EMAIL
        public async Task SendEmailAsync(
            string recipientEmail,
            string subject,
            string body)
        {
            if (string.IsNullOrWhiteSpace(recipientEmail))
            {
                throw new ArgumentException(
                    "Recipient email is required.");
            }

            var message = new MimeMessage();

            message.From.Add(
                new MailboxAddress(
                    _settings.FromName,
                    _settings.FromEmail));

            message.To.Add(
                MailboxAddress.Parse(recipientEmail));

            message.Subject = subject;

            message.Body = new TextPart("html")
            {
                Text = body
            };

            using var smtp = new SmtpClient();

            await smtp.ConnectAsync(
                _settings.Host,
                _settings.Port,
                SecureSocketOptions.StartTls);

            await smtp.AuthenticateAsync(
                _settings.Username,
                _settings.Password);

            await smtp.SendAsync(message);

            await smtp.DisconnectAsync(true);
        }
    }
}