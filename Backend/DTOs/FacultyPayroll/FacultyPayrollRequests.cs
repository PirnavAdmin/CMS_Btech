namespace BTech.DTOs.FacultyPayroll;

public class FacultyPayrollHoldRequest
{
    [System.ComponentModel.DataAnnotations.Required]
    [System.ComponentModel.DataAnnotations.StringLength(1000)]
    public string Reason { get; set; } = string.Empty;
}
