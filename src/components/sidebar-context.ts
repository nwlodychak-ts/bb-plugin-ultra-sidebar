import { createContext, useContext } from "react";
import type {
  experimental_useProviders,
  PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";

/** The SDK does not export ProviderInfo by name; take it from the hook. */
export type ProviderInfo = ReturnType<
  typeof experimental_useProviders
>["providers"][number];
import type { ItemRef } from "../lib/types";
import type { CardDetails, RowDetails, RowLayout } from "../hooks/useViewState";
import type { EnvironmentLocation } from "../hooks/useEnvironmentLocations";
import type { ProjectArtwork } from "../hooks/useProjectArtwork";
import type { ProjectStyle } from "../lib/project-styles";
import type { ManualStatus } from "../lib/status";
import type { MoveOptions } from "../lib/move-targets";

export interface SidebarContextValue {
  activeThreadId: string | null;
  /** One line, title plus summary line, or all three lines. */
  rowLayout: RowLayout;
  /** Which badges the line under a title shows. */
  rowDetails: RowDetails;
  /** Whether hovering a row opens its card. */
  hoverCard: boolean;
  /** Which sections the hover card shows. */
  cardDetails: CardDetails;
  /** The Jira site origin for ticket links, or null when none is set. */
  jiraSite: string | null;
  /**
   * The host's name for a project, or "" when it no longer reports one or
   * the project is bb's implicit personal one, which rows do not name.
   */
  projectNameOf(projectId: string): string;
  /** A project's icon or logo, once found; null means the folder glyph. */
  artworkOf(projectId: string): ProjectArtwork | null;
  /** The color and glyph set for a bb project id or folder project key. */
  styleOf(projectKey: string): ProjectStyle | null;
  /** The folder project key a thread files under, or null. */
  folderKeyOf(thread: PluginSidebarThread): string | null;
  /** Open the project editor. A folder key not yet saved starts a new folder project. */
  editProject(projectKey: string): void;
  /** The checkout directory behind an environment, once it has been fetched. */
  locationOf(environmentId: string): EnvironmentLocation | null;
  /** Reveal an environment's folder in the file manager, when it is on this machine. */
  openFolder(environmentId: string): void;
  /** Open an http(s) URL the way this client prefers (system browser on desktop). */
  openUrl(url: string): void;

  openThread(threadId: string, split: boolean): void;
  /** Pin to the top of the sidebar, or release it back to its project. */
  setPinned(threadId: string, pinned: boolean): void;
  setRead(threadId: string, read: boolean): void;
  renameThread(threadId: string, title: string): void;
  /** Where a thread can move, or null when its row's parent is not bb's to change. */
  moveOptionsOf(thread: PluginSidebarThread): MoveOptions | null;
  /** Move under another thread, or to the top level with null. */
  moveThread(threadId: string, parentThreadId: string | null): void;
  archiveThread(threadId: string): void;
  /** Re-submit the turn that failed, the same as bb's own Retry. */
  retryThread(threadId: string): void;
  deleteThread(threadId: string): void;
  /** Open a new thread in a bb project, or with no project for null. */
  newThreadIn(projectId: string | null): void;

  /** Keyboard reorder: -1 moves earlier, 1 later, within the same section. */
  nudge(item: ItemRef, direction: -1 | 1): void;
  /** Hand this section's rows back to newest-first ordering. */
  resetOrder(sectionId: string): void;

  isSubtreeExpanded(threadId: string): boolean;
  toggleSubtree(threadId: string): void;
  /**
   * Open or close a subtree without reading its current state first. The
   * arrow keys need this: `toggle` would flip the wrong way whenever a row's
   * state changed between keystrokes.
   */
  setSubtreeExpanded(threadId: string, expanded: boolean): void;

  /** The bucket the person filed a thread in by hand, or null. */
  manualStatusOf(threadId: string): ManualStatus | null;
  /** File a thread in Backlog, Done or Canceled; null lets its facts decide. */
  setStatus(threadId: string, status: ManualStatus | null): void;
  /** Hide until a timestamp; null wakes it now. */
  setSnoozed(threadId: string, until: number | null): void;

  /**
   * The registered agent provider for an id, or null. The whole record, not
   * just the name: experimental_ProviderIcon renders from the object.
   */
  provider(providerId: string): ProviderInfo | null;

}

export const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const value = useContext(SidebarContext);
  if (value === null) {
    throw new Error("Sidebar context is missing");
  }
  return value;
}
