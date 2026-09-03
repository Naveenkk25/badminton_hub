using System;
using BadmintonHub.Domain.Common;

namespace BadmintonHub.Domain.Entities;

public class Registration : BaseAuditableEntity
{
    public Guid EventId { get; set; }
    public Event? Event { get; set; }

    public Guid PlayerId { get; set; }
    public ApplicationUser? Player { get; set; }

    public string? GuestName { get; set; } // Identifies if this row is a virtual guest participant

    public DateTime RegistrationDate { get; set; } = DateTime.Now;
    public decimal ReservedFee { get; set; }
    
    public decimal? ActualFee { get; set; }
    public decimal? RefundAmount { get; set; }
    
    // Status can track if it is registered or cancelled
    public bool IsCancelled { get; set; }
    public DateTime? CancelledDate { get; set; }
}
