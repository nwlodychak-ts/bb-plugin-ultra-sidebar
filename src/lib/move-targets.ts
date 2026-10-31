import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";

export interface MoveTarget {
  id: string;
  title: string;
}

export interface MoveOptions {
  /** The parent bb records for the thread; null for a top-level thread. */
  parentThreadId: string | null;
  /** Threads it can move under: same project, never itself or its own subtree. */
  targets: MoveTarget[];
}

/**
 * Where `shown` can move, read from bb's own thread list rather than the
 * sidebar's. Null when the parent on screen is not the one bb records: a
 * workflow worker's parent is drawn by the Workflows plugin, so a move in bb
 * would not change where its row appears.
 */
export function moveOptionsFor(
  hostThreads: readonly PluginSidebarThread[],
  shown: PluginSidebarThread,
): MoveOptions | null {
  const own = hostThreads.find((thread) => thread.id === shown.id);
  if (own === undefined || own.parentThreadId !== shown.parentThreadId) {
    return null;
  }
  const childrenByParent = new Map<string, string[]>();
  for (const thread of hostThreads) {
    if (thread.parentThreadId === null) continue;
    const siblings = childrenByParent.get(thread.parentThreadId) ?? [];
    siblings.push(thread.id);
    childrenByParent.set(thread.parentThreadId, siblings);
  }
  const subtree = new Set<string>();
  const pending = [own.id];
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (subtree.has(id)) continue;
    subtree.add(id);
    pending.push(...(childrenByParent.get(id) ?? []));
  }
  return {
    parentThreadId: own.parentThreadId,
    targets: hostThreads
      .filter(
        (thread) =>
          thread.projectId === own.projectId &&
          !thread.isArchived &&
          !subtree.has(thread.id) &&
          thread.id !== own.parentThreadId,
      )
      .map((thread) => ({ id: thread.id, title: thread.displayTitle })),
  };
}
