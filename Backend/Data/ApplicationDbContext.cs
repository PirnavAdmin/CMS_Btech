using BTech.Models;
using Microsoft.EntityFrameworkCore;

namespace BTech.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(
            DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();

        public DbSet<Role> Roles => Set<Role>();
        public DbSet<Student> Students => Set<Student>();

        public DbSet<DemoRequest> DemoRequests { get; set; }

        public DbSet<CourseSemesterMapping> CourseSemesterMappings
        {
            get => Set<CourseSemesterMapping>();
        }
        public DbSet<Semester> Semesters => Set<Semester>();
        public DbSet<SubjectSemesterAssignment> SubjectSemesterAssignments
        {
            get => Set<SubjectSemesterAssignment>();
        }

        public DbSet<UserRole> UserRoles => Set<UserRole>();

        public DbSet<LoginAudit> LoginAudits => Set<LoginAudit>();

        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

        public DbSet<OtpVerification> OtpVerifications
        {
            get => Set<OtpVerification>();
        }

        public DbSet<College> Colleges
        {
            get => Set<College>();
        }

        public DbSet<AcademicYear> AcademicYears
        {
            get => Set<AcademicYear>();
        }

        public DbSet<AcademicLevel> AcademicLevels
        {
            get => Set<AcademicLevel>();
        }

        public DbSet<Department> Departments => Set<Department>();
        public DbSet<FacultyProfile> FacultyProfiles { get; set; }
        public DbSet<Faculty> Faculties { get; set; }
        public DbSet<FacultyDocument> FacultyDocuments { get; set; }

        public DbSet<Course> Courses
        {
            get => Set<Course>();
        }

        public DbSet<Branch> Branches
        {
            get => Set<Branch>();
        }

        public DbSet<CourseStructure> CourseStructures
        {
            get => Set<CourseStructure>();
        }

        public DbSet<EmployeeProfile> EmployeeProfiles
            => Set<EmployeeProfile>();

        public DbSet<CollegeSetting> CollegeSettings
            => Set<CollegeSetting>();

        public DbSet<CollegeUserMapping> CollegeUserMappings
            => Set<CollegeUserMapping>();

        public DbSet<Section> Sections
            => Set<Section>();


        public DbSet<Timetable> Timetables
    => Set<Timetable>();

        public DbSet<TimetableSlot> TimetableSlots
            => Set<TimetableSlot>();

        public DbSet<TimetableEntry> TimetableEntries
            => Set<TimetableEntry>();
        public DbSet<RegistrationRequest> RegistrationRequests
            => Set<RegistrationRequest>();
        public DbSet<StudentPromotion> StudentPromotions
    => Set<StudentPromotion>();

        // =====================================================
        // STUDENT / ADMISSION / PARENT
        // =====================================================

        public DbSet<StudentParent> StudentParents
            => Set<StudentParent>();

        public DbSet<StudentAdmission> StudentAdmissions
            => Set<StudentAdmission>();

        public DbSet<AdmissionStatusHistory> AdmissionStatusHistories
            => Set<AdmissionStatusHistory>();

        protected override void OnModelCreating(
            ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            


        // =====================================================
        // ACADEMIC YEARS
        // =====================================================

        modelBuilder.Entity<AcademicYear>(entity =>
            {
                entity.ToTable("academicyears");

                entity.HasKey(x => x.AcademicYearId);

                entity.Property(x => x.AcademicYearId)
                    .HasColumnName("academic_year_id")
                    .ValueGeneratedOnAdd();

                entity.Property(x => x.AcademicYearName)
                    .HasColumnName("academic_year_name")
                    .HasMaxLength(50)
                    .IsRequired();

                entity.Property(x => x.StartDate)
                    .HasColumnName("start_date");

                entity.Property(x => x.EndDate)
                    .HasColumnName("end_date");

                entity.Property(x => x.Status)
                    .HasColumnName("status");

                entity.Property(x => x.IsArchived)
                    .HasColumnName("is_archived");

                entity.Property(x => x.CreatedAt)
                    .HasColumnName("created_at");

                entity.Property(x => x.CreatedBy)
                    .HasColumnName("created_by");

                entity.Property(x => x.UpdatedAt)
                    .HasColumnName("updated_at");

                entity.Property(x => x.UpdatedBy)
                    .HasColumnName("updated_by");

                entity.Property(x => x.DeletedAt)
                    .HasColumnName("deleted_at");

                entity.Property(x => x.DeletedBy)
                    .HasColumnName("deleted_by");

                entity.HasIndex(x => x.AcademicYearName)
                    .IsUnique();
            });


            // =====================================================
            // USERS
            // =====================================================

            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("users");

                entity.HasKey(x => x.user_id);

                entity.Property(x => x.user_id)
                    .HasColumnName("user_id")
                    .ValueGeneratedOnAdd();

                entity.Property(x => x.college_id)
                    .HasColumnName("college_id");

                entity.Property(x => x.EmployeeUserId)
                    .HasColumnName("employee_user_id")
                    .HasMaxLength(50)
                    .IsRequired();

                entity.Property(x => x.FullName)
                    .HasColumnName("full_name")
                    .HasMaxLength(150)
                    .IsRequired();

                entity.Property(x => x.Email)
                    .HasColumnName("email")
                    .HasMaxLength(150);

                entity.Property(x => x.Mobile)
                    .HasColumnName("mobile")
                    .HasMaxLength(15);

                entity.Property(x => x.PasswordHash)
                    .HasColumnName("password_hash")
                    .HasMaxLength(255)
                    .IsRequired();

                entity.Property(x => x.Status)
                    .HasColumnName("status")
                    .HasDefaultValue(1);

                entity.Property(x => x.LastLoginAt)
                    .HasColumnName("last_login_at");

                entity.Property(x => x.CreatedAt)
                    .HasColumnName("created_at");

                entity.Property(x => x.CreatedBy)
                    .HasColumnName("created_by");

                entity.Property(x => x.UpdatedAt)
                    .HasColumnName("updated_at");

                entity.Property(x => x.UpdatedBy)
                    .HasColumnName("updated_by");

                entity.Property(x => x.DeletedAt)
                    .HasColumnName("deleted_at");

                entity.Property(x => x.DeletedBy)
                    .HasColumnName("deleted_by");

                entity.HasIndex(x => x.EmployeeUserId)
                    .IsUnique();

                entity.HasIndex(x => x.Email)
                    .IsUnique();

                entity.HasIndex(x => x.Mobile)
                    .IsUnique();
            });


            // =====================================================
            // ROLES
            // =====================================================

            modelBuilder.Entity<Role>(entity =>
            {
                entity.ToTable("roles");

                entity.HasKey(x => x.Role_id);

                entity.Property(x => x.Role_id)
                    .HasColumnName("role_id")
                    .ValueGeneratedOnAdd();

                entity.Property(x => x.RoleName)
                    .HasColumnName("role_name")
                    .HasMaxLength(100)
                    .IsRequired();

                entity.Property(x => x.RoleCode)
                    .HasColumnName("role_code")
                    .HasMaxLength(50)
                    .IsRequired();

                entity.Property(x => x.Description)
                    .HasColumnName("description")
                    .HasMaxLength(255);

                entity.Property(x => x.Status)
                    .HasColumnName("status")
                    .HasDefaultValue(1);

                entity.Property(x => x.CreatedAt)
                    .HasColumnName("created_at");

                entity.Property(x => x.CreatedBy)
                    .HasColumnName("created_by");

                entity.Property(x => x.UpdatedAt)
                    .HasColumnName("updated_at");

                entity.Property(x => x.UpdatedBy)
                    .HasColumnName("updated_by");

                entity.Property(x => x.DeletedAt)
                    .HasColumnName("deleted_at");

                entity.Property(x => x.DeletedBy)
                    .HasColumnName("deleted_by");

                entity.HasIndex(x => x.RoleName)
                    .IsUnique();

                entity.HasIndex(x => x.RoleCode)
                    .IsUnique();
            });


            // =====================================================
            // USER ROLES
            // =====================================================

            modelBuilder.Entity<UserRole>(entity =>
            {
                entity.ToTable("user_roles");

                entity.HasKey(x => x.user_role_id);

                entity.Property(x => x.user_role_id)
                    .HasColumnName("user_role_id")
                    .ValueGeneratedOnAdd();

                entity.Property(x => x.UserId)
                    .HasColumnName("user_id")
                    .IsRequired();

                entity.Property(x => x.RoleId)
                    .HasColumnName("role_id")
                    .IsRequired();

                entity.Property(x => x.Status)
                    .HasColumnName("status")
                    .HasDefaultValue(1);

                entity.Property(x => x.AssignedAt)
                    .HasColumnName("assigned_at");

                entity.Property(x => x.AssignedBy)
                    .HasColumnName("assigned_by");

                entity.Property(x => x.UpdatedAt)
                    .HasColumnName("updated_at");

                entity.Property(x => x.UpdatedBy)
                    .HasColumnName("updated_by");

                entity.Property(x => x.RemovedAt)
                    .HasColumnName("removed_at");

                entity.Property(x => x.RemovedBy)
                    .HasColumnName("removed_by");

                entity.HasIndex(x => x.UserId);

                entity.HasIndex(x => x.RoleId);
            });


            // =====================================================
            // LOGIN AUDITS
            // =====================================================

            modelBuilder.Entity<LoginAudit>(entity =>
            {
                entity.ToTable("login_audits");

                entity.HasKey(x => x.login_audit_id);

                entity.Property(x => x.login_audit_id)
                    .HasColumnName("login_audit_id")
                    .ValueGeneratedOnAdd();

                entity.Property(x => x.UserId)
                    .HasColumnName("user_id");

                entity.Property(x => x.LoginIdentifier)
                    .HasColumnName("login_identifier")
                    .HasMaxLength(150);

                entity.Property(x => x.EventType)
                    .HasColumnName("event_type")
                    .HasMaxLength(50)
                    .IsRequired();

                entity.Property(x => x.LoginStatus)
                    .HasColumnName("login_status")
                    .HasMaxLength(30)
                    .IsRequired();

                entity.Property(x => x.IpAddress)
                    .HasColumnName("ip_address")
                    .HasMaxLength(45);

                entity.Property(x => x.UserAgent)
                    .HasColumnName("user_agent")
                    .HasMaxLength(500);

                entity.Property(x => x.FailureReason)
                    .HasColumnName("failure_reason")
                    .HasMaxLength(255);

                entity.Property(x => x.LoginAt)
                    .HasColumnName("login_at");

                entity.Property(x => x.LogoutAt)
                    .HasColumnName("logout_at");

                entity.Property(x => x.CreatedAt)
                    .HasColumnName("created_at");
            });


            // =====================================================
            // REFRESH TOKENS
            // =====================================================

            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.ToTable("refresh_tokens");

                entity.HasKey(x => x.RefreshTokenId);

                entity.Property(x => x.RefreshTokenId)
                    .HasColumnName("refresh_token_id")
                    .ValueGeneratedOnAdd();

                entity.Property(x => x.UserId)
                    .HasColumnName("user_id")
                    .IsRequired();

                entity.Property(x => x.TokenHash)
                    .HasColumnName("token_hash")
                    .HasMaxLength(255)
                    .IsRequired();

                entity.Property(x => x.ExpiresAt)
                    .HasColumnName("expires_at")
                    .IsRequired();

                entity.Property(x => x.CreatedAt)
                    .HasColumnName("created_at")
                    .IsRequired();

                entity.Property(x => x.RevokedAt)
                    .HasColumnName("revoked_at");

                entity.Property(x => x.ReplacedByTokenHash)
                    .HasColumnName("replaced_by_token_hash")
                    .HasMaxLength(255);

                entity.Property(x => x.CreatedByIp)
                    .HasColumnName("created_by_ip")
                    .HasMaxLength(45);

                entity.HasIndex(x => x.TokenHash)
                    .IsUnique();

                entity.HasIndex(x => x.UserId);

                entity.HasIndex(x => x.ExpiresAt);
            });


            // =====================================================
            // OTP
            // =====================================================

            modelBuilder.Entity<OtpVerification>(entity =>
            {
                entity.HasKey(e => e.OtpVerificationId);

                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.SetNull);
            });


            // =====================================================
            // COLLEGE
            // =====================================================

            modelBuilder.Entity<College>(entity =>
            {
                entity.HasIndex(e => e.CollegeCode)
                    .IsUnique();

                entity.HasIndex(e => e.CollegeName);

                entity.HasIndex(e => e.Status);

                entity.HasIndex(e => e.AcademicYearId);
            });


            // =====================================================
            // DEPARTMENT
            // =====================================================

            modelBuilder.Entity<Department>(entity =>
            {
                entity.ToTable("departments");

                entity.HasKey(x => x.DepartmentId);

                entity.Property(x => x.DepartmentId)
                    .HasColumnName("department_id")
                    .ValueGeneratedOnAdd();

                entity.Property(x => x.CollegeId)
                    .HasColumnName("college_id");

                entity.Property(x => x.DepartmentCode)
                    .HasColumnName("department_code")
                    .HasMaxLength(50)
                    .IsRequired();

                entity.Property(x => x.DepartmentName)
                    .HasColumnName("department_name")
                    .HasMaxLength(150)
                    .IsRequired();

                entity.Property(x => x.Description)
                    .HasColumnName("description")
                    .HasMaxLength(500);

                entity.Property(x => x.Status)
                    .HasColumnName("status");

                entity.Property(x => x.CreatedAt)
                    .HasColumnName("created_at");

                entity.Property(x => x.CreatedBy)
                    .HasColumnName("created_by");

                entity.Property(x => x.UpdatedAt)
                    .HasColumnName("updated_at");

                entity.Property(x => x.UpdatedBy)
                    .HasColumnName("updated_by");

                entity.Property(x => x.DeletedAt)
                    .HasColumnName("deleted_at");

                entity.Property(x => x.DeletedBy)
                    .HasColumnName("deleted_by");

                entity.HasIndex(x =>
                    new
                    {
                        x.CollegeId,
                        x.DepartmentCode
                    })
                    .IsUnique();
            });


            // =====================================================
            // EMPLOYEE PROFILE
            // =====================================================

            modelBuilder.Entity<EmployeeProfile>(entity =>
            {
                entity.ToTable("employee_profiles");

                entity.HasKey(x => x.EmployeeProfileId);

                entity.Property(x => x.EmployeeProfileId)
                    .HasColumnName("employee_profile_id")
                    .ValueGeneratedOnAdd();

                entity.Property(x => x.UserId)
                    .HasColumnName("user_id");

                entity.Property(x => x.DateOfBirth)
                    .HasColumnName("date_of_birth");

                entity.Property(x => x.Gender)
                    .HasColumnName("gender")
                    .HasMaxLength(20);

                entity.Property(x => x.DepartmentId)
                    .HasColumnName("department_id");

                entity.Property(x => x.Designation)
                    .HasColumnName("designation")
                    .HasMaxLength(150);

                entity.Property(x => x.Address)
                    .HasColumnName("address")
                    .HasMaxLength(500);

                entity.Property(x => x.Pincode)
                    .HasColumnName("pincode")
                    .HasMaxLength(10);

                entity.Property(x => x.City)
                    .HasColumnName("city")
                    .HasMaxLength(100);

                entity.Property(x => x.District)
                    .HasColumnName("district")
                    .HasMaxLength(100);

                entity.Property(x => x.State)
                    .HasColumnName("state")
                    .HasMaxLength(100);

                entity.Property(x => x.AboutMe)
                    .HasColumnName("about_me")
                    .HasMaxLength(1000);

                entity.Property(x => x.ProfileImagePath)
                    .HasColumnName("profile_image_path")
                    .HasMaxLength(500);

                entity.Property(x => x.Status)
                    .HasColumnName("status");

                entity.Property(x => x.CreatedAt)
                    .HasColumnName("created_at");

                entity.Property(x => x.CreatedBy)
                    .HasColumnName("created_by");

                entity.Property(x => x.UpdatedAt)
                    .HasColumnName("updated_at");

                entity.Property(x => x.UpdatedBy)
                    .HasColumnName("updated_by");

                entity.Property(x => x.DeletedAt)
                    .HasColumnName("deleted_at");

                entity.Property(x => x.DeletedBy)
                    .HasColumnName("deleted_by");

                entity.HasIndex(x => x.UserId)
                    .IsUnique();

                entity.HasOne(x => x.User)
                    .WithOne()
                    .HasForeignKey<EmployeeProfile>(x => x.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(x => x.Department)
                    .WithMany(x => x.EmployeeProfiles)
                    .HasForeignKey(x => x.DepartmentId)
                    .OnDelete(DeleteBehavior.SetNull);
            });


            // =====================================================
            // COLLEGE SETTINGS
            // =====================================================

            modelBuilder.Entity<CollegeSetting>(entity =>
            {
                entity.ToTable("college_settings");

                entity.HasKey(x => x.Id);

                entity.Property(x => x.Id)
                    .HasColumnName("college_setting_id")
                    .ValueGeneratedOnAdd();

                // Correct College/Institution master foreign key
                entity.Property(x => x.CollegeId)
                    .HasColumnName("college_id")
                    .IsRequired();

                entity.HasIndex(x => x.CollegeCode)
                    .IsUnique();

                // One Settings record per College
                entity.HasIndex(x => x.CollegeId)
                    .IsUnique();

                // college_settings.college_id -> colleges.college_id
                entity.HasOne(x => x.College)
                    .WithOne()
                    .HasForeignKey<CollegeSetting>(x => x.CollegeId)
                    .OnDelete(DeleteBehavior.Restrict);
            });


            // =====================================================
            // COLLEGE USER MAPPING
            // =====================================================

            modelBuilder.Entity<CollegeUserMapping>(entity =>
            {
                entity.ToTable("college_user_mappings");

                entity.HasKey(x => x.Id);

                entity.Property(x => x.Id)
                    .HasColumnName("college_user_mapping_id")
                    .ValueGeneratedOnAdd();

                entity.Property(x => x.UserId)
                    .HasColumnName("user_id")
                    .IsRequired();

                entity.Property(x => x.CollegeSettingId)
                    .HasColumnName("college_setting_id")
                    .IsRequired();

                entity.Property(x => x.Status)
                    .HasColumnName("status")
                    .HasDefaultValue((byte)1);

                entity.Property(x => x.AssignedAt)
                    .HasColumnName("assigned_at");

                entity.Property(x => x.AssignedBy)
                    .HasColumnName("assigned_by");

                entity.Property(x => x.UpdatedAt)
                    .HasColumnName("updated_at");

                entity.Property(x => x.UpdatedBy)
                    .HasColumnName("updated_by");

                entity.Property(x => x.RemovedAt)
                    .HasColumnName("removed_at");

                entity.Property(x => x.RemovedBy)
                    .HasColumnName("removed_by");

                entity.HasIndex(x =>
                    new
                    {
                        x.UserId,
                        x.CollegeSettingId
                    })
                    .IsUnique();

                entity.HasIndex(x => x.UserId);

                entity.HasIndex(x => x.CollegeSettingId);

                entity.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(x => x.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne<CollegeSetting>()
                    .WithMany()
                    .HasForeignKey(x => x.CollegeSettingId)
                    .OnDelete(DeleteBehavior.Restrict);
            });


            // =====================================================
            // COURSE SEMESTER MAPPING
            // =====================================================

            modelBuilder.Entity<CourseSemesterMapping>(entity =>
            {
                entity.ToTable("course_semester_mappings");

                entity.HasKey(x => x.CourseSemesterMappingId);

                entity.Property(x => x.CourseSemesterMappingId)
                    .HasColumnName("course_semester_mapping_id");

                entity.Property(x => x.CourseId)
                    .HasColumnName("course_id");

                entity.Property(x => x.SemesterId)
                    .HasColumnName("semester_id");

                entity.Property(x => x.Status)
                    .HasColumnName("status");

                entity.Property(x => x.CreatedAt)
                    .HasColumnName("created_at");

                entity.Property(x => x.CreatedBy)
                    .HasColumnName("created_by");

                entity.Property(x => x.UpdatedAt)
                    .HasColumnName("updated_at");

                entity.Property(x => x.UpdatedBy)
                    .HasColumnName("updated_by");
            });


            // =====================================================
            // SUBJECT SEMESTER ASSIGNMENT
            // =====================================================

            modelBuilder.Entity<SubjectSemesterAssignment>(entity =>
            {
                entity.ToTable("subject_semester_assignments");

                entity.HasKey(x => x.SubjectSemesterAssignmentId);

                entity.Property(x => x.SubjectSemesterAssignmentId)
                    .HasColumnName("subject_semester_assignment_id")
                    .ValueGeneratedOnAdd();

                entity.Property(x => x.SubjectId)
                    .HasColumnName("subject_id")
                    .IsRequired();

                entity.Property(x => x.SemesterId)
                    .HasColumnName("semester_id")
                    .IsRequired();

                entity.Property(x => x.Status)
                    .HasColumnName("status")
                    .HasDefaultValue((byte)1);

                entity.Property(x => x.CreatedAt)
                    .HasColumnName("created_at");

                entity.Property(x => x.CreatedBy)
                    .HasColumnName("created_by");

                entity.Property(x => x.UpdatedAt)
                    .HasColumnName("updated_at");

                entity.Property(x => x.UpdatedBy)
                    .HasColumnName("updated_by");

                entity.HasIndex(x =>
                    new
                    {
                        x.SubjectId,
                        x.SemesterId
                    })
                    .IsUnique();
            });


            // =====================================================
            // SECTIONS
            // =====================================================

            modelBuilder.Entity<Section>(entity =>
            {
                entity.ToTable("sections");

                entity.HasKey(x => x.SectionId);

                entity.Property(x => x.SectionId)
                    .HasColumnName("section_id")
                    .ValueGeneratedOnAdd();

                entity.Property(x => x.CollegeId)
                    .HasColumnName("college_id")
                    .IsRequired();

                entity.Property(x => x.AcademicYearId)
                    .HasColumnName("academic_year_id")
                    .IsRequired();

                entity.Property(x => x.DepartmentId)
                    .HasColumnName("department_id")
                    .IsRequired();

                entity.Property(x => x.CourseId)
                    .HasColumnName("course_id")
                    .IsRequired();

                entity.Property(x => x.BranchId)
                    .HasColumnName("branch_id")
                    .IsRequired();

                entity.Property(x => x.SemesterId)
                    .HasColumnName("semester_id")
                    .IsRequired();

                entity.Property(x => x.SectionCode)
                    .HasColumnName("section_code")
                    .HasMaxLength(20)
                    .IsRequired();

                entity.Property(x => x.SectionName)
                    .HasColumnName("section_name")
                    .HasMaxLength(100)
                    .IsRequired();

                entity.Property(x => x.Room)
                    .HasColumnName("room")
                    .HasMaxLength(100);

                entity.Property(x => x.Shift)
                    .HasColumnName("shift")
                    .HasMaxLength(30);

                entity.Property(x => x.SectionType)
                    .HasColumnName("section_type")
                    .HasMaxLength(50);

                entity.Property(x => x.Capacity)
                    .HasColumnName("capacity")
                    .IsRequired();

                entity.Property(x => x.Status)
                    .HasColumnName("status");

                entity.Property(x => x.IsArchived)
                    .HasColumnName("is_archived");

                entity.Property(x => x.CreatedAt)
                    .HasColumnName("created_at");

                entity.Property(x => x.CreatedBy)
                    .HasColumnName("created_by");

                entity.Property(x => x.UpdatedAt)
                    .HasColumnName("updated_at");

                entity.Property(x => x.UpdatedBy)
                    .HasColumnName("updated_by");

                entity.HasIndex(x =>
                    new
                    {
                        x.AcademicYearId,
                        x.DepartmentId,
                        x.CourseId,
                        x.BranchId,
                        x.SemesterId,
                        x.SectionCode
                    });
            });


            // =====================================================
            // USER ROLE MAPPINGS
            // =====================================================

            // ApplicationDbContext uses UserRole for the user_roles table.
            // UserRoleMapping belongs to the separate AppDbContext retained
            // for the legacy admission/user-role APIs. Ignoring it here
            // prevents EF Core from mapping two unrelated entity types to
            // the same table while preserving both APIs and contexts.
            modelBuilder.Ignore<UserRoleMapping>();


            // =====================================================
            // COURSE
            // =====================================================

            modelBuilder.Entity<Course>(entity =>
            {
                entity.ToTable("courses");

                entity.HasKey(x => x.CourseId);

                entity.Property(x => x.CourseId)
                    .HasColumnName("course_id")
                    .ValueGeneratedOnAdd();

                entity.Property(x => x.CollegeId)
                    .HasColumnName("college_id")
                    .IsRequired();

                entity.Property(x => x.CourseCode)
                    .HasColumnName("course_code")
                    .HasMaxLength(50)
                    .IsRequired();

                entity.Property(x => x.CourseName)
                    .HasColumnName("course_name")
                    .HasMaxLength(150)
                    .IsRequired();

                entity.Property(x => x.CourseShortName)
                    .HasColumnName("course_short_name")
                    .HasMaxLength(50);

                entity.Property(x => x.CourseType)
                    .HasColumnName("course_type")
                    .HasMaxLength(50);

                entity.Property(x => x.DurationYears)
                    .HasColumnName("duration_years")
                    .IsRequired();

                entity.Property(x => x.TotalSemesters)
                    .HasColumnName("total_semesters")
                    .IsRequired();

                entity.Property(x => x.Eligibility)
                    .HasColumnName("eligibility")
                    .HasMaxLength(255);

                entity.Property(x => x.Description)
                    .HasColumnName("description")
                    .HasMaxLength(500);

                entity.Property(x => x.Status)
                    .HasColumnName("status")
                    .HasDefaultValue(1);

                entity.Property(x => x.CreatedAt)
                    .HasColumnName("created_at");

                entity.Property(x => x.CreatedBy)
                    .HasColumnName("created_by");

                entity.Property(x => x.UpdatedAt)
                    .HasColumnName("updated_at");

                entity.Property(x => x.UpdatedBy)
                    .HasColumnName("updated_by");

                entity.Property(x => x.DeletedAt)
                    .HasColumnName("deleted_at");

                entity.Property(x => x.DeletedBy)
                    .HasColumnName("deleted_by");

                entity.HasIndex(x => x.CollegeId);

                entity.HasIndex(x => x.DepartmentId);

                entity.HasIndex(x => x.CourseCode);

                entity.HasIndex(x => x.Status);
            });


            // =====================================================
            // BRANCH
            // =====================================================

            modelBuilder.Entity<Branch>(entity =>
            {
                entity.ToTable("branches");

                entity.HasKey(x => x.BranchId);


                // -------------------------------------------------
                // Primary Key
                // -------------------------------------------------

                entity.Property(x => x.BranchId)
                    .HasColumnName("branch_id")
                    .ValueGeneratedOnAdd();


                // -------------------------------------------------
                // Course
                // -------------------------------------------------

                entity.Property(x => x.CourseId)
                    .HasColumnName("course_id")
                    .IsRequired();

                entity.Property(x => x.BranchCode)
                    .HasColumnName("branch_code")
                    .HasMaxLength(50)
                    .IsRequired();

                entity.Property(x => x.BranchName)
                    .HasColumnName("branch_name")
                    .HasMaxLength(150)
                    .IsRequired();


                // -------------------------------------------------
                // Additional Branch Fields
                // -------------------------------------------------

                entity.Property(x => x.ShortName)
                    .HasColumnName("short_name")
                    .HasMaxLength(50);

                entity.Property(x => x.Specialization)
                    .HasColumnName("specialization")
                    .HasMaxLength(150);

                entity.Property(x => x.DepartmentId)
                    .HasColumnName("department_id");

                entity.Property(x => x.BranchType)
                    .HasColumnName("branch_type")
                    .HasMaxLength(50);

                entity.Property(x => x.Duration)
                    .HasColumnName("duration");

                entity.Property(x => x.TotalSemesters)
                    .HasColumnName("total_semesters");

                entity.Property(x => x.IntakeCapacity)
                    .HasColumnName("intake_capacity");

                entity.Property(x => x.StartingAcademicYearId)
                    .HasColumnName("starting_academic_year_id");

                entity.Property(x => x.Description)
                    .HasColumnName("description")
                    .HasMaxLength(500);


                // -------------------------------------------------
                // Audit Fields
                // -------------------------------------------------

                entity.Property(x => x.Status)
                    .HasColumnName("status")
                    .HasDefaultValue(1);

                entity.Property(x => x.CreatedAt)
                    .HasColumnName("created_at");

                entity.Property(x => x.CreatedBy)
                    .HasColumnName("created_by");

                entity.Property(x => x.UpdatedAt)
                    .HasColumnName("updated_at");

                entity.Property(x => x.UpdatedBy)
                    .HasColumnName("updated_by");

                entity.Property(x => x.DeletedAt)
                    .HasColumnName("deleted_at");

                entity.Property(x => x.DeletedBy)
                    .HasColumnName("deleted_by");


                // =================================================
                // COURSE → BRANCH
                // =================================================

                entity.HasOne(x => x.Course)
                    .WithMany(x => x.Branches)
                    .HasForeignKey(x => x.CourseId)
                    .OnDelete(DeleteBehavior.Restrict);


                // =================================================
                // DEPARTMENT → BRANCH
                // =================================================

                entity.HasOne(x => x.Department)
                    .WithMany()
                    .HasForeignKey(x => x.DepartmentId)
                    .OnDelete(DeleteBehavior.SetNull);


                // =================================================
                // ACADEMIC YEAR → BRANCH
                // =================================================

                entity.HasOne(x => x.StartingAcademicYear)
                    .WithMany()
                    .HasForeignKey(x => x.StartingAcademicYearId)
                    .OnDelete(DeleteBehavior.SetNull);


                // =================================================
                // INDEXES
                // =================================================

                entity.HasIndex(x => x.CourseId);

                entity.HasIndex(x => x.DepartmentId);

                entity.HasIndex(x => x.StartingAcademicYearId);

                entity.HasIndex(x => x.Status);

                entity.HasIndex(x => x.BranchCode);
            });


            // =====================================================
            // COURSE STRUCTURE
            // =====================================================

            modelBuilder.Entity<CourseStructure>(entity =>
            {
                entity.ToTable("course_structures");


                // -------------------------------------------------
                // Primary Key
                // -------------------------------------------------

                entity.HasKey(x => x.StructureId);

                entity.Property(x => x.StructureId)
                    .HasColumnName("structure_id")
                    .ValueGeneratedOnAdd();


                // -------------------------------------------------
                // Course
                // -------------------------------------------------

                entity.Property(x => x.CourseId)
                    .HasColumnName("course_id")
                    .IsRequired();


                // -------------------------------------------------
                // Branch
                // -------------------------------------------------

                entity.Property(x => x.BranchId)
                    .HasColumnName("branch_id");


                // -------------------------------------------------
                // Year
                // -------------------------------------------------

                entity.Property(x => x.YearNumber)
                    .HasColumnName("year_number")
                    .IsRequired();

                // -------------------------------------------------
                // Status
                // -------------------------------------------------

                entity.Property(x => x.Status)
                    .HasColumnName("status")
                    .HasDefaultValue(1);


                // -------------------------------------------------
                // Audit Fields
                // -------------------------------------------------

                entity.Property(x => x.CreatedAt)
                    .HasColumnName("created_at");

                entity.Property(x => x.CreatedBy)
                    .HasColumnName("created_by");

                entity.Property(x => x.UpdatedAt)
                    .HasColumnName("updated_at");

                entity.Property(x => x.UpdatedBy)
                    .HasColumnName("updated_by");

                entity.Property(x => x.DeletedAt)
                    .HasColumnName("deleted_at");

                entity.Property(x => x.DeletedBy)
                    .HasColumnName("deleted_by");


                // =================================================
                // COURSE → COURSE STRUCTURE
                // =================================================

                entity.HasOne(x => x.Course)
                    .WithMany()
                    .HasForeignKey(x => x.CourseId)
                    .OnDelete(DeleteBehavior.Restrict);


                // =================================================
                // BRANCH → COURSE STRUCTURE
                // =================================================

                entity.HasOne(x => x.Branch)
                    .WithMany()
                    .HasForeignKey(x => x.BranchId)
                    .OnDelete(DeleteBehavior.Restrict);


                // =================================================
                // INDEXES
                // =================================================

                entity.HasIndex(x => x.CourseId);

                entity.HasIndex(x => x.BranchId);

                entity.HasIndex(x => x.Status);

                entity.HasIndex(
                    x => new
                    {
                        x.CourseId,
                        x.BranchId,
                        x.YearNumber,
                        x.SemesterNumber
                    });
            });

            // =====================================================
            // SEMESTERS
            // =====================================================

            modelBuilder.Entity<Semester>(semesterEntity =>
            {
                semesterEntity.ToTable("semesters");
                semesterEntity.HasKey(x => x.SemesterId);

                semesterEntity.Property(x => x.SemesterId)
                    .HasColumnName("semester_id")
                    .ValueGeneratedOnAdd();

                semesterEntity.Property(x => x.CourseId)
                    .HasColumnName("course_id")
                    .IsRequired();

                semesterEntity.Property(x => x.BranchId)
                    .HasColumnName("branch_id")
                    .IsRequired();

                semesterEntity.Property(x => x.AcademicYearId)
                    .HasColumnName("academic_year_id")
                    .IsRequired();

                semesterEntity.Property(x => x.SemesterNumber)
                    .HasColumnName("semester_number")
                    .IsRequired();

                semesterEntity.Property(x => x.YearNumber)
                    .HasColumnName("year_number")
                    .IsRequired();

                semesterEntity.Property(x => x.SemesterName)
                    .HasColumnName("semester_name")
                    .HasMaxLength(100)
                    .IsRequired();

                semesterEntity.Property(x => x.StartDate)
                    .HasColumnName("start_date");

                semesterEntity.Property(x => x.EndDate)
                    .HasColumnName("end_date");

                semesterEntity.Property(x => x.Status)
                    .HasColumnName("status")
                    .HasDefaultValue((byte)1);

                semesterEntity.Property(x => x.IsArchived)
                    .HasColumnName("is_archived")
                    .HasDefaultValue((byte)0);

                semesterEntity.Property(x => x.CreatedAt)
                    .HasColumnName("created_at");

                semesterEntity.Property(x => x.CreatedBy)
                    .HasColumnName("created_by");

                semesterEntity.Property(x => x.UpdatedAt)
                    .HasColumnName("updated_at");

                semesterEntity.Property(x => x.UpdatedBy)
                    .HasColumnName("updated_by");

                semesterEntity.HasOne(x => x.Course)
                    .WithMany()
                    .HasForeignKey(x => x.CourseId)
                    .OnDelete(DeleteBehavior.Restrict);

                semesterEntity.HasOne(x => x.Branch)
                    .WithMany()
                    .HasForeignKey(x => x.BranchId)
                    .OnDelete(DeleteBehavior.Restrict);

                semesterEntity.HasOne(x => x.AcademicYear)
                    .WithMany()
                    .HasForeignKey(x => x.AcademicYearId)
                    .OnDelete(DeleteBehavior.Restrict);

                semesterEntity.HasIndex(x => x.CourseId);
                semesterEntity.HasIndex(x => x.BranchId);
                semesterEntity.HasIndex(x => x.AcademicYearId);
                semesterEntity.HasIndex(x => new
                {
                    x.CourseId,
                    x.BranchId,
                    x.AcademicYearId,
                    x.SemesterNumber
                });
            });


            // =====================================================
            // STUDENT ADMISSION
            // Preserves Phase 01 admission-status APIs and the
            // richer admission lifecycle fields.
            // =====================================================

            modelBuilder.Entity<StudentAdmission>(entity =>
            {
                entity.ToTable("studentadmissions");
                entity.HasKey(x => x.AdmissionId);

                entity.Property(x => x.AdmissionId)
                    .HasColumnName("AdmissionId")
                    .ValueGeneratedOnAdd();

                entity.Property(x => x.RegistrationNo).HasColumnName("RegistrationNo").HasMaxLength(50);
                entity.Property(x => x.ApplicationNo).HasColumnName("ApplicationNo").HasMaxLength(50);
                entity.Property(x => x.AdmissionNo).HasColumnName("AdmissionNo").HasMaxLength(50);
                entity.Property(x => x.FirstName).HasColumnName("FirstName").HasMaxLength(100).IsRequired();
                entity.Property(x => x.LastName).HasColumnName("LastName").HasMaxLength(100);
                entity.Property(x => x.Gender).HasColumnName("Gender").HasMaxLength(20).IsRequired();
                entity.Property(x => x.DateOfBirth).HasColumnName("DateOfBirth").IsRequired();

                entity.Property(x => x.AdmissionStatus).HasColumnName("AdmissionStatus").HasMaxLength(50).IsRequired();

                

                // Phase 01 status-history relationship.
                entity.HasMany(x => x.StatusHistory)
                    .WithOne()
                    .HasForeignKey(x => x.AdmissionId)
                    .HasPrincipalKey(x => x.AdmissionId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // =====================================================
            // STUDENT PARENT
            // =====================================================

            modelBuilder.Entity<StudentParent>(entity =>
            {
                entity.ToTable("student_parents");
                entity.HasKey(x => x.ParentId);

                entity.Property(x => x.ParentId).HasColumnName("parent_id").ValueGeneratedOnAdd();
                entity.Property(x => x.StudentId).HasColumnName("student_id").IsRequired();

                entity.Property(x => x.FatherName).HasColumnName("father_name").HasMaxLength(150);
                entity.Property(x => x.FatherMobile).HasColumnName("father_mobile").HasMaxLength(20);
                entity.Property(x => x.FatherEmail).HasColumnName("father_email").HasMaxLength(150);
                entity.Property(x => x.FatherOccupation).HasColumnName("father_occupation").HasMaxLength(150);

                entity.Property(x => x.MotherName).HasColumnName("mother_name").HasMaxLength(150);
                entity.Property(x => x.MotherMobile).HasColumnName("mother_mobile").HasMaxLength(20);
                entity.Property(x => x.MotherEmail).HasColumnName("mother_email").HasMaxLength(150);
                entity.Property(x => x.MotherOccupation).HasColumnName("mother_occupation").HasMaxLength(150);

                entity.Property(x => x.CreatedAt).HasColumnName("created_at");
                entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

                entity.HasIndex(x => x.StudentId).IsUnique();
            });

            // =====================================================
            // ADMISSION STATUS HISTORY
            // =====================================================

            modelBuilder.Entity<AdmissionStatusHistory>(entity =>
            {
                entity.ToTable("admission_status_history");
                entity.HasKey(x => x.AdmissionStatusHistoryId);

                entity.Property(x => x.AdmissionStatusHistoryId)
                    .HasColumnName("AdmissionStatusHistoryId")
                    .ValueGeneratedOnAdd();

                entity.Property(x => x.AdmissionId).HasColumnName("AdmissionId").IsRequired();
                entity.Property(x => x.PreviousStatus).HasColumnName("PreviousStatus").HasMaxLength(50);
                entity.Property(x => x.NewStatus).HasColumnName("NewStatus").HasMaxLength(50).IsRequired();
                entity.Property(x => x.ActionType).HasColumnName("ActionType").HasMaxLength(50).IsRequired();
                entity.Property(x => x.Remarks).HasColumnName("Remarks");
                entity.Property(x => x.RejectionReason).HasColumnName("RejectionReason").HasMaxLength(500);
                entity.Property(x => x.ChangedBy).HasColumnName("ChangedBy");
                entity.Property(x => x.ChangedAt).HasColumnName("ChangedAt").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(x => x.IsApproved).HasColumnName("IsApproved").HasDefaultValue(false);
                entity.Property(x => x.IsRejected).HasColumnName("IsRejected").HasDefaultValue(false);
                entity.Property(x => x.IsActive).HasColumnName("IsActive").HasDefaultValue(true);
                entity.Property(x => x.IsDeleted).HasColumnName("IsDeleted").HasDefaultValue(false);
                entity.Property(x => x.CreatedBy).HasColumnName("CreatedBy");
                entity.Property(x => x.CreatedAt).HasColumnName("CreatedAt").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(x => x.UpdatedBy).HasColumnName("UpdatedBy");
                entity.Property(x => x.UpdatedAt).HasColumnName("UpdatedAt").HasDefaultValueSql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
                entity.Property(x => x.DeletedBy).HasColumnName("DeletedBy");
                entity.Property(x => x.DeletedAt).HasColumnName("DeletedAt");

                entity.HasOne<StudentAdmission>()
                    .WithMany(x => x.StatusHistory)
                    .HasForeignKey(x => x.AdmissionId)
                    .HasPrincipalKey(x => x.AdmissionId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(x => x.ChangedBy)
                    .HasPrincipalKey(x => x.user_id)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // =====================================================
            // TIMETABLE
            // =====================================================

            modelBuilder.Entity<Timetable>(entity =>
            {
                entity.ToTable("timetables");

                entity.HasKey(x => x.TimetableId);

                entity.Property(x => x.TimetableId)
                    .HasColumnName("timetable_id")
                    .ValueGeneratedOnAdd();

                entity.Property(x => x.AcademicYearId)
                    .HasColumnName("academic_year_id")
                    .IsRequired();

                entity.Property(x => x.SemesterId)
                    .HasColumnName("semester_id")
                    .IsRequired();

                entity.Property(x => x.SectionId)
                    .HasColumnName("section_id")
                    .IsRequired();

                entity.Property(x => x.TimetableName)
                    .HasColumnName("timetable_name")
                    .HasMaxLength(150)
                    .IsRequired();

                entity.Property(x => x.Status)
                    .HasColumnName("status")
                    .HasMaxLength(30)
                    .HasDefaultValue("DRAFT")
                    .IsRequired();

                entity.Property(x => x.EffectiveFrom)
                    .HasColumnName("effective_from");

                entity.Property(x => x.EffectiveTo)
                    .HasColumnName("effective_to");

                entity.Property(x => x.PublishedAt)
                    .HasColumnName("published_at");

                entity.Property(x => x.PublishedBy)
                    .HasColumnName("published_by");

                entity.Property(x => x.CreatedAt)
                    .HasColumnName("created_at");

                entity.Property(x => x.CreatedBy)
                    .HasColumnName("created_by");

                entity.Property(x => x.UpdatedAt)
                    .HasColumnName("updated_at");

                entity.Property(x => x.UpdatedBy)
                    .HasColumnName("updated_by");
            });


            // =====================================================
            // TIMETABLE SLOT
            // =====================================================

            modelBuilder.Entity<TimetableSlot>(entity =>
            {
                entity.ToTable("timetable_slots");

                entity.HasKey(x => x.TimetableSlotId);

                entity.Property(x => x.TimetableSlotId)
                    .HasColumnName("timetable_slot_id")
                    .ValueGeneratedOnAdd();

                entity.Property(x => x.TimetableId)
                    .HasColumnName("timetable_id")
                    .IsRequired();

                entity.Property(x => x.SlotNumber)
                    .HasColumnName("slot_number")
                    .IsRequired();

                entity.Property(x => x.SlotName)
                    .HasColumnName("slot_name")
                    .HasMaxLength(100)
                    .IsRequired();

                entity.Property(x => x.StartTime)
                    .HasColumnName("start_time")
                    .IsRequired();

                entity.Property(x => x.EndTime)
                    .HasColumnName("end_time")
                    .IsRequired();

                entity.Property(x => x.Status)
                    .HasColumnName("status")
                    .HasDefaultValue((byte)1);

                entity.Property(x => x.CreatedAt)
                    .HasColumnName("created_at");

                entity.Property(x => x.CreatedBy)
                    .HasColumnName("created_by");

                entity.Property(x => x.UpdatedAt)
                    .HasColumnName("updated_at");

                entity.Property(x => x.UpdatedBy)
                    .HasColumnName("updated_by");
            });


            // =====================================================
            // TIMETABLE ENTRY
            // =====================================================

            modelBuilder.Entity<TimetableEntry>(entity =>
            {
                entity.ToTable("timetable_entries");

                entity.HasKey(x => x.TimetableEntryId);

                entity.Property(x => x.TimetableEntryId)
                    .HasColumnName("timetable_entry_id")
                    .ValueGeneratedOnAdd();

                entity.Property(x => x.TimetableId)
                    .HasColumnName("timetable_id")
                    .IsRequired();

                entity.Property(x => x.TimetableSlotId)
                    .HasColumnName("timetable_slot_id")
                    .IsRequired();

                entity.Property(x => x.FacultyId)
                    .HasColumnName("faculty_id")
                    .IsRequired();

                entity.Property(x => x.SubjectId)
                    .HasColumnName("subject_id")
                    .IsRequired();

                entity.Property(x => x.SectionId)
                    .HasColumnName("section_id")
                    .IsRequired();

                entity.Property(x => x.DayOfWeek)
                    .HasColumnName("day_of_week")
                    .HasMaxLength(20)
                    .IsRequired();

                entity.Property(x => x.Classroom)
                    .HasColumnName("classroom")
                    .HasMaxLength(100);

                entity.Property(x => x.EntryType)
                    .HasColumnName("entry_type")
                    .HasMaxLength(30)
                    .HasDefaultValue("LECTURE")
                    .IsRequired();

                entity.Property(x => x.Status)
                    .HasColumnName("status")
                    .HasDefaultValue((byte)1);

                entity.Property(x => x.CreatedAt)
                    .HasColumnName("created_at");

                entity.Property(x => x.CreatedBy)
                    .HasColumnName("created_by");

                entity.Property(x => x.UpdatedAt)
                    .HasColumnName("updated_at");

                entity.Property(x => x.UpdatedBy)
                    .HasColumnName("updated_by");
            });

        }
    }
}
