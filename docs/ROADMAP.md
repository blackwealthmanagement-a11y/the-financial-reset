# The Financial Reset Platform Roadmap

This roadmap outlines the planned development of The Financial Reset from its current CRM and lead-management foundation into a complete financial education and client-management platform.

## Current Production Version

### v2.4.0 — CRM Task Management Engine

Completed capabilities include:

- Public financial education website
- Secure intake workflow
- Supabase database integration
- Automated intake emails
- Administrator authentication
- Protected CRM dashboard
- Lead search, filters, and sorting
- Lead notes and activity history
- Follow-up date tracking
- Lead temperature tracking
- Consultation booking through Calendly
- Consultation status, outcome, and summary tracking
- CRM task creation, editing, completion, and deletion
- Task priorities and due dates
- Dashboard task metrics

## v2.5.0 — Workflow Automation

Planned features:

- Automatically create a 48-hour follow-up task after a new intake
- Set new leads to the appropriate default status and temperature
- Automatically create activity timeline entries
- Suggest next actions based on lead status
- Create follow-up tasks after consultations
- Highlight leads waiting on pricing
- Identify leads who have not booked a consultation
- Add daily workflow recommendations to the CRM dashboard

## v2.6.0 — CRM Communication Center

Planned features:

- One-click CRM email templates
- New intake follow-up
- Consultation reminder
- Missed consultation follow-up
- Post-consultation follow-up
- Pricing and enrollment information
- Waiting for client response
- Welcome email after enrollment
- Email delivery history attached to each lead
- Reusable branded email templates

## v2.7.0 — Document Management

Planned features:

- Secure Supabase Storage integration
- Administrator document uploads
- Client document uploads
- Associate files with individual leads
- Document categories
- Upload timestamps
- File access controls
- Document review status
- Secure download links

## v2.8.0 — Analytics and Reporting

Planned features:

- Intake-to-consultation conversion rate
- Consultation-to-enrollment conversion rate
- Lead source tracking
- Monthly lead totals
- Consultation completion rate
- No-show rate
- Follow-up completion rate
- Service-interest reporting
- CRM pipeline analytics
- Exportable reports

## v3.0.0 — Client Workspace

Planned features:

- Secure client authentication
- Individual client dashboards
- Program progress tracking
- Client tasks and action plans
- Appointment history
- Educational resources
- Secure messaging
- Document uploads
- Financial wellness worksheets
- Personalized next steps

## v3.1.0 — Payments and Enrollment

Planned features:

- Stripe Checkout integration
- One-time consultation payments
- Monthly coaching and education plans
- Payment confirmation emails
- Enrollment status tracking
- Invoice and receipt history
- Failed-payment handling
- CRM payment visibility

## Future Development

Potential future additions include:

- SMS reminders
- Google Calendar synchronization
- Automated appointment workflows
- Digital agreements and electronic signatures
- Educational course modules
- Client quizzes and worksheets
- AI-assisted CRM summaries
- AI-generated follow-up drafts
- Business performance forecasting
- Mobile application support

## Product Principles

Development should continue to follow these principles:

1. Protect client information.
2. Preserve existing production functionality.
3. Review every database migration before execution.
4. Keep administrator access restricted through Row Level Security.
5. Build features that save time or improve the client experience.
6. Test locally before committing.
7. Use version tags for meaningful production milestones.
8. Keep documentation current with every major release.
