namespace BTech.DTOs.AcademicYear
{
    public class AcademicYearResponseDto
    {
        public long AcademicYearId { get; set; }
        public string AcademicYearName { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public sbyte Status { get; set; }
        public bool IsActive => Status == 1;
        public sbyte IsArchived { get; set; }
        public DateTime CreatedAt { get; set; }
        public long? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public long? UpdatedBy { get; set; }
    }
}
