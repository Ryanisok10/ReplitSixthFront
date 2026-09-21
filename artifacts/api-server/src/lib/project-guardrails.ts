import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function findWorkspaceRoot() {
  let current = path.resolve(process.cwd());
  while (true) {
    if (
      existsSync(path.join(current, "pnpm-workspace.yaml")) &&
      existsSync(path.join(current, "lib")) &&
      existsSync(path.join(current, "artifacts"))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error("The project workspace root could not be located.");
    }
    current = parent;
  }
}

const workspaceRoot = findWorkspaceRoot();
const proposalsDirectory = path.join(workspaceRoot, ".mcp-proposals");
const maxFileBytes = 60_000;
const maxProposalBytes = 120_000;

const allowedRootDirectories = ["artifacts", "lib", "scripts"];
const allowedRootFiles = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "replit.md",
  "tsconfig.base.json",
]);
const forbiddenPathParts = new Set([
  ".agents",
  ".env",
  ".git",
  ".local",
  ".mcp-proposals",
  ".replit-artifact",
  "attached_assets",
  "dist",
  "node_modules",
]);

const checks = {
  api_typecheck: {
    label: "API server typecheck",
    args: ["--filter", "@workspace/api-server", "typecheck"],
  },
  frontend_typecheck: {
    label: "Sixth Front typecheck",
    args: ["--filter", "@workspace/sixth-front", "typecheck"],
  },
  api_build: {
    label: "API server build",
    args: ["--filter", "@workspace/api-server", "build"],
  },
  frontend_build: {
    label: "Sixth Front build",
    args: ["--filter", "@workspace/sixth-front", "build"],
  },
} as const;

export type ProjectCheckName = keyof typeof checks;

function pathError() {
  return new Error(
    "Only non-secret source files under artifacts/, lib/, scripts/, or approved root config files are available.",
  );
}

function safeRelativePath(input: string) {
  const normalized = input.replaceAll("\\", "/").replace(/^\.\/+/, "");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.includes("\0") ||
    normalized.split("/").some((part) => part === "..") ||
    normalized.split("/").some((part) => forbiddenPathParts.has(part))
  ) {
    throw pathError();
  }

  const [first] = normalized.split("/");
  if (
    !allowedRootFiles.has(normalized) &&
    !allowedRootDirectories.includes(first)
  ) {
    throw pathError();
  }

  const absolutePath = path.resolve(workspaceRoot, normalized);
  if (
    absolutePath !== workspaceRoot &&
    !absolutePath.startsWith(`${workspaceRoot}${path.sep}`)
  ) {
    throw pathError();
  }
  return { normalized, absolutePath };
}

export async function readProjectFile(relativePath: string) {
  const { normalized, absolutePath } = safeRelativePath(relativePath);
  const resolvedPath = await realpath(absolutePath);
  if (
    resolvedPath !== workspaceRoot &&
    !resolvedPath.startsWith(`${workspaceRoot}${path.sep}`)
  ) {
    throw pathError();
  }
  const file = await stat(resolvedPath);
  if (!file.isFile()) throw new Error("The requested project path is not a file.");
  if (file.size > maxFileBytes) {
    throw new Error(`The requested file is larger than ${maxFileBytes} bytes.`);
  }

  const content = await readFile(resolvedPath, "utf8");
  return {
    path: normalized,
    bytes: Buffer.byteLength(content),
    sha256: createHash("sha256").update(content).digest("hex"),
    content,
  };
}

type ProposedChange = {
  path: string;
  expectedSha256: string;
  replacementContent: string;
};

export async function createProjectPatchProposal(input: {
  summary: string;
  changes: ProposedChange[];
}) {
  if (input.changes.length > 5) {
    throw new Error("A patch proposal may include at most five files.");
  }

  const changes = input.changes.map((change) => {
    const { normalized } = safeRelativePath(change.path);
    if (!/^[a-f0-9]{64}$/i.test(change.expectedSha256)) {
      throw new Error(`Invalid expected SHA-256 for ${normalized}.`);
    }
    if (Buffer.byteLength(change.replacementContent, "utf8") > maxProposalBytes) {
      throw new Error(`The proposed replacement for ${normalized} is too large.`);
    }
    return { ...change, path: normalized };
  });

  const id = randomUUID();
  await mkdir(proposalsDirectory, { recursive: true });
  await writeFile(
    path.join(proposalsDirectory, `${id}.json`),
    JSON.stringify(
      {
        id,
        status: "pending_review",
        summary: input.summary,
        createdAt: new Date().toISOString(),
        changes,
      },
      null,
      2,
    ),
    { encoding: "utf8", mode: 0o600 },
  );

  return {
    proposalId: id,
    status: "pending_review",
    summary: input.summary,
    files: changes.map(({ path: filePath, expectedSha256, replacementContent }) => ({
      path: filePath,
      expectedSha256,
      proposedSha256: createHash("sha256")
        .update(replacementContent)
        .digest("hex"),
    })),
    message:
      "The proposal was saved for human review. Source files were not changed and this MCP tool cannot apply the proposal.",
  };
}

function sanitizedCheckEnvironment() {
  const env = { ...process.env };
  for (const key of [
    "DATABASE_URL",
    "MCP_CLIENT_SECRET",
    "SESSION_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_V2_WEBHOOK_SECRET",
  ]) {
    delete env[key];
  }
  return env;
}

export async function runProjectCheck(name: ProjectCheckName) {
  const check = checks[name];
  if (!check) throw new Error("That project check is not available.");

  try {
    const result = await execFileAsync("pnpm", check.args, {
      cwd: workspaceRoot,
      env: sanitizedCheckEnvironment(),
      timeout: 120_000,
      maxBuffer: 24_000,
    });
    return {
      check: name,
      label: check.label,
      passed: true,
      exitCode: 0,
      output: `${result.stdout}${result.stderr}`.slice(-12_000),
    };
  } catch (error) {
    const failure = error as {
      code?: number | string;
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    return {
      check: name,
      label: check.label,
      passed: false,
      exitCode: typeof failure.code === "number" ? failure.code : null,
      output:
        `${failure.stdout ?? ""}${failure.stderr ?? ""}${failure.message ?? ""}`.slice(
          -12_000,
        ),
    };
  }
}