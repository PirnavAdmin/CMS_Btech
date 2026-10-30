using System.ComponentModel.DataAnnotations;
namespace BTech.DTOs.Subjects;
public class SubjectSearchRequest
{
    [StringLength(255)] public string? Search { get; set; }
    [Range(1, long.MaxValue)] public long? CollegeId { get; set; }
    [Range(1, long.MaxValue)] public long? AcademicYearId { get; set; }
    [Range(1, long.MaxValue)] public long? CourseId { get; set; }
    [Range(1, long.MaxValue)] public long? BranchId { get; set; }
    [Range(1, long.MaxValue)] public long? SemesterId { get; set; }
    public string? Status { get; set; }
    [StringLength(50)] public string? SubjectType { get; set; }
    [RegularExpression("(?i)^(Elective|Non-Elective|Core Subject)$")] public string? ElectiveType { get; set; }
    public string? Level { get; set; }
    [Range(1, int.MaxValue)] public int? Page { get; set; }
    [Range(1, 500)] public int? PageSize { get; set; }
}
