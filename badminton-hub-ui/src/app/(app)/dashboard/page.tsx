"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, CalendarDays, ScrollText, CheckCircle2, MapPin, Clock, ArrowRight } from "lucide-react";
import api from "@/lib/api";

import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDateTime } from "@/lib/constants";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: organizers = [] } = useQuery({
    queryKey: ["organizers"],
    queryFn: async () => {
      const res = await api.get("/Organizers");
      return res.data.data || res.data;
    },
    enabled: user?.role === "SuperAdmin"
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const res = await api.get("/Players");
      return res.data.data || res.data;
    },
    enabled: user?.role === "SuperAdmin"
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const res = await api.get("/Events");
      return res.data.data || res.data;
    },
  });

  const { data: activityLogs = [] } = useQuery({
    queryKey: ["activityLogs", user?.id],
    queryFn: async () => {
      const res = await api.get(`/ActivityLogs/player/${user?.id}`);
      return res.data.data || res.data;
    },
    enabled: !!user?.id && user?.role === "Player"
  });

  const { data: globalAuditLogs = [] } = useQuery({
    queryKey: ["globalAuditLogs"],
    queryFn: async () => {
      const res = await api.get("/AuditLogs");
      return res.data.data || res.data;
    },
    enabled: user?.role === "SuperAdmin"
  });

  const { data: globalActivityLogs = [] } = useQuery({
    queryKey: ["globalActivityLogs"],
    queryFn: async () => {
      const res = await api.get("/ActivityLogs");
      return res.data.data || res.data;
    },
    enabled: user?.role === "Organizer"
  });

  const { data: orgData } = useQuery({
    queryKey: ["my-org-info", user?.id],
    queryFn: async () => {
      const response = await api.get("/Organizers");
      const list = response.data.data || response.data;
      return list.find((item: any) => item.org.contactNumber === user?.phoneNumber)?.org;
    },
    enabled: !!user?.phoneNumber && user?.role === "Organizer"
  });

  const { data: playerData } = useQuery({
    queryKey: ["playerData", user?.id],
    queryFn: async () => (await api.get(`/Players/${user?.id}`)).data,
    enabled: user?.role === "Player"
  });
  
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  const activeEventsCount = events.filter((e: any) => e.status === "Open" || e.status === "Full" || e.status === "Locked").length;
  // Approximating registrations by registeredPlayersCount on events
  const totalRegistrations = events.reduce((sum: number, e: any) => sum + (e.registeredPlayersCount || 0), 0);

  // Organizer specific data
  const orgEvents = events.filter((e: any) => e.organizerId === orgData?.id);
  const orgActiveEventsCount = orgEvents.filter((e: any) => e.status === "Open" || e.status === "Full" || e.status === "Locked").length;
  const orgTotalParticipants = orgEvents.reduce((sum: number, e: any) => sum + (e.registeredPlayersCount || 0), 0);
  const orgTotalRevenue = orgEvents.reduce((sum: number, e: any) => sum + ((e.registeredPlayersCount || 0) * (e.reservedFee || 0)), 0);
  const upcomingOrgEvents = orgEvents
    .filter((e: any) => e.status === "Open" || e.status === "Full" || e.status === "Locked")
    .sort((a: any, b: any) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-heading font-bold tracking-tight">
          Welcome back, {user?.fullName?.split(" ")[0] || "User"}!
        </h2>
        <p className="text-muted-foreground">
          Here&apos;s an overview of what&apos;s happening today.
        </p>
      </div>

      {user?.role === "SuperAdmin" && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <KpiCard
            title="Total Organizers"
            value={organizers.length}
            trend="Active platform partners"
            icon={<Building2 className="h-5 w-5" />}
            color="bg-court-blue"
            textColor="text-court-blue"
            variants={itemVariants}
          />
          <KpiCard
            title="Total Players"
            value={players.length}
            trend="Registered athletes"
            icon={<Users className="h-5 w-5" />}
            color="bg-court-green"
            textColor="text-court-green"
            variants={itemVariants}
          />
          <KpiCard
            title="Active Events"
            value={activeEventsCount}
            trend="Open and full events"
            icon={<CalendarDays className="h-5 w-5" />}
            color="bg-shuttlecock-gold"
            textColor="text-shuttlecock-gold"
            variants={itemVariants}
          />
          <KpiCard
            title="Total Registrations"
            value={totalRegistrations}
            trend="Across all time"
            icon={<ScrollText className="h-5 w-5" />}
            color="bg-match-red"
            textColor="text-match-red"
            variants={itemVariants}
          />
        </motion.div>
      )}

      {user?.role === "Organizer" && (
        <div className="space-y-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-4 md:grid-cols-3"
          >
            <KpiCard
              title="Active Events"
              value={orgActiveEventsCount}
              trend="Currently open or full"
              icon={<CalendarDays className="h-5 w-5" />}
              color="bg-shuttlecock-gold"
              textColor="text-shuttlecock-gold"
              variants={itemVariants}
            />
            <KpiCard
              title="Total Participants"
              value={orgTotalParticipants}
              trend="Across all events"
              icon={<Users className="h-5 w-5" />}
              color="bg-court-blue"
              textColor="text-court-blue"
              variants={itemVariants}
            />
            <KpiCard
              title="Total Revenue"
              value={formatCurrency(orgTotalRevenue)}
              trend="Estimated gross revenue"
              icon={<ScrollText className="h-5 w-5" />}
              color="bg-court-green"
              textColor="text-court-green"
              variants={itemVariants}
            />
          </motion.div>

          <div className="grid gap-6 md:grid-cols-1">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center justify-between">
                  Upcoming Events
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingOrgEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-border/50 rounded-xl">
                    <CalendarDays className="h-8 w-8 text-muted-foreground mb-3 opacity-20" />
                    <p className="text-muted-foreground font-medium">No upcoming events.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingOrgEvents.map((ev: any) => (
                      <div key={ev.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
                        <div>
                          <p className="font-semibold">{ev.name}</p>
                          <div className="flex items-center text-xs text-muted-foreground mt-1 gap-3">
                            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3"/>{new Date(ev.eventDate).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{ev.startTime.substring(0,5)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{ev.registeredPlayersCount} / {ev.maxPlayers}</p>
                          <p className="text-xs text-muted-foreground">Players</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {user?.role === "Player" && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          {/* Player specific KPIs */}
          <KpiCard
            title="Available Balance"
            value={formatCurrency(playerData?.walletBalance ?? user?.walletBalance ?? 0)}
            trend="Current wallet funds"
            icon={<ScrollText className="h-5 w-5" />}
            color="bg-court-green"
            textColor="text-court-green"
            variants={itemVariants}
          />
        </motion.div>
      )}

      {user?.role === "Player" && (
        <div className="grid gap-4 md:grid-cols-1">
          <Card className="col-span-1 border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                let logsToDisplay: any[] = [];
                let isAuditLog = false;

                if (user?.role === "Player") {
                  logsToDisplay = activityLogs;
                }

                if (logsToDisplay.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="bg-muted p-4 rounded-full mb-4">
                        <ScrollText className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium">
                        No History Yet
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Your recent activities will appear here.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="relative border-l border-muted-foreground/20 ml-4 space-y-6 pb-4">
                    {logsToDisplay.map((log: any, idx: number) => {
                      let colorClass = "bg-blue-500";
                      let actionText = log.action;
                      let descriptionText = "";

                      if (isAuditLog) {
                        descriptionText = `${log.userFullName} - ${log.entityName} ${log.action}`;
                        if (log.action.includes("Create") || log.action.includes("Add")) colorClass = "bg-green-500";
                        else if (log.action.includes("Update") || log.action.includes("Change")) colorClass = "bg-blue-500";
                        else if (log.action.includes("Delete") || log.action.includes("Remove")) colorClass = "bg-red-500";
                        else colorClass = "bg-emerald-500";
                      } else {
                        descriptionText = log.description;
                        if (log.action.includes("Joined") || log.action.includes("Waitlisted") || log.action.includes("Register")) {
                          colorClass = "bg-green-500";
                        } else if (log.action.includes("Cancel")) {
                          colorClass = "bg-red-500";
                        } else if (log.action.includes("Credit") || log.action.includes("Refund")) {
                          colorClass = "bg-emerald-500";
                        } else if (log.action.includes("Debit") || log.action.includes("Paid")) {
                          colorClass = "bg-orange-500";
                        }
                      }

                      return (
                        <div key={log.id || idx} className="relative pl-6">
                          <span className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full ${colorClass} ring-4 ring-background`} />
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold">{actionText}</h4>
                              <span className="text-xs text-muted-foreground">
                                {formatDateTime(log.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{descriptionText}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function KpiCard({ title, value, trend, icon, color, textColor, variants }: any) {
  return (
    <motion.div variants={variants}>
      <Card className="overflow-hidden border-border/50 shadow-sm card-hover relative group">
        {/* Subtle background decoration */}
        <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 transition-transform group-hover:scale-150 ${color}`} />
        
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={`p-2 rounded-lg bg-background shadow-sm border border-border/50 ${textColor}`}>
            {icon}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-mono font-bold tracking-tight">{value}</div>
          <p className="text-xs text-muted-foreground mt-1 font-medium">{trend}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
