"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { OrganizerDto } from "@/lib/types";
import { toast } from "sonner";
import { Building2, Search, MoreVertical, ShieldAlert, Plus, Building, Star, Award, Loader2, Ban, KeyRound } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateOrganizerDrawer } from "@/components/organizers/CreateOrganizerDrawer";
import { EditOrganizerDrawer } from "@/components/organizers/EditOrganizerDrawer";
import { AdminResetPasswordModal } from "@/components/auth/AdminResetPasswordModal";

export default function OrganizersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizerDto | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: rawOrganizers = [], isLoading } = useQuery<any[]>({
    queryKey: ["organizers"],
    queryFn: async () => {
      const response = await api.get("/Organizers?pageSize=100");
      const list = response.data.data || response.data || [];
      return Array.isArray(list) ? list.map((item: any) => {
        if (item?.org) {
          return {
            ...item.org,
            status: item.user?.status ?? item.org?.status ?? "Active",
            userId: item.user?.id ?? item.org?.userId,
          };
        }
        return item;
      }) : [];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/Organizers/${id}/suspend`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizers"] });
      await queryClient.refetchQueries({ queryKey: ["organizers"] });
      toast.success("Organizer deactivated successfully");
    },
    onError: () => toast.error("Failed to deactivate organizer"),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/Organizers/${id}/activate`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizers"] });
      await queryClient.refetchQueries({ queryKey: ["organizers"] });
      toast.success("Organizer activated successfully");
    },
    onError: () => toast.error("Failed to activate organizer"),
  });

  // Defensive normalization in case cached data has un-flattened { org, user } objects
  const organizers: OrganizerDto[] = (rawOrganizers || []).map((item: any) => {
    if (item?.org) {
      return {
        ...item.org,
        status: item.user?.status ?? item.org?.status ?? "Active",
        userId: item.user?.id ?? item.org?.userId,
      };
    }
    return item;
  });

  const filteredOrganizers = organizers.filter(
    (o) => (o.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
           (o.contactNumber || "").includes(searchQuery)
  );

  const handleEditOrganizer = async (data: any) => {
    if (!selectedOrg) return;
    try {
      await api.put(`/Organizers/${selectedOrg.id}`, { name: data.name, contactNumber: data.contactNumber });
      toast.success("Organizer updated successfully");
      await queryClient.invalidateQueries({ queryKey: ["organizers"] });
      await queryClient.refetchQueries({ queryKey: ["organizers"] });
      setIsEditDrawerOpen(false);
    } catch (error) {
      toast.error("Failed to update organizer");
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
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-court-blue/10 text-court-blue"
          >
            <Building2 className="h-6 w-6" />
          </motion.div>
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">Organizers</h2>
            <p className="text-muted-foreground font-medium">Manage event organizers, clubs, and credits.</p>
          </div>
        </div>

        <Button onClick={() => setIsCreateDrawerOpen(true)} className="bg-court-blue hover:bg-court-blue-light h-11 px-6 shadow-md shadow-court-blue/20 transition-all card-hover">
          <Plus className="mr-2 h-5 w-5" />
          Add Organizer
        </Button>
      </div>

      <div className="bg-surface p-4 border border-border/50 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search organizers by name..." 
            className="pl-9 h-11 bg-muted/20 border-transparent focus-visible:border-court-blue focus-visible:ring-1 focus-visible:ring-court-blue/50 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-court-blue" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredOrganizers.map((org, index) => (
          <motion.div
            key={org.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="overflow-hidden border-border/50 hover:shadow-md transition-shadow group h-full flex flex-col">
              <div className="h-16 bg-gradient-to-r from-court-blue/20 to-transparent w-full relative">
                 <div className="absolute inset-0 court-pattern opacity-20"></div>
              </div>
              <CardContent className="p-6 pt-0 flex-1 flex flex-col relative">
                
                <div className="flex justify-between items-start -mt-8 mb-4">
                  <Avatar className="h-16 w-16 ring-4 ring-white shadow-sm bg-white">
                    <AvatarFallback className="bg-court-blue text-white text-xl font-bold">
                      {org.name.split(" ").map(n => n[0]).join("").substring(0,2)}
                    </AvatarFallback>
                  </Avatar>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-8 w-8 p-0 mt-2 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground outline-none transition-colors">
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">

                      <DropdownMenuItem onClick={() => {
                        setSelectedOrg(org);
                        setIsEditDrawerOpen(true);
                      }}>Edit Details</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedOrg(org);
                        setIsResetPasswordModalOpen(true);
                      }}>Reset Password</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {org.status === "Suspended" ? (
                        <DropdownMenuItem 
                          className="text-court-green"
                          onClick={() => activateMutation.mutate(org.id)}
                        >
                          Activate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem 
                          className="text-match-red"
                          onClick={() => deactivateMutation.mutate(org.id)}
                        >
                          Deactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mb-6 flex-1">
                  <h3 className="font-bold font-heading text-lg leading-tight mb-1 group-hover:text-court-blue transition-colors">{org.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{org.contactNumber}</p>
                  
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Star className="h-4 w-4 text-shuttlecock-gold fill-shuttlecock-gold" />
                    <span>{"No ratings"}</span>
                    <span className="text-muted-foreground mx-2">•</span>
                    {org.status === "Active" ? (
                      <>
                        <Award className="h-4 w-4 text-court-green" />
                        <span className="text-court-green">Active</span>
                      </>
                    ) : org.status === "Suspended" ? (
                      <>
                        <Ban className="h-4 w-4 text-match-red" />
                        <span className="text-match-red">Suspended</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-4 w-4 text-shuttlecock-gold" />
                        <span className="text-shuttlecock-gold">Inactive</span>
                      </>
                    )}
                  </div>
                </div>


              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      )}

      <CreateOrganizerDrawer 
        open={isCreateDrawerOpen} 
        onOpenChange={setIsCreateDrawerOpen} 
      />

      {selectedOrg && (
        <>

          <EditOrganizerDrawer
            open={isEditDrawerOpen}
            onOpenChange={setIsEditDrawerOpen}
            organizer={selectedOrg}
            onSubmit={handleEditOrganizer}
          />
          <AdminResetPasswordModal
            open={isResetPasswordModalOpen}
            onOpenChange={setIsResetPasswordModalOpen}
            userId={selectedOrg.userId || selectedOrg.id}
            userName={selectedOrg.name}
          />

        </>
      )}
    </div>
  );
}
