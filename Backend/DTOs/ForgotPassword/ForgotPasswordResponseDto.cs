namespace BTech.DTOs.ForgotPassword
{
    public class ForgotPasswordResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? DeliveryDestination { get; set; }
    }
}
