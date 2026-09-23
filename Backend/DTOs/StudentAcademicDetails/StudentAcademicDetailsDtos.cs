using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.StudentAcademicDetails
{
    public class UpdateStudentAcademicDetailsDto
    {
        public long? CollegeId { get; set; }
        public long? DepartmentId { get; set; }
        public long? CourseId { get; set; }
        public long? BranchId { get; set; }
        public long? SemesterId { get; set; }
        public string? AdmissionType { get; set; }
        public string? EntryType { get; set; }
        public string? Regulation { get; set; }
        public string? Batch { get; set; }
        public long? BoardId { get; set; }
        public long? AcademicYearId { get; set; }
        public long? AcademicLevelId { get; set; }
        public long? GroupId { get; set; }
        public long? SectionId { get; set; }

        [MaxLength(50)]
        public string? Medium { get; set; }

        [MaxLength(100)]
        public string? SecondLanguage { get; set; }

        [MaxLength(200)]
        public string? PreviousSchool { get; set; }

        [MaxLength(100)]
        public string? PreviousBoard { get; set; }

        [MaxLength(20)]
        public string? PreviousYear { get; set; }

        [Range(0, 100)]
        public decimal? PreviousPercentage { get; set; }

        [MaxLength(100)]
        public string? PreviousHallTicket { get; set; }
    }

    public class StudentAcademicDetailsResponseDto
    {
        public long AdmissionId { get; set; }
        public string? RegistrationNo { get; set; }
        public string? AdmissionNo { get; set; }
        public string StudentName { get; set; } = string.Empty;

        public long? CollegeId { get; set; }
        public long? DepartmentId { get; set; }
        public long? CourseId { get; set; }
        public long? BranchId { get; set; }
        public long? SemesterId { get; set; }
        public string? AdmissionType { get; set; }
        public string? EntryType { get; set; }
        public string? Regulation { get; set; }
        public string? Batch { get; set; }
        public long? BoardId { get; set; }
        public long? AcademicYearId { get; set; }
        public long? AcademicLevelId { get; set; }
        public long? GroupId { get; set; }
        public long? SectionId { get; set; }
        public string? Medium { get; set; }
        public string? SecondLanguage { get; set; }

        public string? PreviousSchool { get; set; }
        public string? PreviousBoard { get; set; }
        public string? PreviousYear { get; set; }
        public decimal? PreviousPercentage { get; set; }
        public string? PreviousHallTicket { get; set; }

        public long? UpdatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
