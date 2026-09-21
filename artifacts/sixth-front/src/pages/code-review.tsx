import { useEffect, useState } from "react";
import { Link } from "wouter";

type AuthUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

type ProposalStatus = "pending_review" | "applied" | "rejected" | "expired";

type ProposalFile = {
  path: string;
  expectedSha256: string;
  currentSha256: string | null;
  proposedSha256: string;
  beforeContent: string | null;
  replacementContent: string;
  matchesExpected: boolean;
};

type Proposal = {
  id: string;
  status: ProposalStatus;
  summary: string;
  createdAt: string;
  expiresAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  files: ProposalFile[];
};

async function request<T extends object>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const payload = (await response.json().catch(() => ({}))) as
    | T
    | { error?: string };
  if (!response.ok) {
    throw new Error(
      "error" in payload && payload.error
        ? payload.error
        : `Request failed (${response.status})`,
    );
  }
  return payload as T;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function displayName(user: AuthUser) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Reviewer";
}

function statusLabel(status: ProposalStatus) {
  return {
    pending_review: "Pending review",
    applied: "Applied",
    rejected: "Rejected",
    expired: "Expired",
  }[status];
}

function DiffPanel({ file }: { file: ProposalFile }) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-[#211d1a] text-[#fff8ee]" data-testid={`proposal-diff-${file.path}`}>
      <div className="flex flex-col gap-2 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-display text-lg font-bold text-[#fff0d8]">{file.path}</h3>
        <span className={`text-xs font-bold uppercase tracking-wider ${file.matchesExpected ? "text-[#9ee0aa]" : "text-[#ffad92]"}`}>
          {file.matchesExpected ? "Expected version matches" : "File changed since proposal"}
        </span>
      </div>
      <div className="grid gap-px bg-white/10 lg:grid-cols-2">
        <div className="min-w-0 bg-[#2d2722]">
          <div className="border-b border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#d9c9b9]">
            Before
          </div>
          <pre className="max-h-[360px] min-h-[140px] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-[#f4d8c0]">
            {file.beforeContent ?? "This file could not be read."}
          </pre>
        </div>
        <div className="min-w-0 bg-[#272f2a]">
          <div className="border-b border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#bde9c5]">
            After
          </div>
          <pre className="max-h-[360px] min-h-[140px] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-[#ddf6e1]">
            {file.replacementContent}
          </pre>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-3 font-mono text-[10px] leading-relaxed text-[#cdbbaa]">
        Expected SHA-256: {file.expectedSha256}
        <br />
        Current SHA-256: {file.currentSha256 ?? "unavailable"}
        <br />
        Proposed SHA-256: {file.proposedSha256}
      </div>
    </section>
  );
}

function ProposalCard({
  proposal,
  busy,
  onApprove,
  onReject,
}: {
  proposal: Proposal;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isPending = proposal.status === "pending_review";
  const isStale = proposal.files.some((file) => !file.matchesExpected);

  return (
    <article className="rounded-2xl border border-line bg-white shadow-[0_8px_30px_rgba(115,59,31,0.08)]" data-testid={`proposal-card-${proposal.id}`}>
      <div className="p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                isPending ? "bg-[#fff0e9] text-tomato-dark" : "bg-[#f1e9df] text-muted"
              }`}>
                {statusLabel(proposal.status)}
              </span>
              <span className="text-xs text-muted">Created {formatDate(proposal.createdAt)}</span>
            </div>
            <h2 className="max-w-3xl font-display text-2xl font-bold leading-tight text-red md:text-3xl">
              {proposal.summary}
            </h2>
          </div>
          <div className="shrink-0 rounded-lg bg-cream px-3 py-2 text-right text-xs text-muted">
            <strong className="block text-lg font-bold text-ink">{proposal.files.length}</strong>
            affected {proposal.files.length === 1 ? "file" : "files"}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2" aria-label="Affected files">
          {proposal.files.map((file) => (
            <span key={file.path} className="rounded-md border border-line bg-paper px-3 py-1.5 font-mono text-xs text-ink">
              {file.path}
            </span>
          ))}
        </div>

        <div className="mt-8 space-y-5">
          {proposal.files.map((file) => <DiffPanel key={file.path} file={file} />)}
        </div>

        {isPending && (
          <div className="mt-7 flex flex-col gap-4 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
            <p className={`max-w-xl text-sm leading-relaxed ${isStale ? "font-bold text-red" : "text-muted"}`}>
              {isStale
                ? "Approval is blocked because one or more files no longer match the expected SHA-256."
                : `This proposal expires ${formatDate(proposal.expiresAt)}. Approval rechecks every file immediately before writing.`}
            </p>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onReject}
                disabled={busy}
                className="rounded-lg border-2 border-line px-5 py-3 text-sm font-bold text-ink transition-colors hover:border-red hover:text-red disabled:cursor-not-allowed disabled:opacity-50"
                data-testid={`button-reject-${proposal.id}`}
              >
                Reject proposal
              </button>
              <button
                type="button"
                onClick={onApprove}
                disabled={busy || isStale}
                className="rounded-lg bg-tomato px-5 py-3 text-sm font-bold text-white shadow-[0_3px_0_rgb(184,52,29)] transition-all hover:bg-tomato-dark hover:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
                data-testid={`button-approve-${proposal.id}`}
              >
                {busy ? "Saving..." : "Approve and apply"}
              </button>
            </div>
          </div>
        )}

        {!isPending && proposal.reviewedAt && (
          <p className="mt-6 border-t border-line pt-5 text-sm text-muted">
            Recorded {formatDate(proposal.reviewedAt)}
          </p>
        )}
      </div>
    </article>
  );
}

export default function CodeReview() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadProposals = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await request<{ proposals: Proposal[] }>("/api/project-proposals");
      setProposals(result.proposals);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load proposals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    request<{ user: AuthUser | null }>("/api/auth/user")
      .then((result) => {
        setUser(result.user);
        if (result.user) void loadProposals();
      })
      .catch(() => setError("Could not check your sign-in status."))
      .finally(() => setAuthLoading(false));
  }, []);

  const updateProposal = async (proposal: Proposal, action: "approve" | "reject") => {
    if (action === "reject" && !window.confirm("Reject this proposal? The source files will not change.")) {
      return;
    }
    setBusyId(proposal.id);
    setError("");
    try {
      const result = await request<Proposal>(`/api/project-proposals/${proposal.id}/${action}`, { method: "POST" });
      setProposals((current) => current.map((item) => item.id === result.id ? result : item));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The proposal could not be updated.");
      await loadProposals();
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = proposals.filter((proposal) => proposal.status === "pending_review").length;

  return (
    <div className="min-h-screen bg-[#eee2d1] text-ink">
      <header className="border-b border-line bg-paper/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 md:px-8">
          <Link href="/" className="font-display text-xl font-extrabold uppercase tracking-wide text-red" data-testid="link-review-brand">
            Sixth Front <span className="font-sans text-sm font-semibold normal-case tracking-normal text-muted">/ Review</span>
          </Link>
          {user && (
            <div className="flex items-center gap-4 text-sm">
              <span className="hidden text-muted sm:inline">{displayName(user)}</span>
              <button type="button" onClick={() => { window.location.href = `/api/logout?returnTo=${encodeURIComponent("/code-review")}`; }} className="font-bold text-red hover:text-tomato" data-testid="button-logout">
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-16">
        {authLoading ? (
          <div className="rounded-2xl border border-line bg-paper p-10 text-center text-muted" data-testid="status-auth-loading">Checking access…</div>
        ) : !user ? (
          <section className="mx-auto max-w-xl rounded-2xl border border-line bg-paper p-8 text-center shadow-[0_8px_30px_rgba(115,59,31,0.08)] md:p-12">
            <span className="text-4xl" aria-hidden="true">◆</span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-none text-red">Proposal review</h1>
            <p className="mt-4 text-lg leading-relaxed text-muted">Sign in to inspect Abacus code proposals and approve changes to the project.</p>
            <button
              type="button"
              onClick={() => { window.location.href = `/api/login?returnTo=${encodeURIComponent("/code-review")}`; }}
              className="mt-8 rounded-lg bg-tomato px-7 py-3.5 font-bold text-white shadow-[0_4px_0_rgb(184,52,29)] transition-all hover:bg-tomato-dark hover:translate-y-[2px]"
              data-testid="button-login"
            >
              Log in to continue
            </button>
            {error && <p className="mt-5 text-sm font-bold text-red">{error}</p>}
          </section>
        ) : (
          <>
            <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-tomato">Protected workspace</p>
                <h1 className="font-display text-4xl font-extrabold leading-none text-red md:text-6xl">Review code proposals.</h1>
                <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">Inspect every before-and-after change, confirm the files are still the expected versions, then approve or reject the proposal.</p>
              </div>
              <button type="button" onClick={() => void loadProposals()} disabled={loading} className="shrink-0 rounded-lg border-2 border-line bg-paper px-5 py-3 text-sm font-bold text-ink hover:border-tomato hover:text-tomato disabled:opacity-50" data-testid="button-refresh-proposals">
                {loading ? "Refreshing…" : "Refresh proposals"}
              </button>
            </div>

            {error && <div className="mb-6 rounded-lg border border-red/20 bg-[#fff0e9] p-4 text-sm font-bold text-red" role="alert" data-testid="status-review-error">{error}</div>}

            <div className="mb-6 flex items-center justify-between border-b border-line pb-4">
              <h2 className="font-display text-2xl font-bold text-ink">Proposal queue</h2>
              <span className="text-sm font-bold text-muted">{pendingCount} pending</span>
            </div>

            {loading && proposals.length === 0 ? (
              <div className="rounded-2xl border border-line bg-paper p-10 text-center text-muted" data-testid="status-proposals-loading">Loading proposals…</div>
            ) : proposals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-paper p-12 text-center" data-testid="status-proposals-empty">
                <h2 className="font-display text-2xl font-bold text-red">No proposals yet</h2>
                <p className="mt-2 text-muted">New Abacus proposals will appear here for review.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {proposals.map((proposal) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    busy={busyId === proposal.id}
                    onApprove={() => void updateProposal(proposal, "approve")}
                    onReject={() => void updateProposal(proposal, "reject")}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}