# Sprint 1: GRC Platform Build-Out

This plan transforms the current AI Security Insight POC into a full-featured GRC (Governance, Risk, Compliance) platform. The work is split into 3 sequential phases to keep each step reviewable and testable.

---

## Phase 1: Database Schema and Backend

### 1.1 Database Migration

Rename `companies` to `organizations` and expand the schema with new tables and enums. A single large migration will:

- Create enums: `member_role` (owner, admin, member), `tool_status` (pending, approved, rejected, sunset), `risk_level` (high, medium, low), `workflow_stage` (draft, review, approved, rejected)
- Rename/evolve `companies` -> keep as-is but add `slug` and `settings` (JSONB) columns
- Create `members` table replacing `profiles` role as the org membership table (keep profiles for user identity, add role via members)
- Create `tools` table (id, org_id, name, url, category, status, risk_level, report_id FK to reports)
- Create `requests` table (id, tool_id, requester_id, workflow_stage, submission_data JSONB, created_at, updated_at)
- Create `vendors` table (id, name, website, research_data JSONB, created_at)
- Create `controls` table (id, tool_id, framework, control_ref, title, status, attestation text, attested_by, attested_at)
- Create `activity_log` table (id, org_id, actor_id, action text, entity_type text, entity_id uuid, metadata JSONB, created_at)
- Add RLS policies to all tables using the existing `get_user_company_id()` function pattern (scoped to org_id = user's org)
- Add an `updated_at` trigger to new tables that need it

### 1.2 Edge Function: `ai-action`

A unified AI edge function that handles multiple action types via a `type` parameter:

- `vendor-research`: Takes a vendor name/URL, runs Serper search, synthesizes with Lovable AI, saves to `vendors.research_data` and `reports` table
- `request-analysis`: Takes a tool request, triggers the existing deep-scan flow, populates the request's submission_data with AI findings
- `maturity-recs`: Calculates maturity score from tools + controls data and returns recommendations

This consolidates the existing `analyze-service` logic and reuses it.

### 1.3 Edge Function: `generate-report`

Expand the existing `generate-compliance` function to also support generating an executive PDF that includes Trust Score gauge data, vulnerability radar summary, and attested controls list. The function will accept a `type` parameter (`compliance` or `executive`).

---

## Phase 2: Layout and Navigation Overhaul

### 2.1 Sidebar Layout

Replace the current top-nav `AppHeader` with a collapsible sidebar layout:

- **Sidebar items**: Dashboard, Tool Inventory, Requests, Vendors, Compliance, Maturity, Admin
- **Org switcher** dropdown at the top of the sidebar (for future multi-org, Sprint 1 shows current org only)
- **User menu** at the bottom with sign-out
- The sidebar wraps all protected routes via a new `AppLayout` component
- Mobile: sidebar collapses to a hamburger sheet

### 2.2 Auth Updates

- Keep current email/password auth
- Add org switcher support in `useAuth` (store active org, future multi-org ready)
- TOTP MFA and Azure SSO are noted as future items (Sprint 2) since they require additional provider configuration. For Sprint 1, the auth page gets a visual refresh to match the new layout.

---

## Phase 3: Page Implementations

### 3.1 Dashboard Page (`/dashboard`, new Index)

A bento-grid dashboard showing:

- **Total AI Tools** card (count from `tools` table)
- **Open Requests** card (count of non-approved requests)
- **Maturity Score** card (calculated ratio: approved tools with attested controls / total tools, scaled 0-100)
- **Recent Activity** feed (last 10 entries from `activity_log`)
- Quick-action button: "Request New Tool"

### 3.2 Tool Inventory Page (`/tools`)

- CRUD table listing all tools for the org
- Columns: Name, URL, Status (badge), Risk Level (badge), Category, Actions
- Filters: by risk_level, by status
- Click a tool row to view its linked report (reuses existing Report page)
- "Add Tool" button opens a form dialog
- Status transitions enforced: rejected tools cannot become compliant

### 3.3 Requests Page (`/requests`)

- List of all tool requests for the org
- "Request New Tool" button starts the flow:
  1. User enters tool name/URL in a dialog
  2. System creates a `tools` record (status: pending) and a `requests` record (stage: draft)
  3. Triggers `ai-action` with type `vendor-research` -- reuses the terminal scanning animation
  4. Results populate the draft request view showing Trust Score, Vulnerability Radar
  5. Admin can advance workflow: draft -> review -> approved/rejected
- Each request card shows: tool name, requester, stage badge, date

### 3.4 Vendors Page (`/vendors`)

- Table of all vendors with cached research data
- Click a vendor to see the full AI research summary (rendered from `research_data` JSONB)
- "Research Vendor" button triggers a new scan

### 3.5 Compliance & Controls Page (`/compliance`)

- Grid of framework cards: NIST AI RMF, EU AI Act, SOC 2, ISO 27001, GDPR
- Click a framework card to see its controls list
- Each control has: checkbox attestation toggle, gap status indicator, notes field
- "Gap Analysis" summary per framework showing % attested vs total

### 3.6 Maturity Assessment Page (`/maturity`)

- On-demand calculation: approved tools ratio, attested controls ratio, weighted score
- Visual gauge (reuses TrustGauge component)
- Breakdown by category
- "Generate Executive Report" button triggers PDF generation via `generate-report`

### 3.7 Admin Page (`/admin`)

- Org settings: name, slug
- Members list with role badges
- Invite member (future: email invite; Sprint 1: show existing members)
- Activity log full view with filters

---

## Route Changes

```text
Current Routes          ->  New Routes
/                           /dashboard (redirect / -> /dashboard)
/auth                       /auth (unchanged)
/report/:id                 /reports/:id (keep existing Report page)
/reports                    /reports (keep existing ReportsHistory)
/compliance                 /compliance (revamped)
/compliance/:id             /compliance/plans/:id (keep existing)
(new)                       /tools
(new)                       /tools/:id (detail/report view)
(new)                       /requests
(new)                       /vendors
(new)                       /maturity
(new)                       /admin
```

---

## Key Design Decisions

1. **Keep existing tables** (`companies`, `profiles`, `reports`, `compliance_plans`, `compliance_steps`) -- new tables are additive, no data loss
2. **Members table** adds role-based access on top of profiles (profiles stay for user identity)
3. **Activity log** is append-only, written from edge functions and client-side on status changes
4. **TOTP MFA / Azure SSO** deferred to Sprint 2 (requires external provider setup)
5. **Email notifications** (`notify` edge function) deferred to Sprint 2
6. **Org switching** is UI-ready but Sprint 1 assumes single org per user

---

## Technical Details

### New Files to Create

- `src/components/AppLayout.tsx` -- sidebar + main content wrapper
- `src/components/AppSidebar.tsx` -- sidebar navigation
- `src/components/OrgSwitcher.tsx` -- org dropdown (single org for now)
- `src/pages/Dashboard.tsx` -- bento grid dashboard
- `src/pages/Tools.tsx` -- tool inventory CRUD
- `src/pages/ToolDetail.tsx` -- single tool view
- `src/pages/Requests.tsx` -- request workflow
- `src/pages/Vendors.tsx` -- vendor research list
- `src/pages/Maturity.tsx` -- maturity assessment
- `src/pages/Admin.tsx` -- org admin
- `src/pages/ComplianceFramework.tsx` -- framework controls view
- `supabase/functions/ai-action/index.ts` -- unified AI edge function
- 1 database migration file

### Files to Modify

- `src/App.tsx` -- new routes and layout wrapper
- `src/hooks/useAuth.tsx` -- add active org concept
- `src/pages/ComplianceDashboard.tsx` -- revamp to framework cards
- `supabase/functions/generate-compliance/index.ts` -- expand for executive reports
- `supabase/config.toml` -- register `ai-action` function

### Files to Keep As-Is

- `src/pages/Report.tsx` -- reused for tool detail views
- `src/pages/CompliancePlan.tsx` -- unchanged
- `src/components/ScanningAnimation.tsx` -- reused in request flow
- `src/components/TrustGauge.tsx` -- reused in maturity page
- All UI components in `src/components/ui/`

### Estimated Scope

- ~1 database migration (large, ~150 lines SQL)
- ~1 new edge function
- ~10 new page/component files
- ~5 modified files

For automated emails, use resent api, the api key is: re_VKvAhnMn_FBieDB8F5QnqBBvSuzgwVZME