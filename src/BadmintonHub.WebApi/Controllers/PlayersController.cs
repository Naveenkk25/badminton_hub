using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BadmintonHub.Application.DTOs;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Application.Features.Players.Commands.CreatePlayer;
using BadmintonHub.Application.Features.Players.Commands.UpdatePlayerCategory;
using BadmintonHub.Application.Features.Wallet.Commands.CreditWallet;
using BadmintonHub.Application.Features.Wallet.Queries.GetWalletHistory;
using BadmintonHub.Domain.Entities;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.WebApi.Controllers;

[Authorize]
[Route("api/v1/[controller]")]
[ApiController]
public class PlayersController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public PlayersController(IApplicationDbContext context, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<ActionResult<object>> GetPlayers([FromQuery] int page = 1, [FromQuery] int pageSize = 25)
    {
        var query = _context.Users.Where(u => u.Role == UserRole.Player);
        var totalCount = await query.CountAsync();

        var players = await query
            .OrderBy(u => u.FullName)
            .Select(u => new UserDto
            {
                Id = u.Id,
                UserName = u.UserName ?? string.Empty,
                PhoneNumber = u.PhoneNumber ?? string.Empty,
                FullName = u.FullName,
                Email = u.Email ?? string.Empty,
                Role = u.Role,
                Status = u.Status,
                Category = u.Category,
                WalletBalance = u.WalletBalance,
                CreatedDate = u.CreatedDate
            })
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
            
        return Ok(new { data = players, totalCount, page, pageSize });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> GetPlayer(Guid id)
    {
        var player = await _context.Users
            .Where(u => u.Id == id && u.Role == UserRole.Player)
            .Select(u => new UserDto
            {
                Id = u.Id,
                UserName = u.UserName ?? string.Empty,
                PhoneNumber = u.PhoneNumber ?? string.Empty,
                FullName = u.FullName,
                Email = u.Email ?? string.Empty,
                Role = u.Role,
                Status = u.Status,
                Category = u.Category,
                WalletBalance = u.WalletBalance,
                CreatedDate = u.CreatedDate
            })
            .FirstOrDefaultAsync();
        if (player == null) return NotFound();
        return Ok(player);
    }

    [HttpPost]
    public async Task<ActionResult<object>> CreatePlayer([FromBody] ApiCreatePlayerModel model)
    {
        if (string.IsNullOrWhiteSpace(model.FullName) || string.IsNullOrWhiteSpace(model.MobileNumber))
        {
            return BadRequest(new { error = "FullName and MobileNumber are required." });
        }

        var existingUser = await _userManager.FindByNameAsync(model.MobileNumber);
        if (existingUser != null)
        {
            return BadRequest(new { error = "A user with this mobile number already exists." });
        }

        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "System";

        var player = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = model.MobileNumber,
            PhoneNumber = model.MobileNumber,
            FullName = model.FullName,
            Email = model.Email,
            Role = UserRole.Player,
            Status = UserStatus.PendingActivation,
            Category = model.Category,
            WalletBalance = 0.00m,
            CreatedBy = currentUserId,
            CreatedDate = DateTime.UtcNow
        };

        var tempPassword = $"Player{Guid.NewGuid().ToString("N")[..8]}!A1";
        var result = await _userManager.CreateAsync(player, tempPassword);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            return BadRequest(new { error = $"Failed to create player: {errors}" });
        }

        await _userManager.AddToRoleAsync(player, UserRole.Player.ToString());

        var log = new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = player.Id,
            Action = "User Created",
            Description = $"Player {player.FullName} onboarded successfully via API.",
            Timestamp = DateTime.UtcNow,
            CreatedDate = DateTime.UtcNow
        };
        _context.ActivityLogs.Add(log);
        await _context.SaveChangesAsync(default);

        return Ok(new
        {
            playerId = player.Id,
            mobileNumber = player.PhoneNumber,
            temporaryPassword = tempPassword
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePlayer(Guid id, [FromBody] ApiUpdatePlayerModel model)
    {
        var player = await _context.Users.FindAsync(id);
        if (player == null || player.Role != UserRole.Player) return NotFound();

        player.FullName = model.FullName;
        player.PhoneNumber = model.MobileNumber;
        player.UserName = model.MobileNumber;
        player.Email = model.Email;
        player.Category = model.Category;

        var result = await _userManager.UpdateAsync(player);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            return BadRequest(new { error = errors });
        }

        await _context.SaveChangesAsync(default);
        return NoContent();
    }

    [Authorize(Roles = "SuperAdmin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePlayer(Guid id)
    {
        var player = await _context.Users.FindAsync(id);
        if (player == null || player.Role != UserRole.Player) return NotFound();

        // Soft delete only — preserve referential integrity for registrations and transactions
        player.IsDeleted = true;
        player.DeletedDate = DateTime.Now;
        player.DeletedBy = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "System";
        var result = await _userManager.UpdateAsync(player);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            return BadRequest(new { error = errors });
        }

        return NoContent();
    }

    [Authorize(Roles = "SuperAdmin,Organizer")]
    [HttpPost("{id}/suspend")]
    public async Task<IActionResult> SuspendPlayer(Guid id)
    {
        var player = await _context.Users.FindAsync(id);
        if (player == null || player.Role != UserRole.Player) return NotFound();

        player.Status = UserStatus.Suspended;
        await _userManager.UpdateAsync(player);

        var log = new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = player.Id,
            Action = "Account Suspended",
            Description = $"Player {player.FullName} was suspended by an admin.",
            Timestamp = DateTime.Now,
            CreatedDate = DateTime.Now
        };
        _context.ActivityLogs.Add(log);
        await _context.SaveChangesAsync(default);

        return Ok(new { success = true });
    }

    [Authorize(Roles = "SuperAdmin,Organizer")]
    [HttpPost("{id}/activate-admin")]
    public async Task<IActionResult> ActivatePlayerAdmin(Guid id)
    {
        var player = await _context.Users.FindAsync(id);
        if (player == null || player.Role != UserRole.Player) return NotFound();

        player.Status = UserStatus.Active;
        await _userManager.UpdateAsync(player);

        var log = new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = player.Id,
            Action = "Account Activated",
            Description = $"Player {player.FullName} was activated by an admin.",
            Timestamp = DateTime.Now,
            CreatedDate = DateTime.Now
        };
        _context.ActivityLogs.Add(log);
        await _context.SaveChangesAsync(default);

        return Ok(new { success = true });
    }


    [Authorize(Roles = "SuperAdmin,Organizer")]
    [HttpPut("{id}/category")]
    public async Task<ActionResult<bool>> UpdateCategory(Guid id, [FromBody] UpdateCategoryModel model)
    {
        var player = await _context.Users.FindAsync(id);
        if (player == null || player.Role != UserRole.Player) return NotFound();

        player.Category = model.NewCategory;
        await _userManager.UpdateAsync(player);

        await _context.SaveChangesAsync(default);
        return Ok(true);
    }

    [HttpGet("{id}/wallet")]
    public async Task<ActionResult<IEnumerable<object>>> GetWalletHistory(Guid id)
    {
        var txs = await _context.WalletTransactions
            .Where(w => w.PlayerId == id)
            .OrderByDescending(w => w.Timestamp)
            .ToListAsync();

        var createdByIds = txs.Select(t => t.CreatedBy).Distinct().ToList();
        var validGuids = createdByIds.Where(c => Guid.TryParse(c, out _)).Select(Guid.Parse).ToList();
        
        var userNames = await _context.Users
            .Where(u => validGuids.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id.ToString(), u => u.FullName);

        var result = txs.Select(w => new
        {
            w.Id,
            w.Amount,
            w.Type,
            w.Description,
            w.Timestamp,
            CreatedByName = w.CreatedBy != null && userNames.ContainsKey(w.CreatedBy) ? userNames[w.CreatedBy] : "System"
        });

        return Ok(result);
    }

    [Authorize(Roles = "SuperAdmin,Organizer")]
    [HttpPost("{id}/wallet/credit")]
    public async Task<ActionResult<decimal>> CreditWallet(Guid id, [FromBody] CreditWalletModel model)
    {
        if (model.Amount <= 0) return BadRequest(new { error = "Amount must be a positive value." });

        using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        try
        {
            var player = await _context.Users.FindAsync(id);
            if (player == null || player.Role != UserRole.Player) return NotFound();

            var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "System";

            var tx = new WalletTransaction
            {
                Id = Guid.NewGuid(),
                PlayerId = player.Id,
                Amount = model.Amount,
                Type = WalletTransactionType.Credit,
                Description = model.Description,
                Timestamp = DateTime.UtcNow,
                CreatedBy = currentUserId,
                CreatedDate = DateTime.UtcNow
            };
            player.WalletBalance += model.Amount;

            _context.WalletTransactions.Add(tx);
            await _context.SaveChangesAsync(default);
            await transaction.CommitAsync();

            return Ok(new { newBalance = player.WalletBalance });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Roles = "SuperAdmin,Organizer")]
    [HttpPost("{id}/wallet/debit")]
    public async Task<ActionResult<decimal>> DebitWallet(Guid id, [FromBody] CreditWalletModel model)
    {
        if (model.Amount <= 0) return BadRequest(new { error = "Amount must be a positive value." });

        using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        try
        {
            var player = await _context.Users.FindAsync(id);
            if (player == null || player.Role != UserRole.Player) return NotFound();

            if (player.WalletBalance < model.Amount) return BadRequest(new { error = "Insufficient funds." });

            var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "System";

            var tx = new WalletTransaction
            {
                Id = Guid.NewGuid(),
                PlayerId = player.Id,
                Amount = model.Amount,
                Type = WalletTransactionType.Debit,
                Description = model.Description,
                Timestamp = DateTime.UtcNow,
                CreatedBy = currentUserId,
                CreatedDate = DateTime.UtcNow
            };
            player.WalletBalance -= model.Amount;

            _context.WalletTransactions.Add(tx);
            await _context.SaveChangesAsync(default);
            await transaction.CommitAsync();

            return Ok(new { newBalance = player.WalletBalance });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return BadRequest(new { error = ex.Message });
        }
    }
}

public class ApiCreatePlayerModel
{
    public string FullName { get; set; } = string.Empty;
    public string MobileNumber { get; set; } = string.Empty;
    public string? Email { get; set; }
    public PlayerCategory Category { get; set; } = PlayerCategory.Intermediate;
}

public class ApiUpdatePlayerModel
{
    public string FullName { get; set; } = string.Empty;
    public string MobileNumber { get; set; } = string.Empty;
    public string? Email { get; set; }
    public PlayerCategory Category { get; set; }
}

public class UpdateCategoryModel
{
    public PlayerCategory NewCategory { get; set; }
}

public class CreditWalletModel
{
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
}
