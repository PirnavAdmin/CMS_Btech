namespace BTech.DTOs
{
    public class VerifyOtpRequestDto
    {
        public string? Email { get; set; }

        public string? Mobile { get; set; }

        public string OtpCode { get; set; } = string.Empty;

        public string Purpose { get; set; } = "FORGOT_PASSWORD";
    }
}