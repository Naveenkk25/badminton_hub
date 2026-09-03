using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Domain.Entities;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.Application.Features.Events.Commands.SettleEvent;

public record RegistrationSettlementDto(Guid RegistrationId, decimal ActualFee);

public record SettleEventCommand : IRequest<bool>
{
    public Guid EventId { get; init; }
    public Guid ActionerId { get; init; }
    public bool IsAdmin { get; init; }
    public List<RegistrationSettlementDto> Settlements { get; init; } = new();
}

public class SettleEventCommandHandler : IRequestHandler<SettleEventCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTime _dateTime;

    public SettleEventCommandHandler(IApplicationDbContext context, IDateTime dateTime)
    {
        _context = context;
        _dateTime = dateTime;
    }

    public async Task<bool> Handle(SettleEventCommand request, CancellationToken cancellationToken)
    {
        var @event = await _context.Events
            .Include(e => e.Registrations).ThenInclude(r => r.Player)
            .FirstOrDefaultAsync(e => e.Id == request.EventId, cancellationToken);

        if (@event == null)
            throw new Exception("Event not found.");

        if (!request.IsAdmin && @event.OrganizerId != request.ActionerId)
            throw new Exception("Only the organizer or an admin can settle this event.");

        if (@event.IsSettled)
            throw new Exception("Event is already settled.");

        if (@event.Status != EventStatus.Completed)
        {
            var endDateTime = @event.EventDate.Date.Add(@event.EndTime);
            if (DateTime.Now <= endDateTime)
            {
                throw new Exception("Event must be completed before settling fees.");
            }
            
            // Auto-update to completed since it has passed the end time
            @event.Status = EventStatus.Completed;
        }

        // Create dictionary for faster lookup
        var settlementDict = request.Settlements.ToDictionary(s => s.RegistrationId, s => s.ActualFee);

        // Iterate through all active registrations
        var activeRegistrations = @event.Registrations.Where(r => !r.IsCancelled).ToList();

        foreach (var reg in activeRegistrations)
        {
            if (settlementDict.TryGetValue(reg.Id, out decimal actualFee))
            {
                reg.ActualFee = actualFee;
                reg.RefundAmount = reg.ReservedFee - actualFee;

                if (reg.RefundAmount > 0)
                {
                    // Refund to player (who might be the sponsor of a guest)
                    if (reg.Player != null)
                    {
                        reg.Player.WalletBalance += reg.RefundAmount.Value;
                        
                        var transaction = new WalletTransaction
                        {
                            Id = Guid.NewGuid(),
                            PlayerId = reg.PlayerId, // Refund goes to the sponsor
                            Amount = reg.RefundAmount.Value,
                            Type = WalletTransactionType.Refund,
                            Description = reg.GuestName != null ? $"Refund for Guest {reg.GuestName} at Event: {@event.Name}" : $"Refund for Event: {@event.Name}",
                            Timestamp = _dateTime.Now,
                            CreatedDate = _dateTime.Now
                        };
                        _context.WalletTransactions.Add(transaction);
                    }
                }
            }
        }

        @event.IsSettled = true;

        var auditLog = new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = request.ActionerId,
            EventId = @event.Id,
            Action = "Event Settled",
            Description = $"Event fees were settled for {@event.Name}.",
            Timestamp = _dateTime.Now,
            CreatedDate = _dateTime.Now
        };
        _context.ActivityLogs.Add(auditLog);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
