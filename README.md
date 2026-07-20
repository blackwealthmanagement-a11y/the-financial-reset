# The Financial Reset

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-19-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black)
![License](https://img.shields.io/badge/Status-Private-blue)

A production-ready financial wellness and credit education platform designed to help individuals and entrepreneurs better understand their credit, organize their financial goals, and take informed steps toward stronger personal and business finances.

Operated by **Black Wealth Management LLC**.

---

# 🌐 Live Website

**https://the-financial-reset.com**

---

# 🚀 Features

## Public Website

- Modern responsive homepage
- Personal credit education
- Business credit guidance
- Financial wellness coaching
- Privacy Policy
- Terms & Conditions
- Disclaimer
- Mobile-friendly design
- SEO-ready architecture

---

## Secure Client Intake

- Guided intake workflow
- Server-side validation
- Honeypot spam protection
- Rate limiting
- Duplicate submission protection (Idempotency)
- Secure API route
- Automatic database storage

---

## CRM Dashboard

- Secure administrator authentication
- Protected CRM routes
- Lead dashboard
- Search
- Filters
- Sorting
- Lead status management
- Lead temperature tracking
- Internal notes
- Activity timeline
- Dashboard metrics
- Today's follow-ups
- Next follow-up dates
- Overdue follow-up highlighting

---

## Automation

- Owner email notifications
- Customer confirmation emails
- Resend email integration
- Supabase database integration

---

# 🛠 Technology Stack

| Category | Technology |
|------------|------------|
| Framework | Next.js 15 |
| Frontend | React |
| Language | TypeScript |
| Styling | CSS |
| Icons | Lucide React |
| Backend | Next.js API Routes |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Email | Resend |
| Deployment | Vercel |
| DNS | Cloudflare |
| Version Control | Git + GitHub |
| Development | Visual Studio Code + GitHub Copilot |

---

# 📁 Project Structure

```text
app/
├── admin/
├── api/
├── crm/
├── disclaimer/
├── intake/
├── portal/
├── privacy/
├── terms/
├── globals.css
├── layout.tsx
└── page.tsx

components/
├── crm/
└── ui/

hooks/
├── useDashboard.ts
├── useLead.ts
├── useLeads.ts
└── useNotes.ts

services/
├── crm.service.ts

types/
├── crm.ts
└── intake.ts

utils/

lib/

public/
```

---

# 🏗 Architecture

The project follows a modular architecture.

```
Pages
    │
    ▼
Components
    │
    ▼
Hooks
    │
    ▼
Services
    │
    ▼
Supabase
```

This separation keeps business logic, UI, and data access independent and easy to maintain.

---

# ⚙ Running Locally

## Prerequisites

- Node.js
- npm
- Git

Clone the repository:

```bash
git clone https://github.com/blackwealthmanagement-a11y/the-financial-reset.git
```

Enter the project:

```bash
cd the-financial-reset
```

Install dependencies:

```bash
npm install
```

Create:

```text
.env.local
```

using:

```text
.env.example
```

Then start the development server:

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

# 🔐 Environment Variables

The project uses environment variables for secure configuration.

Typical variables include:

```text
NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

SUPABASE_SERVICE_ROLE_KEY

RESEND_API_KEY
```

## Security

- Never commit `.env.local`
- Never expose `SUPABASE_SERVICE_ROLE_KEY`
- Never expose API keys
- Store production secrets inside Vercel Environment Variables

---

# 🗄 Database

The project uses Supabase PostgreSQL.

Current database functionality includes:

- Client intake submissions
- CRM dashboard
- Lead notes
- Activity timeline
- Lead temperature
- Follow-up dates
- Dashboard metrics
- Row Level Security (RLS)
- Administrator-only access

---

# 🚀 Deployment

Production is deployed using **Vercel**.

Deployment workflow:

```bash
git add .

git commit -m "Describe changes"

git push origin main
```

Vercel automatically detects new commits and deploys the latest version.

---

# ✅ Production Testing Checklist

After every deployment verify:

- Homepage loads
- Navigation works
- Intake form submits
- Submission appears in Supabase
- Owner notification email arrives
- Customer confirmation email arrives
- CRM login works
- CRM dashboard loads
- Lead detail page loads
- Notes save
- Timeline updates
- Status changes persist
- Follow-up dates save
- Logout redirects correctly

---

# 📈 Version History

## v2.1.0

**CRM Architecture Refactor**

- Modular project architecture
- Reusable CRM components
- Shared hooks
- Shared services
- Shared TypeScript types
- Cleaner folder organization
- Production build verified

---

## v2.0.0

**CRM Productivity**

- Secure administrator authentication
- Protected CRM dashboard
- Lead search
- Lead filtering
- Lead sorting
- Dashboard metrics
- Lead notes
- Activity timeline
- Lead temperature
- Today's follow-ups
- Next follow-up dates

---

## v1.0.0

**Production Intake Platform**

- Public website
- Secure intake form
- Supabase integration
- Automated emails
- Rate limiting
- Honeypot spam protection
- Idempotency protection
- Vercel deployment

---

# 🗺 Roadmap

Future development includes:

- Client Portal
- Online consultation scheduling
- Stripe payment processing
- Secure document uploads
- Automated email sequences
- SMS notifications
- AI-powered client assistant
- Business analytics dashboard
- Reporting
- Client progress tracking

---

# 👨‍💻 Development

Built and maintained using:

- Next.js
- React
- TypeScript
- Supabase
- Vercel
- Cloudflare
- Resend
- GitHub
- GitHub Copilot
- Visual Studio Code

---

# 📌 Project Status

✅ Production Website Live

✅ Secure Intake Workflow Complete

✅ CRM Dashboard Complete

✅ Authentication Complete

✅ Automated Emails Complete

✅ Responsive Design Complete

🚧 Client Portal (Planned)

🚧 Online Scheduling (Planned)

🚧 Payment Processing (Planned)

---

# 📄 Disclaimer

The Financial Reset provides financial education and wellness guidance.

Nothing within this platform should be interpreted as legal, tax, investment, or financial advice.

Results vary based on each individual's unique financial situation.

The Financial Reset is operated by **Black Wealth Management LLC**.
