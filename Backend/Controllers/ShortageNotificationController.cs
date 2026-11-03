using BTech.DTOs.Shortage;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1.Shortage;

[ApiController]
[Route("api/v1/shortage-notifications")]
[Authorize]
public class ShortageNotificationController : ControllerBase
{
    private readonly IShortageNotificationService _service;

    public ShortageNotificationController(
        IShortageNotificationService service)
    {
        _service = service;
    }

    // =====================================================
    // POST - SEND NOTIFICATION
    // =====================================================

    [HttpPost("send")]
    public async Task<IActionResult> Send(
        [FromBody] ShortageNotificationDto dto)
    {
        try
        {
            var result = await _service.SendAsync(dto);

            return StatusCode(201, new
            {
                success = true,
                message = "Shortage notification sent successfully.",
                data = result
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                success = false,
                message = ex.Message
            });
        }
    }

    // =====================================================
    // GET - TRACK / LIST
    // =====================================================

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] long? studentId,
        [FromQuery] long? shortageId,
        [FromQuery] string? status)
    {
        var result = await _service.GetAllAsync(
            studentId,
            shortageId,
            status);

        return Ok(new
        {
            success = true,
            data = result
        });
    }

    // =====================================================
    // GET - BY ID
    // =====================================================

    [HttpGet("{notificationId:long}")]
    public async Task<IActionResult> GetById(
        long notificationId)
    {
        var result =
            await _service.GetByIdAsync(notificationId);

        if (result == null)
        {
            return NotFound(new
            {
                success = false,
                message = "Notification not found."
            });
        }

        return Ok(new
        {
            success = true,
            data = result
        });
    }

    // =====================================================
    // PUT - UPDATE STATUS
    // =====================================================

    [HttpPut("{notificationId:long}/status")]
    public async Task<IActionResult> UpdateStatus(
        long notificationId,
        [FromBody] UpdateNotificationStatusDto dto)
    {
        try
        {
            var result =
                await _service.UpdateStatusAsync(
                    notificationId,
                    dto);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Notification not found."
                });
            }

            return Ok(new
            {
                success = true,
                message = "Notification status updated successfully.",
                data = result
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                success = false,
                message = ex.Message
            });
        }
    }
}