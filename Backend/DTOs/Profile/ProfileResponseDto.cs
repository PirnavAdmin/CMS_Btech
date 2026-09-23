namespace BTech.DTOs.Profile
{
    public class ProfileResponseDto
    {
        public long UserId { get; set; }

        public string EmployeeUserId { get; set; } = string.Empty;

        public string FullName { get; set; } = string.Empty;

        public string? Email { get; set; }

        public string? Mobile { get; set; }

        public List<string> Roles { get; set; } = new();

        public DateTime? DateOfBirth { get; set; }

        public string? Gender { get; set; }

        public long? DepartmentId { get; set; }

        public string? DepartmentName { get; set; }

        public string? Designation { get; set; }

        public string? Address { get; set; }
        public string? HouseNumber { get; set; }
        public string? PermanentHouseNumber { get; set; }
        public string? PermanentAddress { get; set; }
        public string? PermanentPincode { get; set; }
        public string? PermanentCity { get; set; }
        public string? PermanentDistrict { get; set; }
        public string? PermanentState { get; set; }
        public string? PermanentCountry { get; set; }


        public string? Pincode { get; set; }

        public string? City { get; set; }

        public string? District { get; set; }

        public string? State { get; set; }

        public string? AboutMe { get; set; }

        public string? ProfileImagePath { get; set; }

        public DateTime? LastLoginAt { get; set; }

        public DateTime? UpdatedAt { get; set; }

        // Student-only fields used by Frontend 4's shared My Profile screen.
        // They remain null for employees and administrators.
        public long? StudentId { get; set; }
        public string? StudentCode { get; set; }
        public string? Status { get; set; }
        public string? RegistrationNumber { get; set; }
        public string? AdmissionNumber { get; set; }
        public string? RollNumber { get; set; }
        public string? CourseName { get; set; }
        public string? BranchName { get; set; }
        public string? AcademicYearName { get; set; }
        public string? SemesterName { get; set; }
        public string? SectionName { get; set; }
        public string? Batch { get; set; }
    }
}
