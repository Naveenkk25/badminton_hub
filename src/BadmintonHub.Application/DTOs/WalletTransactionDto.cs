using System;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.Application.DTOs;

public class WalletTransactionDto
{
    public Guid Id { get; set; }
    public Guid PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public WalletTransactionType Type { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
}
