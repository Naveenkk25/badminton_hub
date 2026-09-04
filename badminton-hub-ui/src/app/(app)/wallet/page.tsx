"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { ArrowUpRight, ArrowDownRight, History, Wallet as WalletIcon, DollarSign, X } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/constants";
import { format } from "date-fns";

export default function WalletPage() {
  const { user } = useAuth();
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["wallet-history", user?.id],
    queryFn: async () => (await api.get(`/Players/${user?.id}/wallet`)).data,
    enabled: !!user?.id
  });

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-shuttlecock-gold/10 text-shuttlecock-gold"
          >
            <WalletIcon className="h-6 w-6" />
          </motion.div>
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">My Wallet</h2>
            <p className="text-muted-foreground font-medium">Manage your balance and view transaction history.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Wallet Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-1"
        >
          <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-court-blue to-[#0F172A] text-white relative h-[200px] flex flex-col justify-between p-6">
            <div className="absolute inset-0 court-pattern opacity-10 mix-blend-overlay"></div>
            
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-blue-200 text-sm font-medium uppercase tracking-wider mb-1">Available Balance</p>
                <div className="text-3xl font-mono font-bold">
                  {formatCurrency(user?.walletBalance || 0)}
                </div>
              </div>
              <WalletIcon className="h-8 w-8 opacity-50" />
            </div>

            <div className="relative z-10 flex justify-between items-end">
              <div>
                <p className="text-xs text-blue-200 uppercase tracking-wider mb-1">Player</p>
                <p className="font-semibold">{user?.fullName || "Player Name"}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Transaction History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-2"
        >
          <Card className="h-full border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-court-blue" />
                  Recent Transactions
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  No transactions yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((tx: any) => {
                    const isCredit = tx.type === "Credit" || tx.type === "Refund";
                    const isRefund = tx.type === "Refund";
                    return (
                      <div 
                        key={tx.id} 
                        onClick={() => setSelectedTx(tx)}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50 cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${isCredit ? "bg-court-green/10 text-court-green" : "bg-match-red/10 text-match-red"}`}>
                            {isCredit ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{tx.description}</p>
                            <p className="text-xs text-muted-foreground font-medium">
                              {format(new Date(tx.timestamp), "MMM d, yyyy • h:mm a")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-mono font-bold ${isCredit ? "text-court-green" : "text-match-red"}`}>
                            {isCredit ? "+" : "-"}{formatCurrency(tx.amount)}
                            {isRefund && <span className="ml-1 text-[10px] font-normal bg-court-green/20 text-court-green rounded-full px-1.5 py-0.5">Refund</span>}
                          </div>
                          <div className="flex flex-col items-end text-[10px] text-muted-foreground font-medium mt-1 gap-0.5">
                            <span className="uppercase tracking-wider font-semibold">{tx.type}</span>
                            <span>By: {tx.createdByName || "System"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Transaction Details Popup */}
      <AnimatePresence>
        {selectedTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-border shadow-lg rounded-2xl w-full max-w-md overflow-hidden relative"
            >
              <div className="p-6">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-4 top-4"
                  onClick={() => setSelectedTx(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                <h3 className="text-xl font-bold font-heading mb-6">Transaction Details</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground text-sm">Date & Time</span>
                    <span className="font-medium text-sm">
                      {format(new Date(selectedTx.timestamp), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground text-sm">Type</span>
                    <span className={`font-medium text-sm px-2 py-0.5 rounded-full ${
                      (selectedTx.type === "Credit") ? "text-court-green bg-court-green/10" :
                      (selectedTx.type === "Refund") ? "text-emerald-500 bg-emerald-500/10" :
                      "text-match-red bg-match-red/10"
                    }`}>
                      {selectedTx.type}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground text-sm">Amount</span>
                    <span className="font-bold font-mono">{formatCurrency(selectedTx.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground text-sm">Description</span>
                    <span className="font-medium text-sm text-right max-w-[60%]">{selectedTx.description}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground text-sm">Status</span>
                    <span className="font-medium text-sm text-court-green bg-court-green/10 px-2 py-1 rounded-full">Completed</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
