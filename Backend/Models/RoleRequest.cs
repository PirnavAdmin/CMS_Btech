using System.Text.Json;

namespace BTech.Models
{
    /// <summary>
    /// Backward-compatible role request used by /api/roles.
    /// Supports both the legacy RoleName/RoleCode contract and the
    /// frontend Name/Code aliases without removing existing fields.
    /// </summary>
    public class RoleRequest
    {
        public string? RoleName { get; set; }

        public string? Name { get; set; }

        public string? RoleCode { get; set; }

        public string? Code { get; set; }

        public string? Category { get; set; }

        public string? Level { get; set; }

        public string? Description { get; set; }

        public bool Status { get; set; } = true;

        /// <summary>
        /// Accepts either a JSON object or a JSON string containing the
        /// permissions matrix. Existing clients that do not send permissions
        /// remain fully supported.
        /// </summary>
        public JsonElement? Permissions { get; set; }
    }

    /// <summary>
    /// Additive staff-role assignment request for POST /api/roles/assign.
    /// </summary>
    public class AssignRoleRequest
    {
        public long EmployeeProfileId { get; set; }

        public long RoleId { get; set; }

        public long DesignationId { get; set; }

        public string Scope { get; set; } = "Department-scoped";
    }
}
