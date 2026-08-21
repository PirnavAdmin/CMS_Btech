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

        public DbSet<UserRole> UserRoles => Set<UserRole>();

        public DbSet<LoginAudit> LoginAudits => Set<LoginAudit>();

        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

        protected override void OnModelCreating(
            ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

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
        }
    }
}