using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Application.DTOs;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.Application.Features.Events.Queries.GetEvents;

public record GetEventsQuery : IRequest<List<EventDto>>
{
    public EventStatus? Status { get; init; }
    public PlayerCategory? Category { get; init; }
    public bool IncludePastEvents { get; init; } = false;
}

public class GetEventsQueryHandler : IRequestHandler<GetEventsQuery, List<EventDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IDateTime _dateTime;

    public GetEventsQueryHandler(IApplicationDbContext context, IMapper mapper, IDateTime dateTime)
    {
        _context = context;
        _mapper = mapper;
        _dateTime = dateTime;
    }

    public async Task<List<EventDto>> Handle(GetEventsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Events
            .Include(e => e.Organizer)
            .AsNoTracking();

        if (request.Status.HasValue)
        {
            query = query.Where(e => e.Status == request.Status.Value);
        }

        if (request.Category.HasValue)
        {
            query = query.Where(e => e.Category == request.Category.Value);
        }

        if (!request.IncludePastEvents)
        {
            var today = _dateTime.Now.Date;
            query = query.Where(e => e.EventDate >= today);
        }

        // Order by date and start time
        query = query.OrderBy(e => e.EventDate)
                     .ThenBy(e => e.StartTime);

        return await query
            .ProjectTo<EventDto>(_mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);
    }
}
