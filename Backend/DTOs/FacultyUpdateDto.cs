namespace BTech.DTOs.Faculty
{
    public class FacultyUpdateDto
    {
        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string PhoneNumber { get; set; } = string.Empty;

        public long DepartmentId { get; set; }

        public string Designation { get; set; } = string.Empty;

        public string Qualification { get; set; } = string.Empty;

        public int Status { get; set; }
    }
}