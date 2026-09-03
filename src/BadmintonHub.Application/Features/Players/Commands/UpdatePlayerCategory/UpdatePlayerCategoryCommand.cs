using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Identity;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Domain.Entities;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.Application.Features.Players.Commands.UpdatePlayerCategory;

public record UpdatePlayerCategoryCommand : IRequest<bool>
{
    public Guid PlayerId { get; init; }
    public PlayerCategory NewCategory { get; init; }
}

public class UpdatePlayerCategoryCommandHandler : IRequestHandler<UpdatePlayerCategoryCommand, bool>
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IApplicationDbContext _context;
    private readonly IDateTime _dateTime;

    public UpdatePlayerCategoryCommandHandler(
        UserManager<ApplicationUser> userManager,
        IApplicationDbContext context,
        IDateTime dateTime)
    {
        _userManager = userManager;
        _context = context;
        _dateTime = dateTime;
    }

    public async Task<bool> Handle(UpdatePlayerCategoryCommand request, CancellationToken cancellationToken)
    {
        var player = await _userManager.FindByIdAsync(request.PlayerId.ToString());
        if (player == null)
        {
            throw new Exception("Player not found.");
        }

        var oldCategory = player.Category;
        player.Category = request.NewCategory;

        var result = await _userManager.UpdateAsync(player);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", System.Linq.Enumerable.Select(result.Errors, e => e.Description));
            throw new Exception($"Failed to update player category: {errors}");
        }

        // Auditing category change specifically as required
        var audit = new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = player.Id,
            Action = "Category Changed",
            Description = $"Player {player.FullName} category changed from {oldCategory?.ToString() ?? "None"} to {request.NewCategory}.",
            Timestamp = _dateTime.Now,
            CreatedDate = _dateTime.Now
        };
        _context.ActivityLogs.Add(audit);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
