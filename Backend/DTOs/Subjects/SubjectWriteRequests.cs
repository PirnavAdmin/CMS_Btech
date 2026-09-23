using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace BTech.DTOs.Subjects;

public abstract class SubjectWriteRequestBase
{
    [Required]
    [StringLength(50)]
    public string SubjectCode { get; set; } = string.Empty;

    [Required]
    [StringLength(255)]
    public string SubjectName { get; set; } = string.Empty;

    [Range(1, long.MaxValue)]
    public long CourseId { get; set; }

    [Range(1, long.MaxValue)]
    public long BranchId { get; set; }

    [Range(1, long.MaxValue)]
    public long SemesterId { get; set; }

    [Range(typeof(decimal), "0", "999.99")]
    public decimal? Credits { get; set; }

    [StringLength(50)]
    public string? SubjectType { get; set; }

    [StringLength(1000)]
    public string? Description { get; set; }

    [Range(0, 1)]
    public byte Status { get; set; } = 1;

    [JsonIgnore]
    public string NormalizedSubjectCode => SubjectCode.Trim().ToUpperInvariant();

    [JsonIgnore]
    public string NormalizedSubjectName => SubjectName.Trim();

    [JsonIgnore]
    public string? NormalizedSubjectType =>
        string.IsNullOrWhiteSpace(SubjectType)
            ? null
            : SubjectType.Trim().ToUpperInvariant();

    [JsonIgnore]
    public string? NormalizedDescription =>
        string.IsNullOrWhiteSpace(Description)
            ? null
            : Description.Trim();
}

public sealed class CreateSubjectRequest : SubjectWriteRequestBase
{
}

public sealed class UpdateSubjectRequest : SubjectWriteRequestBase
{
}
