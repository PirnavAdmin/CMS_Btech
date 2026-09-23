namespace BTech.DTOs.StudentProfileMain
{
    public class StudentProfilePreviewDto
    {
        public System.Text.Json.JsonElement? FormData { get; set; }
        public System.Text.Json.JsonElement? Personal => Part("personal");
        public System.Text.Json.JsonElement? Contact => Part("contact");
        public System.Text.Json.JsonElement? Parents => Part("parents");
        public System.Text.Json.JsonElement? Academic => Part("academic");
        public System.Text.Json.JsonElement? PreviousEducation => Part("previousEducation");
        public System.Text.Json.JsonElement? Admission => Part("admission");
        public System.Text.Json.JsonElement? Fees => Part("fees");
        private System.Text.Json.JsonElement? Part(string key) => FormData is { ValueKind:System.Text.Json.JsonValueKind.Object } root && root.TryGetProperty(key,out var value) ? value : null;
        public StudentProfileHeaderDto Header { get; set; } = new();
        public StudentProfileSummaryDto Summary { get; set; } = new();
        public StudentAcademicInformationDto AcademicInformation { get; set; } = new();
        public StudentPersonalInformationDto PersonalInformation { get; set; } = new();
        public StudentParentGuardianInformationDto ParentGuardianInformation { get; set; } = new();
    }

    public class StudentProfileHeaderDto
    {
        public long StudentId { get; set; }
        public string? StudentName { get; set; }
        public string? ProfilePhoto { get; set; }
        public string? Status { get; set; }
    }

    public class StudentProfileSummaryDto
    {
        public string? RegistrationNumber { get; set; }
        public string? AdmissionNumber { get; set; }
        public string? RollNumber { get; set; }

        public decimal ProfileCompletionPercentage { get; set; }

        public string? StudentStatus { get; set; }
        public string? FeeStatus { get; set; }
        public string? AttendanceStatus { get; set; }
        public string? ResultStatus { get; set; }
    }

    public class StudentAcademicInformationDto
    {
        public long? CourseId { get; set; }
        public string? Course { get; set; }

        public long? DepartmentId { get; set; }
        public string? Department { get; set; }

        public long? BranchId { get; set; }
        public string? Branch { get; set; }

        public long? AcademicYearId { get; set; }
        public string? AcademicYear { get; set; }

        public int? Semester { get; set; }

        public long? SectionId { get; set; }
        public string? Section { get; set; }

        public string? RollNumber { get; set; }
        public string? RegistrationNumber { get; set; }
    }

    public class StudentPersonalInformationDto
    {
        public string? FullName { get; set; }
        public string? Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }

        public string? Mobile { get; set; }
        public string? Email { get; set; }

        public string? BloodGroup { get; set; }
        public string? Address { get; set; }
    }

    public class StudentParentGuardianInformationDto
    {
        public string? FatherName { get; set; }
        public string? MotherName { get; set; }

        public string? ParentMobile { get; set; }
        public string? ParentEmail { get; set; }

        public string? FatherOccupation { get; set; }
        public string? MotherOccupation { get; set; }
    }
}
