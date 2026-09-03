using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Application.DTOs;

namespace BadmintonHub.Infrastructure.Services;

public class ExportService : IExportService
{
    public byte[] ExportToCsv<T>(IEnumerable<T> data)
    {
        using var memoryStream = new MemoryStream();
        using var writer = new StreamWriter(memoryStream, Encoding.UTF8);

        var properties = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance);

        // Write Headers
        var headerLine = string.Join(",", Array.ConvertAll(properties, p => EscapeCsvField(p.Name)));
        writer.WriteLine(headerLine);

        // Write Data
        foreach (var item in data)
        {
            var values = new List<string>();
            foreach (var prop in properties)
            {
                var val = prop.GetValue(item, null);
                values.Add(EscapeCsvField(val?.ToString() ?? string.Empty));
            }
            writer.WriteLine(string.Join(",", values));
        }

        writer.Flush();
        return memoryStream.ToArray();
    }

    public byte[] ExportToTxt(string reportTitle, IEnumerable<string> lines)
    {
        var sb = new StringBuilder();
        sb.AppendLine("====================================================");
        sb.AppendLine(reportTitle.ToUpper());
        sb.AppendLine($"Generated on: {DateTime.Now} UTC");
        sb.AppendLine("====================================================");
        sb.AppendLine();

        foreach (var line in lines)
        {
            sb.AppendLine(line);
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public byte[] ExportEventFinancialSummaryToExcel(string monthTitle, IEnumerable<EventFinancialSummaryItemDto> events, EventFinancialSummaryItemDto total)
    {
        using var workbook = new ClosedXML.Excel.XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Financial Summary");

        // Headers
        var headers = new[]
        {
            "Event Name",
            "Event Date",
            "Total Registrations",
            "Total Amount Collected",
            "Total Refunds",
            "Net Amount"
        };

        for (int col = 1; col <= headers.Length; col++)
        {
            var cell = worksheet.Cell(1, col);
            cell.Value = headers[col - 1];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = ClosedXML.Excel.XLColor.FromHtml("#F1F5F9");
            cell.Style.Alignment.Vertical = ClosedXML.Excel.XLAlignmentVerticalValues.Center;
        }

        worksheet.Cell(1, 1).Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Left;
        worksheet.Cell(1, 2).Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Center;
        worksheet.Cell(1, 3).Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Right;
        worksheet.Cell(1, 4).Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Right;
        worksheet.Cell(1, 5).Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Right;
        worksheet.Cell(1, 6).Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Right;

        int row = 2;
        foreach (var item in events)
        {
            worksheet.Cell(row, 1).SetValue(item.EventName);
            worksheet.Cell(row, 1).Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Left;

            var dateCell = worksheet.Cell(row, 2);
            dateCell.SetValue(item.EventDate.ToString("MMM d"));
            dateCell.Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Center;

            var regCell = worksheet.Cell(row, 3);
            regCell.SetValue(item.TotalRegistrations);
            regCell.Style.NumberFormat.Format = "#,##0";
            regCell.Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Right;

            var collectedCell = worksheet.Cell(row, 4);
            collectedCell.SetValue(item.TotalAmountCollected);
            collectedCell.Style.NumberFormat.Format = "$#,##0.00";
            collectedCell.Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Right;

            var refundsCell = worksheet.Cell(row, 5);
            refundsCell.SetValue(item.TotalRefunds);
            refundsCell.Style.NumberFormat.Format = "$#,##0.00";
            refundsCell.Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Right;

            var netCell = worksheet.Cell(row, 6);
            netCell.SetValue(item.NetAmount);
            netCell.Style.NumberFormat.Format = "$#,##0.00";
            netCell.Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Right;

            row++;
        }

        // Monthly Total Row
        var totalNameCell = worksheet.Cell(row, 1);
        totalNameCell.SetValue(total.EventName);
        totalNameCell.Style.Font.Bold = true;
        totalNameCell.Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Left;

        worksheet.Cell(row, 2).SetValue("");

        var totalRegCell = worksheet.Cell(row, 3);
        totalRegCell.SetValue(total.TotalRegistrations);
        totalRegCell.Style.Font.Bold = true;
        totalRegCell.Style.NumberFormat.Format = "#,##0";
        totalRegCell.Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Right;

        var totalCollectedCell = worksheet.Cell(row, 4);
        totalCollectedCell.SetValue(total.TotalAmountCollected);
        totalCollectedCell.Style.Font.Bold = true;
        totalCollectedCell.Style.NumberFormat.Format = "$#,##0.00";
        totalCollectedCell.Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Right;

        var totalRefundsCell = worksheet.Cell(row, 5);
        totalRefundsCell.SetValue(total.TotalRefunds);
        totalRefundsCell.Style.Font.Bold = true;
        totalRefundsCell.Style.NumberFormat.Format = "$#,##0.00";
        totalRefundsCell.Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Right;

        var totalNetCell = worksheet.Cell(row, 6);
        totalNetCell.SetValue(total.NetAmount);
        totalNetCell.Style.Font.Bold = true;
        totalNetCell.Style.NumberFormat.Format = "$#,##0.00";
        totalNetCell.Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Right;

        // Auto-fit columns with readable padding
        worksheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private static string EscapeCsvField(string field)
    {
        if (field.Contains("\"") || field.Contains(",") || field.Contains("\n") || field.Contains("\r"))
        {
            return $"\"{field.Replace("\"", "\"\"")}\"";
        }
        return field;
    }
}
