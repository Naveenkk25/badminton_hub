using System;

namespace BadmintonHub.Application.Common.Interfaces;

public interface ICurrentUserService
{
    string? UserId { get; }
    string? UserRole { get; }
    string? IpAddress { get; }
    string? DeviceInformation { get; }
}
