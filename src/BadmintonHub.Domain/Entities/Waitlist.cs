using System;
using BadmintonHub.Domain.Common;

namespace BadmintonHub.Domain.Entities;

public class Waitlist : BaseAuditableEntity
{
    public Guid EventId { get; set; }
    public Event? Event { get; set; }

    public Guid PlayerId { get; set; }
    public ApplicationUser? Player { get; set; }

    public string? GuestName { get; set; } // Identifies if this row is a virtual guest participant

    public int Position { get; set; }
    public DateTime JoinedDate { get; set; } = DateTime.Now;
    
    public bool IsPromoted { get; set; }
    public DateTime? PromotedDate { get; set; }
    
    public bool IsCancelled { get; set; }
    public DateTime? CancelledDate { get; set; }
}
