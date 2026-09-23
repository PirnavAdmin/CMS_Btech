namespace BTech.Task_FacultySubjectAllocation.DTOs;

public sealed class FacultySubjectAllocationListRequest
{
    public long? FacultyId { get; set; }

    public long? AcademicYearId { get; set; }

    public long? CourseId { get; set; }

    public long? BranchId { get; set; }

    public long? SemesterId { get; set; }

    public long? SectionId { get; set; }

    public long? SubjectId { get; set; }
}