namespace BTech.DTOs.StudentProfileMain
{
    public class StudentProfilePreviewFlatDto
    {
        public string? FrontendFormDataJson { get; set; }

        public long StudentId { get; set; }

        public string? StudentCode { get; set; }
        public string? StudentName { get; set; }
        public string? ProfilePhoto { get; set; }
        public string? Status { get; set; }

        public string? RegistrationNumber { get; set; }
        public string? AdmissionNumber { get; set; }
        public string? RollNumber { get; set; }

        public decimal ProfileCompletionPercentage { get; set; }

        public string? StudentStatus { get; set; }
        public string? FeeStatus { get; set; }
        public string? AttendanceStatus { get; set; }
        public string? ResultStatus { get; set; }

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

        public string? AcademicRollNumber { get; set; }
        public string? AcademicRegistrationNumber { get; set; }

        public string? PersonalFullName { get; set; }
        public string? Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }

        public string? Mobile { get; set; }
        public string? Email { get; set; }

        public string? BloodGroup { get; set; }
        public string? Address { get; set; }

        public string? FatherName { get; set; }
        public string? MotherName { get; set; }

        public string? ParentMobile { get; set; }
        public string? ParentEmail { get; set; }

        public string? FatherOccupation { get; set; }
        public string? MotherOccupation { get; set; }
    }
}
