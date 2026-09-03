using System;
using System.Collections.Generic;
using BadmintonHub.Domain.Common;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.Domain.Entities;

public class Event : BaseAuditableEntity
{
    public Guid OrganizerId { get; set; }
    public Organizer? Organizer { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Venue { get; set; } = string.Empty;
    
    public DateTime EventDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    
    public decimal ReservedFee { get; set; }
    public PlayerCategory Category { get; set; }
    public int MaxPlayers { get; set; }
    public DateTime CutoffDateTime { get; set; }
    public EventStatus Status { get; set; }
    
    public bool IsSettled { get; set; }

    // Concurrency Token for optimistic concurrency protection
    public Guid ConcurrencyToken { get; set; } = Guid.NewGuid();

    // Derived counts for optimization (stored in database, updated transactionally)
    public int RegisteredPlayersCount { get; set; }
    public int WaitlistedPlayersCount { get; set; }

    public ICollection<Registration> Registrations { get; set; } = new List<Registration>();
    public ICollection<Waitlist> WaitlistEntries { get; set; } = new List<Waitlist>();
}
