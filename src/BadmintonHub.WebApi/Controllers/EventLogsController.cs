using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Domain.Entities;

namespace BadmintonHub.WebApi.Controllers;

[Authorize(Roles = "SuperAdmin,Organizer")]
[Route("api/v1/[controller]")]
[ApiController]
public class EventLogsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public EventLogsController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetEventLogs()
    {
        // Fetch logs that relate specifically to Events registrations/creations/cancellations, wallet transactions, credit usage
        var logs = await _context.ActivityLogs
            .Include(a => a.User)
            .Where(a => a.Action.Contains("Event") || a.Action.Contains("Registration") || a.Action.Contains("Waitlist") || 
                        a.Action.Contains("Booked") || a.Action.Contains("Wallet") || a.Action.Contains("Credit") ||
                        a.Description.Contains("event") || a.Description.Contains("Event") || a.Description.Contains("credit") || 
                        a.Description.Contains("Credit") || a.Description.Contains("wallet") || a.Description.Contains("Wallet"))
            .OrderByDescending(a => a.Timestamp)
            .Select(a => new
            {
                a.Id,
                a.UserId,
                UserFullName = a.User != null ? a.User.FullName : "System",
                a.Action,
                a.Description,
                a.Timestamp,
                a.IpAddress,
                a.DeviceInformation
            })
            .ToListAsync();
        return Ok(logs);
    }
}
