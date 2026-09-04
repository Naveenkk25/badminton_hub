"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  FileText, 
  Download, 
  FileSpreadsheet, 
  Loader2 
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default function ReportsPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedFormat, setSelectedFormat] = useState<"excel" | "pdf">("excel");
  const [exportingFormat, setExportingFormat] = useState<"excel" | "pdf" | null>(null);

  const currentYear = now.getFullYear();
  const YEARS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const handleDownloadEventFinancialSummary = async (formatType: "excel" | "pdf") => {
    setExportingFormat(formatType);
    try {
      const response = await api.get(
        `/Reports/event-financial-summary?year=${selectedYear}&month=${selectedMonth}&format=${formatType}`,
        {
          responseType: "blob",
        }
      );

      // Verify if the returned blob is actually a JSON error payload
      if (response.data.type === "application/json") {
        const text = await response.data.text();
        const json = JSON.parse(text);
        toast.info(json.message || "No events found for this month.");
        return;
      }

      const monthName = MONTHS.find((m) => m.value === selectedMonth)?.label || "Month";
      const extension = formatType === "pdf" ? "pdf" : "xlsx";
      const filename = `Event_Financial_Summary_${monthName}_${selectedYear}.${extension}`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`${formatType.toUpperCase()} report downloaded successfully!`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.info("No events found for this month.");
      } else if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          toast.info(json.message || "No events found for this month.");
        } catch {
          toast.error(`Failed to download ${formatType.toUpperCase()} report.`);
        }
      } else {
        toast.error(`Failed to download ${formatType.toUpperCase()} report.`);
      }
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-court-blue/10 text-court-blue"
          >
            <FileText className="h-6 w-6" />
          </motion.div>
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">Financial Reports</h2>
            <p className="text-muted-foreground font-medium">Export monthly event financial statements and reconciliations in Excel or PDF format.</p>
          </div>
        </div>
      </div>

      {/* Month-Wise Event Financial Summary Card */}
      <Card className="border-border/60 shadow-sm bg-gradient-to-br from-card to-muted/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-court-blue/10 text-court-blue rounded-xl">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl">Event Financial Summary</CardTitle>
              <CardDescription>
                Month-wise statement per event detailing registrations, collections, refunds, and net revenue. Available in Excel (.xlsx) and PDF (.pdf).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5 p-5 rounded-xl border border-border/60 bg-surface/50">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-court-blue min-w-[130px]"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-court-blue min-w-[100px]"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Format</label>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value as "excel" | "pdf")}
                  className="h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-court-blue min-w-[140px]"
                >
                  <option value="excel">Excel (.xlsx)</option>
                  <option value="pdf">PDF (.pdf)</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 lg:self-end">
              <Button
                onClick={() => handleDownloadEventFinancialSummary(selectedFormat)}
                disabled={!!exportingFormat}
                className="bg-court-blue hover:bg-court-blue-light text-white font-medium shadow-sm transition-all h-10 px-5"
              >
                {exportingFormat === selectedFormat ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating {selectedFormat.toUpperCase()}...
                  </>
                ) : selectedFormat === "pdf" ? (
                  <>
                    <FileText className="h-4 w-4 mr-2" /> Download PDF (.pdf)
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" /> Download Excel (.xlsx)
                  </>
                )}
              </Button>

              {/* Quick direct alternative button */}
              {selectedFormat === "excel" ? (
                <Button
                  onClick={() => handleDownloadEventFinancialSummary("pdf")}
                  disabled={!!exportingFormat}
                  variant="outline"
                  className="font-medium h-10 px-4 border-border/70 hover:bg-muted/40"
                >
                  {exportingFormat === "pdf" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2 text-match-red" /> Download PDF
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => handleDownloadEventFinancialSummary("excel")}
                  disabled={!!exportingFormat}
                  variant="outline"
                  className="font-medium h-10 px-4 border-border/70 hover:bg-muted/40"
                >
                  {exportingFormat === "excel" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4 mr-2 text-court-green" /> Download Excel
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
