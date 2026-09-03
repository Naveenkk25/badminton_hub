# ANTIGRAVITY MASTER DEVELOPMENT PROMPT

You are a Principal Software Architect, Senior ASP.NET Core Developer, Senior Blazor Developer, UI/UX Designer, Database Architect, DevOps Engineer, QA Engineer, and Technical Documentation Specialist.

Your task is to build a COMPLETE PRODUCTION-READY badminton community management platform named:

# BADMINTON HUB

This is NOT a demo project.

This is a real-world production application for a private badminton community in Canada with approximately 250 active users initially and scalability for future growth.

Generate enterprise-grade code, architecture, database design, testing, deployment, and documentation.

---

# PRIMARY OBJECTIVE

Build a complete badminton event management and community platform that manages:

- Organizers
- Players
- Events
- Registrations
- Waitlists
- Wallet Ledger
- Organizer Credits
- Event History
- Activity Logs
- Audit Logs
- Reports
- PWA Experience

---

# TECHNOLOGY STACK

## Backend

- ASP.NET Core 8 Web API
- Entity Framework Core
- PostgreSQL (Production)
- SQLite (Development)
- JWT Authentication
- Refresh Tokens
- MediatR
- AutoMapper
- FluentValidation
- Hangfire
- Serilog
- Swagger
- Health Checks

## Frontend

- Blazor Server PWA
- MudBlazor

## Architecture

- Clean Architecture
- SOLID Principles
- CQRS
- Repository Pattern
- Unit Of Work Pattern

## Testing

- xUnit
- FluentAssertions
- Integration Tests
- API Tests
- Authentication Tests

Minimum Coverage:

80%

---

# USER ROLES

## SUPER ADMIN

Can:

- Create Organizers
- Edit Organizers
- Suspend Organizers
- Activate Organizers
- Create Users
- Edit Users
- Suspend Users
- Reset Passwords
- Manage Credits
- View Reports
- View Audit Logs
- Configure Settings

Has full system access.

---

## ORGANIZER

Can:

- Create Users
- Edit Users
- Suspend Users
- Reset Passwords
- Create Events
- Edit Events
- Cancel Events
- Manage Wallet Ledger
- View Registrations
- View Waitlists
- View Event Logs
- View Reports

Cannot:

- Create Organizers
- Access Global Settings

---

## PLAYER

Can:

- Login
- Change Password
- View Events
- Join Events
- Cancel Events
- Join Waitlists
- View Wallet
- View Wallet Transactions
- View Event History
- View Category

---

# ORGANIZER MODEL

Version 1 supports:

- Single Organizer
- Single Community
- Shared User Base

Architecture must support future multi-organizer expansion without major redesign.

All entities should support future Organizer ownership.

---

# PLAYER ONBOARDING

Public self-registration is NOT allowed.

Players are created by Organizer.

Required Fields:

- Full Name
- Mobile Number
- Category
- Optional Email

System generates:

- Temporary Password
- Pending Activation Status

---

# FIRST LOGIN FLOW

Player receives:

- Mobile Number
- Temporary Password

Login Flow:

Login
→ Change Password
→ Activate Account
→ Dashboard

Password change is mandatory.

---

# ACCOUNT STATUS

Supported:

- PendingActivation
- Active
- Suspended
- Inactive

Rules:

PendingActivation:

- Can login only to change password

Active:

- Full Access

Suspended:

- Cannot Login
- Cannot Join Events

Inactive:

- Hidden from normal operations

---

# PLAYER CATEGORIES

Categories:

- Advanced
- Intermediate
- Plus

Categories are visible in:

- Event Details
- Player Profile
- Event Participant Lists

All category changes must be audited.

---

# WALLET LEDGER SYSTEM

IMPORTANT

Platform does NOT process payments.

Players pay organizers directly outside the platform.

Platform tracks wallet balances only.

Example:

Player pays organizer $100.

Organizer records:

Credit +100

Wallet Balance = $100

---

# WALLET RULES

Transactions are immutable.

Never:

- Delete
- Modify
- Overwrite

Allowed Types:

- Credit
- Debit
- Refund
- Adjustment

Append-only ledger.

Balance Formula:

Credits
- Debits
+ Refunds
+ Adjustments

Balance is derived from transactions.

---

# NEGATIVE BALANCE PROTECTION

Wallet Balance must never become negative.

Validation:

Wallet Balance >= Event Fee

If insufficient:

Reject Registration

Display:

"Insufficient wallet balance. Please contact organizer."

---

# ORGANIZER CREDIT SYSTEM

Business Model:

1 Credit = 1 Event Creation

Rules:

- New Organizer receives 1 free credit
- Creating Event consumes 1 credit
- No credit = Event Creation Blocked

Track:

- Purchases
- Deductions
- Credit History

---

# EVENT MANAGEMENT

Fields:

- Event Name
- Venue
- Event Date
- Start Time
- End Time
- Event Fee
- Category
- Max Players
- Cutoff DateTime
- Event Status

Actions:

- Create
- Edit
- Cancel
- Soft Delete

---

# EVENT STATUS

OPEN

- Accept Registrations
- Accept Waitlists
- Accept Cancellations

FULL

- Capacity Reached
- Waitlist Open

LOCKED

- Cutoff Reached

CANCELLED

- Event Cancelled

COMPLETED

- Event Finished
- Moved To History

---

# EVENT CAPACITY RULES

Store:

- Current Players
- Available Spots
- Waitlist Count
- Event Status

Example:

Capacity: 30

Current Players: 27

Available Spots: 3

Waitlist Count: 0

Example:

Capacity: 30

Current Players: 30

Available Spots: 0

Waitlist Count: 8

---

# EVENT CUTOFF RULES

Each event contains:

CutoffDateTime

Organizer manually selects:

- Cutoff Date
- Cutoff Time

Validation:

CutoffDateTime < EventStartDateTime

Before Cutoff:

- Registration Allowed
- Cancellation Allowed
- Waitlist Join Allowed

After Cutoff:

- Registration Blocked
- Cancellation Blocked
- Waitlist Blocked

---

# REGISTRATION FLOW

Validate:

- Event Open
- Wallet Balance Available
- Not Already Registered

Process:

- Deduct Event Fee
- Create Registration
- Create Wallet Transaction
- Create Activity Log
- Create Audit Log

---

# WAITLIST RULES

If Event Full:

Add Player To Waitlist.

Store:

- Position
- Event
- Player
- Timestamp

FIFO Ordering Required.

---

# WAITLIST PROMOTION

When Spot Opens:

1. Select First Waitlisted Player
2. Validate Wallet Balance
3. Deduct Fee
4. Register Player
5. Update Counts
6. Create Wallet Transaction
7. Create Activity Log
8. Create Audit Log
9. Notify Player

If Wallet Balance Insufficient:

- Skip Player
- Log Failure
- Continue FIFO Queue

---

# CONCURRENCY PROTECTION

CRITICAL REQUIREMENT

Prevent Overbooking.

Scenario:

Capacity = 30

Registered = 29

Available = 1

Two Users Click Join Simultaneously

Result:

User A = Registered

User B = Waitlisted

Capacity Must Never Exceed Limit.

Implementation:

- Database Transactions
- Optimistic Concurrency
- Row Versioning
- Concurrency Tokens

---

# EVENT HISTORY

Attendance module is NOT part of Version 1.

Instead maintain Event History.

Players can view:

- Joined Events
- Cancelled Events
- Waitlisted Events
- Promoted Events
- Upcoming Events
- Completed Events

Organizers can view:

- Created Events
- Completed Events
- Cancelled Events
- Registrations
- Waitlists
- Event Logs

---

# EVENT ACTIVITY LOGS

Track:

- Player Registered
- Player Cancelled
- Player Waitlisted
- Player Promoted
- Wallet Deducted
- Wallet Refunded
- Event Updated
- Event Cancelled

Store:

- User
- Timestamp
- Action
- Description
- Event
- IP Address
- Device Information

Event participant logs should be visible from Event Details.

---

# AUDIT LOGS

Track:

- User Created
- User Updated
- Password Reset
- Category Changed
- Wallet Updated
- Event Updated
- Credit Changes

Store:

- Entity
- EntityId
- Action
- Old Value
- New Value
- User
- Timestamp
- IP Address

---

# REPORTS

Generate:

- Registration Report
- Cancellation Report
- Wallet Ledger Report
- Event Participation Report
- Activity Log Report
- Audit Log Report

Export:

- CSV
- Excel
- TXT

---

# DASHBOARDS

## Player Dashboard

Display:

- Wallet Balance
- Upcoming Events
- Recent Event History
- Wallet Transactions
- Category

## Organizer Dashboard

Display:

- Total Players
- Upcoming Events
- Completed Events
- Credits Remaining
- Wallet Summary
- Recent Registrations
- Recent Cancellations

## Super Admin Dashboard

Display:

- Total Organizers
- Total Users
- Total Events
- Credits
- Reports
- Audit Logs

---

# UI / UX REQUIREMENTS

IMPORTANT

NO DARK THEME.

NO DARK COLORS.

Design inspired by modern Facebook Light UI.

Use:

- White Backgrounds
- Facebook Blue Navigation
- Light Gray Cards
- Rounded Corners
- Soft Shadows
- Clean Typography
- Mobile-First Design

---

# EVENT CARD COLORS

Available Event:

- White Background
- Soft Light Green Border
- Mild Green Capacity Indicator
- Green Join Button

Do NOT use dark green.

Use eye-friendly green.

Full Event:

- White Background
- Soft Light Red Border
- Mild Red Capacity Indicator
- Waitlist Join Button

Do NOT use dark red.

Use soft red.

Even when Full:

Waitlist joining remains available until CutoffDateTime.

---

# PWA REQUIREMENTS

- Installable Application
- Android Support
- iPhone Support
- Offline Splash Screen
- Service Worker
- Web Manifest
- Responsive Mobile Layout

---

# API STANDARDS

Base Route:

/api/v1/

Use consistent response wrappers:

- Success
- Validation Error
- Error
- Paginated Result

---

# DATABASE STANDARDS

Every Entity Must Include:

- Id
- CreatedDate
- CreatedBy
- ModifiedDate
- ModifiedBy
- IsDeleted
- DeletedDate
- DeletedBy

Use Soft Delete.

Never Hard Delete:

- Users
- Events
- Registrations
- Wallet Transactions
- Activity Logs
- Audit Logs

---

# TESTING REQUIREMENTS

Generate:

- Unit Tests
- Integration Tests
- Authentication Tests
- Registration Tests
- Wallet Tests
- Waitlist Tests
- Concurrency Tests

Coverage:

80% Minimum

---

# PRODUCTION REQUIREMENTS

Generate:

- Docker
- Docker Compose
- GitHub Actions
- Environment Variables
- Swagger
- Health Checks
- Serilog
- HTTPS Configuration
- Nginx Reverse Proxy
- Deployment Guide

---

# DELIVERABLES

Generate:

- Complete Source Code
- Database Migrations
- Seed Data
- API Documentation
- Local Setup Guide
- Production Setup Guide
- Test Accounts
- Architecture Diagram
- Flutter Integration Guide

Build the complete solution module-by-module.

Do not create placeholders.

Use enterprise-grade implementation patterns.

Generate production-ready code, database schema, APIs, UI, tests, and deployment assets.
The final solution must be enterprise-grade, scalable, maintainable, testable, and production-ready.