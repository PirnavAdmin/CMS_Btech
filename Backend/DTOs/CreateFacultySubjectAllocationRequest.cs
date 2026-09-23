namespace BTech.Task_FacultySubjectAllocation.DTOs;

public sealed class CreateFacultySubjectAllocationRequest
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

    public string? Remarks { get; set; }

    public long? CreatedBy { get; set; }
}