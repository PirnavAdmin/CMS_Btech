namespace BTech.DTOs.ResultManagement;

public sealed class ResultCalculationRequest
{
    public long StudentId { get; set; }
    public long ExamId { get; set; }
}

public sealed class ResultSubjectDto
{
    public long ResultId { get; set; }
    public long ExamScheduleId { get; set; }
    public long SubjectId { get; set; }
    public string? SubjectCode { get; set; }
    public string? SubjectName { get; set; }
    public decimal Credits { get; set; }
    public decimal MaximumMarks { get; set; }
    public decimal MarksObtained { get; set; }
    public decimal? Percentage { get; set; }
    public string? Grade { get; set; }
    public decimal? GradePoint { get; set; }
    public string ResultStatus { get; set; } = string.Empty;
    public bool IsAbsent { get; set; }
    public bool IsBacklog { get; set; }
}

public sealed class ResultSummaryDto
{
    public long StudentId { get; set; }
    public long ExamId { get; set; }
    public decimal TotalMaximumMarks { get; set; }
    public decimal TotalMarksObtained { get; set; }
    public decimal Percentage { get; set; }
    public string? OverallGrade { get; set; }
    public decimal? Sgpa { get; set; }
    public decimal? Cgpa { get; set; }
    public string ResultStatus { get; set; } = string.Empty;
    public int BacklogCount { get; set; }
    public List<ResultSubjectDto> Subjects { get; set; } = [];
}

public sealed class BacklogDto
{
    public long BacklogId { get; set; }
    public long StudentId { get; set; }
    public long SubjectId { get; set; }
    public string? SubjectCode { get; set; }
    public string? SubjectName { get; set; }
    public long SourceResultId { get; set; }
    public long? ClearedResultId { get; set; }
    public int AttemptCount { get; set; }
    public string BacklogStatus { get; set; } = string.Empty;
    public DateTime IdentifiedAt { get; set; }
    public DateTime? ClearedAt { get; set; }
}


// ============================================================
// TASK 17 - RESULT CALCULATION VALIDATION
// ============================================================

public sealed class ResultValidationRequest
{
    public long StudentId { get; set; }
    public long ExamId { get; set; }
}

public sealed class GradeRuleDto
{
    public string GradeCode { get; set; } = string.Empty;

    public decimal GradePoint { get; set; }

    public bool IsPass { get; set; }
}

public sealed class ResultMemoValidationDto
{
    public decimal? OverallPercentage { get; set; }

    public decimal? Sgpa { get; set; }

    public decimal? Cgpa { get; set; }

    public string? OverallGrade { get; set; }

    public string OverallResultStatus { get; set; }
        = string.Empty;
}

public sealed class ValidationDetailDto
{
    public string Rule { get; set; } = string.Empty;

    public bool IsValid { get; set; }

    public string Message { get; set; } = string.Empty;
}

public sealed class ResultValidationResponseDto
{
    public long StudentId { get; set; }

    public long ExamId { get; set; }

    public bool IsValid { get; set; }

    public decimal CalculatedPercentage { get; set; }

    public string? CalculatedOverallGrade { get; set; }

    public decimal? CalculatedSgpa { get; set; }

    public decimal? CalculatedCgpa { get; set; }

    public int CalculatedBacklogCount { get; set; }

    public string CalculatedResultStatus { get; set; }
        = string.Empty;

    public List<ValidationDetailDto> Validations { get; set; }
        = [];
}