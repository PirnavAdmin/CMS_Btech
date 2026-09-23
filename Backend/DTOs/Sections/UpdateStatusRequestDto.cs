namespace BTech.DTOs.Sections
{
    public class UpdateStatusRequestDto
    {
        [System.Text.Json.Serialization.JsonRequired]
        public bool Status { get; set; }
    }
}
