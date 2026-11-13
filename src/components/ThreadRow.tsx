import { ThreadHandoff } from "./ThreadHandoff";
import { InlineModes, ThreadModes } from "./ThreadModes";
import { ThreadDiffCounts, ThreadDiffsContext, ThreadFactsContext } from "./ThreadWorkSummary";
import { Checkbox } from "./ui/checkbox";
import { useSidebarSelection } from "./SidebarInteractions";
import { memo, useCallback, useContext, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import {
  // JSX reads a lowercase-initial name as an intrinsic element, so this one
  // has to be aliased before it can be rendered as a component.
  experimental_ProviderIcon as ProviderIcon,
  experimental_useSidebarThreadSplit,
} from "@get-bb/plugin-sdk/app";
import { Icon } from "@/components/ui/icon";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import type { ThreadNode } from "@/lib/resolve";
import { LEVEL_BADGE_FROM_DEPTH, ROW_BASE_PAD_PX, indentPx } from "@/lib/indent";
import { useSidebar } from "./sidebar-context";
import { BucketGlyph } from "./StatusIcon";
import { agentOrb } from "./ThreadOrb";
import { SubtreeSummary, subtreeLabel, subtreeTone } from "./SubtreeSummary";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { RowContextMenu } from "./RowContextMenu";
import { RowDropDecor, useDragActive } from "./drag-state-context";
import { ThreadDetails } from "./ThreadDetails";
import { MachineIndicator } from "./MachineIndicator";
import { ProjectIcon } from "./ProjectIcon";
import { RowTip } from "./RowTip";
import { tomorrowMorning } from "./tomorrow-morning";
import { prefetchPullRequestStack } from "./PullRequestStack";
import {
  BranchBadge,
  JiraBadge,
  ModelBadge,
  PullRequestBadge,
  jiraKeyOf,
} from "./MetaBadges";
import { ThreadStatus, bucketOfThread, isAttention, threadStatus } from "./ThreadStatus";
import {
  PARKED_BUCKETS,
  STATUS_LABEL,
} from "@/lib/status";

/** The hover card opens on pointer enter. A drag turns it off. */
const DETAILS_OPEN_DELAY_MS = 0;
const DETAILS_CLOSE_DELAY_MS = 180;

/**
 * Id of the one open hover card in the sidebar. Opening a card closes the
 * previous one. A pointer leave closes it here, as Radix stalls during any text selection.
 */
let openCard: string | null = null;
let closeTimer: ReturnType<typeof setTimeout> | undefined;
const cardListeners = new Set<() => void>();

function showCard(id: string | null) {
  clearTimeout(closeTimer);
  if (openCard === id) return;
  openCard = id;
  for (const listener of cardListeners) listener();
}

function closeCard(id: string) {
  if (openCard === id) showCard(null);
}

function closeCardSoon(id: string) {
  if (openCard !== id) return;
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => closeCard(id), DETAILS_CLOSE_DELAY_MS);
}

function subscribeCard(listener: () => void) {
  cardListeners.add(listener);
  return () => {
    cardListeners.delete(listener);
  };
}

/**
 * A hover-only action in the row's trailing slot, after T3's sidebar: a
 * glyph, optionally with a word beside it. It sits inside the row's anchor,
 * so every event that would open, drag or rename the row is stopped here.
 */
function ParkButton({
  label,
  icon,
  text,
  onActivate,
}: {
  label: string;
  icon: "Clock" | "Check" | "RotateCcw" | "Spinner" | "Pin" | "PinOff";
  text?: string;
  onActivate: () => void;
}) {
  return (
    <RowTip label={label}>
      <button
        type="button"
        aria-label={label}
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onActivate();
        }}
        className={cn(
          "bb-ws-row-action flex h-5 shrink-0 items-center gap-1 rounded text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:pointer-coarse:h-9 max-md:pointer-coarse:min-w-9 max-md:pointer-coarse:justify-center",
          text === undefined ? "px-0.5" : "px-1",
        )}
      >
        <Icon name={icon} aria-hidden className="size-3.5 max-md:pointer-coarse:size-5" />
        {text === undefined ? null : (
          <span className="text-[11px] font-medium">{text}</span>
        )}
      </button>
    </RowTip>
  );
}

function RowHover({
  enabled,
  details,
  onWarm,
  children,
}: {
  enabled: boolean;
  details: ReactNode;
  /**
   * Called as the pointer arrives, before the open delay has run. The card's
   * slow facts (the pull request stack) start loading here, so the delay is
   * spent fetching rather than adding to the wait once the card is open.
   */
  onWarm?: () => void;
  children: ReactNode;
}) {
  const id = useId();
  const open = useSyncExternalStore(subscribeCard, () => openCard === id);
  useEffect(() => {
    if (!enabled) closeCard(id);
  }, [enabled, id]);
  useEffect(() => () => closeCard(id), [id]);
  const leave = (event: { pointerType: string }) => {
    if (event.pointerType !== "touch") closeCardSoon(id);
  };
  return (
    <HoverCard
      open={enabled && open}
      onOpenChange={(next) => (next ? showCard(id) : closeCard(id))}
      openDelay={DETAILS_OPEN_DELAY_MS}
      closeDelay={DETAILS_CLOSE_DELAY_MS}
    >
      <HoverCardTrigger asChild>
        <span
          className="flex w-full flex-col gap-0.5"
          onPointerEnter={(event) => {
            // A touch never opens the card, so it has nothing to warm.
            if (enabled && event.pointerType !== "touch") onWarm?.();
          }}
          onPointerLeave={leave}
        >
          {children}
        </span>
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" sideOffset={8} collisionPadding={12}
        className="w-auto max-w-[calc(100vw-1.5rem)] p-3"
        onClick={event => event.stopPropagation()}
        onDoubleClick={event => event.stopPropagation()}
        onPointerDown={event => event.stopPropagation()}
        onContextMenu={event => event.stopPropagation()}
        onPointerEnter={() => showCard(id)}
        onPointerLeave={leave}>

        {details}
      </HoverCardContent>
    </HoverCard>
  );
}

export const ThreadRow = memo(function ThreadRow({
  node,
  showProject,
  sectionLabel = null,
  dragHandle,
  leaving = false,
}: {
  node: ThreadNode;
  /** False under a project heading, where the badge would only repeat it. */
  showProject: boolean;
  /** The status heading above the row, when there is one. */
  sectionLabel?: string | null;
  /** dnd-kit's press listeners, from the sortable wrapper; roots only. */
  dragHandle?: DraggableSyntheticListeners;
  /** The thread already left this list; the row is only fading out. */
  leaving?: boolean;
}) {
  const sidebar = useSidebar();
  const selection = useSidebarSelection();
  const { thread } = node;
  const { executions, pullRequests } = useContext(ThreadFactsContext);
  const execution = executions.get(thread.id);
  const pullRequest = pullRequests.get(thread.id);
  const manualStatus = sidebar.manualStatusOf(thread.id);
  const diff = useContext(ThreadDiffsContext).get(thread.id);
  const diffCounts = diff && (diff.additions > 0 || diff.deletions > 0)
    ? <ThreadDiffCounts diff={diff} /> : null;
  const isActive = sidebar.activeThreadId === thread.id;
  const isRoot = node.depth === 0;
  const isExpanded = sidebar.isSubtreeExpanded(thread.id);
  const hasChildren = node.children.length > 0;

  const inline = sidebar.rowLayout === "single";
  const compact = sidebar.rowLayout !== "detailed";
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [modeDetailsOpen, setModeDetailsOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // bb owns the drag-out-to-split gesture. It listens on pointerdown, our
  // sortable handle on mousedown, so both see the press; the sensor's
  // sideways tolerance is what keeps a split drag from also being a reorder.
  const split = experimental_useSidebarThreadSplit(thread.id);

  // A hover card opening under a drag would sit over the drop target.
  const isDragActive = useDragActive();

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLAnchorElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === "F2") {
        event.preventDefault();
        event.stopPropagation();
        setDraftTitle(thread.title ?? thread.titleFallback ?? "Untitled");
        return;
      }
      if (!event.altKey || !isRoot) return;
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      sidebar.nudge(
        { kind: "thread", refId: thread.id },
        event.key === "ArrowUp" ? -1 : 1,
      );
    },
    [isRoot, sidebar, thread.id],
  );

  const commitRename = useCallback(() => {
    const next = draftTitle?.trim() ?? "";
    setDraftTitle(null);
    if (next !== "" && next !== thread.title) {
      sidebar.renameThread(thread.id, next);
    }
  }, [draftTitle, sidebar, thread.id, thread.title]);

  // Focus on the next frame, not during the commit that closes the context
  // menu — autoFocus there loses the race with Radix restoring focus to the
  // trigger, which blurs the field straight back out of edit mode.
  const isRenaming = draftTitle !== null;
  useEffect(() => {
    if (!isRenaming) return;
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [isRenaming]);

  const title = thread.title ?? thread.titleFallback ?? "Untitled";
  const indent = indentPx(node.depth);
  const provider = sidebar.provider(thread.providerId);
  const status = threadStatus(thread, pullRequest, manualStatus);
  const needsInput = thread.hasPendingInteraction || thread.indicator === "waiting-for-input";
  const orb = agentOrb(thread);

  // Each badge is behind its own switch in View options; a switched-off fact
  // is simply absent, and a row with nothing left has no second line.
  const details = sidebar.rowDetails;
  // From the thread, not the section: a status bucket and the Pinned list are
  // named after themselves, so their rows have to name their own project.
  // Under a project heading they do not — it would only repeat it.
  const projectKey = sidebar.folderKeyOf(thread) ?? thread.projectId;
  const projectName = sidebar.projectNameOf(projectKey);
  const project =
    details.project && showProject && projectName !== "" ? projectName : null;
  const branch = details.branch
    ? (thread.environment?.branchName ?? null)
    : null;
  const machine = details.machine ? (thread.host?.name ?? null) : null;
  const model = details.model ? (execution?.model ?? null) : null;
  const pr = details.pullRequest ? pullRequest : undefined;
  const jira = details.jira && sidebar.jiraSite !== null
    ? jiraKeyOf(thread.environment?.branchName, pullRequest?.title, thread.title)
    : null;
  const jiraBadge = jira === null ? null : (
    <JiraBadge ticket={jira} onOpen={() => sidebar.openUrl(`${sidebar.jiraSite}/browse/${jira}`)} />
  );
  const prBadge = pr === undefined ? null : (
    <PullRequestBadge pullRequest={pr} onOpen={() => sidebar.openUrl(pr.url)} />
  );
  // PR and ticket links at full width, ahead of the badges that truncate.
  const links = prBadge === null && jiraBadge === null ? null : (
    <span className="flex shrink-0 items-center gap-1.5" data-thread-links="">{prBadge}{jiraBadge}</span>
  );
  // An unregistered provider still gets its icon, drawn from the id alone.
  const agent = details.agent ? (provider ?? { id: thread.providerId }) : null;
  // The checkout behind the folder and branch badges, once the server has
  // said where it is. Until then the badges are plain text.
  const environmentId = thread.environment?.id ?? null;
  const folder =
    environmentId === null ? null : sidebar.locationOf(environmentId);
  const openFolder = useCallback(() => {
    if (environmentId !== null) sidebar.openFolder(environmentId);
  }, [sidebar, environmentId]);
  const hasMeta =
    branch !== null ||
    model !== null ||
    pr !== undefined ||
    jira !== null;

  const needsAttention = isAttention(status);
  const bucket = bucketOfThread(thread, pullRequest);
  // The turn itself ended in an error (not a PR problem): bb can re-run it.
  const failed = thread.indicator === "unread-error";
  const hasPrOutcome = pullRequest?.state === "closed" || pullRequest?.state === "merged";
  const showRowStatus =
    status !== null && (hasPrOutcome || (status.tone !== "idle" && status.tone !== "done")) &&
    status.text !== STATUS_LABEL[bucket] &&
    thread.indicator !== "goal" && thread.indicator !== "plan-mode";
  const showStatus = details.status && !needsInput && (needsAttention || showRowStatus);
  const changes = details.changes ? diffCounts : null;
  const agentIcon = agent === null ? null : (
    <RowTip label={[provider?.displayName ?? thread.providerId, execution?.model].filter(Boolean).join(" · ")}>
      <span className="flex shrink-0 items-center text-muted-foreground" data-thread-provider-logo="">
        <ProviderIcon providerKind="agent" provider={agent} className="size-3 shrink-0 opacity-80" />
      </span>
    </RowTip>
  );
  const projectChip = project === null ? null : (
    <RowTip label={`Project · ${project}`}>
      <span data-thread-project="" className="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
        <ProjectIcon projectId={projectKey} className="size-3" />
        <span className="min-w-0 truncate">{project}</span>
      </span>
    </RowTip>
  );
  const threadDetails = (
    <ThreadDetails
      node={node}
      projectName={projectName}
      provider={provider}
      execution={execution}
      pullRequest={pullRequest}
      manualStatus={manualStatus}
    />
  );
  // Touch has no hover, so coarse pointers keep the actions in view. A phone
  // sidebar is narrow enough that the cluster would cover every title, so
  // there only the active thread keeps it; every row still has the
  // long-press menu.
  const rowActions = isRenaming || selection.active ? null : (
    <span
      data-thread-row-actions=""
      className={compact
        ? cn(
            "absolute right-0 flex items-center gap-0.5 rounded bg-accent transition-opacity group-hover/row:pointer-events-auto group-hover/row:opacity-100 group-focus-within/row:pointer-events-auto group-focus-within/row:opacity-100 md:pointer-coarse:pointer-events-auto md:pointer-coarse:opacity-100",
            isActive && "max-md:pointer-coarse:pointer-events-auto max-md:pointer-coarse:opacity-100",
            handoffOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )
        : cn(
            "shrink-0 items-center gap-0.5 group-hover/row:flex group-focus-within/row:flex md:pointer-coarse:flex",
            isActive && "max-md:pointer-coarse:flex",
            handoffOpen ? "flex" : "hidden",
          )}
    >
      <ThreadHandoff threadId={thread.id} sourceProviderId={thread.providerId} currentModel={execution?.model ?? null} onOpenChange={setHandoffOpen} />
      {failed ? (
        <ParkButton
          label="Retry the failed turn"
          icon="RotateCcw"
          text={compact ? undefined : "Retry"}
          onActivate={() => sidebar.retryThread(thread.id)}
        />
      ) : null}
      {isRoot ? (
        <ParkButton
          label={thread.isPinned ? "Unpin from the top" : "Pin to the top"}
          icon={thread.isPinned ? "PinOff" : "Pin"}
          onActivate={() => sidebar.setPinned(thread.id, !thread.isPinned)}
        />
      ) : null}
      {/* Snoozing is for work that is in front of you. A parked thread is
          already out of the list, so the button would hide what is hidden. */}
      {PARKED_BUCKETS.includes(bucket) ? null : (
        <ParkButton
          label="Hide until tomorrow at 9am"
          icon="Clock"
          onActivate={() => sidebar.setSnoozed(thread.id, tomorrowMorning())}
        />
      )}
      {/* The pointer twin of D: Done archives the thread. */}
      {thread.isArchived ? null : (
        <ParkButton
          label="Mark done and archive"
          icon="Check"
          text={compact ? undefined : "Done"}
          onActivate={() => sidebar.setStatus(thread.id, "done")}
        />
      )}
    </span>
  );

  return (
    <div
      className="relative group/selection-row flex items-start"
    >
      {isRoot ? <RowDropDecor kind="thread" refId={thread.id} /> : null}
      {draftTitle === null && selection.active && (
        <span className="bb-ws-checkbox-gutter flex w-[26px] shrink-0 justify-center pt-2"
          onPointerDown={event => event.stopPropagation()}
          onMouseDown={event => event.stopPropagation()}>
          <Checkbox aria-label={`Select ${title}`} checked={selection.selected.has(thread.id)}
            onClick={event => { event.stopPropagation(); selection.toggle(thread.id, event.shiftKey); }} />
        </span>
      )}

      <RowContextMenu
        item={{ kind: "thread", refId: thread.id }}
        thread={thread}
        manualStatus={manualStatus}
        pullRequestUrl={pullRequest?.url ?? null}
        onRename={() => setDraftTitle(title)}
      >
        {/* Both data-sidebar-* attributes are a host contract: bb's thread
            shortcuts find rows by query selector, not by React state. */}
        <a
          href="#"
          // A leaving row is a picture of where the thread used to be, and
          // the thread itself is already somewhere else. Both the host's
          // shortcuts and this sidebar's own reveal find rows by these two
          // attributes, so the ghost must not answer to either.
          {...(leaving
            ? { "aria-hidden": true, tabIndex: -1 }
            : {
                "data-sidebar-thread-shortcut-target": "",
                "data-sidebar-thread-id": thread.id,
              })}
          data-sidebar-bucket={bucket}
          // Read by the P shortcut, which has no access to the thread record:
          // it toggles against what the focused row currently is.
          data-sidebar-thread-pinned={String(thread.isPinned)}
          // Tree shape for the flat-DOM keyboard handlers, which have no
          // access to ThreadNode. Never clamped the way the visual indent
          // is: this is the real depth. Parentage is read as "nearest
          // preceding row with a smaller depth", not from parentThreadId,
          // because a promoted orphan's parent has no row at all.
          data-sidebar-thread-depth={node.depth}
          data-sidebar-thread-expanded={
            hasChildren ? String(isExpanded) : undefined
          }
          data-thread-layout={inline ? "single" : compact ? "compact" : "detailed"}
          data-attention={needsAttention}
          data-selected={selection.selected.has(thread.id)}
          aria-current={isActive ? "page" : undefined}
          aria-keyshortcuts={isRoot ? "Alt+ArrowUp Alt+ArrowDown" : undefined}
          draggable={false}
          onPointerDown={(event) => {
            if (!selection.active && !event.metaKey && !event.ctrlKey && !event.shiftKey)
              split.splitProps.onPointerDown?.(event);
          }}
          {...(selection.active ? {} : dragHandle)}
          onKeyDown={onKeyDown}
          onClick={(event) => {
            event.preventDefault();
            if (draftTitle !== null) return;
            if (selection.click(thread.id, event)) return;
            sidebar.openThread(thread.id, false);
          }}
          onDoubleClick={(event) => {
            event.preventDefault();
            if (!selection.active) setDraftTitle(title);
          }}
          className={cn(
            "bb-ws-row group/row flex min-w-0 flex-1 flex-col gap-0.5 rounded-md py-1 pr-2 text-sm transition-colors",
            "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            isActive && "bg-accent text-foreground",
            split.layout !== null && !isActive && "bg-accent/30",
          )}
          style={{ paddingLeft: `${ROW_BASE_PAD_PX + indent}px` }}
        >
          <RowHover
            enabled={sidebar.hoverCard && !leaving && draftTitle === null && !isDragActive && !handoffOpen && !modeDetailsOpen && !selection.active}
            onWarm={() => prefetchPullRequestStack(thread.id)}
            details={threadDetails}
          >
            {/* Reserve the hover buttons' height even while the status is shown. */}
            <span
              className={cn(
                "bb-ws-mainline relative flex w-full items-center gap-1.5",
                compact ? "min-h-6" : "min-h-5",
              )}
            >
              {hasChildren ? (
                <button
                  type="button"
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} subagents of ${title}`}
                  aria-expanded={isExpanded}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    sidebar.toggleSubtree(thread.id);
                  }}
                  className="flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Icon
                    name="ChevronRight"
                    className={cn(
                      "size-3 transition-transform duration-150",
                      isExpanded && "rotate-90",
                    )}
                  />
                </button>
              ) : (
                <span aria-hidden className="w-4 shrink-0" />
              )}

              {/* Past the point where the per-level step reaches its 4px
                  floor, indent alone is a weak answer to "how deep am I".
                  It sits after the chevron on purpose: the rails are aimed
                  at the chevron's center, so nothing may shift it. */}
              {node.depth >= LEVEL_BADGE_FROM_DEPTH ? (
                <span
                  title={`Level ${node.depth + 1}`}
                  className="shrink-0 text-[10px] tabular-nums text-muted-foreground/50"
                >
                  {node.depth + 1}
                </span>
              ) : null}

              {inline ? agentIcon : null}
              <span className={cn("relative flex flex-1 items-center", inline ? "min-w-[5rem]" : "min-w-0")}>
                {draftTitle === null ? (
                  orb !== null ? (
                    <TextShimmer
                      className="bb-ws-title min-w-0 flex-1 truncate font-medium"
                      duration={2}
                    >
                      {title}
                    </TextShimmer>
                  ) : (
                    <span
                      className={cn(
                        "bb-ws-title min-w-0 flex-1 truncate",
                        // The title is the thing being scanned for; everything else
                        // on the row is support.
                        isActive || thread.isUnread
                          ? "font-medium text-foreground"
                          : "text-foreground/90",
                      )}
                    >
                      {title}
                    </span>
                  )
                ) : (
                  <input
                    ref={inputRef}
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    onBlur={commitRename}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.preventDefault()}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      if (event.key === "Enter") commitRename();
                      if (event.key === "Escape") setDraftTitle(null);
                    }}
                    aria-label="Rename thread"
                    className="min-w-0 flex-1 rounded-sm bg-background px-1 text-sm text-foreground outline-none ring-1 ring-border"
                  />
                )}

                {/* Hover actions leave the device, subagent count, and status in place. */}
                {compact ? rowActions : null}
              </span>

              {inline && draftTitle === null ? links : null}

              {inline && draftTitle === null ? (
                <span className="flex min-w-0 max-w-[40%] shrink items-center gap-1.5 overflow-hidden text-[11px] text-muted-foreground" data-thread-inline="">
                  {branch === null ? null : (
                    <BranchBadge branch={branch} folder={folder} onOpenFolder={openFolder} />
                  )}
                  {projectChip}
                  {model === null ? null : <ModelBadge model={model} />}
                  <MachineIndicator name={machine} />
                  {details.modes ? <InlineModes thread={thread} /> : null}
                  {showStatus ? (
                    <span className="min-w-0 truncate">
                      <ThreadStatus status={status} updatedAt={thread.updatedAt} sectionLabel={sectionLabel} />
                    </span>
                  ) : null}
                  {changes}
                </span>
              ) : null}

              {thread.isPinned ? (
                <RowTip label="Pinned">
                  <span className="flex shrink-0 items-center">
                    <Icon
                      name="Pin"
                      aria-label="Pinned"
                      className="size-3 shrink-0 text-muted-foreground"
                    />
                  </span>
                </RowTip>
              ) : null}

              {/* Roll a collapsed subtree's state up, so a waiting subagent is
                never silently hidden behind a chevron. */}
              {hasChildren && !isExpanded ? (
                <RowTip label={subtreeLabel(node, subtreeTone(node))}>
                  <span className="flex shrink-0 items-center">
                    <SubtreeSummary node={node} />
                  </span>
                </RowTip>
              ) : null}

              {compact ? null : rowActions}

              <RowTip label={status?.detail ?? thread.indicatorLabel ?? STATUS_LABEL[bucket]}>
                <span className="flex w-4 shrink-0 justify-center" data-thread-status-glyph="">
                  <BucketGlyph bucket={bucket} running={orb !== null} />
                </span>
              </RowTip>
            </span>

            {draftTitle === null && !inline ? (
              <ThreadModes
                thread={thread}
                compact={compact}
                details={threadDetails}
                onDetailsOpenChange={setModeDetailsOpen}
                trailing={changes}
                showModes={details.modes}
              >
                <span className="inline-flex min-w-0 max-w-full items-center gap-1" data-thread-context="">
                  {agentIcon}
                  {projectChip}
                  <MachineIndicator name={machine} />
                </span>
                {compact ? links : null}
                {showStatus ? (
                  <span className="min-w-0 max-w-full">
                    <ThreadStatus status={status} updatedAt={thread.updatedAt} sectionLabel={sectionLabel} />
                  </span>
                ) : null}
              </ThreadModes>
            ) : null}

            {!compact && hasMeta && draftTitle === null ? (
            <span
              className="flex w-full items-center gap-2 overflow-hidden"
              style={{ paddingLeft: "22px" }}
            >
              {branch === null ? null : (
                <BranchBadge
                  branch={branch}
                  folder={folder}
                  onOpenFolder={openFolder}
                />
              )}
              {model === null ? null : <ModelBadge model={model} />}
              {links}
            </span>
            ) : null}
          </RowHover>
        </a>
      </RowContextMenu>
    </div>
  );
});
