import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Alert02Icon,
  AlertCircleIcon,
  Archive03Icon,
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowDownDoubleIcon,
  ArrowMoveDownLeftIcon,
  ArrowMoveDownRightIcon,
  ArrowMoveUpLeftIcon,
  ArrowRight01Icon,
  ArrowRight02Icon,
  ArrowUp01Icon,
  ArrowUp02Icon,
  ArrowUpDoubleIcon,
  ArrowUpDownIcon,
  BotIcon,
  BubbleChatAddIcon,
  BubbleChatIcon,
  Cancel01Icon,
  CancelCircleIcon,
  CheckListIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Copy01Icon,
  DashedLineCircleIcon,
  Delete02Icon,
  Edit02Icon,
  Folder02Icon,
  FolderGit2Icon,
  FolderIcon,
  GithubIcon,
  GitMergeIcon,
  GitPullRequestClosedIcon,
  GitPullRequestDraftIcon,
  GitPullRequestIcon,
  InformationCircleIcon,
  Layout2ColumnIcon,
  Mail02Icon,
  MailOpen01Icon,
  MoreHorizontalIcon,
  PauseIcon,
  PinIcon,
  PinOffIcon,
  PlayIcon,
  PlusSignIcon,
  Refresh01Icon,
  RepeatIcon,
  SlidersHorizontalIcon,
  Sorting01Icon,
  Tick02Icon,
  WorkflowCircle03Icon,
} from "@hugeicons/core-free-icons";

/** The Jira mark, filled. Hugeicons has no Jira glyph. */
const JiraIcon: IconSvgElement = [
  ["path", {
    d: "M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z",
    fill: "currentColor",
    key: "0",
  }],
];

// BB's icon names, drawn with the same Hugeicons glyphs BB uses for them, so
// the sidebar matches the rest of the window.
const ICONS = {
  AlertCircle: AlertCircleIcon,
  AlertTriangle: Alert02Icon,
  Archive: Archive03Icon,
  ArrowDown: ArrowDown02Icon,
  ArrowRight: ArrowRight02Icon,
  ArrowUp: ArrowUp02Icon,
  ArrowUpDown: ArrowUpDownIcon,
  Bot: BotIcon,
  Check: Tick02Icon,
  ChevronDown: ArrowDown01Icon,
  ChevronRight: ArrowRight01Icon,
  ChevronUp: ArrowUp01Icon,
  ChevronsDown: ArrowDownDoubleIcon,
  ChevronsUp: ArrowUpDoubleIcon,
  CircleCheck: CheckmarkCircle02Icon,
  CircleX: CancelCircleIcon,
  Clock: Clock01Icon,
  Columns2: Layout2ColumnIcon,
  Copy: Copy01Icon,
  CornerDownLeft: ArrowMoveDownLeftIcon,
  Edit: Edit02Icon,
  Folder: FolderIcon,
  FolderGit: FolderGit2Icon,
  FolderOpen: Folder02Icon,
  GitMerge: GitMergeIcon,
  Github: GithubIcon,
  GitPullRequest: GitPullRequestIcon,
  GitPullRequestClosed: GitPullRequestClosedIcon,
  GitPullRequestDraft: GitPullRequestDraftIcon,
  Info: InformationCircleIcon,
  Jira: JiraIcon,
  ListTodo: CheckListIcon,
  Mail: Mail02Icon,
  MailOpen: MailOpen01Icon,
  MessageSquare: BubbleChatIcon,
  MessageSquarePlus: BubbleChatAddIcon,
  MoreHorizontal: MoreHorizontalIcon,
  MoveToTop: ArrowMoveUpLeftIcon,
  MoveUnder: ArrowMoveDownRightIcon,
  Pause: PauseIcon,
  Pin: PinIcon,
  PinOff: PinOffIcon,
  Play: PlayIcon,
  Plus: PlusSignIcon,
  Repeat: RepeatIcon,
  RotateCcw: Refresh01Icon,
  SlidersHorizontal: SlidersHorizontalIcon,
  Sort: Sorting01Icon,
  Spinner: DashedLineCircleIcon,
  Trash2: Delete02Icon,
  Workflow: WorkflowCircle03Icon,
  X: Cancel01Icon,
} as const satisfies Record<string, IconSvgElement>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  className,
  "aria-hidden": ariaHidden,
  "aria-label": ariaLabel,
}: {
  name: IconName;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}) {
  return (
    <HugeiconsIcon
      icon={ICONS[name]}
      className={className}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
      data-icon={name}
    />
  );
}
