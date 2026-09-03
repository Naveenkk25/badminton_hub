using System;

namespace BadmintonHub.Domain.Common;

public abstract class BaseAuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedDate { get; set; } = DateTime.Now;
    public string CreatedBy { get; set; } = "System";
    public DateTime? ModifiedDate { get; set; }
    public string? ModifiedBy { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedDate { get; set; }
    public string? DeletedBy { get; set; }
}
