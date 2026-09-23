namespace BTech.DTOs
{
    public class GenerateOtpRequestDto
    {
        public string? Email { get; set; }

        public string? Mobile { get; set; }

        public string Purpose { get; set; } = "FORGOT_PASSWORD";
    }
}