"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Phone, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  mobileNumber: z.string().min(10, "Valid mobile number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isError, setIsError] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsError(false);
    try {
      const user = await login(data);
      if (user.status === "PendingActivation") {
        toast.info("Please activate your account by setting a new password.");
        router.push(`/activate?mobile=${data.mobileNumber}`);
      } else {
        toast.success("Login successful!");
        router.push("/dashboard");
      }
    } catch (error: any) {
      setIsError(true);
      const errorMessage = error.response?.data?.message || "Invalid credentials. Please try again.";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Side: Decorative (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center items-center relative overflow-hidden bg-gradient-to-br from-[#0F172A] to-[#1E40AF] text-white">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 court-pattern opacity-10"></div>
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-20 w-96 h-96 bg-court-blue-light/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-shuttlecock-gold/20 rounded-full blur-3xl"
        />

        {/* Content */}
        <div className="z-10 flex flex-col items-center text-center px-8">
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [-10, 10, -10] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="text-8xl mb-8"
          >
            🏸
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl font-heading font-bold mb-4 tracking-tight"
          >
            Badminton Hub
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-blue-100 max-w-md font-medium"
          >
            Professional Tournament & Player Management Platform
          </motion.p>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12">
        {/* Mobile Logo Header */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <div className="text-5xl mb-4">🏸</div>
          <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">
            Badminton Hub
          </h1>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <motion.div
            animate={isError ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            <Card className="border-border/50 shadow-xl shadow-court-blue/5">
              <CardHeader className="space-y-2 text-center pb-6">
                <CardTitle className="text-2xl font-bold font-heading text-foreground">
                  Welcome Back
                </CardTitle>
                <CardDescription className="text-base">
                  Sign in to your account to continue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber">Mobile Number</Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Phone className="h-5 w-5" />
                      </div>
                      <Input
                        id="mobileNumber"
                        placeholder="Enter mobile number"
                        className="pl-10 h-12"
                        {...register("mobileNumber")}
                      />
                    </div>
                    {errors.mobileNumber && (
                      <p className="text-sm text-match-red mt-1">
                        {errors.mobileNumber.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                    </div>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Lock className="h-5 w-5" />
                      </div>
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-12"
                        {...register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-match-red mt-1">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold bg-court-blue hover:bg-court-blue-light transition-colors"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
