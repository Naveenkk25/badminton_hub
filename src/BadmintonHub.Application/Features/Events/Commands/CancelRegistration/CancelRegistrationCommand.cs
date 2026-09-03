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
        var registrations = await _context.Registrations
            .Include(r => r.Player)
            .Where(r => r.EventId == request.EventId && r.PlayerId == request.PlayerId && !r.IsCancelled)
            .ToListAsync(cancellationToken);

        var waitlists = await _context.Waitlists
            .Include(w => w.Player)
            .Where(w => w.EventId == request.EventId && w.PlayerId == request.PlayerId && !w.IsCancelled && !w.IsPromoted)
            .ToListAsync(cancellationToken);

        if (!registrations.Any() && !waitlists.Any())
        {
            throw new Exception("Active registration not found.");
        }

        bool isAfterCutoff = _dateTime.Now >= @event.CutoffDateTime;

        // HIGH-005: Block cancellation entirely after cutoff
        if (isAfterCutoff)
        {
            throw new Exception("Cancellation is blocked after the cutoff time.");
        }

        string resultMessage = "Cancellation successful. Entry fee has been refunded.";

        var player = registrations.FirstOrDefault()?.Player ?? waitlists.FirstOrDefault()?.Player;

        // 3. Process Refund & Cancel Registrations
        if (registrations.Any())
        {
            int cancelCount = registrations.Count;
            decimal totalRefund = registrations.Sum(r => r.ReservedFee);

            if (player != null)
            {
                player.WalletBalance += totalRefund;

                var refundTransaction = new WalletTransaction
                {
                    Id = Guid.NewGuid(),
                    PlayerId = player.Id,
                    Amount = totalRefund,
                    Type = WalletTransactionType.Refund,
                    Description = $"Refund for cancelling Event: {@event.Name} ({cancelCount} slots)",
                    Timestamp = _dateTime.Now,
                    CreatedDate = _dateTime.Now
                };
                _context.WalletTransactions.Add(refundTransaction);
            }

            foreach (var r in registrations)
            {
                r.IsCancelled = true;
                r.CancelledDate = _dateTime.Now;
            }

            // Log cancellation activity
            var cancelLog = new ActivityLog
            {
                Id = Guid.NewGuid(),
                UserId = request.PlayerId,
                EventId = @event.Id,
                Action = "Player Cancelled",
                Description = $"Player {player?.FullName ?? "Unknown"} cancelled {cancelCount} registration(s). Refunded {(!isAfterCutoff ? totalRefund : 0):C}.",
                Timestamp = _dateTime.Now,
                CreatedDate = _dateTime.Now
            };
            _context.ActivityLogs.Add(cancelLog);

            // Adjust registered count
            @event.RegisteredPlayersCount = Math.Max(0, @event.RegisteredPlayersCount - cancelCount);
            if (@event.RegisteredPlayersCount < @event.MaxPlayers && @event.Status == EventStatus.Full)
            {
                @event.Status = EventStatus.Open;
            }
        }

        // 4. Cancel Waitlists
        if (waitlists.Any())
        {
            foreach (var w in waitlists)
            {
                w.IsCancelled = true;
                w.CancelledDate = _dateTime.Now;
            }

            // Shift remaining waitlist positions down
            var remainingWaitlist = await _context.Waitlists
                .Where(w => w.EventId == @event.Id && !w.IsCancelled && !w.IsPromoted && w.PlayerId != request.PlayerId)
                .OrderBy(w => w.Position)
                .ToListAsync(cancellationToken);

            int pos = 1;
            foreach (var w in remainingWaitlist)
            {
                w.Position = pos++;
            }
            @event.WaitlistedPlayersCount = remainingWaitlist.Count;
            
            if (!registrations.Any())
            {
                resultMessage = "Waitlist cancelled successfully.";
            }
        }

        // 5. FIFO Waitlist Promotion Loop
        if (registrations.Any())
        {
            await PromoteWaitlistedPlayersAsync(@event, cancellationToken);
        }

        @event.ConcurrencyToken = Guid.NewGuid();

        await _context.SaveChangesAsync(cancellationToken);

        return new CancelRegistrationResult { Success = true, Message = resultMessage };
    }

    private async Task PromoteWaitlistedPlayersAsync(Event @event, CancellationToken cancellationToken)
    {
        while (@event.RegisteredPlayersCount < @event.MaxPlayers)
        {
            // Fetch first active waitlisted player in FIFO order
            var nextWaitlist = await _context.Waitlists
                .Include(w => w.Player)
                .Where(w => w.EventId == @event.Id && !w.IsCancelled && !w.IsPromoted)
                .OrderBy(w => w.Position)
                .FirstOrDefaultAsync(cancellationToken);

            if (nextWaitlist == null)
            {
                break; // No one left on waitlist
            }

            var waitlistPlayer = nextWaitlist.Player;
            if (waitlistPlayer == null)
            {
                // Skip corrupt record
                nextWaitlist.IsCancelled = true;
                continue;
            }

            // Check if player has enough balance
            if (waitlistPlayer.WalletBalance >= @event.ReservedFee)
            {
                // Promote Player
                waitlistPlayer.WalletBalance -= @event.ReservedFee;

                // Record Debit (Amount is always positive; Type indicates direction)
                var debitTransaction = new WalletTransaction
                {
                    Id = Guid.NewGuid(),
                    PlayerId = waitlistPlayer.Id,
                    Amount = @event.ReservedFee,
                    Type = WalletTransactionType.Debit,
                    Description = $"Promoted from waitlist for Event: {@event.Name}",
                    Timestamp = _dateTime.Now,
                    CreatedDate = _dateTime.Now
                };
                _context.WalletTransactions.Add(debitTransaction);

                // Create Registration
                var newRegistration = new Registration
                {
                    Id = Guid.NewGuid(),
                    EventId = @event.Id,
                    PlayerId = waitlistPlayer.Id,
                    GuestName = nextWaitlist.GuestName,
                    RegistrationDate = _dateTime.Now,
                    ReservedFee = @event.ReservedFee,
                    CreatedDate = _dateTime.Now
                };
                _context.Registrations.Add(newRegistration);

                // Update Waitlist entry
                nextWaitlist.IsPromoted = true;
                nextWaitlist.PromotedDate = _dateTime.Now;

                // Increment Registered Count
                @event.RegisteredPlayersCount++;
                if (@event.RegisteredPlayersCount >= @event.MaxPlayers)
                {
                    @event.Status = EventStatus.Full;
                }

                // Log Promotion Activity
                var promoLog = new ActivityLog
                {
                    Id = Guid.NewGuid(),
                    UserId = waitlistPlayer.Id,
                    EventId = @event.Id,
                    Action = "Player Promoted",
                    Description = $"Player/Guest {nextWaitlist.GuestName ?? waitlistPlayer.FullName} promoted from waitlist to registered. Paid {@event.ReservedFee:C}.",
                    Timestamp = _dateTime.Now,
                    CreatedDate = _dateTime.Now
                };
                _context.ActivityLogs.Add(promoLog);

                // Shift remaining waitlist positions down by 1
                var remainingWaitlist = await _context.Waitlists
                    .Where(w => w.EventId == @event.Id && !w.IsCancelled && !w.IsPromoted && w.Id != nextWaitlist.Id)
                    .ToListAsync(cancellationToken);

                foreach (var entry in remainingWaitlist)
                {
                    entry.Position = Math.Max(1, entry.Position - 1);
                }

                @event.WaitlistedPlayersCount = remainingWaitlist.Count;
            }
            else
            {
                // Insufficient Balance - Skip Player, Log Failure, Cancel/Remove their waitlist position
                nextWaitlist.IsCancelled = true;
                nextWaitlist.CancelledDate = _dateTime.Now;

                var failureLog = new ActivityLog
                {
                    Id = Guid.NewGuid(),
                    UserId = waitlistPlayer.Id,
                    EventId = @event.Id,
                    Action = "Promotion Failed",
                    Description = $"Waitlist promotion skipped for {nextWaitlist.GuestName ?? waitlistPlayer.FullName} due to insufficient wallet balance (Balance: {waitlistPlayer.WalletBalance:C}).",
                    Timestamp = _dateTime.Now,
                    CreatedDate = _dateTime.Now
                };
                _context.ActivityLogs.Add(failureLog);

                // Shift remaining positions
                var remainingWaitlist = await _context.Waitlists
                    .Where(w => w.EventId == @event.Id && !w.IsCancelled && !w.IsPromoted && w.Id != nextWaitlist.Id)
                    .ToListAsync(cancellationToken);

                foreach (var entry in remainingWaitlist)
                {
                    entry.Position = Math.Max(1, entry.Position - 1);
                }

                @event.WaitlistedPlayersCount = remainingWaitlist.Count;
            }
        }
    }
}
