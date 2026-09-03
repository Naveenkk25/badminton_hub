using System;
using BadmintonHub.Domain.Common;

namespace BadmintonHub.Domain.Entities;

public class AuditLog : BaseAuditableEntity
{
    public string EntityName { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    
    // JSON strings representing states
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    
    public Guid? UserId { get; set; }
    public ApplicationUser? User { get; set; }
    
    public DateTime Timestamp { get; set; } = DateTime.Now;
    public string IpAddress { get; set; } = string.Empty;
}
