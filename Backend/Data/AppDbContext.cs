using Microsoft.EntityFrameworkCore;
using BTech.Models;

namespace UserRoleManagement.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        // ============================================
        // USER / ROLE TABLES
        // ============================================

        public DbSet<User> Users => Set<User>();

        public DbSet<Role> Roles => Set<Role>();

        public DbSet<UserRoleMapping> UserRoleMappings
            => Set<UserRoleMapping>();

        public DbSet<College> Colleges => Set<College>();


        // ============================================
        // ADMISSION TABLES
        // ============================================

        public DbSet<Admission> Admissions => Set<Admission>();

        public DbSet<AdmissionStatusHistory> AdmissionStatusHistories
            => Set<AdmissionStatusHistory>();


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);


            // ============================================
            // USER
            // ============================================

            modelBuilder.Entity<User>()
                .ToTable("users");

            modelBuilder.Entity<User>()
                .HasKey(x => x.user_id);

            modelBuilder.Entity<User>()
                .Property(x => x.user_id)
                .HasColumnName("user_id");

            modelBuilder.Entity<User>()
                .Property(x => x.college_id)
                .HasColumnName("college_id");

            modelBuilder.Entity<User>()
                .Property(x => x.EmployeeUserId)
                .HasColumnName("employee_user_id");

            modelBuilder.Entity<User>()
                .Property(x => x.FullName)
                .HasColumnName("full_name");

            modelBuilder.Entity<User>()
                .Property(x => x.Email)
                .HasColumnName("email");

            modelBuilder.Entity<User>()
                .Property(x => x.Mobile)
                .HasColumnName("mobile");

            modelBuilder.Entity<User>()
                .Property(x => x.PasswordHash)
                .HasColumnName("password_hash");

            modelBuilder.Entity<User>()
                .Property(x => x.Status)
                .HasColumnName("status");

            modelBuilder.Entity<User>()
                .Property(x => x.LastLoginAt)
                .HasColumnName("last_login_at");

            modelBuilder.Entity<User>()
                .Property(x => x.CreatedAt)
                .HasColumnName("created_at");

            modelBuilder.Entity<User>()
                .Property(x => x.CreatedBy)
                .HasColumnName("created_by");

            modelBuilder.Entity<User>()
                .Property(x => x.UpdatedAt)
                .HasColumnName("updated_at");

            modelBuilder.Entity<User>()
                .Property(x => x.UpdatedBy)
                .HasColumnName("updated_by");

            modelBuilder.Entity<User>()
                .Property(x => x.DeletedAt)
                .HasColumnName("deleted_at");

            modelBuilder.Entity<User>()
                .Property(x => x.DeletedBy)
                .HasColumnName("deleted_by");


            // ============================================
            // ROLE
            // ============================================

            modelBuilder.Entity<Role>()
                .ToTable("roles");

            modelBuilder.Entity<Role>()
                .HasKey(x => x.Role_id);

            modelBuilder.Entity<Role>()
                .Property(x => x.Role_id)
                .HasColumnName("role_id");

            modelBuilder.Entity<Role>()
                .Property(x => x.RoleName)
                .HasColumnName("role_name");

            modelBuilder.Entity<Role>()
                .Property(x => x.RoleCode)
                .HasColumnName("role_code");

            modelBuilder.Entity<Role>()
                .Property(x => x.Description)
                .HasColumnName("description");

            modelBuilder.Entity<Role>()
                .Property(x => x.Status)
                .HasColumnName("status");

            modelBuilder.Entity<Role>()
                .Property(x => x.CreatedAt)
                .HasColumnName("created_at");

            modelBuilder.Entity<Role>()
                .Property(x => x.CreatedBy)
                .HasColumnName("created_by");

            modelBuilder.Entity<Role>()
                .Property(x => x.UpdatedAt)
                .HasColumnName("updated_at");

            modelBuilder.Entity<Role>()
                .Property(x => x.UpdatedBy)
                .HasColumnName("updated_by");

            modelBuilder.Entity<Role>()
                .Property(x => x.DeletedAt)
                .HasColumnName("deleted_at");

            modelBuilder.Entity<Role>()
                .Property(x => x.DeletedBy)
                .HasColumnName("deleted_by");


            // ============================================
            // USER ROLE MAPPING
            // ============================================

            modelBuilder.Entity<UserRoleMapping>()
                .ToTable("user_roles");

            modelBuilder.Entity<UserRoleMapping>()
                .HasKey(x => x.UserRoleId);

            modelBuilder.Entity<UserRoleMapping>()
                .Property(x => x.UserRoleId)
                .HasColumnName("user_role_id")
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<UserRoleMapping>()
                .Property(x => x.UserId)
                .HasColumnName("user_id");

            modelBuilder.Entity<UserRoleMapping>()
                .Property(x => x.RoleId)
                .HasColumnName("role_id");

            modelBuilder.Entity<UserRoleMapping>()
                .Property(x => x.Status)
                .HasColumnName("status");

            modelBuilder.Entity<UserRoleMapping>()
                .Property(x => x.AssignedAt)
                .HasColumnName("assigned_at");

            modelBuilder.Entity<UserRoleMapping>()
                .Property(x => x.AssignedBy)
                .HasColumnName("assigned_by");

            modelBuilder.Entity<UserRoleMapping>()
                .Property(x => x.UpdatedAt)
                .HasColumnName("updated_at");

            modelBuilder.Entity<UserRoleMapping>()
                .Property(x => x.UpdatedBy)
                .HasColumnName("updated_by");

            modelBuilder.Entity<UserRoleMapping>()
                .Property(x => x.RemovedAt)
                .HasColumnName("removed_at");

            modelBuilder.Entity<UserRoleMapping>()
                .Property(x => x.RemovedBy)
                .HasColumnName("removed_by");


            // ============================================
            // COLLEGE
            // ============================================

            modelBuilder.Entity<College>()
                .ToTable("colleges");

            modelBuilder.Entity<College>()
                .HasKey(x => x.CollegeId);


            // ============================================
            // ADMISSION
            // ============================================

            modelBuilder.Entity<Admission>()
                .ToTable("studentadmissions");

            modelBuilder.Entity<Admission>()
                .HasKey(x => x.AdmissionId);


            // ============================================
            // ADMISSION STATUS HISTORY
            // ============================================

            modelBuilder.Entity<AdmissionStatusHistory>()
                .ToTable("admission_status_history");

            modelBuilder.Entity<AdmissionStatusHistory>()
                .HasKey(x => x.AdmissionStatusHistoryId);

            modelBuilder.Entity<AdmissionStatusHistory>()
                .Property(x => x.ChangedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            modelBuilder.Entity<AdmissionStatusHistory>()
                .Property(x => x.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            modelBuilder.Entity<AdmissionStatusHistory>()
                .Property(x => x.UpdatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .ValueGeneratedOnAddOrUpdate();


            // ============================================
            // ADMISSION → STATUS HISTORY
            // ============================================

            modelBuilder.Entity<AdmissionStatusHistory>()
                .HasOne<Admission>()
                .WithMany(a => a.StatusHistory)
                .HasForeignKey(h => h.AdmissionId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
