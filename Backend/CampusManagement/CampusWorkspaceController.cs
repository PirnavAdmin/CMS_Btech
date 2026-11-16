using System.Data;
using BTech.Services;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.CampusManagement;

[ApiController, Authorize, Route("api/v1/campus-workspace")]
public sealed class CampusWorkspaceController(IConfiguration config) : ControllerBase
{
    [HttpGet("campuses")]
    public async Task<IActionResult> GetCampuses([FromQuery] long? collegeId, CancellationToken cancellationToken)
    {
        if (!config.GetValue<bool>("CampusWorkspace:Enabled"))
            throw new ContractException(409, "CAMPUS_WORKSPACE_DISABLED", "Campus workspace is disabled on this backend.");
        var selectedCollegeId = CollegeDataScope.Resolve(HttpContext, collegeId, required: true)!.Value;
        await using var connection = new MySqlConnection(config.GetConnectionString("DefaultConnection"));
        var campuses = await connection.QueryAsync<CampusOption>(new CommandDefinition(
            "sp_campus_workspace_options", new
            {
                p_user_id = CollegeDataScope.Actor(HttpContext), p_college_id = selectedCollegeId,
                p_super_admin = CollegeDataScope.IsSuper(HttpContext)
            }, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken));
        Response.Headers["Cache-Control"] = "no-store";
        return Ok(new { success = true, data = campuses });
    }

    public sealed class CampusOption
    {
        public long CollegeId { get; set; }
        public long CampusId { get; set; }
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
        public bool IsMainCampus { get; set; }
    }
}
