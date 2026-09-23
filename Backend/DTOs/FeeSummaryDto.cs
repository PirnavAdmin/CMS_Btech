namespace BTech.DTOs.Profile
{
    public class FeeSummaryDto
    {
        public long StudentId { get; set; }

        public decimal TotalFee { get; set; }

        public decimal PaidAmount { get; set; }

        public decimal PendingAmount { get; set; }

        public decimal DueAmount { get; set; }
    }
}