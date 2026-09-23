
namespace BTech.DTOs.Faculty
{
    public class FacultyDetailsResponseDto
    {
        // ==========================================
        // FACULTY BASIC DETAILS
        // ==========================================

        public long FacultyId { get; set; }

        public string FacultyCode { get; set; } = string.Empty;

        public string FacultyName { get; set; } = string.Empty;

        public string? Designation { get; set; }

        public string? Qualification { get; set; }

        public string? Specialization { get; set; }

        public decimal ExperienceYears { get; set; }

        public string? EmploymentType { get; set; }

        public DateTime? DateOfJoining { get; set; }

        public string? OfficialEmail { get; set; }

        public string? Mobile { get; set; }

        public byte IsHod { get; set; }

        public byte Status { get; set; }


        // ==========================================
        // USER DETAILS
        // ==========================================

        public long UserId { get; set; }

        public string? EmployeeUserId { get; set; }

        public string? UserFullName { get; set; }

        public string? UserEmail { get; set; }

        public string? UserMobile { get; set; }


        // ==========================================
        // COLLEGE DETAILS
        // ==========================================

        public long CollegeId { get; set; }

        public string? CollegeCode { get; set; }

        public string? CollegeName { get; set; }


        // ==========================================
        // DEPARTMENT DETAILS
        // ==========================================

        public long DepartmentId { get; set; }

        public string? DepartmentCode { get; set; }

        public string? DepartmentName { get; set; }


        // ==========================================
        // EMPLOYEE PROFILE DETAILS
        // ==========================================

        public long? EmployeeProfileId { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public string? Gender { get; set; }


        // ==========================================
        // CURRENT ADDRESS
        // ==========================================

        public string? HouseNumber { get; set; }

        public string? Address { get; set; }

        public string? Pincode { get; set; }

        public string? City { get; set; }

        public string? District { get; set; }

        public string? State { get; set; }

        public string? Country { get; set; }


        // ==========================================
        // PERMANENT ADDRESS
        // ==========================================

        public string? PermanentHouseNumber { get; set; }

        public string? PermanentAddress { get; set; }

        public string? PermanentPincode { get; set; }

        public string? PermanentCity { get; set; }

        public string? PermanentDistrict { get; set; }

        public string? PermanentState { get; set; }

        public string? PermanentCountry { get; set; }


        // ==========================================
        // PROFILE DETAILS
        // ==========================================

        public string? AboutMe { get; set; }

        public string? ProfileImagePath { get; set; }


        // ==========================================
        // EMERGENCY CONTACT
        // ==========================================

        public string? EmergencyContactName { get; set; }

        public string? EmergencyContactNumber { get; set; }

        public string? EmergencyContactRelation { get; set; }


        // ==========================================
        // AUDIT DETAILS
        // ==========================================

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}