using BTech.Task_TimetableEntries.DTOs;
using BTech.Task_TimetableEntries.Exceptions;
using BTech.Task_TimetableEntries.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1;

[ApiController]
[Route("api/v1/timetable-entries")]
public sealed class TimetableEntriesController : ControllerBase
{
    private readonly TimetableEntryRepository _repository;
    private readonly ILogger<TimetableEntriesController> _logger;

    public TimetableEntriesController(
        IConfiguration configuration,
        ILogger<TimetableEntriesController> logger)
    {
        _repository = new TimetableEntryRepository(configuration);
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateTimetableEntryRequest request)
    {
        try
        {
            var id = await _repository.CreateAsync(request);
            return Created($"/api/v1/timetable-entries/{id}", new
            {
                success = true,
                message = "Timetable entry created successfully.",
                timetableEntryId = id
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (FacultyDoubleBookingException ex)
        {
            return Conflict(new { success = false, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating timetable entry.");
            return StatusCode(500, new
            {
                success = false,
                message = "An unexpected error occurred while creating the timetable entry."
            });
        }
    }

    [HttpPut("{timetableEntryId:long}")]
    public async Task<IActionResult> Update(
        long timetableEntryId,
        [FromBody] UpdateTimetableEntryRequest request)
    {
        try
        {
            await _repository.UpdateAsync(timetableEntryId, request);
            return Ok(new
            {
                success = true,
                message = "Timetable entry updated successfully."
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (FacultyDoubleBookingException ex)
        {
            return Conflict(new { success = false, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating timetable entry {Id}.", timetableEntryId);
            return StatusCode(500, new
            {
                success = false,
                message = "An unexpected error occurred while updating the timetable entry."
            });
        }
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] long? facultyId,
        [FromQuery] long? timetableId,
        [FromQuery] string? dayOfWeek)
    {
        try
        {
            var rows = await _repository.ListAsync(facultyId, timetableId, dayOfWeek);
            return Ok(new { success = true, count = rows.Count, data = rows });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing timetable entries.");
            return StatusCode(500, new
            {
                success = false,
                message = "An unexpected error occurred while retrieving timetable entries."
            });
        }
    }

    [HttpDelete("{timetableEntryId:long}")]
    public async Task<IActionResult> Delete(long timetableEntryId)
    {
        try
        {
            await _repository.DeleteAsync(timetableEntryId);
            return Ok(new
            {
                success = true,
                message = "Timetable entry deactivated successfully."
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting timetable entry {Id}.", timetableEntryId);
            return StatusCode(500, new
            {
                success = false,
                message = "An unexpected error occurred while deleting the timetable entry."
            });
        }
    }
}
