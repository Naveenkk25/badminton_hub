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
public class AuditLogsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public AuditLogsController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<object>> GetAuditLogs([FromQuery] int page = 1, [FromQuery] int pageSize = 25)
    {
        var query = _context.AuditLogs.Include(a => a.User);
        var totalCount = await query.CountAsync();

        var logs = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new
            {
                a.Id,
                a.EntityName,
                a.EntityId,
                a.Action,
                a.OldValues,
                a.NewValues,
                a.UserId,
                UserFullName = a.User != null ? a.User.FullName : "System",
                a.Timestamp,
                a.IpAddress
            })
            .ToListAsync();
            
        return Ok(new { data = logs, totalCount, page, pageSize });
    }
}
