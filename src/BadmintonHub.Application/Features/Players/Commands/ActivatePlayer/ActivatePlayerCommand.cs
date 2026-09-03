using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Identity;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Domain.Entities;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.Application.Features.Players.Commands.ActivatePlayer;

public record ActivatePlayerCommand : IRequest<bool>
{
    public string MobileNumber { get; init; } = string.Empty;
    public string CurrentPassword { get; init; } = string.Empty;
    public string NewPassword { get; init; } = string.Empty;
}

public class ActivatePlayerCommandHandler : IRequestHandler<ActivatePlayerCommand, bool>
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IApplicationDbContext _context;
    private readonly IDateTime _dateTime;

    public ActivatePlayerCommandHandler(
        UserManager<ApplicationUser> userManager,
        IApplicationDbContext context,
        IDateTime dateTime)
    {
        _userManager = userManager;
        _context = context;
        _dateTime = dateTime;
    }

    public async Task<bool> Handle(ActivatePlayerCommand request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByNameAsync(request.MobileNumber);
        if (user == null)
        {
            throw new Exception("User not found.");
        }

        if (user.Status != UserStatus.PendingActivation)
        {
            throw new Exception("Account is already activated or not in a pending activation state.");
        }

        // Mandatory password change
        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", System.Linq.Enumerable.Select(result.Errors, e => e.Description));
            throw new Exception($"Password change failed: {errors}");
        }

        // Activate user
        user.Status = UserStatus.Active;
        await _userManager.UpdateAsync(user);

        // Record activity log
        var log = new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Action = "Account Activated",
            Description = $"User {user.FullName} successfully completed first-time login activation.",
            Timestamp = _dateTime.Now,
            CreatedDate = _dateTime.Now
        };
        _context.ActivityLogs.Add(log);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
