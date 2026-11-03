namespace BTech.DTOs.AcademicYear
{
    public class GenerateNextAcademicYearDto
    {
        // Optional compatibility field for SuperAdmin callers.
        // The controller validates it against the selected query scope.
        public long? CollegeId { get; set; }

        // Required only when the selected college has no academic years yet.
        public DateTime? StartDate { get; set; }

        public bool ActivateImmediately { get; set; } = false;
    }
}
