namespace BTech.DTOs.FacultyAttendance;

public class FacultyAttendanceUpdateRequest
{
    public DateTime? AttendanceDate { get; set; }
    public string? Status { get; set; }
    public DateTime? CheckIn { get; set; }
    public DateTime? CheckOut { get; set; }
    public string? Remarks { get; set; }
}
