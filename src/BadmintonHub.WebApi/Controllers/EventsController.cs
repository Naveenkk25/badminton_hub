using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BadmintonHub.Application.DTOs;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Application.Features.Events.Commands.CreateEvent;
using BadmintonHub.Application.Features.Events.Commands.RegisterPlayer;
using BadmintonHub.Application.Features.Events.Commands.CancelRegistration;
using BadmintonHub.Application.Features.Events.Commands.SettleEvent;
using BadmintonHub.Application.Features.Events.Queries.GetEventDetails;
using BadmintonHub.Application.Features.Events.Queries.GetEvents;
using BadmintonHub.Domain.Entities;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.WebApi.Controllers;

[Authorize]
[Route("api/v1/[controller]")]
[ApiController]
public class EventsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public EventsController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<object>> GetEvents(
        [FromQuery] EventStatus? status, 
        [FromQuery] PlayerCategory? category,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        var query = _context.Events.Include(e => e.Organizer).AsQueryable();
        
        if (category.HasValue)
        {
            query = query.Where(e => e.Category == category.Value);
        }
        
        var events = await query.OrderBy(e => e.EventDate).ToListAsync();
        
        // Dynamically compute statuses
        foreach (var ev in events)
        {
            ev.Status = CalculateDynamicStatus(ev);
        }

        // Apply status filter after dynamic evaluation
        if (status.HasValue)
        {
            events = events.Where(e => e.Status == status.Value).ToList();
        }

        var totalCount = events.Count;
        var paginatedEvents = events.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        var result = paginatedEvents.Select(e => new
        {
            e.Id,
            e.OrganizerId,
            OrganizerName = e.Organizer?.Name ?? "Unknown",
            e.Name,
            e.Venue,
            e.EventDate,
            e.StartTime,
            e.EndTime,
            e.ReservedFee,
            e.Category,
            e.MaxPlayers,
            e.CutoffDateTime,
            e.Status,
            e.IsSettled,
            e.RegisteredPlayersCount,
            e.WaitlistedPlayersCount
        });

        return Ok(new { data = result, totalCount, page, pageSize });
    }

    private EventStatus CalculateDynamicStatus(Event ev)
    {
        if (ev.Status == EventStatus.Cancelled) return EventStatus.Cancelled;

        var now = DateTime.Now;
        var endDateTime = ev.EventDate.Date.Add(ev.EndTime);

        if (now > endDateTime)
        {
            return EventStatus.Completed;
        }

        if (now > ev.CutoffDateTime)
        {
            return EventStatus.Locked;
        }

        if (ev.RegisteredPlayersCount >= ev.MaxPlayers)
        {
            return EventStatus.Full;
        }

        return EventStatus.Open;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Event>> GetEventDetails(Guid id)
    {
        var ev = await _context.Events.FindAsync(id);
        if (ev == null) return NotFound();
        
        ev.Status = CalculateDynamicStatus(ev);
        return Ok(ev);
    }

    [HttpGet("{id}/details")]
    public async Task<IActionResult> GetEventDetailsComplete(Guid id, [FromServices] MediatR.IMediator mediator)
    {
        try
        {
            var result = await mediator.Send(new GetEventDetailsQuery(id));
            return Ok(result);
        }
        catch (Exception)
        {
            return NotFound(new { error = "Resource not found." });
        }
    }

    [Authorize(Roles = "SuperAdmin,Organizer")]
    [HttpPost]
    public async Task<ActionResult<Guid>> CreateEvent([FromBody] ApiCreateEventModel model)
    {
        // HIGH-007: Input validation
        if (string.IsNullOrWhiteSpace(model.Name))
            return BadRequest(new { error = "Event name is required." });
        if (string.IsNullOrWhiteSpace(model.Venue))
            return BadRequest(new { error = "Venue is required." });
        if (model.MaxPlayers <= 0)
            return BadRequest(new { error = "Max players must be greater than zero." });
        if (model.ReservedFee < 0)
            return BadRequest(new { error = "Event fee cannot be negative." });
        if (model.EventDate.Date < DateTime.UtcNow.Date)
            return BadRequest(new { error = "Event date cannot be in the past." });
        if (model.CutoffDateTime >= model.EventDate.Date.Add(model.StartTime))
            return BadRequest(new { error = "Cutoff must be before the event start time." });

        try
        {
            var organizer = await _context.Organizers.FindAsync(model.OrganizerId);
            if (organizer == null && model.OrganizerId == Guid.Empty)
            {
                organizer = await _context.Organizers.FirstOrDefaultAsync(o => o.Name == "Badminton Hub Admin");
                if (organizer == null)
                {
                    var adminUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString();
                    organizer = new Organizer 
                    { 
                        Id = Guid.NewGuid(), 
                        Name = "Badminton Hub Admin", 
                        ContactNumber = "0000000000", 
                        CreatedDate = DateTime.Now, 
                        CreatedBy = "System",
                        UserId = Guid.Parse(adminUserId)
                    };
                    _context.Organizers.Add(organizer);
                    await _context.SaveChangesAsync(default);
                }
                model.OrganizerId = organizer.Id;
            }
            if (organizer == null) return BadRequest(new { error = "Organizer not found." });

            var ev = new Event
            {
                Id = Guid.NewGuid(),
                OrganizerId = model.OrganizerId,
                Name = model.Name,
                Venue = model.Venue,
                EventDate = model.EventDate,
                StartTime = model.StartTime,
                EndTime = model.EndTime,
                ReservedFee = model.ReservedFee,
                Category = model.Category,
                MaxPlayers = model.MaxPlayers,
                CutoffDateTime = model.CutoffDateTime,
                Status = EventStatus.Open,
                CreatedBy = "API",
                CreatedDate = DateTime.Now
            };

            _context.Events.Add(ev);

            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var currentUserId = string.IsNullOrEmpty(userIdClaim) ? model.OrganizerId : Guid.Parse(userIdClaim);

            // Log event creation
            var log = new ActivityLog
            {
                Id = Guid.NewGuid(),
                UserId = currentUserId, // Use actual user ID from auth context
                Action = "Event Created",
                Description = $"Event {ev.Name} created at {ev.Venue} on {ev.EventDate.ToShortDateString()}.",
                Timestamp = DateTime.Now,
                CreatedDate = DateTime.Now
            };
            _context.ActivityLogs.Add(log);

            await _context.SaveChangesAsync(default);

            return CreatedAtAction(nameof(GetEventDetails), new { id = ev.Id }, ev.Id);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Roles = "SuperAdmin,Organizer")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEvent(Guid id, [FromBody] ApiUpdateEventModel model)
    {
        var ev = await _context.Events.FindAsync(id);
        if (ev == null) return NotFound();

        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        bool isSuperAdmin = User.IsInRole("SuperAdmin");
        var eventOrganizer = await _context.Organizers.FindAsync(ev.OrganizerId);
        if (!isSuperAdmin && !string.Equals(userIdString, eventOrganizer?.UserId.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, new { error = "You do not have permission to modify this event." });
        }

        if (CalculateDynamicStatus(ev) == EventStatus.Completed)
        {
            return BadRequest(new { error = "Cannot edit a completed event." });
        }

        var changes = new List<string>();
        if (ev.Name != model.Name) changes.Add("Name");
        if (ev.Venue != model.Venue) changes.Add("Venue");
        if (ev.EventDate != model.EventDate) changes.Add("Date");
        if (ev.StartTime != model.StartTime) changes.Add("StartTime");
        if (ev.EndTime != model.EndTime) changes.Add("EndTime");
        if (ev.ReservedFee != model.ReservedFee) changes.Add("Fee");
        if (ev.Category != model.Category) changes.Add("Category");
        if (ev.MaxPlayers != model.MaxPlayers) changes.Add("MaxPlayers");
        if (ev.CutoffDateTime != model.CutoffDateTime) changes.Add("Cutoff");

        ev.Name = model.Name;
        ev.Venue = model.Venue;
        ev.EventDate = model.EventDate;
        ev.StartTime = model.StartTime;
        ev.EndTime = model.EndTime;
        ev.ReservedFee = model.ReservedFee;
        ev.Category = model.Category;
        ev.MaxPlayers = model.MaxPlayers;
        ev.CutoffDateTime = model.CutoffDateTime;

        if (changes.Any())
        {
            var actionUserIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(actionUserIdStr, out Guid userId);
            
            var log = new ActivityLog
            {
                Id = Guid.NewGuid(),
                UserId = userId == Guid.Empty ? Guid.Parse("00000000-0000-0000-0000-000000000000") : userId,
                EventId = ev.Id,
                Action = "Event Updated",
                Description = $"Updated fields: {string.Join(", ", changes)}",
                Timestamp = DateTime.Now,
                CreatedDate = DateTime.Now
            };
            _context.ActivityLogs.Add(log);
        }

        await _context.SaveChangesAsync(default);
        return NoContent();
    }

    [HttpGet("{id}/history")]
    public async Task<IActionResult> GetEventHistory(Guid id)
    {
        var logs = await _context.ActivityLogs
            .Where(a => a.EventId == id)
            .OrderByDescending(a => a.Timestamp)
            .ToListAsync();
            
        var userIds = logs.Select(l => l.UserId).Distinct().ToList();
        var userNames = await _context.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        var result = logs.Select(l => new
        {
            l.Id,
            l.UserId,
            UserFullName = userNames.ContainsKey(l.UserId) ? userNames[l.UserId] : "System",
            l.Action,
            l.Description,
            l.Timestamp
        });

        return Ok(result);
    }

    [Authorize(Roles = "SuperAdmin,Organizer")]
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelEvent(Guid id)
    {
        var ev = await _context.Events
            .Include(e => e.Registrations)
            .Include(e => e.WaitlistEntries)
            .FirstOrDefaultAsync(e => e.Id == id);
        if (ev == null) return NotFound();

        var userIdStringAuth = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        bool isSuperAdmin = User.IsInRole("SuperAdmin");
        var eventOrganizer = await _context.Organizers.FindAsync(ev.OrganizerId);
        if (!isSuperAdmin && !string.Equals(userIdStringAuth, eventOrganizer?.UserId.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, new { error = "You do not have permission to cancel this event." });
        }

        ev.Status = EventStatus.Cancelled;

        // Refund registered players
        foreach (var reg in ev.Registrations.Where(r => !r.IsCancelled))
        {
            reg.IsCancelled = true;
            var player = await _context.Users.FindAsync(reg.PlayerId);
            if (player != null)
            {
                player.WalletBalance += reg.ReservedFee;
                var tx = new WalletTransaction
                {
                    Id = Guid.NewGuid(),
                    PlayerId = player.Id,
                    Amount = reg.ReservedFee,
                    Type = WalletTransactionType.Refund,
                    Description = $"Refund for cancelled event: {ev.Name}",
                    Timestamp = DateTime.Now,
                    CreatedDate = DateTime.Now
                };
                _context.WalletTransactions.Add(tx);
            }
        }



        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        Guid.TryParse(userIdString, out Guid userId);

        var log = new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = userId == Guid.Empty ? Guid.Parse("00000000-0000-0000-0000-000000000000") : userId,
            EventId = ev.Id,
            Action = "Event Cancelled",
            Description = $"Event {ev.Name} cancelled and players refunded.",
            Timestamp = DateTime.Now,
            CreatedDate = DateTime.Now
        };
        _context.ActivityLogs.Add(log);

        await _context.SaveChangesAsync(default);
        return Ok();
    }

    [Authorize(Roles = "SuperAdmin,Organizer")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEvent(Guid id)
    {
        var ev = await _context.Events
            .Include(e => e.Registrations)
            .Include(e => e.WaitlistEntries)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (ev == null)
        {
            return NotFound(new { error = "Event not found." });
        }

        // Rule 4: Authorization check (SuperAdmin or owner Organizer)
        var userIdStringAuth = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        bool isSuperAdmin = User.IsInRole("SuperAdmin");
        var eventOrganizer = await _context.Organizers.FindAsync(ev.OrganizerId);
        if (!isSuperAdmin && !string.Equals(userIdStringAuth, eventOrganizer?.UserId.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, new { error = "You do not have permission to delete this event." });
        }

        // Rule 3: Completed or past events should not be permanently deleted
        if (ev.Status == EventStatus.Completed || ev.EventDate.Date < DateTime.UtcNow.Date)
        {
            return BadRequest(new { error = "Completed or past events cannot be permanently deleted." });
        }

        // Rule 2: If the event has one or more registrations, do NOT delete
        if (ev.Registrations.Count > 0)
        {
            return BadRequest(new { error = "This event cannot be deleted because registrations exist. Please use Cancel Event instead." });
        }

        // Rule 1: Zero registrations -> allow permanent deletion
        if (ev.WaitlistEntries.Any())
        {
            _context.Waitlists.RemoveRange(ev.WaitlistEntries);
        }

        // Detach any ActivityLogs pointing to this event ID to maintain referential integrity
        var relatedLogs = await _context.ActivityLogs.Where(l => l.EventId == ev.Id).ToListAsync();
        foreach (var l in relatedLogs)
        {
            l.EventId = null;
        }

        // Rule 5: Add audit log entry
        var currentUserId = Guid.TryParse(userIdStringAuth, out var uId) ? uId : Guid.Empty;
        var currentUserName = User.Identity?.Name ?? "Admin";

        var auditLog = new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            Action = "Event Deleted",
            Description = $"Event '{ev.Name}' scheduled for {ev.EventDate:yyyy-MM-dd} was permanently deleted by {currentUserName}.",
            Timestamp = DateTime.Now,
            CreatedDate = DateTime.Now
        };
        _context.ActivityLogs.Add(auditLog);

        _context.Events.Remove(ev);
        await _context.SaveChangesAsync(default);

        return Ok(new { message = "Event permanently deleted successfully." });
    }

    [Authorize(Roles = "SuperAdmin,Organizer")]
    [HttpPost("{id}/close")]
    public async Task<IActionResult> CloseRegistration(Guid id)
    {
        var ev = await _context.Events.FindAsync(id);
        if (ev == null) return NotFound();

        var userIdStringAuth = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        bool isSuperAdmin = User.IsInRole("SuperAdmin");
        var eventOrganizer = await _context.Organizers.FindAsync(ev.OrganizerId);
        if (!isSuperAdmin && !string.Equals(userIdStringAuth, eventOrganizer?.UserId.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, new { error = "You do not have permission to close this event." });
        }

        ev.Status = EventStatus.Locked;
        
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        Guid.TryParse(userIdString, out Guid userId);
        
        var log = new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = userId == Guid.Empty ? Guid.Parse("00000000-0000-0000-0000-000000000000") : userId,
            EventId = ev.Id,
            Action = "Event Closed",
            Description = $"Registration closed for event {ev.Name}.",
            Timestamp = DateTime.Now,
            CreatedDate = DateTime.Now
        };
        _context.ActivityLogs.Add(log);

        await _context.SaveChangesAsync(default);
        return Ok();
    }

    [Authorize(Roles = "SuperAdmin,Organizer")]
    [HttpPost("{id}/settle")]
    public async Task<IActionResult> SettleEvent(Guid id, [FromBody] List<RegistrationSettlementDto> settlements, [FromServices] MediatR.IMediator mediator)
    {
        try
        {
            var userIdStr = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            {
                return Unauthorized();
            }

            var userRoleStr = User.FindFirstValue(System.Security.Claims.ClaimTypes.Role);
            bool isAdmin = userRoleStr == UserRole.SuperAdmin.ToString();

            var command = new SettleEventCommand 
            { 
                EventId = id, 
                ActionerId = userId,
                IsAdmin = isAdmin,
                Settlements = settlements 
            };
            
            await mediator.Send(command);
            return Ok();
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    public class RegisterPlayerRequestDto
    {
        public int GuestCount { get; set; } = 0;
    }

    [HttpPost("{id}/register")]
    public async Task<IActionResult> RegisterPlayer(Guid id, [FromBody] RegisterPlayerRequestDto? dto, [FromServices] MediatR.IMediator mediator)
    {
        var userIdStr = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var playerId))
        {
            return Unauthorized();
        }

        try
        {
            var command = new RegisterPlayerCommand { EventId = id, PlayerId = playerId, GuestCount = dto?.GuestCount ?? 0 };
            var result = await mediator.Send(command);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{id}/players")]
    public async Task<ActionResult<IEnumerable<object>>> GetEventPlayers(Guid id)
    {
        var registrations = await _context.Registrations
            .Include(r => r.Player)
            .Where(r => r.EventId == id && !r.IsCancelled)
            .Select(r => new {
                registrationId = r.Id,
                playerId = r.PlayerId,
                playerName = !string.IsNullOrEmpty(r.GuestName) ? r.GuestName : (r.Player != null ? r.Player.FullName : "Unknown"),
                isWaitlisted = false,
                isCancelled = r.IsCancelled,
                registrationDate = r.RegistrationDate
            })
            .ToListAsync();

        var waitlist = await _context.Waitlists
            .Include(w => w.Player)
            .Where(w => w.EventId == id && !w.IsCancelled && !w.IsPromoted)
            .Select(w => new {
                registrationId = w.Id,
                playerId = w.PlayerId,
                playerName = w.Player != null ? w.Player.FullName : "Unknown",
                isWaitlisted = true,
                isCancelled = w.IsCancelled,
                registrationDate = w.JoinedDate
            })
            .ToListAsync();

        return Ok(registrations.Concat(waitlist).OrderBy(x => x.registrationDate));
    }

    [HttpPost("{id}/cancel-slot")]
    public async Task<IActionResult> CancelPlayerSlot(Guid id, [FromServices] MediatR.IMediator mediator)
    {
        var userIdStr = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var playerId))
        {
            return Unauthorized();
        }

        try
        {
            var command = new CancelRegistrationCommand(id, playerId);
            var result = await mediator.Send(command);
            return Ok(new { success = result.Success, message = result.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("player/{id}/registrations-status")]
    public async Task<ActionResult<IEnumerable<object>>> GetPlayerRegistrationsStatus(Guid id)
    {
        var activeRegs = await _context.Registrations
            .Where(r => r.PlayerId == id && !r.IsCancelled)
            .Select(r => new { eventId = r.EventId, status = "registered", position = 0 })
            .ToListAsync();

        var activeWaitlist = await _context.Waitlists
            .Where(w => w.PlayerId == id && !w.IsCancelled && !w.IsPromoted)
            .Select(w => new { eventId = w.EventId, status = "waitlisted", position = w.Position })
            .ToListAsync();

        return Ok(activeRegs.Concat(activeWaitlist));
    }

    [HttpGet("history/player/{id}")]
    public async Task<ActionResult<IEnumerable<object>>> GetPlayerEventHistory(Guid id)
    {
        var history = await _context.Registrations
            .Include(r => r.Event)
            .Where(r => r.PlayerId == id && !r.IsCancelled)
            .OrderByDescending(r => r.Event.EventDate)
            .Select(r => new
            {
                r.Event.Id,
                r.Event.Name,
                r.Event.Category,
                r.Event.EventDate,
                r.Event.StartTime,
                r.Event.EndTime,
                r.Event.Status,
                r.Event.IsSettled,
                r.ReservedFee,
                r.ActualFee,
                r.RefundAmount,
                BookingStatus = "Confirmed"
            })
            .ToListAsync();

        // Filter to only include completed events or past events based on time
        var completedHistory = history
            .Where(h => {
                var endDateTime = h.EventDate.Date.Add(h.EndTime);
                return DateTime.Now > endDateTime || h.Status == EventStatus.Completed;
            })
            .Take(30)
            .ToList();

        return Ok(completedHistory);
    }
}

public class ApiCreateEventModel
{
    public Guid OrganizerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Venue { get; set; } = string.Empty;
    public DateTime EventDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public decimal ReservedFee { get; set; }
    public PlayerCategory Category { get; set; }
    public int MaxPlayers { get; set; }
    public DateTime CutoffDateTime { get; set; }
}

public class ApiUpdateEventModel
{
    public string Name { get; set; } = string.Empty;
    public string Venue { get; set; } = string.Empty;
    public DateTime EventDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public decimal ReservedFee { get; set; }
    public PlayerCategory Category { get; set; }
    public int MaxPlayers { get; set; }
    public DateTime CutoffDateTime { get; set; }
}

