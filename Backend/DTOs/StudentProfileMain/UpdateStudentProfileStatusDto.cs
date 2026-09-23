namespace BTech.DTOs.StudentProfileMain
{
    public sealed class UpdateStudentProfileStatusDto
    {
        [System.Text.Json.Serialization.JsonRequired]
        [System.ComponentModel.DataAnnotations.Range(0, 1)]
        public int Status { get; set; }
    }
}