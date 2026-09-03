using System;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.Application.DTOs;

public class UserDto
{
    public Guid Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public UserStatus Status { get; set; }
    public PlayerCategory? Category { get; set; }
    public decimal WalletBalance { get; set; }
    public DateTime CreatedDate { get; set; }
}
