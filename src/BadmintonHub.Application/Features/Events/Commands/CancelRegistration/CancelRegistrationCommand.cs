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

public record CancelRegistrationCommand(
    Guid EventId, 
    Guid PlayerId, 
    Guid? RegistrationId = null, 
    List<Guid>? RegistrationIds = null,
    string? GuestName = null,
    bool CancelAll = false
) : IRequest<CancelRegistrationResult>;

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

        // 2. Validate Cutoff
        bool isAfterCutoff = _dateTime.Now >= @event.CutoffDateTime;
        if (isAfterCutoff)
        {
            throw new Exception("Cancellation is blocked after the cutoff time.");
        }

        // 3. Resolve targeted registrations and waitlist entries to cancel
        var targetRegistrations = new List<Registration>();
        var targetWaitlists = new List<Waitlist>();

        if (request.RegistrationId.HasValue)
        {
            // Try finding matching registration
            var singleReg = await _context.Registrations
                .Include(r => r.Player)
                .FirstOrDefaultAsync(r => r.Id == request.RegistrationId.Value && r.EventId == request.EventId && !r.IsCancelled, cancellationToken);

            if (singleReg != null)
            {
                targetRegistrations.Add(singleReg);
            }
            else
            {
                // Try finding matching waitlist entry
                var singleWl = await _context.Waitlists
                    .Include(w => w.Player)
                    .FirstOrDefaultAsync(w => w.Id == request.RegistrationId.Value && w.EventId == request.EventId && !w.IsCancelled && !w.IsPromoted, cancellationToken);
                
                if (singleWl != null)
                {
                    targetWaitlists.Add(singleWl);
                }
            }
        }
        else if (request.RegistrationIds != null && request.RegistrationIds.Any())
        {
            var multiRegs = await _context.Registrations
                .Include(r => r.Player)
                .Where(r => request.RegistrationIds.Contains(r.Id) && r.EventId == request.EventId && !r.IsCancelled)
                .ToListAsync(cancellationToken);
            targetRegistrations.AddRange(multiRegs);

            var multiWls = await _context.Waitlists
                .Include(w => w.Player)
                .Where(w => request.RegistrationIds.Contains(w.Id) && w.EventId == request.EventId && !w.IsCancelled && !w.IsPromoted)
                .ToListAsync(cancellationToken);
            targetWaitlists.AddRange(multiWls);
        }
        else if (!string.IsNullOrEmpty(request.GuestName))
        {
            if (request.GuestName.Equals("main", StringComparison.OrdinalIgnoreCase))
            {
                // Cancel main player only (GuestName is null)
                var mainReg = await _context.Registrations
                    .Include(r => r.Player)
                    .FirstOrDefaultAsync(r => r.EventId == request.EventId && r.PlayerId == request.PlayerId && r.GuestName == null && !r.IsCancelled, cancellationToken);
                if (mainReg != null) targetRegistrations.Add(mainReg);
            }
            else
            {
                // Target by guest name
                var guestReg = await _context.Registrations
                    .Include(r => r.Player)
                    .FirstOrDefaultAsync(r => r.EventId == request.EventId && r.PlayerId == request.PlayerId && r.GuestName == request.GuestName && !r.IsCancelled, cancellationToken);
                if (guestReg != null)
                {
                    targetRegistrations.Add(guestReg);
                }
                else
                {
                    var guestWl = await _context.Waitlists
                        .Include(w => w.Player)
                        .FirstOrDefaultAsync(w => w.EventId == request.EventId && w.PlayerId == request.PlayerId && w.GuestName == request.GuestName && !w.IsCancelled && !w.IsPromoted, cancellationToken);
                    if (guestWl != null) targetWaitlists.Add(guestWl);
                }
            }
        }
        else
        {
            // Cancel all active slots (main player + guests) for this player
            var allRegs = await _context.Registrations
                .Include(r => r.Player)
                .Where(r => r.EventId == request.EventId && r.PlayerId == request.PlayerId && !r.IsCancelled)
                .ToListAsync(cancellationToken);
            targetRegistrations.AddRange(allRegs);

            var allWls = await _context.Waitlists
                .Include(w => w.Player)
                .Where(w => w.EventId == request.EventId && w.PlayerId == request.PlayerId && !w.IsCancelled && !w.IsPromoted)
                .ToListAsync(cancellationToken);
            targetWaitlists.AddRange(allWls);
        }

        if (!targetRegistrations.Any() && !targetWaitlists.Any())
        {
            throw new Exception("Active registration or waitlist entry not found.");
        }

        // 4. Mark targeted items as cancelled
        foreach (var r in targetRegistrations)
        {
            r.IsCancelled = true;
            r.CancelledDate = _dateTime.Now;
        }

        foreach (var w in targetWaitlists)
        {
            w.IsCancelled = true;
            w.CancelledDate = _dateTime.Now;
        }

        // 5. Process refunds for cancelled participants
        // Group by PlayerId so refunds go to the payer who registered them
        var playerGroups = targetRegistrations.Select(r => new { r.PlayerId, r.ReservedFee, r.Player })
            .Concat(targetWaitlists.Select(w => new { w.PlayerId, ReservedFee = @event.ReservedFee, w.Player }))
            .GroupBy(x => x.PlayerId);

        decimal totalRefundAll = 0;
        foreach (var group in playerGroups)
        {
            decimal refundAmount = group.Sum(x => x.ReservedFee);
            totalRefundAll += refundAmount;
            var payer = group.FirstOrDefault()?.Player ?? await _context.Users.FindAsync(new object[] { group.Key }, cancellationToken);
            if (payer != null && refundAmount > 0)
            {
                payer.WalletBalance += refundAmount;

                var refundTransaction = new WalletTransaction
                {
                    Id = Guid.NewGuid(),
                    PlayerId = payer.Id,
                    Amount = refundAmount,
                    Type = WalletTransactionType.Refund,
                    Description = $"Refund for cancelling Event: {@event.Name} ({group.Count()} slot{(group.Count() > 1 ? "s" : "")})",
                    Timestamp = _dateTime.Now,
                    CreatedDate = _dateTime.Now
                };
                _context.WalletTransactions.Add(refundTransaction);
            }
        }

        // 6. Log Cancellation Activity
        string cancelDesc;
        if (targetRegistrations.Count == 1 && !targetWaitlists.Any())
        {
            var firstTarget = targetRegistrations.First();
            cancelDesc = !string.IsNullOrEmpty(firstTarget.GuestName) 
                ? $"Cancelled guest {firstTarget.GuestName}." 
                : $"Cancelled main player slot.";
        }
        else
        {
            cancelDesc = $"Cancelled {targetRegistrations.Count + targetWaitlists.Count} slot(s) ({targetRegistrations.Count} registered, {targetWaitlists.Count} waitlisted).";
        }

        var cancelLog = new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = request.PlayerId,
            EventId = @event.Id,
            Action = "Player Cancelled",
            Description = $"{cancelDesc} Refunded {totalRefundAll:C}.",
            Timestamp = _dateTime.Now,
            CreatedDate = _dateTime.Now
        };
        _context.ActivityLogs.Add(cancelLog);

        // 7. Recalculate event capacity using active participants/slots
        int newlyAvailableSlots = targetRegistrations.Count;

        // Current active registrations still in event (excluding cancelled target registrations)
        var cancelledRegIds = targetRegistrations.Select(r => r.Id).ToHashSet();
        int activeRegistrationsCount = await _context.Registrations
            .CountAsync(r => r.EventId == @event.Id && !r.IsCancelled && !cancelledRegIds.Contains(r.Id), cancellationToken);

        @event.RegisteredPlayersCount = activeRegistrationsCount;

        // 8. FIFO Waitlist Promotion: Promote ONLY the exact number of available slots
        int slotsToPromote = Math.Min(newlyAvailableSlots, Math.Max(0, @event.MaxPlayers - @event.RegisteredPlayersCount));

        if (slotsToPromote > 0)
        {
            var cancelledWaitlistIds = targetWaitlists.Select(w => w.Id).ToHashSet();
            var eligibleWaitlists = await _context.Waitlists
                .Include(w => w.Player)
                .Where(w => w.EventId == @event.Id && !w.IsCancelled && !w.IsPromoted && !cancelledWaitlistIds.Contains(w.Id))
                .OrderBy(w => w.Position)
                .ToListAsync(cancellationToken);

            int promotedCount = 0;
            foreach (var candidate in eligibleWaitlists)
            {
                if (promotedCount >= slotsToPromote)
                {
                    break; // Promoted exactly the required number of slots
                }

                var candidatePlayer = candidate.Player;
                if (candidatePlayer == null)
                {
                    candidate.IsCancelled = true;
                    candidate.CancelledDate = _dateTime.Now;
                    continue;
                }

                // Create confirmed Registration for promoted waitlist candidate
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

                candidate.IsPromoted = true;
                candidate.PromotedDate = _dateTime.Now;

                @event.RegisteredPlayersCount++;
                promotedCount++;

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

            // Reassign positions sequentially for remaining waitlist entries
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
        }
        else
        {
            // If no slots were opened (e.g. cancelled a waitlist slot), simply reassign remaining waitlist positions
            var cancelledWaitlistIds = targetWaitlists.Select(w => w.Id).ToHashSet();
            var remainingWaitlist = await _context.Waitlists
                .Where(w => w.EventId == @event.Id && !w.IsCancelled && !w.IsPromoted && !cancelledWaitlistIds.Contains(w.Id))
                .OrderBy(w => w.Position)
                .ToListAsync(cancellationToken);

            int nextPos = 1;
            foreach (var entry in remainingWaitlist)
            {
                entry.Position = nextPos++;
            }
            @event.WaitlistedPlayersCount = remainingWaitlist.Count;
        }

        // Update event status based on active capacity
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

        string resultMessage = (targetRegistrations.Count + targetWaitlists.Count) > 0 
            ? "Cancellation successful. Entry fee has been refunded." 
            : "Cancellation successful.";

        return new CancelRegistrationResult { Success = true, Message = resultMessage };
    }
}
