using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs
{
    public class AdmissionStatusRequestDto
    {
        // Used for approve API
        public string? Remarks { get; set; }

        // Used for reject API
        public string? RejectionReason { get; set; }
    }
}