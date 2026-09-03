using System;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Hangfire;
using Hangfire.Storage.SQLite;
using Hangfire.MemoryStorage;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Domain.Entities;
using BadmintonHub.Infrastructure.Persistence;
using BadmintonHub.Infrastructure.Services;

namespace BadmintonHub.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddTransient<IDateTime, DateTimeService>();
        services.AddTransient<IExportService, ExportService>();

        // Register DbContext
        var usePostgres = configuration.GetValue<bool>("UsePostgres");
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        if (usePostgres)
        {
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseNpgsql(
                    connectionString,
                    b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName)));
        }
        else
        {
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlite(
                    connectionString ?? "Data Source=badminton_hub.db",
                    b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName)));
        }

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());

        // Register Identity
        services.AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
            {
                options.Password.RequireDigit = true;
                options.Password.RequiredLength = 8;
                options.Password.RequireNonAlphanumeric = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireLowercase = true;
                options.User.RequireUniqueEmail = false;
            })
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();

        // JWT Authentication Configuration
        var jwtSettings = configuration.GetSection("JwtSettings");
        var secret = jwtSettings.GetValue<string>("Secret")
            ?? Environment.GetEnvironmentVariable("JWT_SECRET")
            ?? throw new InvalidOperationException("JWT Secret must be configured via JwtSettings:Secret or JWT_SECRET environment variable.");
        var issuer = jwtSettings.GetValue<string>("Issuer") ?? "BadmintonHub";
        var audience = jwtSettings.GetValue<string>("Audience") ?? "BadmintonHubPlayers";

        services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = issuer,
                    ValidAudience = audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
                    RoleClaimType = ClaimTypes.Role,
                    ClockSkew = TimeSpan.Zero
                };
            });

        // Register Hangfire background jobs
        services.AddHangfire(config =>
        {
            config.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                  .UseSimpleAssemblyNameTypeSerializer()
                  .UseRecommendedSerializerSettings();

            if (usePostgres)
            {
                config.UseMemoryStorage();
            }
            else
            {
                config.UseSQLiteStorage(connectionString ?? "Data Source=badminton_hub.db");
            }
        });

        services.AddHangfireServer();

        services.AddScoped<ApplicationDbContextInitializer>();

        return services;
    }
}
