namespace BTech.Models
{
    public class StudentParent
    {
        public long ParentId { get; set; }

        public long StudentId { get; set; }

        public string? FatherName { get; set; }
        public string? FatherMobile { get; set; }
        public string? FatherEmail { get; set; }
        public string? FatherOccupation { get; set; }

        public string? MotherName { get; set; }
        public string? MotherMobile { get; set; }
        public string? MotherEmail { get; set; }
        public string? MotherOccupation { get; set; }

        public string? GuardianName { get; set; }
        public string? GuardianMobile { get; set; }
        public string? GuardianEmail { get; set; }
        public string? Occupation { get; set; }
        public decimal? AnnualIncome { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string? CurrentAddressJson { get; set; }
        public string? PermanentAddressJson { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}