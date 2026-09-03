// ========================
// Enums (matching .NET backend)
// ========================

export enum UserRole {
  SuperAdmin = "SuperAdmin",
  Organizer = "Organizer",
  Player = "Player",
}

export enum UserStatus {
  PendingActivation = "PendingActivation",
  Active = "Active",
  Suspended = "Suspended",
  Inactive = "Inactive",
}

export enum PlayerCategory {
  Advanced = "Advanced",
  Intermediate = "Intermediate",
  Plus = "Plus",
}

export enum EventStatus {
  Open = "Open",
  Full = "Full",
  Locked = "Locked",
  Cancelled = "Cancelled",
  Completed = "Completed",
}

export enum WalletTransactionType {
  Credit = "Credit",
  Debit = "Debit",
  Refund = "Refund",
  Adjustment = "Adjustment",
}



// ========================
// DTOs (matching backend responses)
// ========================

export interface UserDto {
  id: string;
  userName: string;
  phoneNumber: string;
  fullName: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  category?: PlayerCategory;
  walletBalance: number;
  profilePictureUrl?: string;
  createdDate: string;
}

export interface EventDto {
  id: string;
  organizerId: string;
  organizerName: string;
  name: string;
  venue: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  reservedFee: number;
  category: PlayerCategory;
  maxPlayers: number;
  cutoffDateTime: string;
  status: EventStatus;
  registeredPlayersCount: number;
  waitlistedPlayersCount: number;
  availableSpots: number;
  isSettled: boolean;
}

export interface RegistrationDto {
  id: string;
  eventId: string;
  eventName: string;
  playerId: string;
  playerName: string;
  playerMobile: string;
  playerCategory: PlayerCategory;
  registrationDate: string;
  reservedFee: number;
  actualFee?: number;
  refundAmount?: number;
  isCancelled: boolean;
}

export interface WaitlistDto {
  id: string;
  eventId: string;
  eventName: string;
  playerId: string;
  playerName: string;
  playerMobile: string;
  playerCategory: PlayerCategory;
  position: number;
  joinedDate: string;
  isPromoted: boolean;
  isCancelled: boolean;
}

export interface ActivityLogDto {
  id: string;
  userId: string;
  userFullName: string;
  userRole: UserRole;
  eventId?: string;
  eventName?: string;
  action: string;
  description: string;
  timestamp: string;
  ipAddress: string;
  deviceInformation: string;
}

export interface WalletTransactionDto {
  id: string;
  playerId: string;
  playerName: string;
  amount: number;
  type: WalletTransactionType;
  description: string;
  timestamp: string;
  createdBy: string;
}

export interface OrganizerDto {
  id: string;
  name: string;
  contactNumber: string;
  createdDate: string;
  isDeleted: boolean;
  status?: string;
  userId?: string;
}

export interface EventDetailsVm {
  event: EventDto;
  registrations: RegistrationDto[];
  waitlist: WaitlistDto[];
  activityLogs: ActivityLogDto[];
}

// ========================
// Request/Command Types
// ========================

export interface LoginRequest {
  mobileNumber: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserDto;
}

export interface CreateEventRequest {
  organizerId: string;
  name: string;
  venue: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  reservedFee: number;
  category: PlayerCategory;
  maxPlayers: number;
  cutoffDateTime: string;
}

export interface CreatePlayerRequest {
  fullName: string;
  mobileNumber: string;
  category: PlayerCategory;
  email?: string;
}

export interface CreateOrganizerRequest {
  name: string;
  contactNumber: string;
}

export interface CreditWalletRequest {
  amount: number;
  description: string;
  type?: WalletTransactionType;
}

export interface ActivatePlayerRequest {
  mobileNumber: string;
  currentPassword: string;
  newPassword: string;
}

// ========================
// UI Helper Types
// ========================

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
}

export type Theme = "light" | "dark";
