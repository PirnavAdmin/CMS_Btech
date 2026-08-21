namespace BTech.DTOs
{
    public class RefreshTokenResponseDto
    {
        public string AccessToken { get; set; } = string.Empty;

        public string RefreshToken { get; set; } = string.Empty;

        public int ExpiresIn { get; set; }

        public DateTime AccessTokenExpiresAt { get; set; }
    }
}