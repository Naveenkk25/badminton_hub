using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using BadmintonHub.Application.Features.Reports.Queries.GetEventFinancialSummary;
using BadmintonHub.Application.Features.Reports.Queries.GetReportExport;

namespace BadmintonHub.WebApi.Controllers;

[Authorize(Roles = "SuperAdmin,Organizer")]
public class ReportsController : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GenerateReport([FromQuery] int reportType, [FromQuery] int format, [FromQuery] System.Guid? eventId = null)
    {
        var query = new GetReportExportQuery
        {
            ReportType = (ReportType)reportType,
            Format = (ExportFormat)format,
            EventId = eventId
        };

        var result = await Mediator.Send(query);

        Response.Headers.Append("Content-Disposition", $"attachment; filename={result.FileName}");
        return File(result.FileContent, result.ContentType);
    }

    [HttpGet("event-financial-summary")]
    public async Task<IActionResult> GetEventFinancialSummary(
        [FromQuery] int year, 
        [FromQuery] int month, 
        [FromQuery] string format = "excel")
    {
        if (year < 2000 || year > 2100 || month < 1 || month > 12)
        {
            return BadRequest(new { message = "Invalid year or month specified." });
        }

        var query = new GetEventFinancialSummaryQuery(year, month, format);
        var result = await Mediator.Send(query);

        if (result == null)
        {
            return NotFound(new { message = "No events found for this month." });
        }

        Response.Headers.Append("Content-Disposition", $"attachment; filename={result.FileName}");
        return File(result.FileContent, result.ContentType);
    }
}
