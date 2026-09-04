"use client";

import React from "react";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Building2, CalendarDays, DollarSign, Wallet, Clock, MapPin } from "lucide-react";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/constants";
import { format } from "date-fns";

export default function DashboardPage() {
  const { user } = useAuth();

  // Organizers (Super Admin only)
  const { data: rawOrganizers = [] } = useQuery({
    queryKey: ["organizers"],
    queryFn: async () => {
      const res = await api.get("/Organizers?pageSize=100");
      const list = res.data.data || res.data || [];
      return Array.isArray(list) ? list.map((item: any) => {
        if (item?.org) {
          return {
            ...item.org,
            status: item.user?.status ?? item.org?.status ?? "Active",
            userId: item.user?.id ?? item.org?.userId,
            org: item.org,
            user: item.user,
          };
        }
        return item;
      }) : [];
    },
    enabled: user?.role === "SuperAdmin",
    staleTime: 0,
  });

  const organizers = (rawOrganizers || []).map((item: any) => {
    if (item?.org) {
      return {
        ...item.org,
        status: item.user?.status ?? item.org?.status ?? "Active",
        userId: item.user?.id ?? item.org?.userId,
        org: item.org,
        user: item.user,
      };
    }
    return item;
  });

  // Players (Super Admin only)
  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const res = await api.get("/Players");
      return res.data.data || res.data;
    },
    enabled: user?.role === "SuperAdmin",
  });

  // Events (All roles)
  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const res = await api.get("/Events");
      return res.data.data || res.data;
    },
  });

  // Organizer details for current logged-in Organizer
  const { data: orgData } = useQuery({
    queryKey: ["my-org-info", user?.id],
    queryFn: async () => {
      const response = await api.get("/Organizers?pageSize=100");
      const list = response.data.data || response.data || [];
      const match = list.find((item: any) => {
        const contact = item?.org?.contactNumber || item?.contactNumber;
        return contact === user?.phoneNumber;
      });
      return match?.org || match || null;
    },
    enabled: !!user?.phoneNumber && user?.role === "Organizer",
  });

  // Player personal profile data (wallet, etc.)
  const { data: playerData } = useQuery({
    queryKey: ["playerData", user?.id],
    queryFn: async () => (await api.get(`/Players/${user?.id}`)).data,
    enabled: user?.role === "Player",
  });

  // Player registration statuses for upcoming events
  const { data: userStatuses = [] } = useQuery<any[]>({
    queryKey: ["playerStatuses", user?.id],
    queryFn: async () => {
      if (!user || user.role !== "Player") return [];
      const response = await api.get(`/Events/player/${user.id}/registrations-status`);
      return response.data || [];
    },
    enabled: !!user?.id && user?.role === "Player",
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  // Helper to format event date & time
  const formatEventDate = (dateStr: string, timeStr?: string) => {
    try {
      const d = new Date(dateStr);
      const formattedDate = format(d, "EEE, MMM d, yyyy");
      if (timeStr) {
        return `${formattedDate} • ${timeStr.substring(0, 5)}`;
      }
      return formattedDate;
    } catch {
      return dateStr;
    }
  };

  // Helper for Super Admin organizer lookup
  const getOrganizerName = (organizerId: string, fallbackName?: string) => {
    if (fallbackName) return fallbackName;
    const match = organizers.find((o: any) => (o.org?.id || o.id) === organizerId);
    return match?.name || match?.org?.name || match?.user?.fullName || "Organizer";
  };

  // -------------------------------------------------------------
  // SUPER ADMIN COMPUTED DATA
  // -------------------------------------------------------------
  const allUpcomingEvents = events
    .filter((e: any) => e.status !== "Completed" && e.status !== "Cancelled")
    .sort((a: any, b: any) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  const totalUpcomingRevenue = allUpcomingEvents.reduce(
    (sum: number, e: any) => sum + (e.registeredPlayersCount || 0) * (e.reservedFee || 0),
    0
  );

  // -------------------------------------------------------------
  // ORGANIZER COMPUTED DATA
  // -------------------------------------------------------------
  const orgEvents = events.filter((e: any) => e.organizerId === orgData?.id);
  const nonCancelledOrgEvents = orgEvents.filter((e: any) => e.status !== "Cancelled");
  const upcomingOrgEvents = nonCancelledOrgEvents
    .filter((e: any) => e.status !== "Completed")
    .sort((a: any, b: any) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  const orgTotalRegistrations = nonCancelledOrgEvents.reduce(
    (sum: number, e: any) => sum + (e.registeredPlayersCount || 0),
    0
  );

  const orgTotalRevenue = nonCancelledOrgEvents.reduce(
    (sum: number, e: any) => sum + (e.registeredPlayersCount || 0) * (e.reservedFee || 0),
    0
  );

  // -------------------------------------------------------------
  // PLAYER COMPUTED DATA
  // -------------------------------------------------------------
  const playerUpcomingEvents = events
    .filter((e: any) => e.status !== "Completed" && e.status !== "Cancelled")
    .map((e: any) => {
      const statusObj = userStatuses.find(
        (u: any) => u.eventId?.toLowerCase() === e.id?.toLowerCase()
      );
      if (!statusObj) return null;
      return {
        ...e,
        playerStatus: statusObj.status,
        waitlistPosition: statusObj.position,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-heading font-bold tracking-tight">
          Welcome back, {user?.fullName?.split(" ")[0] || "User"}!
        </h2>
        <p className="text-muted-foreground text-sm font-medium">
          Here is what you need to know right now.
        </p>
      </div>

      {/* ========================================================= */}
      {/* SUPER ADMIN DASHBOARD                                     */}
      {/* 3 cards: Organizers, Players, Upcoming Events .Revenue    */}
      {/* Table: Upcoming Events (Event | Organizer | Date | Regs)  */}
      {/* ========================================================= */}
      {user?.role === "SuperAdmin" && (
        <div className="space-y-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-5 grid-cols-1 md:grid-cols-3"
          >
            <StatCard
              title="Organizers"
              value={organizers.length}
              subtext="Active registered organizers"
              icon={<Building2 className="h-5 w-5 text-court-blue" />}
              variants={itemVariants}
            />
            <StatCard
              title="Players"
              value={players.length}
              subtext="Total registered athletes"
              icon={<Users className="h-5 w-5 text-court-green" />}
              variants={itemVariants}
            />
            <StatCard
              title="Upcoming Events"
              value={allUpcomingEvents.length}
              badge={`${formatCurrency(totalUpcomingRevenue)} Revenue`}
              subtext="Across upcoming platform events"
              icon={<CalendarDays className="h-5 w-5 text-shuttlecock-gold" />}
              variants={itemVariants}
            />
          </motion.div>

          {/* Upcoming Events Table */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-lg font-heading font-bold flex items-center justify-between">
                <span>Upcoming Events</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {allUpcomingEvents.length} scheduled
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {allUpcomingEvents.length === 0 ? (
                <EmptyTableState message="No upcoming events scheduled right now." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/40">
                      <TableHead className="w-[30%]">Event</TableHead>
                      <TableHead className="w-[25%]">Organizer</TableHead>
                      <TableHead className="w-[25%]">Date</TableHead>
                      <TableHead className="w-[20%] text-right">Registrations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUpcomingEvents.map((ev: any) => (
                      <TableRow key={ev.id} className="border-border/30 hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold text-foreground">
                          <div>{ev.name}</div>
                          {ev.venue && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 font-normal">
                              <MapPin className="h-3 w-3" /> {ev.venue}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-medium">
                          {getOrganizerName(ev.organizerId, ev.organizerName)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                            {formatEventDate(ev.eventDate, ev.startTime)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span className="text-foreground font-semibold">
                            {ev.registeredPlayersCount || 0}
                          </span>
                          <span className="text-muted-foreground text-xs"> / {ev.maxPlayers}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* ORGANIZER DASHBOARD                                       */}
      {/* 3 cards: My Events, Registrations, Revenue                */}
      {/* Table: Upcoming Events (Event | Date | Registrations)     */}
      {/* ========================================================= */}
      {user?.role === "Organizer" && (
        <div className="space-y-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-5 grid-cols-1 md:grid-cols-3"
          >
            <StatCard
              title="My Events"
              value={upcomingOrgEvents.length}
              subtext="Upcoming scheduled events"
              icon={<CalendarDays className="h-5 w-5 text-court-blue" />}
              variants={itemVariants}
            />
            <StatCard
              title="Registrations"
              value={orgTotalRegistrations}
              subtext="Total participants booked"
              icon={<Users className="h-5 w-5 text-court-green" />}
              variants={itemVariants}
            />
            <StatCard
              title="Revenue"
              value={formatCurrency(orgTotalRevenue)}
              subtext="Total entry fees collected"
              icon={<DollarSign className="h-5 w-5 text-shuttlecock-gold" />}
              variants={itemVariants}
            />
          </motion.div>

          {/* Upcoming Events Table */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-lg font-heading font-bold flex items-center justify-between">
                <span>Upcoming Events</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {upcomingOrgEvents.length} scheduled
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingOrgEvents.length === 0 ? (
                <EmptyTableState message="No upcoming events scheduled. Create one to get started." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/40">
                      <TableHead className="w-[45%]">Event</TableHead>
                      <TableHead className="w-[35%]">Date</TableHead>
                      <TableHead className="w-[20%] text-right">Registrations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingOrgEvents.map((ev: any) => (
                      <TableRow key={ev.id} className="border-border/30 hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold text-foreground">
                          <div>{ev.name}</div>
                          {ev.venue && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 font-normal">
                              <MapPin className="h-3 w-3" /> {ev.venue}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                            {formatEventDate(ev.eventDate, ev.startTime)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span className="text-foreground font-semibold">
                            {ev.registeredPlayersCount || 0}
                          </span>
                          <span className="text-muted-foreground text-xs"> / {ev.maxPlayers}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* PLAYER DASHBOARD                                          */}
      {/* 2 cards: My Upcoming Events, Wallet Balance               */}
      {/* Table: My Upcoming Events (Event | Date | Status)         */}
      {/* ========================================================= */}
      {user?.role === "Player" && (
        <div className="space-y-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-5 grid-cols-1 md:grid-cols-2"
          >
            <StatCard
              title="My Upcoming Events"
              value={playerUpcomingEvents.length}
              subtext="Events registered or waitlisted"
              icon={<CalendarDays className="h-5 w-5 text-court-blue" />}
              variants={itemVariants}
            />
            <StatCard
              title="Wallet Balance"
              value={formatCurrency(playerData?.walletBalance ?? user?.walletBalance ?? 0)}
              subtext="Available balance for bookings"
              icon={<Wallet className="h-5 w-5 text-court-green" />}
              variants={itemVariants}
            />
          </motion.div>

          {/* My Upcoming Events Table */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-lg font-heading font-bold flex items-center justify-between">
                <span>My Upcoming Events</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {playerUpcomingEvents.length} active
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {playerUpcomingEvents.length === 0 ? (
                <EmptyTableState message="You have no upcoming events. Check out the Events page to book a slot." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/40">
                      <TableHead className="w-[45%]">Event</TableHead>
                      <TableHead className="w-[35%]">Date</TableHead>
                      <TableHead className="w-[20%] text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playerUpcomingEvents.map((ev: any) => (
                      <TableRow key={ev.id} className="border-border/30 hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold text-foreground">
                          <div>{ev.name}</div>
                          {ev.venue && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 font-normal">
                              <MapPin className="h-3 w-3" /> {ev.venue}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                            {formatEventDate(ev.eventDate, ev.startTime)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {ev.playerStatus === "registered" ? (
                            <Badge className="bg-court-green/15 text-court-green border border-court-green/20 hover:bg-court-green/20 font-semibold px-2.5 py-0.5 text-xs">
                              Registered
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 font-semibold px-2.5 py-0.5 text-xs">
                              Waitlist #{ev.waitlistPosition || 1}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// REUSABLE MINIMAL STAT CARD
// -------------------------------------------------------------
function StatCard({
  title,
  value,
  subtext,
  badge,
  icon,
  variants,
}: {
  title: string;
  value: string | number;
  subtext?: string;
  badge?: string;
  icon: React.ReactNode;
  variants?: any;
}) {
  return (
    <motion.div variants={variants}>
      <Card className="border-border/50 shadow-sm bg-card hover:border-border transition-all relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </CardTitle>
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
            {icon}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-3xl font-mono font-bold tracking-tight text-foreground">
              {value}
            </div>
            {badge && (
              <Badge variant="secondary" className="bg-court-green/10 text-court-green font-semibold text-xs border-court-green/20">
                {badge}
              </Badge>
            )}
          </div>
          {subtext && (
            <p className="text-xs text-muted-foreground mt-1.5 font-medium">{subtext}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// -------------------------------------------------------------
// EMPTY TABLE STATE
// -------------------------------------------------------------
function EmptyTableState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center mb-3">
        <CalendarDays className="h-6 w-6 text-muted-foreground/40" />
      </div>
      <p className="text-sm text-muted-foreground font-medium max-w-sm">{message}</p>
    </div>
  );
}
