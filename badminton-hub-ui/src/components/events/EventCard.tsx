"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { MapPin, Calendar, Clock, DollarSign, Users, CheckCircle2, Lock, Trophy, XCircle, Info, History, MoreVertical, Edit } from "lucide-react";
import { EventDto, EventStatus, PlayerCategory } from "@/lib/types";
import { EVENT_STATUS_CONFIG, CATEGORY_CONFIG, formatCurrency, formatTime } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface EventCardProps {
  event: EventDto;
  userStatus?: { status: string, position: number } | null;
  onAction?: (event: EventDto, action: "register" | "waitlist" | "edit" | "cancel" | "history" | "settle" | "cancel_event", guestCount?: number) => void;
  onViewDetails?: (event: EventDto) => void;
}

export function EventCard({ event, userStatus, onAction, onViewDetails }: EventCardProps) {
  const { user } = useAuth();
  const [guestCount, setGuestCount] = useState(0);
  
  const config = EVENT_STATUS_CONFIG[event.status];
  const categoryConfig = CATEGORY_CONFIG[event.category];
  
  // Calculate capacity
  const capacityPercentage = Math.min(100, Math.round((event.registeredPlayersCount / event.maxPlayers) * 100));
  
  // Progress bar color based on fill level
  let progressColor = "bg-court-green";
  if (capacityPercentage >= 100) progressColor = "bg-match-red";
  else if (capacityPercentage >= 75) progressColor = "bg-shuttlecock-gold";

  // Determine which button to show based on role and status
  const isSuperAdminOrOrganizer = user?.role === "SuperAdmin" || user?.role === "Organizer";
  const isPlayer = user?.role === "Player";

  const renderActionButton = () => {
    if (isSuperAdminOrOrganizer) {
      const canEdit = event.status !== EventStatus.Completed;
      const canSettle = event.status === EventStatus.Completed && !event.isSettled;
      const isSettled = event.status === EventStatus.Completed && event.isSettled;

      return (
        <div className="flex flex-col gap-2 w-full">
          {canSettle && (
            <Button 
              className="w-full font-semibold bg-court-blue hover:bg-court-blue-light text-white min-h-[44px]"
              onClick={() => onAction?.(event, "settle")}
            >
              <DollarSign className="mr-2 h-4 w-4" /> Settle Fees
            </Button>
          )}
          {isSettled && (
            <div className="w-full text-center font-semibold text-xs text-court-green bg-court-green/10 border border-court-green/20 py-2 rounded-md flex items-center justify-center">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Settlement Completed
            </div>
          )}
          <Button 
            variant="outline" 
            className="w-full font-semibold border-border hover:bg-surfaceHover min-h-[44px]"
            disabled={!canEdit}
            onClick={() => canEdit && onAction?.(event, "edit")}
          >
            {canEdit ? "Manage Event" : "Cannot Edit"}
          </Button>
        </div>
      );
    }

    if (isPlayer) {
      const isPastCutoff = new Date() > new Date(event.cutoffDateTime);

      if (userStatus?.status === "registered" && event.status !== EventStatus.Completed) {
        return (
          <Button 
            variant="destructive"
            className="w-full font-semibold min-h-[44px]"
            onClick={() => onAction?.(event, "cancel")}
          >
            <XCircle className="mr-2 h-4 w-4" /> Cancel Slot
          </Button>
        );
      }
      
      if (userStatus?.status === "waitlisted" && event.status !== EventStatus.Completed) {
        return (
          <div className="flex flex-col gap-2 w-full">
            <div className="w-full text-center font-semibold text-xs text-match-red bg-match-red/10 border border-match-red/20 py-2 rounded-md flex items-center justify-center">
              <Users className="mr-2 h-4 w-4" /> Waitlist #{userStatus.position}
            </div>
            <Button 
              variant="destructive"
              className="w-full font-semibold min-h-[44px]"
              onClick={() => onAction?.(event, "cancel")}
            >
              <XCircle className="mr-2 h-4 w-4" /> Cancel Waitlist
            </Button>
          </div>
        );
      }

      if (isPastCutoff && event.status !== EventStatus.Completed) {
         return (
          <Button disabled className="w-full font-semibold bg-muted text-muted-foreground flex flex-col items-center justify-center py-5 h-auto leading-tight min-h-[44px]">
             <span className="flex items-center"><Lock className="mr-1.5 h-3.5 w-3.5" /> Registration Closed</span>
             <span className="text-[10px] mt-1 font-normal opacity-80">Cut-off time has passed</span>
          </Button>
         );
      }

      if (event.status === EventStatus.Open) {
        return (
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-between bg-muted/40 p-2 rounded-lg border border-border/50">
              <span className="text-xs font-semibold text-foreground">Bring a Buddy</span>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="h-6 w-6 rounded-full bg-background" onClick={() => setGuestCount(p => Math.max(0, p - 1))}>-</Button>
                <span className="text-sm font-bold w-4 text-center">{guestCount}</span>
                <Button variant="outline" size="icon" className="h-6 w-6 rounded-full bg-background" onClick={() => setGuestCount(p => p + 1)}>+</Button>
              </div>
            </div>
            <Button 
              className="w-full font-semibold bg-court-green hover:bg-green-600 text-white min-h-[44px]"
              onClick={() => onAction?.(event, "register", guestCount)}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Book Slot {guestCount > 0 ? `(${1 + guestCount})` : ''}
            </Button>
          </div>
        );
      }
      if (event.status === EventStatus.Full) {
        return (
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-between bg-muted/40 p-2 rounded-lg border border-border/50">
              <span className="text-xs font-semibold text-foreground">Bring a Buddy</span>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="h-6 w-6 rounded-full bg-background" onClick={() => setGuestCount(p => Math.max(0, p - 1))}>-</Button>
                <span className="text-sm font-bold w-4 text-center">{guestCount}</span>
                <Button variant="outline" size="icon" className="h-6 w-6 rounded-full bg-background" onClick={() => setGuestCount(p => p + 1)}>+</Button>
              </div>
            </div>
            <Button 
              className="w-full font-semibold bg-match-red hover:bg-red-600 text-white animate-pulse min-h-[44px]"
              onClick={() => onAction?.(event, "waitlist", guestCount)}
            >
              <Users className="mr-2 h-4 w-4" /> Join Waitlist {guestCount > 0 ? `(${1 + guestCount})` : ''}
            </Button>
          </div>
        );
      }
      if (event.status === EventStatus.Locked) {
        return (
          <Button disabled className="w-full font-semibold bg-muted text-muted-foreground flex flex-col items-center justify-center py-5 h-auto leading-tight min-h-[44px]">
             <span className="flex items-center"><Lock className="mr-1.5 h-3.5 w-3.5" /> Registration Closed</span>
          </Button>
        );
      }
    }
    
    return null;
  };

  return (
    <Card className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 relative group bg-surface h-full flex flex-col sm:flex-row">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 z-10" style={{ backgroundColor: config.border }} />
      
      {/* Background Court Pattern on Hover */}
      <div className="absolute inset-0 court-pattern opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 pointer-events-none" />

      {/* Left Section: Details */}
      <div className="flex-1 p-5 pr-4 flex flex-col relative z-20">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant="outline" 
              className="font-bold border-transparent text-[11px] py-0 px-2 h-5"
              style={{ backgroundColor: config.bg, color: config.color }}
            >
              {config.label}
            </Badge>
            <Badge 
              variant="outline" 
              className="font-bold border-transparent text-[11px] py-0 px-2 h-5"
              style={{ backgroundColor: categoryConfig.bg, color: categoryConfig.color }}
            >
              🏸 {categoryConfig.label}
            </Badge>
          </div>
        </div>
        
        <h3 className="text-lg font-heading font-bold text-foreground leading-tight group-hover:text-court-blue transition-colors mb-2 line-clamp-2">
          {event.name}
        </h3>

        {/* Details Section */}
        <div className="space-y-1.5 mt-auto">
          <div className="flex items-center text-sm text-foreground font-medium">
            <MapPin className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{event.venue}</span>
          </div>
          <div className="flex items-center text-sm text-foreground font-medium">
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
            <span>{format(new Date(event.eventDate), "d MMM yyyy")}</span>
          </div>
          <div className="flex items-center text-sm text-foreground font-medium">
            <Clock className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
            <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
          </div>
        </div>
      </div>

      {/* Right Section: Capacity & Action */}
      <div className="sm:w-[260px] p-5 pl-4 flex flex-col border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800/50 bg-muted/10 relative z-20">
        <div className="flex flex-col gap-1 mb-3">
          <div className="flex items-center text-xs text-foreground font-medium bg-muted/40 p-1.5 rounded-lg">
            <Clock className="mr-1.5 h-3.5 w-3.5 text-match-red/80 shrink-0" />
            <span className="text-muted-foreground mr-1">Cutoff:</span>
            <span className="font-bold truncate">{format(new Date(event.cutoffDateTime), "d MMM • h:mm a")}</span>
          </div>
        </div>

        {/* Capacity Section */}
        <div className="mb-4">
          <div className="flex justify-between items-end mb-1.5">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">
                {event.registeredPlayersCount} <span className="text-muted-foreground font-medium text-xs">/ {event.maxPlayers}</span>
              </span>
            </div>
            {event.waitlistedPlayersCount > 0 && (
              <span className="text-xs text-match-red font-semibold flex items-center">
                <Users className="h-3 w-3 mr-1" /> {event.waitlistedPlayersCount} Waitlisted
              </span>
            )}
          </div>
          
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-2">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${capacityPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn("h-full rounded-full", progressColor)}
            />
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground font-medium">Reserved</span>
            <div className="flex items-center text-sm font-bold text-court-blue">
              <DollarSign className="mr-0.5 h-3.5 w-3.5" />
              <span>{((1 + guestCount) * event.reservedFee).toFixed(2)} CAD</span>
            </div>
          </div>
        </div>

        {/* Action Area */}
        <div className="mt-auto w-full flex flex-col gap-2">
          {renderActionButton()}
          {isSuperAdminOrOrganizer ? (
            <div className="flex items-center gap-2 w-full">
              <Button 
                variant="outline" 
                className="flex-1 text-sm font-semibold border-border hover:bg-surfaceHover min-h-[44px]"
                onClick={() => onViewDetails?.(event)}
              >
                <Info className="mr-1.5 h-4 w-4" /> Details
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 border-border hover:bg-surfaceHover shrink-0"
                    title="More actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {event.status !== EventStatus.Completed && (
                    <DropdownMenuItem 
                      onClick={() => onAction?.(event, "edit")}
                      className="cursor-pointer"
                    >
                      <Edit className="mr-2 h-4 w-4" /> Manage Event
                    </DropdownMenuItem>
                  )}
                  {event.status !== EventStatus.Completed && event.status !== EventStatus.Cancelled && (
                    <DropdownMenuItem 
                      onClick={() => onAction?.(event, "cancel_event")}
                      className="cursor-pointer text-amber-600 focus:text-amber-600"
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Cancel Event
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="w-full text-sm font-semibold border-border hover:bg-surfaceHover min-h-[44px]"
              onClick={() => onViewDetails?.(event)}
            >
              <Info className="mr-2 h-4 w-4" /> Details
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
