using BadmintonHub.Domain.Common;

namespace BadmintonHub.Domain.Entities;

public class Organizer : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string ContactNumber { get; set; } = string.Empty;
    public System.Guid UserId { get; set; }
}
