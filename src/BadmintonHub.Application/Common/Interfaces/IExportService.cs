using System.Collections.Generic;
using BadmintonHub.Application.DTOs;

namespace BadmintonHub.Application.Common.Interfaces;

public interface IExportService
{
    byte[] ExportToCsv<T>(IEnumerable<T> data);
    byte[] ExportToTxt(string reportTitle, IEnumerable<string> lines);
    byte[] ExportEventFinancialSummaryToExcel(string monthTitle, IEnumerable<EventFinancialSummaryItemDto> events, EventFinancialSummaryItemDto total);
    byte[] ExportEventFinancialSummaryToPdf(string monthTitle, int year, IEnumerable<EventFinancialSummaryItemDto> events, EventFinancialSummaryItemDto total);
}

