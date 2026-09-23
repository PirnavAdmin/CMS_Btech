using System.ComponentModel.DataAnnotations;
namespace BTech.DTOs
{

    public class CollegeUserMappingRequestDto
    {
        [Required]
        public long UserId { get; set; }

        [Required]
        public long CollegeSettingId { get; set; }
    }
}