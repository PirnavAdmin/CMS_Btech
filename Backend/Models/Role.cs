using System.ComponentModel.DataAnnotations.Schema;
using BTech.DTOs.AdminGovernance;
namespace BTech.Models
{
    public class Role
    {
        public long Role_id { get; set; }

        public string RoleName { get; set; } = string.Empty;

        public string RoleCode { get; set; } = string.Empty;

        // Permission rows are stored in role_permissions, not in roles.
        // This non-mapped property is for API serialization only.
        [NotMapped]
        public Dictionary<string, PermissionActionsDto> Permissions { get; set; } = new(StringComparer.OrdinalIgnoreCase);

        public string? Description { get; set; }

        public byte Status { get; set; }

        public DateTime CreatedAt { get; set; }

        public long? CreatedBy { get; set; }

        public DateTime? UpdatedAt { get; set; }

        public long? UpdatedBy { get; set; }

        public DateTime? DeletedAt { get; set; }

        public long? DeletedBy { get; set; }
    }
}