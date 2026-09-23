namespace BTech.Task_FacultyStatusHistory.DTOs
{
    public class UpdateFacultyStatusRequest
    {
        public string Status { get; set; } = string.Empty;

        public string? Reason { get; set; }
    }
}