using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Xunit;
using FluentAssertions;
using BadmintonHub.Application.Features.Wallet.Commands.CreditWallet;
using BadmintonHub.Application.Features.Events.Commands.RegisterPlayer;
using BadmintonHub.Domain.Entities;
using BadmintonHub.Domain.Enums;
using BadmintonHub.Infrastructure.Persistence;
using BadmintonHub.Infrastructure.Services;
using BadmintonHub.Application.Common.Interfaces;

namespace BadmintonHub.Tests;

public class WalletLedgerTests
{
    private readonly ApplicationDbContext _context;
    private readonly IDateTime _dateTime = new DateTimeService();

    public WalletLedgerTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var mockCurrentUserService = new TestCurrentUserService();

        _context = new ApplicationDbContext(options, mockCurrentUserService, _dateTime);
    }

    [Fact]
    public async Task CreditWallet_ShouldIncrementBalance_AndAddTransaction()
    {
        // Arrange
        var player = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "1112223333",
            FullName = "Test Player",
            Role = UserRole.Player,
            Status = UserStatus.Active,
            WalletBalance = 0.00m
        };
        _context.Users.Add(player);
        await _context.SaveChangesAsync();

        var handler = new CreditWalletCommandHandler(_context, _dateTime);

        // Act
        var newBalance = await handler.Handle(new CreditWalletCommand
        {
            PlayerId = player.Id,
            Amount = 100.00m,
            Description = "Test Credit"
        }, CancellationToken.None);

        // Assert
        newBalance.Should().Be(100.00m);
        player.WalletBalance.Should().Be(100.00m);

        var tx = await _context.WalletTransactions.FirstOrDefaultAsync(t => t.PlayerId == player.Id);
        tx.Should().NotBeNull();
        tx!.Amount.Should().Be(100.00m);
        tx.Type.Should().Be(WalletTransactionType.Credit);
    }

    [Fact]
    public async Task InsufficientBalance_ShouldBlockRegistration()
    {
        // Arrange
        var player = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "2223334444",
            FullName = "Broke Player",
            Role = UserRole.Player,
            Status = UserStatus.Active,
            WalletBalance = 5.00m
        };
        _context.Users.Add(player);

        var @event = new Event
        {
            Id = Guid.NewGuid(),
            Name = "Tuesday Night Doubles",
            MaxPlayers = 10,
            ReservedFee = 15.00m,
            CutoffDateTime = DateTime.Now.AddHours(2),
            Status = EventStatus.Open
        };
        _context.Events.Add(@event);
        await _context.SaveChangesAsync();

        var handler = new RegisterPlayerCommandHandler(_context, _dateTime);

        // Act & Assert
        Func<Task> act = async () => await handler.Handle(new RegisterPlayerCommand
        {
            EventId = @event.Id,
            PlayerId = player.Id
        }, CancellationToken.None);

        await act.Should().ThrowAsync<Exception>()
            .WithMessage("*Insufficient wallet balance*");
    }
}

public class TestCurrentUserService : ICurrentUserService
{
    public string? UserId => "TestUser";
    public string? UserRole => "SuperAdmin";
    public string? IpAddress => "127.0.0.1";
    public string? DeviceInformation => "Test runner";
}
