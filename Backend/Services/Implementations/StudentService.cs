using BTech.DTOs.Student;
using BTech.Models;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations
{
    public sealed class StudentService : IStudentService
    {
        private readonly IStudentRepository _studentRepository;

        public StudentService(IStudentRepository studentRepository)
        {
            _studentRepository = studentRepository;
        }

        // =========================================================
        // GET ALL STUDENTS
        // =========================================================

        public async Task<StudentPagedResponseDto> GetAllAsync(
            StudentListFilterDto filter)
        {
            ValidateFilter(filter);

            var result =
                await _studentRepository.GetAllAsync(
                    filter.Status,
                    filter.CollegeId,
                    filter.CourseId,
                    filter.BranchId,
                    filter.AcademicYearId,
                    filter.PageNumber,
                    filter.PageSize);

            return BuildPage(
                result.Items,
                result.TotalRecords,
                filter);
        }

        // =========================================================
        // SEARCH STUDENTS
        // =========================================================

        public async Task<StudentPagedResponseDto> SearchAsync(
            StudentSearchFilterDto filter)
        {
            ValidateFilter(filter);

            var query =
                Clean(filter.Query);

            if (query == null || query.Length < 2)
            {
                throw new ArgumentException(
                    "Search query must contain at least 2 characters.");
            }

            var result =
                await _studentRepository.SearchAsync(
                    query,
                    filter.Status,
                    filter.CollegeId,
                    filter.CourseId,
                    filter.BranchId,
                    filter.AcademicYearId,
                    filter.PageNumber,
                    filter.PageSize);

            return BuildPage(
                result.Items,
                result.TotalRecords,
                filter);
        }

        // =========================================================
        // GET STUDENT BY ID
        // =========================================================

        public async Task<StudentResponseDto?> GetByIdAsync(
            long studentId)
        {
            if (studentId <= 0)
            {
                throw new ArgumentException(
                    "A valid student ID is required.");
            }

            var student =
                await _studentRepository.GetByIdAsync(
                    studentId);

            if (student == null)
            {
                return null;
            }

            // Map student profile
            var response =
                Map(student);

            // Get documents and add them to profile
            response.Documents =
                await _studentRepository
                    .GetDocumentsAsync(studentId);

            return response;
        }

        // =========================================================
        // PROMOTE INDIVIDUAL STUDENT
        // =========================================================

        public async Task<StudentPromotionResponseDto?>
            PromoteAsync(
                long studentId,
                long? createdBy)
        {
            if (studentId <= 0)
            {
                throw new ArgumentException(
                    "A valid student ID is required.");
            }

            var student =
                await _studentRepository
                    .GetByIdAsync(studentId);

            if (student == null)
            {
                return null;
            }

            return await _studentRepository
                .PromoteAsync(
                    studentId,
                    createdBy);
        }

        // =========================================================
        // CREATE STUDENT
        // =========================================================

        public async Task<StudentResponseDto> CreateAsync(
            CreateStudentDto dto,
            long? userId)
        {
            await ValidateStudentAsync(dto);

            var code =
                NormalizeCode(dto.StudentCode);

            if (await _studentRepository
                .StudentCodeExistsAsync(code))
            {
                throw new InvalidOperationException(
                    $"Student code '{code}' already exists.");
            }

            var student =
                BuildStudent(dto);

            student.StudentCode =
                code;

            student.CreatedAt =
                DateTime.UtcNow;

            student.CreatedBy =
                userId;

            var created =
                await _studentRepository
                    .CreateAsync(student);

            return Map(created);
        }

        // =========================================================
        // UPDATE STUDENT
        // =========================================================

        public async Task<StudentResponseDto?> UpdateAsync(
            long studentId,
            UpdateStudentDto dto,
            long? userId)
        {
            if (studentId <= 0)
            {
                throw new ArgumentException(
                    "A valid student ID is required.");
            }

            var existing =
                await _studentRepository
                    .GetByIdAsync(studentId);

            if (existing == null)
            {
                return null;
            }

            await ValidateStudentAsync(dto);

            var code =
                NormalizeCode(dto.StudentCode);

            if (await _studentRepository
                .StudentCodeExistsAsync(
                    code,
                    studentId))
            {
                throw new InvalidOperationException(
                    $"Student code '{code}' already exists.");
            }

            var student =
                BuildStudent(dto);

            student.StudentId =
                studentId;

            student.StudentCode =
                code;

            student.CreatedAt =
                existing.CreatedAt;

            student.CreatedBy =
                existing.CreatedBy;

            student.UpdatedAt =
                DateTime.UtcNow;

            student.UpdatedBy =
                userId;

            var updated =
                await _studentRepository
                    .UpdateAsync(student);

            return updated == null
                ? null
                : Map(updated);
        }

        // =========================================================
        // UPDATE STUDENT STATUS
        // =========================================================

        public async Task<StudentResponseDto?>
            UpdateStatusAsync(
                long studentId,
                sbyte status,
                long? userId)
        {
            if (studentId <= 0)
            {
                throw new ArgumentException(
                    "A valid student ID is required.");
            }

            if (status is not (0 or 1))
            {
                throw new ArgumentException(
                    "Status must be 0 or 1.");
            }

            var updated =
                await _studentRepository
                    .UpdateStatusAsync(
                        studentId,
                        status,
                        userId);

            return updated == null
                ? null
                : Map(updated);
        }

        // =========================================================
        // GET STUDENT DOCUMENTS
        // =========================================================

        public async Task<
            IReadOnlyList<StudentDocumentResponseDto>>
            GetDocumentsAsync(
                long studentId)
        {
            if (studentId <= 0)
            {
                throw new ArgumentException(
                    "A valid student ID is required.");
            }

            return await _studentRepository
                .GetDocumentsAsync(studentId);
        }

        // =========================================================
        // VALIDATE STUDENT
        // =========================================================

        private async Task ValidateStudentAsync(
            CreateStudentDto dto)
        {
            if (string.IsNullOrWhiteSpace(
                dto.StudentCode))
            {
                throw new ArgumentException(
                    "Student code is required.");
            }

            if (string.IsNullOrWhiteSpace(
                dto.FullName))
            {
                throw new ArgumentException(
                    "Full name is required.");
            }

            if (dto.CollegeId <= 0)
            {
                throw new ArgumentException(
                    "A valid CollegeId is required.");
            }

            if (dto.AcademicYearId <= 0)
            {
                throw new ArgumentException(
                    "A valid AcademicYearId is required.");
            }

            if (dto.Status is not (0 or 1))
            {
                throw new ArgumentException(
                    "Status must be 0 or 1.");
            }

            if (dto.DateOfBirth.HasValue &&
                dto.DateOfBirth.Value.Date >
                DateTime.UtcNow.Date)
            {
                throw new ArgumentException(
                    "Date of birth cannot be in the future.");
            }

            if (dto.BranchId.HasValue &&
                !dto.CourseId.HasValue)
            {
                throw new ArgumentException(
                    "CourseId is required when BranchId is supplied.");
            }

            var references =
                await _studentRepository
                    .ValidateReferencesAsync(
                        dto.CollegeId,
                        dto.AcademicYearId,
                        dto.CourseId,
                        dto.BranchId);

            if (!references.CollegeExists)
            {
                throw new ArgumentException(
                    "CollegeId does not exist.");
            }

            if (!references.AcademicYearExists)
            {
                throw new ArgumentException(
                    "AcademicYearId does not exist.");
            }

            if (!references.CourseExists)
            {
                throw new ArgumentException(
                    "CourseId does not exist.");
            }

            if (!references.BranchExists)
            {
                throw new ArgumentException(
                    "BranchId does not exist.");
            }

            if (!references.CourseBelongsToCollege)
            {
                throw new ArgumentException(
                    "The selected course does not belong to the selected college.");
            }

            if (!references.BranchBelongsToCourse)
            {
                throw new ArgumentException(
                    "The selected branch does not belong to the selected course.");
            }
        }

        // =========================================================
        // VALIDATE FILTER
        // =========================================================

        private static void ValidateFilter(
            StudentListFilterDto filter)
        {
            if (filter.PageNumber <= 0)
            {
                throw new ArgumentException(
                    "PageNumber must be greater than zero.");
            }

            if (filter.PageSize is <= 0 or > 100)
            {
                throw new ArgumentException(
                    "PageSize must be between 1 and 100.");
            }

            if (filter.Status.HasValue &&
                filter.Status.Value is not (0 or 1))
            {
                throw new ArgumentException(
                    "Status must be 0 or 1.");
            }
        }

        // =========================================================
        // BUILD STUDENT
        // =========================================================

        private static Student BuildStudent(
            CreateStudentDto dto)
        {
            return new Student
            {
                CollegeId =
                    dto.CollegeId,

                StudentCode =
                    NormalizeCode(
                        dto.StudentCode),

                FullName =
                    dto.FullName.Trim(),

                Gender =
                    NormalizeGender(
                        dto.Gender),

                DateOfBirth =
                    dto.DateOfBirth?.Date,

                Email =
                    Clean(dto.Email)?
                    .ToLowerInvariant(),

                Mobile =
                    Clean(dto.Mobile),

                BloodGroup =
                    Clean(dto.BloodGroup)?
                    .ToUpperInvariant(),

                Address =
                    Clean(dto.Address),

                CourseId =
                    dto.CourseId,

                BranchId =
                    dto.BranchId,

                AcademicYearId =
                    dto.AcademicYearId,

                Status =
                    unchecked(
                        (byte)dto.Status)
            };
        }

        // =========================================================
        // BUILD PAGE
        // =========================================================

        private static StudentPagedResponseDto
            BuildPage(
                IReadOnlyList<Student> students,
                long totalRecords,
                StudentListFilterDto filter)
        {
            return new StudentPagedResponseDto
            {
                Items =
                    students
                        .Select(Map)
                        .ToArray(),

                PageNumber =
                    filter.PageNumber,

                PageSize =
                    filter.PageSize,

                TotalRecords =
                    totalRecords,

                TotalPages =
                    totalRecords == 0
                        ? 0
                        : (int)Math.Ceiling(
                            totalRecords /
                            (double)filter.PageSize)
            };
        }

        // =========================================================
        // MAP STUDENT
        // =========================================================

        private static StudentResponseDto Map(
            Student student)
        {
            return new StudentResponseDto
            {
                StudentId =
                    student.StudentId,

                CollegeId =
                    student.CollegeId,

                CollegeName =
                    student.CollegeName,

                StudentCode =
                    student.StudentCode,

                FullName =
                    student.FullName,

                Gender =
                    student.Gender,

                DateOfBirth =
                    student.DateOfBirth,

                Email =
                    student.Email,

                Mobile =
                    student.Mobile,

                BloodGroup =
                    student.BloodGroup,

                Address =
                    student.Address,

                CourseId =
                    student.CourseId,

                CourseName =
                    student.CourseName,

                BranchId =
                    student.BranchId,

                BranchName =
                    student.BranchName,

                AcademicYearId =
                    student.AcademicYearId,

                AcademicYearName =
                    student.AcademicYearName,

                Status =
                    unchecked(
                        (sbyte)student.Status),

                CreatedAt =
                    student.CreatedAt,

                UpdatedAt =
                    student.UpdatedAt,

                Documents =
                    Array.Empty<
                        StudentDocumentResponseDto>()
            };
        }

        // =========================================================
        // NORMALIZE STUDENT CODE
        // =========================================================

        private static string NormalizeCode(
            string value)
        {
            return value
                .Trim()
                .ToUpperInvariant();
        }

        // =========================================================
        // NORMALIZE GENDER
        // =========================================================

        private static string? NormalizeGender(
            string? value)
        {
            var gender =
                Clean(value);

            if (gender == null)
            {
                return null;
            }

            if (gender.Equals(
                "Male",
                StringComparison.OrdinalIgnoreCase))
            {
                return "Male";
            }

            if (gender.Equals(
                "Female",
                StringComparison.OrdinalIgnoreCase))
            {
                return "Female";
            }

            if (gender.Equals(
                "Other",
                StringComparison.OrdinalIgnoreCase))
            {
                return "Other";
            }

            throw new ArgumentException(
                "Gender must be Male, Female, Other, or empty.");
        }

        // =========================================================
        // CLEAN STRING
        // =========================================================

        private static string? Clean(
            string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? null
                : value.Trim();
        }
    }
}