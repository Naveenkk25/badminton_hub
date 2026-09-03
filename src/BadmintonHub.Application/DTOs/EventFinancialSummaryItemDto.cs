using System;

namespace BadmintonHub.Application.DTOs;

public class EventFinancialSummaryItemDto
{
    public string EventName { get; set; } = string.Empty;
    public DateTime EventDate { get; set; }
    public int TotalRegistrations { get; set; }
    public decimal TotalAmountCollected { get; set; }
    public decimal TotalRefunds { get; set; }
    public decimal NetAmount { get; set; }
}
