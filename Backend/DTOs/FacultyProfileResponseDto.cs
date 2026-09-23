namespace BTech.DTOs.Faculty
{
    public class FacultyProfileResponseDto
    {
        public long FacultyProfileId { get; set; }
        public long FacultyId { get; set; }
        public long UserId { get; set; }

        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }

        public string? HouseNumber { get; set; }
        public string? Address { get; set; }
        public string? Pincode { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? State { get; set; }
        public string? Country { get; set; }

        public string? PermanentHouseNumber { get; set; }
        public string? PermanentAddress { get; set; }
        public string? PermanentPincode { get; set; }
        public string? PermanentCity { get; set; }
        public string? PermanentDistrict { get; set; }
        public string? PermanentState { get; set; }
        public string? PermanentCountry { get; set; }

        public string? AboutMe { get; set; }
        public string? ProfileImagePath { get; set; }

        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactNumber { get; set; }
        public string? EmergencyContactRelation { get; set; }

        public byte Status { get; set; }
    }
}