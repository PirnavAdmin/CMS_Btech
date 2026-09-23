using BTech.Data;

using BTech.DTOs.Profile;

using BTech.Models;

using BTech.Repositories.Interfaces;

using Dapper;

using Microsoft.EntityFrameworkCore;

using System.Data;

namespace BTech.Repositories

{

    public class EmployeeProfileRepository : IEmployeeProfileRepository

    {

        private readonly ApplicationDbContext _context;

        public EmployeeProfileRepository(ApplicationDbContext context)

        {

            _context = context;

        }

        public async Task<EmployeeProfile?> GetByUserIdAsync(long userId)

        {

            var connection = _context.Database.GetDbConnection();

            var shouldClose =

                connection.State != ConnectionState.Open;

            if (shouldClose)

                await connection.OpenAsync();

            try

            {

                var result =

                    await connection.QueryFirstOrDefaultAsync<EmployeeProfile>(

                        "sp_get_employee_profile",

                        new

                        {

                            p_user_id = userId

                        },

                        commandType: CommandType.StoredProcedure);

                return result;

            }

            finally

            {

                if (shouldClose)

                    await connection.CloseAsync();

            }

        }

        public async Task<Department?> GetDepartmentByIdAsync(

            long departmentId)

        {

            return await _context.Departments

                .AsNoTracking()

                .FirstOrDefaultAsync(d =>

                    d.DepartmentId == departmentId &&

                    d.Status == 1 &&

                    d.DeletedAt == null);

        }

        public async Task<bool> UpdateAsync(

            long userId,

            DateTime? dateOfBirth,

            string? gender,

            long? departmentId,

            string? designation,

            string? address,

            string? pincode,

            string? city,

            string? district,

            string? state,

            string? aboutMe,

            long updatedBy,

            UpdateProfileRequestDto? addressFields = null)

        {

            var connection = _context.Database.GetDbConnection();

            var shouldClose =

                connection.State != ConnectionState.Open;

            if (shouldClose)

                await connection.OpenAsync();

            try

            {

                var parameters = new

                {

                    p_user_id = userId,

                    p_date_of_birth = dateOfBirth,

                    p_gender = gender,

                    p_department_id = departmentId,

                    p_designation = designation,

                    p_house_number =

                        addressFields?.HouseNumber,

                    p_address = address,

                    p_pincode = pincode,

                    p_city = city,

                    p_district = district,

                    p_state = state,

                    p_permanent_house_number =

                        addressFields?.PermanentHouseNumber,

                    p_permanent_address =

                        addressFields?.PermanentAddress,

                    p_permanent_pincode =

                        addressFields?.PermanentPincode,

                    p_permanent_city =

                        addressFields?.PermanentCity,

                    p_permanent_district =

                        addressFields?.PermanentDistrict,

                    p_permanent_state =

                        addressFields?.PermanentState,

                    p_permanent_country =

                        addressFields?.PermanentCountry,

                    p_about_me = aboutMe,

                    p_updated_by = updatedBy

                };

                var result =

                    await connection.QueryFirstOrDefaultAsync<int>(

                        "sp_update_employee_profile",

                        parameters,

                        commandType: CommandType.StoredProcedure);

                return result > 0;

            }

            finally

            {

                if (shouldClose)

                    await connection.CloseAsync();

            }

        }

    }

}
