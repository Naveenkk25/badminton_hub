using System;
using BadmintonHub.Domain.Common;

namespace BadmintonHub.Domain.Entities;

public class ActivityLog : BaseAuditableEntity
{
    public Guid UserId { get; set; }
    public ApplicationUser? User { get; set; }

    public Guid? EventId { get; set; }
    public Event? Event { get; set; }

    public string Action { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.Now;
    
    public string IpAddress { get; set; } = string.Empty;
    public string DeviceInformation { get; set; } = string.Empty;
}
