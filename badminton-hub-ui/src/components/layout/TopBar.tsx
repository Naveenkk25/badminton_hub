"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "next-themes";
import { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { motion, useScroll } from "framer-motion";
import { Moon, Sun, LogOut, User, Settings, Bell, Menu, Clock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";

interface TopBarProps {
  title: string;
  onMenuClick?: () => void;
}

export function TopBar({ title, onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString("en-US", { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return scrollY.onChange((latest) => {
      setIsScrolled(latest > 10);
    });
  }, [scrollY]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <motion.header
      className={cn(
        "sticky top-0 z-30 flex h-16 w-full items-center justify-between px-6 transition-all duration-200",
        isScrolled
          ? "bg-background/80 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <button 
            onClick={onMenuClick}
            className="md:hidden rounded-lg p-2 -ml-2 text-muted-foreground hover:bg-accent transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
        <h1 className="text-xl font-heading font-bold tracking-tight text-foreground">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Player Wallet Badge */}
        {user?.role === "Player" && (
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-court-green/10 px-4 py-1.5 border border-court-green/20">
            <span className="text-sm font-medium text-court-green">
              Balance:
            </span>
            <span className="font-mono font-bold text-court-green">
              {new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 }).format(user.walletBalance || 0)}
            </span>
          </div>
        )}

        {/* Current Date Time Display */}
        {currentTime && (
          <div className="hidden lg:flex items-center gap-2 rounded-full bg-accent/50 px-4 py-1.5 border border-border/50 text-sm font-medium text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {currentTime}
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <div className="flex items-center gap-3 rounded-full py-1 pl-1 pr-3 hover:bg-accent transition-colors border border-transparent hover:border-border">
              <Avatar className="h-8 w-8 ring-2 ring-court-blue/20">
                <AvatarImage src={user?.profilePictureUrl ? `http://localhost:5032${user.profilePictureUrl}` : undefined} />
                <AvatarFallback className="bg-court-blue text-white text-xs font-bold">
                  {user ? getInitials(user.fullName) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start text-left">
                <span className="text-sm font-semibold leading-none text-foreground">
                  {user?.fullName || "User"}
                </span>
                <span className="text-xs font-medium text-muted-foreground mt-1">
                  {user?.role || "Role"}
                </span>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-1">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.fullName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.phoneNumber || user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user?.role !== "SuperAdmin" && (
                <>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => window.location.href='/profile'}>
                    <User className="mr-2 h-4 w-4" />
                    <span>View Profile</span>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem className="cursor-pointer" onClick={() => setIsPasswordModalOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Change Password</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => {
                e.preventDefault();
                logout();
              }} 
              className="cursor-pointer text-match-red focus:text-match-red"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ChangePasswordModal 
        open={isPasswordModalOpen} 
        onOpenChange={setIsPasswordModalOpen} 
      />
    </motion.header>
  );
}
