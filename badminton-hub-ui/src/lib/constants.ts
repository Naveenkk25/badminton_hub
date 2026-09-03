import { EventStatus, PlayerCategory, UserRole } from "./types";

// ========================
// API Configuration
// ========================
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5182/api/v1";

// ========================
// Color Palette — Badminton Themed
// ========================
export const COLORS = {
  // Primary
  primary: "#1E40AF",       // Deep Court Blue
  primaryLight: "#3B82F6",  // Lighter blue
  primaryDark: "#1E3A8A",   // Darker blue

  // Accent
  accent: "#F59E0B",        // Shuttlecock Gold
  accentLight: "#FCD34D",
  accentDark: "#D97706",

  // Status
  success: "#22C55E",       // Court Green (Open)
  error: "#EF4444",         // Match Red (Full)
  warning: "#F97316",       // Amber (Closed)
  info: "#3B82F6",          // Blue
  completed: "#6B7280",     // Cool Gray

  // Backgrounds
  background: "#FAFBFC",
  surface: "#FFFFFF",
  surfaceHover: "#F8FAFC",

  // Text
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",

  // Borders
  border: "#E2E8F0",
  borderHover: "#CBD5E1",
} as const;

// ========================
// Event Status Config
// ========================
export const EVENT_STATUS_CONFIG: Record<EventStatus, {
  color: string;
  bg: string;
  border: string;
  label: string;
  icon: string;
}> = {
  [EventStatus.Open]: {
    color: "#22C55E",
    bg: "#F0FDF4",
    border: "#22C55E",
    label: "OPEN FOR BOOKING",
    icon: "circle-check",
  },
  [EventStatus.Full]: {
    color: "#EF4444",
    bg: "#FEF2F2",
    border: "#EF4444",
    label: "FULL — WAITLIST OPEN",
    icon: "users",
  },
  [EventStatus.Locked]: {
    color: "#F97316",
    bg: "#FFF7ED",
    border: "#F97316",
    label: "REGISTRATION CLOSED",
    icon: "lock",
  },
  [EventStatus.Cancelled]: {
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#DC2626",
    label: "CANCELLED",
    icon: "x-circle",
  },
  [EventStatus.Completed]: {
    color: "#6B7280",
    bg: "#F9FAFB",
    border: "#D1D5DB",
    label: "COMPLETED",
    icon: "trophy",
  },
};

// ========================
// Player Category Config
// ========================
export const CATEGORY_CONFIG: Record<PlayerCategory, {
  color: string;
  bg: string;
  label: string;
}> = {
  [PlayerCategory.Advanced]: {
    color: "#7C3AED",
    bg: "#F5F3FF",
    label: "Advanced",
  },
  [PlayerCategory.Intermediate]: {
    color: "#2563EB",
    bg: "#EFF6FF",
    label: "Intermediate",
  },
  [PlayerCategory.Plus]: {
    color: "#059669",
    bg: "#ECFDF5",
    label: "Plus",
  },
};

// ========================
// Navigation Items
// ========================
export const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "layout-dashboard",
    roles: [UserRole.SuperAdmin, UserRole.Organizer, UserRole.Player],
  },
  {
    label: "Organizers",
    href: "/organizers",
    icon: "building-2",
    roles: [UserRole.SuperAdmin],
  },
  {
    label: "Players",
    href: "/players",
    icon: "users",
    roles: [UserRole.SuperAdmin, UserRole.Organizer],
  },
  {
    label: "Events",
    href: "/events",
    icon: "calendar-days",
    roles: [UserRole.SuperAdmin, UserRole.Organizer, UserRole.Player],
  },

  {
    label: "Reports",
    href: "/reports",
    icon: "file-bar-chart",
    roles: [UserRole.SuperAdmin, UserRole.Organizer],
  },
  {
    label: "Activity Logs",
    href: "/logs/activity",
    icon: "scroll-text",
    roles: [UserRole.SuperAdmin],
  },
  {
    label: "Event Logs",
    href: "/logs/events",
    icon: "clipboard-list",
    roles: [UserRole.SuperAdmin, UserRole.Organizer],
  },

  {
    label: "Wallet",
    href: "/wallet",
    icon: "wallet",
    roles: [UserRole.Player],
  },

  {
    label: "Settings",
    href: "/settings",
    icon: "settings",
    roles: [UserRole.SuperAdmin],
  },
];

// ========================
// Currency Formatter
// ========================
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(amount);
};

// ========================
// Date Formatter
// ========================
export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("en-CA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatTime = (timeStr: string): string => {
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${minutes} ${suffix}`;
};

export const formatDateTime = (dateStr: string): string => {
  return new Date(dateStr).toLocaleString("en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
