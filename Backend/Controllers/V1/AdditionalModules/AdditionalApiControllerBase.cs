using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1.AdditionalModules;

public abstract class AdditionalApiControllerBase : ControllerBase
{
    protected readonly AdditionalApiStore Store;
    protected AdditionalApiControllerBase(AdditionalApiStore store) => Store=store;
    protected async Task<IActionResult> List(string resource,string? key=null) => Ok(new { success=true, data=await Store.ListAsync(resource,key,HttpContext.RequestAborted) });
    protected async Task<IActionResult> Get(string resource,long id) { var x=await Store.GetAsync(resource,id,HttpContext.RequestAborted); return x is null ? NotFound(new{success=false,message="Record not found."}) : Ok(new{success=true,data=x}); }
    protected async Task<IActionResult> Create(string resource,JsonElement body,string? key=null,string? status=null) { if(body.ValueKind!=JsonValueKind.Object) return BadRequest(new{success=false,message="A JSON object request body is required."}); var id=await Store.SaveAsync(resource,null,key,body,status,HttpContext.RequestAborted); return StatusCode(StatusCodes.Status201Created,new{success=true,id,data=body}); }
    protected async Task<IActionResult> Update(string resource,long id,JsonElement body,string? status=null) { if(body.ValueKind!=JsonValueKind.Object) return BadRequest(new{success=false,message="A JSON object request body is required."}); var saved=await Store.SaveAsync(resource,id,null,body,status,HttpContext.RequestAborted); return saved==0?NotFound(new{success=false,message="Record not found."}):Ok(new{success=true,id,data=body}); }
    protected async Task<IActionResult> Delete(string resource,long id) => await Store.DeleteAsync(resource,id,HttpContext.RequestAborted) ? NoContent() : NotFound(new{success=false,message="Record not found."});
    protected async Task<IActionResult> Status(string resource,long id,string status) => await Store.SetStatusAsync(resource,id,status,HttpContext.RequestAborted)>0 ? Ok(new{success=true,id,status}) : NotFound(new{success=false,message="Record not found."});
}
