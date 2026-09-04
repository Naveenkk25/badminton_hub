"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { MapPin, Calendar, Clock, DollarSign, Users, AlertCircle, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { toast } from "sonner";
import { formatCurrency, formatTime, EVENT_STATUS_CONFIG, CATEGORY_CONFIG } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventDto, EventStatus } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EventDetailsModalProps {
  event: EventDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventDetailsModal({ event, open, onOpenChange }: EventDetailsModalProps) {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const [cancellingParticipant, setCancellingParticipant] = useState<{ id: string, name: string, isWaitlist: boolean } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const { data: detailsData, isLoading } = useQuery({
    queryKey: ["eventDetails", event.id],
    queryFn: async () => (await api.get(`/Events/${event.id}/details`)).data,
    enabled: open,
  });

  const confirmCancelParticipant = async () => {
    if (!cancellingParticipant) return;
    setIsCancelling(true);
    try {
      const response = await api.post(`/Events/${event.id}/cancel-slot`, {
        registrationId: cancellingParticipant.id
      });
      toast.success(response.data?.message || `Successfully cancelled slot for ${cancellingParticipant.name}.`);
      queryClient.invalidateQueries({ queryKey: ["eventDetails", event.id] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["playerStatuses", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["wallet-history"] });
      queryClient.invalidateQueries({ queryKey: ["activityLogs"] });
      refreshUser();
      setCancellingParticipant(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to cancel slot.");
    } finally {
      setIsCancelling(false);
    }
  };

  const config = EVENT_STATUS_CONFIG[event.status as EventStatus] || EVENT_STATUS_CONFIG[EventStatus.Open];
  const categoryConfig = (CATEGORY_CONFIG as any)[event.category as any] || (CATEGORY_CONFIG as any)["Beginner"] || (CATEGORY_CONFIG as any)[0];
  
  const confirmedPlayers = detailsData?.registrations || [];
  const waitlistedPlayers = detailsData?.waitlist || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-[100dvh] sm:h-auto max-w-none sm:max-w-[95vw] lg:max-w-6xl p-0 overflow-hidden bg-background border-border/50 shadow-2xl rounded-none sm:rounded-2xl flex flex-col gap-0">
        <div className="absolute left-0 top-0 bottom-0 w-2 z-30" style={{ backgroundColor: config.border }} />
        
        {/* Sticky Header */}
        <div className="p-4 md:p-6 pl-6 md:pl-8 pb-4 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-20 shadow-sm pt-[max(1rem,env(safe-area-inset-top))]">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl md:text-2xl font-heading font-bold text-foreground flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              {event.name}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] tracking-wider uppercase font-bold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: config.bg, color: config.color, borderColor: config.color }}>{config.label}</Badge>
                <Badge variant="outline" className="text-[10px] tracking-wider uppercase font-bold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: categoryConfig.bg, color: categoryConfig.color, borderColor: categoryConfig.color }}>{categoryConfig.label}</Badge>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 md:p-6 pl-6 md:pl-8 flex-1 overflow-y-auto bg-background/95 scrollbar-hide space-y-6">
          
          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-muted/30 p-3 rounded-lg border border-border/50 flex flex-col items-center justify-center text-center">
              <Calendar className="h-4 w-4 mb-1.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground leading-tight">{format(new Date(event.eventDate), "d MMM yyyy")}</span>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg border border-border/50 flex flex-col items-center justify-center text-center">
              <Clock className="h-4 w-4 mb-1.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground leading-tight">{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg border border-border/50 flex flex-col items-center justify-center text-center">
              <MapPin className="h-4 w-4 mb-1.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground leading-tight line-clamp-1">{event.venue}</span>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg border border-border/50 flex flex-col items-center justify-center text-center">
              <DollarSign className="h-4 w-4 mb-1.5 text-court-blue" />
              <span className="text-xs font-bold text-court-blue leading-tight">{formatCurrency(event.reservedFee)}</span>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg border border-border/50 flex flex-col items-center justify-center text-center">
              <Users className="h-4 w-4 mb-1.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground leading-tight">{event.maxPlayers} Max</span>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg border border-border/50 flex flex-col items-center justify-center text-center">
              <AlertCircle className="h-4 w-4 mb-1.5 text-match-red" />
              <span className="text-xs font-semibold text-match-red leading-tight truncate w-full" title={format(new Date(event.cutoffDateTime), "d MMM • h:mm a")}>
                Cut: {format(new Date(event.cutoffDateTime), "d MMM • h:mm a")}
              </span>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/20 p-3 md:p-4 rounded-xl border border-border/50 text-center">
              <div className="text-xl md:text-2xl font-bold text-foreground">{event.registeredPlayersCount}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-1">Registered</div>
              {detailsData && (
                <div className="text-[10px] text-muted-foreground mt-1 font-medium">
                  {detailsData.totalRegisteredMembers} Members / {detailsData.totalGuestPlayers} Guests
                </div>
              )}
            </div>
            <div className="bg-match-red/5 p-3 md:p-4 rounded-xl border border-match-red/20 text-center">
              <div className="text-xl md:text-2xl font-bold text-match-red">{event.waitlistedPlayersCount}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-match-red mt-1">Waitlist</div>
            </div>
            <div className="bg-court-green/5 p-3 md:p-4 rounded-xl border border-court-green/20 text-center">
              <div className="text-xl md:text-2xl font-bold text-court-green">{event.availableSpots}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-court-green mt-1">Available</div>
            </div>
          </div>

          {/* Refund Rules */}
          <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
            <h4 className="font-semibold text-sm mb-2 text-foreground">Refund Policy</h4>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
              <li>Full refund if cancelled before cut-off time.</li>
              <li>No refunds after cut-off time.</li>
            </ul>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground animate-pulse font-medium">Loading participants data...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* Registered Players Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-heading font-bold text-foreground flex items-center">
                  Registered Players <Badge variant="secondary" className="ml-2 font-medium bg-muted text-muted-foreground">{confirmedPlayers.length}</Badge>
                </h3>
                
                <div className="border border-border/50 rounded-xl overflow-hidden bg-surface shadow-sm">
                  {confirmedPlayers.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">No registered players yet.</div>
                  ) : (
                    <>
                      {/* Desktop Table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left table-fixed">
                          <thead className="bg-muted text-muted-foreground font-semibold text-xs border-b border-border">
                            <tr>
                              <th className="px-3 py-4 w-10 text-center">#</th>
                              <th className="px-3 py-4 w-1/3 truncate">Player Name</th>
                              <th className="px-3 py-4 w-1/5 truncate">Category</th>
                              <th className="px-3 py-4 w-1/5 truncate">Status</th>
                              <th className="px-3 py-4 w-1/5 text-right truncate">Date</th>
                              <th className="px-3 py-4 w-20 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {confirmedPlayers.map((r: any, idx: number) => {
                              const canCancel = (user?.id === r.playerId || user?.role === "SuperAdmin" || user?.role === "Organizer");
                              return (
                                <tr key={idx} className="hover:bg-muted/30 transition-colors bg-background">
                                  <td className="px-3 py-4 text-center text-muted-foreground">{idx + 1}</td>
                                  <td className="px-3 py-4 font-semibold text-foreground truncate" title={r.playerName}>{r.playerName}</td>
                                  <td className="px-3 py-4 text-muted-foreground truncate" title={r.playerCategory || "Unknown"}>{r.playerCategory || "Unknown"}</td>
                                  <td className="px-3 py-4 truncate">
                                    <Badge variant="outline" className="border-court-green text-court-green bg-court-green/10 text-[10px] uppercase font-bold tracking-wider py-0.5 px-2">Registered</Badge>
                                  </td>
                                  <td className="px-3 py-4 text-right text-muted-foreground truncate font-medium">
                                    {format(new Date(r.registrationDate), "d MMM yyyy")}
                                  </td>
                                  <td className="px-3 py-4 text-center">
                                    {canCancel && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-match-red hover:text-match-red hover:bg-match-red/10 px-2 font-medium"
                                        onClick={() => setCancellingParticipant({ id: r.id, name: r.playerName, isWaitlist: false })}
                                      >
                                        Cancel
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Mobile Cards */}
                      <div className="block md:hidden divide-y divide-border/50">
                        {confirmedPlayers.map((r: any, idx: number) => {
                          const canCancel = (user?.id === r.playerId || user?.role === "SuperAdmin" || user?.role === "Organizer");
                          return (
                            <div key={idx} className="p-4 flex flex-col gap-1.5 bg-background">
                              <div className="flex justify-between items-center gap-2">
                                <span className="font-semibold text-sm truncate text-foreground flex-1">{r.playerName}</span>
                                <Badge variant="outline" className="border-court-green text-court-green bg-court-green/10 text-[10px] uppercase font-bold px-2 py-0 shrink-0">Registered</Badge>
                              </div>
                              <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span className="font-medium">{r.playerCategory || "Unknown"}</span>
                                <span>Joined: {format(new Date(r.registrationDate), "d MMM yyyy")}</span>
                              </div>
                              {canCancel && (
                                <div className="flex justify-end pt-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs text-match-red border-match-red/30 hover:bg-match-red/10 font-medium"
                                    onClick={() => setCancellingParticipant({ id: r.id, name: r.playerName, isWaitlist: false })}
                                  >
                                    Cancel Slot
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Waiting List Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-heading font-bold text-foreground flex items-center">
                  Waiting List <Badge variant="outline" className="ml-2 font-medium border-match-red/30 text-match-red bg-match-red/5">{waitlistedPlayers.length}</Badge>
                </h3>
                
                {waitlistedPlayers.length === 0 ? (
                  <p className="text-muted-foreground text-sm font-medium p-4 border border-border/50 rounded-xl bg-surface text-center">No players in waiting list.</p>
                ) : (
                  <div className="border border-border/50 rounded-xl overflow-hidden bg-surface shadow-sm">
                    <>
                      {/* Desktop Table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left table-fixed">
                          <thead className="bg-muted text-muted-foreground font-semibold text-xs border-b border-border">
                            <tr>
                              <th className="px-3 py-4 w-10 text-center">#</th>
                              <th className="px-3 py-4 w-12 text-center">Pos</th>
                              <th className="px-3 py-4 w-1/3 truncate">Player Name</th>
                              <th className="px-3 py-4 w-1/5 truncate">Category</th>
                              <th className="px-3 py-4 w-1/5 text-right truncate">Added</th>
                              <th className="px-3 py-4 w-20 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {waitlistedPlayers.map((r: any, idx: number) => {
                              const canCancel = (user?.id === r.playerId || user?.role === "SuperAdmin" || user?.role === "Organizer");
                              return (
                                <tr key={idx} className="hover:bg-muted/30 transition-colors bg-background">
                                  <td className="px-3 py-4 text-center text-muted-foreground">{idx + 1}</td>
                                  <td className="px-3 py-4 text-center">
                                    <span className="font-bold text-match-red">#{r.position}</span>
                                  </td>
                                  <td className="px-3 py-4 font-semibold text-foreground truncate" title={r.playerName}>{r.playerName}</td>
                                  <td className="px-3 py-4 text-muted-foreground truncate" title={r.playerCategory || "Unknown"}>{r.playerCategory || "Unknown"}</td>
                                  <td className="px-3 py-4 text-right text-muted-foreground truncate font-medium">
                                    {format(new Date(r.joinedDate), "d MMM yyyy")}
                                  </td>
                                  <td className="px-3 py-4 text-center">
                                    {canCancel && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-match-red hover:text-match-red hover:bg-match-red/10 px-2 font-medium"
                                        onClick={() => setCancellingParticipant({ id: r.id, name: r.playerName, isWaitlist: true })}
                                      >
                                        Cancel
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Mobile Cards */}
                      <div className="block md:hidden divide-y divide-border/50">
                        {waitlistedPlayers.map((r: any, idx: number) => {
                          const canCancel = (user?.id === r.playerId || user?.role === "SuperAdmin" || user?.role === "Organizer");
                          return (
                            <div key={idx} className="p-4 flex flex-col gap-1.5 bg-background">
                              <div className="flex justify-between items-center gap-2">
                                <span className="font-semibold text-sm truncate text-foreground flex-1 flex items-center">
                                  <span className="font-bold text-match-red mr-2">#{r.position}</span> {r.playerName}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-xs text-muted-foreground pl-6">
                                <span className="font-medium">{r.playerCategory || "Unknown"}</span>
                                <span>Added: {format(new Date(r.joinedDate), "d MMM yyyy")}</span>
                              </div>
                              {canCancel && (
                                <div className="flex justify-end pt-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs text-match-red border-match-red/30 hover:bg-match-red/10 font-medium"
                                    onClick={() => setCancellingParticipant({ id: r.id, name: r.playerName, isWaitlist: true })}
                                  >
                                    Cancel Slot
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="p-4 border-t border-border/50 bg-surface sticky bottom-0 z-20 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <DialogFooter className="sm:justify-end">
            <DialogClose className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto px-8 font-semibold min-h-[44px] cursor-pointer")}>
              Close
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>

    {/* Individual Slot Cancel Confirmation Dialog */}
    <Dialog open={!!cancellingParticipant} onOpenChange={(open) => !open && !isCancelling && setCancellingParticipant(null)}>
      <DialogContent className="max-w-md p-6 bg-surface border-border/50 z-50">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-heading font-bold text-foreground flex items-center gap-2 text-match-red">
            <XCircle className="h-5 w-5" /> Cancel Participant Slot
          </DialogTitle>
          <DialogDescription className="text-sm text-foreground pt-2">
            Are you sure you want to cancel the {cancellingParticipant?.isWaitlist ? "waitlist" : "confirmed"} slot for <span className="font-bold text-foreground">{cancellingParticipant?.name}</span>?
          </DialogDescription>
        </DialogHeader>
        <div className="text-xs text-muted-foreground bg-muted/60 p-3 rounded-lg border border-border/50 space-y-1.5 my-2">
          {!cancellingParticipant?.isWaitlist ? (
            <>
              <div className="flex justify-between text-foreground font-semibold">
                <span>Refund Amount:</span>
                <span className="text-court-green">
                  {new Date() >= new Date(event.cutoffDateTime) ? "$0.00 CAD" : formatCurrency(event.reservedFee)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {new Date() >= new Date(event.cutoffDateTime) 
                  ? "* Cut-off time has passed. Cancellation is blocked or non-refundable."
                  : "The reserved fee will be refunded to the payer's wallet balance immediately, and the first eligible waitlisted player will be promoted."}
              </p>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              This participant will be removed from the waiting list.
            </p>
          )}
        </div>
        <DialogFooter className="flex sm:justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setCancellingParticipant(null)} disabled={isCancelling} className="w-full sm:w-auto font-semibold">
            Keep Slot
          </Button>
          <Button variant="destructive" onClick={confirmCancelParticipant} disabled={isCancelling} className="w-full sm:w-auto font-semibold">
            {isCancelling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cancelling...
              </>
            ) : (
              "Confirm Cancel"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
);
}
