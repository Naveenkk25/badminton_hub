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
            ReservedFee = 10.00m,
            CutoffDateTime = DateTime.Now.AddHours(2),
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
            ReservedFee = 10.00m,
            CutoffDateTime = DateTime.Now.AddHours(2),
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
        await cancelHandler.Handle(new CancelRegistrationCommand(@event.Id, player1.Id), CancellationToken.None);

        // Assert
        reg.IsCancelled.Should().BeTrue();
        player1.WalletBalance.Should().Be(20.00m); // Refunded

        // Player 2 should be promoted
        var player2Reg = await _context.Registrations.FirstOrDefaultAsync(r => r.PlayerId == player2.Id && !r.IsCancelled);
        player2Reg.Should().NotBeNull();
        player2.WalletBalance.Should().Be(10.00m); // Fee was paid once at registration, not double-debited on promotion

        var wl = await _context.Waitlists.FirstOrDefaultAsync(w => w.PlayerId == player2.Id);
        wl!.IsPromoted.Should().BeTrue();
    }

    [Fact]
    public async Task CancelRegistration_MultiSlot_WithWaitlist_ShouldRefundAllAndPromoteCorrectly()
    {
        // Arrange
        var @event = new Event
        {
            Id = Guid.NewGuid(),
            Name = "Sunday Smash",
            MaxPlayers = 4,
            ReservedFee = 10.00m,
            CutoffDateTime = DateTime.Now.AddHours(5),
            Status = EventStatus.Open
        };
        _context.Events.Add(@event);

        var player1 = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "p1",
            FullName = "Player One",
            Role = UserRole.Player,
            Status = UserStatus.Active,
            WalletBalance = 50.00m
        };
        var player2 = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "p2",
            FullName = "Player Two",
            Role = UserRole.Player,
            Status = UserStatus.Active,
            WalletBalance = 20.00m
        };
        _context.Users.AddRange(player1, player2);
        await _context.SaveChangesAsync();

        var regHandler = new RegisterPlayerCommandHandler(_context, _dateTime);
        var cancelHandler = new CancelRegistrationCommandHandler(_context, _dateTime);

        // Player 1 registers with 4 guests (5 total participants: 4 registered, 1 waitlisted)
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = player1.Id, GuestCount = 4 }, CancellationToken.None);

        // Player 2 registers with 1 guest (2 total participants: both waitlisted)
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = player2.Id, GuestCount = 1 }, CancellationToken.None);

        @event.RegisteredPlayersCount.Should().Be(4);
        @event.WaitlistedPlayersCount.Should().Be(3); // P1 guest 4, P2, P2 guest 1
        player1.WalletBalance.Should().Be(0.00m);
        player2.WalletBalance.Should().Be(0.00m);

        // Act - Player 1 cancels slot
        var cancelResult = await cancelHandler.Handle(new CancelRegistrationCommand(@event.Id, player1.Id), CancellationToken.None);

        // Assert
        cancelResult.Success.Should().BeTrue();
        player1.WalletBalance.Should().Be(50.00m); // All 5 slots refunded

        // Player 2 and Player 2 guest 1 should be promoted to registered
        @event.RegisteredPlayersCount.Should().Be(2);
        @event.WaitlistedPlayersCount.Should().Be(0);
        @event.Status.Should().Be(EventStatus.Open);

        var p2Regs = await _context.Registrations.Where(r => r.PlayerId == player2.Id && !r.IsCancelled).ToListAsync();
        p2Regs.Count.Should().Be(2);
    }

    [Fact]
    public async Task Test1_CancelMainPlayerOnly_GuestsRemainConfirmed()
    {
        // 1. Cancel main player only
        var @event = new Event
        {
            Id = Guid.NewGuid(),
            Name = "Morning Session",
            MaxPlayers = 5,
            ReservedFee = 10.00m,
            CutoffDateTime = DateTime.Now.AddHours(4),
            Status = EventStatus.Open
        };
        _context.Events.Add(@event);

        var player = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "user1",
            FullName = "John Doe",
            Role = UserRole.Player,
            Status = UserStatus.Active,
            WalletBalance = 50.00m
        };
        _context.Users.Add(player);
        await _context.SaveChangesAsync();

        var regHandler = new RegisterPlayerCommandHandler(_context, _dateTime);
        var cancelHandler = new CancelRegistrationCommandHandler(_context, _dateTime);

        // Register main player + 2 guests (3 slots)
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = player.Id, GuestCount = 2 }, CancellationToken.None);

        var regs = await _context.Registrations.Where(r => r.PlayerId == player.Id && !r.IsCancelled).ToListAsync();
        regs.Count.Should().Be(3);
        player.WalletBalance.Should().Be(20.00m); // 50 - 30 = 20

        var mainReg = regs.First(r => r.GuestName == null);
        var guestRegs = regs.Where(r => r.GuestName != null).ToList();

        // Cancel main player only
        var cancelResult = await cancelHandler.Handle(new CancelRegistrationCommand(@event.Id, player.Id, RegistrationId: mainReg.Id), CancellationToken.None);

        cancelResult.Success.Should().BeTrue();
        mainReg.IsCancelled.Should().BeTrue();
        foreach (var g in guestRegs)
        {
            g.IsCancelled.Should().BeFalse();
        }

        // Refunded 1 slot ($10) -> 20 + 10 = 30
        player.WalletBalance.Should().Be(30.00m);
        @event.RegisteredPlayersCount.Should().Be(2);
    }

    [Fact]
    public async Task Test2_CancelOneGuest_MainPlayerAndOtherGuestsRemainConfirmed()
    {
        // 2. Cancel one guest (e.g. Arun)
        var @event = new Event
        {
            Id = Guid.NewGuid(),
            Name = "Evening Session",
            MaxPlayers = 10,
            ReservedFee = 15.00m,
            CutoffDateTime = DateTime.Now.AddHours(5),
            Status = EventStatus.Open
        };
        _context.Events.Add(@event);

        var player = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "john",
            FullName = "John",
            Role = UserRole.Player,
            Status = UserStatus.Active,
            WalletBalance = 100.00m
        };
        _context.Users.Add(player);
        await _context.SaveChangesAsync();

        var regHandler = new RegisterPlayerCommandHandler(_context, _dateTime);
        var cancelHandler = new CancelRegistrationCommandHandler(_context, _dateTime);

        // John registers with 4 guests: David (Guest 1), Arun (Guest 2), Kumar (Guest 3), Alex (Guest 4)
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = player.Id, GuestCount = 4 }, CancellationToken.None);

        var regs = await _context.Registrations.Where(r => r.PlayerId == player.Id && !r.IsCancelled).ToListAsync();
        regs.Count.Should().Be(5);
        player.WalletBalance.Should().Be(25.00m); // 100 - 75 = 25

        var mainReg = regs.First(r => r.GuestName == null);
        var arunReg = regs.First(r => r.GuestName != null && r.GuestName.EndsWith("_2"));
        var otherGuests = regs.Where(r => r.Id != arunReg.Id && r.Id != mainReg.Id).ToList();

        // Cancel Arun only
        var cancelResult = await cancelHandler.Handle(new CancelRegistrationCommand(@event.Id, player.Id, RegistrationId: arunReg.Id), CancellationToken.None);

        cancelResult.Success.Should().BeTrue();
        arunReg.IsCancelled.Should().BeTrue();
        mainReg.IsCancelled.Should().BeFalse();
        foreach (var og in otherGuests)
        {
            og.IsCancelled.Should().BeFalse();
        }

        // Refunded 1 slot ($15) -> 25 + 15 = 40
        player.WalletBalance.Should().Be(40.00m);
        @event.RegisteredPlayersCount.Should().Be(4);
    }

    [Fact]
    public async Task Test3_CancelMultipleGuests_MainPlayerAndRemainingGuestsRemainConfirmed()
    {
        // 3. Cancel multiple guests
        var @event = new Event
        {
            Id = Guid.NewGuid(),
            Name = "Weekend Match",
            MaxPlayers = 10,
            ReservedFee = 10.00m,
            CutoffDateTime = DateTime.Now.AddHours(3),
            Status = EventStatus.Open
        };
        _context.Events.Add(@event);

        var player = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "host",
            FullName = "Host Player",
            Role = UserRole.Player,
            Status = UserStatus.Active,
            WalletBalance = 100.00m
        };
        _context.Users.Add(player);
        await _context.SaveChangesAsync();

        var regHandler = new RegisterPlayerCommandHandler(_context, _dateTime);
        var cancelHandler = new CancelRegistrationCommandHandler(_context, _dateTime);

        // Register 1 main + 4 guests = 5 slots
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = player.Id, GuestCount = 4 }, CancellationToken.None);

        var regs = await _context.Registrations.Where(r => r.PlayerId == player.Id && !r.IsCancelled).ToListAsync();
        var mainReg = regs.First(r => r.GuestName == null);
        var guestsToCancel = regs.Where(r => r.GuestName != null && (r.GuestName.EndsWith("_1") || r.GuestName.EndsWith("_2"))).ToList();
        var guestsToKeep = regs.Where(r => r.GuestName != null && (r.GuestName.EndsWith("_3") || r.GuestName.EndsWith("_4"))).ToList();

        // Cancel Guest 1 & Guest 2
        var cancelResult = await cancelHandler.Handle(new CancelRegistrationCommand(
            @event.Id, 
            player.Id, 
            RegistrationIds: guestsToCancel.Select(g => g.Id).ToList()
        ), CancellationToken.None);

        cancelResult.Success.Should().BeTrue();
        foreach (var c in guestsToCancel) c.IsCancelled.Should().BeTrue();
        mainReg.IsCancelled.Should().BeFalse();
        foreach (var k in guestsToKeep) k.IsCancelled.Should().BeFalse();

        // 2 slots refunded = $20 -> 50 + 20 = 70
        player.WalletBalance.Should().Be(70.00m);
        @event.RegisteredPlayersCount.Should().Be(3);
    }

    [Fact]
    public async Task Test4_CancelAllGuests_MainPlayerRemainsConfirmed()
    {
        // 4. Cancel all guests
        var @event = new Event
        {
            Id = Guid.NewGuid(),
            Name = "Practice Match",
            MaxPlayers = 10,
            ReservedFee = 10.00m,
            CutoffDateTime = DateTime.Now.AddHours(3),
            Status = EventStatus.Open
        };
        _context.Events.Add(@event);

        var player = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "p4",
            FullName = "Player Four",
            Role = UserRole.Player,
            Status = UserStatus.Active,
            WalletBalance = 50.00m
        };
        _context.Users.Add(player);
        await _context.SaveChangesAsync();

        var regHandler = new RegisterPlayerCommandHandler(_context, _dateTime);
        var cancelHandler = new CancelRegistrationCommandHandler(_context, _dateTime);

        // 1 main + 3 guests
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = player.Id, GuestCount = 3 }, CancellationToken.None);

        var regs = await _context.Registrations.Where(r => r.PlayerId == player.Id && !r.IsCancelled).ToListAsync();
        var mainReg = regs.First(r => r.GuestName == null);
        var allGuests = regs.Where(r => r.GuestName != null).ToList();

        // Cancel all guests by ID
        var cancelResult = await cancelHandler.Handle(new CancelRegistrationCommand(
            @event.Id,
            player.Id,
            RegistrationIds: allGuests.Select(g => g.Id).ToList()
        ), CancellationToken.None);

        cancelResult.Success.Should().BeTrue();
        foreach (var g in allGuests) g.IsCancelled.Should().BeTrue();
        mainReg.IsCancelled.Should().BeFalse();

        // 3 slots refunded = $30 -> 10 + 30 = 40
        player.WalletBalance.Should().Be(40.00m);
        @event.RegisteredPlayersCount.Should().Be(1);
    }

    [Fact]
    public async Task Test5_OneAvailableSlot_PromotesOneWaitlistedPlayer()
    {
        // 5. 1 available slot promotes 1 waitlisted player
        var @event = new Event
        {
            Id = Guid.NewGuid(),
            Name = "Championship",
            MaxPlayers = 2,
            ReservedFee = 10.00m,
            CutoffDateTime = DateTime.Now.AddHours(4),
            Status = EventStatus.Open
        };
        _context.Events.Add(@event);

        var p1 = new ApplicationUser { Id = Guid.NewGuid(), UserName = "p1", FullName = "P1", Role = UserRole.Player, Status = UserStatus.Active, WalletBalance = 20m };
        var p2 = new ApplicationUser { Id = Guid.NewGuid(), UserName = "p2", FullName = "P2", Role = UserRole.Player, Status = UserStatus.Active, WalletBalance = 20m };
        var wl1 = new ApplicationUser { Id = Guid.NewGuid(), UserName = "wl1", FullName = "WL1", Role = UserRole.Player, Status = UserStatus.Active, WalletBalance = 20m };
        var wl2 = new ApplicationUser { Id = Guid.NewGuid(), UserName = "wl2", FullName = "WL2", Role = UserRole.Player, Status = UserStatus.Active, WalletBalance = 20m };
        _context.Users.AddRange(p1, p2, wl1, wl2);
        await _context.SaveChangesAsync();

        var regHandler = new RegisterPlayerCommandHandler(_context, _dateTime);
        var cancelHandler = new CancelRegistrationCommandHandler(_context, _dateTime);

        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = p1.Id }, CancellationToken.None);
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = p2.Id }, CancellationToken.None);
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = wl1.Id }, CancellationToken.None);
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = wl2.Id }, CancellationToken.None);

        @event.RegisteredPlayersCount.Should().Be(2);
        @event.WaitlistedPlayersCount.Should().Be(2);

        // Cancel 1 slot (p1)
        await cancelHandler.Handle(new CancelRegistrationCommand(@event.Id, p1.Id), CancellationToken.None);

        // Assert: Exactly 1 promoted (wl1). wl2 remains in waitlist at #1
        @event.RegisteredPlayersCount.Should().Be(2);
        @event.WaitlistedPlayersCount.Should().Be(1);

        var wl1Reg = await _context.Registrations.FirstOrDefaultAsync(r => r.PlayerId == wl1.Id && !r.IsCancelled);
        wl1Reg.Should().NotBeNull();

        var wl2Entry = await _context.Waitlists.FirstOrDefaultAsync(w => w.PlayerId == wl2.Id && !w.IsCancelled && !w.IsPromoted);
        wl2Entry.Should().NotBeNull();
        wl2Entry!.Position.Should().Be(1);
    }

    [Fact]
    public async Task Test6_TwoAvailableSlots_PromoteTwoWaitlistedPlayers()
    {
        // 6. 2 available slots promote 2 waitlisted players
        var @event = new Event
        {
            Id = Guid.NewGuid(),
            Name = "Double Tournament",
            MaxPlayers = 4,
            ReservedFee = 10.00m,
            CutoffDateTime = DateTime.Now.AddHours(4),
            Status = EventStatus.Open
        };
        _context.Events.Add(@event);

        var p1 = new ApplicationUser { Id = Guid.NewGuid(), UserName = "p1", FullName = "P1", Role = UserRole.Player, Status = UserStatus.Active, WalletBalance = 30m };
        var p2 = new ApplicationUser { Id = Guid.NewGuid(), UserName = "p2", FullName = "P2", Role = UserRole.Player, Status = UserStatus.Active, WalletBalance = 30m };
        var wl1 = new ApplicationUser { Id = Guid.NewGuid(), UserName = "wl1", FullName = "WL1", Role = UserRole.Player, Status = UserStatus.Active, WalletBalance = 20m };
        var wl2 = new ApplicationUser { Id = Guid.NewGuid(), UserName = "wl2", FullName = "WL2", Role = UserRole.Player, Status = UserStatus.Active, WalletBalance = 20m };
        var wl3 = new ApplicationUser { Id = Guid.NewGuid(), UserName = "wl3", FullName = "WL3", Role = UserRole.Player, Status = UserStatus.Active, WalletBalance = 20m };
        _context.Users.AddRange(p1, p2, wl1, wl2, wl3);
        await _context.SaveChangesAsync();

        var regHandler = new RegisterPlayerCommandHandler(_context, _dateTime);
        var cancelHandler = new CancelRegistrationCommandHandler(_context, _dateTime);

        // P1 takes 2 slots (main + 1 guest)
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = p1.Id, GuestCount = 1 }, CancellationToken.None);
        // P2 takes 2 slots (main + 1 guest)
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = p2.Id, GuestCount = 1 }, CancellationToken.None);

        // Waitlist joins
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = wl1.Id }, CancellationToken.None);
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = wl2.Id }, CancellationToken.None);
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = wl3.Id }, CancellationToken.None);

        @event.RegisteredPlayersCount.Should().Be(4);
        @event.WaitlistedPlayersCount.Should().Be(3);

        // P1 cancels both slots
        await cancelHandler.Handle(new CancelRegistrationCommand(@event.Id, p1.Id), CancellationToken.None);

        // Exactly 2 promoted: wl1 and wl2. wl3 remains on waitlist
        @event.RegisteredPlayersCount.Should().Be(4);
        @event.WaitlistedPlayersCount.Should().Be(1);

        var wl1Reg = await _context.Registrations.FirstOrDefaultAsync(r => r.PlayerId == wl1.Id && !r.IsCancelled);
        var wl2Reg = await _context.Registrations.FirstOrDefaultAsync(r => r.PlayerId == wl2.Id && !r.IsCancelled);
        var wl3Reg = await _context.Registrations.FirstOrDefaultAsync(r => r.PlayerId == wl3.Id && !r.IsCancelled);

        wl1Reg.Should().NotBeNull();
        wl2Reg.Should().NotBeNull();
        wl3Reg.Should().BeNull();

        var wl3Entry = await _context.Waitlists.FirstOrDefaultAsync(w => w.PlayerId == wl3.Id && !w.IsCancelled && !w.IsPromoted);
        wl3Entry.Should().NotBeNull();
        wl3Entry!.Position.Should().Be(1);
    }

    [Fact]
    public async Task Test7_ZeroAvailableSlots_MeansZeroWaitlistPromotion()
    {
        // 7. 0 available slots means 0 waitlist promotion (e.g. waitlist player cancels)
        var @event = new Event
        {
            Id = Guid.NewGuid(),
            Name = "Friendly Game",
            MaxPlayers = 2,
            ReservedFee = 10.00m,
            CutoffDateTime = DateTime.Now.AddHours(4),
            Status = EventStatus.Open
        };
        _context.Events.Add(@event);

        var p1 = new ApplicationUser { Id = Guid.NewGuid(), UserName = "p1", FullName = "P1", Role = UserRole.Player, Status = UserStatus.Active, WalletBalance = 20m };
        var p2 = new ApplicationUser { Id = Guid.NewGuid(), UserName = "p2", FullName = "P2", Role = UserRole.Player, Status = UserStatus.Active, WalletBalance = 20m };
        var wl1 = new ApplicationUser { Id = Guid.NewGuid(), UserName = "wl1", FullName = "WL1", Role = UserRole.Player, Status = UserStatus.Active, WalletBalance = 20m };
        var wl2 = new ApplicationUser { Id = Guid.NewGuid(), UserName = "wl2", FullName = "WL2", Role = UserRole.Player, Status = UserStatus.Active, WalletBalance = 20m };
        _context.Users.AddRange(p1, p2, wl1, wl2);
        await _context.SaveChangesAsync();

        var regHandler = new RegisterPlayerCommandHandler(_context, _dateTime);
        var cancelHandler = new CancelRegistrationCommandHandler(_context, _dateTime);

        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = p1.Id }, CancellationToken.None);
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = p2.Id }, CancellationToken.None);
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = wl1.Id }, CancellationToken.None);
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = wl2.Id }, CancellationToken.None);

        // WL1 cancels their waitlist entry
        var wl1Entry = await _context.Waitlists.FirstAsync(w => w.PlayerId == wl1.Id);
        var cancelResult = await cancelHandler.Handle(new CancelRegistrationCommand(@event.Id, wl1.Id, RegistrationId: wl1Entry.Id), CancellationToken.None);

        cancelResult.Success.Should().BeTrue();
        @event.RegisteredPlayersCount.Should().Be(2); // No registered slot was freed
        @event.WaitlistedPlayersCount.Should().Be(1);

        // WL2 was NOT promoted because 0 slots were available
        var wl2Reg = await _context.Registrations.FirstOrDefaultAsync(r => r.PlayerId == wl2.Id && !r.IsCancelled);
        wl2Reg.Should().BeNull();

        // WL2 should now be at position #1
        var wl2Entry = await _context.Waitlists.FirstAsync(w => w.PlayerId == wl2.Id);
        wl2Entry.Position.Should().Be(1);
    }

    [Fact]
    public async Task Test8_FifoWaitlistOrdering()
    {
        // 8. FIFO waitlist ordering
        var @event = new Event
        {
            Id = Guid.NewGuid(),
            Name = "FIFO Test",
            MaxPlayers = 1,
            ReservedFee = 10.00m,
            CutoffDateTime = DateTime.Now.AddHours(4),
            Status = EventStatus.Open
        };
        _context.Events.Add(@event);

        var p1 = new ApplicationUser { Id = Guid.NewGuid(), UserName = "p1", FullName = "P1", Role = UserRole.Player, Status = UserStatus.Active, WalletBalance = 20m };
        var wl1 = new ApplicationUser { Id = Guid.NewGuid(), UserName = "wl1", FullName = "WL1", Role = UserRole.Player, Status = UserStatus.Active, WalletBalance = 20m };
        var wl2 = new ApplicationUser { Id = Guid.NewGuid(), UserName = "wl2", FullName = "WL2", Role = UserRole.Player, Status = UserStatus.Active, WalletBalance = 20m };
        var wl3 = new ApplicationUser { Id = Guid.NewGuid(), UserName = "wl3", FullName = "WL3", Role = UserRole.Player, Status = UserStatus.Active, WalletBalance = 20m };
        _context.Users.AddRange(p1, wl1, wl2, wl3);
        await _context.SaveChangesAsync();

        var regHandler = new RegisterPlayerCommandHandler(_context, _dateTime);
        var cancelHandler = new CancelRegistrationCommandHandler(_context, _dateTime);

        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = p1.Id }, CancellationToken.None);
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = wl1.Id }, CancellationToken.None);
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = wl2.Id }, CancellationToken.None);
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = wl3.Id }, CancellationToken.None);

        // P1 cancels
        await cancelHandler.Handle(new CancelRegistrationCommand(@event.Id, p1.Id), CancellationToken.None);

        // WL1 must be promoted, WL2 is at position 1, WL3 is at position 2
        var wl1Reg = await _context.Registrations.FirstOrDefaultAsync(r => r.PlayerId == wl1.Id && !r.IsCancelled);
        wl1Reg.Should().NotBeNull();

        var remainingWl2 = await _context.Waitlists.FirstAsync(w => w.PlayerId == wl2.Id);
        remainingWl2.Position.Should().Be(1);

        var remainingWl3 = await _context.Waitlists.FirstAsync(w => w.PlayerId == wl3.Id);
        remainingWl3.Position.Should().Be(2);
    }

    [Fact]
    public async Task Test9_RefundCalculation_CancelledSlotsOnly()
    {
        // 9. Refund calculation for cancelled participants only
        var @event = new Event
        {
            Id = Guid.NewGuid(),
            Name = "Paid Event",
            MaxPlayers = 10,
            ReservedFee = 25.00m,
            CutoffDateTime = DateTime.Now.AddHours(5),
            Status = EventStatus.Open
        };
        _context.Events.Add(@event);

        var player = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "payer",
            FullName = "Payer One",
            Role = UserRole.Player,
            Status = UserStatus.Active,
            WalletBalance = 200.00m
        };
        _context.Users.Add(player);
        await _context.SaveChangesAsync();

        var regHandler = new RegisterPlayerCommandHandler(_context, _dateTime);
        var cancelHandler = new CancelRegistrationCommandHandler(_context, _dateTime);

        // Player registers with 4 guests = 5 slots * 25 = 125 deducted -> balance = 75
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = player.Id, GuestCount = 4 }, CancellationToken.None);
        player.WalletBalance.Should().Be(75.00m);

        var regs = await _context.Registrations.Where(r => r.PlayerId == player.Id && !r.IsCancelled).ToListAsync();
        var guestsToCancel = regs.Where(r => r.GuestName != null).Take(2).ToList();

        // Cancel 2 guests: refund must be exactly 2 * 25 = 50
        await cancelHandler.Handle(new CancelRegistrationCommand(
            @event.Id, 
            player.Id, 
            RegistrationIds: guestsToCancel.Select(g => g.Id).ToList()
        ), CancellationToken.None);

        player.WalletBalance.Should().Be(125.00m); // 75 + 50 = 125

        // Check wallet transaction
        var refundTx = await _context.WalletTransactions
            .Where(t => t.PlayerId == player.Id && t.Type == WalletTransactionType.Refund)
            .OrderByDescending(t => t.Timestamp)
            .FirstOrDefaultAsync();

        refundTx.Should().NotBeNull();
        refundTx!.Amount.Should().Be(50.00m);
    }

    [Fact]
    public async Task Test10_CancellationAfterCutoff_ShouldBeBlocked()
    {
        // 10. Cancellation after cutoff is blocked
        var @event = new Event
        {
            Id = Guid.NewGuid(),
            Name = "Late Game",
            MaxPlayers = 5,
            ReservedFee = 10.00m,
            CutoffDateTime = DateTime.Now.AddHours(-1), // Past cutoff!
            Status = EventStatus.Open
        };
        _context.Events.Add(@event);

        var player = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "late_user",
            FullName = "Late User",
            Role = UserRole.Player,
            Status = UserStatus.Active,
            WalletBalance = 20.00m
        };
        _context.Users.Add(player);

        // Create an existing registration directly to test cancellation
        var reg = new Registration
        {
            Id = Guid.NewGuid(),
            EventId = @event.Id,
            PlayerId = player.Id,
            RegistrationDate = DateTime.Now.AddHours(-2),
            ReservedFee = 10.00m
        };
        _context.Registrations.Add(reg);
        await _context.SaveChangesAsync();

        var cancelHandler = new CancelRegistrationCommandHandler(_context, _dateTime);

        // Attempting to cancel after cutoff must throw exception
        var act = async () => await cancelHandler.Handle(new CancelRegistrationCommand(@event.Id, player.Id, RegistrationId: reg.Id), CancellationToken.None);

        await act.Should().ThrowAsync<Exception>().WithMessage("*cutoff*");
        reg.IsCancelled.Should().BeFalse();
        player.WalletBalance.Should().Be(20.00m); // No refund
    }

    [Fact]
    public async Task Test11_BringABuddy_With4Guests_FullLifecycle()
    {
        // 11. Bring a Buddy with 4 guests full lifecycle
        var @event = new Event
        {
            Id = Guid.NewGuid(),
            Name = "Mega Match",
            MaxPlayers = 5,
            ReservedFee = 10.00m,
            CutoffDateTime = DateTime.Now.AddHours(4),
            Status = EventStatus.Open
        };
        _context.Events.Add(@event);

        var host = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "host",
            FullName = "Host Player",
            Role = UserRole.Player,
            Status = UserStatus.Active,
            WalletBalance = 100.00m
        };
        var waitlistUser1 = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "wl1",
            FullName = "Waitlist One",
            Role = UserRole.Player,
            Status = UserStatus.Active,
            WalletBalance = 20.00m
        };
        var waitlistUser2 = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "wl2",
            FullName = "Waitlist Two",
            Role = UserRole.Player,
            Status = UserStatus.Active,
            WalletBalance = 20.00m
        };
        _context.Users.AddRange(host, waitlistUser1, waitlistUser2);
        await _context.SaveChangesAsync();

        var regHandler = new RegisterPlayerCommandHandler(_context, _dateTime);
        var cancelHandler = new CancelRegistrationCommandHandler(_context, _dateTime);

        // Host registers with 4 guests (fills all 5 spots in event)
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = host.Id, GuestCount = 4 }, CancellationToken.None);
        @event.RegisteredPlayersCount.Should().Be(5);
        @event.Status.Should().Be(EventStatus.Full);

        // WaitlistUser1 and WaitlistUser2 join waitlist
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = waitlistUser1.Id }, CancellationToken.None);
        await regHandler.Handle(new RegisterPlayerCommand { EventId = @event.Id, PlayerId = waitlistUser2.Id }, CancellationToken.None);
        @event.WaitlistedPlayersCount.Should().Be(2);

        var hostRegs = await _context.Registrations.Where(r => r.PlayerId == host.Id && !r.IsCancelled).ToListAsync();
        hostRegs.Count.Should().Be(5);

        var guest1 = hostRegs.First(r => r.GuestName != null && r.GuestName.EndsWith("_1"));
        var guest2 = hostRegs.First(r => r.GuestName != null && r.GuestName.EndsWith("_2"));
        var guest3 = hostRegs.First(r => r.GuestName != null && r.GuestName.EndsWith("_3"));
        var guest4 = hostRegs.First(r => r.GuestName != null && r.GuestName.EndsWith("_4"));
        var main = hostRegs.First(r => r.GuestName == null);

        // Step 1: Cancel Guest 1 -> 1 slot freed -> WL1 promoted
        await cancelHandler.Handle(new CancelRegistrationCommand(@event.Id, host.Id, RegistrationId: guest1.Id), CancellationToken.None);
        guest1.IsCancelled.Should().BeTrue();
        guest2.IsCancelled.Should().BeFalse();
        guest3.IsCancelled.Should().BeFalse();
        guest4.IsCancelled.Should().BeFalse();
        main.IsCancelled.Should().BeFalse();

        var wl1Reg = await _context.Registrations.FirstOrDefaultAsync(r => r.PlayerId == waitlistUser1.Id && !r.IsCancelled);
        wl1Reg.Should().NotBeNull();
        @event.WaitlistedPlayersCount.Should().Be(1);

        // Step 2: Cancel Guest 3 -> 1 slot freed -> WL2 promoted
        await cancelHandler.Handle(new CancelRegistrationCommand(@event.Id, host.Id, RegistrationId: guest3.Id), CancellationToken.None);
        guest3.IsCancelled.Should().BeTrue();
        guest2.IsCancelled.Should().BeFalse();
        guest4.IsCancelled.Should().BeFalse();
        main.IsCancelled.Should().BeFalse();

        var wl2Reg = await _context.Registrations.FirstOrDefaultAsync(r => r.PlayerId == waitlistUser2.Id && !r.IsCancelled);
        wl2Reg.Should().NotBeNull();
        @event.WaitlistedPlayersCount.Should().Be(0);

        // Step 3: Cancel Main player -> 1 slot freed -> 0 WL remaining -> event Registered count becomes 4
        await cancelHandler.Handle(new CancelRegistrationCommand(@event.Id, host.Id, RegistrationId: main.Id), CancellationToken.None);
        main.IsCancelled.Should().BeTrue();
        guest2.IsCancelled.Should().BeFalse();
        guest4.IsCancelled.Should().BeFalse();

        // 2 active guests remain for host + 2 promoted players = 4 total registered
        @event.RegisteredPlayersCount.Should().Be(4);
        @event.Status.Should().Be(EventStatus.Open);
    }
}

