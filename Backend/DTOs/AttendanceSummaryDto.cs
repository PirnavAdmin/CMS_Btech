namespace BTech.DTOs
{
    public class AttendanceSummaryDto
    {
        public decimal Percentage { get; set; }

        public int TotalClasses { get; set; }

        public int PresentClasses { get; set; }

        public int AbsentClasses { get; set; }

        public string Status { get; set; } = "Not Available";
    }
}