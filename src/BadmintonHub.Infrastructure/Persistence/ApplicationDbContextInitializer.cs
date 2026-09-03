using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
using BadmintonHub.Domain.Entities;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.Infrastructure.Persistence;

public class ApplicationDbContextInitializer
{
    private readonly ILogger<ApplicationDbContextInitializer> _logger;
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole<Guid>> _roleManager;

    public ApplicationDbContextInitializer(
        ILogger<ApplicationDbContextInitializer> logger,
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole<Guid>> roleManager)
    {
        _logger = logger;
        _context = context;
        _userManager = userManager;
        _roleManager = roleManager;
    }

    public async Task InitialiseAsync()
    {
        try
        {
            if (_context.Database.IsNpgsql())
            {
                var databaseCreator = (Microsoft.EntityFrameworkCore.Storage.RelationalDatabaseCreator)_context.Database.GetService<Microsoft.EntityFrameworkCore.Storage.IDatabaseCreator>();
                try
                {
                    await databaseCreator.CreateTablesAsync();
                }
                catch (Npgsql.PostgresException ex) when (ex.SqlState == "42P07")
                {
                    _logger.LogInformation("PostgreSQL tables already exist.");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[CREATE-TABLES-ERR] {ex.GetType().Name}: {ex.Message}");
                    if (ex.InnerException != null) Console.WriteLine($"[INNER] {ex.InnerException.Message}");
                    _logger.LogError(ex, "CreateTablesAsync failed.");
                    throw;
                }
            }
            else if (_context.Database.IsSqlite())
            {
                await _context.Database.MigrateAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while initialising the database.");
            throw;
        }
    }

    public async Task SeedAsync()
    {
        try
        {
            await TrySeedAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while seeding the database.");
            throw;
        }
    }

    private async Task TrySeedAsync()
    {
        // Default roles
        var roles = new[] { UserRole.SuperAdmin.ToString(), UserRole.Organizer.ToString(), UserRole.Player.ToString() };

        foreach (var roleName in roles)
        {
            if (await _roleManager.FindByNameAsync(roleName) == null)
            {
                await _roleManager.CreateAsync(new IdentityRole<Guid>(roleName));
            }
        }

        // SuperAdmin with mobile 701098996 and 7010989996
        var adminMobiles = new[] { "7010989996", "701098996", "1234567890" };
        foreach (var mobile in adminMobiles)
        {
            var admin = await _userManager.FindByNameAsync(mobile);
            if (admin == null)
            {
                admin = new ApplicationUser
                {
                    Id = Guid.NewGuid(),
                    UserName = mobile,
                    PhoneNumber = mobile,
                    FullName = "Super Admin",
                    Role = UserRole.SuperAdmin,
                    Status = UserStatus.Active,
                    CreatedBy = "System",
                    CreatedDate = DateTime.Now
                };
                var result = await _userManager.CreateAsync(admin, "Preety10");
                if (result.Succeeded)
                {
                    await _userManager.AddToRoleAsync(admin, UserRole.SuperAdmin.ToString());
                }
            }
            else
            {
                var token = await _userManager.GeneratePasswordResetTokenAsync(admin);
                await _userManager.ResetPasswordAsync(admin, token, "Preety10");
            }
        }
    }
}
