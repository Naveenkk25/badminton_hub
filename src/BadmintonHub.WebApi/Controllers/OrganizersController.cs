using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Domain.Entities;
using BadmintonHub.Domain.Enums;
using BadmintonHub.Application.Features.Players.Commands.CreatePlayer;

namespace BadmintonHub.WebApi.Controllers;

[Authorize]
[Route("api/v1/[controller]")]
[ApiController]
public class OrganizersController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public OrganizersController(IApplicationDbContext context, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<ActionResult<object>> GetOrganizers([FromQuery] int page = 1, [FromQuery] int pageSize = 25)
    {
        var query = _context.Organizers;
        var totalCount = await query.CountAsync();

        var orgs = await query
            .OrderBy(o => o.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
            
        var result = new List<object>();
        foreach (var org in orgs)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Role == UserRole.Organizer && u.PhoneNumber == org.ContactNumber);
            result.Add(new
            {
                org = org,
                user = user
            });
        }
        return Ok(new { data = result, totalCount, page, pageSize });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetOrganizer(Guid id)
    {
        var org = await _context.Organizers.FindAsync(id);
        if (org == null) return NotFound();

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Role == UserRole.Organizer && u.PhoneNumber == org.ContactNumber);

        return Ok(new
        {
            org = org,
            user = user
        });
    }

    [HttpPost]
    public async Task<ActionResult<object>> CreateOrganizer([FromBody] CreateOrganizerModel model)
    {
        if (string.IsNullOrWhiteSpace(model.Name) || string.IsNullOrWhiteSpace(model.ContactNumber))
        {
            return BadRequest(new { error = "Name and Contact Number are required." });
        }

        var existingUser = await _userManager.FindByNameAsync(model.ContactNumber);
        if (existingUser != null)
        {
            return BadRequest(new { error = "An account with this mobile number already exists." });
        }

        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "System";

        var userId = Guid.NewGuid();
        var org = new Organizer
        {
            Id = Guid.NewGuid(),
            Name = model.Name,
            ContactNumber = model.ContactNumber,
            UserId = userId,
            CreatedDate = DateTime.UtcNow,
            CreatedBy = currentUserId
        };
        _context.Organizers.Add(org);

        var tempPassword = $"Org{Guid.NewGuid().ToString("N")[..8]}!A1";
        var user = new ApplicationUser
        {
            Id = userId,
            UserName = org.ContactNumber,
            PhoneNumber = org.ContactNumber,
            FullName = org.Name,
            Role = UserRole.Organizer,
            Status = UserStatus.PendingActivation,
            WalletBalance = 0.00m,
            CreatedBy = "API",
            CreatedDate = DateTime.Now
        };

        var createResult = await _userManager.CreateAsync(user, tempPassword);
        if (!createResult.Succeeded)
        {
            var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
            return BadRequest(new { error = $"Failed to create login account: {errors}" });
        }

        await _userManager.AddToRoleAsync(user, UserRole.Organizer.ToString());

        await _context.SaveChangesAsync(default);

        return Ok(new
        {
            organizerId = org.Id,
            mobileNumber = org.ContactNumber,
            temporaryPassword = tempPassword
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateOrganizer(Guid id, [FromBody] UpdateOrganizerModel model)
    {
        var org = await _context.Organizers.FindAsync(id);
        if (org == null) return NotFound();

        var oldContact = org.ContactNumber;
        org.Name = model.Name;
        org.ContactNumber = model.ContactNumber;

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Role == UserRole.Organizer && u.PhoneNumber == oldContact);
        if (user != null)
        {
            user.FullName = model.Name;
            user.PhoneNumber = model.ContactNumber;
            user.UserName = model.ContactNumber;
            await _userManager.UpdateAsync(user);
        }

        await _context.SaveChangesAsync(default);
        return NoContent();
    }

    [Authorize(Roles = "SuperAdmin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteOrganizer(Guid id)
    {
        var org = await _context.Organizers.FindAsync(id);
        if (org == null) return NotFound();

        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "System";

        // Soft delete the organizer
        org.IsDeleted = true;
        org.DeletedDate = DateTime.UtcNow;
        org.DeletedBy = currentUserId;

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Role == UserRole.Organizer && u.PhoneNumber == org.ContactNumber);
        if (user != null)
        {
            user.IsDeleted = true;
            user.DeletedDate = DateTime.UtcNow;
            user.DeletedBy = currentUserId;
            await _userManager.UpdateAsync(user);
        }

        await _context.SaveChangesAsync(default);
        return NoContent();
    }



    [HttpPost("{id}/suspend")]
    public async Task<IActionResult> SuspendOrganizer(Guid id)
    {
        var org = await _context.Organizers.FindAsync(id);
        if (org == null) return NotFound();

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Role == UserRole.Organizer && u.PhoneNumber == org.ContactNumber);
        if (user != null)
        {
            user.Status = UserStatus.Suspended;
            await _userManager.UpdateAsync(user);

            var log = new ActivityLog
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Action = "Organizer Suspended",
                Description = $"Organizer {user.FullName} suspended via API.",
                Timestamp = DateTime.Now,
                CreatedDate = DateTime.Now
            };
            _context.ActivityLogs.Add(log);
            await _context.SaveChangesAsync(default);
        }

        return Ok();
    }

    [HttpPost("{id}/activate")]
    public async Task<IActionResult> ActivateOrganizer(Guid id)
    {
        var org = await _context.Organizers.FindAsync(id);
        if (org == null) return NotFound();

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Role == UserRole.Organizer && u.PhoneNumber == org.ContactNumber);
        if (user != null)
        {
            user.Status = UserStatus.Active;
            await _userManager.UpdateAsync(user);

            var log = new ActivityLog
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Action = "Organizer Activated",
                Description = $"Organizer {user.FullName} activated via API.",
                Timestamp = DateTime.Now,
                CreatedDate = DateTime.Now
            };
            _context.ActivityLogs.Add(log);
            await _context.SaveChangesAsync(default);
        }

        return Ok();
    }

    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id)
    {
        var org = await _context.Organizers.FindAsync(id);
        if (org == null) return NotFound();

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Role == UserRole.Organizer && u.PhoneNumber == org.ContactNumber);
        if (user == null) return NotFound();

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var tempPassword = $"OrgR{Guid.NewGuid().ToString("N")[..8]}!A1";
        var result = await _userManager.ResetPasswordAsync(user, token, tempPassword);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            return BadRequest(new { error = $"Reset failed: {errors}" });
        }

        user.Status = UserStatus.PendingActivation;
        await _userManager.UpdateAsync(user);

        var log = new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Action = "Password Reset",
            Description = $"Organizer {user.FullName} password was reset by an administrator.",
            Timestamp = DateTime.UtcNow,
            CreatedDate = DateTime.UtcNow
        };
        _context.ActivityLogs.Add(log);
        await _context.SaveChangesAsync(default);

        return Ok(new { temporaryPassword = tempPassword });
    }
}

public class CreateOrganizerModel
{
    public string Name { get; set; } = string.Empty;
    public string ContactNumber { get; set; } = string.Empty;
    public int InitialCredits { get; set; } = 5;
}

public class UpdateOrganizerModel
{
    public string Name { get; set; } = string.Empty;
    public string ContactNumber { get; set; } = string.Empty;
}
