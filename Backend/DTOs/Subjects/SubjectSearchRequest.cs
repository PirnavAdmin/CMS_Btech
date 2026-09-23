namespace BTech.DTOs.Subjects;

public class SubjectSearchRequest
{
    public string? Search { get; set; }
    public long? SemesterId { get; set; }
    public byte? Status { get; set; }
}
