# SILMAN — Cursor Build Prompts
## Sequential prompts. Run in order. Do not skip.

---

## PROMPT 0 — Project Context (paste this into Cursor's `.cursorrules` file at repo root)

```
You are building SILMAN — an NDIS Supported Independent Living (SIL) management web app for the Australian NDIS sector.

PRODUCT PRINCIPLES:
- Manager-heavy product. Workers get a thin client (4 screens max).
- Desktop-first, mobile-responsive. Not a native app. Not a PWA in v1.
- Apple-grade UI: soft, rounded, generous whitespace, layered shadows, premium feel.
- All data resides in AWS Sydney region (Supabase Sydney). NDIS requires Australian data residency.
- Audit-grade logging. Every meaningful action is logged with user, timestamp, before/after state.

TECH STACK (do not deviate):
- Next.js 14, App Router, TypeScript, React Server Components where sensible
- Tailwind CSS with custom radii: buttons rounded-xl (12px), cards rounded-2xl (16px), modals rounded-3xl (20px), inputs rounded-lg (10px)
- shadcn/ui as the component foundation, customised
- Supabase: Postgres, Auth, Storage, Row-Level Security, Edge Functions
- Anthropic Claude API for AI features (model: claude-sonnet-4-5, tool use pattern)
- FullCalendar for roster views
- Framer Motion for animations (200ms ease-out defaults)
- Lucide icons, stroke width 1.5, no other icon families
- Inter font for body, Inter Display for headings
- Deployed on Vercel

DESIGN RULES:
- Base font 15px not 14px
- Headings letter-spacing -0.01em
- Two-layer shadows: 0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)
- Skeleton loading states, never spinners
- Empty states are illustrated and helpful
- Every interactive element has hover, focus, active, disabled states
- Animations: 200ms ease-out for modals, 150ms for sidebar, spring physics for drag

ARCHITECTURAL RULES (non-negotiable):
- Build three platform primitives FIRST: RBAC + house-scoped RLS, Countdown Engine, Rules Engine
- All features depend on primitives. Never bolt logic into individual features.
- Multi-tenancy at the org level. Multiple orgs share infrastructure, never share data.
- House-scoping at the user level. Users assigned to specific houses see only that data.
- Every entity has created_at, updated_at, created_by, updated_by, deleted_at (soft deletes only — NDIS audits require historical data).
- Every permission change, data edit, login, role assignment is logged to audit_log table.

ROLE HIERARCHY:
1. Owner — full access, billing, can create custom roles
2. Team Leader — house-scoped, manages participants/workers/operations
3. Roster Coordinator — house-scoped, edits rosters only
4. Support Worker — sees own shifts, own availability, notice board, own profile only
5. Read-Only / Auditor — view scoped data, edit nothing

DO NOT BUILD IN V1:
- Native mobile apps
- Voice/video calls inside the app
- NDIS portal integration (PRODA API) — phase 2
- Multi-vertical support (sole trader, support coord modules) — phase 2
- Worker-to-worker DMs across different houses
- Hard deletes anywhere

CODE STYLE:
- TypeScript strict mode
- Zod for runtime validation on all API inputs
- Server Actions for mutations, RSC for reads
- No `any` types
- Co-locate components by feature in /app/(modules)/[module-name]/
- Shared UI in /components/ui/
- Database types auto-generated from Supabase schema
```

---

## PROMPT 1 — Project Scaffold

```
Scaffold a new Next.js 14 project for SILMAN following the rules in .cursorrules.

Specifically:
1. Initialize Next.js 14 with App Router, TypeScript strict, Tailwind, ESLint
2. Install and configure shadcn/ui. Customise the components.json to use:
   - Border radius base 12px (so rounded-xl = 12px, rounded-2xl = 16px, rounded-3xl = 20px)
   - Inter and Inter Display via next/font/google
   - Custom color tokens in tailwind.config: primary, secondary, accent, success, warning, danger, neutral scale 50-950
3. Install: @supabase/supabase-js, @supabase/ssr, zod, react-hook-form, @hookform/resolvers, framer-motion, lucide-react, date-fns, @fullcalendar/react, @fullcalendar/daygrid, @fullcalendar/timegrid, @fullcalendar/interaction, @anthropic-ai/sdk
4. Create folder structure:
   /app
     /(auth) - login, signup, invite
     /(app) - protected routes
       /dashboard
       /roster
       /participants
       /workers
       /houses
       /notice-board
       /messages
       /reminders
       /reports
       /settings
     /api
   /components
     /ui (shadcn)
     /shared
   /lib
     /supabase (client, server, middleware)
     /ai (anthropic client, tool definitions)
     /primitives (rbac, countdown, rules)
     /utils
   /types
   /supabase
     /migrations
5. Set up .env.local template with: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
6. Set up middleware.ts for Supabase auth session refresh on protected routes
7. Add a base layout with shadcn/ui's ThemeProvider, Toaster (sonner), and global styles

Output the full file tree at the end so I can verify.
```

---

## PROMPT 2 — Supabase Schema (Foundation Tables)

```
Generate a Supabase migration file at /supabase/migrations/0001_foundation.sql that creates the foundational tables for SILMAN. Apply soft-delete pattern everywhere (deleted_at timestamp).

Tables:

1. organizations
   - id uuid pk, name text, abn text, ndis_registration_number text, logo_url text, timezone text default 'Australia/Sydney', settings jsonb default '{}', created_at, updated_at, deleted_at

2. profiles (extends auth.users)
   - id uuid pk references auth.users, organization_id uuid fk, email text, full_name text, avatar_url text, phone text, role text check (role in ('owner','team_leader','roster_coordinator','support_worker','read_only')), is_active boolean default true, created_at, updated_at, deleted_at

3. houses
   - id uuid pk, organization_id uuid fk, name text, address text, suburb text, state text, postcode text, max_residents int, vehicle_info jsonb, settings jsonb default '{}', created_at, updated_at, deleted_at, created_by uuid, updated_by uuid

4. house_assignments (which users are assigned to which houses)
   - id uuid pk, user_id uuid fk profiles, house_id uuid fk houses, assigned_at, assigned_by uuid

5. permissions (granular permission strings for custom roles)
   - id uuid pk, organization_id uuid fk, role_name text, permission_key text, granted boolean, created_at, updated_at

6. audit_log
   - id uuid pk, organization_id uuid fk, user_id uuid, action text, entity_type text, entity_id uuid, before_state jsonb, after_state jsonb, ip_address text, user_agent text, created_at

7. invitations
   - id uuid pk, organization_id uuid fk, email text, role text, invited_by uuid, token text unique, expires_at timestamp, accepted_at timestamp, created_at

Then create Row-Level Security policies:
- Users can only see data from their own organization (organization_id match)
- Non-owner users with house_assignments can only see data scoped to their assigned houses
- Workers can only see their own profile and shifts (will extend in later migration)
- Owners can see everything in their org
- All policies use a helper function: auth_user_org_id() and auth_user_houses() and auth_user_role()

Create those helper functions in the same migration. Include triggers that auto-populate updated_at on every update and write to audit_log on insert/update/delete for organizations, profiles, houses, permissions.

Include indexes on all foreign keys, organization_id, and commonly queried fields (email, role, deleted_at).

Output the complete migration SQL file.
```

---

## PROMPT 3 — Platform Primitive 1: RBAC Library

```
Build the RBAC library at /lib/primitives/rbac/. This is the canonical permission-checking system used by every feature.

Files to create:

1. /lib/primitives/rbac/types.ts
   - Role type: 'owner' | 'team_leader' | 'roster_coordinator' | 'support_worker' | 'read_only'
   - Permission keys as a const enum: PARTICIPANT_VIEW, PARTICIPANT_EDIT, PARTICIPANT_CREATE, ROSTER_VIEW, ROSTER_EDIT, ROSTER_CREATE, MEDICATION_VIEW, MEDICATION_EDIT, COMPLIANCE_APPROVE, NOTICE_BOARD_POST, MESSAGE_SEND, SETTINGS_EDIT, BILLING_MANAGE, USER_INVITE, USER_ROLE_CHANGE, AUDIT_LOG_VIEW, INCIDENT_VIEW, INCIDENT_EDIT, INCIDENT_CLOSE, etc — enumerate all keys we'll need
   - PermissionContext type: { user_id, organization_id, role, house_ids: string[] }
   - ResourceScope type: { house_id?: string, user_id?: string }

2. /lib/primitives/rbac/default-permissions.ts
   - DEFAULT_PERMISSIONS map: Record<Role, PermissionKey[]>
   - Owner: all permissions
   - Team Leader: all participant/worker/medication/incident/notice-board permissions scoped to assigned houses, no billing, no user role changes
   - Roster Coordinator: roster permissions only, scoped to assigned houses
   - Support Worker: view own shifts, submit availability, view notice board, send messages within house scope
   - Read-Only: view permissions only, no edits

3. /lib/primitives/rbac/check.ts
   - export function can(context: PermissionContext, permission: PermissionKey, resource?: ResourceScope): boolean
   - Logic: check if user's role has the permission by default OR has a custom permission grant in the permissions table
   - Additionally check resource scope: if resource.house_id is provided, user must have that house in context.house_ids (owners exempt)
   - export function requirePermission(context, permission, resource?): throws ForbiddenError if can() returns false

4. /lib/primitives/rbac/server.ts
   - export async function getPermissionContext(): Promise<PermissionContext> — reads from Supabase server client, returns full context
   - export async function withPermission<T>(permission: PermissionKey, handler: (ctx: PermissionContext) => Promise<T>, resource?: ResourceScope): Promise<T> — wrapper for Server Actions

5. /lib/primitives/rbac/hooks.ts
   - usePermissions() — client hook returning PermissionContext from a React Context provider
   - <Can permission="..." resource={...}>children</Can> — declarative gate component
   - useCan(permission, resource) — boolean hook

6. /components/shared/permission-provider.tsx — React Context provider loaded at root layout, fetches permission context from server

Write unit tests at /lib/primitives/rbac/__tests__/check.test.ts covering: owner can do anything, team leader can edit participants in their houses but not others, worker cannot edit anyone's shifts, custom permission grants override role defaults.

Use vitest. Configure vitest if not already set up.
```

---

## PROMPT 4 — Platform Primitive 2: Countdown Engine

```
Build the Countdown Engine at /lib/primitives/countdown/.

Purpose: Any entity with an expiry date can register with the engine. The engine emits notifications at configurable thresholds.

Files:

1. /lib/primitives/countdown/types.ts
   - CountdownEntity type: { id, organization_id, entity_type, entity_id, label, expiry_date, thresholds: number[] (days), severity_per_threshold: ('green'|'amber'|'red')[], notify_roles: Role[], notify_users?: string[], house_id?: string, metadata: jsonb, last_notified_at?, status: 'active'|'acknowledged'|'resolved'|'expired' }
   - Pre-defined thresholds:
     - DEFAULT_MEDICATION: [30, 14, 7, 0] severities [green, amber, red, red]
     - DEFAULT_COMPLIANCE_DOC: [60, 30, 14, 0] severities [green, amber, red, red]
     - DEFAULT_PLAN_DATES: [90, 60, 30, 0]

2. Supabase migration at /supabase/migrations/0002_countdown.sql:
   - countdown_entities table matching the type above
   - countdown_events table: id, countdown_entity_id, threshold_days, severity, fired_at, acknowledged_at, acknowledged_by
   - RLS: org-scoped + house-scoped
   - Triggers to recompute current status on update

3. /lib/primitives/countdown/engine.ts
   - register(entity: Omit<CountdownEntity, 'id'|'status'|'last_notified_at'>): Promise<string>
   - update(id, partial): Promise<void>
   - resolve(id, resolution: 'renewed'|'ceased'|'extended', new_expiry?): Promise<void>
   - acknowledge(id, user_id): Promise<void>
   - getStatus(id): Promise<{ days_remaining, severity, next_threshold }>
   - getEntitiesForOrg(org_id, filters?): Promise<CountdownEntity[]>

4. /lib/primitives/countdown/cron.ts — a Supabase Edge Function runnable as a cron job (daily 6am Sydney):
   - Iterates active countdown_entities
   - For each, computes days_remaining
   - If days_remaining crosses a threshold not yet in countdown_events, inserts event row and triggers notification
   - Calls /lib/primitives/notifications/send.ts with appropriate payload

5. /supabase/functions/countdown-daily/index.ts — the deployable Edge Function entry point

6. UI: /components/shared/countdown-badge.tsx — a small badge component that shows colored pill (green/amber/red) with days remaining. Used everywhere expiry is displayed.

Unit tests for engine logic (threshold crossings, status computation, resolve behaviors).
```

---

## PROMPT 5 — Platform Primitive 3: Rules Engine

```
Build the Rules Engine at /lib/primitives/rules/.

Purpose: Configurable rules attached to entities (participants, workers, houses). When an action is attempted (e.g. create_shift), the engine evaluates all applicable rules and returns Block / Confirm / Inform decisions.

Files:

1. /lib/primitives/rules/types.ts
   - RuleSeverity: 'block' | 'confirm' | 'inform'
   - RuleCondition: a JSON-serializable predicate. Use a discriminated union:
     - { type: 'participant_no_vehicle', shift_type: 'community_access' }
     - { type: 'worker_gender_restriction', not_gender: 'male' }
     - { type: 'restricted_pairing', participant_id, worker_id }
     - { type: 'certification_required', cert_type: string }
     - { type: 'max_hours_fortnight', max: number }
     - { type: 'consecutive_sleepovers', max: number }
     - { type: 'language_required', language: string }
     - { type: 'no_pets_allergy' }
     - etc — make this extensible
   - Rule: { id, organization_id, entity_type: 'participant'|'worker'|'house', entity_id, condition: RuleCondition, severity: RuleSeverity, message: string, requires_reason: boolean, created_by, created_at }
   - RuleEvaluationContext: the action being attempted, e.g. { action: 'create_shift', shift: {...}, participant: {...}, worker: {...} }
   - RuleEvaluationResult: { passed: boolean, blocks: Rule[], confirms: Rule[], informs: Rule[] }

2. Supabase migration /supabase/migrations/0003_rules.sql:
   - rules table
   - rule_overrides table: id, rule_id, action_context jsonb, override_reason text, overridden_by, overridden_at — captures every confirm-with-reason override
   - RLS org-scoped + house-scoped

3. /lib/primitives/rules/evaluators.ts
   - One evaluator function per RuleCondition type
   - export const EVALUATORS: Record<ConditionType, (rule, context) => boolean>
   - Each returns true if the rule is TRIGGERED (i.e. condition met)

4. /lib/primitives/rules/engine.ts
   - evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult>
   - Loads all applicable rules from DB (filtered by entity_type and entity_id from context)
   - Runs each rule's evaluator
   - Groups triggered rules by severity
   - Returns result

5. /lib/primitives/rules/actions.ts (server actions):
   - attemptActionWithRules<T>(context, executeFn, options): wraps an action. If blocks present, throws. If confirms present and not yet overridden, throws RequiresConfirmationError. If user supplies override_reason, proceeds and logs override.
   - logOverride(rule_id, action_context, reason, user_id): inserts into rule_overrides

6. UI: /components/shared/rule-confirmation-modal.tsx
   - Shows when RequiresConfirmationError is caught client-side
   - Lists each "confirm" rule with its message
   - Required textarea for override_reason
   - Confirm button submits with reason
   - Cancel discards the action

7. /lib/primitives/rules/builder.ts — helper for building common rules from a UI (e.g. "Sandy has no vehicle" auto-creates a `participant_no_vehicle` rule with severity 'confirm' and a reasonable default message).

Unit tests covering each evaluator and the engine's grouping logic.
```

---

## PROMPT 6 — Auth + Onboarding Flow

```
Build the auth and onboarding flow.

1. /app/(auth)/signup/page.tsx — owner-only signup. Email + password. Creates auth.users + profiles row with role='owner'. After signup redirects to /onboarding.

2. /app/(auth)/onboarding/page.tsx — multi-step wizard with Framer Motion transitions between steps:
   Step 1: Organization details (name, ABN, NDIS registration number, timezone defaults to Australia/Sydney, logo upload to Supabase storage)
   Step 2: First house setup (name, address, suburb, state, postcode, max residents, vehicle info)
   Step 3: Invite team (multiple email + role rows, sends invitations via Resend API — set up later, for now just insert invitation rows and show a "copy invite link" UI)
   Step 4: Welcome screen — links to Dashboard

3. /app/(auth)/login/page.tsx — email + password login.

4. /app/(auth)/invite/[token]/page.tsx — accepts invitation token, lets user set their password and full_name, joins org with the invited role, auto-assigns to invited houses.

5. /app/(auth)/forgot-password/page.tsx and reset-password page.

6. Email templates (in /lib/email/templates/) for invitation, password reset, welcome. Use React Email. For now just markup, hook up Resend later.

UI quality bar:
- Use shadcn/ui Card, Input, Button, Label
- Generous whitespace: py-12 minimum on auth pages
- Centered card max-w-md with subtle shadow
- Logo/wordmark at top
- Helpful microcopy under each field
- Loading states on every submit (button shows spinner inside, disabled)
- Errors shown inline via shadcn Form
- Success toasts via sonner

Use Server Actions for all submissions. Validate with Zod schemas in /lib/validators/auth.ts.
```

---

## PROMPT 7 — App Shell and Navigation

```
Build the main app shell for authenticated users.

1. /app/(app)/layout.tsx — protected layout. Server-checks auth, fetches PermissionContext, wraps children in <PermissionProvider>.

2. /components/shared/sidebar.tsx — left sidebar nav. Items conditionally rendered based on permissions:
   - Dashboard (everyone)
   - Roster (anyone with ROSTER_VIEW)
   - Participants (anyone with PARTICIPANT_VIEW)
   - Workers (managers and above)
   - Houses (managers and above)
   - Notice Board (everyone)
   - Messages (everyone)
   - Reminders (everyone)
   - Reports (managers and above)
   - Settings (owners only at the top-level; some sub-pages accessible to managers)
   
   Sidebar is 240px wide, collapsible to 64px icons-only. Active item has a soft tinted background and left border accent.

3. /components/shared/top-bar.tsx — top bar with:
   - Global search input (command-K to open command palette — use cmdk library)
   - House switcher dropdown (if user has multiple houses, switches the active house context filter)
   - Notifications bell with unread count badge
   - Profile avatar dropdown (profile, settings, sign out)

4. /components/shared/command-palette.tsx — cmdk-based palette with sections:
   - Quick actions (create shift, create participant, post announcement)
   - Navigation (jump to any module)
   - Recent items
   - AI command (typing "@" prefix sends to Claude)

5. /components/shared/notifications-panel.tsx — slide-out panel from the right with notifications grouped by date. Each notification has icon, title, time, action button. Mark all read button at top.

6. Mobile: sidebar collapses behind a hamburger, top bar stays sticky.

Use Framer Motion AnimatePresence for sidebar collapse and panel slides. Match the design rules in .cursorrules: soft shadows, rounded corners, 200ms ease-out animations.

Build a /app/(app)/dashboard/page.tsx placeholder with welcome card and empty-state widgets for unfilled shifts, expiring docs, AI nudges, today's incidents. We'll wire them up in later prompts.
```

---

## PROMPT 8 — Participants Module (Core)

```
Build the Participants module at /app/(app)/participants/.

Database migration /supabase/migrations/0004_participants.sql:

Tables:
- participants: id, organization_id, house_id, ndis_number, full_name, preferred_name, date_of_birth, gender, primary_language, secondary_languages text[], cultural_background, photo_url, emergency_contacts jsonb, gp_details jsonb, plan_start_date, plan_end_date, plan_total_budget numeric, plan_budget_by_category jsonb, goals jsonb, dietary jsonb, preferences jsonb, has_vehicle_access boolean, mobility_aids text[], communication_methods text[], behaviour_support_plan_url, restrictive_practice_register jsonb, status text default 'active', created/updated/deleted columns

- participant_medications: id, participant_id, drug_name, strength, form, prescriber, script_date, expiry_date, indication, max_dose_per_24h, min_interval_hours, photo_url, storage_location, stock_count, type text check (type in ('prn','webster_pak')), webster_pak_pharmacy_name, webster_pak_collection_day, status text default 'active', timestamps

- prn_administration_log: id, participant_id, medication_id, administered_by, administered_at, reason, dose_given, effect_30min_followup, notes, created_at

- participant_rules — uses the rules table from primitive 3, references participants

UI:

1. /app/(app)/participants/page.tsx — list view:
   - Table of participants with photo, name, NDIS number, house, plan dates (with countdown badge), status
   - Filter: by house, by status
   - Sort: name, plan end date
   - Search by name or NDIS number
   - "Add Participant" button (permission-gated)
   - Click row → /participants/[id]

2. /app/(app)/participants/new/page.tsx — multi-step create form:
   Step 1: Basic info (name, DOB, NDIS number, gender, language, photo)
   Step 2: House assignment + plan dates + budget
   Step 3: Preferences and goals
   Step 4: Vehicle, mobility, communication
   Step 5: Emergency contacts and GP
   Submit creates participant + registers plan_dates with Countdown Engine

3. /app/(app)/participants/[id]/page.tsx — detail view with tabs:
   - Overview (all profile data, edit-in-place for managers)
   - Medications (PRN list with countdown badges + Webster-pak record)
   - Rules (list of rules attached to this participant, manager can add/edit)
   - Goals & Plan
   - Documents
   - Activity Log (filtered audit log for this participant)

4. /app/(app)/participants/[id]/medications/new — add PRN medication form. On save, registers with Countdown Engine using DEFAULT_MEDICATION thresholds.

5. /components/participants/medication-card.tsx — shows PRN med with countdown badge, "Administer" button (opens admin log dialog), edit/cease actions.

6. /components/participants/prn-admin-dialog.tsx — modal for logging PRN administration. Required: dose, reason, time. Optional 30-min follow-up effect field. Saves to prn_administration_log.

7. /components/participants/rule-builder.tsx — UI for adding common rules to a participant (no vehicle, gender preference, restricted worker pairings, language required). Uses /lib/primitives/rules/builder.ts.

Server Actions in /app/(app)/participants/actions.ts:
- createParticipant, updateParticipant, archiveParticipant
- addMedication, ceaseMedication, logPRNAdministration
- addParticipantRule, removeParticipantRule

All actions use withPermission() and write to audit_log. All forms validated with Zod.

Design quality:
- Detail page uses a hero card at top with photo and key facts, tabs below
- Medication countdown badges prominently displayed
- Edit forms use inline editing where possible (click-to-edit pattern with save/cancel)
- Empty states for each tab
```

---

## PROMPT 9 — Workers Module + Compliance Docs

```
Build the Workers module at /app/(app)/workers/.

Database migration /supabase/migrations/0005_workers.sql:

Tables:
- workers (extends profiles where role='support_worker'): worker_profile_id (1:1 with profiles), employment_type text (casual/part-time/full-time), schads_level int, visa_type text, visa_max_hours_per_fortnight int, bank_details_encrypted jsonb, tax_file_number_encrypted text, super_fund jsonb, languages text[], certifications_summary jsonb, vehicle_info jsonb, preferences jsonb, status text default 'active'

- compliance_documents: id, worker_id, doc_type text check (doc_type in ('ndis_worker_screening','first_aid_cpr','wwcc','drivers_license','right_to_work','vaccination','vehicle_insurance','manual_handling','peg_feeding','mental_health_first_aid','other')), doc_name text, file_url text, issued_date date, expiry_date date, issuing_body text, document_number text, status text check (status in ('pending_approval','approved','rejected','expired')) default 'pending_approval', rejected_reason text, approved_by uuid, approved_at timestamp, submitted_at timestamp, created/updated/deleted

- worker_rules — references the rules table

UI:

1. /app/(app)/workers/page.tsx — list view:
   - Table: photo, name, role, houses, compliance status (computed: any expired/expiring docs show red/amber badge), active status
   - Filter by house, compliance status (compliant/expiring/non-compliant), role
   - Search by name
   - "Invite Worker" button → invitation flow

2. /app/(app)/workers/[id]/page.tsx — detail tabs:
   - Overview
   - Compliance Documents (list with countdown badges, pending approval queue prominently shown)
   - Certifications & Skills
   - Availability (read-only here, worker submits via their own UI)
   - Shift History
   - Rules
   - Activity Log

3. Worker-side onboarding wizard at /app/(app)/onboarding-worker/page.tsx (triggered first login for users with role='support_worker'):
   Step 1: Personal details
   Step 2: Bank + super (or skip)
   Step 3: Emergency contact
   Step 4: Document uploads — mandatory list with file upload + expiry date entry for each. Workers can't skip past until all mandatory docs uploaded. Each upload triggers compliance_documents insert with status='pending_approval'.
   Step 5: Optional skills and certifications
   Step 6: Submit → status awaits manager approval

4. /app/(app)/workers/[id]/compliance/page.tsx (manager view) — list of compliance docs with bulk-approve actions. Each pending doc shows file preview, expiry date worker entered, approve/reject buttons. Reject requires reason. Approved docs are locked and registered with Countdown Engine using DEFAULT_COMPLIANCE_DOC thresholds.

5. Worker self-service compliance: /app/(app)/my-compliance/page.tsx (only visible to support_workers in their own sidebar)
   - List of their own docs with status (pending/approved/rejected/expired)
   - "Submit New Document" button for renewals — flips status to pending_approval and notifies manager

6. /lib/primitives/rules/integrations/worker-compliance.ts — auto-creates rules:
   When a compliance doc expires, a hidden Block rule is auto-registered: "Cannot roster: [doc_type] expired on [date]." When renewed and approved, rule is removed.

Server Actions /app/(app)/workers/actions.ts:
- inviteWorker, updateWorker, archiveWorker
- submitComplianceDoc (worker-side), approveComplianceDoc (manager-side), rejectComplianceDoc
- addWorkerRule, removeWorkerRule

Key UX moment: the manager dashboard widget for "Pending Compliance Approvals" shows count with one-click approve flow. Reduce friction here aggressively — managers won't approve docs if it takes 5 clicks per doc.
```

---

## PROMPT 10 — Roster Module (THE CORE FEATURE)

```
Build the Roster module at /app/(app)/roster/. This is the most important module — quality matters.

Database migration /supabase/migrations/0006_roster.sql:

Tables:
- shifts: id, organization_id, house_id, participant_id (nullable for non-participant-specific shifts like sleepovers), worker_id (nullable for unfilled), start_at timestamptz, end_at timestamptz, shift_type text check (shift_type in ('day','afternoon','evening','sleepover','active_overnight','community_access','transport','broken_shift')), status text check (status in ('unfilled','offered','confirmed','in_progress','completed','cancelled','swap_pending')), ratio text default '1:1', notes text, schads_classification jsonb (computed: ordinary, overtime, public_holiday rates), clock_in_at, clock_out_at, clock_in_location point, clock_out_location point, override_rule_ids uuid[], override_reasons jsonb[], created/updated/deleted/by columns

- shift_swap_requests: id, shift_id, requesting_worker_id, target_worker_id, reason, status text check in ('pending','approved','rejected','cancelled'), approved_by, approved_at, created_at

- worker_availability: id, worker_id, date date, start_time time, end_time time, status text check in ('available','preferred','unavailable'), notes text, submitted_at, locked_at (when manager locks the roster for the period)

- public_holidays: id, organization_id, date, name text, state text — pre-seeded with NSW holidays for 2026

UI:

1. /app/(app)/roster/page.tsx — calendar-first view:
   - FullCalendar integration with Day, Week, Month views
   - View toggle top-right (Day | Week | Month)
   - Today button, jump-to-date picker, keyboard shortcuts (J/K for day, T for today, G→D for date picker)
   - Filter chips: by house, by shift_type, by status, by worker
   - "Unfilled shifts" filter chip prominent in red with count
   - Shifts as colored pills: unfilled=red, offered=amber, confirmed=green, in_progress=blue, completed=grey, swap_pending=purple
   - Drag-to-move shifts (calls update server action)
   - Drag edge to resize
   - Click empty space → "Create Shift" modal pre-fills time
   - Click existing shift → side panel with details, edit, comments thread, swap request, cancel

2. /components/roster/shift-create-modal.tsx:
   - Fields: house, participant (optional), worker (optional — can be unfilled), start/end datetime, shift_type, ratio, notes
   - On submit, evaluates rules engine BEFORE save:
     - If blocks → show error modal with rule messages
     - If confirms → show RuleConfirmationModal (from primitive 3), require reasons, then proceed
     - If informs → show toast warnings but proceed
   - On success, refresh calendar

3. /components/roster/shift-detail-panel.tsx — slide-in from right:
   - Header: date, time, house, participant
   - Worker section with avatar (or "Unfilled" with "Assign Worker" CTA)
   - SCHADS computed pay info (managers only)
   - Comments thread (shift-scoped messaging — uses messaging system)
   - Audit log mini-view (who created, who edited)
   - Actions: Edit, Cancel Shift, Request Swap

4. /components/roster/worker-availability-grid.tsx — manager view:
   - Grid: rows = workers, columns = next 14 days
   - Cells: green (available), light green (preferred), grey (unavailable), red (already shifted), dark grey (not yet submitted)
   - Tap a green cell → "Create shift here" modal pre-fills worker+date
   - Filter by house (only show workers assigned to selected house)
   - Switch to "Aggregate view" mode: rows = days, shows count of available workers per shift period

5. Worker availability submission /app/(app)/my-availability/page.tsx (worker-side):
   - Calendar tile grid for next 4 weeks
   - Tap to toggle: available → preferred → unavailable → clear
   - "Submit" button locks in availability
   - Manager can override and lock the roster for a week, after which workers see "Availability locked for this week" message

6. /lib/ai/rostering-tools.ts — Claude tool definitions for the AI command bar:
   - create_shift({ house, participant, worker, start, end, shift_type, ratio })
   - query_availability({ date_range, house, shift_type })
   - find_replacement({ shift_id })
   - check_schads_compliance({ worker_id, fortnight })
   - get_unfilled_shifts({ date_range })

7. /components/shared/ai-command-bar.tsx — command palette extension:
   - When user types in palette, route to AI if message > 3 words or starts with "ask"
   - Sends to /api/ai/route with current user context, role, house scope
   - API uses Anthropic SDK with tool use, executes tool calls server-side with RBAC checks
   - Streams response back, shows tool calls in flight, then result
   - "Roster Sarah for Monday 7am-3pm at Parramatta" → AI calls create_shift after rules-engine evaluation

8. /app/api/ai/route.ts — POST endpoint, server-only ANTHROPIC_API_KEY usage, full conversation loop with tool execution.

Performance: paginate FullCalendar events to visible range only. Use Supabase real-time subscriptions on shifts table so multi-manager teams see updates live.

Design quality bar: this is the showcase feature. Animations on drag, smooth modal opens, polished empty states, generous spacing.
```

---

## PROMPT 11 — Messaging Module

```
Build the in-app messaging module at /app/(app)/messages/.

Database migration /supabase/migrations/0007_messaging.sql:

Tables:
- channels: id, organization_id, name, channel_type text check in ('dm','group_dm','house_channel','role_channel','topic_channel','announcement'), house_id (nullable), is_post_only boolean default false, created_by, created_at, archived_at
- channel_members: id, channel_id, user_id, joined_at, last_read_at, notification_preference text check in ('all','mentions','muted') default 'all'
- messages: id, channel_id, parent_message_id (for threads), user_id, content text, content_html text, attachments jsonb, reactions jsonb default '{}', edited_at, deleted_at, deleted_by, ai_invoked boolean default false, shift_id (nullable — for shift-scoped messages), created_at
- message_mentions: id, message_id, mentioned_user_id, read_at
- voice_messages: id, message_id, audio_url, duration_seconds, transcript text

Scope rules (enforce in RLS):
- Workers can only see channels where they're a member
- Workers can only DM other users in their assigned houses
- House channels auto-include all users assigned to that house
- Role channels auto-include all users with that role in the org

UI:

1. /app/(app)/messages/page.tsx — three-pane layout:
   - Left: channel list grouped by section (Channels, Direct Messages, Recent)
   - Middle: message list for selected channel
   - Right (optional, opens on click): thread panel

2. /components/messaging/channel-list.tsx — collapsible sections, unread badges, # for channels, @ for DMs

3. /components/messaging/message-list.tsx — virtualized for performance, infinite scroll up for history, real-time subscription for new messages

4. /components/messaging/message-composer.tsx:
   - Rich text editor (use Tiptap with markdown shortcuts: **bold**, *italic*, lists, code)
   - Emoji picker (use emoji-picker-react)
   - File/image attach button (uploads to Supabase storage)
   - Voice message record button (records audio, uploads, sends transcript via Claude as fallback)
   - @mention autocomplete (use a popover with user search filtered by channel members)
   - Send button + Enter to send, Shift+Enter for new line

5. /components/messaging/message-bubble.tsx:
   - Avatar + name + timestamp
   - Content rendered with markdown
   - Reactions row (click emoji to add/remove reaction)
   - Hover actions: Reply in thread, React, Pin, Edit (own messages), Delete (soft, leaves tombstone)
   - Threaded replies indicator: "3 replies — view thread"

6. /components/messaging/thread-panel.tsx — opens on right, shows parent message + replies, own composer for reply

7. AI integration: when @AI is mentioned in any channel:
   - Triggers /api/ai/route with channel context, user's permission scope
   - AI's response inserted as a message from a system "AI" user, with ai_invoked=true flag
   - AI's tool calls operate within the inviting user's RBAC scope

8. Shift-scoped comments: from the roster shift detail panel, the comments thread is a virtual "channel" of type='topic_channel' auto-named "Shift YYYY-MM-DD [House]" — managers and the assigned worker auto-joined. Messages appear in the regular Messages module too if user has scope, OR only in the shift panel based on a `shift_id` filter.

9. Notice Board posting integration: managers post via /app/(app)/notice-board which creates messages in an announcement-type channel that workers see in read-only mode with optional acknowledge reactions.

Realtime: use Supabase realtime channels per channel_id for live message delivery. Show typing indicators.

Read receipts: when user views a message, update channel_members.last_read_at. Show unread counts based on diff. Optional per-message read receipts toggle in user settings.
```

---

## PROMPT 12 — Notice Board, Reminders, Settings

```
Build remaining v1 modules.

NOTICE BOARD at /app/(app)/notice-board/:

Database additions to messaging migration:
- announcements: id, organization_id, channel_id (the announcement channel), message_id (the underlying message), title text, priority text check in ('standard','urgent'), category text, target_audience jsonb (roles, houses, individuals), requires_acknowledgment boolean, pinned boolean, expires_at, scheduled_for, created_by, created_at
- announcement_acknowledgments: id, announcement_id, user_id, acknowledged_at

UI:
1. /app/(app)/notice-board/page.tsx — feed view:
   - Pinned announcements at top
   - Filterable by category (General, Policy Update, Roster Update, Training, Incident Awareness, Celebration)
   - Each card shows title, content, priority badge, author, time, acknowledge count, "Acknowledge" button if required and not yet acknowledged
   
2. /app/(app)/notice-board/new/page.tsx — create form (manager-only):
   - Title, content (rich text), category, priority
   - Target audience builder (multi-select: roles, houses, individuals)
   - Toggles: requires acknowledgment, pin to top
   - Schedule for future or post now
   - Optional expiry date
   
3. /app/(app)/notice-board/[id]/acknowledgments/page.tsx — manager view of who has/hasn't acknowledged

REMINDERS at /app/(app)/reminders/:

Database migration /supabase/migrations/0008_reminders.sql:
- reminders: id, organization_id, created_by, assigned_to (nullable), title, description, due_at, recurrence_rule text (rrule format, nullable), category, status text check in ('pending','completed','snoozed','cancelled'), house_id (nullable), related_entity_type, related_entity_id, completed_at, snoozed_until, created_at

UI:
1. /app/(app)/reminders/page.tsx — list view grouped by Today / This Week / Later / Completed
2. /components/reminders/create-modal.tsx — title, description, due date, recurrence (None / Daily / Weekly / Monthly / Custom RRULE), assign to user, optional house, optional related entity
3. Dashboard widget shows today's reminders
4. Cron job: daily 6am Sydney, fires due reminder notifications

NOTIFICATIONS:
/lib/primitives/notifications/send.ts — unified notification dispatcher:
- Channels: in_app (always), email (default on), sms (paid, via Twilio — set up keys later)
- Notification types: countdown_threshold, reminder_due, mention, message_in_channel, shift_offered, shift_swap_request, compliance_pending, ai_nudge
- Each user has notification_preferences in profiles (jsonb) controlling which channel per type
- In-app: inserts into notifications table, real-time push to client
- Email: Resend API with React Email templates
- SMS: Twilio API stub for now

Database /supabase/migrations/0009_notifications.sql:
- notifications: id, user_id, organization_id, type, title, body, action_url, related_entity, read_at, created_at

SETTINGS at /app/(app)/settings/:

1. /settings/organization — name, ABN, NDIS reg, logo, timezone, brand color (single accent), public holidays per state (auto-load from a seed)
2. /settings/users — table of all users, role, houses, active status. Owner can change roles, deactivate, resend invite.
3. /settings/houses — CRUD for houses
4. /settings/permissions — permission matrix view (rows=users, columns=permissions, checkboxes). Owner-only. Saves to permissions table.
5. /settings/custom-roles — create named roles with permission sets
6. /settings/integrations — placeholder for future (Resend, Twilio config)
7. /settings/audit-log — paginated view of audit_log with filters (user, action, entity type, date range). Owner-only by default.
8. /settings/profile — user's own profile, password change, notification preferences, density toggle (compact/comfortable/spacious), 2FA setup
```

---

## PROMPT 13 — Polish, Skeleton States, Empty States, A11y

```
Final polish pass across the entire app.

1. Every list view must have:
   - Skeleton loading state (use shadcn Skeleton, animate-pulse)
   - Empty state component with illustration, helpful text, primary CTA
   - Error state with retry button

2. Build /components/shared/empty-state.tsx — reusable: takes icon (Lucide), title, description, action button. Use across all empty lists.

3. Build /components/shared/skeleton-table.tsx, /components/shared/skeleton-card.tsx, /components/shared/skeleton-calendar.tsx for consistent loading.

4. Accessibility audit:
   - All interactive elements keyboard-accessible (tab order, focus rings)
   - Form labels properly associated
   - ARIA labels on icon-only buttons
   - Color contrast meets WCAG AA (use a tool like @axe-core/react in dev mode)
   - Screen reader announcements for important state changes (use sonner with aria-live)
   - Reduced motion respected (prefers-reduced-motion media query disables Framer Motion transitions)

5. Density toggle (from settings/profile) wires to a data-density attribute on body. CSS variables adjust spacing scale: compact reduces py/px by 1 step, spacious increases by 1.

6. Mobile responsive pass:
   - Sidebar → bottom tab bar on mobile (5 most-used items + more menu)
   - Tables → card list views on mobile
   - Calendar → day view default on mobile
   - Forms → full-width stacked
   - Modals → bottom sheets on mobile (use Vaul library)

7. Performance:
   - Image optimization with next/image
   - Route-level code splitting (already automatic with App Router)
   - Suspense boundaries around heavy components
   - Optimistic UI updates on common mutations (shift create, message send, acknowledgment)

8. Error boundaries:
   - Root error.tsx with friendly error UI and retry
   - Module-level error.tsx for graceful degradation

9. Loading.tsx files in each route segment with skeleton appropriate to that view.

10. SEO/metadata: even though it's a private app, set proper <title>, favicon, app icons. Generate /app/icon.png and /app/apple-icon.png.

11. Final check: run lighthouse on key pages. Target 95+ Performance, 100 Accessibility, 100 Best Practices.
```

---

## PROMPT 14 — Pilot Deploy + Seed Data

```
Prepare for pilot deployment.

1. /supabase/seed.sql — demo data for development:
   - 1 organization "Demo SIL Co"
   - 1 owner, 2 team leaders, 1 roster coordinator, 6 support workers
   - 2 houses (Parramatta, Blacktown)
   - 6 participants (3 per house) with realistic NDIS data, varied medications, varied rules (one with no vehicle, one with gender restriction, one with restricted pairing)
   - 2 weeks of historical shifts, 1 week of future shifts (some unfilled)
   - Sample notice board posts
   - Sample reminders
   - Worker availability submitted for all 6 workers for next 2 weeks
   - One compliance doc nearing expiry per worker for countdown demo

2. Environment setup docs in /README.md:
   - Prerequisites: Node 20+, pnpm, Supabase CLI, Vercel CLI
   - Local dev setup: supabase start, npx supabase db reset, pnpm dev
   - Env vars list
   - Deployment: vercel deploy, supabase link, supabase db push

3. Vercel deployment config /vercel.json — region syd1 (Sydney), Node 20 runtime

4. Supabase Edge Functions deploy: countdown-daily cron + ai-handler

5. Pre-launch checklist /LAUNCH_CHECKLIST.md:
   - All migrations applied to production Supabase
   - RLS policies enabled and tested (run test suite against production schema in shadow mode)
   - Anthropic API key set in production
   - Resend domain verified for emails
   - Custom domain pointed at Vercel
   - SSL working
   - Audit log writing in production
   - Backup schedule confirmed (Supabase daily backups enabled)
   - Privacy policy + terms of service pages
   - First customer onboarded with hand-holding session
```

---

## EXECUTION NOTES

1. Run prompts in order. Do NOT skip ahead. Each builds on the prior.

2. After each prompt, manually QA before moving to the next. Test the migration, test the UI, fix Cursor's hallucinations.

3. Commit after each prompt. Branch per major prompt if you're feeling disciplined.

4. When Cursor gets stuck or hallucinates, paste the .cursorrules content again as a reminder.

5. Total realistic timeline: 4-6 weeks of focused evenings + weekends, faster if you can put 8 hours/day on it.

6. The pilot user is your team leader's house. Free pilot in exchange for feedback and a written testimonial.

7. Focus on shipping, refining, and earning a real "this is better than what we use now" out of three independent SIL team leaders. That signal is worth more than any revenue number at this stage.

Now stop reading and start building.

— Caspian
