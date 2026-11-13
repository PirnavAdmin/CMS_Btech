using System.ComponentModel.DataAnnotations;
namespace BTech.LibraryManagement;
public sealed class MarkLostBookRequest { [Range(1,long.MaxValue)] public long CollegeId {get;set;} [StringLength(500)] public string? Remarks {get;set;} }
public sealed class CreateLostBookFineRequest { [Range(1,long.MaxValue)] public long CollegeId {get;set;} [Range(1,long.MaxValue)] public long IssueId {get;set;} [Range(typeof(decimal),"0.01","99999999.99")] public decimal FineAmount {get;set;} [StringLength(500)] public string? Remarks {get;set;} }
public sealed class UpdateLostBookFineRequest { [Range(1,long.MaxValue)] public long CollegeId {get;set;} [Range(typeof(decimal),"0.01","99999999.99")] public decimal FineAmount {get;set;} [Required,StringLength(500)] public string Reason {get;set;}=""; }
public sealed class LostBookFinePaymentRequest { [Range(1,long.MaxValue)] public long CollegeId {get;set;} [Range(typeof(decimal),"0.01","99999999.99")] public decimal Amount {get;set;} [Required,StringLength(50)] public string PaymentMethod {get;set;}="CASH"; [Required,StringLength(100)] public string ReceiptNo {get;set;}=""; [StringLength(500)] public string? Remarks {get;set;} }
