"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { UserDto } from "@/lib/types";
import { toast } from "sonner";
import { Users, Search, MoreVertical, ShieldAlert, ShieldCheck, Mail, Phone, Wallet, Plus, Loader2, Ban, CreditCard, KeyRound } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/constants";
import { CreatePlayerDrawer } from "@/components/players/CreatePlayerDrawer";
import { CreditDebitModal } from "@/components/players/CreditDebitModal";
import { ChangeCategoryModal } from "@/components/players/ChangeCategoryModal";
import { EditPlayerDrawer } from "@/components/players/EditPlayerDrawer";
import { AdminResetPasswordModal } from "@/components/auth/AdminResetPasswordModal";
import { TransactionHistoryModal } from "@/components/shared/TransactionHistoryModal";
import { History } from "lucide-react";

export default function PlayersPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isDebitModalOpen, setIsDebitModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<UserDto | null>(null);
  const queryClient = useQueryClient();

  const { data: players = [], isLoading } = useQuery<UserDto[]>({
    queryKey: ["players"],
    queryFn: async () => {
      const response = await api.get("/Players");
      return response.data.data || response.data;
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/Players/${id}/suspend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success("Player suspended");
    },
    onError: () => toast.error("Failed to suspend player"),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/Players/${id}/activate-admin`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success("Player activated");
    },
    onError: () => toast.error("Failed to activate player"),
  });

  const filteredPlayers = players.filter(
    (p) => p.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || p.phoneNumber?.includes(searchQuery)
  );

  const handleAddFunds = async (amount: number, remarks: string) => {
    if (!selectedPlayer) return;
    try {
      await api.post(`/Players/${selectedPlayer.id}/wallet/credit`, { amount, description: remarks });
      toast.success("Funds added successfully");
      queryClient.invalidateQueries({ queryKey: ["players"] });
      setIsCreditModalOpen(false);
    } catch (error) {
      toast.error("Failed to add funds");
    }
  };

  const handleDebitFunds = async (amount: number, remarks: string) => {
    if (!selectedPlayer) return;
    try {
      await api.post(`/Players/${selectedPlayer.id}/wallet/debit`, { amount, description: remarks });
      toast.success("Funds deducted successfully");
      queryClient.invalidateQueries({ queryKey: ["players"] });
      setIsDebitModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to deduct funds");
    }
  };

  const handleChangeCategory = async (newCategoryStr: string) => {
    if (!selectedPlayer) return;
    try {
      await api.put(`/Players/${selectedPlayer.id}/category`, { newCategory: Number(newCategoryStr) });
      toast.success("Category updated successfully");
      queryClient.invalidateQueries({ queryKey: ["players"] });
      setIsCategoryModalOpen(false);
    } catch (error) {
      toast.error("Failed to update category");
    }
  };

  const handleEditPlayer = async (data: any) => {
    if (!selectedPlayer) return;
    try {
      await api.put(`/Players/${selectedPlayer.id}`, { 
        fullName: data.fullName,
        mobileNumber: data.mobileNumber,
        email: data.email,
        category: selectedPlayer.category
      });
      toast.success("Player updated successfully");
      queryClient.invalidateQueries({ queryKey: ["players"] });
      setIsEditDrawerOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update player");
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
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-court-green/10 text-court-green"
          >
            <Users className="h-6 w-6" />
          </motion.div>
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">Players Directory</h2>
            <p className="text-muted-foreground font-medium">Manage players, balances, and categories.</p>
          </div>
        </div>

        {(user?.role === "SuperAdmin" || user?.role === "Organizer") && (
          <Button onClick={() => setIsCreateDrawerOpen(true)} className="bg-court-green hover:bg-court-green-light h-11 px-6 shadow-md shadow-court-green/20 transition-all card-hover">
            <Plus className="mr-2 h-5 w-5" />
            Add Player
          </Button>
        )}
      </div>

      <div className="bg-surface p-4 border border-border/50 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search players by name or mobile..." 
            className="pl-9 h-11 bg-muted/20 border-transparent focus-visible:border-court-green focus-visible:ring-1 focus-visible:ring-court-green/50 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-sm font-medium text-muted-foreground bg-muted/30 px-4 py-2 rounded-lg">
          Total Players: <span className="text-foreground font-bold">{filteredPlayers.length}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-court-blue" />
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPlayers.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="overflow-hidden border-border/50 hover:shadow-md transition-shadow group">
                <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 ring-2 ring-border group-hover:ring-court-green/50 transition-all">
                      <AvatarFallback className="bg-court-green/10 text-court-green font-bold">
                        {player.fullName?.split(" ").map(n => n[0]).join("") || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-lg leading-none mb-1">{player.fullName}</h3>
                      <p className="text-sm text-muted-foreground font-mono">{player.phoneNumber}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-6 w-full sm:w-auto">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Category</span>
                      <Badge variant="outline" className="bg-muted text-foreground border-transparent mt-1">
                        {player.category || "Uncategorized"}
                      </Badge>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</span>
                      <Badge 
                        variant="outline" 
                        className={`mt-1 border-transparent ${
                          player.status === "Active" ? "bg-court-green/10 text-court-green" :
                          player.status === "Suspended" ? "bg-match-red/10 text-match-red" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {player.status}
                      </Badge>
                    </div>

                    <div className="flex flex-col items-start sm:items-end sm:ml-4">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Wallet</span>
                      <span className={`font-mono font-bold text-lg ${player.walletBalance < 0 ? "text-match-red" : "text-court-green"}`}>
                        {formatCurrency(player.walletBalance)}
                      </span>
                    </div>

                    <div className="ml-auto sm:ml-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 p-0 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground outline-none transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => {
                            setSelectedPlayer(player);
                            setIsEditDrawerOpen(true);
                          }}>
                            <Users className="mr-2 h-4 w-4" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedPlayer(player);
                            setIsCreditModalOpen(true);
                          }}>
                            <CreditCard className="mr-2 h-4 w-4" /> Add Funds
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedPlayer(player);
                            setIsDebitModalOpen(true);
                          }}>
                            <Wallet className="mr-2 h-4 w-4" /> Deduct Funds
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedPlayer(player);
                            setIsCategoryModalOpen(true);
                          }}>
                            <ShieldAlert className="mr-2 h-4 w-4" /> Change Category
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedPlayer(player);
                            setIsTransactionModalOpen(true);
                          }}>
                            <History className="mr-2 h-4 w-4" /> Transactions
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedPlayer(player);
                            setIsResetPasswordModalOpen(true);
                          }}>
                            <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {player.status === "Suspended" ? (
                            <DropdownMenuItem className="text-court-green focus:text-court-green" onClick={() => activateMutation.mutate(player.id)}>
                              <ShieldCheck className="mr-2 h-4 w-4" /> Activate Player
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="text-match-red focus:text-match-red" onClick={() => suspendMutation.mutate(player.id)}>
                              <Ban className="mr-2 h-4 w-4" /> Suspend Player
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <CreatePlayerDrawer 
        open={isCreateDrawerOpen} 
        onOpenChange={setIsCreateDrawerOpen} 
      />

      {selectedPlayer && (
        <>
          <CreditDebitModal
            open={isCreditModalOpen}
            onOpenChange={setIsCreditModalOpen}
            entityName={selectedPlayer.fullName}
            currentBalance={selectedPlayer.walletBalance}
            actionType="credit"
            entityType="player"
            onSubmit={handleAddFunds}
          />

          <CreditDebitModal
            open={isDebitModalOpen}
            onOpenChange={setIsDebitModalOpen}
            entityName={selectedPlayer.fullName}
            currentBalance={selectedPlayer.walletBalance}
            actionType="debit"
            entityType="player"
            onSubmit={handleDebitFunds}
          />

          <ChangeCategoryModal
            open={isCategoryModalOpen}
            onOpenChange={setIsCategoryModalOpen}
            playerName={selectedPlayer.fullName}
            currentCategory={selectedPlayer.category || ""}
            onSubmit={handleChangeCategory}
          />

          <EditPlayerDrawer
            open={isEditDrawerOpen}
            onOpenChange={setIsEditDrawerOpen}
            player={selectedPlayer}
            onSubmit={handleEditPlayer}
          />

          <AdminResetPasswordModal
            open={isResetPasswordModalOpen}
            onOpenChange={setIsResetPasswordModalOpen}
            userId={selectedPlayer.id}
            userName={selectedPlayer.fullName}
          />

          <TransactionHistoryModal
            isOpen={isTransactionModalOpen}
            onClose={() => setIsTransactionModalOpen(false)}
            entityId={selectedPlayer.id}
            entityType="player"
            entityName={selectedPlayer.fullName}
          />
        </>
      )}
    </div>
  );
}
