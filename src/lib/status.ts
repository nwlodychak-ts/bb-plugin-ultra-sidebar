// The five buckets a thread can be in, read off the thread and its pull
// request. A manual "done" archives the thread. The stored manual statuses
// remain for the CLI and the database.
//
// Which puts the weight on how hard we looked before concluding a thread has
// no pull request. See pull-requests.ts: resolving one from the thread's
// environment alone gets this wrong the moment a checkout is deleted, and
// silently files merged work as In progress. Callers are expected to pass
// what that module resolves, not a raw environment lookup.
//
// Free of react and node imports: the server's CLI and the app both use it.

/** The statuses a person can set by hand. Everything else is derived. */
export type ManualStatus = "backlog" | "done" | "canceled";

const MANUAL_STATUSES: readonly ManualStatus[] = [
  "backlog",
  "done",
  "canceled",
];

export function isManualStatus(value: unknown): value is ManualStatus {
  return (MANUAL_STATUSES as readonly unknown[]).includes(value);
}

export type StatusBucket =
  | "needs-attention"
  | "in-progress"
  | "complete"
  | "pull-request"
  | "merged"
  | "closed"
  | "archived";

/** Buckets in the order the sidebar shows them: what needs you first, finished work last. */
export const STATUS_BUCKETS: readonly { key: StatusBucket; label: string }[] = [
  { key: "needs-attention", label: "Needs attention" },
  { key: "in-progress", label: "In progress" },
  { key: "complete", label: "Complete" },
  { key: "pull-request", label: "Pull request" },
  { key: "merged", label: "Merged" },
  { key: "closed", label: "Closed" },
  { key: "archived", label: "Archived" },
];

export const STATUS_LABEL: Record<StatusBucket, string> = Object.fromEntries(
  STATUS_BUCKETS.map((bucket) => [bucket.key, bucket.label]),
) as Record<StatusBucket, string>;

export function isStatusBucket(value: unknown): value is StatusBucket {
  return STATUS_BUCKETS.some((bucket) => bucket.key === value);
}

/** Buckets filed under their own heading at the bottom of the project view. */
export const PARKED_BUCKETS: readonly StatusBucket[] = ["merged", "closed", "archived"];

/**
 * Whether a drop or menu can put a thread in this bucket. Only In progress:
 * filing there clears a manual status. The rest follow the thread and its
 * pull request.
 */
export function canFileInto(bucket: StatusBucket): boolean {
  return bucket === "in-progress";
}

/** Whether the thread is archived or its pull request is merged or closed. */
export function isFinished(bucket: StatusBucket): boolean {
  return bucket === "merged" || bucket === "closed" || bucket === "archived";
}

/** The subset of a pull request that decides a bucket. */
export interface PullRequestLike {
  state: "open" | "draft" | "merged" | "closed";
}

const BUSY_STATUSES = new Set(["starting", "active", "stopping"]);

/** Whether a thread's execution status means a turn is running. */
export function isBusy(status: string): boolean {
  return BUSY_STATUSES.has(status);
}

/** Thread facts that decide a bucket. */
export interface ThreadFacts {
  /** A question, a failed turn, or a pull request problem. */
  attention?: boolean;
  /** The agent is running, starting, or has a queued message. */
  working?: boolean;
  archived?: boolean;
}

/**
 * Which bucket a thread belongs in. An archived thread files under Archived.
 * Then a merged or closed pull request, then attention, then an open or draft
 * pull request. A working thread is In progress, and a stopped one is Complete.
 */
export function statusBucket(
  pullRequest: PullRequestLike | undefined,
  { attention = false, working = false, archived = false }: ThreadFacts = {},
): StatusBucket {
  if (archived) return "archived";
  if (pullRequest?.state === "merged") return "merged";
  if (pullRequest?.state === "closed") return "closed";
  if (attention) return "needs-attention";
  if (pullRequest !== undefined) return "pull-request";
  return working ? "in-progress" : "complete";
}

const STATUS_SECTION_PREFIX = "status:";

export function statusSectionId(bucket: StatusBucket): string {
  return `${STATUS_SECTION_PREFIX}${bucket}`;
}

export function bucketFromSectionId(id: string | null): StatusBucket | null {
  if (id === null || !id.startsWith(STATUS_SECTION_PREFIX)) return null;
  const key = id.slice(STATUS_SECTION_PREFIX.length);
  return isStatusBucket(key) ? key : null;
}
