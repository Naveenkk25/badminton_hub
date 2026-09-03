using System;
using BadmintonHub.Domain.Common;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.Domain.Entities;

public class WalletTransaction : BaseAuditableEntity
{
    public Guid PlayerId { get; set; }
    public ApplicationUser? Player { get; set; }

    public decimal Amount { get; set; }
    public WalletTransactionType Type { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.Now;
}
