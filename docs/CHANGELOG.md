# Changelog

All notable changes to The Financial Reset Platform are documented in this file.

The project uses semantic versioning:

- Major versions introduce significant platform changes.
- Minor versions introduce new features.
- Patch versions contain fixes and smaller improvements.

## v2.4.0 — CRM Task Management Engine

### Added

- Dedicated `crm_tasks` Supabase table
- Lead-specific task management
- Task title and description fields
- Low, Medium, and High priorities
- Pending, In Progress, Completed, and Cancelled statuses
- Task due dates
- Completion timestamps
- Create, edit, complete, reopen, and delete actions
- Today’s Tasks dashboard metric
- Overdue Tasks dashboard metric
- Completed Today dashboard metric
- High Priority Tasks dashboard metric
- Administrator-only Row Level Security policies
- Task hooks, services, types, and reusable components

### Security

- Tasks are accessible only to the approved administrator account.
- Task records are tied to leads through UUID foreign keys.
- Deleting a lead removes its associated tasks through cascading deletion.

## v2.3.0 — Consultation Management

### Added

- Consultation status tracking
- Consultation date and time
- Consultation outcome
- Consultation summary
- Consultation management card on lead detail pages
- Consultation activity timeline entries
- Consultations Today dashboard metric
- Upcoming Consultations dashboard metric
- Completed This Month dashboard metric
- No Shows dashboard metric

### Consultation Statuses

- Not Booked
- Scheduled
- Completed
- No Show
- Cancelled

### Consultation Outcomes

- Qualified
- Follow-up Needed
- Closed
- Not Qualified

## v2.2.0 — Consultation Booking Integration

### Added

- Public `/book` route
- Embedded Calendly scheduler
- Branded booking page
- Thirty-minute consultation explanation
- Intake-first booking workflow
- Booking calls to action throughout the website
- Calendly fallback link
- Responsive booking layout
- `NEXT_PUBLIC_CALENDLY_URL` environment variable

## v2.1.0 — CRM Architecture Refactor

### Changed

- Refactored large CRM pages into reusable components
- Created reusable CRM hooks
- Centralized Supabase operations in service modules
- Centralized TypeScript interfaces
- Added shared utilities and constants
- Improved project folder organization
- Removed duplicated logic
- Improved maintainability
- Preserved existing functionality and styling

### Architecture

- `components/` for reusable interface components
- `hooks/` for reusable React state and data loading
- `services/` for database operations
- `types/` for shared TypeScript definitions
- `utils/` for formatting and helpers
- `lib/` for shared infrastructure

## v2.0.0 — Secure CRM Dashboard

### Added

- Supabase administrator authentication
- Protected `/crm` routes
- Administrator login page
- Lead dashboard
- Lead search
- Service and status filtering
- Newest and oldest sorting
- Lead detail pages
- Lead status updates
- Lead temperature tracking
- Next follow-up dates
- Overdue follow-up highlighting
- Internal notes
- Recent activity timeline
- Dashboard metrics
- Today’s follow-up widget

### Security

- Administrator access restricted by Supabase user UUID
- Row Level Security enabled
- Anonymous users cannot read CRM submissions
- Public users retain intake-only insert access

## v1.0.0 — Production Intake Platform

### Added

- Public marketing website
- Credit education and financial wellness positioning
- Responsive homepage
- Service sections
- Guided intake form
- Privacy Policy
- Terms
- Educational Disclaimer
- Secure Next.js intake API
- Input validation and sanitization
- Honeypot spam protection
- Rate limiting
- Duplicate-submission protection
- Supabase intake storage
- Resend owner notifications
- Resend prospect confirmation emails
- Vercel deployment
- Cloudflare custom-domain configuration
- GitHub version control

### Infrastructure

- Next.js
- React
- TypeScript
- Supabase
- PostgreSQL
- Resend
- Vercel
- Cloudflare
- GitHub
