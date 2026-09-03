using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text;
using BadmintonHub.Application.Common.Interfaces;

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

    private static string EscapeCsvField(string field)
    {
        if (field.Contains("\"") || field.Contains(",") || field.Contains("\n") || field.Contains("\r"))
        {
            return $"\"{field.Replace("\"", "\"\"")}\"";
        }
        return field;
    }
}
