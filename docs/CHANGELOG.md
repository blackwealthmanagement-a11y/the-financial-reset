# Changelog

All notable changes to The Financial Reset are documented in this file.

This project follows semantic versioning where practical.

---

# Version 2.7.0 — CRM Sales Pipeline Board

Release Date: August 2026

## Added

- Visual CRM Pipeline Board
- Table View / Pipeline View switcher
- Drag-and-drop lead management
- Keyboard-accessible status changes
- Lead cards with:
  - Contact information
  - Service interest
  - Lead temperature
  - Follow-up status
  - Consultation date
  - Open task count
- Responsive pipeline layout
- Search and filtering across pipeline columns
- Column lead counts
- Automatic activity timeline entries for pipeline status changes
- Optimistic UI updates with automatic rollback if database updates fail

## Improved

- CRM workflow efficiency
- Lead organization
- Administrator productivity
- Accessibility for keyboard users
- Responsive experience across desktop and mobile

## Technical

- Added reusable Pipeline components
- Added usePipeline custom hook
- Reused existing CRM services and Supabase schema
- No database migration required
- No additional npm packages required

Status:
Production Ready

---

# Version 2.6.0 — CRM Communication Center

## Added

- Communication Center for each CRM lead
- Email template management
- Email history tracking
- Secure Resend email integration
- Retry-safe email delivery
- Duplicate send prevention
- Admin authentication for communication endpoints
- HTML template variable rendering
- Email delivery history

## Technical

- Protected server-side email API
- Bearer token authentication
- UUID validation
- Retry-safe send workflow
- Append-only email history
- Secure Supabase server access

Status:
Production Ready

---

# Version 2.5.0 — Workflow Automation

## Added

- Automated lead workflows
- Follow-up automation
- Consultation automation
- Workflow tracking
- Retry-safe automation engine
- Idempotent workflow execution
- Automation audit logs

Status:
Production Ready

---

# Version 2.4.0 — Task Management

## Added

- CRM task management
- Lead-specific tasks
- Priority levels
- Due dates
- Task completion tracking
- Dashboard task widgets

Status:
Production Ready

---

# Version 2.3.0 — Consultation Management

## Added

- Consultation tracking
- Consultation outcomes
- Consultation summaries
- Consultation dashboard metrics

Status:
Production Ready

---

# Version 2.2.0 — Calendly Booking

## Added

- Public booking page
- Calendly integration
- Consultation booking workflow
- Booking confirmation experience

Status:
Production Ready

---

# Version 2.1.0 — CRM Architecture Refactor

## Improved

- Modular architecture
- Shared services
- Reusable hooks
- Component organization
- Type definitions
- Utility libraries

Status:
Production Ready

---

# Version 2.0.0 — Initial CRM Platform

## Added

- Marketing website
- Client intake portal
- Supabase integration
- CRM dashboard
- Lead management
- Notes
- Timeline
- Authentication
- Responsive design

Status:
Production Ready
