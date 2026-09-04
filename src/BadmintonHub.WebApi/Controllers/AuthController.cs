using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using BadmintonHub.Domain.Entities;
using BadmintonHub.Domain.Enums;
using System.Linq;
using BadmintonHub.Application.Common.Interfaces;

namespace BadmintonHub.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IConfiguration _configuration;
    private readonly IApplicationDbContext _context;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IConfiguration configuration,
        IApplicationDbContext context)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _configuration = configuration;
        _context = context;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginModel model)
    {
        var user = await _userManager.FindByNameAsync(model.MobileNumber);
        if (user == null)
        {
            return Unauthorized(new { error = "Invalid mobile number or password.", message = "Invalid mobile number or password." });
        }

        if (user.Status == UserStatus.Suspended)
        {
            return StatusCode(403, new { error = "Account suspended reach out Admin", message = "Account suspended reach out Admin" });
        }

        if (user.Status == UserStatus.Inactive)
        {
            return StatusCode(403, new { error = "Account is inactive. Contact Admin.", message = "Account is inactive. Contact Admin." });
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, model.Password, false);
        if (!result.Succeeded)
        {
            return Unauthorized(new { error = "Invalid mobile number or password.", message = "Invalid mobile number or password." });
        }

        var token = await GenerateJwtTokenAsync(user);
        var refreshToken = GenerateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        await _userManager.UpdateAsync(user);

        SetRefreshTokenCookie(refreshToken);

        // If PendingActivation, return a flag so frontend redirects to activation
        if (user.Status == UserStatus.PendingActivation)
        {
            return Ok(new
            {
                token,
                refreshToken,
                id = user.Id,
                fullName = user.FullName,
                mobileNumber = user.UserName,
                role = user.Role.ToString(),
                status = user.Status.ToString(),
                category = user.Category?.ToString(),
                walletBalance = user.WalletBalance,
                profilePictureUrl = user.ProfilePictureUrl,
                requiresActivation = true
            });
        }

        return Ok(new
        {
            token,
            refreshToken,
            id = user.Id,
            fullName = user.FullName,
            mobileNumber = user.UserName,
            role = user.Role.ToString(),
            status = user.Status.ToString(),
            category = user.Category?.ToString(),
            walletBalance = user.WalletBalance,
            profilePictureUrl = user.ProfilePictureUrl
        });
    }

    private async Task<string> GenerateJwtTokenAsync(ApplicationUser user)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.UserName ?? string.Empty),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };

        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secret = jwtSettings.GetValue<string>("Secret")
            ?? Environment.GetEnvironmentVariable("JWT_SECRET")
            ?? throw new InvalidOperationException("JWT Secret is not configured.");
        var issuer = jwtSettings.GetValue<string>("Issuer") ?? "BadmintonHub";
        var audience = jwtSettings.GetValue<string>("Audience") ?? "BadmintonHubPlayers";

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(30),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string GenerateRefreshToken()
    {
        var randomNumber = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    private void SetRefreshTokenCookie(string refreshToken)
    {
        var cookieOptions = new Microsoft.AspNetCore.Http.CookieOptions
        {
            HttpOnly = true,
            Expires = DateTime.UtcNow.AddDays(7),
            Secure = true, // Ensure HTTPS is used
            SameSite = Microsoft.AspNetCore.Http.SameSiteMode.None // Cross-origin for detached frontend
        };
        Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenModel? model)
    {
        var refreshToken = model?.RefreshToken;
        if (string.IsNullOrEmpty(refreshToken))
        {
            refreshToken = Request.Cookies["refreshToken"];
        }

        if (string.IsNullOrEmpty(refreshToken)) return Unauthorized(new { error = "Refresh token is missing." });

        var user = _context.Users.FirstOrDefault(u => u.RefreshToken == refreshToken);
        if (user == null || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
        {
            return Unauthorized(new { error = "Invalid or expired refresh token." });
        }

        if (user.Status == UserStatus.Suspended)
        {
            return StatusCode(403, new { error = "Account suspended reach out Admin", message = "Account suspended reach out Admin" });
        }

        if (user.Status == UserStatus.Inactive)
        {
            return StatusCode(403, new { error = "Account is inactive. Contact Admin.", message = "Account is inactive. Contact Admin." });
        }

        var newJwt = await GenerateJwtTokenAsync(user);
        var newRefreshToken = GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        await _userManager.UpdateAsync(user);

        SetRefreshTokenCookie(newRefreshToken);

        return Ok(new { token = newJwt, refreshToken = newRefreshToken });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenModel? model)
    {
        var refreshToken = model?.RefreshToken ?? Request.Cookies["refreshToken"];
        if (!string.IsNullOrEmpty(refreshToken))
        {
            var user = _context.Users.FirstOrDefault(u => u.RefreshToken == refreshToken);
            if (user != null)
            {
                user.RefreshToken = null;
                user.RefreshTokenExpiryTime = null;
                await _userManager.UpdateAsync(user);
            }
        }

        Response.Cookies.Delete("refreshToken");
        return Ok(new { success = true });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return NotFound();

        return Ok(new
        {
            id = user.Id,
            fullName = user.FullName,
            mobileNumber = user.UserName,
            role = user.Role.ToString(),
            status = user.Status.ToString(),
            category = user.Category?.ToString(),
            walletBalance = user.WalletBalance,
            profilePictureUrl = user.ProfilePictureUrl
        });
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordModel model)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return NotFound();

        var result = await _userManager.ChangePasswordAsync(user, model.CurrentPassword, model.NewPassword);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            return BadRequest(new { error = errors });
        }

        return Ok(new { success = true });
    }
    [Authorize(Roles = "SuperAdmin,Organizer")]
    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordModel model)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null) return NotFound(new { error = "User not found." });

        var removeResult = await _userManager.RemovePasswordAsync(user);
        if (!removeResult.Succeeded)
        {
            var errors = string.Join(", ", removeResult.Errors.Select(e => e.Description));
            return BadRequest(new { error = $"Failed to reset password: {errors}" });
        }

        var addResult = await _userManager.AddPasswordAsync(user, model.NewPassword);
        if (!addResult.Succeeded)
        {
            var errors = string.Join(", ", addResult.Errors.Select(e => e.Description));
            return BadRequest(new { error = $"Failed to set new password: {errors}" });
        }

        var log = new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Action = "Password Reset by Admin",
            Description = $"Password for {user.FullName} was reset by an administrator.",
            Timestamp = DateTime.Now,
            CreatedDate = DateTime.Now
        };
        _context.ActivityLogs.Add(log);
        await _context.SaveChangesAsync(default);

        return Ok(new { success = true });
    }

    [HttpPost("activate")]
    public async Task<IActionResult> Activate([FromBody] ActivateAccountModel model)
    {
        var user = await _userManager.FindByNameAsync(model.MobileNumber);
        if (user == null) return NotFound(new { error = "User not found." });

        if (user.Status != UserStatus.PendingActivation)
        {
            return BadRequest(new { error = "Account is already activated." });
        }

        var result = await _userManager.ChangePasswordAsync(user, model.CurrentPassword, model.NewPassword);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            return BadRequest(new { error = $"Password change failed: {errors}" });
        }

        user.Status = UserStatus.Active;
        await _userManager.UpdateAsync(user);

        var log = new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Action = "Account Activated",
            Description = $"User {user.FullName} successfully completed activation.",
            Timestamp = DateTime.Now,
            CreatedDate = DateTime.Now
        };
        _context.ActivityLogs.Add(log);
        await _context.SaveChangesAsync(default);

        return Ok(new { success = true });
    }
}

public class ChangePasswordModel
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class ResetPasswordModel
{
    public string NewPassword { get; set; } = string.Empty;
}

public class ActivateAccountModel
{
    public string MobileNumber { get; set; } = string.Empty;
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class LoginModel
{
    public string MobileNumber { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class RefreshTokenModel
{
    public string? RefreshToken { get; set; }
}
