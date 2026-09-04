using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;
using FluentAssertions;
using BadmintonHub.Domain.Entities;
using BadmintonHub.Domain.Enums;
using BadmintonHub.Infrastructure.Persistence;
using BadmintonHub.Infrastructure.Services;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.WebApi.Controllers;

namespace BadmintonHub.Tests;

public class AuthTests
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _configuration;

    public AuthTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var mockCurrentUserService = new TestCurrentUserService();
        var dateTime = new DateTimeService();

        _context = new ApplicationDbContext(options, mockCurrentUserService, dateTime);

        var userStore = new UserStore<ApplicationUser, IdentityRole<Guid>, ApplicationDbContext, Guid>(_context);
        _userManager = new UserManager<ApplicationUser>(
            userStore,
            null,
            new PasswordHasher<ApplicationUser>(),
            null,
            null,
            null,
            null,
            null,
            new Microsoft.Extensions.Logging.Abstractions.NullLogger<UserManager<ApplicationUser>>());

        var myConfiguration = new Dictionary<string, string>
        {
            {"JwtSettings:Secret", "SuperSecretKeyForBadmintonHubLongerStringToShowSecurity123!"},
            {"JwtSettings:Issuer", "BadmintonHub"},
            {"JwtSettings:Audience", "BadmintonHubPlayers"}
        };

        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(myConfiguration!)
            .Build();
    }

    private AuthController CreateController()
    {
        var controller = new AuthController(_userManager, null!, _configuration, _context);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
        return controller;
    }

    [Fact]
    public async Task Refresh_WithValidRefreshTokenInBody_ShouldReturnNewJwtAndRotatedRefreshToken()
    {
        // Arrange
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "1234567890",
            FullName = "Test Player",
            Role = UserRole.Player,
            Status = UserStatus.Active,
            SecurityStamp = Guid.NewGuid().ToString(),
            RefreshToken = "valid_initial_refresh_token",
            RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7)
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var controller = CreateController();

        // Act
        var result = await controller.Refresh(new RefreshTokenModel { RefreshToken = "valid_initial_refresh_token" });

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        okResult.Should().NotBeNull();

        // Check returned dynamic payload
        var payload = okResult!.Value;
        payload.Should().NotBeNull();

        var tokenProp = payload!.GetType().GetProperty("token")?.GetValue(payload)?.ToString();
        var refreshTokenProp = payload!.GetType().GetProperty("refreshToken")?.GetValue(payload)?.ToString();

        tokenProp.Should().NotBeNullOrEmpty();
        refreshTokenProp.Should().NotBeNullOrEmpty();
        refreshTokenProp.Should().NotBe("valid_initial_refresh_token"); // Must be rotated!

        // Verify rotated in database
        var updatedUser = await _context.Users.FindAsync(user.Id);
        updatedUser!.RefreshToken.Should().Be(refreshTokenProp);
        updatedUser.RefreshTokenExpiryTime.Should().BeAfter(DateTime.UtcNow.AddDays(6));
    }

    [Fact]
    public async Task Refresh_OldRefreshToken_AfterRotation_ShouldBeRejected()
    {
        // Arrange
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "1234567891",
            FullName = "Test Player 2",
            Role = UserRole.Player,
            Status = UserStatus.Active,
            SecurityStamp = Guid.NewGuid().ToString(),
            RefreshToken = "rotated_new_token",
            RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7)
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var controller = CreateController();

        // Act - Attacker/client attempts to use previous stale token
        var result = await controller.Refresh(new RefreshTokenModel { RefreshToken = "old_stale_token" });

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Refresh_WhenUserIsSuspended_ShouldReturnForbidden403()
    {
        // Arrange
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "1234567892",
            FullName = "Suspended Player",
            Role = UserRole.Player,
            Status = UserStatus.Suspended,
            RefreshToken = "suspended_player_token",
            RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7)
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var controller = CreateController();

        // Act
        var result = await controller.Refresh(new RefreshTokenModel { RefreshToken = "suspended_player_token" });

        // Assert
        result.Should().BeOfType<ObjectResult>();
        var objResult = result as ObjectResult;
        objResult!.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task Logout_WithValidRefreshToken_ShouldRevokeToken_AndSubsequentRefreshShouldFail()
    {
        // Arrange
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "1234567893",
            FullName = "Logging Out Player",
            Role = UserRole.Player,
            Status = UserStatus.Active,
            SecurityStamp = Guid.NewGuid().ToString(),
            RefreshToken = "token_to_revoke",
            RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7)
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var controller = CreateController();

        // Act 1: Logout
        var logoutResult = await controller.Logout(new RefreshTokenModel { RefreshToken = "token_to_revoke" });
        logoutResult.Should().BeOfType<OkObjectResult>();

        // Assert 1: Database token should be nullified
        var updatedUser = await _context.Users.FindAsync(user.Id);
        updatedUser!.RefreshToken.Should().BeNull();
        updatedUser.RefreshTokenExpiryTime.Should().BeNull();

        // Act 2: Attempting to refresh with the revoked token
        var refreshResult = await controller.Refresh(new RefreshTokenModel { RefreshToken = "token_to_revoke" });

        // Assert 2: Must be Unauthorized
        refreshResult.Should().BeOfType<UnauthorizedObjectResult>();
    }
}
