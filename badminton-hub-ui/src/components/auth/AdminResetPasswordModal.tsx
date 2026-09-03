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
import api from "@/lib/api";
import { toast } from "sonner";

interface AdminResetPasswordModalProps {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password")
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export function AdminResetPasswordModal({ userId, userName, open, onOpenChange }: AdminResetPasswordModalProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(formSchema)
  });

  const onSubmit = async (data: any) => {
    try {
      await api.post(`/Auth/${userId}/reset-password`, {
        newPassword: data.newPassword
      });
      toast.success(`Password for ${userName} has been reset successfully.`);
      onOpenChange(false);
      reset();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to reset password.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) reset();
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Force a password reset for <span className="font-semibold text-foreground">{userName}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input 
              type="password" 
              placeholder="••••••••"
              {...register("newPassword")} 
            />
            {errors.newPassword && <span className="text-xs text-match-red">{errors.newPassword.message?.toString()}</span>}
          </div>

          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input 
              type="password" 
              placeholder="••••••••"
              {...register("confirmPassword")} 
            />
            {errors.confirmPassword && <span className="text-xs text-match-red">{errors.confirmPassword.message?.toString()}</span>}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-match-red hover:bg-red-600 text-white border-0">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
