
namespace BTech.DTOs.Faculty
{
    public class FacultyListRequestDto
    {
        public int PageNumber { get; set; } = 1;

        public int PageSize { get; set; } = 20;

        public string? Search { get; set; }

        public long? CollegeId { get; set; }

        public long? DepartmentId { get; set; }

        public byte? Status { get; set; }
    }
}