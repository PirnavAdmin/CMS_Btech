using BTech.Data;
using BTech.DTOs.Shortage;
using BTech.Models;
using BTech.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Services.Implementations;

public class ShortageNotificationService
    : IShortageNotificationService
{
    private readonly ApplicationDbContext _context;

    public ShortageNotificationService(
        ApplicationDbContext context)
    {
        _context = context;
    }

    // =====================================================
    // SEND NOTIFICATION
    // =====================================================

    public async Task<ShortageNotification> SendAsync(
        ShortageNotificationDto dto)
    {
        if (dto.StudentId <= 0)
            throw new ArgumentException("Invalid student ID.");

        if (dto.ShortageId <= 0)
            throw new ArgumentException("Invalid shortage ID.");

        if (string.IsNullOrWhiteSpace(dto.Message))
            throw new ArgumentException("Message is required.");

        var notification = new ShortageNotification
        {
            StudentId = dto.StudentId,
            ShortageId = dto.ShortageId,
            NotificationType =
                string.IsNullOrWhiteSpace(dto.NotificationType)
                    ? "Attendance Shortage"
                    : dto.NotificationType.Trim(),
            Message = dto.Message.Trim(),
            Status = "Sent",
            SentAt = DateTime.UtcNow,
            SentBy = dto.SentBy
        };

        _context.ShortageNotifications.Add(notification);

        await _context.SaveChangesAsync();

        return notification;
    }

    // =====================================================
    // GET ALL / TRACK
    // =====================================================

    public async Task<List<ShortageNotification>> GetAllAsync(
        long? studentId,
        long? shortageId,
        string? status)
    {
        var query = _context.ShortageNotifications
            .AsNoTracking()
            .AsQueryable();

        if (studentId.HasValue)
        {
            query = query.Where(x =>
                x.StudentId == studentId.Value);
        }

        if (shortageId.HasValue)
        {
            query = query.Where(x =>
                x.ShortageId == shortageId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(x =>
                x.Status == status);
        }

        return await query
            .OrderByDescending(x => x.SentAt)
            .ToListAsync();
    }

    // =====================================================
    // GET BY ID
    // =====================================================

    public async Task<ShortageNotification?> GetByIdAsync(
        long notificationId)
    {
        return await _context.ShortageNotifications
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.NotificationId == notificationId);
    }

    // =====================================================
    // UPDATE STATUS
    // =====================================================

    public async Task<ShortageNotification?> UpdateStatusAsync(
        long notificationId,
        UpdateNotificationStatusDto dto)
    {
        var notification =
            await _context.ShortageNotifications
                .FirstOrDefaultAsync(x =>
                    x.NotificationId == notificationId);

        if (notification == null)
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(dto.Status))
        {
            throw new ArgumentException(
                "Status is required.");
        }

        notification.Status = dto.Status.Trim();
        notification.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return notification;
    }
}