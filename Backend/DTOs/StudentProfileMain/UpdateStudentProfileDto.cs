namespace BTech.DTOs.StudentProfileMain
{
    public sealed class UpdateStudentProfileDto
    {
        public string FullName { get; set; } = string.Empty;

        public string? Gender { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public string? Email { get; set; }

        public string? Mobile { get; set; }

        public string? BloodGroup { get; set; }

        public string? Address { get; set; }

        public string? FatherName { get; set; }

        public string? FatherMobile { get; set; }

        public string? FatherEmail { get; set; }

        public string? FatherOccupation { get; set; }

        public string? MotherName { get; set; }

        public string? MotherMobile { get; set; }

        public string? MotherEmail { get; set; }

        public string? MotherOccupation { get; set; }

        public string? ChangeReason { get; set; }
        public System.Text.Json.JsonElement? Student { get; set; }
        public string? ProfilePhoto { get; set; }
        public string? Photo { get; set; }
    }
}
