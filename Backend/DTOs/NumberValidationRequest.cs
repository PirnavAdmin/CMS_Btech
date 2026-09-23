namespace BTech.DTOs
{
    public class NumberValidationRequest
    {
        public long CollegeId { get; set; }

        public long AcademicYearId { get; set; }

        public string? RollNumber { get; set; }

        public string? RegistrationNumber { get; set; }

        public string? AdmissionNumber { get; set; }

        // Send this only when checking an existing record during update.
        public long? AcademicId { get; set; }
    }
}