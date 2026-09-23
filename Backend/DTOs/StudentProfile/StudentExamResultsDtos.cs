namespace BTech.DTOs.StudentProfile
{
    public sealed class StudentExamResultsResponseDto
    {
        public long StudentId { get; set; }
        public bool IsModuleAvailable { get; set; }
        public string IntegrationStatus { get; set; } = string.Empty;
        public string ContractVersion { get; set; } = "1.0";
        public IReadOnlyList<StudentExamResultDto> Results { get; set; }
            = Array.Empty<StudentExamResultDto>();
    }

    public sealed class StudentExamResultDto
    {
        public long ResultId { get; set; }
        public long ExaminationId { get; set; }
        public string ExaminationName { get; set; } = string.Empty;
        public long? SemesterId { get; set; }
        public string? SemesterName { get; set; }
        public DateTime? PublishedAt { get; set; }
        public decimal? TotalMarks { get; set; }
        public decimal? ObtainedMarks { get; set; }
        public decimal? Percentage { get; set; }
        public string? Grade { get; set; }
        public string? ResultStatus { get; set; }
        public IReadOnlyList<StudentExamSubjectResultDto> Subjects { get; set; }
            = Array.Empty<StudentExamSubjectResultDto>();
    }

    public sealed class StudentExamSubjectResultDto
    {
        public long SubjectId { get; set; }
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public decimal? MaximumMarks { get; set; }
        public decimal? ObtainedMarks { get; set; }
        public string? Grade { get; set; }
        public string? Status { get; set; }
    }
}
