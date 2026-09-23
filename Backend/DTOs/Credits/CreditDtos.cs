using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Credits;

public sealed class CreditConfigurationRequest
{
    [Range(1, long.MaxValue)]
    public long SubjectId { get; set; }

    [Range(1, long.MaxValue)]
    public long CourseId { get; set; }

    [Range(1, long.MaxValue)]
    public long BranchId { get; set; }

    [Range(1, long.MaxValue)]
    public long SemesterId { get; set; }

    [Range(typeof(decimal), "0.01", "999.99")]
    public decimal Credits { get; set; }

    [Range(typeof(decimal), "0.00", "999.99")]
    public decimal MinimumCredits { get; set; }

    [Range(typeof(decimal), "0.00", "999.99")]
    public decimal? MaximumCredits { get; set; }

    [Range(0, 1)]
    public byte Status { get; set; } = 1;

    public long? CreatedBy { get; set; }
    public long? UpdatedBy { get; set; }
}

public sealed class CreateCreditRegistrationRequest
{
    [Range(1, long.MaxValue)]
    public long StudentId { get; set; }

    [Range(1, long.MaxValue)]
    public long SubjectId { get; set; }

    [Range(1, long.MaxValue)]
    public long SemesterId { get; set; }

    public long? CreatedBy { get; set; }
}

public sealed class UpdateCreditRegistrationRequest
{
    [Required]
    [StringLength(30)]
    public string RegistrationStatus { get; set; } = "REGISTERED";

    [StringLength(10)]
    public string? Grade { get; set; }

    [Range(typeof(decimal), "0.00", "999.99")]
    public decimal? GradePoints { get; set; }

    public bool IsCompleted { get; set; }

    [Range(0, 1)]
    public byte Status { get; set; } = 1;

    public long? UpdatedBy { get; set; }
}
