
namespace BTech.DTOs.Faculty
{
    public class FacultyListResponseDto
    {
        public IEnumerable<FacultyListItemDto> Data { get; set; }
            = new List<FacultyListItemDto>();

        public int PageNumber { get; set; }

        public int PageSize { get; set; }

        public long TotalRecords { get; set; }

        public int TotalPages { get; set; }
    }
}