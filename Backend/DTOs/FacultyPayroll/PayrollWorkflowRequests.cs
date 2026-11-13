using System.ComponentModel.DataAnnotations;
namespace BTech.DTOs.FacultyPayroll;
public sealed class PayrollSalaryRequest
{
    [Range(1,long.MaxValue)] public long CollegeId {get;set;}
    [Range(1,long.MaxValue)] public long FacultyId {get;set;}
    [Required] public string PayrollMonth {get;set;}="";
    [Range(typeof(decimal),"0","9999999999.99")] public decimal GrossSalary {get;set;}
    [Range(typeof(decimal),"0","9999999999.99")] public decimal Deductions {get;set;}
    public DateTime PayDate {get;set;}
    public int? RevisionNo {get;set;}
}
public class PayrollRevisionRequest
{
    [Range(1,int.MaxValue)] public int RevisionNo {get;set;}
}
public sealed class PayrollPaymentRequest : PayrollRevisionRequest
{
    [Required,StringLength(120)] public string PaymentReference {get;set;}="";
}
