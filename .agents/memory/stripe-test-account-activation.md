---
name: Stripe test account activation
description: External Stripe account state required before Sixth Front can create Accounts v2 connected accounts in test mode.
---

Stripe test-mode API credentials and a valid signed webhook destination are not sufficient for Accounts v2 onboarding. Stripe can reject connected-account creation with `account_create_activation_required` until the platform account completes Stripe’s test-mode account activation.

**Why:** The API initialized successfully and a signed event-destination ping returned HTTP 200, but the first onboarding account creation was rejected by Stripe before any connected account was created.

**How to apply:** If onboarding creation fails with this code, activate the same Stripe platform account used by the development API key in Stripe Dashboard test mode, then retry the onboarding flow. Do not rotate secrets or change application code unless Stripe returns a different error.