---
name: Checkbox focus visibility
description: Reliable keyboard-focus treatment for checkbox selectors in this project.
---

Prefer a visible native checkbox with focus styling applied directly to the focused input when keyboard focus must be visually verifiable.

**Why:** Parent-tile focus selectors and state-driven outlines around visually hidden checkboxes did not render consistently in the real-browser test environment, even when the selector or state appeared present.

**How to apply:** For service selectors and similar controls, keep the native input visible and apply the focus indicator to `input:focus-visible`; use the surrounding card only for selected and hover states.