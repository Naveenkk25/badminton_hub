"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/constants";
import { XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { EventDto } from "@/lib/types";

interface CancelSlotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventDto | null;
  status?: string;
  userStatuses?: any[];
  user?: any;
  onSuccess?: () => void;
}

export function CancelSlotModal({
  open,
  onOpenChange,
  event,
  status = "registered",
  userStatuses = [],
  user,
  onSuccess,
}: CancelSlotModalProps) {
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const eventSlots = Array.isArray(userStatuses) && event?.id
    ? userStatuses.filter(u => u?.eventId && u.eventId.toLowerCase() === event.id.toLowerCase())
    : [];

  useEffect(() => {
    if (open && eventSlots.length > 0) {
      const allIds = eventSlots.map(s => s.registrationId).filter(Boolean);
      setSelectedSlotIds(allIds);
    }
  }, [open, event?.id, userStatuses?.length]);

  if (!event) return null;

  const isWaitlist = status === "waitlisted";
  const selectedRegisteredCount = eventSlots.length > 1
    ? eventSlots.filter(s => selectedSlotIds.includes(s.registrationId) && s.status === "registered").length
    : (isWaitlist ? 0 : 1);

  const isAfterCutoff = event.cutoffDateTime ? new Date() >= new Date(event.cutoffDateTime) : false;
  const refundTotal = isAfterCutoff ? 0 : (event.reservedFee || 0) * selectedRegisteredCount;

  const handleConfirmCancel = async () => {
    if (!event?.id) return;
    setIsSubmitting(true);
    try {
      let payload: any = {};
      if (eventSlots.length > 1) {
        if (selectedSlotIds.length === 0) {
          toast.error("Please select at least one slot to cancel.");
          setIsSubmitting(false);
          return;
        }
        if (selectedSlotIds.length === eventSlots.length) {
          payload = { cancelAll: true };
        } else {
          payload = { registrationIds: selectedSlotIds };
        }
      } else if (eventSlots.length === 1 && eventSlots[0]?.registrationId) {
        payload = { registrationId: eventSlots[0].registrationId };
      }

      const response = await api.post(`/Events/${event.id}/cancel-slot`, payload);
      toast.success(response.data?.message || "Successfully cancelled slot(s).");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || "Failed to cancel slot";
      toast.error(errorMsg);
      console.error("Cancel slot error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isSubmitting && onOpenChange(val)}>
      <DialogContent className="max-w-md p-6 bg-surface border-border/50">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-heading font-bold text-foreground">
            {isWaitlist ? "Cancel Waitlist" : "Cancel Slot"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Confirm cancellation of registration
          </DialogDescription>
          <div className="pt-3 text-base text-foreground font-medium">
            <span className="flex items-start text-match-red mb-3">
              <XCircle className="h-5 w-5 mr-2 shrink-0" /> 
              {isWaitlist 
                ? "Are you sure you want to cancel your waitlist registration?"
                : "Are you sure you want to cancel your registration?"}
            </span>
            
            <div className="text-sm text-foreground bg-muted/80 p-4 rounded-lg border border-border/50 space-y-2 mb-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Event:</span>
                <span className="font-semibold">{event.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span className="font-semibold">{event.category}</span>
              </div>
              
              {eventSlots.length > 1 && (
                <div className="space-y-2 mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>Select participant(s) to cancel ({selectedSlotIds.length}/{eventSlots.length}):</span>
                    <button
                      type="button"
                      className="text-court-blue hover:underline font-medium text-xs"
                      onClick={() => {
                        if (selectedSlotIds.length === eventSlots.length) {
                          setSelectedSlotIds([]);
                        } else {
                          setSelectedSlotIds(eventSlots.map(s => s.registrationId).filter(Boolean));
                        }
                      }}
                    >
                      {selectedSlotIds.length === eventSlots.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {eventSlots.map((slot: any, idx: number) => {
                      const isSelected = selectedSlotIds.includes(slot.registrationId);
                      const isGuest = slot.isGuest || !!slot.guestName;
                      const displayName = slot.guestName || `${user?.fullName || "Main Player"} (You)`;
                      return (
                        <div
                          key={slot.registrationId || idx}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedSlotIds(prev => prev.filter(id => id !== slot.registrationId));
                            } else {
                              setSelectedSlotIds(prev => [...prev, slot.registrationId]);
                            }
                          }}
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors",
                            isSelected ? "border-court-blue bg-court-blue/10 text-foreground" : "border-border/50 bg-background/50 text-muted-foreground hover:bg-muted/40"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="rounded border-border text-court-blue focus:ring-court-blue h-4 w-4 pointer-events-none"
                            />
                            <span className="font-semibold text-foreground">{displayName}</span>
                            {isGuest ? (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase">Guest</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase text-court-blue border-court-blue/30">Main</Badge>
                            )}
                          </div>
                          <span className="text-[11px] font-medium capitalize">
                            {slot.status === "waitlisted" ? `WL #${slot.position}` : "Confirmed"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedRegisteredCount > 0 && (
                <div className="border-t border-border/50 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Refund ({selectedRegisteredCount} slot{selectedRegisteredCount > 1 ? 's' : ''}):</span>
                    <span className="font-semibold text-court-green">
                      {isAfterCutoff ? "$0.00 CAD" : formatCurrency(refundTotal)}
                    </span>
                  </div>
                  {isAfterCutoff && (
                    <div className="text-xs text-match-red font-medium mt-1 leading-tight">
                      * Cut-off time has passed. Cancellation is blocked or non-refundable.
                    </div>
                  )}
                </div>
              )}
              {isWaitlist && selectedRegisteredCount === 0 && (
                <div className="text-xs text-muted-foreground mt-2 leading-tight">
                  * You haven't paid any fee for waitlisting. You will be removed from the waitlist immediately.
                </div>
              )}
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="flex sm:justify-end gap-3 mt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isSubmitting} 
            className="w-full sm:w-auto font-semibold"
          >
            Keep {isWaitlist ? "Waitlist" : "Registration"}
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirmCancel} 
            disabled={isSubmitting || (eventSlots.length > 1 && selectedSlotIds.length === 0)}
            className="w-full sm:w-auto font-semibold"
          >
            {isSubmitting ? (
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
  );
}
