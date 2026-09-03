"use client";

import React from "react";
import { History, Download } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { format } from "date-fns";
import { formatCurrency, EVENT_STATUS_CONFIG, CATEGORY_CONFIG } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function EventHistoryPage() {
  const { user } = useAuth();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["event-history", user?.id],
    queryFn: async () => (await api.get(`/Events/history/player/${user?.id}`)).data,
    enabled: !!user?.id
  });

  const handleExportCSV = () => {
    if (!history.length) return;

    const headers = ["Event Name", "Category", "Date", "Status", "Amount Paid", "Booking Status"];
    const rows = history.map((h: any) => [
      `"${h.name}"`,
      (CATEGORY_CONFIG as any)[h.category]?.label || h.category,
      format(new Date(h.eventDate), "yyyy-MM-dd"),
      (EVENT_STATUS_CONFIG as any)[h.status]?.label || h.status,
      h.isSettled ? (h.actualFee ?? h.reservedFee) : h.reservedFee,
      h.bookingStatus
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map((r: any) => r.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `event_history_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading history...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground"
          >
            <History className="h-6 w-6" />
          </motion.div>
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">Event History</h2>
            <p className="text-muted-foreground font-medium">Review your past event participation and records.</p>
          </div>
        </div>
        
        {history.length > 0 && (
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border/50 rounded-2xl bg-surface/50">
          <History className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-bold font-heading mb-2">No History Yet</h3>
          <p className="text-muted-foreground max-w-md">You haven't participated in any events that have been completed. Once an event finishes, it will appear here.</p>
        </div>
      ) : (
        <div className="border border-border/50 rounded-lg overflow-hidden bg-surface shadow-sm">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Event Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Settled?</th>
                  <th className="px-6 py-4">Amount Paid</th>
                  <th className="px-6 py-4">Booking Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {history.map((event: any) => (
                  <tr key={event.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-semibold">{event.name}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">{(CATEGORY_CONFIG as any)[event.category]?.label || event.category}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{format(new Date(event.eventDate), "MMM d, yyyy")}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" style={{ backgroundColor: (EVENT_STATUS_CONFIG as any)[event.status]?.bg, color: (EVENT_STATUS_CONFIG as any)[event.status]?.color }}>
                        {(EVENT_STATUS_CONFIG as any)[event.status]?.label || event.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {event.isSettled ? (
                        <Badge variant="secondary" className="bg-court-green/10 text-court-green border-court-green/20">Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-court-blue">
                      {formatCurrency(event.isSettled ? (event.actualFee ?? event.reservedFee) : event.reservedFee)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="bg-court-green/10 text-court-green border-court-green/20">
                        {event.bookingStatus}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Mobile Cards */}
          <div className="block md:hidden divide-y divide-border/50">
            {history.map((event: any) => (
              <div key={event.id} className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-semibold text-base leading-tight text-foreground">{event.name}</span>
                  <Badge variant="secondary" className="bg-court-green/10 text-court-green border-court-green/20 shrink-0">
                    {event.bookingStatus}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{format(new Date(event.eventDate), "MMM d, yyyy")}</span>
                  <span className="font-medium text-court-blue">
                    {formatCurrency(event.isSettled ? (event.actualFee ?? event.reservedFee) : event.reservedFee)}
                    {event.isSettled && <span className="text-[10px] text-court-green ml-1 block text-right">(Settled)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">{(CATEGORY_CONFIG as any)[event.category]?.label || event.category}</Badge>
                  <Badge variant="outline" className="text-[10px]" style={{ backgroundColor: (EVENT_STATUS_CONFIG as any)[event.status]?.bg, color: (EVENT_STATUS_CONFIG as any)[event.status]?.color }}>
                    {(EVENT_STATUS_CONFIG as any)[event.status]?.label || event.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
