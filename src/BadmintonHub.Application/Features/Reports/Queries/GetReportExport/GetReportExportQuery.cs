using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.Application.Features.Reports.Queries.GetReportExport;

public enum ReportType
{
    Registrations,
    WalletLedger,
    ActivityLogs,
    AuditLogs
}

public enum ExportFormat
{
    Csv,
    Txt
}

public record GetReportExportQuery : IRequest<ReportExportVm>
{
    public ReportType ReportType { get; init; }
    public ExportFormat Format { get; init; }
    public Guid? EventId { get; init; }
}

public class ReportExportVm
{
    public byte[] FileContent { get; set; } = Array.Empty<byte>();
    public string ContentType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
}

public class GetReportExportQueryHandler : IRequestHandler<GetReportExportQuery, ReportExportVm>
{
    private readonly IApplicationDbContext _context;
    private readonly IExportService _exportService;
    private readonly IDateTime _dateTime;

    public GetReportExportQueryHandler(
        IApplicationDbContext context,
        IExportService exportService,
        IDateTime dateTime)
    {
        _context = context;
        _exportService = exportService;
        _dateTime = dateTime;
    }

    public async Task<ReportExportVm> Handle(GetReportExportQuery request, CancellationToken cancellationToken)
    {
        byte[] fileContent = Array.Empty<byte>();
        string contentType = "text/csv";
        string ext = "csv";

        if (request.Format == ExportFormat.Txt)
        {
            contentType = "text/plain";
            ext = "txt";
        }

        string fileName = $"report_{request.ReportType.ToString().ToLower()}_{_dateTime.Now:yyyyMMddHHmmss}.{ext}";

        switch (request.ReportType)
        {
            case ReportType.Registrations:
                var regQuery = _context.Registrations
                    .Include(r => r.Event)
                    .Include(r => r.Player)
                    .AsNoTracking();

                if (request.EventId.HasValue)
                {
                    regQuery = regQuery.Where(r => r.EventId == request.EventId.Value);
                }

                var registrations = await regQuery.ToListAsync(cancellationToken);

                var regData = registrations.Select(r => new
                {
                    RegistrationId = r.Id,
                    EventName = r.Event?.Name ?? "N/A",
                    Venue = r.Event?.Venue ?? "N/A",
                    PlayerName = r.Player?.FullName ?? "N/A",
                    Mobile = r.Player?.PhoneNumber ?? "N/A",
                    ReservedFee = r.ReservedFee,
                    Date = r.RegistrationDate,
                    Status = r.IsCancelled ? "Cancelled" : "Registered"
                });

                if (request.Format == ExportFormat.Csv)
                {
                    fileContent = _exportService.ExportToCsv(regData);
                }
                else
                {
                    var lines = regData.Select(r => $"Player: {r.PlayerName} ({r.Mobile}) | Event: {r.EventName} | Fee Paid: {r.ReservedFee:C} | Date: {r.Date} | Status: {r.Status}");
                    fileContent = _exportService.ExportToTxt("Registration Report", lines);
                }
                break;

            case ReportType.WalletLedger:
                var transactions = await _context.WalletTransactions
                    .Include(t => t.Player)
                    .AsNoTracking()
                    .OrderByDescending(t => t.Timestamp)
                    .ToListAsync(cancellationToken);

                var ledgerData = transactions.Select(t => new
                {
                    TransactionId = t.Id,
                    PlayerName = t.Player?.FullName ?? "N/A",
                    Mobile = t.Player?.PhoneNumber ?? "N/A",
                    Amount = t.Amount,
                    Type = t.Type.ToString(),
                    Description = t.Description,
                    Date = t.Timestamp
                });

                if (request.Format == ExportFormat.Csv)
                {
                    fileContent = _exportService.ExportToCsv(ledgerData);
                }
                else
                {
                    var lines = ledgerData.Select(l => $"Player: {l.PlayerName} | Type: {l.Type} | Amount: {l.Amount:C} | Desc: {l.Description} | Date: {l.Date}");
                    fileContent = _exportService.ExportToTxt("Wallet Ledger Report", lines);
                }
                break;

            case ReportType.ActivityLogs:
                var activities = await _context.ActivityLogs
                    .Include(a => a.User)
                    .AsNoTracking()
                    .OrderByDescending(a => a.Timestamp)
                    .ToListAsync(cancellationToken);

                var actData = activities.Select(a => new
                {
                    LogId = a.Id,
                    User = a.User?.FullName ?? "System",
                    Action = a.Action,
                    Description = a.Description,
                    Date = a.Timestamp,
                    IP = a.IpAddress
                });

                if (request.Format == ExportFormat.Csv)
                {
                    fileContent = _exportService.ExportToCsv(actData);
                }
                else
                {
                    var lines = actData.Select(a => $"[{a.Date}] User: {a.User} | Action: {a.Action} | Details: {a.Description} (IP: {a.IP})");
                    fileContent = _exportService.ExportToTxt("Activity Logs Report", lines);
                }
                break;

            case ReportType.AuditLogs:
                var audits = await _context.AuditLogs
                    .Include(a => a.User)
                    .AsNoTracking()
                    .OrderByDescending(a => a.Timestamp)
                    .ToListAsync(cancellationToken);

                var auditData = audits.Select(a => new
                {
                    LogId = a.Id,
                    EntityName = a.EntityName,
                    EntityId = a.EntityId,
                    Action = a.Action,
                    Date = a.Timestamp,
                    User = a.User?.FullName ?? "System",
                    IP = a.IpAddress
                });

                if (request.Format == ExportFormat.Csv)
                {
                    fileContent = _exportService.ExportToCsv(auditData);
                }
                else
                {
                    var lines = auditData.Select(a => $"[{a.Date}] Entity: {a.EntityName} (ID: {a.EntityId}) | Action: {a.Action} | User: {a.User} (IP: {a.IP})");
                    fileContent = _exportService.ExportToTxt("System Audit Logs Report", lines);
                }
                break;
        }

        return new ReportExportVm
        {
            FileContent = fileContent,
            ContentType = contentType,
            FileName = fileName
        };
    }
}
