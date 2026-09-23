namespace BTech.DTOs.Sections
{
    public class AssignClassTeacherRequestDto
    {
        public long EmployeeProfileId { get; set; }
    }

    public class ClassTeacherDto
    {
        public long SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public long? EmployeeProfileId { get; set; }
        public long? UserId { get; set; }
        public string? EmployeeUserId { get; set; }
        public string? FullName { get; set; }
        public string? DepartmentName { get; set; }
        public string? Designation { get; set; }
        public string? Email { get; set; }
        public string? Mobile { get; set; }
    }

    public class ClassTeacherCandidateDto
    {
        public long EmployeeProfileId { get; set; }
        public long UserId { get; set; }
        public string EmployeeUserId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? DepartmentName { get; set; }
        public string? Designation { get; set; }
        public string? Email { get; set; }
        public string? Mobile { get; set; }
    }

    public class SectionCapacityDto
    {
        public long SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public int Capacity { get; set; }
        public int AssignedStudents { get; set; }
        public int AvailableSeats { get; set; }
        public bool IsFull { get; set; }
    }

    public class StudentCandidateDto
    {
        public long StudentId { get; set; }
        public string StudentCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Mobile { get; set; }
        public long CollegeId { get; set; }
        public long? CourseId { get; set; }
        public long? BranchId { get; set; }
        public long AcademicYearId { get; set; }
    }

    public class SectionStudentDto
    {
        public long AssignmentId { get; set; }
        public long SectionId { get; set; }
        public long StudentId { get; set; }
        public string StudentCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Mobile { get; set; }
        public DateTime AssignedAt { get; set; }
        public long? AssignedBy { get; set; }
    }

    public class AssignStudentsRequestDto
    {
        public List<long> StudentIds { get; set; } = new();
    }

    public class AssignStudentsResultDto
    {
        public long SectionId { get; set; }
        public int Capacity { get; set; }
        public int PreviouslyAssigned { get; set; }
        public int NewlyAssigned { get; set; }
        public int TotalAssigned { get; set; }
        public int AvailableSeats { get; set; }
    }
}
