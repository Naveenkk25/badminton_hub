using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Domain.Entities;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.Application.Features.Events.Commands.RegisterPlayer;

public record RegisterPlayerCommand : IRequest<RegistrationResult>
{
    public Guid EventId { get; init; }
    public Guid PlayerId { get; init; }
    public int GuestCount { get; init; } = 0;
}

public class RegistrationResult
{
    public string Status { get; set; } = string.Empty; // "Registered" or "Waitlisted"
    public int? WaitlistPosition { get; set; }
}

public class RegisterPlayerCommandHandler : IRequestHandler<RegisterPlayerCommand, RegistrationResult>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTime _dateTime;

    public RegisterPlayerCommandHandler(IApplicationDbContext context, IDateTime dateTime)
    {
        _context = context;
        _dateTime = dateTime;
    }

    public async Task<RegistrationResult> Handle(RegisterPlayerCommand request, CancellationToken cancellationToken)
    {
        // We run a retry loop in case of concurrency conflicts
        int maxRetries = 3;
        int currentRetry = 0;

        while (true)
        {
            try
            {
                return await TryRegisterAsync(request, cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                currentRetry++;
                if (currentRetry >= maxRetries)
                {
                    throw new Exception("The event is currently receiving high traffic. Please try again.");
                }
                // Wait a tiny bit and retry
                await Task.Delay(50, cancellationToken);
            }
        }
    }

    private async Task<RegistrationResult> TryRegisterAsync(RegisterPlayerCommand request, CancellationToken cancellationToken)
    {
        // 1. Fetch Event and Player
        var @event = await _context.Events
            .FirstOrDefaultAsync(e => e.Id == request.EventId, cancellationToken);

        if (@event == null)
        {
            throw new Exception("Event not found.");
        }

        var player = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.PlayerId, cancellationToken);

        if (player == null)
        {
            throw new Exception("Player not found.");
        }

        // 2. Validate Event Cutoff and Status
        if (_dateTime.Now >= @event.CutoffDateTime)
        {
            throw new Exception("Registration cutoff has passed.");
        }

        if (@event.Status == EventStatus.Cancelled || @event.Status == EventStatus.Completed || @event.Status == EventStatus.Locked)
        {
            throw new Exception($"Registration is blocked. Event is {@event.Status}.");
        }

        if (player.Status != UserStatus.Active)
        {
            throw new Exception("Your account is not active. Please contact the organizer.");
        }

        // 3. Check if already registered or waitlisted
        var alreadyRegistered = await _context.Registrations
            .AnyAsync(r => r.EventId == request.EventId && r.PlayerId == request.PlayerId && !r.IsCancelled, cancellationToken);

        if (alreadyRegistered)
        {
            throw new Exception("You are already registered for this event.");
        }

        var alreadyWaitlisted = await _context.Waitlists
            .AnyAsync(w => w.EventId == request.EventId && w.PlayerId == request.PlayerId && !w.IsCancelled && !w.IsPromoted, cancellationToken);

        if (alreadyWaitlisted)
        {
            throw new Exception("You are already on the waitlist for this event.");
        }

        // 4. Validate Wallet Balance
        int totalParticipants = 1 + request.GuestCount;
        decimal totalCost = @event.ReservedFee * totalParticipants;

        if (player.WalletBalance < totalCost)
        {
            throw new Exception("Insufficient wallet balance for you and your guests. Please top up your wallet.");
        }

        // Deduct Wallet Balance
        player.WalletBalance -= totalCost;

        // Record transaction (Amount is always positive; Type indicates direction)
        var transaction = new WalletTransaction
        {
            Id = Guid.NewGuid(),
            PlayerId = player.Id,
            Amount = totalCost,
            Type = WalletTransactionType.Debit,
            Description = request.GuestCount > 0 ? $"Registered for Event: {@event.Name} (+{request.GuestCount} Guests)" : $"Registered for Event: {@event.Name}",
            Timestamp = _dateTime.Now,
            CreatedDate = _dateTime.Now
        };
        _context.WalletTransactions.Add(transaction);

        // 5. Concurrency Protection & Capacity Allocation
        var currentRegistrationsCount = await _context.Registrations
            .CountAsync(r => r.EventId == request.EventId && !r.IsCancelled, cancellationToken);

        var currentWaitlistCount = await _context.Waitlists
            .CountAsync(w => w.EventId == request.EventId && !w.IsCancelled && !w.IsPromoted, cancellationToken);

        int remainingSlots = @event.MaxPlayers - currentRegistrationsCount;
        int waitlistPosition = currentWaitlistCount + 1;
        
        bool anyWaitlisted = false;
        int confirmedCount = 0;
        int waitlistedCount = 0;

        for (int i = 0; i < totalParticipants; i++)
        {
            string? guestName = i == 0 ? null : $"G_{player.FullName.Replace(" ", "")}_{i}";
            
            if (remainingSlots > 0)
            {
                // Register
                var registration = new Registration
                {
                    Id = Guid.NewGuid(),
                    EventId = request.EventId,
                    PlayerId = request.PlayerId,
                    GuestName = guestName,
                    RegistrationDate = _dateTime.Now,
                    ReservedFee = @event.ReservedFee,
                    CreatedDate = _dateTime.Now
                };
                _context.Registrations.Add(registration);
                remainingSlots--;
                confirmedCount++;
                
                var log = new ActivityLog
                {
                    Id = Guid.NewGuid(),
                    UserId = request.PlayerId,
                    EventId = request.EventId,
                    Action = "Player Registered",
                    Description = guestName == null ? $"Player {player.FullName} registered successfully." : $"Guest {guestName} registered successfully.",
                    Timestamp = _dateTime.Now,
                    CreatedDate = _dateTime.Now
                };
                _context.ActivityLogs.Add(log);
            }
            else
            {
                // Waitlist
                var waitlistEntry = new Waitlist
                {
                    Id = Guid.NewGuid(),
                    EventId = request.EventId,
                    PlayerId = request.PlayerId,
                    GuestName = guestName,
                    Position = waitlistPosition,
                    JoinedDate = _dateTime.Now,
                    CreatedDate = _dateTime.Now
                };
                _context.Waitlists.Add(waitlistEntry);
                
                var log = new ActivityLog
                {
                    Id = Guid.NewGuid(),
                    UserId = request.PlayerId,
                    EventId = request.EventId,
                    Action = "Player Waitlisted",
                    Description = guestName == null ? $"Player {player.FullName} joined waitlist at position {waitlistPosition}." : $"Guest {guestName} joined waitlist at position {waitlistPosition}.",
                    Timestamp = _dateTime.Now,
                    CreatedDate = _dateTime.Now
                };
                _context.ActivityLogs.Add(log);
                
                waitlistPosition++;
                waitlistedCount++;
                anyWaitlisted = true;
            }
        }

        // Update counts
        @event.RegisteredPlayersCount = currentRegistrationsCount + confirmedCount;
        if (@event.RegisteredPlayersCount >= @event.MaxPlayers)
        {
            @event.Status = EventStatus.Full;
        }
        @event.WaitlistedPlayersCount = waitlistPosition - 1;
        @event.ConcurrencyToken = Guid.NewGuid();

        await _context.SaveChangesAsync(cancellationToken);

        string finalStatus = "Registered";
        if (waitlistedCount == totalParticipants) finalStatus = "Waitlisted";
        else if (waitlistedCount > 0) finalStatus = "Partially Waitlisted";

        return new RegistrationResult
        {
            Status = finalStatus,
            WaitlistPosition = anyWaitlisted ? currentWaitlistCount + 1 : null
        };
    }
}
