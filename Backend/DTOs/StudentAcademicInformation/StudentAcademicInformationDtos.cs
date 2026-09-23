using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.StudentAcademicInformation
{
    public sealed class UpdateStudentAcademicInformationDto
    {
        [Required, MaxLength(20)]
        public string RollNumber { get; set; } = string.Empty;

        [Required, MaxLength(30)]
        public string RegistrationNumber { get; set; } = string.Empty;

        [Required, MaxLength(30)]
        public string AdmissionNumber { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string Course { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string Branch { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string Department { get; set; } = string.Empty;

        [Range(1, 20)]
        public int Semester { get; set; }

        [Required, MaxLength(10)]
        public string Section { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;
    }

    public sealed class StudentAcademicInformationResponseDto
    {
        public int AcademicId { get; set; }
        public string RollNumber { get; set; } = string.Empty;
        public string RegistrationNumber { get; set; } = string.Empty;
        public string AdmissionNumber { get; set; } = string.Empty;
        public string Course { get; set; } = string.Empty;
        public string Branch { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public int Semester { get; set; }
        public string Section { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
    }
}
