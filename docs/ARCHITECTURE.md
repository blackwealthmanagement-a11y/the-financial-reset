# The Financial Reset Platform Architecture

## Overview

The Financial Reset is a modular Next.js application supporting public marketing, lead intake, consultation booking, automated emails, and an internal CRM.

The platform is designed around four major areas:

1. Public website
2. Secure intake and booking
3. Supabase data and authentication
4. Internal CRM operations

## High-Level System Flow

```text
Visitor
   |
   v
Public Website
   |
   +--------------------+
   |                    |
   v                    v
Intake Form         Booking Page
   |                    |
   v                    v
Next.js API          Calendly
   |
   v
Supabase Database
   |
   +--------------------+
   |                    |
   v                    v
Resend Emails      Internal CRM
                        |
                        v
                Leads, Notes, Tasks,
                Consultations and Activity

