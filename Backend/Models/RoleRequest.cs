namespace BTech.Models
{
    public class RoleRequest
    {
        public string RoleName { get; set; } = string.Empty;

        public string RoleCode { get; set; } = string.Empty;

        public string? Description { get; set; }

        public bool Status { get; set; } = true;
    }
}