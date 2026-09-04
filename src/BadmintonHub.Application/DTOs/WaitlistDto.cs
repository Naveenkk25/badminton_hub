using System;

namespace BadmintonHub.Application.DTOs;

public class WaitlistDto
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string EventName { get; set; } = string.Empty;
    public Guid PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public string PlayerMobile { get; set; } = string.Empty;
    public string PlayerCategory { get; set; } = string.Empty;
    public string? GuestName { get; set; }
    public int Position { get; set; }
    public DateTime JoinedDate { get; set; }
    public bool IsPromoted { get; set; }
    public bool IsCancelled { get; set; }
}
