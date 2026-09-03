using System;
using Microsoft.AspNetCore.Identity;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.Domain.Entities;

public class ApplicationUser : IdentityUser<Guid>
{
    public string FullName { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public UserStatus Status { get; set; }
    public PlayerCategory? Category { get; set; }
    public decimal WalletBalance { get; set; }
    public string? ProfilePictureUrl { get; set; }

    // Auditing fields
    public DateTime CreatedDate { get; set; } = DateTime.Now;
    public string CreatedBy { get; set; } = "System";
    public DateTime? ModifiedDate { get; set; }
    public string? ModifiedBy { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedDate { get; set; }
    public string? DeletedBy { get; set; }

    // Refresh Token
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }
}
