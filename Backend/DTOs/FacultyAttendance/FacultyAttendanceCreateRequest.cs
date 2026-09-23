using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.FacultyAttendance;

public class FacultyAttendanceCreateRequest
{
    [Required]
    public long FacultyId { get; set; }

    public DateTime? AttendanceDate { get; set; }
    public string Status { get; set; } = "PRESENT";
    public string? Remarks { get; set; }
}
