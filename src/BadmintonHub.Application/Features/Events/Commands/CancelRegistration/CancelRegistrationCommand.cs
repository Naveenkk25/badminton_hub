using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Domain.Entities;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.Application.Features.Events.Commands.CancelRegistration;

public class CancelRegistrationResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}

public record CancelRegistrationCommand(Guid EventId, Guid PlayerId) : IRequest<CancelRegistrationResult>;

public class CancelRegistrationCommandHandler : IRequestHandler<CancelRegistrationCommand, CancelRegistrationResult>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTime _dateTime;

    public CancelRegistrationCommandHandler(IApplicationDbContext context, IDateTime dateTime)
    {
        _context = context;
        _dateTime = dateTime;
    }

    public async Task<CancelRegistrationResult> Handle(CancelRegistrationCommand request, CancellationToken cancellationToken)
    {
        // 1. Fetch event
        var @event = await _context.Events.FirstOrDefaultAsync(e => e.Id == request.EventId, cancellationToken);
        if (@event == null)
        {
            throw new Exception("Associated event not found.");
        }

        // 2. Fetch all registrations and waitlists for this player group
        var playerRegistrations = await _context.Registrations
            .Include(r => r.Player)
            .Where(r => r.EventId == request.EventId && r.PlayerId == request.PlayerId && !r.IsCancelled)
            .ToListAsync(cancellationToken);

        var playerWaitlists = await _context.Waitlists
            .Include(w => w.Player)
            .Where(w => w.EventId == request.EventId && w.PlayerId == request.PlayerId && !w.IsCancelled && !w.IsPromoted)
            .ToListAsync(cancellationToken);

        if (!playerRegistrations.Any() && !playerWaitlists.Any())
        {
            throw new Exception("Active registration or waitlist entry not found.");
        }

        bool isAfterCutoff = _dateTime.Now >= @event.CutoffDateTime;

        // Block cancellation after cutoff
        if (isAfterCutoff)
        {
            throw new Exception("Cancellation is blocked after the cutoff time.");
        }

        var player = playerRegistrations.FirstOrDefault()?.Player ?? playerWaitlists.FirstOrDefault()?.Player;

        int cancelledRegCount = playerRegistrations.Count;
        int cancelledWaitlistCount = playerWaitlists.Count;
        int totalCancelledSlots = cancelledRegCount + cancelledWaitlistCount;
        decimal totalRefund = totalCancelledSlots * @event.ReservedFee;

        // Cancel registrations
        foreach (var r in playerRegistrations)
        {
            r.IsCancelled = true;
            r.CancelledDate = _dateTime.Now;
        }

        // Cancel waitlist entries
        foreach (var w in playerWaitlists)
        {
            w.IsCancelled = true;
            w.CancelledDate = _dateTime.Now;
        }

        // Process refund
        if (player != null && totalRefund > 0)
        {
            player.WalletBalance += totalRefund;

            var refundTransaction = new WalletTransaction
            {
                Id = Guid.NewGuid(),
                PlayerId = player.Id,
                Amount = totalRefund,
                Type = WalletTransactionType.Refund,
                Description = $"Refund for cancelling Event: {@event.Name} ({totalCancelledSlots} slot{(totalCancelledSlots > 1 ? "s" : "")})",
                Timestamp = _dateTime.Now,
                CreatedDate = _dateTime.Now
            };
            _context.WalletTransactions.Add(refundTransaction);
        }

        // Log cancellation activity
        var cancelLog = new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = request.PlayerId,
            EventId = @event.Id,
            Action = "Player Cancelled",
            Description = $"Player {player?.FullName ?? "Unknown"} cancelled {totalCancelledSlots} slot(s) ({cancelledRegCount} registered, {cancelledWaitlistCount} waitlisted). Refunded {totalRefund:C}.",
            Timestamp = _dateTime.Now,
            CreatedDate = _dateTime.Now
        };
        _context.ActivityLogs.Add(cancelLog);

        // Adjust registered count
        @event.RegisteredPlayersCount = Math.Max(0, @event.RegisteredPlayersCount - cancelledRegCount);

        // 3. FIFO Waitlist Promotion Loop for open spots
        // Load all active waitlist entries for other players in FIFO order
        var eligibleWaitlists = await _context.Waitlists
            .Include(w => w.Player)
            .Where(w => w.EventId == @event.Id && !w.IsCancelled && !w.IsPromoted && w.PlayerId != request.PlayerId)
            .OrderBy(w => w.Position)
            .ToListAsync(cancellationToken);

        foreach (var candidate in eligibleWaitlists)
        {
            if (@event.RegisteredPlayersCount >= @event.MaxPlayers)
            {
                break; // Event is full
            }

            var candidatePlayer = candidate.Player;
            if (candidatePlayer == null)
            {
                candidate.IsCancelled = true;
                candidate.CancelledDate = _dateTime.Now;
                continue;
            }

            // Create Registration
            var newRegistration = new Registration
            {
                Id = Guid.NewGuid(),
                EventId = @event.Id,
                PlayerId = candidatePlayer.Id,
                GuestName = candidate.GuestName,
                RegistrationDate = _dateTime.Now,
                ReservedFee = @event.ReservedFee,
                CreatedDate = _dateTime.Now
            };
            _context.Registrations.Add(newRegistration);

            // Mark waitlist as promoted
            candidate.IsPromoted = true;
            candidate.PromotedDate = _dateTime.Now;

            @event.RegisteredPlayersCount++;

            // Log Promotion Activity
            var promoLog = new ActivityLog
            {
                Id = Guid.NewGuid(),
                UserId = candidatePlayer.Id,
                EventId = @event.Id,
                Action = "Player Promoted",
                Description = $"Player/Guest {candidate.GuestName ?? candidatePlayer.FullName} promoted from waitlist to registered.",
                Timestamp = _dateTime.Now,
                CreatedDate = _dateTime.Now
            };
            _context.ActivityLogs.Add(promoLog);
        }

        // 4. Reassign positions for remaining active waitlist entries
        var remainingWaitlist = eligibleWaitlists
            .Where(w => !w.IsCancelled && !w.IsPromoted)
            .OrderBy(w => w.Position)
            .ToList();

        int nextPos = 1;
        foreach (var entry in remainingWaitlist)
        {
            entry.Position = nextPos++;
        }
        @event.WaitlistedPlayersCount = remainingWaitlist.Count;

        // Update event status
        if (@event.RegisteredPlayersCount >= @event.MaxPlayers)
        {
            @event.Status = EventStatus.Full;
        }
        else
        {
            @event.Status = EventStatus.Open;
        }

        @event.ConcurrencyToken = Guid.NewGuid();

        await _context.SaveChangesAsync(cancellationToken);

        string resultMessage = totalCancelledSlots > 0 
            ? "Cancellation successful. Entry fee has been refunded." 
            : "Cancellation successful.";

        return new CancelRegistrationResult { Success = true, Message = resultMessage };
    }
}
