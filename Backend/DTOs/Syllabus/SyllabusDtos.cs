using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Syllabus;

public class SyllabusFilter
{
    public long? CollegeId { get; set; }
    public long? AcademicYearId { get; set; }
    public long? CourseId { get; set; }
    public long? DepartmentId { get; set; }
    public long? BranchId { get; set; }
    public long? SemesterId { get; set; }
    public string? RegulationId { get; set; }
    public string? BatchId { get; set; }
}

public class SyllabusInput
{
    public long? CollegeId { get; set; }
    [Range(1, long.MaxValue)] public long AcademicYearId { get; set; }
    [Range(1, long.MaxValue)] public long CourseId { get; set; }
    public long? DepartmentId { get; set; }
    public long? BranchId { get; set; }
    [Range(1, long.MaxValue)] public long SemesterId { get; set; }
    [StringLength(100)] public string? RegulationId { get; set; }
    [StringLength(100)] public string? BatchId { get; set; }
    [Required, StringLength(250)] public string Title { get; set; } = "";
    [Required, StringLength(100)] public string Category { get; set; } = "";
    public long? SubjectId { get; set; }
    [Required, StringLength(50)] public string Version { get; set; } = "";
    [Range(1, long.MaxValue)] public long EffectiveAcademicYearId { get; set; }
    public DateTime? EffectiveDate { get; set; }
    [StringLength(8000)] public string? Description { get; set; }
    [StringLength(8000)] public string? RevisionNotes { get; set; }
}

public sealed class SyllabusRecord : SyllabusInput
{
    public long SyllabusId { get; set; }
    public string Status { get; set; } = "";
    public string? CourseName { get; set; }
    public string? BranchName { get; set; }
    public string? SemesterName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public IReadOnlyList<SyllabusDocument> Documents { get; set; } = [];
}

public class SyllabusDocument
{
    public long DocumentId { get; set; }
    public long SyllabusId { get; set; }
    public string FileName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long FileSize { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class SyllabusDownload : SyllabusDocument
{
    public byte[] Content { get; set; } = [];
}

public sealed record SyllabusAccess(long CollegeId, long UserId, bool Portal, bool Student, bool Faculty);
