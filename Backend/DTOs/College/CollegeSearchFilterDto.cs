namespace BTech.DTOs.College
{
    public class CollegeSearchFilterDto
    {
        public string? Query { get; set; }
        public string? CollegeType { get; set; }
        public string? UniversityName { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public sbyte? Status { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string? SortBy { get; set; } = "CollegeName";
        public string? SortDirection { get; set; } = "asc";
    }
}