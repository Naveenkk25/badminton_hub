using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using BadmintonHub.Domain.Entities;

namespace BadmintonHub.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<ApplicationUser> Users { get; }
    DbSet<Organizer> Organizers { get; }
    DbSet<Event> Events { get; }
    DbSet<Registration> Registrations { get; }
    DbSet<Waitlist> Waitlists { get; }
    DbSet<WalletTransaction> WalletTransactions { get; }
    DbSet<ActivityLog> ActivityLogs { get; }
    DbSet<AuditLog> AuditLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
    Microsoft.EntityFrameworkCore.Infrastructure.DatabaseFacade Database { get; }
}
