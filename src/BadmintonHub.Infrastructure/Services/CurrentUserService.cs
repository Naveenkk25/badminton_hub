using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using BadmintonHub.Application.Common.Interfaces;

namespace BadmintonHub.Infrastructure.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string? UserId => _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);

    public string? UserRole => _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Role);

    public string? IpAddress => _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();

    public string? DeviceInformation => _httpContextAccessor.HttpContext?.Request?.Headers["User-Agent"].ToString();
}
