namespace BTech.DTOs.Sections
{
   
    public class SectionCapacityValidationDto
    {
        public bool IsValid { get; set; }

        public int Capacity { get; set; }

        public int CurrentStrength { get; set; }

        public int AvailableSeats { get; set; }
    }
}
