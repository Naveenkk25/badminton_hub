using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Application.DTOs;

namespace BadmintonHub.Application.Features.Events.Queries.GetEventDetails;

public record GetEventDetailsQuery(Guid Id) : IRequest<EventDetailsVm>;

public class EventDetailsVm
{
    public EventDto Event { get; set; } = null!;
    public List<RegistrationDto> Registrations { get; set; } = new();
    public List<WaitlistDto> Waitlist { get; set; } = new();
    public List<ActivityLogDto> ActivityLogs { get; set; } = new();
    public int TotalRegisteredMembers { get; set; }
    public int TotalGuestPlayers { get; set; }
}

public class GetEventDetailsQueryHandler : IRequestHandler<GetEventDetailsQuery, EventDetailsVm>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetEventDetailsQueryHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<EventDetailsVm> Handle(GetEventDetailsQuery request, CancellationToken cancellationToken)
    {
        var @event = await _context.Events
            .Include(e => e.Organizer)
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == request.Id, cancellationToken);

        if (@event == null)
        {
            throw new Exception("Event not found.");
        }

        var registrations = await _context.Registrations
            .Include(r => r.Player)
            .Where(r => r.EventId == request.Id && !r.IsCancelled)
            .OrderBy(r => r.RegistrationDate)
            .ToListAsync(cancellationToken);

        var waitlist = await _context.Waitlists
            .Include(w => w.Player)
            .Where(w => w.EventId == request.Id && !w.IsCancelled && !w.IsPromoted)
            .OrderBy(w => w.Position)
            .ToListAsync(cancellationToken);

        var activityLogs = await _context.ActivityLogs
            .Include(a => a.User)
            .Where(a => a.EventId == request.Id)
            .OrderByDescending(a => a.Timestamp)
            .ToListAsync(cancellationToken);

        return new EventDetailsVm
        {
            Event = _mapper.Map<EventDto>(@event),
            Registrations = _mapper.Map<List<RegistrationDto>>(registrations),
            Waitlist = _mapper.Map<List<WaitlistDto>>(waitlist),
            ActivityLogs = _mapper.Map<List<ActivityLogDto>>(activityLogs),
            TotalRegisteredMembers = registrations.Count(r => string.IsNullOrEmpty(r.GuestName)),
            TotalGuestPlayers = registrations.Count(r => !string.IsNullOrEmpty(r.GuestName))
        };
    }
}
