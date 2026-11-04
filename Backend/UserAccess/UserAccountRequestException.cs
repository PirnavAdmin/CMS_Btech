namespace BTech.UserAccess;

public sealed class UserAccountRequestException(int statusCode, string code, string message,
    long userId, long? collegeId = null) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
    public string Code { get; } = code;
    public long UserId { get; } = userId;
    public long? CollegeId { get; } = collegeId;
    public int? RetryAfterSeconds { get; init; }
}
