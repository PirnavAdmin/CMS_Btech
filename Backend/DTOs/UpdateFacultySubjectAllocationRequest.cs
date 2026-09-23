namespace BTech.Task_FacultySubjectAllocation.DTOs;

public sealed class UpdateFacultySubjectAllocationRequest
{
    public long FacultyId { get; set; }
    public long? CourseId { get; set; }
    public long BranchId { get; set; }
    public long SemesterId { get; set; }
    public long? SectionId { get; set; }
    public long? SubjectId { get; set; }
    public long? AcademicYearId { get; set; }
    public string AllocationType { get; set; } = "TEACHING";
    public bool IsPrimaryFaculty { get; set; } = true;
    public int PeriodsPerWeek { get; set; }
    public bool Status { get; set; } = true;
    public string? Remarks { get; set; }
    public long? UpdatedBy { get; set; }
}

public sealed class FacultySubjectAllocationResponse
{
    public long AllocationId { get; set; }
    public long FacultyId { get; set; }
    public string? FacultyCode { get; set; }
    public string? FacultyName { get; set; }
    public long? CourseId { get; set; }
    public string? CourseName { get; set; }
    public long BranchId { get; set; }
    public string? BranchName { get; set; }
    public long SemesterId { get; set; }
    public int SemesterNumber { get; set; }
    public string? SemesterName { get; set; }
    public long? SectionId { get; set; }
    public string? SectionName { get; set; }
    public long? SubjectId { get; set; }
    public long? AcademicYearId { get; set; }
    public string? AcademicYearName { get; set; }
    public string AllocationType { get; set; } = "TEACHING";
    public bool IsPrimaryFaculty { get; set; }
    public int PeriodsPerWeek { get; set; }
    public bool Status { get; set; }
    public string? Remarks { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedBy { get; set; }
}
