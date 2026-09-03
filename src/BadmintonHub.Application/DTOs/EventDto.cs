using System;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.Application.DTOs;

public class EventDto
{
    public Guid Id { get; set; }
    public Guid OrganizerId { get; set; }
    public string OrganizerName { get; set; } = string.Empty;
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
    public int RegisteredPlayersCount { get; set; }
    public int WaitlistedPlayersCount { get; set; }
    public int AvailableSpots => Math.Max(0, MaxPlayers - RegisteredPlayersCount);
    public bool IsSettled { get; set; }
}
