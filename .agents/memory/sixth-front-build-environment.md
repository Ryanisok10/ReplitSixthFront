---
name: Sixth Front build environment
description: Environment variables required when running direct frontend Vite builds.
---

The Sixth Front Vite configuration requires both `PORT` and `BASE_PATH` for direct build commands.

**Why:** Without the variables, Vite exits while loading its configuration before compiling the app.

**How to apply:** Set both values when invoking a direct build; the managed frontend workflow supplies them automatically.

The managed API workflow may start with `process.cwd()` set to `artifacts/api-server`, not the workspace root.

**Why:** Project-level tooling that resolves files or runs workspace commands must not assume the API package is the current directory.

**How to apply:** Locate the workspace root by walking upward to `pnpm-workspace.yaml` before allowing project-file reads or running checks.