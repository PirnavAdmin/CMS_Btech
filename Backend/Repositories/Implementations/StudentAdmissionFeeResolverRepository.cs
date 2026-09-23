using System.Data;
using BTech.Data;
using BTech.DTOs.Fees;
using BTech.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace BTech.Repositories.Implementations
{
    public sealed class StudentAdmissionFeeResolverRepository : IStudentAdmissionFeeResolverRepository
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<StudentAdmissionFeeResolverRepository> _logger;

        public StudentAdmissionFeeResolverRepository(
            ApplicationDbContext context,
            ILogger<StudentAdmissionFeeResolverRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<StudentAdmissionFeeResolveResultDto?> ResolveAndSaveAsync(
            long admissionId,
            StudentAdmissionFeeResolveRequestDto request,
            string resolvedAdmissionType,
            long actorUserId)
        {
            try
            {
                var connection = _context.Database.GetDbConnection();
                var shouldClose = connection.State != ConnectionState.Open;
                if (shouldClose)
                    await connection.OpenAsync();

                try
                {
                    return await connection.QueryFirstOrDefaultAsync<StudentAdmissionFeeResolveResultDto>(
                        "sp_student_admission_fee_resolve_and_save",
                        new
                        {
                            p_admission_id = admissionId,
                            p_academic_year_id = request.AcademicYearId,
                            p_course_id = request.CourseId,
                            p_department_id = request.DepartmentId,
                            p_branch_id = request.BranchId,
                            p_semester_id = request.SemesterId,
                            p_admission_type = request.AdmissionType,
                            p_resolved_admission_type = resolvedAdmissionType,
                            p_quota = request.Quota,
                            p_student_category = request.StudentCategory,
                            p_hostel_required = request.HostelRequired ? 1 : 0,
                            p_hostel_type = request.HostelType,
                            p_room_type = request.RoomType,
                            p_transport_required = request.TransportationRequired ? 1 : 0,
                            p_route_id = request.RouteId,
                            p_route_code = request.RouteCode,
                            p_route_name = request.RouteName,
                            p_scholarship_amount = request.ScholarshipAmount,
                            p_payment_plan = request.PaymentPlan,
                            p_payment_status = request.PaymentStatus,
                            p_updated_by = actorUserId
                        },
                        commandType: CommandType.StoredProcedure);
                }
                finally
                {
                    if (shouldClose)
                        await connection.CloseAsync();
                }
            }
            catch (MySqlException ex) when (ex.SqlState == "45000")
            {
                _logger.LogWarning(ex, "Fee resolution validation failed. AdmissionId={AdmissionId}", admissionId);
                throw new ArgumentException(ex.Message, ex);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fee resolution repository failed. AdmissionId={AdmissionId}", admissionId);
                throw;
            }
        }
    }
}
