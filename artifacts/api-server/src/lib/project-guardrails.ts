import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdir,
  readdir,
  readFile,
  realpath,
  stat,
  writeFile,
} from "node:fs/promises";
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
const proposalTtlMs = 24 * 60 * 60 * 1000;

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

export type ProposedChange = {
  path: string;
  expectedSha256: string;
  replacementContent: string;
};

export type ProjectPatchProposalStatus =
  | "pending_review"
  | "applied"
  | "rejected"
  | "expired";

type StoredProposal = {
  id: string;
  status: ProjectPatchProposalStatus;
  summary: string;
  createdAt: string;
  expiresAt: string;
  changes: ProposedChange[];
  reviewedAt?: string;
  reviewedBy?: string;
  appliedAt?: string;
  appliedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  expiredAt?: string;
};

export type ProjectPatchFileReview = {
  path: string;
  expectedSha256: string;
  currentSha256: string | null;
  proposedSha256: string;
  beforeContent: string | null;
  replacementContent: string;
  matchesExpected: boolean;
};

export type ProjectPatchProposalReview = Omit<
  StoredProposal,
  "changes"
> & {
  files: ProjectPatchFileReview[];
};

export class ProjectPatchConflictError extends Error {
  constructor(public readonly conflicts: string[]) {
    super(
      `The proposal is stale. These files changed after it was created: ${conflicts.join(", ")}`,
    );
    this.name = "ProjectPatchConflictError";
  }
}

function proposalPath(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    throw new Error("Invalid project patch proposal id.");
  }
  return path.join(proposalsDirectory, `${id}.json`);
}

async function readStoredProposal(id: string): Promise<StoredProposal> {
  const raw = await readFile(proposalPath(id), "utf8");
  const proposal = JSON.parse(raw) as Partial<StoredProposal>;
  if (
    proposal.id !== id ||
    typeof proposal.summary !== "string" ||
    typeof proposal.createdAt !== "string" ||
    !Array.isArray(proposal.changes)
  ) {
    throw new Error("The project patch proposal is invalid.");
  }
  return proposal as StoredProposal;
}

async function saveStoredProposal(proposal: StoredProposal) {
  await writeFile(
    proposalPath(proposal.id),
    JSON.stringify(proposal, null, 2),
    { encoding: "utf8", mode: 0o600 },
  );
}

async function expireIfNeeded(proposal: StoredProposal) {
  if (
    proposal.status === "pending_review" &&
    Date.now() >= new Date(proposal.expiresAt).getTime()
  ) {
    proposal.status = "expired";
    proposal.reviewedAt = new Date().toISOString();
    proposal.expiredAt = proposal.reviewedAt;
    await saveStoredProposal(proposal);
  }
  return proposal;
}

async function reviewProposal(
  proposal: StoredProposal,
): Promise<ProjectPatchProposalReview> {
  const files = await Promise.all(
    proposal.changes.map(async (change) => {
      try {
        const current = await readProjectFile(change.path);
        return {
          path: current.path,
          expectedSha256: change.expectedSha256,
          currentSha256: current.sha256,
          proposedSha256: createHash("sha256")
            .update(change.replacementContent)
            .digest("hex"),
          beforeContent: current.content,
          replacementContent: change.replacementContent,
          matchesExpected: current.sha256 === change.expectedSha256,
        };
      } catch {
        return {
          path: change.path,
          expectedSha256: change.expectedSha256,
          currentSha256: null,
          proposedSha256: createHash("sha256")
            .update(change.replacementContent)
            .digest("hex"),
          beforeContent: null,
          replacementContent: change.replacementContent,
          matchesExpected: false,
        };
      }
    }),
  );

  return {
    id: proposal.id,
    status: proposal.status,
    summary: proposal.summary,
    createdAt: proposal.createdAt,
    expiresAt: proposal.expiresAt,
    reviewedAt: proposal.reviewedAt,
    reviewedBy: proposal.reviewedBy,
    files,
  };
}

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
  if (new Set(changes.map((change) => change.path)).size !== changes.length) {
    throw new Error("A patch proposal cannot include the same file twice.");
  }

  const id = randomUUID();
  const createdAt = new Date().toISOString();
  await mkdir(proposalsDirectory, { recursive: true });
  await writeFile(
    proposalPath(id),
    JSON.stringify(
      {
        id,
        status: "pending_review",
        summary: input.summary,
        createdAt,
        expiresAt: new Date(Date.now() + proposalTtlMs).toISOString(),
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

export async function listProjectPatchProposals() {
  await mkdir(proposalsDirectory, { recursive: true });
  const entries = await readdir(proposalsDirectory, { withFileTypes: true });
  const proposals: ProjectPatchProposalReview[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const id = entry.name.slice(0, -5);
    try {
      const proposal = await expireIfNeeded(await readStoredProposal(id));
      proposals.push(await reviewProposal(proposal));
    } catch {
      // Ignore files that are not valid proposal records.
    }
  }
  return proposals.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getProjectPatchProposal(id: string) {
  const proposal = await expireIfNeeded(await readStoredProposal(id));
  return reviewProposal(proposal);
}

export async function rejectProjectPatchProposal(id: string, reviewedBy: string) {
  const proposal = await expireIfNeeded(await readStoredProposal(id));
  if (proposal.status !== "pending_review") {
    throw new Error(`This proposal is already ${proposal.status}.`);
  }
  proposal.status = "rejected";
  proposal.reviewedAt = new Date().toISOString();
  proposal.reviewedBy = reviewedBy;
  proposal.rejectedAt = proposal.reviewedAt;
  proposal.rejectedBy = reviewedBy;
  await saveStoredProposal(proposal);
  return reviewProposal(proposal);
}

export async function approveProjectPatchProposal(
  id: string,
  reviewedBy: string,
) {
  const proposal = await expireIfNeeded(await readStoredProposal(id));
  if (proposal.status !== "pending_review") {
    throw new Error(`This proposal is already ${proposal.status}.`);
  }

  const currentFiles = await Promise.all(
    proposal.changes.map(async (change) => {
      try {
        const safePath = safeRelativePath(change.path);
        const resolvedPath = await realpath(safePath.absolutePath);
        if (
          resolvedPath !== workspaceRoot &&
          !resolvedPath.startsWith(`${workspaceRoot}${path.sep}`)
        ) {
          throw pathError();
        }
        const file = await stat(resolvedPath);
        if (!file.isFile()) {
          throw new Error("Not a file.");
        }
        const content = await readFile(resolvedPath, "utf8");
        const sha256 = createHash("sha256").update(content).digest("hex");
        return { ...change, resolvedPath, content, sha256 };
      } catch {
        return {
          ...change,
          resolvedPath: null,
          content: null,
          sha256: null,
        };
      }
    }),
  );

  const conflicts = currentFiles
    .filter((file) => file.sha256 !== file.expectedSha256)
    .map((file) => file.path);
  if (conflicts.length > 0) {
    throw new ProjectPatchConflictError(conflicts);
  }

  for (const file of currentFiles) {
    if (!file.resolvedPath) {
      throw new ProjectPatchConflictError([file.path]);
    }
    await writeFile(file.resolvedPath, file.replacementContent, "utf8");
  }

  proposal.status = "applied";
  proposal.reviewedAt = new Date().toISOString();
  proposal.reviewedBy = reviewedBy;
  proposal.appliedAt = proposal.reviewedAt;
  proposal.appliedBy = reviewedBy;
  await saveStoredProposal(proposal);
  return reviewProposal(proposal);
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