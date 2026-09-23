using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using BTech.DTOs.Common;

namespace BTech.DTOs.College
{
    public class UpdateCollegeStatusDto
    {
        [Required]
        [Range(0, 1, ErrorMessage = "Status must be 0 (Inactive) or 1 (Active)")]
        [JsonConverter(typeof(FlexibleStatusConverter))]
        [System.Text.Json.Serialization.JsonRequired]
        public sbyte Status { get; set; }
    }
}
