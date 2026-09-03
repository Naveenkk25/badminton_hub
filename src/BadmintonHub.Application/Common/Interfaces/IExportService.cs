using System.Collections.Generic;

namespace BadmintonHub.Application.Common.Interfaces;

public interface IExportService
{
    byte[] ExportToCsv<T>(IEnumerable<T> data);
    byte[] ExportToTxt(string reportTitle, IEnumerable<string> lines);
}
