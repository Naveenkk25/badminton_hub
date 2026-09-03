using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Xunit;
using FluentAssertions;
using BadmintonHub.Application.Features.Events.Commands.RegisterPlayer;
using BadmintonHub.Application.Features.Events.Commands.CancelRegistration;
using BadmintonHub.Domain.Entities;
using BadmintonHub.Domain.Enums;
using BadmintonHub.Infrastructure.Persistence;
using BadmintonHub.Infrastructure.Services;
using BadmintonHub.Application.Common.Interfaces;

namespace BadmintonHub.Tests;

public class RegistrationTests
{
    private readonly ApplicationDbContext _context;
    private readonly IDateTime _dateTime = new DateTimeService();

    public RegistrationTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var mockCurrentUserService = new TestCurrentUserService();

        _context = new ApplicationDbContext(options, mockCurrentUserService, _dateTime);
    }

    [Fact]
    public async Task Registration_ShouldGoToWaitlist_WhenCapacityIsFull()
    {
        // Arrange
        var @event = new Event
        {
            Id = Guid.NewGuid(),
            Name = "Singles Match",
            MaxPlayers = 1,
            EventFee = 10.00m,
            CutoffDateTime = DateTime.UtcNow.AddHours(2),
            Status = EventStatus.Open
        };
        _context.Events.Add(@event);

        var player1 = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "111",
            FullName = "Player One",
            Role = UserRole.Player,
            Status = UserStatus.Active,
            WalletBalance = 20.00m
        };
        var player2 = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "222",
            FullName = "Player Two",
            Role = UserRole.Player,
            Status = UserStatus.Active,
            WalletBalance = 20.00m
        };
        _context.Users.AddRange(player1, player2);
        await _context.SaveChangesAsync();

        var handler = new RegisterPlayerCommandHandler(_context, _dateTime);

        // Act - Player 1 registers
        var result1 = await handler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = player1.Id }, CancellationToken.None);
        
        // Act - Player 2 tries to register
        var result2 = await handler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = player2.Id }, CancellationToken.None);

        // Assert
        result1.Status.Should().Be("Registered");
        result2.Status.Should().Be("Waitlisted");
        result2.WaitlistPosition.Should().Be(1);
        
        @event.RegisteredPlayersCount.Should().Be(1);
        @event.WaitlistedPlayersCount.Should().Be(1);
    }

    [Fact]
    public async Task CancelRegistration_ShouldPromoteWaitlistedPlayer_InFIFOOrder()
    {
        // Arrange
        var @event = new Event
        {
            Id = Guid.NewGuid(),
            Name = "Singles Match",
            MaxPlayers = 1,
            EventFee = 10.00m,
            CutoffDateTime = DateTime.UtcNow.AddHours(2),
            Status = EventStatus.Open
        };
        _context.Events.Add(@event);

        var player1 = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "111",
            FullName = "Player One",
            Role = UserRole.Player,
            Status = UserStatus.Active,
            WalletBalance = 20.00m
        };
        var player2 = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "222",
            FullName = "Player Two",
            Role = UserRole.Player,
            Status = UserStatus.Active,
            WalletBalance = 20.00m
        };
        _context.Users.AddRange(player1, player2);
        await _context.SaveChangesAsync();

        var regHandler = new RegisterPlayerCommandHandler(_context, _dateTime);
        var cancelHandler = new CancelRegistrationCommandHandler(_context, _dateTime);

        // Act - Register Player 1 (spot filled)
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = player1.Id }, CancellationToken.None);
        
        // Act - Player 2 joins waitlist
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = player2.Id }, CancellationToken.None);

        // Fetch active registration for Player 1
        var reg = await _context.Registrations.FirstOrDefaultAsync(r => r.PlayerId == player1.Id && !r.IsCancelled);

        // Act - Cancel Player 1
        await cancelHandler.Handle(new CancelRegistrationCommand(reg!.Id), CancellationToken.None);

        // Assert
        reg.IsCancelled.Should().BeTrue();
        player1.WalletBalance.Should().Be(20.00m); // Refunded

        // Player 2 should be promoted
        var player2Reg = await _context.Registrations.FirstOrDefaultAsync(r => r.PlayerId == player2.Id && !r.IsCancelled);
        player2Reg.Should().NotBeNull();
        player2.WalletBalance.Should().Be(10.00m); // Fee deducted

        var wl = await _context.Waitlists.FirstOrDefaultAsync(w => w.PlayerId == player2.Id);
        wl!.IsPromoted.Should().BeTrue();
    }
}
