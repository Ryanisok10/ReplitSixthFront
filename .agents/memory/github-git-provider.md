---
name: GitHub push authentication
description: Distinguishes GitHub API access from Git CLI push authentication in this workspace.
---

The GitHub API connection can successfully read and write repositories while the workspace Git CLI still fails to authenticate a configured GitHub remote.

**Why:** Replit's Git provider and generic GitHub API connections use separate authentication paths; a healthy API connection does not prove that `git push` has a usable credential helper.

**How to apply:** Check an actual push separately. If it fails, use the connected GitHub API to create Git objects and fast-forward the branch only after confirming the remote tip is unchanged; never request a token or force-push.