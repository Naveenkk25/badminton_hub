"use client";

import React from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { EventDto } from "@/lib/types";
import { Clock, History, Loader2, User } from "lucide-react";

interface EventHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventDto | null;
}

export function EventHistoryModal({ isOpen, onClose, event }: EventHistoryModalProps) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["event-history", event?.id],
    queryFn: async () => {
      if (!event?.id) return [];
      const response = await api.get(`/Events/${event.id}/history`);
      return response.data;
    },
    enabled: !!event?.id && isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border/50 rounded-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/50 shrink-0 bg-muted/30">
          <DialogTitle className="text-xl font-heading font-bold text-foreground flex items-center">
            <History className="mr-2 h-5 w-5 text-court-blue" />
            Change History
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Activity logs for <span className="font-semibold text-foreground">{event?.name}</span>
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-court-blue" />
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border border-dashed border-border/50 rounded-xl">
              No change history found for this event.
            </div>
          ) : (
            <div className="relative space-y-6 before:absolute before:inset-0 before:ml-[1.125rem] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {logs.map((log: any, idx: number) => (
                <div key={log.id} className="relative flex items-start w-full">
                  {/* Icon */}
                  <div className="flex items-center justify-center w-9 h-9 rounded-full border-4 border-background bg-court-blue text-white shadow-sm shrink-0 relative z-10 mt-0.5 mr-3 sm:mr-4">
                    <History className="h-4 w-4" />
                  </div>
                  {/* Content */}
                  <div className="w-[calc(100%-3rem)] sm:w-[calc(100%-3.25rem)] p-3.5 rounded-xl border border-border/50 bg-surface shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2.5 pb-2.5 border-b border-border/30 gap-1.5 sm:gap-2">
                      <span className="font-bold text-foreground text-sm flex items-center truncate">
                        <User className="h-3.5 w-3.5 mr-1.5 text-court-blue shrink-0" />
                        <span className="truncate">{log.userFullName}</span>
                      </span>
                      <time className="text-[11px] font-medium text-muted-foreground flex items-center opacity-80 shrink-0">
                        <Clock className="h-3 w-3 mr-1" />
                        {format(new Date(log.timestamp), "MMM d, yyyy • h:mm a")}
                      </time>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 w-full min-w-0">
                      <span className="text-sm font-bold text-foreground shrink-0">{log.action}</span>
                      {log.description && (
                        <>
                          <span className="text-muted-foreground/50 text-sm shrink-0">-</span>
                          <p className="text-sm text-muted-foreground whitespace-nowrap overflow-x-auto overflow-y-hidden min-w-0 pb-1 custom-scrollbar flex-1">{log.description}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
