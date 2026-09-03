using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Domain.Entities;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.Application.Features.Events.Commands.CreateEvent;

public record CreateEventCommand : IRequest<Guid>
{
    public Guid OrganizerId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Venue { get; init; } = string.Empty;
    public DateTime EventDate { get; init; }
    public TimeSpan StartTime { get; init; }
    public TimeSpan EndTime { get; init; }
    public decimal ReservedFee { get; init; }
    public PlayerCategory Category { get; init; }
    public int MaxPlayers { get; init; }
    public DateTime CutoffDateTime { get; init; }
}

public class CreateEventCommandHandler : IRequestHandler<CreateEventCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTime _dateTime;

    public CreateEventCommandHandler(IApplicationDbContext context, IDateTime dateTime)
    {
        _context = context;
        _dateTime = dateTime;
    }

    public async Task<Guid> Handle(CreateEventCommand request, CancellationToken cancellationToken)
    {
        // 1. Validate Organizer
        var organizer = await _context.Organizers
            .FirstOrDefaultAsync(o => o.Id == request.OrganizerId, cancellationToken);

        if (organizer == null)
        {
            throw new Exception("Organizer not found.");
        }



        // 3. Validate CutoffDateTime
        var eventStartDateTime = request.EventDate.Date.Add(request.StartTime);
        if (request.CutoffDateTime >= eventStartDateTime)
        {
            throw new Exception("Cutoff date and time must be earlier than the event start date and time.");
        }

        // Use database transaction to deduct credit and create event atomically
        var newEvent = new Event
        {
            Id = Guid.NewGuid(),
            OrganizerId = request.OrganizerId,
            Name = request.Name,
            Venue = request.Venue,
            EventDate = request.EventDate,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            ReservedFee = request.ReservedFee,
            Category = request.Category,
            MaxPlayers = request.MaxPlayers,
            CutoffDateTime = request.CutoffDateTime,
            Status = EventStatus.Open,
            RegisteredPlayersCount = 0,
            WaitlistedPlayersCount = 0,
            CreatedDate = _dateTime.Now
        };

        _context.Events.Add(newEvent);

        await _context.SaveChangesAsync(cancellationToken);

        return newEvent.Id;
    }
}
