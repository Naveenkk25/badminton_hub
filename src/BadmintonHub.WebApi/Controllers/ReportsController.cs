using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
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
}
