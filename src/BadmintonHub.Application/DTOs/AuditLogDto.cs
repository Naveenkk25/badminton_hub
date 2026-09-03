using System;

namespace BadmintonHub.Application.DTOs;

public class AuditLogDto
{
    public Guid Id { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public Guid? UserId { get; set; }
    public string? UserFullName { get; set; }
    public DateTime Timestamp { get; set; }
    public string IpAddress { get; set; } = string.Empty;
}
