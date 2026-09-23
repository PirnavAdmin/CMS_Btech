using BTech.DTOs.Course;
using BTech.Models;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations
{
    public sealed class CourseService : ICourseService
    {
        private readonly ICourseRepository _courseRepository;
        private readonly IUserRepository _userRepository;

        public CourseService(
            ICourseRepository courseRepository,
            IUserRepository userRepository)
        {
            _courseRepository = courseRepository;
            _userRepository = userRepository;
        }

        public async Task<IEnumerable<CourseResponseDto>> GetAllAsync(
            string? search,
            sbyte? status,
            long? collegeId,
            long? departmentId)
        {
            var courses = await _courseRepository.GetAllAsync(
                search,
                status,
                collegeId,
                departmentId);

            return courses.Select(Map);
        }

        public async Task<CourseResponseDto?> GetByIdAsync(long courseId)
        {
            if (courseId <= 0)
                throw new ArgumentException("Valid course ID is required.");

            var course = await _courseRepository.GetByIdAsync(courseId);
            return course == null ? null : Map(course);
        }

        public async Task<CourseResponseDto> AddAsync(
            CreateCourseDto dto,
            long? userId)
        {
            var collegeId = await ResolveCollegeIdAsync(dto.CollegeId, userId);

            if (await _courseRepository.ExistsCodeAsync(dto.EffectiveCode))
                throw new InvalidOperationException(
                    $"Course code '{dto.EffectiveCode}' already exists.");

            var course = BuildCourse(dto, collegeId);
            course.Status = 1;
            course.CreatedAt = DateTime.UtcNow;
            course.CreatedBy = userId;

            return Map(await _courseRepository.AddAsync(course));
        }

        public async Task<CourseResponseDto?> UpdateAsync(
            long courseId,
            UpdateCourseDto dto,
            long? userId)
        {
            if (courseId <= 0)
                throw new ArgumentException("Valid course ID is required.");

            var existing = await _courseRepository.GetByIdAsync(courseId);
            if (existing == null)
                return null;

            if (await _courseRepository.ExistsCodeAsync(dto.EffectiveCode, courseId))
                throw new InvalidOperationException(
                    $"Course code '{dto.EffectiveCode}' already exists.");

            var collegeId = dto.CollegeId ?? existing.CollegeId;
            var course = BuildCourse(dto, collegeId);
            course.CourseId = courseId;
            course.Status = existing.Status;
            course.CreatedAt = existing.CreatedAt;
            course.CreatedBy = existing.CreatedBy;
            course.UpdatedAt = DateTime.UtcNow;
            course.UpdatedBy = userId;

            var updated = await _courseRepository.UpdateAsync(course);
            return updated == null ? null : Map(updated);
        }

        public async Task<CourseResponseDto?> UpdateStatusAsync(
            long courseId,
            sbyte status,
            long? userId)
        {
            if (courseId <= 0)
                throw new ArgumentException("Valid course ID is required.");

            if (status is not (0 or 1))
                throw new ArgumentException("Status must be 0 or 1.");

            var updated = await _courseRepository.UpdateStatusAsync(
                courseId,
                status,
                userId);

            return updated == null ? null : Map(updated);
        }

        private async Task<long> ResolveCollegeIdAsync(
            long? requestedCollegeId,
            long? userId)
        {
            if (requestedCollegeId > 0)
                return requestedCollegeId.Value;

            if (userId.HasValue)
            {
                var user = await _userRepository.GetByIdAsync(userId.Value);
                if (user?.college_id > 0)
                    return user.college_id.Value;
            }

            throw new ArgumentException(
                "CollegeId is required when the signed-in user is not assigned to a college.");
        }

        private static Course BuildCourse(CreateCourseDto dto, long collegeId) => new()
        {
            CollegeId = collegeId,
            DepartmentId = dto.DepartmentId,
            CourseCode = dto.EffectiveCode,
            CourseName = dto.EffectiveName,
            CourseShortName = dto.EffectiveShortName,
            CourseType = dto.EffectiveType,
            DurationYears = dto.EffectiveDurationYears,
            TotalSemesters = dto.EffectiveTotalSemesters,
            Eligibility = dto.Eligibility?.Trim(),
            Description = dto.Description?.Trim()
        };

        private static CourseResponseDto Map(Course course) => new()
        {
            CourseId = course.CourseId,
            CollegeId = course.CollegeId,
            CollegeName = course.CollegeName,
            DepartmentId = course.DepartmentId,
            DepartmentName = course.DepartmentName,
            CourseCode = course.CourseCode,
            CourseName = course.CourseName,
            CourseShortName = course.CourseShortName,
            CourseType = course.CourseType,
            DurationYears = course.DurationYears,
            TotalSemesters = course.TotalSemesters,
            Eligibility = course.Eligibility,
            Description = course.Description,
            Status = unchecked((sbyte)course.Status),
            CreatedAt = course.CreatedAt,
            UpdatedAt = course.UpdatedAt
        };
    }
}
