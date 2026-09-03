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

[Authorize(Roles = "SuperAdmin")]
[Route("api/v1/[controller]")]
[ApiController]
public class ActivityLogsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public ActivityLogsController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<object>> GetActivityLogs([FromQuery] int page = 1, [FromQuery] int pageSize = 25)
    {
        var query = _context.ActivityLogs.Include(a => a.User);
        var totalCount = await query.CountAsync();

        var logs = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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
        
        return Ok(new { data = logs, totalCount, page, pageSize });
    }

    [HttpGet("player/{id}")]
    public async Task<ActionResult<object>> GetPlayerActivityLogs(Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 25)
    {
        var query = _context.ActivityLogs.Include(a => a.User).Where(a => a.UserId == id);
        var totalCount = await query.CountAsync();

        var logs = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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
            
        return Ok(new { data = logs, totalCount, page, pageSize });
    }
}
