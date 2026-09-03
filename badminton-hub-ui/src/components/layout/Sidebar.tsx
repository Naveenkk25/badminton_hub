"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarDays,
  FileBarChart,
  ScrollText,
  ClipboardList,
  Wallet,
  Settings,
  LogOut,
  ChevronLeft,
  Circle,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  "building-2": Building2,
  "users": Users,
  "calendar-days": CalendarDays,
  "file-bar-chart": FileBarChart,
  "scroll-text": ScrollText,
  "clipboard-list": ClipboardList,
  "wallet": Wallet,
  "settings": Settings,
};

export const SIDEBAR_WIDTH_EXPANDED = 260;
export const SIDEBAR_WIDTH_COLLAPSED = 72;

interface SidebarProps {
  isMobile?: boolean;
  isOpenMobile?: boolean;
  setIsOpenMobile?: (open: boolean) => void;
  isExpanded?: boolean;
  setIsExpanded?: (expanded: boolean) => void;
}

export function Sidebar({ 
  isMobile = false, 
  isOpenMobile = false, 
  setIsOpenMobile,
  isExpanded = true,
  setIsExpanded
}: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Filter nav items based on user role
  const userRole = user?.role;
  const filteredNavItems = NAV_ITEMS.filter(
    (item) => !userRole || item.roles.includes(userRole)
  );

  const handleLinkClick = () => {
    if (isMobile && setIsOpenMobile) {
      setIsOpenMobile(false);
    }
  };

  const activeWidth = isMobile ? SIDEBAR_WIDTH_EXPANDED : (isExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED);

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobile && isOpenMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpenMobile?.(false)}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          width: activeWidth,
          x: isMobile ? (isOpenMobile ? 0 : -SIDEBAR_WIDTH_EXPANDED) : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "fixed left-0 top-0 h-[100dvh] border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm flex flex-col",
          isMobile ? "z-50" : "z-40"
        )}
      >
      {/* Header Logo */}
      <div className="flex h-16 items-center px-4 shrink-0 overflow-hidden">
        <div className="flex items-center gap-3">
          <motion.div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-court-blue-light text-xl"
            animate={{ rotate: isExpanded ? 0 : 360 }}
            transition={{ duration: 0.5 }}
          >
            🏸
          </motion.div>
          <AnimatePresence mode="popLayout">
            {(isExpanded || isMobile) && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="whitespace-nowrap font-heading text-lg font-bold tracking-tight text-court-blue"
              >
                Badminton Hub
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1 scrollbar-hide">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = ICON_MAP[item.icon] || Circle;

          return (
            <Link key={item.href} href={item.href} onClick={handleLinkClick}>
              <div
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                {/* Active Background Indicator using Framer Motion layoutId */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute inset-0 rounded-lg bg-sidebar-accent"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                
                <div className="relative z-10 flex items-center justify-center">
                  <Icon className={cn("h-5 w-5 shrink-0 transition-transform group-hover:scale-110", isActive && "text-court-blue font-bold")} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                
                <AnimatePresence mode="popLayout">
                  {(isExpanded || isMobile) && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="relative z-10 whitespace-nowrap font-medium text-sm overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <button
          onClick={logout}
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-match-red transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <LogOut className="h-5 w-5 shrink-0 transition-transform group-hover:-translate-x-1" />
          <AnimatePresence mode="popLayout">
            {(isExpanded || isMobile) && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap font-medium text-sm"
              >
                Log Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse Toggle (Desktop Only) */}
      {!isMobile && setIsExpanded && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm hover:bg-sidebar-accent transition-colors z-50"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", !isExpanded && "rotate-180")} />
        </button>
      )}
    </motion.aside>
    </>
  );
}
