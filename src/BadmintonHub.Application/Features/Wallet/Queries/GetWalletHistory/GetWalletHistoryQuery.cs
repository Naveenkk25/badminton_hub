using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Application.DTOs;

namespace BadmintonHub.Application.Features.Wallet.Queries.GetWalletHistory;

public record GetWalletHistoryQuery(Guid PlayerId) : IRequest<List<WalletTransactionDto>>;

public class GetWalletHistoryQueryHandler : IRequestHandler<GetWalletHistoryQuery, List<WalletTransactionDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetWalletHistoryQueryHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<List<WalletTransactionDto>> Handle(GetWalletHistoryQuery request, CancellationToken cancellationToken)
    {
        return await _context.WalletTransactions
            .Include(t => t.Player)
            .Where(t => t.PlayerId == request.PlayerId)
            .OrderByDescending(t => t.Timestamp)
            .ProjectTo<WalletTransactionDto>(_mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);
    }
}
