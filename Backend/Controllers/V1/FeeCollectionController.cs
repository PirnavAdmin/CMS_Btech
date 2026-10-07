using System.Security.Claims;
using BTech.DTOs.Fees;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1;

[ApiController]
[Authorize]
[Route("api/v1/fee-collection")]
public sealed class FeeCollectionController : ControllerBase
{
    private readonly IFeeCollectionService _service;
    public FeeCollectionController(IFeeCollectionService service)=>_service=service;

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard([FromQuery] FeeDashboardQuery q)
        => Ok(new{success=true,data=await _service.GetDashboardAsync(q,CollegeId(),IsSuperAdmin())});

    [HttpGet("pending")]
    public async Task<IActionResult> Pending([FromQuery] FeePendingQuery q)
        => Ok(new{success=true,data=await _service.GetPendingAsync(q,CollegeId(),IsSuperAdmin())});

    [HttpPost("payments")]
    public async Task<IActionResult> Pay([FromBody] FeePaymentCreateRequest request)
    {
        var data=await _service.CreatePaymentAsync(request,UserId(),CollegeId(),IsSuperAdmin());
        return StatusCode(StatusCodes.Status201Created,new{success=true,message="Fee payment collected and receipt generated successfully.",data});
    }

    [HttpGet("history")]
    public async Task<IActionResult> History([FromQuery] FeeHistoryQuery q)
        => Ok(new{success=true,data=await _service.GetHistoryAsync(q,CollegeId(),IsSuperAdmin())});

    [HttpGet("fines")]
    public async Task<IActionResult> Fines([FromQuery] FeeFineQuery q)
        => Ok(new{success=true,data=await _service.GetFinesAsync(q,CollegeId(),IsSuperAdmin())});

    [HttpPost("fines")]
    public async Task<IActionResult> CreateFine([FromBody] FineCreateRequest request)
        => StatusCode(201,new{success=true,data=await _service.CreateFineAsync(request,UserId(),CollegeId(),IsSuperAdmin())});

    [HttpPost("fines/{fineId:long}/waive")]
    public async Task<IActionResult> WaiveFine(long fineId,[FromBody] FineWaiveRequest request)
        => Ok(new{success=true,message="Fine waived successfully.",data=await _service.WaiveFineAsync(fineId,request,UserId(),CollegeId(),IsSuperAdmin())});

    [HttpGet("receipts/{receiptId:long}")]
    public async Task<IActionResult> Receipt(long receiptId)
    {
        var data=await _service.GetReceiptAsync(receiptId,CollegeId(),IsSuperAdmin());
        return data is null ? NotFound(new{success=false,message="Receipt not found."}) : Ok(new{success=true,data});
    }

    [HttpGet("payments/{paymentId:long}/receipt")]
    public async Task<IActionResult> PaymentReceipt(long paymentId)
    {
        var data=await _service.GetReceiptByPaymentAsync(paymentId,CollegeId(),IsSuperAdmin());
        return data is null ? NotFound(new{success=false,message="Receipt not found."}) : Ok(new{success=true,data});
    }

    private long UserId()
    {
        var raw=User.FindFirstValue(ClaimTypes.NameIdentifier)??User.FindFirstValue("sub")??User.FindFirstValue("user_id");
        if(!long.TryParse(raw,out var id)||id<=0) throw new UnauthorizedAccessException("Invalid authenticated user.");
        return id;
    }
    private long? CollegeId(){var raw=User.FindFirstValue("collegeId");return long.TryParse(raw,out var id)&&id>0?id:null;}
    private bool IsSuperAdmin()=>User.IsInRole("SUPER_ADMIN");
}
