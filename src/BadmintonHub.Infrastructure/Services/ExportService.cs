using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text;
using BadmintonHub.Application.Common.Interfaces;
using BadmintonHub.Application.DTOs;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

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

    public byte[] ExportEventFinancialSummaryToPdf(string monthTitle, int year, IEnumerable<EventFinancialSummaryItemDto> events, EventFinancialSummaryItemDto total)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(1.5f, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(titleCol =>
                        {
                            titleCol.Item().Text("Badminton Hub").FontSize(18).Bold().FontColor("#1E40AF");
                            titleCol.Item().Text($"Event Financial Summary — {monthTitle} {year}").FontSize(13).SemiBold().FontColor("#475569");
                        });
                        row.ConstantItem(180).AlignRight().Text($"Generated: {DateTime.Now:yyyy-MM-dd HH:mm}").FontSize(9).FontColor(Colors.Grey.Medium);
                    });
                    col.Item().PaddingTop(8).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                });

                page.Content().PaddingTop(12).Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.RelativeColumn(3f);    // Event Name
                        columns.RelativeColumn(1.4f);  // Event Date
                        columns.RelativeColumn(1.6f);  // Total Registrations
                        columns.RelativeColumn(2f);    // Amount Collected
                        columns.RelativeColumn(2f);    // Total Refunds
                        columns.RelativeColumn(2f);    // Net Amount
                    });

                    // Header Row
                    table.Header(header =>
                    {
                        header.Cell().Background("#F1F5F9").Padding(6).Text("Event Name").Bold().FontColor("#334155");
                        header.Cell().Background("#F1F5F9").Padding(6).AlignCenter().Text("Event Date").Bold().FontColor("#334155");
                        header.Cell().Background("#F1F5F9").Padding(6).AlignRight().Text("Total Registrations").Bold().FontColor("#334155");
                        header.Cell().Background("#F1F5F9").Padding(6).AlignRight().Text("Total Amount Collected").Bold().FontColor("#334155");
                        header.Cell().Background("#F1F5F9").Padding(6).AlignRight().Text("Total Refunds").Bold().FontColor("#334155");
                        header.Cell().Background("#F1F5F9").Padding(6).AlignRight().Text("Net Amount").Bold().FontColor("#334155");
                    });

                    // Data Rows
                    foreach (var item in events)
                    {
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(6).Text(item.EventName);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(6).AlignCenter().Text(item.EventDate.ToString("MMM d"));
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(6).AlignRight().Text(item.TotalRegistrations.ToString());
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(6).AlignRight().Text($"${item.TotalAmountCollected:N2}");
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(6).AlignRight().Text($"${item.TotalRefunds:N2}");
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(6).AlignRight().Text($"${item.NetAmount:N2}");
                    }

                    // Total Row
                    table.Cell().Background("#F8FAFC").BorderTop(1.5f).BorderColor("#CBD5E1").Padding(7).Text(total.EventName).Bold();
                    table.Cell().Background("#F8FAFC").BorderTop(1.5f).BorderColor("#CBD5E1").Padding(7).Text("");
                    table.Cell().Background("#F8FAFC").BorderTop(1.5f).BorderColor("#CBD5E1").Padding(7).AlignRight().Text(total.TotalRegistrations.ToString()).Bold();
                    table.Cell().Background("#F8FAFC").BorderTop(1.5f).BorderColor("#CBD5E1").Padding(7).AlignRight().Text($"${total.TotalAmountCollected:N2}").Bold();
                    table.Cell().Background("#F8FAFC").BorderTop(1.5f).BorderColor("#CBD5E1").Padding(7).AlignRight().Text($"${total.TotalRefunds:N2}").Bold();
                    table.Cell().Background("#F8FAFC").BorderTop(1.5f).BorderColor("#CBD5E1").Padding(7).AlignRight().Text($"${total.NetAmount:N2}").Bold();
                });

                page.Footer().AlignRight().Text(x =>
                {
                    x.Span("Page ");
                    x.CurrentPageNumber();
                    x.Span(" of ");
                    x.TotalPages();
                });
            });
        });

        return document.GeneratePdf();
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
