namespace BTech.DTOs.Shortage;

public class ShortageNotificationDto
{
    public long StudentId { get; set; }

    public long ShortageId { get; set; }

    public string NotificationType { get; set; } = "Attendance Shortage";

    public string Message { get; set; } = string.Empty;

    public long SentBy { get; set; }
}