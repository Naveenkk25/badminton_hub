import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency, formatDateTime } from "@/lib/constants";
import api from "@/lib/api";
import { History, X, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
  entityType: "player" | "organizer";
  entityName: string;
}

export function TransactionHistoryModal({
  isOpen,
  onClose,
  entityId,
  entityType,
  entityName,
}: TransactionHistoryModalProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && entityId) {
      fetchHistory();
    }
  }, [isOpen, entityId]);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const endpoint =
        entityType === "player"
          ? `/Players/${entityId}/wallet`
          : `/Organizers/${entityId}/credits`;
      const response = await api.get(endpoint);
      setTransactions(response.data);
    } catch (error) {
      console.error("Failed to fetch transaction history", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-surface border border-border shadow-lg rounded-2xl w-full max-w-lg overflow-hidden relative flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-border/50 bg-muted/20">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-court-blue/10 text-court-blue">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-heading">
                    Transactions
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">
                    {entityName}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto">
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading history...
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  No transactions found.
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((tx: any) => {
                    const isCredit =
                      tx.type === "Credit" ||
                      tx.type === "Refund" ||
                      tx.type === "Purchase";
                    const amount = tx.amount ?? tx.creditsChanged ?? 0;

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-2 rounded-full ${
                              isCredit
                                ? "bg-court-green/10 text-court-green"
                                : "bg-match-red/10 text-match-red"
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownRight className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">
                              {tx.description || tx.action || tx.type}
                            </p>
                            <p className="text-xs text-muted-foreground font-medium mt-1">
                              {formatDateTime(tx.timestamp)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-mono font-bold ${
                              isCredit ? "text-court-green" : "text-match-red"
                            }`}
                          >
                            {isCredit ? "+" : "-"}
                            {entityType === "player"
                              ? formatCurrency(Math.abs(amount))
                              : `${Math.abs(amount)} Credits`}
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
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
