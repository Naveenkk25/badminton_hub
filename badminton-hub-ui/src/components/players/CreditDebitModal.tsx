"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/constants";

interface CreditDebitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  currentBalance: number;
  actionType: "credit" | "debit";
  entityType: "organizer" | "player";
  onSubmit: (amount: number, remarks: string) => Promise<void>;
}

const formSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  remarks: z.string().optional()
});

export function CreditDebitModal({
  open,
  onOpenChange,
  entityName,
  currentBalance,
  actionType,
  entityType,
  onSubmit
}: CreditDebitModalProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(formSchema)
  });

  const handleFormSubmit = async (data: any) => {
    const amountNum = Number(data.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return;
    }
    await onSubmit(amountNum, data.remarks || "");
    reset();
  };

  const actionText = actionType === "credit" ? "Add" : "Deduct";
  const unitText = entityType === "organizer" ? "Credits" : "Funds";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{actionText} {unitText}</DialogTitle>
          <DialogDescription>
            {actionType === "credit" ? "Adding" : "Deducting"} {unitText.toLowerCase()} for {entityName}.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 p-3 rounded-lg flex justify-between items-center text-sm mb-4 border border-border/50">
          <span className="text-muted-foreground">Current Balance:</span>
          <span className="font-mono font-bold text-lg">
            {entityType === "organizer" ? `${currentBalance} Credits` : formatCurrency(currentBalance)}
          </span>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input 
              type="number" 
              {...register("amount")} 
              placeholder="e.g. 100" 
              autoFocus
            />
            {errors.amount && <span className="text-xs text-match-red">{errors.amount.message?.toString()}</span>}
          </div>

          <div className="space-y-2">
            <Label>Remarks / Notes</Label>
            <Input 
              {...register("remarks")} 
              placeholder="Optional notes for this transaction..." 
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className={actionType === "credit" ? "bg-court-green hover:bg-court-green/90 text-white" : "bg-match-red hover:bg-match-red/90 text-white"}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm {actionText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
