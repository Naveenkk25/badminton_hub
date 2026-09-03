"use client";

import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

interface SettleEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: any;
}

export function SettleEventModal({ open, onOpenChange, event }: SettleEventModalProps) {
  const [commonFee, setCommonFee] = useState<string>("");
  const [playerFees, setPlayerFees] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  const { data: players, isLoading } = useQuery({
    queryKey: ["event-players", event?.id],
    queryFn: async () => {
      if (!event?.id) return [];
      const response = await api.get(`/Events/${event.id}/players`);
      // Only get registered players who are not waitlisted or cancelled
      return response.data.filter((p: any) => !p.isWaitlisted && !p.isCancelled);
    },
    enabled: open && !!event?.id
  });

  useEffect(() => {
    if (open && players) {
      // Initialize player fees with the reserved fee as a default fallback
      const initialFees: { [key: string]: string } = {};
      players.forEach((p: any) => {
        initialFees[p.registrationId] = event?.reservedFee?.toString() || "0";
      });
      setPlayerFees(initialFees);
      setCommonFee(event?.reservedFee?.toString() || "");
    }
  }, [open, players, event]);

  const handleApplyToAll = () => {
    if (!commonFee || isNaN(Number(commonFee))) {
      toast.error("Please enter a valid common fee.");
      return;
    }
    
    const newFees = { ...playerFees };
    players?.forEach((p: any) => {
      newFees[p.registrationId] = commonFee;
    });
    setPlayerFees(newFees);
    toast.success(`Applied CAD ${commonFee} to all players.`);
  };

  const handleFeeChange = (playerId: string, value: string) => {
    setPlayerFees({ ...playerFees, [playerId]: value });
  };

  const handleSettle = async () => {
    try {
      setIsSubmitting(true);
      
      const settlements = Object.entries(playerFees).map(([registrationId, fee]) => ({
        registrationId,
        actualFee: Number(fee)
      }));

      await api.post(`/Events/${event.id}/settle`, settlements);
      
      toast.success("Event settled successfully!");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event", event.id] });
      queryClient.invalidateQueries({ queryKey: ["eventDetails"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-history"] });
      queryClient.invalidateQueries({ queryKey: ["credit-history"] });
      queryClient.invalidateQueries({ queryKey: ["activityLogs"] });
      queryClient.invalidateQueries({ queryKey: ["globalActivityLogs"] });
      refreshUser();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to settle event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalReserved = (players?.length || 0) * (event?.reservedFee || 0);
  const totalActual = Object.values(playerFees).reduce((acc, fee) => acc + (Number(fee) || 0), 0);
  const totalRefund = totalReserved - totalActual;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto flex flex-col h-full bg-background border-l border-border/40 shadow-2xl">
        <SheetHeader className="mb-6 shrink-0">
          <SheetTitle className="text-2xl font-heading flex items-center gap-2">
            Settle Event Fees
          </SheetTitle>
          <SheetDescription className="mt-2 font-medium">
            Settle the final fees for {event?.name}. Players will automatically receive refunds if the actual fee is less than the reserved amount of CAD {event?.reservedFee}.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col flex-1 h-full">
          <div className="flex-1 overflow-y-auto pb-6 space-y-6">
            
            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4 mb-2">
              <div className="bg-surface p-4 rounded-xl border border-border/50 shadow-sm flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Reserved</span>
                <span className="text-lg font-bold">CAD {totalReserved}</span>
              </div>
              <div className="bg-surface p-4 rounded-xl border border-border/50 shadow-sm flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Actual</span>
                <span className="text-lg font-bold text-court-blue">CAD {totalActual}</span>
              </div>
              <div className="bg-surface p-4 rounded-xl border border-border/50 shadow-sm flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Refund</span>
                <span className="text-lg font-bold text-match-red">CAD {totalRefund > 0 ? totalRefund : 0}</span>
              </div>
            </div>

            {/* Bulk Apply */}
            <div className="bg-surface p-5 rounded-xl border border-border/50 shadow-sm space-y-3">
              <Label className="text-sm font-bold">Bulk Apply Common Fee</Label>
              <div className="flex gap-3">
                <Input 
                  type="number" 
                  value={commonFee} 
                  onChange={(e) => setCommonFee(e.target.value)} 
                  placeholder="e.g. 15" 
                  className="rounded-xl flex-1"
                />
                <Button onClick={handleApplyToAll} variant="secondary" className="rounded-xl">
                  Apply to All
                </Button>
              </div>
            </div>

            {/* Individual Players */}
            <div className="space-y-3">
              <Label className="text-sm font-bold">Individual Player Settlement</Label>
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : players?.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border rounded-xl border-dashed">
                  No confirmed players found for this event.
                </div>
              ) : (
                <div className="space-y-2">
                  {players?.map((player: any) => (
                    <div key={player.registrationId} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-background hover:bg-surface/50 transition-colors">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{player.playerName}</span>
                        <span className="text-xs text-muted-foreground">Reserved: CAD {event?.reservedFee}</span>
                      </div>
                      <div className="flex items-center gap-2 w-32">
                        <span className="text-xs font-medium text-muted-foreground">CAD</span>
                        <Input 
                          type="number" 
                          value={playerFees[player.registrationId] || ""} 
                          onChange={(e) => handleFeeChange(player.registrationId, e.target.value)}
                          className="rounded-lg h-9 text-right"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          <div className="pt-6 shrink-0 flex justify-between border-t border-border/40 mt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button 
              onClick={handleSettle} 
              disabled={isSubmitting || !players?.length} 
              className="bg-court-blue hover:bg-court-blue-light text-white w-40 rounded-xl font-bold"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Settlement
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
