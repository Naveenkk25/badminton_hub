using System;

namespace BadmintonHub.Application.DTOs;

public class RegistrationDto
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string EventName { get; set; } = string.Empty;
    public Guid PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public string PlayerMobile { get; set; } = string.Empty;
    public string PlayerCategory { get; set; } = string.Empty;
    public DateTime RegistrationDate { get; set; }
    public string? GuestName { get; set; }
    public decimal ReservedFee { get; set; }
    public decimal? ActualFee { get; set; }
    public decimal? RefundAmount { get; set; }
    public bool IsCancelled { get; set; }
}
