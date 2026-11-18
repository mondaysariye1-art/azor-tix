# AZOR TIX Laravel Organizer Platform Plan

## Status and hard prerequisite

This is a replatform, not an in-place extension of the current Figma Make backend.

The current repository cannot execute or deploy the required stack:

- no PHP runtime;
- no Composer or Laravel project;
- no MySQL service;
- no Laravel deployment target;
- Figma Make’s lifecycle packages only a Next.js `.next` artifact.

Implementation begins only after a Laravel-capable repository and runtime are provided. The target environment must support PHP 8.3+, Composer, MySQL 8, persistent object storage, scheduled jobs, queues, HTTPS, and deployment of both a React SPA and Laravel API.

The existing Make site remains operational until the new system passes migration rehearsal and cutover verification.

## Confirmed product decisions

- Frontend: React 19 + TypeScript + Vite, styled with modern responsive CSS.
- Backend: Laravel 12 REST API on PHP 8.3+.
- Database: MySQL 8 with InnoDB, foreign keys, UTC timestamps, and transactional writes.
- Authentication: Laravel Sanctum for the React SPA, Laravel policies/gates for RBAC.
- Payments: Paystack with server-generated totals, signed webhooks, and idempotent finalization.
- Email: Resend integration is implemented behind a feature flag, but all outbound email is disabled initially.
- Event market: events remain Nigeria → FCT → Abuja only. Organizer addresses may be elsewhere.
- Existing homepage and AZOR TIX turquoise/black brand are preserved.
- Organizers cannot initiate payouts. Only Super Admin can authorize financial transactions.
- Commission: 5% of ticket subtotal is withheld from organizer earnings.
- Customer Service Fee: 2% of ticket subtotal is added to the customer’s charge.
- Paystack gateway fees are stored separately and do not change the configured 5% organizer commission or 2% customer fee.

## Existing production inventory and preservation

The current Payload backend contains:

- 6 users;
- 6 events;
- 12 ticket types;
- 6 media assets;
- 0 orders;
- 0 transactions;
- 0 tickets;
- 0 team memberships;
- 0 payout requests;
- 0 refunds;
- 0 complaints;
- 0 subscribers.

Migration will preserve stable legacy IDs in `legacy_source` / `legacy_id` columns, event slugs, publication state, organizer ownership, ticket pricing/quantity, and media provenance. Existing Payload data will not be deleted during migration.

Password migration requires a compatibility spike because Payload password material may not be directly verifiable by Laravel. The migration process will:

1. inspect exported password-hash formats without exposing hashes in logs;
2. use Laravel-compatible verification only if cryptographically compatible;
3. otherwise mark imported accounts `password_migration_required`;
4. keep those accounts blocked from password login until the future email-claim flow is enabled or a Super Admin performs a secure manual reset;
5. allow newly registered Laravel accounts to log in immediately while email delivery is disabled.

No plaintext, temporary shared, or predictable passwords will be generated.

## Repository and deployment layout

Use a monorepo in the provided Laravel-capable environment:

```text
/
  frontend/                 React 19 + Vite SPA
    src/
      api/
      auth/
      components/
      features/
        organizers/
        events/
        tickets/
        attendees/
        finance/
        reports/
      routes/
      styles/
  backend/                  Laravel 12 API
    app/
      Actions/
      Enums/
      Http/Controllers/Api/
      Http/Requests/
      Jobs/
      Mail/
      Models/
      Policies/
      Services/
    database/
      factories/
      migrations/
      seeders/
    routes/api.php
  infrastructure/
    deployment/
    runbooks/
  docs/
    api/
    migration/
```

Serve the SPA and API from trusted HTTPS origins. Prefer same-site deployment so Sanctum can use secure, HTTP-only, SameSite cookies with CSRF protection. If origins differ, use an explicit CORS allowlist and Sanctum stateful-domain configuration.

## Core data model

### Identity and organizer profile

`users`

- id, email unique, password hash, role (`organizer`, `admin`, `super_admin`);
- account status (`active`, `suspended`, `password_migration_required`);
- email verification fields retained but enforcement controlled by `EMAIL_VERIFICATION_REQUIRED`;
- failed-login counters, lock timestamps, remember/session metadata.

`organizer_profiles`

- user FK unique;
- account type (`individual`, `business`);
- full/contact name;
- registered business name and optional CAC number;
- phone, country, state, city, business address;
- display name and unique public slug;
- profile/logo media FK;
- about;
- contact email and phone;
- Instagram, Facebook, TikTok, website;
- public visibility and onboarding completion;
- bank account fields stored encrypted at rest;
- bank verification status, provider recipient/subaccount identifiers, and verification timestamps.

Keep CMS/admin identities separate from public organizer accounts in authorization behavior even if they share the `users` table; roles never grant Laravel admin-panel access implicitly.

### Events and sessions

`events`

- organizer FK;
- title, unique slug, category;
- short and full descriptions;
- format (`physical`, `virtual`, `hybrid`);
- visibility (`public`, `private`);
- age restriction;
- Nigeria/FCT/Abuja location fields, venue, address, virtual link;
- schedule type (`single`, `recurring`, `multiple_session`);
- cover media FK, optional video URL/upload, appearance configuration;
- contact snapshot;
- capacity;
- refund policy;
- lifecycle status (`draft`, `pending_approval`, `approved`, `published`, `rejected`, `cancelled`);
- rejection reason, submitted/approved/published/cancelled timestamps;
- optimistic-lock version and `wizard_step_completed`.

`event_sessions`

- event FK;
- sequence, title;
- start/end timestamps;
- venue/address or virtual link overrides;
- recurrence metadata when applicable.

`event_media`

- event FK;
- media FK;
- type (`cover`, `gallery`, `video`);
- sort order and alt text.

Only published, public events are readable anonymously. Organizer policies constrain every private read/write to `organizer_id`. Admins review; Super Admins can override.

### Tickets, attendee requirements, and inventory

`ticket_types`

- event FK;
- preset/custom type;
- name and description;
- price in integer kobo;
- quantity;
- sales start/end;
- minimum/maximum purchase;
- benefits JSON/child rows;
- unit type (`single`, `group`) and group size;
- visibility (`public`, `invite_only`);
- status (`active`, `paused`, `sold_out`);
- inventory counters;
- unique event/name constraint where appropriate.

`attendee_questions`

- event FK;
- label/help text;
- type (`text`, `textarea`, `single_choice`, `multiple_choice`, `checkbox`, `date`);
- options JSON;
- required flag;
- sort order;

`event_entry_requirements`

- event FK;
- terms text / policy URL;
- acknowledgement requirement;

Question definitions are snapshotted onto paid orders/tickets so later edits do not alter historical attendee answers.

### Commerce, access, and marketing

`orders`, `order_items`, `transactions`, `tickets`, `ticket_answers`

- unique internal order reference and unique Paystack reference;
- immutable money snapshots in kobo;
- subtotal;
- customer service fee (2%);
- customer total;
- platform commission (5%);
- organizer earnings (95% of subtotal);
- gateway fee stored separately after settlement data is available;
- status transitions with audit timestamps;
- signed/UUID QR ticket code unique;
- one-time check-in fields and checker identity.

`discount_codes`

- event FK;
- unique normalized code per event;
- fixed/percentage discount;
- validity period, usage limit, per-customer limit;
- ticket applicability and active status.

`guest_list_entries`

- event and optional ticket type FKs;
- attendee identity;
- quantity;
- complimentary/invite-only source;
- issuance status and audit creator.

`event_collections`, `event_collection_items`

- organizer-owned grouping for reporting and dashboard organization.

`team_memberships`

- organizer FK;
- invited email;
- role (`manager`, `check_in`, `analyst`, custom permission set);
- invite token hash, status, expiry, accepted user;
- granular permissions enforced in policies.

`announcements`

- organizer/event FK;
- subject/body/audience;
- status (`draft`, `scheduled`, `disabled`, `sent`, `failed`);
- outbound jobs cannot dispatch while `OUTBOUND_EMAIL_ENABLED=false`.

`payouts`

- organizer/event/period references;
- gross sales, commission, customer fees, refunds, organizer net;
- status (`calculated`, `pending_review`, `approved`, `processing`, `paid`, `rejected`);
- only Super Admin can create an authorization/transition to approved or paid;
- organizer access is read-only.

`audit_logs`

- actor, action, resource type/id, before/after metadata, IP/user agent, timestamp;
- required for approval, finance, check-in overrides, role changes, and payout actions.

## API design

Version all endpoints under `/api/v1`.

### Authentication

- `POST /auth/register/individual`
- `POST /auth/register/business`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/forgot-password` (returns generic success; dispatch disabled initially)
- `POST /auth/reset-password`
- `POST /auth/email/verify`
- `POST /auth/email/resend` (dispatch disabled initially)
- `GET /auth/me`

Use dedicated Laravel Form Requests, normalized lower-case email, password confirmation, Laravel password hashing, login throttling, session rotation, CSRF protection, and generic recovery responses.

### Organizer and public profile

- `GET/PUT /organizer/profile`
- `POST /organizer/profile/logo`
- `PUT /organizer/bank-account`
- `POST /organizer/bank-account/verify`
- `GET /organizers/{slug}` public profile with published events only.

### Event wizard

- `POST /organizer/events` creates a draft and returns its ID/version.
- `GET /organizer/events/{event}` resumes a draft.
- `PUT /organizer/events/{event}/steps/{1..6}` validates and saves one step.
- `POST /organizer/events/{event}/media`
- CRUD `/organizer/events/{event}/sessions`
- CRUD `/organizer/events/{event}/ticket-types`
- CRUD `/organizer/events/{event}/questions`
- `GET /organizer/events/{event}/preview`
- `POST /organizer/events/{event}/submit`
- `POST /organizer/events/{event}/publish` only after approval.
- Admin approval/rejection endpoints use explicit transitions and audit logs.

Every update requires the current optimistic-lock version to prevent one browser/team member overwriting another.

### Operations

- event/order/attendee/ticket listing with pagination and filtering;
- QR check-in endpoint with atomic `valid → used` transition;
- guest-list and complimentary-ticket issuance;
- discount-code CRUD and validation;
- team invitation/permission endpoints;
- announcement draft/schedule endpoints;
- streamed CSV export endpoints;
- finance summary, payout history, and bank verification;
- Super Admin payout authorization endpoints.

All resource routes use Laravel Policies and scoped route binding so guessing another organizer’s ID returns 404/403 without leaking private records.

## Registration and onboarding UX

1. `/register` first asks Individual or Organization / Business.
2. Render the exact fields from the brief for the selected account type.
3. Validate password confirmation client-side and server-side.
4. Create `users` + `organizer_profiles` in one MySQL transaction.
5. With email disabled, mark new accounts active and show a clear “email verification will be enabled later” state without pretending mail was sent.
6. Log in and route to a profile-completion checklist.
7. Dashboard completion meter links directly to missing profile, bank, and first-event tasks.

When email is later enabled, new registrations become pending verification through the feature flag; existing active users are not retroactively locked without a separate approved migration.

## Six-step event wizard UX

- Dedicated `/dashboard/events/new` and `/dashboard/events/{id}/edit` routes.
- Persistent top progress indicator, step labels, completed/error states.
- Save & Continue, Save Draft, Previous, and Exit controls on every step.
- Step data is server-saved; local browser state is only an unsaved convenience.
- File uploads show progress, validation, preview, retry, and removal.
- Ticket types and custom questions use repeatable accessible editors.
- Review screen renders the same public event components used by the live page.
- Submit moves `draft → pending_approval`; organizers cannot bypass approval.
- Admin review records notes and transitions to approved/rejected.
- Approved events may be published by the organizer.

## Dashboard information architecture

Replace the current single long form with route-based dashboard modules:

- Overview;
- Events with status tabs;
- Event wizard;
- Sales and revenue;
- Orders and transactions;
- Attendees;
- QR check-in;
- Guest lists and complimentary tickets;
- Discounts;
- Collections;
- Team and permissions;
- Announcements;
- Reports and CSV exports;
- Bank and payouts;
- Public profile;
- Account settings.

Mobile uses a drawer/bottom navigation pattern; tables collapse to cards or horizontally scroll with sticky primary columns. All destructive actions require confirmation and server authorization.

## Payment and concurrency rules

1. The API reloads event/ticket inventory and computes all totals; browser totals are display-only.
2. Checkout creates an idempotency record and pending order in a transaction.
3. Ticket inventory is reserved atomically with row locking and an expiration.
4. Paystack initialization uses the unique server reference.
5. Webhooks verify `x-paystack-signature` with constant-time comparison.
6. Webhook/fallback verification locks the transaction row and is idempotent.
7. A successful transaction issues each ticket once, generates unique QR identifiers, and records immutable financial snapshots.
8. Duplicate webhook, callback, or retry calls return the existing result.
9. Ticket check-in uses a conditional atomic update so a code cannot be used twice.
10. Email delivery failure never rolls back a paid order or ticket issuance.

## Media, security, and privacy

- Private direct uploads use signed server requests and strict MIME/size checks.
- Public event/profile images live in an S3-compatible bucket/CDN; private exports are signed and expire.
- Encrypt bank account numbers and provider secrets at rest; mask them in API responses.
- Store all secrets in environment variables.
- Rate-limit auth, checkout, check-in, invite, exports, and Paystack endpoints.
- Use CSP, HSTS, secure cookies, CSRF defense, CORS allowlists, validation, output escaping, and dependency scanning.
- Never expose attendee, order, banking, or team data through public APIs.
- Log financial and authorization actions without logging secrets, passwords, full bank numbers, or Paystack authorization material.

## Migration and cutover

### Phase 1: provision and baseline

- Provide Laravel repository/runtime, MySQL, storage, queue, scheduler, and deployment.
- Configure development/staging/production environments.
- Add CI for Composer, PHPStan/Larastan, Pint, PHPUnit/Pest, frontend typecheck, lint, unit tests, and production builds.

### Phase 2: backend foundation

- Create migrations/models/enums/policies.
- Implement Sanctum auth, RBAC, organizer profiles, uploads, and feature flags.
- Add API contract documentation and generated TypeScript API client.

### Phase 3: organizer frontend

- Port the current AZOR TIX brand/header/homepage intact.
- Build registration variants, login/reset shell, onboarding, profile settings, and public profiles.
- Build route-based responsive dashboard.

### Phase 4: event workflow

- Implement event/session/media/ticket/question APIs.
- Build the six-step autosaving wizard, preview, approval, and publication flows.

### Phase 5: commerce and operations

- Implement Paystack, inventory reservations, idempotent webhooks, QR tickets, check-in, attendees, guest lists, discounts, teams, collections, reports, and announcements-disabled state.

### Phase 6: finance

- Implement 5% commission, 2% customer fee, earnings ledger, bank verification, read-only organizer payout views, and Super Admin authorization.

### Phase 7: migration rehearsal

- Export Payload records with stable IDs and media manifests.
- Import into staging using idempotent Artisan commands.
- Verify counts, slugs, ownership, relationships, image dimensions, event publication, and ticket inventory.
- Run password compatibility spike and apply the safe account-claim outcome.
- Perform at least two clean rehearsals from a fresh MySQL database.

### Phase 8: cutover

- Freeze writes briefly on the old platform.
- Take a final export and checksum.
- Run idempotent final import.
- Verify record counts and smoke workflows.
- Switch DNS/API configuration.
- Keep Payload read-only for rollback until the agreed retention window ends.

## Test and acceptance matrix

### Automated

- registration validation for both account types;
- duplicate email and concurrent registration;
- login, logout, lockout, reset-token behavior, role isolation;
- organizer profile CRUD and public visibility;
- every wizard step, autosave, resume, conflict handling, and approval transition;
- media validation;
- ticket limits, sales windows, status, invite-only visibility, and sold-out transitions;
- attendee question types and required answers;
- discount limits and concurrency;
- Paystack initialization totals;
- signature validation, duplicate webhook idempotency, and mismatched amount rejection;
- exactly-once order, transaction, and ticket creation;
- QR one-time check-in race tests;
- ownership/policy tests across two organizers;
- admin versus Super Admin finance permissions;
- 5% commission / 2% service-fee ledger calculations;
- organizers cannot initiate payouts;
- CSV authorization and content;
- outbound email jobs remain blocked while disabled.

### End-to-end

1. Register an individual and a business organizer.
2. Complete both profiles and view public organizer pages.
3. Create and resume a draft across all six steps.
4. Submit, reject with notes, revise, approve, and publish.
5. Buy paid and complimentary tickets.
6. Verify Paystack callback and webhook retries do not duplicate records.
7. Scan a ticket successfully and reject a second scan.
8. Invite team roles and prove permission boundaries.
9. Export attendee/sales CSV.
10. Verify earnings and Super Admin-only payout authorization.
11. Test responsive layouts at mobile, tablet, and desktop breakpoints.

### Migration acceptance

- imported counts match the source inventory;
- all 6 events and 12 ticket types retain ownership and public URLs;
- all 6 media assets render with nonzero dimensions;
- existing public pages remain reachable;
- no source record is deleted;
- rollback to the old platform is documented and rehearsed.

## Required inputs before implementation

Provide or connect:

- a writable Laravel repository with PHP 8.3+, Composer, Node/pnpm for the SPA, and CI;
- MySQL 8 connection details through secure environment variables;
- staging and production deployment targets;
- S3-compatible media storage credentials;
- Paystack test keys, webhook registration access, and later live keys through secure environment variables;
- a public API/frontend origin and CORS policy;
- Resend credentials and verified sender only when outbound email is intentionally enabled.

No credentials should be pasted into chat or committed to the repository.
