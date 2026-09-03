"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Phone, Lock, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const activateSchema = z.object({
  mobileNumber: z.string().min(10, "Valid mobile number is required"),
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ActivateFormValues = z.infer<typeof activateSchema>;

export default function ActivatePage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <ActivatePageContent />
    </React.Suspense>
  );
}

function ActivatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ActivateFormValues>({
    resolver: zodResolver(activateSchema),
    defaultValues: {
      mobileNumber: searchParams.get("mobile") || "",
    }
  });

  const newPasswordValue = watch("newPassword", "");

  // Password strength calculation
  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (!password) return score;
    if (password.length >= 8) score += 20;
    if (/[A-Z]/.test(password)) score += 20;
    if (/[a-z]/.test(password)) score += 20;
    if (/[0-9]/.test(password)) score += 20;
    if (/[^A-Za-z0-9]/.test(password)) score += 20;
    return score;
  };

  const strengthScore = getPasswordStrength(newPasswordValue);

  const getStrengthColor = (score: number) => {
    if (score === 0) return "bg-border";
    if (score <= 40) return "bg-match-red";
    if (score <= 80) return "bg-shuttlecock-gold";
    return "bg-court-green";
  };

  const onSubmit = async (data: ActivateFormValues) => {
    try {
      await api.post("/auth/activate", {
        mobileNumber: data.mobileNumber,
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success("Account activated successfully! Please sign in.");
      router.push("/login");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Activation failed. Please check your credentials.";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Side: Decorative */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center items-center relative overflow-hidden bg-gradient-to-br from-[#1E40AF] to-[#0F172A] text-white">
        <div className="absolute inset-0 court-pattern opacity-10"></div>
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-20 w-96 h-96 bg-court-green/20 rounded-full blur-3xl"
        />

        <div className="z-10 flex flex-col items-center text-center px-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="bg-white/10 p-6 rounded-full mb-8 backdrop-blur-sm border border-white/20"
          >
            <ShieldCheck className="h-20 w-20 text-court-green" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-heading font-bold mb-4 tracking-tight"
          >
            Secure Your Account
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-blue-100 max-w-md font-medium"
          >
            Set your permanent password to activate your Badminton Hub account.
          </motion.p>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 overflow-y-auto">
        {/* Mobile Header */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <div className="bg-court-green/10 p-4 rounded-full mb-4">
            <ShieldCheck className="h-10 w-10 text-court-green" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight text-center">
            Activate Account
          </h1>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-md my-auto"
        >
          <Card className="border-border/50 shadow-xl shadow-court-blue/5">
            <CardHeader className="space-y-2 text-center pb-6">
              <CardTitle className="text-2xl font-bold font-heading text-foreground hidden lg:block">
                Activate Account
              </CardTitle>
              <CardDescription className="text-base">
                Enter your details and set a strong password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                
                {/* Mobile Number */}
                <div className="space-y-2">
                  <Label htmlFor="mobileNumber">Mobile Number</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Phone className="h-5 w-5" />
                    </div>
                    <Input
                      id="mobileNumber"
                      placeholder="Enter mobile number"
                      className="pl-10"
                      {...register("mobileNumber")}
                    />
                  </div>
                  {errors.mobileNumber && (
                    <p className="text-sm text-match-red">{errors.mobileNumber.message}</p>
                  )}
                </div>

                {/* Current (Temp) Password */}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Temporary Password</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Lock className="h-5 w-5" />
                    </div>
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Enter temporary password"
                      className="pl-10 pr-10"
                      {...register("currentPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <p className="text-sm text-match-red">{errors.currentPassword.message}</p>
                  )}
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Permanent Password</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Lock className="h-5 w-5" />
                    </div>
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      {...register("newPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {/* Strength Meter */}
                  <div className="flex gap-1 h-1.5 mt-2">
                    {[20, 40, 60, 80, 100].map((threshold) => (
                      <div
                        key={threshold}
                        className={cn(
                          "h-full flex-1 rounded-full transition-colors duration-300",
                          strengthScore >= threshold ? getStrengthColor(strengthScore) : "bg-border"
                        )}
                      />
                    ))}
                  </div>
                  {errors.newPassword && (
                    <p className="text-sm text-match-red">{errors.newPassword.message}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Lock className="h-5 w-5" />
                    </div>
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      {...register("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-match-red">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-court-green hover:bg-green-600 text-white transition-colors mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    "Activate Account"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
