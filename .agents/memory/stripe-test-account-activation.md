---
name: Stripe test account activation
description: External Stripe account state required before Sixth Front can create Accounts v2 connected accounts in test mode.
---

Stripe test-mode API credentials and a valid signed webhook destination are not sufficient for Accounts v2 onboarding. Stripe can reject connected-account creation with `account_create_activation_required` until the platform account completes Stripe’s test-mode account activation. This platform also has new Accounts v1 creation disabled, so a legacy Custom-account seed is not a viable fallback.

**Why:** Accounts v2 onboarding was rejected before account creation, and Stripe separately rejected a fully populated test Custom account because new Connect integrations must use Accounts v2 unless an API policy explicitly enables v1 compatibility.

**How to apply:** Activate the same Stripe platform account used by the development API key in Stripe Dashboard test mode, then retry the Accounts v2 onboarding flow. Do not fake `charges_enabled` in the database or use Accounts v1 as a workaround.