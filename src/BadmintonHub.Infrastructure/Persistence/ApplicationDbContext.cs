using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Domain.Common;
using BadmintonHub.Domain.Entities;

namespace BadmintonHub.Infrastructure.Persistence;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>, IApplicationDbContext
{
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTime _dateTime;

    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options,
        ICurrentUserService currentUserService,
        IDateTime dateTime) : base(options)
    {
        _currentUserService = currentUserService;
        _dateTime = dateTime;
    }

    public DbSet<Organizer> Organizers => Set<Organizer>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<Registration> Registrations => Set<Registration>();
    public DbSet<Waitlist> Waitlists => Set<Waitlist>();
    public DbSet<WalletTransaction> WalletTransactions => Set<WalletTransaction>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Apply soft delete query filters automatically for all auditable entities
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            if (typeof(BaseAuditableEntity).IsAssignableFrom(entityType.ClrType))
            {
                var parameter = System.Linq.Expressions.Expression.Parameter(entityType.ClrType, "e");
                var propertyMethodInfo = typeof(EF).GetMethod("Property")?.MakeGenericMethod(typeof(bool));
                if (propertyMethodInfo != null)
                {
                    var isDeletedProperty = System.Linq.Expressions.Expression.Call(propertyMethodInfo, parameter, System.Linq.Expressions.Expression.Constant("IsDeleted"));
                    var compareExpression = System.Linq.Expressions.Expression.MakeBinary(System.Linq.Expressions.ExpressionType.Equal, isDeletedProperty, System.Linq.Expressions.Expression.Constant(false));
                    var lambda = System.Linq.Expressions.Expression.Lambda(compareExpression, parameter);
                    builder.Entity(entityType.ClrType).HasQueryFilter(lambda);
                }
            }
        }

        // Apply soft delete query filter for ApplicationUser (which doesn't inherit BaseAuditableEntity directly but has IsDeleted)
        builder.Entity<ApplicationUser>().HasQueryFilter(u => !u.IsDeleted);

        // Event concurrency token
        builder.Entity<Event>()
            .Property(e => e.ConcurrencyToken)
            .IsConcurrencyToken();

        // Specific configuration for decimals to prevent truncation warnings
        builder.Entity<Event>()
            .Property(e => e.ReservedFee)
            .HasPrecision(18, 2);

        builder.Entity<Registration>()
            .Property(r => r.ReservedFee)
            .HasPrecision(18, 2);

        builder.Entity<WalletTransaction>()
            .Property(w => w.Amount)
            .HasPrecision(18, 2);

        // Relationships
        builder.Entity<Event>()
            .HasMany(e => e.Registrations)
            .WithOne(r => r.Event)
            .HasForeignKey(r => r.EventId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Event>()
            .HasMany(e => e.WaitlistEntries)
            .WithOne(w => w.Event)
            .HasForeignKey(w => w.EventId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<WalletTransaction>()
            .HasOne(w => w.Player)
            .WithMany()
            .HasForeignKey(w => w.PlayerId)
            .OnDelete(DeleteBehavior.Restrict);

        // Unique indexes
        if (Database.IsNpgsql())
        {
            builder.Entity<Registration>()
                .HasIndex(r => new { r.EventId, r.PlayerId })
                .IsUnique()
                .HasFilter("\"IsCancelled\" = false AND \"IsDeleted\" = false");

            builder.Entity<Waitlist>()
                .HasIndex(w => new { w.EventId, w.PlayerId })
                .IsUnique()
                .HasFilter("\"IsCancelled\" = false AND \"IsPromoted\" = false AND \"IsDeleted\" = false");
        }
        else
        {
            builder.Entity<Registration>()
                .HasIndex(r => new { r.EventId, r.PlayerId })
                .IsUnique()
                .HasFilter("IsCancelled = 0 AND IsDeleted = 0");

            builder.Entity<Waitlist>()
                .HasIndex(w => new { w.EventId, w.PlayerId })
                .IsUnique()
                .HasFilter("IsCancelled = 0 AND IsPromoted = 0 AND IsDeleted = 0");
        }

        // Organizer FK
        builder.Entity<Organizer>()
            .HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(o => o.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var currentUserId = _currentUserService.UserId ?? "System";
        var currentIpAddress = _currentUserService.IpAddress ?? string.Empty;
        var now = _dateTime.Now;

        var auditEntries = OnBeforeSaveChanges(currentUserId, currentIpAddress);

        foreach (var entry in ChangeTracker.Entries<BaseAuditableEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedBy = currentUserId;
                    entry.Entity.CreatedDate = now;
                    break;

                case EntityState.Modified:
                    entry.Entity.ModifiedBy = currentUserId;
                    entry.Entity.ModifiedDate = now;
                    break;

                case EntityState.Deleted:
                    // Intercept delete and mark soft deleted
                    entry.State = EntityState.Modified;
                    entry.Entity.IsDeleted = true;
                    entry.Entity.DeletedBy = currentUserId;
                    entry.Entity.DeletedDate = now;
                    break;
            }
        }

        // Handle Identity User soft delete and audit changes
        foreach (var entry in ChangeTracker.Entries<ApplicationUser>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedBy = currentUserId;
                    entry.Entity.CreatedDate = now;
                    break;

                case EntityState.Modified:
                    entry.Entity.ModifiedBy = currentUserId;
                    entry.Entity.ModifiedDate = now;
                    break;

                case EntityState.Deleted:
                    entry.State = EntityState.Modified;
                    entry.Entity.IsDeleted = true;
                    entry.Entity.DeletedBy = currentUserId;
                    entry.Entity.DeletedDate = now;
                    break;
            }
        }

        var result = await base.SaveChangesAsync(cancellationToken);
        await OnAfterSaveChangesAsync(auditEntries, cancellationToken);
        return result;
    }

    private List<AuditEntry> OnBeforeSaveChanges(string userId, string ipAddress)
    {
        ChangeTracker.DetectChanges();
        var auditEntries = new List<AuditEntry>();

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.Entity is AuditLog || entry.State == EntityState.Detached || entry.State == EntityState.Unchanged)
                continue;

            // Don't audit log logs themselves
            if (entry.Entity is ActivityLog)
                continue;

            var auditEntry = new AuditEntry(entry)
            {
                TableName = entry.Entity.GetType().Name,
                UserId = Guid.TryParse(userId, out var userGuid) ? userGuid : null,
                IpAddress = ipAddress,
                Timestamp = _dateTime.Now
            };

            auditEntries.Add(auditEntry);

            foreach (var property in entry.Properties)
            {
                string propertyName = property.Metadata.Name;

                if (property.Metadata.IsPrimaryKey())
                {
                    auditEntry.KeyValues[propertyName] = property.CurrentValue;
                    continue;
                }

                switch (entry.State)
                {
                    case EntityState.Added:
                        auditEntry.AuditType = "Insert";
                        auditEntry.NewValues[propertyName] = property.CurrentValue;
                        break;

                    case EntityState.Deleted:
                        auditEntry.AuditType = "Delete";
                        auditEntry.OldValues[propertyName] = property.OriginalValue;
                        break;

                    case EntityState.Modified:
                        if (property.IsModified)
                        {
                            auditEntry.AuditType = "Update";
                            auditEntry.OldValues[propertyName] = property.OriginalValue;
                            auditEntry.NewValues[propertyName] = property.CurrentValue;
                        }
                        break;
                }
            }
        }

        foreach (var auditEntry in auditEntries.Where(_ => !_.HasTemporaryProperties))
        {
            AuditLogs.Add(auditEntry.ToAuditLog());
        }

        return auditEntries.Where(_ => _.HasTemporaryProperties).ToList();
    }

    private Task OnAfterSaveChangesAsync(List<AuditEntry> auditEntries, CancellationToken cancellationToken)
    {
        if (auditEntries == null || auditEntries.Count == 0)
            return Task.CompletedTask;

        foreach (var auditEntry in auditEntries)
        {
            foreach (var prop in auditEntry.TemporaryProperties)
            {
                if (prop.Metadata.IsPrimaryKey())
                {
                    auditEntry.KeyValues[prop.Metadata.Name] = prop.CurrentValue;
                }
                else
                {
                    auditEntry.NewValues[prop.Metadata.Name] = prop.CurrentValue;
                }
            }

            AuditLogs.Add(auditEntry.ToAuditLog());
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}

// Class helper for audit logs formatting
internal class AuditEntry
{
    public AuditEntry(EntityEntry entry)
    {
        Entry = entry;
    }

    public EntityEntry Entry { get; }
    public Guid? UserId { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string AuditType { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public Dictionary<string, object?> KeyValues { get; } = new();
    public Dictionary<string, object?> OldValues { get; } = new();
    public Dictionary<string, object?> NewValues { get; } = new();
    public List<PropertyEntry> TemporaryProperties { get; } = new();

    public bool HasTemporaryProperties => TemporaryProperties.Any();

    public AuditLog ToAuditLog()
    {
        var options = new System.Text.Json.JsonSerializerOptions
        {
            ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles
        };

        var audit = new AuditLog
        {
            Id = Guid.NewGuid(),
            EntityName = TableName,
            EntityId = System.Text.Json.JsonSerializer.Serialize(KeyValues, options),
            Action = AuditType,
            OldValues = OldValues.Count == 0 ? null : System.Text.Json.JsonSerializer.Serialize(OldValues, options),
            NewValues = NewValues.Count == 0 ? null : System.Text.Json.JsonSerializer.Serialize(NewValues, options),
            UserId = UserId,
            Timestamp = Timestamp,
            IpAddress = IpAddress,
            CreatedDate = Timestamp,
            CreatedBy = UserId?.ToString() ?? "System"
        };
        return audit;
    }
}
