using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Domain.Entities;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.Application.Features.Players.Commands.CreatePlayer;

public record CreatePlayerCommand : IRequest<Guid>
{
    public string FullName { get; init; } = string.Empty;
    public string MobileNumber { get; init; } = string.Empty;
    public PlayerCategory Category { get; init; }
    public string? Email { get; init; }
}

public class CreatePlayerCommandHandler : IRequestHandler<CreatePlayerCommand, Guid>
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IApplicationDbContext _context;
    private readonly IDateTime _dateTime;

    public CreatePlayerCommandHandler(
        UserManager<ApplicationUser> userManager,
        IApplicationDbContext context,
        IDateTime dateTime)
    {
        _userManager = userManager;
        _context = context;
        _dateTime = dateTime;
    }

    public async Task<Guid> Handle(CreatePlayerCommand request, CancellationToken cancellationToken)
    {
        // Check if user already exists
        var existingUser = await _userManager.FindByNameAsync(request.MobileNumber);
        if (existingUser != null)
        {
            throw new Exception("A user with this mobile number already exists.");
        }

        var player = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = request.MobileNumber,
            PhoneNumber = request.MobileNumber,
            FullName = request.FullName,
            Email = request.Email,
            Role = UserRole.Player,
            Status = UserStatus.PendingActivation,
            Category = request.Category,
            WalletBalance = 0.00m,
            CreatedBy = "System", // Can be current user ID via ICurrentUserService
            CreatedDate = _dateTime.Now
        };

        // Temporary password
        var tempPassword = "Temp" + request.MobileNumber.Substring(Math.Max(0, request.MobileNumber.Length - 4)) + "!";

        var result = await _userManager.CreateAsync(player, tempPassword);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new Exception($"Failed to create player: {errors}");
        }

        await _userManager.AddToRoleAsync(player, UserRole.Player.ToString());

        // Auditing user creation
        var audit = new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = player.Id,
            Action = "User Created",
            Description = $"Player {player.FullName} onboarding created. Temporary password: {tempPassword}",
            Timestamp = _dateTime.Now,
            CreatedDate = _dateTime.Now
        };
        _context.ActivityLogs.Add(audit);
        await _context.SaveChangesAsync(cancellationToken);

        return player.Id;
    }
}
