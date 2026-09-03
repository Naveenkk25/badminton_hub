using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Application.DTOs;
using BadmintonHub.Application.Features.Reports.Queries.GetReportExport;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.Application.Features.Reports.Queries.GetEventFinancialSummary;

public record GetEventFinancialSummaryQuery(int Year, int Month) : IRequest<ReportExportVm?>;

public class GetEventFinancialSummaryQueryHandler : IRequestHandler<GetEventFinancialSummaryQuery, ReportExportVm?>
{
    private readonly IApplicationDbContext _context;
    private readonly IExportService _exportService;

    public GetEventFinancialSummaryQueryHandler(
        IApplicationDbContext context,
        IExportService exportService)
    {
        _context = context;
        _exportService = exportService;
    }

    public async Task<ReportExportVm?> Handle(GetEventFinancialSummaryQuery request, CancellationToken cancellationToken)
    {
        var startDate = new DateTime(request.Year, request.Month, 1);
        var endDate = startDate.AddMonths(1);

        // Fetch events in selected month (handling both UTC and local DateTime representations)
        var events = await _context.Events
            .Include(e => e.Registrations)
            .Where(e => !e.IsDeleted && e.EventDate >= startDate && e.EventDate < endDate)
            .OrderBy(e => e.EventDate)
            .ToListAsync(cancellationToken);

        if (events.Count == 0)
        {
            return null;
        }

        // Fetch all wallet transactions to correlate actual debits and refunds
        var allTransactions = await _context.WalletTransactions
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var items = new List<EventFinancialSummaryItemDto>();

        foreach (var ev in events)
        {
            int totalRegistrations = ev.Registrations.Count(r => !r.IsCancelled);

            // Check actual wallet transactions recorded for this event
            var eventDebits = allTransactions
                .Where(t => t.Type == WalletTransactionType.Debit &&
                            t.Description.Contains(ev.Name, StringComparison.OrdinalIgnoreCase))
                .Sum(t => t.Amount);

            var eventRefunds = allTransactions
                .Where(t => t.Type == WalletTransactionType.Refund &&
                            t.Description.Contains(ev.Name, StringComparison.OrdinalIgnoreCase))
                .Sum(t => t.Amount);

            decimal totalCollected;
            decimal totalRefunds;

            if (eventDebits > 0 || eventRefunds > 0)
            {
                totalCollected = eventDebits;
                totalRefunds = eventRefunds;
            }
            else
            {
                // Fallback to Registration financial source of truth
                totalCollected = ev.Registrations.Sum(r => r.ReservedFee);
                totalRefunds = ev.Registrations.Sum(r => r.IsCancelled
                    ? (r.RefundAmount ?? r.ReservedFee)
                    : (r.RefundAmount ?? 0));
            }

            decimal netAmount = totalCollected - totalRefunds;

            items.Add(new EventFinancialSummaryItemDto
            {
                EventName = ev.Name,
                EventDate = ev.EventDate,
                TotalRegistrations = totalRegistrations,
                TotalAmountCollected = totalCollected,
                TotalRefunds = totalRefunds,
                NetAmount = netAmount
            });
        }

        string monthName = CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(request.Month);

        var total = new EventFinancialSummaryItemDto
        {
            EventName = $"{monthName} Total",
            TotalRegistrations = items.Sum(i => i.TotalRegistrations),
            TotalAmountCollected = items.Sum(i => i.TotalAmountCollected),
            TotalRefunds = items.Sum(i => i.TotalRefunds),
            NetAmount = items.Sum(i => i.NetAmount)
        };

        var fileContent = _exportService.ExportEventFinancialSummaryToExcel(monthName, items, total);

        return new ReportExportVm
        {
            FileContent = fileContent,
            ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            FileName = $"Event_Financial_Summary_{monthName}_{request.Year}.xlsx"
        };
    }
}
