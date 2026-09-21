# Sixth Front — Phase 1 Compliance Changes

This branch applies the Phase 1 legal/compliance fixes to the marketing site and\
merchant intake flow. Summary of every change and how to finish deployment.

## 1\. No setup fee / no `$99`

* There is no `$99` or setup fee anywhere in the codebase (verified). The commission\
  model has no setup fee.

* The agreement now states **"There is no setup fee."** in both the Merchant Services\
  section and on every line of the Pricing Schedule\
  (`artifacts/api-server/src/lib/merchant-intake.ts`).

## 2\. DRAFT agreement → attorney-approved MSA v2.0

* `DEFAULT_AGREEMENT` updated: version `MSA-2026-09-11-v2.0`, `isDraft: false`, all\
  "DRAFT FOR REVIEW — NOT ATTORNEY-APPROVED" banners removed, and the text now\
  references the **Master Merchant Services Agreement, Version 2.0 (dated September 11,\
  2026)**.

* The signup step 5 heading changed from "Draft Agreement Review" to\
  **"Merchant Services Agreement"** and displays the active version.

### IMPORTANT — the agreement is database-backed

`getActiveAgreement()` serves the row in `agreement_versions` where `is_active = true`.\
Editing the code constant is **not** enough. After deploy, run the seed once to insert\
and activate MSA v2.0 (and deactivate old DRAFT rows):

```
pnpm --filter @workspace/api-server seed:agreement   # requires DATABASE_URL
```

## 3\. Legal footer on all pages

* New `artifacts/sixth-front/src/components/legal-footer.tsx` renders links to\
  `/privacy`, `/terms`, `/cookies`, `/sms-terms`.

* Added to the home page footer, the signup wizard, and every legal page.

## 4\. Legal route pages (verbatim content)

* New routes `/privacy`, `/terms`, `/cookies`, `/sms-terms` in `App.tsx`.

* Pages under `artifacts/sixth-front/src/pages/legal/` render the attorney-approved\
  text **verbatim** via Vite `?raw` imports from\
  `artifacts/sixth-front/src/legal/*.txt` (Privacy Policy & Website ToU & Cookie\
  Notice last updated Sept 4, 2026; SMS & Email Terms v2.0 Sept 11, 2026). No text is\
  retyped or paraphrased.

## 5\. Clickwrap consent + intake notices (verbatim)

* The step-5 acceptance checkbox now uses stronger clickwrap language referencing the\
  on-screen MSA + Pricing Schedule + version and links to all four legal documents.

* The non-binding intake notice and privacy authorization notice\
  (Consumer Checkout Implementation Language §5 and §6, verbatim) are shown above the\
  submit button on both the home preview form and signup step 1.

## 6\. acceptance_audit_logs (INSERT-only)

* New table `acceptance_audit_logs` in `lib/db/src/schema/merchant-intake.ts` with the\
  required fields: `record_id`, `merchant_id`, `document_type`, `document_version`,\
  `document_hash` (SHA-256), `acceptance_timestamp_utc`, `ip_address`, `user_agent`,\
  `session_id`.

* `submitStandard()` now writes one audit row per acceptance inside the same\
  transaction, hashing the exact displayed document (SHA-256).

* INSERT-only enforcement (blocks UPDATE/DELETE via triggers) is in\
  `lib/db/sql/acceptance_audit_logs_insert_only.sql`. drizzle-kit push does not manage\
  triggers, so after pushing the schema run:

```
pnpm --filter @workspace/db push
psql "$DATABASE_URL" -f lib/db/sql/acceptance_audit_logs_insert_only.sql
```

(The existing `agreement_acceptances` table is unchanged and still stores full\
form/payload snapshots.)

## 7\. Vercel deployment prep

* `vercel.json` builds the Vite frontend to `artifacts/sixth-front/dist/public` and\
  routes `/api/*` to a serverless function.

* `api/index.ts` reuses the existing Express app (exported without `listen()`).

* **Not build-verified on Vercel from this environment.** The background jobs in the\
  api-server (Stripe webhook bootstrap, onboarding poller) are intentionally excluded\
  from the serverless entry and should run from the persistent Replit deployment, which\
  remains the primary supported deployment path (`.replit`).

## 8\. Stripe verification (fix #9)

* The onboarding code uses **Stripe Accounts v2 merchant configuration** (Express\
  dashboard, `card_payments` capability, `fees_collector: "stripe"`) — the **Direct\
  Charges** model. There is no `transfer_data` / `transfers.create` in the active code;\
  `transfers` appears only in `syncLegacyMerchantAccount` for pre-existing legacy rows.

* Keys are environment-driven; `stripe-client.ts` accepts `sk_test_`/`rk_test_` and\
  `sk_live_`/`rk_live_`. **Set `STRIPE_SECRET_KEY` to a `sk_test_...` sandbox key** in\
  the deploy environment to run in test mode. (The key value itself is not in the repo\
  and cannot be verified from source.)

## Validation performed in this branch

* `pnpm run typecheck` — passed (all workspace projects).

* `pnpm --filter @workspace/sixth-front build` — passed (Vite, 112 modules).

* `pnpm --filter @workspace/api-server build` — passed (esbuild bundle).