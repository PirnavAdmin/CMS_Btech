using BTech.Data;
using BTech.DTOs;
using BTech.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BTech.Controllers
{
    [ApiController]
    [Route("api/v1/timetable-entries")]
    public class TimetableEntriesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public TimetableEntriesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // =========================================================
        // CREATE TIMETABLE ENTRY
        // POST: /api/v1/timetable-entries
        // =========================================================
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateTimetableEntryRequest request)
        {
            // 1. Validate classroom
            if (string.IsNullOrWhiteSpace(request.Classroom))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Classroom is required."
                });
            }

            // 2. Validate day
            if (string.IsNullOrWhiteSpace(request.DayOfWeek))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "DayOfWeek is required."
                });
            }

            var day = request.DayOfWeek.Trim().ToUpper();
            var classroom = request.Classroom.Trim();

            // 3. Check timetable slot
            var slot = await _context.TimetableSlots
                .FirstOrDefaultAsync(x =>
                    x.TimetableSlotId == request.TimetableSlotId &&
                    x.Status == 1);

            if (slot == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Timetable slot not found or inactive."
                });
            }

            // 4. Validate slot time
            if (slot.StartTime >= slot.EndTime)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid timetable slot time."
                });
            }

            // 5. Check classroom double booking
            var conflict = await _context.TimetableEntries
                .Where(e =>
                    e.Status == 1 &&
                    e.Classroom != null &&
                    e.Classroom == classroom &&
                    e.DayOfWeek == day)
                .Join(
                    _context.TimetableSlots,
                    entry => entry.TimetableSlotId,
                    timetableSlot => timetableSlot.TimetableSlotId,
                    (entry, timetableSlot) => new
                    {
                        Entry = entry,
                        Slot = timetableSlot
                    })
                .AnyAsync(x =>
                    x.Slot.StartTime < slot.EndTime &&
                    x.Slot.EndTime > slot.StartTime);

            // 6. Return conflict
            if (conflict)
            {
                return Conflict(new
                {
                    success = false,
                    message = "Classroom is already booked for the selected day and time slot.",
                    classroom = classroom,
                    dayOfWeek = day,
                    startTime = slot.StartTime,
                    endTime = slot.EndTime
                });
            }

            // 7. Create timetable entry
            var entry = new TimetableEntry
            {
                TimetableId = request.TimetableId,
                TimetableSlotId = request.TimetableSlotId,
                FacultyId = request.FacultyId,
                SubjectId = request.SubjectId,
                SectionId = request.SectionId,
                DayOfWeek = day,
                Classroom = classroom,
                EntryType = request.EntryType,
                Status = 1,
                CreatedAt = DateTime.UtcNow
            };

            _context.TimetableEntries.Add(entry);

            await _context.SaveChangesAsync();

            // 8. Success
            return CreatedAtAction(
                nameof(GetById),
                new { id = entry.TimetableEntryId },
                new
                {
                    success = true,
                    message = "Timetable entry created successfully.",
                    data = entry
                });
        }


        // =========================================================
        // GET TIMETABLE ENTRY BY ID
        // GET: /api/v1/timetable-entries/{id}
        // =========================================================
        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetById(long id)
        {
            var entry = await _context.TimetableEntries
                .FirstOrDefaultAsync(x =>
                    x.TimetableEntryId == id);

            if (entry == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Timetable entry not found."
                });
            }

            return Ok(new
            {
                success = true,
                data = entry
            });
        }


        // =========================================================
        // UPDATE TIMETABLE ENTRY
        // PUT: /api/v1/timetable-entries/{id}
        // =========================================================
        [HttpPut("{id:long}")]
        public async Task<IActionResult> Update(
            long id,
            [FromBody] CreateTimetableEntryRequest request)
        {
            // 1. Find existing entry
            var existingEntry = await _context.TimetableEntries
                .FirstOrDefaultAsync(x =>
                    x.TimetableEntryId == id);

            if (existingEntry == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Timetable entry not found."
                });
            }

            // 2. Validate classroom
            if (string.IsNullOrWhiteSpace(request.Classroom))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Classroom is required."
                });
            }

            // 3. Validate day
            if (string.IsNullOrWhiteSpace(request.DayOfWeek))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "DayOfWeek is required."
                });
            }

            var day = request.DayOfWeek.Trim().ToUpper();
            var classroom = request.Classroom.Trim();

            // 4. Check timetable slot
            var slot = await _context.TimetableSlots
                .FirstOrDefaultAsync(x =>
                    x.TimetableSlotId == request.TimetableSlotId &&
                    x.Status == 1);

            if (slot == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Timetable slot not found or inactive."
                });
            }

            // 5. Validate slot time
            if (slot.StartTime >= slot.EndTime)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid timetable slot time."
                });
            }

            // 6. Check classroom double booking
            // Exclude the current record being updated
            var conflict = await _context.TimetableEntries
                .Where(e =>
                    e.TimetableEntryId != id &&
                    e.Status == 1 &&
                    e.Classroom != null &&
                    e.Classroom == classroom &&
                    e.DayOfWeek == day)
                .Join(
                    _context.TimetableSlots,
                    entry => entry.TimetableSlotId,
                    timetableSlot => timetableSlot.TimetableSlotId,
                    (entry, timetableSlot) => new
                    {
                        Entry = entry,
                        Slot = timetableSlot
                    })
                .AnyAsync(x =>
                    x.Slot.StartTime < slot.EndTime &&
                    x.Slot.EndTime > slot.StartTime);

            // 7. Return conflict
            if (conflict)
            {
                return Conflict(new
                {
                    success = false,
                    message = "Classroom is already booked for the selected day and time slot.",
                    classroom = classroom,
                    dayOfWeek = day,
                    startTime = slot.StartTime,
                    endTime = slot.EndTime
                });
            }

            // 8. Update entry
            existingEntry.TimetableId = request.TimetableId;
            existingEntry.TimetableSlotId = request.TimetableSlotId;
            existingEntry.FacultyId = request.FacultyId;
            existingEntry.SubjectId = request.SubjectId;
            existingEntry.SectionId = request.SectionId;
            existingEntry.DayOfWeek = day;
            existingEntry.Classroom = classroom;
            existingEntry.EntryType = request.EntryType;
            existingEntry.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // 9. Success
            return Ok(new
            {
                success = true,
                message = "Timetable entry updated successfully.",
                data = existingEntry
            });
        }
    }
}