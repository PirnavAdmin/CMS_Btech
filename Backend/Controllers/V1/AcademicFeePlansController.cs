using BTech.DTOs.Fees;
using BTech.Services.Fees;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1;

[ApiController, Authorize, Route("api/v1/academic-fee-plans")]
public sealed class AcademicFeePlansController(AcademicFeePlanService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] long collegeId, [FromQuery] string? status = null,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50) =>
        Ok(new { success = true, data = await service.ListAsync(collegeId, status, page, pageSize), page, pageSize });

    [HttpGet("{feeStructureId:long}")]
    public async Task<IActionResult> Get(long feeStructureId, [FromQuery] long collegeId) =>
        Ok(new { success = true, data = await service.GetAsync(feeStructureId, collegeId) });

    [HttpGet("{feeStructureId:long}/history")]
    public async Task<IActionResult> History(long feeStructureId, [FromQuery] long collegeId) =>
        Ok(new { success = true, data = await service.HistoryAsync(feeStructureId, collegeId) });

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AcademicFeePlanRequest request)
    {
        var data = await service.SaveAsync(request);
        return CreatedAtAction(nameof(Get), new { data.FeeStructureId, data.CollegeId }, new { success = true, data });
    }
    [HttpPut("{feeStructureId:long}")]
    public async Task<IActionResult> Update(long feeStructureId, [FromBody] AcademicFeePlanRequest request) =>
        Ok(new { success = true, data = await service.SaveAsync(request, feeStructureId) });

    [HttpPost("{feeStructureId:long}/submit")]
    public Task<IActionResult> Submit(long feeStructureId, [FromQuery] long collegeId, [FromBody] FeePlanTransitionRequest request) => Change(feeStructureId, collegeId, "SUBMITTED", request);
    [HttpPost("{feeStructureId:long}/approve")]
    public Task<IActionResult> Approve(long feeStructureId, [FromQuery] long collegeId, [FromBody] FeePlanTransitionRequest request) => Change(feeStructureId, collegeId, "APPROVED", request);
    [HttpPost("{feeStructureId:long}/return-to-draft")]
    public Task<IActionResult> Return(long feeStructureId, [FromQuery] long collegeId, [FromBody] FeePlanTransitionRequest request) => Change(feeStructureId, collegeId, "DRAFT", request);
    [HttpPost("{feeStructureId:long}/publish")]
    public Task<IActionResult> Publish(long feeStructureId, [FromQuery] long collegeId, [FromBody] FeePlanTransitionRequest request) => Change(feeStructureId, collegeId, "PUBLISHED", request);
    [HttpPost("{feeStructureId:long}/archive")]
    public Task<IActionResult> Archive(long feeStructureId, [FromQuery] long collegeId, [FromBody] FeePlanTransitionRequest request) => Change(feeStructureId, collegeId, "ARCHIVED", request);
    private async Task<IActionResult> Change(long id, long collegeId, string target, FeePlanTransitionRequest request) =>
        Ok(new { success = true, data = await service.TransitionAsync(id, collegeId, target, request) });
}

[ApiController, Authorize, Route("api/v1/student-admissions/fee-plans")]
public sealed class AdmissionFeePlanPickerController(AcademicFeePlanService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Picker([FromQuery] AdmissionFeePlanQuery query) =>
        Ok(new { success = true, data = await service.PickerAsync(query) });
}
