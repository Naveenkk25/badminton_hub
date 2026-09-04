"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { EventDto, EventStatus, UserRole } from "@/lib/types";
import { EVENT_STATUS_CONFIG } from "@/lib/constants";
import { Plus, CalendarDays, Lock, Trophy, XCircle, Search, Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EventCard } from "@/components/events/EventCard";
import { CreateEventDrawer } from "@/components/events/CreateEventDrawer";
import { EventDetailsModal } from "@/components/events/EventDetailsModal";

import { SettleEventModal } from "@/components/events/SettleEventModal";
import { CancelSlotModal } from "@/components/events/CancelSlotModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/constants";

export default function EventsPage() {
  const { user, refreshUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<EventDto | null>(null);
  const [activeTab, setActiveTab] = useState("active");

  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery<EventDto[]>({
    queryKey: ["events"],
    queryFn: async () => {
      const response = await api.get("/Events");
      return response.data.data || response.data;
    },
  });

  const { data: userStatuses = [] } = useQuery<any[]>({
    queryKey: ["playerStatuses", user?.id],
    queryFn: async () => {
      if (!user || user.role !== UserRole.Player) {
        console.log("Player statuses skipped. User:", user);
        return [];
      }
      console.log(`Fetching player statuses for user: ${user.id}`);
      const response = await api.get(`/Events/player/${user.id}/registrations-status`);
      console.log("Player statuses API response:", response.data);
      return response.data;
    },
    enabled: !!user && user.role === UserRole.Player,
  });

  const [selectedEvent, setSelectedEvent] = useState<EventDto | null>(null);
  const [eventToCancel, setEventToCancel] = useState<{event: EventDto, status: string} | null>(null);
  const [eventToCancelEntire, setEventToCancelEntire] = useState<EventDto | null>(null);
  const [isCancellingEvent, setIsCancellingEvent] = useState(false);

  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [eventToSettle, setEventToSettle] = useState<EventDto | null>(null);

  const handleEventAction = async (event: EventDto, action: "register" | "waitlist" | "edit" | "cancel" | "history" | "settle" | "cancel_event", guestCount?: number) => {
    if (action === "register" || action === "waitlist") {
      try {
        await api.post(`/Events/${event.id}/register`, { guestCount: guestCount || 0 });
        toast.success(`Successfully ${action === "register" ? "registered for" : "joined waitlist for"} event!`);
        queryClient.invalidateQueries({ queryKey: ["events"] });
        queryClient.invalidateQueries({ queryKey: ["playerStatuses", user?.id] });
        queryClient.invalidateQueries({ queryKey: ["eventDetails"] });
        queryClient.invalidateQueries({ queryKey: ["wallet-history"] });
        queryClient.invalidateQueries({ queryKey: ["activityLogs"] });
        refreshUser();
      } catch (error: any) {
        toast.error(error.response?.data?.error || "An error occurred");
        queryClient.invalidateQueries({ queryKey: ["events"] });
        queryClient.invalidateQueries({ queryKey: ["playerStatuses", user?.id] });
        queryClient.invalidateQueries({ queryKey: ["eventDetails"] });
        console.error(error);
      }
    } else if (action === "cancel") {
      const status = getUserStatus(event.id)?.status || "registered";
      setEventToCancel({ event, status });
    } else if (action === "edit") {
      setEventToEdit(event);
      setIsCreateDrawerOpen(true);

    } else if (action === "settle") {
      setEventToSettle(event);
      setIsSettleModalOpen(true);
    } else if (action === "cancel_event") {
      setEventToCancelEntire(event);
    }
  };

  const confirmCancelEntireEvent = async () => {
    if (!eventToCancelEntire) return;
    setIsCancellingEvent(true);
    try {
      const response = await api.post(`/Events/${eventToCancelEntire.id}/cancel`);
      toast.success(response.data?.message || "Event cancelled successfully and players refunded.");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["playerStatuses", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["wallet-history"] });
      queryClient.invalidateQueries({ queryKey: ["activityLogs"] });
      setEventToCancelEntire(null);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || "Failed to cancel event.";
      toast.error(errorMsg);
    } finally {
      setIsCancellingEvent(false);
    }
  };

  const getUserStatus = (eventId: string) => {
    if (!Array.isArray(userStatuses)) return null;
    const s = userStatuses.find(u => u?.eventId && u.eventId.toLowerCase() === eventId.toLowerCase());
    return s || null;
  };

  const getUserBookedCount = (eventId: string) => {
    if (!Array.isArray(userStatuses)) return 1;
    return userStatuses.filter(u => u?.eventId && u.eventId.toLowerCase() === eventId.toLowerCase()).length || 1;
  };

  // Filter logic
  const activeEvents = events.filter(
    (e) => e.status === EventStatus.Open || e.status === EventStatus.Full || e.status === EventStatus.Locked
  ).filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const completedEvents = events.filter(
    (e) => e.status === EventStatus.Completed
  ).filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
   .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
   .slice(0, 8);

  // Animation variants
  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-court-blue/10 text-court-blue"
          >
            <CalendarDays className="h-6 w-6" />
          </motion.div>
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">Badminton Events</h2>
            <p className="text-muted-foreground font-medium">View open slots, join waitlists, and manage upcoming schedules.</p>
          </div>
        </div>

        {(user?.role === UserRole.SuperAdmin || user?.role === UserRole.Organizer) && (
          <Button 
            onClick={() => {
              setEventToEdit(null);
              setIsCreateDrawerOpen(true);
            }}
            className="bg-court-blue hover:bg-court-blue-light h-11 px-6 shadow-md shadow-court-blue/20 transition-all card-hover"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Event
          </Button>
        )}
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-2 border border-border/50 rounded-2xl shadow-sm">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-[400px]">
          <TabsList className="grid w-full grid-cols-2 h-11 bg-muted/50 p-1">
            <TabsTrigger value="active" className="text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-court-blue data-[state=active]:shadow-sm">
              Active Events
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-court-blue data-[state=active]:shadow-sm">
              Completed
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search events by name or venue..." 
            className="pl-9 h-11 bg-muted/20 border-transparent focus-visible:border-court-blue focus-visible:ring-1 focus-visible:ring-court-blue/50 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Event Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          exit="hidden"
          className="grid gap-6 grid-cols-1 lg:grid-cols-2"
        >
          {activeTab === "active" && (
            activeEvents.length > 0 ? (
              activeEvents.map((event) => (
                <motion.div key={event.id} variants={itemVariants}>
                  <EventCard 
                    event={event} 
                    userStatus={getUserStatus(event.id)}
                    onAction={handleEventAction} 
                    onViewDetails={(e) => setSelectedEvent(e)}
                  />
                </motion.div>
              ))
            ) : (
              <EmptyState type="active" />
            )
          )}

          {activeTab === "completed" && (
            completedEvents.length > 0 ? (
              completedEvents.map((event) => (
                <motion.div key={event.id} variants={itemVariants}>
                  <EventCard 
                    event={event} 
                    userStatus={getUserStatus(event.id)}
                    onAction={handleEventAction} 
                    onViewDetails={(e) => setSelectedEvent(e)}
                  />
                </motion.div>
              ))
            ) : (
              <EmptyState type="completed" />
            )
          )}
        </motion.div>
      </AnimatePresence>

      <CreateEventDrawer 
        open={isCreateDrawerOpen} 
        onOpenChange={(open) => {
          setIsCreateDrawerOpen(open);
          if (!open) setEventToEdit(null);
        }}
        eventToEdit={eventToEdit}
      />

      {selectedEvent && (
        <EventDetailsModal
          open={!!selectedEvent}
          onOpenChange={(open) => {
            if (!open) setSelectedEvent(null);
          }}
          event={selectedEvent}
        />
      )}



      <SettleEventModal
        open={isSettleModalOpen}
        onOpenChange={(open) => {
          setIsSettleModalOpen(open);
          if (!open) setEventToSettle(null);
        }}
        event={eventToSettle}
      />

      <CancelSlotModal
        open={!!eventToCancel}
        onOpenChange={(open) => {
          if (!open) setEventToCancel(null);
        }}
        event={eventToCancel?.event || null}
        status={eventToCancel?.status || "registered"}
        userStatuses={userStatuses}
        user={user}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["events"] });
          queryClient.invalidateQueries({ queryKey: ["playerStatuses", user?.id] });
          queryClient.invalidateQueries({ queryKey: ["eventDetails"] });
          queryClient.invalidateQueries({ queryKey: ["wallet-history"] });
          queryClient.invalidateQueries({ queryKey: ["activityLogs"] });
          refreshUser();
        }}
      />

      {/* Organizer/SuperAdmin Cancel Event Confirmation Dialog */}
      <Dialog open={!!eventToCancelEntire} onOpenChange={(open) => !open && !isCancellingEvent && setEventToCancelEntire(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 text-xl font-bold">
              <XCircle className="h-5 w-5" /> Cancel Event
            </DialogTitle>
            <DialogDescription className="pt-2 text-left text-foreground text-sm font-medium">
              Are you sure you want to cancel this event? This will mark the session as cancelled and immediately issue a full refund to all registered players.
            </DialogDescription>
            {eventToCancelEntire && (
              <div className="p-3.5 bg-muted/40 rounded-xl border border-border space-y-1.5 mt-3">
                <p className="font-bold text-foreground text-base">{eventToCancelEntire.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Calendar className="h-4 w-4 text-court-blue" />
                  {format(new Date(eventToCancelEntire.eventDate), "EEEE, MMMM d, yyyy")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Registered Players: <span className="font-semibold text-foreground">{eventToCancelEntire.registeredPlayersCount}</span>
                </p>
              </div>
            )}
          </DialogHeader>
          <DialogFooter className="flex sm:justify-end gap-3 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setEventToCancelEntire(null)} 
              disabled={isCancellingEvent}
              className="w-full sm:w-auto font-semibold"
            >
              Keep Event
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmCancelEntireEvent} 
              disabled={isCancellingEvent}
              className="w-full sm:w-auto font-semibold bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isCancellingEvent ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cancelling Event...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" /> Confirm Cancellation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ type }: { type: "active" | "completed" }) {
  return (
    <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
      <motion.div 
        animate={{ y: [0, -10, 0] }} 
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="text-6xl mb-6 opacity-80"
      >
        {type === "active" ? "🏸" : "🏆"}
      </motion.div>
      <h3 className="text-xl font-heading font-bold text-foreground mb-2">
        {type === "active" ? "No Active Events" : "No Completed Events"}
      </h3>
      <p className="text-muted-foreground max-w-sm">
        {type === "active" 
          ? "There are currently no upcoming events scheduled. Check back later or create a new event."
          : "There are no past events to display in the history log yet."}
      </p>
    </div>
  );
}
