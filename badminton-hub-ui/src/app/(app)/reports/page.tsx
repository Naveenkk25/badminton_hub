"use client";

import React from "react";
import { motion } from "framer-motion";
import { FileText, Download, TrendingUp, Users, CalendarDays, IndianRupee } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";

export default function ReportsPage() {
  const handleDownload = async (reportType: number, format: number, filename: string) => {
    try {
      // Create a blob from the response
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
    } catch (error) {
      toast.error("Failed to download report");
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
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-match-red/10 text-match-red"
          >
            <FileText className="h-6 w-6" />
          </motion.div>
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">Reports & Analytics</h2>
            <p className="text-muted-foreground font-medium">Export data and view system analytics.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
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
                  <IndianRupee className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold">Financial Summary</h4>
                  <p className="text-xs text-muted-foreground">Export all transactions and wallet balances</p>
                </div>
              </div>
              <Button onClick={() => handleDownload(2, 1, "financial_summary.pdf")} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" /> PDF
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
              <Button onClick={() => handleDownload(1, 2, "player_directory.xlsx")} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" /> Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Quick Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center h-full min-h-[300px] bg-muted/20 rounded-xl border border-dashed border-border">
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
