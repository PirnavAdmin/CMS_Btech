using BTech.DTOs.Shortage;
using BTech.Models;

namespace BTech.Services.Interfaces;

public interface IShortageNotificationService
{
    Task<ShortageNotification> SendAsync(
        ShortageNotificationDto dto);

    Task<List<ShortageNotification>> GetAllAsync(
        long? studentId,
        long? shortageId,
        string? status);

    Task<ShortageNotification?> GetByIdAsync(
        long notificationId);

    Task<ShortageNotification?> UpdateStatusAsync(
        long notificationId,
        UpdateNotificationStatusDto dto);
}