// Lays the resolved tree out as the list of collapsible sections the sidebar
// draws.
//
// The resolver's job is the parent/child forest, pins, snoozes and ordering;
// that work is identical whatever the user is grouping by. So rather than
// teach it two layouts, this takes its output and files the rows. Grouping
// stays a view concern.
import {
  ATTENTION_INDICATORS,
  countRows,
  sortRoots,
  type ProjectGroup,
  type ResolvedTree,
  type ThreadNode,
} from "./resolve";
import {
  PARKED_BUCKETS,
  STATUS_BUCKETS,
  STATUS_LABEL,
  isFinished,
  statusSectionId,
  type StatusBucket,
} from "./status";
import { folderKey, type FolderKey, type FolderProject } from "./project-styles";

export type GroupBy = "project" | "status";

export const GROUP_BY_OPTIONS: readonly GroupBy[] = ["project", "status"];

export const PINNED_SECTION_ID = "pinned";
const PROJECT_SECTION_PREFIX = "project:";

export function projectSectionId(projectId: string): string {
  return `${PROJECT_SECTION_PREFIX}${projectId}`;
}

export function projectFromSectionId(id: string): string | null {
  return id.startsWith(PROJECT_SECTION_PREFIX)
    ? id.slice(PROJECT_SECTION_PREFIX.length)
    : null;
}

/** The fields each collapsible heading has. */
interface SectionBase {
  id: string;
  name: string;
  roots: ThreadNode[];
  /** Rows, subagents included. */
  threadCount: number;
  /**
   * True when a row must name its own project, because the heading above it
   * does not — every section but a project's.
   */
  showProject: boolean;
  /** Somebody has hand-ordered these rows. */
  manual: boolean;
}

/** Pinned threads from any project. */
export interface PinnedSection extends SectionBase {
  kind: "pinned";
}

/** One bb project's active threads. */
export interface ProjectSection extends SectionBase {
  kind: "project";
  projectId: string;
}

/** One folder project's active threads. */
export interface FolderSection extends SectionBase {
  kind: "folder";
  projectId: FolderKey;
}

/** One status bucket. */
export interface StatusSection extends SectionBase {
  kind: "status";
  bucket: StatusBucket;
}

/** One collapsible heading and the root rows under it. */
export type Section = PinnedSection | ProjectSection | FolderSection | StatusSection;

/** The project key a heading names: a bb project id or a folder key, else null. */
export function projectKeyOf(section: Section): string | null {
  return section.kind === "project" || section.kind === "folder" ? section.projectId : null;
}

/** The bb project ids of the project headings, in list order. */
export function projectOrder(sections: readonly Section[]): string[] {
  return sections.flatMap((section) => (section.kind === "project" ? [section.projectId] : []));
}

export interface SectionsInput {
  tree: ResolvedTree;
  groupBy: GroupBy;
  /** Empty means every project. */
  projectIds: readonly string[];
  /** Which status bucket a thread belongs in. */
  bucketOf(node: ThreadNode): StatusBucket;
  /** Keep the empty Pinned section on screen as a drop target. */
  dragging?: boolean;
  /** Show the Archived section. */
  showArchived?: boolean;
  /** Folder projects, in heading order ahead of the bb projects. */
  folderProjects?: readonly FolderProject[];
  /** The folder project id a root thread files under, or null. */
  folderOf?(node: ThreadNode): string | null;
}

/**
 * Pinned first, always. Then the rows however the user asked for them, with
 * Done, Backlog and Canceled trailing in the project view so finished work
 * stops crowding the project it came from.
 *
 * A pinned thread that is finished — merged, or filed Done or Canceled
 * somewhere that could not also unpin it — is filed with the rest of its
 * bucket rather than holding the top of the list. The pin itself is left
 * alone, so reopening the thread puts it straight back.
 */
export function buildSections(input: SectionsInput): Section[] {
  const { tree, groupBy, projectIds, bucketOf, dragging = false, showArchived = false } = input;
  const hidden = (bucket: StatusBucket) => bucket === "archived" && !showArchived;
  const folderProjects = input.folderProjects ?? [];
  const folderOf = input.folderOf ?? (() => null);
  const wanted = new Set(projectIds);
  const wants = (key: string) => wanted.size === 0 || wanted.has(key);
  // A thread passes the filter on its bb project or on its folder project.
  const keep = (node: ThreadNode) => {
    if (wants(node.thread.projectId)) return true;
    const folder = folderOf(node);
    return folder !== null && wanted.has(folderKey(folder));
  };

  const pinnedRoots: ThreadNode[] = [];
  const finishedPins: ThreadNode[] = [];
  for (const node of tree.pinned.filter(keep)) {
    if (isFinished(bucketOf(node))) finishedPins.push(node);
    else pinnedRoots.push(node);
  }
  const sections: Section[] = [];
  if (pinnedRoots.length > 0 || dragging) {
    sections.push({
      id: PINNED_SECTION_ID,
      name: "Pinned",
      kind: "pinned",
      roots: pinnedRoots,
      threadCount: countRows(pinnedRoots),
      showProject: true,
      manual: tree.pinnedManual,
    });
  }

  if (groupBy === "status") {
    const byBucket = new Map<StatusBucket, ThreadNode[]>();
    for (const group of tree.projects) {
      for (const node of group.roots) {
        if (keep(node)) push(byBucket, bucketOf(node), node);
      }
    }
    for (const node of finishedPins) push(byBucket, bucketOf(node), node);
    // All buckets, in a fixed order, even when empty: the list is the workflow,
    // and a bucket that only appears once something lands in it reads as the
    // sidebar reshuffling itself. Archived follows the view option.
    for (const bucket of STATUS_BUCKETS) {
      if (hidden(bucket.key)) continue;
      sections.push(statusSection(bucket.key, byBucket.get(bucket.key) ?? [], tree));
    }
    return sections;
  }

  // Pull the parked threads out of every project first; what is left is the
  // active list, grouped by folder project first, then by bb project.
  const parked = new Map<StatusBucket, ThreadNode[]>();
  const inFolders = new Map<string, ThreadNode[]>();
  const projectSections: Section[] = [];
  for (const group of tree.projects) {
    const active = group.roots.filter((node) => {
      if (!keep(node)) return false;
      const bucket = bucketOf(node);
      if (PARKED_BUCKETS.includes(bucket)) {
        push(parked, bucket, node);
        return false;
      }
      const folder = folderOf(node);
      if (folder === null) return true;
      push(inFolders, folder, node);
      return false;
    });
    if (!wants(group.projectId)) continue;
    projectSections.push(projectSection(group, active));
  }
  for (const folder of folderProjects) {
    const roots = inFolders.get(folder.id) ?? [];
    if (roots.length > 0 || wants(folderKey(folder.id))) {
      sections.push(folderSection(folder, roots, tree));
    }
  }
  sections.push(...projectSections);
  for (const node of finishedPins) push(parked, bucketOf(node), node);

  // An empty pile stays off the list, except during a drag, when it is the
  // only place a thread can be filed — the same reason Pinned stays up.
  for (const bucket of PARKED_BUCKETS) {
    const nodes = parked.get(bucket) ?? [];
    if (hidden(bucket) || (nodes.length === 0 && !dragging)) continue;
    sections.push(statusSection(bucket, nodes, tree));
  }
  return sections;
}

function projectSection(group: ProjectGroup, roots: ThreadNode[]): ProjectSection {
  return {
    id: projectSectionId(group.projectId),
    name: group.name,
    kind: "project",
    projectId: group.projectId,
    roots,
    threadCount: countRows(roots),
    showProject: false,
    manual: group.manual,
  };
}

function folderSection(
  folder: FolderProject,
  nodes: readonly ThreadNode[],
  tree: ResolvedTree,
): FolderSection {
  const roots = orderBucket(nodes, tree.orderIndex, tree.promptedAt);
  return {
    id: folderKey(folder.id),
    name: folder.name,
    kind: "folder",
    projectId: folderKey(folder.id),
    roots,
    threadCount: countRows(roots),
    showProject: false,
    manual: roots.some((node) => tree.orderIndex.has(`thread:${node.thread.id}`)),
  };
}

/**
 * A status section is one list, not a project's worth of lists laid end to
 * end. The rows arrive grouped by project, each in its own order, so they are
 * re-sorted here against the same global order the resolver used, with
 * anything blocked on a person lifted to the front.
 */
function statusSection(
  bucket: StatusBucket,
  nodes: readonly ThreadNode[],
  tree: ResolvedTree,
): StatusSection {
  const roots = orderBucket(nodes, tree.orderIndex, tree.promptedAt);
  return {
    id: statusSectionId(bucket),
    name: STATUS_LABEL[bucket],
    kind: "status",
    bucket,
    roots,
    threadCount: countRows(roots),
    showProject: true,
    manual: roots.some((node) => tree.orderIndex.has(`thread:${node.thread.id}`)),
  };
}

/**
 * The rows arrive project by project, each project internally ordered, so
 * they are re-sorted against the one global order rather than concatenated.
 *
 * Within the rows nobody has placed by hand, anything waiting on a person —
 * including a question buried in a collapsed subagent — comes first. The lift
 * deliberately stops at the hand-ordered rows: hoisting a row somebody just
 * dragged into place, because its agent asked a question a second later, is
 * indistinguishable from the drag not having worked.
 */
function orderBucket(
  nodes: readonly ThreadNode[],
  orderIndex: ReadonlyMap<string, number>,
  promptedAt: ReadonlyMap<string, number>,
): ThreadNode[] {
  const byId = new Map(nodes.map((node) => [node.thread.id, node]));
  const ordered = sortRoots(
    nodes.map((node) => node.thread),
    orderIndex,
    promptedAt,
  ).map((thread) => byId.get(thread.id)!);
  const placed = (node: ThreadNode) =>
    orderIndex.has(`thread:${node.thread.id}`);
  const loose = ordered.filter((node) => !placed(node));
  const byHand = ordered.filter(placed);
  return [
    ...loose.filter(needsPerson),
    ...loose.filter((node) => !needsPerson(node)),
    ...byHand,
  ];
}

function needsPerson(node: ThreadNode): boolean {
  return (
    node.thread.hasPendingInteraction ||
    node.hasPendingDescendant ||
    ATTENTION_INDICATORS.has(node.thread.indicator)
  );
}

function push<K>(map: Map<K, ThreadNode[]>, key: K, node: ThreadNode): void {
  const bucket = map.get(key);
  if (bucket === undefined) map.set(key, [node]);
  else bucket.push(node);
}

/** Flatten the sections to the thread ids the sidebar will actually render. */
export function visibleThreadIds(
  sections: readonly Section[],
  isExpanded: (threadId: string) => boolean,
  isSectionOpen: (sectionId: string) => boolean,
): string[] {
  const ids: string[] = [];
  const walk = (node: ThreadNode) => {
    ids.push(node.thread.id);
    if (node.children.length === 0 || !isExpanded(node.thread.id)) return;
    for (const child of node.children) walk(child);
  };
  for (const section of sections) {
    if (!isSectionOpen(section.id)) continue;
    for (const root of section.roots) walk(root);
  }
  return ids;
}
