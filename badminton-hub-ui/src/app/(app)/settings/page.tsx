"use client";

import React from "react";
import { Settings } from "lucide-react";
import { motion } from "framer-motion";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground"
        >
          <Settings className="h-6 w-6" />
        </motion.div>
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">System Settings</h2>
          <p className="text-muted-foreground font-medium">Configure global application settings and defaults.</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border/50 rounded-2xl bg-surface/50">
        <Settings className="h-16 w-16 text-muted-foreground/30 mb-4 animate-spin-slow" />
        <h3 className="text-xl font-bold font-heading mb-2">Settings Coming Soon</h3>
        <p className="text-muted-foreground max-w-md">Global configuration options such as theme enforcement, API keys, and notification templates will be added here in a future update.</p>
      </div>
    </div>
  );
}
