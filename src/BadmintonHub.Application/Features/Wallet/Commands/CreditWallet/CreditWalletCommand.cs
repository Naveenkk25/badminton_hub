using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Domain.Entities;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.Application.Features.Wallet.Commands.CreditWallet;

public record CreditWalletCommand : IRequest<decimal>
{
    public Guid PlayerId { get; init; }
    public decimal Amount { get; init; }
    public string Description { get; init; } = string.Empty;
    public WalletTransactionType Type { get; init; } = WalletTransactionType.Credit;
}

public class CreditWalletCommandHandler : IRequestHandler<CreditWalletCommand, decimal>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTime _dateTime;

    public CreditWalletCommandHandler(IApplicationDbContext context, IDateTime dateTime)
    {
        _context = context;
        _dateTime = dateTime;
    }

    public async Task<decimal> Handle(CreditWalletCommand request, CancellationToken cancellationToken)
    {
        if (request.Amount <= 0)
        {
            throw new Exception("Amount must be greater than zero.");
        }

        var player = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.PlayerId, cancellationToken);

        if (player == null)
        {
            throw new Exception("Player not found.");
        }

        if (player.Role != UserRole.Player)
        {
            throw new Exception("Selected user is not a Player.");
        }

        // Apply ledger transaction
        var transaction = new WalletTransaction
        {
            Id = Guid.NewGuid(),
            PlayerId = player.Id,
            Amount = request.Amount,
            Type = request.Type,
            Description = request.Description,
            Timestamp = _dateTime.Now,
            CreatedDate = _dateTime.Now
        };

        // Update stored wallet balance cache on user
        player.WalletBalance += request.Amount;

        _context.WalletTransactions.Add(transaction);
        await _context.SaveChangesAsync(cancellationToken);

        return player.WalletBalance;
    }
}
