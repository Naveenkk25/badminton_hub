using System;

namespace BadmintonHub.Application.DTOs;

public class ActivityLogDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserFullName { get; set; } = string.Empty;
    public string UserRole { get; set; } = string.Empty;
    public Guid? EventId { get; set; }
    public string? EventName { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public string DeviceInformation { get; set; } = string.Empty;
}
