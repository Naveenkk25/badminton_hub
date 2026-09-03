"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  FileText, 
  Download, 
  TrendingUp, 
  Users, 
  CalendarDays, 
  DollarSign, 
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
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const currentYear = now.getFullYear();
  const YEARS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const handleDownload = async (reportType: number, format: number, filename: string) => {
    try {
      const response = await api.get(`/Reports?reportType=${reportType}&format=${format}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Download started");
    } catch {
      toast.error("Failed to download report");
    }
  };

  const handleDownloadEventFinancialSummary = async () => {
    setIsExportingExcel(true);
    try {
      const response = await api.get(
        `/Reports/event-financial-summary?year=${selectedYear}&month=${selectedMonth}`,
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
      const filename = `Event_Financial_Summary_${monthName}_${selectedYear}.xlsx`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Excel report downloaded successfully!");
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.info("No events found for this month.");
      } else if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          toast.info(json.message || "No events found for this month.");
        } catch {
          toast.error("Failed to download Event Financial Summary.");
        }
      } else {
        toast.error("Failed to download Event Financial Summary.");
      }
    } finally {
      setIsExportingExcel(false);
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
            <h2 className="text-3xl font-heading font-bold tracking-tight">Reports & Analytics</h2>
            <p className="text-muted-foreground font-medium">Export event financials, registrations, and system records.</p>
          </div>
        </div>
      </div>

      {/* Month-Wise Event Financial Summary Card */}
      <Card className="border-border/60 shadow-sm bg-gradient-to-br from-card to-muted/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-court-green/10 text-court-green rounded-xl">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl">Event Financial Summary (Excel)</CardTitle>
              <CardDescription>
                Month-wise financial statement per event detailing registrations, collections, refunds, and net revenue.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-surface/50">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-court-blue"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-court-blue"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              onClick={handleDownloadEventFinancialSummary}
              disabled={isExportingExcel}
              className="bg-court-green hover:bg-court-green/90 text-white font-medium shadow-sm transition-all sm:self-end h-10 px-5"
            >
              {isExportingExcel ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" /> Download Excel (.xlsx)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Standard Exports</CardTitle>
            <CardDescription>Export general platform registers and ledgers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface border border-border/50 rounded-xl hover:border-court-blue/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-court-blue/10 text-court-blue rounded-lg">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold">Event Registrations</h4>
                  <p className="text-xs text-muted-foreground">Export all registrations for past month</p>
                </div>
              </div>
              <Button onClick={() => handleDownload(0, 0, "event_registrations.csv")} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" /> CSV
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-surface border border-border/50 rounded-xl hover:border-court-green/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-court-green/10 text-court-green rounded-lg">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold">Financial Summary</h4>
                  <p className="text-xs text-muted-foreground">Export all transactions and wallet balances</p>
                </div>
              </div>
              <Button onClick={() => handleDownload(1, 0, "financial_summary.csv")} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" /> CSV
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-surface border border-border/50 rounded-xl hover:border-shuttlecock-gold/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-shuttlecock-gold/10 text-shuttlecock-gold rounded-lg">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold">Player Directory</h4>
                  <p className="text-xs text-muted-foreground">Export full player list with categories</p>
                </div>
              </div>
              <Button onClick={() => handleDownload(0, 0, "player_directory.csv")} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" /> CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Quick Insights</CardTitle>
            <CardDescription>Live trends and event attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center h-full min-h-[220px] bg-muted/20 rounded-xl border border-dashed border-border">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground mb-2">Analytics Dashboard Coming Soon</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Detailed charts and visual analytics are currently being built and will be available in the next release.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
