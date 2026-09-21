---
name: GitHub push authentication
description: Distinguishes GitHub API access from Git CLI push authentication in this workspace.
---

The GitHub API connection can successfully read repositories while the workspace Git CLI still fails to authenticate a configured GitHub remote.

**Why:** Replit's Git provider and generic GitHub API connections use separate authentication paths; a healthy API connection does not prove that `git push` has a usable credential helper.

**How to apply:** Check `git remote -v`, `git ls-remote`, and an actual push separately. If the Git CLI askpass fails, use the Replit Git pane's provider/repository connection flow rather than requesting or handling a GitHub token in chat.